# Load model: injection, throttle, duration, assertions → `postman performance run`

## What Postman supports (verify against the installed `postman performance run --help`; don't assume a version)
- **Closed model only.** `--vu-count N` virtual users each loop the collection until the run ends. There's no arrival rate and no target RPS.
- `--load-profile`: `fixed` (N the whole time), `ramp-up` (grows to N), `spike` (a burst to N), `peak` (rises to N, holds, falls). Each has a fixed shape; you can't set stage times from the CLI.
- `--duration` in whole minutes (≥ 1). `--pass-if` takes **one** condition: `less_than|greater_than|less_than_eq|greater_than_eq(avg|p90|p95|p99|error_rate|rps, value)`. `error_rate` is a percentage.
- Cloud runs need `--vu-count` ≥ 10. For local runs, any value ≥ 1 works.

## Injection (`inj:*`)
**Closed steps: exact or near-exact.**
| Gatling | Flags | Status |
|---|---|---|
| `constantConcurrentUsers(n).during(d)` alone | `--vu-count n --load-profile fixed --duration ceil(d)` | mapped (approximated if d isn't whole minutes: say "rounded up") |
| `rampConcurrentUsers(a).to(b).during(d)`, then `constantConcurrentUsers(b).during(h)` | `--vu-count b --load-profile ramp-up --duration ceil(d+h)` | approximated: the ramp/hold ratio is fixed by the profile |
| `rampConcurrentUsers(a).to(b)` alone | `--load-profile ramp-up` | approximated |
| `incrementConcurrentUsers` (steps) | `ramp-up` to the final level | approximated: no stairs |

**Open steps: always approximated.** Gatling open users run the journey **once** and leave. Postman VUs loop. To keep the same load on the server, match the concurrency using Little's law:

> **VUs ≈ arrival rate (users/s) × journey time (s)**

- **Know whether the injector's number is a count or a rate — this is the most common mistake.** `constantUsersPerSec(r)` and `rampUsersPerSec(a).to(b)` are **rates** (users **per second**) — use them directly. `rampUsers(n).during(d)` and `atOnceUsers(n)` are a **total count** of users, not a rate: `rampUsers(50).during(60s)` is 50 users spread over 60 s = an arrival rate of `50/60 ≈ 0.83 users/s`, **not** 50/s. Convert a count to a rate (`n/d`) *before* Little's law. Skipping this step inflates `--vu-count` by the factor `d`.
- **Journey time** = the sum of pauses (use the mean for ranges, e.g. `pause(1,3)` → 2 s) + the expected response times. Use `0.3 s` per request if unknown, and say so — **but** if a path makes the latency evident (e.g. `/delay/1` ≈ 1 s, a Gatling request literally named "slow …"), use that value instead and note it. Pick one rule per conversion and state it, so two runs don't diverge.
- **Cloud VU floor.** If the computed `--vu-count` is below 10 and the user will run on **cloud**, keep the computed value but add a one-line note that cloud requires ≥ 10 (so they raise it deliberately, knowing it increases load). For **local** runs any value ≥ 1 is fine. Never silently inflate the count to clear the floor.
- **`pace(d)` is a floor, not an addend.** `pace` forces each iteration to take *at least* `d`; it does **not** add to the request/pause time, it subsumes it. So when a scenario has `pace(d)`, the journey time is `J = max(d, pauses + response times)`, **not** `pauses + response times + d`. Adding `pace` as a term overstates `J` and inflates `--vu-count`. Show the `max(...)` in MIGRATION.md.
- **A loop inside the per-user journey changes what `J` is.** If the open-model journey wraps a `during(t) { … }` / `forever { … }` loop (often with `pace`), each arriving user stays busy for the **whole loop duration**, so `J` is that duration, not one pass. Example: `constantUsersPerSec(20)` over a journey of `during(5.minutes){ pace(5s).exec(...) }` → `J = 300 s`, so `VUs ≈ 20 × 300 = 6000`, not `20 × (one 5 s iteration)`. This is usually a very large number — **do not silently pick the one-iteration reading**; compute both, put the arithmetic and the chosen reading in MIGRATION.md → Load model, and tell the user to confirm, because it swings `--vu-count` by orders of magnitude. A finite closed cap (`maxDuration`, cloud VU limits) may force you lower; say so.
- Round up to `--vu-count` ≥ 1. **Do not bump a sub-10 result up to 10 for cloud here** — the **Cloud VU floor** rule above governs that: keep the computed value and warn the user cloud needs ≥ 10, so load is never silently increased without their decision.

| Gatling | Flags |
|---|---|
| `constantUsersPerSec(r).during(d)` | `--vu-count ceil(r × J) --load-profile fixed --duration ceil(d)` |
| `rampUsersPerSec(a).to(b).during(d)` (then `constantUsersPerSec(b)…`) | `--vu-count ceil(b × J) --load-profile ramp-up`, with duration the sum of all steps |
| `atOnceUsers(n)` | a burst: `--load-profile spike --vu-count n` if it's the main (only sustained) step. **When it coexists with a ramp/constant step, the sustained step is the dominant shape** — use that profile and its Little's-law VU count; fold the burst in as the initial spike and note it. Only when the burst's `n` exceeds the sustained VU count does it set the peak (use the larger, and say so) |
| `rampUsers(n).during(d)` | **`n` is a total count, not a rate.** `n` users arrive evenly over `d`, so first convert to a rate `n/d` users/s, then `--vu-count ceil((n/d) × J)`, ramp-up. E.g. `rampUsers(50).during(60s)` → `50/60 ≈ 0.83/s`, **not** 50/s |
| `stressPeakUsers(n).during(d)` | `--load-profile peak --vu-count ceil(peak rate × J)` |
| `nothingFor(d)` | none. Add d to the explanation. Gap if it's the only step, otherwise approximated |
| `.randomized()` | none: gap (arrivals aren't randomised) |

When the chain has several steps, choose **one** profile for the dominant shape and put every step with its arithmetic in MIGRATION.md → Load model. Also write what the user should watch for: "Gatling measured N users arriving per second; Postman keeps V users busy. Compare throughput (rps) with your Gatling report rather than user counts."

Example (show your working like this):
```
Source: rampUsersPerSec(1).to(10).during(60s), then constantUsersPerSec(10).during(120s)
Journey: 2 requests × 0.3 s (assumed) + pause(1,2) mean 1.5 s = 2.1 s
Peak VUs: 10 users/s × 2.1 s = 21 → --vu-count 21
Duration: 60 + 120 = 180 s = 3 min → --duration 3
Profile: ramp-up (one ramp then a hold; the ramp/hold split is fixed by the profile, not 1:2)
```

Count-based injectors — convert the count to a rate FIRST (this is the step that most often goes wrong):
```
Source: atOnceUsers(5), then rampUsers(50).during(60s)
Rate:    rampUsers(50).during(60s) = 50 users over 60 s = 50/60 ≈ 0.83 users/s   ← NOT 50/s
Journey: 3 requests × 0.3 s (assumed) + pause 0.5 s × 3 + /delay/1 ≈ 1 s = ~3.7 s
Sustained VUs: 0.83 users/s × 3.7 s ≈ 3.08 → 4
Burst:   atOnceUsers(5) = 5 users at once; 5 > 4, so the burst sets the peak → --vu-count 5
Duration: 60 s = 1 min → --duration 1 ; Profile: ramp-up
```
(Reading `rampUsers(50)` as 50 users/s here would give `50 × 3.7 ≈ 185` VUs — ~40× too high.)

## Throttle (`throttle:*`) and max duration
- `throttle(reachRps(r).in(t), holdFor(h))`: there's no RPS cap. **Gap**, and say that Postman won't hold throughput at r. The user can lower `--vu-count` to get near it.
- `maxDuration(d)`: `--duration` is already a hard stop. Mapped to `run:--duration` if d ≥ the computed duration. Otherwise use d, and approximate.

## Assertions (`assert:*`)
The CLI takes **at most one** `--pass-if`. Pick it by this **strict priority — this overrides the order the assertions appear in the source**:
1. a global error-rate assertion (`failedRequests`/`successfulRequests` → `error_rate`)
2. a global latency percentile (`p95`, then `p99`, then `p90`)
3. a global `mean` (`avg`) or `requestsPerSec` (`rps`)

Walk the list top-down and take the **first category that a source assertion matches**, even if a different assertion came first in the source. Example: a simulation with `responseTime().percentile(95).lt(800)` **and** `failedRequests().percent().lt(1)` → the `--pass-if` is `less_than(error_rate, 1)` (category 1 wins), and the p95 assertion is the **gap**, not the other way round.

All non-chosen assertions are **gap**, reason "the CLI takes one pass condition". Suggest adding them as run criteria in the app, where several aggregate checks are allowed.

**If no source assertion matches any category** (e.g. only `forAll`/`details(...)` per-request assertions, or only `responseTime().max()` which has no CLI metric), emit **no `--pass-if` flag at all** — this is correct and expected, not a defect. Record every assertion as a gap and tell the user to add run criteria in the app. A `run.sh` with zero `--pass-if` is valid.
| Gatling | `--pass-if` | Notes |
|---|---|---|
| `global().failedRequests().percent().lt(x)` | `less_than(error_rate, x)` | approximated (see error-rate note below) |
| `global().failedRequests().count().is(0)` | `less_than_eq(error_rate, 0)` | approximated (percentage instead of count; + error-rate note) |
| `global().successfulRequests().percent().gt(x)` | `less_than(error_rate, 100 - x)` | approximated (see error-rate note below) |
| `global().responseTime().percentile(95).lt(ms)` (Scala `percentile3`) | `less_than(p95, ms)` | mapped (also p90, p99. Other percentiles → the nearest, approximated) |
| `global().responseTime().mean().lt(ms)` | `less_than(avg, ms)` | mapped |
| `global().responseTime().max()` / `min()` / `stdDev()` | none | gap |
| `global().requestsPerSec().gt(r)` | `greater_than(rps, r)` | mapped |
| `forAll…` / `details("group", "req")…` | none (no per-request criteria) | gap |
| `lte` / `gte` | `less_than_eq` / `greater_than_eq` | — |

**Error-rate note (why failed/successful-request mappings are approximated).** Gatling's `failedRequests` counts a request as failed when a **check** fails, even on an HTTP 200. Postman's `error_rate` counts transport/runtime errors and may **not** count a request that returned a response but failed a translated `pm.test` (behaviour differs by runner). So a batch of 200s that all fail a JSON check would fail Gatling's gate but can **pass** `less_than(error_rate, …)`. Map `failedRequests`/`successfulRequests` → `error_rate` as **approximated**, say so in MIGRATION.md, and note it's a weaker gate than Gatling's (plus any hosted-runner limitation). If the failure the user cares about is a check, a latency percentile or `rps` criterion may be the more faithful gate.

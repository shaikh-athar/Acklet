# Importing a Gatling project into Postman

> Reference for the `performance-testing` skill. Convert the simulation, review the gap report, then the result is an ordinary performance run. Verifying it runs one iteration of real requests against the target, so confirm the target first — the same way any action with effects outside this session gets confirmed.

## Overview
A Gatling simulation is code: a scenario of `http()` requests, checks, feeders,
pauses and flow control, plus a `setUp` that injects load and asserts on
results. Postman splits the same thing in two:
- the **collection** (requests, test scripts, variables, data file), and
- the **run config** (`postman performance run` flags: VUs, duration, load profile, pass criteria).

You do the whole translation by reading the source and applying the files next to
this one — there is no importer to run. Two disciplines keep you honest, both
described below: an **inventory** (list every construct first, so nothing is
dropped silently) and a **self-verify** pass (prove every construct landed
somewhere or is explained, and that the collection actually runs).

A conversion that runs but silently drops a check, or quietly changes the load
model, is worse than no conversion, because the user will trust the numbers.
**The gap report is a first-class output, not an apology.**

## Workflow

1. **Discover.** Find the simulation(s): classes that `extends Simulation`,
   Kotlin `: Simulation()`, or JS/TS `simulation((setUp) => …)`. Note the language
   and build tool. If there is more than one simulation, ask which to convert.
   Convert one simulation per output directory.
2. **Inventory.** Read every source file the simulation touches and list **every
   construct a conversion must account for** — see *Inventory: what to list*. This
   is your checklist; each item gets a stable id. Pay attention to requests built
   in loops or helper methods and to dynamic names — a shallow scan misses them.
3. **Translate** each item using the files next to this one:
   - `mapping.md`: requests, EL, checks, protocol settings, groups, flow control, custom code
   - `feeders.md`: feeders → data file + distribution
   - `injection.md`: injection profiles, throttle, assertions → run flags
   - `unsupported.md`: what becomes a gap, and how to word it
4. **Write outputs** to the output directory (formats below).
5. **Verify** against the checklist in *Verify: self-review* — including, after you
   confirm the target, one real smoke iteration via the existing
   `postman collection run` command. Fix everything that fails and re-check, up to
   3 rounds.
6. **Report** to the user: counts (mapped / approximated / gap), the verify
   result, and the top 3 things they must do by hand. Point them to MIGRATION.md.

## Inventory: what to list
List every construct below that appears in the simulation, each with a **stable
id** (used verbatim in the MIGRATION.md coverage table). Kinds and id prefixes:

- `req:<name>` — each `http("name").get/post(...)` request.
- `check:<req>#<n>` — each check on a request (`status`, `jsonPath`, `jmesPath`, `regex`, `header`, `bodyString`, `substring`, `responseTimeInMillis`, …). A request with **no** `status` check still has Gatling's implicit 2xx-or-304 check — list it as `implicit-status:<req>`.
- `scenario:<name>`, `group:<name>` — scenarios and groups.
- `feeder:<file>` and `feed:<n>` — feeder sources and `feed(...)` calls (one logical data source emits both; see `feeders.md`).
- `timing:<n>` — `pause`, `pace`, `rendezVous`.
- `flow:<construct>#<n>` — `repeat`, `during`, `forever`, `doIf`, `tryMax`, `exitHereIfFailed`, `doSwitch`, … 
- `inj#<n>` — each injection step (open or closed model).
- `throttle#<n>`, `max-duration` — throttle / `maxDuration`.
- `assert#<n>` — each `setUp(...).assertions(...)` entry.
- `proto:<setting>` — each `http.baseUrl/header/acceptHeader/shareConnections/enableHttp2/...`.
- `non_http:<proto>:<name>` — `ws`, `sse`, `grpc`, `mqtt`, … steps (and their checks).
- `code:<n>` — custom-code `exec(session -> …)` lambdas.
- `secret:<n>` — any literal that looks like a credential (API key, token, `Authorization` value). **Record only that it exists — never copy the literal anywhere.**

A request built in a loop or helper, or named dynamically, still gets an id; find it by reading, not pattern-matching. If you are unsure a construct exists, list it and resolve it to a gap rather than omit it.

## Output formats
### `collection.json`: Postman collection v2.1
- `info.schema` = `https://schema.getpostman.com/json/collection/v2.1.0/collection.json`
- `info.description` is a plain string whose first line is exactly `imported-from: gatling` followed by two lines `source: <relative source path>` and `class: <simulation class/name>`. Example: `"imported-from: gatling\nsource: src/test/java/poc/BasicSimulation.java\nclass: BasicSimulation"`.
- One collection per simulation. One folder per Gatling `group`; with **no** groups, requests sit at the collection root (a bare request name, no folder prefix — that is valid). Requests keep their Gatling names exactly (they drive per-request metrics), and **request leaf names must be unique** (a collection cannot hold two requests with the same path — see `repeat` in mapping.md).
- Base URL → collection variable `baseUrl`. Requests use `{{baseUrl}}/path`.
- Each request's test script ends with the translated checks. Mark translated custom code with `// REVIEW: translated from Gatling custom code (<inventory id>)`.

### `environment.json`: Postman environment
`{"name": "<simulation> (from Gatling)", "values": [{"key": "...", "value": "...", "enabled": true}]}`.
Secrets become keys with an **empty value** and `"type": "secret"`. Never copy a
secret literal from the source (see Critical rules). This file holds **secrets and
externalised config only** — `baseUrl` and correlation values are collection variables, not
environment keys. **Always write the file**, even when there is nothing to put in it: a
simulation with no secrets and no externalised config gets `"values": []`. (An empty
environment is correct and expected, not a defect.)

### `data/<name>.csv`
Copy feeder files that the simulation uses. Convert JSON array feeders to CSV if they are flat. If the simulation has **no feeder**, don't create a `data/` directory at all (and omit `--data-file` from run.sh).

### `run.sh`
```bash
#!/usr/bin/env bash
# Converted from <Simulation>. Replace <collection-uid> after pushing the collection to a workspace.
postman performance run "<collection-uid>" \
  --environment "<environment-uid>" \
  --vu-count 20 --duration 5 --load-profile ramp-up \
  --data-file data/users.csv \
  --pass-if "less_than(error_rate, 1)"
```
Only flags that exist in `postman performance run --help` (check the user's installed
version; don't assume a flag from a newer CLI). Duration is in whole minutes, rounded up.
- `--environment` — include it whenever `environment.json` has any values (the secrets/config requests depend on). Requests using `{{secret}}`/config resolve to nothing without it. Tell the user to import and **populate** `environment.json`, then replace `<environment-uid>` with its UID. Omit the flag only when the environment is empty (`values: []`).
- `--data-file` only if the simulation has a feeder; **omit the line entirely** when there is none (don't invent a data file).
- `--pass-if`: **at most one**, chosen by the strict priority in `injection.md` (error-rate, then latency percentile, then mean/rps) — this overrides source order. If **no** source assertion matches any category, **omit `--pass-if` entirely**. Every non-chosen assertion goes to the gap report.

### `MIGRATION.md`: gap report (also your accounting record)
Sections, in order:
1. **Summary**: source, counts (mapped / approximated / gap), verify result. The counts must equal the coverage-table tally; derive them from the table, don't hand-write them.
2. **Load model**: the original injection profile, the chosen flags, and the arithmetic (see `injection.md`). Required even when the mapping is exact.
3. **Coverage**: a table with one row per inventory id — this is the accounting that replaces a manifest. Columns: `id` · `kind` · `status` (`mapped` / `approximated` / `gap`) · `landed` (where it went, or why it was dropped). **Every inventory id appears here**; a missing row is a silently-dropped construct. Use these idioms in `landed`:
   - request → `collection:<folder>/<request>` (root request → just the name)
   - check / saveAs → `collection:<req> › test` (a `saveAs` value is script-set, so it is a test-script line, not a declared collection variable)
   - protocol setting on every request → name each request it lands on
   - scenario → `the collection itself`; group → `folder <name>`
   - injection → the `run:` flags it set
   - secret → `environment:<key> (placeholder, value not copied)`
4. **Approximations**: one bullet per approximated id: `` `<id>` ``, what changed, why, what to check.
5. **Gaps**: one bullet per gap id: `` `<id>` ``, what was dropped, why, and the manual workaround if there is one.
6. **Secrets**: which environment keys the user must fill in.
7. **Next steps**: push the collection, fill secrets, run a short test, compare with a Gatling baseline.

Every `approximated` or `gap` id **must appear verbatim** in both the coverage table and its Approximations/Gaps bullet.

## Verify: self-review
Before claiming done, check each of these against your own output and fix every miss:

1. **Accounting** — every inventory id has a row in the MIGRATION.md coverage table; every `approximated`/`gap` id also has its bullet. Nothing dropped silently.
2. **Collection** — valid v2.1, `info.description` stamped `imported-from: gatling`, every request has a method and a URL, and no two requests share the same folder/name path.
3. **Variables** — every `{{var}}` used anywhere in the collection is defined somewhere: a collection variable, an environment key, a data-file column, or set by an earlier request's script. An undefined `{{var}}` is a bug.
4. **Secrets** — no secret literal appears in any output file (collection, environment, run.sh, MIGRATION.md). Re-read the source's credential-looking values and confirm none were copied.
5. **run.sh** — run `postman performance run --help` and confirm every flag you used exists in this CLI version, values are valid (duration a whole number ≥ 1, load profile one of the listed names), and there is **at most one** `--pass-if`.
6. **Smoke** — the one executable check. Tell the user it sends **one iteration** of the converted requests to the target host(s), name the host(s), and wait for a yes for any host that is not local. Then run the existing CLI:

   ```
   postman collection run collection.json -n 1 -e environment.json
   ```

   (add `-d data/<file>` when there is a feeder). Confirm every request executed with no transport error. A `pm.test` failure that comes from the conversion needs an explanation in MIGRATION.md; one that comes from the target (e.g. a 4xx the simulation also expected) just gets noted. If the user declines the traffic, or there is no CLI login / network, skip only this step and say in your report that no request was executed — the other five checks still hold.

## Critical rules
1. **Never copy a secret literal into any output.** That covers the collection, environment, run.sh and MIGRATION.md. Items of kind `secret` become an environment key with an empty value, and MIGRATION.md tells the user to fill it in. Don't put secrets in descriptions or metadata either.
2. **Never drop an item silently.** Every inventory id gets a coverage-table row. If you aren't sure, choose `approximated` or `gap` and explain. Don't choose `mapped`.
3. **Never change the load model silently.** Open-model (arrival-rate) injection has no exact equivalent. Always show the conversion arithmetic in MIGRATION.md → Load model.
4. **Confirm before sending traffic.** The smoke sends one iteration to the target. Get a yes for any non-local host first. Never run `postman performance run` yourself; the user runs `run.sh`.
5. **Keep request names identical** to the Gatling `http("…")` names, so results can be compared with old Gatling reports.
6. **Don't claim done until the self-verify checklist passes.** If you can't get it to pass in 3 rounds, stop and report what is still failing.

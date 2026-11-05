# What can't be carried over, and how to say so

Postman performance runs are **HTTP(S) only** (GraphQL over HTTP and mTLS work). Load settings are the CLI flags in `injection.md`.

## Always a gap
| Construct | Inventory kind | Wording for MIGRATION.md |
|---|---|---|
| `ws(...)`, `sse(...)` | `non_http_step` | WebSocket/SSE steps aren't part of Postman performance runs. They were removed from the load test. Test the socket flow separately (Postman's WebSocket client works for functional checks). |
| `grpc(...)`, `jms(...)`, `mqtt(...)`, `kafka(...)`, `amqp(...)` | `non_http_step` | This protocol isn't supported under load in Postman. These steps were removed. |
| `rendezVous(n)` | `timing` | There's no way to synchronise virtual users. Users won't wait for each other. |
| `pace(d)` | `timing` | There's no iteration pacing: VUs start the next iteration immediately. Add an explicit delay in the last request's test script only if the pacing matters (`setTimeout` isn't reliable under load, so prefer lowering `--vu-count`). |
| `throttle(...)` | `throttle` | There's no RPS cap. Throughput isn't limited to the Gatling target. |
| `tryMax(n)` | `flow` | Failed requests aren't retried. |
| `stopLoadGenerator`, `crashLoadGenerator` | `flow` | There's no scripted run abort. Use `--pass-if` to fail the run afterwards. |
| `.randomized()` on injection | `injection` | Arrivals aren't randomised. |
| `.enableHttp2()`, `.inferHtmlResources()`, `.shareConnections()` | `protocol_setting` | See `mapping.md`. |
| second and later assertions | `assertion` | The CLI takes one `--pass-if`. |
| `forAll` / `details(...)` assertions | `assertion` | There are no per-request pass criteria. |
| JDBC/Redis feeders | `feeder` | Export to CSV first. |
| extra scenarios in `setUp` | `scenario` | One collection per run. Convert them separately and run them in parallel. |

## Pauses
`pause(d)` and `pause(min, max)` (`timing`) have no first-class think time. Always a **gap**; how it affects the result depends on the injection model:
- **Open model:** the pause is part of the journey time, so it already feeds the Little's-law `--vu-count` arithmetic in `injection.md`. Dropping the think time alone (keeping the computed VU count) means VUs send faster than Gatling users did. Say which metric (rps) to compare with the Gatling baseline.
- **Closed model:** there is no journey-time arithmetic to fold into — the VU count is the source concurrency directly. The pause is simply dropped: VUs loop with no think time, so they issue more requests per VU than Gatling did. Record it as a gap and tell the user throughput (rps) will be higher than Gatling's; they can lower `--vu-count` to compensate.
- If the user explicitly wants think time: a pre-request script with a busy-wait isn't acceptable under load. Record it as a gap, and suggest lowering `--vu-count` in proportion.

## Wording rules
- One bullet per id: `` `<id>` ``, what changed, why, what to do. Keep it to 1–2 lines.
- Never write "not supported yet" or promise a roadmap. State today's behaviour.
- If the gap changes the results (pauses, pace, throttle, queue feeders, open-model injection), say which metric to compare with the Gatling baseline.

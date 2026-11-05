---
name: api-monitoring
description: Use when setting up recurring API checks, running or diagnosing a Postman Monitor, changing its schedule, or reaching private APIs through a self-hosted runner. Reuses collection assertions to detect live regressions and traces failures to individual run evidence. Use for requests such as "check this API every minute".
---

# API Monitoring

A monitor turns a saved collection into recurring evidence about a live API.
It can catch behavior that changes after deployment or between developer
sessions, but only if its assertions, environment, and execution location
exercise the guarantees users depend on.

1. Reuse the collection's meaningful assertions before scheduling it. A
   request returning 200 is a weak health signal if the response can violate
   the contract. Check auth, target environment, and write side effects; use
   **api-testing** to establish what the collection actually verifies.
2. Choose cadence, timezone, execution location, and alert recipients from
   the operational need. `postman monitor create -c <collection-id>` uses
   the linked workspace unless one is supplied. Inspect command-specific
   `-h` and available service options for supported schedules and limits.
   Creation starts an immediate run by default; `--no-run-now` avoids that
   when only scheduling was requested. Pass `--timezone` with the zone the
   user means (for example `America/New_York`); without it the schedule uses
   the zone of the machine running the CLI. Leave the month field as `*`; to
   limit a schedule to certain months, write them as three-letter names such
   as `jan`, not numbers.
3. Choose a Postman region for a reachable public API. Use a self-hosted
   runner when the target is reachable only inside the user's network;
   running one adds infrastructure to maintain. `postman runner regions`
   provides valid hosted locations and `runner list --json` the full IDs of
   registered private runners. `monitor create/update --runner` accepts either;
   multiple locations help distinguish API failures from regional reachability.
4. Update a monitor in place to keep its run history.
   `monitor update` cannot change the collection, and cannot pause or resume
   the monitor: use `monitor pause`/`monitor resume` for that. `update -e`
   swaps the environment and `--clear-environment` removes it. A different
   collection requires a replacement, so plan the handoff before deleting the
   old monitor and its continuity. Permanent deletion needs explicit intent.
5. Use `postman monitor run <id>` for an immediate verdict, such as after a
   deploy. `--async` returns a job handle when the caller need not wait.
   The CLI timeout caps waiting, not execution: after a timeout, read the job
   with `monitor jobs get <job-id>`; its state is the verdict.
6. Answer each failure question at its level. `monitor jobs list
   <monitor-id>` finds jobs, `monitor jobs get <job-id>` shows terminal state
   and regional outcomes, and `monitor runs get <run-id>` shows assertions
   within an attempt. A failing region, a connection error, and a failed
   assertion imply different fixes. For a trend across runs, such as which
   request got slow, use `monitor metrics <monitor-id>`. In a CI gate, run
   `monitor run` without `-x`, so a failed run fails the build.

For discovery, `monitor list` supports workspace and collection filters; to
page it, pass `--cursor` with the value from the previous page. Its runner filter
is for a self-hosted ID and cannot be combined with other filters; a page-local
name filter does not establish absence across all pages.

For a private runner, use `runner start` with the ID and key from the runner
created in Postman, and verify it is reporting in before assigning runs: a
recent `Last ping` in `runner list` (`lastPingAt` under `--json`; `never`
means it has not connected). Inspect its help for proxy, private CA,
residency, and health-metric options only when the network requires them.
Runner activity is reported by default; `--no-report-events` disables that
reporting when the task requires it. Pass the runner key at runtime, from the
user or a secret store (for example `--key "$RUNNER_KEY"`), and keep it out of
files in the repository. If a `monitor` or `runner list` command fails on
authentication, sign in.

## Verification

Report the actual monitor configuration or terminal job/run outcome, including
where it executed and which checks failed. A created monitor, accepted job,
or a runner reporting in alone does not prove the API passed its health checks.

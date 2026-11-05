# Feeders → data file + distribution

## Sources (`feeder:*`)
| Gatling | Postman | Status |
|---|---|---|
| `csv("f.csv")`, `tsv`, `ssv`, `separatedValues` | copy to `data/f.csv` (convert TSV/SSV to CSV) → `--data-file data/f.csv` | mapped |
| `jsonFile("f.json")` (a flat array of objects) | `data/f.csv`, or keep JSON (`--data-file` accepts JSON) | mapped |
| `jsonUrl(url)` | download once (with the user's OK) or leave as a gap | gap unless downloaded |
| `jdbcFeeder`, `redisFeeder`, `sitemap` | export to CSV by hand | gap. Give the export query in MIGRATION.md |
| `listFeeder` / `arrayFeeder` (inline data) | write the rows to `data/<name>.csv` | mapped |

The file must sit in `$OUT/data/` so that `run.sh` and the smoke run can find it. Set `manifest.run.data_file` to the file the smoke run should use.

## Strategy
The Gatling default (no strategy) is **`queue`**. Each record is used once, and the run **crashes** when the records run out.
| Gatling | `postman performance run --data-file` behaviour | Status |
|---|---|---|
| `.circular()` | with `--data-file`, local rows are distributed per the CLI's documented default (confirm in the installed `--help`; it has been random in recent CLIs). Each VU iteration picks a row | approximated. Say the distribution follows the CLI default, not Gatling's round-robin. A Postman Dataset (`--dataset-distribution round-robin`) is the exact match |
| `.random()` | random | mapped |
| `.shuffle()` | random (with replacement) | approximated |
| `.queue()` / default | random; rows can repeat and the run never runs out | approximated. **Always** call out that uniqueness is lost: if the source relies on each row being used once (unique users, one-time tokens), the test will behave differently |
| `.shard()` | none | gap |
| `.batch()`, `.eager()`, `.transform(...)`, `.unzip()` | `eager` and `batch` are no-ops. `transform` → a pre-request script | approximated |

## `feed(...)` calls (`feed:*`)
`feed(f)` at the start of the scenario → each iteration gets a row, and the columns become variables `{{column}}`. Mapped, with `target: "data:data/<file>"`.
`feed(f, n)` (several records at once) → gap.

**One data source, two inventory ids.** The inventory emits a `feeder:*` id (the source + its distribution strategy) **and** a `feed:*` id (the binding that hands a row to each iteration), both describing one logical data file. Account for them split by concern: the `feed:*` id is **mapped** (`target: data:data/<file>` — row → `{{column}}` variables), and the `feeder:*` id carries the **strategy** status (e.g. `.circular()` → **approximated**, "distribution follows the CLI default, not round-robin"; default `queue` → **approximated**, "uniqueness lost"). Both may point at the same `data:` target; that is expected, not a duplicate.

**Multiple feeders.** A scenario with more than one `feed(...)` (e.g. `feed(users).feed(products)`) has **no exact mapping**: `postman performance run` takes a single `--data-file` and the smoke run a single `-d`, so only one set of columns can bind. Do **not** emit two `--data-file` bindings and mark both mapped — one set would silently go unbound. Instead either: (a) **combine** the sources into one CSV/dataset by joining their columns, and document the changed row pairing/distribution in MIGRATION.md (**approximated**); or (b) map the primary feeder and record the others as **gaps**, naming which `{{columns}}` won't resolve. State the choice in the coverage table.

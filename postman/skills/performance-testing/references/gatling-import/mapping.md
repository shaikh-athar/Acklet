# Mapping: requests, EL, checks, protocol, flow, custom code

## Protocol settings (`proto:*`)
| Gatling | Postman | Status |
|---|---|---|
| `.baseUrl("https://h")` | collection variable `baseUrl`; requests use `{{baseUrl}}/…` | mapped |
| `.baseUrls(a, b)` | first one as `baseUrl`; note the round-robin | approximated |
| `.header(k, v)`, `.headers(map)` | header on every request (or collection pre-request `pm.request.headers.upsert`) | mapped |
| `.acceptHeader`, `.contentTypeHeader`, `.userAgentHeader`, `.authorizationHeader` … | the matching header on every request | mapped |
| `.basicAuth(u, p)` | collection auth `basic`, with `{{user}}` / `{{password}}` from the environment | mapped |
| `.shareConnections()` | none. The runtime manages connections | gap (no-op; performance may differ) |
| `.enableHttp2()` | none. HTTP/1.1 only | gap |
| `.inferHtmlResources()` | none. Embedded resources are not fetched | gap |
| `.disableCaching()`, `.disableFollowRedirect()`, `.maxConnectionsPerHost()` | none, or the request setting `followRedirects: false` | gap / mapped for redirects |
| `.warmUp(url)` | none | gap |

If a header value is a secret (an inventory `secret` item, or a name like `x-api-key` or `authorization` with a literal), use `{{<camelCaseName>}}` and add an empty environment key.

## Requests (`req:*`)
- Name: keep the `http("…")` name exactly.
- Method and path: `.get("/p")` → `GET {{baseUrl}}/p`. An absolute URL stays absolute.
- `.queryParam(k, v)` → a URL query param. `.formParam(k, v)` → `body.mode: urlencoded`. `.body(StringBody("…")).asJson()` → `body.mode: raw`, `options.raw.language: json`, plus header `Content-Type: application/json`.
- `.header(k, v)` on a request → that request's header.
- `ElFileBody("x.json")` / `RawFileBody` → inline the file contents into the raw body (translate EL inside it).

## EL → Postman variables
| Gatling EL | Postman |
|---|---|
| `#{name}` | `{{name}}` |
| `#{randomUuid()}` | `{{$guid}}` |
| `#{randomInt()}` / `#{randomInt(a,b)}` | `{{$randomInt}}` (0–1000, approximated), or a pre-request script for a range |
| `#{randomLong()}` | a pre-request script, stored in a variable |
| `#{currentTimeMillis()}` | `{{$timestamp}}` is seconds, so use a pre-request script: `pm.variables.set('now', Date.now())` |
| `#{name.size()}`, `#{name(0)}`, `#{name.random()}` | a pre-request script over the parsed variable |
| `#{name.jsonStringify()}` | a pre-request script `JSON.stringify(...)` |
| `#{i}` from `repeat(n, "i")` | see Flow → loops |

Every `{{var}}` must be defined somewhere: the environment, collection variables, a data-file column, or set by an earlier script. The self-verify step checks this.

## Checks (`check:*`) → test script
Put the checks in the request's `test` event, in source order. Name each `pm.test` after what it asserts.
| Gatling | Test script |
|---|---|
| `status().is(200)` (Kotlin: `shouldBe`) | `pm.test('status is 200', () => pm.response.to.have.status(200));` |
| `status().in(200, 204)` | `pm.expect([200,204]).to.include(pm.response.code)` |
| `jsonPath("$.a.b").is("x")` | `pm.expect(pm.response.json().a.b).to.eql('x')`. Gatling compares as a string unless `ofInt()` etc. is used, so compare `String(v)` when the source is a string literal |
| `jsonPath(...).isEL("#{v}")` | compare with `pm.variables.get('v')` (see **Saved variables scope**: read with `pm.variables.get`, write with `pm.collectionVariables.set`) |
| `jsonPath(...).exists()` / `.notExists()` | `pm.expect(value).to.not.be.undefined` / `.to.be.undefined` |
| `jsonPath(...).saveAs("v")` | `pm.collectionVariables.set('v', value)`, and also a `pm.test` that the value exists. **approximated**: Gatling marks the request failed on a missing extraction but, by default, **continues** the scenario — so do **not** add `pm.execution.setNextRequest(null)` here; that would skip the rest of the iteration even though the source doesn't. Stop early only when the source wraps this in `exitHereIfFailed`/`exitBlockOnFail` (see Flow control); if a later request needs to know the extraction failed, track that in a variable. Manifest target: the request's test script (`collection:<req> › test: saveAs v`), **not** `collection-variable:` — the value is script-set, not a declared collection variable |
| `jmesPath("a.b")` | same as jsonPath, using a JS property path |
| `regex("p").saveAs("v")` | `const m = pm.response.text().match(/p/); pm.test(..., () => pm.expect(m).to.not.be.null); pm.collectionVariables.set('v', m && m[1] !== undefined ? m[1] : m && m[0])`. Gatling saves group 1 if there is one, otherwise the whole match |
| `header("h").is(v)` | `pm.expect(pm.response.headers.get('h')).to.eql(v)` |
| `bodyString().is/contains` | `pm.response.text()` |
| `substring("s")` | `pm.expect(pm.response.text()).to.include('s')` |
| `responseTimeInMillis().lt(n)` | `pm.expect(pm.response.responseTime).to.be.below(n)` |
| `css(...)` / `xpath(...)` | cheerio (`require('cheerio')`) for CSS if the selector is simple. XPath → gap |
| `checkIf(cond)` | wrap the assertion in an `if` that translates the condition. Approximated if the condition is custom code |

**Implicit status check (`implicit-status:*`).** When a Gatling request declares no `status()` check, Gatling still fails it unless the status is 2xx or 304. Add `pm.test('status is 2xx/304 (Gatling implicit check)', () => pm.expect(pm.response.code === 304 || (pm.response.code >= 200 && pm.response.code < 300)).to.be.true);`. Status: mapped.

**Saved variables scope.** For correlation, **write** with `pm.collectionVariables.set('v', value)` and **read** with `pm.variables.get('v')` (the general resolver sees collection scope, so the two are consistent — don't mix `pm.collectionVariables.get` and `pm.variables.get` for the same value). In a performance run each virtual user has its own variable scope, which matches Gatling's per-user `Session`. A value saved this way is set by a script at run time, so it is **not** a declared collection variable — in the MIGRATION.md coverage table a `saveAs` lands on the request's test script, not a `collection-variable`.

**Name collisions with feeder columns.** Data-file (`iterationData`) values outrank collection variables when `{{x}}` / `pm.variables.get('x')` resolves (see `postman:variables`). So if a `saveAs`/session key has the **same name as a feeder column**, `pm.collectionVariables.set('x', …)` will **not** override it — `{{x}}` still resolves to the feeder's value, unlike Gatling where the later session write wins. When a saved key collides with a feeder column, **rename** the saved key (or the column) and use the renamed key consistently across the extraction, any custom-code translation, and the request substitutions; note the rename in MIGRATION.md.

## Scenario, groups (`scenario:*`, `group:*`)
- Scenario → the collection itself (name the collection after it). If `setUp` has several scenarios, convert the main one and list the others as a gap: one collection per run.
- `group("g")` → a folder named `g` containing the requests in the group. Status: approximated. Postman reports per-request metrics, and there's no folder-level (transaction) timing. Say so.

## Flow control (`flow:*`)
| Gatling | Postman | Status |
|---|---|---|
| `exec` chain (sequential) | request order in the collection | mapped |
| `repeat(n) { … }` / `repeat(n, "i")` | Use **one** request with a `setNextRequest` loop + a counter collection variable, so the single leaf runs n times. **Never unroll into n copies that share the same name**: a Postman collection can't hold two request leaves with the same path — so the "copies named `name`" shortcut is invalid. The loop also keeps the metric name identical (which is what unrolling was for). Only unroll if the body genuinely differs per iteration, and then give each copy a **distinct** name and note in MIGRATION.md that per-iteration metrics are split across those names. For `repeat(n, "i")`, set the counter as `{{i}}` in the loop script. **When the body is a chain of several requests** (`repeat(3){ A; B }`), loop the **whole body**, not one leaf: keep A and B as distinct requests and have the body's **last** request jump back to the **first** (`pm.execution.setNextRequest('A')`) while the counter < n, initialising/resetting the counter on first entry — so the order is A,B,A,B,A,B. A single-leaf loop only models a single-request body | approximated (explain the loop/metrics effect) |
| `during(d) { … }` / `forever { … }` wrapping the main journey | The VU loop itself: a VU repeats the collection until the run ends | approximated (Gatling users in open models start and stop. Here VUs loop) |
| `asLongAs(cond)`, `doWhile` | `setNextRequest` loop with a condition in the test script | approximated |
| `doIf(cond) { r }` | in the pre-request of `r`: `if (!cond) pm.execution.skipRequest()`. The condition is translated to JS (session attribute → `pm.variables.get`) | **mapped** if the condition reduces to a simple equality/comparison on a session value — *even when written as a lambda* (e.g. `session -> session.getString("tier").equals("gold")` → `pm.variables.get('tier') === 'gold'`). **approximated** only if it calls out to logic you can't express as a plain JS comparison (library calls, computation, external state). A lambda by itself does not force "approximated"; judge the body |
| `doIfOrElse`, `doSwitch`, `randomSwitch`, `roundRobinSwitch` | `skipRequest` logic per branch. `randomSwitch` percentages via `Math.random()` in a pre-request | approximated |
| `tryMax(n) { r }` | none. A request that fails isn't retried | gap. Suggest checking the error rate instead |
| `exitHereIfFailed` | in the test script: `if (pm.response.code >= 400) pm.execution.setNextRequest(null)` — ends the whole iteration | approximated (only stops on status failure, not on any failed check, unless you track that in a variable) |
| `exitBlockOnFail { … }` | exits **only its block**, then resumes after it — so on failure jump to the **first request after the block** (`pm.execution.setNextRequest('<next>')`), **not** `null`. Ending the iteration would skip requests/cleanup that sit outside the block | approximated (status-failure only unless you track check failures in a variable) |
| `stopLoadGenerator` / `crashLoadGenerator` | none | gap |

## Custom code (`code:*`)
`exec(session -> …)` (Java), `exec { session -> … }` (Kotlin), `exec(session => …)` (Scala, JS):
- Translate it to a **pre-request script** on the next request.
  - `session.set("k", v)` → `pm.collectionVariables.set('k', v)`
  - `session.getString("k")` → `pm.collectionVariables.get('k')`
  - `session.userId()` → `pm.info.iteration`, as an approximation
  - `UUID.randomUUID()` → `crypto.randomUUID()` if available, otherwise `pm.variables.replaceIn('{{$guid}}')`
- Always prefix it with `// REVIEW: translated from Gatling custom code (<id>)`. Status: approximated. List it in MIGRATION.md → Approximations, with the original code.
- JVM library calls you can't translate (JDBC, crypto libraries, file IO) → gap.

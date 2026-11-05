# HTTP collection files

Read when authoring HTTP request, example, or definition YAML. These field
shapes distinguish v3 files from exported collection JSON; validate edits with
collection lint before relying on the result.

## Definition file (`.resources/definition.yaml`)

Optional metadata for a collection or folder:

- `$kind: "collection"` — required, even for a folder's definition.
- `name` — optional, defaults to the filesystem folder name.
- `description` — optional.
- `variables` — array of `{key, value, description?, disabled?}`. `value`
  must be a string; `disabled` a boolean.
- `auth` — a single auth object `{type, credentials: [{key, value}, ...]}`
  or an array for multiAuth: `[{id, name, type, credentials, rules?}, ...]`.
- `scripts` — array of `{type, code, language: "text/javascript"}`. `type`
  is one of `http:beforeRequest`, `http:afterResponse`,
  `graphql:beforeQuery`, `graphql:afterResponse`, `grpc:beforeInvoke`,
  `grpc:onIncomingMessage`, `grpc:afterResponse`.
- `order` — number, used for folder ordering.

## HTTP request (`*.request.yaml`)

- `$kind: "http-request"` — required.
- `name` — optional (see naming rules below for when to include it).
- `order` — number; only used for relative comparison, so space values out
  (e.g. multiples of 1000) rather than packing them tight — a later
  insertion between two requests shouldn't force renumbering every sibling.
- `url` — string, with `{{varName}}` variable syntax.
- `method` — `GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS`.
- `headers` — array of `{key, value, description?, disabled?}`.
- `queryParams` — array of `{key, value, description?, disabled?}`.
- `pathVariables` — array of `{key, value, description?}`.
- `body` — `{type, content}`; `type` required whenever `body` is present.
  - Types: `json`, `formdata`, `urlencoded`, `text`, `xml`, `html`,
    `javascript`, `file`, `none`.
  - `json`/`text`/`xml`/`html`/`javascript`: `content` is a string.
  - `formdata`: `content` is an array of
    `{key, type: "text"|"file", value or src, contentType?, description?}`.
  - `urlencoded`: `content` is an array of `{key, value, description?}`.
- `auth` — `{type, credentials}`.
- `settings` —
  `{protocolVersion?, strictSSL?, followRedirects?, maxRedirects?, disabledSystemHeaders?}`.
- `scripts` — array of `{type: "beforeRequest"|"afterResponse", code, language: "text/javascript"}`.
- `examples` — optional, a relative path to the examples directory, e.g.
  `./.resources/<request-name>.resources/examples/`.

When editing query parameters, update both places they are recorded: the
query string in `url` and the entries in `queryParams`. Their names and values
must match; lint reports a mismatch as `FMT209`. For example, `q=shoes&page=2`
is represented as:

```yaml
url: '{{base_url}}/search?q=shoes&page=2'
queryParams:
  - key: q
    value: shoes
  - key: page
    value: '2'
```

## HTTP example (`*.example.yaml`)

`http-example` requires `$kind` and `response`, and `response` requires `body`:

```yaml
$kind: http-example
name: 200 OK
request:
  method: POST
  url: https://api.example.com/orders
  headers:
    - key: Content-Type
      value: application/json
  body:
    type: json
    content: '{"sku":"A1"}'
response:
  statusCode: 200
  statusText: OK
  headers:
    - key: Content-Type
      value: application/json
  body:
    type: json
    content: '{"id":"o_1"}'
order: 1000
```

For a saved `204 No Content` example, the YAML schema still requires a
`response.body` object. Represent the absence of response content with
`body: {type: text, content: ''}`. This describes the saved example file;
it does not add content to the HTTP response.

Response `body.type` accepts only `text`, `json`, `xml`, `html`, `javascript`
and `yaml`. For a form-encoded response, use `type: text` with a
matching `Content-Type` header. Request bodies do have `urlencoded`.

Saved examples feed **ai-readiness**, documentation, and mocks; a structurally
valid example still needs to agree with the contract.

## Environments (`postman/environments/*.environment.yaml`)

Environment files are v3 YAML but are not collection entities: they do not use
`$kind`. Before creating or editing one by hand, read
[reference/environment.md](environment.md) for the schema, secret
handling, CLI-first edit commands, and a linted example.

## Auth

`auth` is available on a collection, a folder, a request and an example. It has two
shapes. No auth:

```yaml
auth:
  type: noauth
```

Anything else takes `type` plus `credentials`:

```yaml
auth:
  type: bearer
  credentials:
    - key: token
      value: '{{TOKEN}}'
```

`type` is one of `basic`, `bearer`, `apikey`, `digest`, `oauth1`, `oauth2`, `jwt`,
`awsv4`, `hawk`, `ntlm`, `asap`, `edgegrid`, `azure`, `sasl`, `inherit`. Use `inherit`
to take the parent folder's or collection's auth explicitly; omitting `auth` entirely
does the same thing.

`credentials` keys are the same names the Postman app shows for that auth type —
`username`/`password` for `basic`, `token` for `bearer`, `key`/`value`/`in` for
`apikey`, `accessKey`/`secretKey`/`region`/`service` for `awsv4`. A structurally
valid credential entry does not establish that the server will authenticate it.
`credentials` is an array of `{key, value}` entries.

## Request body

`body` is one shape chosen by `type` — write that branch's keys and nothing else.

```yaml
body: {type: none}
```
```yaml
body:
  type: json          # or text, xml, html, javascript
  content: |-
    {"id": 1}
```
```yaml
body:
  type: urlencoded
  content:
    - key: grant_type
      value: client_credentials
```
```yaml
body:
  type: formdata
  content:
    - key: file
      type: file
      src: ./payload.bin
    - key: note
      type: text
      value: hello
      contentType: text/plain
```
```yaml
body:
  type: file
  content:
    src: ./upload.bin       # an object with src, not a bare path
```

Choose `body.type` to match the payload and contract. JSON `content` is a string;
a block scalar keeps it readable without turning it into a YAML object.
A *response* body inside an example has a narrower type list:
see [HTTP examples](#http-example-exampleyaml).

## Scripts

```yaml
scripts:
  - type: afterResponse
    code: |-
      pm.test('ok', () => pm.response.to.have.status(200));
```

`type` is `beforeRequest` or `afterResponse` on a request, and protocol-prefixed on a
collection or folder (`http:beforeRequest`, `http:afterResponse`,
`graphql:beforeQuery`, `grpc:beforeInvoke`, …). A script entry may also carry
`language`, `packages`, and `requests`. `language` takes exactly one value,
**`text/javascript`** — `language: javascript` is a hard error,
`Invalid input: expected "text/javascript"`. Omitting it is fine.

The v2.1 `event:` field is not the v3 `scripts:` field. A script's `type` also
depends on its scope; moving it between a request and a definition requires checking
the type as well as the code. See the main skill's verification guidance for
checking that the intended script behavior survives the edit.

## YAML rules

YAML parsing and scalar coercion can change a field's meaning before schema
validation. Preserve the type the field expects:

1. Single-quote any value containing `{{variables}}`:
   `url: '{{base_url}}/users'` — never leave it unquoted.
2. Single-quote values containing `: # & * ! [ ] { } > |`, e.g.
   `name: 'Health check: v2'`.
3. Multi-line content (JSON bodies, scripts, queries) uses a `|-` block
   scalar:
   ```yaml
   body:
     type: json
     content: |-
       {
         "name": "example"
       }
   ```
4. Quote strings that resemble booleans/numbers when a string is intended:
   `value: "true"`, `value: "123"`.
5. `order` must be a bare number, never quoted: `order: 1000`.
6. Single-quote file paths and use forward slashes only:
   `examples: './.resources/name.resources/examples'`.

## Naming rules

- `<request-name>` (the filename stem before `.request.yaml`) must not
  contain `/ \ : * ? " < > |` — sanitize to `-`.
- Include `name` in the file only when it differs from `<request-name>`
  (e.g. `name: 'Health/check'` inside `Health-check.request.yaml`, since the
  filename itself can't hold the `/`).
- Filenames must be unique, case-insensitively, per directory.

## Worked example: "bookstore api"

`postman/collections/bookstore api/get all books.request.yaml`
```yaml
$kind: http-request
method: GET
url: '{{base_url}}/books'
order: 1000
```

`postman/collections/bookstore api/get-book-by-id.request.yaml`
```yaml
$kind: http-request
name: 'get book by :id'
method: GET
url: '{{base_url}}/books/:id'
order: 2000
pathVariables:
  - key: id
    value: '1'
```

`postman/collections/bookstore api/add new book.request.yaml`
```yaml
$kind: http-request
method: POST
url: '{{base_url}}/books'
order: 3000
headers:
  - key: Content-Type
    value: application/json
body:
  type: json
  content: |-
    {
      "title": "Example Book",
      "author": "Jane Doe"
    }
```

`postman/collections/bookstore api/.resources/definition.yaml`
```yaml
$kind: collection
name: Bookstore API
variables:
  - key: base_url
    value: 'https://api.bookstore.com/v1'
```

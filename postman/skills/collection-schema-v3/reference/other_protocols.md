# Other protocol schemas

Consult the section for the request kind being changed. Non-HTTP protocols have
different body, script, and settings shapes; structural validity does not establish
that the configured service or provider is available.

Shared [auth](http.md#auth), [body](http.md#request-body), and
[script](http.md#scripts) shapes are documented with HTTP where they apply.

- [Request kinds](#request-kinds): GraphQL, gRPC, WebSocket, Socket.IO, MQTT, MCP, LLM
- [Messages](#messages) and [examples](#examples)

## Request kinds

`$kind` is required on these request kinds, and it is the *only* required field except on
`mcp-request`, which also requires `transport`. So for every other kind a half-written
request can pass structural checks without being executable. Only `*.request.yaml`
files are discovered as requests; the right fields in a differently named file
do not make it runnable. Each kind has its own settings; HTTP settings do not
apply to every protocol. Common metadata fields `id`, `name`, `description` and `order`
are available on all of them and omitted below.

### `graphql-request`

`url`, `query`, `variables` (a **string** of JSON), `headers`, `auth`, `schema`,
`scripts`, `examples`, `settings`.

There is **no `queryParams`** — put query-string parameters in the `url`.

`settings`: `disabledSystemHeaders`.

`schema` is one shape chosen by `source`:

```yaml
schema: {source: none}
```
```yaml
schema: {source: auto}
```
```yaml
schema:
  source: file
  location: ./schema.graphql
```
```yaml
schema:
  source: api
  apiId: <id>
  versionId: <id>          # releaseId optional
```
```yaml
schema:
  source: specification
  specificationId: <id>
```

### `grpc-request`

`url`, `methodPath` (e.g. `helloworld.Greeter/SayHello`), `methodDescriptor` (an inline
proto definition), `message` (`{content}`), `metadata` (per-call headers as
`{key, value}` array entries), `auth`, `schema`, `scripts`, `examples`, `settings`.

`settings`: `secureConnection`, `strictSSL`, `serverNameOverride`,
`maxResponseMessageSize`, `includeDefaultFields`, `connectionTimeout`.

### `websocket-request`

`url`, `headers`, `queryParams`, `messages`, `examples`, `settings`.

`messages` and `examples` are **strings** — relative paths to directories, not arrays.
An array fails with `Invalid input: expected string, received array`.

`settings`: `handshakeTimeout`, `retryCount`, `maxPayload`, `retryDelay`, `strictSSL`.

### `socket.io-request`

`url`, `headers`, `queryParams`, `events`, `messages`, `examples`, `settings`.

```yaml
events:
  - name: chat:message
    subscribeOnConnect: true
    description: Inbound chat traffic
```

`settings`: `version` (the **strings** `'2'`, `'3'`, `'4'`), `path`,
`handshakeTimeout`, `retryCount`, `retryDelay`, `strictSSL`. Bare `version: 4` is
rejected — `Invalid option: expected one of "2"|"3"|"4" (path: /settings/version)`.

### `mqtt-request`

`url`, `clientId`, `version`, `topics`, `lastWill`, `properties`, `auth`, `messages`,
`examples`, `settings`.

`version` is a **number**, either `4` or `5`, and it sits at the top level rather than
in `settings`. Do not quote it — that is the opposite of `socket.io-request`, whose
`settings.version` is the string `'2'`, `'3'` or `'4'`.

```yaml
topics:
  - name: sensors/+/temp
    qos: 1                 # a number: 0, 1 or 2
    subscribe: true
lastWill:
  topic: status/client
  payload: offline
  type: text
  qos: 0
  retain: true
```

`properties`: `sessionExpiryInterval`, `receiveMaximum`, `maximumPacketSize`,
`requestResponseInformation`, `userProperties`.

`settings`: `cleanSession`, `keepAlive`, `autoReconnect`, `connectionTimeout`,
`strictSSL`.

### `mcp-request`

Requires `$kind` **and** `transport`, which selects the legal keys. Common to both:
`message`, `auth`.

| `transport` | Its keys | `settings` |
|---|---|---|
| `stdio` | `command`, `env` (`{key, value}` array entries) | `version`, `requestTimeout` |
| `sse` | `url`, `headers` | `version`, `requestTimeout`, `strictSSL`, `sessionTimeout` |

There are no other transports. `message` is a JSON-RPC envelope as a **string**;
`{{variables}}` interpolate inside it.

```yaml
$kind: mcp-request
transport: stdio           # command + env; no url
command: uvx some-mcp-server
env:
  - key: API_KEY
    value: '{{KEY}}'
message: |-
  {"method": "tools/call", "params": {"name": "do_thing", "arguments": {}}}
order: 1000
```

```yaml
$kind: mcp-request
transport: sse             # url + headers; no command
url: https://mcp.example.com/sse
headers:
  - key: Authorization
    value: 'Bearer {{KEY}}'
message: |-
  {"method": "tools/list"}
```

### `llm-request`

`url`, `config`, `userPrompts`, `systemPrompts`, `mcpConfig`, `enabledTools`,
`clientTools`, `auth`, `settings`.

`config` takes `model` and `provider`, both free-form strings. Schema validation
does not establish that the configured provider or model is available at run time.

Prompt entries are `{id, value, timestamp, active, contentType}`. The content
format is expressed by `contentType`; `type` is not a prompt-entry field.
`timestamp` is numeric, and `active` is boolean.

`mcpConfig` is a **string containing a JSON array**, not nested YAML and not
`mcp.json`'s `mcpServers` object. `clientTools`, for tools the model may call with no
MCP server behind them, is `[{id, tools: [{id}]}]`.

For example, a prompt and a stdio MCP tool configuration use different scalar
shapes within the same request:

```yaml
userPrompts:
  - id: '1'
    value: Summarise the last 10 orders
    timestamp: 1758412800000
    active: true
    contentType: text
mcpConfig: |-
  [
    {
      "name": "orders",
      "config": {"command": "uvx", "args": ["orders-mcp-server"]},
      "enabled": true,
      "disabledTools": []
    }
  ]
```

`settings`: `temperature`, `maxToken`, `maxSteps`, `topP`, `topK`, `seed`,
`presencePenalty`, `frequencyPenalty`, `repetitionPenalty`, `contextWindow`,
`streamResponse`, `streamTools`, `responseFormatJSON`. If a tool chain stops early,
distinguish a step limit from a tool or provider failure before changing `maxSteps`;
the limit also bounds execution cost and duration.

## Messages

A `messages` directory holds `*.message.yaml` files. Each kind has different required
fields; a valid WebSocket message is not automatically a valid MQTT message.

```yaml
$kind: websocket-message      # requires content + contentType
content: '{"op":"subscribe"}'
contentType: json             # text | json | xml | html | hex | base64
```

```yaml
$kind: socket.io-message      # requires eventName + args
eventName: chat:message
acknowledgement: true
args:
  - content: '{"text":"hi"}'
    contentType: json
```

```yaml
$kind: mqtt-message           # requires content + contentType + topic
topic: sensors/1/temp
content: '21.5'
contentType: text             # text | json | hex | base64
qos: 1
retain: false
```

## Examples

Examples live in `.resources/<request-name>.resources/examples/*.example.yaml`, with
`$kind` matching the request's protocol — `graphql-example`,
`grpc-example`, `websocket-example`, `socket.io-example`, `mqtt-example`. An
`*-example` kind is rejected in a `*.request.yaml`, and a `*-request` kind is rejected
in a `*.example.yaml`.

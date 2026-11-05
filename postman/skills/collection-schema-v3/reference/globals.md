# Globals

A globals file is named `<name>.globals.yaml` under `postman/globals/`.
It has no `$kind` discriminator.

## Fields

- `name` — required string, conventionally `Globals`.
- `values` — required array; `values: []` represents no globals.
- Each value has:
  - `key` — required variable name.
  - `value` — required string. Quote numeric- or boolean-looking strings
    and `{{variables}}` so YAML preserves their type.
  - `enabled` — boolean.
  - `type` — optional string: `default` or `secret`.
  - `secret` — optional boolean; `secret: true` alongside `type: default`
    also marks a secret.
  - `description` — optional string.

## Example

```yaml
name: Globals
values:
  - key: base_url
    value: 'https://api.example.com'
    enabled: true
    type: default
  - key: api_token
    value: ''
    enabled: false
    type: secret
```

Marking a value as secret does not make a literal credential safe to commit.
Keep reusable examples free of credentials; see **variables** for secret sources.

Validate with `postman globals lint <file>`. This checks structure, not whether
requests resolve the intended values; check scope and overrides when diagnosing
unexpected runtime values.

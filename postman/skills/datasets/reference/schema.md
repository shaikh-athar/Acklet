# Dataset YAML

Consult this reference when inspecting or repairing manifest fields. Source and
view commands can supply generated IDs when creating new entries.

```
postman/datasets/users/
├── users.dataset.yaml
└── .resources/
    └── rows.json
```

```yaml
type: dataset                 # not $kind
name: "Users"
id: 3f2b6c1e-9d4a-4f81-bc37-5e0a71d9c402     # uuid4
data_dir: .resources
sources:
  - from: embedded_datasource
    datasource:
      name: Records
      id: 8a1d0e77-5c62-4b19-9f03-2d6e4a8b7c15
      format: json            # this example uses a JSON file
      source_type: static     # static for files, dynamic for databases
      location:
        type: local_filesystem
        value: rows.json      # relative to data_dir
views:
  - from: embedded_view
    view:
      name: Records_default_view
      id: c94e5b20-71af-4d36-8e52-0b7c6d1934fa
      query: SELECT id, name FROM Records ORDER BY id
```

`sources` and `views` are optional — `type`, `name`, `id` and `data_dir` alone is a
valid dataset, and is what `postman dataset create <path> --name X` writes.

For example, a MySQL source sets `format: mysql`, `source_type: dynamic`,
`ingest: false`, a `dsKey` and a `slug`, with `location.type: mysql`, `location.value`
a DSN and `location.table` the table name.

A view's `query` is SQL over the source `name`, not over the file name.

There is no `dataset lint`. `postman dataset get <path>` checks the structure offline.
`postman dataset query <path> -q "<sql>"` runs SQL against the source, which also proves
the data parses and the query resolves — note the `-q` flag is required.

Connector support and credential handling depend on the installed CLI. Use the
**datasets** skill's connector and credential guidance when changing a source;
the MySQL example above is not a complete list of supported connectors.

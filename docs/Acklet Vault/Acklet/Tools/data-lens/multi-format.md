# DataLens — Multi-Format Structured Data Workbench Architecture

## 1. Architectural Overview & Philosophy

DataLens operates as a **Multi-Format Structured Data Workbench** rather than a single-format JSON tool.

The engine decouples **document formats**, **format capabilities**, and **workbench operations**:

```text
                                DataLens Workbench
                                        │
                                        ▼
                              Structured Data Engine
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
             Format Registry     Document Pipeline   Conversion Matrix
                    │                   │                   │
                    ▼                   ▼                   ▼
              • JSON              • Source Editor     • JSON ↔ YAML
              • YAML              • AST Inspector     • JSON ↔ XML
              • XML               • Local History     • JSON ↔ CSV
              • CSV               • Diff Visualizer   • JSON ↔ TOML
              • TOML              • Graph Canvas      • JSON ↔ cURL
              • cURL              • Code Generator    • Stringify / Unescape
```

---

## 2. Format Capability Matrix

Each format declares its supported capabilities via [FormatRegistryService](file:///Users/ayaz/Acklet/client/src/tools/data-lens/services/format-registry.service.ts):

| Format | Extensions | Category | Parse | Format | Minify | Sort Keys | Tree | Table | Graph | Stats | Diff | CodeGen |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **JSON** | `.json` | Structured Data | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **YAML** | `.yaml`, `.yml` | Structured Data | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **XML** | `.xml`, `.rss`, `.svg` | Structured Data | ✓ | ✓ | ✓ | — | ✓ | — | ✓ | ✓ | ✓ | — |
| **CSV** | `.csv` | Tabular Data | ✓ | ✓ | — | — | — | ✓ | — | ✓ | ✓ | — |
| **TOML** | `.toml` | Configuration | ✓ | ✓ | — | ✓ | ✓ | — | — | ✓ | ✓ | ✓ |
| **cURL** | `.sh`, Raw | API Script | ✓ | — | — | — | ✓ | ✓ | ✓ | ✓ | — | ✓ |

---

## 3. Bidirectional Conversion & Lossiness Analysis

DataLens provides bidirectional conversion between all registered structured formats:

```text
               ┌──────────┐
      ┌───────▶│   JSON   │◀───────┐
      │        └────┬─────┘        │
      ▼             │              ▼
 ┌─────────┐        │         ┌─────────┐
 │  YAML   │◀───────┼────────▶│   XML   │
 └─────────┘        │         └─────────┘
      ▲             ▼              ▲
      │        ┌─────────┐         │
      └───────▶│   CSV   │◀────────┘
               └─────────┘
```

### 3.1 Lossiness Detection
- **JSON → CSV**: If a JSON document contains nested objects or uneven array schemas, DataLens warns the user of lossy serialization (`Lossy Conversion Notice`) and automatically flattens keypaths (e.g. `user.address.city`).
- **XML ↔ JSON**: Preserves XML attributes by mapping attributes into `@attributes` objects and child text nodes into `#text`.
- **cURL Extraction**: Parses `-d`, `--data`, `--data-raw`, `-H "Content-Type: application/json"` flags to extract clean payload bodies.

---

## 4. Multi-Format Payload Extractors

DataLens automatically extracts JSON/structured payloads from non-standard developer formats:
1. **cURL Commands**: Strips command headers and extracts body payloads.
2. **HTTP Transcripts**: Extracts JSON/XML bodies from raw HTTP request/response headers.
3. **HAR (HTTP Archive) Files**: Extracts request/response postData bodies.
4. **JavaScript `fetch()`**: Ingests code snippets and extracts JSON payloads passed into `JSON.stringify(...)`.

---

## 5. Related Documentation

- Master Overview: [README.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/data-lens/README.md)
- Feature Audit Matrix: [feature.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/data-lens/feature.md)
- Complete Product Specification: [description.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/data-lens/description.md)
- UI Guidelines & Tokens: [UI_REFERENCE.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/data-lens/UI_REFERENCE.md)
- Visual Semantics & Action Legend: [LEGEND.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/data-lens/LEGEND.md)
- Platform Tools Catalog: [Tools Hub](../README.md)

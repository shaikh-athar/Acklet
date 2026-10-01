# DataLens — End-to-End Product Specification & Architecture

## 1. Product Vision & Architecture

### 1.1 Brand Positioning
**DataLens by Acklet** is a multi-format structured data workbench engineered for developers who frequently work with API responses, configuration files, logs, payloads, SDK responses, and deeply nested data structures.

- **Primary Motto**: *Format. Validate. Inspect. Understand Structured Data.*
- **Core Value Proposition**: Transform raw, messy, or minified structured payloads (JSON, YAML, XML, CSV, TOML, cURL) into high-clarity developer visualizers with instant AST error recovery, code generation, structural diffing, and zero server transmission.

```text
                                +-----------------------------------+
                                |         Input Ingestion           |
                                |  Paste / Drop / Upload / Sample   |
                                +-----------------+-----------------+
                                                  |
                                                  v
                                +-----------------------------------+
                                |    Format Registry & Detection    |
                                |   JSON · YAML · XML · CSV · TOML  |
                                +-----------------+-----------------+
                                                  |
                                                  v
                                +-----------------------------------+
                                |     AST Parsing & Validation      |
                                |  (300ms Debounce / Web Workers)   |
                                +--------+-----------------+--------+
                                         |                 |
                   +---------------------+                 +---------------------+
                   |                                                             |
                   v                                                             v
+------------------------------------+                         +------------------------------------+
|         Valid AST Payload          |                         |            Syntax Error            |
+------------------+-----------------+                         +------------------+-----------------+
                   |                                                              |
                   v                                                              v
+------------------------------------+                         +------------------------------------+
|          Inspector Suite           |                         |         Error Diagnostics          |
|  • Code / Formatted Output         |                         |  • Line X · Column Y Pointer       |
|  • Collapsible AST Tree            |                         |  • Code Context Snippet            |
|  • Tabular Schema Grid             |                         |  • 1-Click "Go to Error" Jump      |
|  • Interactive Node Graph          |                         |  • Smart Auto-Repair Engine        |
|  • 12-Metric Stats Dashboard       |                         +------------------------------------+
|  • Multi-Language Code Generator   |
|  • Split / Unified Diff Engine     |
+------------------------------------+
```

---

## 2. Core User Workflows

### 2.1 Single-Screen Workflow
DataLens eliminates multi-step wizards and forced sign-ins:
1. **Entry**: User pastes raw text, drops a file (`.json`, `.yaml`, `.xml`, `.csv`, `.toml`), or clicks a sample payload pill (`API Response`, `Nested Object`, `Large Array`, `Configuration`).
2. **Detection & Validation**: Format is auto-detected or manually chosen. 300ms debounced parsing validates syntax.
3. **Exploration**: User switches instantly between `Formatted`, `Tree`, `Table`, `Graph`, `Stats`, and `CodeGen` views.
4. **Action**: User formats, minifies, copies, exports (CSV, HTML, SVG, PNG, JSON), or shares state URLs.

### 2.2 Error Recovery & Smart Repair
When syntax errors occur (e.g. trailing commas, unquoted keys, single quotes):
- **Diagnostic Panel**: Displays exact `Line X · Column Y`, visual code excerpt, and actionable explanation.
- **Go To Error**: Repositions the editor caret and scrolls directly to the problematic line.
- **Smart Repair**: Evaluates common developer syntax mistakes and provides a non-destructive repair with 1-click apply.

---

## 3. Detailed Component Breakdown

### 3.1 Document Editor (`JsonLensEditorComponent`)
- **Gutter & Line Numbers**: High-precision line index column synchronized with editor scrolling.
- **Word Wrap**: Toggle between horizontal scroll and soft word wrapping.
- **Font Size Customizer**: Configurable sizing from 11px to 18px with automatic line-height calculation.
- **Synchronized Scroll**: Locks or unlocks scroll position matching between input editor and output views.

### 3.2 Inspector Suite (`JsonLensInspectorComponent`)
- **Formatted View**: Syntax highlighted viewer with integrated format switcher (`JSON`, `Stringified JSON`, `YAML`, `XML`, `TOML`, `cURL`, `CSV`).
- **Tree View**: Collapsible AST hierarchy with depth levels, property counters, recursive expand/collapse, search highlighting, and right-click Context Menu (`Copy Value`, `Copy JSON`, `Copy JSONPath`, `Copy Key`).
- **Table View**: Flattens homogeneous arrays of objects into sortable columns with pagination/scroll, search filter, and instant exports to CSV, HTML Table, or JSON.
- **Graph Visualizer**: Interactive hierarchical node canvas featuring pan, zoom, recursive node expansion, row-level socket connections, JSONPath tracking, and SVG/PNG export.
- **Stats Dashboard**: 12 metrics calculating Byte Size, Minified Size, Whitespace Overhead, Key Count, Array Count, Object Count, String Count, Number Count, Boolean Count, Null Count, Max Depth, and Line Count.
- **Code Generator**: Generates type-safe data models for **TypeScript**, **Python**, **Go**, **Java**, **C#**, **Rust**, **Kotlin**, **Swift**, and **JSON Schema**.

### 3.3 Advanced Diffing Engine (`JsonLensDiffComponent` & `DataLensDiffService`)
- **Comparison Modes**: Side-by-side aligned split grid and unified inline diff viewer.
- **Word-Level Tokenization**: Highlighting of character-level edits within modified lines.
- **Structural AST Diffing**: Deep traversal comparing keys, array indexes, additions, removals, and value modifications with JSONPath mapping.
- **Fine-Grained Options**:
  - `Ignore Key Order`: Normalize object key ordering before comparison.
  - `Ignore Array Order`: Sort primitive/object arrays.
  - `Array Match Key`: Key identifier (e.g. `id`, `uuid`, `key`) for matching array objects.
  - `Numeric Tolerance`: Compare floating point values within customizable delta tolerances.
  - `Mask Sensitive Data`: Automatically masks tokens matching password, token, authorization, and secret patterns.

### 3.4 Local History Drawer (`JsonLensHistoryDrawerComponent`)
- **IndexedDB Engine**: Stores full payload snapshots locally with auto-generated titles, timestamps, byte sizes, and format tags.
- **Date Grouping**: Grouped chronologically into `Today`, `Yesterday`, and `Older`.
- **Search & Restore**: Real-time history search with 1-click restoration into the editor.
- **Privacy & Purge**: Complete 1-click purge button ensuring zero residual data.

---

## 4. Privacy & Security Guarantees

1. **100% In-Browser Computation**: All formatting, validation, parsing, tree transformations, stats computations, and code generation execute entirely inside the client's browser JavaScript engine.
2. **Zero Backend API Calls**: No payload content or snippet is ever transmitted to remote servers.
3. **Client-Side Share State**: Shared URLs use base64/URL compression directly in the hash fragment or local storage references without remote database persistence.

---

## 5. Related Documentation

- Master Overview: [README.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/data-lens/README.md)
- Feature Audit Matrix: [feature.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/data-lens/feature.md)
- Multi-Format Workbench Guide: [multi-format.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/data-lens/multi-format.md)
- Canonical UI Reference: [UI_REFERENCE.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/data-lens/UI_REFERENCE.md)
- Visual Semantics & Action Legend: [LEGEND.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/data-lens/LEGEND.md)
- Platform Tools Catalog: [Tools Hub](../README.md)

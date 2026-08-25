# DataLens — Complete End-to-End Specification & Technical Architecture

## 1. Executive Summary & Vision

**DataLens by Acklet** is a multi-format structured data workbench engineered for inspecting, validating, transforming, comparing, generating type contracts from, and visualizing data structures. 

Originally conceived as a JSON formatter, DataLens has evolved into a structured data workbench supporting **JSON, YAML, XML, CSV, TOML, and cURL** payloads with zero server transmission, guaranteeing 100% in-browser client-side privacy.

```text
                                  DATALENS WORKBENCH
                                           │
         ┌─────────────────────────────────┴─────────────────────────────────┐
         │                                                                   │
   INGESTION & PARSING                                              INSPECTION & VISUALIZATION
   • JSON, YAML, XML, CSV, TOML, cURL                               • Formatted Code (Multi-Format Switcher)
   • cURL, HAR, fetch() Extraction                                  • Collapsible AST Tree with Context Menu
   • Drag-and-Drop & File Upload                                    • Flattened & Nested Table with HTML/CSV Export
   • Auto-Repair (Trailing commas, unquoted keys)                   • Interactive Pan & Zoom Graph Visualizer
   • 300ms Debounced AST Validation                                 • In-depth 12-Metric Stats Dashboard
                                                                    • Multi-Language Code Generator
                                                                    • Side-by-Side & Unified Diff Visualizer
```

---

## 2. Core Documentation Index

Explore the specialized documentation modules for DataLens:

| Document | Description | Relative Path |
| :--- | :--- | :--- |
| **Feature Audit Matrix** | Full status audit across all 72+ product specifications & capabilities. | [feature.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/data-lens/feature.md) |
| **Comprehensive Specification** | In-depth architectural design, UX principles, state flow, and edge cases. | [description.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/data-lens/description.md) |
| **Multi-Format Workbench Guide** | Deep dive into YAML, XML, CSV, TOML, cURL, and bidirectional converters. | [multi-format.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/data-lens/multi-format.md) |
| **UI Reference & Design System** | Scoped tokens, themes, typography, layout grid, and component hierarchy. | [UI_REFERENCE.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/data-lens/UI_REFERENCE.md) |
| **Visual Semantics & Legend** | UI action hierarchy, status indicators, badges, and AST color mappings. | [LEGEND.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/data-lens/LEGEND.md) |
| **Tools Root Catalog** | Master catalog for all tools built within Acklet. | [Tools Overview](../README.md) |

---

## 3. Key Feature Highlights & Architecture

### 3.1 Multi-Format Document Pipeline
DataLens automatically detects and manages heterogeneous document formats:
- **Native Formats**: JSON (`.json`), YAML (`.yaml`, `.yml`), XML (`.xml`, `.rss`, `.svg`), CSV (`.csv`), TOML (`.toml`), cURL command scripts (`.sh`).
- **Bidirectional Format Conversion**: Convert cleanly between any pair of supported formats with lossiness warnings when converting complex hierarchical objects into flat CSV.
- **Developer Payload Extractors**: Ingest raw cURL commands (`-d`/`--data`), HTTP request/response text transcripts, HAR network archives, and JavaScript `fetch()` snippets.

### 3.2 Inspector Suite & Visualizers
- **Formatted View**: Syntax highlighted output with live format switching (`JSON`, `Stringified JSON`, `YAML`, `XML`, `TOML`, `cURL`, `CSV`), word wrapping, and search highlights.
- **Tree View**: Virtualized collapsible AST nodes, instant recursive expand/collapse, live filtering, and right-click Context Menu (`Copy Value`, `Copy JSON`, `Copy JSONPath`, `Copy Key`).
- **Table View**: Dynamic schema flattener converting arrays of objects into sortable, filterable tabular columns with CSV, HTML, and JSON export buttons.
- **Graph Visualizer**: Interactive hierarchical node canvas featuring pan, zoom, expand/collapse subtrees, JSONPath tracking, and SVG/PNG image export.
- **Stats Dashboard**: 12 critical metrics (Byte Size, Minified Size, Whitespace Overhead, Key Count, Array Count, Object Count, String Count, Number Count, Boolean Count, Null Count, Max Depth, Line Count) plus duplicate key detection.
- **Code Generator**: Automatic generation of type contracts and data models for **TypeScript** (Interface/Type), **Python** (TypedDict/Pydantic), **Go** (Struct with JSON tags), **Java** (POJO/Record), **C#** (Class with System.Text.Json attributes), **Rust** (Serde struct), **Kotlin** (Data Class), **Swift** (Codable Struct), and **JSON Schema**.

### 3.3 Advanced Diffing Engine
- **Split & Unified Modes**: Side-by-side aligned line comparison or single-pane unified diff view.
- **Word-Level Tokenization**: Granular inline token highlight of intra-line character changes.
- **Structural AST Diff**: Computes added, removed, modified, and moved nodes with JSONPath annotations.
- **Comparison Options**: Ignore key ordering, ignore array ordering, array matching key identifier (e.g. `id`), case-insensitive matching, whitespace tolerance, numeric tolerance, and sensitive data masking.

### 3.4 Local Privacy & Persistence
- **Zero Remote Storage**: All parsing, AST traversals, conversions, and queries occur directly in the browser's JavaScript runtime engine.
- **IndexedDB Local History**: Automatic snapshot history grouped by date (`Today`, `Yesterday`, `Older`) with search, restore, and 1-click wipe controls.
- **Client-Side Share**: Encoded state URL sharing with optional TTL expiry configuration and warning badges.

---

## 4. Keyboard Shortcuts Matrix

| Action | macOS Shortcut | Windows / Linux Shortcut |
| :--- | :--- | :--- |
| **Format Payload** | `Cmd + Enter` | `Ctrl + Enter` |
| **Minify Payload** | `Cmd + Shift + M` | `Ctrl + Shift + M` |
| **Command Palette** | `Cmd + K` | `Ctrl + K` |
| **Search in Inspector** | `Cmd + F` | `Ctrl + F` |
| **Download Output** | `Cmd + S` | `Ctrl + S` |
| **Copy Output** | `Cmd + Shift + C` | `Ctrl + Shift + C` |
| **Toggle Fullscreen** | `F11` / Custom | `F11` / Custom |
| **Dismiss Modals & Drawers** | `Esc` | `Esc` |

---

## 5. Technical Stack & Component Mapping

- **Framework**: Angular (Standalone Components, Signals, OnPush Change Detection).
- **Styling**: Scoped CSS with CSS Custom Properties, Tailwind CSS v4.
- **Icons**: Lucide Icons (`@lucide/angular`).
- **Parsing Libraries**: `yaml` (v2), custom browser DOMParser (XML), custom PapaParse/CSV streaming engine, custom TOML tokenizer.

### File Hierarchy
```text
client/src/tools/data-lens/
├── data-lens.component.ts               # Main container orchestrator & state signals
├── data-lens.component.html             # High-level workspace layout grid
├── data-lens.component.css              # Scoped design tokens, themes & responsive breakpoints
├── components/
│   ├── data-lens-toolbar.component.ts   # Level 2 document & transformation action bar
│   ├── data-lens-editor.component.ts    # Monaco-style source editor with line gutter
│   ├── data-lens-inspector.component.ts # Level 3 contextual tab suite (Code, Tree, Table, Graph, Stats, CodeGen)
│   ├── data-lens-diff.component.ts      # Advanced split/unified side-by-side diff visualizer
│   ├── data-lens-error-panel.component.ts # AST error diagnostic & line jump banner
│   ├── data-lens-history-drawer.component.ts # IndexedDB local history browser drawer
│   ├── data-lens-settings-drawer.component.ts # Preference configuration drawer
│   ├── data-lens-command-palette.component.ts # Cmd+K quick execution modal
│   ├── data-lens-share-modal.component.ts # Client-side payload URL generator
│   ├── data-lens-privacy-modal.component.ts # Interactive client-side security explainer
│   ├── data-lens-drag-overlay.component.ts # Drag-and-drop backdrop visualizer
│   ├── data-lens-toast-container.component.ts # Action notification toast queue
│   ├── data-lens-seo-footer.component.ts # Non-intrusive bottom technical guide & SEO
│   └── inspector-empty-state.component.ts # Contextual empty fallback states
└── services/
    ├── data-lens.service.ts             # Core AST parser, formatters, stats, converters & graph builder
    ├── data-lens-diff.service.ts        # Word/line tokenization, structural diff & hunk builder
    ├── data-lens-history.service.ts     # IndexedDB persistence & snapshot retention manager
    ├── format-registry.service.ts       # Format registry & capability declaration provider
    └── format-operations.service.ts     # Format operations pipeline coordinator
```

---

## 6. Related Documents

- Master Feature Audit: [feature.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/data-lens/feature.md)
- Complete Product Specification: [description.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/data-lens/description.md)
- Multi-Format Workbench Architecture: [multi-format.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/data-lens/multi-format.md)
- Design System & UI Tokens: [UI_REFERENCE.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/data-lens/UI_REFERENCE.md)
- Action & Semantics Legend: [LEGEND.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/data-lens/LEGEND.md)

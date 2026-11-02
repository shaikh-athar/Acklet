# Barcode Generator — Technical Specification

## 1. Tool Identity & Overview
- **Name**: Barcode Generator
- **Subdomain**: `barcode.localhost:4300` (Local) / `barcode.acklet.com` (Production)
- **Slug**: `barcode` (alias: `barcode-generator`)
- **Category**: Utilities (`utilities`)
- **Accent Color**: Sapphire Blue (`#2563EB` in light mode, `#3B82F6` in dark mode, hue 217)
- **Primary Typography**: [Manrope](https://fonts.google.com/specimen/Manrope) scoped to tool container; OCR-B / Monospace for human-readable barcode numbers.
- **Icon**: `barcode` (Lucide / Spartan with hover motion).
- **Execution Mode**: 100% Client-Side. No telemetry, no external network calls, zero server storage.

---

## 2. Architecture & Shell Integration
The Barcode Generator follows the canonical Acklet standalone tool architecture:
- Mounts directly into `@acklet/tool-shell` via `<ts-shell [tool]="manifest" [config]="shellConfig">`.
- Registered in the centralized `@acklet/tool-registry` under [`tools.manifest.ts`](../../../../client/packages/tool-registry/src/tools.manifest.ts) and [`barcode.manifest.ts`](../../../../client/packages/tool-registry/src/manifests/barcode.manifest.ts).
- Top navigation tabs: `Tool`, `About`, `How to use`, `FAQ`, and `Related`, with scroll-spy synchronization.
- Theme tokens strictly scoped to `[data-tool="barcode"]` through `ToolThemeProviderService`, preventing CSS leakage to other tools.
- Focus rings standardized via `--ts-focus-ring: 2px solid var(--tool-accent, #2563EB)` with `2px` offset.

---

## 3. Page Layout & Responsive Behavior

### 3.1 Workspace Structure
The application provides two complementary operational modes across three primary control tabs:
- **Left Control Card**:
  - **Content Tab (Single Mode)**: Barcode name input, searchable format selector, value input with live character counter, format-specific option disclosures (check digits, bearer bars, start/stop guards), format auto-detection chips, and "Make QR" recommendation banner.
  - **Customize Tab (Design Studio)**: Size presets (Small 80%, Standard 100%, Large 150%), physical dimensions (mm/in, DPI), optical contrast checker ($> 3:1$ threshold), human-readable text toggles, caption typography, quiet zone slider, and rotation controls.
  - **Bulk Tab (Batch Mode)**: 5-stage progressive flow (Source, Format, Data, Review, Output). List and CSV upload with full-screen drag-and-drop gather overlay, column mapping with live role badges, 10-row paginated review table, layout presets (Avery, Herma, Zebra, Dymo) and custom sheet/roll editor, isolated iframe printing, and generate-gated execution.
- **Right Preview Card**:
  - Single Mode Preview: Paper stage with quiet zone, single-shot laser sweep animation on content change, and split export buttons (PNG 300 DPI, SVG, PDF, clipboard copy).
  - Bulk Mode Preview: Single Page Model rendering multi-page label sheets or continuous vertical thermal rolls, layout preset badge, zoom dropdown / segmented buttons, runtime caption styling toolbar, scannability verification badge, and isolated iframe print engine.

### 3.2 Canonical 4-Breakpoint Responsive System
All layout and interaction behaviors strictly follow [`responsive-tokens.ts`](../../../../client/apps/tool-barcode-generator/src/config/responsive-tokens.ts):

| Breakpoint | Viewport Range | Layout Configuration | Specialized Behaviors |
| :--- | :--- | :--- | :--- |
| **`sm`** | `0px – 639px` (Phone portrait) | Single column, full width, 16px side padding | Top tab strip includes dedicated 4th `"Preview"` tab (`['content', 'customize', 'bulk', 'preview']`). Preview and form never display side-by-side. Sticky bottom "Generate" action bar with `env(safe-area-inset-bottom)` padding. Download button label shrinks dynamically to `"Download (N)"`. Zoom collapses into dropdown select. |
| **`md`** | `640px – 1023px` (Phone landscape, small tablet) | Single column stacked | Preview sits directly below the active tab content with a `"Show preview"` / `"Hide preview"` toggle button to allow focused editing. Zoom controls collapse into a compact dropdown select. |
| **`lg`** | `1024px – 1439px` (Laptop, tablet landscape) | Two-column grid | Left control column clamped between `380px` and `520px` (`clamp(380px, 38%, 520px)`). Right preview column fills remaining space, sticky to the top with internal scroll. Action footer pinned to bottom of preview card. High-contrast segmented zoom buttons (`Fit`, `100%`, `150%`). |
| **`xl`** | `1440px+` (Desktop, large monitor) | Two-column centered shell | Workspace shell capped at `max-width: 1600px` and centered horizontally. Preview scales vertically rather than stretching horizontally past readable limits. |

---

## 4. Barcode Engine & Symbology Support
The barcode generation architecture relies on [`RenderService`](../../../../client/apps/tool-barcode-generator/src/services/render.service.ts) as the single source of truth for both single and bulk generation:
- **Unified Pipeline Parity**: Single barcode generation and bulk generation invoke the exact same rendering logic, ensuring byte-identical SVG output, identical bar geometry, quiet zones, and caption typography.
- **Zero External Dependencies for 1D**: Core 1D symbologies encode directly from binary module tables with zero external npm dependencies.
- **31 Symbologies Supported**:
  - Core 1D: Code 128 (auto A/B/C), EAN-13, EAN-8, UPC-A, UPC-E, ISBN, Code 39, Code 93, ITF-14, Interleaved 2 of 5, Codabar.
  - Extended & 2D: Data Matrix, PDF417, Aztec, ISSN, ISMN, GS1 DataBar (7 variants), Code 39 Extended, MSI Plessey, Code 11, Standard 2 of 5, Telepen.
- **Universal GS1 Modulo-10**: Standardized right-to-left alternating weights (3 and 1) unifying EAN, UPC, ISBN, and ITF-14.
- **Silent Background Verification**: Tests generated barcodes against native browser `BarcodeDetector` API and `@zxing/library` to ensure scannability before printing.

---

## 5. Bulk Generation & Label Print Subsystem
- **Deterministic Data Sources**: Text List (pasted rows with automatic spreadsheet delimiter detection) and CSV/TSV file upload. Sequence generator was removed to ensure explicit, verifiable batch data.
- **Full-Screen Drag-and-Drop Gather Screen**: Dragging supported tabular files (`.csv`, `.tsv`, `.txt`) anywhere onto the window triggers an animated full-screen translucent drop zone that immediately routes to the Bulk tab, parses the file, and displays the Review table.
- **CSV Data Table UI**: Structured preview matching the Review table layout with sticky `#` row counter column, dynamic role badges (`Value`, `Caption`), and 10-row pagination.
- **Generate-Gated Preview**: Preview shows layout placeholder grids with clean dashed outlines before generation. Clicking "Generate N barcodes" builds the output. Changing settings does not show intrusive warning banners or erase the preview; the generated sheet remains stable until explicit regeneration.
- **Single Page Model Engine (`SheetLayoutService`)**: A single authoritative layout calculator produces `SheetPageModel[]` and `RollLabelModel[]` in millimeters. Live preview, vector PDF, canvas rasterizer, and isolated iframe print engine all consume this exact model.
- **Runtime Caption Styling Toolbar**: Floating toast card anchored to the Bulk Preview toolbar allowing live size (`Auto`, `6–10 pt`), color, font style (`B`, `Mono`, `AA`), and alignment (`L`, `C`, `R`) adjustments. Uses unitless SVG coordinates and bounding box length clamping (`textLength`) to eliminate browser font inflation and prevent label collision without requiring barcode regeneration.
- **Isolated Iframe Printing**: Injects an isolated HTML document into a hidden iframe containing only `.print-page` elements and SVG data with `@page { size: ...; margin: 0; }`, printing labels at exact 100% scale without browser headers, footers, or application UI.

---

## 6. Related Documentation
- Bulk Specification: [bulk-spec.md](./bulk-spec.md)
- Responsive Architecture: [responsive-architecture.md](./responsive-architecture.md)
- Label Templates & Roll Presets: [label-templates.md](./label-templates.md)
- Format Compatibility Matrix: [format-matrix.md](./format-matrix.md)
- Symbology Registry: [format-registry.md](./format-registry.md)
- Security Baseline: [security.md](./security.md)
- Test Vectors: [test-vectors.md](./test-vectors.md)
- Changelog: [changelog.md](./changelog.md)

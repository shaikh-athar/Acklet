# Barcode Generator — Feature Specifications

This document defines the complete functional features, acceptance criteria, and scope boundaries for the Acklet Barcode Generator.

---

## 1. Feature Overview

The Barcode Generator provides professional, standards-compliant 1D and 2D barcode generation directly inside the client browser. It supports both interactive single barcode creation and high-throughput bulk batch generation across multi-page label sheets and thermal label rolls.

---

## 2. Implemented Features (Phase 1 & Phase 2 Production Ready)

### 2.1 Symbologies Supported (31 Formats)
- **Core 1D Symbologies**:
  - **Code 128 (Default)**: Full ASCII (1–80 chars) with automatic subset A/B/C switching and Modulo-103 check digit.
  - **EAN-13 (GTIN-13)**: 12 or 13 digits. 12 digits auto-completes the GS1 Mod-10 check digit; 13 digits validates it.
  - **EAN-8**: 7 or 8 digits with automatic Mod-10 check digit calculation.
  - **UPC-A (GTIN-12)**: 11 or 12 digits with automatic check digit calculation.
  - **UPC-E**: Zero-suppressed 8-digit compact retail format with automatic compression from eligible 12-digit UPC-A codes.
  - **ISBN-13 (Book)**: Book codes starting with 978 or 979, with automatic hyphen stripping and automatic conversion from 10-digit ISBNs.
  - **Code 39**: Alphanumeric (0-9, A-Z, space, `-. $/+%`) with automatic uppercase conversion and optional Modulo-43 check digit toggle.
  - **Code 93**: High-density alphanumeric format with automatic dual C and K check characters.
  - **ITF-14**: 13 or 14 digits with automatic check digit and configurable bearer bars (`none`, `top-bottom`, `box`).
  - **Interleaved 2 of 5 (ITF)**: Paired numeric format; auto-prepends a leading `0` when length is odd with an explanatory message.
  - **Codabar (NW-7)**: Digits and `-$:/.+` with selectable start/stop guard characters (A, B, C, D).
- **Extended & 2D Symbologies**:
  - **Data Matrix (ECC 200)**: High-density 2D matrix format for industrial parts and electronics.
  - **PDF417**: Stacked 2D format for transport passes, boarding cards, and identification documents.
  - **Aztec Code**: High-capacity matrix code for transit and mobile ticketing.
  - **ISSN & ISMN**: Serial publications (8 digits or +2 add-on) and notated music (979-0).
  - **GS1 DataBar**: Omnidirectional, Truncated, Stacked, Stacked Omnidirectional, Limited, Expanded, Expanded Stacked.
  - **Code 39 Extended, MSI Plessey, Code 11, Standard 2 of 5, Telepen**.

### 2.2 Content Panel Features (Single Generation)
- **Barcode Name Input**: Assign and rename barcodes (default: "My Barcode") with instant clear button.
- **Grouped Format Selector**: Searchable dropdown categorizing symbologies into Retail, Logistics, Industrial, Healthcare, and 2D.
- **Inline Validation & Live Counters**: Real-time validation with plain error explanations. Fixed-length formats display dynamic character counters (e.g. `12 / 13 digits`).
- **Smart Suggestion Chips**:
  - Auto-detection chip suggests matching formats (e.g., 13 digits suggests EAN-13, 12 digits suggests UPC-A).
  - URL detection chip: Displays *"This content works better as a QR code"* with a direct `Make QR` link that pre-fills and generates the QR code in the QR Generator.

### 2.3 Customize Panel Features (Design Studio)
- **Size Presets**: Small (80% / 0.8x), Standard (100% / 1.0x), Large (150% / 1.5x) mapping to GS1 magnification standards for retail formats.
- **Advanced Dimensions**: Physical width, height, unit selection (mm or inch), and target print resolution (default 300 DPI).
- **Color Customization**: Independent bar color and background color controls with real-time optical contrast checking ($> 3:1$ threshold). Flags inverted schemes that standard laser scanners cannot read. Transparent background option for PNG and SVG.
- **Human-Readable Text**: Toggle text visibility, adjust font size, bold weight, and standard digit grouping for EAN/UPC (e.g. `4 006381 333931`).
- **Caption Designer**: Add product or asset title text above or below the barcode with custom font family, size, and styling.
- **Quiet Zone Controls**: Automatic minimum quiet zone per specification with manual expansion slider.
- **Rotation**: 0°, 90°, 180°, and 270° orientation.

### 2.4 Live Preview & Single Export Features
- **Empty-First State**: Clean dashed placeholder state before user input matching the Acklet design system.
- **Laser Scan Reveal Animation**: Single-shot sweep animation (0.65s) on content change. Subsequent edits update instantly without animation fatigue.
- **High-Contrast Paper Stage**: Barcodes render on a clean paper surface with quiet zones across both Light and Dark themes.
- **Multi-Format Export**:
  - 300 DPI high-resolution PNG scaled to chosen physical millimeter/inch dimensions.
  - Lossless vector SVG with path outlines.
  - Print-ready vector PDF matching exact physical scale.
  - Direct clipboard image copying.
- **Local History**: Persists last 20 generated barcodes in `localStorage` with fast recall, rename, and deletion.
- **Share Link**: Deep-link URL carrying all format, value, and design parameters.

### 2.5 Bulk Generation & Label Sheet Subsystem (Phase 2)
- **Deterministic Data Sources**:
  - **List Source**: Paste one record per line with automatic spreadsheet delimiter detection (tab, comma, semicolon).
  - **CSV/TSV Upload**: Drag-and-drop file upload supporting `.csv`, `.tsv`, and `.txt` up to 2 MB (up to 500 records).
- **Full-Screen Drag-and-Drop Gather Screen**:
  - Dragging supported files anywhere onto the window triggers an animated full-screen translucent overlay.
  - Dropping the file automatically switches to the Bulk tab, sets CSV mode, parses data, and displays the Review table.
- **CSV Data Table UI**:
  - Structured data table matching the Review step layout with sticky `#` row counter column.
  - Column role badges (`Value` pill for mapped barcode column, `Caption` pill for label text).
  - 10-row pagination with Previous / Next navigation and row range summary.
- **Unified Rendering Pipeline Parity**:
  - Bulk generation invokes the identical [`RenderService`](../../../../client/apps/tool-barcode-generator/src/services/render.service.ts) used by single generation.
  - Output is byte-identical in bar geometry, colors, quiet zones, and caption typography.
- **Generate-Gated Preview**:
  - Layout placeholder grids with empty dashed slots before generation.
  - Clicking "Generate N barcodes" is the single action that builds output.
  - Modifying settings does not alter preview or show intrusive warning banners; the last generated sheet remains stable until explicit regeneration.
- **Runtime Caption Styling Floating Toast Toolbar (`.caption-toast-card`)**:
  - Floating toast card anchored to the Bulk Preview toolbar for live caption adjustment.
  - Size pills (`Auto`, `6 pt`, `7 pt`, `8 pt`, `9 pt`, `10 pt`), color palette with custom picker, styles (Bold `B`, Monospace `Mono`, Uppercase `AA`), and alignment (`L`, `C`, `R`).
  - Unitless SVG coordinate embedding and bounding box length clamping (`textLength`) to eliminate browser font inflation and prevent label collision without requiring barcode regeneration.
- **Label Sheet & Roll Presets**:
  - A4 Presets: 3 × 8 (24 labels), 3 × 7 (21 labels), 2 × 7 (14 labels), 2 × 4 (8 labels), 5 × 13 (65 labels), 4 × 10 (40 labels).
  - US Letter Presets: 3 × 10 (30 labels), 2 × 5 (10 labels), 4 × 20 (80 labels).
  - Thermal Roll Presets: 25 × 15, 38 × 25, 50 × 25, 50 × 30, 100 × 50, 100 × 150 mm.
  - Custom Layout Editor: Editable columns, rows, label dimensions, gaps, and margins with real-time sheet boundary validation.
- **Isolated Iframe Printing**:
  - Injects isolated HTML document into hidden iframe with `@page` sizing, printing labels at exact 100% scale without browser headers, footers, or application UI.
- **Batch Export Options**:
  - True vector PDF (standard PDF 1.4 with exact millimetric layout).
  - ZIP of PNG (300 DPI high-resolution individual images).
  - ZIP of SVG (lossless individual vector files).
  - Sheet images PNG (rasterized sheet pages).
  - Always includes `manifest.csv` and applies formula injection defense.
- **Post-Generation Scannability Verification**:
  - Scans each generated barcode via native `BarcodeDetector` and `@zxing/library`.
  - Preview displays `"X of N verified"` badge.
  - Provides "Download verified only" action when any barcode fails verification.

### 2.6 Canonical 4-Breakpoint Responsive System
- Strictly defined in [`responsive-tokens.ts`](../../../../client/apps/tool-barcode-generator/src/config/responsive-tokens.ts):
  - **`sm` (0–639px)**: Single column with dedicated 4th `"Preview"` tab in tab strip, sticky bottom action bar, compact `"Download (N)"` label, and dropdown zoom select.
  - **`md` (640–1023px)**: Single column stacked with collapsible preview section underneath active tab and dropdown zoom select.
  - **`lg` (1024–1439px)**: Two-column grid with left control panel clamped between 380px and 520px, right preview sticky to top.
  - **`xl` (1440px+)**: Centered shell capped at `max-width: 1600px`.

---

## 3. Scope Boundaries

### In Scope (Current Release)
- All 31 symbologies listed above.
- Single generation and bulk batch generation (up to 500 barcodes).
- Label sheets (A4, US Letter, Custom) and continuous thermal roll strips.
- Isolated iframe printing.
- Runtime caption styling toolbar.
- Full-screen drag-and-drop file gather.
- Canonical 4-breakpoint responsive layout.
- Sapphire Blue accent identity and dual-theme WCAG AA contrast.

### Deferred to Phase 3
- GS1-128 Application Identifier (AI) interactive builder.
- Healthcare-specific GS1 DataMatrix parser.
- Account-synced cloud barcode library.

---

## 4. Related Documentation
- Technical Specification: [spec.md](../spec.md)
- Bulk Specification: [bulk-spec.md](../bulk-spec.md)
- Responsive Architecture: [responsive-architecture.md](../responsive-architecture.md)
- Label Templates: [label-templates.md](../label-templates.md)
- Baseline Requirements: [requirements.md](./requirements.md)
- Changelog: [changelog.md](../changelog.md)

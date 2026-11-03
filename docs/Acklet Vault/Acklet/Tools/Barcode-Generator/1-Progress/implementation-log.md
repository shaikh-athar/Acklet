# Barcode Generator — Implementation Log

This document tracks chronological milestones, key engineering decisions, and architectural discoveries made while building the Barcode Generator.

---

## Timeline & Milestones

### 2026-10-30 — Initial Scoping & Phase 0 Audit
- **Decision**: Audited existing `tool-qr-generator` and shared `@acklet/tool-shell`.
- **Extraction**: Reused `ts-shell`, `ToolThemeProviderService`, `TsIconComponent`, and `ResponsiveService`. Avoided copy-pasting by importing shared tokens.
- **Identity Creation**: Registered `calm-rose` accent preset (`#D6455D` / `#E05D73`) in `accent-presets.ts`. Mapped `barcode` and `scan-barcode` Lucide icons in `ts-icon-map.ts`.

### 2026-10-30 — Mathematical Check-Digit Engine
- **Insight**: Discovered that a single universal right-to-left Modulo-10 algorithm with alternating weights of 3 and 1 (`let i = clean.length - 1, weight = 3; i >= 0; i--, weight = weight === 3 ? 1 : 3`) accurately handles EAN-13, EAN-8, UPC-A, ISBN-13, and ITF-14 without symbology-specific branches.
- **Validation**: Added unit tests in [`check-digit.service.spec.ts`](../../../../client/apps/tool-barcode-generator/src/services/check-digit.service.spec.ts) matching all GS1 General Specifications.

### 2026-10-30 — Registry & Pure Vector Rendering
- **Architecture**: Created [`barcode-registry.ts`](../../../../client/apps/tool-barcode-generator/src/config/barcode-registry.ts) containing all rules, charsets, length limits, and descriptions for 11 Phase 1 symbologies.
- **Rendering**: Implemented `BarcodeEngineAdapter` using binary module width tables to generate clean, scalable SVG paths with `shape-rendering="crispEdges"`.
- **Zero npm Dependencies**: Accomplished all 1D barcode generation with zero third-party npm packages.

### 2026-10-30 — UI Craft & Responsive Workflow
- **Desktop**: Engineered 100vh / 100vw layout with two primary cards: configuration on the left and live preview on the right.
- **Mobile**: Configured 100dvh single-column workflow with "View Preview & Export" transition button and back navigation.
- **Paper Stage**: Built a dedicated light paper container with quiet zones to ensure realistic scanner contrast even in Dark Mode.
- **Laser Animation**: Designed a single-shot 0.65s laser scan line sweep on first generation, with instant re-rendering on subsequent typing.

### 2026-10-30 — Cross-Tool Deep Link Integration (Make QR)
- **Requirement**: Users clicking "Make QR" from Barcode Generator (or URL Shortener) need the QR Generator to auto-fill the URL and generate the QR code immediately without manual typing.
- **Solution**:
  - In `tool-barcode-generator`: Updated QR suggestion banner link to point to `/qr?url=${encodeURIComponent(val)}` with the label `Make QR →`.
  - In `tool-qr-generator`: Enhanced `QRGeneratorComponent` and `InputPanelComponent` to inspect `window.location.search`, `window.location.hash`, and `ActivatedRoute.queryParams` on startup, auto-fill `websiteData.url`, and trigger immediate generation.

### 2026-10-31 — Phase 2 Bulk Generator Architecture & Single Page Model
- **Architectural Shift**: Transitioned from naive client-side loops to the Single Page Model Engine in [`SheetLayoutService`](../../../../client/apps/tool-barcode-generator/src/services/sheet-layout.service.ts). All positions, margins, barcode bounding boxes, captions, and cut guides are computed once in millimeters (`SheetPageModel[]` and `RollLabelModel[]`).
- **Vector PDF Generator**: Created zero-dependency, pure client-side [`PdfBuilderService`](../../../../client/apps/tool-barcode-generator/src/services/pdf-builder.service.ts) producing standard PDF 1.4 documents with vector path operations, exact page dimensions, and millimetric label alignment.
- **Batch Export Pipeline**: Created [`BulkGeneratorService`](../../../../client/apps/tool-barcode-generator/src/services/bulk-generator.service.ts) supporting ZIP of PNG (300 DPI), ZIP of SVG, Sheet images PNG, and PDF sheets/rolls, complete with `manifest.csv` and CSV formula injection sanitization.

### 2026-11-01 — Generate-Gated Preview, Scannability Verification & Roll Series
- **Generate-Gated Preview**: Replaced un-gated live preview rendering with layout placeholder grids (dashed outline slots) and instructional guide banner. Barcode rendering occurs strictly when user clicks "Generate N barcodes".
- **Post-Generation Verification**: Integrated [`VerifyService`](../../../../client/apps/tool-barcode-generator/src/services/verify.service.ts) into the bulk pipeline using native `BarcodeDetector`, `@zxing/library`, and a vector stroke parser for Standard 2 of 5. Added `"X of N verified"` badge and "Download verified only" safe export.
- **Continuous Vertical Roll Series**: Engineered continuous vertical strip preview for thermal label rolls (25×15 up to 100×150 mm) with cut marks (`--- ✂ ---`), real-time scroll tracking, and jump-to-label navigation.
- **Isolated Iframe Printing**: Replaced standard `window.print()` with an isolated HTML document injected into a hidden `<iframe>` containing only `.print-page` elements with `@page` sizing, ensuring exact 100% scale without browser headers, footers, or UI leakage.

### 2026-11-02 — Pipeline Parity, Sequence Removal & Full-Screen Gather Screen
- **Unified Rendering Pipeline Parity**: Consolidated bulk generation to execute through the exact same [`RenderService`](../../../../client/apps/tool-barcode-generator/src/services/render.service.ts) pipeline as single generation. Guaranteed byte-identical SVG output, identical bar geometry, quiet zones, and text formatting.
- **Removal of Sequence Source**: Deleted sequence source UI, state, and numbering logic in favor of deterministic, user-controlled List (paste rows) and CSV/TSV file inputs.
- **Removal of Settings Changed Banner**: Eliminated the intrusive warning banner; bulk preview remains stably displayed until explicit regeneration.
- **Full-Screen Drag-and-Drop Gather Screen**: Built `.screen-file-gather-overlay` in [`barcode-generator.component.ts`](../../../../client/apps/tool-barcode-generator/src/components/barcode-generator.component.ts). Dragging supported tabular files (`.csv`, `.tsv`, `.txt`) anywhere onto the window triggers an animated full-screen translucent drop zone that immediately routes to the Bulk tab, parses the file, and displays the Review table.
- **CSV Data Table UI**: Rebuilt the Section 3 CSV preview in [`bulk-panel.component.ts`](../../../../client/apps/tool-barcode-generator/src/components/bulk-panel/bulk-panel.component.ts) to match the Section 4 Review table layout with sticky `#` row counter column, dynamic role badges (`Value`, `Caption`), and 10-row pagination.

### 2026-11-02 — Runtime Caption Styling Floating Toast Toolbar
- **Floating Toast Interface (`.caption-toast-card`)**: Anchored floating management card to the Bulk Preview header toolbar, toggled via a new `Caption Style` button. Features size pills (`Auto`, `6 pt` to `10 pt`), color palette with custom picker, styles (Bold `B`, Monospace `Mono`, Uppercase `AA`), alignment (`L`, `C`, `R`), and 1-click Reset.
- **SVG Font Inflation Fix**: Resolved browser font inflation where browsers treated `font-size="...mm"` inside an SVG `viewBox` as CSS screen millimeters rather than viewBox user units. Converted to unitless font size calculations in [`SheetLayoutService`](../../../../client/apps/tool-barcode-generator/src/services/sheet-layout.service.ts) and added bounding box length clamping using `textLength` and `lengthAdjust="spacingAndGlyphs"` against `label.innerWidth - 3 mm`.
- **Zero-Impact Runtime Execution**: Caption modifications apply directly to the SVG layout assembly without re-running barcode encoding, without marking barcodes as outdated, and without requiring regeneration.

### 2026-11-02 — Canonical 4-Breakpoint Responsive Restructure & Accent Blue Migration
- **Canonical Responsive Design Tokens (`responsive-tokens.ts`)**: Established single source of truth for breakpoints (`sm: 0-639px`, `md: 640-1023px`, `lg: 1024-1439px`, `xl: 1440px+`). Added unit test suite in [`responsive-layout.spec.ts`](../../../../client/apps/tool-barcode-generator/src/config/responsive-layout.spec.ts) (10 tests passing).
- **Dedicated Small Screen (`sm`) Flow**: Top tab strip includes dedicated `"Preview"` 4th tab (`['content', 'customize', 'bulk', 'preview']`). Sticky bottom action bar with `env(safe-area-inset-bottom)`. Dynamic download button label shrinking (`"Download (N)"`). Dropdown zoom select.
- **Medium Screen (`md`) Collapsible Layout**: Stacked single-column with collapsible preview section underneath active form tab (`"Show preview"` / `"Hide preview"` toggle) and compact dropdown zoom select.
- **Desktop & Wide Screen (`lg`, `xl`) Shell**: Clamped left column (`clamp(380px, 38%, 520px)`), sticky right preview, and centered shell capped at `max-width: 1600px`.
- **Sapphire Blue Accent Migration**: Migrated all active segmented buttons, tabs, focus rings, and controls to canonical Sapphire Blue (`var(--tool-accent, #2563EB)` in light mode, `#3B82F6` in dark mode, hue 217), replacing previous experimental emerald green and guaranteeing `>= 4.5:1` WCAG AA contrast in both themes.

---

## Related Documentation
- Technical Specification: [spec.md](../spec.md)
- Bulk Specification: [bulk-spec.md](../bulk-spec.md)
- Responsive Architecture: [responsive-architecture.md](../responsive-architecture.md)
- Issues & Fixes Log: [issues-and-fixes.md](./issues-and-fixes.md)
- Changelog: [changelog.md](../changelog.md)

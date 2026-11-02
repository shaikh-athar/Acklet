# Barcode Generator — Changelog

## [1.4.1] — Mobile Responsiveness, Device Size Tiers & Two-Case Preview Collapse — 2026-11-02

### Added
- **5-Tier Device Sizing System (`xs`, `sm`, `md`, `lg`, `xl`)**:
  - Defined explicit device size tiers in [`responsive-tokens.ts`](../../../../client/apps/tool-barcode-generator/src/config/responsive-tokens.ts) and [`styles.css`](../../../../client/apps/tool-barcode-generator/src/styles.css):
    - `xs`: under `400px` (e.g. 360×800 Samsung Galaxy A55, 320×640 small phones)
    - `sm`: `400px – 639px` (large phones, phablets)
    - `md`: `640px – 1023px` (tablets portrait, small window laptops)
    - `lg`: `1024px – 1439px` (laptops, landscape tablets)
    - `xl`: `1440px+` (desktops, large monitors)
  - Integrated `isXs` signal in [`ResponsiveService`](../../../../client/packages/tool-shell/src/services/responsive.service.ts) and added unit tests in [`responsive-layout.spec.ts`](./responsive-architecture.md).
- **Two-Case Preview vs. Generate Workflow**:
  - **Case 1 (Empty content/nothing entered)**: Shows only the **"Show Preview"** button with collapse/expand chevron (`mobile-show-preview-btn`) on mobile and **"Show preview" / "Hide preview"** toggle (`md-preview-toggle-btn`) on tablet.
  - **Case 2 (Content entered or customized)**: Automatically switches to the primary **"Generate"** button (`mobile-generate-btn` / `md-generate-btn`) to trigger rendering and open preview.
  - **0.05s (50ms) Animation**: Added smooth `0.05s ease-in-out` transitions for both expanding and collapsing preview panels and tab panes.
- **Caption Styling Mobile Bottom Sheet**:
  - On `<640px` and `xs` phones, caption styling popover transforms into a bottom sheet anchored to the bottom (`position: fixed; inset: 0; backdrop-filter: blur(4px)`) with drag handle pill, LIVE badge, and nowrap Reset button (min-width 64px).
  - Added native select dropdown for font sizes on `xs` (`.toast-size-select`), eliminating horizontal clipping of size pills.
  - Formats (`B`, `Mono`, `AA`) and alignments (`L`, `C`, `R`) stack into two clean rows.
  - Color swatches expand to 34–36px touch targets with 8px spacing.
  - Tapping the overlay backdrop smoothly dismisses the sheet.

### Fixed
- **Tab Bar Letter-by-Letter Wrapping on Small Screens**:
  - Replaced inline flex tab bar with a strict 4-column grid (`grid-template-columns: repeat(4, 1fr)`) on `<640px`.
  - Stacked 16px icon above 11px label with `white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; display: block !important;`.
  - Fixed CSS syntax error in `@media (max-width: 399px)` in [`barcode-generator.component.ts`](../../../../client/apps/tool-barcode-generator/src/components/barcode-generator.component.ts).
- **Bulk Output Format Wrapping & Section 5 Header**:
  - Replaced crowded 5-button segmented control on `xs` phones with a clean `<select class="ts-select output-select">`, completely preventing 4-line syllable wrapping (`Pri / nt / she / et`).
  - Added `white-space: nowrap` to `.seg-btn` on larger screens.
  - Added 24px step badges on `xs`, nowrap section titles, and allowed summary chips to wrap below on narrow screens without squishing headers.
- **Customize Tab 2-Column Grid Cascade Override**:
  - Reordered CSS in [`customize-panel.component.ts`](../../../../client/apps/tool-barcode-generator/src/components/customize-panel/customize-panel.component.ts) so media queries cascade properly at the end of the stylesheet, strictly collapsing `.two-col-grid` to 1 column on `<640px` so Rotation and Border frame stack vertically.
  - Increased quiet zone slider label row spacing.
- **Content Tab Duplicate Primary Button on Mobile**:
  - Demoted "Customize Design" on mobile to secondary outline styling, preventing duplicate primary blue buttons stacking directly above the sticky Generate bar.
- **Preview Footer Squeezing**:
  - Action footer buttons (Print, Download count, More) styled to fit in a single row without squeezing (`Print` auto-fit, `Download (N)` flex-expanded, `...` 44px square) with `env(safe-area-inset-bottom)` support.
  - Fit warning chip formatted with 11px font and text-overflow ellipsis.

## [1.4.0] — Canonical Responsive Restructure across All Breakpoints & Touch Optimization — 2026-11-02

### Added
- **Canonical Responsive Design Tokens (`responsive-tokens.ts`)**:
  - Established canonical single source of truth for breakpoints (`sm: 0-639px`, `md: 640-1023px`, `lg: 1024-1439px`, `xl: 1440px+`), media queries, and layout tokens across the tool.
  - Added unit test suite in [`responsive-layout.spec.ts`](./responsive-architecture.md) verifying breakpoint classification, layout limits, and state preservation across transitions.
- **Dedicated Small Screen (`sm`) Flow**:
  - Single column with full width and 16px side padding.
  - Added dedicated `"Preview"` 4th tab to the workspace tab strip (`['content', 'customize', 'bulk', 'preview']`), preventing form and preview collision on mobile screens.
  - Added sticky bottom `"Generate"` action bar with safe area padding (`env(safe-area-inset-bottom)`).
  - Shortened mobile download button label (`"Download (N)"`) to fit cleanly alongside Print and More actions without touch target compromise.
- **Medium Screen (`md`) Collapsible Layout**:
  - Full-width stacked layout with collapsible preview section underneath the active form tab.
  - Provided `"Show preview"` / `"Hide preview"` toggle button to focus on input editing.
  - Collapsed preview zoom controls into a native dropdown select (`.zoom-dropdown-select`), preventing toolbar overflow.
- **Desktop & Wide Screen (`lg`, `xl`) Shell**:
  - Two-column grid with left form column clamped between `380px` and `520px` (`clamp(380px, 38%, 520px)`), right preview column sticky to the viewport.
  - Shell capped at `1600px` max-width and centered on wide monitors.

### Enhanced
- **Accent-Based Blue Active Controls & Focus Rings**:
  - Active segmented control items, tabs, and toggles styled with tool accent blue (`var(--tool-accent, #2563EB)`) and `#FFFFFF` text, guaranteeing `>= 4.5:1` WCAG AA contrast in both light and dark themes.
  - 2px accent blue focus ring (`outline: 2px solid var(--tool-accent, #2563EB); outline-offset: 2px;`) across all interactive form inputs, selectors, and action buttons.
  - Minimum 44×44px touch targets on mobile and tablet breakpoints.
- **Zero-Spill Horizontal Scroll**:
  - All preview SVG wrappers and tables scroll horizontally strictly inside their inner containers (`overflow-x: auto`), eliminating accidental window-level lateral movement.

## [1.3.6] — Runtime Caption Styling Toast Popup & SVG Font Inflation Fix — 2026-11-02

### Added
- **Runtime Caption Styling Toast Popup (`.caption-toast-card`)**:
  - Added a floating toast-style management card anchored to the Bulk Preview header toolbar, toggled via a new `Caption Style` button in [`bulk-preview.component.ts`](../../../../client/apps/tool-barcode-generator/src/components/bulk-preview/bulk-preview.component.ts).
  - **Size Controls**: Segmented quick-select pills (`Auto`, `6 pt`, `7 pt`, `8 pt`, `9 pt`, `10 pt`) to fit varying product label dimensions.
  - **Color Palette**: Preset high-contrast swatches (`Slate #334155`, `Black #000000`, `Muted #64748B`, `Sapphire #0284C7`, `Crimson #DC2626`) plus a native custom color picker input.
  - **Formatting Styles**: Toggleable Bold (`B`), Monospace font family (`Mono`), Uppercase transform (`AA`), and text alignment (`Left`, `Center`, `Right`).
  - **Reset**: 1-click restore to standard clean defaults via `state.resetCaptionStyle()`.
- **Zero-Impact Runtime Execution**:
  - Caption styling is completely decoupled from barcode generation: modifying caption size, color, or styles updates the SVG output immediately at runtime without altering barcode vector geometry, without marking barcodes as outdated, and without requiring the user to click `Generate N barcodes` again.
- **Export & Print Parity**:
  - Extended [`SheetLayoutService`](../../../../client/apps/tool-barcode-generator/src/services/sheet-layout.service.ts), [`PdfBuilderService`](../../../../client/apps/tool-barcode-generator/src/services/pdf-builder.service.ts), and [`BulkGeneratorService`](../../../../client/apps/tool-barcode-generator/src/services/bulk-generator.service.ts) to consume runtime caption styling across Live Preview, hidden iframe Print, PDF Sheet/Roll, and PNG sheet exports.

### Fixed
- **Active Button Contrast & Hover State Visibility in Light/Dark Themes**:
  - Fixed specificity issue in [`bulk-preview.component.ts`](../../../../client/apps/tool-barcode-generator/src/components/bulk-preview/bulk-preview.component.ts) where light-theme rules `:host-context([data-theme="light"]) .toast-align-btn` and `.toast-pill-btn` had overridden active button text color with `#64748B`, causing dark glyphs on blue background (`1.5:1` contrast).
  - Explicitly scoped `.is-active` in both themes with `color: #FFFFFF !important; background: #2563EB; font-weight: 700;`, guaranteeing flawless `4.5:1+` WCAG AA contrast for active size pills, style toggles (`B`, `Mono`, `AA`), and alignment buttons (`L`, `C`, `R`).
  - Added dedicated hover states for inactive buttons (`#E2E8F0` / `rgba(255,255,255,0.09)`) and active buttons (`#1D4ED8` with `#FFFFFF` text) across both themes.
  - Enhanced color dot selection rings (`#2563EB` in light mode, `#38BDF8` in dark mode) with elevation and hover scaling.
- **SVG Caption Font Size Inflation & Label Overlap**:
  - Resolved SVG font inflation where browsers treated `font-size="...mm"` inside an SVG `viewBox` as CSS screen millimeters rather than viewBox user units, which had inflated text sizes by ~3.78x.
  - Implemented unitless font size calculations in [`SheetLayoutService`](../../../../client/apps/tool-barcode-generator/src/services/sheet-layout.service.ts) and added bounding box length clamping using `textLength` and `lengthAdjust="spacingAndGlyphs"` against `label.innerWidth - 3 mm`, guaranteeing captions never collide with adjacent labels or barcodes.

## [1.3.5] — Full-Screen Drag-and-Drop Gather, Unified Rendering Pipeline & Persistent Bulk Preview — 2026-11-02

### Added
- **Full-Screen Drag-and-Drop File Gather Overlay**:
  - Implemented `.screen-file-gather-overlay` in [`barcode-generator.component.ts`](../../../../client/apps/tool-barcode-generator/src/components/barcode-generator.component.ts) with `pointer-events: none` on child elements and counter-tracked `window:dragenter`, `window:dragover`, `window:dragleave`, and `window:drop` listeners.
  - Active screen overlay features high-contrast dual-theme glass styling, pulsing sonar rings, animated floating cloud upload icon, and format constraint pills (`.csv, .tsv, .txt · Max 2 MB · Up to 500 records`).
  - Dropping any supported CSV, TSV, or plain text file automatically switches the active tab to "Bulk", sets source mode to CSV, parses the file, updates column selectors, and immediately populates the Review table without manual tab switching.
- **Section 3 CSV Data Table UI (Review Table Parity)**:
  - Rebuilt the Section 3 CSV preview in [`bulk-panel.component.ts`](../../../../client/apps/tool-barcode-generator/src/components/bulk-panel/bulk-panel.component.ts) to match the exact structure and styling of the Section 4 Review table (`.review-table-container.csv-table-container`, `.review-table.csv-table`).
  - Added sticky `Row` counter column (`1`, `2`, `3`...) left-anchored during horizontal scroll.
  - Added dynamic column role badges (`Value` pill for selected barcode column, `Caption` pill for selected label text column).
  - Fixed parser data separation in [`bulk-generator.service.ts`](../../../../client/apps/tool-barcode-generator/src/services/bulk-generator.service.ts) so headers are rendered exclusively in `<thead>` and never duplicated in data rows.
  - Implemented 10-row pagination controls with Previous / Next navigation and row range summary.
- **Section 3 Data Dropzone Interaction**:
  - Enhanced the Section 3 Data file dropzone in [`bulk-panel.component.ts`](../../../../client/apps/tool-barcode-generator/src/components/bulk-panel/bulk-panel.component.ts) with dynamic drag-over highlighting (`.is-dragover`), sapphire border pulses, and keyboard navigation support (`Enter` / `Space`).
- **Interactive Empty Preview Drop Target**:
  - Empty sheet and roll preview states in [`bulk-preview.component.ts`](../../../../client/apps/tool-barcode-generator/src/components/bulk-preview/bulk-preview.component.ts) now act as drop targets and clickable file selectors with `"Click or drop CSV"` action badges.
- **Shared Reactive State Management**:
  - Elevated CSV state (`csvFileName`, `csvRawText`, `csvHasHeader`, `csvValueColIdx`, `csvCaptionColIdx`) to [`BulkStateService`](../../../../client/apps/tool-barcode-generator/src/services/bulk-state.service.ts) to guarantee seamless reactivity between root window drops, panel dropzones, and preview drop targets.
- **Single Source of Truth Rendering Pipeline Parity**:
  - Unified bulk barcode generation to execute through the identical [`RenderService`](../../../../client/apps/tool-barcode-generator/src/services/render.service.ts) pipeline used by single generation, ensuring consistent barcode geometry, scannability, quiet zones, and text formatting.

### Changed & Removed
- **Removed Sequence Source**:
  - Removed sequence generator UI, state, and auto-generated numbering logic in favor of deterministic, user-controlled List and CSV inputs.
- **Removed Settings Changed Banner**:
  - Removed the intrusive outdated warning banner; bulk preview remains stably displayed until the user chooses to regenerate.

## [1.3.4] — Bulk Mode Rebuild: Generate-Gated Preview, Scannability Verification & Custom Layout — 2026-11-01

### Added
- **Generate-Gated Preview Architecture**:
  - Gated the Bulk Preview behind clicking "Generate N barcodes": un-generated states render only layout placeholder grids with empty dashed slots and an instructional guide banner ("Click Generate in the left panel to create barcodes").
  - Modifying any setting (source mode, sequence, format, layout, customize) after generation sets `isOutdated = true`, displays a warning banner ("Settings changed. Regenerate to update preview."), and disables Print/Download until barcodes are regenerated.
- **Post-Generation Symbology & Scannability Verification**:
  - Integrated [`VerifyService`](../../../../client/apps/tool-barcode-generator/src/services/verify.service.ts) into the bulk generation pipeline, decoding each generated barcode using native `BarcodeDetector`, `@zxing/library`, and a dedicated vector stroke parser for Standard 2 of 5.
  - Preview action bar surfaces `"X of N verified"` badge (`50 of 50 verified` or `X of N verified, Y failed`).
  - Added "Download verified only" safe export option when any barcode in the run fails verification.
- **Full Custom Label Layout System**:
  - Added editable inputs for columns, rows, label width, label height, horizontal gap, vertical gap, left margin, and top margin.
  - Real-time layout dimension validation computing total required width and height against page size (`A4` or `Letter`), displaying an inline alert and disabling the Generate button if dimensions exceed sheet boundaries.
  - Page count equals `Math.ceil(items / (cols * rows))` (e.g. 50 items on 5 × 13 yields 1 page of 65 slots; 50 items on 4 × 10 yields 2 pages).
- **Comprehensive 8-Criteria Acceptance Test Suite**:
  - Added [`bulk-acceptance.spec.ts`](../../../../client/apps/tool-barcode-generator/src/services/bulk-acceptance.spec.ts) validating all 8 requirements (gated preview, removed preview, 5x13 layout, 4x10 layout, custom layout validation, Standard 2 of 5 validation, Standard 2 of 5 decode verification, and outdated tracking).

### Removed
- **Removed Legacy Section 6 Content Preview**:
  - Deleted the in-tab "6 Content preview" section and sample thumbnail cards from [bulk-panel.component.ts](../../../../client/apps/tool-barcode-generator/src/components/bulk-panel/bulk-panel.component.ts), keeping the progressive panel strictly focused on 5 steps (Source, Format, Data, Review, Output).



### Added
- **Symbology Sizing Profiles (`computeBarcodeSizing`)**:
  - Implemented exact format-specific sizing calculation in [`sheet-layout.service.ts`](../../../../client/apps/tool-barcode-generator/src/services/sheet-layout.service.ts) covering all 31 symbologies.
  - Variable-width linear formats enforce the >= 70% inner width fill rule without stretching.
  - Fixed-size retail formats scale by magnification $M$ (80% to 200%) and truncate height down to min 60% with `isReducedHeight` flag.
  - Matrix 2D formats scale cell dimensions between 0.25 mm and 0.80 mm.
  - Fixed 100% and 50% magnification profiles for logistics formats including ITF-14 ($1.016\text{ mm}$ nominal module).
  - Printer dot snapping for thermal roll printers at 203 DPI and 300 DPI.
  - "Too small for this label" pre-flight validation in Review with smallest compatible label recommendations.
- **Continuous Vertical Label Roll Series (Finding F5)**:
  - Displays all roll labels in series as a continuous vertical strip in [`bulk-preview.component.ts`](../../../../client/apps/tool-barcode-generator/src/components/bulk-preview/bulk-preview.component.ts).
  - Each label drawn at exact aspect ratio with cut marks (`--- ✂ ---`).
  - Outside label card: row numbers (`#1`, `#2`...) and module widths.
  - Roll meta strip showing roll specs outside the cards: `"50 labels on roll (50 × 25 mm · 203 / 300 DPI)"`.
  - Scroll tracker displaying `"Label X of 50"` updating on scroll with jump-to-label input.
- **Dedicated Hidden Iframe Printing (Finding F3)**:
  - Rebuilt print workflow to inject an isolated HTML document into a hidden iframe containing only `.print-page` elements and SVG data with `@page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }`.
  - Prints only the barcode labels at exact 100% scale without application UI, sidebars, browser headers, or footers.
- **High-Contrast Zoom Segmented Control (Finding F4)**:
  - Rebuilt zoom buttons (`Fit`, `100%`, `150%`) with min 44 px touch targets, `white-space: nowrap`, and WCAG AA contrast tokens.
- **Comprehensive Scanability Verification**:
  - Added [`bulk-scan.spec.ts`](../../../../client/apps/tool-barcode-generator/src/services/bulk-scan.spec.ts) verifying scanability across the 7 required label templates.

### Removed
- **Removed Redundant Controls (Finding F6)**:
  - Removed `Horizontal nudge`, `Vertical nudge`, `Start at label N`, `Copies of each`, `Text size`, and `Step` from UI, page models, and localStorage persistence.
  - Fixed default values: `step = 1`, `start = 1`, `copies = 1`, `offsets = 0`, automatic text size (6 to 10 pt).
  - Rebalanced Section 3 Data grid (Prefix/Suffix, Start/Count, Padding/Check digit toggle) and Section 5 Output options.
  - Updated format helper line: `"Colors and text style come from the Customize tab. Size is set by the label."`

---

### Added
- **Caption Typography & Position Controls**:
  - Moved font family (`OCR-B / Optical`, `Monospace`, `Clean Sans`), font size (`8 pt`, `10 pt`, `12 pt`, `14 pt`), formatting (`Bold text`), and position (`Above barcode`, `Below barcode`) to the Caption section in the Customize tab.
  - Controls are conditionally rendered: they appear only when caption text is present in the input field, keeping the panel clean until a caption is entered.
  - In [`render.service.ts`](../../../../client/apps/tool-barcode-generator/src/services/render.service.ts), caption SVG text dynamically applies the selected font family, font size, bold weight, and above/below offset.
- **Content-Driven Laser Scan Animation**:
  - In [`barcode-generator.component.ts`](../../../../client/apps/tool-barcode-generator/src/components/barcode-generator.component.ts), the laser scan line animation sweeps across the barcode preview whenever the barcode output content changes (input value, format, variant, or encoding parameters).
  - Explicitly filters out size adjustments (small / standard / large size preset) and purely layout/styling changes (quiet zone, border style, background color), ensuring animation plays only when the barcode's encoded data changes.
  - Added card pulse animation and active border glow during the laser sweep in [`preview-panel.component.ts`](../../../../client/apps/tool-barcode-generator/src/components/preview-panel/preview-panel.component.ts).

### Updated
- **Human-Readable Text Section**:
  - Retained toggle switch for human-readable numbers and standard digit grouping for EAN/UPC barcodes, removing redundant font/bold controls that cannot be customized inside the symbology engine.

---

## [1.3.1] — Auto-Naming Session Separation, 30-Day Retention & History Inline Rename — 2026-11-01

### Added
- **"Save Separate" Action Button**:
  - Displays a dedicated `Save separate` pill action in the Barcode Name row whenever the current input is modified from the saved value of an existing barcode.
  - Clicking `Save separate` assigns the next free barcode name (`Barcode N`), saves the modified input as a separate new history entry, and preserves the original barcode in history.
- **Format Switch Auto-Naming & Previous Preservation**:
  - Automatically preserves the previous valid barcode in history upon switching formats.
  - Automatically advances the barcode name to the next auto-assigned name (`Barcode N`) for the new format.
- **Lifetime Total Generated Counter**:
  - Tracks total barcodes generated to date via persistent local storage counter (`totalGeneratedCount`).
  - Displays cumulative count badge in the History dialog header (`X generated`).
- **30-Day History Retention Policy & Notice**:
  - Replaced the hard 20-item cap with a 30-day (1 month) retention window that keeps all generated barcodes from the past month.
  - Automatically prunes records older than 30 days during storage load and item insertion.
  - Added an informational notice banner in the History modal informing users that barcodes are stored locally on the device and cleared automatically after 30 days.
- **Inline Rename in History**:
  - Added an inline edit trigger (pencil icon) on history cards.
  - Enables in-place editing of barcode names with checkmark confirmation, cancelation, and 60-character length enforcement.
  - Updates history storage and synchronizes the active editor barcode name if the currently loaded item is renamed.

### Updated
- [`barcode-name.spec.ts`](../../../../client/apps/tool-barcode-generator/src/services/barcode-name.spec.ts): Added unit tests for lifetime generation count, update deduplication, and 30-day retention pruning.

---

## [1.3.0] — Engine Option Sensitivity, Character Rejection, Symbology Normalization & Round 3 Overhaul — 2026-10-31

### Fixed
- **Root Cause of Format Options Not Applying**:
  - bwip-js option mapping was misaligned: Data Matrix expected `format: 'rectangle' | 'square'` (was passed `'rectangular'`), PDF417 expected `eclevel: 0..8` (was passed `'securitylevel'`), Aztec expected `eclevel: 10 | 30 | 50`, and MSI was double-checksummed when `includecheck` remained `true` alongside pre-calculated checksum digits.
  - Added full format options (`FormatPerOptions`) into `renderInput` signal computation, `renderService` cache key calculation (`optionsKey`), history serialization, and share link URL state.
- **Variant Hover Visibility**:
  - Fixed virtually invisible hover state on variant segmented controls (`.variant-pill-btn`) and option pills (`.pill-btn`) by switching from low-contrast `--tool-bg-hover` (`#EDEEEE` over `#F1F5F9`) to `--bg-surface-hover` (`rgba(15, 23, 42, 0.08)` in light mode, `rgba(255, 255, 255, 0.12)` in dark mode).
- **GS1 DataBar Symbology Normalization & 7 Distinct Variants**:
  - Truncated paste handler bug removed; pasted strings are never truncated.
  - Omnidirectional (full-height single row), Truncated (reduced-height single row), Stacked (two rows, reduced height), Stacked Omnidirectional (two rows, full height), Limited (narrower symbol, accepts GTINs starting with 0 or 1), Expanded (up to 90 characters alphanumeric with AIs), and Expanded Stacked (multi-row with selectable segments 2, 4, 6, 8).
  - DataBar bypasses fixed calculated height in encoder adapter to maintain standard GS1 bar proportions.
  - Verification service skips scan comparison for stacked and limited variants (`skipped: true`) without emitting false positive mismatch warnings.
  - Suppressed ISBN suggestion chips while GS1 DataBar is the active format.
- **Character Rejection with Exact Diff Message**:
  - Rejection messages explicitly identify illegal characters: e.g. `"Code 128 supports ASCII characters only. Remove: ï é."` (capped at 5 characters with `"and others"`).
  - Alphanumeric ASCII-only checking (0..127) enforced on Code 128, Code 39 Extended, Telepen, Data Matrix, PDF417, and Aztec.
  - Added capacity validation: Data Matrix rectangular capped at 72 characters, PDF417 per-level limits, Aztec per-percentage limits, and DataBar Expanded capped at 90 characters.
- **MSI Plessey Modulo-11 Edge Case**:
  - Handled remainder 10 edge case yielding two-digit check `'10'` (e.g. `1009` -> `100910`) and appended check digit into `cleanValue` and displayed human-readable text.
- **Human-Readable Text Gap**:
  - Configured `textyoffset: -3` in encoder adapter to maintain standard crisp spacing between bars and human-readable numbers.
- **Hardcoded Domain Decoupling**:
  - Removed hardcoded URLs (`acklet.com`, `tools.acklet.com`, `qr.acklet.com`) outside environment configurations. Integrated dynamic portal and tool URL resolution via `@acklet/shared` helpers.
- **Unique Barcode Naming & Export Filesystem Sanitization**:
  - Auto-numbers new barcodes (`Barcode 1`, `Barcode 2`, etc.) based on history and saved items.
  - Collision prevention appends ` (2)` or ` (3)` when saving/exporting.
  - Export filenames preserve case and sanitize invalid filesystem characters (`Barcode-1-code128.png`).

### Added
- **Automated Test Suites**:
  - `option-sensitivity.spec.ts`: Tests every registry option and Customize setting across all values to verify output differences.
  - `charset-rejection.spec.ts`: Tests exact illegal character reporting across formats.
  - `variant-shape-level.spec.ts`: Verifies DataBar 7 variants, Data Matrix square vs rectangular, PDF417 levels 0..8, Aztec 10/30/50%, and MSI check algorithms.
  - `barcode-name.spec.ts`: Verifies auto-numbering, collision handling, and export sanitization.
  - `domain-lint.spec.ts`: Verifies that no forbidden production host strings are hardcoded in client source files.

---

## [1.2.2] — Barcode Preview Rendering Fix, SVG Dimensions & Blob Image Pipeline — 2026-10-30

### Fixed
- **Barcode Preview Blank Rendering Root Cause**:
  - `bwip-js` only emits `viewBox` attributes on the root `<svg>` tag without root `width` or `height` attributes, leading to CSS height collapse or zero-size rendering in browser engines.
  - Sizing regex previously captured inner path stroke widths rather than root SVG dimensions.
  - Replaced `[innerHTML]` binding with an `<img>` tag backed by a secure Blob URL (`image/svg+xml;charset=utf-8` via `URL.createObjectURL`), bypassing HTML parser stripping while keeping strict CSP compliance without unsanitized HTML injection.
  - Explicitly injected root SVG attributes: `xmlns="http://www.w3.org/2000/svg"`, `viewBox="0 0 W H"`, `width="W"`, `height="H"`, and `shape-rendering="crispEdges"`.
  - Added CSS rule `max-width: 100%`, `max-height: 240px`, and `height: auto` inside `.svg-render-container` with `min-height: 120px` to guarantee stable intrinsic dimensions.
  - Ensured concrete hex colors (`safeBarHex` defaulting to `#000000` and `safeBgHex` defaulting to `#FFFFFF`) are passed to the encoding engine, preventing transparent or unresolved CSS variable values.
  - Added `@media (prefers-reduced-motion: reduce)` rules and `animation-fill-mode: forwards` to guarantee barcode visibility even if animations are disabled.
  - Added blob URL revocation lifecycle management (`URL.revokeObjectURL`) on preview updates and `ngOnDestroy` to prevent memory leaks.
- **Preview Status Pill & Error Area**:
  - The status pill strictly displays `"Ready"` only when a verified, non-empty render exists (`hasValidRender() && !isGenerating()`).
  - When rendering fails or returns empty output, status pill switches to `"Error"` and the preview area displays: `"The barcode could not be drawn. Try again or change the format."`.
  - Underlying rendering errors are logged to `console.error` in development.
  - Silent verification errors are caught safely and never hide or block a rendered barcode.
- **History Modal Thumbnails**: Updated history items to display barcodes via safe data URL `<img>` elements instead of `[innerHTML]`.

### Added
- **Unit Test Coverage**:
  - [`render.service.spec.ts`](../../../../client/apps/tool-barcode-generator/src/services/render.service.spec.ts): Added tests verifying that SVG output contains bar elements (`<rect` or `<path`) with positive width and height for Code 128 (`ACKLET-PKG-9821`), EAN-13 (`400638133393`), Code 39 (`ACKLET-1`), and ITF-14 (`10012345678902`).
  - [`preview-panel.component.spec.ts`](../../../../client/apps/tool-barcode-generator/src/components/preview-panel/preview-panel.component.spec.ts): Added tests verifying `<img>` element rendering, Blob URL creation and cleanup, error state presentation, and paper card dual-theme styling.

---

## [1.2.1] — Preview Rendering, More Actions Dropdown, Modal Animations & Format Validation UX — 2026-10-30

### Fixed
- **Barcode SVG Vector Display**: Resolved Angular HTML sanitizer stripping `<svg>`, `<rect>`, and `<path>` tags by bypassing security on sanitized SVG strings using `DomSanitizer.bypassSecurityTrustHtml`. Vector barcodes now render crisply on the preview paper card and in history thumbnails.
- **Preview More Dropdown**:
  - Bound click delegation and event handling for projected `<button trigger>` inside `AdaptiveDropdownComponent`.
  - Configured upward positioning (`placement="top"`) and right-alignment (`align="right"`) on desktop viewports so action options open cleanly within view.
  - Added `onItemClick` auto-close handling when any action item is selected.
- **Modal Entrance & Exit Animations**: Added smooth backdrop fade (`modalBackdropFadeIn`/`modalBackdropFadeOut`) and dialog scale transitions (`modalDialogPopIn`/`modalDialogPopOut`) on both open and close for History and Settings modals.

### Added
- **Format-Driven Input Bounds & Validation**:
  - Bound `[attr.inputmode]` to `'numeric'` for digit-only formats and `'text'` for alphanumeric symbologies.
  - Bound `[attr.maxlength]` to enforce maximum format bounds natively.
  - Dynamic character counter displaying real-time length vs. required or maximum bounds (`current / target`) with clear visual states (`.is-under`, `.is-complete`, `.is-over`).
  - Added format rule badges above the input indicating character constraints (e.g. `12 or 13 digits · GS1 checksum`).
- **One-Click Correction Actions**:
  - **Fix check digit**: Recalculates expected GS1 Modulo-10 checksum and offers single-click correction when entering an incorrect check digit.
  - **Remove non-digits**: Strips letters and symbols from numeric-only formats in one click.
  - **Try example**: Provides one-click valid example value fallback when switching to a different symbology.

---

## [1.2.0] — Phase A & Phase B Expansion: Catalog, Format Picker, Security & Bulk — 2026-10-30

### Added
- **Format Registry Architecture (Phase A1)**:
  - Strongly typed catalog registry ([`barcode-catalog.config.ts`](../../../../client/apps/tool-barcode-generator/src/config/barcode-catalog.config.ts)) acting as single source of truth for all formats, lengths, character sets, check digits, and SEO content.
  - Pluggable service layer behind interfaces: `FormatRegistryService`, `ValidatorService`, `EncoderAdapterService`, `RenderService`, `ExportService`, `VerifyService`, `BarcodeHistoryService`, `ShareService`, `AnalyticsService`, and `BulkGeneratorService`.
  - Added Tier 1 symbologies: Code 128, EAN-13, EAN-8, UPC-A, UPC-E, ISBN, Code 39, Code 93, ITF-14, Interleaved 2 of 5, Codabar.
  - Added Tier 2 symbologies: Data Matrix, PDF417, Aztec Code, ISSN, ISMN, GS1 DataBar (Omnidirectional, Truncated, Stacked, Stacked Omnidirectional, Limited, Expanded, Expanded Stacked), Code 39 Extended, MSI Plessey, Code 11, Standard 2 of 5, Telepen.
  - Configured Tier 3 symbologies with `enabled: false` (GS1-128 builder, Digital Link, Pharmacode, postal, MaxiCode, payments).

- **Format Picker (Phase A2)**:
  - Desktop: 480px two-pane popover (categories on left, formats on right, max-height 60vh, internal scroll).
  - Phone: Full-height bottom sheet with top search input and sticky close button.
  - Category filtering across Popular, Retail, General and logistics, Industrial, 2D, GS1 DataBar, Healthcare, Postal, Payments (only rendering categories with enabled formats).
  - Search matching name, aliases, standard name, and use cases.
  - Recent formats section displaying the last 5 locally used symbologies.
  - Step 3 variant segmented control for multi-variant formats (e.g. GS1 DataBar variants).
  - URL slug synchronization (`/ean-13`, `/code-128`, etc.) with browser back and forward history navigation.
  - Picker footer quiet link: *"Need a QR code? Open QR Generator"*.

- **Validation & Check Digit Engine (Phase A3)**:
  - GS1 Modulo-10 checksum calculation and validation implemented independently in [`check-digit.service.ts`](../../../../client/apps/tool-barcode-generator/src/services/check-digit.service.ts).
  - Automatic check digit calculation and addition notice for EAN-13, UPC-A, EAN-8, and ISBN.
  - ISBN-10 to ISBN-13 conversion with 978 prefix.
  - Quick action chips: "Add a leading 0" (Interleaved 2 of 5 odd length), "Convert to uppercase" (Code 39 lowercase), and "Convert to UPC-E".
  - GS1 DataBar Limited rule: accepts only GTINs starting with 0 or 1.
  - Auto-detection chip suggesting matching formats while typing without forced auto-switching.

- **Responsive UI & Design Tokens (Phase A4)**:
  - Two-column workspace fitting 100dvh with zero whole-page scroll, 8px spacing scale, and safe-area insets.
  - Left card tabs: Content, Customize, Bulk.
  - Single primary action: "Download" high-resolution PNG.
  - Secondary actions grouped into adaptive "More" dropdown (popover on desktop, bottom sheet on phone): Download SVG, Download PDF, Copy image, Save, and Share.
  - Paper card preview stage guaranteeing crisp scanning contrast in both dark and light modes.
  - Sapphire Blue accent theme (`#3B82F6` dark / `#2563EB` light) with high contrast compliance.

- **Security Baseline & Privacy (Phase A8)**:
  - 100% client-side execution; zero network requests for entered data or rendering.
  - XML entity escaping on all user text injected into SVG graphics.
  - Documented strict CSP and production response headers.
  - Privacy notices: *"Barcodes are not encrypted. Anyone who scans one can read its value."* and retail notice on store products.
  - "Clear history" button and "Don't save history" toggle.
  - Formula injection defense: CSV upload/export prefixes cells starting with `=`, `+`, `-`, `@` with an apostrophe (`'`).
  - Strict upload limits: 2 MB file cap, 500 rows maximum.

- **Bulk Processing (Phase B)**:
  - Multi-mode batch generation: manual multiline paste, CSV upload with column selection, or automated sequence generation.
  - Batch export to `.zip` containing individual PNG or SVG files, and print-ready A4 label-sheet PDF.
  - Progress feedback with real-time cancel capability.

---

## [1.3.0] — Bulk Generation Unified Pipeline & Single-Generator Parity — 2026-11-01

### Added
- **Single Source of Truth for Rendering**: Unified bulk generation and single generation to call the exact same `RenderService.render` pipeline. Both modes use the identical design options, colors, fonts, bar widths, and quiet zones, producing byte-identical SVG markup.
- **Ordered Slot Mapping**: Mapped record index $i$ deterministically to `page = Math.floor(i / (cols * rows))` and `slot = i % (cols * rows)`. Slots receive unique IDs `bc-svg-${index}` and `bc-slot-${index}`.
- **Preview Persistence**: Generated preview output persists across setting modifications without being prematurely erased or invalidated. Generate is the single trigger that rebuilds the result.
- **Decoder Check Verification**: Post-generation decoder check verifies scannability of every record via `VerifyService`, reporting "X of N verified" with safe downloads for verified records.

### Changed
- **Removed Sequence Source**: Deleted the Sequence input option and related fields entirely; batch generation now cleanly accepts List (multiline paste) and CSV file uploads.
- **Removed Settings Changed Banner**: Removed yellow outdated banner and trigger logic completely.
- **Label Value Mapping**: Fixed record value resolution in sheet and roll layouts to guarantee accurate representation of raw and clean values across all 50+ slots.

---

## [1.2.1] — Save Separate Button Placement & Hover Contrast — 2026-11-01

### Fixed
- **Hover Contrast & Visibility**: Resolved low-contrast hover bug on `+ Save separate` where white text was rendered against an un-updated light blue background in light mode. Enforced high-contrast active background (`#2563EB`) with crisp white text (`#FFFFFF`) with `!important` overrides across themes.
- **Placement**: Moved the `+ Save separate` button from the left configuration panel's "Barcode Name" row to directly above the live barcode card in `BarcodePreviewPanelComponent` (`.barcode-top-action-wrap`), centering it prominently in the user's field of view when the barcode updates.

---

## [1.0.1] — Layout Fix & Accent Refresh — 2026-10-30

### Fixed
- Configured `fullBleed` layout and resolved 0px workspace height collapse.
- Applied canonical Sapphire Blue accent tokens.

---

## [1.0.0] — Initial Prototype — 2026-10-30

### Added
- Initial 1D barcode prototype using `bwip-js`.

---

## Related Documentation
- Technical Specification: [spec.md](./spec.md)
- Bulk Specification: [bulk-spec.md](./bulk-spec.md)
- Responsive Architecture: [responsive-architecture.md](./responsive-architecture.md)
- Format Registry: [format-registry.md](./format-registry.md)
- Security Baseline: [security.md](./security.md)
- Test Vectors: [test-vectors.md](./test-vectors.md)
- Library Licenses: [library-licenses.md](./library-licenses.md)

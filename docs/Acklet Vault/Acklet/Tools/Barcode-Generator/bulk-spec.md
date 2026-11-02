# Barcode Generator — Bulk Generation Specification

## 1. Overview & Architecture

The Bulk Generation subsystem in the Acklet Barcode Generator allows users to generate, review, and print or export up to 500 barcodes per run. The workflow follows a 5-stage progressive flow on a single screen:

1. **Source**: Choose data input mechanism (List or CSV File).
2. **Format**: Select target barcode symbology, variants, and symbology-specific parameters. Inherits Content tab format but can be changed independently in Bulk.
3. **Data**: Input text list or upload CSV/TSV with column mappings.
4. **Review**: Comprehensive validation, normalization, duplicate counting, label sizing fit checks, and error report downloads before generating.
5. **Output**: Select print sheet PDF, label roll PDF, ZIP of PNG, ZIP of SVG, or rasterized sheet images.

---

## 2. Root Cause Analysis & Corrections

### Original Issue: Empty ZIP & Erroneous Success Reporting
- **Blind format inheritance without validation in tab**: In the previous version, `bulk-panel` accepted `format` as an external `@Input()` without displaying the format or allowing the user to switch or verify symbology constraints in Bulk.
- **Swallowed errors**: When generating alphanumeric sequences (e.g. `ITEM-001001`) with a numeric format (e.g. `EAN-13`), all items failed validation. The generator skipped invalid items when packaging the ZIP archive.
- **Empty file download**: With 0 valid items, `JSZip` produced an empty 22-byte ZIP header, which was immediately downloaded.
- **False success message**: The UI displayed `"50 barcodes generated and downloaded"` despite 0 valid files.
- **Fake PDF export**: The previous `exportPdfLabels` method bundled raw SVG pages inside a `.zip` archive named `-a4.zip` instead of producing real printable PDFs.

### Resolved Behavior
1. **Zero-item abort guard**: When 0 valid records exist, generation aborts with `"No barcodes were created. Check the rows marked in Review."` No download is triggered.
2. **True vector PDF output**: Built-in `PdfBuilderService` produces standard PDF 1.4 documents with vector path operations, exact page dimensions, and millimetric label alignment.
3. **Manifest inclusion**: Every ZIP archive (`ZIP of PNG`, `ZIP of SVG`, `Sheet images`) includes `manifest.csv` detailing row index, value, encoded value, file name, and status.
4. **Accurate status reporting**: Success messages reflect the real generated counts and skipped rows (e.g. `"48 of 50 created on 3 pages. 2 skipped."`).

---

## 3. Data Sources

### List Source
- Processes one record per line, trimming whitespace and ignoring empty lines. Strips UTF-8 BOM.
- **Spreadsheet Paste Detection**: Automatically detects tab characters uniformly across lines and offers column selection.
- **Separator Select**: Allows splitting by New line only (default), Comma, Semicolon, or Tab.
- **Header Toggle**: Allows designating the first row as headers when column splitting is active.

### CSV Source & Drag-and-Drop Gather
- Supports `.csv`, `.tsv`, and `.txt` files up to 2 MB (up to 500 records).
- **Full-Screen Drag-and-Drop Gather Overlay**:
  - Dragging any supported tabular or text file anywhere into the Barcode Generator viewport triggers a full-screen translucent overlay (`.screen-file-gather-overlay`).
  - Overlay features dual-theme high-contrast typography, pulsing sonar rings, and spec badges (`.csv, .tsv, .txt · Max 2 MB · Up to 500 records`).
  - Dropping the file anywhere automatically routes to the Bulk tab (`setTab('bulk')`), sets the source to CSV, parses the contents, and populates the column mapping and Review step immediately.
- **Interactive Panel Dropzone**:
  - Section 3 Data dropzone provides drag-and-drop support with active hover styling (`.is-dragover`), pulsing borders, and keyboard activation (`Enter` / `Space`).
- **Interactive Empty Preview Drop Target**:
  - Empty sheet and roll preview states function as drop targets and clickable file selectors with `"Click or drop CSV"` action badges.
- **Shared Reactive State**:
  - Managed via `BulkStateService` (`csvFileName`, `csvRawText`, `csvHasHeader`, `csvValueColIdx`, `csvCaptionColIdx`) ensuring unified state synchronization across root window drops, panel dropzones, and preview targets.
- **CSV Data Table (Review Table Architecture)**:
  - Replaces unstyled raw preview with a structured data table matching the Section 4 Review table architecture (`.review-table-container.csv-table-container`, `.review-table.csv-table`).
  - **Sticky Row Column**: Left-anchored `#` row counter column (`1`, `2`, `3`...) matching the Review table layout.
  - **Column Role Badges**: Column headers dynamically render high-contrast role badges (`Value` for mapped barcode value column, `Caption` for mapped label text column).
  - **Clean Data Separation**: Parser strictly separates table headers from data rows, ensuring the first data row never duplicates the header labels.
  - **Horizontal Scroll & Density**: Table renders with `min-width: max-content` and horizontal scrolling (`overflow-x: auto`) ensuring wide multi-column tables maintain legible cell widths without awkward character wrapping.
  - **10-Row Pagination Bar**: Integrated pagination controls with Previous / Next actions and row range summary (`Showing 1–10 of N`).
- Handles quoted fields, escaped quotes (`""`), commas inside quotes, and newlines inside quotes.
- Auto-detects delimiter (comma, semicolon, tab) with manual override.
- Column mapping: Required select for barcode value column; optional select for label caption column.
- File management: Allows replacing or removing uploaded files without leaving the tab.

*(Note: Sequence source was removed to ensure reliable, explicit batch inputs via List and CSV).*

---

## 4. Review Step

- Pre-validates every record using `ValidatorService` and `SheetLayoutService.computeBarcodeSizing`.
- Sizing fit validation: checks whether symbol fits within label width and height boundaries. If too small for the label, marks row invalid with exact reason and smallest compatible preset (e.g. `"Too small for this label. Smallest label: Avery 3x8"`).
- Displays summary: `"48 valid, 2 need attention, 3 duplicates."`
- 10-row expandable preview table with pagination showing Row, Value, Encoded as, and Status.
- Invalid rows highlighted in red with exact reasons.
- **Options**:
  - `Skip invalid rows`: Generate button is disabled until invalid rows are resolved or this checkbox is enabled.
  - `Remove duplicates`: Filters out duplicate values before generation.
- **Download Error Report**: Exports CSV with `Row,Value,Reason` for fixing source files.
- **Formula Injection Defense**: Escapes any value starting with `=`, `+`, `-`, `@` with a leading single quote `'` in all CSV exports and manifests.

---

## 5. Output Presets & Generation

### Print Sheet (PDF)
- Supports A4 (210 × 297 mm) and US Letter (8.5 × 11 in).
- 9 manufacturer presets (Avery, Herma) + plain paper auto-grid + custom dimensions.
- Features: "Show cut guides" (dashed borders for plain paper), "Show label text from caption column".
- Automatic text sizing: largest size up to 10 pt that fits symbol width and ~25% of label height, never below 6 pt.
- Print instruction notice: `"Print at 100%, actual size. Do not use Fit to page."`

### Label Roll (PDF)
- Thermal label roll presets: 25×15, 38×25, 50×25, 50×30, 100×50, 100×150 mm, plus custom.
- One page per label with exact roll dimensions.
- Thermal printer dot pitch snapping at 203 or 300 DPI for sharp bar edges without interpolation jitter.
- Printer resolution notice: `203 / 300 DPI supported natively`.

### ZIP Archives
- Unique sanitized file names: `001-VALUE-format.ext` (max 80 chars, removes invalid characters and Windows reserved names).
- High-resolution 300 DPI rasterization for PNG; vector paths for SVG.
- Always includes `manifest.csv`.

---

## 6. Live Bulk Preview & Single Page Model

- **Generate-Gated Preview**: Before the user clicks the "Generate N barcodes" button, the preview displays only layout placeholder grids with empty slots (dashed borders) and an instructional banner ("Click Generate in the left panel to create barcodes"). No barcode SVGs or canvases render prior to explicit generation.
- **Preview Persistence & Unified Generation Trigger**: Changing settings does not show an outdated warning banner and does not alter or erase the preview. The preview persistently shows the last generated result until the user clicks the Generate button again. Generate is the single trigger that rebuilds the result.
- **Unified Rendering Pipeline Parity**: Bulk generation and single barcode generation (Content tab) invoke the exact same service (`RenderService.render`) with identical design options, colors, fonts, bar widths, and quiet zones. Every record produces a byte-identical SVG instance.
- **Ordered Slot Mapping & Unique IDs**: Records are processed in an ordered loop with index $i$:
  - `page = Math.floor(i / (cols * rows))`
  - `slot = i % (cols * rows)`
  - `row = Math.floor(slot / cols)`
  - `col = slot % cols`
  Each slot is assigned unique DOM IDs (`bc-svg-${index}` and `bc-slot-${index}`). Empty slots on the final page remain clean dashed outlines with no duplicate barcodes.
- **Post-Generation Symbology & Scannability Verification**:
  - Generated barcodes run through high-accuracy symbology verification via [`VerifyService`](../../../../client/apps/tool-barcode-generator/src/services/verify.service.ts) (including native `BarcodeDetector`, `@zxing/library`, and a dedicated vector stroke parser for Standard 2 of 5).
  - Verification badge displays `"X of N verified"` (e.g. `"50 of 50 verified"` or `"48 of 50 verified, 2 failed"`).
  - When verification failures occur, Download/Print actions prevent silent corrupted exports and offer a dedicated **"Download verified only (X)"** action alongside a "Fix and regenerate" recommendation.
- **Single Page Model Engine (`SheetLayoutService`)**: A single authoritative layout function computes `SheetPageModel[]` (for sheets) and `RollLabelModel[]` (for rolls) containing all positions, margins, barcode boxes, captions, and cut guides in millimetres. The preview, vector PDF, PNG rasterization, ZIP archives, and Print action all consume this exact model, guaranteeing pixel-perfect parity across preview and exports.
- **Custom Layout System**:
  - Exposes editable inputs for columns, rows, label width, label height, horizontal gap, vertical gap, left margin, and top margin.
  - Validates total required width and height against selected page size (`A4` or `Letter`) in real time, alerting if dimensions exceed printable bounds and preventing generation runs when invalid.
  - Page count equals `Math.ceil(items / (cols * rows))` (e.g. 50 items on 5 × 13 yields 1 page of 65 slots; 50 items on 4 × 10 yields 2 pages).
- **Uniform Scaling & Sizing Profiles (`computeBarcodeSizing`)**:
  - Barcodes are never arbitrarily squeezed or stretched.
  - Variable-width linear formats fill >= 70% of inner label width up to `maxXmm`.
  - Fixed-size retail formats scale by magnification $M$ (80% to 200%). If height is constrained, height is truncated down to min 60% with an `isReducedHeight` tag and warning chip.
  - 2D matrix formats scale cells between 0.25 mm and 0.80 mm.
- **Continuous Vertical Roll Series (Finding F5)**:
  - Displays all roll labels in series as a continuous vertical strip.
  - Each label drawn at exact aspect ratio with cut marks (`--- ✂ ---`).
  - Outside label card: row number (`#1`, `#2`, `#3`...) and module width.
  - Outside strip header: `"50 labels on roll (50 × 25 mm · 203 / 300 DPI)"`.
  - Real-time scroll tracker: `"Label 12 of 50"` updating on scroll, with a jump-to-label input.
  - Page navigation (`Page X of Y`) hidden for rolls.
- **High-Contrast Zoom Segmented Control (Finding F4)**:
  - Buttons: Fit, 100%, 150% with min 44 px touch targets, `white-space: nowrap`, and WCAG AA high-contrast tokens.
  - Responsive positioning avoiding collisions with title and navigation.
- **Bottom Action Bar (Finding F8)**:
  - Summary text: `"50 labels, 2 pages (Page 1 of 2)"` or `"50 labels on roll (50 × 25 mm)"`.
  - Primary **Download** button triggers the configured export run.
  - **Print** button (Finding F3): Dedicated hidden iframe print document containing only `.print-page` elements and SVG data with `@page { size: ...; margin: 0; }`. Prints only the labels without application UI, browser headers, or footers.
  - **More** menu: Print alignment test sheet, export manifest CSV, download error report CSV.
- **Keyboard Navigation**: Left and right arrow keys paginate through multi-page sheets.

---

## 7. Left Panel 5-Step Progressive Architecture

The bulk generator panel is structured as 5 concise progressive sections:
1. **Source**: Tab selector for text list (pasted rows) or CSV file upload.
2. **Format**: Format picker dropdown matching the Content tab, symbology category badge, and link to Customize tab.
3. **Data**: Input area (textarea with row counter and delimiter options for List, or drag-and-drop file upload with column mapping for CSV) with current count badge (`X / 500`).
4. **Review**: Validation summary (`X valid, Y need attention`), expandable records table, and skip-invalid rows toggle.
5. **Output**: Target selector (Print sheet PDF, Label roll PDF, ZIP of PNG, ZIP of SVG, Sheet images PNG) with label presets and custom dimension inputs.
*(Note: Legacy Section 6 Content preview thumbnails were removed to ensure generating is the exclusive gateway to rendering barcodes).*

---

## 8. Alignment & Fine-Tuning Calibration

- **Nudge Offsets**: Horizontal and vertical nudge inputs from `-5 mm` to `+5 mm` with `0.5 mm` step resolution for physical printer feed compensation.
- **Export Resolution**: Toggleable DPI settings (150, 300, 600 DPI) for rasterized sheet images and PNG outputs.
- **Alignment Test Page**: Generates an exact grid overlay matching the selected sheet preset with centimeter and millimeter rulers, printer margin verification corners, and label boundary crosshairs.

---

## 9. Runtime Caption Styling & Floating Toast Popup

When CSV or list records contain caption text, label text size and alignment must fit label cell bounds without colliding with adjacent barcodes.

- **Unitless SVG Coordinates**: Caption font size is calculated in millimeters and embedded unitless inside the SVG `viewBox` (e.g. `font-size="2.82"`), avoiding browser screen millimeter (`"mm"`) inflation.
- **Bounding Box Clamping**: Captions enforce `textLength` and `lengthAdjust="spacingAndGlyphs"` constrained to `label.innerWidth - 3 mm` so long product titles never collide or overlap adjacent label slots.
- **Floating Toast Interface (`.caption-toast-card`)**:
  - Anchored to the Bulk Preview header toolbar, toggled via the `Caption Style` pill button with live indicator dot.
  - **Size**: Fast segmented controls (`Auto`, `6 pt`, `7 pt`, `8 pt`, `9 pt`, `10 pt`).
  - **Color**: Curated contrast presets (`Slate #334155`, `Black #000000`, `Muted #64748B`, `Sapphire #0284C7`, `Crimson #DC2626`) plus a custom color picker input.
  - **Style**: One-click toggles for Bold (`B`), Monospace (`Mono`), Uppercase (`AA`), and text alignment (`Left`, `Center`, `Right`).
  - **Reset**: 1-click restore to standard clean defaults.
- **Zero Impact on Barcode Generation (Pure Runtime)**:
  - Caption modifications apply directly to the SVG layout assembly without re-running barcode encoding.
  - Does not mark barcodes as outdated and does not require clicking `Generate N barcodes`.
  - Propagates with 100% visual parity across Live Preview, hidden iframe Print, PDF Sheet/Roll, and PNG sheet exports.




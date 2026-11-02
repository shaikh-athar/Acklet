# Barcode Generator — Issues and Fixes Log

This document tracks bugs, design discrepancies, and cross-tool issues identified during development, along with their root causes and resolutions.

---

## Issue 1: Test Spec Typo in UPC-E Compression
- **Problem**: `check-digit.service.spec.ts` attempted to call `compressUpceToUpce` which resulted in a TypeScript compilation error.
- **Root Cause**: Typo in method name in the spec file; the service method is named `compressUpcaToUpce`.
- **Fix**: Updated the test specification to call `service.compressUpcaToUpce('012345000055')`.

---

## Issue 2: Dark Theme Barcode Inversion
- **Problem**: In Dark Theme, barcodes could blend into dark container backgrounds or produce light bars on dark backgrounds, which fail optical laser barcode scanners.
- **Root Cause**: Inheriting dark surface colors directly onto the barcode canvas.
- **Fix**: Engineered an isolated light "paper" stage container with guaranteed white background (`#FFFFFF`), standard quiet zone padding, and subtle contrast framing. Added real-time optical contrast checking ($0.2126R + 0.7152G + 0.0722B$) that warns users if they choose an inverted color scheme ($< 3:1$).

---

## Issue 3: Make QR Navigation Requiring Manual Input
- **Problem**: When a user was typing a URL into the Barcode Generator, the suggestion banner prompted to open the QR Generator, but clicking the link opened an empty QR tool requiring manual copy-pasting of the URL.
- **Root Cause**: The redirect link pointed to a generic `/qr` URL without query parameters, and `QRGeneratorComponent` lacked query parameter extraction logic on initialization.
- **Fix**:
  1. In `content-panel.component.ts`: Updated the recommendation link to point to `/qr?url=${encodeURIComponent(val)}` with the label `Make QR →`.
  2. In `qr-generator.component.ts`: Added `applyIncomingQuery` to inspect `searchParams` (`url`, `link`, `text`, `value`), set `selectedType` to `url`, set `content` to the URL, and trigger immediate generation.
  3. In `input-panel.component.ts`: Added `syncContentEffect` to synchronize incoming `content()` signal into `websiteData.url` so the input field displays the URL immediately.

---

## Issue 4: TS2322 BlobPart Uint8Array Incompatibility
- **Problem**: In TypeScript 5.5+ DOM typings, `Uint8Array<ArrayBufferLike>` is not assignable to `BlobPart` due to potential `SharedArrayBuffer` property incompatibility on `new Blob([pdfString])`.
- **Root Cause**: `assemblePdfWithImage` converted an already assembled ASCII PDF string to a `Uint8Array` via `TextEncoder`, which conflicted with `BlobPart` typing in newer TS versions.
- **Fix**: Updated `assemblePdfWithImage` to return `string` directly, which drops directly into `new Blob([pdfString], { type: 'application/pdf' })` with zero buffer conversion and full type safety.

---

## Issue 5: Empty ZIP & Erroneous Success Reporting in Bulk Generation
- **Problem**: Generating barcodes when items failed validation produced an empty 22-byte ZIP archive while the UI falsely claimed `"50 barcodes generated and downloaded"`.
- **Root Cause**: Lack of pre-flight zero-validity abort check and failure of earlier generation loops to propagate validation errors before ZIP packaging.
- **Fix**: Implemented a hard zero-item abort guard in [`BulkGeneratorService`](../../../../client/apps/tool-barcode-generator/src/services/bulk-generator.service.ts) aborting execution with `"No barcodes were created. Check the rows marked in Review."` Added accurate status counters reporting exact valid and skipped totals.

---

## Issue 6: Multi-Barcode Canvas and Loop ID Collision (Only First Barcode Rendered)
- **Problem**: When generating batches in Bulk mode, only the first record rendered a correct barcode, while all subsequent records failed to render or scan.
- **Root Cause**:
  1. The bulk renderer reused a single DOM ID (`bc-svg`, `bc-slot`) across iterations, causing subsequent iterations to mutate or fail to bind to distinct DOM slots.
  2. The bulk tab used a separate bulk-only rendering template rather than the unified engine used by the single generation Content tab.
- **Fix**:
  1. Extracted rendering into a single shared service ([`RenderService`](../../../../client/apps/tool-barcode-generator/src/services/render.service.ts)) called identically for both single and bulk generation.
  2. Iterated records in an ordered synchronous array loop assigning unique IDs per slot (`bc-svg-${index}` and `bc-slot-${index}`).
  3. Guaranteed each record receives an independent vector SVG instance with unique position attributes.

---

## Issue 7: Unwanted Settings Changed Banner & Unscheduled Live Regeneration
- **Problem**: Changing any setting in the left panel displayed an intrusive yellow warning banner (*"Settings changed. Regenerate to update preview."*) or triggered premature re-rendering of the entire bulk preview.
- **Root Cause**: Reactive signals in `bulk-panel` triggered an `isOutdated` state flag on any form change.
- **Fix**: Completely removed the yellow warning banner and its outdated tracking state. Changing settings no longer alters or marks the preview as outdated. The preview persistently shows the last generated result until the user explicitly clicks the "Generate" button.

---

## Issue 8: Large Caption Overlap on Small Label Slots
- **Problem**: When records contained long product names or captions, captions rendered in huge font sizes, overflowing their label slots and overlapping adjacent barcodes.
- **Root Cause**: Browsers treated font size values specified with millimeter units (e.g. `font-size="2.82mm"`) inside an SVG `viewBox` as CSS physical screen millimeters (~3.78x larger than viewBox user units).
- **Fix**:
  1. Converted font size values in [`SheetLayoutService`](../../../../client/apps/tool-barcode-generator/src/services/sheet-layout.service.ts) to unitless user units inside the SVG `viewBox`.
  2. Added SVG text bounding box clamping with `textLength` and `lengthAdjust="spacingAndGlyphs"` constrained to `label.innerWidth - 3 mm`.
  3. Built the Runtime Caption Styling Floating Toast Toolbar ([.caption-toast-card](../bulk-spec.md#9-runtime-caption-styling--floating-toast-popup)) allowing live adjustments to font size, color, and alignment with zero barcode re-encoding.

---

## Issue 9: Drag-and-Drop Inconvenience & Unformatted CSV Text Dump
- **Problem**: Dropping a CSV file required the user to already be on the Bulk tab and hover over a small drop zone. Furthermore, the uploaded CSV content was displayed as a raw unformatted text dump.
- **Root Cause**: Drag listeners were scoped only to the small Section 3 drop zone, and CSV preview lacked structured tabular presentation.
- **Fix**:
  1. Built `.screen-file-gather-overlay` in `barcode-generator.component.ts` listening to window-level drag events. Dropping any `.csv`, `.tsv`, or `.txt` file anywhere automatically navigates to the Bulk tab, sets CSV source mode, and parses the file.
  2. Rebuilt the Section 3 CSV preview into a structured data table matching the Section 4 Review table layout with sticky `#` row counter column, dynamic column role badges (`Value`, `Caption`), and 10-row pagination.

---

## Issue 10: Non-Canonical Breakpoint Collisions on Narrow Screens
- **Problem**: On mobile and tablet screens, form inputs and preview panels competed for horizontal space, causing truncated layout badges, overlapping zoom buttons, and unreachable action buttons.
- **Root Cause**: Components used ad-hoc media queries (`@media (max-width: 768px)`, `max-width: 1024px`) without unified breakpoint token definitions.
- **Fix**: Defined canonical tokens in [`responsive-tokens.ts`](../../../../client/apps/tool-barcode-generator/src/config/responsive-tokens.ts) (`sm: 0-639px`, `md: 640-1023px`, `lg: 1024-1439px`, `xl: 1440px+`). Implemented dedicated small screen workflow with 4th `"Preview"` tab, collapsible preview on `md` with `"Show preview"` toggle, dropdown zoom select, and safe-area inset bottom padding.

---

## Issue 11: Inconsistent Active State Accent Color (Migration to Sapphire Blue)
- **Problem**: Active segmented buttons and tabs displayed green styling (`var(--accent-emerald, #059669)`), which conflicted with the tool's registered Sapphire Blue brand identity (`#2563EB` / `#3B82F6`, hue 217). Additionally, light theme active buttons suffered poor text contrast.
- **Root Cause**: Legacy component CSS rules had hardcoded emerald variables and light-mode overrides.
- **Fix**: Replaced all instances of `--accent-emerald` with `var(--tool-accent, #2563EB)`. Scoped `.is-active` in both themes with `color: #FFFFFF !important; background: #2563EB; font-weight: 700;`, guaranteeing `>= 4.5:1` WCAG AA contrast across both light and dark themes.

---

## Issue 12: JIT / Angular Compiler Error in Node Test Environment for Responsive Testing
- **Problem**: Running `responsive-layout.spec.ts` under Vitest produced `PlatformLocation needs to be compiled using the JIT compiler` and `window is not defined`.
- **Root Cause**: Importing `ResponsiveService` via `@acklet/tool-shell` triggered Angular core package resolution requiring JIT compilation, and Node environment lacked browser `window` globals.
- **Fix**: Added `import '@angular/compiler';`, imported `ResponsiveService` directly from the local package source path, and added an SSR/test-friendly `setViewportDimensions(width, height)` method with `typeof window !== 'undefined'` safety guards.

---

## Related Documentation
- Implementation Log: [implementation-log.md](./implementation-log.md)
- Technical Specification: [spec.md](../spec.md)
- Bulk Specification: [bulk-spec.md](../bulk-spec.md)
- Responsive Architecture: [responsive-architecture.md](../responsive-architecture.md)

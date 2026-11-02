# Barcode Generator — Baseline Requirements & Quality Standards

This document establishes the hard technical constraints, quality standards, and baseline requirements for the Acklet Barcode Generator.

---

## 1. Hard Architectural Rules

1. **Zero External Git Operations**: No git commands are executed automatically during development tasks. Working tree state remains uncommitted for developer review.
2. **Zero Unauthorized npm Packages**: No external npm dependencies or heavy third-party packages are introduced without explicit user approval.
3. **Registry-Driven Design**: No hardcoded formats, regexes, lengths, or default options inside component markup or templates. All values reside in [`barcode-registry.ts`](../../../../client/apps/tool-barcode-generator/src/config/barcode-registry.ts) and [`barcode-catalog.config.ts`](../../../../client/apps/tool-barcode-generator/src/config/barcode-catalog.config.ts).
4. **Isolated Surface Scope**: Changes are strictly confined to `apps/tool-barcode-generator/` and designated shared registry manifests. No styling or logic leaks into other Acklet tools.
5. **Pure Browser Execution**: All processing occurs locally on the client. No entered values or barcode outputs are sent to any remote server or third-party service.

---

## 2. UI/UX & Responsive Standards

1. **Dual-Theme High Contrast**: Full compliance with WCAG AA (>= 4.5:1) in both Light and Dark modes. Active segmented buttons, tabs, and focus outlines use Sapphire Blue (`var(--tool-accent, #2563EB)`) with `#FFFFFF` text. The barcode preview rests on a pure white/light paper stage in both modes so physical scan behavior is accurately represented.
2. **Canonical 4-Breakpoint System**: Strictly adhere to tokens defined in [`responsive-tokens.ts`](../../../../client/apps/tool-barcode-generator/src/config/responsive-tokens.ts) (see [Responsive Architecture](../responsive-architecture.md)):
   - **`sm` (0–639px)**: Single column with 16px side padding. Dedicated 4th `"Preview"` tab in tab strip. Form and preview never render side-by-side. Sticky bottom action bar with `env(safe-area-inset-bottom)`. Compact `"Download (N)"` button label.
   - **`md` (640–1023px)**: Single column stacked layout. Collapsible preview section underneath active tab with `"Show preview"` toggle button. Compact zoom dropdown select.
   - **`lg` (1024–1439px)**: Two-column grid. Left control panel clamped between `380px` and `520px`. Right preview panel sticky to top with internal scroll. High-contrast segmented zoom controls.
   - **`xl` (1440px+)**: Two-column layout centered within `max-width: 1600px` container. Preview grows vertically without awkward horizontal stretching.
3. **Touch Target Sizing**: All interactive touch targets (buttons, inputs, pills, dropdown triggers) maintain minimum `44px × 44px` dimensions on mobile and tablet breakpoints.
4. **Focus Rings**: Standardized `2px solid var(--tool-accent, #2563EB)` focus outline with `2px` offset on all keyboard-navigable elements.
5. **No Layout Shift & Zero-Spill Scroll**: Live typing, character counting, and validation warnings must not cause jarring layout displacement. Horizontal scrolling occurs strictly inside canvas containers (`overflow-x: auto`), never scrolling the root window.

---

## 3. Mathematical & Standards Compliance

1. **Universal GS1 Modulo-10**: Check digit calculation for EAN-13, EAN-8, UPC-A, ISBN-13, and ITF-14 must strictly follow GS1 General Specifications using right-to-left alternating weights (3 and 1).
2. **Code 39 Check Character**: Must follow Modulo-43 rules.
3. **Code 93 Check Characters**: Must calculate dual Modulo-47 C and K characters in sequence.
4. **UPC-E Compression**: Must implement zero-suppression rules according to UCC/EAN specifications.
5. **Quiet Zone Enforcements**: Enforce minimum quiet zone padding of at least 10 module widths on left and right borders to guarantee scanner recognition.

---

## 4. Bulk Generation & Print Quality Standards

1. **Unified Rendering Parity**: Bulk generation must call the exact same [`RenderService`](../../../../client/apps/tool-barcode-generator/src/services/render.service.ts) pipeline as single generation. Output barcodes must be byte-identical in vector geometry, bar width, quiet zones, and colors.
2. **Deterministic Inputs**: Support text List and CSV/TSV file uploads. Sequences are excluded in favor of explicit batch data.
3. **Generate-Gated Preview**: Empty slots display clean dashed outlines before generation. Clicking "Generate N barcodes" is the single trigger that builds output. Settings changes must not show warning banners or erase the preview.
4. **Single Page Model Engine**: All sheet and roll geometry is computed in millimeters by [`SheetLayoutService`](../../../../client/apps/tool-barcode-generator/src/services/sheet-layout.service.ts). Live preview, vector PDF, canvas rasterizer, and isolated iframe print engine all consume this exact model.
5. **Isolated Iframe Printing**: Printing must use a dedicated hidden iframe containing only `.print-page` elements and SVG data with `@page` sizing, printing labels at exact 100% scale without browser headers, footers, or application UI.
6. **Runtime Caption Styling**: Floating toast toolbar enables live caption size, color, font styles, and alignment adjustments. Captions must use unitless SVG coordinates and bounding box length clamping (`textLength`) to eliminate browser font inflation without requiring barcode regeneration.
7. **Post-Generation Verification**: Every generated barcode is decoded and verified before download. If any barcode fails verification, "Download verified only" safe export must be available alongside failure details.
8. **Zero-Item Abort Guard**: When 0 valid records exist, generation aborts with an informative message; no empty ZIP archive or corrupted PDF is downloaded.
9. **Formula Injection Defense**: Escapes any value starting with `=`, `+`, `-`, `@` with a leading single quote `'` in all CSV exports and manifests.

---

## 5. Related Documentation
- Technical Specification: [spec.md](../spec.md)
- Bulk Specification: [bulk-spec.md](../bulk-spec.md)
- Responsive Architecture: [responsive-architecture.md](../responsive-architecture.md)
- Label Templates: [label-templates.md](../label-templates.md)
- Feature List: [features.md](./features.md)

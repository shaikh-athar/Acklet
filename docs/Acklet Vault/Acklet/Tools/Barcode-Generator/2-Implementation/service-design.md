# Barcode Generator — Service Design & Architecture

This document describes the services, adapters, algorithms, and state management patterns powering the Barcode Generator.

---

## 1. Services Overview

| Service | File Path | Role | State Management |
| :--- | :--- | :--- | :--- |
| **`RenderService`** | `services/render.service.ts` | Unified single source of truth for barcode SVG rendering (single and bulk parity) | Stateless renderer |
| **`BulkStateService`** | `services/bulk-state.service.ts` | Centralized reactive signal store for bulk data, mappings, validation, and preview | Angular Signals |
| **`SheetLayoutService`** | `services/sheet-layout.service.ts` | Single Page Model engine: computes millimetric geometry for sheets and rolls | Pure geometric calculator |
| **`PdfBuilderService`** | `services/pdf-builder.service.ts` | Pure client-side, zero-dependency PDF 1.4 vector generator | Stateless PDF assembler |
| **`BulkGeneratorService`** | `services/bulk-generator.service.ts` | Multi-target export packager (PDF, ZIP of PNG/SVG, Sheet images) with manifest | Async stream orchestrator |
| **`VerifyService`** | `services/verify.service.ts` | Post-generation scannability verification (`BarcodeDetector`, `@zxing/library`, stroke parser) | Multi-engine decoder |
| **`ResponsiveService`** | `packages/tool-shell/src/services/` | Viewport dimension provider and canonical breakpoint state (`sm`, `md`, `lg`, `xl`) | Angular Signals |
| **`BarcodeCheckDigitService`** | `services/check-digit.service.ts` | Universal GS1 Modulo-10, Code 39 Modulo-43, Code 93 C/K, UPC-E suppression | Pure mathematical utility |
| **`BarcodeEngineAdapter`** | `services/barcode-engine.adapter.ts` | Binary module encoding, vector path construction | Stateless adapter |
| **`BarcodeExportService`** | `services/barcode-export.service.ts` | Single mode PNG rasterization at 300 DPI, vector SVG download, PDF export | Stateless exporter |
| **`BarcodeHistoryService`** | `services/barcode-history.service.ts` | Local history storage (up to 20 items), restore, deletion | Angular Signals + `localStorage` |

---

## 2. Unified Rendering Pipeline (`RenderService`)

To eliminate discrepancies between single-barcode output and bulk-generation output, both workflows invoke the exact same method:

```typescript
render(value: string, formatId: string, options?: BarcodeRenderOptions): BarcodeRenderResult
```

### Guarantees:
1. **Identical Visual Geometry**: Single generation and bulk generation produce byte-identical vector SVG paths for any given value and formatting configuration.
2. **Quiet Zone Enforcements**: Same quiet zone margins, bar widths, and font properties apply universally.
3. **Independent DOM Instances**: Bulk generation iterates synchronously over input records and yields distinct SVG instances with unique slot identifiers (`bc-svg-${index}`), preventing DOM node or canvas reuse across iterations.

---

## 3. Single Page Model Engine (`SheetLayoutService`)

Rather than letting layout logic vary across preview rendering, PDF generation, canvas drawing, and browser printing, a single authoritative calculation produces:
- `SheetPageModel[]` for sheet presets (A4, US Letter, plain paper grid, custom).
- `RollLabelModel[]` for thermal roll presets (25×15 up to 100×150 mm, custom).

### Layout Geometry Properties:
Each page and label model contains exact physical dimensions in millimeters:
- `widthMm`, `heightMm`
- `columns`, `rows`
- `labelWidthMm`, `labelHeightMm`
- `gapHorizontalMm`, `gapVerticalMm`
- `marginTopMm`, `marginLeftMm`
- Inner label bounding box (`innerWidthMm`, `innerHeightMm`)

### Symbology Sizing Profiles (`computeBarcodeSizing`):
- Variable-width linear codes: Scale to occupy $\ge 70\%$ of inner label width up to maximum allowable width.
- Retail fixed formats: Scale via magnification factor $M$ ($80\%$ to $200\%$) based on label height. If constrained, height truncates down to $60\%$ with an `isReducedHeight` tag.
- 2D matrix formats: Scale individual modules between $0.25\text{ mm}$ and $0.80\text{ mm}$.
- Thermal dot pitch snapping: Snaps dimensions to integer dot multiples at 203 DPI ($0.125\text{ mm/dot}$) or 300 DPI ($0.0847\text{ mm/dot}$).

---

## 4. Vector PDF Generation (`PdfBuilderService`)

`PdfBuilderService` builds standard PDF 1.4 documents completely client-side with zero external PDF libraries:
1. **Exact Page Sizing**: Converts millimeter dimensions to typographic points ($1\text{ mm} = 72 / 25.4\text{ pt} \approx 2.8346\text{ pt}$) embedded in `/MediaBox [0 0 width pt height pt]`.
2. **Vector Path Operations**: Converts SVG `<path>` and `<rect>` elements into native PDF drawing operators (`re f` for rectangles, `m l h f` for paths).
3. **Typography**: Embeds standard font definitions (`/Courier` or `/Helvetica`) and places captions with millimetric precision.
4. **Stream Compression & Cross-Reference Table**: Assembles complete PDF body, xref offsets table, and `/Trailer` dictionary into an ASCII string converted to a browser `Blob`.

---

## 5. Universal GS1 Modulo-10 Algorithm

Calculates checksums using standard right-to-left weighting:

```typescript
calculateGs1Mod10(digitsWithoutCheck: string): string {
  const clean = digitsWithoutCheck.replace(/\D/g, '');
  if (!clean) return '';

  let sum = 0;
  let weight = 3;

  for (let i = clean.length - 1; i >= 0; i--) {
    const val = parseInt(clean[i], 10);
    sum += val * weight;
    weight = weight === 3 ? 1 : 3;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit.toString();
}
```

This single algorithm powers EAN-13, EAN-8, UPC-A, ISBN-13, and ITF-14.

---

## 6. Post-Generation Verification Engine (`VerifyService`)

Decodes and validates every generated barcode:
1. **Tier 1 — Native `BarcodeDetector`**: Leverages browser-native hardware-accelerated detection when available.
2. **Tier 2 — `@zxing/library`**: High-accuracy fallback decoder for 1D and 2D formats.
3. **Tier 3 — Vector Stroke Parser**: Dedicated analytical parser for Standard 2 of 5 that reconstructs digits directly from SVG narrow/wide bar patterns.
4. **Safe Export Gating**: Surfaces an `"X of N verified"` status pill and provides `"Download verified only"` safe export if any record fails.

---

## 7. Responsive Viewport Provider (`ResponsiveService`)

Maintains canonical breakpoint states (`sm`, `md`, `lg`, `xl`) backed by Angular signals. Features SSR and test-environment safety guards (`setViewportDimensions(width, height)`) enabling headless verification in unit test suites.

---

## Related Documentation
- Component Tree: [component-tree.md](./component-tree.md)
- Bulk Specification: [bulk-spec.md](../bulk-spec.md)
- Responsive Architecture: [responsive-architecture.md](../responsive-architecture.md)
- Styling Guide: [styling-guide.md](./styling-guide.md)
- Testing Strategy: [testing-strategy.md](./testing-strategy.md)

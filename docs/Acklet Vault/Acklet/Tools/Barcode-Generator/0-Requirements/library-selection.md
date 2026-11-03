# Barcode Generator — Library Selection & Engine Strategy

This document details the architectural decisions and library selections evaluated during the design of the Acklet Barcode Generator engine.

---

## 1. Engine Options Evaluated

| Option | Method | Pros | Cons | Decision |
| :--- | :--- | :--- | :--- | :--- |
| **Option A: Pure Custom Vector Adapter** | Generates SVG paths directly from binary module widths | Zero npm dependencies, 100% offline, tiny bundle footprint (< 15KB), infinite vector scalability, complete control over quiet zones, bearer bars, and text positioning | Requires manual module tables for 11 formats | **SELECTED** |
| **Option B: bwip-js** | C-based barcode engine compiled to WebAssembly / JS | Comprehensive symbology support (over 100 formats), supports 2D | Large bundle size (> 400KB), heavy for simple 1D tasks, potential licensing & security vetting overhead | Deferred to Phase 2 for complex 2D formats |
| **Option C: JsBarcode** | Standard 1D barcode generator | Easy to use for 1D | Requires external npm dependency, lacks bearer bar options for ITF-14, lacks UPC-E zero-suppression | Rejected |

---

## 2. Selection Rationale

### Why Option A (Pure Custom Vector Adapter) Won:
1. **Engineering Discipline & YAGNI**: The monorepo operating rules explicitly discourage introducing new npm packages when native platform features and simple implementations suffice.
2. **Infinite Resolution**: Generating SVG markup using precise `<path d="M..."/>` rectangles guarantees crisp, lossless rendering at any print dimension without raster pixelation or blur.
3. **Decoupled Architecture**: All generation logic is hidden behind the `BarcodeEngineAdapter` interface. In Phase 2, if complex 2D symbologies (like DataMatrix or Aztec) require bwip-js, it can be loaded lazily as a drop-in replacement without touching any UI component.
4. **Performance**: Module encoding for 11 formats takes less than 2ms, with zero WebAssembly startup delay or initialization overhead.

---

## 3. Silent Verification Strategy

To satisfy the verification requirement without intruding on the user experience:
1. **Primary Verifier**: Modern browser native `BarcodeDetector` API. Supported natively in Chromium-based browsers, it executes hardware-accelerated decode checks against rendered canvas bitmaps in the background.
2. **Fallback**: If `BarcodeDetector` is unavailable (e.g., in Firefox or Safari), verification logs gracefully without blocking generation or displaying noisy warning popups.
3. **No Disruptive Popups**: If verification passes, no intrusive badges are shown. If verification detects a mismatch or cannot decode, a quiet warning pill appears below the preview canvas.

# Barcode Generator — Technical Learnings & Patterns

This document records architectural discoveries, performance insights, and engineering patterns established during the development of the Barcode Generator.

---

## 1. Mathematical Generalization (Universal Modulo-10)

### Challenge
Initially, standard implementations treated EAN-13, EAN-8, UPC-A, and ITF-14 as separate check-digit routines with different starting weights and odd/even position rules.

### Solution
Analyzing the positions revealed that regardless of total code length (8, 12, 13, or 14 digits), moving backwards from the digit immediately preceding the check digit always requires weight 3 for the first processed character, then alternates 1, 3, 1, 3...
```typescript
let weight = 3;
for (let i = clean.length - 1; i >= 0; i--) {
  sum += parseInt(clean[i], 10) * weight;
  weight = weight === 3 ? 1 : 3;
}
```
This discovery eliminated duplicate branching code and guaranteed 100% mathematical correctness across all GS1 retail and logistics formats.

---

## 2. Pure Vector Path Generation vs Raster Canvas

### Insight
Generating barcode graphics directly as SVG path commands (`d="M x y h width v height h -width Z"`) delivers significant advantages over rendering to an intermediate HTML `<canvas>`:
- **Infinite Scalability**: SVGs resize cleanly to billboard or micro-label scale without blur or aliasing artifacts.
- **Zero Memory Overhead**: Canvas elements consume substantial browser GPU/RAM memory when rendered at high resolutions (e.g. 2048px). Vector SVG strings require less than 1KB of memory.
- **Instant DOM Injection**: Directly rendering inline SVG into Angular template bindings avoids flickering, asynchronous image loading, or canvas redraw delays.

---

## 3. High-Contrast Paper Stage for Dual Themes

### Challenge
In dark mode, dark cards with transparent or dark backgrounds create inverted barcodes (light bars on dark backgrounds). While aesthetically sleek, optical laser scanners rely on red laser reflections off light backgrounds and cannot read inverted codes.

### Solution
Instead of forcing the whole application into light mode, the preview canvas sits inside an explicit "paper" card surface with a guaranteed pure white or light background and a minimum 10-module quiet zone margin. The surrounding tool UI remains in structured dark theme, giving users the best of both worlds: modern dark UI and 100% scan-reliable barcode output.

---

## 4. Single-Shot Scan Line Animation

### Challenge
Running continuous or repetitive reveal animations every time a user types a character causes severe UI fatigue and visual distraction.

### Solution
A single boolean state (`shouldAnimateScan`) triggers the laser sweep animation (0.65s) only on the user's very first barcode generation. Subsequent input updates modify the SVG paths immediately without replaying the animation, maintaining instant responsiveness while retaining that initial "wow" factor.

---

## 5. Browser SVG Font Inflation inside viewBox

### Challenge
Specifying physical units such as `font-size="2.82mm"` inside an SVG `viewBox` (with dimensions in millimeters) causes browsers to evaluate the font size using physical screen CSS millimeters (~3.78px per mm) rather than viewBox user units. This results in huge captions that overflow their label cells.

### Solution
Compute font sizes in millimeters and emit them as **unitless user units** inside the `viewBox` (e.g., `font-size="2.82"`). Complement this with SVG text bounding box clamping via `textLength` and `lengthAdjust="spacingAndGlyphs"` constrained to `label.innerWidth - 3 mm` to guarantee captions never overlap adjacent barcodes.

---

## 6. Single Page Model for Multi-Target Consistency

### Challenge
Calculating label positions separately in live preview HTML, PDF generators, canvas rasterizers, and browser print stylesheets inevitably leads to subtle millimetric misalignments.

### Solution
Centralize all physical millimeter math into [`SheetLayoutService`](../../../../client/apps/tool-barcode-generator/src/services/sheet-layout.service.ts). It generates an immutable `SheetPageModel[]` and `RollLabelModel[]`. The SVG preview, vector PDF builder, canvas drawing, and print document all consume the exact same coordinate array.

---

## 7. Isolated Hidden Iframe Printing vs window.print()

### Challenge
Calling `window.print()` prints the entire active web page, necessitating complex `@media print` rules to hide sidebars, headers, and toolbars, and often leading to unwanted browser headers, footers, and margins.

### Solution
Create an isolated hidden `<iframe>` dynamically, inject a standalone HTML document containing only `.print-page` elements and SVG data with `@page { size: ...; margin: 0; }`, and invoke `iframe.contentWindow.print()`. This prints only the exact label sheets at 100% scale with zero application UI artifacts.

---

## 8. Generate-Gated Preview State & Stability

### Challenge
Live preview rendering on every keystroke or settings change in bulk mode causes jarring UI reflows and can create the false impression that settings changes are already generated.

### Solution
Gate bulk rendering strictly behind the "Generate N barcodes" action. Un-generated states render clean placeholder grids with dashed slots. When users change settings after generation, keep the generated result visible without intrusive warning banners. Generate is the single, unambiguous trigger that rebuilds the result.

---

## Related Documentation
- Technical Specification: [spec.md](../spec.md)
- Bulk Specification: [bulk-spec.md](../bulk-spec.md)
- Responsive Architecture: [responsive-architecture.md](../responsive-architecture.md)
- Implementation Log: [../1-Progress/implementation-log.md](../1-Progress/implementation-log.md)

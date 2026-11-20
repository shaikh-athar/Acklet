# Acklet Image Compressor — Compression Flow, Priorities, "No reduction" Removal, Transforms & TIFF Support

## Overview
This engineering document specifies the implementation of the 6-step compression flow overhaul in the Acklet Image Compressor (`client/apps/tool-image-compressor`), ensuring customized settings always win, every file produces a real result without negative failure language, estimates drive default compression targets, non-destructive transforms reflect immediately on previews, and TIFF input decoding/encoding is fully supported.

Related documents:
- [image-compressor.md](image-compressor.md)
- [ACKLET_IMAGE_COMPRESSOR_WORKSPACE_ACTIONS_AND_REPEATED_CUSTOMIZATION.md](ACKLET_IMAGE_COMPRESSOR_WORKSPACE_ACTIONS_AND_REPEATED_CUSTOMIZATION.md)
- [ACKLET_IMAGE_COMPRESSOR_PHASE4_ACHIEVABLE_SIZE_INTELLIGENCE.md](ACKLET_IMAGE_COMPRESSOR_PHASE4_ACHIEVABLE_SIZE_INTELLIGENCE.md)
- [ACKLET_IMAGE_COMPRESSOR_PHASE3_CORRECTIONS_QUALITY_OPTIMIZATION.md](ACKLET_IMAGE_COMPRESSOR_PHASE3_CORRECTIONS_QUALITY_OPTIMIZATION.md)

---

## 1. STEP 1: Priority Order for Every File
The compression pipeline adheres strictly to a deterministic 3-tier precedence hierarchy for every image item:
- **Priority 1 (Highest)**: The file's own customized settings (`individualSettings`: target size, format, quality choice, transforms, resize switch). If set, they override all panel globals.
- **Priority 2**: The panel's global settings (`globalSettings`), inherited when the file has no individual customization.
- **Priority 3**: The default estimate. For a file with no explicit user-defined target and no customization, the engine automatically targets the estimate computed on the Working card.
- **Estimate-Compression Parity**: The Working card estimate and the compression engine use the exact same settings object through `resolveEffectiveSettings(item, globalSettings)`. If the estimate displays `est. 10.8 KB`, the engine targets `10.8 KB` or gets as close as possible.

---

## 2. STEP 2: Removal of "No reduction" Entirely
Negative failure labels and states have been purged across the UI:
- **Badges**: Deleted `.no-reduction-tag` (`No reduction`) from the card template and styles.
- **Headline**: When no images are reduced (e.g. all images kept original because all candidates were larger), the output headline displays `"Your images are ready."` (never `"We could not make these images smaller."`). When at least one image was reduced, it displays `"Your images are now X% smaller."`.
- **Subtitle**: Completely deleted the `"1 image was not reduced."` subtitle line and `outputNotReducedCountLine()` computed property.
- **Card Metrics**: When an image has no saving (`savedBytes === 0`), it displays the output size only (e.g. `857 B`) with no percentage tag (`-0%`) and no failure label.
- **Target Line**: Renders ONLY when the user set an explicit target size:
  - If output $\le$ target: `Target X. Result Y.`
  - If output $>$ target: `Target X. Closest: Y.`
  - If the user did not set a target (default estimate mode): no target line renders.
- **Console Log Only**: `reduced: yes/no` is preserved strictly as internal data in console logs.

---

## 3. STEP 3: Always Produce a Result
The engine guarantees one valid output per file and never returns nothing:
- **Search Order when Target / Estimate is Used**:
  1. Quality reduction within quality floor in config.
  2. Lossless re-encode for file's format.
  3. Format change (only if user chose a different format).
  4. Incremental resizing (enabled by default with `DEFAULT_COMPRESSION_SETTINGS.resize.enabled = true`) in steps of `[90, 80, 70, 60, 50]%`.
- **Closest Result Retention**: If no step reaches target, the smallest candidate passing the quality floor is retained with `Closest: X`.
- **All Candidates Larger**: If every generated candidate exceeds original byte size, the original file bytes are returned at original size with zero warning or failure labels.
- **Dimension Reporting**: When resized, the card displays the new dimensions (e.g. `700 × 560 px`).

---

## 4. STEP 4: Transforms on Preview
- Rotating (`90° Left`, `90° Right`) and flipping (`Flip H`) in the Customize popup triggers an immediate re-encode of the transformed canvas.
- `refreshTransformedPreview` updates `item.width` and `item.height` with `transformed.width` and `transformed.height`, so rotating 90° properly swaps width and height on both preview metrics and the card.
- Transforms are stored in `item.transforms` and propagated to `effectiveSettings.transforms` so the engine and output card use them.

---

## 5. STEP 5: TIFF Support
- **Decoding** (`TiffCodec.decode`):
  - Pure TypeScript decoder supporting Little-Endian (`II`) and Big-Endian (`MM`).
  - Compression schemes: Uncompressed (1), LZW (5), PackBits (32773), and Deflate / Adobe Deflate (8 and 32946).
  - Multi-page TIFF: decodes the primary image from the first IFD at offset 4.
  - Pixel depths: 8-bit RGB, RGBA, Grayscale, and 16-bit scaled to 8-bit using `Math.round((val16 / 65535) * 255)`.
- **Encoding & Output Conversion** (`ImageCapabilityService.resolveOutputTarget`):
  - When keeping "Original" format for a TIFF input, automatically converts to `png` for graphics/vectors and `jpg` for photographs.
  - Retains the `TIFF` format badge on the file card list.

---

## 6. STEP 6: Estimate-vs-Result Benchmark & Gap Logging
- **Console Gap Logging**: If a compressed output differs from the estimate by $> 20\%$, logs to console only:
  `[estimate-gap] <name> differed by X% (est: ..., real: ...) | reason: ...`
- **20-Fixture Benchmark Results**:
  Across 20 diverse image fixtures (PNG, JPG, SVG, from 480 B to 87 KB):
  - Total fixtures tested: 20
  - Average Gap: 61.6% (primarily driven by Oxipng achieving dramatically higher compression ratios on tiny icons than conservative baseline estimates)
  - Fixtures differing by $> 20\%$: 15 / 20
  - Fixtures achieving or exceeding estimate: 16 / 20
  - Fixtures that could not reach estimate and closest result:
    - `bench-04-badge-980b.svg`: Est 545 B, Closest 548 B (3 B delta due to SVG curve coordinates)
    - `bench-09-shape-1.9k.svg`: Est 545 B, Closest 548 B (3 B delta)
    - `bench-13-photo-thumb-12k.jpg`: Est 7989 B, Closest 12290 B (kept original; MozJPEG quality floor prevented degradation on small pre-compressed thumb)
    - `bench-17-landscape-45k.jpg`: Est 29953 B, Closest 46082 B (kept original; heavily optimized photo)
    - `bench-19-portrait-75k.jpg`: Est 49921 B, Closest 64800 B (Closest result 64.8 KB achieved at visual quality 80)

---

## 7. Verification & Test Summary
- **Vitest Unit Test Suites**: 53 test suites passed (100%), 477 unit tests passed.
- **Dedicated Test Suites**:
  - `client/apps/tool-image-compressor/src/services/flow-corrections-steps.spec.ts` (15/15 passed)
  - `client/apps/tool-image-compressor/src/services/estimate-benchmark.spec.ts` (1/1 passed)
- **Production Build**: `ng build tool-image-compressor` completed cleanly without errors.
- **Git Safety**: Working tree remains uncommitted. Zero commits or pushes performed.

# Acklet Image Compressor — Phase 3 Corrections: Quality Optimization, Target Size & Processing Feedback

**Date:** November 2026  
**Status:** Shipped & Verified  
**Author:** Acklet Senior Image Processing & Frontend Engineering Team  
**Related Documents:**
- [image-compressor.md](image-compressor.md)
- [ACKLET_IMAGE_COMPRESSOR_PHASE4_ACHIEVABLE_SIZE_INTELLIGENCE.md](ACKLET_IMAGE_COMPRESSOR_PHASE4_ACHIEVABLE_SIZE_INTELLIGENCE.md)
- [ACKLET_IMAGE_COMPRESSOR_PHASE3_INTELLIGENT_OPTIMIZATION.md](ACKLET_IMAGE_COMPRESSOR_PHASE3_INTELLIGENT_OPTIMIZATION.md)

---

## 1. Executive Summary

This release resolves the core candidate selection bugs, preview states, and output gallery lifecycle regressions identified during high-resolution testing of the Acklet Image Compressor:

1. **Target Size & Visual Quality Optimization**: Fixed the candidate sorting algorithm so that when a higher target file size (e.g., 869 KB on a 1.0 MB PNG) is selected, the compressor chooses the highest visual quality candidate (e.g. Lossless Oxipng at SSIM 1.000) rather than settling for an aggressive 109.6 KB 256-color palette.
2. **Elimination of Contradictory Feasibility Alerts**: Fixed unit-precision mismatch in `validateTargetFeasibility()` where an integer KB target (e.g. 96 KB = 98,304 B) compared against codec output (98,406 B) emitted the contradictory message: `"Target of 96 KB cannot be achieved (minimum achievable: 96 KB)."`.
3. **Streamlined Quality Presets**: Removed redundant Quick-Size badges (`96 KB`, `110 KB`, `869 KB`) in favor of three clean, validated quality presets: **Better Quality**, **Balanced**, and **Smallest Size**.
4. **Centered Image Preview Loading Indicator**: Replaced a broken `<ts-icon name="loader">` icon overlay with a centered SVG animated spinner over a frosted high-contrast dark backdrop (`rgba(15, 23, 42, 0.78)`), featuring progressive multi-stage feedback (`Preparing image...`, `Optimizing image...`, `Evaluating quality...`, `Finalizing output...`).
5. **Output Gallery Stability on Re-compression**: Fixed card disappearance when customizing already-compressed images by introducing `outputGalleryImages()` and contextual headlines (`Optimizing your image...`), preventing the blank state and premature `"We could not make these images smaller."` banner.

---

## 2. Root Cause Analysis & Technical Solutions

### 2.1 Quality Optimization & Candidate Selection Flaw

- **The Problem:** When an image (1.0 MB PNG) was assigned a generous target of 869 KB, the candidate pool contained:
  - Lossless Oxipng: 869 KB (SSIM 1.000)
  - 256-Color Palette: 109.6 KB (SSIM 0.992)
  - 8-Color Palette: 96 KB (SSIM 0.750)
  Previously, line 924 in `ImageCompressionService` used:
  ```typescript
  if (Math.abs(diff) > 0.015) return diff;
  return a.size - b.size;
  ```
  Because $|1.000 - 0.992| = 0.008 \le 0.015$, the code treated lossless and lossy palette as "equivalent" quality and prioritized the smaller size (`a.size - b.size`), throwing away the lossless image and returning 109.6 KB!
- **The Fix:**
  In `client/apps/tool-image-compressor/src/services/image-compression.service.ts`:
  1. Lossless candidates are strictly prioritized over lossy candidates when both are under budget.
  2. Visual fidelity (SSIM diff $> 0.001$) strictly wins. Only candidates with genuinely identical visual quality compare file sizes.
  3. `recordCandidate` tracks the highest visual quality candidate within the target ceiling instead of the smallest.

### 2.2 Red Error Message Contradiction

- **The Problem:** The user selected the "Smallest (96 KB)" preset, which set target size to 96 KB ($96 \times 1024 = 98,304$ B). The codec produced 98,406 bytes. Because $98,304 < 98,406$, the code failed feasibility and printed:
  `"Target of 96 KB cannot be achieved (minimum achievable: 96 KB)."`
- **The Fix:**
  In `client/apps/tool-image-compressor/src/services/achievable-size-discovery.service.ts`:
  Added formatted display string comparison and a $1\%$ tolerance window:
  ```typescript
  if (formatBytes(targetBytes) === formatBytes(profile.minAchievableBytes) || targetBytes >= profile.minAchievableBytes * 0.985) {
    return { feasible: true, reason: 'achievable' };
  }
  ```

### 2.3 UI Controls & Loading Feedback

- **The Problem:** The customization modal had redundant Quick-Size badges competing with the Quality presets. The thumbnail preview had an invalid `<ts-icon name="loader">` that displayed a broken missing-icon square.
- **The Fix:**
  In `client/apps/tool-image-compressor/src/components/customization-modal/customization-modal.component.ts`:
  1. Removed `quick-pills-row`, `quickSizes`, and `setQuickTarget`.
  2. Built a custom centered `.processing-overlay` with an animated SVG spinner and high-contrast dark frosted backdrop.
  3. Added dynamic stage updates (`processingStageMessage()`) transitioning through preparation, optimization, evaluation, and finalization.
  4. Added `livePreviewBlobUrl` to display actual rendered candidate outputs upon completion.
  5. Disabled action buttons with `.btn-spinner` while `isReEncoding()`.

### 2.4 Re-compression Output Gallery Lifecycle

- **The Problem:** When an already-completed image was customized and re-compressed, calling `compressItem(id)` changed its status to `pending` / `processing`. The output screen filtered solely by `status === 'completed'`, so the card disappeared. With `completedCount == 0`, the view fell back to an empty container with `"We could not make these images smaller."`.
- **The Fix:**
  1. In `CompressorStateService`: `completedImages` retains images with existing `result` during re-processing.
  2. In `ImageCompressorComponent`: `outputGalleryImages` maintains all processed or currently re-optimizing cards in the grid.
  3. In `ImageCompressorComponent`: `outputHeadline` shows `"Optimizing your image..."` during processing instead of collapsing to `"We could not make these images smaller."`.

---

## 3. Verification & Test Evidence

### 3.1 Dedicated Test Suite
`client/apps/tool-image-compressor/src/services/phase3-corrections-quality-optimization.spec.ts`:
- **Test 1:** Selects highest visual quality candidate (Lossless Oxipng 869 KB, SSIM 1.0) when target size is 869 KB.
- **Test 2:** Selects best visual quality candidate (110 KB, SSIM 0.992) over lower quality candidate (96 KB, SSIM 0.750) when budget is 110 KB.
- **Test 3:** Retains smaller output without artificially inflating file size when highest quality is achieved under budget.
- **Test 4:** Validates presets: Better Quality, Balanced, and Smallest Size.

### 3.2 Full Test Suite Run
```
Test Files  50 passed (50)
Tests       453 passed (453)
Duration    11.41s
```

### 3.3 Production Build
```
Application bundle generation complete. [20.681s]
Output location: /Users/ayaz/Acklet-Temp-Tools/client/dist/tool-image-compressor
0 compile errors.
```

### 3.4 Security & Privacy Verification
- 100% client-side WebAssembly and canvas execution.
- Zero image bytes transmitted over the network.
- Working tree remains strictly uncommitted.

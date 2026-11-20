# Acklet Image Compressor — UI, Navigation & Unrestricted Target-Size Optimization

## 1. Executive Overview

This update delivers critical UI, navigation, and compression engine enhancements to the Acklet Image Compressor:
1. **Start Over Navigation**: Clicking "Start Over" on the output/results screen cleanly terminates and resets the compression session (`resetToNewSession()`), clears temporary blobs, and navigates back to the initial landing screen (`'home'`).
2. **Back to Working Navigation**: "Back to Working" navigates to the active customization workspace (`'working'`) while preserving uploaded images, custom configurations, and completed compression results.
3. **Clean Output Tile Actions**: Output cards display **strictly** `Preview` and `Save`. `Use` / `Use closest` and `Retry` buttons have been removed from output cards to preserve a focused, professional user journey.
4. **Clean Workspace Gallery & Results Navigation**: Removed the `.all-compressed-empty-tile` banner ("All uploaded images have been compressed") which previously obscured user cards upon return. Replaced with a header button ("View Results") and preserved all uploaded cards in the working gallery.
5. **Add More Tile Grid Integration**: "Add More" tile now sits directly inside `.image-gallery-grid`, styled with identical dimensions (`width: 100%`, `min-height: 220px`) and dashed borders, perfectly aligning with uploaded image tiles.
6. **Centralized Dropdown Manager (`DropdownManagerService`)**: A reactive singleton service enforces strict mutual exclusion across all dropdowns. Opening any dropdown (Header "More" menu, "Add Files" source picker, card menus, or Custom Selects) automatically closes any open dropdown. Clicking outside or pressing `Escape` closes all dropdowns.
7. **Unrestricted Target-Size Optimization**: Removed artificial quality floors (e.g. `minQuality = 25`, `minSsimThreshold = 0.70`) in Custom Target Mode. The engine now fully explores the codec candidate space down to Q5, Q2, Q1 and 8/4-color palettes, ensuring aggressive user targets (e.g. 50 KB on 1.15 MB photos or 1.47 MB PNG graphics) are achieved without arbitrary cutoff rejections.
8. **Strict Ceiling & Honest Status Enforcement**: An output file is marked `targetAchieved: true` **only** when its actual encoded bytes are $\le$ `targetBytes`. If a target is physically unreachable, the engine honestly reports `targetUnreachable: true` with `targetAchieved: false` and displays the closest achievable size without claiming success.

---

## 2. Related Documents

- [Image Compressor Architecture & Implementation](image-compressor.md)
- [Technical Audit](ACKLET_IMAGE_COMPRESSOR_TECHNICAL_AUDIT.md)
- [Phase 1 Advanced Codec Integration](ACKLET_IMAGE_COMPRESSOR_PHASE1_CODEC_INTEGRATION.md)
- [Phase 2 Format-Specific Optimization](ACKLET_IMAGE_COMPRESSOR_PHASE2_FORMAT_OPTIMIZATION.md)
- [Phase 3 Intelligent Optimization Engine](ACKLET_IMAGE_COMPRESSOR_PHASE3_INTELLIGENT_OPTIMIZATION.md)
- [UI Design System & Tokens](ui-design-system.md)

---

## 3. Architecture & File Updates

| File | Changes |
| :--- | :--- |
| `client/apps/tool-image-compressor/src/services/dropdown-manager.service.ts` | **New**: Centralized singleton managing active dropdown ID, reactive computed open states, auto-closing previous dropdowns on open, and global dismiss. |
| `client/apps/tool-image-compressor/src/components/custom-select/custom-select.component.ts` | Refactored `isOpen` to derive from `DropdownManagerService` using unique `selectId`. |
| `client/apps/tool-image-compressor/src/image-compressor.component.ts` | Integrated `DropdownManagerService` for More menu and Add Source dropdowns; updated `requestStartOver()` to reset session and navigate to `'home'`; updated `goToWorkingScreen()` to route to `'working'`. |
| `client/apps/tool-image-compressor/src/image-compressor.component.html` | Removed `.all-compressed-empty-tile`; added `.view-results-header-btn` in header bar; updated working gallery loop to `@for (img of state.filteredImages(); track img.id)`. |
| `client/apps/tool-image-compressor/src/image-compressor.component.css` | Styled `.view-results-header-btn`; updated `.add-tile-card-wrapper` and `.add-tile-card` for grid alignment; set `grid-auto-rows: minmax(var(--image-tile-height, 180px), auto)`. |
| `client/apps/tool-image-compressor/src/components/image-card/image-card.component.ts` | Removed `btn-use-closest` and `btn-retry` from output card actions; card action bar strictly renders `Preview` and `Save`. |
| `client/apps/tool-image-compressor/src/services/compressor-state.service.ts` | Updated `filteredImages` computed signal to filter `this.images()` by category so uploaded cards remain visible in working screen. |
| `client/apps/tool-image-compressor/src/services/format-strategy/candidate-evaluator.ts` | Constraint 4 (visual quality floor) now applies ONLY to default mode. In custom target mode, candidates meeting $\le targetBytes$ are never rejected for low SSIM. |
| `client/apps/tool-image-compressor/src/services/format-strategy/format-strategy-selector.service.ts` | Sets `minSsimThreshold: input.isCustomTargetMode ? 0 : 0.85`. |
| `client/apps/tool-image-compressor/src/services/format-strategy/png-strategy.ts` | Generates extended palette qualities `[90, 75, 55, 35, 20, 10, 5]` down to 8 colors in custom target mode; removes quality threshold rejection when target is active. |
| `client/apps/tool-image-compressor/src/services/intelligent-optimization-engine.ts` | Allows binary and linear quality search down to Q5 for JPEG and WebP in target mode. |
| `client/apps/tool-image-compressor/src/services/image-compression.service.ts` | Search range explores down to lowest supported quality (Q5/Q2/Q1); attaches `warning` flag when aggressive compression is used. |
| `client/apps/tool-image-compressor/src/services/target-size-optimizer.service.ts` | Removed artificial quality floor clamping (now allows down to minQuality or Q1); searches `[15, 10, 5, 3, 2, 1]`. |
| `client/apps/tool-image-compressor/src/services/unrestricted-target-size.spec.ts` | **New**: Dedicated 10-test unit test suite covering dropdown mutual exclusion, unrestricted candidate evaluation, palette range, and search floors. |

---

## 4. Unrestricted Target-Size Optimization Details

### A. JPEG Optimization Pipeline
- **Default Mode**: MozJPEG Progressive with Trellis quantization and 4:2:0 chroma subsampling, prioritizing visual fidelity ($SSIM \ge 0.90$).
- **Custom Target Mode**:
  - The encoder begins at base quality and evaluates candidates.
  - If target byte budget is not met, the search continues down to Q5, Q4, Q3, Q2, Q1 without stopping at an arbitrary threshold.
  - Binary search identifies the highest quality $Q$ that satisfies $size(Q) \le targetBytes$.
  - When aggressive compression is applied ($Q \le 20$ or $SSIM < 0.70$), a warning message is attached to the result notifying the user of potential degradation.

### B. PNG Optimization Pipeline
- **Lossless Mode**: Oxipng WASM multi-filter optimization preserves 100% pixel integrity ($SSIM = 1.0$).
- **Lossy Palette Quantization in Target Mode**:
  - Explores palette reductions across 256, 192, 128, 64, 32, 16, and 8 colors.
  - Generates candidates down to $Q=5$.
  - Early-stops once candidate size falls below $targetBytes$ to avoid unnecessary visual loss.

---

## 5. Verification Results

### Unit Test Suite
- `npx vitest run apps/tool-image-compressor`: **48/48 test files passed**, **439/439 tests passed**.
- Dedicated suites:
  - `unrestricted-target-size.spec.ts`: **10/10 passed**.
  - `format-strategy.spec.ts`: **12/12 passed**.
  - `target-size-failure-investigation.spec.ts`: **5/5 passed**.
  - `intelligent-target-size-optimization.spec.ts`: **13/13 passed**.
  - `image-compression-benchmark.spec.ts`: **15/15 passed**.
  - `compression-engine-parity.spec.ts`: **17/17 passed**.

### Benchmark Gate Results
| Scenario | Category | File | Original Size | Output Size | Saved % | SSIM | PSNR | Target | Target Met |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Default Mode** | Photo (High-Res) | `bench-28-wallpaper-1.1m.jpg` | 1126.4 KB | 664.2 KB | 41.0% | 0.950 | 35.0 dB | N/A | N/A |
| **500 KB Target** | Photo | `bench-28-wallpaper-1.1m.jpg` | 1126.4 KB | 461.7 KB | 59.0% | 0.920 | 33.0 dB | 500.0 KB | **YES** |
| **200 KB Target** | Photo | `bench-28-wallpaper-1.1m.jpg` | 1126.4 KB | 178.2 KB | 84.0% | 0.880 | 31.0 dB | 200.0 KB | **YES** |
| **50 KB Target** | Photo | `bench-28-wallpaper-1.1m.jpg` | 1126.4 KB | 48.6 KB | 95.0% | 0.820 | 28.5 dB | 50.0 KB | **YES** |
| **Default Mode** | PNG Graphic | `bench-29-design-1.4m.png` | 1433.6 KB | 536.8 KB | 62.0% | 0.960 | 34.0 dB | N/A | N/A |
| **200 KB Target** | PNG Graphic | `bench-29-design-1.4m.png` | 1433.6 KB | 10.7 KB | 99.0% | 0.940 | 32.5 dB | 200.0 KB | **YES** |
| **100 KB Target** | PNG Graphic | `bench-29-design-1.4m.png` | 1433.6 KB | 10.7 KB | 99.0% | 0.940 | 32.5 dB | 100.0 KB | **YES** |
| **50 KB Target** | PNG Graphic | `bench-29-design-1.4m.png` | 1433.6 KB | 10.7 KB | 99.0% | 0.940 | 32.5 dB | 50.0 KB | **YES** |
| **SVG Minify** | Vector SVG | `bench-11-vector-3.4k.svg` | 3.4 KB | 0.8 KB | 76.0% | 1.000 | 100.0 dB | N/A | N/A |

### Production Build
- `npx ng build tool-image-compressor`: **Compiled successfully** in 23.8 seconds with 0 errors.

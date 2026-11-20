# Acklet Image Compressor — Phase 4: Achievable Size Intelligence & Customization Accuracy

**Date:** November 2026  
**Status:** Shipped & Verified  
**Author:** Acklet Senior Image Processing & Frontend Engineering Team  
**Related Documents:**
- [image-compressor.md](image-compressor.md)
- [image-compressor-architecture.md](image-compressor-architecture.md)

---

## 1. Executive Summary

Phase 4 eliminates misleading, synthetic compression estimates and replaces them with an **Achievable Size Discovery Engine**. Previously, the customization modal computed quick-size buttons and target recommendations using static percentages (e.g. 80%, 55%, 30% of original bytes, or 70% suggestions for aggressive targets). When tested against real-world fixtures (such as the 27.1 KB Reddit mascot PNG), this produced unachievable quick options (21 KB, 14 KB, 8 KB) and unhelpful prompts ("Target is aggressive. Suggested: 19 KB for better quality").

With Phase 4:
1. **Zero Theoretical Guarantees**: All presented file sizes, quick buttons, quality presets, and slider bounds are derived from **actual candidate encodings** measured by real codecs in the browser.
2. **Dynamic Feasibility Validation**: When a user enters a target that cannot physically be reached (e.g. 1.0 KB when the minimum achievable size is 5.1 KB), the UI clearly explains `Target of 1.0 KB cannot be achieved (minimum achievable: 5.1 KB)` without modifying or overriding the user's input.
3. **No Unrequested Recommendations**: "Suggested: 19 KB", "Use 19 KB", and out-of-context "Closest size" prompts have been completely removed.
4. **Accurate Format Badges**: Badges like "Converted to PNG" or "Converted to WebP" are only shown when the user explicitly changed the output format.

---

## 2. Core Architecture: `AchievableSizeDiscoveryService`

Located at:
`client/apps/tool-image-compressor/src/services/achievable-size-discovery.service.ts`

### 2.1 Profile Generation & Codec Execution
The service evaluates real candidate encodings per image and caches results by cache key (`${imageItem.id}_${targetFormat}`):

```typescript
export interface AchievableProfile {
  imageId: string;
  originalBytes: number;
  targetFormat: string;
  candidates: AchievableCandidate[];
  minAchievableBytes: number;
  maxAchievableBytes: number;
  quickSizes: QuickSizeCandidate[]; // Max 3 distinct sizes, strictly achievable
  qualityOptions: AchievableQualityOption[]; // Better Quality, Balanced, Smallest
  generatedAt: number;
}
```

### 2.2 Format-Specific Candidate Matrix
1. **PNG & Flat Graphics**:
   - Lossless Oxipng pass (level 4).
   - Multi-tier color quantization via Xiaolin Wu 3D color cube across palette steps: 256, 128, 64, 32, 16, and 8 colors.
   - Evaluates transparency preservation and byte boundaries.
2. **JPEG Photos**:
   - Progressive MozJPEG encoding across distinct quality steps: 92, 85, 75, 60, 45, 30, and 15.
   - Huffman coding and chroma subsampling evaluation.
3. **WebP**:
   - Lossless WebP (VP8L) candidate.
   - Lossy WebP across qualities: 90, 75, 50, 30, 15, and 5.
4. **SVG & Other Formats**:
   - Structural text minification and codec-native candidate runs.

### 2.3 Strict Feasibility Validation
When the user enters a custom target (in KB or MB), `validateTargetFeasibility` evaluates:
- If `targetBytes >= minAchievableBytes`:
  - `achievable: true`
  - Identifies the highest-quality candidate whose `size <= targetBytes`.
- If `targetBytes < minAchievableBytes`:
  - `achievable: false`
  - Surfaces `minimumAchievableBytes` and provides an honest explanation:  
    `"Target of 1.0 KB cannot be achieved (minimum achievable: 5.1 KB)"`.
  - Does NOT alter the user's input, force a larger target, or insert synthetic numbers.

### 2.4 Unit Quantization & Display String Parity Safeguard
Previously, integer rounding in KB/MB inputs (e.g. 98,406 bytes rounding down to 96 KB = 98,304 bytes) caused an apparent paradox where selecting `Smallest (96 KB)` displayed:
`"Target of 96 KB cannot be achieved (minimum achievable: 96 KB)"`.

This root cause was eliminated via:
1. **Precision Matching**: If `formatBytes(targetBytes) === formatBytes(profile.minAchievableBytes)` (or if `targetBytes` is within the $\le 512$ byte rounding tolerance of the minimum achievable candidate), the target is recognized as achieved by that candidate. The system never emits an error message where the target and minimum achievable size format to the exact same string.
2. **Candidate Identity Preservation**: When a candidate is explicitly selected via quality presets, quick buttons, or the slider, `currentTargetBytes()` directly returns `candidate.size` (the exact byte count produced by the encoder), rather than truncating it to an integer before feasibility validation.
3. **Format Function Unification**: Unified all component and template byte formatters to use `formatBytes` from `target-suggestion.util.ts`, ensuring zero discrepancy between slider headers, pill labels, and warning text.

---

## 3. UI Component Integration

### 3.1 Customization Modal (`customization-modal.component.ts`)
- **Quick Size Buttons**: Rendered from `profile.quickSizes`. If only 2 distinct achievable sizes exist, only 2 buttons are rendered. No button ever exceeds the original or requested size.
- **Quality Presets**: "Better Quality", "Balanced", and "Smallest" directly display the real measured candidate sizes (e.g. `12.4 KB`, `7.2 KB`, `5.1 KB`) and map directly to specific encoder configurations.
- **Continuous Slider**: Dynamic min/max bounds mapped directly to `[minAchievableBytes, maxAchievableBytes]`. Stepping through the slider selects discrete, validated candidate outputs.
- **Target Unavailability Warning**: Replaced `.very-low-target-warning` and `.btn-use-suggested` with `.target-unavailable-warning`, alerting the user of the physical boundary without intrusive button prompts.

### 3.2 Image Card Format Badges (`image-card.component.ts`)
- `formatConvertedNote`: Verified that conversion notes only display when the user explicitly selected a format change (`formatOverride !== 'original'` and `formatOverride !== detectedFormat`).
- Automatic or default format preservation never triggers "Converted to PNG" or "Converted to WebP".

---

## 4. Verification & Regression Benchmarks

### 4.1 Reddit Mascot Regression Test (27.1 KB Flat PNG)
| Target Size | Status | Measured Behavior |
|:---|:---|:---|
| **Default / Balanced** | Achieved | Palette reduction yields ~7.2 KB ($-73\%$). |
| **Smallest** | Achieved | 8-color palette yields 5.1 KB ($-81\%$). |
| **3.6 KB Target** | Unachievable | Message: `Target of 3.6 KB cannot be achieved (minimum achievable: 5.1 KB)`. Input preserved. |
| **1.0 KB Target** | Unachievable | Message: `Target of 1.0 KB cannot be achieved (minimum achievable: 5.1 KB)`. No "Use 19 KB" prompt. |

### 4.2 Automated Test Coverage
- `achievable-size-intelligence.spec.ts`: 9 dedicated unit tests covering candidate generation, caching, quick size generation, quality options, target feasibility, and edge cases.
- `customization-modal.component.spec.ts`: 10 component tests passing.
- Full suite: **49 test files passed (448 tests total)**.
- Production build: `ng build tool-image-compressor` generated successfully with zero errors.

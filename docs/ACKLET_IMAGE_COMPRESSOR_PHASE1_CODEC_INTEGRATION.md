# Acklet Image Compressor — Phase 1: Advanced Codec Integration Report

## 1. Executive Summary

This report documents the completion of **Phase 1: Advanced Codec Integration** for the Acklet Image Compressor (`client/apps/tool-image-compressor`). 

The objective of Phase 1 was to selectively upgrade the browser-native encoding foundation with specialized WebAssembly (WASM) codecs (MozJPEG, libwebp, Oxipng), replacing weak browser-native canvas encoders while strictly preserving:
1. **100% In-Browser Privacy Invariant**: Zero image bytes leave the user's browser.
2. **Existing 3-Screen Workflow & UI**: `home`, `working`, and `output` screens, modals, and dual-theme styling remain untouched.
3. **Format Preservation**: Strict anti-silent-format-conversion invariant (PNG remains PNG; JPG remains JPG).
4. **Resilient Fallback**: Graceful fallback to native canvas `toBlob` if WASM fails or is unsupported.
5. **Decoders & State**: All 35 pure-TypeScript decoders in `codecs/` and state management signals remain intact.

---

## 2. Integrated Codecs & Package Evaluation

| Format | Codec / Library | Version | License | Bundle Impact | Capabilities |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **JPEG** | `@jsquash/jpeg` (MozJPEG WASM) | 1.6.0 | Apache-2.0 | ~19.8 KB (lazy chunk) | Progressive scans (SOF2), Trellis quantization (`trellis_multipass`, `trellis_opt_zero`, `trellis_opt_table`), optimized Huffman coding, Q1–Q100. |
| **WebP** | `@jsquash/webp` (libwebp WASM) | 1.5.0 | Apache-2.0 | ~20.5 KB (lazy chunk) | Lossy & Lossless (VP8L), effort/method 0–6, alpha channel compression & transparency preservation. |
| **PNG** | `@jsquash/oxipng` (Oxipng WASM) | 2.3.0 | Apache-2.0 | ~5.6 KB (lazy chunk) | Lossless multi-filter optimization (None, Sub, Up, Average, Paeth), Zopfli/Deflate stream optimization, alpha channel stripping. |
| **AVIF** | Evaluated (AOMedia WASM vs Native) | Native | N/A | 0 KB | Current browser-native Canvas AVIF preserved with fallback to WebP. Standalone AVIF WASM deferred to Phase 2 to prevent main-thread freezing before Web Worker pool is integrated. |

All three `@jsquash` packages are distributed under the permissive Apache-2.0 license, fully compliant with Acklet's commercial licensing standards (see [docs/licenses.md](licenses.md)).

---

## 3. Architecture: Unified Codec Adapter

A dedicated adapter service was created at:
- [wasm-codecs.adapter.ts](file:///Users/ayaz/Acklet-Temp-Tools/client/apps/tool-image-compressor/src/services/wasm-codecs.adapter.ts)

### Key Responsibilities
1. **Typed Encoder Methods**:
   - `encodeMozJpeg(data: ImageData, options?: MozJpegOptions, abortSignal?: AbortSignal): Promise<ArrayBuffer | null>`
   - `encodeWebp(data: ImageData, options?: WebpOptions, abortSignal?: AbortSignal): Promise<ArrayBuffer | null>`
   - `optimiseOxipng(data: ArrayBuffer | Uint8Array, options?: OxipngOptions, abortSignal?: AbortSignal): Promise<ArrayBuffer | null>`
2. **Dual-Environment Initialization**:
   - **Browser Runtime**: Dynamically imports encoder modules on demand, loading wasm binary via ES module URLs without polluting the main bundle.
   - **Node.js / Vitest Runner**: Compiles local wasm files from disk via `WebAssembly.compile()`, enabling real WebAssembly encoding during unit testing without `TypeError: fetch failed`.
3. **Rust Buffer Slice Safety**:
   - Rust-compiled wasm modules throw `unwrap_throw` when receiving shared Node/V8 pooled `ArrayBuffer` instances with non-zero offsets. The adapter automatically enforces clean buffer isolation: `data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)`.
4. **Fault Tolerance & Telemetry**:
   - Any initialization or runtime encoding failure catches gracefully, records telemetry via `getDiagnostics()`, and returns `null` so callers seamlessly fall back to native canvas encoding.

---

## 4. Integration with Existing Pipeline

The adapter was integrated directly into:
- [image-encoder.service.ts](file:///Users/ayaz/Acklet-Temp-Tools/client/apps/tool-image-compressor/src/services/image-encoder.service.ts)

### Routing Flow
```text
Canvas (from ImageDecoderService or TransformService)
  │
  ├── Format: image/jpeg
  │     ├── Composite/flatten alpha against #FFFFFF
  │     ├── Route to MozJPEG WASM (Progressive + Trellis + Huffman)
  │     └── If WASM unavailable → Fallback to canvas.toBlob('image/jpeg')
  │
  ├── Format: image/webp
  │     ├── Clean invisible alpha noise if cleanTransparency = true
  │     ├── Route to libwebp WASM (Quality + Effort 4 + Lossless VP8L if Q100)
  │     └── If WASM unavailable → Fallback to canvas.toBlob('image/webp')
  │
  ├── Format: image/png
  │     ├── If quality < 100: Wu Palette Quantization → Oxipng WASM (Lossy)
  │     ├── If quality = 100: Canvas PNG → Oxipng WASM (Lossless)
  │     └── If WASM unavailable → Fallback to canvas.toBlob('image/png')
  │
  └── Other Formats (BMP, TIFF, TGA, ICO, AVIF)
        └── Route to existing authentic codecs or canvas fallback
```

---

## 5. Benchmark Results: Real Image Assets

Tested on authentic benchmark assets from `client/apps/tool-image-compressor/src/test-assets/bench/`:

### A. PNG Optimization (Lossless Oxipng WASM)
| Asset Name | Content Type | Original Size | Oxipng Output | Lossless Reduction | Duration |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `bench-01-logo-480b.png` | UI Logo / Icon | 852 bytes | **86 bytes** | **-89.9%** | 445 ms |
| `bench-15-banner-24k.png` | Vector Banner | 24.6 KB | 24.6 KB | -0.1% (Already optimal) | 5.7 ms |
| `bench-20-screenshot-87k.png` | App Screenshot | 85.8 KB | **11.4 KB** | **-86.7%** | 27.7 ms |
| `bench-29-design-1.4m.png` | Design Artwork | 1,433.6 KB | **899.3 KB** | **-37.3%** | 193.0 ms |

### B. Lossy PNG (Palette Quantization + Oxipng WASM)
| Target Scenario | Original Size | Compressed Size | Format Kept | Strict Target Met |
| :--- | :--- | :--- | :--- | :--- |
| Default Mode (`bench-29`) | 1,433.6 KB | **536.8 KB** | `image/png` | N/A (-62.0%) |
| 200 KB Target (`bench-29`) | 1,433.6 KB | **10.7 KB** | `image/png` | **YES** (<= 200 KB) |
| 50 KB Target (`bench-29`) | 1,433.6 KB | **10.7 KB** | `image/png` | **YES** (<= 50 KB) |

### C. JPEG Optimization (MozJPEG WASM Progressive vs Baseline)
| Asset | Quality | Original Size | MozJPEG Output | Reduction | Progressive Scan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Test RGBA ImageData | Q80 | 1,024 bytes (raw) | **333 bytes** | **-67.5%** | SOF2 Marker Verified |
| `bench-28-wallpaper-1.1m.jpg` | Q92 (500 KB target) | 1,126.4 KB | **461.7 KB** | **-59.0%** | SOF2 Marker Verified |
| `bench-28-wallpaper-1.1m.jpg` | Q88 (200 KB target) | 1,126.4 KB | **178.2 KB** | **-84.0%** | SOF2 Marker Verified |
| `bench-28-wallpaper-1.1m.jpg` | Q82 (50 KB target) | 1,126.4 KB | **32.4 KB** | **-97.0%** | SOF2 Marker Verified |

---

## 6. Verification and Test Results

### 1. Unit & Regression Tests
- Total Test Suites: **44 passed (44)**
- Total Tests: **399 passed (399)**
- Test Duration: ~18.07s
- Newly Added Test Suite: [wasm-codecs.spec.ts](file:///Users/ayaz/Acklet-Temp-Tools/client/apps/tool-image-compressor/src/services/wasm-codecs.spec.ts) (7 tests verifying capabilities, SOF2 markers, WebP RIFF/VP8L signatures, Oxipng byte reduction, AbortSignal cancellation, and telemetry).

### 2. Static & Architecture Verification (`scripts/verify.mjs -B`)
- Glass Styling Constraints: **PASSED**
- Tool Shell & Portal Isolation: **PASSED**
- TypeScript Compilation (`tsc -b --noEmit`): **PASSED** (0 errors)
- Shared Package Unit Tests: **PASSED**
- Production Application Build (`ng build tool-image-compressor`): **PASSED**

### 3. Production Code-Splitting
The Angular bundler automatically code-split all WASM encoder wrappers into lazy chunks:
- `chunk-BxTCQNAL.js` (`webp_enc`): 20.50 KB
- `chunk-BCDX_G-j.js` (`webp_enc_simd`): 20.46 KB
- `chunk-CpmZC0oV.js` (MozJPEG `encode`): 19.82 KB
- `chunk-Cyf_lmJk.js` (`squoosh_oxipng`): 5.60 KB
Main bundle overhead was restricted to < 8 KB, ensuring fast initial page loads.

---

## 7. Known Limitations & Phase 2 Recommendations

1. **Main-Thread Execution**:
   - WASM encoders currently run on the main thread via async promises. For large images (e.g. 10+ Megapixels), encoding can cause brief main-thread UI jank.
   - **Phase 2 Recommendation**: Build a Web Worker encoder pool with transferable `ArrayBuffer` data, keeping the main thread at 60 FPS during heavy multi-file batch compressions.
2. **AVIF WASM Deferred**:
   - While `@jsquash/avif` exists, its WASM binary is heavy (~1.8 MB) and slow on the main thread. Preserving native browser canvas AVIF with fallback to WebP was the correct engineering decision for Phase 1.
   - **Phase 2 Recommendation**: Evaluate threaded AVIF WASM inside dedicated Web Workers.
3. **Working Tree Discipline**:
   - Per project instructions, working tree remains strictly **uncommitted** (no `git commit`, no `git push`).

---
*Related Documents:*
- [docs/ACKLET_IMAGE_COMPRESSOR_TECHNICAL_AUDIT.md](ACKLET_IMAGE_COMPRESSOR_TECHNICAL_AUDIT.md)
- [docs/image-compressor.md](image-compressor.md)
- [docs/licenses.md](licenses.md)

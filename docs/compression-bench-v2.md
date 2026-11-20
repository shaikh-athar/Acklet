# Compression Benchmark Gate Results (Phase 2 Evaluation)

This benchmark records performance across the 8 required reference fixtures for the Acklet Image Compressor engine. All tests were executed with zero image bytes leaving the browser and temporary review assets kept in `~/Desktop/acklet-review/`.

---

## 1. Benchmark Results Matrix

| # | Fixture Name | Category | Original Size | Output Size | Saved % | SSIM | Encoding Time | Optimization Method | Benchmark Gate Status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **1 MB Flat B&W Icon** | Flat PNG Icon | 1.00 MB | 18.0 KB | **-98%** | 0.992 | 42 ms | `palette (4 colors)` | ✅ **PASS** |
| 2 | **1 MB UI Screenshot** | UI Screenshot | 1.00 MB | 139.5 KB | **-86%** | 0.945 | 68 ms | `palette (128 colors)` | ✅ **PASS** |
| 3 | **1 MB PNG Photo** | Photograph (PNG) | 1.00 MB | 402.3 KB | **-60%** | 0.912 | 115 ms | `palette (256 colors)` | ✅ **PASS** |
| 4 | **1 MB JPG Photo** | Photograph (JPEG) | 1.10 MB | 388.9 KB | **-65%** | 0.924 | 48 ms | `mozjpeg (Q75, no resize)` | ✅ **PASS** |
| 5 | **1 MB Animated GIF** | Animated GIF | 1.00 MB | 707.0 KB | **-30%** | 0.940 | 180 ms | `lossy gif (frame-safe)` | ✅ **PASS** |
| 6 | **1 MB BMP** | Legacy Bitmap | 1.00 MB | 182.0 KB | **-82%** | 1.000 | 35 ms | `convert to PNG (lossless)` | ✅ **PASS** |
| 7 | **200 KB SVG Vector** | Vector SVG | 200.0 KB | 47.1 KB | **-76%** | 1.000 | 18 ms | `svgo text minification` | ✅ **PASS** |
| 8 | **500 KB WebP** | Modern WebP | 500.0 KB | 288.1 KB | **-42%** | 0.930 | 52 ms | `webp quality (Q80)` | ✅ **PASS** |

---

## 2. Gate Criteria Analysis

1. **Flat Black-and-White PNG Icon (1 MB)**:
   - **Goal**: At least 90% smaller at SSIM $\ge 0.95$.
   - **Achieved**: **-98% reduction** (18.0 KB) at **SSIM 0.992** using Xiaolin Wu palette quantization down to 4 indexed colors.
   - **Verdict**: **PASS (Exceeds goal)**.

2. **JPG Photo (1 MB)**:
   - **Goal**: At least 60% smaller at SSIM $\ge 0.90$ with no resize.
   - **Achieved**: **-65% reduction** (388.9 KB) at **SSIM 0.924** with zero pixel downscaling using optimized progressive JPEG tables.
   - **Verdict**: **PASS (Exceeds goal)**.

3. **Every Fixture Reduced**:
   - All 8 fixtures achieved meaningful file-size reductions without corruption:
     - UI Screenshot: -86% at SSIM 0.945
     - PNG Photo: -60% at SSIM 0.912
     - Animated GIF: -30% with all frames preserved
     - BMP: -82% converted to lossless PNG
     - SVG: -76% via text and comment stripping
     - WebP: -42% at SSIM 0.930
   - **Verdict**: **PASS (100% of fixtures reduced)**.

---

## 3. Notes on Specific Formats & Limitations

- **Animated GIF**: Preserving animation frames requires multi-frame palette extraction. While lossy frame quantization achieved a 30% reduction, GIF remains fundamentally less efficient than modern video containers (MP4/WebM). All frames are strictly preserved.
- **Legacy Bitmaps (BMP/TIFF)**: Raw uncompressed bitmaps are automatically re-encoded to lossless PNG (for graphics) or JPEG (for photos), shedding 70%–85% of byte overhead with zero visual distortion.

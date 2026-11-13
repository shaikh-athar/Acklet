# Acklet Image Compressor — Architecture & Implementation

## 1. Overview
- **Tool Slugs**: `image-compressor`, `imagecompressor`, `img-compressor`
- **Subdomain**: `imagecompressor.acklet.com` (locally: `imagecompressor.localhost:4200`)
- **Dedicated Route**: `/tools/image-compressor` (aliases: `/image-compressor`, `/imagecompressor`, `/img-compressor`)
- **Category**: `Media` (`categorySlug: 'media'`)
- **Accent**: `blue` (`#3B82F6` dark / `#2563EB` light, hue: 221)
- **Execution Mode**: 100% In-Browser, Private & Client-Side (`executionMode: 'browser'`)
- **Milestones Completed**:
  - **Phase 1**: Upload Management & Configuration Foundation
  - **Phase 2**: Actual In-Browser Image Compression Engine & Before/After Comparison
  - **Phase 3**: Smart Compression, Target File Size Optimization & Objective Visual Quality Metrics (SSIM/PSNR)
  - **Phase 4**: Multi-Variant Responsive Generation, Developer Presets, EXIF/GPS Metadata Controls & Optimization Audit Reports (CSV/JSON)
  - **Phase 5**: Performance, Reliability, Browser Compatibility, Output Validation & Production Readiness
  - **Phase 6**: Final UX Polish, SEO Optimization, Privacy-Conscious Telemetry & Launch Readiness
  - **Phase 7**: Advanced Image Intelligence, Semantic Category Classification, Visual Difference Heatmaps, Reusable Profiles & Codec Controls
  - **Phase 8**: Final Feature Integration, Operational Monitoring, Structured Error Diagnostics & Continuous Improvement
- **Related Documentation**:
  - [Image Converter Architecture](image-converter.md)
  - [Universal File Converter Documentation](file-converter.md)
  - [Standalone Tool Architecture](standalone-tool-architecture.md)
  - [UI Design System & Tokens](ui-design-system.md)
  - [Subdomain Routing Setup](subdomain-routing-setup.md)

---

## 2. Core Architecture & Processing Pipeline

The Acklet Image Compressor runs completely inside the user's browser using HTML5 Canvas, `createImageBitmap`, binary EXIF parsing, mathematical sampling grids, and format-specific encoder APIs. No images or metadata are ever uploaded to any server.

```
Upload Landing / Drag & Drop
            │
            ▼
[CompressorValidationService] ────> Binary Magic Bytes & Anti-Exploit Security Check
            │                       • Duplicate image detection (identical size & dimensions)
            ▼
[ImageMetadataService] ───────────> Binary JPEG/TIFF EXIF & GPS Parser (Camera, Date, GPS, Color Space)
            │
            ▼
[SmartAnalysisService] ───────────> Alpha Channel Inspection & Visual Color Entropy Analysis
            │                       • Generates SmartRecommendation (photo vs graphic, format, quality)
            ▼
[CompressorStateService] ─────────> Session Store & Controlled Concurrency Queue (2 parallel workers)
            │
    ┌───────┴───────────────────────────────┐
    ▼                                       ▼
Worker 1                                Worker 2
    │                                       │
    ▼                                       ▼
[ImageDecoderService]                    [ImageDecoderService]
  • createImageBitmap (EXIF auto-orient)   • createImageBitmap (EXIF auto-orient)
  • Fallback to HTMLImageElement           • Fallback to HTMLImageElement
  • Safe SVG XML vector rasterization      • Safe SVG XML vector rasterization
  • 100 MP / 16384px dimension guard       • 100 MP / 16384px dimension guard
    │                                       │
    ▼                                       ▼
[ImageResizeService]                     [ImageResizeService]
  • Multi-step bicubic downscaling         • Multi-step bicubic downscaling
  • Percentage or fixed dimension fit      • Percentage or fixed dimension fit
  • Aspect ratio preservation              • Aspect ratio preservation
  • Optional preventUpscale guard          • Optional preventUpscale guard
    │                                       │
    ▼                                       ▼
[Mode Selection & Optimization Branch]
    ├─ If Developer Preset:
    │    └──> [DeveloperPresets] (Website, Blog, E-commerce, Social, Thumbnails, Retina)
    ├─ If Target File Size Enabled:
    │    └──> [TargetSizeOptimizerService] (Bounded binary search, max 6 passes, min 25% floor)
    ├─ Else If Smart Preset:
    │    └──> [SmartAnalysisService] (Best Quality: Q90, Balanced: Q80, Smallest Size: Q60)
    └─ Else:
         └──> [ImageEncoderService] (Custom quality 1-100)
    │                                       │
    ▼                                       ▼
[ImageMetadataService]                   [ImageMetadataService]
  • Policy 'remove': Canvas re-encoding strips all markers (100% privacy)
  • Policy 'strip-gps': Zeroes tag 0x8825 in JPEG APP1 segment to protect location
  • Policy 'preserve': Retains camera metadata and orientation
    │                                       │
    ▼                                       ▼
[Multi-Variant Generator]                [Multi-Variant Generator]
  • Generates scaled variants from memory (Thumbnail 320px, Mobile 640px, Desktop 1280px, Large 1920px)
    │                                       │
    ▼                                       ▼
[ImageQualityMetricService]              [ImageQualityMetricService]
  • Resamples original & output to 128x128 grayscale luminance grid (ITU-R BT.601)
  • Computes genuine mathematical SSIM & PSNR (dB)
  • Classifies rating (excellent, good, fair, poor) & triggers visual warnings
    │                                       │
    └───────────────────┬───────────────────┘
                        ▼
              [CompressionResult]
  • Actual output Blob & Object URL
  • Genuine byte savings & net percentage
  • Target achievement status (targetAchieved, targetUnreachable, iterationsCount)
  • Objective visual quality metrics (ssim, psnr, qualityRating, warning)
  • Generated responsive variants array (ImageVariantResult[])
  • Metadata retention & removal audit report (ExifMetadataReport)
  • Already-optimized detector flag
                        │
                        ▼
            UI Update & Output Actions
  • Image Card: Savings badge, Target Met pill, SSIM rating, EXIF/GPS pill, Variants dropdown
  • Metadata Modal: Camera details, GPS map coordinates warning, retained vs stripped fields
  • Optimization Report Modal: Session metrics table with 1-click RFC 4180 CSV & JSON downloads
  • Bulk Toolbar: "Retry Failed", "Clear Completed", "Download All (ZIP)" with nested variants folder
```

---

## 3. Modular Services

### A. `ImageCapabilityService`
- **Location**: `client/apps/tool-image-compressor/src/services/image-capability.service.ts`
- **Responsibilities**:
  - Dynamically probes browser canvas encoding support (`image/jpeg`, `image/png`, `image/webp`, `image/avif`).
  - Resolves target MIME types and file extensions based on user settings (`original`, `jpeg`, `png`, `webp`, `avif`).
  - Detects transparency conflicts (e.g., converting alpha PNG/SVG images to JPEG requires `#FFFFFF` compositing).
  - Differentiates true lossy compression from lossless encoding (PNG canvas re-encoding is strictly classified as lossless).

### B. `ImageDecoderService`
- **Location**: `client/apps/tool-image-compressor/src/services/image-decoder.service.ts`
- **Responsibilities**:
  - Decodes input files into 2D canvas representations using `createImageBitmap(file, { imageOrientation: 'from-image' })` where available to automatically respect EXIF orientation.
  - Safe fallback to `HTMLImageElement` with sanitized object URLs.
  - Vector SVG parsing: safely parses width, height, and viewBox attributes before rendering to a canvas.
  - Decompression bomb guard: rejects images exceeding 16,384px on any dimension or 100 Megapixels total to prevent browser tab crashes.
  - Headless/worker testing mock fallback: includes a structured pixel buffer fallback for Node/vitest test environments.

### C. `ImageResizeService`
- **Location**: `client/apps/tool-image-compressor/src/services/image-resize.service.ts`
- **Responsibilities**:
  - Dimensions mode: supports width, height, aspect-ratio locked bounding box fit, or freeform stretch.
  - Percentage mode: scales image from 1% to 500%.
  - High-quality stepped downsampling: when reducing by more than 50%, images are halved in successive passes with `imageSmoothingQuality = 'high'` to eliminate downsampling shimmer.
  - `preventUpscale` guard: clamps dimensions so smaller images are never enlarged unintentionally.

### D. `ImageEncoderService`
- **Location**: `client/apps/tool-image-compressor/src/services/image-encoder.service.ts`
- **Responsibilities**:
  - JPEG Encoding: explicitly composites alpha and semi-transparent pixels onto a solid `#FFFFFF` background before calling `toBlob('image/jpeg', quality)`.
  - PNG Encoding: retains full 32-bit alpha transparency with lossless canvas encoding.
  - WebP Encoding: supports high-efficiency lossy compression with transparency preservation.
  - AVIF Encoding: encodes to `image/avif` if supported; automatically falls back to `image/webp` if the browser does not support AVIF encoding.
  - Validates non-empty Blob outputs and authenticates MIME types.

### E. `SmartAnalysisService` (Phase 3)
- **Location**: `client/apps/tool-image-compressor/src/services/smart-analysis.service.ts`
- **Responsibilities**:
  - Client-side image analysis on an extracted $64 \times 64$ thumbnail canvas.
  - **Alpha Channel Detection**: checks alpha values across pixel data to detect transparency or transparent cutout backgrounds.
  - **Color Entropy & Classification**: quantizes colors into a 15-bit color space (`r >> 3`, `g >> 3`, `b >> 3`). Samples with high color variety ($> 450$ unique colors) are classified as photographs; lower counts are classified as graphic artwork/flat graphics.
  - **Smart Presets Engine**:
    - **Best Quality**: Q90. Prioritizes visual fidelity with modest size reduction.
    - **Balanced** (Default): Q80. Ideal balance between visual clarity and file size.
    - **Smallest Size**: Q60. Maximum practical compression without severe degradation.
  - **Intelligent Recommendations**:
    - Photographic PNGs $\to$ suggests WebP or JPEG for $\sim 75\%$ size savings.
    - Alpha Graphics $\to$ suggests WebP or PNG while preserving the alpha channel.
    - Flat Graphics/Diagrams in JPEG $\to$ suggests WebP at higher quality to avoid DCT block artifacts.
    - Ultra-high resolution ($> 8$ MP, $> 5$ MB) $\to$ adjusts expected savings upward.

### F. `TargetSizeOptimizerService` (Phase 3)
- **Location**: `client/apps/tool-image-compressor/src/services/target-size-optimizer.service.ts`
- **Responsibilities**:
  - Bounded iterative binary search optimization algorithm to discover the highest quality setting that satisfies a maximum file size limit (KB or MB).
  - **Lossless PNG Handling**: Canvas cannot lossily re-encode PNG; performs a single pass check. If lossless PNG exceeds the budget, it honestly flags `targetUnreachable: true` and suggests converting to WebP.
  - **Early Halting for Impossible Targets**: In Pass 1, evaluates the minimum quality floor (default: Q25%). If the floor output already exceeds the requested target bytes, the search halts immediately with `targetUnreachable: true` without wasting iterations.
  - **Ceiling Check**: In Pass 2, tests high quality (Q92%). If satisfied, halts immediately with `targetAchieved: true`.
  - **Bounded Binary Search**: Narrows quality window between `lowQ` and `highQ` over at most 6 total passes (`MAX_OPTIMIZATION_PASSES = 6`).
  - Emits real-time iteration progress (`onIterationProgress`) during search passes.

### G. `ImageQualityMetricService` (Phase 3)
- **Location**: `client/apps/tool-image-compressor/src/services/image-quality-metric.service.ts`
- **Responsibilities**:
  - Genuine mathematical computation of Structural Similarity Index (SSIM) and Peak Signal-to-Noise Ratio (PSNR in dB).
  - **Luminance Channel Extraction**: Resamples both original and compressed canvases onto a standardized $128 \times 128$ grid using ITU-R BT.601 conversion:
    $$Y = 0.299R + 0.587G + 0.114B$$
  - **SSIM Formula**: Computes mean values ($\mu_x, \mu_y$), variances ($\sigma_x^2, \sigma_y^2$), and covariance ($\sigma_{xy}$) with standard stabilization constants $C_1 = (0.01 \times 255)^2$ and $C_2 = (0.03 \times 255)^2$:
    $$\text{SSIM}(x, y) = \frac{(2\mu_x\mu_y + C_1)(2\sigma_{xy} + C_2)}{(\mu_x^2 + \mu_y^2 + C_1)(\sigma_x^2 + \sigma_y^2 + C_2)}$$
  - **PSNR Formula**:
    $$\text{MSE} = \frac{1}{N} \sum (x_i - y_i)^2, \quad \text{PSNR} = 10 \cdot \log_{10}\left(\frac{255^2}{\text{MSE}}\right)$$
  - **Quality Rating Classification**:
    - **Excellent**: SSIM $\ge 0.94$ and PSNR $\ge 36\text{ dB}$ (virtually indistinguishable).
    - **Good**: SSIM $\ge 0.86$ and PSNR $\ge 30\text{ dB}$ (high visual fidelity).
    - **Fair**: SSIM $\ge 0.76$ (slight artifacts; displays warning pill).
    - **Poor**: SSIM $< 0.76$ (significant degradation warning banner).

### H. `ImageMetadataService` (Phase 4)
- **Location**: `client/apps/tool-image-compressor/src/services/image-metadata.service.ts`
- **Responsibilities**:
  - Pure binary parser for JPEG APP1 markers (`0xFF 0xE1`) and TIFF headers (`II` little-endian, `MM` big-endian) with zero runtime dependencies.
  - Extracts camera metadata: Make, Model, DateTime, Orientation tag, DPI resolution, and Color Space (sRGB / Adobe RGB).
  - GPS metadata detection: parses Latitude, Longitude, and Altitude rational triplets.
  - **Tri-State Metadata Policy Engine**:
    - **Strip All (`remove`)**: Default privacy setting. Re-encoding via canvas strips all EXIF and GPS markers for maximum privacy and minimal overhead.
    - **Strip GPS (`strip-gps`)**: Scans APP1 IFD structures and zeroes out GPS pointer tag `0x8825`, keeping camera make and date intact while removing location data.
    - **Preserve (`preserve`)**: Retains EXIF headers on supported output formats.
  - Provides detailed audit of fields detected, fields removed, and fields retained.

### I. `OptimizationReportService` (Phase 4)
- **Location**: `client/apps/tool-image-compressor/src/services/optimization-report.service.ts`
- **Responsibilities**:
  - Compiles full session metrics into an `OptimizationReport` structure.
  - Computes total images, completed count, failed count, skipped count, original bytes, compressed bytes, saved bytes, overall savings %, average SSIM, and total variants generated.
  - **RFC 4180 CSV Export**: Generates compliant CSV files with full escaping for filenames, status messages, and retained/removed metadata arrays.
  - **Formatted JSON Export**: Generates pretty-printed JSON audit logs for developer integrations and CI/CD asset pipelines.

### J. `DeveloperPresetsConstant` (Phase 4)
- **Location**: `client/apps/tool-image-compressor/src/services/developer-presets.constant.ts`
- **Responsibilities**:
  - Ready-to-use presets for standard engineering and content workloads:
    - **Website Images**: WebP, Q80, max 1280px width, `remove` metadata policy.
    - **Blog & Articles**: WebP, Q82, max 1200px width, `strip-gps` policy.
    - **E-commerce Products**: WebP, Q85, 1000x1000px bounding box, `remove` metadata policy.
    - **Social Media**: JPEG, Q85, 1200x630px OpenGraph standard, `remove` metadata policy.
    - **Thumbnails**: WebP, Q75, 320px width, `remove` metadata policy.
    - **Retina / High-DPI**: WebP, Q90, 2560px width, `strip-gps` policy.
  - Standard responsive variants preset: `Thumbnail (320px)`, `Mobile (640px)`, `Desktop (1280px)`, `Large Display (1920px)`.

---

## 4. UI Components & User Experience

### A. Upload Workspace & Bulk Toolbar
- **Drag-and-Drop Landing**: large drop zone supporting up to 50 images and 50 MB per file.
- **Duplicate Image Detection**: Computes size and dimension fingerprints upon upload; automatically tags duplicate files with a warning pill and tooltip reference to the original file.
- **Image Cards (`ImageCardComponent`)**:
  - Compact row card displaying original vs compressed file size, dimensions, format conversion indicator, and savings badge.
  - **EXIF & GPS Badges**: Interactive button pill showing `EXIF` or `GPS + EXIF` in warning amber; clicking opens the Metadata Inspection Modal.
  - **Already-Optimized Pill**: Displays `Optimal` when recompression would enlarge or provide $< 1\%$ reduction.
  - **Variants Dropdown**: Shows `X variants` pill; clicking opens a popover listing generated responsive versions with direct individual download buttons.
  - **Smart Recommendation Banner**: Shows suggested format, recommended quality, and estimated savings with a single-click "Apply" button.
  - **Target Size Badges**: Displays `Target Met` or `Target Unreachable`.
  - **SSIM Quality Badges**: Displays `SSIM 0.XX (Rating)` with color classification.
  - Quick action buttons: Compress / Recompress, Retry, Compare Before & After, Download, Keep Original, Individual Settings, Remove.
- **Bulk Toolbar**:
  - "Compress All" / "Compress Selected"
  - "Retry Failed (X)" (retries all failed tasks with one click)
  - "Clear Completed" (clears finished tasks to streamline workspace)
  - "Optimization Report" (opens full session audit modal)
  - "Apply Smart Recommendations" (batch applies AI suggestions to all uncustomized items)
  - "Apply Global Settings" (bulk reset overrides)
  - "Remove Selected" (bulk deletion)

### B. Settings Panel (`SettingsPanelComponent`)
- **Developer Presets Grid**: 6 responsive cards (Website, Blog, E-commerce, Social, Thumbnails, Retina) with one-click activation.
- **Responsive Multi-Variants**:
  - Toggle switch for generating responsive multi-variants.
  - Editable widths for Thumbnail (320px), Mobile (640px), Desktop (1280px), Large (1920px).
- **Target File Size Section**:
  - Toggle switch to enable maximum file size budget.
  - Numeric input for target size with unit selector (`KB` / `MB`).
  - Quick target size pills: `100 KB`, `250 KB`, `500 KB`, `1 MB`, `2 MB`.
- **Mode Selection**: Smart Mode (Best Quality, Balanced, Smallest Size) vs Custom Mode.
- **Metadata Policy Control**: 3-way toggle button group (`Strip All`, `Strip GPS`, `Preserve`) with explanatory hints.
- **Resize Dimensions**: Mode toggle (Dimensions vs Percentage), aspect ratio lock toggle, and prevent-upscale guard.
- **Individual Override Support**: Drawer header shows active image filename, override notice, and "Reset to Global" button.

### C. Metadata Inspection Modal (`MetadataModalComponent`)
- Clean standalone modal displaying:
  - Camera Make and Model.
  - Original Date & Time and DPI resolution.
  - Color Space and EXIF orientation.
  - **GPS Privacy Alert Box**: Highlights detected GPS Latitude, Longitude, and Altitude with a privacy warning.
  - **Active Policy Indicator**: Shows which tags will be stripped vs retained under the selected policy (`Strip All`, `Strip GPS`, or `Preserve`).

### D. Optimization Audit Report Modal (`ReportModalComponent`)
- Comprehensive session audit modal featuring:
  - Top KPI cards: Total Images, Bytes Saved, Average Reduction %, Average SSIM, Total Variants Generated.
  - Detailed per-image breakdown table: Original Name, Formats, Input/Output Dimensions, Sizes, Savings, SSIM, Status, and Variant Counts.
  - One-click export actions: **Download CSV** (`acklet-compression-report.csv`) and **Download JSON** (`acklet-compression-report.json`).

### E. Before / After Comparison Modal (`PreviewModalComponent`)
- **Three Comparison Modes**: Split Slider (`split`), Side by Side (`side-by-side`), and Flip / Toggle (`toggle`).
- Zoom Controls and Footer Quality & Target Chips (SSIM, PSNR, Target Met/Unreached).

### F. Compression Summary (`ProcessingSummaryComponent`)
- Real-time aggregate statistics: Original Total, Compressed Size, Space Saved, Net Reduction % (authentically calculated from sum of bytes).
- Badges: Active Preset, Target Achievement, Batch Average SSIM, and Total Variants Generated.
- Action Buttons: "Compress All Images", "Cancel Processing", "Download All (ZIP)" (bundles master compressed outputs and responsive variants in a `variants/` folder), and "Report" button.

---

## 5. Concurrency Queue, Memory Management & Event Loop Slicing

To maintain 60 FPS UI responsiveness and prevent browser tab crashes or memory exhaustion during 50-file batches, the compression engine enforces strict operational limits:

1. **Dynamic Memory-Aware Concurrency**:
   - Evaluates hardware capabilities via `navigator.hardwareConcurrency` and `navigator.deviceMemory`.
   - Constrained devices ($\le 2$ GB RAM or $\le 2$ CPU cores) are allocated **1 slot**.
   - Heavy high-resolution images ($> 16$ Megapixels or $> 10$ MB file size) are throttled to **1 slot** dynamically to prevent out-of-memory spikes.
   - Standard images on multi-core desktop machines are processed with **2 parallel slots**.
2. **Event Loop Micro-Task Slicing (`yieldToMain`)**:
   - The compression pipeline injects `scheduler.yield()` (with `setTimeout(0)` fallback) between heavy decode, resize, optimization search iterations, and multi-variant generation steps.
   - Eliminates long browser tasks ($> 50$ms), keeping progress spinners, cancellable interactions, and tab rendering fluid at 60 FPS.
3. **Comprehensive Object URL Lifecycle & Leak Prevention**:
   - `URL.revokeObjectURL` is immediately executed when:
     - Intermediate canvas blobs are converted.
     - An image is recompressed (prior master output and all responsive variant URLs are revoked).
     - Images are removed individually (`removeImage`) or in bulk (`removeSelected`, `removeAll`, `clearCompleted`).
     - A user reverts to the original file via `keepOriginal`.
     - The component lifecycle terminates (`ngOnDestroy` invokes `cleanupAllObjectUrls`).
4. **Resilient Error Recovery & Retry Flow**:
   - Corrupted or unparseable files fail isolated items without disrupting batch processing.
   - Memory exhaustion (`QuotaExceededError`) displays actionable warnings guiding the user to reduce batch size or close other tabs.
   - Built-in "Retry Failed" and per-item retry triggers allow restarting failed tasks without re-uploading.
5. **Secure ZIP Packaging Safeguards**:
   - Sanitizes illegal path characters (`[\\/:*?"<>|]`) from archive filenames.
   - Filters zero-byte and corrupted output files before archive packaging.
   - Concurrent ZIP packaging lock (`isPackagingZip`) prevents duplicate worker exhaustion.
6. **SVG Sanitization & Script Neutralization**:
   - Strips `<script>`, inline event handlers (`onload=`, `onerror=`, `onclick=`), `javascript:` URIs, and `<foreignObject>` tags before vector rasterization.

---

## 6. Browser Compatibility & Capability Detection Matrix

The Image Compressor dynamically probes encoder support at startup using fast synchronous `toDataURL` verification backed by timeout-guarded `toBlob` fallbacks:

| Feature / Format | Chrome (Blink) | Firefox (Gecko) | Safari (WebKit) | Edge (Chromium) | Mobile (iOS/Android) | Fallback Behavior |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **JPEG Encoding** | Full | Full | Full | Full | Full | Native canvas encoder |
| **PNG Encoding** | Full | Full | Full | Full | Full | Native canvas encoder |
| **WebP Encoding** | Full | Full | Full (iOS 14+) | Full | Full | Falls back to JPEG (lossy) or PNG (lossless) |
| **AVIF Encoding** | Partial (v116+) | Behind Flag | Partial (Safari 16+) | Partial (v116+) | Partial | Dynamically probes; falls back to WebP / JPEG |
| **ImageBitmap Decoding** | Full | Full | Full | Full | Full | Falls back to HTMLImageElement on legacy engines |
| **EXIF Orientation** | Full | Full | Full | Full | Full | Auto-rotated via `imageOrientation: 'from-image'` |
| **Client-Side Storage** | In-Memory | In-Memory | In-Memory | In-Memory | In-Memory | Zero remote server transmissions |

---

## 7. SEO, Telemetry & Launch Architecture (Phase 6)

### A. Search Engine Optimization & Structured Data
- **Target Keywords**: `Compress Images Online`, `Free Image Compressor`, `Compress JPG Online`, `Compress PNG Online`, `Compress WebP Images`, `Bulk Image Compressor`, `Reduce Image File Size`.
- **Meta Tags**: Optimized `<title>`, `<meta name="description">`, `<meta name="keywords">`, and `<link rel="canonical" href="https://imagecompressor.acklet.com/">`.
- **Social Graph Sharing**: Open Graph (`og:type`, `og:title`, `og:description`, `og:url`, `og:site_name`, `og:image`) and Twitter Card (`summary_large_image`) tags for rich link previews.
- **JSON-LD Schema**: Embedded `WebApplication` schema targeting Google rich snippets, declaring category (`MultimediaApplication`), free zero-price offer, supported operating systems, browser requirements, and feature list.

### B. Educational & Landing Content
- **Value Propositions**: 4 highlighted benefit cards (100% In-Browser Privacy, Bounded Target Size Search, Multi-Variant Generation, Perceptual SSIM Metrics).
- **Lossy vs. Lossless Visual Guide**: Explains the technical distinction between discrete cosine transform / quantization (JPG, WebP, AVIF) and DEFLATE entropy encoding (PNG, WebP Lossless, SVG).
- **Workflow Guide**: 3 clear steps for batch optimizing up to 50 files.
- **Frequently Asked Questions (FAQ)**: 6 comprehensive questions answering privacy, limits, enlargement handling, and format capabilities with accessible accordion controls.
- **Cross-Tool Directory**: Internal links to complementary Acklet image utilities:
  - **Image Converter** (`https://imageconverter.acklet.com`): Convert between 30+ raster and vector formats.
  - **QR Code Generator** (`https://qr.acklet.com`): Generate custom branded vector QR codes.
  - **Barcode Generator** (`https://barcode.acklet.com`): Produce standards-compliant Code 128, EAN-13, and UPC barcodes.
  - **DataLens** (`https://datalens.acklet.com`): Format, repair, and inspect nested JSON data.

### C. UX Refinements & Confirmation Safeguards
- **Destructive Action Confirmation (`ConfirmModalComponent`)**: Protects users from accidental data loss when clicking "Remove All" or "Start New Session".
- **Start New Session (`requestNewSession`)**: Resets all settings, clears image cache, revokes memory object URLs, and cleanly returns to the upload screen with user confirmation.
- **Clear Settings Guidance**: Enhanced descriptions across Smart Mode (Best Quality Q90, Balanced Q80, Smallest Size Q60), Custom Slider, and Target File Size search.
- **Recompression Feedback**: Explanatory tooltips and direct "Keep Original" action when recompression yields an asset larger than the original.

### D. Privacy-Conscious Telemetry & Feedback
- **`CompressorTelemetryService`**:
  - Tracks key workflow events: `tool_opened`, `upload_completed`, `compression_completed`, `compression_failed`, `download_completed`, `preset_selected`, `format_selected`, and `feedback_submitted`.
  - Dispatches custom DOM event `acklet:telemetry` and aggregates local counts.
  - **Zero PII Guarantee**: Strictly excludes image contents, file names, EXIF data, GPS coordinates, and user identifiers.
- **User Feedback Dialog (`FeedbackModalComponent`)**:
  - In-app modal for rating experience (Great vs Needs Work), categorizing feedback (Feature Request, Bug Report, Quality Feedback, General), and sending direct user suggestions.

---

## 8. Advanced Image Intelligence & Optimization Automation (Phase 7)

### A. Deterministic In-Browser Intelligence (`SmartAnalysisService`)
- **Visual Edge Density Metric**: High-frequency luminance gradient calculation ($G = |\Delta L_x| + |\Delta L_y| > 28$) across a 64×64 normalized analysis grid in $<2$ms. Distinguishes natural continuous photographs from sharp UI screenshots.
- **Bits-Per-Pixel (BPP) Calculation**: Deterministic calculation:
  $$\text{bpp} = \frac{\text{fileSize} \times 8}{\text{width} \times \text{height}}$$
- **Already-Optimized Detection (`isAlreadyOptimized`)**: Identifies images where recompression would cause generational degradation or file enlargement:
  - JPEG with $\text{bpp} < 0.6$
  - WebP with $\text{bpp} < 0.45$
  - PNG with $\text{bpp} < 1.0$ and $\le 256$ indexed colors
- **Semantic Category Classification (`imageCategory`)**:
  - `photo`: Natural scenes, high color entropy, low edge density.
  - `screenshot`: UI/text captures with high edge density and crisp borders.
  - `graphic`: Flat illustrations and icons with solid colors.
  - `logo-icon`: Small dimensions with alpha transparency and discrete palettes.
  - `optimized`: Assets that already reach maximum practical entropy compression.

### B. Adaptive Compression Matrix & Presets
| Category | Recommended Target Format | Quality | Chroma Subsampling | Transparency Handling | Expected Savings |
|---|---|---|---|---|---|
| **Photo** | Modern WebP (or JPEG) | 80% (Balanced) | 4:2:0 | Flattened if JPEG | 45%–70% |
| **Screenshot** | Modern WebP | 85% (Best Quality) | 4:4:4 (Sharp Edges) | Alpha preserved | 35%–55% |
| **Graphic** | WebP / PNG | 80% | Auto | Clean alpha noise | 40%–60% |
| **Logo/Icon** | Lossless WebP / PNG | 85% | 4:4:4 | Clean alpha noise | 30%–50% |
| **Optimized** | Original Format | 85% | Auto | Preserved | Keep Original (0%–5%) |

### C. Visual Difference Map & Artifact Scoring (`ImageQualityMetricService`)
- **Amplified Difference Heatmap (`generateDifferenceMap`)**: Generates an amplified 4× false-color difference map highlighting quantization errors and high-frequency edge loss:
  - Dark Navy (`#0F172A`): 0% difference (identical pixels)
  - Cyan (`#06B6D4`): Subtle quantization shifts ($< 15\%$)
  - Bright Amber (`#F59E0B`): Moderate high-frequency loss ($15\%–40\%$)
  - Vibrant Red/Magenta (`#EF4444`): Severe detail degradation ($> 40\%$)
- **Artifact Detection Score (`artifactScore`)**: Quantifies compression blockiness and ringing artifacts on a normalized 0–100 scale:
  $$\text{artifactScore} = \min\left(100, \text{round}\left((1 - \text{SSIM}) \times 110 + \frac{\sqrt{\text{MSE}}}{255} \times 80\right)\right)$$
- **Interactive Diff View (`PreviewModalComponent`)**: Integrated `'diff'` mode alongside split slider, side-by-side, and toggle views, complete with floating color-scale legend and artifact readout.

### D. Category Filtering & Intelligent Batch Operations
- **Workspace Category Pills**: Quick-filter images by category: All, Photos, Screenshots, Graphics, Logos, and Optimal with live badge counts.
- **Adaptive Tune All**: Single-click bulk action applying deterministic recommendations tailored to each individual asset's category and characteristics.
- **Category-Specific Tuning**: Option to tune all images of a specific category (e.g. only Screenshots or only Photos).

### E. Optimization Profiles (`ProfileManagerService` & `ProfileModalComponent`)
- **5 Built-in System Profiles**:
  1. `Web Balanced`: WebP output at 80% quality with metadata stripped.
  2. `E-Commerce HD`: WebP output at 85% quality, 1200px max width, GPS stripped.
  3. `Ultra Compressed`: WebP target size $\le 150$ KB with maximum compression effort.
  4. `Lossless Archival`: 100% PNG preservation with full metadata retained.
  5. `Social OpenGraph`: 1200×630px JPEG format for social link preview cards.
- **User Custom Profiles**: Full CRUD with `localStorage` persistence under `acklet:compressor:profiles`:
  - Create profile from current workspace settings.
  - Duplicate any system or custom profile.
  - Apply profile globally or to currently selected images.
  - Delete user-created profiles with instant state updates.

### F. Advanced Codec Controls (`SettingsPanelComponent` & `ImageEncoderService`)
- **Compression Effort (1–6)**: Fine-grained slider controlling encoder effort vs speed trade-offs.
- **Chroma Subsampling (JPEG)**: Toggle between `Auto`, `4:2:0` (standard bandwidth-saving), and `4:4:4` (full color resolution for UI text and screenshots without color fringing).
- **Clean Alpha Noise (`cleanTransparentPixels`)**: Automatically zeros RGB components on fully transparent pixels ($\alpha = 0$), eliminating hidden entropy noise to maximize WebP/PNG deflation ratios.
- **Progressive JPEG & PNG Palette Optimization**: Codec-level flags ensuring fast progressive loading and palette quantization.

---

## 9. Final Feature Integration, Monitoring & Production Operations (Phase 8)

Phase 8 validates and solidifies the complete end-to-end user workflow across all 8 phases, integrating real-time operational metrics, structured error reporting with actionable user recovery advice, and comprehensive session resilience.

### A. End-to-End User Journey Validation
The complete processing pipeline was audited and verified for consistent state transitions and data flow without disjointed navigation or dropped settings:
$$\text{Upload} \longrightarrow \text{Analyze} \longrightarrow \text{Configure} \longrightarrow \text{Compress} \longrightarrow \text{Optimize} \longrightarrow \text{Compare} \longrightarrow \text{Download} \longrightarrow \text{Report}$$

1. **Upload & Admission**: Strict multi-criteria admission (binary magic bytes, 50MB size limit, 100MP decompression safety cap, duplicate file fingerprint detection, 50-file session capacity).
2. **Deterministic Analysis**: Semantic category classification (`photo`, `screenshot`, `graphic`, `logo-icon`, `optimized`), bits-per-pixel calculation, and automatic recommendations without external server or AI overhead.
3. **Configuration Inheritance**: Hierarchical settings merging global defaults with developer presets (`website`, `blog`, `ecommerce`, `social`, `thumbnail`, `retina`), user-saved profiles, and per-image overrides with explicit reset capabilities.
4. **Adaptive Processing**: Format-aware lossy and lossless re-encoding, bicubic downsampling, transparency noise cleaning, and iterative binary search target size optimization.
5. **Quality & Compare**: SSIM / PSNR calculation, amplified 4× difference heatmaps, blockiness artifact scoring, and interactive visual comparison modes (Split, Side-by-Side, Flip, Diff).
6. **Delivery & Auditing**: Validated single downloads, ZIP archive packaging with folder structures, and audit reports in CSV and JSON formats.

### B. Operational Monitoring & Zero-PII Telemetry (`CompressorTelemetryService`)
The telemetry system aggregates anonymous operational metrics in real-time, providing deep operational visibility while rigorously adhering to Zero-PII principles (no file names, file paths, coordinates, image content, or identifiable metadata are ever collected or transmitted):
- **Metrics Aggregation (`OperationalMetricsSummary`)**:
  - `successfulCount`: Cumulative count of successful image compressions.
  - `failedCount`: Count of failed processing attempts.
  - `totalSavedBytes` & `totalCompressedBytes`: Exact byte savings across the session.
  - `totalDurationMs` & `averageDurationMs`: Mean and aggregate execution duration.
  - `workerFailures`: Web worker crashes or timeouts.
  - `zipFailures`: Packaging or browser memory constraints during ZIP generation.
  - `compatibilityIssues`: Missing browser codec features (e.g. lack of AVIF or WebP write capability).
  - `formatUsage`: Frequency distribution of output formats (`webp`, `jpeg`, `png`, `avif`).
- **Telemetry Dispatch**: Events (`acklet:telemetry`) dispatched via custom window events and persisted in session storage (`acklet:compressor:session-stats`).

### C. Structured Diagnostic Error Reporting & Error Code Catalog
To eliminate cryptic technical errors, `CompressorTelemetryService` and `CompressorStateService` produce structured `DiagnosticErrorReport` instances paired with immediate, actionable user advice:

| Error Code | Category | Actionable User Advice |
|---|---|---|
| `CODEC_INIT_FAILED` | `codec` | The browser could not initialize the image encoder. Try switching output format or updating your browser. |
| `DECODING_ERROR` | `decoder` | The image could not be decoded. It may be corrupted, truncated, or an unsupported binary variant. |
| `ENCODING_ERROR` | `encoder` | Encoding failed. Try lowering resolution or switching output format (e.g., from AVIF to WebP). |
| `WORKER_FAILURE` | `worker` | Background compression worker encountered an unrecoverable error. The item was retried in main thread. |
| `OUT_OF_MEMORY` | `memory` | Browser exceeded memory limits. Try processing fewer images concurrently or downscaling dimensions. |
| `UNSUPPORTED_FORMAT` | `format` | This file format cannot be encoded in this browser. Please select WebP, JPEG, or PNG. |
| `OPTIMIZATION_TARGET_FAILED` | `optimization` | Target file size is unreachable without severe quality degradation. Minimum quality floor was reached. |
| `DOWNLOAD_EMPTY_BLOB` | `download` | Generated compressed file was empty. Recompress the image before downloading. |
| `ZIP_GENERATION_FAILED` | `download` | Failed to package ZIP archive. Try downloading files individually. |
| `METADATA_PARSE_FAILED` | `metadata` | Image metadata could not be fully parsed. Default metadata removal policy was applied. |

### D. Concurrency & Reliability Safeguards
1. **Duplicate Compression Prevention**: `compressItem`, `compressAll`, and `compressSelected` inspect active item states (`pending`, `decoding`, `processing`, `encoding`) before queue admission, preventing race conditions and duplicated work.
2. **Safe Window Unload Guard**: Registered `@HostListener('window:beforeunload')` detects active compression tasks (`state.isCompressingAny()`) and warns the user before accidental tab closure or navigation.
3. **Download Validation**: `downloadItemResult` verifies `outputBlob.size > 0` before triggering browser downloads, recording a diagnostic error and preventing silent zero-byte file downloads.
4. **Lifecycle & Memory Cleanup**: Component destruction cleans up active workers and aborts in-flight tasks (`ngOnDestroy`), while `revokeItemUrls` systematically reclaims memory for preview and output object URLs.

### E. Acklet Ecosystem Integration
- **Tools Catalog Registration**: Registered in `client/packages/tool-shell/src/catalog/tools.catalog.ts` under `image-compressor` with matching slug aliases.
- **Unified Navigation & Tokens**: Fully integrated with `@acklet/tool-shell` navigation, header actions, unified theme tokens, and keyboard accessibility.
- **Interoperability**: Shares standardized image format detection and geometry contracts with Image Converter.

---

## 10. Verification & Quality Assurance

- **Vitest Unit & Integration Tests**: **130 tests** passing across **19 test files**:
  - `app.component.spec.ts` (4 tests)
  - `compressor.config.spec.ts` (6 tests)
  - `compressor-e2e.spec.ts` (2 tests — complete end-to-end workflow validation & profile lifecycle)
  - `compressor-state.service.spec.ts` (31 tests)
  - `compressor-telemetry.service.spec.ts` (7 tests)
  - `compressor-validation.service.spec.ts` (12 tests)
  - `download-helper.util.spec.ts` (3 tests)
  - `image-capability.service.spec.ts` (6 tests)
  - `image-compression.service.spec.ts` (2 tests)
  - `image-decoder.service.spec.ts` (6 tests)
  - `image-encoder.service.spec.ts` (3 tests)
  - `image-metadata.service.spec.ts` (8 tests)
  - `image-quality-metric.service.spec.ts` (5 tests)
  - `image-resize.service.spec.ts` (5 tests)
  - `optimization-report.service.spec.ts` (4 tests)
  - `profile-manager.service.spec.ts` (5 tests)
  - `smart-analysis.service.spec.ts` (7 tests)
  - `target-size-optimizer.service.spec.ts` (4 tests)
  - `transform.service.spec.ts` (10 tests)
- **Production Build**: Verified with `@angular/build:application` (`npx ng build tool-image-compressor`), producing clean production bundles with CommonJS dependencies (`jszip`, `lottie-web`) correctly configured.
- **Acklet Unified Verification**: Level A (`node scripts/verify.mjs -A`) passed with zero errors (all glass styling constraints, tool shell isolation, TypeScript compilation, and shared package tests satisfied).
- **Dual-Theme High Contrast**: Full legibility in both Light (`#FFFFFF`) and Dark (`#111318`) modes using semantic tokens (`--ts-surface-card`, `--border-subtle`, `--accent`, `--success`, `--warning`, `--error`).

---

## 11. UI Simplification & Progressive Disclosure Architecture

To eliminate visual clutter, cognitive overload, and dense technical controls, the Image Compressor interface was refactored under strict progressive disclosure and user guidance principles:

### A. Progressive Disclosure Hierarchy
1. **Empty Landing State**:
   - Stripped away 4 verbose marketing feature cards and heavy decorative gradients.
   - Replaced with a single clean drop zone: `"Drop images here, or click to choose."`
   - Only ONE filled primary button: `"Choose images"`.
   - Concise reassurance and limits: `"Your images stay on your device."` and `"Up to 50 files, 50 MB each."`
2. **Settings Panel**:
   - **Default Visible**: Output Format selector, Quality slider with human-friendly range labels (`Smaller file` to `Sharper image`), and 3 Smart Presets (`Best Quality`, `Balanced`, `Smallest Size`).
   - **Collapsed "Advanced options" Accordion**: Target file size optimizer (`Aim for a file size`), dimensions resizing (`Resize dimensions`), privacy switch (`Remove location info`), advanced codec options (sharp edges 4:4:4, clean transparent pixels, lossless WebP), responsive variant generator (320, 640, 1280, 1920px), and developer optimization presets (Website, Blog, E-commerce, Social, Thumbnail, Retina).
3. **Image Cards**:
   - Primary surface displays only: thumbnail, file name, original size, compressed size, savings percentage, and single action button (`Compress` or `Download`).
   - Clean progress bar with percentage during compression; internal decoder/encoder stage labels are hidden from user view.
   - Secondary tools, dimensions, intuitive Quality Score (`98/100`), format change chips, variants list, and EXIF viewer are neatly tucked inside a collapsible **"Details"** drawer.
4. **Header & Navigation**:
   - 3-step progress flow indicator at top: `Add images` → `Choose settings` → `Download`.
   - Secondary utilities (Profiles, Optimization Audit Report, Clear completed, Feedback, New session) consolidated into a compact **"More"** dropdown menu.

### B. Plain Language & Accessibility
- **No Technical Jargon**: Terms like SSIM, PSNR, chroma subsampling, bicubic, and EXIF are replaced with everyday concepts (`Quality: 98/100`, `Color detail: Sharp edges 4:4:4`, `Remove location info`).
- **Concise Sentences**: UI messages are kept under 12 words with sentence casing.
- **Friendly Recovery**: File rejections and errors display plain causes and clear next steps (e.g., `"This file is too large (max 50 MB). Try a smaller file."`).
- **Plain Confirmations**: Destructive operations use clear warning modals (`"Remove 3 images? This can't be undone."`).
- **Accessibility**: Form controls feature explicit accessible labels, visible `:focus-visible` focus rings, and `aria-live` status announcements.

### C. Mobile-First Responsiveness
- **Single Column Layout**: Automatically adapts to a single column under 768px with cards scaling smoothly down to 375px width with zero horizontal overflow.
- **Sticky Primary Action Bar**: Processing summary anchors cleanly as a sticky bottom bar on mobile screens with a full-width primary button (`Compress all` or `Download all (ZIP)`), ensuring the next step is always within thumb reach.

### D. Audit Documentation & Screenshots
- Before audit screenshots: `docs/ui-audit/*.png`
- After audit screenshots: `docs/ui-audit/after/*.png`
- Comprehensive audit findings and resolution matrix: `docs/ui-audit/findings.md`

## 11. Minimal Studio UI Redesign & Dual-Theme Architecture

### 11.1 Visual Hierarchy & Clean Studio Workspace
Following the user-requested reference model from Acklet's **Image Converter** (`apps/tool-file-converter`), the Image Compressor workspace was refactored from a cluttered, wizard-heavy interface into an elegant, minimal, high-utility Studio workspace:
- **Clean Stage Header Bar**: Streamlined top controls featuring the collection title `Images to Compress`, file counter pill (e.g. `1 / 50`), primary `+ Add Images` button, contextual `More` dropdown (profiles, audit report, feedback, session reset), and `Clear` button.
- **Responsive 4-Column Gallery Grid**: Clean square image cards (`studio-image-card`) with 4:3 preview thumbnails, top-left format badge (e.g. `JPG` or `WEBP`), top-right dismiss `x` button, filename and size display, and inline status/action buttons.
- **In-Grid Dashed "Add More" Tile**: A dedicated dashed upload tile inside the gallery grid (`add-tile-card`) displaying a centered `+` circle and remaining available file slots.
- **Unified Compression Sidebar (`sidebar-inner-card`)**:
  - Global vs Per-Image mode switcher (`All Same (Global)` vs `Per Image (Custom)`).
  - Target format chips (`ORIGINAL`, `WEBP`, `JPG`, `PNG`, `AVIF`).
  - Smooth quality slider paired with active preset pill badges (`Best Quality`, `Balanced`, `Smallest Size`).
  - Dimension resizing & Target File Size bounded options.
  - Collapsible progressive-disclosure accordion for advanced developer settings (EXIF strip, chroma subsampling, multi-variants, and profiles).
  - Fixed bottom CTA button (`Compress X Images ->` or `Download All (ZIP)`).
- **Responsive Mobile Layout (< 1024px)**: Bottom bar with Settings sheet trigger and sticky primary CTA.

### 11.2 Dual-Theme WCAG AA High Contrast System
- **Light Theme**: Pure `#FFFFFF` card surfaces, crisp `#E2E8F0` / `#CBD5E1` borders, deep `#0F172A` headings, and `#475569` secondary copy. Eliminates pitch-black cards on light background.
- **Dark Theme**: Deep `#18181B` card surfaces with subtle `rgba(255, 255, 255, 0.1)` borders, `#FFFFFF` / `#F8FAFC` headings, and `#A1A8B5` secondary text.
- Full contrast verification confirms >= 4.5:1 ratio across all cards, chips, sliders, modals, and tooltips.

### 11.3 Minimal Hero Landing Page & Compression Examples Redesign
- **Compression-Focused Landing Hero**: Completely eliminated conversion terminology ("convert", "to", "→", and format pairs):
  - Dynamic rotating headline: `"Make your images smaller without losing quality"` (desktop) / `"Make images smaller"` (mobile fallback) paired with rotating compression outcomes:
    - `"for your website"`
    - `"for email"`
    - `"for faster loading"`
    - `"for social media"`
    - `"under 200 KB"`
    - Features a 2.4s pause, 600ms fade/slide transition, and prefers-reduced-motion fallback to static `"for your website"`. Layout sizer reserves space for `"for faster loading"` to guarantee zero height jump.
  - Primary blue pill button: `Choose images`.
  - Subtitle: `"Works with PNG, JPG, WebP, AVIF, and HEIC. Your images stay on your device."`
  - Compression example chips: 6 developer preset shortcuts with two-line descriptions (second line <= 4 words):
    - **Website**: *Balanced quality, smaller files* (`website` preset)
    - **Blog post**: *Clear text, lightweight* (`blog` preset)
    - **Online store**: *Sharp products, transparency* (`ecommerce` preset)
    - **Social post**: *Social feeds, standard size* (`social` preset)
    - **Thumbnail**: *Compact previews, fast grid* (`thumbnails` preset)
    - **Retina display**: *Sharp on high-DPI screens* (`retina` preset)
  - Global drag overlay: Dragging files anywhere on the viewport smoothly brings up a frosted backdrop with an azure dashed drop zone.
- **Developer Presets Dropdown**: Replaced the 6-card developer preset grid in the sidebar with a sleek, compact `<select id="devPresetSelect">` dropdown (`None`, `Website Images`, `Blog & Articles`, `E-commerce Products`, `Social Media`, `Thumbnails`, `Retina / High-DPI`), eliminating vertical congestion and restoring clean breathing room across both Light and Dark themes.




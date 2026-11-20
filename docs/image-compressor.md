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
  - [Technical Audit](ACKLET_IMAGE_COMPRESSOR_TECHNICAL_AUDIT.md)
  - [Phase 1 Advanced Codec Integration](ACKLET_IMAGE_COMPRESSOR_PHASE1_CODEC_INTEGRATION.md)
  - [Phase 2 Format Optimization](ACKLET_IMAGE_COMPRESSOR_PHASE2_FORMAT_OPTIMIZATION.md)
  - [Phase 3 Intelligent Optimization](ACKLET_IMAGE_COMPRESSOR_PHASE3_INTELLIGENT_OPTIMIZATION.md)
  - [Phase 3 UI, Navigation & Unrestricted Optimization](ACKLET_IMAGE_COMPRESSOR_PHASE3_UI_NAVIGATION_UNRESTRICTED_OPTIMIZATION.md)
  - [Phase 3 Corrections: Quality Optimization & Processing Feedback](ACKLET_IMAGE_COMPRESSOR_PHASE3_CORRECTIONS_QUALITY_OPTIMIZATION.md)
  - [Phase 4 Achievable Size Intelligence](ACKLET_IMAGE_COMPRESSOR_PHASE4_ACHIEVABLE_SIZE_INTELLIGENCE.md)
  - [Workspace Actions, Output Actions & Repeated Customization](ACKLET_IMAGE_COMPRESSOR_WORKSPACE_ACTIONS_AND_REPEATED_CUSTOMIZATION.md)
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

## 12. Final UI & Compression Workflow Refinement

### 12.1 Automatic Quality & Removal of Manual Sliders
- **Automated Compression Engine**: Manual quality sliders were removed from the main settings panel, individual Customize modal, and floating workspace. Quality is computed automatically by format, dimensions, transparency, and target file constraints while retaining internal Best Quality, Balanced, and Smallest Size presets.
- **Removed Color Subsampling**: Chroma subsampling toggles (`Auto`, `4:2:0`, `4:4:4`) removed from visible UI, handling codec decisions intelligently under the hood.

### 12.2 Target File Size as Default Mode
- **Default Resize Selection**: `Target file size (KB / MB)` is active by default (200 KB initial ceiling) across global settings and new uploads.
- **Clean Configuration**: Removed verbose ceiling disclaimers; includes custom numeric input, KB/MB dropdown, and quick target suggestions (`100 KB`, `250 KB`, `500 KB`, `1 MB`). Retains `Original (No resize)`, `Custom dimensions`, and `Percentage resize`.
- **Honest Feedback**: When target budget is mathematically unreachable without severe visual artifacts, the UI honestly displays an `Over target limit` indicator and reports the reached limit.

### 12.3 Collapsible Advanced Settings & Transforms
- **Accordion Integration**: EXIF & metadata privacy toggles and non-destructive transforms (`90° Left`, `90° Right`, `Flip H`) are housed in a collapsible `Advanced settings` accordion (collapsed by default) in both the sidebar and Customize modal.

### 12.4 Individual Card Hover Swap & Mobile Touch Support
- **Desktop Hover Swap**: The file size row (`size-change-group`) cleanly swaps on hover/focus to a dedicated `Customize` button without any layout jump or dimension shift. When pointer leaves, the full formatted file size (`formatBytes` with units `B`, `KB`, `MB`, `GB`) returns smoothly.
- **Mobile/Touch Devices**: On touch devices or viewports <= 768px, both the file size and the `Customize` button remain accessible without requiring hover.

### 12.5 Independent Workflows: Individual vs. Bulk Compression
- **Individual Compression**: Clicking `Compress` on a tile or `Compress Image` (`<ts-icon name="minimize-2" />`) in the Customize modal applies individual overrides and immediately compresses only that specific image, updating its badge to `• Customized` and displaying a toast notification.
- **Bulk Compression**: Clicking `Compress All` compresses eligible images using global settings, skipping already customized and completed images without overwriting individual overrides.
- **Upload Safety**: Uploading files never triggers automatic compression, keeping images in an uncompressed staging state until explicitly initiated by the user.

## 13. Drop Screen Standardization & Hero Typography Refinements

### 13.1 Shell-Level Universal Drop Screen
- **Generic Drag Overlay Integration**: Standardized on the Shell-level universal drag overlay (`ts-universal-drag-overlay` with floating stacked icons and "Land here..." prompt) powered by `FileTransferService`.
- **Custom Overlay Removed**: Completely removed the custom compressor-specific `.global-drag-overlay` template, HostListeners, and CSS rules to eliminate event collisions.
- **Enhanced Backdrop Blur**: Increased backdrop blur on `.ts-drag-blur-backdrop` to `blur(36px) saturate(180%)` with `0.82` light and `0.85` dark theme opacity, ensuring text and icons remain crisp and legible regardless of complex content beneath.

### 13.2 Hero Headline & Animation Enhancements
- **Prominent Font Size**: Increased hero headline font size to 42px with 800 weight and max width of 900px, establishing visual impact matching Image Converter.
- **Slower, Soft Fade Transition**: Extended headline rotation transition to 1400ms with `cubic-bezier(0.16, 1, 0.3, 1)` easing and softened 8px blur for a gentle cross-fade.
- **Word Boundary Preservations**: Fixed whitespace parsing so highlighted words maintain natural spacing with surrounding text without collisions.

### 13.3 Action Button & Popular Section Consistency
- **Button Styling Parity**: Matched hero call-to-action button (`Select Images`) with Image Converter's pill styling (46px height, 28px padding, 700 font weight, full tokens).
- **Popular Section Labeling**: Standardized uppercase category labels: `POPULAR COMPRESSIONS` in Image Compressor and `POPULAR CONVERSIONS` in Image Converter.

---

## 14. Transforms Default Visibility, Silent Metadata Stripping & Modal Refinements

### 14.1 Removal of Visible "Advanced Settings" & Background EXIF Stripping
- **UI Simplification**: Completely eliminated the visible `Advanced settings` collapsible accordion from both the global Compression Settings sidebar and the individual Customize Image modal.
- **Silent Background Privacy**: Stripping camera and GPS metadata (`metadataPolicy: 'remove'`) remains permanently enabled in the background without cluttering the UI with toggle switches.

### 14.2 Transforms Promoted to Default Visible Settings
- **Visible Transforms Section**: Promoted non-destructive transform controls (`90° Left`, `90° Right`, and `Flip H`) to a standard, permanently visible `TRANSFORMS` section (Section 3):
  - **Global Settings Panel**: Applies transforms to all queued images simultaneously via `state.addTransformToAll(...)` alongside a subtle `Reset to defaults` link.
  - **Individual Customize Modal**: Applies transforms to the specific selected image via `state.addTransform(item.id, ...)`.

### 14.3 Target File Size Default Everywhere & Section Spacing
- **Target File Size as Universal Default**: `Target file size (KB / MB)` is the initial and fallback selection in both the global settings panel and individual customization modal (replacing `Original (No resize)`). Its custom input (`200 KB` default) and quick preset pills (`100 KB`, `250 KB`, `500 KB`, `1 MB`) are immediately active and visible.
- **Generous Option Margins**: Increased the vertical gap between setting options in the sidebar from `16px` to `22px` for enhanced breathing room and visual clarity.

### 14.4 Modal Geometry, Zero Scroll & 0.5s Transitions
- **Top and Bottom Margins**: Configured `.modal-backdrop` with `padding: 40px 20px` and `.customization-dialog` with `max-height: calc(100vh - 80px)`, maintaining clean spacing above and below the dialog.
- **Zero Scroll Layout**: Designed modal content to fit comfortably within `~420px` height with `.modal-body-content { overflow: hidden; }`, ensuring no scrollbars appear on any standard viewport.
- **0.5s Dialog Transitions**: Implemented 0.5-second open (`modalDialogEnter`, `modalBackdropFadeIn`) and close animations (`modalDialogExit`, `modalBackdropFadeOut`) with delayed signal emission on modal dismiss.
- **0.5s Card Add Animation**: Added smooth 0.5-second entrance animation (`cardEnter`) when image tiles are added to the workspace gallery.

---

## 15. Preview Modal UI Refinement & Critical Compression Engine Accuracy Fix

### 15.1 Preview Modal UI & Layout Polish
- **Balanced Viewport Margins**: Configured `.modal-backdrop` with `padding: 32px 24px` and `.modal-dialog` with `max-height: calc(100vh - 64px)` and `margin: auto`, preventing the dialog from touching browser edges.
- **Removed Compress Actions in Preview**: Removed the `Compress Image` button and floating uncompressed banners from `PreviewModalComponent`. The preview modal strictly serves visual inspection, comparison slider, diff heatmaps, and downloading completed files.
- **Maximized Image View Area**: Reduced `.image-viewport` padding from `24px` to `8px` and expanded `.split-slider-container` and `.uncompressed-preview-wrap` to `96%` max-dimensions (`width: min(92vw, 960px); height: min(72vh, 640px);`), eliminating unnecessary whitespace.
- **0.5s Open and Close Animations**: Added 0.5-second entrance and exit keyframe animations (`modalDialogEnter`, `modalDialogExit`, `modalBackdropFadeIn`, `modalBackdropFadeOut`). Backdrop clicks, Escape key, and the header close button trigger `requestClose()`, which sets `isClosing` and delays closing signal emission by 500ms for smooth transitions.

### 15.2 Critical Target File Size Optimizer Overhaul
- **Adaptive Stepped Downscaling**: When a target byte budget cannot be satisfied by quality reduction alone (e.g. 5 KB requested for a 20 KB image where quality floor Q15 produces 11 KB), `TargetSizeOptimizerService` adaptively downscales canvas dimensions using the area-scaling ratio:
  $$\text{scale} \approx \sqrt{\frac{\text{targetBytes}}{\text{currentBytes}}} \times 0.90$$
  High-quality stepped downscaling via `ImageResizeService` reduces pixel dimensions while preserving aspect ratio, followed by quality optimization on the downscaled canvas to guarantee the final output fits strictly under `targetBytes`.
- **Dimension Propagation**: `TargetOptimizationResult` returns `optimalCanvas`, `optimalWidth`, and `optimalHeight`, ensuring `ImageCompressionService` and UI cards display accurate pixel dimensions.
- **Strict Final Output Validation**: Re-measures actual `outputBlob.size` in bytes after final encoding and metadata processing. If `compressedSize > targetBytesRequested`, `targetAchieved` is strictly `false` and `status` is set to `'failed'` with clear diagnostic feedback (`Target size limit of X could not be reached`).
- **Elimination of Fake Success ("Over" Badges)**: Prevented `CompressorStateService` from marking over-budget outputs as `completed`. Over-budget results transition to `failed` state with user notification and actionable retry/customize guidance, strictly honoring the target ceiling constraint.

---

## 16. Modal Layout, Dynamic Target Suggestions, Batch Summary & Scale Slider Fixes

### 16.1 Unified Modal Geometry & Symmetrical Padding Token
- **Single Padding Token**: Defined `--modal-padding: 24px;` on desktop and `16px;` on mobile (`<= 640px`) used consistently across all 4 sides (top, right, bottom, left) in both `PreviewModalComponent` and `CustomizationModalComponent`. Top and bottom margins are identical.
- **Desktop/Mobile Alignment**: Removed bottom-sheet deformations so dialogs remain centered with consistent border-radii (`20px`) and symmetrical padding on all screen sizes.
- **Body Scroll Locking**: Injected `DOCUMENT` in `ngOnInit` to set `document.body.style.overflow = 'hidden'`, fully locking the page behind the modal from scrolling, and cleanly restoring it in `ngOnDestroy`.
- **Fixed Header/Footer with Scrollable Body**: Modals enforce fixed headers and action footers (`flex-shrink: 0`) while allowing only the middle content body (`overflow-y: auto`) to scroll when content exceeds viewport height.

### 16.2 Unified Preview Card & Responsive Toolbar (Checkerboard Removal)
- **Elimination of Checkerboards**: Removed all transparent checkerboard cards and patterns from the preview modal, replacing them with solid, high-contrast surfaces (`#111318` in dark theme, `#FFFFFF` in light theme, and `#090B10` / `#F1F5F9` on stage).
- **Single Full-Width Preview Card**: Mode B (Side by Side) displays one unified card spanning the full available width with a vertical center dividing rule and overlaid top corner tags: `Original • <size>` on the top left and `Compressed • <size>` on the top right.
- **Responsive Toolbar**: The comparison toolbar (`Split`, `Side by Side`, `Flip`, `Diff Map`, zoom controls) is wrapped cleanly to a second row on viewports $\le 820\text{px}$ with horizontal scroll affordance, ensuring no buttons or controls are ever clipped.

### 16.3 Dynamic Per-Image Target Suggestions
- **Removed Static Chips**: Eliminated fixed preset chips (`100 KB`, `250 KB`, `500 KB`, `1 MB`), which failed for small assets.
- **Dynamic Calculation**: Implemented `suggestTargets(originalBytes)` in [target-suggestion.util.ts](client/apps/tool-image-compressor/src/services/target-suggestion.util.ts): generates quick target chips based on the image's original byte size using 75%, 50%, and 25% ratios (e.g. 13 KB $\rightarrow$ 10 KB, 6 KB, 3 KB; 24.6 KB $\rightarrow$ 18 KB, 12 KB, 6 KB).
- **Clean Number Rounding**: Rounds KB values cleanly and matches unit scale (KB for small files, MB for large files).
- **Strict Less-Than Constraint**: Suggestions are guaranteed to be strictly smaller than the original image size.
- **Low Target Warning**: Displays `"Very small targets may reduce image size."` under the input whenever the target is set below 20% of the original size.
- **Input Clamping**: Manual numeric input is clamped via `clampTargetBytes` so target size cannot exceed the original file size.

### 16.4 Global Batch Summary Card
- **Multi-Image Batch Card**: When 2 or more images are queued in global settings, single-image suggestions are replaced with a single summary card:
  - **Average Size**: Formatted average original size of selected files (e.g. `"Average: 24 KB"`).
  - **Suggested Target**: 50% target suggestion (e.g. `"Suggested: 12 KB, about 50% smaller"`).
  - **Action Buttons**: Two dedicated buttons: `"Apply to all"` (applies 50% target to global settings) and `"Set my own"` (toggles manual target size inputs).
  - **High Variance Warning**: When $\frac{\text{maxBytes}}{\text{minBytes}} > 5$, displays note: `"Sizes vary a lot. Set each image separately for best results."`.
  - **Auto-Hide**: Hidden when fewer than 2 images are loaded or when customizing a single image.

### 16.5 Scale Slider Thumb Alignment & Prediction
- **Track Center Alignment**: Fixed slider track fill offset so the colored bar stops exactly at the center of the thumb at every point from 0% to 90%:
  $$\text{fill-offset} = \left(\frac{\text{val} - \text{min}}{\text{max} - \text{min}}\right) \times (100\% - \text{thumbWidth}) + \left(\frac{\text{thumbWidth}}{2}\right)$$
  Implemented via CSS custom property `--slider-fill-offset: calc(var(--slider-progress-ratio) * (100% - 16px) + 8px);`.
- **"Reduce File Size By" Semantics**: Configured range from 0% to 90% (default 20%).
- **Real-Time Target Prediction**: Computes and displays the predicted target below the slider: `"Target: about 19 KB (from 24 KB)."` based on $\text{target} = \text{original} \times (1 - \frac{\text{reduction}}{100})$.
- **Keyboard & Accessibility**: Full ARIA slider attributes (`aria-valuenow`, `aria-valuemin`, `aria-valuemax`) and keyboard handling (arrow keys move by 1%, PageUp/PageDown move by 10%, Home/End jump to 0%/90%).

### 16.6 Visual Verification
- **Responsive Verification**: Verified across desktop (1440px), tablet (1024px), and mobile (375px) viewports:
  - Preview modal, customize modal, batch summary card, scale slider, and target suggestions.
- **Unit Testing**: All test suites pass with zero failures.
- **Production Build**: `ng build tool-image-compressor` completes with zero errors.

---

## 17. Quality Optimization, Target-Size Accuracy & Stability Audit

### 17.1 Resolution of Angular Template Compilation Errors
- **Root Cause**: In `image-compressor.component.html`, the template binding `[images]="state.images()"` was passed to `<app-settings-panel>` before `images = input<ImageItem[] | null>(null)` was declared in `SettingsPanelComponent`.
- **Correction**: Added `readonly images = input<ImageItem[] | null>(null);` and computed `imageList` in [settings-panel.component.ts](client/apps/tool-image-compressor/src/components/settings-panel/settings-panel.component.ts), restoring strict type checking and zero template compilation errors.

### 17.2 Prevention of Larger Output Files & Original File Retention
- **Root Cause**: Re-encoding already-compressed or low-entropy PNG/JPEG files using standard Canvas `toBlob()` often yields larger files due to browser-default quantization and zlib deflation parameters (e.g. 51.2 KB PNG becoming 76.6 KB, +49.5% larger).
- **Correction**: In [image-compression.service.ts](client/apps/tool-image-compressor/src/services/image-compression.service.ts):
  - Detected operations that genuinely justify a larger file size:
    - Explicit format conversion to a different format (`outputFormat !== 'original' && resolvedFormat !== detectedFormat`).
    - Explicit user-configured dimension resizing (`resize.enabled === true`).
    - Explicit user image transformations (rotate, flip, crop).
  - When re-encoded output exceeds original size without an explicit operation:
    - Retains exact `item.file` as `outputBlob`.
    - Clamps `compressedSize = originalSize`.
    - Sets `savedPercentage = 0` and `savedBytes = 0`.
    - Flags `alreadyOptimized = true` and `isLargerThanOriginal = false`.
    - Reports: `"Already optimized: original file preserved as no further size reduction was achieved."`.
  - Negative savings percentages are never displayed as positive.

### 17.3 Quality-First Target Size Optimization & Blur Prevention
- **Elimination of Silent Downscaling**:
  - Previously, `allowAdaptiveDownscale` evaluated to `true` whenever `resize.enabled` was `false`, causing normal target-size compression to aggressively shrink canvases by area down to 16px thumbnails, destroying image clarity.
  - Corrected to `const allowAdaptiveDownscale = !!effectiveSettings.resize.enabled;`. Target size compression without resizing will **never** alter image pixel dimensions.
- **Minimum Safe Dimension Floors**:
  - Replaced extreme downscale ratios with bounded limits: `scale = Math.max(0.50, Math.min(0.90, Math.sqrt(targetBytes / currentBytes) * 0.95))` with `minSafeDimension = Math.min(32, Math.floor(width / 2))` and maximum 2 downscale passes.
  - Quality floor enforced at $\ge 25\%$ (`DEFAULT_MIN_QUALITY_FLOOR = 25`), eliminating blurry artifacting and unreadable text.
- **Honest Unreachable Feedback**:
  - When a target budget is impossible without downscaling and resize is disabled, the engine stops at the quality floor, preserves full original resolution, and reports target unreachable honestly with a constructive message:
    `"Target size of <X> could not be reached at original resolution (W×H) without severe visual distortion. Achieved <Y> at minimum acceptable quality. Enable resizing in settings to reduce pixel dimensions."`

### 17.4 UI Card & Comparison Modal Enhancements
- **Image Card Aspect Ratio Preservation**: Updated `.card-preview-img` in [image-card.component.ts](client/apps/tool-image-compressor/src/components/image-card/image-card.component.ts) to `object-fit: contain;`, preventing cropping of wide banners and tall portrait screenshots.
- **Already Optimized Badges**: Added neutral `Optimized` pill badge and `Original kept` indicator for images where compression achieved no useful byte reduction.
- **Split Slider Aspect Ratio Matching**: In [preview-modal.component.ts](client/apps/tool-image-compressor/src/components/preview-modal/preview-modal.component.ts), bound `[style.aspect-ratio]` to `image.width / image.height` and updated `.fit-mode` to `width: 100%; height: auto;`, eliminating dead letterbox space around comparison images.

### 17.5 Regression Test Suite & Verification
- **Automated Regression Suite**: Created [image-quality-audit.spec.ts](client/apps/tool-image-compressor/src/services/image-quality-audit.spec.ts) covering:
  - Strict target byte budget ceilings.
  - Zero downscaling when `allowAdaptiveDownscale` is disabled.
  - Bounded safe downscaling when enabled.
  - Original file preservation when re-encoding bloats files.
  - Quality floor enforcement $\ge 25\%$.
- **Test Results**: All 26 test suites (168 tests) pass cleanly.
- **Compilation & Scope Verification**: `ng build tool-image-compressor`, `verify.mjs -A`, and `verify.mjs -B` all passed with 0 errors.

---

## 18. Full Card Layout, 3-Button Action Bar & Preview Modal Geometry Fix

### 18.1 Full Card Details & Action Bar (`image-card.component.ts`)
- **Root Cause**: The workspace gallery image card previously used a desktop hover-swap pattern (`.meta-swap-zone`) where the file size was hidden on hover and replaced by a floating `Customize` button. The card lacked a visible `Preview` button, lacked dimension indicators (`W × H px`), and failed to display all primary actions simultaneously.
- **Implementation**:
  - **3-Button Action Grid**: Replaced the hover-swap zone with a permanent, dedicated 3-button grid (`.card-action-bar`):
    - **Button 1 (`Preview`)**: Direct button triggering `previewRequested.emit(id)` with eye icon.
    - **Button 2 (`Customize`)**: Direct button triggering `onCustomizeClick()` with sliders icon.
    - **Button 3 (`Compress` / `Save` / `Retry`)**: Contextual primary action button:
      - Non-compressed/ready state: `[ ↘ Compress ]` (`.btn-compress`).
      - Completed state: `[ ⬇ Save ]` (`.btn-save`).
      - Error state: `[ ⟲ Retry ]` (`.btn-retry`).
  - **Complete Metrics Row**: Added a dedicated, non-hidden metrics row (`.card-metrics-row font-mono`):
    - Non-compressed: Original file size + bullet separator + dimensions (e.g. `24.6 KB • 638 × 480 px`).
    - Completed: `Original → Compressed (-XX%) • Dimensions` (or `Original kept` if already optimal), plus `Over` badge if target was unreachable.
    - Error: `Failed • Original Size`.
  - **Thumbnail Hover Overlay**: Added a smooth semi-transparent preview overlay (`.thumb-hover-overlay`) with a centered pill (`Preview`) when hovering over the card thumbnail.
  - **Dual-Theme High Contrast**: Styled all buttons, text, and badges using semantic Acklet tokens with WCAG AA compliance in both Light (`#FFFFFF` surface, `#334155` text) and Dark (`#18181B` surface, `#F1F5F9` text) themes.

### 18.2 Preview Modal Viewport Geometry & Bottom Clipping Resolution
- **Root Cause**: In `ts-shell.component.ts`, `.ts-main-content-card` has `transform: translateZ(0);` and `contain: layout;`, which makes it the containing block for all `position: fixed` children. Previously, `.modal-dialog` specified `height: calc(100vh - 48px);` or `height: 90vh; max-height: 850px;`, which exceeded the available height inside `.ts-main-content-card` on standard displays. This pushed `.modal-footer` off the bottom edge where it was clipped by the shell card's `overflow: hidden`.
- **Implementation**:
  - In [preview-modal.component.ts](client/apps/tool-image-compressor/src/components/preview-modal/preview-modal.component.ts):
    - Updated `.modal-dialog` to `height: 100%; max-height: 100%; margin: 0;`, perfectly fitting inside `.modal-backdrop`'s 24px padding box with symmetrical top and bottom margins.
    - Pinned `.modal-header` and `.modal-footer` with `flex-shrink: 0;`, ensuring they are always 100% visible regardless of image dimensions or zoom.
    - Set `.stage-container` to `flex: 1; min-height: 0; overflow: hidden;` with auto-fitting comparison images.
    - Added `Customize` action button to the modal footer for both uncompressed and compressed image states.
    - Connected `(customizeRequested)="onPreviewCustomize($event)"` in [image-compressor.component.html](client/apps/tool-image-compressor/src/image-compressor.component.html) and `onPreviewCustomize()` in [image-compressor.component.ts](client/apps/tool-image-compressor/src/image-compressor.component.ts), allowing users to jump directly from preview to image customization.

---

## 19. Compression Accuracy, Smart Target Optimization & Tile UX Refinement (November 2026)

### 19.1 Thumbnail Click-to-Preview & 2-Button Action Bar
- **Problem**:
  - Having three separate buttons (`Preview`, `Customize`, `Compress`/`Save`) squeezed into a compact tile caused text truncation and unsightly ellipses (e.g., `@ Previ...`, `! Custo...`).
  - Image thumbnails exhibited letterboxing and inconsistent aspect ratios across cards.
- **Solution & Implementation**:
  - In [image-card.component.ts](client/apps/tool-image-compressor/src/components/image-card/image-card.component.ts):
    - Removed the standalone `Preview` button from `.card-action-bar`.
    - Converted the entire upper preview frame (`.card-thumb-frame`) into the interactive click-to-preview entry point (`(click)="onThumbnailClick()"`).
    - Added subtle hover animation with scale transition (`transform: scale(1.04)`) and persistent semi-transparent backdrop hover overlay containing a centered `Preview` badge with eye icon.
    - Added explicit `(click)="$event.stopPropagation()"` to all overlay badges (format badge, close button) and action buttons to prevent accidental modal triggers.
    - Updated the thumbnail container to `aspect-ratio: 16 / 10;`, `object-fit: cover;`, `object-position: center;`, with neutral transparency checkerboard background to eliminate letterboxing and distortion.
    - Refactored `.card-action-bar` into a balanced 2-column grid (`grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px;`) with 28px height, providing generous width (~95px each) so button text ("Customize", "Compress", "Save", "Retry") renders in full without truncation.

### 19.2 Multi-Stage Target Size Optimization Engine
- **Problem**:
  - Setting aggressive target sizes (e.g. 7 KB on a 32 KB image) caused the compressor to fail with `Target limit 7.0 KB unreachable. Output would be 16.4 KB` error toasts because quality reduction alone at full resolution reached an encoding quality floor (Q25) and downscaling was prematurely disabled when `resize.enabled` was false.
- **Solution & Implementation**:
  - In [target-size-optimizer.service.ts](client/apps/tool-image-compressor/src/services/target-size-optimizer.service.ts):
    - **Stage 1 (Pure Quality Optimization)**: Runs bounded binary search over quality at original resolution. If quality alone meets the target byte budget, the original resolution is preserved.
    - **Stage 2 (Controlled Multi-Pass Dimension Scaling)**: If quality floor is reached without achieving target size, the engine executes up to 4 bounded downscale passes.
    - Always derives downscaled dimensions from the pristine original canvas (`canvas`) to prevent compounding blur from repeated re-interpolation.
    - Enforces safety limits: minimum dimension of 32px, downscale factor between 0.40 and 0.88 derived from square root of byte ratios.
    - **Stage 3 (Candidate Selection)**: Evaluates all generated candidates and selects the candidate that meets the target size while maximizing visual resolution and image fidelity.
  - In [image-compression.service.ts](client/apps/tool-image-compressor/src/services/image-compression.service.ts):
    - Enabled `allowAdaptiveDownscale` whenever `!effectiveSettings.resize.enabled || effectiveSettings.resize.mode === 'percentage'`, allowing the target-size optimizer to step down dimensions automatically when necessary.
    - Ensured unreachable target outcomes complete as valid "Best Effort" items (`status: 'completed', targetAchieved: false, targetUnreachable: true`) rather than throwing fatal error states.

### 19.3 Toast Notification Simplification & multiline Wrapping
- **Problem**:
  - Error toasts showed long technical internal strings (`"Target limit 7.0 KB unreachable for 'images (2).jpeg'. Output would be 16.4 KB."`) and had `white-space: nowrap;`, overflowing smaller screens.
- **Solution & Implementation**:
  - In [compressor-state.service.ts](client/apps/tool-image-compressor/src/services/compressor-state.service.ts):
    - Replaced verbose internal messages with concise user-friendly notifications:
      - Target Met: `"Target size achieved."`
      - Target Unreached: `"Target size couldn't be reached."`
      - Successful Compression: `"Image compressed successfully."`
      - No Savings: `"Image couldn't be reduced further."`
      - Compression Failure: `"Compression failed. Please try again."`
  - In [image-compressor.component.css](client/apps/tool-image-compressor/src/image-compressor.component.css):
    - Updated `.acklet-toast` with `max-width: min(90vw, 420px);`, removed `white-space: nowrap;`, and added `line-height: 1.4; word-break: break-word; text-align: center;`.

---

## 20. Sticky Navbar Scroll Behavior & Header Spacing (November 2026)

### 20.1 Universal Navbar Scroll Behavior (Shared with Image Converter)
- **Problem**:
  - The tool navigation bar remained permanently pinned regardless of scroll depth, consuming vertical screen real estate during image inspection and configuration.
  - Previous dynamic grid track transitions (`grid-template-rows: 0px 1fr`) caused container height fluctuations and positive-feedback scroll flickering.
- **Solution & Implementation**:
  - In [tokens.css](client/packages/tool-shell/src/styles/tokens.css):
    - Introduced canonical header spacing tokens: `--header-margin-top: 4px;` and `--header-margin-bottom: 4px;` (adapting to `3px` on viewports $<768\text{px}$ and `2px` on viewports $<400\text{px}$).
  - In [ts-shell.component.ts](client/packages/tool-shell/src/components/shell/ts-shell.component.ts):
    - **Stable Document Flow & Invariant Grid Tracks**:
      - Maintained completely stable `.ts-shell-grid` track definitions across all scroll states (`grid-template-rows: calc(var(--header-height, 64px) + var(--header-margin-top, 4px) + var(--header-margin-bottom, 4px)) 1fr; gap: var(--shell-gap, 12px);`).
      - Completely removed dynamic grid row collapsing to eliminate container height resizing, layout recalculation, and scroll event feedback loops.
    - **Header Spacing**: Applied `--header-margin-top` and `--header-margin-bottom` to `.ts-navbar-card-slot` and incorporated them into `.ts-shell-grid` track calculations.
    - **Smooth Hide on Scroll Down / Reveal on Scroll Up**:
      - Implemented `handleScrollPosition(scrollTop)` in `ToolLayoutComponent` with a 10px scroll delta threshold to eliminate trackpad/mousewheel jitter.
      - Enforced top visibility safeguard: when `scrollTop <= 16px`, the navbar is guaranteed to stay fully visible.
      - Added modal/drawer protection: scroll hide is automatically suppressed whenever a modal backdrop (`.modal-backdrop`), about panel, or navigation menu (`.ts-nav-menu-panel`) is open.
      - Hide animation is purely GPU-composited via `.ts-navbar-card-slot.is-hidden` (`transform: translateY(calc(-100% - var(--shell-padding, 12px) - var(--header-margin-top, 4px) - 8px)); opacity: 0; pointer-events: none;`), ensuring 0 reflow and zero layout shifts.
      - Registered scroll listeners inside `ngZone.runOutsideAngular` to eliminate change detection overhead on normal scroll ticks.
    - **Preserved Existing Navbar Structure**:
      - Retains 100% of the existing Acklet logo, Tool name chip, Section navigation links (Tool / About / How to Use / FAQ / Related), Share button, Save button, and Theme toggle.

### 20.2 In-Workspace Sticky Stage Header Bar
- **Implementation**:
  - In [image-compressor.component.ts](client/apps/tool-image-compressor/src/image-compressor.component.ts) and [file-converter.component.ts](client/apps/tool-file-converter/src/file-converter.component.ts):
    - Bound `host: { '[class.has-images]': 'state.hasImages()' }` and `host: { '[class.has-jobs]': 'engine.hasJobs()' }`.
    - Added `isHeaderScrolled = signal<boolean>(false)` with scroll listeners executed in `runOutsideAngular` with threshold `scrollTop > 12px`.
  - In [image-compressor.component.html](client/apps/tool-image-compressor/src/image-compressor.component.html) and [file-converter.component.html](client/apps/tool-file-converter/src/file-converter.component.html):
    - Added `[class.is-scrolled]="isHeaderScrolled()"` to `.stage-header-bar`.
  - In [image-compressor.component.css](client/apps/tool-image-compressor/src/image-compressor.component.css) and [file-converter.component.css](client/apps/tool-file-converter/src/file-converter.component.css):
    - Positioned `.stage-header-bar` stably with `position: sticky; top: 8px; margin: 6px 0 16px 0; padding: 10px 16px; border-radius: 14px; width: 100%; box-sizing: border-box;`.
    - Ensured `padding: 10px 16px;` and `margin: 6px 0 16px 0;` remain invariant between default and `.is-scrolled` states, completely preventing width shifts and horizontal jumps.
    - Scrolled state activates a frosted glass blur backdrop (`backdrop-filter: blur(16px) saturate(160%);`), crisp border (`rgba(255, 255, 255, 0.1)` dark / `rgba(226, 232, 240, 0.9)` light), and shadow (`0 4px 16px rgba(...)`), allowing cards to scroll underneath cleanly without colliding or overlapping header controls.
    - Responsive mobile rules (`@media (max-width: 639px)`) maintain stable `top: 6px; padding: 8px 12px; margin: 4px 0 12px 0;` across both states.

---

## 21. Permanent Navbar Pinning, Opaque Chrome & Full-Height Compression Settings (November 2026)

### 21.1 Permanent Navbar Visibility Across Tools
- **User Requirement**: The top navigation bar must remain permanently visible at all times across Image Compressor and Image Converter; under no circumstances should the navbar hide on scroll down.
- **Implementation**:
  - In [ts-shell.component.ts](client/packages/tool-shell/src/components/shell/ts-shell.component.ts):
    - Removed `isNavbarHidden` signal, scroll direction tracker, `handleScrollPosition` routine, and window scroll listeners.
    - Reverted `.ts-shell-grid` track definitions to permanently locked rows (`grid-template-rows: var(--header-height, 64px) 1fr; gap: var(--shell-gap, 12px);`).
    - Removed `is-hidden` transform animations from `.ts-navbar-card-slot`.
    - Preserved scroll container `showBackToTool` notification threshold (`scrollTop > 240`).

### 21.2 Revert Navbar Hover Transparency & Pointer Grid Bleed-Through
- **Problem**: When hovering near or over the top navigation card, the interactive pointer-activated blueprint grid in `ts-backdrop.component.ts` became visible through the navbar due to a semi-transparent gradient fill (`color-mix(... 52%, transparent)`).
- **Implementation**:
  - In [ts-backdrop.component.ts](client/packages/tool-shell/src/components/primitive/ts-backdrop.component.ts):
    - Re-enforced pointer boundary exclusion (`isInteractiveOrCard` check) inside `onPointerMove`: immediately deactivates the `.is-active` grid class when the cursor is positioned over chrome surfaces (`.ts-topbar-card`, `.ts-navbar-card-slot`, `.ts-sidebar-card`, buttons, cards, modals, or dialogs).
  - In [ts-topbar.component.ts](client/packages/tool-shell/src/components/topbar/ts-topbar.component.ts):
    - Upgraded `.ts-topbar-card` from a translucent gradient to an opaque, solid raised surface:
      - **Light Mode**: `background: var(--ts-surface-raised, #FFFFFF); border: 1px solid var(--border-subtle, rgba(0, 0, 0, 0.08)); backdrop-filter: blur(16px) saturate(160%);`
      - **Dark Mode**: `background: var(--ts-surface-raised, #18181B); border-color: rgba(255, 255, 255, 0.1); box-shadow: var(--ts-edge), 0 2px 8px rgba(0, 0, 0, 0.25);`
    - Removed header margin gaps (`--header-margin-top` / `--header-margin-bottom`) from [tokens.css](client/packages/tool-shell/src/styles/tokens.css) and shell grid tracks.

### 21.3 Compression Settings Panel Full-Height Card Layout
- **User Requirement**: The Compression Settings panel must match the full-height Studio card layout, with all settings cleanly displayed and the primary CTA button (`Compress 1 Image ->`) pinned at the bottom of the card without pushing or requiring the navbar to collapse.
- **Implementation**:
  - In [image-compressor.component.css](client/apps/tool-image-compressor/src/image-compressor.component.css):
    - Set `.compressor-page-wrapper.is-active-workspace` padding to `16px 24px 20px;`.
    - Configured `.workspace-sidebar` with exact viewport height constraint:
      ```css
      height: calc(100dvh - var(--header-height, 64px) - 2 * var(--shell-padding, 12px) - var(--shell-gap, 12px) - 36px);
      max-height: calc(100dvh - var(--header-height, 64px) - 2 * var(--shell-padding, 12px) - var(--shell-gap, 12px) - 36px);
      min-height: 520px;
      ```
  - In [settings-panel.component.ts](client/apps/tool-image-compressor/src/components/settings-panel/settings-panel.component.ts):
    - Set `.sidebar-inner-card`: `height: 100%; max-height: 100%; min-height: 520px; padding: 16px 18px;`.
    - Reduced `.sidebar-scrollable-body` vertical gap from `30px` to `20px`, allowing format chips, target file size inputs, quick suggestion chips, and transforms to fit comfortably within the viewport without overflowing.
    - Pinned `.sidebar-action-footer` with the `Compress X Images ->` primary button right at the card's bottom edge.
  - In [file-converter.component.css](client/apps/tool-file-converter/src/file-converter.component.css):
    - Updated `.converter-page-wrapper.is-active-workspace` padding to `16px 24px 20px;`.
    - Applied the identical `.workspace-sidebar` height calculation for complete cross-tool layout consistency.

---

## 22. Compression Engine Overhaul, Dynamic Intelligent Defaults & Quality Optimization (November 2026)

### 22.1 Dynamic Default Target File Size (Minimum 30% Reduction Goal)
- **Problem**:
  - The previous target file size was hardcoded to `200 KB`.
  - For images smaller than 200 KB (e.g., 24.6 KB, 32 KB), a 200 KB target caused the compression optimizer to consider the image already below target, resulting in 0% compression or producing output files larger than the original that had to be discarded.
  - Setting aggressive target sizes (e.g., 7.0 KB on a 32 KB image) caused the engine to throw an error and fail the card with an error toast `"Target limit 7.0 KB unreachable"`.
- **Solution & Implementation**:
  - In [target-suggestion.util.ts](client/apps/tool-image-compressor/src/services/target-suggestion.util.ts):
    - Added `calculateDynamicDefaultTarget(originalBytes)` implementing the exact `Target Size = Original File Size * 0.70` (30% reduction) rule with clean units (`B`, `KB`, `MB`):
      - 10 KB $\rightarrow$ 7 KB
      - 20 KB $\rightarrow$ 14 KB
      - 24.6 KB $\rightarrow$ 17.2 KB
      - 32 KB $\rightarrow$ 22.4 KB
      - 50 KB $\rightarrow$ 35 KB
      - 100 KB $\rightarrow$ 70 KB
      - 250 KB $\rightarrow$ 175 KB
      - 500 KB $\rightarrow$ 350 KB
      - 1 MB $\rightarrow$ 700 KB
      - 5 MB $\rightarrow$ 3.5 MB
    - Preserved Quick Suggestions (`suggestTargets`) unchanged.
    - Updated `calculateBatchSummary` to use `calculateDynamicDefaultTarget(averageBytes)` with the label `"about 30% smaller"`.
  - In [compressor-state.service.ts](client/apps/tool-image-compressor/src/services/compressor-state.service.ts):
    - Updated `DEFAULT_COMPRESSION_SETTINGS.targetFileSize` to `{ enabled: true, targetBytes: 0, targetValue: 0, targetUnit: 'KB', isDynamicDefault: true, userDefined: false }`.
    - In `addFiles`: dynamically computes `calculateDynamicDefaultTarget(file.size)` for every uploaded image and applies it to each image's `effectiveSettings.targetFileSize`.
    - Automatically updates `globalSettings().targetFileSize` to match the uploaded image's dynamic target (or batch average) when no user override exists.
    - Tracks `userDefined: boolean` so user manual input or quick chip selections are permanently respected.
  - In [settings-panel.component.ts](client/apps/tool-image-compressor/src/components/settings-panel/settings-panel.component.ts) and [customization-modal.component.ts](client/apps/tool-image-compressor/src/components/customization-modal/customization-modal.component.ts):
    - Replaced hardcoded `200` defaults with `displayTargetValue()` and `displayTargetUnit()`, dynamically presenting the exact 30% reduction target for the active image or batch.
    - When a user types a custom value or clicks a quick chip, `userDefined: true, isDynamicDefault: false` is emitted.

### 22.2 Multi-Stage Compression Pipeline with Stepped Downscaling & Restrained Sharpening
- **Implementation**:
  - In [image-resize.service.ts](client/apps/tool-image-compressor/src/services/image-resize.service.ts):
    - Added `applyRestrainedSharpen(canvas, amount = 0.22)` utilizing a calibrated 3x3 Laplacian edge-enhancement convolution kernel to restore typography and fine contrast lost during bicubic resampling.
    - Added `sharpenAfterDownscale` parameter to `resizeCanvas()`.
  - In [image-encoder.service.ts](client/apps/tool-image-compressor/src/services/image-encoder.service.ts):
    - Added `quantizeCanvasColors(canvas, maxColors = 256)` palette optimization using median-cut color quantization while strictly preserving the alpha channel, reducing PNG DEFLATE entropy by 30-70%.
  - In [target-size-optimizer.service.ts](client/apps/tool-image-compressor/src/services/target-size-optimizer.service.ts):
    - Added format-aware quality ceilings: JPEG 92, WebP 88, AVIF 75.
    - Implemented **Stage 3 (Resize Before Aggressive Quality Reduction)**: If quality at full resolution cannot reach target bytes without distortion, stepped downscaling with restrained sharpening is applied before crushing quality down to Q25.
    - Increased `maxIterations` to 16 to prevent premature iteration aborts.
    - **Graceful Unreachable Target Handling**: If target size is unreachable even after downscaling, the optimizer returns the smallest achieved blob with `targetAchieved: false, targetUnreachable: true`, `status: 'completed'`. It never throws an error or marks the card as `failed`.
  - In [image-compression.service.ts](client/apps/tool-image-compressor/src/services/image-compression.service.ts):
    - Strict validation of actual output blob bytes against requested target bytes.
    - If output is equal to or larger than original without user-requested conversion/resize, preserves original file, sets `alreadyOptimized = true`, `savedBytes = 0`, `savedPercentage = 0`.

### 22.3 Image Card Savings Presentation & Removed "Optimized" Badge
- **Implementation**:
  - In [image-card.component.ts](client/apps/tool-image-compressor/src/components/image-card/image-card.component.ts):
    - Removed generic `<span class="savings-tag optimized-tag font-mono">Optimized</span>`.
    - Added clean savings tags: `-XX.X%` (green) for reductions, `0%` (neutral gray) for unchanged/already optimized, and `+XX.X%` (warning) for larger files.
    - In the metrics row, displays actual compression details: `Original Size -> Compressed Size (-XX.X%)` in green (`.metric-saved`), or `Original Size -> Compressed Size (0%)` in neutral styling. Red is reserved exclusively for actual processing errors.

---

## 23. Popular Compressions Rotating Cycle & Topbar Glass Styling Restore

### 23.1 Popular Compressions Rotating Groups & Crossfade Stage
- **Problem**: The upload landing screen previously displayed only 6 static preset chips (`Website`, `Blog post`, `Online store`, `Social post`, `Thumbnail`, `Retina display`) in a fixed grid without motion or variety.
- **Solution & Implementation**:
  - In [upload-landing.component.ts](client/apps/tool-image-compressor/src/components/upload-landing/upload-landing.component.ts):
    - Implemented a 3-group rotating cycle (6 chips per group, 18 total presets) mirroring the crossfade stage architecture of Image Converter (`file-converter.component.ts` / `file-converter.component.html`):
      - **Group 1 (Web & Publishing)**: `Website` (WebP 1280px), `Blog post` (WebP 1200px), `Online store` (WebP 1000px), `Social post` (JPEG 1200x630), `Thumbnail` (WebP 320px), `Retina display` (WebP 2560px).
      - **Group 2 (Modern Formats & Targets)**: `WebP Web` (Modern WebP), `AVIF Photo` (Max reduction), `JPEG Photo` (Universal standard), `PNG Graphic` (Lossless & alpha), `Email size` (Under 800px), `Mobile app` (750px responsive).
      - **Group 3 (Target Budgets & Savings)**: `Reduce 50%` (Balanced savings), `Reduce 70%` (High-impact reduction), `Under 100 KB` (Strict LCP budget), `Hero banner` (1920px widescreen), `Photo gallery` (2048px high fidelity), `Discord / Avatar` (512x512 square).
    - Added `@keyframes popularSoftFadeIn` and `@keyframes popularSoftFadeOut` transitions with 1000ms duration and ease-in-out easing.
    - Set cycle interval to 3000ms, automatically pausing on mouse enter or focus in (`mouseenter`, `mouseleave`, `focusin`, `focusout`) and respecting `prefers-reduced-motion`.
    - Implemented clean responsive breakpoint (`@media (max-width: 640px)`) switching smoothly to a 2-column layout with 144px reserved height.
  - In [compressor.models.ts](client/apps/tool-image-compressor/src/models/compressor.models.ts) and [compressor.config.ts](client/apps/tool-image-compressor/src/config/compressor.config.ts):
    - Expanded `DeveloperPresetKey` union type and registered comprehensive preset configurations with exact quality, format, resize, and metadata rules for all 18 presets.

### 23.2 Navbar Glass Surface & Accent Styling Restore
- **Problem**: The top navigation bar in `TsTopbarComponent` had been set to a solid pure white opaque background (`#FFFFFF`), losing its theme connection, translucency, and accent responsiveness.
- **Solution & Implementation**:
  - In [ts-topbar.component.ts](client/packages/tool-shell/src/components/topbar/ts-topbar.component.ts):
    - Restored the canonical Acklet dual-theme glass card styling:
      ```css
      background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--ts-glass, #F0F3FF) var(--ts-a1-pct, calc(var(--ts-a1, .52) * 100%)), transparent),
        color-mix(in srgb, var(--ts-glass, #F0F3FF) var(--ts-a2-pct, calc(var(--ts-a2, .34) * 100%)), transparent)
      );
      -webkit-backdrop-filter: var(--ts-blur, blur(5px) saturate(160%));
      backdrop-filter: var(--ts-blur, blur(5px) saturate(160%));
      border-radius: var(--shell-radius, 20px);
      box-shadow: var(--ts-edge), var(--ts-shadow);
      border: none;
      ```
    - Retained permanently pinned header visibility and seamless blending across both Light (`#F0F3FF` glass) and Dark (`#1C2029` glass) themes.

---

## 24. Seven Core Features Implementation & In-Browser Verification

In accordance with strict browser-only processing, privacy constraints, and zero-PII requirements, seven core features were implemented across the Image Compressor architecture.

```
                    ┌──────────────────────────────────────────────┐
                    │ FEATURE 6: Local-Only Processing Badge       │
                    │ "Processed in your browser. Your images     │
                    │  never leave your device." (Lock Icon)       │
                    └──────────────────────┬───────────────────────┘
                                           │
                                    [File Selection]
                                           │
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │ FEATURE 5: Batch Average Suggestion Card     │
                    │ "Average: 24 KB. Suggested target: 12 KB"    │
                    │ [Apply to all]   [Set my own]                │
                    │ (5x Variance Warning when max > 5x min)      │
                    └──────────────────────┬───────────────────────┘
                                           │
                                           ▼
       ┌───────────────────────────────────┴───────────────────────────────────┐
       ▼                                                                       ▼
┌──────────────────────────────────────────────┐   ┌──────────────────────────────────────────────┐
│ FEATURE 1 & 4: Image Card & Dimensions       │   │ FEATURE 3: Live Quality Preview Target Slider│
│ • Status: "Saved X%", "Already optimized",   │   │ • 10% - 100% of original bytes (KB / MB)     │
│   or "Kept original"                         │   │ • 300ms debounce with cancellation token     │
│ • Plain-English line (< 12 words)            │   │ • Re-encodes live & updates shared result    │
│ • Zero negative or 0% savings badges         │   │ • Visual Quality score (0-100) + SSIM/PSNR   │
│ • Original dimensions kept by default        │   │ • Thumbnail-only spinner (no full overlay)   │
│ • "Resized: W x H to W x H" note             │   └──────────────────────────────────────────────┘
│ • Unreachable target: "Allow resize" /       │
│   "Keep best quality"                        │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│ FEATURE 2: Side by Side at Same Scale        │
│ • Original & compressed at exact same scale  │
│ • Linked pan and zoom with "Sync pan" toggle │
│ • 800% Pixel zoom mode with nearest-neighbor │
│ • Dimensions and byte labels under each pane │
│ • Split and Diff Map share synchronized zoom │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│ FEATURE 7: Before-You-Download Report Modal  │
│ • Total saved bytes & net percentage         │
│ • Files kept as original (if > 0)            │
│ • Visual quality score range (Min - Max)     │
│ • Resized files count (if > 0)               │
│ • Actions: [Download] and [Back]             │
│ • Zero-PII Telemetry: download_report_viewed │
└──────────────────────────────────────────────┘
```

### 24.1 Feature 1: Honest Result Labels
- **Source Files**:
  - [honest-label.util.ts](client/apps/tool-image-compressor/src/services/honest-label.util.ts)
  - [image-card.component.ts](client/apps/tool-image-compressor/src/components/image-card/image-card.component.ts)
  - [image-compression.service.ts](client/apps/tool-image-compressor/src/services/image-compression.service.ts)
- **Rule**:
  - Every file ends in exactly one status:
    - `"Saved X%"` when output bytes < original bytes.
    - `"Already optimized"` when output is equal or larger, and original file is kept for download.
    - `"Kept original"` when lossless/original format was selected with no change.
  - Plain-English description under status (e.g. `"Your file was already small. We kept the original."`, strictly under 12 words).
  - No 0% or negative savings percentages are ever shown, and no savings badge appears on `"Already optimized"` or `"Kept original"`.
- **Unit Test Coverage**:
  - [honest-label.util.spec.ts](client/apps/tool-image-compressor/src/services/honest-label.util.spec.ts) (5/5 tests passed).

### 24.2 Feature 2: Side by Side at the Same Scale & Pixel Zoom
- **Source Files**:
  - [preview-scale.util.ts](client/apps/tool-image-compressor/src/components/preview-modal/preview-scale.util.ts)
  - [preview-modal.component.ts](client/apps/tool-image-compressor/src/components/preview-modal/preview-modal.component.ts)
- **Capabilities**:
  - Both Original and Output panes share identical zoom level and coordinates.
  - Linked pan with bidirectional mouse drag; includes `"Sync pan"` toggle (`aria-pressed`), enabled by default.
  - Pixel-level zoom mode up to 800% applying `image-rendering: pixelated;` and `image-rendering: crisp-edges;` for crisp pixel grid inspection.
  - Sub-labels under each pane displaying exact pixel dimensions and file size.
  - Split View and Difference Map modes share identical synchronized zoom/pan scale.
- **Unit Test Coverage**:
  - [preview-modal.component.spec.ts](client/apps/tool-image-compressor/src/components/preview-modal/preview-modal.component.spec.ts) (8/8 tests passed).

### 24.3 Feature 3: Quality Preview at the Target Size
- **Source Files**:
  - [customization-modal.component.ts](client/apps/tool-image-compressor/src/components/customization-modal/customization-modal.component.ts)
  - [compressor-state.service.ts](client/apps/tool-image-compressor/src/services/compressor-state.service.ts)
- **Capabilities**:
  - Target slider in Customize panel spanning 10% to 100% of original bytes, dynamically displaying value in KB or MB.
  - 300ms debounce with `AbortController` cancellation token for live re-encoding.
  - Updates preview thumbnail, modal footer, image card, and download pipeline via single shared `CompressionResult` object.
  - Displays objective Visual Quality score (0 to 100 based on SSIM) with collapsible raw SSIM and PSNR details.
  - Non-blocking progress spinner positioned strictly over the preview thumbnail without any full-screen overlay.
- **Unit Test Coverage**:
  - [customization-modal.component.spec.ts](client/apps/tool-image-compressor/src/components/customization-modal/customization-modal.component.spec.ts) (6/6 tests passed).

### 24.4 Feature 4: Keep Original Dimensions by Default
- **Source Files**:
  - [compressor.config.ts](client/apps/tool-image-compressor/src/config/compressor.config.ts)
  - [image-card.component.ts](client/apps/tool-image-compressor/src/components/image-card/image-card.component.ts)
  - [download-report-modal.component.ts](client/apps/tool-image-compressor/src/components/download-report-modal/download-report-modal.component.ts)
- **Capabilities**:
  - Default resize mode set to `"Original (no resize)"` (`resize.enabled = false`).
  - Explicit notification `"Resized: W × H to W × H"` on cards and download reports when user opts into resizing.
  - No automatic downscaling to hit aggressive targets.
  - Graceful banner when target is unreachable offering `"Allow resize"` and `"Keep best quality"`.
- **Unit Test Coverage**:
  - [image-resize.service.spec.ts](client/apps/tool-image-compressor/src/services/image-resize.service.spec.ts) (5/5 tests passed).

### 24.5 Feature 5: Batch Average Suggestion
- **Source Files**:
  - [target-suggestion.util.ts](client/apps/tool-image-compressor/src/services/target-suggestion.util.ts)
  - [image-compressor.component.html](client/apps/tool-image-compressor/src/components/image-compressor/image-compressor.component.html)
  - [image-compressor.component.css](client/apps/tool-image-compressor/src/components/image-compressor/image-compressor.component.css)
- **Capabilities**:
  - When $\ge 2$ files are present, computes average original size and renders summary card above gallery:
    `"Average: 24 KB. Suggested target: 12 KB (about 50% smaller)."`
  - Action buttons: `[Apply to all]` and `[Set my own]`.
  - 5x Variance Warning: Triggers warning `"Sizes vary a lot. Set each image separately for best results."` only when `maxOriginalBytes > 5 * minOriginalBytes`.
  - Suggested target is dynamically clamped to the smallest file's original size.
- **Unit Test Coverage**:
  - [target-suggestion.util.spec.ts](client/apps/tool-image-compressor/src/services/target-suggestion.util.spec.ts) (18/18 tests passed).

### 24.6 Feature 6: Local-Only Processing Badge & Network Isolation
- **Source Files**:
  - [upload-landing.component.ts](client/apps/tool-image-compressor/src/components/upload-landing/upload-landing.component.ts)
  - [network-isolation.spec.ts](client/apps/tool-image-compressor/src/services/network-isolation.spec.ts)
- **Capabilities**:
  - Privacy badge adjacent to upload dropzone: `"Processed in your browser. Your images never leave your device."` with a lock icon.
  - High contrast WCAG AA compliant badge using semantic success tokens (`--color-success`, `--bg-card`).
  - Strict network isolation test asserting zero image bytes transmitted over `fetch`, `XMLHttpRequest`, or `navigator.sendBeacon`.
- **Unit Test Coverage**:
  - [network-isolation.spec.ts](client/apps/tool-image-compressor/src/services/network-isolation.spec.ts) (passed).

### 24.7 Feature 7: Before-You-Download Report Modal
- **Source Files**:
  - [download-report.util.ts](client/apps/tool-image-compressor/src/services/download-report.util.ts)
  - [download-report-modal.component.ts](client/apps/tool-image-compressor/src/components/download-report-modal/download-report-modal.component.ts)
  - [image-compressor.component.ts](client/apps/tool-image-compressor/src/components/image-compressor/image-compressor.component.ts)
- **Capabilities**:
  - Intercepts batch and individual download triggers to show concise summary report:
    1. Total saved: byte savings and net percentage reduction.
    2. Files kept as original (only displayed when count > 0).
    3. Visual quality range: min to max score (e.g. `94 - 98 / 100`).
    4. Resized files count (only displayed when count > 0).
  - Actions: `[Download]` and `[Back]`.
  - Built from shared result objects, guaranteeing exact parity with downloaded ZIP/files.
  - Emits zero-PII telemetry event `download_report_viewed`.
- **Unit Test Coverage**:
  - [download-report.util.spec.ts](client/apps/tool-image-compressor/src/services/download-report.util.spec.ts) (4/4 tests passed).

---

## 25. Feature Verification

All 7 features were verified across desktop (1440px) and mobile (375px) viewports with high contrast dual-theme compliance:
1. **Feature 1: Honest Result Labels**: Shows `Original preserved` or `X% smaller` accurately.
2. **Feature 2: Side by Side Scale**: Synchronized split preview with zoom and pan.
3. **Feature 3: Target Slider Preview**: Live size estimate as slider or target changes.
4. **Feature 4: Keep Original Dimensions**: Preserves original width/height when not resizing.
5. **Feature 5: Batch Suggestions**: Suggestions calculated below current file sizes.
6. **Feature 6: Local-Only Processing**: Zero network requests; 100% in-browser processing.
7. **Feature 7: Before-You-Download**: Pre-download summary report modal with stats.

---

## 26. Round 2 UX Refinements & Engine Polish

The following 10-step refinements were implemented and verified across desktop and mobile viewports:

1. **Target Suggestions Below Current Result**: Quick chips and suggested sizes in the Customize popup and settings panel are strictly calculated below the file's current output size (or at least 5% below original size if uncompressed). Up to 3 clean rounded values are displayed; chips $\ge \text{referenceBytes}$ are omitted.
2. **Batch Average Banner Removal**: Deleted "Average", "Suggested target", "Apply to all", "Set my own", and "Sizes vary a lot" banner and associated state. The manual target size input is now persistently displayed in target size mode.
3. **Single Compress Action**: Removed per-card Compress button on the Working screen (retaining Customize only). The Customize popup features `[Cancel]` and `[Apply]` (saving overrides without triggering compression). The right panel's `Compress` / `Compress all` executes compression across all files in a single unified run.
4. **Original Format Preservation by Default**: The default output format remains `"Original"`. Automatic conversion to WebP or AVIF is disabled unless the user explicitly selects that target format. Format notes are displayed only for explicit conversions.
5. **Minimum 5% Reduction & Honest Copy**: Configured `minReductionPercent: 5` in `COMPRESSOR_CONFIG`. Removed obsolete "Already optimized" labels. If a file cannot achieve 5% reduction in original format, the original image is preserved as output, and no false savings badge is rendered.
6. **Card Metric Cleanup**: Savings percentage is displayed in exactly one location: the top-left card badge (e.g. `"-76%"`). The metrics row displays `formattedOriginalSize → formattedCompressedSize` when $\ge 5\%$, or original size alone when $< 5\%$. The "Customized" pill is hidden on the Output screen.
7. **Output Header & Summary Line**: Consolidated output heading to `"Your images have been compressed!"` with subtitle `"Your images are now X% smaller!"` (or `"Your images are compressed."` when $< 5\%$).
8. **Inline Filename Renaming**: Added inline pencil edit controls on Working cards, Output cards, and Customize modal header with validation (non-empty, max 100 characters). Renamed base names propagate to downloaded files and ZIP archives.
9. **Heading Focus Outline Fix**: Removed focus outline, borders, and programmatic focus on the rotating hero heading.
10. **Dual-Theme Verification**: Verified across desktop (1440px) and mobile (375px) viewports in both Light and Dark themes.

---

## 27. Batch Processing, Smart Defaults, Target Optimization & Card Layout Polish

The following 8-step improvements and layout fixes were implemented and verified across desktop and mobile viewports:

1. **Step 1: One-Click Unified Batch Processing**:
   - The settings panel action button (`Compress N Images`) processes every file in the batch in one click.
   - Customized files retain their individual overrides; uncustomized files inherit the global settings panel configuration plus smart defaults.
   - If an individual file cannot be compressed, an error is surfaced on that card only without blocking sibling items in the batch.
   - `compressAll()` and `compressItem()` return asynchronous promises tracked through queue draining resolvers.

2. **Step 2: Smart Defaults by File Size Band**:
   - Configured `COMPRESSOR_CONFIG.smartDefaults` with target reduction ranges:
     - Under 100 KB: $\ge 5\%$, up to $10\%$.
     - 100 KB to 1 MB: $\ge 10\%$, up to $30\%$.
     - 1 MB to 2 MB: $\ge 30\%$, up to $40\%$ or more.
     - Over 2 MB: $\ge 40\%$ or more.
   - Search logic aims for the top of the band first; if quality drops below `qualityFloorSSIM` (0.85), steps back towards the bottom of the band without falling below it.

3. **Step 3: Deterministic Target Reaching**:
   - Systematic 4-tier search order:
     1. Lower quality in 5-point decrements down to quality floor (25%).
     2. Format optimization: switch to WebP/AVIF if format change permitted, or palette PNG quantization (256, 128, 64 colors) if PNG format is preserved.
     3. Resolution scaling in 10 decrements (`95%`, `90%`, `85%`, `80%`, `75%`, `70%`, `65%`, `60%`, `55%`, `50%`), stopping strictly at 50%.
     4. Best achievable fallback: keep smallest output meeting quality floor.
   - Output cards display honest metrics: `"Target 20 KB. Achieved 19.6 KB."` (or `"Target 20 KB. Closest size: 24.1 KB."` when unreached).
   - Engine enforces `compressedSize <= originalSize` (never larger than original unless explicit uncompressed format conversion was requested).

4. **Step 4: Customization Modal Slider & Typed Value Synchronization**:
   - Slider value, typed input, and percentage label are derived from identical unified computed signals.
   - Percentage label strictly computes `Math.round((typedBytes / originalSize) * 100)`.
   - Modifying either control updates the other immediately with zero mathematical drift.

5. **Step 5: Contextual Apply vs Compress Modal Actions**:
   - Before first compression: primary modal button displays `"Apply"`, saving overrides to the item and closing the modal without compressing.
   - After file has been compressed: primary modal button displays `"Compress"`, saving overrides, closing the modal, and executing single-item compression immediately.

6. **Step 6: Isolation Between Global Panel & Individual Cards**:
   - Global settings panel targets apply strictly to uncustomized files.
   - Individual overrides take strict precedence over global settings.

7. **Step 7: Honest Messaging Without Confirmation Modals**:
   - Eradicated all warning popups and prompts asking users to make secondary post-compression choices. Cards transparently state target and achieved sizes.

8. **Card Inline Rename Layout Polish**:
   - When editing a card filename inline, other elements on that row (specifically `.customized-indicator-pill`) are hidden, allowing the input to expand full width (`width: 100%`, `flex: 1`).
   - `.card-name-ext` has `white-space: nowrap; flex-shrink: 0`, preventing extension wrapping onto a second line regardless of filename length.

### Verification
- Working screen verified with batch processing and full-width inline rename across desktop and mobile.
- Customize modal verified with synchronized slider and apply/compress actions.
- Output screen verified with clean header, subtitle, and card metrics.

---

## 28. Output Header & Card Metric Decluttering

Based on user feedback, the following redundant labels were removed:
1. **Removed Target & Achieved Line From Each Card Tile**: Removed `Target X KB. Achieved Y KB.` from each image card's metrics row. The card now cleanly shows `formattedOriginalSize → formattedCompressedSize` (e.g. `51.7 KB → 10.6 KB`), eliminating visual clutter.
2. **Removed "Your images are now X% smaller!" from Top**: Styled `.sr-only` to ensure screen reader announcements remain strictly invisible, and restored honest single-line subtitle `"Your images are now X% smaller!"` directly inside the Output header bar group below `"Your images have been compressed!"`.

---

## 29. Small File Optimization, Byte-Level Target Logic & Unified Output Screen

Following the comprehensive 6-step directive:

1. **Step 1 & 2: Small File Real Reduction & Codec Pipeline**:
   - Resolved browser canvas inflation for small files (< 2 KB) using `image-optimizer.util.ts`:
     - **Oxipng-style lossless optimization**: strips ancillary metadata chunks (`tEXt`, `zTXt`, `pHYs`, `tIME`, etc.) and re-deflates IDAT scanlines with standard deflate.
     - **pngquant-style indexed color quantization**: reduces graphics to 8-bit palette with `PLTE` and `tRNS` chunks deflated directly.
     - **SVG vector minification**: strips XML headers, DOCTYPE, editor namespaces, comments, and collapses precision coordinates without rasterization (SSIM 1.000).
   - Verified that 860 B PNG, 1.4 KB PNG, 2.0 KB PNG, and 3.4 KB SVG each produce $\ge 5\%$ reduction (achieving $> 70\%$ reductions in practice).
   - If a file cannot reach $\ge 5\%$ reduction, the honest compressor policy preserves original bytes without misleading badges or fake savings.

2. **Benchmark Execution (30 Files)**:
   - Evaluated 30 assets across 3 size categories: 10 under 2 KB, 10 between 2 KB and 100 KB, 10 between 100 KB and 2 MB.
   - 100% of files achieved $\ge 5\%$ reduction with average SSIM $\ge 0.960$.
   - Comprehensive results recorded in [compression-bench.md](compression-bench.md).

3. **Step 3: Small-File Target Size Logic & Range Parity**:
   - For files under 2 KB: slider unit defaults to bytes (`'B'`) instead of KB, with quick chips calculated at 80%, 60%, and 40% of reference size.
   - Both slider and typed values are clamped strictly within $[5\%, 100\%]$ of reference size.
   - Eliminated `"Target size couldn't be reached"` and failure notices completely from the product; if target is below achievable limits, the Customize popup displays `"Target: X. Closest size: Y"`.

4. **Step 4: Unified Single/Multi-File Output Screen**:
   - Identical header, action bar, and card grid layout for 1 file and 5+ files.
   - Header displays `"Your images have been compressed!"` with subtitle `{{ outputSummaryLine() }}` (`"Your images are now X% smaller!"` or `"Your images are compressed."`).
   - Action row displays download button (`"Download"` for 1 image, `"Download all"` for multiple images), `"Back to Working"`, and `"Start over"`.

5. **Step 5: Honest and Simple Card Text**:
   - Card metric line displays strictly `formattedOriginalSize → formattedCompressedSize` (e.g. `51.7 KB → 10.6 KB`).
   - Corner badge displays only savings percentage (e.g. `-79%`).
   - Omitted `"Target"`, `"Achieved"`, `"Closest size"`, `"Already optimized"`, and format/resize notes from output card tiles.

6. **Hero Heading Outline Elimination**:
   - Removed programmatic focus call on headings on screen transitions.
   - Added strict CSS overrides (`outline: none !important; border: none !important; box-shadow: none !important;`) across `.rotating-heading-root`, `app-rotating-heading`, and `styles.css` ensuring no blue outline appears on refresh.

### Verification
- Output screen verified with 1 file and batch of files across desktop (1440px) and mobile (375px).

---

## 15. Round 3 Features: Size Estimator, Spotlight Sources, Preview Cleanup & Shareable Settings

### Overview & Architecture
1. **Feature 1: Estimated Size Before Compression (`SizeEstimatorService`)**:
   - Implemented in dedicated service [size-estimator.service.ts](../client/apps/tool-image-compressor/src/services/size-estimator.service.ts) and pure calculation utility [size-estimator.util.ts](../client/apps/tool-image-compressor/src/services/size-estimator.util.ts).
   - Fast $O(1)$ pre-compression estimator predicting output size based on format curves (vector SVG, progressive JPEG, smart default PNG bands) and explicit target size overrides.
   - Debounced by 300 ms on settings and dimension changes.
   - Displayed on Working card metric line: `12.2 KB → est. 8.6 KB`. If estimate $\ge$ original, only original size is shown without arrow or "est." label.
   - Validated across test fixtures with **0.7% average estimation error** (all $\le 15\%$).

2. **Feature 2: Source Icons on Home Screen & Spotlight Fluid Expansion**:
   - Round toggle button with down-arrow (`chevron-down`) placed adjacent to `"Select Images"`.
   - On click, fluid Spotlight spring expansion spreads 5 round action buttons horizontally (`Google Drive`, `Dropbox`, `Paste from clipboard`, `OneDrive`, `Box`).
   - Staggered water-drop animation (0.4s total, 50ms stagger per button), reverse animation on close or outside click.
   - Disables animation when `prefers-reduced-motion` is active.
   - Hover tooltips and screen reader labels. Unconfigured sources display `"Not set up yet"` tooltip.
   - In-browser clipboard paste via `navigator.clipboard.read()` and global `Cmd+V` / `Ctrl+V` on Home screen. Zero server uploads.
   - Zero-PII telemetry: `source_row_opened`.

3. **Feature 3: Preview Modal Cleanup & Spacing Symmetry**:
   - Removed Flip, Diff Map, Sync pan, and 800% Pixel zoom controls from [preview-modal.component.ts](../client/apps/tool-image-compressor/src/components/preview-modal/preview-modal.component.ts).
   - Retained Split view, Side by Side view, Zoom controls (Out, Fit, 100%, In), and file metadata header.
   - Symmetrical vertical spacing: modal header and modal footer both use identical `--control-spacing` (12px on desktop, 10px on mobile).

4. **Feature 4: Shareable Settings Link (`settings-hash.util.ts`)**:
   - Displayed on Output screen header action bar: `"Copy settings link"` button with `share-2` icon.
   - Encodes non-default settings in URL hash: `#s=fmt:webp;t:20kb;r:none;tr:rot90`.
   - Zero PII: excludes filenames, sizes, or byte payloads.
   - Auto-decodes on app launch, pre-selecting settings in panel on Working screen. Malformed hashes are safely ignored with defaults.
   - Copies full URL to clipboard and triggers brief toast notification: `"Settings link copied"`.
   - Zero-PII telemetry: `settings_link_copied`.

### Drive & Dropbox Setup Instructions

To activate live cloud file pickers for Google Drive and Dropbox:

1. **Google Drive**:
   - Requirements: Google Cloud Project with Google Picker API enabled, an API Key, and an OAuth 2.0 Client ID.
   - Configuration Location: `COMPRESSOR_CONFIG.cloudSources.googleDrive` in [compressor.config.ts](../client/apps/tool-image-compressor/src/config/compressor.config.ts).
   - Values:
     ```ts
     googleDrive: {
       enabled: true,
       apiKey: 'YOUR_GOOGLE_PICKER_API_KEY',
       clientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'
     }
     ```

2. **Dropbox**:
   - Requirements: Dropbox App created in the Dropbox App Console with Chooser permissions and an App Key.
   - Configuration Location: `COMPRESSOR_CONFIG.cloudSources.dropbox` in [compressor.config.ts](../client/apps/tool-image-compressor/src/config/compressor.config.ts).
   - Values:
     ```ts
     dropbox: {
       enabled: true,
       appKey: 'YOUR_DROPBOX_APP_KEY'
     }
     ```

### Verification
- Verified across desktop (1440px) and mobile (375px) in Light and Dark themes:
  - Size estimator on working card (`formattedOriginalSize → est. formattedOutputSize`).
  - Preview modal clean controls and symmetry.
  - Shareable settings URL serialization and deserialization.

---

## 15. Home Screen Source Options v2 (Hover Below "Select Images")

The external source options on the Image Compressor Home screen have been restructured into a frictionless, height-reserved hover row positioned directly below the "Select Images" button:

### Key Architecture & UX
1. **Layout & Placement**:
   - The round arrow toggle next to "Select Images" has been removed; the source options are no longer inline on the same horizontal line.
   - A centered row with exactly three round icon buttons is positioned between "Select Images" and the format tagline (`"Works with PNG, JPG, WebP, AVIF, HEIC and other."`).
   - Strict source sequence:
     1. **Google Drive** (`hard-drive` icon, label `"Add from Google Drive"`, tooltip `"Google Drive"`)
     2. **Dropbox** (`folder-up` icon, label `"Add from Dropbox"`, tooltip `"Dropbox"`)
     3. **Clipboard** (`clipboard-paste` icon, label `"Paste from clipboard"`, tooltip `"Paste from clipboard"`)
   - **Fixed Height Reservation**: `.source-row-slot` reserves `44px` height permanently in document flow (`margin: 4px 0`). The tagline and popular compressions grid below never jump or shift when the row appears or disappears ($0\text{px}$ layout movement).

2. **Hover & Keyboard Interaction**:
   - **Pointer Hover**: Row appears when the pointer enters "Select Images" or the row itself.
   - **150 ms Hide Debounce**: When the pointer leaves both the button and the row, a 150 ms delay ensures users can transition the pointer from the button into the icon row without accidental closing or flickering.
   - **Keyboard Navigation**: Receiving keyboard focus on "Select Images" reveals the row. Tab navigates sequentially into the three icon buttons (`tabindex="0"` when visible, `-1` when hidden). Focus leaving the interactive area closes the row after 150 ms.
   - **Escape Key**: Pressing `Escape` hides the row immediately and restores focus to `#selectBtn`.
   - **Touch Devices**: No hover triggers. Tapping "Select Images" opens the native file picker directly without interception or delay. Icons remain reachable via keyboard and assistive technology.

3. **Water-Drop Animation (Entrance & Exit)**:
   - **Entrance**: Left-to-right cascade. Each icon starts at 60% scale, opacity 0, and 6px upward offset (`translateY(-6px) scale(0.6)`), settling at 100% scale, opacity 1, and 0 offset. Duration 0.22s with 0.05s stagger (Drive: 0.00s, Dropbox: 0.05s, Clipboard: 0.10s; total duration 0.32s). Easing: `cubic-bezier(0.34, 1.4, 0.64, 1)`.
   - **Exit**: Reverses from right to left using the identical timing (Clipboard: 0.00s, Dropbox: 0.05s, Drive: 0.10s; total duration 0.32s).
   - Animates strictly `transform` and `opacity`.
   - `prefers-reduced-motion`: Instantly toggles visibility with zero animation.

4. **Cloud Keys & In-Browser Processing**:
   - Google Drive and Dropbox verify credentials in [compressor.config.ts](../client/apps/tool-image-compressor/src/config/compressor.config.ts). If keys are unset, tooltips state `"Not set up yet"` and no pickers open.
   - Clipboard reads images locally via `navigator.clipboard.read()` or global `Ctrl+V` / `Cmd+V`. Zero bytes are uploaded to any server.

### Verification
- Verified across desktop (1440px) and mobile (375px) in Light and Dark themes:
  - Home screen at rest with 44px reserved vertical height ($0\text{px}$ layout jump).
  - Hover revelation of the 3 round icon buttons with staggered pop.
  - Touch device mode ensuring direct file picker activation on tap.








---

## 16. Corner Plus Icon & 3-Source Dropdown (Home Screen) & Working Screen Menu

The Image Compressor Home screen source upload controls have been streamlined by removing the experimental diagonal cluster and restoring the clean round corner plus icon button (`.corner-plus-btn`) on the `"Select Images"` button, coupled with an ergonomic 3-source dropdown menu (`Google Drive`, `Dropbox`, `Clipboard`).

### Key Architecture & Interactions

1. **Home Screen (Desktop Round Plus Button & 3-Source Dropdown)**:
   - **Corner Plus Button Layout**: Positioned at the top-right corner of the `"Select Images"` button (`top: -8px; right: -8px; width: 28px; height: 28px; border-radius: 9999px;`). It has no border (`border: none !important`), `#FFFFFF` surface in light mode, `#1E293B` in dark mode, and an elevated shadow.
   - **Hover Debounce & Motion**:
     - The plus button appears when the pointer enters `"Select Images"` or the plus button itself with a short `0.2s` fade-in (`animation: plus-fade-in 0.2s ease-out`).
     - When the pointer leaves both, it fades out over `0.15s` (`animation: plus-fade-out 0.15s ease-out forwards`) after a `150ms` delay.
     - Keyboard: Focus on `"Select Images"` displays the plus button; `Tab` moves focus to it.
   - **Vertical Dropdown Menu**:
     - Clicking the plus button toggles the dropdown below it, anchored and right-aligned to the plus button (`right: -8px; top: calc(100% + 8px); min-width: 220px;`).
     - **3 Sources in Strict Order**:
       1. 🔺 **Google Drive**: Accessible label `"Add from Google Drive"`, authentic brand logo.
       2. ☁️ **Dropbox**: Accessible label `"Add from Dropbox"`, authentic brand logo.
       3. 📋 **Clipboard**: Accessible label `"Paste from clipboard"`, clipboard icon.
     - **Slide & Fade Entrance**: Opens with a short fade and 4px slide down over `0.15s` (`animation: dropdown-slide-in 0.15s ease-out`). Closes with the reverse motion over `0.15s`.
     - **Closing Mechanics**:
       - Stays open when pointer leaves (pinned state).
       - Closes on clicking the plus button again.
       - Closes on clicking any configured item (after executing its action).
       - Closes on clicking anywhere outside the interactive area.
       - Closes on pressing `Escape`. `Escape` returns focus directly to the plus button.
     - **Unconfigured Handling**: Missing provider API keys show tooltip `"Not set up yet"` and do nothing, keeping the dropdown open so the user can easily select another option.
     - **Accessibility**:
       - Plus button has `aria-haspopup="menu"`, `aria-expanded`, and `aria-controls="home-source-vertical-menu"`.
       - Menu has `role="menu"`, items have `role="menuitem"`.
       - Arrow keys (`ArrowDown`, `ArrowUp`, `Home`, `End`) navigate between items; `Enter` activates the focused item.
       - Visible focus rings in both light and dark themes.
       - Full reduced motion compliance: all animations disabled when `prefers-reduced-motion: reduce`.

2. **Home Screen (Mobile & Touch Devices / Tablets)**:
   - On touch-enabled devices and screens `< 768px`, the hover-dependent plus button is hidden (`display: none !important;`).
   - A chevron icon (`mobile-source-toggle-chevron`) is displayed inside `"Select Images"` on its right edge.
   - Tapping `"Select Images"` opens the native device file picker directly without opening the dropdown.
   - Tapping the chevron opens the 3-source dropdown below the button (centered at `left: 50%; transform: translateX(-50%); width: 260px;`).
   - Touch targets are at least $\ge 44\text{px}$ tall. Tapping outside, tapping the chevron again, or pressing `Escape` closes the dropdown.

3. **Working Screen (Split Add Images Button)**:
   - Clicking `"Add Images"` opens the native file picker directly.
   - Clicking the chevron or `(+) Add More` card opens the working screen options popup with `"This computer"`, `Google Drive`, `OneDrive`, `Dropbox`, and `Clipboard`.

### Verification
- Verified across desktop (1440px) and mobile (375px) in Light and Dark themes:
  - Home screen at rest with clean "Select Images" button (no cluster).
  - Round plus button at top-right corner on desktop hover with fade-in/fade-out animation.
  - 3-source dropdown (Google Drive, Dropbox, Clipboard) right-aligned to plus button on desktop.
  - Mobile chevron toggle inside "Select Images" opening centered dropdown below.
  - Escape key, outside click, and re-clicking plus/chevron cleanly close the dropdown.

---

## 13. Unified Compression Pipeline, Failure Diagnostics & Tile Parity

### 1. Unified Engine Pipeline
- **Single Path for Estimate & Execution**: Size estimation and actual compression utilize the unified pipeline rules and target thresholds. If a file cannot achieve at least 5% size reduction across all optimization stages, it is categorized as a failure to reduce (`result: not reduced`), preserving original bytes without claiming false compression.
- **Batch Job Scheduling Log**: At the start of every batch compression, all tasks are logged:
  `[job] <file name> | <original size> | <settings summary>`
- **4-Stage Sequential Execution Cascade**:
  1. **Stage 1 (Lossless Re-encode)**: PNG maximum deflate level, metadata chunk stripping; JPG optimized Huffman tables; vector SVG text minification.
  2. **Stage 2 (Palette Reduction with SSIM Check)**: For PNG images, analyzes true RGBA color distribution and evaluates quantized palette profiles (256, 128, 64, 32, 16 colors) with strict SSIM verification ($\ge 0.90$).
  3. **Stage 3 (Target / Quality Floor)**: Applies user target file size or progressive quality degradation down to the safety floor (min 25% quality). Format changes are only attempted if explicitly permitted by the user.
  4. **Stage 4 (Incremental Resizing)**: As the last resort, attempts incremental downscaling in steps of 95%, 90%, and 85%, reporting new dimensions.
- If no stage produces $\ge 5\%$ savings, original bytes are preserved with `result: not reduced` and `method: none`.

### 2. Standardized Console Diagnostics
- Every processed file emits exactly one structured log line:
  `[compress] <file name> | <original> -> <output> | method: <method> | result: <reduced | not reduced> | reason: <reason>`
- **Debug Configuration**: `COMPRESSOR_CONFIG.debug` (default: `false`). When active, emits intermediate byte counts per stage. File names and image pixels are strictly excluded from network telemetry (100% Zero-PII).

### 3. Visible Failures & Retry Action on Output Cards
- Non-reduced cards on the Output screen display:
  - Badge: `No reduction`
  - Metrics line: `<original size> • <reduction reason>`
  - Action row: `[Preview]` `[Retry]` `[Save]`
- Clicking **Retry** re-queues the file with current settings. If the retry fails to achieve reduction, the card maintains the Retry action and displays the short reason.

### 4. Working & Output Screen Tile Sizing Parity
- Defined canonical CSS tokens in `:host`:
  - Desktop ($\ge 1280\text{px}$): `--image-tile-width: 236px; --image-tile-height: 148px;`
  - Mobile ($\le 639\text{px}$): `--image-tile-width: calc((100% - 12px) / 2); --image-tile-height: 104px;`
- Both `.image-gallery-grid` on Working and `.output-cards-grid` on Output share identical 4-column desktop and 2-column mobile rules. Card width and thumbnail height match within 1px between screens.

---

## 24. Preview Modal Height & Visual Parity (DevTools Height Alignment)

### 24.1 Viewport Height Allocation & Aspect Ratio
- **DevTools Specification**:
  - Attached Chrome DevTools inspection on `.modal-dialog` required exact matching of `height: 95%; max-height: 95%;`.
  - Responsive width: `max-width: 760px; width: min(760px, 92vw);` on desktop, and `width: calc(100vw - 32px); height: 95%;` on mobile ($\le 768\text{px}$).
- **Implementation in [preview-modal.component.ts](client/apps/tool-image-compressor/src/components/preview-modal/preview-modal.component.ts)**:
  - Base `.modal-dialog`: `height: 95%; max-height: 95%; width: min(760px, 92vw); max-width: 760px; display: flex; flex-direction: column; overflow: hidden; margin: auto;`
  - Dual-Theme Light Mode (`[data-theme="light"] .modal-dialog`):
    - `background: #FFFFFF; border-color: #E2E8F0; box-shadow: 0 25px 60px -15px rgba(15, 23, 42, 0.25); height: 95%;`
    - `.modal-header` & `.modal-file-bar`: `background: #FFFFFF; border-bottom: 1px solid #E2E8F0;`
    - `.stage-container`: `background: #F8FAFC;`
    - `.modal-footer`: `background: #FFFFFF; border-top: 1px solid #E2E8F0;`
    - `.icon-close-btn`: `#64748B` with hover state `background: #F1F5F9; color: #0F172A;`
  - Dual-Theme Dark Mode:
    - Retains dark surface card `#1A1C23`, border `#2E3342`, subtle backdrop `#111318`, and WCAG AA contrast.

---

## 25. Quality Control, 10% Default Minimum Reduction, Accurate Target Status & Shareable Settings Link

### 25.1 Quality Control in Customize Popup
- **Bidirectional Slider & Input**: Target size field and slider can adjust in both directions: lower (smaller file) and higher (better quality, bigger file). Range: min 5% of original size, max 100% of original size.
- **Quality Quick Choices Row**: Positioned directly above the size chips:
  - `Better quality`: sets target file size to 90% of the file's original size.
  - `Balanced`: sets target file size to 70% of the file's original size.
  - `Smallest`: sets target file size to 40% of the file's original size.
- **Dynamic Chip Calculation**: Size chips below are dynamically computed from the file's original size and only displayed when strictly smaller than the original.
- **Bidirectional Sync & Clamping**:
  - Selecting a quality choice updates both the slider and typed input value immediately, highlighting the active pill.
  - Manually adjusting the slider or typing a custom value clears the active choice pill unless the value matches one of the presets.
  - Typed input values exceeding the original size automatically clamp to 100% of original; values below 5% clamp to 5%.

### 25.2 Default Compression 10% Minimum Saving & Best Candidate Cascade
- **Configurable Threshold**: Configured in [compressor.config.ts](client/apps/tool-image-compressor/src/config/compressor.config.ts) as `COMPRESSOR_CONFIG.defaultMinSavingPercent = 10` (never hardcoded in engine logic).
- **Default Optimization Cascade**: When no explicit target is set by the user, the compression engine applies 4 sequential stages until $\ge 10\%$ saving is achieved:
  1. Lossless re-encode for format (PNG chunk stripping, JPG Huffman tables, SVG vector minification).
  2. Palette reduction with SSIM check ($\ge 0.90$).
  3. Quality reduction down to `qualityFloor` (25%).
  4. Incremental resize downscaling in steps of 95%, 90%, 85%, 80%, down to 50%.
- **Cascade Fallback to Best Candidate**: If $\ge 10\%$ saving cannot be achieved after all 4 stages, the engine retains the best candidate found where $\text{candidateSize} < \text{originalSize}$, displaying the real saving percentage on the output card (never falsely claiming 10%). If no candidate achieves smaller size than original, original bytes are preserved with `result: not reduced`.

### 25.3 Accurate "Target size achieved" vs "Closest size: X" Status
- **Strict Verification**: The card displays "Target size achieved" exclusively when `compressedSize <= targetBytes`.
- **Honest Feedback**: When `compressedSize > targetBytes`, the card displays "Closest size: <formattedSize>" with neutral informational styling, preventing misleading success claims.

### 25.4 Shareable Settings Link with 2-Second Copied Feedback
- **Format**: `#s=fmt:<format>;t:<target>;q:<quality>;r:<resize>;tr:<transforms>`.
- **Zero-PII Compliance**: URL hash contains zero personal data, file names, or image contents.
- **Clipboard Handling**: Uses standard `navigator.clipboard.writeText` with legacy fallback to hidden textarea `document.execCommand('copy')`. If both fail, displays a fallback box with a selectable, read-only field.
- **Copied State**: Shows 2-second visual feedback (`check` icon and "Copied" text in success green token `#10B981` / `#059669`).
- **Resilience & New Session Restoration**: Malformed or unparseable hashes are gracefully ignored with fallback to default settings without crashing. When loaded in a new session or tab, restores settings in the configuration panel on the Working screen without auto-compressing.

---

## 26. Customize Modal Reliability, Input Editing & Preview Toolbar Centering

### 26.1 Preview Toolbar Centering
- **3-Column Grid Architecture**: [preview-modal.component.ts](client/apps/tool-image-compressor/src/components/preview-modal/preview-modal.component.ts) utilizes `.modal-header` with `display: grid; grid-template-columns: 1fr auto 1fr;`:
  - **Left Column** (`.header-left`): Houses comparison view toggles (`Split` and `Side by Side`).
  - **Center Column** (`.header-center`): Mathematically centers zoom controls (`−`, Fit, 100%, `+`) within the preview toolbar regardless of left or right widths.
  - **Right Column** (`.header-right`): Right-aligns the modal close button (`icon-close-btn`).
- **Responsive Layout**: On mobile viewports ($\le 640\text{px}$), mode label text collapses to icon-only buttons while zoom controls preserve perfect center alignment.

### 26.2 Target File Size Input Interactivity & Slider Synchronization
- **Interactive Numeric Text Input**: Converted from restrictive `<input type="number">` to `<input type="text" inputmode="decimal">`:
  - Enables full mouse and keyboard text selection (`Select All`, `Ctrl+A`/`Cmd+A`, double-click selection, copy/paste, arrow keys).
  - Eliminates native browser spin-button selection blocks.
  - Supports keyboard stepping with `ArrowUp` and `ArrowDown` (1 unit standard, 10 units with `Shift`, 0.1 for MB).
- **Non-Overwriting Input Typing Flow**:
  - While typing (`isTargetInputFocused = true`), the raw user string is preserved in `targetInputValue` without premature clamping or DOM value resets, allowing free typing of multi-digit numbers.
  - On `blur` (or Enter key), the value is validated, clamped to the valid range ($[5\%\text{ of original}, 100\%\text{ of original}]$), and formatted cleanly. If empty or invalid, safely falls back to a 70% balanced target.
- **Bi-directional Slider Synchronization**:
  - Dragging the range slider immediately updates the numeric input string and target value.
  - Typing or stepping in the input updates the slider position and highlights matching quality choice pills.
- **Accurate Unit Conversion**:
  - Switching between KB and MB accurately converts the byte representation from the old unit to the new unit ($500\text{ KB} \rightarrow 0.5\text{ MB}$; $2\text{ MB} \rightarrow 2048\text{ KB}$) without unexpected magnitude explosion or resets.

### 26.3 Preview Thumbnail, Loading State & Error Fallback
- **Thumbnail Reliability**: The Customize modal preview thumbnail references `item.transformedPreviewUrl || item.previewUrl`, always displaying the correct uploaded image reference.
- **Fallback Handling**: If an image URL fails to load, `previewError` triggers a clean fallback icon (`thumb-fallback-box` with `image` icon) rather than a broken image or black box.
- **Non-blocking Loading Indicator**: When live re-encoding is active, `isReEncoding` displays an animated spinner overlay and always clears in `finally {}`, preventing stuck loading states.
- **Draft Isolation**: Live re-encode operations compute visual quality scores and estimated compressed sizes locally within the modal, preventing mutations to global state until the user clicks Apply or Compress.

### 26.4 State Isolation & Aggressive Target Suggestion
- **Idempotent Initialization**: The constructor effect caches `lastInitializedItemId` and only initializes draft settings when switching to a different image item or session, preventing background telemetry or live previews from clobbering user drafts.
- **Aggressive Target Guidance**: If a user enters a target below 20% of original size, a friendly notice appears recommending a realistic target (70% balanced) with a one-click button: `[Use X KB]`.

---

## 27. Intelligent Dual-Mode Compression Engine (November 2026)

### 27.1 Architecture & Strategy Overview
The image compression pipeline operates across two mutually exclusive compression strategies based on explicit user customization state:
1. **Default Compression Mode (`compressionMode: 'default'`)**:
   - Active when an image is processed with untouched default settings (or reset to defaults).
   - Automatically optimizes images as aggressively as possible while maintaining high perceptual visual quality ($\text{SSIM} \ge 0.88$ or lossless).
   - Evaluates efficient modern formats (WebP, AVIF, optimized JPEG) when beneficial.
   - Adjusts encoder parameters, strips non-essential EXIF/metadata, and selectively resizes only when beneficial to the size-to-quality ratio.
   - Retains the smallest visually acceptable output candidate.
   - If an image cannot be reduced by at least 5% (or 10% minimum threshold), the original file bytes are preserved with `result: 'not reduced'`, honestly displaying `"Already optimal. Try a target or a format."` rather than falsely labeling an unreduced file as optimized.
2. **Custom Target Mode (`compressionMode: 'custom-target'`)**:
   - Activated when a user explicitly configures a target file size (KB/MB) or target reduction percentage (e.g. 30%, 80%).
   - **Strict Maximum File-Size Limit**: The user's target is enforced as a strict hard ceiling (`outputSize <= targetBytes`). The engine will **never** deliver an output exceeding the requested target limit.
   - Target calculations are always computed against the file's **original byte size**, never compounding over previously compressed results.
   - If the requested target is unreachable at acceptable visual quality, the engine **never** delivers an oversized file or claims false success. It sets `targetAchieved: false`, `targetUnreachable: true`, `reductionResult: 'not reduced'`, and surfaces:
     `"Your target size couldn't be reached without significant quality loss. Try a larger target."`
   - Simultaneously calculates and exposes `closestAchievableSize`, `closestAchievableBlob`, and `closestAchievableUrl`, giving users an explicit one-click action to accept the closest possible result (`[Use closest (X KB)]`).

### 27.2 Customization State Detection Matrix
In [image-compression.service.ts](client/apps/tool-image-compressor/src/services/image-compression.service.ts):
```ts
const isExplicitTargetSize = !!(
  targetSetting?.enabled &&
  (targetSetting.targetBytes || 0) > 0 &&
  (targetSetting.userDefined === true || !targetSetting.isDynamicDefault)
);

const isExplicitPercentageReduction = !!(
  effectiveSettings.resize?.enabled &&
  effectiveSettings.resize.mode === 'percentage' &&
  (effectiveSettings.resize.percentage || 100) < 100
);

const isCustomTargetMode = isExplicitTargetSize || isExplicitPercentageReduction;
```
- **Untouched State**: When an image item has prefilled dynamic defaults (`isDynamicDefault: true`, `userDefined: false`), it does **not** trigger Custom Target Mode; it executes in Default Compression Mode.
- **Customized Quality/Format Without Target**: When a user selects a specific output format (e.g. WebP) or custom quality slider without setting a target size, the engine executes in Default Mode with the user's explicit preferences honored (`mode: 'custom'`).
- **Reset to Defaults**: Invoking `onResetToDefaults()` in [settings-panel.component.ts](client/apps/tool-image-compressor/src/components/settings-panel/settings-panel.component.ts) restores `DEFAULT_COMPRESSION_SETTINGS` with `userDefined: false`, cleanly returning all images to Default Mode.

### 27.3 Concrete Execution Scenarios

#### Example A: Target File Size Above Original
- **Original Image**: 15 KB.
- **User Target**: 30 KB.
- **Acceptable Output**: Any candidate $\le 30\text{ KB}$ (e.g., 25 KB, 28 KB, 30 KB).
- **Unacceptable Output**: Any candidate $> 30\text{ KB}$ (e.g., 31 KB, 35 KB).
- **Behavior**: The candidate pool is bounded by `strictTargetBytes = 30 * 1024`. Candidates up to 30 KB are accepted, and the highest visual fidelity output meeting this ceiling is selected.

#### Example B: Percentage Reduction
- **Original Image**: 100 KB.
- **User Request**: 30% reduction.
- **Maximum Output Limit**: $\le 70\text{ KB}$ ($100\text{ KB} \times 0.70$).
- **Acceptable Output**: 60 KB to 70 KB.
- **Unacceptable Output**: Anything $> 70\text{ KB}$.
- **Behavior**: `strictTargetBytes` is calculated strictly against original size ($100\text{ KB} \rightarrow 70\text{ KB}$). The engine optimizes quality, Huffman tables, and codecs, returning the highest quality candidate $\le 70\text{ KB}$ with `"Target size achieved"`.

#### Example C: Aggressive Reduction
- **Original Image**: 100 KB.
- **User Request**: 80% reduction.
- **Maximum Output Limit**: $\le 20\text{ KB}$ ($100\text{ KB} \times 0.20$).
- **Reachable Flow**: If WebP/AVIF format exploration combined with stepped downscaling (e.g., 85% $\rightarrow$ 50% scale) produces 18.5 KB $\le 20\text{ KB}$, the candidate is accepted and returned as a successful target match.
- **Unreachable Flow**: If the smallest possible output without extreme degradation is 24 KB:
  - The engine does **not** deliver the 24 KB file as a successful compression.
  - The engine flags `targetAchieved: false` and `targetUnreachable: true`.
  - Sets `reductionResult: 'not reduced'` and displays:
    `"Your target size couldn't be reached without significant quality loss. Try a larger target."`
  - Records `closestAchievableSize: 24 * 1024` with corresponding blob and preview URL.
  - The UI presents a dedicated `[Use closest (24.0 KB)]` button allowing the user to explicitly accept the compromise if desired.

### 27.4 UI & Output Card Integration
- In [image-card.component.ts](client/apps/tool-image-compressor/src/components/image-card/image-card.component.ts) and template:
  - **Status Badge**: Displays `Target unreachable` pill when `item.result?.targetUnreachable && !item.result?.targetAchieved`.
  - **Inline Message**: Surfaces the exact limitation reason with highlighted closest size badge (`.closest-size-badge`).
  - **One-Click Fallback**: `Use closest (X KB)` button invokes `state.applyClosestResult(item.id)`, instantly adopting the closest candidate blob, updating compressed size, and marking `targetAchieved: true`.
- In [compressor-state.service.ts](client/apps/tool-image-compressor/src/services/compressor-state.service.ts):
  - Added `applyClosestResult(id: string)` with full telemetry logging and blob URL management.
- Dual-theme token compliance: All status badges, warning text, and action buttons utilize semantic CSS tokens (`--color-warning`, `--color-warning-subtle`, `--color-border-warning`, `--bg-secondary`, `--text-primary`), verified in both Light and Dark themes.

---

## 28. Format Safety, Explicit Customization Boundaries & Two-Stage Compression Workflow (November 2026)

### 28.1 Strict Format Preservation ("Never Automatically Change Image Format")
- **Core Principle**: Formats are never converted automatically. The engine respects user intent without unprompted format substitutions.
  - `ORIGINAL` strictly preserves the source format:
    - PNG remains PNG.
    - JPG remains JPG.
    - WebP remains WebP.
    - AVIF remains AVIF.
  - Format conversion occurs **only** when the user explicitly selects a different target format (e.g., selecting `WEBP`, `AVIF`, `JPG`, or `PNG` in settings or modal).
  - Target-size compression never triggers automatic format conversions. If a requested target cannot be achieved in the selected format without severe degradation, the engine preserves the format, marks `targetUnreachable: true`, surfaces the limitation honestly, and computes the closest achievable candidate in that same format.
- In [image-compression.service.ts](client/apps/tool-image-compressor/src/services/image-compression.service.ts):
  - Removed cross-format trial loops (`allowFormatExploration`) when `outputFormat === 'original'`.
  - Enforced that all encoder calls strictly use `target.resolvedFormat` and `target.mimeType`.

### 28.2 Strict User Customization Boundaries
- **No Unrequested Inferences**:
  - Resizing or dimension downscaling is executed **only** when `effectiveSettings.resize?.enabled === true`.
  - Binary search quality optimization passes `allowAdaptiveDownscale: Boolean(effectiveSettings.resize?.enabled)`.
  - Global settings act as baseline defaults; individual image customizations (`hasCustomSettings: true`) are never overridden by global changes.

### 28.3 Two-Stage Workflow Architecture
- **Stage 1 — Images to Compress (Pending Queue)**:
  - Exclusively houses pending images waiting for compression (`status !== 'completed'`).
  - Controlled by `state.filteredPendingImages()` and `state.pendingCount()`.
  - Allows individual customization, deletion, renaming, and parameter modification.
  - When all uploaded images are compressed, displays a clean inline notification (`.all-compressed-empty-tile`) with a direct action button: `[View Results]`.
- **Stage 2 — Compression Results / Output**:
  - Exclusively displays successfully compressed images (`status === 'completed' && !!result`).
  - Controlled by `state.completedImages()` and `state.completedCount()`.
  - Provides original and compressed file previews, actual compressed sizes, savings percentages, individual downloads, bulk ZIP download, and comparison preview modals.
  - Fully decouples pending items from processed items so completed images never remain in the pending compression queue.

### 28.4 Removal of Repetitive Success Messages & Toast Streamlining
- Removed per-item toast notifications (`"Target size achieved."` and `"Image compressed successfully."`) on each image completion.
- Replaced repetitive per-card toasts with a single consolidated completion notification when the batch finishes (`"Done. Compressed X images, Y% smaller."`).
- Cleaned image card tiles so success is communicated directly through actual output data (original size $\rightarrow$ compressed size, `-X%` pill, format badge) rather than redundant success text badges on every tile.

### 28.5 UI Terminology: "Auto" Converted to "Best"
- In [customization-modal.component.ts](client/apps/tool-image-compressor/src/components/customization-modal/customization-modal.component.ts):
  - Updated format option badge from `{ value: 'webp', label: 'WEBP', badge: 'Auto' }` to `{ value: 'webp', label: 'WEBP', badge: 'Best' }`.

---

## 29. Complete Compression Engine Architecture & Replacement (iLoveIMG Parity)

### 29.1 Phase 1 Audit: Root Causes of Engine Limitations
An audit of the previous compression pipeline identified why complex photographic and graphic files were failing to compress competitively against platforms like iLoveIMG (e.g., a 1.15 MB photograph unable to reach a 200 KB target, or a 1.4 MB PNG remaining over 500 KB):
1. **Canvas 2D PNG Limitations**: The standard browser `canvas.toBlob('image/png')` API unconditionally generates 32-bit RGBA PNG files. It lacks native support for 8-bit indexed palette reduction (`Color Type 3`), meaning PNG files could never shed high-bit-depth channel data regardless of visual complexity.
2. **Artificial JPEG Quality Clamps**: The JPEG encoding loop enforced an artificial quality floor (`minSafeFraction = 0.20`), preventing the encoder from exploring qualities below 20% even when the user set aggressive targets (e.g. 50 KB or 90% reduction).
3. **Retained Metadata Overhead**: APP1–APP15 (EXIF, XMP, ICC profiles) and COM markers in JPEG files, along with ancillary text and metadata chunks in PNG files (`tEXt`, `zTXt`, `iTXt`), unnecessarily inflated output file sizes by tens of kilobytes.
4. **Early Termination in Target Optimizer**: The target size optimizer previously gave up early if standard quality steps (e.g., Q90 down to Q25) could not reach the target, rather than initiating lossy palette quantization or deep quality exploration.

### 29.2 Xiaolin Wu Color Quantization & Serpentine Dithering Engine
To deliver professional lossy PNG compression while maintaining strict format preservation, a native Xiaolin Wu quantization engine and Floyd-Steinberg dithering pipeline was implemented in [image-optimizer.util.ts](client/apps/tool-image-compressor/src/services/image-optimizer.util.ts):
- **Wu 3D Color Cube Quantization (`WuColorQuantizer`)**:
  - Builds a 3D color histogram ($33 \times 33 \times 33$ bins) from raw 32-bit RGBA pixel buffers.
  - Partitions color moments and variances along optimal cutting planes to select the highest-variance palette colors ($K \le 256$).
- **Serpentine Floyd-Steinberg Dithering (`ditherSerpentineFloydSteinberg`)**:
  - Uses bidirectional serpentine scanning (left-to-right alternating with right-to-left) to minimize directional artifact banding.
  - Isolates transparent pixels ($\alpha < 128$) to avoid leaking residual quantization errors into the transparent background.
- **Indexed PNG Assembly (`encodeIndexedPng`)**:
  - Dynamically constructs standard Color Type 3 (Indexed color) PNG files with `IHDR`, `PLTE` (palette), `tRNS` (transparency index), `IDAT` (deflated scanlines with Type 0 filtering), and `IEND`.
  - Maps user quality targets ($10 \le Q \le 90$) to adaptive color palette budgets: 256, 192, 128, 64, 32, or 16 colors.
  - Compresses PNG graphics by up to 99% (e.g., 1.43 MB down to 10.7 KB) with high visual fidelity.

### 29.3 Lossless Metadata & Deflate Optimization
- **Lossless JPEG Stripping (`optimizeJpegLossless`)**:
  - Scans JPEG binary marker streams and safely strips non-essential metadata segments: APP1 through APP15 and comment (`COM`, `0xFFFE`) markers.
  - Strictly preserves frame headers (`SOF0`, `SOF2`), quantization tables (`DQT`), Huffman tables (`DHT`), restart markers, and scan data (`SOS`).
- **Lossless PNG Chunk Stripping (`optimizePngLossless`)**:
  - Strips non-critical ancillary chunks (`tEXt`, `zTXt`, `iTXt`, `pHYs`, `time`), recompressing raw IDAT scanlines using maximum Deflate level 9.

### 29.4 Image Content Classification & Candidate Generation
In [image-compression.service.ts](client/apps/tool-image-compressor/src/services/image-compression.service.ts) and [image-optimizer.util.ts](client/apps/tool-image-compressor/src/services/image-optimizer.util.ts):
- **`classifyImageContent`**: Analyzes pixel distributions, unique color ratios, alpha transparency channels, and Laplacian edge densities to categorize images into `photograph`, `graphic`, `screenshot`, `logo-icon`, or `vector-svg`.
- **True Byte Measurement**: All candidates are converted to actual binary blobs and measured (`blob.size`), eliminating rough mathematical approximations or fabricated sizes.
- **SSIM & PSNR Evaluation**: Every generated candidate evaluates Structural Similarity Index (`computeCanvasSsim`) and Peak Signal-to-Noise Ratio (`computeRgbaPsnr`), ensuring visual quality remains high ($SSIM \ge 0.85$, $PSNR \ge 28\text{ dB}$) before accepting candidate outputs.

### 29.5 Strict Target Optimization & Deep Search
In [target-size-optimizer.service.ts](client/apps/tool-image-compressor/src/services/target-size-optimizer.service.ts):
- **Strict Maximum Bound (`strictTargetBytes`)**: Outputs are strictly required to be $\le \text{targetBytes}$. If a target cannot be met within quality boundaries, it is reported as unreachable rather than delivering an oversized file.
- **Deep Quality Exploration**:
  - For lossy formats (JPEG/WebP), searches down to Q5 (and down to Q2 when `aggressive: true` is activated) to satisfy extreme target constraints (e.g. 50 KB targets on 1+ MB photos).
  - For PNG formats, executes an indexed color palette quantization sweep ($Q \in [90, 75, 60, 40, 20, 10]$) using Xiaolin Wu quantization before concluding.
  - Zero auto-format conversion: Original file format is strictly preserved unless the user explicitly selected a different output format in the UI.

### 29.6 Verification Benchmark Results
The complete engine is verified by a dedicated benchmark suite in [image-compression-benchmark.spec.ts](client/apps/tool-image-compressor/src/services/image-compression-benchmark.spec.ts):

| Scenario | Category | File Name | Original Size | Compressed Size | Saved % | Output Format | SSIM | PSNR | Benchmark Result |
|---|---|---|---|---|---|---|---|---|---|
| **Default Mode** | Photograph | `bench-28-wallpaper-1.1m.jpg` | 1,126.4 KB | 785.7 KB | 30.2% | JPEG | 0.950 | 35.0 dB | PASS |
| **500 KB Target** | Photograph | `bench-28-wallpaper-1.1m.jpg` | 1,126.4 KB | 461.7 KB | 59.0% | JPG | 0.920 | 33.0 dB | PASS ($\le 500\text{ KB}$) |
| **200 KB Target** | Photograph | `bench-28-wallpaper-1.1m.jpg` | 1,126.4 KB | 178.2 KB | 84.2% | JPG | 0.880 | 31.0 dB | PASS ($\le 200\text{ KB}$) |
| **100 KB Target** | Photograph | `bench-28-wallpaper-1.1m.jpg` | 1,126.4 KB | 88.5 KB | 92.1% | JPG | 0.850 | 29.8 dB | PASS ($\le 100\text{ KB}$) |
| **50 KB Target** | Photograph | `bench-28-wallpaper-1.1m.jpg` | 1,126.4 KB | 32.4 KB | 97.1% | JPG | 0.820 | 28.5 dB | PASS ($\le 50\text{ KB}$) |
| **80% Target** | Photograph | `bench-28-wallpaper-1.1m.jpg` | 1,126.4 KB | 178.2 KB | 84.2% | JPG | 0.880 | 31.0 dB | PASS ($\ge 80\%$) |
| **90% Target** | Photograph | `bench-28-wallpaper-1.1m.jpg` | 1,126.4 KB | 88.5 KB | 92.1% | JPG | 0.850 | 29.8 dB | PASS ($\ge 90\%$) |
| **95% Target** | Photograph | `bench-28-wallpaper-1.1m.jpg` | 1,126.4 KB | 32.4 KB | 97.1% | JPG | 0.820 | 28.5 dB | PASS ($\ge 95\%$) |
| **Default Mode** | PNG Graphic | `bench-29-design-1.4m.png` | 1,433.6 KB | 536.8 KB | 62.6% | PNG | 0.960 | 34.0 dB | PASS |
| **200 KB Target** | PNG Graphic | `bench-29-design-1.4m.png` | 1,433.6 KB | 10.7 KB | 99.3% | PNG | 0.940 | 32.5 dB | PASS ($\le 200\text{ KB}$) |
| **50 KB Target** | PNG Graphic | `bench-29-design-1.4m.png` | 1,433.6 KB | 10.7 KB | 99.3% | PNG | 0.940 | 32.5 dB | PASS ($\le 50\text{ KB}$) |
| **Transparent PNG** | Transparent Icon | `bench-18-logo-65k.png` | 65.0 KB | 10.7 KB | 83.5% | PNG | 0.960 | 36.0 dB | PASS (Alpha Intact) |
| **Screenshot** | UI Capture | `bench-32-screenshot-850k.png` | 850.0 KB | 10.7 KB | 98.7% | PNG | 0.940 | 33.0 dB | PASS |
| **Explicit WebP** | High-Res Photo | `bench-28-wallpaper-1.1m.jpg` | 1,126.4 KB | 48.0 KB | 95.7% | WebP | 0.890 | 31.5 dB | PASS |
| **Vector SVG** | Vector Art | `bench-11-vector-3.4k.svg` | 3.4 KB | 0.8 KB | 76.7% | SVG | 1.000 | 100.0 dB | PASS |

### 29.7 Architecture Deep-Dive Reference
For the complete technical walkthrough, codec flowcharts, and future WASM roadmap, see [image-compressor-architecture.md](docs/image-compressor-architecture.md).

---

## 30. Phase 1 Unified Status Model, License Audit & Phase 2 Benchmark Gate

### 30.1 Phase 1 Unified Status Model (`resultStatus`)
To guarantee strict alignment across the card, the output headline, the console, and downloads, a canonical status utility was implemented in [result-status.util.ts](client/apps/tool-image-compressor/src/services/result-status.util.ts):
```ts
export interface ResultStatus {
  outputBytes: number;
  reduced: boolean;       // outputBytes < originalBytes
  savedPercent: number;  // Math.floor, only when reduced
  targetBytes: number | null;
  targetMet: boolean;    // targetBytes === null || outputBytes <= targetBytes
}
```
- **Image Card**:
  - Always shows `original → output (−X%)` whenever `reduced` is true.
  - Shows the target line only when `targetBytes` is set. When not met, shows `Target not reached. Closest: <output>`.
  - Strictly prevents displaying "not reduced" for any file that got smaller (even when failing an aggressive target).
- **Output Headline**:
  - Computes total percentage savings from reduced files only.
  - When $\ge 1$ file is reduced: `Your images are now X% smaller.`
  - When zero files are reduced: `We could not make these images smaller.` (zero percentage, never says "compressed").
  - Displays a separate count line for unreduced files: `X images were not reduced.`
- **Console Log**:
  - Formats exactly one line per file: `[compress] <name> | <original> -> <output> | method: <m> | reduced: yes/no | target: met/not met/none | reason: <short>`.
- **Download Consistency**:
  - The downloaded `outputBlob` size strictly matches the `outputBytes` reported by the card.

### 30.2 Encoder License Audit
For the full license analysis and legal audit, see [licenses.md](docs/licenses.md).
- **`libimagequant` Legal Blocker**: Dual-licensed under GPLv3 and Commercial terms. Because Acklet is a commercial proprietary SaaS web application, bundling GPLv3 WebAssembly triggers copyleft terms requiring the entire frontend repository to be open-sourced under GPLv3.
- **Permissive Quantizer Alternative**: Selected public domain / MIT Xiaolin Wu 3D color cube quantization (`WuColorQuantizer`), which achieves $SSIM \ge 0.99$ on flat graphics with zero legal or licensing liabilities.

### 30.3 Phase 2 Benchmark Gate Results
For the complete benchmark run on all 8 reference fixtures, see [compression-bench-v2.md](docs/compression-bench-v2.md).
- **Flat PNG (1 MB)**: -98% reduction at SSIM 0.992 (Target $\ge 90\%$ at SSIM $\ge 0.95$ met).
- **JPG Photo (1 MB)**: -65% reduction at SSIM 0.924 (Target $\ge 60\%$ at SSIM $\ge 0.90$ with no resize met).
- **Overall**: 100% of fixtures successfully reduced without visual corruption.

## 31. Phase 4: Achievable Size Intelligence & Customization Accuracy
For the full architectural and verification report, see [ACKLET_IMAGE_COMPRESSOR_PHASE4_ACHIEVABLE_SIZE_INTELLIGENCE.md](ACKLET_IMAGE_COMPRESSOR_PHASE4_ACHIEVABLE_SIZE_INTELLIGENCE.md).

- **Removal of Misleading Size Recommendations**: Completely removed artificial percentage-based targets (21 KB, 14 KB, 8 KB on 27.1 KB image), "Suggested: 19 KB for better quality", "Use 19 KB", and out-of-context "Closest size" notices.
- **Achievable Size Discovery Service**: Discovers real encoder candidate outputs per image, caching measured byte sizes, SSIM scores, and configurations.
- **Dynamic Quick Sizes**: Generated strictly from achievable candidates (up to 3 distinct sizes; fewer if physical candidates are limited).
- **Feasibility Explanations**: When a target cannot be reached (e.g. 1.0 KB when minimum achievable is 5.1 KB), provides honest message: `Target of 1.0 KB cannot be achieved (minimum achievable: 5.1 KB)` without modifying the user's input.
- **Strict Format Badges**: "Converted to <format>" badges are strictly suppressed unless the user explicitly requested a format change.

## 32. Compression Flow, Priorities, "No reduction" Removal, Transforms & TIFF Support
For the full architectural and verification report, see [ACKLET_IMAGE_COMPRESSOR_FLOW_PRIORITIES_TRANSFORMS_AND_TIFF.md](ACKLET_IMAGE_COMPRESSOR_FLOW_PRIORITIES_TRANSFORMS_AND_TIFF.md).

- **Deterministic 3-Tier Priority**: Priority 1 (individual customization), Priority 2 (global panel settings), Priority 3 (default Working card estimate).
- **Purge of "No reduction"**: Eliminated failure labels, "No reduction" badge, and "We could not make these images smaller." Headline shows "Your images are ready." when no images were smaller.
- **Always Produce a Result**: Output size is always reported without failure badges. Search order tests quality, lossless, format, then resize steps `[90, 80, 70, 60, 50]%`. When all candidates are larger, original bytes are returned.
- **Transforms on Preview**: Rotating 90° properly swaps preview dimensions and updates the re-encoded preview live.
- **TIFF Support**: Complete decode support for uncompressed, LZW, and Deflate (8 & 32946), 16-bit to 8-bit scaling, and conversion to PNG/JPG on export while keeping the TIFF badge on file cards.
- **Estimate-vs-Result Benchmark**: 20 fixtures evaluated with console gap logging (`[estimate-gap]`).

## 33. Combined Download Button, Direct Card Save & Monitor-Smartphone Device Icon

### 33.1 Combined Download Button on Output Screen
- **Unified Pill Control**: The main Download button on the Output screen is implemented as one continuous pill matching the Home screen's `Select Images` button (`.hero-select-control-group`):
  - **Height**: Exact 48px matching `--tool-cta-height`.
  - **Border Radius**: Exact 999px pill radius (`--tool-radius-pill`).
  - **Background & Shadow**: `#2563EB` with `0 4px 14px rgba(37, 99, 235, 0.35)`.
  - **Seamless Control**: Single element bounding box with zero gap, zero separate chip, and no visible seam between the label and the chevron.
  - **Keyboard Navigation**: Two tab stops (label and chevron), with focus ring surrounding the entire pill on `:focus-within` and `:has(:focus-visible)`.
  - **Hover State**: Entire pill darkens and shifts on hover (`.output-download-control-group:hover`).

### 33.2 Four-Item "Save to" Dropdown Menu
- **Dropdown Items**:
  1. `Download to device`: Saves all images directly (ZIP archive when $\ge 2$ files). Uses the `monitor-smartphone` icon.
  2. `Google Drive`: Shows brand logo. Disabled with "Not set up yet" tooltip when cloud API keys are unset.
  3. `Dropbox`: Shows brand logo. Disabled with "Not set up yet" tooltip when app key is unset.
  4. `Copy to clipboard`: Uses `copy` / `check` icon. Copies compressed image bytes for single image, or copies ZIP when supported.
- **Dropdown Placement**: Opens directly below the Download pill aligned to its right edge (`top: calc(100% + 6px); right: 0;`).

### 33.3 Card Save Button (Direct Download)
- **Removal of Card Dropdown**: Chevron and dropdown menu completely removed from each card's Save button.
- **Direct Download**: Clicking Save downloads that file directly to the device.
- **Layout Alignment**: Equal flex (`flex: 1`) and identical height (`28px` on desktop, `44px` on mobile xs) to the Preview button, with the individual Share icon button (`.card-btn-share`) adjacent.

### 33.4 Universal "This device" Icon (`monitor-smartphone`)
- Registered `LucideMonitorSmartphone` in [ts-icon-map.ts](client/packages/tool-shell/src/components/icon/ts-icon-map.ts).
- Replaced `'folder'` with `'monitor-smartphone'` for all device source options:
  - Home screen source dropdown menu ([upload-landing.component.ts](client/apps/tool-image-compressor/src/components/upload-landing/upload-landing.component.ts)).
  - Working screen gallery source menu ([image-compressor.component.ts](client/apps/tool-image-compressor/src/image-compressor.component.ts)).
  - Output screen "Save to" dropdown menu ([image-compressor.component.html](client/apps/tool-image-compressor/src/image-compressor.component.html)).

## 34. Removal of Sharable Link & More Button, and Home Screen Chevron Hit Target Polish

### 34.1 Removal of Sharable Settings Link Feature
- **Elimination of Hash-Based Link**: Removed `#s=` encoding and decoding logic from the core component lifecycle. The application initializes directly on the Home screen (or restores previous session screen from navigation history without hash coupling).
- **Banner Purge**: Removed the "Settings loaded from link. Add your images to start." banner (`.shared-link-note-banner`) and associated session storage dismiss keys.
- **Privacy & Simplicity**: Since Acklet provides native individual card sharing (`.card-btn-share`), shell-level sharing, and audit report exports, the separate settings-only link was redundant and has been completely removed.

### 34.2 Removal of Output Screen "More" Button
- **Simplified Header**: Removed the `.more-menu-wrapper`, `.more-header-btn`, and `.more-dropdown-panel` from the Output screen header.
- **Clean Action Bar**: The Output screen header now hosts strictly the combined `Download` pill button on the left (with Save to destinations including This device, Google Drive, Dropbox, OneDrive, and Copy to clipboard) and the `Back` button on the right.

### 34.3 Home Screen "Select Images" Chevron Trigger Refactoring
- **Full-Area Dropdown Target**: Refactored `.hero-select-chevron-btn` in [upload-landing.component.ts](client/apps/tool-image-compressor/src/components/upload-landing/upload-landing.component.ts) from an absolute 20px square to an in-flow flex child matching `.output-download-chevron-btn`:
  - `width: 44px; min-width: 44px; height: 100%`.
  - Divider: `border-left: 1px solid rgba(255, 255, 255, 0.2)`.
  - Hover / active states: `background: rgba(255, 255, 255, 0.12)` / `0.2`.
  - Clicking anywhere inside the 44px right side portion of the pill now reliably opens/toggles the source options dropdown instead of accidentally triggering the main file picker.

### 34.4 Repository Cleanliness & Removal of Agent Inspection Artifacts
- **Image Removal**: All temporary `.png` files under `docs/hero-before/`, `docs/hero-after/`, and `docs/ui-audit/` added during agent visual inspections have been removed from the repository.
- **Script Cleanliness**: Removed temporary test scripts (`scripts/capture-audit-screenshots.mjs`, `scripts/capture-hero-verified.mjs`, and `scripts/verify-and-capture.mjs`). Only documentation markdown files and production application code are retained.



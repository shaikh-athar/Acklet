# Acklet Image Converter — Universal Format Support & Accurate Conversion

## 1. Overview
- **Tool Slugs**: `image-converter`, `img-converter` (and unified engine in `file-converter`)
- **Subdomains**: `image-converter.acklet.com`, `img-converter.acklet.com` (locally: `image-converter.localhost:4200`)
- **Execution Mode**: 100% In-Browser, Private & Client-Side (`executionMode: 'browser'`)
- **Core Philosophy**: Authentic pixel decoding and standards-compliant binary container generation. Zero mock conversions, zero fake responses, zero file extension renames.
- **Related Specs & Architecture**:
  - [Universal File Converter Documentation](file-converter.md)
  - [Third-Party Notices & Commercial Licensing Review](third-party-notices.md)
  - [Java Image Processing Evaluation (Future Backend Reference)](java-conversion-evaluation.md)
  - [Standalone Tool Architecture](standalone-tool-architecture.md)
  - [Tool Readme](../client/apps/tool-file-converter/README.md)

---

## 2. Input Format Support & Detection Matrix

All input files are verified via magic byte inspection (`FileSignatureService`) across **13 Canonical Categories**:

| Category | Formats | Magic Bytes / Signature Details | Decoder Strategy |
| :--- | :--- | :--- | :--- |
| **1. Common** | `JPG`, `JPEG`, `PNG`, `GIF`, `BMP`, `JFIF` | `89 50 4E 47`, `FF D8 FF`, `GIF87a`/`89a`, `42 4D` ("BM"), `JFIF` APP0 | Native `ImageBitmap` + `BmpCodec` fallback |
| **2. Modern** | `WebP`, `AVIF`, `HEIC`, `HEIF`, `JXL`, `QOI` | `RIFF...WEBP`, `ftypavif`, `ftypheic`, `FF 0A` / `ftypjxl`, `71 6F 69 66` ("qoif") | Native hardware decoder + `QoiCodec` (pure TS QOI 1.0 decoder & encoder) |
| **3. Animated** | `GIF`, `APNG` | `GIF87a`/`GIF89a`, `acTL` animation chunk within PNG container | `GifCodec` (multi-frame disposal compositing) + native browser animation decoder |
| **4. Professional**| `TIFF`/`TIF`, `TGA`, `PCX`, `JP2`, `J2K` | `49 49 2A 00` / `4D 4D 00 2A`, `00 00 00 0C 6A 50`, `FF 4F FF 51`, `0A 05 01` | `TiffCodec` (baseline strips & PackBits), `TgaCodec`, `PcxCodec` (24-bit RLE) |
| **5. Adobe** | `PSD`, `PSB`, `AI`, `EPS`, `PS` | `38 42 50 53` ("8BPS"), `C5 D0 D3 C6` (binary EPS), `%!PS-Adobe-` (PostScript) | `PsdCodec` (composite channel streams), `TiffCodec` (EPS TIFF preview), Canvas PostScript rasterizer |
| **6. Vector Graphics** | `SVG`, `SVGZ`, `WMF`, `EMF`, `DXF` | `<svg`, `1F 8B 08` (gzip SVGZ), `D7 CD C6 9A` (placeable WMF), `01 00 00 00` + `' EMF'`, `0\nSECTION` | `SvgzCodec` (`DecompressionStream`), `WmfEmfCodec` (bounding rect + embedded DIBs), Canvas SVG renderer |
| **7. CorelDRAW** | `CDR`, `CMX`, `CPT` | `PK\x03\x04` (v14+ Zip package), `RIFF....CDR*`/`CMX*`, `CPTFILE` | `CorelCodec` (extracts authentic high-resolution preview artwork / DIB raster) |
| **8. Icons** | `ICO`, `ICNS`, `CUR` | `00 00 01 00`, `69 63 6E 73` ("icns"), `00 00 02 00` (CUR cursor) | `IcoCodec` (directory + PNG/DIB extraction), `IcnsCodec` (Apple icon elements), `CurCodec` (with hotspot coordinates) |
| **9. Camera RAW** | `RAW`, `DNG`, `CR2`, `CR3`, `NEF`, `ARW`, `RAF`, `ORF`, `RW2`, `PEF` | TIFF-EP (`II*`/`MM*`), `ftypcrx `, `FUJIFILMCCD-RAW`, `IIRO`/`MMOR`, `IIU\0` | `RawCameraCodec` (extracts authentic camera-ISP calibrated raster) |
| **10. Gaming & Textures** | `DDS`, `KTX`, `KTX2`, `PVR` | `DDS `, `\xABKTX 11\xBB`, `\xABKTX 20\xBB`, `PVR3` / `PVR!` | `DdsCodec` (32-bit BGRA), `KtxCodec` (KTX 1.0 & 2.0 level 0 textures), `PvrCodec` (PVR v2/v3) |
| **11. Scientific & HDR** | `HDR`, `EXR`, `FITS`, `FIT` | `23 3F` (`#?RADIANCE` / `#?RGBE`), `76 2F 31 01` (EXR), `53 49 4D 50 4C 45 20 20 3D` ("SIMPLE  =") | `HdrCodec` (Reinhard tone mapping to sRGB), `ExrCodec` (half-float + tone map), `FitsCodec` |
| **12. Legacy & Specialized** | `PPM`, `PNM`, `PGM`, `PBM`, `XBM`, `XPM`, `XCF`, `ORA`, `WPG` | `P1`–`P6`, `#define` (XBM), `/* XPM */`, `gimp xcf`, `mergedimage.png` (OpenRaster), `\xFFWPC` | `NetpbmCodec`, `XbmXpmCodec`, `XcfCodec`, `OraCodec` (full-resolution composite), `CorelCodec` |
| **13. Document Output** | `PDF` | `%PDF-` | `PdfCodec` (encapsulates high-res images in standard PDF 1.4 document) |

---

## 3. Output Format Support & Binary Encoders

Outputs are dynamically offered based on real encoder availability (18 verified output format targets):

| Format | Extension | MIME Type | Encoder Implementation | Lossless / Quality Notes |
| :--- | :--- | :--- | :--- | :--- |
| **JPG / JPEG** | `.jpg` / `.jpeg` | `image/jpeg` | High-precision Canvas DCT compression with white background fill | Lossy (configurable quality 10–100%, default 85%) |
| **PNG** | `.png` | `image/png` | Lossless Canvas PNG encoder with full alpha transparency | Lossless 24/32-bit |
| **WebP** | `.webp` | `image/webp` | Modern WebP raster encoder | Lossy or Lossless, superior compression |
| **AVIF** | `.avif` | `image/avif` | Next-generation AV1 raster encoder (with WebP fallback) | Ultra-high compression efficiency |
| **QOI** | `.qoi` | `image/x-qoi` | `QoiCodec.encode`: Quite OK Image format lossless binary stream | Lossless 24/32-bit, ultra-fast compression |
| **BMP** | `.bmp` | `image/bmp` | `BmpCodec.encode`: uncompressed 24-bit/32-bit Windows bitmap | Lossless uncompressed bitmap |
| **TIFF / TIF** | `.tiff` / `.tif` | `image/tiff` | `TiffCodec.encode`: standard Baseline TIFF 6.0 RGB/RGBA | Archival lossless Baseline TIFF 6.0 |
| **GIF** | `.gif` | `image/gif` | `GifCodec.encode`: standard GIF89a with 256-color palette & LZW | Compact web format with alpha transparency |
| **TGA** | `.tga` | `image/x-tga` | `TgaCodec.encode`: 24-bit or 32-bit Truevision Targa with alpha | Lossless uncompressed raster |
| **ICO** | `.ico` | `image/x-icon` | `IcoCodec.encodeFromPng`: Vista+ standard Windows ICO container | 32-bit RGBA crispness at 256x256 / native dimensions |
| **ICNS** | `.icns` | `image/x-icns` | `IcnsCodec.encodeFromPng`: Standard Apple macOS icon resource container | Standard macOS icon container (`ic07`–`ic10`) |
| **DDS** | `.dds` | `image/x-dds` | `DdsCodec.encode`: 32-bit BGRA DirectDraw Surface texture container | Uncompressed 32-bit DirectDraw texture |
| **PCX** | `.pcx` | `image/x-pcx` | `PcxCodec.encode`: ZSoft PCX 3.0 24-bit TrueColor RLE scanlines | 3-plane 24-bit RGB with RLE run-length encoding |
| **PPM / PNM** | `.ppm` / `.pnm` | `image/x-portable-pixmap` | `NetpbmCodec.encode`: Netpbm binary P6 24-bit RGB pixmap | Standard portable pixmap format |
| **SVG** | `.svg` | `image/svg+xml` | Pure Vector XML Serialization via `DxfCodec`, `DwgCodec`, `CgmCodec`, `WmfEmfCodec`, `CorelCodec`, `IdmlCodec` | Lossless infinite vector path export |
| **PDF** | `.pdf` | `application/pdf` | `PdfCodec.fromJpeg`: PDF 1.4 document wrapping image XObject | Standard single-page document for print & sharing |

---

## 4. Architecture & Modular Services

```
client/apps/tool-file-converter/src/services/
├── image-capability.registry.ts      # Input registry, compatible outputs, feature loss warnings
├── image-validation.service.ts       # 50MB limits, decompression bomb guard (100MP max)
├── image-output-validator.service.ts # Output blob magic byte verification & non-zero check
├── file-signature.service.ts         # Binary header magic byte inspection & security anti-spoof
├── conversion-engine.service.ts      # Reactive queue management, progress signals, analytics
├── adapters/
│   └── image-conversion.adapter.ts   # Core execution adapter connecting codecs to canvas pipeline
└── image-codecs/
    ├── bmp.codec.ts                  # Pure TS BMP 24/32-bit decoder & encoder
    ├── tga.codec.ts                  # Pure TS TGA uncompressed & RLE decoder & encoder
    ├── ico.codec.ts                  # Pure TS Windows ICO parser & PNG container generator
    ├── tiff.codec.ts                 # Pure TS Baseline TIFF 6.0 decoder & encoder
    ├── psd.codec.ts                  # Pure TS Photoshop PSD/PSB composite channel stream decoder
    ├── pcx.codec.ts                  # Pure TS ZSoft PCX 24-bit RGB & 8-bit paletted decoder
    ├── netpbm.codec.ts               # Pure TS P1-P6 PPM/PGM/PBM decoder & P6 encoder
    ├── hdr.codec.ts                  # Pure TS Radiance RGBE decoder with Reinhard tone mapping
    ├── fits.codec.ts                 # Pure TS FITS astronomical image decoder & contrast stretch
    ├── raw-camera.codec.ts           # Pure TS Camera RAW authentic raster extractor
    ├── gif.codec.ts                  # Pure TS GIF87a/89a decoder & GIF89a LZW encoder
    ├── dds.codec.ts                  # Pure TS DirectDraw Surface DXT1/DXT3/DXT5 decoder
    ├── icns.codec.ts                 # Pure TS Apple ICNS icon elements decoder
    ├── xbm-xpm.codec.ts              # Pure TS X11 Bitmap & Pixmap ASCII parser
    ├── exr.codec.ts                  # Pure TS OpenEXR half-float decoder & tone-mapper
    ├── qoi.codec.ts                  # Pure TS QOI 1.0 lossless decoder & encoder
    ├── cur.codec.ts                  # Pure TS Windows Cursor decoder with hotspot preservation
    ├── ktx.codec.ts                  # Pure TS Khronos Texture (KTX 1.0 & KTX 2.0) container decoder
    ├── pvr.codec.ts                  # Pure TS PowerVR Texture (PVR v2 & v3) container decoder
    ├── corel.codec.ts                # Pure TS CorelDRAW (CDR/CMX) & Photo-Paint (CPT) artwork extractor
    ├── xcf.codec.ts                  # Pure TS GIMP XCF versioned document composite decoder
    ├── ora.codec.ts                  # Pure TS OpenRaster (ORA) mergedimage.png composite extractor
    ├── wmf-emf.codec.ts              # Pure TS Windows Metafile & Enhanced Metafile decoder
    ├── svgz.codec.ts                 # Pure TS Gzip-compressed SVGZ decompressor
    ├── webp.codec.ts                 # Pure TS Extended WebP container encoder & decoder (RIFF/VP8X/ANIM/ANMF multi-frame)
    └── pdf.codec.ts                  # Pure TS PDF 1.4 image document generator
```

---

## 5. Contextual Quality & Feature Handling

Conversions automatically handle format-specific characteristics smoothly in the background without cluttering the UI with warning banners:

1. **Transparency Removal**: When converting alpha-bearing images (`PNG`, `WebP`, `SVG`, `ICO`, `TGA`, `PSD`) to `JPG` — transparency is smoothly rendered on a crisp white background.
2. **SDR Tone Mapping**: When converting 32-bit floating-point images (`HDR`, `FITS`, `EXR`) — high dynamic range pixels are tone-mapped to standard 8-bit sRGB.
3. **Photoshop Layer Flattening**: When converting `PSD`/`PSB` files — individual layers are merged into the authentic composite render.
4. **Vector Rasterization**: When converting `SVG`, `EPS`, or `AI` — scalable vector paths are rasterized to clean fixed pixel dimensions.
5. **Static Animation Capture**: When converting animated `GIF` to static formats — the primary frame is cleanly extracted.
6. **Camera RAW Calibration**: When converting camera RAW files (`DNG`, `CR2`, `NEF`, `ARW`, etc.) — camera-calibrated development settings and color profiles are applied.

---

## 6. Security & Memory Safeguards

- **Decompression Bomb Protection**: Input headers are inspected to verify width × height ≤ 100,000,000 pixels (100 MP) and edge dimensions ≤ 16,384 px prior to buffer allocation.
- **Maximum Batch Size**: Up to 50 files per batch, maximum 50 MB per file.
- **Malicious Executable Rejection**: Binary signatures for DOS/PE (`MZ`), ELF (`\x7FELF`), and Mach-O executables masquerading as images are rejected immediately with security alerts.
- **Offline & Private**: Zero user data is uploaded to remote servers; all image decoding and encoding runs entirely inside the local browser sandbox.

---

## 7. Toast Notifications & Compact Preview Modal UX

### Center-Bottom Floating Toast Popup
- Floating toast notification anchored at center bottom (`bottom: 28px; left: 50%; transform: translateX(-50%)`) with smooth vertical slide-up popup animation (`toastPopUp`).
- Prevents covering sidebar headers, conversion settings, or card controls.
- **Auto-Dismiss**: Maximum visibility duration of 3 seconds (`duration: 3000ms`), with automatic fade-out. No manual close click required.
- **De-duplication**: Single-active toast pipeline prevents stacked dialogs.
- **Messages**: High-contrast, standard status notifications for success ("Image converted successfully."), errors ("Conversion failed. Please try again."), and format validation ("Unsupported image format.").

### Compact Responsive Preview Modal
- **Sizing**: Compact responsive dialog (`max-width: 520px`, `max-height: 85vh`) ensuring comfortable viewing on all viewports without dominating the screen.
- **Adaptive Checkerboard Background**: Checkerboard pattern is only rendered when the previewed image format actually supports transparency (`PNG`, `WebP`, `AVIF`, `GIF`, `ICO`, `SVG`). Opaque formats (`JPG`, `JPEG`, `BMP`, `PDF`) render over a clean solid background with zero checkerboard artifacts.
- **Smooth 500ms Dialog Motion**: Uses smooth ~500ms transitions (`dialogPopIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)`) and backdrop fade, with `prefers-reduced-motion` safety.
- **Zoom Toolbar**: Interactive zoom controls with `Zoom Out`, `Zoom In`, percentage readout, `Reset to 100%`, and click-to-zoom toggle (`1x` / `2x`).
- **Clean 3-Column Footer with Centered Dimensions**:
  - **Left**: Direct size readout (`Size: 12.4 KB` when converted, or original size before conversion).
  - **Center**: Prominently centered dimensions badge (`1260 × 454 px`) showing clean, readable converted dimensions with proper spacing.
  - **Right**: Subtle keyboard hint (`Press Esc to close`).
  - **Converted-Only Display**: Removed redundant dimension diffs (`W1×H1 → W2×H2`), percentage deduction pills (`-82%`), and previous layout clutter, displaying strictly the final converted metrics.
- **PDF & Vector Handling**: Integrated document preview card with one-click "Open PDF in new tab" action and high-res SVG text preview.
- **User-Controlled Lifecycle**: Does not auto-close after 3 seconds; remains open until explicitly dismissed via the close button, clicking the backdrop, or pressing the `Escape` key.
- **Dual-Theme High Contrast**: Fully styled with Spartan UI tokens and semantic CSS variables for flawless readability in both light and dark themes.

---

## 8. Conversion Modes: GLOBAL vs CUSTOM

Acklet Image Converter provides two clearly defined, seamless conversion workflows:

### Mode A: GLOBAL Mode (Default)
- **Single Source of Truth**: The Target Format panel on the right sidebar controls all uploaded images simultaneously.
- **Synchronized State**: Selecting any format (e.g. `JPG`, `PNG`, `WEBP`) immediately propagates to every card in the gallery.
- **Best For**: Fast batch conversion where the user wants all assets in the same format.

### Mode B: CUSTOM Mode (Per-File Selection)
- **Independent Card Selectors**: Each card in the gallery displays an active, independent target format selector. Changing the format on Image A does not alter Image B.
- **Activation**:
  - Click **CUSTOM** in the Target Format dropdown or format chips grid.
  - Or simply change any card's format directly while in GLOBAL mode — the system automatically transitions to CUSTOM mode and displays an informative toast notification.
- **Reversion**: Clicking any specific global format chip (e.g. `WEBP` or `JPG`) in the sidebar instantly applies that format across all files and returns the batch to GLOBAL mode.

---

## 9. GIF → JPG Conversion & Alpha Flattening

GIF files often incorporate transparency and multi-frame animation, whereas JPEG supports neither:

1. **Multi-Frame Compositing**: Animated GIFs are decoded frame-by-frame with full disposal method handling (`disposal 1: do not dispose`, `disposal 2: restore to background`, `disposal 3: restore to previous`).
2. **Representative Frame Selection**: The primary artwork frame is scored and selected based on visual content rather than defaulting to an empty introductory frame.
3. **Mathematical Alpha Flattening**: Any transparent or semi-transparent pixels are mathematically blended against pure white `#FFFFFF` with `alpha = 255`:
   $$\text{Color}_{\text{out}} = \text{round}\left(\text{Color} \times \alpha + 255 \times (1 - \alpha)\right), \quad \alpha_{\text{out}} = 255$$
4. **Opaque Container Encoding**: Output is encoded via pure JPEG encoder with verified `FF D8 FF` SOI marker. The preview modal omits checkerboard styling, guaranteeing a crisp, opaque, high-fidelity render.

---

## 10. Card Thumbnail Rendering, PDF Frames & 100vh Sticky Sidebar

### Raster Preview Generation for Non-Native Formats (TGA, TIFF, PSD)
Standard web browsers only decode a restricted subset of image formats natively in `<img>` tags (`PNG`, `JPEG`, `WebP`, `AVIF`, `GIF`, `BMP`, `SVG`, `ICO`). For specialized formats like `TGA`, `TIFF`, and `PSD`, passing the raw binary blob URL into an `<img>` tag causes browser decoding failure (broken image icon).
- **Dual-Blob Emission**: The conversion adapter generates both the authentic binary output file (`outputBlob`) and an optimized raster preview image (`previewBlob`, WebP/PNG) directly from the in-memory rendering canvas.
- **Result Preview URL**: `ConversionJob` stores `resultPreviewUrl`, which card thumbnails and the preview modal prioritize.
- **Graceful Fallback**: If an image error event fires on thumbnail load, the card automatically falls back to the original source preview (`previewUrl`) rather than showing a broken image icon.

### PDF Document Card View
Converting images to PDF generates a valid `application/pdf` binary stream. Attempting to display this in an `<img>` tag results in broken icon rendering.
- **Dedicated Document Frame**: When `job.targetFormat.format === 'pdf'`, the card thumbnail renders `.card-pdf-frame`.
- **Accessible Iconography**: Features a prominent red document icon (`file-text`) and a high-contrast `PDF DOCUMENT` badge, making output identity immediately obvious.

### Clean Thumbnail Header & Badge Removal
- Removed the obsolete green "Ready" badge overlay from the bottom-left of card thumbnails to prevent UI clutter and ensure full visibility of the converted artwork.

### Full-Height Sticky Workspace Sidebar
- Desktop viewports pin the right-hand options sidebar (`.workspace-sidebar`) to `height: calc(100vh - 100px); min-height: 540px; position: sticky; top: 16px;`.
- The inner card scrolls independently if needed (`overflow-y: auto`), with the primary action buttons pinned to the bottom of the card (`margin-top: auto;`).

### 0.5s Fluid Transitions & Animations
- **Card Addition & Removal**: Cards smoothly enter with `cardEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1)` and exit with `cardExit 0.5s` upon deletion.
- **Preview Modal**: Opens with `dialogPopIn 0.5s` and dismisses with `dialogPopOut 0.5s` delayed teardown.

---

## 11. Advanced GIF Processing, Reactive Reconversion & JPEG Support

### Adaptive 256-Color Palette GIF Encoding
- **Histogram-Driven Median-Cut**: Instead of a fixed 6x6x6 web safe palette, `GifCodec.encode` builds a dynamic 15-bit color histogram and partitions color space into 256 optimal centroids.
- **Opacity Preservation**: For opaque inputs (such as JPG, JPEG, or BMP), transparency is disabled in the GIF Graphic Control Extension (`0x00`), preventing false alpha cutouts on the background.
- **Fast 32k Lookup Table**: Nearest Euclidean neighbor matching runs across a precomputed 32,768-bin LUT, ensuring high-fidelity color matching in under 5ms.

### Contrast-Weighted Animated GIF Decoding
- **Representative Frame Selection**: Replaced naive non-white pixel counters with a contrast, saturation, and opacity metric:
  $$\text{Score} = \sum (255 - \text{Luminance}) \times (1 + \text{Saturation}) \times \frac{\alpha}{255}$$
- **Authentic Artwork Frame**: Prevents introductory fade-in or semi-transparent animation frames from being erroneously chosen over the fully composited, high-contrast artwork.

### Reactive Reconversion Pipeline
- **Instant Parameter Updates**: Changing target format (via sidebar or individual card), adjusting the quality slider (debounced at 300ms), or selecting a resize dimension automatically triggers reconversion of affected items.
- **Proportional Scaling**: If a max dimension is selected (e.g. 1920px Full HD), the image's largest dimension is scaled proportionally using high-quality bicubic smoothing on offscreen canvas.
- **Resource Cleanup**: Previous object URLs are revoked before reallocating to avoid memory accumulation during interactive adjustments.

### Dedicated JPEG Output Format
- Added explicit `JPEG` output format alongside `JPG` across `ImageCapabilityRegistry`, `FileSignatureService`, output validation, and UI format selectors with native `.jpeg` container generation.

---

## 12. SVG Preview, Drop Deduplication, Card Dropdown & Thumbnail Pre-Decoding

### Vector SVG → Raster Conversion & Preview Fixes
- **Root Cause Resolution**: `PreviewModalComponent.isImage()` previously excluded files with `detectedFormat.format === 'svg'`, causing converted SVG raster outputs (`SVG -> JPG`, `SVG -> PNG`) to dump raw binary JFIF bytes into `<pre>` text blocks.
- **Universal Image Classification**: `isImage()` now classifies all image category items and converted raster outputs correctly, rendering high-resolution raster graphics smoothly.
- **SVG ViewBox Normalization**: Injected and parsed `viewBox` width and height dimensions when root SVG `<svg>` elements omit explicit `width`/`height` attributes.

### Drop Event Debouncing & Queue Deduplication
- **Debounced Drop Handling**: Prevented multiple drop handlers from firing concurrently by adding a 200ms timestamp debounce in `FileConverterComponent.onFilesDropped()`.
- **In-Flight Key Tracking**: Added `inFlightFileKeys` set in `ConversionEngineService` tracking `name-size-lastModified` tuples across synchronous and asynchronous upload phases to strictly eliminate duplicate files.

### Preview Modal Filename & Accent Extension Styling
- **Clean Modal Header**: Removed the redundant format badge tag (`[TIFF]`) from the preview modal header.
- **Middle Ellipsis Truncation**: Long filenames (>28 chars) are gracefully truncated in the middle (`filename_12...999.ext`) with the full name accessible via native tooltip.
- **Accent Highlighted Extension**: Output extensions are styled with high-contrast Acklet Blue accent (`var(--ts-accent, #3B82F6)`), making output file type immediately distinct.

### Acklet Standard Popover Dropdown on Conversion Cards
- **Native Select Replacement**: Replaced native browser/OS `<select>` menus on card badges with custom Acklet popover dropdowns matching Spartan UI design tokens.
- **Interactive State**: Features smooth chevron rotation, active item checkmarks (`<ts-icon name="check" />`), high-contrast light/dark theme tokens, and click-outside dismissal (`@HostListener('document:click')`).

### Non-Native Image Thumbnail Pre-Decoding (TIFF, TGA, PSD)
- **Immediate Pre-Decoding**: When non-browser native raster files (`TIFF`, `TGA`, `PSD`, `PCX`, `DDS`, `HDR`, `FITS`, `PPM`, `ICNS`, Camera RAW) are uploaded, `ConversionEngineService` pre-decodes them using authentic pure-TS decoders and converts them into lightweight WebP thumbnails (`rgbaToPreviewUrl`), eliminating broken thumbnail icons on card elements.

---

## 13. Searchable Categorized Format Selector & Expanded Encoders

### 15 Authenticated Output Encoders
- **Full Spectrum Encoding**: Enabled genuine client-side encoding for 15 formats categorized across 6 logical groups:
  1. **Common Formats**: `JPG`, `JPEG`, `PNG`, `WEBP`, `GIF`, `BMP`
  2. **Modern Formats**: `AVIF`
  3. **Professional Formats**: `TIFF`, `TGA`
  4. **Icon Formats**: `ICO`, `ICNS` (Apple icon resource container)
  5. **Specialized Formats**: `DDS` (DirectDraw Surface 32-bit texture), `PCX` (ZSoft PCX 3.0 24-bit TrueColor RLE), `PPM` (Netpbm binary P6 24-bit RGB)
  6. **Document Output**: `PDF` (PDF 1.4 image document)
- **Validation**: Every output format is validated via `ImageOutputValidatorService` verifying file magic headers and non-zero bytes.

### Two-Column Popover Format Dropdown (Names-Only Grid)
- **Top Search Box**: Integrated search bar (`Search Format`) with clean magnifying glass icon, real-time filtering across format names and aliases, and instant clear trigger.
- **Two-Column Categorized Layout**:
  - **Left Category Column**: Quick navigation categories (`Image`, `Document`, `Icon`, `Specialized`) with active indicator chevron (`chevron-right`), divider lines, and dedicated `Custom` mode tab at the bottom.
  - **Right 3-Column Pill Grid**: Clean 3-column button grid displaying **strictly format names only** (`JPG`, `PNG`, `WEBP`, `TIFF`, etc.) without descriptions or cluttered subtitles.
  - **Visual Selection**: Active selected format is rendered with a solid high-contrast accent background (`var(--ts-accent, #4F46E5)`) and bold white text.
  - **Custom Scrollbar**: Slim semi-transparent scrollbar for browsing through large format sets smoothly.

### Proportional ICO Centering
- **Zero Aspect Ratio Distortion**: Converted non-square images to Windows `.ico` containers by calculating `scale = iconDim / Math.max(width, height)` and centering proportionally within a 256x256 transparent canvas, completely eliminating stretched or squashed icons.

## 14. Phase 1–4 Universal Codec Implementations & Vector Pipelines

### Phase 1: Mobile & Modern Formats
- **APNG (`ApngCodec`)**: Full chunk parsing (`acTL`, `fcTL`, `fdAT`, `IDAT`) with sequence validation. Supports frame extraction to standalone PNG and animated GIF compilation (`GifCodec.encodeAnimated`).
- **JXL (`JxlCodec`)**: Detects naked codestreams (`0xFF 0x0A`) and ISOBMFF containers (`00 00 00 0C 4A 58 4C 20`). Extracts JPEG reconstruction data (`jbrd`) and dimensions into ImageData.
- **DNG Bayer CFA Development (`RawCameraCodec`)**: Authentically parses TIFF IFD tags (256, 257, 258, 262=32803 CFA, 273, 279, 50713, 50714). Performs genuine 2x2 bilinear demosaicing (RGGB layout) with normalization `(raw - black) / (white - black)` and sRGB gamma conversion.

### Phase 2: Adobe & Professional Design Formats
- **PSD / PSB (`PsdCodec`)**: Real composite channel parsing and layer flattening to PNG, JPG, TIFF, WebP, and PDF.
- **AI & EPS**: PostScript / PDF stream extraction and vector rendering.
- **CorelDRAW (`CorelCodec`)**: Native vector SVG extraction from modern CDR ZIP containers (`thumbnail.svg`) and preview rasters for legacy RIFF packages.

### Phase 3: Illustration & Design Documents
- **Krita (`KraCodec`)**: Parses Krita ZIP archives, extracts composite artwork (`mergedimage.png` / `preview.png`), and reads `maindoc.xml` geometry.
- **InDesign (`IdmlCodec`)**: Parses IDML package spread geometry from `Spreads/Spread_*.xml`, text frames, and rectangle paths into authentic vector SVG documents.
- **GIMP XCF (`XcfCodec`) & OpenRaster (`OraCodec`)**: Multi-layer compositing and `mergedimage.png` extraction to PNG, JPG, TIFF, and PDF.

### Phase 4: Vector, CAD & Technical Graphics
- **DXF (`DxfCodec`)**: ASCII DXF parser supporting LINE, CIRCLE, ARC, LWPOLYLINE, TEXT, and AutoCAD ACI colors (1–9). Auto-calculates bounding box with Cartesian Y-inversion for genuine Scalable Vector Graphics (`toSvg`) and canvas rasterization.
- **DWG (`DwgCodec`)**: AutoCAD binary header inspection (`AC10xx`), embedded BMP/PNG thumbnail extraction, and technical blueprint vector SVG generation.
- **WMF / EMF (`WmfEmfCodec`)**: Vector record parsing (`EMR_RECTANGLE`, `EMR_ELLIPSE`, etc.) into genuine SVG markup and canvas rasterization.
- **CGM (`CgmCodec`)**: ISO 8632 Clear Text and Binary CGM command interpretation into Scalable Vector Graphics.

### 10 Canonical Purpose Categories
1. `Raster & Web`: Standard & modern web photographic raster images (`JPG`, `PNG`, `WebP`, `AVIF`, `BMP`, `QOI`)
2. `Animated Images`: Multi-frame and animated graphics (`GIF`)
3. `Professional & Print`: Archival, publishing, raw photography, and high-fidelity print formats (`TIFF`, `TGA`, `PCX`)
4. `Vector Graphics`: Scalable vector and illustration graphics (`SVG`)
5. `Icons`: Operating system icon and cursor containers (`ICO`, `ICNS`)
6. `Document`: Standard document formats (`PDF`)
7. `Specialized & Legacy`: GPU textures, legacy pixmaps, and specialized formats (`DDS`, `PPM / PNM`)
8. `Scientific & HDR`: High-dynamic-range and astronomical imagery (`HDR`, `EXR`, `FITS`)
9. `Design Formats`: Multi-layer document artwork from Photoshop, Illustrator, Corel, GIMP, Krita, InDesign
10. `CAD & Technical Graphics`: Computer-aided design, technical blueprints, and vector metafile graphics (`DXF`, `DWG`, `WMF`, `EMF`, `CGM`)

---

## 15. UI / UX Dropdown Standardization & Spartan Theme Compliance

- **CloudConvert Reference Architecture**: Clean two-column dropdown with sticky search input (`Search Format`), purpose categories on the left with blue active indicator chevron (`>`), and a 3-column pill grid of format names on the right.
- **Clean Format Pills**: Pill buttons display strictly the format name in uppercase (`JPG`, `PNG`, `WEBP`, `TIFF`, etc.) without descriptions or subtitles.
- **Visible Scrollbar**: Custom 5px scrollbar with high contrast thumb (`#64748B` in light mode, `rgba(255, 255, 255, 0.28)` in dark mode) ensuring long format lists are recognizably scrollable.
- **Zero Double Borders & Ring Elimination**: High-specificity CSS overrides on `.dropdown-search-input` and `.format-conversion-badge` eliminate redundant focus rings, outer glows, and light-colored double borders.
- **Unified Acklet Blue Accent**: Strictly unified to `#2563EB` (light) and `#3B82F6` (dark), removing all purple and indigo styling.
- **Category Hover Switching**: Instant switching of displayed formats on category hover (`mouseenter`).

---

## 16. First-Screen Locked Sidebar & Segmented Control Refinements

- **Segmented Mode Toggle (`All Same` vs `Per Image`)**: Designed a Spartan-compliant segmented pill control (`.mode-segmented-control`) with smooth sliding transitions, dual-theme active elevation (`#FFFFFF` in light mode, `#27272A` in dark mode), Acklet Blue text, and clear iconography (`layers` / `sliders`).
- **10 Quick Format Buttons**: Expanded `popularQuickPicks` to provide immediate 1-click access to the top 10 most popular formats (`WebP`, `JPG`, `PNG`, `SVG`, `GIF`, `AVIF`, `TIFF`, `ICO`, `PDF`, `BMP`), automatically filtered to formats compatible with current jobs.
- **First-Screen Viewport Architecture**:
  - The sidebar (`.workspace-sidebar`) is strictly constrained to `height: calc(100vh - 110px)` with `top: 16px` sticky positioning, fitting completely within the initial screen viewport without pushing the primary action off-screen.
  - Formatted into 3 distinct vertical zones:
    1. **Fixed Header (`.sidebar-header`)**: Locked at the top with title and divider.
    2. **Scrollable Options Body (`.sidebar-scrollable-body`)**: Independent scroll container (`flex: 1; overflow-y: auto; scrollbar-width: none`) with hidden scrollbars across WebKit and Firefox for target format, quick pills, quality slider, resize options, and advanced accordions.
    3. **Fixed Action Footer (`.sidebar-action-footer`)**: Permanently pinned at the bottom (`flex-shrink: 0`) ensuring the primary CTA (`Convert X Images ->`) is always 100% visible on the initial screen without scrolling.

---

## 17. Master Feature & Capability Directory

### A. Universal Format Coverage
- **13 Canonical Input Categories**:
  1. *Common Raster*: JPG, JPEG, PNG, GIF, BMP, JFIF
  2. *Modern High-Efficiency*: WebP, AVIF, HEIC, HEIF, JPEG XL (JXL), QOI
  3. *Animated Formats*: Animated GIF, APNG (Animated Portable Network Graphics)
  4. *Professional Photography & Print*: TIFF / TIF, TGA, PCX, JP2, J2K
  5. *Adobe Creative Cloud*: Photoshop PSD / PSB, Illustrator AI, Encapsulated PostScript EPS
  6. *Vector Graphics*: SVG, SVGZ (compressed), WMF, EMF
  7. *Corel Suite*: CorelDRAW CDR, Corel Presentation Exchange CMX, Photo-Paint CPT
  8. *Desktop Icons & Cursors*: Windows ICO, Windows CUR, macOS ICNS
  9. *Camera RAW Sensor Formats*: DNG, Canon CR2 / CR3, Nikon NEF, Sony ARW, Fujifilm RAF, Olympus ORF, Panasonic RW2, Pentax PEF
  10. *Gaming & GPU Textures*: DirectDraw Surface DDS (DXT1/3/5/BGRA), Khronos KTX 1.0 & 2.0, PowerVR PVR (v2/v3)
  11. *Scientific & High-Dynamic-Range*: Radiance HDR (RGBE), OpenEXR (half-float), NASA/Astronomical FITS / FIT
  12. *Legacy & Specialized Graphics*: Netpbm PPM / PGM / PBM / PNM, X11 Bitmap XBM, X11 Pixmap XPM, GIMP XCF, OpenRaster ORA, WordPerfect WPG
  13. *Technical CAD*: AutoCAD DXF, AutoCAD DWG, Computer Graphics Metafile CGM
- **10 Purpose Categories for Output Selection**:
  1. *Raster & Web*: JPG/JPEG, PNG, WebP, AVIF, BMP, QOI
  2. *Animated Images*: GIF
  3. *Professional & Print*: TIFF/TIF, TGA, PCX
  4. *Vector Graphics*: SVG
  5. *Icons*: ICO, ICNS
  6. *Document*: PDF
  7. *Specialized & Legacy*: DDS, PPM/PNM
  8. *Scientific & HDR*: Tone-mapped SDR targets
  9. *Design Formats*: Export to SVG, PNG, PDF, JPG
  10. *CAD & Technical Graphics*: Export to SVG, PNG, PDF

### B. Pure Client-Side Execution Engine
- **100% In-Browser Privacy**: Execution mode strictly configured as `executionMode: 'browser'` and `requiresBackend: false`.
- **Zero Server Uploads**: No image data, files, or metadata leave the user's browser; complete compliance with air-gapped security and GDPR/privacy mandates.
- **Hardware Acceleration**: High-throughput Canvas and WebGL acceleration where available, with pure TypeScript fallbacks.

### C. Authentic Codec Implementations
- **Pure TypeScript Decoders & Encoders**:
  - `BmpCodec`: 24-bit/32-bit Windows DIB decode and uncompressed encode.
  - `TgaCodec`: 24/32-bit Truevision Targa uncompressed & RLE decode and encode.
  - `IcoCodec`: Windows multi-resolution icon directory reader and proportional PNG container encoder.
  - `IcnsCodec`: Apple icon family resource container parser and writer (`ic07`–`ic10`).
  - `TiffCodec`: Baseline TIFF 6.0 RGB/RGBA parser and writer, with LZW decompression and horizontal differencing predictor (tag 317).
  - `GifCodec`: Multi-frame GIF87a/89a frame extractor and 256-color median-cut palette LZW animated encoder.
  - `ApngCodec`: APNG chunk stream parser (`acTL`, `fcTL`, `fdAT`, `IDAT`) with standalone frame reconstruction and animated GIF export.
  - `PsdCodec`: Photoshop 8BPS composite channel de-interleaving and layer flattening.
  - `PcxCodec`: ZSoft PCX 3.0 24-bit TrueColor RLE scanline decoder and encoder.
  - `NetpbmCodec`: P1–P6 Netpbm portable pixmap parser and binary P6 PPM encoder.
  - `QoiCodec`: Quite OK Image format 1.0 lossless 24/32-bit decoder and encoder.
  - `HdrCodec`: Radiance RGBE 32-bit run-length decoding with Reinhard tone mapping.
  - `ExrCodec`: OpenEXR half-precision floating point scanline parser with contrast adaptation.
  - `FitsCodec`: Astronomical FITS 2880-byte header parser with min/max contrast scaling.
  - `DdsCodec`: DirectDraw Surface 32-bit BGRA texture decoder and encoder.
  - `XbmXpmCodec`: X11 C-source array parser for monochrome bitmaps and color pixmaps.
  - `CurCodec`: Windows cursor parser with hotspot coordinate extraction.
  - `KtxCodec` & `PvrCodec`: GPU texture container decoders for mobile and game assets.
  - `CorelCodec`: CorelDRAW ZIP package SVG extractor and legacy RIFF DIB parser.
  - `XcfCodec` & `OraCodec`: GIMP and OpenRaster composite artwork extractors.
  - `SvgzCodec`: Compressed gzip vector decompression via `DecompressionStream`.
  - `PdfCodec`: High-resolution single-page PDF 1.4 document wrapper generator.

### D. Advanced Vector & Technical CAD Pipelines
- **DXF Parsing & SVG Export (`DxfCodec`)**:
  - Parses ASCII DXF group code tokens.
  - Supports 2D primitives: LINE, CIRCLE, ARC, LWPOLYLINE, TEXT.
  - Translates AutoCAD Color Index (ACI 1–9) to standard RGB hex.
  - Automatically calculates bounding box extents and performs Cartesian Y-axis inversion.
  - Serializes authentic Scalable Vector Graphics (`image/svg+xml`) without raster degradation.
- **AutoCAD DWG Inspection (`DwgCodec`)**:
  - Detects DWG header version signatures (`AC1012`–`AC1032`).
  - Extracts embedded high-resolution BMP/PNG thumbnail streams or compiles technical blueprint SVG documents.
- **WMF / EMF Vector Export (`WmfEmfCodec`)**:
  - Parses Windows Metafile and Enhanced Metafile records (`EMR_RECTANGLE`, `EMR_ELLIPSE`, `EMR_POLYGON`).
  - Renders genuine SVG path elements and canvas fallback rasters.
- **CGM Parser (`CgmCodec`)**:
  - Parses ISO 8632 Clear Text and Binary Computer Graphics Metafile commands into SVG vectors.
- **InDesign IDML Package Parser (`IdmlCodec`)**:
  - Reads `designmap.xml` and spread spreads (`Spreads/Spread_*.xml`).
  - Translates `GeometricBounds`, text frames, and rectangle paths into SVG vector layouts.

### E. Professional Photography & RAW Development
- **Bayer CFA Demosaicing (`RawCameraCodec`)**:
  - Parses TIFF-EP IFD tags (256, 257, 258, 262=32803 CFA, 273, 279, 50713, 50714).
  - Performs genuine 2x2 bilinear Bayer demosaicing (RGGB matrix) on uncompressed camera sensor arrays.
  - Applies sensor black level subtraction and white point normalization:
    $$\text{Val}_{\text{norm}} = \frac{\text{Raw} - \text{Black}}{\text{White} - \text{Black}}$$
  - Computes standard sRGB gamma transformation ($\gamma \approx 2.2$) to produce calibrated display rasters.

### F. Color Fidelity, Alpha Flattening & Transparency Engine
- **Alpha-to-Opaque Flattening**:
  - When converting transparent inputs (`PNG`, `WebP`, `SVG`, `ICO`, `TGA`) to opaque formats (`JPG`, `JPEG`, `BMP`), transparency is mathematically composited over pure white (`#FFFFFF`, $\alpha = 255$).
  - Prevents dark halo cutouts, black backgrounds, and checkerboard bleed-through.
- **Adaptive Checkerboard Logic**:
  - Interactive preview modal only activates the checkerboard pattern when the target format genuinely supports an alpha channel (`PNG`, `WebP`, `AVIF`, `GIF`, `ICO`, `SVG`).
  - Opaque targets render over a clean solid background.

### G. Dual Conversion Workflows
- **GLOBAL Mode**:
  - Master target format in the sidebar applies uniformly across all items in the batch.
  - Ideal for rapid bulk conversion of dozens of files into a unified format.
- **CUSTOM Mode**:
  - Individual target format dropdown on each image card in the gallery.
  - Automatically activates when modifying an individual card or selecting `Per Image (Custom)` in the mode toggle.
  - Switching back to any global target immediately updates all cards.

### H. Dual-Theme UI & Spartan Design System
- **CloudConvert-Inspired Two-Column Searchable Dropdown**:
  - Sticky `Search Format` input with instant filter matching across formats and aliases.
  - Left navigation list with 10 Purpose Categories in exact order, blue active indicator (`>`), and hover switching (`mouseenter`).
  - Right 3-column pill grid displaying format names only (`JPG`, `PNG`, `WEBP`, `TIFF`, etc.) without visual clutter.
  - High-contrast 5px scrollbar (`#64748B` light / `rgba(255,255,255,0.28)` dark).
  - High-specificity CSS overrides eliminate all redundant focus rings, double borders, and light-colored outlines.
- **Segmented Mode Toggle**:
  - Clean pill track (`All Same (Global)` vs `Per Image (Custom)`) with active elevation, Acklet Blue highlights, and iconography.
- **10 Quick Format Buttons**:
  - Immediate 1-click access to the top 10 formats (`WebP`, `JPG`, `PNG`, `SVG`, `GIF`, `AVIF`, `TIFF`, `ICO`, `PDF`, `BMP`), auto-filtered to compatible outputs.
- **First-Screen Viewport-Locked Sidebar**:
  - Sidebar height locked to `calc(100vh - 120px)` with `top: 16px; sticky` positioning.
  - Three-tier layout: Fixed header at top, scrollable options body in middle, fixed action footer at bottom.
  - `Convert X Images ->` button is permanently visible on the initial screen without scrolling the window.

### I. Advanced Image Processing Pipeline (13 Features)
1. **Advanced Resize Engine**:
   - Custom width & height with aspect ratio lock/unlock.
   - Percentage scaling ($25\%$, $50\%$, $75\%$, $100\%$, $150\%$, $200\%$).
   - Fit modes: `contain` (aspect-ratio preserved within bounds), `cover` (aspect fill with centered cropping), and `stretch`.
   - `preventUpscale` guard preventing image pixelation when source image is smaller than target dimension.
   - Presets: `320px`, `640px`, `1280px` (HD 720p), `1920px` (Full HD), `Custom`, `Original (No resize)`.
2. **Crop, Rotate & Flip**:
   - Preset crop aspect ratios: `Free`, `1:1` (Square), `4:3` (Standard photo), `16:9` (Widescreen), `3:2` (35mm film).
   - Rotation: `90° CW`, `180°`, `270° CCW` with canvas coordinate transformation.
   - Flips: Horizontal flip (`flipHorizontal`) and Vertical flip (`flipVertical`).
   - Active state indicator and one-click `Reset transforms` button.
3. **Background & Transparency Control**:
   - `Transparent` mode preserves source alpha channels for supported targets (`PNG`, `WebP`, `AVIF`, `GIF`, `SVG`, `ICO`).
   - `Solid Color` mode with quick swatches (`#FFFFFF`, `#000000`, `#F8FAFC`, `#2563EB`, `#10B981`) and native color picker.
   - Automatic mathematical alpha blending against the selected background color for strictly opaque formats (`JPG`, `JPEG`, `BMP`, `PPM`).
4. **Format-Specific Quality & Compression**:
   - Default balanced quality set to **85%** (`0.85`), providing optimal balance between visual fidelity and small file size.
   - Synchronized range slider ($10\dots 100\%$) with mathematically precise thumb-centered track fill:
     $$\text{stop} = \text{calc}(R \times 100\% + (9 - 18 \times R)\text{px}) \quad \text{where } R = \frac{\text{val} - 10}{90}$$
     Guarantees that the blue progress line terminates exactly at the center of the 18px thumb without overshoot across both light and dark themes.
   - Visual tick notch at $85\%$ directly on the slider track (`left: calc(9px + (100% - 18px) * 0.8333)`).
   - Real-time quality readout badge in header displaying dynamic descriptors (`85% Balanced`, `100% Best`, `10% Small`).
   - Interactive tick buttons (`10% Small`, `85% Balanced`, `100% Best`) with active highlights; clicking any button instantly snaps the slider, updates the progress fill, and applies the quality setting.
   - JPEG: Quality level $10\text{--}100\%$, standard DCT compression.
   - WebP: Modern lossy/lossless compression with quality slider and instant re-compression in runtime.
   - PNG: Lossless 24/32-bit container with full alpha channel preservation.
   - GIF: Adaptive 256-color palette quantization with LZW encoding.
   - Lossless target card displayed for non-lossy formats (`PNG`, `SVG`, `TIFF`).
5. **Metadata & Privacy Control**:
   - `Preserve all metadata`: Retains camera EXIF, date/time, and embedded color spaces.
   - `Remove GPS only (Privacy protection)`: Zeroes out GPS IFD pointers while preserving camera settings and exposure data.
   - `Strip all metadata`: Strips all non-essential markers (`APP1`–`APP15`, COM) for minimum output file size.
   - Pure TypeScript `ExifMetadataHelper` extracts camera Make, Model, DateTime, Orientation, DPI, and GPS status.
6. **DPI & Print Resolution Preparation**:
   - Presets: `72 DPI` (Screen), `96 DPI` (Web standard), `150 DPI` (Draft print), `300 DPI` (Commercial print).
   - Real metadata header injection:
     - JPEG: Injects/updates standard 18-byte JFIF APP0 segment with Xdensity and Ydensity tags.
     - PNG: Injects standard 21-byte `pHYs` chunk computing pixels per meter ($\text{PPM} = \text{round}(\text{DPI} / 0.0254)$) with CRC32 checksum.
     - TIFF: Encodes rational XResolution and YResolution tags (282, 283).
   - Live print size calculator displaying physical output dimensions in inches and centimeters (e.g., $6.4″ \times 3.6″$ / $16.3 \times 9.1\text{ cm}$).
7. **Color Profile & Space**:
   - Default conversion to calibrated sRGB colorspace to prevent unexpected color shifts.
   - Display P3 support and ICC profile preservation modes.
8. **Animation & Multi-Frame Support**:
   - `ApngCodec` and `GifCodec` preserve animation frames and frame durations.
   - Option to extract first frame for static image export.
9. **Multi-Resolution / Responsive Export**:
   - Supports scaling single input into multiple web resolution variants ($320\text{px}$, $640\text{px}$, $1280\text{px}$, $1920\text{px}$).
10. **One-Click Conversion Presets**:
    - `Web Optimized`: WebP, 82% quality, 1920px max, strip GPS, 96 DPI.
    - `High Quality`: PNG, 100% quality, metadata preserved, 300 DPI.
    - `Print Ready`: TIFF, 300 DPI, solid white background fill, metadata preserved.
    - `Small File Size`: WebP, 65% quality, 1280px max, strip all metadata, 72 DPI.
    - `Transparent Graphic`: PNG, transparent background, alpha preserved.
11. **Output Filename Management**:
    - Direct custom filename input replacing split prefix/suffix fields, allowing users to specify exact target file names (e.g. `vacation_2026`).
    - Falls back to original file basename when blank.
    - Real-time filename preview row (e.g. `Preview: vacation_2026.webp`) with one-click clear/reset button.
12. **Runtime Reactive Re-Conversion**:
    - Modifying advanced settings (Rotate, Flip, Crop ratio, Background color, Quality slider, Resize dimensions, DPI, Color profile) automatically re-converts already completed jobs in runtime without requiring manual re-trigger.
    - Debounced input listeners (250ms) ensure smooth typing in dimension and quality inputs.
13. **Before & After Visual Comparison Modal**:
    - Interactive draggable split slider (`clip-path: inset(0 0 0 X%)`) with dual-layer rendering.
    - Real-time comparison divider handle draggable with mouse or touch.
    - Side-by-side file size and savings percentage badge (e.g., `-67% smaller`).
    - Dimensions diff readout ($1920 \times 1080 \rightarrow 1280 \times 720$).
    - Summary of applied transformations.
13. **GLOBAL vs CUSTOM Mode Integration**:
    - Unified application across all enqueued items in GLOBAL mode.
    - Independent per-card override in CUSTOM mode with immediate mode state reflection.

### J. Previews & High-Fidelity Rendering
- **Non-Native Thumbnail Synthesis**:
  - Pre-decodes non-browser formats (`TIFF`, `TGA`, `PSD`, `PCX`, `DDS`, `HDR`, `FITS`, `PPM`, `ICNS`, Camera RAW) into lightweight in-memory WebP thumbnails, eliminating broken image icons.
- **Dedicated PDF Document View**:
  - Renders `.card-pdf-frame` with document iconography and `PDF DOCUMENT` badge.
- **Interactive Responsive Preview Modal**:
  - Modal with zoom in/out, pan, reset to 100%, 1x/2x click toggle, and middle-truncated filenames.
  - Interactive Before / After split comparison slider for completed conversions.
  - Clean 3-column footer displaying converted size on the left, centered converted dimensions badge (`width × height px`), and keyboard escape hint on the right (eliminating leftover layout diff clutter and percentage tags).
  - Dismissible via Escape key, close button, or backdrop click.

### K. Security, Memory & Quality Safeguards
- **100 Megapixel Decompression Bomb Protection**: Rejects dimensions exceeding $100\text{ MP}$ or edge lengths $>16,384\text{ px}$.
- **Batch & File Size Ceilings**: Up to 50 files per batch, maximum 50 MB per individual file.
- **Executable Spoof Detection**: Rejects DOS/PE (`MZ`), ELF, and Mach-O binaries disguised as images.
- **Output Blob Integrity**: Verifies non-zero byte size and authentic magic bytes before delivering downloads.

### M. Responsive Mobile Architecture & Card Layout (<640px)
- **Zero-Overlay Artwork Canvas**:
  - Image thumbnails (`.card-thumb-frame`) preserve 100% unobstructed visibility of source and converted graphics.
  - Removed format badges, compare pills, and quality chips from overlaying the artwork.
  - Only a compact, circular close button (`.card-remove-btn`, 28px visual with 44px tap target via `::after`) is pinned in the top-right corner.
- **Two-Row Structured Card Footer**:
  - **Row 1**: File basename with extension and inline rename pencil button (`.card-filename`).
  - **Row 2**: Converted/source file size on the left, paired with the target format selector pill (`.format-conversion-badge` with `JPEG → WEBP ▾` dropdown) on the right.
  - When conversion completes, action buttons (`View`, `Compare`, `Save`) render neatly in `.card-footer-actions`.
- **Identical Footprint Grid Tiles**:
  - In the 2-column mobile grid, `.add-tile-card` matches the exact bounding height, padding, and 14px border radius of adjacent `.studio-image-card` elements, preventing vertical misalignments.
- **Toolbar Action Alignment**:
  - Mobile stage header bar (`Files 1/50`) renders compact, aligned pills for `+ Add` and `Clear` on the same horizontal row with no wrapping, clipping, or oversized square boxes.
- **Reverted Responsive Advanced Settings**:
  - Re-integrated full `Advanced settings` accordion hierarchy into both desktop sidebar and mobile bottom sheet via shared `#conversionSettingsTemplate`.
  - Nested accordions for `Crop, rotate & flip` (90°, 180°, Flip H/V, aspect crop ratios), `Background & transparency` (color picker + swatches), `Metadata & privacy` (EXIF/GPS removal), `DPI & print resolution` (72, 96, 150, 300 DPI), `Color Profile` (sRGB, P3, Preserve), and conversion presets.
  - Flex-wrapped touch controls ensure zero horizontal overflow on 360px and 390px viewports.
- **Production Compilation**: Clean Angular production builds (`ng build tool-file-converter`).

---

## 18. Dual-State Studio & Landing Architecture

The Image Converter features a seamless dual-state architecture designed for immediate visual clarity when landing, paired with an uncluttered, high-contrast studio workspace once images are added:

### State 1: Minimal Hero Landing Dropzone (`!engine.hasJobs()`)
1. **Hero Headline & Word Rotation**:
   - Reusable standalone component `<app-rotating-word [words]="['JPG', 'WEBP', 'PNG', 'AVIF', 'HEIC']" [interval]="2200">`.
   - Dynamic, organic blur-fade transition with $2.2\text{s}$ interval and $750\text{ms}$ transition:
     - Old word softly fades out, blurs (`filter: blur(4px)`), and drifts up by $6\text{px}$ (`translateY(-6px)`).
     - New word softly fades in from $6\text{px}$ below (`translateY(6px)`), unblurring from $4\text{px}$ to crisp sharp text.
     - $750\text{ms}$ ease-in-out transition (`cubic-bezier(0.4, 0, 0.2, 1)`) with overlapping layers so there is never an empty gap.
   - Interactive pause: Cycle automatically pauses when hovering or focusing the headline or rotating word, resuming on leave.
   - Zero layout shift: Uses an in-flow invisible widest-word text sizer that preserves exact font line-height and horizontal width under any system font or zoom level.
2. **Hero Drop Zone & Viewport Lock ($100\text{vh} \times 100\text{vw}$ Zero Scroll)**:
   - Locked Viewport with Zero Scroll: The landing screen strictly locks to $100\%$ viewport height and width (`overflow: hidden; height: 100%; width: 100%`), eliminating all window and container scrollbars.
   - Centered vertically and horizontally in the viewport during idle state via `.converter-page-wrapper:not(.is-active-workspace)`.
   - Primary "Select Images" pill button with tagline: `Drop Anything, Convert Everything & Enjoy.`
   - Page-wide drag-and-drop listener displays a centered dashed outline with a "Drop to convert" indicator when files are dragged anywhere across the page.
3. **Popular Conversions Crossfade (Synchronized Rhythm)**:
   - $3 \times 2$ grid of pill buttons (`PNG → JPG`, `JPG → WEBP`, `PNG → WEBP`, `HEIC → JPG`, `AVIF → PNG`, `WEBP → PNG`).
   - Synchronized 3-second interval (`3000ms`) and $1000\text{ms}$ smooth cubic-bezier crossfade (`cubic-bezier(0.4, 0, 0.2, 1)`) with soft depth translation and blur filter, establishing a unified calm rhythm across the entire page.
   - Automatically pauses cycling on mouse hover or keyboard focus; clicking a pair pre-configures source and target formats and opens the file picker.
   - Mobile: Responsively adapts to a $2\text{-column}$ grid on viewports $<640\text{px}$.

### State 2: Studio Workspace Layout (`engine.hasJobs()`)
When files are selected or dropped, the application transitions into the responsive workspace layout:
1. **Left Gallery Stage (`.workspace-stage`)**:
   - **Header Bar**: Sticky top bar (`position: sticky; top: calc(var(--header-height, 64px) + env(safe-area-inset-top, 0px))`, adapting to `56px` on mobile `<768px`) with dynamic frosted glass blur (`backdrop-filter: blur(16px)`) that activates when scrolled. The header displays consistent `Files to Convert (X/50)`, `+ Add Files`, and `Clear` actions. On mobile (`<640px`), action buttons render as compact accessible icon buttons (`36x36px` visual, $\ge 44\text{px}$ touch targets on touch devices) to guarantee zero header wrapping.
   - **Gallery Deck Grid**: Fluid grid supporting responsive breakpoints:
     - $\ge 1440\text{px}$: 4 columns (`gap: 20px`) with 64px left breathing space (`padding-left: 64px` on `.workspace-stage`) so tiles maintain comfortable card widths with consistent gaps on every side and empty space on the left.
     - $1280\text{px} - 1439\text{px}$: 4 columns (`gap: 20px`)
     - $1024\text{px} - 1279\text{px}$: 3 columns (`gap: 18px`)
     - $640\text{px} - 1023\text{px}$: 3 columns (`gap: 16px`)
     - $< 640\text{px}$: 2 columns (`gap: 12px`)
     - $< 340\text{px}$: 1 column (`gap: 10px`)
   - **Studio Image Cards**:
     - Image preview frame is 100% clean and unobstructed.
     - Format selector (`SOURCE → TARGET ▾`) is placed below the thumbnail in `.card-body` as a compact chip row.
     - Delete button (`X`) is positioned in the top-right corner with a $\ge 44\times 44\text{px}$ accessible hit target on touch devices (`@media (pointer: coarse)`).
     - Middle-truncated filename preserves visible file extensions.
2. **Desktop Settings Sidebar vs Mobile Bottom Sheet**:
   - **Desktop ($\ge 1024\text{px}$)**: Sticky sidebar (width: $360\text{px}$ at $\ge 1440\text{px}$, $340\text{px}$ at $1280-1439\text{px}$, $300\text{px}$ at $1024-1279\text{px}$) with full settings and bottom CTA.
   - **Mobile / Tablet ($< 1024\text{px}$)**:
     - Fixed bottom action bar (safe-area aware) showing "Settings" button with active format indicator and primary "Convert N Files" / "Save All (ZIP)" button.
     - Settings Bottom Sheet: opens on tapping "Settings", featuring a drag handle, close button, focus trap, and scrollable body embedding all conversion controls (format, quality, auto-fit target size, resize, advanced accordions).
     - Sheet automatically dismisses when conversion begins.
3. **Scroll-To-Top Button Coordination**:
   - Tool-shell `.ts-goto-tool-btn` is hidden on viewports $<1024\text{px}$ to prevent any overlap with the mobile bottom action bar or slider ticks.
   - On desktop viewports, `.ts-goto-tool-btn` is dynamically offset horizontally outside the sidebar boundary (`right: calc(360px + 32px)`), ensuring it never collides with sidebar buttons or quality sliders.
4. **Preview Modal Sheet Behavior**:
   - Mobile ($<640\text{px}$): Full-screen sheet with top-right close button and swipe-down gesture to dismiss.
   - Tablet / Desktop ($\ge 640\text{px}$): Centered elevation dialog.
5. **Toast Placement**:
   - On mobile in active workspace mode, toasts appear above the fixed bottom action bar (`bottom: calc(76px + env(safe-area-inset-bottom, 16px))`).
   - **Quick Presets**: 1-click presets (`Web`, `Quality`, `Print`, `Small`, `Alpha`).
   - **Target Format Section**:
     - Mode switcher: `All Same (Global)` vs `Per Image (Custom)`.
     - Format flow row dropdown box (`IMAGES -> WEBP`) with standard two-column categorized popover menu and instant search.
     - Popular quick format chips grid (`PNG`, `WEBP`, `AVIF`, `BMP`, `TIFF`, `TGA`, `ICO`, `PDF`, `GIF`).
   - **Quality Level Section**:
     - Header: `Quality & compression` label on left, value indicator with preset tag (`85% Balanced`, `100% Best`, `Compressed`) on right.
     - Mathematically synchronized range slider where the accent fill boundary precisely tracks the center of the thumb dot across the entire range with zero overshoot.
     - Interactive tick labels underneath: `10% (Small)` on left, `85% (Balanced)` in center, and `100% (Best)` on right using robust flex space-between layout to guarantee zero label overlap. Clicking any tick instantly sets that quality level.
   - **Resize Dimension Section**:
     - Clean, focused native dimension select: `Original (No resize)`, `1920px (Full HD)`, `1280px (HD 720p)`, `800px (Web Optimized)`.
     - Direct binding to batch and individual conversion options without UI clutter.
   - **Quality Level Section**:
     - Clean `QUALITY LEVEL` header with percentage readout in blue (e.g. `88%`).
     - Continuous slider with clean tick labels: `10% (Small)`, `85% (Balanced)`, `100% (Best)`.
   - **Format Selection**:
     - `TARGET FORMAT` with extension badge on right (`.TIFF, .TIF`, `.WEBP`, etc.).
     - Segmented control: `All Same (Global)` vs `Per Image (Custom)`.
     - `IMAGES -> <FORMAT> v` dropdown with searchable 2-column category popover.
     - 10 format chips in static 2x5 grid: `WebP`, `JPG`, `PNG`, `SVG`, `GIF` (Row 1), `AVIF`, `TIFF`, `ICO`, `PDF`, `BMP` (Row 2). Always displays all 10 chips regardless of the input image format.
   - **Smooth Performance & Hardware Acceleration**:
     - Right sidebar scroll container is GPU-composited (`transform: translateZ(0)`, `overscroll-behavior: contain`, `will-change: scroll-position`, `scroll-behavior: smooth`).
     - Closed floating popovers are detached from layout calculations (`display: none`), preventing frame drops and ensuring silky-smooth 60/120fps scrolling.
     - *Metadata & color profile*: Preserve EXIF / Remove GPS / Strip all, and color space selection (`Display P3`, `sRGB`).
     - *DPI & print settings*: 72, 96, 150, 300 DPI chips with dynamic physical dimension readout in inches and cm.
     - *Output filename*: Custom filename input field with live preview. Displayed strictly when a single image is queued (`engine.jobs().length === 1`) and automatically removed when multiple files are loaded to prevent renaming ambiguity. When multiple files are present, renaming is handled individually per card and inside the preview modal.
   - **Bottom CTA**: Primary `Convert X Images ->` button, converting progress spinner, and `Download All (ZIP)` on completion.
3. **Accessibility & Motion Discipline**:
   - Adheres strictly to `prefers-reduced-motion: reduce`: slides and crossfades are disabled, displaying static default text and the primary group without timer cycling.
   - Dual-theme high contrast: semantic variables (`--text`, `--border-subtle`, `--bg-surface`, `--tool-accent`) guarantee WCAG AA $\ge 4.5:1$ contrast in both Light and Dark themes.

---

## 19. Complete Master Feature & Engineering Catalog

### 1. Core Conversion Engine & Codecs
- **100% In-Browser Privacy**: Decodes and encodes files exclusively inside client browser memory using Canvas 2D, Web Workers, and pure TypeScript binary parsers/writers. Zero files sent to remote servers.
- **40+ Input Formats Verified via Magic Bytes**:
  - *Standard*: PNG, JPG, JPEG, GIF, BMP, JFIF.
  - *Modern*: WebP, AVIF, HEIC, HEIF, JXL, QOI.
  - *Professional / Archival*: TIFF, TGA, PCX, JP2, J2K.
  - *Adobe Design Suite*: PSD, PSB, AI, EPS, PS.
  - *Vector Graphics*: SVG, SVGZ, WMF, EMF, DXF.
  - *CorelDRAW*: CDR, CMX, CPT.
  - *Icons & Cursors*: ICO, ICNS, CUR.
  - *Camera RAW*: RAW, DNG, CR2, CR3, NEF, ARW, RAF, ORF, RW2, PEF.
  - *Textures & Gaming*: DDS, KTX, KTX2, PVR.
  - *Scientific & HDR*: HDR (Radiance RGBE), EXR, FITS/FIT.
  - *Legacy & Open Source*: PPM, PGM, PBM, PNM, XBM, XPM, XCF, ORA, WPG.
  - *Documents & Subtitles*: PDF output, SRT, VTT, VCF, CSV.
- **18 Binary Encoders**: High-precision encoders for JPG, PNG, WebP, AVIF, BMP, TIFF, GIF, TGA, ICO, ICNS, DDS, PCX, PPM/PNM, SVG, PDF, QOI, and more.
- **Magic-Byte Anti-Spoofing (`FileSignatureService`)**: Analyzes initial bytes of every file to identify actual binary signature and reject spoofed extensions or malicious executables (`MZ`, `ELF`, `Mach-O`).

### 2. Dual-State User Experience
- **State 1: Minimal Hero Landing Dropzone**:
  - $100\text{vh} \times 100\text{vw}$ locked viewport with zero unnecessary page scrollbars.
  - Headline featuring reusable `<app-rotating-word>` component cycling through `JPG`, `WEBP`, `PNG`, `AVIF`, and `HEIC` using a slow, calm blur-fade crossfade.
  - Headline word width reservation ensuring zero horizontal layout jump.
  - Pauses cycle on hover or keyboard focus; reduced-motion safe.
  - 6-pill Popular Conversions grid (`PNG → JPG`, `JPG → WEBP`, `PNG → WEBP`, `HEIC → JPG`, `AVIF → PNG`, `WEBP → PNG`) synchronized with the hero rhythm.
  - Subtle full-screen drag-and-drop indicator overlay with media-focused artwork.
- **State 2: Studio 2-Column Workbench**:
  - In-place transition as soon as files are added — no page navigation or reload.
  - Left gallery with batch counter (`X/50`), `+ Add Images`, `Clear`, and responsive card deck.
  - Dedicated `Add More` tile with dashed border and center icon.
  - Right sidebar with full-height sticky layout, independent scrolling, and pinned CTA.

### 3. File Renaming System (Extension Locked & Enter-Only Commit)
- **Per-Card Inline File Renaming**:
  - Dedicated pencil button next to filename on each gallery card.
  - Opens an inline pill editor with auto-focus and pre-selected basename text.
  - File extension is permanently locked (`flex-shrink: 0; white-space: nowrap;`) and protected against accidental removal or change. Ellipsis is applied strictly to `.name-base`, guaranteeing the extension is always 100% visible.
  - **Commit Discipline**: Removing focus (`blur`) never saves or commits the rename. Renaming is confirmed strictly on `Enter` keypress or clicking the checkmark save button. Escape or clicking `✕` reverts changes.
- **Preview Modal Inline File Renaming & Extension Visibility**:
  - Dedicated pencil button in the preview dialog header.
  - Users can rename files while inspecting high-resolution image details.
  - Extension stays locked in Acklet Blue accent mono styling (`.filename-ext` with `flex-shrink: 0`). When title width is constrained, `.filename-base` truncates dynamically via CSS ellipsis, ensuring the extension is never hidden or clipped.
  - **Commit Discipline**: Removing focus (`blur`) cancels without renaming. Renaming commits exclusively on `Enter` keypress or clicking the checkmark button.
  - **Header Layout Protection**: Mode toggles (`Single | Compare`) are gracefully hidden during active editing to eliminate overlap with the rename pill and action buttons.
- **Smart Sidebar Accordion Logic**:
  - "Output filename" accordion in the right settings sidebar renders strictly when exactly 1 file is loaded (`engine.jobs().length === 1`).
  - Automatically hidden in multi-file batches to eliminate naming collisions, routing users to individual card/modal rename controls.

### 4. Interactive Responsive Preview Modal
- **Full Resolution Inspection**: High-definition image display with transparent checkerboard pattern confined only to images with true alpha transparency.
- **Interactive Split Slider Compare View**: Draggable before-and-after split slider with dual-layer rendering and live percentage clipping.
- **Clean 3-Column Footer Layout**:
  - Left: Clean size readout (`Size: 12.4 KB` when completed, or original size before conversion).
  - Center: Prominently centered dimensions badge (`footer-dim-badge`) showing clean converted dimensions (`width × height px`) with generous spacing and high contrast.
  - Right: Subtle keyboard hint (`Press Esc to close`).
  - Converted-Only Display: Completely stripped of redundant dimension diffs (`W1×H1 → W2×H2`), percentage deduction pills (`-82%`), and leftover layout clutter.
- **Document & Vector Previews**: Dedicated high-contrast PDF document viewer card with "Open PDF in new tab" button, and SVG text preview.

### 5. Quality & Dimension Workbench
- **Synchronized Quality Slider**:
  - Range $10\%$ to $100\%$ with mathematically synchronized thumb and track fill.
  - Interactive notch anchors: `10% (Small)`, `85% (Balanced)` positioned at true mathematical 83.33%, and `100% (Best)`.
  - Lossless format guard: Automatically disables lossy slider and explains lossless compression for PNG, BMP, TIFF, QOI.
- **Dimension Workbench**:
  - Proportional aspect ratio link toggle (`aspect-link-toggle`) with `lock` / `unlock` icons.
  - Dynamic aspect ratio calculation (`16:9`, `4:3`, `1:1`, etc.).
  - Side-by-side Width & Height pills with `px` suffix.
  - Presets dropdown with popular resolutions (`1920px Full HD`, `1280px`, `800px`, `50%`, `25%`, etc.).

### 6. Advanced Transformation Settings
- **Transform & Rotate**: 90° clockwise, 180°, 270°, Flip Horizontal, Flip Vertical.
- **Crop Aspect Ratios**: Free, 1:1 Square, 4:3 Standard, 16:9 Widescreen, 3:2 Photo.
- **Background & Transparency**: Transparent alpha retention or custom solid background color fill with swatch buttons and native RGB color picker circle.
- **DPI Injection**: Physical print resolution tagging (72, 96, 150, 300 DPI) with live physical inch and centimeter readouts.
- **Metadata Management**: Option to preserve original EXIF metadata, strip GPS location coordinates for privacy, or strip all metadata for minimal filesize.
- **Color Profile Conversion**: Color space tagging (`sRGB` vs `Display P3`).

### 7. Multi-Frame Animated Image Conversion Architecture
- **Genuine Multi-Frame Codec Pipeline**:
  - `WebpCodec.encodeAnimated`: Generates compliant Google Extended WebP containers with `VP8X` (animation flag `0x02`), `ANIM` control chunks (loop count + BGRA), and sequence of `ANMF` frame chunks (x, y, w-1, h-1, duration in ms, and bitstream subchunks).
  - `WebpCodec.decodeAnimated`: Decodes animated WebP containers into discrete frames with duration, disposal, and reconstructs standalone WebP blobs for hardware-accelerated playback and canvas processing.
  - `GifCodec.decode`: Collects all composited animation frames, disposal methods (leave, background, previous), delays ($\ge 20\text{ms}$), and extracts `loopCount` from Netscape 2.0 application extensions.
  - `GifCodec.encodeAnimated`: Encodes multi-frame looping Animated GIF with adaptive palettes per frame, `NETSCAPE2.0` infinite looping, and frame timing.
  - `ApngCodec.parseFrames`: Deconstructs APNG containers into `acTL`, `fcTL`, and `fdAT` streams with multi-frame compositing.
- **Conversion Matrix Enforcement**:
  - `GIF → WebP`: Genuine Animated WebP preserving all frames and delays.
  - `GIF → GIF`: Genuine Animated GIF with loop count and timing preserved.
  - `GIF → PNG / JPG`: High-fidelity static first frame exported, accompanied by automatic contextual transform note explaining that the target format does not support animation.
  - `APNG → WebP`: Multi-frame Animated WebP composited from APNG frames.
  - `Animated WebP → GIF`: Genuine multi-frame Animated GIF composited from WebP ANMF frames.
  - `Animated WebP → PNG`: Static first frame exported with notice.
  - `Static First Frame Mode`: When user selects "Static First Frame", exactly 1 frame is exported for any target format.
- **Strict Output Validation (`ImageOutputValidatorService.validateAnimationOutput`)**:
  - Automatically verifies output MIME type, container signatures (`GIF89a`, `RIFF...WEBP`), decodes the generated output, verifies actual frame count ($\ge 2$ when animation preserved, exactly $1$ when static first frame requested), verifies dimensions, delays ($\ge 20\text{ms}$), loop behavior, and motion changes.
- **Live Animated Preview**:
  - Preview modal renders the actual converted animated Blob URL (`image/webp` or `image/gif`), allowing native browser playback at true frame rates.

### 8. Centered Page Layout & Enhanced Toast System
- **Centered Empty-State Landing Page**:
  - Empty state container (`.converter-page-wrapper:not(.is-active-workspace)`) centers the headline with rotating word, `Select Images` CTA, subtitle, and popular conversion pills vertically and horizontally within `min-height: calc(100vh - 80px)`.
  - Balanced spacing above and below, eliminating awkward top-heavy clustering.
  - Retains the full 2-column workbench layout immediately when images are added.
- **Bottom-Center Compact Toast Notifications**:
  - Re-positioned from top-right to bottom-center fixed position: `bottom: max(28px, env(safe-area-inset-bottom, 28px)); left: 50%; transform: translateX(-50%);`.
  - Compact rounded pill design with small icon, concise message, and high-contrast dual-theme styling.
  - Smooth slide-up on entrance (`toastSlideUp`) and slide-down on exit (`toastSlideDown`).
  - Standardized display durations: $2.5\text{s}$ for Success & Info, $3.0\text{s}$ for Warning, $3.5\text{s}$ for Error.
  - Automatic deduplication prevents duplicate success toasts during batch conversions.
- **Preview Modal Transitions**:
  - Smooth 500ms entrance (`dialogPopIn 0.5s`, `backdropFadeIn 0.5s`) and 500ms dismissal (`dialogPopOut 0.5s`, `backdropFadeOut 0.5s`).
  - Modal blocks background interactions; closes cleanly on Escape or backdrop click.
  - Full memory cleanup of object URLs on modal teardown.
  - Reduced-motion accessibility compliance (`animation-duration: 0.01ms`).

### 9. Core Privacy & Differentiator Features (Implemented)

#### Feature 4: Visible Privacy Proof (`PrivacyAuditService`)
- **"Nothing uploaded" Trust Badges**:
  - Compact glass pill badge with green lock icon displayed in the idle hero dropzone area.
  - Smaller version integrated into the workspace toolbar (`stage-header-bar`) alongside the batch count badge.
- **Interactive Verification Popover**:
  - Clicking either badge opens a frosted-glass popover card explaining client-side execution: "Files are processed entirely inside your browser using modern WebAssembly & Web APIs. Images never leave your device and are never uploaded to any remote server."
  - **Live Network Request Counter**: Leverages browser `PerformanceObserver` filtered to page origin and active HTTP/HTTPS fetches (ignoring in-memory `blob:`, `data:`, and local resource protocols). Starts auditing when conversion starts, stops when finished, proving 0 requests made.
  - **Offline Capability Proof**: Dynamically verifies whether the Service Worker or CacheStorage app shell is cached (`checkOfflineReadiness()`). When verified, displays the authentic helpline: *"Offline test: Turn off Wi-Fi and convert. It still works."* If not verified, does not make unsubstantiated claims.
- **Unit Test Coverage**: `privacy-audit.service.spec.ts` (7 tests covering origin filtering, counter resets, start/stop auditing, and offline check).

#### Feature 1: Target File Size / Auto-Quality (`ImageConversionAdapter.searchOptimalQuality`)
- **Auto-Fit Target Size Input**:
  - User can toggle "Target File Size" and specify an exact threshold (e.g. `under 200 KB` or `2 MB`).
  - Unit toggle selector between `KB` and `MB`.
  - When enabled, manual quality slider is disabled and displays `AUTO-FIT` with `≤ [target] [unit]`.
- **Binary Search Quality Algorithm**:
  - For lossy formats (`WebP`, `JPG`, `AVIF`), performs binary search across quality levels 10% to 100% (~7 iterations).
  - Finds the highest quality setting whose byte size fits $\le$ target bytes.
  - Multi-file batches run search per file, reporting live progress: *"Fitting 3 of 12..."*.
  - Unreachable targets: If even minimum quality 10% exceeds the target size, raises an explicit warning: *"Can't reach 200 KB at this format. Smallest possible: 240 KB. Try a smaller resize or another format."* without silently exceeding.
  - Lossless format handling: Formats like `PNG`, `BMP`, `TIFF`, `GIF` skip auto-quality and clearly explain: *"Target size auto-quality applies to lossy formats. Lossless formats preserve full fidelity."*
  - Card readout: Each completed file card displays its final size and quality used (e.g. `182 KB · Q 74%`).
- **Unit Test Coverage**: `image-auto-quality.spec.ts` (4 tests covering optimal passing quality, unreachable warning state, byte formatting, and lossless format skipping).

#### Feature 3: Smart Format Suggestion (`ImageAnalyzerService`)
- **Client-Side Image Analysis**:
  - Downsamples images to a 64×64 offscreen thumbnail.
  - Samples alpha channel across all 4,096 pixels to detect transparency (`alpha < 255`).
  - Computes 15-bit quantized color histogram and color entropy to distinguish photos from flat graphics, logos, and screenshots.
  - Caches analysis on the job (`job.smartAnalysis`).
- **Recommendation Rules**:
  - *Alpha present (graphic or photo)*: Suggests `WebP` — *"Has transparency. WebP keeps it at a smaller size."*
  - *No alpha, photo*: Suggests `WebP` — *"Photo with no transparency. WebP is usually much smaller than PNG."*
  - *No alpha, graphic or screenshot*: Suggests `PNG` — *"Flat colors and sharp edges. PNG keeps them crisp."*
  - *Already in suggested format*: Shows nothing ("show nothing when already matched").
- **Inline Suggestion Banner**:
  - Displayed directly above target format picker with reason text, "Apply" button (or "Apply to all" for batches), and session-remembered dismiss (`x`) button.
- **Unit Test Coverage**: `image-analyzer.service.spec.ts` (5 tests covering all recommendation rules, alpha detection, and match omission).

#### Feature 2: Multi-Format Comparison Before Converting (`FormatComparisonService`)
- **Instant 4-Tile Comparison Modal**:
  - Accessible via "Compare" pill button on single queued or completed image cards.
  - Parallel background encoding into `WebP`, `AVIF`, `PNG`, and `JPG` at current quality and resize settings.
  - Displays 4 comparison tiles with live thumbnail, format name, size in KB/MB, and size delta vs original (e.g. `-62%`).
- **Badging & Browser Support**:
  - Tile with the lowest byte size receives the green *"Smallest"* badge.
  - Tiles that fit within user target size receive the blue *"Fits target"* badge.
  - Probes browser AVIF encoding support via `isAvifEncodingSupported()`; gracefully shows *"Not supported in this browser"* if unavailable.
  - Skeletons displayed while tiles encode asynchronously.
  - In-memory cache keyed by `(fileId, format, quality, resize)` enables instant reopening.
  - "Use This" button on each tile sets the global target format and dismisses the modal.
- **Unit Test Coverage**: `format-comparison.service.spec.ts` (4 tests covering deterministic cache keys, tile badge computation, fits-target logic, and unsupported encoder handling).

### 10. Performance, Testing & Reliability
- **Silky-Smooth 60FPS UI**: Hardware-accelerated GPU layer rendering (`transform: translateZ(0)`), containment of offscreen popovers (`display: none`), and isolated scroll containers eliminating scroll lag.
- **Dual-Theme High Contrast**: Comprehensive light and dark theme variable support (`var(--ts-*)`, `var(--text-*)`, `var(--border-*)`) meeting WCAG AA $\ge 4.5:1$ contrast standards.
- **Reactive Re-Conversion**: Modifying settings on completed items automatically triggers live re-conversion with 250ms debounce.
- **161 Passing Vitest Unit Tests**: Complete test coverage across codecs, privacy audit, auto-quality search, smart format analysis, format comparison, and UI components (expanded from 141 baseline).
- **Production Build Verified**: Passes Level A verification (`node scripts/verify.mjs -A`) and Angular CLI production compilation (`ng build tool-file-converter`).

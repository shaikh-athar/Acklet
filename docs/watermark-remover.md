# Acklet Watermark Remover — Architecture & Technical Reference

## 1. Overview
- **Tool Slugs**: `watermark-remover`, `watermark`
- **Subdomains**: `watermark-remover.acklet.com`, `watermark.acklet.com` (locally: `watermark-remover.localhost:4200`)
- **Category**: `Images`
- **Execution Mode**: 100% In-Browser, Ephemeral & Client-Side (`executionMode: 'browser'`)
- **Core Philosophy**: Authentic exemplar inpainting, multi-type watermark detection, and measurable quality evaluation. Zero fake simulated filters, zero remote image storage, zero privacy leaks.
- **Related Specs & Architecture**:
  - [Standalone Tool Architecture](standalone-tool-architecture.md)
  - [Subdomain Routing Setup](subdomain-routing-setup.md)
  - [Image Converter Documentation](image-converter.md)
  - [Universal File Converter Documentation](file-converter.md)
  - [UI Design System](ui-design-system.md)
  - [Responsive Design System](responsive-design-system.md)

---

## 2. Image Ingestion & Validation

Watermark Remover accepts raster image formats and enforces strict validation boundaries:

### Supported Formats:
- **JPEG / JPG** (`image/jpeg`)
- **PNG** (`image/png`)
- **WebP** (`image/webp`)

### Ingestion Methods:
1. **Drag-and-Drop**: Localized drop card on the empty state, or full-window drag overlay from anywhere in the browser viewport.
2. **File Browser**: Native file dialog with MIME/extension filters.
3. **Clipboard Image Paste**: Native `paste` listener on `window` supporting screenshot pasting via `⌘V` / `Ctrl+V`.
4. **1-Click Built-in Samples**: Instant test assets with realistic text, stamp, and grid watermarks (`Coastal Sunset`, `Abstract Studio`, `Minimalist Architecture`).

### Validation Boundaries:
- **Max File Size**: 50 MB (`MAX_FILE_SIZE_BYTES = 52,428,800`)
- **Max Edge Dimension**: 8,192 px (`MAX_EDGE_DIMENSION = 8192`)
- **Max Total Pixels**: 64,000,000 pixels (decompression bomb safeguard)
- **Zero Empty Files**: Rejects 0-byte or corrupted image streams with user-facing alerts.

---

## 3. Intelligent Watermark Detection (Phase 3)

The smart detection engine (`WatermarkDetectorService`) automatically scans images for various watermark types, assigns measurable confidence scores, bounds distinct regions, and allows user refinement prior to removal:

### 3.1 Watermark Classification Taxonomy
- **Text-Based Watermarks**: Characterized by high horizontal frequency, distinct baseline / character heights, and sharp contrast against backgrounds.
- **Logo / Stamp Watermarks**: Circular, square, or vector-like glyph shapes with compact localized gradient magnitude.
- **Transparent & Semi-Transparent Watermarks**: Faint alpha-blended overlay stamps detected via normalized gradient energy and local dynamic range variance.
- **Corner-Positioned Watermarks**: Frequent timestamp, copyright, and channel watermark positions (top-left, top-right, bottom-left, bottom-right).
- **Repeated & Tiled Watermarks**: Multi-block periodic variance clusters covering repeating stock agency watermarks.
- **Diagonal Watermarks**: Slanted text lines running across images at $\approx 30^\circ$ to $60^\circ$ orientation detected via directional gradient kernels.

### 3.2 Detection Sensitivity
Users can adjust the sensitivity threshold via the toolbar:
- **Low**: Requires higher gradient contrast and block variance. Optimal for busy, high-frequency natural scenes to prevent false positives.
- **Medium (Default)**: Balanced threshold detecting standard text banners, stamps, and corner logos.
- **High**: Sensitive threshold capable of capturing faint, semi-transparent watermark overlays.

### 3.3 Confidence Scoring & Region Grouping
- Each candidate region is bounded by a `RectSelection` and assigned an objective confidence score ($0-100\%$) based on edge density, location weight, and directional coherence.
- Regions are displayed in the floating workspace strip with tags (e.g. `Corner Stamp (92%)`, `Text Watermark (88%)`), allowing users to review, resize handles, delete unwanted regions, or paint additional strokes before confirming removal.
- **User Confirmation Guarantee**: Uncertain regions are never removed automatically without user review.

---

## 4. Advanced AI Inpainting & Adaptive Processing (Phase 3)

The core inpainting engine (`InpaintingEngineService`) reconstructs background textures using adaptive structure-aware exemplar synthesis and Poisson/biharmonic gradient blending:

### 4.1 Multi-Scale Structure-Aware Inpainting (Coarse-to-Fine Pyramid)
For large or complex watermarks:
1. **Coarse Structural Guidance**: Downsamples image and mask by $2\times$ or $4\times$, diffusing boundary gradients inward across multiple iterations to establish global background color and luminance flow.
2. **Structure-Guided Boundary Priority (Criminisi + Fast Marching)**:
   Computes isophote directions (orthogonal to gradient $\nabla I^\perp$) along the boundary:
   $$\text{Priority}(p) = C(p) \cdot \left(1.0 + |\nabla I^\perp(p)| \cdot 0.02\right)$$
   Structural edges (horizons, architectural lines, continuous contours) receive top priority and propagate through the hole first before flat textures fill in.
3. **High-Resolution Patch Matching**: Searches candidate donor regions with normalized Sum of Squared Differences ($SSD$), penalized by spatial distance and coarse structural guidance:
   $$\text{Cost} = \frac{SSD}{|\Psi_p|} + \lambda \cdot \text{dist}(\text{target}, \text{donor}) + \gamma \cdot \text{diff}(\text{structuralGuide}, \text{donor})$$

### 4.2 Adaptive Processing Modes
- **Fast**: Compact $7 \times 7$ patch radius, $32\text{px}$ search window, single smoothing pass. Optimized for small timestamps and corner logos ($< 1.5\%$ image area).
- **Balanced (Default)**: $9 \times 9$ patch radius, $48\text{px}$ search window, multi-scale structural guidance on large masks, dual bilateral smoothing passes.
- **Ultra-Quality**: $11 \times 11$ patch radius, $64\text{px}$ search window, full multi-scale pyramid synthesis, triple edge-preserving bilateral passes.

### 4.3 Seamless Bilateral Seam Blending
- An edge-preserving bilateral smoothing filter refines the boundary seam between the newly synthesized patch and the untouched background to prevent color steps, boundary lines, or halos.

### 4.4 Cumulative Non-Destructive Inpainting
- Pristine uploaded image (`pristineImageData`) is preserved throughout the session.
- Successive inpainting operations composite into `cumulativeProcessedImageData`.
- Previously cleaned areas remain intact when a user selects and cleans an additional watermark elsewhere on the canvas.

---

## 5. AI Inpainting Model Evaluation & Comparison

Open-source inpainting models were evaluated against production requirements:

| Model Architecture | Strengths | Limitations | GPU / RAM Footprint | Licensing & Deployment | Fit for Acklet |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **LaMa (Large Mask Inpainting)** | Fast Fourier Convolutions (FFCs); exceptional structural and repetitive texture completion; wide receptive field | Can struggle on high-resolution text semantics without vector rasterization | Moderate (~1.5 GB VRAM / ~800 MB RAM); runnable via ONNX Runtime WebAssembly | Apache-2.0; excellent commercial permissibility | **Strongest Neural Candidate** (for optional serverless ONNX offloading) |
| **MAT (Mask-Aware Transformer)** | High fidelity on complex non-repetitive organic structures (faces, nature) | High latency on large images; heavy self-attention memory scaling | High (4+ GB VRAM); unsuitable for pure browser execution | Academic / Research; non-trivial deployment | Secondary reference |
| **ZITS (Structure-Aware Inpainting)** | Dual-stream transformer explicitly completing lines and edge sketches before color fill | Complex multi-stage pipeline; slow inference (~2-5s per 512px tile) | High (3+ GB VRAM) | Research-oriented; complex weights management | Specialized edge reference |
| **Stable Diffusion Inpainting (SD-Inpaint)** | High creative generation capacity; fills arbitrary contexts | Hallucinates unintended objects; destroys authentic background fidelity; slow (~4-8s); high compute cost | Very High (4-8 GB VRAM); requires dedicated GPU server | Creative Commons / OpenRAIL | Unsuitable for authentic watermark removal |
| **Acklet Multi-Scale Biharmonic Engine (Integrated)** | **100% Client-Side; zero server dependency; zero cloud cost; bit-exact fidelity on unmasked pixels; instant response (<300ms)** | Complex semantic synthesis (e.g. recreating a hidden human face) requires neural fallback | **Zero GPU requirement; <50 MB RAM; runs natively in browser** | **Proprietary Acklet Engine (100% open internally)** | **Primary Production Engine** |

---

## 6. Objective Quality Measurement (Phase 3)

The quality evaluation engine ([`QualityEvaluatorService`](file:///Users/ayaz/Acklet/client/apps/tool-watermark-remover/src/services/quality-evaluator.service.ts)) measures real, objective post-reconstruction metrics:

1. **Boundary Continuity Index ($60-100\%$)**: Measures gradient continuity across the 1px boundary seam between inpainted pixels and surrounding donor pixels compared against background variance.
2. **Color Inconsistency Delta ($\Delta \text{Color}$)**: Mean Euclidean distance in RGB color space between the border of the reconstructed area and adjacent donor pixels. Values $< 5.0$ indicate seamless color transitions.
3. **Residual High-Frequency Energy Ratio**: Measures Laplacian energy inside the inpainted zone to verify that sharp watermark edges have been cleanly suppressed.
4. **Overall Quality Score ($0-100\%$) & Rating**:
   - `Excellent` ($\ge 90\%$): Seamless gradient and color match.
   - `Good` ($75-89\%$): Natural visual reconstruction with minor texture variation.
   - `Fair` ($60-74\%$): Acceptable removal; user may benefit from "Retry (Ultra)".
   - `Poor` ($< 60\%$): Incomplete removal or color mismatch.

The measured score and processing time are displayed directly in the comparison toolbar with a 1-click **"Retry (Ultra)"** action.

---

## 7. Advanced Selection & Canvas Workspace

- **Precision Brush (`B`)**: Continuous freehand painting in native image pixel coordinates with round line joins and caps. Circle indicator on overlay reflects exact brush diameter at current zoom.
- **Eraser (`E`)**: Destination-out eraser for erasing unwanted portions of the selection mask.
- **Interactive Rectangle (`R`)**: Dynamic bounding box selection with 8 interactive resize handles (`nw`, `n`, `ne`, `e`, `se`, `s`, `sw`, `w`) and body-drag repositioning.
- **Hand / Pan (`H` or `Spacebar`)**: Drag to pan across the workspace at any zoom level.
- **Cursor-Centered Zooming (25% to 500%)**: Mouse-wheel scrolling keeps the pixel directly beneath the cursor stationary on the screen.
- **Selection Overlay Opacity**: Variable transparency slider (20% to 100%, default 65%).

---

## 8. Comparison & Preview Experience

- **Split Viewport Slider**: Draggable vertical divider with high-contrast thumb handle and a "Center (50%)" reset button.
- **Synchronized Side-by-Side**: Dual viewports with synchronized real-time zoom and pan for comparing fine textures.
- **Full-Screen Preview**: 1-click toggle (`maximize-2` / `minimize-2`) to inspect inpainting seams at full scale.
- **"Hold for Original" Peek**: Press-and-hold button to momentarily reveal the watermarked original image.
- **Quality Score Pill**: Shows real measured score (e.g. `96% Quality (210ms)`) with detailed tooltip breakdown.

---

## 9. Workflow Safety & Confirmations

- **Unsaved Edits Protection**: Clicking "Replace Image" or "Reset Original" while having active selections or inpainting results triggers an accessible confirmation dialog modal ([`ConfirmModalComponent`](file:///Users/ayaz/Acklet/client/apps/tool-watermark-remover/src/components/confirm-modal/confirm-modal.component.ts)) preventing accidental data loss.
- **Complete Revert**: User can revert to the pristine original at any time with one click.

---

## 10. Keyboard Shortcuts Reference

| Shortcut | Action | Scope |
| :--- | :--- | :--- |
| `B` | Activate Brush tool | Editor |
| `R` | Activate Rectangle selection tool | Editor |
| `E` | Activate Eraser tool | Editor |
| `H` | Activate Hand / Pan tool | Editor |
| `Space` (Hold) | Temporary Hand / Pan tool | Editor |
| `[` / `]` | Decrease / Increase brush size | Editor |
| `⌘Z` / `Ctrl+Z` | Undo last selection/stroke | Editor |
| `⇧⌘Z` / `Ctrl+Shift+Z` | Redo undone selection/stroke | Editor |
| `Delete` / `Backspace` | Delete active watermark region | Editor |
| `⌘0` / `Ctrl+0` | Fit image to screen | Editor |
| `⌘1` / `Ctrl+1` | Reset zoom to 100% | Editor |

---

## 11. Export & Download

| Format | MIME Type | Quality Options | Characteristics |
| :--- | :--- | :--- | :--- |
| **PNG** | `image/png` | Lossless | Best for graphics, sharp edges, and transparency |
| **JPG** | `image/jpeg` | 70% to 100% (default 92%) | Best for photographs; white background composite |
| **WebP** | `image/webp` | 70% to 100% (default 90%) | Modern web format with high compression efficiency |

- **Resolution**: Exactly matches original image dimensions ($W \times H$).
- **File Naming**: Defaults to `[original-name]-cleaned.[ext]`.
- **Direct Download**: Triggers standard browser download via ephemeral Object URLs.

---

## 12. Security & Zero-Storage Guarantee
- **Client-Side Processing**: All image processing and inpainting execute ephemerally within the browser runtime.
- **Zero Remote Persistence**: No images or masks are sent to external storage buckets, databases, or third-party cloud APIs.
- **Memory Cleanup**: Object URLs and temporary canvases are revoked and cleared immediately after processing or download.

---

## 13. Batch Processing Workspace (Phase 4)

The batch processing workspace empowers users to upload, auto-detect, customize, process, and bulk-download multiple images simultaneously while safeguarding system resources and preserving ephemeral privacy.

### 13.1 Architecture & Managed Concurrency Queue
- **Managed Queue Engine** ([`BatchProcessorService`](file:///Users/ayaz/Acklet/client/apps/tool-watermark-remover/src/services/batch-processor.service.ts)): Controls state and execution transitions (`pending` $\to$ `detecting` $\to$ `detected` $\to$ `processing` $\to$ `completed` / `failed`).
- **Concurrency Guard**: Caps concurrent inpainting tasks at `MAX_CONCURRENT_BATCH_JOBS = 2`. This guarantees the browser main thread remains smooth, responsive to user inputs, and bounded against memory spikes when bulk processing high-resolution assets.
- **Lightweight Memory Management**: Generates downscaled thumbnail representations (max $180\text{px}$) for grid/list rendering while deferring full-resolution canvas allocation until an individual job runs. Ephemeral `blob:` object URLs are automatically revoked upon item removal or queue disposal.
- **Partial Failure Resilience**: If an individual image fails (e.g. corrupted header or memory exhaustion), its status is flagged as `failed` with a descriptive error message and 1-click retry option, while all remaining images in the queue continue processing uninterrupted.

### 13.2 Batch Workflows
1. **Workflow A — Automatic Batch Removal**:
   - User drops multiple images into the workspace.
   - Batch engine scans each asset with `WatermarkDetectorService` at chosen sensitivity (`low`, `medium`, `high`).
   - Candidate watermarks are highlighted on card thumbnails with confidence ratings and region counts.
   - User clicks **"Start Batch Removal"**; all eligible images are reconstructed using the selected inpainting engine (`fast`, `balanced`, `ultra`).
2. **Workflow B — Customized Batch Removal**:
   - User clicks **"Edit Mask"** on any queued batch card.
   - Transitions into the precision Phase 2/3 canvas workspace with full brush, eraser, rectangle selection (8 resize handles), undo/redo, and zoom/pan.
   - User tailors the watermark mask for that specific asset and clicks **"Save to Batch"**.
   - The custom mask is saved directly to that `BatchItem`, and the user returns to the dashboard to execute the batch.

### 13.3 Shared Processing Configuration
- **Auto-Detect Watermarks**: Global toggle controlling whether unscanned items receive automatic multi-type AI detection.
- **Sensitivity Threshold**: Global `Low` / `Medium` / `High` selector adjusting gradient variance thresholds across the batch.
- **AI Engine Mode**: `Fast` (speed-optimized) | `Balanced` (default) | `Ultra` (multi-scale pyramid synthesis).
- **Export Configuration**: Global output format (`PNG`, `JPG`, `WebP`) and compression quality ($70-100\%$).

### 13.4 Batch Results & Bulk ZIP Export
- **Dual View Layouts**: Instant switching between responsive **Grid View** (visual cards with before/after cleaned indicators) and **List View** (compact table for dense queues).
- **Bulk ZIP Packaging** ([`ZipExportService`](file:///Users/ayaz/Acklet/client/apps/tool-watermark-remover/src/services/zip-export.service.ts)):
  - Built-in browser-based ZIP compression via `JSZip` using `DEFLATE` level 6.
  - Collision-Free File Naming: Identical filenames are resolved cleanly (e.g. `banner-cleaned.png`, `banner-cleaned-1.png`).
  - Progress Tracking: Reports real-time compression progress ($0-100\%$).
  - Selective Export: Supports downloading all completed items or only specifically checked items.
- **Individual Downloads**: Each completed card provides a direct 1-click single image download option.

---

## 15. Professional Image Restoration (Phase 5)

Phase 5 elevates the Acklet Watermark Remover to a professional-grade image restoration suite capable of high-resolution processing up to 8K, intelligent face and subject preservation, natural transparent alpha reconstruction, seamless tiled inpainting, and metadata preservation.

### 15.1 Advanced Restoration & Processing Modes
The inpainting engine provides four distinct restoration profiles tailored to image resolution and texture complexity:

1. **Standard Mode** (`standard` / `balanced`):
   - Optimized for fast, balanced background reconstruction.
   - Dual-pass bilateral smoothing along inpainting boundaries.
2. **High-Quality Mode** (`high-quality` / `ultra`):
   - Multi-scale coarse-to-fine Gaussian pyramid with 3-pass biharmonic smoothing.
   - Fine gradient synthesis for continuous gradients (skies, studio backdrops, walls).
3. **Detail Preservation Mode** (`detail-preservation`):
   - High-frequency micro-texture matching and sensor grain injection ($\pm 1-2$ values) to prevent the artificial, waxy blur typical of basic exemplar synthesis.
   - Strict structural contour prioritization preserving high-contrast object silhouettes.
4. **Large Image (Tiled 8K) Mode** (`large-image`):
   - Patch-based tiled inpainting for assets up to 8,192 px.
   - Eliminates out-of-memory crashes on mobile and resource-constrained browser tabs.

### 15.2 High-Resolution Tiled Inpainting & Seam-Free Blending
- **Tile Planning & Clean Tile Skipping** ([`TiledInpaintingService`](file:///Users/ayaz/Acklet/client/apps/tool-watermark-remover/src/services/tiled-inpainting.service.ts)):
  - Divides high-resolution canvases into $512 \times 512\text{px}$ tiles with a $64\text{px}$ overlap border.
  - **Tile Skipping**: Scans the binary mask within each tile bounding box. If zero mask pixels are detected, inference is skipped entirely, keeping memory and CPU consumption proportional only to the actual watermark footprint.
- **Seam-Free Hann Window Blending**:
  - Overlapping tile boundaries are blended using a 2D separable raised-cosine (Hann) feathering window:
    $$w(d) = 0.5 \cdot \left(1 - \cos\left(\frac{\pi d}{\text{overlap}}\right)\right)$$
  - Prevents visible grid lines, stitching seams, or luminance steps across tile seams.

### 15.3 Face & Subject Detail Preservation (Protected Regions)
- **Automatic Face & Skin Locus Detection** ([`SubjectProtectionService`](file:///Users/ayaz/Acklet/client/apps/tool-watermark-remover/src/services/subject-protection.service.ts)):
  - Analyzes normalized RGB and YCbCr chromaticity distributions to detect skin tones and subject silhouettes:
    $$R > 95,\quad G > 40,\quad B > 20,\quad \max(R,G,B) - \min(R,G,B) > 15,\quad |R - G| > 15,\quad R > G,\quad R > B$$
    $$135 < \text{Cr} < 180,\quad 85 < \text{Cb} < 135$$
  - Clusters skin loci into spatial bounding regions and detects proximity to watermarks.
- **Manual Subject Protection Tool**:
  - Users can activate the **Protect** tool (shortcut `P`) to paint emerald green protection masks over delicate facial features, jewelry, or critical foreground subjects.
- **Hard Immunization Guarantee**:
  - Inpainting strictly excludes protected pixels prior to synthesis:
    $$\text{mask}[p] = 0 \quad \text{if} \quad \text{protected}[p] = 1$$
  - All protected pixels remain 100% bit-exact original with guaranteed zero drift.

### 15.4 Transparent Image Support (Alpha Channel Reconstruction)
- Transparent PNG and WebP assets are automatically recognized via full-buffer alpha scanning (`src[i + 3] < 250`).
- Alpha channels are preserved and blended during patch copying and fallback diffusion, rather than hardcoding opaque alpha ($255$).
- Transparent cutouts, stickers, and UI graphics retain transparent backgrounds without unwanted solid white or black fills.

### 15.5 EXIF & Camera Metadata Preservation
- Pure client-side TypeScript EXIF parser ([`MetadataPreservationService`](file:///Users/ayaz/Acklet/client/apps/tool-watermark-remover/src/services/metadata-preservation.service.ts)) extracts the APP1 segment (`0xFFE1`) from original JPEG streams and injects it into the synthesized export blob without third-party dependencies.
- Camera model, lens metadata, capture timestamp, and orientation tags are preserved intact.

### 15.6 Image Quality Validation & Difference Heatmap
- **Inspect Changes Mode**:
  - High-contrast visual heatmap highlights modified pixels in vivid cyan/magenta against a dimmed monochrome representation of the untouched background.
- **Unmasked Pixel Drift Guarantee**:
  - Objective verification guarantees that unmasked pixels outside the watermark region have an unmasked drift of exactly $0$.
- **Honest Telemetry Guidelines**:
  - UI telemetry displays boundary continuity and color consistency percentages as objective structural metrics, clearly advising users to inspect visually before final export.

---

## 16. Verification & Test Suite

```bash
# Level A Checks (Fast Type, Glass, Isolation & Java Compilation)
node scripts/verify.mjs -A

# Level B Checks (Feature Verification & Production Build)
node scripts/verify.mjs -B

# Watermark Remover Full Test Suite (83 tests across 17 suites)
cd client && npx vitest run apps/tool-watermark-remover

# Monorepo Scope Validation
npm run check:scope -- tools
```

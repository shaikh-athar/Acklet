# File Converter — System Specification & Architecture

## Overview
- **Tool Slug**: `file-converter`
- **Name**: `File Converter`
- **Sidebar & Breadcrumb Label**: `File Converter`
- **Heading**: `File Converter`
- **Subdomain**: `file-converter.acklet.com` (locally: `file-converter.localhost:4200`)
- **Direct Route**: `/tools/file-converter`
- **Conversion-Specific Routes**: `/convert/:pair` (e.g., `/convert/png-to-webp`, `/convert/srt-to-vtt`, `/convert/vcf-to-csv`, etc.)
- **Status**: Production Live
- **Requires Backend**: `false` (100% Client-Side)
- **Accent Color**: `indigo` (`#6366F1` dark / `#4F46E5` light, hue: 242)

## Tool Separation & Isolation
- **Independent Identity**: Completely separated from `Image Converter`.
- **Registry Manifests**:
  - `FILE_CONVERTER_MANIFEST` for File Converter (`file-converter`, `converter`).
  - `IMAGE_CONVERTER_MANIFEST` for Image Converter (`image-converter`, `img-converter`).
- **No Shared Overwrite**: Each tool maintains its own distinct routes, page headings, breadcrumbs, and metadata.

## Landing Page Redesign
Inspired by the clean simplicity and focused visual hierarchy of modern utilities (such as iLoveIMG/iLovePDF):
1. **Centered Minimal Hero**: Open, airy layout with generous whitespace and zero decorative clutter.
2. **Typography**: Clean `File Converter` heading and a natural description: `"Convert files between popular formats quickly and securely."`
3. **Primary Action**: Prominent `Select Files` button with explicit `#FFFFFF` text/icon contrast in default, hover, active, focus, and disabled states.
4. **Drag & Drop**: Small instruction `"or drop files here"`. Full-screen drop overlay activates only when files are actively dragged over the viewport.
5. **Subtle Supported Formats**: Compact row listing implemented categories: `Images (PNG, JPG, JPEG, WebP, AVIF, SVG, BMP, TIFF, TGA, ICO, PSD, Camera RAW, HDR, FITS) · Subtitles (SRT, VTT) · Contacts (VCF, CSV) · PDF Output`.
6. **Universal Image Engine**: For complete architecture, codec implementations, format matrix, and accuracy safeguards, see [Image Converter Documentation](image-converter.md).
7. **Contextual Validation**: No permanent upload limit chips. Files exceeding limits (e.g. 50 MB) trigger friendly contextual alert banners at upload time.
8. **Conversion Trade-off Warnings**: Contextual notices in the options sidebar explain feature changes (e.g., transparency loss on JPG, SDR tone mapping on HDR/FITS, Photoshop layer merging).

## Workspace State & Features
- **Left Stage**: Card grid showing file names, sizes, detected magic-byte formats, status, and removal triggers. Features smooth 0.5s entry and exit animations. Non-native browser formats (TGA, TIFF, PSD) utilize rendered raster preview URLs to ensure high-fidelity previews without broken icons, and PDF targets display a dedicated high-contrast document card view.
- **Multi-Frame Animated Conversion**: Genuine multi-frame encoding and decoding between GIF and WebP via `WebpCodec` and `GifCodec`, preserving frame delays, loop count, and disposal methods. Output animation formats display live animated previews and are validated through strict binary inspection.
- **Per-Card Inline File Renaming**: Dedicated pencil button on each card allowing inline renaming with the extension permanently locked and protected.
- **Preview Modal**: Full-screen dialog with zoom/pan, before/after compare slider, header inline rename button (locked extension), 500ms smooth pop-in and dismissal transitions, and a clean 3-column footer with centered converted dimensions (`width × height px`).
- **Centered Empty-State Layout**: Centered viewport layout (`min-height: calc(100vh - 80px)`) balancing headline with rotating word, action button, and popular conversion pills without top-heavy clutter.
- **Bottom-Center Toast Notifications**: Compact, high-contrast bottom-center toast notification system with deduplication, standard timings (2.5s success/info, 3s warning, 3.5s error), and smooth entrance and exit animations.
- **Right Sidebar**: Full-height desktop workspace sidebar (`calc(100vh - 100px)`) with independent card scrolling, pinned action buttons, context-sensitive settings (format selection, synchronized quality slider/presets for lossy formats, lossless format guard, image resize, and single-file output filename accordion).
- **Performance & Motion**: Hardware-accelerated GPU layer rendering (`transform: translateZ(0)`), zero-lag 60fps scrolling, and full `prefers-reduced-motion` compliance.

## Global Drag-and-Drop Overlay (Frosted Glass & Media Focus)
- **ChatGPT-Inspired Frosted Blur**: Replaced old dashed container modals and format chip clusters with a translucent, full-screen frosted glass backdrop (`backdrop-filter: blur(24px)`).
- **Media & Image Focused Visual Center**: Layered card stack in the center featuring an accent-tinted backdrop card and a front vibrant accent card with a crisp white media/photo frame SVG icon.
- **Clear Copy**: Heading `"Add images & media"` with subtitle `"Drop files here to convert instantly"`.
- **Zero-Stuck Lifecycle & Dismissal**:
  - Drops directly on the overlay or anywhere on the window automatically set `dragCounter = 0` and reset `isGlobalDragging` to `false`.
  - Escape key listener and overlay click listeners allow instantaneous dismissal.
  - Viewport boundary detection in `window:dragleave` automatically resets dragging when the cursor exits the window.
  - Dropzone event handlers in `DropzoneComponent` clear dragging and do not swallow drop events.

## Verification & Test Coverage
- **Unit Tests**: 141 tests passing across 9 test suites (`cd client && npx vitest run apps/tool-file-converter`).
- **Monorepo Runner**: `node scripts/verify.mjs -A` passing.
- **Production Build**: Clean compilation with `npm --prefix client run build -- tool-file-converter`.

## Related Documents
- [Image Converter Complete Specification & Architecture](image-converter.md)
- [Tool Readme](../client/apps/tool-file-converter/README.md)
- [Third Party Notices & Commercial Licensing Review](third-party-notices.md)
- [Java Image Processing Evaluation (Future Backend Reference)](java-conversion-evaluation.md)
- [Standalone Tool Architecture](standalone-tool-architecture.md)

---

# Multi-Format File Converter Architecture & Specification

The **File Converter** module provides high-fidelity, structure-aware document transformation across structured documents, spreadsheets, presentations, plain text, and visual outputs for the Acklet platform.

Related Documentation:
* [Standalone Tool Architecture](standalone-tool-architecture.md)
* [UI Design System](ui-design-system.md)
* [Verification Guide](verification-guide.md)
* [Third-Party Notices](../THIRD-PARTY-NOTICES.md)

---

## 1. System Architecture

```mermaid
flowchart TD
    Client["Client UI (tools/file-converter)"] -->|Capabilities & Jobs| Gateway["API Gateway / Controller"]
    
    subgraph BrowserRuntime ["Browser Runtime (Web Worker)"]
        Client -->|On-Device Target| WebWorker["Client Web Worker"]
        WebWorker -->|Local Blob + Shield Note| Client
    end

    subgraph ServerRuntime ["Server Runtime (Reliability Queue Pipeline)"]
        Gateway -->|Server Target| QueuePublisher["Message Producer"]
        QueuePublisher -->|Publish| ConvertExchange["Direct Exchange: fc.convert"]
        
        ConvertExchange -->|fc.convert.office| OfficeQueue["Office Queue (concurrency: 2)"]
        ConvertExchange -->|fc.convert.pdf| PdfQueue["PDF Queue (concurrency: 4)"]
        ConvertExchange -->|fc.convert.image| ImageQueue["Image Queue (concurrency: 8)"]
        ConvertExchange -->|fc.convert.text| TextQueue["Text Queue (concurrency: 8)"]
        
        OfficeQueue --> Worker["Conversion Worker"]
        PdfQueue --> Worker
        ImageQueue --> Worker
        TextQueue --> Worker
        
        Worker -->|Failure / Retryable| RetryExchange["fc.retry"]
        RetryExchange -->|Attempt 1| Retry5s["fc.retry.5s (TTL 5000ms)"]
        RetryExchange -->|Attempt 2| Retry30s["fc.retry.30s (TTL 30000ms)"]
        RetryExchange -->|Attempt 3| Retry120s["fc.retry.120s (TTL 120000ms)"]
        Retry5s -->|Dead-letter replay| ConvertExchange
        Retry30s -->|Dead-letter replay| ConvertExchange
        Retry120s -->|Dead-letter replay| ConvertExchange
        
        Worker -->|Permanent Error or Retries Exhausted| DLQ["Dead Letter Queue: fc.dlq"]
        Worker -->|SSE Updates| SseEmitter["Server-Sent Events /jobs/{id}/events"]
        SseEmitter --> Client
    end
```

### Architectural Principles
* **Two Runtimes, One Single Registry**: A centralized registry governs all capabilities. Conversions run either directly on-device in a background Web Worker (zero server uploads) or across resilient server queues with manual acknowledgments.
* **Corpus-Verified Testing Only**: A pair appears in the user interface **only** when marked `status: "tested"` backed by passing automated corpus or integration tests. Untested or planned pairs remain hidden.
* **Strict Abstraction**: No internal engine, proprietary tool, or third-party library names appear in user interfaces, client diagnostics, API error structures, or public documentation. All public licenses are cataloged in [`THIRD-PARTY-NOTICES.md`](../THIRD-PARTY-NOTICES.md).
* **Privacy by Design**: On-device conversions run entirely in the user's browser, displaying a verified "Processed on your device" note.

---

## 2. Format Support Matrix

### Stable Formats

| Input Format | Output Format | Runtime | Processing Engine | Max Size | Recommendation Score | Description |
|---|---|---|---|---|---|---|
| `DOCX` | `PDF` | Server | `office-to-pdf` | 50 MB | 99 (BEST) | High-fidelity vector PDF with font and margin preservation |
| `ODT` | `PDF` | Server | `office-to-pdf` | 50 MB | 95 | OpenDocument text to vector PDF |
| `RTF` | `PDF` | Server | `office-to-pdf` | 50 MB | 95 | Rich text document to vector PDF |
| `TXT` | `PDF` | Server | `office-to-pdf` | 50 MB | 90 | Plain text to styled document PDF |
| `HTML` | `PDF` | Server | `office-to-pdf` | 50 MB | 90 | Web markup to paginated vector PDF |
| `DOCX` | `DOC` | Server | `office-to-pdf` | 50 MB | 88 | Word document to legacy binary format |
| `DOCX` | `TXT` | Server / Browser | `office-data` | 50 MB | 86 | Clean paragraph extraction without styling |
| `DOCX` | `HTML` | Server / Browser | `office-data` | 50 MB | 89 | Semantic HTML with flowed CSS structure |
| `XLSX` | `PDF` | Server | `office-to-pdf` | 50 MB | 98 | Spreadsheet workbook to printable vector PDF |
| `ODS` | `PDF` | Server | `office-to-pdf` | 50 MB | 95 | OpenDocument spreadsheet to vector PDF |
| `CSV` | `PDF` | Server | `office-to-pdf` | 50 MB | 90 | Delimited tabular data to formatted grid PDF |
| `XLSX` | `CSV` | Server / Browser | `office-data` | 50 MB | 97 | Spreadsheet data export to comma-delimited text |
| `CSV` | `XLSX` | Server / Browser | `office-data` | 50 MB | 98 | Delimited data to structured spreadsheet workbook |
| `PPTX` | `PDF` | Server | `office-to-pdf` | 50 MB | 98 | Slide presentation deck to vector PDF |
| `ODP` | `PDF` | Server | `office-to-pdf` | 50 MB | 95 | OpenDocument presentation to vector PDF |
| `PPTX` | `PNG`, `JPG` | Server | `office-to-pdf` | 50 MB | 93 | High-resolution per-slide raster image exports |
| `PDF` | `PNG`, `JPG` | Server / Browser | `pdf-to-image` | 50 MB | 85 | High-resolution page rasterization (150/200/300 DPI) |
| `PDF` | `TXT` | Server / Browser | `pdf-to-text` | 50 MB | 80 | Clean text stream extraction from digital layers |
| `PNG`, `JPG`, `WEBP`, `BMP` | `PDF` | Server / Browser | `pdf-to-image` | 50 MB | 96 | Image files wrapped into standard page-sized PDF |
| `PNG`, `JPG`, `WEBP`, `BMP` | Inter-image | Server / Browser | `image` | 50 MB | 98 | Lossless or high-quality image format transformation |

---

### Beta Formats

Beta formats are experimental conversions with active automated corpus evaluations. In the user interface, each Beta format is badged with a dedicated **Beta** indicator featuring a tooltip explaining its scope:

| Input Format | Output Format | Runtime | Tier | Corpus Pass Rate | Tooltip / Known Limits |
|---|---|---|---|---|---|
| `DOCX` | `MD` | Browser | Beta | 100.0% | Headings, lists, bold, and tables; complex nested formatting converted to plain text. |
| `PPTX` | `TXT` | Server | Beta | 100.0% | Extracts slide titles, body bullets, and speaker notes in reading order. |
| `PDF` | `DOCX` | Browser | Beta | 100.0% | Text-focused layout; complex columns and shapes may reflow. |
| `PDF` | `XLSX` | Browser | Beta | 100.0% | Ruled or simple aligned tables only; unformatted text ignored. |

---

### What Is Not Offered (and Why)

| Requested Format Pair | Status | Reason for Omission |
|---|---|---|
| `PDF` → `PPTX` | Not offered | Presentation reconstruction requires generative layout synthesis and vector font rebuilding, which cannot currently guarantee high fidelity. |
| `IMAGE` (`PNG`/`JPG`) → `TXT` (OCR) | Planned | General unconstrained OCR without trained domain models currently yields high error rates on handwriting and low-contrast scans. Held until OCR validation reaches >= 95% corpus confidence. |
| `AUDIO` / `VIDEO` conversions | Not offered | Out of scope for document converter. Audio/video codecs require heavy transcoding pipelines handled by specialized media tooling. |
| Encrypted / Password-protected files | Rejected | Cryptographic security prohibits unauthorized conversion without user master key. System cleanly prompts user to remove password before re-upload. |
| Files exceeding 50 MB (Server) / 25 MB (Browser) | Rejected | Enforced hardware safety bounds prevent worker memory exhaustion and preserve responsiveness for concurrent platform users. |

---

## 3. Reliability & Queue Architecture

### Queue Specifications & Concurrency

1. **`fc.convert.office`**: Concurrency limit = 2. Dedicated to heavy office document rendering and layout evaluation.
2. **`fc.convert.pdf`**: Concurrency limit = 4. Dedicated to PDF rasterization and vector parsing.
3. **`fc.convert.image`**: Concurrency limit = 8. Dedicated to raster format transcoding and compression.
4. **`fc.convert.text`**: Concurrency limit = 8. Dedicated to lightweight tabular and text data transforms.

### Retry & Dead-Letter Pipeline

* **Manual Acknowledgments**: Workers invoke `basicAck` only when output storage is finalized.
* **Idempotency Guarantee**: If a worker receives a task for an item already in state `DONE` or `COMPLETED`, the task is immediately acknowledged with zero redundant execution.
* **Progressive Backoff**:
  * 1st failure (retryable) $\rightarrow$ published to `fc.retry.5s` (TTL: 5,000 ms), attempt set to 2.
  * 2nd failure $\rightarrow$ published to `fc.retry.30s` (TTL: 30,000 ms), attempt set to 3.
  * 3rd failure $\rightarrow$ published to `fc.retry.120s` (TTL: 120,000 ms), attempt set to 4.
  * 4th failure $\rightarrow$ published to `fc.dlq` (Dead Letter Queue) with status `FAILED`.
* **Backpressure Throttling**: When the office queue depth exceeds 20 pending items, new office conversion requests are throttled with HTTP 503 (`Retry-After: 30`, error code `QUEUE_UNAVAILABLE`).

---

## 4. Error Mapping & Client Recovery

Every internal error is translated to a clean, helpful message before reaching the client:

| Error Code | Error Category | User-Facing Message | UI Action |
|---|---|---|---|
| `UNSUPPORTED_PAIR` | Permanent | Conversion from this format to the chosen target is not supported. | **Change format** |
| `CORRUPTED_FILE` | Permanent | This file appears to be damaged or incomplete. Please check the file and try again. | Explain issue (no retry) |
| `ENCRYPTED` / `ENCRYPTED_FILE` | Permanent | This file is password-protected. Please remove the password and re-upload. | Explain issue (no retry) |
| `TOO_LARGE` | Permanent | This file exceeds the size limit for this format. | Explain issue (no retry) |
| `OCR_FAILED` | Permanent | Text could not be extracted from this scanned document. | Explain issue (no retry) |
| `TIMEOUT` | Retryable | Conversion took longer than the time limit. Retrying... | **Retry** |
| `ENGINE_BUSY` | Retryable | The converter is at capacity. Retrying in a few seconds... | **Retry** |
| `ENGINE_CRASHED` | Retryable | The converter encountered an unexpected issue and has restarted. Retrying... | **Retry** |
| `TEMP_IO` | Retryable | Storage write failed. Retrying... | **Retry** |
| `QUEUE_UNAVAILABLE` | Retryable | Conversion queue is temporarily unavailable. Please try again shortly. | **Retry** |
| `NO_TEXT_FOUND` | Permanent | No text found. Scanned pages need OCR. | Explain issue (no retry) |

---

## 5. UI/UX Specifications

* **Accent Presets**: Olive dual-theme palette (`#5B7A1E` in light mode, `#A3C75A` in dark mode).
* **Two-Panel Layout**: Left panel houses the file list and card states (Queued, Converting, Done, Failed); right panel houses conversion settings.
* **Queued State**: Shows a "Queued" badge. When the office queue is congested, displays "Waiting for a free converter."
* **On-Device Privacy Note**: Browser-converted files display an inline shield icon with "Processed on your device" alongside the download button.
* **Beta Badging**: Displays a compact "Beta" pill next to experimental formats with hover/focus tooltips explaining extraction constraints in plain terms.
* **Progress Percentage**: Progress bars track real-time progress via Server-Sent Events (`GET /api/file-converter/jobs/{id}/events`).

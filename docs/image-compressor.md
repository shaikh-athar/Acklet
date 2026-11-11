# Acklet Image Compressor — Phase 1 Architecture & Upload Foundation

## 1. Overview
- **Tool Slugs**: `image-compressor`, `imagecompressor`, `img-compressor`
- **Subdomain**: `imagecompressor.acklet.com` (locally: `imagecompressor.localhost:4200`)
- **Dedicated Route**: `/tools/image-compressor` (aliases: `/image-compressor`, `/imagecompressor`, `/img-compressor`)
- **Category**: `Media` (`categorySlug: 'media'`)
- **Accent**: `blue` (`#3B82F6` dark / `#2563EB` light, hue: 221)
- **Execution Mode**: 100% In-Browser, Private & Client-Side (`executionMode: 'browser'`)
- **Current Milestone**: **Phase 1 — Upload Management & Configuration Foundation**
- **Related Documentation**:
  - [Image Converter Architecture](image-converter.md)
  - [Universal File Converter Documentation](file-converter.md)
  - [Standalone Tool Architecture](standalone-tool-architecture.md)
  - [UI Design System & Tokens](ui-design-system.md)
  - [Subdomain Routing Setup](subdomain-routing-setup.md)

---

## 2. Phase 1 Objective & Boundaries

Phase 1 establishes the production-grade upload management, file validation, interactive workspace, settings configuration, and preview infrastructure for Image Compressor without generating fake compression statistics.

### Included in Phase 1:
- Dedicated tool routing, local subdomain resolution (`imagecompressor.localhost:4200`), and Acklet tool registry integration.
- Minimal centered upload landing page with large drag-and-drop target and file picker.
- Robust file validation: 50 images session limit, 50 MB per file limit, header magic byte validation, anti-executable security filtering, zero-byte file rejection, and duplicate detection.
- Uploaded image workspace with thumbnail previews, dimension extraction, format chips, and file sizes.
- Full-featured image preview modal with keyboard navigation (Escape, Left, Right arrows) and transparent grid backdrop.
- Global compression settings panel: Smart & Custom modes, continuous quality slider (1–100%), output format selection (Original, JPEG, PNG, WebP, AVIF), proportional resizing, and metadata retention policies.
- Per-image individual settings overrides with predictable inheritance: items without custom overrides automatically inherit updated global settings, while customized items retain their overrides.
- Informative processing summary placeholder clearly distinguishing configuration staging from actual compression engine execution.
- High-contrast dual-theme support (Dark & Light) compliant with WCAG AA standards.
- Browser memory lifecycle management: strict revocation of `URL.createObjectURL` references upon removal or component destruction.

### Explicitly Deferred to Phase 2:
- Browser-side WebAssembly codecs and canvas DCT/quantization compression execution.
- Space saved and percentage reduction calculations (no mock/fake compression statistics are displayed).
- Batch ZIP bundle generation and compressed asset downloads.

---

## 3. Supported Input Formats & Capabilities

Each input format is evaluated independently across three explicit capability dimensions:

| Format | Extensions | Magic Byte Signature | Preview Supported | Compression Supported (Phase 2 Target) | Description |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **JPEG** | `.jpg`, `.jpeg` | `FF D8 FF` | Yes | Yes | Universal photographic format with lossy DCT compression |
| **PNG** | `.png` | `89 50 4E 47 0D 0A 1A 0A` | Yes | Yes | Lossless format with 24/32-bit alpha transparency |
| **WebP** | `.webp` | `RIFF....WEBP` | Yes | Yes | Modern web raster format supporting lossy & lossless modes |
| **AVIF** | `.avif` | `....ftypavif` / `avis` | Yes | Yes | Next-generation AV1 image file format |
| **GIF** | `.gif` | `GIF87a` / `GIF89a` | Yes | Yes | Graphics Interchange Format |
| **BMP** | `.bmp` | `42 4D` ("BM") | Yes | Yes | Windows Bitmap uncompressed raster |
| **SVG** | `.svg` | `<svg` XML tag | Yes (Safe `<img>`) | Yes | Scalable Vector Graphics (DOM injection strictly forbidden) |
| **HEIC/HEIF**| `.heic`, `.heif` | `....ftypheic` / `mif1` | Optional / Codec | Yes | High Efficiency Image Container (Phase 2 decoder pipeline) |

Files disguised as media (such as Windows PE `MZ` or Linux `ELF` binaries) are rejected immediately upon binary inspection.

---

## 4. Component Architecture & State Management

The application is encapsulated under `client/apps/tool-image-compressor` with modular service boundaries:

```
client/apps/tool-image-compressor/
├── src/
│   ├── app/
│   │   ├── app.component.ts               # Root tool shell wrapper (<ts-shell>)
│   │   └── app.component.spec.ts          # Shell & manifest integrity tests
│   ├── components/
│   │   ├── upload-landing/
│   │   │   └── upload-landing.component.ts # Centered hero upload area & drag-drop
│   │   ├── image-card/
│   │   │   └── image-card.component.ts    # File row card, dimensions, override badge
│   │   ├── settings-panel/
│   │   │   └── settings-panel.component.ts # Global & per-image compression settings
│   │   ├── preview-modal/
│   │   │   └── preview-modal.component.ts # Fullscreen high-resolution preview dialog
│   │   └── processing-summary/
│   │       └── processing-summary.component.ts # Staging summary placeholder
│   ├── models/
│   │   └── compressor.models.ts           # Type definitions for items, settings, capabilities
│   ├── services/
│   │   ├── compressor-validation.service.ts      # Magic bytes, limits, dimensions
│   │   ├── compressor-validation.service.spec.ts # Validation unit tests
│   │   ├── compressor-state.service.ts           # Reactive signal store & actions
│   │   └── compressor-state.service.spec.ts      # State & inheritance tests
│   ├── image-compressor.component.ts      # Main orchestrator component
│   ├── image-compressor.component.html    # Two-column workspace layout
│   ├── image-compressor.component.css     # Dual-theme high-contrast scoped styles
│   ├── main.ts                            # Angular bootstrap entrypoint
│   ├── index.html                         # HTML template
│   └── styles.css                         # Tool Tailwind & design token imports
```

---

## 5. Settings Inheritance Rules

1. **Global Settings**:
   - `mode`: `'smart'` | `'custom'`
   - `quality`: `1`–`100` (default `80`)
   - `outputFormat`: `'original'` | `'jpeg'` | `'png'` | `'webp'` | `'avif'`
   - `resize`: `{ enabled: false, mode: 'dimensions', maintainAspectRatio: true, percentage: 100 }`
   - `metadataPolicy`: `'preserve'` | `'remove'`

2. **Inheritance Behavior**:
   - When a user modifies global settings, all items with `hasCustomSettings: false` immediately update their `effectiveSettings`.
   - Items with `hasCustomSettings: true` preserve their customized overrides and are never silently overwritten.
   - Users can select "Reset to Global" on any customized item to discard overrides and re-bind to global settings.
   - Bulk action "Apply Global Settings" allows resetting multiple selected items simultaneously.

---

## 6. Memory Safety & Browser Performance

- **Zero Server Uploads**: Files remain exclusively in device memory.
- **Safe Object URLs**: All preview images use `URL.createObjectURL(file)`.
- **Immediate Cleanup**: Revocation (`URL.revokeObjectURL`) is executed whenever:
  - An individual image is deleted.
  - Selected images are removed.
  - "Remove All" is triggered.
  - The component is destroyed (`ngOnDestroy`).
- **Decompression Bomb Protection**: Input images exceeding 100 Megapixels (`100,000,000` pixels) or 16,384px on any edge are rejected prior to full decoding to protect browser memory.
- **Safe Vector Display**: SVG files are rendered using `<img>` tags pointing to object URLs; raw SVG text is never injected into the application DOM.

---

## 7. Verification & Quality Assurance

- **Vitest Unit Tests**: 25 tests covering validation, deduplication, magic byte checks, state transitions, selection, and settings inheritance.
- **Production Build**: Verified with `@angular/build:application` producing optimized bundles without errors or warnings.
- **Dual-Theme Verification**: Verified against Acklet design tokens in both Light (`#FFFFFF` background) and Dark (`#111318` charcoal background) modes.
- **Subdomain Routing**: Verified under `imagecompressor.localhost:4200` and path `/tools/image-compressor`.


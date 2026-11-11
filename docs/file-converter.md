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

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
5. **Subtle Supported Formats**: Compact row listing implemented categories: `Images (PNG, JPG, WebP, AVIF, SVG) · Subtitles (SRT, VTT) · Contacts (VCF, CSV)`.
6. **Contextual Validation**: No permanent upload limit chips. Files exceeding limits (e.g. 50 MB) trigger friendly contextual alert banners at upload time.

## Workspace State
- **Left Stage**: Card grid showing file names, sizes, detected magic-byte formats, status, and removal triggers.
- **Right Sidebar**: Context-sensitive settings (format selection, synchronized quality slider/presets for lossy formats, lossless format guard, and image resize).

## Global Drag-and-Drop Overlay (Frosted Glass & Media Focus)
- **ChatGPT-Inspired Frosted Blur**: Replaced old dashed container modals and format chip clusters with a translucent, full-screen frosted glass backdrop (`backdrop-filter: blur(24px)`).
- **Media & Image Focused Visual Center**: Layered card stack in the center featuring an accent-tinted backdrop card and a front vibrant accent card with a crisp white media/photo frame SVG icon.
- **Clear Copy**: Heading `"Add images & media"` with subtitle `"Drop files here to convert instantly"`.
- **Zero-Stuck Lifecycle & Dismissal**:
  - Drops directly on the overlay or anywhere on the window automatically set `dragCounter = 0` and reset `isGlobalDragging` to `false`.
  - Escape key listener and overlay click listeners allow instantaneous dismissal.
  - Viewport boundary detection in `window:dragleave` automatically resets dragging when the cursor exits the window.
  - Dropzone event handlers in `DropzoneComponent` clear dragging and do not swallow drop events.

## Related Documents
- [Tool Readme](../client/apps/tool-file-converter/README.md)
- [Third Party Notices](../THIRD-PARTY-NOTICES.md)
- [Standalone Tool Architecture](standalone-tool-architecture.md)

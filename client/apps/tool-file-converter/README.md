# Image Converter (`tool-file-converter`)

> **Acklet Utility Tool** — Fast, private, in-browser image conversion with zero server uploads.

## Overview
Image Converter enables users to convert, compress, and resize images directly inside their web browser. All image processing runs client-side using the HTML5 Canvas API and Web Workers, ensuring 100% data privacy with zero server uploads.

## Key Specifications
- **Tool Slug**: `image-converter` (aliases: `file-converter`, `converter`, `img-converter`)
- **Subdomain**: `image-converter.acklet.com` (locally: `image-converter.localhost:4200`)
- **Category**: Media / Images
- **Accent**: `indigo` (`#6366F1` dark / `#4F46E5` light, hue: 242)
- **Execution Mode**: 100% Client-Side (`browser`)
- **Batch Constraints**: Max 50 files per batch, max 50 MB per file

## Architecture & Layout
- **State 1: Empty Hero**: Spacious, distraction-free hero with a prominent `Select Images` CTA button, drag-and-drop listener, and format chips.
- **State 2: Studio Workspace**: Split-screen two-column layout:
  - **Left / Gallery Stage**: Responsive thumbnail cards with hover removal, verified binary format tags, progress overlay, and ready/savings metrics.
  - **Right Sidebar**: Format options (`CONVERT TO WEBP`, `CONVERT TO JPG`, `CONVERT TO PNG`), quality preset (`Balanced 85%`, `Best 95%`, `Smallest 65%`), resize select, and sticky primary conversion CTA.

## Supported Formats
- **Input**: PNG, JPG, JPEG, WebP, AVIF, SVG, GIF, BMP, ICO
- **Output**: WebP, JPG, PNG, GIF, BMP

## Deliverables & Documentation
- Tool Config: `src/tool.config.ts`
- Documentation: `docs/image-converter.md` and `docs/Acklet Vault/Acklet/Tools/File-Converter/`
- Manifest: `client/packages/tool-registry/src/manifests/file-converter.manifest.ts`


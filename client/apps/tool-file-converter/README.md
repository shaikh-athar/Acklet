# File Converter (`tool-file-converter`)

> **Acklet Utility Tool** — Clean, private, in-browser file conversion across popular formats with zero server uploads.

## Overview
File Converter enables users to convert, compress, and reformat files directly inside their web browser. All file processing runs client-side using Web APIs (Canvas API, Web Workers, TextDecoder/Encoder), ensuring 100% data privacy with zero server uploads.

## Tool Identity & Separation
- **Tool Name**: File Converter (independent from Image Converter)
- **Sidebar & Breadcrumb Label**: File Converter (`Acklet / File Converter`)
- **Page Heading**: File Converter
- **Document Title**: `File Converter | Acklet` (or `{SOURCE} to {TARGET} | Acklet` on dedicated conversion routes)
- **Subdomain**: `file-converter.acklet.com` (locally: `file-converter.localhost:4200`)
- **Dedicated Route**: `/tools/file-converter`
- **SEO Conversion Routes**: `/convert/:pair` (e.g., `/convert/png-to-webp`, `/convert/srt-to-vtt`, `/convert/vcf-to-csv`)
- **Category**: Converters
- **Accent**: `indigo` (`#6366F1` dark / `#4F46E5` light, hue: 242)
- **Execution Mode**: 100% Client-Side (`browser`)

## Minimal Landing Page (iLoveIMG / iLovePDF Reference)
- **Centered Clean Layout**: Generous whitespace, focused typography, no oversized permanent dashed containers or floating badge clutter.
- **Clear Heading & Description**:
  - `File Converter`
  - `Convert files between popular formats quickly and securely.`
- **High-Contrast Primary Button**: Prominent `Select Files` button with verified contrast in both Light and Dark modes. Explicitly fixes the hover visibility bug so text and icons remain crisp white (`#FFFFFF`) across all states.
- **Drag & Drop**: Subtle `"or drop files here"` text below button. A full-screen drop overlay activates only when files are actively dragged over the window.
- **Subtle Format Display**: Compact, organized category line listing genuinely tested formats (Images: PNG, JPG, WebP, AVIF, SVG; Subtitles: SRT, VTT; Contacts: VCF, CSV).
- **Contextual Validation**: Upload limits (50 MB per file, max 50 files) are checked contextually upon selection rather than permanently cluttering the landing screen.

## Conversion Studio Workspace
- **Gallery Stage**: Thumbnail preview, file metadata, detected format chip, remove button, real-time conversion progress.
- **Settings Sidebar**:
  - Dynamic output formats tailored to uploaded file types.
  - Synchronized quality controls: continuous slider (10%–100%) and presets (`Balanced 85%`, `Best 95%`, `Smallest 65%`).
  - Lossless protection guard: disables lossy compression for PNG, SVG, SRT, VTT, VCF, CSV with 100% data integrity banner.
  - Proportional image resize dimensions (FHD, HD, Web).
  - Sticky primary conversion action and 1-click batch ZIP download.

## Git & Worktree Isolation
- Managed independently from Image Converter (`tools/img-converter` branch in this worktree; `file-converter` in its respective worktree).
- Independent manifest (`FILE_CONVERTER_MANIFEST`), dedicated routes, and isolated scoped styles.

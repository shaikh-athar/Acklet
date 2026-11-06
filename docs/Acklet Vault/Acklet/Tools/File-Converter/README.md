# Image Converter by Acklet

The **Image Converter** is an in-browser, privacy-first, batch image transformation studio engineered for high-speed, loss-minimizing conversions across PNG, JPG, WebP, AVIF, SVG, and GIF formats.

---

## Key Highlights

- **Minimal First-Glance Interface**: Fast, distraction-free dropzone ready for immediate image uploads.
- **Interactive Batch Configuration**: Dynamic setup options appear immediately after upload to configure target format (WebP, JPG, PNG), quality presets, and proportional resizing.
- **Batch Processing up to 50 Images**: Supports converting up to 50 images per batch with up to 50 MB per file limit.
- **100% In-Browser Execution**: All images are decoded, rasterized, and encoded locally via OffscreenCanvas and Canvas API without uploading to any remote server.
- **Electric Indigo Accent Theme**: Vibrant dual-theme design system integration with custom indigo accent glow and WCAG AA contrast.
- **Asynchronous Concurrent Processing**: 3-way parallel async execution with DOM event loop yielding for smooth 60 FPS animations.
- **Celebration Banner & ZIP Export**: Celebratory savings summary with 1-click bundled ZIP download.

---

## Directory Index

| Subdirectory | Purpose |
| :--- | :--- |
| [0-Requirements/requirements.md](0-Requirements/requirements.md) | Product scope, user stories, acceptance criteria, and technical constraints. |
| [0-Requirements/features.md](0-Requirements/features.md) | Detailed feature inventory across upload, detection, conversion, and export. |
| [0-Requirements/format-matrix.md](0-Requirements/format-matrix.md) | Complete matrix of supported format pairs, execution modes, and algorithms. |
| [1-Progress/implementation-log.md](1-Progress/implementation-log.md) | Chronological log of development milestones, decisions, and fixes. |
| [2-Implementation/service-design.md](2-Implementation/service-design.md) | Technical architecture of services, adapters, workers, and data structures. |
| [3-Reference/faq.md](3-Reference/faq.md) | Frequently asked questions, privacy disclosures, and troubleshooting guide. |

---

## URLs & Routing

- **Standalone Subdomain**: `http://converter.localhost:4200` / `https://converter.acklet.com`
- **Primary Routes**: `/image-converter`, `/img-converter`, `/tools/image-converter`, `/tools/img-converter`
- **Backward-Compatible Routes**: `/file-converter`, `/converter`, `/tools/file-converter`, `/tools/converter`
- **Component Root**: `client/apps/tool-file-converter/`

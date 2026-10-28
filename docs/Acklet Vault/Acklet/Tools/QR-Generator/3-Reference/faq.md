---
tool: QR Generator
phase: 3
last-updated: 2026-10-28
status: Complete
---

# QR Generator — Frequently Asked Questions (FAQ)

### Q: Does Acklet QR Generator transmit my content or contact data to a remote server?
**A**: By default, **no**. All static QR code generation (URLs, raw text, emails, phone numbers, Wi-Fi credentials, vCards, etc.), vector SVG calculations, and image downloads execute 100% locally within your browser's WebAssembly and JavaScript runtime. Data only leaves your browser if you explicitly opt to create a hosted dynamic link (`/q/{code}`) or hosted landing page.

### Q: How does the in-browser decodability verification work?
**A**: When a QR code is generated or customized, `QRVerifierService` uses `jsQR` to decode the rendered canvas in the background. It executes an automated 4-pass pipeline (Standard pass, Contrast-Stretched pass, Inverted Luminance pass, and Center Crop pass). If camera scanning issues are detected, it surfaces a calm warning chip and a single-click "Fix Automatically" action that sharpens contrast and adjusts module density.

### Q: Why does the Error Correction level automatically jump to Level H or Q when I upload a logo?
**A**: Embedding a logo or brand icon in the center of a QR code physically obscures a percentage of the matrix data modules. `qr-auto-ec.util.ts` detects the logo's area footprint and automatically elevates the Reed-Solomon Error Correction to Level H (30% recovery) or Level Q (25% recovery). This guarantees that mobile cameras can reconstruct the obscured data without failing to scan.

### Q: What is the difference between Direct Text and Notes Link mode?
**A**: Direct Text encodes raw UTF-8 characters directly into the matrix, which is ideal for short messages or passwords under ~300 characters. For longer documents or notes (up to 20,000 characters), Notes Link mode creates a compact `/q/{code}` dynamic link that keeps the QR matrix clean and low-density, directing mobile scanners to a fast, responsive reader page at `/tools/qr-generator/notes/:code` with "Copy" and "Share to Notes" buttons.

### Q: Can I export scalable vector graphics for professional print?
**A**: **Yes**. In addition to lossless PNG and web-ready JPEG, the tool generates pure scalable vector SVG (`.svg`) via `qr-svg-renderer.ts`. The SVG file embeds all custom module shapes, corner locators, and decorative frames with zero raster pixelation, making it ready for billboards, vehicle wraps, laser engraving, and merchandise.

### Q: How do anonymous dynamic QR codes work without an account?
**A**: When you create a dynamic code, the server generates a secure 256-bit cryptographic manage key. The key is stored in your browser's `localStorage` and sent in hashed form (`SHA-256`) to the backend. You can pause, resume, update destination URLs, or inspect scan analytics without needing an email address, password, or subscription.

### Q: What design tokens and fonts are used?
**A**: QR Generator is built in strict adherence to the **Canonical Acklet Design System**, featuring the unified tool font **Scoutie Sans** (`font-family: 'Scoutie Sans', sans-serif;`) and the registered **Blue Accent** (`#3B82F6` in dark mode / `#2563EB` in light mode), guaranteeing WCAG AA contrast ($\ge 4.5:1$) across both themes.

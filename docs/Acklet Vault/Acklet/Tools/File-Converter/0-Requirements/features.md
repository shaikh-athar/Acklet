# Universal File Converter — Feature Inventory

## 1. Upload & Intake System
- **Drag-and-Drop Zone**: Prominent target with dotted border, active hover glow, and dragover visual states.
- **System File Picker**: Integrated button with `multiple` file selection support.
- **Paste Event Listener**: Direct file ingestion when pasting image or document data from clipboard.
- **Max File Limit & Guardrails**: 100 MB client-side execution safety boundary with instant user notification.

## 2. Detection & Format Intelligence
- **Deep Signature Scanner**: Evaluates magic byte sequences before any conversion step begins.
- **Confidence Scoring**: Flags spoofed extensions (e.g. executable masked as an image).
- **Adaptive Options Panel**:
  - Image Quality slider (60% to 100%) for lossy WebP/JPEG exports.
  - CSV delimiter selection (comma `,` or semicolon `;`) for contact exports.
  - Transparency preservation toggle (PNG to WebP).

## 3. Modular Adapter Engine
- **Image Adapter**: High-speed Canvas and OffscreenCanvas pipeline supporting PNG, JPG, WebP, SVG, and AVIF.
- **Subtitle Adapter**: Microsecond parser converting between SubRip (`.srt`) and WebVTT (`.vtt`) maintaining formatting tags and timestamps.
- **Contact Adapter**: RFC 6350 vCard to RFC 4180 CSV bidirectional transformation preserving all primary contact fields (`FN`, `N`, `TEL`, `EMAIL`, `ADR`, `ORG`, `TITLE`, `NOTE`).
- **Extensible Registry**: Clean interface allowing seamless addition of server-side document, audio, and video conversion adapters.

## 4. Real-Time Feedback & Monitoring
- **Queue Cards**: Individual item cards showing file name, detected format, byte size, format dropdown, and conversion progress.
- **Honest Progress Display**: Dynamic tracking reflecting true processing states (Queued → Scanning → Converting → Finalizing → Complete).
- **Cancellation Controls**: User can cancel active or queued jobs at any second.
- **Size Differential Metrics**: Shows output file size alongside original size with percentage reduction/increase.

## 5. Export & Storage Safety
- **Direct Local Download**: Trigger download via `URL.createObjectURL(blob)` with clean revoke cycle preventing memory leaks.
- **One-Click Batch ZIP**: Compresses all converted files into a timestamped ZIP archive using `jszip`.
- **Zero-Storage Privacy Model**: Files exist solely in volatile browser heap memory; no cookies, telemetry, or server uploads are conducted for local formats.

---

## Related Documents
- [requirements.md](requirements.md) — Requirements specifications.
- [format-matrix.md](format-matrix.md) — Supported formats.


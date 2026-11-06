# Universal File Converter — Requirements & Specifications

## 1. Product Overview

The Universal File Converter allows users to convert files between different formats through a simple, fast, and responsive single-page interface within the Acklet platform.

### Main Goals
1. Support multiple file formats across images, modern images, subtitles, contacts, documents, audio, and video.
2. Deliver a seamless zero-login experience for global audiences (USA, UK, Canada, Australia, Europe, etc.).
3. Prioritize browser-based execution for maximum user privacy, zero latency, and minimal server infrastructure overhead.
4. Provide accurate, loss-minimizing conversions with honest progress indicators and validation checks.

---

## 2. Core Functional Requirements

### 2.1 File Upload & Ingestion
- **Drag & Drop**: Intuitive drag-and-drop dropzone with animated boundary states, keyboard navigation, and file browser fallback.
- **Batch Upload**: Support single and multi-file uploads simultaneously.
- **Max File Size**: Up to 100 MB for client-side processing, with clear warning badges for excessive payloads.

### 2.2 Signature Detection & Format Validation
- **Magic Bytes Verification**: Read header bytes (`ArrayBuffer`) to identify actual file MIME type and container format before running conversions.
- **Extension Spoof Protection**: If a user uploads an `.exe` or corrupted binary renamed to `.png`, the detector rejects it immediately with clear feedback.
- **Dynamic Output Filtering**: Only present verified, tested, and working output formats for the detected input format.

### 2.3 Conversion Execution & Feedback
- **Adapter Pipeline**: Dispatch conversion jobs to specialized adapters (`ImageConversionAdapter`, `SubtitleConversionAdapter`, `ContactConversionAdapter`, etc.).
- **Real-Time Progress**: Display genuine progress feedback (0% to 100%) without fabricated percentages.
- **Cancellation**: Allow users to abort ongoing conversions cleanly without freezing browser threads.
- **Result Preview**: Provide in-situ image/text previews before and after conversion.

### 2.4 Export & Delivery
- **Direct Download**: One-click download with auto-generated filenames preserving original base name.
- **Batch ZIP Archive**: Bundle multiple converted files into a single `.zip` file using `jszip`.
- **Reset & Reuse**: One-click "Convert Another File" option to reset state.

---

## 3. Non-Functional Requirements

- **Performance**: Heavy conversion operations must execute asynchronously via Web Workers / OffscreenCanvas to maintain a 60 FPS responsive UI.
- **Privacy & Security**: Zero permanent storage. No server transmission for client-side conversion pairs.
- **Accessibility**: Spartan UI primitives, ARIA attributes, keyboard accessibility, and WCAG AA contrast (>= 4.5:1).
- **Responsive Layout**: Flawless display across mobile (360px), tablet (768px), and ultrawide desktop monitors (1440px+).

---

## Related Documents
- [../README.md](../README.md) — Tool Overview.
- [features.md](features.md) — Feature Specifications.
- [format-matrix.md](format-matrix.md) — Format Matrix.
- [../1-Progress/implementation-log.md](../1-Progress/implementation-log.md) — Implementation Log.


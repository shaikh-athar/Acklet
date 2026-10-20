---
tool: Online Clipboard
phase: 2
last-updated: 2026-10-20
status: On Hold
---

# Online Clipboard — Phase 2 Progress & Planning

## 1. Phase Status & Readiness

- **Current Status**: **On Hold / Specifying** (Awaiting Phase 1 Production Feedback)
- **Prerequisites**: Phase 1 Baseline Complete (Achieved)
- **Target Launch Window**: Q1 2027

---

## 2. Dependencies on Phase 1

1. **Content-Addressable Storage (CAS)**: Phase 2 image cropping and OCR will leverage the existing SHA-256 deduplication and CAS storage engine.
2. **Chunked Streaming Pipeline**: WebRTC peer data channels will fallback to the existing 5 MB chunked upload protocol when peer connectivity fails.
3. **Dual-Theme Design System**: Phase 2 controls (OCR extract button, code language picker) will directly reuse existing Spartan UI Helm components and `tokens.css`.

---

## 3. Phase 2 Feature Breakdown & Planned Tasks

| Feature | Complexity | Dependencies | Current State |
| :--- | :--- | :--- | :--- |
| **In-Browser OCR Extractor** | Medium | Wasm Tesseract / Web Workers | Designing worker pipeline |
| **Code Syntax Highlighting** | Medium | Lowlight / Prism / Tiptap | Scoping bundle impact |
| **WebRTC Direct Data Channels** | High | Spring Boot Signaling Relay | Architecture draft |
| **Client-Side Image Cropping** | Low | HTML5 Canvas / OffscreenCanvas | Concept phase |

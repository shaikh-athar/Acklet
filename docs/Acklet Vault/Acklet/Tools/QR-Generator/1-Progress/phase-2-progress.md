---
tool: QR Generator
phase: 2
last-updated: 2026-10-20
status: On Hold
---

# QR Generator — Phase 2 Progress & Planning

## 1. Phase Status

- **Status**: **On Hold / Specifying** (Scheduled to commence following Phase 1 completion and production sign-off)
- **Target Timeline**: Weeks 3–4

---

## 2. Dependencies on Phase 1

1. **State Orchestration**: Phase 2 logo uploads and shape selectors will extend the existing `QROptions` interface in `QRGeneratorComponent`.
2. **Preview Engine**: `QRCanvasComponent` will be upgraded from simple `<img>` data URL binding to an HTML5 `<canvas>` rendering pipeline for custom module geometry and logo composites.
3. **Contrast Validation**: `ColorValidatorService` will be reused to validate contrast between logo borders and background modules.

---

## 3. Planned Deliverables

- [ ] Drag-and-drop logo uploader with size percentage slider (max 25% area clamp).
- [ ] Module shape picker: Standard Square, Rounded Dots, Smooth Circles, Diamond.
- [ ] Corner eye customizer: Square, Rounded, Pill.
- [ ] Decorative frames with customizable CTA text (e.g., *"Scan Me!"*, *"Follow Us"*).
- [ ] Extended format builders: vCard 3.0/4.0, WPA2/WPA3 Wi-Fi, SMS, Geolocation coordinates.
- [ ] Batch generation from CSV upload to bundled `.zip` archive.
- [ ] Multi-format vector export: SVG (raw vector DOM), high-res JPG, and WebP.

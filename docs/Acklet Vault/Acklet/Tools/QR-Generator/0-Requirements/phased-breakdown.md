---
tool: QR Generator
phase: 1
last-updated: 2026-10-20
status: In Planning
---

# Phased Breakdown

## Phase 1: MVP Client-Side Generation
**Timeline**: Week 1–2  
**Goal**: Single QR generation with basic customization + download

### Deliverables
- ✅ QRGeneratorComponent (main orchestrator)
- ✅ Input panel (content + type selector + presets)
- ✅ Preview panel (QR image + metadata)
- ✅ Customization panel (colors, size, error correction)
- ✅ Download panel (PNG download)
- ✅ Unit tests (services: 80%+ coverage)
- ✅ E2E tests (full flow)
- ✅ Accessibility audit (WCAG 2.1 AA)
- ✅ Performance audit (LCP < 2.5s)
- ✅ Deployed to qr.localhost:port

### Not Included
- ❌ Backend
- ❌ Logos
- ❌ Batch
- ❌ Shapes
- ❌ Frames
- ❌ vCard / Wi-Fi
- ❌ SVG / JPG
- ❌ Analytics
- ❌ History

---

## Phase 2: Customization + Templates
**Timeline**: Week 3–4  
**Goal**: Advanced visual customization, batch, templates

### Deliverables
- Logo upload (drag-drop, position, size %)
- Module + corner shape selector
- Frame + border + CTA text
- Batch generation (CSV → ZIP)
- History (localStorage, last 10)
- Templates (Business Card, Event, Promo, Wi-Fi)
- SVG output (templated)
- JPG / WebP output
- vCard + Wi-Fi input types
- Phase 2 tests

### New Libraries
- pica (image resizing)
- JSZip (batch download)

---

## Phase 3: Backend + Analytics
**Timeline**: Week 5+  
**Goal**: Server-side generation, persistence, analytics

### Deliverables
- Backend endpoints (Spring Boot + ZXing)
- Database persistence (optional)
- Analytics (scan logging + dashboard)
- EPS vector output
- Cloud storage (S3/GCS)
- Shareable links + expiration
- URL shortening integration

### New Libraries
- com.google.zxing:core + javase
- org.springframework.boot:*
- batik-codec (SVG → EPS)

---

## Dependencies
- Phase 1 is independent (can deploy alone)
- Phase 2 builds on Phase 1 (reuse all components)
- Phase 3 is separate backend option (doesn't require Phase 2)

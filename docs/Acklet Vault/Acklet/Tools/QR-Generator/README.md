---
tool: QR Generator
phase: 3
last-updated: 2026-10-28
status: Complete
---

# QR Generator — Complete Engineering Documentation Hub

Welcome to the canonical engineering and architectural documentation hub for **QR Generator by Acklet** (`qr.localhost:4200` / `https://qr.acklet.com`).

QR Generator is an enterprise-grade, privacy-first digital workspace utility for creating, customizing, verifying, and exporting high-resolution QR codes. The tool delivers a complete three-tier architecture: **Phase 1** (instant in-browser matrix calculation and raster export), **Phase 2** (vector SVG rendering, 11 dot styles, 8 corner locator shapes, 18+ decorative frames, linear/radial gradients, logo embedding with automatic error correction boost, and local history), and **Phase 3** (Spring Boot hosted dynamic short links at `/q/{code}`, anonymous 256-bit manage keys, device-aware mobile routing, hosted landing pages, notes viewer, and camera-grade in-browser decodability verification via `jsQR`).

---

## Standard Specifications & Reference

- [Functional Description](description.md) — Tool purpose, user problems solved, core behavior, 12 supported inputs, outputs, processing model, and privacy guarantees.
- [Feature Catalog](feature.md) — Comprehensive breakdown of features QR-F01 through QR-F23, validation rules, gradient/frame engines, and error recovery.
- [UI Reference](UI_REFERENCE.md) — 2-column studio layout, top workspace navigation, customization sub-tabs, Scoutie Sans typography, and Blue accent tokens.
- [Visual & Terminology Legend](LEGEND.md) — Icons, badges, indicators, Reed-Solomon error correction levels, and QR matrix module definitions.

---

## Documentation Structure Index

```text
/Users/ayaz/Acklet/docs/Acklet Vault/Acklet/Tools/QR-Generator/
├── README.md                     (Documentation Hub entry point)
├── description.md                (Functional description & privacy model)
├── feature.md                    (Detailed feature behavior & flows)
├── UI_REFERENCE.md               (UI layout, states, tokens, & accessibility)
├── LEGEND.md                     (Icons, badges, error correction, & QR terms)
│
├── 0-Requirements/
│   ├── features.md               (Feature scope, baseline must-haves, Phase 1-3 deliverables)
│   ├── requirements.md           (12 input types, customization rules, WCAG AA, performance targets)
│   ├── library-selection.md      (qr-code-styling, jsQR, jszip, libphonenumber-js, Spartan UI)
│   ├── api-contract.md           (Client-side pure interfaces: QROptions, QRMetadata, Verification)
│   ├── field-matrix.md           (Field requirements, validation schemas, RFC standards per content type)
│   └── phased-breakdown.md       (Phase 1 MVP, Phase 2 Parity, Phase 3 Dynamic & Hosted)
│
├── 1-Progress/
│   ├── phase-1-progress.md       (Phase 1 completion: MVP client-side generation)
│   ├── phase-2-progress.md       (Phase 2 completion: Shapes, frames, logo embedding, vector export)
│   ├── phase-3-progress.md       (Phase 3 completion: Dynamic short links, backend, verifier, batch)
│   ├── implementation-log.md     (Product sign-off, timeline, engineering decisions)
│   └── issues-and-fixes.md       (Identified risks, low contrast handling, mitigations)
│
├── 2-Implementation/
│   ├── component-tree.md         (Verified component hierarchy in client/apps/tool-qr-generator/)
│   ├── service-design.md         (QRGeneratorService, verifier, dynamic, smart links, payload builders)
│   ├── styling-guide.md          (Blue accent tokens, Scoutie Sans typography, dual-theme tokens)
│   ├── testing-strategy.md       (Unit test plan, 114 frontend + 24 backend tests, WCAG 2.1 AA)
│   └── deployment.md             (Static build, qr.localhost routing, environment config)
│
└── 3-Reference/
    ├── api-reference.md          (REST API: /q/{code} resolver, /api/v1/qr/** dynamic manager)
    ├── data-model.md             (PostgreSQL schemas, Flyway migrations, JPA entities, TypeScript models)
    ├── glossary.md               (Error Correction L/M/Q/H, QR versions 1-40, Capacity, Modules)
    ├── faq.md                    (Common product, privacy, scannability, and technical questions)
    ├── links.md                  (ISO/IEC 18004 QR spec, RFC standards, WCAG contrast reference)
    └── learnings.md              (Architectural takeaways, SVG vs Canvas, multi-pass decoding)
```

---

## 1. Quick Navigation Table

| Section | Key Document | Description | Status |
| :--- | :--- | :--- | :--- |
| **Overview** | [description.md](description.md) | Functional description, processing & privacy model | **Complete** |
| | [feature.md](feature.md) | Comprehensive feature catalog QR-F01 to QR-F23 | **Complete** |
| | [UI_REFERENCE.md](UI_REFERENCE.md) | UI layout, controls, states, shortcuts, & theme tokens | **Complete** |
| | [LEGEND.md](LEGEND.md) | Icons, badges, status indicators, & terminology | **Complete** |
| **0. Requirements** | [features.md](0-Requirements/features.md) | Scope boundaries, feature capabilities, user stories | **Complete** |
| | [requirements.md](0-Requirements/requirements.md) | Baseline requirements, 12 input types, capacity limits | **Complete** |
| | [field-matrix.md](0-Requirements/field-matrix.md) | RFC field standards, validations, and escaping rules | **Complete** |
| | [library-selection.md](0-Requirements/library-selection.md) | qr-code-styling, jsQR, jszip, libphonenumber-js | **Complete** |
| | [api-contract.md](0-Requirements/api-contract.md) | Pure client-side interfaces and payload contracts | **Complete** |
| | [phased-breakdown.md](0-Requirements/phased-breakdown.md) | Phase 1 (MVP), Phase 2 (Parity), Phase 3 (Dynamic) | **Complete** |
| **1. Progress** | [phase-1-progress.md](1-Progress/phase-1-progress.md) | Phase 1 milestone tracking & deliverables checklist | **Complete** |
| | [phase-2-progress.md](1-Progress/phase-2-progress.md) | Phase 2 shapes, frames, logo embedding, vector export | **Complete** |
| | [phase-3-progress.md](1-Progress/phase-3-progress.md) | Phase 3 dynamic shortlinks, backend, verifier, batch | **Complete** |
| | [implementation-log.md](1-Progress/implementation-log.md) | Product sign-off and chronological timeline log | **Complete** |
| | [issues-and-fixes.md](1-Progress/issues-and-fixes.md) | Identified risks, low contrast handling, mitigations | **Complete** |
| **2. Implementation**| [component-tree.md](2-Implementation/component-tree.md) | Standalone components hierarchy and reactive flow | **Complete** |
| | [service-design.md](2-Implementation/service-design.md) | Service signatures, payload builders, and verifier | **Complete** |
| | [styling-guide.md](2-Implementation/styling-guide.md) | Blue accent tokens, Scoutie Sans typography, tokens | **Complete** |
| | [testing-strategy.md](2-Implementation/testing-strategy.md) | Unit tests (114 Vitest + 24 JUnit), E2E, WCAG AA | **Complete** |
| | [deployment.md](2-Implementation/deployment.md) | Static build, subdomain routing, Caddy configuration | **Complete** |
| **3. Reference** | [api-reference.md](3-Reference/api-reference.md) | REST API: /q/{code} resolver & /api/v1/qr/** manager | **Complete** |
| | [data-model.md](3-Reference/data-model.md) | PostgreSQL schema, Flyway migrations, TypeScript models | **Complete** |
| | [glossary.md](3-Reference/glossary.md) | QR terms: Version (1-40), EC (L/M/Q/H), Modules | **Complete** |
| | [faq.md](3-Reference/faq.md) | Architectural, privacy, and technical FAQs | **Complete** |
| | [links.md](3-Reference/links.md) | ISO/IEC 18004 spec, RFC standards, WCAG quick reference | **Complete** |
| | [learnings.md](3-Reference/learnings.md) | Retrospective on SVG vs Canvas, multi-pass decoding | **Complete** |

---

## 2. Core Architectural Highlights

1. **100% In-Browser Privacy by Default**: Direct QR code generation runs entirely in client-side WebAssembly / JavaScript memory. Zero content data, URLs, emails, or phone numbers are transmitted to remote servers unless the user explicitly chooses to create a hosted dynamic link.
2. **Canonical Acklet Design System & Scoutie Sans**: Built with Acklet's unified tool font **Scoutie Sans** (`font-family: 'Scoutie Sans', sans-serif;`) and registered **Blue Accent** (`#3B82F6` dark / `#2563EB` light), ensuring crisp high contrast ($\ge 4.5:1$ WCAG AA) across dual Light and Dark themes.
3. **Scalable Vector SVG Engine & Multi-Format Export**: Generates lossless vector SVG markup via `qr-svg-renderer.ts` with custom module geometry, corner locators, and decorative CTA frames. Supports instant one-click exports in `.svg`, high-resolution `.png`, `.jpeg`, or direct image clipboard copy.
4. **Automated Multi-Pass Decodability Verifier**: Incorporates `QRVerifierService` powered by `jsQR`. Executes a 4-pass in-browser decoding pipeline (Standard, Contrast-Stretched Histogram Binarization, Inverted Luminance, and Center-Cropped Decode) to guarantee real-world camera scannability before export, surfacing a calm confidence rating (High, Medium, Low) and auto-fix suggestions.
5. **12 Complete Content Types**: Structured forms with RFC standard compliance for URL (with UTM builder), Plain Text (with live character/byte counter and Notes shortlink), Email (`mailto:`), Phone (`tel:` with E.164 parsing), SMS (`smsto:`), Wi-Fi (ZXing WPA/WPA2/WPA3/Enterprise), Location (`geo:` coordinates and map links), Event (`iCal` RFC 5545), vCard 3.0 (`.vcf`), Social Profiles (Instagram, X, LinkedIn, YouTube, GitHub with icon auto-detection), App Store (iOS & Android smart store link normalizer), and Crypto Wallets (Bitcoin, Ethereum, Solana).
6. **Design Studio Customization**:
   - **Shapes**: 11 matrix dot styles (Square, Dots, Rounded, Extra-Rounded, Classy, Classy-Rounded, Diamond, Star, Heart, Cross, Scanline); 8 corner square locators; 10 corner dots with independent coloring.
   - **Frames**: 18+ vector frames (`bottom-banner`, `top-header`, `polaroid`, `badge-pill`, `chat-bubble`, `ticket`, `tag`, etc.) with customizable CTA ribbons and independent background/text colors.
   - **Colors & Gradients**: Solid, Linear Gradient, and Radial Gradient modes with 0–360° angle rotation, dual color stops, curated presets, and real-time WCAG contrast safety check.
   - **Logo Embedding**: Drag-and-drop file upload (PNG/SVG/JPEG) plus 20+ brand presets, transparent background toggle, and automatic Reed-Solomon Error Correction boost to Level H or Q to preserve scanning integrity.
7. **Hosted Dynamic Links & Device Routing**: Backed by Spring Boot 3.4.1 for short links at `/q/{code}`, Base62 slugs, anonymous 256-bit manage keys (stored hashed via SHA-256 with zero account requirement), device-aware routing (iOS vs Android vs Fallback), and hosted landing pages (`/tools/qr-generator/view/:code` and `/tools/qr-generator/notes/:code`).

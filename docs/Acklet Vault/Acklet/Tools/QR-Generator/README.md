---
tool: QR Generator
phase: 1
last-updated: 2026-10-20
status: Complete
---

# QR Generator — Complete Engineering Documentation Hub

Welcome to the canonical engineering and architectural documentation hub for **QR Generator by Acklet** (`qr.localhost:4200` / `https://qr.acklet.com`).

QR Generator is a lightweight, privacy-focused utility tool for creating, customizing, and downloading QR codes. MVP Phase 1 focuses on single QR generation with basic customization, real-time preview, and PNG download. Content is processed 100% client-side in the user's browser (*"Processed locally, no tracking"*).

---

## Standard Specifications & Reference

- [Functional Description](description.md) — Tool purpose, user problem, core behavior, inputs/outputs, constraints, privacy model.
- [Feature Catalog](feature.md) — In-depth breakdown of features, flows, validation rules, and error recovery.
- [UI Reference](UI_REFERENCE.md) — Page layout, components, controls, keyboard shortcuts, states, and dual-theme tokens.
- [Visual & Terminology Legend](LEGEND.md) — Icons, badges, indicators, error correction modes, and QR module terms.

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
│   ├── features.md               (Feature scope, baseline must-haves, non-scope, user stories)
│   ├── requirements.md           (Input types, customization rules, WCAG AA, performance targets)
│   ├── library-selection.md      (qrcode.js, Angular, Spartan UI, rejected alternatives)
│   ├── api-contract.md           (Client-side pure interfaces: QROptions, QRMetadata)
│   └── phased-breakdown.md       (Phase 1 MVP vs Phase 2 & 3 roadmap)
│
├── 1-Progress/
│   ├── phase-1-progress.md       (Phase 1 completion: 100% done, 30 unit tests passing)
│   ├── phase-2-progress.md       (Phase 2 planning, dependencies, target roadmap)
│   ├── implementation-log.md     (Product sign-off, timeline, engineering decisions)
│   └── issues-and-fixes.md       (Identified risks, edge cases, pre-emptive mitigations)
│
├── 2-Implementation/
│   ├── component-tree.md         (Verified component hierarchy in client/apps/tool-qr-generator/)
│   ├── service-design.md         (QRGeneratorService & ColorValidatorService signatures)
│   ├── styling-guide.md          (Emerald accent override, Fraunces/Inter fonts, 900px grid)
│   ├── testing-strategy.md       (Unit test plan, 30 vitest tests, WCAG 2.1 AA checklist)
│   └── deployment.md             (Static build, qr.localhost routing, environment config)
│
└── 3-Reference/
    ├── glossary.md               (Error Correction L/M/Q/H, QR versions 1-40, Capacity, Modules)
    ├── faq.md                    (Common product, privacy, and technical questions & answers)
    ├── links.md                  (ISO/IEC 18004 QR spec, qrcode.js docs, WCAG contrast reference)
    └── learnings.md              (Architectural takeaways, Data URLs, state simplicity)
```

---

## 1. Quick Navigation Table

| Section | Key Document | Description | Status |
| :--- | :--- | :--- | :--- |
| **Overview** | [description.md](description.md) | Functional description, processing & privacy model | **Complete** |
| | [feature.md](feature.md) | Detailed feature behavior, edge cases, & recovery | **Complete** |
| | [UI_REFERENCE.md](UI_REFERENCE.md) | UI layout, controls, states, shortcuts, & theme tokens | **Complete** |
| | [LEGEND.md](LEGEND.md) | Icons, badges, status indicators, & terminology | **Complete** |
| **0. Requirements** | [features.md](0-Requirements/features.md) | Scope boundaries, feature capabilities, user stories | **Complete** |
| | [requirements.md](0-Requirements/requirements.md) | Baseline requirements, input types, capacity limits | **Complete** |
| | [library-selection.md](0-Requirements/library-selection.md) | qrcode.js, Angular forms, Spartan UI, Lucide icons | **Complete** |
| | [api-contract.md](0-Requirements/api-contract.md) | QROptions & QRMetadata client-side data interfaces | **Complete** |
| | [phased-breakdown.md](0-Requirements/phased-breakdown.md) | Phase 1 (MVP) vs Phase 2 (Logos/Batch) & Phase 3 | **Complete** |
| **1. Progress** | [phase-1-progress.md](1-Progress/phase-1-progress.md) | Phase 1 milestone tracking & deliverables checklist | **Complete (100%)** |
| | [phase-2-progress.md](1-Progress/phase-2-progress.md) | Phase 2 logos, shapes, frames, and batch planning | **On Hold** |
| | [implementation-log.md](1-Progress/implementation-log.md) | Product sign-off and chronological timeline log | **Complete** |
| | [issues-and-fixes.md](1-Progress/issues-and-fixes.md) | Identified risks, low contrast handling, mitigations | **Complete** |
| **2. Implementation**| [component-tree.md](2-Implementation/component-tree.md) | Standalone components hierarchy and reactive flow | **Complete** |
| | [service-design.md](2-Implementation/service-design.md) | QRGeneratorService and ColorValidatorService signatures | **Complete** |
| | [styling-guide.md](2-Implementation/styling-guide.md) | Emerald accent tokens, Fraunces typography, 900px grid | **Complete** |
| | [testing-strategy.md](2-Implementation/testing-strategy.md) | Unit tests (30 vitest tests), E2E flows, WCAG AA | **Complete** |
| | [deployment.md](2-Implementation/deployment.md) | Static build, subdomain routing, Caddy configuration | **Complete** |
| **3. Reference** | [glossary.md](3-Reference/glossary.md) | QR terms: Version (1-40), EC (L/M/Q/H), Modules, Quiet Zone | **Complete** |
| | [faq.md](3-Reference/faq.md) | Architectural, privacy, and technical FAQs | **Complete** |
| | [links.md](3-Reference/links.md) | ISO/IEC 18004 spec, qrcode.js docs, WCAG quick reference | **Complete** |
| | [learnings.md](3-Reference/learnings.md) | Retrospective on Data URLs, state simplicity, canvas | **Complete** |

---

## 2. Core Architectural Highlights

1. **100% In-Browser Privacy**: Zero backend calls in Phase 1. QR matrices and PNG files are computed purely on the client device.
2. **Emerald Accent Override**: Uses `#10B981` / `#34D399` for primary action buttons, focus rings, and capacity progress bars, distinct from Acklet's default ink-green.
3. **Real-Time Dynamic Metadata**: Calculates minimum QR version (1–40), maximum capacity, used characters, and visual capacity progress percentage on every keystroke.
4. **Contrast Guard**: Mathematical WCAG luminosity calculation (`ColorValidatorService.contrastRatio()`) alerts users if foreground and background colors drop below `2.5:1`.
5. **Standalone Component Architecture**: Decoupled standalone components orchestrated cleanly through `QRGeneratorComponent` under `client/apps/tool-qr-generator/`.

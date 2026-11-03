# Barcode Generator — Engineering & Product Documentation

Welcome to the **Barcode Generator** documentation within the Acklet developer tools workspace.

---

## 1. Quick Navigation & Tool Identity

- **Tool Name**: Barcode Generator
- **Tool Slug**: `barcode` (alias: `barcode-generator`)
- **Category**: Utilities (`utilities`)
- **Accent Color**: Sapphire Blue (`#3B82F6` in dark mode, `#2563EB` in light mode, hue 217)
- **Local Dev URL**: [http://barcode.localhost:4300](http://barcode.localhost:4300) or `http://localhost:4300/barcode`
- **Production URL**: `https://barcode.acklet.com`
- **Application Source**: [client/apps/tool-barcode-generator/](../../../../client/apps/tool-barcode-generator/)
- **Primary Manifest**: [client/packages/tool-registry/src/manifests/barcode.manifest.ts](../../../../client/packages/tool-registry/src/manifests/barcode.manifest.ts)
- **Status**: **Phase 1 & Phase 2 Production Ready** (100% Client-Side)

---

## 2. Documentation Architecture

This documentation adheres to the canonical Acklet documentation system:

```
docs/Acklet Vault/Acklet/Tools/Barcode-Generator/
├── README.md                           (This document)
├── spec.md                             (Detailed technical specification)
├── bulk-spec.md                        (Bulk generation & batch print specification)
├── responsive-architecture.md          (Canonical 4-breakpoint responsive system)
├── label-templates.md                  (Label sheet & thermal roll templates)
├── format-matrix.md                    (Compatibility & rendering verification matrix)
├── format-registry.md                  (Comprehensive symbology rules and charset schemas)
├── security.md                         (Security baseline, CSP, and formula injection defense)
├── test-vectors.md                     (Verified GS1, ISBN, Code 39, and rejection vectors)
├── library-licenses.md                 (Third-party dependencies, licenses, and bundle strategies)
├── changelog.md                        (Version history and release notes)
│
├── 0-Requirements/
│   ├── features.md                     (Full feature list, MVP, Phase 2/3, acceptance criteria)
│   ├── requirements.md                 (Baseline must-haves, quality bar, performance constraints)
│   ├── library-selection.md            (Zero external dependencies rationale, SVG vs raster engine)
│   └── phased-breakdown.md             (Roadmap: Phase 1 1D, Phase 2 Bulk/Sheets, Phase 3 GS1 AI)
│
├── 1-Progress/
│   ├── phase-1-progress.md             (Phase 1 status, checklist, test vector results)
│   ├── implementation-log.md           (Timeline log, architectural choices, key learnings)
│   └── issues-and-fixes.md             (Resolved issues, Make QR deep link, SVG scaling)
│
├── 2-Implementation/
│   ├── component-tree.md               (Component hierarchy, signal data flow, modals)
│   ├── service-design.md               (Unified render engine, sheet layout, PDF builder)
│   ├── styling-guide.md                (Design tokens, sapphire-blue palette, typography, focus rings)
│   ├── testing-strategy.md             (Unit test matrix, 19 suites, 194 tests)
│   └── deployment.md                   (Standalone bootstrap, subdomain routing, Caddy setup)
│
└── 3-Reference/
    ├── glossary.md                     (Symbology terms, Modulo-10, Bearer Bars, Quiet Zone)
    ├── faq.md                          (Frequently asked questions on barcodes and standards)
    ├── links.md                        (GS1, ISO/IEC specifications, and Acklet standards)
    └── learnings.md                    (Mathematical insights, pure SVG rendering, performance)
```

### Quick Document Links
- Technical Spec: [spec.md](./spec.md)
- Bulk Generation Spec: [bulk-spec.md](./bulk-spec.md)
- Responsive Architecture: [responsive-architecture.md](./responsive-architecture.md)
- Label Templates & Roll Presets: [label-templates.md](./label-templates.md)
- Format Matrix: [format-matrix.md](./format-matrix.md)
- Format Registry: [format-registry.md](./format-registry.md)
- Security Baseline: [security.md](./security.md)
- Test Vectors: [test-vectors.md](./test-vectors.md)
- Changelog: [changelog.md](./changelog.md)

---

## 3. Core Architectural Principles

1. **100% Client-Side Execution**: All checksum calculations, character validations, binary module encodings, and vector SVG renderings execute entirely in browser memory. Zero user telemetry, zero network tracking, and zero server storage.
2. **Unified Rendering Pipeline Parity**: Single barcode generation (`Content` tab) and bulk batch generation (`Bulk` tab) consume the identical [`RenderService`](../../../../client/apps/tool-barcode-generator/src/services/render.service.ts) pipeline. Every record produces a byte-identical vector SVG with identical quiet zones, bar geometry, and human-readable text styling.
3. **Single Page Model Engine (`SheetLayoutService`)**: A single authoritative layout calculator creates `SheetPageModel[]` and `RollLabelModel[]` containing all positions, margins, barcode boxes, captions, and cut guides in millimeters. The live preview, vector PDF generator, canvas rasterizer, and isolated iframe print engine all consume this exact model.
4. **Generate-Gated Preview**: Before the user clicks "Generate N barcodes", the preview displays clean layout placeholder grids with empty dashed slots. Modifying settings does not alter the preview or show intrusive warning banners; the last generated output remains stable until explicit regeneration.
5. **Runtime Caption Styling**: Floating toast card toolbar allows live size, color, font style (Bold, Mono, Uppercase), and alignment adjustments. Captions use unitless SVG coordinate embedding and bounding box clamping (`textLength`) to eliminate browser millimeter font inflation and ensure zero collision with adjacent labels without requiring barcode regeneration.
6. **Canonical 4-Breakpoint Responsive System**: Strictly follows tokens in [`responsive-tokens.ts`](../../../../client/apps/tool-barcode-generator/src/config/responsive-tokens.ts): `sm` (0–639px, dedicated 4th `Preview` tab, sticky bottom actions), `md` (640–1023px, stacked single-column with collapsible preview), `lg` (1024–1439px, two-column split), and `xl` (1440px+, centered shell capped at 1600px).
7. **Universal GS1 Modulo-10 Algorithm**: Standardized right-to-left alternating weights (3 and 1) starting from the digit immediately before the check digit position, unifying EAN-13, EAN-8, UPC-A, ISBN-13, and ITF-14.
8. **High-Contrast Dual-Theme Identity**: Sapphire Blue accent (`#2563EB` light mode, `#3B82F6` dark mode, hue 217) and scoped Google Font `Manrope` applied strictly to `[data-tool="barcode"]`. Active segmented buttons, tabs, and focus rings maintain `>= 4.5:1` WCAG AA contrast against both dark (`#18191E`) and light (`#FFFFFF`) surfaces.
9. **High-Contrast Paper Stage**: The barcode preview renders on a clean paper surface with standards-compliant quiet zones across both Light and Dark themes, ensuring what users see on screen scans accurately in physical production.

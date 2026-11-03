# Barcode Generator — Testing Strategy & Verification Guide

This document defines the unit, integration, validation, responsive, and accessibility testing strategy for the Barcode Generator.

---

## 1. Test Suite Architecture (19 Suites, 194 Tests)

All 19 test suites execute via Vitest and are verified with 100% passing results:

```bash
cd client && npx vitest run apps/tool-barcode-generator
```

| Category | Spec File Path | Test Count | Scope & Coverage |
| :--- | :--- | :---: | :--- |
| **Responsive** | `config/responsive-layout.spec.ts` | 10 | Canonical 4 breakpoints (`sm`, `md`, `lg`, `xl`), mobile tab strip, safe area padding, desktop clamping |
| **Bulk Engine** | `services/bulk-acceptance.spec.ts` | 16 | Gated preview, persistence, 5x13/4x10 layout math, custom layout boundaries, Standard 2 of 5 decoding |
| **Bulk Service** | `services/bulk-generator.service.spec.ts` | 24 | ZIP archives (PNG, SVG, Sheets), manifest creation, formula injection escaping, 0-valid abort guard |
| **Sheet Layout** | `services/sheet-layout.service.spec.ts` | 12 | Single Page Model millimetric math, auto text sizing, thermal roll dot pitch snapping (203/300 DPI) |
| **Validation** | `services/validator.service.spec.ts` | 15 | Symbology constraints, charset validation, length bounds, sizing fit checks |
| **Rejection** | `services/charset-rejection.spec.ts` | 16 | Rejection of forbidden characters, lowercase conversion, plain error messaging |
| **Bulk UI** | `components/bulk-preview/bulk-preview.component.spec.ts` | 15 | Zoom controls, caption toast toggle, page navigation, verification badges, download button |
| **Symbology Shapes** | `services/variant-shape-level.spec.ts` | 14 | Barcode geometric validity across 1D and 2D formats |
| **Engine Adapter** | `services/barcode-engine.adapter.spec.ts` | 13 | Binary module encoding, SVG path assembly, quiet zones, bearer bars |
| **Check Digits** | `services/check-digit.service.spec.ts` | 9 | Universal GS1 Modulo-10, Code 39 Modulo-43, Code 93 C/K, UPC-E compression |
| **Bulk Scanning** | `services/bulk-scan.spec.ts` | 7 | Scannability across all 7 primary label sheet presets |
| **Render Service** | `services/render.service.spec.ts` | 6 | Pipeline parity: single vs bulk SVG output identity, bar width, caption styling |
| **Preview UI** | `components/preview-panel/preview-panel.component.spec.ts` | 6 | Paper stage, laser scan reveal, split download actions, clipboard copy |
| **Naming** | `services/barcode-name.spec.ts` | 8 | Filename sanitization, incrementing counters, retention pruning |
| **PDF Builder** | `services/pdf-builder.service.spec.ts` | 3 | Vector PDF 1.4 syntax, exact page dimensions, font embedding |
| **Sensitivity** | `config/option-sensitivity.spec.ts` | 17 | Format-specific option reactivity and state isolation |
| **Format Matrix** | `config/format-matrix.spec.ts` | 1 | Matrix testing of all 31 symbologies against reference test vectors |
| **Registry Lint** | `config/registry-lint.spec.ts` | 1 | Structural linting of format registry metadata |
| **Domain Lint** | `config/domain-lint.spec.ts` | 1 | Domain rule verification and URL structure integrity |

---

## 2. Mandatory Test Vector Specifications

```typescript
describe('Mandatory Test Vectors', () => {
  it('EAN-13: 400638133393 produces check digit 1, and 4006381333931 is valid', () => {
    expect(service.calculateGs1Mod10('400638133393')).toBe('1');
    expect(service.validateGs1Mod10('4006381333931').valid).toBe(true);
  });

  it('UPC-A: 03600029145 produces check digit 2, and 036000291452 is valid', () => {
    expect(service.calculateGs1Mod10('03600029145')).toBe('2');
    expect(service.validateGs1Mod10('036000291452').valid).toBe(true);
  });

  it('EAN-8: 9638507 produces check digit 4, and 96385074 is valid', () => {
    expect(service.calculateGs1Mod10('9638507')).toBe('4');
    expect(service.validateGs1Mod10('96385074').valid).toBe(true);
  });

  it('ISBN-13: 978030640615 produces check digit 7, and 9780306406157 is valid', () => {
    expect(service.calculateGs1Mod10('978030640615')).toBe('7');
    expect(service.validateGs1Mod10('9780306406157').valid).toBe(true);
  });
});
```

---

## 3. Rejection & Recovery Testing

| Scenario | Input | Expected Output |
| :--- | :--- | :--- |
| **Invalid Char in EAN-13** | `40063813339A` | `valid: false`, Error: *"EAN-13 requires 12 or 13 digits."* |
| **Invalid Check Digit** | `4006381333939` | `valid: false`, Error: *"Check digit is incorrect. Expected 1."* |
| **Odd Length in ITF** | `12345` | Auto-prepends `0` to produce `012345` with explanatory notification |
| **Lowercase in Code 39** | `test-code` | Auto-converts to `TEST-CODE` with suggestion notice |
| **URL Input** | `https://example.com` | Flags `suggestQr: true` and displays "Make QR" chip |
| **Formula Injection in CSV** | `=cmd|' /C calc'!A0` | Escapes to `'=cmd|' /C calc'!A0` in manifests and exports |

---

## 4. Accessibility & Contrast Verification

- **Color Contrast Ratio**: Contrast checker computes luminance ratio ($L_1 / L_2$). Color combinations below 3:1 trigger a warning.
- **Active State Contrast**: Active segmented buttons and tabs maintain $\ge 4.5:1$ WCAG AA contrast (`#2563EB` with `#FFFFFF` text).
- **Focus Outlines**: `2px solid var(--tool-accent, #2563EB); outline-offset: 2px;` on all focusable elements.
- **Screen Reader Announcements**: Form errors and validation status use `aria-live="polite"`.
- **Touch Targets**: Minimum 44px x 44px on mobile and tablet breakpoints.

---

## Related Documentation
- Test Vectors: [test-vectors.md](../test-vectors.md)
- Responsive Architecture: [responsive-architecture.md](../responsive-architecture.md)
- Bulk Specification: [bulk-spec.md](../bulk-spec.md)
- Service Design: [service-design.md](./service-design.md)

---
tool: QR Generator
phase: 1
last-updated: 2026-10-20
status: In Planning
---

# QR Generator — Testing Strategy & Quality Assurance Plan

## 1. Test Architecture Overview

Quality verification for **QR Generator** spans four mandatory testing layers:
1. **Unit Testing (Services & Calculations)**: Testing math formulas, QR generation, and validation functions. Target: **80%+ code coverage** on services.
2. **End-to-End (E2E) Workflow Testing**: Verifying the complete user journey from text entry to PNG file download and mobile camera scanning.
3. **Accessibility Audit (WCAG 2.1 AA)**: Verifying keyboard focus indicators, screen reader labeling, and color contrast.
4. **Performance Benchmarks**: Enforcing LCP < 2.5s, bundle size < 150KB gzipped, and generation latency < 500ms.

---

## 2. Unit Testing Plan (`qr-generator.spec.ts`)

| Test Suite | Target Unit | Verification Assertions |
| :--- | :--- | :--- |
| **Suite 1: QR Generation** | `QRGeneratorService.generateQR()` | • Produces valid base64 string starting with `data:image/png;base64,`.<br>• Correctly encodes content across all 4 types (Text, URL, Email, Phone).<br>• Applies foreground and background hex colors cleanly.<br>• Rejects empty content gracefully without throwing uncaught exceptions. |
| **Suite 2: Metadata & Version Calculation** | `QRGeneratorService.getMetadata()` | • Short string ("hello") resolves to QR Version 1 with capacity 41.<br>• Calculates `usedCapacity` and `capacityPercent` accurately.<br>• Adapts version estimation dynamically as error correction changes from L to H. |
| **Suite 3: Content Boundary Validation** | `QRGeneratorService.isValidContent()` | • Accepts strings <= 2,953 characters.<br>• Rejects strings exceeding version 40 ceiling. |
| **Suite 4: Hex Validation & Conversion** | `ColorValidatorService.isValidHex()` | • Accepts `#000000`, `#FFFFFF`, `#10B981`.<br>• Rejects malformed strings (`#FFF`, `red`, `123456`, `#GGGGGG`). |
| **Suite 5: Contrast Ratio Math** | `ColorValidatorService.contrastRatio()` | • `#000000` on `#FFFFFF` evaluates to exact ratio **`21:1`**.<br>• Identical colors (`#FFFFFF` on `#FFFFFF`) evaluate to **`1:1`**.<br>• `#888888` on `#777777` evaluates to low ratio (`1.32:1`). |
| **Suite 6: Low Contrast Warning Flag** | `ColorValidatorService.hasLowContrast()` | • Returns `true` when ratio < `2.5:1`.<br>• Returns `false` when ratio >= `2.5:1`. |

---

## 3. End-to-End (E2E) Test Scenarios

### E2E-1: Full Generation & Download User Flow
1. User navigates to `http://qr.localhost:port`.
2. Selects **URL** type preset.
3. Types `https://acklet.com`.
4. Verifies live QR image appears in Preview panel in `< 500ms`.
5. Verifies Metadata shows Version 1, capacity 41, used 18.
6. Clicks **Download PNG**.
7. Verifies browser downloads `qr-code-{timestamp}.png`.
8. Verifies downloaded image decodes cleanly via camera scanner.

### E2E-2: Low Contrast Detection & Recovery
1. User changes foreground color to `#CCCCCC` with `#FFFFFF` background.
2. Verifies warning banner and ⚠️ icon appear immediately.
3. User changes foreground to `#000000`.
4. Verifies warning banner clears.

### E2E-3: Error Correction Visual Density Change
1. With constant content length, user switches error correction from **L** (7%) to **H** (30%).
2. Verifies QR pattern visually re-renders with higher grid density to accommodate redundancy blocks.

---

## 4. Accessibility (WCAG 2.1 AA) Audit Checklist

- [ ] **Form Labels**: All form controls (`textarea`, `<input type="color">`, size slider, dropdown) have an explicit associated `<label for="...">`.
- [ ] **Keyboard Navigation**: Entire tool navigable via keyboard alone (`Tab`, `Shift+Tab`, `Space`, `Enter`).
- [ ] **Visible Focus Indicators**: High-visibility outline or border rings on all active elements (`:focus-visible`).
- [ ] **Dual Representation**: Color swatches always paired with text inputs (not color-dependent alone).
- [ ] **Contrast Warning**: Warning text passes `>= 4.5:1` contrast against surface background.
- [ ] **No Focus Trap**: Users can effortlessly Tab out of the QR tool into the platform navigation.

---

## 5. Performance Targets

- **LCP (Largest Contentful Paint)**: `< 2.5 seconds`.
- **Bundle Footprint**: `< 150 KB` gzipped.
- **Generation Latency**: `< 500 milliseconds` per input change.
- **Cumulative Layout Shift (CLS)**: `< 0.05` (preview container maintains fixed aspect ratio).

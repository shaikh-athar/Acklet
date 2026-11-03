# Barcode Generator — Styling Guide & Design Tokens

This document details the visual design specifications, dual-theme tokens, typography, and responsive layout rules for the Barcode Generator.

---

## 1. Color Tokens & Sapphire Blue Palette

The Barcode Generator uses the canonical Sapphire Blue accent (`hue: 217`) registered in the tool manifest and theme system:

```css
/* Canonical Breakpoint Tokens */
--bp-sm-max: 639px;
--bp-md-min: 640px;
--bp-md-max: 1023px;
--bp-lg-min: 1024px;
--bp-lg-max: 1439px;
--bp-xl-min: 1440px;

/* Light Theme */
--tool-accent: #2563EB;
--tool-accent-ink: #FFFFFF;
--tool-accent-hover: #1D4ED8;
--tool-accent-active: #1E40AF;
--tool-accent-soft: rgba(37, 99, 235, 0.12);
--tool-accent-border: rgba(37, 99, 235, 0.25);

/* Dark Theme */
--tool-accent: #3B82F6;
--tool-accent-ink: #FFFFFF;
--tool-accent-hover: #60A5FA;
--tool-accent-active: #2563EB;
--tool-accent-soft: rgba(59, 130, 246, 0.14);
--tool-accent-border: rgba(59, 130, 246, 0.28);

/* Canonical Focus Ring */
--ts-focus-ring: 2px solid var(--tool-accent, #2563EB);
--ts-focus-offset: 2px;
```

---

## 2. High-Contrast Dual-Theme Rules (WCAG AA >= 4.5:1)

- **Active Segmented Controls & Buttons**: All active tabs, zoom buttons, size pills, and style toggles apply `background: var(--tool-accent, #2563EB); color: #FFFFFF !important; font-weight: 700;`, achieving $\ge 4.5:1$ contrast against both dark surfaces (`#18191E`) and light surfaces (`#FFFFFF`).
- **Focus Rings**: Standardized `2px solid var(--tool-accent, #2563EB); outline-offset: 2px;` on all interactive buttons, inputs, selects, and checkboxes.
- **Optical Inversion Flagging**: Combinations with luminance contrast below $3:1$ display a prominent warning pill: *"Low optical contrast or inverted colors may prevent laser scanners from reading this barcode."*
- **Paper Stage**: Barcode previews rest on a dedicated white paper card (`#FFFFFF`) with quiet zone margins, ensuring visual contrast and physical scan fidelity in both Light and Dark modes.

---

## 3. Typography

1. **Tool UI Font**: [Manrope](https://fonts.google.com/specimen/Manrope) (Google Font, weights 400, 500, 600, 700), scoped strictly to `[data-tool="barcode"]`.
2. **Barcode Numbers**: OCR-B / Monospace font (`'OCR-B', 'Courier New', Courier, monospace`) with proportional letter spacing for retail scanning verification.
3. **Runtime Captions**: Embedded as unitless SVG text inside the `viewBox` with bounding box clamping (`textLength` and `lengthAdjust="spacingAndGlyphs"`).

---

## 4. Canonical 4-Breakpoint Responsive System

| Breakpoint | Range | Device Profile | Layout Behavior |
| :--- | :--- | :--- | :--- |
| **`sm`** | `0px – 639px` | Phone portrait | Single column; tabs include dedicated 4th `"Preview"` tab; sticky bottom action bar with `env(safe-area-inset-bottom)`; download button label shrinks dynamically to `"Download (N)"`; compact dropdown zoom select |
| **`md`** | `640px – 1023px` | Small tablet, phone landscape | Single column stacked; collapsible preview below form with `"Show preview"` toggle button; compact dropdown zoom select |
| **`lg`** | `1024px – 1439px` | Laptop, tablet landscape | Two-column grid; left control panel clamped between 380px and 520px; right preview sticky to top with internal scroll; segmented zoom buttons |
| **`xl`** | `1440px+` | Desktop, wide monitors | Two-column grid centered within `max-width: 1600px` shell; preview scales vertically |

---

## 5. Floating Toast UI Pattern (`.caption-toast-card`)

Anchored floating card anchored to the preview header toolbar:
- Floating elevation: `box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)`.
- High-contrast background: `var(--bg-card, #FFFFFF)` in light theme, `var(--bg-card, #1E2028)` in dark theme.
- Touch Targets: Interactive pills and toggles maintain minimum 36px to 44px bounding boxes.

---

## 6. Micro-Animations

- **Laser Scan Line**: 0.65s linear vertical sweep animation on content change.
- **Full-Screen Gather Radar**: Sonar pulse animation (`@keyframes sonar`) on active drag-over state.
- **Button Hover States**: Subtle scale-up (`scale(1.02)`) on button hover and smooth press transform (`scale(0.98)`).
- **Reduced Motion**: Disables laser sweep and radar animations automatically when `prefers-reduced-motion: reduce` is detected.

---

## Related Documentation
- Component Tree: [component-tree.md](./component-tree.md)
- Responsive Architecture: [responsive-architecture.md](../responsive-architecture.md)
- Bulk Specification: [bulk-spec.md](../bulk-spec.md)
- Testing Strategy: [testing-strategy.md](./testing-strategy.md)

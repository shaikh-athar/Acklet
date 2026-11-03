# Barcode Generator — Responsive Architecture & Layout System

This document outlines the canonical responsive layout architecture and breakpoint rules for the Barcode Generator tool in Acklet.

Related documents:
- [Bulk Specification](./bulk-spec.md)
- [Format Matrix](./format-matrix.md)
- [Changelog](./changelog.md)

---

## 1. Canonical Breakpoints & Device Size Tiers

The Barcode Generator strictly adheres to canonical breakpoints and device tiers defined in [`responsive-tokens.ts`](../../../../client/apps/tool-barcode-generator/src/config/responsive-tokens.ts). No component or style file may introduce ad-hoc media queries outside these token boundaries.

| Tier / Breakpoint | Range | Device Profile | Layout Behavior |
| :--- | :--- | :--- | :--- |
| **`xs`** | `< 400px` | Small phones (e.g. 360×800 Samsung Galaxy A55, 320×640 Android) | 52px topbar, 4-column tab grid with stacked icon above 11px label, native select for bulk output formats, bottom sheet for caption styling, stacked 1-col grids |
| **`sm`** | `400px – 639px` | Large phones, phablets | Single column; tabs include dedicated "Preview" tab; sticky bottom action bar with safe area inset |
| **`md`** | `640px – 1023px` | Small tablet, phone landscape | Single column stacked; collapsible preview below form with toggle button; compact dropdown zoom; 0.05s snappy transition |
| **`lg`** | `1024px – 1439px` | Laptop, tablet landscape | Two-column shell; sticky preview on the right; high-contrast segmented zoom |
| **`xl`** | `1440px+` | Desktop, wide monitors | Two-column shell; max-width 1600px centered; sticky preview with internal scroll |

---

## 2. Two-Case Preview vs. Generate Workflow & 0.05s Animation

On mobile (`sm`, `xs`) and tablet (`md`), the action bar intelligently adapts between two distinct cases to eliminate cognitive load and prevent duplicate buttons:

1. **Case 1: Empty / Nothing to Generate**
   - When no barcode value has been entered and no bulk records exist:
   - Mobile displays the **"Show Preview"** button with a chevron expand/collapse indicator (`mobile-show-preview-btn`).
   - Tablet displays the **"Show preview" / "Hide preview"** accordion toggle button (`md-preview-toggle-btn`).
2. **Case 2: Input Content or Customizations Present**
   - When text is typed in the value field or bulk records are loaded:
   - The primary action immediately switches to **"Generate"** (`mobile-generate-btn` / `md-generate-btn`).
   - Clicking Generate renders the barcode, runs scan verification, and smoothly opens the preview.
3. **Snappy 0.05s (50ms) Animation**
   - Both opening and collapsing transitions use an ultra-responsive `0.05s ease-in-out` animation (`slide-fade-in` and accordion collapse), ensuring instantaneous feedback without UI lag or perceived delay.

---

## 3. Shell & Component Scaling Per Device

### 3.1 Tab Bar
- On `<640px` (`sm` and `xs`), `.card-tabs-header` switches to a strict 4-column grid (`grid-template-columns: repeat(4, 1fr)`).
- Each tab button stacks a 16px icon above a 11px label with `white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; display: block !important;`.
- Eliminates letter-by-letter vertical wrapping completely across all screen widths down to 320px.

### 3.2 Top Bar & Shell Cards
- `xs` (<400px): Outer frame double-padding is removed, card borders simplified, and topbar height reduced to 52px with 40px touch targets for navigation icons.
- `sm` / `md`: Topbar height is 56px.
- `lg` / `xl`: Full desktop topbar at 64px.

### 3.3 Bulk Output Formats & Section Headers
- Step numbers use 24px round badges on `xs` and 28px on larger screens.
- Section titles enforce `white-space: nowrap` and summary chips wrap to line 2 on `xs` to prevent title squishing.
- Output format selector on `xs` renders as a clean native dropdown (`<select class="ts-select output-select">`) instead of cramping 5 multi-word button chips into narrow viewports. On larger screens, the 5-button segmented control enforces `white-space: nowrap`.

### 3.4 Caption Styling Popover (Mobile Bottom Sheet)
- On desktop, opens as an anchored popup beside the preview toolbar.
- On `<640px`, renders as a full-width bottom sheet anchored to the bottom (`position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); backdrop-filter: blur(4px)`) with drag handle pill, LIVE badge, and nowrap Reset button (min 64px).
- Font size selector automatically displays as a native `<select class="toast-size-select">` on `xs` so all options (`Auto, 6 pt, 7 pt, 8 pt, 9 pt, 10 pt`) are accessible without horizontal clipping.
- Style row (`B, Mono, AA`) and alignment row (`L, C, R`) stack cleanly on `xs`.
- Color swatches expand to 34–36px touch targets with 8px spacing.
- Tapping outside on the overlay backdrop dismisses the bottom sheet.

### 3.5 Action Bar & Footer
- Sticky bottom action bar with `env(safe-area-inset-bottom)` safe area padding.
- Status and scan verification badges stack neatly on 2 lines with centered alignment.
- Warning notices ("Labels are small for this format...") are capped to 11px with text-overflow ellipsis so they never push buttons down.
- Action buttons (Print, Download count, More) fit on a single row without squeezing:
  - Print: `flex: 0 0 auto; min-height: 44px; padding: 0 12px;`
  - Download: `flex: 1 1 auto; min-height: 44px; padding: 0 12px;` (shows shortened `Download (N)`)
  - More: `flex: 0 0 44px; min-width: 44px; min-height: 44px;`

### 3.6 Form Grid Stacking & Input Ergonomics
- `.two-col-grid` in the Customize panel strictly stacks to 1 column on `<640px` and `xs`, ensuring Rotation and Border frame never get crammed side-by-side with truncated values.
- Form controls and inputs maintain 44px minimum touch targets and 16px font size on `xs` to prevent iOS zoom.
- "Customize Design" button on the Content tab is demoted to secondary outline styling on mobile, eliminating visual competition with the sticky Generate bar.

---

## 4. UI Element Standards & Contrast

- **Touch Targets**: Minimum `44px × 44px` on all buttons and interactive controls for `sm` and `xs`.
- **Focus Rings**: `2px solid var(--tool-accent, #2563EB); outline-offset: 2px;` on all focusable inputs, selects, and buttons.
- **Segmented Controls & Active Buttons**: Active selected segments and tab buttons use the tool's canonical accent-based blue (`var(--tool-accent, #2563EB)`) background with `#FFFFFF` text, achieving `>= 4.5:1` WCAG AA contrast against both dark surfaces (`#18191E`) and light surfaces (`#FFFFFF`).
- **Internal Container Scrolling**: Canvases and SVG preview wrappers scroll horizontally inside their container (`overflow-x: auto`), strictly preventing window-level sideways scrolling.

---

## 5. Verification & Testing

Acceptance tests for responsive tokens, device tiers, and breakpoint transitions are located in [`responsive-layout.spec.ts`](../../../../client/apps/tool-barcode-generator/src/config/responsive-layout.spec.ts).

Run tests:
```bash
cd client && npx vitest run apps/tool-barcode-generator/src/config/responsive-layout.spec.ts
```


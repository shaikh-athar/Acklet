---
tool: QR Generator
phase: 1
last-updated: 2026-10-20
status: Complete
---

# QR Generator — UI & Interaction Reference

## 1. Page Layout & Grid Architecture

The QR Generator occupies a responsive two-column grid (`.qr-workspace-grid`) styled with Acklet's emerald accent token (`[data-accent="emerald"]`).

```text
+--------------------------------------------------------------------------+
|  [⚡ Client-Side Utility]  [🛡️ Processed locally, no tracking]           |
|  QR Generator (Fraunces Display Heading)                                 |
|  Create, customize, and download high-resolution QR codes in seconds.    |
+--------------------------------------------------------------------------+
|  LEFT COLUMN (1.25fr)                 | RIGHT COLUMN (1fr)               |
|  +----------------------------------+ | +------------------------------+ |
|  | Input Panel                      | | | Preview Panel                | |
|  | - Content type tabs              | | | - Header & "Ready" badge     | |
|  | - Fast presets (URL/Email/Phone) | | | - Canvas Stage               | |
|  | - Textarea & char counter        | | |   (QR Image or Empty state)  | |
|  | - Live validation alert          | | | - Encoded Payload preview    | |
|  +----------------------------------+ | | - Dynamic Metadata Card      | |
|  | Customization Panel              | | |   (Version, byte count, bar) | |
|  | - Foreground/Background pickers  | | | - Download PNG Button        | |
|  | - Swap & preset swatch buttons   | | | - Privacy guarantee pill     | |
|  | - Contrast badge & warning alert | | +------------------------------+ |
|  | - Size range slider & presets    | |                                |
|  | - Error correction segmented btns| |                                |
|  +----------------------------------+ |                                |
+--------------------------------------------------------------------------+
```

---

## 2. Panels & Components

### 2.1 Header Row
- **Pill Badges**:
  - `Client-Side Utility`: Rendered with `--accent-soft` background, `--accent-strong` text, and border.
  - `Processed locally, no tracking`: Subtle dark badge (`--surface-2`) reinforcing zero-tracking privacy.
- **Title**: `Fraunces` serif font, `2.25rem` on desktop, `1.75rem` on mobile, high contrast white/dark text.
- **Subtitle**: `Inter` UI font, muted description (`--text-2`).

### 2.2 Input Panel (`<app-qr-input-panel>`)
- **Type Tabs**: Segmented button row allowing toggling between `Text`, `URL`, `Email`, and `Phone`. Active state uses `--accent-soft` and `--accent-strong`.
- **Quick Presets**: 3 chip buttons (`Email`, `Phone`, `URL`) that auto-populate standard sample payloads with proper protocols.
- **Content Textarea**: Accessible `<textarea>` bound to input signal. Focused with `--accent` ring.
- **Footer**: Character counter on right; inline red validation alert on left (`alert-triangle` icon + error text).

### 2.3 Customization Panel (`<app-qr-customization-panel>`)
- **Color Customizer (`<app-color-customizer>`)**:
  - Two input blocks for Foreground and Background colors.
  - Native `<input type="color">` square swatch paired with uppercase hex text field (`#000000`).
  - Swap button with `arrow-left-right` icon.
  - Presets: 4 quick pair buttons (`Classic`, `Emerald`, `Navy`, `Dark Mode`) displaying split color circles.
  - Contrast feedback card displaying numerical ratio, WCAG level, sample preview chip, and conditional red alert banner if contrast $< 2.5:1$.
- **Size Slider (`<app-size-slider>`)**:
  - Range slider (`100` to `2000px`, step `50px`) with custom emerald thumb styling.
  - Active size badge in top-right corner.
  - 4 quick preset buttons: `Small 150px`, `Medium 300px`, `Large 500px`, `XL 800px`.
- **Error Correction Selector (`<app-error-correction-selector>`)**:
  - 4 segmented radio buttons (`L`, `M`, `Q`, `H`).
  - Highlighted `★ Recommended` star on level `M`.
  - Contextual explanation paragraph updating on active selection.

### 2.4 Preview Panel (`<app-qr-preview-panel>`)
- **Canvas Stage Area**: High-contrast display background with pixel-crisp QR code rendering.
- **Live Payload Inspector**: Monospace box showing exact string passed to the encoder.
- **Metadata Card (`<app-qr-metadata-display>`)**:
  - 4-item grid: **Version**, **Capacity**, **Payload**, **Recovery**.
  - Animated emerald progress bar (`transition: width 0.3s ease`).
- **Download Action Button**: Primary emerald CTA (`hlmBtn`), disabled if input is empty or generating.

---

## 3. UI States

| State | Canvas Stage Display | Action Button State |
| :--- | :--- | :--- |
| **Empty State** | Dashed circle bubble with muted `qr-code` icon and guidance: *"No Content Entered"* | Disabled (`opacity: 0.45`, `cursor: not-allowed`) |
| **Generating State** | Translucent loading overlay with spinning `loader-2` icon and *"Generating QR code..."* | Disabled with loading indicator |
| **Ready / Success** | Pixelated QR code image with subtle elevation shadow + green "Ready" badge | Enabled with full hover elevation and emerald shadow |
| **Validation Error** | Red alert banner in input panel; preview stage retains empty state | Disabled |
| **Low Contrast** | Red warning box in customizer with alert icon; QR still renders but displays scanner caution | Enabled (allows user override) |

---

## 4. Keyboard Shortcuts & Accessibility

- **Tab Navigation**: Full tab sequence: Type selector $\rightarrow$ Presets $\rightarrow$ Textarea $\rightarrow$ Color pickers $\rightarrow$ Swap button $\rightarrow$ Color presets $\rightarrow$ Size slider $\rightarrow$ Size presets $\rightarrow$ Error correction $\rightarrow$ Download button.
- **Semantic Labels**: All inputs contain `<label for="...">` or `aria-label` attributes.
- **Focus Rings**: All interactive controls provide high-visibility `:focus-visible` rings using `--accent` (`#10B981`).
- **Contrast**: Guaranteed $\ge 4.5:1$ text-to-surface contrast across all cards.

---

## 5. Responsive Behavior

| Viewport Width | Layout Mode | Adjustments |
| :--- | :--- | :--- |
| **$> 900\text{px}$** (Desktop) | 2-column grid (`1.25fr : 1fr`) | Input and Customization on Left, Preview sticky on Right |
| **$\le 900\text{px}$** (Tablet & Mobile) | 1-column vertical stack | Input $\rightarrow$ Customization $\rightarrow$ Preview $\rightarrow$ Download |
| **$\le 520\text{px}$** (Mobile Small) | Compact vertical stack | Color pickers stack into 1 column; preset buttons wrap neatly |

---

## 6. Theme Tokens (Light & Dark)

All components resolve against Acklet's semantic CSS variables in `tokens.css`:
- `--surface`: `#1e2027` (Dark) / `#ffffff` (Light)
- `--surface-2`: `#252831` (Dark) / `#f8fafc` (Light)
- `--text`: `#fcfcfc` (Dark) / `#0f172a` (Light)
- `--text-2`: `rgba(255, 255, 255, 0.75)` (Dark) / `rgba(15, 23, 42, 0.75)` (Light)
- `--accent`: `#10B981` (Emerald Accent Override)
- `--accent-strong`: `#34d399` (Dark) / `#059669` (Light)
- `--accent-soft`: `rgba(16, 185, 129, 0.12)`
- `--accent-ink`: `#022c22`

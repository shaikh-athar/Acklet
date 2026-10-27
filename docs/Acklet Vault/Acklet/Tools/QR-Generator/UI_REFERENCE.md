---
tool: QR Generator
phase: 1
last-updated: 2026-10-20
status: Complete
---

# QR Generator — UI & Interaction Reference

## 1. Page Layout & Grid Architecture

The QR Generator occupies a dedicated `.qr-page-shell` layout with sticky ad gutters at $\ge 1280\text{px}$, a centered $1160\text{px}$ tool container, and a fixed side-by-side workspace:

```text
+-----------------------------------------------------------------------------------------+
| [Ad Gutter Left (>=1280px)]  |  CENTERED TOOL CONTAINER (max-width: 1160px)  |  [Ad Gutter Right] |
| 160-300px sticky 600px h     |                                               | 160-300px sticky  |
|                              |  UNIFIED WORKSPACE (~100vh)                   |                   |
|                              |  +---------------------+ +------------------+ |                   |
|                              |  | Left: Mode Nav Bar  | | Right: Fixed     | |                   |
|                              |  | [Content] [Customize| | Preview Panel    | |                   |
|                              |  | ------------------- | | (Fixed on right) | |                   |
|                              |  | Tab 1: Content Card | | - Live QR Stage  | |                   |
|                              |  |   or                | | - Auto-fix CTA   | |                   |
|                              |  | Tab 2: Customize Card| - Instant Format  | |                   |
|                              |  |   (Frames/Shapes/   | | - Download CTA   | |                   |
|                              |  |    Colors/Logo)     | |                  | |                   |
|                              |  | (Exact same height) | |                  | |                   |
|                              |  +---------------------+ +------------------+ |                   |
+-----------------------------------------------------------------------------------------+
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
- **Canvas Stage Area**: High-contrast display background with pixel-crisp QR code rendering and animated QR assemble reveal layer.
- **Transparent Logo & Vector Framing**: Logos render with natural transparency (no forced white plate); decorative frames auto-scale inner QR code via `innerViewBox` with high-contrast safety backings.
- **Live Payload Inspector**: Monospace box showing exact string passed to the encoder.
- **Metadata Card (`<app-qr-metadata-display>`)**:
  - 4-item grid: **Version**, **Capacity**, **Payload**, **Recovery**.
  - Animated emerald progress bar (`transition: width 0.3s ease`).
- **Scannability Diagnostics**: Unobtrusive; standard "High" scan confidence banner is suppressed to keep preview clean, surfacing only if scan issues are detected.
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

## 5. Responsive Behavior & Unified Workspace Flow

| Viewport Width | Layout Mode | Adjustments |
| :--- | :--- | :--- |
| **Desktop ($\ge 1024\text{px}$)** | **Unified Fixed Side-by-Side Flow** | • **Fixed QR Preview Card**: The Live QR Preview card stays securely pinned on the right side across all navigation modes.<br>• **Unified Left Column**: Hosts the mode navigation bar (`[Content]` / `[Customize]`). Both the Content Input card and Customize Design Studio mount inside Column 1, sharing identical dimensions, width, and height (`calc(100% - 42px)`) with smooth internal scrolling.<br>• **Quick Actions**: Includes quick PNG download, quick SVG export, and native quick Share button with `share-2` icon.<br>• **Sub-Tab Navigation**: Customization sub-tabs (Frames, Shapes, Colors, Logo) animate smoothly with micro-transitions without disrupting the fixed layout.<br>• **View QR Code Action**: Floating action button provides instant smooth scrolling back to the QR card if scrolled on narrower screens. |
| **Tablet Portrait ($\le 1023\text{px}$)** | 1-column responsive touch flow | Stacked panels with vertical scroll; touch-optimized tap targets, updated desktop-matching sidebar sheet, and horizontal swipe-in gesture from screen background to reveal navigation sidebar. |
| **Mobile ($\le 768\text{px}$)** | Full-Height 3-State Mobile Flow | • **Full Viewport Coverage**: `:host`, `.qr-page-shell`, `.qr-tool-container`, and views flex to 100% height without empty voids.<br>• **Content Type Selector Dropdown**: Centered dropdown trigger replaces horizontal scroll chips, providing instant type search and selection.<br>• **Assemble-Only QR Animation**: Generated QR displays exclusively via the assembling mosaic animation without pre-flashing the static output image.<br>• **Action Bar & Icons**: Summary card contains working `edit` icon with pencil indicator; bottom action bar provides Download, Share, and Copy buttons.<br>• **Sidebar Gesture**: Left edge/background swipe-in gesture opens the updated navigation sidebar, excluding interactive sliders, preview canvas, and inputs. |

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

---

## 7. Decorative Frames & Logo Embed Standards

### Decorative Frame Geometry & QR Containment
All 18 vector frame templates ([qr-frames.data.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/models/qr-frames.data.ts)) adhere to strict boundary containment:
- **Circular & Tapered Frames**:
  - `badge` (Award Badge): Inscribed inside `r=130` backing circle with `qrBox: { x: 78, y: 103, size: 164 }`. Max corner radius from center is $82 \times \sqrt{2} \approx 116\text{px} < 130\text{px}$, leaving 14px of quiet breathing margin with 0% corner protrusion.
  - `coffee-cup` (Coffee Cup): Inscribed within the tapered tumbler silhouette (`M 42 66 L 65 380 ...`) with `qrBox: { x: 77, y: 95, size: 166 }`. Maintains 18px+ inner margin on both sides at the narrowest point.
  - `gift-box` (Gift Present): Sits comfortably within the box body with `qrBox: { x: 65, y: 110, size: 190 }`, leaving 27px+ margins on left, right, and below the lid.
  - `ticket` (Event Ticket): Sits safely between the ticket notches with `qrBox: { x: 50, y: 45, size: 220 }` (25px margin to notches).
  - `sticker-peel` (Die-cut Sticker): Sized at `qrBox: { x: 45, y: 35, size: 210 }`, ending at $y=245$ well above the folded corner peel at $y=280$.
- **Coordinate Synchronization**: `template.qrBox` and `template.renderSvg` `<image>` tags share identical `x`, `y`, and `size` parameters to ensure that thumbnail grids, live vector preview, and raster exports remain 100% pixel-aligned.

### Logo Preset SVG Formatting
- **DOM SVG Insertion (`innerSvg`)**: SVG fragments inserted into HTML/DOM elements via Angular `innerHTML` must use unencoded hex color values (`stroke="#3b82f6"`, `fill="#10b981"`). Never use URL-encoded `%23` in DOM SVGs, as SVG parsers treat `%23` as an invalid color token, dropping strokes and defaulting fills to black.
- **Data URI (`dataUrl`)**: In standalone UTF-8 Data URIs (`data:image/svg+xml;utf8,...`), `#` must be URL-encoded as `%23` to prevent premature URL truncation.

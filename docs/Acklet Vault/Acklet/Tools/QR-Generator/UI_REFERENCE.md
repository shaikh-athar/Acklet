---
tool: QR Generator
phase: 3
last-updated: 2026-10-28
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
|                              |  | [Content][Customize | | Preview Panel    | |                   |
|                              |  |  [Dynamic Links]    | | (Fixed on right) | |                   |
|                              |  | ------------------- | | - Live Stage     | |                   |
|                              |  | Tab 1: Content Card | | - Verifier Badge | |                   |
|                              |  |   or                | | - EC Selector    | |                   |
|                              |  | Tab 2: Customize Card| - Size Chips     | |                   |
|                              |  |   (Frames/Shapes/   | | - Instant Export | |                   |
|                              |  |    Logo/Colors)     | |   (SVG/PNG/JPEG) | |                   |
|                              |  | (Exact same height) | |                  | |                   |
|                              |  +---------------------+ +------------------+ |                   |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Panels & Components

### 2.1 Workspace Mode Navigation Bar
- **Tab Buttons**:
  - `Content`: Primary data entry workspace.
  - `Customize`: Design studio for visual customization (displays active indicator dot when non-default styling is applied).
  - `Dynamic Links`: Management workspace for hosted short links (displays active count badge).

### 2.2 Content Input Card (`<app-input-panel>`)
- **QR Name Bar**: Editable text input at top of the content card allowing users to label and name their QR codes (e.g. "My Portfolio", "Office Wi-Fi") with one-click clear button.
- **Content Type Dropdown**: Centered trigger matching input width with:
  - Type icon badge and type title.
  - Short description subtitle.
  - Anchored dropdown popover with instant search filter across all 12 content types and keyboard arrow navigation.
- **Structured Content Forms**:
  - **URL**: Web address input with auto-prepend `https://` and expandable UTM parameter builder (`source`, `medium`, `campaign`, `term`, `content`).
  - **Plain Text**: Multi-line textarea with live character counter (`{{ count }} / 2,000`), byte counter, non-English multi-byte warning, and toggle for hosted Notes link mode.
  - **Email**: Fields for `To`, `Subject`, and `Body`, with progressive disclosure for `CC` and `BCC`.
  - **Phone & SMS**: Integrated country selector and international E.164 phone input (`<app-phone-input>`).
  - **Wi-Fi**: Network SSID, security dropdown (WPA/WPA2/WPA3, WEP, None), password input with reveal toggle, hidden network checkbox, and Enterprise 802.1x EAP settings.
  - **Location**: Latitude and longitude fields, Google Maps URL extractor, and venue label.
  - **Event**: Title, date and time pickers, all-day toggle, timezone selector, venue location, description, and repeat interval.
  - **vCard 3.0**: Structured fields for name, title, organization, phone, email, website, and address.
  - **Social**: Platform picker with preset icons and username / profile URL input (`<app-social-link-input>`).
  - **App Store**: App links for iOS and Android with automatic store URL normalization.
  - **Crypto**: Wallet address, coin selector (Bitcoin, Ethereum, Solana, Litecoin, Bitcoin Cash), amount, and payment memo.

### 2.3 Customize Design Card (`<app-qr-design-customizer>` & `<app-color-customizer>`)
Hosts 4 dedicated sub-tabs:
1. **Frame Sub-Tab**:
   - 18+ vector frame templates (`bottom-banner`, `top-header`, `polaroid`, `badge-pill`, `chat-bubble`, `tag`, `ticket`, `coffee-cup`, `gift-box`, etc.).
   - CTA ribbon text field with quick suggestion chips ("SCAN ME", "VISIT WEBSITE", "VIEW MENU", "CONNECT WI-FI", "SAVE CONTACT", "GET OFFER").
   - Frame background and text color pickers with high-contrast defaults.
2. **Shape Sub-Tab**:
   - 11 module dot patterns: `square`, `dots`, `rounded`, `extra-rounded`, `classy`, `classy-rounded`, `diamond`, `star`, `heart`, `cross`, `scanline`.
   - 8 corner square locator styles: `square`, `dot`, `extra-rounded`, `classy`, `classy-rounded`, `rounded`, `pinch`, `shield`.
   - 10 corner dot locator styles: `square`, `dot`, `rounded`, `extra-rounded`, `classy`, `classy-rounded`, `diamond`, `star`, `heart`, `cross`.
3. **Logo Sub-Tab**:
   - Drag-and-drop file upload zone (PNG, SVG, JPEG).
   - 20+ preset brand and social icons (WhatsApp, Instagram, X/Twitter, YouTube, LinkedIn, GitHub, Verified, Heart, Star, etc.).
   - Logo size slider (10% to 45%) and margin clearance slider.
   - Transparent background plate toggle.
   - Automatic Error Correction boost indicator badge.
4. **Color Sub-Tab**:
   - Color mode toggle: **Solid**, **Linear Gradient**, **Radial Gradient**.
   - Continuous angle rotation slider ($0^\circ$ to $360^\circ$).
   - Dual color stop inputs with native swatches and hex fields.
   - One-click Swap colors button.
   - Independent corner locator colors.
   - Curated gradient presets (Ocean Blue, Sunset Glow, Emerald Forest, Purple Dawn, Neon Cyber).
   - WCAG contrast feedback card displaying numerical ratio, compliance level (AAA, AA, Fail), and conditional $< 2.5:1$ scanner warning alert.

### 2.4 Preview Panel (`<app-preview-panel>`)
- **Canvas / SVG Stage**: Live rendering stage displaying pixel-crisp vector QR code with animated assemble mosaic effect layer.
- **Scannability Diagnostics Badge**: Automated in-browser decoding verification powered by `jsQR`. Displays calm confidence rating (**High**, **Medium**, **Low**) and one-click auto-fix button if scan issues are detected.
- **Error Correction Selector (`<app-error-correction-selector>`)**:
   - 4 segmented option buttons: `L (7%)`, `M (15% recommended)`, `Q (25%)`, `H (30%)`.
- **Size Selector**: Quick preset chips: `Small (256px)`, `Medium (512px)`, `Large (1024px)`, `Print (2048px)` alongside continuous slider.
- **Instant Export Actions**:
  - Primary button: **Download PNG**.
  - Dropdown menu: **Download SVG (Scalable Vector)** and **Download JPEG**.
  - **Copy Image**: Copies generated image blob directly to system clipboard.
  - **Share**: Opens native OS share sheet (`navigator.share`).
  - **History**: Opens drawer with recently generated QR codes saved in `localStorage`.

---

## 3. UI States

| State | Canvas Stage Display | Action Controls State |
| :--- | :--- | :--- |
| **Empty State** | Muted dashed container with `qr-code` icon and guidance: *"Enter content on the left to generate QR code"* | Export buttons disabled (`opacity: 0.45`, `cursor: not-allowed`) |
| **Generating State** | Translucent loading overlay with spinning `loader-2` icon and *"Updating QR code..."* | Export buttons temporarily disabled |
| **Ready / Scannable** | Pixel-crisp QR code with assemble animation, active preview, and "Verified Scannable" badge | All export buttons enabled with full hover elevation |
| **Validation Error** | Red inline banner below invalid form field; preview stage preserves previous valid code | Export buttons disabled until validation passes |
| **Low Contrast Warning** | Red alert banner in Color customizer (`ratio < 2.5:1`); preview stage renders code with scanner caution indicator | Export buttons remain enabled (allows intentional overrides) |
| **Scan Warning / Low Confidence** | Verifier badge displays amber/red warning with diagnostic tip and "Fix Automatically" button | Export enabled with warning |

---

## 4. Keyboard Shortcuts & Accessibility

- **Tab Navigation**: Full tab sequence: Mode nav $\rightarrow$ QR name $\rightarrow$ Content type dropdown $\rightarrow$ Form inputs $\rightarrow$ Customize sub-tabs $\rightarrow$ Style pickers $\rightarrow$ Export buttons.
- **Semantic HTML & ARIA**:
  - Mode and design sub-navs use `role="tablist"` and `role="tab"` with `aria-selected`.
  - Type dropdown uses `role="listbox"` with `aria-haspopup` and `aria-expanded`.
  - All form controls contain explicit `<label for="...">` or `aria-label`.
- **Focus Rings**: Interactive controls use `--accent` (`#3B82F6`) focus-visible rings with 2px offset.
- **High-Contrast Guarantee**: Text-to-surface contrast strictly satisfies $\ge 4.5:1$ across both Light and Dark themes.

---

## 5. Responsive Behavior & Unified Workspace Flow

| Viewport Width | Layout Mode | Adjustments |
| :--- | :--- | :--- |
| **Desktop ($\ge 1024\text{px}$)** | **Unified Fixed Side-by-Side Flow** | • **Fixed QR Preview Card**: Live Preview card stays pinned on the right side across all mode switches.<br>• **Unified Left Column**: Hosts Mode Nav Bar (`Content` / `Customize` / `Dynamic Links`). Content card and Customize Studio card share identical dimensions and width with smooth internal scrolling.<br>• **Quick Actions**: Download PNG, SVG, JPEG, and Copy Image accessible without scrolling.<br>• **Sub-Tab Navigation**: Customization sub-tabs (Frame, Shape, Logo, Color) animate smoothly with micro-transitions. |
| **Tablet Portrait ($\le 1023\text{px}$)** | 1-Column Responsive Touch Flow | Stacked panels with vertical scrolling, touch-optimized tap targets ($\ge 44\text{px}$), and swipe gestures. |
| **Mobile ($\le 768\text{px}$)** | Full-Height 3-State Mobile Flow | • **Full Viewport Coverage**: Studio cards and preview flex to 100% height without empty voids.<br>• **Type Selector Dropdown**: Centered dropdown replaces horizontal scroll chips, providing instant search.<br>• **Assemble-Only Animation**: QR displays cleanly with the mosaic assemble reveal.<br>• **Sticky Action Bar**: Bottom action bar provides quick Download, Share, and Copy buttons with haptic feedback (`HapticService`). |

---

## 6. Theme Tokens (Light & Dark)

All components resolve against Acklet's semantic CSS variables in `tokens.css`:
- **Typography**: Unified tool font **Scoutie Sans** (`font-family: 'Scoutie Sans', sans-serif;`).
- `--surface`: `#1e2027` (Dark) / `#ffffff` (Light)
- `--surface-2`: `#252831` (Dark) / `#f8fafc` (Light)
- `--text`: `#fcfcfc` (Dark) / `#0f172a` (Light)
- `--text-2`: `rgba(255, 255, 255, 0.75)` (Dark) / `rgba(15, 23, 42, 0.75)` (Light)
- `--accent`: `#3b82f6` (Canonical Blue Accent)
- `--accent-strong`: `#60a5fa` (Dark) / `#2563eb` (Light)
- `--accent-soft`: `rgba(59, 130, 246, 0.12)`
- `--accent-ink`: `#1e3a8a`

---

## 7. Decorative Frames & Logo Embed Standards

### Decorative Frame Geometry & QR Containment
All 18 vector frame templates ([qr-frames.data.ts](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/src/models/qr-frames.data.ts)) enforce strict boundary containment:
- **Quiet Zone Margin**: Every frame ensures a minimum 4-module quiet zone buffer around the QR code matrix to prevent locator pattern interference.
- **Coordinate Synchronization**: `template.qrBox` and `template.renderSvg` `<image>` elements share identical `x`, `y`, and `size` parameters to guarantee pixel-perfect alignment across vector SVG exports and raster PNG/JPEG canvas renders.

### Logo SVG Formatting
- **DOM SVG Insertion (`innerSvg`)**: SVG fragments inserted into HTML/DOM elements via Angular `innerHTML` use unencoded hex color values (`stroke="#3b82f6"`, `fill="#ffffff"`).
- **Standalone Data URIs (`dataUrl`)**: In standalone UTF-8 Data URIs (`data:image/svg+xml;utf8,...`), `#` is URL-encoded as `%23` to prevent premature URL truncation by browsers.

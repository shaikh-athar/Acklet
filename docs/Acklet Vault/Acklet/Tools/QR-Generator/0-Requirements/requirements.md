---
tool: QR Generator
phase: 1
last-updated: 2026-10-20
status: Complete
---

# QR Generator — Requirements

## Overview
QR Generator is a lightweight utility tool for creating, customizing, and downloading QR codes. MVP Phase 1 focuses on single QR generation with basic customization, real-time preview, and PNG download. No backend, no analytics, no logos (those are Phase 2+).

- **Target Users**: Developers, marketers, general users sharing links, contact info, phone numbers, email addresses.
- **Positioning**: Client-side processing for privacy ("Processed locally, no tracking").

---

## Phase 1: MVP Baseline

### Must-Have (Baseline)

#### Input
- [x] Accept content input (textarea)
- [x] Support 4 content types: Text, URL, Email, Phone
- [x] Type-aware UI (dropdown selector + placeholder text)
- [x] Character counter (shows content length)
- [x] Preset buttons for quick type switching (Email, Phone, URL)

#### Customization
- [x] Foreground color picker (dark module — default `#000000`)
- [x] Background color picker (light module — default `#FFFFFF`)
- [x] Size slider (100–2000px, default 300px, step 50px)
- [x] Preset size buttons (Small/Medium/Large/XL)
- [x] Error correction dropdown (L/M/Q/H, default M)
  - L: 7% recovery
  - M: 15% recovery (recommended)
  - Q: 25% recovery
  - H: 30% recovery
- [x] Contrast warning (highlight if foreground/background contrast < 2.5:1)

#### Preview
- [x] Real-time QR code rendering (updates instantly on input/customization change)
- [x] Metadata display:
  - QR version (1–40)
  - Max capacity (characters this version can hold)
  - Used capacity (current content length)
  - Usage % (visual progress bar)
- [x] Loading skeleton while generating

#### Output
- [x] Download button (PNG format only, Phase 1)
- [x] Filename format: `qr-code-{timestamp}.png` (e.g., `qr-code-1729440000000.png`)
- [x] Button disabled while generating or if no QR exists

#### UI & Layout
- [x] Two-column grid layout:
  - Left: Input panel + Customization panel
  - Right: Preview panel + Download action
- [x] Responsive: Single column on mobile (< 900px width)
- [x] Card-based design: Panels have surface background, border, border-radius 12px
- [x] Header with title "QR Generator" + subtitle "Processed locally, no tracking."
- [x] Consistent spacing (1.5–2rem gaps)

#### Theme & Styling
- [x] Acklet design system compliance:
  - Display font: Fraunces
  - UI font: Inter
  - Code font: JetBrains Mono
  - Color palette: Emerald accent (NOT ink-green) for QR tool override
  - Dark/light mode support via CSS variables
- [x] Accessible color contrast (≥ 4.5:1 for all text)
- [x] All inputs have associated labels (`<label for="">`)
- [x] Focus indicators visible (border change or outline)

#### Performance
- [x] Page load time: LCP < 2.5s
- [x] QR generation latency: < 500ms per change
- [x] Bundle size: < 150KB gzipped (QR Generator module)
- [x] No unnecessary re-renders (optimize change detection)

---

### Nice-to-Have (Phase 1 Extras)
- [ ] Contrast ratio display (numerical value, e.g., "21:1 WCAG AAA")
- [ ] Copy QR as data URI to clipboard
- [ ] Keyboard shortcuts (Cmd+S or Ctrl+S to download)
- [ ] Undo/redo for color changes
- [ ] Recent colors history (last 5 used)

---

## Phase 2: Advanced Customization & Batch
*Do NOT build in Phase 1. These are Phase 2 deliverables.*
- [ ] Logo upload (drag-drop, preview, size %, position)
- [ ] Module shapes (square, circle, diamond)
- [ ] Corner shapes (square, rounded, extra-rounded)
- [ ] Frames/borders (decorative border, CTA text like "Scan me!")
- [ ] Quiet zone adjustment (margin around QR)
- [ ] Additional input types: vCard, Wi-Fi (SSID+password), SMS, geolocation
- [ ] Batch generation (CSV/text list → multiple QR codes → ZIP download)
- [ ] History/localStorage (last 10 generated)
- [ ] Templates (pre-filled profiles: Business Card, Event, Promo, Wi-Fi)
- [ ] Output formats: SVG (templated), JPG, WebP, Base64

---

## Phase 3: Backend & Analytics
*Do NOT build in Phase 1. These are Phase 3 deliverables.*
- [ ] Backend QR generation (Spring Boot + ZXing)
- [ ] Database persistence (optional; store QR codes for sharing)
- [ ] Analytics (opt-in: scan logging, device type, geolocation)
- [ ] Analytics dashboard (scan counts, trends)
- [ ] Vector output (EPS via FreeHEP)
- [ ] Cloud storage (S3/GCS for logos, generated QR codes)
- [ ] Shareable links (public QR code links, optional expiration)
- [ ] URL shortening integration (with QR)

---

## Non-Functional Requirements

### Accessibility (WCAG 2.1 AA)
- [ ] All interactive elements keyboard-navigable (Tab, Enter, Space)
- [ ] Focus indicators visible on all inputs
- [ ] Color picker + fallback hex input (not color-dependent alone)
- [ ] Error/warning messages associated with form controls
- [ ] Contrast ratio text ≥ 4.5:1 on all backgrounds
- [ ] No flashing/strobing (no animations > 3Hz)

### Browser Support
- [ ] Chrome/Chromium (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (iOS Safari, Chrome mobile)

### Performance Targets
- [ ] Page load time (LCP): < 2.5s
- [ ] First Paint: < 1.5s
- [ ] Time to Interactive: < 4s
- [ ] Bundle size (gzipped): < 150KB
- [ ] QR generation: < 500ms per change

### Constraints
- [ ] Content max length: 2,953 characters (QR v40, alphanumeric mode)
- [ ] File size: PNG downloads ≤ 20KB each (typical QR 300x300px)
- [ ] Browser storage (Phase 2): localStorage only, no IndexedDB
- [ ] No external API calls in Phase 1 (pure client-side)
- [ ] No tracking/analytics in Phase 1

---

## Input Types & Formatting

| Type | Format | Example | Prefix | Validation |
| :--- | :--- | :--- | :--- | :--- |
| **Text** | Plain string | "Hello World" | (none) | Length ≤ 2953 |
| **URL** | HTTP(S) URI | https://example.com | `https://` | Valid URI domain |
| **Email** | RFC 5322 email | user@example.com | `mailto:` | Valid email format |
| **Phone** | E.164 format | +1234567890 | `tel:` | Digits only, ≥ 5 digits |
| **Wi-Fi** | MeCard/ZXing format | WIFI:S:OfficeNet;T:WPA;P:pass;; | `WIFI:` | Non-empty SSID |
| **vCard** | RFC 2426 vCard 3.0 | BEGIN:VCARD...END:VCARD | `BEGIN:VCARD` | Name required (FN/N) |
| **SMS** | SMSTO URI | SMSTO:+14155552671:Hello | `SMSTO:` | Valid phone, ≥ 5 digits |
| **Geo** | RFC 5870 URI | geo:37.7749,-122.4194?q=HQ | `geo:` | Lat [-90,90], Lng [-180,180] |

---

## Customization Options Detail

### Color Picker
- **Implementation**: Native `<input type="color">` + hex text input
- **Format**: Hex (`#RRGGBB`, e.g., `#000000`)
- **Contrast check**: If contrast < 2.5:1, show ⚠️ warning icon + tooltip
- **Tooltip content**: "Low contrast. Consider lighter/darker color for readability."
- **Preview box**: Show sample text with chosen colors

### Size Slider
- **Range**: 100–2000px
- **Step**: 50px
- **Default**: 300px
- **Preset buttons**:
  - Small: 150px
  - Medium: 300px
  - Large: 500px
  - XL: 800px
- **Display**: Show current size in label (e.g., "Size: 300px")

### Error Correction Level
- **L (7%)**: "Can recover ~7% damaged data. Default."
- **M (15%)**: "Can recover ~15% damaged data. Recommended."
- **Q (25%)**: "Can recover ~25% damaged data."
- **H (30%)**: "Can recover ~30% damaged data. Highest robustness."
- **Default**: M

### Metadata Display
- **QR Version**: Dynamically calculated based on content length + error correction (versions 1–40)
- **Capacity**: Max characters this version can hold (alphanumeric mode)
- **Used Capacity**: Current content length
- **Usage %**: `(used / capacity) * 100`, rounded
- **Progress bar**: Visual fill, colored with accent color

---

## Component & Service Architecture

### Components (8 total, standalone)
1. `QRGeneratorComponent` (main, orchestrates state)
2. `InputPanelComponent` (content input + type selector)
3. `PreviewPanelComponent` (wrapper for QR display + metadata)
   - `QRCanvasComponent` (renders QR image)
   - `MetadataDisplayComponent` (version, capacity, progress bar)
4. `CustomizationPanelComponent` (wrapper for customization)
   - `ColorCustomizerComponent` (foreground + background pickers)
   - `SizeSliderComponent` (size slider + presets)
   - `ErrorCorrectionSelectorComponent` (dropdown + tooltip)
5. `OutputPanelComponent` (wrapper for download)
   - `DownloadButtonComponent` (download logic)

### Services (2 total)
1. `QRGeneratorService`
   - `async generateQR(options): Promise<string>` → Data URL
   - `getMetadata(content, ec): QRMetadata` → Version, capacity, usage
   - `isValidContent(content, ec): boolean` → Content length validation
2. `ColorValidatorService`
   - `isValidHex(color): boolean` → Hex format validation
   - `hexToRgb(hex): {r, g, b} | null` → Color conversion
   - `contrastRatio(fg, bg): number` → WCAG formula
   - `hasLowContrast(fg, bg): boolean` → Contrast check (< 2.5:1)

---

## Data Flow
```
User Input (textarea)
  ↓
InputPanelComponent emits (contentChange)
  ↓
QRGeneratorComponent updates currentOptions.content
  ↓
QRGeneratorComponent calls generateQR() on service
  ↓
QRGeneratorService.generateQR() returns Data URL
  ↓
QRGeneratorComponent updates qrDataUrl
  ↓
QRCanvasComponent (bound to qrDataUrl) renders img
  ↓
User sees QR code live
[Same flow for color/size/EC changes via CustomizationPanel]

User clicks Download
  ↓
DownloadButtonComponent creates <a download>
  ↓
Browser saves qr-code-{timestamp}.png
```

---

## Testing Requirements

### Unit Tests
- [ ] `QRGeneratorService.generateQR()` produces valid data URL
- [ ] `QRGeneratorService.getMetadata()` returns correct version/capacity
- [ ] `QRGeneratorService.isValidContent()` validates length correctly
- [ ] `ColorValidatorService.contrastRatio()` calculates correctly (spot-check #000 on #FFF = 21:1)
- [ ] `ColorValidatorService.hasLowContrast()` flags low contrast
- [ ] Component inputs/outputs wired correctly
- **Coverage target**: 80%+ on services

### E2E Tests
- [ ] Input URL → QR generates → Metadata shows version 1 + capacity 41
- [ ] Change color → QR updates in < 500ms
- [ ] Change size → Image resizes, QR pattern stays valid
- [ ] Change error correction → Visual pattern changes (more/less white space)
- [ ] Download → File saves as PNG, decodable with phone camera
- [ ] Contrast warning appears when colors too similar
- [ ] All 4 input types produce valid QR codes

### Accessibility (WCAG 2.1 AA)
- [ ] All form inputs have `<label for="">`
- [ ] Tab navigation works (all interactive elements reachable)
- [ ] Focus indicators visible (≥ 3px border or outline)
- [ ] Color picker + hex input (not color-alone)
- [ ] Error/warning text associated with inputs (`aria-describedby` or nearby text)
- [ ] Contrast ratio ≥ 4.5:1 (text on background)
- [ ] No automatic focus trap (can Tab out of QR tool)

### Performance Tests
- [ ] LCP (Largest Contentful Paint): < 2.5s
- [ ] Bundle size (gzipped): < 150KB
- [ ] QR generation per keystroke: < 500ms
- [ ] No layout shift (CLS < 0.1)
- [ ] Smooth animations (60fps, no jank)

---

## Libraries & Dependencies

| Library | Version | Purpose | Why This One? |
| :--- | :--- | :--- | :--- |
| `qrcode` | `^1.5.3` | QR generation | Lightweight, zero deps, native JS, client-side |
| `@angular/core` | `^18.x` | Framework | Already in use |
| `@angular/forms` | `^18.x` | Form handling | ReactiveFormsModule or FormsModule |
| `@angular/cdk` | `^18.x` | UI utilities | Already in Acklet (reuse) |
| `spartan/ui` | `^18.x` | UI components | Already in Acklet (consistency) |
| `lucide-angular`| `^0.x.x` | Icons | Already in Acklet |
| `@angular/common` | `^18.x` | Common directives | Already in use |

---

## Success Metrics
- **Functional**:
  - ✅ QR generates for all 4 input types (TEXT, URL, EMAIL, PHONE)
  - ✅ Colors customizable with live preview
  - ✅ Contrast warning appears when appropriate
  - ✅ Size slider works smoothly
  - ✅ Error correction level selectable
  - ✅ Download button saves valid, decodable PNG
  - ✅ Metadata accurate (version, capacity, usage %)
- **UX**:
  - ✅ Tool loads in < 2.5s LCP
  - ✅ QR preview updates in < 500ms per change
  - ✅ Mobile layout responsive (single column on < 900px)
  - ✅ No visual jank or layout shift
- **Design**:
  - ✅ Emerald accent used consistently (not ink-green)
  - ✅ Fraunces font for headings, Inter for body
  - ✅ Dark/light mode compatible
  - ✅ Spacing matches Acklet guidelines
- **Quality**:
  - ✅ 80%+ code coverage on services
  - ✅ E2E flow passes on desktop + mobile
  - ✅ WCAG 2.1 AA compliance verified
  - ✅ All unit & accessibility tests pass

---

## Sign-Off
- **Product**: Athar (2026-10-20) ✅ Approved
- **Status**: Ready for Development
- **Timeline**: Week 1-2

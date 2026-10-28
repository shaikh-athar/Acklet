---
tool: QR Generator
phase: 3
last-updated: 2026-10-28
status: Complete
---

# QR Generator — Requirements Specification

## 1. Overview
QR Generator is an enterprise-grade utility tool for creating, customizing, verifying, and exporting QR codes. Built in compliance with the **Canonical Acklet Design System**, it combines 100% private in-browser generation with an optional Spring Boot backend for privacy-preserving dynamic short links (`/q/{code}`) and device-aware mobile routing.

- **Target Users**: Developers, marketers, businesses, and general users generating links, Wi-Fi access tokens, digital business cards, events, and plain text notes.
- **Positioning**: Zero telemetry, client-side default processing (*"100% Client-Side • Zero Telemetry"*).
- **Tool Accent**: Registered **Blue Accent** (`BLUE_ACCENT`: `#3B82F6` dark / `#2563EB` light).
- **Tool Typography**: Unified **Scoutie Sans** (`font-family: 'Scoutie Sans', sans-serif;`).

---

## 2. Functional Requirements Checklist

### 2.1 Content Input & Formats (12 Types)
- [x] Accept content input with live 250ms debounced reactive signal processing
- [x] Support 12 complete content types:
  - **Website URL**: Protocol normalization, auto-`https://`, UTM parameter builder
  - **Plain Text**: Character/byte counter, direct static encoding vs hosted Notes shortlink mode
  - **Email**: RFC 5322 `mailto:` schema with `to`, `cc`, `bcc`, `subject`, and `body`
  - **Phone Call**: E.164 parsing and international validation via `libphonenumber-js`
  - **SMS Message**: Direct `smsto:` / `sms:` URI generator with recipient and text
  - **Wi-Fi**: ZXing standard for WPA/WPA2/WPA3, WEP, unencrypted, hidden SSIDs, and Enterprise 802.1x EAP
  - **Location / Geo**: RFC 5870 `geo:` URI, coordinates, Apple Maps, and Google Maps URL extraction
  - **Calendar Event**: RFC 5545 iCalendar (`VEVENT`) with 75-octet line folding, alarms, and recurrence rules
  - **vCard 3.0**: RFC 2426 format with UTF-8 character encoding and structured address fields
  - **Social Profile**: 20+ preset platforms (Instagram, X, LinkedIn, TikTok, YouTube, WhatsApp, GitHub, etc.)
  - **App Store**: Smart mobile links routing between iOS App Store and Google Play with fallback
  - **Crypto Wallet**: BIP21 / EIP-681 URIs for Bitcoin, Ethereum, Solana, Litecoin, and Bitcoin Cash
- [x] Centered content type dropdown selector trigger with instant search popover and icons
- [x] Pre-filled sample workflows (URL, Wi-Fi, vCard, Event, Crypto)

### 2.2 Visual Customization Studio
- [x] **Colors & Gradients**:
  - Solid Color mode (foreground and background swatches with hex normalization)
  - Linear Gradient mode with 0°–360° rotation angle slider and dual color stops
  - Radial Gradient mode
  - Curated gradient presets (Ocean Blue, Sunset Glow, Emerald Forest, Purple Dawn, Neon Cyber)
  - Independent corner locator outer square and inner dot color controls
  - One-click Swap colors button
- [x] **Shapes & Geometry**:
  - 11 module dot patterns: `square`, `dots`, `rounded`, `extra-rounded`, `classy`, `classy-rounded`, `diamond`, `star`, `heart`, `cross`, `scanline`
  - 8 corner square locator styles: `square`, `dot`, `extra-rounded`, `classy`, `classy-rounded`, `rounded`, `pinch`, `shield`
  - 10 corner dot locator styles: `square`, `dot`, `rounded`, `extra-rounded`, `classy`, `classy-rounded`, `diamond`, `star`, `heart`, `cross`
- [x] **Decorative CTA Frames**:
  - 18+ vector frame styles (`bottom-banner`, `top-header`, `polaroid`, `badge-pill`, `chat-bubble`, `tag`, `ticket`, `coffee-cup`, etc.)
  - Editable CTA ribbon text with quick suggestion chips ("SCAN ME", "VISIT WEBSITE", "CONNECT WI-FI", etc.)
  - Frame background and text color pickers with high-contrast defaults
- [x] **Logo & Brand Embedding**:
  - Drag-and-drop file upload zone (PNG, SVG, JPEG)
  - 20+ preset brand and social icons
  - Logo size slider (10% to 45%) and margin clearance slider
  - Transparent logo background plate toggle
  - Automatic Error Correction boost elevating recovery to Level H or Q upon logo insertion
- [x] **Resolution & Sizing**:
  - Continuous range slider (100–2000px, 50px step)
  - 4 quick preset chips: Small (256px), Medium (512px), Large (1024px), Print (2048px)
- [x] **Error Correction Levels**:
  - Segmented buttons for L (~7%), M (~15% recommended), Q (~25%), H (~30%)

### 2.3 Live Preview & Verification
- [x] Real-time rendering stage with vector SVG preview and mosaic assemble animation
- [x] Automated in-browser multi-pass decodability verifier via `jsQR` (Standard, Contrast-Stretched, Inverted, Center Crop)
- [x] Calm scan confidence badge (High, Medium, Low) with diagnostic tips and one-click auto-fix
- [x] Real-time ISO/IEC 18004 metadata calculation (Version 1–40, Capacity, Used Bytes, Usage progress bar)
- [x] Mathematical WCAG relative luminance contrast guard with scanner warning alert when ratio $< 2.5:1$

### 2.4 Multi-Format Export & Actions
- [x] Pure vector SVG export (`.svg`) via `qr-svg-renderer.ts`
- [x] High-resolution lossless PNG export (`.png`)
- [x] Standard JPEG export (`.jpeg`)
- [x] Direct image blob clipboard copy (`navigator.clipboard.write`)
- [x] Native Web Share API integration
- [x] Batch generation modal from CSV / text list with live progress bar and ZIP download (`jszip`)
- [x] History drawer with `localStorage` persistence (up to 8 items, deduplicated)

### 2.5 Dynamic QR Subsystem (Spring Boot 3.4.1 Backend)
- [x] Shortlink resolver at `GET /q/{code}` with HTTP 302/307 redirects and Base62 slugs
- [x] Device-aware intelligent routing (iOS vs Android vs Desktop)
- [x] Anonymous 256-bit manage key authorization stored as SHA-256 hashes (zero account requirement)
- [x] Dynamic QR management drawer with inline URL editing, pause/resume, and analytics
- [x] Privacy-preserving scan telemetry using salted daily visitor hashes (`SHA-256(ip + salt + date)`)
- [x] Hosted dynamic landing page viewer at `/tools/qr-generator/view/:code` (PDF, Menu, Coupon, vCard, Multi-URL)
- [x] Notes viewer at `/tools/qr-generator/notes/:code` with Copy, Share to Notes, and Download .txt
- [x] Passcode gate for PIN-protected private hosted dynamic QR codes

---

## 3. Non-Functional Requirements & Performance Targets

### 3.1 Accessibility (WCAG 2.1 AA)
- [x] All interactive controls fully keyboard navigable (Tab, Shift+Tab, Enter, Space, Escape, Arrows)
- [x] Semantic ARIA roles (`role="tablist"`, `role="tab"`, `role="listbox"`, `aria-selected`, `aria-expanded`)
- [x] High-visibility `:focus-visible` rings using `--accent` (`#3B82F6`)
- [x] Text-to-surface contrast strictly satisfies $\ge 4.5:1$ across both Dark and Light themes
- [x] Icons always accompanied by descriptive labels or `aria-label` attributes

### 3.2 Performance Targets
- [x] QR matrix calculation latency: $< 20\text{ ms}$ for typical payloads
- [x] Live UI update frame rate: Stable 60 FPS under debounced 250ms stream
- [x] Vector SVG export: Instant client-side download without network requests
- [x] Largest Contentful Paint (LCP): $< 1.8\text{ s}$

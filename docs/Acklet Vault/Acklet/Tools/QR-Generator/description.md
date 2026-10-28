---
tool: QR Generator
phase: 3
last-updated: 2026-10-28
status: Complete
---

# QR Generator — Functional Description

## 1. Purpose

**QR Generator by Acklet** is an enterprise-grade, browser-native utility designed to instantly convert structured data, hyperlinks, plain text notes, contact cards, and hosted assets into high-resolution, standards-compliant Quick Response (QR) codes. It unifies real-time vector SVG rendering, mathematical WCAG color contrast validation, Reed-Solomon error correction tuning, module and corner shape styling, decorative CTA frames, logo embedding with automatic error correction boost, camera-grade in-browser decodability verification via `jsQR`, and an optional Spring Boot backend for privacy-preserving hosted dynamic short links (`/q/{code}`).

---

## 2. User Problem

Modern digital workflows frequently require bridge-building between physical media and digital destinations. Traditional online QR generators present severe friction:
1. **Privacy & Tracking Risks**: Third-party generators often force all codes through proprietary tracking redirects, log user IP addresses, or store confidential payloads on unvetted servers.
2. **Hidden Paywalls & Artificial Expirations**: Free tools regularly generate "trial" dynamic links that break after 14 days unless expensive monthly subscriptions are purchased.
3. **Scannability Failures & Print Waste**: Poor contrast, uncalibrated module density, or careless logo placement results in codes that fail to decode with mobile cameras in ambient light, wasting substantial print and signage budgets.
4. **Generic Aesthetic & Lack of Branding**: Standard square black-and-white grids lack visual appeal and clear calls-to-action, drastically reducing scan conversion rates.

**Acklet QR Generator** eliminates these bottlenecks by executing static generation 100% inside browser memory without backend calls, providing pre-flight camera verification, supporting high-converting decorative frames, and offering transparent, anonymous dynamic short links with zero forced account creation.

---

## 3. Core Behavior

- **Real-Time Reactive Generation**: As the user types content, adjusts color gradients, or modifies frame shapes, the QR code matrix is calculated and rendered onto an SVG/canvas stage via a 250ms debounced RxJS stream.
- **Dual Processing Architecture**:
  - **Direct Static Encoding**: Directly encodes the literal payload (e.g. raw text, `mailto:`, `WIFI:`, `tel:`, vCard 3.0). Generates permanent, unexpirable QR codes that require zero network egress.
  - **Hosted Dynamic Short Links**: Backed by Spring Boot 3.4.1 for short URLs (`/q/{code}`). Features anonymous 256-bit manage keys (stored as SHA-256 hashes), device-aware routing (iOS vs Android vs Desktop), and hosted landing pages for PDF documents, restaurant menus, coupons, and business cards.
- **Automated Multi-Pass Decodability Verifier**: Incorporates `QRVerifierService` powered by `jsQR`. Executes a 4-pass in-browser decoding test (Standard, Contrast-Stretched Histogram Binarization, Inverted Luminance, and Center-Cropped Decode) to guarantee physical camera scannability before export, surfacing a calm confidence rating (High, Medium, Low) and auto-fix suggestions.
- **Automatic Error Correction Boost**: Uploading a logo or selecting a brand icon automatically raises error correction to Level H (30%) or Level Q (25%) via `qr-auto-ec.util.ts`, ensuring that center-obscured data modules do not disrupt decoding.
- **WCAG Contrast Guard**: Mathematical calculation of relative luminance verifies that foreground and background colors satisfy safe camera scannability thresholds (warning triggered if contrast ratio drops below $2.5:1$).
- **Dynamic Capacity Metering**: Real-time evaluation of ISO/IEC 18004 capacity calculates the minimum version required (1–40), maximum byte capacity, and percentage used with an animated visual meter.

---

## 4. Supported Inputs (12 Content Types)

| Content Type | Format / Protocol | Example Payload | Key Features & RFC Standards |
| :--- | :--- | :--- | :--- |
| **Website URL** | HTTP / HTTPS URI | `https://acklet.com/resources` | Auto-prepends `https://`; integrated UTM parameter builder (`source`, `medium`, `campaign`, `term`, `content`). |
| **Plain Text** | UTF-8 Raw String or Hosted Link | `Passcode: 8492` or `/q/xyz123` | Dual mode: direct static encoding (up to 2,000 chars / 2,300 UTF-8 bytes) or hosted shortlink resolving to mobile-first Notes viewer at `/tools/qr-generator/notes/:code`. |
| **Email** | RFC 5322 / `mailto:` URI | `mailto:contact@acklet.com?subject=Hello` | Pre-addressed draft supporting `to`, `cc`, `bcc`, `subject`, and multi-line `body`. |
| **Phone Call** | E.164 / `tel:` URI | `tel:+14155552671` | International parsing and validation via `libphonenumber-js` with country code selector. |
| **SMS Message** | `smsto:` / `sms:` URI | `smsto:+14155552671:Welcome` | Direct SMS dispatch prompt with recipient number and pre-filled message text. |
| **Wi-Fi Network** | ZXing Standard String | `WIFI:S:Guest-Net;T:WPA;P:Secret2026;;` | Supports WPA/WPA2/WPA3, WEP, unencrypted networks, hidden SSIDs, and Enterprise 802.1x EAP (PEAP/TLS). |
| **Location / Geo** | RFC 5870 `geo:` URI | `geo:37.7749,-122.4194?q=San+Francisco` | Latitude and longitude coordinates with Google Maps and Apple Maps URL extraction. |
| **Calendar Event** | RFC 5545 iCalendar (`VEVENT`) | `BEGIN:VCALENDAR...SUMMARY:Sync...` | Start/end dates, all-day toggle, timezones, venue location, description, reminders, and repeat rules. |
| **vCard 3.0** | RFC 2426 vCard & MECARD | `BEGIN:VCARD\nVERSION:3.0\nFN:Alex...` | Structured digital business card with full name, organization, job title, phone numbers, email, website, and postal address. |
| **Social Profile** | Canonical Social URI | `https://instagram.com/acklet` | 20+ preset platforms (Instagram, X, LinkedIn, TikTok, YouTube, WhatsApp, GitHub, etc.) with handle extraction. |
| **App Store** | Smart Mobile Redirect Link | `https://apps.apple.com/...` | Dual-platform routing: normalizes iOS App Store and Google Play links with fallback for desktop browsers. |
| **Crypto Wallet** | BIP21 / EIP-681 URIs | `bitcoin:1A1zP1eP5QG...?amount=0.05` | Direct payments for Bitcoin, Ethereum, Solana, Litecoin, and Bitcoin Cash with amounts and memos. |

---

## 5. Supported Outputs

- **Live On-Screen Vector Stage**: High-DPI crisp SVG preview with animated assemble reveal layer and dark/light stage background.
- **Scalable Vector SVG (`.svg`)**: Pure XML vector graphic generated via `qr-svg-renderer.ts`, maintaining infinite resolution for print signage, billboards, and laser cutters.
- **High-Resolution Lossless PNG (`.png`)**: Canvas-rendered raster export optimized for websites, emails, presentations, and documents.
- **Standard JPEG (`.jpeg`)**: Compressed raster export with clean solid background.
- **Direct Image Clipboard Copy**: One-click asynchronous copy of the generated image blob directly to the OS clipboard (`navigator.clipboard.write`).
- **Flexible Pixel Dimensions**: Preset buttons for **Small (256px)**, **Medium (512px)**, **Large (1024px)**, and **Print (2048px)**, alongside a continuous slider from 100px to 2,000px.

---

## 6. Important Constraints & Boundaries

- **Static Matrix Bounds**: Governed by ISO/IEC 18004 QR Code Version 40 (maximum 2,953 alphanumeric characters or 1,273 binary bytes at Error Correction Level H).
- **Safe Logo Area**: Logo scaling factor is constrained to 10%–45% of the total QR area, with guaranteed quiet margin buffers to preserve scannability.
- **Frame Containment**: All 18 vector frame styles enforce strict inner quiet zones ($\ge 4$ modules) around the QR matrix to prevent locator pattern clipping.
- **Dynamic Link Scheme Validation**: Shortlink targets strictly enforce safe protocols (`http://` and `https://`), explicitly rejecting hazardous schemes (`javascript:`, `data:`, `file:`).

---

## 7. Processing Model

```text
User Input / Customization / Preset
       ↓
InputPanel / CustomizationPanel / DynamicLinks
       ↓ (Signals & EventEmitters)
QRGeneratorComponent (State Signals)
       ↓ (Debounce 250ms)
QRGeneratorService.generate(content, options)
       ├── qr-payload-builders.ts (RFC normalization & escaping)
       ├── qr-auto-ec.util.ts (Auto EC boost to H/Q on logo upload)
       ├── qr-svg-renderer.ts (Vector SVG generation with custom shapes & frames)
       └── QRCodeStyling (Raster Canvas generation)
       ↓
QRVerifierService.verify(canvasOrSvg, expectedPayload)
       ├── Pass 1: Standard jsQR decode
       ├── Pass 2: Contrast-stretched histogram binarization
       ├── Pass 3: Luminance inverted decode
       └── Pass 4: Center crop decode
       ↓
Live PreviewPanel & Instant Export (.svg / .png / .jpeg / clipboard)
```

1. Form inputs update reactive Angular signals inside `QRGeneratorComponent`.
2. An RxJS subject (`inputChange$`) debounces generation invocations at 250ms to ensure 60 FPS UI performance during rapid typing or slider adjustments.
3. Content is validated against type-specific RFC rules and normalized (CRLF line endings, URL schemes, phone E.164 formats).
4. `qr-svg-renderer.ts` and `QRCodeStyling` execute synchronously in the browser, rendering the QR code in $< 20\text{ ms}$.
5. `QRVerifierService` runs an automated background decoding check using `jsQR`, updating the scannability badge without blocking the UI.

---

## 8. Privacy Model

- **Zero Network Egress by Default**: All direct static QR generation, vector rendering, shape styling, color calculations, and image downloads occur 100% locally on the user's device. No data is sent over the network.
- **Anonymous Dynamic QR Management**: For users opting into dynamic short links, authentication is handled via a private 256-bit cryptographic manage key stored exclusively in browser `localStorage`. No email registration, account signup, or password creation is required.
- **Zero Raw PII Storage**: The Spring Boot telemetry pipeline never persists raw IP addresses. Scan counts are aggregated using salted daily one-way hashes (`SHA-256(ip + salt + date)`), fully honoring Do Not Track (`DNT: 1`) and Global Privacy Control (`Sec-GPC: 1`).
- **Privacy Badge Guarantee**: Prominently verified in the UI shell with the platform badge: *"100% Client-Side • Zero Telemetry"*.

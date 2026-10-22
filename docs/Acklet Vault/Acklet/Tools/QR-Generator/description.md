---
tool: QR Generator
phase: 1
last-updated: 2026-10-20
status: Complete
---

# QR Generator — Functional Description

## 1. Purpose

**QR Generator by Acklet** is a high-speed, browser-native utility designed to instantly convert text, hyperlinks, email actions, and telephone numbers into high-resolution, standards-compliant Quick Response (QR) codes. It provides real-time customization (dual-tone colors, resolution scaling, and Reed-Solomon error correction levels) paired with dynamic capacity inspection, all running 100% locally within the client's browser.

---

## 2. User Problem

Modern digital workflows frequently require sharing URLs, contact details, or text payloads with mobile devices and physical audiences. Existing web-based QR generators introduce severe friction:
1. **Privacy & Tracking Risks**: Many online generators route payloads through tracking redirects, log IP addresses, or store user data on remote databases.
2. **Hidden Paywalls & Expirations**: Free tools often create "dynamic" QR codes that deactivate after trial periods unless subscriptions are purchased.
3. **Sluggish Interaction**: Heavy server-side rendering loops introduce delay between typing content and seeing the updated QR code.
4. **Poor Scannability**: Unmonitored user color choices often result in low-contrast codes that camera scanners fail to decode in ambient light.

**Acklet QR Generator** eliminates these bottlenecks by executing static, direct QR matrix generation inside browser memory without backend calls, redirects, or telemetry.

---

## 3. Core Behavior

- **Real-Time Generation**: As the user types content or adjusts settings, the QR code matrix is calculated and rendered onto a preview canvas via a 250ms debounced RxJS stream.
- **Direct Payloads**: QR codes encode the exact literal payload (e.g. `https://acklet.com`, `mailto:...`, `tel:...`). They are permanent static codes with no intermediary redirects or expiration dates.
- **Contrast Guard**: Mathematical calculation of relative luminance verifies that foreground and background contrast satisfies safe camera scannability thresholds (warning triggered if $< 2.5:1$).
- **Dynamic Capacity Metering**: Real-time evaluation of ISO/IEC 18004 capacity calculates the minimum version required (1–40), maximum byte capacity, and percentage used with an animated visual meter.

---

## 4. Supported Inputs

| Content Type | Format / Protocol | Example | Validation Rules |
| :--- | :--- | :--- | :--- |
| **Text** | Raw plain UTF-8 text | `Meeting room passcode: 8492` | 1 to 2,953 alphanumeric characters |
| **URL** | Web URL (`http://` or `https://`) | `https://acklet.com` | Strict URL structure; auto-prepends `https://` if omitted |
| **Email** | RFC 5322 Email / `mailto:` URI | `support@acklet.com` | Standard email regex validation (`user@domain.tld`) |
| **Phone** | E.164 / `tel:` URI | `+1 555 019 2834` | Digits, optional leading `+`, spaces/hyphens allowed |

---

## 5. Supported Outputs

- **Live On-Screen Preview**: High-DPI canvas/image rendering with pixel-crisp display and white module padding.
- **Direct PNG Download**: Standard lossless PNG output file named `qr-code-<timestamp>.png` (e.g., `qr-code-1771501234567.png`).
- **Configurable Resolutions**: Native pixel dimensions ranging from 100px up to 2,000px square.

---

## 6. Important Constraints

- **Maximum Payload Capacity**: Governed by QR Code Version 40 (maximum 2,953 characters under alphanumeric encoding or 1,273 characters under 8-bit binary at Error Correction level H).
- **Client-Side Only**: Does not support server-side rendering, vector EPS generation, or batch CSV uploads in Phase 1.
- **Static Encoding**: Does not generate editable redirect URLs (dynamic QR codes).

---

## 7. Processing Model

```text
User Keystroke / Slider / Color
       ↓
InputPanel / CustomizationPanel
       ↓ (EventEmitter)
QRGeneratorComponent (State Signals)
       ↓ (Debounce 250ms)
QRGeneratorService.generate(content, options)
       ↓
qrcode.toDataURL() (Canvas-based matrix calculation)
       ↓
Live PreviewPanel & Direct PNG Export
```

1. Inputs trigger signals inside `QRGeneratorComponent`.
2. A single RxJS subject (`inputChange$`) debounces generation invocations at 250ms to maintain 60 FPS UI performance during rapid typing or slider dragging.
3. Content is validated and prefixed (`mailto:`, `tel:`).
4. `qrcode.toDataURL()` executes synchronously on the browser main thread, completing in $< 15\text{ ms}$ for typical payloads.

---

## 8. Privacy Model

- **Zero Network Egress**: The tool makes zero outbound network requests for QR matrix generation, color checking, or image downloading.
- **No Local Storage Persistence**: Content payloads and generated tokens are held strictly in transient component memory; closing or refreshing the tab wipes all data.
- **Privacy Badge**: Marked in the UI with the platform guarantee: *"Processed locally, no tracking"*.

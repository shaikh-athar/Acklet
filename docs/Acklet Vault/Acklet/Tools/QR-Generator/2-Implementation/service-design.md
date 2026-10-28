---
tool: QR Generator
phase: 3
last-updated: 2026-10-28
status: Complete
---

# QR Generator — Service Architecture & Service Design

This document details the frontend and backend service architecture, utility modules, and data flow pipelines across all phases of the QR Generator tool.

---

## 1. Frontend Services Inventory & Responsibilities

| Service / Module | File Path | Scope | Purpose |
| :--- | :--- | :--- | :--- |
| **`QRGeneratorService`** | `client/apps/tool-qr-generator/src/services/qr-generator.service.ts` | Provided in root | Orchestrates QR matrix generation, vector SVG rendering via `qr-svg-renderer.ts`, raster canvas exports via `qr-code-styling`, decorative frame wrapping, and asynchronous batch ZIP packaging via `jszip`. |
| **`QRPayloadBuilders`** | `client/apps/tool-qr-generator/src/services/qr-payload-builders.ts` | Pure functions | Pure functional builders and validators for all 12 content types with strict RFC escaping, line folding, CRLF normalization, and coordinate parsing. |
| **`QRVerifierService`** | `client/apps/tool-qr-generator/src/services/qr-verifier.service.ts` | Provided in root | Automated 4-pass camera barcode decoder powered by `jsQR`. Executes Standard, Contrast-Stretched, Inverted Luminance, and Center Crop decoding passes with diagnostic scannability confidence evaluation. |
| **`SmartLinkService`** | `client/apps/tool-qr-generator/src/services/smart-link.service.ts` | Provided in root | Manages client-side dynamic links, device-aware redirect URLs (iOS vs Android vs Fallback), and short link generation via `POST /api/v1/qr-links`. |
| **`QrDynamicService`** | `client/apps/tool-qr-generator/src/services/qr-dynamic.service.ts` | Provided in root | REST client for dynamic QR endpoints (`/api/v1/qr/**`), managing anonymous 256-bit manage keys in browser `localStorage`. |
| **`ColorValidatorService`** | `client/apps/tool-qr-generator/src/services/color-validator.service.ts` | Provided in root | Validates hex codes, computes relative luminance ($L = 0.2126R + 0.7152G + 0.0722B$), evaluates WCAG contrast ratios, and flags $< 2.5:1$ scanner warnings. |
| **`QRHistoryService`** | `client/apps/tool-qr-generator/src/services/qr-history.service.ts` | Provided in root | Persists recently generated QR codes in `localStorage` (up to 8 items) with reactive Angular signals and deduplication. |
| **`QrNotesService`** | `client/apps/tool-qr-generator/src/services/qr-notes.service.ts` | Provided in root | Handles short link generation for large plain text notes and coordinates with the mobile Notes viewer at `/tools/qr-generator/notes/:code`. |

---

## 2. Frontend Utility Modules Inventory

| Utility Module | File Path | Purpose |
| :--- | :--- | :--- |
| **`qr-svg-renderer.ts`** | `src/utils/qr-svg-renderer.ts` | Scalable vector SVG renderer with custom dot matrix geometries, corner locator squares, corner dots, gradients, and frame composition. |
| **`qr-auto-ec.util.ts`** | `src/utils/qr-auto-ec.util.ts` | Mathematical calculation that automatically elevates Reed-Solomon Error Correction to Level H or Q when logos or center badges are embedded. |
| **`qr-shapes.data.ts`** | `src/utils/qr-shapes.data.ts` | Preset catalogs for 11 dot styles, 8 corner locator squares, and 10 corner dots with SVG path generation functions. |
| **`qr-frames.data.ts`** | `src/models/qr-frames.data.ts` | Geometry and SVG templates for 18+ vector frames (`bottom-banner`, `top-header`, `polaroid`, `badge-pill`, `chat-bubble`, etc.) with strict quiet zone containment. |
| **`store-link-normalizer.ts`** | `src/utils/store-link-normalizer.ts` | Extracts IDs from Apple App Store and Google Play URLs to generate device-responsive download redirects. |
| **`social-platforms.data.ts`** | `src/utils/social-platforms.data.ts` | Canonical URL builders and inline SVG icon templates for 20+ social media platforms. |
| **`phone-countries.data.ts`** | `src/utils/phone-countries.data.ts` | Country dial codes, flags, and E.164 phone formatting rules. |

---

## 3. Key Frontend Implementation Patterns

### 3.1 Scalable Vector SVG Rendering
Unlike basic raster QR generators, Acklet QR Generator renders pure vector SVG markup via `qr-svg-renderer.ts`:
- Each matrix module is mapped to an SVG element based on the active `dotType` (e.g. circle for `dots`, rounded path for `rounded`, polygon for `diamond`, `star`, `heart`, or `cross`).
- Corner locator outer frames and inner dots render using dedicated SVG path builders.
- Linear and radial gradients are rendered using `<defs><linearGradient>` or `<radialGradient>` with calculated rotation matrices.
- Logos are embedded via `<image>` elements centered with guaranteed quiet margin buffers.
- Export to `.svg` produces a clean, standalone XML vector document ready for laser cutting, embroidery, and infinite-resolution billboard printing.

### 3.2 Automated In-Browser Decodability Verification (`QRVerifierService`)
To guarantee that user styling choices do not break real-world mobile camera scannability, `QRVerifierService` runs an automated 4-pass decoding pipeline using `jsQR`:
```typescript
async function verifyScannability(canvas: HTMLCanvasElement, expectedPayload: string): Promise<QRVerificationResult> {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);

  // Pass 1: Standard direct decode
  let code = jsQR(imgData.data, width, height);

  // Pass 2: Contrast-stretched histogram binarization
  if (!code) {
    const stretched = contrastStretchBinarize(imgData);
    code = jsQR(stretched.data, width, height);
  }

  // Pass 3: Inverted luminance decode
  if (!code) {
    const inverted = invertLuminance(imgData);
    code = jsQR(inverted.data, width, height);
  }

  // Pass 4: Center crop decode (isolates matrix from outer decorative frames)
  if (!code) {
    const cropped = centerCropMatrix(imgData);
    code = jsQR(cropped.data, cropped.width, cropped.height);
  }

  return {
    isScannable: !!code,
    decodedPayload: code?.data,
    match: code?.data === expectedPayload,
    confidence: evaluateConfidence(code, imgData),
    message: code ? 'Verified 100% Scannable' : 'Camera may fail to scan'
  };
}
```

---

## 4. Backend Services Inventory & Architecture (Spring Boot 3.4.1)

| Service | Scope | Purpose |
| :--- | :--- | :--- |
| **`QrCodeService`** | Spring `@Service` | Dynamic QR code lifecycle: creation, updates, Base62 slug generation with collision retry, BCrypt password hashing, and SHA-256 manage key generation. |
| **`QrResolutionService`** | Spring `@Service` | Shortlink resolver at `/q/{code}`: returns HTTP 302 Found for direct links, device-aware routing for mobile apps, HTTP 307 Temporary Redirect for hosted landing pages, and friendly HTML for paused (410) or unknown (404) codes. Sets strict CSP and `X-Robots-Tag: noindex, nofollow`. |
| **`QrLinkService`** | Spring `@Service` | Manages hosted short links (`POST /api/v1/qr-links`), Base62 generation, reserved words defense, case-sensitive lookup verification, and rate limiting. |
| **`QrHtmlRenderer`** | Utility | Renders safe, XSS-free mobile-first HTML viewers for plain text notes with Copy, Share, and Download actions. |
| **`LocalDiskQrStorageService`** | Spring `@Service` | Secure asset storage with path traversal defense, 20MB file boundary validation, and SHA-256 checksums. |
| **`QrAnalyticsService`** | Spring `@Service` | Privacy-conscious scan telemetry using salted daily hashes (`SHA-256(ip + salt + date)`), honoring DNT and Sec-GPC headers. |

---

## 5. Shortlink & Device-Aware Routing Flow

```mermaid
flowchart TD
    Scan[User Scans QR: /q/{code}] --> Resolver[QrResolutionService.resolve(code)]
    Resolver --> Lookup{Code Exists in DB?}
    Lookup -- No --> Ret404[HTTP 404: Friendly Not Found HTML]
    Lookup -- Yes --> StatusCheck{Status?}
    StatusCheck -- PAUSED --> RetPaused[HTTP 307: Paused Notice Screen]
    StatusCheck -- EXPIRED --> RetExpired[HTTP 307: Expired Notice Screen]
    StatusCheck -- ACTIVE --> PasswordCheck{has_password?}
    PasswordCheck -- Yes --> RetAuth[HTTP 307: Passcode Gate Screen]
    PasswordCheck -- No --> Telemetry[Record Salted Daily Telemetry]
    Telemetry --> TypeCheck{Code Type?}
    TypeCheck -- DYNAMIC_URL --> DeviceDetect{User-Agent Header?}
    DeviceDetect -- iOS and iosUrl present --> RedirIOS[HTTP 302: Redirect to Apple App Store / iOS Target]
    DeviceDetect -- Android and androidUrl present --> RedirAndroid[HTTP 302: Redirect to Google Play / Android Target]
    DeviceDetect -- Other / Desktop --> RedirDirect[HTTP 302: Redirect to targetUrl]
    TypeCheck -- DYNAMIC_PDF / MENU / COUPON / VCARD --> RetViewer[HTTP 307: /tools/qr-generator/view/:code]
    TypeCheck -- TEXT_NOTES --> RetNotes[HTTP 200: /tools/qr-generator/notes/:code]
```

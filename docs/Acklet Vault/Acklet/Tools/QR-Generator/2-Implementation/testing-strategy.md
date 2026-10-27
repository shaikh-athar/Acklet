---
tool: QR Generator
phase: 3
last-updated: 2026-10-21
status: Complete
---

# QR Generator — Testing Strategy & Quality Assurance Plan

This document details the multi-layer test suite and hardware verification protocols guaranteeing 100% reliability, mathematical validity, and real-world camera scannability.

---

## 1. Test Architecture Overview

Quality verification spans five distinct layers:
1. **Frontend Unit Tests (Vitest)**: 343 tests across smart links, preview panel, payload builders, canvas framing, batch ZIP generation, history, dynamic manager, and landing page renderers.
2. **Backend Unit & Integration Tests (JUnit 5 & Mockito)**: 52 tests across hosted short links (`QrLinkServiceTest`, `QrLinkResolutionTest`), dynamic QR codes (`QrCodeServiceTest`, `QrResolutionServiceTest`), Base62 generation, and storage boundaries.
3. **Automated End-to-End Smoke Test Script (`scripts/smoke-test-qr-flow.sh`)**: 19 automated integration assertions verifying HTTP 302 redirects, HTTP 200 escaped HTML text viewer, CSP, Referrer-Policy, noindex, UTF-8/emoji payloads, 410 Gone, and 404 friendly pages.
4. **Static & Architecture Compliance**: Verified via `node scripts/verify.mjs -A` (~4.5s) and `node scripts/verify.mjs -B` (~25s) enforcing zero compiler warnings, Glass styling rules, and Tool Shell isolation.
5. **Real-Device Physical Hardware Testing**: Structured test matrix for iOS Camera, Android Camera, and commercial scanner apps via LAN IP / HTTPS tunnel.

---

## 2. Frontend Test Suite Breakdown (343 Vitest Tests)

| Suite File | Target Module | Test Count | Key Verification Assertions |
| :--- | :--- | :--- | :--- |
| **`smart-link.service.spec.ts`** | `SmartLinkService` | **10 tests** | • Auto-detects long URLs vs long text.<br>• Base URL normalization (`window.__ACKLET_CONFIG__`, `QR_PUBLIC_BASE_URL`, tunnel auto-detection).<br>• Local/Private IP warning detection.<br>• Emits `onShortUrlReady$` upon creation; handles fallback on network failure. |
| **`preview-panel.component.spec.ts`** | `PreviewPanelComponent` | **12 tests** | • Create-then-generate skeleton loading state.<br>• Fallback notice banner rendering with inline retry.<br>• Dev warning banner when pointing to localhost or private IPs.<br>• Emits retry click events correctly. |
| **`qr-payload-builders.spec.ts`** | `QRPayloadBuilders` | **30 tests** | • RFC 5545 iCal CRLF line endings, 75-octet folding, and character escaping.<br>• RFC 2426 vCard 3.0 UTF-8 formatting and DoCoMo MECARD.<br>• Wi-Fi escaping (`\;,:""`), WPA/WEP/WPA3/nopass, hidden SSID, and Enterprise EAP.<br>• International E.164 phone parsing.<br>• BIP21/EIP-681 Bitcoin, Ethereum, and Solana crypto URIs.<br>• Safe UTM parameter appending without destroying existing query strings.<br>• Rejection of dangerous schemes (`javascript:`, `data:`). |
| **`qr-generator.service.spec.ts`** | `QRGeneratorService` | **42 tests** | • Shape styling (dots, rounded, classy modules, custom locators).<br>• Vector SVG lossless extraction.<br>• Multi-format raster download (PNG, SVG, JPEG).<br>• Frame wrapping (`wrapSvgWithFrame`) across 6 frame styles.<br>• Off-screen canvas rasterization (`exportFramedRaster`). |
| **`color-validator.service.spec.ts`** | `ColorValidatorService` | **13 tests** | • WCAG 2.1 relative luminance math.<br>• Contrast ratio calculation (`21:1` for black/white, `1:1` for identical).<br>• Hex normalization and strict `< 2.5:1` low contrast scanner warning trigger. |
| **`qr-history.service.spec.ts`** | `QRHistoryService` | **8 tests** | • `localStorage` caching up to 8 recent codes.<br>• Deduplication of identical payloads.<br>• 1-click restore into active editor. |
| **`qr-verifier.service.spec.ts`** | `QRVerifierService` | **4 tests** | • Camera-grade barcode decoding via `jsqr`.<br>• Verification badge and payload string match diagnostics. |
| **`qr-dynamic.service.spec.ts`** | `QRDynamicService` | **4 tests** | • Dynamic shortlink creation, update, and manage key persistence. |
| **`landing-viewer.component.spec.ts`** | `LandingViewerComponent` | **7 tests** | • Passcode gate validation.<br>• PDF, Menu, Coupon, vCard (`.vcf`), and Multi-URL renderers.<br>• Paused and Expired notice displays. |

---

## 3. Backend Test Suite Breakdown (52 JUnit 5 Tests)

| Test Class | Target Component | Test Count | Key Verification Assertions |
| :--- | :--- | :--- | :--- |
| **`QrLinkResolutionTest`** | `QrResolutionService` / Controller | **8 tests** | • Long URL resolves to **HTTP 302 Found** with `Location` and security headers.<br>• Long Text returns **HTTP 200 OK** with escaped HTML, Copy, Share, Download buttons, and strict CSP.<br>• Expired and deleted links return **HTTP 410 Gone**.<br>• Unknown code returns friendly **HTTP 404** HTML page without stack traces.<br>• Invalid target schemes (`javascript:`) rejected with 400 Bad Request. |
| **`QrLinkServiceTest`** | `QrLinkService` | **12 tests** | • Base62 short code generation and collision handling.<br>• Exact case-sensitive code lookups (`aB3` vs `Ab3`).<br>• Unicode NFC normalization and emoji/Hindi payload preservation.<br>• Enforces 20,000 char text limit and 4,000 char URL limit.<br>• Rate limiting enforcement (60 creates/minute per IP). |
| **`QrResolutionServiceTest`** | `QrResolutionService` (Dynamic) | **5 tests** | • Dynamic code redirects (302 Found for direct, 307 for hosted/paused/expired/auth). |
| **`QrCodeServiceTest`** | `QrCodeService` | **9 tests** | • Dynamic QR creation, manage keys, Base62 slug generation, and BCrypt passwords. |
| **`LocalDiskQrStorageServiceTest`** | `LocalDiskQrStorageService` | **4 tests** | • Asset storage with SHA-256 binary hash deduplication, 20MB ceiling, path traversal defense. |
| **`Base62Test`** | `Base62` utility | **2 tests** | • Character encoding validity and collision-free distribution. |
| **`UserAgentParserTest`** | `UserAgentParser` | **4 tests** | • Categorization of mobile, tablet, and desktop devices across browsers. |

---

## 4. Real-Phone Physical Scan Checklist

Before deploying QR code assets or print signage, physical validation across real-world devices is verified against this checklist:

| Device / App | Minimum OS / Version | Verification Criteria | Status |
| :--- | :--- | :--- | :--- |
| **Apple iPhone Native Camera** | iOS 15+ | • Yellow banner pill appears in `< 1.0s` pointing to destination URL.<br>• Correctly triggers native system apps: Wi-Fi prompt to join network, Phone dialer for `tel:`, Contacts app for vCard 3.0, Calendar app for Event.<br>• Reads codes with embedded center logos (up to 30% area at Level H). | **Verified** |
| **Google Pixel / Samsung Camera** | Android 12+ (Google Lens) | • Camera popup banner recognizes URI scheme immediately.<br>• Wi-Fi connection popup automatically joins network without manual password entry.<br>• Crypto URIs prompt to open installed wallet apps (Bitcoin/Ethereum). | **Verified** |
| **Third-Party Scanner (Binary Eye / ZXing)** | Android / iOS | • Decodes raw payload string with 100% character-for-character parity.<br>• Confirms correct error correction level and version matrix. | **Verified** |
| **Low-Lighting & Glare Test** | Any Smartphone | • Codes with contrast ratio $\ge 4.5:1$ decode within 2 seconds under dim ambient light.<br>• Codes flagged with contrast warning ($< 2.5:1$) fail or lag, confirming the validity of Acklet's contrast guard. | **Verified** |

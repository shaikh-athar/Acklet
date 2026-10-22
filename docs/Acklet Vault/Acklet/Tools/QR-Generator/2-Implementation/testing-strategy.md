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
1. **Frontend Unit Tests (Vitest)**: 114 tests across pure payload builders, canvas framing, batch ZIP generation, history, dynamic manager, and landing page renderers.
2. **Backend Unit Tests (JUnit 5 & Mockito)**: 24 tests across shortlink resolution, Base62 collision retry, password hashing/verification, privacy-first telemetry, and asset storage boundaries.
3. **Client-Side Camera-Grade Scannability Testing (`jsQR`)**: Real-time in-browser verification decoding the generated pixel array to verify barcode standards before physical print or deployment.
4. **Static & Architecture Compliance**: Verified via `node scripts/verify.mjs -A` enforcing zero compiler warnings, Glass styling rules, and Tool Shell isolation.
5. **Real-Device Physical Hardware Testing**: Structured test matrix for iOS Camera, Android Camera, and commercial scanner apps.

---

## 2. Frontend Test Suite Breakdown (114 Vitest Tests)

| Suite File | Target Module | Test Count | Key Verification Assertions |
| :--- | :--- | :--- | :--- |
| **`qr-payload-builders.spec.ts`** | `QRPayloadBuilders` | **30 tests** | • RFC 5545 iCal CRLF line endings, 75-octet folding, and character escaping.<br>• RFC 2426 vCard 3.0 UTF-8 formatting and DoCoMo MECARD.<br>• Wi-Fi escaping (`\;,:""`), WPA/WEP/WPA3/nopass, hidden SSID, and Enterprise EAP.<br>• International E.164 phone parsing.<br>• BIP21/EIP-681 Bitcoin, Ethereum, and Solana crypto URIs.<br>• Safe UTM parameter appending without destroying existing query strings.<br>• Rejection of dangerous schemes (`javascript:`, `data:`). |
| **`qr-generator.service.spec.ts`** | `QRGeneratorService` | **43 tests** | • Shape styling (dots, rounded, classy modules, custom locators).<br>• Vector SVG lossless extraction.<br>• Multi-format raster download (PNG, SVG, JPEG).<br>• Frame wrapping (`wrapSvgWithFrame`) across 6 frame styles.<br>• Off-screen canvas rasterization (`exportFramedRaster`).<br>• Bulk generation and asynchronous ZIP creation via `JSZip`. |
| **`color-validator.service.spec.ts`** | `ColorValidatorService` | **13 tests** | • WCAG 2.1 relative luminance math.<br>• Contrast ratio calculation (`21:1` for black/white, `1:1` for identical).<br>• Hex normalization and strict `< 2.5:1` low contrast scanner warning trigger. |
| **`qr-history.service.spec.ts`** | `QRHistoryService` | **8 tests** | • `localStorage` caching up to 8 recent codes.<br>• Deduplication of identical payloads.<br>• 1-click restore into active editor. |
| **`qr-verifier.service.spec.ts`** | `QRVerifierService` | **4 tests** | • Camera-grade barcode decoding via `jsqr`.<br>• Verification badge and payload string match diagnostics. |
| **`qr-dynamic.service.spec.ts`** | `QRDynamicService` | **4 tests** | • Dynamic shortlink creation, update, and manage key persistence. |
| **`landing-viewer.component.spec.ts`** | `LandingViewerComponent` | **7 tests** | • Passcode gate validation.<br>• PDF, Menu, Coupon, vCard (`.vcf`), and Multi-URL renderers.<br>• Paused and Expired notice displays. |
| **`batch-generator.component.spec.ts`** | `BatchGeneratorComponent` | **5 tests** | • CSV file parsing and raw text pasting.<br>• Sample CSV loader.<br>• Batch generation pipeline progress callbacks and ZIP export. |

---

## 3. Backend Test Suite Breakdown (24 JUnit 5 Tests)

| Test Class | Target Component | Test Count | Key Verification Assertions |
| :--- | :--- | :--- | :--- |
| **`LocalDiskQrStorageServiceTest`** | `LocalDiskQrStorageService` | **4 tests** | • File storage with SHA-256 binary hash deduplication.<br>• Enforces 20MB file size ceiling (`BadRequestException`).<br>• Path traversal defense rejecting `..` and malicious slug sequences.<br>• Resource loading with existence checks. |
| **`QrCodeServiceTest`** | `QrCodeService` | **9 tests** | • Dynamic QR creation and secret 256-bit manage key generation.<br>• Base62 slug generation with automatic collision retry.<br>• Creation of all dynamic types (URL, PDF, Menu, Coupon, vCard, Multi-URL).<br>• Password protection and BCrypt hash verification.<br>• Public metadata masking when passcode gate is active.<br>• In-place destination URL updates and password removal. |
| **`QrResolutionServiceTest`** | `QrResolutionService` | **5 tests** | • Direct URLs redirect with **HTTP 302 Found** (never cached).<br>• Hosted types redirect with **HTTP 307 Temporary Redirect** to landing viewer.<br>• Paused codes redirect to `?paused=true`.<br>• Expired codes redirect to `?expired=true`.<br>• Passcode-protected codes redirect to `?auth=required`. |
| **`Base62Test`** | `Base62` utility | **2 tests** | • Valid character alphabet encoding.<br>• Slug length and collision-free distribution. |
| **`UserAgentParserTest`** | `UserAgentParser` | **4 tests** | • Fast zero-dependency categorization of mobile, tablet, and desktop devices.<br>• Accurate detection of iOS, Android, macOS, Windows, Linux, Safari, Chrome, and Firefox. |

---

## 4. Real-Phone Physical Scan Checklist

Before deploying QR code assets or print signage, physical validation across real-world devices is verified against this checklist:

| Device / App | Minimum OS / Version | Verification Criteria | Status |
| :--- | :--- | :--- | :--- |
| **Apple iPhone Native Camera** | iOS 15+ | • Yellow banner pill appears in `< 1.0s` pointing to destination URL.<br>• Correctly triggers native system apps: Wi-Fi prompt to join network, Phone dialer for `tel:`, Contacts app for vCard 3.0, Calendar app for Event.<br>• Reads codes with embedded center logos (up to 30% area at Level H). | **Verified** |
| **Google Pixel / Samsung Camera** | Android 12+ (Google Lens) | • Camera popup banner recognizes URI scheme immediately.<br>• Wi-Fi connection popup automatically joins network without manual password entry.<br>• Crypto URIs prompt to open installed wallet apps (Bitcoin/Ethereum). | **Verified** |
| **Third-Party Scanner (Binary Eye / ZXing)** | Android / iOS | • Decodes raw payload string with 100% character-for-character parity.<br>• Confirms correct error correction level and version matrix. | **Verified** |
| **Low-Lighting & Glare Test** | Any Smartphone | • Codes with contrast ratio $\ge 4.5:1$ decode within 2 seconds under dim ambient light.<br>• Codes flagged with contrast warning ($< 2.5:1$) fail or lag, confirming the validity of Acklet's contrast guard. | **Verified** |

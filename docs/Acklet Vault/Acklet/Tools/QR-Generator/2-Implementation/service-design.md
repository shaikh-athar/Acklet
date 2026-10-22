---
tool: QR Generator
phase: 3
last-updated: 2026-10-21
status: Complete
---

# QR Generator — Service Architecture & Service Design

This document details the frontend and backend service architecture across all phases of the QR Generator tool.

---

## 1. Frontend Services Inventory & Responsibilities

| Service | File Path | Scope | Purpose |
| :--- | :--- | :--- | :--- |
| **`QRGeneratorService`** | `apps/tool-qr-generator/src/services/qr-generator.service.ts` | Provided in root | Wraps `qr-code-styling`, renders vector SVG and raster canvases, handles decorative frames (`wrapSvgWithFrame`, `exportFramedRaster`), and packages bulk QR ZIP archives via `jszip`. |
| **`QRPayloadBuilders`** | `apps/tool-qr-generator/src/services/qr-payload-builders.ts` | Pure functions | Pure functional builders and validators for all 12 static types with strict RFC escaping, line folding, and coordinate parsing. |
| **`QRVerifierService`** | `apps/tool-qr-generator/src/services/qr-verifier.service.ts` | Provided in root | Off-screen camera barcode decoder powered by `jsqr`, verifying scannability and payload parity before download. |
| **`QRDynamicService`** | `apps/tool-qr-generator/src/services/qr-dynamic.service.ts` | Provided in root | REST client for Spring Boot dynamic QR API (`/api/v1/qr/**`), managing private keys in `localStorage`. |
| **`ColorValidatorService`** | `apps/tool-qr-generator/src/services/color-validator.service.ts` | Provided in root | Validates hex syntax, calculates mathematical WCAG contrast ratios, and evaluates low-contrast readability warnings. |
| **`QRHistoryService`** | `apps/tool-qr-generator/src/services/qr-history.service.ts` | Provided in root | Persists recent generations in browser `localStorage` (up to 8 items) with reactive Angular signals. |

---

## 2. Key Frontend Implementation Patterns

### 2.1 Vector Preview & Multi-Format Export
`QRGeneratorService` maintains an isolated `QRCodeStyling` instance:
* **SVG Vector Preview**: Calls `instance._getElement('svg')` and extracts raw `<svg>` markup to render vector graphics inside the DOM.
* **Framed Vector Composition**: Uses `wrapSvgWithFrame(svgStr, frameOptions, size)` to embed the QR code inside scalable SVG frames (Bottom Banner, Top Header, Polaroid, Badge Pill, Chat Bubble) without quality loss.
* **Canvas Rasterization**: Uses `exportFramedRaster(...)` to draw the framed composition onto an HTML5 Canvas for PNG and JPEG downloads.
* **Batch ZIP Export**: Uses `generateBatchZip(...)` with `JSZip` to generate multiple codes asynchronously, updating real-time progress callbacks without locking the main thread.

### 2.2 Client-Side Scannability Verification
`QRVerifierService` loads the generated image onto an in-memory HTML5 Canvas and reads pixel data via `context.getImageData()`:
```typescript
const imageData = ctx.getImageData(0, 0, width, height);
const code = jsQR(imageData.data, imageData.width, imageData.height);
return {
  isScannable: !!code,
  decodedPayload: code?.data || null,
  matchesExpected: code?.data === expectedPayload
};
```

---

## 3. Backend Services Inventory & Architecture

| Service | File Path | Scope | Purpose |
| :--- | :--- | :--- | :--- |
| **`QrCodeService`** | `server/acklet/.../tools/qr/service/QrCodeService.java` | Spring `@Service` | Dynamic QR code lifecycle (creation, updates, Base62 slug generation with collision retry, BCrypt password hashing, SHA-256 manage keys). |
| **`QrResolutionService`** | `server/acklet/.../tools/qr/service/QrResolutionService.java` | Spring `@Service` | High-speed shortlink resolver at `/q/{code}` (HTTP 302 Found for direct links, HTTP 307 for hosted viewers and password gates). |
| **`LocalDiskQrStorageService`** | `server/acklet/.../tools/qr/storage/LocalDiskQrStorageService.java` | Spring `@Service` | Secure asset storage with path traversal defense, 20MB file boundary validation, and SHA-256 checksums. |
| **`QrAnalyticsService`** | `server/acklet/.../tools/qr/service/QrAnalyticsService.java` | Spring `@Service` | Privacy-conscious scan telemetry using salted daily hashes (`SHA-256(ip + salt + date)`), honoring DNT and Sec-GPC. |

---

## 4. Shortlink Resolution Flow (`QrResolutionService`)

```mermaid
flowchart TD
    Scan[User Scans /q/{code}] --> Lookup[Lookup QrCodeEntity by code]
    Lookup --> Exists{Exists?}
    Exists -- No --> Err404[404 Not Found]
    Exists -- Yes --> ExpCheck{Expired?}
    ExpCheck -- Yes --> ExpNotice[307 Redirect: ?expired=true]
    ExpCheck -- No --> PauseCheck{Status == PAUSED?}
    PauseCheck -- Yes --> PauseNotice[307 Redirect: ?paused=true]
    PauseCheck -- No --> Telemetry[Record Telemetry Hash & Metadata]
    Telemetry --> PassCheck{hasPassword?}
    PassCheck -- Yes --> PassGate[307 Redirect: ?auth=required]
    PassCheck -- No --> TypeCheck{Landing Page Type?}
    TypeCheck -- Yes --> Viewer[307 Redirect: /tools/qr-generator/view/:code]
    TypeCheck -- No --> DirectUrl[302 Found: target_url]
```

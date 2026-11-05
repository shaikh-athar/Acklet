# Acklet Tools Catalog & Engineering Documentation

Welcome to the **Acklet Tools Documentation Hub**. This directory documents the tools engineered within the Acklet developer workspace platform.

---

## Tool Directory Index

| Tool Name | Directory Path | Category | Primary Formats / Focus | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Online Clipboard** | [Online-Clipboard/](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/Online-Clipboard/README.md) | Ephemeral Cross-Device Transfer & Sync | Text, Links, Images, Files, E2EE, ZIP | **Production Ready** |
| **QR Generator** | [QR-Generator/](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/QR-Generator/README.md) | Client-Side QR Code Studio & Customizer | Text, URL, Email, Phone, PNG, Custom Styling | **Production Ready (Phase 1)** |
| **Barcode Generator** | [Barcode-Generator/](Barcode-Generator/README.md) | In-Browser Vector Barcode Studio | Code 128, EAN, UPC, ISBN, ITF, Codabar, SVG, PNG, PDF | **Production Ready (Phase 1)** |
| **URL Shortener** | [URL-Shortener/](URL-Shortener/README.md) | Privacy-First Fast URL Shortener & Link Studio | Base62 URLs, Custom Slugs, TTL, QR Handoff | **Production Ready** |
| **Temporary Email** | [Temp-Email/](Temp-Email/README.md) | Disposable Email Generator & Real-Time Inbox | Mail.tm API, Smart OTP Extractor, Verification Links | **Production Ready** |
| **DataLens** | [data-lens/](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/data-lens/README.md) | Structured Data Workbench & Inspector | JSON, YAML, XML, CSV, TOML, cURL | **Production Ready** |
| **AirVault** | [airvault/](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/README.md) | Cross-Device Clipboard & Sync Platform | Text, Code, URLs, Images, Files, E2EE | **Production Ready** |

---

## Documentation Architecture & Standards

All tools adhere to the standard 4-subfolder structure defined in [DOCUMENTATION_STRUCTURE.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/DOCUMENTATION_STRUCTURE.md):
- `0-Requirements/` — Features, scope, requirements, library selection, API contract, phased breakdown.
- `1-Progress/` — Phased progress, implementation timeline log, issues and bug fixes.
- `2-Implementation/` — Component tree, service design, styling guide, testing strategy, deployment.
- `3-Reference/` — Glossary, FAQs, external links, engineering learnings.

---

## 1. Online Clipboard Overview

**Online Clipboard by Acklet** is a high-performance, private, zero-signup digital workspace to share text snippets, links, images, documents, and large binary files between any two devices in seconds.

- **Primary URL**: `http://clipboard.localhost:4200` / `https://clipboard.acklet.com`
- **Component Root**: [client/apps/tool-online-clipboard/](file:///Users/ayaz/Acklet/client/apps/tool-online-clipboard/)
- **Documentation Root**: [Online-Clipboard/](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/Online-Clipboard/README.md)

---

## 2. QR Generator Overview

**QR Generator by Acklet** is a lightweight, privacy-first utility tool for creating, customizing, and downloading QR codes entirely within the client browser with real-time feedback and emerald styling.

- **Primary URL**: `http://qr.localhost:4200` / `https://qr.acklet.com`
- **Component Root**: [client/apps/tool-qr-generator/](file:///Users/ayaz/Acklet/client/apps/tool-qr-generator/)
- **Documentation Root**: [QR-Generator/](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/QR-Generator/README.md)

---

## 3. Barcode Generator Overview

**Barcode Generator by Acklet** is a 100% in-browser, privacy-first barcode studio that produces standards-compliant 1D (and planned 2D) barcodes with automatic GS1 Modulo-10 checksum calculation, physical print scaling, optical contrast validation, and lossless vector SVG, 300 DPI PNG, and PDF exports.

- **Primary URL**: `http://barcode.localhost:4200` / `https://barcode.acklet.com` (Fallback route: `/barcode` or `/tools/barcode`)
- **Component Root**: [client/apps/tool-barcode-generator/](client/apps/tool-barcode-generator/)
- **Documentation Root**: [Barcode-Generator/](Barcode-Generator/README.md)

---

## 4. URL Shortener Overview

**URL Shortener by Acklet** is a fast, privacy-respecting link shortening utility with custom aliases, configurable TTL expiry, anonymous browser-stored link management, safe preview mode, and QR Generator deep linking.

- **Primary URL**: `http://urlshortener.localhost:4200` / `https://urlshortener.acklet.com`
- **Component Root**: `client/apps/tool-urlshortener/`
- **Documentation Root**: [URL-Shortener/](URL-Shortener/README.md)

---

## 5. Temporary Email Overview

**Temporary Email by Acklet** is a modern, responsive, privacy-focused disposable email generator and real-time inbox powered by the Mail.tm API. Features instant creation, live inbox with configurable auto-refresh, smart OTP extractor with one-click copy, confirmation link detection, multi-inbox switching, QR sharing, and tracking protection.

- **Primary URL**: `http://mail.localhost:4200` / `https://mail.acklet.com` (Fallback route: `/tools/temp-email` or `/temp-email`)
- **Component Root**: [client/apps/tool-temp-email/](file:///Users/ayaz/Acklet/client/apps/tool-temp-email/)
- **Documentation Root**: [Temp-Email/](Temp-Email/README.md)

---

## 6. DataLens Overview

**DataLens by Acklet** is a multi-format structured data workbench and inspection engine engineered for modern software engineers, DevOps specialists, and API developers.

- **Primary URL**: `http://datalens.localhost:4200` / `https://datalens.acklet.com` (Fallback route: `/tools/datalens` or `/datalens`)
- **Component Root**: [client/apps/tool-datalens/](client/apps/tool-datalens/)
- **Documentation Root**: [data-lens/](data-lens/README.md)

---

## 6. AirVault Overview

**AirVault by Acklet** is a real-time cross-device clipboard synchronization platform with encrypted transport, smart content classification, device pairing, and GSAP motion choreography.

- **Primary URL**: `/tools/airvault`
- **Component Root**: [client/src/tools/airvault/](client/src/tools/airvault/)
- **Documentation Root**: [airvault/](airvault/README.md)

---

## 7. Related Platform Architecture

- [UI-FOUNDATION.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Architecture/UI-FOUNDATION.md) — Acklet UI component foundation & architectural principles.
- [defination.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/defination.md) — Acklet platform glossary and terminology definitions.

# Acklet Tools Catalog & Engineering Documentation

Welcome to the **Acklet Tools Documentation Hub**. This directory documents the tools engineered within the Acklet developer workspace platform.

---

## Tool Directory Index

| Tool Name | Directory Path | Category | Primary Formats / Focus | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Online Clipboard** | [Online-Clipboard/](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/Online-Clipboard/README.md) | Ephemeral Cross-Device Transfer & Sync | Text, Links, Images, Files, E2EE, ZIP | **Production Ready** |
| **QR Generator** | [QR-Generator/](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/QR-Generator/README.md) | Client-Side QR Code Studio & Customizer | Text, URL, Email, Phone, PNG, Custom Styling | **Phase 1 In Planning** |
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
- **Component Root**: `client/apps/tool-qr-generator/` (Phase 1 Target)
- **Documentation Root**: [QR-Generator/](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/QR-Generator/README.md)

---

## 3. DataLens Overview

**DataLens by Acklet** is a multi-format structured data workbench and inspection engine engineered for modern software engineers, DevOps specialists, and API developers.

- **Primary URL**: `/tools/data-lens`
- **Component Root**: [client/src/tools/data-lens/](file:///Users/ayaz/Acklet/client/src/tools/data-lens/)
- **Documentation Root**: [data-lens/](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/data-lens/README.md)

---

## 4. AirVault Overview

**AirVault by Acklet** is a real-time cross-device clipboard synchronization platform with encrypted transport, smart content classification, device pairing, and GSAP motion choreography.

- **Primary URL**: `/tools/airvault`
- **Component Root**: [client/src/tools/airvault/](file:///Users/ayaz/Acklet/client/src/tools/airvault/)
- **Documentation Root**: [airvault/](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/README.md)

---

## 5. Related Platform Architecture

- [UI-FOUNDATION.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Architecture/UI-FOUNDATION.md) — Acklet UI component foundation & architectural principles.
- [defination.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/defination.md) — Acklet platform glossary and terminology definitions.

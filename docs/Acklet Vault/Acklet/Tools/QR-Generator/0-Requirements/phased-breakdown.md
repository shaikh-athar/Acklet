---
tool: QR Generator
phase: 3
last-updated: 2026-10-28
status: Complete
---

# QR Generator — Phased Architecture & Execution Roadmap

This document outlines the phased evolutionary roadmap of the Acklet QR Generator from initial client-side prototype to full enterprise hosted dynamic subsystem.

---

## Phase 1: MVP Client-Side Generation (Complete)
**Objective**: Deliver a fast, private, 100% in-browser utility for fundamental QR code creation.

### Key Deliverables:
- ✅ `QRGeneratorComponent` core orchestrator
- ✅ Input panel for 4 initial types (Text, URL, Email, Phone)
- ✅ Preview panel with canvas-rendered QR matrix
- ✅ Color customizer with native pickers and hex normalization
- ✅ Size slider (100–2000px)
- ✅ Reed-Solomon Error Correction selector (L, M, Q, H)
- ✅ Mathematical WCAG relative luminance contrast warning
- ✅ Direct lossless PNG file download
- ✅ Zero-telemetry, zero-backend execution

---

## Phase 2: Design Studio Parity & Vector Engine (Complete)
**Objective**: Match industry-leading visual styling capabilities, introduce vector SVG rendering, and expand to 12 structured data schemas.

### Key Deliverables:
- ✅ Migration to `qr-code-styling` engine and pure vector SVG rendering (`qr-svg-renderer.ts`)
- ✅ Multi-format export: Scalable Vector SVG, Lossless PNG, JPEG, and OS Clipboard image copy
- ✅ Matrix module shape customization (11 styles: Square, Dots, Rounded, Extra-Rounded, Classy, Classy-Rounded, Diamond, Star, Heart, Cross, Scanline)
- ✅ Corner locator customization (8 corner square types, 10 corner dot styles, independent coloring)
- ✅ Linear & Radial Gradients with 0–360° angle rotation slider and curated presets
- ✅ Logo & Brand Embedding (file dropzone upload, 20+ preset icons, size/margin sliders, transparent background toggle)
- ✅ Automatic Error Correction elevation (`qr-auto-ec.util.ts`) boosting recovery to Level H/Q upon logo insertion
- ✅ Expansion to 12 structured RFC types (Wi-Fi WPA3/Enterprise, vCard 3.0, Event iCal, Location geo, SMS, Social profiles, App Store, Crypto)
- ✅ Decorative CTA frames (18+ vector templates: Bottom Banner, Top Header, Polaroid, Badge Pill, Chat Bubble, etc.)
- ✅ In-browser decodability verification via `jsQR` with diagnostic scan confidence rating
- ✅ Batch QR generation modal with CSV parser and asynchronous ZIP packaging via `jszip`
- ✅ Local history drawer in `localStorage` with deduplication and one-click restore

---

## Phase 3: Dynamic Links, Device Routing & Hosted Subsystem (Complete)
**Objective**: Build a robust, privacy-first Spring Boot backend for dynamic short links, mobile device routing, and hosted rich landing pages.

### Key Deliverables:
- ✅ Spring Boot 3.4.1 backend with Flyway migration `V54__dynamic_qr_codes.sql` (`qr_codes`, `qr_assets`, `qr_scans`)
- ✅ High-speed public short link resolution at `/q/{code}` with HTTP 302/307 redirects
- ✅ Device-aware intelligent mobile routing (routes iOS devices to App Store, Android to Google Play, desktop to fallback)
- ✅ Anonymous 256-bit manage key authorization (stored exclusively as SHA-256 hashes, zero account requirement)
- ✅ Dynamic QR management drawer with inline destination URL editing, pause/resume, and analytics modal
- ✅ Privacy-preserving scan telemetry using salted daily visitor hashes (`SHA-256(ip + salt + date)`), honoring DNT and Sec-GPC
- ✅ Dedicated hosted landing page viewer at `/tools/qr-generator/view/:code` for PDF, Menu, Coupon, vCard, and Multi-URL
- ✅ Plain Text Notes link mode resolving to mobile-first responsive reader at `/tools/qr-generator/notes/:code`
- ✅ Passcode Gate for PIN-protected private hosted content
- ✅ Local disk asset storage with SHA-256 deduplication and path traversal defense
- ✅ Full alignment with Canonical Acklet Design System: Scoutie Sans typography and registered Blue Accent (`#3B82F6` dark / `#2563EB` light)

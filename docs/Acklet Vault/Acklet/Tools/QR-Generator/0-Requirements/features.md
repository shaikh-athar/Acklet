---
tool: QR Generator
phase: 3
last-updated: 2026-10-28
status: Complete
---

# QR Generator — Features Scope & Phased Capabilities

## Phase 1 (MVP Client-Side Generation) — Complete
- [x] Single QR code generation directly in the browser
- [x] 4 initial input types: Text, URL, Email, Phone
- [x] Basic dual-tone color customization (foreground + background)
- [x] Resolution slider (100–2000px)
- [x] Error correction selector (L, M, Q, H)
- [x] Real-time preview + ISO/IEC 18004 dynamic metadata calculation
- [x] Lossless PNG download
- [x] Mathematical WCAG contrast guard

---

## Phase 2 (Advanced Customization & Parity) — Complete
- [x] Matrix module dot shapes (11 patterns: Square, Dots, Rounded, Extra-Rounded, Classy, Classy-Rounded, Diamond, Star, Heart, Cross, Scanline)
- [x] Corner square locator shapes (8 styles: Square, Dot, Extra-Rounded, Classy, Classy-Rounded, Rounded, Pinch, Shield)
- [x] Corner dot locator shapes (10 styles: Square, Dot, Rounded, Extra-Rounded, Classy, Classy-Rounded, Diamond, Star, Heart, Cross)
- [x] Independent Corner color pickers (outer frame and inner dot)
- [x] Linear and Radial Gradients with 0–360° angle rotation slider and curated presets
- [x] Logo embedding (file upload PNG/SVG/JPEG + 20+ preset icons, size and margin clearance sliders, transparent backing)
- [x] Automatic Error Correction elevation to Level H/Q upon logo insertion
- [x] Multi-format vector export (Scalable SVG, Lossless PNG, JPEG, Clipboard image copy)
- [x] 12 Complete Structured content types: URL (with UTMs), Plain Text, Email, Phone, SMS, Wi-Fi, Geo Location, Event iCal, vCard 3.0, Social Profiles, App Store, Crypto Wallets
- [x] History & `localStorage` persistence drawer with one-click restore
- [x] Decorative frames & CTA ribbons (18+ vector frames: Bottom Banner, Top Header, Polaroid, Badge Pill, Chat Bubble, etc.)
- [x] Batch QR generation (CSV dropzone, text list, live progress bar, ZIP archive export via `jszip`)
- [x] Client-side camera-grade scannability verification via `jsqr` multi-pass pipeline

---

## Phase 3 (Dynamic & Hosted QR Codes) — Complete
- [x] Spring Boot 3.4.1 backend with Flyway migration (`qr_codes`, `qr_assets`, `qr_scans`)
- [x] Base62 slug generation and `/q/{code}` public short link resolution (HTTP 302/307 redirects)
- [x] Device-aware mobile redirection (iOS App Store vs Google Play vs Desktop fallback)
- [x] Anonymous 256-bit manage key authorization (SHA-256 hashed storage, zero account requirement)
- [x] Dynamic QR management drawer with inline destination URL editing, pause/resume, and analytics
- [x] Privacy-first scan telemetry (salted daily visitor hash, country, device, OS, browser, DNT/GPC compliance)
- [x] Hosted dynamic landing page viewer at `/tools/qr-generator/view/:code` (PDF, Menu, Coupon, vCard, Multi-URL)
- [x] Plain Text Notes link mode resolving to mobile-first viewer at `/tools/qr-generator/notes/:code`
- [x] Passcode gate for PIN-protected hosted dynamic QR codes
- [x] Local disk asset storage service with SHA-256 deduplication and path traversal protection

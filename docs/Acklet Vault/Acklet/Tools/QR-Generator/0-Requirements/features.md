---
tool: QR Generator
phase: 1
last-updated: 2026-10-20
status: Complete
---

# Features

## Phase 1 (MVP)

### ✅ In Scope
- Single QR code generation
- 4 input types: Text, URL, Email, Phone
- Color customization (foreground + background)
- Size slider (100–2000px)
- Error correction selector (L/M/Q/H)
- Real-time preview + metadata
- PNG download
- Contrast warning for accessibility

### ❌ Out of Scope (Phase 2+)
- Logo upload
- Batch generation
- vCard / Wi-Fi input
- SVG / JPG / EPS output
- History / localStorage
- Templates
- Backend integration
- Analytics

## Phase 2 (Advanced Customization & Parity)

### ✅ Completed
- [x] Matrix module dot shapes (Square, Dots, Rounded, Extra-Rounded, Classy, Classy-Rounded)
- [x] Corner square locator shapes (Square, Extra-Rounded, Circle)
- [x] Corner dot locator shapes (Square, Circle)
- [x] Independent Corner color pickers (or linked to primary foreground)
- [x] Logo embedding (file upload PNG/SVG/JPEG + 5 preset icons: Verified, Star, Link, Heart, None)
- [x] Logo size slider (10% to 45%) and margin clearance slider (0 to 12px)
- [x] Multi-format vector export (SVG, JPEG, PNG)
- [x] Structured input types: Wi-Fi, vCard 3.0, SMS, Geo Location, Event, Social, App Store, Crypto
- [x] Live Formatted Payload Preview Card with 1-click clipboard copy
- [x] History / localStorage (recent QR codes drawer with 1-click restore)
- [x] Pre-built design templates (Classic Black, Modern Dots, Classy Navy, Minimal Soft)
- [x] Decorative frames & CTA borders (Bottom Banner, Top Header, Polaroid, Badge Pill, Chat Bubble)
- [x] Batch QR generation (CSV dropzone, text list, live progress bar, ZIP archive export)
- [x] Client-side camera-grade scannability verification via `jsqr`

## Phase 3 (Dynamic & Hosted QR Codes)

### ✅ Completed
- [x] Spring Boot 3.4.1 backend with Flyway migration (`qr_codes`, `qr_assets`, `qr_scans`)
- [x] Base62 slug generation and `/q/{code}` public short link resolution (HTTP 302/307 redirects)
- [x] Anonymous 256-bit manage key authorization (SHA-256 hashed storage, zero account requirement)
- [x] Dynamic QR management drawer with inline destination URL editing, pause/resume, and analytics
- [x] Privacy-first scan telemetry (salted daily visitor hash, country, device, OS, browser, DNT/GPC compliance)
- [x] Hosted dynamic landing page viewer at `/tools/qr-generator/view/:code` (PDF, Menu, Coupon, vCard, Multi-URL)
- [x] Passcode gate for PIN-protected hosted dynamic QR codes
- [x] Local disk asset storage service with SHA-256 deduplication and path traversal protection

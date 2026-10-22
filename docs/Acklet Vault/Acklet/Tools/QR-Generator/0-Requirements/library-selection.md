---
tool: QR Generator
phase: 1
last-updated: 2026-10-20
status: In Planning
---

# Library Selection

## Frontend

### QR Generation: qr-code-styling (v1.9.2)

**Why**: 
- Replaced baseline `qrcode` library to achieve competitor parity (Phase 2).
- Native support for custom dot patterns (dots, rounded, extra-rounded, classy).
- Native support for custom corner squares and corner dots.
- Lossless SVG vector export and rendering.
- Embedded logo support with background dot clearance (`hideBackgroundDots`).
- Multi-format client-side export (PNG, SVG, JPEG).
- Client-side only (preserves Acklet's zero-tracking privacy guarantee).

**Alternatives Considered**:
- `qrcode.js`: Lightweight but limited to basic black/white square matrices; cannot support custom dot shapes, corner stylings, or logo embedding without fragile manual canvas manipulation.
- ❌ jsbarcode — designed for 1D codes, overkill for QR
- ❌ zxing.js — heavier (100KB+), primarily scanning-focused

**Installation**: `npm install qr-code-styling`

### Form Handling: @angular/forms (FormsModule)

**Why**:
- Already in Acklet
- Simple enough for this use case (no complex validation)
- Two-way binding with ngModel is intuitive

**Alternative**: ReactiveFormsModule (overkill for Phase 1)

### UI Components: spartan/ui + lucide-angular

**Why**:
- Already in Acklet (consistency)
- Minimal custom CSS needed
- Icon library (Email, Phone, URL icons from lucide)

### Colors & Theming: CSS Custom Properties

**Why**:
- No extra library needed (native CSS variables)
- Easy dark/light mode switching
- Acklet already uses this pattern

---

## Backend (Phase 1)

**None.** Pure client-side generation using qrcode.js.

(Phase 3 will use: ZXing, Apache POI, Spring Boot)

---

## Dependency Tree

```
QR Generator (Angular 18)
├── @angular/forms
├── @angular/cdk
├── spartan/ui (uses @angular/cdk)
├── lucide-angular
└── qrcode
    └── (no dependencies)
```

**Bundle Impact**:
- qrcode.js: +18KB
- Other deps already in Acklet
- **Total new size**: ~20KB

**Rejected Approaches**:
- Server-side generation (ZXing): adds backend complexity for MVP
- Heavy canvas libs (Fabric.js): Phase 2 only (if logo overlay needed)
- Paid services (like QR code APIs): violates privacy positioning

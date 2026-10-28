---
tool: QR Generator
phase: 3
last-updated: 2026-10-28
status: Complete
---

# QR Generator — Component Tree & UI Architecture

This document describes the verified Angular standalone component hierarchy, reactive signal data flow, and dedicated route architecture for the Acklet QR Generator.

---

## 1. Component Hierarchy & Module Boundaries

```text
AppComponent (client/apps/tool-qr-generator/src/app/app.component.ts)
  └── ts-shell (ToolLayoutComponent from @acklet/tool-shell)
        [tool]="QR_MANIFEST" [config]="{ layout: 'fullBleed', showDescriptionCard: false }"
        └── QRGeneratorComponent (src/qr-generator.component.ts)
              ├── Reactive Signals:
              │     activeTab ('content' | 'design' | 'dynamic')
              │     designSubTab ('frame' | 'shapes' | 'logo' | 'colors')
              │     selectedType (12 content types)
              │     qrName, content, size, foregroundColor, backgroundColor
              │     foregroundGradient, backgroundGradient
              │     errorCorrection ('L' | 'M' | 'Q' | 'H')
              │     dotType, cornerSquareType, cornerDotType
              │     cornerSquareColor, cornerDotColor
              │     logo, logoSize, logoMargin, logoBgTransparent
              │     frameOptions (style, text, color, textColor)
              │
              ├── Top Mode Navigation Bar
              │     ├── Tab Button: Content
              │     ├── Tab Button: Customize (with custom design indicator dot)
              │     └── Tab Button: Dynamic Links (with active count badge)
              │
              ├── Column 1 (Left: Studio Workspace Panel ~55%)
              │     │
              │     ├── TAB 1: Content Input Studio
              │     │     ├── QR Name Input Bar (with clear button)
              │     │     ├── Centered Content Type Selector Trigger & Search Popover
              │     │     └── InputPanelComponent (components/input-panel/)
              │     │           ├── Form Inputs per Content Type
              │     │           ├── LocationInputComponent (components/location-input/)
              │     │           ├── PhoneInputComponent (components/phone-input/)
              │     │           ├── SocialLinkInputComponent (components/social-link-input/)
              │     │           └── QrSelectComponent (components/qr-select/)
              │     │
              │     ├── TAB 2: Customize Design Studio
              │     │     ├── Sub-Nav: Frame | Shape | Logo | Color
              │     │     │
              │     │     ├── Sub-Tab Frame:
              │     │     │     └── DesignCustomizerComponent (activeSection="frame")
              │     │     │           ├── 18+ Vector Frame Templates Grid
              │     │     │           ├── CTA Ribbon Text Input + Suggestions
              │     │     │           └── Frame Background & Text Color Pickers
              │     │     │
              │     │     ├── Sub-Tab Shape:
              │     │     │     └── DesignCustomizerComponent (activeSection="shapes")
              │     │     │           ├── 11 Dot Matrix Pattern Selectors
              │     │     │           ├── 8 Corner Locator Square Selectors
              │     │     │           └── 10 Corner Dot Selectors
              │     │     │
              │     │     ├── Sub-Tab Logo:
              │     │     │     └── DesignCustomizerComponent (activeSection="logo")
              │     │     │           ├── Drag & Drop File Upload Zone
              │     │     │           ├── 20+ Brand & Social Preset Icons
              │     │     │           │     └── QrBrandIconComponent (components/qr-brand-icon/)
              │     │     │           ├── Logo Size & Margin Sliders
              │     │     │           ├── Transparent Background Plate Toggle
              │     │     │           └── Auto Error Correction Elevation Indicator
              │     │     │
              │     │     └── Sub-Tab Color:
              │     │           └── ColorCustomizerComponent (components/color-customizer/)
              │     │                 ├── Mode: Solid | Linear Gradient | Radial Gradient
              │     │                 ├── Angle Rotation Slider (0° - 360°)
              │     │                 ├── Dual Color Stops & Swap Button
              │     │                 ├── Dedicated Corner Locator Color Controls
              │     │                 ├── Curated Gradient Presets
              │     │                 └── WCAG Contrast Guard Meter (AAA, AA, Fail)
              │     │
              │     └── TAB 3: Dynamic Links Studio
              │           ├── DynamicLinksComponent (components/dynamic-links/)
              │           └── QrDynamicManagerComponent (components/dynamic-manager/)
              │                 ├── Managed Dynamic QRs List (live scan counts, status)
              │                 ├── Inline Destination URL Editor
              │                 ├── Pause / Resume Toggles
              │                 └── Scan Analytics Modal (Daily timeline, country, device)
              │
              ├── Column 2 (Right: Live Preview Panel ~45%)
              │     └── PreviewPanelComponent (components/preview-panel/)
              │           ├── Vector SVG / Canvas Stage Container
              │           ├── QrAssembleEffectComponent (components/qr-assemble-effect/)
              │           ├── In-Browser Scannability Verifier Badge (jsQR Multi-Pass)
              │           │     └── Calm Confidence Rating (High, Medium, Low) & Auto-Fix
              │           ├── ErrorCorrectionSelectorComponent (components/error-correction-selector/)
              │           ├── SizeSliderComponent (components/size-slider/)
              │           ├── MetadataDisplayComponent (components/metadata-display/)
              │           │     └── ISO/IEC 18004 Version, Capacity, Used Bytes, Usage Meter
              │           └── Action Bar:
              │                 ├── Download PNG (Primary CTA)
              │                 ├── Download SVG (Scalable Vector)
              │                 ├── Download JPEG
              │                 ├── Copy Image to Clipboard
              │                 ├── Share (Web Share API)
              │                 └── History Drawer Trigger
              │
              └── Modals & Overlays
                    ├── AdvancedModalComponent (components/advanced-modal/)
                    ├── CollectionsPanelComponent (components/collections-panel/)
                    ├── History Drawer (localStorage persistence)
                    └── Mobile Sticky Action Bar & Bottom Sheet (@acklet/tool-shell)
```

---

## 2. Dedicated Standalone Routes

```text
LandingViewerComponent (Route: /tools/qr-generator/view/:code)
  ├── Passcode Gate Screen (PIN / Password input for protected dynamic QRs)
  ├── Paused Notice Screen (Alert when link is paused)
  ├── Expired Notice Screen (Alert when link TTL has lapsed)
  └── Hosted Content Views:
        ├── PDF Document Viewer (Title, file size, description, preview frame, download CTA)
        ├── Restaurant Menu (Sections, items, prices, dietary badges: vegan/vegetarian/gluten-free/spicy)
        ├── Promo Coupon Card (Discount badge, promo code copy, expiry countdown, checkout CTA)
        ├── Digital Business Card (Contact info, social links, one-click Save Contact .vcf generator)
        └── Multi-URL Link-in-Bio Hub (Avatar, bio, outbound social profile links)

NotesViewerComponent (Routes: /tools/qr-generator/notes/:code & /notes/:code)
  ├── Clean, mobile-first responsive text reader for long plain text QR codes
  ├── Copy Text Button
  ├── Share / Save to Notes Action (Web Share API with fallback to copy)
  └── Download .txt File Action
```

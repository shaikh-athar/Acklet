---
tool: QR Generator
phase: 3
last-updated: 2026-10-21
status: Complete
---

# QR Generator — Component Tree & UI Architecture

This document describes the Angular component hierarchy, state flow, and modal overlay architecture for the QR Generator tool.

---

## 1. Component Hierarchy

```text
QRGeneratorComponent (standalone: true)
  State: selectedType, content, size, foregroundColor, backgroundColor, errorCorrection,
         frameOptions, dotsOptions, cornersOptions, logoOptions, dynamicDrawerOpen, batchModalOpen
  │
  ├── Header Actions Area
  │   ├── Dynamic QRs Drawer Trigger Button (Pill badge showing active count)
  │   └── Batch Generate Trigger Button
  │
  ├── Two-Column Responsive Workspace Grid
  │   ├── Column 1 (Left: Studio Panel ~55%)
  │   │   ├── Studio Header
  │   │   │   ├── Unified Type Picker Track (5 Quick Chips: URL, Text, Wi-Fi, vCard, Email)
  │   │   │   ├── Accessible More Dropdown Popover (7 Extended Types: Phone, SMS, Geo, Event, Social, App, Crypto)
  │   │   │   ├── Sample Example Loader Trigger
  │   │   │   └── Consolidated Studio Tabs (Content | Design | Settings)
  │   │   │
  │   │   ├── Tab 1: Content
  │   │   │   └── InputPanelComponent (standalone: true)
  │   │   │       ├── Dedicated Structured Form Controls (8px grid standardization)
  │   │   │       ├── Progressive Disclosure (<details class="more-options"> for UTMs, MECARD, Wi-Fi EAP)
  │   │   │       └── Dynamic Three-State Status Line (Ready, Capacity Warning >80%, Error with Fix Link)
  │   │   │
  │   │   ├── Tab 2: Design
  │   │   │   ├── Segmented Sub-Navigation (Colors | Shapes | Logo | Frame)
  │   │   │   ├── Sub-Tab Colors: ColorCustomizerComponent (Hex, Pickers, WCAG Contrast Guard)
  │   │   │   ├── Sub-Tab Shapes: DesignCustomizerComponent (Dot Matrix, Corner Locators, Presets)
  │   │   │   ├── Sub-Tab Logo: DesignCustomizerComponent (Upload, SVG presets, Scaling/Margin)
  │   │   │   └── Sub-Tab Frame: DesignCustomizerComponent (CTA Banners, Colors, Frames)
  │   │   │
  │   │   └── Tab 3: Settings
  │   │       ├── ErrorCorrectionSelectorComponent (L, M recommended, Q, H)
  │   │       ├── SizeSliderComponent (100–2000px slider + preset chips)
  │   │       └── Collapsed Technical Details Disclosure (<details>)
  │   │           ├── MetadataDisplayComponent (Matrix Version, Capacity limits, Usage %)
  │   │           └── Encoded RFC Payload Code Block with 1-click clipboard copy
  │   │
  │   └── Column 2 (Right: Live Preview & Action Bar ~45%)
  │       └── PreviewPanelComponent (standalone: true)
  │           ├── Vector SVG / Canvas Stage Container with decorative frame rendering
  │           ├── Test Scannability Action Button (jsQR Camera-Grade Verifier Badge)
  │           ├── Primary Action Bar: Split Download PNG / JPEG Dropdown + Dedicated Quick SVG Vector Button
  │           └── Drawer & Modal Controls: History Drawer, Batch Modal, Dynamic QRs Drawer
  │
  ├── Modals & Overlays (Dynamic / State-driven)
  │   ├── QrDynamicManagerComponent (standalone: true)
  │   │   [isOpen] (close)
  │   │   ├── Managed QRs List with live scan counts and status pills
  │   │   ├── Inline Destination URL Editor
  │   │   ├── Pause / Resume Toggles
  │   │   ├── Scan Analytics Modal (Daily trends, device, country breakdown)
  │   │   └── New Dynamic QR Creator (Website, PDF, Menu, Coupon, vCard, Multi-URL with file upload)
  │   │
  │   └── BatchGeneratorComponent (standalone: true)
  │       [isOpen] (close)
  │       ├── CSV File Dropzone & Raw Text Paste Parser
  │       ├── "Load Sample CSV" Demo Action
  │       ├── Asynchronous Batch Generation Pipeline with Progress Bar (X of Y)
  │       ├── Interactive Preview Grid with Single-Item PNG Download & Copy
  │       └── One-Click "Download ZIP Archive" Button (JSZip)
```

---

## 2. Dedicated Standalone Routes

```text
LandingViewerComponent (Route: /tools/qr-generator/view/:code)
  ├── Authentication Gate (PIN / Passcode input for protected QRs)
  ├── Paused Notice Screen (Friendly alert when shortlink is paused)
  ├── Expired Notice Screen (Alert when link TTL has lapsed)
  └── Hosted Content Views:
      ├── PDF Document Viewer (Title, size, description, preview frame, download CTA)
      ├── Restaurant / Cafe Menu (Sections, items, prices, dietary badges: vegan/vegetarian/gluten-free/spicy)
      ├── Promo Coupon Card (Discount badge, promo code copy, expiry countdown, checkout CTA)
      ├── Digital Business Card (Contact info, social links, one-click Save Contact .vcf generator)
      └── Multi-URL Link-in-Bio Hub (Avatar, bio, list of outbound social links)
```

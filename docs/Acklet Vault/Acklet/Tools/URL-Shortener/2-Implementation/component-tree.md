# URL Shortener — Component Tree & UI Architecture

This document diagrams the visual hierarchy, component decomposition, and reactive signals data flow for **URL Shortener by Acklet**.

Related Documents:
- [service-design.md](service-design.md) — Service contracts and data stores
- [features.md](../0-Requirements/features.md) — Baseline features and interaction design
- [README.md](../README.md) — Documentation index

---

## 1. Component Hierarchy (ASCII Tree)

```text
AppComponent (Standalone Shell Host)
│
└── ts-shell (Tool Shell Container, fullBleed layout)
    │
    ├── [Slot: Navbar] ts-navbar
    │   ├── Logo & Brand Mark
    │   ├── Category Badge ("Links/Web")
    │   ├── Tool Title ("URL Shortener")
    │   ├── Lordicon Animated Chain Icon (recolored to amber)
    │   └── Theme Switcher (Dark / Light)
    │
    ├── [Slot: Sidebar] ts-sidebar
    │   └── ts-tool-list (Categorized Navigation Tree)
    │       └── "Links/Web" Group
    │           ├── QR Generator (emerald accent)
    │           └── URL Shortener (amber accent, active item)
    │
    └── [Slot: Main Area] UrlShortenerComponent
        │
        ├── Creation Mode (Hero / Main Workspace)
        │   ├── Header Area (Title, Lordicon icon, badge, "My Links" trigger)
        │   ├── Shortener Card (Glass Container, fluid max-width ~720px, clamp padding)
        │   │   ├── URL Input Field (Autofocus, protocol badge, clear button, 16px font on mobile)
        │   │   ├── Options Row / Collapsible Inline Column on Compact
        │   │   │   ├── Custom Alias Input (Prefix "/ ", character counter, inline error)
        │   │   │   └── Expiry Custom Glass Dropdown (7d / 30d / 1y / Never)
        │   │   └── Shorten Action Button (Full-width, primary button tokens, sticky-safe)
        │   │
        │   ├── Result Card (Slide-fade-up 12px micro-animation, slideFadeOut on "Shorten another")
        │   │   ├── Success Pill & Status Indicator
        │   │   ├── Formatted Short URL Display
        │   │   ├── Result Action Area
        │   │   │   ├── Copy Button (Primary action, 1500ms copied feedback)
        │   │   │   ├── Desktop / Medium (>=600px): All options directly visible ("Make QR", "Preview", "View my links")
        │   │   │   └── Compact (<600px): "Make QR" + ActionDropdownComponent ("More" dropdown)
        │   │   └── Link Metadata (Original URL snippet, TTL badge)
        │   │
        │   └── Features & SEO Information Section
        │       ├── Features Grid (Cards)
        │       ├── How to Use (Step-by-step guidance)
        │       └── FAQ Accordion
        │
        ├── Safe Preview Mode (Triggered by /s/{code}+ or "Preview" Button via backend /preview endpoint)
        │   └── Preview Card (Glass Container)
        │       ├── Destination Domain & URL Highlight (Host only for protected links)
        │       ├── Link Health Badge & Threat Evaluation
        │       ├── Metrics (Created date, expiry countdown, clicks)
        │       ├── Navigation Button ("Continue to Destination")
        │       └── Return to Shortener Button
        │
        ├── SPA Root Route Forwarder
        │   └── Any root path /{code} automatically redirects to canonical backend endpoint /s/{code}
        │
        ├── My Links Management View
        │   ├── Merged Search + Filter Toolbar (Full-width search, "Filters" popover)
        │   ├── Expanded View (>=1024px): Dense table with Original link, Short link, Status, Protection / Expiry (8px badge gap), Clicks, Copy + ActionDropdown
        │   ├── Medium View (600-1023px): Two-line rows with original link below short link
        │   └── Compact View (<600px): Card list, wrapped badges, touch-friendly Copy + three-dots ActionDropdown
        │
        ├── Reusable Action Dropdown (ActionDropdownComponent)
        │   ├── CSS Absolute Anchoring: Positioned directly relative to trigger host, immune to containing block / backdrop-filter shifts
        │   ├── Flip Detection: Automatically opens above trigger when viewport bottom space is below threshold
        │   └── Keyboard Navigation: Role menu/menuitem, Arrow Up/Down, Home/End, Esc, Enter/Space, outside pointer click dismissal
        │
        ├── Modals & Dialogs (Max-width 480px centered on desktop; bottom sheet on compact)
        │   ├── Edit Link Modal Dialog / Bottom Sheet
        │   ├── Delete Confirmation Modal Dialog / Bottom Sheet (Stacked buttons on compact: delete on top)
        │   ├── Backup & Recovery Modal Dialog / Bottom Sheet
        │   └── Report Abuse Modal Dialog / Bottom Sheet
        │
        └── Toast Feedback Notification
```

---

## 2. Reactive State Management (Angular Signals)

`UrlShortenerComponent` coordinates application state using lightweight Angular signals:

| Signal | Type | Purpose |
| :--- | :--- | :--- |
| `inputUrl` | `WritableSignal<string>` | Value of destination URL input field. |
| `customAlias` | `WritableSignal<string>` | Value of optional custom slug. |
| `selectedTtlDays` | `WritableSignal<number \| null>` | Selected expiration period in days. |
| `isLoading` | `WritableSignal<boolean>` | Loading spinner state during async shortening. |
| `result` | `WritableSignal<ShortLinkRecord \| null>` | Active shortened result record. |
| `copied` | `WritableSignal<boolean>` | Visual feedback trigger for 1-click copy (1500ms duration). |
| `activeFilterCount` | `Signal<number>` | Computed count of active filters for compact badge. |
| `isFilterSheetOpen` | `WritableSignal<boolean>` | State of mobile compact filters bottom sheet. |
| `isEditDrawerOpen` | `WritableSignal<boolean>` | Visibility of edit link dialog/sheet. |
| `linkPendingDelete` | `WritableSignal<string \| null>` | Target code for delete confirmation dialog. |
| `isRecoveryModalOpen` | `WritableSignal<boolean>` | Visibility of backup & restore modal. |
| `isReportModalOpen` | `WritableSignal<boolean>` | Visibility of "Report Link" dialog. |
| `redirectStatus` | `WritableSignal<RedirectStatus>` | Status during route inspection (`ACTIVE`, `EXPIRED`, etc.). |
| `previewRecord` | `WritableSignal<ShortLinkRecord \| null>` | Target record when rendered in safe preview mode. |
| `isUrlValid` | `Signal<boolean>` | Computed signal validating input URL syntax and protocol. |

---

## 3. Styling & WCAG AA Compliance

- **Primary Button Design System Tokens**:
  - Background: `--btn-primary-bg: #C98B4E` (warm bronze in both Light and Dark themes).
  - Text / Icon: `--btn-primary-text: #1F1608` (high contrast ratio >= 6.2:1 exceeding WCAG AA).
  - Hover State: `--btn-primary-hover: #D49A5E` with max 1px translateY lift and 0.25s transition.
  - Pressed State: `--btn-primary-pressed: #B87C42`.
  - Disabled: `--btn-primary-disabled-opacity: 0.45`.
  - Focus-Visible: 2px ring in accent with 2px offset (`outline: 2px solid var(--btn-primary-focus-ring); outline-offset: 2px;`).
- **Responsive Foundation**:
  - Supported widths: 320px, 360px, 390px, 412px, 600px, 768px, 820px, 1024px, 1280px, 1440px, 1920px.
  - Viewport: Uses dynamic viewport height (`100dvh`) with safe-area insets (`env(safe-area-inset-bottom)`).
  - Fluid container: Max-width 720px on main card, padding `clamp(12px, 4vw, 32px)`, 8px spacing scale.
  - Touch targets: All touch targets at least 44x44px with >= 8px separation.
  - Form inputs: 16px font-size on mobile viewports (<768px) preventing automatic iOS zoom; `(focus)="onFieldFocus($event)"` for keyboard-safe auto-scroll.
  - Tooltips: Scoped to `@media (hover: hover)`, with tap equivalents for all interactive elements.

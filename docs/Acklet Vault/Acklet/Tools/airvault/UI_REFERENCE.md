# AirVault UI Reference & Design Specification (v2)

## 1. Design Token System & Palette Discipline (DataLens Model)

AirVault follows the strict design discipline established by Acklet's DataLens tool:

| Token Name | Light Theme | Dark Theme | Role & Purpose |
| :--- | :--- | :--- | :--- |
| `--av-bg-canvas` | `#F8F9FA` | `#0B0D10` | Base neutral canvas (90% of UI) |
| `--av-surface-primary` | `#FFFFFF` | `#111419` | Primary card & toolbar surfaces |
| `--av-surface-secondary` | `#F3F4F6` | `#171B21` | Input backgrounds & secondary nodes |
| `--av-surface-elevated` | `#F9FAFB` | `#1E232B` | Hover states & selected cards |
| `--av-border` | `#E1E4E8` | `#252B33` | Restrained neutral container borders |
| `--av-border-subtle` | `#EAECEF` | `#1A1F26` | Subtle dividers & inner lines |
| `--av-text-main` | `#24292E` | `#E8EAED` | High-contrast body typography |
| `--av-text-muted` | `#586069` | `#8B949E` | Secondary captions & timestamps |
| `--av-primary` | `#2196F3` | `#2196F3` | **Strictly reserved**: Primary Beam action & active selection |
| `--av-success-deep` | `#0D47A1` | `#0D47A1` | **Strictly reserved**: Critical Beamed delivery confirmation |
| `--av-success` | `#1A7F37` | `#3FB950` | Connected status indicators |

---

## 2. Layout Structure & Screens

### 2.1 Screen 1: Main 100vh Focused Clipboard (Clean Consolidated Layout)
- **Top Navigation Bar (`.av-navbar`)**:
  - **Left**: Brand breadcrumb (`Acklet / AirVault`).
  - **Center**: Centered permanent search bar (`Search text, URLs, code, files...`) with match navigation controls, query clear button, and interactive search dropdown.
  - **Right Action Sequence**:
    - **Clear Button (`.av-topbar-clear-btn`)**: Text `"Clear"` + trash icon with high-contrast red hover state (`--av-danger-soft`, `--av-danger`), triggering the animated custom `AirVaultClearConfirmModalComponent`.
    - **Refresh Button (`.av-btn-icon`)**: Refreshes clipboard items with rotating icon animation.
    - **Filter Button & Popover (`.filter-popover-anchor`)**: Sliders icon with active filter badge counter, opening a rich multi-select popover dropdown covering **Format** (Text, Code, JSON, URL, Media, Files), **Time** (Today, 7d, 30d), **Sender / Device**, **Payload Size** (Small, Medium, Large), and **Attributes** (Pinned Only, Sensitive/Secrets).
    - **Sync Status Pill**: Interactive device connection indicator.
- **Masonry / Responsive Card Grid Area**:
  - CSS Grid with `auto-fit` columns (`minmax(220px, 1fr)`, gap 12px), where each item is an independent browsable card sized to its own content.
  - **In-Card Sender Badge**: Located in the top-left corner of each card (`[accent dot] @username`, or `@chr (this device)` for local items), with relative timestamp (`4m`, `2m`, `now`) in the top-right corner.
  - **Card Content Rendering**: Rich syntax-highlighted code, text with entity detection pills (URLs, tracking numbers, phone numbers, addresses), image/file previews, expiration chips, and copy buttons.
  - **Current Device Visual Cue**: Local device cards receive a subtle blue accent border (`.is-self`), matching the wireframe specification.
  - **Empty Watermark**: Displays dropzone instructions, client-side encryption badges, and 1-click sample pills (`Code Snippet`, `JSON Payload`, `URL Link`).
- **Composer Auto-Growth & Expansion Dimensions**:
  - *Default/Collapsed mode*: Auto-grows dynamically up to ~6–7 lines (~150px) to comfortably accommodate multi-sentence messages before internal scrolling or full expansion.
  - *Expanded mode*: Expands to accommodate ~15–18 lines (~280px–380px) with docked bottom controls for long-form scripts, markdown documentation, and complex multi-line snippets.
  - *Expand/Collapse Toggle*: Corner expansion button using `maximize-2` / `minimize-2` matching the modern composer standard.
  - *Clear Button*: Icon updated to `rotate-ccw` (with red hover danger styling) to clearly signify resetting/clearing the active device clipboard.
  - Leading paperclip attach button (`Upload file`, `Upload folder (.zip)`).
  - Text input area with placeholder `"Drop files, folders, or start typing"`.
  - Layered backdrops for attribution & entity detection.
  - Trailing Send/Beam button (`⌘ + Enter`).
- **Persistent Bottom Dock (`AirVaultFooterComponent`)**:
  - Left capsule: Clipboard History (`⌘H`), Auto-Capture toggle (primary path), Font Family & Size menus, and vault storage gauge.
  - Center capsule: `Pair Device` button + integrated **Theme toggle** (`Light` / `Dark`) separated by a clean vertical divider.
  - Right: Floating Operational/Info screen toggle HUD button.

### 2.2 Screen 2: Dedicated Secondary Details Section (`#airvault-info-screen`)
Reachable via smooth scroll or the bottom dock info button:
- **Zero-Knowledge Cryptography**: Web Crypto ECDH P-256 + AES-GCM-256 in-browser security specs.
- **Peer-to-Peer Transport Architecture**: BroadcastChannel & WebRTC DataChannels details.
- **Keyboard Shortcuts**: `⌘ + Enter`, `⌘ + V`, `Esc`.

---

## 3. Storage Indicators & Expiration Badges

- **Top Bar Limits Pill**: `500 MB Max · 1 GB Cap · 7d Expiry` inline mono pill with tooltip guidance.
- **Pre-Upload Warning Banner**: Amber container (`rgba(245, 158, 11, 0.12)`) triggered for files `> 50 MB`, highlighting off-thread encryption and 7-day retention notice.
- **Card Expiry Chips**:
  - `🕒 7d`: Standard countdown timer for active items.
  - `⚠️ Expiring Soon`: Animated amber pulsing chip when `< 24h` remaining, prompting users to pin critical items.
  - `📌 Permanent`: Cyan indicator for pinned items immune to auto-purging.
- **Bottom Dock Storage Gauge**: Real-time `${used} MB / 1.0 GB vault storage used` display with color-coded fill gauge.

---

## 4. Per-Line Blame Gutter (GitHub Blame-Style Attribution)

- **Line Gutter Tick**: `4px` vertical bar (`border-radius: 2px`) on each text/code line row in the live shared editor, tinted with the author's deterministic identity color (`AirVaultColorService`).
- **Contiguous Block Merging**: Consecutive lines authored by the same device merge seamlessly into unified vertical accent pillars (`pos-start`, `pos-middle`, `pos-end`, `pos-single`).
- **Hover Micro-Interaction**: Gutter tick expands from `4px` to `6px` with full opacity `1.0` and subtle elevation.
- **Interactive Device Name Tooltip**: Escapes container clipping contexts via a floating overlay pill displaying the author's device name, username handle (`@username`), author accent color dot, and relative timestamp (`Authored by iPhone 15 (@ayaz) · Just now`).
- **Entry vs. Line-Level Scoping Rule**:
  - Multi-line text, code, and JSON entries use per-line blame ticks.
  - Single-line entries preserve the single entry-level gutter bar.
  - Non-text categories (images, binary files, batches, archives) never display line ticks and preserve entry-level scoping.

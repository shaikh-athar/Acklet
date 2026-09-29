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
  - **Left**: Brand breadcrumb (`Acklet / AirVault /`) + **Multi-Clipboard & Collaborators Dropdown Switcher (`.av-clipboard-dropdown-anchor`)**:
    - Interactive capsule button (`.av-slug-chip`) displaying active memorable slug (e.g. `#dez01788`), board icon, and dropdown chevron.
    - Displays `Shared` tag when viewing remote collaborator/guest clipboard.
    - **Collaborator & Multi-Clipboard Dropdown (`.av-clipboard-dropdown-menu`)**:
      - Displays the primary personal vault with an `Admin` badge.
      - Lists all connected/collaborator clipboards with role indicators (`Admin` vs `Collaborator`), read-only tags, and member details.
      - **Sub-Dropdown Action Menu (`.board-sub-dropdown-menu`)**: Clean 3-dots (`...`) menu button (`.board-menu-trigger-btn`) per row that opens a contextual sub-dropdown popover menu containing:
        - **Copy Link**: 1-click copies the clipboard link to clipboard.
        - **Share Board**: Opens the full share modal dialog.
        - **Rename ID (Admin)**: Inline slug editor (restricted to the Admin/Owner of that board).
      - 1-click seamless clipboard board switching and quick invite trigger (`Invite Collaborators to Board`).
    - 1-click edit button (`.edit-btn`) opening inline slug editor (`.av-slug-editor`) with live debounce availability verification (`/check-slug`), input auto-select, Enter to save, and Esc to cancel.
  - **Center**: Centered permanent search bar (`Search text, URLs, code, files...`) with match navigation controls, query clear button, and interactive search dropdown.
  - **Right Action Sequence**:
    - **Clear Button (`.av-topbar-clear-btn`)**: Text `"Clear"` + trash icon with high-contrast red hover state (`--av-danger-soft`, `--av-danger`), triggering the animated custom `AirVaultClearConfirmModalComponent`.
    - **Refresh Button (`.av-btn-icon`)**: Refreshes clipboard items with rotating icon animation.
    - **Filter Button & Popover (`.filter-popover-anchor`)**: Sliders icon with active filter badge counter, opening a rich multi-select popover dropdown covering **Format** (Text, Code, JSON, URL, Media, Files), **Time** (Today, 7d, 30d), **Sender / Device**, **Payload Size** (Small, Medium, Large), and **Attributes** (Pinned Only, Sensitive/Secrets).
    - **Sync Status Pill**: Interactive device connection indicator.
- **Masonry / Responsive Card Grid Area**:
  - CSS Grid with `auto-fit` columns (`minmax(220px, 1fr)`, gap 12px), where each item is an independent browsable card sized to its own content.
  - **In-Card Sender Badge**: Located in the top-left corner of each card (`[accent dot] @username`), with relative timestamp (`4m`, `2m`, `now`) in the top-right corner.
  - **Card Content Rendering**: Rich syntax-highlighted code, HTML/markdown rich-text snippet with preserved formatting (headings, lists, bold/italic, code, links), image/file previews, expiration chips, and copy buttons.
  - **Multi-Resource & Mixed Item Visual Architecture**:
    AirVault natively supports mixed payloads containing rich markdown/text along with single or multiple attached media/files.
    
    1. **Card / Tile View**:
       - Mixed payloads display a clean `.mixed-resource-header` top bar with a thumbnail icon/image and attachment count chip (`+1`, `+2`), followed by the rich-text snippet in `.mixed-text-snippet`.
       - Pure multi-file batches without custom user notes display the 3-layer card depth stack (`.batch-stacked-container`).
       
    2. **Preview Modal Architecture**:
       - Mixed items open into a capsule-first preview workflow:
         - **Resource Capsules Section (`.mixed-capsules-section`)**: Renders compact capsule cards (`.mixed-resource-capsule-card`) for each attached file with thumbnail, name, byte size, and an interactive `Preview` action badge.
         - **Standalone Media Viewer on Demand (`.mixed-expanded-viewer-card`)**: Clicking any resource capsule expands the standalone full-resolution media viewer directly above the notes, with zoom/controls for that file. Clicking again collapses it.
         - **Rich Document View (`.mixed-preview-text-section`)**: Renders full markdown/HTML notes with full formatting below.
       - Pure file payloads open directly into their dedicated standalone full-stage viewer (`<app-airvault-file-preview>`).
    - **Full Preview Modal**: Renders the complete **Resource viewer/gallery first on top** (interactive image, video, audio player, PDF, or spreadsheet viewer), followed by a clear divider and the **complete formatted rich-text document view below it**.
  - **Current Device Visual Cue**: Local device cards receive a subtle blue accent border (`.is-self`), matching the wireframe specification.
  - **Empty Watermark**: Displays dropzone instructions, client-side encryption badges, and 1-click sample pills (`Code Snippet`, `JSON Payload`, `URL Link`).
- **Composer Auto-Growth, Rich Formatting & Expansion Dimensions**:
  - *Rich WYSIWYG Core*: Powered by headless TipTap editor with native Markdown/HTML bidirectional sync and multi-line line blame preservation.
  - *Floating Formatting Bubble Toolbar*: Appears ~40px above selection with bounds-checking, offering Bold, Italic, Code, Link modal, Headings (H1/H2/H3), Lists (bulleted/numbered), and font-size selectors (12px, 13.5px, 15px, 17px).
  - *Default/Collapsed mode*: Auto-grows dynamically up to ~6–7 lines (~150px) to comfortably accommodate multi-sentence messages before internal scrolling or full expansion.
  - *Expanded mode*: Expands to accommodate ~15–18 lines (~280px–380px) with docked bottom controls for long-form scripts, markdown documentation, and complex multi-line snippets.
  - *Expand/Collapse Toggle*: Corner expansion button using `maximize-2` / `minimize-2` matching the modern composer standard.
  - *Input Field Clear Action*: Compact clear button (`x`) inside the composer toolbar adjacent to the `+` attachment button, allowing users to wipe staged text/files with 1 click without touching vault clipboard history.

### 2.4 Multi-Resource Batch Action Bar & Transfer Workflow
- **Multi-Resource Selection**:
  - Each clipboard card provides an interactive checkbox in its top-left header.
  - Hovering over a card reveals the checkbox; selecting an item persists the checkbox and highlights the card container with an active accent ring (`0 0 0 1.5px var(--av-accent)`).
- **Floating Batch Action Bar (`.av-batch-floating-bar`)**:
  - Automatically floats docked above the composer row whenever one or more items are selected.
  - **Left**: Select All / Deselect All toggle button with active count pill (`N selected`).
  - **Center (Idle)**: Destination Device Picker dropdown button with device dot, name, `@username`, and chevron.
  - **Center (Sending)**: Live progress indicator (`Sending X of Y · "resource-name"`) with breakdown statistics (`N sent · M failed · K pending`).
  - **Right**: Primary `Send to Device` action button with animated loading spinner during transfer, alongside a cancel (`x`) button to dismiss selection.
- **Completion Feedback**:
  - Dispatches non-blocking transfers sequentially through the existing single-item `broadcastItem` / `beamContent` pipeline.
  - Displays a clean completion summary toast upon finish (e.g. `✓ Successfully sent all 5 resources to @laptop` or `✓ Sent 4 resources to @laptop (1 failed)`).
  - *Clear Button*: Icon updated to `rotate-ccw` (with red hover danger styling) to clearly signify resetting/clearing the active device clipboard.
  - Leading paperclip attach button (`Upload file`, `Upload folder (.zip)`).
  - Text input area with placeholder `"Drop files, folders, or start typing"`.
  - Layered backdrops for attribution & entity detection.
  - Trailing Send/Beam button (`⌘ + Enter`).
- **Interactive Modals & Dialogs**:
  - **Destination Sync Consent Modal (`AirVaultSyncConsentModalComponent`)**: Displays on incoming device pairing/reconnection, asking the user whether to *"Sync Clipboard"* with the connecting peer or *"Ignore / Skip"*, preserving full device isolation and autonomy.
  - **Duplicate Resource Notification Modal (`AirVaultDuplicateModalComponent`)**: Non-intrusive alert notifying users when a staged/incoming resource is identical to an existing resource from a paired user (`@paired-user`), displaying resource snippet and category badge without blocking vault operations.
- **Action-Specific Processing Loaders & Semantic Icons**:
  AirVault replaces generic spinners with distinct lightweight Lucide Angular icons and animated pulse/spin feedback communicating active operations:
  
  | Action / Operation | Lucide Icon | Animated Visual | Label / State | Semantics & Workflow |
  | :--- | :--- | :--- | :--- | :--- |
  | **Sending** | `Send` | Micro-bounce / transition | `Sending…` | Initial beam dispatch from staging composer. |
  | **Pairing** | `Loader2` | Smooth spin | `Pairing…` | ECDH cryptographic key exchange and identity registration. |
  | **Resending** | `RefreshCw` | Clockwise spin | `Resending…` | Retrying transmission of a specific vault item. |
  | **Syncing** | `RefreshCcw` | Counter-clockwise spin | `Syncing…` | Bi-directional history synchronization between connected devices. |
  | **Reconnecting** | `Loader2` | Smooth spin | `Reconnecting…` | Symmetrical peer reconnect and presence recovery. |
  | **Uploading** | `LoaderCircle` | Circular progress ring | `Uploading…` | Streaming chunked multi-part binary files to storage adapter. |
  | **Downloading / Lazy Loading** | `LoaderCircle` | Smooth spin | `Loading…` | On-demand streaming of verified binary payload/chunks. |
  | **Processing Large File** | `LoaderCircle` / `Loader2` | Smooth spinning circle | `Processing…` | Off-thread Web Worker AES-GCM decryption and thumbnail generation. |

  *Timing & Visibility Guarantee*:
  ```text
  Action starts immediately
          ↓
  Action-specific icon + loader
          ↓
  Fast operation (< 500ms) → Minimum ~1–1.5s visible for perceptual clarity
          ↓
  Slow / large payload    → Remains active until actual async completion
          ↓
  Success / Error state transition
  ```
- **Persistent Bottom Dock (`AirVaultFooterComponent`)**:
  - Left capsule: Clipboard History (`⌘H`), Auto-Capture toggle (primary path), Font Family & Size menus, and vault storage gauge.
  - Center capsule: `Pair Device` button + integrated **Theme toggle** (`Light` / `Dark`) separated by a clean vertical divider.
  - Right: Floating Operational/Info screen toggle HUD button.

### 2.2 Screen 2: Dedicated Secondary Details Section (`#airvault-info-screen`)
Reachable via smooth scroll or the bottom dock info button:
- **Zero-Knowledge Cryptography**: Web Crypto ECDH P-256 + AES-GCM-256 in-browser security specs.
- **Peer-to-Peer Transport Architecture**: BroadcastChannel & WebRTC DataChannels details.
- **Keyboard Shortcuts**: `⌘ + Enter`, `⌘ + V`, `Esc`.

### 2.4 Standalone Share Link UI Architecture & Permissions
- **Navbar & Footer Share Link Actions (`.av-btn-share-link`)**:
  - Distinct cyan-accent button (`Share Link` with `share-2` icon) clearly distinguished from `Pair Device`.
  - Opens `AirVaultShareLinkModalComponent`.
- **Share Link Modal (`AirVaultShareLinkModalComponent`)**:
  - **Explainer Banner**: Clearly explains the conceptual difference between Link Sharing (Google Docs-style access via raw URL) and Device Pairing (permanent auto-sync across owned devices).
  - **1-Click Copy Box**: Formatted canonical URL display (`airvault.com/c/{clipboardId}`) with copy button and auto-revert `✓ Copied` feedback.
  - **Access Permissions Toggle**:
    - **Read-Only (Default)**: Cyan radio card explaining view & copy privileges.
    - **Read & Write**: Emerald radio card enabling collaborative contribution with guest identity attribution.
  - **Metadata & Expiry**: Highlights 7-day auto-refreshing retention policy and single-board cryptographic scoping.
- **Shared Board Top Banner (`AirVaultSharedBannerComponent`)**:
  - Displayed at top of operational stage when viewing someone else's clipboard via link.
  - Shows board ID, owner handle (`@owner`), active permission badge (`Read-Only` or `Read & Write`), 1-click Link Copy, and a direct CTA to `Pair with @owner`.
  - **Expired / Not Found Fallback**: Dedicated centered card state explaining expired link retention with a 1-click CTA button to return to the visitor's own personal vault.
- **Read-Only Staging Dock (`.shared-readonly-dock`)**:
  - Replaces the composer bar when viewing a read-only shared link, informing visitors that content can be copied and downloaded freely, while contribution requires a read-write link.

---

## 3. Storage Indicators & Expiration Badges

- **Top Bar Limits Pill**: `500 MB Max · 1 GB Cap · 7d Expiry` inline mono pill with tooltip guidance.
- **Pre-Upload Warning Banner**: Amber container (`rgba(245, 158, 11, 0.12)`) triggered for files `> 50 MB`, highlighting off-thread encryption and 7-day retention notice.
- **Card Expiry & Policy Chips**:
  - `🕒 7d`: Standard countdown timer for active items.
  - `⚠️ Expiring Soon`: Animated amber pulsing chip when `< 24h` remaining, prompting users to pin critical items.
  - `📌 Permanent`: Cyan indicator for pinned items immune to auto-purging.
  - `🔥 Burn on view` / `.burn-timeline-icon`: Crimson `rotate-cw` indicator positioned in the card header timeline (next to `@author · Xm ago`) for Burn-After-Read ephemeral items, freeing up the top-right corner action slot for `#tag` labels and `<>` format badges with 180° rotation on card hover.
- **Top-Right Corner Slot Architecture**:
  - Fixed-anchor corner slot (`.card-header-action-slot`): In resting state, hosts `.card-tag-slot-group` containing the Code/JSON indicator badge (`.card-code-badge` with `<app-icon name="code">`) alongside custom `#tag` pills.
  - On tile hover, smoothly swaps in-place to quick action buttons (`.card-actions-slot`: resend, reveal, pin, trash) with zero layout shift or card reflow.
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

---

## 5. Clipboard Item Lifecycle Micro-Animations

AirVault provides distinct, GPU-accelerated micro-animations for every clipboard item lifecycle event without visual lag or heavy blocking:

| Lifecycle Event | Visual Animation | Timing & Easing | Semantics & Feel |
| :--- | :--- | :--- | :--- |
| **New Item Entrance (Local Capture)** | Elastic upward spring (`translateY: 14px → 0`, `scale: 0.96 → 1`, `opacity: 0 → 1`) | 280ms · `back.out(1.5)` | Crisp, tactile entry communicating immediate local capture. |
| **New Item Entrance (Synced from Peer)** | Slide-down + accent border halo glow | 340ms · `power2.out` + 800ms halo pulse | Distinct from local captures; visually announces arrival from a connected device. |
| **Item Deletion / Dismissal** | Smooth shrink & slide-out (`scale: 1 → 0.92`, `translateY: 0 → 8px`, `opacity: 1 → 0`) | 200ms · `power2.in` | Clean departure feedback before card unmounts. |
| **Item Reordering / Grid Rearrangement** | Smooth GPU transform transition on grid cell (`contain: layout style`) | 220ms · `cubic-bezier(0.16, 1, 0.3, 1)` | Fluid rearrangement when tiles are dropped or sorted. |
| **Item Update / Resend / Sync** | Subtle radial accent halo pulse (`.av-sync-pulse-active`) | 800ms · `cubic-bezier(0.16, 1, 0.3, 1)` | Informs the user that an existing item received new sync updates. |
| **Item Pin / Unpin** | Micro-lift and spring settle (`scale: 1.02, y: -3` → settle) | 340ms · `back.out(1.4)` | Tactile physical feedback confirming permanent pin state. |
| **Burn-After-Read Dissolve** | Upward blur & dissolve (`filter: blur(4px)`, `y: -12px`, `opacity: 0`) | 400ms · `power2.out` | Visual destruction feedback for ephemeral items. |

*Reduced Motion*: All micro-animations automatically fall back to instant or simple opacity transitions when `@media (prefers-reduced-motion: reduce)` is active.


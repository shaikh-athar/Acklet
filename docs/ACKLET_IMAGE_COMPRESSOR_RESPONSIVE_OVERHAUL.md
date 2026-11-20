# Acklet Image Compressor — Responsive Overhaul & Layout Architecture

This document details the responsive design architecture, breakpoint standardization, layout fixes, and multi-viewport verification for the Acklet Image Compressor (`client/apps/tool-image-compressor`).

Related architectural documentation:
- [image-compressor-architecture.md](image-compressor-architecture.md)
- [ACKLET_IMAGE_COMPRESSOR_FLOW_PRIORITIES_TRANSFORMS_AND_TIFF.md](ACKLET_IMAGE_COMPRESSOR_FLOW_PRIORITIES_TRANSFORMS_AND_TIFF.md)
- [ACKLET_IMAGE_COMPRESSOR_PHASE4_ACHIEVABLE_SIZE_INTELLIGENCE.md](ACKLET_IMAGE_COMPRESSOR_PHASE4_ACHIEVABLE_SIZE_INTELLIGENCE.md)
- [responsive-design-system.md](responsive-design-system.md)

---

## 1. Centralized Breakpoint System

Breakpoints are defined in one canonical stylesheet: [`client/apps/tool-image-compressor/src/breakpoints.css`](../client/apps/tool-image-compressor/src/breakpoints.css), imported directly into `styles.css`. No component uses ad-hoc media query widths.

| Breakpoint | Pixel Range | Target Device Category | Columns (Cards) | Format Grid |
|---|---|---|---|---|
| `xs` | 0px to 479px | Mobile phones (e.g. 360px Galaxy A55, 375px iPhone SE) | 1 column | 3 columns (2 rows) |
| `sm` | 480px to 767px | Large phones & phablets (e.g. 390px iPhone 14/15) | 1-2 columns | 3 columns (2 rows) |
| `md` | 768px to 1023px | Tablets (iPad mini, iPad Air/Pro portrait) | 3 columns | 6 columns (1 row) |
| `lg` | 1024px and up | Desktop workstations & laptops | 4 columns | 6 columns (1 row) |

*Viewport Meta Tag*: Confirmed configured in HTML template as `<meta name="viewport" content="width=device-width, initial-scale=1">`.

---

## 2. Layout & Responsive Corrections by Screen

### 2.1 Home Screen (Upload & Presets Landing)
- **Source Dropdown & Option Order**: Added "This device" at the top of the source dropdown. Order is strictly:
  1. *This device* (local file picker via `folder` icon)
  2. *Google Drive*
  3. *Dropbox*
  4. *Clipboard* (paste image from system clipboard)
- **Select Files Button & Chevron Placement**: The chevron sits completely inside the button's right boundary (20px icon, vertically centered, 12px from right edge), using the button's own padding (`padding: 0 44px 0 28px`), with zero overlap over button border or box shadow. Tapping the label opens the local file picker; tapping the chevron opens the dropdown.
- **Dropdown Item Sizing**: Each item row is >= 44px tall and stretches full width of the dropdown menu.
- **Fluid Headline**: Sized with `font-size: clamp(19px, 5.8vw, 24px)` on `xs` so "Hi there, what do you want to shrink today?" fits onto two lines without overflowing or breaking awkwardly.
- **Popular Compressions**:
  - `xs` (0-479px): 2 columns.
  - `md`+ (768px+): 3 columns.
  - Chips have `min-height: 44px` with `-webkit-line-clamp: 2` text wrapping.
- **Vertical Spacing**: 16px between sections on `xs`, 24px on `md`+.

### 2.2 Working Screen (Image Gallery & Workspace)
- **Unified "Add Files" Split Button**: Replaced separate circular chevron with a single unified button containing the label on the left and chevron on the right inside the same border.
  - On `xs` (360px): matches the height (44px) and width (50% equal column split) of the Clear button.
  - On `sm`+ (480px+): natural width with 36px height matching Clear button.
  - Tapping label triggers local file picker; tapping chevron opens the 4-item source dropdown.
- **Compression Settings Panel Default (Image 3 Resolution)**:
  - In `DEFAULT_COMPRESSION_SETTINGS`, `resize.enabled` is explicitly `false` by default.
  - `selectedResizeTargetOption` evaluates to `'target-size'` ("Target file size (KB / MB) [Default]") by default.
  - Custom dimensions and percentage scale boxes only appear when explicitly chosen by the user.
- **Working Header Alignment (Tablet & Desktop md/lg, 1032px)**:
  - Title ("Images to Compress") stays on a single line (`white-space: nowrap; flex-shrink: 0;`).
  - Count badge ("1 / 50") stays on a single line with `padding: 0 10px; min-width: max-content;` so it is never narrower than its text.
  - "View Results (1)" link removed from the header entirely.
  - Left edge of the title aligns with the left edge of tile 1 (`padding: 8px 0` on `.stage-header-bar`).
  - Right edge of "Clear" aligns with the right edge of the last tile / tile grid (within 1px).
- **Tile Grid Alignment**:
  - Columns: 1 on `xs`, 2 on `sm`, 3 on `md`, 4 on `lg` using equal fractions `minmax(var(--image-tile-width, 0px), 1fr)` and `align-items: stretch`.
  - Every tile in a row has identical width and height.
  - "Add More" dashed card matches the exact width and height of adjacent image tiles (`height: 100%; width: 100%; min-height: 0; min-width: 0;`).
- **Flow Simplification**: Removed "View Results" and all other manual links from Working to Output screen. The only way to transition to Output is to execute compression.
- **Card Controls**: "Customize" button given 100% width on `xs` with 44px tap target.
- **Estimate Font**: Set to `14px` on `xs` (never unreadable 10-11px). Arrow `→` and "est." stay on one line.
- **Mobile Bottom Bar**: "Settings" and "Compress N images" side-by-side with equal 50% width on `xs` (`min-height: 44px`). Bottom padding on `.image-gallery-grid` matches bar height + safe-area inset (`calc(84px + env(safe-area-inset-bottom, 16px))`) preventing bar overlap.

### 2.2.1 Unified Target File Size Box & Heading (Global Settings & Customize Modal)
- **Heading Standardization**: Removed the redundant dropdown box (`Target file size (KB / MB) [Default] v`) from both the Global Compression Settings panel and the Customize Modal. Promoted the section title directly to the section heading: `TARGET FILE SIZE`.
- **Unified Single-Box Container**: Converted the Target File Size controls into a single unified container (`.target-size-box` in Settings, `.sub-panel` in Customize modal):
  - *Top Row*: Size input number and unit selector (`KB` / `MB` via `app-custom-select`) in a two-column grid.
  - *Bottom Row*: Quick preset chips (`Quick: 9 KB 6 KB 3 KB`) and feasibility alerts directly enclosed within the same bordered container.
  - *Dual-Theme Tokens*: Semantic high-contrast styling across Light (`--bg-hover`, `--border-subtle`, `#FFFFFF` input) and Dark (`rgba(30, 41, 59, 0.45)`, `rgba(51, 65, 85, 0.65)`) themes.

### 2.3 Customization Modal
- **Exclusive Size-Based Mode (Removal of Dropdown & Alternative Modes)**:
  - Replaced the dropdown selector with the static section heading `Target File Size`.
  - Enclosed the discovery slider, target size input, unit type, and Quality quick pills (`Better Quality`, `Balanced`, `Smallest`) directly inside the single unified `.sub-panel` card.
  - Cleaned up sub-panels to remove unused custom dimension and percentage slider markup, keeping the interface focused entirely on target file size, candidate discovery slider, and quality presets.
- **Header Cleanliness & No Redundant Resolution (Image 1 / Header Resolution Fix)**:
  - Removed redundant resolution (`• 500 × 500 px`) and file size (`• 12 KB`) from the modal header subtitle. The preview mini-card directly below already displays format, dimensions, and file size badges.
  - File name subtitle cleanly displays file name with extension and rename pencil button without truncation or crowding.
  - Added `white-space: nowrap !important;` to `.modal-title` ("Customize Image") to prevent awkward line breaks on narrow phone screens (360px).
- **Single-Screen Containment & Footer Visibility (Image 1 / Modal Containment Fix)**:
  - Removed `100dvh` dialog calculations that previously pushed modal footer buttons off-screen due to shell topbar offsets and `contain: layout` containment.
  - Set `.customization-dialog` and `.modal-dialog` to `height: 100% !important; max-height: 100% !important;` inside `.modal-backdrop` (which enforces `padding: 8px; box-sizing: border-box;`).
  - `.modal-header` and `.modal-footer-bar` are strictly pinned with `flex-shrink: 0 !important;`.
  - `.modal-body-content` flex-shrinks with `flex: 1 1 0px !important; min-height: 0 !important; overflow-y: auto !important;` allowing smooth internal scrolling.
  - Both header and bottom buttons (`Cancel`, `Apply` / `Compress`, and `Done`) are 100% visible together on a single screen without any footer clipping.
- **Output Format Buttons**:
  - `xs`: 3 columns (Row 1: ORIGINAL, WEBP, JPG; Row 2: PNG, AVIF, TIFF). Each button has equal width.
  - `md`+: 1 row of equal-width buttons.
- **Footer Buttons**: Stacked/fluid with equal width on `xs` (`min-height: 44px`).
- **Quality Chips**: Wrapped via `flex-wrap: wrap; gap: 6px;` to prevent horizontal clipping.

### 2.3.1 Tile Width Invariance: Normal vs. Scrolled Screen (Images 2 & 3 Fix)
- **Problem**: When scrolling down in mobile viewports (e.g., Samsung Galaxy A55 360×800), the gallery card width expanded by 17px (from 248px to 265px) because desktop browser emulation toggled between desktop scrollbar gutter reservation and mobile touch overlay scrollbars, and `.stage-header-bar.is-scrolled` applied 10px all-around padding.
- **Solution**:
  - Added `scrollbar-gutter: stable;` to `:host`, `.compressor-page-wrapper`, and `.ts-main-scroll-container`.
  - Suppressed scrollbar tracks on mobile (`max-width: 1023px`) via `scrollbar-width: none !important;` and `::-webkit-scrollbar { display: none !important; width: 0 !important; }`.
  - Enforced `.stage-header-bar, .stage-header-bar.is-scrolled { padding: 8px 0 !important; margin: 4px 0 12px 0 !important; border: none !important; background: transparent !important; }` on `xs` viewports.
  - Enforced `.image-gallery-grid { grid-template-columns: 100% !important; width: 100% !important; }` on `xs` viewports.
  - Result: The image tile and dashed Add More card maintain identical, pixel-exact width before, during, and after scrolling.

### 2.4 Output Screen (Results & Downloads)
- **Direct Return to Landing via Back Button**:
  - Removed the "Start over" button and dot separator entirely.
  - Clicking the "Back" button on the Output screen executes a complete session reset (`this.requestStartOver()`), clearing all images and returning the user directly to the main landing page (`home`/`landing`) with a brand-new session.
- **Headline**: Fluid `font-size: clamp(20px, 5.5vw, 26px)` wrapping cleanly in at most 2 lines.
- **Action Buttons**: Stacked into 2 rows on `xs`:
  - *Row 1*: "Download all" and "More" menu side-by-side (height: 44px).
  - *Row 2*: "Back" navigation link (height: 44px).
- **Card Metrics Layout**: Completely resolved text overlap bug.
  - Line 1: Reduction line (e.g. `1.0 MB → 96.1 KB (-90%)`).
  - Line 2: Target & result line (`Target 108 KB · Result 96.1 KB.`) placed on its own row below without overlap.
- **Card Close Button**: Exactly 28×28px circular button (`border-radius: 50%; aspect-ratio: 1; padding: 0;`) centered in the top-right corner, fixing the previous oval distortion.
- **Preview & Save**: Side-by-side with equal 50% width on `xs`, height >= 44px. "Customize again" link padded to >= 44px tap target.

---

## 3. Tap Target & Accessibility Compliance

- **Minimum Touch Targets**: Every button, input, toggle chevron, and action chip enforces `min-height: 44px` on `xs` viewports.
- **Typography Standards**: Body text >= 14px on `xs`, captions >= 12px.
- **Dual-Theme Contrast**: Meets WCAG AA contrast ratio (>= 4.5:1) in both Light and Dark themes using semantic tokens (`--bg-surface`, `--text-primary`, `--border-subtle`, `--accent`).
- **Zero Horizontal Scrolling**: Verified `scrollWidth <= innerWidth` across all screens at 360px width.

---

## 4. Verification Results Matrix

The test runner [`scripts/verify-responsive-flow.mjs`](../scripts/verify-responsive-flow.mjs) evaluated all screens in headless Chromium via Chrome DevTools Protocol across all 4 target viewports:

| Screen | Viewport | Dimensions | Horizontal Scroll | Text Overlap | Tap Target (>=44px) | Result |
|---|---|---|:---:|:---:|:---:|:---:|
| **Home** | `xs` | 360 × 800 | None (360px) | None | PASS (44px) | **PASS** |
| **Home** | `sm` | 390 × 844 | None (390px) | None | PASS (44px) | **PASS** |
| **Home** | `md` | 768 × 1024 | None (768px) | None | PASS (44px) | **PASS** |
| **Home** | `lg` | 1440 × 900 | None (1440px) | None | PASS (Desktop) | **PASS** |
| **Working** | `xs` | 360 × 800 | None (360px) | None | PASS (44px) | **PASS** |
| **Working** | `sm` | 390 × 844 | None (390px) | None | PASS (44px) | **PASS** |
| **Working** | `md` | 768 × 1024 | None (768px) | None | PASS (44px) | **PASS** |
| **Working** | `lg` | 1440 × 900 | None (1440px) | None | PASS (Desktop) | **PASS** |
| **Customize** | `xs` | 360 × 800 | None (360px) | None | PASS (44px) | **PASS** |
| **Customize** | `sm` | 390 × 844 | None (390px) | None | PASS (44px) | **PASS** |
| **Customize** | `md` | 768 × 1024 | None (768px) | None | PASS (44px) | **PASS** |
| **Customize** | `lg` | 1440 × 900 | None (1440px) | None | PASS (Desktop) | **PASS** |
| **Output (1 file)** | `xs` | 360 × 800 | None (360px) | None | PASS (44px) | **PASS** |
| **Output (1 file)** | `sm` | 390 × 844 | None (390px) | None | PASS (44px) | **PASS** |
| **Output (1 file)** | `md` | 768 × 1024 | None (768px) | None | PASS (44px) | **PASS** |
| **Output (1 file)** | `lg` | 1440 × 900 | None (1440px) | None | PASS (Desktop) | **PASS** |
| **Output (5 files)** | `xs` | 360 × 800 | None (360px) | None | PASS (44px) | **PASS** |
| **Output (5 files)** | `sm` | 390 × 844 | None (390px) | None | PASS (44px) | **PASS** |
| **Output (5 files)** | `md` | 768 × 1024 | None (768px) | None | PASS (44px) | **PASS** |
| **Output (5 files)** | `lg` | 1440 × 900 | None (1440px) | None | PASS (Desktop) | **PASS** |

### Screenshot Artifacts Saved
All visual audit screenshots have been captured and saved outside the repository in `~/Desktop/acklet-review/responsive/`:
- `home-360.png` & `home-1440.png`
- `working-360.png` & `working-1440.png`
- `customize-360.png` & `customize-1440.png`
- `output-1file-360.png` & `output-1file-1440.png`
- `output-5files-360.png` & `output-5files-1440.png`


## Phase 4.1: Responsive Polish, Target Feasibility & Layout Harmonization

### Issues Addressed
1. **Target Feasibility Precision Check**:
   - Prevented false unachievable error (`Target of 96 KB cannot be achieved (minimum achievable: 96 KB)`) when target matches the minimum achievable size within unit rounding/precision in `achievable-size-discovery.service.ts` and `customization-modal.component.ts`.
2. **Mobile Card Overlapping Text Elimination**:
   - Fixed `.card-metrics-row` to strictly enforce column flex layout with 2px gap.
   - Refined font sizes on mobile (`11.5px` for metrics, `10.5px` for target status line) to prevent line wrapping collisions on 360px cards.
3. **Mobile Settings Drawer Inner Card Removal**:
   - Suppressed duplicate `.sidebar-header` and `.sidebar-inner-card` border/background inside `.mobile-sheet-body` using template guards (`[isMobileSheet]="true"`), `:host-context(.mobile-sheet-body)`, and `::ng-deep` overrides.
4. **Optimization Profiles Layering & Layout**:
   - Verified `.modal-backdrop` at `z-index: 1200` to sit cleanly above `.mobile-settings-sheet` (`z-index: 1060`).
5. **Preview Modal Mobile Cleanup**:
   - Removed floating `.stage-tag` and `.preview-overlay-tag` elements obstructing the image.
   - Simplified footer metrics to `[Original Size] → [Compressed Size] (-XX%)` without redundant `Original:` and `Compressed:` text labels.
   - Standardized toolbar height to 34px on mobile viewports.
6. **Customize Modal Mobile Button Visibility**:
   - Configured `.customization-dialog` with `max-height: calc(100% - 16px); max-height: calc(100dvh - 16px);`.
   - Placed `.btn-cancel` and `.btn-apply-primary` side-by-side in a 44px height row so buttons remain 100% visible on 360px viewports without scroll cutoff.
7. **Developer Optimization Report Modal Polish**:
   - Enabled horizontal touch scrolling on `.table-container` with `white-space: nowrap` on `.report-table th, td`.
   - Grouped CSV and JSON exports into an Export dropdown trigger and menu.

---

## Phase 4.2: Pinned Modal Headers & Footers and Preview Toolbar Structure

### Issues Addressed
1. **Customize Modal Fixed Header & Footer Pinning (Image 1 Fix)**:
   - *Problem*: On mobile, `.modal-backdrop` had `overflow-y: auto`, causing the entire dialog to scroll inside the backdrop when swiping, pushing the `Customize Image` header off the top edge of the screen.
   - *Fix*: Set `.modal-backdrop` to `overflow: hidden !important;`. Set `.customization-dialog` to `height: calc(100dvh - 16px) !important; max-height: calc(100dvh - 16px) !important; overflow: hidden !important; display: flex !important; flex-direction: column !important;`. Pinned `.modal-header` and `.modal-footer-bar` with `flex-shrink: 0 !important;`. The middle content container `.modal-body-content` is configured with `flex: 1 1 0px !important; min-height: 0 !important; overflow-y: auto !important; -webkit-overflow-scrolling: touch !important;` as the sole scrolling container.
2. **Optimization Profiles Modal Fixed Header & Footer Pinning (Image 2 Fix)**:
   - *Problem*: On mobile, `.modal-backdrop` had `align-items: flex-start` with `overflow-y: auto`, scrolling the title and close button off-screen while hiding the `Done` footer button below the fold.
   - *Fix*: Removed `align-items: flex-start` and set `.modal-backdrop` to `overflow: hidden !important; align-items: center !important;`. Set `.modal-dialog` to `height: calc(100dvh - 16px) !important; max-height: calc(100dvh - 16px) !important; overflow: hidden !important; display: flex !important; flex-direction: column !important;`. Pinned `.modal-header` and `.modal-footer` (`flex-shrink: 0 !important;`), making `.modal-body` the only scrollable element. The `Done` button and `Optimization Profiles` header remain permanently pinned in position.
3. **Preview Modal Toolbar Layout & Button Alignment (Image 3 Fix)**:
   - *Problem*: Buttons inside the preview toolbar expanded vertically into 44px tall rectangles protruding out of the 34px container pills due to `.ts-root button` rules in `base.css`. The `-` zoom button was squished or obscured.
   - *Fix*:
     - Explicitly enforced `min-height: 0 !important; min-width: 0 !important;` on all toolbar buttons (`.mode-toggle-btn`, `.zoom-btn`, `.zoom-opt-btn`, `.icon-close-btn`).
     - Standardized container heights: `.view-mode-toggle` and `.zoom-controls` are uniform `32px` tall with `padding: 2px` and `overflow: hidden`.
     - Inner buttons (`Split`, `Side by Side`, `-`, `Fit`, `100%`, `+`) are uniform `26px` or `28px` tall with `box-sizing: border-box !important; line-height: 1 !important;`.
     - Enforced `opacity: 0.45; cursor: not-allowed;` on disabled zoom buttons without altering dimensions, ensuring the `-` button is consistently visible and structured in alignment.
     - Sized `.icon-close-btn` to a uniform 32×32px square.


---

## Phase 4.3: Tile Target Lines Removal & Repository Cleanliness

### Issues Addressed
1. **Target Lines Removed From All Card Tiles**:
   - *Problem*: Output and working screen tiles previously rendered a secondary line comparing target size and actual outcome (`Target 320 KB. Result 320 KB.` or `Target 13.0 KB. Closest: 13.3 KB.`). This crowded mobile and desktop cards.
   - *Fix*: Removed `.card-target-line` from `image-card.component.ts`. The card tiles strictly display the clean primary size reduction metric line (`formattedOriginalSize() → formattedCompressedSize() (-savedPercent%)`) and optional dimensions if resized.
2. **Repository Cleanliness & Agent Test Image Removal**:
   - *Problem*: Untracked benchmark test images and fixture files created during agent iterations resided under `client/apps/tool-image-compressor/src/test-assets/` and `client/public/assets/icons/sources/`.
   - *Fix*: Purged all 47 synthetic test image files, benchmark fixtures, and scratch inspection scripts from the repository. Kept core functional application code, component inline Base64 icons in `source-icons.config.ts`, and project documentation under `docs/`. Tests run independently using mock/fallback canvas buffers without requiring disk assets.


---

## 10. Shared Settings Link & Output "Save To" Split Dropdown Implementation

### 10.1 Part 1: Shared Settings Link in a New Tab
- **Zero-PII URL Hash Format**: Maintained `#s=<settings>` (e.g. `#s=fmt:webp;t:17kb;q:balanced;r:none;tr:rot90,flip`).
  - Strict key whitelist enforced: `fmt`, `t`, `q`, `r`, `tr`.
  - Values strictly validated and clamped:
    - `q`: 'better' (90), 'balanced' (80), 'smallest' (60), or numeric quality (1–100).
    - `t`: byte targets (e.g. `17kb`, `250kb`, `1mb`) or percentage targets (`80p`). Clamped between 10 B and 100 MB.
    - `r`: `none`, percentage (`50p`), or dimensions (`800x600`). Dimensions clamped to max 16384px.
    - `fmt`: `original`, `webp`, `jpg`, `png`, `avif`, `tiff`. Default: `original`.
    - `tr`: `rot90`, `rot-90`, `rot180`, `flip`, `fliph`, `flipv`.
  - Malformed or unrecognized hashes safely return `null` and default to the Home screen without errors.
- **Direct Navigation to Working Screen**:
  - On app load with a valid hash string, settings are applied to the Working screen's global compression settings, and the app starts on the **Working screen** with an empty file list (zero personal image data or file names transmitted).
- **Session-Aware Note Banner**:
  - Displays `"Settings loaded from link. Add your images to start."` above the gallery grid.
  - Dismissing via the close button (X) records `acklet_dismissed_settings_hash` in `sessionStorage`, preventing the note from reappearing on page reload for the same link.
  - Opening a different settings link resets and surfaces the note banner anew.
- **Copy Settings Link Notice**:
  - Added subtext under the Shareable Settings Link button inside the Output screen More dropdown: `"Link has settings only. Images are not included."`.

### 10.2 Part 2: "Save to" Split Dropdown on Output Screen & Cards (Redesigned & OneDrive Integration)
- **Main Download Split Button**:
  - Left button: Download to device (single file download or ZIP archive when $\ge 2$ completed files).
  - Right chevron button: Toggles the 4-item "Save to" dropdown (excluding redundant "This device").
- **Card Save Split Button & Truncation Fix**:
  - Left button: Save individual compressed image to device. Wrapped in `.save-btn-text` with `white-space: nowrap !important; overflow: visible !important;` to eliminate `S...` truncation.
  - Right chevron button: Toggles individual card "Save to" dropdown.
- **Card Individual Share Button**:
  - Dedicated share icon button on each card (`.card-btn-share` with `share-2` icon).
  - Taps native Web Share API (`navigator.share({ files: [file], title })`) when supported.
  - Gracefully falls back to clipboard copying via `copyBlobToClipboard(blob)` when native share sheet is unavailable.
- **Visual Design Parity (Matching Image 2 Reference)**:
  - High-fidelity embedded brand logos from `SOURCE_ICONS`: Google Drive, Dropbox, OneDrive.
  - Circular icon containers (`.item-icon-circle`, 32×32px, `background: var(--bg-canvas)` / `#0F172A`) with hover scaling.
  - Elevated card surface panel with 12px border radius, subtle border, and deep ambient shadow.
- **Universal OneDrive Integration Across All Dropdowns**:
  - *Home screen Select Images*: `This device`, `Google Drive`, `Dropbox`, `OneDrive`, `Clipboard`.
  - *Working screen Add Files*: `This device`, `Google Drive`, `Dropbox`, `OneDrive`, `Clipboard`.
  - *Output screen Header Download*: `Google Drive`, `Dropbox`, `OneDrive`, `Copy to clipboard`.
  - *Output screen Card Save*: `Google Drive`, `Dropbox`, `OneDrive`, `Copy to clipboard`.
- **Strict Destination Order for Download/Save Dropdowns**:
  1. `Google Drive` (official logo; disabled with `"Not set up yet"` tag when keys unset)
  2. `Dropbox` (official logo; disabled with `"Not set up yet"` tag when keys unset)
  3. `OneDrive` (official logo; disabled with `"Not set up yet"` tag when keys unset)
  4. `Copy to clipboard` (clipboard icon; active)
- **Clipboard Capabilities**:
  - Implemented in `save-destination.util.ts`:
    - Single image: writes image blob to `ClipboardItem` (converting to PNG in memory via HTML5 Canvas if browser rejects WebP/JPEG in clipboard).
    - Multiple images: copies ZIP archive or safely displays: `"Your browser cannot copy this. Use Download."`.
- **Keyboard & Click Mechanics**:
  - Enter, Space, and ArrowDown open the menu and focus the first available item.
  - ArrowUp and ArrowDown cycle through menu items.
  - Escape closes the dropdown and returns focus to the trigger chevron.
  - Outside click closes the menu.

### 10.3 Part 3: Responsive Breakpoints & Layout
- **xs (< 480px)**:
  - Headline occupies its own row (`width: 100%`).
  - Download split button and More button occupy the full container width side by side.
  - Back button sits on the row below (`width: 100%`).
  - Card action buttons: Preview and Save split button sit side by side with equal width (`50% / 50%`, `flex: 1`).
  - All interactive tap targets $\ge 44\text{px}$ high; chevrons $\ge 44\text{px}$ wide.
  - 1 column gallery grid (`100%`).
- **sm (480–767px)**:
  - Download and More side by side; Back on row below; 2 column gallery grid.
- **md (768–1023px)**:
  - All header items on one row where they fit; 3 column gallery grid.
- **lg (1024px+)**:
  - Desktop layout; 4 column gallery grid.

### 10.4 Automated Verification & Review Artifacts
- **Automated Tests**:
  - `save-to-and-shared-link-flow.spec.ts`: 15/15 tests passing.
  - `features-round-3.spec.ts`: 15/15 tests passing.
  - `quality-and-link-features.spec.ts`: 21/21 tests passing.
  - Static architecture, glass check & tsc: `node scripts/verify.mjs -A` passing.
  - Angular production AOT build: `npx ng build tool-image-compressor` passing.
- **Screenshots Saved in `~/Desktop/acklet-review/`**:
  - `home-select-images-dropdown.png` (Home screen dropdown with OneDrive and cloud logos)
  - `output-1440px-download-dropdown-open.png` (Output header download split dropdown with 4 destinations)
  - `output-1440px-card-save-dropdown-open.png` (Card save split dropdown and verified "Save" button text)
  - `output-360px-download-dropdown-open.png` (Mobile 360px output screen with full-width split dropdown)

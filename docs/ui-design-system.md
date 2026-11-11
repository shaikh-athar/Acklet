# Acklet UI Design System & Component Foundation

## 1. Overview
This document outlines the stabilized design system architecture for Acklet, standardizing semantic tokens, Spartan UI Helm primitives, Tailwind CSS v4 theme integration, dual-theme contrast rules, and shell isolation boundaries across the repository.

Related documentation:
- [responsive-design-system.md](./responsive-design-system.md)
- [online-clipboard.md](./online-clipboard.md)
- [performance-optimization.md](./performance-optimization.md)
- [build-configuration.md](./build-configuration.md)

---

## 2. Semantic Token Architecture
All styling in Acklet tools and shared packages references semantic CSS variables rather than hardcoded hex color values. Canonical tokens are defined in [tokens.css](file:///Users/ayaz/Acklet/client/packages/tool-shell/src/styles/tokens.css).

### 2.1 Surfaces & Backgrounds
| Token | Dark (Default / Goth) | Light | Usage |
| :--- | :--- | :--- | :--- |
| `--page-bg` | `#0A0A0C` / `#0F1011` | `#FFFFFF` | Overall window and page background |
| `--surface` | `#141416` | `#FFFFFF` | Main tool surface cards, dropdown containers |
| `--surface-hover` | `rgba(255, 255, 255, 0.06)` | `rgba(0, 0, 0, 0.04)` | Interactive surface hover, search input resting state |
| `--surface-active` | `rgba(255, 255, 255, 0.10)` | `rgba(0, 0, 0, 0.08)` | Selected items, active segments, input focus fill |
| `--surface-raised` | `#141416` | `#FFFFFF` | Solid raised cards, elevated modals, dialogs |

### 2.2 Typography & Text Colors
| Token | Dark Mode | Light Mode | Usage |
| :--- | :--- | :--- | :--- |
| `--text` / `--foreground` | `#F1F5F9` | `#0F172A` | Primary text and headings (>= 7:1 contrast) |
| `--text-muted` / `--muted-foreground` | `#94A3B8` | `#64748B` | Secondary text, captions, placeholder copy (>= 4.5:1 contrast) |
| `--accent-ink` | `#04211E` | `#FFFFFF` (on dark teal) / `#04211E` (on light teal) | Button label text placed directly over primary accent fills |

### 2.3 Borders & Separators
| Token | Dark Mode | Light Mode | Usage |
| :--- | :--- | :--- | :--- |
| `--border` | `rgba(255, 255, 255, 0.08)` | `rgba(15, 23, 42, 0.08)` | Card borders, subtle section dividers |
| `--border-strong` | `rgba(255, 255, 255, 0.16)` | `rgba(15, 23, 42, 0.16)` | Input borders, active element boundaries |
| `--accent-border` | `rgba(45, 212, 191, 0.28)` | `rgba(15, 118, 110, 0.28)` | Focus rings, accent badge borders |

### 2.4 Status Tokens
| State | Base Color | Soft Fill Token | Ink / Text Token |
| :--- | :--- | :--- | :--- |
| **Success** | `var(--success)` (`#10B981` / `#059669`) | `var(--success-soft)` | `var(--success-ink)` |
| **Warning** | `var(--warning)` (`#F59E0B` / `#D97706`) | `var(--warning-soft)` | `var(--warning-ink)` |
| **Destructive / Error** | `var(--destructive)` (`#EF4444` / `#DC2626`) | `var(--destructive-soft)` | `var(--destructive-ink)` |
| **Info** | `var(--info)` (`#3B82F6` / `#2563EB`) | `var(--info-soft)` | `var(--info-ink)` |

---

## 3. Tailwind CSS v4 Theme Bridge
In Tailwind CSS v4, theme properties are registered via `@theme`. In [tokens.css](file:///Users/ayaz/Acklet/client/packages/tool-shell/src/styles/tokens.css), all semantic CSS variables are mapped directly into Tailwind's theme system:

```css
@theme {
  --color-background: var(--page-bg);
  --color-foreground: var(--text);
  --color-card: var(--surface);
  --color-card-foreground: var(--text);
  --color-muted: var(--surface-hover);
  --color-muted-foreground: var(--text-muted);
  --color-border: var(--border);
  --color-ring: var(--accent-border);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-ink);
  --color-primary: var(--accent);
  --color-primary-foreground: var(--accent-ink);
  --color-secondary: var(--surface-hover);
  --color-secondary-foreground: var(--text);
}
```
This enables Spartan UI primitives (`hlmItem`, `hlmTabs`, `hlmBadge`, `hlmAlert`) and custom components using utility classes like `bg-card`, `text-muted-foreground`, and `border-border` to automatically reflect the active Acklet theme without duplicate styling.

---

## 4. Spartan UI Helm Primitives Foundation
Spartan UI Helm primitives provide accessible ARIA semantics while conforming to Acklet's design tokens in [base.css](file:///Users/ayaz/Acklet/client/packages/tool-shell/src/styles/base.css):

1. **`HlmButton` (`.spartan-btn`)**:
   - `default`: Primary brand action (`var(--accent)` background with `var(--accent-ink)` text).
   - `secondary`: Ambient surface button (`var(--surface-hover)` background with `var(--text)`).
   - `outline`: Subtle bordered action with transparent resting fill.
   - `ghost`: Borderless utility action with hover elevation.
   - `destructive`: Warning/danger action with high contrast warning ink.

2. **`HlmBadge` (`.spartan-badge`)**:
   - Compact status indicators (height: 22px, font-size: 11.5px, pill radius: 9999px).
   - Standardized variants for `default`, `secondary`, `outline`, and `destructive`.

3. **`HlmInput` (`.spartan-input`)**:
   - Accessible input control with semantic placeholder text and focus ring mapped to `var(--accent-border)`.

4. **`HlmCard` (`.spartan-card`)**:
   - Rounded 16px/20px surface containers using `var(--surface)` and `var(--border)`.

---

## 5. Architectural Boundaries & Isolation
Acklet enforces surface isolation through pre-commit and automated checks:
- **`scripts/check-shell-isolation.mjs`**: Ensures that Acklet Portal (`client/src/styles.css`) does not import or depend on Tool Shell CSS custom properties (`--ts-*`), and vice versa.
- **`scripts/check-glass.mjs`**: Enforces strict glassmorphism rules on designated shell surfaces.
- **`scripts/check-surface-scope.mjs`**: Restricts edits to designated surface directories (Tools, Portal, Shared, or Meta).

---

## 6. Responsive Layout Mechanics
- **Desktop (`>= 1024px`)**: Viewport-locked single-screen workspace (`100dvh`). Tool cards occupy full available height with internal scrollable content areas. Tool documentation (`ts-tool-content`) is placed below the fold, accessible via scroll.
- **Tablet & Mobile (`< 1024px`)**: Auto-flowing flex column layout. The tool card surface expands dynamically (`min-height: fit-content; height: auto;`), ensuring that bottom tool actions (Save, Copy, Refresh) remain fully visible and in-flow without overlapping the documentation sections below.
- **Overlay & Drawer Z-Index Hierarchy**:
  - `var(--ts-z-base)`: 0
  - `var(--ts-z-chrome)`: 10 (Navbar & Sidebar rails)
  - `var(--ts-z-surface)`: 20 (Tool content card)
  - `var(--ts-z-overlay)`: 1000 (Modal backdrops, About drawer, and Command palette)

### 6.1 Collapsible Sidebar System (Vercel/v0-Style Architecture)
The shared tool shell ([`client/packages/tool-shell`](file:///Users/ayaz/Acklet/client/packages/tool-shell)) provides an intelligent 3-state collapsible navigation sidebar managed by [`SidebarStateService`](file:///Users/ayaz/Acklet/client/packages/tool-shell/src/services/sidebar-state.service.ts):

1. **HIDDEN Mode (Default on Large Screens `>= 1100px`)**:
   - The sidebar is completely out of view (`transform: translateX(calc(-100% - 24px)); opacity: 0; pointer-events: none`).
   - The workspace canvas occupies 100% full width (`minmax(0, 1fr)`).
   - An unintrusive first-visit edge discovery hint pill (`.ts-sidebar-edge-hint`) pulses near the far-left edge to educate users on hover reveal, auto-dismissing after 5 seconds or upon any interaction (`acklet_sidebar_hint_seen`).

2. **PEEK Mode (Hover Reveal Overlay)**:
   - Moving the cursor to the far-left edge of the viewport (14px hotzone `.ts-sidebar-hotzone`) triggers an intentional 100ms hover delay before sliding the sidebar in as a floating overlay on top of content (`position: absolute; left: 0; z-index: 50`).
   - The workspace content does **not** move or re-flow.
   - Moving the cursor out provides a 250ms grace window before sliding out. Pressing `Escape` or clicking outside immediately dismisses peek mode.
   - Peek mode can be toggled on/off using the lightning bolt icon in the sidebar pinned footer (`acklet_sidebar_hover`).

3. **PINNED Mode (In-Flow Grid Push)**:
   - Toggling the sidebar button in the topbar (`.ts-desktop-sidebar-toggle`), the sidebar footer button, or pressing `Cmd/Ctrl+B` transitions the shell into pinned mode.
   - The shell bottom row transitions into a two-column grid (`272px minmax(0, 1fr)`), pushing the tool card smoothly to the right.
   - Pinned state is persisted across all subdomains via root cookie (`acklet_sidebar_pinned`, scoped to `.acklet.com`, `.localhost`, or local storage).

4. **Mobile & Tablet Drawer (`< 1024px`)**:
   - Desktop peek and pinned grid modes are suppressed (`grid-template-columns: 1fr !important`).
   - Hamburger icon in the topbar opens a mobile off-canvas sheet (`role="dialog"`, `aria-modal="true"`).
   - Native touch swipe-to-close gestures (`onTouchStart`, `onTouchMove`, `onTouchEnd` on `.ts-mobile-sheet-panel`) allow natural dismissal.
   - Selecting any tool, section link, or pressing `Escape` automatically dismisses the drawer and returns focus smoothly.

### 6.2 Universal Tool Architecture & Shell Reusability
The shell layout is generic and unified across all tools in the Acklet ecosystem:
- **Single Source of Truth**: All standalone tools (e.g. `apps/tool-qr-generator`, `apps/tool-online-clipboard`, and future tools) wrap their workspace inside `<ts-shell [tool]="manifest" [config]="shellConfig">` from [`@acklet/tool-shell`](file:///Users/ayaz/Acklet/client/packages/tool-shell).
- **Generic Behavior Inheritance**: Navbars, topbar branding, command palette (`⌘K`), theme providers, settings modal, and the collapsible sidebar peek animation live inside `tool-shell`. Any enhancement made to the shell immediately applies to every tool across the application.
- **Full-Bleed Viewport Surface**: When `layout: 'fullBleed'` is set, `.ts-tool-card-surface.full-bleed` automatically expands the projected tool container to 100% height and width without requiring bespoke CSS in child tools.
- **Unified Routing & Dev Bootstrapping**:
  - In `client/src/app/app.routes.ts`, standalone tools are directly registered under `/tools/<tool-slug>` (e.g. `/tools/clipboard`, `/tools/qr-generator`).
  - In `client/src/main.ts`, tools can be tested on `localhost:4200` via subdomain (`clipboard.localhost:4200`), direct route (`/tools/clipboard`), or query parameter (`?tool=clipboard`).

### 6.3 Responsive & Device-Aware Component Primitives
For comprehensive architecture and rollout guides, see [responsive-design-system.md](./responsive-design-system.md).
- **`ResponsiveService`**: Reactive signals for `deviceClass`, `inputMode`, `keyboardOpen` (via `visualViewport`), `orientation`, and `shouldReduceEffects`.
- **`<ts-bottom-sheet>`**: Mobile sheet with drag-handle, swipe-down dismiss ($\ge 75$px), backdrop click dismiss, and reduced-motion handling.
- **`<ts-sticky-action-bar>`**: Docked bottom action bar with automated virtual keyboard evasion and $\ge 44 \times 44$px touch targets.
- **`<ts-adaptive-dropdown>`**: Context-aware dropdown that renders floating popovers on desktop and bottom sheets on phone.
- **`[tsLongPress]` & `[tsDoubleTap]`**: Touch gesture directives with tactile feedback via `HapticService`.

---

## 7. Tool Shell & QR Code Generator Enhancements

### 7.1 Topbar & Navigation Updates
- **Saved Action Button**: Features a high-contrast jewel gradient (`linear-gradient(135deg, var(--accent) 0%, ...)`), solid white icon fill, and subtle depth glow (`box-shadow`) when marked as favorited, ensuring distinct visual status in both light and dark themes.
- **Settings Consolidation**: The settings trigger button has been removed from the top navigation bar and unified exclusively within the collapsible sidebar footer rail.
- **Icon Unification**: Standardized Lucide icons across shell and tools:
  - Frame: `LucideFrame` (`frame`)
  - Heart Logo preset: `LucideHeart` (`heart`)
  - Color Swap: `LucideArrowLeftRight` (`arrow-left-right`)
  - Dynamic Shortlinks: `LucideZap` (`zap`)

### 7.2 QR Code Generator Customizer & Scannability
- **Full-Bleed Dropzone**: The logo upload zone dynamically flexes to occupy 100% of the remaining vertical space in the Logo tab, eliminating empty white gaps.
- **Foreground & Background Gradients**: Supports both Solid and Gradient modes with Linear / Radial options, 0–360° angle sliders, dual color stop selectors, and curated presets (Ocean Blue, Sunset Glow, Emerald Forest, Purple Dawn, Neon Cyber).
- **Guaranteed Scanner Decodability**:
  - Custom body shapes (`star`, `heart`, `cross`, `diamond`, `scanline`) retain high core fill ratios and automatically boost error correction to `H` (30%) or `Q` (25%).
  - Corner finder locator patterns (the three 7x7 outer frames and 3x3 inner dots) strictly preserve standard geometric 1:1:3:1:1 scan line proportions so hardware and software decoders (`jsQR`) locate patterns reliably.
  - Multi-pass decoding verification (standard decode, contrast-stretched histogram binarization, inverted luminance, center crop) eliminates false-negative unscannable warnings.
- **Export Menu Reliability**: Fixed split download dropdown toggle with stop propagation handling to ensure robust format selection across SVG, JPEG, and PNG.
- **Customizer Layout Stability**: Standardized `.design-section` to natural content height (`flex: 0 0 auto`) to prevent grid squishing or overlapping across multi-section views (e.g. Shape presets, body dots, corner frames), while retaining full flex expansion exclusively on `.design-section.logo-section`. Gradient angle controls use `-webkit-appearance: none`, bounded container widths, and `white-space: nowrap` labels to eliminate track overflow and label column wrapping.

### 7.3 Tools Hub & Standalone Shell Coverage
- **Edge-to-Edge Shell Coverage**: When `ts-shell` runs in standalone/hub mode (`no-topbar` and `no-sidebar`), outer padding is reset to `0` and card radiuses/borders are flattened, allowing the tool shell to cover 100% of the viewport edge-to-edge without awkward floating card margins.
- **Clean Background Styling**: Eliminated decorative multi-color mesh gradient backdrops (`.hub-hero-bg-layer`, `--glow-peach`, `--glow-lavender`, `--glow-blue`) in favor of canonical solid dual-theme surfaces (`--page-bg`, `--bg-base`).
- **Tool Accent Preservation**: Each tool card in the catalog grid injects its respective color tokens (`--row-accent`, `--row-accent-strong`, `--row-accent-soft`, `--row-accent-border`, `--row-accent-glow`) via `resolveToolAccent()`. The icon tile maintains the tool's distinct color tone, and hovering over a card accentuates the tool's accent colors rather than overriding to solid monochrome black.
- **Description Ellipsis & Bounded Content Flexbox**: Catalog row items enforce strict flexbox constraints (`hlm-item-content` / `[data-slot="item-content"]` with `flex: 1 1 0%; min-width: 0; max-width: 100%; overflow: hidden;`). Long descriptions automatically truncate with ellipsis (`...`) without overflowing or pushing adjacent items.
- **Persistent Star & Open Arrow Action Icons**: Action elements (`hlm-item-actions` / `[data-slot="item-actions"]`) enforce `flex-shrink: 0; margin-left: auto;`, guaranteeing that both the favorite star button and open arrow (`↗`) icon remain visible and properly aligned across every row card regardless of description length.
- **Subtle List Row Hover Color**: Replaced stark gray hover surfaces with a soft, low-intensity background tint (`color-mix(in srgb, var(--row-accent) 3.5%, var(--surface))` in light mode; `5%` in dark mode) paired with an ambient, restrained spotlight glow (`opacity: 0.55`).

### 7.4 Unified Tool Typography (Scoutie Sans) & Portal Isolation
- **Single Unified Font across Tools**: All browser-native tools (Clipboard, QR Generator, DataLens, JSON Formatter, JWT Inspector, UUID Generator, Base64 Encoder) and the Tools Hub catalog page strictly share a single, unified typography system: `"Scoutie Sans", sans-serif`.
- **Specialized Differentiating Monospace Font**: Technical readouts, payloads, code blocks, hashes, and tokens retain monospace styling using `--ts-font-mono: 'Geist Mono Variable', 'JetBrains Mono', ui-monospace, monospace;`.
- **Strict Portal Scope Isolation**: Tool typography tokens (`--ts-font-sans`, `--ts-font-heading`) are strictly scoped to Tool Shell containers (`.ts-root`, `.hub-page-root`, `[data-tool]`). The Acklet portal itself preserves its canonical `'Instrument Sans', sans-serif` design system font; global Tailwind v4 `@theme` overrides in `tokens.css` were unlinked to prevent leakage into the main website.

---

## 8. Unified Acklet Blue Platform Accent & User Personalization

### 8.1 Brand Accent Standardization
Previously, individual Acklet tools used disparate brand colors (e.g. Online Clipboard used teal, Temporary Email used violet, DataLens used emerald, URL Shortener used amber, File Converter used indigo). The platform is standardized around ONE canonical brand accent: **Acklet Blue** (`#2563EB` light / `#3B82F6` dark), derived from the QR Generator Light Mode reference design.

All tool manifests in `packages/tool-registry` now register `accent: 'blue'` and `BLUE_ACCENT` by default, establishing a unified visual identity across the entire suite of tools while leaving tool layouts, workflows, and business logic intact.

### 8.2 Neutral Charcoal / Graphite Dark Theme
Dark mode tool surfaces were revised to eliminate heavy blue/navy tints (`#0B1120`, `#111A2E`, `#16233D`), creating an elegant, distraction-free neutral graphite foundation:
- **Main page background**: `#111318`
- **Secondary background**: `#181B22`
- **Card surface background**: `#1C2029`
- **Elevated / modal surface**: `#242936`
- **Input resting background**: `#202530`
- **Subtle borders**: `#303744`
- **Primary text**: `#F3F4F6`
- **Secondary text**: `#A1A8B5`
- **Muted text**: `#7D8796`

The blue accent is reserved strictly for primary actions, active navigation tabs, focus rings, progress indicators, and key interactive highlights.

### 8.3 Single Unified Brand Accent (Acklet Blue)
The platform is standardized around ONE canonical brand accent: **Acklet Blue** (`#2563EB` light / `#3B82F6` dark), derived from the QR Generator Light Mode reference design. Multiple user-selectable accent presets have been completely retired from the user interface to ensure absolute brand consistency and visual cohesion across all tools.

All tools, components, buttons, tabs, links, and background gradients uniformly bind to Acklet Blue:
- **Light Theme**:
  - Base accent: `#2563EB`
  - Strong / hover accent: `#1D4ED8`
  - Soft accent background: `rgba(37, 99, 235, 0.08)`
  - Accent border: `rgba(37, 99, 235, 0.20)`
  - Accent glow: `rgba(37, 99, 235, 0.15)`
  - Text on accent (`--tool-accent-ink`): `#FFFFFF`
- **Dark Theme**:
  - Base accent: `#3B82F6`
  - Strong / hover accent: `#60A5FA`
  - Soft accent background: `rgba(59, 130, 246, 0.12)`
  - Accent border: `rgba(59, 130, 246, 0.25)`
  - Accent glow: `rgba(59, 130, 246, 0.20)`
  - Text on accent (`--tool-accent-ink`): `#FFFFFF`

### 8.4 Critical Scope Boundary Guarantee
The Acklet Blue accent standardization applies **STRICTLY to individual tools** (`client/packages/tool-shell/**`, `client/apps/tool-*/**`, `client/apps/tools-hub/**`). The main Acklet platform (`client/src/**`, landing page, platform header, main dashboard, and `--vercel-*` variables) remains 100% frozen and untouched.

---

## 9. Shell Background Variants, Hover-Only Grid, & Interaction Standards

### 9.1 Automated Layout-Driven Background Gradients
Background variants are layout-driven and fully automated per tool, keeping user settings uncluttered and focused strictly on Interface Theme, Tool Accent Color, and Accessibility:

1. **Two Layout-Driven Pools**:
   - **Centered Tools Pool** (`ambient-orb`, `top-wash`, `dual-spotlight`): Applied to tools with centered content layouts (e.g., URL Shortener, File Converter, Image Converter, Barcode Generator). Ambient lighting remains centered around the tool card without distracting edge clutter.
   - **Wide Tools Pool** (`soft-mesh`, `diagonal-stream`): Applied to screen-covering/full-bleed workbench tools (e.g., Online Clipboard, DataLens, Temp Email, QR Generator). Spans soft ambient lighting across wide multi-pane layouts.
2. **Deterministic Pseudo-Random Assignment**:
   - Each tool slug deterministically hashes to a specific gradient variant within its pool.
   - Whenever a new tool is added with either centered or full-bleed layout, it automatically receives a distinct, appropriate gradient.
3. **Settings Panel Exclusion**:
   - Background gradient selection is intentionally excluded from the Settings modal, keeping the user interface focused on Theme, Accent Color, and Accessibility toggles.
4. **Dynamic Color Integration**:
   - All 5 gradient variants (`ambient-orb`, `top-wash`, `dual-spotlight`, `soft-mesh`, `diagonal-stream`) dynamically adapt in real-time to the user's selected Tool Accent Color (`var(--tool-accent)`) at subtle 4–6% opacity with WCAG AA compliance across both light and dark themes.

### 9.2 Universal Button & Chip Hover Contrast Protection
To eliminate low-contrast or invisible text during hover and active states across all tools:
- **Active / Selected Buttons & Chips**: Always retain brand accent background (`var(--tool-accent)`) with solid contrast text (`var(--tool-accent-ink, #FFFFFF) !important`). On hover, background deepens to `var(--tool-accent-hover)` while preserving crisp white ink.
- **Non-Active Buttons & Chips**: In Light Mode, hover styles guarantee dark text (`#0F172A !important`) on light elevated backgrounds (`#E2E8F0` or `var(--ts-row-hover)`). In Dark Mode, hover styles guarantee bright white text (`#FFFFFF !important`).
- **Specificity Safety**: Blanket catch-all `.ts-root button:hover` rules that previously overwrote active chip backgrounds were replaced with targeted ghost button classes, protecting active filter pills, segmented controls, and toggle chips across all tools.

### 9.2 Complete Removal of Pointer Glow & Spotlight Layers
Per the senior engineering and design standard:
- All cursor-following glow elements, mousemove listeners, RAF loops, and CSS spotlight layers (`.ts-bg-spot-glow`, `.ts-bg-spot-grid`, `.hub-spotlight-layer`, `TsPointerGlowDirective`, `TsSpotlightDirective`) have been completely removed from shell and shared components.
- Directives were converted to lightweight no-op deprecation stubs to guarantee backward-compatibility for consumers without overhead.

### 9.3 Hover-Only Page Grid Layer
- The grid background (`.ts-bg-grid`) is hidden by default (`opacity: 0`).
- When a pointer device hovers directly over the page background (ignoring buttons, links, inputs, cards, dialogs, and interactive widgets), the grid smoothly fades in over 200ms at 5% opacity.
- Transition is managed on a dedicated sibling layer with `pointer-events: none` outside Angular change detection cycles.
- Hidden entirely on touch devices via `@media (hover: none)`.
- Instant toggle without animation on `prefers-reduced-motion: reduce`.

### 9.4 Hidden Scrollbars in Secondary Chrome
- In the sidebar (`.ts-sidebar-scroll-body`) and settings dialog (`.ts-settings-body`), scrollbars are hidden using `scrollbar-width: none; -ms-overflow-style: none;` and `::-webkit-scrollbar { display: none; }`.
- Full scrolling functionality (mouse wheel, touch gesture, keyboard arrows/PageUp/PageDown) is preserved.
- Main content areas preserve standard visible scrollbars.

### 9.5 Tool Hub Card Hover & Focus System (`hub-home.component.ts`)
- **Resting state**: Clean surface with standard 1px border.
- **Hover state**: Precise 1px outline using `--border-strong` without disruptive background shifts or shadows.
- **Focus-visible state**: Accessible 2px outline using the tool's own accent color with a 2px outline offset.
- **Motion**: 150ms `border-color` transition with instant disable on `prefers-reduced-motion`.

---

## 10. Universal Drag-and-Drop & Calm Semantic Standardization

### 10.1 Universal Drag-and-Drop Experience (`TsDropOverlayComponent`)
- **Shared Component**: Located at `client/packages/tool-shell/src/components/drop-overlay/ts-drop-overlay.component.ts` and exported via `@acklet/tool-shell`.
- **Drag-Depth Tracking**: Manages viewport `dragenter` / `dragleave` via an integer depth counter to prevent child-element flickering.
- **Glass Visual Architecture**: Frosted glass surface (`backdrop-filter: blur(16px)`), neutral soft tint (`rgba(255, 255, 255, 0.84)` light / `rgba(17, 19, 24, 0.88)` dark) keeping underlying workspace subtly visible, and an inset dashed accent border.
- **Flower-Opening Radial Bloom**:
  - Floating supported file-category icons (max 6, no text extension lists) start clustered at center (`transform: scale(0.2); opacity: 0;`).
  - Bloom radially outward to balanced coordinates over 550ms with staggered 45ms offsets (`cubic-bezier(0.16, 1, 0.3, 1)`).
  - Responsive radius adaptation: Desktop 175px, Tablet 135px, Mobile 95px.
  - Reduced-motion support (`prefers-reduced-motion: reduce`) transitions immediately to settled coordinates.
- **Configurable Contract (`ToolDropConfig`)**:
  - `enabled`: boolean toggle per tool.
  - `acceptedCategories`: ToolDropCategory array (`image`, `video`, `audio`, `document`, `spreadsheet`, `archive`, `code`, `text`).
  - `maxVisibleIcons`: Maximum floating icons displayed (capped at 6).
  - Supported tools: `tool-file-converter` (documents, images, videos, audio, archives, spreadsheets), `image-converter` (images), `tool-online-clipboard` (documents, images, spreadsheets, archives, code, text), `tool-datalens` (code, documents).
  - Unsupported tools (e.g. `urlshortener`, `temp-email`, `barcode-generator`) have file drop disabled to prevent inappropriate overlay triggers.

### 10.2 Calm Semantic Color Palette
- **High-Contrast Calm Danger Palette**:
  - Light mode: Foreground `#B45353`, soft background `#FEF2F2`, border `#FECACA` (WCAG 2.2 AA compliant >= 4.5:1).
  - Dark mode: Foreground `#FCA5A5`, soft background `rgba(248, 113, 113, 0.12)`, border `rgba(248, 113, 113, 0.28)`.
- **Calm Warning Palette**: Light mode `#92400E` / `#FFFBEB`, Dark mode `#FCD34D` / `rgba(245, 158, 11, 0.12)`.
- **Calm Success Palette**: Light mode `#065F46` / `#ECFDF5`, Dark mode `#6EE7B7` / `rgba(16, 185, 129, 0.12)`.

---

## 11. Universal Blue Accent Interaction & Settings Standards

### 11.1 Platform-Wide Blue Accent Application
All interactive elements across every tool in both Light and Dark themes dynamically resolve from the canonical Acklet Blue tokens (`--tool-accent`, `--tool-accent-soft`, `--tool-accent-border`, `--tool-accent-hover`, `--tool-accent-ink`):

- **Buttons & Icon Buttons on Hover**:
  - Ghost, outline, secondary, action, and icon buttons dynamically tint on `:hover` using `background-color: var(--tool-accent-soft, var(--accent-soft))` and `color: var(--tool-accent, var(--accent))` with `border-color: var(--tool-accent-border, var(--accent-border))`.
  - Nested icons (`ts-icon`, `svg`, `lib-tool-icon`) inherit `currentColor` so icons match the active accent immediately.
- **Primary Action Buttons**:
  - Default: `background-color: var(--tool-accent, var(--accent))` with high-contrast `color: var(--tool-accent-ink, #FFFFFF)`.
  - Hover: `background-color: var(--tool-accent-hover, var(--accent-hover))` with subtle elevation glow (`box-shadow: 0 6px 24px -4px var(--tool-accent-glow, var(--accent-glow))`).
- **Text Links (`a`)**:
  - Default state uses `var(--tool-accent, var(--accent-strong))` with matching subtle text-decoration color.
  - Hover state highlights with `var(--tool-accent-hover, var(--accent-hover))` and an underline.
- **Tabs, Nav Links & Segmented Controls**:
  - Inactive tabs on hover tint using `var(--tool-accent-soft, var(--accent-soft))` and `var(--tool-accent, var(--accent))`.
  - Active tabs prominently display `var(--tool-accent, var(--accent))` with high-contrast text and font weight 700.
- **Inputs & Textareas**:
  - Hover state subtly highlights the border with `var(--tool-accent-border, var(--accent-border))`.
  - Focus and focus-visible states use `border-color: var(--tool-accent, var(--accent))` with a 3px soft accent ring (`box-shadow: 0 0 0 3px var(--tool-accent-soft)`).
- **Core Files**:
  - Base rules: [base.css](../client/packages/tool-shell/src/styles/base.css)
  - Topbar navigation: [ts-topbar.component.ts](../client/packages/tool-shell/src/components/topbar/ts-topbar.component.ts)
  - Online Clipboard styles: [clipboard.component.css](../client/apps/tool-online-clipboard/src/clipboard.component.css)
  - DataLens styles: [data-lens.component.css](../client/apps/tool-datalens/src/data-lens.component.css)
  - Temp Email address bar: [address-bar.component.ts](../client/apps/tool-temp-email/src/components/address-bar/address-bar.component.ts)
  - Barcode Generator: [barcode-generator.component.ts](../client/apps/tool-barcode-generator/src/components/barcode-generator.component.ts)
  - QR Code Generator: [qr-generator.component.ts](../client/apps/tool-qr-generator/src/qr-generator.component.ts)

### 11.2 ChatGPT-Minimalist Appearance Settings
The Appearance settings dialog in [ts-settings-modal.component.ts](../client/packages/tool-shell/src/components/settings/ts-settings-modal.component.ts) eliminates verbose explanatory text, subtitles, and redundant copy, following ChatGPT's compact visual design:
- Mode segmented control (`Light`, `Dark`, `System`)
- High-contrast toggle switches for Display & Accessibility (`Reduce transparency`, `Reduce motion`)
- Compact Done button with zero dead whitespace
- Multiple accent color dropdown removed to enforce unified Acklet Blue branding

## 12. Shared Empty Drop State & Drag Highlighting

To eliminate inconsistent local full-screen overlays and maintain a calm, universal drag-and-drop experience across all Acklet tools:

### 12.1 Shared UI Primitives
- **`<shared-empty-drop-state>`** ([empty-drop-state.component.ts](../client/packages/tool-shell/src/components/ui/empty-drop-state/empty-drop-state.component.ts)):
  - Sits centered in the main content area; does not cover header, toolbar, or footer.
  - Single-line icon in a soft accent tile (`--tool-accent` and `--tool-accent-soft`). No multiple stacked icons.
  - Standard heading: `"Add anything"` in default text color.
  - Standard subtext: `"Drop files, folders or text to get started."` in secondary/muted color.
  - Optional action button (e.g. `"Browse files"`, `"Select Files"`), fully accessible with keyboard navigation (Enter / Space).
- **`<shared-drop-highlight>`** ([drop-highlight.component.ts](../client/packages/tool-shell/src/components/ui/drop-highlight/drop-highlight.component.ts)):
  - Wraps the active content area.
  - Toggles `1px solid var(--tool-accent)` and `var(--tool-accent-soft)` on drag enter/leave.
  - Strictly no full-screen takeover, no dashed border, no neon animations, no glow, and no shadow.
  - Exposes `itemCount`: when `0`, automatically displays `<shared-empty-drop-state>`; when `>= 1`, projects active workspace items.

### 12.2 State Rules
1. `itemCount === 0`: Show the shared empty drop state.
2. `itemCount >= 1`: Show normal content screen.
3. When the user removes the last item, the screen returns to the empty drop state immediately without page reload or lingering overlays.
4. Dropping files or folders uses the tool's existing upload path with minimal inline progress bars.

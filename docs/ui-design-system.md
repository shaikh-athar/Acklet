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

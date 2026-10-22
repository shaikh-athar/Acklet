# Acklet UI Design System & Component Foundation

## 1. Overview
This document outlines the stabilized design system architecture for Acklet, standardizing semantic tokens, Spartan UI Helm primitives, Tailwind CSS v4 theme integration, dual-theme contrast rules, and shell isolation boundaries across the repository.

Related documentation:
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
   - Moving the cursor to the far-left edge of the viewport (8px hotzone `.ts-sidebar-hotzone`) triggers an intentional 100ms hover delay before sliding the sidebar in as a floating overlay on top of content (`position: absolute; left: 0; z-index: 50`).
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
   - Background scrolling is automatically locked (`document.body.style.overflow = 'hidden'`) and restored on close.
   - Selecting any tool, section link, or pressing `Escape` automatically dismisses the drawer and returns focus smoothly.


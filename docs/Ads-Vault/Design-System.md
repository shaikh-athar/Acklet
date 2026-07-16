# Acklet Design System

> **Related Documents**:
> - [Product Experience System](Product-Experience-System.md)
> - [Motion System](Motion-System.md)
> - [Information Architecture](Information-Architecture.md)

---

## 1. Design & Brand Philosophy

Acklet is a premium digital workspace. It is designed to feel like a high-fidelity desktop application, not a standard website. The interface is optimized to reduce cognitive friction, prioritize content over decoration, and provide precise, tactile feedback.

---

## 2. Design Tokens

Design tokens are the visual atoms of our interface. No raw values or magic numbers should be hardcoded in the codebase. All variables are implemented as native CSS variables under `:root` in [styles.css](file:///Users/ayaz/Acklet/client/src/styles.css) and exposed through Tailwind CSS v4 `@theme`.

### A. Color Tokens (Semantic & Adaptive)
Acklet uses a theme-adaptive, highly polished color system. The default theme is premium light mode, and dark mode is activated via `html[data-theme="dark"]`. No raw color values are hardcoded in components.

```css
:root {
  /* --- Brand Colors (Navy/Charcoal Core) --- */
  --color-brand-50: #f8fafc;
  --color-brand-100: #f1f5f9;
  --color-brand-200: #e2e8f0;
  --color-brand-300: #cbd5e1;
  --color-brand-400: #94a3b8;
  --color-brand-500: #64748b;
  --color-brand-600: #475569;
  --color-brand-700: #334155;
  --color-brand-800: #1e293b;
  --color-brand-900: #0f172a;
  --color-brand-950: #020617;

  /* --- Accent Colors (Cyan/Electric) --- */
  --color-accent-50: #ecfeff;
  --color-accent-100: #cffafe;
  --color-accent-200: #a5f3fc;
  --color-accent-300: #67e8f9;
  --color-accent-400: #22d3ee;
  --color-accent-500: #06b6d4; /* Core Accent Action */
  --color-accent-600: #0891b2;
  --color-accent-700: #0e7490;
  --color-accent-800: #155e75;
  --color-accent-900: #164e63;

  /* --- Surface Colors (Light Mode Default) --- */
  --color-surface-950: #ffffff; /* Page Background */
  --color-surface-900: #f8f9fa; /* Section/Card Background */
  --color-surface-800: #f1f3f5; /* Hover states, inner wells */
  --color-surface-700: #e9ecef;
  --color-surface-600: #dee2e6;
  --color-surface-500: #adb5bd;

  /* --- Neutrals (Clean Slate for Light Mode) --- */
  --color-neutral-50: #09090b;  /* Inverted text */
  --color-neutral-100: #18181b; /* Main Headings */
  --color-neutral-200: #27272a; /* Body text */
  --color-neutral-300: #3f3f46;
  --color-neutral-400: #71717a; /* Secondary text */
  --color-neutral-500: #a1a1aa;
  --color-neutral-600: #d4d4d8;
  --color-neutral-700: #e4e4e7;
  --color-neutral-800: #f4f4f5;
  --color-neutral-900: #fafafa;
  --color-neutral-950: #ffffff;

  /* --- Adaptive Navbar & Borders (Light Mode) --- */
  --color-navbar-bg: rgba(255, 255, 255, 0.85);
  --color-navbar-border: rgba(0, 0, 0, 0.06);
  --color-nav-hover-bg: rgba(0, 0, 0, 0.03);
  --color-nav-active-bg: rgba(0, 0, 0, 0.05);
  --border-soft: rgba(0, 0, 0, 0.06);
  --border-medium: rgba(0, 0, 0, 0.1);
  --surface-hover: rgba(0, 0, 0, 0.03);
}

/* --- Dark Mode Overrides --- */
html[data-theme="dark"] {
  /* --- Surface Colors (Dark Mode) --- */
  --color-surface-950: #09090b; /* Page Background */
  --color-surface-900: #18181b; /* Section/Card Background */
  --color-surface-800: #27272a; /* Hover states, inner wells */
  --color-surface-700: #3f3f46;
  --color-surface-600: #52525b;
  --color-surface-500: #71717a;

  /* --- Neutrals (Inverted for Dark Mode) --- */
  --color-neutral-50: #ffffff;  /* Inverted text */
  --color-neutral-100: #fafafa; /* Main Headings */
  --color-neutral-200: #f4f4f5; /* Body text */
  --color-neutral-300: #e4e4e7;
  --color-neutral-400: #d4d4d8; /* Secondary text */
  --color-neutral-500: #a1a1aa;
  --color-neutral-600: #71717a;
  --color-neutral-700: #52525b;
  --color-neutral-800: #3f3f46;
  --color-neutral-900: #27272a;
  --color-neutral-950: #09090b;

  /* --- Adaptive Navbar & Borders (Dark Mode) --- */
  --color-navbar-bg: rgba(9, 9, 11, 0.85);
  --color-navbar-border: rgba(255, 255, 255, 0.08);
  --color-nav-hover-bg: rgba(255, 255, 255, 0.04);
  --color-nav-active-bg: rgba(255, 255, 255, 0.06);
  --border-soft: rgba(255, 255, 255, 0.07);
  --border-medium: rgba(255, 255, 255, 0.12);
  --surface-hover: rgba(255, 255, 255, 0.04);
}
```

### B. Typography Tokens
Acklet uses font pairing to establish structure and rhythm.

*   **Body & UI Text**: `Instrument Sans` (Clean, balanced neo-grotesque).
*   **Display & Headings**: `Philosopher` (Feminine serif-like structure, elegant terminals).
*   **Hero Emphasis & Accents**: `Sorts Mill Goudy` (Sophisticated, literary serif; used in *italic* for secondary headers and emphasis).
*   **Decorative Branding**: `Aboreto` (Geometric uppercase font used strictly for identity).
*   **Monospace / Code**: `JetBrains Mono` (High-readability coding font).

```css
:root {
  --font-sans: 'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-display: 'Philosopher', serif;
  --font-serif: 'Sorts Mill Goudy', serif;
  --font-decorative: 'Aboreto', system-ui;
  --font-mono: 'JetBrains Mono', monospace;

  /* Typography Scales */
  --text-xs: 0.75rem;     /* 12px */
  --text-sm: 0.875rem;    /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg: 1.125rem;    /* 18px */
  --text-xl: 1.25rem;     /* 20px */
  --text-2xl: 1.5rem;     /* 24px */
  --text-3xl: 1.875rem;   /* 30px */
  --text-4xl: 2.25rem;    /* 36px */
  --text-5xl: 3rem;       /* 48px */
  --text-6xl: 3.75rem;    /* 60px */
}
```

### C. Spacing Scale (4px-based System)
Prevents arbitrary alignment shifts.

| Token | Value | Rem | Usage |
| :--- | :--- | :--- | :--- |
| `--space-xs` | 4px | 0.25rem | Icon gaps, tight details |
| `--space-sm` | 8px | 0.5rem | Tag padding, button gaps |
| `--space-md` | 12px | 0.75rem | Small list items, button padding |
| `--space-lg` | 16px | 1.0rem | Grid gap, default padding |
| `--space-xl` | 24px | 1.5rem | Card padding, standard sections |
| `--space-2xl` | 32px | 2.0rem | Page side margins, table rows |
| `--space-3xl` | 48px | 3.0rem | Subsection separation |
| `--space-4xl` | 64px | 4.0rem | Section gaps, header height |
| `--space-5xl` | 96px | 6.0rem | Hero padding, large sections |

### D. Radius Scale
Smooth, nested curves to maintain alignment.

```css
:root {
  --radius-xs: 4px;     /* Small badges, internal controls */
  --radius-sm: 8px;     /* Small buttons, inputs, pills */
  --radius-md: 12px;    /* Default buttons, select boxes */
  --radius-lg: 16px;    /* Cards, containers, panels */
  --radius-xl: 24px;    /* Modals, drawers, hero banners */
  --radius-full: 9999px;/* Circle icons, pill tags, navbar root */
}
```

### E. Shadow & Elevation Levels
Depth is represented through subtle borders and light-based drop shadows.

```css
:root {
  /* Level 0: Canvas Base */
  --shadow-none: none;

  /* Level 1: Flat/Embedded (Cards, static panels) */
  --shadow-flat: 0 1px 2px 0 rgba(0, 0, 0, 0.4);

  /* Level 2: Raised/Interactive (Hovered cards, dropdown panels) */
  --shadow-raised: 0 8px 30px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.1) inset;

  /* Level 3: Overlay (Toasts, popovers, modals) */
  --shadow-overlay: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 2px rgba(255, 255, 255, 0.15) inset;
  
  /* Accent Shadows (Spotlight Glows) */
  --shadow-glow-cyan: 0 0 40px -10px rgba(6, 182, 212, 0.35);
  --shadow-glow-indigo: 0 0 40px -10px rgba(79, 70, 229, 0.3);
}
```

### F. Grid & Layout System
Acklet uses a 12-column grid system with strict containers.

*   **Max Width**: `1280px`
*   **Columns**: 12
*   **Gutter**: `24px` (`--space-xl`)
*   **Margins**: `32px` (`--space-2xl`)

```css
.container-main {
  width: 100%;
  max-width: 1280px;
  margin-left: auto;
  margin-right: auto;
  padding-left: var(--space-2xl);
  padding-right: var(--space-2xl);
}
```

### G. Responsive Breakpoints
Our responsive system uses standard media queries built on CSS variables:

```css
@custom-media --mq-mobile-sm (max-width: 480px);
@custom-media --mq-mobile-lg (max-width: 768px);
@custom-media --mq-tablet (max-width: 1024px);
@custom-media --mq-desktop-sm (max-width: 1280px);
@custom-media --mq-desktop-lg (min-width: 1280px);
```

---

## 3. Accessibility Guidelines

Craftsmanship requires inclusivity. The design system enforces:

1.  **Contrast Levels**: Text matches APCA standards, exceeding WCAG AA.
2.  **Keyboard Focus Visibility**: Focused elements must display a distinct ring indicator:
    ```css
    *:focus-visible {
      outline: 2px solid var(--color-brand-cyan);
      outline-offset: 4px;
    }
    ```
3.  **Aria Landmarks**: Mandatory usage of `role="navigation"`, `role="main"`, `aria-expanded`, and descriptive `aria-label` for all icon buttons.
4.  **Reduced Motion Safety**: Respect user OS preferences:
    ```css
    @media (prefers-reduced-motion: reduce) {
      * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
    ```

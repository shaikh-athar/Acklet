---
tool: QR Generator
phase: 3
last-updated: 2026-10-28
status: Complete
---

# QR Generator — Styling Guide & Design System Standards

This document establishes the styling architecture, CSS token usage, typography standards, and responsive layout rules for the Acklet QR Generator.

---

## 1. Design System Architecture

QR Generator strictly complies with the **Canonical Acklet Design System** (`client/packages/tool-shell/src/styles/tokens.css`), featuring:
1. **Unified Tool Typography**: **Scoutie Sans** across all headers, inputs, buttons, and captions.
2. **Registered Tool Accent**: **Blue Accent** (`#3B82F6` dark / `#2563EB` light, `accentHue: 217`) registered in `QR_MANIFEST` and activated via `[data-accent="blue"]`.
3. **Dual-Theme High Contrast**: Strict compliance with WCAG 2.1 AA ($\ge 4.5:1$ contrast ratio) across both Dark and Light mode surfaces.
4. **Spartan UI Helm Primitives**: Uses Spartan UI Helm directives (`hlmBtn`, `hlmInput`, `hlmBadge`) from `@acklet/tool-shell` instead of hand-rolled ad-hoc CSS.

---

## 2. Semantic CSS Tokens

All styling resolves against semantic CSS custom properties defined in `tokens.css`:

```css
/* Dark Mode Tokens (Default surface) */
[data-theme="dark"], :root {
  --surface: #1e2027;
  --surface-2: #252831;
  --surface-3: #2d313d;
  --border: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.16);
  --text: #fcfcfc;
  --text-2: rgba(255, 255, 255, 0.75);
  --text-muted: rgba(255, 255, 255, 0.50);
  
  /* Blue Accent Preset */
  --accent: #3b82f6;
  --accent-strong: #60a5fa;
  --accent-soft: rgba(59, 130, 246, 0.12);
  --accent-border: rgba(59, 130, 246, 0.28);
  --accent-ink: #1e3a8a;
}

/* Light Mode Tokens */
[data-theme="light"] {
  --surface: #ffffff;
  --surface-2: #f8fafc;
  --surface-3: #f1f5f9;
  --border: rgba(15, 23, 42, 0.08);
  --border-strong: rgba(15, 23, 42, 0.16);
  --text: #0f172a;
  --text-2: rgba(15, 23, 42, 0.75);
  --text-muted: rgba(15, 23, 42, 0.50);

  /* Blue Accent Preset */
  --accent: #2563eb;
  --accent-strong: #1d4ed8;
  --accent-soft: rgba(37, 99, 235, 0.08);
  --accent-border: rgba(37, 99, 235, 0.24);
  --accent-ink: #eff6ff;
}
```

---

## 3. Typography Standards

In accordance with the canonical Acklet tool guidelines, QR Generator utilizes **Scoutie Sans** for all tool surfaces:

```css
.scoutie-sans-tool {
  font-family: "Scoutie Sans", sans-serif;
  font-optical-sizing: auto;
  font-weight: 400;
  font-style: normal;
}
```

### Type Hierarchy:
- **Title / Header**: Scoutie Sans, `font-weight: 600`, `letter-spacing: -0.02em`.
- **Studio Sub-Navigation Tabs**: Scoutie Sans, `font-weight: 500`, `font-size: 0.875rem`.
- **Form Labels & Inputs**: Scoutie Sans, `font-weight: 400`, `font-size: 0.9375rem`.
- **Buttons & Action Controls**: Scoutie Sans, `font-weight: 500`, `font-size: 0.9375rem`.
- **RFC Technical Payload Box**: Monospace (`JetBrains Mono`, `Fira Code`, monospace), `font-size: 0.8125rem`.

---

## 4. Layout & Grid Architecture

### 4.1 Shell Boundaries (`.qr-page-shell`)
- **Max Width**: Centered tool container constrained to `1160px`.
- **Ad Gutters**: Fixed outer gutters ($\ge 1280\text{px}$) reserved for left and right skyscraper placement without overlapping the core tool.
- **Fixed Side-by-Side Workspace ($\ge 1024\text{px}$)**:
  - **Left Column (~55%)**: Hosts Mode Navigation bar (`Content` / `Customize` / `Dynamic Links`) and matching height studio panels with smooth internal scrolling.
  - **Right Column (~45%)**: Fixed `PreviewPanelComponent` pinned in the viewport with the live SVG stage, verification diagnostics badge, and primary export buttons.

### 4.2 Breakpoints:
- **Desktop Wide ($\ge 1280\text{px}$)**: Side ad gutters active + 2-column studio grid.
- **Desktop Standard ($1024\text{px} - 1279\text{px}$)**: Gutters collapsed + 2-column fixed studio grid.
- **Tablet Portrait ($769\text{px} - 1023\text{px}$)**: Stacked 1-column responsive scroll flow with touch targets $\ge 44\text{px}$.
- **Mobile ($\le 768\text{px}$)**: Full-viewport coverage, centered dropdown type selector, bottom sheet modal, and sticky action bar with haptic feedback.

---

## 5. Component Styling Rules

### Inputs & Textareas:
```scss
.qr-input, .qr-textarea {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text);
  font-family: "Scoutie Sans", sans-serif;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:focus-visible {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }
}
```

### Action Buttons:
Primary CTAs leverage Spartan UI `HlmButton` with blue accent variables:
```scss
.btn-primary {
  background: var(--accent);
  color: #ffffff;
  border-radius: 10px;
  font-weight: 500;
  transition: background-color 0.15s ease, transform 0.1s ease;

  &:hover:not(:disabled) {
    background: var(--accent-strong);
    transform: translateY(-1px);
  }
}
```

---

## 6. WCAG 2.1 AA Compliance Verification

- **Color Contrast**: All typography strictly complies with $\ge 4.5:1$ against surface backgrounds.
- **Non-Text Contrast**: Icons, focus rings, and input boundaries maintain $\ge 3:1$ against adjacent backgrounds.
- **Focus Rings**: Every interactive element includes high-visibility 2px focus outlines with 2px offset.
- **Color Independence**: Statuses and validation messages always pair icons (`alert-triangle`, `check-circle`) with clear semantic text.

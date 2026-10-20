---
tool: QR Generator
phase: 1
last-updated: 2026-10-20
status: In Progress
---

# Styling Guide

## CSS Architecture

All styling uses **CSS custom properties** (CSS variables) for theming.

### Color Tokens (Define in global `styles.scss`)

```css
:root {
  /* Acklet theme base */
  --color-background: #ffffff;
  --color-surface: #f8f8f8;
  --color-foreground: #000000;
  --color-border: #e0e0e0;
  --color-muted: #999999;
  
  /* QR Generator accent (emerald, not ink-green) */
  --color-accent: #00cc99;
  --color-accent-dark: #009966;
  --color-accent-20: rgba(0, 204, 153, 0.2);
  
  /* Semantic colors */
  --color-warning: #e74c3c;
  --color-success: #27ae60;
  
  /* Typography */
  --font-display: 'Fraunces', serif;
  --font-ui: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #121212;
    --color-surface: #1e1e1e;
    --color-foreground: #ffffff;
    --color-border: #333333;
    --color-muted: #999999;
    /* Accent stays same */
  }
}
```

### Components Use Variables

In component SCSS:
```scss
.button {
  background: var(--color-accent);
  color: white;
  border: 1px solid var(--color-border);
}

.button:hover {
  background: var(--color-accent-dark);
}
```

## Typography

| Element | Font | Size | Weight | Usage |
|---------|------|------|--------|-------|
| h1 | Fraunces | 2.5rem | 400 | Page title |
| h2 | Fraunces | 1.2rem | 400 | Section heading |
| body | Inter | 1rem | 400 | Regular text |
| small | Inter | 0.85rem | 400 | Helper text, labels |
| code | JetBrains Mono | 0.9rem | 400 | Hex colors, code |

## Spacing

- **Padding**: 1rem, 1.5rem, 2rem
- **Margin**: 0.5rem, 1rem, 1.5rem, 2rem
- **Gap**: 1.5rem (between sections), 0.75rem (within groups)
- **Card padding**: 1.5rem
- **Card border-radius**: 8px

## Breakpoints

- **Desktop**: > 900px (2-column grid)
- **Mobile**: ≤ 900px (1-column stack)

```scss
@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr; /* 2 columns → 1 */
  }
}
```

## Component-Specific Styles

### Inputs (textarea, text input, color picker)

```scss
.textarea, .input {
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-family: var(--font-ui);
  background: var(--color-background);
  color: var(--color-foreground);
  font-size: 0.95rem;
  
  &:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px var(--color-accent-20);
  }
}

.color-picker {
  width: 50px;
  height: 40px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
}
```

### Buttons

```scss
.button {
  padding: 0.75rem 1.5rem;
  background: var(--color-accent);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: var(--color-accent-dark);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 204, 153, 0.3);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
```

### Sliders

```scss
input[type="range"] {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: var(--color-border);
  outline: none;
  -webkit-appearance: none;
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--color-accent);
    cursor: pointer;
  }
  
  &::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--color-accent);
    cursor: pointer;
    border: none;
  }
}
```

### Cards

```scss
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.5rem;
}
```

## Accessibility

- **Contrast**: All text ≥ 4.5:1 on background (WCAG AA)
- **Focus**: Visible outline on all interactive elements (≥ 3px)
- **Color**: Not the only visual indicator (e.g., icon + color warning)

## Dark/Light Mode

Uses CSS `@media (prefers-color-scheme: dark)` — no JavaScript toggle needed for Phase 1.

Test:
- Light mode (default)
- Dark mode (macOS: System Preferences → Appearance → Dark)

---

**No Tailwind, no Bootstrap, no CSS framework. Pure CSS + variables.**

---
tool: Online Clipboard
phase: 1
last-updated: 2026-10-20
status: Complete
---

# Online Clipboard — Styling Specification & Design Tokens

## 1. Dual-Theme Design Tokens

Online Clipboard consumes semantic tokens from `client/packages/tool-shell/src/styles/tokens.css`. Hardcoded static hex values are strictly forbidden to ensure flawless Light and Dark mode rendering.

```css
/* Canonical Acklet Dual-Theme Tokens */
--bg-page:         var(--bg-page);         /* Light: #F8FAFC | Dark: #090D11 */
--bg-card:         var(--bg-card);         /* Light: #FFFFFF | Dark: #131920 */
--border-subtle:   var(--border-subtle);   /* Light: rgba(0,0,0,0.08) | Dark: rgba(255,255,255,0.08) */
--text-main:       var(--text-main);       /* Light: #0F172A | Dark: #F1F5F9 */
--text-muted:      var(--text-muted);      /* Light: #64748B | Dark: #94A3B8 */

/* Tool Brand Accent: Teal (data-accent="teal") */
--accent:          var(--accent);          /* Light: #0D9488 | Dark: #2DD4BF */
--accent-ink:      var(--accent-ink);      /* Light: #FFFFFF | Dark: #04211E (Text on fill) */
--accent-soft:     var(--accent-soft);     /* Derived tint for active pills & hover rings */
--accent-strong:   var(--accent-strong);   /* Text/icons on cards (passes 4.5:1 contrast) */
```

---

## 2. Typography Scale

- **Font Family**: Single primary font family (**Nunito**) across the entire Tools surface, paired with **JetBrains Mono** / `ui-monospace` for room codes and technical metrics.

| Style Role | Font Family | Size | Weight | Line Height | Tracking |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Page Title** | `Nunito` | `28px` | `650` | `34px` | `-0.02em` |
| **Section Label** | `Nunito` | `12px` | `600` | `16px` | `0.08em` (Uppercase) |
| **Body / Editor** | `Nunito` | `14px` | `400` | `22px` | `normal` |
| **Action Buttons**| `Nunito` | `13px` | `600` | `18px` | `normal` |
| **Room Code / Key**| `JetBrains Mono`| `14px`| `600` | `18px` | `0.04em` |
| **Captions** | `Nunito` | `12px` | `400` | `16px` | `normal` |

---

## 3. Responsive Breakpoints & Layout Adapters

### 3.1 Primary Breakpoint: `640px` (Mobile vs. Desktop/Tablet)

```text
┌───────────────────────────────────────┬───────────────────────────────────────┐
│           MOBILE (< 640px)            │       DESKTOP & TABLET (>= 640px)     │
├───────────────────────────────────────┼───────────────────────────────────────┤
│ • Full-width search pill on Line 1    │ • Single horizontal header row        │
│ • Scrollable filter chips on Line 2   │ • Left-aligned filter chips + count   │
│ • Compact 3-dots menu (⋮) for options │ • Direct Filter, Sort, & View buttons │
│ • 2-Row touch bottom action bar:      │ • Single horizontal bottom action bar:│
│   - Row 1: [Copy 50%] [Save 50%]      │   - Left: [Copy] [Save] [Wrap] ...    │
│   - Row 2: [Wrap] [Refresh] [Revs]    │   - Right: Relative status caption    │
│   - Row 3: Status caption             │                                       │
│ • 44px minimum touch targets          │ • 32px / 36px compact button targets  │
└───────────────────────────────────────┴───────────────────────────────────────┘
```

---

## 4. Key Component Styling Rules

### 4.1 Borderless Elevated Cards & Selection Rings
Harsh border boxes are replaced with clean elevated surfaces and soft focus/selection rings:
```css
/* Card Resting State */
.file-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

/* Selected State */
.file-card.selected {
  box-shadow: 0 0 0 2px var(--accent) !important;
}
```

### 4.2 Ambient Top Feather Fade Scroll Effect
```css
.files-sticky-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bg-card);
  backdrop-filter: blur(6px);
}

.files-sticky-header.scrolled::after {
  content: '';
  position: absolute;
  bottom: -16px;
  left: 0;
  right: 0;
  height: 16px;
  background: linear-gradient(to bottom, var(--bg-card), transparent);
  pointer-events: none;
}
```

### 4.3 Word Wrap Active Button Highlight
```css
.action-btn.active {
  background: var(--accent-soft);
  color: var(--accent-strong);
  border-color: var(--accent);
}
```

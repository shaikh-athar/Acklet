# UI & UX Design System — Acklet Docs

## 1. Design Philosophy
Acklet Docs embodies a minimal, editorial, and developer-centric visual identity inspired by the monochrome **Vercel preset** from 21st.dev. It strictly avoids decorative gradients, excessive borders, or random accent colors.

### Principles:
1. **Monochrome Rigor**: All surfaces, text, borders, and interactive states derive purely from grayscale OKLCH tokens.
2. **Clear Information Hierarchy**: Bold, crisp headings paired with muted secondary metadata (`--muted-foreground`).
3. **Purposeful Feedback**: States (hover, focus, active, saving, saved, error) are immediately distinguishable without visual clutter.
4. **Fluid Responsiveness**: Deliberate adaptive breakpoints (1440px desktop, 1024px laptop/tablet-landscape, 768px tablet, 375px mobile).

---

## 2. Token System (OKLCH Monochrome)

| Variable | Light Mode | Dark Mode | Usage |
| :--- | :--- | :--- | :--- |
| `--background` | `oklch(0.99 0 0)` | `oklch(0 0 0)` | Canvas / page background |
| `--foreground` | `oklch(0 0 0)` | `oklch(0.99 0 0)` | Primary high-contrast text |
| `--card` | `oklch(1.00 0 0)` | `oklch(0.12 0 0)` | Card containers & elevated surfaces |
| `--border` | `oklch(0.92 0 0)` | `oklch(0.26 0 0)` | Subtle 1px structural dividing lines |
| `--input` | `oklch(0.92 0 0)` | `oklch(0.26 0 0)` | Input borders |
| `--primary` | `oklch(0 0 0)` | `oklch(0.99 0 0)` | Primary call-to-action background |
| `--primary-foreground` | `oklch(1.00 0 0)` | `oklch(0 0 0)` | Primary CTA text |
| `--secondary` | `oklch(0.94 0 0)` | `oklch(0.18 0 0)` | Hover backgrounds & secondary buttons |
| `--muted` | `oklch(0.97 0 0)` | `oklch(0.18 0 0)` | Low-emphasis backgrounds |
| `--muted-foreground` | `oklch(0.44 0 0)` | `oklch(0.65 0 0)` | Subtitles, timestamps, placeholders |
| `--radius` | `0.5rem` (8px) | `0.5rem` (8px) | Unified component corner radius |

---

## 3. Distinguishable Interactive States

To eliminate ambiguity between resting, hovered, and active items:

### Sidebar Navigation Links (`.docs-nav-link`)
- **Resting / Default**:
  - Background: `transparent`
  - Text: `var(--muted-foreground)`
  - Border: `3px solid transparent`
- **Hovered**:
  - Background: `var(--secondary)`
  - Text: `var(--foreground)`
  - Border: `3px solid var(--border)`
- **Selected / Active**:
  - Background: `var(--card)`
  - Text: `var(--foreground)`
  - Font Weight: `600` (Semi-bold)
  - Left Indicator: `border-left: 3px solid var(--foreground)`
  - Box Shadow: `0 1px 3px rgba(0, 0, 0, 0.08)`

### Topic Filter Chips (`.docs-topic-chip`)
- **Inactive**: Subtle 1px border (`var(--border)`), transparent background, muted text.
- **Hover**: High-contrast text, border shifts to `var(--muted-foreground)`.
- **Active / Selected**: Solid `var(--foreground)` background with inverted `var(--background)` text.

### Primary Button (`.docs-btn-primary`)
- **Light Mode**: Solid black surface with white text (`bg-black text-white hover:bg-black/90`).
- **Dark Mode**: Solid white surface with black text (`bg-white text-black hover:bg-white/90`).

---

## 4. Layout & Grid Specifications

### Desktop 3-Column Community View (>= 1280px)
- **Column 1 (Left Sidebar)**: `240px` fixed width with brand logo, "Explore Stories" navigation, and "Creator Workspace" navigation.
- **Column 2 (Center Feed)**: `minmax(0, 720px)` flexible column with feed tabs ("For you" / "Latest"), search field, topic chips, and article feed cards.
- **Column 3 (Right Sidebar)**: `300px` fixed width with "About Acklet Docs", trending topic tags, and creator workspace callout card.

### Responsive Breakpoints
- **1024px – 1279px**: Right sidebar collapses; center feed expands to fill available content space.
- **768px – 1023px**: Left sidebar collapses into a slide-over mobile drawer toggled via the navbar hamburger menu.
- **< 768px (Mobile)**: Single-column stacked layout with full-width search input, horizontal scrollable topic chip container, touch-friendly tap targets (min 44px), and sticky mobile navbar.

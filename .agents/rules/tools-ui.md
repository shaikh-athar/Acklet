# Tools UI rules (surface: Tools)

## Product structure
1. Tools Hub (tools.localhost): one page to browse all tools. Search + category tabs + tool cards. Each card is one real link to the tool.
2. Tool page (<slug>.localhost, e.g. clipboard.localhost): the shell with
   - Navbar card (top, full width)
   - Sidebar card (left): tools list grouped by category, active tool highlighted
   - Main card (right, scrolls inside): the tool component first, the tool's description/About section BELOW it
3. Tools stay separate apps (apps/tool-<slug>) on their own subdomains. Do not change the hostname dispatch.

## Visual source of truth
- Source of Truth: Canonical design tokens in `client/packages/tool-shell/src/styles/tokens.css`, Spartan UI Helm primitives in `client/packages/tool-shell/src/helm/`, and tool metadata in `client/packages/tool-registry/`. When explicit visual mockups or references are provided in the task, match them accurately.
- If task requirements and these rules disagree, the task requirements take precedence.

## Look (tokens only, defined in packages/tool-shell tokens.css)
- Canonical Dual-Theme Design Tokens: Always use the surface semantic CSS tokens defined in `client/packages/tool-shell/src/styles/tokens.css` for page backgrounds, card surfaces, borders, and text.
  - Light mode: Clean elevated surfaces (`--bg-card`, `--bg-page`), subtle hairline borders (`--border-subtle`), dark text (`--text-main`), high contrast.
  - Dark mode: Matte surfaces, refined borders, bright legible text (`--text-main`), zero muddy unreadable text.
- Accent Color Integration: Each tool has an accent color registered in `tools.manifest.ts` (e.g. teal, blue, violet). Use token variables (`--accent`, `--accent-ink`, `--accent-soft`, `--accent-border`) for active states, highlights, and primary CTAs. Never hardcode static hex values that break theme switching.
- Cards: 20px radius. Gaps between shell cards: 12px. Spacing scale 4/8/12/16/24/32/48.
- ONE font family for the whole Tools surface (Nunito). Hierarchy by size and weight only.

### Adding a new accent (5 lines)
1. Add named block in `tokens.css`: `[data-accent="<name>"]` and `[data-theme="light"][data-accent="<name>"]`.
2. Supply only 3 tokens per mode: `--accent` (bright fill), `--accent-ink` (text/icon on fill, >= 4.5:1), `--accent-strong` (text/links/icons on surfaces, >= 4.5:1).
3. All tints, borders, and glows are auto-derived via `color-mix`: `--accent-soft`, `--accent-border`, and `--accent-glow`.
4. Register the accent name on the tool in `tools.manifest.ts` (`accent: '<name>'`).
5. Tool shell automatically injects `[data-accent="<name>"]` onto `.ts-root` to theme the entire tool experience.

## Interaction
- Hover on icons/buttons/rows: rounded gray background. NO border, outline or ring on mouse hover or click. Active = soft gray fill. Keyboard-only :focus-visible ring is allowed.
- Icon-only buttons: 40px hit area, aria-label, tooltip.
- One theme toggle, one search, each nav link appears once.

## Components
- Spartan first (tool-shell helm). Add a component with the Spartan CLI, then customize. Do not hand-build lookalikes.
- Custom code only for what Spartan lacks, composed from Spartan parts.

## Not in scope unless a task says so
Animations, spotlight/hover-lift effects, tool-open transitions, responsive polish. Each is its own task.

## Definition of done
1. Verified in both Light and Dark modes with high contrast (WCAG AA >= 4.5:1).
2. Zero changes outside the Tools surface paths (npm run check:scope -- tools).
3. npm run check:isolation passes; the three apps build with no new warnings.
4. Workspace (localhost:4200/workspace) looks exactly as before.
5. Existing tool behavior still works.

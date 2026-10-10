# Tools UI rules (surface: Tools)

## Product structure
1. Tools Hub (tools.localhost): one page to browse all tools. Search + category tabs + tool cards. Each card is one real link to the tool.
2. Tool page (<slug>.localhost, e.g. clipboard.localhost): the shell with
   - Navbar card (top, full width)
   - Sidebar card (left): tools list grouped by category, active tool highlighted
   - Main card (right, scrolls inside): the tool component first, the tool's description/About section BELOW it
3. Tools stay separate apps (apps/tool-<slug>) on their own subdomains. Do not change the hostname dispatch.

## Visual source of truth
- Reference images live in .agents/reference/tools-ui/ (see INDEX.md). Before any UI task: view the relevant image, build to match it, then compare your screenshot against it side by side. "Same as the image" means same layout, spacing, radius, sizes and hover. Do not reinterpret.
- If the reference and these rules disagree, stop and ask.

## Look (tokens only, defined once in packages/tool-shell tokens.css)
- Grayscale GOTH only: page #f4f4f4, cards #FFFFFF, hairline border rgba(0,0,0,0.06), text #0D0D0D, muted #6B6B6B (WCAG AA), primary = solid black. Dark mode: bg #0B0B0B, cards #141414, border #27272A, text #FCFCFC.
- No other hues anywhere in tool chrome (no blue/green/purple tiles or badges).
- Cards: 20px radius. Gaps between shell cards: 12px. Spacing scale 4/8/12/16/24/32/48.
- ONE font family for the whole Tools surface (Nunito). Hierarchy by size and weight only.

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
1. Matches the reference image (screenshot compared, light + dark).
2. Zero changes outside the Tools surface paths (npm run check:scope -- tools).
3. npm run check:isolation passes; the three apps build with no new warnings.
4. Workspace (localhost:4200/workspace) looks exactly as before.
5. Existing tool behavior still works.

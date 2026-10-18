# Acklet Monorepo — Agent Operating Rules

## Instruction Hierarchy
When requirements or guidelines seem to conflict, adhere strictly to this priority order:
1. **Level 1 (Highest):** Explicit user prompt requirements & current task specifications.
2. **Level 2:** Core architecture boundaries ([surfaces.md](rules/surfaces.md)) and sensitive file exclusions ([security.md](rules/security.md)).
3. **Level 3:** Canonical Acklet Design System — dual-theme tokens (`client/packages/tool-shell/src/styles/tokens.css`), Spartan UI Helm primitives, and WCAG AA contrast (>= 4.5:1).
4. **Level 4:** Engineering discipline (YAGNI, reuse existing code/helpers, root-cause fixes, shortest working diff).
5. **Level 5:** UI/UX craft & smart product defaults ([uireference.md](rules/uireference.md)).

---

## Pre-Task Discipline
- **Surface Isolation:** Every UI task belongs to exactly ONE surface (Tools, Acklet, Shared, or Meta). Work strictly inside the designated surface paths.
- **Task Briefing:** For medium or large tasks, outline a concise task brief in your response using the structure in [task-brief.md](templates/task-brief.md) before writing code.
- **Inspect Before Editing:** Read the task and the code it touches. Trace the real flow end-to-end. Do not rewrite existing working modules.
- **Infer Sensible Defaults:** Proactively design standard states (empty, loading, validation, error recovery) and keyboard workflows without asking the user to specify every minor element. Ask only about material architectural, security, or data model decisions.

---

## Engineering Rules (Ponytail / Senior Dev Mode)
Before writing any new code, stop at the first rung that holds:
1. Does this need to be built at all? (YAGNI)
2. Does it already exist in this codebase? Reuse the helper, util, or pattern that's already here; do not re-write it.
3. Does the standard library already do this? Use it.
4. Does a native platform feature cover it? Use it.
5. Does an already-installed dependency solve it? Use it.
6. Can this be one line? Make it one line.
7. Only then: write the minimum code that works.

- **No Unrequested Abstractions or Dependencies:** Build the simplest working implementation. Never introduce a new npm package or Maven dependency without explicit user approval.
- **Root-Cause Bug Fixing:** When fixing an issue, identify the root cause in the shared component or utility, rather than patching symptoms across multiple caller files.
- **Deletion Over Addition:** Fewer, cleaner files win. Avoid generating boilerplate nobody asked for.
- **Secure File Handling:** Exclude sensitive repository/system files using standard security exclusion filters (see [security.md](rules/security.md)).

---

## UI/UX & Dual-Theme Standards
- **Dual-Theme High Contrast:** All UI elements (cards, text, inputs, buttons, pills, modals, toasts) must have high contrast and flawless legibility in BOTH Light and Dark themes. Never hardcode static hex values that disappear against light or dark surfaces. Always use semantic CSS variables (`--bg-*`, `--text-*`, `--border-*`, `--accent-*`).
- **Spartan First:** Reuse Spartan UI Helm primitives (`HlmButton`, `HlmBadge`, `HlmInput`, etc.) from `tool-shell` instead of hand-rolling custom button/input CSS.
- **Targeted Visual Verification:** After modifying UI, verify both Light and Dark themes in the localhost browser. Take purposeful before/after visual checks; avoid repetitive, low-value browser exploration loops.
- **Honest Verification:** Run relevant check scripts (e.g. `npm run check:scope -- <surface>`, `./mvnw test-compile`). Report passes, blockers, and failures transparently.

---

## AI Efficiency & Verification Discipline
- **Targeted Code Inspection:** Prefer targeted line-range reads (`view_file` with `StartLine`/`EndLine`) and `grep_search` over reading entire 800+ line files. Load only the context required for the immediate change.
- **Command Failure Circuit Breaker:** If a terminal command, test, or build script fails, **NEVER** re-run the exact same command without diagnosing the root cause from the error output and making a targeted fix. Max 1 retry after a verified code/config correction.
- **Zero Redundant Browser Exploration:** Do not spawn browser subagents or capture repeated full-page screenshots when no UI template or CSS rules have changed. Perform targeted before/after checks only when verifying tangible visual modifications.
- **Tiered Verification Selection:**
  - Small/local changes: `node scripts/verify.mjs -A` (~3-5s).
  - Feature changes: `node scripts/verify.mjs -B` (~12-18s).
  - Pre-commit/integration: `node scripts/verify.mjs -C` (~30-45s).
  - Smart Scope automatically skips unchanged backend/frontend layers; pass `--all` to force all checks.
- **Plan Discipline:** Require a structured plan before multi-file architectural changes; avoid lengthy planning documents for trivial 1-line fixes.



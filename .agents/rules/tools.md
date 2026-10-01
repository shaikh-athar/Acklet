---
trigger: always_on
---

# Acklet Tool Development & Architecture Rules

This file governs how Antigravity or any AI agent builds, optimizes, and maintains tools in the Acklet ecosystem.

**Read this document completely before starting any tool implementation.**

Related documents:
- [UI-FOUNDATION.md](file:///Users/ayaz/Acklet/.agents/rules/UI-FOUNDATION.md) — Platform vs. Tool UI Architecture
- [uireference.md](file:///Users/ayaz/Acklet/.agents/rules/uireference.md) — UI Component Strategy & Design Tokens
- [security.md](file:///Users/ayaz/Acklet/.agents/rules/security.md) — Sensitive File Exclusion Rules
- [Tools Master Catalog](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/README.md) — Documentation Hub

---

## 1. Directory Structure & Path Conventions

When creating new tools, modifying existing tools, or writing documentation, always adhere to these locations:

```text
Acklet/
├── client/
│   └── src/
│       ├── app/
│       │   ├── app.routes.ts                       # App routing table
│       │   ├── core/tool-registry/index.ts         # Central tool catalog & metadata
│       │   └── shared/components/                  # Generic platform primitives (icon, modal, fallback)
│       └── tools/
│           ├── data-lens/                          # Existing Multi-Format Structured Data Workbench
│           └── <new-tool-name>/                    # Self-contained new tool
│               ├── components/                     # Tool-specific UI components
│               ├── services/                       # Parsing, AST, diff, conversion, storage services
│               ├── <new-tool-name>.component.ts    # Root tool container & Signals state
│               ├── <new-tool-name>.component.html  # Workspace layout template
│               └── <new-tool-name>.component.css   # Scoped styling & scoped CSS design tokens
└── docs/
    └── Acklet Vault/
        └── Acklet/
            ├── Architecture/                       # Platform-level architecture documentation
            └── Tools/
                ├── README.md                       # Master tools directory catalog
                └── <new-tool-name>/                # Complete tool documentation suite
                    ├── README.md                   # Architecture overview & index
                    ├── description.md              # Detailed product specification & UX flows
                    ├── feature.md                  # Master feature audit matrix
                    ├── UI_REFERENCE.md             # UI design tokens, layouts, breakpoints
                    └── LEGEND.md                   # Action legend, status badges, shortcut table
```

---

## 2. Mandatory Restrictions When Creating New Tools

Every tool created in Acklet MUST comply with these non-negotiable rules:

### 2.1 100% Client-Side Privacy Rule
- All processing (parsing, validation, transformations, AST manipulation, code generation, diffing, conversion, export) MUST execute entirely in the browser's JavaScript/Web Worker/WASM runtime.
- **NEVER** transmit user data, files, tokens, or payloads to backend endpoints unless the user specifically triggers an explicit remote integration.
- Every tool header MUST display the interactive `🔒 Processed in Browser` privacy indicator.

### 2.2 Dual-Theme Contrast & Readability
- All components, modals, drawers, dropdowns, code editors, badges, and tables MUST have high contrast and perfect readability in both **Light** (`data-theme="light"`) and **Dark** (`data-theme="dark"`) modes.
- **NEVER** hardcode color literals (such as `#ffffff` or `#000000`) for text or backgrounds.
- Always use scoped CSS variables and design tokens (`--tool-surface-primary`, `--tool-text-main`, `--tool-border`, `--tool-accent`).

### 2.3 Tool Isolation & Unique Signature UX
- Acklet provides the platform shell (navigation, theme switcher, global command bar). **Each tool owns its signature user experience.**
- Do NOT force every tool into an identical cookie-cutter template. A JSON Workbench, JWT Decoder, API Tester, Image Converter, and RegEx Tester should each have layout and information density optimized for their specific workflow.
- Tool-specific styling must remain strictly scoped inside `client/src/tools/<tool-name>/`. Do not pollute global styles.

### 2.4 Component Selection Hierarchy
When implementing UI components, follow this hierarchy:
```text
Existing Tool-Specific Component
            ↓
Acklet Shared Primitive (client/src/app/shared/components/)
            ↓
Spartan UI Primitives (@spartan-ng/brain)
            ↓
Angular CDK (@angular/cdk)
            ↓
Tailwind CSS v4 & Lucide Icons (@lucide/angular)
```

### 2.5 Modern Angular & Signals Architecture
- Build exclusively with **Standalone Components**.
- Use **Angular Signals** (`signal`, `computed`, `input`, `output`) for fine-grained reactivity.
- Set `changeDetection: ChangeDetectionStrategy.OnPush` on all components.
- Ensure proper lifecycle teardown for event listeners and timers.

### 2.6 Actionable Error Diagnostics & Smart Repair
- Never display opaque errors like `"Invalid Syntax"`.
- Always provide:
  - Exact `Line X · Column Y` character pointers.
  - Visual context snippet of the problematic code.
  - Clear human-readable explanation of why the syntax failed.
  - 1-click **"Go to Error"** cursor jump.
  - 1-click **"Smart Repair"** when standard fixes (e.g. trailing commas, unquoted keys, single quotes) are detected.

### 2.7 Guided Empty States & Sample Data
- Never present an empty, unhelpful blank screen.
- Provide clear guidance text explaining the tool's purpose and **sample payload pills** (`API Response`, `Configuration`, `Nested Object`, etc.) for instant 1-click exploration.

### 2.8 Non-Blocking Large Payload Performance
- Debounce live inputs (300ms) to prevent UI lag while typing.
- For large payloads (>2MB), use asynchronous macro-tasks or Web Workers, displaying an inline `⚡ Large payload detected` badge and loading spinner.

### 2.9 Keyboard Navigation & Shortcuts
- Support standard developer shortcuts:
  - `Cmd/Ctrl + Enter`: Primary Action (Format / Run / Decode)
  - `Cmd/Ctrl + Shift + M`: Minify
  - `Cmd/Ctrl + S`: Download output
  - `Cmd/Ctrl + F`: Search within inspector/results
  - `Cmd/Ctrl + K`: Command Palette
  - `Esc`: Dismiss modals and drawers

### 2.10 Local History with IndexedDB
- Persist snapshots locally using IndexedDB.
- Group snapshots chronologically (`Today`, `Yesterday`, `Older`).
- Provide instant search, restore, and a prominent **1-click purge button** for complete data privacy.

---

## 3. Tool Creation Workflow (Step-by-Step)

When tasked with building a new tool:

1. **Understand & Research**:
   - Understand the core user workflow and 2-4 industry reference implementations.
   - Identify meaningful differentiators (faster workflow, smarter defaults, better error diagnostics, code generation).

2. **Scaffold Component & Services**:
   - Create directory `client/src/tools/<new-tool-name>/`.
   - Scaffold `<new-tool-name>.component.ts`, `<new-tool-name>.component.html`, `<new-tool-name>.component.css`.
   - Create dedicated subcomponents under `components/` and logic services under `services/`.

3. **Register Route & Metadata**:
   - Add route definition to `client/src/app/app.routes.ts`.
   - Add tool metadata to `client/src/app/core/tool-registry/index.ts`.

4. **Author Complete Documentation**:
   - Create directory `docs/Acklet Vault/Acklet/Tools/<new-tool-name>/`.
   - Create all 5 required docs (`README.md`, `description.md`, `feature.md`, `UI_REFERENCE.md`, `LEGEND.md`).
   - Add an entry to the master tools catalog `docs/Acklet Vault/Acklet/Tools/README.md`.

5. **Verify & Test**:
   - Run `npm run build --prefix client` to verify compilation.
   - Test in both Light and Dark themes.
   - Verify keyboard shortcuts, empty states, error diagnostics, and large payload handling.

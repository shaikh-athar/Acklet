# Ponytail, Lazy Senior Dev Mode & Acklet Tool Development Rules

You are a lazy senior developer and product architect. Lazy means efficient, not careless. The best code is the code never written.

Before writing any code, stop at the first rung that holds:

1. **Does this need to be built at all?** (YAGNI)
2. **Does it already exist in this codebase?** Reuse the helper, util, or pattern that's already here, don't re-write it.
3. **Does the standard library / browser already do this?** Use it.
4. **Does a native platform feature cover it?** Use it.
5. **Does an already-installed dependency solve it?** Use it.
6. **Can this be one line?** Make it one line.
7. **Only then: write the minimum code that works.**

The ladder runs after you understand the problem, not instead of it: read the task and the code it touches, trace the real flow end to end, then climb.

Bug fix = root cause, not symptom: grep every caller of the function you touch and fix the shared function once.

---

## 1. Directory Structure & Path Conventions

When creating new tools, modifying existing tools, or writing documentation, always adhere to these locations:

| Asset Type | Location Path | Guidelines |
| :--- | :--- | :--- |
| **Tool Source Code** | `client/src/tools/<tool-name>/` | Each tool is self-contained with its own `components/`, `services/`, `styles/`, and root component. |
| **Shared Primitives** | `client/src/app/shared/components/` | Shared UI infrastructure (`icon`, `feedback-modal`, `fallback-state`). Only place genuinely generic primitives here. |
| **Tool Registry & Routing**| `client/src/app/app.routes.ts`<br>`client/src/app/core/tool-registry/` | Register new tools in the application router and platform tool registry. |
| **Tool Documentation** | `docs/Acklet Vault/Acklet/Tools/<tool-name>/` | Every tool MUST contain: `README.md`, `description.md`, `feature.md`, `UI_REFERENCE.md`, `LEGEND.md`, and any format/domain-specific docs. |
| **Tools Root Catalog** | `docs/Acklet Vault/Acklet/Tools/README.md` | Master catalog of all tools in Acklet. Must be updated when a tool is added/modified. |
| **Platform Architecture** | `docs/Acklet Vault/Acklet/Architecture/` | Global platform architecture and foundation documents. |

---

## 2. Mandatory Restrictions & Architectural Rules for New Tools

Every tool created in Acklet MUST comply with these non-negotiable rules:

1. **100% Client-Side Privacy Guarantee**:
   - All parsing, formatting, transformations, validations, and AST computations MUST run in-browser (pure TypeScript, Web Workers, WASM).
   - Zero payload data, code snippets, tokens, or files may ever be sent to remote backend servers unless explicitly requested by the user.
   - Display the standard interactive `🔒 Processed in Browser` privacy indicator.

2. **Dual-Theme High Contrast & Readability**:
   - All components, inputs, dropdowns, tables, drawers, toasts, and modals MUST support both Light (`data-theme="light"`) and Dark (`data-theme="dark"`) themes.
   - Never hardcode color literals (e.g. `#fff`, `#000`) for text or backgrounds that cause text to disappear in either theme. Always use scoped design tokens (`--jl-surface-primary`, `--jl-text-main`, etc.).

3. **Tool Isolation & No Forced Global Templates**:
   - Each tool owns its own unique UX, interaction model, information density, and layout (see [UI-FOUNDATION.md](file:///Users/ayaz/Acklet/.agents/rules/UI-FOUNDATION.md)).
   - Do NOT create monolithic global templates and force all tools to look identical.
   - Scoped styles must stay inside `client/src/tools/<tool-name>/`. Do not pollute global CSS with tool-specific rules.

4. **Component Selection Hierarchy**:
   ```text
   Existing Tool Component → Shared Primitive → Spartan UI (@spartan-ng/brain) → Angular CDK (@angular/cdk) → Tailwind CSS v4 & Lucide Icons
   ```

5. **Modern Angular & Signal Architecture**:
   - Standalone components only.
   - Use Angular Signals (`signal`, `computed`, `input`, `output`) and `ChangeDetectionStrategy.OnPush`.
   - Explicit cleanup of subscriptions/timers.

6. **Actionable Error Diagnostics & Smart Recovery**:
   - Never display cryptic, unhelpful error strings like `"Parsing failed"`.
   - Pinpoint exact `Line X · Column Y`, provide code snippets, human explanations, and 1-click cursor jump / smart repair where applicable.

7. **Contextual Empty States & Sample Data**:
   - Every input pane and inspector tab must provide guided empty states with 1-click sample pills/buttons so users never face a blank, confusing canvas.

8. **Asynchronous Non-Blocking Execution**:
   - Large payloads (>2MB) must process asynchronously via macro-tasks or Web Workers with `⚡ Large payload detected` badges, preventing UI freeze.

9. **Keyboard Shortcuts & Command Palette**:
   - Integrate with platform shortcuts (`Cmd/Ctrl+Enter`, `Cmd/Ctrl+S`, `Cmd/Ctrl+K`, `Cmd/Ctrl+F`, `Esc`).

10. **Secure Scanning Exclusions**:
    - Any file/directory scan must exclude sensitive directories and files using `SecurityUtils` (see [security.md](file:///Users/ayaz/Acklet/.agents/rules/security.md)).

11. **Documentation Integrity**:
    - Update and maintain all affected documentation under `docs/Acklet Vault/Acklet/Tools/<tool-name>/` whenever features are added, modified, or planned. Always use relative markdown links.

12. **Verification & Testing**:
    - Always verify that the Angular build passes (`npm run build --prefix client`) without errors before declaring a task complete.

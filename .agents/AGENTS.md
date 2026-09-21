Haan bhai. **Ab main tumhare diye hue existing content ko remove nahi kar raha.**
Tumhara existing `AGENTS.md` **as-is preserve** rahega, aur main uske andar **sirf required additions** structured format mein insert/append kar raha hoon.

Neeche wala version tumhare existing content ka updated form hai. Main tumhare **Ponytail rules, directory structure, all 12 mandatory rules, aur all 9 performance rules** retain kar raha hoon. Sirf agent bootstrap, rules/workflows loading, slash-command routing, context-first execution, documentation sync, aur task lifecycle add kiya hai.

````md
# Ponytail, Lazy Senior Dev Mode & Acklet Tool Development Rules

You are a lazy senior developer and product architect. Lazy means efficient, not careless. The best code is the code never written.

---

## 0. Mandatory Agent Initialization

This `AGENTS.md` file is the **mandatory entry point for every agent session, every chat, and every development task**.

### Before doing anything else, the agent MUST:

1. Read this `AGENTS.md`.
2. Go through the applicable files under `.agents/rules/`.
3. Go through the applicable files under `.agents/workflows/`.
4. Understand the user's request.
5. Identify the correct workflow.
6. Only then begin repository exploration, research, implementation, or verification.

### This rule MUST NOT be skipped

The agent must read `AGENTS.md` even when:

- the task looks trivial
- only one line needs to be changed
- the affected file is already known
- the agent worked on the same feature previously
- the user explicitly asks to directly implement something
- `/fast` is requested
- `/implement` is requested
- `/verify` is requested
- the task is a continuation of previous work

### Mandatory execution order

```text
Every Chat / Task
        ↓
Read AGENTS.md
        ↓
Read applicable Rules
        ↓
Read applicable Workflows
        ↓
Understand Request
        ↓
Select Workflow
        ↓
Context / Research
        ↓
Implement
        ↓
Verify
        ↓
Update Affected Documentation
        ↓
Final Summary
````

`AGENTS.md` is the master entry point and MUST always be loaded first.

---

## 0.1 Agent Rules and Workflow Separation

The `.agents/` directory separates permanent rules from execution workflows.

### Rules

Rules define:

> WHAT MUST ALWAYS BE TRUE

Location:

```text
.agents/rules/
```

Examples:

```text
permissions.md
ponytail.md
security.md
tools.md
UI-FOUNDATION.md
uireference.md
```

Rules are persistent project constraints.

---

### Workflows

Workflows define:

> HOW A SPECIFIC TASK SHOULD BE EXECUTED

Location:

```text
.agents/workflows/
```

Examples:

```text
context.md
fast.md
research.md
goal.md
implement.md
verify.md
update.md
```

The exact workflow list may evolve.

The agent must inspect the current `.agents/workflows/` directory instead of assuming a fixed list.

---

## 0.2 Slash Command Workflow

Slash commands are implemented through workflow files.

Examples:

```text
/research
/goal
/context
/fast
/implement
/verify
/update
```

Each slash command should map to its corresponding workflow under:

```text
.agents/workflows/
```

For example:

```text
/context
```

uses:

```text
.agents/workflows/context.md
```

and:

```text
/fast
```

uses:

```text
.agents/workflows/fast.md
```

### Slash commands MUST NOT bypass AGENTS.md

Even when a slash command is requested:

```text
/fast
```

the agent MUST still execute:

```text
AGENTS.md
    ↓
Rules
    ↓
Workflows
    ↓
fast.md
```

A workflow can define how the task is executed, but it cannot override a mandatory rule defined by `AGENTS.md` or the applicable rule files.

---

## 0.3 Context-First Repository Exploration

Do not scan the entire repository by default.

The agent should first understand:

* what the user is asking
* which tool is affected
* which feature is affected
* which subsystem owns the behavior
* which files are likely responsible
* which existing documentation describes the feature

Then inspect only the relevant code.

Preferred flow:

```text
User Request
    ↓
Context
    ↓
Subsystem
    ↓
Relevant Files
    ↓
Relevant Callers
    ↓
Implementation
```

Avoid:

```text
User Request
    ↓
Scan Entire Repository
    ↓
Read Dozens of Unrelated Files
    ↓
Implement
```

Use:

```text
.agents/workflows/context.md
```

to navigate the project efficiently.

---

## 0.4 Context Is a Navigation Map

`context.md` exists to help the agent locate the correct code quickly.

It should describe:

* major modules
* important subsystems
* important files
* file responsibilities
* feature entry points
* service relationships
* data flow
* important documentation locations

It must NOT become a complete copy of the repository architecture.

The source-of-truth hierarchy is:

```text
Current Code
    ↓
Current Project Documentation
    ↓
context.md
    ↓
Previous Agent Assumptions / Memory
```

If `context.md` conflicts with the actual code, trust the code, investigate the difference, and update the context when appropriate.

---

# Ponytail, Lazy Senior Dev Mode

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

# Safe Build and Verification Permissions

The agent is always allowed to run safe, non-destructive build, compile, test, lint, type-check, and verification commands without asking the user for permission.

The agent has permission to execute these commands when required:

```bash
npm run build --prefix client
```

```bash
./mvnw clean compile -DskipTests
```

Examples of other normally safe commands include:

```bash
npm test
npm run lint
npm run typecheck
./mvnw test
./mvnw verify
```

The agent should use reasonable judgment and may execute equivalent non-destructive verification commands.

The agent does NOT need to ask the user for permission for routine build and verification operations.

Destructive operations such as deleting data, deleting directories, destructive database operations, production changes, credential changes, or irreversible migrations still require appropriate authorization.

---

# 1. Directory Structure & Path Conventions

When creating new tools, modifying existing tools, or writing documentation, always adhere to these locations:

| Asset Type                  | Location Path                                                          | Guidelines                                                                                                                                 |
| :-------------------------- | :--------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------- |
| **Tool Source Code**        | `client/src/tools/<tool-name>/`                                        | Each tool is self-contained with its own `components/`, `services/`, `styles/`, and root component.                                        |
| **Shared Primitives**       | `client/src/app/shared/components/`                                    | Shared UI infrastructure (`icon`, `feedback-modal`, `fallback-state`). Only place genuinely generic primitives here.                       |
| **Tool Registry & Routing** | `client/src/app/app.routes.ts`<br>`client/src/app/core/tool-registry/` | Register new tools in the application router and platform tool registry.                                                                   |
| **Tool Documentation**      | `docs/Acklet Vault/Acklet/Tools/<tool-name>/`                          | Every tool MUST contain: `README.md`, `description.md`, `feature.md`, `UI_REFERENCE.md`, `LEGEND.md`, and any format/domain-specific docs. |
| **Tools Root Catalog**      | `docs/Acklet Vault/Acklet/Tools/README.md`                             | Master catalog of all tools in Acklet. Must be updated when a tool is added/modified.                                                      |
| **Platform Architecture**   | `docs/Acklet Vault/Acklet/Architecture/`                               | Global platform architecture and foundation documents.                                                                                     |

---

# 2. Mandatory Restrictions & Architectural Rules for New Tools

Every tool created in Acklet MUST comply with these non-negotiable rules:

1. **100% Client-Side Privacy Guarantee**:

   * All parsing, formatting, transformations, validations, and AST computations MUST run in-browser (pure TypeScript, Web Workers, WASM).

   * Zero payload data, code snippets, tokens, or files may ever be sent to remote backend servers unless explicitly requested by the user.

   * Display the standard interactive `🔒 Processed in Browser` privacy indicator.

2. **Dual-Theme High Contrast & Readability**:

   * All components, inputs, dropdowns, tables, drawers, toasts, and modals MUST support both Light (`data-theme="light"`) and Dark (`data-theme="dark"`) themes.

   * Never hardcode color literals (e.g. `#fff`, `#000`) for text or backgrounds that cause text to disappear in either theme. Always use scoped design tokens (`--jl-surface-primary`, `--jl-text-main`, etc.).

3. **Tool Isolation & No Forced Global Templates**:

   * Each tool owns its own unique UX, interaction model, information density, and layout (see [UI-FOUNDATION.md](.agents/rules/UI-FOUNDATION.md)).

   * Do NOT create monolithic global templates and force all tools to look identical.

   * Scoped styles must stay inside `client/src/tools/<tool-name>/`. Do not pollute global CSS with tool-specific rules.

4. **Component Selection Hierarchy**:

   ```text
   Existing Tool Component → Shared Primitive → Spartan UI (@spartan-ng/brain) → Angular CDK (@angular/cdk) → Tailwind CSS v4 & Lucide Icons
   ```

5. **Modern Angular & Signal Architecture**:

   * Standalone components only.

   * Use Angular Signals (`signal`, `computed`, `input`, `output`) and `ChangeDetectionStrategy.OnPush`.

   * Explicit cleanup of subscriptions/timers.

6. **Actionable Error Diagnostics & Smart Recovery**:

   * Never display cryptic, unhelpful error strings like `"Parsing failed"`.

   * Pinpoint exact `Line X · Column Y`, provide code snippets, human explanations, and 1-click cursor jump / smart repair where applicable.

7. **Contextual Empty States & Sample Data**:

   * Every input pane and inspector tab must provide guided empty states with 1-click sample pills/buttons so users never face a blank, confusing canvas.

8. **Asynchronous Non-Blocking Execution**:

   * Large payloads (>2MB) must process asynchronously via macro-tasks or Web Workers with `⚡ Large payload detected` badges, preventing UI freeze.

9. **Keyboard Shortcuts & Command Palette**:

   * Integrate with platform shortcuts (`Cmd/Ctrl+Enter`, `Cmd/Ctrl+S`, `Cmd/Ctrl+K`, `Cmd/Ctrl+F`, `Esc`).

10. **Secure Scanning Exclusions**:

    * Any file/directory scan must exclude sensitive directories and files using `SecurityUtils` (see [security.md](.agents/rules/security.md)).

11. **Documentation Integrity**:

    * Update and maintain all affected documentation under `docs/Acklet Vault/Acklet/Tools/<tool-name>/` whenever features are added, modified, or planned. Always use relative markdown links.

12. **Verification & Testing**:

    * Always verify that the Angular build passes (`npm run build --prefix client`) without errors before declaring a task complete.

---

# 3. Non-Negotiable Performance & Main-Thread Protection Rules

Every future change touching components, the composer, sync services, storage services, or any event handler MUST comply with these rules. Stop and flag any change that would violate them:

1. **No unthrottled high-frequency listeners**:

   * Any `@HostListener`, `socket.on()`, `.subscribe()`, input event, `mousemove`, `scroll`, or `ResizeObserver` callback that can fire more than ~5 times/second MUST be throttled/debounced before it touches a signal, IndexedDB, or triggers change detection.

2. **No synchronous heavy work on hover, focus, or passive UI events**:

   * Hover, focus, and mouseenter/leave events must ONLY toggle simple boolean/UI state. Never trigger: file reads, IndexedDB queries, serialization (markdown/JSON), sync broadcasts, or re-computation of derived signals. Required hover data must be precomputed/cached.

3. **No raw/large payloads stored directly in reactive signals**:

   * Any file, image, folder, or payload over ~50–100KB must be staged as lightweight metadata (name, size, type, thumbnail ref) in signals. Full content is loaded on-demand only when rendered or opened — never held in the reactive graph by default.

4. **Every socket/subscription must have a matching cleanup**:

   * Any `socket.on()`, `.subscribe()`, or `addEventListener()` added must have a corresponding `.off()` / `.unsubscribe()` / `removeEventListener()` in the component's destroy lifecycle (`ngOnDestroy` / `takeUntilDestroyed`), in the SAME commit.

5. **No signal writes inside a reactive effect that reads what it writes**:

   * Check every `effect()` for circular dependencies: writing signal X while reading signal X (directly or via a called function) is strictly prohibited.

6. **Batch, never loop-and-write**:

   * Processing multiple items (files, sync packets, history entries) must build the full result first, then write to the signal ONCE. Never call `.set()` / `.update()` inside a `.forEach()`/loop over incoming items.

7. **Deduplicate anything that can echo**:

   * Any P2P, WebSocket, or BroadcastChannel message must be checked against a processed-ID set before being applied.

8. **Performance Observer check required for sign-off**:

   * Before marking composer/sync/storage features 'done,' verify zero long tasks (>50ms) logged by the `PerformanceObserver` during typing, hover, drag-drop, and multi-device sync simulation.

9. **Ask before implementing risky patterns**:

   * If an agent is unsure whether a new event handler, computed signal, or lifecycle hook could cause main-thread latency, explicitly propose the safe pattern first.

---

# 4. Context-First Development Workflow

Before implementation, the agent MUST identify the smallest relevant part of the repository.

Use:

```text
.agents/workflows/context.md
```

to determine:

* relevant tool
* relevant subsystem
* relevant component
* relevant service
* relevant storage
* relevant API
* relevant documentation

Do not scan unrelated parts of the repository.

If the context map is incomplete or stale:

1. inspect the relevant code
2. determine the correct architecture
3. update the context map
4. continue implementation

---

# 5. Fast Workflow

`/fast` means:

> reduce unnecessary exploration, not reduce correctness.

Fast mode MUST:

* read `AGENTS.md`
* load applicable rules
* load applicable workflows
* use `context.md`
* identify relevant files
* inspect required callers
* implement the smallest correct change
* run required verification

Fast mode MUST NOT:

* skip rules
* skip security requirements
* skip necessary caller analysis
* skip verification
* knowingly reduce correctness
* scan the entire repository unnecessarily

---

# 6. Research Workflow

Use `/research` for tasks where implementation depends on understanding:

* existing architecture
* unknown code paths
* external libraries
* technical alternatives
* existing behavior
* root causes
* architectural trade-offs

Research should be targeted.

Do not perform repository-wide research when the relevant subsystem is already known.

---

# 7. Goal Workflow

Use `/goal` to convert the user's request into a concrete engineering objective.

The goal should identify:

```text
Problem
Expected Behavior
Constraints
Affected Area
Acceptance Criteria
```

Do not expand the scope unnecessarily.

---

# 8. Implementation Workflow

Use `/implement` when the goal and context are sufficiently understood.

Before implementation:

```text
Understand
    ↓
Locate
    ↓
Trace
    ↓
Check Existing Solution
    ↓
Choose Minimum Change
    ↓
Implement
```

Follow the Ponytail ladder before introducing new code.

---

# 9. Verification Workflow

Use `/verify` after implementation.

Verification should include the checks relevant to the change.

At minimum, for Angular changes:

```bash
npm run build --prefix client
```

For backend changes, run the relevant Maven build/test command.

For performance-sensitive changes, follow the Performance Observer requirements above.

Do not claim verification was successful unless the relevant checks were actually executed.

---

# 10. Documentation Update Workflow

Use `/update` after meaningful implementation changes.

Documentation updates are impact-based.

Do NOT blindly modify every Markdown file.

Determine whether the implementation changed:

* architecture
* feature behavior
* file responsibilities
* data flow
* APIs
* security behavior
* UI behavior
* performance behavior
* configuration
* workflows
* known limitations
* project navigation

Update only the affected documentation.

---

# 11. Documentation Synchronization

Documentation is part of the implementation lifecycle.

After a meaningful change:

```text
Implementation
    ↓
Documentation Impact Check
    ↓
Update Affected Docs
    ↓
Update Context if Navigation Changed
```

### Tool documentation

Affected tool documentation belongs under:

```text
docs/Acklet Vault/Acklet/Tools/<tool-name>/
```

### Root catalog

When a tool is added or materially changed:

```text
docs/Acklet Vault/Acklet/Tools/README.md
```

must be evaluated and updated when necessary.

### Architecture

Architecture documentation under:

```text
docs/Acklet Vault/Acklet/Architecture/
```

must be updated when platform architecture or subsystem relationships change.

### Agent context

Update:

```text
.agents/workflows/context.md
```

when important navigation, file ownership, subsystem relationships, or architecture changes.

---

# 12. Agent Configuration Maintenance

The `.agents/` system itself is part of the project.

When a change modifies how the agent should operate:

### Permanent constraint changed

Update:

```text
.agents/rules/
```

### Development process changed

Update:

```text
.agents/workflows/
```

### Project navigation changed

Update:

```text
.agents/workflows/context.md
```

### Fast exploration strategy changed

Update:

```text
.agents/workflows/fast.md
```

Do not place workflow-specific instructions into permanent rule files unless they are genuinely permanent project constraints.

---

# 13. Bug-Fix Discipline

For every bug:

```text
Reproduce / Understand
        ↓
Trace Actual Flow
        ↓
Find Root Cause
        ↓
Find All Callers
        ↓
Fix Shared Cause
        ↓
Verify All Affected Flows
```

Never solve a shared bug by adding multiple caller-specific patches when the underlying shared function can be corrected.

---

# 14. Source of Truth

When information conflicts, use this order:

```text
1. Current Code
2. Current User Requirement
3. Current Agent Rules
4. Current Agent Workflows
5. Project Documentation
6. Context Map
7. Previous Assumptions / Memory
```

Do not blindly trust stale documentation.

If code and documentation disagree:

1. inspect the actual behavior
2. determine the intended behavior
3. implement according to the current requirement
4. update stale documentation when appropriate

---

# 15. Final Development Checklist

Before starting:

```text
[ ] AGENTS.md read
[ ] Applicable rules read
[ ] Applicable workflows read
[ ] User request understood
[ ] Correct workflow identified
[ ] Relevant context identified
[ ] Relevant subsystem identified
[ ] Relevant files identified
```

Before completion:

```text
[ ] Root cause addressed where applicable
[ ] Existing code reused where possible
[ ] Minimum implementation used
[ ] All relevant callers considered
[ ] Security rules respected
[ ] UI rules respected
[ ] Performance rules respected
[ ] Required build/test verification executed
[ ] Documentation impact checked
[ ] Affected documentation updated
[ ] Context updated if required
```

---
---
trigger: always_on
---

# Acklet UI Foundation Architecture

## Overview

Acklet is built on a clean, scalable component architecture designed to support a multi-tool platform where **every tool can have its own distinct UI, UX, visual identity, interaction model, and overall feel**.

Acklet provides a consistent **platform-level foundation**, but it does **not** impose one global UI design on every tool.

The architecture follows this principle:

> **Acklet provides the platform identity. Each tool owns its product experience.**

A JSON Formatter should not necessarily look or behave like a JWT Decoder, API Tester, Image Utility, Calculator, or AI tool.

Each tool should be optimized for its own user workflow.

---

# 1. Platform UI vs Tool UI

Acklet UI is divided into two distinct layers.

```text
                    ACKLET PLATFORM
                         │
              ┌──────────┴──────────┐
              │                     │
       Platform UI             Tool UI
              │                     │
       Shared globally       Owned by each tool
              │                     │
     Navigation / Shell      Layout / UX / Styling
     Theme infrastructure    Interactions / Components
     Global accessibility    Tool-specific states
     Global notifications    Tool-specific animations
     Platform primitives     Tool-specific visual identity
```

## Platform UI

Platform-level UI may be shared across Acklet.

Examples:

* Application shell
* Navigation
* Sidebar
* Header
* User/account controls
* Global search
* Global command interface
* Platform-level notifications
* Global theme switching
* Platform-level accessibility infrastructure
* Shared layout primitives
* Global loading infrastructure where appropriate

These should maintain a consistent Acklet identity.

---

# 2. Tool-Specific UI

Every Acklet tool owns its own UI and UX.

Examples:

```text
JSON Formatter
    ├── JSON editor
    ├── formatting controls
    ├── validation UI
    ├── error visualization
    ├── result presentation
    └── tool-specific interactions

JWT Decoder
    ├── token input
    ├── token visualization
    ├── claims presentation
    ├── expiration indicators
    └── security-related UX

API Tester
    ├── request builder
    ├── request/response panels
    ├── headers
    ├── authentication
    ├── response viewer
    └── request history
```

These experiences should **not be forced into one universal tool template**.

Each tool should be designed according to:

* Its user
* Its workflow
* Its information density
* Its interaction model
* Its task complexity
* Its expected behavior
* Its domain
* Its performance requirements

---

# 3. Tool UI Must Remain Local

Tool-specific UI should be implemented and maintained inside the tool itself.

For example:

```text
client/
└── tools/
    ├── json-formatter/
    │   ├── components/
    │   ├── pages/
    │   ├── styles/
    │   ├── ui/
    │   └── ...
    │
    ├── jwt-decoder/
    │   ├── components/
    │   ├── pages/
    │   ├── styles/
    │   ├── ui/
    │   └── ...
    │
    ├── api-tester/
    │   ├── components/
    │   ├── pages/
    │   ├── styles/
    │   ├── ui/
    │   └── ...
```

A component created specifically for `json-formatter` should remain inside `json-formatter` unless there is a genuine, proven cross-tool requirement.

Do NOT move a tool-specific component into a global/shared directory merely because it looks reusable.

---

# 4. No Forced Global Tool Design System

Acklet must NOT create a single global tool UI containing things such as:

```text
GlobalToolCard
GlobalToolEditor
GlobalToolToolbar
GlobalToolPanel
GlobalToolResult
GlobalToolLayout
GlobalToolInput
GlobalToolOutput
```

and force every tool to use them.

This creates visual sameness and makes every tool feel like a template.

Instead:

```text
Acklet Platform UI
        ↓
Tool-specific experience
        ↓
Tool-specific components
        ↓
Tool-specific styling
```

Each tool is allowed to establish its own internal design language.

---

# 5. Tool Signature UI

Every tool should have a recognizable **signature UI**.

The signature may come from:

* Layout
* Typography
* Editor behavior
* Information hierarchy
* Component composition
* Interaction patterns
* Toolbars
* Panels
* Data visualization
* Animations
* Micro-interactions
* Color accents
* Density
* Keyboard workflow

The signature must be intentional and relevant to the tool.

Example:

### JSON Formatter

Could feel:

> Dense, editor-focused, developer-oriented, keyboard-friendly.

### API Tester

Could feel:

> Workspace-oriented, panel-based, highly interactive.

### Calculator

Could feel:

> Fast, tactile, minimal and interaction-focused.

### AI Tool

Could feel:

> Conversational, contextual and result-oriented.

They can all belong to Acklet without looking identical.

---

# 6. Tool-Specific Styling

Tool-specific styling must remain scoped to that tool.

Prefer:

```text
tools/
└── json-formatter/
    ├── components/
    ├── styles/
    └── json-formatter.component.*
```

rather than adding tool-specific styles to global files.

Do not pollute global styles with:

* JSON Formatter-specific classes
* API Tester-specific colors
* JWT-specific layouts
* Tool-specific animations
* Tool-specific spacing
* Tool-specific typography
* Tool-specific component variants

Global styling should remain platform-level.

---

# 7. Design Tokens

Acklet may provide global foundational tokens for:

* Theme
* Base typography
* Accessibility
* Platform surfaces
* Brand identity
* Global spacing primitives where appropriate

However, tools may define **scoped tool-specific tokens**.

Example:

```css
.json-formatter {
  --tool-editor-surface: ...;
  --tool-editor-border: ...;
  --tool-error-surface: ...;
  --tool-highlight: ...;
}
```

These tokens belong exclusively to the JSON Formatter.

Another tool may define completely different scoped tokens.

Do not convert every tool-specific value into a global token.

---

# 8. Dual-Theme Architecture

Acklet supports Light and Dark themes.

The global theme system provides the foundation for theme switching.

However, each tool must ensure that its own UI works correctly in both themes.

Global theme:

```text
Light / Dark
       ↓
Platform theme variables
       ↓
Tool-specific scoped variables
       ↓
Tool UI
```

Tool-specific components may define their own Light/Dark values while remaining compatible with Acklet's global theme mechanism.

Never hardcode colors that cause unreadable or broken UI in either theme.

---

# 9. Component Selection Hierarchy

The component hierarchy applies to **tool implementation**, but component ownership remains local.

```text
Existing Tool-Specific Component
            ↓
Acklet Shared Primitive
            ↓
Spartan UI (@spartan-ng/brain)
            ↓
Angular CDK (@angular/cdk)
            ↓
Tailwind CSS v4
            ↓
Lucide Icons
            ↓
Taiga UI
```

Use shared components only when the behavior is genuinely shared.

A tool-specific component should not become global simply because it uses the same underlying primitive.

---

# 10. Acklet Shared Primitives

Shared Acklet primitives should provide **infrastructure**, not dictate the complete design of every tool.

Good shared primitives:

* Button behavior
* Dialog behavior
* Tooltip behavior
* Focus management
* Accessible primitives
* Theme infrastructure
* Icon integration
* Platform navigation
* Global notifications

Bad candidates for forced global reuse:

* Complete tool editors
* Tool-specific result panels
* Tool-specific toolbars
* Tool-specific layouts
* Tool-specific cards
* Tool-specific visualizations
* Tool-specific workflows

The rule is:

> **Share primitives, not entire experiences.**

---

# 11. Tool Isolation

Each tool should be independently maintainable.

A change inside:

```text
tools/json-formatter/
```

should not unexpectedly change:

```text
tools/jwt-decoder/
tools/api-tester/
tools/calculator/
```

Avoid global CSS selectors that unintentionally affect multiple tools.

Prefer scoped styles and tool-level components.

Tool-specific dependencies should also remain local whenever practical.

---

# 12. Existing Tool UI Must Be Respected

When working on an existing tool:

1. Inspect its current UI.
2. Understand its existing visual language.
3. Preserve intentional design decisions.
4. Improve only where the task requires it.
5. Do not normalize it into another tool's design.

A new tool does not need to inherit another tool's UI merely because both belong to Acklet.

---

# 13. Tool-to-Tool Consistency

Consistency should exist at the **platform level**, not necessarily at the visual implementation level.

Users should recognize:

> "I am inside Acklet."

But they should also recognize:

> "This is the JSON Formatter."

Therefore:

```text
Platform consistency
        +
Tool individuality
        =
Acklet ecosystem
```

Do not confuse consistency with sameness.

---

# 14. Reusability Rule

Before extracting a tool-specific component into shared code, ask:

1. Is the behavior genuinely identical?
2. Is the UX genuinely identical?
3. Will multiple tools need the same component?
4. Will future changes need to happen together?
5. Does extraction reduce complexity rather than increase it?

If the answer is unclear, keep the component local.

**Local ownership is preferred over premature abstraction.**

---

| Package             | Role                                        | Status                |
| ------------------- | ------------------------------------------- | --------------------- |
| `@spartan-ng/brain` | Headless accessible Angular primitives      | Installed (`^1.3.1`)  |
| `@angular/cdk`      | Focus, overlays, keyboard and accessibility | Installed (`^22.1.2`) |
| `devicon`           | Programming language & tech stack icons     | Installed (`^2.16.0`) |
| `@lucide/angular`   | Icon system                                 | Installed (`^1.23.0`) |
| `@tailwindcss/vite` | Tailwind CSS v4                             | Installed (`^4.3.2`)  |
| `@taiga-ui/core`    | Secondary component fallback                | Installed (`^5.20.0`) |
| `@taiga-ui/kit`     | Secondary component fallback                | Installed (`^5.20.0`) |
| `@taiga-ui/cdk`     | Secondary primitives                        | Installed (`^5.20.0`) |

---

# 16. Installation Location

All shared UI dependencies must be installed inside:

```text
client/
```

Package manifest:

```text
client/package.json
```

Do not install frontend dependencies at the repository root unless the architecture explicitly requires it.

---

# 17. Golden Rule

Acklet should provide a recognizable platform identity without forcing every tool to look identical.

The architecture must support:

```text
                    ACKLET
                      │
            Platform Identity
                      │
          ┌───────────┼───────────┐
          │           │           │
       Tool A      Tool B      Tool C
          │           │           │
      Unique UI   Unique UI   Unique UI
      Unique UX   Unique UX   Unique UX
      Unique feel Unique feel Unique feel
          │           │           │
          └───────────┼───────────┘
                      │
             Shared Foundation
```

The final principle is:

> **Acklet should feel like one ecosystem, not one template.**

Every tool should be able to develop its own signature experience while remaining technically compatible with the Acklet platform.

**Platform UI is shared. Tool experience is owned locally.**

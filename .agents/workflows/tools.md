---
description: Tools
---

# Antigravity Task Execution Loop

Before doing anything else, read `AGENT.md` fully.

Then read `uireference.md` whenever the task involves UI, UX, components, styling, layout, interaction, or a new tool.

Also inspect relevant documentation under:

```text
docs/Acklet Vault/Acklet
```

These instructions are mandatory.

Follow the exact 6-step loop below for every task.

**Do not skip, reorder, merge, or silently bypass a step.**

If I provide feedback after Step 6, return to Step 1 and reassess the updated requirement. Never blindly patch the previous implementation.

---

# STEP 1 — Requirements & Clarifications

Before touching code:

### Understand

* Restate the task in your own words.
* Identify the actual user problem being solved.
* Define the expected outcome.
* Identify scope and out-of-scope areas.
* Identify assumptions.
* Identify important edge cases.
* Identify relevant UI, UX, responsive, accessibility, and theme considerations.

### Clarify

Ask 2–3 meaningful questions when clarification is genuinely required.

Questions should focus on things that materially affect:

* Product behavior
* Scope
* Architecture
* Data
* APIs
* Security
* UX direction
* Business logic

Do not ask unnecessary questions about minor implementation details.

### Hard Stop

For tasks requiring clarification:

**Wait for explicit user confirmation before proceeding.**

Do not write code before confirmation.

---

# STEP 2 — Codebase Inspection & UI Alignment

After requirements are confirmed:

### Codebase

Search the existing codebase for:

* Reusable components
* Shared UI primitives
* Utility functions
* Services
* Pipes/directives
* State management
* API patterns
* Existing tool implementations
* Similar workflows
* Existing error/loading/empty states
* Existing responsive patterns

Do not create something that already exists.

Prefer:

```text
Existing component
→ Extend
→ Reuse
→ Generalize if justified
→ Create new only when necessary
```

### Design System

Read and follow:

```text
UI-REFERENCE.md
```

Check:

* Typography
* Colors
* Spacing
* Radius
* Shadows
* Icons
* Buttons
* Inputs
* Forms
* Navigation
* Dialogs
* Tables
* Responsive patterns
* Accessibility patterns
* Component-library hierarchy

The UI must feel like Acklet.

External references are used for inspiration and proven interaction patterns, not blind copying.

### Research

For a new tool or substantial UX change, research relevant real-world products and implementations.

Identify:

* Common user expectations
* Strong UX patterns
* Weaknesses/friction
* Opportunities for improvement
* Potential Acklet differentiation

### Obsolete Code

Flag:

* Duplicate code
* Obsolete components
* Unused utilities
* Dead code
* Orphaned files

Do not remove unrelated code without confirming it is safe and relevant to the task.

---

# STEP 3 — Execution Plan & Distinctive Feature Pitch

Before coding, present the implementation plan.

Include:

## A. User Flow

Define:

```text
Entry State
→ User Action
→ Processing
→ Result
→ Next Action
→ Error / Recovery
```

Cover important edge cases.

## B. Technical Plan

Describe:

* Components
* Services
* State
* APIs
* Data flow
* Reusable components
* Files expected to change

Keep architecture as simple as possible.

## C. UI/UX Plan

Explain:

* Layout
* Information hierarchy
* Primary action
* Secondary actions
* Empty state
* Loading state
* Error state
* Success state
* Responsive behavior
* Accessibility considerations

Follow `UI-REFERENCE.md`.

## D. Distinctive Feature Pitch

Propose **1–2 meaningful, high-value UX improvements** that could make the tool better than generic alternatives.

Examples:

* Keyboard-first workflow
* Smart defaults
* Local persistence
* Instant validation
* Contextual actions
* Error navigation
* One-click transformation
* Multi-tool data chaining
* Copy → transform → send to another Acklet tool
* History
* Example playground
* Intelligent result explanation

Do not add gimmicks merely to make the UI look unique.

The goal is:

> Better product behavior, not unnecessary decoration.

### Hard Stop

Wait for explicit approval before implementation.

Do not start coding until the plan and proposed distinctive features are approved.

---

# STEP 4 — Implementation

Implement only what was approved.

Rules:

* Follow `AGENT.md`.
* Follow `UI-REFERENCE.md`.
* Follow the existing Acklet architecture.
* Reuse existing components.
* Follow Acklet's design system.
* Maintain responsive behavior.
* Maintain accessibility.
* Keep the implementation strictly in scope.
* Do not introduce unnecessary dependencies.
* Do not perform unrelated refactoring.
* Do not silently change approved behavior.

If implementation reveals a major problem with the approved plan:

**Stop and return to Step 1.**

Do not make major decisions silently.

---

# STEP 5 — Self-Verification, Refactoring & Documentation

After implementation, perform a complete review.

## Code Review

Compare the final implementation against the approved Step 3 plan.

Check:

* Scope
* Architecture
* Component reuse
* Type safety
* Error handling
* Performance
* Accessibility
* Responsive behavior

## Cleanup

Remove implementation-specific:

* Dead code
* Unused imports
* Temporary logic
* Orphaned files
* Duplicate code

Only remove code that is verified safe.

## Ecosystem Verification

Confirm that the implementation did not break:

* Existing functionality
* Shared components
* Navigation
* APIs
* Tool integrations
* Multi-tool workflows
* Cross-tool data flows
* Existing Acklet behavior

## Documentation — REQUIRED

Maintain the project documentation after every meaningful task.

Update the relevant documentation under:

```text
A:\Acklet\docs\Acklet Vault\Acklet
```

Record, where applicable:

* What was implemented
* Why the decision was made
* UX decisions
* Architecture changes
* Components created/reused
* Important technical decisions
* New reusable patterns
* Tool-specific behavior
* Edge cases
* Known limitations
* Future improvements

Do not create unnecessary documentation.

Update the appropriate existing document whenever possible instead of creating duplicates.

The documentation must remain an accurate record of the current Acklet system.

---

# STEP 6 — Completion Report & Innovation Proposal

After verification, provide the final report.

## Summary of Work

Explain:

* What was implemented
* What problem it solves
* Important UX/product decisions

## Exact Files Touched

For every file:

```text
/path/to/file
→ Created / Modified / Removed
→ Reason
```

## Reused Components

List important existing components/utilities reused or extended.

## Research & UX Decisions

Briefly explain:

* What was researched
* What patterns were identified
* What Acklet-specific decision was made
* What distinctive UX choice was implemented

## Compliance Audit

Explicitly state:

* AGENT.md followed
* UI-REFERENCE.md followed
* Six-step loop followed
* Existing design system followed
* Codebase inspected
* Reuse-first policy followed
* Documentation updated
* Verification completed

If anything was intentionally skipped, explain why.

Do not falsely claim compliance.

## Immediate Task Enhancements

Provide 2–3 realistic next improvements for the specific tool.

Focus on:

* UX polish
* Missing edge cases
* Performance
* Accessibility
* Useful functionality

Do not suggest unnecessary features.

## App-Wide Leverage & Ecosystem Ideas

Provide 1–2 high-value ideas derived from the work.

Look for:

* Reusable components
* Shared utilities
* Cross-tool workflows
* Data chaining
* Common tool infrastructure
* Shared history
* Universal keyboard commands
* Tool-to-tool integrations
* Platform-level UX improvements

The ideas should logically follow from the current work, not be generic startup ideas.

---

# FEEDBACK LOOP

If the user provides feedback after Step 6:

**Do not immediately modify the implementation.**

Return to:

```text
STEP 1
Requirements & Clarifications
```

Then:

1. Understand the feedback.
2. Determine what changed.
3. Identify affected assumptions.
4. Inspect the current implementation.
5. Update the plan.
6. Ask clarification if required.
7. Get approval when necessary.
8. Implement the approved change.
9. Re-run verification.
10. Update documentation.
11. Produce a new Step 6 report.

Never:

```text
Feedback
→ Blind patch
→ Done
```

Always:

```text
Feedback
→ Reassess
→ Inspect
→ Plan
→ Approve
→ Implement
→ Verify
→ Document
→ Report
```

---

# FINAL OPERATING RULE

Antigravity must behave as a product engineer, not a code completion engine.

For every task:

```text
Understand deeply
→ Research intelligently
→ Reuse aggressively
→ Design intentionally
→ Implement precisely
→ Verify thoroughly
→ Document accurately
→ Improve the ecosystem
```

The objective is not to produce the most code.

The objective is to produce the **best maintainable Acklet product experience**.

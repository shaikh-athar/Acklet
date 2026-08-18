---
trigger: always_on
---

# AGENT.md — Acklet Development Rules

This file governs how Antigravity or any AI agent must work on Acklet.

**Read this file completely before starting any task.**

Before implementation, also read:

* `UI-REFERENCE.md`
* Any `.agent` / `.agents` instruction files
* Relevant `/docs`
* Existing components and design-system documentation

If instructions genuinely conflict, follow Section 12.

---

# 1. Core Principle

Do not behave like a code generator.

Act as:

* Product Engineer
* UX Researcher
* UI Designer
* Frontend Architect
* QA Engineer
* Code Reviewer

For non-trivial work:

```text
Requirement
→ Understand
→ Inspect
→ Research
→ Evaluate
→ Decide
→ Design
→ Implement
→ Test
→ Review
→ Improve
→ Verify
```

The goal is not merely working code.

The goal is the best practical Acklet product experience.

---

# 2. Requirement Gathering

Before implementation:

1. Understand the actual user goal.
2. Identify scope and expected behavior.
3. Identify important inputs, outputs and edge cases.
4. Inspect existing implementation.
5. Ask questions only when ambiguity materially affects product behavior, architecture, security, data, APIs or scope.

Do NOT ask permission for minor decisions such as:

* Spacing
* Component selection
* Layout
* Responsive behavior
* Loading states
* Error states
* Minor UX improvements

Use engineering and UX judgment for these.

Do not invent major requirements.

---

# 3. UI-REFERENCE.md Is Mandatory

`UI-REFERENCE.md` is required for every UI/UX task.

It defines:

* UI component references
* UX research references
* Design principles
* Component selection
* Interaction patterns
* Visual direction

Before creating UI:

1. Read `UI-REFERENCE.md`.
2. Check existing Acklet components.
3. Follow the component hierarchy defined there.
4. Research relevant products when required.
5. Adapt patterns to Acklet instead of copying them.

External libraries are references/foundations, not Acklet's identity.

---

# 4. Product Philosophy

Acklet is a premium digital workspace for discovering and using online tools.

Every tool should feel:

* Fast
* Clear
* Purpose-built
* Professional
* Intelligent
* Easy to understand
* Consistent with Acklet

Do NOT make Acklet unique through decoration.

Avoid:

* Generic SaaS dashboards
* Excessive gradients
* Glassmorphism everywhere
* Random colors
* Excessive cards
* Decorative animations
* Unnecessary 3D
* Huge hero sections inside tools

Make Acklet unique through:

* Better workflows
* Smart defaults
* Contextual actions
* Keyboard shortcuts
* Better error recovery
* Progressive disclosure
* Tool-specific interactions
* Better information presentation
* Thoughtful mobile UX
* Useful micro-interactions

**Unique because it works better, not because it looks strange.**

---

# 5. Research Requirement

For every new tool or substantial UX feature, research 2–4 relevant products or implementations when practical.

Research:

* User workflow
* Common expectations
* Information hierarchy
* Interaction patterns
* Error handling
* Empty states
* Loading states
* Accessibility
* Mobile behavior
* Competitor weaknesses

Determine:

1. What users already understand.
2. What works well.
3. What creates friction.
4. What should be avoided.
5. Where Acklet can improve.

Do not copy layouts.

Extract the underlying UX principle.

Example:

Bad:

> "Competitor has a button here, so copy it."

Good:

> "The primary action must remain accessible while editing, so use a persistent action area."

Briefly summarize important research findings before implementation.

---

# 6. Uniqueness Requirement

Every substantial tool should have at least one meaningful differentiator based on research.

Possible differentiators:

* Faster workflow
* Smarter defaults
* Better error explanation
* Contextual actions
* Keyboard-first interaction
* Better result visualization
* Progressive disclosure
* Better onboarding
* Better mobile workflow
* Tool-specific automation

Do not manufacture uniqueness with visual gimmicks.

---

# 7. Tool-Specific UX

Do not force every tool into one generic template.

Acklet should share:

* Typography
* Colors
* Spacing
* Icons
* Buttons
* Inputs
* Navigation
* Feedback
* Motion language

But tools may have different:

* Layouts
* Editors
* Panels
* Toolbars
* Result views
* Information architecture
* Interaction models
* Mobile workflows

Design every tool around its actual user journey:

```text
Entry
→ Primary action
→ Processing
→ Result
→ Next action
→ Error / Recovery
```

All important states must be intentionally designed.

---

# 8. Reuse First

Before creating any component, function, service, utility or file:

1. Search the existing codebase.
2. Reuse existing code when possible.
3. Extend related code instead of duplicating it.
4. Only create new code when no suitable solution exists.

Never remove existing functionality without verifying that it is safe.

Before creating UI, inspect existing components and design tokens.

---

# 9. UI Component Strategy

Follow `UI-REFERENCE.md`.

Preferred hierarchy:

```text
Existing Acklet Component
→ Acklet Shared Primitive
→ Spartan UI
→ Angular CDK
→ Taiga UI / PrimeNG
→ Custom Implementation
→ New Dependency
```

### Spartan UI

Primary Angular UI reference/foundation.

https://spartan.ng/

Use for modern accessible primitives and components.

### Angular CDK

Use for:

* Focus
* Keyboard navigation
* Overlays
* Drag/drop
* Accessibility
* Complex interaction behavior

https://material.angular.dev/cdk

### Taiga UI

Use when it provides a better Angular-native solution.

https://taiga-ui.dev/

### PrimeNG

Use as a fallback for specialized or complex components.

https://primeng.org/

Libraries must never dictate Acklet's visual identity.

---

# 10. Design System

Before creating UI, inspect the existing Acklet design system.

Respect:

* Typography
* Colors
* Spacing
* Radius
* Shadows
* Icons
* Buttons
* Inputs
* Dialogs
* Tables
* Navigation
* Responsive behavior

If a tool genuinely requires a different UX pattern, use research to justify it while preserving Acklet's overall visual language.

Do not silently introduce a new design system.

---

# 11. UX Quality Rules

### Intelligent Defaults

Prefer:

* Sensible defaults
* Automatic validation
* Auto-detection
* Example data
* Useful shortcuts
* Contextual actions

Make the core task usable immediately.

### Progressive Disclosure

Show:

```text
Primary actions
→ Secondary actions
→ Advanced options
```

Do not overwhelm users with every feature.

### Empty States

Explain:

1. What the tool does.
2. What the user should do.
3. What happens next.

Where useful, provide an example action.

### Error States

Errors should explain:

* What happened
* Where it happened
* Why it happened
* How to recover

Where possible provide:

* Error location
* Explanation
* Suggested fix
* Recovery action

### Accessibility

Consider:

* Keyboard navigation
* Focus management
* Semantic HTML
* Screen readers
* Labels
* Contrast
* Touch targets
* Reduced motion
* Accessible error announcements

### Responsive UX

Do not merely shrink desktop UI.

Intentionally design:

* Desktop
* Tablet
* Mobile

Determine what should collapse, become tabs/drawers, remain visible or move into overflow menus.

---

# 12. Autonomous Decisions & Instruction Priority

You may decide without asking:

* Layout
* Spacing
* Typography
* Component choice
* Responsive behavior
* Loading/empty/error states
* Micro-interactions
* Accessibility improvements
* Minor refactoring

Ask when a decision materially affects:

* Product scope
* Business logic
* Pricing
* Authentication
* Authorization
* Security
* Database/data model
* External API contracts
* Destructive operations
* Major architecture
* Irreversible decisions

### Priority

```text
1. Current user instruction
2. AGENT.md
3. UI-REFERENCE.md
4. .agent / .agents instructions
5. Existing project conventions
6. Agent defaults
```

If a genuine conflict remains, ask the user.

---

# 13. Implementation Rules

Implement only the confirmed scope.

Maintain:

* Existing architecture
* Type safety
* Separation of concerns
* Accessibility
* Performance
* Reusability
* Maintainability

Avoid:

* Duplicate code
* Unnecessary abstractions
* Unnecessary dependencies
* Giant components
* Magic values
* Unrelated refactoring
* Premature optimization

If an unrelated issue is discovered, record it instead of expanding scope.

---

# 14. Self-Review

After implementation, review as:

### Product Designer

Does this actually solve the user's problem?

### UX Researcher

Would the intended user understand the workflow?

### Visual Designer

Does this feel like Acklet rather than generic AI-generated SaaS?

### Engineer

Is the implementation unnecessarily complex?

### Accessibility Specialist

Can it be used without a mouse?

### Mobile Designer

Does the workflow make sense on small screens?

Fix problems discovered during review.

---

# 15. Verification

Never declare "Done" merely because code was written.

Where applicable:

* Build
* Tests
* Type check
* Lint
* Run application
* Test important interactions
* Inspect affected UI
* Test responsive behavior
* Test loading/empty/error/success states
* Review the final diff

Also check:

* Unused imports
* Dead code
* Orphaned files
* Duplicate logic
* Broken reused components

Never claim something was tested if it was not actually tested.

---

# 16. Reporting

Every completed task must report:

## What was done

Concrete summary.

## Files touched

Created / modified / removed files with reasons.

## Reused components

What was reused or extended and why.

## Research

Products/references reviewed and important findings.

## UX decisions

Important UX decisions and reasoning.

## Rules followed / skipped

Mention relevant AGENT.md and `UI-REFERENCE.md` rules.

If something was skipped, explain why.

## Suggestions & Improvements

### Task-level

* Future enhancements
* Out-of-scope edge cases
* Technical debt
* UX improvements

### Application-level

Provide 1–3 meaningful ideas logically connected to the completed work:

* Reusable components
* Cross-tool features
* Platform improvements
* New tool opportunities
* Ways to differentiate Acklet

Do not provide generic unrelated ideas.

---

# 17. Final Principle

Acklet should not feel like a collection of AI-generated pages.

It should feel like one intelligent product.

The experience should be:

```text
Familiar enough to understand
+
Different enough to remember
+
Fast enough to enjoy
+
Simple enough to trust
+
Powerful enough to return to
```

Your responsibility is not merely to implement the user's words.

Your responsibility is to transform the requirement into the **best practical Acklet experience**, while respecting:

* Existing architecture
* Existing design system
* `UI-REFERENCE.md`
* Product constraints
* Accessibility
* Performance
* Maintainability
* User intent

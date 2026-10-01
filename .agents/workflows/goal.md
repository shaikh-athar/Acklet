---
description: Converts a requirement into a clear, bounded, and verifiable engineering goal with scope, constraints, acceptance criteria, preservation requirements, and completion conditions.
---

````md
# Goal Workflow

## Purpose

`/goal` converts the user's requirement into a clear, bounded, and verifiable engineering goal.

The goal must define exactly:

- what needs to be achieved
- what behavior should change
- what behavior must remain unchanged
- what constraints apply
- how completion will be verified

A goal is not complete until its acceptance criteria can be objectively verified.

---

# 1. Mandatory Startup

Before defining the goal:

```text
AGENTS.md
    ↓
Applicable Rules
    ↓
Applicable Workflows
    ↓
Goal
````

Never skip the mandatory `AGENTS.md` initialization.

If `/research` has already been performed, use its findings instead of repeating unnecessary investigation.

---

# 2. Understand the User Requirement

Extract the actual requirement without changing its meaning.

Identify:

```text
Problem
Current Behavior
Requested Behavior
Expected Outcome
Constraints
Affected Area
```

Separate:

```text
Explicit Requirement
Existing Behavior
Assumption
Unknown
```

Do not invent requirements.

If something essential is unclear, mark it as an unknown instead of silently deciding.

---

# 3. Define the Goal

Convert the request into one clear engineering objective.

The goal should answer:

> What must be true when this task is finished?

Prefer:

```text
Implement <specific behavior>
while preserving <existing behavior>
under <constraints>
and verify it through <acceptance criteria>.
```

Avoid vague goals such as:

```text
Improve performance.
Make sync better.
Fix the UI.
Improve architecture.
```

Instead define measurable behavior.

Example:

```text
Prevent full clipboard payloads from loading during initial render.
Load the payload only when the user opens the resource.
Preserve existing clipboard history and sync behavior.
```

---

# 4. Preserve Existing Functionality

Every goal MUST explicitly identify what must continue working.

Before implementation determine:

```text
Existing Functionality
        ↓
Requested Change
        ↓
Behavior That Must Remain
```

Default rule:

> A new requirement must not break existing functionality unless the user explicitly requires that behavior to change.

If existing behavior is intentionally replaced, state it explicitly:

```text
Previous:
<old behavior>

New:
<requested behavior>

Intentional change:
YES
```

---

# 5. Define Scope

Clearly separate:

```text
IN SCOPE
OUT OF SCOPE
FUTURE / OPTIONAL
```

Do not allow implementation scope to grow automatically.

Example:

```text
In Scope:
- Add lazy loading for resources.
- Show loading state.
- Preserve existing metadata.

Out of Scope:
- Redesign storage architecture.
- Replace IndexedDB.
- Introduce a new backend.

Future:
- Server-side encrypted recovery.
```

This prevents unnecessary implementation and follows the Ponytail/YAGNI principle.

---

# 6. Acceptance Criteria

Every important requirement must become an acceptance criterion.

Use testable statements:

```text
[ ] New behavior works.
[ ] Existing behavior still works.
[ ] Relevant error case is handled.
[ ] Relevant performance requirement is satisfied.
[ ] Security/privacy requirement is satisfied.
[ ] Required documentation is updated.
```

Avoid criteria such as:

```text
[ ] Code is good.
[ ] Performance is better.
[ ] Architecture is clean.
```

Make criteria observable.

Example:

```text
[ ] Initial render does not load full resource payloads.
[ ] Opening a resource loads its payload successfully.
[ ] Refreshing the browser preserves the resource.
[ ] Existing sync behavior remains functional.
```

---

# 7. Verification Conditions

Every acceptance criterion must have a way to verify it.

Use:

```text
Requirement
    ↓
Verification Method
    ↓
Expected Result
```

Example:

```text
Requirement:
Resource must load lazily.

Verification:
Open the clipboard without opening the resource.

Expected:
Full payload is not loaded.

Verification:
Open the resource.

Expected:
Payload loads successfully.
```

If the requirement cannot currently be verified, identify what verification mechanism is needed.

---

# 8. Research Alignment

When `/research` has already been used, incorporate its findings.

Check:

```text
Research Finding
        ↓
Goal
        ↓
Implementation Scope
```

The goal should remain aligned with:

* existing architecture
* established standards
* reusable components
* security requirements
* performance requirements
* dependency decisions
* identified risks

Do not introduce new requirements merely because research discovered optional possibilities.

---

# 9. Goal Completion Boundary

The goal must have a clear stopping point.

Implementation is complete when:

```text
All Required Behavior
        +
All Acceptance Criteria
        +
Existing Functionality Preserved
        +
Required Verification Passed
```

Do not continue implementing optional improvements after the goal has been satisfied unless they are explicitly requested or separately scoped.

---

# 10. Handoff to Implementation

Once the goal is clear:

```text
/goal
    ↓
/context
    ↓
/implement
```

`/implement` should use the goal as its implementation contract.

The implementation should not reinterpret the goal unless new evidence requires clarification.

If implementation discovers that the goal is technically incorrect or incomplete:

```text
Implementation Finding
        ↓
Re-evaluate Goal
        ↓
Update Goal
        ↓
Continue Implementation
```

Do not silently change the intended behavior.

---

# 11. Handoff to Verification

After implementation:

```text
/implement
    ↓
/verify
```

`/verify` must verify the acceptance criteria defined here.

The agent should be able to answer:

```text
Criterion
    ↓
How was it verified?
    ↓
PASS / FAIL
```

If an acceptance criterion fails, the goal is not complete.

---

# 12. Documentation Impact

After successful implementation and verification:

```text
/verify
    ↓
/update
    ↓
/docs
```

Documentation should be updated when the completed goal changes:

* feature behavior
* architecture
* data flow
* API behavior
* file responsibilities
* UI behavior
* configuration
* security behavior
* performance behavior
* project navigation

Do not update unrelated documentation.

---

# 13. Goal Output Format

Use this structure:

```text
## Goal

### Objective
<single clear objective>

### Problem
<current problem>

### Current Behavior
<what currently happens>

### Required Behavior
<what must happen after implementation>

### Must Preserve
- <existing behavior>
- <existing behavior>

### In Scope
- <item>
- <item>

### Out of Scope
- <item>
- <item>

### Future / Optional
- <item>

### Constraints
- <constraint>
- <constraint>

### Acceptance Criteria
- [ ] <testable requirement>
- [ ] <testable requirement>
- [ ] <testable requirement>

### Verification Conditions
- [ ] <how criterion is verified>
- [ ] <how criterion is verified>

### Implementation Handoff
Use `/context` → `/implement`.

### Completion Condition
The goal is complete only when all required acceptance criteria pass verification.
```

---

# Final Rule

The goal is the contract between the user's requirement and the implementation.

It must be:

```text
Clear
Bounded
Testable
Preserve Existing Behavior
Aligned With Research
```

Do not make the goal larger than the requirement.

Do not make the requirement smaller than what the user actually asked for.

# END OF GOAL WORKFLOW

```
```

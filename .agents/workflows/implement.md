---
description: Guides implementation from an approved goal using existing code, minimal changes, YAGNI, reuse, root-cause fixes, performance and security rules, followed by mandatory verification.
---

````md
# Implement Workflow

## Purpose

`/implement` is the execution workflow for turning an approved goal into the smallest correct production-ready change.

Implementation must be based on:

```text
AGENTS.md
    ↓
Applicable Rules
    ↓
Applicable Workflows
    ↓
/research
    ↓
/goal
    ↓
/context
    ↓
Implementation
    ↓
/verify
    ↓
/update
    ↓
/docs
````

`/implement` is not a discovery-first workflow. Research and goal definition should already establish what needs to be built. Implementation may perform additional targeted research when new technical evidence is discovered.

---

# 1. Mandatory Startup

Before implementation:

```text
AGENTS.md
    ↓
Applicable Rules
    ↓
Applicable Workflows
    ↓
Research Result
    ↓
Goal
    ↓
Context
```

Never skip `AGENTS.md`.

Never skip applicable rules because the implementation appears small.

Never treat `/fast` as permission to bypass mandatory rules, security, verification, or required acceptance criteria.

---

# 2. Validate Implementation Readiness

Before changing code, confirm:

```text
Goal exists
Research is sufficient
Relevant context is known
Affected files are identified
Acceptance criteria are understood
Existing behavior to preserve is known
```

Expected state:

```text
Implementation Ready
```

If essential information is missing, perform the smallest targeted investigation required.

Do not begin speculative implementation.

---

# 3. Reconfirm the Actual Goal

Read the goal and identify:

```text
Objective
Required Behavior
Must Preserve
In Scope
Out of Scope
Constraints
Acceptance Criteria
Verification Conditions
```

The goal is the implementation contract.

Do not silently expand the scope.

Do not remove requirements simply because implementation is inconvenient.

---

# 4. Context-First Code Navigation

Use `.agents/workflows/context.md` to navigate the repository.

Follow:

```text
Goal
  ↓
Feature
  ↓
Subsystem
  ↓
Entry Point
  ↓
Existing Implementation
  ↓
Relevant Callers
  ↓
Dependencies
```

Inspect the smallest useful set of files.

Do not scan the entire repository without a reason.

If context information is stale:

```text
Inspect actual code
    ↓
Continue implementation
    ↓
Update context if navigation/ownership changed
```

Code is the source of truth.

---

# 5. Existing Implementation First

Before writing new code, verify whether the required behavior already exists partially or completely.

Check:

```text
Existing Component
Existing Service
Existing Utility
Existing Helper
Existing Pattern
Existing State/Signal
Existing API
Existing Storage Logic
Existing Shared Primitive
Existing Dependency
```

Prefer:

```text
Reuse
    >
Extend
    >
Refactor
    >
Create New
```

Do not duplicate existing logic.

If a shared function is responsible for the behavior, fix or extend the shared function rather than patching every caller individually.

---

# 6. Follow the Ponytail / YAGNI Ladder

Before adding implementation:

```text
1. Does this need to be built at all?
2. Does it already exist in this codebase?
3. Does the browser/platform already provide it?
4. Does an installed dependency already solve it?
5. Can the existing implementation be extended?
6. Can this be implemented with a small local change?
7. Only then create new code.
```

Prefer the smallest solution that satisfies the goal.

Do not introduce:

* unnecessary abstractions
* unnecessary services
* unnecessary components
* unnecessary libraries
* unnecessary state
* unnecessary configuration
* unnecessary architectural changes

---

# 7. Standard vs Current Implementation

Before changing an existing approach, establish:

```text
Current Implementation
        ↓
Required Behavior
        ↓
Standard / Recommended Approach
        ↓
Gap
        ↓
Smallest Correct Change
```

Do not replace an existing implementation simply because another pattern is newer or more sophisticated.

Change architecture only when evidence shows that the current approach cannot correctly satisfy the goal.

---

# 8. Dependency Decision

If implementation appears to require a new dependency:

```text
Existing Code
    ↓
Browser / Platform API
    ↓
Installed Dependency
    ↓
Small Local Implementation
    ↓
New Dependency
```

A new dependency requires a concrete reason.

Evaluate:

* necessity
* project compatibility
* maintenance
* license
* security
* bundle/runtime cost
* complexity
* long-term ownership

Do not add a dependency for functionality that can reasonably be implemented with existing capabilities.

---

# 9. Implementation Principles

Follow all applicable rules from `.agents/rules/`.

Especially:

### Angular

* Standalone components only.
* Use Signals appropriately.
* Use `OnPush`.
* Use explicit lifecycle cleanup.
* Prefer existing components and primitives.
* Keep tool-specific behavior inside the tool.

### Performance

* No unthrottled high-frequency listeners.
* No heavy work during hover/focus/passive events.
* No large payloads in Signals.
* Use metadata-first handling for large resources.
* Use Web Workers for applicable large operations.
* Batch signal/state updates.
* Prevent duplicate sync/event processing.
* Clean up subscriptions, sockets, listeners, and observers.

### Privacy

For client-side tools:

```text
User Payload
    ↓
Browser
    ↓
Local Processing
```

Do not send payloads, files, code, or tokens to the backend unless explicitly required.

### UI

* Preserve dual-theme behavior.
* Use design tokens.
* Keep tool-specific UX isolated.
* Follow UI-FOUNDATION.md.
* Preserve accessibility and keyboard behavior.
* Keep actionable diagnostics.

### Security

Follow `security.md`.

Use existing security utilities and exclusions where applicable.

---

# 10. Root Cause First

For bug fixes:

```text
Symptom
    ↓
Trace Execution
    ↓
Find Root Cause
    ↓
Identify Shared Cause
    ↓
Fix Correct Layer
    ↓
Verify All Relevant Callers
```

Do not apply superficial patches merely to hide the symptom.

If multiple callers use the same faulty logic, prefer fixing the shared implementation once.

---

# 11. Incremental Implementation

Prefer small, understandable changes.

Implementation sequence:

```text
Existing Code
    ↓
Minimal Change
    ↓
Compile / Type Check
    ↓
Inspect Result
    ↓
Continue
```

Avoid combining unrelated refactors with the requested change.

If an unrelated issue is discovered:

```text
Do not silently expand scope.
Record it separately unless it blocks the goal.
```

---

# 12. Preserve Existing Behavior

While implementing, continuously check:

```text
Requested Behavior
+
Existing Behavior
```

The new implementation must not accidentally remove:

* existing features
* existing keyboard shortcuts
* existing UI behavior
* existing storage behavior
* existing sync behavior
* existing API compatibility
* existing supported formats
* existing error handling
* existing theme behavior

Unless the goal explicitly requires the behavior to change.

---

# 13. Safe Commands

The agent is allowed to run safe development commands without asking the user.

Examples:

```bash
npm run build --prefix client
```

```bash
./mvnw clean compile -DskipTests
```

Use additional safe commands when required for implementation or verification.

Destructive operations require appropriate caution.

Never delete, overwrite, reset, migrate, or destroy user data merely to make implementation easier.

---

# 14. Fast Mode

When `/fast` is used:

```text
Fast
≠
Skip Research
≠
Skip Rules
≠
Skip Verification
```

Fast mode means:

```text
Less unnecessary exploration
+
Reuse existing knowledge
+
Targeted file inspection
+
Minimal implementation
+
Required verification
```

Do not use fast mode to justify:

* skipping `AGENTS.md`
* skipping security checks
* skipping root-cause analysis
* skipping acceptance criteria
* skipping build verification
* skipping required documentation
* introducing unverified changes

---

# 15. Implementation Validation Before Handoff

Before declaring implementation complete, check:

```text
[ ] Goal requirements implemented
[ ] Existing functionality preserved
[ ] No unnecessary files created
[ ] No duplicate implementation
[ ] No unnecessary dependency added
[ ] Relevant callers considered
[ ] Performance rules respected
[ ] Security/privacy rules respected
[ ] Cleanup implemented
[ ] Error handling implemented
[ ] Theme/UI requirements preserved
[ ] Acceptance criteria are ready for verification
```

Do not call the task complete yet.

Implementation completion means:

```text
Code Changed
+
Implementation Checks Passed
```

Final completion requires verification.

---

# 16. Mandatory Verification Handoff

After implementation:

```text
/implement
    ↓
/verify
```

Do not stop after the code "looks correct."

`/verify` must validate:

* acceptance criteria
* build
* tests where applicable
* runtime behavior where applicable
* regression behavior
* performance
* security/privacy
* documentation impact

If verification fails:

```text
/verify
    ↓
Root Cause
    ↓
/implement
    ↓
/verify
```

Repeat until the goal is verified or a genuine blocker is identified.

---

# 17. Documentation Handoff

After successful verification:

```text
/verify
    ↓
/update
    ↓
/docs
```

Documentation must reflect the actual implemented behavior.

Update documentation when implementation changes:

* feature behavior
* architecture
* data flow
* APIs
* configuration
* tool behavior
* file ownership
* security/privacy behavior
* performance behavior
* supported formats
* user-visible behavior

Do not create duplicate documentation when an existing document should be updated.

---

# 18. Implementation Output

At the end of implementation, report:

```text
## Implementation Result

### Goal
<goal implemented>

### Changes
- <change>
- <change>

### Reused
- <existing component/service/pattern>

### New
- <new implementation only if necessary>

### Preserved
- <existing behavior>

### Verification Handoff
/verify

### Documentation Impact
<required / not required / pending after verification>

### Notes
<important implementation details or blockers>
```

Do not claim the task is fully complete until `/verify` succeeds.

---

# 19. Failure Handling

If implementation cannot proceed:

```text
BLOCKED
```

State:

```text
Blocker
Evidence
What is required to proceed
```

Do not fabricate missing APIs, files, dependencies, requirements, or behavior.

If a technical assumption proves wrong:

```text
Stop
    ↓
Re-research the specific issue
    ↓
Update Goal if necessary
    ↓
Continue
```

---

# Final Rule

Implementation must answer:

> “Can this requirement be implemented with the smallest correct change while preserving existing functionality and remaining aligned with Acklet's architecture, rules, security, performance, and standards?”

The implementation is not finished when code is written.

It is finished only when:

```text
Goal
  ↓
Correct Implementation
  ↓
Verification
  ↓
Documentation
```

# END OF IMPLEMENT WORKFLOW

```
```

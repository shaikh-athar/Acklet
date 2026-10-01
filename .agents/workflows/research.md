---
description: Guides evidence-based investigation before implementation, covering existing code, reuse, standards, dependencies, architecture, risks, improvements, and implementation readiness.
---

````md
# Research Workflow

## Purpose

`/research` is the mandatory workflow for understanding a feature, bug, architectural change, technical problem, or new requirement before implementation.

Research must produce enough evidence to decide:

- what already exists
- how the current implementation works
- what the correct/standard approach is
- whether the current implementation follows that approach
- what can be reused
- what must change
- whether the existing architecture is sufficient
- whether a new library/dependency is actually required
- whether an advanced approach provides meaningful value
- what risks, limitations, and regressions must be considered

Research is for **understanding and decision-making**, not for prematurely writing code.

---

# 1. Mandatory Startup

Before starting research:

```text
AGENTS.md
    ↓
Applicable Rules
    ↓
Applicable Workflows
    ↓
Research
````

Never skip `AGENTS.md`, even when the task appears simple.

---

# 2. Understand the Request

First identify:

```text
Problem
Expected Behavior
Current Behavior
Goal / Desired Outcome
Constraints
Affected Tool
Affected Feature
Affected Subsystem
```

Separate:

```text
User Requirement
Existing Behavior
Assumptions
Unknowns
```

Do not invent missing requirements.

If something important is unclear, identify it as an unknown rather than assuming.

---

# 3. Context-First Investigation

Use:

```text
.agents/workflows/context.md
```

before broad repository exploration.

Identify the smallest relevant area:

```text
Feature
   ↓
Subsystem
   ↓
Entry Point
   ↓
Services / Components
   ↓
Storage / API / Transport
   ↓
Relevant Callers
```

Avoid scanning unrelated files.

If `context.md` is stale or incomplete:

1. inspect the relevant code
2. establish the actual structure
3. continue research
4. update the context when appropriate

---

# 4. Existing Implementation Research

Find and understand the current implementation.

Inspect relevant:

* components
* services
* utilities
* helpers
* storage
* APIs
* state management
* event handlers
* WebSocket / realtime flows
* tests
* documentation
* configuration

Trace the real execution path.

Do not research only the file that appears most obvious.

---

# 5. Reuse Check

Before proposing new implementation, search for existing solutions.

Check in this order:

```text
Existing Feature
      ↓
Existing Component
      ↓
Existing Service
      ↓
Existing Utility / Helper
      ↓
Existing Pattern
      ↓
Browser / Platform API
      ↓
Installed Dependency
      ↓
Small Local Implementation
      ↓
New Dependency
```

Prefer reuse over duplication.

If an existing solution is sufficient, document why it should be reused.

---

# 6. Standard / Best-Practice Research

Determine the appropriate standard approach for the problem.

Depending on the task, evaluate:

* browser/platform standards
* Angular conventions
* Spring Boot conventions
* Web APIs
* storage patterns
* security practices
* performance practices
* synchronization patterns
* accessibility practices
* established library patterns

Then compare:

```text
Current Acklet Implementation
          VS
Standard / Recommended Approach
```

Do not replace an existing implementation merely because another approach exists.

The question is:

> Is the current implementation correct and appropriate for this product?

---

# 7. Acklet Alignment Check

Every research task must determine whether the proposed approach aligns with Acklet rules.

Check:

```text
Privacy
Security
Performance
Angular Architecture
Tool Isolation
UI Foundation
Existing Dependencies
Storage Strategy
Project Structure
Documentation
```

Explicitly identify:

```text
Aligned
Partially Aligned
Not Aligned
```

For anything not aligned, explain the actual reason and required change.

---

# 8. Dependency / Library Research

When a library or dependency appears useful, verify whether it is actually necessary.

Evaluate:

```text
Can existing code solve it?
Can browser/platform APIs solve it?
Can an installed dependency solve it?
Can a small local implementation solve it?
Does a new library provide meaningful benefit?
```

For a proposed new dependency consider:

* purpose
* maturity
* maintenance
* license
* security
* bundle/runtime cost
* Angular/Spring compatibility
* existing project compatibility
* whether it introduces unnecessary complexity

Do not add a dependency simply because it makes implementation easier.

---

# 9. Advanced Improvement Research

For meaningful features, investigate whether the basic implementation can be improved.

Consider:

```text
Performance
Scalability
Reliability
Security
UX
Maintainability
Observability
Future extensibility
```

Classify findings:

```text
Required
Recommended
Optional / Future
```

Do not turn optional improvements into unnecessary implementation scope.

---

# 10. Existing vs Proposed Architecture

When architecture is involved, compare:

```text
Current Architecture
        ↓
Current Limitation
        ↓
Possible Approaches
        ↓
Trade-offs
        ↓
Recommended Direction
```

Consider:

* complexity
* performance
* reliability
* operational cost
* development effort
* compatibility with existing code
* migration risk
* future maintenance

Prefer incremental changes when the existing architecture can support the requirement.

---

# 11. Risk and Regression Research

Identify what could break if the proposed change is implemented.

Check:

```text
Shared Callers
Existing Features
Data Compatibility
Storage Compatibility
API Compatibility
Realtime Behavior
Performance
Security
UI Behavior
Backward Compatibility
```

For every meaningful risk provide:

```text
Risk
Impact
Likelihood / Evidence
Mitigation
```

Do not speculate unnecessarily; distinguish known facts from assumptions.

---

# 12. Research Boundaries

Research must stop when there is enough evidence to make an implementation decision.

Do not endlessly investigate alternatives.

The objective is:

```text
Enough Evidence
      ↓
Clear Decision
      ↓
Implementable Plan
```

Not:

```text
Research Everything
      ↓
Never Implement
```

---

# 13. Research Output

Finish with:

```text
## Research Result

### 1. Problem
<what is being investigated>

### 2. Current Implementation
<how Acklet currently handles it>

### 3. Relevant Files
<important files and responsibilities>

### 4. Existing Reusable Solutions
<what can be reused>

### 5. Standard Approach
<appropriate standard / recommended approach>

### 6. Current Alignment
<Aligned / Partially Aligned / Not Aligned>

### 7. Gap
<what is missing or incorrect>

### 8. Dependency Check
<new library required or not, with reason>

### 9. Advanced Improvements
<Required / Recommended / Optional>

### 10. Risks
<important risks and mitigations>

### 11. Recommended Direction
<clear implementation direction>

### 12. Implementation Readiness
READY / NOT READY

Reason:
<why>
```

---

# 14. Handoff to Other Workflows

Research should feed the next workflow rather than duplicate its work.

For a new feature:

```text
/research
    ↓
/goal
    ↓
/context
    ↓
/implement
    ↓
/verify
    ↓
/update
    ↓
/docs
```

For an existing bug:

```text
/research
    ↓
/goal
    ↓
/context
    ↓
/implement
    ↓
/verify
```

For research-only requests:

```text
/research
    ↓
Research Result
```

Do not implement unless implementation is requested or the selected workflow explicitly requires it.

---

# 15. Final Research Rule

Research must answer one central question:

> **"What is the smallest correct solution that fits the existing Acklet architecture, follows established standards, reuses what already exists, and does not introduce unnecessary complexity?"**

Research is complete when that question can be answered with evidence.

# END OF RESEARCH WORKFLOW

```
```

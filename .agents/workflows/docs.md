---
description: Keeps Acklet documentation synchronized with verified implementation by finding existing docs, updating the correct source, avoiding duplication, validating references, and documenting architecture, features, UI, and behavior.
---

# Documentation Workflow

## Purpose

`/docs` manages project documentation so it remains synchronized with the **verified implementation**.

Documentation must describe what the system actually does today, not what was originally planned.

Use `/docs` when:

* A feature is implemented or changed
* A requirement changes behavior
* Architecture or data flow changes
* A bug fix changes documented behavior
* Documentation is requested
* Documentation is missing, outdated, duplicated, or inaccurate

### Core Principle

> Find existing documentation first, update the correct source of truth, avoid duplication, and verify that documentation matches implementation.

---

# 1. Mandatory Startup

Before documentation work:

```text
AGENTS.md
    ↓
Applicable Rules
    ↓
Applicable Workflows
    ↓
Verified Implementation
    ↓
Existing Documentation
    ↓
Documentation Update
    ↓
Documentation Verification
```

Never skip `AGENTS.md`.

Documentation must follow project structure and applicable documentation rules.

---

# 2. Determine Documentation Impact

First determine:

```text
What changed?
What needs documentation?
Which document owns this information?
Does that document already exist?
Is the information duplicated elsewhere?
Is a new document actually necessary?
```

Possible impact areas:

```text
Feature
Bug Fix
Requirement
UI / UX
Architecture
API
Data Flow
Storage
Security
Performance
Configuration
Developer Workflow
Tool Capability
Repository Navigation
```

Do not create documentation merely because code exists.

---

# 3. Source of Truth

Resolve conflicts using:

```text
Current Code
    ↓
Verified Runtime Behavior
    ↓
Explicit User Requirement
    ↓
Current Rules / Workflows
    ↓
Project Documentation
    ↓
Context Documentation
```

If documentation conflicts with implementation:

```text
Verify Current Behavior
        ↓
Correct Documentation
```

Do not change implementation merely to match documentation unless implementation changes are explicitly requested.

---

# 4. Find Existing Documentation First

Before creating anything:

```text
Search Existing Docs
    ↓
Find Related Document
    ↓
Identify Documentation Owner
    ↓
Update Existing Document
```

Check:

```text
docs/
README files
description.md
feature.md
UI_REFERENCE.md
LEGEND.md
Architecture docs
Root tool catalog
Context
Feature/domain documentation
```

Prefer updating an existing source of truth.

Avoid duplicate descriptions of the same behavior.

---

# 5. Acklet Tool Documentation

Every tool under:

```text
docs/Acklet Vault/Acklet/Tools/<tool-name>/
```

should contain:

```text
README.md
description.md
feature.md
UI_REFERENCE.md
LEGEND.md
```

plus required domain/format documentation.

When a tool is added or its catalog behavior changes, evaluate:

```text
docs/Acklet Vault/Acklet/Tools/README.md
```

Update the catalog when required.

---

# 6. README.md

`README.md` is the high-level entry point.

Document:

```text
What the tool is
Problem it solves
Primary capabilities
How it fits into Acklet
Links to detailed documentation
```

Keep it concise. Do not turn it into a complete implementation specification.

Use relative links.

---

# 7. description.md

Use `description.md` for the functional description.

Document:

```text
Purpose
User Problem
Core Behavior
Supported Inputs
Supported Outputs
Important Constraints
Processing Model
Privacy Model
```

Describe actual supported behavior only.

Do not document planned functionality as implemented.

---

# 8. feature.md

Use `feature.md` for detailed feature behavior.

Document relevant:

```text
Feature
Purpose
User Interaction
Processing Flow
Supported Cases
Edge Cases
Error Behavior
Integration
Dependencies
Important Limitations
```

When an existing feature changes, update its existing documentation instead of creating another document.

---

# 9. UI_REFERENCE.md

Use `UI_REFERENCE.md` for actual user-visible behavior.

Document:

```text
Layout
Panels
Components
Controls
States
Interactions
Keyboard Shortcuts
Empty States
Loading States
Error States
Responsive Behavior
Light Theme
Dark Theme
```

Do not place deep implementation details here unless they directly affect UI behavior.

---

# 10. LEGEND.md

Use `LEGEND.md` for terminology and visual/status conventions.

Examples:

```text
Connection Status
Processing Status
Resource Types
Content Types
Icons
Badges
Indicators
State Labels
```

Keep terminology consistent across the tool.

---

# 11. Architecture Documentation

Evaluate:

```text
docs/Acklet Vault/Acklet/Architecture/
```

when changes affect:

```text
System boundaries
Components / services
Data flow
Storage
Queues
WebSockets
APIs
Synchronization
Processing pipelines
Deployment
Security boundaries
Major dependencies
```

A local implementation change with no architectural impact does not require architecture documentation.

---

# 12. Context Documentation

Update:

```text
.agents/workflows/context.md
```

when repository navigation or ownership changes.

Examples:

```text
New important file
File moved
Subsystem created
Feature ownership changed
New service
New integration
Data flow changed
Storage ownership changed
Tool structure changed
Important entry point changed
```

`context.md` is a navigation map, not a duplicate implementation document.

---

# 13. Bug-Fix Documentation

A bug fix does not automatically require documentation.

Update documentation only when the fix changes permanent documented knowledge, such as:

```text
Supported formats
User-visible behavior
Error behavior
Storage behavior
Synchronization behavior
Security behavior
Performance behavior
Data handling
```

For an internal fix with no documentation impact:

```text
No documentation change required.
```

Do not create documentation for every bug fix.

---

# 14. Requirement Updates

When `/update` changes an existing requirement:

```text
Previous Documentation
        ↓
New Requirement
        ↓
Verified Implementation
        ↓
Updated Documentation
```

Preserve requirements that were not changed.

If behavior was intentionally replaced, document the current behavior and remove obsolete statements.

---

# 15. New Feature Documentation

For a new feature, document the verified result:

```text
Purpose
User Flow
Behavior
Supported Cases
Constraints
Errors
Security / Privacy
Performance
UI
Integration
```

Do not copy the original implementation plan blindly.

If implementation changed during development, document the final verified behavior.

---

# 16. API and Data Flow Documentation

When API or data flow changes, document the actual flow:

```text
Input
  ↓
Validation
  ↓
Processing
  ↓
Transport
  ↓
Storage / Service
  ↓
Output
```

Where relevant include:

```text
Request / Response
Important Fields
Content Types
Validation
Errors
Authentication / Authorization
Storage
Realtime Behavior
Compatibility
```

Never invent fields, endpoints, or behavior.

---

# 17. UI Documentation

UI documentation must match the actual UI.

Document:

```text
Visible Controls
User Interactions
Component States
Loading
Errors
Empty States
Keyboard Shortcuts
Responsive Behavior
Theme Behavior
```

Planned functionality must be explicitly labeled:

```text
Planned
Future
Not Yet Implemented
```

Never describe planned behavior as current functionality.

---

# 18. Security and Privacy

When applicable, document:

```text
Where processing occurs
What data is transmitted
What remains local
Storage behavior
Sensitive-data handling
Permissions
Authentication
Authorization
Security restrictions
```

For client-side tools, accurately describe browser-only processing.

Do not claim `100% client-side` if relevant payloads are sent to a backend.

Follow:

```text
.agents/rules/security.md
```

---

# 19. Performance Documentation

Document meaningful implemented performance behavior, such as:

```text
Lazy Loading
Metadata-First Loading
Web Workers
Large Payload Handling
Caching
Batching
Debouncing
Throttling
Storage Limits
Resource Limits
```

Document actual limits and behavior.

Do not claim an optimization is guaranteed unless it is implemented and verified.

---

# 20. Documentation Quality Check

Before completing `/docs`:

```text
[ ] Existing documentation searched first
[ ] Correct documentation owner identified
[ ] Documentation matches implementation
[ ] No unnecessary duplicate document created
[ ] Outdated behavior removed/corrected
[ ] Planned behavior clearly labeled
[ ] Relative links are correct
[ ] Referenced files/paths exist
[ ] Commands/examples are valid
[ ] Terminology is consistent
[ ] Security/privacy claims are accurate
[ ] Performance claims are accurate
[ ] UI documentation matches actual UI
[ ] Architecture updated if required
[ ] Context updated if required
[ ] Root tool catalog updated if required
```

---

# 21. Documentation Verification

For every important documented claim:

```text
Documentation
    ↓
Referenced Code / Feature
    ↓
Actual Behavior
    ↓
Confirmed
```

Verify:

```text
Referenced files exist
Referenced paths are correct
Relative links work
Commands exist
Configuration is current
Documented behavior is implemented
Examples match current behavior
Terminology matches the project
```

Do not leave broken references or known contradictions.

---

# 22. Prevent Documentation Drift

After meaningful implementation changes ask:

> Did this change anything a developer or user needs to know?

If yes:

```text
Update Documentation
```

If no:

```text
No Documentation Change Required
```

Documentation evaluation is normally required for:

```text
New feature
Changed user behavior
Changed supported format
Changed API
Changed data flow
Changed storage
Changed security model
Changed performance behavior
Changed architecture
Changed tool capability
Changed repository ownership
```

---

# 23. Documentation-Only Request

When `/docs` is explicitly invoked:

```text
/docs
  ↓
Find Existing Documentation
  ↓
Understand Requested Content
  ↓
Update Existing Doc OR Create New Doc
  ↓
Verify Accuracy
```

Do not modify implementation merely because documentation was requested.

If documentation conflicts with implementation, report the discrepancy rather than silently changing code.

---

# 24. Dynamic Workflow Handoff

### New Feature

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
/docs
```

### Existing Requirement Update

```text
/update
    ↓
/verify
    ↓
/docs
```

### Bug Fix

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

Then use `/docs` only if the fix changes documented knowledge.

### Architecture Change

```text
/implement
    ↓
/verify
    ↓
/docs
    ↓
Architecture + Tool Docs + Context
```

### Documentation Only

```text
/docs
  ↓
Find
  ↓
Update/Create
  ↓
Verify
```

Do not force unrelated workflow stages.

---

# 25. Final Documentation Result

Use:

```text
## Documentation Result

### Documentation Updated
- <file>

### Documentation Created
- <file, if any>

### Documentation Removed
- <file, if any>

### Verified
- [ ] Matches implementation
- [ ] References verified
- [ ] Links verified
- [ ] Terminology verified
- [ ] Outdated behavior corrected
- [ ] Architecture updated if required
- [ ] Context updated if required

### Documentation Impact
<what changed and why>

### No Change Required
<if applicable>
```

---

# Final Rule

`/docs` must answer:

> “If another developer reads this documentation today, will it accurately explain the system as it actually exists today?”

Documentation is complete only when:

```text
Existing Documentation Found
        ↓
Correct Source Updated
        ↓
No Unnecessary Duplication
        ↓
Implementation Consistency Verified
        ↓
Links / References Verified
        ↓
Architecture / Context Updated When Required
```

Documentation is a maintained representation of the real system.

It must never become a second, conflicting version of the codebase.

# END OF DOCUMENTATION WORKFLOW

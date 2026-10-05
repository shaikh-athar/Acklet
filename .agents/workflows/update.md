---
description: Guides safe modification of existing requirements or implementation by researching current behavior, preserving existing functionality, applying minimal changes, verifying results, and updating affected documentation.
---

# Update Workflow

## Purpose

`/update` modifies an existing implementation, requirement, behavior, architecture, or documentation without unnecessarily replacing or breaking what already works.

> Understand the current implementation first, change only what is required, preserve unaffected behavior, then verify the result.

`/update` is for existing systems and requirements, not greenfield implementation.

---

# 1. Mandatory Startup

Before starting:

```text
AGENTS.md
    ↓
Applicable Rules
    ↓
Applicable Workflows
    ↓
Current Requirement
    ↓
Current Implementation
    ↓
Update
```

Never skip `AGENTS.md`.

Do not assume documentation perfectly represents current behavior. Verify the implementation.

---

# 2. Identify the Update

Classify the request:

```text
Requirement
Feature Behavior
Bug / Behavior Correction
UI
Architecture
Data / Storage
API
Performance
Security
Documentation
Configuration
```

Identify:

```text
Current Behavior
Requested Behavior
Reason for Change
Affected Feature
Affected Subsystem
```

Separate:

```text
Must Change
Must Preserve
Unknown
Out of Scope
```

Do not silently expand scope.

---

# 3. Research Current Implementation

Before modifying code, trace the relevant execution path:

```text
Entry Point
    ↓
Component / Controller
    ↓
Service
    ↓
Utility / Helper
    ↓
State / Storage / API / Transport
    ↓
Relevant Callers
```

Inspect relevant:

* implementation
* callers
* shared utilities
* state
* storage
* APIs
* WebSockets/realtime flows
* tests
* configuration
* documentation
* dependencies

Understand **why** current behavior occurs, not just where the symptom appears.

Avoid unrelated exploration.

---

# 4. Preserve Existing Functionality

Primary rule:

```text
Existing Behavior
        +
Requested Change
        ↓
Updated Behavior
```

Unless explicitly changed, preserve:

```text
Existing features
Supported formats
APIs
Storage behavior
Synchronization
Keyboard shortcuts
UI behavior
Themes
Error handling
Security behavior
Performance protections
Backward compatibility
```

If existing behavior must change, record:

```text
Previous Behavior:
<old>

Requested Behavior:
<new>

Reason:
<why>
```

Do not turn an update into a rewrite.

---

# 5. Compare Current vs Requested

Create the behavioral delta:

```text
Current
   ↓
Requested
   ↓
Difference
   ↓
Required Change
```

Only the required difference should drive implementation.

Example:

```text
Current:
Markdown becomes plain text.

Requested:
Copied Markdown must preserve its representation.

Required:
Preserve source representation/content type through
send and preview instead of converting it.
```

---

# 6. Reuse Existing Implementation

Before adding new code:

```text
Existing Logic
    ↓
Existing Component
    ↓
Existing Service
    ↓
Existing Utility
    ↓
Existing Pattern
    ↓
Platform API
    ↓
Installed Dependency
    ↓
Small Modification
    ↓
New Implementation
```

Prefer modifying existing logic over duplication.

For shared logic:

```text
Find Relevant Callers
    ↓
Understand Impact
    ↓
Update Shared Logic
    ↓
Verify Callers
```

Fix the correct shared layer instead of patching every caller.

---

# 7. Root Cause

For incorrect behavior:

```text
Observed Behavior
    ↓
Execution Trace
    ↓
Root Cause
    ↓
Correct Layer
    ↓
Minimal Change
```

Do not patch symptoms unless a temporary workaround is explicitly required.

Prefer fixing the service/state/representation producing the incorrect result rather than hiding it in the UI.

---

# 8. Requirement Updates

When an existing requirement changes:

```text
Previous Requirement
        ↓
New Requirement
        ↓
Current Implementation
        ↓
Gap
        ↓
Required Modification
```

Preserve requirements that are not superseded.

Track:

```text
Retained:
<existing requirement>

Changed:
<updated requirement>

Removed:
<explicitly removed requirement>

Added:
<new requirement>
```

Do not reinterpret a small requirement update as an unrelated new feature.

---

# 9. Architecture Updates

For architecture changes:

```text
Current Architecture
        ↓
Current Limitation
        ↓
Requested Change
        ↓
Possible Modification
        ↓
Migration / Compatibility Impact
```

Prefer incremental migration.

Before introducing architectural change, verify:

```text
Current architecture cannot satisfy requirement
Simpler modification is insufficient
Migration impact is understood
Existing consumers are identified
Backward compatibility is considered
Operational complexity is acceptable
```

Do not introduce architecture merely because it is technically interesting.

---

# 10. Dependencies

Before adding a dependency:

```text
Existing Implementation
    ↓
Existing Dependency
    ↓
Platform API
    ↓
Small Local Change
    ↓
New Dependency
```

Evaluate:

```text
Necessity
Compatibility
Maintenance
License
Security
Bundle/runtime cost
Complexity
Long-term ownership
```

New dependencies require concrete justification.

Do not replace existing dependencies without a requirement.

---

# 11. Performance-Sensitive Updates

Inspect the complete execution path for:

```text
High-frequency events
Signals
Effects
Subscriptions
WebSockets
BroadcastChannel
IndexedDB
Serialization
Large payloads
Rendering
Change detection
Workers
```

Preserve performance rules:

```text
Throttle/debounce high-frequency listeners
No heavy work on passive UI events
No large payloads in Signals
Use metadata-first handling
Use Web Workers where appropriate
Batch state updates
Deduplicate echoed events
Clean up listeners/subscriptions
Verify long-task behavior
```

Do not claim performance improvement without verification.

---

# 12. Security and Privacy

For security/privacy-sensitive updates, trace the complete data path.

Check:

```text
Payload handling
File handling
Logging
Storage
API calls
Authentication
Authorization
Sensitive-data exposure
Security exclusions
Existing SecurityUtils
```

For client-side processing, do not accidentally introduce backend transmission.

Follow:

```text
.agents/rules/security.md
```

---

# 13. UI Updates

Use:

```text
Existing UI
    ↓
Requested Difference
    ↓
Affected Component
    ↓
Scoped Change
```

Preserve:

```text
Light theme
Dark theme
Design tokens
Accessibility
Keyboard interactions
Responsive behavior
Tool isolation
```

Follow the component hierarchy defined in `AGENTS.md`.

Modify existing components when they can safely support the requirement instead of unnecessarily replacing them.

---

# 14. Define Scope

Explicitly separate:

```text
IN SCOPE
OUT OF SCOPE
FUTURE / OPTIONAL
```

Example:

```text
In Scope:
- Preserve Markdown representation
- Correct preview rendering
- Preserve plain-text behavior

Out of Scope:
- Redesign clipboard architecture
- Replace storage
- Introduce a Markdown editor

Future:
- Advanced Markdown editing
```

Optional improvements must not automatically become implementation work.

---

# 15. Implement Smallest Correct Change

After understanding the implementation:

```text
Current Implementation
        ↓
Minimal Modification
        ↓
Preserve Existing Behavior
        ↓
Safe Checks
```

Avoid:

```text
Unrelated refactoring
Renaming unrelated APIs
Moving unrelated files
Replacing working architecture
Unnecessary abstractions
Unnecessary dependencies
```

If a broader change is genuinely necessary, document why.

---

# 16. Verification

Every meaningful update must go through `/verify`.

```text
/update
    ↓
Implement Change
    ↓
/verify
```

Verify:

```text
New Requirement             ✓
Existing Functionality      ✓
Regression Safety           ✓
Build / Tests               ✓
Relevant Runtime Behavior   ✓
```

Also verify applicable performance/security requirements.

If verification fails:

```text
/verify
    ↓
Identify Failure
    ↓
/update or /implement
    ↓
/verify
```

Do not declare completion while required verification fails.

---

# 17. Documentation Impact

After verification, determine whether documentation changed.

Documentation normally requires evaluation when changing:

```text
Feature behavior
Architecture
Data flow
API behavior
Configuration
Supported formats
UI behavior
Security behavior
Performance behavior
File ownership
Tool capabilities
Developer workflow
```

Then:

```text
/verify
    ↓
/docs
```

Find existing documentation first. Do not create duplicates.

---

# 18. Context Impact

Update:

```text
.agents/workflows/context.md
```

when repository navigation or ownership changes, including:

```text
File moved
New subsystem
Feature ownership changed
New service
Data flow changed
Storage ownership changed
Tool structure changed
Important entry point changed
```

Do not modify context when navigation has not changed.

---

# 19. Dynamic Workflow Handoff

Use the smallest appropriate chain.

### Existing Requirement / Behavior

```text
/update
    ↓
Research Current Implementation
    ↓
Modify
    ↓
/verify
    ↓
/docs (if required)
```

### Architectural Problem Discovered

```text
/update
    ↓
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

### Bug Correction

```text
/update
    ↓
Root Cause Research
    ↓
Modify
    ↓
/verify
```

### Documentation Only

```text
/docs
```

Do not force unnecessary workflow stages.

---

# 20. Fast Mode

`/fast` means:

```text
Less unnecessary exploration
+
Targeted implementation
+
Minimal change
+
Required verification
```

It does **not** mean:

```text
Skip current implementation research
Skip AGENTS.md
Skip rules
Skip regression checks
Skip security
Skip verification
```

Fast mode reduces overhead, not correctness.

---

# 21. Update Result

Finish with:

```text
## Update Result

### Requested Update
<request>

### Current Implementation
<previous behavior>

### Changed
- <change>

### Preserved
- <existing behavior>

### Out of Scope
- <item>

### Verification
<status / handoff to /verify>

### Documentation
<updated / required / not required>

### Context
<updated / unchanged>

### Notes
<compatibility, migration, or implementation details>
```

Do not claim full completion until verification succeeds.

---

# Final Rule

`/update` must answer:

> What is the smallest correct change required to move the existing implementation from its current behavior to the requested behavior without unnecessarily breaking anything else?

The update is complete only when:

```text
Current Implementation Understood
        ↓
Behavioral Delta Identified
        ↓
Smallest Correct Change Applied
        ↓
Existing Behavior Preserved
        ↓
Regression Risk Checked
        ↓
Verification Passed
        ↓
Documentation / Context Updated If Required
```

# END OF UPDATE WORKFLOW

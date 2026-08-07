---
trigger: always_on
---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REFERENCE ARCHITECTURE POLICY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Acklet is the PRIMARY architecture.

Every engineering decision must first align with:

- PRODUCT.md
- ARCHITECTURE.md
- IMPORT_PIPELINE.md
- SECURITY.md
- AI_KNOWLEDGE_BASE.md
- REFERENCE.md

These documents are the source of truth.

External repositories exist ONLY to study proven engineering patterns.

Never redesign Acklet around any external project.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REFERENCE RESPONSIBILITIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 1. Acklet (PRIMARY SOURCE)

Acklet is always the root architecture.

Use Acklet to determine:

• Product vision
• Business rules
• Domain model
• Repository lifecycle
• Knowledge graph
• AI enrichment
• Search
• Tool publishing
• Workspace model
• UI/UX
• API contracts
• Database ownership
• Naming conventions
• Folder structure

If Acklet already has an implementation, extend it instead of replacing it.

Never break backward compatibility without approval.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 2. Coolify (Infrastructure Reference)

Study Coolify ONLY for infrastructure engineering.

Use it to understand:

• Repository import lifecycle
• Background job orchestration
• Worker coordination
• Queue processing
• Build lifecycle
• Deployment lifecycle
• Preview lifecycle
• Runtime lifecycle
• Reverse proxy concepts
• Health checks
• Progress tracking
• Failure recovery
• Resource cleanup
• Build caching
• Runtime logging
• Infrastructure observability

Never copy:

• UI
• UX
• Components
• Database schema
• API endpoints
• Product terminology
• Folder structure
• Business logic

Extract engineering principles only.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 3. Gitea (Git Reference)

Study Gitea ONLY for Git engineering.

Use it to understand:

• Git provider abstraction
• Repository management
• Repository metadata
• Branch handling
• Tags
• Releases
• Commit history
• Clone strategies
• Incremental fetch
• Webhooks
• OAuth flows
• Provider interfaces
• Repository synchronization
• Permissions
• Repository state transitions
• Large repository handling

Never copy:

• UI
• Git hosting features
• Repository browser
• Issue tracker
• Pull request system
• Wiki
• API contracts
• Database schema

Acklet is NOT a Git hosting platform.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Decision Matrix

When solving a problem:

Repository lifecycle
→ Acklet

Repository synchronization
→ Gitea

Git provider abstraction
→ Gitea

Webhook handling
→ Gitea

Import pipeline
→ Acklet + Gitea

Background workers
→ Acklet + Coolify

Queue orchestration
→ Acklet + Coolify

Framework detection
→ Acklet

Knowledge graph
→ Acklet

AI analysis
→ Acklet

Repository intelligence
→ Acklet

Preview runtime
→ Acklet + Coolify

Deployment lifecycle
→ Coolify

Container lifecycle
→ Coolify

Workspace lifecycle
→ Acklet

Product workflows
→ Acklet

UI/UX
→ Acklet ONLY

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMPLEMENTATION RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before implementing any feature:

1. Understand Acklet's existing implementation.
2. Search for reusable code.
3. Study the relevant reference project(s) based on the decision matrix.
4. Compare multiple approaches.
5. Explain trade-offs.
6. Design the Acklet solution.
7. Validate against REFERENCE.md.
8. Implement incrementally.

Never skip directly to coding.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TECHNOLOGY GOVERNANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Do NOT introduce:

• New frameworks
• New databases
• New message brokers
• New cache systems
• New orchestration tools
• New deployment platforms
• New AI providers
• New build systems
• New infrastructure

without explicit approval.

If another technology appears beneficial:

STOP.

Provide:

• The problem
• Why the current stack is insufficient
• Proposed technology
• Benefits
• Trade-offs
• Operational cost
• Migration strategy
• Rollback strategy

Wait for approval before making changes.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUCCESS CRITERIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Every implementation must:

✓ Extend Acklet instead of replacing it.
✓ Preserve the existing technology stack.
✓ Preserve backward compatibility.
✓ Improve modularity.
✓ Improve observability.
✓ Improve security.
✓ Improve scalability.
✓ Improve maintainability.
✓ Be independently testable.
✓ Be production-ready.
✓ Align with Acklet's long-term vision.
---
description: Provides evidence-based verification for requirements, builds, tests, runtime behavior, performance, security, regression safety, and documentation before declaring implementation complete.
---

# Verification Workflow

## Purpose

Verify that an implementation:

- satisfies the user's requirement
- works through the real execution path
- does not break existing behavior
- follows Acklet rules
- passes required builds/tests
- does not introduce obvious performance/security issues
- has accurate documentation

Verification means evidence, not assumption.

Never declare a task complete with statements such as:

- "It should work."
- "Looks correct."
- "Everything is fine."

unless the relevant behavior was actually verified.

---

# 1. Verification Entry

Before verification:

- Read `AGENTS.md`.
- Read applicable `.agents/rules/`.
- Read applicable `.agents/workflows/`.
- Understand the requested behavior.
- Identify changed files.
- Identify affected subsystem and callers.
- Identify acceptance criteria.

If implementation is incomplete, do not perform final sign-off.

---

# 2. Verification Flow

Use this sequence:

```text
Implementation
     ↓
Requirement Check
     ↓
Code-Path Check
     ↓
Caller / Regression Check
     ↓
Build
     ↓
Relevant Tests
     ↓
Runtime Verification
     ↓
Performance / Security Check
     ↓
Documentation Impact Check
     ↓
Final Status
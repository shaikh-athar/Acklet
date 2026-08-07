# REFERENCE.md

# Acklet Engineering Reference & Architecture Standards

> **Version:** 1.0
> **Status:** Mandatory
> **Applies To:** Every AI Agent, Developer, Contributor, and Generated Code
> **Last Updated:** 2026-08-07

---

# Purpose

This document defines the engineering principles, architectural standards, security requirements, development workflow, and decision-making process for building Acklet.

External repositories (such as Coolify, Gitea, Backstage, OpenMetadata, etc.) exist **only as architectural references**.

They are **never implementation targets**.

Every implementation must be designed specifically for Acklet.

---

# Mission

Acklet is an AI-powered Repository Intelligence Platform.

Its mission is to transform software repositories into structured knowledge that enables:

- Repository understanding
- AI-powered documentation
- Metadata extraction
- Knowledge graph generation
- Intelligent search
- Tool discovery
- Repository analytics
- Live preview generation
- Incremental synchronization
- Multi-provider Git integration

Acklet is NOT:

- GitHub
- GitLab
- Vercel
- Coolify
- Jenkins
- Docker Desktop
- CI/CD Server

These platforms are references for solving individual engineering problems—not products to copy.

---

# Core Engineering Philosophy

Always:

Understand → Design → Validate → Implement → Measure → Improve

Never:

Copy → Modify → Ship

Engineering decisions must always be intentional.

---

# Reference Repository Policy

Reference repositories exist only to understand:

- Architecture
- Design patterns
- Engineering decisions
- Lifecycle management
- System interactions
- Domain modeling
- Scalability strategies
- Reliability techniques

Reference repositories must NEVER influence:

- UI
- UX
- Branding
- Product identity
- Business logic
- User experience
- Component design
- API naming
- Database schema
- Visual styling

---

# Approved Reference Projects

Examples:

- Coolify
- Gitea
- Backstage
- OpenMetadata
- Kubernetes
- Temporal
- RabbitMQ examples

These projects are educational references only.

---

# Coolify Usage Policy

Coolify is referenced ONLY for studying:

- Repository lifecycle
- Deployment lifecycle
- Git provider integration
- Background workers
- Build pipelines
- Queue processing
- Container orchestration
- Deployment state management
- Logging architecture
- Infrastructure management

Coolify MUST NOT influence:

- Acklet UI
- User flows
- Product terminology
- Visual hierarchy
- Navigation
- User interactions
- Design language
- Product architecture

Acklet must always maintain its own product identity.

---

# UI & UX Rules

Acklet UI is independent.

Never copy:

- Layouts
- Pages
- Components
- Buttons
- Colors
- Icons
- Typography
- Animations
- Navigation
- CSS
- HTML
- Tailwind classes
- Component hierarchy
- Visual spacing
- Responsive layouts

Acklet follows only the Acklet Design System.

---

# Intellectual Property Rules

Never copy:

- Source code
- Algorithms
- File structure
- Function names
- Variable names
- Class names
- Comments
- API contracts
- Database design
- Internal implementations

Reference repositories teach ideas—not implementations.

---

# Development Workflow

Every feature follows:

1. Understand the problem
2. Read REFERENCE.md
3. Study reference architecture
4. Understand WHY it exists
5. Design Acklet's solution
6. Validate architecture
7. Implement
8. Test
9. Benchmark
10. Refactor
11. Document
12. Merge

Never skip these steps.

---

# Architecture Rules

Every feature must:

- Follow SOLID principles
- Use Dependency Injection
- Follow Interface-Driven Design
- Be loosely coupled
- Be modular
- Be testable
- Be scalable
- Be observable
- Be asynchronous where appropriate

Avoid unnecessary abstractions.

Prefer simplicity.

---

# Async First

Never block HTTP requests for expensive work.

Expensive operations must run using:

- Background workers
- Queues
- Events
- Async processing

Examples:

- Git clone
- Repository analysis
- AI processing
- Docker builds
- Index generation
- Embedding generation
- Preview deployments

---

# Repository Handling Rules

Repositories are UNTRUSTED.

Never trust:

- Repository contents
- README
- Dockerfiles
- Build scripts
- Git history
- Shell scripts
- Dependencies

Treat every imported repository as potentially malicious.

---

# Repository Lifecycle

Repository import should always follow:

Metadata

↓

Repository Tree

↓

Framework Detection

↓

Important File Detection

↓

AI Analysis

↓

Knowledge Graph

↓

Optional Build

↓

Preview Generation

↓

Incremental Sync

Never clone repositories unnecessarily.

---

# Temporary Workspace Policy

Repositories must never become permanent storage.

Workflow:

Clone

↓

Analyze

↓

Extract Metadata

↓

Delete Workspace

Acklet stores knowledge—not repositories.

---

# Data Ownership Rules

Acklet stores:

- Metadata
- AI summaries
- Search indexes
- Knowledge graph
- Tool metadata
- Analytics
- Repository history
- Embeddings

Acklet must NOT permanently store:

- Source code
- Git history
- node_modules
- vendor
- build outputs
- binaries
- caches
- .git directory

---

# Security Standards

Never:

Execute arbitrary repository code

Trust Dockerfiles

Run containers as root

Expose secrets

Disable authentication

Disable authorization

Disable SSL verification

Hardcode credentials

Store tokens in logs

Store secrets in source code

Store private repository data without authorization

Always:

Encrypt secrets

Validate permissions

Limit execution

Sandbox builds

Restrict resources

Delete temporary workspaces

Rotate credentials

Validate every external input

---

# Docker Standards

Every container must:

Run as non-root

Have CPU limits

Have Memory limits

Have Storage limits

Have Timeout limits

Be disposable

Be isolated

Never mount sensitive host directories.

---

# Performance Rules

Avoid:

Blocking operations

Repeated cloning

Repeated analysis

Repeated API requests

Large synchronous tasks

Unnecessary allocations

Repeated database queries

Always prefer:

Caching

Streaming

Pagination

Batch processing

Incremental synchronization

Connection pooling

Background processing

---

# Caching Policy

Cache whenever possible.

Examples:

Repository Metadata

README

Directory Tree

Releases

Framework Detection

Dependencies

AI Summaries

Invalidate caches intelligently.

Never cache secrets.

---

# Logging Rules

Every important operation must log:

Operation Name

Repository ID

Workspace ID

Correlation ID

Provider

Duration

Status

Failure Reason

Never log:

Passwords

Tokens

Secrets

SSH Keys

OAuth Credentials

JWT Secrets

Private repository content

---

# Error Handling

Never ignore exceptions.

Never swallow errors.

Always:

Provide context

Log failures

Retry transient failures

Fail fast on configuration issues

Return meaningful messages

---

# API Standards

Every API must:

Be versioned

Be documented

Validate input

Validate authorization

Return meaningful errors

Be idempotent where applicable

Never expose internal implementation details.

---

# AI Engineering Rules

AI must never invent:

Framework APIs

Library APIs

Configuration

Environment variables

SDK methods

Database schema

Framework behavior

Lifecycle hooks

Build processes

Infrastructure assumptions

If information is missing:

STOP.

Research.

Validate.

Then continue.

---

# Hallucination Prevention

Before generating any implementation ask:

Is this supported by:

- Official documentation?
- Acklet codebase?
- Reference repository?
- Framework documentation?

If NO:

Do not invent.

State assumptions clearly.

Never present assumptions as facts.

---

# Decision Framework

When stuck:

1. Define the problem.
2. Search Acklet codebase.
3. Read REFERENCE.md.
4. Study the reference project.
5. Read official documentation.
6. Compare approaches.
7. Explain trade-offs.
8. Recommend the best solution.
9. Wait for confirmation if architecture changes.

Never guess.

---

# Code Review Checklist

Before every commit verify:

✓ Single Responsibility

✓ No duplicated logic

✓ Dependency Injection

✓ Interfaces where appropriate

✓ Security reviewed

✓ Performance reviewed

✓ Tests added

✓ Logs added

✓ Documentation updated

✓ No secrets committed

---

# Prohibited Practices

Never:

Copy source code

Copy UI

Copy architecture blindly

Copy database schema

Copy APIs

Copy naming conventions

Guess implementations

Disable security

Ignore failures

Commit secrets

Ignore logging

Ignore tests

Optimize without measurement

---

# Required Practices

Always:

Measure first

Understand first

Think before coding

Write maintainable code

Write readable code

Document architectural decisions

Prefer composition over inheritance

Prefer explicitness over magic

Prefer simplicity over complexity

---

# When Studying Reference Projects

Ask:

Why was this built?

What problem does it solve?

What constraints existed?

Is the same problem present in Acklet?

Can Acklet solve it differently?

Can Acklet solve it better?

Extract principles—not code.

---

# External Dependency Rules

Every external dependency must be evaluated for:

Security

Maintenance

Community adoption

License

Performance

Long-term viability

Do not add dependencies without justification.

---

# Documentation Rules

Every significant feature must include:

Purpose

Architecture

Flow

Trade-offs

Security considerations

Performance considerations

Future improvements

---

# Quality Gates

A feature is complete only if:

Architecture approved

Security reviewed

Performance acceptable

Tests passing

Documentation updated

Logging present

No duplicated code

No critical warnings

No secrets

No known regressions

---

# Golden Rules

1. Acklet is an independent product.
2. Reference projects teach engineering, not implementation.
3. Never copy—always understand.
4. Design for Acklet's domain.
5. Security is never optional.
6. Performance must be measurable.
7. Every repository is untrusted.
8. Temporary workspaces only.
9. Metadata is the product—not source code.
10. AI must never hallucinate.
11. If unsure, stop and investigate.
12. Every architectural decision must have a documented reason.
13. Every line of code should solve a real problem.
14. Simplicity is preferred over cleverness.
15. Long-term maintainability is more important than short-term speed.

---

# Final Principle

**Acklet is built by learning from world-class engineering—not by reproducing world-class products.**

Every external project is a teacher.

None of them are a template.

The objective is to understand the engineering principles behind successful systems and create solutions that align with Acklet's own architecture, product vision, and long-term goals.
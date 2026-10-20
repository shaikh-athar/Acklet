# Acklet Tools — Documentation Structure & Guidelines

## Overview

This document defines the folder structure and documentation organization for each tool in Acklet. Use this as a template for all tools (Online Clipboard, QR Generator, Image Compressor, PDF Compressor, DataLens, etc.).

---

## Folder Structure

```
/Users/ayaz/Acklet/docs/Acklet Vault/Acklet/Tools/
├── [Tool-Name]/
│   ├── 0-Requirements/
│   │   ├── features.md               (Feature list, scope, non-scope)
│   │   ├── requirements.md           (Baseline, must-haves, nice-to-haves)
│   │   ├── library-selection.md      (Libraries chosen, rationale, alternatives)
│   │   ├── api-contract.md           (Backend endpoints, request/response, if applicable)
│   │   └── phased-breakdown.md       (Phase 1/2/3+ scope, timeline, deliverables)
│   │
│   ├── 1-Progress/
│   │   ├── phase-1-progress.md       (What's done, what's pending, blockers)
│   │   ├── phase-2-progress.md       (When started)
│   │   ├── implementation-log.md     (Weekly/sprint log, decisions made, learnings)
│   │   └── issues-and-fixes.md       (Bugs found, how they were resolved)
│   │
│   ├── 2-Implementation/
│   │   ├── component-tree.md         (Architecture, component structure)
│   │   ├── service-design.md         (Services, methods, state management)
│   │   ├── styling-guide.md          (CSS vars, typography, spacing, responsive)
│   │   ├── testing-strategy.md       (Unit, E2E, accessibility tests)
│   │   └── deployment.md             (Hosting, build, environment vars)
│   │
│   └── 3-Reference/
│       ├── glossary.md               (Tool-specific terms, abbreviations)
│       ├── faq.md                    (Common questions, answers)
│       ├── links.md                  (External references, libraries, docs)
│       └── learnings.md              (What worked, what didn't, patterns)
```

---

## Folder Descriptions

### 0-Requirements/
**Purpose**: "What needs to be done?" Baseline, scope, libraries, phases.
**When to write**: Before coding starts.
**Who updates**: Product owner + tech lead.

| File | Contents |
|------|----------|
| `features.md` | Feature list (MVP + Phase 2/3), scope (in/out), user stories and acceptance criteria. |
| `requirements.md` | Baseline (must-have), extras (nice-to-have), constraints (size, performance). |
| `library-selection.md` | Frontend/backend libraries (chosen, version, why), rejected alternatives + reasons. |
| `api-contract.md` | Backend endpoints (if any), request/response schemas, error codes, auth, rate limits. |
| `phased-breakdown.md` | Phase 1/2/3+ scope, deliverables, timeline, milestones. |

---

### 1-Progress/
**Purpose**: "What have we done?" Current state, blockers, decisions.
**When to write**: Weekly or per-phase. Living document.
**Who updates**: Developer + tech lead.

| File | Contents |
|------|----------|
| `phase-1-progress.md` | Completion estimate, done list, in progress, pending, blockers. |
| `phase-2-progress.md` | Phase 2 progress, started when Phase 1 is done, dependencies on Phase 1. |
| `implementation-log.md` | Chronological timeline log, decisions made, technical choices, learnings. |
| `issues-and-fixes.md` | Bug reports, discovery context, root causes, fixes applied, prevention. |

---

### 2-Implementation/
**Purpose**: "How did we build it?" Architecture, design, testing, deployment.
**When to write**: As you build (parallel to 1-Progress).
**Who updates**: Developer.

| File | Contents |
|------|----------|
| `component-tree.md` | ASCII component tree, parent-child relationships, data flow, standalone flags. |
| `service-design.md` | Services list, purpose, key methods, state management, external dependencies. |
| `styling-guide.md` | CSS variables, typography, spacing scale, responsive breakpoints, dual-theme. |
| `testing-strategy.md` | Unit tests, E2E user flows, WCAG accessibility checklist, performance targets. |
| `deployment.md` | Build process, environment variables, hosting/subdomains, Caddy routing. |

---

### 3-Reference/
**Purpose**: "Where do I find info?" Glossary, FAQs, links, lessons.
**When to write**: Ongoing, as questions arise.
**Who updates**: Anyone who learns something.

| File | Contents |
|------|----------|
| `glossary.md` | Tool-specific terms, acronyms, and technical definitions. |
| `faq.md` | Common architectural, product, and developer questions and answers. |
| `links.md` | External references, library documentation, RFCs, and related Acklet docs. |
| `learnings.md` | What worked, what didn't, patterns discovered, and future iteration ideas. |

---

## Naming & Formatting Conventions

- **Tool Folder Names**: Official tool name in PascalCase with hyphens: `Online-Clipboard`, `QR-Generator`, `DataLens`.
- **Subfolder Names**: `0-Requirements`, `1-Progress`, `2-Implementation`, `3-Reference`.
- **File Names**: Lowercase with hyphens: `features.md`, `phase-1-progress.md`, `component-tree.md`.
- **Front Matter (Mandatory on All Files)**:
  ```markdown
  ---
  tool: [Tool Name]
  phase: [Phase #]
  last-updated: YYYY-MM-DD
  status: In Progress | Complete | On Hold
  ---
  ```

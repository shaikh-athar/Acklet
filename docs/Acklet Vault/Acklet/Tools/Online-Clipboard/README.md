---
tool: Online Clipboard
phase: 1
last-updated: 2026-10-20
status: Complete
---

# Online Clipboard — Complete Engineering Documentation Hub

Welcome to the canonical engineering and architectural documentation hub for **Online Clipboard by Acklet** (`clipboard.localhost:4200` / `https://clipboard.acklet.com`).

Online Clipboard is a high-performance, private, zero-signup digital workspace to instantaneously share text snippets, rich links, images, documents, folders, and large binary files across any two devices in seconds.

---

## Documentation Structure Index

```text
/Users/ayaz/Acklet/docs/Acklet Vault/Acklet/Tools/Online-Clipboard/
├── 0-Requirements/
│   ├── features.md               (Feature list, scope, non-scope, user stories)
│   ├── requirements.md           (Baseline must-haves, extras, constraints, capacity limits)
│   ├── library-selection.md      (Libraries chosen, rationale, rejected alternatives)
│   ├── api-contract.md           (REST & SSE endpoints, request/response schemas, errors)
│   └── phased-breakdown.md       (Phase 1/2/3+ scope, timeline, deliverables)
│
├── 1-Progress/
│   ├── phase-1-progress.md       (100% completion status, shipped capabilities, blockers)
│   ├── phase-2-progress.md       (Phase 2 roadmap, dependencies, planned tasks)
│   ├── implementation-log.md     (Chronological timeline log, decisions made, learnings)
│   └── issues-and-fixes.md       (Bugs found, root cause analysis, fixes applied)
│
├── 2-Implementation/
│   ├── component-tree.md         (ASCII component hierarchy, signal graph, data flow)
│   ├── service-design.md         (Services, method signatures, storage hierarchy)
│   ├── styling-guide.md          (CSS tokens, typography, spacing, responsive adapters)
│   ├── testing-strategy.md       (14 unit test suites, E2E flows, WCAG accessibility)
│   └── deployment.md             (Subdomain routing, Caddy, Spring Boot, build configs)
│
└── 3-Reference/
    ├── glossary.md               (Tool-specific terms, acronyms, technical definitions)
    ├── faq.md                    (Common questions and in-depth answers)
    ├── links.md                  (External specifications, standards, related Acklet docs)
    └── learnings.md              (What worked, what failed, architectural retrospectives)
```

---

## 1. Quick Navigation Table

| Section | Key Document | Description | Status |
| :--- | :--- | :--- | :--- |
| **0. Requirements** | [features.md](0-Requirements/features.md) | Scope boundaries, feature capabilities, user stories | **Complete** |
| | [requirements.md](0-Requirements/requirements.md) | Baseline requirements, nice-to-haves, capacity limits | **Complete** |
| | [library-selection.md](0-Requirements/library-selection.md) | Angular 22, Web Crypto, ZipBuilder, Spring Boot | **Complete** |
| | [api-contract.md](0-Requirements/api-contract.md) | REST APIs, chunked streaming protocol, SSE streams | **Complete** |
| | [phased-breakdown.md](0-Requirements/phased-breakdown.md) | Phase 1 baseline vs Phase 2/3 roadmap | **Complete** |
| **1. Progress** | [phase-1-progress.md](1-Progress/phase-1-progress.md) | 100% Phase 1 baseline completion verification | **Complete** |
| | [phase-2-progress.md](1-Progress/phase-2-progress.md) | Phase 2 OCR, code highlighting, and WebRTC specs | **Planned** |
| | [implementation-log.md](1-Progress/implementation-log.md) | Chronological development milestones and decisions | **Complete** |
| | [issues-and-fixes.md](1-Progress/issues-and-fixes.md) | Concurrent updates, click debouncing, keepalive | **Complete** |
| **2. Implementation**| [component-tree.md](2-Implementation/component-tree.md) | Component architecture, signals, data flow | **Complete** |
| | [service-design.md](2-Implementation/service-design.md) | Services inventory, method signatures, storage | **Complete** |
| | [styling-guide.md](2-Implementation/styling-guide.md) | Canonical dual-theme design tokens, responsive layout | **Complete** |
| | [testing-strategy.md](2-Implementation/testing-strategy.md) | 14 automated unit test suites, WCAG AA audit | **Complete** |
| | [deployment.md](2-Implementation/deployment.md) | Subdomain routing, Caddy, Spring Boot multipart | **Complete** |
| **3. Reference** | [glossary.md](3-Reference/glossary.md) | Terminology, acronyms, CAS, E2EE, PBKDF2 | **Complete** |
| | [faq.md](3-Reference/faq.md) | Architectural, product, and developer FAQs | **Complete** |
| | [links.md](3-Reference/links.md) | RFCs, W3C WebCrypto, Spartan UI, Lucide icons | **Complete** |
| | [learnings.md](3-Reference/learnings.md) | Retrospective on Web APIs, scroll chaining, keepalive | **Complete** |

---

## 2. Core Architectural Highlights

1. **Zero Accounts & Frictionless Pairing**: Short 5-digit base-32 code (`23456789abcdefghjkmnpqrstuvwxyz`) or custom unique alias, with modal QR code pairing.
2. **WYSIWYG Text Canvas**: Rich text editing with bold interactive auto-links (`target="_blank"`), selection-preserving floating formatting popover, and brand accent word-wrap toggle.
3. **Resilient Large-File Streaming**: 200 MB single file ceiling, 500 MB room quota, automatic 5 MB chunk slicing with verified 50% drop recovery and SHA-256 deduplication.
4. **Native Folder Drag-and-Drop**: Client-side recursive directory traversal automatically bundled into `.zip` archives via in-browser `ZipBuilder` before transmission.
5. **Zero-Knowledge E2EE**: Browser-native `AES-GCM-256` payload encryption with PBKDF2 room key derivation; server stores only ciphertext blobs.
6. **Multi-Tier Real-Time Transport**: Same-origin multi-tab sync via `BroadcastChannel` (0ms latency) combined with Server-Sent Events (SSE) for cross-device updates.
7. **Dual-Theme High Contrast Design**: Full WCAG AA/AAA compliance using canonical Acklet `tool-shell` tokens (`tokens.css`).

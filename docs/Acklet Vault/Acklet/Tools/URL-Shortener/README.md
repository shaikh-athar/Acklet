---
tool: URL Shortener
phase: 1
last-updated: 2026-10-28
status: Production Ready
---

# URL Shortener: Engineering Documentation Hub

This hub contains the engineering and architectural documentation for URL Shortener by Acklet (`urlshortener.localhost:<port>` / `https://urlshortener.acklet.com`).

URL Shortener is an enterprise-grade link shortening service built inside the Acklet ecosystem. It provides server-side persistence in PostgreSQL, universal link resolution via `/s/{code}`, server-enforced expiration and scheduling, concurrency-safe click limits, server-rendered accessible password unlock with zero plaintext destination leakage, and deep handoff to QR Generator.

---

## Documentation Structure Index

```text
docs/Acklet Vault/Acklet/Tools/URL-Shortener/
├── 0-Requirements/
│   ├── features.md               (Feature scope, Phase 1 server capabilities, non-scope, user workflows)
│   └── requirements.md           (Validation rules, SSRF guards, Base62 logic, backend config keys, V56 schema)
│
├── 1-Progress/
│   └── phase-1-progress.md       (Phase 1 implementation deliverables checklist, test logs, verification)
│
├── 2-Implementation/
│   ├── service-design.md         (Service contracts, REST API, ShortRedirectService, 10-step redirect engine)
│   └── component-tree.md         (UI architecture, signals state flow, client-server delegation)
│
└── 3-Reference/
    └── faq.md                    (Privacy, security, server storage, retention, BCrypt upgrade, FAQ catalog)
```

---

## Quick Navigation Table

| Section | Key Document | Description | Status |
| :--- | :--- | :--- | :--- |
| **0. Requirements** | [features.md](0-Requirements/features.md) | Scope boundaries, Phase 1 server capabilities, user workflows | **Complete** |
| | [requirements.md](0-Requirements/requirements.md) | Validation rules, security guards, backend config keys, V56 schema | **Complete** |
| **1. Progress** | [phase-1-progress.md](1-Progress/phase-1-progress.md) | Phase 1 milestone deliverables, verification, test results | **Complete** |
| **2. Implementation** | [service-design.md](2-Implementation/service-design.md) | REST endpoints, ShortRedirectService, atomic SQL, legacy upgrade | **Complete** |
| | [component-tree.md](2-Implementation/component-tree.md) | Angular signals, client delegation, route forwarding to /s/code | **Complete** |
| **3. Reference** | [faq.md](3-Reference/faq.md) | Server storage, retention, password upgrade, IP privacy, FAQ | **Complete** |

---

## Tool Overview & Surface Isolation

- **Surface**: `Tools` (`client/apps/tool-urlshortener/`) & Spring Boot Backend (`server/acklet/src/main/java/com/code/acklet/tool/tools/shortener/`)
- **Shared Shell**: `client/packages/tool-shell`
- **Registry**: `client/packages/tool-registry` (Category: `Links/Web`, slug: `urlshortener`)
- **Local Address**: `http://urlshortener.localhost:<port>` (dynamically detected)
- **Backend API**: `/api/v1/short-links`
- **Public Short Links**: `/s/{code}`
- **Theme Identity**: Calm Bronze / Amber (`--btn-primary-bg: #C98B4E`), WCAG AA high-contrast in both Light and Dark themes
- **Icon**: Lordicon animated chain/link icon (`link.json`), dynamically recolored to amber

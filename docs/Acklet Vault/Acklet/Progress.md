# Acklet Project Audit & Execution Review

This document contains the comprehensive audit and execution review of the Acklet project.

---

## Phase 1 – Understand the Product

### What Acklet is
Acklet is a unified workspace platform for digital tools. It provides developer, productivity, and document utilities (e.g. JSON formatter, PDF utilities, JWT decoder, QR generator) that run locally in a secure sandbox workspace. Additionally, it offers a "Publishing" pipeline to connect Git repositories, detect frameworks, analyze them with AI, and publish custom tools to the Acklet environment.

### The Problem it Solves
- **Tool Fragmentation**: Users must currently visit dozens of separate websites for simple tools (e.g., pdfmerge.com, jwt.io, jsonlint.com), dealing with heavy ads, cookie consent banners, and slow load times.
- **Data Privacy & Security Leakage**: Submitting sensitive company files, customer JSON datasets, or proprietary JWTs to random online decoders/converters exposes that data to external cloud backends.
- **Workflow Interruption**: Developers and knowledge workers lack a unified local dashboard to pin, customize, search, or automate their most frequent operational helpers.

### Target Users
- **Software Engineers & DevOps**: Need fast, offline-first developer utilities without data egress risks.
- **Information/Productivity Workers**: Need immediate document manipulation (PDF split, compress, image convert) and productivity generators (QR codes, barcode engines).
- **Tool Publishers / Open-source Creators**: Want to connect their Git repositories, detect frameworks, and publish utility tools to a standardized hub.

### Long-Term Vision
Acklet aims to become the definitive "Operating System for Digital Utilities." In the long term, it plans to support team workspaces, public marketplace community templates, automated multi-step utility workflows (e.g. JWT decode -> extract JSON field -> format output), and fully sandboxed container-based local runtimes for arbitrary micro-utilities.

### Focus of Phase 1
Phase 1 focuses on:
1. **Developer Experience Core**: Establish the baseline for key client-side utilities.
2. **Repository Import Pipeline**: Enable connecting a GitHub account, importing repository structure/metadata, analyzing the directory trees, and running AI-based project understanding.
3. **Workspace Dashboard foundation**: Creating the favorites, history tracking, and collections interfaces.

### Success Metrics for Phase 1
- **Discovery Latency**: Sub-10ms query matching on local indices.
- **Privacy Assurance**: 100% of standard core tools execute fully on the client-side without API calls.
- **Import Pipeline Completion**: Successfully fetching repository metadata, trees, health metrics, and generating the Repository Knowledge Graph (RKG) via AI.

---

## Phase 2 – Review Documentation

Based on the documentation files located in `docs/Acklet Vault/Acklet`:

### 1. Product Vision
Acklet acts as a secure sandbox gateway to avoid data leakage while bringing all single-purpose utilities under a unified, high-performance UI shell.

### 2. Architecture
- **Clean Architecture & Feature-First Package Strategy**: Packages like `auth`, `user`, `tool`, `collection`, `github`, `notification`, `ai`, and `search` keep business boundaries separated.
- **Spring Application Events**: Decouples services (e.g. verification signals trigger notification handlers).
- **PostgreSQL + pgvector**: Database for account details, repository metadata, repository tree indexing, and vector embeddings for repository analysis.

### 3. Functional Requirements
- **Solutions & Categories Directory**: Live search, filtering, and detail page specifications.
- **Tool Sandbox Execution**: Execution workspace allowing copy/clear.
- **Workspace Panel**: Dashboard, favorites, and history tracking.
- **Repository Import Pipeline**: GitHub connection, importing metadata, analyzing directory structure, and running AI generation.

### 4. Non-Functional Requirements
- **Security**: No telemetry for standard utilities, stateless JWT session tokens, BCrypt passwords, secure sandbox execution.
- **Performance**: High visual polish, minimal layout shifts, fast initial page load.
- **Accessibility**: Keyboard navigation, readable color contrast across dual-theme modes.

### 5. Roadmap
- **Phase 1**: Core developers, document utilities, repository parser.
- **Phase 2**: User accounts, persistent history sync, custom collections.
- **Phase 3**: AI-assisted experiences, workflow builder.
- **Phase 4**: Community public publishing, templates, review system.

### 6. Gaps & Conflict Analysis
- **Conflict**: The documentation defines tools as running "fully client-side" in browser memory with "zero telemetry sandbox guarantee", yet both the frontend `ToolsService` and backend `ToolExecutionController` implement a `/tools/{id}/execute` REST endpoint designed to route inputs to a backend execution engine, register ports, and return execution logs.
- **Missing Documentation**: The specifications for backend sandbox compilation/hosting (Docker runtimes, Kubernetes, VM isolators) are completely absent from the architecture documents.

---

## Phase 3 – Analyze Current Codebase

### Frontend (Angular 22 + TailwindCSS 4 + GSAP + Lenis)
- Fully implemented shell templates (`MainLayout`, `ShellLayout`) and core routing.
- Pages: `home`, `about`, `contact`, `tools/explore`, `categories`, `blog`, `community/discussions`, `workspace/repositories`, `workspace/tools`, `workspace/dashboard`.
- Components are visually premium, using modern backlights, GSAP scroll animations, and clean layouts.
- Inactive placeholders exist for many workflows (e.g., Launch Sandbox button triggers a browser `alert()` instead of launching a sandbox pane).

### Backend (Spring Boot + Maven + JPA)
- Features package-by-feature layout: `auth`, `user`, `github`, `tool`, `ai`, `search`, etc.
- Implements stateless JWT auth with refresh token rotation and onboarding checks.
- Implements GitHub Connect OAuth workflow and a queue-based Repository Import Pipeline using RabbitMQ.

### Database & Migrations (Flyway + PostgreSQL)
- 31 database migrations are defined.
- Main schemas cover `users`, `user_profiles`, `refresh_tokens`, `categories`, `tools`, `repositories`, `repository_metadata`, `repository_statistics`, `repository_health`, `repository_trees`, `repository_projects`, `repository_knowledge_graph`.
- Schema features `pgvector` extensions for repository embedding storage.

### AI Integration
- Integrates with LangChain4j.
- Implements `MistralProvider` as the primary router.
- `AiRepositoryAnalysisEngine` handles repository understanding, architecture style inference, and documentation completeness scoring.

### RabbitMQ & Background Workers
- Defines exchanges and queues for metadata fetching, tree fetching, and AI analysis.
- `RepositoryImportWorkers` listens to queue events and processes metadata, builds project structure lists, and executes LLM queries.

---

## Phase 4 – Feature Audit

| Feature | Status | Explanation | Priority |
| :--- | :---: | :--- | :---: |
| **Authentication & Profile** | ✅ Completed | Register, login, email verification via OTP, JWT generation/rotation, onboarding flag check, profile updates. | High |
| **Workspace Shell** | ✅ Completed | Premium dual-theme sidebar layout, navigation, and dashboard canvas structure. | High |
| **Repository Import Pipeline** | 🟡 Partially | RabbitMQ asynchronous metadata and tree fetching works. Monorepo sub-project detection works. However, it relies heavily on fallback mock meta when GitHub API keys are absent. | High |
| **AI Repository Analysis** | 🟡 Partially | AI-based repository understanding prompt and architecture inference are implemented via LangChain4j but currently only Mistral is wired; Gemini configuration is absent. | Medium |
| **Repository Sync / Webhooks** | 🟡 Partially | DB schema has webhook registers, but webhook handler (`GitHubWebhookController`) lacks complete active synchronizer execution logic. | Medium |
| **Tool Catalog & Categories** | ✅ Completed | Categories listing, details page metadata, upvoting, and category filters are fully implemented. | High |
| **Tool Execution Sandbox** | ⚠ Broken | Frontend just triggers an `alert('Tool sandbox interface launching locally.')` when trying to run tools, and the backend execution endpoint (`/tools/{id}/execute`) is a mock logging simulator. | High |
| **Discussions & Blogs** | ✅ Completed | Public blog and community discussions thread/replies are fully integrated with backend endpoints. | Medium |
| **Collections & Favorites** | 🟡 Partially | Favorites and custom collections are stored in client's `localStorage` rather than synchronized in the PostgreSQL DB schema. | Medium |

---

## Phase 5 – Workflow Audit

### 1. GitHub Connection
- **Current Flow**: User hits `/api/v1/auth/github` -> Redirects to GitHub OAuth -> Callback updates `github_accounts` table.
- **Expected Flow**: Connects successfully and updates workspace with connected badge.
- **Issues/Failure Points**: Relies on system env variables (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`) being active.

### 2. Repository Import & Analysis
- **Current Flow**: User initiates import -> REST request queues job in RabbitMQ -> Metadata worker fetches details -> Tree worker builds file list -> AI engine queries LLM -> Job completes.
- **Expected Flow**: Background process completes and populates repositories dashboard.
- **Issues/Failure Points**: If RabbitMQ connection is down, fallback handles it but the queue processing stops. If the repository is massive, GitHub API limits may trigger.

### 3. Tool Execution Pipeline
- **Current Flow**: User clicks "Launch Sandbox" -> Triggers browser alert. If API called directly, backend allocates port and returns mock execution logs.
- **Expected Flow**: Spawning container or browser sandbox running compilation targets.
- **Issues/Failure Points**: Completely missing client-side interactive sandbox, and backend runtime spawning is unbuilt.

---

## Phase 6 – Architecture Review

### Scalability
- **Strengths**: Clean Architecture boundaries, asynchronous background processing via RabbitMQ queues.
- **Weaknesses**: Dynamic port allocation is currently local in-memory (`ToolRegistryService` uses `ConcurrentHashMap` and `AtomicInteger` for port assignments), which breaks down in clustered multi-node environments.

### Maintainability
- **Strengths**: Solid Maven structure and clean package separation. High-density Angular signals pattern.
- **Weaknesses**: Mix of mock fallbacks and real code in controllers (e.g. `ToolExecutionController`) makes it confusing to isolate production configurations.

---

## Phase 7 – Database Review

- **Strengths**: Schema is normalized, leverages Flyway migration files sequentially, handles UUIDs, auditing fields, and index definitions correctly.
- **Weaknesses**:
  - `collections` are modeled in DB schema (V1 init and V30 wizard) but the frontend `WorkspaceStateService` exclusively persists them to `localStorage`.
  - `user_history` and `user_favorites` tables exist in PostgreSQL but frontend services do not utilize them.

---

## Phase 8 – API Review

- **Auth Gateway (`/api/v1/auth/*`)**: Working. Proper request payloads and validation.
- **Projects Controller (`/api/v1/projects/*`)**: Working. Lists, deletes, unlinks, fetches tree structure and health details.
- **Tools Catalog (`/api/v1/tools/*`)**: Working for metadata and recommendations.
- **Tool Execution (`/api/v1/tools/{id}/execute`)**: Mocked. Simulates log arrays and returns static result payloads.

---

## Phase 9 – Frontend Review

- **Home, About, Contact**: Working, static views.
- **Tools List & Categories**: Working, dynamic search filters.
- **Tool Detail Page**: Working, metadata fetched dynamically. The main CTA ("Launch Sandbox") triggers a browser alert.
- **Workspace Dashboard, History, Favorites, Collections**: Partially static. Mostly read-only or written to `localStorage`.

---

## Phase 10 – Tool Execution Review

Can Acklet currently perform the execution pipeline?
- **Import Repository**: Yes.
- **Analyze Repository**: Yes (Framework/monorepos detected).
- **Detect Framework**: Yes.
- **Build Tool / Run Tool**: **No**.
- **Assign URL / Execute / Return Output**: **No** (Simulated with static mock text and fake log strings).

---

## Phase 11 – Deployment Review

- **Current Model**: Docker compose services are defined for local PostgreSQL, Redis, and RabbitMQ. Spring backend can run inside the provided Dockerfile.
- **Missing Elements**:
  - Production deployment configurations (Kubernetes charts or cloud templates).
  - Runtime environment isolation layer (e.g., Docker out of Docker configuration, or firecracker microVMs) to safely spin up untrusted developer-built tools.

---

## Phase 12 – Technical Debt

- **Dead/Stub Code**: `ToolRegistryService` port incrementer, `executeTool` simulation logic, and unused local stub methods in `WorkspaceStateService.ts`.
- **Inconsistencies**: Local storage replication of database entities (Collections and Favorites).
- **Overengineering**: Complex Spring application events and pgvector schemas for a system that currently lacks a real execution sandbox.

---

## Phase 13 – Security Review

- **Container Safety**: Untrusted tools cannot be compiled or run currently. Spin-up configurations lack sandboxing bounds.
- **Secrets Management**: Fallback keys are visible in `application-local.yaml` (e.g., default Gmail credentials, local JWT secret, fallback Mistral API key).

---

## Phase 14 – Performance Review

- **Frontend**: Excellent. Angular signals keep state transitions instantaneous, while GSAP animations use hardware acceleration.
- **Database/Queue**: RabbitMQ handles async queues efficiently. Cache targets are configured via Spring `@Cacheable`.

---

## Phase 15 – Gap Analysis

| Capability Gap | Complexity | Priority | Description |
| :--- | :---: | :---: | :--- |
| **Real Tool Sandbox Execution** | High | High | Run client-side WebAssembly components or back-end containerized runtimes instead of displaying mock alerts. |
| **Persistent Workspace Sync** | Low | Medium | Migrate Collections, Favorites, and Execution History from local storage to PostgreSQL database endpoints. |
| **Complete Gemini API integration** | Low | Low | Fully implement the `GeminiProvider` fallback component using LangChain4j. |

---

## Phase 16 – Master Roadmap

### Phase 2A: Persistent Workspace Sync (Milestone 1)
- **Objective**: Link client workspace settings, collections, and favorites to backend database APIs.
- **Tasks**: Update `WorkspaceStateService` to call `/api/v1/collections` and `/api/v1/users/me/preferences` instead of `localStorage`.

### Phase 2B: Real Sandbox Runtimes (Milestone 2)
- **Objective**: Implement secure isolated execution environment.
- **Tasks**: Integrate Docker-based sandbox runners or WebAssembly loaders for compiling and running tools securely.

---

## Phase 17 – Final Report Summary

1. **Production Readiness Score**: **45%** (Base services, database model, UI design, and import pipeline work well; execution sandbox is missing/simulated).
2. **Recommended Next Milestone**: Persistent Workspace Sync (migrating local storage state to backend endpoints).

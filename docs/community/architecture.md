# Architecture Specification — Acklet Docs & Community

## 1. High-Level Architecture

```
[ Browser Client: docs.localhost:4200 / docs.acklet.com ]
                       │
             Angular 19 Application
  (Standalone Components, Signals, Docs Design System)
                       │
                       ▼
            docsAuthInterceptor
  (Bearer Token, withCredentials: true, X-Correlation-ID)
                       │
                       ▼
          [ Spring Boot Backend: 8080 ]
                 DocController
                       │
                  DocService
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
 DocRepository                 UserRepository
(Documents & Sections)       (Author Identification)
       │                               │
       └───────────────┬───────────────┘
                       ▼
             [ PostgreSQL: 5433 ]
```

---

## 2. Frontend Subdomain Routing & Multi-Tenant Bootstrapping

### Subdomain Detection (`@acklet/shared`)
The root entry point `client/src/main.ts` inspects `window.location.hostname`.
- If `isDocsHostname(hostname)` returns `true` (matches `docs.*` or `docs`), or query parameter `tool=docs` is present:
  - Dynamically loads `DocsAppComponent` from `client/apps/tool-docs/src/app/docs-app.component.ts`.
  - Configures `provideHttpClient(withFetch(), withInterceptors([docsAuthInterceptor]))`.
  - Configures `provideRouter(DOCS_ROUTES, withComponentInputBinding())`.
- If dynamic import or bootstrapping fails, an automated reload recovery and interactive fallback screen prevents blank-page lockup.

### Root Shell & Component Hierarchy
```
<DocsAppComponent> (selector: 'app-root')
   │
   └── <router-outlet>
         │
         ├── <DocShellComponent> (Shell layout with navbar & sidebar)
         │     ├── <DocsCommunityComponent> (Route: '/')
         │     ├── <DocsDashboardComponent> (Route: '/dashboard')
         │     └── <DocsEditorComponent> (Route: '/:docId')
         │
         ├── <DocsPublicViewComponent> (Route: '/p/:slug' - Standalone reader)
         └── <DocsNotFoundComponent> (Route: '**')
```

---

## 3. Authentication & Cross-Subdomain Credentials

### Security Context
- Acklet Portal auth stores tokens in `localStorage` under `acklet_access_token` and uses cross-origin session cookies when configured.
- `docsAuthInterceptor` intercepts all outgoing HTTP requests from `tool-docs`:
  - Attaches `Authorization: Bearer <token>` (falling back to development demo token if unauthenticated in local testing).
  - Configures `withCredentials: true` to forward session cookies across subdomains.
  - Attaches unique `X-Correlation-ID` header for end-to-end request tracing.

---

## 4. Backend Architecture & Spring Boot Endpoints

### Endpoint Layout (`DocController.java`)
- `GET /api/v1/docs/public/feed`: Unauthenticated community feed with pagination, search, and sorting. Maps author IDs to author names using `UserRepository`.
- `GET /api/v1/docs/public/{slug}`: Unauthenticated single published document by unique slug.
- `GET /api/v1/docs`: Authenticated document list belonging to the current user (filtered by status, search, sort).
- `POST /api/v1/docs`: Authenticated document creation.
- `GET /api/v1/docs/{id}`: Authenticated document details with full sections.
- `PUT /api/v1/docs/{id}`: Authenticated document update (title, summary, sections).
- `POST /api/v1/docs/{id}/publish`: Authenticated publication action (generates slug, sets `PUBLISHED` status).
- `POST /api/v1/docs/{id}/unpublish`: Authenticated unpublish action (reverts to `DRAFT`).
- `POST /api/v1/docs/{id}/duplicate`: Authenticated document duplication.
- `DELETE /api/v1/docs/{id}`: Authenticated soft/hard deletion.

---

## 5. State Management & Reactivity
- **Angular Signals**: All component states (`documents`, `feed`, `searchQuery`, `feedTab`, `selectedTopic`, `activeNav`, `isSaving`) leverage Angular Signals (`signal`, `computed`, `update`).
- **Reactive Streams**: Debounced user inputs (`Subject<string>` piped through `debounceTime(300)` and `distinctUntilChanged()`) eliminate redundant backend round-trips during live searches.

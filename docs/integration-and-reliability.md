# Acklet End-to-End Integration & Product Reliability

This document outlines the audited integration boundaries, verified defects, workflow traces, and system reliability characteristics across Acklet's frontend applications, shared packages, Spring Boot backend, PostgreSQL database, Redis cache, and RabbitMQ message broker.

For verification commands, see [verification-guide.md](./verification-guide.md).
For UI architecture and token references, see [ui-design-system.md](./ui-design-system.md).
For tool-specific specifications, see [online-clipboard.md](./online-clipboard.md).
For build and runtime configurations, see [build-configuration.md](./build-configuration.md).

---

## 1. Audited Integrations Overview

| Component | Technology | Role & Integration Points |
| :--- | :--- | :--- |
| **`acklet-portal`** | Angular 21 (SPA) | Core portal, user authentication, tool registry, discovery, workspace, reviews, blog, admin. |
| **`tool-online-clipboard`** | Angular 21 (Subdomain App) | Real-time clipboard sharing, text/link sync, file uploads, PIN protection, end-to-end crypto. |
| **`tools-hub`** | Angular 21 (Micro-app) | Tools catalog, direct tool routing, iframe/subdomain shell bridge. |
| **`tool-shell`** | Shared Angular Package | Canonical dual-theme design system, headers, footers, theme toggle, and about modal. |
| **Spring Boot Backend** | Java 21 / Spring Boot 3.3 | REST API gateway, JWT auth, RBAC, domain entities, rate limiting, and event publishing. |
| **PostgreSQL** | Database (Port 5433 / 5432) | Persistent relational store for users, tools, reviews, categories, sessions, and clipboard shares. |
| **Redis** | In-Memory Cache (Port 6379) | Rate limiting (`RateLimitingService`), token blacklist, brute force protection, and OAuth state. |
| **RabbitMQ** | Message Broker (Port 5672) | Asynchronous domain events (`tool.published`, `tool.updated`, `tool.reviewed`, `notification.create`, repo import pipeline). |

---

## 2. Verified Integration Defects & Resolutions

### Defect 1: CORS Preflight Failure on Custom Header `X-Owner-Token`
- **Symptom**: When `tool-online-clipboard` attempted to save text (`POST /api/v1/clipboard/shares/{code}/text`) or delete an item (`DELETE /api/v1/clipboard/shares/{code}/items/{itemId}`), the browser sent an HTTP `OPTIONS` preflight request. The preflight failed with HTTP 403 because Spring Security's `corsConfigurationSource` rejected `X-Owner-Token`.
- **Impact**: The Angular service caught the CORS error and silently fell back to local in-memory storage (`mockStore`), preventing real server-side persistence.
- **Root Cause**: `server/acklet/src/main/java/com/code/acklet/shared/security/SecurityConfig.java` listed standard headers (`Authorization`, `Content-Type`, etc.) in `setAllowedHeaders()` and `setExposedHeaders()`, but omitted `X-Owner-Token`.
- **Resolution**: Added `"X-Owner-Token"` to both `setAllowedHeaders()` and `setExposedHeaders()` in `SecurityConfig.java`. Browser preflights now succeed with HTTP 200, allowing mutations to persist in PostgreSQL.

### Defect 2: Hardcoded Localhost API Base URLs in Angular Services
- **Symptom**: Multiple Angular services hardcoded `'http://localhost:8080/api/v1'`, completely bypassing Angular's environment configuration replacement (`environment.prod.ts` -> `https://api.acklet.com/api/v1`).
- **Impact**: Any production deployment or staging environment pointed API requests directly to the client's `localhost:8080`, causing total failure of network communication outside local development.
- **Affected Files**:
  - `client/src/app/core/services/tools.service.ts`
  - `client/src/app/core/services/auth.service.ts`
  - `client/src/app/core/services/reviews.service.ts`
  - `client/src/app/core/services/blog.service.ts`
  - `client/src/app/core/services/community.service.ts`
  - `client/src/app/core/services/admin.service.ts`
  - `client/src/app/core/services/notification.service.ts`
  - `client/src/app/core/services/publisher.service.ts`
  - `client/src/app/core/services/workspace-state.service.ts`
  - `client/src/app/core/services/github.service.ts`
  - `client/src/app/pages/workspace/projects/publish-preview/publish-preview.ts`
  - `client/src/app/pages/workspace/projects/publish-wizard/publish-wizard.ts`
- **Resolution**: Refactored all affected services to import and consume `environment.apiBaseUrl`, guaranteeing correct runtime URL resolution across development, staging, and production environments.

---

## 3. Workflow Traces

### Workflow A: Clipboard Creation, Retrieval, and Text Sync
```
User Action: Open clipboard URL / Enter text & click Save
  │
  ▼
Angular Component: `ClipboardComponent` (tool-online-clipboard)
  │ (Checks active session in localStorage; reads route params)
  ▼
Frontend Service: `ClipboardApiService`
  │ (Sends HTTP POST /api/v1/clipboard/shares/{code}/text with X-Owner-Token)
  ▼
Spring Security: `SecurityConfig` (CORS preflight validated -> RateLimitingFilter -> JwtAuthFilter)
  │
  ▼
Controller: `ClipboardController.addTextItem()`
  │
  ▼
Service & Repository: `ClipboardService` -> `ClipboardShareRepository` / `ClipboardItemRepository`
  │
  ▼
Database: PostgreSQL table `clipboard_items` (Stores text content, encryption flag, byte size, timestamp)
  │
  ▼
Response: HTTP 200 `ApiResponse<ClipboardItemDto>`
  │
  ▼
UI State: `ClipboardComponent` updates reactive signals (`items`, `lastSavedTimestamp`), shows toast feedback.
```

### Workflow B: Authentication & Session Token Rotation
```
User Action: Google Sign-In or Page Load
  │
  ▼
Angular Service: `AuthService.refreshToken()` (Triggered silently on app start)
  │ (Sends HTTP POST /api/v1/auth/refresh with HttpOnly cookie)
  ▼
Http Interceptor: `authInterceptor`
  │ (Appends X-Correlation-ID, X-XSRF-TOKEN, withCredentials: true)
  ▼
Spring Controller: `AuthController.refresh()`
  │
  ▼
Auth Service: `AuthService.refreshToken()`
  │ (Verifies refresh token against Redis blacklist / DB session record)
  ▼
Token Generation: `JwtTokenProvider` (Issues new access token & rotates refresh token)
  │
  ▼
Response: HTTP 200 with rotated `acklet_refresh_token` HttpOnly Set-Cookie + access token in body
  │
  ▼
UI State: `AuthService.currentUser` signal populated; workspace navigation unlocked.
```

### Workflow C: Tool Discovery and Community Reviews
```
User Action: Browse tool details / Submit tool rating & review
  │
  ▼
Angular Component: `ToolDetailComponent` / `ReviewsService`
  │ (Calls GET /api/v1/tools/{slug} and POST /api/v1/tools/{slug}/reviews)
  ▼
Spring Controller: `ToolController` & `ToolReviewController`
  │
  ▼
Domain Service: `ToolReviewService`
  │ (Persists review to PostgreSQL `tool_reviews` table)
  ▼
Event Bus: `RabbitMqEventPublisher.publishToolReviewed()`
  │ (Publishes ToolReviewedEventMessage to RabbitMQ exchange `tools.exchange`)
  │ (Resilient fallback: logs warning if broker is offline without blocking HTTP request)
  ▼
UI State: Review list refreshed in UI, average rating recomputed, success toast emitted.
```

---

## 4. Gaps and Incomplete Backend Functionality

The following endpoints and capabilities exist on the frontend client interfaces but lack corresponding backend handlers:

1. **Clipboard File Upload & Chunking Endpoints**:
   - `POST /api/v1/clipboard/shares/{code}/files` (Direct file upload)
   - `POST /api/v1/clipboard/shares/{code}/uploads/init` (Chunk upload session init)
   - `PUT /api/v1/clipboard/shares/{code}/uploads/{uploadId}/chunks/{chunkNumber}` (Chunk data upload)
   - `POST /api/v1/clipboard/shares/{code}/uploads/{uploadId}/complete` (Upload completion)
   - *Status*: The backend `ClipboardController.java` currently handles text items only. File chunking and storage (e.g., S3 or local disk storage) are planned for future backend expansion.
2. **Clipboard WebSocket Handler**:
   - `ws://localhost:8080/ws/clipboard/raw`
   - *Status*: `ClipboardSyncService` attempts WebSocket connection for instant push updates. Since the backend lacks a WebSocket endpoint, `ClipboardComponent` automatically activates its built-in fallback (`startReactivePollingFallback`), querying `GET /api/v1/clipboard/shares/{code}` every 3 seconds to maintain sync without crashes.

---

## 5. Verification Results

Full verification executed via `node scripts/verify.mjs --level=C`:

| Check | Scope | Result | Duration |
| :--- | :--- | :--- | :--- |
| **Glass Styling Constraints** | Regex / Token audit | **PASSED** | 0.05s |
| **Tool Shell Isolation** | Surface boundaries | **PASSED** | 0.32s |
| **TypeScript Compilation** | Project references (`tsc -b`) | **PASSED** | 2.77s |
| **Shared Unit Tests** | Vitest suite | **PASSED** | 0.62s |
| **Backend Test Compilation** | Maven `test-compile` | **PASSED** | 2.25s |
| **Tool App Production Build** | `tool-online-clipboard` | **PASSED** | 9.39s |
| **Backend Unit Tests** | Crypto & Security suites | **PASSED** | 3.73s |
| **Portal Production Build** | `acklet-portal` | **PASSED** | 9.72s |
| **Tools Hub Production Build** | `tools-hub` | **PASSED** | 6.66s |
| **Spring Boot Context Load** | `AckletApplicationTests` | **PASSED** | 11.86s |
| **Total Verification Time** | **10 / 10 Checks Passed** | **PASSED** | **47.38s** |

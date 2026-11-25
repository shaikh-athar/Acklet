# Implementation & Change Log — Acklet Docs

## Date: 2026-11-19

### 1. Root Cause Fix for Blank Page & Writing Workflow Blocker
- **Issue A (HTTP 403 Forbidden on Write)**: In `client/src/main.ts`, Docs was bootstrapped via `provideHttpClient(withFetch())` without interceptors or credentials. Consequently, calls to `/api/v1/docs` lacked `Authorization: Bearer <token>` and `withCredentials: true`, returning HTTP 403 Forbidden.
  - **Resolution**: Implemented `docsAuthInterceptor` (`client/apps/tool-docs/src/app/interceptors/docs-auth.interceptor.ts`) attaching bearer tokens, credentials, and `X-Correlation-ID`. Registered with `provideHttpClient(withFetch(), withInterceptors([docsAuthInterceptor]))`.
- **Issue B (Silent Blank Screen on Dynamic Import Error)**: In `main.ts`, if Vite rebuilds or stale chunks occur, `catch` logged to console and left `<app-root>` completely empty.
  - **Resolution**: Enhanced `main.ts` with auto-reload recovery for stale chunks and a fallback UI screen inside `<app-root>` with a reload button.
- **Issue C (Spring Boot Route Matching Conflict)**: In `DocController.java`, `/public/{slug}` took precedence over `/public/feed`, causing calls to `/public/feed` to attempt fetching a document with slug "feed" instead of the feed list.
  - **Resolution**: Placed `@GetMapping("/public/feed")` ahead of `@GetMapping("/public/{slug}")`.

---

### 2. Community Reading Experience Implementation
- Created `DocsCommunityComponent` (`client/apps/tool-docs/src/app/pages/community/docs-community.component.ts`):
  - 3-column desktop layout (Left sidebar, Center feed, Right metadata sidebar).
  - Feed tabs: "For you" / "Latest".
  - Search input with debounced querying.
  - Topic chips: "All", "Architecture", "Engineering", "Guides", "Tools", "Product".
  - Article cards with author initials, name, date, title, summary, reading time, and "Read →" link.
  - Right sidebar with "About Acklet Docs", trending topic tags, and creator workspace card.
  - Thoughtful empty states for no published stories vs. no search filter results.

---

### 3. Writer Experience & Global Shell Alignment
- Consolidated all write actions to **exactly ONE primary "Write" button** in the top navbar (`DocShellComponent`).
- Streamlined `DocsDashboardComponent` to focus strictly on author document management ("Your Stories", "Drafts", "Published", search, sort, duplicate, delete).
- Created distinguishable interactive states in `docs-theme.css`:
  - Hover: elevated background, subtle border.
  - Selected / Active: elevated card background, 600 semi-bold weight, solid 3px left indicator bar (`border-left: 3px solid var(--foreground)`).

---

### 4. Verification & Testing
- Backend test compilation: `./mvnw test-compile` (0 errors, build successful).
- Angular frontend build: `npx ng build --configuration=development` (0 errors, build successful).
- End-to-end automated workflow executed via Chrome DevTools Protocol:
  - Step 1: Navigated to Community discovery page (`http://docs.localhost:4200/`).
  - Step 2: Clicked single global Write button -> document created via `POST /api/v1/docs`.
  - Step 3: Edited Title and Section content -> autosaved cleanly via `PUT /api/v1/docs/:id`.
  - Step 4: Published document via publish modal -> status changed to `PUBLISHED`.
  - Step 5: Verified document presence in writer dashboard (`/dashboard`).
  - Step 6: Verified document appearance in public community feed (`/`) and reader view (`/p/:slug`).
  - Step 7: Captured light & dark mode screenshots across 1440px desktop and 375px mobile viewports.

# Implementation Audit — Acklet Community & Writer Workspace

**Date**: 2026-11-19  
**Branch**: `tool-docs-editor`  
**Target Domain**: `docs.localhost:4200` (production: `docs.acklet.com`)

---

## 1. What Is Already Implemented & Working

1. **Document CRUD & Ordered Sections**:
   - `DocController` & `DocService` support creating documents, updating title/summary, adding sections, updating section heading/body, deleting sections, reordering sections, and duplicating documents.
   - PostgreSQL schema (`doc_documents`, `doc_sections`) with migrations `V60` through `V63`.
   - Tool-independent document architecture with global unique public slugs (`V63`).
2. **Editor & Autosave Engine**:
   - Section editor with debounced autosave (1500ms), manual save, and live saving/saved status indication.
   - Block types (Heading, Paragraph, Code, Quote, Callout) with markdown formatting helpers.
   - Edit/Preview mode toggle.
3. **Public Community Discovery Feed & Public Reader**:
   - `GET /api/v1/docs/public/feed` returns published stories.
   - `GET /api/v1/docs/public/{slug}` returns rendered public stories.
   - `DocsCommunityComponent` displays 3-column feed with search, topic filters, and article cards.
4. **Monochrome Design System (Vercel Preset)**:
   - Complete OKLCH monochrome tokens (`oklch(0.99 0 0)` / `oklch(0 0 0)` base, `oklch(0.92 0 0)` / `oklch(0.26 0 0)` borders).
   - Distinguishable hover and selected navigation indicator states (`border-left: 3px solid var(--foreground)`).
   - Solid black primary buttons in light mode, solid white primary buttons in dark mode.

---

## 2. What Is Broken or Incomplete

1. **Route Collision on Root `:docId`**:
   - `DOCS_ROUTES` placed `:docId` directly at the root (`/:docId`), which captures ANY path like `/write`, `/account`, `/library`, or `/profile` as a document ID.
   - **Fix**: Re-route editor to `/write/:documentId` and `/write`, reserving distinct route spaces for `/account/documents`, `/account/drafts`, `/account/published`, `/profile/:username`, `/library/history`, `/library/bookmarks`, `/library/following`, and `/notifications`.
2. **Hardcoded Authentication State**:
   - `DocsAuthService` had a hardcoded default user (`user@acklet.com`, `role: ADMIN`), preventing anonymous visitor detection and proper logged-out UI rendering.
   - **Fix**: Remove mock default user; initialize as `null`; check actual session/token; distinguish between anonymous visitors, authenticated readers, authors, and admins.
3. **Published Documents Modified Live in Editor**:
   - Currently, editing a published document updates `doc_sections` immediately, exposing unfinished draft edits to public readers.
   - **Fix**: Implement draft-vs-published snapshotting (`published_content` JSONB column on `doc_documents`) so readers continue seeing the published snapshot until the author explicitly re-publishes.
4. **Missing Community Engagement Tables & APIs**:
   - Author Following: No table or endpoints.
   - Bookmarks: No table or endpoints.
   - Reading History: No table or endpoints.
   - Notifications: No table or endpoints.
   - Public Author Profiles: `UserController` only supports `/me`, not public profiles by author ID or username.

---

## 3. Plan of Execution

1. **Database Migration (`V64__community_foundation.sql`)**:
   - Add `published_content` JSONB to `doc_documents` for live published snapshotting.
   - Add `bio` and `username` to `user_profiles`.
   - Create `doc_author_follows` table with uniqueness and self-follow constraint.
   - Create `doc_bookmarks` table with uniqueness constraint.
   - Create `doc_reading_history` table with uniqueness constraint.
   - Create `doc_notifications` table with read states and timestamps.
2. **Backend Domain Implementation**:
   - Entities, Repositories, DTOs, and Services for Follows, Bookmarks, Reading History, Notifications, and Author Profiles.
   - Update `DocService` to serve snapshot on public reader and update snapshot on publish.
   - Controllers: `DocEngagementController` or expand `DocController`.
3. **Frontend Routes & Navigation Overhaul**:
   - Dedicated `/write` and `/write/:documentId` routes.
   - Dedicated `/account/documents`, `/account/drafts`, `/account/published`.
   - Dedicated `/library/history`, `/library/bookmarks`, `/library/following`.
   - Dedicated `/profile/:username` and `/notifications`.
   - Logged-out navbar (Sign In, Get Started) vs. Logged-in navbar (Single Write button, Notifications bell with count, Profile avatar).
   - Sidebar with 5 logical groups: DISCOVER, YOUR LIBRARY, YOUR WRITING, ACCOUNT, PLATFORM.
4. **Authentication Flow & Protected Route Guards**:
   - In-app Sign In / Sign Up modal on Docs domain + redirect support with `returnUrl`.
   - `docsAuthGuard` to protect `/write`, `/account/*`, `/library/*`, `/notifications`.
   - Anonymous actions (Write, Bookmark, Follow) prompt auth modal or redirect.
5. **Testing & Documentation**:
   - Update all 14 markdown files in `docs/community/`.
   - Execute verification suite `node scripts/verify.mjs -B`.

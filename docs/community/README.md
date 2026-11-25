# Acklet Docs — Community & Publishing Platform

## 1. Overview & Vision
Acklet Docs is a dedicated content publishing, technical documentation, and community platform operating on its own domain (`docs.localhost:4200` in development, `docs.acklet.com` in production). Completely independent from Acklet's single-purpose browser utilities, Acklet Docs empowers engineers, writers, and technical creators to publish, discover, and consume technical documentation, guides, and developer stories.

The design system strictly adheres to the monochrome **Vercel preset** (referenced from 21st.dev) using OKLCH tokens (`oklch(0.99 0 0)` / `oklch(0 0 0)` base, `oklch(0.92 0 0)` / `oklch(0.26 0 0)` borders), providing a clean, distraction-free reading and writing interface.

---

## 2. Product Architecture & Two Distinct Experiences

Acklet Docs cleanly partitions into two distinct user journeys:

### A. Community / Reading Experience (`/`)
- **Purpose**: Public discovery feed for technical documentation and community articles.
- **Layout**: 3-column desktop layout (Left navigation sidebar, Center feed column, Right discovery sidebar).
- **Features**:
  - Feed tabs: "For you" (curated discovery) and "Latest" (chronological order).
  - Search bar with instant debounced keyword filtering.
  - Topic chips: "All", "Architecture", "Engineering", "Guides", "Tools", "Product".
  - Real-time article cards featuring author avatar, author name, publication date, reading time estimation, summary, topic pill, and direct reader link.
  - Trending topics and "About Acklet Docs" metadata in the right sidebar.
  - Responsive collapse: right sidebar hides on screens under 1280px; left sidebar transitions to a drawer under 1024px.

### B. Writer / Creator Workspace (`/dashboard`)
- **Purpose**: Author management suite ("Your Stories") for drafting, editing, and publishing.
- **Features**:
  - Filter tabs: "All", "Drafts", "Published".
  - Search input with clear button.
  - Sort selector: "Last Modified", "Title (A–Z)".
  - Story cards with status badge (`DRAFT` vs `PUBLISHED`), last edited time, section count, and action buttons (Edit, Duplicate, Delete).
  - Empty states with targeted guidance and quick creation action.

---

## 3. Global Navigation & The Single "Write" Entry Point
- Across the entire Acklet Docs application (Community feed, Writer dashboard, Reader view), there is **exactly ONE primary "Write" action** located in the global top navbar.
- Redundant "New Document" and "Create Document" buttons have been removed from view headers, preventing visual clutter and workflow confusion.
- Clicking the global "Write" action initiates a `POST /api/v1/docs` call, creates a new document with default title and lead section, and immediately transitions the user into the distraction-free editor at `/:docId`.

---

## 4. Key Routes
| Route | Component | Purpose |
| :--- | :--- | :--- |
| `/` | `DocsCommunityComponent` | Public community discovery feed |
| `/dashboard` | `DocsDashboardComponent` | Author creator workspace ("Your Stories") |
| `/:docId` | `DocsEditorComponent` | Distraction-free section editor with autosave |
| `/p/:slug` | `DocsPublicViewComponent` | High-contrast public article reader view |
| `**` | `DocsNotFoundComponent` | 404 fallback formatted in Docs design system |

---

## 5. Getting Started
- **Development Server**: Run `npm start` in `client/` and access `http://docs.localhost:4200/`.
- **Backend Service**: Run `./mvnw spring-boot:run "-Dspring-boot.run.profiles=local"` in `server/acklet/` on port 8080.
- **PostgreSQL**: Running on port 5433 with schema `acklet_local`.

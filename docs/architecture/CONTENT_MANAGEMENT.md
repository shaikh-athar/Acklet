# Acklet — Content Management Architecture: Stories, Tools & Collections

## 1. Executive Summary

Acklet's Content Management Architecture organizes platform content into three distinct, specialized domain primitives:

1. **Stories**: Editorial content written by authors (tutorials, how-to guides, technical deep-dives, comparisons, and opinions) powered by the sectioned block editor and rendered in reading typography.
2. **Tools**: Software products, platforms, libraries, and utilities cataloged with structured product metadata (pricing models, repository links, website URLs, logos, covers, and technical documentation).
3. **Collections**: Curated bundles containing ordered references to existing Tools (e.g., "Developer Productivity Toolkit", "Essential AI Tools") with custom ordering and per-tool descriptions.

This separation prevents model pollution, guarantees clean database relationships, preserves individual entity lifecycles, and delivers a unified management workbench.

---

## 2. Core Domain Models

### A. Stories (`DocDocument` & `DocSection`)
- **Responsibility**: Author-driven editorial content and documentation guides.
- **Key Attributes**: `id`, `title`, `slug`, `summary`, `status` (`DRAFT`, `PUBLISHED`), `publishedAt`, `publishedContent` (JSONB snapshot), `ownerId`, `authorName`, `sectionCount`, `createdAt`, `updatedAt`.
- **Content Structure**: Linked `DocSection` rows with `heading`, `body`, and integer `position`.

### B. Tools (`Tool` & `ToolKnowledge`)
- **Responsibility**: Platform software products, utilities, and developer applications.
- **Key Attributes**: `id`, `name`, `slug`, `tagline`, `description`, `category_id`, `publisher_id`, `website_url`, `github_url`, `logo_url`, `cover_url`, `pricing_type` (`FREE`, `FREEMIUM`, `PAID`, `OPEN_SOURCE`), `is_open_source`, `status` (`DRAFT`, `PENDING`, `ACTIVE`, `ARCHIVED`, `REJECTED`), `usage_count`.
- **Knowledge Base**: Linked `ToolKnowledge` holding structured advantages, limitations, and platform support.

### C. Collections (`Collection` & `collection_tools`)
- **Responsibility**: Curated, ordered showcases of existing Tools.
- **Key Attributes**: `id`, `user_id` (curator), `name`, `slug`, `cover_image`, `description`, `introduction`, `is_public`, `status` (`DRAFT`, `PUBLISHED`, `ARCHIVED`), `published_at`, `seo_metadata` (JSONB), `tools` (ordered list).
- **Association Rule**: Join table `collection_tools` stores `(collection_id, tool_id, position, notes)`. Tools are strictly referenced by ID and never duplicated.

---

## 3. Database Schema & Flyway Migrations

The database migration `V65__content_management_collections_and_tools.sql` extends the schema:

```sql
-- Collections Table Enhancements
ALTER TABLE collections
    ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE,
    ADD COLUMN IF NOT EXISTS cover_image VARCHAR(500),
    ADD COLUMN IF NOT EXISTS introduction TEXT,
    ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS seo_metadata JSONB DEFAULT '{}'::jsonb;

-- Collection Tools Join Table Enhancements
ALTER TABLE collection_tools
    ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS notes TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_collections_slug ON collections(slug);
CREATE INDEX IF NOT EXISTS idx_collections_status ON collections(status);
CREATE INDEX IF NOT EXISTS idx_collections_user_status ON collections(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tools_status ON tools(status);
CREATE INDEX IF NOT EXISTS idx_tools_publisher_status ON tools(publisher_id, status);
CREATE INDEX IF NOT EXISTS idx_collection_tools_order ON collection_tools(collection_id, position);
```

---

## 4. Content Management Navigation & Routes

The authenticated content workspace provides a standardized 4-part navigation in `doc-shell.component.ts`:

| Section | Route | Component | Purpose |
| :--- | :--- | :--- | :--- |
| **Overview** | `/overview` | `DocsOverviewComponent` | Metrics cards, quick actions, and recent activity feed. |
| **Stories** | `/stories` | `DocsDashboardComponent` | Author editorial drafts, published articles, and writing launcher. |
| **Tools** | `/tools-admin` | `DocsToolsManagementComponent` | Cataloged software products, verification status, and tool lifecycle. |
| **Collections** | `/collections` | `DocsCollectionsManagementComponent` | Tool collections, ordering workbench, and public publishing. |

### Detail & Editor Routes:
- **Write Story**: `/write` & `/write/:docId` (`DocsEditorComponent`), `/write/:docId/publish` (`DocsPublishPageComponent`)
- **Tool Editor**: `/tools-admin/new` & `/tools-admin/:slug` (`DocsToolEditorComponent`)
- **Collection Editor**: `/collections/new` & `/collections/:id` (`DocsCollectionEditorComponent`)

---

## 5. Lifecycle & Workflows

### A. Stories Workflow
1. **Create**: User clicks `+ New Story` → Backend creates a draft `DocDocument`.
2. **Draft & Autosave**: Debounced auto-save periodically persists sections to `/api/v1/docs/documents/{id}/sections`.
3. **Publish**: User navigates to publish workbench → provides summary & title → Backend generates public slug and creates immutable JSONB snapshot.
4. **Lifecycle Actions**: Duplicate (draft clone), Unpublish (revert to draft), Delete (soft delete).

### B. Tools Workflow
1. **Create Draft**: Publisher submits product name, category, website, and pricing model.
2. **Metadata & Docs**: Publisher enriches tagline, detailed description, cover image, and GitHub repository.
3. **Publish / Submit**: Publisher activates or submits tool (`DRAFT` → `ACTIVE` / `PENDING`).
4. **Lifecycle Actions**: Duplicate, Unpublish to draft, Archive, Delete.

### C. Collections Workflow
1. **Create Draft**: Curator enters collection name, slug, cover image, and introduction.
2. **Tool Selection**: Curator searches existing catalog tools and adds them to collection.
3. **Arrangement & Ordering**: Curator reorders tools using Move Up (↑) / Move Down (↓) buttons (mapped to `position` in `collection_tools`).
4. **Publish**: Sets status to `PUBLISHED` (`is_public = true`).
5. **Safety Constraints**:
   - Only tools with `ToolStatus.ACTIVE` appear in public collection views.
   - Unpublished or archived tools are safely filtered out of public views without breaking collection structure.
   - Publishing a collection NEVER automatically publishes unapproved tools.

---

## 6. API Specifications

### Collections API (`/api/v1/collections`)
- `GET /api/v1/collections/me?q={query}&status={status}&page={page}&size={size}`: Paginated user collections.
- `GET /api/v1/collections/public`: Public collections list (active tools only).
- `GET /api/v1/collections/public/slug/{slug}`: Public collection profile by slug.
- `GET /api/v1/collections/{id}`: Detailed collection entity (curator or public).
- `POST /api/v1/collections`: Create new collection.
- `PUT /api/v1/collections/{id}`: Update collection details and ordered tool references.
- `POST /api/v1/collections/{id}/duplicate`: Create a draft duplicate.
- `POST /api/v1/collections/{id}/publish`: Publish collection.
- `POST /api/v1/collections/{id}/unpublish`: Unpublish collection.
- `POST /api/v1/collections/{id}/archive`: Archive collection.
- `DELETE /api/v1/collections/{id}`: Soft delete collection.

### Tools Publisher API (`/api/v1/publisher/tools`)
- `GET /api/v1/publisher/tools?q={query}&status={status}&page={page}&size={size}`: Paginated publisher tools.
- `POST /api/v1/publisher/tools`: Create tool draft.
- `PUT /api/v1/publisher/tools/{slug}`: Update tool metadata.
- `POST /api/v1/publisher/tools/{slug}/duplicate`: Duplicate tool to draft.
- `POST /api/v1/publisher/tools/{slug}/submit`: Submit / activate tool.
- `POST /api/v1/publisher/tools/{slug}/unpublish`: Revert tool to draft.
- `POST /api/v1/publisher/tools/{slug}/archive`: Archive tool.
- `DELETE /api/v1/publisher/tools/{slug}`: Soft delete tool.

---

## 7. Dual-Theme & Design System Standards

- **Zero-Specificity Reset**: Reset styles use `:where(.docs-app)` to ensure default inheritance without clobbering component classes.
- **OKLCH Neutral Palette**: Strict monochrome palette (`--docs-color-bg`, `--docs-color-card`, `--docs-color-border`, `--docs-color-text`, `--docs-color-action-bg`) with WCAG AA compliance (contrast >= 4.5:1).
- **High Contrast Action Buttons**: Primary pill buttons enforce `color: var(--docs-color-action-text) !important` to eliminate black-on-black text bugs.
- **Cascade Layer Order**: `@layer reset, tokens, base, layout, components, pages, utilities;` ensures predictable precedence without selector battles.

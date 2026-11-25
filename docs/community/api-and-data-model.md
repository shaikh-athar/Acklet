# API Specification & Data Model — Acklet Docs

## 1. REST API Endpoints

### Public Endpoints (Unauthenticated)

#### 1. Get Community Public Feed
- **Method**: `GET`
- **Path**: `/api/v1/docs/public/feed`
- **Query Parameters**:
  - `q` (string, optional): Keyword search matching title or summary.
  - `sort` (string, optional): Sort criteria (`recent`, `title`, default: `recent`).
  - `page` (integer, optional, default: 0): Page index.
  - `size` (integer, optional, default: 20): Items per page.
- **Response** (`200 OK`):
```json
[
  {
    "id": "c1f7a048-b391-4cf5-9988-51829e24681a",
    "title": "Building Scalable Architecture on Acklet",
    "slug": "building-scalable-architecture-on-acklet",
    "summary": "A deep dive into modular micro-frontends and reactive signal stores.",
    "toolSlug": null,
    "toolName": null,
    "status": "PUBLISHED",
    "publishedAt": "2026-11-19T14:30:00Z",
    "updatedAt": "2026-11-19T14:30:00Z",
    "sectionCount": 4,
    "authorId": "a1b2c3d4-0000-0000-0000-000000000001",
    "authorName": "Athar"
  }
]
```

#### 2. Get Public Article by Slug
- **Method**: `GET`
- **Path**: `/api/v1/docs/public/{slug}`
- **Response** (`200 OK`): Returns complete document object including all rendered sections.
- **Response** (`404 Not Found`): If slug does not exist or document status is `DRAFT`.

---

### Author Endpoints (Authenticated)

#### 3. List Author Documents
- **Method**: `GET`
- **Path**: `/api/v1/docs`
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**: `status` (`ALL`, `DRAFT`, `PUBLISHED`), `q`, `sort`.

#### 4. Create New Document
- **Method**: `POST`
- **Path**: `/api/v1/docs`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
```json
{
  "title": "Untitled Document",
  "toolSlug": null
}
```

#### 5. Update Document & Sections
- **Method**: `PUT`
- **Path**: `/api/v1/docs/{id}`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
```json
{
  "title": "Updated Title",
  "summary": "Updated summary text",
  "sections": [
    {
      "id": "section-id-uuid",
      "heading": "Introduction",
      "content": "Markdown text here...",
      "sectionType": "PARAGRAPH",
      "sortOrder": 0
    }
  ]
}
```

#### 6. Publish Document
- **Method**: `POST`
- **Path**: `/api/v1/docs/{id}/publish`
- **Headers**: `Authorization: Bearer <token>`

#### 7. Unpublish Document
- **Method**: `POST`
- **Path**: `/api/v1/docs/{id}/unpublish`
- **Headers**: `Authorization: Bearer <token>`

#### 8. Duplicate Document
- **Method**: `POST`
- **Path**: `/api/v1/docs/{id}/duplicate`
- **Headers**: `Authorization: Bearer <token>`

#### 9. Delete Document
- **Method**: `DELETE`
- **Path**: `/api/v1/docs/{id}`
- **Headers**: `Authorization: Bearer <token>`

---

## 2. PostgreSQL Data Model

### `doc_documents` Table
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key | Unique document identifier |
| `user_id` | `UUID` | Not Null, FK to users | Document author owner |
| `title` | `VARCHAR(255)` | Not Null | Document headline |
| `slug` | `VARCHAR(255)` | Unique, Indexed | URL path identifier for public reader |
| `summary` | `TEXT` | Nullable | Document abstract / excerpt |
| `tool_slug` | `VARCHAR(64)` | Nullable | Optional link to Acklet browser tool |
| `status` | `VARCHAR(32)` | Not Null | `DRAFT` or `PUBLISHED` |
| `published_at` | `TIMESTAMPTZ` | Nullable | Initial publication timestamp |
| `created_at` | `TIMESTAMPTZ` | Not Null | Creation audit timestamp |
| `updated_at` | `TIMESTAMPTZ` | Not Null | Modification audit timestamp |

### `doc_sections` Table
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key | Unique section block identifier |
| `document_id` | `UUID` | Not Null, FK to doc_documents | Parent document reference |
| `heading` | `VARCHAR(255)` | Nullable | Section heading |
| `content` | `TEXT` | Not Null | Section body / code / quote content |
| `section_type` | `VARCHAR(32)` | Not Null | `PARAGRAPH`, `HEADING`, `CODE`, etc. |
| `sort_order` | `INT` | Not Null | Sequential ordering index |
| `created_at` | `TIMESTAMPTZ` | Not Null | Creation audit timestamp |
| `updated_at` | `TIMESTAMPTZ` | Not Null | Modification audit timestamp |

# Writing Workflow — Authoring, Editing, Autosave & Publishing

## 1. End-to-End Creator Journey

```
[ Top Navbar: Write Button ]
              │
              ▼
    POST /api/v1/docs
 (Creates Document & Initial Lead Section)
              │
              ▼
   Navigate to /:docId
 (Distraction-Free Editor)
              │
    ┌─────────┴─────────┐
    ▼                   ▼
Type Title         Add Sections (Markdown, Code, Quote, Callout)
    │                   │
    └─────────┬─────────┘
              ▼
    Debounced Autosave (1500ms)
    PUT /api/v1/docs/:docId
 (Status indicator: Saving... -> Saved)
              │
              ▼
       [ Publish Button ]
              │
              ▼
    Publish Review Modal
 (Slug preview, summary, author confirmation)
              │
              ▼
  POST /api/v1/docs/:docId/publish
 (Status changes to PUBLISHED, public slug assigned)
              │
              ▼
Article Live in Public Feed (/) & Reader View (/p/:slug)
```

---

## 2. Editor Mechanics & Section Architecture

### Data Structure
Every document comprises:
- `title`: Top-level document title.
- `summary`: Short editorial abstract used in search results, social previews, and cards.
- `sections`: Ordered array of content blocks:
  - `HEADING`: Section heading (H2/H3).
  - `PARAGRAPH`: Standard markdown body copy.
  - `CODE`: Syntax-highlighted code block with language selection.
  - `QUOTE`: Formatted blockquote with citation.
  - `CALLOUT`: Informational highlight box.

### Autosave Engine
- Any keystroke inside document title, summary, or section content triggers the autosave subject.
- Piped through `debounceTime(1500)` to batch rapid keystrokes into a single HTTP `PUT` payload.
- State indicator transitions smoothly:
  - Idle -> `Saving...` (muted pulse) -> `Saved` (crisp checkmark) -> (fades to idle).
  - On network disruption -> `Save failed — retrying...` with manual save trigger.

### Safe Navigation (`pendingChangesGuard`)
- Angular router guard prevents accidental data loss if the author attempts to navigate away while an autosave is currently pending or saving.
- Prompts the user with a confirmation modal before leaving the page.

---

## 3. Publication & Unpublication Lifecycle

### Publishing Modal
1. Author clicks "Publish" in the editor top toolbar.
2. Review modal opens with:
   - Generated slug preview (`/p/:slug`).
   - Summary / excerpt editor.
   - Word count and estimated read time.
3. Confirming publication dispatches `POST /api/v1/docs/:id/publish`.
4. Document status transitions to `PUBLISHED` and `publishedAt` timestamp is recorded.

### Unpublishing
- In the editor or author dashboard, the author can select "Unpublish".
- Dispatches `POST /api/v1/docs/:id/unpublish`.
- Document status reverts to `DRAFT`.
- The document is immediately removed from the public community feed (`/api/v1/docs/public/feed`) and reader route returns 404 for unauthenticated readers.

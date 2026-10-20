---
tool: Online Clipboard
phase: 1
last-updated: 2026-10-20
status: Complete
---

# Online Clipboard — Requirements & Technical Constraints

## 1. Baseline Requirements (Must-Haves)

1. **Zero-Account Operation**: The tool must be immediately functional upon initial load without requiring user sign-in, cookies, or registration.
2. **Ephemeral Pairing**: Rooms must be accessible via 5-digit alphanumeric codes (`23456789abcdefghjkmnpqrstuvwxyz`) or custom unique aliases.
3. **Clean URL Routing**: Active rooms must be mapped cleanly to path variables (`/${code}`) without fragment hashes (`#`).
4. **Rich Text Editing**: WYSIWYG editor supporting standard rich formatting (headings, lists, bold, italics, code blocks) with auto-detected interactive bold links.
5. **Multi-File Uploads**: Simultaneous ingestion of multiple files via drag-and-drop, standard file selection, and system clipboard paste (`window:paste`).
6. **Resilient Chunked Streaming**: Files larger than 5 MB must be streamed in 5 MB chunks with verified 50% drop recovery.
7. **End-to-End Encryption**: Optional zero-knowledge AES-GCM-256 client-side encryption.
8. **Automated Purge Lifecycle**: Automatic server-side permanent deletion of rooms and files upon expiration (7 days default).
9. **Responsive Design**: Full viewport-locked canvas (`100dvh`) with adaptive desktop and touch-friendly mobile layouts.

---

## 2. Extra Capabilities (Nice-to-Haves)

1. **Folder Upload with Client-Side ZIP Packaging**: Dragging an uncompressed folder automatically bundles it into a valid `.zip` archive using Web APIs (`ZipBuilder`) before transmission.
2. **Client-Side SHA-256 Deduplication**: Pre-upload hash calculation to skip duplicate uploads of identical files in the same room.
3. **Sudden-Exit Data Preservation**: Automatically sending uncommitted text changes via `fetch(..., { keepalive: true })` on `window:beforeunload` without native browser confirmation dialogs.
4. **Optimistic Concurrency & 409 Resolution**: Preventing remote overwrites with a dedicated Conflict Resolution Banner (*Keep Mine*, *Accept Incoming*, *Compare Versions*).
5. **Local Draft Recovery**: Detecting cached uncommitted keystrokes from crashed or closed sessions and offering one-click draft recovery.
6. **Multi-Tier Sync**: Instant 0ms same-origin tab reflection via `BroadcastChannel` paired with Server-Sent Events (SSE) for cross-device updates.
7. **Double-Click Selection Mechanics**: Double-clicking file cards or rows toggles selection state with debounced click timing to prevent accidental lightbox opening.
8. **Ambient Feather Fade Scroll Effect**: Pinned sticky library header with a subtle top feather gradient overlay on scroll.

---

## 3. System Constraints & Performance Targets

| Parameter | Specification | Enforcement Mechanism |
| :--- | :--- | :--- |
| **Max Single File Size** | **200 MB** (`209,715,200` bytes) | Frontend check + Spring Boot `spring.servlet.multipart.max-file-size=200MB` |
| **Max Total Room Quota** | **500 MB** (`524,288,000` bytes) | Server-authoritative validation (`app.clipboard.max-room-size=524288000`) |
| **Max Text Payload Size** | **50 MB** (`52,428,800` bytes) | Client-side input validation + backend payload ceiling |
| **Standard Chunk Size** | **5 MB** (`5,242,880` bytes) | Client `Blob.slice()` + Spring Boot chunk ingestion endpoint |
| **Default Retention Window** | **7 Days** (168 hours) | PostgreSQL `expires_at` column + scheduled hourly purge job |
| **Extended Retention Windows** | **15 Days** (360h) / **30 Days** (720h) | Stored on share record; cleaned on scheduled expiration |
| **Largest Contentful Paint (LCP)** | **< 2.0 seconds** | Monolithic bundle splitting, deferral of secondary drawers, OnPush |
| **Interaction to Next Paint (INP)** | **< 100 milliseconds** | Off-thread Web Workers, debounced sorting, virtualized scroll lists |
| **Contrast Ratio (WCAG)** | **>= 4.5:1** (AA) / **>= 7:1** (AAA) | Enforced via canonical semantic design tokens in both Light and Dark modes |

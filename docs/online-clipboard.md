# Online Clipboard Tool

## Overview
The **Online Clipboard** tool allows users to share text, links, and files across devices in real time with end-to-end optional encryption and responsive layout integration.

## Key Features & UI Structure
- **Top Strip**:
  - Displays the active **Clipboard ID** (short alphanumeric code).
  - Inline editing with uniqueness verification: users can click the edit pencil icon to set a custom unique room name (e.g. `my-test-room`), which validates and updates the room and session seamlessly.
  - Active session persistence in device storage (`localStorage['acklet_clipboard_active_code']`) so closing and reopening the browser restores the active session without loss.
  - Seamless path variable routing (`/${code}`) without fragment hashes.
  - Centered and visually balanced action links: "Copy link" and "New clipboard" with clean spacing.
  - Modern join code input in the tab row with key prefix icon, monospace typography, clear button, and arrow open action.
  - Live status indicator (real-time sync indicator).
- **Tabs**:
  - **Modern Segmented Pill Navigation**: Housing **Text & Links** and **Files & Images** tabs with smooth state transitions, balanced 16px Lucide icons, dynamic file count badges, dedicated dual-theme contrast styling, and responsive full-width centered symmetric segmented layout on mobile viewports.
  - **Text & Links**:
    - **WYSIWYG Visual Editing Surface**: Real-time rich text editor supporting headings (H1–H3), bold, italic, underline, strikethrough, inline code, code blocks, bullet/numbered lists, blockquotes, horizontal dividers, text color palettes, and highlight swatches.
    - **Preserved Focus & Selection Formatting**: Formatting toolbar popover options prevent focus loss on mouse-down, ensuring formatting operations seamlessly apply to active text selections.
    - **Interactive Link Auto-Detection & Bold Styling**: Bare URLs, `www` links, and domain names (e.g. `google.com`) are automatically formatted as interactive, bold anchor tags (`color: #0284c7` in light theme, `#38bdf8` in dark theme) with pointer cursors and click-to-open in a new tab (`target="_blank"` with `rel="noopener noreferrer"`).
    - **Dynamic Viewport-Bounded Toolbar Popover**: "More" formatting popover renders above the compact toolbar, constrained to viewport height with clean internal scrolling and unclipped layer stacking above adjacent header rows.
    - **Maximized Unobstructed Editor Canvas**: Removed top-floating buttons to give full vertical height and clear reading area to text content.
    - **Adaptive Responsive Bottom Action Bar**:
      - **Desktop & Tablets (>= 640px)**: A single, clean horizontal row across the bottom. All primary and utility buttons (`[ ⎘ Copy ]`, `[ 💾 Save ]`, `[ ↩ Wrap ]`, `[ 🔄 Refresh ]`, `[ 🕘 Revisions ]`, `[ 🗑 Clear ]`) sit in a left-aligned cluster with clear text labels, while the live status caption (`Saved 1 min ago` / `Unsaved changes`) is right-aligned.
      - **Mobile Devices (< 640px)**: A space-efficient 2-row touch layout:
        - **Row 1 (Primary Touch Targets)**: Strictly **Copy** (`[ ⎘ Copy ]`) and **Save** (`[ 💾 Save ]`) with both icons and text names side by side (50% width each), completely eliminating the redundant Paste button.
        - **Row 2 (Icon-Only Control Strip)**: Houses icon-only controls for **Wrap** (`text-wrap`), **Refresh** (`refresh-cw`), **Revisions** (`history`), and **Clear** (`trash-2`).
        - **Row 3 (Status Indicator)**: Subtle, centered status caption detailing sync state and relative saved timestamp (`Saved 2m ago` / `Unsaved changes`).
      - **Theme-Integrated Wrap Button**: When word-wrap is toggled active, the Wrap button highlights dynamically in the canonical Acklet brand accent palette (`var(--accent-soft)` with `var(--accent-strong)` text and `var(--accent)` border in light mode; `#2dd4bf` in dark mode), fully harmonized with the dual-theme design system.
    - Real-time refresh with dedicated spinning animation, concurrent request prevention, and confirmation dialog if local unsaved edits are present.
    - Full undo support for text clearing.
  - **Files & Images**:
    - Integrated file library supporting drag-and-drop, filter categories, search pill, grid/list view toggling, and multi-file downloads.
    - **Structured Single-Row Desktop & Tablet Header (>=640px)**:
      - **Left**: Sub-category filter chips (`All`, `Images`, `Files`) with item count badges.
      - **Center**: Rounded search pill input with `/` keyboard shortcut.
      - **Right**: Logically grouped controls: Filter button (with active dot), Sort button (with sliders icon), Grid/List view mode toggle, and `+ Add v` button with device, folder, and paste options.
      - **Zero 3-Dots on Big Screens**: The 3-dots button is strictly hidden on desktop and large screens, preventing visual clutter and redundant menus.
    - **Mobile-Exclusive 2-Line Header (<640px)**:
      - **Line 1**: Full-width search pill on the left + `+ Add` button on the right.
      - **Line 2**: Horizontally scrollable sub-category chips (`All`, `Images`, `Files`) on the left + compact 3-dots dropdown button (`ellipsis-vertical` / `⋮`) on the right providing access to View Mode (Grid/List), Filter files, and Sort options.
    - **Asynchronous Multi-File Upload with Real-Time Progress**: Multiple files can be selected or dropped simultaneously; uploads execute concurrently with individual progress cards showing live upload percentages (`0%` to `100%`), progress bar tracks, and one-click cancellation buttons that abort in-flight browser transfers.
    - **Immediate Server Deletion & Resurrect Prevention**: Item deletions are dispatched to the backend immediately and tracked locally in a deleted set, preventing polling cycles, auto-saves, or WebSocket sync events from resurrecting deleted items.
    - **Streaming Multipart Upload Support**: Spring Boot and Tomcat configured for up to 200 MB per file (`spring.servlet.multipart.max-file-size=200MB`) and 500 MB per request (`spring.servlet.multipart.max-request-size=500MB`), eliminating the default 1 MB limit and removing unnecessary client-side chunk init requests.
    - **Thread-Safe Room Auto-Provisioning**: Resolved `ConcurrentHashMap` recursive update errors in `ClipboardService`, ensuring robust thread-safe room auto-provisioning on file uploads and code queries.
    - SHA-256 client-side content hashing for deduplication: skips redundant uploads of identical files within the same clipboard room.
    - **Native Folder Upload & Automatic ZIP Conversion**: Users can drag and drop uncompressed folders directly into the clipboard window or choose "Upload folder" from the "+ Add" dropdown menu. Folders are recursively traversed, scanned in batches to accommodate browser batching limits, and automatically packaged into valid, standard `.zip` archives on the client side using pure Web APIs (`ZipBuilder`) before streaming to the upload pipeline.
    - **Sticky Library Header & Ambient Top Fade Scroll Effect**: The library controls alongside the sub-category filter chips (`All`, `Images`, `Files`) are housed in a top-fixed sticky header (`.files-sticky-header`) with subtle 6px backdrop blur and 96% surface fill. As the user scrolls through cards or list rows, the header remains pinned in place while items scroll underneath. A subtle 16px top gradient feather fade overlay (`::after` with gentle surface falloff) activates upon scrolling (`isFilesScrolled`), creating a restrained, natural fade-out transition into the tool surface instead of an abrupt visual cutoff or heavy blur.
    - **Double-Click Selection & Deselection (Vice Versa)**: Double-clicking any file card (grid view) or row item (list view) toggles its selection state—selecting the item if unselected, and deselecting it if already selected. Single-click preview opening is cleanly debounced so double-clicks execute smoothly without accidentally triggering modals or lightboxes.
    - 4-way deterministic sorting (`Newest first`, `Oldest first`, `Name A–Z`, `Largest first`) with stable secondary ID tiebreakers.
- **End-to-End Encryption (E2EE)**:
  - Enabled by default using Web Cryptography API (`AES-GCM-256`).
  - 12-byte random initialization vector (IV) generated per payload with 128-bit authentication tag.
  - Keys are generated client-side and transferred strictly via URL query parameters (`?key=...`) or QR codes.
  - Zero-knowledge backend: the server receives only ciphertext blobs and never sees plaintext content or cryptographic keys.
  - Clipboard room isolation: switching clipboards completely cleans caches, active selections, and state.
- **Payload Capacity & File Handling**:
  - Unlocked 50 MB text payload ceiling and 500 MB total clipboard capacity.
  - Manual, reliable saving via Save button with dirty-state indicator ("Unsaved changes" / "All changes saved") preventing unexpected background writes.
  - Dedicated **Paste** button next to **Copy** in the text action row, allowing direct one-click pasting from the system clipboard.
  - Granular **History Management**: Individual clipboard history records can be removed on demand via a delete icon without wiping unrelated clipboard history; history persists reliably across page refreshes and browser sessions.
  - Unified **Files & Media** tab with high-contrast dual-theme "Add files or media" empty state button ensuring full visibility on hover across both Light and Dark themes.
  - Clean URL address bar (`/<code>`) keeping encryption keys out of browser history and query strings; keys stored securely in client storage and sent encrypted in payload bodies.
  - Native clipboard paste flow (`navigator.clipboard.read()` and `window:paste`) for direct pasting of images, screenshots, and text snippets into the file library.
  - Unsaved edit protection via `window:beforeunload` and custom Acklet confirmation dialogs.
  - Non-existent clipboard detection & recovery: navigating to or joining a clipboard code that does not exist or has expired displays an Acklet confirmation dialog alerting the user that the code was not found and offering a one-click option to start a fresh clipboard.
  - Dynamic Button Loading Feedback: All switching, joining, and creation buttons ("Join", "New clipboard", and History item rows) display circular micro-spinners and are disabled while asynchronous operations are running to prevent duplicate submissions and provide clear visual feedback.
  - Configurable auto-delete retention policy defaulting to **7 Days** (with **15 Days** and **1 Month / 30 Days** options), enforced and cleaned automatically by the backend.
- **Surface & Design System**:
  - Purposeful micro-animations: All modals (Settings, QR, Confirmation Alert, Details Sheet, Drawer) feature smooth backdrop fade (`tsBackdropFadeIn`) and spring entrance scaling (`modalEnter`), and the Join button transitions dynamically (`tsButtonPop`) when input is provided.
  - Image preview lightbox with prominent **"Close Preview"** button and quick-dismiss navigation for seamless desktop and mobile inspection.
  - Distinct active sub-filter chips: Active filters ("All", "Images", "Files") use a filled brand accent pill with dedicated count pill badges, making active category state immediately recognizable.
  - Clean borderless file cards and selection states: Replaced harsh borders with soft elevated accent rings (`box-shadow: 0 0 0 2px var(--accent)`), maintaining clean borderless surfaces in both Light and Dark themes.
  - Animated item deletion: Selected files smoothly scale down and fade out (`cardDeleteExit` / `rowDeleteExit`, 220ms ease) before removal, with full undo capability via the floating toast.
  - Ambient soft focus ring and borderless resting state.
  - Complete Lucide icon integration for all toolbars, view toggles, filters, and file categories.
  - Viewport-locked layout (`100dvh` / `100vh`) keeping the entire workspace within view with internal scrolling containers.
  - Full dual-theme high contrast support (Light & Dark) on all dialogs, action buttons, and hover states.

## Reliable Large-File Uploads, Storage Architecture & Security

### 1. Resumable Chunked Upload Protocol
- **Configurable Limits**: Configurable 200MB maximum single-file ceiling (`spring.servlet.multipart.max-file-size=200MB`) and 500MB total room quota (`app.clipboard.max-room-size=524288000`).
- **Chunked Transfer**: Files larger than 5MB are automatically split into 5MB chunks (`app.clipboard.chunk-size-bytes=5242880`).
- **Resumable Session Lifecycle**:
  - `POST /api/v1/clipboard/shares/{code}/uploads/init`: Accepts `fileName`, `totalSize`, `chunkSize`, `totalChunks`, `isImage`, `isEncrypted`, and `fileHash`. Checks for an existing active upload session for the given room and file hash. Returns `uploadedChunks: number[]` containing verified chunk indices already persisted on the server.
  - `PUT /api/v1/clipboard/shares/{code}/uploads/{uploadId}/chunks/{chunkNumber}`: Streams and writes individual chunks directly to the session workspace (`chunks/{uploadId}/part_{chunkNumber}`). Updates session verified chunk sets in PostgreSQL atomically.
  - `POST /api/v1/clipboard/shares/{code}/uploads/{uploadId}/complete`: Verifies that all expected chunks are present on disk, streams and reassembles them sequentially into a single file, calculates the reassembled SHA-256 hash, and verifies integrity before committing to CAS storage.
- **50% Interruption Recovery**: If a transfer drops at 50% due to network loss, page refresh, or explicit pause, the client checks `localStorage` or re-initiates the upload session. The server returns verified chunk indices (e.g. `[0, 1]`), allowing the client to resume immediately from chunk 2 without re-transmitting verified data.

### 2. Storage Deduplication & Non-Destructive Compression
- **Content-Addressable Storage (CAS)**: Files are stored under `~/.acklet/clipboard_storage/blobs/` keyed by their SHA-256 checksum and size. Multiple clipboards or duplicate uploads share the same physical storage blob on disk while maintaining separate database item references.
- **Selective Transparent Compression**:
  - Compressible text and structured data formats (`.txt`, `.json`, `.csv`, `.xml`, `.svg`, `.html`, `.css`, `.js`, `.md`) are compressed with GZIP at rest to minimize disk consumption.
  - Pre-compressed formats (`.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.zip`, `.gz`, `.pdf`, `.mp4`, `.mp3`) are stored as raw bytes without redundant compression overhead.
- **Byte-Exact Original Downloads**: Downloads transparently decompress GZIP-compressed files on-the-fly, returning the exact original byte stream, SHA-256 checksum, content type, and original filename.

### 3. Upload Recovery & 24-Hour Session Retention
- **Session Persistence**: Upload sessions and chunk directories persist across server restarts in PostgreSQL (`clipboard_upload_sessions`) and filesystem storage (`~/.acklet/clipboard_storage/chunks/{uploadId}`).
- **Guaranteed Resumption Window**: Incomplete upload sessions remain valid for at least 24 hours (`app.clipboard.session-expiry-hours=24`). Resumable chunks are never purged prematurely.
- **Automated Scheduled Cleanup**: An hourly background task (`@Scheduled(fixedDelay = 3600000)`) purges expired upload sessions, deletes orphaned chunk directories, and soft-deletes expired clipboard rooms based on their retention policy (7, 15, or 30 days) without affecting active uploads or completed files.

### 4. Cryptographic Integrity & Duplicate Prevention
- **Cryptographic Validation**: Files compute SHA-256 hashes on the client prior to transfer. The backend recomputes the SHA-256 hash during chunk reassembly and rejects uploads with mismatched checksums.
- **Tamper Protection**: Chunks are validated for expected byte bounds and sequenced strictly by index.
- **Room Duplicate Avoidance**: If an identical file (matching size and SHA-256) already exists in the target room, the server avoids duplicate uploads and links the existing item directly.

### 5. Security & Safe File Handling
- **Path Traversal Sanitization**: `ClipboardSecurityUtil` sanitizes incoming filenames by removing path traversal patterns (`../`, `..\\`), directory prefixes, null bytes, and non-printable control characters.
- **Hazardous File Blocking**: Executable and script extensions (`.exe`, `.bat`, `.cmd`, `.sh`, `.vbs`, `.msi`, `.dll`, `.com`, `.scr`, `.jar`) are rejected immediately with a 400 Bad Request.
- **Storage Isolation**: Files are stored outside the web root (`~/.acklet/clipboard_storage`). Direct file paths and internal storage errors are never exposed in API responses or public headers.
- **Privacy & Logging Discipline**: File contents, credentials, and encryption tokens are never written to server logs or traces.

### 6. Interrupted-Download Recovery & Unicode Content-Disposition
- **RFC 7233 Range Support**: The backend download endpoint (`GET /api/v1/clipboard/shares/{code}/items/{itemId}/download`) supports HTTP `Range: bytes=start-end` requests.
- **Partial Content Delivery**: Returns `HTTP 206 Partial Content`, `Accept-Ranges: bytes`, and `Content-Range: bytes start-end/total`.
- **Streaming Efficiency**: Partial ranges are served using Java `RandomAccessFile` streaming, preventing full-file memory allocations during large downloads.
- **RFC 6266 / RFC 5987 Unicode Header Sanitization**:
  - `Content-Disposition` standard parameters require ISO-8859-1 (0–255) / ASCII.
  - Filenames containing Unicode characters outside ASCII (such as macOS screenshot filenames containing narrow no-break space `\u202F`, e.g. `Screenshot ... 11.28.13 AM.png`) are sanitized in the fallback `filename="..."` attribute to printable ASCII (`0x20..0x7E`).
  - Full original Unicode filenames are preserved in the `filename*=UTF-8''<encoded>` attribute, completely preventing Tomcat `IllegalArgumentException` while guaranteeing full Unicode filename preservation in all modern browsers.

### 7. Real-Time Synchronization & Multi-Tab Isolation
- **BroadcastChannel Protocol**: `ClipboardSyncService` integrates native `BroadcastChannel('acklet_clipboard_sync')` for instantaneous, zero-latency cross-tab synchronization without server roundtrips or network socket overhead.
- **Graceful Network Fallback**: Cross-device synchronization uses `startReactivePollingFallback`, querying the backend cleanly every 3 seconds without emitting unhandled WebSocket connection errors in the browser console.

### 8. Structured Progress & Dual-Theme UI
- **Upload Progress Cards**: Displays filename, formatted byte size, upload spinner, real-time percentage (`0%–100%`), dual-theme progress bar track, status badge (`Uploading` or `Interrupted`), resume/retry action (`rotate-cw`), and one-click cancel action (`x`).
- **Error Handling**: Displays generic, actionable error messages upon network failure while preserving the file reference and verified chunks in memory and storage for seamless resumption.

### 9. Automated Integration Tests
- Verified with comprehensive JUnit 5 integration tests in `ClipboardUploadAndDownloadTest.java`:
  - `testDirectFileUploadAndDownload()`: Direct upload, CAS blob storage, byte-exact download.
  - `testChunkedUploadAndAssembly()`: 120KB multi-chunk upload, reassembly, SHA-256 checksum verification, byte-exact download.
  - `testResumableUploadRecovery()`: Simulates 50% upload failure, queries session to confirm verified chunk recovery, resumes remaining chunks, and confirms assembly.
  - `testDownloadRangeRequest()`: HTTP 206 Partial Content byte range retrieval (`bytes=10-19`).
  - `testPathTraversalSanitization()`: Verifies `../../../../etc/passwd` is sanitized safely to `passwd`.
  - `testDangerousExtensionRejected()`: Verifies `.exe` executables are blocked immediately.
  - `testUnicodeFilenameContentDispositionSafe()`: Verifies files with Unicode characters (`\u202F`) generate ASCII-safe fallback `filename="..."` and exact RFC 5987 `filename*=UTF-8''` without Tomcat header exceptions.

### 10. Client-Side Folder Packaging & Native ZIP Generation (ZipBuilder)
- **Zero-Dependency Architecture**: Built using native browser APIs (`DataView`, `Uint8Array`, `TextEncoder`, and `CompressionStream`) in pure TypeScript without introducing third-party npm packages.
- **PKWare ZIP Format Compliance**:
  - Implements the official ZIP specification generating standard Local File Headers (`PK\x03\x04`), Central Directory Records (`PK\x01\x02`), and End of Central Directory (EOCD `PK\x05\x06`).
  - Encodes filenames with UTF-8 flags (Bit 11 enabled) to support international and special characters.
  - Computes standard IEEE 802.3 CRC32 checksums for every archive entry.
- **Deflate Compression**:
  - Applies `CompressionStream('deflate-raw')` (compression method 8) on files larger than 32 bytes when compressed output is smaller than raw data.
  - Automatically falls back to stored method 0 when compression yields no size benefit.
- **Recursive Directory Traversal**:
  - Drops of directory entries use `webkitGetAsEntry()` / `FileSystemDirectoryEntry`.
  - Directory scanning loops asynchronously over `dirReader.readEntries()` until an empty batch is returned, resolving Chromium's 100-item batch limit.
  - Preserves hierarchical relative paths (`subfolder/file.ext`) within the generated archive.
- **Direct Upload Integration**:
  - Emits a standard browser `File` object (`<folder-name>.zip`, MIME `application/zip`) handed off directly to the multi-file chunked upload engine.
  - Users can trigger folder uploads via drag-and-drop or via the "+ Add" dropdown menu using the native `webkitdirectory` picker.
  - **Browser Security & Prompt-Free Drag-and-Drop**: Selecting a folder via the file picker triggers Chromium's hardcoded security dialog (`"Upload X files to this site?"`). This is an intentional browser-level OS security barrier that web pages cannot suppress programmatically. Users can bypass this dialog entirely by dragging and dropping folders directly onto the Acklet window, which Chromium accepts as explicit physical consent without a confirmation prompt.

### 11. Library Grid Layout Alignment & Staggered Quick-Filter Animations
- **Flush Grid Alignment**: Eliminated excessive `padding: 22px;` on `.library-cards-grid`, replacing it with `padding: 4px 0 24px 0;`. Cards now align flush with the search bar, filter funnel button, and sort trigger, removing awkward side indentations and the ~50px empty void below the quick filter chips.
- **Uniform Square Card Dimensions**: Applied `aspect-ratio: 1 / 1; min-height: 160px;` to `.library-file-card`.
  - Non-image file cards (`.zip`, video, audio, code, docs) allocate a fixed 38px `.card-header-row` with subtle border divider, with the remainder filled by `.card-preview-area` (`flex: 1 1 0; min-height: 0;`) displaying the centered 56px category icon on a soft tinted surface.
  - Image cards dedicate the full 1:1 square to `.card-preview-area-full` with `object-fit: cover`.
  - Both file cards and image cards share identical square dimensions and grid alignment across all screen sizes.
- **Staggered Quick-Filter Animations**:
  - Bound `@for (item of displayFileItems(); track item.id + '-' + fileSubFilter())` in both Grid and List templates. Changing quick filter chips (`All`, `Images`, `Files`) automatically re-mounts DOM items with fresh staggered cascade animations (`cardFilterEnter` / `rowFilterEnter`).
  - Stagger delays span 15ms to 235ms across items for a fluid, springy ripple entrance.
  - Active quick filter chips trigger a tactile micro-bounce animation (`chipBounce`).
### 12. Clipboard Rename, Settings Ditto-Copy, Duplicate ID Prevention & Inline Join Suggestions
- **Duplicate ID Prevention on Rename**:
  - Pre-flight client verification and backend validation (`POST /api/v1/clipboard/shares/{code}/rename?newCode=...`) prevent overwriting or sharing IDs across different clipboards.
  - If a user attempts to rename a clipboard to an active, populated ID (such as `test`), the action is immediately blocked with a clear toast: `"Clipboard ID \"<id>\" is already taken. Choose a unique one."`.
  - The existing target clipboard, its files, text content, and settings remain completely intact and uncorrupted.
- **Atomic Rename with Ditto-Copy of Settings**:
  - Renaming copies all room settings verbatim ("ditto copy"):
    - Retention period (`expiresAt`, `createdAt`).
    - Privacy protection (`burnAfterReading`, `hasPin`, `pinHash`).
    - Live synchronization mode (`liveMode`).
    - Ownership authorization (`ownerToken`).
  - Reassigns all text, image, and file entities alongside in-flight chunked upload sessions to the new ID in PostgreSQL atomically.
  - Leaves a lightweight redirect pointer (`{"__acklet_redirect__": "<newId>"}`) in the previous room, emitting a real-time event so all connected devices and browser tabs automatically navigate to the renamed ID.
  - Copies and preserves the AES-GCM encryption key in client storage (`localStorage['acklet_clip_key_<newId>']`).
- **Inline Non-Disruptive "Have a Code?" Suggestions**:
  - Eliminated disruptive modal alert popups when joining or querying clipboard codes.
  - If a user clicks **Open** with an empty code input: an inline prompt (`"Enter a clipboard code to continue"`) appears directly below the input with subtle error highlighting.
  - If a user enters a code that does not exist: an inline suggestion (`"Code \"<code>\" does not exist. Press Open again to create it, or enter an existing code."`) appears. Re-clicking Open or pressing Enter immediately initializes the new clipboard room with that ID.
  - If a user enters an empty existing code: an inline suggestion (`"Code \"<code>\" is empty. Press Open again to continue, or enter an existing code."`) is displayed, avoiding unexpected empty states while allowing seamless entry upon confirmation.
  - Typing into the input automatically clears active errors and resets pending state.

### 13. Save, Real-Time Sync & Data Consistency

#### 1. Save Button & Unsaved Changes State Machine
- **4 Explicit Save States**:
  - **Saved / Clean**: Save button is disabled; status indicator displays `"All changes saved"` or `"Saved Xm ago"`.
  - **Dirty / Unsaved**: Save button activates with primary brand accent styling; status indicator displays `"• Unsaved changes"`. Manual, user-controlled saving is prioritized; interval-based or timer-based auto-saving while typing is disabled to keep the user in complete control of revisions.
  - **Saving**: Save button displays a circular micro-spinner and label `"Saving..."`; status caption shows spinning indicator. Duplicate save requests are strictly guarded against while an in-flight request is pending.
  - **Save Failed**: If the network drops or a server error occurs, the Save button transforms into an alert state (`is-failed`, red border/glow) with label `"Retry"`. The status caption displays `"Save failed • Retry"`. The user's typed changes remain completely intact in the editor.
- **Sudden Exit Background Auto-Save (Zero Popups & Zero Data Loss)**:
  - If a user abruptly closes the tab, closes the browser, reloads/refreshes the page, or backgrounds the application while having unsaved edits (`isTextDirty = true` or `saveFailed = true`), `triggerSuddenExitSave()` fires automatically via `@HostListener('window:beforeunload')` and `@HostListener('window:pagehide')`.
  - **Synchronous Storage Mirroring**: Immediately writes the draft to `localStorage['acklet_draft_text_<code>']` before process termination.
  - **Non-Blocking Keepalive Transmission**: Dispatches an HTTP POST request to the backend with `keepalive: true`. Modern browsers guarantee completion of keepalive requests in the background after the page unloads.
  - **No Intrusive Browser "Leave Site?" Popup**: Intentionally omits `event.preventDefault()` and `event.returnValue`, completely eliminating Chrome's intrusive dialog ("Leave site? Changes that you made may not be saved") while guaranteeing that the user's data is safely preserved.

#### 2. Real-Time Synchronization Architecture
- **Multi-Tab Instant Sync (0ms latency)**:
  - `ClipboardSyncService` uses the native Web API `BroadcastChannel('acklet_clipboard_sync')`. Confirmed saves in one tab immediately synchronize across all open tabs on the same machine without server roundtrips.
- **Cross-Device Sync via Server-Sent Events (SSE)**:
  - Backend provides `GET /api/v1/clipboard/shares/{code}/events` producing `text/event-stream` backed by Spring Boot's native `SseEmitter`.
  - Requires zero third-party message brokers or complex infrastructure, traversing enterprise firewalls, reverse proxies, and mobile networks reliably.
  - Emits `ITEM_ADDED` and `ITEM_DELETED` events containing item payloads and the clipboard concurrency version.
  - Automatically recovers and reconnects with exponential backoff on network blips.
- **Strict Scope Isolation**:
  - SSE connections and events are strictly partitioned by `shareCode`. Emitters for room `A` never receive broadcasts from room `B`.
  - When End-to-End Encryption (E2EE) is active, text and file data remain encrypted with AES-GCM-256 over SSE channels; the server never has access to plaintext content.

#### 3. Refresh, Reload & Local Draft Recovery
- **Server-Authoritative State on Load**:
  - Reopening or refreshing a clipboard fetches the confirmed server state via `GET /api/v1/clipboard/shares/{code}`.
- **Protective Local Drafts**:
  - While typing, local changes are stored in `localStorage['acklet_draft_text_<code>']`.
  - Upon confirmed server save or revision restore, the draft is purged automatically.
- **Draft Recovery Banner**:
  - If a user refreshes or reopens a clipboard where an uncommitted local draft differs from the server's confirmed text, a non-intrusive recovery banner appears above the editor: `"Unsaved local draft found from your previous session."`.
  - Provides two clear actions:
    - **Restore Draft**: Loads the local draft into the editor and marks it dirty.
    - **Discard Draft**: Removes the draft from local storage and keeps the server version.

#### 4. Versioning, Optimistic Locking & Conflict Resolution
- **Monotonic Concurrency Token**:
  - PostgreSQL table `clipboard_shares` includes `version BIGINT NOT NULL DEFAULT 1`, managed by JPA `@Version`.
  - Saves pass `expectedVersion` in `POST /api/v1/clipboard/shares/{code}/text`.
  - If two clients edit concurrently, the second save detects that `expectedVersion != share.getVersion()`, triggering an `OptimisticLockingFailureException` mapped to HTTP `409 Conflict`.
- **Zero Data-Loss Conflict Resolution**:
  - On 409 Conflict, the editor never overwrites or discards the user's edits.
  - The latest server state is fetched and stored in `conflictServerText`, and a conflict banner appears:
    - **Keep Mine**: Force-saves local edits, overriding the server and incrementing the version.
    - **Accept Server Version**: Replaces the editor with the latest server confirmed text.
    - **Compare Versions**: Opens a responsive Side-by-Side comparison modal displaying "Your Local Edits (Unsaved)" next to "Server Confirmed Version", allowing full inspection before deciding.

#### 5. Version History & Audit Trail
- **Revision Archival & Active Version Synthesis**:
  - PostgreSQL table `clipboard_text_revisions` records every saved revision (`id`, `share_code`, `version`, `text_content`, `is_encrypted`, `created_at`).
  - Endpoints:
    - `GET /api/v1/clipboard/shares/{code}/revisions`: Returns list of revisions ordered by creation time descending, including the current active text item at the top marked with `isCurrent: true`.
    - `POST /api/v1/clipboard/shares/{code}/revisions/{id}/restore`: Restores a past revision as the current active text, archives the previous state, increments the version, and broadcasts the update to all connected clients.
- **History Drawer Integration**:
  - Segmented tab switcher inside the History Drawer (`Recent Clipboards` vs `Version History`).
  - Active version card is displayed at the top with a distinct `Current Version` pill badge and real-time character/line metrics.
  - Past version cards display revision badges (`#1`, `#2`), relative timestamps (`Saved 5m ago`), character and line metrics, text preview snippets (decrypted client-side when E2EE is enabled), and one-click **Restore** buttons.
  - Immediate history warming: When joining or visiting any clipboard room via URL (e.g. `/8cet4`), the room is immediately warmed into synchronous storage and displayed with an `Active` tag.
  - Separation of room protection from device history: Room PIN protection uses a distinct `isProtectedShare` indicator, preventing device history from being silently blocked or cleared.

#### 6. Responsive Full-Screen Architecture & Multi-Device Optimization
- **Full-Bleed Shell Integration (`layout: 'fullBleed'`)**:
  - Registered in `TOOL_REGISTRY['clipboard']` ([tools.manifest.ts](file:///Users/ayaz/Acklet/client/packages/tool-registry/src/tools.manifest.ts)) and configured on `ts-shell` in `AppComponent` ([app.component.ts](file:///Users/ayaz/Acklet/client/apps/tool-online-clipboard/src/app/app.component.ts)).
  - Completely hides below-grid explanatory descriptions ("About Online Clipboard") from the initial viewport, prioritizing the tool workspace.
  - Eliminates whole-page vertical scrollbars by locking `:host`, `.clipboard-container`, and the shell grid to `100vw` / `100dvh` with `overflow: hidden`.
- **Top Empty Area Elimination on Mobile & Tablet (< 1024px)**:
  - On viewports `< 1024px`, the tool-shell grid (`.ts-bottom-row-grid`) adapts to a single column (`grid-template-columns: 1fr`).
  - Previously, `:host` of `<ts-sidebar>` remained `display: block; height: 100%`, occupying an entire implicit row above `<main>` even though its inner card was hidden with `.hide-mobile`. This created an empty void of 250px–400px pushing the tool halfway down the screen.
  - Fixed across [ts-sidebar.component.ts](file:///Users/ayaz/Acklet/client/packages/tool-shell/src/components/sidebar/ts-sidebar.component.ts), [ts-shell.component.ts](file:///Users/ayaz/Acklet/client/packages/tool-shell/src/components/shell/ts-shell.component.ts), and [styles.css](file:///Users/ayaz/Acklet/client/src/styles.css) by enforcing `:host { display: contents !important; }` and `ts-sidebar { display: contents !important; }` on `@media (max-width: 1023px)`.
  - Enforced `display: flex; flex-direction: column;` on `.ts-main-content-card` and `justify-content: flex-start !important; margin-top: 0 !important;` across `.clipboard-container` and `.clipboard-content-scroller` so content anchors immediately beneath the top navbar.
- **Streamlined Single-Row Mobile Header (< 640px)**:
  - Consolidates clipboard ID (with copy and inline edit) on the left and compact utility actions (`+ New`, `QR`, `Join`, `Settings`, `History`) on the right into a single cohesive row.
  - Eliminates redundant multi-row action stacking on mobile, saving ~40px of vertical height.
  - Responsive ID labels: switches from "Link to this clipboard:" to "ID:" on ultra-narrow viewports (<= 360px).
- **Editor Height Maximization (>=70–80% Usable Content Height)**:
  - Flex column chain (`html` → `body` → `app-root` → `ts-shell` → `ts-main-content-card` → `ts-main-scroll-container` → `.clipboard-container` → `.clipboard-content-scroller` → `.text-pane-layout` → `.shared-textarea-container` → `.wysiwyg-editor`) uses `flex: 1 1 0%`, `min-height: 0`, and `height: 100%`.
  - Dedicates 70%–80%+ of the usable content-panel height directly to the editor on typical mobile and tablet devices (e.g. Pixel 10: ~710px of 924px; iPad Mini: ~840px of 1024px).
  - Text scrolls exclusively inside `.wysiwyg-editor` with 44px top padding and 48px bottom padding, guaranteeing that the first line of text and placeholders never overlap the floating `Wrap` and `Copy` pills.
- **History vs Version Revisions Distinction & Drawer Fixes**:
  - **Top Strip Clock Action**: Dedicated to **Recent Clipboards** (switching between recently visited/created rooms) using `<ts-icon name="clock">` and calling `openRecentClipboardsDrawer()`, which explicitly sets the active tab to `Recent Clipboards`.
  - **Bottom Action Revisions Button**: Dedicated to **Text Version History** of the current clipboard, using `<ts-icon name="history">` and label `Revisions` on mobile (and `Version History` on desktop). Clicking calls `openRevisionsDrawer()`, which selects the `Version History` tab, triggers `loadTextRevisions()`, and opens the drawer.
  - **Dual-Layer Synchronous & Async History Storage**:
    - `ClipboardHistoryService` employs a hybrid resilience pattern: synchronous `localStorage` (`acklet_clipboard_recent_history`) provides zero-latency instant reads and writes, while a self-healing IndexedDB (`clipboard-db` v2, `recent_clipboards` store) operates asynchronously in the background.
    - Eliminates blank history states on fresh loads or restricted storage environments.
    - Automatically guarantees that active or newly visited rooms (e.g. `/test`) are captured into local history via `ensureCurrentRoomInHistory()` whenever the drawer is opened or a share session is initialized.
    - Clicking the "Recent Clipboards" tab directly refreshes the latest history snapshot.
  - **Dynamic Drawer Title**: The drawer header updates dynamically to match the active tab (`Recent Clipboards` vs `Version History`), avoiding user confusion.
  - **Mobile Drawer Sheet Height**: Fixed `.history-drawer-panel` on mobile to use `height: 72vh; max-height: 85vh; min-height: 340px;` so list items and empty states never collapse to 0 height.
- **Mobile Two-Line Files & Media Header (< 640px)**:
  - **Line 1 (Search & Add)**: Search pill input (`.mobile-search-pill`) stretches to take full available width (`flex: 1 1 0%`), paired with a prominent compact `+ Add` button (`.mobile-add-btn`) on the right.
  - **Line 2 (Quick Sub-Filters & Controls)**: Left side houses horizontally-scrollable sub-category chips (`All`, `Images`, `Files`) with dynamic item counts. Right side aligns compact controls: View Mode toggle (`Grid` / `List`), Filter button (with active dot), and Sort options button.
  - Desktop view (>= 640px) maintains the single-row toolbar with full shortcuts.
- **Modern Centered Segmented Pill Tabs**:
  - Sleek 40px height segmented pill control (`.clipboard-main-tab-bar`) with 3px padding, 12px border radius, and smooth dual-theme surfaces.
  - On mobile (`< 640px`), `.clipboard-tab-row` centers the tab bar horizontally across the viewport (`justify-content: center`), while `.clipboard-main-tab-bar` spans full available width (`flex: 1 1 100%`) with symmetric 50%/50% buttons (`flex: 1 1 0%`).
  - Active button features crisp elevation in light mode (`var(--surface)`) and high contrast in dark mode (`rgba(255, 255, 255, 0.12)` with `--accent-glow`), perfectly legible on all mobile displays.
- **Mobile Adaptive Bottom Action Bar (< 640px)**:
  - **Row 1 (Primary)**: Ergonomic side-by-side **Copy** (`[📋 Copy]`) and **Save** (`[💾 Save]`) buttons taking 50% width each (`flex: 1 1 0%`) for direct thumb reach.
  - **Row 2 (Icon Bar)**: High-density icon-only actions (`Wrap`, `Refresh`, `Revisions`, `Clear`) using consistent 36px icon buttons.
  - **Wrap Button Theme Consistency**: Uses semantic palette variables (`var(--accent-soft)` and `var(--accent-strong)` in light mode, `#2dd4bf` in dark mode) replacing non-system hardcoded colors.
  - **Row 3 (Status Caption)**: Centered, non-intrusive status caption displaying real-time save states and timestamps.
  - **Desktop (>= 640px)**: Preserves a clean single horizontal row with left-aligned actions and right-aligned status.
- **Manual Save Lifecycle & Auto-Save Removal**:
  - Automatic background debounced saving has been completely removed in favor of deterministic, user-controlled manual saving.
  - Edits in the editor immediately mark the text state as dirty (`isTextDirty = true`), enabling the **Save** button and displaying `• Unsaved changes` in the status caption alongside an immediate **Discard** action link.
  - Changes remain preserved until explicitly saved via the **Save** button or the global `Ctrl+S` / `Cmd+S` keyboard shortcut.
- **Sudden Exit vs In-App Navigation Guards**:
  - **Sudden Tab/Browser Close & Page Reload (`window:beforeunload` & `window:pagehide`)**: Instead of blocking the user with Chrome's native *"Leave site? Changes that you made may not be saved."* dialog, the application executes `triggerSuddenExitSave()`. It writes the unsaved draft synchronously to `localStorage['acklet_draft_text_<code>']` and transmits an asynchronous payload using `fetch(..., { keepalive: true })`. This guarantees zero data loss without any disruptive browser popups.
  - **In-App Action & Navigation Guards**: When attempting an intentional in-app navigation (creating a new clipboard `confirmCreateNewClipboard`, joining another room `joinClipboard`, restoring an older version `restoreRevision`, or refreshing from server `refreshTextContent`), an Acklet custom confirmation dialog prompts the user:
    - **Save Changes**: Persists the unsaved draft to the server before completing the action.
    - **Discard Changes**: Reverts text back to the remote snapshot, clears local recovery draft, and proceeds.
    - **Cancel**: Aborts the operation and keeps the user on the current screen with their draft intact.
- **Centered Floating Selection Bar & Toast Notifications**:
  - **Strict Tab Scoping**: The floating file selection action bar (`.floating-selection-bar`) is scoped exclusively to the **Files & Images** tab (`@if (activeTab() === 'files' && selectedItemIds().size > 0)`). It never renders in the **Text & Links** section.
  - **Automatic Tab Clean-up**: Switching to the Text & Links tab immediately executes `clearSelection()`, ensuring stale file selections do not linger.
  - **Centered Layout**: Floating pills (`.floating-selection-bar` and `.toast-floating-container`) are strictly centered on all screen sizes using `left: 50% !important; transform: translateX(-50%) !important; width: max-content !important; max-width: calc(100vw - 24px) !important;`.
  - Entrance keyframes (`selectionBarPop` and `tsToastSlideUp`) preserve `translate(-50%, ...)` across their 0% and 100% states, eliminating previous animation-fill collisions that pushed pills off-center or clipped buttons on mobile viewports.
- **Multi-Device Adaptability & Virtual Keyboard Handling**:
  - Centered within `max-width: 1320px; margin: 0 auto;` on laptops, desktops, and ultrawide monitors.
  - Dedicated `@media (max-height: 540px)` rules ensure comfort when mobile virtual keyboards open or in landscape orientation.
  - Modals, drawers, and popovers maintain strict stacking contexts (`toast-floating-container` at `z-index: 1100`, `.floating-selection-bar` at `1000`, drawer backdrop at `950`, modal backdrop at `900`), and adapt to mobile bottom sheets on screens `< 640px`.
  - Files tab features independent smooth scrolling (`overflow-y: auto`) without parent container interference.

- **Below-the-Fold Content & Cross-Device Section Scrolling**:
  - **Universal Content Rendering**: In full-bleed tool layouts (`layout: 'fullBleed'`), the below-the-fold section (`ts-tool-content`) containing **About**, **How to use**, **FAQ**, and **Related Tools** is permanently mounted in the DOM directly underneath the primary workspace section (`#tool`).
  - **Initial Screen Coverage with Smooth Scroll Reachability**:
    - The top workspace section (`.ts-workspace-section.full-bleed`) is configured with `min-height: 100%; height: 100%; flex-shrink: 0;`, ensuring that on initial load the tool takes 100% of the viewport height without prematurely peeking text.
    - The scroll container (`.ts-main-scroll-container.full-bleed`) uses `overflow-y: auto !important; overflow-x: hidden !important; scroll-behavior: smooth !important; -webkit-overflow-scrolling: touch !important;`, allowing smooth mouse-wheel, trackpad, and touch swipe scrolling down to the documentation and FAQ.
    - Tool content containers (`.clipboard-content-scroller`) use `overscroll-behavior-y: auto;`, allowing vertical scrolling gestures at the boundaries of the clipboard editor/file list to chain into the parent scroll container.
  - **Deterministic Navigation Scrolling Across All Devices**:
    - Clicking on any topbar pill or mobile drawer link (**Tool**, **About**, **How to use**, **FAQ**, **Related**) invokes `scrollToSection()`.
    - Instead of relying on fragile native `scrollIntoView()` (which can fail on nested `contain: layout` or inner scroll containers in Safari and Android Chrome), `scrollToSection()` calculates the exact relative offset within `.ts-main-scroll-container` (`targetRect.top - containerRect.top + scrollContainer.scrollTop - 24`) and dispatches `scrollContainer.scrollTo({ top, behavior: 'smooth' })`.
    - Mobile drawer navigation closes the sidebar overlay before dispatching the scroll with a brief transition deferral (50ms), preventing touch locks or offset miscalculations.
    - Initial URL hash loading (e.g. `#faq` or `#about`) is automatically recognized on mount and smoothly scrolled into view.
    - An `IntersectionObserver` coupled with a scroll listener continuously updates the active navigation pill indicator as the user scrolls through sections, snapping back to `Tool` when near the top.

For complete design system tokens and component architecture, refer to [ui-design-system.md](file:///Users/ayaz/Acklet/docs/ui-design-system.md).
For backend integration, CORS headers, and real-time synchronization tracing, refer to [integration-and-reliability.md](file:///Users/ayaz/Acklet/docs/integration-and-reliability.md).
For verification commands and test layers, refer to [verification-guide.md](file:///Users/ayaz/Acklet/docs/verification-guide.md).





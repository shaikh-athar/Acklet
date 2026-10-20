---
tool: Online Clipboard
phase: 1
last-updated: 2026-10-20
status: Complete
---

# Online Clipboard — Features & Scope

## 1. Feature Overview

Online Clipboard is a private, cross-device data bridge enabling users to move text, active links, images, documents, and folders across platforms with zero setup, zero tracking, and zero accounts.

---

## 2. Scope Matrix

### 2.1 In Scope (Phase 1 — Current Implementation)

| Feature Area | Capabilities Included |
| :--- | :--- |
| **Room Identity** | Instant 5-digit code generation (`23456789abcdefghjkmnpqrstuvwxyz`), custom room alias renaming with inline availability validation, path-based routing (`/${code}`), QR code modal pairing, optional PIN protection. |
| **Text & Links** | Full-canvas WYSIWYG text editor, automatic detection of protocol URLs and bare domains, bold interactive links (`target="_blank"`), selection-preserving floating formatting popover (H1-H3, bold, italic, underline, strike, inline code, code blocks, lists, quotes, colors, highlights), word-wrap toggle with brand accent active styling. |
| **State Machine** | Dirty tracking (`isDirty`), manual Save button with circular micro-spinner, dynamic relative captions (*"Saved just now"*, *"Saved 2m ago"*, *"Unsaved changes"*), sudden-exit preservation via `fetch(..., { keepalive: true })`, optimistic locking concurrency (HTTP 409) with Conflict Resolution Banner (*Keep Mine*, *Accept Incoming*, *Compare Versions*), local draft recovery from interrupted sessions. |
| **Files & Media** | Drag-and-drop window overlay, native folder drop with recursive traversal and client-side ZIP packaging (`ZipBuilder`), client-side SHA-256 deduplication (skips identical files in room), resumable chunked upload protocol (5 MB chunks for files > 5 MB, 200 MB single file ceiling, 500 MB total room quota, 50% drop recovery), concurrent multi-file progress cards with live cancellation buttons, grid view (thumbnails) and list view (compact rows), sticky library header with ambient feather fade scroll effect, double-click selection/deselection with debounced click handling, image preview lightbox with zoom and dismiss. |
| **Security & E2EE** | Client-side Web Cryptography API (`AES-GCM-256`), PBKDF2 deterministic room key derivation, 12-byte random initialization vectors (IVs) per payload, zero plaintext on backend. |
| **Real-Time Sync** | Tier 1 same-origin multi-tab sync via `BroadcastChannel('acklet_clipboard_sync')` (0ms latency); Tier 2 cross-device push via Server-Sent Events (`/shares/{code}/events`); Tier 3 reactive polling fallback. |
| **Storage & Retention** | Ephemeral Content-Addressable Storage (CAS) on server, transparent GZIP compression for text/code, automated hourly purge cron for expired rooms (7 days default, 15 days, 30 days configurable). |
| **History & Storage** | Local room history drawer (`localStorage['acklet_clipboard_history_v1']`) with granular single-room deletion; text revisions history drawer with line/char counts and one-click rollback. |

### 2.2 Out of Scope (Phase 2 & Phase 3 Roadmap)

| Feature | Target Phase | Rationale for Postponement |
| :--- | :--- | :--- |
| **Full-Text In-Document Search** | Phase 2 | Phase 1 focuses on core reliable ingestion and instant cross-device transfer. |
| **Client-Side OCR (Text from Images)** | Phase 2 | Requires heavy Tesseract/Wasm bundle; keeps initial bundle lightweight. |
| **Direct WebRTC P2P DataChannels** | Phase 2 | Server-Sent Events + CAS storage provide superior reliability when devices are not concurrently online. |
| **Enterprise RBAC & SSO** | Phase 3 | Preserves pure anonymous zero-account positioning for consumer and developer utility. |
| **Audit Logs & Team Workspaces** | Phase 3 | Geared toward organizational deployments rather than ephemeral peer-to-peer usage. |

---

## 3. User Stories & Acceptance Criteria

### US-1: Instant Peer Pairing
- **As a** developer working on a Mac workstation,
- **I want to** generate a 5-digit code or scan a QR code from my iPhone,
- **So that** I can immediately access the same clipboard without signing up or installing an app.
- **Acceptance Criteria**:
  - Visiting the tool generates a 5-digit code if none is active.
  - Scanning the QR code opens the exact same room on mobile.
  - Joining an active code syncs state immediately.

### US-2: Large Binary Transfer with Resilience
- **As a** DevOps engineer,
- **I want to** upload a 150 MB database dump or server log archive,
- **So that** my colleague on a different network can download it immediately.
- **Acceptance Criteria**:
  - File is chunked into 5 MB parts and uploaded with live percentage feedback.
  - If network drops at 50%, resuming skips already-verified chunks.
  - Upload reassembles with verified SHA-256 checksum on the server.

### US-3: Conflict-Free Real-Time Collaboration
- **As a** user editing notes across two tabs or devices,
- **I want to** be warned if a newer version was saved remotely,
- **So that** my uncommitted changes are never silently overwritten.
- **Acceptance Criteria**:
  - Optimistic locking (HTTP 409) triggers the Conflict Resolution Banner.
  - User can choose to Keep Mine, Accept Incoming, or inspect diffs in the Revisions drawer.

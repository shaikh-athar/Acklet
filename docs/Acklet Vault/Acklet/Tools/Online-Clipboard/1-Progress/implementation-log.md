---
tool: Online Clipboard
phase: 1
last-updated: 2026-10-20
status: Complete
---

# Online Clipboard — Implementation Timeline & Engineering Log

## 1. Timeline & Key Milestones

### Week 1 — Project Initialization & Standalone Architecture
- **Date**: 2026-09-28 to 2026-10-04
- **Milestones**:
  - Provisioned `client/apps/tool-online-clipboard/` within the Acklet monorepo under the **Tools Surface**.
  - Configured standalone application mounting inside `ts-shell` with subdomain routing (`clipboard.localhost:4200`).
  - Integrated `TOOL_REGISTRY` entry (`tools.manifest.ts`) with `teal` brand accent and metadata.
  - Implemented ephemeral 5-digit room provisioning and path-based routing (`/${code}`).
- **Learnings**:
  - Subdomain routing on localhost (`*.localhost`) works natively across modern browsers via RFC 6761 without `/etc/hosts` changes.

### Week 2 — Large File Streaming & In-Browser ZIP Engine
- **Date**: 2026-10-05 to 2026-10-11
- **Milestones**:
  - Implemented the Resumable Chunked Upload Protocol: 5 MB chunks, session handshakes, and 50% drop recovery.
  - Built `ZipBuilder` (`services/zip-builder.ts`) leveraging native `CompressionStream('deflate-raw')` for in-browser directory-to-ZIP conversion.
  - Configured Spring Boot Tomcat upload limits to 200 MB per file (`spring.servlet.multipart.max-file-size=200MB`) and 500 MB per request.
  - Implemented client-side SHA-256 deduplication to skip duplicate uploads in the same room.
- **Decisions**:
  - Replaced proposed `jszip` dependency with native `ZipBuilder` to save 100KB+ gzipped bundle size.

### Week 3 — Real-Time Synchronization & Concurrency Control
- **Date**: 2026-10-12 to 2026-10-17
- **Milestones**:
  - Established Tier 1 multi-tab `BroadcastChannel('acklet_clipboard_sync')` achieving 0ms same-origin tab reflection.
  - Built Tier 2 Server-Sent Events (SSE) streaming endpoint (`/api/v1/clipboard/shares/{code}/events`).
  - Implemented optimistic locking concurrency with version tracking; engineered the Conflict Resolution Banner for HTTP 409 responses.
  - Implemented `saveTextOnSuddenExit()` using `fetch(..., { keepalive: true })` on `beforeunload` to eliminate annoying browser unload dialogs.
- **Decisions**:
  - Chose Server-Sent Events over full-duplex WebSockets to minimize proxy disconnection issues and reduce memory footprint.

### Week 4 — UI Polish, Responsive Craft & Comprehensive Testing
- **Date**: 2026-10-18 to 2026-10-20
- **Milestones**:
  - Implemented the structured single-row desktop header (>=640px) and space-efficient 2-line mobile header (<640px).
  - Designed the sticky library header with ambient 16px feather fade scroll overlay (`isFilesScrolled`).
  - Built double-click selection/deselection mechanics with 250ms debouncing for single-click preview triggers.
  - Implemented comprehensive 14-suite unit test coverage in `clipboard-features.spec.ts`.
  - Conducted dual-theme high contrast audit (WCAG AA/AAA compliance across Light and Dark modes).
- **Learnings**:
  - Viewport-locked containers (`100dvh`) with internal scrolling containers completely eliminate erratic mobile browser chrome resizing.

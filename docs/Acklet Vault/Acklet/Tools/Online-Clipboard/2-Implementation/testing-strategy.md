---
tool: Online Clipboard
phase: 1
last-updated: 2026-10-20
status: Complete
---

# Online Clipboard — Testing Strategy & Quality Assurance

## 1. Test Architecture Overview

Quality verification for Online Clipboard spans four rigorous layers:
1. **Automated Unit & Capability Testing**: 14 specialized suites in `src/clipboard-features.spec.ts` using Vitest / Karma.
2. **End-to-End (E2E) Flow Verification**: Verifying end-to-end pairing, real-time sync, and resumable transfers across desktop and mobile browsers.
3. **WCAG 2.1 AA Accessibility Audit**: Keyboard workflows, screen-reader semantics, and contrast ratios.
4. **Performance & Bundle Budgets**: Monitoring LCP, bundle payload boundaries, and memory leak prevention.

---

## 2. Automated Unit Test Suites (`clipboard-features.spec.ts`)

| Suite # | Target Capability | Assertions & Edge Cases Tested |
| :--- | :--- | :--- |
| **Suite 1** | Automatic URL Detection & Parsing | Single URL extraction, multi-line URL parsing, trailing sentence punctuation stripping, malformed URL rejection. |
| **Suite 2** | End-to-End Encryption (AES-GCM-256) | Deterministic PBKDF2 key derivation, random IV generation, round-trip encrypt/decrypt verification, plaintext fallback resilience. |
| **Suite 3** | Client-Side Content Deduplication | SHA-256 hash generation, skipping redundant uploads of identical files within the same room. |
| **Suite 4** | Deterministic Multi-Option File Sorting | `newest`, `oldest`, `name`, `largest` sorting orders with secondary `id` tiebreakers. |
| **Suite 6** | Folder to ZIP Packaging (`ZipBuilder`) | Directory traversal, CRC-32 checksum calculation, DOS timestamps, valid `.zip` binary structure. |
| **Suite 7** | Double-Click Selection Mechanics | Toggle selection on double-click, debounced single-click handling (250ms) to prevent accidental lightbox popups. |
| **Suite 8** | Room Rename & Inline Availability | Slug sanitization, availability check debouncing, URL path replacement without page reload. |
| **Suite 8b** | Save State Machine & Sudden Exit | `isDirty` state transitions, `isSaving` spinner, relative timestamp strings, `saveTextOnSuddenExit` keepalive fetch. |
| **Suite 9** | Optimistic Concurrency (HTTP 409) | Version increments, rejecting outdated `expectedVersion`, conflict banner presentation. |
| **Suite 10** | Local Draft Preservation & Recovery | Keystroke caching in `localStorage`, detecting unsaved drafts on session load, restore/discard actions. |
| **Suite 11** | Multi-Tier Real-Time Sync | `BroadcastChannel` event dispatching, Server-Sent Events subscriber filtering by room code. |
| **Suite 12** | Resilient Clipboard History | Recent rooms persistence, metadata updates on visit, granular single-room deletion. |
| **Suite 13** | Text Revisions & Historical Rollback | Snapshot generation, character/line count calculation, one-click rollback to past versions. |

---

## 3. End-to-End (E2E) Verification Flows

### Flow 1: Zero-Account Room Pairing & Real-Time Sync
1. Open `http://clipboard.localhost:4200` in Browser A → verify 5-digit code generated.
2. Open second incognito tab (Browser B) and enter code in Join input → verify room loads.
3. Type text in Browser A and click Save → verify text reflects immediately in Browser B via SSE.

### Flow 2: Resumable Chunked Upload & 50% Recovery
1. Select a 50 MB test archive in Browser A.
2. Verify upload session initiates with 5 MB chunks.
3. Disconnect network or cancel at 50% (chunk 5).
4. Re-initiate upload → verify client receives `uploadedChunks: [0, 1, 2, 3, 4]` and resumes from chunk 5.
5. Verify successful reassembly and download on Browser B.

### Flow 3: Folder Drag-and-Drop Ingestion
1. Drag an uncompressed folder containing nested files into the window.
2. Verify drop overlay activates and folder is parsed by `ZipBuilder`.
3. Verify file appears in library as a single `.zip` archive ready for instant download.

---

## 4. Accessibility (WCAG 2.1 AA) Checklist

- [x] **Color Contrast**: All text and icons pass `>= 4.5:1` in Light and Dark modes. Primary text passes `>= 12:1`.
- [x] **Focus Indicators**: Clear `:focus-visible` outline rings on all buttons, tabs, and input fields.
- [x] **Form Labels**: Every input (Search, Join, Room Rename) has an accessible `aria-label` or `<label>`.
- [x] **Keyboard Navigation**:
  - `Tab` / `Shift+Tab` cycles through interactive controls.
  - `/` shortcut focuses the file search input.
  - `Escape` dismisses all open modals (QR, Lightbox, Settings) and drawers (Revisions, History).
- [x] **Touch Targets**: Minimum 44x44px touch targets on all mobile action buttons.

---

## 5. Performance Targets & Budgets

- **Initial Bundle Size**: `< 150 KB` gzipped for the standalone clipboard application bundle.
- **Largest Contentful Paint (LCP)**: `< 2.0s` on standard mobile connections.
- **Interaction to Next Paint (INP)**: `< 100ms` on all typing and filtering interactions.
- **Zero Memory Leaks**: Subscriptions cleanly unsubscribed on `ngOnDestroy()`; EventSource connections terminated on room switch.

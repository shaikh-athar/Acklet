---
tool: Online Clipboard
phase: 1
last-updated: 2026-10-20
status: Complete
---

# Online Clipboard — Engineering Learnings & Retrospective

This living document captures technical insights, architectural patterns that succeeded, anti-patterns that failed, and guidelines for future tool development across the Acklet platform.

---

## 1. ✅ What Worked Exceptionally Well

### 1.1 Pure Web Cryptography API (`window.crypto.subtle`)
- **Insight**: Completely eliminating external cryptography libraries (`crypto-js`, `forge`) in favor of native `SubtleCrypto` resulted in zero-bundle overhead and hardware-accelerated (AES-NI) performance. Multi-megabyte file encryption and decryption execute without causing frame drops on the main UI thread.

### 1.2 In-Browser `ZipBuilder` with `CompressionStream('deflate-raw')`
- **Insight**: Handcrafting a lightweight binary ZIP builder (`services/zip-builder.ts`) reduced total application bundle weight by more than 100 KB compared to `jszip`. Native streams compress nested folder drops into clean `.zip` archives directly in memory.

### 1.3 Multi-Tier Transport (`BroadcastChannel` + Server-Sent Events)
- **Insight**: Pairing `BroadcastChannel` with Server-Sent Events yielded the optimal real-time experience:
  - Same-machine multi-tab interactions reflect with **0ms latency** and zero server requests.
  - Cross-device updates stream dependably via SSE over HTTP/2 with native browser reconnection and zero proxy websocket blocking.

### 1.4 Silent Sudden-Exit Persistence via `fetch(keepalive: true)`
- **Insight**: Native browser `beforeunload` dialogs ("Leave site? Changes you made may not be saved") create friction and anxiety. Replacing them with an asynchronous `fetch()` using `{ keepalive: true }` guarantees that uncommitted text is committed to the server in the background even as the browser tab terminates.

### 1.5 Ambient Top Feather Fade Scroll Effect
- **Insight**: Rather than an abrupt visual line or heavy frosted glass blur on the sticky library header, applying a subtle 16px gradient feather overlay (`linear-gradient(to bottom, var(--bg-card), transparent)`) when scrolling (`isFilesScrolled`) creates a natural visual transition.

---

## 2. ❌ What Didn't Work & Was Discarded

### 2.1 Full-Duplex WebSockets for Standalone Public Tools
- **Why it failed**: WebSockets require persistent stateful socket pools, manual heartbeat ping/pong timers, and are frequently severed or blocked by strict enterprise firewalls and mobile power-saving modes.
- **Correction**: Replaced with standard REST for mutations (POST/PUT) and unidirectional Server-Sent Events (`EventSource`) for incoming notifications.

### 2.2 Boundary Scroll Containment (`overscroll-behavior-y: contain`)
- **Why it failed**: Applying `contain` to internal scrollers trapped trackpad and mousewheel gestures at container boundaries, preventing users from smoothly scrolling down to read the documentation and FAQ sections below the tool.
- **Correction**: Replaced with `overscroll-behavior-y: auto;` to allow smooth scroll chaining into the parent container.

### 2.3 Fragile `scrollIntoView()` Navigation
- **Why it failed**: Native `element.scrollIntoView()` frequently miscalculated scroll offsets when elements were nested inside `contain: layout` parents on Safari and Android browsers.
- **Correction**: Replaced with deterministic relative offset calculations dispatched to the parent scroll container (`scrollContainer.scrollTo({ top, behavior: 'smooth' })`).

---

## 3. 🔄 Future Iteration & Opportunities

1. **Client-Side OCR for Screenshots**: Allow users pasting screenshots of code or terminal logs to instantly extract plaintext using a lightweight WebAssembly worker.
2. **In-Editor Code Syntax Highlighting**: Auto-detect language fences in text (e.g. JSON, TypeScript, SQL, Bash) and render themed highlighting.
3. **Acklet Multi-Tool Data Chaining**: Add a "Send to DataLens" button to instantly format and inspect JSON/YAML payloads without copying and opening another tab.

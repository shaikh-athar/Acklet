---
tool: Online Clipboard
phase: 1
last-updated: 2026-10-20
status: Complete
---

# Online Clipboard — Library Selection & Technology Strategy

## 1. Chosen Technology Stack

### 1.1 Frontend Architecture

| Library / Tool | Version | Purpose in Online Clipboard | Technical Rationale & Selection Criteria |
| :--- | :--- | :--- | :--- |
| **Angular** | `^22.0.0` | Core framework, signals, reactive state, standalone components | First-class reactivity with signals (`signal`, `computed`), `ChangeDetectionStrategy.OnPush`, seamless TypeScript integration. |
| **@acklet/tool-shell** | Monorepo package | Canonical Acklet design system, layout, dual-theme tokens, Spartan UI Helm | Guarantees brand consistency, WCAG AAA dual-theme compliance (`tokens.css`), Spartan Helm primitives (`HlmButton`, `HlmBadge`, `HlmInput`). |
| **Web Cryptography API** | Native Web Standard (`window.crypto.subtle`) | Client-side AES-GCM-256 encryption & PBKDF2 key derivation | Zero-dependency, hardware-accelerated encryption directly supported in all modern browsers. |
| **ZipBuilder** | Internal zero-dependency utility (`services/zip-builder.ts`) | In-browser folder to ZIP packaging using `CompressionStream('deflate-raw')` | Native browser streaming compression avoiding heavy 100KB+ external ZIP libraries. |
| **@lucide/angular** | `^1.32.0` | Iconography for toolbars, file categories, action buttons | Standard Acklet icon library; clean 16px/20px geometric stroke icons. |
| **qrcode** | `^1.5.4` | Canvas/SVG QR code generation for mobile camera pairing | Lightweight, dependable, client-side QR generation for direct room links. |
| **BroadcastChannel API** | Native Web Standard | Same-origin multi-tab instant synchronization | **0ms latency** local reflection across tabs without network roundtrips. |
| **Server-Sent Events (SSE)** | Native Web Standard (`EventSource`) | Cross-device real-time event streaming | Lightweight unidirectional event stream over HTTP/2, automatic reconnection backoff, firewall friendly. |

### 1.2 Backend Architecture

| Technology | Version | Purpose | Technical Rationale |
| :--- | :--- | :--- | :--- |
| **Spring Boot** | `3.3.x` / Java 21 | REST API, streaming endpoints, SSE emitter, scheduled purge | High-throughput asynchronous NIO handling, mature multipart streaming, robust enterprise scheduling. |
| **PostgreSQL** | `16.x` | Relational metadata store (shares, items, revisions, upload sessions) | Atomic transactions, JSONB metadata indexing, strict foreign key constraints with cascade deletes. |
| **Tomcat / NIO** | Embedded | Streaming multipart upload handling up to 200 MB per file | Configured via `spring.servlet.multipart.max-file-size=200MB` to eliminate buffer limits. |
| **Content-Addressable Storage (CAS)** | Native Java NIO | SHA-256 disk blob storage pool under `~/.acklet/clipboard_storage/` | Automatic disk deduplication across rooms; identical files store only one copy on disk. |

---

## 2. Rejected Alternatives & Technical Trade-Offs

### 2.1 Cryptography: Web Crypto API vs. CryptoJS / Forge
- **Rejected**: `crypto-js`, `node-forge`.
- **Reason**:
  - `crypto-js` is an unmaintained legacy library that runs slow JavaScript implementations of AES, blocking the main UI thread during large multi-megabyte payloads.
  - Native `window.crypto.subtle` is hardware-accelerated (AES-NI on modern CPUs), zero-dependency, and cryptographically verified by browser vendors.

### 2.2 ZIP Creation: In-Browser ZipBuilder vs. JSZip / Archiver
- **Rejected**: `jszip` (100KB+ bundle weight).
- **Reason**:
  - Standard ZIP files are straightforward binary streams with local file headers, central directories, and CRC-32 tables.
  - Modern browsers natively support `CompressionStream('deflate-raw')`.
  - Engineering `ZipBuilder` internally reduced bundle size by 100KB+ and enabled fine-grained streaming control without external supply-chain vulnerabilities.

### 2.3 Real-Time Sync: Server-Sent Events (SSE) vs. WebSockets (STOMP) vs. Socket.io
- **Rejected**: Full-duplex WebSockets / Socket.io for the standalone tool view.
- **Reason**:
  - The client interacts with the server primarily via standard HTTP POST/PUT requests (saving text, streaming file chunks).
  - The server only needs to push notifications (*"item added"*, *"item deleted"*).
  - WebSockets introduce stateful connection management, heartbeat ping/pong overhead, and corporate firewall/proxy blocking.
  - Server-Sent Events run over standard HTTP/2 streams, reconnect automatically via native browser mechanisms, and seamlessly pass through corporate proxies.

### 2.4 State Management: Angular Signals vs. NgRx / Akita
- **Rejected**: NgRx Store, Redux, Akita.
- **Reason**:
  - Online Clipboard is a single-screen focused tool application.
  - NgRx introduces massive boilerplate (actions, reducers, selectors, effects) without tangible benefit.
  - Angular signals (`signal`, `computed`) provide fine-grained, frictionless, reactive state management natively within the component with zero external dependencies.

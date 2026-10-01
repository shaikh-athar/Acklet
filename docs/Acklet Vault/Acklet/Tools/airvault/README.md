# AirVault — Cross-Device Clipboard & Real-Time Sync Platform

Welcome to the architectural and engineering documentation for **AirVault by Acklet**.

AirVault is a high-performance, real-time cross-device clipboard synchronization and file transfer platform built on encrypted transport architecture, dedicated frontend Web Workers, and a resilient Spring Boot backend streaming layer.

---

## 1. System Architecture Overview

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       AIRVAULT CLIENT RUNTIME                                           │
│                                                                                                        │
│   ┌───────────────────────────┐    ┌───────────────────────────────────┐    ┌──────────────────────┐   │
│   │    Angular UI & State     │    │  Web Workers (Off-Thread Compute) │    │ IndexedDB Persistent │   │
│   │  (Signals / OnPush / CDK) │    │  airvault.worker & upload-worker  │    │     Vault Storage    │   │
│   └─────────────┬─────────────┘    └─────────────────┬─────────────────┘    └──────────┬───────────┘   │
│                 │                                    │                                 │               │
└─────────────────┼────────────────────────────────────┼─────────────────────────────────┼───────────────┘
                  │                                    │                                 │
                  ▼                                    ▼                                 ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               MULTI-TIER TRANSPORT & SIGNALING LAYER                                   │
│                                                                                                        │
│   Tier 1: Multi-Tab BroadcastChannel (0ms latency, same origin)                                        │
│   Tier 2: WebRTC P2P DataChannels (Low-latency direct peer beam)                                       │
│   Tier 3: Spring Boot Signaling & Mailbox Relay (/api/v1/airvault/sync)                                │
│   Tier 4: Resumable Chunked File Upload Engine (/api/v1/airvault/uploads) + SSE Stream Emitters        │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                       │
                                                       ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    SPRING BOOT BACKEND LAYER                                           │
│                                                                                                        │
│   • AirVaultDeviceController & Service: Device registration, heartbeats, presence, revocation          │
│   • AirVaultSyncController: Targeted & broadcast WebRTC signaling ring buffer                          │
│   • AirVaultUploadController & Service: Authoritative 1 GB cap check, 500 MB file limit,               │
│     7-day auto-purge, missing chunk recovery, and Server-Sent Events (SSE) live progress               │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Architectural Pillars

1. **Client-Side Cryptography & Encrypted Transport**:
   - Web Crypto API ECDH (P-256 NIST curve) key agreement per device pair.
   - Symmetric AES-GCM-256 payload encryption with cryptographically random 12-byte initialization vectors (IVs).
   - Content is encrypted in transit; link-shared clipboards are stored on the server until their expiration TTL.

2. **Dedicated Web Worker Off-Thread Compute**:
   - `airvault.worker.ts`: Off-thread content categorization (Code, URL, Image, File, Plain Text), sensitive credential scanning (AWS, GitHub, OpenAI, JWT, Credit Cards), and offscreen canvas thumbnail rendering (`createImageBitmap` + `OffscreenCanvas`).
   - `upload-worker.ts`: Off-thread 4MB chunked file streaming, client-side AES-GCM encryption per chunk, abortable uploads via `AbortController`, and granular progress emission.

3. **Resilient Spring Boot Backend & Streaming Layer**:
   - Server-authoritative 1 GB storage quota enforcement combining active database usage and in-flight upload sessions.
   - 500 MB maximum single file size guard with strict rejection feedback.
   - Automatic 7-day expiration and permanent deletion policy for uploaded files and media on both backend disk/DB and client IndexedDB.
   - Idempotent chunk storage with duplicate byte guards and missing chunk index queries.
   - Real-time Server-Sent Events (`/api/v1/airvault/clipboards/{clipboardId}/events`) broadcasting live upload stages and completion events across all connected devices.

4. **Multi-Tier Transport Fallback**:
   - Instant local multi-tab broadcast (`BroadcastChannel`).
   - Persistent bidirectional WebSocket transport (`/ws/airvault`) with automatic reconnection and keepalive.
   - Deterministic delivery confirmation ACKs and offline outbox queues with automatic flush upon peer reconnection.

5. **Universal Metadata-First & Bounded Client LRU Cache**:
   - Lists and history views load **strictly lightweight metadata** (`id`, `filename`, `category`, `byteSize`, `checksum`, thumbnail `previewUrl`) with zero payload hydration on startup.
   - Resource payloads (both $\le 5\text{MB}$ and $> 5\text{MB}$) are fetched **strictly on-demand** when the user views, copies, downloads, or resends.
   - In-memory bounded **LRU binary cache** (`AirVaultResourceCacheService`, 50 MB budget) using native `Blob` and Object URLs, completely avoiding memory-heavy Base64 strings.
   - Concurrent in-flight request deduplication collapsing simultaneous requests for the same resource into a single network stream.
   - Zero-copy backend reactive binary streaming (`GET /api/v1/airvault/clipboards/{clipboardId}/files/{fileId}/raw`) with zero server-side heap buffering.

6. **4-Tier Identity & Connection Management Architecture**:
   - **`accountId` / `@username` (User Identity)**: Human-readable handle and identity credentials. Multiple browsers or installations can sign in to the same user identity.
   - **`installationId` (`dev-xxxxx`) (Browser/Device Identity)**: Persistent hardware/browser identity stored locally in `localStorage`. Guaranteed unique and independent across browser profiles (Chrome Normal, Chrome Incognito, Safari, Mobile).
   - **`sessionId` (Connection/Transport Identity)**: Ephemeral live-wire presence in Redis tracking active transport handles.
   - **`pairingId` (`airvault_device_pairings`) (Relationship Identity)**: Authoritative PostgreSQL entity tracking device-to-device relationships, sync permissions, and reciprocal statuses (`ACTIVE`, `PAIRED`, `REVOKED`).
   - **Strict Installation-ID Peer Matching**: Eliminates fuzzy username-based peer overwrites when multiple devices share an account.
   - **Targeted Lifecycle Signaling**: `DEVICE_DISCONNECT`, `DEVICE_RECONNECT`, and `DEVICE_REVOKE` events are strictly directed to `targetDeviceId`, eliminating network-wide broadcast disconnect cascades.
   - **Account-Scoped Persistent Disconnect**: Disconnect flags are isolated per account (`acklet_airvault_disconnected_peer_ids_<username>`), preventing cross-account state leakage and presence overrides.

7. **Local Vault Persistence & Retention**:
   - IndexedDB v2 schema separating `vault_items` (metadata) and `vault_payloads` (binary payloads).
   - Configurable retention periods (`15m`, `1h`, `24h`, `7d`, `Never`) and 1-click purge.

---

## 3. Documentation Suite Index

| Document | Description |
| :--- | :--- |
| [description.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/description.md) | Product specification, core user workflows, and lifecycle states |
| [feature.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature.md) | Master feature audit matrix and implementation verification status |
| [UI_REFERENCE.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/UI_REFERENCE.md) | UI tokens, responsive layouts, design tokens, and components |
| [LEGEND.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/LEGEND.md) | Action semantics, status badges, shortcut table, and transport indicators |
| [feature-12-backend-architecture.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature-12-backend-architecture.md) | **Backend Layer**: Spring Boot REST endpoints, chunked upload service, 100MB cap, and SSE emitters |
| [feature-13-web-workers-pipeline.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature-13-web-workers-pipeline.md) | **Frontend Web Workers**: Off-thread compute, `airvault.worker.ts`, and `upload-worker.ts` pipeline |
| [feature-1-auth.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature-1-auth.md) | User Identity, Vault Scoping & Session Management |
| [feature-2-3-device-management.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature-2-3-device-management.md) | Device Registration (QR/PIN), Constellation Dock & Management |
| [feature-4-clipboard-capture.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature-4-clipboard-capture.md) | Clipboard Capture, Auto-Listening, Sensitive Shield & Thumbnails |
| [feature-5-clipboard-synchronization.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature-5-clipboard-synchronization.md) | Multi-Tier Sync Transport, Signaling Relay, Outbox & Delivery ACKs |
| [feature-6-current-clipboard.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature-6-current-clipboard.md) | Active Clipboard Stream, Card Rendering, 1-Click Copy & Hero Anchor |
| [feature-7-history-memory.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature-7-history-memory.md) | IndexedDB Storage, Expiration Lifecycles & Quota Management |
| [feature-8-security-privacy.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature-8-security-privacy.md) | Zero-Knowledge E2EE, Web Crypto Architecture & Credential Masking |
| [feature-9-settings-preferences.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature-9-settings-preferences.md) | Preferences Drawer, Keyboard Shortcuts & Automation Controls |
| [feature-10-diagnostics-telemetry.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature-10-diagnostics-telemetry.md) | Real-Time Telemetry, Network RTT Diagnostics & Transport Fallback |
| [feature-11-export-import.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature-11-export-import.md) | Vault Portability, JSON Backup & Restore |
| [motion.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/motion.md) | GSAP Beam Choreography, Particle Transitions & Micro-Interactions |

---

## 4. Key File Paths

- **Angular Root Component**: [client/src/tools/airvault/airvault.component.ts](file:///Users/ayaz/Acklet/client/src/tools/airvault/airvault.component.ts)
- **Web Workers**:
  - [client/src/tools/airvault/services/airvault.worker.ts](file:///Users/ayaz/Acklet/client/src/tools/airvault/services/airvault.worker.ts)
  - [client/src/tools/airvault/services/upload-worker.ts](file:///Users/ayaz/Acklet/client/src/tools/airvault/services/upload-worker.ts)
- **Frontend Services**:
  - [client/src/tools/airvault/services/airvault-sync.service.ts](file:///Users/ayaz/Acklet/client/src/tools/airvault/services/airvault-sync.service.ts)
  - [client/src/tools/airvault/services/airvault-crypto.service.ts](file:///Users/ayaz/Acklet/client/src/tools/airvault/services/airvault-crypto.service.ts)
  - [client/src/tools/airvault/services/airvault-clipboard.service.ts](file:///Users/ayaz/Acklet/client/src/tools/airvault/services/airvault-clipboard.service.ts)
  - [client/src/tools/airvault/services/airvault-storage.service.ts](file:///Users/ayaz/Acklet/client/src/tools/airvault/services/airvault-storage.service.ts)
  - [client/src/tools/airvault/services/airvault-device.service.ts](file:///Users/ayaz/Acklet/client/src/tools/airvault/services/airvault-device.service.ts)
  - [client/src/tools/airvault/services/airvault-telemetry.service.ts](file:///Users/ayaz/Acklet/client/src/tools/airvault/services/airvault-telemetry.service.ts)
- **Backend Controllers & Services**:
  - [server/acklet/src/main/java/com/code/acklet/airvault/controller/AirVaultUploadController.java](file:///Users/ayaz/Acklet/server/acklet/src/main/java/com/code/acklet/airvault/controller/AirVaultUploadController.java)
  - [server/acklet/src/main/java/com/code/acklet/airvault/service/AirVaultUploadService.java](file:///Users/ayaz/Acklet/server/acklet/src/main/java/com/code/acklet/airvault/service/AirVaultUploadService.java)
  - [server/acklet/src/main/java/com/code/acklet/airvault/controller/AirVaultSyncController.java](file:///Users/ayaz/Acklet/server/acklet/src/main/java/com/code/acklet/airvault/controller/AirVaultSyncController.java)
  - [server/acklet/src/main/java/com/code/acklet/airvault/controller/AirVaultDeviceController.java](file:///Users/ayaz/Acklet/server/acklet/src/main/java/com/code/acklet/airvault/controller/AirVaultDeviceController.java)
  - [server/acklet/src/main/java/com/code/acklet/airvault/service/AirVaultDeviceService.java](file:///Users/ayaz/Acklet/server/acklet/src/main/java/com/code/acklet/airvault/service/AirVaultDeviceService.java)

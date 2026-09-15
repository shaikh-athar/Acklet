# Feature 5 — Cross-Device Clipboard Synchronization Specification

## 1. Executive Summary & Objective

**Feature 5 (Cross-Device Clipboard Synchronization)** powers real-time, zero-knowledge P2P clipboard transport across connected devices using Web Crypto ECDH/AES-GCM-256 encryption, `BroadcastChannel` (multi-tab sync), WebRTC DataChannels, Spring Boot Signaling & Mailbox Relay, Server-Sent Events (SSE), delivery confirmation ACKs, and offline outbox queueing.

---

## 2. Multi-Tier Synchronization Architecture & Sequence

```text
  [ Device A: Sender ]                                          [ Device B: Receiver ]
           │                                                               │
           │ 1. Off-Thread Encrypt Payload (AES-GCM-256 + 12-byte IV)     │
           │ 2. Tag with Packet UUID & Lamport Sequence                    │
           │                                                               │
           ├──────────── Tier 1: BroadcastChannel (Multi-tab) ────────────►│ (0ms latency)
           │                                                               │
           ├──────────── Tier 2: WebRTC DataChannel (Direct P2P) ─────────►│ (<20ms latency)
           │                                                               │
           ├──────────── Tier 3: Spring Boot WebSocket (/ws/airvault) ────►│ (Persistent Bidirectional Transport)
           │                                                               │
           │                                                               │ 3. Decrypt Payload via Web Crypto
           │                                                               │ 4. Classify & Display in Stream
           │                                                               │ 5. Update Peer Status (Active)
           │                                                               │
           │◄──────────── SYNC_ACK (Delivery Confirmation) ────────────────┤
           │                                                               │
     6. Update Item Status in IndexedDB                                    │
        (Delivered ✓✓)                                                     │
```

---

## 2.1 Persistent WebSocket Transport & Universal Real-Time Sync (`/ws/airvault`)

- **Persistent Connection Foundation**: Connects each active AirVault instance directly to Spring Boot backend at `/ws/airvault`.
- **Single Connection Guarantee**: Enforces exactly one active WebSocket connection per device/installation. Automatic eviction of stale sessions upon reconnection.
- **WebSocket Real-Time Signal Routing**:
  - All real-time signals (`SYNC_PACKET`, `SYNC_ACK`, `ITEM_DELETE`, `LIVE_CLIPBOARD_SYNC`, `PAIR_REQUEST`, `PAIR_CONFIRM`, `INITIAL_SYNC_*`, `DEVICE_*`, `DOC_OPERATION`, `DRAFT_*`) are dispatched and delivered over persistent WebSocket connections.
  - Receiving peers listen via WebSocket `onMessage$`, parse the incoming payload, and route to `handleMessage()` for instant zero-knowledge processing, decryption, and IndexedDB persistence.
  - Immediate `SYNC_ACK` confirmation is routed back across WebSocket to update delivery status (`delivered ✓✓`).
- **Heartbeat Keepalive**: Integrated 25s `PING`/`PONG` frames with round-trip latency tracking.
- **Exponential Reconnect**: Auto-reconnect with exponential backoff (1s → 2s → 4s → 8s → 16s → 30s) + jitter upon disconnect or network transition.
- **Lifecycle Integration**: Handshake authentication using `deviceId` and Spring Security authentication cookies.

---

## 3. Offline Handling, Identity Scoping & Outbox Queuing State

- **Multi-Tier Transport & Signaling Identifiers**:
  - `installationId`: Browser-unique hardware handle used for P2P routing and outbox queuing.
  - `sessionId`: Ephemeral live connection identifier mapped to active WebSocket sessions.
  - `pairingId`: Persistent cryptographic grant in `airvault_device_pairings`.
  - `accountId` / `@username`: Author identity stamped on line blame attribution.
- **Targeted Lifecycle Events vs. Broadcast Data**:
  - Data items (`CLIPBOARD_BEAM`, `ITEM_DELETE`, `LIVE_CLIPBOARD_SYNC`) route across all paired, active devices.
  - Lifecycle state changes (`DEVICE_DISCONNECT`, `DEVICE_RECONNECT`, `DEVICE_REVOKE`) are strictly directed to `targetDeviceId`.
  - Broadcast lifecycle signals are forbidden and rejected by the backend relay to prevent cascade disconnects.
- **Audio & Notification Ringtone Guarantee**:
  - AirVault uses exclusively the official audio chime (`/assets/airvault/airvault_notification.mp3`) with volume normalization and gesture pre-warming.
  - Synthetic oscillator chimes are removed to maintain uniform, professional sound branding across all platforms.
- **Delivery Confirmation Matrix**:
  - `pending`: Packet transmitted, waiting for receiver ACK.
  - `delivered`: Multi-tab or peer transmission verified.
  - `confirmed`: Remote receiver confirmed decryption and local ingestion.
  - `queued_offline`: Peer currently unreachable, queued locally in memory and IndexedDB.
  - `failed`: Handshake or decryption error.

- **Collaborative Author Line Attribution & Deletions**:
  - Per-line author blame tracking with Myers LCS alignment preserving concurrent edits from multiple devices.
  - **Author Deletion Propagation**: When an author deletes lines they previously wrote, those lines are removed across connected peer devices (when `syncTextDeletions` is enabled). Lines written by other peers are strictly preserved. When disabled in Settings, peer devices retain the lines locally.
  - **Device-Specific Accent Highlighting**: Each author's lines, cards, gutters, and attribution tooltips render using the originating device's configured accent color (`authorColor` / `accentColor` / `LineBlameEntry.authorColor`).

- **Clipboard Item Retention Guarantee**:
  - Beaming content to peer devices never acts as a move or delete. Both the sending device and receiving devices retain their respective items in their active stream, feeds, and IndexedDB history.
  - Safari clipboard suggestion support integrates native clipboard read with synchronous focus, `visibilitychange`, and in-session fallback listeners.

---

## 4. Backend Signaling & Streaming Gateway (`com.code.acklet.airvault`)

- **WebSocket Handler**: [`AirVaultWebSocketHandler.java`](file:///Users/ayaz/Acklet/server/acklet/src/main/java/com/code/acklet/airvault/websocket/AirVaultWebSocketHandler.java)
  - `/ws/airvault` — Authenticated persistent WebSocket endpoint routing bidirectional real-time signals with RabbitMQ broker relay and audit logging.
- **Sync Controller**: [`AirVaultSyncController.java`](file:///Users/ayaz/Acklet/server/acklet/src/main/java/com/code/acklet/airvault/controller/AirVaultSyncController.java)
  - `POST /api/v1/airvault/sync/viewed` — Atomic Compare-And-Swap (CAS) endpoint for burn-after-read confirmation and remote cache purging.
- **SSE Stream**: [`AirVaultUploadController.java`](file:///Users/ayaz/Acklet/server/acklet/src/main/java/com/code/acklet/airvault/controller/AirVaultUploadController.java)
  - `GET /api/v1/airvault/clipboards/{clipboardId}/events` — Real-time Server-Sent Events stream for upload progress and sync completion.

---

## 5. Web Worker Offloading

Cryptographic key derivation and AES-GCM-256 payload processing are offloaded to `airvault.worker.ts` and `upload-worker.ts`, guaranteeing that live network synchronization does not block user interactions or UI rendering.

---

## 6. Related Documentation

- Master Overview: [README.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/README.md)
- Backend Architecture: [feature-12-backend-architecture.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature-12-backend-architecture.md)
- Web Worker Pipeline: [feature-13-web-workers-pipeline.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature-13-web-workers-pipeline.md)
- Device Management: [feature-2-3-device-management.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature-2-3-device-management.md)
- History & Storage: [feature-7-history-memory.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature-7-history-memory.md)

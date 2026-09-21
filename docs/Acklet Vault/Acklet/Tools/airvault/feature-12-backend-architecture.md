# AirVault Feature 12 — Backend Architecture, Chunked Uploads & RabbitMQ Assembly Pipelines

## 1. Executive Overview

The **AirVault Backend Layer** (`com.code.acklet.airvault`) in Spring Boot provides high-throughput, server-authoritative coordination for device authentication, WebRTC signaling relays, non-blocking chunked file uploads, 500 MB file size limit enforcement, Redis chunk tracking, durable RabbitMQ assembly pipelines, and dead-letter retry queues.

Although clipboard contents are encrypted client-side with zero-knowledge keys, the backend acts as an authoritative facilitator for multi-device presence, rate-limited authentication, and asynchronous multi-gigabyte payload assembly.

---

## 2. Backend Package Structure

```text
server/acklet/src/main/java/com/code/acklet/airvault/
├── config/
│   ├── AirVaultRabbitMqConfig.java     # Upload exchange, durable queues, DLQ dead-letter routing
│   └── AirVaultExecutorConfig.java     # Dedicated thread-pool executor for WebSocket JSON & I/O offloading
├── diagnostic/
│   └── WsOperationTimer.java           # High-resolution microsecond latency profiling & timers
├── controller/
│   ├── AirVaultDeviceController.java   # Device registration, heartbeats, rename, revoke, logout
│   ├── AirVaultSyncController.java     # WebRTC signaling relay & direct/broadcast mailboxes
│   └── AirVaultUploadController.java   # Chunked upload sessions, 500 MB limit, SSE & completion
├── websocket/
│   ├── AirVaultWebSocketConfig.java    # Registers persistent WebSocket endpoint at /ws/airvault
│   ├── AirVaultWebSocketHandler.java   # Session registry, keepalive PING/PONG, signal routing, slow client eviction
│   ├── AirVaultHandshakeInterceptor.java # Device ID & JWT auth parameter verification
│   └── dto/
│       └── AirVaultWsMessage.java      # Typed WebSocket JSON envelope (CONNECT_ACK, PING, PONG, SIGNAL)
├── service/
│   ├── AirVaultDeviceService.java      # Device lifecycle, Redis caching, presence tracking
│   ├── AirVaultRedisTracker.java       # Fast chunk sets, session states, rate limiting counters
│   ├── AirVaultUploadService.java      # Non-blocking chunk writes, session verification, RabbitMQ dispatch
│   └── AirVaultUploadAssemblyWorker.java # RabbitMQ consumer (3-10 concurrency), chunk assembly & cleanup
├── repository/
│   ├── AirVaultDeviceRepository.java   # Device JPA persistence
│   ├── AirVaultDevicePairingRepository.java # Authoritative device-to-device pairings
│   ├── UploadSessionRepository.java    # Active/completed upload sessions & sum queries
│   └── ClipboardFileRepository.java    # Stored encrypted files & total byte calculations
├── entity/
│   ├── AirVaultDevice.java             # Device entity with username, keyword, thumbprint
│   ├── AirVaultDevicePairing.java      # Device pairing relationship entity
│   ├── UploadSession.java              # Resumable session metadata with received chunk bitmap
│   └── ClipboardFile.java              # Permanent encrypted file record
└── dto/
    ├── AirVaultDeviceDto.java
    ├── AirVaultAuthDtos.java           # Authentication, pairing, and identity DTOs
    ├── RegisterDeviceRequest.java
    ├── SignalMessageDto.java           # WebRTC SDP offer/answer/ICE payload
    └── UploadSessionDtos.java          # Initiate, Chunk, Status, Complete, Usage DTOs
```

---

## 3. 4-Tier Identity & Connection Architecture

AirVault enforces a strict 4-tier separation between user credentials, browser installations, transport sessions, and device pairings:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        4-TIER ARCHITECTURE                             │
├───────────────────┬────────────────────────────────────────────────────┤
│ 1. User Identity  │ accountId / @username (AirVaultIdentity entity)    │
│                   │ • Unique human handle & BCrypt hashed PIN creds    │
│                   │ • Backed by airvault_identities table              │
├───────────────────┼────────────────────────────────────────────────────┤
│ 2. Device Identity│ installationId / clientDeviceId (AirVaultDevice)   │
│                   │ • Stable dev-xxxxx assigned per browser profile    │
│                   │ • Isolated across Normal, Incognito & Safari       │
│                   │ • Backed by airvault_devices table                 │
├───────────────────┼────────────────────────────────────────────────────┤
│ 3. Transport ID   │ sessionId                                          │
│                   │ • Ephemeral live presence & mailbox in Redis       │
│                   │ • Redis keys: airvault:session:{deviceId}          │
├───────────────────┼────────────────────────────────────────────────────┤
│ 4. Relationship ID│ pairingId (AirVaultDevicePairing entity)           │
│                   │ • Authoritative PostgreSQL device-to-device entity │
│                   │ • Tracks states: ACTIVE, PAIRED, REVOKED           │
│                   │ • Backed by airvault_device_pairings table         │
└───────────────────┴────────────────────────────────────────────────────┘
```

### 3.1 Device-to-Device Pairing Table (`airvault_device_pairings`)

```sql
CREATE TABLE airvault_device_pairings (
    id VARCHAR(36) PRIMARY KEY,
    owner_device_id VARCHAR(64) NOT NULL,
    peer_device_id VARCHAR(64) NOT NULL,
    owner_identity_id VARCHAR(36) NOT NULL,
    peer_identity_id VARCHAR(36) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_airvault_device_pairings UNIQUE (owner_device_id, peer_device_id)
);
```

### 3.2 Targeted Signaling & Lifecycle Isolation Rules
- **No Broadcast Cascades**: `DEVICE_DISCONNECT`, `DEVICE_RECONNECT`, and `DEVICE_REVOKE` signals are strictly directed to `targetDeviceId`. The backend `AirVaultSyncController` rejects any attempt to broadcast lifecycle signals, preventing network-wide disconnect cascades.
- **Strict Device ID Lookup**: Peering is established by `installationId` (`clientDeviceId`), completely eliminating peer overwriting or identity flapping when multiple devices log in under the same username.
- **Authoritative Database Reconciliation**: Frontend client startup executes `GET /api/v1/airvault/auth/reconcile?clientDeviceId=...` to query `AirVaultDevicePairingRepository` authoritatively, restoring active peering state even after network restarts.

---

## 4. Chunked File Upload & Ingestion Pipeline

```text
[ Client (Valid Session Token) ]
           │
           ├─► 1. POST /uploads/init (Enforces 500 MB limit; returns uploadId)
           │
           ├─► 2. PUT /uploads/{uploadId}/chunks/{chunkIndex}
           │       ├── Writes chunk non-blocking to disk storage
           │       └── Redis records received chunk in Set (`airvault:upload:chunks:{id}`)
           │
           ├─► 3. POST /uploads/{uploadId}/complete
           │       └── Publishes `upload.completed` event to RabbitMQ
           │
           ▼
[ RabbitMQ Topic Exchange: `acklet.airvault.upload.exchange` ]
           │
           ▼ (Queue: `acklet.airvault.upload.completed.queue`, Concurrency: 3–10)
[ AirVaultUploadAssemblyWorker ]
  ├─► Fetch all chunk files for uploadId
  ├─► Assembles sequentially into target file (never buffering full file in RAM)
  ├─► Calculates SHA-256 integrity checksum & moves to permanent storage
  ├─► Cleans up temporary chunk files
  ├─► Updates status in PostgreSQL & Redis (`COMPLETED`)
  └─► On failure: Nack to Dead-Letter Queue (`acklet.airvault.upload.dlq`) & marks `FAILED`
```

---

## 5. Detailed REST & Streaming API Endpoints

### 5.1 Device Management (`/api/v1/airvault/devices`)

| Method | Path | Summary | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/airvault/devices` | List registered devices | Returns all active, non-revoked devices paired with the user's vault. |
| `POST` | `/api/v1/airvault/devices/register` | Register/re-activate device | Idempotently creates or updates device fingerprint, OS, browser, and public key thumbprint. |
| `POST` | `/api/v1/airvault/devices/{clientDeviceId}/heartbeat` | Record heartbeat | Updates `lastActiveAt` timestamp for real-time presence indicators (`Active`, `Idle`, `Offline`). |
| `POST` | `/api/v1/airvault/devices/presence/batch` | Batch device presence | Retrieves real-time presence states for multiple devices in a single call. |
| `PATCH` | `/api/v1/airvault/devices/{clientDeviceId}/rename` | Rename device | Updates the human-readable display name of a paired device. |
| `DELETE` | `/api/v1/airvault/devices/{clientDeviceId}` | Revoke device | Flags the device as revoked, preventing future sync packet delivery. |

---

### 5.2 Persistent WebSocket & Real-Time Sync (`/ws/airvault` & `/api/v1/airvault/sync`)

| Protocol / Method | Path | Summary | Description |
| :--- | :--- | :--- | :--- |
| `WebSocket` | `/ws/airvault` | Persistent real-time signaling transport | Handles bidirectional real-time communication for all peer signals (`SYNC_PACKET`, `SYNC_ACK`, `ITEM_DELETE`, `LIVE_CLIPBOARD_SYNC`, `PAIR_REQUEST`, `PAIR_CONFIRM`, `INITIAL_SYNC_*`, `DEVICE_*`, `DOC_OPERATION`, `DRAFT_*`). Authenticated via Spring Security cookie/bearer, tracks active sessions, routes direct & broadcast messages in-memory with RabbitMQ relay, offloads JSON serialization & DB audits to a dedicated ThreadPoolTaskExecutor (`wsOffloadExecutor`), and enforces a 2-second timeout with slow-client eviction. |
| `POST` | `/api/v1/airvault/sync/viewed` | Atomic burn-after-read confirmation | Atomically registers first-view via Compare-And-Swap (CAS) in MySQL, records audit log entry, purges remote metadata/payloads, and broadcasts deletion to connected WebSocket clients. |

---

### 5.3 Chunked Upload Engine & SSE Events (`/api/v1/airvault`)

| Method | Path | Summary | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/airvault/clipboards/{clipboardId}/uploads` | Initiate upload session | Authoritatively checks database usage against `MAX_CLIPBOARD_CAP_BYTES` (1 GB) and `MAX_SINGLE_FILE_SIZE_BYTES` (500 MB). Allocates session ID and verifies storage quota before writing. |
| `PUT` | `/api/v1/airvault/uploads/{sessionId}/chunks/{chunkIndex}` | Upload encrypted chunk | Ingests `application/octet-stream` chunk (e.g. 4MB). Writes idempotently to storage file without double-counting received bytes. Emits SSE event. |
| `GET` | `/api/v1/airvault/uploads/{sessionId}/status` | Query upload status | Returns received chunks count, received bytes, and a list of `missingChunkIndices` for resilient upload resume. |
| `POST` | `/api/v1/airvault/uploads/{sessionId}/complete` | Complete upload | Validates all chunks are present, records optional SHA-256 checksum & preview URL, promotes session to permanent `ClipboardFile`, and emits `upload_complete` SSE. |
| `GET` | `/api/v1/airvault/clipboards/{clipboardId}/usage` | Authoritative storage usage | Computes exact total stored bytes vs 1 GB cap, calculating percentage and remaining byte capacity. |
| `GET` | `/api/v1/airvault/clipboards/{clipboardId}/events` | Real-time SSE stream | Produces `text/event-stream` with 3-minute timeout and automatic cleanup on disconnect. Broadcasts `upload_initiated`, `upload_progress`, and `upload_complete`. |

---

## 6. Storage Quota Enforcement Logic

```text
Total Clipboard Storage Cap: 1 GB (1,073,741,824 Bytes) · Max Single File: 500 MB (524,288,000 Bytes)
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
   [ DB Query: ]                     [ DB Query: ]
  sumTotalBytes                     sumActiveUploads
 (Completed Files)                  (In-flight Sessions)
        │                                 │
        └────────────────┬────────────────┘
                         ▼
           effectiveUsage = Total + Active
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
[ newFileSize <= remaining && <= 500MB ]   [ exceeds remaining OR > 500MB ]
        │                                 │
  Status: 200 OK                    Status: 400 Bad Request
 (Session Created)              ("Storage cap exceeded / File limit > 500MB")
```

---

## 7. RabbitMQ & Redis Asynchronous Assembly Pipeline

For large file transfers (up to 500 MB), the backend decouples non-blocking chunk reception from background file assembly and compression:

```text
Client (Web Worker / 4MB Chunks)
       │
       │ HTTP PUT /api/v1/airvault/uploads/{id}/chunks/{index}
       ▼
Non-Blocking Controller
       │
       ├─► 1. Writes chunk directly to disk (Paths.get(.../uploads/{id}/{index}))
       ├─► 2. Records chunkIndex in Redis Set (`airvault:upload:chunks:{id}`)
       └─► 3. Returns 200 OK fast (<10ms, zero thread blocking)
       │
Client sends POST /api/v1/airvault/uploads/{id}/complete
       │
       ▼
Upload Service
       │
       ├─► Validates all chunk indices present via Redis
       ├─► Publishes event (`upload.completed`, uploadSessionId) to RabbitMQ exchange
       └─► Returns HTTP 200 with status "ASSEMBLING"
       │
RabbitMQ Topic Exchange (`acklet.airvault.upload.exchange`)
       │ (Durable Queue: `acklet.airvault.upload.completed.queue` + Dead-Letter: `acklet.airvault.upload.dlq`)
       ▼
AirVault Assembly Worker (`AirVaultUploadAssemblyWorker`, concurrency = "3-10")
       │
       ├─► 1. Fetches all chunk streams from disk in sequential index order
       ├─► 2. Assembles chunks into single contiguous file
       ├─► 3. Performs whole-file post-assembly compression (GZIP / DEFLATE)
       ├─► 4. Computes SHA-256 verification checksum
       ├─► 5. Promotes session in PostgreSQL to permanent `ClipboardFile`
       ├─► 6. Updates Redis status to `READY` (24h TTL)
       ├─► 7. Cleans up intermediate temporary chunk files
       └─► 8. Emits SSE `upload_complete` to all connected devices in real time
```

### 7.1 Redis Tracking Keys
- `airvault:upload:chunks:{sessionId}`: Redis Set of received chunk integers.
- `airvault:upload:status:{sessionId}`: In-memory string status (`UPLOADING`, `ASSEMBLING`, `READY`, `FAILED`) with 24h TTL.

---

## 8. Server-Sent Events (SSE) Protocol

When clients connect to `GET /api/v1/airvault/clipboards/{clipboardId}/events`, the backend maintains a thread-safe list of `SseEmitter` instances in `AirVaultUploadService.clipboardEmitters`.

Events emitted:
1. `connected`: Initial handshake confirmation upon stream connection.
2. `upload_initiated`: Emitted when a peer initiates a new file upload session.
3. `upload_progress`: Emitted on every chunk processed, containing `chunksReceived`, `totalChunks`, `receivedBytes`, and `progressPercent`.
4. `upload_complete`: Emitted upon session completion with final file metadata and preview URL.

---

## 9. Pluggable Object Storage Abstraction & Cloudflare R2 Support

AirVault decouples all backend storage operations through the `AirVaultStorageAdapter` interface, allowing transparent switching between local filesystem and cloud object storage via a single server-side configuration flag:

```text
                  AirVault Business Logic
            (AirVaultUploadService / AssemblyWorker)
                              │
                              ▼
                  AirVaultStorageAdapter (Interface)
                  ┌───────────┴───────────┐
                  │                       │
                  ▼                       ▼
          LocalStorageAdapter      R2StorageAdapter
          (Local Disk / Dev)       (Cloudflare R2 / S3 API)
```

### 9.1 Storage Backend Flag (`STORAGE_BACKEND`)
- `STORAGE_BACKEND=local` (Default): Uses `LocalStorageAdapter` for local development. Requires zero cloud credentials and zero network calls.
- `STORAGE_BACKEND=r2`: Production deployment mode. Connects to Cloudflare R2 using AWS SDK v2 (`S3Client`) with path-style access.
- **Fail-Fast Validation**: If `STORAGE_BACKEND=r2` is set with missing credentials, Spring Boot aborts startup with an explicit descriptive error.

### 9.2 Decompression-on-Access, LRU File Cache & HTTP 206 Partial Content Streaming
When clients request file streams from `GET /api/v1/airvault/clipboards/{clipboardId}/files/{fileId}/raw`:
1. `AirVaultUploadService` checks if the stored object is compressed (GZIP magic header `0x1f 0x8b`).
2. If compressed, it decompresses on-the-fly and caches the decompressed stream in `AirVaultDecompressedFileCache`.
3. The cache is keyed by content hash (`checksum`), size-bounded (500 MB LRU), with a 15-minute TTL and concurrency stampede locks.
4. **HTTP 206 Partial Content / Byte-Range Streaming**: If a client sends an `HTTP Range` header (e.g., `bytes=0-1048575` for video/audio preview seeking), `AirVaultUploadController` processes random-access byte slicing via Spring's `ResourceRegion` with `206 PARTIAL_CONTENT` and `Accept-Ranges: bytes`. This enables instant progressive video/audio playback of 100MB+ media files without buffering the full payload into client memory or Signals.
5. On file deletion or clipboard purge, cache entries are invalidated immediately.

---

## 10. Progressive Resource Loading Architecture

AirVault avoids loading entire large payloads into memory, Signals, or IndexedDB during card preview or inspection. The progressive loading model operates across resource categories:

| Resource Category | Progressive Loading Mechanism | Client Behavior |
| :--- | :--- | :--- |
| **Video & Audio** | HTTP 206 Partial Content / Range Requests | HTML5 `<video>`/`<audio>` with `preload="metadata"` streams chunks dynamically as media plays. |
| **Spreadsheets (CSV/TSV)** | Progressive Row Pagination & Infinite Scroll | Renders initial 100 rows; auto-loads subsequent 100-row chunks as the user scrolls or clicks *Load more*. |
| **Code, Markdown & Text** | Chunked Viewport Rendering & Auto-Expansion | Renders first 50 KB / viewport; streams/renders remaining chunks progressively on scroll without UI lag. |
| **Archives (ZIP/RAR)** | Metadata Manifest First | Reads directory index and uncompressed file sizes first without extracting binary payloads into memory. |
| **Images & Fonts** | Native Browser Decoding & LRU Memory Caching | Staged with metadata first; full binary resolved on-demand through bounded object URLs. |
| **PDF & Documents** | Native Sandboxed Frames / Streams | Sandboxed stream embedding without keeping heavy binary buffers in Angular reactivity graph. |

---

## 10. Related Documentation

- Master Overview: [README.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/README.md)
- Web Worker Pipeline: [feature-13-web-workers-pipeline.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature-13-web-workers-pipeline.md)
- Synchronization Transport: [feature-5-clipboard-synchronization.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature-5-clipboard-synchronization.md)


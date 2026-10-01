# AirVault — Product Specification & Technical Flows

## 1. Product Description

**AirVault by Acklet** is a secure, real-time cross-device clipboard synchronization platform and file-sharing tool. Engineered for software engineers, designers, DevOps practitioners, and multi-device power users, AirVault provides an instantaneous bridge between workstations, laptops, tablets, and phones without compromising security or privacy.

Every piece of data — whether a snippet of code, an API key, an image, a URL, or an arbitrary binary file — is encrypted on the client using **zero-knowledge Web Crypto primitives (ECDH P-256 and AES-GCM-256)** before leaving the device.

---

## 2. Core User Workflows

### 2.1 Device Pairing Handshake Workflow

```text
[ Device A (e.g. Mac @ayaz) ]                      [ Device B (e.g. Safari / iPhone @safari_user) ]
                │                                                 │
  1. Opens Pair Modal (Generates PIN "839 201" & QR)              │
  2. Embeds authentic identity: @ayaz + Device Info               │
  3. Subscribes to local BroadcastChannel & Spring Signal Relay   │
                │                                                 │
                │                                4. Scans QR Code / Enters PIN "839 201" (or pairs via @ayaz)
                │                                5. Emits PAIR_REQUEST carrying authentic @safari_user identity
                │                                                 │
                │◄───────────────── PAIR_REQUEST ─────────────────┤
                │                                                 │
  6. Verifies PIN matches "839 201" (or validates @safari_user)   │
  7. Registers Device B with authentic name "@safari_user"        │
  8. Responds with PAIR_CONFIRM carrying authentic @ayaz metadata │
                │                                                 │
                ├───────────────── PAIR_CONFIRM ─────────────────►│
                │                                                 │
                │                                9. Registers Device A with authentic name "@ayaz"
                │                               10. Closes Pairing Modal
  11. Closes Pairing Modal                                        │
  12. Renders Live Constellation Node               13. Renders Live Constellation Node
```

---

### 2.2 Clipboard Beam & Synchronization Workflow

```text
[ User Action on Device A ]
  │
  ├─► Paste (⌘V / Ctrl+V), Drag & Drop, or Auto-Capture
  │
  ▼
[ Off-Thread Web Worker (airvault.worker.ts) ]
  │
  ├─► Classifies content (Plain Text, Code, URL, Image, File)
  ├─► Sensitive Shield scans for API tokens, JWTs, Passwords -> Masks by default
  ├─► OffscreenCanvas generates low-res thumbnail if image
  │
  ▼
[ Web Crypto Engine (airvault-crypto.service.ts) ]
  │
  ├─► Derives ECDH shared secret (or uses vault Master Key)
  ├─► Generates 12-byte cryptographically secure random IV
  ├─► Encrypts payload via AES-GCM-256
  │
  ▼
[ Multi-Tier Transport Dispatcher (airvault-sync.service.ts) ]
  │
  ├─► Tier 1: Local Tabs via BroadcastChannel ('acklet_airvault_sync_channel')
  ├─► Tier 2: P2P Direct DataChannel (WebRTC)
  ├─► Tier 3: Spring Boot WebSocket Relay (/ws/airvault)
  │
  ▼
[ Local IndexedDB Vault (airvault-storage.service.ts) ]
  │
  └─► Auto-saves encrypted item locally (deliveryStatus = 'pending')
  │
  ▼
[ Target Device B Receiver ]
  │
  ├─► Drains signal mailbox / receives BroadcastChannel event
  ├─► Decrypts AES-GCM-256 payload using local private key
  ├─► Emits SYNC_ACK back to Device A
  ├─► Displays Rich Card in Live Stream & updates Hero Anchor
  │
  ▼
[ Device A Receipt ]
  │
  └─► Updates item status in IndexedDB from 'pending' to 'delivered' (✓✓)
```

---

### 2.3 Large Chunked File Upload & Streaming Workflow

```text
[ User drops file (up to 500 MB) into Staging Composer ]
  │
  ▼
[ Frontend Pre-Validation ]
  │
  ├─► Checks file size against 500 MB single file limit (rejects if exceeded)
  ├─► Checks file size against remaining 1.0 GB storage capacity
  ├─► Prompts large-file notice (> 50 MB) informing user of 7-day auto-deletion
  ├─► Calls backend GET /api/v1/airvault/clipboards/{clipboardId}/usage
  │
  ▼
[ Backend Storage Cap Verification ]
  │
  ├─► POST /api/v1/airvault/clipboards/{clipboardId}/uploads
  ├─► Backend checks: declaredSize <= 500MB && currentStoredBytes + activeUploadsBytes + fileSize <= 1.0 GB
  ├─► Allocates UploadSession UUID & returns remaining byte capacity
  │
  ▼
[ Background Web Worker (upload-worker.ts) ]
  │
  ├─► Slices file into 4MB chunks
  ├─► Encrypts each chunk with AES-GCM-256
  ├─► Issues HTTP PUT /api/v1/airvault/uploads/{id}/chunks/{chunkIndex}
  ├─► Emits PROGRESS { percent, stage: 'uploading' } to UI reactive signals
  │
  ▼
[ Backend SSE Broadcast & Ingestion ]
  │
  ├─► Persists chunks idempotently to temporary storage
  ├─► Emits SSE event 'upload_progress' to all connected devices
  │
  ▼
[ Upload Completion & 7-Day Retention ]
  │
  ├─► POST /api/v1/airvault/uploads/{id}/complete with checksum & previewUrl
  ├─► Backend promotes UploadSession to permanent ClipboardFile
  ├─► Backend emits SSE 'upload_complete'
  ├─► Connected devices render finished File Card with 7-day expiry countdown badge
  └─► Scheduled hourly backend task permanently deletes files older than 7 days
```

---

### 2.4 Lazy-Loaded Metadata-First On-Demand Retrieval Workflow

```text
[ App Launch / Clipboard List & History Render ]
  │
  ├─► IndexedDB queries `vault_items` metadata store ONLY
  ├─► Loads descriptors: { id, filename, byteSize, category, timestamp, checksum, previewUrl }
  ├─► Full payloads (>100KB or binary) are left unhydrated in memory (JS Heap footprint ~0 MB)
  │
  ▼
[ User clicks Preview, Download, Copy, or Expand ]
  │
  ├─► Tile displays localized spinner overlay (`isPayloadLoading = true`) without blocking UI
  │
  ▼
[ AirVaultResourceCacheService (LRU Cache Lookup) ]
  │
  ├─► 1. In-Memory LRU Cache Hit? ──► Returns cached native Blob & Object URL (0ms)
  │
  ├─► 2. In-Flight Request Active? ──► Deduplicates into shared active Promise (0 duplicate fetches)
  │
  ├─► 3. IndexedDB `vault_payloads`? ──► Reads cached Blob from disk
  │
  └─► 4. Cache Miss? ──► Streams binary via `GET /api/v1/airvault/clipboards/default/files/{id}/raw`
        │
        ├─► Non-blocking zero-copy streaming from backend
        ├─► Evicts least recently used items if cache > 50 MB budget (calls `URL.revokeObjectURL`)
        └─► Updates tile with resolved Object URL & removes spinner
```

---

### 2.5 Burn-After-Read (1-View Policy) & Resend Lifecycle Workflow

```text
[ Source Device A ]                                 [ Destination Device B ]
        │                                                     │
  1. Sets policy "Burn-After-Read (1 view)"                   │
  2. Beams item with `burnAfterRead: true`                    │
  3. Saves local copy in Vault (status = 'delivered')         │
        │                                                     │
        ├──────────────── SYNC_PACKET ───────────────────────►│
        │                                                     │
        │                                           4. Receives item with `burnAfterRead: true`
        │                                           5. Displays card with Clock-Fading chip
        │                                           6. User opens Preview Modal
        │                                           7. User closes Preview Modal (requestClose)
        │                                           8. Emits CAS view request to backend (/sync/viewed)
        │                                           9. Dispatches `onItemBurned` event
        │                                          10. Card executes `animateBurnDissolve`
        │                                              (420ms fade-up y:-24px, scale:0.94, blur 3px)
        │                                          11. Card unmounts and purges from IndexedDB locally
        │                                                     │
  [ Source Device A Copy Remains Intact & Untouched ]         │
        │                                                     │
  12. Source clicks "Resend" on intact item                   │
  13. Calls POST /sync/reset-burn & beams fresh packet        │
        │                                                     │
        ├──────────────── SYNC_PACKET (isResend=true) ────────►│
        │                                                     │
        │                                           14. Clears local suppression & debounce
        │                                           15. Mounts fresh Burn-After-Read item
        │                                           16. Begins fresh 1-view burn lifecycle
```

---

---

## 3. 4-Tier Identity & Connection Model

AirVault explicitly decouples user credentials, hardware installations, transport connections, and device pairings:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        4-TIER ARCHITECTURE                             │
├───────────────────┬────────────────────────────────────────────────────┤
│ 1. User Identity  │ accountId / @username                              │
│                   │ • Human-readable handle and authentication creds   │
│                   │ • Multiple browsers/devices can log in to same ID │
├───────────────────┼────────────────────────────────────────────────────┤
│ 2. Device Identity│ installationId (dev-xxxxx)                         │
│                   │ • Persistent browser/hardware identity in storage  │
│                   │ • Independent across Normal, Incognito & Safari    │
├───────────────────┼────────────────────────────────────────────────────┤
│ 3. Transport ID   │ sessionId                                          │
│                   │ • Ephemeral live-wire connection handle in Redis   │
│                   │ • Re-generated on new page loads/transports        │
├───────────────────┼────────────────────────────────────────────────────┤
│ 4. Relationship ID│ pairingId (airvault_device_pairings entity)        │
│                   │ • Authoritative DB entity for device-to-device     │
│                   │ • Tracks states: ACTIVE, PAIRED, REVOKED           │
└───────────────────┴────────────────────────────────────────────────────┘
```

### 3.1 Connection Lifecycle & Targeted Signaling Rules

1. **Strict Installation-ID Peer Matching**: Peering is keyed on `installationId` (`d.id === peer.id`), preventing peer collision when multiple devices share an `@username`.
2. **Targeted Lifecycle Events**: `DEVICE_DISCONNECT`, `DEVICE_RECONNECT`, and `DEVICE_REVOKE` are routed directly to `targetDeviceId`. Broadcast lifecycle signals are forbidden.
3. **Account-Scoped Persistent Disconnect**: Disconnect state is saved in `acklet_airvault_disconnected_peer_ids_<username>`, preventing state leakage across account switches and presence overrides.

---

## 4. Lifecycle States & Data Model

Every item in AirVault transitions through clearly defined lifecycle states:

| Lifecycle State | Description | UI Representation |
| :--- | :--- | :--- |
| `1. Captured` | Ingested via clipboard listener or staging composer. | Staging preview tile with classification tag. |
| `2. Secured` | Encrypted off-thread via AES-GCM-256 with generated IV. | Scoped lock icon `🔒 Secured`. |
| `3. Beamed` | Dispatched across multi-tier transport channels. | GSAP Particle Beam traveling toward constellation nodes. |
| `4. Delivered` | Receipt confirmed by target device (or persisted locally). | Stream tile with double checkmark badge `✓✓ Delivered`. |
| `5. Queued Offline`| Target device unreachable; stored in local outbox. | Clock badge `⏳ Queued Offline`. |
| `6. Expired / Purged`| Exceeded retention duration or purged manually. | Removed from IndexedDB vault. |

---

## 5. Three Distinct Access & Collaboration Mechanisms

AirVault provides three independent, additive access layers:

| Dimension | 1. Device Pairing | 2. Standalone Shareable Link | 3. Invite-Based Collaboration |
| :--- | :--- | :--- | :--- |
| **Primary Intent** | Auto-sync between user's own hardware | Instant anonymous read/write board link | Targeted collaborator access for a specific person |
| **Target Scope** | Device-to-Device (Installation ID) | Clipboard ID (`/c/{clipboardId}`) | User Account (`@username` or `/invite/{id}`) |
| **Identity Required** | Yes (PIN / QR handshake) | No (Anonymous / Guest) | Yes (Recipient must be identified to accept) |
| **Relationship Formed** | Device pairing in local DB | None (Stateless URL access) | Permanent `ClipboardCollaborator` record |
| **Acceptance Step** | Automatic upon entering PIN | None (Direct opening) | Explicit **Accept** or **Ignore** prompt |
| **Device Coverage** | Specific paired device only | Browser instance holding the link | All current & future devices of the user account |
| **Notification Route** | Peer-to-peer presence signals | None | Real-time WebSocket notice + Persistent Inbox |

---

## 5.1 Memorable Clipboard Slugs & Inline Breadcrumb Customization

AirVault provides human-friendly, memorable clipboard IDs (e.g. `dez01788` — 3 letters + 5 numbers, or custom alphanumeric slugs) right in the top navigation breadcrumb:

```text
Acklet / ⚡ AirVault / [ 📋 dez01788 (Copy) (Edit) ]
```

### Key Capabilities:
1. **Memorable Default Slugs**: Replaces unreadable 27-character hashes with concise 8-character memorable identifiers (e.g. `dez01788`).
2. **Inline Breadcrumb Editor**: 1-click inline editing in the top navbar breadcrumb (`c/my-vault`) with instant live uniqueness verification (`/api/v1/airvault/clipboard/check-slug`).
3. **Safe Migration & Rename**: Renaming seamlessly migrates existing items, files, active collaborator permissions, and pending invitations to the new slug without data loss.
4. **Direct URL Resolution**: Resolves automatically from `/c/{clipboardId}`, `/airvault/{clipboardId}`, or `/tools/app/airvault/{clipboardId}`.

---

## 6. Related Documentation

- Master Overview: [README.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/README.md)
- Master Feature Matrix: [feature.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature.md)
- UI Reference: [UI_REFERENCE.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/UI_REFERENCE.md)
- Backend Architecture: [feature-12-backend-architecture.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature-12-backend-architecture.md)
- Web Worker Pipeline: [feature-13-web-workers-pipeline.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature-13-web-workers-pipeline.md)
- Legend & Shortcuts: [LEGEND.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/LEGEND.md)


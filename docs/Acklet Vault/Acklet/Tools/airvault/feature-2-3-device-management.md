# Feature 2 & 3 — Stateful Device Registration, Persistent Identity & Constellation Management

## 1. Executive Summary & Objective

**Feature 2 (Stateful Device Registration)** and **Feature 3 (Device Management)** govern the complete hardware lifecycle in AirVault:
- **Username-First Identity**: Each AirVault user identity is represented primarily by their unique `@username` across pairing dialogs, constellation nodes, device drawer, and toast alerts.
- **Accurate Hardware Metadata & Mobile Detection**: Device types (`smartphone`, `tablet`, `laptop`, `desktop`) and operating systems are detected accurately (with mobile Linux / Android user agents correctly mapped to `smartphone` and displaying the `smartphone` icon rather than falling back to desktop).
- **Persistent Device Identity**: Each installation maintains a permanent internal `deviceId`, linked `identity_id`, auto-assigned unique accent color, and persistent device settings across reconnects and reboots.
- **Pairing Mechanism**: Ephemeral QR pairing tokens or numeric PIN handshakes linking peer devices (up to the strict 5-device direct-pair limit) with automatic 1-transaction confirmation and no disruptive popup configuration modals.
- **Manage Devices Drawer**: 3-tier view (`THIS DEVICE`, `MY REGISTERED SESSIONS`, `DIRECT PAIRED DEVICES`), offline presence preservation, 1-click **Reconnect**, and **Remote Logout** with optional remote data wiping.
- **Disconnected Source Device Notifications**: When a disconnected paired device transmits data, the peer receives a non-intrusive alert (`@alice sent something to you, but you're currently disconnected`) with device icon, accent dot, preview snippet, and direct 1-click `[Reconnect]` action.

---

## 2. Device Identity Lifecycle State Machine

```text
       [ Unregistered Device ]
                  │
                  ▼ (Auto-allocate UUID, Unique @username, Auto Accent Color)
       [ Stateful Identity Created ]
                  │
                  ▼ (Pairing Handshake via QR / PIN - 1 Transaction)
               [ Paired ]
                  │
                  ▼
              [ Active ] ◄────────────┐ (Heartbeat / Reconnect)
                  │                   │
                  ▼ (Inactivity > 45s)│
               [ Idle ] ──────────────┘
                  │
                  ▼ (Network Drop / Manual Disconnect)
              [ Offline ] ────────────┐ (Preserves Paired State & Accent Identity)
                  │                   │ (1-Click Reconnect via Drawer / Alert)
                  │ ◄─────────────────┘
                  ▼ (Forget / Remote Logout / Erase Everything)
              [ Revoked ] (Session Evicted from Redis & PostgreSQL, Release Username)
```

---

## 3. Persistent Identity Invariants & Handshake Workflows

1. **4-Tier Identity & Connection Architecture**:
   - `accountId` / `@username`: User account identity & authentication credentials.
   - `installationId` (stable `dev-xxxxx` in `localStorage`): Browser installation & hardware identity. Independent across browser profiles (Chrome Normal, Chrome Incognito, Safari).
   - `sessionId`: Ephemeral transport connection handle for live presence in Redis.
   - `pairingId` (`airvault_device_pairings` table): Authoritative device-to-device relationship entity tracking state (`ACTIVE`, `PAIRED`, `REVOKED`) and sync permissions.

2. **Stateful Across Reboots & Ephemeral PIN Stability**:
   - `installationId` (`dev-xxxxx`), `identity_id`, `username`, `deviceKeyword` (4-digit PIN), and auto-assigned `accentColor` are persisted locally in `localStorage` and synchronized with the backend `airvault_devices` / `airvault_identities` tables.
   - The **6-Digit Ephemeral Pairing PIN** is cached in `localStorage` (`acklet_airvault_ephemeral_pin`), guaranteeing that QR codes and 6-digit PIN codes remain stable and scannable without prematurely invalidating across page reloads or tab switches.
   - Disconnecting or restarting the browser does **not** reset username, accent colors, or paired relationships.

3. **Strict Device-ID Peer Matching**:
   - Peer devices are tracked strictly by their `installationId` (`d.id === peer.id`), completely eliminating fuzzy username collisions when multiple devices or browser instances share the same username.

4. **Targeted Lifecycle Signaling (No Broadcast Cascades)**:
   - `DEVICE_DISCONNECT`, `DEVICE_RECONNECT`, and `DEVICE_REVOKE` signals are strictly directed to `targetDeviceId`.
   - Disconnecting a device in Chrome Incognito transmits a targeted signal exclusively to that peer, leaving all other active devices unaffected.

5. **Manual Disconnect Persistence vs. Presence Polling**:
   - When a user clicks **[Disconnect]** on a paired device (or a remote `DEVICE_DISCONNECT` signal is received), the device is flagged in account-scoped storage (`acklet_airvault_disconnected_peer_ids_<username>`) and its state is set to `offline`.
   - **Presence Immunity**: The background presence heartbeat poller (`executePresencePoll`) checks server presence but is explicitly blocked from flipping manually disconnected peers back to `active`.
   - **Persistent [Reconnect] Button**: The device stays in the paired constellation and device drawer as `offline`, rendering the **[Reconnect]** button on both Chrome and Safari devices reliably.

6. **Reconnect & Asymmetric Forget / Revoke Flow**:
   - **When Device A clicks [Reconnect]**:
     - Device A clears the manual disconnect flag, sets status to `active`, and sends a targeted `DEVICE_RECONNECT` to Device B.
     - Device B receives `DEVICE_RECONNECT`, clears its manual disconnect flag, restores Device A to `active`, and initiates history sync.
   - **When Device A forgets Device B (`[Forget Device]`)**:
     - Device A removes Device B from its local constellation and backend pairings table (`REVOKED`).
     - Device A sends a targeted `DEVICE_DISCONNECT` signal to Device B.
     - **On Device B's side**: Device A is gracefully transitioned to disconnected (`offline`) and displays **[Reconnect]** / pairing availability, preventing unexpected data wipes or broken orphaned states. Device B can re-pair or reconnect at any time.

7. **Remote Logout & Remote Wipe**:
   - Users can remotely log out any registered session from the Manage Devices drawer.
   - Confirmation dialog provides two options:
     - **Keep Data**: Revokes the remote session/credentials while leaving clipboard history intact.
     - **Erase All Data**: Sends targeted `DEVICE_REVOKE` with `eraseData: true`, wiping local IndexedDB and localStorage records on the target device.

8. **Bidirectional Transactional Pairing & Dual-Side Notification**:
   - When Device A pairs with Device B via Username + PIN, the server atomically updates both `airvault_identities` rows in a single database transaction and writes reciprocal records to `airvault_device_pairings`.
   - The server immediately dispatches dual `PAIR_CONFIRM` signaling events to both Device A and Device B mailboxes, confirming the mutual pairing simultaneously on both screens.
   - On app startup or network reconnection, devices query `GET /api/v1/airvault/auth/reconcile?clientDeviceId=...` to hydrate and restore active database pairing state even if real-time signaling was missed during temporary network disconnection.

9. **Direct-Pair 10-Device Capacity**:
   - Each device can pair with a maximum of 10 direct peer devices. Reconnection uses existing slots without triggering pairing rejections.

10. **Authoritative Owner Deletion & Tombstone Reconciliation**:
   - When a resource owner deletes an item globally, authoritative `ITEM_DELETE` broadcasts immediately purge the active item on all connected devices and record persistent tombstones. Reconnecting devices reconcile tombstones on handshake, preventing deleted items from ever resurrecting.

---

## 4. UI Actions & Specific Button Workflow Reference

| Component / Location | Button / Control | Visual Icon | Exact Functionality & Workflow |
| :--- | :--- | :--- | :--- |
| **Constellation Node** | `Device Avatar Node` | Laptop / Phone / Tablet | Left-click: Selects target device for directed beaming. Right-click: Opens contextual hover action menu. |
| **Constellation Menu** | `[Disconnect]` | `unplug` (Amber) | Temporarily disconnects clipboard sync with target device, sets status to `offline`, broadcasts `DEVICE_DISCONNECT`, and reveals `[Reconnect]` button. |
| **Constellation Menu** | `[Reconnect]` | `rotate-cw` / `loader-2` (Cyan) | Initiates reconnection with animated loading spinner (`Connecting...`), clears manual disconnect state, sets status to `active`, broadcasts `DEVICE_RECONNECT`, and triggers bi-directional history sync. |
| **Constellation Menu** | `[Forget Device]` | `trash-2` (Red) | Opens confirmation dialog; removes peer from local paired list, deletes backend session, and signals peer to transition to disconnected. |
| **Constellation Node** | `[+] Add Device` | `plus` | Opens the 3-mode pairing modal (`Username & PIN`, `Scan QR Code`, `6-Digit PIN`). |
| **Pairing Modal (PIN / QR / User)** | `[Pair / Connect]` | `link` / `loader-2` (Spinning) | Displays live connection loader and pulsing radar dot (`Broadcasting presence · Waiting for peer...`) while cryptographic ECDH handshake and authentication complete. |
| **Constellation Node** | `[Sliders] Manage` | `sliders` | Opens the comprehensive 3-tier Device Manager drawer. |
| **Device Drawer** | `[Reconnect]` | `rotate-cw` / `loader-2` | Resumes sync connection with animated spinning loader (`Connecting...`) while signals exchange. |
| **Device Drawer** | `[Sync ON / OFF]` | `check` / `slash` | Toggles whether automated clipboard beaming routes to this device without unpairing. |
| **Device Drawer** | `[Edit Rename]` | `edit-2` | In-line editable device name saved locally and synchronized to backend. |
| **Device Drawer** | `[Log Out Session]` | `shield-alert` | Prompts remote logout modal with choice to keep local history or wipe all remote vault data. |
| **Staging Dropzone** | `[Beam Clipboard]` | `zap` (Blue) | Encrypts staged text, code, images, or files off-thread via Web Crypto AES-GCM-256 and transmits across active devices. |
| **History Modal** | `[Re-add to Clipboard]` | `rotate-ccw` (Green) | Restores a deleted or expired item from 30-day Restorable History back into the active stream without data loss. |
| **History Modal** | `[Purge Forever]` | `trash-2` (Red) | Permanently deletes binary payload from IndexedDB storage, freeing allocated dynamic quota and recording audit trace. |

---

## 5. Backend Implementation Reference (`com.code.acklet.airvault`)

- **Entity**: [`AirVaultDevice.java`](file:///Users/ayaz/Acklet/server/acklet/src/main/java/com/code/acklet/airvault/entity/AirVaultDevice.java)
- **Repository**: [`AirVaultDeviceRepository.java`](file:///Users/ayaz/Acklet/server/acklet/src/main/java/com/code/acklet/airvault/repository/AirVaultDeviceRepository.java)
- **Service**: [`AirVaultDeviceService.java`](file:///Users/ayaz/Acklet/server/acklet/src/main/java/com/code/acklet/airvault/service/AirVaultDeviceService.java)
- **Endpoints**:
  - `GET /api/v1/airvault/devices` — Cached device list for authenticated user.
  - `POST /api/v1/airvault/devices/register` — Idempotently registers or reactivates device with `@username` and keyword.
  - `PATCH /api/v1/airvault/devices/{clientDeviceId}/rename` — Updates friendly device name.
  - `PATCH /api/v1/airvault/devices/{clientDeviceId}/sync-permission` — Toggles clipboard sync permission.
  - `POST /api/v1/airvault/devices/{clientDeviceId}/heartbeat` — Updates presence state in PostgreSQL and Redis.
  - `DELETE /api/v1/airvault/devices/{clientDeviceId}?eraseData={true|false}` — Revokes remote device and evicts session.

---

## 6. Frontend Implementation (`client/src/tools/airvault`)

- **Service**: [`AirVaultDeviceService`](file:///Users/ayaz/Acklet/client/src/tools/airvault/services/airvault-device.service.ts) — Persistent identity management, presence heartbeats, registered session querying, and remote logout dispatching.
- **Sync Service**: [`AirVaultSyncService`](file:///Users/ayaz/Acklet/client/src/tools/airvault/services/airvault-sync.service.ts) — P2P WebRTC, BroadcastChannel, and server signaling relay with authentic QR/PIN/Username handshake.
- **Device Drawer**: [`AirVaultDeviceDrawerComponent`](file:///Users/ayaz/Acklet/client/src/tools/airvault/components/airvault-device-drawer.component.ts) — 3-section layout (`THIS DEVICE`, `MY REGISTERED SESSIONS`, `DIRECT PAIRED DEVICES`) with identity chips, reconnect buttons, and data-erasure logout modals.
- **Pairing Modal**: [`AirVaultPairingModalComponent`](file:///Users/ayaz/Acklet/client/src/tools/airvault/components/airvault-pairing-modal.component.ts) — QR code scanner/camera stream, 6-digit numeric PIN inputs, and persistent identity banner (`@username` + Keyword).

---

## 7. Related Documentation

- [feature-1-auth.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature-1-auth.md) — Authentication, rate limiting & QR session tokens.
- [feature-7-history-memory.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature-7-history-memory.md) — Storage quotas, 30-day Restorable History & retention policies.
- [feature-12-backend-architecture.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature-12-backend-architecture.md) — Backend architecture & RabbitMQ assembly pipelines.
- [feature.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature.md) — Master feature audit matrix.

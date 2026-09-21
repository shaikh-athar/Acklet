# AirVault — UI Action Legend, Status Indicators & Shortcuts

## 1. Action Semantics & Buttons
 
| Button / Control | Icon | Action / Effect | Scope |
| :--- | :--- | :--- | :--- |
| **Beam Clipboard (⌘↵)** | `Send` / `Zap` | Encrypts staged content off-thread via AES-GCM-256 and transmits to target or all active devices. | Staging Area |
| **Paste (⌘V)** | `Clipboard` | Reads local system clipboard content and stages for inspection/classification. | Staging Area |
| **Clear Input Composer**| `X` | Clears staged input text and files in composer without touching vault history. | Composer Toolbar |
| **Clear Composer** | `Trash` | Resets the staging input pane and aborts in-progress chunked workers. | Staging Area |
| **1-Click Copy** | `Copy` → `Check` | Copies item content to local system clipboard with 2-second visual confirmation. | Stream Card |
| **Pin / Unpin** | `Pin` | Protects item from automatic time-based expiration and capacity eviction. | Stream Card |
| **Delete Tile** | `Trash-2` | Moves item to 30-day Restorable History (or emits global tombstone delete if owner). | Stream Card |
| **Disconnect** | `Unplug` | Temporarily disconnects sync with target peer, setting status to offline with persistent reconnect capability. | Constellation / Drawer |
| **Reconnect** | `Zap` / `Rotate-Cw` | Restores active sync with disconnected peer and triggers bi-directional history synchronization. | Constellation / Drawer |
| **Forget Device** | `Trash-2` | Unpairs device, removes server session, and transitions remote peer to disconnected state. | Constellation / Drawer |
| **Pair New Device**| `Plus` / `QrCode` | Opens device pairing modal displaying QR code, 6-digit PIN, and username/keyword pairing. | Bottom Capsule / Dock |
| **Sync Consent** | `Check` / `X` | Interactive prompt on peer connection allowing destination user to pull clipboard items or skip. | Consent Modal |
| **Duplicate Alert** | `Info` / `AlertCircle` | Notification alert triggered when a staged/synced item matches a resource from a paired user. | Duplicate Modal |
| **Author Highlight**| `Highlighter` | Toggles per-line author attribution highlights and blame gutter on/off in live editor. | Bottom Capsule |
| **Device Settings**| `Sliders` / `Monitor` | Opens the 3-tier device management drawer for renaming, presence, and revocation. | Constellation Bar |
| **Re-add to Clipboard**| `Rotate-Ccw` | Restores a deleted or retention-expired item from 30-day Restorable History back to active stream. | History Modal |
| **Purge Forever** | `Trash-2` | Permanently deletes binary payload from IndexedDB, releasing dynamic storage quota. | History Modal |
| **Privacy Shield** | `ShieldCheck` | Opens zero-knowledge E2EE cryptographic verification modal. | Navigation Header |
| **Purge All** | `AlertTriangle` | Opens 2-step confirmation modal to wipe all local IndexedDB data and reconcile server bytes. | Settings Drawer |

---

## 2. Status Indicators & Badges

| Badge / Indicator | Color / Style | Meaning & Trigger Condition |
| :--- | :--- | :--- |
| **🔒 E2EE Secured** | Green / Scoped Token | Zero-knowledge client-side AES-GCM-256 encryption applied. |
| **✓ Delivered** | Indigo / Violet | Broadcasted to multi-tab channel or direct peer. |
| **✓✓ Confirmed** | Emerald / Green | Remote target device received, decrypted, and acknowledged item. |
| **⏳ Queued Offline**| Amber / Orange | Target device offline; item placed in local persistent outbox. |
| **⚡ Off-Thread Worker**| Blue / Cyan | Intensive parsing or chunked streaming managed by background Web Worker. |
| **🕒 7d Auto-Expiry**| Slate / Mono Chip | Unpinned clip ($\le$ 5 MB) scheduled for automatic transition to 30-day Restorable History after 7 days. |
| **⚠️ Expiring Soon** | Amber Pulse Chip | Item is within 24 hours of 7-day retention expiry; pin item to keep permanently. |
| **📌 Permanent** | Cyan Pill | Pinned item exempt from TTL expiration and capacity purge. |
| **📦 Auto-Collapsed** | Gray Pill / Chevron | Long text/code block ($> 800$ chars or $> 18$ lines) auto-collapsed after 1000ms delay. |
| **● Active** | Green Dot | Device heartbeat received within the last 45 seconds. |
| **🔄 Reconnecting...** | Cyan `Wifi` / Pulse Dot | Device reconnection and presence recovery in progress with live animated indicator. |
| **🔗 Pairing...** | Cyan `Link` / Spin Loader | Device pairing handshake, PIN verification, or QR key negotiation in progress. |
| **✈️ Sending...** | Blue `Send` / Slide Pulse | Initial beam dispatch and Web Crypto encryption in progress. |
| **🔁 Resending...** | Amber `RefreshCw` / Spin | Retrying transmission of a failed or pending vault item to connected peers. |
| **🔄 Syncing...** | Blue `RefreshCcw` / Spin | Bi-directional history synchronization and active payload transfer in progress. |
| **⬆️ Uploading...** | Violet `Upload` / Ring | Chunked multi-part binary streaming to storage adapter. |
| **⬇️ Downloading...** | Indigo `Download` / Ring | Fetching and decompressing binary/media payloads on-demand from LRU cache. |
| **⚙️ Processing...** | Cyan `LoaderCircle` / `Loader` | Off-thread Web Worker AES-GCM decryption, regex scanning, or thumbnail generation. |
| **○ Idle** | Slate Dot | Device registered but no activity recorded for > 5 minutes. |
| **⊘ Offline** | Gray Dot | Device unreachable or manually disconnected. |
| **🛡️ Masked Secret** | Yellow Pill | Sensitive API key, JWT, or password detected and masked by default (`●●●●`). |
| **Line Blame Gutter** | Deterministic Palette Tick | GitHub blame-style per-line attribution tick for collaborative text/code edits with hover tooltip. |

---

## 3. Keyboard Shortcuts

| Shortcut | Context | Action |
| :--- | :--- | :--- |
| `Cmd / Ctrl + Enter` | Staging Composer | **Beam Content**: Trigger off-thread encryption and sync transmission. |
| `Cmd / Ctrl + V` | Global / Workspace | **Paste to Staging**: Ingest current OS clipboard content. |
| `Cmd / Ctrl + F` | Stream Search | Focus search query bar in clipboard history stream. |
| `Cmd / Ctrl + K` | Workspace | Open global Acklet command palette. |
| `Cmd / Ctrl + P` | Constellation | Open Device Pairing Modal. |
| `Cmd / Ctrl + ,` | Workspace | Open AirVault Settings Drawer. |
| `Esc` | Modals / Drawers | Dismiss active drawer, modal, or diagnostics viewer. |

---

## 4. 4-Tier Identity & Connection Identifiers

| Identifier Tier | Key Format | Entity / Storage Location | Scope & Invariant |
| :--- | :--- | :--- | :--- |
| **User Identity** | `accountId` / `@username` | `airvault_identities` / PostgreSQL | Human-readable handle & authentication credential. Multiple browser devices can log in to same user identity. |
| **Device Identity** | `installationId` (`dev-xxxxx`) | `localStorage` / `airvault_devices` | Persistent browser/hardware installation identity. Guaranteed independent across Chrome Normal, Chrome Incognito, and Safari. |
| **Transport Session**| `sessionId` | Redis (`airvault:session:{deviceId}`) | Ephemeral transport handle & signaling mailbox. Re-allocated on new page loads. |
| **Pairing Relationship**| `pairingId` | `airvault_device_pairings` / DB | Authoritative device-to-device trust grant tracking mutual states (`ACTIVE`, `PAIRED`, `REVOKED`) and sync permissions. |

---

## 5. Transport Tier & Lifecycle Signaling Hierarchy

```text
[ Transport Routing Hierarchy ]
            │
            ├── Tier 1 ──► Multi-Tab BroadcastChannel (Same-origin, 0ms)
            │
            ├── Tier 2 ──► WebRTC Direct Peer DataChannel (Direct P2P, <20ms)
            │
            └── Tier 3 ──► Spring Boot WebSocket Relay (/ws/airvault)

[ Lifecycle Signaling Rules ]
• DEVICE_DISCONNECT ──► Directed strictly to targetDeviceId (No broadcast cascades)
• DEVICE_RECONNECT  ──► Directed strictly to targetDeviceId (Resumes mutual sync)
• DEVICE_REVOKE     ──► Directed strictly to targetDeviceId (Revokes session / optional wipe)
```

---

## 6. Related Documentation

- Master Overview: [README.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/README.md)
- Product Specification: [description.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/description.md)
- Feature Audit Matrix: [feature.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature.md)
- UI Reference: [UI_REFERENCE.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/UI_REFERENCE.md)

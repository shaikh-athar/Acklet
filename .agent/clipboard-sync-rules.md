# Acklet AirVault: Multi-Device Clipboard Consistency Model & Synchronization Rules

See authoritative specification in [.agents/clipboard-sync-rules.md](file:///Users/ayaz/Acklet/.agents/clipboard-sync-rules.md).

This document establishes the authoritative rules governing state, synchronization, identity, ownership, deletion, conflict resolution, and transport guarantees across all connected devices in the Acklet AirVault ecosystem.

---

## 1. Core Architectural Concepts

AirVault is **not** a single shared mutable clipboard. It separates four distinct concepts:

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   DEVICE A (e.g. Chrome)                        │
│                                                                                 │
│   ┌───────────────────────────┐         ┌───────────────────────────────────┐   │
│   │       OS Clipboard        │         │        AirVault Item Store        │   │
│   │   (Local Current Value)   │         │ (Timeline of Immutable Snapshots) │   │
│   └───────────────────────────┘         └───────────────────────────────────┘   │
│                 ▲                                         ▲                     │
│                 │                                         │                     │
│                 └───────────────┐         ┌───────────────┘                     │
│                                 │         │                                     │
│                     ┌─────────────────────────────────┐                         │
│                     │       Local Staging Editor      │                         │
│                     │     (Device-Local Scratchpad)   │                         │
│                     └─────────────────────────────────┘                         │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │  Manual Beam / E2EE WebSocket Packet
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   DEVICE B (e.g. Incognito)                     │
│                                                                                 │
│   ┌───────────────────────────┐         ┌───────────────────────────────────┐   │
│   │       OS Clipboard        │         │        AirVault Item Store        │   │
│   │   (Local Current Value)   │         │ (Timeline of Immutable Snapshots) │   │
│   └───────────────────────────┘         └───────────────────────────────────┘   │
│                 ▲                                         ▲                     │
│                 │                                         │                     │
│                 └───────────────┐         ┌───────────────┘                     │
│                                 │         │                                     │
│                     ┌─────────────────────────────────┐                         │
│                     │       Local Staging Editor      │                         │
│                     │     (Device-Local Scratchpad)   │                         │
│                     └─────────────────────────────────┘                         │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### A. OS Clipboard
- Each device owns and controls its own local OS clipboard.
- Modifying the OS clipboard (e.g., via copy/cut) never deletes or mutates historical AirVault items.
- Incoming AirVault items do **not** write to the local OS clipboard unless `autoCopyIncoming` is explicitly enabled by the user and the window is actively focused.

### B. AirVault Item Store
- Append-only timeline of discrete, immutable item snapshots.
- Every synchronized item possesses a stable, globally unique `itemId` (UUID).
- Metadata preserved on every item:
  - `id` / `packetId`: Globally unique identifier.
  - `originDeviceId`: Device identifier where the item was originally created.
  - `originOwnerId`: Author identity (@username or device ID).
  - `senderDeviceId`: Immediate sender device ID.
  - `senderDeviceName` & `senderDeviceAccent`: Originating device styling tokens.
  - `timestamp`: Creation timestamp (Unix epoch milliseconds).
  - `content`: Category, raw payload, preview, line blame map, byte size.
  - `deliveryStatus`: `pending` | `delivered` | `queued_offline` | `failed`.
- **Ownership Invariant**: A received item is an explicit **copy** of the originating item. Receiving an item does not transfer ownership to the receiver.

### C. Manual Beam / Send Semantics
- "Send" or "Beam" means: create and deliver an encrypted copy of the selected item to target devices.
- **NEVER** removes the item from the sender's own staging, history, or active list.
- **NEVER** implicitly modifies the sender's OS clipboard.
- **NEVER** implies that the receiver now owns the item or can alter the sender's original copy.

### D. Device-Local Clipboard & Staging Changes
- If Device B (Incognito) copies or types new content (e.g. `"I am Incognito"`), that creates or updates Device B's local state only.
- It **never** mutates or deletes Device A's original AirVault item (`"I am Chrome"`).
- The existing `"I am Chrome"` item remains available in AirVault on all devices that have received it unless explicitly deleted.

### E. Pairing & Direct Routing
- P2P sync topology is strictly point-to-point between authorized paired devices.
- **No Transitive Forwarding**: If Chrome is paired with Incognito, and Chrome is paired with Safari:
  - An item beamed from Incognito to Chrome stays on Chrome unless the user on Chrome explicitly redistributes it.
  - Chrome does not automatically relay Incognito's item to Safari, eliminating forwarding loops (A → B → C → A).

---

## 2. Deletion & Tombstone Model

### Local Delete (Device-Scoped)
- **Who**: Any device holding a copy of an item (whether origin or receiver).
- **Scope**: Local device only.
- **Action**:
  - Item is marked `isDeletedFromActive = true` and moved into the device's 30-day Restorable History.
  - No global tombstone is registered.
  - No `ITEM_DELETE` packet is broadcast to peers.
  - Other devices retain their copies untouched.
- **Protection against Resurrection**: If a peer later attempts to sync the item (e.g. during initial sync or reconnect), the local device checks its local history. Because the item was locally deleted on this device (`isDeletedFromActive === true`), the incoming packet is **ignored** and does not restore the item to the active stream.

### Global Delete / Revoke (Owner-Scoped)
- **Who**: The origin device (`originDeviceId === cur.id`) or an authorized account owner.
- **Scope**: All connected and paired devices.
- **Action**:
  - Origin device registers a persistent tombstone (`acklet_airvault_tombstones`).
  - Origin device broadcasts `ITEM_DELETE(itemId)`.
  - Receiving devices record the tombstone in their persistent storage and move the item to their 30-day Restorable History (or permanently purge if burn-after-read).
- **Resurrection Invariant**: Once an item is tombstoned, any incoming packet bearing that `itemId` or `packetId` (e.g., from an offline device reconnecting with stale cache) is immediately dropped.

---

## 3. Conflict Resolution & Consistency Rules

1. **Immutable Snapshots**: AirVault items in the card timeline are immutable snapshots. Changing the clipboard creates a new item rather than mutating prior items.
2. **Deterministic Timeline Ordering**: Items in the Vault stream are sorted deterministically by `timestamp` descending, with `isPinned` taking priority at the top.
3. **Structured Live Document Collaborative Blame**: For live text collaboration (DocSync), per-line sequence numbers (`seqNo`), `lastEditedAt`, and author identity IDs resolve concurrent line edits deterministically (Last-Writer-Wins per line segment).
4. **Idempotent Delivery & Deduplication**:
   - Each network packet has a unique `packetId`.
   - Incoming duplicate packets (e.g. delivered over both WebSocket and BroadcastChannel) are deduplicated via an in-memory LRU set (`processedPacketIds`) and database primary key constraints.
   - Idempotent `SYNC_ACK` is returned without duplicating cards in the UI.

---

## 4. Full 30-Scenario Consistency Matrix

| # | Scenario | Guaranteed Behavior & System Invariant |
|---|---|---|
| **1** | **New item from one device** | Created with unique UUID `itemId`, `originDeviceId = localDev.id`. Stored in local IndexedDB. Not broadcast until user beams it. |
| **2** | **Manual Beam** | Delivers encrypted copy to selected peer(s). Sender retains its item in history (`deliveryStatus = 'delivered'`). Receiver stores a copy attributed to sender. |
| **3** | **Same item received twice** | Receiver checks `processedPacketIds` and local IDB. Duplicate is dropped; duplicate `SYNC_ACK` is sent. No duplicate UI cards. |
| **4** | **Same content created independently on two devices** | Distinct `itemId` and `originDeviceId` are assigned to each. Both items coexist in AirVault without colliding or overwriting each other. |
| **5** | **Same item edited on two devices** | Editing creates a new version/item snapshot locally. Live collaborative text uses per-line blame sequence numbers (`seqNo`). |
| **6** | **Two devices send different items simultaneously** | Both WebSocket packets transmit concurrently. Both devices receive and append each other's items with correct author attribution. |
| **7** | **Delete before delivery** | If deleted while in sender's outbox (`queued_offline`), item is removed from queue, tombstoned locally, and never sent. |
| **8** | **Delete after delivery** | Local delete removes from local view only (moves to 30-day history). Global delete (owner) broadcasts `ITEM_DELETE` and registers tombstones on all peers. |
| **9** | **Delete while another device is offline** | Origin deletes globally and records persistent tombstone. When offline peer reconnects, `INITIAL_SYNC_TOMBSTONES` is sent first, applying the deletion before any items sync. |
| **10** | **Deleted item arrives later from offline device** | Receiving device checks `isTombstoned(packet.packetId)`. Tombstoned packet is immediately rejected and discarded. |
| **11** | **Device reconnects with stale data** | Handshake exchanges `INITIAL_SYNC_TOMBSTONES` first. Stale deleted items are removed. Only locally-authored, non-tombstoned items are exchanged. |
| **12** | **Messages arrive out of order** | Items are placed in store and sorted deterministically by `timestamp` descending. UI order is always consistent. |
| **13** | **Duplicate WebSocket delivery** | Guarded by `processedPacketIds` and IndexedDB key checks. Processing is idempotent. |
| **14** | **WebSocket disconnect during delivery** | Undelivered packets are placed in `outboxQueue` with `deliveryStatus = 'queued_offline'`. Flushed automatically upon `DEVICE_ONLINE` signal. |
| **15** | **ACK lost but message received** | Sender retries. Receiver recognizes duplicate `packetId`, drops duplicate insertion, and re-emits `SYNC_ACK`. Sender updates status to `delivered`. |
| **16** | **Device restarts / page reloads** | All items, payloads, and tombstones are loaded from IndexedDB upon startup before processing any incoming network packets. |
| **17** | **Multiple browser tabs/windows** | Synchronized via `BroadcastChannel('acklet_airvault_sync_channel')`. All tabs share identical local device ID and IndexedDB storage. |
| **18** | **Chrome + Incognito + Safari simultaneously** | Each browser has independent device ID and OS clipboard. Items beamed between them are retained on all receiving devices with originating device accent styling. |
| **19** | **Device unpaired while messages pending** | Security gate drops pending outbox items and rejects any incoming packets from the revoked device. |
| **20** | **Re-pairing after previous deletion/state** | Handshake exchanges fresh device profiles and active tombstones. Tombstoned items remain deleted; restorable items remain accessible to user. |
| **21** | **Text/image/file/resource items** | Text/code/json/url store raw strings and blame maps. Binary resources (images, pdfs, audio, video, archives) use metadata-first storage with on-demand binary streaming. |
| **22** | **Auto-capture on Focus** | When ON: Focus triggers suggestion dock if OS clipboard text differs from last known text. When OFF: Focus does nothing. |
| **23** | **Auto-copy incoming items** | When ON: Focused app auto-copies qualifying non-sensitive items (<20MB). When OFF: Item is saved to AirVault stream; OS clipboard is left untouched. |
| **24** | **Instant Beam on Paste** | When ON: Pasting into staging/vault immediately beams to paired peers. When OFF: Pasting only populates local staging editor for user review. |
| **25** | **Manual Send with auto-features OFF** | Clicking "Beam" / pressing `Cmd/Ctrl+Enter` reliably delivers items even when auto-capture, auto-copy, and instant-beam are all disabled. |
| **26** | **Same content copied repeatedly** | Updates `lastCopiedAt` and increments `copyCount`. Does not create duplicate cards or re-beam without user action. |
| **27** | **Very large resources / chunked transfers** | Resources >5MB stream through chunked transfer sessions. Progress is displayed via `updateItemProgress` without blocking UI. |
| **28** | **Sender deletes item after beaming** | If sender deletes locally, receiver retains its copy. If sender deletes globally (as owner), receiver deletes its copy and records a tombstone. |
| **29** | **Receiver deletes local copy while sender retains original** | Receiver moves item to its local 30-day Restorable History. Receiver does not broadcast delete. Sender retains original. Future syncs do not resurrect it on receiver. |
| **30** | **Multiple devices contributing independently** | Every item is tagged with `originDeviceId` and `senderDeviceAccent`. AirVault displays a unified chronological timeline with per-device accent styling. |

---

## 5. Practical Example Walkthrough: Chrome ↔ Incognito ↔ Safari

1. **Initial State**:
   - **Chrome** (Device ID: `dev_chrome`, Accent: Blue `#2196F3`, OS Clipboard: `""`)
   - **Incognito** (Device ID: `dev_incognito`, Accent: Purple `#8B5CF6`, OS Clipboard: `""`)
   - **Safari** (Device ID: `dev_safari`, Accent: Emerald `#10B981`, OS Clipboard: `""`)
   - All three devices are paired over secure WebSocket relay.

2. **Step 1: Chrome Beams `"I am Chrome"`**:
   - User on Chrome types `"I am Chrome"` and clicks **Beam**.
   - Chrome creates `Item_1` (`originDeviceId = dev_chrome`, content = `"I am Chrome"`).
   - Chrome adds `Item_1` to its own history stream (Blue badge).
   - Chrome sends encrypted `SYNC_PACKET` to Incognito and Safari.
   - **Incognito** receives `Item_1`, stores a copy in its AirVault history (attributed to Chrome, Blue badge).
   - **Safari** receives `Item_1`, stores a copy in its AirVault history (attributed to Chrome, Blue badge).

3. **Step 2: Incognito Copies `"I am Incognito"`**:
   - User on Incognito copies `"I am Incognito"` into its OS clipboard.
   - Incognito's local OS clipboard becomes `"I am Incognito"`.
   - **Invariant Check**: Chrome and Safari still retain `Item_1` (`"I am Chrome"`). Incognito still retains its copy of `Item_1` in its card history. Nothing is deleted or overwritten.

4. **Step 3: Incognito Beams `"I am Incognito"`**:
   - User on Incognito clicks **Beam**.
   - Incognito creates `Item_2` (`originDeviceId = dev_incognito`, content = `"I am Incognito"`).
   - Incognito adds `Item_2` to its history stream (Purple badge).
   - Incognito sends `SYNC_PACKET` to Chrome.
   - **Chrome** receives `Item_2`, stores a copy in its AirVault history (attributed to Incognito, Purple badge).
   - **Result across all devices**:
     - Chrome AirVault items: `[Item_2 (Incognito - Purple), Item_1 (Chrome - Blue)]`
     - Incognito AirVault items: `[Item_2 (Incognito - Purple), Item_1 (Chrome - Blue)]`
     - Safari AirVault items: `[Item_1 (Chrome - Blue)]` (until Chrome or Incognito beams `Item_2` to Safari).

5. **Step 4: Safari Deletes `Item_1` Locally**:
   - User on Safari clicks Delete on `Item_1` and chooses "Remove from this device".
   - Safari marks `Item_1` as `isDeletedFromActive = true` (in Safari 30-day Restorable History).
   - Safari does **not** broadcast delete to Chrome.
   - Chrome and Incognito continue to display `Item_1`.
   - When Safari reconnects or runs Initial Sync with Chrome, Safari detects that `Item_1` was locally deleted on Safari and does **not** resurrect it into active cards.

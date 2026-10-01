# Feature 7 — Clipboard History and Memory Specification

## 1. Executive Summary & Objective

**Feature 7 (Clipboard History, Resource Retention & Storage Quota System)** provides client-side persistence, search, categorization, chronological grouping, capacity capping (500 items max with unpinned FIFO eviction), per-resource retention policies based on size, dynamic storage quotas scaled per active connected device (`1 GB Base + 1 GB per additional connected active device`), two-tier deletion semantics (Owner Global Delete vs Non-Owner Local Remove), persistent tombstone reconciliation, and an immutable audit history trail.

---

## 2. Storage & Memory Architecture

```text
  [ Incoming / Beamed Clipboard Item / Chunked File ]
                         │
                         ▼
        [ AirVaultStorageService (Signals) ]
                         │
        ├─► Dynamic Quota: [ 1 GB Base + (N_connected × 1 GB) ]
        ├─► Size-Based Retention:
        │     ├─► > 5 MB: Permanent Clipboard Lifetime (no auto-expiry)
        │     └─► <= 5 MB: Configurable TTL (Default: 7 days, or shorter)
        ├─► Two-Tier Deletion:
        │     ├─► Owner: Global Delete + Tombstone Broadcast + Audit Log
        │     └─► Non-Owner: Local Removal Only + Audit Log
        │
        ┌────────────────┴────────────────────────┐
        ▼                                         ▼
 [ Client-Side IndexedDB ]              [ Server Storage Tier ]
   (`acklet_airvault_db`)            (Spring Boot / Dynamic Quota Engine)
        │                                         │
        ├─► [ Capacity Guard: 500 Max ]           ├─► [ Dynamic Quota Check ]
        ├─► [ Size-Aware Retention Cleaner ]      ├─► [ 500 MB Single File Limit ]
        ├─► [ Tombstone Set Reconciliation ]      ├─► [ Hourly Scheduled File Purge ]
        └─► [ Audit Log (Metadata Retained) ]     └─► [ Permanent ClipboardFile DB ]
```

---

## 3. Retention Policies & Storage Meter
 
| Retention Option | Size / Category Threshold | Retention Duration | Behavior & Rules |
| :--- | :--- | :--- | :--- |
| **Large Resources** | `> 5 MB` (Files, Images, Media) | **Clipboard Lifetime** | Never automatically purged by the 7-day cleaner. Kept indefinitely in active vault until explicitly deleted by user. |
| **Standard Resources** | `<= 5 MB` (Text, Code, JSON, Small Files) | **7 Days (Default)** | Default 7-day retention policy. Auto-purged upon expiration and moved to 30-day Restorable History. |
| **Configurable Shorter TTL**| `<= 5 MB` | **24h, 1h, 15m** | User-configurable shorter retention windows in Settings for enhanced privacy. |
| **Pinned Items** | Any size / Any Category | **Permanent** | Explicitly pinned items are immune to both TTL expiration and FIFO capacity eviction. |
| **Auto-Collapse Policy** | Text/Code/JSON `> 800 chars` or `> 18 lines` | **1000ms Delay** | Managed by `AirVaultCollapseService`. Large text blocks auto-collapse into clean snippet view with expand toggle. |
| **Restorable History** | Deleted or Expired Items | **30 Days** | Content retained for 30 days allowing 1-click `[Re-add to Clipboard]`. Permanently purged after 30 days. |

---

## 4. Storage Quota & Deletion Architecture

### 4.1 Dynamic Quota Calculation
- **Formula**: `Total Quota = 1 GB + (Number of additional connected active devices × 1 GB)`.
  - 1 standalone device = `1.0 GB`
  - 2 connected devices = `2.0 GB`
  - 5 connected devices = `5.0 GB`
  - 10 connected devices = `10.0 GB`
- **Quota Exceeded Behavior**: When vault storage reaches the dynamic cap, new uploads are cleanly blocked with an informative message (`"Clipboard storage is full. Free up space to add more resources."`). Existing resources are never deleted automatically.

### 4.2 Two-Tier Deletion Semantics & Local Suppression Architecture
- **Owner Deletion (`deleteItemGlobally`)**: When the authoritative resource owner deletes an active clipboard item:
  - Broadcasts `ITEM_DELETE` and registers global tombstones across all paired peers.
  - The resource moves into **30-Day Restorable History** on the owner device.
  - The resource is purged from durable outbox and active caches.
  - While within the 30-day window, the owner can 1-click restore the resource back into the Active Clipboard (`[Re-add to Clipboard]`), un-tombstoning and broadcasting restore.
- **Non-Owner Removal ("Remove from my device" / `deleteItemLocally`)**: When a non-owner removes a shared resource received from a peer:
  - Purges the resource completely from local active memory, local cache, and IndexedDB.
  - Creates a persistent local suppression tombstone (`localSuppressedIds` stored in `localStorage`).
  - **Does NOT** add to Restorable History (Restorable History is strictly reserved for owner-deleted/retention-expired items).
  - **Does NOT** affect or delete the author's/owner's copy on other devices.
  - Auto-sync, initial sync (`INITIAL_SYNC_BATCH`), reconnect handshakes, background polling, manual sync, and WebSockets strictly check `isLocallySuppressed()` and will never resurrect the resource.
  - The resource only returns to this device if the owner explicitly triggers a new/explicit share or resend (`resendCount > 0` / `isResend: true`).
- **Permanent Purge After 30 Days**: Once the 30-day restoration window expires for owner-deleted items, the background cleaner permanently purges the actual binary/content, releasing its storage quota while retaining lightweight **Audit History** metadata.
- **Shared Storage Quota Model**: Active Clipboard resources and Restorable History resources share the exact same dynamic quota ($\text{Active} + \text{Restorable History} \le \text{Total Quota}$). Deleting a resource moves its storage from Active to History without freeing quota until permanently purged.
- **Authoritative Client-Side Quota Source of Truth**: Local IndexedDB item data is the strict single source of truth for the displayed quota (`totalBytes = activeBytes + historyBytes`). Stale server telemetry NEVER overrides known local usage.
- **Idempotent Server Usage Reconciliation**: When performing "Clear All" or "Clear All History", client wipes local IndexedDB records and asynchronously dispatches an idempotent `DELETE /api/v1/airvault/clipboards/{clipboardId}` request to purge relay backend files/sessions, reconciling server usage to 0 MB.
- **Audit Trail**: All deletions (Global, Local Removal, Restored, and Retention Expired) preserve audit metadata (`ID`, `Category`, `Snippet`, `Size`, `Device`, `Owner`, `Timestamp`, `Scope`), ensuring audit history never stores bloated binary payloads.

---

## 5. Related Documentation

- Master Overview: [README.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/README.md)
- Backend Architecture: [feature-12-backend-architecture.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature-12-backend-architecture.md)
- Active Clipboard Stream: [feature-6-current-clipboard.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature-6-current-clipboard.md)
- Settings & Preferences: [feature-9-settings-preferences.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature-9-settings-preferences.md)

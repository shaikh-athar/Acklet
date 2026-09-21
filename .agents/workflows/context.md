---
description: Provides a navigation map of the repository, helping agents quickly locate tools, features, entry points, services, ownership, architecture, and important files without scanning the entire codebase.
---

# PROJECT CONTEXT

> This file is the agent's fast project context and navigation map.
> Read this before scanning the repository.
>
> Goal:
> Avoid unnecessary full-repository scans. Use this context to identify
> the relevant subsystem and files first, then inspect only what is needed.
>
> IMPORTANT:
> This file describes the intended/current architecture, but code is the
> final source of truth. If this file conflicts with the implementation,
> inspect the code, resolve the difference, and update this file.

---

# 1. PROJECT

## Project
Acklet

## Current Module
AirVault

## Purpose
Cross-device clipboard and resource synchronization.

## Stack

- Frontend: Angular
- Backend: Spring Boot
- Local persistence: IndexedDB
- Realtime communication: WebSocket
- Async infrastructure: RabbitMQ where applicable
- Encryption: Web Crypto / AES-GCM

---

# 2. CORE ARCHITECTURE

```text
User Action
    ↓
Angular Component
    ↓
AirVault Service
    ↓
IndexedDB
    ↓
Sync Service
    ↓
WebSocket Transport
    ↓
Backend WebSocket Relay
    ↓
Target Device
    ↓
Sync Service
    ↓
IndexedDB
    ↓
Angular State/UI
````

## Responsibilities

### IndexedDB

Local persistence.

Stores:

* clipboard metadata
* clipboard payloads/resources
* tombstones
* synchronization state
* pending/outbox operations

IndexedDB is LOCAL storage.

Saving an item to IndexedDB does NOT automatically synchronize it to another device.

### Sync Service

Owns synchronization business logic.

Responsible for:

* automatic sync
* manual sync
* device fan-out
* initial/historical sync
* reconciliation
* ACK handling
* retry
* deduplication
* delete propagation

### WebSocket

Transport layer only.

Responsible for:

* connection
* reconnect
* send
* receive
* connection state
* transport errors

Do not move clipboard business logic into the WebSocket transport unless necessary.

### Backend

Primarily acts as WebSocket relay/routing layer.

Do not assume backend stores clipboard data unless implementation explicitly does so.

---

# 3. IMPORTANT FILE MAP

## Main Component

`client/src/tools/airvault/airvault.component.ts`

Responsibilities:

* user interactions
* add clipboard item
* manual sync
* resend
* delete
* UI actions

Important methods may include:

* `onAddClipboardItem()`
* `onManualSyncAll()`
* `onResendItem()`
* `onDeleteItem()`

---

## Storage

`client/src/tools/airvault/services/airvault-storage.service.ts`

Responsibilities:

* IndexedDB
* item persistence
* payload persistence
* tombstones
* local storage state

Known stores:

```text
vault_items
vault_payloads
vault_tombstones
vault_outbox
```

Do not load large payloads unnecessarily.

---

## Synchronization

`client/src/tools/airvault/services/airvault-sync.service.ts`

Primary synchronization layer.

Responsibilities:

* `beamContent`
* automatic sync
* manual sync
* initial sync
* reconciliation
* ACK handling
* retry
* fan-out
* deletion propagation

Before creating new synchronization logic, check this service first.

---

## WebSocket

`client/src/tools/airvault/services/airvault-ws-transport.service.ts`

Responsibilities:

* WebSocket lifecycle
* connect/reconnect
* send/receive
* connection state

Always verify the socket is actually OPEN before sending.

---

## Device / Pairing

`client/src/tools/airvault/services/airvault-device.service.ts`

Responsibilities:

* device identity
* paired devices
* connection state
* pairing
* revocation
* device status

Conceptual states:

```text
PAIRED + OFFLINE
PAIRED + CONNECTING
PAIRED + CONNECTED
```

`CONNECTED` does not necessarily mean `SYNCED`.

---

## Encryption

`client/src/tools/airvault/services/airvault-crypto.service.ts`

Responsibilities:

* encryption
* decryption
* key handling

Current encryption:
AES-GCM / Web Crypto.

---

## Worker

`client/src/tools/airvault/airvault.worker.ts`

Used for:

* content processing
* detection
* CPU-heavy operations where appropriate

Large payload processing should not unnecessarily block Angular's main thread.

---

# 4. CURRENT DATA FLOW

## Create / Add Item

```text
User
 ↓
AirVaultComponent
 ↓
StorageService.addItem()
 ↓
IndexedDB
 ↓
SyncService.beamContent()
 ↓
WebSocket
 ↓
Backend
 ↓
Target Device
 ↓
SyncService
 ↓
IndexedDB
 ↓
UI
```

## Manual Sync

```text
Sync Button
 ↓
SyncService.initiateDeviceSync()
 ↓
Historical/reconciliation process
```

Manual and automatic sync should eventually use the same underlying sync engine.

## Delete

```text
Delete
 ↓
StorageService.deleteItemGlobally()
 ↓
Tombstone
 ↓
SyncService.broadcastGlobalDelete()
 ↓
WebSocket
 ↓
Target Device
```

---

# 5. SYNC MESSAGE TYPES

Existing/important message types:

```text
SYNC_PACKET
SYNC_ACK

INITIAL_SYNC_REQUEST
INITIAL_SYNC_BATCH
INITIAL_SYNC_TOMBSTONES

DEVICE_ONLINE
DEVICE_HEARTBEAT

ITEM_DELETE
```

Before introducing a new message type, verify that an existing message cannot support the requirement.

---

# 6. SYNC STATE

Expected delivery lifecycle:

```text
IDLE
 ↓
QUEUED
 ↓
SENDING
 ↓
WAITING_ACK
 ↓
SYNCED
```

Failure:

```text
WAITING_ACK
 ↓
RETRY_BACKOFF
 ↓
QUEUED
```

Important:

```text
WebSocket CONNECTED != DATA SYNCED
```

A device may be connected while historical synchronization is still running.

---

# 7. DURABLE OUTBOX

Synchronization must not depend on an in-memory queue.

Pending synchronization should survive:

* page refresh
* browser restart
* temporary network failure
* WebSocket disconnect

Preferred flow:

```text
Create Item
 ↓
Save IndexedDB
 ↓
Create Outbox Record
 ↓
WebSocket Send
 ↓
ACK
 ↓
Mark Outbox Synced
```

If WebSocket is unavailable:

```text
Outbox = PENDING
 ↓
Reconnect
 ↓
Retry
 ↓
ACK
 ↓
SYNCED
```

Outbox should track at minimum:

```text
packetId
itemId
sourceDeviceId
targetDeviceId
status
retryCount
createdAt
lastAttemptAt
lastError
```

---

# 8. DEVICE SYNC RULES

For every sync:

1. Identify source device.
2. Identify target device.
3. Verify pairing.
4. Verify sync permission.
5. Verify connection.
6. Create/track packet.
7. Send.
8. Wait for ACK.
9. Mark delivery state.
10. Retry when necessary.

Each target must be independent.

Example:

```text
A → B = SUCCESS
A → C = FAILED
A → D = SUCCESS
```

C failing must not prevent B or D from synchronizing.

---

# 9. DEDUPLICATION

Every synchronization packet should have stable identifiers:

```text
itemId
packetId
sourceDeviceId
targetDeviceId
```

If the same packet is received twice:

```text
Do not create duplicate item.
Return ACK.
```

This is required because an ACK may be lost even when delivery succeeded.

---

# 10. RECONNECT / INITIAL SYNC

When a paired device reconnects:

```text
WebSocket Connected
 ↓
Handshake / Verification
 ↓
Check Pairing
 ↓
Check Sync Permission
 ↓
Reconcile Missing Data
 ↓
Transfer Required Items
 ↓
ACK
 ↓
SYNCED
```

Do not blindly push the entire local history if reconciliation can determine what is missing.

Do not run multiple historical synchronization sessions for the same peer simultaneously.

---

# 11. PERFORMANCE RULES

Avoid:

* full repository scans
* full IndexedDB scans
* loading every payload into memory
* unnecessary Base64 conversion
* duplicate WebSocket connections
* duplicate sync loops
* repeated reconciliation
* large crypto operations on the main thread
* loading large resources only to render metadata

Prefer:

```text
Metadata first
 ↓
Determine what is needed
 ↓
Load payload only when required
```

---

# 12. AGENT EXECUTION RULES

Before modifying code:

1. Read `context.md`.
2. Identify the affected subsystem.
3. Identify the relevant service/file from this map.
4. Inspect that file first.
5. Follow only necessary dependencies.
6. Do NOT scan the entire repository by default.
7. Do NOT recreate existing functionality.
8. Do NOT modify unrelated modules.

Only perform broader repository exploration if:

* context is outdated
* referenced implementation cannot be found
* behavior crosses an unknown module boundary
* existing code contradicts this document
* the task explicitly requires architectural analysis

---

# 13. TASK DECISION PROCESS

For every task, determine:

```text
Does this already exist?
        ↓
YES → extend existing implementation
        ↓
NO
        ↓
Which existing subsystem owns this?
        ↓
Can it be added there?
        ↓
Inspect only relevant files
        ↓
Implement
        ↓
Test
        ↓
Update context if architecture changed
```

Do not start every task with a repository-wide search.

---

# 14. CHANGE RECORD

When a significant architectural change is completed, update this section:

## Latest Changes

### [DATE] - [FEATURE]

Files:

* file/path

Change:

* What changed

Reason:

* Why it changed

Flow:

* New execution flow

Impact:

* What existing behavior is affected

Known limitation:

* Any remaining limitation

---

# 15. CONTEXT MAINTENANCE

This file is a living architecture/navigation document.

Update it when:

* architecture changes
* service responsibility changes
* IndexedDB schema changes
* sync protocol changes
* important synchronization behavior changes
* major bugs are fixed
* new core modules are introduced

Do NOT put here:

* temporary debugging logs
* every function
* every repository file
* complete source code
* temporary task details
* large implementation explanations

Keep this file concise and useful for fast agent navigation.

---

# FINAL AGENT RULE

Use this context as the first navigation layer.

The objective is:

```text
CONTEXT
  ↓
RELEVANT SUBSYSTEM
  ↓
RELEVANT FILES
  ↓
MINIMAL REQUIRED INSPECTION
  ↓
IMPLEMENT
  ↓
VERIFY
  ↓
UPDATE CONTEXT
```

Do not perform a 60–70 file repository scan unless the task genuinely requires it.

```
```
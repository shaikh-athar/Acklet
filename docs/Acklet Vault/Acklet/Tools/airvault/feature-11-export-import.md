# Feature 11 — Export, Import, and Data Portability Specification

## 1. Executive Summary & Objective

**Feature 11 (Export, Import, and Data Portability)** provides zero-lock-in data autonomy, independent of real-time peer-to-peer auto-sync:
- **Full Vault JSON Export**: Serializes the user's entire clipboard data (all items, metadata, line blame maps, collapse states, timestamps, audit logs) into a single downloadable `.json` file (`schemaVersion: 1`).
- **Selective Pinned Export**: Creates a curated export of high-priority clips (`isPinned === true`).
- **File-Based Import & Merge**: Accepts backup JSON files and merges content into the importing user's account (`originOwnerId`, `senderDeviceId`).
- **Pre-Import Schema Validation & Diagnostic Feedback**: Rejects malformed JSON or incompatible future schemas with clear error cards before executing changes.
- **Duplicate Detection & User Strategies**: Scans incoming clips against existing target items (matching by ID or semantic content hash), displaying breakdown badges and giving the user 3 strategy choices:
  1. `skip` (*Default, Safest*): Keeps existing items untouched, importing only new clips.
  2. `overwrite`: Replaces matching items with imported versions while preserving stable IDs.
  3. `keep_both`: Generates fresh unique IDs for duplicates so both copies are preserved.

---

## 2. Schema Specification (Version 1)

```json
{
  "schemaVersion": 1,
  "version": "1.0.0",
  "application": "AirVault by Acklet",
  "exportedAt": 1774278400000,
  "exportedBy": {
    "username": "ayaz",
    "deviceId": "dev-macbook-pro",
    "deviceName": "@ayaz"
  },
  "itemCount": 42,
  "items": [
    {
      "id": "item-abc-123",
      "originDeviceId": "dev-macbook-pro",
      "originOwnerId": "ayaz",
      "senderDeviceId": "dev-macbook-pro",
      "senderDeviceName": "@ayaz",
      "senderDeviceAccent": "#2196F3",
      "content": {
        "category": "code",
        "raw": "const auth = await airVault.connect();",
        "language": "typescript",
        "isSensitive": false,
        "byteSize": 45,
        "collapseState": "expanded"
      },
      "timestamp": 1774278300000,
      "isPinned": true,
      "deliveryStatus": "delivered",
      "processingState": "done"
    }
  ],
  "auditLogs": [
    {
      "id": "audit-123",
      "action": "created",
      "itemId": "item-abc-123",
      "itemCategory": "code",
      "itemSnippet": "const auth = await airVault.connect();",
      "deviceId": "dev-macbook-pro",
      "deviceName": "@ayaz",
      "timestamp": 1774278300000
    }
  ]
}
```

---

## 3. Duplicate Handling Strategies

When inspecting a backup file, `AirVaultPortabilityService` matches each item against existing vault items:
- **Match Criteria**: Item ID match, semantic `dedupKey` match, exact trimmed content match (for `text`, `code`, `json`, `url`, `markdown`), or binary filename + byte size match.
- **Strategies**:
  - **Skip Duplicates (`skip`)**: Safest option. New items are inserted; duplicate items are skipped and reported in the completion toast.
  - **Overwrite Existing (`overwrite`)**: Overwrites the existing item in place with the backup copy's properties, maintaining stable item IDs.
  - **Keep Both (`keep_both`)**: Prepends duplicate items with freshly generated IDs (`imported-<timestamp>-<rand>`), preserving both copies.

---

## 4. User Account Scoping & Privacy

- **Account Re-assignment**: When importing data, all imported items have their `originOwnerId` and `senderDeviceId` mapped to the active importing user's account and device. This ensures imported backups immediately become native clipboard items under the current user's control.
- **100% Client-Side Processing**: All export formatting, file inspection, duplicate scanning, and IndexedDB merging execute in the client's browser runtime. Zero backup data is transmitted to remote servers.

---

## 5. UI Controls & Component Architecture

- **Settings Drawer (`Backup` Tab)**: Located in `AirVaultSettingsDrawerComponent`.
- **Export Buttons**:
  - `Export Entire Vault (JSON · v1)`
  - `Export Pinned Only`
- **Interactive File Upload & Review Card**:
  - Displays author, export timestamp, and schema version.
  - Displays duplicate breakdown pills (`X duplicate items found`, `Y new items`).
  - Interactive radio cards for duplicate strategy selection.
  - `Import X Items` button with loading spinner and `Cancel` button.
- **Service Reference**: [`AirVaultPortabilityService`](file:///Users/ayaz/Acklet/client/src/tools/airvault/services/airvault-portability.service.ts).


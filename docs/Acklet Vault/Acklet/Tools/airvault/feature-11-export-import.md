# Feature 11 — Export, Import, and Data Portability Specification

## 1. Executive Summary & Objective

**Feature 11 (Export, Import, and Data Portability)** provides zero-lock-in data autonomy:
- Full vault JSON export with schema validation and metadata timestamps.
- Selective export for Pinned clips.
- File-based restoration / merge importing with schema verification.

---

## 2. Schema Specification

```json
{
  "version": "1.0.0",
  "application": "AirVault by Acklet",
  "exportedAt": 1771945100000,
  "totalItems": 42,
  "items": [
    {
      "id": "item-abc-123",
      "senderDeviceId": "dev-mbp",
      "senderDeviceName": "MacBook Pro 16",
      "content": {
        "category": "code",
        "raw": "const auth = await airVault.connect();",
        "language": "javascript",
        "isSensitive": false,
        "byteSize": 45
      },
      "timestamp": 1771945000000,
      "isPinned": true,
      "deliveryStatus": "delivered"
    }
  ]
}
```

---

## 3. UI Controls & Capabilities

- **Export Full Vault (JSON)**: Downloads standard `.json` file containing all history clips.
- **Export Pinned Only**: Creates a curated export of high-priority clips (`isPinned === true`).
- **Restore Vault Archive**: Interactive file upload with JSON syntax parsing and schema sanity check.
- **Service Reference**: [`AirVaultPortabilityService`](file:///Users/ayaz/Acklet/client/src/tools/airvault/services/airvault-portability.service.ts).

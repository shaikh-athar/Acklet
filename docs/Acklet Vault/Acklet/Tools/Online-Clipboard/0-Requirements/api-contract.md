---
tool: Online Clipboard
phase: 1
last-updated: 2026-10-20
status: Complete
---

# Online Clipboard — API Contract & Endpoint Specification

Base URL: `/api/v1/clipboard`

All JSON responses follow the standard Acklet envelope:
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

---

## 1. Endpoints Overview

| Method | Endpoint | Description | Auth / Headers | Status Codes |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/config` | Fetches server configuration and capacity limits | Public | `200` |
| `POST` | `/shares` | Creates a new ephemeral clipboard room | Public | `200`, `400` |
| `GET` | `/shares/{code}` | Fetches clipboard room metadata and active items | Optional `?pin=...` | `200`, `404` |
| `GET` | `/shares/{code}/available` | Checks if custom room slug is available for renaming | Public | `200` |
| `POST` | `/shares/{code}/rename` | Renames room to a new custom alias | `X-Owner-Token` | `200`, `400`, `409` |
| `POST` | `/shares/{code}/text` | Saves text content with optimistic locking | `X-Owner-Token`, `?isEncrypted=bool` | `200`, `409` |
| `GET` | `/shares/{code}/revisions` | Fetches past text revision snapshots | Public | `200`, `404` |
| `POST` | `/shares/{code}/revisions/{id}/restore` | Restores historical text revision | `X-Owner-Token` | `200`, `404` |
| `POST` | `/shares/{code}/files` | Direct multipart file upload (files <= 5 MB) | `X-Owner-Token`, `?isImage=bool` | `201`, `413` |
| `POST` | `/shares/{code}/uploads/init` | Initiates resumable chunked upload session | `X-Owner-Token` | `200`, `400`, `413` |
| `PUT` | `/shares/{code}/uploads/{id}/chunks/{n}` | Streams an individual 5 MB chunk part | Binary chunk stream | `200`, `400` |
| `POST` | `/shares/{code}/uploads/{id}/complete` | Reassembles chunks and verifies SHA-256 | `X-Owner-Token` | `201`, `400`, `409` |
| `DELETE` | `/shares/{code}/items/{id}` | Permanently deletes an item from the room | `X-Owner-Token` | `200`, `404` |
| `GET` | `/shares/{code}/events` | Server-Sent Events (SSE) real-time event stream | Public | `200` (text/event-stream) |

---

## 2. Detailed Schemas & Payload Specifications

### 2.1 Get System Config
- **Request**: `GET /api/v1/clipboard/config`
- **Response `data`**:
  ```json
  {
    "codeLength": 5,
    "maxCodeLength": 24,
    "maxFileSizeBytes": 209715200,
    "maxTextSizeBytes": 52428800,
    "maxItemsPerType": 100,
    "maxTotalShareSizeBytes": 524288000,
    "retentionDays": 7,
    "chunkSize": 5242880
  }
  ```

### 2.2 Create Share Room
- **Request**: `POST /api/v1/clipboard/shares`
- **Body**:
  ```json
  {
    "expiryHours": 168,
    "pin": "optional-numeric-pin",
    "burnAfterReading": false,
    "liveMode": true,
    "requestedCode": "optional-custom-slug"
  }
  ```
- **Response `data` (`ClipboardShare`)**:
  ```json
  {
    "code": "7k9x2",
    "wordCode": "7k9x2-clip",
    "ownerToken": "tok_9f82a17c",
    "createdAt": "2026-10-20T12:00:00Z",
    "expiresAt": "2026-10-27T12:00:00Z",
    "version": 1,
    "items": [],
    "textCount": 0,
    "imageCount": 0,
    "fileCount": 0,
    "totalSizeBytes": 0
  }
  ```

### 2.3 Save Text Content (Optimistic Concurrency)
- **Request**: `POST /api/v1/clipboard/shares/{code}/text?isEncrypted=false`
- **Headers**: `X-Owner-Token: tok_9f82a17c`
- **Body**:
  ```json
  {
    "text": "Updated shared notes content with https://acklet.com",
    "expectedVersion": 3
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "item_550e8400-e29b-41d4-a716-446655440000",
      "shareCode": "7k9x2",
      "itemType": "TEXT",
      "textContent": "Updated shared notes content with https://acklet.com",
      "sizeBytes": 52,
      "createdAt": "2026-10-20T12:05:00Z",
      "downloadCount": 0,
      "viewCount": 1,
      "isEncrypted": false
    }
  }
  ```
- **Conflict Response (409 Conflict)**: Returned if `currentVersion != expectedVersion`. Triggers Conflict Resolution Banner in UI.

### 2.4 Resumable Chunked Upload Protocol

#### Handshake: `POST /api/v1/clipboard/shares/{code}/uploads/init`
- **Body**:
  ```json
  {
    "fileName": "large_dataset.zip",
    "totalSize": 41943040,
    "chunkSize": 5242880,
    "totalChunks": 8,
    "isImage": false,
    "isEncrypted": false,
    "fileHash": "f428da4b9a..."
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "uploadId": "upl_77a91b2c",
      "shareCode": "7k9x2",
      "fileName": "large_dataset.zip",
      "totalSize": 41943040,
      "chunkSize": 5242880,
      "totalChunks": 8,
      "uploadedChunks": [0, 1],
      "expiresAt": "2026-10-21T12:00:00Z"
    }
  }
  ```

#### Chunk Part Upload: `PUT /api/v1/clipboard/shares/{code}/uploads/{uploadId}/chunks/{chunkNumber}`
- **Body**: `multipart/form-data` with `chunk` binary file part.
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "chunkNumber": 2,
      "totalChunks": 8,
      "uploadedChunks": [0, 1, 2],
      "isComplete": false
    }
  }
  ```

#### Complete & Reassemble: `POST /api/v1/clipboard/shares/{code}/uploads/{uploadId}/complete`
- Verifies chunk presence on disk, stitches parts sequentially, calculates SHA-256 hash, and commits to Content-Addressable Storage (CAS). Returns final `ClipboardItem`.

### 2.5 Real-Time Server-Sent Events (SSE)
- **Endpoint**: `GET /api/v1/clipboard/shares/{code}/events`
- **Event Types**:
  - `ITEM_ADDED`: `{"eventType": "ITEM_ADDED", "shareCode": "7k9x2", "item": { ... }}`
  - `ITEM_DELETED`: `{"eventType": "ITEM_DELETED", "shareCode": "7k9x2", "item": {"id": "..."}}`
  - `SHARE_REVOKED`: `{"eventType": "SHARE_REVOKED", "shareCode": "7k9x2"}`

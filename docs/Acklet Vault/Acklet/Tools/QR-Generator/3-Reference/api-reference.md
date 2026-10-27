---
tool: QR Generator
phase: 3
last-updated: 2026-10-21
status: Complete
---

# QR Generator — REST API Reference

The Acklet QR Generator backend provides public short link resolution at `/q/{code}` and dynamic QR code management under `/api/v1/qr/**`.

---

## 1. Public Redirection & Resolution

### `GET /q/{code}`
Resolves a short link slug and redirects the scanner's browser.

- **URL Parameters**:
  - `code` (string, required): 6-character Base62 slug or custom alphanumeric vanity slug.
- **Headers Evaluated**:
  - `User-Agent`: Parsed for device type, OS, and browser analytics.
  - `CF-IPCountry`: Cloudflare country code lookup.
  - `DNT` (`1`) / `Sec-GPC` (`1`): Honored to disable visitor fingerprinting.
- **Responses**:
  - `302 Found`: Redirects to external destination URL (`target_url`) for `DYNAMIC_URL` codes.
  - `307 Temporary Redirect`: Redirects to `/tools/qr-generator/view/:code` for hosted content types (`DYNAMIC_PDF`, `DYNAMIC_MENU`, `DYNAMIC_COUPON`, `DYNAMIC_VCARD`, `DYNAMIC_MULTI_URL`).
  - `307 Temporary Redirect` to `/tools/qr-generator/view/:code?auth=required`: Triggered when the code is passcode protected.
  - `307 Temporary Redirect` to `/tools/qr-generator/view/:code?paused=true`: Triggered when status is `PAUSED`.
  - `307 Temporary Redirect` to `/tools/qr-generator/view/:code?expired=true`: Triggered when `expires_at` has passed.
  - `404 Not Found`: If slug does not exist.

---

## 2. Dynamic QR Management API

### `POST /api/v1/qr/create`
Creates a new hosted dynamic QR code anonymously without an account.

- **Request Body**:
```json
{
  "type": "DYNAMIC_URL | DYNAMIC_PDF | DYNAMIC_MENU | DYNAMIC_COUPON | DYNAMIC_VCARD | DYNAMIC_MULTI_URL",
  "title": "Summer Campaign 2026",
  "targetUrl": "https://acklet.com/promo",
  "contentJson": "{\"headline\":\"Special Offer\"}",
  "customSlug": "summer-26",
  "password": "optional-pin-or-password",
  "expiresAt": "2026-12-31T23:59:59Z"
}
```
- **Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "code": "summer-26",
    "manageKey": "a9f8e7d6c5b4...",
    "shortUrl": "https://acklet.com/q/summer-26",
    "type": "DYNAMIC_URL",
    "title": "Summer Campaign 2026",
    "targetUrl": "https://acklet.com/promo",
    "hasPassword": true,
    "status": "ACTIVE",
    "scanCount": 0,
    "uniqueScanCount": 0,
    "createdAt": "2026-10-21T00:00:00Z"
  },
  "message": "Dynamic QR code created successfully"
}
```

> [!IMPORTANT]
> The `manageKey` is returned **only once** upon initial creation. The client persists this key in `localStorage` to authorize future updates.

---

### `GET /api/v1/qr/manage/{manageKey}`
Retrieves configuration and scan metrics for a managed QR code.

- **Path Parameters**:
  - `manageKey` (string, required): 256-bit anonymous secret key.
- **Response (`200 OK`)**: Full `DynamicQrResponse` DTO with associated asset summaries and scan counters.

---

### `PUT /api/v1/qr/manage/{manageKey}`
Updates destination URL, title, hosted JSON payload, or security settings.

- **Request Body**:
```json
{
  "title": "Updated Title",
  "targetUrl": "https://acklet.com/new-dest",
  "contentJson": "{\"headline\":\"New Offer\"}",
  "status": "ACTIVE | PAUSED",
  "newPassword": "new-pin-if-changing",
  "removePassword": false,
  "expiresAt": "2027-01-01T00:00:00Z"
}
```
- **Response (`200 OK`)**: Updated `DynamicQrResponse`.

---

### `POST /api/v1/qr/manage/{manageKey}/pause`
Pauses the shortlink. Scanners receive a friendly "This QR Code is currently paused by its author" notice.

---

### `POST /api/v1/qr/manage/{manageKey}/resume`
Resumes a paused shortlink to `ACTIVE`.

---

### `GET /api/v1/qr/manage/{manageKey}/analytics`
Returns aggregate privacy-first scan metrics.

- **Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "totalScans": 342,
    "uniqueVisitors": 218,
    "dailyScans": { "2026-10-20": 120, "2026-10-21": 222 },
    "countries": { "US": 210, "GB": 45, "DE": 28 },
    "devices": { "MOBILE": 280, "DESKTOP": 50, "TABLET": 12 },
    "operatingSystems": { "iOS": 190, "Android": 90, "macOS": 40 },
    "browsers": { "Safari": 190, "Chrome": 110, "Firefox": 30 }
  }
}
```

---

### `POST /api/v1/qr/manage/{manageKey}/upload-asset`
Uploads an associated binary asset (e.g., PDF document or menu graphic) via `multipart/form-data`.

- **Form Fields**:
  - `file`: Multipart binary file (maximum 20MB).
- **Response (`200 OK`)**: Asset summary with ID, detected MIME type, SHA-256 hash, and download URL.

---

## 3. Public Landing Page & Asset Endpoints

### `GET /api/v1/qr/public/{code}`
Returns public metadata and content for the landing viewer.
* If the code is passcode protected (`hasPassword: true`), `targetUrl` and `contentJson` are omitted from the response until unlocked.

### `POST /api/v1/qr/public/{code}/verify-password`
Verifies user-submitted PIN/password for a protected QR code.
* **Request Body**: `{ "password": "user-input" }`
* **Response**: Unmasked `QrPublicInfoDto` with `targetUrl` and `contentJson` upon successful BCrypt match.

### `GET /api/v1/qr/public/{code}/assets/{assetId}`
Downloads or streams an asset resource with `Content-Disposition: inline` and verified code ownership.

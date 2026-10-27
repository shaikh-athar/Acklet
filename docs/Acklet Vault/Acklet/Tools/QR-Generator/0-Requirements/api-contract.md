---
tool: QR Generator
phase: 1
last-updated: 2026-10-20
status: N/A (Client-side only)
---

# API Contract

## Phase 1: Pure Client-Side Generation
Client-side QR rendering using `qr-code-styling` for standard URLs and payloads within density constraints.

---

## Hosted Shortlink Flow (Long URLs & Long Text)

For URLs exceeding 120 characters or text exceeding 300 characters, the client automatically requests a hosted short link.

### 1. `POST /api/v1/qr-links`
Anonymous creation of an immutable hosted shortlink.

**Request Body**:
```json
{
  "payloadType": "URL", // "URL" or "TEXT"
  "target": "https://example.com/very/long/url...", // for URL
  "textContent": "Long text content...",            // for TEXT
  "title": "Optional Title"
}
```

**Constraints**:
- `payloadType`: `URL` or `TEXT` (required)
- `target`: max 4,000 characters; must use `http` or `https` protocol (rejects `javascript:`, `data:`, `file:`)
- `textContent`: max 20,000 characters (UTF-8 NFC normalized)
- Rate Limit: 60 creates/minute per IP

**Response** (`201 Created`):
```json
{
  "code": "8kX2aZ",
  "shortUrl": "https://qr.acklet.com/q/8kX2aZ",
  "payloadType": "URL",
  "expiresAt": "2027-10-25T13:45:00Z"
}
```

### 2. `GET /q/{code}`
Public high-speed resolver for hosted short links.

**Behaviors**:
- **`URL` Type**: Returns `HTTP 302 Found` with `Location: <target>` header.
- **`TEXT` Type**: Returns `HTTP 200 OK` serving mobile-first escaped HTML text viewer with Copy, Share/Save to Notes, and Download .txt actions.
- **Expired/Deleted**: Returns `HTTP 410 Gone` HTML page.
- **Unknown Code**: Returns `HTTP 404 Not Found` friendly HTML page.

**Security Headers**:
- `X-Robots-Tag: noindex, nofollow`
- `Referrer-Policy: no-referrer`
- `Cache-Control: no-cache, no-store, max-age=0, must-revalidate`
- `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:;`

---

## Phase 3: Dynamic QR Code & Management Endpoints

The complete, definitive REST API contract is documented in [api-reference.md](../3-Reference/api-reference.md).

### Summary of Endpoints:
- `GET /q/{code}` — Public shortlink resolver (HTTP 302 Found for direct URLs, HTTP 307 for hosted landing pages, handles paused/expired/password gates).
- `POST /api/v1/qr/create` — Anonymous dynamic QR creation returning one-time 256-bit manage key.
- `GET /api/v1/qr/manage/{manageKey}` — Fetch managed QR details and scan counters.
- `PUT /api/v1/qr/manage/{manageKey}` — Update target destination, title, content JSON, or passcode.
- `POST /api/v1/qr/manage/{manageKey}/pause` & `resume` — Toggle shortlink operational status.
- `GET /api/v1/qr/manage/{manageKey}/analytics` — Aggregated scan metrics (daily, country, device, OS, browser).
- `POST /api/v1/qr/manage/{manageKey}/upload-asset` — Multipart upload for PDFs and menu assets.
- `GET /api/v1/qr/public/{code}` — Public metadata for the landing viewer.
- `POST /api/v1/qr/public/{code}/verify-password` — Passcode authentication for protected dynamic QRs.
- `GET /api/v1/qr/public/{code}/assets/{assetId}` — Public asset download stream.

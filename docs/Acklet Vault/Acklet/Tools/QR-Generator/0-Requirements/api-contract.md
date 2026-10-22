---
tool: QR Generator
phase: 1
last-updated: 2026-10-20
status: N/A (Client-side only)
---

# API Contract

## Phase 1

**No backend endpoints.** Pure client-side generation using qrcode.js.

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

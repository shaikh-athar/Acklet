# URL Shortener: Feature Specification and Scope

This document details the functional specifications, baseline requirements, and out-of-scope boundaries for URL Shortener by Acklet.

Related Documents:
- [requirements.md](requirements.md) - Technical requirements, security rules, and config keys
- [service-design.md](../2-Implementation/service-design.md) - Architectural design and service contracts
- [faq.md](../3-Reference/faq.md) - Frequently asked questions
- [README.md](../README.md) - Hub navigation

---

## 1. Pages & Workspaces

The tool runs on its own subdomain (e.g. `urlshortener.localhost:<port>` in development, `urlshortener.acklet.<domain>` in production) and provides two primary, isolated pages that never share a screen or overlap:

### 1.1 Main Page (`/`)
- Minimalist workspace engineered to fit 100vh with no page scrolling on desktop.
- Displays only:
  - Destination link input with paste and clear actions.
  - Shorten button with loading feedback.
  - Collapsed "Advanced options" section with custom alias, password protection, expiration presets, max clicks limit, one-time flag, scheduled start date, and optional label.
- Post-creation result card:
  - Displays short link with one-click copy and feedback.
  - "Make QR" deep-link handoff to QR Generator.
  - "Preview" link for safe destination inspection.
  - "View my links" link leading to the dedicated `/links` page.
  - "Shorten another" reset action.

### 1.2 Dedicated "My Links" Page (`/links`)
- Full, dedicated link management workspace.
- Reachable from the topbar header "My links" button, the result card, and the sidebar's "My links" sub-item.
- Scrollable inside its own container with a sticky header on desktop.
- Responsive presentation:
  - **Desktop**: Full data table with sticky header (`Short link`, `Original link`, `Label`, `Status`, `Protection`, `Clicks`, `Expiry / Limit`, `Created`, `Actions`).
  - **Tablet**: Compact table layout.
  - **Mobile**: Stacked cards with action buttons and touch-friendly targets (minimum 44px).
- Search, filter, and sorting:
  - Text search by destination link, short code, or label.
  - Filter by status (`All`, `Active`, `Scheduled`, `Expired`, `Limit reached`, `Deactivated`).
  - Sort by `Newest first`, `Oldest first`, `Most clicks`, or `Soonest expiry`.
- Export list to RFC 4180 CSV.
- Backup and recovery file import/export (.json) allowing links and management tokens to be transferred between browsers.
- Empty states with guided action when no links exist or match filter criteria.

---

## 2. Link Management & Statuses

### 2.1 The Five Link Statuses
Every link dynamically evaluates to one of five deterministic statuses:
1. **Active**: Link is currently valid and ready for redirection.
2. **Scheduled**: Link has a future start date and cannot yet be accessed.
3. **Expired**: Link has passed its expiration timestamp.
4. **Limit reached**: Link has met or exceeded its configured maximum click count.
5. **Deactivated**: Link was manually deactivated by its owner or was a one-time link that completed its single visit.

### 2.2 Actions per Link
- **Edit**:
  - Opens a right side panel on desktop and a bottom sheet on mobile.
  - Editable fields: destination link, label, password (set, change, or remove), expiration preset, max clicks limit, one-time flag, scheduled start date.
  - Updates are sent via `PUT /api/v1/short-links/{code}` with `X-Owner-Token` validation.
  - Invariant: The short code is permanent and can never be modified.
- **Deactivate / Reactivate**: Toggles access on demand via `POST /api/v1/short-links/{code}/deactivate` and `/reactivate` without altering metrics.
- **Duplicate**: Clones all link configuration into a brand-new short code with reset click counts via `POST /api/v1/short-links`.
- **Delete**: Soft-deletes the link via `DELETE /api/v1/short-links/{code}` with a 90-day retention purge.
- **Copy**: Copies the canonical short link (`/s/{code}`) to the clipboard.
- **QR**: Hands off the short URL directly to Acklet QR Generator.

---

## 3. Password Protection

- **Server-Rendered Unlock Page**: When a password-protected link (`/s/{code}`) is opened, the server serves an accessible HTML unlock challenge. The target URL is never returned in JSON or HTML prior to successful authentication.
- **Cryptographic Storage**: Passwords are saved on the server using Spring Security BCrypt (12 rounds). Migrated client PBKDF2 hashes are verified and automatically upgraded to BCrypt on first successful unlock.
- **Lockout & Rate Limiting**: Maximum 5 failed attempts per 15-minute sliding window trigger a 15-minute lockout per code and per client (keyed by peppered HMAC-SHA256 IP).
- **Signed Unlock Session Cookie**: On successful password verification, the server issues an `HttpOnly`, `SameSite=Lax`, short-lived cookie signed with HMAC-SHA256, allowing immediate 302 redirection.
- **Zero Destination Exposure**: Destination, label, tags, and stats of protected links are withheld across all public endpoints.

---

## 4. Redirect Behavior & Security

### 4.1 Strict Resolution Sequence (GET `/s/{code}`)
When a short link is resolved, server-side checks occur in this exact order:
1. `Rate Limit`: Enforces IP rate limiting via peppered HMAC-SHA256 keys.
2. `Exists`: Returns a generic 404 page if code is missing or soft-deleted.
3. `Deactivated`: Returns a clean 410 "Link Deactivated" page.
4. `Scheduled start`: Returns a 403 "Link Not Yet Active" page.
5. `Expired`: Returns a 302 to fallback URL if defined, else a 410 "Link Expired" page.
6. `Click limit`: Returns a 302 to fallback URL if defined, else a 410 "Limit Reached" page.
7. `Password`: Checks signed unlock cookie; serves server-rendered unlock challenge if missing.
8. `Bot & HEAD Bypass`: Crawlers (`Twitterbot`, `Slackbot`, `Discordbot`, etc.) and HEAD requests redirect without burning one-time links or incrementing metrics.
9. `Atomic Metric Update`: Executes conditional SQL update (`clicks = clicks + 1`); marks one-time links as deactivated concurrency-safely.
10. `HTTP 302 Redirect`: Issues 302 redirect with `Cache-Control: no-store` and `Referrer-Policy: no-referrer`.

### 4.2 Security Rules
- Protocols allowed: `http:` and `https:`. All other schemes (`javascript:`, `data:`, `file:`, `blob:`, `vbscript:`) are blocked.
- SSRF loopback protections: `localhost`, `127.0.0.1`, private IP CIDRs (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`), and shortener domains cannot be shortened.
- Zero visitor telemetry: No raw IP addresses, device identifiers, or visitor logs are stored. Rate limiting uses one-way peppered HMAC-SHA256 hashes.

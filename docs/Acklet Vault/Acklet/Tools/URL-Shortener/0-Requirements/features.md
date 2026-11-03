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
  - Collapsed "Advanced options" section with custom alias, password protection, expiration presets (including custom date & time picker), max clicks limit, one-time flag, scheduled start date, and optional label.
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
  - Filter by expiration presets and attribute chips (including quick-filter for `Expired` links).
  - Dynamic dual-theme expiration badges (`Expired`, `Expiring soon`, exact date/time, and `Never`) with high contrast (>= 4.5:1) in both Light and Dark themes.
  - Sort by `Newest first`, `Oldest first`, `Most clicks`, or `Soonest expiry`.
- Export list to RFC 4180 CSV.
- Backup and recovery file import/export (.json) allowing links and management tokens to be transferred between browsers.
- Empty states with guided action when no links exist or match filter criteria.

---

## 2. Link Management & Statuses

### 2.1 The Five Link Statuses
Every link dynamically evaluates to one of five deterministic statuses. Status badges strictly display **human-readable labels only**, completely omitting numeric HTTP status codes (e.g. displays "Limit reached", never "410 Limit reached"):
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

---

## 5. Custom Expiration & Message Sanitization

### 5.1 Custom Expiration Date & Time
- **Flexible Expiration Modes**: Users can choose standard durations (`1 hour`, `24 hours`, `7 days`, `30 days`, `90 days`, `1 year`, `Never`) or select **Custom date & time** (`custom`).
- **Interactive Datetime Picker**:
  - Integrated `<input type="datetime-local">` styled with dual-theme design tokens (`--bg-surface`, `--text-primary`, `--border-default`).
  - Minimum bound enforced to the current local minute (`minDatetimeLocal`) preventing accidental past date selection.
  - Informational helper text displays the localized deactivation schedule with time zone disambiguation.
- **Dynamic Status & Visual Badging**:
  - Expired links are visually highlighted via semantic status pills (`.url-badge-expired`, `.url-badge-expiring`, `.url-badge-never`).
  - Expiring links (within 24 hours) display an amber alert state.
  - High-contrast ratio (>= 4.5:1) guaranteed across Light and Dark themes.
  - Dedicated "Expired" filter attribute chip in the link management toolbar.

### 5.2 Humanized Error Messaging & Technical Leakage Prevention
- **User-Facing Toast Sanitization**: Technical error signatures (such as raw HTTP status strings `Http failure response for http://...: 500 Internal Server Error`, stack traces, SQL syntax, or internal endpoints) are strictly intercepted before display.
- **Polite & Negotiable Catalog**:
  - Unhandled 500/internal errors display: *"Something went wrong on our end. Please try again in a few moments."*
  - Rate limiting (429) displays: *"Too many requests right now. Please wait a moment and try again."*
  - Network disconnect (status 0) displays: *"Unable to reach the server. Please check your connection and try again."*
  - Expired / invalid timestamps display: *"Please choose an expiration date and time in the future."*
- **Bootstrap Interceptor**: Angular HTTP error interceptor `shortenerErrorInterceptor` registered at application bootstrap (`client/src/main.ts`) guaranteeing complete coverage for dev and production runs.

---

## 6. Multi-Device Responsive Architecture & Mobile Fit

### 6.1 Device Breakpoints
- **Small (`< 600px`, tested from 320px up to 599px):**
  - Vertically centered creation card in `100dvh` (minus header and safe area insets).
  - Landscape phones top-align and scroll naturally.
  - My links toolbar stacks cleanly: Search input (100%), Status (50%) & Sort (50%) on row 2, Attribute Filters (100%) on row 3.
  - 1-column structured card grid with `minmax(0, 1fr)` track sizing preventing horizontal overflow.
- **Medium (`600px - 1023px`):**
  - 2-column auto-fit structured card grid (`repeat(auto-fit, minmax(280px, 1fr))`).
- **Large (`>= 1024px`):**
  - Full desktop data table with sticky header, spacious columns, and horizontal scroll boundary.

### 6.2 5-Row Structured Mobile Card Anatomy
Each link on mobile renders a structured card:
1. **Row 1 (Header & Actions):** Short code (`/code` in monospace bold bronze, truncated with ellipsis) + 38px high-contrast bronze Copy button + 38px 3-dots Action menu (`app-action-dropdown`).
2. **Row 2 (Destination):** Link icon + original link with ellipsis truncation (tooltip on link hover only) OR `"Not available right now"` when protected destination is uncached.
3. **Row 3 (Label):** Optional label badge with text truncation.
4. **Row 4 (Badges):** Clean wrapped chips with 6px gap (Status label, Protected, One-time, Max click(s), Expiry formatted date/time).
5. **Row 5 (Stats Grid):** 3-column stats grid (`repeat(3, minmax(0, 1fr))`) side-by-side: Clicks, Created, and Last visited (with proper pluralization, e.g. "Max 1 click" vs "Max 5 clicks").

### 6.3 Unreachable-Service & Offline Resilience
- **Detection:** Intercepts network failure, timeout, 502/503/504 gateway errors, and proxy `ECONNREFUSED`.
- **Single In-Flight Guard:** Simultaneous calls to `getMyLinks()` are deduplicated into a single observable stream.
- **Limited Exponential Backoff:** Retries once after 1s, then after 2s, then stops cleanly without infinite request loops.
- **Calm Notice Banner:** Displays a friendly notice at the top of My Links: *"Some details can't be loaded right now. Please try again in a few minutes."* with a **Try again** button.
- **Offline Safe Mode:** View, search, filter, sort, export CSV, and copy short URLs remain fully functional. Server-mutation actions are disabled with explanatory tooltips.

# URL Shortener — Service Design & Architecture

This document details the software architecture, service responsibilities, data flow, and cryptographic design for **URL Shortener by Acklet**.

Related Documents:
- [requirements.md](../0-Requirements/requirements.md) — Technical configuration and constraints
- [features.md](../0-Requirements/features.md) — Features, statuses, and scope
- [faq.md](../3-Reference/faq.md) — Frequently asked questions
- [component-tree.md](component-tree.md) — UI component hierarchy and signal flow
- [phase-1-progress.md](../1-Progress/phase-1-progress.md) — Implementation progress
- [README.md](../README.md) — Hub index

---

## 1. Architectural Overview

URL Shortener uses a robust client-server architecture:
- **Backend (Spring Boot 3.4 / Java 21)**: The single source of truth for link creation, rule enforcement (expiration, scheduling, click limits, one-time consumption), atomic counters, password validation, and HTTP 302 redirection.
- **Database (PostgreSQL + Flyway V56)**: Relational persistence with unique case-sensitive indexes, hashed owner tokens, and retention cleanup indexes.
- **Frontend (Angular 20 Standalone)**: Presentation layer inside `tool-shell`, managing client state via signals, delegating link creation, updates, and listings to backend REST endpoints.

```text
┌────────────────────────────────────────────────────────┐
│               UrlShortenerComponent                    │
│   (Signals, UI state, routing, drawers, modals)        │
└──────────────────────────┬─────────────────────────────┘
                           │
       ┌───────────────────┴───────────────────┐
       ▼                                       ▼
┌───────────────────────────────┐ ┌───────────────────────────────┐
│       ShortenerService        │ │   ShortenerSecurityService    │
│  - REST client (/api/v1/...)  │ │  - Client URL pre-validation  │
│  - Silent background migration│ │  - Client password rules      │
│  - QR handoff builder         │ │  - Client rate check          │
└──────────────┬────────────────┘ └───────────────────────────────┘
               │
               ▼
┌───────────────────────────────┐
│    ShortenerStorageService    │
│  - Anonymous ownerToken       │
│  - Sanitized display cache    │
│  - RFC 4180 CSV export        │
│  - Encrypted recovery file    │
└──────────────┬────────────────┘
               │ (HTTP via proxy /api and /s)
               ▼
┌────────────────────────────────────────────────────────┐
│             Acklet Spring Boot Backend                 │
│  ├── ShortLinkController (/api/v1/short-links)         │
│  ├── ShortRedirectController (/s/{code})               │
│  ├── ShortLinkService (Base62, ownership, purge)       │
│  ├── ShortRedirectService (10-step decision engine)    │
│  ├── ShortenerSecurityHelper (SSRF, BCrypt, IDN)       │
│  └── ShortLinkRepository (Atomic PostgreSQL Modifiers) │
└────────────────────────────────────────────────────────┘
```

---

## 2. Backend Service Responsibilities

### 2.1 ShortLinkService (`com.code.acklet.tool.tools.shortener.service`)
- **Base62 Slug Generation**: Generates 6-character cryptographically random slugs using `SecureRandom` with collision retries and reserved keyword filtering (`api`, `s`, `q`, `links`, `unlock`, `report`, `admin`, etc.).
- **Ownership Verification**: Validates caller ownership using constant-time comparison on SHA-256 hashed owner tokens (`X-Owner-Token`).
- **Idempotent Migration**: Ingests client-side legacy links, keeping existing codes if available or issuing new slugs, and preserving legacy PBKDF2 password hashes for seamless migration.
- **Scheduled Retention Purge**: Runs hourly via `@Scheduled(fixedDelay = 3600000)` to hard-delete expired, limit-reached, or soft-deleted records older than 90 days.

### 2.2 ShortRedirectService (`com.code.acklet.tool.tools.shortener.service`)
Executes the strict 10-step redirect decision order:
1. **Rate Limiting**: Checks client IP bucket against brute-force limit using HMAC-SHA256 peppered keys.
2. **Existence**: Returns `404 Not Found` HTML page if slug does not exist.
3. **Deactivation**: Returns `410 Gone` HTML page if deactivated or soft-deleted.
4. **Scheduled Start**: Returns `403 Forbidden` HTML page if `start_date > now`.
5. **Expiration**: 302 redirects to `fallback_url` if set; otherwise returns `410 Gone` HTML page.
6. **Click Limit**: 302 redirects to `fallback_url` if set; otherwise returns `410 Gone` HTML page.
7. **Password Challenge**: Serves dual-theme server-rendered unlock challenge if password-protected and signed cookie `ack_unlocked_{code}` is missing. The destination URL is **never** sent to the client.
8. **Bot & HEAD Request Filter**: If request is HTTP HEAD or user-agent matches search crawlers/social preview bots (Slack, Twitter, Discord, WhatsApp), redirects to destination **without** incrementing click counter or consuming one-time links.
9. **Atomic SQL Counter**: Executes race-safe atomic PostgreSQL update:
   - One-time links: `UPDATE short_links SET clicks = clicks + 1, is_deactivated = true WHERE id = :id AND is_deactivated = false AND clicks = 0`
   - Max-click links: `UPDATE short_links SET clicks = clicks + 1 WHERE id = :id AND is_deactivated = false AND clicks < max_clicks`
   - Standard links: `UPDATE short_links SET clicks = clicks + 1 WHERE id = :id AND is_deactivated = false`
10. **HTTP 302 Redirection**: Returns 302 with security headers:
    - `Cache-Control: no-cache, no-store, max-age=0, must-revalidate`
    - `Referrer-Policy: no-referrer`
    - `X-Robots-Tag: noindex, nofollow`
    - `X-Content-Type-Options: nosniff`
    - `X-Frame-Options: DENY`

### 2.3 ShortenerSecurityHelper (`com.code.acklet.tool.tools.shortener.util`)
- **SSRF & Private Network Guard**: Blocks destination URLs pointing to loopback, link-local, RFC1918 private IP ranges, and internal Acklet shortener domains.
- **Credentials & Protocol Guard**: Rejects URLs containing embedded user credentials (`user:pass@`) and restricts schemes to HTTP/HTTPS.
- **IDN Punycode Normalization**: Converts non-ASCII internationalized domain names (e.g. `https://bücher.de`) to punycode (`https://xn--bcher-kva.de`) prior to storage.
- **Dual-Scheme Password Verification**: Verifies new passwords using Spring Security BCrypt and verifies legacy migrated passwords using `PBKDF2WithHmacSHA256` (100,000 iterations, 16-byte salt). Automatically upgrades legacy hashes to BCrypt upon the first successful unlock.
- **HMAC Pepper Hashing**: Computes `hmacSha256(clientIp, pepper)` for rate-limiting keys and reporter hashes so raw IP addresses are never logged or stored in Redis.
- **Signed Unlock Tokens**: Signs short-lived cookie payloads (`{code}:{expiry}:{hmac}`) to enable password session continuation without storing state in memory.

---

## 3. Client Storage & Migration

### 3.1 ShortenerStorageService
- Stores only the anonymous `ownerToken` (`tok_...`) in `localStorage`.
- Maintains an in-memory and `localStorage` display cache for instant UI rendering; credentials, passwords, and password hashes are **never** cached. For password-protected links, `targetUrl` is masked to an empty string in local client storage.
- Runs `purgeLegacySensitiveStorage()` on startup to automatically sweep legacy unencrypted storage keys.
- Performs silent one-time background migration on client startup (`migrateLocalLinks()`). Once migrated, legacy plaintext records are purged from `localStorage`.
- Provides RFC 4180 CSV export and JSON recovery backup file export/import.

---

## 4. Cryptographic Architecture & Data Protection

### 4.1 Field-Level Encryption at Rest (AES-256-GCM)
Confidential user-supplied fields are encrypted before writing to PostgreSQL via `ShortenerEncryptedStringConverter` and `ShortenerCryptoService`:
- **Algorithm**: Standard JDK JCE `AES/GCM/NoPadding` with a 256-bit symmetric key.
- **IV / Nonce**: 96-bit cryptographically random IV generated per write via `SecureRandom`.
- **Authentication**: 128-bit GCM authentication tag.
- **Key Versioning**: Ciphertext is stored with a version prefix (e.g., `v1:<base64-iv>:<base64-ciphertext>`), enabling zero-downtime key rotation.
- **Fail-Safe Startup**: Under production profile, application startup immediately terminates with `IllegalStateException` if `APP_ENCRYPTION_KEY` is absent or not 32 bytes (256 bits). In dev profile, an ephemeral key is generated and a warning logged.

### 4.2 Key Rotation & In-Memory Decryption
- Multiple key versions can be registered concurrently via `ShortenerCryptoService.registerKeyVersion(version, key)`. Decryption inspects the prefix and chooses the appropriate key.
- Search on confidential fields is performed strictly in-memory per authenticated owner: the database returns encrypted rows for the owner, and `ShortLinkService` decrypts up to a configurable cap (default 100 links per request) in memory. No plaintext full URLs or labels are ever indexed in SQL.
- `target_host` is extracted at entity persist/update time (`@PrePersist` / `@PreUpdate`) and stored in plaintext as an operational triage index (`idx_short_links_target_host`) for domain-level abuse blocking without decrypting confidential full target URLs.

### 4.3 Password Hashing & Secret Verification
- Passwords are encrypted with BCrypt (strength 12) with constant-time verification.
- Passwords and password hashes are excluded from `@ToString`, marked `@JsonProperty(access = WRITE_ONLY)` on request DTOs, and never exposed in responses or logs.
- Legacy PBKDF2 hashes are upgraded to BCrypt on the first successful password unlock.
- Tokens (`ownerToken`, `manageToken`) are stored solely as SHA-256 hashes and compared in constant time (`MessageDigest.isEqual`).
- IP addresses are converted into rate-limiting keys via HMAC-SHA256 with an environment pepper (`APP_SHORTENER_PEPPER`); raw IPs are never stored.

---

## 5. Client Resilience & Error Sanitization Architecture

### 5.1 HTTP Error Interceptor (`shortener-error.interceptor.ts`)
- Registered globally at application bootstrap (`client/src/main.ts`) via `provideHttpClient(withInterceptors([shortenerErrorInterceptor]))`.
- Intercepts all outgoing requests and incoming `HttpErrorResponse` instances.
- Passes errors through `sanitizeErrorMessage(error)` before emitting down the Observable stream, stripping raw server URLs, HTTP status numbers, SQL error bodies, and Java stack traces.

### 5.2 Centralized Message Catalog (`shortener-messages.ts`)
- Provides deterministic error mapping:
  - Error code lookups (`SHORTENER_MESSAGE_CATALOG`).
  - HTTP status fallbacks (400 -> "Please enter a valid destination link.", 401/403 -> "You don't have permission to modify this link.", 404/410 -> "This link is no longer available.", 409 -> "This custom alias is already in use.", 429 -> "Too many requests right now. Please wait a moment and try again.", 500+ -> "Something went wrong on our end. Please try again in a few moments.").
  - Network disconnect / offline fallback (0 -> "Unable to reach the server. Please check your connection and try again.").
- `isTechnicalErrorText(text)` detection pattern-matches and rejects server leakages.

### 5.3 Custom Expiration Architecture
- Frontend:
  - Form & edit state: `formCustomExpiresAt = signal<string>('')` and `editCustomExpiresAt = signal<string>('')`.
  - Date conversion: parses ISO timestamp into local datetime-local format (`YYYY-MM-DDTHH:mm`) and converts user selection to Unix epoch milliseconds.
  - Live validation: `isCustomExpiryPast(val)` disables form submission and displays polite contextual guidance if a past time is chosen.
- Backend:
  - `ShortLinkService.createLink` and `ShortLinkService.updateLink` validate that non-null `expiresAt` timestamps are strictly in the future (`expiresAt.isBefore(now)` throws `HttpStatus.BAD_REQUEST`).
  - Retains configurable maximum and default expirations from `ShortenerProperties`.

### 5.4 Request Deduplication & Offline Resilience
- **Single In-Flight Guard**: `ShortenerService.getMyLinks()` maintains a private `inFlightLinks$` Observable shared via `shareReplay(1)`. Multiple concurrent calls during route navigation or filter toggles subscribe to the same ongoing HTTP call, avoiding duplicate server loads and proxy connection saturations.
- **Limited Exponential Backoff**: Uses RxJS `retry({ count: 2, delay: (err, count) => timer(count * 1000) })` for network errors (status 0, timeout, 502/503/504), ensuring automatic recovery for transient blips while strictly preventing infinite request loops.
- **Service Unreachable State Transition**: When retries are exhausted, the service transitions `isServiceUnreachable` to `true`.
  - The UI falls back to cached local storage records for read-only browsing, searching, and exporting.
  - Destructive or write actions (Create, Edit, Delete, Deactivate, Bulk) are safely disabled with explanatory tooltips.
  - Protected links whose destination URLs are not cached display `"Not available right now"` with external link icons hidden.
  - Surfaces a calm notice banner with a manual **Try again** retry action.

---

## 6. Mobile Dropdown & Containing-Block Isolation Architecture

### 6.1 The Containing-Block Defect
In modern browser rendering engines (Chromium, WebKit, Gecko), any ancestor element with `backdrop-filter: blur(...)` or `transform` becomes the containing block for all `position: fixed` descendants.
- When `.attribute-popover-panel` was nested inside `.links-unified-card.glass-panel` (which uses `backdrop-filter: blur(16px)`), setting `position: fixed; bottom: 0;` trapped the bottom sheet inside `.links-unified-card` rather than the viewport, pushing it off-screen at the bottom of the card list.

### 6.2 Root-Level Viewport Projection
To guarantee reliable viewport anchoring on mobile screens (<600px):
1. **Template Sharing**: Filter attribute criteria are declared inside `<ng-template #attributeFiltersContent>` at the root template scope of `UrlShortenerComponent`.
2. **Desktop Rendering (`>= 600px`)**: Projected into `.attribute-popover-panel.desktop-filter-popover` inside `.attribute-filters-wrap` via `<ng-container *ngTemplateOutlet="attributeFiltersContent"></ng-container>`, functioning as an anchored 480px popover.
3. **Mobile Rendering (`< 600px`)**: Projected at the root template level into `.mobile-filter-drawer-backdrop` + `.mobile-filter-drawer-surface`, completely outside `.links-unified-card` and free from containing-block interference.
4. **Stacking Elevation**:
   - Status & Sort filter popovers are elevated to `z-index: 200 !important;` when open, painting over row 2's Filters button.
   - `.mobile-link-card` uses `overflow: visible;` and dynamic z-index elevation (`z-index: 100 !important;`) on `.is-menu-open` / `:has(.action-dropdown-host.is-open)`, allowing the 3-dots action dropdown to extend over sibling cards without being clipped.

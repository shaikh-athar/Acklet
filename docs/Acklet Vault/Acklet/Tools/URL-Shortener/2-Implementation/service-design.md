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

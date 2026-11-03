# URL Shortener — Technical Requirements & Configuration Specification

This document details the configuration constants, technical requirements, input validation specifications, and architectural invariants for **URL Shortener by Acklet**.

Related Documents:
- [features.md](features.md) — Baseline features, statuses, and scope
- [service-design.md](../2-Implementation/service-design.md) — Implementation architecture
- [faq.md](../3-Reference/faq.md) — Frequently asked questions
- [README.md](../README.md) — Documentation index

---

## 1. Central Configuration Contract

The system uses configuration layers on both the Spring Boot backend (`application.properties`) and the Angular frontend (`shortener.config.ts`).

### 1.1 Backend Spring Boot Configuration (`app.shortener.*`)

Configured in `com.code.acklet.tool.tools.shortener.config.ShortenerProperties`:

| Property Key | Default Value | Environment Override | Description |
| :--- | :--- | :--- | :--- |
| `app.shortener.base-url` | `http://localhost:8080` | `APP_SHORTENER_BASE_URL` | Base public domain for shortened URLs. |
| `app.shortener.redirect-prefix` | `/s` | `APP_SHORTENER_REDIRECT_PREFIX` | Route prefix for short link resolution. |
| `app.shortener.max-url-length` | `2048` | `APP_SHORTENER_MAX_URL_LENGTH` | Maximum allowed characters for target/fallback URLs. |
| `app.shortener.min-password-length`| `6` | `APP_SHORTENER_MIN_PASSWORD_LENGTH`| Minimum required length for protected links. |
| `app.shortener.default-retention-days`| `90` | `APP_SHORTENER_RETENTION_DAYS` | Days before deleted, expired, or limit-reached links are purged. |
| `app.shortener.owner-token-prefix`| `tok_` | `APP_SHORTENER_OWNER_TOKEN_PREFIX` | Prefix for client management tokens. |
| `app.shortener.ip-pepper` | *(Dev default)* | `APP_SHORTENER_IP_PEPPER` | Secret pepper for HMAC-SHA256 IP rate limit keys. |
| `app.shortener.cookie-hmac-secret`| *(Dev default)* | `APP_SHORTENER_COOKIE_HMAC_SECRET` | Secret key for signing unlock session cookies. |
| `app.shortener.rate-limit.create-per-hour` | `20` | `APP_SHORTENER_RL_CREATE` | Short link creation limit per IP per hour. |
| `app.shortener.rate-limit.unlock-failures-per-window` | `5` | `APP_SHORTENER_RL_UNLOCK_FAILURES` | Maximum failed unlocks before lockout. |
| `app.shortener.rate-limit.unlock-window-minutes` | `15` | `APP_SHORTENER_RL_UNLOCK_WINDOW` | Sliding window for password failure counting. |
| `app.shortener.rate-limit.unlock-lockout-minutes` | `15` | `APP_SHORTENER_RL_UNLOCK_LOCKOUT` | Duration of lockout period after repeated failures. |
| `app.shortener.rate-limit.availability-per-minute` | `30` | `APP_SHORTENER_RL_AVAILABILITY` | Custom alias availability checks per IP per minute. |
| `app.shortener.rate-limit.lookup-per-minute` | `30` | `APP_SHORTENER_RL_LOOKUP` | Link metadata lookup requests per IP per minute. |
| `app.shortener.rate-limit.preview-per-minute` | `30` | `APP_SHORTENER_RL_PREVIEW` | Safe destination preview requests per IP per minute. |

### 1.2 Database Schema (Flyway `V56__short_links.sql`)

```sql
CREATE TABLE IF NOT EXISTS short_links (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(64) NOT NULL,
    target_url VARCHAR(2048) NOT NULL,
    fallback_url VARCHAR(2048),
    owner_token_hash VARCHAR(64) NOT NULL,
    user_id BIGINT,
    label VARCHAR(120),
    tags VARCHAR(256),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    start_date TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    clicks BIGINT NOT NULL DEFAULT 0,
    max_clicks BIGINT,
    is_one_time BOOLEAN NOT NULL DEFAULT FALSE,
    is_deactivated BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    has_password BOOLEAN NOT NULL DEFAULT FALSE,
    password_hash VARCHAR(255),
    password_scheme VARCHAR(32),
    last_opened_at TIMESTAMP WITH TIME ZONE,
    report_count INT NOT NULL DEFAULT 0,
    flagged BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_short_links_code ON short_links (code);
CREATE INDEX IF NOT EXISTS idx_short_links_owner_token_hash ON short_links (owner_token_hash);
CREATE INDEX IF NOT EXISTS idx_short_links_expires_at ON short_links (expires_at);
CREATE INDEX IF NOT EXISTS idx_short_links_deleted_at ON short_links (deleted_at);
CREATE INDEX IF NOT EXISTS idx_short_links_cleanup ON short_links (deleted_at, expires_at, is_one_time, clicks, max_clicks);
```

---

## 2. Sensitive Data Classification & Protection Architecture

Every field handled by URL Shortener is formally categorized into one of four sensitivity tiers:

| Tier | Sensitivity | Examples | Storage Scheme | Display & Exposure Rules |
| :--- | :--- | :--- | :--- | :--- |
| **SECRET** | Highest | Link password, unlock signing keys | Non-reversible salted hash only (BCrypt with cost factor from config, legacy PBKDF2-SHA256 verified and upgraded). | Never reversible, never returned in DTOs/APIs, never serialized, never present in logs or exports. UI edit form shows empty inputs only. |
| **CONFIDENTIAL** | High | Destination URL (`target_url`), fallback URL (`fallback_url`), custom labels, tags/notes | Application-level AES-256-GCM authenticated encryption at rest with 96-bit random nonce per value, `v1:` key version prefix, and JPA `AttributeConverter`. | Plaintext is decrypted in memory only for the verified link owner over TLS. Public endpoints, previews, and unauthenticated users never see plaintext confidential values. |
| **IDENTIFIER** | Medium | Owner tokens, management tokens, client IP addresses | SHA-256 (tokens) and HMAC-SHA256 with environment pepper (IPs). | Raw values are never stored. Comparison is constant-time (`MessageDigest.isEqual`). IPs are never logged or stored raw. |
| **PUBLIC / LOW RISK** | Low | Short code, status, counters, timestamps, flags, expiry/limit numbers, `target_host` | Plaintext in database columns with appropriate btree indexes. | Safe to display in public status pages, error cards, and analytics. `target_host` is kept in plaintext specifically to allow fast offline blocklist matching and abuse detection without decrypting target URLs. |

### 2.1 Encryption & Key Management Details
- **Algorithm**: `AES/GCM/NoPadding` (256-bit key, 96-bit random IV, 128-bit authentication tag).
- **Key Storage**: Supplied strictly via `APP_ENCRYPTION_KEY` environment variable. Production startup terminates immediately if key is missing or not 256 bits (32 bytes Base64).
- **Key Rotation**: Supported via version prefixes (`v1:`, `v2:`). Decryption resolves the matching key version automatically, and background re-encryption jobs can rotate records to newer versions without downtime.
- **Search Cap**: Because confidential fields are encrypted in the database, owner searches are decrypted in memory with a hard limit of 100 links per page (`max-page-size: 100`), preventing denial of service or unbounded memory utilization.

### 2.2 Transport Security & Headers
- **HTTPS Only in Production**: Strict Transport Security (HSTS) with `max-age=31536000; includeSubDomains`.
- **Sensitive Headers**: All API endpoints and redirect endpoints emit `Cache-Control: no-cache, no-store, max-age=0, must-revalidate` and `Pragma: no-cache`.
- **Cookies**: Unlock cookies are `HttpOnly; Secure; SameSite=Lax` and path-scoped strictly to `/s/{code}`.
- **Header Redaction**: `X-Owner-Token`, `Authorization`, and `Cookie` headers are never logged. Request body logging is disabled.

---

## 3. Password Security Specification

1. **Server-Side Primary Algorithm**: Spring Security `BCryptPasswordEncoder` (12 rounds).
2. **Backward-Compatible Legacy Scheme**: Verifies client-migrated `pbkdf2:100000:<salt_hex>:<hash_hex>` hashes using JDK `SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")`.
3. **Automatic Algorithm Upgrade**: On first successful password verification of a legacy-encoded link, `ShortRedirectService` re-hashes the plain password using BCrypt and updates the database record atomically.
4. **Zero Destination Disclosure**: Neither client-facing APIs, nor HTML responses, nor unlock challenge pages ever include the target URL, label, or metrics before a verified unlock.
5. **Signed Unlock Session Cookie**: On successful unlock, the server issues a signed, `HttpOnly`, `SameSite=Lax`, short-lived (15 minutes) cookie scoped to `/s/{code}`.
6. **Rate Limiting & Lockout**: Failed attempts are tracked per code and per client (HMAC-SHA256 hashed IP). Exceeding 5 failures triggers a 15-minute lockout with generic error messaging.

---

## 3. Link Status & Resolution Logic

### 3.1 10-Step Redirect Decision Sequence (GET `/s/{code}`)

1. **Rate Limit**: Verify requester IP has not exceeded redirect rate limits.
2. **Exists Check**: Query database by exact case-sensitive code; if not found or `deleted_at IS NOT NULL`, return generic 404 page.
3. **Deactivated Check**: If `is_deactivated == true`, return clean 410 Deactivated page.
4. **Scheduled Start Check**: If `start_date` is in the future, return 403 Not Yet Active page.
5. **Expiry Check**: If `expires_at` is in the past, return 302 to `fallback_url` if defined, else return 410 Expired page.
6. **Click Limit Check**: If `max_clicks != null && clicks >= max_clicks`, return 302 to `fallback_url` if defined, else return 410 Limit Reached page.
7. **Password Challenge Check**: If `has_password == true`, check for valid signed unlock cookie. If missing or invalid, serve accessible server-rendered unlock challenge page with strict CSP and no destination exposure.
8. **Bot & HEAD Request Bypass**: If request is HTTP `HEAD` or user agent matches known crawlers (`Twitterbot`, `Slackbot`, `Discordbot`, `TelegramBot`, `WhatsApp`, etc.), return 302 redirect immediately without updating metrics or consuming one-time links.
9. **Atomic SQL Metric Update**:
   - Standard link: `UPDATE short_links SET clicks = clicks + 1, last_opened_at = NOW() WHERE id = :id`
   - Limit-bounded link: `UPDATE short_links SET clicks = clicks + 1, last_opened_at = NOW() WHERE id = :id AND clicks < max_clicks`
   - One-time link: `UPDATE short_links SET clicks = clicks + 1, is_deactivated = TRUE, last_opened_at = NOW() WHERE id = :id AND is_deactivated = FALSE`
   - If affected rows == 0 due to concurrent saturation/consumption, fail safely to 410 Limit Reached.
10. **HTTP 302 Redirect**: Execute 302 redirect with security headers (`Cache-Control: no-store`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`).

---

## 4. Recovery & Migration Specification

1. **Owner Token Architecture**: High-entropy 64-character token with `tok_` prefix returned once upon initial creation. Only its SHA-256 hash is persisted in the database.
2. **Client Link Migration (`POST /api/v1/short-links/migrate`)**: Idempotently imports local links from IndexedDB/localStorage. Preserves existing slugs if available, retains legacy PBKDF2 password hashes, and links them under the active owner token.
3. **Backup & Recovery File (`.json`)**: Exports links and the client's `ownerToken`. On import, restores the owner token to re-authenticate management rights across browsers.

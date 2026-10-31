# URL Shortener — Phase 1 Implementation Progress & Verification

This document tracks the deliverables, completed milestones, verification scripts, and status for **URL Shortener by Acklet (Phase 1: Core Backend, Server-Side Password & Client Integration)**.

Related Documents:
- [features.md](../0-Requirements/features.md) — Feature scope and user journeys
- [requirements.md](../0-Requirements/requirements.md) — Technical requirements and security rules
- [service-design.md](../2-Implementation/service-design.md) — Service architecture
- [faq.md](../3-Reference/faq.md) — Frequently asked questions
- [README.md](../README.md) — Hub index

---

## 1. Deliverables Checklist

| Category | Component / Module | Path | Status |
| :--- | :--- | :--- | :--- |
| **Database Migration** | Flyway V56 `short_links` Table & Indexes | `server/acklet/src/main/resources/db/migration/V56__short_links.sql` | **Verified** |
| **Persistence Layer** | JPA Entity & Atomic Modifying Repository | `server/acklet/src/main/java/.../shortener/entity/ShortLinkEntity.java`<br>`server/acklet/src/main/java/.../shortener/repository/ShortLinkRepository.java` | **Verified** |
| **Config Layer** | Central Config & TTLs under `app.shortener.*` | `server/acklet/src/main/java/.../shortener/config/ShortenerProperties.java`<br>`server/acklet/src/main/resources/application.properties` | **Verified** |
| **Security Helper** | SSRF Guards, Punycode, BCrypt, PBKDF2 Legacy Verify | `server/acklet/src/main/java/.../shortener/util/ShortenerSecurityHelper.java` | **Verified** |
| **HTML Renderer** | Dual-Theme Server-Rendered Unlock & Status Pages | `server/acklet/src/main/java/.../shortener/util/ShortenerHtmlRenderer.java` | **Verified** |
| **DTOs** | Request/Response Data Transfer Objects | `server/acklet/src/main/java/.../shortener/dto/` | **Verified** |
| **ShortLink Service** | Lifecycle, Slugs, Ownership, Migration, Purge | `server/acklet/src/main/java/.../shortener/service/ShortLinkService.java` | **Verified** |
| **Redirect Service** | 10-Step Decision Order, Atomic Counts, Bot Filter | `server/acklet/src/main/java/.../shortener/service/ShortRedirectService.java` | **Verified** |
| **REST Controller** | Owner Management Endpoints (`/api/v1/short-links`) | `server/acklet/src/main/java/.../shortener/controller/ShortLinkController.java` | **Verified** |
| **Redirect Controller** | Public 302 Redirection & Unlock (`/s/{code}`) | `server/acklet/src/main/java/.../shortener/controller/ShortRedirectController.java` | **Verified** |
| **Security Config** | Permit `/s/**` and `/api/v1/short-links/**` | `server/acklet/src/main/java/com/code/acklet/shared/security/SecurityConfig.java` | **Verified** |
| **Dev Proxy** | Forward `/s` and `/api` to port 8080 | `client/proxy.conf.json` | **Verified** |
| **Client Storage** | Owner Token Storage & Sanitized Display Cache | `client/apps/tool-urlshortener/src/services/shortener-storage.service.ts` | **Verified** |
| **Client Service** | REST Integration & Silent Background Migration | `client/apps/tool-urlshortener/src/services/shortener.service.ts` | **Verified** |
| **Client UI Component**| Delegation to Server Redirection & Management | `client/apps/tool-urlshortener/src/components/url-shortener.component.ts` | **Verified** |
| **Backend Tests** | Unit & Redirect Concurrency Tests (21 tests) | `server/acklet/src/test/java/.../shortener/` | **Verified** |
| **Client Tests** | Vitest Specification Tests (12 tests) | `client/apps/tool-urlshortener/src/services/shortener.spec.ts` | **Verified** |

---

## 2. Verification Log

### 2.1 Backend Unit & Concurrency Tests
```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) ./mvnw test -Dtest=ShortenerSecurityHelperTest,ShortLinkServiceTest,ShortRedirectTest -DargLine="-Dnet.bytebuddy.experimental=true"
```
- **Result**: `BUILD SUCCESS` (Tests run: 21, Failures: 0, Errors: 0, Skipped: 0)
- **Key Test Cases Verified**:
  - `ShortRedirectTest`: 9 tests verifying table-driven redirect sequence (404, 410 deactivated, 403 scheduled, 410 expired, fallback URL 302, password challenge, bot/HEAD non-counting, and race-safe atomic one-time link consumption).
  - `ShortenerSecurityHelperTest`: 6 tests verifying SSRF prevention, punycode IDN conversion, credentials rejection, redirect loop blocking, BCrypt hashing, legacy PBKDF2 verification, and HMAC signed unlock tokens.
  - `ShortLinkServiceTest`: 6 tests verifying unique slug generation, custom alias collision rejection, owner token enforcement, update, soft-delete, deactivation, and idempotent client link migration.

### 2.2 Client Vitest Specification Tests
```bash
npx vitest run apps/tool-urlshortener/src/services/shortener.spec.ts
```
- **Result**: `Test Files: 1 passed (1), Tests: 12 passed (12)`
- **Key Client Cases Verified**:
  - Navigation integrity and isolated bronze/amber theme identity.
  - Password and SSRF client-side pre-validation.
  - Token management, CSV RFC 4180 export, recovery export/import.
  - Backend API integration (`POST /api/v1/short-links`, `GET /api/v1/short-links`, `GET /availability`).
  - QR Generator handoff query parameter generation.

### 2.3 Tier A Verification (Static, Architecture & Type Checks)
```bash
node scripts/verify.mjs -A
```
- **Result**: PASSED
- **Output**:
  - Glass Styling Constraints: PASSED
  - Tool Shell & Portal Isolation: PASSED
  - TypeScript Compilation (`tsc -b --noEmit`): PASSED
  - Shared Package Unit Tests (`vitest`): PASSED
  - Backend Java Test Compilation (`mvnw test-compile`): PASSED

### 2.4 Tier B Verification (Feature Build & Context Tests)
```bash
node scripts/verify.mjs -B --app=tool-urlshortener
```
- **Result**: PASSED
- **Output**:
  - Angular Application Build (`tool-urlshortener`): PASSED (15.63s)
  - Backend Security & Crypto Unit Tests: PASSED (4.74s)

### 2.5 UI & Input Caret Enhancements
- **Hover & Action Dropdown Fixes**:
  - Excluded destructive/danger buttons from generic tool-shell button hover overrides in `base.css` and added dual-theme high-contrast red styling for delete confirmation in `url-shortener.component.css`.
  - Added explicit red theme tokens for `.action-menu-item.is-destructive` in `action-dropdown.component.css`.
- **Copy Status & Preview Enhancements**:
  - Fixed `.quick-copy-btn.copied` visibility in both themes.
  - Implemented safe preview page (`renderPreviewPage`) on server-side with `+` suffix handling (`ShortRedirectService` & `ShortenerHtmlRenderer`).
  - Added clickable short link with `target="_blank"` and external launch icon button in original destination columns.
- **Input Caret / Pointer Full-Height Sizing**:
  - Fixed WebKit/Chromium flexbox collapsed caret defect in `.long-url-input` and `.alias-input` by setting `height: 100%`, `align-self: stretch`, `line-height: normal`, and normalized integer font sizing (`14px`/`15px`).
  - Added high-contrast dual-theme `caret-color: var(--accent)` across all URL Shortener input fields (`.long-url-input`, `.alias-input`, `.pw-inner-input`, `.advanced-text-input`, `.toolbar-search-input`, and `.drawer-text-input`).
  - Matched `.alias-prefix` height, baseline alignment, and font-size (`14px`) to seamlessly flow into `#customAliasInput`.
- **"Lost in Space" Animated Fallback & 404 Experience**:
  - Added the user-provided "Lost in Space" animation to `client/public/assets/shortener/lost-in-space-404.gif` and backend static assets at `server/acklet/src/main/resources/static/assets/shortener/lost-in-space-404.gif`.
  - Built an engaging, dual-theme fallback UI in both the client Angular component (`url-shortener.component.html`) and backend status renderer (`ShortenerHtmlRenderer.renderStatusPage`).
  - Integrated state-specific status badges (`404 Not Found`, `410 Expired / Deactivated / Limit Reached`, `403 Scheduled`) and thematic messages ("Lost in Space", "Lost in Time", "Mission Aborted", "Countdown in Progress").
  - Included direct CTAs and quick destination chips to route visitors to related tools: **URL Shortener**, **QR Generator**, **Online Clipboard**, and **Acklet Hub**.

### 2.6 Sensitive Data Protection & Encryption at Rest (Phase 1.5)
- **Field-Level Encryption at Rest**:
  - Implemented `ShortenerCryptoService` using standard JDK JCE `AES/GCM/NoPadding` (256-bit keys, 96-bit random IVs, 128-bit authentication tag, and `v1:` version prefix).
  - Attached `ShortenerEncryptedStringConverter` to `ShortLinkEntity` confidential fields: `targetUrl`, `fallbackUrl`, `label`, `tags`.
  - Updated Flyway migration `V56__short_links.sql` to store ciphertext in `TEXT` columns and added indexed plaintext `target_host VARCHAR(255)` for offline blocklist triage.
- **Display Rules & Client Sanitization**:
  - Masked `targetUrl` to empty string for password-protected links in `ShortenerStorageService.ts` display cache.
  - Added `purgeLegacySensitiveStorage()` on startup to eliminate any unencrypted storage keys.
  - Cleared password variables from component state and DOM inputs immediately after submission.
- **Log, Serialization & Error Hardening**:
  - Excluded sensitive fields from `@ToString` in entities and DTOs.
  - Marked password fields as `@JsonProperty(access = Access.WRITE_ONLY)` on request DTOs.
  - Added strict `Cache-Control: no-cache, no-store, max-age=0, must-revalidate` and `Pragma: no-cache` across all endpoints.
- **Crypto & Data Protection Test Suite**:
  - `ShortenerCryptoServiceTest`: 5 unit tests covering AES-256-GCM round-trip, distinct IV generation, tampering rejection, multi-key rotation, and production key length validation.
  - `ShortenerDataProtectionTest`: 4 integration tests covering transparent JPA conversion, `@ToString` sanitization, BCrypt hash verification & upgrade, and preview secrecy.
  - Client storage sanitization tests added to `shortener.spec.ts` (13 tests passing total).

### 2.7 Part C: Filters Redesign & Advanced Operations (Phase 1.6)
- **Part C Attribute-Based Filters Popover**:
  - Removed Status and Sort dropdowns entirely from the popover (they remain exclusively on the toolbar).
  - Designed pure attribute filter criteria: Activity (`Trending`, `Popular`, `Recent`, `Never`), Expiry (`≤ 7d`, `≤ 30d`, `No expiry`), Protection (`Any`, `Locked`, `Public`), Rules (`One-time`, `Click limit`, `Fallback URL`), Created presets (`Any`, `Today`, `7d`, `30d`), dynamic Tags, Destination Domains, and Needs Review.
  - Active filters bar surfaces removable badge chips with "Clear all" and dynamic "N of M links" counter.
  - Desktop two-column compact popover with `aria-pressed` and mobile bottom sheet.
- **Bulk Operations**:
  - Multi-select row checkboxes with `Select all (N)` and indeterminate state.
  - Floating slide-in action bar supporting Bulk Deactivate, Bulk Reactivate, and Bulk Delete with confirmation modal.
- **Analytics & Abuse Reporting**:
  - Flyway V57 migration adds `short_link_daily_clicks` and `short_link_reports`.
  - Atomic daily click aggregation on 302 redirects.
  - Mini 14-day sparkline trend chart in the Edit Link drawer.
  - Abuse reporting rate-limited to 1 report per client IP per link per day, auto-flagging above configurable threshold.
- **HTTP 410 & 403 Status Display**:
  - HTTP code badges (`410` for Limit reached, Expired, and Deactivated; `403` for Scheduled) displayed alongside status dots in desktop rows and mobile cards.
  - Subtitle updated to plain statement: *"Links created on this device and securely synchronized with Acklet."*

### 2.8 Clean Working Tree Check
```bash
git diff --check
```
- **Result**: PASSED (zero whitespace or formatting errors)

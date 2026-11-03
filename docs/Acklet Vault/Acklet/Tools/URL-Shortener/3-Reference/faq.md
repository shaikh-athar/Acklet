# URL Shortener: Frequently Asked Questions

This document provides answers to common architectural, privacy, security, and product questions regarding URL Shortener by Acklet.

Related Documents:
- [features.md](../0-Requirements/features.md) - Feature overview and scope
- [requirements.md](../0-Requirements/requirements.md) - Technical requirements and security rules
- [service-design.md](../2-Implementation/service-design.md) - Architectural design
- [phase-1-progress.md](../1-Progress/phase-1-progress.md) - Implementation progress
- [README.md](../README.md) - Hub index

---

## 1. Storage & Cross-Device Access

### Q1.1: Where are short links stored?
**On the Acklet server database.** All short links are persisted in a PostgreSQL database managed by the Spring Boot backend (`server/acklet`). Links resolve universally across any browser, device, or incognito session worldwide at `https://<domain>/s/<code>`. The client browser maintains only an anonymous owner token and an optional offline display cache with zero credentials or plaintext passwords.

### Q1.2: Do you store visitor IP addresses or browser fingerprints when someone visits a short link?
**No.** URL Shortener never logs or stores raw visitor IP addresses, browser fingerprints, or personal identifiers. IP addresses are hashed using HMAC-SHA256 with a secret server-side pepper strictly for in-memory rate limiting (brute-force defense) and are discarded immediately. Only aggregated click counts are maintained.

### Q1.3: What is counted on each visit?
Each visit increments an atomic click counter (`clicks = clicks + 1`) and records a `last_opened_at` timestamp. HEAD requests, automated search crawlers, and link-preview bots (such as Slack, Discord, Twitter, or WhatsApp crawlers) are filtered out and **never** increment click counts or consume one-time links.

### Q1.4: How long are links kept (Retention Policy)?
Expired links, links that have reached their click limit, and owner-deleted links are retained for 90 days after the event before being permanently purged by the server's hourly cleanup job. During this 90-day period, deleted short codes remain reserved to prevent URL hijacking. Manually deactivated links are retained indefinitely so creators can reactivate them at any time.

---

## 2. Password Protection

### Q2.1: How are passwords secured?
Protected links are hashed on the server using industry-standard password hashing (BCrypt with per-link salt). Plaintext destination URLs are **never** stored on the client or returned in public endpoints before a successful password unlock.

Migrated legacy links using client-side PBKDF2-SHA256 hashes (100,000 iterations, 16-byte salt) are supported and automatically upgraded to modern BCrypt upon the first successful server-side unlock.

### Q2.2: Can destination URLs be seen without entering the password?
**No.** The server enforces password validation before disclosing the destination. When a user requests a protected short link `/s/<code>`, the server serves a lightweight, server-rendered accessible challenge page. The destination URL is never sent over the network or embedded in the HTML. Once unlocked, the server issues a signed, `HttpOnly`, `SameSite=Lax`, short-lived session cookie scoped strictly to that code and immediately performs an HTTP 302 redirect.

### Q2.3: What happens after failed password attempts?
Password unlock attempts are rate-limited per code and per client (5 failed attempts per 15-minute window). Exceeding this threshold triggers a 15-minute lockout. Error messages are generic and do not reveal internal system details.

---

## 3. Ownership & Recovery File Secret

### Q3.1: Do I need an account to manage or edit my shortened links?
**No.** All links created in your browser are managed via a high-entropy server-issued anonymous management token (`X-Owner-Token`, prefixed with `tok_`). The server stores only a SHA-256 hash of this token. Presenting the raw token allows you to edit, deactivate, or delete your links from "My links" without an account.

### Q3.2: Why is the Recovery File treated as a secret?
The exported JSON recovery file contains your browser's raw `ownerToken`. Anyone with access to this file can import it into another browser and edit, deactivate, or delete your short links. Keep this file private and store it securely.

### Q3.3: How do one-time links work?
One-time links allow exactly one successful redirect. The server enforces this atomically using a single PostgreSQL update (`UPDATE short_links SET clicks = clicks + 1, is_deactivated = true WHERE id = :id AND is_deactivated = false AND clicks = 0`). Subsequent requests receive a `410 Limit Reached` response. If a fallback URL is configured, visitors are redirected to the fallback URL instead.

---

## 4. Abuse Protection & Safe Browsing

### Q4.1: How does Safe Browsing work when enabled?
When an optional Google Safe Browsing API key is configured on the server, target URLs are evaluated against Google's threat lists. Safe Browsing checks operate asynchronously with fail-open resiliency to ensure instant link creation. Detected malicious links are automatically flagged and deactivated.

### Q4.2: How does link preview work?
Appending a plus sign (`+`) to any short link (e.g. `/s/abc123+`) displays the safe preview card showing domain and safety metadata without automatically executing the redirect. For password-protected links, preview details remain concealed until the correct password is provided.

---

## 5. Sensitive Data Protection & Privacy

### Q5.1: How are URLs, notes, and tags encrypted at rest?
Confidential fields (destination URL, fallback URL, label, and tags) are encrypted with application-level AES-256-GCM using standard Java Cryptography Architecture (JCA/JCE). Each value is encrypted with a unique 96-bit random IV and verified with a 128-bit authentication tag before being saved to PostgreSQL.

### Q5.2: Can database administrators read target URLs?
Database administrators viewing raw SQL rows see only AES-256-GCM ciphertext prefixed with key versions (e.g., `v1:...`). The master decryption keys reside strictly in server environment variables / secrets managers, not in the database. The only plaintext domain metadata stored is `target_host` (e.g., `example.com`), which is kept strictly for offline blocklist filtering and abuse triage.

### Q5.3: Are passwords ever recoverable?
No. Passwords are never encrypted reversibly; they are hashed one-way using salted BCrypt. The server cannot decrypt or recover a forgotten link password. If a creator forgets their link password, they must update it via their authenticated owner management session.

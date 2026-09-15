# AirVault Feature 1 — Authentication, Device Identity & QR Session Management

## 1. Executive Summary & Objective

**Feature 1 (Authentication, Device Identity & Session Management)** provides secure device authentication, auto-generated guest identities, customized permanent identities, hashed PIN verification, Redis-backed rate limiting, short-lived QR pairing tokens, and device session tracking for **AirVault by Acklet**.

All authentication is hardened against brute-force attacks via Redis rate limiters, while preserving zero-friction instant developer onboarding.

---

## 2. Authentication Lifecycle & Architecture

```text
[ First-Time Access ]
        │
        ▼
[ Auto-Generate Guest Identity ]
  ├─► Username: {adjective}-{noun}-{4digits} (e.g. "falcon-core-8291", DB uniqueness checked with retry)
  ├─► Random 4-digit PIN (reject weak: 0000, 1234, repeating digits)
  └─► Store PIN hashed via BCrypt (never plaintext)
        │
        ▼
[ Optional: Customize Identity ]
  ├─► User updates username & 4-digit PIN
  ├─► Customized username permanently reserved (never reissued to guests)
  └─► Invalidate all previous sessions on PIN change
```

---

## 3. Core Capabilities & Security Invariants

### 3.1 4-Tier Identity & Connection Architecture
- **`accountId` / `@username` (User Identity)**: Unique account identifier and human-readable handle. Multiple browser instances or devices may log into the same user identity.
- **`installationId` (`dev-xxxxx`) (Device Identity)**: Persistent hardware/browser installation identity stored in `localStorage`. Chrome Normal, Chrome Incognito, and Safari on the same machine maintain distinct `installationId` values.
- **`sessionId` (Transport/Connection Identity)**: Ephemeral live-wire transport handle stored in Redis (`airvault:session:{deviceId}`) for active WebRTC signaling and presence.
- **`pairingId` (`airvault_device_pairings`) (Relationship Identity)**: Authoritative, persistent device-to-device relationship entity in PostgreSQL tracking mutual trust grants, sync permissions, and lifecycle states (`ACTIVE`, `PAIRED`, `REVOKED`).

### 3.2 Globally Unique Username Architecture & Normalization
- **Authoritative Uniqueness**: Username uniqueness is strictly enforced at the database level on `airvault_identities` (`UNIQUE (lower(trim(username)))`) for active identities.
- **Normalization Standard**: All usernames are trimmed and lowercased before comparison and storage (e.g. `@Mac`, `@mac`, and `@MAC` represent the exact same identity).
- **Stable Identity vs. Human-Readable Username**:
  - `identity_id` (UUID) serves as the immutable cryptographic primary key for ownership, authorizations, and paired-device relationships.
  - `username` serves as the unique human-readable handle. Changing a username updates user-facing metadata without altering device IDs, pairings, or resource ownership.
- **Guest Username Collision Handling**: Guests receive clean, human-readable usernames (`{adjective}-{noun}` or `guest-N`) checked case-insensitively with automatic suffix iteration on collision.
- **Atomic Concurrency Protection**: Race conditions on simultaneous registration of identical usernames trigger database-level uniqueness constraints and cleanly return `"Username is already taken"`.
- **Existing Duplicate Migration**: Legacy duplicates are resolved by ranking chronological order and assigning clean `_2`, `_3` suffixes before activating the database unique constraint.
- **Live Paired Device Sync**: Username updates automatically broadcast a `USERNAME_UPDATED` signaling packet, updating the displayed `@username` across all paired devices without re-pairing.

### 3.3 Hashed PIN Storage & Validation
- **Weak Pattern Rejection**: Rejects trivial sequences (`0000`, `1111`, `1234`, `4321`, `9999`).
- **Cryptographic Hashing**: Stored exclusively using BCrypt / Argon2 with adaptive cost factor. Plaintext PINs are never persisted in PostgreSQL or Redis.

### 3.4 Redis-Backed Rate Limiting & Lockout
- **Per-Username Limit**: Max **5 failed PIN attempts per username per 15 minutes**.
- **Per-IP Limit**: Max **20 failed attempts per IP address per hour** across all usernames.
- **Lockout Mechanism**: Exponential backoff on repeated lockouts, recorded in Redis key `airvault:auth:attempts:{username}` and `airvault:auth:ip:{ip}`.

### 3.5 Device Session Management & Tokens
- **Device-Bound Tokens**: Issues JWT / opaque session tokens stored in Redis (`airvault:session:{deviceId}`).
- **Session Revocation**: Changing a PIN or revoking a device immediately deletes active session tokens from Redis, terminating unauthorized access.

### 3.6 QR-Based Login & Short-Lived Pairing Tokens
- **Token Format**: Generates a high-entropy, short-lived (60–120s) single-use pairing token encoded in the QR code.
- **Handshake Flow**:
  1. Authenticated device generates QR containing `pairingToken`.
  2. New device scans QR and sends confirmation request with its public key.
  3. Authenticated device approves pairing, and backend issues session token to new device.
  4. Pairing token is instantly invalidated upon first use or expiry.

### 3.7 Guest Clipboard Expiry & Reclamation
- **Guest Inactivity TTL**: Unclaimed guest clipboards expire after 30 days of inactivity.
- **Cleanup Schedule**: Spring scheduled background worker cleans up expired guest accounts and flushes associated chunks/sessions.

### 3.8 Database-Backed Pairing Reconciliation (`airvault_device_pairings`)
- **Authoritative Pairing Table**: Devices synchronize active relationships from `airvault_device_pairings` via `GET /api/v1/airvault/auth/reconcile?clientDeviceId=...`.
- **Bidirectional Persistence**: Authenticating via PIN writes reciprocal pairing rows (`ACTIVE`) in a single database transaction.
- **Targeted Lifecycle Events**: Disconnection or revocation marks pairing rows as `REVOKED` and dispatches direct, targeted lifecycle signals without broadcast flooding.

---

## 4. Backend Implementation Reference

- **Auth Controller**: [`AirVaultAuthController.java`](file:///Users/ayaz/Acklet/server/acklet/src/main/java/com/code/acklet/airvault/controller/AirVaultAuthController.java)
- **Auth Service**: [`AirVaultAuthService.java`](file:///Users/ayaz/Acklet/server/acklet/src/main/java/com/code/acklet/airvault/service/AirVaultAuthService.java)
- **Device Controller**: [`AirVaultDeviceController.java`](file:///Users/ayaz/Acklet/server/acklet/src/main/java/com/code/acklet/airvault/controller/AirVaultDeviceController.java)
- **Device Service**: [`AirVaultDeviceService.java`](file:///Users/ayaz/Acklet/server/acklet/src/main/java/com/code/acklet/airvault/service/AirVaultDeviceService.java)
- **Redis Tracker**: [`AirVaultRedisTracker.java`](file:///Users/ayaz/Acklet/server/acklet/src/main/java/com/code/acklet/airvault/service/AirVaultRedisTracker.java)
- **Entities**: [`AirVaultIdentity.java`](file:///Users/ayaz/Acklet/server/acklet/src/main/java/com/code/acklet/airvault/entity/AirVaultIdentity.java), [`AirVaultDevice.java`](file:///Users/ayaz/Acklet/server/acklet/src/main/java/com/code/acklet/airvault/entity/AirVaultDevice.java)

---

## 5. Related Documentation

- [feature-2-3-device-management.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature-2-3-device-management.md) — Multi-device pairing and session management.
- [feature-12-backend-architecture.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature-12-backend-architecture.md) — Backend architecture, Redis caching & RabbitMQ pipelines.
- [feature.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/airvault/feature.md) — Master feature audit matrix.

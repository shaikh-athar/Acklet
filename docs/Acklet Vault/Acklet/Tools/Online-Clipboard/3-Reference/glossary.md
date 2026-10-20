---
tool: Online Clipboard
phase: 1
last-updated: 2026-10-20
status: Complete
---

# Online Clipboard — Glossary & Terminology

This glossary defines technical terms, abbreviations, and architectural concepts specific to the **Online Clipboard** tool.

---

## Technical Definitions

### 1. Share Code
An ephemeral 5-digit alphanumeric identifier generated from unambiguous base-32 characters (`23456789abcdefghjkmnpqrstuvwxyz`, excluding confusing characters like `0`, `o`, `1`, `l`, `i`). Used to pair devices to a shared clipboard room.

### 2. Word Code / Custom Alias
A human-readable custom slug (e.g. `team-sync` or `release-notes`) assigned to a clipboard room via the inline rename workflow, validated in real time against active room slugs.

### 3. Owner Token (`X-Owner-Token`)
A cryptographically random client token (`tok_...`) generated when a room is created, stored in the creator's `localStorage`, and passed via the `X-Owner-Token` HTTP header to authorize administrative operations (such as room renaming or deleting items).

### 4. Content-Addressable Storage (CAS)
A backend storage architecture where uploaded files are saved under `~/.acklet/clipboard_storage/blobs/` keyed strictly by their SHA-256 hash and size. If multiple rooms or users upload the identical 100 MB binary asset, only one physical copy is stored on disk, eliminating redundant storage consumption.

### 5. Resumable Chunked Upload Protocol
A streaming upload mechanism that automatically partitions files > 5 MB into 5 MB chunks (`5,242,880` bytes). Chunks are transmitted with tracking headers, allowing transfers interrupted at any point (e.g. 50%) to resume immediately without re-transmitting already-verified parts.

### 6. End-to-End Encryption (E2EE)
A client-side zero-knowledge security mode using the Web Cryptography API (`AES-GCM-256`). Payloads are encrypted in the browser prior to transmission; keys are never transmitted to the server.

### 7. PBKDF2 (Password-Based Key Derivation Function 2)
A key-stretching cryptographic algorithm utilized by `ClipboardCrypto` with `10,000` iterations, SHA-256 hashing, and a static application salt to deterministically derive AES-GCM-256 encryption keys from room codes.

### 8. Initialization Vector (IV)
A cryptographically secure 12-byte random binary nonce (`window.crypto.getRandomValues(new Uint8Array(12))`) generated per payload in AES-GCM to guarantee that identical plaintext produces unique ciphertext blocks.

### 9. Server-Sent Events (SSE)
A lightweight HTTP/2 streaming protocol over `GET /api/v1/clipboard/shares/{code}/events` where the server pushes real-time event frames (`ITEM_ADDED`, `ITEM_DELETED`, `SHARE_REVOKED`) to connected browsers with automatic reconnection.

### 10. Optimistic Concurrency Control
A concurrency protocol where each share tracks an integer `version`. Saves must submit `expectedVersion`. If the version on the server has advanced due to a remote save, the server rejects with HTTP 409 Conflict, triggering the user-guided Conflict Resolution Banner.

### 11. Dirty State (`isDirty`)
A boolean signal indicating that text in the active editor canvas has been modified since the last confirmed server save.

### 12. Retention TTL
The automatic lifespan of a clipboard room (default: 7 days / 168 hours; optional: 15 days or 30 days), after which a scheduled backend cron permanently deletes the room, database records, and unreferenced CAS blobs.

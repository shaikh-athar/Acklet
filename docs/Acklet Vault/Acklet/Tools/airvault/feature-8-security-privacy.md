# Feature 8 — Security and Privacy Controls Specification

## 1. Executive Summary & Objective

**Feature 8 (Security and Privacy Controls)** implements 100% in-browser, zero-knowledge cryptographic safeguards:
- Non-extractable Web Crypto ECDH (NIST P-256) session key agreement.
- AES-GCM-256 payload encryption with distinct 96-bit (12-byte) IVs per transfer.
- Automated secret and credential heuristic masking (`●●●●`) with click-to-reveal controls.
- Active Zero-Knowledge telemetry inspection modal.

---

## 2. Cryptographic Architecture & Flow

```text
  [ Plaintext Clipboard Payload ]
                 │
                 ▼
  [ Sensitive Data Scanner ] ──► (Masks API keys, JWTs, Passwords, Private Keys)
                 │
                 ▼
  [ Web Crypto API: SubtleCrypto ]
  (1) Generate 96-bit random IV: crypto.getRandomValues(new Uint8Array(12))
  (2) Encrypt: AES-GCM-256(SessionKey, IV, Plaintext)
  (3) Compute Integrity Hash: SHA-256(Plaintext)
                 │
                 ▼
  [ Encrypted Packet: { iv, ciphertext, contentHash, packetId } ]
                 │
                 ▼
  [ P2P DataChannel / BroadcastChannel Transport ]
                 │
                 ▼
  [ Target Device: SubtleCrypto Decrypt ]
```

---

## 3. Cryptographic Parameters

| Parameter | Specification | Purpose |
| :--- | :--- | :--- |
| **Key Agreement** | `ECDH` (NIST Curve `P-256`) | Derives symmetric session secrets between paired devices. |
| **Symmetric Cipher** | `AES-GCM-256` | Authenticated encryption preventing tampering or eavesdropping. |
| **IV (Initialization Vector)** | 96-bit (12-byte) random | Cryptographically unique per beamed packet. |
| **Integrity Digest** | `SHA-256` (Truncated 16 hex chars) | Verifies payload consistency upon decryption. |
| **Key Extraction Policy** | `extractable: false` | Private keys cannot be exfiltrated via JavaScript introspection. |

---

## 4. UI Controls & Verification

- **Privacy Indicator**: Ambient Header Button `🔒 E2EE Protected` with real-time green shield status.
- **Zero-Knowledge Modal**: [`AirVaultPrivacyModalComponent`](file:///Users/ayaz/Acklet/client/src/tools/airvault/components/airvault-privacy-modal.component.ts) with active session thumbprint display and cipher telemetry.
- **Card-Level Shield**: Masks credentials in stream cards with 1-click toggle (`👁️`).

---

## 5. P2P Data Isolation & Anti-Transitive Leakage Security Rule

To maintain absolute data sovereignty and prevent unauthorized visibility:
1. **4-Tier Security & Identity Decoupling**:
   - `accountId` / `@username`: Human identity boundary. User credentials never authenticate unauthorized device hardware without explicit pairing.
   - `installationId` (`dev-xxxxx`): Cryptographic device boundary. Private ECDH keys and vault tokens are bound to the specific browser installation in `localStorage`.
   - `sessionId`: Ephemeral transport session boundary. Active WebRTC signaling channels and Redis presence records expire on disconnect.
   - `pairingId`: Mutual authorization grant stored in `airvault_device_pairings`. Revoking a pairing removes cryptographic exchange permissions immediately.
2. **Direct P2P Authorization Gate**:
   - Only devices that have completed mutual PIN pairing handshakes and are marked active with sync enabled are authorized to exchange data.
   - All non-handshake messages (`LIVE_CLIPBOARD_SYNC`, `CLIPBOARD_BEAM`, `INITIAL_SYNC_BATCH`, `ITEM_DELETE`, etc.) from un-paired, disconnected, or revoked devices are rejected and dropped at the network and local transport layer.
3. **Zero Transitive Propagation (Anti-Hierarchy Leakage)**:
   - If Device B is paired with Device A and Device C, Device B never relays Device A's data to Device C.
   - Synchronization routines strictly filter `localOriginItems` (`originDeviceId === cur.id || senderDeviceId === cur.id`), ensuring only locally-authored resources are transmitted to directly paired peers.
4. **Live Clipboard Isolation**:
   - Real-time keystrokes and staging editor updates are targeted directly to paired peer devices (`targetDeviceId`), preventing open broadcast interception.
   - Receiving staging editors verify sender authorization before reflecting any remote text changes.
5. **Account-Scoped Persistent Disconnect**:
   - Manual disconnect flags are stored per account (`acklet_airvault_disconnected_peer_ids_<username>`), ensuring that switching user accounts on a shared device never causes cross-account state leakage or unexpected auto-reconnections.

# Feature 6 — Current Clipboard Experience Specification

## 1. Executive Summary & Objective

**Feature 6 (Current Clipboard Experience)** provides an ambient, authoritative visualization of the user's active synchronized clipboard state at any given moment, communicating:
- What was most recently copied and beamed across the device constellation.
- The real-time synchronization lifecycle stage (`Captured` -> `E2EE Secured` -> `Beamed` -> `Ready across devices`).
- Originating source device metadata and sensitive credential status.

---

## 2. Active Clipboard Hero Anchor Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  🟢 CURRENT SYNCHRONIZED CLIPBOARD                    From iPhone 16 Pro    │
├─────────────────────────────────────────────────────────────────────────────┤
│  const e2eeSession = await airVaultCrypto.deriveKey(peerPublicKey);         │
├─────────────────────────────────────────────────────────────────────────────┤
│  ✓ 1. Captured ─── ✓ 2. E2EE Secured ─── ✓ 3. Beamed ─── ✓ 4. Ready across   │
│                                                            devices          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Verified State Transitions

| Lifecycle Stage | Underlying Verification | UI Indicator |
| :--- | :--- | :--- |
| **1. Captured** | Ingestion via paste (`⌘V`), auto-capture, or file drop. | `✓ 1. Captured` (Green check) |
| **2. E2EE Secured** | Web Crypto API generates unique 96-bit IV and encrypts via AES-GCM-256 session key. | `✓ 2. E2EE Secured` (Shield icon) |
| **3. Beamed** | Dispatched via `BroadcastChannel` and WebRTC DataChannel packet. | `✓ 3. Beamed` (Zap icon) |
| **4. Ready across devices** | Confirmed receipt via `SYNC_ACK` acknowledgement from recipient peer devices. | `✓ 4. Ready across devices` (`✓✓`) |

---

## 4. Frontend Component Reference

- **Component**: [`AirVaultStreamComponent`](file:///Users/ayaz/Acklet/client/src/tools/airvault/components/airvault-stream.component.ts)
- **Computed Signal**: `latestItem = computed(() => this.items()[0])`
- **Styles**: `.active-clipboard-hero`, `.lifecycle-tracker-bar`, `.stage-step.completed`

---

## 5. Universal Vault Deduplication & Auto-Expiry Refresh

When an item (image, file, video, code, json, url, or plain text) is pasted, staged, or uploaded:
1. **Uniqueness Guard**: AirVault scans existing items in [`AirVaultStorageService`](file:///Users/ayaz/Acklet/client/src/tools/airvault/services/airvault-storage.service.ts) via `findDuplicateItem()` matching content hash, byte size, raw payload, or preview URL.
2. **No Duplicate Tiles**: Only a single unique card exists in the stream/vault.
3. **Expiration Timer Reset**: Re-uploading or re-pasting an existing resource resets its `timestamp` to `Date.now()`, restarting the 7-day expiration countdown back to full duration.
4. **User Feedback**: An ambient toast informs the user: `ℹ️ Item already exists in your vault · Expiration timer refreshed (7d)`.

---

## 6. Vault Tile Conversion Threshold Rule

AirVault enforces a strict separation between live staging editor text and persistent Vault Tiles (`app-airvault-card` / `vault-blocks-rail`):

1. **Below-Threshold Messages**:
   - Text, code, URLs, or JSON messages below 1,500 words (`< 1,500 words`) remain in the **Live Staging Editor** (`payloadText` / `updateLiveTextFromRemote`) and are synchronized directly without creating standalone tiles in the right rail.
2. **Eligible Vault Tiles**:
   - An item is converted into a standalone Vault Tile in the right-side rail ONLY if:
     - It is a media or binary file upload (`image`, `video`, `audio`, `pdf`, `archive`, `spreadsheet`, `font`, `file`), OR
     - It is a multi-file batch upload parent (`isBatchParent === true`), OR
     - It is explicitly pinned (`isPinned === true`), OR
     - Its raw content meets or exceeds the word threshold (`>= 1,500 words`).

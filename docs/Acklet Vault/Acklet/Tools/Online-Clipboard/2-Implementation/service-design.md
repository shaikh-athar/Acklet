---
tool: Online Clipboard
phase: 1
last-updated: 2026-10-20
status: Complete
---

# Online Clipboard — Service Architecture & Service Design

## 1. Services Inventory & Roles

| Service | File Path | Scope | Purpose |
| :--- | :--- | :--- | :--- |
| **`ClipboardApiService`** | `src/services/clipboard-api.service.ts` | Root | REST client for shares, text saves, revisions, direct uploads, chunked streaming sessions, and offline fallback store. |
| **`ClipboardSyncService`** | `src/services/clipboard-sync.service.ts` | Root | Real-time multi-tier transport orchestrator (`BroadcastChannel` + Server-Sent Events). |
| **`ClipboardCrypto`** | `src/services/clipboard-crypto.ts` | Static Utility | Web Cryptography API wrapper: AES-GCM-256 payload encryption and PBKDF2 deterministic key derivation. |
| **`ZipBuilder`** | `src/services/zip-builder.ts` | Static Utility | In-browser folder to `.zip` binary packaging using `CompressionStream('deflate-raw')`. |
| **`ClipboardHistoryService`** | `src/services/clipboard-history.service.ts`| Root | Local device session persistence under `localStorage['acklet_clipboard_history_v1']`. |
| **`QrLoaderService`** | `src/services/qr-loader.service.ts` | Root | Dynamic client-side QR generation for camera-based room pairing. |

---

## 2. Key Method Signatures

### 2.1 `ClipboardApiService`
```typescript
getConfig(): Observable<ClipboardConfigDto>;

createShare(options?: CreateShareOptions): Observable<ClipboardShare>;

getShare(code: string, pin?: string): Observable<ClipboardShare>;

renameShare(currentCode: string, newCode: string, ownerToken?: string): Observable<ClipboardShare>;

checkCodeAvailability(code: string): Observable<boolean>;

addTextItem(
  code: string,
  text: string,
  ownerToken?: string,
  isEncrypted?: boolean,
  expectedVersion?: number
): Observable<ClipboardItem>;

saveTextOnSuddenExit(
  code: string,
  text: string,
  ownerToken?: string,
  isEncrypted?: boolean,
  expectedVersion?: number
): void;

getTextRevisions(code: string): Observable<ClipboardTextRevision[]>;

restoreTextRevision(code: string, revisionId: string, ownerToken?: string): Observable<ClipboardItem>;

uploadFileDirect(
  code: string,
  file: File,
  isImage: boolean,
  ownerToken?: string,
  isEncrypted?: boolean
): Observable<ClipboardItem>;

initChunkedUpload(
  code: string,
  fileName: string,
  totalSize: number,
  chunkSize: number,
  totalChunks: number,
  isImage: boolean,
  isEncrypted?: boolean,
  ownerToken?: string,
  fileHash?: string
): Observable<UploadSessionResponse>;

uploadChunk(
  code: string,
  uploadId: string,
  chunkNumber: number,
  chunkBlob: Blob
): Observable<UploadChunkResponse>;

deleteItem(code: string, itemId: string, ownerToken?: string): Observable<boolean>;
```

### 2.2 `ClipboardSyncService`
```typescript
get events(): Observable<ClipboardSyncEvent>;

connect(shareCode: string): void;

notifyLocalChange(event: ClipboardSyncEvent): void;

disconnect(): void;
```

### 2.3 `ClipboardCrypto`
```typescript
static deriveKeyFromCode(code: string): Promise<string>;

static generateKey(): Promise<string>;

static encryptText(plainText: string, keyBase64: string): Promise<string>;

static decryptText(cipherTextJson: string, keyBase64: string): Promise<string>;
```

### 2.4 `ZipBuilder`
```typescript
static createZipBlob(entries: ZipFileEntry[]): Promise<Blob>;

static crc32(data: Uint8Array): number;
```

---

## 3. Storage Hierarchy & State Distribution

```text
┌────────────────────────────────────────────────────────────────────────┐
│                              CLIENT RUNTIME                            │
├───────────────────────┬────────────────────────────────────────────────┤
│ IN-MEMORY SIGNALS     │ • activeTab ('text' | 'files')                 │
│ (Component Scope)     │ • activeShare (full share metadata)            │
│                       │ • sharedText (active editor string)            │
│                       │ • uploadingFiles (progress cards array)        │
│                       │ • selectedItemIds (Set<string>)                │
├───────────────────────┼────────────────────────────────────────────────┤
│ LOCAL STORAGE         │ • 'acklet_clipboard_active_code' (active code) │
│ (Device Persisted)    │ • 'acklet_clipboard_history_v1' (recent list)  │
│                       │ • 'acklet_clipboard_draft_{code}' (unsaved)   │
├───────────────────────┴────────────────────────────────────────────────┤
│                              SERVER RUNTIME                            │
├───────────────────────┬────────────────────────────────────────────────┤
│ POSTGRESQL DATABASE   │ • Shares (code, word_code, owner_token, ttl)   │
│ (Metadata & State)    │ • Items (id, share_code, type, size, hash)     │
│                       │ • Text Revisions (version#, line/char count)   │
│                       │ • Upload Sessions (verified chunk indices)     │
├───────────────────────┼────────────────────────────────────────────────┤
│ CONTENT-ADDRESSABLE   │ • Raw blobs stored under                       │
│ STORAGE (CAS DISK)    │   ~/.acklet/clipboard_storage/blobs/{hash}     │
│                       │ • Deduplicated across all rooms                │
└───────────────────────┴────────────────────────────────────────────────┘
```

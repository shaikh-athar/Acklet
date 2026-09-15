import { Injectable, signal, computed, inject } from '@angular/core';
import { ClassifiedContent, CLIPBOARD_STORAGE_CAP_BYTES, LineBlameEntry, COLLAPSE_WORD_THRESHOLD } from './airvault-clipboard.service';
export type { LineBlameEntry };
import { getAirVaultApiUrl } from './airvault-api.util';
import { AirVaultDeviceService } from './airvault-device.service';
import { AirVaultResourceCacheService } from './airvault-resource-cache.service';
import { AirVaultLogger } from './airvault-sync-debug.service';

export type DeliveryStatus = 'pending' | 'delivered' | 'failed' | 'queued_offline';
export type ProcessingState = 'queued' | 'processing' | 'done' | 'failed';
export type DeletionScope = 'global' | 'local' | 'retention_expired';

export interface AirVaultItem {
  id: string;
  packetId?: string;
  sequenceNumber?: number;
  originDeviceId?: string;
  originOwnerId?: string;
  senderDeviceId: string;
  senderDeviceName: string;
  senderDeviceAccent?: string;
  senderDeviceType?: string;
  targetDeviceId?: string;
  content: ClassifiedContent;
  timestamp: number;
  isPinned: boolean;
  isRevealed?: boolean;
  deliveryStatus?: DeliveryStatus;
  processingState?: ProcessingState;
  progressPercent?: number;
  errorMessage?: string;
  tag?: string;
  isLifetimeRetention?: boolean;
  retentionTtlMs?: number;
  isDeletedLocally?: boolean;
  // Restorable History fields
  isDeletedFromActive?: boolean;
  deletedAt?: number;
  restorationExpiresAt?: number; // DeletedAt + 30 days
  deletedByDeviceId?: string;
  deletedByDeviceName?: string;
  authorColor?: string;
  author_color?: string;
  // Multi-File Batch fields
  batchId?: string;
  isBatchParent?: boolean;
  batchFiles?: AirVaultItem[];
  batchTotalCount?: number;
  batchCompletedCount?: number;
  batchFailedCount?: number;
  batchTotalBytes?: number;
  // Semantic Deduplication fields
  dedupKey?: string;
  copyCount?: number;
  lastCopiedAt?: number;
  // Burn-After-Read fields
  burnAfterRead?: boolean;
  isBurned?: boolean;
}

export interface AirVaultAuditEntry {
  id: string;
  action: 'created' | 'deleted' | 'restored' | 'pinned' | 'unpinned';
  itemId: string;
  itemCategory: string;
  itemSnippet: string;
  itemSize?: number;
  deviceId: string;
  deviceName: string;
  deviceAccent?: string;
  deviceType?: string;
  ownerId?: string;
  ownerName?: string;
  deletionScope?: DeletionScope;
  deletionReason?: string;
  restorationExpiresAt?: number;
  timestamp: number;
}

export const MAX_ITEMS_CAPACITY = 500;
const DB_NAME = 'acklet_airvault_db';
const DB_VERSION = 3; // v3: added vault_drafts store
const STORE_NAME = 'vault_items';
const PAYLOAD_STORE_NAME = 'vault_payloads';
const TOMBSTONE_STORE_NAME = 'vault_tombstones';
const AUDIT_STORE_NAME = 'vault_audit_log';
const DRAFT_STORE_NAME = 'vault_drafts';
export const LARGE_RESOURCE_RETENTION_THRESHOLD_BYTES = 5 * 1024 * 1024; // 5 MB
export const RESTORABLE_HISTORY_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 Days

@Injectable({
  providedIn: 'root'
})
export class AirVaultStorageService {
  private db: IDBDatabase | null = null;
  private deviceService = inject(AirVaultDeviceService);
  public resourceCache = inject(AirVaultResourceCacheService);

  // Set of globally deleted item IDs (tombstones) so old sync packets or reconnects cannot resurrect them
  tombstones = signal<Set<string>>(this.loadTombstones());

  // Master store contains all items (both active and restorable history)
  allItems = signal<AirVaultItem[]>([]);
  auditLogs = signal<AirVaultAuditEntry[]>([]);

  /**
   * Evaluates whether an item qualifies to be displayed as a standalone tile/card in the Vault stream/rail.
   * - Pinned items are always eligible.
   * - Multi-file batch parents are always eligible.
   * - Binary and media categories (images, videos, audio, pdfs, archives, files) are always eligible.
   * - Text, code, json, url are eligible as long as they contain content.
   */
  isEligibleVaultTile(item: AirVaultItem): boolean {
    if (!item || !item.content) return false;
    // 1. Pinned items are always kept as tiles
    if (item.isPinned) return true;

    // 2. Multi-file batch parents or explicit files are always tiles
    if (item.isBatchParent || (item.batchFiles && item.batchFiles.length > 0)) return true;

    // 3. Binary and media categories or explicit files are always tiles
    const nonTextCategories = ['image', 'video', 'audio', 'pdf', 'spreadsheet', 'archive', 'font', 'file'];
    if (item.content.category && nonTextCategories.includes(item.content.category)) {
      return true;
    }
    if (item.content.filename && item.content.category !== 'text') {
      return true;
    }

    // 4. Text, code, json, url: eligible as long as there is non-empty content
    const raw = item.content.raw || '';
    return raw.trim().length > 0;
  }

  // Active Clipboard Items (not deleted from active clipboard, and not batch child items, filtered for paired device isolation and tile eligibility)
  items = computed(() => {
    const cur = this.deviceService.currentDevice();
    const paired = this.deviceService.pairedDevices();

    const isAuthorizedItem = (item: AirVaultItem): boolean => {
      const isLocal = !item.originDeviceId || item.originDeviceId === cur.id || item.senderDeviceId === cur.id;
      if (isLocal) return true;
      const origin = (item.originOwnerId || item.senderDeviceName || '').toLowerCase().replace(/^@/, '').trim();
      const senderId = (item.senderDeviceId || '').toLowerCase().trim();
      const originDevId = (item.originDeviceId || '').toLowerCase().trim();
      return paired.some(p => {
        if (p.status === 'revoked' || p.syncEnabled === false) return false;
        const pUser = (p.username || '').toLowerCase().replace(/^@/, '').trim();
        const pName = (p.name || '').toLowerCase().replace(/^@/, '').trim();
        const pId = (p.id || '').toLowerCase().trim();
        return (
          (pId && (senderId === pId || originDevId === pId)) ||
          (pUser && (origin === pUser || senderId.includes(pUser) || originDevId.includes(pUser))) ||
          (pName && (origin === pName || senderId.includes(pName) || originDevId.includes(pName))) ||
          (origin && origin.includes(pUser || pName || pId))
        );
      });
    };

    return this.allItems().filter(i => !i.isDeletedFromActive && (!i.batchId || i.isBatchParent) && isAuthorizedItem(i) && this.isEligibleVaultTile(i));
  });

  /** Returns true if an item ID is contained inside any parent batch's files */
  isItemInBatch(id: string): boolean {
    return this.allItems().some(i => i.isBatchParent && i.batchFiles && i.batchFiles.some(bf => bf.id === id));
  }

  // Restorable History Items (in 30-day restoration window with full binary/content preserved)
  // Requirement 5: Burn-after-read items are permanently destroyed and excluded from 30-day Restorable History
  restorableHistoryItems = computed(() => {
    const now = Date.now();
    return this.allItems().filter(i => 
      i.isDeletedFromActive === true && 
      !i.burnAfterRead &&
      !i.isBurned &&
      (!i.restorationExpiresAt || i.restorationExpiresAt > now)
    ).sort((a, b) => (b.deletedAt || b.timestamp) - (a.deletedAt || a.timestamp));
  });

  pinnedItems = computed(() => this.items().filter(i => i.isPinned));
  recentItems = computed(() => this.items().filter(i => !i.isPinned));

  todayItems = computed(() => {
    const todayMidnight = new Date().setHours(0, 0, 0, 0);
    return this.items().filter(i => !i.isPinned && i.timestamp >= todayMidnight);
  });

  yesterdayItems = computed(() => {
    const todayMidnight = new Date().setHours(0, 0, 0, 0);
    const yesterdayMidnight = todayMidnight - 86400000;
    return this.items().filter(i => !i.isPinned && i.timestamp >= yesterdayMidnight && i.timestamp < todayMidnight);
  });

  olderItems = computed(() => {
    const yesterdayMidnight = new Date().setHours(0, 0, 0, 0) - 86400000;
    return this.items().filter(i => !i.isPinned && i.timestamp < yesterdayMidnight);
  });

  serverTotalBytes = signal<number>(0);
  isReconcilingServerStorage = signal<boolean>(false);

  /** Active clipboard bytes calculated from local IndexedDB state */
  activeBytes = computed(() => {
    return this.items().reduce((acc, item) => acc + (item.content?.byteSize || 0), 0);
  });

  /** Restorable history bytes calculated from local IndexedDB state */
  historyBytes = computed(() => {
    return this.restorableHistoryItems().reduce((acc, item) => acc + (item.content?.byteSize || 0), 0);
  });

  /**
   * Total storage bytes consumed = Active Clipboard + Restorable History.
   * Local IndexedDB state is the single source of truth for displayed usage.
   * Stale server telemetry NEVER overrides known local usage.
   */
  totalBytes = computed(() => {
    return this.activeBytes() + this.historyBytes();
  });

  /**
   * Authoritative Total Storage Quota:
   * Base = 1 GB (for self device) + 1 GB per additional connected/active device
   */
  totalStorageCapBytes = computed(() => {
    const activePeers = this.deviceService.pairedDevices().filter(d => d.status === 'active' && d.syncEnabled !== false);
    return CLIPBOARD_STORAGE_CAP_BYTES + (activePeers.length * CLIPBOARD_STORAGE_CAP_BYTES);
  });

  /** 0–100 percentage of the total calculated storage quota used */
  storageUsedPercent = computed(() => {
    const cap = this.totalStorageCapBytes();
    if (cap <= 0) return 0;
    return Math.min(100, Math.round((this.totalBytes() / cap) * 100));
  });

  /** Remaining storage bytes available across active and restorable resources */
  remainingStorageBytes = computed(() => {
    return Math.max(0, this.totalStorageCapBytes() - this.totalBytes());
  });

  /** True when vault is at or above the dynamic storage cap */
  capExceeded = computed(() => this.totalBytes() >= this.totalStorageCapBytes());

  isRefreshing = signal<boolean>(false);

  retentionTtlMs = signal<number>(this.loadTtlPref());

  constructor() {
    const fallback = this.loadLocalStorageFallback();
    if (fallback && fallback.length > 0) {
      this.allItems.set(fallback);
    }
    this.loadAuditLogs();
    this.initIndexedDb();
    this.startTtlCleaner();
    this.fetchServerUsage('default');
  }

  async fetchServerUsage(clipboardId: string = 'default') {
    try {
      const res = await fetch(getAirVaultApiUrl(`/api/v1/airvault/clipboards/${clipboardId}/usage`));
      if (res.ok) {
        const json = await res.json();
        if (json.data && typeof json.data.totalBytes === 'number') {
          this.serverTotalBytes.set(json.data.totalBytes);
        }
      }
    } catch {}
  }

  /**
   * Reconciles and resets backend clipboard usage (idempotent with retry resilience)
   */
  async resetServerStorage(clipboardId: string = 'default'): Promise<boolean> {
    this.isReconcilingServerStorage.set(true);
    try {
      const res = await fetch(getAirVaultApiUrl(`/api/v1/airvault/clipboards/${clipboardId}`), {
        method: 'DELETE'
      });
      if (res.ok) {
        this.serverTotalBytes.set(0);
        this.isReconcilingServerStorage.set(false);
        AirVaultLogger.info(`[AirVault Storage] ✅ Backend storage usage successfully reset to 0 bytes for ${clipboardId}`);
        return true;
      } else {
        AirVaultLogger.warn(`[AirVault Storage] ⚠️ Backend storage reset returned HTTP ${res.status}`);
      }
    } catch (err) {
      AirVaultLogger.warn(`[AirVault Storage] ⚠️ Failed to reach backend to reset clipboard storage:`, err);
    }
    this.isReconcilingServerStorage.set(false);
    return false;
  }

  private initIndexedDb() {
    if (typeof window === 'undefined' || !window.indexedDB) return;

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('isPinned', 'isPinned', { unique: false });
        }
        if (!db.objectStoreNames.contains(PAYLOAD_STORE_NAME)) {
          db.createObjectStore(PAYLOAD_STORE_NAME, { keyPath: 'id' });
        }
        // v3: Local-only composer draft store — never synced to other devices
        if (!db.objectStoreNames.contains(DRAFT_STORE_NAME)) {
          db.createObjectStore(DRAFT_STORE_NAME, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        // Authoritative metadata-only load of all persistent vault items on initial startup/reload
        this.loadFromIndexedDb();
      };
    } catch {
      // IndexedDB fallback
    }
  }

  // ── Local Composer Draft Persistence (IndexedDB, never synced) ──────────────

  /**
   * Persists the in-progress composer draft locally to IndexedDB.
   * This is 100% local — it is never sent to other devices.
   * Guards at 30 KB to avoid filling storage with runaway text.
   */
  async saveDraft(text: string): Promise<void> {
    if (!this.db) return;
    if (!text || text.length > 30000) return;
    return new Promise<void>((resolve) => {
      try {
        const tx = this.db!.transaction(DRAFT_STORE_NAME, 'readwrite');
        const store = tx.objectStore(DRAFT_STORE_NAME);
        store.put({ key: 'composer_draft', text, savedAt: Date.now() });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve(); // Non-fatal: silently ignore
      } catch {
        resolve();
      }
    });
  }

  /**
   * Loads the locally-persisted composer draft from IndexedDB.
   * Returns an empty string when no draft exists or if IndexedDB is unavailable.
   */
  async loadDraft(): Promise<string> {
    if (!this.db) return '';
    return new Promise<string>((resolve) => {
      try {
        const tx = this.db!.transaction(DRAFT_STORE_NAME, 'readonly');
        const store = tx.objectStore(DRAFT_STORE_NAME);
        const req = store.get('composer_draft');
        req.onsuccess = () => resolve(req.result?.text || '');
        req.onerror = () => resolve('');
      } catch {
        resolve('');
      }
    });
  }

  /**
   * Clears the locally-persisted composer draft from IndexedDB.
   * Called after a successful Beam so the cleared composer state is also reflected in storage.
   */
  async clearDraft(): Promise<void> {
    if (!this.db) return;
    return new Promise<void>((resolve) => {
      try {
        const tx = this.db!.transaction(DRAFT_STORE_NAME, 'readwrite');
        const store = tx.objectStore(DRAFT_STORE_NAME);
        store.delete('composer_draft');
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  /**
   * Authoritative reload from IndexedDB / LocalStorage to refresh UI
   */
  async refreshFromStorage(): Promise<void> {
    this.isRefreshing.set(true);
    AirVaultLogger.debug('[AirHold Clipboard] 🔄 Refreshing clipboard items from authoritative storage...');

    return new Promise<void>((resolve) => {
      if (this.db) {
        try {
          const tx = this.db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.getAll();

          req.onsuccess = () => {
            if (req.result && Array.isArray(req.result)) {
              // Strip any accidentally hydrated heavy payloads to keep metadata-first guarantee
              const sorted = req.result
                .map((it: AirVaultItem) => this.toMetadataOnlyItem(it))
                .sort((a: AirVaultItem, b: AirVaultItem) => b.timestamp - a.timestamp);
              this.allItems.set(sorted);
              AirVaultLogger.debug(`[AirVault Clipboard] ✅ Refreshed ${sorted.length} metadata-first items from IndexedDB`);
            }
            setTimeout(() => {
              this.isRefreshing.set(false);
              resolve();
            }, 650);
          };

          req.onerror = () => {
            this.allItems.set(this.loadLocalStorageFallback());
            this.isRefreshing.set(false);
            resolve();
          };
        } catch {
          this.allItems.set(this.loadLocalStorageFallback());
          this.isRefreshing.set(false);
          resolve();
        }
      } else {
        this.allItems.set(this.loadLocalStorageFallback());
        this.isRefreshing.set(false);
        resolve();
      }
    });
  }

  /**
   * Strips raw heavy content (>100KB) into metadata-only form to protect JS Heap and UI latency
   */
  private toMetadataOnlyItem(item: AirVaultItem): AirVaultItem {
    if (!item || !item.content) return item;
    const cat = item.content.category;
    const isHeavyResource = cat !== 'text' && cat !== 'code' && cat !== 'json' && cat !== 'url';
    const isLargeRaw = typeof item.content.raw === 'string' && item.content.raw.length > 100_000;

    if (isHeavyResource || isLargeRaw) {
      // Retain previewUrl (thumbnail), metadata, size, filename, and flags, but strip massive raw string
      return {
        ...item,
        content: {
          ...item.content,
          raw: '' // Strip payload from in-memory array
        }
      };
    }
    return item;
  }

  private loadFromIndexedDb() {
    if (!this.db) return;
    try {
      const tx = this.db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        if (req.result && Array.isArray(req.result) && req.result.length > 0) {
          // Sort descending by timestamp and enforce metadata-only projection
          const sorted = req.result
            .map((it: AirVaultItem) => this.toMetadataOnlyItem(it))
            .sort((a: AirVaultItem, b: AirVaultItem) => b.timestamp - a.timestamp);
          this.allItems.set(sorted);
          AirVaultLogger.debug(`[AirVault Storage] 💾 Restored ${sorted.length} metadata-first items from IndexedDB upon startup.`);
        }
      };
    } catch (err) {
      AirVaultLogger.warn('[AirVault Storage] Failed to read from IndexedDB:', err);
    }
  }

  /**
   * On-demand async retrieval of a full resource payload (Blob / Object URL).
   * Hierarchy: In-Memory LRU Cache -> IndexedDB vault_payloads -> Server Streaming Endpoint
   */
  async fetchResourcePayload(item: AirVaultItem): Promise<{ blob: Blob | null; objectUrl: string | null }> {
    const fileId = item.id;
    return this.resourceCache.fetchDeduplicated(fileId, async () => {
      // 1. Check local IndexedDB payload store
      if (this.db) {
        try {
          const blobFromIdb = await new Promise<Blob | null>((resolve) => {
            const tx = this.db!.transaction(PAYLOAD_STORE_NAME, 'readonly');
            const store = tx.objectStore(PAYLOAD_STORE_NAME);
            const req = store.get(fileId);
            req.onsuccess = () => {
              if (req.result && req.result.blob instanceof Blob) {
                resolve(req.result.blob);
              } else if (req.result && typeof req.result.raw === 'string' && req.result.raw.startsWith('data:')) {
                // Convert legacy Base64 string to native Blob
                fetch(req.result.raw).then(r => r.blob()).then(resolve).catch(() => resolve(null));
              } else {
                resolve(null);
              }
            };
            req.onerror = () => resolve(null);
          });

          if (blobFromIdb) {
            return blobFromIdb;
          }
        } catch {}
      }

      // 2. Fetch from backend raw streaming endpoint
      try {
        const streamUrl = getAirVaultApiUrl(`/api/v1/airvault/clipboards/default/files/${fileId}/raw`);
        const resp = await fetch(streamUrl);
        if (resp.ok) {
          const blob = await resp.blob();
          // Store in IndexedDB payload store for future offline retrieval
          this.savePayloadToIndexedDb(fileId, blob);
          return blob;
        }
      } catch (e) {
        AirVaultLogger.warn(`[AirVault Storage] Could not stream resource ${fileId}:`, e);
      }

      // 3. Fallback to existing previewUrl or raw text if available
      if (item.content?.previewUrl && item.content.previewUrl.startsWith('data:')) {
        try {
          const res = await fetch(item.content.previewUrl);
          return await res.blob();
        } catch {}
      }

      return null;
    });
  }

  /**
   * Persists a binary payload to IndexedDB vault_payloads store without touching the active metadata array
   */
  public savePayloadToIndexedDb(id: string, payload: Blob | string) {
    if (!this.db) return;
    try {
      const tx = this.db.transaction(PAYLOAD_STORE_NAME, 'readwrite');
      const store = tx.objectStore(PAYLOAD_STORE_NAME);
      if (payload instanceof Blob) {
        store.put({ id, blob: payload, updatedAt: Date.now() });
      } else {
        store.put({ id, raw: payload, updatedAt: Date.now() });
      }
    } catch (err) {
      AirVaultLogger.warn('[AirVault Storage] Failed to persist payload to IndexedDB:', err);
    }
  }

  /**
   * Identifies if semantically identical content already exists in the vault across any resource category.
   * Matches on normalized dedupKey first, falling back to legacy category heuristics.
   */
  findDuplicateItem(content: ClassifiedContent, excludeItemId?: string): AirVaultItem | undefined {
    const list = this.items();
    return list.find(item => {
      // Never consider an item duplicate of itself, when IDs match, or when item is a batch parent
      if (item.isBatchParent || (content as any)?.isBatchParent) return false;
      if (excludeItemId && (item.id === excludeItemId || (item.batchFiles && item.batchFiles.some(bf => bf.id === excludeItemId)))) return false;
      if (item.id === (content as any)?.id) return false;

      // 0. Primary: Semantic dedupKey match across active items
      const incomingKey = content.dedupKey || (content as any)?.dedupKey;
      const existingKey = item.content?.dedupKey || item.dedupKey;
      if (incomingKey && existingKey && incomingKey === existingKey) {
        return true;
      }

      if (item.content.category !== content.category) return false;

      // 1. Text, Code, JSON, URL comparison (only for exact string match fallback)
      if (['text', 'code', 'json', 'url'].includes(content.category)) {
        const a = (item.content.raw || '').trim();
        const b = (content.raw || '').trim();
        return a.length > 0 && a === b;
      }

      // 2. Image comparison (compare previewUrl, raw data, or filename + byteSize)
      if (content.category === 'image') {
        if (item.content.previewUrl && content.previewUrl && item.content.previewUrl === content.previewUrl) {
          return true;
        }
        if (item.content.raw && content.raw && item.content.raw === content.raw) {
          return true;
        }
        return false;
      }

      // 3. Binary Files, Video, Archives (.zip), Spreadsheets, PDF
      if (['file', 'video', 'archive', 'spreadsheet', 'pdf', 'audio'].includes(content.category)) {
        if (item.content.raw && content.raw && item.content.raw.length > 20 && item.content.raw === content.raw) {
          return true;
        }
      }

      return false;
    });
  }

  /**
   * Refreshes the expiration timestamp of an existing item, increments copyCount, sets lastCopiedAt,
   * and brings the card to the top of the stream.
   */
  refreshItemExpiry(itemId: string): AirVaultItem | undefined {
    let updatedItem: AirVaultItem | undefined;
    const now = Date.now();
    this.allItems.update(list => {
      const idx = list.findIndex(i => i.id === itemId);
      if (idx === -1) return list;
      const current = list[idx];
      const target: AirVaultItem = {
        ...current,
        timestamp: now,
        lastCopiedAt: now,
        copyCount: (current.copyCount || 1) + 1,
        isDeletedFromActive: false
      };
      updatedItem = target;
      const remaining = list.filter(i => i.id !== itemId);
      return [target, ...remaining];
    });
    if (updatedItem) {
      this.persistAll();
    }
    return updatedItem;
  }

  /**
   * Adds an item to the vault with automatic deduplication.
   * If identical content exists, refreshes its expiration timestamp and restarts the countdown.
   */
  addItem(item: AirVaultItem, options?: { isExplicitRestore?: boolean }): { added: boolean; isDuplicate: boolean; item: AirVaultItem } {
    if (!item || !item.id || !item.content) {
      return { added: false, isDuplicate: false, item };
    }
    // Reject completely blank items that have no raw text, no preview URL, and no batch files
    const hasContent = !!(item.content.raw?.trim() || item.content.previewUrl || item.content.filename || (item.batchFiles && item.batchFiles.length > 0) || item.isBatchParent);
    if (!hasContent) {
      return { added: false, isDuplicate: false, item };
    }

    // Guard against resurrecting locally deleted items during sync or reconnect
    const curDev = this.deviceService.currentDevice();
    const isLocalCreate = !item.originDeviceId || item.originDeviceId === curDev.id || item.senderDeviceId === curDev.id;
    const existingLocal = this.allItems().find(i => i.id === item.id || (i.packetId && i.packetId === item.id));
    if (existingLocal && existingLocal.isDeletedFromActive && !options?.isExplicitRestore && !isLocalCreate) {
      AirVaultLogger.debug(`[AirVault Storage] 🛡️ Item ${item.id} is locally deleted/in history. Preserving local deletion.`);
      return { added: false, isDuplicate: true, item: existingLocal };
    }
    if (existingLocal && (options?.isExplicitRestore || isLocalCreate)) {
      existingLocal.isDeletedFromActive = false;
    }

    // 0. Batch child deduplication: if item belongs to a batch and is not a batch parent, never add as a standalone item
    if (item.batchId && !item.isBatchParent) {
      return { added: false, isDuplicate: false, item };
    }
    if (this.isItemInBatch(item.id)) {
      return { added: false, isDuplicate: false, item };
    }

    // Check if identical content already exists
    const duplicate = this.findDuplicateItem(item.content, item.id);
    if (duplicate) {
      AirVaultLogger.debug(`[AirVault Storage] 🔄 Duplicate item detected: "${duplicate.content.filename || duplicate.content.category}". Refreshing expiration timer.`);
      const refreshed = this.refreshItemExpiry(duplicate.id) || duplicate;
      return { added: false, isDuplicate: true, item: refreshed };
    }

    const targetBytes = item.content?.byteSize || 0;
    const currentUsage = this.totalBytes();
    const quota = this.totalStorageCapBytes();

    // Check if new payload would exceed available quota (Active + Restorable History shared)
    if (currentUsage + targetBytes > quota) {
      const usedMB = (currentUsage / 1024 / 1024).toFixed(0);
      const capMB = (quota / 1024 / 1024).toFixed(0);
      AirVaultLogger.warn(`[AirVault Storage] ⚠️ Storage cap reached (${usedMB} MB / ${capMB} MB). Resource upload rejected.`);
      return { added: false, isDuplicate: false, item };
    }

    // Assign owner and retention policy
    const isLifetime = targetBytes > LARGE_RESOURCE_RETENTION_THRESHOLD_BYTES;
    const customTtl = this.retentionTtlMs();

    // BURN_AFTER_READ is strictly restricted to RESOURCE / FILE items (images, pdfs, audio, video, spreadsheets, archives, binary files)
    // It must NEVER apply to plain text, code, json, or url items.
    const cat = item.content?.category || '';
    const isTextOrCode = cat === 'text' || cat === 'code' || cat === 'json' || cat === 'url';
    const isResource = !isTextOrCode;

    const isBurnAfterRead = isResource && (item.burnAfterRead === true || item.retentionTtlMs === -1 || customTtl === -1);
    const effectiveTtl = isLifetime ? 0 : (isBurnAfterRead ? -1 : (item.retentionTtlMs && item.retentionTtlMs > 0 ? item.retentionTtlMs : (customTtl > 0 ? customTtl : (7 * 24 * 60 * 60 * 1000))));

    const enrichedItem: AirVaultItem = {
      ...item,
      originDeviceId: item.originDeviceId || curDev.id,
      originOwnerId: item.originOwnerId || (item.originDeviceId || curDev.id),
      isLifetimeRetention: isLifetime,
      retentionTtlMs: effectiveTtl,
      isDeletedFromActive: false,
      dedupKey: item.dedupKey || item.content?.dedupKey,
      copyCount: item.copyCount || 1,
      lastCopiedAt: item.lastCopiedAt || item.timestamp || Date.now(),
      burnAfterRead: isBurnAfterRead
    };

    this.allItems.update(list => {
      let filtered = [enrichedItem, ...list.filter(i => i.id !== item.id)];
      // Enforce capacity: FIFO eviction on unpinned if exceeded
      const active = filtered.filter(i => !i.isDeletedFromActive);
      const inHistory = filtered.filter(i => i.isDeletedFromActive);

      if (active.length > MAX_ITEMS_CAPACITY) {
        const pinned = active.filter(i => i.isPinned);
        const unpinned = active.filter(i => !i.isPinned).slice(0, MAX_ITEMS_CAPACITY - pinned.length);
        filtered = [...pinned, ...unpinned, ...inHistory].sort((a, b) => b.timestamp - a.timestamp);
      }
      return filtered;
    });

    this.recordAudit({
      id: 'aud_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      action: 'created',
      itemId: enrichedItem.id,
      itemCategory: enrichedItem.content.category,
      itemSnippet: enrichedItem.content.filename || (enrichedItem.content.raw ? enrichedItem.content.raw.slice(0, 60) : 'Item'),
      itemSize: targetBytes,
      deviceId: enrichedItem.senderDeviceId || curDev.id,
      deviceName: enrichedItem.senderDeviceName || curDev.name,
      deviceAccent: enrichedItem.senderDeviceAccent || curDev.accentColor || '#2196F3',
      deviceType: enrichedItem.senderDeviceType || curDev.type,
      ownerId: enrichedItem.originDeviceId,
      ownerName: enrichedItem.senderDeviceName,
      timestamp: enrichedItem.timestamp || Date.now()
    });

    this.persistAll();
    return { added: true, isDuplicate: false, item: enrichedItem };
  }

  /**
   * Calculates expiry details for displaying in UI and warning if close to retention expiration (< 24h)
   * Resources > 5 MB have Clipboard lifetime retention.
   */
  getItemExpiryInfo(item: AirVaultItem): {
    expiresAt: number;
    remainingMs: number;
    isExpiringSoon: boolean;
    isPinned: boolean;
    isLifetime: boolean;
    label: string;
    isBurnAfterRead?: boolean;
  } {
    const cat = item.content?.category || '';
    const isResource = cat !== 'text' && cat !== 'code' && cat !== 'json' && cat !== 'url';

    if (isResource && (item.burnAfterRead || item.retentionTtlMs === -1)) {
      return {
        expiresAt: 0,
        remainingMs: 0,
        isExpiringSoon: true,
        isPinned: false,
        isLifetime: false,
        label: 'Burn on 1st view',
        isBurnAfterRead: true
      };
    }

    const ttl = item.retentionTtlMs && item.retentionTtlMs > 0 
      ? item.retentionTtlMs 
      : (this.retentionTtlMs() > 0 ? this.retentionTtlMs() : (7 * 24 * 60 * 60 * 1000));
    const expiresAt = item.timestamp + ttl;
    const remainingMs = Math.max(0, expiresAt - Date.now());
    const isExpiringSoon = remainingMs > 0 && remainingMs < (24 * 60 * 60 * 1000); // < 24 hours

    let label = '';
    const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));

    if (days > 0) {
      label = `${days}d ${hours}h left`;
    } else if (hours > 0) {
      label = `${hours}h ${minutes}m left`;
    } else if (minutes > 0) {
      label = `${minutes}m left`;
    } else {
      label = 'Expiring shortly';
    }

    return { expiresAt, remainingMs, isExpiringSoon, isPinned: false, isLifetime: false, label };
  }

  /** Mutate collapse state of an existing item in-memory and persist */
  setCollapseState(itemId: string, state: 'expanded' | 'collapsed') {
    this.allItems.update(list =>
      list.map(i => i.id === itemId ? { ...i, content: { ...i.content, collapseState: state } } : i)
    );
    this.persistAll();
  }

  updateDeliveryStatus(packetId: string, status: DeliveryStatus) {
    this.allItems.update(list =>
      list.map(i => (i.packetId === packetId || i.id === packetId) ? { ...i, deliveryStatus: status } : i)
    );
    this.persistAll();
  }

  updateItemProgress(id: string, progressPercent: number, stage?: string) {
    this.allItems.update(list =>
      list.map(i => {
        if (i.id === id) {
          return { ...i, progressPercent, processingState: 'processing' };
        }
        if (i.isBatchParent && i.batchFiles && i.batchFiles.some(bf => bf.id === id)) {
          const updatedFiles = i.batchFiles.map(bf => bf.id === id ? { ...bf, progressPercent, processingState: 'processing' as ProcessingState } : bf);
          const totalProgress = updatedFiles.reduce((acc, f) => acc + (f.progressPercent || 0), 0);
          const aggPercent = Math.round(totalProgress / updatedFiles.length);
          return {
            ...i,
            batchFiles: updatedFiles,
            progressPercent: aggPercent,
            processingState: 'processing'
          };
        }
        return i;
      })
    );
  }

  updateItemProcessingState(id: string, processingState: ProcessingState, content?: ClassifiedContent, error?: string) {
    this.allItems.update(list =>
      list.map(i => {
        if (i.id === id) {
          return {
            ...i,
            processingState,
            progressPercent: processingState === 'done' ? 100 : i.progressPercent,
            content: content ? content : i.content,
            errorMessage: error
          };
        }
        if (i.isBatchParent && i.batchFiles && i.batchFiles.some(bf => bf.id === id)) {
          const updatedFiles = i.batchFiles.map(bf => {
            if (bf.id === id) {
              return {
                ...bf,
                processingState,
                progressPercent: processingState === 'done' ? 100 : bf.progressPercent,
                content: content ? content : bf.content,
                errorMessage: error
              };
            }
            return bf;
          });

          const completed = updatedFiles.filter(f => f.processingState === 'done').length;
          const failed = updatedFiles.filter(f => f.processingState === 'failed').length;
          const isAllFinished = (completed + failed) === updatedFiles.length;
          const totalProgress = updatedFiles.reduce((acc, f) => acc + (f.progressPercent || 0), 0);
          const aggPercent = Math.round(totalProgress / updatedFiles.length);

          let batchState: ProcessingState = 'processing';
          if (isAllFinished) {
            batchState = completed === updatedFiles.length ? 'done' : (failed === updatedFiles.length ? 'failed' : 'done');
          }

          return {
            ...i,
            batchFiles: updatedFiles,
            batchCompletedCount: completed,
            batchFailedCount: failed,
            progressPercent: isAllFinished && completed === updatedFiles.length ? 100 : aggPercent,
            processingState: batchState
          };
        }
        return i;
      })
    );
    this.persistAll();
  }

  togglePin(id: string) {
    this.allItems.update(list =>
      list.map(i => i.id === id ? { ...i, isPinned: !i.isPinned } : i)
    );
    this.persistAll();
  }

  toggleReveal(id: string) {
    this.allItems.update(list =>
      list.map(i => i.id === id ? { ...i, isRevealed: !i.isRevealed } : i)
    );
  }

  /**
   * Local Delete (Non-owner):
   * Removes resource content from this device view only.
   * Moves into Restorable History for up to 30 days locally.
   */
  deleteItemLocally(id: string, deleterDevice?: { id: string; name: string; accentColor?: string; type?: string }) {
    const target = this.allItems().find(i => 
      i.id === id || 
      (i.packetId && i.packetId === id) || 
      (i.batchId && i.batchId === id)
    );
    const curDev = this.deviceService.currentDevice();
    const dDevice = deleterDevice || curDev;
    const now = Date.now();
    const restExpire = now + RESTORABLE_HISTORY_DURATION_MS;

    if (target) {
      this.recordAudit({
        id: 'aud_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
        action: 'deleted',
        itemId: target.id,
        itemCategory: target.content.category,
        itemSnippet: target.content.filename || (target.content.raw ? target.content.raw.slice(0, 60) : 'Item'),
        itemSize: target.content.byteSize,
        deviceId: dDevice.id,
        deviceName: dDevice.name,
        deviceAccent: dDevice.accentColor || '#EF4444',
        deviceType: dDevice.type || 'laptop',
        ownerId: target.originDeviceId,
        ownerName: target.senderDeviceName,
        deletionScope: 'local',
        deletionReason: 'Removed locally by device (Available in 30-day Restorable History)',
        restorationExpiresAt: restExpire,
        timestamp: now
      });

      // Move into 30-day Restorable History (do not delete content yet!)
      this.allItems.update(list =>
        list.map(i => (i.id === id || (i.packetId && i.packetId === id) || (i.batchId && i.batchId === id) || (target && i.id === target.id)) ? {
          ...i,
          isDeletedFromActive: true,
          deletedAt: now,
          restorationExpiresAt: restExpire,
          deletedByDeviceId: dDevice.id,
          deletedByDeviceName: dDevice.name
        } : i)
      );
      this.persistAll();
    }
  }

  /**
   * Global Delete (Owner):
   * Removes from active clipboard everywhere, keeps in Restorable History for 30 days,
   * and registers tombstone so old incoming packets do not resurrect it to active.
   */
  deleteItemGlobally(id: string, deleterDevice?: { id: string; name: string; accentColor?: string; type?: string }) {
    const target = this.allItems().find(i => 
      i.id === id || 
      (i.packetId && i.packetId === id) || 
      (i.batchId && i.batchId === id)
    );
    const curDev = this.deviceService.currentDevice();
    const dDevice = deleterDevice || curDev;
    const now = Date.now();
    const restExpire = now + RESTORABLE_HISTORY_DURATION_MS;

    // Register tombstone
    this.addTombstone(id);
    if (target?.id) this.addTombstone(target.id);
    if (target?.packetId) this.addTombstone(target.packetId);
    if (target?.batchId) this.addTombstone(target.batchId);
    if (target?.isBatchParent && target.batchFiles) {
      target.batchFiles.forEach(bf => this.addTombstone(bf.id));
    }

    const isBurn = target?.burnAfterRead || (deleterDevice as any)?.burnAfterRead || false;

    if (target) {
      this.recordAudit({
        id: 'aud_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
        action: 'deleted',
        itemId: target.id,
        itemCategory: target.content.category,
        itemSnippet: target.content.filename || (target.content.raw ? target.content.raw.slice(0, 60) : 'Item'),
        itemSize: target.content.byteSize,
        deviceId: dDevice.id,
        deviceName: dDevice.name,
        deviceAccent: dDevice.accentColor || '#EF4444',
        deviceType: dDevice.type || 'laptop',
        ownerId: target.originDeviceId,
        ownerName: target.senderDeviceName,
        deletionScope: 'global',
        deletionReason: isBurn ? 'Burned after read (Permanently destroyed)' : 'Global deletion across connected devices (Available in 30-day Restorable History)',
        restorationExpiresAt: isBurn ? 0 : restExpire,
        timestamp: now
      });

      if (isBurn) {
        // Permanently purge burn-after-read item immediately — completely zeroed out from disk
        this.allItems.update(list => list.filter(i =>
          i.id !== id &&
          (!i.packetId || i.packetId !== id) &&
          (!i.batchId || i.batchId !== id) &&
          i.id !== target.id
        ));
        if (this.db) {
          try {
            const tx = this.db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).delete(target.id);
            tx.objectStore(STORE_NAME).delete(id);
          } catch {}
        }
      } else {
        // Move into 30-day Restorable History (actual resource preserved for 30 days)
        this.allItems.update(list =>
          list.map(i => (i.id === id || (i.packetId && i.packetId === id) || (i.batchId && i.batchId === id) || (target && i.id === target.id)) ? {
            ...i,
            isDeletedFromActive: true,
            deletedAt: now,
            restorationExpiresAt: restExpire,
            deletedByDeviceId: dDevice.id,
            deletedByDeviceName: dDevice.name
          } : i)
        );
      }
      this.persistAll();
    }
  }

  /** Delete a single file from within a batch */
  deleteBatchFile(batchId: string, fileId: string) {
    this.allItems.update(list =>
      list.map(i => {
        if (i.id === batchId && i.batchFiles) {
          const updatedFiles = i.batchFiles.filter(f => f.id !== fileId);
          if (updatedFiles.length === 0) {
            return null as any; // Batch empty, removed below
          }
          const totalBytes = updatedFiles.reduce((acc, f) => acc + (f.content.byteSize || 0), 0);
          return {
            ...i,
            batchFiles: updatedFiles,
            batchTotalCount: updatedFiles.length,
            batchTotalBytes: totalBytes,
            content: {
              ...i.content,
              raw: `Batch of ${updatedFiles.length} files (${(totalBytes / 1024 / 1024).toFixed(1)} MB)`,
              filename: `${updatedFiles.length} Files Batch`,
              byteSize: totalBytes
            }
          };
        }
        return i;
      }).filter(Boolean)
    );
    this.persistAll();
  }

  /** Rename a single file within a batch */
  renameBatchFile(batchId: string, fileId: string, newName: string) {
    this.allItems.update(list =>
      list.map(i => {
        if (i.id === batchId && i.batchFiles) {
          const updatedFiles = i.batchFiles.map(f => f.id === fileId ? { ...f, content: { ...f.content, filename: newName } } : f);
          return { ...i, batchFiles: updatedFiles };
        }
        return i;
      })
    );
    this.persistAll();
  }

  deleteItem(id: string) {
    const item = this.allItems().find(i => i.id === id);
    const curDev = this.deviceService.currentDevice();
    const isOwner = !item?.originDeviceId || item.originDeviceId === curDev.id;

    if (isOwner) {
      this.deleteItemGlobally(id);
    } else {
      this.deleteItemLocally(id);
    }
  }

  /**
   * Re-adds a restorable history resource back to the Active Clipboard.
   * Preserves the logical resource identity, clears deletion flags, updates timestamp,
   * and removes tombstone so it syncs normally.
   */
  restoreItemToActive(id: string): { success: boolean; message: string; item?: AirVaultItem } {
    const target = this.allItems().find(i => i.id === id);
    if (!target) {
      return { success: false, message: 'This item is no longer available for restoration.' };
    }

    const now = Date.now();
    if (target.restorationExpiresAt && target.restorationExpiresAt <= now) {
      return { success: false, message: 'This item is no longer available for restoration.' };
    }

    // Check if adding back to active would exceed available quota
    // (Note: Since it's already in history, it already occupied quota, but verify total cap)
    if (this.capExceeded()) {
      return { success: false, message: 'Storage is full. Free up space to restore resources.' };
    }

    const curDev = this.deviceService.currentDevice();
    const restoredItem: AirVaultItem = {
      ...target,
      isDeletedFromActive: false,
      deletedAt: undefined,
      restorationExpiresAt: undefined,
      timestamp: now
    };

    // Remove tombstone so peers can receive the restored item
    this.removeTombstone(id);

    this.allItems.update(list => [restoredItem, ...list.filter(i => i.id !== id)]);
    this.persistAll();

    this.recordAudit({
      id: 'aud_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      action: 'restored',
      itemId: id,
      itemCategory: restoredItem.content.category,
      itemSnippet: restoredItem.content.filename || (restoredItem.content.raw ? restoredItem.content.raw.slice(0, 60) : 'Restored Item'),
      itemSize: restoredItem.content.byteSize,
      deviceId: curDev.id,
      deviceName: curDev.name,
      deviceAccent: curDev.accentColor || '#10B981',
      deviceType: curDev.type,
      ownerId: restoredItem.originDeviceId,
      ownerName: restoredItem.senderDeviceName,
      timestamp: now
    });

    return { success: true, message: `✓ "${restoredItem.content.filename || 'Resource'}" re-added to active clipboard`, item: restoredItem };
  }

  /** Permanently purges a specific restorable history item immediately */
  purgeRestorableItemPermanently(id: string) {
    const target = this.allItems().find(i => i.id === id);
    if (target) {
      this.recordAudit({
        id: 'aud_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
        action: 'deleted',
        itemId: id,
        itemCategory: target.content.category,
        itemSnippet: target.content.filename || (target.content.raw ? target.content.raw.slice(0, 60) : 'Item'),
        itemSize: target.content.byteSize,
        deviceId: 'system',
        deviceName: 'Manual Purge',
        deviceAccent: '#EF4444',
        deviceType: 'desktop',
        ownerId: target.originDeviceId,
        ownerName: target.senderDeviceName,
        deletionScope: 'global',
        deletionReason: 'Permanently purged from restorable history',
        timestamp: Date.now()
      });
    }

    this.allItems.update(list => list.filter(i => i.id !== id));
    if (this.db) {
      try {
        const tx = this.db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
      } catch {}
    }
    this.saveLocalStorage();
  }

  removeTombstone(id: string) {
    this.tombstones.update(set => {
      const copy = new Set(set);
      copy.delete(id);
      return copy;
    });
    this.saveTombstones();
  }

  addTombstone(id: string) {
    this.tombstones.update(set => {
      const copy = new Set(set);
      copy.add(id);
      return copy;
    });
    this.saveTombstones();
  }

  isTombstoned(id: string): boolean {
    return this.tombstones().has(id);
  }

  private loadTombstones(): Set<string> {
    try {
      const raw = localStorage.getItem('acklet_airvault_tombstones');
      if (raw) {
        return new Set(JSON.parse(raw));
      }
    } catch {}
    return new Set<string>();
  }

  private tombstoneTimer: any = null;

  private saveTombstones() {
    if (this.tombstoneTimer) clearTimeout(this.tombstoneTimer);
    this.tombstoneTimer = setTimeout(() => {
      try {
        const arr = Array.from(this.tombstones()).slice(-250); // Retain last 250 tombstones
        localStorage.setItem('acklet_airvault_tombstones', JSON.stringify(arr));
      } catch {}
    }, 300);
  }

  /** Permanently purge all restorable history items while preserving audit logs */
  purgeAllRestorableHistory() {
    // Keep only active items
    const activeOnly = this.allItems().filter(i => !i.isDeletedFromActive);
    this.allItems.set(activeOnly);
    this.persistAll();

    // If all items are now cleared, asynchronously reconcile backend storage
    if (activeOnly.length === 0) {
      this.resetServerStorage('default');
    }
  }

  /**
   * Clears active clipboard items for the current device view only,
   * moving all active items to 30-day Restorable History via the standard local deletion mechanism.
   */
  clearActiveClipboardLocally(): number {
    const activeItems = this.items();
    const count = activeItems.length;
    if (count === 0) return 0;

    const curDev = this.deviceService.currentDevice();
    const now = Date.now();
    const restExpire = now + RESTORABLE_HISTORY_DURATION_MS;

    for (const target of activeItems) {
      this.recordAudit({
        id: 'aud_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
        action: 'deleted',
        itemId: target.id,
        itemCategory: target.content.category,
        itemSnippet: target.content.filename || (target.content.raw ? target.content.raw.slice(0, 60) : 'Item'),
        itemSize: target.content.byteSize,
        deviceId: curDev.id,
        deviceName: curDev.name,
        deviceAccent: curDev.accentColor || '#EF4444',
        deviceType: curDev.type || 'laptop',
        ownerId: target.originDeviceId,
        ownerName: target.senderDeviceName,
        deletionScope: 'local',
        deletionReason: 'Cleared local active clipboard (Available in 30-day Restorable History)',
        restorationExpiresAt: restExpire,
        timestamp: now
      });
    }

    const activeIds = new Set(activeItems.map(i => i.id));
    this.allItems.update(list =>
      list.map(i => activeIds.has(i.id) ? {
        ...i,
        isDeletedFromActive: true,
        deletedAt: now,
        restorationExpiresAt: restExpire,
        deletedByDeviceId: curDev.id,
        deletedByDeviceName: curDev.name
      } : i)
    );
    this.persistAll();
    return count;
  }

  clearAllLocally() {
    this.allItems.set([]);
    if (this.db) {
      try {
        const tx = this.db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
      } catch {}
    }
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('acklet_airvault_items');
      } catch {}
    }
  }

  clearAll() {
    this.clearAllLocally();
    this.resetServerStorage('default');
  }

  private auditTimer: any = null;

  recordAudit(entry: AirVaultAuditEntry) {
    AirVaultLogger.debug(`[AirVault Audit] 📜 [${entry.action.toUpperCase()}] "${entry.itemSnippet}" by ${entry.deviceName} (${entry.deviceId})`);
    this.auditLogs.update(logs => [entry, ...logs].slice(0, 100));
    if (typeof localStorage !== 'undefined') {
      if (this.auditTimer) clearTimeout(this.auditTimer);
      this.auditTimer = setTimeout(() => {
        try {
          localStorage.setItem('acklet_airvault_audit_logs', JSON.stringify(this.auditLogs()));
        } catch {}
      }, 300);
    }
  }

  loadAuditLogs() {
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('acklet_airvault_audit_logs');
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) this.auditLogs.set(list.slice(0, 100));
        }
      } catch {}
    }
  }

  /**
   * Reorders items when a tile is dragged and dropped onto another tile.
   */
  reorderItems(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    this.allItems.update(list => {
      const fromIdx = list.findIndex(i => i.id === sourceId);
      const toIdx = list.findIndex(i => i.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return list;

      const updated = [...list];
      const [moved] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, moved);
      return updated;
    });
    this.persistAll();
  }

  setTtl(ttlMs: number) {
    this.retentionTtlMs.set(ttlMs);
    try {
      localStorage.setItem('acklet_airvault_ttl', JSON.stringify(ttlMs));
    } catch {}
  }

  private persistTimer: any = null;
  private pendingIndexedDbList: AirVaultItem[] | null = null;

  /**
   * Batched, debounced persistence to IndexedDB & fallback localStorage.
   * Collapses rapid successive updates (e.g. batch uploads, sync packets, status changes)
   * into a single disk write transaction every 150ms.
   */
  public persistAll() {
    this.pendingIndexedDbList = this.allItems();
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
    }
    this.persistTimer = setTimeout(() => {
      this.executePersistAll();
    }, 150);
  }

  public flushPersistImmediate() {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    this.executePersistAll();
  }

  private executePersistAll() {
    this.persistTimer = null;
    const list = this.pendingIndexedDbList || this.allItems();
    this.saveLocalStorage(list);

    if (this.db) {
      try {
        const tx = this.db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.clear();
        for (const item of list) {
          store.put(item);
        }
      } catch (e) {
        AirVaultLogger.warn('[AirVault Storage] Error writing to IndexedDB', e);
      }
    }
  }

  private ttlCleanerInterval: any = null;

  private startTtlCleaner() {
    if (this.ttlCleanerInterval) clearInterval(this.ttlCleanerInterval);
    this.ttlCleanerInterval = setInterval(() => {
      const defaultTtl = this.retentionTtlMs() > 0 ? this.retentionTtlMs() : (7 * 24 * 60 * 60 * 1000);
      const now = Date.now();
      const currentList = this.allItems();
      let hasChanges = false;
      const updatedList: AirVaultItem[] = [];

      for (const item of currentList) {
        // Case 1: Item is in 30-day Restorable History
        if (item.isDeletedFromActive) {
          const restExpire = item.restorationExpiresAt || (item.deletedAt ? item.deletedAt + RESTORABLE_HISTORY_DURATION_MS : 0);
          if (restExpire > 0 && now >= restExpire) {
            // 30-day restoration window expired! Permanently delete content and preserve audit entry
            AirVaultLogger.info(`[AirVault Storage] ⏳ Restorable History: 30-day retention expired for "${item.content?.filename || item.id}". Content permanently purged.`);
            hasChanges = true;
            this.recordAudit({
              id: 'aud_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
              action: 'deleted',
              itemId: item.id,
              itemCategory: item.content?.category || 'file',
              itemSnippet: item.content?.filename || (item.content?.raw ? item.content.raw.slice(0, 60) : 'Expired Item'),
              itemSize: item.content?.byteSize || 0,
              deviceId: 'system',
              deviceName: '30-Day History Cleaner',
              deviceAccent: '#EF4444',
              deviceType: 'desktop',
              ownerId: item.originDeviceId,
              ownerName: item.senderDeviceName,
              deletionScope: 'retention_expired',
              deletionReason: '30-day restorable history retention window expired. Resource content permanently purged.',
              timestamp: now
            });
            continue; // Do NOT push to updatedList -> content purged!
          }
          updatedList.push(item);
          continue;
        }

        // Case 2: Item is in Active Clipboard
        const isLifetime = (item.content?.byteSize || 0) > LARGE_RESOURCE_RETENTION_THRESHOLD_BYTES || item.isLifetimeRetention === true;
        if (item.isPinned || isLifetime) {
          updatedList.push(item);
          continue;
        }

        const effectiveTtl = item.retentionTtlMs && item.retentionTtlMs > 0 ? item.retentionTtlMs : defaultTtl;
        if (now - item.timestamp >= effectiveTtl) {
          // Active TTL expired: Move into 30-day Restorable History!
          AirVaultLogger.info(`[AirVault Storage] ⏳ Active TTL expired for "${item.content?.filename || item.id}" (<= 5 MB). Moved to 30-day Restorable History.`);
          hasChanges = true;
          const restExpire = now + RESTORABLE_HISTORY_DURATION_MS;

          this.recordAudit({
            id: 'aud_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
            action: 'deleted',
            itemId: item.id,
            itemCategory: item.content?.category || 'file',
            itemSnippet: item.content?.filename || (item.content?.raw ? item.content.raw.slice(0, 60) : 'Expired Active Item'),
            itemSize: item.content?.byteSize || 0,
            deviceId: 'system',
            deviceName: 'Retention Policy',
            deviceAccent: '#F59E0B',
            deviceType: 'desktop',
            ownerId: item.originDeviceId,
            ownerName: item.senderDeviceName,
            deletionScope: 'retention_expired',
            deletionReason: 'Active retention policy expired (<= 5 MB). Moved to 30-day Restorable History.',
            restorationExpiresAt: restExpire,
            timestamp: now
          });

          updatedList.push({
            ...item,
            isDeletedFromActive: true,
            deletedAt: now,
            restorationExpiresAt: restExpire,
            deletedByDeviceId: 'system',
            deletedByDeviceName: 'Retention Policy'
          });
        } else {
          updatedList.push(item);
        }
      }

      if (hasChanges) {
        this.allItems.set(updatedList);
        this.persistAll();
      }
    }, 60000);
  }

  private loadLocalStorageFallback(): AirVaultItem[] {
    try {
      const raw = localStorage.getItem('acklet_airvault_items');
      if (raw) {
        const parsed: AirVaultItem[] = JSON.parse(raw);
        // Exclude any legacy mock items cached in user's browser localStorage
        return parsed.filter(i => !i.id.startsWith('item-demo-'));
      }
    } catch {}

    return [];
  }

  private saveLocalStorage(list?: AirVaultItem[]) {
    try {
      const source = list || this.allItems();
      const lightweightItems = source.slice(0, 30).map(item => {
        if (item.content && item.content.raw && item.content.raw.length > 2000) {
          return {
            ...item,
            content: {
              ...item.content,
              raw: item.content.raw.slice(0, 300) + '... [Full content in IndexedDB]'
            }
          };
        }
        return item;
      });
      localStorage.setItem('acklet_airvault_items', JSON.stringify(lightweightItems));
    } catch {}
  }

  private loadTtlPref(): number {
    try {
      const raw = localStorage.getItem('acklet_airvault_ttl');
      return raw ? JSON.parse(raw) : 7 * 24 * 60 * 60 * 1000;
    } catch {
      return 7 * 24 * 60 * 60 * 1000;
    }
  }
}

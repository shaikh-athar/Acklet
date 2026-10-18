import { Injectable } from '@angular/core';

export interface LocalClipboardRecord {
  code: string;
  wordCode?: string;
  ownerToken?: string;
  isSender: boolean;
  createdAt: number;
  itemCount: number;
  isEncrypted?: boolean;
  encryptionKey?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClipboardHistoryService {
  private readonly DB_NAME = 'acklet_clipboard_db';
  private readonly STORE_NAME = 'recent_clipboards';
  private readonly PRIVATE_MODE_KEY = 'acklet_clipboard_private_mode';
  private readonly STORAGE_KEY = 'acklet_clipboard_recent_history';

  isPrivateMode(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(this.PRIVATE_MODE_KEY) === 'true';
  }

  setPrivateMode(enabled: boolean): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.PRIVATE_MODE_KEY, String(enabled));
    if (enabled) {
      this.clearAllHistory();
    }
  }

  async saveRecord(record: LocalClipboardRecord): Promise<void> {
    if (!record || !record.code) return;

    const cleanCode = record.code.trim().toLowerCase();
    const cleanRecord: LocalClipboardRecord = {
      ...record,
      code: cleanCode,
      createdAt: record.createdAt || Date.now()
    };

    // 1. Immediately & synchronously persist to localStorage for 100% reliability
    if (typeof localStorage !== 'undefined') {
      try {
        const list = this.getLocalRecords();
        const existingIdx = list.findIndex(r => r.code.toLowerCase() === cleanCode);
        const mergedRecord: LocalClipboardRecord = existingIdx >= 0
          ? { ...list[existingIdx], ...cleanRecord, createdAt: Date.now() }
          : cleanRecord;
        if (existingIdx >= 0) {
          list.splice(existingIdx, 1);
        }
        list.unshift(mergedRecord);

        // Retain top 25 recent records
        const trimmed = list.slice(0, 25);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmed));
      } catch (e) {
        console.warn('Could not save history to localStorage', e);
      }
    }

    // 2. Also persist to IndexedDB asynchronously as durable backing store
    try {
      const db = await this.openDb();
      if (db && db.objectStoreNames.contains(this.STORE_NAME)) {
        await new Promise<void>((resolve) => {
          const tx = db.transaction(this.STORE_NAME, 'readwrite');
          const store = tx.objectStore(this.STORE_NAME);
          store.put(cleanRecord);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        });
      }
    } catch (_) {}
  }

  async getRecentRecords(): Promise<LocalClipboardRecord[]> {
    // 1. Check synchronous localStorage first (instant & resilient)
    const local = this.getLocalRecords();
    if (local.length > 0) {
      return local.slice(0, 20);
    }

    // 2. Fallback to IndexedDB if localStorage was empty
    try {
      const db = await this.openDb();
      if (!db || !db.objectStoreNames.contains(this.STORE_NAME)) return [];

      return new Promise((resolve) => {
        const tx = db.transaction(this.STORE_NAME, 'readonly');
        const store = tx.objectStore(this.STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => {
          const list: LocalClipboardRecord[] = request.result || [];
          list.sort((a, b) => b.createdAt - a.createdAt);
          const top = list.slice(0, 20);
          // Backfill localStorage
          if (typeof localStorage !== 'undefined' && top.length > 0) {
            try {
              localStorage.setItem(this.STORAGE_KEY, JSON.stringify(top));
            } catch (_) {}
          }
          resolve(top);
        };
        request.onerror = () => resolve([]);
      });
    } catch (_) {
      return [];
    }
  }

  async deleteRecord(code: string): Promise<void> {
    const clean = code.trim().toLowerCase();

    // 1. Remove from localStorage
    if (typeof localStorage !== 'undefined') {
      try {
        const list = this.getLocalRecords().filter(r => r.code.toLowerCase() !== clean);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
      } catch (_) {}
    }

    // 2. Remove from IndexedDB
    try {
      const db = await this.openDb();
      if (db && db.objectStoreNames.contains(this.STORE_NAME)) {
        await new Promise<void>((resolve) => {
          const tx = db.transaction(this.STORE_NAME, 'readwrite');
          const store = tx.objectStore(this.STORE_NAME);
          store.delete(clean);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        });
      }
    } catch (_) {}
  }

  async clearAllHistory(): Promise<void> {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(this.STORAGE_KEY);
      } catch (_) {}
    }

    try {
      const db = await this.openDb();
      if (db && db.objectStoreNames.contains(this.STORE_NAME)) {
        await new Promise<void>((resolve) => {
          const tx = db.transaction(this.STORE_NAME, 'readwrite');
          const store = tx.objectStore(this.STORE_NAME);
          store.clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        });
      }
    } catch (_) {}
  }

  private getLocalRecords(): LocalClipboardRecord[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      }
    } catch (_) {}
    return [];
  }

  private openDb(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      // Use version 2 to ensure onupgradeneeded triggers and creates missing store if version 1 existed
      const request = indexedDB.open(this.DB_NAME, 2);
      request.onupgradeneeded = (e: any) => {
        const db: IDBDatabase = e.target.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'code' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  }
}

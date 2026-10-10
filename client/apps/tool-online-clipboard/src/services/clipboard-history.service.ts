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
    if (this.isPrivateMode()) return;
    const db = await this.openDb();
    if (!db) return;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getRecentRecords(): Promise<LocalClipboardRecord[]> {
    if (this.isPrivateMode()) return [];
    const db = await this.openDb();
    if (!db) return [];

    return new Promise((resolve) => {
      const tx = db.transaction(this.STORE_NAME, 'readonly');
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const list: LocalClipboardRecord[] = request.result || [];
        list.sort((a, b) => b.createdAt - a.createdAt);
        resolve(list.slice(0, 10)); // Top 10 recent
      };
      request.onerror = () => resolve([]);
    });
  }

  async clearAllHistory(): Promise<void> {
    const db = await this.openDb();
    if (!db) return;

    return new Promise((resolve) => {
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  private openDb(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      const request = indexedDB.open(this.DB_NAME, 1);
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

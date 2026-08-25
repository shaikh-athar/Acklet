import { Injectable } from '@angular/core';

export interface HistoryGroup {
  label: string; // 'Today', 'Yesterday', 'Older'
  items: HistoryItem[];
}

export interface HistoryItem {
  id: string;
  timestamp: Date;
  filename: string;
  preview: string;
  payload: string;
  sizeBytes: number;
}

@Injectable({
  providedIn: 'root'
})
export class JsonLensHistoryService {
  private dbName = 'Acklet_JsonLens_DB';
  private storeName = 'payload_history';
  private db: IDBDatabase | null = null;

  constructor() {
    this.initIndexedDB();
  }

  private initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) return resolve();
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        resolve();
      };

      request.onerror = (event: any) => {
        console.warn('IndexedDB unavailable, falling back to LocalStorage', event);
        resolve();
      };
    });
  }

  async savePayload(payload: string, filename: string = 'formatted.json'): Promise<HistoryItem | null> {
    if (!payload || payload.trim() === '') return null;

    const sizeBytes = new Blob([payload]).size;
    const preview = payload.trim().substring(0, 45) + (payload.length > 45 ? '...' : '');

    const item: HistoryItem = {
      id: Date.now().toString(),
      timestamp: new Date(),
      filename: filename || 'formatted.json',
      preview,
      payload,
      sizeBytes
    };

    await this.initIndexedDB();

    if (this.db) {
      return new Promise((resolve) => {
        const tx = this.db!.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        store.put(item);
        tx.oncomplete = () => resolve(item);
        tx.onerror = () => resolve(this.saveLocalStorage(item));
      });
    } else {
      return this.saveLocalStorage(item);
    }
  }

  async getGroupedHistory(): Promise<HistoryGroup[]> {
    const items = await this.getAllItems();

    const today: HistoryItem[] = [];
    const yesterday: HistoryItem[] = [];
    const older: HistoryItem[] = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;

    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    for (const item of items) {
      const time = new Date(item.timestamp).getTime();
      if (time >= startOfToday) {
        today.push(item);
      } else if (time >= startOfYesterday) {
        yesterday.push(item);
      } else {
        older.push(item);
      }
    }

    const groups: HistoryGroup[] = [];
    if (today.length > 0) groups.push({ label: 'Today', items: today });
    if (yesterday.length > 0) groups.push({ label: 'Yesterday', items: yesterday });
    if (older.length > 0) groups.push({ label: 'Older', items: older });

    return groups;
  }

  async deleteItem(id: string): Promise<void> {
    await this.initIndexedDB();
    if (this.db) {
      return new Promise((resolve) => {
        const tx = this.db!.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        store.delete(id);
        tx.oncomplete = () => resolve();
      });
    } else {
      this.deleteLocalStorage(id);
    }
  }

  async clearAll(): Promise<void> {
    await this.initIndexedDB();
    if (this.db) {
      return new Promise((resolve) => {
        const tx = this.db!.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        store.clear();
        tx.oncomplete = () => resolve();
      });
    } else {
      localStorage.removeItem('acklet_jsonlens_history');
    }
  }

  private getAllItems(): Promise<HistoryItem[]> {
    return new Promise((resolve) => {
      if (this.db) {
        const tx = this.db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve(this.getLocalStorageItems());
      } else {
        resolve(this.getLocalStorageItems());
      }
    });
  }

  private saveLocalStorage(item: HistoryItem): HistoryItem {
    const existing = this.getLocalStorageItems();
    const updated = [item, ...existing.filter(i => i.payload !== item.payload).slice(0, 19)];
    localStorage.setItem('acklet_jsonlens_history', JSON.stringify(updated));
    return item;
  }

  private getLocalStorageItems(): HistoryItem[] {
    try {
      const raw = localStorage.getItem('acklet_jsonlens_history');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private deleteLocalStorage(id: string) {
    const existing = this.getLocalStorageItems();
    const updated = existing.filter(i => i.id !== id);
    localStorage.setItem('acklet_jsonlens_history', JSON.stringify(updated));
  }
}

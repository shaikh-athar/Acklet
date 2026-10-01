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
  isPinned?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DataLensHistoryService {
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
    const trimmed = payload.trim();
    const preview = trimmed.length > 400 ? trimmed.substring(0, 400) + '...' : trimmed;

    const item: HistoryItem = {
      id: Date.now().toString(),
      timestamp: new Date(),
      filename: filename || 'formatted.json',
      preview,
      payload,
      sizeBytes,
      isPinned: false
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

    const pinned: HistoryItem[] = [];
    const today: HistoryItem[] = [];
    const yesterday: HistoryItem[] = [];
    const older: HistoryItem[] = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;

    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    for (const item of items) {
      if (item.isPinned) {
        pinned.push(item);
        continue;
      }
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
    if (pinned.length > 0) groups.push({ label: 'Pinned', items: pinned });
    if (today.length > 0) groups.push({ label: 'Today', items: today });
    if (yesterday.length > 0) groups.push({ label: 'Yesterday', items: yesterday });
    if (older.length > 0) groups.push({ label: 'Older', items: older });

    return groups;
  }

  async togglePinItem(id: string): Promise<void> {
    const items = await this.getAllItems();
    const target = items.find(i => i.id === id);
    if (!target) return;

    target.isPinned = !target.isPinned;

    await this.initIndexedDB();
    if (this.db) {
      return new Promise((resolve) => {
        const tx = this.db!.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        store.put(target);
        tx.oncomplete = () => resolve();
      });
    } else {
      const existing = this.getLocalStorageItems();
      const idx = existing.findIndex(i => i.id === id);
      if (idx !== -1) {
        existing[idx].isPinned = target.isPinned;
        localStorage.setItem('acklet_jsonlens_history', JSON.stringify(existing));
      }
    }
  }

  async deleteItem(id: string): Promise<void> {
    this.deleteLocalStorage(id);
    await this.initIndexedDB();
    if (this.db) {
      return new Promise((resolve) => {
        const tx = this.db!.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }
  }

  async clearAll(): Promise<void> {
    localStorage.removeItem('acklet_jsonlens_history');
    await this.initIndexedDB();
    if (this.db) {
      return new Promise((resolve) => {
        const tx = this.db!.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        store.clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
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

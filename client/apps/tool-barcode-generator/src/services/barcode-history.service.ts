// apps/tool-barcode-generator/src/services/barcode-history.service.ts
import { Injectable, signal } from '@angular/core';
import { BarcodeHistoryItem, BarcodeDesignOptions, FormatPerOptions } from '../models/barcode.models';

const STORAGE_KEY = 'acklet_barcode_history_v1';
const PRIVACY_KEY = 'acklet:barcode:privacy-no-save';
const TOTAL_GENERATED_KEY = 'acklet_barcode_total_generated_v1';
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days (1 month)
const MAX_HISTORY_LIMIT = 500;

export interface IHistoryStoreService {
  items: ReturnType<typeof signal<BarcodeHistoryItem[]>>;
  dontSaveHistory: ReturnType<typeof signal<boolean>>;
  totalGeneratedCount: ReturnType<typeof signal<number>>;
  addItem(item: {
    name: string;
    format: string;
    formatLabel: string;
    value: string;
    displayValue: string;
    options: BarcodeDesignOptions;
    formatOptions: FormatPerOptions;
    svg: string;
  }): BarcodeHistoryItem | null;
  updateItem(id: string, updates: Partial<BarcodeHistoryItem>): boolean;
  renameItem(id: string, newName: string): string;
  deleteItem(id: string): void;
  clearAll(): void;
  setDontSaveHistory(enabled: boolean): void;
}

@Injectable({
  providedIn: 'root'
})
export class BarcodeHistoryService implements IHistoryStoreService {
  readonly items = signal<BarcodeHistoryItem[]>([]);
  readonly dontSaveHistory = signal<boolean>(false);
  readonly totalGeneratedCount = signal<number>(0);

  constructor() {
    this.loadPrivacyPreference();
    this.loadFromStorage();
  }

  private loadPrivacyPreference(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const pref = window.localStorage.getItem(PRIVACY_KEY);
      this.dontSaveHistory.set(pref === 'true');
    } catch {
      // Storage unavailable
    }
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      // Load lifetime generated count
      const totalRaw = window.localStorage.getItem(TOTAL_GENERATED_KEY);
      if (totalRaw !== null) {
        const parsedCount = parseInt(totalRaw, 10);
        if (!isNaN(parsedCount) && parsedCount >= 0) {
          this.totalGeneratedCount.set(parsedCount);
        }
      }

      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const now = Date.now();
          // Filter out items older than 30 days
          const validItems = parsed.filter(item => {
            const ts = item.timestamp || now;
            return (now - ts) <= RETENTION_MS;
          });

          this.items.set(validItems.slice(0, MAX_HISTORY_LIMIT));

          // If count was not previously initialized, initialize from items length
          if (totalRaw === null) {
            this.totalGeneratedCount.set(validItems.length);
            window.localStorage.setItem(TOTAL_GENERATED_KEY, String(validItems.length));
          }

          // Save pruned list if expired items were purged
          if (validItems.length !== parsed.length) {
            this.saveToStorage(validItems);
          }
        }
      }
    } catch {
      // Ignore storage errors gracefully
    }
  }

  private saveToStorage(items: BarcodeHistoryItem[]): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Quota exceeded
    }
  }

  private saveTotalGenerated(count: number): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(TOTAL_GENERATED_KEY, String(count));
    } catch {
      // Quota exceeded
    }
  }

  setDontSaveHistory(enabled: boolean): void {
    this.dontSaveHistory.set(enabled);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(PRIVACY_KEY, String(enabled));
      } catch {
        // Storage unavailable
      }
    }
  }

  addItem(item: {
    name: string;
    format: string;
    formatLabel: string;
    value: string;
    displayValue: string;
    options: BarcodeDesignOptions;
    formatOptions: FormatPerOptions;
    svg: string;
  }): BarcodeHistoryItem | null {
    // Increment total generated count regardless of privacy setting
    const nextTotal = this.totalGeneratedCount() + 1;
    this.totalGeneratedCount.set(nextTotal);
    this.saveTotalGenerated(nextTotal);

    if (this.dontSaveHistory()) {
      return null;
    }

    const now = Date.now();
    const current = this.items().filter(existing => (now - (existing.timestamp || now)) <= RETENTION_MS);

    // Deduplicate matching format + value
    const filtered = current.filter(
      existing => !(existing.format === item.format && existing.value === item.value)
    );

    const uniqueName = this.getUniqueName(item.name || 'Barcode 1');

    const newItem: BarcodeHistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: now,
      name: uniqueName,
      format: item.format,
      formatLabel: item.formatLabel,
      value: item.value,
      displayValue: item.displayValue,
      options: { ...item.options },
      formatOptions: { ...item.formatOptions },
      svg: item.svg
    };

    const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_LIMIT);
    this.items.set(updated);
    this.saveToStorage(updated);
    return newItem;
  }

  updateItem(id: string, updates: Partial<BarcodeHistoryItem>): boolean {
    let found = false;
    const updated = this.items().map(it => {
      if (it.id === id) {
        found = true;
        return {
          ...it,
          ...updates,
          timestamp: Date.now()
        };
      }
      return it;
    });

    if (found) {
      this.items.set(updated);
      this.saveToStorage(updated);
    }
    return found;
  }

  getNextFreeBarcodeName(): string {
    const items = this.items();
    const usedNumbers = new Set<number>();
    const regex = /^barcode\s+(\d+)$/i;
    for (const it of items) {
      const match = regex.exec(it.name.trim());
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > 0) {
          usedNumbers.add(num);
        }
      }
    }
    let n = 1;
    while (usedNumbers.has(n)) {
      n++;
    }
    return `Barcode ${n}`;
  }

  getUniqueName(desiredName: string, excludeId?: string): string {
    const raw = (desiredName || '').trim().slice(0, 60);
    if (!raw) {
      return this.getNextFreeBarcodeName();
    }
    const items = this.items().filter(it => it.id !== excludeId);
    const lowerDesired = raw.toLowerCase();
    const exists = items.some(it => it.name.trim().toLowerCase() === lowerDesired);
    if (!exists) {
      return raw;
    }

    // Name already exists: find base name and next free number
    const match = /^(.*?)(?:\s+(\d+))?$/.exec(raw);
    const base = match && match[1] && !/^\d+$/.test(match[1]) ? match[1].trim() : raw;
    const usedNumbers = new Set<number>();

    // Escape special regex characters in base
    const escapedBase = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const numberedRegex = new RegExp(`^${escapedBase}(?:\\s+(\\d+))?$`, 'i');

    for (const it of items) {
      const itTrimmed = it.name.trim();
      const m = numberedRegex.exec(itTrimmed);
      if (m) {
        if (m[1]) {
          const num = parseInt(m[1], 10);
          if (!isNaN(num)) usedNumbers.add(num);
        } else {
          usedNumbers.add(1);
        }
      }
    }

    let n = 2;
    while (usedNumbers.has(n)) {
      n++;
    }
    const candidate = `${base} ${n}`;
    return candidate.slice(0, 60);
  }

  renameItem(id: string, newName: string): string {
    const unique = this.getUniqueName(newName, id);
    const updated = this.items().map(it => (it.id === id ? { ...it, name: unique } : it));
    this.items.set(updated);
    this.saveToStorage(updated);
    return unique;
  }

  deleteItem(id: string): void {
    const updated = this.items().filter(item => item.id !== id);
    this.items.set(updated);
    this.saveToStorage(updated);
  }

  clearAll(): void {
    this.items.set([]);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Storage unavailable
      }
    }
  }
}

export { BarcodeHistoryService as HistoryStoreService };

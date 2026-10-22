// client/apps/tool-qr-generator/src/services/qr-history.service.ts
import { Injectable, signal } from '@angular/core';
import { QRHistoryItem, QROptions } from '../models/qr-generator.models';

const STORAGE_KEY = 'acklet_qr_history_v1';
const MAX_HISTORY_ITEMS = 8;

@Injectable({
  providedIn: 'root'
})
export class QRHistoryService {
  readonly items = signal<QRHistoryItem[]>([]);

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Loads cached history items from localStorage.
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.items.set(parsed.slice(0, MAX_HISTORY_ITEMS));
        }
      }
    } catch {
      // Storage parsing failure ignored gracefully
    }
  }

  /**
   * Persists items to localStorage.
   */
  private saveToStorage(items: QRHistoryItem[]): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Quota exceeded or private browsing restrictions
    }
  }

  /**
   * Adds or updates a generated QR item in the history.
   */
  addItem(item: {
    type: QRHistoryItem['type'];
    content: string;
    formattedPayload: string;
    dataUrl: string;
    options: Partial<QROptions>;
  }): void {
    const current = this.items();

    // Deduplicate if matching payload exists
    const filtered = current.filter(
      existing => existing.formattedPayload !== item.formattedPayload
    );

    const newItem: QRHistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: Date.now(),
      type: item.type,
      content: item.content,
      formattedPayload: item.formattedPayload,
      dataUrl: item.dataUrl,
      options: item.options
    };

    const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    this.items.set(updated);
    this.saveToStorage(updated);
  }

  /**
   * Removes a single history item by id.
   */
  removeItem(id: string): void {
    const updated = this.items().filter(item => item.id !== id);
    this.items.set(updated);
    this.saveToStorage(updated);
  }

  /**
   * Clears all stored QR generation history.
   */
  clearHistory(): void {
    this.items.set([]);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  }
}

// packages/tool-shell/src/services/tool-storage.service.ts
import { Injectable } from '@angular/core';

export const TS_STORAGE_PREFIX = 'ts:v1:';

@Injectable({
  providedIn: 'root'
})
export class ToolStorageService {
  private memoryFallback = new Map<string, string>();

  getItem<T = string>(key: string, defaultValue?: T): T | null {
    const fullKey = this.prefixKey(key);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const item = window.localStorage.getItem(fullKey);
        if (item === null) return defaultValue !== undefined ? defaultValue : null;
        try {
          return JSON.parse(item) as T;
        } catch {
          return item as unknown as T;
        }
      }
    } catch {
      // Storage disabled or private mode quota
    }

    const mem = this.memoryFallback.get(fullKey);
    if (mem !== undefined) {
      try {
        return JSON.parse(mem) as T;
      } catch {
        return mem as unknown as T;
      }
    }
    return defaultValue !== undefined ? defaultValue : null;
  }

  setItem<T = any>(key: string, value: T): void {
    const fullKey = this.prefixKey(key);
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(fullKey, serialized);
        return;
      }
    } catch {
      // Fallback to memory
    }
    this.memoryFallback.set(fullKey, serialized);
  }

  removeItem(key: string): void {
    const fullKey = this.prefixKey(key);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(fullKey);
      }
    } catch {}
    this.memoryFallback.delete(fullKey);
  }

  clearPreferences(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(TS_STORAGE_PREFIX)) {
            keysToRemove.push(k);
          }
        }
        for (const k of keysToRemove) {
          window.localStorage.removeItem(k);
        }
      }
    } catch {}
    this.memoryFallback.clear();
  }

  private prefixKey(key: string): string {
    return key.startsWith(TS_STORAGE_PREFIX) ? key : `${TS_STORAGE_PREFIX}${key}`;
  }
}

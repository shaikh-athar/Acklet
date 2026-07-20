import { Injectable } from '@angular/core';
import {
  PREF_KEY_PREFS, PREF_KEY_ACTIVITY, PREF_KEY_FAVORITES,
  PREF_KEY_SYNC_META, PREF_KEY_TOOL_PREFS, PREF_STORE_VERSION,
  DEFAULT_PREFERENCES, DEFAULT_FAVORITES_STORE,
  UserPreferences, ActivityItem, FavoritesStore, SyncMeta
} from '../models/preference.model';

const ACTIVITY_MAX = 100;
const ACTIVITY_TTL_DAYS = 30;

/**
 * Low-level storage adapter.
 * - All reads/writes are namespaced and versioned.
 * - Corrupt data falls back to defaults (never throws).
 * - Activity is pruned by count cap and TTL on every read.
 */
@Injectable({ providedIn: 'root' })
export class LocalPreferenceService {

  // ── Prefs ─────────────────────────────────────────────────────────────────

  getPrefs(): UserPreferences {
    return this.read<UserPreferences>(PREF_KEY_PREFS, DEFAULT_PREFERENCES);
  }

  savePrefs(prefs: UserPreferences): void {
    this.write(PREF_KEY_PREFS, prefs);
  }

  patchPrefs(patch: Partial<UserPreferences>): UserPreferences {
    const current = this.getPrefs();
    const updated = this.deepMerge(current, patch) as UserPreferences;
    this.savePrefs(updated);
    return updated;
  }

  // ── Activity ──────────────────────────────────────────────────────────────

  getActivity(): ActivityItem[] {
    const raw = this.read<ActivityItem[]>(PREF_KEY_ACTIVITY, []);
    return this.pruneActivity(raw);
  }

  pushActivity(item: ActivityItem): void {
    const list = this.getActivity();
    // Deduplicate: remove previous entry for same entity+type
    const filtered = list.filter(
      a => !(a.entityId === item.entityId && a.entityType === item.entityType)
    );
    const updated = [item, ...filtered].slice(0, ACTIVITY_MAX);
    this.write(PREF_KEY_ACTIVITY, updated);
  }

  getRecentByType(type: string, limit = 10): ActivityItem[] {
    return this.getActivity()
      .filter(a => a.entityType === type)
      .slice(0, limit);
  }

  clearActivity(): void {
    localStorage.removeItem(PREF_KEY_ACTIVITY);
  }

  write_activity(items: ActivityItem[]): void {
    this.write(PREF_KEY_ACTIVITY, items);
  }

  // ── Favorites ─────────────────────────────────────────────────────────────

  getFavorites(): FavoritesStore {
    return this.read<FavoritesStore>(PREF_KEY_FAVORITES, DEFAULT_FAVORITES_STORE);
  }

  saveFavorites(store: FavoritesStore): void {
    this.write(PREF_KEY_FAVORITES, store);
  }

  // ── Tool Preferences ──────────────────────────────────────────────────────

  getToolPrefs(slug: string): Record<string, any> {
    return this.read<Record<string, any>>(PREF_KEY_TOOL_PREFS(slug), {});
  }

  saveToolPrefs(slug: string, prefs: Record<string, any>): void {
    this.write(PREF_KEY_TOOL_PREFS(slug), prefs);
  }

  // ── Sync Metadata ─────────────────────────────────────────────────────────

  getSyncMeta(): SyncMeta {
    return this.read<SyncMeta>(PREF_KEY_SYNC_META, {
      deviceId: this.generateDeviceId(),
      lastSyncAt: null,
      syncVersion: PREF_STORE_VERSION,
    });
  }

  saveSyncMeta(meta: SyncMeta): void {
    this.write(PREF_KEY_SYNC_META, meta);
  }

  // ── Schema Migration ──────────────────────────────────────────────────────

  /**
   * Runs once on app start. Migrates legacy keys (e.g. ThemeService's
   * 'acklet-theme') into the new namespaced structure.
   */
  migrate(): void {
    try {
      // Migrate old ThemeService key
      const legacyTheme = localStorage.getItem('acklet-theme') as 'dark' | 'light' | null;
      if (legacyTheme && (legacyTheme === 'dark' || legacyTheme === 'light')) {
        const prefs = this.getPrefs();
        if (prefs.theme !== legacyTheme) {
          this.patchPrefs({ theme: legacyTheme });
        }
        // Don't remove legacy key — ThemeService still reads it for backward compat
      }
    } catch {
      // Migration errors are non-fatal
    }
  }

  // ── Clear All ─────────────────────────────────────────────────────────────

  clearAll(): void {
    Object.keys(localStorage)
      .filter(k => k.startsWith('acklet:'))
      .forEach(k => localStorage.removeItem(k));
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  private read<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  private write(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage quota exceeded — silently swallow
    }
  }

  private pruneActivity(list: ActivityItem[]): ActivityItem[] {
    const cutoff = Date.now() - ACTIVITY_TTL_DAYS * 24 * 60 * 60 * 1000;
    return list
      .filter(a => new Date(a.accessedAt).getTime() > cutoff)
      .slice(0, ACTIVITY_MAX);
  }

  private generateDeviceId(): string {
    const id = 'device_' + Math.random().toString(36).slice(2) + '_' + Date.now();
    return id;
  }

  private deepMerge(target: any, source: any): any {
    const out = { ...target };
    for (const key of Object.keys(source)) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        out[key] = this.deepMerge(target[key] ?? {}, source[key]);
      } else {
        out[key] = source[key];
      }
    }
    return out;
  }
}

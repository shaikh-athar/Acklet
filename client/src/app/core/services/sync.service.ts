import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';
import { LocalPreferenceService } from './local-preference.service';
import { PreferenceService } from './preference.service';
import { ActivityService } from './activity.service';
import { FavoritesService } from './favorites.service';
import { SyncRequest, SyncResponse } from '../models/preference.model';

const API = '/api/v1/preferences';

/**
 * Delta sync engine.
 * - Triggered lazily after login (non-blocking).
 * - Sends only the delta since last sync.
 * - On success: merges server state into all local services.
 * - On failure: silently continues with local data.
 */
@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly http = inject(HttpClient);
  private readonly local = inject(LocalPreferenceService);
  private readonly prefsSvc = inject(PreferenceService);
  private readonly activitySvc = inject(ActivityService);
  private readonly favoritesSvc = inject(FavoritesService);

  /**
   * Called by AuthService immediately after a successful login.
   * Runs in background — never blocks the UI.
   */
  onLogin(): void {
    setTimeout(() => this.performSync(), 500);
  }

  /**
   * Called by AuthService on logout.
   * Clears sync metadata so the next login does a full sync.
   */
  onLogout(): void {
    const meta = this.local.getSyncMeta();
    this.local.saveSyncMeta({ ...meta, lastSyncAt: null });
  }

  private performSync(): void {
    const meta = this.local.getSyncMeta();
    const currentPrefs = this.prefsSvc.prefs();
    const allFavorites = this.favoritesSvc.getAllAsList();
    const activitySince = this.activitySvc.getSince(meta.lastSyncAt);
    const toolPrefsSnapshot = this.buildToolPrefsSnapshot();

    const payload: SyncRequest = {
      deviceId: meta.deviceId,
      lastSyncAt: meta.lastSyncAt,
      prefsDelta: currentPrefs,
      favoritesSnapshot: allFavorites,
      activitySince,
      toolPrefsSnapshot,
    };

    this.http.post<{ data: SyncResponse }>(`${API}/sync`, payload).pipe(
      tap(res => this.applySyncResponse(res.data, meta.deviceId)),
      catchError(err => {
        // Network error — silently continue with local state
        console.debug('[SyncService] Sync failed, continuing offline:', err.message);
        return of(null);
      })
    ).subscribe();
  }

  private applySyncResponse(res: SyncResponse, deviceId: string): void {
    if (!res) return;

    // Merge preferences
    this.prefsSvc.mergeFromServer(res.mergedPrefs);

    // Merge favorites (union — never remove locally saved favorites)
    this.favoritesSvc.mergeFromServer(res.mergedFavorites);

    // Merge tool prefs
    for (const tp of res.mergedToolPrefs ?? []) {
      this.local.saveToolPrefs(tp.toolSlug, tp.preferences);
    }

    // Update sync metadata
    this.local.saveSyncMeta({
      deviceId,
      lastSyncAt: res.syncedAt,
      syncVersion: 1,
    });
  }

  private buildToolPrefsSnapshot(): Record<string, Record<string, any>> {
    // Read all known tool pref keys from localStorage
    const snapshot: Record<string, Record<string, any>> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.includes(':tool-prefs:')) {
          const slug = key.split(':tool-prefs:')[1];
          if (slug) {
            snapshot[slug] = this.local.getToolPrefs(slug);
          }
        }
      }
    } catch { /* storage enumeration failed */ }
    return snapshot;
  }
}

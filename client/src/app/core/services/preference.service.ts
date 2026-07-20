import { Injectable, computed, inject, signal, effect } from '@angular/core';
import { LocalPreferenceService } from './local-preference.service';
import {
  UserPreferences, DEFAULT_PREFERENCES,
  HomepagePreferences, SearchPreferences
} from '../models/preference.model';

/**
 * Main reactive preference store.
 * Works 100% offline — all state lives in signals backed by localStorage.
 * Backend sync is handled separately by SyncService.
 */
@Injectable({ providedIn: 'root' })
export class PreferenceService {
  private readonly local = inject(LocalPreferenceService);

  // ── Core signals ──────────────────────────────────────────────────────────
  private readonly _prefs = signal<UserPreferences>(this.loadInitial());

  // ── Public read-only signals ──────────────────────────────────────────────
  readonly prefs = this._prefs.asReadonly();

  readonly theme      = computed(() => this._prefs().theme);
  readonly viewMode   = computed(() => this._prefs().viewMode);
  readonly cardSize   = computed(() => this._prefs().cardSize);
  readonly density    = computed(() => this._prefs().density);
  readonly sidebarOpen = computed(() => this._prefs().sidebarOpen);
  readonly language   = computed(() => this._prefs().language);
  readonly search     = computed(() => this._prefs().search);
  readonly homepage   = computed(() => this._prefs().homepage);

  constructor() {
    // Run storage migration once on startup
    this.local.migrate();

    // Auto-save: persist any signal change to localStorage (debounced via effect)
    effect(() => {
      const current = this._prefs();
      this.local.savePrefs(current);
    });

    // Keep DOM in sync with theme signal
    effect(() => {
      const t = this._prefs().theme;
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem('acklet-theme', t); // keep legacy key in sync
      }
    });
  }

  // ── Theme ──────────────────────────────────────────────────────────────────

  setTheme(theme: 'dark' | 'light'): void {
    this.patch({ theme });
  }

  toggleTheme(): void {
    const next = this._prefs().theme === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  // ── View ───────────────────────────────────────────────────────────────────

  setViewMode(viewMode: 'grid' | 'list'): void {
    this.patch({ viewMode });
  }

  setCardSize(cardSize: 'compact' | 'normal' | 'large'): void {
    this.patch({ cardSize });
  }

  setDensity(density: 'comfortable' | 'compact'): void {
    this.patch({ density });
  }

  setSidebarOpen(sidebarOpen: boolean): void {
    this.patch({ sidebarOpen });
  }

  // ── Search ──────────────────────────────────────────────────────────────────

  addRecentSearch(query: string): void {
    const current = this._prefs().search;
    const filtered = current.recentSearches.filter(s => s !== query);
    const updated: SearchPreferences = {
      ...current,
      recentSearches: [query, ...filtered].slice(0, 20),
    };
    this.patch({ search: updated });
  }

  clearRecentSearches(): void {
    this.patch({ search: { ...this._prefs().search, recentSearches: [] } });
  }

  setSearchPrefs(search: Partial<SearchPreferences>): void {
    this.patch({ search: { ...this._prefs().search, ...search } });
  }

  // ── Homepage ────────────────────────────────────────────────────────────────

  setHomepagePrefs(homepage: Partial<HomepagePreferences>): void {
    this.patch({ homepage: { ...this._prefs().homepage, ...homepage } });
  }

  dismissTip(tipId: string): void {
    const current = this._prefs().dismissedTips;
    if (!current.includes(tipId)) {
      this.patch({ dismissedTips: [...current, tipId] });
    }
  }

  dismissAnnouncement(id: string): void {
    const current = this._prefs().dismissedAnnouncements;
    if (!current.includes(id)) {
      this.patch({ dismissedAnnouncements: [...current, id] });
    }
  }

  isTipDismissed(tipId: string): boolean {
    return this._prefs().dismissedTips.includes(tipId);
  }

  // ── Bulk operations ────────────────────────────────────────────────────────

  /**
   * Merge server-returned preferences into local state.
   * Called by SyncService after a successful sync.
   */
  mergeFromServer(serverPrefs: UserPreferences): void {
    this._prefs.set(serverPrefs);
  }

  resetToDefaults(): void {
    this._prefs.set(DEFAULT_PREFERENCES);
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private patch(partial: Partial<UserPreferences>): void {
    this._prefs.update(current => ({ ...current, ...partial }));
  }

  private loadInitial(): UserPreferences {
    return this.local.getPrefs();
  }
}

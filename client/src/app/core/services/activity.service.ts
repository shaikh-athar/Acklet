import { Injectable, computed, inject, signal } from '@angular/core';
import { LocalPreferenceService } from './local-preference.service';
import { PreferenceService } from './preference.service';
import { ActivityItem, EntityType } from '../models/preference.model';

/**
 * Tracks user activity: recently viewed tools, categories, searches, etc.
 * Works offline — all state is in signals backed by localStorage.
 * Backend push is batched in SyncService.
 */
@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly local = inject(LocalPreferenceService);
  private readonly prefsSvc = inject(PreferenceService);

  private readonly _activity = signal<ActivityItem[]>(this.local.getActivity());

  readonly activity = this._activity.asReadonly();

  readonly recentTools = computed(() =>
    this._activity().filter(a => a.entityType === 'TOOL').slice(0, 10)
  );

  readonly recentCategories = computed(() =>
    this._activity().filter(a => a.entityType === 'CATEGORY').slice(0, 10)
  );

  readonly recentSearches = computed(() =>
    this._activity().filter(a => a.entityType === 'SEARCH').slice(0, 15)
  );

  readonly recentCollections = computed(() =>
    this._activity().filter(a => a.entityType === 'COLLECTION').slice(0, 5)
  );

  /**
   * Record a navigation/view event.
   * Deduplicates by entityId+entityType (most recent wins at top).
   */
  track(item: Omit<ActivityItem, 'accessedAt'>): void {
    const entry: ActivityItem = {
      ...item,
      accessedAt: new Date().toISOString(),
    };
    this.local.pushActivity(entry);
    this._activity.set(this.local.getActivity());

    // Also add to search recent queries in PreferenceService
    if (item.entityType === 'SEARCH' && item.entityName) {
      this.prefsSvc.addRecentSearch(item.entityName);
    }
  }

  trackTool(id: string, slug: string, name: string): void {
    this.track({ entityType: 'TOOL', entityId: id, entitySlug: slug, entityName: name });
  }

  trackCategory(id: string, slug: string, name: string): void {
    this.track({ entityType: 'CATEGORY', entityId: id, entitySlug: slug, entityName: name });
  }

  trackSearch(query: string): void {
    this.track({ entityType: 'SEARCH', entityId: query, entityName: query });
  }

  trackCollection(id: string, slug: string, name: string): void {
    this.track({ entityType: 'COLLECTION', entityId: id, entitySlug: slug, entityName: name });
  }

  getByType(type: EntityType, limit = 10): ActivityItem[] {
    return this._activity().filter(a => a.entityType === type).slice(0, limit);
  }

  /** Returns activity items added since a given ISO timestamp */
  getSince(since: string | null): ActivityItem[] {
    if (!since) return this._activity();
    const cutoff = new Date(since).getTime();
    return this._activity().filter(a => new Date(a.accessedAt).getTime() > cutoff);
  }

  clear(): void {
    this.local.clearActivity();
    this._activity.set([]);
  }

  /** Called by SyncService to restore server-side activity into local state */
  mergeFromServer(items: ActivityItem[]): void {
    // Union merge — server items not already in local are added
    const current = this._activity();
    const currentIds = new Set(current.map(a => `${a.entityType}:${a.entityId}`));
    const newItems = items.filter(i => !currentIds.has(`${i.entityType}:${i.entityId}`));
    const merged = [...newItems, ...current]
      .sort((a, b) => new Date(b.accessedAt).getTime() - new Date(a.accessedAt).getTime())
      .slice(0, 100);
    this._activity.set(merged);
    this.local.write_activity(merged);
  }
}

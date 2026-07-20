import { Injectable, computed, inject, signal } from '@angular/core';
import { LocalPreferenceService } from './local-preference.service';
import { EntityType, FavoriteItem, FavoritesStore, DEFAULT_FAVORITES_STORE } from '../models/preference.model';

/**
 * Unified favorites across all entity types.
 * Works offline — backed by localStorage signal state.
 * Sync is delegated to SyncService.
 */
@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly local = inject(LocalPreferenceService);

  private readonly _store = signal<FavoritesStore>(this.local.getFavorites());

  readonly store = this._store.asReadonly();

  readonly favoriteTools       = computed(() => this._store().tools);
  readonly favoriteCategories  = computed(() => this._store().categories);
  readonly favoriteCollections = computed(() => this._store().collections);
  readonly favoriteBlogs       = computed(() => this._store().blogs);
  readonly favoriteGuides      = computed(() => this._store().guides);

  readonly totalCount = computed(() =>
    this._store().tools.length +
    this._store().categories.length +
    this._store().collections.length +
    this._store().blogs.length +
    this._store().guides.length
  );

  isFavorited(entityType: EntityType, entityId: string): boolean {
    return this.getList(entityType).some(f => f.entityId === entityId);
  }

  toggle(entityType: EntityType, entityId: string, entityName?: string, entitySlug?: string): void {
    if (this.isFavorited(entityType, entityId)) {
      this.remove(entityType, entityId);
    } else {
      this.add(entityType, entityId, entityName, entitySlug);
    }
  }

  add(entityType: EntityType, entityId: string, entityName?: string, entitySlug?: string): void {
    if (this.isFavorited(entityType, entityId)) return;
    const item: FavoriteItem = {
      entityType,
      entityId,
      entityName,
      entitySlug,
      pinned: false,
      createdAt: new Date().toISOString(),
    };
    this.updateList(entityType, list => [item, ...list]);
  }

  remove(entityType: EntityType, entityId: string): void {
    this.updateList(entityType, list => list.filter(f => f.entityId !== entityId));
  }

  pin(entityType: EntityType, entityId: string): void {
    this.updateList(entityType, list =>
      list.map(f => f.entityId === entityId
        ? { ...f, pinned: true, pinnedAt: new Date().toISOString() }
        : f)
    );
  }

  unpin(entityType: EntityType, entityId: string): void {
    this.updateList(entityType, list =>
      list.map(f => f.entityId === entityId
        ? { ...f, pinned: false, pinnedAt: undefined }
        : f)
    );
  }

  getAllAsList(): FavoriteItem[] {
    const s = this._store();
    return [...s.tools, ...s.categories, ...s.collections, ...s.blogs, ...s.guides];
  }

  /** Called by SyncService after login — union merge from server (never silently delete) */
  mergeFromServer(serverItems: FavoriteItem[]): void {
    const store = { ...this._store() };
    for (const item of serverItems) {
      const list = this.getListFromStore(store, item.entityType as EntityType);
      if (!list.some(f => f.entityId === item.entityId)) {
        list.unshift(item);
      }
    }
    this._store.set(store);
    this.local.saveFavorites(store);
  }

  clear(): void {
    this._store.set({ ...DEFAULT_FAVORITES_STORE });
    this.local.saveFavorites({ ...DEFAULT_FAVORITES_STORE });
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private getList(type: EntityType): FavoriteItem[] {
    return this.getListFromStore(this._store(), type);
  }

  private getListFromStore(store: FavoritesStore, type: EntityType): FavoriteItem[] {
    switch (type) {
      case 'TOOL':       return store.tools;
      case 'CATEGORY':   return store.categories;
      case 'COLLECTION': return store.collections;
      case 'BLOG':       return store.blogs;
      case 'GUIDE':      return store.guides;
      default:           return [];
    }
  }

  private updateList(type: EntityType, fn: (list: FavoriteItem[]) => FavoriteItem[]): void {
    this._store.update(store => {
      const updated = { ...store };
      switch (type) {
        case 'TOOL':       updated.tools       = fn(store.tools);       break;
        case 'CATEGORY':   updated.categories  = fn(store.categories);  break;
        case 'COLLECTION': updated.collections = fn(store.collections); break;
        case 'BLOG':       updated.blogs       = fn(store.blogs);       break;
        case 'GUIDE':      updated.guides      = fn(store.guides);      break;
      }
      this.local.saveFavorites(updated);
      return updated;
    });
  }
}

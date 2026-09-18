import { Injectable } from '@angular/core';

export interface CachedResource {
  id: string;
  blob: Blob;
  objectUrl: string;
  byteSize: number;
  lastAccessedAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class AirVaultResourceCacheService {
  // Max in-memory cache budget: 1 GB (expanded from 500 MB)
  private readonly MAX_CACHE_BYTES = 1024 * 1024 * 1024;
  private cache = new Map<string, CachedResource>();
  private currentCacheBytes = 0;

  // In-flight request deduplication map (Promise-based)
  private inFlightRequests = new Map<string, Promise<Blob | null>>();

  /**
   * Retrieves a resource from the in-memory LRU cache if present.
   */
  get(id: string): CachedResource | null {
    const entry = this.cache.get(id);
    if (!entry) return null;
    // Update access time for LRU
    entry.lastAccessedAt = Date.now();
    return entry;
  }

  /**
   * Puts a binary Blob into the LRU cache, evicting older entries if exceeding the budget.
   */
  put(id: string, blob: Blob): string {
    if (this.cache.has(id)) {
      const existing = this.cache.get(id)!;
      existing.lastAccessedAt = Date.now();
      return existing.objectUrl;
    }

    const size = blob.size;
    // Evict least recently accessed entries if size exceeds budget
    while (this.currentCacheBytes + size > this.MAX_CACHE_BYTES && this.cache.size > 0) {
      this.evictLru();
    }

    const objectUrl = URL.createObjectURL(blob);
    const entry: CachedResource = {
      id,
      blob,
      objectUrl,
      byteSize: size,
      lastAccessedAt: Date.now()
    };

    this.cache.set(id, entry);
    this.currentCacheBytes += size;
    return objectUrl;
  }

  /**
   * Deduplicated fetch: If multiple components request the same resource ID simultaneously,
   * share a single Promise and populate the cache on completion.
   */
  async fetchDeduplicated(
    id: string,
    fetcher: () => Promise<Blob | null>
  ): Promise<{ blob: Blob | null; objectUrl: string | null }> {
    // 1. In-memory cache hit
    const cached = this.get(id);
    if (cached) {
      return { blob: cached.blob, objectUrl: cached.objectUrl };
    }

    // 2. Reuse in-flight request if one is already active
    if (this.inFlightRequests.has(id)) {
      const blob = await this.inFlightRequests.get(id)!;
      if (!blob) return { blob: null, objectUrl: null };
      const objectUrl = this.get(id)?.objectUrl || this.put(id, blob);
      return { blob, objectUrl };
    }

    // 3. Initiate new fetch Promise
    const fetchPromise = (async () => {
      try {
        return await fetcher();
      } catch (err) {
        console.warn(`[AirVault Cache] Fetch error for ${id}:`, err);
        return null;
      } finally {
        this.inFlightRequests.delete(id);
      }
    })();

    this.inFlightRequests.set(id, fetchPromise);
    const blob = await fetchPromise;
    if (!blob) {
      return { blob: null, objectUrl: null };
    }

    const objectUrl = this.put(id, blob);
    return { blob, objectUrl };
  }

  /**
   * Evicts least recently accessed item from cache and revokes its Object URL
   */
  private evictLru() {
    let oldestId: string | null = null;
    let oldestTime = Infinity;

    for (const [id, entry] of this.cache.entries()) {
      if (entry.lastAccessedAt < oldestTime) {
        oldestTime = entry.lastAccessedAt;
        oldestId = id;
      }
    }

    if (oldestId) {
      const entry = this.cache.get(oldestId)!;
      try {
        URL.revokeObjectURL(entry.objectUrl);
      } catch {}
      this.currentCacheBytes -= entry.byteSize;
      this.cache.delete(oldestId);
    }
  }

  /**
   * Clears the entire in-memory cache and revokes all Object URLs
   */
  clear() {
    for (const entry of this.cache.values()) {
      try {
        URL.revokeObjectURL(entry.objectUrl);
      } catch {}
    }
    this.cache.clear();
    this.currentCacheBytes = 0;
    this.inFlightRequests.clear();
  }
}

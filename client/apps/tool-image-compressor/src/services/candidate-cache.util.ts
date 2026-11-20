// apps/tool-image-compressor/src/services/candidate-cache.util.ts
/**
 * Phase 3: In-Memory Candidate Result Cache.
 *
 * Caches actual encoded candidate blobs and metrics to avoid duplicate WASM and canvas
 * encoding operations during multi-candidate exploration, bracketed searches, and re-encodes.
 * Enforces a bounded memory footprint (FIFO/LRU eviction).
 */

export interface CachedCandidateEntry {
  blob: Blob;
  size: number;
  mimeType: string;
  quality: number;
  width: number;
  height: number;
  isLossless: boolean;
  ssim?: number;
  psnr?: number;
  strategyName: string;
  configDescription: string;
  cachedAt: number;
}

export class CandidateCache {
  private readonly cache = new Map<string, CachedCandidateEntry>();
  private readonly maxEntries: number;
  private hitsCount = 0;
  private missesCount = 0;

  constructor(maxEntries = 64) {
    this.maxEntries = maxEntries;
  }

  /**
   * Generates a deterministic cache key from image geometry, target format, quality, and options.
   */
  static generateKey(
    width: number,
    height: number,
    mimeType: string,
    quality: number,
    options?: Record<string, any>
  ): string {
    const optSummary = options ? JSON.stringify(options) : '';
    return `${width}x${height}:${mimeType}:q${Math.round(quality)}:${optSummary}`;
  }

  get(key: string): CachedCandidateEntry | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      this.hitsCount++;
      return entry;
    }
    this.missesCount++;
    return undefined;
  }

  set(key: string, entry: Omit<CachedCandidateEntry, 'cachedAt'>): void {
    if (this.cache.size >= this.maxEntries) {
      // Evict oldest entry (FIFO)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, { ...entry, cachedAt: Date.now() });
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
    this.hitsCount = 0;
    this.missesCount = 0;
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): { size: number; hits: number; misses: number; hitRatio: number } {
    const total = this.hitsCount + this.missesCount;
    return {
      size: this.cache.size,
      hits: this.hitsCount,
      misses: this.missesCount,
      hitRatio: total > 0 ? Math.round((this.hitsCount / total) * 100) / 100 : 0
    };
  }
}

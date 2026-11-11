// client/apps/tool-file-converter/src/services/format-comparison.service.ts
import { Injectable, signal } from '@angular/core';

export interface FormatTileResult {
  format: 'webp' | 'avif' | 'png' | 'jpg';
  label: string;
  loading: boolean;
  blob?: Blob;
  previewUrl?: string;
  sizeBytes: number;
  sizeFormatted: string;
  deltaPercent: number; // e.g. -62
  isSmallest: boolean;
  fitsTarget: boolean;
  unsupported?: boolean;
  unsupportedReason?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FormatComparisonService {
  private cache = new Map<string, FormatTileResult>();
  private avifSupported: boolean | null = null;

  readonly isComparing = signal<boolean>(false);
  readonly activeJobId = signal<string | null>(null);

  /**
   * Generates a deterministic cache key for a format candidate encode.
   */
  getCacheKey(fileId: string, format: string, quality: number, resizeKey: string): string {
    const qFixed = Math.round(quality * 100);
    return `${fileId}_${format.toLowerCase()}_q${qFixed}_${resizeKey}`;
  }

  /**
   * Clears in-memory comparison tile cache.
   */
  clearCache(fileId?: string): void {
    if (!fileId) {
      this.cache.clear();
      return;
    }
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith(`${fileId}_`)) {
        this.cache.delete(key);
      }
    }
  }

  getCachedTile(cacheKey: string): FormatTileResult | undefined {
    return this.cache.get(cacheKey);
  }

  setCachedTile(cacheKey: string, tile: FormatTileResult): void {
    this.cache.set(cacheKey, tile);
  }

  /**
   * Tests whether the current browser engine natively supports encoding into image/avif.
   */
  async isAvifEncodingSupported(): Promise<boolean> {
    if (this.avifSupported !== null) return this.avifSupported;
    if (typeof HTMLCanvasElement === 'undefined' && typeof OffscreenCanvas === 'undefined') {
      this.avifSupported = false;
      return false;
    }

    try {
      if (typeof OffscreenCanvas !== 'undefined') {
        const offscreen = new OffscreenCanvas(2, 2);
        const blob = await offscreen.convertToBlob({ type: 'image/avif' });
        this.avifSupported = blob !== null && blob.type === 'image/avif';
        return this.avifSupported;
      }

      const canvas = document.createElement('canvas');
      canvas.width = 2;
      canvas.height = 2;
      const supported = await new Promise<boolean>(resolve => {
        canvas.toBlob(blob => {
          resolve(blob !== null && blob.type === 'image/avif');
        }, 'image/avif');
      });
      this.avifSupported = supported;
      return supported;
    } catch (_) {
      this.avifSupported = false;
      return false;
    }
  }

  /**
   * Annotates tiles with 'Smallest' and 'Fits target' badges based on byte sizes.
   */
  computeTileBadges(tiles: FormatTileResult[], targetBytes?: number): FormatTileResult[] {
    const validTiles = tiles.filter(t => !t.unsupported && !t.loading && t.sizeBytes > 0);
    if (validTiles.length === 0) return tiles;

    let minSize = Infinity;
    for (const t of validTiles) {
      if (t.sizeBytes < minSize) {
        minSize = t.sizeBytes;
      }
    }

    return tiles.map(tile => {
      const isSmallest = !tile.unsupported && !tile.loading && tile.sizeBytes === minSize;
      const fitsTarget = !!targetBytes && targetBytes > 0 && !tile.unsupported && !tile.loading && tile.sizeBytes <= targetBytes;
      return {
        ...tile,
        isSmallest,
        fitsTarget
      };
    });
  }

  formatBytes(bytes: number): string {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${Math.round(bytes / 1024)} KB`;
  }
}


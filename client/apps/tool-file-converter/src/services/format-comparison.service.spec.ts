// client/apps/tool-file-converter/src/services/format-comparison.service.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { FormatComparisonService, FormatTileResult } from './format-comparison.service';

describe('FormatComparisonService Unit Tests', () => {
  let service: FormatComparisonService;

  beforeEach(() => {
    service = new FormatComparisonService();
  });

  it('should generate consistent and deterministic cache keys', () => {
    const key1 = service.getCacheKey('img-1', 'webp', 0.85, 'orig');
    const key2 = service.getCacheKey('img-1', 'WEBP', 0.85, 'orig');
    expect(key1).toBe('img-1_webp_q85_orig');
    expect(key2).toBe('img-1_webp_q85_orig');
  });

  it('should store, retrieve, and clear cached tile results', () => {
    const key = service.getCacheKey('img-1', 'png', 1.0, '1920');
    const mockTile: FormatTileResult = {
      format: 'png',
      label: 'PNG',
      loading: false,
      sizeBytes: 45000,
      sizeFormatted: '44 KB',
      deltaPercent: -15,
      isSmallest: false,
      fitsTarget: false
    };

    service.setCachedTile(key, mockTile);
    expect(service.getCachedTile(key)).toEqual(mockTile);

    service.clearCache('img-1');
    expect(service.getCachedTile(key)).toBeUndefined();
  });

  it('should accurately compute Smallest and Fits target labels', () => {
    const tiles: FormatTileResult[] = [
      { format: 'webp', label: 'WebP', loading: false, sizeBytes: 50000, sizeFormatted: '49 KB', deltaPercent: -50, isSmallest: false, fitsTarget: false },
      { format: 'avif', label: 'AVIF', loading: false, sizeBytes: 35000, sizeFormatted: '34 KB', deltaPercent: -65, isSmallest: false, fitsTarget: false },
      { format: 'png', label: 'PNG', loading: false, sizeBytes: 120000, sizeFormatted: '117 KB', deltaPercent: 20, isSmallest: false, fitsTarget: false },
      { format: 'jpg', label: 'JPG', loading: false, sizeBytes: 70000, sizeFormatted: '68 KB', deltaPercent: -30, isSmallest: false, fitsTarget: false }
    ];

    const targetBytes = 60000; // 60 KB
    const annotated = service.computeTileBadges(tiles, targetBytes);

    const avifTile = annotated.find(t => t.format === 'avif');
    const webpTile = annotated.find(t => t.format === 'webp');
    const pngTile = annotated.find(t => t.format === 'png');

    // AVIF is smallest (35000 bytes)
    expect(avifTile?.isSmallest).toBe(true);
    expect(avifTile?.fitsTarget).toBe(true);

    // WebP fits target (50000 <= 60000), but is not smallest
    expect(webpTile?.isSmallest).toBe(false);
    expect(webpTile?.fitsTarget).toBe(true);

    // PNG does not fit target (120000 > 60000)
    expect(pngTile?.isSmallest).toBe(false);
    expect(pngTile?.fitsTarget).toBe(false);
  });

  it('should gracefully handle unsupported encoder states', () => {
    const tiles: FormatTileResult[] = [
      { format: 'webp', label: 'WebP', loading: false, sizeBytes: 50000, sizeFormatted: '49 KB', deltaPercent: -50, isSmallest: false, fitsTarget: false },
      { format: 'avif', label: 'AVIF', loading: false, sizeBytes: 0, sizeFormatted: '-', deltaPercent: 0, isSmallest: false, fitsTarget: false, unsupported: true, unsupportedReason: 'Not supported in this browser' }
    ];

    const annotated = service.computeTileBadges(tiles, 60000);
    const avifTile = annotated.find(t => t.format === 'avif');
    const webpTile = annotated.find(t => t.format === 'webp');

    // Unsupported tile should not be marked smallest or fit target
    expect(avifTile?.isSmallest).toBe(false);
    expect(avifTile?.fitsTarget).toBe(false);
    expect(webpTile?.isSmallest).toBe(true);
  });
});


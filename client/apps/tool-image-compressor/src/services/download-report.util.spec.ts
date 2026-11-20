// apps/tool-image-compressor/src/services/download-report.util.spec.ts
import { describe, it, expect } from 'vitest';
import { calculateBeforeDownloadReport } from './download-report.util';
import { ImageItem } from '../models/compressor.models';

describe('Feature 7: Before-You-Download Report Calculations', () => {
  const createMockItem = (overrides: Partial<ImageItem>): ImageItem => ({
    id: 'mock-' + Math.random(),
    file: new File([''], 'test.jpg'),
    originalName: 'test.jpg',
    originalSize: 100000,
    originalFormat: 'jpeg',
    width: 1920,
    height: 1080,
    previewUrl: 'blob:preview',
    status: 'completed',
    capabilities: {
      previewSupported: true,
      directEncodeSupported: true,
      transcodeRequired: false,
      losslessSupported: false,
      animationSupported: false,
      alphaSupported: false
    },
    settings: {
      outputFormat: 'original',
      quality: { mode: 'manual', manualQuality: 80 },
      targetSize: { enabled: false, targetBytes: 50000 },
      resize: { enabled: false, mode: 'percentage', percentage: 100 },
      transforms: { rotate: 0, flipH: false, flipV: false },
      stripMetadata: true
    },
    ...overrides
  });

  it('calculates totals and formatted line 1 for saved files', () => {
    // 3 files: total orig = 70 KB, total comp = 28 KB -> saved = 42 KB (60%)
    const items: ImageItem[] = [
      createMockItem({
        originalSize: 20 * 1024,
        result: {
          outputBlob: new Blob([]),
          outputUrl: 'blob:1',
          outputFormat: 'jpeg',
          originalSize: 20 * 1024,
          compressedSize: 8 * 1024,
          savedBytes: 12 * 1024,
          savedPercentage: 60,
          durationMs: 20,
          isLargerThanOriginal: false,
          alreadyOptimized: false,
          outputWidth: 1920,
          outputHeight: 1080,
          honestStatus: 'saved',
          honestLabel: 'Saved 60%'
        }
      }),
      createMockItem({
        originalSize: 30 * 1024,
        result: {
          outputBlob: new Blob([]),
          outputUrl: 'blob:2',
          outputFormat: 'jpeg',
          originalSize: 30 * 1024,
          compressedSize: 12 * 1024,
          savedBytes: 18 * 1024,
          savedPercentage: 60,
          durationMs: 25,
          isLargerThanOriginal: false,
          alreadyOptimized: false,
          outputWidth: 1920,
          outputHeight: 1080,
          honestStatus: 'saved',
          honestLabel: 'Saved 60%'
        }
      }),
      createMockItem({
        originalSize: 20 * 1024,
        result: {
          outputBlob: new Blob([]),
          outputUrl: 'blob:3',
          outputFormat: 'jpeg',
          originalSize: 20 * 1024,
          compressedSize: 8 * 1024,
          savedBytes: 12 * 1024,
          savedPercentage: 60,
          durationMs: 22,
          isLargerThanOriginal: false,
          alreadyOptimized: false,
          outputWidth: 1920,
          outputHeight: 1080,
          honestStatus: 'saved',
          honestLabel: 'Saved 60%'
        }
      })
    ];

    const report = calculateBeforeDownloadReport(items);
    expect(report.totalFilesCount).toBe(3);
    expect(report.totalSavedBytes).toBe(42 * 1024);
    expect(report.savedPercentage).toBe(60);
    expect(report.line1Saved).toBe('You save 42 KB across 3 files (60%).');
    expect(report.line2Kept).toBeNull();
    expect(report.line4Resized).toBeNull();
  });

  it('reports files kept as original when count > 0, and omits line when 0', () => {
    const itemsWithKept: ImageItem[] = [
      createMockItem({
        originalSize: 20 * 1024,
        result: {
          outputBlob: new Blob([]),
          outputUrl: 'blob:1',
          outputFormat: 'jpeg',
          originalSize: 20 * 1024,
          compressedSize: 10 * 1024,
          savedBytes: 10 * 1024,
          savedPercentage: 50,
          durationMs: 20,
          isLargerThanOriginal: false,
          alreadyOptimized: false,
          outputWidth: 1920,
          outputHeight: 1080,
          honestStatus: 'saved'
        }
      }),
      createMockItem({
        originalSize: 15 * 1024,
        result: {
          outputBlob: new Blob([]),
          outputUrl: 'blob:2',
          outputFormat: 'jpeg',
          originalSize: 15 * 1024,
          compressedSize: 15 * 1024,
          savedBytes: 0,
          savedPercentage: 0,
          durationMs: 15,
          isLargerThanOriginal: false,
          alreadyOptimized: true,
          outputWidth: 1920,
          outputHeight: 1080,
          honestStatus: 'already-optimized'
        }
      }),
      createMockItem({
        originalSize: 12 * 1024,
        result: {
          outputBlob: new Blob([]),
          outputUrl: 'blob:3',
          outputFormat: 'jpeg',
          originalSize: 12 * 1024,
          compressedSize: 12 * 1024,
          savedBytes: 0,
          savedPercentage: 0,
          durationMs: 12,
          isLargerThanOriginal: false,
          alreadyOptimized: true,
          outputWidth: 1920,
          outputHeight: 1080,
          honestStatus: 'already-optimized'
        }
      })
    ];

    const report = calculateBeforeDownloadReport(itemsWithKept);
    expect(report.alreadyOptimizedCount).toBe(2);
    expect(report.line2Kept).toBe('2 files were already optimized and kept as they were.');
  });

  it('computes min and max quality range across batch', () => {
    const items: ImageItem[] = [
      createMockItem({
        result: {
          outputBlob: new Blob([]),
          outputUrl: 'blob:1',
          outputFormat: 'jpeg',
          originalSize: 1000,
          compressedSize: 500,
          savedBytes: 500,
          savedPercentage: 50,
          durationMs: 10,
          isLargerThanOriginal: false,
          alreadyOptimized: false,
          outputWidth: 100,
          outputHeight: 100,
          visualQuality: { ssim: 0.88, psnr: 34.2 }
        }
      }),
      createMockItem({
        result: {
          outputBlob: new Blob([]),
          outputUrl: 'blob:2',
          outputFormat: 'jpeg',
          originalSize: 1000,
          compressedSize: 600,
          savedBytes: 400,
          savedPercentage: 40,
          durationMs: 10,
          isLargerThanOriginal: false,
          alreadyOptimized: false,
          outputWidth: 100,
          outputHeight: 100,
          visualQuality: { ssim: 0.97, psnr: 39.5 }
        }
      })
    ];

    const report = calculateBeforeDownloadReport(items);
    expect(report.minQuality).toBe(88);
    expect(report.maxQuality).toBe(97);
    expect(report.line3Quality).toBe('Visual quality: 88 to 97.');
  });

  it('computes resized files count and omits when zero', () => {
    const itemsWithResize: ImageItem[] = [
      createMockItem({
        width: 1880,
        height: 1880,
        result: {
          outputBlob: new Blob([]),
          outputUrl: 'blob:1',
          outputFormat: 'jpeg',
          originalSize: 1000,
          compressedSize: 400,
          savedBytes: 600,
          savedPercentage: 60,
          durationMs: 10,
          isLargerThanOriginal: false,
          alreadyOptimized: false,
          outputWidth: 940,
          outputHeight: 940
        }
      }),
      createMockItem({
        width: 1000,
        height: 1000,
        result: {
          outputBlob: new Blob([]),
          outputUrl: 'blob:2',
          outputFormat: 'jpeg',
          originalSize: 1000,
          compressedSize: 500,
          savedBytes: 500,
          savedPercentage: 50,
          durationMs: 10,
          isLargerThanOriginal: false,
          alreadyOptimized: false,
          outputWidth: 1000,
          outputHeight: 1000
        }
      })
    ];

    const report = calculateBeforeDownloadReport(itemsWithResize);
    expect(report.resizedCount).toBe(1);
    expect(report.line4Resized).toBe('1 file resized.');
  });
});


// apps/tool-image-compressor/src/services/optimization-report.service.spec.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OptimizationReportService } from './optimization-report.service';
import { ImageItem } from '../models/compressor.models';
import * as downloadHelper from './download-helper.util';

describe('OptimizationReportService', () => {
  let service: OptimizationReportService;

  beforeEach(() => {
    service = new OptimizationReportService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeDefined();
  });

  const mockCompletedItem: ImageItem = {
    id: 'img-1',
    originalFile: new File([''], 'photo.jpg', { type: 'image/jpeg' }),
    originalName: 'photo.jpg',
    nameWithoutExt: 'photo',
    originalExtension: 'jpg',
    detectedFormat: 'jpeg',
    originalSize: 100000,
    width: 1920,
    height: 1080,
    aspectRatio: 1.777,
    status: 'completed',
    selected: false,
    effectiveSettings: {} as any,
    individualSettings: { hasCustomSettings: false },
    capabilities: { previewSupported: true, lossyCompressionSupported: true, losslessOptimizationSupported: false },
    result: {
      imageId: 'img-1',
      outputBlob: new Blob(['12345']),
      outputUrl: 'blob:url1',
      outputFilename: 'photo-compressed.webp',
      outputFormat: 'webp',
      originalSize: 100000,
      compressedSize: 40000,
      savedBytes: 60000,
      savedPercentage: 60,
      isLargerThanOriginal: false,
      originalWidth: 1920,
      originalHeight: 1080,
      outputWidth: 1920,
      outputHeight: 1080,
      compressionMode: 'lossy',
      appliedQuality: 80,
      processingTimeMs: 120,
      visualQuality: {
        ssim: 0.965,
        psnr: 42.5,
        qualityRating: 'excellent'
      },
      variants: [
        {
          variantId: 'thumb',
          name: 'Thumbnail',
          width: 320,
          height: 180,
          outputBlob: new Blob(['thumb']),
          outputUrl: 'blob:thumb',
          outputFilename: 'photo-thumb.webp',
          compressedSize: 5000,
          savedBytes: 95000,
          savedPercentage: 95
        }
      ],
      metadataReport: {
        hasExif: true,
        hasGps: false,
        fieldsDetected: ['Camera Make'],
        fieldsRemoved: ['Camera Make'],
        fieldsRetained: []
      }
    }
  };

  const mockFailedItem: ImageItem = {
    id: 'img-2',
    originalFile: new File([''], 'broken.png', { type: 'image/png' }),
    originalName: 'broken.png',
    nameWithoutExt: 'broken',
    originalExtension: 'png',
    detectedFormat: 'png',
    originalSize: 50000,
    width: 800,
    height: 600,
    aspectRatio: 1.333,
    status: 'failed',
    error: 'Corrupted PNG chunk',
    selected: false,
    effectiveSettings: {} as any,
    individualSettings: { hasCustomSettings: false },
    capabilities: { previewSupported: true, lossyCompressionSupported: true, losslessOptimizationSupported: false }
  };

  const mockSkippedItem: ImageItem = {
    id: 'img-3',
    originalFile: new File([''], 'pending.webp', { type: 'image/webp' }),
    originalName: 'pending.webp',
    nameWithoutExt: 'pending',
    originalExtension: 'webp',
    detectedFormat: 'webp',
    originalSize: 30000,
    width: 600,
    height: 400,
    aspectRatio: 1.5,
    status: 'ready',
    selected: false,
    effectiveSettings: {} as any,
    individualSettings: { hasCustomSettings: false },
    capabilities: { previewSupported: true, lossyCompressionSupported: true, losslessOptimizationSupported: false }
  };

  it('should compile an accurate session report from mixed image states', () => {
    const report = service.generateReport([mockCompletedItem, mockFailedItem, mockSkippedItem]);

    expect(report.totalImages).toBe(3);
    expect(report.completedCount).toBe(1);
    expect(report.failedCount).toBe(1);
    expect(report.skippedCount).toBe(1);

    expect(report.totalOriginalBytes).toBe(180000); // 100000 + 50000 + 30000
    // totalCompressedBytes: 40000 (completed) + 50000 (failed fallback) + 30000 (skipped fallback) = 120000
    expect(report.totalCompressedBytes).toBe(120000);
    expect(report.totalSavedBytes).toBe(60000);
    expect(report.overallSavingsPercentage).toBe(33.3);
    expect(report.totalVariantsGenerated).toBe(1);
    expect(report.averageSsim).toBe(0.965);
    expect(report.items.length).toBe(3);

    const completed = report.items[0];
    expect(completed.originalName).toBe('photo.jpg');
    expect(completed.status).toBe('Completed');
    expect(completed.outputFormat).toBe('WEBP');
    expect(completed.variantsCount).toBe(1);
    expect(completed.ssim).toBe(0.965);

    const failed = report.items[1];
    expect(failed.status).toContain('Failed: Corrupted PNG chunk');
  });

  it('should export CSV and call downloadBlob with text/csv', () => {
    const spy = vi.spyOn(downloadHelper, 'downloadBlob').mockImplementation(() => {});
    const report = service.generateReport([mockCompletedItem]);

    service.exportToCsv(report, 'test-report.csv');

    expect(spy).toHaveBeenCalledTimes(1);
    const [blob, filename] = spy.mock.calls[0];
    expect(filename).toBe('test-report.csv');
    expect(blob.type).toBe('text/csv;charset=utf-8;');
  });

  it('should export JSON and call downloadBlob with application/json', () => {
    const spy = vi.spyOn(downloadHelper, 'downloadBlob').mockImplementation(() => {});
    const report = service.generateReport([mockCompletedItem]);

    service.exportToJson(report, 'test-report.json');

    expect(spy).toHaveBeenCalledTimes(1);
    const [blob, filename] = spy.mock.calls[0];
    expect(filename).toBe('test-report.json');
    expect(blob.type).toBe('application/json;charset=utf-8;');
  });
});

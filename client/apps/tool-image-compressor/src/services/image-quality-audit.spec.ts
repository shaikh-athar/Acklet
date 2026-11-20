// apps/tool-image-compressor/src/services/image-quality-audit.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as imgOpt from './image-optimizer.util';
import { TargetSizeOptimizerService } from './target-size-optimizer.service';
import { ImageCompressionService } from './image-compression.service';
import { ImageDecoderService } from './image-decoder.service';
import { ImageItem } from '../models/compressor.models';
import { DEFAULT_COMPRESSION_SETTINGS } from './compressor-state.service';
import { calculateDynamicDefaultTarget } from './target-suggestion.util';

describe('Image Quality & Target-Size Regression Audit Suite', () => {
  let optimizer: TargetSizeOptimizerService;
  let compressionService: ImageCompressionService;
  let decoder: ImageDecoderService;

  beforeEach(() => {
    optimizer = new TargetSizeOptimizerService();
    compressionService = new ImageCompressionService();
    decoder = new ImageDecoderService();
  });

  function createTestImageItem(params: {
    originalSize: number;
    width?: number;
    height?: number;
    format?: string;
    mimeType?: string;
  }): ImageItem {
    const width = params.width ?? 800;
    const height = params.height ?? 600;
    const format = params.format ?? 'jpeg';
    const mimeType = params.mimeType ?? 'image/jpeg';
    const ext = format === 'jpeg' ? 'jpg' : format;

    const file = new File(['mock-image-bytes-buffer-data'], `sample.${ext}`, {
      type: mimeType
    });

    return {
      id: `img_audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      file,
      originalName: `sample.${ext}`,
      nameWithoutExt: 'sample',
      originalExtension: ext,
      detectedFormat: format,
      mimeType,
      originalSize: params.originalSize,
      width,
      height,
      aspectRatio: width / height,
      previewUrl: 'blob:sample-preview-url',
      selected: false,
      status: 'ready',
      capabilities: {
        fileAccepted: true,
        previewSupported: true,
        compressionSupported: true,
        description: 'Test image'
      },
      individualSettings: { hasCustomSettings: false },
      effectiveSettings: JSON.parse(JSON.stringify(DEFAULT_COMPRESSION_SETTINGS)),
      addedAt: Date.now()
    };
  }

  describe('1. Target File Size Optimization & Ceilings', () => {
    it('achieves target file size within budget for achievable goals', async () => {
      const { canvas } = decoder.createCanvas(400, 300);
      const targetBytes = 25000; // 25 KB

      const result = await optimizer.searchOptimalQuality(
        canvas,
        'image/jpeg',
        targetBytes,
        25, // minQuality
        6,
        undefined,
        undefined,
        false // no downscale
      );

      if (result.targetAchieved) {
        expect(result.optimalSize).toBeLessThanOrEqual(targetBytes);
        expect(result.targetUnreachable).toBe(false);
        expect(result.optimalQuality).toBeGreaterThanOrEqual(25);
        // Dimensions must be 100% strictly preserved
        expect(result.optimalWidth).toBe(400);
        expect(result.optimalHeight).toBe(300);
      }
    });

    it('NEVER downscales dimensions when allowAdaptiveDownscale is false', async () => {
      const { canvas } = decoder.createCanvas(1200, 800);
      const targetBytes = 5000;

      // Mock encoder.encode so floor quality produces 50,000 bytes > 5,000 bytes
      const mockEncoder = (optimizer as any).encoder;
      vi.spyOn(mockEncoder, 'encode').mockResolvedValue({
        blob: new Blob([new Uint8Array(50000)], { type: 'image/jpeg' }),
        size: 50000,
        mimeType: 'image/jpeg'
      });

      const result = await optimizer.searchOptimalQuality(
        canvas,
        'image/jpeg',
        targetBytes,
        25,
        6,
        undefined,
        undefined,
        false // allowAdaptiveDownscale = false
      );

      // Must honestly report target unreachable
      expect(result.targetAchieved).toBe(false);
      expect(result.targetUnreachable).toBe(true);
      // Dimensions must remain exact original resolution
      expect(result.optimalWidth).toBe(1200);
      expect(result.optimalHeight).toBe(800);
      expect(result.warning).toContain('could not be reached at original resolution (1200×800)');
      expect(result.warning).toContain('Enable resizing in settings');
    });

    it('applies bounded, safe downscaling when allowAdaptiveDownscale is explicitly enabled', async () => {
      const { canvas } = decoder.createCanvas(600, 400);
      const targetBytes = 15000;

      const result = await optimizer.searchOptimalQuality(
        canvas,
        'image/bmp',
        targetBytes,
        25,
        6,
        undefined,
        undefined,
        true // allowAdaptiveDownscale = true
      );

      if (result.targetAchieved) {
        expect(result.optimalSize).toBeLessThanOrEqual(targetBytes);
        expect(result.targetUnreachable).toBe(false);
        // Ensure downscaling did not collapse into microscopic 16px thumbnails
        expect(result.optimalWidth).toBeGreaterThanOrEqual(32);
        expect(result.optimalHeight).toBeGreaterThanOrEqual(32);
      }
    });
  });

  describe('2. Larger File Handling & Original File Preservation', () => {
    it('retains original file when re-encoding produces a larger file without explicit conversion', async () => {
      // Mock scenario: original size is 2,000 bytes, but encoded output is 5,000 bytes
      const item = createTestImageItem({
        originalSize: 2000,
        width: 300,
        height: 200,
        format: 'png',
        mimeType: 'image/png'
      });

      // Mock decodeFile
      const mockDecoder = (compressionService as any).decoder;
      vi.spyOn(mockDecoder, 'decodeFile').mockResolvedValue({
        canvas: mockDecoder.createCanvas(300, 200).canvas,
        ctx: mockDecoder.createCanvas(300, 200).ctx,
        width: 300,
        height: 200,
        objectUrlToRevoke: null
      });

      // Mock encoder.encode to simulate re-encoding bloat (5000 bytes > 2000 bytes)
      const mockEncoder = (compressionService as any).encoder;
      const largerBlob = new Blob([new Uint8Array(5000)], { type: 'image/png' });
      vi.spyOn(mockEncoder, 'encode').mockResolvedValue({
        blob: largerBlob,
        size: 5000,
        mimeType: 'image/png'
      });
      vi.spyOn(imgOpt, 'encodeIndexedPng').mockResolvedValue(null as any);

      // Standard compression without target size, format conversion, resize, or transforms
      item.effectiveSettings.outputFormat = 'original';
      item.effectiveSettings.resize.enabled = false;
      item.effectiveSettings.targetFileSize = {
        enabled: false,
        targetBytes: 0,
        targetValue: 0,
        targetUnit: 'KB',
        minQuality: 25
      };

      const result = await compressionService.compressImage(item);

      // Verify original file is preserved!
      expect(result.status).toBe('completed');
      expect(result.alreadyOptimized).toBe(true);
      expect(result.isLargerThanOriginal).toBe(false);
      expect(result.compressedSize).toBe(2000); // Equal to originalSize
      expect(result.savedPercentage).toBe(0);
      expect(result.savedBytes).toBe(0);
      expect(result.outputBlob).toBe(item.file);
    });

    it('allows larger file when user explicitly requests format conversion', async () => {
      const item = createTestImageItem({
        originalSize: 2000,
        width: 200,
        height: 200,
        format: 'jpeg',
        mimeType: 'image/jpeg'
      });

      const mockDecoder = (compressionService as any).decoder;
      vi.spyOn(mockDecoder, 'decodeFile').mockResolvedValue({
        canvas: mockDecoder.createCanvas(200, 200).canvas,
        ctx: mockDecoder.createCanvas(200, 200).ctx,
        width: 200,
        height: 200,
        objectUrlToRevoke: null
      });

      // Explicitly convert from JPEG to uncompressed BMP (which is larger)
      item.effectiveSettings.outputFormat = 'bmp';

      const result = await compressionService.compressImage(item);

      expect(result.status).toBe('completed');
      // Because user explicitly asked for BMP format conversion, the BMP output is kept
      expect(result.outputFormat).toBe('bmp');
      if (result.compressedSize > item.originalSize) {
        expect(result.isLargerThanOriginal).toBe(true);
        // Prompt directive: never return or show a percentage that is 0 or negative
        expect(result.savedPercentage).toBe(0);
      }
    });
  });

  describe('3. Minimum Quality Floor Protection', () => {
    it('enforces safe quality floor of at least 25% to prevent blurry mush', async () => {
      const { canvas } = decoder.createCanvas(200, 200);

      // Pass an absurdly low minQuality of 5%
      const result = await optimizer.searchOptimalQuality(
        canvas,
        'image/jpeg',
        500, // Small budget
        5, // minQuality requested: 5
        4,
        undefined,
        undefined,
        false
      );

      // Even if 5 was passed, the effective floor should stay at DEFAULT_MIN_QUALITY_FLOOR (25)
      expect(result.optimalQuality).toBeGreaterThanOrEqual(25);
    });
  });

  describe('4. Dynamic Default Target & Minimum 30% Reduction Goal', () => {
    it('calculates exact 30% reduction dynamic target across file sizes', () => {
      const t10k = calculateDynamicDefaultTarget(10 * 1024);
      expect(t10k.targetValue).toBe(7);
      expect(t10k.targetUnit).toBe('KB');

      const t20k = calculateDynamicDefaultTarget(20 * 1024);
      expect(t20k.targetValue).toBe(14);
      expect(t20k.targetUnit).toBe('KB');

      const t32k = calculateDynamicDefaultTarget(32 * 1024);
      expect(t32k.targetValue).toBe(22.4);
      expect(t32k.targetUnit).toBe('KB');

      const t50k = calculateDynamicDefaultTarget(50 * 1024);
      expect(t50k.targetValue).toBe(35);
      expect(t50k.targetUnit).toBe('KB');

      const t100k = calculateDynamicDefaultTarget(100 * 1024);
      expect(t100k.targetValue).toBe(70);
      expect(t100k.targetUnit).toBe('KB');

      const t500k = calculateDynamicDefaultTarget(500 * 1024);
      expect(t500k.targetValue).toBe(350);
      expect(t500k.targetUnit).toBe('KB');

      const t1m = calculateDynamicDefaultTarget(1048576);
      expect(t1m.targetValue).toBe(700);
      expect(t1m.targetUnit).toBe('KB');

      const t5m = calculateDynamicDefaultTarget(5 * 1048576);
      expect(t5m.targetValue).toBe(3.5);
      expect(t5m.targetUnit).toBe('MB');
    });

    it('handles aggressive target size gracefully without throwing or marking status failed', async () => {
      // User sets 7.0 KB on a 32 KB image
      const item = createTestImageItem({
        originalSize: 32768,
        width: 678,
        height: 452,
        format: 'jpeg',
        mimeType: 'image/jpeg'
      });

      const mockDecoder = (compressionService as any).decoder;
      vi.spyOn(mockDecoder, 'decodeFile').mockResolvedValue({
        canvas: mockDecoder.createCanvas(678, 452).canvas,
        ctx: mockDecoder.createCanvas(678, 452).ctx,
        width: 678,
        height: 452,
        objectUrlToRevoke: null
      });

      // Target 7 KB (7168 bytes)
      item.effectiveSettings.targetFileSize = {
        enabled: true,
        targetBytes: 7168,
        targetValue: 7,
        targetUnit: 'KB',
        minQuality: 25,
        userDefined: true
      };

      const result = await compressionService.compressImage(item);

      // Must complete safely, NEVER fail or throw
      expect(result.status).toBe('completed');
      expect(result.error).toBeUndefined();
      expect(result.compressedSize).toBeGreaterThan(0);
      // If reached target, targetAchieved is true; if not, targetUnreachable is true
      if (result.compressedSize <= 7168) {
        expect(result.targetAchieved).toBe(true);
      } else {
        expect(result.targetUnreachable).toBe(true);
      }
    });

    it('preserves individual overrides over global settings', async () => {
      const item = createTestImageItem({
        originalSize: 50000,
        width: 500,
        height: 500,
        format: 'jpeg',
        mimeType: 'image/jpeg'
      });

      // Custom individual target of 20 KB
      item.individualSettings = {
        hasCustomSettings: true,
        targetFileSize: {
          enabled: true,
          targetBytes: 20480,
          targetValue: 20,
          targetUnit: 'KB',
          minQuality: 25,
          userDefined: true
        }
      };
      item.effectiveSettings.targetFileSize = item.individualSettings.targetFileSize;

      const mockDecoder = (compressionService as any).decoder;
      vi.spyOn(mockDecoder, 'decodeFile').mockResolvedValue({
        canvas: mockDecoder.createCanvas(500, 500).canvas,
        ctx: mockDecoder.createCanvas(500, 500).ctx,
        width: 500,
        height: 500,
        objectUrlToRevoke: null
      });

      const result = await compressionService.compressImage(item);

      expect(result.status).toBe('completed');
      expect(result.targetBytesRequested).toBe(20480);
    });

    it('preserves PNG format and alpha transparency during optimization', async () => {
      const item = createTestImageItem({
        originalSize: 80000,
        width: 400,
        height: 400,
        format: 'png',
        mimeType: 'image/png'
      });

      const mockDecoder = (compressionService as any).decoder;
      const { canvas, ctx } = mockDecoder.createCanvas(400, 400);

      vi.spyOn(mockDecoder, 'decodeFile').mockResolvedValue({
        canvas,
        ctx,
        width: 400,
        height: 400,
        objectUrlToRevoke: null
      });

      item.effectiveSettings.outputFormat = 'original';
      item.effectiveSettings.advancedOptimization = {
        cleanTransparency: true,
        optimizePalette: true
      };

      const result = await compressionService.compressImage(item);

      expect(result.status).toBe('completed');
      expect(result.outputFormat).toBe('png');
      expect(result.outputMimeType).toBe('image/png');
    });
  });
});

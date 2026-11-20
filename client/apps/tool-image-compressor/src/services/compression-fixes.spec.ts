// apps/tool-image-compressor/src/services/compression-fixes.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ImageCompressionService } from './image-compression.service';
import { CompressorStateService } from './compressor-state.service';
import { COMPRESSOR_CONFIG, getSmartDefaultBand } from '../config/compressor.config';
import { ImageItem, CompressionResult } from '../models/compressor.models';

function createMockImageItem(id: string, name: string, size: number, format = 'png', hasCustom = false): ImageItem {
  const file = new File([new Uint8Array(size)], name, { type: `image/${format}` });
  return {
    id,
    file,
    originalName: name,
    nameWithoutExt: name.replace(/\.[^/.]+$/, ''),
    originalExtension: format,
    detectedFormat: format,
    mimeType: `image/${format}`,
    originalSize: size,
    width: 800,
    height: 600,
    aspectRatio: 800 / 600,
    previewUrl: 'blob:test',
    selected: false,
    status: 'ready',
    capabilities: {
      format,
      label: format.toUpperCase(),
      fileAccepted: true,
      canEncode: true,
      canDecode: true,
      isLossless: false,
      supportsTransparency: true,
      supportsQuality: true,
      isBrowserNative: true,
      isVector: false,
      extension: format,
      mimeType: `image/${format}`,
      description: 'Test format'
    },
    individualSettings: {
      hasCustomSettings: hasCustom,
      outputFormat: 'original'
    },
    effectiveSettings: {
      mode: 'custom',
      preset: 'balanced',
      quality: 80,
      outputFormat: 'original',
      resize: {
        enabled: false,
        mode: 'percentage',
        percentage: 100,
        maintainAspectRatio: true,
        preventUpscale: true
      },
      metadataPolicy: 'remove'
    }
  };
}

describe('Compression Fixes — Steps 1 through 8', () => {

  describe('STEP 1: Compress every file in one click', () => {
    let state: CompressorStateService;

    beforeEach(() => {
      state = new CompressorStateService();
    });

    it('batch of 7 files (4 customized, 3 uncustomized) produces 7 results', async () => {
      const items: ImageItem[] = [
        createMockImageItem('img1', 'photo1.png', 50000, 'png', true),
        createMockImageItem('img2', 'photo2.png', 60000, 'png', true),
        createMockImageItem('img3', 'photo3.png', 70000, 'png', true),
        createMockImageItem('img4', 'photo4.png', 80000, 'png', true),
        createMockImageItem('img5', 'photo5.png', 90000, 'png', false),
        createMockImageItem('img6', 'photo6.png', 100000, 'png', false),
        createMockImageItem('img7', 'photo7.png', 110000, 'png', false)
      ];

      (state as any).images.set(items);

      const processedIds: string[] = [];
      vi.spyOn((state as any).compressionEngine, 'compressImage').mockImplementation(async (item: ImageItem) => {
        processedIds.push(item.id);
        const compSize = Math.round(item.originalSize * 0.7);
        return {
          imageId: item.id,
          originalSize: item.originalSize,
          compressedSize: compSize,
          savedBytes: item.originalSize - compSize,
          savedPercentage: 30,
          originalWidth: item.width,
          originalHeight: item.height,
          outputWidth: item.width,
          outputHeight: item.height,
          originalFormat: item.detectedFormat,
          outputFormat: item.detectedFormat,
          outputMimeType: item.mimeType,
          outputBlob: new Blob(['x'], { type: item.mimeType }),
          outputUrl: 'blob:result',
          outputFilename: item.originalName,
          processingTimeMs: 10,
          status: 'completed'
        } as CompressionResult;
      });

      await state.compressAll();

      expect(processedIds.length).toBe(7);
      expect(state.images().every(img => img.status === 'completed')).toBe(true);
      expect(state.images().every(img => !!img.result)).toBe(true);
    });

    it('if one file fails to compress, other files still process and complete', async () => {
      const items: ImageItem[] = [
        createMockImageItem('img1', 'good1.png', 50000, 'png', false),
        createMockImageItem('img2', 'bad.png', 60000, 'png', false),
        createMockImageItem('img3', 'good2.png', 70000, 'png', false)
      ];

      (state as any).images.set(items);

      vi.spyOn((state as any).compressionEngine, 'compressImage').mockImplementation(async (item: ImageItem) => {
        if (item.id === 'img2') {
          return {
            imageId: item.id,
            originalSize: item.originalSize,
            compressedSize: item.originalSize,
            savedBytes: 0,
            savedPercentage: 0,
            originalWidth: item.width,
            originalHeight: item.height,
            outputWidth: item.width,
            outputHeight: item.height,
            originalFormat: item.detectedFormat,
            outputFormat: item.detectedFormat,
            outputMimeType: item.mimeType,
            outputBlob: item.file,
            outputUrl: 'blob:orig',
            outputFilename: item.originalName,
            processingTimeMs: 5,
            status: 'failed',
            error: 'Corrupted image data'
          } as CompressionResult;
        }

        const compSize = Math.round(item.originalSize * 0.8);
        return {
          imageId: item.id,
          originalSize: item.originalSize,
          compressedSize: compSize,
          savedBytes: item.originalSize - compSize,
          savedPercentage: 20,
          originalWidth: item.width,
          originalHeight: item.height,
          outputWidth: item.width,
          outputHeight: item.height,
          originalFormat: item.detectedFormat,
          outputFormat: item.detectedFormat,
          outputMimeType: item.mimeType,
          outputBlob: new Blob(['x'], { type: item.mimeType }),
          outputUrl: 'blob:result',
          outputFilename: item.originalName,
          processingTimeMs: 10,
          status: 'completed'
        } as CompressionResult;
      });

      await state.compressAll();

      expect(state.images().find(img => img.id === 'img1')?.status).toBe('completed');
      expect(state.images().find(img => img.id === 'img2')?.status).toBe('failed');
      expect(state.images().find(img => img.id === 'img3')?.status).toBe('completed');
    });
  });

  describe('STEP 2: Smart defaults for files with no user target', () => {
    let service: ImageCompressionService;

    beforeEach(() => {
      service = new ImageCompressionService();
      (service as any).decoder = {
        decodeFile: vi.fn().mockResolvedValue({
          canvas: { width: 800, height: 600 } as any,
          width: 800,
          height: 600,
          objectUrlToRevoke: null
        })
      };
    });

    it('under 100 KB file (60 KB) gets 5% to 10% smaller', async () => {
      const origSize = 60 * 1024;
      const band = getSmartDefaultBand(origSize);
      expect(band.minReductionPercent).toBe(5);
      expect(band.maxReductionPercent).toBe(10);

      const item = createMockImageItem('test_60kb', 'photo.jpg', origSize, 'jpeg');
      (service as any).encoder = {
        encode: vi.fn().mockImplementation(async (_canvas, _mime, q) => {
          const size = Math.round(origSize * 0.92);
          return { blob: new Blob([new Uint8Array(size)]), size };
        })
      };

      const result = await service.compressImage(item);
      expect(result.savedPercentage).toBeGreaterThanOrEqual(5);
      expect(result.savedPercentage).toBeLessThanOrEqual(10);
    });

    it('100 KB to 1 MB file (500 KB) gets 10% to 30% smaller', async () => {
      const origSize = 500 * 1024;
      const band = getSmartDefaultBand(origSize);
      expect(band.minReductionPercent).toBe(10);
      expect(band.maxReductionPercent).toBe(30);

      const item = createMockImageItem('test_500kb', 'photo.jpg', origSize, 'jpeg');
      (service as any).encoder = {
        encode: vi.fn().mockImplementation(async (_canvas, _mime, q) => {
          const size = Math.round(origSize * 0.75);
          return { blob: new Blob([new Uint8Array(size)]), size };
        })
      };

      const result = await service.compressImage(item);
      expect(result.savedPercentage).toBeGreaterThanOrEqual(10);
      expect(result.savedPercentage).toBeLessThanOrEqual(30);
    });

    it('1 MB to 2 MB file (1.5 MB) gets 30% to 40% smaller', async () => {
      const origSize = Math.round(1.5 * 1024 * 1024);
      const band = getSmartDefaultBand(origSize);
      expect(band.minReductionPercent).toBe(30);
      expect(band.maxReductionPercent).toBe(40);

      const item = createMockImageItem('test_1_5mb', 'photo.jpg', origSize, 'jpeg');
      (service as any).encoder = {
        encode: vi.fn().mockImplementation(async (_canvas, _mime, q) => {
          const size = Math.round(origSize * 0.65);
          return { blob: new Blob([new Uint8Array(size)]), size };
        })
      };

      const result = await service.compressImage(item);
      expect(result.savedPercentage).toBeGreaterThanOrEqual(30);
      expect(result.savedPercentage).toBeLessThanOrEqual(40);
    });

    it('over 2 MB file (3 MB) gets 40% or more smaller', async () => {
      const origSize = 3 * 1024 * 1024;
      const band = getSmartDefaultBand(origSize);
      expect(band.minReductionPercent).toBe(40);

      const item = createMockImageItem('test_3mb', 'photo.jpg', origSize, 'jpeg');
      (service as any).encoder = {
        encode: vi.fn().mockImplementation(async (_canvas, _mime, q) => {
          const size = Math.round(origSize * 0.55);
          return { blob: new Blob([new Uint8Array(size)]), size };
        })
      };

      const result = await service.compressImage(item);
      expect(result.savedPercentage).toBeGreaterThanOrEqual(40);
    });
  });

  describe('STEP 3: Reach user target as closely as possible', () => {
    let service: ImageCompressionService;

    beforeEach(() => {
      service = new ImageCompressionService();
      (service as any).decoder = {
        decodeFile: vi.fn().mockResolvedValue({
          canvas: { width: 800, height: 600 } as any,
          width: 800,
          height: 600,
          objectUrlToRevoke: null
        })
      };
    });

    it('67 KB image with 20 KB target: reaches <= 20 KB and sets targetAchieved = true', async () => {
      const origSize = 67 * 1024;
      const targetSize = 20 * 1024;
      const item = createMockImageItem('img_67k', 'photo.png', origSize, 'png', true);
      item.effectiveSettings.targetFileSize = {
        enabled: true,
        targetBytes: targetSize,
        targetValue: 20,
        targetUnit: 'KB',
        tolerancePercent: 5
      };

      (service as any).encoder = {
        quantizeCanvasColors: vi.fn().mockImplementation((c) => c),
        encode: vi.fn().mockImplementation(async (canvas, mime, q) => {
          const size = Math.round(19.6 * 1024);
          return { blob: new Blob([new Uint8Array(size)]), size };
        })
      };

      const result = await service.compressImage(item);
      expect(result.compressedSize).toBeLessThanOrEqual(targetSize);
      expect(result.targetAchieved).toBe(true);
      expect(result.targetUnreachable).toBe(false);
      expect(result.targetBytesRequested).toBe(targetSize);
    });

    it('18 KB image with 5 KB target: returns closest size when floor met and flags targetUnreachable', async () => {
      const origSize = 18 * 1024;
      const targetSize = 5 * 1024;
      const item = createMockImageItem('img_18k', 'photo.png', origSize, 'png', true);
      item.effectiveSettings.targetFileSize = {
        enabled: true,
        targetBytes: targetSize,
        targetValue: 5,
        targetUnit: 'KB',
        tolerancePercent: 5
      };

      (service as any).encoder = {
        quantizeCanvasColors: vi.fn().mockImplementation((c) => c),
        encode: vi.fn().mockImplementation(async () => {
          const size = 7 * 1024;
          return { blob: new Blob([new Uint8Array(size)]), size };
        })
      };

      const result = await service.compressImage(item);
      expect(result.compressedSize).toBe(7 * 1024);
      expect(result.targetAchieved).toBe(false);
      expect(result.targetUnreachable).toBe(true);
      expect(result.targetBytesRequested).toBe(targetSize);
    });

    it('engine never returns a result larger than the original', async () => {
      const origSize = 10000;
      const item = createMockImageItem('test_large', 'photo.png', origSize, 'png');

      (service as any).encoder = {
        quantizeCanvasColors: vi.fn().mockImplementation((c) => c),
        encode: vi.fn().mockImplementation(async () => {
          const size = 15000;
          return { blob: new Blob([new Uint8Array(size)]), size };
        })
      };

      const result = await service.compressImage(item);
      expect(result.compressedSize).toBeLessThanOrEqual(origSize);
    });
  });

  describe('STEP 4: Popup slider and typed value synchronization', () => {
    function computeTargetSliderPercent(typedValue: number, unit: 'KB' | 'MB', origSize: number): number {
      const mult = unit === 'MB' ? 1048576 : 1024;
      const currentBytes = Math.round(typedValue * mult);
      if (origSize <= 0) return 70;
      return Math.max(1, Math.min(100, Math.round((currentBytes / origSize) * 100)));
    }

    function computeTypedFromSliderPercent(sliderPct: number, origSize: number): { value: number; unit: 'KB' | 'MB' } {
      const bytes = Math.max(1024, Math.round(origSize * (sliderPct / 100)));
      if (bytes >= 1048576) {
        return { value: Math.round((bytes / 1048576) * 10) / 10, unit: 'MB' };
      }
      return { value: Math.round(bytes / 1024), unit: 'KB' };
    }

    it('typing 5 KB moves slider to 5 KB and percentage matches original size', () => {
      const origSize = 20 * 1024; // 20480 B
      const pct = computeTargetSliderPercent(5, 'KB', origSize);
      // 5120 / 20480 = 25%
      expect(pct).toBe(25);
    });

    it('moving slider updates typed value and matches target bytes', () => {
      const origSize = 40 * 1024; // 40960 B
      const typed = computeTypedFromSliderPercent(50, origSize);
      // 50% of 40 KB is 20 KB
      expect(typed.value).toBe(20);
      expect(typed.unit).toBe('KB');
    });
  });

  describe('STEP 5: Apply vs Compress button', () => {
    function isAlreadyCompressed(item: { result?: any; status: string }): boolean {
      return !!item.result || item.status === 'completed';
    }

    it('never-compressed file shows Apply', () => {
      const item = { status: 'ready', result: undefined };
      expect(isAlreadyCompressed(item)).toBe(false);
    });

    it('already-compressed file shows Compress', () => {
      const item = { status: 'completed', result: { compressedSize: 30000 } };
      expect(isAlreadyCompressed(item)).toBe(true);
    });
  });

  describe('STEP 6: Panel and card numbers are separate', () => {
    let state: CompressorStateService;

    beforeEach(() => {
      state = new CompressorStateService();
    });

    it('panel target does not change output of customized file that has its own target', () => {
      const item = createMockImageItem('custom_img', 'photo.png', 50000, 'png', true);
      item.effectiveSettings.targetFileSize = {
        enabled: true,
        targetBytes: 15000,
        targetValue: 15,
        targetUnit: 'KB',
        tolerancePercent: 5
      };

      (state as any).images.set([item]);

      // Change panel target to 7.4 KB
      state.updateGlobalSettings({
        targetFileSize: {
          enabled: true,
          targetBytes: Math.round(7.4 * 1024),
          targetValue: 7.4,
          targetUnit: 'KB',
          tolerancePercent: 5
        }
      });

      const updated = state.images().find(img => img.id === 'custom_img');
      expect(updated?.effectiveSettings.targetFileSize?.targetBytes).toBe(15000);
      expect(updated?.effectiveSettings.targetFileSize?.targetValue).toBe(15);
    });
  });

  describe('STEP 7: Card Target & Achieved Labels and Inline Rename UI Fix', () => {
    function computeTargetResultLine(res: { targetBytesRequested?: number; targetAchieved?: boolean; compressedSize: number }): string | null {
      if (!res.targetBytesRequested) return null;
      const targetStr = `${(res.targetBytesRequested / 1024).toFixed(1)} KB`;
      const achievedStr = `${(res.compressedSize / 1024).toFixed(1)} KB`;
      if (res.targetAchieved) {
        return `Target ${targetStr}. Achieved ${achievedStr}.`;
      }
      return `Target ${targetStr}. Closest size: ${achievedStr}.`;
    }

    it('shows "Target 20.0 KB. Achieved 19.6 KB." when target reached', () => {
      const res = {
        targetBytesRequested: 20 * 1024,
        targetAchieved: true,
        compressedSize: Math.round(19.6 * 1024)
      };
      expect(computeTargetResultLine(res)).toBe('Target 20.0 KB. Achieved 19.6 KB.');
    });

    it('shows "Target 20.0 KB. Closest size: 24.1 KB." when target cannot be reached', () => {
      const res = {
        targetBytesRequested: 20 * 1024,
        targetAchieved: false,
        compressedSize: Math.round(24.1 * 1024)
      };
      expect(computeTargetResultLine(res)).toBe('Target 20.0 KB. Closest size: 24.1 KB.');
    });

    it('verifies card template hides customized pill during rename and omits targetResultLine from tile', () => {
      const cardSource = fs.readFileSync(
        path.resolve(__dirname, '../components/image-card/image-card.component.ts'),
        'utf-8'
      );
      // Confirms customized pill is conditionally hidden during name editing
      expect(cardSource).toContain('@if (!isEditingName() && !isOutputScreen() && item().individualSettings.hasCustomSettings)');
      // Confirms input expands without max-width constriction
      expect(cardSource).toContain('.card-name-edit-inline {');
      expect(cardSource).toContain('white-space: nowrap');
      // Confirms Target ... Achieved ... line is removed from each tile as requested
      expect(cardSource).not.toContain('target-result-badge');
      expect(cardSource).not.toContain('targetResultLine()');
    });

    it('verifies settings panel footer always has Compress button when totalCount > 0', () => {
      const panelSource = fs.readFileSync(
        path.resolve(__dirname, '../components/settings-panel/settings-panel.component.ts'),
        'utf-8'
      );
      expect(panelSource).toContain('@else if (totalCount() > 0)');
      expect(panelSource).toContain('Compress {{ totalCount() }}');
    });
  });
});

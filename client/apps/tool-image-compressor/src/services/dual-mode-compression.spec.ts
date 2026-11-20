// apps/tool-image-compressor/src/services/dual-mode-compression.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImageCompressionService } from './image-compression.service';
import { CompressorStateService } from './compressor-state.service';
import { ImageItem, CompressionSettings } from '../models/compressor.models';

function createMockFile(name: string, sizeBytes: number, mimeType = 'image/png'): File {
  const buffer = new Uint8Array(sizeBytes);
  if (mimeType === 'image/png' && sizeBytes >= 8) {
    buffer[0] = 0x89;
    buffer[1] = 0x50;
    buffer[2] = 0x4e;
    buffer[3] = 0x47;
    buffer[4] = 0x0d;
    buffer[5] = 0x0a;
    buffer[6] = 0x1a;
    buffer[7] = 0x0a;
  }
  return new File([buffer], name, { type: mimeType });
}

function createMockImageItem(
  id: string,
  fileName: string,
  sizeBytes: number,
  format = 'png',
  hasCustom = false
): ImageItem {
  const file = createMockFile(fileName, sizeBytes, format === 'png' ? 'image/png' : 'image/jpeg');
  const dotIdx = fileName.lastIndexOf('.');
  const baseName = dotIdx !== -1 ? fileName.substring(0, dotIdx) : fileName;
  const ext = dotIdx !== -1 ? fileName.substring(dotIdx + 1) : format;

  const defaultSettings: CompressionSettings = {
    mode: 'smart',
    preset: 'balanced',
    quality: 80,
    outputFormat: 'original',
    targetFileSize: {
      enabled: true,
      targetBytes: Math.round(sizeBytes * 0.7),
      targetValue: Math.round((sizeBytes * 0.7) / 1024),
      targetUnit: 'KB',
      minQuality: 25,
      isDynamicDefault: true,
      userDefined: false
    },
    resize: {
      enabled: false,
      mode: 'dimensions',
      maintainAspectRatio: true,
      percentage: 100,
      preventUpscale: false
    },
    metadataPolicy: 'remove'
  };

  return {
    id,
    file,
    originalName: fileName,
    nameWithoutExt: baseName,
    originalExtension: ext,
    detectedFormat: format,
    mimeType: format === 'png' ? 'image/png' : 'image/jpeg',
    originalSize: sizeBytes,
    width: 800,
    height: 600,
    aspectRatio: 800 / 600,
    previewUrl: 'blob:mock-preview',
    status: 'idle',
    progress: 0,
    progressStage: 'Ready',
    individualSettings: { hasCustomSettings: hasCustom },
    effectiveSettings: { ...defaultSettings }
  };
}

describe('Acklet Image Compressor — Intelligent Dual-Mode Compression Engine', () => {
  let service: ImageCompressionService;

  function setMockEncoder(encodeFn: (canvas: any, mime: string, q: number) => Promise<{ blob: Blob; size: number }>) {
    const mockEncoder = {
      quantizeCanvasColors: vi.fn().mockImplementation(c => c),
      encode: vi.fn().mockImplementation(encodeFn)
    };
    (service as any).encoder = mockEncoder;
    if ((service as any).targetOptimizer) {
      (service as any).targetOptimizer.encoder = mockEncoder;
    }
  }

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

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 1: Default Compression Mode (No Customization)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('1. Default Compression Mode (No Customization)', () => {
    it('automatically optimizes an untouched image and selects meaningful reduction', async () => {
      const origSize = 100 * 1024; // 100 KB
      const item = createMockImageItem('img_default_1', 'photo.png', origSize, 'png', false);

      // Mock encoder delivering an optimized WebP candidate at 45 KB (55% reduction, SSIM 0.95)
      setMockEncoder(async (canvas, mime, q) => {
        const size = mime === 'image/webp' ? 45 * 1024 : 75 * 1024;
        return { blob: new Blob([new Uint8Array(size)]), size };
      });

      const result = await service.compressImage(item);

      expect(result.compressionMode).toBe('default');
      expect(result.reductionResult).toBe('reduced');
      expect(result.compressedSize).toBeLessThan(origSize);
      expect(result.savedPercentage).toBeGreaterThanOrEqual(10);
      expect(result.targetAchieved).toBe(false); // No user target was set
      expect(result.targetBytesRequested).toBeUndefined();
    });

    it('does NOT treat prefilled dynamic default target as a user custom target', async () => {
      const origSize = 80 * 1024;
      const item = createMockImageItem('img_dyn_default', 'banner.jpg', origSize, 'jpeg', false);

      // Dynamic prefilled default exists, but userDefined is false and isDynamicDefault is true
      item.effectiveSettings.targetFileSize = {
        enabled: true,
        targetBytes: 56 * 1024,
        targetValue: 56,
        targetUnit: 'KB',
        minQuality: 25,
        isDynamicDefault: true,
        userDefined: false
      };

      setMockEncoder(async () => {
        const size = 60 * 1024; // 60 KB (25% saving, but larger than the 56 KB dynamic suggestion)
        return { blob: new Blob([new Uint8Array(size)]), size };
      });

      const result = await service.compressImage(item);

      // In Default Mode, 60 KB is a valid reduction (25% saving) and is accepted as success
      expect(result.compressionMode).toBe('default');
      expect(result.reductionResult).toBe('reduced');
      expect(result.compressedSize).toBe(60 * 1024);
      expect(result.targetBytesRequested).toBeUndefined(); // Not treated as strict user budget
    });

    it('preserves original file and reports "Already optimal" when file cannot be reduced by at least 5%', async () => {
      const origSize = 5 * 1024; // Small, already compressed 5 KB file
      const item = createMockImageItem('img_already_opt', 'tiny-icon.png', origSize, 'png', false);

      setMockEncoder(async () => {
        const size = 5200; // Bloated size > original
        return { blob: new Blob([new Uint8Array(size)]), size };
      });

      const result = await service.compressImage(item);

      expect(result.compressionMode).toBe('default');
      expect(result.reductionResult).toBe('not reduced');
      expect(result.reductionReason).toContain('Already optimal');
      expect(result.compressedSize).toBe(origSize);
      expect(result.savedBytes).toBe(0);
      expect(result.savedPercentage).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 2: Custom Target Mode — Example A (Target File Size)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('2. Custom Target Mode — Example A (15 KB original, 30 KB target)', () => {
    it('enforces target as a STRICT MAXIMUM: never delivers output exceeding 30 KB', async () => {
      const origSize = 15 * 1024; // 15 KB
      const targetSize = 30 * 1024; // 30 KB target
      const item = createMockImageItem('img_ex_a', 'sample.png', origSize, 'png', true);

      item.effectiveSettings.targetFileSize = {
        enabled: true,
        targetBytes: targetSize,
        targetValue: 30,
        targetUnit: 'KB',
        minQuality: 25,
        userDefined: true,
        isDynamicDefault: false
      };

      // Mock encoder offering candidates: 14 KB (lossless) and 25 KB (high quality Q95)
      setMockEncoder(async (canvas, mime, q) => {
        const size = q >= 90 ? 25 * 1024 : 14 * 1024;
        return { blob: new Blob([new Uint8Array(size)]), size };
      });

      const result = await service.compressImage(item);

      expect(result.compressionMode).toBe('custom-target');
      expect(result.targetBytesRequested).toBe(targetSize);
      expect(result.compressedSize).toBeLessThanOrEqual(targetSize); // <= 30 KB
      expect(result.targetAchieved).toBe(true);
      expect(result.targetUnreachable).toBe(false);
    });

    it('rejects candidates exceeding 30 KB even if original was 15 KB', async () => {
      const origSize = 15 * 1024;
      const targetSize = 30 * 1024;
      const item = createMockImageItem('img_ex_a_oversized', 'sample.png', origSize, 'png', true);

      item.effectiveSettings.targetFileSize = {
        enabled: true,
        targetBytes: targetSize,
        targetValue: 30,
        targetUnit: 'KB',
        minQuality: 25,
        userDefined: true,
        isDynamicDefault: false
      };

      // Encoder produces an unacceptable 35 KB file and an acceptable 28 KB file
      setMockEncoder(async (canvas, mime, q) => {
        const size = q >= 90 ? 35 * 1024 : 28 * 1024;
        return { blob: new Blob([new Uint8Array(size)]), size };
      });

      const result = await service.compressImage(item);

      expect(result.compressedSize).toBeLessThanOrEqual(targetSize);
      expect(result.compressedSize).toBe(28 * 1024);
      expect(result.targetAchieved).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 3: Custom Target Mode — Example B (Percentage Reduction)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('3. Custom Target Mode — Example B (100 KB original, 30% reduction)', () => {
    it('sets maximum limit to 70 KB and chooses best visual quality candidate meeting the limit', async () => {
      const origSize = 100 * 1024; // 100 KB
      const item = createMockImageItem('img_ex_b', 'photo.jpg', origSize, 'jpeg', true);

      // User requests 30% reduction -> percentage = 70%
      item.effectiveSettings.resize = {
        enabled: true,
        mode: 'percentage',
        percentage: 70,
        maintainAspectRatio: true,
        preventUpscale: true
      };

      const maxLimitBytes = Math.floor(origSize * 0.70); // 71680 bytes = 70 KB

      // Mock encoder candidates: Q90 = 75 KB (unacceptable), Q80 = 65 KB (acceptable), Q60 = 55 KB (acceptable)
      setMockEncoder(async (canvas, mime, q) => {
        let size = 75 * 1024;
        if (q <= 60) size = 55 * 1024;
        else if (q <= 80) size = 65 * 1024;
        return { blob: new Blob([new Uint8Array(size)]), size };
      });

      const result = await service.compressImage(item);

      expect(result.compressionMode).toBe('custom-target');
      expect(result.targetBytesRequested).toBe(maxLimitBytes);
      expect(result.compressedSize).toBeLessThanOrEqual(maxLimitBytes); // <= 70 KB
      expect(result.compressedSize).toBe(65 * 1024); // Chooses 65 KB (highest quality meeting target) over 55 KB
      expect(result.targetAchieved).toBe(true);
      expect(result.targetUnreachable).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 4: Custom Target Mode — Example C (Challenging Target: 80% Reduction)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('4. Custom Target Mode — Example C (100 KB original, 80% reduction / 20 KB limit)', () => {
    it('succeeds when target (20 KB) is reachable when user explicitly selects WebP', async () => {
      const origSize = 100 * 1024; // 100 KB
      const targetLimit = 20 * 1024; // 20 KB max limit
      const item = createMockImageItem('img_ex_c_pass', 'graphic.png', origSize, 'png', true);

      item.effectiveSettings.outputFormat = 'webp';
      item.effectiveSettings.targetFileSize = {
        enabled: true,
        targetBytes: targetLimit,
        targetValue: 20,
        targetUnit: 'KB',
        minQuality: 25,
        userDefined: true,
        isDynamicDefault: false
      };

      // Mock encoder: WebP achieves 18.5 KB <= 20 KB
      setMockEncoder(async (canvas, mime) => {
        const size = mime === 'image/webp' ? Math.round(18.5 * 1024) : 35 * 1024;
        return { blob: new Blob([new Uint8Array(size)]), size };
      });

      const result = await service.compressImage(item);

      expect(result.compressionMode).toBe('custom-target');
      expect(result.outputFormat).toBe('webp');
      expect(result.targetBytesRequested).toBe(targetLimit);
      expect(result.compressedSize).toBeLessThanOrEqual(targetLimit);
      expect(result.targetAchieved).toBe(true);
      expect(result.targetUnreachable).toBe(false);
    });

    it('never silently converts PNG to WebP even if target is unreachable in PNG', async () => {
      const origSize = 100 * 1024; // 100 KB
      const targetLimit = 20 * 1024; // 20 KB max limit
      const item = createMockImageItem('img_png_no_convert', 'graphic.png', origSize, 'png', true);

      // User kept ORIGINAL
      item.effectiveSettings.outputFormat = 'original';
      item.effectiveSettings.targetFileSize = {
        enabled: true,
        targetBytes: targetLimit,
        targetValue: 20,
        targetUnit: 'KB',
        minQuality: 25,
        userDefined: true,
        isDynamicDefault: false
      };

      setMockEncoder(async (canvas, mime) => {
        // Even if WebP could reach 18.5 KB, PNG stays PNG (35 KB)
        const size = mime === 'image/webp' ? Math.round(18.5 * 1024) : 35 * 1024;
        return { blob: new Blob([new Uint8Array(size)]), size };
      });

      const result = await service.compressImage(item);

      // Format MUST NOT be silently changed
      expect(result.outputFormat).toBe('png');
      expect(result.targetAchieved).toBe(false);
      expect(result.targetUnreachable).toBe(true);
      expect(result.closestAchievableSize).toBe(35 * 1024);
    });

    it('honestly reports failure when target is unreachable without delivering an oversized file as success', async () => {
      const origSize = 100 * 1024;
      const targetLimit = 20 * 1024; // 20 KB
      const item = createMockImageItem('img_ex_c_fail', 'noisy-photo.jpg', origSize, 'jpeg', true);

      item.effectiveSettings.targetFileSize = {
        enabled: true,
        targetBytes: targetLimit,
        targetValue: 20,
        targetUnit: 'KB',
        minQuality: 25,
        userDefined: true,
        isDynamicDefault: false
      };

      // Mock encoder: smallest achievable size is 24 KB (> 20 KB target limit)
      setMockEncoder(async () => {
        const size = 24 * 1024;
        return { blob: new Blob([new Uint8Array(size)]), size };
      });

      const result = await service.compressImage(item);

      expect(result.compressionMode).toBe('custom-target');
      expect(result.targetAchieved).toBe(false); // MUST NOT claim false success
      expect(result.targetUnreachable).toBe(true);
      // Phase 1: Never show "not reduced" for a file that got smaller (100 KB -> 24 KB)
      expect(result.reductionResult).toBe('reduced');
      expect(result.closestAchievableSize).toBe(24 * 1024);
      expect(result.closestAchievableBlob).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 5: Customization State Detection & Reset
  // ─────────────────────────────────────────────────────────────────────────────
  describe('5. Customization State Detection & Reset', () => {
    it('user changes quality and format WITHOUT setting target -> retains Default Optimization with explicit preferences', async () => {
      const origSize = 50 * 1024;
      const item = createMockImageItem('img_format_only', 'photo.png', origSize, 'png', true);

      // User changed output format to webp and quality to 65, without setting a target size
      item.effectiveSettings.mode = 'custom';
      item.effectiveSettings.outputFormat = 'webp';
      item.effectiveSettings.quality = 65;
      item.effectiveSettings.targetFileSize = {
        enabled: false,
        targetBytes: 0,
        targetValue: 0,
        targetUnit: 'KB',
        minQuality: 25,
        userDefined: false,
        isDynamicDefault: false
      };

      setMockEncoder(async (canvas, mime, q) => {
        expect(mime).toBe('image/webp');
        expect(q).toBeLessThanOrEqual(65);
        const size = 22 * 1024;
        return { blob: new Blob([new Uint8Array(size)]), size };
      });

      const result = await service.compressImage(item);

      expect(result.compressionMode).toBe('default');
      expect(result.outputFormat).toBe('webp');
      expect(result.reductionResult).toBe('reduced');
      expect(result.targetBytesRequested).toBeUndefined();
    });

    it('resetting settings returns image to Default Compression Mode', async () => {
      const stateService = new CompressorStateService();
      const origSize = 100 * 1024;
      const file = createMockFile('test.jpg', origSize, 'image/jpeg');

      await stateService.addFiles([file]);
      const added = stateService.images()[0];

      // Step 1: User customizes with strict target size 30 KB
      stateService.updateIndividualSettings(added.id, {
        targetFileSize: {
          enabled: true,
          targetValue: 30,
          targetUnit: 'KB',
          targetBytes: 30 * 1024,
          minQuality: 25,
          userDefined: true,
          isDynamicDefault: false
        }
      });

      const customized = stateService.images()[0];
      expect(customized.individualSettings.hasCustomSettings).toBe(true);
      expect(customized.effectiveSettings.targetFileSize?.userDefined).toBe(true);

      // Step 2: User resets individual settings back to global
      stateService.resetIndividualSettings(added.id);

      const reset = stateService.images()[0];
      expect(reset.individualSettings.hasCustomSettings).toBe(false);
      expect(reset.effectiveSettings.targetFileSize?.userDefined).toBe(false);
      expect(reset.effectiveSettings.targetFileSize?.isDynamicDefault).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 6: Multiple Images with Mixed Modes in Batch
  // ─────────────────────────────────────────────────────────────────────────────
  describe('6. Multiple Images Independent Mode Execution', () => {
    it('applies correct compression mode independently per image in a batch', async () => {
      // Image 1: Default untouched state -> Default Compression Mode
      const img1 = createMockImageItem('batch_1', 'img1.png', 50 * 1024, 'png', false);

      // Image 2: Customized target 15 KB -> Custom Target Mode
      const img2 = createMockImageItem('batch_2', 'img2.jpg', 60 * 1024, 'jpeg', true);
      img2.effectiveSettings.targetFileSize = {
        enabled: true,
        targetBytes: 15 * 1024,
        targetValue: 15,
        targetUnit: 'KB',
        minQuality: 25,
        userDefined: true,
        isDynamicDefault: false
      };

      setMockEncoder(async (canvas, mime, q) => {
        // If called for img2's target, deliver 14 KB; otherwise 30 KB
        const size = mime === 'image/jpeg' ? 14 * 1024 : 30 * 1024;
        return { blob: new Blob([new Uint8Array(size)]), size };
      });

      const res1 = await service.compressImage(img1);
      const res2 = await service.compressImage(img2);

      // Verification: Image 1 ran in Default Mode
      expect(res1.compressionMode).toBe('default');
      expect(res1.targetBytesRequested).toBeUndefined();
      expect(res1.reductionResult).toBe('reduced');

      // Verification: Image 2 ran in Custom Target Mode
      expect(res2.compressionMode).toBe('custom-target');
      expect(res2.targetBytesRequested).toBe(15 * 1024);
      expect(res2.compressedSize).toBeLessThanOrEqual(15 * 1024);
      expect(res2.targetAchieved).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 7: Closest Achievable Result Application
  // ─────────────────────────────────────────────────────────────────────────────
  describe('7. Closest Achievable Result Application', () => {
    it('allows user to explicitly accept closest achievable result via state service', async () => {
      const stateService = new CompressorStateService();
      const origSize = 100 * 1024;
      const file = createMockFile('hero.png', origSize, 'image/png');

      await stateService.addFiles([file]);
      const item = stateService.images()[0];

      // Simulate compression result where target was unreachable, but closest size was 25 KB
      const closestBlob = new Blob([new Uint8Array(25 * 1024)]);
      (stateService as any).updateItemState(item.id, {
        status: 'completed',
        result: {
          imageId: item.id,
          originalSize: origSize,
          compressedSize: origSize,
          savedBytes: 0,
          savedPercentage: 0,
          originalWidth: 800,
          originalHeight: 600,
          outputWidth: 800,
          outputHeight: 600,
          originalFormat: 'png',
          outputFormat: 'png',
          outputMimeType: 'image/png',
          outputBlob: file,
          outputUrl: 'blob:orig',
          outputFilename: 'hero.png',
          processingTimeMs: 120,
          status: 'completed',
          targetAchieved: false,
          targetUnreachable: true,
          targetBytesRequested: 10 * 1024,
          closestAchievableSize: 25 * 1024,
          closestAchievableBlob: closestBlob,
          reductionResult: 'not reduced',
          reductionReason: "Your target size couldn't be reached without significant quality loss. Try a larger target."
        }
      });

      const before = stateService.images()[0];
      expect(before.result?.targetUnreachable).toBe(true);
      expect(before.result?.compressedSize).toBe(origSize);

      // User triggers acceptance of closest achievable result
      stateService.applyClosestResult(item.id);

      const after = stateService.images()[0];
      expect(after.result?.compressedSize).toBe(25 * 1024);
      expect(after.result?.savedBytes).toBe(75 * 1024);
      expect(after.result?.reductionResult).toBe('reduced');
      expect(after.result?.targetUnreachable).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 8: Format Safety & Two-Stage Workflow Validation
  // ─────────────────────────────────────────────────────────────────────────────
  describe('8. Format Safety & Two-Stage Workflow Validation', () => {
    it('1. PNG uploaded with ORIGINAL selected remains PNG', async () => {
      const item = createMockImageItem('p1', 'test.png', 50 * 1024, 'png', false);
      item.effectiveSettings.outputFormat = 'original';
      setMockEncoder(async (canvas, mime) => ({ blob: new Blob([new Uint8Array(40 * 1024)]), size: 40 * 1024 }));

      const res = await service.compressImage(item);
      expect(res.outputFormat).toBe('png');
      expect(res.outputMimeType).toBe('image/png');
    });

    it('2. JPG uploaded with ORIGINAL selected remains JPG', async () => {
      const item = createMockImageItem('j1', 'test.jpg', 60 * 1024, 'jpeg', false);
      item.effectiveSettings.outputFormat = 'original';
      setMockEncoder(async (canvas, mime) => ({ blob: new Blob([new Uint8Array(45 * 1024)]), size: 45 * 1024 }));

      const res = await service.compressImage(item);
      expect(res.outputFormat).toBe('jpeg');
      expect(res.outputMimeType).toBe('image/jpeg');
    });

    it('3. WebP and AVIF preserve their formats when ORIGINAL is selected', async () => {
      const origCanEncode = (service as any).capabilityService.canEncode;
      (service as any).capabilityService.canEncode = vi.fn().mockReturnValue(true);

      const webpItem = createMockImageItem('w1', 'test.webp', 30 * 1024, 'webp', false);
      webpItem.effectiveSettings.outputFormat = 'original';
      setMockEncoder(async (canvas, mime) => ({ blob: new Blob([new Uint8Array(20 * 1024)]), size: 20 * 1024 }));

      const resWebp = await service.compressImage(webpItem);
      expect(resWebp.outputFormat).toBe('webp');

      const avifItem = createMockImageItem('a1', 'test.avif', 30 * 1024, 'avif', false);
      avifItem.effectiveSettings.outputFormat = 'original';
      const resAvif = await service.compressImage(avifItem);
      expect(resAvif.outputFormat).toBe('avif');

      (service as any).capabilityService.canEncode = origCanEncode;
    });

    it('4. Selecting WebP explicitly converts PNG to WebP', async () => {
      const item = createMockImageItem('p_to_w', 'graphic.png', 80 * 1024, 'png', true);
      item.effectiveSettings.outputFormat = 'webp';
      setMockEncoder(async (canvas, mime) => ({ blob: new Blob([new Uint8Array(35 * 1024)]), size: 35 * 1024 }));

      const res = await service.compressImage(item);
      expect(res.outputFormat).toBe('webp');
      expect(res.outputMimeType).toBe('image/webp');
    });

    it('10 & 11. Two-Stage Workflow: successfully processed images move from pending to completed', async () => {
      const stateService = new CompressorStateService();
      const file1 = createMockFile('a.png', 50 * 1024, 'image/png');
      const file2 = createMockFile('b.jpg', 60 * 1024, 'image/jpeg');

      await stateService.addFiles([file1, file2]);
      expect(stateService.pendingImages().length).toBe(2);
      expect(stateService.completedImages().length).toBe(0);

      // Simulate compression of first file
      (stateService as any).updateItemState(stateService.images()[0].id, {
        status: 'completed',
        result: {
          imageId: stateService.images()[0].id,
          originalSize: 50 * 1024,
          compressedSize: 30 * 1024,
          savedBytes: 20 * 1024,
          savedPercentage: 40,
          outputFormat: 'png',
          status: 'completed',
          reductionResult: 'reduced'
        } as any
      });

      // File 1 has moved to completed; file 2 remains in pending
      expect(stateService.pendingImages().length).toBe(1);
      expect(stateService.pendingImages()[0].originalName).toBe('b.jpg');
      expect(stateService.completedImages().length).toBe(1);
      expect(stateService.completedImages()[0].originalName).toBe('a.png');
    });
  });
});

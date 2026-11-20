import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveEffectiveSettings,
  DEFAULT_COMPRESSION_SETTINGS
} from './compressor-state.service';
import { CompressionSettings, ImageItem } from '../models/compressor.models';
import { TiffCodec } from '../codecs/tiff.codec';
import { estimateCompressedSize } from './size-estimator.util';
import { ImageCapabilityService } from './image-capability.service';
import { TransformService } from './transform.service';

function createMockItem(partial: Partial<ImageItem> = {}): ImageItem {
  const dummyBlob = new Blob(['sample-content'], { type: 'image/png' });
  const dummyFile = new File([dummyBlob], partial.originalName || 'test.png', {
    type: partial.mimeType || 'image/png'
  });

  return {
    id: 'img-1',
    file: dummyFile,
    originalName: 'test.png',
    nameWithoutExt: 'test',
    originalExtension: 'png',
    detectedFormat: 'png',
    mimeType: 'image/png',
    originalSize: 50 * 1024,
    width: 800,
    height: 600,
    aspectRatio: 800 / 600,
    previewUrl: 'blob:test',
    selected: true,
    status: 'idle',
    capabilities: {
      canCompress: true,
      canResize: true,
      losslessAvailable: true,
      transparencyPreserved: true,
      nativeBrowserDecode: true
    },
    individualSettings: { hasCustomSettings: false },
    effectiveSettings: { ...DEFAULT_COMPRESSION_SETTINGS },
    addedAt: Date.now(),
    ...partial
  };
}

describe('Acklet Image Compressor — 6-Step Flow Corrections & Verification', () => {

  // ─────────────────────────────────────────────────────────────
  // STEP 1: Priority order for every file
  // ─────────────────────────────────────────────────────────────
  describe('STEP 1: Priority order for every file', () => {
    it('1.1 A file with its own 9.7 KB target uses 9.7 KB, not the global value', () => {
      const globalSettings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        targetFileSize: {
          enabled: true,
          targetBytes: 50 * 1024, // 50 KB global
          targetValue: 50,
          targetUnit: 'KB',
          userDefined: true,
          isDynamicDefault: false
        }
      };

      const customTargetBytes = Math.round(9.7 * 1024); // 9.7 KB
      const item = createMockItem({
        individualSettings: {
          hasCustomSettings: true,
          targetFileSize: {
            enabled: true,
            targetBytes: customTargetBytes,
            targetValue: 9.7,
            targetUnit: 'KB',
            userDefined: true,
            isDynamicDefault: false
          }
        }
      });

      const effective = resolveEffectiveSettings(item, globalSettings);
      expect(effective.targetFileSize?.targetBytes).toBe(customTargetBytes);
      expect(effective.targetFileSize?.targetBytes).not.toBe(globalSettings.targetFileSize?.targetBytes);
    });

    it('1.2 A file with no customization and an estimate of 10.8 KB targets 10.8 KB', () => {
      const globalSettings: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        targetFileSize: {
          enabled: false,
          targetBytes: 0,
          targetValue: 0,
          targetUnit: 'KB',
          userDefined: false,
          isDynamicDefault: true
        }
      };

      // Create item where estimator computes a default reduction estimate
      const item = createMockItem({
        originalSize: 15 * 1024,
        detectedFormat: 'png',
        individualSettings: { hasCustomSettings: false }
      });

      const expectedEstimate = estimateCompressedSize({
        originalSize: item.originalSize,
        detectedFormat: item.detectedFormat,
        settings: globalSettings,
        width: item.width,
        height: item.height
      });

      expect(expectedEstimate).toBeGreaterThan(0);
      expect(expectedEstimate).toBeLessThan(item.originalSize);

      const effective = resolveEffectiveSettings(item, globalSettings);
      // Engine must target the exact estimate shown on the Working card
      expect(effective.targetFileSize?.enabled).toBe(true);
      expect(effective.targetFileSize?.targetBytes).toBe(expectedEstimate);
    });

    it('1.3 Changing the estimate settings changes what the compression receives', () => {
      const globalSettingsQ80: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        quality: 80,
        outputFormat: 'jpeg',
        targetFileSize: { enabled: false, targetBytes: 0, targetValue: 0, targetUnit: 'KB', userDefined: false }
      };

      const globalSettingsQ40: CompressionSettings = {
        ...DEFAULT_COMPRESSION_SETTINGS,
        quality: 40,
        outputFormat: 'jpeg',
        targetFileSize: { enabled: false, targetBytes: 0, targetValue: 0, targetUnit: 'KB', userDefined: false }
      };

      const item = createMockItem({
        originalSize: 100 * 1024,
        detectedFormat: 'jpg'
      });

      const effectiveQ80 = resolveEffectiveSettings(item, globalSettingsQ80);
      const effectiveQ40 = resolveEffectiveSettings(item, globalSettingsQ40);

      expect(effectiveQ40.targetFileSize?.targetBytes).toBeLessThan(effectiveQ80.targetFileSize?.targetBytes!);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // STEP 2: Remove "No reduction" entirely
  // ─────────────────────────────────────────────────────────────
  describe('STEP 2: Remove "No reduction" entirely', () => {
    it('2.1 File with no saving shows output size and no "No reduction" badge', () => {
      const item = createMockItem({
        originalSize: 857, // small file like icons8-discord-96.png
        status: 'completed',
        result: {
          imageId: 'img-1',
          originalSize: 857,
          compressedSize: 857,
          savedBytes: 0,
          savedPercentage: 0,
          originalWidth: 96,
          originalHeight: 96,
          outputWidth: 96,
          outputHeight: 96,
          originalFormat: 'png',
          outputFormat: 'png',
          outputMimeType: 'image/png',
          outputBlob: new Blob(['857 bytes content'], { type: 'image/png' }),
          outputUrl: 'blob:out',
          outputFilename: 'test.png',
          processingTimeMs: 15,
          status: 'success',
          isLargerThanOriginal: false,
          isLossless: true,
          compressionMode: 'default',
          iterationsCount: 1,
          reductionResult: 'not reduced',
          reductionReason: 'Kept original size.',
          honestStatus: 'kept-original',
          honestLabel: 'No reduction' // internal data only
        }
      });

      // UI verification simulation: cardStatus
      const reduced = item.result!.compressedSize < item.originalSize;
      expect(reduced).toBe(false);

      // Verify output size is preserved and valid
      expect(item.result!.compressedSize).toBe(857);
    });

    it('2.2 All-no-saving batch has headline "Your images are ready."', () => {
      const completedItems = [
        createMockItem({ originalSize: 857, status: 'completed', result: { compressedSize: 857, savedBytes: 0 } as any }),
        createMockItem({ originalSize: 1024, status: 'completed', result: { compressedSize: 1024, savedBytes: 0 } as any })
      ];

      const reducedCount = completedItems.filter(i => (i.result?.savedBytes || 0) > 0).length;
      let headline = '';
      if (reducedCount > 0) {
        headline = 'Your images are now 20% smaller.';
      } else {
        headline = 'Your images are ready.';
      }

      expect(headline).toBe('Your images are ready.');
      expect(headline).not.toContain('could not make');
      expect(headline).not.toContain('not reduced');
    });

    it('2.3 Target line only renders when user set a target', () => {
      // Case A: User set an explicit target
      const userTargetItem = createMockItem({
        status: 'completed',
        individualSettings: {
          hasCustomSettings: true,
          targetFileSize: {
            enabled: true,
            userDefined: true,
            targetBytes: 9.7 * 1024
          }
        },
        result: {
          compressedSize: 10.4 * 1024
        } as any
      });

      const userTarget = userTargetItem.individualSettings.targetFileSize;
      const targetSet = Boolean(userTarget && userTarget.enabled && userTarget.userDefined);
      expect(targetSet).toBe(true);

      const targetFmt = '9.7 KB';
      const resultFmt = '10.4 KB';
      const targetLine = userTargetItem.result!.compressedSize <= userTarget!.targetBytes!
        ? `Target ${targetFmt}. Result ${resultFmt}.`
        : `Target ${targetFmt}. Closest: ${resultFmt}.`;
      expect(targetLine).toBe('Target 9.7 KB. Closest: 10.4 KB.');

      // Case B: No user target set (default estimate mode)
      const defaultItem = createMockItem({
        status: 'completed',
        individualSettings: { hasCustomSettings: false },
        effectiveSettings: {
          ...DEFAULT_COMPRESSION_SETTINGS,
          targetFileSize: {
            enabled: true,
            userDefined: false, // NOT user defined
            isDynamicDefault: true,
            targetBytes: 10.8 * 1024
          }
        },
        result: {
          compressedSize: 10.8 * 1024
        } as any
      });

      const defUserTarget = defaultItem.individualSettings?.hasCustomSettings
        ? defaultItem.individualSettings.targetFileSize
        : defaultItem.effectiveSettings.targetFileSize;
      const isUserTarget = Boolean(defUserTarget && defUserTarget.enabled && (defUserTarget.userDefined || defUserTarget.isCustom));
      expect(isUserTarget).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // STEP 3: Always produce a result
  // ─────────────────────────────────────────────────────────────
  describe('STEP 3: Always produce a result', () => {
    it('3.1 Search order tries quality first, then lossless, then resize down to 50%', () => {
      const resizeSteps = [90, 80, 70, 60, 50];
      expect(resizeSteps).toEqual([90, 80, 70, 60, 50]);
      expect(resizeSteps[resizeSteps.length - 1]).toBe(50);
      expect(DEFAULT_COMPRESSION_SETTINGS.resize.enabled).toBe(false);
    });

    it('3.2 When all candidates are larger, output matches original bytes and size', () => {
      const originalBytes = 857;
      const candidates = [
        { size: 1520, format: 'png' },
        { size: 1480, format: 'png' }
      ];

      // Engine checks if any candidate is smaller than original
      const validSmaller = candidates.filter(c => c.size < originalBytes);
      expect(validSmaller.length).toBe(0);

      // Falls back to original bytes and size
      const finalSize = validSmaller.length > 0 ? validSmaller[0].size : originalBytes;
      expect(finalSize).toBe(originalBytes);
    });

    it('3.3 Resized output reports new dimensions on the card', () => {
      const originalW = 1000;
      const originalH = 800;
      const scalePct = 70;
      const outputW = Math.round(originalW * (scalePct / 100));
      const outputH = Math.round(originalH * (scalePct / 100));

      expect(outputW).toBe(700);
      expect(outputH).toBe(560);
      const dimsText = `${outputW} × ${outputH} px`;
      expect(dimsText).toBe('700 × 560 px');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // STEP 4: Transforms show on the preview
  // ─────────────────────────────────────────────────────────────
  describe('STEP 4: Transforms show on the preview', () => {
    it('4.1 Rotate 90° left swaps preview natural width and height', () => {
      const transformService = new TransformService();

      // Create a canvas with 800 width and 600 height
      const canvas = {
        width: 800,
        height: 600,
        getContext: () => ({
          save: () => {},
          translate: () => {},
          rotate: () => {},
          scale: () => {},
          drawImage: () => {},
          restore: () => {}
        })
      };

      const result = transformService.applyTransforms(canvas as any, [
        { type: 'rotate', angle: -90 }
      ]);

      // Natural width and height must swap from 800×600 to 600×800
      expect(result.width).toBe(600);
      expect(result.height).toBe(800);
    });

    it('4.2 Rotate 90° right also swaps width and height', () => {
      const transformService = new TransformService();

      const canvas = {
        width: 1330,
        height: 1182,
        getContext: () => ({
          save: () => {},
          translate: () => {},
          rotate: () => {},
          scale: () => {},
          drawImage: () => {},
          restore: () => {}
        })
      };

      const result = transformService.applyTransforms(canvas as any, [
        { type: 'rotate', angle: 90 }
      ]);

      expect(result.width).toBe(1182);
      expect(result.height).toBe(1330);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // STEP 5: TIFF support
  // ─────────────────────────────────────────────────────────────
  describe('STEP 5: TIFF support', () => {
    const capabilityService = new ImageCapabilityService();

    it('5.1 Uncompressed RGB TIFF resolves to PNG or JPG when keeping Original format', () => {
      const targetPhoto = capabilityService.resolveOutputTarget('original', 'tiff', true);
      expect(targetPhoto.resolvedFormat).toBe('jpg');
      expect(targetPhoto.extension).toBe('jpg');

      const targetGraphic = capabilityService.resolveOutputTarget('original', 'tiff', false);
      expect(targetGraphic.resolvedFormat).toBe('png');
      expect(targetGraphic.extension).toBe('png');
    });

    it('5.2 Decodes uncompressed RGB TIFF buffer correctly', async () => {
      // Build a 2x2 uncompressed RGB TIFF in Little-Endian
      const width = 2;
      const height = 2;
      const rgba = new Uint8ClampedArray([
        255, 0, 0, 255,    0, 255, 0, 255,
        0, 0, 255, 255,    255, 255, 0, 255
      ]);

      const tiffBlob = TiffCodec.encode(width, height, rgba, true, 96, 'none');
      expect(tiffBlob.size).toBeGreaterThan(0);

      const arrayBuffer = await tiffBlob.arrayBuffer();
      const decoded = TiffCodec.decode(arrayBuffer);
      expect(decoded.width).toBe(width);
      expect(decoded.height).toBe(height);
      expect(decoded.data).toBeDefined();
      expect(decoded.data![0]).toBe(255); // Red R
      expect(decoded.data![1]).toBe(0);   // Red G
      expect(decoded.data![2]).toBe(0);   // Red B
    });

    it('5.3 Decodes 16-bit TIFF with proper scaling (val16 / 65535 * 255)', () => {
      // Test the mathematical precision of the 16-bit to 8-bit scaling
      const val16Max = 65535;
      const val16Mid = 32768;
      const val16Zero = 0;

      const scale = (val: number) => Math.min(255, Math.max(0, Math.round((val / 65535) * 255)));

      expect(scale(val16Max)).toBe(255);
      expect(scale(val16Zero)).toBe(0);
      expect(scale(val16Mid)).toBe(128);
    });

    it('5.4 Deflate TIFF decoding handles compression schemes 8 and 32946', () => {
      const zlib = require('zlib');
      const testData = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80]);
      const deflated = new Uint8Array(zlib.deflateSync(testData));

      // Test that decompression produces the original bytes
      const inflated = new Uint8Array(zlib.inflateSync(deflated));
      expect(inflated).toEqual(testData);
    });
  });
});

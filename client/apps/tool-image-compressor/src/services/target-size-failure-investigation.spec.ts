// apps/tool-image-compressor/src/services/target-size-failure-investigation.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImageCompressionService } from './image-compression.service';
import { IntelligentOptimizationEngine } from './intelligent-optimization-engine';
import { PngOptimizationStrategy } from './format-strategy/png-strategy';
import { FormatStrategySelectorService } from './format-strategy/format-strategy-selector.service';
import { resultStatus } from './result-status.util';
import { ImageItem } from '../models/compressor.models';
import { DEFAULT_COMPRESSION_SETTINGS } from './compressor-state.service';
import { ImageEncoderService } from './image-encoder.service';
import * as imgOpt from './image-optimizer.util';

describe('Acklet Image Compressor — Phase 3 Target-Size Failure Investigation', () => {
  let compressionService: ImageCompressionService;
  let intelligentEngine: IntelligentOptimizationEngine;
  let formatStrategySelector: FormatStrategySelectorService;

  function createMockCanvas(width: number, height: number) {
    const pixelCount = width * height;
    const rgba = new Uint8ClampedArray(pixelCount * 4);
    for (let i = 0; i < pixelCount; i++) {
      const idx = i * 4;
      rgba[idx] = (i * 3) % 256;
      rgba[idx + 1] = (i * 5) % 256;
      rgba[idx + 2] = (i * 7) % 256;
      rgba[idx + 3] = (i % 10 === 0) ? 0 : 255; // 10% transparency
    }

    const ctx = {
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue({
        data: rgba,
        width,
        height
      }),
      putImageData: vi.fn(),
      fillStyle: '#FFFFFF',
      fillRect: vi.fn()
    };

    return {
      width,
      height,
      getContext: vi.fn().mockReturnValue(ctx),
      toBlob: vi.fn((cb: any, type: string) => {
        cb(new Blob([new Uint8Array(1000)], { type: type || 'image/png' }));
      }),
      convertToBlob: vi.fn().mockResolvedValue(new Blob([new Uint8Array(1000)], { type: 'image/png' }))
    } as any;
  }

  function createPngImageItem(originalBytes = 1048576, width = 1330, height = 1182): ImageItem {
    const file = new File([new Uint8Array(originalBytes)], 'Minimalist-Emblem.png', { type: 'image/png' });
    return {
      id: 'img-test-1',
      file,
      originalName: 'Minimalist-Emblem.png',
      nameWithoutExt: 'Minimalist-Emblem',
      originalExtension: 'png',
      originalSize: originalBytes,
      detectedFormat: 'png',
      mimeType: 'image/png',
      status: 'pending',
      width,
      height,
      aspectRatio: width / height,
      previewUrl: '',
      individualSettings: {
        hasCustomSettings: true,
        outputFormat: 'original',
        quality: 80,
        targetFileSize: {
          enabled: true,
          targetValue: 50,
          targetUnit: 'KB',
          targetBytes: 50 * 1024,
          userDefined: true,
          isDynamicDefault: false,
          minQuality: 5
        },
        resize: {
          enabled: false,
          mode: 'percentage',
          percentage: 100,
          maintainAspectRatio: true
        }
      },
      effectiveSettings: {
        ...DEFAULT_COMPRESSION_SETTINGS,
        outputFormat: 'original',
        quality: 80,
        targetFileSize: {
          enabled: true,
          targetValue: 50,
          targetUnit: 'KB',
          targetBytes: 50 * 1024,
          userDefined: true,
          isDynamicDefault: false,
          minQuality: 5
        },
        resize: {
          enabled: false,
          mode: 'percentage',
          percentage: 100,
          maintainAspectRatio: true,
          width: undefined,
          height: undefined
        }
      }
    };
  }

  beforeEach(() => {
    compressionService = new ImageCompressionService();
    intelligentEngine = new IntelligentOptimizationEngine();
    formatStrategySelector = new FormatStrategySelectorService();

    // Mock decoder
    (compressionService as any).decoder = {
      decodeFile: vi.fn().mockImplementation(async (file: File) => ({
        canvas: createMockCanvas(1330, 1182),
        width: 1330,
        height: 1182,
        objectUrlToRevoke: null
      })),
      createCanvas: vi.fn().mockImplementation((w: number, h: number) => {
        const c = createMockCanvas(w, h);
        return { canvas: c, ctx: c.getContext('2d') };
      })
    };
  });

  describe('1. Root Cause Investigation: Lossy Palette Optimization Invocation', () => {
    it('PNG strategy generates lossy palette candidates when target-size mode is active', async () => {
      const canvas = createMockCanvas(1330, 1182);
      const mockEncoder = {
        encode: vi.fn().mockImplementation(async (c: any, mime: string, q: number) => {
          // Q100 = Lossless (96.1 KB = 98406 bytes)
          if (q === 100) {
            return { blob: new Blob([new Uint8Array(98406)], { type: 'image/png' }), size: 98406, mimeType: 'image/png' };
          }
          // Palette configurations
          const colors = q >= 90 ? 256 : (q >= 75 ? 192 : (q >= 55 ? 128 : (q >= 35 ? 64 : (q >= 20 ? 32 : 16))));
          const size = Math.round(30000 + (colors / 256) * 45000); // 32k - 75k
          return { blob: new Blob([new Uint8Array(size)], { type: 'image/png' }), size, mimeType: 'image/png' };
        })
      } as unknown as ImageEncoderService;

      const candidates = await PngOptimizationStrategy.generateCandidates(
        canvas,
        {
          detectedFormat: 'png',
          targetFormat: 'original',
          originalSize: 1048576,
          width: 1330,
          height: 1182,
          hasAlpha: true,
          isPhoto: false,
          uniqueColorCount: 256,
          isLosslessRequested: false, // Target mode does NOT force pure lossless
          userQuality: 80,
          isCustomTargetMode: true,
          targetBytes: 50 * 1024
        },
        mockEncoder
      );

      // Verify both lossless and lossy candidates are generated
      const losslessCands = candidates.filter(c => c.strategyName === 'png-lossless');
      const lossyCands = candidates.filter(c => c.strategyName === 'png-lossy');

      expect(losslessCands.length).toBeGreaterThan(0);
      expect(lossyCands.length).toBeGreaterThan(0);
      expect(losslessCands[0].size).toBe(98406); // 96.1 KB
    });

    it('FormatStrategySelector does NOT disallow lossy optimization for custom target mode on PNG', async () => {
      const canvas = createMockCanvas(1330, 1182);
      const mockEncoder = {
        encode: vi.fn().mockImplementation(async (c: any, mime: string, q: number) => {
          if (q === 100) return { blob: new Blob([new Uint8Array(98406)], { type: 'image/png' }), size: 98406, mimeType: 'image/png' };
          return { blob: new Blob([new Uint8Array(45000)], { type: 'image/png' }), size: 45000, mimeType: 'image/png' };
        })
      } as unknown as ImageEncoderService;

      const result = await formatStrategySelector.selectAndExecuteStrategy(
        canvas,
        {
          detectedFormat: 'png',
          targetFormat: 'original',
          originalSize: 1048576,
          width: 1330,
          height: 1182,
          hasAlpha: true,
          isPhoto: false,
          uniqueColorCount: 256,
          isLosslessRequested: false,
          userQuality: 80,
          isCustomTargetMode: true,
          targetBytes: 50 * 1024
        },
        undefined,
        mockEncoder
      );

      // Verify candidates were evaluated and a candidate under 50 KB was selected
      expect(result.allEvaluatedCandidates.length).toBeGreaterThan(1);
      expect(result.selectedCandidate).toBeDefined();
      expect(result.selectedCandidate!.size).toBeLessThanOrEqual(50 * 1024);
      expect(result.targetAchieved).toBe(true);
    });
  });

  describe('2. Target-Size Enforcement: Oversized Candidate Must NEVER Report Target Achieved', () => {
    it('When all PNG candidates exceed 50 KB (e.g. smallest is 96.1 KB), targetAchieved is FALSE and reason is "Target not reached"', async () => {
      const item = createPngImageItem(1048576, 1330, 1182);
      const targetCeiling = 50 * 1024; // 51200 bytes

      // Mock encodeIndexedPng to return 98406 bytes (96.1 KB) at best
      vi.spyOn(imgOpt, 'encodeIndexedPng').mockResolvedValue(
        Object.assign(new Uint8Array(98406), { ssim: 0.88, colors: 16, psnr: 30 })
      );

      // Mock encoder where even minimum palette (16 colors) cannot reach 50 KB (smallest is 96.1 KB)
      const mockEncoder = {
        encode: vi.fn().mockImplementation(async (c: any, mime: string, q: number) => {
          // All configurations return between 98406 (96.1 KB) and 150000 bytes
          const size = Math.round(98406 + (q / 100) * 50000);
          return {
            blob: new Blob([new Uint8Array(size)], { type: 'image/png' }),
            size,
            mimeType: 'image/png'
          };
        }),
        quantizeCanvasColors: vi.fn().mockImplementation(c => c),
        cleanTransparentPixels: vi.fn().mockImplementation(c => c),
        flattenAlphaToWhite: vi.fn().mockImplementation(c => ({ canvas: c, ctx: c.getContext('2d') }))
      };

      (compressionService as any).encoder = mockEncoder;
      if ((compressionService as any).targetOptimizer) {
        (compressionService as any).targetOptimizer.encoder = mockEncoder;
        (compressionService as any).targetOptimizer.decoder = (compressionService as any).decoder;
      }

      const outcome = await compressionService.compressImage(item);

      // ── CRITICAL VERIFICATIONS ──
      // 1. Output size is 96.1 KB (> 50 KB)
      expect(outcome.compressedSize).toBe(98406); // 96.1 KB
      expect(outcome.compressedSize).toBeGreaterThan(targetCeiling);

      // 2. Target must NEVER be reported as achieved!
      expect(outcome.targetAchieved).toBe(false);
      expect(outcome.targetUnreachable).toBe(true);
      expect(outcome.targetBytesRequested).toBe(targetCeiling);

      // 3. Reason must honestly say Target not reached, NEVER "Target achieved at Q..."!
      expect(outcome.reductionReason).not.toContain('Target achieved');
      expect(outcome.reductionReason).toContain('Target not reached');
      expect(outcome.reductionReason).toContain('Closest: 96.1 KB');

      // 4. Closest achievable size tracking
      expect(outcome.closestAchievableSize).toBe(98406);

      // 5. Result-status model verification
      const status = resultStatus(outcome as any);
      expect(status.reduced).toBe(true); // 96.1 KB < 1.0 MB (file got smaller)
      expect(status.targetBytes).toBe(targetCeiling);
      expect(status.targetMet).toBe(false); // <--- targetMet is strictly FALSE!

      // 6. Format safety: strictly kept PNG
      expect(outcome.outputFormat).toBe('png');
      expect(outcome.outputMimeType).toBe('image/png');

      // 7. Dimension safety: strictly kept 1330x1182 (no silent resizing)
      expect(outcome.outputWidth).toBe(1330);
      expect(outcome.outputHeight).toBe(1182);
    });

    it('When a palette configuration satisfies <= 50 KB (e.g. 42 KB at 32 colors), targetAchieved is TRUE', async () => {
      const item = createPngImageItem(1048576, 1330, 1182);
      const targetCeiling = 50 * 1024; // 51200 bytes

      // Mock encodeIndexedPng to return 42000 bytes (< 50 KB)
      vi.spyOn(imgOpt, 'encodeIndexedPng').mockResolvedValue(
        Object.assign(new Uint8Array(42000), { ssim: 0.92, colors: 32, psnr: 32 })
      );

      // Mock encoder where Q100 = 96.1 KB, Q55 = 48 KB, Q20 = 42 KB
      const mockEncoder = {
        encode: vi.fn().mockImplementation(async (c: any, mime: string, q: number) => {
          let size = 98406;
          if (q <= 20) size = 42000;
          else if (q <= 55) size = 48000;
          else if (q <= 75) size = 65000;
          else if (q <= 90) size = 80000;

          return {
            blob: new Blob([new Uint8Array(size)], { type: 'image/png' }),
            size,
            mimeType: 'image/png'
          };
        }),
        quantizeCanvasColors: vi.fn().mockImplementation(c => c),
        cleanTransparentPixels: vi.fn().mockImplementation(c => c),
        flattenAlphaToWhite: vi.fn().mockImplementation(c => ({ canvas: c, ctx: c.getContext('2d') }))
      };

      (compressionService as any).encoder = mockEncoder;
      if ((compressionService as any).targetOptimizer) {
        (compressionService as any).targetOptimizer.encoder = mockEncoder;
        (compressionService as any).targetOptimizer.decoder = (compressionService as any).decoder;
      }

      const outcome = await compressionService.compressImage(item);

      // Verify successful target-size compression
      expect(outcome.compressedSize).toBeLessThanOrEqual(targetCeiling);
      expect(outcome.targetAchieved).toBe(true);
      expect(outcome.targetUnreachable).toBe(false);
      expect(outcome.outputFormat).toBe('png');
      expect(outcome.outputWidth).toBe(1330);
      expect(outcome.outputHeight).toBe(1182);

      const status = resultStatus(outcome as any);
      expect(status.reduced).toBe(true);
      expect(status.targetMet).toBe(true);
    });
  });

  describe('3. Diagnostic Optimization Report Validation', () => {
    it('generates a complete diagnostic report for the 1.0 MB PNG -> 50 KB target test', async () => {
      const canvas = createMockCanvas(1330, 1182);
      const targetBytes = 50 * 1024;

      const mockEncoder = {
        encode: vi.fn().mockImplementation(async (c: any, mime: string, q: number) => {
          const size = q === 100 ? 98406 : Math.round(98406 * 0.95);
          return { blob: new Blob([new Uint8Array(size)], { type: 'image/png' }), size, mimeType: 'image/png' };
        })
      } as unknown as ImageEncoderService;

      const result = await intelligentEngine.optimize({
        canvas,
        mode: 'target-size',
        targetFormat: 'original',
        detectedFormat: 'png',
        originalSize: 1048576,
        targetBytes,
        userQuality: 80,
        encoder: mockEncoder
      });

      // Verify structured outcome diagnostics
      expect(result.originalSize).toBe(1048576);
      expect(result.mode).toBe('target-size');
      expect(result.allEvaluatedCandidates.length).toBeGreaterThan(0);
      expect(result.targetAchieved).toBe(false);
      expect(result.targetUnreachable).toBe(true);
      expect(result.reason).toContain('Requested target could not be reached');
      expect(result.closestAchievableCandidate).toBeDefined();
      expect(result.closestAchievableCandidate!.size).toBe(Math.round(98406 * 0.95));
    });
  });
});

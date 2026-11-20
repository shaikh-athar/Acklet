// apps/tool-image-compressor/src/services/format-strategy.spec.ts
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ImageEncoderService } from './image-encoder.service';
import {
  JpegOptimizationStrategy,
  PngOptimizationStrategy,
  WebpOptimizationStrategy,
  TiffBmpOptimizationStrategy,
  CandidateEvaluator,
  FormatStrategySelectorService,
  StrategySelectionInput,
  CandidateEvaluationConstraints
} from './format-strategy';

describe('Acklet Image Compressor — Phase 2: Format-Specific Optimization & Candidate Evaluation', () => {
  // Helper to create a test canvas with simulated graphics
  function createTestCanvas(width: number, height: number, hasAlpha = false) {
    const canvas = {
      width,
      height,
      getContext: (type: string) => ({
        getImageData: (x: number, y: number, w: number, h: number) => {
          const data = new Uint8ClampedArray(w * h * 4);
          for (let i = 0; i < data.length; i += 4) {
            data[i] = 200;                               // R
            data[i + 1] = 100;                           // G
            data[i + 2] = 50;                            // B
            data[i + 3] = hasAlpha ? (i % 8 === 0 ? 0 : 255) : 255; // A
          }
          return { data, width: w, height: h };
        }
      }),
      toBlob: (cb: any, type: string) => {
        cb(new Blob([new Uint8Array(width * height * 4)], { type: type || 'image/png' }));
      }
    } as any;
    return canvas;
  }

  describe('1. JPEG Optimization Strategy', () => {
    const encoder = new ImageEncoderService();

    it('evaluates and compares progressive vs baseline configurations', async () => {
      const canvas = createTestCanvas(32, 32);
      const input: StrategySelectionInput = {
        detectedFormat: 'jpeg',
        targetFormat: 'jpeg',
        originalSize: 10000,
        width: 32,
        height: 32,
        hasAlpha: false,
        isPhoto: true,
        uniqueColorCount: 256,
        isLosslessRequested: false,
        userQuality: 80,
        isCustomTargetMode: false
      };

      const candidates = await JpegOptimizationStrategy.generateCandidates(canvas, input, encoder);
      expect(candidates.length).toBeGreaterThanOrEqual(2);

      const progCandidate = candidates.find(c => c.configDescription.includes('Progressive'));
      const baseCandidate = candidates.find(c => c.configDescription.includes('Baseline'));

      expect(progCandidate).toBeDefined();
      expect(baseCandidate).toBeDefined();
      expect(progCandidate!.format).toBe('jpeg');
      expect(baseCandidate!.format).toBe('jpeg');
      expect(progCandidate!.size).toBeGreaterThan(0);
      expect(baseCandidate!.size).toBeGreaterThan(0);
    });

    it('generates stepped adaptive quality candidates when targeting strict file sizes', async () => {
      const canvas = createTestCanvas(64, 64);
      const mockEncoder = {
        encode: vi.fn().mockImplementation(async (_c, _m, q) => {
          const size = Math.max(10, Math.round(1000 * (q / 100)));
          return { blob: new Blob([new Uint8Array(size)]), size, mimeType: 'image/jpeg' };
        })
      } as any;

      const input: StrategySelectionInput = {
        detectedFormat: 'jpeg',
        targetFormat: 'jpeg',
        originalSize: 50000,
        width: 64,
        height: 64,
        hasAlpha: false,
        isPhoto: true,
        uniqueColorCount: 256,
        isLosslessRequested: false,
        userQuality: 90,
        isCustomTargetMode: true,
        targetBytes: 500 // smaller than base Q90 (900 bytes)
      };

      const candidates = await JpegOptimizationStrategy.generateCandidates(canvas, input, mockEncoder);
      const adaptiveCandidates = candidates.filter(c => c.configDescription.includes('Adaptive Target'));
      expect(adaptiveCandidates.length).toBeGreaterThan(0);
    });
  });

  describe('2. PNG Optimization Strategy', () => {
    const encoder = new ImageEncoderService();

    it('executes lossless Oxipng with exact pixel integrity and SSIM = 1.0', async () => {
      const canvas = createTestCanvas(16, 16, true);
      const assetPath = path.resolve(
        process.cwd(),
        'apps/tool-image-compressor/src/test-assets/bench/bench-01-logo-480b.png'
      );
      let rawBytes: Uint8Array | undefined;
      if (fs.existsSync(assetPath)) {
        rawBytes = new Uint8Array(fs.readFileSync(assetPath));
      }

      const input: StrategySelectionInput = {
        detectedFormat: 'png',
        targetFormat: 'png',
        originalSize: rawBytes ? rawBytes.length : 852,
        width: 16,
        height: 16,
        hasAlpha: true,
        isPhoto: false,
        uniqueColorCount: 16,
        isLosslessRequested: true, // Lossless requested!
        userQuality: 100,
        isCustomTargetMode: false
      };

      const candidates = await PngOptimizationStrategy.generateCandidates(canvas, input, encoder, rawBytes);
      expect(candidates.length).toBeGreaterThan(0);

      // Verify that every single candidate generated under lossless request is strictly lossless!
      for (const cand of candidates) {
        expect(cand.isLossless).toBe(true);
        expect(cand.ssim).toBe(1.0);
        expect(cand.strategyName).toBe('png-lossless');
      }
    });

    it('evaluates multiple palette configurations in lossy mode and NEVER in lossless mode', async () => {
      const canvas = createTestCanvas(32, 32, false);

      // 1. Lossless request: Lossy candidates must NOT be produced
      const losslessInput: StrategySelectionInput = {
        detectedFormat: 'png',
        targetFormat: 'png',
        originalSize: 50000,
        width: 32,
        height: 32,
        hasAlpha: false,
        isPhoto: false,
        uniqueColorCount: 256,
        isLosslessRequested: true,
        userQuality: 100,
        isCustomTargetMode: false
      };
      const losslessCandidates = await PngOptimizationStrategy.generateCandidates(canvas, losslessInput, encoder);
      expect(losslessCandidates.some(c => c.strategyName === 'png-lossy')).toBe(false);

      // 2. Lossy request (Q80): Palette configurations must be evaluated
      const lossyInput: StrategySelectionInput = {
        detectedFormat: 'png',
        targetFormat: 'png',
        originalSize: 50000,
        width: 32,
        height: 32,
        hasAlpha: false,
        isPhoto: false,
        uniqueColorCount: 256,
        isLosslessRequested: false,
        userQuality: 80,
        isCustomTargetMode: false
      };
      const lossyCandidates = await PngOptimizationStrategy.generateCandidates(canvas, lossyInput, encoder);
      const paletteCandidates = lossyCandidates.filter(c => c.strategyName === 'png-lossy');
      expect(paletteCandidates.length).toBeGreaterThan(0);
      expect(paletteCandidates[0].colors).toBeDefined();
    });
  });

  describe('3. WebP Optimization Strategy', () => {
    const encoder = new ImageEncoderService();

    it('supports both lossy and lossless (VP8L) modes', async () => {
      const canvas = createTestCanvas(16, 16, true);

      // Lossless
      const losslessInput: StrategySelectionInput = {
        detectedFormat: 'webp',
        targetFormat: 'webp',
        originalSize: 2000,
        width: 16,
        height: 16,
        hasAlpha: true,
        isPhoto: false,
        uniqueColorCount: 64,
        isLosslessRequested: true,
        userQuality: 100,
        isCustomTargetMode: false
      };
      const losslessCands = await WebpOptimizationStrategy.generateCandidates(canvas, losslessInput, encoder);
      expect(losslessCands.length).toBeGreaterThan(0);
      expect(losslessCands[0].isLossless).toBe(true);

      // Lossy with effort 4 and 5
      const lossyInput: StrategySelectionInput = {
        detectedFormat: 'webp',
        targetFormat: 'webp',
        originalSize: 2000,
        width: 16,
        height: 16,
        hasAlpha: true,
        isPhoto: true,
        uniqueColorCount: 256,
        isLosslessRequested: false,
        userQuality: 75,
        isCustomTargetMode: false
      };
      const lossyCands = await WebpOptimizationStrategy.generateCandidates(canvas, lossyInput, encoder);
      expect(lossyCands.length).toBeGreaterThanOrEqual(2);
      expect(lossyCands.some(c => c.configDescription.includes('Method 4'))).toBe(true);
      expect(lossyCands.some(c => c.configDescription.includes('Method 5'))).toBe(true);
    });
  });

  describe('4. TIFF and BMP Optimization Strategy', () => {
    const encoder = new ImageEncoderService();

    it('evaluates PackBits lossless compression on TIFF and strips unused alpha samples', async () => {
      const opaqueCanvas = createTestCanvas(16, 16, false); // No alpha
      const input: StrategySelectionInput = {
        detectedFormat: 'tiff',
        targetFormat: 'tiff',
        originalSize: 5000,
        width: 16,
        height: 16,
        hasAlpha: false,
        isPhoto: false,
        uniqueColorCount: 16,
        isLosslessRequested: true,
        userQuality: 100,
        isCustomTargetMode: false
      };

      const candidates = await TiffBmpOptimizationStrategy.generateTiffCandidates(opaqueCanvas, input, encoder);
      expect(candidates.length).toBeGreaterThanOrEqual(1);

      const packBitsCand = candidates.find(c => c.configDescription.includes('PackBits'));
      expect(packBitsCand).toBeDefined();
      expect(packBitsCand!.format).toBe('tiff');
      expect(packBitsCand!.isLossless).toBe(true);
    });

    it('optimizes BMP by stripping unused alpha channel (24-bit RGB) and reports headroom limitation', async () => {
      const opaqueCanvas = createTestCanvas(16, 16, false);
      const input: StrategySelectionInput = {
        detectedFormat: 'bmp',
        targetFormat: 'bmp',
        originalSize: 5000,
        width: 16,
        height: 16,
        hasAlpha: false,
        isPhoto: false,
        uniqueColorCount: 16,
        isLosslessRequested: true,
        userQuality: 100,
        isCustomTargetMode: false
      };

      const candidates = await TiffBmpOptimizationStrategy.generateBmpCandidates(opaqueCanvas, input, encoder);
      expect(candidates.length).toBe(1);
      expect(candidates[0].format).toBe('bmp');
      expect(candidates[0].configDescription).toContain('24-bit RGB');
    });
  });

  describe('5. Candidate Evaluator & Strict User Constraints', () => {
    const mockCandidate = (size: number, ssim: number, format = 'image/jpeg', isLossless = false) => ({
      blob: new Blob([new Uint8Array(size)], { type: format }),
      size,
      mimeType: format,
      format: format.split('/')[1],
      extension: format.split('/')[1],
      width: 100,
      height: 100,
      isLossless,
      ssim,
      strategyName: 'test-strategy',
      configDescription: `Candidate ${size}B`,
      durationMs: 10
    });

    it('strictly rejects any candidate exceeding targetBytes in Custom Target Mode', () => {
      const candidates = [
        mockCandidate(35000, 0.95), // Exceeds 30 KB target
        mockCandidate(29000, 0.91), // Meets target (<= 30 KB)
        mockCandidate(24000, 0.88)  // Meets target (<= 30 KB)
      ];

      const constraints: CandidateEvaluationConstraints = {
        targetBytes: 30000,
        isCustomTargetMode: true,
        strictMaxTarget: true,
        disallowFormatChange: true,
        disallowLossy: false,
        minSsimThreshold: 0.70,
        originalSize: 40000,
        originalWidth: 100,
        originalHeight: 100,
        targetMimeType: 'image/jpeg'
      };

      const result = CandidateEvaluator.evaluateCandidates(candidates, constraints);
      expect(result.targetAchieved).toBe(true);
      expect(result.selectedCandidate).not.toBeNull();
      expect(result.selectedCandidate!.size).toBeLessThanOrEqual(30000);
      // Winner must be 29,000 bytes because its SSIM (0.91) is higher than 24,000 bytes (0.88)
      expect(result.selectedCandidate!.size).toBe(29000);
    });

    it('prefers smaller file size when visual quality difference is within 0.015 threshold', () => {
      const candidates = [
        mockCandidate(28000, 0.920), // SSIM = 0.920
        mockCandidate(25000, 0.915)  // SSIM = 0.915 (diff is 0.005 <= 0.015)
      ];

      const constraints: CandidateEvaluationConstraints = {
        targetBytes: 30000,
        isCustomTargetMode: true,
        strictMaxTarget: true,
        disallowFormatChange: true,
        disallowLossy: false,
        minSsimThreshold: 0.70,
        originalSize: 40000,
        originalWidth: 100,
        originalHeight: 100,
        targetMimeType: 'image/jpeg'
      };

      const result = CandidateEvaluator.evaluateCandidates(candidates, constraints);
      expect(result.selectedCandidate!.size).toBe(25000); // Smaller file size wins
    });

    it('rejects lossy candidates when lossless mode is requested', () => {
      const candidates = [
        mockCandidate(15000, 0.85, 'image/png', false), // lossy
        mockCandidate(25000, 1.0, 'image/png', true)    // lossless
      ];

      const constraints: CandidateEvaluationConstraints = {
        isCustomTargetMode: false,
        strictMaxTarget: false,
        disallowFormatChange: true,
        disallowLossy: true, // Lossless required!
        minSsimThreshold: 0.85,
        originalSize: 30000,
        originalWidth: 100,
        originalHeight: 100,
        targetMimeType: 'image/png'
      };

      const result = CandidateEvaluator.evaluateCandidates(candidates, constraints);
      expect(result.selectedCandidate!.isLossless).toBe(true);
      expect(result.selectedCandidate!.size).toBe(25000);
    });

    it('reports targetUnreachable honestly when no candidate can meet the strict target', () => {
      const candidates = [
        mockCandidate(50000, 0.95),
        mockCandidate(45000, 0.90)
      ];

      const constraints: CandidateEvaluationConstraints = {
        targetBytes: 20000, // target is 20 KB, but smallest is 45 KB
        isCustomTargetMode: true,
        strictMaxTarget: true,
        disallowFormatChange: true,
        disallowLossy: false,
        minSsimThreshold: 0.70,
        originalSize: 60000,
        originalWidth: 100,
        originalHeight: 100,
        targetMimeType: 'image/jpeg'
      };

      const result = CandidateEvaluator.evaluateCandidates(candidates, constraints);
      expect(result.targetAchieved).toBe(false);
      expect(result.targetUnreachable).toBe(true);
      expect(result.selectedCandidate).toBeNull();
      expect(result.closestAchievableCandidate).not.toBeNull();
      expect(result.closestAchievableCandidate!.size).toBe(45000);
      expect(result.reason).toContain('Closest achievable output size: 43.9 KB');
    });
  });

  describe('6. Format Strategy Selector Service', () => {
    it('routes image/jpeg to MozJPEG and selects optimal candidate', async () => {
      const service = new FormatStrategySelectorService();
      const canvas = createTestCanvas(32, 32);

      const input: StrategySelectionInput = {
        detectedFormat: 'jpeg',
        targetFormat: 'original',
        originalSize: 20000,
        width: 32,
        height: 32,
        hasAlpha: false,
        isPhoto: true,
        uniqueColorCount: 256,
        isLosslessRequested: false,
        userQuality: 80,
        isCustomTargetMode: false
      };

      const result = await service.selectAndExecuteStrategy(canvas, input);
      expect(result.allEvaluatedCandidates.length).toBeGreaterThan(0);
      expect(result.selectedCandidate).not.toBeNull();
      expect(result.selectedCandidate!.format).toBe('jpeg');
    });
  });
});

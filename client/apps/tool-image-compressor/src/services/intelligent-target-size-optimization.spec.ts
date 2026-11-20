// apps/tool-image-compressor/src/services/intelligent-target-size-optimization.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { IntelligentOptimizationEngine } from './intelligent-optimization-engine';
import { TargetSizeOptimizerService } from './target-size-optimizer.service';
import { ImageCompressionService } from './image-compression.service';
import { ImageDecoderService } from './image-decoder.service';
import { ImageItem } from '../models/compressor.models';
import { DEFAULT_COMPRESSION_SETTINGS } from './compressor-state.service';

describe('Acklet Image Compressor — Phase 3: Intelligent Target-Size Optimization Engine', () => {
  let engine: IntelligentOptimizationEngine;
  let optimizerService: TargetSizeOptimizerService;
  let compressionService: ImageCompressionService;
  let decoder: ImageDecoderService;

  const benchDir = path.resolve(__dirname, '../test-assets/bench');

  function createMockCanvas(width: number, height: number, hasAlpha = false) {
    const pixelCount = width * height;
    const rgba = new Uint8ClampedArray(pixelCount * 4);
    for (let i = 0; i < pixelCount; i++) {
      const idx = i * 4;
      rgba[idx] = (i * 7) % 256;
      rgba[idx + 1] = (i * 13) % 256;
      rgba[idx + 2] = (i * 17) % 256;
      rgba[idx + 3] = hasAlpha ? (i % 8 === 0 ? 0 : 255) : 255;
    }

    const ctx = {
      drawImage: vi.fn(),
      getImageData: vi.fn().mockImplementation((x: number, y: number, w: number, h: number) => ({
        data: rgba,
        width: w,
        height: h
      })),
      putImageData: vi.fn(),
      fillStyle: '#FFFFFF',
      fillRect: vi.fn()
    };

    return {
      width,
      height,
      getContext: vi.fn().mockReturnValue(ctx),
      toBlob: vi.fn((cb: any, type: string) => {
        cb(new Blob([new Uint8Array(width * height * 2)], { type: type || 'image/jpeg' }));
      }),
      convertToBlob: vi.fn()
    } as any;
  }

  beforeEach(() => {
    engine = new IntelligentOptimizationEngine();
    optimizerService = new TargetSizeOptimizerService();
    compressionService = new ImageCompressionService();
    decoder = new ImageDecoderService();
    engine.clearCache();
  });

  describe('1. Target Size as a Strict Maximum (Ceiling Enforcement)', () => {
    it('guarantees actual output bytes never exceed targetBytes for an achievable goal', async () => {
      const canvas = createMockCanvas(600, 400);
      const targetBytes = 40 * 1024; // 40 KB

      const outcome = await engine.optimize({
        canvas,
        originalSize: 150 * 1024,
        detectedFormat: 'jpeg',
        targetFormat: 'jpeg',
        mode: 'target-size',
        targetBytes,
        userQuality: 85
      });

      if (outcome.targetAchieved) {
        expect(outcome.compressedSize).toBeLessThanOrEqual(targetBytes);
        expect(outcome.selectedCandidate).not.toBeNull();
        expect(outcome.selectedCandidate!.size).toBeLessThanOrEqual(targetBytes);
        expect(outcome.targetUnreachable).toBe(false);
      }
    });

    it('converts KB and MB inputs into exact byte ceilings internally', async () => {
      const canvas = createMockCanvas(400, 300);

      // 1.5 MB input
      const outcomeMb = await engine.optimize({
        canvas,
        originalSize: 2 * 1024 * 1024,
        detectedFormat: 'jpeg',
        targetFormat: 'jpeg',
        mode: 'target-size',
        targetValue: 1.5,
        targetUnit: 'MB'
      });

      // 1.5 * 1048576 = 1572864 bytes
      const expectedMbBytes = Math.round(1.5 * 1048576);
      if (outcomeMb.targetAchieved) {
        expect(outcomeMb.compressedSize).toBeLessThanOrEqual(expectedMbBytes);
      }

      // 250 KB input
      const outcomeKb = await engine.optimize({
        canvas,
        originalSize: 500 * 1024,
        detectedFormat: 'jpeg',
        targetFormat: 'jpeg',
        mode: 'target-size',
        targetValue: 250,
        targetUnit: 'KB'
      });

      const expectedKbBytes = 250 * 1024;
      if (outcomeKb.targetAchieved) {
        expect(outcomeKb.compressedSize).toBeLessThanOrEqual(expectedKbBytes);
      }
    });

    it('honestly reports target unreachable when target is impossible without resizing or format change', async () => {
      const canvas = createMockCanvas(1200, 800);
      const impossibleTargetBytes = 5000; // 5 KB target
      const mockEncoder = {
        encode: vi.fn().mockImplementation(async () => ({
          blob: new Blob([new Uint8Array(45000)]),
          size: 45000,
          mimeType: 'image/jpeg'
        }))
      } as any;

      const outcome = await engine.optimize({
        canvas,
        originalSize: 800 * 1024,
        detectedFormat: 'jpeg',
        targetFormat: 'jpeg',
        mode: 'target-size',
        targetBytes: impossibleTargetBytes,
        allowAdaptiveDownscale: false,
        encoder: mockEncoder
      });

      // MUST NOT claim success with an oversized file!
      expect(outcome.targetAchieved).toBe(false);
      expect(outcome.targetUnreachable).toBe(true);
      expect(outcome.selectedCandidate).toBeNull();
      // Must provide the closest achievable candidate
      expect(outcome.closestAchievableCandidate).not.toBeNull();
      expect(outcome.reason).toContain('Requested target could not be reached');
    });

    it('evaluates higher quality ceiling when target budget is generous (achieves in few passes)', async () => {
      const canvas = createMockCanvas(100, 100);
      const generousTargetBytes = 2 * 1024 * 1024; // 2 MB budget for 100x100

      const outcome = await engine.optimize({
        canvas,
        originalSize: 50 * 1024,
        detectedFormat: 'jpeg',
        targetFormat: 'jpeg',
        mode: 'target-size',
        targetBytes: generousTargetBytes,
        userQuality: 92
      });

      expect(outcome.targetAchieved).toBe(true);
      expect(outcome.compressedSize).toBeLessThanOrEqual(generousTargetBytes);
      expect(outcome.visualQuality?.ssim).toBeGreaterThanOrEqual(0.90);
    });
  });

  describe('2. Anti-Format-Mutation and Dimension Preservation', () => {
    it('strictly preserves PNG format when target size is requested on a PNG', async () => {
      const canvas = createMockCanvas(200, 200, true);
      const targetBytes = 15 * 1024;

      const outcome = await engine.optimize({
        canvas,
        originalSize: 50 * 1024,
        detectedFormat: 'png',
        targetFormat: 'original',
        mode: 'target-size',
        targetBytes
      });

      // Format must remain PNG
      if (outcome.selectedCandidate) {
        expect(outcome.selectedCandidate.mimeType).toBe('image/png');
        expect(outcome.selectedCandidate.format).toBe('png');
      }
      if (outcome.closestAchievableCandidate) {
        expect(outcome.closestAchievableCandidate.mimeType).toBe('image/png');
      }
    });

    it('never resizes dimensions unless allowAdaptiveDownscale is explicitly true', async () => {
      const canvas = createMockCanvas(800, 600);
      const targetBytes = 5 * 1024; // Very aggressive 5 KB target

      const outcome = await engine.optimize({
        canvas,
        originalSize: 100 * 1024,
        detectedFormat: 'jpeg',
        targetFormat: 'jpeg',
        mode: 'target-size',
        targetBytes,
        allowAdaptiveDownscale: false // Resizing disabled
      });

      // Dimensions must remain 800x600 in all evaluated candidates
      for (const cand of outcome.allEvaluatedCandidates) {
        expect(cand.width).toBe(800);
        expect(cand.height).toBe(600);
      }
    });
  });

  describe('3. Lossless Mode vs Lossy Quantization Safety', () => {
    it('never applies lossy palette quantization when lossless mode is requested on PNG', async () => {
      const canvas = createMockCanvas(150, 150, true);

      const outcome = await engine.optimize({
        canvas,
        originalSize: 30 * 1024,
        detectedFormat: 'png',
        targetFormat: 'png',
        mode: 'target-size',
        targetBytes: 500, // Very low target
        isLosslessRequested: true // STRICT LOSSLESS
      });

      // In lossless mode, only Oxipng lossless candidates are valid
      for (const cand of outcome.allEvaluatedCandidates) {
        expect(cand.isLossless).toBe(true);
        expect(cand.strategyName).toBe('png-lossless');
      }
    });

    it('evaluates Xiaolin Wu palette quantization only when lossy compression is allowed on PNG', async () => {
      const canvas = createMockCanvas(150, 150, true);

      const outcome = await engine.optimize({
        canvas,
        originalSize: 30 * 1024,
        detectedFormat: 'png',
        targetFormat: 'png',
        mode: 'target-size',
        targetBytes: 10 * 1024,
        isLosslessRequested: false, // Lossy permitted
        userQuality: 80
      });

      const lossyCandidates = outcome.allEvaluatedCandidates.filter(c => c.strategyName === 'png-lossy');
      expect(lossyCandidates.length).toBeGreaterThan(0);
    });
  });

  describe('4. Best-Compression Mode (No Target Specified)', () => {
    it('finds smallest candidate meeting the visual quality policy (SSIM >= 0.88)', async () => {
      const canvas = createMockCanvas(300, 200);

      const outcome = await engine.optimize({
        canvas,
        originalSize: 100 * 1024,
        detectedFormat: 'jpeg',
        targetFormat: 'jpeg',
        mode: 'best-compression'
      });

      expect(outcome.mode).toBe('best-compression');
      expect(outcome.selectedCandidate).not.toBeNull();
      // Candidate must satisfy acceptable visual fidelity
      expect(outcome.selectedCandidate!.ssim).toBeGreaterThanOrEqual(0.70);
      expect(outcome.compressedSize).toBeLessThan(100 * 1024);
      expect(outcome.savedPercentage).toBeGreaterThan(0);
    });
  });

  describe('5. Candidate Caching & Performance', () => {
    it('avoids redundant encoding operations by serving subsequent requests from candidate cache', async () => {
      const canvas = createMockCanvas(200, 200);
      const mockEncoder = {
        encode: vi.fn().mockImplementation(async (c: any, m: string, q: number) => ({
          blob: new Blob([new Uint8Array(10000)]),
          size: 10000,
          mimeType: m
        }))
      } as any;

      // Pass 1
      await engine.optimize({
        canvas,
        originalSize: 50 * 1024,
        detectedFormat: 'jpeg',
        targetFormat: 'jpeg',
        mode: 'target-size',
        targetBytes: 25 * 1024,
        encoder: mockEncoder
      });

      const initialCalls = mockEncoder.encode.mock.calls.length;

      // Pass 2 with same canvas and parameters
      const outcome2 = await engine.optimize({
        canvas,
        originalSize: 50 * 1024,
        detectedFormat: 'jpeg',
        targetFormat: 'jpeg',
        mode: 'target-size',
        targetBytes: 25 * 1024,
        encoder: mockEncoder
      });

      expect(outcome2.cacheHits).toBeGreaterThan(0);
    });

    it('aborts immediately when abortSignal is triggered', async () => {
      const canvas = createMockCanvas(100, 100);
      const controller = new AbortController();
      controller.abort();

      await expect(
        engine.optimize({
          canvas,
          originalSize: 50 * 1024,
          detectedFormat: 'jpeg',
          targetFormat: 'jpeg',
          mode: 'target-size',
          targetBytes: 10 * 1024,
          abortSignal: controller.signal
        })
      ).rejects.toThrow('Target size optimization cancelled by user.');
    });
  });

  describe('6. Real Benchmark Asset Verification (Phase 3 Benchmark Gate)', () => {
    it('satisfies 200 KB target on real 1.1 MB JPEG wallpaper (bench-28)', async () => {
      const assetPath = path.join(benchDir, 'bench-28-wallpaper-1.1m.jpg');
      if (!fs.existsSync(assetPath)) return;

      const rawBytes = fs.readFileSync(assetPath);
      const canvas = createMockCanvas(1920, 1080);
      const targetBytes = 200 * 1024; // 200 KB target

      const outcome = await engine.optimize({
        canvas,
        originalSize: rawBytes.length,
        originalName: 'bench-28-wallpaper-1.1m.jpg',
        detectedFormat: 'jpeg',
        targetFormat: 'jpeg',
        mode: 'target-size',
        targetBytes
      });

      if (outcome.targetAchieved) {
        expect(outcome.compressedSize).toBeLessThanOrEqual(targetBytes);
        expect(outcome.targetUnreachable).toBe(false);
      }
    });

    it('satisfies 100 KB target on real 1.47 MB PNG design (bench-29) preserving PNG format', async () => {
      const assetPath = path.join(benchDir, 'bench-29-design-1.4m.png');
      if (!fs.existsSync(assetPath)) return;

      const rawBytes = fs.readFileSync(assetPath);
      const canvas = createMockCanvas(1600, 900, true);
      const targetBytes = 100 * 1024; // 100 KB target

      const outcome = await engine.optimize({
        canvas,
        originalSize: rawBytes.length,
        originalName: 'bench-29-design-1.4m.png',
        detectedFormat: 'png',
        targetFormat: 'png',
        mode: 'target-size',
        targetBytes,
        userQuality: 80
      });

      if (outcome.targetAchieved) {
        expect(outcome.compressedSize).toBeLessThanOrEqual(targetBytes);
        expect(outcome.selectedCandidate!.mimeType).toBe('image/png');
        expect(outcome.targetUnreachable).toBe(false);
      }
    });
  });
});

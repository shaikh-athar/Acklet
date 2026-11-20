// apps/tool-image-compressor/src/services/unrestricted-target-size.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DropdownManagerService } from './dropdown-manager.service';
import { CandidateEvaluator } from './format-strategy/candidate-evaluator';
import { StrategyCandidate, CandidateEvaluationConstraints } from './format-strategy/format-strategy.models';
import { PngOptimizationStrategy } from './format-strategy/png-strategy';
import { ImageEncoderService } from './image-encoder.service';
import { IntelligentOptimizationEngine } from './intelligent-optimization-engine';
import { ImageCapabilityService } from './image-capability.service';
import { ImageItem } from '../models/compressor.models';
import { DEFAULT_COMPRESSION_SETTINGS } from './compressor-state.service';

describe('Acklet Image Compressor — Unrestricted Target-Size Optimization & Centralized UI Regression', () => {

  describe('1. Centralized Dropdown Manager (Mutual Exclusion)', () => {
    let dropdownManager: DropdownManagerService;

    beforeEach(() => {
      dropdownManager = new DropdownManagerService();
    });

    it('initializes with no active dropdown', () => {
      expect(dropdownManager.activeDropdownId()).toBeNull();
      expect(dropdownManager.isOpen('more-menu')).toBe(false);
      expect(dropdownManager.isOpen('add-source-menu')).toBe(false);
    });

    it('enforces that opening one dropdown immediately closes any other open dropdown', () => {
      dropdownManager.open('more-menu');
      expect(dropdownManager.isOpen('more-menu')).toBe(true);
      expect(dropdownManager.isOpen('add-source-menu')).toBe(false);

      // Open second dropdown -> first dropdown must automatically close
      dropdownManager.open('add-source-menu');
      expect(dropdownManager.isOpen('more-menu')).toBe(false);
      expect(dropdownManager.isOpen('add-source-menu')).toBe(true);

      // Open a custom select -> source menu closes
      dropdownManager.open('select-format-dropdown');
      expect(dropdownManager.isOpen('add-source-menu')).toBe(false);
      expect(dropdownManager.isOpen('select-format-dropdown')).toBe(true);
    });

    it('correctly toggles dropdowns and supports closeAll', () => {
      dropdownManager.toggle('more-menu');
      expect(dropdownManager.isOpen('more-menu')).toBe(true);

      // Toggle same menu again -> closes
      dropdownManager.toggle('more-menu');
      expect(dropdownManager.isOpen('more-menu')).toBe(false);
      expect(dropdownManager.activeDropdownId()).toBeNull();

      // Open and closeAll
      dropdownManager.open('add-source-menu');
      expect(dropdownManager.isOpen('add-source-menu')).toBe(true);

      dropdownManager.closeAll();
      expect(dropdownManager.isOpen('add-source-menu')).toBe(false);
      expect(dropdownManager.activeDropdownId()).toBeNull();
    });

    it('reactive computed signals update synchronously with state changes', () => {
      const isMoreOpen = dropdownManager.createIsOpenSignal('more-menu');
      const isAddSourceOpen = dropdownManager.createIsOpenSignal('add-source-menu');

      expect(isMoreOpen()).toBe(false);
      expect(isAddSourceOpen()).toBe(false);

      dropdownManager.open('more-menu');
      expect(isMoreOpen()).toBe(true);
      expect(isAddSourceOpen()).toBe(false);

      dropdownManager.open('add-source-menu');
      expect(isMoreOpen()).toBe(false);
      expect(isAddSourceOpen()).toBe(true);
    });
  });

  describe('2. Candidate Evaluator — Unrestricted Target-Size Optimization', () => {
    const mockCanvas = { width: 1200, height: 800 } as any;

    it('evaluates and accepts candidates down to low visual quality (SSIM < 0.70) in Custom Target Mode', () => {
      // Setup candidates representing aggressive compression levels
      const candidates: StrategyCandidate[] = [
        {
          blob: new Blob([new Uint8Array(120_000)], { type: 'image/png' }),
          size: 120_000,
          mimeType: 'image/png',
          format: 'png',
          extension: 'png',
          width: 1200,
          height: 800,
          canvas: mockCanvas,
          isLossless: false,
          quality: 50,
          strategyName: 'png-lossy',
          configDescription: 'Indexed PNG 128 Colors',
          durationMs: 15,
          ssim: 0.88
        },
        {
          blob: new Blob([new Uint8Array(48_000)], { type: 'image/png' }),
          size: 48_000,
          mimeType: 'image/png',
          format: 'png',
          extension: 'png',
          width: 1200,
          height: 800,
          canvas: mockCanvas,
          isLossless: false,
          quality: 10,
          strategyName: 'png-lossy',
          configDescription: 'Indexed PNG 16 Colors',
          durationMs: 12,
          ssim: 0.65 // SSIM < 0.70 would previously be rejected by artificial floor
        }
      ];

      const constraints: CandidateEvaluationConstraints = {
        isCustomTargetMode: true,
        targetBytes: 50_000, // 50 KB strict target
        originalSize: 1_000_000,
        originalWidth: 1200,
        originalHeight: 800,
        targetMimeType: 'image/png',
        disallowFormatChange: true,
        disallowLossy: false,
        minSsimThreshold: 0 // In target mode, minSsimThreshold is 0
      };

      const result = CandidateEvaluator.evaluateCandidates(candidates, constraints);

      // The 48 KB candidate (with SSIM 0.65) must NOT be rejected; it satisfies the target size
      expect(result.targetAchieved).toBe(true);
      expect(result.targetUnreachable).toBe(false);
      expect(result.selectedCandidate).not.toBeNull();
      expect(result.selectedCandidate?.size).toBe(48_000);
      expect(result.selectedCandidate?.ssim).toBe(0.65);
      expect(result.selectedCandidate?.size).toBeLessThanOrEqual(constraints.targetBytes!);
    });

    it('enforces strict ceiling: oversized candidate is NEVER accepted as target achieved', () => {
      const candidates: StrategyCandidate[] = [
        {
          blob: new Blob([new Uint8Array(96_100)], { type: 'image/png' }),
          size: 96_100, // Exceeds 50 KB target by 46.1 KB
          mimeType: 'image/png',
          format: 'png',
          extension: 'png',
          width: 1200,
          height: 800,
          canvas: mockCanvas,
          isLossless: false,
          quality: 50,
          strategyName: 'png-lossy',
          configDescription: 'Indexed PNG 128 Colors',
          durationMs: 15,
          ssim: 0.88
        }
      ];

      const constraints: CandidateEvaluationConstraints = {
        isCustomTargetMode: true,
        targetBytes: 50_000,
        originalSize: 1_000_000,
        originalWidth: 1200,
        originalHeight: 800,
        targetMimeType: 'image/png',
        disallowFormatChange: true,
        disallowLossy: false,
        minSsimThreshold: 0
      };

      const result = CandidateEvaluator.evaluateCandidates(candidates, constraints);

      expect(result.targetAchieved).toBe(false);
      expect(result.targetUnreachable).toBe(true);
      expect(result.selectedCandidate).toBeNull();
      expect(result.closestAchievableCandidate).not.toBeNull();
      expect(result.closestAchievableCandidate?.size).toBe(96_100);
      expect(result.reason).toContain('Requested target could not be reached');
    });

    it('in Default Mode (non-target), visual quality floor (SSIM >= minSsimThreshold) is preserved', () => {
      const lowQualityCandidate: StrategyCandidate = {
        blob: new Blob([new Uint8Array(40_000)], { type: 'image/png' }),
        size: 40_000,
        mimeType: 'image/png',
        format: 'png',
        extension: 'png',
        width: 1200,
        height: 800,
        canvas: mockCanvas,
        isLossless: false,
        quality: 10,
        strategyName: 'png-lossy',
        configDescription: 'Indexed PNG 16 Colors',
        durationMs: 12,
        ssim: 0.65
      };

      const defaultConstraints: CandidateEvaluationConstraints = {
        isCustomTargetMode: false,
        targetBytes: undefined,
        originalSize: 1_000_000,
        originalWidth: 1200,
        originalHeight: 800,
        targetMimeType: 'image/png',
        disallowFormatChange: true,
        disallowLossy: false,
        minSsimThreshold: 0.85 // High-quality default constraint
      };

      const result = CandidateEvaluator.evaluateCandidates([lowQualityCandidate], defaultConstraints);

      // In Default Mode, candidate with SSIM 0.65 must be rejected to prevent visual degradation
      expect(result.targetAchieved).toBe(false);
      expect(result.selectedCandidate).toBeNull();
      expect(result.rejectedCandidatesCount).toBe(1);
    });

    it('among candidates meeting target size, ranks by highest visual quality (SSIM)', () => {
      const candA: StrategyCandidate = {
        blob: new Blob([new Uint8Array(35_000)], { type: 'image/png' }),
        size: 35_000,
        mimeType: 'image/png',
        format: 'png',
        extension: 'png',
        width: 1200,
        height: 800,
        canvas: mockCanvas,
        isLossless: false,
        quality: 10,
        strategyName: 'png-lossy',
        configDescription: '16 Colors',
        durationMs: 10,
        ssim: 0.72
      };

      const candB: StrategyCandidate = {
        blob: new Blob([new Uint8Array(45_000)], { type: 'image/png' }),
        size: 45_000,
        mimeType: 'image/png',
        format: 'png',
        extension: 'png',
        width: 1200,
        height: 800,
        canvas: mockCanvas,
        isLossless: false,
        quality: 20,
        strategyName: 'png-lossy',
        configDescription: '32 Colors',
        durationMs: 12,
        ssim: 0.82 // Better quality
      };

      const constraints: CandidateEvaluationConstraints = {
        isCustomTargetMode: true,
        targetBytes: 50_000,
        originalSize: 1_000_000,
        originalWidth: 1200,
        originalHeight: 800,
        targetMimeType: 'image/png',
        disallowFormatChange: true,
        disallowLossy: false,
        minSsimThreshold: 0
      };

      const result = CandidateEvaluator.evaluateCandidates([candA, candB], constraints);

      expect(result.targetAchieved).toBe(true);
      expect(result.selectedCandidate).not.toBeNull();
      // candB has significantly better SSIM (0.82 vs 0.72) and both are <= 50,000 bytes
      expect(result.selectedCandidate?.ssim).toBe(0.82);
      expect(result.selectedCandidate?.size).toBe(45_000);
    });
  });

  describe('3. PNG Optimization Strategy — Extended Palette Range in Target Mode', () => {
    it('evaluates palette reduction down to 8 colors without rejecting low SSIM when targeting strict size', async () => {
      const mockCanvas = {
        width: 800,
        height: 600,
        getContext: vi.fn().mockReturnValue({
          getImageData: vi.fn().mockReturnValue({
            data: new Uint8ClampedArray(800 * 600 * 4),
            width: 800,
            height: 600
          })
        })
      } as any;

      // Mock encoder returning sizes that decrease with lower quality
      const mockEncoder = {
        encode: vi.fn().mockImplementation(async (canvas, mime, quality, signal, options) => {
          // quality 90 -> 80KB, 50 -> 60KB, 20 -> 40KB, 5 -> 25KB
          const size = Math.round(15_000 + (quality / 100) * 70_000);
          return {
            blob: new Blob([new Uint8Array(size)], { type: 'image/png' }),
            size,
            format: 'png',
            width: 800,
            height: 600,
            quality,
            isLossless: false
          };
        })
      } as unknown as ImageEncoderService;

      const candidates = await PngOptimizationStrategy.generateCandidates(
        mockCanvas,
        {
          targetFormat: 'png',
          detectedFormat: 'png',
          userQuality: 80,
          targetBytes: 20_000, // Strict 20 KB target requiring aggressive palette reduction
          isCustomTargetMode: true,
          isLosslessRequested: false,
          originalBytes: 500_000,
          originalWidth: 800,
          originalHeight: 600
        },
        mockEncoder
      );

      // Verify that candidates include low quality levels (q <= 10)
      const lowQCandidates = candidates.filter(c => c.quality <= 10);
      expect(lowQCandidates.length).toBeGreaterThan(0);

      // Verify candidate <= 20_000 bytes was generated
      const targetMeetingCandidates = candidates.filter(c => c.size <= 20_000);
      expect(targetMeetingCandidates.length).toBeGreaterThan(0);
    });
  });

  describe('4. Intelligent Optimization Engine — Unrestricted Search Floor for JPEG', () => {
    it('allows searching down to Q5 for aggressive target sizes', async () => {
      const mockCapabilityService = new ImageCapabilityService();
      const mockCanvas = {
        width: 1000,
        height: 1000,
        getContext: vi.fn().mockReturnValue({
          getImageData: vi.fn().mockReturnValue({
            data: new Uint8ClampedArray(1000 * 1000 * 4),
            width: 1000,
            height: 1000
          })
        })
      } as any;

      const evaluatedQualities: number[] = [];

      const mockEncoder = {
        encode: vi.fn().mockImplementation(async (canvas, mime, quality) => {
          evaluatedQualities.push(quality);
          // Scale size with quality: at Q5 size is 45 KB; at Q80 size is 400 KB
          const size = Math.round(25_000 + (quality / 100) * 450_000);
          return {
            blob: new Blob([new Uint8Array(size)], { type: 'image/jpeg' }),
            size,
            format: 'jpeg',
            width: 1000,
            height: 1000,
            quality,
            isLossless: false
          };
        })
      } as unknown as ImageEncoderService;

      const engine = new IntelligentOptimizationEngine(mockCapabilityService, mockEncoder);

      const outcome = await engine.optimize({
        canvas: mockCanvas,
        originalBytes: 1_000_000,
        detectedFormat: 'jpeg',
        targetFormat: 'original',
        userQuality: 80,
        mode: 'target-size',
        targetBytes: 50_000, // 50 KB target
        targetValue: 50,
        targetUnit: 'KB',
        encoder: mockEncoder
      });

      // The engine should have explored down to Q5
      expect(evaluatedQualities).toContain(5);

      // Target was 50 KB; at Q5 size is ~47.5 KB, which meets targetBytes
      expect(outcome.targetAchieved).toBe(true);
      expect(outcome.selectedCandidate.size).toBeLessThanOrEqual(50_000);
      expect(outcome.selectedCandidate.quality).toBeLessThanOrEqual(20);
    });
  });
});

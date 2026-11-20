import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImageCompressionService } from './image-compression.service';
import { ImageItem, CompressionSettings } from '../models/compressor.models';
import { AchievableSizeDiscoveryService } from './achievable-size-discovery.service';
import * as imgOpt from './image-optimizer.util';

describe('Acklet Image Compressor — Phase 3 Corrections: Quality Optimization & Processing Feedback', () => {
  let compressionService: ImageCompressionService;
  let discoveryService: AchievableSizeDiscoveryService;

  beforeEach(() => {
    compressionService = new ImageCompressionService();
    discoveryService = new AchievableSizeDiscoveryService();
    vi.spyOn(imgOpt, 'encodeIndexedPng').mockResolvedValue(null as any);
  });

  describe('1. Highest Quality Candidate Selection within Target Budget (Screenshot 1 Fix)', () => {
    it('selects the highest visual quality candidate (e.g. Lossless Oxipng) when target size is high (869 KB)', async () => {
      // Setup candidate outputs simulating 1.0 MB PNG (1,048,576 B):
      // - Lossless Oxipng: 869 KB (889,856 B), SSIM: 1.000, isLossless: true
      // - 256-color palette: 110 KB (112,640 B), SSIM: 0.992, isLossless: false
      // - 8-color palette: 96 KB (98,304 B), SSIM: 0.750, isLossless: false
      const originalBytes = 1048576;
      const targetBytes = 869 * 1024; // 889,856 B

      const item: ImageItem = {
        id: 'test-three-shape',
        file: new File([new Uint8Array(originalBytes)], 'Minimalist-Three-Shape.png', { type: 'image/png' }),
        originalName: 'Minimalist-Three-Shape.png',
        nameWithoutExt: 'Minimalist-Three-Shape',
        originalExtension: 'png',
        detectedFormat: 'png',
        mimeType: 'image/png',
        originalSize: originalBytes,
        width: 1330,
        height: 1182,
        aspectRatio: 1330 / 1182,
        previewUrl: 'blob:test',
        selected: false,
        status: 'pending',
        capabilities: { format: 'png', mimeType: 'image/png', isLossless: true, previewSupported: true } as any,
        individualSettings: {
          hasCustomSettings: true,
          targetFileSize: {
            enabled: true,
            targetBytes,
            targetValue: 869,
            targetUnit: 'KB',
            minQuality: 20,
            userDefined: true,
            isDynamicDefault: false
          }
        },
        effectiveSettings: {
          outputFormat: 'original',
          quality: 80,
          resize: { enabled: false, mode: 'percentage', percentage: 100, maintainAspectRatio: true },
          targetFileSize: {
            enabled: true,
            targetBytes,
            targetValue: 869,
            targetUnit: 'KB',
            minQuality: 20,
            userDefined: true,
            isDynamicDefault: false
          }
        } as CompressionSettings,
        addedAt: Date.now()
      };

      // Mock formatStrategySelector to return both lossless (869 KB) and lossy (110 KB, 96 KB)
      const mockStrategy = {
        selectAndExecuteStrategy: vi.fn().mockResolvedValue({
          selectedCandidate: null,
          allEvaluatedCandidates: [
            {
              blob: new Blob([new Uint8Array(889856)], { type: 'image/png' }),
              size: 889856, // 869 KB
              format: 'png',
              mimeType: 'image/png',
              extension: 'png',
              quality: 100,
              isLossless: true,
              strategyName: 'png-lossless',
              configDescription: 'PNG Lossless Oxipng',
              ssim: 1.0,
              psnr: 100
            },
            {
              blob: new Blob([new Uint8Array(112640)], { type: 'image/png' }),
              size: 112640, // 110 KB
              format: 'png',
              mimeType: 'image/png',
              extension: 'png',
              quality: 90,
              isLossless: false,
              strategyName: 'png-palette',
              configDescription: 'Indexed PNG (256 Colors)',
              ssim: 0.992,
              psnr: 45
            },
            {
              blob: new Blob([new Uint8Array(98304)], { type: 'image/png' }),
              size: 98304, // 96 KB
              format: 'png',
              mimeType: 'image/png',
              extension: 'png',
              quality: 5,
              isLossless: false,
              strategyName: 'png-palette',
              configDescription: 'Indexed PNG (8 Colors)',
              ssim: 0.75,
              psnr: 30
            }
          ]
        })
      };

      (compressionService as any).formatStrategySelector = mockStrategy;
      const { canvas: testCanvas1 } = (compressionService as any).decoder.createCanvas(1330, 1182);
      vi.spyOn((compressionService as any).decoder, 'decodeFile').mockResolvedValue({
        canvas: testCanvas1,
        width: 1330,
        height: 1182,
        objectUrlToRevoke: null
      });

      const result = await compressionService.compressImage(item);

      // Crucial assertion: 869 KB lossless output MUST be chosen because it satisfies the 869 KB budget with highest visual quality
      expect(result.compressedSize).toBe(889856);
      expect(result.visualQuality?.ssim).toBe(1.0);
      expect(result.compressionMethod).toBe('lossless');
      expect(result.reductionResult).toBe('reduced');
    });

    it('selects the best visual quality candidate meeting a more restrictive budget (e.g. 110 KB target)', async () => {
      const originalBytes = 1048576;
      const targetBytes = 110 * 1024; // 112,640 B

      const item: ImageItem = {
        id: 'test-110k',
        file: new File([new Uint8Array(originalBytes)], 'Three-Shape.png', { type: 'image/png' }),
        originalName: 'Three-Shape.png',
        nameWithoutExt: 'Three-Shape',
        originalExtension: 'png',
        detectedFormat: 'png',
        mimeType: 'image/png',
        originalSize: originalBytes,
        width: 1330,
        height: 1182,
        aspectRatio: 1330 / 1182,
        previewUrl: 'blob:test',
        selected: false,
        status: 'pending',
        capabilities: { format: 'png', mimeType: 'image/png', isLossless: true, previewSupported: true } as any,
        individualSettings: {
          hasCustomSettings: true,
          targetFileSize: {
            enabled: true,
            targetBytes,
            targetValue: 110,
            targetUnit: 'KB',
            minQuality: 20,
            userDefined: true,
            isDynamicDefault: false
          }
        },
        effectiveSettings: {
          outputFormat: 'original',
          quality: 80,
          resize: { enabled: false, mode: 'percentage', percentage: 100, maintainAspectRatio: true },
          targetFileSize: {
            enabled: true,
            targetBytes,
            targetValue: 110,
            targetUnit: 'KB',
            minQuality: 20,
            userDefined: true,
            isDynamicDefault: false
          }
        } as CompressionSettings,
        addedAt: Date.now()
      };

      const mockStrategy = {
        selectAndExecuteStrategy: vi.fn().mockResolvedValue({
          selectedCandidate: null,
          allEvaluatedCandidates: [
            {
              blob: new Blob([new Uint8Array(889856)], { type: 'image/png' }),
              size: 889856, // 869 KB (exceeds 110 KB target, must be filtered out!)
              format: 'png',
              mimeType: 'image/png',
              extension: 'png',
              quality: 100,
              isLossless: true,
              strategyName: 'png-lossless',
              configDescription: 'PNG Lossless Oxipng',
              ssim: 1.0
            },
            {
              blob: new Blob([new Uint8Array(112640)], { type: 'image/png' }),
              size: 112640, // 110 KB (satisfies budget, SSIM 0.992)
              format: 'png',
              mimeType: 'image/png',
              extension: 'png',
              quality: 90,
              isLossless: false,
              strategyName: 'png-palette',
              configDescription: 'Indexed PNG (256 Colors)',
              ssim: 0.992
            },
            {
              blob: new Blob([new Uint8Array(98304)], { type: 'image/png' }),
              size: 98304, // 96 KB (satisfies budget, but lower SSIM 0.750)
              format: 'png',
              mimeType: 'image/png',
              extension: 'png',
              quality: 5,
              isLossless: false,
              strategyName: 'png-palette',
              configDescription: 'Indexed PNG (8 Colors)',
              ssim: 0.75
            }
          ]
        })
      };

      (compressionService as any).formatStrategySelector = mockStrategy;
      const { canvas: testCanvas1 } = (compressionService as any).decoder.createCanvas(1330, 1182);
      vi.spyOn((compressionService as any).decoder, 'decodeFile').mockResolvedValue({
        canvas: testCanvas1,
        width: 1330,
        height: 1182,
        objectUrlToRevoke: null
      });

      const result = await compressionService.compressImage(item);

      // Must select 110 KB candidate (SSIM 0.992) over 96 KB candidate (SSIM 0.750)
      expect(result.compressedSize).toBe(112640);
      expect(result.visualQuality?.ssim).toBeGreaterThan(0.9);
      expect(result.compressedSize).toBeLessThanOrEqual(targetBytes);
    });

    it('retains a smaller output when it provides the highest quality without artificially inflating size', async () => {
      const originalBytes = 1048576;
      const targetBytes = 500 * 1024; // 500 KB target

      const item: ImageItem = {
        id: 'test-500k',
        file: new File([new Uint8Array(originalBytes)], 'Three-Shape.png', { type: 'image/png' }),
        originalName: 'Three-Shape.png',
        nameWithoutExt: 'Three-Shape',
        originalExtension: 'png',
        detectedFormat: 'png',
        mimeType: 'image/png',
        originalSize: originalBytes,
        width: 1330,
        height: 1182,
        aspectRatio: 1330 / 1182,
        previewUrl: 'blob:test',
        selected: false,
        status: 'pending',
        capabilities: { format: 'png', mimeType: 'image/png', isLossless: true, previewSupported: true } as any,
        individualSettings: {
          hasCustomSettings: true,
          targetFileSize: {
            enabled: true,
            targetBytes,
            targetValue: 500,
            targetUnit: 'KB',
            minQuality: 20,
            userDefined: true,
            isDynamicDefault: false
          }
        },
        effectiveSettings: {
          outputFormat: 'original',
          quality: 80,
          resize: { enabled: false, mode: 'percentage', percentage: 100, maintainAspectRatio: true },
          targetFileSize: {
            enabled: true,
            targetBytes,
            targetValue: 500,
            targetUnit: 'KB',
            minQuality: 20,
            userDefined: true,
            isDynamicDefault: false
          }
        } as CompressionSettings,
        addedAt: Date.now()
      };

      const mockStrategy = {
        selectAndExecuteStrategy: vi.fn().mockResolvedValue({
          selectedCandidate: null,
          allEvaluatedCandidates: [
            {
              blob: new Blob([new Uint8Array(889856)], { type: 'image/png' }),
              size: 889856, // 869 KB (> 500 KB target)
              format: 'png',
              mimeType: 'image/png',
              extension: 'png',
              quality: 100,
              isLossless: true,
              strategyName: 'png-lossless',
              configDescription: 'PNG Lossless Oxipng',
              ssim: 1.0
            },
            {
              blob: new Blob([new Uint8Array(112640)], { type: 'image/png' }),
              size: 112640, // 110 KB (satisfies <= 500 KB, highest quality among valid)
              format: 'png',
              mimeType: 'image/png',
              extension: 'png',
              quality: 90,
              isLossless: false,
              strategyName: 'png-palette',
              configDescription: 'Indexed PNG (256 Colors)',
              ssim: 0.992
            }
          ]
        })
      };

      (compressionService as any).formatStrategySelector = mockStrategy;
      const { canvas: testCanvas1 } = (compressionService as any).decoder.createCanvas(1330, 1182);
      vi.spyOn((compressionService as any).decoder, 'decodeFile').mockResolvedValue({
        canvas: testCanvas1,
        width: 1330,
        height: 1182,
        objectUrlToRevoke: null
      });

      const result = await compressionService.compressImage(item);

      // Keeps 110 KB output without artificially inflating to approach 500 KB
      expect(result.compressedSize).toBe(112640);
      expect(result.compressedSize).toBeLessThan(targetBytes);
      expect(result.reductionResult).toBe('reduced');
    });
  });

  describe('2. Quality Controls & Preset Accuracy (Requirement 2)', () => {
    it('provides Better Quality, Balanced, and Smallest Size presets', async () => {
      const mockCandidateSmallest: any = {
        id: 'png-palette-8',
        blob: new Blob([new Uint8Array(98304)]),
        size: 98304,
        formattedSize: '96 KB',
        quality: 5,
        ssim: 0.75,
        format: 'png',
        mimeType: 'image/png',
        isLossless: false,
        strategyName: 'png-palette'
      };

      const mockCandidateBalanced: any = {
        id: 'png-palette-256',
        blob: new Blob([new Uint8Array(112640)]),
        size: 112640,
        formattedSize: '110 KB',
        quality: 90,
        ssim: 0.992,
        format: 'png',
        mimeType: 'image/png',
        isLossless: false,
        strategyName: 'png-palette'
      };

      const mockCandidateBetter: any = {
        id: 'png-lossless',
        blob: new Blob([new Uint8Array(889856)]),
        size: 889856,
        formattedSize: '869 KB',
        quality: 100,
        ssim: 1.0,
        format: 'png',
        mimeType: 'image/png',
        isLossless: true,
        strategyName: 'png-lossless'
      };

      const candidates = [mockCandidateSmallest, mockCandidateBalanced, mockCandidateBetter];
      const qualityOptions = (discoveryService as any).buildQualityOptions(candidates);

      expect(qualityOptions.length).toBe(3);
      expect(qualityOptions[0].label).toBe('Better Quality');
      expect(qualityOptions[0].candidate.size).toBe(889856);

      expect(qualityOptions[1].label).toBe('Balanced');
      expect(qualityOptions[1].candidate.size).toBe(112640);

      expect(qualityOptions[2].label).toBe('Smallest Size');
      expect(qualityOptions[2].candidate.size).toBe(98304);
    });
  });
});

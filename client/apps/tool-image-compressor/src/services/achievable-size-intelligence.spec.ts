// apps/tool-image-compressor/src/services/achievable-size-intelligence.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AchievableSizeDiscoveryService,
  AchievableSizeProfile,
  AchievableCandidate
} from './achievable-size-discovery.service';
import { ImageItem } from '../models/compressor.models';
import { ImageEncoderService } from './image-encoder.service';
import { ImageDecoderService } from './image-decoder.service';
import { ImageCapabilityService } from './image-capability.service';

describe('Acklet Image Compressor — Phase 4: Achievable Size Intelligence & Customization Accuracy', () => {
  let discoveryService: AchievableSizeDiscoveryService;
  let mockEncoder: ImageEncoderService;
  let mockDecoder: ImageDecoderService;
  let mockCapability: ImageCapabilityService;

  function createMockCanvas(width: number, height: number) {
    const pixelCount = width * height;
    const rgba = new Uint8ClampedArray(pixelCount * 4);
    for (let i = 0; i < pixelCount; i++) {
      rgba[i * 4] = (i * 3) % 256;
      rgba[i * 4 + 1] = (i * 5) % 256;
      rgba[i * 4 + 2] = (i * 7) % 256;
      rgba[i * 4 + 3] = 255;
    }
    return {
      width,
      height,
      getContext: vi.fn().mockReturnValue({
        getImageData: vi.fn().mockReturnValue({
          data: rgba,
          width,
          height
        })
      })
    } as any;
  }

  function createRedditMascotItem(): ImageItem {
    // 27.1 KB Reddit mascot PNG image (27,750 bytes)
    const originalBytes = 27750;
    const file = new File([new Uint8Array(originalBytes)], 'icons8-reddit-500.png', { type: 'image/png' });
    return {
      id: 'reddit-mascot-27k',
      file,
      originalName: 'icons8-reddit-500.png',
      nameWithoutExt: 'icons8-reddit-500',
      originalExtension: 'png',
      originalSize: originalBytes,
      detectedFormat: 'png',
      mimeType: 'image/png',
      status: 'idle',
      progress: 0,
      width: 500,
      height: 500,
      decodedCanvas: createMockCanvas(500, 500),
      individualSettings: { hasCustomSettings: false },
      effectiveSettings: {
        outputFormat: 'original',
        quality: 80,
        stripMetadata: true,
        targetFileSize: { enabled: true, userDefined: false }
      }
    };
  }

  beforeEach(() => {
    mockCapability = new ImageCapabilityService();
    mockDecoder = new ImageDecoderService();

    // Mock encoder returning realistic candidate byte sizes for Reddit mascot
    mockEncoder = {
      encode: vi.fn().mockImplementation(async (canvas, mime, quality, signal, options) => {
        let size = 15000;
        let isLossless = false;

        if (mime === 'image/png') {
          if (quality === 100 && !options?.optimizePalette) {
            size = 22400; // Oxipng lossless: 22.4 KB
            isLossless = true;
          } else {
            // Palette reduction: 256 colors (q90) -> 12.2 KB; 8 colors (q5) -> 5.1 KB
            const paletteSizes: Record<number, number> = {
              90: 12492, // 256 colors (~12.2 KB)
              55: 8704,  // 128 colors (~8.5 KB)
              35: 6963,  // 64 colors (~6.8 KB)
              20: 5734,  // 32 colors (~5.6 KB)
              10: 5222,  // 16 colors (~5.1 KB)
              5: 5222    // 8 colors bottom floor (~5.1 KB)
            };
            size = paletteSizes[quality] || Math.round(5222 + (quality / 100) * 8000);
          }
        } else if (mime === 'image/jpeg') {
          size = Math.round(4000 + (quality / 100) * 16000);
        } else if (mime === 'image/webp') {
          size = Math.round(3500 + (quality / 100) * 14000);
        }

        return {
          blob: new Blob([new Uint8Array(size)], { type: mime }),
          size,
          format: mime.replace('image/', ''),
          width: canvas.width,
          height: canvas.height,
          quality,
          isLossless
        };
      })
    } as unknown as ImageEncoderService;

    discoveryService = new AchievableSizeDiscoveryService();
    (discoveryService as any).encoder = mockEncoder;
    (discoveryService as any).decoder = mockDecoder;
    (discoveryService as any).capabilityService = mockCapability;
  });

  describe('1. Achievable Size Discovery & In-Memory Caching', () => {
    it('discovers achievable candidate sizes with actual encoded blobs and measures output bytes', async () => {
      const item = createRedditMascotItem();
      const profile = await discoveryService.discoverAchievableSizes(item);

      expect(profile).toBeDefined();
      expect(profile.candidates.length).toBeGreaterThan(0);
      expect(profile.originalBytes).toBe(27750);

      // Verify all candidates have real blobs and positive measured sizes
      for (const cand of profile.candidates) {
        expect(cand.size).toBeGreaterThan(0);
        expect(cand.size).toBeLessThan(item.originalSize);
        expect(cand.blob).toBeInstanceOf(Blob);
        expect(cand.blob.size).toBe(cand.size);
      }

      // Candidates must be sorted strictly ascending by actual output bytes
      for (let i = 1; i < profile.candidates.length; i++) {
        expect(profile.candidates[i].size).toBeGreaterThanOrEqual(profile.candidates[i - 1].size);
      }
    });

    it('caches candidate profiles and avoids repeated encoding on subsequent calls', async () => {
      const item = createRedditMascotItem();

      // First discovery: calls encoder
      const profile1 = await discoveryService.discoverAchievableSizes(item);
      const callCountAfterFirst = vi.mocked(mockEncoder.encode).mock.calls.length;
      expect(callCountAfterFirst).toBeGreaterThan(0);

      // Second discovery for same image: served from in-memory cache
      const profile2 = await discoveryService.discoverAchievableSizes(item);
      const callCountAfterSecond = vi.mocked(mockEncoder.encode).mock.calls.length;

      expect(callCountAfterSecond).toBe(callCountAfterFirst); // Zero additional encoder calls!
      expect(profile2).toBe(profile1); // Returns exact same cached instance
    });

    it('invalidates cache correctly when requested', async () => {
      const item = createRedditMascotItem();
      await discoveryService.discoverAchievableSizes(item);

      discoveryService.invalidateCache(item.id);

      // Next call re-discovers and calls encoder again
      const prevCalls = vi.mocked(mockEncoder.encode).mock.calls.length;
      await discoveryService.discoverAchievableSizes(item);
      expect(vi.mocked(mockEncoder.encode).mock.calls.length).toBeGreaterThan(prevCalls);
    });
  });

  describe('2. Quick Size Options — Only Validated Non-Duplicate Sizes', () => {
    it('generates Quick Sizes strictly from actual validated compression candidates', async () => {
      const item = createRedditMascotItem();
      const profile = await discoveryService.discoverAchievableSizes(item);

      expect(profile.quickSizes.length).toBeGreaterThan(0);
      expect(profile.quickSizes.length).toBeLessThanOrEqual(3);

      // Every quick size must correspond to a validated candidate
      for (const qs of profile.quickSizes) {
        expect(qs.bytes).toBe(qs.candidate.size);
        expect(qs.label).toBe(qs.candidate.formattedSize);
        expect(profile.candidates).toContain(qs.candidate);
      }

      // No arbitrary non-existent values: every quick size is a candidate size
      const candidateSizes = new Set(profile.candidates.map(c => c.size));
      for (const qs of profile.quickSizes) {
        expect(candidateSizes.has(qs.bytes)).toBe(true);
      }

      // No duplicate labels
      const labels = profile.quickSizes.map(qs => qs.label);
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(labels.length);
    });

    it('displays exactly two options if only two distinct candidates exist (does not invent synthetic options)', async () => {
      // Mock encoder returning only 2 candidates
      const twoCandidateEncoder = {
        encode: vi.fn().mockImplementation(async (canvas, mime, quality) => {
          const size = quality >= 50 ? 15000 : 8000;
          return {
            blob: new Blob([new Uint8Array(size)], { type: mime }),
            size,
            format: 'png',
            width: 100,
            height: 100,
            quality,
            isLossless: false
          };
        })
      } as unknown as ImageEncoderService;

      const customDiscovery = new AchievableSizeDiscoveryService();
      (customDiscovery as any).encoder = twoCandidateEncoder;
      (customDiscovery as any).decoder = mockDecoder;
      (customDiscovery as any).capabilityService = mockCapability;

      const item = createRedditMascotItem();
      const profile = await customDiscovery.discoverAchievableSizes(item);

      // With only 2 distinct candidate sizes (8000 and 15000), quickSizes must have length 2
      expect(profile.quickSizes.length).toBe(2);
    });
  });

  describe('3. Quality Options — Reflect Real Compression Results', () => {
    it('associates Better Quality, Balanced, and Smallest with actual measured candidates', async () => {
      const item = createRedditMascotItem();
      const profile = await discoveryService.discoverAchievableSizes(item);

      expect(profile.qualityOptions.length).toBe(3);

      const [better, balanced, smallest] = profile.qualityOptions;

      expect(better.id).toBe('better');
      expect(balanced.id).toBe('balanced');
      expect(smallest.id).toBe('smallest');

      // Smallest must be the candidate with the smallest actual byte size
      expect(smallest.candidate.size).toBe(profile.minAchievableBytes);
      expect(smallest.formattedSize).toBe(smallest.candidate.formattedSize);

      // Better quality must have higher or equal bytes than balanced
      expect(better.candidate.size).toBeGreaterThanOrEqual(balanced.candidate.size);
      expect(balanced.candidate.size).toBeGreaterThanOrEqual(smallest.candidate.size);

      // Every quality option has an actual candidate blob
      expect(better.candidate.blob).toBeInstanceOf(Blob);
      expect(balanced.candidate.blob).toBeInstanceOf(Blob);
      expect(smallest.candidate.blob).toBeInstanceOf(Blob);
    });
  });

  describe('4. Target Feasibility Validation & Slider Range', () => {
    it('accurately identifies achievable vs unreachable targets without false claims', async () => {
      const item = createRedditMascotItem();
      const profile = await discoveryService.discoverAchievableSizes(item);

      // Min achievable candidate size is 5,222 bytes (~5.1 KB)
      expect(profile.minAchievableBytes).toBe(5222);

      // 1. Target of 10 KB (10,240 B) is achievable (candidates exist <= 10 KB)
      const validTarget = discoveryService.validateTargetFeasibility(profile, 10240);
      expect(validTarget.isAchievable).toBe(true);
      expect(validTarget.closestAchievingCandidate).not.toBeNull();
      expect(validTarget.closestAchievingCandidate!.size).toBeLessThanOrEqual(10240);

      // 2. Target of 1.0 KB (1,024 B) is physically UNREACHABLE (below min achievable 5,222 B)
      const lowTarget1k = discoveryService.validateTargetFeasibility(profile, 1024);
      expect(lowTarget1k.isAchievable).toBe(false);
      expect(lowTarget1k.closestAchievingCandidate).toBeNull();
      expect(lowTarget1k.message).toContain('cannot be achieved');
      expect(lowTarget1k.message).toContain('minimum achievable: 5.1 KB');

      // 3. Target of 3.6 KB (3,686 B) is also UNREACHABLE
      const lowTarget3k = discoveryService.validateTargetFeasibility(profile, 3686);
      expect(lowTarget3k.isAchievable).toBe(false);
      expect(lowTarget3k.message).toContain('minimum achievable: 5.1 KB');
    });

    it('does NOT recommend arbitrary alternatives (such as "Use 19 KB") or silently increase targets', async () => {
      const item = createRedditMascotItem();
      const profile = await discoveryService.discoverAchievableSizes(item);

      const result = discoveryService.validateTargetFeasibility(profile, 1024);

      // Must clearly communicate unavailability without suggesting 19 KB
      expect(result.isAchievable).toBe(false);
      expect(result.message).not.toContain('19 KB');
      expect(result.message).not.toContain('Suggested');
      expect(result.message).toContain('minimum achievable');
    });
  });

  describe('5. Real-World Reddit Mascot Regression (Screenshot 3 Reference)', () => {
    it('validates Reddit mascot (27.1 KB) and prevents displaying 1 KB or 3.6 KB as achievable', async () => {
      const item = createRedditMascotItem();
      const profile = await discoveryService.discoverAchievableSizes(item);

      // Minimum candidate is ~5.1 KB (5,222 bytes)
      expect(profile.minAchievableBytes).toBe(5222);

      // Verify that Quick Sizes never contain 1 KB or 3.6 KB or arbitrary values
      const quickLabels = profile.quickSizes.map(q => q.label);
      expect(quickLabels).not.toContain('1.0 KB');
      expect(quickLabels).not.toContain('3.6 KB');

      // Every quick size is at or above the minimum achievable size
      for (const qs of profile.quickSizes) {
        expect(qs.bytes).toBeGreaterThanOrEqual(profile.minAchievableBytes);
      }

      // Slider bounds match actual achievable candidate range
      expect(profile.minAchievableBytes).toBeLessThan(item.originalSize);
      expect(profile.maxAchievableBytes).toBeLessThan(item.originalSize);
    });

    it('prevents false unachievable error when target matches minimum candidate within unit precision (e.g. 96 KB)', () => {
      // Create a mock profile where minAchievableBytes is 98,406 bytes (~96.1 KB, formatted as "96 KB")
      const mockCandidate: any = {
        id: 'png-palette-8',
        blob: new Blob([new Uint8Array(98406)]),
        size: 98406,
        formattedSize: '96 KB',
        quality: 5,
        ssim: 0.75,
        format: 'png',
        mimeType: 'image/png',
        isLossless: false,
        strategyName: 'png-palette',
        configDescription: 'Indexed PNG (8 Colors)'
      };

      const mockProfile: any = {
        imageId: 'img-three-shape',
        originalBytes: 1048576,
        targetFormat: 'png',
        candidates: [mockCandidate],
        minAchievableBytes: 98406,
        maxAchievableBytes: 869000,
        quickSizes: [{ value: 96, unit: 'KB', bytes: 98406, label: '96 KB', candidate: mockCandidate }],
        qualityOptions: [{ id: 'smallest', label: 'Smallest', candidate: mockCandidate, formattedSize: '96 KB', qualityScore: 75, isAchievable: true }],
        generatedAt: Date.now()
      };

      // 1. User selects 96 KB (98,304 bytes)
      const target96Kb = 96 * 1024; // 98,304 bytes
      const validation = discoveryService.validateTargetFeasibility(mockProfile, target96Kb);

      // Must be achievable! Never show "Target of 96 KB cannot be achieved (minimum achievable: 96 KB)"
      expect(validation.isAchievable).toBe(true);
      expect(validation.closestAchievingCandidate).toBe(mockCandidate);

      // 2. Target of 95 KB (97,280 bytes) is strictly below 96 KB
      const target95Kb = 95 * 1024;
      const invalidValidation = discoveryService.validateTargetFeasibility(mockProfile, target95Kb);
      expect(invalidValidation.isAchievable).toBe(false);
      expect(invalidValidation.message).toContain('Target of 95 KB cannot be achieved (minimum achievable: 96 KB)');
      // Message must never have identical target and min achievable strings
      expect(invalidValidation.message).not.toContain('Target of 96 KB cannot be achieved (minimum achievable: 96 KB)');
    });
  });
});

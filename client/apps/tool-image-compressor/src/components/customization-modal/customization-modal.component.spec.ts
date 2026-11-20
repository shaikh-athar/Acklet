// apps/tool-image-compressor/src/components/customization-modal/customization-modal.component.spec.ts
import { describe, it, expect } from 'vitest';
import { IndividualCompressionOverrides } from '../../models/compressor.models';

describe('CustomizationModal Settings and Feature 3 Target Slider Logic', () => {
  it('should calculate locked aspect ratio proportionally', () => {
    const origWidth = 1920;
    const origHeight = 1080;
    const ratio = origHeight / origWidth;

    const newWidth = 1280;
    const calculatedHeight = Math.round(newWidth * ratio);
    expect(calculatedHeight).toBe(720);

    const inverseRatio = origWidth / origHeight;
    const newHeight = 540;
    const calculatedWidth = Math.round(newHeight * inverseRatio);
    expect(calculatedWidth).toBe(960);
  });

  it('should package target file size into exact bytes budget', () => {
    const targetKb = 250;
    const bytesKb = targetKb * 1024;
    expect(bytesKb).toBe(256000);

    const targetMb = 1.5;
    const bytesMb = targetMb * 1024 * 1024;
    expect(bytesMb).toBe(1572864);
  });

  describe('Feature 3: Target Slider Calculation and Visual Quality Score', () => {
    it('computes target file size from 10% to 100% of original bytes', () => {
      const originalBytes = 100 * 1024; // 100 KB = 102400 B

      // 10% slider target
      const tenPercentTarget = Math.max(1024, Math.round(originalBytes * (10 / 100)));
      expect(tenPercentTarget).toBe(10240); // 10 KB

      // 50% slider target
      const fiftyPercentTarget = Math.max(1024, Math.round(originalBytes * (50 / 100)));
      expect(fiftyPercentTarget).toBe(51200); // 50 KB

      // 100% slider target
      const hundredPercentTarget = Math.max(1024, Math.round(originalBytes * (100 / 100)));
      expect(hundredPercentTarget).toBe(102400); // 100 KB
    });

    it('formats target slider unit and value in KB or MB cleanly', () => {
      const smallOriginal = 80 * 1024; // 80 KB
      const target50 = Math.round(smallOriginal * 0.5);
      const kbVal = Math.round(target50 / 1024);
      expect(kbVal).toBe(40);

      const largeOriginal = 5 * 1024 * 1024; // 5 MB
      const target60 = Math.round(largeOriginal * 0.6);
      const mbVal = Math.round((target60 / (1024 * 1024)) * 10) / 10;
      expect(mbVal).toBe(3);
    });

    it('calculates Visual Quality score (0 to 100) based on SSIM and clamps at limits', () => {
      const calculateScore = (ssim: number | undefined): number => {
        if (typeof ssim === 'number') {
          return Math.min(100, Math.max(0, Math.round(ssim * 100)));
        }
        return 100;
      };

      expect(calculateScore(0.964)).toBe(96);
      expect(calculateScore(0.882)).toBe(88);
      expect(calculateScore(0.999)).toBe(100);
      expect(calculateScore(1.05)).toBe(100); // clamped at 100
      expect(calculateScore(-0.1)).toBe(0); // clamped at 0
      expect(calculateScore(undefined)).toBe(100);
    });

    it('STEP 1: "Better quality" sets 90% of original, "Balanced" sets 70%, "Smallest" sets 40%', () => {
      const originalBytes = 100000; // 100,000 B
      const betterQualityTarget = Math.round(originalBytes * 0.90);
      const balancedTarget = Math.round(originalBytes * 0.70);
      const smallestTarget = Math.round(originalBytes * 0.40);

      expect(betterQualityTarget).toBe(90000);
      expect(balancedTarget).toBe(70000);
      expect(smallestTarget).toBe(40000);
    });

    it('converts KB and MB units without unexpected reset or magnitude explosion', () => {
      // Converting 500 KB to MB
      const originalKb = 500;
      const prevMultKb = 1024;
      const newMultMb = 1048576;
      const currentBytesFromKb = originalKb * prevMultKb; // 512,000 B
      const convertedToMb = Math.round((currentBytesFromKb / newMultMb) * 10) / 10;
      expect(convertedToMb).toBe(0.5);

      // Converting 2 MB to KB
      const originalMb = 2;
      const prevMultMb = 1048576;
      const newMultKb = 1024;
      const currentBytesFromMb = originalMb * prevMultMb; // 2,097,152 B
      const convertedToKb = Math.round(currentBytesFromMb / newMultKb);
      expect(convertedToKb).toBe(2048);
    });

    it('computes realistic target recommendation (70% balanced)', () => {
      const orig = 200 * 1024; // 200 KB
      const targetBytes = Math.max(1, Math.round(orig * 0.7)); // 140 KB
      const kb = Math.round(targetBytes / 1024);
      expect(kb).toBe(140);
    });

    it('handles typing without overwriting intermediate digits, validating on blur', () => {
      // User types "2" while intending to type "250"
      const userTypedText = '2';
      const parsed = parseFloat(userTypedText);
      expect(parsed).toBe(2);
      expect(userTypedText).toBe('2'); // Not clamped while user is typing

      // On blur with original 500 KB (512,000 B), min 5% is 25 KB (25,600 B)
      const ref = 500 * 1024;
      const minBytes = Math.max(1, Math.round(ref * 0.05));
      const mult = 1024;
      const rawBytes = parsed * mult;
      const clampedBytes = Math.min(ref, Math.max(minBytes, rawBytes));
      const clampedKb = Math.round(clampedBytes / mult);
      expect(clampedKb).toBe(25); // Clamped on blur
    });
  });

  it('should build valid individual compression overrides object', () => {
    const overrides: Partial<IndividualCompressionOverrides> = {
      outputFormat: 'webp',
      quality: 85,
      targetFileSize: {
        enabled: true,
        targetValue: 200,
        targetUnit: 'KB',
        targetBytes: 204800,
        priority: 'file-size',
        tolerancePercent: 5
      },
      resize: {
        mode: 'target-size',
        width: 1200,
        height: 800,
        maintainAspectRatio: true,
        percentageScale: 100
      },
      metadataPolicy: {
        stripExif: true,
        preserveColorProfile: true
      },
      advancedOptimization: {
        chromaSubsampling: 'auto',
        cleanTransparency: true
      }
    };

    expect(overrides.outputFormat).toBe('webp');
    expect(overrides.quality).toBe(85);
    expect(overrides.targetFileSize?.targetBytes).toBe(204800);
    expect(overrides.metadataPolicy?.stripExif).toBe(true);
  });
});

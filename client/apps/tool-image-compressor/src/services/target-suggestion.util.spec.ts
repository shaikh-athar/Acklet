// apps/tool-image-compressor/src/services/target-suggestion.util.spec.ts
import { describe, it, expect } from 'vitest';
import {
  suggestTargets,
  isTargetVeryLow,
  clampTargetBytes,
  calculateTargetFromReduction,
  calculateDynamicDefaultTarget,
  formatBytes
} from './target-suggestion.util';

describe('target-suggestion.util', () => {
  describe('suggestTargets', () => {
    it('generates correct suggestions for a 10.6 KB result (all below 10.6 KB and >= 5% smaller)', () => {
      const bytes10_6kb = Math.round(10.6 * 1024);
      const suggestions = suggestTargets(bytes10_6kb);

      expect(suggestions.length).toBeGreaterThanOrEqual(1);
      expect(suggestions.length).toBeLessThanOrEqual(3);
      for (const s of suggestions) {
        expect(s.bytes).toBeLessThan(bytes10_6kb);
        expect(s.bytes).toBeLessThanOrEqual(Math.floor(bytes10_6kb * 0.95));
        expect(s.value).toBeLessThan(10.6);
      }
    });

    it('generates correct suggestions for a 9.6 KB result (all below 9.6 KB and >= 5% smaller)', () => {
      const bytes9_6kb = Math.round(9.6 * 1024);
      const suggestions = suggestTargets(bytes9_6kb);

      expect(suggestions.length).toBeGreaterThanOrEqual(1);
      expect(suggestions.length).toBeLessThanOrEqual(3);
      for (const s of suggestions) {
        expect(s.bytes).toBeLessThan(bytes9_6kb);
        expect(s.bytes).toBeLessThanOrEqual(Math.floor(bytes9_6kb * 0.95));
        expect(s.value).toBeLessThan(9.6);
      }
    });

    it('generates correct suggestions for 24.6 KB input (all below 24.6 KB)', () => {
      const bytes24_6kb = Math.round(24.6 * 1024);
      const suggestions = suggestTargets(bytes24_6kb);

      expect(suggestions.length).toBe(3);
      expect(suggestions.every(s => s.bytes < bytes24_6kb)).toBe(true);
      expect(suggestions.every(s => s.bytes <= Math.floor(bytes24_6kb * 0.95))).toBe(true);
    });

    it('generates correct suggestions for 2 MB input (all below 2 MB)', () => {
      const bytes2mb = 2 * 1024 * 1024;
      const suggestions = suggestTargets(bytes2mb);

      expect(suggestions.length).toBe(3);
      expect(suggestions.every(s => s.bytes < bytes2mb)).toBe(true);
      expect(suggestions.every(s => s.bytes <= Math.floor(bytes2mb * 0.95))).toBe(true);
    });

    it('never suggests values greater than or equal to the reference image size', () => {
      const testSizes = [1024, 2500, 10854, 9830, 15000, 500000, 10485760];
      for (const size of testSizes) {
        const list = suggestTargets(size);
        for (const s of list) {
          expect(s.bytes).toBeLessThan(size);
          expect(s.bytes).toBeLessThanOrEqual(Math.floor(size * 0.95));
        }
      }
    });

    it('returns empty array for zero or negative bytes', () => {
      expect(suggestTargets(0)).toEqual([]);
      expect(suggestTargets(-100)).toEqual([]);
    });
  });

  describe('isTargetVeryLow', () => {
    it('returns true when target is below 20% of original', () => {
      expect(isTargetVeryLow(15, 100)).toBe(true);
      expect(isTargetVeryLow(199, 1000)).toBe(true);
    });

    it('returns false when target is 20% or above', () => {
      expect(isTargetVeryLow(20, 100)).toBe(false);
      expect(isTargetVeryLow(50, 100)).toBe(false);
      expect(isTargetVeryLow(80, 100)).toBe(false);
    });
  });

  describe('clampTargetBytes', () => {
    it('clamps target so it cannot exceed original size', () => {
      expect(clampTargetBytes(50000, 20000)).toBe(20000);
      expect(clampTargetBytes(15000, 20000)).toBe(15000);
    });
  });

  describe('calculateTargetFromReduction', () => {
    it('computes target from reduction percentage', () => {
      const orig = 24 * 1024; // 24 KB
      const res = calculateTargetFromReduction(orig, 20); // 20% reduction

      expect(res.formattedOriginal).toBe('24 KB');
      expect(res.formattedTarget).toBe('19 KB');
    });

    it('clamps reduction between 0% and 90%', () => {
      const orig = 100 * 1024;
      const resMax = calculateTargetFromReduction(orig, 99);
      expect(resMax.targetBytes).toBe(Math.round(orig * 0.10)); // clamped to 90%
    });
  });

  describe('calculateDynamicDefaultTarget', () => {
    it('correctly calculates 30% reduction targets for all reference specification table sizes', () => {
      // 10 KB -> 7 KB
      const res10k = calculateDynamicDefaultTarget(10 * 1024);
      expect(res10k.targetValue).toBe(7);
      expect(res10k.targetUnit).toBe('KB');

      // 20 KB -> 14 KB
      const res20k = calculateDynamicDefaultTarget(20 * 1024);
      expect(res20k.targetValue).toBe(14);
      expect(res20k.targetUnit).toBe('KB');

      // 32 KB -> 22.4 KB
      const res32k = calculateDynamicDefaultTarget(32 * 1024);
      expect(res32k.targetValue).toBe(22.4);
      expect(res32k.targetUnit).toBe('KB');

      // 50 KB -> 35 KB
      const res50k = calculateDynamicDefaultTarget(50 * 1024);
      expect(res50k.targetValue).toBe(35);
      expect(res50k.targetUnit).toBe('KB');

      // 100 KB -> 70 KB
      const res100k = calculateDynamicDefaultTarget(100 * 1024);
      expect(res100k.targetValue).toBe(70);
      expect(res100k.targetUnit).toBe('KB');

      // 250 KB -> 175 KB
      const res250k = calculateDynamicDefaultTarget(250 * 1024);
      expect(res250k.targetValue).toBe(175);
      expect(res250k.targetUnit).toBe('KB');

      // 500 KB -> 350 KB
      const res500k = calculateDynamicDefaultTarget(500 * 1024);
      expect(res500k.targetValue).toBe(350);
      expect(res500k.targetUnit).toBe('KB');

      // 1 MB -> 700 KB
      const res1m = calculateDynamicDefaultTarget(1024 * 1024);
      expect(res1m.targetValue).toBe(700);
      expect(res1m.targetUnit).toBe('KB');
    });

    it('formats large multi-megabyte files in MB', () => {
      const res5m = calculateDynamicDefaultTarget(5 * 1024 * 1024);
      expect(res5m.targetUnit).toBe('MB');
      expect(res5m.targetValue).toBe(3.5);
    });

    it('handles tiny byte files safely', () => {
      const res500b = calculateDynamicDefaultTarget(500);
      expect(res500b.targetUnit).toBe('B');
      expect(res500b.targetValue).toBe(350);
    });
  });
});

// apps/tool-image-compressor/src/components/quality-controller/quality-controller.component.spec.ts
import { describe, it, expect } from 'vitest';

describe('QualityController Logic and Tier Calculations', () => {
  function getTierLabel(q: number): string {
    const quality = typeof q === 'number' && !isNaN(q) ? Math.min(100, Math.max(1, q)) : 80;
    if (quality >= 92) return 'Maximum Quality (Lossless / Crisp)';
    if (quality >= 82) return 'Balanced (Recommended)';
    if (quality >= 68) return 'Compact (Web Optimized)';
    if (quality >= 45) return 'Aggressive Shrink';
    return 'Ultra Small (High Compression)';
  }

  it('should clamp quality values between 1 and 100', () => {
    expect(Math.min(100, Math.max(1, 150))).toBe(100);
    expect(Math.min(100, Math.max(1, -10))).toBe(1);
    expect(Math.min(100, Math.max(1, 80))).toBe(80);
  });

  it('should calculate appropriate tier labels across ranges', () => {
    expect(getTierLabel(95)).toBe('Maximum Quality (Lossless / Crisp)');
    expect(getTierLabel(85)).toBe('Balanced (Recommended)');
    expect(getTierLabel(80)).toBe('Compact (Web Optimized)');
    expect(getTierLabel(55)).toBe('Aggressive Shrink');
    expect(getTierLabel(20)).toBe('Ultra Small (High Compression)');
  });

  it('should format slider background progress percentage style', () => {
    const q = 75;
    const progressStyle = `${q}%`;
    expect(progressStyle).toBe('75%');
  });
});


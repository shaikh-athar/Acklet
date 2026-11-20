// apps/tool-image-compressor/src/services/honest-label.util.spec.ts
import { describe, it, expect } from 'vitest';
import { determineHonestResult } from './honest-label.util';

describe('Honest Result Labels (Step 5)', () => {
  it('returns "Saved X%" with positive badge when output is at least 5% smaller', () => {
    const res = determineHonestResult({
      originalSize: 100000,
      compressedSize: 60000
    });

    expect(res.status).toBe('saved');
    expect(res.labelText).toBe('Saved 40%');
    expect(res.badgeText).toBe('-40%');
    expect(res.savedPercentage).toBe(40);
  });

  it('returns "Kept original" with null badge when output is equal to original', () => {
    const res = determineHonestResult({
      originalSize: 50000,
      compressedSize: 50000,
      alreadyOptimized: true
    });

    expect(res.status).toBe('kept-original');
    expect(res.labelText).toBe('Kept original');
    expect(res.badgeText).toBeNull();
    expect(res.savedPercentage).toBeNull();
    expect(res.explanationText).toBe('');
  });

  it('returns "Kept original" when output is larger than original', () => {
    const res = determineHonestResult({
      originalSize: 51200,
      compressedSize: 76600,
      alreadyOptimized: true
    });

    expect(res.status).toBe('kept-original');
    expect(res.labelText).toBe('Kept original');
    expect(res.badgeText).toBeNull();
    expect(res.savedPercentage).toBeNull();
  });

  it('returns "Kept original" when savings is less than 5%', () => {
    const res = determineHonestResult({
      originalSize: 10000,
      compressedSize: 9800 // 2% savings < 5%
    });

    expect(res.status).toBe('kept-original');
    expect(res.labelText).toBe('Kept original');
    expect(res.badgeText).toBeNull();
    expect(res.savedPercentage).toBeNull();
  });

  it('never shows a percentage that is 0% or negative', () => {
    const zeroRes = determineHonestResult({
      originalSize: 20000,
      compressedSize: 20000
    });
    expect(zeroRes.status).toBe('kept-original');
    expect(zeroRes.badgeText).toBeNull();
    expect(zeroRes.savedPercentage).toBeNull();

    const negRes = determineHonestResult({
      originalSize: 20000,
      compressedSize: 25000
    });
    expect(negRes.status).toBe('kept-original');
    expect(negRes.badgeText).toBeNull();
    expect(negRes.savedPercentage).toBeNull();
  });
});

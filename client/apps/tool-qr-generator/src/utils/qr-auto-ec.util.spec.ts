// @vitest-environment jsdom
// client/apps/tool-qr-generator/src/utils/qr-auto-ec.util.spec.ts
import { describe, it, expect } from 'vitest';
import { calculateAutoErrorCorrection } from './qr-auto-ec.util';

describe('calculateAutoErrorCorrection', () => {
  it('defaults to Q for standard length content without logo', () => {
    const result = calculateAutoErrorCorrection({
      content: 'https://acklet.com/my-link',
      hasLogo: false
    });
    expect(result.level).toBe('Q');
    expect(result.warning).toBeUndefined();
  });

  it('upgrades to H when a logo is present', () => {
    const result = calculateAutoErrorCorrection({
      content: 'https://acklet.com/my-link',
      hasLogo: true
    });
    expect(result.level).toBe('H');
    expect(result.warning).toBeUndefined();
  });

  it('steps down from H to M when content is long with logo, but never to L', () => {
    const longContent = 'A'.repeat(200); // Exceeds H V10 capacity (174) but fits in M (382)
    const result = calculateAutoErrorCorrection({
      content: longContent,
      hasLogo: true
    });
    expect(result.level).toBe('M');
    expect(result.downgradedFromH).toBe(true);
    expect(result.warning).toBeUndefined();
  });

  it('warns in plain language when content is excessively long with logo while holding at M', () => {
    const veryLongContent = 'A'.repeat(450); // Exceeds M V10 capacity (382)
    const result = calculateAutoErrorCorrection({
      content: veryLongContent,
      hasLogo: true
    });
    expect(result.level).toBe('M');
    expect(result.warning).toContain('Content is long for a centered logo');
  });

  it('steps down from Q to M then L for long content without logo', () => {
    const mediumContent = 'A'.repeat(300); // > 271, <= 382
    const medResult = calculateAutoErrorCorrection({
      content: mediumContent,
      hasLogo: false
    });
    expect(medResult.level).toBe('M');

    const extremeContent = 'A'.repeat(400); // > 382
    const extremeResult = calculateAutoErrorCorrection({
      content: extremeContent,
      hasLogo: false
    });
    expect(extremeResult.level).toBe('L');
  });

  it('holds error correction level at M for plain text even when exceeding 800 characters', () => {
    const textContent = 'A'.repeat(900);
    const result = calculateAutoErrorCorrection({
      content: textContent,
      type: 'text',
      hasLogo: false
    });
    expect(result.level).toBe('M');
  });

  it('selects level Q for dynamic smart link without logo regardless of payload size', () => {
    const result = calculateAutoErrorCorrection({
      content: 'A'.repeat(3000),
      isDynamic: true,
      hasLogo: false
    });
    expect(result.level).toBe('Q');
  });

  it('selects level H for dynamic smart link when logo or custom shape is present', () => {
    const result = calculateAutoErrorCorrection({
      content: 'A'.repeat(3000),
      isDynamic: true,
      hasLogo: true
    });
    expect(result.level).toBe('H');
  });
});

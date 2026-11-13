import { describe, it, expect } from 'vitest';
import { HERO_LINES, HeroLine } from './hero-lines.config';

describe('HERO_LINES Config', () => {
  it('should export an array with all 8 specified lines', () => {
    expect(HERO_LINES).toBeDefined();
    expect(HERO_LINES.length).toBe(8);
  });

  it('should have valid text on every line with no conversion words or technical jargon', () => {
    const forbiddenWords = ['convert', 'webp', 'jpeg', 'jpg', 'ssim', 'psnr', 'chroma', 'exif'];
    for (const line of HERO_LINES) {
      expect(line.text).toBeTruthy();
      expect(typeof line.text).toBe('string');
      // Ensure sentence case and ends with punctuation
      expect(/[.?!]$/.test(line.text.trim())).toBe(true);

      const lower = line.text.toLowerCase();
      for (const word of forbiddenWords) {
        expect(lower.includes(word)).toBe(false);
      }
    }
  });

  it('should have highlights that exist within the line text when specified', () => {
    for (const line of HERO_LINES) {
      if (line.highlight) {
        expect(line.text).toContain(line.highlight);
      }
    }
  });
});


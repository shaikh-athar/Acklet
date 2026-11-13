import { describe, it, expect } from 'vitest';
import { HERO_LINES, HeroLine } from '../../config/hero-lines.config';

function parseSegments(line: HeroLine): { before: string; highlight?: string; after: string } {
  if (!line.highlight || !line.text.includes(line.highlight)) {
    return { before: line.text, after: '' };
  }
  const idx = line.text.indexOf(line.highlight);
  let before = line.text.slice(0, idx);
  let after = line.text.slice(idx + line.highlight.length);

  if (before.endsWith(' ')) {
    before = before.slice(0, -1) + '\u00A0';
  }
  if (after.startsWith(' ')) {
    after = '\u00A0' + after.slice(1);
  }

  return {
    before,
    highlight: line.highlight,
    after
  };
}

describe('Rotating Heading Component Logic & Lines', () => {
  it('should have 8 motivating hero lines in config', () => {
    expect(HERO_LINES.length).toBe(8);
  });

  it('should correctly parse highlight segments for each line', () => {
    for (const line of HERO_LINES) {
      const segs = parseSegments(line);
      if (line.highlight) {
        expect(segs.highlight).toBe(line.highlight);
        expect((segs.before + segs.highlight + segs.after).replace(/\u00A0/g, ' ')).toBe(line.text);
      } else {
        expect(segs.before).toBe(line.text);
      }
    }
  });

  it('should ensure each line ends with proper punctuation', () => {
    for (const line of HERO_LINES) {
      expect(/[.?!]$/.test(line.text)).toBe(true);
    }
  });
});

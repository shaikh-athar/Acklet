// client/apps/tool-qr-generator/src/services/color-validator.service.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ColorValidatorService } from './color-validator.service';

describe('ColorValidatorService', () => {
  let service: ColorValidatorService;

  beforeEach(() => {
    service = new ColorValidatorService();
  });

  describe('isValidHex()', () => {
    it('validates 3 and 6 digit hex codes with or without #', () => {
      expect(service.isValidHex('#000000')).toBe(true);
      expect(service.isValidHex('#FFF')).toBe(true);
      expect(service.isValidHex('10B981')).toBe(true);
      expect(service.isValidHex('abc')).toBe(true);
    });

    it('rejects invalid hex characters or lengths', () => {
      expect(service.isValidHex('#12')).toBe(false);
      expect(service.isValidHex('#12345')).toBe(false);
      expect(service.isValidHex('#ZZZ')).toBe(false);
      expect(service.isValidHex('')).toBe(false);
    });
  });

  describe('normalizeHex()', () => {
    it('expands 3-character hex to 6-character uppercase with #', () => {
      expect(service.normalizeHex('#f00')).toBe('#FF0000');
      expect(service.normalizeHex('abc')).toBe('#AABBCC');
    });

    it('preserves and standardizes 6-character hex', () => {
      expect(service.normalizeHex('#10b981')).toBe('#10B981');
      expect(service.normalizeHex('ffffff')).toBe('#FFFFFF');
    });
  });

  describe('hexToRgb()', () => {
    it('parses hex to RGB channel values', () => {
      expect(service.hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(service.hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
      expect(service.hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('returns null for invalid hex', () => {
      expect(service.hexToRgb('invalid')).toBeNull();
    });
  });

  describe('contrastRatio()', () => {
    it('calculates exactly 21:1 for pure black on pure white', () => {
      const ratio = service.contrastRatio('#000000', '#FFFFFF');
      expect(ratio).toBe(21);
    });

    it('calculates 1:1 for identical colors', () => {
      const ratio = service.contrastRatio('#FFFFFF', '#FFFFFF');
      expect(ratio).toBe(1);
    });

    it('is symmetric regardless of argument order', () => {
      const r1 = service.contrastRatio('#000000', '#10B981');
      const r2 = service.contrastRatio('#10B981', '#000000');
      expect(r1).toBe(r2);
    });
  });

  describe('hasLowContrast()', () => {
    it('flags low contrast when ratio is below 2.5:1', () => {
      // Light gray on white has low contrast
      expect(service.hasLowContrast('#E5E7EB', '#FFFFFF')).toBe(true);
    });

    it('does not flag high contrast', () => {
      expect(service.hasLowContrast('#000000', '#FFFFFF')).toBe(false);
      expect(service.hasLowContrast('#022C22', '#10B981')).toBe(false);
    });
  });

  describe('checkContrast()', () => {
    it('returns level AAA and no warning for black on white', () => {
      const res = service.checkContrast('#000000', '#FFFFFF');
      expect(res.ratio).toBe(21);
      expect(res.level).toBe('AAA');
      expect(res.hasLowContrast).toBe(false);
      expect(res.warningMessage).toBeUndefined();
    });

    it('returns level FAIL and a descriptive warning for low contrast colors', () => {
      // Light yellow on white
      const res = service.checkContrast('#FEF08A', '#FFFFFF');
      expect(res.hasLowContrast).toBe(true);
      expect(res.level).toBe('FAIL');
      expect(res.warningMessage).toContain('Low contrast (< 2.5:1)');
    });
  });
});

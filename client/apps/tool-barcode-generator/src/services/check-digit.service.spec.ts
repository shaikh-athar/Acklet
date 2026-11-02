import { describe, it, expect, beforeEach } from 'vitest';
import { BarcodeCheckDigitService } from './check-digit.service';

describe('BarcodeCheckDigitService', () => {
  let service: BarcodeCheckDigitService;

  beforeEach(() => {
    service = new BarcodeCheckDigitService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Mandatory Test Vectors', () => {
    it('EAN-13: 400638133393 produces check digit 1, and 4006381333931 is valid', () => {
      const calculated = service.calculateGs1Mod10('400638133393');
      expect(calculated).toBe('1');

      const validation = service.validateGs1Mod10('4006381333931');
      expect(validation.valid).toBe(true);
      expect(validation.expected).toBe('1');
      expect(validation.actual).toBe('1');
    });

    it('UPC-A: 03600029145 produces check digit 2, and 036000291452 is valid', () => {
      const calculated = service.calculateGs1Mod10('03600029145');
      expect(calculated).toBe('2');

      const validation = service.validateGs1Mod10('036000291452');
      expect(validation.valid).toBe(true);
      expect(validation.expected).toBe('2');
      expect(validation.actual).toBe('2');
    });

    it('EAN-8: 9638507 produces check digit 4, and 96385074 is valid', () => {
      const calculated = service.calculateGs1Mod10('9638507');
      expect(calculated).toBe('4');

      const validation = service.validateGs1Mod10('96385074');
      expect(validation.valid).toBe(true);
      expect(validation.expected).toBe('4');
      expect(validation.actual).toBe('4');
    });

    it('ISBN-13: 978030640615 produces check digit 7, and 9780306406157 is valid', () => {
      const calculated = service.calculateGs1Mod10('978030640615');
      expect(calculated).toBe('7');

      const validation = service.validateGs1Mod10('9780306406157');
      expect(validation.valid).toBe(true);
      expect(validation.expected).toBe('7');
      expect(validation.actual).toBe('7');
    });

    it('converts ISBN-10 to ISBN-13 accurately', () => {
      const isbn10 = '0-306-40615-2';
      const converted = service.convertIsbn10To13(isbn10);
      expect(converted).toBe('9780306406157');
    });

    it('rejects incorrect check digits', () => {
      const invalidEan13 = service.validateGs1Mod10('4006381333939');
      expect(invalidEan13.valid).toBe(false);
      expect(invalidEan13.expected).toBe('1');
      expect(invalidEan13.actual).toBe('9');

      const invalidUpcA = service.validateGs1Mod10('036000291459');
      expect(invalidUpcA.valid).toBe(false);
      expect(invalidUpcA.expected).toBe('2');
    });
  });

  describe('Code 39 Modulo-43 Check', () => {
    it('calculates Code 39 checksum correctly', () => {
      const check = service.calculateCode39Check('12345');
      // 1+2+3+4+5 = 15 -> 'F'
      expect(check).toBe('F');
      expect(service.validateCode39Check('12345F')).toBe(true);
    });
  });

  describe('UPC-E zero suppression', () => {
    it('compresses eligible UPC-A to UPC-E', () => {
      const upce = service.compressUpcaToUpce('012345000055');
      expect(upce).toBeTruthy();
    });
  });
});

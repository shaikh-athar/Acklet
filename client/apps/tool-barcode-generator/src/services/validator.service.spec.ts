// apps/tool-barcode-generator/src/services/validator.service.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ValidatorService } from './validator.service';
import { BARCODE_CATALOG } from '../config/barcode-catalog.config';

describe('ValidatorService - Comprehensive Validation & Test Vectors', () => {
  let service: ValidatorService;

  beforeEach(() => {
    service = new ValidatorService();
  });

  describe('Mandatory Test Vectors', () => {
    it('EAN-13: 4006381333931 is valid, and 400638133393 gives check digit 1', () => {
      const item = BARCODE_CATALOG['ean13'];
      const validRes = service.validate(item, '4006381333931');
      expect(validRes.valid).toBe(true);
      expect(validRes.cleanValue).toBe('4006381333931');

      const partialRes = service.validate(item, '400638133393');
      expect(partialRes.valid).toBe(true);
      expect(partialRes.checkDigitAdded).toBe('1');
      expect(partialRes.cleanValue).toBe('4006381333931');
    });

    it('UPC-A: 036000291452 is valid, and 03600029145 gives check digit 2', () => {
      const item = BARCODE_CATALOG['upca'];
      const validRes = service.validate(item, '036000291452');
      expect(validRes.valid).toBe(true);
      expect(validRes.cleanValue).toBe('036000291452');

      const partialRes = service.validate(item, '03600029145');
      expect(partialRes.valid).toBe(true);
      expect(partialRes.checkDigitAdded).toBe('2');
      expect(partialRes.cleanValue).toBe('036000291452');
    });

    it('EAN-8: 96385074 is valid, and 9638507 gives check digit 4', () => {
      const item = BARCODE_CATALOG['ean8'];
      const validRes = service.validate(item, '96385074');
      expect(validRes.valid).toBe(true);
      expect(validRes.cleanValue).toBe('96385074');

      const partialRes = service.validate(item, '9638507');
      expect(partialRes.valid).toBe(true);
      expect(partialRes.checkDigitAdded).toBe('4');
      expect(partialRes.cleanValue).toBe('96385074');
    });

    it('ISBN: 9780306406157 is valid, and 978030640615 gives check digit 7', () => {
      const item = BARCODE_CATALOG['isbn'];
      const validRes = service.validate(item, '9780306406157');
      expect(validRes.valid).toBe(true);
      expect(validRes.cleanValue).toBe('9780306406157');

      const partialRes = service.validate(item, '978030640615');
      expect(partialRes.valid).toBe(true);
      expect(partialRes.checkDigitAdded).toBe('7');
      expect(partialRes.cleanValue).toBe('9780306406157');
    });

    it('ISBN-10: converts ISBN-10 to ISBN-13 with 978 prefix and recalculates check digit', () => {
      const item = BARCODE_CATALOG['isbn'];
      const res = service.validate(item, '0-306-40615-2');
      expect(res.valid).toBe(true);
      expect(res.cleanValue).toBe('9780306406157');
    });
  });

  describe('Validation & Rejection Rules', () => {
    it('rejects letters in numeric formats (EAN-13, UPC-A, ITF-14)', () => {
      const ean = BARCODE_CATALOG['ean13'];
      const resEan = service.validate(ean, '400638133A931');
      expect(resEan.valid).toBe(false);
      expect(resEan.errorMessage).toBe('Use digits only. Remove: A.');
      expect(resEan.suggestedAction).toBe('strip-non-digits');

      const upc = BARCODE_CATALOG['upca'];
      const resUpc = service.validate(upc, '03600029X452');
      expect(resUpc.valid).toBe(false);
      expect(resUpc.errorMessage).toBe('Use digits only. Remove: X.');
      expect(resUpc.suggestedAction).toBe('strip-non-digits');
    });

    it('rejects wrong lengths', () => {
      const ean8 = BARCODE_CATALOG['ean8'];
      const res = service.validate(ean8, '12345');
      expect(res.valid).toBe(false);
      expect(res.errorMessage).toBe('Enter 7 or 8 digits.');
    });

    it('rejects wrong check digits', () => {
      const ean13 = BARCODE_CATALOG['ean13'];
      const res = service.validate(ean13, '4006381333939');
      expect(res.valid).toBe(false);
      expect(res.errorMessage).toBe('Check digit should be 1. The last digit is 9.');
      expect(res.suggestedAction).toBe('fix-check-digit');
      expect(res.suggestedCheckDigit).toBe('1');
    });

    it('Interleaved 2 of 5: rejects odd length and offers Add leading 0', () => {
      const itf = BARCODE_CATALOG['itf'];
      const res = service.validate(itf, '12345', { autoPrependZero: false });
      expect(res.valid).toBe(false);
      expect(res.errorMessage).toBe('Length must be an even number of digits.');
      expect(res.suggestedAction).toBe('prepend-zero');
    });

    it('Code 39: rejects lowercase letters and offers to uppercase', () => {
      const code39 = BARCODE_CATALOG['code39'];
      const res = service.validate(code39, 'acklet-123');
      expect(res.valid).toBe(false);
      expect(res.suggestedAction).toBe('uppercase');
    });

    it('GS1 DataBar Limited: rejects GTIN not starting with 0 or 1', () => {
      const databar = BARCODE_CATALOG['gs1-databar'];
      const res = service.validate(databar, '20012345678909', { variant: 'databar-limited' });
      expect(res.valid).toBe(false);
      expect(res.errorMessage).toContain('Limited accepts only GTINs starting with 0 or 1');
    });

    it('validates test vectors: EAN-8 97803064, EAN-8 90909090, UPC-A 036000291422', () => {
      const ean8 = BARCODE_CATALOG['ean8'];
      const upca = BARCODE_CATALOG['upca'];
      const databar = BARCODE_CATALOG['gs1-databar'];
      const codabar = BARCODE_CATALOG['codabar'];

      // EAN-8 97803064 needs 5
      const resEan8 = service.validate(ean8, '97803064');
      expect(resEan8.valid).toBe(false);
      expect(resEan8.errorMessage).toBe('Check digit should be 5. The last digit is 4.');
      expect(resEan8.suggestedCheckDigit).toBe('5');

      // EAN-8 90909090 needs 2
      const resEan8b = service.validate(ean8, '90909090');
      expect(resEan8b.valid).toBe(false);
      expect(resEan8b.errorMessage).toBe('Check digit should be 2. The last digit is 0.');
      expect(resEan8b.suggestedCheckDigit).toBe('2');

      // UPC-A 036000291422 needs 1
      const resUpc = service.validate(upca, '036000291422');
      expect(resUpc.valid).toBe(false);
      expect(resUpc.errorMessage).toBe('Check digit should be 1. The last digit is 2.');
      expect(resUpc.suggestedCheckDigit).toBe('1');

      // DataBar Omnidirectional with 9780306406157 is valid
      const resDb = service.validate(databar, '9780306406157', { variant: 'omni' });
      expect(resDb.valid).toBe(true);

      // Codabar rejects guards in middle
      const resCoda = service.validate(codabar, 'A12B34B');
      expect(resCoda.valid).toBe(false);
      expect(resCoda.errorMessage).toBe('Guards A to D are allowed only at start and end.');
    });

    it('validates ISMN, UPC-E, ISSN, and GS1 DataBar Expanded Stacked correctly', () => {
      const ismn = BARCODE_CATALOG['ismn'];
      const upce = BARCODE_CATALOG['upce'];
      const issn = BARCODE_CATALOG['issn'];
      const databar = BARCODE_CATALOG['gs1-databar'];

      // Finding A: ISMN 0360008908999 & 2000898978788 must fail validation (don't start with 9790)
      const resIsmn1 = service.validate(ismn, '0360008908999');
      expect(resIsmn1.valid).toBe(false);
      expect(resIsmn1.errorMessage).toBe('ISMN must start with 9790 (or legacy M-).');

      const resIsmn2 = service.validate(ismn, '2000898978788');
      expect(resIsmn2.valid).toBe(false);
      expect(resIsmn2.errorMessage).toBe('ISMN must start with 9790 (or legacy M-).');

      // Valid ISMN
      const resIsmnValid = service.validate(ismn, '9790260000438');
      expect(resIsmnValid.valid).toBe(true);

      // Legacy ISMN
      const resIsmnLegacy = service.validate(ismn, 'M-060-11561-5');
      expect(resIsmnLegacy.valid).toBe(true);
      expect(resIsmnLegacy.cleanValue.startsWith('9790')).toBe(true);

      // Finding B: UPC-E 03600089 fails check digit validation (expected 5, got 9)
      const resUpce1 = service.validate(upce, '03600089');
      expect(resUpce1.valid).toBe(false);
      expect(resUpce1.errorMessage).toBe('Check digit should be 5. The last digit is 9.');
      expect(resUpce1.suggestedCheckDigit).toBe('5');

      // Valid UPC-E 03600085
      const resUpceValid = service.validate(upce, '03600085');
      expect(resUpceValid.valid).toBe(true);

      // Finding C: GS1 DataBar Expanded Stacked with 11 digits (03600029142) must fail validation
      const resDbExp = service.validate(databar, '03600029142', { variant: 'expanded-stacked' });
      expect(resDbExp.valid).toBe(false);
      expect(resDbExp.errorMessage).toBe('Enter 8, 12, 13 or 14 digits (or Application Identifiers in parentheses).');

      // Finding D: ISSN 20008989 check digit validation (7 digits 2000898 need check digit 8, got 9)
      const resIssn1 = service.validate(issn, '20008989');
      expect(resIssn1.valid).toBe(false);
      expect(resIssn1.errorMessage).toBe('Check digit should be 8. The last digit is 9.');
      expect(resIssn1.suggestedCheckDigit).toBe('8');

      // Valid ISSN 20008988
      const resIssnValid = service.validate(issn, '20008988');
      expect(resIssnValid.valid).toBe(true);
      expect(resIssnValid.cleanValue).toBe('9772000898000');
    });
  });

  describe('Fuzz Testing & Robustness', () => {
    it('handles very long inputs without freezing or crashing', () => {
      const code128 = BARCODE_CATALOG['code128'];
      const longInput = 'A'.repeat(5000);
      const res = service.validate(code128, longInput);
      expect(res.valid).toBe(false);
      expect(res.errorMessage).toBeDefined();
    });

    it('handles unexpected symbols and control characters gracefully', () => {
      const ean13 = BARCODE_CATALOG['ean13'];
      const strange = '!@#$%^&*()_+~`|}{[]:;?><,./';
      const res = service.validate(ean13, strange);
      expect(res.valid).toBe(false);
      expect(res.errorMessage).toContain('Use digits only');
    });
  });
});

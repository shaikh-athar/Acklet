// apps/tool-barcode-generator/src/services/charset-rejection.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ValidatorService } from './validator.service';
import { BarcodeCheckDigitService } from './check-digit.service';
import { BARCODE_CATALOG } from '../config/barcode-catalog.config';

describe('Charset Rejection & Error Naming Test Suite (Round 3)', () => {
  let validator: ValidatorService;

  beforeEach(() => {
    validator = new ValidatorService(new BarcodeCheckDigitService());
  });

  it('Code 128: rejects non-ASCII input (Naïve café) naming the exact characters ï and é', () => {
    const res = validator.validate('code128', 'Naïve café');
    expect(res.valid).toBe(false);
    expect(res.errorMessage).toBe('Code 128 supports ASCII characters only. Remove: ï é.');
  });

  it('Code 39 Extended: rejects non-ASCII input naming the invalid characters', () => {
    const res = validator.validate('code39ext', 'HELLO € WORLD');
    expect(res.valid).toBe(false);
    expect(res.errorMessage).toBe('Code 39 Extended supports ASCII characters only. Remove: €.');
  });

  it('Telepen: rejects non-ASCII input naming the invalid characters', () => {
    const res = validator.validate('telepen', 'TEL-ü-PEN');
    expect(res.valid).toBe(false);
    expect(res.errorMessage).toBe('Telepen supports ASCII characters only. Remove: ü.');
  });

  it('Data Matrix: rejects non-ASCII input and names the characters', () => {
    const res = validator.validate('datamatrix', 'QR-ñ-DM');
    expect(res.valid).toBe(false);
    expect(res.errorMessage).toBe('Data Matrix supports ASCII characters only. Remove: ñ.');
  });

  it('Data Matrix rectangular: enforces max 72 characters limit', () => {
    const text73 = 'A'.repeat(73);
    const res = validator.validate('datamatrix', text73, { shape: 'rectangular' });
    expect(res.valid).toBe(false);
    expect(res.errorMessage).toBe('Rectangular Data Matrix supports up to 72 characters. Choose square or shorten the value.');
  });

  it('PDF417: rejects non-ASCII input naming the characters', () => {
    const res = validator.validate('pdf417', 'PASSENGER: MÜLLER');
    expect(res.valid).toBe(false);
    expect(res.errorMessage).toBe('PDF417 supports ASCII characters only. Remove: Ü.');
  });

  it('PDF417: enforces capacity per security level', () => {
    const text300 = 'A'.repeat(300);
    const res = validator.validate('pdf417', text300, { securityLevel: 8 });
    expect(res.valid).toBe(false);
    expect(res.errorMessage).toBe('Level 8 supports up to 220 characters. Use a lower level or shorten the text.');
  });

  it('Aztec: rejects non-ASCII input naming the characters', () => {
    const res = validator.validate('aztec', 'TICKET: PARIS-ZÜRICH');
    expect(res.valid).toBe(false);
    expect(res.errorMessage).toBe('Aztec supports ASCII characters only. Remove: Ü.');
  });

  it('Aztec: enforces capacity per error correction percentage', () => {
    const text1100 = 'A'.repeat(1100);
    const res = validator.validate('aztec', text1100, { errorCorrectionPercent: 50 });
    expect(res.valid).toBe(false);
    expect(res.errorMessage).toBe('50% error correction supports up to 1000 characters. Lower the percent or shorten the text.');
  });

  it('MSI Plessey: rejects letters naming the invalid characters', () => {
    const res = validator.validate('msi', '80523ABC');
    expect(res.valid).toBe(false);
    expect(res.errorMessage).toBe('Use digits only. Remove: A B C.');
  });

  it('Code 11: rejects non-digits/hyphens naming the invalid characters', () => {
    const res = validator.validate('code11', '123-456_AB');
    expect(res.valid).toBe(false);
    expect(res.errorMessage).toBe('Use digits and hyphens only. Remove: _ A B.');
  });

  it('Standard 2 of 5: rejects letters naming the invalid characters', () => {
    const res = validator.validate('standard2of5', '98765XYZ');
    expect(res.valid).toBe(false);
    expect(res.errorMessage).toBe('Use digits only. Remove: X Y Z.');
  });

  it('Numeric retail formats (EAN-13, EAN-8, UPC-A, ITF-14): name rejected letters', () => {
    const resEan13 = validator.validate('ean13', '400638133393SJK');
    expect(resEan13.valid).toBe(false);
    expect(resEan13.errorMessage).toBe('Use digits only. Remove: S J K.');

    const resUpca = validator.validate('upca', '03600029145AB');
    expect(resUpca.valid).toBe(false);
    expect(resUpca.errorMessage).toBe('Use digits only. Remove: A B.');
  });

  it('Code 39: names invalid characters outside A-Z, 0-9 and - . $ / + %', () => {
    const res = validator.validate('code39', 'CODE39_#@');
    expect(res.valid).toBe(false);
    expect(res.errorMessage).toBe('Use letters A to Z, digits and - . $ / + % only. Remove: _ # @.');
  });

  it('Codabar: names invalid characters and guards', () => {
    const res = validator.validate('codabar', 'A1234#$B');
    expect(res.valid).toBe(false);
    expect(res.errorMessage).toBe('Use digits, symbols - $ : / . + and guards A to D. Remove: #.');
  });

  it('Lists up to 5 distinct invalid characters and then appends "and others"', () => {
    const res = validator.validate('ean13', '4006381abcdefg');
    expect(res.valid).toBe(false);
    expect(res.errorMessage).toBe('Use digits only. Remove: a b c d e and others.');
  });
});


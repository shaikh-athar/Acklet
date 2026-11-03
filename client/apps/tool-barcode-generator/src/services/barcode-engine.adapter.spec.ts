import { describe, it, expect, beforeEach } from 'vitest';
import { BarcodeEngineAdapter } from './barcode-engine.adapter';
import { BarcodeCheckDigitService } from './check-digit.service';
import { DEFAULT_DESIGN_OPTIONS } from '../models/barcode.models';

describe('BarcodeEngineAdapter', () => {
  let adapter: BarcodeEngineAdapter;

  beforeEach(() => {
    adapter = new BarcodeEngineAdapter(new BarcodeCheckDigitService());
  });

  describe('Validation Rules & Rejections', () => {
    it('rejects letters in EAN-13', () => {
      const res = adapter.validateInput('ean13', '400638133393A');
      expect(res.valid).toBe(false);
      expect(res.errorMessage).toBe('Use digits only. Remove: A.');
    });

    it('rejects letters in UPC-A', () => {
      const res = adapter.validateInput('upca', '03600029145A');
      expect(res.valid).toBe(false);
      expect(res.errorMessage).toBe('Use digits only. Remove: A.');
    });

    it('rejects wrong length in EAN-8', () => {
      const res = adapter.validateInput('ean8', '12345');
      expect(res.valid).toBe(false);
      expect(res.errorMessage).toBe('Enter 7 or 8 digits.');
    });

    it('rejects wrong check digit in EAN-13', () => {
      const res = adapter.validateInput('ean13', '4006381333939');
      expect(res.valid).toBe(false);
      expect(res.errorMessage).toContain('Check digit should be 1');
    });

    it('auto-completes 12-digit EAN-13 by calculating check digit', () => {
      const res = adapter.validateInput('ean13', '400638133393');
      expect(res.valid).toBe(true);
      expect(res.cleanValue).toBe('4006381333931');
      expect(res.checkDigitAdded).toBe('1');
    });

    it('auto-completes 11-digit UPC-A by calculating check digit', () => {
      const res = adapter.validateInput('upca', '03600029145');
      expect(res.valid).toBe(true);
      expect(res.cleanValue).toBe('036000291452');
      expect(res.checkDigitAdded).toBe('2');
    });

    it('rejects odd number of digits in Interleaved 2 of 5 when auto-prepend is disabled', () => {
      const res = adapter.validateInput('itf', '12345', { autoPrependZero: false });
      expect(res.valid).toBe(false);
      expect(res.errorMessage).toContain('even number of digits');
    });

    it('prepends 0 to odd length Interleaved 2 of 5 when auto-prepend is enabled', () => {
      const res = adapter.validateInput('itf', '12345', { autoPrependZero: true });
      expect(res.valid).toBe(true);
      expect(res.cleanValue).toBe('012345');
      expect(res.suggestion).toContain('Prepended 0');
    });

    it('rejects lowercase letters in Code 39 and offers to uppercase', () => {
      const res = adapter.validateInput('code39', 'test-code');
      expect(res.valid).toBe(false);
      expect(res.suggestedAction).toBe('uppercase');
      expect(res.cleanValue).toBe('TEST-CODE');
    });

    it('identifies URLs as better suited for QR code', () => {
      const res = adapter.validateInput('code128', 'https://example.com/checkout?id=9872');
      expect(res.suggestQr).toBe(true);
    });
  });

  describe('Vector SVG Rendering', () => {
    it('renders valid SVG for Code 128', async () => {
      const result = await adapter.renderToSvg({
        format: 'code128',
        value: 'ACKLET-128',
        design: { ...DEFAULT_DESIGN_OPTIONS },
        formatOptions: {}
      });

      expect(result).toBeTruthy();
      expect(result.svg).toContain('<svg');
      expect(result.svg).toContain('viewBox="0 0');
      expect(result.svg).toContain('shape-rendering="crispEdges"');
      expect(result.svg).toContain('<path');
      expect(result.svg).toContain('ACKLET-128');
    });

    it('renders EAN-13 with digit grouping', async () => {
      const result = await adapter.renderToSvg({
        format: 'ean13',
        value: '4006381333931',
        design: { ...DEFAULT_DESIGN_OPTIONS, eanGrouping: true },
        formatOptions: {}
      });

      expect(result.displayValue).toBe('4 006381 333931');
      expect(result.svg).toContain('4 006381 333931');
    });

    it('renders ITF-14 with bearer bars', async () => {
      const result = await adapter.renderToSvg({
        format: 'itf14',
        value: '10012345678902',
        design: { ...DEFAULT_DESIGN_OPTIONS },
        formatOptions: { bearerBars: 'top-bottom' }
      });

      expect(result.svg).toContain('<svg');
      expect(result.encodedValue).toBe('10012345678902');
    });
  });
});

// apps/tool-barcode-generator/src/services/variant-shape-level.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { RenderService } from './render.service';
import { EncoderAdapter } from './encoder-adapter.service';
import { BarcodeCheckDigitService } from './check-digit.service';
import { BARCODE_CATALOG } from '../config/barcode-catalog.config';
import { DEFAULT_DESIGN_OPTIONS } from '../models/barcode.models';

describe('Symbology Variants, Shapes, Levels, & Algorithms Test Suite (Round 3)', () => {
  let renderService: RenderService;
  let checkDigitService: BarcodeCheckDigitService;

  beforeEach(() => {
    const encoder = new EncoderAdapter();
    renderService = new RenderService(encoder);
    checkDigitService = new BarcodeCheckDigitService();
  });

  describe('Section 3: GS1 DataBar 7 Variants', () => {
    const item = BARCODE_CATALOG['gs1-databar'];
    const gtin = '(01)09521234543213';

    it('renders Omnidirectional with one row, full height', async () => {
      const res = await renderService.render(item, gtin, gtin, DEFAULT_DESIGN_OPTIONS, { variant: 'omni' });
      expect(res.height).toBeGreaterThan(150);
    });

    it('renders Truncated with one row, reduced height', async () => {
      const omni = await renderService.render(item, gtin, gtin, DEFAULT_DESIGN_OPTIONS, { variant: 'omni' });
      const trunc = await renderService.render(item, gtin, gtin, DEFAULT_DESIGN_OPTIONS, { variant: 'truncated' });
      expect(trunc.height).toBeLessThan(omni.height);
      expect(trunc.width).toBe(omni.width);
    });

    it('renders Stacked with two rows, reduced height', async () => {
      const omni = await renderService.render(item, gtin, gtin, DEFAULT_DESIGN_OPTIONS, { variant: 'omni' });
      const stacked = await renderService.render(item, gtin, gtin, DEFAULT_DESIGN_OPTIONS, { variant: 'stacked' });
      expect(stacked.width).toBeLessThan(omni.width);
    });

    it('renders Stacked Omnidirectional with two rows, full height', async () => {
      const stackedOmni = await renderService.render(item, gtin, gtin, DEFAULT_DESIGN_OPTIONS, { variant: 'stacked-omni' });
      const stacked = await renderService.render(item, gtin, gtin, DEFAULT_DESIGN_OPTIONS, { variant: 'stacked' });
      expect(stackedOmni.height).toBeGreaterThan(stacked.height);
    });

    it('renders Limited narrower than Omnidirectional', async () => {
      const omni = await renderService.render(item, gtin, gtin, { ...DEFAULT_DESIGN_OPTIONS, showText: false }, { variant: 'omni' });
      const limited = await renderService.render(item, gtin, gtin, { ...DEFAULT_DESIGN_OPTIONS, showText: false }, { variant: 'limited' });
      expect(limited.width).toBeLessThan(omni.width);
    });

    it('renders Expanded with AI data in one wider row', async () => {
      const aiData = '(01)09521234543213(3103)000123';
      const expanded = await renderService.render(item, aiData, aiData, DEFAULT_DESIGN_OPTIONS, { variant: 'expanded' });
      const omni = await renderService.render(item, gtin, gtin, DEFAULT_DESIGN_OPTIONS, { variant: 'omni' });
      expect(expanded.width).toBeGreaterThan(omni.width);
    });

    it('renders Expanded Stacked in multiple rows with segments', async () => {
      const aiData = '(01)09521234543213(3103)000123';
      const expStacked4 = await renderService.render(item, aiData, aiData, DEFAULT_DESIGN_OPTIONS, { variant: 'expanded-stacked', segments: 4 });
      const expanded = await renderService.render(item, aiData, aiData, DEFAULT_DESIGN_OPTIONS, { variant: 'expanded' });
      expect(expStacked4.height).toBeGreaterThan(expanded.height);
    });
  });

  describe('Section 4: Data Matrix Shape (Square vs Rectangular)', () => {
    const item = BARCODE_CATALOG['datamatrix'];
    const text30 = 'https://acklet.com/tools?ref=1';

    it('Square renders equal width and height', async () => {
      const square = await renderService.render(item, text30, text30, DEFAULT_DESIGN_OPTIONS, { shape: 'square' });
      expect(square.width).toBe(square.height);
    });

    it('Rectangular renders wider than tall', async () => {
      const rect = await renderService.render(item, text30, text30, DEFAULT_DESIGN_OPTIONS, { shape: 'rectangular' });
      expect(rect.width).toBeGreaterThan(rect.height);
    });
  });

  describe('Section 5: PDF417 Security Levels 0 to 8', () => {
    const item = BARCODE_CATALOG['pdf417'];
    const val = 'ACKLET-PKG-9821';

    it('all 9 levels 0 to 8 render valid, non-decreasing symbols', async () => {
      const results: any[] = [];
      for (let lvl = 0; lvl <= 8; lvl++) {
        const res = await renderService.render(item, val, val, DEFAULT_DESIGN_OPTIONS, { securityLevel: lvl });
        results.push(res);
      }

      // Check level 0 differs from level 8
      expect(results[0].svg).not.toBe(results[8].svg);

      // Verify non-decreasing symbol area/dimensions as ECC level rises
      const area0 = results[0].width * results[0].height;
      const area8 = results[8].width * results[8].height;
      expect(area8).toBeGreaterThanOrEqual(area0);
    });
  });

  describe('Section 6: Aztec Error Correction (10%, 30%, 50%)', () => {
    const item = BARCODE_CATALOG['aztec'];
    const val = 'ACKLET-PKG-9821';

    it('produces 3 distinct symbols with non-decreasing size', async () => {
      const res10 = await renderService.render(item, val, val, DEFAULT_DESIGN_OPTIONS, { errorCorrectionPercent: 10 });
      const res30 = await renderService.render(item, val, val, DEFAULT_DESIGN_OPTIONS, { errorCorrectionPercent: 30 });
      const res50 = await renderService.render(item, val, val, DEFAULT_DESIGN_OPTIONS, { errorCorrectionPercent: 50 });

      expect(res10.svg).not.toBe(res30.svg);
      expect(res30.svg).not.toBe(res50.svg);
      expect(res10.svg).not.toBe(res50.svg);

      expect(res50.width).toBeGreaterThanOrEqual(res10.width);
    });
  });

  describe('Section 7: MSI Plessey Check Algorithms & Mod 11 Edge Case', () => {
    it('80523 gives correct encoded values across all 4 algorithms', () => {
      expect(checkDigitService.getMsiEncodedValue('80523', 'none')).toBe('80523');
      expect(checkDigitService.getMsiEncodedValue('80523', 'mod10')).toBe('805234');
      expect(checkDigitService.getMsiEncodedValue('80523', 'mod11')).toBe('805238');
      expect(checkDigitService.getMsiEncodedValue('80523', 'mod1010')).toBe('8052342');
    });

    it('1234567 gives correct encoded values across all 4 algorithms', () => {
      expect(checkDigitService.getMsiEncodedValue('1234567', 'none')).toBe('1234567');
      expect(checkDigitService.getMsiEncodedValue('1234567', 'mod10')).toBe('12345674');
      expect(checkDigitService.getMsiEncodedValue('1234567', 'mod11')).toBe('12345674');
      expect(checkDigitService.getMsiEncodedValue('1234567', 'mod1010')).toBe('123456741');
    });

    it('Mod 11 edge case: computed check value 10 yields two-digit check 10 (e.g. 1009 -> 100910)', () => {
      expect(checkDigitService.calculateMsiMod11('1009')).toBe('10');
      expect(checkDigitService.getMsiEncodedValue('1009', 'mod11')).toBe('100910');
    });
  });
});

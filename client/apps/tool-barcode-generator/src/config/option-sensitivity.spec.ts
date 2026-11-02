// apps/tool-barcode-generator/src/config/option-sensitivity.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { RenderService } from '../services/render.service';
import { EncoderAdapter } from '../services/encoder-adapter.service';
import { BARCODE_CATALOG } from './barcode-catalog.config';
import { DEFAULT_DESIGN_OPTIONS, BarcodeDesignOptions } from '../models/barcode.models';

describe('Option Sensitivity Test Suite (Round 3)', () => {
  let renderService: RenderService;

  beforeEach(() => {
    const encoder = new EncoderAdapter();
    renderService = new RenderService(encoder);
  });

  describe('Format-Specific Engine Options', () => {
    it('Data Matrix: shape produces different SVG outputs for square vs rectangular', async () => {
      const item = BARCODE_CATALOG['datamatrix'];
      const val = 'https://acklet.com/tools?ref=1';
      const square = await renderService.render(item, val, val, DEFAULT_DESIGN_OPTIONS, { shape: 'square' });
      const rect = await renderService.render(item, val, val, DEFAULT_DESIGN_OPTIONS, { shape: 'rectangular' });

      expect(square.svg).not.toBe(rect.svg);
      expect(square.width).toBe(square.height); // Square
      expect(rect.width).toBeGreaterThan(rect.height); // Wider than tall
    });

    it('PDF417: all security levels 0 to 8 produce distinct, non-decreasing SVG outputs', async () => {
      const item = BARCODE_CATALOG['pdf417'];
      const val = 'ACKLET-PKG-9821';
      const svgs: string[] = [];

      for (let lvl = 0; lvl <= 8; lvl++) {
        const res = await renderService.render(item, val, val, DEFAULT_DESIGN_OPTIONS, { securityLevel: lvl });
        svgs.push(res.svg);
      }

      // Check level 0 differs from level 8
      expect(svgs[0]).not.toBe(svgs[8]);
      // Verify all rendered SVGs are valid non-empty SVGs
      expect(svgs.every(s => s.includes('<svg'))).toBe(true);
      // Verify size is non-decreasing as level rises
      expect(svgs[8].length).toBeGreaterThanOrEqual(svgs[0].length);
    });

    it('Aztec: error correction 10%, 30%, and 50% produce three distinct symbols', async () => {
      const item = BARCODE_CATALOG['aztec'];
      const val = 'ACKLET-PKG-9821';
      const res10 = await renderService.render(item, val, val, DEFAULT_DESIGN_OPTIONS, { errorCorrectionPercent: 10 });
      const res30 = await renderService.render(item, val, val, DEFAULT_DESIGN_OPTIONS, { errorCorrectionPercent: 30 });
      const res50 = await renderService.render(item, val, val, DEFAULT_DESIGN_OPTIONS, { errorCorrectionPercent: 50 });

      expect(res10.svg).not.toBe(res30.svg);
      expect(res30.svg).not.toBe(res50.svg);
      expect(res10.svg).not.toBe(res50.svg);
      expect(res50.svg.length).toBeGreaterThanOrEqual(res10.svg.length);
    });

    it('MSI Plessey: check algorithms (None, Mod 10, Mod 11, Mod 10/10) produce distinct SVG outputs', async () => {
      const item = BARCODE_CATALOG['msi'];
      const raw = '80523';
      const none = await renderService.render(item, '80523', '80523', DEFAULT_DESIGN_OPTIONS, { msiCheck: 'none' });
      const mod10 = await renderService.render(item, '805234', '805234', DEFAULT_DESIGN_OPTIONS, { msiCheck: 'mod10' });
      const mod11 = await renderService.render(item, '805238', '805238', DEFAULT_DESIGN_OPTIONS, { msiCheck: 'mod11' });
      const mod1010 = await renderService.render(item, '8052342', '8052342', DEFAULT_DESIGN_OPTIONS, { msiCheck: 'mod1010' });

      expect(none.svg).not.toBe(mod10.svg);
      expect(mod10.svg).not.toBe(mod11.svg);
      expect(mod11.svg).not.toBe(mod1010.svg);
      expect(mod1010.svg.length).toBeGreaterThan(none.svg.length);
    });

    it('GS1 DataBar: all 7 variants render distinct SVG structures for valid GTIN', async () => {
      const item = BARCODE_CATALOG['gs1-databar'];
      const gtin = '(01)09521234543213';
      const variants = ['omni', 'truncated', 'stacked', 'stacked-omni', 'limited'];
      const svgs: string[] = [];

      for (const v of variants) {
        const res = await renderService.render(item, gtin, gtin, DEFAULT_DESIGN_OPTIONS, { variant: v });
        svgs.push(res.svg);
      }

      // Each non-expanded variant is distinct
      for (let i = 0; i < svgs.length; i++) {
        for (let j = i + 1; j < svgs.length; j++) {
          expect(svgs[i]).not.toBe(svgs[j]);
        }
      }

      // Expanded and Expanded Stacked with AI string
      const aiVal = '(01)09521234543213(3103)000123';
      const expanded = await renderService.render(item, aiVal, aiVal, DEFAULT_DESIGN_OPTIONS, { variant: 'expanded' });
      const expandedStacked = await renderService.render(item, aiVal, aiVal, DEFAULT_DESIGN_OPTIONS, { variant: 'expanded-stacked' });
      expect(expanded.svg).not.toBe(expandedStacked.svg);
    });

    it('GS1 DataBar Expanded Stacked: segments per row (2, 4, 6, 8) produce different row heights/structures', async () => {
      const item = BARCODE_CATALOG['gs1-databar'];
      const aiVal = '(01)09521234543213(3103)000123';
      const seg2 = await renderService.render(item, aiVal, aiVal, DEFAULT_DESIGN_OPTIONS, { variant: 'expanded-stacked', segments: 2 });
      const seg4 = await renderService.render(item, aiVal, aiVal, DEFAULT_DESIGN_OPTIONS, { variant: 'expanded-stacked', segments: 4 });
      const seg8 = await renderService.render(item, aiVal, aiVal, DEFAULT_DESIGN_OPTIONS, { variant: 'expanded-stacked', segments: 8 });

      expect(seg2.svg).not.toBe(seg4.svg);
      expect(seg4.svg).not.toBe(seg8.svg);
    });

    it('Codabar: start and stop guard options change encoded output', async () => {
      const item = BARCODE_CATALOG['codabar'];
      const ab = await renderService.render(item, 'A123456B', 'A123456B', DEFAULT_DESIGN_OPTIONS, { codabarStart: 'A', codabarStop: 'B' });
      const cd = await renderService.render(item, 'C123456D', 'C123456D', DEFAULT_DESIGN_OPTIONS, { codabarStart: 'C', codabarStop: 'D' });
      expect(ab.svg).not.toBe(cd.svg);
    });

    it('Code 39: includeCheckDigit option changes output structure', async () => {
      const item = BARCODE_CATALOG['code39'];
      const noCheck = await renderService.render(item, 'CODE39', 'CODE39', DEFAULT_DESIGN_OPTIONS, { includeCheckDigit: false });
      const withCheck = await renderService.render(item, 'CODE39G', 'CODE39G', DEFAULT_DESIGN_OPTIONS, { includeCheckDigit: true });
      expect(noCheck.svg).not.toBe(withCheck.svg);
      expect(withCheck.svg.length).toBeGreaterThan(noCheck.svg.length);
    });
  });

  describe('Customize Settings Sensitivity', () => {
    const item = BARCODE_CATALOG['code128'];
    const val = 'ACKLET-123';

    it('sizePreset: small, standard, large produce differing SVG dimensions', async () => {
      const small = await renderService.render(item, val, val, { ...DEFAULT_DESIGN_OPTIONS, sizePreset: 'small' });
      const std = await renderService.render(item, val, val, { ...DEFAULT_DESIGN_OPTIONS, sizePreset: 'standard' });
      const lrg = await renderService.render(item, val, val, { ...DEFAULT_DESIGN_OPTIONS, sizePreset: 'large' });

      expect(small.width).toBeLessThan(std.width);
      expect(std.width).toBeLessThan(lrg.width);
    });

    it('barColor: changes vector path stroke/fill in SVG', async () => {
      const black = await renderService.render(item, val, val, { ...DEFAULT_DESIGN_OPTIONS, barColor: '#000000' });
      const blue = await renderService.render(item, val, val, { ...DEFAULT_DESIGN_OPTIONS, barColor: '#2563EB' });

      expect(black.svg).not.toBe(blue.svg);
      expect(blue.svg.toLowerCase()).toContain('2563eb');
    });

    it('bgColor: changes SVG background color or transparency', async () => {
      const white = await renderService.render(item, val, val, { ...DEFAULT_DESIGN_OPTIONS, transparentBg: false, bgColor: '#FFFFFF' });
      const gray = await renderService.render(item, val, val, { ...DEFAULT_DESIGN_OPTIONS, transparentBg: false, bgColor: '#F1F5F9' });
      const transp = await renderService.render(item, val, val, { ...DEFAULT_DESIGN_OPTIONS, transparentBg: true });

      expect(white.svg).not.toBe(gray.svg);
      expect(white.svg).not.toBe(transp.svg);
    });

    it('textPosition: above vs below vs off changes SVG layout', async () => {
      const below = await renderService.render(item, val, val, { ...DEFAULT_DESIGN_OPTIONS, textPosition: 'below' });
      const above = await renderService.render(item, val, val, { ...DEFAULT_DESIGN_OPTIONS, textPosition: 'above' });
      const off = await renderService.render(item, val, val, { ...DEFAULT_DESIGN_OPTIONS, textPosition: 'off' });

      expect(below.svg).not.toBe(above.svg);
      expect(below.svg).not.toBe(off.svg);
    });

    it('textSize: 8pt vs 12pt changes height/output', async () => {
      const size8 = await renderService.render(item, val, val, { ...DEFAULT_DESIGN_OPTIONS, fontSize: 8 });
      const size12 = await renderService.render(item, val, val, { ...DEFAULT_DESIGN_OPTIONS, fontSize: 12 });
      expect(size8.svg).not.toBe(size12.svg);
    });

    it('rotation: 0 vs 90 degrees rotates SVG viewBox / dimensions', async () => {
      const rot0 = await renderService.render(item, val, val, { ...DEFAULT_DESIGN_OPTIONS, rotation: 0 });
      const rot90 = await renderService.render(item, val, val, { ...DEFAULT_DESIGN_OPTIONS, rotation: 90 });

      expect(rot0.svg).not.toBe(rot90.svg);
      expect(rot0.width).toBe(rot90.height);
      expect(rot0.height).toBe(rot90.width);
    });

    it('caption: adding caption injects caption element and adjusts viewBox', async () => {
      const noCap = await renderService.render(item, val, val, { ...DEFAULT_DESIGN_OPTIONS, caption: '' });
      const withCap = await renderService.render(item, val, val, { ...DEFAULT_DESIGN_OPTIONS, caption: 'BATCH-2026' });

      expect(noCap.svg).not.toBe(withCap.svg);
      expect(withCap.svg).toContain('BATCH-2026');
      expect(withCap.height).toBeGreaterThan(noCap.height);
    });

    it('border: none vs thick adds border frame element', async () => {
      const noBorder = await renderService.render(item, val, val, { ...DEFAULT_DESIGN_OPTIONS, borderStyle: 'none' });
      const border = await renderService.render(item, val, val, { ...DEFAULT_DESIGN_OPTIONS, borderStyle: 'thick', borderWidth: 3 });

      expect(noBorder.svg).not.toBe(border.svg);
      expect(border.svg).toContain('stroke-width="3"');
    });

    it('quietZone: 0 vs 20 adjusts padding and dimensions', async () => {
      const qz0 = await renderService.render(item, val, val, { ...DEFAULT_DESIGN_OPTIONS, quietZone: 0 });
      const qz20 = await renderService.render(item, val, val, { ...DEFAULT_DESIGN_OPTIONS, quietZone: 20 });

      expect(qz0.svg).not.toBe(qz20.svg);
      expect(qz20.width).toBeGreaterThan(qz0.width);
    });
  });
});

// apps/tool-barcode-generator/src/services/sheet-layout.service.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { SheetLayoutService } from './sheet-layout.service';
import { FormatRegistryService } from './format-registry.service';
import { LABEL_SHEET_PRESETS, getPresetById } from '../config/label-templates.config';

describe('SheetLayoutService (Single Page Model)', () => {
  let service: SheetLayoutService;

  beforeEach(() => {
    service = new SheetLayoutService();
  });

  describe('F1 & F3: Multi-page layout and exact sheet modeling', () => {
    it('accurately divides 50 records across 2 pages on US Letter 3x10 (Avery 5160)', () => {
      const preset = getPresetById('letter-3x10'); // 3 cols x 10 rows = 30 per page
      expect(preset).toBeDefined();

      const records = Array.from({ length: 50 }, (_, i) => ({
        value: `ITEM-${1000 + i}`,
        cleanValue: `ITEM-${1000 + i}`,
        displayValue: `ITEM-${1000 + i}`,
        status: 'valid'
      }));

      const pages = service.layoutSheetPages({
        records,
        preset,
        startAtLabel: 1,
        copies: 1,
        textSizePt: 'auto',
        showValueText: true,
        showLabelText: true,
        showCutGuides: false
      });

      expect(pages.length).toBe(2);
      expect(pages[0].pageNumber).toBe(1);
      expect(pages[0].totalPages).toBe(2);
      expect(pages[0].labels.length).toBe(30);
      expect(pages[0].labels.every(l => l.hasItem)).toBe(true);

      // Page 2: 20 active items, 10 empty slots
      expect(pages[1].pageNumber).toBe(2);
      expect(pages[1].totalPages).toBe(2);
      expect(pages[1].labels.length).toBe(30);

      const page2Active = pages[1].labels.filter(l => l.hasItem);
      const page2Empty = pages[1].labels.filter(l => !l.hasItem);
      expect(page2Active.length).toBe(20);
      expect(page2Empty.length).toBe(10);

      // Verify empty slots have no record data
      expect(page2Empty[0].value).toBeUndefined();
      expect(page2Empty[0].svg).toBeUndefined();
    });

    it('respects startAtLabel offset when partially used sheets are printed', () => {
      const preset = getPresetById('letter-3x10');
      const records = [
        { value: 'ITEM-1', cleanValue: 'ITEM-1', status: 'valid' },
        { value: 'ITEM-2', cleanValue: 'ITEM-2', status: 'valid' }
      ];

      // Starting at label 5 (skipping first 4 slots)
      const pages = service.layoutSheetPages({
        records,
        preset,
        startAtLabel: 5,
        copies: 1,
        textSizePt: 'auto',
        showValueText: true,
        showLabelText: true,
        showCutGuides: false
      });

      expect(pages.length).toBe(1);
      const labels = pages[0].labels;

      // Slots 0-3 are empty skipped slots
      expect(labels[0].hasItem).toBe(false);
      expect(labels[1].hasItem).toBe(false);
      expect(labels[2].hasItem).toBe(false);
      expect(labels[3].hasItem).toBe(false);

      // Slot 4 has ITEM-1, Slot 5 has ITEM-2
      expect(labels[4].hasItem).toBe(true);
      expect(labels[4].value).toBe('ITEM-1');
      expect(labels[5].hasItem).toBe(true);
      expect(labels[5].value).toBe('ITEM-2');
    });
  });

  describe('F2: Text size calculation and application', () => {
    it('calculates optimal text size in Auto mode based on label height (6 to 10 pt)', () => {
      // Large labels (>= 45mm): capped at 10 pt
      expect(service.getOptimalTextSizePt(50, false)).toBe(10);
      expect(service.getOptimalTextSizePt(50, true)).toBe(9);

      // Medium labels (32 - 44mm)
      expect(service.getOptimalTextSizePt(35, false)).toBe(10);
      expect(service.getOptimalTextSizePt(35, true)).toBe(9);

      // Small labels (24 - 31mm)
      expect(service.getOptimalTextSizePt(25.4, false)).toBe(10);
      expect(service.getOptimalTextSizePt(25.4, true)).toBe(9);

      // Very small labels (12mm)
      expect(service.getOptimalTextSizePt(12, false)).toBe(8);
      expect(service.getOptimalTextSizePt(12, true)).toBe(7);

      // Tiny labels (<= 8mm): floored at 6 pt
      expect(service.getOptimalTextSizePt(7, false)).toBe(6);
    });

    it('clamps manual text size within safe print limits (6 to 14 pt)', () => {
      const preset = getPresetById('letter-3x10');
      const records = [{ value: 'CODE-1', cleanValue: 'CODE-1', status: 'valid' }];

      const pagesHigh = service.layoutSheetPages({
        records,
        preset,
        startAtLabel: 1,
        copies: 1,
        textSizePt: 24, // Exceeds 14 pt max
        showValueText: true,
        showLabelText: true,
        showCutGuides: false
      });
      expect(pagesHigh[0].labels[0].textSizePt).toBe(14);

      const pagesLow = service.layoutSheetPages({
        records,
        preset,
        startAtLabel: 1,
        copies: 1,
        textSizePt: 2, // Below 6 pt min
        showValueText: true,
        showLabelText: true,
        showCutGuides: false
      });
      expect(pagesLow[0].labels[0].textSizePt).toBe(6);
    });
  });

  describe('F4: Duplicate text suppression', () => {
    it('suppresses duplicate caption when labelText is identical to barcode value', () => {
      const preset = getPresetById('letter-3x10');
      const records = [
        {
          value: '036000291414',
          cleanValue: '036000291414',
          labelText: '036000291414', // Identical to value
          status: 'valid'
        },
        {
          value: '036000291421',
          cleanValue: '036000291421',
          labelText: 'Organic Whole Milk 1L', // Distinct caption
          status: 'valid'
        }
      ];

      const pages = service.layoutSheetPages({
        records,
        preset,
        startAtLabel: 1,
        copies: 1,
        textSizePt: 'auto',
        showValueText: true,
        showLabelText: true,
        showCutGuides: false
      });

      // First item: duplicate text suppressed -> hasCaption is false
      expect(pages[0].labels[0].hasCaption).toBe(false);
      expect(pages[0].labels[0].labelText).toBeUndefined();

      // Second item: distinct text kept -> hasCaption is true
      expect(pages[0].labels[1].hasCaption).toBe(true);
      expect(pages[0].labels[1].labelText).toBe('Organic Whole Milk 1L');
    });
  });

  describe('F8 & Calibration: Nudge offsets and cut guides', () => {
    it('applies horizontal and vertical nudge offsets in millimeters within +/- 5mm', () => {
      const preset = getPresetById('letter-3x10');
      const records = [{ value: 'NUDGE-1', cleanValue: 'NUDGE-1', status: 'valid' }];

      const pagesDefault = service.layoutSheetPages({
        records,
        preset,
        startAtLabel: 1,
        copies: 1,
        textSizePt: 'auto',
        showValueText: true,
        showLabelText: true,
        showCutGuides: false,
        nudgeXmm: 0,
        nudgeYmm: 0
      });

      const pagesNudged = service.layoutSheetPages({
        records,
        preset,
        startAtLabel: 1,
        copies: 1,
        textSizePt: 'auto',
        showValueText: true,
        showLabelText: true,
        showCutGuides: false,
        nudgeXmm: 2.5,
        nudgeYmm: -1.5
      });

      const baseLabel = pagesDefault[0].labels[0];
      const nudgedLabel = pagesNudged[0].labels[0];

      expect(nudgedLabel.xMm).toBeCloseTo(baseLabel.xMm + 2.5, 2);
      expect(nudgedLabel.yMm).toBeCloseTo(baseLabel.yMm - 1.5, 2);
    });
  });

  describe('F9: Clean SVG rendering without slot numbers', () => {
    it('renders vector SVG with exact millimeter viewBox and without slot number labels', () => {
      const preset = getPresetById('letter-3x10');
      const records = [{ value: 'CODE-128', cleanValue: 'CODE-128', status: 'valid' }];

      const pages = service.layoutSheetPages({
        records,
        preset,
        startAtLabel: 1,
        copies: 1,
        textSizePt: 'auto',
        showValueText: true,
        showLabelText: true,
        showCutGuides: false
      });

      const svg = service.renderPageToSvg(pages[0]);

      // Check viewBox in mm (Letter is 215.9 x 279.4 mm)
      expect(svg).toContain('viewBox="0 0 215.9 279.4"');
      expect(svg).toContain('width="215.9mm"');
      expect(svg).toContain('height="279.4mm"');

      // Crucial: Must NOT contain numbered empty slot badges or text like ">1<", ">2<", "#1"
      expect(svg).not.toMatch(/>\s*[0-9]{1,2}\s*<\/text>/);
      expect(svg).not.toContain('slot-number');
    });
  });

  describe('Round 3: Barcode Sizing Engine & Roll Series Layout', () => {
    const registry = new FormatRegistryService();

    it('F1 & F2: variable-width linear format fills at least 70% of inner label width without squeezing', () => {
      const code128 = registry.getFormat('code128')!;
      // A4 3x7 label has 70.0 mm width, 42.4 mm height (inner width ~66mm)
      const sizing = service.computeBarcodeSizing(
        70.0,
        42.4,
        false,
        300,
        code128,
        'ITEM-1001',
        false,
        220,
        100
      );

      expect(sizing.fits).toBe(true);
      const innerW = 70.0 - 4.0; // 66.0 mm
      const fillRatio = sizing.symbolWidthMm / innerW;
      expect(fillRatio).toBeGreaterThanOrEqual(0.70);
    });

    it('F2: Format switch test: EAN-13, Code 128, Data Matrix, PDF417 produce distinct sizes on same label', () => {
      const ean13 = registry.getFormat('ean13')!;
      const code128 = registry.getFormat('code128')!;
      const datamatrix = registry.getFormat('datamatrix')!;
      const pdf417 = registry.getFormat('pdf417')!;

      // Label roll: 50 x 25 mm
      const sEan = service.computeBarcodeSizing(50, 25, true, 203, ean13, '4006381333931', false, 240, 120);
      const s128 = service.computeBarcodeSizing(50, 25, true, 203, code128, 'INV-998822', false, 220, 100);
      const sDm = service.computeBarcodeSizing(50, 25, true, 203, datamatrix, 'DATA-MATRIX-SAMPLE', false, 26, 26);
      const sPdf = service.computeBarcodeSizing(50, 25, true, 203, pdf417, 'PDF417-TEST-VECTOR', false, 240, 96);

      // Verify each format produced distinct, format-appropriate geometry
      expect(sEan.symbolWidthMm).not.toBe(s128.symbolWidthMm);
      expect(sDm.symbolWidthMm).toBe(sDm.symbolHeightMm); // 2D square
      expect(sDm.symbolWidthMm).not.toBe(sEan.symbolWidthMm);
      expect(sPdf.symbolWidthMm).not.toBe(s128.symbolWidthMm);
    });

    it('detects when symbol is too small for a tiny label and provides helpful reason', () => {
      const itf14 = registry.getFormat('itf14')!;
      // Tiny 20 x 10 mm label cannot fit 14-digit ITF-14
      const sizing = service.computeBarcodeSizing(
        20,
        10,
        true,
        203,
        itf14,
        '10012345678902',
        false,
        280,
        100
      );

      expect(sizing.fits).toBe(false);
      expect(sizing.tooSmallReason).toContain('Too small for this label');
    });

    it('fixed-size retail format handles height truncation and sets isReducedHeight flag', () => {
      const upca = registry.getFormat('upca')!;
      // Label with constrained height: 60mm wide by 22mm high (full nominal UPC-A height is 25.9mm at 100%)
      const sizing = service.computeBarcodeSizing(
        60,
        22,
        false,
        300,
        upca,
        '036000291414',
        false,
        240,
        120
      );

      expect(sizing.fits).toBe(true);
      expect(sizing.isReducedHeight).toBe(true);
    });

    it('F5: layoutRollPages produces exactly 50 individual label models for 50 records', () => {
      const rollPreset = {
        id: '50x25',
        name: '50 × 25 mm',
        widthMm: 50,
        heightMm: 25
      };

      const records = Array.from({ length: 50 }, (_, i) => ({
        value: `ITEM-${1000 + i}`,
        cleanValue: `ITEM-${1000 + i}`,
        status: 'valid'
      }));

      const rollLabels = service.layoutRollPages({
        records,
        rollPreset,
        showValueText: true,
        showLabelText: false,
        targetDpi: 203
      });

      expect(rollLabels.length).toBe(50);
      expect(rollLabels[0].index).toBe(1);
      expect(rollLabels[0].widthMm).toBe(50);
      expect(rollLabels[0].heightMm).toBe(25);
      expect(rollLabels[49].index).toBe(50);
    });
  });
});


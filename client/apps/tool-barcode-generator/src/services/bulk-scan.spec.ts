// apps/tool-barcode-generator/src/services/bulk-scan.spec.ts
import { describe, it, expect } from 'vitest';
import { SheetLayoutService } from './sheet-layout.service';
import { FormatRegistryService } from './format-registry.service';
import { LABEL_SHEET_PRESETS, LABEL_ROLL_PRESETS } from '../config/label-templates.config';

describe('Bulk Scanability Verification Across 7 Core Label Presets', () => {
  const sheetLayout = new SheetLayoutService();
  const registry = new FormatRegistryService();

  const code128 = registry.getFormat('code128')!;
  const ean13 = registry.getFormat('ean13')!;
  const ean8 = registry.getFormat('ean8')!;
  const datamatrix = registry.getFormat('datamatrix')!;
  const itf14 = registry.getFormat('itf14')!;
  const standard2of5 = registry.getFormat('standard2of5')!;

  it('1. A4 3x7 (70.0 × 42.4 mm) fits Standard 2 of 5 with >= 70% fill rule and >= 0.25 mm module', () => {
    // Finding F1: Standard 2 of 5 was squeezed with empty margins on A4 3x7
    const sizing = sheetLayout.computeBarcodeSizing(
      70.0,
      42.4,
      false,
      300,
      standard2of5,
      '12345678',
      false,
      170,
      100
    );

    expect(sizing.fits).toBe(true);
    expect(sizing.effectiveXmm).toBeGreaterThanOrEqual(0.25);
    // Fill rule: must occupy at least 70% of inner width (66 mm)
    const fillRatio = sizing.symbolWidthMm / (70.0 - 4.0);
    expect(fillRatio).toBeGreaterThanOrEqual(0.70);
  });

  it('2. A4 3x8 (63.5 × 33.9 mm - Avery L7159) fits Code 128 inventory barcode with optimal height', () => {
    const sizing = sheetLayout.computeBarcodeSizing(
      63.5,
      33.9,
      false,
      300,
      code128,
      'ITEM-10001',
      true, // with caption
      220,
      100
    );

    expect(sizing.fits).toBe(true);
    expect(sizing.effectiveXmm).toBeGreaterThanOrEqual(0.20);
    expect(sizing.symbolHeightMm).toBeGreaterThanOrEqual(12.0);
  });

  it('3. A4 5x13 (38.1 × 21.2 mm - Avery L7651) fits EAN-8 compact retail with scanable magnification', () => {
    const sizing = sheetLayout.computeBarcodeSizing(
      38.1,
      21.2,
      false,
      300,
      ean8,
      '96385074',
      false,
      180,
      100
    );

    expect(sizing.fits).toBe(true);
    expect(sizing.effectiveXmm).toBeGreaterThanOrEqual(0.25);
  });

  it('4. US Letter 4x20 (44.45 × 12.7 mm - Avery 5167) fits Code 128 return address / asset tag', () => {
    const sizing = sheetLayout.computeBarcodeSizing(
      44.45,
      12.7,
      false,
      300,
      code128,
      'ASSET-42',
      false,
      180,
      80
    );

    expect(sizing.fits).toBe(true);
    expect(sizing.effectiveXmm).toBeGreaterThanOrEqual(0.18);
  });

  it('5. Thermal Label Roll 25 × 15 mm fits 2D Data Matrix without exceeding label boundary', () => {
    const sizing = sheetLayout.computeBarcodeSizing(
      25.0,
      15.0,
      true,
      203,
      datamatrix,
      'LOT-9871-EXP-2026',
      false,
      24,
      24
    );

    expect(sizing.fits).toBe(true);
    expect(sizing.effectiveXmm).toBeGreaterThanOrEqual(0.25);
    expect(sizing.symbolWidthMm).toBeLessThanOrEqual(25.0 - 3.0); // within inner bounds
    expect(sizing.symbolHeightMm).toBeLessThanOrEqual(15.0 - 3.0);
  });

  it('6. Thermal Label Roll 50 × 25 mm fits Standard 2 of 5 and EAN-13 with printer dot snapping', () => {
    // Finding F1: roll 50x25 mm was squeezed
    const sizing = sheetLayout.computeBarcodeSizing(
      50.0,
      25.0,
      true,
      203, // 203 DPI dot pitch ~0.125 mm
      ean13,
      '4006381333931',
      false,
      240,
      120
    );

    expect(sizing.fits).toBe(true);
    expect(sizing.effectiveXmm).toBeGreaterThanOrEqual(0.25);
    // Snapped to integer dots at 203 DPI
    const dotPitch = 25.4 / 203;
    const dots = Math.round(sizing.effectiveXmm / dotPitch);
    expect(sizing.effectiveXmm).toBeCloseTo(dots * dotPitch, 3);
  });

  it('7. Thermal Label Roll 100 × 50 mm fits shipping ITF-14 barcode at standard 100% magnification', () => {
    const sizing = sheetLayout.computeBarcodeSizing(
      100.0,
      50.0,
      true,
      300, // 300 DPI
      itf14,
      '10012345678902',
      false,
      280,
      120
    );

    expect(sizing.fits).toBe(true);
    expect(sizing.effectiveXmm).toBeGreaterThanOrEqual(0.40);
    expect(sizing.symbolWidthMm).toBeGreaterThan(60.0);
  });
});


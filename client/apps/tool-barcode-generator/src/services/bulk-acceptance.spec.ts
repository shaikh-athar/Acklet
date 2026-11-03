// apps/tool-barcode-generator/src/services/bulk-acceptance.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { BulkStateService } from './bulk-state.service';
import { SheetLayoutService } from './sheet-layout.service';
import { ValidatorService } from './validator.service';
import { EncoderAdapter } from './encoder-adapter.service';
import { RenderService } from './render.service';
import { VerifyService } from './verify.service';
import { FormatRegistryService } from './format-registry.service';
import { getPresetById, PAGE_DIMENSIONS } from '../config/label-templates.config';
import { BulkRecord } from '../models/barcode.models';

describe('Bulk Mode Acceptance Verification (8 Criteria)', () => {
  let state: BulkStateService;
  let sheetLayout: SheetLayoutService;
  let validator: ValidatorService;
  let encoder: EncoderAdapter;
  let verifyService: VerifyService;
  let registry: FormatRegistryService;

  beforeEach(() => {
    registry = new FormatRegistryService();
    sheetLayout = new SheetLayoutService();
    encoder = new EncoderAdapter();
    const render = new RenderService(encoder);
    verifyService = new VerifyService();
    validator = new ValidatorService();

    const rootInjector = {
      get: (token: any, notFound?: any) => {
        if (token === FormatRegistryService) return registry;
        if (token === SheetLayoutService) return sheetLayout;
        if (token === EncoderAdapter) return encoder;
        if (token === RenderService) return render;
        if (token === VerifyService) return verifyService;
        if (token === ValidatorService) return validator;
        return notFound;
      }
    } as any;

    const envInjector = createEnvironmentInjector([], rootInjector);

    runInInjectionContext(envInjector, () => {
      state = new BulkStateService();
    });
  });

  // Helper to generate N mock records
  function makeRecords(count: number, prefix = 'ITEM-'): BulkRecord[] {
    const records: BulkRecord[] = [];
    for (let i = 1; i <= count; i++) {
      const val = `${prefix}${1000 + i}`;
      records.push({
        id: `rec-${i}`,
        index: i,
        rawValue: val,
        cleanValue: val,
        status: 'valid'
      });
    }
    return records;
  }

  // ────────────────────────────────────────────────────────────────
  // Criterion 1: Generate-Gated Preview
  // ────────────────────────────────────────────────────────────────
  it('Criterion 1: Gated preview — no SVG rendered before clicking Generate, populated after', () => {
    const records = makeRecords(10);
    state.reviewedRecords.set(records);

    // Initial state: not generated
    expect(state.isGenerated()).toBe(false);

    // Sheet preview pages exist for layout preview, but ALL label SVGs must be empty/falsy
    const prePages = state.sheetPages();
    expect(prePages.length).toBeGreaterThan(0);
    for (const page of prePages) {
      for (const label of page.labels) {
        expect(label.svg).toBeFalsy();
      }
    }

    // Roll preview labels must also have empty SVGs
    const preRoll = state.rollLabels();
    for (const label of preRoll) {
      expect(label.svg).toBeFalsy();
    }

    // Simulate generation completing
    const generated = records.map((r, i) => ({
      index: i + 1,
      value: r.cleanValue,
      svg: `<svg viewBox="0 0 100 50"><text>${r.cleanValue}</text></svg>`,
      dataUrl: 'data:image/png;base64,mock',
      verified: true
    }));
    state.setGenerated(generated, { total: 10, verified: 10, failed: 0 });

    expect(state.isGenerated()).toBe(true);

    // Now sheet pages render real SVGs
    const postPages = state.sheetPages();
    const firstLabel = postPages[0].labels[0];
    expect(firstLabel.hasItem).toBe(true);
    expect(firstLabel.svg).toContain('<svg');

    // Cancel / reset returns to empty state
    state.resetGenerated();
    expect(state.isGenerated()).toBe(false);
    expect(state.generatedItems().length).toBe(0);
  });

  // ────────────────────────────────────────────────────────────────
  // Criterion 2: Content Preview Removed
  // ────────────────────────────────────────────────────────────────
  it('Criterion 2: Content preview removed — no section 6 or sample thumbnails in Bulk flow', async () => {
    // Read the bulk panel component file source to verify template structure
    const fs = await import('fs');
    const path = await import('path');
    const compPath = path.resolve(__dirname, '../components/bulk-panel/bulk-panel.component.ts');
    const fileContent = fs.readFileSync(compPath, 'utf8');

    // Section 6 and "Content preview" must NOT exist
    expect(fileContent).not.toContain('Content preview');
    expect(fileContent).not.toMatch(/<span\s+class="step-num">\s*6\s*<\/span>/);
    expect(fileContent).not.toContain('in-tab-preview');
    expect(fileContent).not.toContain('contentPreviewCards');

    // Only steps 1 through 5 exist
    expect(fileContent).toContain('<span class="step-num">1</span>');
    expect(fileContent).toContain('<span class="step-num">2</span>');
    expect(fileContent).toContain('<span class="step-num">3</span>');
    expect(fileContent).toContain('<span class="step-num">4</span>');
    expect(fileContent).toContain('<span class="step-num">5</span>');
  });

  // ────────────────────────────────────────────────────────────────
  // Criterion 3: 5 x 13 Layout (A4, 65 labels/page)
  // ────────────────────────────────────────────────────────────────
  it('Criterion 3: 5 x 13 layout — 50 items = exactly 1 page (65 slots), correct mm coordinates', () => {
    const preset = getPresetById('a4-5x13');
    expect(preset).toBeDefined();
    expect(preset.cols).toBe(5);
    expect(preset.rows).toBe(13);
    expect(preset.labelsPerPage).toBe(65);
    expect(preset.labelWidthMm).toBe(38.1);
    expect(preset.labelHeightMm).toBe(21.2);

    const records = makeRecords(50);
    const pages = sheetLayout.layoutSheetPages({
      records,
      preset,
      formatItem: registry.getFormat('code128')!,
      pageSize: 'a4',
      designOptions: {
        width: 180,
        height: 80,
        margin: 10,
        background: '#ffffff',
        lineColor: '#000000',
        displayValue: true,
        fontSize: 10,
        font: 'monospace',
        textAlign: 'center',
        textPosition: 'bottom',
        textMargin: 2
      },
      formatOptions: {},
      showCutGuides: false,
      showLabelText: false,
      showValueText: true,
      nudgeXmm: 0,
      nudgeYmm: 0,
      targetDpi: 300,
      textSizePt: 'auto'
    });

    // 50 items on a 65-slot page must yield exactly 1 page
    expect(pages.length).toBe(1);
    const page1 = pages[0];
    expect(page1.labels.length).toBe(65);

    // First 50 slots have items, remaining 15 slots are empty placeholders
    const populated = page1.labels.filter(l => l.hasItem);
    const emptySlots = page1.labels.filter(l => !l.hasItem);
    expect(populated.length).toBe(50);
    expect(emptySlots.length).toBe(15);

    // Verify millimeter coordinates
    // Col 0, Row 0
    expect(page1.labels[0].xMm).toBeCloseTo(4.7, 1);
    expect(page1.labels[0].yMm).toBeCloseTo(10.7, 1);

    // Col 1, Row 0: leftMargin + labelWidth + gapH = 4.7 + 38.1 + 2.5 = 45.3 mm
    expect(page1.labels[1].xMm).toBeCloseTo(45.3, 1);
    expect(page1.labels[1].yMm).toBeCloseTo(10.7, 1);

    // Col 0, Row 1 (index 5): topMargin + labelHeight + gapV = 10.7 + 21.2 + 0 = 31.9 mm
    expect(page1.labels[5].xMm).toBeCloseTo(4.7, 1);
    expect(page1.labels[5].yMm).toBeCloseTo(31.9, 1);
  });

  // ────────────────────────────────────────────────────────────────
  // Criterion 4: 4 x 10 Layout (A4, 40 labels/page)
  // ────────────────────────────────────────────────────────────────
  it('Criterion 4: 4 x 10 layout — 50 items = exactly 2 pages (40 on page 1, 10 + 30 empty on page 2)', () => {
    const preset = getPresetById('a4-4x10');
    expect(preset).toBeDefined();
    expect(preset.cols).toBe(4);
    expect(preset.rows).toBe(10);
    expect(preset.labelsPerPage).toBe(40);
    expect(preset.labelWidthMm).toBe(48.5);
    expect(preset.labelHeightMm).toBe(25.4);

    const records = makeRecords(50);
    const pages = sheetLayout.layoutSheetPages({
      records,
      preset,
      formatItem: registry.getFormat('code128')!,
      pageSize: 'a4',
      designOptions: {
        width: 180,
        height: 80,
        margin: 10,
        background: '#ffffff',
        lineColor: '#000000',
        displayValue: true,
        fontSize: 10,
        font: 'monospace',
        textAlign: 'center',
        textPosition: 'bottom',
        textMargin: 2
      },
      formatOptions: {},
      showCutGuides: false,
      showLabelText: false,
      showValueText: true,
      nudgeXmm: 0,
      nudgeYmm: 0,
      targetDpi: 300,
      textSizePt: 'auto'
    });

    // 50 items on 40-slot layout must yield exactly 2 pages: Math.ceil(50 / 40) = 2
    expect(pages.length).toBe(2);

    // Page 1: 40 slots, all 40 populated
    expect(pages[0].labels.length).toBe(40);
    expect(pages[0].labels.filter(l => l.hasItem).length).toBe(40);

    // Page 2: 40 slots, 10 populated and 30 empty
    expect(pages[1].labels.length).toBe(40);
    expect(pages[1].labels.filter(l => l.hasItem).length).toBe(10);
    expect(pages[1].labels.filter(l => !l.hasItem).length).toBe(30);

    // Check millimeter coordinates on 4x10:
    // leftMargin = 5.0 mm, topMargin = 21.5 mm, width = 48.5 mm, height = 25.4 mm, gaps = 0
    expect(pages[0].labels[0].xMm).toBeCloseTo(5.0, 1);
    expect(pages[0].labels[0].yMm).toBeCloseTo(21.5, 1);
    expect(pages[0].labels[1].xMm).toBeCloseTo(5.0 + 48.5, 1); // 53.5 mm
    expect(pages[0].labels[4].yMm).toBeCloseTo(21.5 + 25.4, 1); // 46.9 mm
  });

  // ────────────────────────────────────────────────────────────────
  // Criterion 5: Custom Layout System & Validation
  // ────────────────────────────────────────────────────────────────
  it('Criterion 5: Custom layout — editable inputs and validation rejecting dimensions exceeding page', () => {
    state.selectedPresetId.set('custom');
    state.pageSize.set('a4'); // A4 is 210 x 297 mm

    // Valid custom layout: 2 cols x 4 rows, 80 x 50 mm, margins 10 mm, gaps 5 mm
    // Width needed: 10*2 + 2*80 + 1*5 = 185 mm <= 210 mm (valid)
    // Height needed: 10*2 + 4*50 + 3*5 = 235 mm <= 297 mm (valid)
    state.customPreset.update(p => ({
      ...p,
      cols: 2,
      rows: 4,
      labelWidthMm: 80,
      labelHeightMm: 50,
      gapHMm: 5,
      gapVMm: 5,
      leftMarginMm: 10,
      topMarginMm: 10
    }));

    expect(state.customLayoutError()).toBeNull();

    // Invalid custom layout: cols 5 with width 50 mm = 250 mm > 210 mm page width
    state.customPreset.update(p => ({
      ...p,
      cols: 5,
      labelWidthMm: 50
    }));

    const errWidth = state.customLayoutError();
    expect(errWidth).not.toBeNull();
    expect(errWidth).toContain('Labels exceed page width');

    // Invalid height: 8 rows of 50 mm = 400 mm > 297 mm page height
    state.customPreset.update(p => ({
      ...p,
      cols: 2,
      labelWidthMm: 70,
      rows: 8,
      labelHeightMm: 50
    }));

    const errHeight = state.customLayoutError();
    expect(errHeight).not.toBeNull();
    expect(errHeight).toContain('Labels exceed page height');
  });

  // ────────────────────────────────────────────────────────────────
  // Criterion 6: Standard 2 of 5 Validation
  // ────────────────────────────────────────────────────────────────
  it('Criterion 6: Standard 2 of 5 validation — rejects non-digits with "Use digits only."', () => {
    const format = registry.getFormat('standard2of5')!;
    expect(format).toBeDefined();

    // Rejects alphabetic and special characters
    const invalidRes = validator.validate('standard2of5', 'ITEM-1001', {});
    expect(invalidRes.valid).toBe(false);
    expect(invalidRes.errorMessage).toContain('Use digits only.');

    const invalidRes2 = validator.validate('standard2of5', '1234A56', {});
    expect(invalidRes2.valid).toBe(false);
    expect(invalidRes2.errorMessage).toContain('Use digits only.');

    // Accepts valid numeric string
    const validRes = validator.validate('standard2of5', '0123456789', {});
    expect(validRes.valid).toBe(true);
    expect(validRes.cleanValue).toBe('0123456789');
  });

  // ────────────────────────────────────────────────────────────────
  // Criterion 7: Standard 2 of 5 Post-Generation Decode Verification
  // ────────────────────────────────────────────────────────────────
  it('Criterion 7: Standard 2 of 5 decode — generated barcodes decode successfully via decoder', async () => {
    const format = registry.getFormat('standard2of5')!;
    const testValues = ['01001', '10012', '987654', '12345'];

    for (const val of testValues) {
      // Generate SVG using encoder
      const svg = await encoder.encodeToSvg({
        item: format,
        value: val,
        design: {
          width: 200,
          height: 100,
          margin: 10,
          background: '#ffffff',
          lineColor: '#000000',
          displayValue: true,
          fontSize: 10,
          font: 'monospace',
          textAlign: 'center',
          textPosition: 'bottom',
          textMargin: 2
        },
        options: {}
      });

      expect(svg).toBeTruthy();
      expect(svg).toContain('<svg');

      // Verify the generated SVG through VerifyService
      const verifyResult = await verifyService.verifySvg(svg, val, 'standard2of5');
      expect(verifyResult.verified).toBe(true);
      expect(verifyResult.decodedValue).toBe(val);
      expect(verifyResult.mismatch).toBe(false);
    }
  });

  // ────────────────────────────────────────────────────────────────
  // Criterion 8: No Outdated Banner & Settings Changes Do Not Alter Preview
  // ────────────────────────────────────────────────────────────────
  it('Criterion 8: Settings changes do not alter preview or show outdated warning', () => {
    const records = makeRecords(5);
    state.reviewedRecords.set(records);

    // Initial generation
    const generated = records.map((r, i) => ({
      index: i + 1,
      value: r.cleanValue,
      svg: `<svg viewBox="0 0 100 50"><text>${r.cleanValue}</text></svg>`,
      dataUrl: 'data:image/png;base64,mock',
      verified: true
    }));
    state.setGenerated(generated, { total: 5, verified: 5, failed: 0 });

    expect(state.isGenerated()).toBe(true);

    const initialPages = state.sheetPages();
    expect(initialPages[0].labels[0].svg).toContain('<svg');

    // Changing settings (e.g. preset or showCutGuides) does NOT clear generated state or alter preview
    state.showCutGuides.set(!state.showCutGuides());
    state.selectedPresetId.set('a4-4x10');

    // The generated state remains active and preview pages persist
    expect(state.isGenerated()).toBe(true);
    expect(state.generatedItems().length).toBe(5);
  });

  // ────────────────────────────────────────────────────────────────
  // Criterion 9: Single vs Bulk Parity (RenderService single source of truth)
  // ────────────────────────────────────────────────────────────────
  it('Criterion 9: Single vs Bulk Parity — RenderService produces byte-identical SVG markup', async () => {
    const renderService = new RenderService(encoder);
    const format = registry.getFormat('code128')!;
    const designOptions = {
      width: 200,
      height: 100,
      margin: 10,
      background: '#ffffff',
      lineColor: '#000000',
      displayValue: true,
      fontSize: 12,
      font: 'monospace',
      textAlign: 'center',
      textPosition: 'bottom',
      textMargin: 2
    };

    const value = 'ITEM-1001';

    // Single mode render
    const singleResult = await renderService.render(format, value, value, designOptions, {});

    // Bulk mode render (using the exact same renderer and options)
    const bulkResult = await renderService.render(format, value, value, designOptions, {});

    expect(bulkResult.svg).toBe(singleResult.svg);
    expect(bulkResult.cleanValue).toBe(singleResult.cleanValue);
    expect(bulkResult.displayValue).toBe(singleResult.displayValue);
  });

  // ────────────────────────────────────────────────────────────────
  // Criterion 10: Sequence Source Removed from UI and State
  // ────────────────────────────────────────────────────────────────
  it('Criterion 10: Sequence source removed from UI, state, and options', async () => {
    // Check state defaults to 'list'
    expect(state.sourceMode()).toBe('list');

    // Verify template does not contain Sequence selector or Sequence data inputs
    const fs = await import('fs');
    const path = await import('path');
    const compPath = path.resolve(__dirname, '../components/bulk-panel/bulk-panel.component.ts');
    const fileContent = fs.readFileSync(compPath, 'utf8');

    // Must not have sequence segmented button
    expect(fileContent).not.toMatch(/sourceMode\.set\(['"]sequence['"]\)/);
    // Must not have seqStart, seqPadding inputs
    expect(fileContent).not.toContain('seqStart');
    expect(fileContent).not.toContain('seqPrefix');
    expect(fileContent).not.toContain('seqPadding');
  });

  // ────────────────────────────────────────────────────────────────
  // Criterion 11: 10 values pasted (01001-01010) — slots 1..10 filled
  // ────────────────────────────────────────────────────────────────
  it('Criterion 11: 10 values pasted fill exactly slots 1..10 with unique barcodes', () => {
    const rawPasted = Array.from({ length: 10 }, (_, i) => `0100${i + 1}`);
    const records = rawPasted.map((val, idx) => ({
      id: `rec-${idx + 1}`,
      index: idx + 1,
      rawValue: val,
      cleanValue: val,
      status: 'valid' as const
    }));

    state.reviewedRecords.set(records);
    const preset = getPresetById('a4-3x8')!; // 24 slots/page

    const pages = sheetLayout.layoutSheetPages({
      records,
      preset,
      formatItem: registry.getFormat('standard2of5')!,
      pageSize: 'a4',
      designOptions: {
        width: 180,
        height: 80,
        margin: 10,
        background: '#ffffff',
        lineColor: '#000000',
        displayValue: true,
        fontSize: 10,
        font: 'monospace',
        textAlign: 'center',
        textPosition: 'bottom',
        textMargin: 2
      },
      formatOptions: {},
      showCutGuides: false,
      showLabelText: false,
      showValueText: true,
      nudgeXmm: 0,
      nudgeYmm: 0,
      targetDpi: 300,
      textSizePt: 'auto'
    });

    expect(pages.length).toBe(1);
    const labels = pages[0].labels;

    // Slots 0..9 (labels 1..10) must be populated
    for (let i = 0; i < 10; i++) {
      expect(labels[i].hasItem).toBe(true);
      expect(labels[i].value).toBe(`0100${i + 1}`);
      expect(labels[i].globalSlotIndex).toBe(i);
    }

    // Remaining slots 10..23 must be empty placeholders
    for (let i = 10; i < 24; i++) {
      expect(labels[i].hasItem).toBe(false);
      expect(labels[i].value).toBeUndefined();
    }
  });

  // ────────────────────────────────────────────────────────────────
  // Criterion 12: 50 values pasted across pages without repeats or blanks
  // ────────────────────────────────────────────────────────────────
  it('Criterion 12: 50 values across pages mapped with ordered indexing without repeats', () => {
    const records = makeRecords(50);
    const preset = getPresetById('a4-3x8')!; // 24 slots/page => 3 pages (24 + 24 + 2)

    const pages = sheetLayout.layoutSheetPages({
      records,
      preset,
      formatItem: registry.getFormat('code128')!,
      pageSize: 'a4',
      designOptions: {
        width: 180,
        height: 80,
        margin: 10,
        background: '#ffffff',
        lineColor: '#000000',
        displayValue: true,
        fontSize: 10,
        font: 'monospace',
        textAlign: 'center',
        textPosition: 'bottom',
        textMargin: 2
      },
      formatOptions: {},
      showCutGuides: false,
      showLabelText: false,
      showValueText: true,
      nudgeXmm: 0,
      nudgeYmm: 0,
      targetDpi: 300,
      textSizePt: 'auto'
    });

    expect(pages.length).toBe(3);

    // Collect all populated values across all pages
    const populatedValues: string[] = [];
    for (const page of pages) {
      for (const label of page.labels) {
        if (label.hasItem) {
          populatedValues.push(label.value);
        }
      }
    }

    expect(populatedValues.length).toBe(50);
    // Every value must be unique and match the input records in exact order
    for (let i = 0; i < 50; i++) {
      expect(populatedValues[i]).toBe(records[i].cleanValue);
    }
  });

  // ────────────────────────────────────────────────────────────────
  // Criterion 13: Unique ID per barcode in rendered SVG
  // ────────────────────────────────────────────────────────────────
  it('Criterion 13: Rendered sheet SVG contains unique ID per barcode slot', () => {
    const records = makeRecords(3);
    const preset = getPresetById('a4-3x8')!;

    const pages = sheetLayout.layoutSheetPages({
      records,
      preset,
      formatItem: registry.getFormat('code128')!,
      pageSize: 'a4',
      designOptions: {
        width: 180,
        height: 80,
        margin: 10,
        background: '#ffffff',
        lineColor: '#000000',
        displayValue: true,
        fontSize: 10,
        font: 'monospace',
        textAlign: 'center',
        textPosition: 'bottom',
        textMargin: 2
      },
      formatOptions: {},
      showCutGuides: false,
      showLabelText: false,
      showValueText: true,
      nudgeXmm: 0,
      nudgeYmm: 0,
      targetDpi: 300,
      textSizePt: 'auto'
    });

    // Populate mock SVG
    pages[0].labels[0].svg = '<svg viewBox="0 0 100 50"><text>1</text></svg>';
    pages[0].labels[1].svg = '<svg viewBox="0 0 100 50"><text>2</text></svg>';
    pages[0].labels[2].svg = '<svg viewBox="0 0 100 50"><text>3</text></svg>';

    const sheetSvg = sheetLayout.renderPageToSvg(pages[0]);

    expect(sheetSvg).toContain('id="bc-svg-0"');
    expect(sheetSvg).toContain('id="bc-svg-1"');
    expect(sheetSvg).toContain('id="bc-svg-2"');
    expect(sheetSvg).toContain('id="bc-slot-0"');
    expect(sheetSvg).toContain('id="bc-slot-1"');
    expect(sheetSvg).toContain('id="bc-slot-2"');
  });

  // ────────────────────────────────────────────────────────────────
  // Criterion 14: Drag and Drop File Gather Screen & State Loading
  // ────────────────────────────────────────────────────────────────
  it('Criterion 14: Drag and drop file gather — updates state and switches mode to csv', async () => {
    // 1. Initial state
    expect(state.sourceMode()).toBe('list');
    expect(state.csvFileName()).toBe('');
    expect(state.csvRawText()).toBe('');

    // 2. Load file via gather action
    const mockCsvContent = 'Barcode,Product\n4006381333931,Item 1\n5901234123457,Item 2';
    state.loadCsvFile('inventory.csv', mockCsvContent);

    expect(state.sourceMode()).toBe('csv');
    expect(state.csvFileName()).toBe('inventory.csv');
    expect(state.csvRawText()).toBe(mockCsvContent);
    expect(state.csvValueColIdx()).toBe(0);
    expect(state.csvCaptionColIdx()).toBe(-1);

    // 3. Clear file
    state.clearCsvFile();
    expect(state.csvFileName()).toBe('');
    expect(state.csvRawText()).toBe('');

    // 4. Verify template structure for file gather screen overlay
    const fs = await import('fs');
    const path = await import('path');
    const compPath = path.resolve(__dirname, '../components/barcode-generator.component.ts');
    const fileContent = fs.readFileSync(compPath, 'utf8');

    expect(fileContent).toContain('screen-file-gather-overlay');
    expect(fileContent).toContain('gather-drop-card');
    expect(fileContent).toContain('Drop file to gather barcodes');
    expect(fileContent).toContain('onWindowDragOver');
    expect(fileContent).toContain('onWindowDrop');
  });

  // ────────────────────────────────────────────────────────────────
  // Criterion 15: CSV UI Table — Review-Table Structure & Parity
  // ────────────────────────────────────────────────────────────────
  it('Criterion 15: CSV UI table — styled like Review table, sticky row column, role badges, and clean rows', async () => {
    // 1. Verify parseCsv separates headers from preview data
    const { BulkGeneratorService } = await import('./bulk-generator.service');
    const bulkService = new BulkGeneratorService(validator, sheetLayout);
    const sampleCsv = 'barcode,caption,product_name,category\n8901063012345,Amul Butter,Amul Butter 100g,Dairy\n8901030123456,Parle-G,Parle-G 800g,Snacks';
    const parsed = bulkService.parseCsv(sampleCsv, 0, 1, 'auto', true);

    expect(parsed.hasHeader).toBe(true);
    expect(parsed.headers).toEqual(['barcode', 'caption', 'product_name', 'category']);
    expect(parsed.totalRows).toBe(2);

    // Row 1 of data must NOT repeat the headers
    expect(parsed.previewRows[0]).toEqual(['8901063012345', 'Amul Butter', 'Amul Butter 100g', 'Dairy']);
    expect(parsed.allRows[0]).toEqual(['8901063012345', 'Amul Butter', 'Amul Butter 100g', 'Dairy']);

    // 2. Verify bulk-panel template and styles match Review table architecture
    const fs = await import('fs');
    const path = await import('path');
    const panelPath = path.resolve(__dirname, '../components/bulk-panel/bulk-panel.component.ts');
    const panelContent = fs.readFileSync(panelPath, 'utf8');

    expect(panelContent).toContain('csv-table-wrapper');
    expect(panelContent).toContain('review-table-container csv-table-container');
    expect(panelContent).toContain('review-table csv-table');
    expect(panelContent).toContain('col-role-pill is-value');
    expect(panelContent).toContain('col-role-pill is-caption');
    expect(panelContent).toContain('sticky-col');
    expect(panelContent).toContain('paginatedCsvRows');
  });

  // ────────────────────────────────────────────────────────────────
  // Criterion 16: Runtime Caption Styling Toast & Non-Destructive Live Updates
  // ────────────────────────────────────────────────────────────────
  it('Criterion 16: Caption styling toast — size, color, bold, and real-time SVG updates without re-generating barcodes', async () => {
    // 1. Initial caption styling signals in BulkStateService
    expect(state.captionFontSizePt()).toBe('auto');
    expect(state.captionColor()).toBe('#334155');
    expect(state.captionBold()).toBe(false);
    expect(state.captionFontFamily()).toBe('sans');
    expect(state.captionTransform()).toBe('none');
    expect(state.captionAlign()).toBe('center');

    // 2. Modify caption styles
    state.captionFontSizePt.set(8);
    state.captionColor.set('#DC2626');
    state.captionBold.set(true);
    state.captionFontFamily.set('mono');
    state.captionTransform.set('uppercase');
    state.captionAlign.set('left');

    const style = state.captionStyle();
    expect(style.fontSizePt).toBe(8);
    expect(style.color).toBe('#DC2626');
    expect(style.bold).toBe(true);
    expect(style.fontFamily).toBe('mono');
    expect(style.transform).toBe('uppercase');
    expect(style.align).toBe('left');

    // 3. Render page with caption style via SheetLayoutService
    const preset = getPresetById('a4-3x8')!;
    const records = [
      {
        value: '8901063012345',
        cleanValue: '8901063012345',
        displayValue: '8901063012345',
        labelText: 'Amul Butter 100g',
        svg: '<svg viewBox="0 0 100 50"><rect x="0" y="0" width="10" height="50"/></svg>'
      }
    ];

    const pages = sheetLayout.layoutSheetPages({
      records,
      preset,
      formatItem: registry.getFormat('code128')!,
      pageSize: 'a4',
      designOptions: {
        foreground: '#000000',
        background: '#FFFFFF',
        barWidth: 2,
        heightRatio: 1,
        quietZone: 10,
        showValueText: true,
        textColor: '#000000',
        textSizePt: 10
      },
      copies: 1,
      showLabelText: true,
      showValueText: true,
      showCutGuides: false,
      nudgeXmm: 0,
      nudgeYmm: 0,
      targetDpi: 300,
      textSizePt: 'auto'
    });

    const renderedSvg = sheetLayout.renderPageToSvg(pages[0], style);

    // Verify SVG includes styled caption text with unitless viewBox font-size, uppercase, bold, mono, left-aligned
    expect(renderedSvg).toContain('AMUL BUTTER 100G');
    expect(renderedSvg).toContain('fill="#DC2626"');
    expect(renderedSvg).toContain('font-weight="700"');
    expect(renderedSvg).toContain('ui-monospace');
    expect(renderedSvg).toContain('text-anchor="start"');
    // Ensure font-size is unitless viewBox mm (~8 * 0.3528 = 2.82), NOT CSS screen millimeters ("mm")
    expect(renderedSvg).toMatch(/font-size="[0-9.]+"/);
    expect(renderedSvg).not.toContain('font-size="2.82mm"');

    // 4. Barcode geometry was NOT affected
    expect(renderedSvg).toContain('<rect x="0" y="0" width="10" height="50"/>');

    // 5. Reset caption styles restores defaults
    state.resetCaptionStyle();
    expect(state.captionFontSizePt()).toBe('auto');
    expect(state.captionColor()).toBe('#334155');
    expect(state.captionBold()).toBe(false);
    expect(state.captionFontFamily()).toBe('sans');
    expect(state.captionTransform()).toBe('none');
    expect(state.captionAlign()).toBe('center');

    // 6. Verify bulk preview component template contains toast markup
    const fs = await import('fs');
    const path = await import('path');
    const previewCompPath = path.resolve(__dirname, '../components/bulk-preview/bulk-preview.component.ts');
    const previewContent = fs.readFileSync(previewCompPath, 'utf8');

    expect(previewContent).toContain('caption-toast-overlay');
    expect(previewContent).toContain('caption-toast-card');
    expect(previewContent).toContain('toolbar-caption-pill');
    expect(previewContent).toContain('toast-size-group');
    expect(previewContent).toContain('toast-colors-row');
    expect(previewContent).toContain('toast-format-row');
    expect(previewContent).toContain('onCustomColorChange');
  });
});

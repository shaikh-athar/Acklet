// apps/tool-barcode-generator/src/services/pdf-builder.service.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { PdfBuilderService } from './pdf-builder.service';
import { getPresetById, getRollPresetById } from '../config/label-templates.config';

describe('PdfBuilderService - Vector PDF Generation', () => {
  let service: PdfBuilderService;

  beforeEach(() => {
    service = new PdfBuilderService();
  });

  it('generates valid PDF 1.4 binary document for label sheets', () => {
    const preset = getPresetById('a4-3x8'); // 24 labels per page
    const sampleItems = Array.from({ length: 25 }, (_, i) => ({
      value: `ITEM-${1000 + i}`,
      displayValue: `ITEM-${1000 + i}`,
      labelText: `Product ${i + 1}`,
      svg: '<svg viewBox="0 0 100 50"><path stroke="#000000" stroke-width="2" d="M10 40L10 10M20 40L20 10" /></svg>'
    }));

    const pdfBytes = service.generateLabelSheetPdf({
      items: sampleItems,
      preset,
      startAtLabel: 1,
      showCutGuides: true,
      showLabelText: true
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    const pdfText = new TextDecoder('utf-8').decode(pdfBytes);

    // Verify PDF structure
    expect(pdfText.startsWith('%PDF-1.4')).toBe(true);
    expect(pdfText).toContain('/Type /Catalog');
    expect(pdfText).toContain('/Type /Pages');
    // 25 items on 24-up sheet gives exactly 2 pages
    expect(pdfText).toContain('/Count 2');
    expect(pdfText).toContain('%%EOF');
  });

  it('reserves empty slots when startAtLabel is greater than 1', () => {
    const preset = getPresetById('a4-3x8');
    const sampleItems = [
      {
        value: 'OFFSET-1',
        displayValue: 'OFFSET-1',
        svg: '<svg viewBox="0 0 100 50"><path d="M0 0L10 10" /></svg>'
      }
    ];

    const pdfBytes = service.generateLabelSheetPdf({
      items: sampleItems,
      preset,
      startAtLabel: 6, // starts at slot 6, skipping slots 1-5
      showCutGuides: true
    });

    const pdfText = new TextDecoder('utf-8').decode(pdfBytes);
    expect(pdfText.startsWith('%PDF-1.4')).toBe(true);
    expect(pdfText).toContain('/Count 1');
  });

  it('generates valid multi-page PDF for label rolls', () => {
    const rollPreset = getRollPresetById('50x25');
    const items = [
      {
        value: 'ROLL-1',
        displayValue: 'ROLL-1',
        labelText: 'Bin 42',
        svg: '<svg viewBox="0 0 100 50"><path stroke="#000000" stroke-width="2" d="M5 40L5 5" /></svg>'
      },
      {
        value: 'ROLL-2',
        displayValue: 'ROLL-2',
        labelText: 'Bin 43',
        svg: '<svg viewBox="0 0 100 50"><path stroke="#000000" stroke-width="2" d="M5 40L5 5" /></svg>'
      }
    ];

    const pdfBytes = service.generateLabelRollPdf({
      items,
      rollPreset,
      showLabelText: true,
      copies: 1
    });

    const pdfText = new TextDecoder('utf-8').decode(pdfBytes);
    expect(pdfText.startsWith('%PDF-1.4')).toBe(true);
    expect(pdfText).toContain('/Count 2'); // 2 items = 2 roll pages
  });
});


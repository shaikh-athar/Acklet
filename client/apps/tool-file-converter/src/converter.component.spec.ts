// apps/tool-file-converter/src/converter.component.spec.ts
import { describe, it, expect } from 'vitest';
import { TOOL_REGISTRY, CONVERTER_MANIFEST } from '../../../packages/tool-registry/src';
import { DOCUMENT_CONVERTER_CONFIG, computeCommonTestedTargets, getTargetFormatMeta } from './converter.config';

describe('File Converter Tool Identity & Registry Verification', () => {
  it('should have a registered file-converter tool manifest', () => {
    expect(CONVERTER_MANIFEST).toBeDefined();
    expect(CONVERTER_MANIFEST.slug).toBe('file-converter');
    expect(CONVERTER_MANIFEST.name).toBe('File Converter');
    expect(CONVERTER_MANIFEST.category).toBe('Converters');
  });

  it('should be registered in TOOL_REGISTRY under converter and file-converter', () => {
    expect(TOOL_REGISTRY['converter']).toBeDefined();
    expect(TOOL_REGISTRY['file-converter']).toBeDefined();
    expect(TOOL_REGISTRY['converter'].id).toBe('file-converter');
  });

  it('must define unique olive theme tokens matching tool identity', () => {
    expect(CONVERTER_MANIFEST.accent).toBe('olive');
    expect(CONVERTER_MANIFEST.accentHue).toBe(80);
    expect(CONVERTER_MANIFEST.theme?.accent).toBeDefined();

    // Light Theme
    expect(CONVERTER_MANIFEST.theme?.accent?.light.base.toLowerCase()).toBe('#5b7a1e');
    expect(CONVERTER_MANIFEST.theme?.accent?.light.soft.toLowerCase()).toBe('#f3f7e8');
    expect(CONVERTER_MANIFEST.theme?.accent?.light.ink.toLowerCase()).toBe('#ffffff');

    // Dark Theme
    expect(CONVERTER_MANIFEST.theme?.accent?.dark.base.toLowerCase()).toBe('#a3c75a');
    expect(CONVERTER_MANIFEST.theme?.accent?.dark.soft.toLowerCase()).toBe('#1f2a10');
    expect(CONVERTER_MANIFEST.theme?.accent?.dark.ink.toLowerCase()).toBe('#0f1608');
  });

  it('must define facts, highlights, and howTo sections', () => {
    expect(CONVERTER_MANIFEST.facts).toBeDefined();
    expect(CONVERTER_MANIFEST.facts!.length).toBeGreaterThan(0);
    expect(CONVERTER_MANIFEST.highlights).toBeDefined();
    expect(CONVERTER_MANIFEST.highlights!.length).toBeGreaterThan(0);
    expect(CONVERTER_MANIFEST.howTo).toBeDefined();
    expect(CONVERTER_MANIFEST.howTo!.length).toBeGreaterThan(0);
  });

  it('facts must declare 20 documents, 50MB per file, and 1-hour purge', () => {
    const facts = CONVERTER_MANIFEST.facts!;
    const batchFact = facts.find(f => f.label.toLowerCase().includes('batch'));
    const sizeFact = facts.find(f => f.label.toLowerCase().includes('size'));
    const purgeFact = facts.find(f => f.label.toLowerCase().includes('purge'));

    expect(batchFact?.value).toContain('20');
    expect(sizeFact?.value).toContain('50 MB');
    expect(purgeFact?.value).toContain('1 Hour');
  });

  it('configuration must match the specification', () => {
    expect(DOCUMENT_CONVERTER_CONFIG.maxBatchFiles).toBe(20);
    expect(DOCUMENT_CONVERTER_CONFIG.maxFileSizeBytes).toBe(50 * 1024 * 1024);
    expect(DOCUMENT_CONVERTER_CONFIG.autoPurgeTtlHours).toBe(1);
    expect(DOCUMENT_CONVERTER_CONFIG.defaultTargetFormat).toBe('pdf');
    expect(DOCUMENT_CONVERTER_CONFIG.defaultFidelity).toBe('balanced');
  });
});

describe('Dynamic Target Format & Capabilities Logic', () => {
  const sampleCapabilities = [
    { inputType: 'pdf', outputType: 'txt', status: 'tested' },
    { inputType: 'pdf', outputType: 'png', status: 'tested' },
    { inputType: 'pdf', outputType: 'jpg', status: 'tested' },
    { inputType: 'pdf', outputType: 'docx', status: 'planned' }, // planned should be excluded
    { inputType: 'docx', outputType: 'pdf', status: 'tested' },
    { inputType: 'docx', outputType: 'txt', status: 'tested' },
    { inputType: 'docx', outputType: 'odt', status: 'tested' },
    { inputType: 'json', outputType: 'yaml', status: 'tested' },
    { inputType: 'json', outputType: 'xml', status: 'tested' }
  ];

  it('computes tested targets for PDF excluding planned DOCX and same format', () => {
    const targets = computeCommonTestedTargets(['pdf'], sampleCapabilities);
    expect(targets).toEqual(['txt', 'png', 'jpg']);
    expect(targets).not.toContain('docx');
    expect(targets).not.toContain('pdf');
  });

  it('computes tested targets for DOCX excluding docx itself', () => {
    const targets = computeCommonTestedTargets(['docx'], sampleCapabilities);
    expect(targets).toContain('pdf');
    expect(targets).toContain('txt');
    expect(targets).toContain('odt');
    expect(targets).not.toContain('docx');
  });

  it('computes target intersection for mixed selection (PDF + DOCX)', () => {
    const targets = computeCommonTestedTargets(['pdf', 'docx'], sampleCapabilities);
    // Both PDF and DOCX support 'txt' in sample capabilities
    expect(targets).toEqual(['txt']);
  });

  it('returns empty array when there is no common format across files', () => {
    const targets = computeCommonTestedTargets(['pdf', 'json'], sampleCapabilities);
    expect(targets).toEqual([]);
  });

  it('uses tested fallback targets when capabilities array is empty', () => {
    const targets = computeCommonTestedTargets(['pdf'], []);
    expect(targets).toEqual(['docx', 'doc', 'md', 'html', 'xlsx', 'csv', 'pptx', 'txt', 'png', 'jpg']);
  });

  it('provides descriptive metadata without proprietary or library names', () => {
    const txtMeta = getTargetFormatMeta('txt');
    expect(txtMeta.format).toBe('txt');
    expect(txtMeta.label).toContain('Plain Text');
    expect(txtMeta.description).toBeDefined();
    expect(txtMeta.description).not.toMatch(/jodconverter|libreoffice|pdfbox|tess4j/i);

    const pdfMeta = getTargetFormatMeta('pdf');
    expect(pdfMeta.format).toBe('pdf');
    expect(pdfMeta.description).not.toMatch(/jodconverter|libreoffice|pdfbox|tess4j/i);
  });
});

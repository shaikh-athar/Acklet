// apps/tool-file-converter/src/converter.component.spec.ts
import { describe, it, expect } from 'vitest';
import { TOOL_REGISTRY, CONVERTER_MANIFEST } from '@acklet/tool-registry';

describe('File Converter Manifest & Registry Verification', () => {
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

  it('must define facts, highlights, and howTo sections', () => {
    expect(CONVERTER_MANIFEST.facts).toBeDefined();
    expect(CONVERTER_MANIFEST.facts!.length).toBeGreaterThan(0);
    expect(CONVERTER_MANIFEST.highlights).toBeDefined();
    expect(CONVERTER_MANIFEST.highlights!.length).toBeGreaterThan(0);
    expect(CONVERTER_MANIFEST.howTo).toBeDefined();
    expect(CONVERTER_MANIFEST.howTo!.length).toBeGreaterThan(0);
  });
});

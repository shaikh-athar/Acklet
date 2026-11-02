import { describe, it, expect } from 'vitest';
import { BARCODE_CATALOG } from './barcode-catalog.config';

describe('Registry Lint Test', () => {
  it('asserts every enabled format has all required schema rules and metadata', () => {
    const enabledFormats = Object.values(BARCODE_CATALOG).filter(f => f.enabled);
    expect(enabledFormats.length).toBeGreaterThan(0);

    for (const item of enabledFormats) {
      // 1. Charset
      expect(item.charset, `Format ${item.id} must define charset`).toBeDefined();
      expect(item.charset.length, `Format ${item.id} charset must not be empty`).toBeGreaterThan(0);

      // 2. Length rules
      expect(item.length, `Format ${item.id} must define length rules`).toBeDefined();
      expect(typeof item.length.min, `Format ${item.id} must define length.min`).toBe('number');
      expect(typeof item.length.max, `Format ${item.id} must define length.max`).toBe('number');

      // 3. Structural rules (pattern / charsetRegex)
      const hasStructure = !!item.pattern || !!item.charsetRegex;
      expect(hasStructure, `Format ${item.id} must define structural rules (pattern or charsetRegex)`).toBe(true);

      // 4. Checksum metadata where spec specifies one
      if (item.checksumType && item.checksumType !== 'none') {
        expect(item.checksum, `Format ${item.id} has checksumType ${item.checksumType} but lacks checksum description`).toBeDefined();
        expect(item.checksum!.length).toBeGreaterThan(0);
      }

      // 5. Example value
      expect(item.exampleValue, `Format ${item.id} must define exampleValue`).toBeDefined();
      expect(item.exampleValue.length).toBeGreaterThan(0);

      // 6. Invalid example value
      expect(item.invalidExampleValue, `Format ${item.id} must define invalidExampleValue`).toBeDefined();
      expect(item.invalidExampleValue!.length).toBeGreaterThan(0);

      // 7. expectedEncoded function
      expect(typeof item.expectedEncoded, `Format ${item.id} must define expectedEncoded function`).toBe('function');

      // 8. expectedDecoded function
      expect(typeof item.expectedDecoded, `Format ${item.id} must define expectedDecoded function`).toBe('function');
    }
  });
});


import { describe, it, expect } from 'vitest';
import { BARCODE_CATALOG } from './barcode-catalog.config';
import { RenderService } from '../services/render.service';
import { DEFAULT_DESIGN_OPTIONS } from '../models/barcode.models';
import * as fs from 'fs';
import * as path from 'path';

describe('Format Matrix Validation Script', () => {
  it('renders all enabled formats and variants with test vectors', async () => {
    const renderer = new RenderService();
    const rows: { format: string; variant: string; input: string; pass: boolean; reason: string }[] = [];

    const testVectors: Record<string, string[]> = {
      code128: ['A', 'TEST12345', 'LONG-STRING-VARIABLE-TEST-1234567890'],
      ean13: ['400638133393', '4006381333931', '9780306406157'],
      ean8: ['9638507', '96385074', '90909092'],
      upca: ['03600029145', '036000291452', '012345678905'],
      upce: ['0123456', '01234565', '123456'],
      isbn: ['0306406152', '9780306406157', '9790260000438'],
      ismn: ['979026000043', '9790260000438', '9790001150019'],
      issn: ['12345679', '9771234567003', '9772049363002'],
      code39: ['A', 'ACKLET-1', 'CODE39-TEST-1234567890'],
      code93: ['A', 'ACKLET-93', 'CODE93-FULL-TEST-12345'],
      itf14: ['1001234567890', '10012345678902', '00012345678905'],
      itf: ['12', '24681357', '123456789012'],
      codabar: ['A12B', 'A12345B', 'B1234567890D'],
      datamatrix: ['A', 'TEST-DATA-MATRIX', 'https://acklet.com/tool/barcode'],
      pdf417: ['A', 'PASSENGER:DOE/JOHN TICKET:982341', 'PDF417-EXTENSIVE-PAYLOAD-TEST'],
      aztec: ['A', 'AZTEC-DATA', 'AZTEC-HIGH-DENSITY-TEST'],
      'gs1-databar': ['9780306406157', '09780306406157', '(01)09521234543213(3103)000123']
    };

    for (const [formatId, item] of Object.entries(BARCODE_CATALOG)) {
      if (!item.enabled) continue;

      if (item.variants && item.variants.length > 0) {
        for (const variant of item.variants) {
          let inputs = [variant.exampleValue || item.exampleValue || '123456'];
          if (variant.id === 'limited') {
            inputs = ['09780306406157', '19780306406154'];
          } else if (variant.id === 'expanded' || variant.id === 'expanded-stacked') {
            inputs = ['(01)09521234543213(3103)000123', '9780306406157'];
          } else {
            inputs = ['9780306406157', '09780306406157'];
          }

          for (const inp of inputs) {
            try {
              const res = await renderer.render(
                item,
                inp,
                inp,
                { ...DEFAULT_DESIGN_OPTIONS },
                { variant: variant.id }
              );
              const hasSvg = res && res.svg && res.svg.includes('<svg') && res.width > 0 && res.height > 0;
              rows.push({
                format: item.label,
                variant: variant.label,
                input: inp,
                pass: !!hasSvg,
                reason: hasSvg ? 'Rendered valid SVG with positive dimensions' : 'SVG dimensions invalid'
              });
            } catch (err: any) {
              rows.push({
                format: item.label,
                variant: variant.label,
                input: inp,
                pass: false,
                reason: err.message || String(err)
              });
            }
          }
        }
      } else {
        const inputs = testVectors[formatId] || [item.exampleValue || '123456'];
        for (const inp of inputs) {
          try {
            const res = await renderer.render(
              item,
              inp,
              inp,
              { ...DEFAULT_DESIGN_OPTIONS },
              {}
            );
            const hasSvg = res && res.svg && res.svg.includes('<svg') && res.width > 0 && res.height > 0;
            rows.push({
              format: item.label,
              variant: 'Standard',
              input: inp,
              pass: !!hasSvg,
              reason: hasSvg ? 'Rendered valid SVG with positive dimensions' : 'SVG dimensions invalid'
            });
          } catch (err: any) {
            rows.push({
              format: item.label,
              variant: 'Standard',
              input: inp,
              pass: false,
              reason: err.message || String(err)
            });
          }
        }
      }
    }

    // Generate markdown table
    let md = '# Barcode Format Compatibility Matrix\n\n';
    md += '| Format | Variant | Input | Status | Details |\n';
    md += '| :--- | :--- | :--- | :--- | :--- |\n';
    for (const r of rows) {
      md += `| ${r.format} | ${r.variant} | \`${r.input}\` | ${r.pass ? 'PASS' : 'FAIL'} | ${r.reason} |\n`;
    }

    const targetDir = path.resolve('/Users/ayaz/Acklet/docs/Acklet Vault/Acklet/Tools/Barcode-Generator');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(path.join(targetDir, 'format-matrix.md'), md, 'utf-8');

    const failures = rows.filter(r => !r.pass);
    expect(failures.length, `Expected 0 failures, got: ${JSON.stringify(failures)}`).toBe(0);
  });
});

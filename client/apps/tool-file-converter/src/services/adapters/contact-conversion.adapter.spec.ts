// apps/tool-file-converter/src/services/adapters/contact-conversion.adapter.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ContactConversionAdapter } from './contact-conversion.adapter';

function createTextFile(text: string, name: string): File {
  return new File([text], name, { type: 'text/plain' });
}

describe('ContactConversionAdapter', () => {
  let adapter: ContactConversionAdapter;

  beforeEach(() => {
    adapter = new ContactConversionAdapter();
  });

  it('should declare support for vcf -> csv and csv -> vcf', () => {
    expect(adapter.canConvert('vcf', 'csv')).toBe(true);
    expect(adapter.canConvert('csv', 'vcf')).toBe(true);
    expect(adapter.canConvert('vcf', 'png')).toBe(false);
  });

  describe('VCF to CSV Conversion', () => {
    it('should parse vCard entries and output standard RFC 4180 CSV with headers', async () => {
      const vcf = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        'FN:John Doe',
        'N:Doe;John;;;',
        'ORG:Acme Corp',
        'TITLE:Chief Engineer',
        'TEL;TYPE=CELL:+1-555-0199',
        'EMAIL;TYPE=WORK:john@acme.com',
        'ADR;TYPE=WORK:;;123 Main St;Springfield;IL;62701;USA',
        'NOTE:Important client',
        'END:VCARD'
      ].join('\n');

      const file = createTextFile(vcf, 'contacts.vcf');
      const result = await adapter.convert(file, 'vcf', 'csv');

      expect(result.success).toBe(true);
      expect(result.outputExtension).toBe('csv');
      expect(result.outputFileName).toBe('contacts.csv');

      const csv = await result.blob!.text();
      expect(csv).toContain('Full Name,First Name,Last Name,Organization,Job Title,Phone,Email');
      expect(csv).toContain('John Doe');
      expect(csv).toContain('Acme Corp');
      expect(csv).toContain('+1-555-0199');
      expect(csv).toContain('john@acme.com');
      expect(csv).toContain('Springfield');
    });

    it('should handle multi-contact vCards properly', async () => {
      const vcf = [
        'BEGIN:VCARD\nVERSION:3.0\nFN:Alice Wonderland\nTEL:111-222\nEND:VCARD',
        'BEGIN:VCARD\nVERSION:3.0\nFN:Bob Builder\nTEL:333-444\nEND:VCARD'
      ].join('\n');

      const file = createTextFile(vcf, 'all.vcf');
      const result = await adapter.convert(file, 'vcf', 'csv');
      const csv = await result.blob!.text();

      expect(csv).toContain('Alice Wonderland');
      expect(csv).toContain('Bob Builder');
    });
  });

  describe('CSV to VCF Conversion', () => {
    it('should parse CSV rows and serialize into valid vCard 3.0 blocks', async () => {
      const csv = [
        'Full Name,First Name,Last Name,Organization,Phone,Email',
        'Jane Smith,Jane,Smith,Tech Corp,555-9876,jane@tech.io'
      ].join('\n');

      const file = createTextFile(csv, 'import.csv');
      const result = await adapter.convert(file, 'csv', 'vcf');

      expect(result.success).toBe(true);
      expect(result.outputExtension).toBe('vcf');
      expect(result.outputFileName).toBe('import.vcf');

      const vcf = await result.blob!.text();
      expect(vcf).toContain('BEGIN:VCARD');
      expect(vcf).toContain('VERSION:3.0');
      expect(vcf).toContain('FN:Jane Smith');
      expect(vcf).toContain('N:Smith;Jane;;;');
      expect(vcf).toContain('ORG:Tech Corp');
      expect(vcf).toContain('TEL;TYPE=CELL:555-9876');
      expect(vcf).toContain('EMAIL;TYPE=INTERNET:jane@tech.io');
      expect(vcf).toContain('END:VCARD');
    });
  });
});


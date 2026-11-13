// @vitest-environment jsdom
// apps/tool-file-converter/src/converter.service.spec.ts
import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ConverterApiService } from './converter.service';
import { DOCUMENT_CONVERTER_CONFIG } from './converter.config';

describe('ConverterApiService & Logic Specs', () => {
  const dummyHttp = {
    get: () => {},
    post: () => {},
    delete: () => {}
  };

  function createService(): ConverterApiService {
    const envInjector = createEnvironmentInjector([
      { provide: HttpClient, useValue: dummyHttp }
    ]);
    return runInInjectionContext(envInjector, () => new ConverterApiService());
  }

  const service = createService();

  describe('validatePageRange', () => {
    it('accepts empty, whitespace, or "all" expressions', () => {
      expect(service.validatePageRange('').valid).toBe(true);
      expect(service.validatePageRange('   ').valid).toBe(true);
      expect(service.validatePageRange('all').valid).toBe(true);
      expect(service.validatePageRange('ALL').valid).toBe(true);
    });

    it('accepts single valid page numbers and comma-separated lists', () => {
      expect(service.validatePageRange('1').valid).toBe(true);
      expect(service.validatePageRange('5').valid).toBe(true);
      expect(service.validatePageRange('1, 3, 7').valid).toBe(true);
    });

    it('accepts valid range expressions such as "1-3, 5"', () => {
      expect(service.validatePageRange('1-3, 5').valid).toBe(true);
      expect(service.validatePageRange('2 - 8, 10 - 15, 20').valid).toBe(true);
    });

    it('rejects inverted ranges where start > end', () => {
      const res = service.validatePageRange('5-2');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('start must be <= end');
    });

    it('rejects page numbers <= 0', () => {
      const zero = service.validatePageRange('0');
      expect(zero.valid).toBe(false);
      expect(zero.error).toContain('must be 1 or greater');

      const zeroRange = service.validatePageRange('0-5');
      expect(zeroRange.valid).toBe(false);
      expect(zeroRange.error).toContain('must be 1 or greater');
    });

    it('rejects leading or trailing commas', () => {
      expect(service.validatePageRange(',1,2').valid).toBe(false);
      expect(service.validatePageRange('1,2,').valid).toBe(false);
    });

    it('rejects non-numeric characters', () => {
      expect(service.validatePageRange('abc').valid).toBe(false);
      expect(service.validatePageRange('1-a').valid).toBe(false);
      expect(service.validatePageRange('1..3').valid).toBe(false);
    });
  });

  describe('formatBytes', () => {
    it('handles 0 and falsy values', () => {
      expect(service.formatBytes(0)).toBe('0 B');
      expect(service.formatBytes(undefined)).toBe('0 B');
      expect(service.formatBytes(NaN)).toBe('0 B');
    });

    it('formats bytes, KB, and MB correctly', () => {
      expect(service.formatBytes(500)).toBe('500 B');
      expect(service.formatBytes(1024)).toBe('1 KB');
      expect(service.formatBytes(1536)).toBe('1.5 KB');
      expect(service.formatBytes(1048576)).toBe('1 MB');
      expect(service.formatBytes(52428800)).toBe('50 MB');
    });
  });

  describe('Download URL builders', () => {
    it('constructs correct single-file download URL', () => {
      const url = service.getFileDownloadUrl('job-123', 'file-456');
      expect(url).toBe('/api/file-converter/jobs/job-123/files/file-456');
    });

    it('constructs correct batch ZIP download URL', () => {
      const url = service.getZipDownloadUrl('job-123');
      expect(url).toBe('/api/file-converter/jobs/job-123/zip');
    });
  });

  describe('Document Converter Config Constants', () => {
    it('enforces maximum 20 files per batch', () => {
      expect(DOCUMENT_CONVERTER_CONFIG.maxBatchFiles).toBe(20);
    });

    it('enforces 50 MB per file limit', () => {
      expect(DOCUMENT_CONVERTER_CONFIG.maxFileSizeBytes).toBe(50 * 1024 * 1024);
    });

    it('supports required document input extensions', () => {
      const inputs = DOCUMENT_CONVERTER_CONFIG.supportedInputExtensions;
      expect(inputs).toContain('docx');
      expect(inputs).toContain('xlsx');
      expect(inputs).toContain('pptx');
      expect(inputs).toContain('pdf');
      expect(inputs).toContain('odt');
      expect(inputs).toContain('txt');
    });

    it('supports target formats DOCX, PDF, XLSX', () => {
      const targets = DOCUMENT_CONVERTER_CONFIG.supportedTargetFormats.map(t => t.format);
      expect(targets).toContain('pdf');
      expect(targets).toContain('docx');
      expect(targets).toContain('xlsx');
    });

    it('defines 3 layout fidelity modes: editable, balanced, exact', () => {
      const modes = DOCUMENT_CONVERTER_CONFIG.fidelityOptions.map(f => f.id);
      expect(modes).toEqual(['editable', 'balanced', 'exact']);
      expect(DOCUMENT_CONVERTER_CONFIG.defaultFidelity).toBe('balanced');
    });
  });
});

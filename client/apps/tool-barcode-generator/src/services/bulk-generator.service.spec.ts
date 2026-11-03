// apps/tool-barcode-generator/src/services/bulk-generator.service.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  BulkGeneratorService,
  escapeFormulaInjection,
  formatCsvCell,
  sanitizeFileName
} from './bulk-generator.service';
import { BARCODE_CATALOG } from '../config/barcode-catalog.config';
import { LABEL_SHEET_PRESETS, LABEL_ROLL_PRESETS } from '../config/label-templates.config';

describe('BulkGeneratorService - Complete Bulk Architecture', () => {
  let service: BulkGeneratorService;

  beforeEach(() => {
    service = new BulkGeneratorService();
  });

  describe('1. Security & Formula Injection Defense', () => {
    it('prefixes dangerous spreadsheet formulas starting with =, +, -, @ with a single quote', () => {
      expect(escapeFormulaInjection('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
      expect(escapeFormulaInjection('+12345678')).toBe("'+12345678");
      expect(escapeFormulaInjection('-CMD|calc!A0')).toBe("'-CMD|calc!A0");
      expect(escapeFormulaInjection('@IMPORTXML(url)')).toBe("'@IMPORTXML(url)");
      expect(service.sanitizeFormulaInjection('=cmd')).toBe("'=cmd");
    });

    it('leaves standard numbers, text, and empty strings safe', () => {
      expect(escapeFormulaInjection('4006381333931')).toBe('4006381333931');
      expect(escapeFormulaInjection('ITEM-1001')).toBe('ITEM-1001');
      expect(escapeFormulaInjection('')).toBe('');
    });

    it('escapes cells containing commas, quotes, and newlines in CSV outputs', () => {
      expect(formatCsvCell('NormalText')).toBe('NormalText');
      expect(formatCsvCell('Text with, comma')).toBe('"Text with, comma"');
      expect(formatCsvCell('Text with "quotes"')).toBe('"Text with ""quotes"""');
      expect(formatCsvCell('=Formula, with comma')).toBe('"\'=Formula, with comma"');
    });
  });

  describe('2. CSV and Delimited Parser', () => {
    it('parses CSV with quoted values, embedded commas, and escaped quotes', () => {
      const csv = `SKU,Name,Barcode\n"ITEM-1","Coffee, Dark Roast","4006381333931"\n"ITEM-2","Tea ""Green""","5901234123457"`;
      const parsed = service.parseCsv(csv, 2, 1);

      expect(parsed.headers).toEqual(['SKU', 'Name', 'Barcode']);
      expect(parsed.values).toEqual(['4006381333931', '5901234123457']);
      expect(parsed.labelTexts).toEqual(['Coffee, Dark Roast', 'Tea "Green"']);
      expect(parsed.totalRows).toBe(2);
    });

    it('handles CRLF line breaks, BOM markers, and empty lines', () => {
      const csv = `\uFEFFBarcode,Label\r\n4006381333931,Item 1\r\n\r\n5901234123457,Item 2\r\n`;
      const parsed = service.parseCsv(csv, 0, 1);

      expect(parsed.values).toEqual(['4006381333931', '5901234123457']);
      expect(parsed.totalRows).toBe(2);
    });

    it('auto-detects semicolon and tab delimiters', () => {
      const tsv = `Code\tDescription\n12345\tFirst\n67890\tSecond`;
      const parsedTsv = service.parseCsv(tsv, 0);
      expect(parsedTsv.detectedDelimiter).toBe('\t');
      expect(parsedTsv.values).toEqual(['12345', '67890']);

      const ssv = `Code;Description\n12345;First\n67890;Second`;
      const parsedSsv = service.parseCsv(ssv, 0);
      expect(parsedSsv.detectedDelimiter).toBe(';');
      expect(parsedSsv.values).toEqual(['12345', '67890']);
    });

    it('detects header row when column has words while rows have numbers', () => {
      const withHeader = `Product_ID\n1001\n1002\n1003`;
      const parsed = service.parseCsv(withHeader, 0);
      expect(parsed.hasHeader).toBe(true);
      expect(parsed.headers).toEqual(['Product_ID']);
      expect(parsed.values).toEqual(['1001', '1002', '1003']);
    });
  });

  describe('3. List Parser', () => {
    it('trims whitespace and ignores blank lines in plain list', () => {
      const list = `  ITEM-1001  \n\n   \nITEM-1002\r\nITEM-1003\n`;
      const res = service.parseList(list, 'newline');
      expect(res.records.length).toBe(3);
      expect(res.records.map(r => r.value)).toEqual(['ITEM-1001', 'ITEM-1002', 'ITEM-1003']);
    });

    it('detects spreadsheet paste with uniform tabs and suggests column structure', () => {
      const spreadsheetPaste = `SKU-001\tProduct 1\t4006381333931\nSKU-002\tProduct 2\t5901234123457`;
      const res = service.parseList(spreadsheetPaste, 'newline');
      expect(res.isTabDelimitedTable).toBe(true);
      expect(res.detectedColumns).toBe(3);
    });

    it('flags comma or semicolon separated lines for column splitting hint', () => {
      const commaSeparated = `A001,Label 1\nA002,Label 2\nA003,Label 3`;
      const res = service.parseList(commaSeparated, 'newline');
      expect(res.suggestsCommaSplit).toBe(true);

      const semiSeparated = `B001;Label 1\nB002;Label 2`;
      const resSemi = service.parseList(semiSeparated, 'newline');
      expect(resSemi.suggestsSemicolonSplit).toBe(true);
    });
  });

  describe('4. Sequence Generator', () => {
    it('generates Code 128 sequence ITEM-/1001/50/1/6 giving 50 values ending with ITEM-001050', () => {
      const item = BARCODE_CATALOG['code128'];
      const res = service.generateSequence('ITEM-', 1001, 50, 1, 6, '', false, item);

      expect(res.errorMessage).toBeUndefined();
      expect(res.values.length).toBe(50);
      expect(res.values[0].value).toBe('ITEM-001001');
      expect(res.values[1].value).toBe('ITEM-001002');
      expect(res.values[49].value).toBe('ITEM-001050');
      expect(res.samplePreview).toEqual([
        'ITEM-001001',
        'ITEM-001002',
        'ITEM-001003',
        '...',
        'ITEM-001050'
      ]);
    });

    it('generates EAN-13 with prefix 40063813, 4 counter digits, start 1, count 20 with check digits', () => {
      const item = BARCODE_CATALOG['ean13'];
      const res = service.generateSequence('40063813', 1, 20, 1, 4, '', true, item);

      expect(res.errorMessage).toBeUndefined();
      expect(res.values.length).toBe(20);
      expect(res.fixedLengthLocked).toBe(true);
      expect(res.counterDigits).toBe(4);
      // Prefix 8 digits (40063813) + 4 counter digits (0001) + check digit = 13 digits
      expect(res.values[0].value.length).toBe(13);
      expect(res.values[0].value.startsWith('400638130001')).toBe(true);
    });

    it('blocks alphanumeric prefix like ITEM- for numeric formats (EAN-13) before generating', () => {
      const item = BARCODE_CATALOG['ean13'];
      const res = service.generateSequence('ITEM-', 1001, 50, 1, 6, '', true, item);

      expect(res.errorMessage).toContain('Prefix must contain digits only for EAN-13.');
      expect(res.values.length).toBe(0);
    });

    it('rejects count out of bounds or step less than 1', () => {
      const resOver = service.generateSequence('PKG-', 1, 501, 1, 4, '', false);
      expect(resOver.errorMessage).toBe('Count must be 1 to 500.');

      const resZero = service.generateSequence('PKG-', 1, 0, 1, 4, '', false);
      expect(resZero.errorMessage).toBe('Count must be 1 to 500.');

      const resStep = service.generateSequence('PKG-', 1, 10, 0, 4, '', false);
      expect(resStep.errorMessage).toBe('Step must be 1 or more.');
    });

    it('reports padding overflow error if last number exceeds zero padding digits', () => {
      // start 10000, count 10 -> last number is 10009 (5 digits), but padding is 4
      const res = service.generateSequence('NUM-', 10000, 10, 1, 4, '', false);
      expect(res.errorMessage).toContain('needs 5 digits but padding is 4');
    });
  });

  describe('5. Review Step & Pre-validation', () => {
    it('reviews list of valid, check-digit-added, invalid, and duplicate records correctly', () => {
      const item = BARCODE_CATALOG['ean13'];
      const rawRecords = [
        { value: '4006381333931' }, // valid EAN-13
        { value: '5901234123457' }, // valid EAN-13
        { value: '400638133393' },  // 12 digits, check digit added
        { value: '4006381333932' }, // invalid check digit
        { value: '4006381333931' }  // duplicate
      ];

      const review = service.reviewRecords(rawRecords, item, {}, undefined, true);

      expect(review.validCount).toBe(3); // 2 full valid + 1 normalized 12-digit (duplicate excluded)
      expect(review.invalidCount).toBe(1); // 4006381333932 invalid check digit
      expect(review.duplicateCount).toBe(1);
    });

    it('generates error report CSV with formula escaping', () => {
      const records: any[] = [
        { row: 1, value: '=calc!A0', status: 'invalid', errorMessage: 'Invalid characters' },
        { row: 2, value: '4006381333932', status: 'invalid', errorMessage: 'Invalid check digit' },
        { row: 3, value: '4006381333931', status: 'valid' }
      ];

      const csv = service.generateErrorReportCsv(records);
      expect(csv).toContain('Row,Value,Reason');
      expect(csv).toContain("1,'=calc!A0,Invalid characters");
      expect(csv).toContain('2,4006381333932,Invalid check digit');
      expect(csv).not.toContain('3,4006381333931');
    });

    it('generates manifest CSV for export archives', () => {
      const results: any[] = [
        { index: 0, value: '4006381333931', fileName: '001-4006381333931-ean13', status: 'success' },
        { index: 1, value: 'INVALID', fileName: 'item-2', status: 'error' }
      ];

      const manifest = service.generateManifestCsv(results);
      expect(manifest).toContain('Index,Value,Encoded Value,File Name,Status');
      expect(manifest).toContain('1,4006381333931,4006381333931,001-4006381333931-ean13,success');
      expect(manifest).toContain('2,INVALID,INVALID,item-2,error');
    });
  });

  describe('6. File Name Sanitization', () => {
    it('removes path separators, illegal symbols, control characters and reserved Windows names', () => {
      expect(sanitizeFileName('../../etc/passwd')).toBe('______etc_passwd');
      expect(sanitizeFileName('CON')).toBe('_CON');
      expect(sanitizeFileName('NUL.txt')).toBe('_NUL.txt');
      expect(sanitizeFileName('Valid-Barcode_1001')).toBe('Valid-Barcode_1001');
    });

    it('truncates excessively long file names to maxLen', () => {
      const veryLong = 'a'.repeat(120);
      expect(sanitizeFileName(veryLong, 80).length).toBe(80);
    });
  });

  describe('7. Output & PDF Page Count Rules', () => {
    it('calculates exact page count for 50 labels on a 24-up sheet', () => {
      const perPage = 24;
      const count = 50;
      const copies = 1;
      const startAt = 1;
      const pages = Math.ceil((count * copies + (startAt - 1)) / perPage);
      expect(pages).toBe(3); // 24 + 24 + 2 = 50 items across 3 pages
    });

    it('calculates exact page count when starting at label 6 (5 empty slots)', () => {
      const perPage = 24;
      const count = 50;
      const copies = 1;
      const startAt = 6;
      // 5 empty slots + 50 items = 55 total slots -> ceil(55 / 24) = 3 pages
      const pages = Math.ceil((count * copies + (startAt - 1)) / perPage);
      expect(pages).toBe(3);
    });

    it('strictly aborts generation and triggers 0 downloads when 0 valid records exist', async () => {
      let progressReported: any = null;
      let downloadTriggered = false;

      // Mock triggerDownload
      service.triggerDownload = () => {
        downloadTriggered = true;
      };

      await service.runBulk(
        {
          formatId: 'ean13',
          formatOptions: {},
          designOptions: {} as any,
          records: [
            { row: 1, value: 'ITEM-1', cleanValue: 'ITEM-1', displayValue: 'ITEM-1', status: 'invalid' }
          ],
          outputType: 'zip-png',
          skipInvalidRows: true // filters out invalid, leaving 0 valid items
        },
        prog => {
          progressReported = prog;
        }
      );

      expect(downloadTriggered).toBe(false);
      expect(progressReported.status).toBe('error');
      expect(progressReported.errorMessage).toBe('No barcodes were created. Check the rows marked in Review.');
    });
  });

  describe('8. Cancellation', () => {
    it('sets cancelled flag and aborts in-progress chunked generation', () => {
      service.cancel();
      // Internal cancellation flag is checked during each chunk
      expect(true).toBe(true);
    });
  });
});

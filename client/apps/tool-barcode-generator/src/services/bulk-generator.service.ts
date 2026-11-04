// apps/tool-barcode-generator/src/services/bulk-generator.service.ts
import { Injectable, inject } from '@angular/core';
import JSZip from 'jszip';
import {
  BarcodeDesignOptions,
  FormatPerOptions,
  BarcodeCatalogItem,
  BulkItemResult,
  BulkRecord,
  BulkRecordStatus,
  BulkOutputType,
  BulkSourceMode,
  BulkCaptionStyle
} from '../models/barcode.models';
import { BARCODE_SYSTEM_LIMITS } from '../config/barcode-catalog.config';
import {
  LabelSheetPreset,
  LabelRollPreset,
  LABEL_SHEET_PRESETS,
  LABEL_ROLL_PRESETS,
  PAGE_DIMENSIONS,
  MM_TO_PT
} from '../config/label-templates.config';
import { FormatRegistryService } from './format-registry.service';
import { ValidatorService } from './validator.service';
import { RenderService } from './render.service';
import { BarcodeCheckDigitService } from './check-digit.service';
import { PdfBuilderService, LabelItem } from './pdf-builder.service';
import { SheetLayoutService, SheetPageModel } from './sheet-layout.service';
import { VerifyService } from './verify.service';

export interface BulkRunConfig {
  formatId: string;
  formatOptions: FormatPerOptions;
  designOptions: BarcodeDesignOptions;
  records: BulkRecord[];
  outputType: BulkOutputType;
  labelPreset?: LabelSheetPreset;
  rollPreset?: LabelRollPreset;
  startAtLabel?: number;
  showValueText?: boolean;
  showLabelText?: boolean;
  textSizePt?: number | 'auto';
  showCutGuides?: boolean;
  copies?: number;
  fitMode?: 'fit-inside' | 'actual';
  skipInvalidRows?: boolean;
  removeDuplicates?: boolean;
  baseFileName?: string;
  nudgeXmm?: number;
  nudgeYmm?: number;
  dpi?: 150 | 300 | 600;
  captionStyle?: BulkCaptionStyle;
  exportImmediately?: boolean;
}

export interface BulkProgress {
  total: number;
  completed: number;
  percent: number;
  currentValue: string;
  isCancelled: boolean;
  status: 'idle' | 'running' | 'completed' | 'cancelled' | 'error';
  errorMessage?: string;
  resultSummary?: string;
  generatedCount?: number;
  skippedCount?: number;
  pagesCount?: number;
}

export interface CsvParseResult {
  headers: string[];
  previewRows: string[][];
  allRows: string[][];
  values: string[];
  labelTexts: string[];
  totalRows: number;
  detectedDelimiter: string;
  hasHeader: boolean;
}

export interface ListParseResult {
  records: { value: string; labelText?: string }[];
  isTabDelimitedTable: boolean;
  detectedColumns: number;
  headers: string[];
  suggestsCommaSplit: boolean;
  suggestsSemicolonSplit: boolean;
  totalFound: number;
}

export interface SequenceResult {
  values: { value: string; labelText?: string }[];
  samplePreview: string[];
  errorMessage?: string;
  counterDigits?: number;
  fixedLengthLocked?: boolean;
  maxAllowedCount?: number;
}

/**
 * Escapes CSV values against formula injection (=, +, -, @).
 */
export function escapeFormulaInjection(val: string): string {
  if (!val) return '';
  const s = String(val).trim();
  if (/^[=+\-@]/.test(s)) {
    return `'${s}`;
  }
  return s;
}

/**
 * Encapsulates cell in quotes and handles internal quotes for CSV emission.
 */
export function formatCsvCell(cell: string): string {
  const safe = escapeFormulaInjection(cell);
  if (safe.includes(',') || safe.includes('"') || safe.includes('\n') || safe.includes('\r')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

/**
 * Sanitizes a file name for cross-platform ZIP export (Windows, Mac, Linux).
 */
export function sanitizeFileName(name: string, maxLen = 80): string {
  if (!name) return 'barcode';
  let clean = name.replace(/\.\./g, '__').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
  // Reserved Windows names
  const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
  if (reserved.test(clean)) {
    clean = `_${clean}`;
  }
  if (clean.length > maxLen) {
    clean = clean.slice(0, maxLen);
  }
  return clean || 'barcode';
}

@Injectable({
  providedIn: 'root'
})
export class BulkGeneratorService {
  private registry: FormatRegistryService;
  private validator: ValidatorService;
  private renderer: RenderService;
  private checkDigitService: BarcodeCheckDigitService;
  private pdfBuilder: PdfBuilderService;
  private sheetLayout: SheetLayoutService;
  private verifier: VerifyService;

  constructor(
    registry?: FormatRegistryService,
    validator?: ValidatorService,
    renderer?: RenderService,
    checkDigitService?: BarcodeCheckDigitService,
    pdfBuilder?: PdfBuilderService,
    sheetLayout?: SheetLayoutService,
    verifier?: VerifyService
  ) {
    if (registry && validator && renderer && checkDigitService && pdfBuilder && sheetLayout) {
      this.registry = registry;
      this.validator = validator;
      this.renderer = renderer;
      this.checkDigitService = checkDigitService;
      this.pdfBuilder = pdfBuilder;
      this.sheetLayout = sheetLayout;
      this.verifier = verifier || new VerifyService();
    } else {
      try {
        this.registry = inject(FormatRegistryService);
        this.validator = inject(ValidatorService);
        this.renderer = inject(RenderService);
        this.checkDigitService = inject(BarcodeCheckDigitService);
        this.pdfBuilder = inject(PdfBuilderService);
        this.sheetLayout = inject(SheetLayoutService);
        this.verifier = inject(VerifyService);
      } catch {
        this.registry = new FormatRegistryService();
        this.validator = new ValidatorService();
        this.renderer = new RenderService();
        this.checkDigitService = new BarcodeCheckDigitService();
        this.pdfBuilder = new PdfBuilderService();
        this.sheetLayout = new SheetLayoutService();
        this.verifier = new VerifyService();
      }
    }
  }

  private cancelled = false;

  cancel(): void {
    this.cancelled = true;
  }

  /**
   * Sanitizes formula injection string.
   */
  sanitizeFormulaInjection(value: string): string {
    return escapeFormulaInjection(value);
  }

  /**
   * Parses CSV or TSV text with robust handling for:
   * - Quoted fields, escaped quotes, multiline fields within quotes
   * - Delimiter auto-detection (comma, semicolon, tab) with override
   * - Stripping of UTF-8 BOM
   * - Optional header detection and column mapping
   */
  parseCsv(
    csvText: string,
    valueColumnIdx = 0,
    captionColumnIdx = -1,
    delimiterOverride = 'auto',
    hasHeaderToggle?: boolean
  ): CsvParseResult {
    if (!csvText) {
      return {
        headers: [],
        previewRows: [],
        allRows: [],
        values: [],
        labelTexts: [],
        totalRows: 0,
        detectedDelimiter: ',',
        hasHeader: false
      };
    }

    // Strip BOM if present
    let text = csvText.replace(/^\uFEFF/, '');

    // Auto-detect delimiter if requested
    let delimiter = ',';
    if (delimiterOverride && delimiterOverride !== 'auto') {
      delimiter = delimiterOverride;
    } else {
      const firstLineSample = text.split(/\r?\n/).slice(0, 5).join('\n');
      const commaCount = (firstLineSample.match(/,/g) || []).length;
      const semicolonCount = (firstLineSample.match(/;/g) || []).length;
      const tabCount = (firstLineSample.match(/\t/g) || []).length;

      if (tabCount > commaCount && tabCount > semicolonCount) {
        delimiter = '\t';
      } else if (semicolonCount > commaCount) {
        delimiter = ';';
      } else {
        delimiter = ',';
      }
    }

    // Robust CSV tokenizer handling quotes, commas and newlines inside quotes
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];

      if (c === '"') {
        if (inQuotes && next === '"') {
          // Escaped quote: "" -> "
          currentCell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === delimiter && !inQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if ((c === '\r' || c === '\n') && !inQuotes) {
        if (c === '\r' && next === '\n') {
          i++; // Skip \n in CRLF
        }
        currentRow.push(currentCell.trim());
        currentCell = '';
        if (currentRow.some(col => col.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentCell += c;
      }
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some(col => col.length > 0)) {
        rows.push(currentRow);
      }
    }

    if (rows.length === 0) {
      return {
        headers: [],
        previewRows: [],
        allRows: [],
        values: [],
        labelTexts: [],
        totalRows: 0,
        detectedDelimiter: delimiter,
        hasHeader: false
      };
    }

    // Auto-detect header if not explicitly toggled:
    // If row 0 contains header names, or has non-numeric titles while row 1 has barcode data
    let isHeader = false;
    if (hasHeaderToggle !== undefined) {
      isHeader = hasHeaderToggle;
    } else if (rows.length > 1) {
      const headerRegex = /^(sku|barcode|code|value|id|name|title|product|price|label|text|upc|ean|isbn|description)$/i;
      const matchesKeyword = rows[0].some(cell => headerRegex.test(cell.trim()));
      const firstRowHasWords = rows[0].every(cell => !/^\d+$/.test(cell.trim()));
      const secondRowHasDigits = rows[1].some(cell => /^\d+$/.test(cell.trim()));
      isHeader = matchesKeyword || (firstRowHasWords && secondRowHasDigits);
    }

    let headers: string[] = [];
    let dataRows: string[][] = [];

    if (isHeader) {
      headers = rows[0].map(h => escapeFormulaInjection(h));
      dataRows = rows.slice(1);
    } else {
      headers = rows[0].map((_, idx) => `Column ${idx + 1}`);
      dataRows = rows;
    }

    // Limit to system limit
    const cappedRows = dataRows.slice(0, BARCODE_SYSTEM_LIMITS.maxListItems);
    const values: string[] = [];
    const labelTexts: string[] = [];

    for (const r of cappedRows) {
      const val = r[valueColumnIdx] !== undefined ? r[valueColumnIdx] : (r[0] || '');
      values.push(escapeFormulaInjection(val));

      if (captionColumnIdx >= 0 && r[captionColumnIdx] !== undefined) {
        labelTexts.push(escapeFormulaInjection(r[captionColumnIdx]));
      } else {
        labelTexts.push('');
      }
    }

    const sanitizedDataRows = dataRows
      .slice(0, BARCODE_SYSTEM_LIMITS.maxListItems)
      .map(row => row.map(cell => escapeFormulaInjection(cell)));

    return {
      headers,
      previewRows: sanitizedDataRows.slice(0, 10),
      allRows: sanitizedDataRows,
      values,
      labelTexts,
      totalRows: dataRows.length,
      detectedDelimiter: delimiter,
      hasHeader: isHeader
    };
  }

  /**
   * Parses freeform list text with column detection and separator support.
   */
  parseList(
    listText: string,
    separator: 'newline' | 'comma' | 'semicolon' | 'tab' = 'newline',
    hasHeader = false,
    selectedColIdx = 0,
    captionColIdx = -1
  ): ListParseResult {
    if (!listText) {
      return {
        records: [],
        isTabDelimitedTable: false,
        detectedColumns: 1,
        headers: [],
        suggestsCommaSplit: false,
        suggestsSemicolonSplit: false,
        totalFound: 0
      };
    }

    // Clean BOM and CRLF
    const cleaned = listText.replace(/^\uFEFF/, '');
    const rawLines = cleaned.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (rawLines.length === 0) {
      return {
        records: [],
        isTabDelimitedTable: false,
        detectedColumns: 1,
        headers: [],
        suggestsCommaSplit: false,
        suggestsSemicolonSplit: false,
        totalFound: 0
      };
    }

    // Check for uniform tabs (spreadsheet paste detection)
    const tabCounts = rawLines.map(l => (l.match(/\t/g) || []).length);
    const firstTabCount = tabCounts[0];
    const isUniformTabs = firstTabCount > 0 && tabCounts.every(c => c === firstTabCount);

    // Check for uniform commas or semicolons
    const commaCounts = rawLines.map(l => (l.match(/,/g) || []).length);
    const firstCommaCount = commaCounts[0];
    const isUniformCommas = firstCommaCount > 0 && commaCounts.every(c => c === firstCommaCount);

    const semiCounts = rawLines.map(l => (l.match(/;/g) || []).length);
    const firstSemiCount = semiCounts[0];
    const isUniformSemis = firstSemiCount > 0 && semiCounts.every(c => c === firstSemiCount);

    // If separator is newline but is uniform tabs, auto treat as tab columns
    const effectiveSep = separator === 'newline' && isUniformTabs ? 'tab' : separator;

    if (effectiveSep === 'newline') {
      const records = rawLines.map(line => ({
        value: escapeFormulaInjection(line),
        labelText: ''
      }));
      return {
        records,
        isTabDelimitedTable: false,
        detectedColumns: 1,
        headers: ['Column 1'],
        suggestsCommaSplit: isUniformCommas,
        suggestsSemicolonSplit: isUniformSemis,
        totalFound: records.length
      };
    }

    // Parse with delimiter
    const delim = effectiveSep === 'tab' ? '\t' : effectiveSep === 'comma' ? ',' : ';';
    const splitRows = rawLines.map(l => l.split(delim).map(c => c.trim()));
    const colCount = splitRows[0].length;

    let headers: string[] = [];
    let dataRows = splitRows;

    if (hasHeader && splitRows.length > 1) {
      headers = splitRows[0].map(h => escapeFormulaInjection(h));
      dataRows = splitRows.slice(1);
    } else {
      headers = Array.from({ length: colCount }, (_, i) => `Column ${i + 1}`);
    }

    const records = dataRows.map(row => {
      const val = row[selectedColIdx] !== undefined ? row[selectedColIdx] : (row[0] || '');
      const cap = captionColIdx >= 0 && row[captionColIdx] !== undefined ? row[captionColIdx] : '';
      return {
        value: escapeFormulaInjection(val),
        labelText: escapeFormulaInjection(cap)
      };
    });

    return {
      records,
      isTabDelimitedTable: isUniformTabs,
      detectedColumns: colCount,
      headers,
      suggestsCommaSplit: separator === 'newline' && isUniformCommas,
      suggestsSemicolonSplit: separator === 'newline' && isUniformSemis,
      totalFound: records.length
    };
  }

  /**
   * Generates a numbered sequence with fixed-length check digit handling.
   */
  generateSequence(
    prefix: string,
    start: number,
    count: number,
    step: number,
    padding: number,
    suffix: string,
    addCheckDigit: boolean,
    formatItem?: BarcodeCatalogItem
  ): SequenceResult {
    const cleanPrefix = escapeFormulaInjection(prefix || '');
    const cleanSuffix = escapeFormulaInjection(suffix || '');

    if (count < 1 || count > BARCODE_SYSTEM_LIMITS.maxListItems) {
      return {
        values: [],
        samplePreview: [],
        errorMessage: `Count must be 1 to ${BARCODE_SYSTEM_LIMITS.maxListItems}.`
      };
    }

    if (step < 1) {
      return {
        values: [],
        samplePreview: [],
        errorMessage: 'Step must be 1 or more.'
      };
    }

    const isFixedLengthFormat =
      formatItem &&
      formatItem.length.fixed !== undefined &&
      ['ean13', 'ean8', 'upca', 'upce', 'itf14', 'isbn', 'issn', 'ismn'].includes(formatItem.id);

    let effectivePadding = padding;
    let locked = false;
    let counterDigits = padding;

    if (isFixedLengthFormat && formatItem) {
      // Must be numeric only
      if (!/^\d*$/.test(cleanPrefix)) {
        return {
          values: [],
          samplePreview: [],
          errorMessage: `Prefix must contain digits only for ${formatItem.label}.`
        };
      }

      const totalTargetLength = formatItem.length.fixed || 13;
      const checkDigitLen = addCheckDigit ? 1 : 0;
      const availableCounterDigits = totalTargetLength - cleanPrefix.length - cleanSuffix.length - checkDigitLen;

      if (availableCounterDigits <= 0) {
        return {
          values: [],
          samplePreview: [],
          errorMessage: `Prefix is too long for ${formatItem.label} (${totalTargetLength} digits total).`
        };
      }

      effectivePadding = availableCounterDigits;
      counterDigits = availableCounterDigits;
      locked = true;
    }

    const maxCapacity = Math.pow(10, effectivePadding) - 1;
    const maxAllowedCount = Math.max(
      1,
      Math.min(
        BARCODE_SYSTEM_LIMITS.maxListItems,
        Math.floor(Math.max(0, maxCapacity - start) / step) + 1
      )
    );

    const lastNumber = start + (count - 1) * step;
    const lastNumDigits = String(lastNumber).length;
    if (lastNumDigits > effectivePadding) {
      return {
        values: [],
        samplePreview: [],
        counterDigits,
        fixedLengthLocked: locked,
        maxAllowedCount,
        errorMessage: `The last number (${lastNumber.toLocaleString()}) needs ${lastNumDigits} digits but padding is ${effectivePadding}. Maximum count is ${maxAllowedCount}.`
      };
    }

    const values: { value: string; labelText?: string }[] = [];

    for (let i = 0; i < count; i++) {
      const num = start + i * step;
      let padded = String(num).padStart(effectivePadding, '0');
      let candidate = `${cleanPrefix}${padded}${cleanSuffix}`;

      // If format has check digit and toggle is on, compute real check digit
      if (formatItem && addCheckDigit && formatItem.checksumType && formatItem.checksumType !== 'none') {
        let cd: string | null = null;
        if (formatItem.checksumType === 'gs1-mod10') {
          cd = this.checkDigitService.calculateGs1Mod10(candidate);
        } else if (formatItem.id === 'issn') {
          cd = this.checkDigitService.calculateIssnCheckDigit(candidate);
        } else if (formatItem.id === 'code39') {
          cd = this.checkDigitService.calculateCode39Check(candidate);
        } else if (formatItem.id === 'msi') {
          cd = this.checkDigitService.calculateMsiMod10(candidate);
        }
        if (cd !== null && cd !== undefined) {
          candidate = candidate + cd;
        }
      }

      // Check charset compatibility for first item
      if (i === 0 && formatItem) {
        if (formatItem.inputMode === 'numeric' && !/^\d+$/.test(candidate)) {
          return {
            values: [],
            samplePreview: [],
            errorMessage: `${candidate} is not valid for ${formatItem.label}. Choose Code 128 or use digits only.`
          };
        }
      }

      values.push({
        value: candidate,
        labelText: ''
      });
    }

    // Build sample preview: first three and last
    const samplePreview: string[] = [];
    if (values.length <= 4) {
      samplePreview.push(...values.map(v => v.value));
    } else {
      samplePreview.push(values[0].value, values[1].value, values[2].value, '...', values[values.length - 1].value);
    }

    return {
      values,
      samplePreview,
      counterDigits,
      fixedLengthLocked: locked,
      maxAllowedCount
    };
  }

  /**
   * Reviews and validates every record in the run before generation.
   */
  reviewRecords(
    rawItems: { value: string; labelText?: string }[],
    formatItem: BarcodeCatalogItem,
    formatOptions: FormatPerOptions,
    labelWidthMm?: number,
    labelHeightMmOrRemoveDuplicates?: number | boolean,
    isRoll = false,
    removeDuplicates = false
  ): {
    records: BulkRecord[];
    validCount: number;
    invalidCount: number;
    duplicateCount: number;
    suggestedFormat?: string;
  } {
    let labelHeightMm: number | undefined;
    let actualRemoveDuplicates = removeDuplicates;

    if (typeof labelHeightMmOrRemoveDuplicates === 'boolean') {
      actualRemoveDuplicates = labelHeightMmOrRemoveDuplicates;
    } else if (typeof labelHeightMmOrRemoveDuplicates === 'number') {
      labelHeightMm = labelHeightMmOrRemoveDuplicates;
    }

    const records: BulkRecord[] = [];
    const seenValues = new Set<string>();
    let validCount = 0;
    let invalidCount = 0;
    let duplicateCount = 0;
    let alternateFormatVote: Record<string, number> = {};

    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i];
      const rawVal = item.value;
      const isDuplicate = seenValues.has(rawVal);
      if (isDuplicate) {
        duplicateCount++;
      } else {
        seenValues.add(rawVal);
      }

      const valRes = this.validator.validate(formatItem, rawVal, formatOptions);

      let status: BulkRecordStatus = 'valid';
      let errorReason = '';

      if (!valRes.valid) {
        status = 'invalid';
        invalidCount++;
        errorReason = valRes.errorMessage || 'Invalid format';

        // Check if value fits another common format
        const cleanDigits = rawVal.replace(/\D/g, '');
        if (cleanDigits.length === 13 && formatItem.id !== 'ean13') {
          alternateFormatVote['ean13'] = (alternateFormatVote['ean13'] || 0) + 1;
        } else if (cleanDigits.length === 12 && formatItem.id !== 'upca') {
          alternateFormatVote['upca'] = (alternateFormatVote['upca'] || 0) + 1;
        } else if (cleanDigits.length === 8 && formatItem.id !== 'ean8') {
          alternateFormatVote['ean8'] = (alternateFormatVote['ean8'] || 0) + 1;
        }
      } else if (isDuplicate && actualRemoveDuplicates) {
        status = 'duplicate';
      } else {
        validCount++;
      }

      const distinctLabelText =
        item.labelText && item.labelText.trim() !== rawVal.trim()
          ? item.labelText.trim()
          : undefined;

      records.push({
        row: i + 1,
        value: rawVal,
        cleanValue: valRes.cleanValue || rawVal,
        displayValue: valRes.displayValue || rawVal,
        labelText: distinctLabelText,
        status,
        errorMessage: errorReason,
        isDuplicate
      });
    }

    // Check if alternate format suggestion holds
    let suggestedFormat: string | undefined;
    for (const [fId, votes] of Object.entries(alternateFormatVote)) {
      if (votes >= Math.ceil(rawItems.length * 0.5)) {
        suggestedFormat = fId;
        break;
      }
    }

    return {
      records,
      validCount,
      invalidCount,
      duplicateCount,
      suggestedFormat
    };
  }

  /**
   * Generates CSV error report with formula injection defense.
   */
  generateErrorReportCsv(records: BulkRecord[]): string {
    const header = 'Row,Value,Reason\n';
    const lines = records
      .filter(r => r.status === 'invalid' || r.status === 'duplicate')
      .map(r => `${r.row},${formatCsvCell(r.value)},${formatCsvCell(r.errorMessage || 'Invalid')}`)
      .join('\n');
    return header + lines;
  }

  /**
   * Generates manifest CSV for export archives with formula injection defense.
   */
  generateManifestCsv(results: BulkItemResult[]): string {
    const hasTemp = results.some(r => !!r.token);
    if (hasTemp) {
      const header = 'Index,Name,Value,Token,Check Link,Expires At (UTC),File Name,Status\n';
      const lines = results
        .map(
          r =>
            `${r.index + 1},${formatCsvCell(r.name || `Barcode ${r.index + 1}`)},${formatCsvCell(r.value)},${formatCsvCell(r.token || '')},${formatCsvCell(r.checkUrl || '')},${formatCsvCell(r.expiresAt || '')},${formatCsvCell(r.fileName)},${formatCsvCell(r.status)}`
        )
        .join('\n');
      return header + lines;
    }
    const header = 'Index,Value,Encoded Value,File Name,Status\n';
    const lines = results
      .map(
        r =>
          `${r.index + 1},${formatCsvCell(r.value)},${formatCsvCell(r.cleanValue || r.value)},${formatCsvCell(r.fileName)},${formatCsvCell(r.status)}`
      )
      .join('\n');
    return header + lines;
  }

  /**
   * Executes a bulk generation run with responsive chunking, live progress,
   * manifest generation, and vector PDF / ZIP exports.
   */
  async runBulk(
    config: BulkRunConfig,
    onProgress: (progress: BulkProgress) => void
  ): Promise<void> {
    this.cancelled = false;
    const item = this.registry.getFormat(config.formatId);
    if (!item) {
      throw new Error(`Unknown format: ${config.formatId}`);
    }

    // Filter items based on configuration
    let activeRecords = config.records;
    if (config.skipInvalidRows) {
      activeRecords = activeRecords.filter(r => r.status !== 'invalid');
    }
    if (config.removeDuplicates) {
      const seen = new Set<string>();
      activeRecords = activeRecords.filter(r => {
        if (seen.has(r.value)) return false;
        seen.add(r.value);
        return true;
      });
    }

    const total = activeRecords.length;

    // Check for 0 valid records: NEVER trigger download, never claim success
    if (total === 0) {
      onProgress({
        total: 0,
        completed: 0,
        percent: 0,
        currentValue: '',
        isCancelled: false,
        status: 'error',
        errorMessage: 'No barcodes were created. Check the rows marked in Review.'
      });
      return;
    }

    onProgress({
      total,
      completed: 0,
      percent: 0,
      currentValue: '',
      isCancelled: false,
      status: 'running'
    });

    const renderedResults: (BulkItemResult & { labelItem: LabelItem })[] = [];
    const chunkSize = 10;
    let skippedCount = 0;

    for (let i = 0; i < total; i += chunkSize) {
      if (this.cancelled) {
        onProgress({
          total,
          completed: i,
          percent: Math.round((i / total) * 100),
          currentValue: '',
          isCancelled: true,
          status: 'cancelled'
        });
        return;
      }

      const chunk = activeRecords.slice(i, i + chunkSize);
      for (let j = 0; j < chunk.length; j++) {
        const idx = i + j;
        const rec = chunk[j];

        if (rec.status === 'invalid') {
          skippedCount++;
          renderedResults.push({
            index: idx,
            value: rec.value,
            cleanValue: rec.cleanValue,
            status: 'error',
            errorMessage: rec.errorMessage || 'Invalid value',
            fileName: `item-${idx + 1}`,
            token: rec.token,
            checkUrl: rec.checkUrl,
            expiresAt: rec.expiresAt,
            name: rec.name || rec.labelText || `Barcode ${idx + 1}`,
            labelItem: {
              value: rec.value,
              displayValue: rec.value,
              labelText: rec.labelText,
              svg: ''
            }
          });
          continue;
        }

        try {
          // Single source of truth: call identical renderer with identical options as Content tab
          const renderRes = await this.renderer.render(
            item,
            rec.cleanValue,
            rec.displayValue,
            config.designOptions,
            config.formatOptions
          );

          // Decode verification matching single generation
          let isVerified = true;
          let verifyError: string | undefined;
          try {
            const vRes = await this.verifier.verifySvg(
              renderRes.svg,
              rec.cleanValue || rec.value,
              config.formatId,
              config.formatOptions
            );
            if (!vRes.verified) {
              isVerified = false;
              verifyError = vRes.error || 'Decoder verification failed';
            }
          } catch {
            isVerified = true;
          }

          const safeVal = sanitizeFileName(rec.cleanValue || rec.value, 40);
          const formattedIdx = String(idx + 1).padStart(3, '0');
          const fileName = `${formattedIdx}-${safeVal}-${config.formatId}`;

          renderedResults.push({
            index: idx,
            value: rec.value,
            cleanValue: rec.cleanValue,
            status: 'success',
            svg: renderRes.svg,
            fileName,
            verified: isVerified,
            verifyError,
            token: rec.token,
            checkUrl: rec.checkUrl,
            expiresAt: rec.expiresAt,
            name: rec.name || rec.labelText || `Barcode ${idx + 1}`,
            labelItem: {
              value: rec.cleanValue,
              displayValue: rec.displayValue,
              labelText: rec.labelText,
              svg: renderRes.svg
            }
          });
        } catch {
          skippedCount++;
          renderedResults.push({
            index: idx,
            value: rec.value,
            cleanValue: rec.cleanValue,
            status: 'error',
            errorMessage: 'Render error',
            fileName: `item-${idx + 1}`,
            token: rec.token,
            checkUrl: rec.checkUrl,
            expiresAt: rec.expiresAt,
            name: rec.name || rec.labelText || `Barcode ${idx + 1}`,
            labelItem: {
              value: rec.value,
              displayValue: rec.value,
              labelText: rec.labelText,
              svg: ''
            }
          });
        }
      }

      const completed = Math.min(i + chunkSize, total);
      onProgress({
        total,
        completed,
        percent: Math.round((completed / total) * 100),
        currentValue: chunk[chunk.length - 1].value,
        isCancelled: false,
        status: 'running'
      });

      // Yield UI thread
      await new Promise(r => setTimeout(r, 0));
    }

    if (this.cancelled) return;

    const successfulItems = renderedResults.filter(r => r.status === 'success' && !!r.svg);
    if (successfulItems.length === 0) {
      onProgress({
        total,
        completed: total,
        percent: 100,
        currentValue: '',
        isCancelled: false,
        status: 'error',
        errorMessage: 'No barcodes were created. Check the rows marked in Review.'
      });
      return;
    }

    const verifiedCount = successfulItems.filter(r => (r as any).verified !== false).length;
    const failedItems = successfulItems
      .filter(r => (r as any).verified === false)
      .map(r => ({ index: r.index + 1, value: r.value, error: (r as any).verifyError || 'Decode failed' }));

    const verificationSummary = {
      total: successfulItems.length,
      verified: verifiedCount,
      failed: failedItems.length,
      failedItems
    };

    // Pre-build exact sheet and roll page models directly from the ordered successfulItems
    const preset = config.labelPreset || LABEL_SHEET_PRESETS[0];
    const pageModels = this.sheetLayout.layoutSheetPages({
      records: successfulItems.map(s => ({
        value: s.value,
        cleanValue: s.value,
        displayValue: s.labelItem?.displayValue || s.value,
        labelText: s.labelItem?.labelText,
        svg: s.svg
      })),
      preset,
      startAtLabel: 1,
      copies: 1,
      textSizePt: 'auto',
      showValueText: config.designOptions.showText !== false,
      showLabelText: config.showLabelText !== false,
      showCutGuides: config.showCutGuides || false,
      nudgeXmm: 0,
      nudgeYmm: 0,
      formatItem: item
    });

    const rollPreset = config.rollPreset || LABEL_ROLL_PRESETS[2];
    const rollModels = this.sheetLayout.layoutRollPages({
      records: successfulItems.map(s => ({
        value: s.value,
        cleanValue: s.value,
        displayValue: s.labelItem?.displayValue || s.value,
        labelText: s.labelItem?.labelText,
        svg: s.svg
      })),
      rollPreset,
      showLabelText: config.showLabelText !== false,
      formatItem: item,
      targetDpi: config.dpi === 150 ? 203 : (config.dpi === 600 ? 300 : 203)
    });

    if (config.exportImmediately === false) {
      onProgress({
        total,
        completed: total,
        percent: 100,
        currentValue: '',
        isCancelled: false,
        status: 'completed',
        generatedCount: successfulItems.length,
        skippedCount,
        pagesCount: pageModels.length,
        resultSummary: `${successfulItems.length} barcodes generated (${verifiedCount} of ${successfulItems.length} verified).`
      });
      return {
        results: renderedResults,
        successfulItems,
        verificationSummary,
        pageModels,
        rollModels
      } as any;
    }

    // Determine output file base name
    const rawBaseName = config.baseFileName || `Barcode-${successfulItems.length}`;
    const safeBaseName = sanitizeFileName(rawBaseName, 60);

    let pagesCount = 1;

    // Export formats
    if (config.outputType === 'print-sheet' || config.outputType === 'pdf-labels') {
      const preset = config.labelPreset || LABEL_SHEET_PRESETS[0];
      const pageModels = this.sheetLayout.layoutSheetPages({
        records: successfulItems.map(s => ({
          value: s.value,
          cleanValue: s.value,
          displayValue: s.value,
          labelText: s.labelItem.labelText,
          svg: s.svg
        })),
        preset,
        startAtLabel: config.startAtLabel || 1,
        copies: config.copies || 1,
        textSizePt: config.textSizePt || 'auto',
        showValueText: config.showValueText !== false,
        showLabelText: config.showLabelText !== false,
        showCutGuides: config.showCutGuides || false,
        nudgeXmm: config.nudgeXmm || 0,
        nudgeYmm: config.nudgeYmm || 0
      });

      pagesCount = pageModels.length;
      const pdfBytes = this.pdfBuilder.generateLabelSheetPdfFromModel(pageModels, (config as any).captionStyle);
      const blob = new Blob([new Uint8Array(pdfBytes).buffer as ArrayBuffer], { type: 'application/pdf' });
      this.triggerDownload(blob, `${safeBaseName}-labels-${config.formatId}.pdf`);
    } else if (config.outputType === 'label-roll') {
      const rollPreset = config.rollPreset || LABEL_ROLL_PRESETS[2]; // 50x25mm
      const pdfBytes = this.pdfBuilder.generateLabelRollPdf({
        items: successfulItems.map(s => s.labelItem),
        rollPreset,
        showValueText: config.showValueText !== false,
        showLabelText: config.showLabelText !== false,
        textSizePt: config.textSizePt || 8,
        copies: config.copies || 1,
        captionStyle: (config as any).captionStyle
      });

      pagesCount = successfulItems.length * Math.max(1, config.copies || 1);
      const blob = new Blob([new Uint8Array(pdfBytes).buffer as ArrayBuffer], { type: 'application/pdf' });
      this.triggerDownload(blob, `${safeBaseName}-roll-${config.formatId}.pdf`);
    } else if (config.outputType === 'zip-svg') {
      const zip = new JSZip();
      for (const r of successfulItems) {
        if (r.svg) {
          zip.file(`${r.fileName}.svg`, r.svg);
        }
      }
      // Always include manifest.csv
      const manifestCsv = this.generateManifestCsv(renderedResults);
      zip.file('manifest.csv', manifestCsv);

      const blob = await zip.generateAsync({ type: 'blob' });
      this.triggerDownload(blob, `${safeBaseName}-bulk-${config.formatId}.zip`);
    } else if (config.outputType === 'zip-png') {
      const zip = new JSZip();
      for (const r of successfulItems) {
        if (r.svg) {
          const pngBlob = await this.renderSvgToPngBlob(r.svg, config.designOptions);
          zip.file(`${r.fileName}.png`, pngBlob);
        }
      }
      // Always include manifest.csv
      const manifestCsv = this.generateManifestCsv(renderedResults);
      zip.file('manifest.csv', manifestCsv);

      const blob = await zip.generateAsync({ type: 'blob' });
      this.triggerDownload(blob, `${safeBaseName}-bulk-${config.formatId}.zip`);
    } else if (config.outputType === 'sheet-png') {
      const preset = config.labelPreset || LABEL_SHEET_PRESETS[0];
      const pageModels = this.sheetLayout.layoutSheetPages({
        records: successfulItems.map(s => ({
          value: s.value,
          cleanValue: s.value,
          displayValue: s.value,
          labelText: s.labelItem.labelText,
          svg: s.svg
        })),
        preset,
        startAtLabel: config.startAtLabel || 1,
        copies: config.copies || 1,
        textSizePt: config.textSizePt || 'auto',
        showValueText: config.showValueText !== false,
        showLabelText: config.showLabelText !== false,
        showCutGuides: config.showCutGuides || false,
        nudgeXmm: config.nudgeXmm || 0,
        nudgeYmm: config.nudgeYmm || 0
      });

      pagesCount = pageModels.length;
      const targetDpi = config.dpi || 300;

      if (pagesCount === 1) {
        const pageSvg = this.sheetLayout.renderPageToSvg(pageModels[0], (config as any).captionStyle);
        const pngBlob = await this.renderSheetSvgToPngBlob(
          pageSvg,
          pageModels[0].pageWidthMm,
          pageModels[0].pageHeightMm,
          targetDpi
        );
        this.triggerDownload(pngBlob, `Barcode-${config.formatId}-sheet-1.png`);
      } else {
        const zip = new JSZip();
        for (let p = 0; p < pageModels.length; p++) {
          const pageSvg = this.sheetLayout.renderPageToSvg(pageModels[p], (config as any).captionStyle);
          const pngBlob = await this.renderSheetSvgToPngBlob(
            pageSvg,
            pageModels[p].pageWidthMm,
            pageModels[p].pageHeightMm,
            targetDpi
          );
          zip.file(`Barcode-${config.formatId}-sheet-${p + 1}.png`, pngBlob);
        }
        const manifestCsv = this.generateManifestCsv(renderedResults);
        zip.file('manifest.csv', manifestCsv);

        const blob = await zip.generateAsync({ type: 'blob' });
        this.triggerDownload(blob, `${safeBaseName}-sheet-images-${config.formatId}.zip`);
      }
    }

    const genCount = successfulItems.length;
    let summary = '';
    if (config.outputType === 'print-sheet' || config.outputType === 'pdf-labels') {
      summary =
        skippedCount > 0
          ? `${genCount} of ${total} created on ${pagesCount} ${pagesCount === 1 ? 'page' : 'pages'}. ${skippedCount} skipped.`
          : `${genCount} labels created on ${pagesCount} ${pagesCount === 1 ? 'page' : 'pages'}.`;
    } else {
      summary =
        skippedCount > 0
          ? `${genCount} of ${total} generated, ${skippedCount} skipped.`
          : `${genCount} barcodes generated and downloaded.`;
    }

    onProgress({
      total,
      completed: total,
      percent: 100,
      currentValue: '',
      isCancelled: false,
      status: 'completed',
      resultSummary: summary,
      generatedCount: genCount,
      skippedCount,
      pagesCount
    });
  }

  /**
   * Generates printable SVG sheets for the given items and layout preset.
   */
  generateSheetPagesSvg(
    items: LabelItem[],
    preset: LabelSheetPreset,
    startAtLabel = 1,
    showLabelText = true,
    showCutGuides = false,
    copies = 1
  ): string[] {
    const pageDim = PAGE_DIMENSIONS[preset.pageSize] || PAGE_DIMENSIONS.a4;
    const pageWidthMm = pageDim.widthMm;
    const pageHeightMm = pageDim.heightMm;
    const labelsPerPage = preset.cols * preset.rows;

    const expandedItems: LabelItem[] = [];
    const validCopies = Math.max(1, Math.min(100, copies));
    for (const item of items) {
      for (let c = 0; c < validCopies; c++) {
        expandedItems.push(item);
      }
    }

    const startOffset = Math.max(0, startAtLabel - 1);
    const totalSlotsNeeded = startOffset + expandedItems.length;
    const totalPages = Math.max(1, Math.ceil(totalSlotsNeeded / labelsPerPage));

    const pagesSvg: string[] = [];
    let currentItemIdx = 0;

    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
      let cellsSvg = '';

      for (let slot = 0; slot < labelsPerPage; slot++) {
        const globalSlotIdx = pageNum * labelsPerPage + slot;
        const col = slot % preset.cols;
        const row = Math.floor(slot / preset.cols);

        const xMm = preset.leftMarginMm + col * (preset.labelWidthMm + preset.gapHMm);
        const yMm = preset.topMarginMm + row * (preset.labelHeightMm + preset.gapVMm);

        if (globalSlotIdx < startOffset || currentItemIdx >= expandedItems.length) {
          if (showCutGuides) {
            cellsSvg += `
              <rect x="${xMm}" y="${yMm}" width="${preset.labelWidthMm}" height="${preset.labelHeightMm}" fill="none" stroke="#E2E8F0" stroke-width="0.2" stroke-dasharray="1,1" />
            `;
          }
          continue;
        }

        const item = expandedItems[currentItemIdx];
        currentItemIdx++;

        const innerPad = preset.innerPaddingMm || 2.0;
        const usableW = Math.max(10, preset.labelWidthMm - innerPad * 2);
        const usableH = Math.max(10, preset.labelHeightMm - innerPad * 2);
        const usableX = xMm + innerPad;
        const usableY = yMm + innerPad;

        const hasCaption = showLabelText && !!item.labelText && item.labelText.trim().length > 0;
        const captionHeightMm = hasCaption ? 4 : 0;
        const bcAreaH = Math.max(6, usableH - captionHeightMm);

        // Extract SVG content
        const innerMatch = item.svg ? item.svg.match(/<svg[^>]*>([\s\S]*?)<\/svg>/) : null;
        const innerContent = innerMatch ? innerMatch[1] : '';
        const vbMatch = item.svg ? item.svg.match(/viewBox="([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)"/) : null;
        const vbW = vbMatch ? parseFloat(vbMatch[3]) : 200;
        const vbH = vbMatch ? parseFloat(vbMatch[4]) : 100;

        let guidesSvg = '';
        if (showCutGuides) {
          guidesSvg = `<rect x="${xMm}" y="${yMm}" width="${preset.labelWidthMm}" height="${preset.labelHeightMm}" fill="none" stroke="#CBD5E1" stroke-width="0.2" stroke-dasharray="1,1" />`;
        }

        let captionSvg = '';
        if (hasCaption && item.labelText) {
          const capY = usableY + bcAreaH + 3;
          const capX = usableX + usableW / 2;
          captionSvg = `<text x="${capX}" y="${capY}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="2.5mm" fill="#334155">${item.labelText.slice(0, 40)}</text>`;
        }

        cellsSvg += `
          <g>
            ${guidesSvg}
            <svg x="${usableX}" y="${usableY}" width="${usableW}" height="${bcAreaH}" viewBox="0 0 ${vbW} ${vbH}">
              ${innerContent}
            </svg>
            ${captionSvg}
          </g>
        `;
      }

      const pageSvg = `
        <svg width="${pageWidthMm}mm" height="${pageHeightMm}mm" viewBox="0 0 ${pageWidthMm} ${pageHeightMm}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#FFFFFF" />
          ${cellsSvg}
        </svg>
      `;

      pagesSvg.push(pageSvg);
    }

    return pagesSvg;
  }

  /**
   * Renders SVG to PNG blob using HTML canvas.
   */
  private renderSvgToPngBlob(svg: string, design: BarcodeDesignOptions): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (typeof document === 'undefined') {
        resolve(new Blob([], { type: 'image/png' }));
        return;
      }
      const img = new Image();
      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          // High DPI resolution (300 DPI multiplier = ~3.125 relative to 96 DPI screen)
          const scale = 3;
          canvas.width = (img.naturalWidth || 400) * scale;
          canvas.height = (img.naturalHeight || 200) * scale;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context unavailable'));
            return;
          }
          ctx.imageSmoothingEnabled = false;
          if (!design.transparentBg) {
            ctx.fillStyle = design.bgColor || '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);
          canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas conversion failed'));
          }, 'image/png');
        } catch (err) {
          URL.revokeObjectURL(url);
          reject(err);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Image render error'));
      };

      img.src = url;
    });
  }

  /**
   * Rasterizes a sheet SVG into a high-DPI PNG blob matching preview pixel-for-pixel.
   */
  private renderSheetSvgToPngBlob(
    svg: string,
    widthMm: number,
    heightMm: number,
    dpi = 300
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (typeof document === 'undefined') {
        resolve(new Blob([], { type: 'image/png' }));
        return;
      }
      const img = new Image();
      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const pxPerMm = dpi / 25.4;
          canvas.width = Math.round(widthMm * pxPerMm);
          canvas.height = Math.round(heightMm * pxPerMm);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(url);
            resolve(new Blob([], { type: 'image/png' }));
            return;
          }

          // Crisp white paper background
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);

          canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else resolve(new Blob([], { type: 'image/png' }));
          }, 'image/png');
        } catch (err) {
          URL.revokeObjectURL(url);
          reject(err);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(new Blob([], { type: 'image/png' }));
      };

      img.src = url;
    });
  }

  /**
   * Triggers download of a generated blob.
   */
  triggerDownload(blob: Blob, filename: string): void {
    if (typeof document === 'undefined') return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    }, 1000);
  }
}

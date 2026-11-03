// apps/tool-barcode-generator/src/models/barcode.models.ts

export type BarcodeCategory =
  | 'Popular'
  | 'Retail'
  | 'General and logistics'
  | 'Industrial'
  | '2D'
  | 'GS1 DataBar'
  | 'Healthcare'
  | 'Postal'
  | 'Payments';

export interface FormatVariant {
  id: string;
  label: string;
  description: string;
  engineId?: string;
  defaultOptions?: Record<string, any>;
  pattern?: RegExp;
  exactLengths?: number[];
  minLength?: number;
  maxLength?: number;
  helperChip?: string;
  helperLine?: string;
  exampleValue?: string;
  messages?: {
    charset?: string;
    length?: string;
    pattern?: string;
    checksum?: string;
  };
}

export type BarcodeSizingKind = 'linear-fixed' | 'linear-variable' | 'stacked' | 'matrix';

export interface BarcodeSizingProfile {
  kind: BarcodeSizingKind;
  /** Minimum module width X in mm. Values to verify against standard specifications. */
  minXmm: number;
  /** Maximum module width X in mm. Values to verify against standard specifications. */
  maxXmm: number;
  /** Quiet zone in modules on each side. */
  quietZoneModules: number;
  /** Minimum bar height in mm. */
  minBarHeightMm: number;
  /** Maximum bar height share of label inner height (0.5 to 0.85). */
  maxHeightShare?: number;
  /** Target fill share of inner width for variable-width formats (0.7 to 0.95). */
  targetWidthShare?: number;
  /** For fixed-size formats: nominal width in mm at 100% magnification. */
  nominalWidthMm?: number;
  /** For fixed-size formats: nominal height in mm at 100% magnification. */
  nominalHeightMm?: number;
  /** For fixed-size formats: nominal module width X in mm at 100% magnification (defaults to 0.33mm for retail). */
  nominalXmm?: number;
  /** For fixed-size formats: minimum allowed magnification (e.g. 0.80 for 80%). */
  allowedMagMin?: number;
  /** For fixed-size formats: maximum allowed magnification (e.g. 2.00 for 200%). */
  allowedMagMax?: number;
  /** For fixed-size formats: minimum allowed bar height share of nominal (e.g. 0.60 for 60%). */
  minHeightShare?: number;
}

export interface SequenceProfile {
  sequenceSupport: 'full' | 'limited' | 'none';
  prefixCharset?: RegExp;
  suffixAllowed: boolean;
  lockedPrefix?: string;
  digitsBeforeCheck?: number;
  defaultPrefix: string;
  defaultStart: number;
  counterLengthRule?: 'exact' | 'variable';
  defaultPadding?: number;
  structureHelperText: string;
}

export interface BarcodeCatalogItem {
  id: string;
  slug: string;
  label: string;
  aliases: string[];
  category: BarcodeCategory;
  family: string;
  variants?: FormatVariant[];
  tier: 1 | 2 | 3;
  enabled: boolean;
  description: string; // 8 words or fewer
  inputMode: 'text' | 'numeric' | 'structured';
  charset: string;
  charsetRegex: RegExp;
  caseMode?: 'upper' | 'lower' | 'preserve';
  normalizeSeparators?: boolean;
  length: {
    min: number;
    max: number;
    fixed?: number;
    evenOnly?: boolean;
    exactLengths?: number[];
  };
  pattern?: RegExp;
  checksum?: string;
  checksumType?: 'gs1-mod10' | 'upce' | 'isbn10' | 'issn' | 'mod43' | 'code93' | 'mod16' | 'none';
  checksumOptional?: boolean;
  exampleValue: string;
  invalidExampleValue?: string;
  expectedEncoded?: (input: string, options?: FormatPerOptions) => string;
  expectedDecoded?: (input: string, options?: FormatPerOptions) => string;
  defaultOptions: FormatPerOptions;
  options?: FormatOptionDeclaration[];
  engineId: string;
  supportsHumanReadable: boolean;
  is2D: boolean;
  standardRef: string;
  shortHelper?: string;
  fixedLength?: number;
  isSensitive?: boolean;
  sequenceProfile?: SequenceProfile;
  sizingProfile?: BarcodeSizingProfile;
  messages?: {
    charset?: string;
    length?: string;
    pattern?: string;
    checksum?: string;
  };
  usePageContent: {
    summary: string;
    commonUses: string;
    characterSet: string;
    length: string;
    checkDigit: string;
    faqs: Array<{ question: string; answer: string }>;
  };
}

export type BarcodeFormat = string;

export interface FormatOptionDeclaration {
  id: string;
  label: string;
  type: 'select' | 'boolean' | 'number' | 'text';
  allowedValues: Array<string | number | boolean>;
  default: string | number | boolean;
  engineOption: string;
  affectsOutput: boolean;
  description: string;
}

export interface FormatPerOptions {
  includeCheckDigit?: boolean;
  bearerBars?: 'none' | 'top-bottom' | 'frame';
  codabarStart?: 'A' | 'B' | 'C' | 'D';
  codabarStop?: 'A' | 'B' | 'C' | 'D';
  upceCompress?: boolean;
  autoPrependZero?: boolean;
  variant?: string;
  addon?: string; // 2 or 5 digit add-on for retail
  addonType?: 'none' | 'ean2' | 'ean5';
  msiCheck?: 'none' | 'mod10' | 'mod11' | 'mod1010';
  securityLevel?: number; // PDF417 (0..8)
  errorCorrectionPercent?: number; // Aztec (10, 30, 50)
  columns?: number; // PDF417
  shape?: 'square' | 'rectangular'; // Data Matrix
  segments?: number; // GS1 DataBar Expanded Stacked (2, 4, 6, 8)
}

export interface BarcodeDesignOptions {
  sizePreset: 'small' | 'standard' | 'large';
  scale?: number;
  unit: 'mm' | 'inch';
  widthMm: number;
  heightMm: number;
  dpi: number;
  barColor: string;
  bgColor: string;
  transparentBg: boolean;
  showText: boolean;
  textPosition: 'below' | 'above';
  fontSize: number;
  fontFamily: 'ocr-b' | 'monospace' | 'sans-serif';
  fontBold: boolean;
  eanGrouping: boolean;
  captionText: string;
  captionPosition: 'above' | 'below';
  quietZone: number;
  rotation: 0 | 90 | 180 | 270;
  frame: 'none' | 'thin';
}

export const DEFAULT_DESIGN_OPTIONS: BarcodeDesignOptions = {
  sizePreset: 'standard',
  unit: 'mm',
  widthMm: 37.3,
  heightMm: 25.9,
  dpi: 300,
  barColor: '#000000',
  bgColor: '#FFFFFF',
  transparentBg: false,
  showText: true,
  textPosition: 'below',
  fontSize: 10,
  fontFamily: 'ocr-b',
  fontBold: false,
  eanGrouping: true,
  captionText: '',
  captionPosition: 'above',
  quietZone: 10,
  rotation: 0,
  frame: 'none'
};

export interface BarcodeValidationResult {
  valid: boolean;
  cleanValue: string;
  displayValue: string;
  errorMessage?: string;
  checkDigitAdded?: string;
  suggestion?: string;
  suggestedAction?: 'prepend-zero' | 'uppercase' | 'convert-upce' | 'fix-check-digit' | 'strip-non-digits';
  suggestedCheckDigit?: string;
  suggestedFormat?: string;
  suggestQr?: boolean;
  isFixedLength?: boolean;
  currentLength?: number;
  targetLength?: number;
}

export interface BarcodeRenderResult {
  svg: string;
  rawSvg: string;
  width: number;
  height: number;
  encodedValue: string;
  displayValue: string;
}

export interface BarcodeVerificationResult {
  verified: boolean;
  decodedValue?: string;
  decoderUsed?: 'native' | 'zxing' | 'standard2of5';
  mismatch?: boolean;
  supported?: boolean;
  format?: string;
  formatDetected?: string;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

export type FormatRegistryItem = BarcodeCatalogItem;
export type SymbologyCategory = BarcodeCategory;

export interface BarcodeHistoryItem {
  id: string;
  timestamp: number;
  name: string;
  format: string;
  formatLabel: string;
  value: string;
  displayValue: string;
  options: BarcodeDesignOptions;
  formatOptions: FormatPerOptions;
  svg: string;
}

export interface BulkItemResult {
  index: number;
  value: string;
  status: 'success' | 'error';
  errorMessage?: string;
  svg?: string;
  fileName: string;
}

export type BulkOutputType =
  | 'print-sheet'
  | 'label-roll'
  | 'zip-png'
  | 'zip-svg'
  | 'sheet-png'
  // Legacy aliases
  | 'pdf-labels';

export type BulkSourceMode = 'list' | 'csv';

export type BulkRecordStatus = 'valid' | 'invalid' | 'duplicate';

export interface BulkRecord {
  row: number;
  value: string;
  cleanValue: string;
  displayValue: string;
  labelText?: string;
  status: BulkRecordStatus;
  errorMessage?: string;
  isDuplicate?: boolean;
  svg?: string;
}

export interface BulkRunOptions {
  mode: BulkSourceMode;
  format: string;
  formatOptions: FormatPerOptions;
  designOptions: BarcodeDesignOptions;
  listText?: string;
  csvData?: Array<Record<string, string>>;
  csvColumn?: string;
  outputType: BulkOutputType;
  labelLayout?: string;
}

export interface BulkCaptionStyle {
  fontSizePt: number | 'auto';
  color: string;
  bold: boolean;
  fontFamily: 'sans' | 'mono';
  transform: 'none' | 'uppercase';
  align: 'center' | 'left' | 'right';
}


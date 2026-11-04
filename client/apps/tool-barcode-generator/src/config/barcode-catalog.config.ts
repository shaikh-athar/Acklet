// apps/tool-barcode-generator/src/config/barcode-catalog.config.ts
import { BarcodeCatalogItem, BarcodeCategory, SequenceProfile, BarcodeSizingProfile } from '../models/barcode.models';
import { getToolUrl } from '@acklet/shared';

export const BARCODE_CATEGORIES: BarcodeCategory[] = [
  'Popular',
  'Retail',
  'General and logistics',
  'Industrial',
  '2D',
  'GS1 DataBar',
  'Healthcare',
  'Postal',
  'Payments'
];

export const POPULAR_FORMAT_IDS: string[] = [
  'code128',
  'ean13',
  'upca',
  'code39',
  'itf14',
  'isbn',
  'ean8',
  'datamatrix',
  'pdf417',
  'aztec'
];

export const BARCODE_SYSTEM_LIMITS = {
  maxListItems: 500,
  maxCanvasDimension: 4096,
  maxExportPixels: 16777216, // 4096 x 4096
  debounceMs: 150,
  maxHistoryItems: 20,
  maxRecentFormats: 5,
  defaultDpi: 300,
  qrToolUrl: getToolUrl('qr')
};

export const RETAIL_NOTICE =
  'Numbers used on products sold in stores must be issued by GS1. Codes made here are suitable for testing and internal use.';

export const ENCRYPTION_NOTICE =
  'Barcodes are not encrypted. Anyone who scans one can read its value.';

export const SEQUENCE_PROFILES: Record<string, SequenceProfile> = {
  code128: {
    sequenceSupport: 'full',
    prefixCharset: /^[\x20-\x7E]*$/,
    suffixAllowed: true,
    defaultPrefix: 'ITEM-',
    defaultStart: 1001,
    counterLengthRule: 'variable',
    defaultPadding: 4,
    structureHelperText: 'Prefix + counter + suffix'
  },
  ean13: {
    sequenceSupport: 'full',
    prefixCharset: /^\d*$/,
    suffixAllowed: false,
    digitsBeforeCheck: 12,
    defaultPrefix: '20',
    defaultStart: 1,
    counterLengthRule: 'exact',
    defaultPadding: 10,
    structureHelperText: 'Prefix (2) + counter (10) + check digit (1) = 13 digits'
  },
  ean8: {
    sequenceSupport: 'full',
    prefixCharset: /^\d*$/,
    suffixAllowed: false,
    digitsBeforeCheck: 7,
    defaultPrefix: '2',
    defaultStart: 1,
    counterLengthRule: 'exact',
    defaultPadding: 6,
    structureHelperText: 'Prefix (1) + counter (6) + check digit (1) = 8 digits'
  },
  upca: {
    sequenceSupport: 'full',
    prefixCharset: /^\d*$/,
    suffixAllowed: false,
    digitsBeforeCheck: 11,
    defaultPrefix: '04',
    defaultStart: 1,
    counterLengthRule: 'exact',
    defaultPadding: 9,
    structureHelperText: 'Prefix (2) + counter (9) + check digit (1) = 12 digits'
  },
  upce: {
    sequenceSupport: 'full',
    prefixCharset: /^[01]\d*$/,
    suffixAllowed: false,
    digitsBeforeCheck: 7,
    defaultPrefix: '0',
    defaultStart: 1,
    counterLengthRule: 'exact',
    defaultPadding: 6,
    structureHelperText: 'Prefix (1) + counter (6) + check digit (1) = 8 digits'
  },
  isbn: {
    sequenceSupport: 'full',
    prefixCharset: /^\d*$/,
    suffixAllowed: false,
    lockedPrefix: '978',
    digitsBeforeCheck: 12,
    defaultPrefix: '978',
    defaultStart: 1,
    counterLengthRule: 'exact',
    defaultPadding: 9,
    structureHelperText: 'Bookland (3) + counter (9) + check digit (1) = 13 digits'
  },
  issn: {
    sequenceSupport: 'full',
    prefixCharset: /^\d*$/,
    suffixAllowed: false,
    digitsBeforeCheck: 7,
    defaultPrefix: '',
    defaultStart: 1,
    counterLengthRule: 'exact',
    defaultPadding: 7,
    structureHelperText: 'Counter (7) + check digit (1) = 8 digits'
  },
  ismn: {
    sequenceSupport: 'full',
    prefixCharset: /^\d*$/,
    suffixAllowed: false,
    lockedPrefix: '9790',
    digitsBeforeCheck: 12,
    defaultPrefix: '9790',
    defaultStart: 1,
    counterLengthRule: 'exact',
    defaultPadding: 8,
    structureHelperText: 'Music prefix (4) + counter (8) + check digit (1) = 13 digits'
  },
  itf14: {
    sequenceSupport: 'full',
    prefixCharset: /^\d*$/,
    suffixAllowed: false,
    digitsBeforeCheck: 13,
    defaultPrefix: '10',
    defaultStart: 1,
    counterLengthRule: 'exact',
    defaultPadding: 11,
    structureHelperText: 'Indicator (1) + prefix (1) + counter (11) + check digit (1) = 14 digits'
  },
  itf: {
    sequenceSupport: 'full',
    prefixCharset: /^\d*$/,
    suffixAllowed: false,
    counterLengthRule: 'variable',
    defaultPrefix: '',
    defaultStart: 1000,
    defaultPadding: 6,
    structureHelperText: 'Numeric only (even number of total digits required)'
  },
  code39: {
    sequenceSupport: 'full',
    prefixCharset: /^[0-9A-Z\-.$/+% ]*$/,
    suffixAllowed: true,
    counterLengthRule: 'variable',
    defaultPrefix: 'A',
    defaultStart: 1001,
    defaultPadding: 4,
    structureHelperText: 'Uppercase letters, digits, and symbols'
  },
  code39ext: {
    sequenceSupport: 'full',
    prefixCharset: /^[\x00-\x7F]*$/,
    suffixAllowed: true,
    counterLengthRule: 'variable',
    defaultPrefix: 'A',
    defaultStart: 1001,
    defaultPadding: 4,
    structureHelperText: 'Full ASCII support'
  },
  code93: {
    sequenceSupport: 'full',
    prefixCharset: /^[0-9A-Z\-.$/+% ]*$/,
    suffixAllowed: true,
    counterLengthRule: 'variable',
    defaultPrefix: 'C93-',
    defaultStart: 1001,
    defaultPadding: 4,
    structureHelperText: 'Alphanumeric with dual check characters'
  },
  codabar: {
    sequenceSupport: 'full',
    prefixCharset: /^[0-9\-$:/.+]*$/,
    suffixAllowed: false,
    counterLengthRule: 'variable',
    defaultPrefix: '',
    defaultStart: 10001,
    defaultPadding: 6,
    structureHelperText: 'Digits and -$:/+. Guards (A..D) added automatically'
  },
  datamatrix: {
    sequenceSupport: 'full',
    prefixCharset: /^[\x00-\xFF]*$/,
    suffixAllowed: true,
    counterLengthRule: 'variable',
    defaultPrefix: 'DM-',
    defaultStart: 1001,
    defaultPadding: 4,
    structureHelperText: '2D matrix barcode'
  },
  pdf417: {
    sequenceSupport: 'full',
    prefixCharset: /^[\x00-\xFF]*$/,
    suffixAllowed: true,
    counterLengthRule: 'variable',
    defaultPrefix: 'PDF-',
    defaultStart: 1001,
    defaultPadding: 4,
    structureHelperText: 'Stacked 2D barcode'
  },
  aztec: {
    sequenceSupport: 'full',
    prefixCharset: /^[\x00-\xFF]*$/,
    suffixAllowed: true,
    counterLengthRule: 'variable',
    defaultPrefix: 'AZ-',
    defaultStart: 1001,
    defaultPadding: 4,
    structureHelperText: '2D matrix barcode'
  },
  'gs1-databar': {
    sequenceSupport: 'full',
    prefixCharset: /^\d*$/,
    suffixAllowed: false,
    digitsBeforeCheck: 13,
    defaultPrefix: '10',
    defaultStart: 1,
    counterLengthRule: 'exact',
    defaultPadding: 11,
    structureHelperText: 'GTIN-14: Prefix (2) + counter (11) + check digit (1) = 14 digits'
  },
  msi: {
    sequenceSupport: 'full',
    prefixCharset: /^\d*$/,
    suffixAllowed: false,
    counterLengthRule: 'variable',
    defaultPrefix: '9',
    defaultStart: 1001,
    defaultPadding: 5,
    structureHelperText: 'Numeric barcode'
  },
  code11: {
    sequenceSupport: 'full',
    prefixCharset: /^[0-9\-]*$/,
    suffixAllowed: false,
    counterLengthRule: 'variable',
    defaultPrefix: '11-',
    defaultStart: 1001,
    defaultPadding: 4,
    structureHelperText: 'Digits and dashes'
  },
  standard2of5: {
    sequenceSupport: 'full',
    prefixCharset: /^\d*$/,
    suffixAllowed: false,
    counterLengthRule: 'variable',
    defaultPrefix: '',
    defaultStart: 1001,
    defaultPadding: 5,
    structureHelperText: 'Industrial numeric'
  },
  telepen: {
    sequenceSupport: 'full',
    prefixCharset: /^[\x00-\x7F]*$/,
    suffixAllowed: true,
    counterLengthRule: 'variable',
    defaultPrefix: 'TLP-',
    defaultStart: 1001,
    defaultPadding: 4,
    structureHelperText: 'ASCII character set'
  },
  'gs1-128': {
    sequenceSupport: 'full',
    prefixCharset: /^[\x20-\x7E]*$/,
    suffixAllowed: true,
    counterLengthRule: 'variable',
    defaultPrefix: '(01)00000000',
    defaultStart: 1,
    defaultPadding: 5,
    structureHelperText: 'GS1 Application Identifiers'
  },
  'gs1-datamatrix': {
    sequenceSupport: 'full',
    prefixCharset: /^[\x20-\x7E]*$/,
    suffixAllowed: true,
    counterLengthRule: 'variable',
    defaultPrefix: '(01)00000000',
    defaultStart: 1,
    defaultPadding: 5,
    structureHelperText: 'GS1 2D Data Matrix'
  },
  'digital-link': {
    sequenceSupport: 'full',
    prefixCharset: /^https?:\/\/.*/,
    suffixAllowed: true,
    counterLengthRule: 'variable',
    defaultPrefix: 'https://id.gs1.org/01/00000000',
    defaultStart: 1,
    defaultPadding: 5,
    structureHelperText: 'GS1 Digital Link URI'
  },
  pharmacode: {
    sequenceSupport: 'full',
    prefixCharset: /^\d*$/,
    suffixAllowed: false,
    counterLengthRule: 'variable',
    defaultPrefix: '',
    defaultStart: 1001,
    defaultPadding: 4,
    structureHelperText: 'Numeric value between 3 and 131070'
  },
  postnet: {
    sequenceSupport: 'full',
    prefixCharset: /^\d*$/,
    suffixAllowed: false,
    counterLengthRule: 'variable',
    defaultPrefix: '',
    defaultStart: 90210,
    defaultPadding: 5,
    structureHelperText: '5, 9, or 11 digits'
  },
  'royal-mail': {
    sequenceSupport: 'full',
    prefixCharset: /^[0-9A-Z]*$/,
    suffixAllowed: false,
    counterLengthRule: 'variable',
    defaultPrefix: 'SW1A',
    defaultStart: 101,
    defaultPadding: 4,
    structureHelperText: 'UK postal alphanumeric'
  },
  'usps-intelligent-mail': {
    sequenceSupport: 'full',
    prefixCharset: /^\d*$/,
    suffixAllowed: false,
    digitsBeforeCheck: 20,
    defaultPrefix: '0123456789',
    defaultStart: 1,
    counterLengthRule: 'exact',
    defaultPadding: 10,
    structureHelperText: '20, 25, 29, or 31 digits'
  },
  maxicode: {
    sequenceSupport: 'full',
    prefixCharset: /^[\x00-\xFF]*$/,
    suffixAllowed: true,
    counterLengthRule: 'variable',
    defaultPrefix: 'MAXI-',
    defaultStart: 1001,
    defaultPadding: 4,
    structureHelperText: 'MaxiCode matrix'
  },
  'epc-qr': {
    sequenceSupport: 'none',
    suffixAllowed: false,
    defaultPrefix: '',
    defaultStart: 1,
    structureHelperText: 'EPC payments require structured banking data'
  }
};

/**
 * Authoritative Sizing Profiles for all barcode symbologies.
 * Used by SheetLayoutService to calculate exact uniform dimensions and scannability per label.
 *
 * NOTE: Values marked with practical defaults should be verified against
 * international symbology standards (ISO/IEC and GS1 General Specifications).
 */
export const SIZING_PROFILES: Record<string, BarcodeSizingProfile> = {
  // Linear variable-width formats
  code128: {
    kind: 'linear-variable',
    minXmm: 0.19, // ISO/IEC 15417 minimum for open distribution
    maxXmm: 0.64,
    quietZoneModules: 10,
    minBarHeightMm: 5.0,
    maxHeightShare: 0.75,
    targetWidthShare: 0.85
  },
  'gs1-128': {
    kind: 'linear-variable',
    minXmm: 0.25, // GS1 General Specifications minimum for logistics
    maxXmm: 1.016,
    quietZoneModules: 10,
    minBarHeightMm: 12.7,
    maxHeightShare: 0.75,
    targetWidthShare: 0.85
  },
  code39: {
    kind: 'linear-variable',
    minXmm: 0.19, // ISO/IEC 16388 minimum
    maxXmm: 0.64,
    quietZoneModules: 10,
    minBarHeightMm: 6.0,
    maxHeightShare: 0.75,
    targetWidthShare: 0.85
  },
  code93: {
    kind: 'linear-variable',
    minXmm: 0.19,
    maxXmm: 0.64,
    quietZoneModules: 10,
    minBarHeightMm: 6.0,
    maxHeightShare: 0.75,
    targetWidthShare: 0.85
  },
  codabar: {
    kind: 'linear-variable',
    minXmm: 0.19,
    maxXmm: 0.64,
    quietZoneModules: 10,
    minBarHeightMm: 6.0,
    maxHeightShare: 0.75,
    targetWidthShare: 0.85
  },
  code2of5: {
    kind: 'linear-variable',
    minXmm: 0.25,
    maxXmm: 0.64,
    quietZoneModules: 10,
    minBarHeightMm: 6.0,
    maxHeightShare: 0.75,
    targetWidthShare: 0.85
  },
  standard2of5: {
    kind: 'linear-variable',
    minXmm: 0.25,
    maxXmm: 0.64,
    quietZoneModules: 10,
    minBarHeightMm: 6.0,
    maxHeightShare: 0.75,
    targetWidthShare: 0.85
  },
  itf: {
    kind: 'linear-variable',
    minXmm: 0.19,
    maxXmm: 0.64,
    quietZoneModules: 10,
    minBarHeightMm: 6.0,
    maxHeightShare: 0.75,
    targetWidthShare: 0.85
  },
  msi: {
    kind: 'linear-variable',
    minXmm: 0.19,
    maxXmm: 0.64,
    quietZoneModules: 10,
    minBarHeightMm: 6.0,
    maxHeightShare: 0.75,
    targetWidthShare: 0.85
  },
  code11: {
    kind: 'linear-variable',
    minXmm: 0.19,
    maxXmm: 0.64,
    quietZoneModules: 10,
    minBarHeightMm: 6.0,
    maxHeightShare: 0.75,
    targetWidthShare: 0.85
  },
  telepen: {
    kind: 'linear-variable',
    minXmm: 0.19,
    maxXmm: 0.64,
    quietZoneModules: 10,
    minBarHeightMm: 6.0,
    maxHeightShare: 0.75,
    targetWidthShare: 0.85
  },
  pharmacode: {
    kind: 'linear-variable',
    minXmm: 0.25,
    maxXmm: 0.80,
    quietZoneModules: 6,
    minBarHeightMm: 6.0,
    maxHeightShare: 0.75,
    targetWidthShare: 0.85
  },
  postnet: {
    kind: 'linear-variable',
    minXmm: 0.40,
    maxXmm: 0.60,
    quietZoneModules: 10,
    minBarHeightMm: 3.0,
    maxHeightShare: 0.60,
    targetWidthShare: 0.85
  },
  planet: {
    kind: 'linear-variable',
    minXmm: 0.40,
    maxXmm: 0.60,
    quietZoneModules: 10,
    minBarHeightMm: 3.0,
    maxHeightShare: 0.60,
    targetWidthShare: 0.85
  },
  rm4scc: {
    kind: 'linear-variable',
    minXmm: 0.35,
    maxXmm: 0.60,
    quietZoneModules: 6,
    minBarHeightMm: 4.0,
    maxHeightShare: 0.60,
    targetWidthShare: 0.85
  },
  kix: {
    kind: 'linear-variable',
    minXmm: 0.35,
    maxXmm: 0.60,
    quietZoneModules: 6,
    minBarHeightMm: 4.0,
    maxHeightShare: 0.60,
    targetWidthShare: 0.85
  },

  // Linear fixed-size formats (GS1 Retail / Standard SC2)
  ean13: {
    kind: 'linear-fixed',
    minXmm: 0.264, // 80% magnification (0.33 * 0.8)
    maxXmm: 0.660, // 200% magnification (0.33 * 2.0)
    quietZoneModules: 9,
    minBarHeightMm: 12.0,
    nominalWidthMm: 37.29, // 113 modules * 0.33 mm at 100%
    nominalHeightMm: 22.85,
    allowedMagMin: 0.80,
    allowedMagMax: 2.00,
    minHeightShare: 0.60 // Allow truncation down to 60% of nominal height
  },
  ean8: {
    kind: 'linear-fixed',
    minXmm: 0.264,
    maxXmm: 0.660,
    quietZoneModules: 7,
    minBarHeightMm: 10.0,
    nominalWidthMm: 26.73, // 81 modules * 0.33 mm
    nominalHeightMm: 18.23,
    allowedMagMin: 0.80,
    allowedMagMax: 2.00,
    minHeightShare: 0.60
  },
  upca: {
    kind: 'linear-fixed',
    minXmm: 0.264,
    maxXmm: 0.660,
    quietZoneModules: 9,
    minBarHeightMm: 12.0,
    nominalWidthMm: 37.29,
    nominalHeightMm: 22.85,
    allowedMagMin: 0.80,
    allowedMagMax: 2.00,
    minHeightShare: 0.60
  },
  upce: {
    kind: 'linear-fixed',
    minXmm: 0.264,
    maxXmm: 0.660,
    quietZoneModules: 9,
    minBarHeightMm: 12.0,
    nominalWidthMm: 22.11, // 67 modules * 0.33 mm
    nominalHeightMm: 22.85,
    allowedMagMin: 0.80,
    allowedMagMax: 2.00,
    minHeightShare: 0.60
  },
  isbn: {
    kind: 'linear-fixed',
    minXmm: 0.264,
    maxXmm: 0.660,
    quietZoneModules: 9,
    minBarHeightMm: 12.0,
    nominalWidthMm: 37.29,
    nominalHeightMm: 22.85,
    allowedMagMin: 0.80,
    allowedMagMax: 2.00,
    minHeightShare: 0.60
  },
  issn: {
    kind: 'linear-fixed',
    minXmm: 0.264,
    maxXmm: 0.660,
    quietZoneModules: 9,
    minBarHeightMm: 12.0,
    nominalWidthMm: 37.29,
    nominalHeightMm: 22.85,
    allowedMagMin: 0.80,
    allowedMagMax: 2.00,
    minHeightShare: 0.60
  },
  ismn: {
    kind: 'linear-fixed',
    minXmm: 0.264,
    maxXmm: 0.660,
    quietZoneModules: 9,
    minBarHeightMm: 12.0,
    nominalWidthMm: 37.29,
    nominalHeightMm: 22.85,
    allowedMagMin: 0.80,
    allowedMagMax: 2.00,
    minHeightShare: 0.60
  },
  itf14: {
    kind: 'linear-fixed',
    minXmm: 0.508, // GS1 ITF-14 50% magnification minimum
    maxXmm: 1.016, // 100% magnification
    quietZoneModules: 10,
    minBarHeightMm: 16.0,
    nominalWidthMm: 142.75, // Including bearer bars
    nominalHeightMm: 32.0,
    nominalXmm: 1.016,
    allowedMagMin: 0.50,
    allowedMagMax: 1.00,
    minHeightShare: 0.60
  },

  // 2D Square Matrix formats
  datamatrix: {
    kind: 'matrix',
    minXmm: 0.25, // ISO/IEC 16022 minimum cell size
    maxXmm: 0.80,
    quietZoneModules: 1,
    minBarHeightMm: 5.0
  },
  aztec: {
    kind: 'matrix',
    minXmm: 0.25, // ISO/IEC 24778
    maxXmm: 0.80,
    quietZoneModules: 2,
    minBarHeightMm: 5.0
  },
  qrcode: {
    kind: 'matrix',
    minXmm: 0.25, // ISO/IEC 18004
    maxXmm: 0.80,
    quietZoneModules: 4,
    minBarHeightMm: 5.0
  },
  'micro-qrcode': {
    kind: 'matrix',
    minXmm: 0.25,
    maxXmm: 0.80,
    quietZoneModules: 2,
    minBarHeightMm: 5.0
  },

  // Stacked 2D formats
  pdf417: {
    kind: 'stacked',
    minXmm: 0.19, // ISO/IEC 15438
    maxXmm: 0.50,
    quietZoneModules: 2,
    minBarHeightMm: 8.0
  },
  'micro-pdf417': {
    kind: 'stacked',
    minXmm: 0.19,
    maxXmm: 0.50,
    quietZoneModules: 2,
    minBarHeightMm: 6.0
  },
  'gs1-databar': {
    kind: 'stacked',
    minXmm: 0.20,
    maxXmm: 0.64,
    quietZoneModules: 1,
    minBarHeightMm: 6.0
  }
};

export const BARCODE_CATALOG: Record<string, BarcodeCatalogItem> = {
  // ══════════════════════════════════════════════════════════════════
  // Tier 1 Formats (Phase A)
  // ══════════════════════════════════════════════════════════════════

  code128: {
    id: 'code128',
    invalidExampleValue: 'Non-Ascii-ñ-€',
    expectedEncoded: (inp) => inp,
    expectedDecoded: (inp) => inp,
    slug: 'code-128',
    label: 'Code 128',
    aliases: ['shipping', 'inventory', 'serial', 'asset', 'box', 'carton', 'general'],
    category: 'General and logistics',
    family: 'Linear',
    tier: 1,
    enabled: true,
    description: 'General purpose, any text',
    inputMode: 'text',
    charset: 'ASCII 0 to 127',
    charsetRegex: /^[\x00-\x7F]{1,80}$/,
    caseMode: 'preserve',
    normalizeSeparators: false,
    length: { min: 1, max: 80 },
    checksum: 'Automatic Modulo 103 check character',
    checksumType: 'none',
    checksumOptional: false,
    exampleValue: 'ACKLET-PKG-9821',
    defaultOptions: {},
    engineId: 'code128',
    supportsHumanReadable: true,
    supportsTemporary: true,
    is2D: false,
    standardRef: 'ISO/IEC 15417',
    messages: {
      charset: 'Use standard ASCII characters only.',
      length: 'Enter between 1 and 80 characters.'
    },
    usePageContent: {
      summary: 'Code 128 is a compact, high-density linear symbology capable of encoding all 128 ASCII characters.',
      commonUses: 'Packaging labels, shipping containers, inventory tracking, asset management, and general logistics.',
      characterSet: 'Standard ASCII character set including uppercase, lowercase letters, numbers, punctuation, and control codes.',
      length: 'Variable length from 1 to 80 characters.',
      checkDigit: 'Calculated automatically using a Modulo 103 algorithm before the stop pattern.',
      faqs: [
        {
          question: 'What is the maximum length of Code 128?',
          answer: 'The specification supports up to 80 characters, though practical scanner widths work best under 30 characters.'
        },
        {
          question: 'Does Code 128 support lowercase letters?',
          answer: 'Yes. Code 128 switches between character sets A, B, and C automatically to support lowercase letters and paired digits.'
        },
        {
          question: 'How is the check character calculated?',
          answer: 'The check character uses a weighted Modulo 103 sum of symbol positions and is included automatically in the rendered bars.'
        }
      ]
    }
  },

  ean13: {
    id: 'ean13',
    invalidExampleValue: '4006381333939',
    expectedEncoded: (inp) => inp.replace(/[-\s]/g, ''),
    expectedDecoded: (inp) => inp.replace(/[-\s]/g, ''),
    slug: 'ean-13',
    label: 'EAN-13',
    aliases: ['retail', 'gtin', 'store', 'product', 'supermarket', 'barcode', 'item'],
    category: 'Retail',
    family: 'EAN/UPC',
    tier: 1,
    enabled: true,
    description: 'Retail products, 13 digits',
    inputMode: 'numeric',
    charset: 'Digits 0 to 9',
    charsetRegex: /^\d{12,13}$/,
    normalizeSeparators: true,
    length: { min: 12, max: 13, fixed: 13, exactLengths: [12, 13] },
    checksum: 'GS1 Modulo-10 with weights 3 and 1',
    checksumType: 'gs1-mod10',
    checksumOptional: false,
    exampleValue: '4006381333931',
    defaultOptions: { includeCheckDigit: true },
    engineId: 'ean13',
    supportsHumanReadable: true,
    is2D: false,
    standardRef: 'ISO/IEC 15420',
    messages: {
      charset: 'Use digits only.',
      length: 'Enter 12 or 13 digits.'
    },
    usePageContent: {
      summary: 'EAN-13 is the standard barcode used on retail products worldwide outside North America.',
      commonUses: 'Retail point-of-sale checkout, consumer product packaging, book sales, and inventory reconciliation.',
      characterSet: 'Numeric digits 0 through 9 only.',
      length: 'Fixed length of 13 digits including the final check digit.',
      checkDigit: 'Calculated using the GS1 Modulo-10 algorithm. Entering 12 digits calculates the 13th digit automatically.',
      faqs: [
        {
          question: 'What is the difference between EAN-13 and UPC-A?',
          answer: 'EAN-13 encodes 13 digits worldwide, while UPC-A encodes 12 digits primarily in the United States and Canada. A UPC-A is equivalent to an EAN-13 with a leading zero.'
        },
        {
          question: 'Can I use this EAN-13 code in stores?',
          answer: 'Numbers used on products sold in stores must be issued by GS1. Codes generated here are suitable for testing and internal use.'
        },
        {
          question: 'What happens if I enter 12 digits?',
          answer: 'The tool calculates the required GS1 Modulo-10 check digit automatically and appends it to complete the 13-digit sequence.'
        }
      ]
    }
  },

  ean8: {
    id: 'ean8',
    invalidExampleValue: '96385070',
    expectedEncoded: (inp) => inp.replace(/[-\s]/g, ''),
    expectedDecoded: (inp) => inp.replace(/[-\s]/g, ''),
    slug: 'ean-8',
    label: 'EAN-8',
    aliases: ['retail', 'small item', 'grocery', 'candy', 'compact'],
    category: 'Retail',
    family: 'EAN/UPC',
    tier: 1,
    enabled: true,
    description: 'Compact retail products, 8 digits',
    inputMode: 'numeric',
    charset: 'Digits 0 to 9',
    charsetRegex: /^\d{7,8}$/,
    normalizeSeparators: true,
    length: { min: 7, max: 8, fixed: 8, exactLengths: [7, 8] },
    checksum: 'GS1 Modulo-10 with weights 3 and 1',
    checksumType: 'gs1-mod10',
    checksumOptional: false,
    exampleValue: '96385074',
    defaultOptions: { includeCheckDigit: true },
    engineId: 'ean8',
    supportsHumanReadable: true,
    is2D: false,
    standardRef: 'ISO/IEC 15420',
    messages: {
      charset: 'Use digits only.',
      length: 'Enter 7 or 8 digits.'
    },
    usePageContent: {
      summary: 'EAN-8 is a shortened 8-digit barcode designed for small product packages where an EAN-13 label does not fit.',
      commonUses: 'Small retail merchandise, confectionery, cosmetics, pens, and narrow items.',
      characterSet: 'Numeric digits 0 through 9 only.',
      length: 'Fixed length of 8 digits including check digit.',
      checkDigit: 'Calculated using the GS1 Modulo-10 algorithm. Entering 7 digits appends the 8th check digit automatically.',
      faqs: [
        {
          question: 'When should EAN-8 be used instead of EAN-13?',
          answer: 'EAN-8 is reserved for small packages with limited print area where a standard EAN-13 code would cover more than 25% of the surface.'
        },
        {
          question: 'Are EAN-8 numbers assigned by GS1?',
          answer: 'Yes. Official EAN-8 numbers are allocated directly by GS1 member organisations for verified small packaging.'
        },
        {
          question: 'Can an EAN-8 barcode have an add-on code?',
          answer: 'Standard EAN-8 codes do not use 2-digit or 5-digit add-ons in retail checkout.'
        }
      ]
    }
  },

  upca: {
    id: 'upca',
    invalidExampleValue: '036000291450',
    expectedEncoded: (inp) => inp.replace(/[-\s]/g, ''),
    expectedDecoded: (inp) => inp.replace(/[-\s]/g, ''),
    slug: 'upc-a',
    label: 'UPC-A',
    aliases: ['retail', 'usa', 'canada', 'gtin-12', 'supermarket', 'pos'],
    category: 'Retail',
    family: 'EAN/UPC',
    tier: 1,
    enabled: true,
    description: 'North American retail products, 12 digits',
    inputMode: 'numeric',
    charset: 'Digits 0 to 9',
    charsetRegex: /^\d{11,12}$/,
    normalizeSeparators: true,
    length: { min: 11, max: 12, fixed: 12, exactLengths: [11, 12] },
    checksum: 'GS1 Modulo-10 with weights 3 and 1',
    checksumType: 'gs1-mod10',
    checksumOptional: false,
    exampleValue: '036000291452',
    defaultOptions: { includeCheckDigit: true },
    engineId: 'upca',
    supportsHumanReadable: true,
    is2D: false,
    standardRef: 'ISO/IEC 15420',
    messages: {
      charset: 'Use digits only.',
      length: 'Enter 11 or 12 digits.'
    },
    usePageContent: {
      summary: 'UPC-A is the standard 12-digit barcode used for consumer product checkout in North America.',
      commonUses: 'Supermarket checkout, consumer goods, apparel, electronics, and general North American retail.',
      characterSet: 'Numeric digits 0 through 9 only.',
      length: 'Fixed length of 12 digits including check digit.',
      checkDigit: 'Calculated using the GS1 Modulo-10 formula. Entering 11 digits completes the code automatically.',
      faqs: [
        {
          question: 'What is the structure of a UPC-A barcode?',
          answer: 'A UPC-A code consists of a company prefix, an item reference number, and a final Modulo-10 check digit.'
        },
        {
          question: 'Is UPC-A compatible with European scanners?',
          answer: 'Yes. Modern point-of-sale systems read both 12-digit UPC-A and 13-digit EAN-13 codes interchangeably.'
        },
        {
          question: 'How do I convert UPC-A to EAN-13?',
          answer: 'Prepend a single 0 to the 12-digit UPC-A number. The check digit remains identical.'
        }
      ]
    }
  },

  upce: {
    id: 'upce',
    invalidExampleValue: '03600089',
    expectedEncoded: (inp) => inp.replace(/[-\s]/g, ''),
    expectedDecoded: (inp) => inp.replace(/[-\s]/g, ''),
    slug: 'upc-e',
    label: 'UPC-E',
    aliases: ['retail', 'compressed', 'small package', 'zero suppression', 'grocery'],
    category: 'Retail',
    family: 'EAN/UPC',
    tier: 1,
    enabled: true,
    description: 'Compressed retail products, 6 to 8 digits',
    inputMode: 'numeric',
    charset: 'Digits 0 to 9',
    charsetRegex: /^\d{6,8}$/,
    normalizeSeparators: true,
    length: { min: 6, max: 8, exactLengths: [6, 7, 8] },
    pattern: /^[01]?\d{6,7}$/,
    checksum: 'Derived from full UPC-A Modulo-10 check digit',
    checksumType: 'upce',
    checksumOptional: true,
    exampleValue: '01234565',
    defaultOptions: { upceCompress: true },
    engineId: 'upce',
    supportsHumanReadable: true,
    is2D: false,
    standardRef: 'ISO/IEC 15420',
    messages: {
      charset: 'Use digits only.',
      length: 'Enter 6, 7 or 8 digits.',
      pattern: 'UPC-E must start with number system 0 or 1.'
    },
    usePageContent: {
      summary: 'UPC-E is a zero-suppressed variant of UPC-A that compresses 12 digits into 6 symbol characters for compact packaging.',
      commonUses: 'Small consumer products in the United States and Canada, such as chewing gum and cosmetics.',
      characterSet: 'Numeric digits 0 through 9 only.',
      length: '6, 7, or 8 digits depending on explicit prefix and check digit inclusion.',
      checkDigit: 'Inherited from the uncompressed 12-digit UPC-A code.',
      faqs: [
        {
          question: 'Can any UPC-A code be converted to UPC-E?',
          answer: 'No. Only UPC-A codes with specific patterns of consecutive zeros in the manufacturer or product code can be compressed into UPC-E.'
        },
        {
          question: 'What does zero suppression mean?',
          answer: 'Zero suppression removes redundant zeros from the manufacturer prefix and item code, recording the pattern in a single selector digit.'
        },
        {
          question: 'Does UPC-E require a number system character?',
          answer: 'UPC-E usually assumes number system 0, though number system 1 is supported by some retail implementations.'
        }
      ]
    }
  },

  isbn: {
    id: 'isbn',
    invalidExampleValue: '9780306406150',
    expectedEncoded: (inp) => (inp.replace(/[-\s]/g, '').length === 10 ? '978' + inp.replace(/[-\s]/g, '').slice(0, 9) + '7' : inp.replace(/[-\s]/g, '')),
    expectedDecoded: (inp) => inp.replace(/[-\s]/g, ''),
    slug: 'isbn',
    label: 'ISBN',
    aliases: ['book', 'publishing', 'textbook', 'paperback', 'hardcover', 'library'],
    category: 'Retail',
    family: 'EAN/UPC',
    tier: 1,
    enabled: true,
    description: 'Books with 978 or 979 prefix',
    inputMode: 'numeric',
    charset: 'Digits with hyphens or spaces, 978/979 prefix',
    charsetRegex: /^(97[89][\s-]?)?\d{1,5}[\s-]?\d{1,7}[\s-]?\d{1,7}[\s-]?[\dX]$/i,
    normalizeSeparators: true,
    length: { min: 10, max: 17, exactLengths: [10, 13] },
    pattern: /^(978|979)?\d{9}[\dX]?$/,
    checksum: 'GS1 Modulo-10 check digit',
    checksumType: 'isbn10',
    checksumOptional: false,
    exampleValue: '9780306406157',
    defaultOptions: { includeCheckDigit: true },
    engineId: 'isbn',
    supportsHumanReadable: true,
    is2D: false,
    standardRef: 'ISO 2108',
    messages: {
      charset: 'Use digits and hyphens only.',
      length: 'Enter a 10 or 13 digit ISBN.',
      pattern: 'ISBN must start with 978 or 979.'
    },
    usePageContent: {
      summary: 'ISBN is the international identifier for books and printed publications, formatted as an EAN-13 barcode with a Bookland prefix.',
      commonUses: 'Book covers, publishing distribution, library catalogs, and bookstore inventory management.',
      characterSet: 'Digits with optional spaces or hyphens. Prefixed with 978 or 979.',
      length: '10 digits (legacy ISBN-10) or 13 digits (standard ISBN-13).',
      checkDigit: 'Calculated using GS1 Modulo-10. ISBN-10 inputs are converted to ISBN-13 automatically.',
      faqs: [
        {
          question: 'Can I enter a 10-digit ISBN?',
          answer: 'Yes. Entering a 10-digit ISBN converts it to ISBN-13 with the 978 prefix and recalculates the check digit.'
        },
        {
          question: 'Do hyphens in the ISBN affect the barcode?',
          answer: 'Hyphens are stripped during encoding. The human-readable text displays standard book grouping.'
        },
        {
          question: 'What is a Bookland barcode?',
          answer: 'Bookland is the designation for EAN-13 barcodes assigned to prefixes 978 and 979 for printed books.'
        }
      ]
    }
  },

  code39: {
    id: 'code39',
    invalidExampleValue: 'lowercase-bad',
    expectedEncoded: (inp) => inp.toUpperCase(),
    expectedDecoded: (inp) => inp.toUpperCase(),
    slug: 'code-39',
    label: 'Code 39',
    aliases: ['inventory', 'military', 'automotive', 'id badge', 'asset', 'alpha'],
    category: 'Industrial',
    family: 'Linear',
    tier: 1,
    enabled: true,
    description: 'Alphanumeric inventory and asset tags',
    inputMode: 'text',
    charset: '0-9, A-Z, space, and - . $ / + %',
    charsetRegex: /^[0-9A-Z\s\-\.\$\/\+\%]{1,43}$/i,
    caseMode: 'upper',
    normalizeSeparators: false,
    length: { min: 1, max: 43 },
    checksum: 'Optional Modulo 43 check character',
    checksumType: 'mod43',
    checksumOptional: true,
    exampleValue: 'PART-9021',
    defaultOptions: { includeCheckDigit: false },
    options: [
      {
        id: 'includeCheckDigit',
        label: 'Include Mod 43 check digit',
        type: 'boolean',
        allowedValues: [true, false],
        default: false,
        engineOption: 'includecheck',
        affectsOutput: true,
        description: 'Optional Modulo 43 check character'
      }
    ],
    engineId: 'code39',
    supportsHumanReadable: true,
    is2D: false,
    standardRef: 'ISO/IEC 16388',
    messages: {
      charset: 'Use letters A to Z, digits and - . $ / + % only.',
      length: 'Enter between 1 and 43 characters.'
    },
    usePageContent: {
      summary: 'Code 39 is an established alphanumeric linear symbology widely used in manufacturing, automotive, and defense industries.',
      commonUses: 'Component tracking, government defense labels, automotive parts identification, and employee identification badges.',
      characterSet: 'Uppercase letters A through Z, numeric digits 0 through 9, and seven special symbols: space, dash, dot, dollar, slash, plus, and percent.',
      length: 'Variable length up to 43 characters.',
      checkDigit: 'Optional Modulo 43 check character used where higher data integrity is required.',
      faqs: [
        {
          question: 'Does Code 39 support lowercase letters?',
          answer: 'Standard Code 39 supports uppercase characters only. Lowercase letters entered are converted to uppercase.'
        },
        {
          question: 'Why are asterisks shown around Code 39 barcodes?',
          answer: 'Asterisks serve as start and stop characters in Code 39, telling the optical scanner where the code begins and ends.'
        },
        {
          question: 'Is a check digit required for Code 39?',
          answer: 'Check digits are optional in Code 39. Most industrial applications operate reliably without one.'
        }
      ]
    }
  },

  code93: {
    id: 'code93',
    invalidExampleValue: 'lowercase-bad',
    expectedEncoded: (inp) => inp.toUpperCase(),
    expectedDecoded: (inp) => inp.toUpperCase(),
    slug: 'code-93',
    label: 'Code 93',
    aliases: ['postal', 'dense', 'inventory', 'logistics', 'high density'],
    category: 'Industrial',
    family: 'Linear',
    tier: 1,
    enabled: true,
    description: 'High density alphanumeric data',
    inputMode: 'text',
    charset: '0-9, A-Z, space, and - . $ / + %',
    charsetRegex: /^[0-9A-Z\s\-\.\$\/\+\%]{1,50}$/i,
    caseMode: 'upper',
    normalizeSeparators: false,
    length: { min: 1, max: 50 },
    checksum: 'Dual Modulo-47 check characters (C and K)',
    checksumType: 'code93',
    checksumOptional: false,
    exampleValue: 'AC-93-DENSE',
    defaultOptions: {},
    engineId: 'code93',
    supportsHumanReadable: true,
    is2D: false,
    standardRef: 'ANSI/AIM BC5',
    messages: {
      charset: 'Use letters A to Z, digits and - . $ / + % only.',
      length: 'Enter between 1 and 50 characters.'
    },
    usePageContent: {
      summary: 'Code 93 is a compact continuous barcode offering higher data density and tighter security than Code 39.',
      commonUses: 'Postal packaging labels, parcel tracking, military logistics, and compact inventory labeling.',
      characterSet: '47 basic characters including digits, uppercase letters, punctuation, and control characters.',
      length: 'Variable length up to 50 characters.',
      checkDigit: 'Two independent Modulo-47 check characters (C and K) calculated and appended automatically.',
      faqs: [
        {
          question: 'How does Code 93 compare with Code 39?',
          answer: 'Code 93 occupies approximately 30% less horizontal space than Code 39 and includes two mandatory check characters for higher security.'
        },
        {
          question: 'Does Code 93 support full ASCII?',
          answer: 'Yes. Code 93 uses combination characters to represent the complete 128 ASCII table without requiring extended bar patterns.'
        },
        {
          question: 'Are check characters visible in the human-readable text?',
          answer: 'No. The C and K check characters are optical security elements and are omitted from human-readable text beneath the bars.'
        }
      ]
    }
  },

  itf14: {
    id: 'itf14',
    invalidExampleValue: '10012345678900',
    expectedEncoded: (inp) => inp.replace(/[-\s]/g, ''),
    expectedDecoded: (inp) => inp.replace(/[-\s]/g, ''),
    slug: 'itf-14',
    label: 'ITF-14',
    aliases: ['carton', 'master case', 'pallet', 'logistics', 'shipping', 'box'],
    category: 'General and logistics',
    family: 'Interleaved 2 of 5',
    tier: 1,
    enabled: true,
    description: 'Shipping containers, 14 digits',
    inputMode: 'numeric',
    charset: 'Digits 0 to 9',
    charsetRegex: /^\d{13,14}$/,
    normalizeSeparators: true,
    length: { min: 13, max: 14, fixed: 14, exactLengths: [13, 14] },
    checksum: 'GS1 Modulo-10 with weights 3 and 1',
    checksumType: 'gs1-mod10',
    checksumOptional: false,
    exampleValue: '10012345678902',
    defaultOptions: { bearerBars: 'top-bottom', includeCheckDigit: true },
    engineId: 'itf14',
    supportsHumanReadable: true,
    is2D: false,
    standardRef: 'ISO/IEC 16390',
    messages: {
      charset: 'Use digits only.',
      length: 'Enter 13 or 14 digits.'
    },
    usePageContent: {
      summary: 'ITF-14 is the 14-digit shipping container symbol used on outer corrugated cartons and master cases.',
      commonUses: 'Corrugated cardboard boxes, pallet labels, distribution packaging, and wholesale warehouse scanning.',
      characterSet: 'Numeric digits 0 through 9 only.',
      length: 'Fixed length of 14 digits including check digit.',
      checkDigit: 'Calculated using GS1 Modulo-10. Entering 13 digits calculates the 14th digit automatically.',
      faqs: [
        {
          question: 'What are bearer bars on an ITF-14 barcode?',
          answer: 'Bearer bars are thick black protective borders printed above and below the symbol to prevent incomplete short scans on uneven corrugated cardboard.'
        },
        {
          question: 'Can ITF-14 be scanned at consumer retail checkout?',
          answer: 'No. ITF-14 is intended exclusively for outer case scanning in logistics and warehouses, not point-of-sale registers.'
        },
        {
          question: 'What packaging indicator does the first digit represent?',
          answer: 'The first digit represents packaging level, where 0 indicates an outer box and 1 through 8 signify specific packaging quantities.'
        }
      ]
    }
  },

  itf: {
    id: 'itf',
    invalidExampleValue: '12345',
    expectedEncoded: (inp) => inp.replace(/[-\s]/g, ''),
    expectedDecoded: (inp) => inp.replace(/[-\s]/g, ''),
    slug: 'interleaved-2-of-5',
    label: 'Interleaved 2 of 5',
    aliases: ['warehouse', 'industrial', 'numeric', 'logistics', 'paired'],
    category: 'General and logistics',
    family: 'Interleaved 2 of 5',
    tier: 1,
    enabled: true,
    description: 'Interleaved numeric pairs, even length',
    inputMode: 'numeric',
    charset: 'Digits 0 to 9, even number of characters',
    charsetRegex: /^\d+$/,
    normalizeSeparators: true,
    length: { min: 2, max: 50, evenOnly: true },
    checksum: 'Optional Modulo 10 check character',
    checksumType: 'none',
    checksumOptional: true,
    exampleValue: '24681357',
    defaultOptions: { autoPrependZero: true },
    options: [
      {
        id: 'autoPrependZero',
        label: 'Auto-prepend zero',
        type: 'boolean',
        allowedValues: [true, false],
        default: true,
        engineOption: 'prependzero',
        affectsOutput: true,
        description: 'Prepend leading zero when odd number of digits entered'
      }
    ],
    engineId: 'interleaved2of5',
    supportsHumanReadable: true,
    is2D: false,
    standardRef: 'ISO/IEC 16390',
    messages: {
      charset: 'Use digits only.',
      length: 'Length must be an even number of digits.'
    },
    usePageContent: {
      summary: 'Interleaved 2 of 5 encodes numeric pairs into alternating black bars and white spaces.',
      commonUses: 'Industrial manufacturing, warehouse distribution, lab specimens, and carton labeling.',
      characterSet: 'Numeric digits 0 through 9 only.',
      length: 'Variable length with an even number of digits.',
      checkDigit: 'Optional Modulo 10 check digit.',
      faqs: [
        {
          question: 'Why does Interleaved 2 of 5 require an even number of digits?',
          answer: 'Digits are paired in parallel: the first digit is encoded in the bars and the second in the intervening spaces.'
        },
        {
          question: 'What happens if I enter an odd number of digits?',
          answer: 'The generator offers to prepend a leading zero so that all digits pair correctly.'
        },
        {
          question: 'Is Interleaved 2 of 5 susceptible to misreads?',
          answer: 'Short partial scans can occur on unbordered symbols. Bearer bars or fixed length validation are recommended.'
        }
      ]
    }
  },

  codabar: {
    id: 'codabar',
    invalidExampleValue: '123A45',
    expectedEncoded: (inp) => inp.toUpperCase(),
    expectedDecoded: (inp) => inp.toUpperCase(),
    slug: 'codabar',
    label: 'Codabar',
    aliases: ['blood bank', 'library', 'fedex', 'airbill', 'medical', 'photo'],
    category: 'General and logistics',
    family: 'Linear',
    tier: 1,
    enabled: true,
    description: 'Libraries, blood banks and airbills',
    inputMode: 'structured',
    charset: 'Digits, symbols - $ : / . +, guards A-D',
    charsetRegex: /^[A-D]?[0-9\-\$\:\/\.\+]+[A-D]?$/i,
    caseMode: 'upper',
    normalizeSeparators: false,
    length: { min: 3, max: 40 },
    pattern: /^[A-D][0-9\-\$\:\/\.\+]+[A-D]$/,
    checksum: 'Optional self-checking character',
    checksumType: 'mod16',
    checksumOptional: true,
    exampleValue: 'A123456789B',
    defaultOptions: { codabarStart: 'A', codabarStop: 'B' },
    options: [
      {
        id: 'codabarStart',
        label: 'Start guard',
        type: 'select',
        allowedValues: ['A', 'B', 'C', 'D'],
        default: 'A',
        engineOption: 'start',
        affectsOutput: true,
        description: 'Codabar starting guard symbol'
      },
      {
        id: 'codabarStop',
        label: 'Stop guard',
        type: 'select',
        allowedValues: ['A', 'B', 'C', 'D'],
        default: 'B',
        engineOption: 'stop',
        affectsOutput: true,
        description: 'Codabar stopping guard symbol'
      }
    ],
    engineId: 'codabar',
    supportsHumanReadable: true,
    is2D: false,
    standardRef: 'ANSI/AIM BC3',
    messages: {
      charset: 'Use digits, symbols - $ : / . + and guards A to D.',
      length: 'Enter between 3 and 40 characters.',
      pattern: 'Guards A to D are allowed only at start and end.'
    },
    usePageContent: {
      summary: 'Codabar is a discrete linear barcode designed for accurate optical character reading on paper forms.',
      commonUses: 'Blood bank collection units, library membership cards, photo finishing envelopes, and legacy courier airbills.',
      characterSet: 'Digits 0 to 9, six symbols (- $ : / . +), and four start/stop guard letters (A, B, C, D).',
      length: 'Variable length up to 40 characters.',
      checkDigit: 'Self-checking structure; optional Modulo-16 checksum available.',
      faqs: [
        {
          question: 'What are start and stop characters in Codabar?',
          answer: 'Codabar requires a single guard character (A, B, C, or D) at the start and end of the sequence to indicate application type.'
        },
        {
          question: 'Why is Codabar still used in blood banks?',
          answer: 'Codabar has high printing tolerance on matrix and dot-printed labels and remains a validated standard in legacy medical registries.'
        },
        {
          question: 'Can Codabar encode alphabet letters in the body?',
          answer: 'No. Letters A, B, C, and D are reserved strictly for start and stop guards. Body characters must be numeric or one of the six symbols.'
        }
      ]
    }
  },

  // ══════════════════════════════════════════════════════════════════
  // Tier 2 Formats (Phase B)
  // ══════════════════════════════════════════════════════════════════

  datamatrix: {
    id: 'datamatrix',
    invalidExampleValue: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    expectedEncoded: (inp) => inp,
    expectedDecoded: (inp) => inp,
    slug: 'data-matrix',
    label: 'Data Matrix',
    aliases: ['2d', 'parts', 'medical', 'pcb', 'electronics', 'aerospace', 'compact'],
    category: '2D',
    family: '2D Matrix',
    tier: 2,
    enabled: true,
    description: 'Compact 2D matrix for small items',
    inputMode: 'text',
    charset: 'Full ASCII, binary and Unicode',
    charsetRegex: /^[\x00-\xFF]{1,500}$/,
    caseMode: 'preserve',
    normalizeSeparators: false,
    length: { min: 1, max: 500 },
    checksum: 'Reed-Solomon ECC 200 error correction',
    checksumType: 'none',
    checksumOptional: false,
    exampleValue: 'DM-PART-8472-X',
    defaultOptions: { shape: 'square' },
    options: [
      {
        id: 'shape',
        label: 'Symbol shape',
        type: 'select',
        allowedValues: ['square', 'rectangular'],
        default: 'square',
        engineOption: 'format',
        affectsOutput: true,
        description: 'Matrix symbol geometry: square or compact rectangular'
      }
    ],
    engineId: 'datamatrix',
    supportsHumanReadable: false,
    supportsTemporary: true,
    is2D: true,
    standardRef: 'ISO/IEC 16022',
    messages: {
      length: 'Enter between 1 and 500 characters.'
    },
    usePageContent: {
      summary: 'Data Matrix is a high-density two-dimensional matrix barcode composed of square modules arranged within an L-shaped finder pattern.',
      commonUses: 'Direct part marking, circuit boards, aerospace components, surgical instruments, and pharmaceutical unit-dose packaging.',
      characterSet: 'Full ASCII text, binary bytes, and numeric data.',
      length: 'Up to 2,335 alphanumeric characters or 3,116 numeric digits.',
      checkDigit: 'Reed-Solomon error correction algorithm (ECC 200) capable of restoring damaged symbols.',
      faqs: [
        {
          question: 'Can Data Matrix barcodes be rectangular?',
          answer: 'Yes. Data Matrix supports both square and rectangular formats designed to fit narrow surfaces such as test tubes.'
        },
        {
          question: 'How small can a Data Matrix barcode be printed?',
          answer: 'A Data Matrix symbol can be read accurately at dimensions as small as 2 mm square using high-resolution cameras.'
        },
        {
          question: 'How is Data Matrix different from QR codes?',
          answer: 'Data Matrix achieves higher data density on tiny physical footprints and is preferred in industrial direct part marking.'
        }
      ]
    }
  },

  pdf417: {
    id: 'pdf417',
    invalidExampleValue: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    expectedEncoded: (inp) => inp,
    expectedDecoded: (inp) => inp,
    slug: 'pdf417',
    label: 'PDF417',
    aliases: ['2d', 'boarding pass', 'id card', 'driver license', 'postal', 'airline'],
    category: '2D',
    family: '2D Stacked',
    tier: 2,
    enabled: true,
    description: 'High capacity 2D stacked barcode',
    inputMode: 'text',
    charset: 'Full ASCII and binary bytes',
    charsetRegex: /^[\x00-\xFF]{1,1100}$/,
    caseMode: 'preserve',
    normalizeSeparators: false,
    length: { min: 1, max: 1100 },
    checksum: 'Reed-Solomon error correction levels 0 to 8',
    checksumType: 'none',
    checksumOptional: false,
    exampleValue: 'PASSENGER:DOE/JOHN TICKET:982341 FLIGHT:AK402',
    defaultOptions: { securityLevel: 2, columns: 0 },
    options: [
      {
        id: 'securityLevel',
        label: 'Security level',
        type: 'select',
        allowedValues: [0, 1, 2, 3, 4, 5, 6, 7, 8],
        default: 2,
        engineOption: 'eclevel',
        affectsOutput: true,
        description: 'Reed-Solomon error correction level (0 to 8)'
      }
    ],
    engineId: 'pdf417',
    supportsHumanReadable: false,
    supportsTemporary: true,
    is2D: true,
    standardRef: 'ISO/IEC 15438',
    messages: {
      length: 'Enter between 1 and 1100 characters.'
    },
    usePageContent: {
      summary: 'PDF417 is a multi-row, continuous, high-capacity stacked 2D barcode format.',
      commonUses: 'Airline boarding passes, driver licenses, government identity cards, hazardous material documents, and parcel postage.',
      characterSet: 'All 256 ASCII characters, binary data, and numeric modes.',
      length: 'Capacity up to 1,850 alphanumeric characters or 1,100 binary bytes.',
      checkDigit: 'Adjustable Reed-Solomon error correction levels from 0 to 8.',
      faqs: [
        {
          question: 'Why is PDF417 called stacked?',
          answer: 'PDF417 consists of multiple linear barcode rows stacked vertically, each separated by horizontal guide patterns.'
        },
        {
          question: 'Can PDF417 store entire records without a database?',
          answer: 'Yes. Its high storage capacity allows complete biometric, identification, or travel records to reside directly inside the symbol.'
        },
        {
          question: 'What error correction level is recommended?',
          answer: 'Level 2 or 3 is standard for general identification cards and boarding documents.'
        }
      ]
    }
  },

  aztec: {
    id: 'aztec',
    invalidExampleValue: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    expectedEncoded: (inp) => inp,
    expectedDecoded: (inp) => inp,
    slug: 'aztec',
    label: 'Aztec',
    aliases: ['2d', 'transport', 'train ticket', 'airline', 'boarding pass', 'mobile'],
    category: '2D',
    family: '2D Matrix',
    tier: 2,
    enabled: true,
    description: 'High density 2D matrix without quiet zone',
    inputMode: 'text',
    charset: 'Full ASCII and binary data',
    charsetRegex: /^[\x00-\xFF]{1,800}$/,
    caseMode: 'preserve',
    normalizeSeparators: false,
    length: { min: 1, max: 800 },
    checksum: 'Reed-Solomon error correction percentage',
    checksumType: 'none',
    checksumOptional: false,
    exampleValue: 'RAIL-TKT-BER-PAR-2026',
    defaultOptions: { errorCorrectionPercent: 30 },
    options: [
      {
        id: 'errorCorrectionPercent',
        label: 'Error correction percent',
        type: 'select',
        allowedValues: [10, 30, 50],
        default: 30,
        engineOption: 'eclevel',
        affectsOutput: true,
        description: 'Error correction redundancy percentage'
      }
    ],
    engineId: 'azteccode',
    supportsHumanReadable: false,
    supportsTemporary: true,
    is2D: true,
    standardRef: 'ISO/IEC 24778',
    messages: {
      length: 'Enter between 1 and 800 characters.'
    },
    usePageContent: {
      summary: 'Aztec Code is a high-density 2D matrix barcode recognized by its central bulls-eye finder pattern.',
      commonUses: 'Railway ticketing, mobile transit boarding, airline boarding passes, and car registration documents.',
      characterSet: 'Complete 256 ASCII table and raw byte sequences.',
      length: 'Up to 3,832 numeric digits or 3,067 alphanumeric characters.',
      checkDigit: 'User-configurable Reed-Solomon error correction with a 23% default level.',
      faqs: [
        {
          question: 'Does Aztec Code require a quiet zone?',
          answer: 'No. The central bulls-eye finder pattern allows Aztec codes to be decoded right up to surrounding graphics without a white margin.'
        },
        {
          question: 'Why is Aztec popular in transport ticketing?',
          answer: 'Its rapid orientation recognition and absence of quiet zone make it easy to display and scan on mobile device screens.'
        },
        {
          question: 'What is the standard error correction percentage?',
          answer: 'The standard recommended level is 23%, providing high resistance against folded or scratched ticket paper.'
        }
      ]
    }
  },

  qrcode: {
    id: 'qrcode',
    slug: 'qr-code',
    label: 'QR Code',
    aliases: ['qr', '2d', 'matrix', 'mobile', 'url'],
    category: '2D',
    family: '2D Matrix',
    tier: 1,
    enabled: false,
    supportsTemporary: true,
    description: 'Quick Response 2D matrix',
    inputMode: 'text',
    charset: 'Full ASCII, binary and Unicode',
    charsetRegex: /^[\x00-\xFF]{1,2048}$/,
    caseMode: 'preserve',
    normalizeSeparators: false,
    length: { min: 1, max: 2048 },
    checksum: 'Reed-Solomon error correction',
    checksumType: 'none',
    checksumOptional: false,
    exampleValue: 'https://acklet.com',
    invalidExampleValue: '',
    expectedEncoded: (inp) => inp,
    expectedDecoded: (inp) => inp,
    defaultOptions: {},
    engineId: 'qrcode',
    supportsHumanReadable: false,
    is2D: true,
    standardRef: 'ISO/IEC 18004',
    messages: {
      length: 'Enter between 1 and 2048 characters.'
    },
    usePageContent: {
      summary: 'Quick Response matrix code for fast scanning on mobile devices.',
      commonUses: 'Website links, temporary codes, and contact details.',
      characterSet: 'Full ASCII and UTF-8.',
      length: 'Up to 2,048 characters.',
      checkDigit: 'Reed-Solomon error correction.',
      faqs: []
    }
  },

  issn: {
    id: 'issn',
    invalidExampleValue: '20008989',
    expectedEncoded: (inp) => inp.length === 8 ? '977' + inp.slice(0, 7) + '000' : inp,
    expectedDecoded: (inp) => inp.length === 8 ? '977' + inp.slice(0, 7) + '000' : inp,
    slug: 'issn',
    label: 'ISSN',
    aliases: ['magazine', 'journal', 'periodical', 'publishing', 'serial'],
    category: 'Retail',
    family: 'EAN/UPC',
    tier: 2,
    enabled: true,
    description: 'Serial publications, 8 digits',
    inputMode: 'numeric',
    charset: 'Digits with optional 2-digit add-on',
    charsetRegex: /^\d{7,8}(\d{2})?$/,
    normalizeSeparators: true,
    length: { min: 8, max: 13, exactLengths: [8, 13] },
    checksum: 'GS1 Modulo-10 check digit',
    checksumType: 'issn',
    checksumOptional: false,
    exampleValue: '9771234567003',
    defaultOptions: { addonType: 'ean2' },
    engineId: 'issn',
    supportsHumanReadable: true,
    is2D: false,
    standardRef: 'ISO 3297',
    messages: {
      charset: 'Use digits only.',
      length: 'Enter 8 digits (or full 13-digit 977 EAN).'
    },
    usePageContent: {
      summary: 'ISSN is the international standard serial number for recurring periodicals and magazines, converted into a 977 EAN-13 barcode.',
      commonUses: 'Magazines, academic journals, newspapers, periodicals, and recurring publications.',
      characterSet: 'Numeric digits only.',
      length: '8-digit ISSN expanded to 13 digits with optional 2-digit issue add-on.',
      checkDigit: 'Modulo-10 check digit calculated over the 977 prefix sequence.',
      faqs: [
        {
          question: 'How is an 8-digit ISSN converted to a barcode?',
          answer: 'The 8-digit ISSN is prefixed with 977, stripped of its original check character, and completed with a 2-digit sequence and EAN check digit.'
        },
        {
          question: 'What does the 2-digit add-on represent?',
          answer: 'The 2-digit add-on indicates the issue number within a calendar year.'
        },
        {
          question: 'Can ISSN barcodes be scanned at retail checkout?',
          answer: 'Yes. Periodicals with 977 prefixes scan through standard point-of-sale systems just like EAN-13 barcodes.'
        }
      ]
    }
  },

  ismn: {
    id: 'ismn',
    invalidExampleValue: '0360008908999',
    expectedEncoded: (inp) => inp.replace(/[-\s]/g, ''),
    expectedDecoded: (inp) => inp.replace(/[-\s]/g, ''),
    slug: 'ismn',
    label: 'ISMN',
    aliases: ['sheet music', 'score', 'songbook', 'music publishing'],
    category: 'Retail',
    family: 'EAN/UPC',
    tier: 2,
    enabled: true,
    description: 'Printed music, 13 digits',
    inputMode: 'numeric',
    charset: 'Digits starting with 979-0',
    charsetRegex: /^9790\d{8,9}$/,
    normalizeSeparators: true,
    length: { min: 12, max: 13, fixed: 13, exactLengths: [12, 13] },
    pattern: /^9790\d{8,9}$/,
    checksum: 'GS1 Modulo-10 check digit',
    checksumType: 'gs1-mod10',
    checksumOptional: false,
    exampleValue: '9790260000438',
    defaultOptions: {},
    engineId: 'ismn',
    supportsHumanReadable: true,
    is2D: false,
    standardRef: 'ISO 10957',
    messages: {
      charset: 'Use digits only.',
      length: 'Enter 12 or 13 digits.',
      pattern: 'ISMN must start with 9790.'
    },
    usePageContent: {
      summary: 'ISMN is the international standard music number identifying printed music scores and songbooks worldwide.',
      commonUses: 'Sheet music, orchestral scores, choral folios, and music retail inventory.',
      characterSet: 'Numeric digits with 979-0 prefix.',
      length: 'Fixed length of 13 digits.',
      checkDigit: 'Standard GS1 Modulo-10 check digit.',
      faqs: [
        {
          question: 'How are legacy 10-character ISMNs converted?',
          answer: 'Legacy ISMNs starting with M are replaced by the 979-0 prefix, followed by the remaining 8 digits and a recalculated check digit.'
        },
        {
          question: 'What prefix distinguishes music from books?',
          answer: 'Books use 978 and 979 (except 979-0). Prefix 979-0 is reserved exclusively for printed music publications.'
        },
        {
          question: 'Is ISMN compatible with standard barcode readers?',
          answer: 'Yes. An ISMN encodes as a standard EAN-13 barcode readable by any commercial optical scanner.'
        }
      ]
    }
  },

  'gs1-databar': {
    id: 'gs1-databar',
    invalidExampleValue: '03600029142',
    expectedEncoded: (inp) => inp.startsWith('(') ? inp : '(01)' + inp.replace(/[-\s]/g, '').padStart(14, '0'),
    expectedDecoded: (inp) => inp.startsWith('(') ? inp : '(01)' + inp.replace(/[-\s]/g, '').padStart(14, '0'),
    slug: 'gs1-databar',
    label: 'GS1 DataBar',
    aliases: ['produce', 'fresh food', 'coupons', 'grocery', 'gtin-14', 'meat'],
    category: 'GS1 DataBar',
    family: 'GS1 DataBar',
    tier: 2,
    enabled: true,
    description: 'Fresh food and coupons, 14 digits',
    inputMode: 'numeric',
    charset: 'Digits 0 to 9',
    charsetRegex: /^\d{8,14}$/,
    normalizeSeparators: true,
    length: { min: 8, max: 14, exactLengths: [8, 12, 13, 14] },
    checksum: 'GS1 Modulo-10 check digit',
    checksumType: 'gs1-mod10',
    checksumOptional: false,
    exampleValue: '09521234543213',
    defaultOptions: { variant: 'omni', segments: 4 },
    options: [
      {
        id: 'variant',
        label: 'Variant',
        type: 'select',
        allowedValues: ['omni', 'truncated', 'stacked', 'stacked-omni', 'limited', 'expanded', 'expanded-stacked'],
        default: 'omni',
        engineOption: 'symbology',
        affectsOutput: true,
        description: 'GS1 DataBar symbology variation'
      },
      {
        id: 'segments',
        label: 'Segments per row',
        type: 'select',
        allowedValues: [2, 4, 6, 8],
        default: 4,
        engineOption: 'segments',
        affectsOutput: true,
        description: 'Segments per row for Expanded Stacked'
      }
    ],
    engineId: 'databaromni',
    variants: [
      {
        id: 'omni',
        label: 'Omnidirectional',
        description: 'Full omnidirectional POS scanning',
        exactLengths: [8, 12, 13, 14],
        helperChip: 'GTIN-8, 12, 13 or 14 digits',
        helperLine: 'Full omnidirectional POS scanning, 8 to 14 digit GTIN',
        exampleValue: '09521234543213',
        messages: {
          charset: 'Use digits only.',
          length: 'Enter 8, 12, 13 or 14 digits.'
        }
      },
      {
        id: 'truncated',
        label: 'Truncated',
        description: 'Reduced height for small tags',
        exactLengths: [8, 12, 13, 14],
        helperChip: 'GTIN-8, 12, 13 or 14 digits',
        helperLine: 'Reduced height for small tags, 8 to 14 digit GTIN',
        exampleValue: '09521234543213',
        messages: {
          charset: 'Use digits only.',
          length: 'Enter 8, 12, 13 or 14 digits.'
        }
      },
      {
        id: 'stacked',
        label: 'Stacked',
        description: 'Two row narrow packaging format',
        exactLengths: [8, 12, 13, 14],
        helperChip: 'GTIN-8, 12, 13 or 14 digits',
        helperLine: 'Two row narrow packaging format, 8 to 14 digit GTIN',
        exampleValue: '09521234543213',
        messages: {
          charset: 'Use digits only.',
          length: 'Enter 8, 12, 13 or 14 digits.'
        }
      },
      {
        id: 'stacked-omni',
        label: 'Stacked Omnidirectional',
        description: 'Two row full POS scan format',
        exactLengths: [8, 12, 13, 14],
        helperChip: 'GTIN-8, 12, 13 or 14 digits',
        helperLine: 'Two row full POS scan format, 8 to 14 digit GTIN',
        exampleValue: '09521234543213',
        messages: {
          charset: 'Use digits only.',
          length: 'Enter 8, 12, 13 or 14 digits.'
        }
      },
      {
        id: 'limited',
        label: 'Limited',
        description: 'Small items starting with 0 or 1',
        exactLengths: [8, 12, 13, 14],
        helperChip: 'GTIN starting with 0 or 1',
        helperLine: 'Small items; padded 14-digit GTIN must start with 0 or 1',
        exampleValue: '09521234543213',
        messages: {
          charset: 'Use digits only.',
          length: 'Enter 8, 12, 13 or 14 digits.',
          pattern: 'Limited accepts GTINs starting with 0 or 1.'
        }
      },
      {
        id: 'expanded',
        label: 'Expanded',
        description: 'Variable weight, price and date data',
        minLength: 1,
        maxLength: 90,
        helperChip: 'AIs in parens e.g. (01)...',
        helperLine: 'Use parentheses for AIs, for example (01)09521234543213(3103)000123',
        exampleValue: '(01)09521234543213(3103)000123',
        messages: {
          length: 'Enter between 1 and 90 characters.',
          pattern: 'Enter valid Application Identifiers or GTIN.'
        }
      },
      {
        id: 'expanded-stacked',
        label: 'Expanded Stacked',
        description: 'Multi-row variable data format',
        minLength: 1,
        maxLength: 90,
        helperChip: 'AIs in parens e.g. (01)...',
        helperLine: 'Multi-row variable data format with Application Identifiers',
        exampleValue: '(01)09521234543213(3103)000123',
        messages: {
          length: 'Enter between 1 and 90 characters.',
          pattern: 'Enter valid Application Identifiers or GTIN.'
        }
      }
    ],
    supportsHumanReadable: true,
    is2D: false,
    standardRef: 'ISO/IEC 24724',
    messages: {
      charset: 'Use digits only.',
      length: 'Enter 8, 12, 13 or 14 digits.'
    },
    usePageContent: {
      summary: 'GS1 DataBar encodes 14-digit GTINs and supplementary attributes in compact footprints suited for loose grocery items.',
      commonUses: 'Fresh produce, meat scales, pharmaceutical unit doses, and promotional manufacturer coupons.',
      characterSet: 'Numeric digits; alphanumeric strings supported in Expanded variant with Application Identifiers.',
      length: '14 digits for standard variants; up to 74 numeric digits in Expanded variants.',
      checkDigit: 'GS1 Modulo-10 check digit calculated over the primary GTIN.',
      faqs: [
        {
          question: 'What rule applies to the Limited variant?',
          answer: 'GS1 DataBar Limited accepts only 14-digit GTINs where the leading indicator digit is 0 or 1.'
        },
        {
          question: 'How does Expanded encode expiration dates and weight?',
          answer: 'GS1 DataBar Expanded uses standardized Application Identifiers in parentheses such as (17) for expiry date and (3103) for net kilograms.'
        },
        {
          question: 'Why are DataBar codes used on fresh fruits?',
          answer: 'Their compact size fits small adhesive stickers without losing readability at omnidirectional checkout scanners.'
        }
      ]
    }
  },

  code39ext: {
    id: 'code39ext',
    invalidExampleValue: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    expectedEncoded: (inp) => inp,
    expectedDecoded: (inp) => inp,
    slug: 'code-39-extended',
    label: 'Code 39 Extended',
    aliases: ['ascii', 'industrial', 'full ascii', 'inventory'],
    category: 'Industrial',
    family: 'Linear',
    tier: 2,
    enabled: true,
    description: 'Full ASCII character set',
    inputMode: 'text',
    charset: 'All 128 ASCII characters',
    charsetRegex: /^[\x00-\x7F]{1,40}$/,
    caseMode: 'preserve',
    normalizeSeparators: false,
    length: { min: 1, max: 40 },
    checksum: 'Optional Modulo 43 check character',
    checksumType: 'mod43',
    checksumOptional: true,
    exampleValue: 'Code39_Full_Ascii!',
    defaultOptions: {},
    engineId: 'code39ext',
    supportsHumanReadable: true,
    is2D: false,
    standardRef: 'ISO/IEC 16388',
    messages: {
      length: 'Enter between 1 and 40 characters.'
    },
    usePageContent: {
      summary: 'Code 39 Extended pairs existing characters to encode all 128 ASCII symbols including lowercase letters.',
      commonUses: 'Industrial labeling requiring punctuation or lowercase letters on legacy barcode printers.',
      characterSet: 'Full 128 ASCII table.',
      length: '1 to 40 characters.',
      checkDigit: 'Optional Modulo 43 check character.',
      faqs: [
        {
          question: 'How are lowercase letters encoded in Code 39 Extended?',
          answer: 'Lowercase letters are encoded by preceding an uppercase letter with a plus symbol (+A represents lowercase a).'
        },
        {
          question: 'Does the barcode appear wider in Extended mode?',
          answer: 'Yes. Characters outside standard Code 39 require two symbol positions each, increasing the total printed width.'
        },
        {
          question: 'Do all barcode scanners decode Code 39 Extended?',
          answer: 'Scanners must have Code 39 Full ASCII mode enabled in their configuration settings.'
        }
      ]
    }
  },

  msi: {
    id: 'msi',
    invalidExampleValue: '849201A',
    expectedEncoded: (inp) => inp,
    expectedDecoded: (inp) => inp,
    slug: 'msi-plessey',
    label: 'MSI Plessey',
    aliases: ['warehouse', 'shelf tag', 'supermarket shelf', 'inventory'],
    category: 'Industrial',
    family: 'Linear',
    tier: 2,
    enabled: true,
    description: 'Warehouse shelves and storage tags',
    inputMode: 'numeric',
    charset: 'Digits 0 to 9',
    charsetRegex: /^\d{1,40}$/,
    normalizeSeparators: true,
    length: { min: 1, max: 40 },
    checksum: 'Selectable Mod 10, Mod 11, or Mod 10/10',
    checksumType: 'none',
    checksumOptional: true,
    exampleValue: '8492015',
    defaultOptions: { msiCheck: 'mod10' },
    options: [
      {
        id: 'msiCheck',
        label: 'Check digit algorithm',
        type: 'select',
        allowedValues: ['mod10', 'mod11', 'mod1010', 'none'],
        default: 'mod10',
        engineOption: 'checktype',
        affectsOutput: true,
        description: 'MSI checksum calculation algorithm'
      }
    ],
    engineId: 'msi',
    supportsHumanReadable: true,
    is2D: false,
    standardRef: 'Plessey System',
    messages: {
      charset: 'Use digits only.',
      length: 'Enter between 1 and 40 digits.'
    },
    usePageContent: {
      summary: 'MSI Plessey is a continuous numeric symbology developed for shelf edge labeling and warehouse aisle inventory.',
      commonUses: 'Supermarket shelf price tags, storage bin locations, retail inventory reordering, and aisle numbering.',
      characterSet: 'Numeric digits 0 through 9 only.',
      length: 'Variable length up to 40 digits.',
      checkDigit: 'Configurable check algorithm: None, Modulo 10, Modulo 11, or dual Modulo 10/10.',
      faqs: [
        {
          question: 'Which check digit algorithm is standard for shelf tags?',
          answer: 'Modulo 10 is the standard check digit algorithm used by most retail grocery shelf management systems.'
        },
        {
          question: 'When should dual Mod 10/10 be selected?',
          answer: 'Dual Modulo 10/10 computes two sequential check digits for heightened security against transmission errors.'
        },
        {
          question: 'Can MSI barcodes encode letters?',
          answer: 'No. MSI Plessey supports only numeric digits 0 through 9.'
        }
      ]
    }
  },

  code11: {
    id: 'code11',
    invalidExampleValue: '8401A',
    expectedEncoded: (inp) => inp,
    expectedDecoded: (inp) => inp,
    slug: 'code-11',
    label: 'Code 11',
    aliases: ['telecommunications', 'telecom', 'equipment', 'matrix'],
    category: 'Industrial',
    family: 'Linear',
    tier: 2,
    enabled: true,
    description: 'Telecommunications equipment labeling',
    inputMode: 'numeric',
    charset: 'Digits 0 to 9 and dash (-)',
    charsetRegex: /^[0-9\-]{1,30}$/,
    caseMode: 'upper',
    normalizeSeparators: false,
    length: { min: 1, max: 30 },
    checksum: 'Automatic C and K check characters',
    checksumType: 'none',
    checksumOptional: false,
    exampleValue: '8401-92',
    defaultOptions: {},
    engineId: 'code11',
    supportsHumanReadable: true,
    is2D: false,
    standardRef: 'USD-8',
    messages: {
      charset: 'Use digits and hyphens only.',
      length: 'Enter between 1 and 30 characters.'
    },
    usePageContent: {
      summary: 'Code 11 is a high-density discrete linear symbology developed for labeling telecommunications equipment and components.',
      commonUses: 'Telecommunications circuit boards, phone exchange modules, and legacy telecom asset inventory.',
      characterSet: 'Numbers 0 through 9 and the hyphen (-).',
      length: '1 to 30 characters.',
      checkDigit: 'Automatic single (C) or dual (C and K) check characters depending on data length.',
      faqs: [
        {
          question: 'Why is it named Code 11?',
          answer: 'The name refers to its 11 matrix patterns comprising 10 digits and the dash character.'
        },
        {
          question: 'When are dual check characters applied?',
          answer: 'Data strings longer than 10 characters automatically calculate both C and K check characters.'
        },
        {
          question: 'Is Code 11 common in new systems?',
          answer: 'Code 11 is primarily maintained for compatibility with legacy telecommunications hardware.'
        }
      ]
    }
  },

  standard2of5: {
    id: 'standard2of5',
    invalidExampleValue: '9182736A',
    expectedEncoded: (inp) => inp,
    expectedDecoded: (inp) => inp,
    slug: 'standard-2-of-5',
    label: 'Standard 2 of 5',
    aliases: ['industrial 2 of 5', 'warehouse', 'freight', 'airline ticket'],
    category: 'Industrial',
    family: 'Linear',
    tier: 2,
    enabled: true,
    description: 'Industrial warehouse identification',
    inputMode: 'numeric',
    charset: 'Digits 0 to 9',
    charsetRegex: /^\d{1,40}$/,
    normalizeSeparators: true,
    length: { min: 1, max: 40 },
    checksum: 'Optional Modulo 10 check character',
    checksumType: 'none',
    checksumOptional: true,
    exampleValue: '91827364',
    defaultOptions: {},
    engineId: 'code2of5',
    supportsHumanReadable: true,
    is2D: false,
    standardRef: 'ANSI/AIM BC2',
    messages: {
      charset: 'Use digits only.',
      length: 'Enter between 1 and 40 digits.'
    },
    usePageContent: {
      summary: 'Standard 2 of 5 is a discrete numeric symbology where information is contained solely in the bar widths.',
      commonUses: 'Warehouse storage inventory, shipping photo processing, and airline baggage sorting.',
      characterSet: 'Numeric digits 0 through 9.',
      length: 'Variable length up to 40 digits.',
      checkDigit: 'Optional Modulo 10 check character.',
      faqs: [
        {
          question: 'How does Standard 2 of 5 differ from Interleaved 2 of 5?',
          answer: 'Standard 2 of 5 encodes information only in the bars with fixed spaces, while Interleaved 2 of 5 encodes in both bars and spaces.'
        },
        {
          question: 'Does Standard 2 of 5 require even character length?',
          answer: 'No. Because spaces carry no information, Standard 2 of 5 supports any number of digits.'
        },
        {
          question: 'Is Standard 2 of 5 recommended for new designs?',
          answer: 'Code 128 or Interleaved 2 of 5 are usually preferred due to superior data density.'
        }
      ]
    }
  },

  telepen: {
    id: 'telepen',
    invalidExampleValue: 'ñ€',
    expectedEncoded: (inp) => inp,
    expectedDecoded: (inp) => inp,
    slug: 'telepen',
    label: 'Telepen',
    aliases: ['uk', 'libraries', 'academic', 'full ascii'],
    category: 'Industrial',
    family: 'Linear',
    tier: 2,
    enabled: true,
    description: 'Full ASCII encoding with compact size',
    inputMode: 'text',
    charset: 'Full 128 ASCII character set',
    charsetRegex: /^[\x00-\x7F]{1,60}$/,
    caseMode: 'preserve',
    normalizeSeparators: false,
    length: { min: 1, max: 60 },
    checksum: 'Modulo 127 check character',
    checksumType: 'none',
    checksumOptional: false,
    exampleValue: 'TLP-9482',
    defaultOptions: {},
    engineId: 'telepen',
    supportsHumanReadable: true,
    is2D: false,
    standardRef: 'SBAC TS 1',
    messages: {
      length: 'Enter between 1 and 60 characters.'
    },
    usePageContent: {
      summary: 'Telepen is a compact linear barcode system capable of representing full ASCII without shift states.',
      commonUses: 'United Kingdom university libraries, student cards, asset management, and Ministry of Defence tracking.',
      characterSet: 'Full 128 ASCII table.',
      length: '1 to 60 characters.',
      checkDigit: 'Modulo 127 check character appended automatically.',
      faqs: [
        {
          question: 'What makes Telepen unique among linear barcodes?',
          answer: 'Telepen encodes full ASCII characters directly without character set shift combinations.'
        },
        {
          question: 'What is Telepen Numeric mode?',
          answer: 'Telepen can encode paired digits with double density when data contains only numbers.'
        },
        {
          question: 'Where is Telepen most widely used?',
          answer: 'Telepen has widespread adoption across British universities, public libraries, and aerospace supply chains.'
        }
      ]
    }
  },

  // ══════════════════════════════════════════════════════════════════
  // Tier 3 Formats (Phase C - Prepared in registry with enabled: false)
  // ══════════════════════════════════════════════════════════════════

  'gs1-128': {
    id: 'gs1-128',
    slug: 'gs1-128',
    label: 'GS1-128',
    aliases: ['shipping', 'sscc', 'logistics', 'pallet', 'gs1'],
    category: 'General and logistics',
    family: 'Linear',
    tier: 3,
    enabled: false,
    description: 'Logistics containers with application identifiers',
    inputMode: 'structured',
    charset: 'ASCII with FNC1',
    charsetRegex: /^.+$/,
    length: { min: 1, max: 80 },
    exampleValue: '(01)00123456789012(10)ABC123',
    defaultOptions: {},
    engineId: 'gs1-128',
    supportsHumanReadable: true,
    is2D: false,
    standardRef: 'GS1 General Specifications',
    usePageContent: {
      summary: 'GS1-128 is an application standard for shipping containers.',
      commonUses: 'SSCC logistics labels and supply chain tracking.',
      characterSet: 'ASCII with Application Identifiers.',
      length: 'Variable up to 80 characters.',
      checkDigit: 'Modulo 103 check character.',
      faqs: []
    }
  },

  'gs1-datamatrix': {
    id: 'gs1-datamatrix',
    slug: 'gs1-datamatrix',
    label: 'GS1 DataMatrix',
    aliases: ['healthcare', 'pharma', 'udi', 'medical device', 'fmd'],
    category: 'Healthcare',
    family: '2D Matrix',
    tier: 3,
    enabled: false,
    description: 'Healthcare and pharmaceutical serialization',
    inputMode: 'structured',
    charset: 'ASCII with FNC1',
    charsetRegex: /^.+$/,
    length: { min: 1, max: 500 },
    exampleValue: '(01)00123456789012(21)SER123',
    defaultOptions: {},
    engineId: 'gs1datamatrix',
    supportsHumanReadable: false,
    is2D: true,
    standardRef: 'GS1 Healthcare',
    usePageContent: {
      summary: 'GS1 DataMatrix for pharmaceutical serialization and medical device identification.',
      commonUses: 'Falsified Medicines Directive (FMD) and Unique Device Identification (UDI).',
      characterSet: 'GS1 structured data.',
      length: 'Up to 500 characters.',
      checkDigit: 'Reed-Solomon ECC 200.',
      faqs: []
    }
  },

  'digital-link': {
    id: 'digital-link',
    slug: 'digital-link',
    label: 'GS1 Digital Link',
    aliases: ['web', 'uri', 'resolver', 'qr', 'gs1'],
    category: 'Retail',
    family: '2D Matrix',
    tier: 3,
    enabled: false,
    description: 'Web URI consumer product connection',
    inputMode: 'text',
    charset: 'Web URI string',
    charsetRegex: /^https?:\/\/.+$/,
    length: { min: 10, max: 200 },
    exampleValue: 'https://id.gs1.org/01/01234567890128',
    defaultOptions: {},
    engineId: 'gs1digitallink',
    supportsHumanReadable: false,
    is2D: true,
    standardRef: 'GS1 Digital Link Standard',
    usePageContent: {
      summary: 'GS1 Digital Link connects physical barcodes to online web experiences.',
      commonUses: 'Smart packaging and product traceability.',
      characterSet: 'Standard URI format.',
      length: 'Variable.',
      checkDigit: 'Embedded in GTIN.',
      faqs: []
    }
  },

  pharmacode: {
    id: 'pharmacode',
    slug: 'pharmacode',
    label: 'Pharmacode',
    aliases: ['pharma', 'packing', 'leaflets', 'inspection'],
    category: 'Healthcare',
    family: 'Linear',
    tier: 3,
    enabled: false,
    description: 'Pharmaceutical packaging quality control',
    inputMode: 'numeric',
    charset: 'Numbers 3 to 131070',
    charsetRegex: /^\d{1,6}$/,
    length: { min: 1, max: 6 },
    exampleValue: '12345',
    defaultOptions: {},
    engineId: 'pharmacode',
    supportsHumanReadable: false,
    is2D: false,
    standardRef: 'Laetus Standard',
    usePageContent: {
      summary: 'Pharmacode is a single-track packaging verification code.',
      commonUses: 'Carton and leaflet assembly control.',
      characterSet: 'Numeric values 3 to 131070.',
      length: '1 to 6 digits.',
      checkDigit: 'None.',
      faqs: []
    }
  },

  postnet: {
    id: 'postnet',
    slug: 'postnet',
    label: 'POSTNET',
    aliases: ['usps', 'mail', 'postal', 'zip code'],
    category: 'Postal',
    family: 'Postal',
    tier: 3,
    enabled: false,
    description: 'Postal zip code routing',
    inputMode: 'numeric',
    charset: 'Digits 0 to 9',
    charsetRegex: /^\d{5,11}$/,
    length: { min: 5, max: 11 },
    exampleValue: '90210',
    defaultOptions: {},
    engineId: 'postnet',
    supportsHumanReadable: false,
    is2D: false,
    standardRef: 'USPS Publication 25',
    usePageContent: {
      summary: 'Legacy US postal routing barcode.',
      commonUses: 'Mail sorting.',
      characterSet: 'Digits.',
      length: '5, 9, or 11 digits.',
      checkDigit: 'Modulo-10.',
      faqs: []
    }
  },

  'royal-mail': {
    id: 'royal-mail',
    slug: 'royal-mail-4-state',
    label: 'Royal Mail 4-State',
    aliases: ['uk mail', 'post', 'rm4scc', 'cleanmail'],
    category: 'Postal',
    family: 'Postal',
    tier: 3,
    enabled: false,
    description: 'United Kingdom postal automated sorting',
    inputMode: 'text',
    charset: 'Alphanumeric postcode',
    charsetRegex: /^[0-9A-Z]+$/,
    length: { min: 5, max: 12 },
    exampleValue: 'SW1A1AA',
    defaultOptions: {},
    engineId: 'royalmail',
    supportsHumanReadable: false,
    is2D: false,
    standardRef: 'Royal Mail Guidelines',
    usePageContent: {
      summary: 'UK postal routing barcode.',
      commonUses: 'Letter sorting.',
      characterSet: 'Postcode characters.',
      length: 'Variable.',
      checkDigit: 'Modulo-6.',
      faqs: []
    }
  },

  'usps-intelligent-mail': {
    id: 'usps-intelligent-mail',
    slug: 'usps-intelligent-mail',
    label: 'USPS Intelligent Mail',
    aliases: ['imb', 'onecode', 'usps', 'mail'],
    category: 'Postal',
    family: 'Postal',
    tier: 3,
    enabled: false,
    description: 'United States postal tracking',
    inputMode: 'numeric',
    charset: 'Digits 0 to 9',
    charsetRegex: /^\d{20,31}$/,
    length: { min: 20, max: 31 },
    exampleValue: '01234567094987654321',
    defaultOptions: {},
    engineId: 'uspsimb',
    supportsHumanReadable: false,
    is2D: false,
    standardRef: 'USPS-B-3200',
    usePageContent: {
      summary: 'USPS Intelligent Mail barcode.',
      commonUses: 'Letters and flats tracking.',
      characterSet: 'Numeric sequence.',
      length: '20, 25, 29, or 31 digits.',
      checkDigit: 'Reed-Solomon.',
      faqs: []
    }
  },

  maxicode: {
    id: 'maxicode',
    slug: 'maxicode',
    label: 'MaxiCode',
    aliases: ['ups', 'shipping', 'package', 'hexagonal', 'bullseye'],
    category: '2D',
    family: '2D Matrix',
    tier: 3,
    enabled: false,
    description: 'High speed parcel sorting code',
    inputMode: 'structured',
    charset: 'ASCII table',
    charsetRegex: /^.+$/,
    length: { min: 10, max: 140 },
    exampleValue: '[)>019684001',
    defaultOptions: {},
    engineId: 'maxicode',
    supportsHumanReadable: false,
    is2D: true,
    standardRef: 'ISO/IEC 16023',
    usePageContent: {
      summary: 'Fixed-size hexagonal matrix code with central bulls-eye.',
      commonUses: 'UPS high-speed conveyor belt sorting.',
      characterSet: 'ASCII.',
      length: 'Fixed capacity.',
      checkDigit: 'Reed-Solomon.',
      faqs: []
    }
  },

  'epc-qr': {
    id: 'epc-qr',
    slug: 'epc-qr',
    label: 'EPC QR Code',
    aliases: ['payment', 'sepa', 'banking', 'girocode', 'invoice'],
    category: 'Payments',
    family: '2D Matrix',
    tier: 3,
    enabled: false,
    description: 'European SEPA payment transfer code',
    inputMode: 'structured',
    charset: 'Structured text with IBAN and BIC',
    charsetRegex: /^BCD.+$/,
    length: { min: 30, max: 330 },
    exampleValue: 'BCD\n002\n1\nSCT',
    defaultOptions: {},
    engineId: 'epcqr',
    supportsHumanReadable: false,
    is2D: true,
    standardRef: 'European Payments Council Standard',
    usePageContent: {
      summary: 'SEPA European banking transfer code.',
      commonUses: 'Utility bills and electronic invoices.',
      characterSet: 'Structured banking fields.',
      length: 'Variable.',
      checkDigit: 'IBAN Modulo-97 check.',
      faqs: []
    }
  }
};

// Assign sequence and sizing profiles to all catalog formats
for (const [id, item] of Object.entries(BARCODE_CATALOG)) {
  if (SEQUENCE_PROFILES[id]) {
    item.sequenceProfile = SEQUENCE_PROFILES[id];
  }
  if (SIZING_PROFILES[id]) {
    item.sizingProfile = SIZING_PROFILES[id];
  }
}

// apps/tool-barcode-generator/src/config/label-templates.config.ts

export type PageSize = 'a4' | 'letter';

export interface PageDimensions {
  widthMm: number;
  heightMm: number;
  widthPt: number;
  heightPt: number;
}

export const MM_TO_PT = 72 / 25.4; // ~2.83464567

export const PAGE_DIMENSIONS: Record<PageSize, PageDimensions> = {
  a4: {
    widthMm: 210,
    heightMm: 297,
    widthPt: 210 * MM_TO_PT, // 595.276
    heightPt: 297 * MM_TO_PT // 841.890
  },
  letter: {
    widthMm: 215.9,
    heightMm: 279.4,
    widthPt: 215.9 * MM_TO_PT, // 612.0
    heightPt: 279.4 * MM_TO_PT // 792.0
  }
};

export interface LabelSheetPreset {
  id: string;
  name: string;
  category: 'A4' | 'US Letter' | 'Plain paper' | 'Custom';
  pageSize: PageSize;
  cols: number;
  rows: number;
  labelWidthMm: number;
  labelHeightMm: number;
  topMarginMm: number;
  leftMarginMm: number;
  gapHMm: number;
  gapVMm: number;
  cornerRadiusMm: number;
  innerPaddingMm: number;
  labelsPerPage: number;
  isAutoGrid?: boolean;
  isCustom?: boolean;
}

export interface LabelRollPreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  isCustom?: boolean;
}

export const LABEL_SHEET_PRESETS: LabelSheetPreset[] = [
  // ── A4 Presets ──
  {
    id: 'a4-3x8',
    name: 'A4 — 3 × 8 (63.5 × 33.9 mm)',
    category: 'A4',
    pageSize: 'a4',
    cols: 3,
    rows: 8,
    labelWidthMm: 63.5,
    labelHeightMm: 33.9,
    topMarginMm: 13.0,
    leftMarginMm: 7.2,
    gapHMm: 2.5,
    gapVMm: 0,
    cornerRadiusMm: 1.5,
    innerPaddingMm: 2.0,
    labelsPerPage: 24
  },
  {
    id: 'a4-3x7',
    name: 'A4 — 3 × 7 (63.5 × 38.1 mm)',
    category: 'A4',
    pageSize: 'a4',
    cols: 3,
    rows: 7,
    labelWidthMm: 63.5,
    labelHeightMm: 38.1,
    topMarginMm: 15.15,
    leftMarginMm: 7.2,
    gapHMm: 2.5,
    gapVMm: 0,
    cornerRadiusMm: 1.5,
    innerPaddingMm: 2.0,
    labelsPerPage: 21
  },
  {
    id: 'a4-2x7',
    name: 'A4 — 2 × 7 (99.1 × 38.1 mm)',
    category: 'A4',
    pageSize: 'a4',
    cols: 2,
    rows: 7,
    labelWidthMm: 99.1,
    labelHeightMm: 38.1,
    topMarginMm: 15.15,
    leftMarginMm: 4.7,
    gapHMm: 2.5,
    gapVMm: 0,
    cornerRadiusMm: 1.5,
    innerPaddingMm: 2.5,
    labelsPerPage: 14
  },
  {
    id: 'a4-2x4',
    name: 'A4 — 2 × 4 (99.1 × 67.7 mm)',
    category: 'A4',
    pageSize: 'a4',
    cols: 2,
    rows: 4,
    labelWidthMm: 99.1,
    labelHeightMm: 67.7,
    topMarginMm: 13.1,
    leftMarginMm: 4.7,
    gapHMm: 2.5,
    gapVMm: 0,
    cornerRadiusMm: 2.0,
    innerPaddingMm: 3.0,
    labelsPerPage: 8
  },
  {
    id: 'a4-5x13',
    name: 'A4 — 5 × 13 (38.1 × 21.2 mm)',
    category: 'A4',
    pageSize: 'a4',
    cols: 5,
    rows: 13,
    labelWidthMm: 38.1,
    labelHeightMm: 21.2,
    topMarginMm: 10.7,
    leftMarginMm: 4.7,
    gapHMm: 2.5,
    gapVMm: 0,
    cornerRadiusMm: 1.0,
    innerPaddingMm: 1.5,
    labelsPerPage: 65
  },
  {
    id: 'a4-4x10',
    name: 'A4 — 4 × 10 (48.5 × 25.4 mm)',
    category: 'A4',
    pageSize: 'a4',
    cols: 4,
    rows: 10,
    labelWidthMm: 48.5,
    labelHeightMm: 25.4,
    topMarginMm: 21.5,
    leftMarginMm: 5.0,
    gapHMm: 0,
    gapVMm: 0,
    cornerRadiusMm: 0,
    innerPaddingMm: 1.5,
    labelsPerPage: 40
  },

  // ── US Letter Presets ──
  {
    id: 'letter-3x10',
    name: 'US Letter — 3 × 10 (2.625 × 1 in)',
    category: 'US Letter',
    pageSize: 'letter',
    cols: 3,
    rows: 10,
    labelWidthMm: 66.675,
    labelHeightMm: 25.4,
    topMarginMm: 12.7,
    leftMarginMm: 4.76,
    gapHMm: 3.175,
    gapVMm: 0,
    cornerRadiusMm: 1.5,
    innerPaddingMm: 2.0,
    labelsPerPage: 30
  },
  {
    id: 'letter-2x5',
    name: 'US Letter — 2 × 5 (4 × 2 in)',
    category: 'US Letter',
    pageSize: 'letter',
    cols: 2,
    rows: 5,
    labelWidthMm: 101.6,
    labelHeightMm: 50.8,
    topMarginMm: 12.7,
    leftMarginMm: 3.97,
    gapHMm: 3.97,
    gapVMm: 0,
    cornerRadiusMm: 2.0,
    innerPaddingMm: 3.0,
    labelsPerPage: 10
  },
  {
    id: 'letter-4x20',
    name: 'US Letter — 4 × 20 (1.75 × 0.5 in)',
    category: 'US Letter',
    pageSize: 'letter',
    cols: 4,
    rows: 20,
    labelWidthMm: 44.45,
    labelHeightMm: 12.7,
    topMarginMm: 12.7,
    leftMarginMm: 7.14,
    gapHMm: 7.94,
    gapVMm: 0,
    cornerRadiusMm: 1.0,
    innerPaddingMm: 1.0,
    labelsPerPage: 80
  },

  // ── Plain Paper Auto Grid ──
  {
    id: 'grid-auto',
    name: 'One barcode grid (no label sheet)',
    category: 'Plain paper',
    pageSize: 'a4',
    cols: 3,
    rows: 6,
    labelWidthMm: 60.0,
    labelHeightMm: 40.0,
    topMarginMm: 15.0,
    leftMarginMm: 10.0,
    gapHMm: 5.0,
    gapVMm: 5.0,
    cornerRadiusMm: 0,
    innerPaddingMm: 2.5,
    labelsPerPage: 18,
    isAutoGrid: true
  },

  // ── Custom Layout ──
  {
    id: 'custom',
    name: 'Custom layout',
    category: 'Custom',
    pageSize: 'a4',
    cols: 3,
    rows: 8,
    labelWidthMm: 63.5,
    labelHeightMm: 33.9,
    topMarginMm: 13.0,
    leftMarginMm: 7.2,
    gapHMm: 2.5,
    gapVMm: 0,
    cornerRadiusMm: 1.5,
    innerPaddingMm: 2.0,
    labelsPerPage: 24,
    isCustom: true
  }
];

export const LABEL_ROLL_PRESETS: LabelRollPreset[] = [
  { id: '25x15', name: '25 × 15 mm', widthMm: 25, heightMm: 15 },
  { id: '38x25', name: '38 × 25 mm', widthMm: 38, heightMm: 25 },
  { id: '50x25', name: '50 × 25 mm', widthMm: 50, heightMm: 25 },
  { id: '50x30', name: '50 × 30 mm', widthMm: 50, heightMm: 30 },
  { id: '100x50', name: '100 × 50 mm', widthMm: 100, heightMm: 50 },
  { id: '100x150', name: '100 × 150 mm (4 × 6 in shipping)', widthMm: 100, heightMm: 150 },
  { id: 'roll-custom', name: 'Custom roll size', widthMm: 50, heightMm: 25, isCustom: true }
];

/**
 * Detects the default page size ('a4' or 'letter') based on runtime locale and timeZone.
 */
export function detectDefaultPageSize(): PageSize {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (
      tz.startsWith('America/New_York') ||
      tz.startsWith('America/Chicago') ||
      tz.startsWith('America/Denver') ||
      tz.startsWith('America/Los_Angeles') ||
      tz.startsWith('America/Toronto') ||
      tz.startsWith('America/Vancouver') ||
      tz.startsWith('America/Phoenix') ||
      tz.startsWith('US/') ||
      tz.startsWith('Canada/')
    ) {
      return 'letter';
    }
  } catch {}
  return 'a4';
}

export function getPresetById(id: string): LabelSheetPreset {
  return LABEL_SHEET_PRESETS.find(p => p.id === id) || LABEL_SHEET_PRESETS[0];
}

export function getRollPresetById(id: string): LabelRollPreset {
  return LABEL_ROLL_PRESETS.find(p => p.id === id) || LABEL_ROLL_PRESETS[2]; // default 50x25
}


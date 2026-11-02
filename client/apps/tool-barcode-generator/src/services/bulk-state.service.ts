// apps/tool-barcode-generator/src/services/bulk-state.service.ts
import { Injectable, signal, computed, inject } from '@angular/core';
import {
  BulkOutputType,
  BulkSourceMode,
  BulkRecord,
  BulkCaptionStyle,
  BarcodeDesignOptions,
  FormatPerOptions
} from '../models/barcode.models';
import {
  LabelSheetPreset,
  LabelRollPreset,
  LABEL_SHEET_PRESETS,
  LABEL_ROLL_PRESETS,
  detectDefaultPageSize,
  getPresetById,
  getRollPresetById,
  PageSize,
  PAGE_DIMENSIONS
} from '../config/label-templates.config';
import { FormatRegistryService } from './format-registry.service';
import { RenderService } from './render.service';
import { SheetLayoutService, SheetPageModel, RollLabelModel } from './sheet-layout.service';

const STORAGE_KEY_PAGE_SETUP = 'acklet_barcode_bulk_page_setup';

export interface SavedPageSetup {
  pageSize: PageSize;
  presetId: string;
  rollPresetId: string;
  dpi?: 150 | 300 | 600;
  showCutGuides?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class BulkStateService {
  private registry = inject(FormatRegistryService);
  private renderer = inject(RenderService);
  private sheetLayout = inject(SheetLayoutService);

  // Running status
  readonly isRunning = signal<boolean>(false);
  readonly triggerGenerateRun = signal<number>(0);

  triggerGenerate(): void {
    this.triggerGenerateRun.update(n => n + 1);
  }

  // Source selection: List or CSV only (Sequence removed)
  readonly sourceMode = signal<BulkSourceMode>('list');

  // CSV Import State
  readonly csvFileName = signal<string>('');
  readonly csvRawText = signal<string>('');
  readonly csvHasHeader = signal<boolean>(true);
  readonly csvValueColIdx = signal<number>(0);
  readonly csvCaptionColIdx = signal<number>(-1);

  loadCsvFile(fileName: string, content: string): void {
    this.sourceMode.set('csv');
    this.csvFileName.set(fileName);
    this.csvRawText.set(content);
    this.csvValueColIdx.set(0);
    this.csvCaptionColIdx.set(-1);
  }

  clearCsvFile(): void {
    this.csvFileName.set('');
    this.csvRawText.set('');
  }

  // Format selection in Bulk (starts initialized from Content tab, changeable in Bulk)
  readonly formatId = signal<string>('code128');
  readonly formatOptions = signal<FormatPerOptions>({});

  // Output selection
  readonly outputType = signal<BulkOutputType>('print-sheet');

  // Sheet layout settings
  readonly pageSize = signal<PageSize>(detectDefaultPageSize());
  readonly selectedPresetId = signal<string>(detectDefaultPageSize() === 'letter' ? 'letter-3x10' : 'a4-3x8');
  readonly customPreset = signal<LabelSheetPreset>({
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
  });

  readonly selectedRollPresetId = signal<string>('50x25');
  readonly customRollPreset = signal<LabelRollPreset>({
    id: 'roll-custom',
    name: 'Custom roll size',
    widthMm: 50,
    heightMm: 25,
    isCustom: true
  });

  // Sheet options
  readonly startAtLabel = signal<number>(1);
  readonly showValueText = signal<boolean>(true);
  readonly showLabelText = signal<boolean>(true);
  readonly textSizePt = signal<number | 'auto'>('auto');
  readonly showCutGuides = signal<boolean>(false);
  readonly fitMode = signal<'fit-inside' | 'actual'>('fit-inside');
  readonly copies = signal<number>(1);

  // Fine-tune nudge offsets (-5 to +5 mm)
  readonly nudgeXmm = signal<number>(0);
  readonly nudgeYmm = signal<number>(0);

  // Runtime Caption Styling (does NOT affect barcode generation)
  readonly captionFontSizePt = signal<number | 'auto'>('auto');
  readonly captionColor = signal<string>('#334155');
  readonly captionBold = signal<boolean>(false);
  readonly captionFontFamily = signal<'sans' | 'mono'>('sans');
  readonly captionTransform = signal<'none' | 'uppercase'>('none');
  readonly captionAlign = signal<'center' | 'left' | 'right'>('center');

  readonly captionStyle = computed<BulkCaptionStyle>(() => ({
    fontSizePt: this.captionFontSizePt(),
    color: this.captionColor(),
    bold: this.captionBold(),
    fontFamily: this.captionFontFamily(),
    transform: this.captionTransform(),
    align: this.captionAlign()
  }));

  readonly hasCaptions = computed<boolean>(() => {
    if (!this.showLabelText()) return false;
    const records = this.activeValidRecords();
    return records.some(r => !!r.labelText && r.labelText.trim().length > 0);
  });

  resetCaptionStyle(): void {
    this.captionFontSizePt.set('auto');
    this.captionColor.set('#334155');
    this.captionBold.set(false);
    this.captionFontFamily.set('sans');
    this.captionTransform.set('none');
    this.captionAlign.set('center');
  }

  // Zoom mode in preview: 'fit' | '100' | '150'
  readonly zoomMode = signal<'fit' | '100' | '150'>('fit');

  // Export resolution DPI (150, 300, 600)
  readonly exportDpi = signal<150 | 300 | 600>(300);

  // Review options
  readonly skipInvalidRows = signal<boolean>(false);
  readonly removeDuplicates = signal<boolean>(false);

  // Active records reviewed
  readonly reviewedRecords = signal<BulkRecord[]>([]);

  // Preview page navigation
  readonly previewPage = signal<number>(1);

  // Generate-Gated Preview State (Single source of truth)
  readonly isGenerated = signal<boolean>(false);
  readonly generatedItems = signal<{
    value: string;
    cleanValue: string;
    displayValue: string;
    labelText?: string;
    svg?: string;
    verified?: boolean;
    error?: string;
  }[]>([]);
  readonly generatedSheetPages = signal<SheetPageModel[]>([]);
  readonly generatedRollLabels = signal<RollLabelModel[]>([]);
  readonly verificationSummary = signal<{
    total: number;
    verified: number;
    failed: number;
    failedItems: Array<{ index: number; value: string; error?: string }>;
  } | null>(null);

  // Sample items with rendered SVGs for live preview
  readonly previewItems = signal<{ value: string; displayValue: string; labelText?: string; svg?: string }[]>([]);
  readonly isPreviewRendering = signal<boolean>(false);

  resetGenerated(): void {
    this.isGenerated.set(false);
    this.generatedItems.set([]);
    this.generatedSheetPages.set([]);
    this.generatedRollLabels.set([]);
    this.verificationSummary.set(null);
  }

  setGenerated(
    items: Array<{
      value: string;
      cleanValue: string;
      displayValue: string;
      labelText?: string;
      svg?: string;
      verified?: boolean;
      error?: string;
    }>,
    summary: {
      total: number;
      verified: number;
      failed: number;
      failedItems: Array<{ index: number; value: string; error?: string }>;
    },
    sheetPages?: SheetPageModel[],
    rollLabels?: RollLabelModel[]
  ): void {
    this.generatedItems.set(items);
    this.verificationSummary.set(summary);
    if (sheetPages && sheetPages.length > 0) {
      this.generatedSheetPages.set(sheetPages);
    }
    if (rollLabels && rollLabels.length > 0) {
      this.generatedRollLabels.set(rollLabels);
    }
    this.isGenerated.set(true);
  }

  readonly customLayoutError = computed<string | null>(() => {
    if (this.selectedPresetId() !== 'custom') return null;
    const p = this.pageSize();
    const pageDim = PAGE_DIMENSIONS[p] || PAGE_DIMENSIONS.a4;
    const c = this.customPreset();

    // Total width needed = leftMargin * 2 + cols * labelWidth + (cols - 1) * gapH
    const totalWidth = c.leftMarginMm * 2 + c.cols * c.labelWidthMm + Math.max(0, c.cols - 1) * c.gapHMm;
    // Total height needed = topMargin * 2 + rows * labelHeight + (rows - 1) * gapV
    const totalHeight = c.topMarginMm * 2 + c.rows * c.labelHeightMm + Math.max(0, c.rows - 1) * c.gapVMm;

    if (totalWidth > pageDim.widthMm + 0.1) {
      return `Labels exceed page width: ${totalWidth.toFixed(1)} mm > ${pageDim.widthMm} mm (${p.toUpperCase()}). Reduce columns, label width or margins.`;
    }
    if (totalHeight > pageDim.heightMm + 0.1) {
      return `Labels exceed page height: ${totalHeight.toFixed(1)} mm > ${pageDim.heightMm} mm (${p.toUpperCase()}). Reduce rows, label height or margins.`;
    }
    return null;
  });

  readonly currentPreset = computed<LabelSheetPreset>(() => {
    const id = this.selectedPresetId();
    if (id === 'custom') return this.customPreset();
    return getPresetById(id);
  });

  readonly currentRollPreset = computed<LabelRollPreset>(() => {
    const id = this.selectedRollPresetId();
    if (id === 'roll-custom') return this.customRollPreset();
    return getRollPresetById(id);
  });

  readonly labelsPerPage = computed<number>(() => {
    const p = this.currentPreset();
    return p.cols * p.rows;
  });

  readonly activeValidRecords = computed<BulkRecord[]>(() => {
    let recs = this.reviewedRecords();
    if (this.skipInvalidRows()) {
      recs = recs.filter(r => r.status !== 'invalid');
    }
    if (this.removeDuplicates()) {
      const seen = new Set<string>();
      recs = recs.filter(r => {
        if (seen.has(r.value)) return false;
        seen.add(r.value);
        return true;
      });
    }
    return recs;
  });

  readonly sheetPages = computed<SheetPageModel[]>(() => {
    // If already generated, return the generated pages directly (changing settings won't alter preview until Generate clicked)
    if (this.isGenerated() && this.generatedSheetPages().length > 0) {
      return this.generatedSheetPages();
    }

    const records = this.activeValidRecords();
    const preset = this.currentPreset();
    const isGen = this.isGenerated();
    const generated = this.generatedItems();

    // Map by direct array index: record i gets generated[i].svg
    const recordsWithSvg = records.map((r, i) => ({
      value: r.value,
      cleanValue: r.cleanValue,
      displayValue: r.displayValue,
      labelText: r.labelText,
      status: r.status,
      svg: isGen && generated[i] ? (generated[i].svg || '') : ''
    }));

    return this.sheetLayout.layoutSheetPages({
      records: recordsWithSvg,
      preset,
      startAtLabel: 1,
      copies: 1,
      textSizePt: 'auto',
      showValueText: this.showValueText(),
      showLabelText: this.showLabelText(),
      showCutGuides: this.showCutGuides(),
      nudgeXmm: this.nudgeXmm(),
      nudgeYmm: this.nudgeYmm(),
      formatItem: this.registry.getFormat(this.formatId())
    });
  });

  readonly rollCurrentIndex = signal<number>(1);

  readonly rollLabels = computed<RollLabelModel[]>(() => {
    if (this.isGenerated() && this.generatedRollLabels().length > 0) {
      return this.generatedRollLabels();
    }

    const records = this.activeValidRecords();
    const rollPreset = this.currentRollPreset();
    const isGen = this.isGenerated();
    const generated = this.generatedItems();

    const recordsWithSvg = records.map((r, i) => ({
      value: r.value,
      cleanValue: r.cleanValue,
      displayValue: r.displayValue,
      labelText: r.labelText,
      status: r.status,
      svg: isGen && generated[i] ? (generated[i].svg || '') : ''
    }));

    return this.sheetLayout.layoutRollPages({
      records: recordsWithSvg,
      rollPreset,
      showLabelText: this.showLabelText(),
      formatItem: this.registry.getFormat(this.formatId()),
      targetDpi: this.exportDpi() === 150 ? 203 : (this.exportDpi() === 600 ? 300 : 203)
    });
  });

  readonly currentPageModel = computed<SheetPageModel | undefined>(() => {
    const pages = this.sheetPages();
    if (pages.length === 0) return undefined;
    const pageIdx = Math.max(0, Math.min(this.previewPage() - 1, pages.length - 1));
    return pages[pageIdx];
  });

  readonly totalPreviewPages = computed<number>(() => {
    const totalItems = this.activeValidRecords().length;
    if (totalItems === 0) return 1;

    if (
      this.outputType() === 'print-sheet' ||
      this.outputType() === 'sheet-png' ||
      this.outputType() === 'pdf-labels'
    ) {
      const perPage = Math.max(1, this.labelsPerPage());
      return Math.max(1, Math.ceil(totalItems / perPage));
    } else if (this.outputType() === 'label-roll') {
      return Math.max(1, totalItems * Math.max(1, this.copies()));
    }
    return 1;
  });

  constructor() {
    this.restorePageSetup();
  }

  nextPage(): void {
    if (this.previewPage() < this.totalPreviewPages()) {
      this.previewPage.update(p => p + 1);
    }
  }

  prevPage(): void {
    if (this.previewPage() > 1) {
      this.previewPage.update(p => p - 1);
    }
  }

  setPreviewPage(page: number): void {
    const max = this.totalPreviewPages();
    this.previewPage.set(Math.max(1, Math.min(page, max)));
  }

  /**
   * Updates preview barcodes with rendered SVGs applying the selected text size.
   */
  async refreshPreviewSvgs(designOptions: BarcodeDesignOptions): Promise<void> {
    const records = this.activeValidRecords();
    const item = this.registry.getFormat(this.formatId());
    if (!item || records.length === 0) {
      this.previewItems.set([]);
      return;
    }

    this.isPreviewRendering.set(true);

    // Calculate effective text size to pass into engine
    const preset = this.currentPreset();
    const effectiveTextSize =
      this.textSizePt() === 'auto'
        ? this.sheetLayout.getOptimalTextSizePt(preset.labelHeightMm, this.showLabelText())
        : Number(this.textSizePt());

    const bulkDesignOptions: BarcodeDesignOptions = {
      ...designOptions,
      fontSize: effectiveTextSize,
      showText: this.showValueText()
    };

    // Render all active records up to system limit (max 500) so all pages have valid barcodes
    const sample = records.slice(0, 500);
    const rendered: { value: string; displayValue: string; labelText?: string; svg?: string }[] = [];

    for (const rec of sample) {
      if (rec.status === 'invalid') {
        rendered.push({
          value: rec.value,
          displayValue: rec.value,
          labelText: rec.labelText,
          svg: ''
        });
      } else {
        try {
          const res = await this.renderer.render(
            item,
            rec.cleanValue,
            rec.displayValue,
            bulkDesignOptions,
            this.formatOptions()
          );
          rendered.push({
            value: rec.cleanValue,
            displayValue: rec.displayValue,
            labelText: rec.labelText,
            svg: res.svg
          });
        } catch {
          rendered.push({
            value: rec.value,
            displayValue: rec.value,
            labelText: rec.labelText,
            svg: ''
          });
        }
      }
    }

    this.previewItems.set(rendered);
    this.isPreviewRendering.set(false);
  }

  /**
   * Restores non-sensitive page setup from localStorage.
   * Old settings containing removed keys are safely ignored without errors.
   */
  private restorePageSetup(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const raw = window.localStorage.getItem(STORAGE_KEY_PAGE_SETUP);
      if (!raw) return;
      const parsed: SavedPageSetup = JSON.parse(raw);
      if (parsed.pageSize) this.pageSize.set(parsed.pageSize);
      if (parsed.presetId) this.selectedPresetId.set(parsed.presetId);
      if (parsed.rollPresetId) this.selectedRollPresetId.set(parsed.rollPresetId);
      if (parsed.dpi) this.exportDpi.set(parsed.dpi);
      if (parsed.showCutGuides !== undefined) this.showCutGuides.set(parsed.showCutGuides);
    } catch {}
  }

  /**
   * Persists non-sensitive page setup to localStorage.
   */
  savePageSetup(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const data: SavedPageSetup = {
        pageSize: this.pageSize(),
        presetId: this.selectedPresetId(),
        rollPresetId: this.selectedRollPresetId(),
        dpi: this.exportDpi(),
        showCutGuides: this.showCutGuides()
      };
      window.localStorage.setItem(STORAGE_KEY_PAGE_SETUP, JSON.stringify(data));
    } catch {}
  }
}

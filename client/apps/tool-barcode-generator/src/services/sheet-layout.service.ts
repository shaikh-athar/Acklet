// apps/tool-barcode-generator/src/services/sheet-layout.service.ts
import { Injectable } from '@angular/core';
import {
  LabelSheetPreset,
  LabelRollPreset,
  LABEL_SHEET_PRESETS,
  LABEL_ROLL_PRESETS,
  PAGE_DIMENSIONS,
  MM_TO_PT
} from '../config/label-templates.config';
import { BulkRecord, BarcodeCatalogItem, BarcodeSizingProfile, BulkCaptionStyle } from '../models/barcode.models';

export interface BarcodeSizingCalculation {
  symbolWidthMm: number;
  symbolHeightMm: number;
  barcodeAreaX: number;
  barcodeAreaY: number;
  captionX: number;
  captionY: number;
  effectiveXmm: number;
  effectiveTextSizePt: number;
  fits: boolean;
  tooSmallReason?: string;
  isReducedHeight?: boolean;
  suggestedSmallestPreset?: string;
}

export interface SheetLabelItem {
  slotIndex: number; // 0-based index on current page
  globalSlotIndex: number; // 0-based index across all pages
  col: number;
  row: number;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  innerX: number;
  innerY: number;
  innerWidth: number;
  innerHeight: number;
  barcodeAreaX: number;
  barcodeAreaY: number;
  barcodeAreaW: number;
  barcodeAreaH: number;
  captionX: number;
  captionY: number;
  hasItem: boolean;
  record?: BulkRecord;
  value?: string;
  cleanValue?: string;
  displayValue?: string;
  labelText?: string;
  hasCaption?: boolean;
  svg?: string;
  textSizePt: number;
  fits: boolean;
  tooSmallReason?: string;
  effectiveXmm?: number;
  isReducedHeight?: boolean;
}

export interface SheetPageModel {
  pageNumber: number; // 1-based
  totalPages: number;
  pageWidthMm: number;
  pageHeightMm: number;
  labels: SheetLabelItem[];
  preset: LabelSheetPreset;
  showCutGuides: boolean;
  nudgeXmm: number;
  nudgeYmm: number;
  warning?: string;
}

export interface SheetLayoutOptions {
  records: Array<{
    value: string;
    cleanValue?: string;
    displayValue?: string;
    labelText?: string;
    svg?: string;
    status?: string;
  }>;
  preset: LabelSheetPreset;
  startAtLabel?: number; // 1-based, default 1
  copies?: number; // default 1
  textSizePt?: number | 'auto'; // default 'auto'
  showValueText?: boolean;
  showLabelText?: boolean;
  showCutGuides?: boolean;
  nudgeXmm?: number; // default 0
  nudgeYmm?: number; // default 0
  formatItem?: BarcodeCatalogItem;
  targetDpi?: number;
}

export interface RollLabelModel {
  index: number; // 1-based
  widthMm: number;
  heightMm: number;
  innerX: number;
  innerY: number;
  innerWidth: number;
  innerHeight: number;
  barcodeAreaX: number;
  barcodeAreaY: number;
  barcodeAreaW: number;
  barcodeAreaH: number;
  captionX: number;
  captionY: number;
  hasItem: boolean;
  value?: string;
  cleanValue?: string;
  displayValue?: string;
  labelText?: string;
  hasCaption?: boolean;
  svg?: string;
  textSizePt: number;
  fits: boolean;
  tooSmallReason?: string;
  effectiveXmm?: number;
  isReducedHeight?: boolean;
  rollPreset: LabelRollPreset;
}

export interface RollLayoutOptions {
  records: Array<{
    value: string;
    cleanValue?: string;
    displayValue?: string;
    labelText?: string;
    svg?: string;
    status?: string;
  }>;
  rollPreset: LabelRollPreset;
  showValueText?: boolean;
  showLabelText?: boolean;
  formatItem?: BarcodeCatalogItem;
  targetDpi?: number;
}

@Injectable({
  providedIn: 'root'
})
export class SheetLayoutService {
  /**
   * Automatic text sizing (Section 3):
   * Digits text size is chosen automatically: largest size up to 10 pt that fits
   * symbol width and about 25% of the label height, never below 6 pt.
   */
  getOptimalTextSizePt(labelHeightMm: number, hasCaption: boolean): number {
    // 1 pt ≈ 0.3528 mm
    const maxPtByHeight = Math.floor((labelHeightMm * 0.25) / 0.3528);
    let size = Math.min(10, Math.max(6, maxPtByHeight));
    if (hasCaption && size > 6) {
      size = Math.max(6, size - 1);
    }
    return size;
  }

  /**
   * Computes exact uniform sizing for a barcode symbol on a label (Section 2).
   * Never stretches: barcodes are scaled uniformly only.
   */
  computeBarcodeSizing(
    labelW: number,
    labelH: number,
    isRoll: boolean,
    targetDpi: number,
    formatItem: BarcodeCatalogItem | undefined,
    cleanValue: string,
    hasCaption: boolean,
    vbWidth = 240,
    vbHeight = 120
  ): BarcodeSizingCalculation {
    const pad = isRoll ? 1.5 : 2.0;
    const innerW = Math.max(8, labelW - pad * 2);
    const innerH = Math.max(6, labelH - pad * 2);

    const profile: BarcodeSizingProfile = formatItem?.sizingProfile || {
      kind: formatItem?.is2D ? 'matrix' : 'linear-variable',
      minXmm: formatItem?.is2D ? 0.25 : 0.19,
      maxXmm: formatItem?.is2D ? 0.80 : 0.64,
      quietZoneModules: formatItem?.is2D ? 2 : 10,
      minBarHeightMm: formatItem?.is2D ? 5.0 : 6.0
    };

    // Automatic text size
    const effectiveTextSizePt = this.getOptimalTextSizePt(labelH, hasCaption);
    const digitsHeightMm = (formatItem?.supportsHumanReadable !== false) ? effectiveTextSizePt * 0.3528 * 1.2 : 0;
    const captionHeightMm = hasCaption ? effectiveTextSizePt * 0.3528 * 1.2 : 0;
    const availableH = Math.max(2, innerH - digitsHeightMm - captionHeightMm);

    // Total modules from viewBox
    const totalModules = vbWidth > 0 ? vbWidth : 80;

    let symbolWidthMm = innerW;
    let symbolHeightMm = availableH;
    let effectiveXmm = 0.25;
    let fits = true;
    let tooSmallReason: string | undefined;
    let isReducedHeight = false;

    if (profile.kind === 'linear-variable') {
      // 1. Target width: fill at least 70% of inner width unless limited by maxX
      const idealX = innerW / totalModules;
      let chosenX = Math.min(idealX, profile.maxXmm);

      // Printable step rounding
      if (isRoll && targetDpi > 0) {
        const dotMm = 25.4 / targetDpi;
        const dots = Math.floor(chosenX / dotMm);
        chosenX = Math.max(dotMm, dots * dotMm);
      } else {
        chosenX = Math.floor(chosenX * 100) / 100; // 0.01 mm step
      }

      effectiveXmm = chosenX;

      // Minimum check: never below minXmm
      if (chosenX < profile.minXmm) {
        fits = false;
        const minReqW = Math.ceil(totalModules * profile.minXmm + pad * 2);
        tooSmallReason = `Too small for this label. Requires at least ${minReqW} mm width.`;
      }

      symbolWidthMm = totalModules * chosenX;

      // Bar height: available height with configured max share of label (e.g. 75%), min rule
      const maxAllowedBarH = Math.min(availableH, innerH * (profile.maxHeightShare || 0.75), 38.0);
      const chosenBarH = Math.max(profile.minBarHeightMm, maxAllowedBarH);

      if (availableH < profile.minBarHeightMm) {
        fits = false;
        const minH = Math.ceil(profile.minBarHeightMm + digitsHeightMm + captionHeightMm + pad * 2);
        tooSmallReason = `Label height too small. Requires at least ${minH} mm height.`;
      }

      symbolHeightMm = Math.min(availableH, chosenBarH + digitsHeightMm);

    } else if (profile.kind === 'linear-fixed') {
      // Fixed-size retail formats (EAN-13, UPC-A, EAN-8, ITF-14, etc.)
      const nomW = profile.nominalWidthMm || 37.29;
      const nomH = profile.nominalHeightMm || 22.85;
      const nomX = profile.nominalXmm || 0.33;
      const magMin = profile.allowedMagMin || 0.80;
      const magMax = profile.allowedMagMax || 2.00;
      const minHeightShare = profile.minHeightShare || 0.60;

      const magW = innerW / nomW;
      const magH = availableH / nomH;
      let mag = Math.min(magW, magH, magMax);

      if (magW < magMin) {
        // Width does not fit even at minimum magnification
        fits = false;
        const minReqW = (nomW * magMin + pad * 2).toFixed(1);
        tooSmallReason = `Too small for this label. Requires at least ${minReqW} mm width.`;
        mag = magMin;
      } else if (magH < magMin) {
        // Width fits, but full nominal height does not fit at minimum mag
        // Check if available height fits at minHeightShare (e.g. 60% of nominal)
        const minAllowableBarH = nomH * magMin * minHeightShare;
        if (availableH >= minAllowableBarH) {
          mag = Math.max(magMin, Math.min(magW, magMax));
          if (isRoll && targetDpi > 0) {
            const dotMm = 25.4 / targetDpi;
            const xMm = nomX * mag;
            const dots = Math.floor(xMm / dotMm);
            const snappedX = Math.max(dotMm, dots * dotMm);
            mag = snappedX / nomX;
          }
          symbolWidthMm = nomW * mag;
          symbolHeightMm = availableH; // truncated height
          isReducedHeight = true;
          effectiveXmm = nomX * mag;
        } else {
          fits = false;
          tooSmallReason = `Label height too small for ${formatItem?.label || 'retail barcode'}.`;
          mag = magMin;
        }
      }

      if (fits && !isReducedHeight) {
        mag = Math.max(magMin, Math.min(mag, magMax));
        if (isRoll && targetDpi > 0) {
          const dotMm = 25.4 / targetDpi;
          const xMm = nomX * mag;
          const dots = Math.floor(xMm / dotMm);
          const snappedX = Math.max(dotMm, dots * dotMm);
          mag = snappedX / nomX;
        }
        symbolWidthMm = nomW * mag;
        symbolHeightMm = nomH * mag + digitsHeightMm;
        effectiveXmm = nomX * mag;
      }

    } else if (profile.kind === 'matrix') {
      // 2D Square matrix: Data Matrix, Aztec, QR Code
      const minSide = Math.min(innerW, availableH);
      const matrixModules = vbWidth > 0 ? vbWidth : 26;
      let chosenX = minSide / matrixModules;
      chosenX = Math.min(chosenX, profile.maxXmm);

      if (isRoll && targetDpi > 0) {
        const dotMm = 25.4 / targetDpi;
        const dots = Math.floor(chosenX / dotMm);
        chosenX = Math.max(dotMm, dots * dotMm);
      } else {
        chosenX = Math.floor(chosenX * 100) / 100;
      }

      effectiveXmm = chosenX;

      if (chosenX < profile.minXmm) {
        fits = false;
        const minReqSide = Math.ceil(matrixModules * profile.minXmm + pad * 2);
        tooSmallReason = `Too small for this label. Requires at least ${minReqSide} × ${minReqSide} mm.`;
      }

      symbolWidthMm = matrixModules * chosenX;
      symbolHeightMm = matrixModules * chosenX;

    } else if (profile.kind === 'stacked') {
      // Stacked: PDF417
      const ratio = innerW / Math.max(availableH, 1);
      const aspectW = Math.min(innerW, availableH * ratio);
      const chosenX = Math.max(profile.minXmm, Math.min(aspectW / totalModules, profile.maxXmm));
      effectiveXmm = chosenX;

      symbolWidthMm = Math.min(innerW, totalModules * chosenX);
      const vbRatio = vbHeight > 0 && vbWidth > 0 ? vbHeight / vbWidth : 0.4;
      symbolHeightMm = Math.min(availableH, symbolWidthMm * vbRatio);

      if (chosenX < profile.minXmm || availableH < profile.minBarHeightMm) {
        fits = false;
        tooSmallReason = `Too small for this label.`;
      }
    }

    // Centering inside inner box
    const barcodeAreaX = pad + (innerW - symbolWidthMm) / 2;
    const barcodeAreaY = pad + (availableH - symbolHeightMm) / 2;
    const captionX = labelW / 2;
    const captionY = labelH - pad;

    return {
      symbolWidthMm,
      symbolHeightMm,
      barcodeAreaX,
      barcodeAreaY,
      captionX,
      captionY,
      effectiveXmm,
      effectiveTextSizePt,
      fits,
      tooSmallReason,
      isReducedHeight
    };
  }

  /**
   * Finds the smallest standard label layout that fits the given format and value.
   */
  findSmallestPresetThatFits(
    formatItem: BarcodeCatalogItem | undefined,
    cleanValue: string,
    isRoll: boolean
  ): string | undefined {
    if (!formatItem) return undefined;
    if (isRoll) {
      const sortedRolls = [...LABEL_ROLL_PRESETS]
        .filter(p => !p.isCustom)
        .sort((a, b) => a.widthMm * a.heightMm - b.widthMm * b.heightMm);
      for (const roll of sortedRolls) {
        const sizing = this.computeBarcodeSizing(
          roll.widthMm,
          roll.heightMm,
          true,
          300,
          formatItem,
          cleanValue,
          false
        );
        if (sizing.fits) return roll.name;
      }
      return undefined;
    }

    const sortedSheets = [...LABEL_SHEET_PRESETS]
      .filter(p => !p.isCustom && !p.isAutoGrid)
      .sort((a, b) => a.labelWidthMm * a.labelHeightMm - b.labelWidthMm * b.labelHeightMm);

    for (const sheet of sortedSheets) {
      const sizing = this.computeBarcodeSizing(
        sheet.labelWidthMm,
        sheet.labelHeightMm,
        false,
        300,
        formatItem,
        cleanValue,
        false
      );
      if (sizing.fits) return sheet.name;
    }
    return undefined;
  }

  /**
   * Computes the unified SheetPageModel array in millimeters.
   * Preview, PDF, PNG rasterization, and Print all consume this identical model.
   */
  layoutSheetPages(options: SheetLayoutOptions): SheetPageModel[] {
    const {
      records,
      preset,
      startAtLabel = 1,
      copies = 1,
      textSizePt = 'auto',
      showLabelText = true,
      showCutGuides = false,
      nudgeXmm = 0,
      nudgeYmm = 0,
      formatItem,
      targetDpi = 300
    } = options;

    const pageDim = PAGE_DIMENSIONS[preset.pageSize] || PAGE_DIMENSIONS.a4;
    const pageWidthMm = pageDim.widthMm;
    const pageHeightMm = pageDim.heightMm;
    const labelsPerPage = preset.cols * preset.rows;

    const validRecords = records.filter(r => r.status !== 'invalid');
    const expandedItems: Array<{
      value: string;
      cleanValue?: string;
      displayValue?: string;
      labelText?: string;
      svg?: string;
    }> = [];

    const safeCopies = Math.max(1, Math.min(100, copies));
    for (const rec of validRecords) {
      for (let c = 0; c < safeCopies; c++) {
        expandedItems.push(rec);
      }
    }

    const startOffset = Math.max(0, startAtLabel - 1);
    const totalSlotsNeeded = startOffset + expandedItems.length;
    const totalPages = Math.max(1, Math.ceil(totalSlotsNeeded / labelsPerPage));

    const pages: SheetPageModel[] = [];
    let currentItemIdx = 0;

    const safeNudgeX = Math.max(-5, Math.min(5, nudgeXmm));
    const safeNudgeY = Math.max(-5, Math.min(5, nudgeYmm));
    const effectiveLeftMargin = preset.leftMarginMm + safeNudgeX;
    const effectiveTopMargin = preset.topMarginMm + safeNudgeY;

    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
      const pageLabels: SheetLabelItem[] = [];
      let pageHasFitWarning = false;

      for (let slot = 0; slot < labelsPerPage; slot++) {
        const globalSlotIdx = pageNum * labelsPerPage + slot;
        const col = slot % preset.cols;
        const row = Math.floor(slot / preset.cols);

        const xMm = effectiveLeftMargin + col * (preset.labelWidthMm + preset.gapHMm);
        const yMm = effectiveTopMargin + row * (preset.labelHeightMm + preset.gapVMm);

        const innerPad = preset.innerPaddingMm || 2.0;
        const innerW = Math.max(8, preset.labelWidthMm - innerPad * 2);
        const innerH = Math.max(6, preset.labelHeightMm - innerPad * 2);
        const innerX = xMm + innerPad;
        const innerY = yMm + innerPad;

        const hasItem = globalSlotIdx >= startOffset && currentItemIdx < expandedItems.length;
        const item = hasItem ? expandedItems[currentItemIdx] : undefined;
        if (hasItem) {
          currentItemIdx++;
        }

        const rawCaption = item?.labelText?.trim();
        const rawVal = (item?.cleanValue || item?.value || '').trim();
        const hasCaption = showLabelText && !!rawCaption && rawCaption !== rawVal;

        // Parse viewBox from svg if present
        let vbW = 240;
        let vbH = 120;
        if (item?.svg) {
          const vbMatch = item.svg.match(/viewBox="([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)"/);
          if (vbMatch) {
            vbW = parseFloat(vbMatch[3]) || 240;
            vbH = parseFloat(vbMatch[4]) || 120;
          }
        }

        // Uniform sizing calculation
        const sizing = this.computeBarcodeSizing(
          preset.labelWidthMm,
          preset.labelHeightMm,
          false,
          targetDpi,
          formatItem,
          rawVal,
          hasCaption,
          vbW,
          vbH
        );

        if (!sizing.fits && hasItem) {
          pageHasFitWarning = true;
        }

        const effectiveTextSizePt =
          textSizePt === 'auto'
            ? sizing.effectiveTextSizePt
            : Math.max(6, Math.min(14, Number(textSizePt)));

        pageLabels.push({
          slotIndex: slot,
          globalSlotIndex: globalSlotIdx,
          col,
          row,
          xMm,
          yMm,
          widthMm: preset.labelWidthMm,
          heightMm: preset.labelHeightMm,
          innerX,
          innerY,
          innerWidth: innerW,
          innerHeight: innerH,
          barcodeAreaX: xMm + sizing.barcodeAreaX,
          barcodeAreaY: yMm + sizing.barcodeAreaY,
          barcodeAreaW: sizing.symbolWidthMm,
          barcodeAreaH: sizing.symbolHeightMm,
          captionX: xMm + sizing.captionX,
          captionY: yMm + sizing.captionY,
          hasItem,
          value: item ? (item.value || item.cleanValue || (item as any).rawValue || '') : undefined,
          cleanValue: item?.cleanValue,
          displayValue: item?.displayValue,
          labelText: hasCaption ? rawCaption : undefined,
          hasCaption,
          svg: item?.svg,
          textSizePt: effectiveTextSizePt,
          fits: sizing.fits,
          tooSmallReason: sizing.tooSmallReason,
          effectiveXmm: sizing.effectiveXmm,
          isReducedHeight: sizing.isReducedHeight
        });
      }

      pages.push({
        pageNumber: pageNum + 1,
        totalPages,
        pageWidthMm,
        pageHeightMm,
        labels: pageLabels,
        preset,
        showCutGuides,
        nudgeXmm: safeNudgeX,
        nudgeYmm: safeNudgeY,
        warning: pageHasFitWarning
          ? 'Labels are small for this format. Test scan before printing.'
          : undefined
      });
    }

    return pages;
  }

  /**
   * Layouts continuous label roll pages: exactly one label per page at exact roll dimensions (Section 7).
   */
  layoutRollPages(options: RollLayoutOptions): RollLabelModel[] {
    const {
      records,
      rollPreset,
      showLabelText = true,
      formatItem,
      targetDpi = 203
    } = options;

    const validRecords = records.filter(r => r.status !== 'invalid');
    const widthMm = rollPreset.widthMm;
    const heightMm = rollPreset.heightMm;
    const pad = 1.5;
    const innerW = Math.max(8, widthMm - pad * 2);
    const innerH = Math.max(6, heightMm - pad * 2);

    const rollLabels: RollLabelModel[] = [];

    for (let i = 0; i < validRecords.length; i++) {
      const item = validRecords[i];
      const rawCaption = item.labelText?.trim();
      const rawVal = (item.cleanValue || item.value || '').trim();
      const hasCaption = showLabelText && !!rawCaption && rawCaption !== rawVal;

      let vbW = 240;
      let vbH = 120;
      if (item.svg) {
        const vbMatch = item.svg.match(/viewBox="([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)"/);
        if (vbMatch) {
          vbW = parseFloat(vbMatch[3]) || 240;
          vbH = parseFloat(vbMatch[4]) || 120;
        }
      }

      const sizing = this.computeBarcodeSizing(
        widthMm,
        heightMm,
        true,
        targetDpi,
        formatItem,
        rawVal,
        hasCaption,
        vbW,
        vbH
      );

      rollLabels.push({
        index: i + 1,
        widthMm,
        heightMm,
        innerX: pad,
        innerY: pad,
        innerWidth: innerW,
        innerHeight: innerH,
        barcodeAreaX: sizing.barcodeAreaX,
        barcodeAreaY: sizing.barcodeAreaY,
        barcodeAreaW: sizing.symbolWidthMm,
        barcodeAreaH: sizing.symbolHeightMm,
        captionX: sizing.captionX,
        captionY: sizing.captionY,
        hasItem: true,
        value: item.value || item.cleanValue || (item as any).rawValue || '',
        cleanValue: item.cleanValue,
        displayValue: item.displayValue,
        labelText: hasCaption ? rawCaption : undefined,
        hasCaption,
        svg: item.svg,
        textSizePt: sizing.effectiveTextSizePt,
        fits: sizing.fits,
        tooSmallReason: sizing.tooSmallReason,
        effectiveXmm: sizing.effectiveXmm,
        isReducedHeight: sizing.isReducedHeight,
        rollPreset
      });
    }

    return rollLabels;
  }

  /**
   * Builds an SVG text element for label caption with robust font sizing,
   * max-width clamping to prevent label collisions, and runtime styling options.
   */
  private buildCaptionSvgText(
    text: string,
    innerX: number,
    innerWidth: number,
    captionX: number,
    captionY: number,
    defaultSizePt: number,
    captionStyle?: BulkCaptionStyle
  ): string {
    if (!text) return '';
    let processed = text.trim();
    if (captionStyle?.transform === 'uppercase') {
      processed = processed.toUpperCase();
    }
    const sanitizedText = this.escapeXml(processed);

    // Compute font size in pt: auto (default) or explicit
    let fontPt = Math.max(5, Math.min(12, defaultSizePt - 2));
    if (captionStyle?.fontSizePt && captionStyle.fontSizePt !== 'auto') {
      fontPt = Math.max(4, Math.min(14, Number(captionStyle.fontSizePt) || 7));
    }
    let fontSizeMm = fontPt * 0.3528;

    // Width safety: ensure caption never extends outside label inner width
    const maxTextW = Math.max(8, innerWidth - 3);
    const estTextW = sanitizedText.length * (fontSizeMm * 0.52);
    if (estTextW > maxTextW) {
      fontSizeMm = Math.max(1.6, maxTextW / (sanitizedText.length * 0.52));
    }

    const color = captionStyle?.color || '#334155';
    const weight = captionStyle?.bold ? '700' : '400';
    const family = captionStyle?.fontFamily === 'mono'
      ? "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
      : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

    let anchor = 'middle';
    let posX = captionX;
    if (captionStyle?.align === 'left') {
      anchor = 'start';
      posX = innerX + 1.5;
    } else if (captionStyle?.align === 'right') {
      anchor = 'end';
      posX = innerX + innerWidth - 1.5;
    }

    const lengthAttr = estTextW > maxTextW
      ? `textLength="${maxTextW.toFixed(2)}" lengthAdjust="spacingAndGlyphs"`
      : '';

    return `<text x="${posX.toFixed(2)}" y="${captionY.toFixed(2)}" text-anchor="${anchor}" font-family="${family}" font-size="${fontSizeMm.toFixed(2)}" font-weight="${weight}" fill="${color}" ${lengthAttr}>${sanitizedText}</text>`;
  }

  /**
   * Renders a SheetPageModel into a self-contained SVG string with millimeter coordinates.
   * Used directly by the preview, iframe printing, and rasterized to canvas for PNG exports.
   */
  renderPageToSvg(page: SheetPageModel, captionStyle?: BulkCaptionStyle): string {
    const { pageWidthMm, pageHeightMm, labels, preset, showCutGuides } = page;

    let cellsContent = '';

    for (const label of labels) {
      let cellSvg = '';

      if (showCutGuides) {
        cellSvg += `
          <rect x="${label.xMm.toFixed(2)}" y="${label.yMm.toFixed(2)}" width="${label.widthMm.toFixed(2)}" height="${label.heightMm.toFixed(2)}" rx="${preset.cornerRadiusMm}" fill="none" stroke="#CBD5E1" stroke-width="0.25" stroke-dasharray="1.5 1.5" />
        `;
      } else if (!label.hasItem || !label.svg) {
        // Dashed placeholder box matching layout
        cellSvg += `
          <rect x="${label.xMm.toFixed(2)}" y="${label.yMm.toFixed(2)}" width="${label.widthMm.toFixed(2)}" height="${label.heightMm.toFixed(2)}" rx="${preset.cornerRadiusMm}" fill="none" stroke="#CBD5E1" stroke-width="0.25" stroke-dasharray="2 2" />
        `;
      }

      if (label.hasItem && label.svg) {
        if (label.svg) {
          const vbMatch = label.svg.match(/viewBox="([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)"/);
          const vbX = vbMatch ? parseFloat(vbMatch[1]) : 0;
          const vbY = vbMatch ? parseFloat(vbMatch[2]) : 0;
          const vbW = vbMatch ? parseFloat(vbMatch[3]) : 240;
          const vbH = vbMatch ? parseFloat(vbMatch[4]) : 120;

          const innerContent = label.svg
            .replace(/<svg[^>]*>/, '')
            .replace(/<\/svg>/, '')
            .replace(/<title>[\s\S]*?<\/title>/gi, '')
            .replace(/<desc>[\s\S]*?<\/desc>/gi, '');

          const xDetail = label.effectiveXmm ? `Module width ${label.effectiveXmm.toFixed(2)} mm` : '';

          cellSvg += `
            <svg id="bc-svg-${label.globalSlotIndex}" x="${label.barcodeAreaX.toFixed(2)}" y="${label.barcodeAreaY.toFixed(2)}" width="${label.barcodeAreaW.toFixed(2)}" height="${label.barcodeAreaH.toFixed(2)}" viewBox="${vbX} ${vbY} ${vbW} ${vbH}" preserveAspectRatio="xMidYMid meet">
              ${xDetail ? `<title>${xDetail}</title>` : ''}
              ${innerContent}
            </svg>
          `;
        }

        if (label.hasCaption && label.labelText) {
          cellSvg += `\n${this.buildCaptionSvgText(
            label.labelText,
            label.innerX,
            label.innerWidth,
            label.captionX,
            label.captionY,
            label.textSizePt,
            captionStyle
          )}`;
        }
      }

      cellsContent += `<g id="bc-slot-${label.globalSlotIndex}" class="sheet-slot-${label.slotIndex}">${cellSvg}</g>\n`;
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${pageWidthMm}mm" height="${pageHeightMm}mm" viewBox="0 0 ${pageWidthMm} ${pageHeightMm}" shape-rendering="geometricPrecision">
        <rect width="${pageWidthMm}" height="${pageHeightMm}" fill="#FFFFFF" />
        ${cellsContent}
      </svg>
    `.trim();
  }

  /**
   * Renders a RollLabelModel directly to an SVG string in millimeters.
   */
  renderRollModelToSvg(model: RollLabelModel, captionStyle?: BulkCaptionStyle): string {
    const widthMm = model.widthMm;
    const heightMm = model.heightMm;
    let barcodeSvg = '';

    if (model.svg) {
      let vbW = 240;
      let vbH = 120;
      const vbMatch = model.svg.match(/viewBox="([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)"/);
      if (vbMatch) {
        vbW = parseFloat(vbMatch[3]) || 240;
        vbH = parseFloat(vbMatch[4]) || 120;
      }

      const innerContent = model.svg
        .replace(/<svg[^>]*>/, '')
        .replace(/<\/svg>/, '')
        .replace(/<title>[\s\S]*?<\/title>/gi, '')
        .replace(/<desc>[\s\S]*?<\/desc>/gi, '');

      const xDetail = model.effectiveXmm ? `Module width ${model.effectiveXmm.toFixed(2)} mm` : '';

      barcodeSvg = `
        <svg id="bc-svg-${model.index}" x="${model.barcodeAreaX.toFixed(2)}" y="${model.barcodeAreaY.toFixed(2)}" width="${model.barcodeAreaW.toFixed(2)}" height="${model.barcodeAreaH.toFixed(2)}" viewBox="0 0 ${vbW} ${vbH}" preserveAspectRatio="xMidYMid meet">
          ${xDetail ? `<title>${xDetail}</title>` : ''}
          ${innerContent}
        </svg>
      `;
    }

    let captionSvg = '';
    if (model.hasCaption && model.labelText) {
      captionSvg = this.buildCaptionSvgText(
        model.labelText,
        model.innerX,
        model.innerWidth,
        model.captionX,
        model.captionY,
        model.textSizePt,
        captionStyle
      );
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${widthMm}mm" height="${heightMm}mm" viewBox="0 0 ${widthMm} ${heightMm}" shape-rendering="geometricPrecision">
        <rect width="${widthMm}" height="${heightMm}" rx="1.5" fill="#FFFFFF" />
        ${barcodeSvg}
        ${captionSvg}
      </svg>
    `.trim();
  }

  /**
   * Renders a single roll label to SVG in millimeters with uniform sizing (Section 2, 7).
   */
  renderRollLabelToSvg(
    record: BulkRecord,
    rollPreset: LabelRollPreset,
    svg: string,
    showLabelText: boolean,
    textSizePt: number,
    formatItem?: BarcodeCatalogItem,
    targetDpi = 203,
    captionStyle?: BulkCaptionStyle
  ): string {
    const widthMm = rollPreset.widthMm;
    const heightMm = rollPreset.heightMm;
    const rawCaption = record.labelText?.trim();
    const rawVal = (record.cleanValue || record.value || '').trim();
    const hasCaption = showLabelText && !!rawCaption && rawCaption !== rawVal;

    let vbW = 240;
    let vbH = 120;
    if (svg) {
      const vbMatch = svg.match(/viewBox="([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)"/);
      if (vbMatch) {
        vbW = parseFloat(vbMatch[3]) || 240;
        vbH = parseFloat(vbMatch[4]) || 120;
      }
    }

    const sizing = this.computeBarcodeSizing(
      widthMm,
      heightMm,
      true,
      targetDpi,
      formatItem,
      rawVal,
      hasCaption,
      vbW,
      vbH
    );

    let barcodeSvg = '';
    if (svg) {
      const innerContent = svg
        .replace(/<svg[^>]*>/, '')
        .replace(/<\/svg>/, '')
        .replace(/<title>[\s\S]*?<\/title>/gi, '')
        .replace(/<desc>[\s\S]*?<\/desc>/gi, '');

      const xDetail = sizing.effectiveXmm ? `Module width ${sizing.effectiveXmm.toFixed(2)} mm` : '';

      barcodeSvg = `
        <svg x="${sizing.barcodeAreaX.toFixed(2)}" y="${sizing.barcodeAreaY.toFixed(2)}" width="${sizing.symbolWidthMm.toFixed(2)}" height="${sizing.symbolHeightMm.toFixed(2)}" viewBox="0 0 ${vbW} ${vbH}" preserveAspectRatio="xMidYMid meet">
          ${xDetail ? `<title>${xDetail}</title>` : ''}
          ${innerContent}
        </svg>
      `;
    }

    let captionSvg = '';
    if (hasCaption && rawCaption) {
      captionSvg = this.buildCaptionSvgText(
        rawCaption,
        1.5,
        widthMm - 3,
        sizing.captionX,
        sizing.captionY,
        textSizePt,
        captionStyle
      );
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${widthMm}mm" height="${heightMm}mm" viewBox="0 0 ${widthMm} ${heightMm}" shape-rendering="geometricPrecision">
        <rect width="${widthMm}" height="${heightMm}" rx="1.5" fill="#FFFFFF" />
        ${barcodeSvg}
        ${captionSvg}
      </svg>
    `.trim();
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

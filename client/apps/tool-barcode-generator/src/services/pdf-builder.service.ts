// apps/tool-barcode-generator/src/services/pdf-builder.service.ts
import { Injectable } from '@angular/core';
import {
  LabelSheetPreset,
  LabelRollPreset,
  PAGE_DIMENSIONS,
  MM_TO_PT
} from '../config/label-templates.config';
import { SheetPageModel } from './sheet-layout.service';
import { BulkCaptionStyle } from '../models/barcode.models';

export interface LabelItem {
  value: string;
  displayValue: string;
  labelText?: string;
  svg: string;
}

export interface LabelSheetPdfOptions {
  items: LabelItem[];
  preset: LabelSheetPreset;
  startAtLabel?: number; // 1-based, default 1
  showValueText?: boolean;
  showLabelText?: boolean;
  textSizePt?: number | 'auto';
  showCutGuides?: boolean;
  copies?: number; // default 1
  fitMode?: 'fit-inside' | 'actual';
  nudgeXmm?: number;
  nudgeYmm?: number;
}

export interface LabelRollPdfOptions {
  items: LabelItem[];
  rollPreset: LabelRollPreset;
  showValueText?: boolean;
  showLabelText?: boolean;
  textSizePt?: number | 'auto';
  copies?: number;
  captionStyle?: BulkCaptionStyle;
}

@Injectable({
  providedIn: 'root'
})
export class PdfBuilderService {
  /**
   * Generates a multi-page vector PDF directly from SheetPageModel array.
   * Guarantees 100% exact parity with the SVG preview and sheet PNG output.
   */
  generateLabelSheetPdfFromModel(pageModels: SheetPageModel[], captionStyle?: BulkCaptionStyle): Uint8Array {
    if (pageModels.length === 0) {
      return this.buildPdfDocument(PAGE_DIMENSIONS.a4.widthPt, PAGE_DIMENSIONS.a4.heightPt, ['']);
    }

    const firstPage = pageModels[0];
    const pageWidthPt = firstPage.pageWidthMm * MM_TO_PT;
    const pageHeightPt = firstPage.pageHeightMm * MM_TO_PT;
    const pageContents: string[] = [];

    for (const page of pageModels) {
      let pageStream = '';

      for (const label of page.labels) {
        const xPt = label.xMm * MM_TO_PT;
        const labelWPt = label.widthMm * MM_TO_PT;
        const labelHPt = label.heightMm * MM_TO_PT;
        // PDF origin is bottom-left
        const yPt = pageHeightPt - (label.yMm * MM_TO_PT) - labelHPt;

        if (page.showCutGuides) {
          pageStream += `0.5 w [2 2] 0 d 0.75 G ${xPt.toFixed(2)} ${yPt.toFixed(2)} ${labelWPt.toFixed(2)} ${labelHPt.toFixed(2)} re S [] 0 d 0 G\n`;
        }

        if (!label.hasItem) {
          continue;
        }

        // Barcode area
        const bcAreaWPt = label.barcodeAreaW * MM_TO_PT;
        const bcAreaHPt = label.barcodeAreaH * MM_TO_PT;
        const bcAreaXPt = label.barcodeAreaX * MM_TO_PT;
        const bcAreaYPt = pageHeightPt - (label.barcodeAreaY * MM_TO_PT) - bcAreaHPt;

        if (label.svg) {
          const bcOps = this.convertSvgToPdfOps(label.svg, bcAreaXPt, bcAreaYPt, bcAreaWPt, bcAreaHPt);
          pageStream += bcOps;
        }

        // Caption text if present and distinct
        if (label.hasCaption && label.labelText) {
          let text = label.labelText.trim();
          if (captionStyle?.transform === 'uppercase') {
            text = text.toUpperCase();
          }
          let fontPt = Math.max(5, label.textSizePt - 2);
          if (captionStyle?.fontSizePt && captionStyle.fontSizePt !== 'auto') {
            fontPt = Math.max(4, Math.min(14, Number(captionStyle.fontSizePt) || 7));
          }
          const sanitizedText = this.escapePdfText(text.slice(0, 50));
          const estTextWidth = sanitizedText.length * (fontPt * 0.52);
          let textX = Math.max(bcAreaXPt, (label.captionX * MM_TO_PT) - (estTextWidth / 2));
          if (captionStyle?.align === 'left') {
            textX = label.innerX * MM_TO_PT + 3;
          } else if (captionStyle?.align === 'right') {
            textX = (label.innerX + label.innerWidth) * MM_TO_PT - estTextWidth - 3;
          }
          const textY = pageHeightPt - (label.captionY * MM_TO_PT);

          let rgbStr = '0.2 0.2 0.2';
          if (captionStyle?.color) {
            const hex = captionStyle.color.replace('#', '');
            if (hex.length === 6) {
              const r = (parseInt(hex.slice(0, 2), 16) / 255).toFixed(2);
              const g = (parseInt(hex.slice(2, 4), 16) / 255).toFixed(2);
              const b = (parseInt(hex.slice(4, 6), 16) / 255).toFixed(2);
              rgbStr = `${r} ${g} ${b}`;
            }
          }

          pageStream += `BT /F1 ${fontPt} Tf ${rgbStr} rg ${textX.toFixed(2)} ${textY.toFixed(2)} Td (${sanitizedText}) Tj ET\n`;
        }
      }

      pageContents.push(pageStream);
    }

    return this.buildPdfDocument(pageWidthPt, pageHeightPt, pageContents);
  }

  /**
   * Generates a 1-page alignment test PDF with rulers, crosshairs, and corner tick marks.
   */
  generateAlignmentTestPagePdf(
    preset: LabelSheetPreset,
    nudgeXmm = 0,
    nudgeYmm = 0
  ): Uint8Array {
    const pageDim = PAGE_DIMENSIONS[preset.pageSize] || PAGE_DIMENSIONS.a4;
    const pageWidthPt = pageDim.widthPt;
    const pageHeightPt = pageDim.heightPt;
    const pageWidthMm = pageDim.widthMm;
    const pageHeightMm = pageDim.heightMm;

    let stream = '';

    // Page border
    stream += `0.5 w [] 0 d 0.85 G 5 5 ${(pageWidthPt - 10).toFixed(2)} ${(pageHeightPt - 10).toFixed(2)} re S\n`;

    // Millimeter ruler at top
    const rulerTopY = pageHeightPt - 12;
    stream += `0.25 w 0.6 G 0 ${rulerTopY.toFixed(2)} m ${pageWidthPt.toFixed(2)} ${rulerTopY.toFixed(2)} l S\n`;
    for (let mm = 0; mm <= pageWidthMm; mm += 5) {
      const xPt = mm * MM_TO_PT;
      const tickH = mm % 10 === 0 ? 6 : 3;
      stream += `${xPt.toFixed(2)} ${rulerTopY.toFixed(2)} m ${xPt.toFixed(2)} ${(rulerTopY - tickH).toFixed(2)} l S\n`;
      if (mm % 10 === 0 && mm > 0 && mm < pageWidthMm - 10) {
        stream += `BT /F1 5 Tf 0.4 0.4 0.4 rg ${(xPt - 4).toFixed(2)} ${(rulerTopY - 10).toFixed(2)} Td (${mm}) Tj ET\n`;
      }
    }

    // Millimeter ruler on left margin
    const rulerLeftX = 12;
    stream += `0.25 w 0.6 G ${rulerLeftX.toFixed(2)} 0 m ${rulerLeftX.toFixed(2)} ${pageHeightPt.toFixed(2)} l S\n`;
    for (let mm = 0; mm <= pageHeightMm; mm += 5) {
      const yFromTopPt = mm * MM_TO_PT;
      const yPt = pageHeightPt - yFromTopPt;
      const tickW = mm % 10 === 0 ? 6 : 3;
      stream += `${rulerLeftX.toFixed(2)} ${yPt.toFixed(2)} m ${(rulerLeftX + tickW).toFixed(2)} ${yPt.toFixed(2)} l S\n`;
      if (mm % 10 === 0 && mm > 0 && mm < pageHeightMm - 10) {
        stream += `BT /F1 5 Tf 0.4 0.4 0.4 rg ${(rulerLeftX + 8).toFixed(2)} ${(yPt - 2).toFixed(2)} Td (${mm}) Tj ET\n`;
      }
    }

    // Sheet title and instructions header
    const safeName = this.escapePdfText(preset.name);
    stream += `BT /F1 8 Tf 0.1 0.1 0.1 rg 28 ${(pageHeightPt - 22).toFixed(2)} Td (Acklet Label Alignment Test Sheet - ${safeName} - Print at 100% actual size) Tj ET\n`;

    // Effective label margins
    const effectiveLeft = preset.leftMarginMm + Math.max(-5, Math.min(5, nudgeXmm));
    const effectiveTop = preset.topMarginMm + Math.max(-5, Math.min(5, nudgeYmm));

    for (let r = 0; r < preset.rows; r++) {
      for (let c = 0; c < preset.cols; c++) {
        const xMm = effectiveLeft + c * (preset.labelWidthMm + preset.gapHMm);
        const yFromTopMm = effectiveTop + r * (preset.labelHeightMm + preset.gapVMm);

        const xPt = xMm * MM_TO_PT;
        const labelWPt = preset.labelWidthMm * MM_TO_PT;
        const labelHPt = preset.labelHeightMm * MM_TO_PT;
        const yPt = pageHeightPt - (yFromTopMm * MM_TO_PT) - labelHPt;

        // Label outline
        stream += `0.5 w [] 0 d 0.4 G ${xPt.toFixed(2)} ${yPt.toFixed(2)} ${labelWPt.toFixed(2)} ${labelHPt.toFixed(2)} re S\n`;

        // Center crosshair (+)
        const midX = xPt + labelWPt / 2;
        const midY = yPt + labelHPt / 2;
        const crossSize = Math.min(12, labelHPt * 0.25);
        stream += `0.35 w 0.5 G ${(midX - crossSize).toFixed(2)} ${midY.toFixed(2)} m ${(midX + crossSize).toFixed(2)} ${midY.toFixed(2)} l S\n`;
        stream += `0.35 w 0.5 G ${midX.toFixed(2)} ${(midY - crossSize).toFixed(2)} m ${midX.toFixed(2)} ${(midY + crossSize).toFixed(2)} l S\n`;

        // Corner tick marks (3 pt in each corner)
        const cTick = 4;
        // Bottom-left
        stream += `0.5 w 0.3 G ${xPt.toFixed(2)} ${(yPt + cTick).toFixed(2)} m ${xPt.toFixed(2)} ${yPt.toFixed(2)} l ${(xPt + cTick).toFixed(2)} ${yPt.toFixed(2)} l S\n`;
        // Top-left
        stream += `0.5 w 0.3 G ${xPt.toFixed(2)} ${(yPt + labelHPt - cTick).toFixed(2)} m ${xPt.toFixed(2)} ${(yPt + labelHPt).toFixed(2)} l ${(xPt + cTick).toFixed(2)} ${(yPt + labelHPt).toFixed(2)} l S\n`;
        // Bottom-right
        stream += `0.5 w 0.3 G ${(xPt + labelWPt - cTick).toFixed(2)} ${yPt.toFixed(2)} m ${(xPt + labelWPt).toFixed(2)} ${yPt.toFixed(2)} l ${(xPt + labelWPt).toFixed(2)} ${(yPt + cTick).toFixed(2)} l S\n`;
        // Top-right
        stream += `0.5 w 0.3 G ${(xPt + labelWPt - cTick).toFixed(2)} ${(yPt + labelHPt).toFixed(2)} m ${(xPt + labelWPt).toFixed(2)} ${(yPt + labelHPt).toFixed(2)} l ${(xPt + labelWPt).toFixed(2)} ${(yPt + labelHPt - cTick).toFixed(2)} l S\n`;

        // Label details text in cell
        const cellText = `R${r + 1} C${c + 1} (${preset.labelWidthMm.toFixed(1)} x ${preset.labelHeightMm.toFixed(1)} mm)`;
        stream += `BT /F1 6 Tf 0.45 0.45 0.45 rg ${(midX - 24).toFixed(2)} ${(midY - 12).toFixed(2)} Td (${cellText}) Tj ET\n`;
      }
    }

    return this.buildPdfDocument(pageWidthPt, pageHeightPt, [stream]);
  }
  /**
   * Generates a multi-page vector PDF for standard printable label sheets (A4 or US Letter).
   */
  generateLabelSheetPdf(options: LabelSheetPdfOptions): Uint8Array {
    const {
      items,
      preset,
      startAtLabel = 1,
      showLabelText = true,
      textSizePt: rawTextSize = 8,
      showCutGuides = false,
      copies = 1
    } = options;

    const textSizePt = typeof rawTextSize === 'number' ? rawTextSize : 8;

    const pageDim = PAGE_DIMENSIONS[preset.pageSize] || PAGE_DIMENSIONS.a4;
    const pageWidthPt = pageDim.widthPt;
    const pageHeightPt = pageDim.heightPt;
    const labelsPerPage = preset.cols * preset.rows;

    // Expand items by copies
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

    const pageContents: string[] = [];

    let currentItemIdx = 0;

    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
      let pageStream = '';

      for (let slot = 0; slot < labelsPerPage; slot++) {
        const globalSlotIdx = pageNum * labelsPerPage + slot;

        // Determine grid position
        const col = slot % preset.cols;
        const row = Math.floor(slot / preset.cols);

        const xMm = preset.leftMarginMm + col * (preset.labelWidthMm + preset.gapHMm);
        const yFromTopMm = preset.topMarginMm + row * (preset.labelHeightMm + preset.gapVMm);

        const xPt = xMm * MM_TO_PT;
        const labelWPt = preset.labelWidthMm * MM_TO_PT;
        const labelHPt = preset.labelHeightMm * MM_TO_PT;
        const yPt = pageHeightPt - (yFromTopMm * MM_TO_PT) - labelHPt;

        // Cut guide outline (light gray dashed rectangle)
        if (showCutGuides) {
          pageStream += `0.5 w [2 2] 0 d 0.75 G ${xPt.toFixed(2)} ${yPt.toFixed(2)} ${labelWPt.toFixed(2)} ${labelHPt.toFixed(2)} re S [] 0 d 0 G\n`;
        }

        // Before start offset on first page: empty slot
        if (globalSlotIdx < startOffset || currentItemIdx >= expandedItems.length) {
          continue;
        }

        const item = expandedItems[currentItemIdx];
        currentItemIdx++;

        // Draw barcode inside label cell
        const innerPaddingPt = (preset.innerPaddingMm || 2.0) * MM_TO_PT;
        const usableWPt = Math.max(10, labelWPt - innerPaddingPt * 2);
        const usableHPt = Math.max(10, labelHPt - innerPaddingPt * 2);
        const usableXPt = xPt + innerPaddingPt;
        const usableYPt = yPt + innerPaddingPt;

        // Reserve space for label text caption if requested and present
        const hasCaption = showLabelText && !!item.labelText && item.labelText.trim().length > 0;
        const captionHeightPt = hasCaption ? textSizePt + 4 : 0;
        const bcAreaHPt = Math.max(8, usableHPt - captionHeightPt);
        const bcAreaWPt = usableWPt;
        const bcAreaYPt = usableYPt + captionHeightPt;

        // Render barcode SVG as vector PDF operators
        const bcOps = this.convertSvgToPdfOps(item.svg, usableXPt, bcAreaYPt, bcAreaWPt, bcAreaHPt);
        pageStream += bcOps;

        // Render caption text under barcode if present
        if (hasCaption && item.labelText) {
          const sanitizedText = this.escapePdfText(item.labelText.trim().slice(0, 60));
          // Approximate centering (Helvetica average char width is ~0.55 * fontSize)
          const estTextWidth = sanitizedText.length * (textSizePt * 0.52);
          const textX = Math.max(usableXPt, usableXPt + (usableWPt - estTextWidth) / 2);
          const textY = usableYPt + 2;

          pageStream += `BT /F1 ${textSizePt} Tf 0.2 0.2 0.2 rg ${textX.toFixed(2)} ${textY.toFixed(2)} Td (${sanitizedText}) Tj ET\n`;
        }
      }

      pageContents.push(pageStream);
    }

    return this.buildPdfDocument(pageWidthPt, pageHeightPt, pageContents);
  }

  /**
   * Generates a multi-page vector PDF for label rolls (e.g. 50x25mm, 100x150mm).
   * Each label is on its own page with dimensions matching the roll preset.
   */
  generateLabelRollPdf(options: LabelRollPdfOptions): Uint8Array {
    const {
      items,
      rollPreset,
      showLabelText = true,
      textSizePt: rawTextSize = 8,
      copies = 1
    } = options;

    const textSizePt = typeof rawTextSize === 'number' ? rawTextSize : 8;

    const widthPt = rollPreset.widthMm * MM_TO_PT;
    const heightPt = rollPreset.heightMm * MM_TO_PT;

    // Expand items by copies
    const expandedItems: LabelItem[] = [];
    const validCopies = Math.max(1, Math.min(100, copies));
    for (const item of items) {
      for (let c = 0; c < validCopies; c++) {
        expandedItems.push(item);
      }
    }

    const pageContents: string[] = [];

    for (const item of expandedItems) {
      let pageStream = '';
      const padPt = 2.0 * MM_TO_PT;
      const usableWPt = Math.max(10, widthPt - padPt * 2);
      const usableHPt = Math.max(10, heightPt - padPt * 2);
      const usableXPt = padPt;
      const usableYPt = padPt;

      const hasCaption = showLabelText && !!item.labelText && item.labelText.trim().length > 0;
      const captionHeightPt = hasCaption ? textSizePt + 4 : 0;
      const bcAreaHPt = Math.max(8, usableHPt - captionHeightPt);
      const bcAreaWPt = usableWPt;
      const bcAreaYPt = usableYPt + captionHeightPt;

      const bcOps = this.convertSvgToPdfOps(item.svg, usableXPt, bcAreaYPt, bcAreaWPt, bcAreaHPt);
      pageStream += bcOps;

      if (hasCaption && item.labelText) {
        let text = item.labelText.trim();
        if (options.captionStyle?.transform === 'uppercase') {
          text = text.toUpperCase();
        }
        let fontPt = textSizePt;
        if (options.captionStyle?.fontSizePt && options.captionStyle.fontSizePt !== 'auto') {
          fontPt = Math.max(4, Math.min(14, Number(options.captionStyle.fontSizePt) || 7));
        }
        const sanitizedText = this.escapePdfText(text.slice(0, 60));
        const estTextWidth = sanitizedText.length * (fontPt * 0.52);
        let textX = Math.max(usableXPt, usableXPt + (usableWPt - estTextWidth) / 2);
        if (options.captionStyle?.align === 'left') {
          textX = usableXPt + 2;
        } else if (options.captionStyle?.align === 'right') {
          textX = usableXPt + usableWPt - estTextWidth - 2;
        }
        const textY = usableYPt + 2;

        let rgbStr = '0.2 0.2 0.2';
        if (options.captionStyle?.color) {
          const hex = options.captionStyle.color.replace('#', '');
          if (hex.length === 6) {
            const r = (parseInt(hex.slice(0, 2), 16) / 255).toFixed(2);
            const g = (parseInt(hex.slice(2, 4), 16) / 255).toFixed(2);
            const b = (parseInt(hex.slice(4, 6), 16) / 255).toFixed(2);
            rgbStr = `${r} ${g} ${b}`;
          }
        }

        pageStream += `BT /F1 ${fontPt} Tf ${rgbStr} rg ${textX.toFixed(2)} ${textY.toFixed(2)} Td (${sanitizedText}) Tj ET\n`;
      }

      pageContents.push(pageStream);
    }

    return this.buildPdfDocument(widthPt, heightPt, pageContents);
  }

  /**
   * Converts a bwip-js vector SVG string into affine-transformed PDF path operators.
   */
  private convertSvgToPdfOps(
    svg: string,
    targetXPt: number,
    targetYPt: number,
    targetWPt: number,
    targetHPt: number
  ): string {
    if (!svg) return '';

    // Extract viewBox
    const vbMatch = svg.match(/viewBox="([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)"/);
    const vbW = vbMatch ? parseFloat(vbMatch[3]) : 200;
    const vbH = vbMatch ? parseFloat(vbMatch[4]) : 100;

    if (vbW <= 0 || vbH <= 0) return '';

    // Calculate aspect ratio preserving fit
    const scale = Math.min(targetWPt / vbW, targetHPt / vbH);
    const drawWPt = vbW * scale;
    const drawHPt = vbH * scale;
    const drawXPt = targetXPt + (targetWPt - drawWPt) / 2;
    const drawYPt = targetYPt + (targetHPt - drawHPt) / 2;

    // PDF transformation matrix:
    // Flips SVG Y-down to PDF Y-up and places at (drawXPt, drawYPt)
    // cm arguments: [scaleX 0 0 scaleY transX transY]
    const cm = `${scale.toFixed(5)} 0 0 ${(-scale).toFixed(5)} ${drawXPt.toFixed(2)} ${(drawYPt + drawHPt).toFixed(2)} cm\n`;

    let ops = `q\n${cm}`;

    // Extract all path elements
    const pathRegex = /<path([^>]+)\/?>/g;
    let match: RegExpExecArray | null;

    while ((match = pathRegex.exec(svg)) !== null) {
      const attrs = match[1];
      const dMatch = attrs.match(/d="([^"]+)"/);
      if (!dMatch) continue;

      const d = dMatch[1];
      const strokeMatch = attrs.match(/stroke="([^"]+)"/);
      const strokeWidthMatch = attrs.match(/stroke-width="([^"]+)"/);
      const fillMatch = attrs.match(/fill="([^"]+)"/);

      const pathPdfOps = this.parseSvgPathToPdf(d);
      if (!pathPdfOps) continue;

      if (strokeMatch && strokeMatch[1] !== 'none') {
        const sw = strokeWidthMatch ? parseFloat(strokeWidthMatch[1]) : 1;
        ops += `${sw.toFixed(2)} w 0 G ${pathPdfOps} S\n`;
      } else {
        // Fill path
        if (fillMatch && fillMatch[1] === '#ffffff') {
          ops += `1 g ${pathPdfOps} f\n`;
        } else {
          ops += `0 g ${pathPdfOps} f\n`;
        }
      }
    }

    // Also extract rect elements if any (e.g. background or guard bars)
    const rectRegex = /<rect([^>]+)\/?>/g;
    let rMatch: RegExpExecArray | null;
    while ((rMatch = rectRegex.exec(svg)) !== null) {
      const attrs = rMatch[1];
      const x = parseFloat((attrs.match(/x="([^"]+)"/) || [0, '0'])[1]);
      const y = parseFloat((attrs.match(/y="([^"]+)"/) || [0, '0'])[1]);
      const w = parseFloat((attrs.match(/width="([^"]+)"/) || [0, '0'])[1]);
      const h = parseFloat((attrs.match(/height="([^"]+)"/) || [0, '0'])[1]);
      const fill = (attrs.match(/fill="([^"]+)"/) || [0, ''])[1];

      if (w > 0 && h > 0 && fill !== '#ffffff' && fill !== 'white' && fill !== 'none') {
        ops += `0 g ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f\n`;
      }
    }

    ops += 'Q\n';
    return ops;
  }

  /**
   * Translates SVG path data commands into PDF graphics path operators.
   */
  private parseSvgPathToPdf(d: string): string {
    const ops: string[] = [];
    const regex = /([MLHVQCZmlhvqcz])([^MLHVQCZmlhvqcz]*)/g;
    let match: RegExpExecArray | null;
    let curX = 0;
    let curY = 0;

    while ((match = regex.exec(d)) !== null) {
      const cmd = match[1];
      const rawArgs = match[2].trim();
      const numMatches = rawArgs.match(/-?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g);
      const args = numMatches ? numMatches.map(Number) : [];

      switch (cmd) {
        case 'M':
        case 'm':
          for (let i = 0; i < args.length; i += 2) {
            const x = cmd === 'M' ? args[i] : curX + args[i];
            const y = cmd === 'M' ? args[i + 1] : curY + args[i + 1];
            ops.push(`${x.toFixed(2)} ${y.toFixed(2)} m`);
            curX = x;
            curY = y;
          }
          break;
        case 'L':
        case 'l':
          for (let i = 0; i < args.length; i += 2) {
            const x = cmd === 'L' ? args[i] : curX + args[i];
            const y = cmd === 'L' ? args[i + 1] : curY + args[i + 1];
            ops.push(`${x.toFixed(2)} ${y.toFixed(2)} l`);
            curX = x;
            curY = y;
          }
          break;
        case 'H':
        case 'h':
          for (let i = 0; i < args.length; i++) {
            const x = cmd === 'H' ? args[i] : curX + args[i];
            ops.push(`${x.toFixed(2)} ${curY.toFixed(2)} l`);
            curX = x;
          }
          break;
        case 'V':
        case 'v':
          for (let i = 0; i < args.length; i++) {
            const y = cmd === 'V' ? args[i] : curY + args[i];
            ops.push(`${curX.toFixed(2)} ${y.toFixed(2)} l`);
            curY = y;
          }
          break;
        case 'Q':
        case 'q':
          for (let i = 0; i < args.length; i += 4) {
            const qx = cmd === 'Q' ? args[i] : curX + args[i];
            const qy = cmd === 'Q' ? args[i + 1] : curY + args[i + 1];
            const x = cmd === 'Q' ? args[i + 2] : curX + args[i + 2];
            const y = cmd === 'Q' ? args[i + 3] : curY + args[i + 3];
            // Quadratic to cubic bezier conversion
            const c1x = curX + (2 / 3) * (qx - curX);
            const c1y = curY + (2 / 3) * (qy - curY);
            const c2x = x + (2 / 3) * (qx - x);
            const c2y = y + (2 / 3) * (qy - y);
            ops.push(`${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} c`);
            curX = x;
            curY = y;
          }
          break;
        case 'C':
        case 'c':
          for (let i = 0; i < args.length; i += 6) {
            const c1x = cmd === 'C' ? args[i] : curX + args[i];
            const c1y = cmd === 'C' ? args[i + 1] : curY + args[i + 1];
            const c2x = cmd === 'C' ? args[i + 2] : curX + args[i + 2];
            const c2y = cmd === 'C' ? args[i + 3] : curY + args[i + 3];
            const x = cmd === 'C' ? args[i + 4] : curX + args[i + 4];
            const y = cmd === 'C' ? args[i + 5] : curY + args[i + 5];
            ops.push(`${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} c`);
            curX = x;
            curY = y;
          }
          break;
        case 'Z':
        case 'z':
          ops.push('h');
          break;
      }
    }

    return ops.join(' ');
  }

  /**
   * Escapes literal string for PDF string literal (parentheses, backslash).
   */
  private escapePdfText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[^\x20-\x7E]/g, '?'); // sanitize non-ASCII printable characters
  }

  /**
   * Constructs a standard, valid PDF 1.4 binary file with multi-page support.
   */
  private buildPdfDocument(
    pageWidthPt: number,
    pageHeightPt: number,
    pageContents: string[]
  ): Uint8Array {
    const objects: string[] = [];
    const addObj = (content: string): number => {
      objects.push(content);
      return objects.length;
    };

    // Object 1: Catalog
    addObj('<</Type /Catalog /Pages 2 0 R>>');

    // Page objects will be registered in Pages Kids array
    const pageObjIndices: number[] = [];
    const numPages = Math.max(1, pageContents.length);

    // Font object (Helvetica Type 1 standard font)
    const fontObjIndex = 3;
    // Page kids will follow font object
    // For each page: Page object + Content stream object (2 objects per page)
    for (let p = 0; p < numPages; p++) {
      pageObjIndices.push(4 + p * 2);
    }

    // Object 2: Pages Catalog
    const kidsStr = pageObjIndices.map(i => `${i} 0 R`).join(' ');
    objects.push(`<</Type /Pages /Kids [${kidsStr}] /Count ${numPages}>>`);

    // Object 3: Font Resource
    objects.push('<</Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding>>');

    // Objects 4+: Page and Content stream pairs
    for (let p = 0; p < numPages; p++) {
      const pageIndex = 4 + p * 2;
      const contentIndex = pageIndex + 1;
      const contentStream = pageContents[p] || '';
      const streamLen = Buffer ? Buffer.byteLength(contentStream, 'utf8') : new TextEncoder().encode(contentStream).length;

      // Page Object
      objects.push(
        `<</Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt.toFixed(2)} ${pageHeightPt.toFixed(2)}] /Contents ${contentIndex} 0 R /Resources <</Font <</F1 3 0 R>>>>>>`
      );

      // Content Stream Object
      objects.push(`<</Length ${streamLen}>>\nstream\n${contentStream}\nendstream`);
    }

    // Assemble PDF binary
    let out = '%PDF-1.4\n';
    const xref: string[] = ['xref', `0 ${objects.length + 1}`, '0000000000 65535 f '];

    const encoder = new TextEncoder();
    let currentOffset = encoder.encode(out).length;

    for (let i = 0; i < objects.length; i++) {
      const objBody = `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
      const offsetStr = String(currentOffset).padStart(10, '0');
      xref.push(`${offsetStr} 00000 n `);
      out += objBody;
      currentOffset = encoder.encode(out).length;
    }

    const startXref = currentOffset;
    out += `${xref.join('\n')}\n`;
    out += `trailer <</Size ${objects.length + 1} /Root 1 0 R>>\n`;
    out += `startxref\n${startXref}\n%%EOF\n`;

    return encoder.encode(out);
  }
}


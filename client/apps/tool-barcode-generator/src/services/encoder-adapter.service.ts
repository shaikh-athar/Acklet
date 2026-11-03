// apps/tool-barcode-generator/src/services/encoder-adapter.service.ts
import { Injectable } from '@angular/core';
import {
  BarcodeCatalogItem,
  BarcodeDesignOptions,
  FormatPerOptions
} from '../models/barcode.models';

export interface EncodeBarcodeParams {
  item: BarcodeCatalogItem;
  value: string;
  design: BarcodeDesignOptions;
  options: FormatPerOptions;
}

export interface IEncoderAdapter {
  encodeToSvg(params: EncodeBarcodeParams): Promise<string>;
}

@Injectable({
  providedIn: 'root'
})
export class EncoderAdapter implements IEncoderAdapter {
  private bwipModule: any = null;

  private async loadBwip(): Promise<any> {
    if (!this.bwipModule) {
      const mod = await import('bwip-js');
      this.bwipModule = mod.default || mod;
    }
    return this.bwipModule;
  }

  async encodeToSvg(params: EncodeBarcodeParams): Promise<string> {
    const bwip = await this.loadBwip();
    const { item, value, design, options } = params;

    let bcid = item.engineId;
    let textToEncode = value;

    // Handle Codabar: bwip-js uses 'rationalizedCodabar'
    if (item.id === 'codabar') {
      bcid = 'rationalizedCodabar';
      // Ensure start/stop guards (A..D)
      let cleanedCoda = value.toUpperCase();
      if (!/^[A-D]/.test(cleanedCoda)) {
        cleanedCoda = (options.codabarStart || 'A') + cleanedCoda;
      }
      if (!/[A-D]$/.test(cleanedCoda)) {
        cleanedCoda = cleanedCoda + (options.codabarStop || 'B');
      }
      textToEncode = cleanedCoda;
    } else if (item.id === 'isbn' || item.id === 'issn' || item.id === 'ismn') {
      // Books, serials, and sheet music with 13 digits are EAN-13 barcodes
      const digits = value.replace(/\D/g, '');
      if (digits.length === 13) {
        bcid = 'ean13';
        textToEncode = digits;
      } else if (item.id === 'isbn' && digits.length === 10) {
        // Convert ISBN-10 to ISBN-13
        const core = '978' + digits.slice(0, 9);
        let sum = 0;
        for (let i = 0; i < core.length; i++) {
          sum += parseInt(core[i], 10) * (i % 2 === 0 ? 1 : 3);
        }
        const cd = (10 - (sum % 10)) % 10;
        bcid = 'ean13';
        textToEncode = core + cd;
      } else if (item.id === 'ismn' && digits.length === 12) {
        // Complete 12-digit ISMN
        let sum = 0;
        for (let i = 0; i < digits.length; i++) {
          sum += parseInt(digits[i], 10) * (i % 2 === 0 ? 1 : 3);
        }
        const cd = (10 - (sum % 10)) % 10;
        bcid = 'ean13';
        textToEncode = digits + cd;
      } else if (item.id === 'issn' && digits.length === 8) {
        // Convert 8-digit ISSN to 13-digit EAN-13: 977 + 7 digits + 00 + check digit
        const ean12 = '977' + digits.slice(0, 7) + '00';
        let sum = 0;
        for (let i = 0; i < ean12.length; i++) {
          sum += parseInt(ean12[i], 10) * (i % 2 === 0 ? 1 : 3);
        }
        const cd = (10 - (sum % 10)) % 10;
        bcid = 'ean13';
        textToEncode = ean12 + cd;
      }
    } else if (item.id === 'gs1-databar') {
      const v = options.variant || 'omni';
      const variantMap: Record<string, string> = {
        omni: 'databaromni',
        truncated: 'databartruncated',
        stacked: 'databarstacked',
        'stacked-omni': 'databarstackedomni',
        limited: 'databarlimited',
        expanded: 'databarexpanded',
        'expanded-stacked': 'databarexpandedstacked'
      };
      bcid = variantMap[v] || 'databaromni';
      // If linear GTIN (8, 12, 13 or 14 digits) for standard or expanded DataBar without AI parens, prefix (01)
      const digits = value.replace(/\D/g, '');
      if (!value.includes('(')) {
        if ([8, 12, 13, 14].includes(digits.length)) {
          const padded14 = digits.padStart(14, '0');
          textToEncode = `(01)${padded14}`;
        }
      }
    } else if (item.id === 'upce') {
      // UPC-E requires 7 or 8 digits starting with 0 or 1
      const digits = value.replace(/\D/g, '');
      textToEncode = digits.length === 6 ? '0' + digits : digits;
    }

    // Addon handling for EAN-13, EAN-8, UPC-A, ISSN, ISBN:
    // In bwip-js, add-on barcodes are appended to the main symbol via a space: "1234567890128 02"
    if (options.addon && ['ean13', 'upca', 'ean8', 'isbn', 'issn'].includes(item.id)) {
      const cleanAddon = options.addon.trim();
      if (cleanAddon.length === 2 || cleanAddon.length === 5) {
        textToEncode = `${textToEncode} ${cleanAddon}`;
      }
    }

    const rotationMap: Record<number, 'N' | 'R' | 'I' | 'L'> = {
      0: 'N',
      90: 'R',
      180: 'I',
      270: 'L'
    };

    // Calculate height relative to millimeters (only for 1D linear barcodes)
    const heightMm = Number(design.heightMm) || 25;
    const calculatedHeight = Math.max(8, Math.round(heightMm * 0.9));

    // EAN/UPC family barcodes (EAN-13, EAN-8, UPC-A, UPC-E, ISBN, ISSN, ISMN) have built-in
    // guard-bar splitting and font sizing. Setting explicit textxalign or textyalign on them
    // overrides the standard splitting layout and causes human-readable digits to overlap the bars.
    const isEanUpcFamily = ['ean13', 'upca', 'ean8', 'upce', 'isbn', 'issn', 'ismn'].includes(item.id);

    const bwipOpts: Record<string, any> = {
      bcid,
      text: textToEncode,
      scale: item.is2D ? 4 : (design.sizePreset === 'small' ? 2 : design.sizePreset === 'large' ? 4 : (design.scale || 3)),
      includetext: design.showText && (design.textPosition as string) !== 'off' && item.supportsHumanReadable,
      rotate: rotationMap[design.rotation] || 'N'
    };

    if (!isEanUpcFamily) {
      bwipOpts['textxalign'] = 'center';
      bwipOpts['textyalign'] = design.textPosition === 'above' ? 'above' : 'below';
      bwipOpts['textsize'] = design.fontSize || 10;
      // Fixed gap between bottom of bars and text (at least 2px / 1 module width)
      if (bwipOpts['includetext'] && bwipOpts['textyalign'] === 'below') {
        bwipOpts['textyoffset'] = -3;
      }
    }

    // Only apply 1D linear bar height for standard 1D linear barcodes (avoid distorting 2D or GS1 DataBar variants)
    if (!item.is2D && item.family !== 'GS1 DataBar' && item.id !== 'gs1-databar') {
      bwipOpts['height'] = calculatedHeight;
    }

    if (design.fontBold) {
      bwipOpts['textgaps'] = 0.5;
    }

    if (design.fontFamily === 'monospace') {
      bwipOpts['textfont'] = 'OCR-A';
    } else if (design.fontFamily === 'ocr-b') {
      bwipOpts['textfont'] = 'OCR-B';
    }

    // Validate and pass concrete hex colors into the engine, not CSS variables (default #000000 on #FFFFFF)
    const rawBarColor = (design.barColor || '#000000').trim();
    const safeBarHex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(rawBarColor)
      ? (rawBarColor.length === 4
          ? `${rawBarColor[1]}${rawBarColor[1]}${rawBarColor[2]}${rawBarColor[2]}${rawBarColor[3]}${rawBarColor[3]}`
          : rawBarColor.slice(1))
      : '000000';
    bwipOpts['barcolor'] = safeBarHex;

    if (!design.transparentBg) {
      const rawBgColor = (design.bgColor || '#FFFFFF').trim();
      const safeBgHex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(rawBgColor)
        ? (rawBgColor.length === 4
            ? `${rawBgColor[1]}${rawBgColor[1]}${rawBgColor[2]}${rawBgColor[2]}${rawBgColor[3]}${rawBgColor[3]}`
            : rawBgColor.slice(1))
        : 'FFFFFF';
      bwipOpts['backgroundcolor'] = safeBgHex;
    }

    // Quiet zone margin (paddingwidth sets explicit whitespace margin in points)
    // Guard whitespace (< and > markers) is turned off so arrows never overlap check digits or adjacent labels.
    // Minimum quiet zone: at least 10x module width for 1D symbologies, 8 modules for 2D.
    const effectiveQuietZone = item.is2D
      ? Math.max(8, Number(design.quietZone) || 0)
      : Math.max(10, Number(design.quietZone) || 0);
    bwipOpts['guardwhitespace'] = false;
    bwipOpts['paddingwidth'] = effectiveQuietZone;
    bwipOpts['paddingheight'] = effectiveQuietZone;

    // Bearer bars for ITF-14
    if (item.id === 'itf14' && options.bearerBars) {
      if (options.bearerBars === 'top-bottom') {
        bwipOpts['bearer'] = 'topbottom';
      } else if (options.bearerBars === 'frame') {
        bwipOpts['bearer'] = 'box';
      }
    }

    // GS1 DataBar Expanded Stacked segments per row
    if (bcid === 'databarexpandedstacked' && options.segments) {
      bwipOpts['segments'] = options.segments;
    }

    // Data Matrix shape: square vs rectangular
    if (item.id === 'datamatrix') {
      bwipOpts['format'] = options.shape === 'rectangular' ? 'rectangle' : 'square';
    }

    // PDF417 options
    if (item.id === 'pdf417') {
      if (options.securityLevel !== undefined && options.securityLevel >= 0) {
        bwipOpts['eclevel'] = options.securityLevel;
      }
      if (options.columns) {
        bwipOpts['columns'] = options.columns;
      }
    }

    // Aztec error correction
    if (item.id === 'aztec') {
      if (options.errorCorrectionPercent !== undefined) {
        bwipOpts['eclevel'] = options.errorCorrectionPercent;
      }
      if (options.errorCorrectionPercent === 50 && value.length <= 15) {
        bwipOpts['layers'] = 3;
      }
    }

    // MSI Plessey check options: cleanValue already carries the checksum computed by BarcodeCheckDigitService
    if (item.id === 'msi') {
      bwipOpts['includecheck'] = false;
    }

    // Code 39 optional check digit
    if (item.id === 'code39' && options.includeCheckDigit) {
      bwipOpts['includecheck'] = true;
      bwipOpts['includecheckintext'] = true;
    }

    // Generate pure vector SVG
    const svgOutput = bwip.toSVG(bwipOpts);
    return svgOutput;
  }
}

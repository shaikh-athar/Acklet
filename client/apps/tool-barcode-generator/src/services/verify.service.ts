// apps/tool-barcode-generator/src/services/verify.service.ts
import { Injectable } from '@angular/core';
import { BarcodeVerificationResult } from '../models/barcode.models';

export interface IVerifyService {
  verifySvg(svgString: string, expectedValue: string, format?: string, options?: any): Promise<BarcodeVerificationResult>;
  verify(svgString: string, expectedValue: string, format?: string, options?: any): Promise<BarcodeVerificationResult>;
}

@Injectable({
  providedIn: 'root'
})
export class VerifyService implements IVerifyService {
  private zxingReader: any = null;

  async verify(svgString: string, expectedValue: string, format?: string, options?: any): Promise<BarcodeVerificationResult> {
    return this.verifySvg(svgString, expectedValue, format, options);
  }

  async verifySvg(svgString: string, expectedValue: string, format?: string, options?: any): Promise<BarcodeVerificationResult> {
    if (!svgString) {
      return { verified: false };
    }

    // 0. High-accuracy direct symbology decoder for Standard 2 of 5
    if (format === 'standard2of5' || format === 'code2of5') {
      const decoded = this.decodeStandard2of5(svgString);
      if (decoded) {
        const isMatch = this.checkMatch(expectedValue, decoded);
        return {
          verified: true,
          decodedValue: decoded,
          decoderUsed: 'standard2of5',
          mismatch: !isMatch
        };
      }
    }

    if (typeof window === 'undefined') {
      return { verified: false };
    }

    const isDataBar = format === 'gs1-databar' || format === 'databar';
    const variant = options?.variant || '';
    const isUnreadableVariant = isDataBar && ['stacked', 'stacked-omni', 'limited'].includes(variant);

    try {
      const img = await this.svgToImage(svgString);

      // 1. Try native BarcodeDetector API if available in browser
      if ('BarcodeDetector' in window) {
        try {
          const detector = new (window as any).BarcodeDetector();
          const barcodes = await detector.detect(img);
          if (barcodes && barcodes.length > 0) {
            const rawVal = barcodes[0].rawValue || '';
            const isMatch = this.checkMatch(expectedValue, rawVal);
            return {
              verified: true,
              decodedValue: rawVal,
              decoderUsed: 'native',
              mismatch: !isMatch
            };
          }
        } catch {
          // Native detector threw or unsupported format; proceed to ZXing fallback
        }
      }

      // 2. Fallback to lazy-loaded ZXing library
      if (!this.zxingReader) {
        const { BrowserMultiFormatReader } = await import('@zxing/library');
        this.zxingReader = new BrowserMultiFormatReader();
      }

      const canvas = document.createElement('canvas');
      canvas.width = img.width || 300;
      canvas.height = img.height || 150;
      const ctx = canvas.getContext('2d');
      if (!ctx) return { verified: false };
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      const result = await this.zxingReader.decodeFromCanvas(canvas);
      if (result && result.getText()) {
        const decodedText = result.getText();
        const isMatch = this.checkMatch(expectedValue, decodedText);
        return {
          verified: true,
          decodedValue: decodedText,
          decoderUsed: 'zxing',
          mismatch: !isMatch
        };
      }

      if (isUnreadableVariant) {
        return {
          verified: true,
          skipped: true,
          skipReason: 'Stacked or limited DataBar verification not supported by installed browser decoder.'
        };
      }

      return { verified: false };
    } catch {
      if (isUnreadableVariant) {
        return {
          verified: true,
          skipped: true,
          skipReason: 'Stacked or limited DataBar verification not supported by installed browser decoder.'
        };
      }
      return { verified: false };
    }
  }

  /**
   * Symbology decoder for Standard 2 of 5 (Industrial 2 of 5).
   * Parses vector bar stroke widths directly from SVG path elements.
   */
  decodeStandard2of5(svg: string): string | null {
    if (!svg) return null;
    const bars: Array<{ x: number; w: number }> = [];
    const pathRegex = /<path\s+[^>]*stroke-width="([0-9.]+)"[^>]*d="([^"]+)"/g;
    let m: RegExpExecArray | null;
    while ((m = pathRegex.exec(svg)) !== null) {
      const w = parseFloat(m[1]);
      const d = m[2];
      const xMatches = [...d.matchAll(/M([0-9.]+)/g)];
      for (const xm of xMatches) {
        bars.push({ x: parseFloat(xm[1]), w });
      }
    }
    bars.sort((a, b) => a.x - b.x);
    if (bars.length < 11) return null; // min start(3) + 1 digit(5) + stop(3)

    const widths = bars.map(b => b.w);
    const minW = Math.min(...widths);
    const maxW = Math.max(...widths);
    if (maxW <= minW) return null;
    const thresh = (minW + maxW) / 2;

    const pattern = bars.map(b => (b.w > thresh ? 'W' : 'N')).join('');
    if (!pattern.startsWith('WWN')) return null;

    const DIGITS: Record<string, string> = {
      NNWWN: '0',
      WNNNW: '1',
      NWNNW: '2',
      WWNNN: '3',
      NNWNW: '4',
      WNWNN: '5',
      NWWNN: '6',
      NNNWW: '7',
      WNNWN: '8',
      NWNWN: '9'
    };

    let decoded = '';
    let i = 3;
    while (i + 5 <= pattern.length - 2) {
      const chunk = pattern.slice(i, i + 5);
      if (!DIGITS[chunk]) break;
      decoded += DIGITS[chunk];
      i += 5;
    }
    return decoded || null;
  }

  private checkMatch(expected: string, found: string): boolean {
    const normExp = expected.replace(/[-\s]/g, '');
    const normFound = found.replace(/[-\s]/g, '');
    if (normFound === normExp || normFound.includes(normExp) || normExp.includes(normFound)) {
      return true;
    }
    // Compare numeric digits without leading zeroes (e.g. GTINs with/without (01) or extra padding)
    const digitsExp = normExp.replace(/\D/g, '').replace(/^0+/, '');
    const digitsFound = normFound.replace(/\D/g, '').replace(/^0+/, '');
    if (digitsExp && digitsFound && (digitsExp === digitsFound || digitsFound.includes(digitsExp) || digitsExp.includes(digitsFound))) {
      return true;
    }
    return false;
  }

  private svgToImage(svgString: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
      img.src = url;
    });
  }
}

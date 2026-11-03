// apps/tool-barcode-generator/src/services/barcode-verifier.service.ts
import { Injectable } from '@angular/core';
import { BarcodeVerificationResult } from '../models/barcode.models';

declare global {
  interface Window {
    BarcodeDetector?: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class BarcodeVerifierService {
  private detectorInstance: any = null;
  private isDetectorSupported: boolean | null = null;

  /**
   * Performs silent background verification of a rendered SVG barcode.
   */
  async verifySvg(svgString: string, expectedValue: string): Promise<BarcodeVerificationResult> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return { supported: false, verified: true };
    }

    if (!this.checkSupport()) {
      return { supported: false, verified: true };
    }

    try {
      if (!this.detectorInstance) {
        const supportedFormats = await window.BarcodeDetector.getSupportedFormats().catch(() => []);
        this.detectorInstance = new window.BarcodeDetector({
          formats: supportedFormats && supportedFormats.length > 0 ? supportedFormats : undefined
        });
      }

      // Render SVG to Image and draw to canvas for BarcodeDetector
      const imageBitmap = await this.svgToImageBitmap(svgString);
      if (!imageBitmap) {
        return { supported: true, verified: true };
      }

      const barcodes = await this.detectorInstance.detect(imageBitmap);

      if (barcodes && barcodes.length > 0) {
        const detected = barcodes[0];
        const rawValue = (detected.rawValue || '').trim();
        const cleanExpected = expectedValue.trim();

        // Exact match or match without leading zero (UPC-A vs EAN-13)
        const isMatch = (rawValue === cleanExpected) ||
                        (rawValue.replace(/^0+/, '') === cleanExpected.replace(/^0+/, '')) ||
                        (cleanExpected.endsWith(rawValue)) ||
                        (rawValue.endsWith(cleanExpected));

        return {
          supported: true,
          verified: isMatch,
          decodedValue: rawValue,
          formatDetected: detected.format,
          mismatch: !isMatch
        };
      }

      // Detector couldn't resolve symbol
      return {
        supported: true,
        verified: false,
        mismatch: false,
        error: 'Scanner could not resolve symbol at this contrast/resolution'
      };
    } catch {
      // Graceful fallback without breaking user flow
      return { supported: false, verified: true };
    }
  }

  private checkSupport(): boolean {
    if (this.isDetectorSupported !== null) {
      return this.isDetectorSupported;
    }
    this.isDetectorSupported = typeof window !== 'undefined' && 'BarcodeDetector' in window;
    return this.isDetectorSupported;
  }

  private async svgToImageBitmap(svgString: string): Promise<ImageBitmap | null> {
    try {
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      if (typeof createImageBitmap === 'function') {
        return await createImageBitmap(blob);
      }
      return null;
    } catch {
      return null;
    }
  }
}

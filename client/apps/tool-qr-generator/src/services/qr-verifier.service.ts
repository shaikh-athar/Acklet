// client/apps/tool-qr-generator/src/services/qr-verifier.service.ts
import { Injectable } from '@angular/core';
import jsQR from 'jsqr';
import { QRVerificationResult } from '../models/qr-generator.models';

@Injectable({
  providedIn: 'root'
})
export class QRVerifierService {
  /**
   * Decodes an in-memory QR image data URL and verifies whether the decoded
   * payload matches the expected content.
   */
  async verifyScannability(dataUrl: string, expectedPayload: string): Promise<QRVerificationResult> {
    if (!dataUrl) {
      return {
        isScannable: false,
        expectedPayload,
        match: false,
        message: 'No QR code image available to scan.'
      };
    }

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return {
        isScannable: true,
        expectedPayload,
        match: true,
        message: 'Scan verification skipped in non-browser environment.'
      };
    }

    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image buffer for scan testing.'));
        img.src = dataUrl;
      });

      const width = img.width || 300;
      const height = img.height || 300;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        return {
          isScannable: false,
          expectedPayload,
          match: false,
          message: 'Unable to initialize 2D canvas context for decode testing.'
        };
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);

      // Pass 1: Standard jsQR decode
      let code = jsQR(imageData.data, imageData.width, imageData.height);
      let pass = 1;

      // Pass 2: Contrast-stretched pass (resolves low contrast like dark red + black)
      if (!code) {
        const stretched = this.stretchContrast(imageData.data);
        if (stretched) {
          code = jsQR(stretched, width, height);
          if (code) pass = 2;
        }
      }

      // Pass 3: Inverted pass (for light modules on dark background)
      if (!code) {
        const inverted = this.invertLuminance(imageData.data);
        code = jsQR(inverted, width, height);
        if (code) pass = 3;
      }

      // Pass 4: Center crop (for framed QR codes with surrounding banners or borders)
      if (!code && (width > 200 || height > 200)) {
        const cropW = Math.round(width * 0.75);
        const cropH = Math.round(height * 0.75);
        const cropX = Math.round((width - cropW) / 2);
        const cropY = Math.round((height - cropH) / 2);
        const croppedImgData = ctx.getImageData(cropX, cropY, cropW, cropH);

        code = jsQR(croppedImgData.data, cropW, cropH);
        if (code) {
          pass = 4;
        } else {
          const stretchedCrop = this.stretchContrast(croppedImgData.data);
          if (stretchedCrop) {
            code = jsQR(stretchedCrop, cropW, cropH);
            if (code) pass = 4;
          }
        }
      }

      if (!code) {
        return {
          isScannable: false,
          expectedPayload,
          match: false,
          confidence: 'low',
          fixAvailable: true,
          message: 'Unscannable: Decoder cannot detect locator patterns. Check contrast ratio or reduce logo size.'
        };
      }

      const match = code.data.trim() === expectedPayload.trim();
      const contrast = this.measureContrastRange(imageData.data);
      const isHighConfidence = match && pass === 1 && contrast >= 140;
      const confidence = isHighConfidence ? 'high' : match ? 'medium' : 'low';

      return {
        isScannable: true,
        decodedPayload: code.data,
        expectedPayload,
        match,
        confidence,
        fixAvailable: confidence !== 'high',
        message: match
          ? 'Scannability Verified: 100% Match.'
          : 'Scannability Warning: Decoded content differs slightly from intended payload.'
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Scan verification error.';
      return {
        isScannable: false,
        expectedPayload,
        match: false,
        confidence: 'low',
        fixAvailable: true,
        message
      };
    }
  }

  private measureContrastRange(data: Uint8ClampedArray): number {
    let minLum = 255;
    let maxLum = 0;
    const len = data.length;

    for (let i = 0; i < len; i += 4) {
      const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      if (lum < minLum) minLum = lum;
      if (lum > maxLum) maxLum = lum;
    }

    return maxLum - minLum;
  }

  /**
   * Normalizes image dynamic range by stretching min/max luminance to [0, 255].
   * This allows jsQR to reliably read stylized and low-contrast codes.
   */
  private stretchContrast(data: Uint8ClampedArray): Uint8ClampedArray | null {
    let minLum = 255;
    let maxLum = 0;
    const len = data.length;

    for (let i = 0; i < len; i += 4) {
      const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      if (lum < minLum) minLum = lum;
      if (lum > maxLum) maxLum = lum;
    }

    const range = maxLum - minLum;
    if (range < 15) return null; // Too flat or uniform

    const out = new Uint8ClampedArray(len);
    for (let i = 0; i < len; i += 4) {
      const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      const stretched = Math.min(255, Math.max(0, Math.round(((lum - minLum) / range) * 255)));
      out[i] = stretched;
      out[i + 1] = stretched;
      out[i + 2] = stretched;
      out[i + 3] = 255;
    }
    return out;
  }

  private invertLuminance(data: Uint8ClampedArray): Uint8ClampedArray {
    const len = data.length;
    const out = new Uint8ClampedArray(len);
    for (let i = 0; i < len; i += 4) {
      const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      const inv = 255 - lum;
      out[i] = inv;
      out[i + 1] = inv;
      out[i + 2] = inv;
      out[i + 3] = 255;
    }
    return out;
  }
}

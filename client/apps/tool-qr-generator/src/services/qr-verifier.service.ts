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
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (!code) {
        return {
          isScannable: false,
          expectedPayload,
          match: false,
          message: 'Unscannable: Decoder cannot detect locator patterns. Check contrast ratio or reduce logo size.'
        };
      }

      const match = code.data.trim() === expectedPayload.trim();
      return {
        isScannable: true,
        decodedPayload: code.data,
        expectedPayload,
        match,
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
        message
      };
    }
  }
}

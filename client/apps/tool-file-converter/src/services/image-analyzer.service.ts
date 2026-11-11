// client/apps/tool-file-converter/src/services/image-analyzer.service.ts
import { Injectable } from '@angular/core';

export interface ImageAnalysisResult {
  hasAlpha: boolean;
  isPhoto: boolean;
  uniqueColorCount: number;
  suggestedFormat?: string;
  reason?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ImageAnalyzerService {
  /**
   * Fast client-side image analyzer that downsamples pixels to 64x64
   * to determine alpha transparency and photo-vs-graphic characteristics.
   */
  analyzeRgbaData(
    rgbaData: Uint8ClampedArray | Uint8Array,
    width: number,
    height: number,
    currentTargetFormat: string = ''
  ): ImageAnalysisResult {
    let hasAlpha = false;
    const colorSet = new Set<number>();
    const totalPixels = width * height;
    const currentTarget = currentTargetFormat.trim().toLowerCase();

    for (let i = 0; i < rgbaData.length; i += 4) {
      const a = rgbaData[i + 3];
      if (a < 255) {
        hasAlpha = true;
      }

      // Quantize RGB to 15-bit color space (5 bits per channel)
      const r5 = rgbaData[i] >> 3;
      const g5 = rgbaData[i + 1] >> 3;
      const b5 = rgbaData[i + 2] >> 3;
      const colorKey = (r5 << 10) | (g5 << 5) | b5;
      colorSet.add(colorKey);
    }

    const uniqueColorCount = colorSet.size;
    // Photos typically have high color entropy (> 500 unique quantized colors in 64x64 thumbnail)
    // Graphics/screenshots typically have low color counts (< 300)
    const isPhoto = uniqueColorCount > Math.min(500, Math.round(totalPixels * 0.15));

    return this.evaluateSuggestionRules(hasAlpha, isPhoto, uniqueColorCount, currentTarget);
  }

  /**
   * Evaluates recommendation rules based on alpha transparency and visual type.
   */
  evaluateSuggestionRules(
    hasAlpha: boolean,
    isPhoto: boolean,
    uniqueColorCount: number,
    currentTarget: string
  ): ImageAnalysisResult {
    let rawSuggestedFormat = '';
    let reason = '';

    if (hasAlpha) {
      // Rule 1: Alpha present, graphic or photo with transparency -> suggest WebP
      rawSuggestedFormat = 'webp';
      reason = 'Has transparency. WebP keeps it at a smaller size.';
    } else if (isPhoto) {
      // Rule 2: No alpha, photo -> suggest WebP
      rawSuggestedFormat = 'webp';
      reason = 'Photo with no transparency. WebP is usually much smaller than PNG.';
    } else {
      // Rule 3: No alpha, graphic or screenshot -> suggest PNG
      rawSuggestedFormat = 'png';
      reason = 'Flat colors and sharp edges. PNG keeps them crisp.';
    }

    // Rule 4: Already in the suggested format -> show nothing
    const normalizedTarget = currentTarget.trim().toLowerCase();
    const alreadyMatches = normalizedTarget === rawSuggestedFormat ||
      (rawSuggestedFormat === 'jpg' && normalizedTarget === 'jpeg') ||
      (rawSuggestedFormat === 'jpeg' && normalizedTarget === 'jpg');

    if (alreadyMatches) {
      return {
        hasAlpha,
        isPhoto,
        uniqueColorCount,
        suggestedFormat: undefined,
        reason: undefined
      };
    }

    return {
      hasAlpha,
      isPhoto,
      uniqueColorCount,
      suggestedFormat: rawSuggestedFormat,
      reason
    };
  }

  /**
   * Analyzes an image file by drawing a downscaled 64x64 thumbnail to an OffscreenCanvas.
   */
  async analyzeFile(file: File, currentTargetFormat: string = ''): Promise<ImageAnalysisResult> {
    const defaultGraphic: ImageAnalysisResult = {
      hasAlpha: false,
      isPhoto: false,
      uniqueColorCount: 50,
      suggestedFormat: 'webp',
      reason: 'Photo with no transparency. WebP is usually much smaller than PNG.'
    };

    if (typeof window === 'undefined') return defaultGraphic;

    try {
      const bitmap = await createImageBitmap(file);
      const sampleW = 64;
      const sampleH = 64;

      let canvas: HTMLCanvasElement | OffscreenCanvas;
      let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

      if (typeof OffscreenCanvas !== 'undefined') {
        canvas = new OffscreenCanvas(sampleW, sampleH);
        ctx = canvas.getContext('2d', { willReadFrequently: true });
      } else {
        canvas = document.createElement('canvas');
        canvas.width = sampleW;
        canvas.height = sampleH;
        ctx = canvas.getContext('2d', { willReadFrequently: true });
      }

      if (!ctx) return defaultGraphic;

      ctx.drawImage(bitmap, 0, 0, sampleW, sampleH);
      const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
      bitmap.close();

      return this.analyzeRgbaData(imgData.data, sampleW, sampleH, currentTargetFormat);
    } catch (_) {
      // Fallback for formats not natively decodable by createImageBitmap
      const lowerName = file.name.toLowerCase();
      const isLikelyPhoto = lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.raw');
      return this.evaluateSuggestionRules(false, isLikelyPhoto, isLikelyPhoto ? 1000 : 80, currentTargetFormat);
    }
  }
}


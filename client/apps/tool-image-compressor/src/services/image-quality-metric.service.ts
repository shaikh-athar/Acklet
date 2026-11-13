// apps/tool-image-compressor/src/services/image-quality-metric.service.ts
import { Injectable, inject } from '@angular/core';
import { VisualQualityMetrics } from '../models/compressor.models';
import { ImageDecoderService } from './image-decoder.service';

const SAMPLE_DIM = 128; // Standardized grid dimension for fast, consistent SSIM calculation
const C1 = (0.01 * 255) ** 2; // 6.5025
const C2 = (0.03 * 255) ** 2; // 58.5225

@Injectable({
  providedIn: 'root'
})
export class ImageQualityMetricService {
  private readonly decoder: ImageDecoderService;

  constructor() {
    try {
      this.decoder = inject(ImageDecoderService);
    } catch {
      this.decoder = new ImageDecoderService();
    }
  }

  /**
   * Computes genuine Structural Similarity Index (SSIM) and PSNR between original canvas and compressed canvas.
   */
  computeQualityMetrics(
    originalCanvas: HTMLCanvasElement | OffscreenCanvas,
    compressedCanvas: HTMLCanvasElement | OffscreenCanvas
  ): VisualQualityMetrics {
    // 1. Render both to standardized 128x128 grayscale luminance grids
    const origLuma = this.extractLuminanceGrid(originalCanvas, SAMPLE_DIM, SAMPLE_DIM);
    const compLuma = this.extractLuminanceGrid(compressedCanvas, SAMPLE_DIM, SAMPLE_DIM);

    const N = origLuma.length;
    if (N === 0) {
      return {
        ssim: 1.0,
        psnr: 99.0,
        qualityRating: 'excellent'
      };
    }

    // 2. Mean values (μ_x, μ_y)
    let sumOrig = 0;
    let sumComp = 0;
    let sumSquaredDiff = 0;

    for (let i = 0; i < N; i++) {
      const o = origLuma[i];
      const c = compLuma[i];
      sumOrig += o;
      sumComp += c;
      const diff = o - c;
      sumSquaredDiff += diff * diff;
    }

    const meanOrig = sumOrig / N;
    const meanComp = sumComp / N;

    // 3. Variances (σ_x², σ_y²) and Covariance (σ_xy)
    let varOrigSum = 0;
    let varCompSum = 0;
    let covarSum = 0;

    for (let i = 0; i < N; i++) {
      const diffOrig = origLuma[i] - meanOrig;
      const diffComp = compLuma[i] - meanComp;
      varOrigSum += diffOrig * diffOrig;
      varCompSum += diffComp * diffComp;
      covarSum += diffOrig * diffComp;
    }

    const varOrig = varOrigSum / (N - 1);
    const varComp = varCompSum / (N - 1);
    const covar = covarSum / (N - 1);

    // 4. SSIM formula: (2*μx*μy + C1)*(2*σxy + C2) / ((μx² + μy² + C1)*(σx² + σy² + C2))
    const num = (2 * meanOrig * meanComp + C1) * (2 * covar + C2);
    const den = (meanOrig * meanOrig + meanComp * meanComp + C1) * (varOrig + varComp + C2);
    const rawSsim = den !== 0 ? num / den : 1.0;
    const ssim = Math.max(0, Math.min(1.0, Math.round(rawSsim * 1000) / 1000));

    // 5. PSNR calculation
    const mse = sumSquaredDiff / N;
    let psnr: number;
    if (mse <= 0.0001) {
      psnr = 99.0; // Infinite / identical
    } else {
      psnr = Math.round(10 * Math.log10((255 * 255) / mse) * 10) / 10;
      psnr = Math.max(0, Math.min(99.0, psnr));
    }

    // 6. Quality rating classification
    let qualityRating: VisualQualityMetrics['qualityRating'];
    let warning: string | undefined = undefined;

    if (ssim >= 0.94 && psnr >= 36) {
      qualityRating = 'excellent';
    } else if (ssim >= 0.86 && psnr >= 30) {
      qualityRating = 'good';
    } else if (ssim >= 0.76) {
      qualityRating = 'fair';
      warning = `Noticeable compression artifacts may be visible in fine details (SSIM: ${ssim}).`;
    } else {
      qualityRating = 'poor';
      warning = `Significant visual degradation detected (SSIM: ${ssim}, PSNR: ${psnr} dB). Consider increasing quality.`;
    }

    // 7. Artifact score calculation (0 = pristine, 100 = extreme blockiness/ringing)
    const meanDiff = Math.sqrt(mse);
    const rawArtifact = (1 - ssim) * 110 + (meanDiff / 255) * 80;
    const artifactScore = Math.max(0, Math.min(100, Math.round(rawArtifact)));

    // 8. Visual Difference Map
    let diffMapUrl: string | undefined = undefined;
    try {
      diffMapUrl = this.generateDifferenceMap(originalCanvas, compressedCanvas, 256, 256);
    } catch {
      // Safe fallback if canvas security or environment disallows toDataURL
    }

    return {
      ssim,
      psnr,
      qualityRating,
      warning,
      diffMapUrl,
      artifactScore
    };
  }

  /**
   * Generates an amplified false-color difference map highlighting compression artifacts and edge loss.
   * Returns a PNG data URL or undefined if unsupported in the current context.
   */
  generateDifferenceMap(
    originalCanvas: HTMLCanvasElement | OffscreenCanvas,
    compressedCanvas: HTMLCanvasElement | OffscreenCanvas,
    width = 256,
    height = 256
  ): string | undefined {
    try {
      const { canvas: diffCanvas, ctx: diffCtx } = this.decoder.createCanvas(width, height);
      const { canvas: origCanvas, ctx: origCtx } = this.decoder.createCanvas(width, height);
      const { canvas: compCanvas, ctx: compCtx } = this.decoder.createCanvas(width, height);

      origCtx.drawImage(originalCanvas, 0, 0, width, height);
      compCtx.drawImage(compressedCanvas, 0, 0, width, height);

      const origData = origCtx.getImageData(0, 0, width, height).data;
      const compData = compCtx.getImageData(0, 0, width, height).data;
      const diffImageData = diffCtx.createImageData(width, height);
      const diffData = diffImageData.data;

      const totalPixels = width * height;
      for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;
        const dr = Math.abs(origData[idx] - compData[idx]);
        const dg = Math.abs(origData[idx + 1] - compData[idx + 1]);
        const db = Math.abs(origData[idx + 2] - compData[idx + 2]);
        const diff = Math.max(dr, dg, db);

        if (diff === 0) {
          // Dark background for zero difference
          diffData[idx] = 15;
          diffData[idx + 1] = 23;
          diffData[idx + 2] = 42;
          diffData[idx + 3] = 255;
        } else {
          // Amplify by 4x for clear human perception of quantization loss
          const amp = Math.min(255, diff * 4);
          if (amp < 64) {
            // Subtle change: deep navy to cyan
            diffData[idx] = 20;
            diffData[idx + 1] = Math.round(amp * 3.5);
            diffData[idx + 2] = Math.round(140 + amp * 1.5);
          } else if (amp < 160) {
            // Moderate change: cyan to bright amber
            diffData[idx] = Math.round((amp - 64) * 2.5);
            diffData[idx + 1] = 220;
            diffData[idx + 2] = 50;
          } else {
            // High change: high-loss magenta / red
            diffData[idx] = 245;
            diffData[idx + 1] = Math.max(0, Math.round(220 - (amp - 160) * 2));
            diffData[idx + 2] = Math.max(0, Math.round(120 - (amp - 160)));
          }
          diffData[idx + 3] = 255;
        }
      }

      diffCtx.putImageData(diffImageData, 0, 0);

      if (typeof (diffCanvas as HTMLCanvasElement).toDataURL === 'function') {
        return (diffCanvas as HTMLCanvasElement).toDataURL('image/png');
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Resamples a canvas to a fixed grid and extracts ITU-R BT.601 luminance channel.
   */
  private extractLuminanceGrid(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    targetW: number,
    targetH: number
  ): Float32Array {
    const { canvas: sampleCanvas, ctx: sampleCtx } = this.decoder.createCanvas(targetW, targetH);
    sampleCtx.imageSmoothingEnabled = true;
    sampleCtx.imageSmoothingQuality = 'high';
    sampleCtx.drawImage(canvas, 0, 0, targetW, targetH);

    let imgData: ImageData;
    try {
      imgData = sampleCtx.getImageData(0, 0, targetW, targetH);
    } catch {
      // Return neutral mid-gray array if canvas context security restricts read
      return new Float32Array(targetW * targetH).fill(128);
    }

    const data = imgData.data;
    const count = targetW * targetH;
    const luma = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const idx = i * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      // ITU-R BT.601 luminance
      luma[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }

    return luma;
  }
}


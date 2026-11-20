// apps/tool-image-compressor/src/services/image-resize.service.ts
import { Injectable, inject } from '@angular/core';
import { ResizeSettings } from '../models/compressor.models';
import { ImageDecoderService } from './image-decoder.service';

export interface ResizedResult {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  width: number;
  height: number;
  didResize: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ImageResizeService {
  private readonly decoder: ImageDecoderService;

  constructor() {
    try {
      this.decoder = inject(ImageDecoderService);
    } catch {
      this.decoder = new ImageDecoderService();
    }
  }

  /**
   * Calculates the target dimensions based on source dimensions and ResizeSettings.
   */
  calculateDimensions(
    sourceWidth: number,
    sourceHeight: number,
    settings: ResizeSettings
  ): { targetWidth: number; targetHeight: number } {
    if (!settings.enabled) {
      return { targetWidth: sourceWidth, targetHeight: sourceHeight };
    }

    const origW = Math.max(1, sourceWidth);
    const origH = Math.max(1, sourceHeight);
    const preventUpscale = !!settings.preventUpscale;

    if (settings.mode === 'percentage') {
      const pct = Math.max(1, Math.min(500, settings.percentage || 100)) / 100;
      let targetW = Math.max(1, Math.round(origW * pct));
      let targetH = Math.max(1, Math.round(origH * pct));

      if (preventUpscale) {
        targetW = Math.min(origW, targetW);
        targetH = Math.min(origH, targetH);
      }
      return { targetWidth: targetW, targetHeight: targetH };
    }

    // Dimensions mode
    const reqW = settings.width && settings.width > 0 ? settings.width : undefined;
    const reqH = settings.height && settings.height > 0 ? settings.height : undefined;

    if (!reqW && !reqH) {
      return { targetWidth: origW, targetHeight: origH };
    }

    let targetW = origW;
    let targetH = origH;
    const aspectRatio = origW / origH;

    if (reqW && reqH) {
      if (settings.maintainAspectRatio) {
        // Fit within bounding box (contain)
        const scale = Math.min(reqW / origW, reqH / origH);
        targetW = Math.max(1, Math.round(origW * scale));
        targetH = Math.max(1, Math.round(origH * scale));
      } else {
        targetW = reqW;
        targetH = reqH;
      }
    } else if (reqW && !reqH) {
      targetW = reqW;
      targetH = settings.maintainAspectRatio
        ? Math.max(1, Math.round(targetW / aspectRatio))
        : origH;
    } else if (!reqW && reqH) {
      targetH = reqH;
      targetW = settings.maintainAspectRatio
        ? Math.max(1, Math.round(targetH * aspectRatio))
        : origW;
    }

    if (preventUpscale) {
      targetW = Math.min(origW, targetW);
      targetH = Math.min(origH, targetH);
    }

    return { targetWidth: targetW, targetHeight: targetH };
  }

  /**
   * Resizes an existing canvas according to ResizeSettings using high-quality stepped downsampling.
   * Optionally applies restrained sharpening to restore edge and typographic contrast after downscaling.
   */
  resizeCanvas(
    sourceCanvas: HTMLCanvasElement | OffscreenCanvas,
    settings: ResizeSettings,
    sharpenAfterDownscale = false
  ): ResizedResult {
    const origW = sourceCanvas.width;
    const origH = sourceCanvas.height;

    const { targetWidth, targetHeight } = this.calculateDimensions(origW, origH, settings);

    if (targetWidth === origW && targetHeight === origH) {
      const domCtx = typeof (sourceCanvas as any).getContext === 'function'
        ? (sourceCanvas as any).getContext('2d')
        : null;
      return {
        canvas: sourceCanvas,
        ctx: domCtx,
        width: origW,
        height: origH,
        didResize: false
      };
    }

    // High quality stepped downscaling for significant size reductions (< 50%)
    let currentCanvas = sourceCanvas;
    let curW = origW;
    let curH = origH;

    while (curW > targetWidth * 2 && curH > targetHeight * 2) {
      const nextW = Math.max(targetWidth, Math.round(curW / 2));
      const nextH = Math.max(targetHeight, Math.round(curH / 2));

      const step = this.decoder.createCanvas(nextW, nextH);
      step.ctx.imageSmoothingEnabled = true;
      step.ctx.imageSmoothingQuality = 'high';
      step.ctx.drawImage(currentCanvas, 0, 0, nextW, nextH);

      currentCanvas = step.canvas;
      curW = nextW;
      curH = nextH;
    }

    // Final render pass to exact target dimensions
    const final = this.decoder.createCanvas(targetWidth, targetHeight);
    final.ctx.imageSmoothingEnabled = true;
    final.ctx.imageSmoothingQuality = 'high';
    final.ctx.drawImage(currentCanvas, 0, 0, targetWidth, targetHeight);

    if (sharpenAfterDownscale && (targetWidth < origW || targetHeight < origH)) {
      const sharpenedCanvas = this.applyRestrainedSharpen(final.canvas, 0.18);
      const sCtx = typeof (sharpenedCanvas as any).getContext === 'function'
        ? (sharpenedCanvas as any).getContext('2d')
        : final.ctx;
      return {
        canvas: sharpenedCanvas,
        ctx: sCtx,
        width: targetWidth,
        height: targetHeight,
        didResize: true
      };
    }

    return {
      canvas: final.canvas,
      ctx: final.ctx,
      width: targetWidth,
      height: targetHeight,
      didResize: true
    };
  }

  /**
   * Applies a restrained 3x3 sharpening convolution filter to restore edge contrast
   * after downsampling, without introducing halos or pixel noise.
   */
  applyRestrainedSharpen(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    amount = 0.18
  ): HTMLCanvasElement | OffscreenCanvas {
    const w = canvas.width;
    const h = canvas.height;
    if (w < 4 || h < 4) return canvas;

    const { canvas: outCanvas, ctx: outCtx } = this.decoder.createCanvas(w, h);
    outCtx.drawImage(canvas, 0, 0);

    try {
      const srcCtx = (canvas as any).getContext('2d', { willReadFrequently: true });
      if (!srcCtx) return outCanvas;
      const srcData = srcCtx.getImageData(0, 0, w, h);
      const dstData = outCtx.createImageData(w, h);

      const src = srcData.data;
      const dst = dstData.data;

      // Restrained 3x3 Laplacian edge enhancement:
      // Center weight: 1 + 4 * a
      // Cardinal neighbors: -a
      const a = Math.max(0.05, Math.min(0.35, amount));
      const centerW = 1 + 4 * a;

      for (let y = 0; y < h; y++) {
        const yTop = (y > 0 ? y - 1 : y) * w * 4;
        const yCur = y * w * 4;
        const yBot = (y < h - 1 ? y + 1 : y) * w * 4;

        for (let x = 0; x < w; x++) {
          const xLeft = (x > 0 ? x - 1 : x) * 4;
          const xCur = x * 4;
          const xRight = (x < w - 1 ? x + 1 : x) * 4;

          const idx = yCur + xCur;

          for (let c = 0; c < 3; c++) {
            const center = src[idx + c];
            const top = src[yTop + xCur + c];
            const bot = src[yBot + xCur + c];
            const left = src[yCur + xLeft + c];
            const right = src[yCur + xRight + c];

            const val = center * centerW - a * (top + bot + left + right);
            dst[idx + c] = val < 0 ? 0 : val > 255 ? 255 : Math.round(val);
          }
          // Preserve Alpha channel untouched
          dst[idx + 3] = src[idx + 3];
        }
      }

      outCtx.putImageData(dstData, 0, 0);
      return outCanvas;
    } catch {
      return outCanvas;
    }
  }
}

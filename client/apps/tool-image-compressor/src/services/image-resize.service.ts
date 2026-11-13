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
   */
  resizeCanvas(
    sourceCanvas: HTMLCanvasElement | OffscreenCanvas,
    settings: ResizeSettings
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

    return {
      canvas: final.canvas,
      ctx: final.ctx,
      width: targetWidth,
      height: targetHeight,
      didResize: true
    };
  }
}

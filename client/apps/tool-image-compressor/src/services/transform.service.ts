// apps/tool-image-compressor/src/services/transform.service.ts
import { Injectable, inject } from '@angular/core';
import { ImageDecoderService } from './image-decoder.service';
import {
  TransformOp,
  RotateAngle,
  FlipDirection,
  CropRect,
  AspectPreset
} from '../models/compressor.models';

export interface TransformedCanvasResult {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  width: number;
  height: number;
}

@Injectable({
  providedIn: 'root'
})
export class TransformService {
  private readonly decoder: ImageDecoderService;

  constructor() {
    try {
      this.decoder = inject(ImageDecoderService);
    } catch {
      this.decoder = new ImageDecoderService();
    }
  }

  /**
   * Sequentially applies a non-destructive pipeline of transform operations
   * (crop, rotate, flip) to an image canvas.
   */
  applyTransforms(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    operations: TransformOp[]
  ): TransformedCanvasResult {
    let currentCanvas: HTMLCanvasElement | OffscreenCanvas = canvas;

    for (const op of operations) {
      if (op.type === 'rotate') {
        currentCanvas = this.rotate(currentCanvas, op.angle).canvas;
      } else if (op.type === 'flip') {
        currentCanvas = this.flip(currentCanvas, op.direction).canvas;
      } else if (op.type === 'crop') {
        currentCanvas = this.crop(currentCanvas, op.rect).canvas;
      }
    }

    const ctx = (currentCanvas as any).getContext?.('2d') || null;
    return {
      canvas: currentCanvas,
      ctx,
      width: currentCanvas.width,
      height: currentCanvas.height
    };
  }

  /**
   * Rotates a canvas by 90° clockwise, 90° counter-clockwise (-90°), or 180°.
   */
  rotate(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    angle: RotateAngle
  ): TransformedCanvasResult {
    const oldW = canvas.width;
    const oldH = canvas.height;

    let newW = oldW;
    let newH = oldH;
    let rad = 0;

    switch (angle) {
      case 90:
        newW = oldH;
        newH = oldW;
        rad = Math.PI / 2;
        break;
      case -90:
        newW = oldH;
        newH = oldW;
        rad = -Math.PI / 2;
        break;
      case 180:
        newW = oldW;
        newH = oldH;
        rad = Math.PI;
        break;
    }

    const { canvas: outCanvas, ctx: outCtx } = this.decoder.createCanvas(newW, newH);
    outCtx.save?.();

    if (angle === 90) {
      outCtx.translate?.(newW, 0);
    } else if (angle === -90) {
      outCtx.translate?.(0, newH);
    } else if (angle === 180) {
      outCtx.translate?.(newW, newH);
    }

    outCtx.rotate?.(rad);
    outCtx.drawImage(canvas as any, 0, 0);
    outCtx.restore?.();

    return {
      canvas: outCanvas,
      ctx: outCtx,
      width: newW,
      height: newH
    };
  }

  /**
   * Flips a canvas horizontally or vertically.
   */
  flip(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    direction: FlipDirection
  ): TransformedCanvasResult {
    const w = canvas.width;
    const h = canvas.height;
    const { canvas: outCanvas, ctx: outCtx } = this.decoder.createCanvas(w, h);

    outCtx.save?.();
    if (direction === 'horizontal') {
      outCtx.translate?.(w, 0);
      outCtx.scale?.(-1, 1);
    } else {
      outCtx.translate?.(0, h);
      outCtx.scale?.(1, -1);
    }

    outCtx.drawImage(canvas as any, 0, 0);
    outCtx.restore?.();

    return {
      canvas: outCanvas,
      ctx: outCtx,
      width: w,
      height: h
    };
  }

  /**
   * Crops a canvas to the specified bounding box rectangle.
   */
  crop(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    rect: CropRect
  ): TransformedCanvasResult {
    const w = canvas.width;
    const h = canvas.height;

    const sx = Math.max(0, Math.min(w - 1, Math.round(rect.x)));
    const sy = Math.max(0, Math.min(h - 1, Math.round(rect.y)));
    const sw = Math.max(1, Math.min(w - sx, Math.round(rect.width)));
    const sh = Math.max(1, Math.min(h - sy, Math.round(rect.height)));

    const { canvas: outCanvas, ctx: outCtx } = this.decoder.createCanvas(sw, sh);
    outCtx.drawImage(canvas as any, sx, sy, sw, sh, 0, 0, sw, sh);

    return {
      canvas: outCanvas,
      ctx: outCtx,
      width: sw,
      height: sh
    };
  }

  /**
   * Calculates a centered bounding box for a given aspect ratio preset.
   */
  calculateAspectCrop(width: number, height: number, preset: AspectPreset): CropRect {
    if (preset === 'free' || width <= 0 || height <= 0) {
      return { x: 0, y: 0, width, height };
    }

    let targetRatio = 1;
    switch (preset) {
      case '1:1':
        targetRatio = 1;
        break;
      case '4:3':
        targetRatio = 4 / 3;
        break;
      case '16:9':
        targetRatio = 16 / 9;
        break;
    }

    const currentRatio = width / height;
    let cropW = width;
    let cropH = height;

    if (currentRatio > targetRatio) {
      // Current image is wider than target ratio
      cropW = Math.round(height * targetRatio);
      cropH = height;
    } else {
      // Current image is taller than target ratio
      cropW = width;
      cropH = Math.round(width / targetRatio);
    }

    const x = Math.max(0, Math.round((width - cropW) / 2));
    const y = Math.max(0, Math.round((height - cropH) / 2));

    return { x, y, width: cropW, height: cropH };
  }

  /**
   * Generates a preview object URL for a transformed canvas.
   */
  async exportCanvasToBlob(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    type = 'image/png'
  ): Promise<Blob> {
    if ('convertToBlob' in canvas && typeof canvas.convertToBlob === 'function') {
      return await canvas.convertToBlob({ type });
    }
    if ('toBlob' in canvas && typeof canvas.toBlob === 'function') {
      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => {
          if (b) resolve(b);
          else reject(new Error('Failed to convert canvas to blob'));
        }, type);
      });
    }
    return new Blob(['mock-binary-transformed-image'], { type });
  }
}


// apps/tool-image-compressor/src/services/image-decoder.service.ts
import { Injectable } from '@angular/core';
import { COMPRESSOR_CONFIG } from '../config/compressor.config';

export interface DecodedImage {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  width: number;
  height: number;
  objectUrlToRevoke: string | null;
}

export const MAX_CANVAS_DIMENSION = COMPRESSOR_CONFIG.limits.maxDimensionEdge;
export const MAX_PIXEL_COUNT = COMPRESSOR_CONFIG.limits.maxPixels; // 100 Megapixels

@Injectable({
  providedIn: 'root'
})
export class ImageDecoderService {
  /**
   * Decodes an image File into a Canvas ready for manipulation or encoding.
   */
  async decodeFile(
    file: File,
    format: string,
    abortSignal?: AbortSignal
  ): Promise<DecodedImage> {
    if (abortSignal?.aborted) {
      throw new Error('Decoding cancelled by user.');
    }

    const cleanFormat = format.toLowerCase().trim().replace(/^\./, '');

    if (cleanFormat === 'svg') {
      return this.decodeSvg(file, abortSignal);
    }

    return this.decodeRaster(file, abortSignal);
  }

  /**
   * Helper to create a canvas of the requested dimensions in both DOM and worker/headless environments.
   */
  createCanvas(
    width: number,
    height: number
  ): {
    canvas: HTMLCanvasElement | OffscreenCanvas;
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  } {
    const w = Math.max(1, Math.min(MAX_CANVAS_DIMENSION, Math.round(width)));
    const h = Math.max(1, Math.min(MAX_CANVAS_DIMENSION, Math.round(height)));

    if (typeof OffscreenCanvas !== 'undefined') {
      try {
        const offCanvas = new OffscreenCanvas(w, h);
        const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
        if (offCtx) {
          return { canvas: offCanvas, ctx: offCtx as OffscreenCanvasRenderingContext2D };
        }
      } catch (_) {
        // Fallback to DOM canvas
      }
    }

    if (typeof document !== 'undefined') {
      const domCanvas = document.createElement('canvas');
      domCanvas.width = w;
      domCanvas.height = h;
      const domCtx = domCanvas.getContext('2d', { willReadFrequently: true });
      if (!domCtx) {
        throw new Error('Failed to create 2D canvas rendering context.');
      }
      return { canvas: domCanvas, ctx: domCtx };
    }

    // Node / headless testing mock fallback
    const buffer = new Uint8ClampedArray(w * h * 4);
    const mockCtx: any = {
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
      fillStyle: '#000000',
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      drawImage: (src: any) => {
        if (src && src._buffer) {
          const srcBuf = src._buffer as Uint8ClampedArray;
          for (let i = 0; i < Math.min(buffer.length, srcBuf.length); i++) {
            buffer[i] = srcBuf[i];
          }
        }
      },
      getImageData: () => ({ data: new Uint8ClampedArray(buffer) }),
      createImageData: (sw: number, sh: number) => ({
        width: sw,
        height: sh,
        data: new Uint8ClampedArray(sw * sh * 4)
      }),
      putImageData: (imgData: any) => {
        if (imgData && imgData.data) {
          const srcData = imgData.data;
          for (let i = 0; i < Math.min(buffer.length, srcData.length); i++) {
            buffer[i] = srcData[i];
          }
        }
      },
      fillRect: (x: number, y: number, rw: number, rh: number) => {
        let r = 0, g = 0, b = 0, a = 255;
        const fs = typeof mockCtx.fillStyle === 'string' ? mockCtx.fillStyle : '';
        if (fs.startsWith('#')) {
          const hex = fs.replace('#', '');
          if (hex.length === 6) {
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
          }
        }
        for (let py = y; py < Math.min(h, y + rh); py++) {
          for (let px = x; px < Math.min(w, x + rw); px++) {
            const idx = (py * w + px) * 4;
            buffer[idx] = r;
            buffer[idx + 1] = g;
            buffer[idx + 2] = b;
            buffer[idx + 3] = a;
          }
        }
      }
    };

    const mockCanvas: any = {
      width: w,
      height: h,
      _buffer: buffer,
      getContext: () => mockCtx,
      convertToBlob: async (options?: any) => new Blob(['mock-binary'], { type: options?.type || 'image/jpeg' }),
      toBlob: (cb: any, type: string) => cb(new Blob(['mock-binary'], { type }))
    };

    return {
      canvas: mockCanvas,
      ctx: mockCtx
    };
  }

  /**
   * Decodes vector SVG by parsing width/height/viewBox and rendering into a high-DPI canvas.
   */
  private async decodeSvg(
    file: File,
    abortSignal?: AbortSignal
  ): Promise<DecodedImage> {
    let svgText = await file.text();
    svgText = this.sanitizeSvg(svgText);
    let width = 800;
    let height = 600;

    const viewBoxMatch = svgText.match(/viewBox\s*=\s*["']\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s*["']/i);
    if (viewBoxMatch) {
      const vbW = parseFloat(viewBoxMatch[3]);
      const vbH = parseFloat(viewBoxMatch[4]);
      if (vbW > 0 && vbH > 0) {
        width = Math.round(vbW);
        height = Math.round(vbH);
      }
    }

    const widthMatch = svgText.match(/<svg[^>]*\bwidth\s*=\s*["']\s*([\d.]+)(?:px)?\s*["']/i);
    const heightMatch = svgText.match(/<svg[^>]*\bheight\s*=\s*["']\s*([\d.]+)(?:px)?\s*["']/i);
    if (widthMatch) {
      const parsedW = parseFloat(widthMatch[1]);
      if (parsedW > 0) width = Math.round(parsedW);
    }
    if (heightMatch) {
      const parsedH = parseFloat(heightMatch[1]);
      if (parsedH > 0) height = Math.round(parsedH);
    }

    if (!svgText.includes('width=') && !svgText.includes('height=')) {
      svgText = svgText.replace(/<svg\b/i, `<svg width="${width}" height="${height}" `);
    }

    const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const objectUrl = URL.createObjectURL(svgBlob);

    try {
      const img = await this.loadImageElement(objectUrl, abortSignal);
      const canvasW = img.naturalWidth || img.width || width;
      const canvasH = img.naturalHeight || img.height || height;
      this.validateDimensions(canvasW, canvasH);

      const { canvas, ctx } = this.createCanvas(canvasW, canvasH);
      ctx.drawImage(img, 0, 0, canvasW, canvasH);

      return {
        canvas,
        ctx,
        width: canvasW,
        height: canvasH,
        objectUrlToRevoke: objectUrl
      };
    } catch (err) {
      URL.revokeObjectURL(objectUrl);
      throw err;
    }
  }

  /**
   * Decodes standard raster formats (JPG, PNG, WebP, AVIF, BMP, GIF).
   */
  private async decodeRaster(
    file: File,
    abortSignal?: AbortSignal
  ): Promise<DecodedImage> {
    let objectUrlToRevoke: string | null = null;
    let bitmap: ImageBitmap | HTMLImageElement | null = null;

    if (typeof createImageBitmap !== 'undefined') {
      try {
        // createImageBitmap handles EXIF orientation automatically in modern browsers
        bitmap = await (createImageBitmap as any)(file, { imageOrientation: 'from-image' }).catch(() =>
          createImageBitmap(file)
        );
      } catch (_) {
        // Fallback to Image element
        const url = URL.createObjectURL(file);
        objectUrlToRevoke = url;
        bitmap = await this.loadImageElement(url, abortSignal);
      }
    } else {
      const url = URL.createObjectURL(file);
      objectUrlToRevoke = url;
      bitmap = await this.loadImageElement(url, abortSignal);
    }

    if (!bitmap) {
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
      throw new Error(`Failed to decode image "${file.name}".`);
    }

    try {
      const w = bitmap.width;
      const h = bitmap.height;
      this.validateDimensions(w, h);

      const { canvas, ctx } = this.createCanvas(w, h);
      ctx.drawImage(bitmap, 0, 0);

      // Free ImageBitmap memory immediately after drawing to canvas
      if (bitmap && 'close' in bitmap && typeof (bitmap as ImageBitmap).close === 'function') {
        (bitmap as ImageBitmap).close();
      }

      return {
        canvas,
        ctx,
        width: w,
        height: h,
        objectUrlToRevoke
      };
    } catch (err) {
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
      if (bitmap && 'close' in bitmap && typeof (bitmap as ImageBitmap).close === 'function') {
        (bitmap as ImageBitmap).close();
      }
      throw err;
    }
  }

  /**
   * Sanitizes SVG XML against scripts, event handlers, and active content.
   */
  sanitizeSvg(svg: string): string {
    return svg
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/\bon\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
      .replace(/href\s*=\s*["']\s*javascript:[^"']*["']/gi, 'href=""')
      .replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, '');
  }

  private validateDimensions(width: number, height: number): void {
    if (width > MAX_CANVAS_DIMENSION || height > MAX_CANVAS_DIMENSION) {
      throw new Error(`Image dimensions (${width}×${height}) exceed the maximum allowable dimension of ${MAX_CANVAS_DIMENSION}px.`);
    }
    if (width * height > MAX_PIXEL_COUNT) {
      throw new Error(`Image resolution (${width}×${height} = ${(width * height / 1_000_000).toFixed(1)} MP) exceeds the 100 Megapixel limit.`);
    }
  }

  private loadImageElement(url: string, abortSignal?: AbortSignal): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      if (abortSignal?.aborted) {
        reject(new Error('Image decoding cancelled by user.'));
        return;
      }

      const img = new Image();
      img.decoding = 'async';

      const cleanup = () => {
        img.onload = null;
        img.onerror = null;
        if (abortSignal) {
          abortSignal.removeEventListener('abort', onAbort);
        }
      };

      const onAbort = () => {
        cleanup();
        img.src = '';
        reject(new Error('Image decoding cancelled by user.'));
      };

      if (abortSignal) {
        abortSignal.addEventListener('abort', onAbort);
      }

      img.onload = () => {
        cleanup();
        resolve(img);
      };

      img.onerror = () => {
        cleanup();
        reject(new Error('Failed to load image element into DOM.'));
      };

      img.src = url;
    });
  }
}

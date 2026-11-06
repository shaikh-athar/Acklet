// apps/tool-file-converter/src/services/adapters/image-conversion.adapter.ts
import { Injectable } from '@angular/core';
import { IConversionAdapter } from '../adapter.interface';
import { ConversionOptions, ConversionResult, ExecutionMode, FileCategory, FormatDescriptor } from '../../models/converter.models';

const SUPPORTED_OUTPUTS_MAP: Record<string, FormatDescriptor[]> = {
  png: [
    { format: 'webp', label: 'WebP', extension: 'webp', mimeType: 'image/webp', category: 'image', executionMode: 'browser', description: 'Modern web image with superior compression', lossless: true },
    { format: 'jpg', label: 'JPG', extension: 'jpg', mimeType: 'image/jpeg', category: 'image', executionMode: 'browser', description: 'Standard compressed photographic format' }
  ],
  jpg: [
    { format: 'webp', label: 'WebP', extension: 'webp', mimeType: 'image/webp', category: 'image', executionMode: 'browser', description: 'Modern web image with smaller footprint' },
    { format: 'png', label: 'PNG', extension: 'png', mimeType: 'image/png', category: 'image', executionMode: 'browser', description: 'Lossless raster graphic format', lossless: true }
  ],
  jpeg: [
    { format: 'webp', label: 'WebP', extension: 'webp', mimeType: 'image/webp', category: 'image', executionMode: 'browser', description: 'Modern web image with smaller footprint' },
    { format: 'png', label: 'PNG', extension: 'png', mimeType: 'image/png', category: 'image', executionMode: 'browser', description: 'Lossless raster graphic format', lossless: true }
  ],
  webp: [
    { format: 'png', label: 'PNG', extension: 'png', mimeType: 'image/png', category: 'image', executionMode: 'browser', description: 'Lossless raster graphic format', lossless: true },
    { format: 'jpg', label: 'JPG', extension: 'jpg', mimeType: 'image/jpeg', category: 'image', executionMode: 'browser', description: 'Standard compressed photographic format' }
  ],
  svg: [
    { format: 'png', label: 'PNG', extension: 'png', mimeType: 'image/png', category: 'graphics', executionMode: 'browser', description: 'High-resolution rasterization with alpha transparency', lossless: true },
    { format: 'webp', label: 'WebP', extension: 'webp', mimeType: 'image/webp', category: 'graphics', executionMode: 'browser', description: 'Compressed modern web image' },
    { format: 'jpg', label: 'JPG', extension: 'jpg', mimeType: 'image/jpeg', category: 'graphics', executionMode: 'browser', description: 'Standard photographic format' }
  ],
  avif: [
    { format: 'webp', label: 'WebP', extension: 'webp', mimeType: 'image/webp', category: 'modern-image', executionMode: 'browser', description: 'Modern web format' },
    { format: 'png', label: 'PNG', extension: 'png', mimeType: 'image/png', category: 'modern-image', executionMode: 'browser', description: 'Lossless uncompressed raster format', lossless: true },
    { format: 'jpg', label: 'JPG', extension: 'jpg', mimeType: 'image/jpeg', category: 'modern-image', executionMode: 'browser', description: 'Universal compatibility format' }
  ],
  gif: [
    { format: 'png', label: 'PNG', extension: 'png', mimeType: 'image/png', category: 'image', executionMode: 'browser', description: 'Lossless raster image frame', lossless: true },
    { format: 'webp', label: 'WebP', extension: 'webp', mimeType: 'image/webp', category: 'image', executionMode: 'browser', description: 'Modern lightweight image' },
    { format: 'jpg', label: 'JPG', extension: 'jpg', mimeType: 'image/jpeg', category: 'image', executionMode: 'browser', description: 'Standard compressed format' }
  ],
  bmp: [
    { format: 'png', label: 'PNG', extension: 'png', mimeType: 'image/png', category: 'image', executionMode: 'browser', description: 'Lossless format with transparency', lossless: true },
    { format: 'webp', label: 'WebP', extension: 'webp', mimeType: 'image/webp', category: 'image', executionMode: 'browser', description: 'Optimized web image' },
    { format: 'jpg', label: 'JPG', extension: 'jpg', mimeType: 'image/jpeg', category: 'image', executionMode: 'browser', description: 'Standard compressed format' }
  ]
};

@Injectable({
  providedIn: 'root'
})
export class ImageConversionAdapter implements IConversionAdapter {
  readonly id = 'image-adapter';
  readonly name = 'Image Conversion Adapter';
  readonly category: FileCategory = 'image';
  readonly executionMode: ExecutionMode = 'browser';

  canConvert(sourceFormat: string, targetFormat: string): boolean {
    const src = sourceFormat.toLowerCase();
    const tgt = targetFormat.toLowerCase();
    const available = SUPPORTED_OUTPUTS_MAP[src];
    if (!available) return false;
    return available.some(out => out.format === tgt);
  }

  getSupportedOutputs(sourceFormat: string): FormatDescriptor[] {
    const src = sourceFormat.toLowerCase();
    return SUPPORTED_OUTPUTS_MAP[src] || [];
  }

  async convert(
    file: File,
    sourceFormat: string,
    targetFormat: string,
    options?: ConversionOptions,
    onProgress?: (progress: number, stage?: string) => void,
    abortSignal?: AbortSignal
  ): Promise<ConversionResult> {
    const startTime = performance.now();
    const src = sourceFormat.toLowerCase();
    const tgt = targetFormat.toLowerCase();

    if (abortSignal?.aborted) {
      throw new Error('Conversion cancelled by user.');
    }

    onProgress?.(10, 'Reading image data...');

    let sourceBitmap: ImageBitmap | HTMLImageElement | null = null;
    let objectUrlToRevoke: string | null = null;

    try {
      if (src === 'svg') {
        onProgress?.(25, 'Parsing vector SVG structure...');
        const svgText = await file.text();
        const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
        objectUrlToRevoke = URL.createObjectURL(svgBlob);
        sourceBitmap = await this.loadImageElement(objectUrlToRevoke, abortSignal);
      } else {
        onProgress?.(25, 'Decoding image raster...');
        // Prefer native createImageBitmap for optimal performance and Web Worker compatibility
        if (typeof createImageBitmap !== 'undefined') {
          try {
            sourceBitmap = await createImageBitmap(file);
          } catch (_) {
            // Fallback to HTMLImageElement for older browsers or specific AVIF container profiles
            objectUrlToRevoke = URL.createObjectURL(file);
            sourceBitmap = await this.loadImageElement(objectUrlToRevoke, abortSignal);
          }
        } else {
          objectUrlToRevoke = URL.createObjectURL(file);
          sourceBitmap = await this.loadImageElement(objectUrlToRevoke, abortSignal);
        }
      }

      if (abortSignal?.aborted) {
        throw new Error('Conversion cancelled by user.');
      }

      onProgress?.(50, 'Rasterizing to high-precision canvas...');

      let width = sourceBitmap.width || 800;
      let height = sourceBitmap.height || 600;

      // Proportional downscaling if max dimensions are configured
      if (options?.maxWidth && width > options.maxWidth) {
        const ratio = options.maxWidth / width;
        width = Math.round(options.maxWidth);
        height = Math.round(height * ratio);
      }
      if (options?.maxHeight && height > options.maxHeight) {
        const ratio = options.maxHeight / height;
        height = Math.round(options.maxHeight);
        width = Math.round(width * ratio);
      }

      const { canvas, ctx } = this.createCanvas(width, height);

      // Handle transparent background when converting to JPG
      if (tgt === 'jpg' || tgt === 'jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(sourceBitmap, 0, 0, width, height);

      if (abortSignal?.aborted) {
        throw new Error('Conversion cancelled by user.');
      }

      onProgress?.(75, `Encoding ${tgt.toUpperCase()} binary...`);

      const targetMime = this.getTargetMimeType(tgt);
      const quality = options?.quality !== undefined ? options.quality : 0.92;

      const outputBlob = await this.canvasToBlob(canvas, targetMime, quality);

      onProgress?.(100, 'Conversion complete!');

      const baseName = this.extractBaseName(file.name);
      const outputExtension = tgt === 'jpeg' ? 'jpg' : tgt;
      const outputFileName = `${baseName}.${outputExtension}`;

      return {
        success: true,
        blob: outputBlob,
        outputFormat: tgt,
        outputExtension,
        outputFileName,
        outputSize: outputBlob.size,
        durationMs: Math.round(performance.now() - startTime)
      };
    } finally {
      if (sourceBitmap && 'close' in sourceBitmap && typeof (sourceBitmap as ImageBitmap).close === 'function') {
        (sourceBitmap as ImageBitmap).close();
      }
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    }
  }

  private createCanvas(width: number, height: number): { canvas: HTMLCanvasElement | OffscreenCanvas; ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D } {
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
      return { canvas, ctx };
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    return { canvas, ctx };
  }

  private async canvasToBlob(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    mimeType: string,
    quality: number
  ): Promise<Blob> {
    if ('convertToBlob' in canvas && typeof (canvas as OffscreenCanvas).convertToBlob === 'function') {
      return (canvas as OffscreenCanvas).convertToBlob({ type: mimeType, quality });
    }
    return new Promise((resolve, reject) => {
      (canvas as HTMLCanvasElement).toBlob(
        blob => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to encode canvas buffer into image blob.'));
        },
        mimeType,
        quality
      );
    });
  }

  private loadImageElement(url: string, abortSignal?: AbortSignal): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      const onAbort = () => {
        img.src = '';
        reject(new Error('Conversion cancelled by user.'));
      };

      if (abortSignal) {
        abortSignal.addEventListener('abort', onAbort, { once: true });
      }

      img.onload = () => {
        if (abortSignal) abortSignal.removeEventListener('abort', onAbort);
        resolve(img);
      };

      img.onerror = () => {
        if (abortSignal) abortSignal.removeEventListener('abort', onAbort);
        reject(new Error('Failed to render image file in browser canvas.'));
      };

      img.src = url;
    });
  }

  private getTargetMimeType(targetFormat: string): string {
    switch (targetFormat.toLowerCase()) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'webp':
        return 'image/webp';
      case 'png':
      default:
        return 'image/png';
    }
  }

  private extractBaseName(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) return filename;
    return filename.substring(0, lastDot);
  }
}


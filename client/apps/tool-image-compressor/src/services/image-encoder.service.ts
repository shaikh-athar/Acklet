// apps/tool-image-compressor/src/services/image-encoder.service.ts
import { Injectable, inject } from '@angular/core';
import { ImageDecoderService } from './image-decoder.service';
import { ImageCapabilityService } from './image-capability.service';
import { AdvancedOptimizationSettings } from '../models/compressor.models';

export interface EncodedImageOutput {
  blob: Blob;
  size: number;
  mimeType: string;
}

@Injectable({
  providedIn: 'root'
})
export class ImageEncoderService {
  private readonly decoder: ImageDecoderService;
  private readonly capabilityService: ImageCapabilityService;

  constructor() {
    try {
      this.decoder = inject(ImageDecoderService);
    } catch {
      this.decoder = new ImageDecoderService();
    }
    try {
      this.capabilityService = inject(ImageCapabilityService);
    } catch {
      this.capabilityService = new ImageCapabilityService();
    }
  }

  /**
   * Encodes a canvas into a compressed image Blob with format-aware quality mapping and transparency flattening.
   */
  async encode(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    mimeType: string,
    quality: number, // 1 to 100
    abortSignal?: AbortSignal,
    advanced?: AdvancedOptimizationSettings
  ): Promise<EncodedImageOutput> {
    if (abortSignal?.aborted) {
      throw new Error('Image encoding cancelled by user.');
    }

    const isJpeg = mimeType === 'image/jpeg';
    const isPng = mimeType === 'image/png';
    const isWebp = mimeType === 'image/webp';
    const isAvif = mimeType === 'image/avif';

    // Map quality 1-100 to 0.01 - 1.0 (clamped)
    let qualityFraction = isPng
      ? 1.0 // PNG is always lossless via canvas encoder
      : Math.max(0.01, Math.min(1.0, quality / 100));

    // If 4:4:4 chroma subsampling is requested for JPEG, boost fraction if within high quality band
    if (isJpeg && advanced?.chromaSubsampling === '4:4:4' && qualityFraction >= 0.8) {
      qualityFraction = Math.max(qualityFraction, 0.92);
    }

    let targetCanvas = canvas;

    // JPEG requires alpha channel flattening against #FFFFFF
    if (isJpeg) {
      const flattened = this.flattenAlphaToWhite(canvas);
      targetCanvas = flattened.canvas;
    } else if (advanced?.cleanTransparency && (isPng || isWebp)) {
      // Clean invisible RGB noise where alpha is 0 to maximize compression efficiency
      targetCanvas = this.cleanTransparentPixels(targetCanvas);
    }

    let blob: Blob;
    try {
      blob = await this.canvasToBlob(targetCanvas, mimeType, qualityFraction, abortSignal);
    } catch (err) {
      // If AVIF encoding fails or is unsupported by current browser, gracefully fallback to WebP
      if (isAvif && this.capabilityService.canEncode('webp')) {
        blob = await this.canvasToBlob(targetCanvas, 'image/webp', qualityFraction, abortSignal);
        return {
          blob,
          size: blob.size,
          mimeType: 'image/webp'
        };
      }
      throw err;
    }

    // Verify browser actually respected MIME type instead of silently falling back to image/png
    if (blob.type !== mimeType && mimeType !== 'image/png') {
      if (isAvif && this.capabilityService.canEncode('webp')) {
        blob = await this.canvasToBlob(targetCanvas, 'image/webp', qualityFraction, abortSignal);
        return {
          blob,
          size: blob.size,
          mimeType: 'image/webp'
        };
      }
    }

    return {
      blob,
      size: blob.size,
      mimeType: blob.type || mimeType
    };
  }

  /**
   * Composites transparent/semi-transparent pixels against a solid white background.
   */
  private flattenAlphaToWhite(
    canvas: HTMLCanvasElement | OffscreenCanvas
  ): {
    canvas: HTMLCanvasElement | OffscreenCanvas;
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  } {
    const w = canvas.width;
    const h = canvas.height;
    const { canvas: bgCanvas, ctx: bgCtx } = this.decoder.createCanvas(w, h);

    bgCtx.fillStyle = '#FFFFFF';
    bgCtx.fillRect(0, 0, w, h);
    bgCtx.drawImage(canvas, 0, 0);

    // Explicitly composite semi-transparent alpha pixels
    try {
      const imgData = bgCtx.getImageData(0, 0, w, h);
      const data = imgData.data;
      let hasAlpha = false;

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 255) {
          hasAlpha = true;
          const a = data[i + 3] / 255;
          data[i] = Math.round(data[i] * a + 255 * (1 - a));
          data[i + 1] = Math.round(data[i + 1] * a + 255 * (1 - a));
          data[i + 2] = Math.round(data[i + 2] * a + 255 * (1 - a));
          data[i + 3] = 255;
        }
      }

      if (hasAlpha) {
        bgCtx.putImageData(imgData, 0, 0);
      }
    } catch (_) {
      // In case of security restrictions (e.g. tainted canvas in mock tests), keep the solid rect composite
    }

    return { canvas: bgCanvas, ctx: bgCtx };
  }

  /**
   * Cleans fully transparent pixels by zeroing out unused RGB color components.
   * This removes entropy noise and increases deflate/WebP compression ratios.
   */
  private cleanTransparentPixels(
    canvas: HTMLCanvasElement | OffscreenCanvas
  ): HTMLCanvasElement | OffscreenCanvas {
    const w = canvas.width;
    const h = canvas.height;
    const { canvas: cleanCanvas, ctx: cleanCtx } = this.decoder.createCanvas(w, h);
    cleanCtx.drawImage(canvas, 0, 0);

    try {
      const imgData = cleanCtx.getImageData(0, 0, w, h);
      const data = imgData.data;
      let modified = false;

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) {
          if (data[i] !== 0 || data[i + 1] !== 0 || data[i + 2] !== 0) {
            data[i] = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
            modified = true;
          }
        }
      }

      if (modified) {
        cleanCtx.putImageData(imgData, 0, 0);
      }
      return cleanCanvas;
    } catch {
      return canvas;
    }
  }

  /**
   * Universal Canvas to Blob conversion supporting both OffscreenCanvas and HTMLCanvasElement.
   */
  private canvasToBlob(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    mimeType: string,
    quality: number,
    abortSignal?: AbortSignal
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (abortSignal?.aborted) {
        reject(new Error('Encoding cancelled by user.'));
        return;
      }

      if ('convertToBlob' in canvas && typeof (canvas as OffscreenCanvas).convertToBlob === 'function') {
        (canvas as OffscreenCanvas)
          .convertToBlob({ type: mimeType, quality })
          .then(blob => {
            if (abortSignal?.aborted) {
              reject(new Error('Encoding cancelled by user.'));
            } else if (blob && blob.size > 0) {
              resolve(blob);
            } else {
              reject(new Error(`Browser generated empty blob for "${mimeType}".`));
            }
          })
          .catch(reject);
        return;
      }

      if ('toBlob' in canvas && typeof (canvas as HTMLCanvasElement).toBlob === 'function') {
        (canvas as HTMLCanvasElement).toBlob(
          blob => {
            if (abortSignal?.aborted) {
              reject(new Error('Encoding cancelled by user.'));
            } else if (blob && blob.size > 0) {
              resolve(blob);
            } else {
              reject(new Error(`Failed to encode image to "${mimeType}".`));
            }
          },
          mimeType,
          quality
        );
        return;
      }

      reject(new Error('Canvas implementation lacks toBlob / convertToBlob method.'));
    });
  }
}


// apps/tool-image-compressor/src/services/image-encoder.service.ts
import { Injectable, inject } from '@angular/core';
import { ImageDecoderService } from './image-decoder.service';
import { ImageCapabilityService } from './image-capability.service';
import { AdvancedOptimizationSettings } from '../models/compressor.models';
import { BmpCodec } from '../codecs/bmp.codec';
import { TiffCodec } from '../codecs/tiff.codec';
import { TgaCodec } from '../codecs/tga.codec';
import { IcoCodec } from '../codecs/ico.codec';
import { encodeIndexedPng, optimizePngLossless, optimizeJpegLossless } from './image-optimizer.util';
import { wasmCodecs, CodecCapabilities, CodecDiagnostics } from './wasm-codecs.adapter';

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

    let targetCanvas = canvas;

    const isJpeg = mimeType === 'image/jpeg';
    const isPng = mimeType === 'image/png';
    const isWebp = mimeType === 'image/webp';
    const isAvif = mimeType === 'image/avif';
    const isBmp = mimeType === 'image/bmp';
    const isTiff = mimeType === 'image/tiff';
    const isTga = mimeType === 'image/x-tga';
    const isIco = mimeType === 'image/x-icon';

    if (isBmp) {
      const ctx = targetCanvas.getContext('2d', { willReadFrequently: true }) as any;
      const imgData = ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
      const blob = BmpCodec.encode(targetCanvas.width, targetCanvas.height, imgData.data);
      return { blob, size: blob.size, mimeType: 'image/bmp' };
    }

    if (isTiff) {
      const ctx = targetCanvas.getContext('2d', { willReadFrequently: true }) as any;
      const imgData = ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
      const blob = TiffCodec.encode(targetCanvas.width, targetCanvas.height, imgData.data, true);
      return { blob, size: blob.size, mimeType: 'image/tiff' };
    }

    if (isTga) {
      const ctx = targetCanvas.getContext('2d', { willReadFrequently: true }) as any;
      const imgData = ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
      const blob = TgaCodec.encode(targetCanvas.width, targetCanvas.height, imgData.data, true);
      return { blob, size: blob.size, mimeType: 'image/x-tga' };
    }

    if (isIco) {
      const pngBlob = await this.canvasToBlob(targetCanvas, 'image/png', 1.0, abortSignal);
      const pngBuffer = await pngBlob.arrayBuffer();
      const blob = IcoCodec.encodeFromPng(new Uint8Array(pngBuffer), targetCanvas.width, targetCanvas.height);
      return { blob, size: blob.size, mimeType: 'image/x-icon' };
    }

    // Map quality 1-100 to appropriate encoder fraction with a sensible floor
    // to prevent severe blur and extreme block artifacts, while allowing aggressive mode for strict targets
    const isAggressive = Boolean(advanced?.aggressive || quality < 20);
    const minSafeFraction = isAggressive ? 0.02 : (isWebp ? 0.15 : (isJpeg ? 0.15 : 0.10));
    let qualityFraction = isPng
      ? 1.0 // Canvas PNG is always lossless
      : Math.max(minSafeFraction, Math.min(1.0, quality / 100));

    if (isWebp && advanced?.losslessWebp) {
      qualityFraction = 1.0;
    }

    // If 4:4:4 chroma subsampling is requested for JPEG, boost fraction if within high quality band
    if (isJpeg && advanced?.chromaSubsampling === '4:4:4' && qualityFraction >= 0.8) {
      qualityFraction = Math.max(qualityFraction, 0.92);
    }

    // PNG lossy palette quantization using Xiaolin Wu's optimal quantization + Oxipng
    if (isPng && (quality < 100 || advanced?.optimizePalette)) {
      const colors = quality >= 90 ? 256
        : (quality >= 75 ? 192
        : (quality >= 55 ? 128
        : (quality >= 35 ? 64
        : (quality >= 20 ? 32 : 16))));
      try {
        const ctx = (targetCanvas as any).getContext('2d', { willReadFrequently: true });
        if (ctx && typeof ctx.getImageData === 'function') {
          const imgData = ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
          let indexedBytes = await encodeIndexedPng(imgData, colors);
          if (indexedBytes && indexedBytes.length > 0) {
            try {
              const oxiBuf = await wasmCodecs.optimiseOxipng(indexedBytes, { level: 2 }, abortSignal);
              if (oxiBuf && oxiBuf.byteLength < indexedBytes.length) {
                indexedBytes = new Uint8Array(oxiBuf) as any;
              }
            } catch (_) {}
            const indexedBlob = new Blob([indexedBytes as any], { type: 'image/png' });
            return {
              blob: indexedBlob,
              size: indexedBlob.size,
              mimeType: 'image/png'
            };
          }
        }
      } catch (_) {}
    }

    // JPEG requires alpha channel flattening against #FFFFFF
    if (isJpeg) {
      const flattened = this.flattenAlphaToWhite(canvas);
      targetCanvas = flattened.canvas;

      // Specialized MozJPEG WASM encoding with progressive scans & Trellis quantization
      try {
        const ctx = (targetCanvas as any).getContext?.('2d', { willReadFrequently: true });
        if (ctx && typeof ctx.getImageData === 'function') {
          const imgData = ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
          if (imgData && imgData.data && imgData.data.length > 0) {
            const mozBuf = await wasmCodecs.encodeMozJpeg(
              imgData,
              {
                quality,
                progressive: true,
                optimize_coding: true,
                trellis_multipass: true,
                trellis_opt_zero: true,
                trellis_opt_table: true,
                chroma_subsample: advanced?.chromaSubsampling === '4:4:4' ? 1 : 2
              },
              abortSignal
            );
            if (mozBuf && mozBuf.byteLength > 0) {
              const blob = new Blob([mozBuf], { type: 'image/jpeg' });
              return {
                blob,
                size: blob.size,
                mimeType: 'image/jpeg'
              };
            }
          }
        }
      } catch (err) {
        if (abortSignal?.aborted) throw err;
      }
    } else if (isWebp) {
      if (advanced?.cleanTransparency) {
        targetCanvas = this.cleanTransparentPixels(targetCanvas);
      }

      // Specialized libwebp WASM encoding
      try {
        const ctx = (targetCanvas as any).getContext?.('2d', { willReadFrequently: true });
        if (ctx && typeof ctx.getImageData === 'function') {
          const imgData = ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
          if (imgData && imgData.data && imgData.data.length > 0) {
            const webpBuf = await wasmCodecs.encodeWebp(
              imgData,
              {
                quality,
                lossless: (advanced?.losslessWebp || quality === 100) ? 1 : 0,
                method: 4
              },
              abortSignal
            );
            if (webpBuf && webpBuf.byteLength > 0) {
              const blob = new Blob([webpBuf], { type: 'image/webp' });
              return {
                blob,
                size: blob.size,
                mimeType: 'image/webp'
              };
            }
          }
        }
      } catch (err) {
        if (abortSignal?.aborted) throw err;
      }
    } else if (advanced?.cleanTransparency && isPng) {
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

    // Lossless post-processing: strip non-critical metadata & chunks with Oxipng optimization
    if (isPng && quality === 100) {
      try {
        const rawBuf = await blob.arrayBuffer();
        const oxiBuf = await wasmCodecs.optimiseOxipng(rawBuf, { level: 2 }, abortSignal);
        if (oxiBuf && oxiBuf.byteLength < blob.size) {
          blob = new Blob([oxiBuf], { type: 'image/png' });
        } else {
          const optimized = await optimizePngLossless(rawBuf);
          if (optimized && optimized.length < blob.size) {
            blob = new Blob([optimized as any], { type: 'image/png' });
          }
        }
      } catch (_) {}
    } else if (isJpeg) {
      try {
        const rawBuf = await blob.arrayBuffer();
        const optimized = optimizeJpegLossless(rawBuf);
        if (optimized && optimized.length < blob.size) {
          blob = new Blob([optimized as any], { type: 'image/jpeg' });
        }
      } catch (_) {}
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
    try {
      bgCtx.drawImage(canvas as any, 0, 0);
    } catch {
      try {
        const srcCtx = (canvas as any).getContext?.('2d');
        if (srcCtx && typeof srcCtx.getImageData === 'function') {
          const imgData = srcCtx.getImageData(0, 0, w, h);
          if (imgData && imgData.data) {
            bgCtx.putImageData(imgData, 0, 0);
          }
        }
      } catch (_) {}
    }

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
   * Quantizes canvas RGB pixels to an adaptive color palette (max 256 colors)
   * while strictly preserving the alpha channel.
   * This substantially reduces entropy for DEFLATE compression in PNG files.
   */
  public quantizeCanvasColors(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    maxColors = 256
  ): HTMLCanvasElement | OffscreenCanvas {
    const w = canvas.width;
    const h = canvas.height;
    if (w < 2 || h < 2) return canvas;

    const { canvas: outCanvas, ctx: outCtx } = this.decoder.createCanvas(w, h);
    outCtx.drawImage(canvas, 0, 0);

    try {
      const imgData = outCtx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // 1. Check unique color count in 15-bit color space
      const colorSet = new Set<number>();
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        const bin = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
        colorSet.add(bin);
        if (colorSet.size > maxColors * 2) break;
      }

      // If already within color budget, no quantization needed
      if (colorSet.size <= maxColors) {
        return outCanvas;
      }

      // 2. Build 15-bit histogram
      const hist = new Uint32Array(32768);
      const sumR = new Float64Array(32768);
      const sumG = new Float64Array(32768);
      const sumB = new Float64Array(32768);

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        const bin = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
        hist[bin]++;
        sumR[bin] += data[i];
        sumG[bin] += data[i + 1];
        sumB[bin] += data[i + 2];
      }

      const occupied: { bin: number; count: number; r: number; g: number; b: number }[] = [];
      for (let i = 0; i < 32768; i++) {
        if (hist[i] > 0) {
          occupied.push({
            bin: i,
            count: hist[i],
            r: Math.round(sumR[i] / hist[i]),
            g: Math.round(sumG[i] / hist[i]),
            b: Math.round(sumB[i] / hist[i])
          });
        }
      }

      // Median cut partition
      const boxes = [occupied];
      while (boxes.length < maxColors) {
        let bestIdx = -1;
        let maxRange = -1;
        let bestAxis: 'r' | 'g' | 'b' = 'r';

        for (let i = 0; i < boxes.length; i++) {
          const b = boxes[i];
          if (b.length <= 1) continue;
          let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
          for (const item of b) {
            if (item.r < minR) minR = item.r;
            if (item.r > maxR) maxR = item.r;
            if (item.g < minG) minG = item.g;
            if (item.g > maxG) maxG = item.g;
            if (item.b < minB) minB = item.b;
            if (item.b > maxB) maxB = item.b;
          }
          const rangeR = maxR - minR;
          const rangeG = maxG - minG;
          const rangeB = maxB - minB;
          const maxRgb = Math.max(rangeR, rangeG, rangeB);
          if (maxRgb > maxRange) {
            maxRange = maxRgb;
            bestIdx = i;
            bestAxis = rangeR >= rangeG && rangeR >= rangeB ? 'r' : (rangeG >= rangeB ? 'g' : 'b');
          }
        }

        if (bestIdx === -1 || maxRange <= 2) break;
        const boxToSplit = boxes[bestIdx];
        boxToSplit.sort((x, y) => x[bestAxis] - y[bestAxis]);
        const median = Math.floor(boxToSplit.length / 2);
        boxes.splice(bestIdx, 1, boxToSplit.slice(0, median), boxToSplit.slice(median));
      }

      // Compute representative color for each box
      const palette: [number, number, number][] = [];
      for (const box of boxes) {
        let count = 0, tr = 0, tg = 0, tb = 0;
        for (const item of box) {
          count += item.count;
          tr += item.r * item.count;
          tg += item.g * item.count;
          tb += item.b * item.count;
        }
        if (count > 0) {
          palette.push([Math.round(tr / count), Math.round(tg / count), Math.round(tb / count)]);
        }
      }

      // Precompute 32,768 LUT for fast remap
      const lutR = new Uint8Array(32768);
      const lutG = new Uint8Array(32768);
      const lutB = new Uint8Array(32768);

      for (let bin = 0; bin < 32768; bin++) {
        if (hist[bin] === 0) continue;
        const br = ((bin >> 10) & 0x1F) << 3;
        const bg = ((bin >> 5) & 0x1F) << 3;
        const bb = (bin & 0x1F) << 3;

        let bestDist = Infinity;
        let bestPal = palette[0] || [0, 0, 0];
        for (const p of palette) {
          const dr = br - p[0];
          const dg = bg - p[1];
          const db = bb - p[2];
          const dist = dr * dr + dg * dg + db * db;
          if (dist < bestDist) {
            bestDist = dist;
            bestPal = p;
          }
        }
        lutR[bin] = bestPal[0];
        lutG[bin] = bestPal[1];
        lutB[bin] = bestPal[2];
      }

      // Remap canvas pixels
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        const bin = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
        data[i] = lutR[bin];
        data[i + 1] = lutG[bin];
        data[i + 2] = lutB[bin];
      }

      outCtx.putImageData(imgData, 0, 0);
      return outCanvas;
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
        try {
          const promise = (canvas as OffscreenCanvas).convertToBlob({ type: mimeType, quality });
          if (promise && typeof promise.then === 'function') {
            promise
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
        } catch (_) {}
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

  /**
   * Returns reported capabilities for an encoding format.
   */
  public getCodecCapabilities(mimeType: string): CodecCapabilities {
    return wasmCodecs.getCapabilities(mimeType);
  }

  /**
   * Returns current WASM codec diagnostics and telemetry.
   */
  public getCodecDiagnostics(): CodecDiagnostics {
    return wasmCodecs.getDiagnostics();
  }
}


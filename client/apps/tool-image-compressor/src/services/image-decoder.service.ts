// apps/tool-image-compressor/src/services/image-decoder.service.ts
import { Injectable } from '@angular/core';
import { COMPRESSOR_CONFIG } from '../config/compressor.config';
import { BmpCodec } from '../codecs/bmp.codec';
import { TiffCodec } from '../codecs/tiff.codec';
import { TgaCodec } from '../codecs/tga.codec';
import { IcoCodec } from '../codecs/ico.codec';
import { CurCodec } from '../codecs/cur.codec';
import { IcnsCodec } from '../codecs/icns.codec';
import { GifCodec } from '../codecs/gif.codec';
import { PsdCodec } from '../codecs/psd.codec';
import { PcxCodec } from '../codecs/pcx.codec';
import { NetpbmCodec } from '../codecs/netpbm.codec';
import { HdrCodec } from '../codecs/hdr.codec';
import { FitsCodec } from '../codecs/fits.codec';
import { RawCameraCodec } from '../codecs/raw-camera.codec';
import { DdsCodec } from '../codecs/dds.codec';
import { ExrCodec } from '../codecs/exr.codec';
import { QoiCodec } from '../codecs/qoi.codec';
import { CorelCodec } from '../codecs/corel.codec';
import { XcfCodec } from '../codecs/xcf.codec';
import { OraCodec } from '../codecs/ora.codec';
import { KraCodec } from '../codecs/kra.codec';
import { SvgzCodec } from '../codecs/svgz.codec';

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
   * Leverages authentic pure-TypeScript decoders for broad professional & raw formats.
   */
  async decodeFile(
    file: File,
    format: string,
    abortSignal?: AbortSignal
  ): Promise<DecodedImage> {
    if (abortSignal?.aborted) {
      throw new Error('Decoding cancelled by user.');
    }

    const cleanFormat = (format || '').toLowerCase().trim().replace(/^\./, '');

    // Vector SVG
    if (cleanFormat === 'svg') {
      return this.decodeSvg(file, abortSignal);
    }

    // GZipped SVG
    if (cleanFormat === 'svgz') {
      return this.decodeSvgz(file, abortSignal);
    }

    // Windows BMP
    if (cleanFormat === 'bmp') {
      try {
        const buffer = await file.arrayBuffer();
        const bmpResult = BmpCodec.decode(buffer);
        this.validateDimensions(bmpResult.width, bmpResult.height);
        const { canvas, ctx } = this.createCanvas(bmpResult.width, bmpResult.height);
        this.putPixelData(ctx, bmpResult.data, bmpResult.width, bmpResult.height);
        return { canvas, ctx, width: bmpResult.width, height: bmpResult.height, objectUrlToRevoke: null };
      } catch (_) {
        return this.decodeRaster(file, abortSignal);
      }
    }

    // Baseline & Multi-Strip TIFF 6.0
    if (cleanFormat === 'tiff' || cleanFormat === 'tif') {
      const buffer = await file.arrayBuffer();
      const tiffResult = TiffCodec.decode(buffer);
      if (tiffResult.embeddedJpegBlob) {
        const url = URL.createObjectURL(tiffResult.embeddedJpegBlob);
        try {
          const img = await this.loadImageElement(url, abortSignal);
          const { canvas, ctx } = this.createCanvas(img.width, img.height);
          ctx.drawImage(img, 0, 0);
          return { canvas, ctx, width: img.width, height: img.height, objectUrlToRevoke: url };
        } catch (err) {
          URL.revokeObjectURL(url);
          throw err;
        }
      } else if (tiffResult.data) {
        this.validateDimensions(tiffResult.width, tiffResult.height);
        const { canvas, ctx } = this.createCanvas(tiffResult.width, tiffResult.height);
        this.putPixelData(ctx, tiffResult.data, tiffResult.width, tiffResult.height);
        return { canvas, ctx, width: tiffResult.width, height: tiffResult.height, objectUrlToRevoke: null };
      }
      throw new Error(`Failed to decode TIFF structure from "${file.name}".`);
    }

    // Truevision TGA
    if (cleanFormat === 'tga') {
      const buffer = await file.arrayBuffer();
      const tgaResult = TgaCodec.decode(buffer);
      this.validateDimensions(tgaResult.width, tgaResult.height);
      const { canvas, ctx } = this.createCanvas(tgaResult.width, tgaResult.height);
      this.putPixelData(ctx, tgaResult.data, tgaResult.width, tgaResult.height);
      return { canvas, ctx, width: tgaResult.width, height: tgaResult.height, objectUrlToRevoke: null };
    }

    // Windows ICO
    if (cleanFormat === 'ico') {
      const buffer = await file.arrayBuffer();
      const icoResult = IcoCodec.decodeBestEntry(buffer);
      if (icoResult.pngBlob) {
        const url = URL.createObjectURL(icoResult.pngBlob);
        try {
          const img = await this.loadImageElement(url, abortSignal);
          const { canvas, ctx } = this.createCanvas(img.width, img.height);
          ctx.drawImage(img, 0, 0);
          return { canvas, ctx, width: img.width, height: img.height, objectUrlToRevoke: url };
        } catch (err) {
          URL.revokeObjectURL(url);
          throw err;
        }
      } else if (icoResult.rgbaData) {
        this.validateDimensions(icoResult.width, icoResult.height);
        const { canvas, ctx } = this.createCanvas(icoResult.width, icoResult.height);
        this.putPixelData(ctx, icoResult.rgbaData, icoResult.width, icoResult.height);
        return { canvas, ctx, width: icoResult.width, height: icoResult.height, objectUrlToRevoke: null };
      }
      return this.decodeRaster(file, abortSignal);
    }

    // Windows Cursor
    if (cleanFormat === 'cur') {
      const buffer = await file.arrayBuffer();
      const curResult = CurCodec.decode(buffer);
      if (curResult.pngBlob) {
        const url = URL.createObjectURL(curResult.pngBlob);
        const img = await this.loadImageElement(url, abortSignal);
        const { canvas, ctx } = this.createCanvas(img.width, img.height);
        ctx.drawImage(img, 0, 0);
        return { canvas, ctx, width: img.width, height: img.height, objectUrlToRevoke: url };
      } else if (curResult.rgbaData) {
        this.validateDimensions(curResult.width, curResult.height);
        const { canvas, ctx } = this.createCanvas(curResult.width, curResult.height);
        this.putPixelData(ctx, curResult.rgbaData, curResult.width, curResult.height);
        return { canvas, ctx, width: curResult.width, height: curResult.height, objectUrlToRevoke: null };
      }
    }

    // Apple ICNS
    if (cleanFormat === 'icns') {
      const buffer = await file.arrayBuffer();
      const icnsResult = IcnsCodec.decode(buffer);
      if (icnsResult.pngBlob) {
        const url = URL.createObjectURL(icnsResult.pngBlob);
        const img = await this.loadImageElement(url, abortSignal);
        const { canvas, ctx } = this.createCanvas(img.width, img.height);
        ctx.drawImage(img, 0, 0);
        return { canvas, ctx, width: img.width, height: img.height, objectUrlToRevoke: url };
      } else if (icnsResult.rgbaData) {
        this.validateDimensions(icnsResult.width, icnsResult.height);
        const { canvas, ctx } = this.createCanvas(icnsResult.width, icnsResult.height);
        this.putPixelData(ctx, icnsResult.rgbaData, icnsResult.width, icnsResult.height);
        return { canvas, ctx, width: icnsResult.width, height: icnsResult.height, objectUrlToRevoke: null };
      }
    }

    // Adobe Photoshop PSD / PSB
    if (cleanFormat === 'psd' || cleanFormat === 'psb') {
      const buffer = await file.arrayBuffer();
      const psdResult = PsdCodec.decode(buffer);
      this.validateDimensions(psdResult.width, psdResult.height);
      const { canvas, ctx } = this.createCanvas(psdResult.width, psdResult.height);
      this.putPixelData(ctx, psdResult.data, psdResult.width, psdResult.height);
      return { canvas, ctx, width: psdResult.width, height: psdResult.height, objectUrlToRevoke: null };
    }

    // ZSoft PCX
    if (cleanFormat === 'pcx') {
      const buffer = await file.arrayBuffer();
      const pcxResult = PcxCodec.decode(buffer);
      this.validateDimensions(pcxResult.width, pcxResult.height);
      const { canvas, ctx } = this.createCanvas(pcxResult.width, pcxResult.height);
      this.putPixelData(ctx, pcxResult.data, pcxResult.width, pcxResult.height);
      return { canvas, ctx, width: pcxResult.width, height: pcxResult.height, objectUrlToRevoke: null };
    }

    // Netpbm (PPM, PGM, PBM, PNM)
    if (['ppm', 'pgm', 'pbm', 'pnm'].includes(cleanFormat)) {
      const buffer = await file.arrayBuffer();
      const pnmResult = NetpbmCodec.decode(buffer);
      this.validateDimensions(pnmResult.width, pnmResult.height);
      const { canvas, ctx } = this.createCanvas(pnmResult.width, pnmResult.height);
      this.putPixelData(ctx, pnmResult.data, pnmResult.width, pnmResult.height);
      return { canvas, ctx, width: pnmResult.width, height: pnmResult.height, objectUrlToRevoke: null };
    }

    // Radiance HDR
    if (cleanFormat === 'hdr') {
      const buffer = await file.arrayBuffer();
      const hdrResult = HdrCodec.decode(buffer);
      this.validateDimensions(hdrResult.width, hdrResult.height);
      const { canvas, ctx } = this.createCanvas(hdrResult.width, hdrResult.height);
      this.putPixelData(ctx, hdrResult.data, hdrResult.width, hdrResult.height);
      return { canvas, ctx, width: hdrResult.width, height: hdrResult.height, objectUrlToRevoke: null };
    }

    // FITS Astronomical Image
    if (cleanFormat === 'fits' || cleanFormat === 'fit') {
      const buffer = await file.arrayBuffer();
      const fitsResult = FitsCodec.decode(buffer);
      this.validateDimensions(fitsResult.width, fitsResult.height);
      const { canvas, ctx } = this.createCanvas(fitsResult.width, fitsResult.height);
      this.putPixelData(ctx, fitsResult.data, fitsResult.width, fitsResult.height);
      return { canvas, ctx, width: fitsResult.width, height: fitsResult.height, objectUrlToRevoke: null };
    }

    // Camera RAW (DNG, CR2, CR3, NEF, ARW, RAF, ORF, RW2, PEF)
    const rawFormats = ['raw', 'dng', 'cr2', 'cr3', 'nef', 'arw', 'raf', 'orf', 'rw2', 'pef'];
    if (rawFormats.includes(cleanFormat)) {
      const buffer = await file.arrayBuffer();
      const rawResult = RawCameraCodec.extractAuthenticRaster(buffer);
      if (rawResult.data) {
        this.validateDimensions(rawResult.width, rawResult.height);
        const { canvas, ctx } = this.createCanvas(rawResult.width, rawResult.height);
        this.putPixelData(ctx, rawResult.data, rawResult.width, rawResult.height);
        return { canvas, ctx, width: rawResult.width, height: rawResult.height, objectUrlToRevoke: null };
      } else if (rawResult.blob) {
        const url = URL.createObjectURL(rawResult.blob);
        const img = await this.loadImageElement(url, abortSignal);
        const { canvas, ctx } = this.createCanvas(img.width, img.height);
        ctx.drawImage(img, 0, 0);
        return { canvas, ctx, width: img.width, height: img.height, objectUrlToRevoke: url };
      }
    }

    // DirectDraw Surface (DDS)
    if (cleanFormat === 'dds') {
      const buffer = await file.arrayBuffer();
      const ddsResult = DdsCodec.decode(buffer);
      this.validateDimensions(ddsResult.width, ddsResult.height);
      const { canvas, ctx } = this.createCanvas(ddsResult.width, ddsResult.height);
      this.putPixelData(ctx, ddsResult.data, ddsResult.width, ddsResult.height);
      return { canvas, ctx, width: ddsResult.width, height: ddsResult.height, objectUrlToRevoke: null };
    }

    // OpenEXR (EXR)
    if (cleanFormat === 'exr') {
      const buffer = await file.arrayBuffer();
      const exrResult = ExrCodec.decode(buffer);
      this.validateDimensions(exrResult.width, exrResult.height);
      const { canvas, ctx } = this.createCanvas(exrResult.width, exrResult.height);
      this.putPixelData(ctx, exrResult.data, exrResult.width, exrResult.height);
      return { canvas, ctx, width: exrResult.width, height: exrResult.height, objectUrlToRevoke: null };
    }

    // Quite OK Image (QOI)
    if (cleanFormat === 'qoi') {
      const buffer = await file.arrayBuffer();
      const qoiResult = QoiCodec.decode(buffer);
      this.validateDimensions(qoiResult.width, qoiResult.height);
      const { canvas, ctx } = this.createCanvas(qoiResult.width, qoiResult.height);
      this.putPixelData(ctx, qoiResult.data, qoiResult.width, qoiResult.height);
      return { canvas, ctx, width: qoiResult.width, height: qoiResult.height, objectUrlToRevoke: null };
    }

    // CorelDRAW (CDR / CMX)
    if (cleanFormat === 'cdr' || cleanFormat === 'cmx') {
      const buffer = await file.arrayBuffer();
      const corelResult = await CorelCodec.decode(buffer);
      this.validateDimensions(corelResult.width, corelResult.height);
      if (corelResult.pngBlob) {
        return this.decodeRaster(corelResult.pngBlob, abortSignal);
      }
      const { canvas, ctx } = this.createCanvas(corelResult.width, corelResult.height);
      if (corelResult.data) {
        this.putPixelData(ctx, corelResult.data, corelResult.width, corelResult.height);
      }
      return { canvas, ctx, width: corelResult.width, height: corelResult.height, objectUrlToRevoke: null };
    }

    // GIMP XCF
    if (cleanFormat === 'xcf') {
      const buffer = await file.arrayBuffer();
      const xcfResult = XcfCodec.decode(buffer);
      this.validateDimensions(xcfResult.width, xcfResult.height);
      const { canvas, ctx } = this.createCanvas(xcfResult.width, xcfResult.height);
      this.putPixelData(ctx, xcfResult.data, xcfResult.width, xcfResult.height);
      return { canvas, ctx, width: xcfResult.width, height: xcfResult.height, objectUrlToRevoke: null };
    }

    // OpenRaster (ORA)
    if (cleanFormat === 'ora') {
      const buffer = await file.arrayBuffer();
      const oraResult = await OraCodec.decode(buffer);
      if (oraResult.pngBlob) {
        const url = URL.createObjectURL(oraResult.pngBlob);
        const img = await this.loadImageElement(url, abortSignal);
        const { canvas, ctx } = this.createCanvas(img.width, img.height);
        ctx.drawImage(img, 0, 0);
        return { canvas, ctx, width: img.width, height: img.height, objectUrlToRevoke: url };
      }
    }

    // Krita KRA
    if (cleanFormat === 'kra') {
      const buffer = await file.arrayBuffer();
      const kraResult = await KraCodec.decode(buffer);
      if (kraResult.pngBlob) {
        const url = URL.createObjectURL(kraResult.pngBlob);
        const img = await this.loadImageElement(url, abortSignal);
        const { canvas, ctx } = this.createCanvas(img.width, img.height);
        ctx.drawImage(img, 0, 0);
        return { canvas, ctx, width: img.width, height: img.height, objectUrlToRevoke: url };
      }
    }

    // EPS / AI with binary TIFF preview
    if (cleanFormat === 'eps' || cleanFormat === 'ai') {
      try {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        if (bytes.length >= 32 && bytes[0] === 0xC5 && bytes[1] === 0xD0 && bytes[2] === 0xD3 && bytes[3] === 0xC6) {
          const view = new DataView(buffer);
          const tiffOffset = view.getUint32(20, true);
          const tiffLength = view.getUint32(24, true);
          if (tiffOffset > 0 && tiffLength > 0 && tiffOffset + tiffLength <= buffer.byteLength) {
            const tiffBytes = bytes.subarray(tiffOffset, tiffOffset + tiffLength);
            const tiffResult = TiffCodec.decode(tiffBytes);
            if (tiffResult.data) {
              const { canvas, ctx } = this.createCanvas(tiffResult.width, tiffResult.height);
              this.putPixelData(ctx, tiffResult.data, tiffResult.width, tiffResult.height);
              return { canvas, ctx, width: tiffResult.width, height: tiffResult.height, objectUrlToRevoke: null };
            }
          }
        }
      } catch (_) {}
    }

    // GIF (using custom decoder for frame composite or fallback to browser raster)
    if (cleanFormat === 'gif') {
      try {
        const buffer = await file.arrayBuffer();
        const gifResult = GifCodec.decode(buffer);
        this.validateDimensions(gifResult.width, gifResult.height);
        const { canvas, ctx } = this.createCanvas(gifResult.width, gifResult.height);
        this.putPixelData(ctx, gifResult.data, gifResult.width, gifResult.height);
        return { canvas, ctx, width: gifResult.width, height: gifResult.height, objectUrlToRevoke: null };
      } catch (_) {
        return this.decodeRaster(file, abortSignal);
      }
    }

    // Standard raster formats: JPG, PNG, WebP, AVIF
    return this.decodeRaster(file, abortSignal);
  }

  /**
   * Helper to write raw RGBA pixel data onto canvas.
   */
  putPixelData(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): void {
    const imgData = ctx.createImageData(width, height);
    imgData.data.set(data);
    ctx.putImageData(imgData, 0, 0);
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
    return this.decodeSvgString(svgText, abortSignal);
  }

  private async decodeSvgz(
    file: File,
    abortSignal?: AbortSignal
  ): Promise<DecodedImage> {
    const buffer = await file.arrayBuffer();
    const svgText = await SvgzCodec.decompressToSvgText(buffer);
    return this.decodeSvgString(svgText, abortSignal);
  }

  private async decodeSvgString(
    rawSvgText: string,
    abortSignal?: AbortSignal
  ): Promise<DecodedImage> {
    let svgText = this.sanitizeSvg(rawSvgText);
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
    file: File | Blob,
    abortSignal?: AbortSignal
  ): Promise<DecodedImage> {
    let objectUrlToRevoke: string | null = null;
    let bitmap: ImageBitmap | HTMLImageElement | null = null;

    if (typeof createImageBitmap !== 'undefined') {
      try {
        bitmap = await (createImageBitmap as any)(file, { imageOrientation: 'from-image' }).catch(() =>
          createImageBitmap(file)
        );
      } catch (_) {
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
      const fileName = (file as File).name || 'image';
      throw new Error(`Failed to decode image "${fileName}".`);
    }

    try {
      const w = bitmap.width;
      const h = bitmap.height;
      this.validateDimensions(w, h);

      const { canvas, ctx } = this.createCanvas(w, h);
      ctx.drawImage(bitmap, 0, 0);

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

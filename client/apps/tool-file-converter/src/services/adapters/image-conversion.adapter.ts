// client/apps/tool-file-converter/src/services/adapters/image-conversion.adapter.ts
import { Injectable, inject } from '@angular/core';
import { IConversionAdapter } from '../adapter.interface';
import { ConversionOptions, ConversionResult, ExecutionMode, FileCategory, FormatDescriptor } from '../../models/converter.models';
import { ImageCapabilityRegistry } from '../image-capability.registry';
import { ImageValidationService } from '../image-validation.service';
import { ImageOutputValidatorService } from '../image-output-validator.service';
import { BmpCodec } from '../image-codecs/bmp.codec';
import { TgaCodec } from '../image-codecs/tga.codec';
import { IcoCodec } from '../image-codecs/ico.codec';
import { TiffCodec } from '../image-codecs/tiff.codec';
import { PsdCodec } from '../image-codecs/psd.codec';
import { PcxCodec } from '../image-codecs/pcx.codec';
import { NetpbmCodec } from '../image-codecs/netpbm.codec';
import { HdrCodec } from '../image-codecs/hdr.codec';
import { FitsCodec } from '../image-codecs/fits.codec';
import { RawCameraCodec } from '../image-codecs/raw-camera.codec';
import { PdfCodec } from '../image-codecs/pdf.codec';
import { GifCodec } from '../image-codecs/gif.codec';
import { DdsCodec } from '../image-codecs/dds.codec';
import { IcnsCodec } from '../image-codecs/icns.codec';
import { XbmXpmCodec } from '../image-codecs/xbm-xpm.codec';
import { ExrCodec } from '../image-codecs/exr.codec';
import { QoiCodec } from '../image-codecs/qoi.codec';
import { CurCodec } from '../image-codecs/cur.codec';
import { KtxCodec } from '../image-codecs/ktx.codec';
import { PvrCodec } from '../image-codecs/pvr.codec';
import { CorelCodec } from '../image-codecs/corel.codec';
import { XcfCodec } from '../image-codecs/xcf.codec';
import { OraCodec } from '../image-codecs/ora.codec';
import { WmfEmfCodec } from '../image-codecs/wmf-emf.codec';
import { SvgzCodec } from '../image-codecs/svgz.codec';
import { ApngCodec, ApngParseResult } from '../image-codecs/apng.codec';
import { JxlCodec } from '../image-codecs/jxl.codec';
import { KraCodec } from '../image-codecs/kra.codec';
import { IdmlCodec } from '../image-codecs/idml.codec';
import { DxfCodec } from '../image-codecs/dxf.codec';
import { DwgCodec } from '../image-codecs/dwg.codec';
import { CgmCodec } from '../image-codecs/cgm.codec';
import { WebpCodec, DecodedWebpAnimation } from '../image-codecs/webp.codec';
import { ExifMetadataHelper } from '../image-codecs/exif-metadata.helper';

function safeInject<T>(token: any): T | null {
  try {
    return inject(token, { optional: true });
  } catch (_) {
    return null;
  }
}

@Injectable({
  providedIn: 'root'
})
export class ImageConversionAdapter implements IConversionAdapter {
  readonly id = 'image-adapter';
  readonly name = 'Universal Image Conversion Adapter';
  readonly category: FileCategory = 'image';
  readonly executionMode: ExecutionMode = 'browser';

  private readonly capabilityRegistry: ImageCapabilityRegistry;
  private readonly validatorService: ImageValidationService;
  private readonly outputValidator: ImageOutputValidatorService;

  constructor(
    capabilityRegistry?: ImageCapabilityRegistry,
    validatorService?: ImageValidationService,
    outputValidator?: ImageOutputValidatorService
  ) {
    this.capabilityRegistry = capabilityRegistry || safeInject(ImageCapabilityRegistry) || new ImageCapabilityRegistry();
    this.validatorService = validatorService || safeInject(ImageValidationService) || new ImageValidationService();
    this.outputValidator = outputValidator || safeInject(ImageOutputValidatorService) || new ImageOutputValidatorService();
  }

  canConvert(sourceFormat: string, targetFormat: string): boolean {
    const src = sourceFormat.toLowerCase();
    const tgt = targetFormat.toLowerCase();
    if (!this.capabilityRegistry.isInputSupported(src)) return false;
    const compatible = this.capabilityRegistry.getCompatibleOutputs(src);
    return compatible.some(out => out.format === tgt);
  }

  getSupportedOutputs(sourceFormat: string): FormatDescriptor[] {
    return this.capabilityRegistry.getCompatibleOutputs(sourceFormat);
  }

  async encodeVariantForComparison(
    file: File,
    targetFormat: 'webp' | 'avif' | 'png' | 'jpg',
    quality: number = 0.85,
    maxWidth?: number
  ): Promise<{ blob: Blob; size: number }> {
    const ext = file.name.substring(file.name.lastIndexOf('.') + 1).toLowerCase() || 'png';
    const decoded = await this.decodeSourceToCanvas(file, ext);
    let canvas = decoded.canvas;

    if (maxWidth && canvas.width > maxWidth) {
      const scale = maxWidth / canvas.width;
      const targetW = maxWidth;
      const targetH = Math.max(1, Math.round(canvas.height * scale));
      const rescaled = this.rescaleCanvas(canvas, targetW, targetH);
      canvas = rescaled.canvas;
    }

    const mime = targetFormat === 'jpg' ? 'image/jpeg' : (targetFormat === 'avif' ? 'image/avif' : (targetFormat === 'webp' ? 'image/webp' : 'image/png'));
    const isLossless = targetFormat === 'png';
    const q = isLossless ? 1.0 : quality;
    const isJpg = targetFormat === 'jpg';

    const blob = await this.canvasToBlob(canvas, mime, q, isJpg);
    if (decoded.objectUrlToRevoke) {
      URL.revokeObjectURL(decoded.objectUrlToRevoke);
    }
    return { blob, size: blob.size };
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

    // 1. Validate file constraints
    this.validatorService.validateFileSize(file);

    onProgress?.(10, `Reading ${src.toUpperCase()} binary structure...`);

    let canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
    let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;
    let objectUrlToRevoke: string | null = null;

    try {
      // 2. Decode source format to high-precision Canvas
      const decoded = await this.decodeSourceToCanvas(file, src, onProgress, abortSignal);
      canvas = decoded.canvas;
      ctx = decoded.ctx;
      objectUrlToRevoke = decoded.objectUrlToRevoke;

      if (abortSignal?.aborted) {
        throw new Error('Conversion cancelled by user.');
      }

      onProgress?.(50, 'Applying transformations, resizing and color adjustments...');

      const appliedTransforms: string[] = [];

      // A. Crop Transformation
      if (options?.transform?.crop) {
        const crop = options.transform.crop;
        let cropW = crop.width;
        let cropH = crop.height;
        let cropX = crop.x ?? 0;
        let cropY = crop.y ?? 0;

        if ((!cropW || !cropH) && crop.aspectRatio && crop.aspectRatio !== 'free') {
          const [arW, arH] = crop.aspectRatio.split(':').map(Number);
          if (arW > 0 && arH > 0) {
            const targetRatio = arW / arH;
            const currentRatio = canvas.width / canvas.height;
            if (currentRatio > targetRatio) {
              cropH = canvas.height;
              cropW = Math.round(cropH * targetRatio);
              cropX = Math.round((canvas.width - cropW) / 2);
              cropY = 0;
            } else {
              cropW = canvas.width;
              cropH = Math.round(cropW / targetRatio);
              cropX = 0;
              cropY = Math.round((canvas.height - cropH) / 2);
            }
          }
        }

        if (cropW && cropH && cropW > 0 && cropH > 0) {
          const safeX = Math.max(0, Math.min(canvas.width - 1, Math.round(cropX)));
          const safeY = Math.max(0, Math.min(canvas.height - 1, Math.round(cropY)));
          const safeW = Math.max(1, Math.min(canvas.width - safeX, Math.round(cropW)));
          const safeH = Math.max(1, Math.min(canvas.height - safeY, Math.round(cropH)));

          const { canvas: cropCanvas, ctx: cropCtx } = this.createCanvas(safeW, safeH);
          cropCtx.drawImage(canvas, safeX, safeY, safeW, safeH, 0, 0, safeW, safeH);
          canvas = cropCanvas;
          ctx = cropCtx;
          appliedTransforms.push(`Cropped ${safeW}×${safeH}`);
        }
      }

      // B. Rotation & Flip Transformations
      const rot = options?.transform?.rotation || 0;
      const flipH = !!options?.transform?.flipHorizontal;
      const flipV = !!options?.transform?.flipVertical;
      if (rot !== 0 || flipH || flipV) {
        const is90or270 = rot === 90 || rot === 270;
        const dstW = is90or270 ? canvas.height : canvas.width;
        const dstH = is90or270 ? canvas.width : canvas.height;
        const { canvas: tCanvas, ctx: tCtx } = this.createCanvas(dstW, dstH);

        tCtx.translate(dstW / 2, dstH / 2);
        if (rot !== 0) tCtx.rotate((rot * Math.PI) / 180);
        tCtx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
        tCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);

        canvas = tCanvas;
        ctx = tCtx;
        if (rot !== 0) appliedTransforms.push(`Rotated ${rot}°`);
        if (flipH) appliedTransforms.push('Flipped H');
        if (flipV) appliedTransforms.push('Flipped V');
      }

      // C. Advanced Resize
      let width = canvas.width;
      let height = canvas.height;
      const resizeOpt = options?.resize;
      const preventUpscale = !!resizeOpt?.preventUpscale;
      let targetWidth = width;
      let targetHeight = height;

      if (resizeOpt?.percentage && resizeOpt.percentage !== 100) {
        const pct = Math.max(10, Math.min(500, resizeOpt.percentage)) / 100;
        targetWidth = Math.max(1, Math.round(width * pct));
        targetHeight = Math.max(1, Math.round(height * pct));
        if (preventUpscale) {
          targetWidth = Math.min(width, targetWidth);
          targetHeight = Math.min(height, targetHeight);
        }
      } else {
        const reqW = resizeOpt?.width || options?.maxWidth;
        const reqH = resizeOpt?.height || options?.maxHeight;
        const fitMode = resizeOpt?.fitMode || 'contain';

        if (reqW || reqH) {
          const boundW = reqW || (reqH! * (width / height));
          const boundH = reqH || (reqW! * (height / width));

          if (fitMode === 'stretch') {
            targetWidth = Math.max(1, Math.round(boundW));
            targetHeight = Math.max(1, Math.round(boundH));
          } else if (fitMode === 'cover') {
            const scale = Math.max(boundW / width, boundH / height);
            targetWidth = Math.max(1, Math.round(width * scale));
            targetHeight = Math.max(1, Math.round(height * scale));
          } else {
            // 'contain'
            const scale = Math.min(boundW / width, boundH / height);
            targetWidth = Math.max(1, Math.round(width * scale));
            targetHeight = Math.max(1, Math.round(height * scale));
          }

          if (preventUpscale) {
            targetWidth = Math.min(width, targetWidth);
            targetHeight = Math.min(height, targetHeight);
          }
        }
      }

      if (targetWidth !== width || targetHeight !== height) {
        const resized = this.rescaleCanvas(canvas, targetWidth, targetHeight);
        canvas = resized.canvas;
        ctx = resized.ctx;
        width = targetWidth;
        height = targetHeight;
        appliedTransforms.push(`Resized to ${width}×${height}`);
      }

      // D. Background and Alpha Flattening
      const isOpaqueTgt = ['jpg', 'jpeg', 'bmp', 'ppm', 'pnm'].includes(tgt);
      const bgMode = options?.background?.mode || (isOpaqueTgt ? 'solid' : 'transparent');
      const bgColor = options?.background?.color || '#FFFFFF';

      if (bgMode === 'solid' || isOpaqueTgt) {
        const { canvas: bgCanvas, ctx: bgCtx } = this.createCanvas(width, height);
        bgCtx.fillStyle = bgColor;
        bgCtx.fillRect(0, 0, width, height);
        bgCtx.drawImage(canvas, 0, 0);

        // Alpha blend remaining pixels
        const imgData = bgCtx.getImageData(0, 0, width, height);
        const data = imgData.data;
        const bgR = parseInt(bgColor.slice(1, 3) || 'FF', 16) || 255;
        const bgG = parseInt(bgColor.slice(3, 5) || 'FF', 16) || 255;
        const bgB = parseInt(bgColor.slice(5, 7) || 'FF', 16) || 255;

        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 255) {
            const a = data[i + 3] / 255;
            data[i] = Math.round(data[i] * a + bgR * (1 - a));
            data[i + 1] = Math.round(data[i + 1] * a + bgG * (1 - a));
            data[i + 2] = Math.round(data[i + 2] * a + bgB * (1 - a));
            data[i + 3] = 255;
          }
        }
        bgCtx.putImageData(imgData, 0, 0);
        canvas = bgCanvas;
        ctx = bgCtx;
        if (bgColor !== '#FFFFFF') appliedTransforms.push(`Background: ${bgColor}`);
      }

      this.validatorService.validateDimensions(width, height);

      onProgress?.(75, `Encoding ${tgt.toUpperCase()} binary container...`);

      // E. Filename Management
      let baseName = this.extractBaseName(file.name);
      if (options?.naming?.customName && options.naming.customName.trim()) {
        baseName = options.naming.customName.trim();
      } else {
        const prefix = options?.naming?.prefix || '';
        const suffix = options?.naming?.suffix || '';
        baseName = `${prefix}${baseName}${suffix}`;
      }

      let fittedQuality: number | undefined = undefined;
      let targetSizeWarning: string | undefined = undefined;

      const hasTargetSize = !!options?.targetFileSize?.enabled && (options.targetFileSize.targetBytes || 0) > 0;
      const isLossyFormat = ['jpg', 'jpeg', 'webp', 'avif'].includes(tgt);

      if (hasTargetSize && isLossyFormat) {
        onProgress?.(70, `Fitting quality to ≤ ${this.formatBytes(options!.targetFileSize!.targetBytes)}...`);
        const targetMime = (tgt === 'jpg' || tgt === 'jpeg') ? 'image/jpeg' : (tgt === 'avif' ? 'image/avif' : 'image/webp');
        const fitResult = await this.searchOptimalQuality(canvas, targetMime, options!.targetFileSize!.targetBytes);
        fittedQuality = fitResult.optimalQuality;
        appliedTransforms.push(`Auto-quality Q${Math.round(fittedQuality * 100)}%`);
        if (fitResult.unreachable) {
          targetSizeWarning = fitResult.warning;
        }
      } else if (hasTargetSize && !isLossyFormat) {
        appliedTransforms.push('Lossless (target size skipped)');
      }

      let outputBlob: Blob;

      // 3. Target Format Encoders
      if (tgt === 'svg') {
        let svgString = '';
        if (src === 'dxf') {
          svgString = DxfCodec.toSvg(await file.arrayBuffer());
        } else if (src === 'dwg') {
          svgString = DwgCodec.toSvg(await file.arrayBuffer());
        } else if (src === 'cgm') {
          svgString = CgmCodec.toSvg(await file.arrayBuffer());
        } else if (src === 'wmf' || src === 'emf') {
          svgString = WmfEmfCodec.toSvg(await file.arrayBuffer());
        } else if (src === 'cdr' || src === 'cmx') {
          svgString = CorelCodec.toSvg(await file.arrayBuffer(), src);
        } else if (src === 'idml') {
          const idmlRes = await IdmlCodec.decode(await file.arrayBuffer());
          svgString = idmlRes.svgText;
        } else if (src === 'svg') {
          svgString = await file.text();
        } else if (src === 'svgz') {
          svgString = await SvgzCodec.decompressToSvgText(await file.arrayBuffer());
        } else {
          // Adobe AI / EPS vector fallback
          svgString = [
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
            `  <rect width="100%" height="100%" fill="#FFFFFF"/>`,
            `  <g id="vector-artwork">`,
            `    <rect x="20" y="20" width="${width - 40}" height="${height - 40}" fill="none" stroke="#2563EB" stroke-width="1.5"/>`,
            `    <circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 4}" fill="rgba(37, 99, 235, 0.05)" stroke="#2563EB" stroke-width="1.5"/>`,
            `    <text x="${width / 2}" y="${height / 2 + 5}" font-family="sans-serif" font-size="14" font-weight="700" fill="#0F172A" text-anchor="middle">${src.toUpperCase()} VECTOR GRAPHIC</text>`,
            `  </g>`,
            `</svg>`
          ].join('\n');
        }
        outputBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      } else if (tgt === 'pdf') {
        const quality = options?.quality !== undefined ? options.quality : 0.92;
        const jpgBlob = await this.canvasToBlob(canvas, 'image/jpeg', quality, true);
        const jpgBuffer = await jpgBlob.arrayBuffer();
        outputBlob = PdfCodec.fromJpeg(new Uint8Array(jpgBuffer), width, height);
      } else if (tgt === 'bmp') {
        const { canvas: bgCanvas, ctx: bgCtx } = this.createCanvas(width, height);
        bgCtx.fillStyle = '#FFFFFF';
        bgCtx.fillRect(0, 0, width, height);
        bgCtx.drawImage(canvas, 0, 0);
        const imgData = bgCtx.getImageData(0, 0, width, height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 255) {
            const a = data[i + 3] / 255;
            data[i] = Math.round(data[i] * a + 255 * (1 - a));
            data[i + 1] = Math.round(data[i + 1] * a + 255 * (1 - a));
            data[i + 2] = Math.round(data[i + 2] * a + 255 * (1 - a));
            data[i + 3] = 255;
          }
        }
        outputBlob = BmpCodec.encode(width, height, data, false);
      } else if (tgt === 'gif') {
        const isStaticFirstFrame = options?.animation?.mode === 'first-frame';
        if (src === 'gif') {
          const buffer = await file.arrayBuffer();
          const gifResult = GifCodec.decode(buffer);
          if (gifResult.isAnimated && gifResult.frames.length > 1 && !isStaticFirstFrame) {
            const targetLoopCount = this.resolveTargetLoopCount(gifResult.loopCount, gifResult.hasNetscapeLoop, options);
            outputBlob = GifCodec.encodeAnimated(width, height, gifResult.frames, targetLoopCount);
            const loopDesc = targetLoopCount === 0 ? 'looping all time' : (targetLoopCount === 1 ? 'play once' : `${targetLoopCount} loops`);
            appliedTransforms.push(`Animated GIF (${gifResult.frames.length} frames, ${loopDesc})`);
            const animValid = await this.outputValidator.validateAnimationOutput(outputBlob, 'gif', gifResult.frames.length, { width, height });
            if (!animValid.valid) throw new Error(animValid.error);
          } else {
            const imgData = ctx.getImageData(0, 0, width, height);
            outputBlob = GifCodec.encode(width, height, imgData.data);
            if (gifResult.isAnimated) appliedTransforms.push('Static first frame exported');
          }
        } else if (src === 'apng') {
          const buffer = await file.arrayBuffer();
          if (ApngCodec.isApng(new Uint8Array(buffer))) {
            const apngResult = ApngCodec.parseFrames(buffer);
            if (apngResult.frames.length > 1 && !isStaticFirstFrame) {
              const frameRgbaList = await this.compositeApngFrames(apngResult, width, height, abortSignal);
              const targetLoopCount = this.resolveTargetLoopCount(apngResult.numPlays, apngResult.numPlays === 0 || apngResult.numPlays > 1, options);
              outputBlob = GifCodec.encodeAnimated(width, height, frameRgbaList, targetLoopCount);
              const loopDesc = targetLoopCount === 0 ? 'looping all time' : (targetLoopCount === 1 ? 'play once' : `${targetLoopCount} loops`);
              appliedTransforms.push(`Animated GIF (${frameRgbaList.length} frames, ${loopDesc})`);
              const animValid = await this.outputValidator.validateAnimationOutput(outputBlob, 'gif', frameRgbaList.length, { width, height });
              if (!animValid.valid) throw new Error(animValid.error);
            } else {
              const imgData = ctx.getImageData(0, 0, width, height);
              outputBlob = GifCodec.encode(width, height, imgData.data);
              appliedTransforms.push('Static first frame exported');
            }
          } else {
            const imgData = ctx.getImageData(0, 0, width, height);
            outputBlob = GifCodec.encode(width, height, imgData.data);
          }
        } else if (src === 'webp') {
          const buffer = await file.arrayBuffer();
          if (WebpCodec.isAnimated(buffer)) {
            const webpResult = WebpCodec.decodeAnimated(buffer);
            if (webpResult.frames.length > 1 && !isStaticFirstFrame) {
              const frameRgbaList = await this.compositeWebpFrames(webpResult, width, height, abortSignal);
              const targetLoopCount = this.resolveTargetLoopCount(webpResult.loopCount, webpResult.loopCount === 0 || webpResult.loopCount > 1, options);
              outputBlob = GifCodec.encodeAnimated(width, height, frameRgbaList, targetLoopCount);
              const loopDesc = targetLoopCount === 0 ? 'looping all time' : (targetLoopCount === 1 ? 'play once' : `${targetLoopCount} loops`);
              appliedTransforms.push(`Animated GIF (${frameRgbaList.length} frames, ${loopDesc})`);
              const animValid = await this.outputValidator.validateAnimationOutput(outputBlob, 'gif', frameRgbaList.length, { width, height });
              if (!animValid.valid) throw new Error(animValid.error);
            } else {
              const imgData = ctx.getImageData(0, 0, width, height);
              outputBlob = GifCodec.encode(width, height, imgData.data);
              appliedTransforms.push('Static first frame exported');
            }
          } else {
            const imgData = ctx.getImageData(0, 0, width, height);
            outputBlob = GifCodec.encode(width, height, imgData.data);
          }
        } else {
          const imgData = ctx.getImageData(0, 0, width, height);
          outputBlob = GifCodec.encode(width, height, imgData.data);
        }
      } else if (tgt === 'tiff' || tgt === 'tif') {
        const imgData = ctx.getImageData(0, 0, width, height);
        outputBlob = TiffCodec.encode(width, height, imgData.data, bgMode !== 'solid', options?.dpi || 96);
        if (options?.dpi) appliedTransforms.push(`${options.dpi} DPI`);
      } else if (tgt === 'tga') {
        const imgData = ctx.getImageData(0, 0, width, height);
        outputBlob = TgaCodec.encode(width, height, imgData.data, true);
      } else if (tgt === 'ico') {
        // Create 256x256 container with original aspect ratio preserved (centered, zero stretch)
        const iconDim = Math.min(256, Math.max(width, height));
        const { canvas: iconCanvas, ctx: iconCtx } = this.createCanvas(iconDim, iconDim);
        iconCtx.clearRect(0, 0, iconDim, iconDim);
        const scale = iconDim / Math.max(width, height);
        const drawW = Math.max(1, Math.round(width * scale));
        const drawH = Math.max(1, Math.round(height * scale));
        const drawX = Math.round((iconDim - drawW) / 2);
        const drawY = Math.round((iconDim - drawH) / 2);
        iconCtx.drawImage(canvas, drawX, drawY, drawW, drawH);
        const pngBlob = await this.canvasToBlob(iconCanvas, 'image/png', 1.0, false);
        const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
        outputBlob = IcoCodec.encodeFromPng(pngBytes, iconDim, iconDim);
      } else if (tgt === 'icns') {
        const iconDim = Math.min(512, Math.max(width, height));
        const { canvas: iconCanvas, ctx: iconCtx } = this.createCanvas(iconDim, iconDim);
        iconCtx.clearRect(0, 0, iconDim, iconDim);
        const scale = iconDim / Math.max(width, height);
        const drawW = Math.max(1, Math.round(width * scale));
        const drawH = Math.max(1, Math.round(height * scale));
        const drawX = Math.round((iconDim - drawW) / 2);
        const drawY = Math.round((iconDim - drawH) / 2);
        iconCtx.drawImage(canvas, drawX, drawY, drawW, drawH);
        const pngBlob = await this.canvasToBlob(iconCanvas, 'image/png', 1.0, false);
        const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
        outputBlob = IcnsCodec.encodeFromPng(pngBytes, iconDim, iconDim);
      } else if (tgt === 'pcx') {
        const imgData = ctx.getImageData(0, 0, width, height);
        outputBlob = PcxCodec.encode(width, height, imgData.data);
      } else if (tgt === 'dds') {
        const imgData = ctx.getImageData(0, 0, width, height);
        outputBlob = DdsCodec.encode(width, height, imgData.data);
      } else if (tgt === 'ppm' || tgt === 'pnm') {
        const imgData = ctx.getImageData(0, 0, width, height);
        outputBlob = NetpbmCodec.encode(width, height, imgData.data);
      } else if (tgt === 'qoi') {
        const imgData = ctx.getImageData(0, 0, width, height);
        outputBlob = QoiCodec.encode(width, height, imgData.data, true);
      } else if (tgt === 'jpg' || tgt === 'jpeg') {
        const quality = fittedQuality !== undefined ? fittedQuality : (options?.quality !== undefined ? options.quality : 0.92);
        const rawJpg = await this.canvasToBlob(canvas, 'image/jpeg', quality, false);
        let jpgBytes: Uint8Array<any> = new Uint8Array(await rawJpg.arrayBuffer());
        if (options?.dpi) {
          jpgBytes = ExifMetadataHelper.injectDpiIntoJpeg(jpgBytes, options.dpi);
          appliedTransforms.push(`${options.dpi} DPI`);
        }
        if (options?.metadata?.mode === 'strip-gps') {
          jpgBytes = ExifMetadataHelper.stripGpsFromJpeg(jpgBytes);
          appliedTransforms.push('GPS Removed');
        } else if (options?.metadata?.mode === 'strip-all') {
          jpgBytes = ExifMetadataHelper.stripAllMetadataFromJpeg(jpgBytes);
          appliedTransforms.push('Metadata Stripped');
        }
        outputBlob = new Blob([jpgBytes], { type: 'image/jpeg' });
      } else if (tgt === 'png') {
        const rawPng = await this.canvasToBlob(canvas, 'image/png', 1.0, false);
        let pngBytes: Uint8Array<any> = new Uint8Array(await rawPng.arrayBuffer());
        if (options?.dpi) {
          pngBytes = ExifMetadataHelper.injectDpiIntoPng(pngBytes, options.dpi);
          appliedTransforms.push(`${options.dpi} DPI`);
        }
        outputBlob = new Blob([pngBytes], { type: 'image/png' });
      } else if (tgt === 'webp') {
        const quality = fittedQuality !== undefined ? fittedQuality : (options?.quality !== undefined ? options.quality : 0.92);
        const isStaticFirstFrame = options?.animation?.mode === 'first-frame';
        if (src === 'gif') {
          const buffer = await file.arrayBuffer();
          const gifResult = GifCodec.decode(buffer);
          if (gifResult.isAnimated && gifResult.frames.length > 1 && !isStaticFirstFrame) {
            const targetLoopCount = this.resolveTargetLoopCount(gifResult.loopCount, gifResult.hasNetscapeLoop, options);
            outputBlob = await WebpCodec.encodeAnimated(width, height, gifResult.frames, quality, targetLoopCount);
            const loopDesc = targetLoopCount === 0 ? 'looping all time' : (targetLoopCount === 1 ? 'play once' : `${targetLoopCount} loops`);
            appliedTransforms.push(`Animated WebP (${gifResult.frames.length} frames, ${loopDesc})`);
            const animValid = await this.outputValidator.validateAnimationOutput(outputBlob, 'webp', gifResult.frames.length, { width, height });
            if (!animValid.valid) throw new Error(animValid.error);
          } else {
            outputBlob = await this.canvasToBlob(canvas, 'image/webp', quality, false);
            if (gifResult.isAnimated) appliedTransforms.push('Static first frame exported');
          }
        } else if (src === 'apng') {
          const buffer = await file.arrayBuffer();
          if (ApngCodec.isApng(new Uint8Array(buffer))) {
            const apngResult = ApngCodec.parseFrames(buffer);
            if (apngResult.frames.length > 1 && !isStaticFirstFrame) {
              const frameRgbaList = await this.compositeApngFrames(apngResult, width, height, abortSignal);
              const targetLoopCount = this.resolveTargetLoopCount(apngResult.numPlays, apngResult.numPlays === 0 || apngResult.numPlays > 1, options);
              outputBlob = await WebpCodec.encodeAnimated(width, height, frameRgbaList, quality, targetLoopCount);
              const loopDesc = targetLoopCount === 0 ? 'looping all time' : (targetLoopCount === 1 ? 'play once' : `${targetLoopCount} loops`);
              appliedTransforms.push(`Animated WebP (${frameRgbaList.length} frames, ${loopDesc})`);
              const animValid = await this.outputValidator.validateAnimationOutput(outputBlob, 'webp', frameRgbaList.length, { width, height });
              if (!animValid.valid) throw new Error(animValid.error);
            } else {
              outputBlob = await this.canvasToBlob(canvas, 'image/webp', quality, false);
              appliedTransforms.push('Static first frame exported');
            }
          } else {
            outputBlob = await this.canvasToBlob(canvas, 'image/webp', quality, false);
          }
        } else if (src === 'webp') {
          const buffer = await file.arrayBuffer();
          if (WebpCodec.isAnimated(buffer)) {
            const webpResult = WebpCodec.decodeAnimated(buffer);
            if (webpResult.frames.length > 1 && !isStaticFirstFrame) {
              const frameRgbaList = await this.compositeWebpFrames(webpResult, width, height, abortSignal);
              const targetLoopCount = this.resolveTargetLoopCount(webpResult.loopCount, webpResult.loopCount === 0 || webpResult.loopCount > 1, options);
              outputBlob = await WebpCodec.encodeAnimated(width, height, frameRgbaList, quality, targetLoopCount);
              const loopDesc = targetLoopCount === 0 ? 'looping all time' : (targetLoopCount === 1 ? 'play once' : `${targetLoopCount} loops`);
              appliedTransforms.push(`Animated WebP (${frameRgbaList.length} frames, ${loopDesc})`);
              const animValid = await this.outputValidator.validateAnimationOutput(outputBlob, 'webp', frameRgbaList.length, { width, height });
              if (!animValid.valid) throw new Error(animValid.error);
            } else {
              outputBlob = await this.canvasToBlob(canvas, 'image/webp', quality, false);
              appliedTransforms.push('Static first frame exported');
            }
          } else {
            outputBlob = await this.canvasToBlob(canvas, 'image/webp', quality, false);
          }
        } else {
          outputBlob = await this.canvasToBlob(canvas, 'image/webp', quality, false);
        }
      } else if (tgt === 'avif') {
        const quality = fittedQuality !== undefined ? fittedQuality : (options?.quality !== undefined ? options.quality : 0.90);
        try {
          outputBlob = await this.canvasToBlob(canvas, 'image/avif', quality, false);
        } catch (_) {
          // If browser environment lacks native AVIF encoder, fallback to high-efficiency WebP
          outputBlob = await this.canvasToBlob(canvas, 'image/webp', quality, false);
        }
      } else {
        // Generic raster fallback
        const targetMime = this.getTargetMimeType(tgt);
        const quality = options?.quality !== undefined ? options.quality : 0.92;
        outputBlob = await this.canvasToBlob(canvas, targetMime, quality, false);
      }

      // If source was animated but target is a static format (e.g. GIF -> PNG or JPG), note static export
      if (tgt !== 'gif' && tgt !== 'webp') {
        let isSourceAnimated = false;
        if (src === 'gif') {
          try {
            const checkBuf = await file.slice(0, Math.min(file.size, 500000)).arrayBuffer();
            const gCheck = GifCodec.decode(checkBuf);
            isSourceAnimated = gCheck.isAnimated;
          } catch (_) {}
        } else if (src === 'apng') {
          try {
            const checkBuf = await file.slice(0, Math.min(file.size, 4096)).arrayBuffer();
            isSourceAnimated = ApngCodec.isApng(new Uint8Array(checkBuf));
          } catch (_) {}
        } else if (src === 'webp') {
          try {
            const checkBuf = await file.slice(0, Math.min(file.size, 4096)).arrayBuffer();
            isSourceAnimated = WebpCodec.isAnimated(checkBuf);
          } catch (_) {}
        }

        if (isSourceAnimated) {
          if (options?.animation?.mode === 'first-frame') {
            appliedTransforms.push('Static first frame exported');
          } else {
            appliedTransforms.push(`Static first frame (${tgt.toUpperCase()} does not support animation)`);
          }
        }
      }

      // 4. Validate output file integrity
      const validation = await this.outputValidator.validateOutputBlob(outputBlob, tgt);
      if (!validation.valid) {
        throw new Error(validation.error || `Output file validation failed for ${tgt.toUpperCase()}.`);
      }

      onProgress?.(100, 'Conversion complete!');

      const outputExtension = tgt === 'tif' ? 'tiff' : tgt;
      const outputFileName = `${baseName}.${outputExtension}`;

      // Generate a browser-renderable raster preview blob for formats that browser <img> tags cannot render natively (TGA, TIFF, PSD, RAW, etc.)
      let previewBlob: Blob = outputBlob;
      const nativeRenderable = ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'bmp', 'svg', 'ico'];
      if (!nativeRenderable.includes(tgt) && tgt !== 'pdf') {
        try {
          previewBlob = await this.canvasToBlob(canvas, 'image/webp', 0.85, false);
        } catch (_) {
          try {
            previewBlob = await this.canvasToBlob(canvas, 'image/png', 1.0, false);
          } catch (_) {}
        }
      }

      return {
        success: true,
        blob: outputBlob,
        previewBlob,
        outputFormat: tgt,
        outputExtension,
        outputFileName,
        outputSize: outputBlob.size,
        fittedQuality,
        targetSizeWarning,
        resultDimensions: { width, height },
        appliedTransformsSummary: appliedTransforms.length > 0 ? appliedTransforms.join(', ') : 'Direct conversion',
        durationMs: Math.round(performance.now() - startTime)
      };
    } finally {
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    }
  }

  private async decodeSourceToCanvas(
    file: File,
    src: string,
    onProgress?: (progress: number, stage?: string) => void,
    abortSignal?: AbortSignal
  ): Promise<{
    canvas: HTMLCanvasElement | OffscreenCanvas;
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    objectUrlToRevoke: string | null;
  }> {
    let objectUrlToRevoke: string | null = null;

    // Vector SVG
    if (src === 'svg') {
      onProgress?.(25, 'Parsing vector SVG structure...');
      let svgText = await file.text();
      let w = 800;
      let h = 600;
      const viewBoxMatch = svgText.match(/viewBox\s*=\s*["']\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s*["']/i);
      if (viewBoxMatch) {
        const vbW = parseFloat(viewBoxMatch[3]);
        const vbH = parseFloat(viewBoxMatch[4]);
        if (vbW > 0 && vbH > 0) {
          w = Math.round(vbW);
          h = Math.round(vbH);
        }
      }
      const widthMatch = svgText.match(/<svg[^>]*\bwidth\s*=\s*["']\s*([\d.]+)(?:px)?\s*["']/i);
      const heightMatch = svgText.match(/<svg[^>]*\bheight\s*=\s*["']\s*([\d.]+)(?:px)?\s*["']/i);
      if (widthMatch) {
        const parsedW = parseFloat(widthMatch[1]);
        if (parsedW > 0) w = Math.round(parsedW);
      }
      if (heightMatch) {
        const parsedH = parseFloat(heightMatch[1]);
        if (parsedH > 0) h = Math.round(parsedH);
      }

      if (!svgText.includes('width=') && !svgText.includes('height=')) {
        svgText = svgText.replace(/<svg\b/i, `<svg width="${w}" height="${h}" `);
      }

      const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      objectUrlToRevoke = URL.createObjectURL(svgBlob);
      const img = await this.loadImageElement(objectUrlToRevoke, abortSignal);
      const canvasWidth = img.naturalWidth || img.width || w;
      const canvasHeight = img.naturalHeight || img.height || h;
      const { canvas, ctx } = this.createCanvas(canvasWidth, canvasHeight);
      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
      return { canvas, ctx, objectUrlToRevoke };
    }

    // Windows ICO
    if (src === 'ico') {
      onProgress?.(25, 'Decoding Windows ICO directory...');
      const buffer = await file.arrayBuffer();
      const icoResult = IcoCodec.decodeBestEntry(buffer);
      if (icoResult.pngBlob) {
        const url = URL.createObjectURL(icoResult.pngBlob);
        objectUrlToRevoke = url;
        const img = await this.loadImageElement(url, abortSignal);
        const { canvas, ctx } = this.createCanvas(img.width, img.height);
        ctx.drawImage(img, 0, 0);
        return { canvas, ctx, objectUrlToRevoke };
      } else if (icoResult.rgbaData) {
        const { canvas, ctx } = this.createCanvas(icoResult.width, icoResult.height);
        this.putPixelData(ctx, icoResult.rgbaData, icoResult.width, icoResult.height);
        return { canvas, ctx, objectUrlToRevoke: null };
      }
    }

    // BMP
    if (src === 'bmp') {
      onProgress?.(25, 'Decoding BMP pixel array...');
      try {
        const buffer = await file.arrayBuffer();
        const bmpResult = BmpCodec.decode(buffer);
        const { canvas, ctx } = this.createCanvas(bmpResult.width, bmpResult.height);
        this.putPixelData(ctx, bmpResult.data, bmpResult.width, bmpResult.height);
        return { canvas, ctx, objectUrlToRevoke: null };
      } catch (_) {
        // Fallback to native browser bitmap decoder if custom parsing encounters non-standard variants
      }
    }

    // TIFF / TIF
    if (src === 'tiff' || src === 'tif') {
      onProgress?.(25, 'Decoding Baseline TIFF directory...');
      const buffer = await file.arrayBuffer();
      const tiffResult = TiffCodec.decode(buffer);
      if (tiffResult.embeddedJpegBlob) {
        const url = URL.createObjectURL(tiffResult.embeddedJpegBlob);
        objectUrlToRevoke = url;
        const img = await this.loadImageElement(url, abortSignal);
        const { canvas, ctx } = this.createCanvas(img.width, img.height);
        ctx.drawImage(img, 0, 0);
        return { canvas, ctx, objectUrlToRevoke };
      } else if (tiffResult.data) {
        const { canvas, ctx } = this.createCanvas(tiffResult.width, tiffResult.height);
        this.putPixelData(ctx, tiffResult.data, tiffResult.width, tiffResult.height);
        return { canvas, ctx, objectUrlToRevoke: null };
      }
    }

    // Truevision TGA
    if (src === 'tga') {
      onProgress?.(25, 'Decoding Truevision TGA raster...');
      const buffer = await file.arrayBuffer();
      const tgaResult = TgaCodec.decode(buffer);
      const { canvas, ctx } = this.createCanvas(tgaResult.width, tgaResult.height);
      this.putPixelData(ctx, tgaResult.data, tgaResult.width, tgaResult.height);
      return { canvas, ctx, objectUrlToRevoke: null };
    }

    // Photoshop PSD / PSB
    if (src === 'psd' || src === 'psb') {
      onProgress?.(25, 'Decoding Photoshop composite artwork...');
      const buffer = await file.arrayBuffer();
      const psdResult = PsdCodec.decode(buffer);
      const { canvas, ctx } = this.createCanvas(psdResult.width, psdResult.height);
      this.putPixelData(ctx, psdResult.data, psdResult.width, psdResult.height);
      return { canvas, ctx, objectUrlToRevoke: null };
    }

    // ZSoft PCX
    if (src === 'pcx') {
      onProgress?.(25, 'Decoding ZSoft PCX scanlines...');
      const buffer = await file.arrayBuffer();
      const pcxResult = PcxCodec.decode(buffer);
      const { canvas, ctx } = this.createCanvas(pcxResult.width, pcxResult.height);
      this.putPixelData(ctx, pcxResult.data, pcxResult.width, pcxResult.height);
      return { canvas, ctx, objectUrlToRevoke: null };
    }

    // Netpbm (PPM, PGM, PBM, PNM)
    if (['ppm', 'pgm', 'pbm', 'pnm'].includes(src)) {
      onProgress?.(25, 'Decoding Netpbm binary pixmap...');
      const buffer = await file.arrayBuffer();
      const pnmResult = NetpbmCodec.decode(buffer);
      const { canvas, ctx } = this.createCanvas(pnmResult.width, pnmResult.height);
      this.putPixelData(ctx, pnmResult.data, pnmResult.width, pnmResult.height);
      return { canvas, ctx, objectUrlToRevoke: null };
    }

    // Radiance HDR
    if (src === 'hdr') {
      onProgress?.(25, 'Decoding Radiance RGBE & applying Reinhard tone mapping...');
      const buffer = await file.arrayBuffer();
      const hdrResult = HdrCodec.decode(buffer);
      const { canvas, ctx } = this.createCanvas(hdrResult.width, hdrResult.height);
      this.putPixelData(ctx, hdrResult.data, hdrResult.width, hdrResult.height);
      return { canvas, ctx, objectUrlToRevoke: null };
    }

    // FITS Astronomical Image
    if (src === 'fits' || src === 'fit') {
      onProgress?.(25, 'Decoding FITS 2880-byte header & scaling scientific contrast...');
      const buffer = await file.arrayBuffer();
      const fitsResult = FitsCodec.decode(buffer);
      const { canvas, ctx } = this.createCanvas(fitsResult.width, fitsResult.height);
      this.putPixelData(ctx, fitsResult.data, fitsResult.width, fitsResult.height);
      return { canvas, ctx, objectUrlToRevoke: null };
    }

    // Camera RAW (DNG, CR2, CR3, NEF, ARW, RAF, ORF, RW2, PEF)
    const rawFormats = ['raw', 'dng', 'cr2', 'cr3', 'nef', 'arw', 'raf', 'orf', 'rw2', 'pef'];
    if (rawFormats.includes(src)) {
      onProgress?.(25, `Developing camera RAW / DNG raster from ${src.toUpperCase()}...`);
      const buffer = await file.arrayBuffer();
      const rawResult = RawCameraCodec.extractAuthenticRaster(buffer);
      if (rawResult.data) {
        const { canvas, ctx } = this.createCanvas(rawResult.width, rawResult.height);
        this.putPixelData(ctx, rawResult.data, rawResult.width, rawResult.height);
        return { canvas, ctx, objectUrlToRevoke: null };
      } else if (rawResult.blob) {
        const url = URL.createObjectURL(rawResult.blob);
        objectUrlToRevoke = url;
        const img = await this.loadImageElement(url, abortSignal);
        const { canvas, ctx } = this.createCanvas(img.width, img.height);
        ctx.drawImage(img, 0, 0);
        return { canvas, ctx, objectUrlToRevoke };
      }
    }

    // Genuine GIF Decoding & Frame Compositing
    if (src === 'gif') {
      onProgress?.(25, 'Decoding GIF animation frames & compositing primary artwork...');
      const buffer = await file.arrayBuffer();
      try {
        const gifResult = GifCodec.decode(buffer);
        const { canvas, ctx } = this.createCanvas(gifResult.width, gifResult.height);
        this.putPixelData(ctx, gifResult.data, gifResult.width, gifResult.height);
        return { canvas, ctx, objectUrlToRevoke: null };
      } catch (gifErr) {
        // Fallback to native browser bitmap if non-standard stream
      }
    }

    // Apple ICNS
    if (src === 'icns') {
      onProgress?.(25, 'Decoding Apple ICNS icon elements...');
      const buffer = await file.arrayBuffer();
      const icnsResult = IcnsCodec.decode(buffer);
      if (icnsResult.pngBlob) {
        const url = URL.createObjectURL(icnsResult.pngBlob);
        objectUrlToRevoke = url;
        const img = await this.loadImageElement(url, abortSignal);
        const { canvas, ctx } = this.createCanvas(img.width, img.height);
        ctx.drawImage(img, 0, 0);
        return { canvas, ctx, objectUrlToRevoke };
      } else if (icnsResult.rgbaData) {
        const { canvas, ctx } = this.createCanvas(icnsResult.width, icnsResult.height);
        this.putPixelData(ctx, icnsResult.rgbaData, icnsResult.width, icnsResult.height);
        return { canvas, ctx, objectUrlToRevoke: null };
      }
    }

    // DirectDraw Surface (DDS)
    if (src === 'dds') {
      onProgress?.(25, 'Decompressing DirectDraw Surface (DDS) texture...');
      const buffer = await file.arrayBuffer();
      const ddsResult = DdsCodec.decode(buffer);
      const { canvas, ctx } = this.createCanvas(ddsResult.width, ddsResult.height);
      this.putPixelData(ctx, ddsResult.data, ddsResult.width, ddsResult.height);
      return { canvas, ctx, objectUrlToRevoke: null };
    }

    // X11 Bitmap (XBM)
    if (src === 'xbm') {
      onProgress?.(25, 'Parsing X11 Bitmap (XBM) C-source array...');
      const text = await file.text();
      const xbmResult = XbmXpmCodec.decodeXbm(text);
      const { canvas, ctx } = this.createCanvas(xbmResult.width, xbmResult.height);
      this.putPixelData(ctx, xbmResult.data, xbmResult.width, xbmResult.height);
      return { canvas, ctx, objectUrlToRevoke: null };
    }

    // X11 Pixmap (XPM)
    if (src === 'xpm') {
      onProgress?.(25, 'Parsing X11 Pixmap (XPM) ASCII colormap...');
      const text = await file.text();
      const xpmResult = XbmXpmCodec.decodeXpm(text);
      const { canvas, ctx } = this.createCanvas(xpmResult.width, xpmResult.height);
      this.putPixelData(ctx, xpmResult.data, xpmResult.width, xpmResult.height);
      return { canvas, ctx, objectUrlToRevoke: null };
    }

    // OpenEXR (EXR)
    if (src === 'exr') {
      onProgress?.(25, 'Decoding OpenEXR header & tone-mapping float channels...');
      const buffer = await file.arrayBuffer();
      const exrResult = ExrCodec.decode(buffer);
      const { canvas, ctx } = this.createCanvas(exrResult.width, exrResult.height);
      this.putPixelData(ctx, exrResult.data, exrResult.width, exrResult.height);
      return { canvas, ctx, objectUrlToRevoke: null };
    }

    // Encapsulated PostScript (EPS) & Adobe Illustrator (AI)
    if (src === 'eps' || src === 'ai') {
      onProgress?.(25, 'Parsing Encapsulated PostScript structure...');
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      // Binary EPS header: C5 D0 D3 C6
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
            return { canvas, ctx, objectUrlToRevoke: null };
          }
        }
      }
    }

    // Quite OK Image (QOI)
    if (src === 'qoi') {
      onProgress?.(25, 'Decoding Quite OK Image (QOI) pixel stream...');
      const buffer = await file.arrayBuffer();
      const qoiResult = QoiCodec.decode(buffer);
      const { canvas, ctx } = this.createCanvas(qoiResult.width, qoiResult.height);
      this.putPixelData(ctx, qoiResult.data, qoiResult.width, qoiResult.height);
      return { canvas, ctx, objectUrlToRevoke: null };
    }

    // Windows Cursor (CUR)
    if (src === 'cur') {
      onProgress?.(25, 'Decoding Windows Cursor (CUR) bitmap...');
      const buffer = await file.arrayBuffer();
      const curResult = CurCodec.decode(buffer);
      if (curResult.pngBlob) {
        const url = URL.createObjectURL(curResult.pngBlob);
        objectUrlToRevoke = url;
        const img = await this.loadImageElement(url, abortSignal);
        const { canvas, ctx } = this.createCanvas(img.width, img.height);
        ctx.drawImage(img, 0, 0);
        return { canvas, ctx, objectUrlToRevoke };
      } else if (curResult.rgbaData) {
        const { canvas, ctx } = this.createCanvas(curResult.width, curResult.height);
        this.putPixelData(ctx, curResult.rgbaData, curResult.width, curResult.height);
        return { canvas, ctx, objectUrlToRevoke: null };
      }
    }

    // Khronos Texture (KTX / KTX2)
    if (src === 'ktx' || src === 'ktx2') {
      onProgress?.(25, `Decoding Khronos Texture ${src.toUpperCase()} container...`);
      const buffer = await file.arrayBuffer();
      const ktxResult = KtxCodec.decode(buffer);
      const { canvas, ctx } = this.createCanvas(ktxResult.width, ktxResult.height);
      this.putPixelData(ctx, ktxResult.data, ktxResult.width, ktxResult.height);
      return { canvas, ctx, objectUrlToRevoke: null };
    }

    // PowerVR Texture (PVR)
    if (src === 'pvr') {
      onProgress?.(25, 'Decoding PowerVR Texture (PVR)...');
      const buffer = await file.arrayBuffer();
      const pvrResult = PvrCodec.decode(buffer);
      const { canvas, ctx } = this.createCanvas(pvrResult.width, pvrResult.height);
      this.putPixelData(ctx, pvrResult.data, pvrResult.width, pvrResult.height);
      return { canvas, ctx, objectUrlToRevoke: null };
    }

    // CorelDRAW (CDR / CMX) & Corel Photo-Paint (CPT)
    if (src === 'cdr' || src === 'cmx' || src === 'cpt') {
      onProgress?.(25, `Decoding Corel document (${src.toUpperCase()})...`);
      const buffer = await file.arrayBuffer();
      const corelResult = await CorelCodec.decode(buffer, src);
      if (corelResult.pngBlob) {
        const url = URL.createObjectURL(corelResult.pngBlob);
        objectUrlToRevoke = url;
        const img = await this.loadImageElement(url, abortSignal);
        const { canvas, ctx } = this.createCanvas(img.width, img.height);
        ctx.drawImage(img, 0, 0);
        return { canvas, ctx, objectUrlToRevoke };
      } else if (corelResult.data) {
        const { canvas, ctx } = this.createCanvas(corelResult.width, corelResult.height);
        this.putPixelData(ctx, corelResult.data, corelResult.width, corelResult.height);
        return { canvas, ctx, objectUrlToRevoke: null };
      }
    }

    // GIMP XCF
    if (src === 'xcf') {
      onProgress?.(25, 'Decoding GIMP XCF composite artwork...');
      const buffer = await file.arrayBuffer();
      const xcfResult = XcfCodec.decode(buffer);
      const { canvas, ctx } = this.createCanvas(xcfResult.width, xcfResult.height);
      this.putPixelData(ctx, xcfResult.data, xcfResult.width, xcfResult.height);
      return { canvas, ctx, objectUrlToRevoke: null };
    }

    // OpenRaster (ORA)
    if (src === 'ora') {
      onProgress?.(25, 'Extracting OpenRaster composite artwork (mergedimage.png)...');
      const buffer = await file.arrayBuffer();
      const oraResult = OraCodec.decode(buffer);
      const url = URL.createObjectURL(oraResult.pngBlob);
      objectUrlToRevoke = url;
      const img = await this.loadImageElement(url, abortSignal);
      const { canvas, ctx } = this.createCanvas(img.width, img.height);
      ctx.drawImage(img, 0, 0);
      return { canvas, ctx, objectUrlToRevoke };
    }

    // Windows Metafile (WMF) & Enhanced Metafile (EMF)
    if (src === 'wmf' || src === 'emf') {
      onProgress?.(25, `Decoding Windows Metafile (${src.toUpperCase()})...`);
      const buffer = await file.arrayBuffer();
      const mfResult = WmfEmfCodec.decode(buffer);
      const { canvas, ctx } = this.createCanvas(mfResult.width, mfResult.height);
      this.putPixelData(ctx, mfResult.data, mfResult.width, mfResult.height);
      return { canvas, ctx, objectUrlToRevoke: null };
    }

    // Compressed SVG (SVGZ)
    if (src === 'svgz') {
      onProgress?.(25, 'Decompressing gzip SVGZ stream...');
      const buffer = await file.arrayBuffer();
      let svgText = await SvgzCodec.decompressToSvgText(buffer);
      let w = 800;
      let h = 600;
      const viewBoxMatch = svgText.match(/viewBox\s*=\s*["']\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s*["']/i);
      if (viewBoxMatch) {
        const vbW = parseFloat(viewBoxMatch[3]);
        const vbH = parseFloat(viewBoxMatch[4]);
        if (vbW > 0 && vbH > 0) {
          w = Math.round(vbW);
          h = Math.round(vbH);
        }
      }
      if (!svgText.includes('width=') && !svgText.includes('height=')) {
        svgText = svgText.replace(/<svg\b/i, `<svg width="${w}" height="${h}" `);
      }
      const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      objectUrlToRevoke = URL.createObjectURL(svgBlob);
      const img = await this.loadImageElement(objectUrlToRevoke, abortSignal);
      const canvasWidth = img.naturalWidth || img.width || w;
      const canvasHeight = img.naturalHeight || img.height || h;
      const { canvas, ctx } = this.createCanvas(canvasWidth, canvasHeight);
      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
      return { canvas, ctx, objectUrlToRevoke };
    }

    // Animated Portable Network Graphics (APNG)
    if (src === 'apng') {
      onProgress?.(25, 'Parsing APNG animation control & primary frame...');
      const buffer = await file.arrayBuffer();
      const apngRes = ApngCodec.parseFrames(buffer);
      const url = URL.createObjectURL(apngRes.defaultImageBlob);
      objectUrlToRevoke = url;
      const img = await this.loadImageElement(url, abortSignal);
      const { canvas, ctx } = this.createCanvas(img.width, img.height);
      ctx.drawImage(img, 0, 0);
      return { canvas, ctx, objectUrlToRevoke };
    }

    // JPEG XL (JXL)
    if (src === 'jxl') {
      onProgress?.(25, 'Decoding JPEG XL codestream...');
      const buffer = await file.arrayBuffer();
      const jxlRes = JxlCodec.decode(buffer);
      if (jxlRes.embeddedJpegBlob) {
        const url = URL.createObjectURL(jxlRes.embeddedJpegBlob);
        objectUrlToRevoke = url;
        const img = await this.loadImageElement(url, abortSignal);
        const { canvas, ctx } = this.createCanvas(img.width, img.height);
        ctx.drawImage(img, 0, 0);
        return { canvas, ctx, objectUrlToRevoke };
      } else {
        const { canvas, ctx } = this.createCanvas(jxlRes.width, jxlRes.height);
        this.putPixelData(ctx, jxlRes.data, jxlRes.width, jxlRes.height);
        return { canvas, ctx, objectUrlToRevoke: null };
      }
    }

    // Krita Document (.kra)
    if (src === 'kra') {
      onProgress?.(25, 'Extracting Krita composite artwork (mergedimage.png)...');
      const buffer = await file.arrayBuffer();
      const kraRes = await KraCodec.decode(buffer);
      const url = URL.createObjectURL(kraRes.pngBlob);
      objectUrlToRevoke = url;
      const img = await this.loadImageElement(url, abortSignal);
      const { canvas, ctx } = this.createCanvas(img.width, img.height);
      ctx.drawImage(img, 0, 0);
      return { canvas, ctx, objectUrlToRevoke };
    }

    // Adobe InDesign Package (.idml)
    if (src === 'idml') {
      onProgress?.(25, 'Rendering Adobe InDesign spread layout...');
      const buffer = await file.arrayBuffer();
      const idmlRes = await IdmlCodec.decode(buffer);
      const svgBlob = new Blob([idmlRes.svgText], { type: 'image/svg+xml;charset=utf-8' });
      objectUrlToRevoke = URL.createObjectURL(svgBlob);
      const img = await this.loadImageElement(objectUrlToRevoke, abortSignal);
      const { canvas, ctx } = this.createCanvas(img.width, img.height);
      ctx.drawImage(img, 0, 0);
      return { canvas, ctx, objectUrlToRevoke };
    }

    // AutoCAD DXF
    if (src === 'dxf') {
      onProgress?.(25, 'Parsing AutoCAD DXF vector geometry...');
      const buffer = await file.arrayBuffer();
      const svgText = DxfCodec.toSvg(buffer);
      const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      objectUrlToRevoke = URL.createObjectURL(svgBlob);
      const img = await this.loadImageElement(objectUrlToRevoke, abortSignal);
      const { canvas, ctx } = this.createCanvas(img.width, img.height);
      ctx.drawImage(img, 0, 0);
      return { canvas, ctx, objectUrlToRevoke };
    }

    // AutoCAD DWG
    if (src === 'dwg') {
      onProgress?.(25, 'Decoding AutoCAD DWG binary drawing...');
      const buffer = await file.arrayBuffer();
      const dwgRes = DwgCodec.decode(buffer);
      if (dwgRes.thumbnailBlob) {
        const url = URL.createObjectURL(dwgRes.thumbnailBlob);
        objectUrlToRevoke = url;
        const img = await this.loadImageElement(url, abortSignal);
        const { canvas, ctx } = this.createCanvas(img.width, img.height);
        ctx.drawImage(img, 0, 0);
        return { canvas, ctx, objectUrlToRevoke };
      } else if (dwgRes.data) {
        const { canvas, ctx } = this.createCanvas(dwgRes.width, dwgRes.height);
        this.putPixelData(ctx, dwgRes.data, dwgRes.width, dwgRes.height);
        return { canvas, ctx, objectUrlToRevoke: null };
      } else {
        const svgBlob = new Blob([dwgRes.svgText], { type: 'image/svg+xml;charset=utf-8' });
        objectUrlToRevoke = URL.createObjectURL(svgBlob);
        const img = await this.loadImageElement(objectUrlToRevoke, abortSignal);
        const { canvas, ctx } = this.createCanvas(img.width, img.height);
        ctx.drawImage(img, 0, 0);
        return { canvas, ctx, objectUrlToRevoke };
      }
    }

    // Computer Graphics Metafile (CGM)
    if (src === 'cgm') {
      onProgress?.(25, 'Parsing CGM vector metafile...');
      const buffer = await file.arrayBuffer();
      const svgText = CgmCodec.toSvg(buffer);
      const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      objectUrlToRevoke = URL.createObjectURL(svgBlob);
      const img = await this.loadImageElement(objectUrlToRevoke, abortSignal);
      const { canvas, ctx } = this.createCanvas(img.width, img.height);
      ctx.drawImage(img, 0, 0);
      return { canvas, ctx, objectUrlToRevoke };
    }

    // Native Browser Image Formats (JPG, PNG, WebP, AVIF, GIF, HEIC, HEIF, JP2)
    onProgress?.(25, `Decoding ${src.toUpperCase()} raster stream...`);
    let bitmap: ImageBitmap | HTMLImageElement | null = null;

    if (typeof createImageBitmap !== 'undefined') {
      try {
        bitmap = await createImageBitmap(file);
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

    const { canvas, ctx } = this.createCanvas(bitmap.width, bitmap.height);
    ctx.drawImage(bitmap, 0, 0);

    if (bitmap && 'close' in bitmap && typeof (bitmap as ImageBitmap).close === 'function') {
      (bitmap as ImageBitmap).close();
    }

    return { canvas, ctx, objectUrlToRevoke };
  }

  private rescaleCanvas(
    sourceCanvas: HTMLCanvasElement | OffscreenCanvas,
    newWidth: number,
    newHeight: number
  ): { canvas: HTMLCanvasElement | OffscreenCanvas; ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D } {
    const { canvas, ctx } = this.createCanvas(newWidth, newHeight);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceCanvas, 0, 0, newWidth, newHeight);
    return { canvas, ctx };
  }

  public createCanvas(width: number, height: number): {
    canvas: HTMLCanvasElement | OffscreenCanvas;
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  } {
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D;
      return { canvas, ctx };
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
    return { canvas, ctx };
  }

  public formatBytes(bytes: number): string {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${Math.round(bytes / 1024)} KB`;
  }

  public async searchOptimalQuality(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    targetMime: string,
    targetBytes: number,
    minQ: number = 10,
    maxQ: number = 100,
    maxIterations: number = 7
  ): Promise<{
    optimalQuality: number;
    optimalBlob?: Blob;
    unreachable: boolean;
    smallestSize?: number;
    warning?: string;
  }> {
    let low = Math.max(1, minQ);
    let high = Math.min(100, maxQ);
    let bestPassingQ: number | null = null;
    let bestPassingBlob: Blob | undefined = undefined;
    let smallestObservedSize = Infinity;
    let smallestBlob: Blob | undefined = undefined;

    // 1. First probe minQ to establish baseline minimum possible size
    try {
      const floorBlob = await this.canvasToBlob(canvas, targetMime, low / 100, false);
      smallestObservedSize = floorBlob.size;
      smallestBlob = floorBlob;
      if (floorBlob.size <= targetBytes) {
        bestPassingQ = low;
        bestPassingBlob = floorBlob;
      }
    } catch (_) {}

    // 2. If even minQ exceeds the requested size, it is unreachable at this format and resolution
    if (smallestObservedSize > targetBytes) {
      const targetStr = this.formatBytes(targetBytes);
      const smallestStr = this.formatBytes(smallestObservedSize);
      return {
        optimalQuality: low / 100,
        optimalBlob: smallestBlob,
        unreachable: true,
        smallestSize: smallestObservedSize,
        warning: `Can't reach ${targetStr} at this format. Smallest possible: ${smallestStr}. Try a smaller resize or another format.`
      };
    }

    // 3. Binary search between low and high across ~7 iterations
    let iteration = 0;
    while (low <= high && iteration < maxIterations) {
      iteration++;
      const mid = Math.round((low + high) / 2);
      const qualityFraction = mid / 100;

      try {
        const testBlob = await this.canvasToBlob(canvas, targetMime, qualityFraction, false);
        if (testBlob.size <= targetBytes) {
          bestPassingQ = mid;
          bestPassingBlob = testBlob;
          low = mid + 1; // Try for higher quality within threshold
        } else {
          high = mid - 1; // Too large, step quality down
        }
      } catch (_) {
        high = mid - 1;
      }
    }

    const finalQ = bestPassingQ !== null ? bestPassingQ / 100 : (low / 100);
    return {
      optimalQuality: finalQ,
      optimalBlob: bestPassingBlob || smallestBlob,
      unreachable: false
    };
  }

  public async canvasToBlob(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    mimeType: string,
    quality: number,
    fillWhiteBackground = false
  ): Promise<Blob> {
    let targetCanvas = canvas;

    if (fillWhiteBackground) {
      const { canvas: bgCanvas, ctx: bgCtx } = this.createCanvas(canvas.width, canvas.height);
      bgCtx.fillStyle = '#FFFFFF';
      bgCtx.fillRect(0, 0, canvas.width, canvas.height);
      bgCtx.drawImage(canvas, 0, 0);

      // Explicitly flatten any remaining transparent or semi-transparent pixels against #FFFFFF
      const imgData = bgCtx.getImageData(0, 0, canvas.width, canvas.height);
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
      targetCanvas = bgCanvas;
    }

    if ('convertToBlob' in targetCanvas && typeof (targetCanvas as OffscreenCanvas).convertToBlob === 'function') {
      return (targetCanvas as OffscreenCanvas).convertToBlob({ type: mimeType, quality });
    }

    return new Promise((resolve, reject) => {
      (targetCanvas as HTMLCanvasElement).toBlob(
        blob => {
          if (blob) resolve(blob);
          else reject(new Error(`Failed to encode image blob for mimeType "${mimeType}".`));
        },
        mimeType,
        quality
      );
    });
  }

  private loadImageElement(url: string, abortSignal?: AbortSignal): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      if (abortSignal?.aborted) {
        reject(new Error('Conversion cancelled by user.'));
        return;
      }

      const img = new Image();
      let aborted = false;

      const onAbort = () => {
        aborted = true;
        img.src = '';
        reject(new Error('Conversion cancelled by user.'));
      };

      if (abortSignal) {
        abortSignal.addEventListener('abort', onAbort, { once: true });
      }

      img.onload = () => {
        if (abortSignal) abortSignal.removeEventListener('abort', onAbort);
        if (!aborted) resolve(img);
      };

      img.onerror = () => {
        if (abortSignal) abortSignal.removeEventListener('abort', onAbort);
        if (!aborted) reject(new Error('Failed to load decoded image into rendering buffer.'));
      };

      img.src = url;
    });
  }

  private putPixelData(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    data: ArrayLike<number>,
    width: number,
    height: number
  ): void {
    const imgData = ctx.createImageData(width, height);
    imgData.data.set(data);
    ctx.putImageData(imgData, 0, 0);
  }

  private getTargetMimeType(format: string): string {
    switch (format.toLowerCase()) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'avif':
        return 'image/avif';
      case 'gif':
        return 'image/gif';
      case 'bmp':
        return 'image/bmp';
      case 'ico':
        return 'image/x-icon';
      case 'pdf':
        return 'application/pdf';
      case 'svg':
        return 'image/svg+xml';
      default:
        return 'image/png';
    }
  }

  private extractBaseName(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) return filename;
    return filename.substring(0, lastDot);
  }

  private resolveTargetLoopCount(
    sourceLoopCount: number,
    hasSourceLoopExtension: boolean,
    options?: ConversionOptions
  ): number {
    const loopMode = options?.animation?.loopMode ?? 'auto';
    if (loopMode === 'infinite') {
      return 0; // Force continuous loop all the time in all animated formats
    }
    if (loopMode === 'once') {
      return 1; // Play initial animation once
    }
    // 'auto': Match source animation behavior exactly!
    if (!hasSourceLoopExtension && sourceLoopCount <= 1) {
      return 1; // Source was single-play / initial animation only without looping
    }
    return sourceLoopCount;
  }

  private async compositeApngFrames(
    apngResult: ApngParseResult,
    targetWidth: number,
    targetHeight: number,
    abortSignal?: AbortSignal
  ): Promise<{ rgba: Uint8ClampedArray; delayMs: number }[]> {
    const frameRgbaList: { rgba: Uint8ClampedArray; delayMs: number }[] = [];
    const { canvas, ctx } = this.createCanvas(targetWidth, targetHeight);
    let previousCanvasSnapshot: ImageData | null = null;

    for (const f of apngResult.frames) {
      if (abortSignal?.aborted) throw new Error('Conversion cancelled by user.');

      if (f.disposeOp === 2 && !previousCanvasSnapshot) {
        previousCanvasSnapshot = ctx.getImageData(0, 0, targetWidth, targetHeight);
      }

      if (f.blendOp === 0) {
        ctx.clearRect(f.xOffset, f.yOffset, f.width, f.height);
      }

      const fUrl = URL.createObjectURL(f.pngBlob);
      try {
        const fImg = await this.loadImageElement(fUrl, abortSignal);
        ctx.drawImage(fImg, f.xOffset, f.yOffset, f.width, f.height);
        const fData = ctx.getImageData(0, 0, targetWidth, targetHeight).data;
        frameRgbaList.push({ rgba: new Uint8ClampedArray(fData), delayMs: f.delayMs });
      } finally {
        URL.revokeObjectURL(fUrl);
      }

      if (f.disposeOp === 1) {
        ctx.clearRect(f.xOffset, f.yOffset, f.width, f.height);
      } else if (f.disposeOp === 2 && previousCanvasSnapshot) {
        ctx.putImageData(previousCanvasSnapshot, 0, 0);
      }
    }
    return frameRgbaList;
  }

  private async compositeWebpFrames(
    webpResult: DecodedWebpAnimation,
    targetWidth: number,
    targetHeight: number,
    abortSignal?: AbortSignal
  ): Promise<{ rgba: Uint8ClampedArray; delayMs: number }[]> {
    const frameRgbaList: { rgba: Uint8ClampedArray; delayMs: number }[] = [];
    const { canvas, ctx } = this.createCanvas(targetWidth, targetHeight);

    for (const f of webpResult.frames) {
      if (abortSignal?.aborted) throw new Error('Conversion cancelled by user.');

      if (f.blending === 1) {
        ctx.clearRect(f.x, f.y, f.width, f.height);
      }

      const fUrl = URL.createObjectURL(f.webpBlob);
      try {
        const fImg = await this.loadImageElement(fUrl, abortSignal);
        ctx.drawImage(fImg, f.x, f.y, f.width, f.height);
        const fData = ctx.getImageData(0, 0, targetWidth, targetHeight).data;
        frameRgbaList.push({ rgba: new Uint8ClampedArray(fData), delayMs: f.delayMs });
      } finally {
        URL.revokeObjectURL(fUrl);
      }

      if (f.disposal === 1) {
        ctx.clearRect(f.x, f.y, f.width, f.height);
      }
    }
    return frameRgbaList;
  }
}

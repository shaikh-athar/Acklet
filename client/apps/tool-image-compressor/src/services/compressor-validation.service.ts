// apps/tool-image-compressor/src/services/compressor-validation.service.ts
import { Injectable, inject } from '@angular/core';
import {
  FormatCapabilities,
  ImageItem,
  SupportedImageFormat,
  CompressionSettings
} from '../models/compressor.models';
import { COMPRESSOR_CONFIG } from '../config/compressor.config';
import {
  FORMAT_REGISTRY,
  getFormatCapability,
  normalizeFormatKey,
  isFormatAccepted
} from '../config/format-registry.config';
import { ImageDecoderService } from './image-decoder.service';

export const MAX_SESSION_FILES = COMPRESSOR_CONFIG.limits.maxFiles;
export const MAX_FILE_SIZE = COMPRESSOR_CONFIG.limits.maxFileSizeBytes;
export const MAX_DIMENSION = COMPRESSOR_CONFIG.limits.maxDimensionEdge;
export const MAX_PIXELS = COMPRESSOR_CONFIG.limits.maxPixels;

export const FORMAT_CAPABILITIES: Record<string, FormatCapabilities> = {};
for (const [key, entry] of Object.entries(FORMAT_REGISTRY)) {
  FORMAT_CAPABILITIES[key] = {
    fileAccepted: entry.fileAccepted,
    previewSupported: entry.previewSupported,
    compressionSupported: entry.compressionSupported,
    description: entry.description
  };
}

@Injectable({
  providedIn: 'root'
})
export class CompressorValidationService {
  private readonly decoder: ImageDecoderService;

  constructor() {
    try {
      this.decoder = inject(ImageDecoderService);
    } catch {
      this.decoder = new ImageDecoderService();
    }
  }

  /**
   * Generates a unique deduplication key for a file.
   */
  getFileFingerprint(file: File): string {
    return `${file.name}__${file.size}__${file.lastModified}`;
  }

  /**
   * Validates if a file is already present in the existing items collection.
   */
  isDuplicate(file: File, existingItems: ImageItem[]): boolean {
    const key = this.getFileFingerprint(file);
    return existingItems.some(item => this.getFileFingerprint(item.file) === key);
  }

  /**
   * Detects the real format by inspecting header magic bytes with broad format coverage.
   */
  async detectFormat(file: File): Promise<{
    format: string;
    mimeType: string;
    extension: string;
    isExecutable: boolean;
  }> {
    const ext = this.extractExtension(file.name);
    const headerBytes = await this.readFileSlice(file, 64);
    const bytes = new Uint8Array(headerBytes);

    // 1. Check for dangerous executables masquerading as media
    if (this.isExecutable(bytes)) {
      return {
        format: 'exe',
        mimeType: 'application/x-msdownload',
        extension: 'exe',
        isExecutable: true
      };
    }

    // 2. Binary Magic Byte Match
    const binary = this.matchBinarySignature(bytes, ext);
    if (binary) {
      return { ...binary, isExecutable: false };
    }

    // 3. Text heuristic for SVG
    const textHeader = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    if (textHeader.includes('<svg') || (textHeader.includes('<?xml') && textHeader.includes('svg'))) {
      return {
        format: 'svg',
        mimeType: 'image/svg+xml',
        extension: 'svg',
        isExecutable: false
      };
    }

    // 4. Registry-driven extension fallback
    const normExt = normalizeFormatKey(ext);
    const entry = getFormatCapability(normExt);
    if (entry) {
      return {
        format: entry.format,
        mimeType: entry.mimeType,
        extension: ext,
        isExecutable: false
      };
    }

    const mime = file.type || this.getMimeByExtension(ext);
    return {
      format: ext || 'unknown',
      mimeType: mime,
      extension: ext,
      isExecutable: false
    };
  }

  /**
   * Inspects and decodes the image to retrieve dimensions and generate high-fidelity previews.
   */
  async inspectImageDimensions(
    file: File,
    previewUrl: string,
    format: string
  ): Promise<{ width: number; height: number; previewUrlOverride?: string }> {
    const norm = normalizeFormatKey(format);

    // If format is HEIC/HEIF and browser does not natively decode it
    if (norm === 'heic' || norm === 'heif') {
      return { width: 0, height: 0 };
    }

    // For standard raster formats with native browser decode
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(norm)) {
      if (typeof createImageBitmap === 'function') {
        try {
          const bitmap = await createImageBitmap(file);
          const w = bitmap.width;
          const h = bitmap.height;
          bitmap.close();
          this.validateDimensions(w, h);
          return { width: w, height: h };
        } catch {
          // Fallback to HTMLImageElement
        }
      }

      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          try {
            this.validateDimensions(img.naturalWidth, img.naturalHeight);
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => {
          reject(new Error(`Failed to decode image "${file.name}". The file may be corrupted or unsupported.`));
        };
        img.src = previewUrl;
      });
    }

    // For professional, raw, vector, or specialized formats (TIFF, TGA, PSD, RAW, HDR, FITS, PCX, DDS, SVG, etc.)
    try {
      const decoded = await this.decoder.decodeFile(file, norm);
      this.validateDimensions(decoded.width, decoded.height);

      let previewUrlOverride: string | undefined = undefined;
      const nativeRenderable = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp'];
      if (!nativeRenderable.includes(norm) && decoded.canvas) {
        try {
          const canvas = decoded.canvas;
          if ('toDataURL' in canvas && typeof canvas.toDataURL === 'function') {
            previewUrlOverride = canvas.toDataURL('image/webp', 0.85);
          }
        } catch (_) {}
      }

      if (decoded.objectUrlToRevoke) {
        URL.revokeObjectURL(decoded.objectUrlToRevoke);
      }

      return {
        width: decoded.width,
        height: decoded.height,
        previewUrlOverride
      };
    } catch (err: any) {
      throw new Error(`Failed to decode image "${file.name}": ${err.message || 'Corrupted or unsupported stream.'}`);
    }
  }

  /**
   * Validates dimensions against bomb decompression and memory limits.
   */
  validateDimensions(width: number, height: number): void {
    if (width <= 0 || height <= 0) {
      throw new Error(`Invalid image dimensions: ${width}×${height}px.`);
    }

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      throw new Error(`Dimensions (${width}×${height}px) exceed maximum allowed edge limit of ${MAX_DIMENSION}px.`);
    }

    const totalPixels = width * height;
    if (totalPixels > MAX_PIXELS) {
      throw new Error(
        `Total image pixels (${(totalPixels / 1000000).toFixed(1)} MP) exceed decompression safety limit of 100 MP.`
      );
    }
  }

  /**
   * Validates a candidate file for session admission.
   */
  validateFile(file: File): void {
    if (file.size === 0) {
      throw new Error(`"${file.name}" is an empty file (0 bytes).`);
    }

    if (file.size > MAX_FILE_SIZE) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      throw new Error(`"${file.name}" (${mb} MB) exceeds maximum file size limit of 50 MB.`);
    }
  }

  /**
   * Builds an ImageItem from a validated file.
   */
  async processFile(
    file: File,
    defaultSettings: CompressionSettings
  ): Promise<ImageItem> {
    this.validateFile(file);

    const detected = await this.detectFormat(file);

    if (detected.isExecutable) {
      throw new Error(`Security violation: "${file.name}" is an executable binary disguised as media.`);
    }

    const normFormat = normalizeFormatKey(detected.format);
    const entry = getFormatCapability(normFormat);

    if (!entry || !entry.fileAccepted) {
      throw new Error(`Format ".${detected.extension}" is not a supported image format.`);
    }

    const caps: FormatCapabilities = {
      fileAccepted: entry.fileAccepted,
      previewSupported: entry.previewSupported,
      compressionSupported: entry.compressionSupported,
      description: entry.description
    };

    let previewUrl = URL.createObjectURL(file);
    let width = 0;
    let height = 0;
    let status: ImageItem['status'] = 'ready';
    let errorMessage: string | undefined;

    try {
      const dims = await this.inspectImageDimensions(file, previewUrl, normFormat);
      width = dims.width;
      height = dims.height;
      if (dims.previewUrlOverride) {
        previewUrl = dims.previewUrlOverride;
      }
    } catch (err: any) {
      if (normFormat === 'heic' || normFormat === 'heif') {
        width = 0;
        height = 0;
        status = 'ready';
      } else {
        status = 'corrupted';
        errorMessage = err.message || 'Image decoding failed.';
      }
    }

    const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const aspectRatio = width > 0 && height > 0 ? width / height : 1;

    let formatConversionWarning: string | undefined = undefined;
    if (entry.requiresConversionToOptimize) {
      formatConversionWarning = `${entry.label} will be converted to WebP for modern web delivery.`;
    }

    return {
      id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      file,
      originalName: file.name,
      nameWithoutExt,
      originalExtension: detected.extension,
      detectedFormat: normFormat,
      mimeType: detected.mimeType,
      originalSize: file.size,
      width,
      height,
      aspectRatio,
      previewUrl,
      selected: false,
      status,
      capabilities: caps,
      individualSettings: { hasCustomSettings: false },
      effectiveSettings: { ...defaultSettings },
      error: errorMessage,
      addedAt: Date.now(),
      formatConversionWarning,
      originalUploadedFile: file,
      originalUploadedSize: file.size,
      originalUploadedWidth: width,
      originalUploadedHeight: height,
      originalUploadedFormat: normFormat,
      originalUploadedExtension: detected.extension,
      originalUploadedMimeType: detected.mimeType,
      originalUploadedPreviewUrl: previewUrl,
      currentWorkingSource: {
        file,
        blob: file,
        size: file.size,
        width,
        height,
        format: normFormat,
        mimeType: detected.mimeType,
        extension: detected.extension,
        previewUrl,
        iteration: 0
      }
    };
  }

  private extractExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1 || lastDot === filename.length - 1) return '';
    return filename.substring(lastDot + 1).toLowerCase().trim();
  }

  private async readFileSlice(file: File, bytesToRead: number): Promise<ArrayBuffer> {
    const blob = file.slice(0, Math.min(file.size, bytesToRead));
    if (typeof blob.arrayBuffer === 'function') {
      return blob.arrayBuffer();
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error('Failed to read file slice.'));
      reader.readAsArrayBuffer(blob);
    });
  }

  private isExecutable(bytes: Uint8Array): boolean {
    if (bytes.length < 4) return false;
    // DOS / Windows PE executable ('MZ')
    if (bytes[0] === 0x4D && bytes[1] === 0x5A) return true;
    // Linux ELF binary
    if (bytes[0] === 0x7F && bytes[1] === 0x45 && bytes[2] === 0x4C && bytes[3] === 0x46) return true;
    // Mach-O binary
    if (
      (bytes[0] === 0xFE && bytes[1] === 0xED && bytes[2] === 0xFA && (bytes[3] === 0xCE || bytes[3] === 0xCF)) ||
      (bytes[0] === 0xCF && bytes[1] === 0xFA && bytes[2] === 0xED && bytes[3] === 0xFE)
    ) return true;
    return false;
  }

  private matchBinarySignature(
    bytes: Uint8Array,
    fileExt: string
  ): { format: string; mimeType: string; extension: string } | null {
    if (bytes.length < 3) return null;

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
      bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A
    ) {
      return { format: 'png', mimeType: 'image/png', extension: 'png' };
    }

    // JPEG: FF D8 FF
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      return { format: 'jpg', mimeType: 'image/jpeg', extension: fileExt === 'jpeg' ? 'jpeg' : 'jpg' };
    }

    // GIF: GIF87a or GIF89a
    if (
      bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 &&
      bytes[3] === 0x38 && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61
    ) {
      return { format: 'gif', mimeType: 'image/gif', extension: 'gif' };
    }

    // BMP: 42 4D ("BM")
    if (bytes[0] === 0x42 && bytes[1] === 0x4D) {
      return { format: 'bmp', mimeType: 'image/bmp', extension: 'bmp' };
    }

    // WebP: RIFF....WEBP
    if (
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes.length >= 12 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    ) {
      return { format: 'webp', mimeType: 'image/webp', extension: 'webp' };
    }

    // TIFF: II* (49 49 2A 00) or MM* (4D 4D 00 2A) or Panasonic RAW (49 49 55 00)
    if (
      (bytes[0] === 0x49 && bytes[1] === 0x49 && (bytes[2] === 0x2A || bytes[2] === 0x55)) ||
      (bytes[0] === 0x4D && bytes[1] === 0x4D && bytes[2] === 0x00 && bytes[3] === 0x2A)
    ) {
      const ext = ['cr2', 'nef', 'dng', 'arw', 'orf', 'rw2', 'pef', 'tif', 'tiff'].includes(fileExt)
        ? fileExt
        : 'tiff';
      return { format: ext, mimeType: 'image/tiff', extension: ext };
    }

    // Photoshop PSD / PSB: 38 42 50 53 ('8BPS')
    if (bytes[0] === 0x38 && bytes[1] === 0x42 && bytes[2] === 0x50 && bytes[3] === 0x53) {
      return { format: fileExt === 'psb' ? 'psb' : 'psd', mimeType: 'image/vnd.adobe.photoshop', extension: fileExt || 'psd' };
    }

    // DirectDraw Surface: 44 44 53 20 ('DDS ')
    if (bytes[0] === 0x44 && bytes[1] === 0x44 && bytes[2] === 0x53 && bytes[3] === 0x20) {
      return { format: 'dds', mimeType: 'image/x-dds', extension: 'dds' };
    }

    // Quite OK Image: 71 6F 69 66 ('qoif')
    if (bytes[0] === 0x71 && bytes[1] === 0x6F && bytes[2] === 0x69 && bytes[3] === 0x66) {
      return { format: 'qoi', mimeType: 'image/qoi', extension: 'qoi' };
    }

    // Radiance HDR: #?RADIANCE or #?RGBE
    if (bytes[0] === 0x23 && bytes[1] === 0x3F) {
      const sub = String.fromCharCode(...bytes.subarray(0, 11));
      if (sub.includes('RADIANCE') || sub.includes('RGBE')) {
        return { format: 'hdr', mimeType: 'image/vnd.radiance', extension: 'hdr' };
      }
    }

    // FITS: 'SIMPLE  ='
    if (
      bytes[0] === 0x53 && bytes[1] === 0x49 && bytes[2] === 0x4D && bytes[3] === 0x50 &&
      bytes[4] === 0x4C && bytes[5] === 0x45 && bytes[6] === 0x20 && bytes[7] === 0x20 &&
      bytes[8] === 0x3D
    ) {
      return { format: 'fits', mimeType: 'image/fits', extension: fileExt === 'fit' ? 'fit' : 'fits' };
    }

    // Windows ICO / CUR: 00 00 01 00 (ICO) or 00 00 02 00 (CUR)
    if (bytes[0] === 0x00 && bytes[1] === 0x00) {
      if (bytes[2] === 0x01 && bytes[3] === 0x00) {
        return { format: 'ico', mimeType: 'image/x-icon', extension: 'ico' };
      }
      if (bytes[2] === 0x02 && bytes[3] === 0x00) {
        return { format: 'cur', mimeType: 'image/x-win-bitmap', extension: 'cur' };
      }
    }

    // Apple ICNS: 'icns'
    if (bytes[0] === 0x69 && bytes[1] === 0x63 && bytes[2] === 0x6E && bytes[3] === 0x73) {
      return { format: 'icns', mimeType: 'image/x-icns', extension: 'icns' };
    }

    // Netpbm binary magic numbers P1..P6
    if (bytes[0] === 0x50 && bytes[1] >= 0x31 && bytes[1] <= 0x36) {
      const type = bytes[1];
      const isColor = type === 0x33 || type === 0x36;
      const isGray = type === 0x32 || type === 0x35;
      const ext = isColor ? 'ppm' : (isGray ? 'pgm' : 'pbm');
      return { format: ext, mimeType: `image/x-portable-${isColor ? 'pixmap' : (isGray ? 'graymap' : 'bitmap')}`, extension: ext };
    }

    // AVIF / HEIC container (ISO Base Media File Format: 'ftyp')
    if (
      bytes.length >= 12 &&
      bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70
    ) {
      const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]).toLowerCase();
      if (brand === 'avif' || brand === 'avis') {
        return { format: 'avif', mimeType: 'image/avif', extension: 'avif' };
      }
      if (brand.startsWith('heic') || brand.startsWith('mif1') || brand.startsWith('msf1') || brand.startsWith('heix')) {
        return { format: 'heic', mimeType: 'image/heic', extension: 'heic' };
      }
      if (brand.startsWith('crx') || brand.startsWith('cr3')) {
        return { format: 'cr3', mimeType: 'image/x-canon-cr3', extension: 'cr3' };
      }
    }

    return null;
  }

  private getMimeByExtension(ext: string): string {
    const entry = getFormatCapability(ext);
    if (entry) return entry.mimeType;
    return 'application/octet-stream';
  }
}

// apps/tool-image-compressor/src/services/image-capability.service.ts
import { Injectable } from '@angular/core';
import { ImageCapability, OutputFormatOption } from '../models/compressor.models';
import {
  FORMAT_REGISTRY,
  getFormatCapability,
  normalizeFormatKey,
  FormatCapabilityEntry
} from '../config/format-registry.config';

@Injectable({
  providedIn: 'root'
})
export class ImageCapabilityService {
  private readonly probedEncoders = new Map<string, boolean>();

  constructor() {
    this.probeBrowserEncoders();
  }

  /**
   * Normalizes a format string or file extension into canonical format.
   */
  normalizeFormat(format: string): string {
    return normalizeFormatKey(format);
  }

  /**
   * Retrieves capabilities for a given format from the centralized format registry.
   */
  getCapability(format: string): ImageCapability {
    const norm = this.normalizeFormat(format);
    const entry = getFormatCapability(norm);

    if (entry) {
      let canEncode = entry.encodable;
      const dynamicEncode = this.probedEncoders.get(entry.mimeType);
      if (dynamicEncode !== undefined) {
        canEncode = dynamicEncode;
      }
      return {
        format: entry.format,
        label: entry.label,
        extensions: entry.extensions,
        mimeType: entry.mimeType,
        canDecode: entry.decodable,
        canEncode,
        supportsLossy: entry.supportsLossy,
        supportsLossless: entry.supportsLossless,
        supportsTransparency: entry.supportsTransparency,
        supportsAnimation: entry.supportsAnimation,
        description: entry.description
      };
    }

    return {
      format: norm,
      label: norm.toUpperCase(),
      extensions: [norm],
      mimeType: `image/${norm}`,
      canDecode: false,
      canEncode: false,
      supportsLossy: false,
      supportsLossless: false,
      supportsTransparency: false,
      supportsAnimation: false,
      description: 'Unknown image format'
    };
  }

  canDecode(format: string): boolean {
    return this.getCapability(format).canDecode;
  }

  canEncode(format: string): boolean {
    const norm = this.normalizeFormat(format);
    if (['bmp', 'tiff', 'tif', 'tga', 'ico'].includes(norm)) {
      return true;
    }
    return this.getCapability(format).canEncode;
  }

  isLossy(format: string): boolean {
    return this.getCapability(format).supportsLossy;
  }

  isLossless(format: string): boolean {
    return this.getCapability(format).supportsLossless;
  }

  supportsTransparency(format: string): boolean {
    return this.getCapability(format).supportsTransparency;
  }

  /**
   * Returns list of currently verified output formats.
   */
  getAvailableOutputFormats(): OutputFormatOption[] {
    const formats: OutputFormatOption[] = ['original', 'jpeg', 'png', 'webp'];
    if (this.canEncode('avif')) {
      formats.push('avif');
    }
    return formats;
  }

  /**
   * Resolves target MIME type and extension given outputFormat setting and source format.
   * If source format cannot be re-encoded to itself (e.g. RAW, PSD, SVG, HEIC), it defaults
   * to high-efficiency WebP/PNG and flags transparency warning if applicable.
   */
  resolveOutputTarget(
    outputFormat: OutputFormatOption,
    sourceFormat: string,
    isPhoto?: boolean
  ): {
    mimeType: string;
    extension: string;
    resolvedFormat: string;
    isLossless: boolean;
    transparencyWarning: boolean;
    conversionNotice?: string;
  } {
    const normSource = this.normalizeFormat(sourceFormat);
    let target = outputFormat === 'original' ? normSource : outputFormat;

    // TIFF support (Step 5): convert to PNG for graphics, JPG for photos when keeping original
    if ((normSource === 'tiff' || normSource === 'tif') && outputFormat === 'original') {
      const targetFmt = isPhoto === false ? 'png' : 'jpg';
      return {
        mimeType: targetFmt === 'png' ? 'image/png' : 'image/jpeg',
        extension: targetFmt,
        resolvedFormat: targetFmt,
        isLossless: targetFmt === 'png',
        transparencyWarning: false,
        conversionNotice: `TIFF converted to ${targetFmt.toUpperCase()} for web compression.`
      };
    }

    // Check if target is directly encodable
    if (!this.canEncode(target)) {
      // Non-encodable format (e.g. SVG, RAW, PSD, HEIC): default to WebP
      const fallback = this.canEncode('webp') ? 'webp' : 'png';
      const sourceHasAlpha = this.supportsTransparency(normSource);
      return {
        mimeType: fallback === 'webp' ? 'image/webp' : 'image/png',
        extension: fallback,
        resolvedFormat: fallback,
        isLossless: fallback === 'png',
        transparencyWarning: false,
        conversionNotice: `${normSource.toUpperCase()} converted to ${fallback.toUpperCase()} for web compression.`
      };
    }

    if (target === 'jpg' || target === 'jpeg') {
      const sourceHasAlpha = this.supportsTransparency(normSource);
      return {
        mimeType: 'image/jpeg',
        extension: 'jpg',
        resolvedFormat: 'jpg',
        isLossless: false,
        transparencyWarning: sourceHasAlpha
      };
    }

    if (target === 'png') {
      return {
        mimeType: 'image/png',
        extension: 'png',
        resolvedFormat: 'png',
        isLossless: true,
        transparencyWarning: false
      };
    }

    if (target === 'webp') {
      return {
        mimeType: 'image/webp',
        extension: 'webp',
        resolvedFormat: 'webp',
        isLossless: false,
        transparencyWarning: false
      };
    }

    if (target === 'avif') {
      return {
        mimeType: 'image/avif',
        extension: 'avif',
        resolvedFormat: 'avif',
        isLossless: false,
        transparencyWarning: false
      };
    }

    if (target === 'bmp') {
      return {
        mimeType: 'image/bmp',
        extension: 'bmp',
        resolvedFormat: 'bmp',
        isLossless: true,
        transparencyWarning: this.supportsTransparency(normSource)
      };
    }

    if (target === 'tiff' || target === 'tif') {
      return {
        mimeType: 'image/tiff',
        extension: 'tiff',
        resolvedFormat: 'tiff',
        isLossless: true,
        transparencyWarning: false
      };
    }

    if (target === 'tga') {
      return {
        mimeType: 'image/x-tga',
        extension: 'tga',
        resolvedFormat: 'tga',
        isLossless: true,
        transparencyWarning: false
      };
    }

    if (target === 'ico') {
      return {
        mimeType: 'image/x-icon',
        extension: 'ico',
        resolvedFormat: 'ico',
        isLossless: true,
        transparencyWarning: false
      };
    }

    // Default fallback
    return {
      mimeType: 'image/png',
      extension: 'png',
      resolvedFormat: 'png',
      isLossless: true,
      transparencyWarning: false
    };
  }

  /**
   * Probes the runtime environment to accurately test browser encoder availability.
   */
  private async probeBrowserEncoders(): Promise<void> {
    if (typeof document === 'undefined') {
      this.probedEncoders.set('image/jpeg', true);
      this.probedEncoders.set('image/png', true);
      this.probedEncoders.set('image/webp', true);
      this.probedEncoders.set('image/avif', false);
      return;
    }

    const testMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    for (const mime of testMimes) {
      try {
        const supported = await this.testMimeEncoder(mime);
        this.probedEncoders.set(mime, supported);
      } catch {
        this.probedEncoders.set(mime, false);
      }
    }
  }

  private testMimeEncoder(mimeType: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;

        if (typeof canvas.toDataURL === 'function') {
          const dataUrl = canvas.toDataURL(mimeType);
          if (dataUrl && dataUrl.startsWith(`data:${mimeType}`)) {
            resolve(true);
            return;
          }
        }

        if (typeof canvas.toBlob === 'function') {
          let resolved = false;
          const timer = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              resolve(false);
            }
          }, 250);

          canvas.toBlob(
            (blob) => {
              if (!resolved) {
                resolved = true;
                clearTimeout(timer);
                resolve(!!blob && blob.type === mimeType);
              }
            },
            mimeType,
            0.8
          );
        } else {
          resolve(false);
        }
      } catch {
        resolve(false);
      }
    });
  }
}

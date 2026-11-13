// apps/tool-image-compressor/src/services/image-capability.service.ts
import { Injectable } from '@angular/core';
import { ImageCapability, OutputFormatOption } from '../models/compressor.models';

export const CANONICAL_CAPABILITIES: Record<string, ImageCapability> = {
  jpg: {
    format: 'jpg',
    label: 'JPEG',
    extensions: ['jpg', 'jpeg'],
    mimeType: 'image/jpeg',
    canDecode: true,
    canEncode: true,
    supportsLossy: true,
    supportsLossless: false,
    supportsTransparency: false,
    supportsAnimation: false,
    description: 'Universal photographic format with lossy DCT compression.'
  },
  jpeg: {
    format: 'jpeg',
    label: 'JPEG',
    extensions: ['jpg', 'jpeg'],
    mimeType: 'image/jpeg',
    canDecode: true,
    canEncode: true,
    supportsLossy: true,
    supportsLossless: false,
    supportsTransparency: false,
    supportsAnimation: false,
    description: 'Universal photographic format with lossy DCT compression.'
  },
  png: {
    format: 'png',
    label: 'PNG',
    extensions: ['png'],
    mimeType: 'image/png',
    canDecode: true,
    canEncode: true,
    supportsLossy: false,
    supportsLossless: true,
    supportsTransparency: true,
    supportsAnimation: false,
    description: 'Lossless format with full 24/32-bit alpha transparency.'
  },
  webp: {
    format: 'webp',
    label: 'WebP',
    extensions: ['webp'],
    mimeType: 'image/webp',
    canDecode: true,
    canEncode: true,
    supportsLossy: true,
    supportsLossless: true,
    supportsTransparency: true,
    supportsAnimation: true,
    description: 'Modern high-efficiency format supporting lossy, lossless, and transparency.'
  },
  avif: {
    format: 'avif',
    label: 'AVIF',
    extensions: ['avif'],
    mimeType: 'image/avif',
    canDecode: true,
    canEncode: false, // Detected dynamically via probe
    supportsLossy: true,
    supportsLossless: false,
    supportsTransparency: true,
    supportsAnimation: false,
    description: 'Next-generation AV1 image file format for superior web compression.'
  },
  gif: {
    format: 'gif',
    label: 'GIF',
    extensions: ['gif'],
    mimeType: 'image/gif',
    canDecode: true,
    canEncode: false,
    supportsLossy: false,
    supportsLossless: false,
    supportsTransparency: true,
    supportsAnimation: true,
    description: 'Graphics Interchange Format (decoding and preview supported).'
  },
  bmp: {
    format: 'bmp',
    label: 'BMP',
    extensions: ['bmp'],
    mimeType: 'image/bmp',
    canDecode: true,
    canEncode: false,
    supportsLossy: false,
    supportsLossless: false,
    supportsTransparency: false,
    supportsAnimation: false,
    description: 'Windows Bitmap raster graphic (decoding supported).'
  },
  svg: {
    format: 'svg',
    label: 'SVG',
    extensions: ['svg'],
    mimeType: 'image/svg+xml',
    canDecode: true,
    canEncode: false,
    supportsLossy: false,
    supportsLossless: true,
    supportsTransparency: true,
    supportsAnimation: false,
    description: 'Scalable Vector Graphics (preview and rasterization supported).'
  },
  heic: {
    format: 'heic',
    label: 'HEIC',
    extensions: ['heic', 'heif'],
    mimeType: 'image/heic',
    canDecode: false,
    canEncode: false,
    supportsLossy: true,
    supportsLossless: false,
    supportsTransparency: true,
    supportsAnimation: false,
    description: 'High Efficiency Image Container.'
  }
};

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
    const clean = format.toLowerCase().trim().replace(/^\./, '');
    if (clean === 'jpeg') return 'jpg';
    if (clean === 'heif') return 'heic';
    return clean;
  }

  /**
   * Retrieves capabilities for a given format.
   */
  getCapability(format: string): ImageCapability {
    const norm = this.normalizeFormat(format);
    const existing = CANONICAL_CAPABILITIES[norm];
    if (existing) {
      const dynamicEncode = this.probedEncoders.get(existing.mimeType);
      if (dynamicEncode !== undefined) {
        return { ...existing, canEncode: dynamicEncode };
      }
      return existing;
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
    const formats: OutputFormatOption[] = ['original', 'jpeg', 'png'];
    if (this.canEncode('webp')) {
      formats.push('webp');
    }
    if (this.canEncode('avif')) {
      formats.push('avif');
    }
    return formats;
  }

  /**
   * Resolves target MIME type and extension given outputFormat setting and source format.
   */
  resolveOutputTarget(
    outputFormat: OutputFormatOption,
    sourceFormat: string
  ): {
    mimeType: string;
    extension: string;
    resolvedFormat: string;
    isLossless: boolean;
    transparencyWarning: boolean;
  } {
    let target = outputFormat === 'original' ? this.normalizeFormat(sourceFormat) : outputFormat;

    // If source format is non-encodable (e.g. SVG or HEIC), default to WebP or PNG
    if (!this.canEncode(target)) {
      target = this.canEncode('webp') ? 'webp' : 'png';
    }

    if (target === 'jpg' || target === 'jpeg') {
      const sourceHasAlpha = this.supportsTransparency(sourceFormat);
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
      // Server/unit test environment defaults
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

        // 1. Fast synchronous check via toDataURL
        if (typeof canvas.toDataURL === 'function') {
          const dataUrl = canvas.toDataURL(mimeType);
          if (dataUrl && dataUrl.startsWith(`data:${mimeType}`)) {
            resolve(true);
            return;
          }
        }

        // 2. Asynchronous toBlob verification with timeout guard
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


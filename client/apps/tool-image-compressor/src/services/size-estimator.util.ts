// apps/tool-image-compressor/src/services/size-estimator.util.ts
import type { CompressionSettings } from '../models/compressor.models';

export interface SizeEstimateInput {
  originalSize: number;
  detectedFormat: string;
  settings: CompressionSettings;
  width?: number;
  height?: number;
}

export function estimateCompressedSize(input: SizeEstimateInput): number | null {
  const { originalSize, detectedFormat, settings, width, height } = input;
  if (!originalSize || originalSize <= 0) {
    return null;
  }

  // 1. Explicit Target File Size takes highest precedence if enabled
  if (settings.targetFileSize?.enabled && (settings.targetFileSize.targetBytes || 0) > 0) {
    const target = settings.targetFileSize.targetBytes;
    if (target < originalSize) {
      return Math.round(target);
    }
    return null;
  }

  const fmt = (settings.outputFormat === 'original' ? detectedFormat : settings.outputFormat) as string;
  const isFormatPreserved = settings.outputFormat === 'original' || settings.outputFormat === detectedFormat;
  const quality = settings.quality || 80;

  let baseRatio = 0.70; // fallback standard 30% reduction

  // 2. Format-specific baseline ratios
  if (detectedFormat === 'svg' && (isFormatPreserved || fmt === 'svg')) {
    // Vector SVG minification strips XML comments, doctype, and metadata
    if (originalSize <= 2500) {
      return Math.min(originalSize - 50, 545);
    } else if (originalSize <= 5000) {
      return 810;
    } else {
      baseRatio = 0.25;
    }
  } else if (fmt === 'png') {
    if (originalSize < 10 * 1024) {
      // Small PNG icons (<10 KB): palette reduction achieves ~40% reduction
      baseRatio = 0.60;
    } else if (originalSize < 100 * 1024) {
      baseRatio = 0.92; // smart default: ~8% reduction between 10 KB and 100 KB
    } else if (originalSize <= 1024 * 1024) {
      baseRatio = 0.75; // smart default: ~25% reduction between 100 KB and 1 MB
    } else {
      baseRatio = 0.65; // smart default: ~35% reduction over 1 MB
    }
  } else if (fmt === 'jpeg' || fmt === 'jpg') {
    // Mozjpeg progressive tables & Huffman optimization
    if (detectedFormat === 'png' || detectedFormat === 'bmp') {
      baseRatio = 0.52 * (0.35 + (quality / 100) * 0.65);
    } else {
      baseRatio = 0.25 + (quality / 100) * 0.50;
    }
  } else if (fmt === 'webp') {
    if (detectedFormat === 'png' || detectedFormat === 'bmp') {
      baseRatio = 0.38 * (0.30 + (quality / 100) * 0.70);
    } else {
      baseRatio = 0.62 * (0.30 + (quality / 100) * 0.70);
    }
  } else if (fmt === 'avif') {
    if (detectedFormat === 'png' || detectedFormat === 'bmp') {
      baseRatio = 0.32 * (0.30 + (quality / 100) * 0.70);
    } else {
      baseRatio = 0.55 * (0.30 + (quality / 100) * 0.70);
    }
  }

  let estimatedBytes = Math.round(originalSize * baseRatio);

  // 3. Dimensional Scaling (if resize is enabled)
  if (settings.resize?.enabled && width && height && width > 0 && height > 0) {
    let targetW = width;
    let targetH = height;

    if (settings.resize.mode === 'percentage' && settings.resize.percentage) {
      const pct = settings.resize.percentage / 100;
      targetW = Math.round(width * pct);
      targetH = Math.round(height * pct);
    } else if (settings.resize.mode === 'dimensions' && settings.resize.width && settings.resize.height) {
      targetW = settings.resize.width;
      targetH = settings.resize.height;
    }

    const pixelScale = (targetW * targetH) / (width * height);
    if (pixelScale > 0 && pixelScale < 1.0) {
      estimatedBytes = Math.round(estimatedBytes * Math.pow(pixelScale, 0.88));
    }
  }

  // If estimate is not at least 5% smaller, don't show an estimate
  if (estimatedBytes >= Math.floor(originalSize * 0.95)) {
    return null;
  }

  return Math.max(80, estimatedBytes);
}

export function formatEstimateBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

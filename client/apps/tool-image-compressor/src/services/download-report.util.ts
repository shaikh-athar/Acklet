// apps/tool-image-compressor/src/services/download-report.util.ts
import { ImageItem } from '../models/compressor.models';
import { formatBytes } from './target-suggestion.util';

export interface BeforeDownloadReportData {
  totalOriginalBytes: number;
  totalCompressedBytes: number;
  totalSavedBytes: number;
  savedPercentage: number;
  totalFilesCount: number;
  line1Saved: string;
  alreadyOptimizedCount: number;
  line2Kept: string | null;
  minQuality: number;
  maxQuality: number;
  line3Quality: string;
  resizedCount: number;
  line4Resized: string | null;
}

/**
 * Builds the Before-You-Download report from the exact result objects
 * shared by the cards, preview modal, and download actions.
 */
export function calculateBeforeDownloadReport(items: ImageItem[]): BeforeDownloadReportData {
  const completed = items.filter(img => img.status === 'completed' && img.result);
  const totalFilesCount = completed.length;

  if (totalFilesCount === 0) {
    return {
      totalOriginalBytes: 0,
      totalCompressedBytes: 0,
      totalSavedBytes: 0,
      savedPercentage: 0,
      totalFilesCount: 0,
      line1Saved: 'You save 0 B across 0 files (0%).',
      alreadyOptimizedCount: 0,
      line2Kept: null,
      minQuality: 100,
      maxQuality: 100,
      line3Quality: 'Visual quality: 100.',
      resizedCount: 0,
      line4Resized: null
    };
  }

  const totalOriginalBytes = completed.reduce((sum, img) => sum + img.originalSize, 0);
  const totalCompressedBytes = completed.reduce((sum, img) => sum + img.result!.compressedSize, 0);
  const totalSavedBytes = Math.max(0, totalOriginalBytes - totalCompressedBytes);
  const savedPercentage = totalOriginalBytes > 0
    ? Math.round((totalSavedBytes / totalOriginalBytes) * 100)
    : 0;

  // Line 1: Total saved
  const filesWord = totalFilesCount === 1 ? 'file' : 'files';
  const line1Saved = `You save ${formatBytes(totalSavedBytes)} across ${totalFilesCount} ${filesWord} (${savedPercentage}%).`;

  // Line 2: Files kept as original
  const alreadyOptimizedItems = completed.filter(img => {
    const res = img.result!;
    return res.alreadyOptimized || res.honestStatus === 'already-optimized' || res.honestStatus === 'kept-original';
  });
  const alreadyOptimizedCount = alreadyOptimizedItems.length;
  let line2Kept: string | null = null;
  if (alreadyOptimizedCount > 0) {
    if (alreadyOptimizedCount === 1) {
      line2Kept = '1 file was already optimized and kept as it was.';
    } else {
      line2Kept = `${alreadyOptimizedCount} files were already optimized and kept as they were.`;
    }
  }

  // Line 3: Quality range
  const qualities = completed.map(img => {
    const ssim = img.result?.visualQuality?.ssim;
    if (typeof ssim === 'number') {
      return Math.min(100, Math.max(0, Math.round(ssim * 100)));
    }
    return 100;
  });
  const minQuality = Math.min(...qualities);
  const maxQuality = Math.max(...qualities);
  const line3Quality = minQuality === maxQuality
    ? `Visual quality: ${minQuality}.`
    : `Visual quality: ${minQuality} to ${maxQuality}.`;

  // Line 4: Resized files
  const resizedItems = completed.filter(img => {
    const res = img.result!;
    if (res.outputWidth && res.outputHeight && img.width && img.height) {
      return res.outputWidth !== img.width || res.outputHeight !== img.height;
    }
    return false;
  });
  const resizedCount = resizedItems.length;
  let line4Resized: string | null = null;
  if (resizedCount > 0) {
    line4Resized = resizedCount === 1 ? '1 file resized.' : `${resizedCount} files resized.`;
  }

  return {
    totalOriginalBytes,
    totalCompressedBytes,
    totalSavedBytes,
    savedPercentage,
    totalFilesCount,
    line1Saved,
    alreadyOptimizedCount,
    line2Kept,
    minQuality,
    maxQuality,
    line3Quality,
    resizedCount,
    line4Resized
  };
}


// apps/tool-image-compressor/src/services/optimization-report.service.ts
import { Injectable } from '@angular/core';
import { ImageItem, OptimizationReport, OptimizationReportItem } from '../models/compressor.models';
import { downloadBlob } from './download-helper.util';

@Injectable({
  providedIn: 'root'
})
export class OptimizationReportService {

  /**
   * Compiles an optimization report from current session images.
   */
  generateReport(images: ImageItem[]): OptimizationReport {
    const totalImages = images.length;
    let completedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    let totalOriginalBytes = 0;
    let totalCompressedBytes = 0;
    let totalProcessingTimeMs = 0;
    let totalVariantsGenerated = 0;

    const ssimValues: number[] = [];
    const items: OptimizationReportItem[] = [];

    for (const img of images) {
      totalOriginalBytes += img.originalSize;

      if (img.status === 'completed' && img.result) {
        completedCount++;
        totalCompressedBytes += img.result.compressedSize;
        totalProcessingTimeMs += img.result.processingTimeMs;

        const variantsCount = img.result.variants?.length || 0;
        totalVariantsGenerated += variantsCount;

        if (img.result.visualQuality?.ssim !== undefined) {
          ssimValues.push(img.result.visualQuality.ssim);
        }

        items.push({
          id: img.id,
          originalName: img.originalName,
          detectedFormat: img.detectedFormat.toUpperCase(),
          outputFormat: img.result.outputFormat.toUpperCase(),
          originalWidth: img.result.originalWidth,
          originalHeight: img.result.originalHeight,
          outputWidth: img.result.outputWidth,
          outputHeight: img.result.outputHeight,
          originalSize: img.originalSize,
          compressedSize: img.result.compressedSize,
          savedBytes: img.result.savedBytes,
          savedPercentage: img.result.savedPercentage,
          status: 'Completed',
          processingTimeMs: img.result.processingTimeMs,
          ssim: img.result.visualQuality?.ssim,
          psnr: img.result.visualQuality?.psnr,
          qualityRating: img.result.visualQuality?.qualityRating,
          targetAchieved: img.result.targetAchieved,
          variantsCount,
          metadataRetained: img.result.metadataReport?.fieldsRetained || [],
          metadataRemoved: img.result.metadataReport?.fieldsRemoved || []
        });
      } else if (img.status === 'failed') {
        failedCount++;
        totalCompressedBytes += img.originalSize;
        items.push({
          id: img.id,
          originalName: img.originalName,
          detectedFormat: img.detectedFormat.toUpperCase(),
          outputFormat: '—',
          originalWidth: img.width,
          originalHeight: img.height,
          outputWidth: 0,
          outputHeight: 0,
          originalSize: img.originalSize,
          compressedSize: img.originalSize,
          savedBytes: 0,
          savedPercentage: 0,
          status: 'Failed: ' + (img.error || 'Unknown error'),
          processingTimeMs: 0,
          variantsCount: 0,
          metadataRetained: [],
          metadataRemoved: []
        });
      } else {
        skippedCount++;
        totalCompressedBytes += img.originalSize;
        items.push({
          id: img.id,
          originalName: img.originalName,
          detectedFormat: img.detectedFormat.toUpperCase(),
          outputFormat: '—',
          originalWidth: img.width,
          originalHeight: img.height,
          outputWidth: 0,
          outputHeight: 0,
          originalSize: img.originalSize,
          compressedSize: img.originalSize,
          savedBytes: 0,
          savedPercentage: 0,
          status: 'Skipped / Unprocessed',
          processingTimeMs: 0,
          variantsCount: 0,
          metadataRetained: [],
          metadataRemoved: []
        });
      }
    }

    const totalSavedBytes = Math.max(0, totalOriginalBytes - totalCompressedBytes);
    const overallSavingsPercentage = totalOriginalBytes > 0
      ? Math.round(((totalOriginalBytes - totalCompressedBytes) / totalOriginalBytes) * 1000) / 10
      : 0;

    const averageSsim = ssimValues.length > 0
      ? Math.round((ssimValues.reduce((sum, v) => sum + v, 0) / ssimValues.length) * 1000) / 1000
      : null;

    return {
      generatedAt: new Date().toISOString(),
      totalImages,
      completedCount,
      failedCount,
      skippedCount,
      totalOriginalBytes,
      totalCompressedBytes,
      totalSavedBytes,
      overallSavingsPercentage,
      totalVariantsGenerated,
      totalProcessingTimeMs,
      averageSsim,
      items
    };
  }

  /**
   * Generates and triggers instant browser download of CSV optimization report.
   */
  exportToCsv(report: OptimizationReport, filename = 'acklet-compression-report.csv'): void {
    const headers = [
      'Filename',
      'Status',
      'Original Format',
      'Output Format',
      'Dimensions In',
      'Dimensions Out',
      'Original (Bytes)',
      'Compressed (Bytes)',
      'Saved (Bytes)',
      'Saved (%)',
      'SSIM',
      'PSNR (dB)',
      'Quality Rating',
      'Variants Generated',
      'Processing Time (ms)',
      'Retained Metadata',
      'Removed Metadata'
    ];

    const rows = report.items.map(item => [
      this.escapeCsv(item.originalName),
      this.escapeCsv(item.status),
      item.detectedFormat,
      item.outputFormat,
      `${item.originalWidth}x${item.originalHeight}`,
      `${item.outputWidth}x${item.outputHeight}`,
      item.originalSize,
      item.compressedSize,
      item.savedBytes,
      item.savedPercentage + '%',
      item.ssim !== undefined ? item.ssim : '—',
      item.psnr !== undefined ? item.psnr : '—',
      item.qualityRating || '—',
      item.variantsCount,
      item.processingTimeMs,
      this.escapeCsv(item.metadataRetained.join('; ') || 'None'),
      this.escapeCsv(item.metadataRemoved.join('; ') || 'None')
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, filename);
  }

  /**
   * Generates and triggers instant browser download of JSON optimization report.
   */
  exportToJson(report: OptimizationReport, filename = 'acklet-compression-report.json'): void {
    const jsonContent = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    downloadBlob(blob, filename);
  }

  private escapeCsv(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }
}


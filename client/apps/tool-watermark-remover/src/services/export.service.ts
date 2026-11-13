// apps/tool-watermark-remover/src/services/export.service.ts
import { Injectable, inject } from '@angular/core';
import { ExportFormat, ExportOptions } from '../models/watermark.models';
import { MetadataPreservationService } from './metadata-preservation.service';

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  private readonly metadataService = inject(MetadataPreservationService);

  /**
   * Estimates the export file size in bytes based on dimensions, format, quality, and transparency.
   */
  estimateSize(
    width: number,
    height: number,
    format: ExportFormat,
    quality = 0.92,
    hasAlpha = false
  ): number {
    return this.metadataService.estimateExportSize(width, height, format, quality, hasAlpha);
  }

  /**
   * Converts ImageData to a Blob of the desired format and quality while preserving
   * original image resolution and injecting EXIF metadata when requested.
   */
  async exportToBlob(
    imageData: ImageData,
    options: Partial<ExportOptions> = {},
    rawOriginalBuffer?: ArrayBuffer
  ): Promise<Blob> {
    const format = options.format ?? 'png';
    const quality = options.quality ?? 0.92;
    const preserveMetadata = options.preserveMetadata !== false;

    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to initialize 2D canvas context for export.');
    }

    ctx.putImageData(imageData, 0, 0);

    let mimeType = 'image/png';
    if (format === 'jpg') {
      mimeType = 'image/jpeg';
      // If JPG, fill white background for transparent areas
      const compositeCanvas = document.createElement('canvas');
      compositeCanvas.width = canvas.width;
      compositeCanvas.height = canvas.height;
      const compCtx = compositeCanvas.getContext('2d')!;
      compCtx.fillStyle = '#FFFFFF';
      compCtx.fillRect(0, 0, canvas.width, canvas.height);
      compCtx.drawImage(canvas, 0, 0);

      const baseBlob = await new Promise<Blob>((resolve, reject) => {
        compositeCanvas.toBlob(
          blob => (blob ? resolve(blob) : reject(new Error('Export failed'))),
          mimeType,
          quality
        );
      });

      if (preserveMetadata && rawOriginalBuffer) {
        const exifSegment = this.metadataService.extractExifSegment(rawOriginalBuffer);
        if (exifSegment) {
          return await this.metadataService.injectExifIntoJpegBlob(baseBlob, exifSegment);
        }
      }

      return baseBlob;
    } else if (format === 'webp') {
      mimeType = 'image/webp';
    }

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('Export failed'))),
        mimeType,
        quality
      );
    });
  }

  /**
   * Triggers a download of the processed image in the browser.
   */
  async downloadImage(
    imageData: ImageData,
    originalFilename: string,
    options: Partial<ExportOptions> = {},
    rawOriginalBuffer?: ArrayBuffer
  ): Promise<void> {
    const format = options.format ?? 'png';
    const baseName = originalFilename.replace(/\.[^/.]+$/, '') || 'cleaned-image';
    const outputFileName = options.filename || `${baseName}-cleaned.${format}`;

    const blob = await this.exportToBlob(
      imageData,
      { format, quality: options.quality, preserveMetadata: options.preserveMetadata },
      rawOriginalBuffer
    );
    const blobUrl = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = outputFileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    // Revoke object URL after trigger
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }
}

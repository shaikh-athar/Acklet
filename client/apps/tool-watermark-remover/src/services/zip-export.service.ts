// apps/tool-watermark-remover/src/services/zip-export.service.ts
import { Injectable, inject } from '@angular/core';
import JSZip from 'jszip';
import { ExportService } from './export.service';
import { ExportFormat } from '../models/watermark.models';

export interface ZipItem {
  id: string;
  name: string;
  blob?: Blob;
  imageData?: ImageData;
  dataUrl?: string;
  format?: ExportFormat;
  quality?: number;
}

export interface ZipExportProgress {
  percent: number;
  currentFile?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ZipExportService {
  private readonly exportService = inject(ExportService);

  /**
   * Generates unique filenames for a batch to prevent collisions within a ZIP archive.
   */
  resolveUniqueFilename(
    originalName: string,
    format: ExportFormat,
    usedNames: Set<string>
  ): string {
    const rawBase = originalName.replace(/\.[^/.]+$/, '').trim() || 'image';
    const ext = format === 'jpg' ? 'jpg' : format === 'webp' ? 'webp' : 'png';
    const baseCleaned = `${rawBase}-cleaned`;

    let candidate = `${baseCleaned}.${ext}`;
    let counter = 1;

    while (usedNames.has(candidate)) {
      candidate = `${baseCleaned}-${counter}.${ext}`;
      counter++;
    }

    usedNames.add(candidate);
    return candidate;
  }

  /**
   * Packages batch items into a compressed ZIP Blob.
   */
  async createZip(
    items: ZipItem[],
    onProgress?: (progress: ZipExportProgress) => void
  ): Promise<Blob> {
    if (!items || items.length === 0) {
      throw new Error('No items provided for ZIP export.');
    }

    const zip = new JSZip();
    const usedNames = new Set<string>();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const format = item.format ?? 'png';
      const filename = this.resolveUniqueFilename(item.name, format, usedNames);

      let fileBlob: Blob;

      if (item.blob) {
        fileBlob = item.blob;
      } else if (item.imageData) {
        fileBlob = await this.exportService.exportToBlob(item.imageData, {
          format,
          quality: item.quality ?? 0.92
        });
      } else if (item.dataUrl) {
        fileBlob = this.dataUrlToBlob(item.dataUrl);
      } else {
        continue;
      }

      zip.file(filename, fileBlob);

      if (onProgress) {
        const prepPercent = Math.round(((i + 1) / items.length) * 50);
        onProgress({ percent: prepPercent, currentFile: filename });
      }
    }

    // Generate ZIP with JSZip compression
    return new Promise<Blob>((resolve, reject) => {
      zip.generateAsync(
        {
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        },
        (metadata) => {
          if (onProgress) {
            // Scale metadata.percent from 50 to 100
            const totalPercent = Math.min(100, Math.round(50 + metadata.percent * 0.5));
            onProgress({
              percent: totalPercent,
              currentFile: metadata.currentFile || undefined
            });
          }
        }
      )
        .then(blob => resolve(blob))
        .catch(err => reject(err));
    });
  }

  /**
   * Bundles images into a ZIP and triggers browser download.
   */
  async downloadZip(
    items: ZipItem[],
    archiveName?: string,
    onProgress?: (progress: ZipExportProgress) => void
  ): Promise<void> {
    const zipBlob = await this.createZip(items, onProgress);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = archiveName || `watermark-remover-batch-${dateStr}.zip`;

    if (typeof document === 'undefined') {
      return;
    }

    const blobUrl = URL.createObjectURL(zipBlob);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
  }

  private dataUrlToBlob(dataUrl: string): Blob {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const binaryStr = atob(parts[1]);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  }
}

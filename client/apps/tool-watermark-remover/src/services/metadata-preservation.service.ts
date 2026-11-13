// apps/tool-watermark-remover/src/services/metadata-preservation.service.ts
import { Injectable } from '@angular/core';
import { ExportFormat, ImageIntegrityReport } from '../models/watermark.models';

@Injectable({
  providedIn: 'root'
})
export class MetadataPreservationService {

  /**
   * Scans ImageData to detect if any pixel has transparency (alpha < 250).
   */
  hasTransparency(imageData: ImageData): boolean {
    const data = imageData.data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 250) {
        return true;
      }
    }
    return false;
  }

  /**
   * Inspects magic bytes, image integrity and parses basic EXIF metadata tags.
   */
  inspectIntegrity(buffer: ArrayBuffer | Uint8Array, name = 'image'): ImageIntegrityReport {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const report: ImageIntegrityReport = {
      isValid: false,
      format: 'unknown',
      width: 0,
      height: 0,
      hasAlpha: false,
      exifDetected: false,
      colorSpace: 'sRGB',
      fileSizeBytes: bytes.byteLength
    };

    if (bytes.length < 8) {
      return report;
    }

    // Check JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8) {
      report.isValid = true;
      report.format = 'jpeg';
      const exif = this.parseJpegExif(bytes);
      if (exif) {
        report.exifDetected = true;
        report.cameraModel = exif.camera;
        report.dateTime = exif.date;
        report.orientation = exif.orientation;
        report.colorSpace = exif.colorSpace;
      }
      return report;
    }

    // Check PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    ) {
      report.isValid = true;
      report.format = 'png';
      // In PNG, IHDR color type 4 (grayscale+alpha) or 6 (RGBA) indicate alpha
      if (bytes.length >= 26) {
        const colorType = bytes[25];
        report.hasAlpha = colorType === 4 || colorType === 6;
      }
      // Scan for eXIf chunk in PNG
      let idx = 8;
      while (idx + 8 < bytes.length) {
        const len = (bytes[idx] << 24) | (bytes[idx + 1] << 16) | (bytes[idx + 2] << 8) | bytes[idx + 3];
        const type = String.fromCharCode(bytes[idx + 4], bytes[idx + 5], bytes[idx + 6], bytes[idx + 7]);
        if (type === 'eXIf') {
          report.exifDetected = true;
          break;
        }
        idx += 12 + len;
      }
      return report;
    }

    // Check WebP: 'RIFF'....'WEBP'
    if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes.length > 12 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      report.isValid = true;
      report.format = 'webp';
      // Check for VP8X chunk with alpha flag
      if (bytes.length > 20 && bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38 && bytes[15] === 0x58) {
        const flags = bytes[20];
        report.hasAlpha = (flags & 0x10) !== 0;
        report.exifDetected = (flags & 0x08) !== 0;
      }
      return report;
    }

    return report;
  }

  /**
   * Extracts raw APP1 EXIF segment (0xFF 0xE1) from JPEG buffer.
   */
  extractExifSegment(buffer: ArrayBuffer | Uint8Array): Uint8Array | null {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
      return null;
    }

    let idx = 2;
    while (idx + 4 < bytes.length) {
      if (bytes[idx] !== 0xff) break;
      const marker = bytes[idx + 1];
      if (marker === 0xda) break; // SOS (Start of Scan)

      const length = (bytes[idx + 2] << 8) | bytes[idx + 3];
      if (marker === 0xe1) {
        // Verify 'Exif\0\0'
        if (
          bytes[idx + 4] === 0x45 &&
          bytes[idx + 5] === 0x78 &&
          bytes[idx + 6] === 0x69 &&
          bytes[idx + 7] === 0x66 &&
          bytes[idx + 8] === 0x00 &&
          bytes[idx + 9] === 0x00
        ) {
          return bytes.slice(idx, idx + 2 + length);
        }
      }
      idx += 2 + length;
    }
    return null;
  }

  /**
   * Injects an extracted APP1 EXIF segment into a JPEG Blob.
   */
  async injectExifIntoJpegBlob(jpegBlob: Blob, exifSegment: Uint8Array): Promise<Blob> {
    if (!exifSegment || exifSegment.length < 4) {
      return jpegBlob;
    }

    const arrayBuffer = await jpegBlob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Verify JPEG SOI
    if (bytes.length < 2 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
      return jpegBlob;
    }

    // Determine insertion position: right after SOI (2) or after JFIF APP0 (if present)
    let insertPos = 2;
    if (bytes.length > 4 && bytes[2] === 0xff && bytes[3] === 0xe0) {
      const app0Len = (bytes[4] << 8) | bytes[5];
      insertPos = 2 + 2 + app0Len;
    }

    // Check if new JPEG already has an empty/minimal APP1; if so, skip past it
    let skipLength = 0;
    if (bytes.length > insertPos + 4 && bytes[insertPos] === 0xff && bytes[insertPos + 1] === 0xe1) {
      skipLength = 2 + ((bytes[insertPos + 2] << 8) | bytes[insertPos + 3]);
    }

    const output = new Uint8Array(bytes.length - skipLength + exifSegment.length);
    // Part 1: before insertPos
    output.set(bytes.subarray(0, insertPos), 0);
    // Part 2: preserved EXIF segment
    output.set(exifSegment, insertPos);
    // Part 3: remainder
    output.set(bytes.subarray(insertPos + skipLength), insertPos + exifSegment.length);

    return new Blob([output], { type: 'image/jpeg' });
  }

  /**
   * Computes an accurate estimate of output file size based on dimensions, format, and quality.
   */
  estimateExportSize(
    width: number,
    height: number,
    format: ExportFormat,
    quality = 0.92,
    hasAlpha = false
  ): number {
    const totalPixels = width * height;
    if (totalPixels <= 0) return 0;

    switch (format) {
      case 'png':
        // Lossless deflate: typically 1.5 - 2.8 bytes per pixel for RGB/RGBA
        return Math.round(totalPixels * (hasAlpha ? 2.2 : 1.6));
      case 'jpg':
        // DCT compression: 0.15 - 0.9 bytes per pixel depending on quality
        const jpgBpp = 0.15 + (quality - 0.5) * 1.2;
        return Math.round(totalPixels * Math.max(0.12, jpgBpp));
      case 'webp':
        // WebP compression: typically 25% smaller than JPG
        const webpBpp = (0.12 + (quality - 0.5) * 0.9) * (hasAlpha ? 1.2 : 1.0);
        return Math.round(totalPixels * Math.max(0.1, webpBpp));
    }
  }

  private parseJpegExif(bytes: Uint8Array): {
    camera?: string;
    date?: string;
    orientation?: number;
    colorSpace?: string;
  } | null {
    let idx = 2;
    while (idx + 4 < bytes.length) {
      if (bytes[idx] !== 0xff) break;
      const marker = bytes[idx + 1];
      if (marker === 0xda) break;
      const length = (bytes[idx + 2] << 8) | bytes[idx + 3];

      if (marker === 0xe1 && bytes.length > idx + 10) {
        if (
          bytes[idx + 4] === 0x45 &&
          bytes[idx + 5] === 0x78 &&
          bytes[idx + 6] === 0x69 &&
          bytes[idx + 7] === 0x66 &&
          bytes[idx + 8] === 0x00 &&
          bytes[idx + 9] === 0x00
        ) {
          const tiffOffset = idx + 10;
          return this.readTiffHeader(bytes, tiffOffset);
        }
      }
      idx += 2 + length;
    }
    return null;
  }

  private readTiffHeader(bytes: Uint8Array, tiffOffset: number): {
    camera?: string;
    date?: string;
    orientation?: number;
    colorSpace?: string;
  } | null {
    if (tiffOffset + 8 >= bytes.length) return null;
    const isLe = bytes[tiffOffset] === 0x49 && bytes[tiffOffset + 1] === 0x49;
    const view = new DataView(bytes.buffer, bytes.byteOffset + tiffOffset, bytes.byteLength - tiffOffset);

    try {
      const firstIfdOffset = view.getUint32(4, isLe);
      if (firstIfdOffset + 2 > view.byteLength) return null;

      const numEntries = view.getUint16(firstIfdOffset, isLe);
      let cur = firstIfdOffset + 2;
      let orientation = 1;
      let camera = '';
      let date = '';

      for (let i = 0; i < numEntries; i++) {
        if (cur + 12 > view.byteLength) break;
        const tag = view.getUint16(cur, isLe);
        const type = view.getUint16(cur + 2, isLe);
        const count = view.getUint32(cur + 4, isLe);
        const valOffset = cur + 8;

        if (tag === 0x0112) {
          // Orientation
          orientation = view.getUint16(valOffset, isLe);
        } else if (tag === 0x0110 && count > 0) {
          // Model
          const strOffset = count <= 4 ? valOffset : view.getUint32(valOffset, isLe);
          if (strOffset + count <= view.byteLength) {
            camera = this.readAscii(view, strOffset, Math.min(count, 32));
          }
        } else if (tag === 0x0132 && count > 0) {
          // DateTime
          const strOffset = count <= 4 ? valOffset : view.getUint32(valOffset, isLe);
          if (strOffset + count <= view.byteLength) {
            date = this.readAscii(view, strOffset, Math.min(count, 20));
          }
        }
        cur += 12;
      }

      return {
        orientation,
        camera: camera || undefined,
        date: date || undefined,
        colorSpace: 'sRGB'
      };
    } catch {
      return null;
    }
  }

  private readAscii(view: DataView, offset: number, maxLen: number): string {
    let str = '';
    for (let i = 0; i < maxLen; i++) {
      const code = view.getUint8(offset + i);
      if (code === 0) break;
      str += String.fromCharCode(code);
    }
    return str.trim();
  }
}


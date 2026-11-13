// apps/tool-image-compressor/src/services/image-metadata.service.ts
import { Injectable } from '@angular/core';
import { ExifMetadataReport, MetadataPolicy } from '../models/compressor.models';

@Injectable({
  providedIn: 'root'
})
export class ImageMetadataService {

  /**
   * Reads raw bytes from a File and extracts EXIF metadata summary.
   */
  async inspectFileMetadata(file: File): Promise<ExifMetadataReport> {
    try {
      // Read first 128 KB which contains the entire EXIF APP1 header block
      const slice = file.slice(0, Math.min(file.size, 131072));
      const buffer = await slice.arrayBuffer();
      return this.extractMetadataFromBuffer(new Uint8Array(buffer));
    } catch {
      return this.emptyReport();
    }
  }

  /**
   * Pure binary parser for JPEG APP1 & TIFF EXIF structures.
   */
  extractMetadataFromBuffer(bytes: Uint8Array): ExifMetadataReport {
    const report: ExifMetadataReport = {
      hasExif: false,
      hasGps: false,
      fieldsDetected: [],
      fieldsRemoved: [],
      fieldsRetained: []
    };

    if (bytes.length < 8) return report;

    let tiffOffset = -1;

    // 1. Direct TIFF header (II or MM)
    if ((bytes[0] === 0x49 && bytes[1] === 0x49) || (bytes[0] === 0x4D && bytes[1] === 0x4D)) {
      tiffOffset = 0;
    } else if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
      // 2. JPEG format: Scan APP1 segment (0xFF 0xE1)
      let idx = 2;
      while (idx + 4 < bytes.length) {
        if (bytes[idx] !== 0xFF) break;
        const marker = bytes[idx + 1];
        if (marker === 0xDA) break; // Start of Scan
        const length = (bytes[idx + 2] << 8) | bytes[idx + 3];

        if (marker === 0xE1) {
          // Check for 'Exif\0\0' (0x45, 0x78, 0x69, 0x66, 0x00, 0x00)
          if (
            bytes[idx + 4] === 0x45 &&
            bytes[idx + 5] === 0x78 &&
            bytes[idx + 6] === 0x69 &&
            bytes[idx + 7] === 0x66 &&
            bytes[idx + 8] === 0x00 &&
            bytes[idx + 9] === 0x00
          ) {
            tiffOffset = idx + 10;
            break;
          }
        }
        idx += 2 + length;
      }
    }

    if (tiffOffset < 0 || tiffOffset + 8 >= bytes.length) {
      return report;
    }

    report.hasExif = true;

    try {
      const isLe = bytes[tiffOffset] === 0x49 && bytes[tiffOffset + 1] === 0x49;
      const view = new DataView(bytes.buffer, bytes.byteOffset + tiffOffset, bytes.byteLength - tiffOffset);

      const firstIfdOffset = view.getUint32(4, isLe);
      if (firstIfdOffset + 2 > view.byteLength) return report;

      const numEntries = view.getUint16(firstIfdOffset, isLe);
      let cur = firstIfdOffset + 2;
      let exifSubIfdOffset = 0;
      let gpsSubIfdOffset = 0;

      for (let i = 0; i < numEntries; i++) {
        if (cur + 12 > view.byteLength) break;
        const tag = view.getUint16(cur, isLe);
        const count = view.getUint32(cur + 4, isLe);
        const valOffset = cur + 8;

        if (tag === 0x0112) {
          report.orientation = view.getUint16(valOffset, isLe);
          report.fieldsDetected.push('Orientation');
        } else if (tag === 0x010F) {
          report.make = this.readAscii(view, valOffset, count);
          if (report.make) report.fieldsDetected.push('Camera Make');
        } else if (tag === 0x0110) {
          report.model = this.readAscii(view, valOffset, count);
          if (report.model) report.fieldsDetected.push('Camera Model');
        } else if (tag === 0x0132) {
          report.dateTime = this.readAscii(view, valOffset, count);
          if (report.dateTime) report.fieldsDetected.push('Date & Time');
        } else if (tag === 0x011A) {
          const rOffset = view.getUint32(valOffset, isLe);
          if (rOffset + 8 <= view.byteLength) {
            const num = view.getUint32(rOffset, isLe);
            const den = view.getUint32(rOffset + 4, isLe);
            if (den > 0) {
              report.dpi = Math.round(num / den);
              report.fieldsDetected.push('DPI Resolution');
            }
          }
        } else if (tag === 0x8825) {
          report.hasGps = true;
          gpsSubIfdOffset = view.getUint32(valOffset, isLe);
          report.fieldsDetected.push('GPS Location Coordinates');
        } else if (tag === 0x8769) {
          exifSubIfdOffset = view.getUint32(valOffset, isLe);
        }

        cur += 12;
      }

      // Read Exif SubIFD (Date & ColorSpace)
      if (exifSubIfdOffset > 0 && exifSubIfdOffset + 2 <= view.byteLength) {
        const subEntries = view.getUint16(exifSubIfdOffset, isLe);
        let subCur = exifSubIfdOffset + 2;
        for (let j = 0; j < subEntries; j++) {
          if (subCur + 12 > view.byteLength) break;
          const tag = view.getUint16(subCur, isLe);
          const count = view.getUint32(subCur + 4, isLe);
          const valOffset = subCur + 8;

          if (tag === 0x9003 && !report.dateTime) {
            report.dateTime = this.readAscii(view, valOffset, count);
            if (report.dateTime) report.fieldsDetected.push('Original Timestamp');
          } else if (tag === 0xA001) {
            const cs = view.getUint16(valOffset, isLe);
            report.colorProfile = cs === 1 ? 'sRGB' : (cs === 0xFFFF ? 'Uncalibrated / Wide' : 'Adobe RGB');
            report.fieldsDetected.push('Color Space');
          }
          subCur += 12;
        }
      }

      // Read GPS IFD coordinates if available
      if (gpsSubIfdOffset > 0 && gpsSubIfdOffset + 2 <= view.byteLength) {
        const gpsEntries = view.getUint16(gpsSubIfdOffset, isLe);
        let gpsCur = gpsSubIfdOffset + 2;
        let latRef = 'N';
        let lonRef = 'E';

        for (let k = 0; k < gpsEntries; k++) {
          if (gpsCur + 12 > view.byteLength) break;
          const tag = view.getUint16(gpsCur, isLe);
          const valOffset = gpsCur + 8;

          if (tag === 0x0001) {
            latRef = String.fromCharCode(view.getUint8(valOffset));
          } else if (tag === 0x0002) {
            // Latitude Rational triplet: deg, min, sec
            report.latitude = this.readRationalCoord(view, valOffset, isLe, latRef === 'S');
          } else if (tag === 0x0003) {
            lonRef = String.fromCharCode(view.getUint8(valOffset));
          } else if (tag === 0x0004) {
            // Longitude Rational triplet
            report.longitude = this.readRationalCoord(view, valOffset, isLe, lonRef === 'W');
          } else if (tag === 0x0006) {
            // Altitude
            const rOffset = view.getUint32(valOffset, isLe);
            if (rOffset + 8 <= view.byteLength) {
              const num = view.getUint32(rOffset, isLe);
              const den = view.getUint32(rOffset + 4, isLe);
              if (den > 0) report.altitude = Math.round(num / den);
            }
          }
          gpsCur += 12;
        }
      }
    } catch {
      // Graceful error recovery on malformed EXIF data
    }

    return report;
  }

  /**
   * Applies metadata policy to the output blob.
   * If policy is 'remove', metadata was already discarded by Canvas encoding.
   * If policy is 'strip-gps' and the format is JPEG, strips GPS tags while preserving camera info.
   */
  async processOutputMetadata(
    outputBlob: Blob,
    format: string,
    policy: MetadataPolicy,
    originalReport?: ExifMetadataReport
  ): Promise<{
    blob: Blob;
    metadataReport: ExifMetadataReport;
  }> {
    const report: ExifMetadataReport = originalReport ? { ...originalReport } : this.emptyReport();

    if (policy === 'remove') {
      report.fieldsRemoved = [...report.fieldsDetected];
      report.fieldsRetained = [];
      return { blob: outputBlob, metadataReport: report };
    }

    if (policy === 'strip-gps') {
      report.fieldsRemoved = report.fieldsDetected.filter(f => f.includes('GPS'));
      report.fieldsRetained = report.fieldsDetected.filter(f => !f.includes('GPS'));

      if (format === 'jpeg' || format === 'jpg') {
        const buffer = await outputBlob.arrayBuffer();
        const stripped = this.stripGpsFromJpeg(new Uint8Array(buffer));
        const cleanBuffer = stripped.buffer.slice(stripped.byteOffset, stripped.byteOffset + stripped.byteLength) as ArrayBuffer;
        return {
          blob: new Blob([cleanBuffer], { type: outputBlob.type }),
          metadataReport: report
        };
      }
      return { blob: outputBlob, metadataReport: report };
    }

    // Preserve
    report.fieldsRemoved = [];
    report.fieldsRetained = [...report.fieldsDetected];
    return { blob: outputBlob, metadataReport: report };
  }

  /**
   * Strips GPS metadata pointer (tag 0x8825) from JPEG APP1 segments.
   */
  stripGpsFromJpeg(bytes: Uint8Array): Uint8Array {
    if (bytes.length < 4 || bytes[0] !== 0xFF || bytes[1] !== 0xD8) {
      return bytes;
    }

    const copy = new Uint8Array(bytes);
    let idx = 2;
    while (idx + 4 < copy.length) {
      if (copy[idx] !== 0xFF) break;
      const marker = copy[idx + 1];
      if (marker === 0xDA) break;
      const length = (copy[idx + 2] << 8) | copy[idx + 3];

      if (marker === 0xE1) {
        const segEnd = Math.min(copy.length, idx + 2 + length);
        for (let j = idx + 10; j <= segEnd - 4; j += 2) {
          if ((copy[j] === 0x25 && copy[j + 1] === 0x88) || (copy[j] === 0x88 && copy[j + 1] === 0x25)) {
            copy[j] = 0x00;
            copy[j + 1] = 0x00;
            copy[j + 2] = 0x00;
            copy[j + 3] = 0x00;
          }
        }
      }
      idx += 2 + length;
    }

    return copy;
  }

  /**
   * Strips all metadata segments (APP1-APP15, COM) from a JPEG buffer.
   */
  stripAllMetadataFromJpeg(bytes: Uint8Array): Uint8Array {
    if (bytes.length < 4 || bytes[0] !== 0xFF || bytes[1] !== 0xD8) {
      return bytes;
    }

    const segments: Uint8Array[] = [bytes.subarray(0, 2)]; // FF D8
    let idx = 2;

    while (idx + 4 < bytes.length) {
      if (bytes[idx] !== 0xFF) break;
      const marker = bytes[idx + 1];
      if (marker === 0xDA) {
        segments.push(bytes.subarray(idx));
        break;
      }

      const length = (bytes[idx + 2] << 8) | bytes[idx + 3];
      // Skip APP1-APP15 (0xE1-0xEF) and Comments (0xFE)
      if ((marker >= 0xE1 && marker <= 0xEF) || marker === 0xFE) {
        idx += 2 + length;
        continue;
      }

      segments.push(bytes.subarray(idx, idx + 2 + length));
      idx += 2 + length;
    }

    const totalLen = segments.reduce((sum, s) => sum + s.length, 0);
    const result = new Uint8Array(totalLen);
    let offset = 0;
    for (const seg of segments) {
      result.set(seg, offset);
      offset += seg.length;
    }
    return result;
  }

  private readAscii(view: DataView, offsetOrPointer: number, count: number): string {
    if (count <= 0) return '';
    const actualOffset = count <= 4 ? offsetOrPointer : view.getUint32(offsetOrPointer, true);
    if (actualOffset + count > view.byteLength) return '';
    let result = '';
    for (let i = 0; i < count; i++) {
      const code = view.getUint8(actualOffset + i);
      if (code === 0) break;
      result += String.fromCharCode(code);
    }
    return result.trim();
  }

  private readRationalCoord(view: DataView, pointerOffset: number, isLe: boolean, isNegative: boolean): number {
    try {
      const rOffset = view.getUint32(pointerOffset, isLe);
      if (rOffset + 24 <= view.byteLength) {
        const degNum = view.getUint32(rOffset, isLe);
        const degDen = view.getUint32(rOffset + 4, isLe);
        const minNum = view.getUint32(rOffset + 8, isLe);
        const minDen = view.getUint32(rOffset + 12, isLe);
        const secNum = view.getUint32(rOffset + 16, isLe);
        const secDen = view.getUint32(rOffset + 20, isLe);

        const deg = degDen > 0 ? degNum / degDen : 0;
        const min = minDen > 0 ? minNum / minDen : 0;
        const sec = secDen > 0 ? secNum / secDen : 0;

        let val = deg + min / 60 + sec / 3600;
        if (isNegative) val = -val;
        return Math.round(val * 1000000) / 1000000;
      }
    } catch {
      // Fallback
    }
    return 0;
  }

  private emptyReport(): ExifMetadataReport {
    return {
      hasExif: false,
      hasGps: false,
      fieldsDetected: [],
      fieldsRemoved: [],
      fieldsRetained: []
    };
  }
}

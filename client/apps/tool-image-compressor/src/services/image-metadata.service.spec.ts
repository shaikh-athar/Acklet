// apps/tool-image-compressor/src/services/image-metadata.service.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ImageMetadataService } from './image-metadata.service';
import { ExifMetadataReport } from '../models/compressor.models';

describe('ImageMetadataService', () => {
  let service: ImageMetadataService;

  beforeEach(() => {
    service = new ImageMetadataService();
  });

  it('should be created', () => {
    expect(service).toBeDefined();
  });

  it('should return empty report for buffers shorter than 8 bytes', () => {
    const report = service.extractMetadataFromBuffer(new Uint8Array([0, 1, 2, 3]));
    expect(report.hasExif).toBe(false);
    expect(report.hasGps).toBe(false);
    expect(report.fieldsDetected).toEqual([]);
  });

  it('should return empty report for non-EXIF JPEG', () => {
    // SOI + EOI
    const bytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xD9, 0, 0, 0, 0]);
    const report = service.extractMetadataFromBuffer(bytes);
    expect(report.hasExif).toBe(false);
  });

  it('should parse synthetic TIFF EXIF structure with camera and GPS data', () => {
    // Construct a minimal valid Little-Endian TIFF header with 2 IFD entries
    // Header: 'II' (0x49, 0x49), 42 (0x2A, 0x00), offset to IFD = 8
    const buffer = new ArrayBuffer(128);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // TIFF Header (Little Endian)
    bytes[0] = 0x49;
    bytes[1] = 0x49;
    view.setUint16(2, 42, true);
    view.setUint32(4, 8, true); // First IFD at offset 8

    // First IFD: 2 entries
    view.setUint16(8, 2, true);

    // Entry 1: Tag 0x0112 (Orientation), SHORT, count 1, value 6 (Rotated 90 CW)
    view.setUint16(10, 0x0112, true);
    view.setUint16(12, 3, true); // SHORT
    view.setUint32(14, 1, true);
    view.setUint16(18, 6, true);

    // Entry 2: Tag 0x8825 (GPS IFD Pointer), LONG, count 1, offset 40
    view.setUint16(22, 0x8825, true);
    view.setUint16(24, 4, true); // LONG
    view.setUint32(26, 1, true);
    view.setUint32(30, 40, true);

    // GPS IFD at offset 40: 1 entry
    view.setUint16(40, 1, true);
    // Entry: Tag 0x0001 (GPSLatitudeRef), ASCII, count 2, value 'N\0'
    view.setUint16(42, 0x0001, true);
    view.setUint16(44, 2, true);
    view.setUint32(46, 2, true);
    bytes[50] = 0x4E; // 'N'
    bytes[51] = 0x00;

    const report = service.extractMetadataFromBuffer(bytes);
    expect(report.hasExif).toBe(true);
    expect(report.orientation).toBe(6);
    expect(report.hasGps).toBe(true);
    expect(report.fieldsDetected).toContain('Orientation');
    expect(report.fieldsDetected).toContain('GPS Location Coordinates');
  });

  describe('processOutputMetadata', () => {
    const sampleReport: ExifMetadataReport = {
      hasExif: true,
      hasGps: true,
      fieldsDetected: ['Camera Make', 'Date & Time', 'GPS Location Coordinates'],
      fieldsRemoved: [],
      fieldsRetained: []
    };

    it('should strip all metadata when policy is "remove"', async () => {
      const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' });
      const result = await service.processOutputMetadata(blob, 'jpeg', 'remove', sampleReport);

      expect(result.metadataReport.fieldsRemoved).toEqual(sampleReport.fieldsDetected);
      expect(result.metadataReport.fieldsRetained).toEqual([]);
    });

    it('should strip GPS only when policy is "strip-gps"', async () => {
      // JPEG with SOI + APP1 containing GPS pointer (0x8825)
      const jpegBytes = new Uint8Array([
        0xFF, 0xD8, // SOI
        0xFF, 0xE1, 0x00, 0x16, // APP1 length 22
        0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // 'Exif\0\0'
        0x49, 0x49, 0x2A, 0x00, // II 42
        0x08, 0x00, 0x00, 0x00,
        0x25, 0x88, 0x00, 0x00 // GPS pointer (little endian 0x8825)
      ]);

      const blob = new Blob([jpegBytes], { type: 'image/jpeg' });
      const result = await service.processOutputMetadata(blob, 'jpeg', 'strip-gps', sampleReport);

      expect(result.metadataReport.fieldsRemoved).toContain('GPS Location Coordinates');
      expect(result.metadataReport.fieldsRetained).toContain('Camera Make');
      expect(result.metadataReport.fieldsRetained).toContain('Date & Time');

      // Verify binary zeroing
      const strippedBuf = new Uint8Array(await result.blob.arrayBuffer());
      expect(strippedBuf[20]).toBe(0x00);
      expect(strippedBuf[21]).toBe(0x00);
    });

    it('should preserve all metadata when policy is "preserve"', async () => {
      const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' });
      const result = await service.processOutputMetadata(blob, 'jpeg', 'preserve', sampleReport);

      expect(result.metadataReport.fieldsRemoved).toEqual([]);
      expect(result.metadataReport.fieldsRetained).toEqual(sampleReport.fieldsDetected);
    });
  });

  describe('stripAllMetadataFromJpeg', () => {
    it('should remove APP1 and COM segments while retaining SOI and SOS', () => {
      const bytes = new Uint8Array([
        0xFF, 0xD8, // SOI
        0xFF, 0xE1, 0x00, 0x04, 0xAA, 0xBB, // APP1 length 4
        0xFF, 0xFE, 0x00, 0x04, 0xCC, 0xDD, // COM length 4
        0xFF, 0xDA, 0x00, 0x02, // SOS
        0x12, 0x34 // Image payload
      ]);

      const stripped = service.stripAllMetadataFromJpeg(bytes);
      expect(stripped[0]).toBe(0xFF);
      expect(stripped[1]).toBe(0xD8); // SOI retained
      // Check that APP1 (0xE1) and COM (0xFE) are removed
      const hasApp1 = stripped.some((b, idx) => b === 0xFF && stripped[idx + 1] === 0xE1);
      const hasCom = stripped.some((b, idx) => b === 0xFF && stripped[idx + 1] === 0xFE);
      expect(hasApp1).toBe(false);
      expect(hasCom).toBe(false);
      // SOS retained
      const hasSos = stripped.some((b, idx) => b === 0xFF && stripped[idx + 1] === 0xDA);
      expect(hasSos).toBe(true);
    });
  });
});


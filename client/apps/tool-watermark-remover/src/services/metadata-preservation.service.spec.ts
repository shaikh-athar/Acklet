// apps/tool-watermark-remover/src/services/metadata-preservation.service.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { MetadataPreservationService } from './metadata-preservation.service';

describe('MetadataPreservationService', () => {
  let service: MetadataPreservationService;

  beforeEach(() => {
    service = new MetadataPreservationService();
  });

  it('should detect transparency correctly in ImageData', () => {
    // 2x2 fully opaque image (alpha = 255)
    const opaqueData = new Uint8ClampedArray([
      255, 0, 0, 255,   0, 255, 0, 255,
      0, 0, 255, 255,   255, 255, 255, 255
    ]);
    const opaqueImg = { data: opaqueData, width: 2, height: 2, colorSpace: 'srgb' } as ImageData;
    expect(service.hasTransparency(opaqueImg)).toBe(false);

    // 2x2 with one transparent pixel (alpha = 0)
    const transData = new Uint8ClampedArray([
      255, 0, 0, 255,   0, 255, 0, 0,
      0, 0, 255, 255,   255, 255, 255, 255
    ]);
    const transImg = { data: transData, width: 2, height: 2, colorSpace: 'srgb' } as ImageData;
    expect(service.hasTransparency(transImg)).toBe(true);
  });

  it('should inspect image integrity for JPEG, PNG, and WebP magic bytes', () => {
    // Valid JPEG mock
    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const jpegReport = service.inspectIntegrity(jpegBytes);
    expect(jpegReport.isValid).toBe(true);
    expect(jpegReport.format).toBe('jpeg');

    // Valid PNG mock (RGBA with colorType 6)
    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00,
      0x08, 0x06, 0x00, 0x00, 0x00
    ]);
    const pngReport = service.inspectIntegrity(pngBytes);
    expect(pngReport.isValid).toBe(true);
    expect(pngReport.format).toBe('png');
    expect(pngReport.hasAlpha).toBe(true);

    // Corrupted buffer
    const badBytes = new Uint8Array([0x00, 0x11, 0x22, 0x33]);
    const badReport = service.inspectIntegrity(badBytes);
    expect(badReport.isValid).toBe(false);
    expect(badReport.format).toBe('unknown');
  });

  it('should extract and inject APP1 EXIF segment into a JPEG Blob', async () => {
    // Construct mock JPEG with APP1 EXIF segment
    const exifPayload = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x49, 0x49, 0x2a, 0x00];
    const segmentLen = exifPayload.length + 2; // len field includes itself
    const app1Segment = [0xff, 0xe1, (segmentLen >> 8) & 0xff, segmentLen & 0xff, ...exifPayload];

    const sourceJpeg = new Uint8Array([0xff, 0xd8, ...app1Segment, 0xff, 0xda, 0x00, 0x00]);

    const extracted = service.extractExifSegment(sourceJpeg);
    expect(extracted).not.toBeNull();
    expect(extracted![0]).toBe(0xff);
    expect(extracted![1]).toBe(0xe1);

    // Clean destination JPEG blob without EXIF
    const destJpeg = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0x00, 0x00])], { type: 'image/jpeg' });
    const injectedBlob = await service.injectExifIntoJpegBlob(destJpeg, extracted!);

    expect(injectedBlob.type).toBe('image/jpeg');
    const resultBuffer = new Uint8Array(await injectedBlob.arrayBuffer());
    expect(resultBuffer[0]).toBe(0xff);
    expect(resultBuffer[1]).toBe(0xd8);
    expect(resultBuffer[2]).toBe(0xff);
    expect(resultBuffer[3]).toBe(0xe1);
  });

  it('should estimate output file size accurately across formats', () => {
    const pngSize = service.estimateExportSize(1000, 1000, 'png', 0.9, true);
    const jpgSize = service.estimateExportSize(1000, 1000, 'jpg', 0.9, false);
    const webpSize = service.estimateExportSize(1000, 1000, 'webp', 0.9, false);

    expect(pngSize).toBeGreaterThan(1000000); // ~2.2 MB for RGBA
    expect(jpgSize).toBeGreaterThan(400000);  // ~630 KB for 90% JPG
    expect(webpSize).toBeLessThan(jpgSize);   // WebP typically smaller than JPG
  });
});


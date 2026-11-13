// apps/tool-watermark-remover/src/services/export.service.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { ExportService } from './export.service';
import { MetadataPreservationService } from './metadata-preservation.service';

describe('ExportService (Phase 5 Export & Metadata)', () => {
  let service: ExportService;

  beforeEach(() => {
    const injector = createEnvironmentInjector([MetadataPreservationService, ExportService]);
    service = runInInjectionContext(injector, () => new ExportService());
  });

  it('estimates export size across formats', () => {
    const pngSize = service.estimateSize(1000, 1000, 'png');
    const jpgSize = service.estimateSize(1000, 1000, 'jpg', 0.85);
    const webpSize = service.estimateSize(1000, 1000, 'webp', 0.85);

    expect(pngSize).toBeGreaterThan(jpgSize);
    expect(jpgSize).toBeGreaterThan(webpSize);
    expect(webpSize).toBeGreaterThan(0);
  });

  it('preserves metadata when exporting to JPEG if buffer has EXIF', async () => {
    const fakeBlob = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43])], { type: 'image/jpeg' });
    const originalDocument = (globalThis as any).document;

    const fakeDoc = {
      createElement: vi.fn().mockImplementation((tagName: string) => {
        if (tagName === 'canvas') {
          return {
            width: 10,
            height: 10,
            getContext: vi.fn().mockReturnValue({
              putImageData: vi.fn(),
              fillStyle: '',
              fillRect: vi.fn(),
              drawImage: vi.fn()
            }),
            toBlob: (cb: (b: Blob | null) => void) => cb(fakeBlob)
          };
        }
        return {};
      })
    };

    (globalThis as any).document = fakeDoc;

    try {
      // Sample JPEG with APP1 Exif
      const sampleExif = new Uint8Array([
        0xff, 0xd8,
        0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
        0xff, 0xd9
      ]);

      const fakeImageData = {
        width: 10,
        height: 10,
        data: new Uint8ClampedArray(400)
      } as ImageData;

      const resultBlob = await service.exportToBlob(
        fakeImageData,
        { format: 'jpg', preserveMetadata: true },
        sampleExif.buffer
      );

      expect(resultBlob).toBeDefined();
      expect(resultBlob.size).toBeGreaterThan(fakeBlob.size);
    } finally {
      (globalThis as any).document = originalDocument;
    }
  });
});

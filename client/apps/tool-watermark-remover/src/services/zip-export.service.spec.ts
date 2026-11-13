// apps/tool-watermark-remover/src/services/zip-export.service.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { ZipExportService, ZipItem } from './zip-export.service';
import { ExportService } from './export.service';
import { MetadataPreservationService } from './metadata-preservation.service';

describe('ZipExportService', () => {
  const envInjector = createEnvironmentInjector([MetadataPreservationService, ExportService, ZipExportService]);
  let service: ZipExportService;
  let mockExportService: Partial<ExportService>;

  beforeEach(() => {
    mockExportService = {
      exportToBlob: vi.fn().mockResolvedValue(new Blob(['test-image-data'], { type: 'image/png' }))
    };

    service = runInInjectionContext(envInjector, () => new ZipExportService());
    (service as any).exportService = mockExportService;
  });

  it('should resolve collision-free filenames correctly', () => {
    const usedNames = new Set<string>();

    const name1 = service.resolveUniqueFilename('sample.png', 'png', usedNames);
    expect(name1).toBe('sample-cleaned.png');

    const name2 = service.resolveUniqueFilename('sample.jpg', 'png', usedNames);
    expect(name2).toBe('sample-cleaned-1.png');

    const name3 = service.resolveUniqueFilename('sample.png', 'webp', usedNames);
    expect(name3).toBe('sample-cleaned.webp');

    const name4 = service.resolveUniqueFilename('sample.png', 'webp', usedNames);
    expect(name4).toBe('sample-cleaned-1.webp');
  });

  it('should throw an error if items array is empty', async () => {
    await expect(service.createZip([])).rejects.toThrow('No items provided for ZIP export.');
  });

  it('should package items into a valid ZIP Blob and report progress', async () => {
    const items: ZipItem[] = [
      {
        id: 'item-1',
        name: 'photo1.png',
        blob: new Blob(['mock-binary-1'], { type: 'image/png' }),
        format: 'png'
      },
      {
        id: 'item-2',
        name: 'photo2.jpg',
        blob: new Blob(['mock-binary-2'], { type: 'image/jpeg' }),
        format: 'jpg'
      }
    ];

    const progressReports: number[] = [];
    const zipBlob = await service.createZip(items, (p) => {
      progressReports.push(p.percent);
    });

    expect(zipBlob).toBeInstanceOf(Blob);
    expect(zipBlob.size).toBeGreaterThan(0);
    expect(progressReports.length).toBeGreaterThan(0);
    expect(progressReports[progressReports.length - 1]).toBe(100);
  });

  it('should download a zip file via anchor click in browser environment', async () => {
    const fakeAnchor = { href: '', download: '', click: vi.fn() };
    const fakeDoc = {
      createElement: vi.fn().mockReturnValue(fakeAnchor),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn()
      }
    };
    const originalDocument = (globalThis as any).document;
    const originalURL = (globalThis as any).URL;

    (globalThis as any).document = fakeDoc;
    (globalThis as any).URL = {
      createObjectURL: vi.fn().mockReturnValue('blob:mock-zip'),
      revokeObjectURL: vi.fn()
    };

    const items: ZipItem[] = [
      {
        id: 'item-1',
        name: 'photo.png',
        blob: new Blob(['data'], { type: 'image/png' })
      }
    ];

    try {
      await service.downloadZip(items, 'test-batch.zip');

      expect(fakeDoc.createElement).toHaveBeenCalledWith('a');
      expect(fakeDoc.body.appendChild).toHaveBeenCalled();
      expect(fakeAnchor.click).toHaveBeenCalled();
      expect(fakeDoc.body.removeChild).toHaveBeenCalled();
    } finally {
      (globalThis as any).document = originalDocument;
      (globalThis as any).URL = originalURL;
    }
  });
});

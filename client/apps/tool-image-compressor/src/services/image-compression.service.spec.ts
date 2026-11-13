// apps/tool-image-compressor/src/services/image-compression.service.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { ImageCompressionService } from './image-compression.service';
import { ImageItem } from '../models/compressor.models';
import { DEFAULT_COMPRESSION_SETTINGS } from './compressor-state.service';

describe('ImageCompressionService', () => {
  const service = new ImageCompressionService();

  function createMockImageItem(size = 50000): ImageItem {
    const file = new File(['mock-content-for-compression-testing'], 'photo.png', {
      type: 'image/png'
    });
    return {
      id: 'img_test_1',
      file,
      originalName: 'photo.png',
      nameWithoutExt: 'photo',
      originalExtension: 'png',
      detectedFormat: 'png',
      mimeType: 'image/png',
      originalSize: size,
      width: 800,
      height: 600,
      aspectRatio: 800 / 600,
      previewUrl: 'blob:mock-url',
      selected: false,
      status: 'ready',
      capabilities: {
        fileAccepted: true,
        previewSupported: true,
        compressionSupported: true,
        description: 'PNG image'
      },
      individualSettings: { hasCustomSettings: false },
      effectiveSettings: { ...DEFAULT_COMPRESSION_SETTINGS },
      addedAt: Date.now()
    };
  }

  it('runs compression pipeline and returns genuine CompressionResult', async () => {
    // In node/vitest environment, createImageBitmap might not exist; mock decoder.decodeFile if needed
    const item = createMockImageItem(20000);
    const updates: any[] = [];

    // Spy or mock decodeFile to return test canvas
    const decoder = (service as any).decoder;
    vi.spyOn(decoder, 'decodeFile').mockResolvedValue({
      canvas: decoder.createCanvas(800, 600).canvas,
      ctx: decoder.createCanvas(800, 600).ctx,
      width: 800,
      height: 600,
      objectUrlToRevoke: null
    });

    const result = await service.compressImage(item, u => updates.push(u));

    expect(result).toBeDefined();
    expect(result.imageId).toBe('img_test_1');
    expect(result.originalSize).toBe(20000);
    expect(result.compressedSize).toBeGreaterThan(0);
    expect(result.outputFilename).toBe('photo.png');
    expect(result.status).toBe('completed');
    expect(updates.length).toBeGreaterThanOrEqual(3);
    expect(updates[updates.length - 1].stage).toBe('completed');
  });

  it('handles cancellation via AbortSignal', async () => {
    const item = createMockImageItem();
    const controller = new AbortController();
    controller.abort();

    await expect(
      service.compressImage(item, undefined, controller.signal)
    ).rejects.toThrow('Compression cancelled by user.');
  });
});


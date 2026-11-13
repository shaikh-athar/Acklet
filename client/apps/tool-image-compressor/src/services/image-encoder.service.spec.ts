// apps/tool-image-compressor/src/services/image-encoder.service.spec.ts
import { describe, it, expect } from 'vitest';
import { ImageEncoderService } from './image-encoder.service';
import { ImageDecoderService } from './image-decoder.service';

describe('ImageEncoderService', () => {
  const decoder = new ImageDecoderService();
  const service = new ImageEncoderService();

  it('encodes canvas into an EncodedImageOutput object with blob and size', async () => {
    const { canvas } = decoder.createCanvas(100, 100);
    const output = await service.encode(canvas, 'image/jpeg', 80);
    expect(output).toBeDefined();
    expect(output.blob).toBeDefined();
    expect(output.size).toBeGreaterThan(0);
    expect(output.mimeType).toBe('image/jpeg');
  });

  it('aborts cleanly when signal is already cancelled', async () => {
    const { canvas } = decoder.createCanvas(100, 100);
    const controller = new AbortController();
    controller.abort();

    await expect(
      service.encode(canvas, 'image/png', 100, controller.signal)
    ).rejects.toThrow('Image encoding cancelled by user.');
  });

  it('encodes with advanced cleanTransparency and chromaSubsampling options', async () => {
    const { canvas, ctx } = decoder.createCanvas(50, 50);
    // Draw some transparent pixel with RGB noise
    const imgData = ctx.createImageData(50, 50);
    for (let i = 0; i < 50 * 50 * 4; i += 4) {
      imgData.data[i] = 120;
      imgData.data[i + 1] = 150;
      imgData.data[i + 2] = 200;
      imgData.data[i + 3] = 0; // Fully transparent
    }
    ctx.putImageData(imgData, 0, 0);

    const output = await service.encode(canvas, 'image/webp', 80, undefined, {
      cleanTransparency: true,
      chromaSubsampling: '4:4:4'
    });
    expect(output).toBeDefined();
    expect(output.blob).toBeDefined();
  });
});


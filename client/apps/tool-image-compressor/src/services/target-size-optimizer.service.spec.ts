// apps/tool-image-compressor/src/services/target-size-optimizer.service.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { TargetSizeOptimizerService } from './target-size-optimizer.service';
import { ImageDecoderService } from './image-decoder.service';

describe('TargetSizeOptimizerService', () => {
  let optimizer: TargetSizeOptimizerService;
  let decoder: ImageDecoderService;

  beforeEach(() => {
    decoder = new ImageDecoderService();
    optimizer = new TargetSizeOptimizerService();
  });

  it('reports target unreachable for PNG if lossless size exceeds target bytes', async () => {
    const { canvas } = decoder.createCanvas(100, 100);
    const result = await optimizer.searchOptimalQuality(
      canvas,
      'image/png',
      10 // 10 bytes target (impossible for PNG)
    );

    expect(result.iterationsCount).toBe(1);
    expect(result.targetAchieved).toBe(false);
    expect(result.targetUnreachable).toBe(true);
    expect(result.warning).toContain('Lossless PNG');
  });

  it('halts immediately at pass 1 when quality floor exceeds target bytes', async () => {
    const { canvas } = decoder.createCanvas(200, 200);
    const result = await optimizer.searchOptimalQuality(
      canvas,
      'image/jpeg',
      5 // 5 bytes target (impossible)
    );

    expect(result.iterationsCount).toBe(1);
    expect(result.targetAchieved).toBe(false);
    expect(result.targetUnreachable).toBe(true);
    expect(result.warning).toContain('unreachable at current resolution');
  });

  it('satisfies high quality ceiling in 2 passes when target budget is generous', async () => {
    const { canvas } = decoder.createCanvas(50, 50);
    const result = await optimizer.searchOptimalQuality(
      canvas,
      'image/jpeg',
      5 * 1024 * 1024 // 5 MB target
    );

    expect(result.iterationsCount).toBe(2);
    expect(result.targetAchieved).toBe(true);
    expect(result.targetUnreachable).toBe(false);
    expect(result.optimalQuality).toBe(92);
  });

  it('aborts cleanly when abortSignal is triggered', async () => {
    const { canvas } = decoder.createCanvas(50, 50);
    const controller = new AbortController();
    controller.abort();

    await expect(
      optimizer.searchOptimalQuality(
        canvas,
        'image/jpeg',
        50000,
        25,
        6,
        undefined,
        controller.signal
      )
    ).rejects.toThrow('Target size optimization cancelled by user.');
  });

  it('guarantees output size does not exceed target bytes when target is achieved via quality search', async () => {
    const { canvas } = decoder.createCanvas(80, 80);
    const targetBytes = 2500;
    const result = await optimizer.searchOptimalQuality(
      canvas,
      'image/jpeg',
      targetBytes,
      15
    );

    if (result.targetAchieved) {
      expect(result.optimalBlob.size).toBeLessThanOrEqual(targetBytes);
      expect(result.targetUnreachable).toBe(false);
    }
  });

  it('adaptively downscales canvas dimensions to meet aggressive target limits', async () => {
    const { canvas } = decoder.createCanvas(100, 100);
    // BMP at 100x100 is ~40,054 bytes. Set target to 15,000 bytes.
    const targetBytes = 15000;
    const result = await optimizer.searchOptimalQuality(
      canvas,
      'image/bmp',
      targetBytes,
      15,
      8,
      undefined,
      undefined,
      true // allowAdaptiveDownscale
    );

    expect(result.targetAchieved).toBe(true);
    expect(result.optimalBlob.size).toBeLessThanOrEqual(targetBytes);
    expect(result.optimalWidth).toBeLessThan(100);
    expect(result.targetUnreachable).toBe(false);
  });
});


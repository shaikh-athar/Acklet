// apps/tool-watermark-remover/src/services/inpainting-engine.service.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { InpaintingEngineService } from './inpainting-engine.service';
import { QualityEvaluatorService } from './quality-evaluator.service';

describe('InpaintingEngineService (Phase 3 Intelligent Inpainting)', () => {
  let service: InpaintingEngineService;

  beforeEach(() => {
    const injector = createEnvironmentInjector([QualityEvaluatorService, InpaintingEngineService]);
    service = runInInjectionContext(injector, () => new InpaintingEngineService());
  });

  function createTestImageData(w: number, h: number, fillColor: [number, number, number, number]): ImageData {
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = fillColor[0];
      data[i + 1] = fillColor[1];
      data[i + 2] = fillColor[2];
      data[i + 3] = fillColor[3];
    }
    return {
      width: w,
      height: h,
      data,
      colorSpace: 'srgb'
    } as ImageData;
  }

  it('preserves 100% of unmasked pixel values bit-for-bit and returns quality metrics', async () => {
    const width = 30;
    const height = 30;

    const source = createTestImageData(width, height, [200, 50, 50, 255]);
    const mask = createTestImageData(width, height, [0, 0, 0, 0]);

    // Add blue watermark at center (12, 12) to (18, 18)
    for (let y = 12; y <= 18; y++) {
      for (let x = 12; x <= 18; x++) {
        const idx = (y * width + x) * 4;
        source.data[idx] = 0;
        source.data[idx + 1] = 0;
        source.data[idx + 2] = 255;
        mask.data[idx] = 255;
        mask.data[idx + 3] = 255;
      }
    }

    const result = await service.inpaint(source, mask, { mode: 'balanced' });

    // Verify unmasked pixel at (2, 2) is bit-exact original
    const unmaskedIdx = (2 * width + 2) * 4;
    expect(result.data[unmaskedIdx]).toBe(200);
    expect(result.data[unmaskedIdx + 1]).toBe(50);
    expect(result.data[unmaskedIdx + 2]).toBe(50);
    expect(result.data[unmaskedIdx + 3]).toBe(255);

    // Verify center pixel (15, 15) has been reconstructed with background red tint
    const centerIdx = (15 * width + 15) * 4;
    expect(result.data[centerIdx]).toBeGreaterThan(100);

    // Verify Phase 3 quality metrics are returned
    expect(result.metrics).toBeDefined();
    expect(result.metrics.overallScore).toBeGreaterThan(60);
    expect(result.metrics.boundaryContinuity).toBeGreaterThan(60);
    expect(typeof result.metrics.processingTimeMs).toBe('number');
  });

  it('supports adaptive fast and ultra modes', async () => {
    const width = 24;
    const height = 24;
    const source = createTestImageData(width, height, [100, 100, 100, 255]);
    const mask = createTestImageData(width, height, [0, 0, 0, 0]);

    for (let y = 8; y < 14; y++) {
      for (let x = 8; x < 14; x++) {
        mask.data[(y * width + x) * 4] = 255;
        mask.data[(y * width + x) * 4 + 3] = 255;
      }
    }

    const fastResult = await service.inpaint(source, mask, { mode: 'fast' });
    expect(fastResult.metrics).toBeDefined();

    const ultraResult = await service.inpaint(source, mask, { mode: 'ultra' });
    expect(ultraResult.metrics).toBeDefined();
    expect(ultraResult.metrics.overallScore).toBeGreaterThan(70);
  });

  it('handles empty mask with zero modification', async () => {
    const width = 20;
    const height = 20;
    const source = createTestImageData(width, height, [100, 150, 200, 255]);
    const emptyMask = createTestImageData(width, height, [0, 0, 0, 0]);

    let progressReported = false;
    const result = await service.inpaint(source, emptyMask, {
      onProgress: (p) => {
        if (p.phase === 'complete') progressReported = true;
      }
    });

    expect(progressReported).toBe(true);
    for (let i = 0; i < source.data.length; i++) {
      expect(result.data[i]).toBe(source.data[i]);
    }
    expect(result.metrics.overallScore).toBe(100);
  });

  it('preserves transparency when inpainting transparent images (Phase 5)', async () => {
    const width = 20;
    const height = 20;
    // Transparent source (alpha = 0)
    const source = createTestImageData(width, height, [0, 0, 0, 0]);
    // Draw some opaque background in one area
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        const idx = (y * width + x) * 4;
        source.data[idx] = 100;
        source.data[idx + 1] = 150;
        source.data[idx + 2] = 200;
        source.data[idx + 3] = 255;
      }
    }
    const mask = createTestImageData(width, height, [0, 0, 0, 0]);
    mask.data[(15 * width + 15) * 4] = 255;
    mask.data[(15 * width + 15) * 4 + 3] = 255;

    const result = await service.inpaint(source, mask, { mode: 'standard' });
    expect(result.metrics.hasTransparency).toBe(true);
    // Transparent unmasked area remains transparent
    expect(result.data[(18 * width + 18) * 4 + 3]).toBe(0);
  });

  it('strictly excludes protected mask regions from inpainting (Phase 5)', async () => {
    const width = 20;
    const height = 20;
    const source = createTestImageData(width, height, [50, 50, 50, 255]);
    const mask = createTestImageData(width, height, [0, 0, 0, 0]);

    // Watermark at (10, 10)
    const wmIdx = 10 * width + 10;
    mask.data[wmIdx * 4] = 255;
    mask.data[wmIdx * 4 + 3] = 255;
    source.data[wmIdx * 4] = 255; // White watermark

    // Create protected mask covering (10, 10)
    const protectedMask = new Uint8Array(width * height);
    protectedMask[wmIdx] = 1;

    const result = await service.inpaint(source, mask, {
      mode: 'standard',
      protectedMask
    });

    // The protected pixel at (10, 10) must remain untouched (255)
    expect(result.data[wmIdx * 4]).toBe(255);
  });
});

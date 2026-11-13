// apps/tool-watermark-remover/src/services/quality-evaluator.service.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { QualityEvaluatorService } from './quality-evaluator.service';

function createMockImageData(
  width: number,
  height: number,
  fillR = 128,
  fillG = 128,
  fillB = 128,
  fillA = 255
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fillR;
    data[i + 1] = fillG;
    data[i + 2] = fillB;
    data[i + 3] = fillA;
  }
  return { width, height, data, colorSpace: 'srgb' } as ImageData;
}

describe('QualityEvaluatorService', () => {
  let service: QualityEvaluatorService;

  beforeEach(() => {
    service = new QualityEvaluatorService();
  });

  it('evaluates seamlessly matched inpainting as excellent', () => {
    const w = 50;
    const h = 50;
    const original = createMockImageData(w, h, 200, 200, 200);
    const inpainted = createMockImageData(w, h, 200, 200, 200);

    // Create a 10x10 mask in the center (unmasked pixels have alpha = 0)
    const mask = createMockImageData(w, h, 0, 0, 0, 0);
    for (let y = 20; y < 30; y++) {
      for (let x = 20; x < 30; x++) {
        const off = (y * w + x) * 4;
        mask.data[off] = 255;
        mask.data[off + 3] = 255;
      }
    }

    const metrics = service.evaluateQuality(original, inpainted, mask, 150);
    expect(metrics.overallScore).toBeGreaterThanOrEqual(90);
    expect(metrics.rating).toBe('excellent');
    expect(metrics.colorInconsistencyDelta).toBeLessThan(1.0);
    expect(metrics.processingTimeMs).toBe(150);
  });

  it('detects color inconsistency when reconstructed patch contrasts sharply with background', () => {
    const w = 50;
    const h = 50;
    const original = createMockImageData(w, h, 240, 240, 240); // Bright white background
    const inpainted = createMockImageData(w, h, 240, 240, 240);

    // Place a dark gray patch in the inpainted result inside mask
    const mask = createMockImageData(w, h, 0, 0, 0, 0);
    for (let y = 20; y < 30; y++) {
      for (let x = 20; x < 30; x++) {
        const off = (y * w + x) * 4;
        mask.data[off] = 255;
        mask.data[off + 3] = 255;
        inpainted.data[off] = 20;     // Dark pixel
        inpainted.data[off + 1] = 20;
        inpainted.data[off + 2] = 20;
      }
    }

    const metrics = service.evaluateQuality(original, inpainted, mask, 200);
    expect(metrics.colorInconsistencyDelta).toBeGreaterThan(100);
    expect(metrics.overallScore).toBeLessThan(85);
  });

  it('handles empty mask gracefully', () => {
    const w = 20;
    const h = 20;
    const original = createMockImageData(w, h);
    const inpainted = createMockImageData(w, h);
    const emptyMask = createMockImageData(w, h, 0, 0, 0, 0);

    const metrics = service.evaluateQuality(original, inpainted, emptyMask, 50);
    expect(metrics.overallScore).toBe(100);
    expect(metrics.rating).toBe('excellent');
  });
});

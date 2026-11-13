// apps/tool-watermark-remover/src/services/watermark-detector.service.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { WatermarkDetectorService } from './watermark-detector.service';

describe('WatermarkDetectorService (Phase 3 Intelligent Detection)', () => {
  let service: WatermarkDetectorService;

  beforeEach(() => {
    service = new WatermarkDetectorService();
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

  it('runs detection, extracts discrete regions, and assigns confidence', () => {
    const width = 80;
    const height = 80;
    const image = createTestImageData(width, height, [100, 100, 100, 255]);

    // Add high-contrast corner watermark stamp
    for (let y = 60; y < 76; y++) {
      for (let x = 60; x < 76; x++) {
        const idx = (y * width + x) * 4;
        if ((x + y) % 2 === 0) {
          image.data[idx] = 255;
          image.data[idx + 1] = 255;
          image.data[idx + 2] = 255;
        } else {
          image.data[idx] = 0;
          image.data[idx + 1] = 0;
          image.data[idx + 2] = 0;
        }
      }
    }

    const result = service.detectWatermarks(image, { sensitivity: 'medium' });
    expect(result).toBeDefined();
    expect(result.detected).toBe(true);
    expect(result.regions.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.regions[0].confidence).toBeGreaterThanOrEqual(50);
    expect(result.regions[0].type).toBeDefined();
    expect(result.maskData.width).toBe(width);
    expect(result.maskData.height).toBe(height);
  });

  it('respects sensitivity settings (high sensitivity detects lower thresholds)', () => {
    const width = 64;
    const height = 64;
    const faintImage = createTestImageData(width, height, [120, 120, 120, 255]);

    // Faint subtle watermark
    for (let y = 48; y < 60; y++) {
      for (let x = 48; x < 60; x++) {
        const idx = (y * width + x) * 4;
        faintImage.data[idx] = (x + y) % 2 === 0 ? 145 : 100;
        faintImage.data[idx + 1] = (x + y) % 2 === 0 ? 145 : 100;
        faintImage.data[idx + 2] = (x + y) % 2 === 0 ? 145 : 100;
      }
    }

    const highRes = service.detectWatermarks(faintImage, { sensitivity: 'high' });
    const lowRes = service.detectWatermarks(faintImage, { sensitivity: 'low' });

    // High sensitivity is more eager to flag regions than low sensitivity
    expect(highRes.confidence).toBeGreaterThanOrEqual(lowRes.confidence);
  });

  it('handles completely flat image gracefully with zero false positives', () => {
    const width = 40;
    const height = 40;
    const flatImage = createTestImageData(width, height, [150, 150, 150, 255]);

    const result = service.detectWatermarks(flatImage, { sensitivity: 'medium' });
    expect(result.detected).toBe(false);
    expect(result.regionsCount).toBe(0);
    expect(result.regions.length).toBe(0);
    expect(result.confidence).toBe(0);
  });
});

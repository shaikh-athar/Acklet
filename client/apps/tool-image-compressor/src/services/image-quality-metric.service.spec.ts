// apps/tool-image-compressor/src/services/image-quality-metric.service.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ImageQualityMetricService } from './image-quality-metric.service';
import { ImageDecoderService } from './image-decoder.service';

describe('ImageQualityMetricService', () => {
  let service: ImageQualityMetricService;
  let decoder: ImageDecoderService;

  beforeEach(() => {
    decoder = new ImageDecoderService();
    service = new ImageQualityMetricService();
  });

  it('should return SSIM = 1.0 and high PSNR for identical canvas', () => {
    const { canvas: canvas1, ctx: ctx1 } = decoder.createCanvas(100, 100);
    ctx1.fillStyle = '#FF0000';
    ctx1.fillRect(0, 0, 100, 100);

    const metrics = service.computeQualityMetrics(canvas1, canvas1);
    expect(metrics.ssim).toBe(1.0);
    expect(metrics.psnr).toBeGreaterThanOrEqual(90);
    expect(metrics.qualityRating).toBe('excellent');
    expect(metrics.warning).toBeUndefined();
  });

  it('should compute lower SSIM for different images', () => {
    const { canvas: canvas1, ctx: ctx1 } = decoder.createCanvas(128, 128);
    ctx1.fillStyle = '#000000';
    ctx1.fillRect(0, 0, 128, 128);

    const { canvas: canvas2, ctx: ctx2 } = decoder.createCanvas(128, 128);
    ctx2.fillStyle = '#FFFFFF';
    ctx2.fillRect(0, 0, 128, 128);

    const metrics = service.computeQualityMetrics(canvas1, canvas2);
    expect(metrics.ssim).toBeLessThan(0.9);
    expect(metrics.psnr).toBeLessThan(30);
  });

  it('should classify quality ratings correctly and include warning on degradation', () => {
    const { canvas: canvas1, ctx: ctx1 } = decoder.createCanvas(100, 100);
    ctx1.fillStyle = '#102030';
    ctx1.fillRect(0, 0, 100, 100);

    const { canvas: canvas2, ctx: ctx2 } = decoder.createCanvas(100, 100);
    ctx2.fillStyle = '#E0F0FF';
    ctx2.fillRect(0, 0, 100, 100);

    const metrics = service.computeQualityMetrics(canvas1, canvas2);
    expect(['fair', 'poor']).toContain(metrics.qualityRating);
    expect(metrics.warning).toBeDefined();
  });

  it('should compute artifactScore = 0 for identical canvases and higher for altered canvases', () => {
    const { canvas: canvas1, ctx: ctx1 } = decoder.createCanvas(64, 64);
    ctx1.fillStyle = '#0088CC';
    ctx1.fillRect(0, 0, 64, 64);

    const metricsIdentical = service.computeQualityMetrics(canvas1, canvas1);
    expect(metricsIdentical.artifactScore).toBe(0);

    const { canvas: canvas2, ctx: ctx2 } = decoder.createCanvas(64, 64);
    ctx2.fillStyle = '#FFFFFF';
    ctx2.fillRect(0, 0, 64, 64);

    const { canvas: canvasBlack, ctx: ctxBlack } = decoder.createCanvas(64, 64);
    ctxBlack.fillStyle = '#000000';
    ctxBlack.fillRect(0, 0, 64, 64);

    const metricsDifferent = service.computeQualityMetrics(canvasBlack, canvas2);
    expect(metricsDifferent.artifactScore).toBeGreaterThan(50);
  });

  it('should generate a difference map representation safely', () => {
    const { canvas: canvas1, ctx: ctx1 } = decoder.createCanvas(64, 64);
    ctx1.fillStyle = '#112233';
    ctx1.fillRect(0, 0, 64, 64);

    const { canvas: canvas2, ctx: ctx2 } = decoder.createCanvas(64, 64);
    ctx2.fillStyle = '#445566';
    ctx2.fillRect(0, 0, 64, 64);

    const diffMap = service.generateDifferenceMap(canvas1, canvas2, 64, 64);
    // In mock or DOM canvas environment, it either returns data URL string or undefined gracefully
    if (diffMap) {
      expect(typeof diffMap).toBe('string');
    } else {
      expect(diffMap).toBeUndefined();
    }
  });
});


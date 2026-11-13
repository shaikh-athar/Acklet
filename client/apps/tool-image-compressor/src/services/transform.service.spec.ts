// apps/tool-image-compressor/src/services/transform.service.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { TransformService } from './transform.service';
import { ImageDecoderService } from './image-decoder.service';
import { TransformOp } from '../models/compressor.models';

describe('TransformService', () => {
  let service: TransformService;
  let decoder: ImageDecoderService;

  beforeEach(() => {
    decoder = new ImageDecoderService();
    service = new TransformService();
  });

  it('rotates canvas by 90° right, swapping width and height', () => {
    const { canvas } = decoder.createCanvas(800, 600);
    const result = service.rotate(canvas, 90);
    expect(result.width).toBe(600);
    expect(result.height).toBe(800);
  });

  it('rotates canvas by 90° left (-90°), swapping width and height', () => {
    const { canvas } = decoder.createCanvas(800, 600);
    const result = service.rotate(canvas, -90);
    expect(result.width).toBe(600);
    expect(result.height).toBe(800);
  });

  it('rotates canvas by 180°, preserving dimensions', () => {
    const { canvas } = decoder.createCanvas(800, 600);
    const result = service.rotate(canvas, 180);
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
  });

  it('flips canvas horizontally preserving dimensions', () => {
    const { canvas } = decoder.createCanvas(800, 600);
    const result = service.flip(canvas, 'horizontal');
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
  });

  it('flips canvas vertically preserving dimensions', () => {
    const { canvas } = decoder.createCanvas(800, 600);
    const result = service.flip(canvas, 'vertical');
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
  });

  it('crops canvas to specified bounding box', () => {
    const { canvas } = decoder.createCanvas(1000, 800);
    const result = service.crop(canvas, { x: 100, y: 50, width: 400, height: 300 });
    expect(result.width).toBe(400);
    expect(result.height).toBe(300);
  });

  it('calculates aspect ratio presets correctly', () => {
    // 1:1 on 1000x500 -> 500x500 centered
    const squareCrop = service.calculateAspectCrop(1000, 500, '1:1');
    expect(squareCrop.width).toBe(500);
    expect(squareCrop.height).toBe(500);
    expect(squareCrop.x).toBe(250);
    expect(squareCrop.y).toBe(0);

    // 16:9 on 1920x1080 -> 1920x1080 full
    const full169 = service.calculateAspectCrop(1920, 1080, '16:9');
    expect(full169.width).toBe(1920);
    expect(full169.height).toBe(1080);

    // Free -> full bounds
    const freeCrop = service.calculateAspectCrop(800, 600, 'free');
    expect(freeCrop.width).toBe(800);
    expect(freeCrop.height).toBe(600);
  });

  it('sequentially applies multiple operations: crop then rotate then flip', () => {
    const { canvas } = decoder.createCanvas(1200, 800);
    const ops: TransformOp[] = [
      { type: 'crop', rect: { x: 0, y: 0, width: 600, height: 400 } }, // -> 600x400
      { type: 'rotate', angle: 90 }, // -> 400x600
      { type: 'flip', direction: 'horizontal' } // -> 400x600
    ];

    const result = service.applyTransforms(canvas, ops);
    expect(result.width).toBe(400);
    expect(result.height).toBe(600);
  });

  it('returns original dimensions when operations list is empty', () => {
    const { canvas } = decoder.createCanvas(800, 600);
    const result = service.applyTransforms(canvas, []);
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
  });

  it('exports canvas to blob', async () => {
    const { canvas } = decoder.createCanvas(100, 100);
    const blob = await service.exportCanvasToBlob(canvas);
    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(0);
  });
});


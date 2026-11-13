// apps/tool-image-compressor/src/services/image-resize.service.spec.ts
import { describe, it, expect } from 'vitest';
import { ImageResizeService } from './image-resize.service';
import { ResizeSettings } from '../models/compressor.models';

describe('ImageResizeService', () => {
  const service = new ImageResizeService();

  it('returns original dimensions when resizing is disabled', () => {
    const settings: ResizeSettings = {
      enabled: false,
      mode: 'dimensions',
      width: 500,
      height: 500,
      maintainAspectRatio: true,
      percentage: 50
    };
    const result = service.calculateDimensions(1920, 1080, settings);
    expect(result.targetWidth).toBe(1920);
    expect(result.targetHeight).toBe(1080);
  });

  it('calculates percentage scaling accurately', () => {
    const settings: ResizeSettings = {
      enabled: true,
      mode: 'percentage',
      maintainAspectRatio: true,
      percentage: 50
    };
    const result = service.calculateDimensions(1000, 800, settings);
    expect(result.targetWidth).toBe(500);
    expect(result.targetHeight).toBe(400);
  });

  it('respects preventUpscale in percentage mode', () => {
    const settings: ResizeSettings = {
      enabled: true,
      mode: 'percentage',
      maintainAspectRatio: true,
      percentage: 200,
      preventUpscale: true
    };
    const result = service.calculateDimensions(800, 600, settings);
    expect(result.targetWidth).toBe(800);
    expect(result.targetHeight).toBe(600);
  });

  it('calculates bounding box containment with aspect ratio lock', () => {
    const settings: ResizeSettings = {
      enabled: true,
      mode: 'dimensions',
      width: 800,
      height: 800,
      maintainAspectRatio: true,
      percentage: 100
    };
    // 1600x800 -> fit inside 800x800 should produce 800x400
    const result = service.calculateDimensions(1600, 800, settings);
    expect(result.targetWidth).toBe(800);
    expect(result.targetHeight).toBe(400);
  });

  it('respects preventUpscale in dimensions mode', () => {
    const settings: ResizeSettings = {
      enabled: true,
      mode: 'dimensions',
      width: 2000,
      height: 2000,
      maintainAspectRatio: true,
      percentage: 100,
      preventUpscale: true
    };
    const result = service.calculateDimensions(1000, 500, settings);
    expect(result.targetWidth).toBe(1000);
    expect(result.targetHeight).toBe(500);
  });
});


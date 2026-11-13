// apps/tool-watermark-remover/src/services/subject-protection.service.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { SubjectProtectionService } from './subject-protection.service';
import { ProtectedRegion, RectSelection } from '../models/watermark.models';

describe('SubjectProtectionService', () => {
  let service: SubjectProtectionService;

  beforeEach(() => {
    service = new SubjectProtectionService();
  });

  it('should detect skin-tone subject regions near watermarks', () => {
    const width = 100;
    const height = 100;
    const data = new Uint8ClampedArray(width * height * 4);

    // Fill background with neutral gray
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 120;
      data[i + 1] = 120;
      data[i + 2] = 120;
      data[i + 3] = 255;
    }

    // Paint a 20x20 skin-tone patch at (10, 10) -> R: 210, G: 160, B: 125
    for (let y = 10; y < 30; y++) {
      for (let x = 10; x < 30; x++) {
        const off = (y * width + x) * 4;
        data[off] = 210;
        data[off + 1] = 160;
        data[off + 2] = 125;
        data[off + 3] = 255;
      }
    }

    const img = { data, width, height, colorSpace: 'srgb' } as ImageData;
    const watermarkBounds: RectSelection[] = [{ x: 25, y: 25, width: 20, height: 10 }];

    const detected = service.detectSubjectProtectionRegions(img, watermarkBounds, 50);

    expect(detected.length).toBeGreaterThan(0);
    expect(detected[0].type).toBe('face');
    expect(detected[0].bounds.x).toBeLessThanOrEqual(10);
    expect(detected[0].bounds.y).toBeLessThanOrEqual(10);
  });

  it('should clip watermark mask with protected regions and safeguard overlapping pixels', () => {
    const width = 10;
    const height = 10;
    const watermarkMask = new Uint8Array(100);
    const protectedMask = new Uint8Array(100);

    // Watermark covers indices 20 to 29 (Row 2)
    for (let i = 20; i < 30; i++) {
      watermarkMask[i] = 1;
    }

    // Protection covers indices 25 to 35
    for (let i = 25; i < 36; i++) {
      protectedMask[i] = 1;
    }

    const { clippedMask, protectedPixelsCount } = service.clipMaskWithProtection(
      watermarkMask,
      protectedMask
    );

    // Overlapping indices 25 to 29 (5 pixels) must be excluded from inpainting!
    expect(protectedPixelsCount).toBe(5);

    // Indices 20 to 24 should remain 1
    for (let i = 20; i < 25; i++) {
      expect(clippedMask[i]).toBe(1);
    }

    // Indices 25 to 29 must be 0 (immunized)
    for (let i = 25; i < 30; i++) {
      expect(clippedMask[i]).toBe(0);
    }
  });

  it('should create protected mask array from region definitions', () => {
    const regions: ProtectedRegion[] = [
      {
        id: 'p1',
        name: 'Face',
        type: 'face',
        bounds: { x: 2, y: 2, width: 3, height: 3 },
        createdAt: 100
      }
    ];

    const mask = service.createProtectedMaskArray(10, 10, regions);
    expect(mask[2 * 10 + 2]).toBe(1);
    expect(mask[0]).toBe(0);
  });
});


// apps/tool-image-compressor/src/services/image-capability.service.spec.ts
import { describe, it, expect } from 'vitest';
import { ImageCapabilityService, CANONICAL_CAPABILITIES } from './image-capability.service';

describe('ImageCapabilityService', () => {
  const service = new ImageCapabilityService();

  it('normalizes format strings correctly', () => {
    expect(service.normalizeFormat('.JPEG')).toBe('jpg');
    expect(service.normalizeFormat('jpg')).toBe('jpg');
    expect(service.normalizeFormat('PNG')).toBe('png');
    expect(service.normalizeFormat('heif')).toBe('heic');
    expect(service.normalizeFormat(' WEBP ')).toBe('webp');
  });

  it('provides capabilities for canonical formats', () => {
    const pngCap = service.getCapability('png');
    expect(pngCap.format).toBe('png');
    expect(pngCap.supportsTransparency).toBe(true);
    expect(pngCap.supportsLossless).toBe(true);
    expect(pngCap.supportsLossy).toBe(false);

    const jpgCap = service.getCapability('jpg');
    expect(jpgCap.supportsTransparency).toBe(false);
    expect(jpgCap.supportsLossy).toBe(true);
  });

  it('returns available output formats including jpeg, png, and webp', () => {
    const formats = service.getAvailableOutputFormats();
    expect(formats).toContain('original');
    expect(formats).toContain('jpeg');
    expect(formats).toContain('png');
  });

  it('correctly resolves output target and detects transparency warning for JPEG', () => {
    const resJpg = service.resolveOutputTarget('jpeg', 'png');
    expect(resJpg.mimeType).toBe('image/jpeg');
    expect(resJpg.extension).toBe('jpg');
    expect(resJpg.transparencyWarning).toBe(true);

    const resPng = service.resolveOutputTarget('png', 'jpg');
    expect(resPng.mimeType).toBe('image/png');
    expect(resPng.transparencyWarning).toBe(false);
    expect(resPng.isLossless).toBe(true);

    const resOriginal = service.resolveOutputTarget('original', 'png');
    expect(resOriginal.mimeType).toBe('image/png');
    expect(resOriginal.extension).toBe('png');
  });

  it('correctly reports format decoding and encoding capabilities', () => {
    expect(service.canDecode('jpg')).toBe(true);
    expect(service.canDecode('png')).toBe(true);
    expect(service.canDecode('webp')).toBe(true);
    expect(service.canDecode('svg')).toBe(true);
    expect(service.canDecode('unknown-format')).toBe(false);

    expect(service.canEncode('jpg')).toBe(true);
    expect(service.canEncode('png')).toBe(true);
    expect(service.canEncode('svg')).toBe(false);
  });

  it('reports transparency and lossy properties accurately', () => {
    expect(service.supportsTransparency('png')).toBe(true);
    expect(service.supportsTransparency('webp')).toBe(true);
    expect(service.supportsTransparency('jpg')).toBe(false);

    expect(service.isLossy('jpg')).toBe(true);
    expect(service.isLossy('png')).toBe(false);
    expect(service.isLossless('png')).toBe(true);
  });
});


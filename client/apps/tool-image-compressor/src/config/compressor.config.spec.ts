// apps/tool-image-compressor/src/config/compressor.config.spec.ts
import { describe, it, expect } from 'vitest';
import { COMPRESSOR_CONFIG } from './compressor.config';

describe('COMPRESSOR_CONFIG', () => {
  it('defines valid limits', () => {
    expect(COMPRESSOR_CONFIG.limits.maxFiles).toBe(50);
    expect(COMPRESSOR_CONFIG.limits.maxFileSizeMB).toBe(50);
    expect(COMPRESSOR_CONFIG.limits.maxFileSizeBytes).toBe(50 * 1024 * 1024);
    expect(COMPRESSOR_CONFIG.limits.maxDecodedMegapixels).toBe(100);
    expect(COMPRESSOR_CONFIG.limits.maxPixels).toBe(100_000_000);
    expect(COMPRESSOR_CONFIG.limits.workerConcurrency).toBe(2);
  });

  it('defines 3 smart presets with expected qualities', () => {
    expect(COMPRESSOR_CONFIG.presets.smart['best-quality'].quality).toBe(90);
    expect(COMPRESSOR_CONFIG.presets.smart['balanced'].quality).toBe(80);
    expect(COMPRESSOR_CONFIG.presets.smart['smallest-size'].quality).toBe(60);
    expect(COMPRESSOR_CONFIG.presets.smartList.length).toBe(3);
  });

  it('defines 6 developer presets with expected configurations', () => {
    const devKeys = COMPRESSOR_CONFIG.presets.developer.map(p => p.key);
    expect(devKeys).toEqual(['website', 'blog', 'ecommerce', 'social', 'thumbnails', 'retina']);
  });

  it('defines the 4 responsive widths in variants', () => {
    expect(COMPRESSOR_CONFIG.variants.widths).toEqual([320, 640, 1280, 1920]);
    expect(COMPRESSOR_CONFIG.variants.defaultConfigs.length).toBe(4);
  });

  it('defines target size tolerance and quality floor', () => {
    expect(COMPRESSOR_CONFIG.targetSize.tolerancePercent).toBe(5);
    expect(COMPRESSOR_CONFIG.targetSize.toleranceRatio).toBe(0.05);
    expect(COMPRESSOR_CONFIG.targetSize.qualityFloor).toBe(25);
    expect(COMPRESSOR_CONFIG.targetSize.maxPasses).toBe(6);
  });

  it('defines 5 system profiles', () => {
    expect(COMPRESSOR_CONFIG.profiles.length).toBe(5);
    const profileIds = COMPRESSOR_CONFIG.profiles.map(p => p.id);
    expect(profileIds).toContain('system-web-balanced');
    expect(profileIds).toContain('system-ecommerce-hd');
    expect(profileIds).toContain('system-ultra-compressed');
    expect(profileIds).toContain('system-lossless-archival');
    expect(profileIds).toContain('system-social-opengraph');
  });
});


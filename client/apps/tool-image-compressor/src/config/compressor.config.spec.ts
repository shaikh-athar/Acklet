// apps/tool-image-compressor/src/config/compressor.config.spec.ts
import { describe, it, expect } from 'vitest';
import { COMPRESSOR_CONFIG, getSmartDefaultBand } from './compressor.config';

describe('COMPRESSOR_CONFIG', () => {
  it('defines minReductionPercent of 5%', () => {
    expect(COMPRESSOR_CONFIG.minReductionPercent).toBe(5);
  });

  it('defines defaultMinSavingPercent of 10% in config', () => {
    expect(COMPRESSOR_CONFIG.defaultMinSavingPercent).toBe(10);
  });

  it('defines smartDefaults bands for file size categories', () => {
    expect(COMPRESSOR_CONFIG.smartDefaults.bands.length).toBe(4);
    // Under 100 KB
    const under100 = getSmartDefaultBand(60 * 1024);
    expect(under100.minReductionPercent).toBe(5);
    expect(under100.maxReductionPercent).toBe(10);

    // 100 KB to 1 MB
    const mid = getSmartDefaultBand(500 * 1024);
    expect(mid.minReductionPercent).toBe(10);
    expect(mid.maxReductionPercent).toBe(30);

    // 1 MB to 2 MB
    const large = getSmartDefaultBand(1.5 * 1024 * 1024);
    expect(large.minReductionPercent).toBe(30);
    expect(large.maxReductionPercent).toBe(40);

    // Over 2 MB
    const huge = getSmartDefaultBand(3 * 1024 * 1024);
    expect(huge.minReductionPercent).toBe(40);
    expect(huge.maxReductionPercent).toBeGreaterThanOrEqual(40);
  });

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

  it('defines developer presets with expected configurations', () => {
    const devKeys = COMPRESSOR_CONFIG.presets.developer.map(p => p.key);
    expect(devKeys).toContain('website');
    expect(devKeys).toContain('blog');
    expect(devKeys).toContain('ecommerce');
    expect(devKeys).toContain('social');
    expect(devKeys).toContain('thumbnails');
    expect(devKeys).toContain('retina');
    expect(devKeys.length).toBeGreaterThanOrEqual(6);
  });

  it('defines the 4 responsive widths in variants', () => {
    expect(COMPRESSOR_CONFIG.variants.widths).toEqual([320, 640, 1280, 1920]);
    expect(COMPRESSOR_CONFIG.variants.defaultConfigs.length).toBe(4);
  });

  it('defines target size tolerance and quality floor', () => {
    expect(COMPRESSOR_CONFIG.targetSize.tolerancePercent).toBe(5);
    expect(COMPRESSOR_CONFIG.targetSize.toleranceRatio).toBe(0.05);
    expect(COMPRESSOR_CONFIG.targetSize.qualityFloor).toBe(25);
    expect(COMPRESSOR_CONFIG.targetSize.maxPasses).toBeGreaterThanOrEqual(6);
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


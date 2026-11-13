// apps/tool-image-compressor/src/services/smart-analysis.service.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { SmartAnalysisService } from './smart-analysis.service';
import { ImageDecoderService } from './image-decoder.service';
import { CompressionSettings } from '../models/compressor.models';

describe('SmartAnalysisService', () => {
  let service: SmartAnalysisService;
  let decoder: ImageDecoderService;

  beforeEach(() => {
    decoder = new ImageDecoderService();
    service = new SmartAnalysisService();
  });

  it('should analyze image dimensions and megapixel accurately', () => {
    const { canvas } = decoder.createCanvas(2000, 1500);
    const { characteristics } = service.analyzeImage(canvas, 'jpeg', 1_500_000);

    expect(characteristics.megapixel).toBe(3.0);
    expect(characteristics.isHighRes).toBe(false);
  });

  it('should detect high resolution images', () => {
    const { canvas } = decoder.createCanvas(4000, 3000);
    const { characteristics } = service.analyzeImage(canvas, 'jpeg', 8_000_000);

    expect(characteristics.megapixel).toBe(12.0);
    expect(characteristics.isHighRes).toBe(true);
  });

  it('should recommend WebP with high savings when photo is in PNG format', () => {
    const characteristics = {
      hasAlpha: false,
      isPhoto: true,
      uniqueColorCount: 800,
      megapixel: 4.0,
      isHighRes: false,
      imageCategory: 'photo' as const,
      edgeDensity: 0.08,
      bitsPerPixel: 8.0,
      isAlreadyOptimized: false,
      optimizationOpportunity: 'high' as const
    };

    const rec = service.generateRecommendation(characteristics, 'png', 4_000_000);
    expect(['webp', 'jpeg']).toContain(rec.suggestedFormat);
    expect(rec.estimatedSavingsPercent).toBeGreaterThanOrEqual(70);
    expect(rec.reason).toContain('Photograph stored in uncompressed PNG format');
  });

  it('should preserve transparency for alpha-containing images', () => {
    const characteristics = {
      hasAlpha: true,
      isPhoto: false,
      uniqueColorCount: 150,
      megapixel: 1.0,
      isHighRes: false,
      imageCategory: 'logo-icon' as const,
      edgeDensity: 0.1,
      bitsPerPixel: 4.0,
      isAlreadyOptimized: false,
      optimizationOpportunity: 'medium' as const
    };

    const rec = service.generateRecommendation(characteristics, 'png', 500_000);
    expect(['webp', 'png']).toContain(rec.suggestedFormat);
    expect(rec.reason).toContain('Logo or icon with limited color palette');
  });

  it('should recommend screenshot-optimized quality for sharp interface captures', () => {
    const characteristics = {
      hasAlpha: false,
      isPhoto: false,
      uniqueColorCount: 300,
      megapixel: 2.0,
      isHighRes: false,
      imageCategory: 'screenshot' as const,
      edgeDensity: 0.22,
      bitsPerPixel: 2.5,
      isAlreadyOptimized: false,
      optimizationOpportunity: 'medium' as const
    };

    const rec = service.generateRecommendation(characteristics, 'png', 600_000);
    expect(rec.suggestedQuality).toBe(85);
    expect(rec.reason).toContain('Screenshot with text');
  });

  it('should detect already-optimized files and advise keeping original', () => {
    const characteristics = {
      hasAlpha: false,
      isPhoto: true,
      uniqueColorCount: 400,
      megapixel: 2.0,
      isHighRes: false,
      imageCategory: 'optimized' as const,
      edgeDensity: 0.05,
      bitsPerPixel: 0.35,
      isAlreadyOptimized: true,
      optimizationOpportunity: 'none' as const
    };

    const rec = service.generateRecommendation(characteristics, 'jpeg', 85_000);
    expect(rec.estimatedSavingsPercent).toBeLessThanOrEqual(10);
    expect(rec.reason).toContain('Already heavily optimized');
  });

  it('should correctly configure Smart Presets', () => {
    const baseSettings: CompressionSettings = {
      mode: 'smart',
      preset: 'balanced',
      quality: 80,
      outputFormat: 'original',
      resize: {
        enabled: false,
        mode: 'percentage',
        maintainAspectRatio: true,
        percentage: 100
      },
      metadataPolicy: 'preserve'
    };

    const bestQuality = service.applySmartPreset('best-quality', baseSettings);
    expect(bestQuality.preset).toBe('best-quality');
    expect(bestQuality.quality).toBe(90);

    const balanced = service.applySmartPreset('balanced', baseSettings);
    expect(balanced.preset).toBe('balanced');
    expect(balanced.quality).toBe(80);

    const smallestSize = service.applySmartPreset('smallest-size', baseSettings);
    expect(smallestSize.preset).toBe('smallest-size');
    expect(smallestSize.quality).toBe(60);
  });
});


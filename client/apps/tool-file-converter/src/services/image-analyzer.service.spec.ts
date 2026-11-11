// client/apps/tool-file-converter/src/services/image-analyzer.service.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ImageAnalyzerService } from './image-analyzer.service';

describe('ImageAnalyzerService Unit Tests', () => {
  let service: ImageAnalyzerService;

  beforeEach(() => {
    service = new ImageAnalyzerService();
  });

  it('should suggest WebP with transparency reason when alpha is present', () => {
    const result = service.evaluateSuggestionRules(true, false, 80, 'png');
    expect(result.suggestedFormat).toBe('webp');
    expect(result.reason).toBe('Has transparency. WebP keeps it at a smaller size.');
  });

  it('should suggest WebP with photo reason when image has no alpha and high color entropy (photo)', () => {
    const result = service.evaluateSuggestionRules(false, true, 1200, 'png');
    expect(result.suggestedFormat).toBe('webp');
    expect(result.reason).toBe('Photo with no transparency. WebP is usually much smaller than PNG.');
  });

  it('should suggest PNG with crisp edges reason when image has no alpha and low color count (graphic/screenshot)', () => {
    const result = service.evaluateSuggestionRules(false, false, 45, 'jpg');
    expect(result.suggestedFormat).toBe('png');
    expect(result.reason).toBe('Flat colors and sharp edges. PNG keeps them crisp.');
  });

  it('should return no suggestion (undefined) when already in the suggested format', () => {
    // Photo with no alpha would suggest WebP, but currentTarget is already webp
    const photoResult = service.evaluateSuggestionRules(false, true, 1200, 'webp');
    expect(photoResult.suggestedFormat).toBeUndefined();
    expect(photoResult.reason).toBeUndefined();

    // Graphic with no alpha would suggest PNG, but currentTarget is already png
    const graphicResult = service.evaluateSuggestionRules(false, false, 30, 'png');
    expect(graphicResult.suggestedFormat).toBeUndefined();
    expect(graphicResult.reason).toBeUndefined();

    // Image with alpha would suggest WebP, but currentTarget is already webp
    const alphaResult = service.evaluateSuggestionRules(true, false, 50, 'webp');
    expect(alphaResult.suggestedFormat).toBeUndefined();
    expect(alphaResult.reason).toBeUndefined();
  });

  it('should accurately detect alpha transparency from RGBA pixel buffers', () => {
    const buffer = new Uint8ClampedArray(16); // 4 pixels
    // Fill with opaque pixels
    buffer.fill(255);
    // Set 4th pixel alpha to semi-transparent (128)
    buffer[15] = 128;

    const analysis = service.analyzeRgbaData(buffer, 2, 2, 'jpg');
    expect(analysis.hasAlpha).toBe(true);
    expect(analysis.suggestedFormat).toBe('webp');
  });
});


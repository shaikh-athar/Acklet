// apps/tool-image-compressor/src/services/smart-analysis.service.ts
import { Injectable, inject } from '@angular/core';
import {
  ImageCharacteristics,
  SmartRecommendation,
  SmartPreset,
  OutputFormatOption,
  CompressionSettings,
  ImageCategory
} from '../models/compressor.models';
import { ImageDecoderService } from './image-decoder.service';
import { ImageCapabilityService } from './image-capability.service';
import { COMPRESSOR_CONFIG } from '../config/compressor.config';

const ANALYSIS_SAMPLE_SIZE = 64;

@Injectable({
  providedIn: 'root'
})
export class SmartAnalysisService {
  private readonly decoder: ImageDecoderService;
  private readonly capabilityService: ImageCapabilityService;

  constructor() {
    try {
      this.decoder = inject(ImageDecoderService);
    } catch {
      this.decoder = new ImageDecoderService();
    }
    try {
      this.capabilityService = inject(ImageCapabilityService);
    } catch {
      this.capabilityService = new ImageCapabilityService();
    }
  }

  /**
   * Performs client-side image analysis on a canvas to determine alpha presence,
   * visual entropy (photo vs graphic), and dimensions.
   */
  analyzeImage(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    originalFormat: string,
    fileSize: number
  ): { characteristics: ImageCharacteristics; recommendation: SmartRecommendation } {
    const width = canvas.width;
    const height = canvas.height;
    const megapixel = Math.round((width * height / 1_000_000) * 10) / 10;
    const isHighRes = megapixel >= 8.0 || width > 3840 || height > 2160;

    // Resample down to 64x64 thumbnail for instant color-entropy inspection
    const { canvas: sampleCanvas, ctx: sampleCtx } = this.decoder.createCanvas(
      ANALYSIS_SAMPLE_SIZE,
      ANALYSIS_SAMPLE_SIZE
    );
    sampleCtx.drawImage(canvas, 0, 0, ANALYSIS_SAMPLE_SIZE, ANALYSIS_SAMPLE_SIZE);

    let hasAlpha = false;
    let uniqueColorCount = 0;
    let edgeDensity = 0.05;

    try {
      const imgData = sampleCtx.getImageData(0, 0, ANALYSIS_SAMPLE_SIZE, ANALYSIS_SAMPLE_SIZE);
      const data = imgData.data;
      const colorSet = new Set<number>();

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 255) {
          hasAlpha = true;
        }
        // 15-bit color space quantization
        const r = data[i] >> 3;
        const g = data[i + 1] >> 3;
        const b = data[i + 2] >> 3;
        colorSet.add((r << 10) | (g << 5) | b);
      }
      uniqueColorCount = colorSet.size;

      // Deterministic Edge Density Measurement (High-Frequency Gradient Transitions)
      let edgePixelCount = 0;
      let innerCount = 0;
      for (let y = 0; y < ANALYSIS_SAMPLE_SIZE - 1; y++) {
        for (let x = 0; x < ANALYSIS_SAMPLE_SIZE - 1; x++) {
          const idx = (y * ANALYSIS_SAMPLE_SIZE + x) * 4;
          const idxRight = idx + 4;
          const idxDown = ((y + 1) * ANALYSIS_SAMPLE_SIZE + x) * 4;

          const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          const lumRight = 0.299 * data[idxRight] + 0.587 * data[idxRight + 1] + 0.114 * data[idxRight + 2];
          const lumDown = 0.299 * data[idxDown] + 0.587 * data[idxDown + 1] + 0.114 * data[idxDown + 2];

          const grad = Math.abs(lum - lumRight) + Math.abs(lum - lumDown);
          if (grad > 32) {
            edgePixelCount++;
          }
          innerCount++;
        }
      }
      if (innerCount > 0) {
        edgeDensity = Math.round((edgePixelCount / innerCount) * 100) / 100;
      }
    } catch {
      // In case of security restriction on mock canvas
      uniqueColorCount = 300;
    }

    const totalSamplePixels = ANALYSIS_SAMPLE_SIZE * ANALYSIS_SAMPLE_SIZE;
    // Photos possess high color variance (> 450 unique quantized colors in 64x64 sample)
    const isPhoto = uniqueColorCount > Math.min(450, Math.round(totalSamplePixels * 0.12));

    // Raw Bits Per Pixel (bpp) = (fileSize in bits) / (width * height in pixels)
    const totalPixels = Math.max(1, width * height);
    const bitsPerPixel = Math.round(((fileSize * 8) / totalPixels) * 100) / 100;

    const normFormat = this.capabilityService.normalizeFormat(originalFormat);

    // Detect if image is already heavily optimized
    let isAlreadyOptimized = false;
    if ((normFormat === 'jpg' || normFormat === 'jpeg') && bitsPerPixel < 0.6) {
      isAlreadyOptimized = true;
    } else if (normFormat === 'webp' && bitsPerPixel < 0.45) {
      isAlreadyOptimized = true;
    } else if (normFormat === 'png' && bitsPerPixel < 1.0 && uniqueColorCount <= 256) {
      isAlreadyOptimized = true;
    }

    // Classify into semantic category
    let imageCategory: ImageCategory = 'photo';
    if (isAlreadyOptimized) {
      imageCategory = 'optimized';
    } else if (hasAlpha) {
      imageCategory = uniqueColorCount < 220 ? 'logo-icon' : 'graphic';
    } else if (edgeDensity > 0.16 && uniqueColorCount < 450) {
      imageCategory = 'screenshot';
    } else if (uniqueColorCount < 120) {
      imageCategory = 'logo-icon';
    } else if (isPhoto) {
      imageCategory = 'photo';
    } else {
      imageCategory = 'graphic';
    }

    // Determine estimated optimization opportunity
    let optimizationOpportunity: 'high' | 'medium' | 'low' | 'none' = 'medium';
    if (isAlreadyOptimized) {
      optimizationOpportunity = 'none';
    } else if ((normFormat === 'png' && isPhoto) || bitsPerPixel > 4.0 || (isHighRes && fileSize > 4 * 1024 * 1024)) {
      optimizationOpportunity = 'high';
    } else if (bitsPerPixel > 1.2) {
      optimizationOpportunity = 'medium';
    } else {
      optimizationOpportunity = 'low';
    }

    const characteristics: ImageCharacteristics = {
      hasAlpha,
      isPhoto,
      uniqueColorCount,
      megapixel,
      isHighRes,
      imageCategory,
      edgeDensity,
      bitsPerPixel,
      isAlreadyOptimized,
      optimizationOpportunity
    };

    const recommendation = this.generateRecommendation(
      characteristics,
      originalFormat,
      fileSize
    );

    return { characteristics, recommendation };
  }

  /**
   * Generates intelligent, explainable compression recommendations based on image characteristics.
   */
  generateRecommendation(
    characteristics: ImageCharacteristics,
    originalFormat: string,
    fileSize: number
  ): SmartRecommendation {
    const normFormat = this.capabilityService.normalizeFormat(originalFormat);
    const supportsWebp = this.capabilityService.canEncode('webp');

    let suggestedFormat: OutputFormatOption = 'original';
    let suggestedQuality = 80;
    let preset: SmartPreset = 'balanced';
    let estimatedSavings = 35;
    let reason = 'Balanced visual quality and file size reduction.';
    let tradeOff = 'Preserves high visual clarity with noticeable file size savings.';

    switch (characteristics.imageCategory) {
      case 'optimized':
        suggestedFormat = 'original';
        suggestedQuality = 85;
        estimatedSavings = 5;
        reason = `Already heavily optimized (${characteristics.bitsPerPixel} bits/pixel). Recompression offers minimal savings and may increase file size.`;
        tradeOff = 'Recommend keeping original file unless format conversion is required.';
        break;

      case 'screenshot':
        suggestedFormat = supportsWebp ? 'webp' : 'png';
        suggestedQuality = 85;
        estimatedSavings = 45;
        reason = 'Screenshot with text and high-contrast edges. Higher quality prevents color bleeding and blurry typography.';
        tradeOff = 'Crisp typography and sharp interface borders with moderate size reduction.';
        break;

      case 'logo-icon':
        suggestedFormat = characteristics.hasAlpha ? (supportsWebp ? 'webp' : 'png') : (supportsWebp ? 'webp' : 'png');
        suggestedQuality = 85;
        estimatedSavings = 40;
        reason = 'Logo or icon with limited color palette. Lossless-compatible encoding prevents edge halo artifacts.';
        tradeOff = 'Zero alpha fringing and razor-sharp outlines.';
        break;

      case 'photo':
        if (normFormat === 'png') {
          suggestedFormat = supportsWebp ? 'webp' : 'jpeg';
          suggestedQuality = 80;
          estimatedSavings = 75;
          reason = 'Photograph stored in uncompressed PNG format. Converting to WebP or JPEG drastically reduces file size.';
          tradeOff = 'Up to 75% file size reduction with full photographic color depth.';
        } else {
          suggestedFormat = normFormat === 'jpg' || normFormat === 'jpeg' ? 'jpeg' : (supportsWebp ? 'webp' : 'original');
          suggestedQuality = 78;
          estimatedSavings = 40;
          reason = 'Continuous-tone photograph. Lossy compression yields significant savings without perceptible visual degradation.';
          tradeOff = 'Preserves natural gradients and photographic detail.';
        }
        break;

      case 'graphic':
      default:
        if (characteristics.hasAlpha) {
          suggestedFormat = supportsWebp ? 'webp' : 'png';
          suggestedQuality = 82;
          estimatedSavings = 50;
          reason = 'Graphic with alpha transparency. WebP preserves transparency at much lower byte sizes than 32-bit PNG.';
          tradeOff = 'Maintains transparent canvas with clean visual edges.';
        } else {
          suggestedFormat = supportsWebp ? 'webp' : 'png';
          suggestedQuality = 80;
          estimatedSavings = 35;
          reason = 'Graphic illustration. Optimized WebP preserves flat color fills and fine details.';
          tradeOff = 'Crisp illustration lines and vibrant color fills.';
        }
        break;
    }

    if (characteristics.isHighRes && fileSize > 5 * 1024 * 1024 && characteristics.imageCategory !== 'optimized') {
      estimatedSavings = Math.min(85, estimatedSavings + 15);
      reason += ' Ultra-high resolution asset provides substantial reduction potential.';
    }

    return {
      preset,
      suggestedFormat,
      suggestedQuality,
      estimatedSavingsPercent: estimatedSavings,
      tradeOffDescription: tradeOff,
      reason
    };
  }

  /**
   * Applies the parameters of a Smart Preset to a base CompressionSettings object.
   */
  applySmartPreset(preset: SmartPreset, settings: CompressionSettings): CompressionSettings {
    const presetConfig = COMPRESSOR_CONFIG.presets.smart[preset] || COMPRESSOR_CONFIG.presets.smart['balanced'];
    return {
      ...settings,
      preset: presetConfig.key,
      quality: presetConfig.quality,
      resize: preset === 'best-quality' ? {
        ...settings.resize,
        enabled: settings.resize.enabled
      } : settings.resize
    };
  }
}


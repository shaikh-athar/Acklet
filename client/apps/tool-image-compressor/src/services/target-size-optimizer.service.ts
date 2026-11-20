// apps/tool-image-compressor/src/services/target-size-optimizer.service.ts
import { Injectable, inject } from '@angular/core';
import { ImageEncoderService } from './image-encoder.service';
import { ImageDecoderService } from './image-decoder.service';
import { ImageResizeService } from './image-resize.service';
import { ImageQualityMetricService } from './image-quality-metric.service';
import { IntelligentOptimizationEngine, IntelligentOptimizationEngineInput } from './intelligent-optimization-engine';
import { OptimizationOutcome } from './format-strategy/format-strategy.models';
import { CandidateCache } from './candidate-cache.util';
import { COMPRESSOR_CONFIG } from '../config/compressor.config';

export interface TargetOptimizationResult {
  optimalQuality: number; // 1-100
  optimalBlob: Blob;
  optimalCanvas: HTMLCanvasElement | OffscreenCanvas;
  optimalWidth: number;
  optimalHeight: number;
  optimalSize: number;
  targetAchieved: boolean;
  targetUnreachable: boolean;
  iterationsCount: number;
  warning?: string;
  ssim?: number;
  psnr?: number;
  reason?: string;
  cacheHits?: number;
}

export const DEFAULT_MIN_QUALITY_FLOOR = COMPRESSOR_CONFIG.targetSize.qualityFloor;
export const MAX_OPTIMIZATION_PASSES = COMPRESSOR_CONFIG.targetSize.maxPasses;

@Injectable({
  providedIn: 'root'
})
export class TargetSizeOptimizerService {
  private readonly encoder: ImageEncoderService;
  private readonly decoder: ImageDecoderService;
  private readonly resizer: ImageResizeService;
  private readonly qualityMetrics: ImageQualityMetricService;
  private readonly intelligentEngine: IntelligentOptimizationEngine;
  private readonly cache = new CandidateCache(64);

  constructor() {
    try {
      this.encoder = inject(ImageEncoderService);
    } catch {
      this.encoder = new ImageEncoderService();
    }
    try {
      this.decoder = inject(ImageDecoderService);
    } catch {
      this.decoder = new ImageDecoderService();
    }
    try {
      this.resizer = inject(ImageResizeService);
    } catch {
      this.resizer = new ImageResizeService();
    }
    try {
      this.qualityMetrics = inject(ImageQualityMetricService);
    } catch {
      this.qualityMetrics = new ImageQualityMetricService();
    }
    try {
      this.intelligentEngine = inject(IntelligentOptimizationEngine);
    } catch {
      this.intelligentEngine = new IntelligentOptimizationEngine();
    }
  }

  /**
   * Phase 3: Executes candidate-based optimization workflow across Target-Size Mode
   * or Best-Compression Mode with perceptual metric validation.
   */
  async optimize(input: IntelligentOptimizationEngineInput): Promise<OptimizationOutcome> {
    return this.intelligentEngine.optimize({
      ...input,
      encoder: input.encoder || this.encoder
    });
  }

  /**
   * Bounded binary search optimization to find the highest achievable visual quality
   * that stays within the user's requested target byte budget.
   *
   * If quality optimization alone cannot reach the target byte limit (e.g. 5 KB on a 20 KB image),
   * and allowAdaptiveDownscale is true, stepped downscaling is adaptively applied
   * to guarantee the output fits the requested ceiling without distortion.
   */
  async searchOptimalQuality(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    targetMime: string,
    targetBytes: number,
    minQuality = DEFAULT_MIN_QUALITY_FLOOR,
    maxIterations = MAX_OPTIMIZATION_PASSES,
    onIterationProgress?: (iteration: number, quality: number, currentBytes: number) => void,
    abortSignal?: AbortSignal,
    allowAdaptiveDownscale = true,
    originalBytes?: number
  ): Promise<TargetOptimizationResult> {
    if (abortSignal?.aborted) {
      throw new Error('Target size optimization cancelled by user.');
    }

    if (targetBytes <= 0) {
      throw new Error('Target file size must be greater than zero bytes.');
    }

    const isLossless = targetMime === 'image/png' || targetMime === 'image/bmp' || targetMime === 'image/tiff';
    let currentCanvas = canvas;
    let iterations = 0;

    // 1. Lossless format handling (PNG, BMP, TIFF)
    if (isLossless) {
      iterations++;
      onIterationProgress?.(iterations, 100, 0);
      let output = await this.encoder.encode(currentCanvas, targetMime, 100, abortSignal);
      onIterationProgress?.(iterations, 100, output.size);

      if (output.size <= targetBytes) {
        return {
          optimalQuality: 100,
          optimalBlob: output.blob,
          optimalCanvas: currentCanvas,
          optimalWidth: currentCanvas.width,
          optimalHeight: currentCanvas.height,
          optimalSize: output.size,
          targetAchieved: true,
          targetUnreachable: false,
          iterationsCount: iterations
        };
      }

      // For PNG, test lossy palette quantization before giving up (if target >= 50 bytes)
      if (targetMime === 'image/png' && targetBytes >= 50) {
        let bestPassingPng: { q: number; blob: Blob; size: number } | null = null;
        let smallestPng: { q: number; blob: Blob; size: number } = { q: 100, blob: output.blob, size: output.size };

        for (const testQ of [90, 75, 60, 40, 20, 10]) {
          iterations++;
          const pngRes = await this.encoder.encode(currentCanvas, 'image/png', testQ, abortSignal);
          if (pngRes.size < smallestPng.size) {
            smallestPng = { q: testQ, blob: pngRes.blob, size: pngRes.size };
          }
          if (pngRes.size <= targetBytes) {
            bestPassingPng = { q: testQ, blob: pngRes.blob, size: pngRes.size };
            break; // Found largest palette that satisfies targetBytes
          }
        }

        if (bestPassingPng) {
          return {
            optimalQuality: bestPassingPng.q,
            optimalBlob: bestPassingPng.blob,
            optimalCanvas: currentCanvas,
            optimalWidth: currentCanvas.width,
            optimalHeight: currentCanvas.height,
            optimalSize: bestPassingPng.size,
            targetAchieved: true,
            targetUnreachable: false,
            iterationsCount: iterations
          };
        }
        output = { blob: smallestPng.blob, size: smallestPng.size, mimeType: 'image/png' };
      }

      // If lossless PNG exceeds target, check if adaptive downscaling can satisfy it
      if (allowAdaptiveDownscale && targetBytes >= 64) {
        let downscaleAttempts = 0;
        const maxPngDownscalePasses = 4;
        let cumulativeScale = 1.0;
        while (output.size > targetBytes && downscaleAttempts < maxPngDownscalePasses && iterations < maxIterations) {
          if (abortSignal?.aborted) throw new Error('Target size optimization cancelled by user.');
          downscaleAttempts++;
          iterations++;

          const scale = Math.max(0.40, Math.min(0.88, Math.sqrt(targetBytes / output.size) * 0.95));
          cumulativeScale = Math.max(0.08, cumulativeScale * scale);
          const minSafeDimension = Math.min(32, Math.floor(Math.min(canvas.width, canvas.height) / 2));
          const targetW = Math.max(minSafeDimension, Math.round(canvas.width * cumulativeScale));
          const targetH = Math.max(minSafeDimension, Math.round(canvas.height * cumulativeScale));

          if (targetW >= currentCanvas.width && targetH >= currentCanvas.height) {
            break;
          }

          const resized = this.resizer.resizeCanvas(canvas, {
            enabled: true,
            mode: 'dimensions',
            width: targetW,
            height: targetH,
            maintainAspectRatio: true,
            preventUpscale: true,
            percentage: 100
          }, true);
          currentCanvas = resized.canvas;

          onIterationProgress?.(iterations, 100, 0);
          output = await this.encoder.encode(currentCanvas, targetMime, 100, abortSignal);
          onIterationProgress?.(iterations, 100, output.size);

          if (output.size <= targetBytes) {
            return {
              optimalQuality: 100,
              optimalBlob: output.blob,
              optimalCanvas: currentCanvas,
              optimalWidth: currentCanvas.width,
              optimalHeight: currentCanvas.height,
              optimalSize: output.size,
              targetAchieved: true,
              targetUnreachable: false,
              iterationsCount: iterations
            };
          }
        }
      }

      return {
        optimalQuality: 100,
        optimalBlob: output.blob,
        optimalCanvas: currentCanvas,
        optimalWidth: currentCanvas.width,
        optimalHeight: currentCanvas.height,
        optimalSize: output.size,
        targetAchieved: false,
        targetUnreachable: true,
        iterationsCount: iterations,
        warning: `Lossless PNG produces ${this.formatBytes(output.size)}, exceeding ${this.formatBytes(targetBytes)}. Convert to WebP or downscale dimensions to meet target.`
      };
    }

    // 2. Pass 1: Test floor quality on currentCanvas
    iterations++;
    const floorQ = (targetBytes < (originalBytes || 100000) * 0.3)
      ? Math.max(1, Math.min(DEFAULT_MIN_QUALITY_FLOOR, minQuality))
      : Math.max(DEFAULT_MIN_QUALITY_FLOOR, Math.min(90, minQuality));
    onIterationProgress?.(iterations, floorQ, 0);

    let floorOutput = await this.encoder.encode(currentCanvas, targetMime, floorQ, abortSignal, { aggressive: floorQ < 20 });
    onIterationProgress?.(iterations, floorQ, floorOutput.size);

    let smallestOverallBlob: Blob = floorOutput.blob;
    let smallestOverallSize = floorOutput.size;
    let smallestOverallCanvas = currentCanvas;
    let smallestOverallQ = floorQ;

    // Early impossible budget check (e.g. < 50 bytes for lossy container headers)
    if (targetBytes < 50) {
      return {
        optimalQuality: floorQ,
        optimalBlob: floorOutput.blob,
        optimalCanvas: canvas,
        optimalWidth: canvas.width,
        optimalHeight: canvas.height,
        optimalSize: floorOutput.size,
        targetAchieved: false,
        targetUnreachable: true,
        iterationsCount: iterations,
        warning: `Target size of ${this.formatBytes(targetBytes)} is unreachable at current resolution. Minimum achievable size is ${this.formatBytes(floorOutput.size)} at Q${floorQ}%. Consider reducing image dimensions.`
      };
    }

    // Check lower quality levels (down to minQuality or 1) if floorQ was still too large
    if (floorOutput.size > targetBytes && floorQ > 1) {
      for (const deepQ of [15, 10, 5, 3, 2, 1]) {
        if (deepQ >= floorQ || deepQ < minQuality) continue;
        iterations++;
        const deepOutput = await this.encoder.encode(currentCanvas, targetMime, deepQ, abortSignal, { aggressive: true });
        if (deepOutput.size < smallestOverallSize) {
          smallestOverallBlob = deepOutput.blob;
          smallestOverallSize = deepOutput.size;
          smallestOverallQ = deepQ;
        }
        if (deepOutput.size <= targetBytes) {
          let low = deepQ;
          let high = floorQ;
          let bestQ = deepQ;
          let bestBlob = deepOutput.blob;
          let bestSize = deepOutput.size;

          while (low <= high && iterations < maxIterations) {
            iterations++;
            const mid = Math.round((low + high) / 2);
            const testOut = await this.encoder.encode(currentCanvas, targetMime, mid, abortSignal, { aggressive: true });
            if (testOut.size <= targetBytes) {
              bestQ = mid;
              bestBlob = testOut.blob;
              bestSize = testOut.size;
              low = mid + 1;
            } else {
              high = mid - 1;
            }
            if (high - low <= 2) break;
          }

          return {
            optimalQuality: bestQ,
            optimalBlob: bestBlob,
            optimalCanvas: currentCanvas,
            optimalWidth: currentCanvas.width,
            optimalHeight: currentCanvas.height,
            optimalSize: bestSize,
            targetAchieved: true,
            targetUnreachable: false,
            iterationsCount: iterations
          };
        }
      }
    }

    const formatCeiling = targetMime === 'image/avif'
      ? 75
      : (targetMime === 'image/webp' ? 88 : 92);

    // 3. Pass 2: If floorQ satisfies targetBytes, check high quality ceiling
    if (floorOutput.size <= targetBytes) {
      iterations++;
      const ceilingQ = formatCeiling;
      onIterationProgress?.(iterations, ceilingQ, 0);

      const ceilingOutput = await this.encoder.encode(currentCanvas, targetMime, ceilingQ, abortSignal);
      onIterationProgress?.(iterations, ceilingQ, ceilingOutput.size);

      if (ceilingOutput.size <= targetBytes) {
        return {
          optimalQuality: ceilingQ,
          optimalBlob: ceilingOutput.blob,
          optimalCanvas: currentCanvas,
          optimalWidth: currentCanvas.width,
          optimalHeight: currentCanvas.height,
          optimalSize: ceilingOutput.size,
          targetAchieved: true,
          targetUnreachable: false,
          iterationsCount: iterations
        };
      }

      // 4. Binary search between floorQ and ceilingQ
      let low = floorQ;
      let high = ceilingQ;
      let bestPassingQ = floorQ;
      let bestPassingBlob = floorOutput.blob;
      let bestPassingSize = floorOutput.size;

      while (low <= high && iterations < maxIterations) {
        if (abortSignal?.aborted) throw new Error('Target size optimization cancelled by user.');
        iterations++;
        const midQ = Math.round((low + high) / 2);
        onIterationProgress?.(iterations, midQ, 0);

        try {
          const testOutput = await this.encoder.encode(currentCanvas, targetMime, midQ, abortSignal);
          onIterationProgress?.(iterations, midQ, testOutput.size);

          if (testOutput.size <= targetBytes) {
            bestPassingQ = midQ;
            bestPassingBlob = testOutput.blob;
            bestPassingSize = testOutput.size;
            low = midQ + 1; // Try to search for higher quality within budget
          } else {
            high = midQ - 1; // Size too large, decrease quality search range
          }
        } catch {
          high = midQ - 1;
        }

        if (high - low <= 2) {
          break;
        }
      }

      return {
        optimalQuality: bestPassingQ,
        optimalBlob: bestPassingBlob,
        optimalCanvas: currentCanvas,
        optimalWidth: currentCanvas.width,
        optimalHeight: currentCanvas.height,
        optimalSize: bestPassingSize,
        targetAchieved: true,
        targetUnreachable: false,
        iterationsCount: iterations
      };
    }

    // 5. Quality floor alone is larger than targetBytes on current canvas.
    // If adaptive downscale is allowed, apply stepped downscaling to achieve the target limit!
    if (allowAdaptiveDownscale) {
      let downscalePass = 0;
      const maxDownscalePasses = 4;
      let cumulativeScale = 1.0;

      while (floorOutput.size > targetBytes && downscalePass < maxDownscalePasses && iterations < maxIterations) {
        if (abortSignal?.aborted) throw new Error('Target size optimization cancelled by user.');
        downscalePass++;
        iterations++;

        // Scaling factor based on area ratio: scale = sqrt(targetBytes / currentBytes) * 0.96 (bounded between 0.35 and 0.90)
        const currentBytes = smallestOverallSize;
        const areaRatio = targetBytes / currentBytes;
        const stepScale = Math.max(0.35, Math.min(0.90, Math.sqrt(areaRatio) * 0.96));
        cumulativeScale = Math.max(0.08, cumulativeScale * stepScale);

        const minSafeDimension = Math.min(32, Math.floor(Math.min(canvas.width, canvas.height) / 2));
        const targetW = Math.max(minSafeDimension, Math.round(canvas.width * cumulativeScale));
        const targetH = Math.max(minSafeDimension, Math.round(canvas.height * cumulativeScale));

        if (targetW >= currentCanvas.width && targetH >= currentCanvas.height) {
          break; // Cannot downscale further
        }

        // Stepped downscale directly from original canvas with restrained sharpening to restore edge clarity
        const downscaled = this.resizer.resizeCanvas(canvas, {
          enabled: true,
          mode: 'dimensions',
          width: targetW,
          height: targetH,
          maintainAspectRatio: true,
          preventUpscale: true,
          percentage: 100
        }, true);

        currentCanvas = downscaled.canvas;

        // Test at balanced quality (Q78) on the downscaled canvas
        const testQ = Math.min(78, formatCeiling);
        onIterationProgress?.(iterations, testQ, 0);
        const testOutput = await this.encoder.encode(currentCanvas, targetMime, testQ, abortSignal);
        onIterationProgress?.(iterations, testQ, testOutput.size);

        if (testOutput.size < smallestOverallSize) {
          smallestOverallBlob = testOutput.blob;
          smallestOverallSize = testOutput.size;
          smallestOverallCanvas = currentCanvas;
          smallestOverallQ = testQ;
        }

        if (testOutput.size <= targetBytes) {
          // Fits at testQ! Search if higher quality (testQ to formatCeiling) also fits
          let low = testQ;
          let high = formatCeiling;
          let bestPassingQ = testQ;
          let bestPassingBlob = testOutput.blob;
          let bestPassingSize = testOutput.size;

          while (low <= high && iterations < maxIterations) {
            iterations++;
            const midQ = Math.round((low + high) / 2);
            const sub = await this.encoder.encode(currentCanvas, targetMime, midQ, abortSignal);
            if (sub.size <= targetBytes) {
              bestPassingQ = midQ;
              bestPassingBlob = sub.blob;
              bestPassingSize = sub.size;
              low = midQ + 1;
            } else {
              high = midQ - 1;
            }
            if (high - low <= 2) break;
          }

          return {
            optimalQuality: bestPassingQ,
            optimalBlob: bestPassingBlob,
            optimalCanvas: currentCanvas,
            optimalWidth: currentCanvas.width,
            optimalHeight: currentCanvas.height,
            optimalSize: bestPassingSize,
            targetAchieved: true,
            targetUnreachable: false,
            iterationsCount: iterations
          };
        } else {
          // testOutput.size > targetBytes. Check floor quality on downscaled canvas
          iterations++;
          floorOutput = await this.encoder.encode(currentCanvas, targetMime, floorQ, abortSignal);
          if (floorOutput.size < smallestOverallSize) {
            smallestOverallBlob = floorOutput.blob;
            smallestOverallSize = floorOutput.size;
            smallestOverallCanvas = currentCanvas;
            smallestOverallQ = floorQ;
          }

          if (floorOutput.size <= targetBytes) {
            // Binary search between floorQ and testQ
            let low = floorQ;
            let high = testQ;
            let bestPassingQ = floorQ;
            let bestPassingBlob = floorOutput.blob;
            let bestPassingSize = floorOutput.size;

            while (low <= high && iterations < maxIterations) {
              iterations++;
              const midQ = Math.round((low + high) / 2);
              const sub = await this.encoder.encode(currentCanvas, targetMime, midQ, abortSignal);
              if (sub.size <= targetBytes) {
                bestPassingQ = midQ;
                bestPassingBlob = sub.blob;
                bestPassingSize = sub.size;
                low = midQ + 1;
              } else {
                high = midQ - 1;
              }
              if (high - low <= 2) break;
            }

            return {
              optimalQuality: bestPassingQ,
              optimalBlob: bestPassingBlob,
              optimalCanvas: currentCanvas,
              optimalWidth: currentCanvas.width,
              optimalHeight: currentCanvas.height,
              optimalSize: bestPassingSize,
              targetAchieved: true,
              targetUnreachable: false,
              iterationsCount: iterations
            };
          }
        }
      }
    }

    // 6. Exhausted all attempts; target is mathematically or practically unreachable
    const warningMsg = !allowAdaptiveDownscale
      ? `Target size of ${this.formatBytes(targetBytes)} could not be reached at original resolution (${canvas.width}×${canvas.height}) without severe visual distortion. Achieved ${this.formatBytes(smallestOverallSize)} at minimum acceptable quality. Enable resizing in settings to reduce pixel dimensions.`
      : `Target size of ${this.formatBytes(targetBytes)} is unreachable at current resolution. Minimum achievable size is ${this.formatBytes(smallestOverallSize)} at Q${floorQ}%. Consider reducing image dimensions.`;

    return {
      optimalQuality: smallestOverallQ,
      optimalBlob: smallestOverallBlob,
      optimalCanvas: smallestOverallCanvas,
      optimalWidth: smallestOverallCanvas.width,
      optimalHeight: smallestOverallCanvas.height,
      optimalSize: smallestOverallSize,
      targetAchieved: false,
      targetUnreachable: true,
      iterationsCount: iterations,
      warning: warningMsg
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
  }
}

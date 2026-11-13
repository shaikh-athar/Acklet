// apps/tool-image-compressor/src/services/target-size-optimizer.service.ts
import { Injectable, inject } from '@angular/core';
import { ImageEncoderService } from './image-encoder.service';
import { COMPRESSOR_CONFIG } from '../config/compressor.config';

export interface TargetOptimizationResult {
  optimalQuality: number; // 1-100
  optimalBlob: Blob;
  optimalSize: number;
  targetAchieved: boolean;
  targetUnreachable: boolean;
  iterationsCount: number;
  warning?: string;
}

export const DEFAULT_MIN_QUALITY_FLOOR = COMPRESSOR_CONFIG.targetSize.qualityFloor;
export const MAX_OPTIMIZATION_PASSES = COMPRESSOR_CONFIG.targetSize.maxPasses;

@Injectable({
  providedIn: 'root'
})
export class TargetSizeOptimizerService {
  private readonly encoder: ImageEncoderService;

  constructor() {
    try {
      this.encoder = inject(ImageEncoderService);
    } catch {
      this.encoder = new ImageEncoderService();
    }
  }

  /**
   * Bounded binary search optimization to find the highest achievable visual quality
   * that stays within the user's requested target byte budget.
   */
  async searchOptimalQuality(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    targetMime: string,
    targetBytes: number,
    minQuality = DEFAULT_MIN_QUALITY_FLOOR,
    maxIterations = MAX_OPTIMIZATION_PASSES,
    onIterationProgress?: (iteration: number, quality: number, currentBytes: number) => void,
    abortSignal?: AbortSignal
  ): Promise<TargetOptimizationResult> {
    if (abortSignal?.aborted) {
      throw new Error('Target size optimization cancelled by user.');
    }

    const isLossless = targetMime === 'image/png';

    // 1. Lossless PNG handling
    if (isLossless) {
      const output = await this.encoder.encode(canvas, targetMime, 100, abortSignal);
      const targetAchieved = output.size <= targetBytes;
      return {
        optimalQuality: 100,
        optimalBlob: output.blob,
        optimalSize: output.size,
        targetAchieved,
        targetUnreachable: !targetAchieved,
        iterationsCount: 1,
        warning: !targetAchieved
          ? `Lossless PNG produces ${this.formatBytes(output.size)}, exceeding ${this.formatBytes(targetBytes)}. Convert to WebP or downscale dimensions to meet target.`
          : undefined
      };
    }

    // 2. Pass 1: Check minimum quality floor to detect impossible targets early
    let iterations = 1;
    const floorQ = Math.max(10, Math.min(90, minQuality));
    onIterationProgress?.(iterations, floorQ, 0);

    const floorOutput = await this.encoder.encode(canvas, targetMime, floorQ, abortSignal);
    onIterationProgress?.(iterations, floorQ, floorOutput.size);

    if (floorOutput.size > targetBytes) {
      // Even at minimum quality floor, the output is larger than requested target size
      return {
        optimalQuality: floorQ,
        optimalBlob: floorOutput.blob,
        optimalSize: floorOutput.size,
        targetAchieved: false,
        targetUnreachable: true,
        iterationsCount: iterations,
        warning: `Target size of ${this.formatBytes(targetBytes)} is unreachable at current resolution. Minimum achievable size is ${this.formatBytes(floorOutput.size)} at Q${floorQ}%. Consider reducing image dimensions.`
      };
    }

    // 3. Pass 2: Check high quality ceiling (92%)
    iterations++;
    const ceilingQ = 92;
    onIterationProgress?.(iterations, ceilingQ, 0);

    const ceilingOutput = await this.encoder.encode(canvas, targetMime, ceilingQ, abortSignal);
    onIterationProgress?.(iterations, ceilingQ, ceilingOutput.size);

    if (ceilingOutput.size <= targetBytes) {
      // High quality already satisfies target size! No need to compress further
      return {
        optimalQuality: ceilingQ,
        optimalBlob: ceilingOutput.blob,
        optimalSize: ceilingOutput.size,
        targetAchieved: true,
        targetUnreachable: false,
        iterationsCount: iterations
      };
    }

    // 4. Bounded Binary Search between floorQ and ceilingQ
    let low = floorQ;
    let high = ceilingQ;
    let bestPassingQ = floorQ;
    let bestPassingBlob: Blob = floorOutput.blob;
    let bestPassingSize = floorOutput.size;

    while (low <= high && iterations < maxIterations) {
      if (abortSignal?.aborted) {
        throw new Error('Target size optimization cancelled by user.');
      }

      iterations++;
      const midQ = Math.round((low + high) / 2);
      onIterationProgress?.(iterations, midQ, 0);

      try {
        const testOutput = await this.encoder.encode(canvas, targetMime, midQ, abortSignal);
        onIterationProgress?.(iterations, midQ, testOutput.size);

        if (testOutput.size <= targetBytes) {
          bestPassingQ = midQ;
          bestPassingBlob = testOutput.blob;
          bestPassingSize = testOutput.size;
          low = midQ + 1; // Try to search for higher quality within budget
        } else {
          high = midQ - 1; // Size too large, decrease quality search range
        }
      } catch (err) {
        high = midQ - 1;
      }

      if (high - low <= 2) {
        break; // Narrowed to within 2 quality points
      }
    }

    return {
      optimalQuality: bestPassingQ,
      optimalBlob: bestPassingBlob,
      optimalSize: bestPassingSize,
      targetAchieved: true,
      targetUnreachable: false,
      iterationsCount: iterations
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


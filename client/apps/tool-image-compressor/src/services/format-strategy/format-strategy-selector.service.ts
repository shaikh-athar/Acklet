// apps/tool-image-compressor/src/services/format-strategy/format-strategy-selector.service.ts
/**
 * Phase 2: Format Strategy Selector Service.
 *
 * Automatically inspects image characteristics, format capabilities, and user constraints,
 * dynamically selecting and executing the optimal format-specific optimization strategy.
 */

import { Injectable, inject } from '@angular/core';
import { ImageCapabilityService } from '../image-capability.service';
import { ImageEncoderService } from '../image-encoder.service';
import { OutputFormatOption } from '../../models/compressor.models';
import {
  StrategyCandidate,
  StrategySelectionInput,
  CandidateEvaluationConstraints,
  CandidateEvaluationResult
} from './format-strategy.models';
import { JpegOptimizationStrategy } from './jpeg-strategy';
import { PngOptimizationStrategy } from './png-strategy';
import { WebpOptimizationStrategy } from './webp-strategy';
import { TiffBmpOptimizationStrategy } from './tiff-bmp-strategy';
import { CandidateEvaluator } from './candidate-evaluator';

@Injectable({
  providedIn: 'root'
})
export class FormatStrategySelectorService {
  private readonly capabilityService: ImageCapabilityService;
  private readonly encoder: ImageEncoderService;

  constructor(
    capabilityService?: ImageCapabilityService,
    encoder?: ImageEncoderService
  ) {
    if (capabilityService) {
      this.capabilityService = capabilityService;
    } else {
      try {
        this.capabilityService = inject(ImageCapabilityService);
      } catch {
        this.capabilityService = new ImageCapabilityService();
      }
    }
    if (encoder) {
      this.encoder = encoder;
    } else {
      try {
        this.encoder = inject(ImageEncoderService);
      } catch {
        this.encoder = new ImageEncoderService();
      }
    }
  }

  /**
   * Executes format-specific candidate generation and constraint evaluation.
   */
  async selectAndExecuteStrategy(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    input: StrategySelectionInput,
    rawOriginalFileBytes?: Uint8Array,
    encoder?: ImageEncoderService
  ): Promise<CandidateEvaluationResult> {
    if (input.abortSignal?.aborted) {
      throw new Error('Compression cancelled by user.');
    }

    const activeEncoder = encoder || this.encoder;

    const target = this.capabilityService.resolveOutputTarget(
      input.targetFormat as OutputFormatOption,
      input.detectedFormat
    );

    let candidates: StrategyCandidate[] = [];

    switch (target.mimeType) {
      case 'image/jpeg':
        candidates = await JpegOptimizationStrategy.generateCandidates(canvas, input, activeEncoder);
        break;

      case 'image/png':
        candidates = await PngOptimizationStrategy.generateCandidates(
          canvas,
          input,
          activeEncoder,
          rawOriginalFileBytes
        );
        break;

      case 'image/webp':
        candidates = await WebpOptimizationStrategy.generateCandidates(canvas, input, activeEncoder);
        break;

      case 'image/tiff':
        candidates = await TiffBmpOptimizationStrategy.generateTiffCandidates(canvas, input, activeEncoder);
        break;

      case 'image/bmp':
        candidates = await TiffBmpOptimizationStrategy.generateBmpCandidates(canvas, input, activeEncoder);
        break;

      default:
        break;
    }

    const constraints: CandidateEvaluationConstraints = {
      targetBytes: input.targetBytes,
      isCustomTargetMode: input.isCustomTargetMode,
      strictMaxTarget: input.isCustomTargetMode && !!input.targetBytes,
      disallowFormatChange: input.targetFormat === 'original' || input.targetFormat === input.detectedFormat,
      disallowLossy: Boolean(input.isLosslessRequested || (!input.isCustomTargetMode && input.userQuality === 100)),
      minSsimThreshold: input.isCustomTargetMode ? 0 : 0.85,
      originalSize: input.originalSize,
      originalWidth: input.width,
      originalHeight: input.height,
      targetMimeType: target.mimeType
    };

    return CandidateEvaluator.evaluateCandidates(candidates, constraints);
  }
}

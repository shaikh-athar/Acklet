// apps/tool-image-compressor/src/services/format-strategy/format-strategy.models.ts
/**
 * Data contracts and interfaces for Phase 2: Format-Specific Optimization & Candidate Evaluation.
 */

import { AdvancedOptimizationSettings } from '../../models/compressor.models';

export type CompressionStrategyType =
  | 'jpeg-mozjpeg'
  | 'png-lossless'
  | 'png-lossy'
  | 'webp-adaptive'
  | 'tiff-packbits'
  | 'bmp-optimized'
  | 'canvas-fallback';

export interface StrategyCandidate {
  blob: Blob;
  size: number;
  mimeType: string;
  format: string;
  extension: string;
  width: number;
  height: number;
  canvas?: HTMLCanvasElement | OffscreenCanvas;
  isLossless: boolean;
  quality?: number;
  ssim?: number;
  psnr?: number;
  strategyName: string;
  configDescription: string;
  durationMs: number;
  colors?: number;
}

export interface StrategySelectionInput {
  detectedFormat: string;
  targetFormat: string;
  originalSize: number;
  width: number;
  height: number;
  hasAlpha: boolean;
  isPhoto: boolean;
  uniqueColorCount: number;
  isLosslessRequested: boolean;
  userQuality: number;
  isCustomTargetMode: boolean;
  targetBytes?: number;
  advanced?: AdvancedOptimizationSettings;
  abortSignal?: AbortSignal;
}

export interface CandidateEvaluationConstraints {
  targetBytes?: number;
  isCustomTargetMode: boolean;
  strictMaxTarget: boolean;
  disallowFormatChange: boolean;
  disallowLossy: boolean;
  minSsimThreshold: number;
  originalSize: number;
  originalWidth: number;
  originalHeight: number;
  targetMimeType: string;
}

export interface CandidateEvaluationResult {
  selectedCandidate: StrategyCandidate | null;
  closestAchievableCandidate: StrategyCandidate | null;
  allEvaluatedCandidates: StrategyCandidate[];
  rejectedCandidatesCount: number;
  targetAchieved: boolean;
  targetUnreachable: boolean;
  reason: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3: Intelligent Target-Size Optimization Engine Contracts
// ─────────────────────────────────────────────────────────────────────────────

export type OptimizationEngineMode = 'target-size' | 'best-compression';

export interface QualityAcceptancePolicy {
  /** Minimum acceptable SSIM (0.0 - 1.0) before rejecting candidate as severely degraded */
  minAcceptableSsim?: number;
  /** Target ideal SSIM threshold (e.g. 0.90 for high fidelity) */
  targetSsim?: number;
  /** Minimum Peak Signal-to-Noise Ratio (dB) */
  minPsnrDb?: number;
  /** Maximum acceptable artifact score (0 - 100) */
  maxArtifactScore?: number;
  /** Maximum SSIM difference considered visually indistinguishable for size tie-breaker (default 0.015) */
  ssimTieBreakThreshold?: number;
}

export interface OptimizationOutcome {
  mode: OptimizationEngineMode;
  selectedCandidate: StrategyCandidate | null;
  closestAchievableCandidate: StrategyCandidate | null;
  allEvaluatedCandidates: StrategyCandidate[];
  rejectedCandidatesCount: number;
  targetAchieved: boolean;
  targetUnreachable: boolean;
  reason: string;
  originalSize: number;
  compressedSize: number;
  savedPercentage: number;
  compressionRatio: number;
  iterationsCount: number;
  cacheHits: number;
  visualQuality?: {
    ssim: number;
    psnr: number;
    qualityRating: 'excellent' | 'good' | 'fair' | 'poor';
  };
}

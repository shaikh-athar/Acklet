// apps/tool-image-compressor/src/services/format-strategy/candidate-evaluator.ts
/**
 * Phase 2: Candidate Evaluation & Selection Engine.
 *
 * Implements strict, constraint-aware candidate ranking:
 * 1. Rejects candidates violating strict user constraints (target size, format preservation, dimensions, lossless mode).
 * 2. Compares visual quality (SSIM) and actual output bytes (never estimated formulas).
 * 3. Selects the optimal candidate or honestly reports unreachable target limits.
 */

import {
  StrategyCandidate,
  CandidateEvaluationConstraints,
  CandidateEvaluationResult
} from './format-strategy.models';

export class CandidateEvaluator {
  /**
   * Evaluates and filters generated candidates against strict user constraints.
   */
  static evaluateCandidates(
    candidates: StrategyCandidate[],
    constraints: CandidateEvaluationConstraints
  ): CandidateEvaluationResult {
    let rejectedCount = 0;
    const validCandidates: StrategyCandidate[] = [];
    let smallestOverall: StrategyCandidate | null = null;

    for (const cand of candidates) {
      if (!cand || cand.size <= 0) {
        rejectedCount++;
        continue;
      }

      // Track smallest overall candidate for closest achievable reporting
      if (!smallestOverall || cand.size < smallestOverall.size) {
        smallestOverall = cand;
      }

      // Constraint 1: Format preservation (no unrequested format mutation)
      if (constraints.disallowFormatChange && cand.mimeType !== constraints.targetMimeType) {
        rejectedCount++;
        continue;
      }

      // Constraint 2: Dimension preservation (no unrequested resizing)
      if (cand.width !== constraints.originalWidth || cand.height !== constraints.originalHeight) {
        rejectedCount++;
        continue;
      }

      // Constraint 3: Strict lossless constraint
      if (constraints.disallowLossy && (!cand.isLossless || (cand.ssim != null && cand.ssim < 0.999))) {
        rejectedCount++;
        continue;
      }

      // Constraint 4: Visual quality floor (Applies ONLY to Default mode so uncustomized images maintain high fidelity.
      // In Custom Target Mode, target size is primary objective: never reject an otherwise valid candidate merely because its quality score falls below an arbitrary threshold).
      if (!constraints.isCustomTargetMode && cand.ssim != null && cand.ssim < constraints.minSsimThreshold) {
        rejectedCount++;
        continue;
      }

      // Constraint 5: Target Size enforcement
      if (constraints.isCustomTargetMode && constraints.targetBytes && constraints.targetBytes > 0) {
        // STRICT MAXIMUM FILE-SIZE LIMIT
        if (cand.size > constraints.targetBytes) {
          rejectedCount++;
          continue;
        }
      } else {
        // Default Mode: Candidate must be smaller than original file
        if (cand.size >= constraints.originalSize) {
          rejectedCount++;
          continue;
        }
      }

      validCandidates.push(cand);
    }

    if (validCandidates.length === 0) {
      return {
        selectedCandidate: null,
        closestAchievableCandidate: smallestOverall,
        allEvaluatedCandidates: candidates,
        rejectedCandidatesCount: rejectedCount,
        targetAchieved: false,
        targetUnreachable: constraints.isCustomTargetMode && !!constraints.targetBytes,
        reason: constraints.isCustomTargetMode
          ? `Requested target could not be reached in ${constraints.targetMimeType}. Closest achievable output size: ${smallestOverall ? (smallestOverall.size / 1024).toFixed(1) + ' KB' : 'N/A'}.`
          : 'Already optimal. Image cannot be safely compressed further without quality loss.'
      };
    }

    // Rank valid candidates according to operating mode:
    if (constraints.isCustomTargetMode) {
      // Mode 1: Target-Size Mode
      // When target size is met, prioritize higher visual quality (SSIM).
      // If visual quality difference is negligible (<= 0.015), select smaller file size.
      validCandidates.sort((a, b) => {
        const ssimA = a.ssim ?? (a.isLossless ? 1.0 : (a.quality ? a.quality / 100 : 0.85));
        const ssimB = b.ssim ?? (b.isLossless ? 1.0 : (b.quality ? b.quality / 100 : 0.85));
        const ssimDiff = ssimB - ssimA;

        if (Math.abs(ssimDiff) > 0.015) {
          return ssimDiff; // Higher visual quality wins
        }
        return a.size - b.size; // Similar visual quality: smaller file size wins
      });
    } else {
      // Mode 2: Best-Compression Mode
      // Find the smallest candidate that satisfies the quality policy (minSsimThreshold).
      validCandidates.sort((a, b) => a.size - b.size);
    }

    const winner = validCandidates[0];

    return {
      selectedCandidate: winner,
      closestAchievableCandidate: smallestOverall,
      allEvaluatedCandidates: candidates,
      rejectedCandidatesCount: rejectedCount,
      targetAchieved: true,
      targetUnreachable: false,
      reason: `Optimal candidate selected via ${winner.strategyName}: ${winner.configDescription} (${(winner.size / 1024).toFixed(1)} KB)`
    };
  }
}

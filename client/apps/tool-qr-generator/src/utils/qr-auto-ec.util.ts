// client/apps/tool-qr-generator/src/utils/qr-auto-ec.util.ts
import { QrErrorCorrectionLevel } from '../models/qr-generator.models';

export interface AutoEcParams {
  content: string;
  type?: string;
  hasLogo: boolean;
  hasCenterFrame?: boolean;
  hasCustomShapes?: boolean;
  isDynamic?: boolean;
}

export interface AutoEcResult {
  level: QrErrorCorrectionLevel;
  warning?: string;
  downgradedFromH?: boolean;
  reason?: string;
}

/**
 * Byte capacities for QR codes at Version 10 (density limit threshold):
 * H (~30% recovery): ~174 alphanumeric/byte characters
 * Q (~25% recovery): ~271 alphanumeric/byte characters
 * M (~15% recovery): ~382 alphanumeric/byte characters
 * L (~7% recovery):  ~461 alphanumeric/byte characters
 */
const V10_CAPACITY_H = 174;
const V10_CAPACITY_Q = 271;
const V10_CAPACITY_M = 382;

/**
 * Pure function to automatically determine optimal QR Error Correction level.
 *
 * Rules:
 * 1. For dynamic smart links (compact short URLs), default to 'Q' (25% recovery) or 'H' if logo/shapes present.
 * 2. Default to 'Q' for standard clean direct codes.
 * 3. If a logo, center frame, or custom module shape is present, upgrade to 'H' (highest 30% redundancy).
 * 4. If payload length exceeds Version 10 density limit:
 *    - With logo or custom shapes: drop from 'H' to 'M'. Never go below 'M'.
 *    - Without logo: drop from 'Q' to 'M', then 'L' for extreme lengths.
 */
export function calculateAutoErrorCorrection(params: AutoEcParams): AutoEcResult {
  const requiresHighRecovery = params.hasLogo || Boolean(params.hasCenterFrame) || Boolean(params.hasCustomShapes);
  const length = (params.content || '').length;

  // Dynamic QR codes encode a compact short URL (~28 chars, Version 2-3)
  if (params.isDynamic) {
    if (requiresHighRecovery) {
      return {
        level: 'H',
        reason: 'Dynamic smart link with center logo or decorative shapes (30% recovery)'
      };
    }
    return {
      level: 'Q',
      reason: 'Dynamic smart link encoding short URL for rapid scanning (25% recovery)'
    };
  }

  if (requiresHighRecovery) {
    if (length <= V10_CAPACITY_H) {
      return {
        level: 'H',
        reason: 'Center logo or custom shapes detected (highest 30% recovery)'
      };
    }

    if (length <= V10_CAPACITY_M) {
      return {
        level: 'M',
        downgradedFromH: true,
        reason: 'Content length requires balanced density with logo (15% recovery)'
      };
    }

    // Payload is too long for safe logo embedding without extreme density
    return {
      level: 'M',
      warning: 'Content is long for a centered logo. Some phones may scan slower; consider shortening the link or reducing logo size.',
      reason: 'Long content with logo capped at Level M to preserve scannable module size'
    };
  }

  // Without logo: start at Q
  if (length <= V10_CAPACITY_Q) {
    return {
      level: 'Q',
      reason: 'Direct payload optimized for high error tolerance (25% recovery)'
    };
  }

  if (length <= V10_CAPACITY_M) {
    return {
      level: 'M',
      reason: 'Direct payload balanced for medium density (15% recovery)'
    };
  }

  // Plain text uses error correction level M above ~800 bytes (fits in QR capacity at 2,300 bytes); L is not needed
  if (params.type === 'text') {
    return {
      level: 'M',
      reason: 'Plain text encoding optimized for readability (15% recovery)'
    };
  }

  return {
    level: 'L',
    reason: 'Dense direct payload requiring maximum data capacity (7% recovery)'
  };
}

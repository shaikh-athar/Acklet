// client/apps/tool-qr-generator/src/utils/qr-auto-ec.util.ts
import { QrErrorCorrectionLevel } from '../models/qr-generator.models';

export interface AutoEcParams {
  content: string;
  type?: string;
  hasLogo: boolean;
  hasCenterFrame?: boolean;
}

export interface AutoEcResult {
  level: QrErrorCorrectionLevel;
  warning?: string;
  downgradedFromH?: boolean;
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
 * 1. Default to 'Q' for standard clean codes.
 * 2. If a logo or center frame image is present, upgrade to 'H' (highest 30% redundancy).
 * 3. If payload length exceeds Version 10 density limit:
 *    - With logo: drop from 'H' to 'M'. Never go below 'M' with a logo.
 *      If payload exceeds 'M' capacity (>382 chars), issue a clear plain-language warning.
 *    - Without logo: drop from 'Q' to 'M', then 'L' for extreme lengths.
 */
export function calculateAutoErrorCorrection(params: AutoEcParams): AutoEcResult {
  const length = (params.content || '').length;
  const requiresHighRecovery = params.hasLogo || Boolean(params.hasCenterFrame);

  if (requiresHighRecovery) {
    if (length <= V10_CAPACITY_H) {
      return { level: 'H' };
    }

    if (length <= V10_CAPACITY_M) {
      return {
        level: 'M',
        downgradedFromH: true
      };
    }

    // Payload is too long for safe logo embedding without extreme density
    return {
      level: 'M',
      warning: 'Content is long for a centered logo. Some phones may scan slower; consider shortening the link or reducing logo size.'
    };
  }

  // Without logo: start at Q
  if (length <= V10_CAPACITY_Q) {
    return { level: 'Q' };
  }

  if (length <= V10_CAPACITY_M) {
    return { level: 'M' };
  }

  return { level: 'L' };
}

// apps/tool-image-compressor/src/services/honest-label.util.ts

export type HonestResultStatus = 'saved' | 'kept-original';

export interface HonestResultLabel {
  status: HonestResultStatus;
  badgeText: string | null; // e.g. "-24%" when saved, null when kept-original
  labelText: string; // e.g. "Saved 24%" | "Kept original"
  explanationText: string;
  savedPercentage: number | null; // positive percentage (>= 5) or null
}

export interface HonestLabelInput {
  originalSize: number;
  compressedSize: number;
  savedPercentage?: number;
  alreadyOptimized?: boolean;
  isLosslessOrFormatPreserved?: boolean;
  userRequestedLosslessOrOriginal?: boolean;
}

/**
 * Determines the honest status, badge, and label for an image result.
 * 
 * Rules:
 * 1. "Saved X%" when the output is at least 5% smaller than the original.
 * 2. If output did not reach at least 5% reduction, original is kept.
 * 3. Never return or display 0% or negative percentages.
 * 4. No "Already optimized" or "Your file was already small" messages.
 */
export function determineHonestResult(input: HonestLabelInput): HonestResultLabel {
  const orig = input.originalSize || 0;
  const comp = input.compressedSize || 0;

  // Case 1: Output equal, larger, or did not reach minimum 5% reduction -> Kept original
  const rawPct = orig > 0 ? ((orig - comp) / orig) * 100 : 0;
  const cleanPct = Math.round(rawPct);

  if (comp >= orig || cleanPct < 5 || input.alreadyOptimized) {
    return {
      status: 'kept-original',
      badgeText: null,
      labelText: 'Kept original',
      explanationText: '',
      savedPercentage: null
    };
  }

  // Case 2: Saved X% (at least 5% reduction)
  return {
    status: 'saved',
    badgeText: `-${cleanPct}%`,
    labelText: `Saved ${cleanPct}%`,
    explanationText: '',
    savedPercentage: cleanPct
  };
}


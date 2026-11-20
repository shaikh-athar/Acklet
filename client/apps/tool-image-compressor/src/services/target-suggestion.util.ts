// apps/tool-image-compressor/src/services/target-suggestion.util.ts

export interface DynamicTargetResult {
  targetBytes: number;
  targetValue: number;
  targetUnit: 'B' | 'KB' | 'MB';
  formattedLabel: string;
}

/**
 * Calculates dynamic default target file size based on original file size.
 * Formula: Target Size = Original File Size * 0.70 (Minimum 30% reduction goal).
 * Preserves exact bytes internally while displaying clean, sensible numbers with appropriate units.
 */
export function calculateDynamicDefaultTarget(originalBytes: number): DynamicTargetResult {
  if (!originalBytes || originalBytes <= 0) {
    return {
      targetBytes: 0,
      targetValue: 0,
      targetUnit: 'KB',
      formattedLabel: '0 KB'
    };
  }

  // Exact 30% reduction target in bytes
  const targetBytes = Math.round(originalBytes * 0.70);

  if (targetBytes < 1024) {
    return {
      targetBytes,
      targetValue: targetBytes,
      targetUnit: 'B',
      formattedLabel: `${targetBytes} B`
    };
  }

  // 1 MB reference rounding: 1000 KB - 1024 KB cleanly resolves to 700 KB
  if (originalBytes >= 980 * 1024 && originalBytes <= 1048576) {
    return {
      targetBytes,
      targetValue: 700,
      targetUnit: 'KB',
      formattedLabel: '700 KB'
    };
  }

  // Large files (>= 1.5 MB target) format cleanly in MB
  if (targetBytes >= 1024 * 1024 * 1.5) {
    const rawMb = targetBytes / (1024 * 1024);
    let cleanMb = Math.round(rawMb * 10) / 10;
    if (cleanMb % 1 === 0) {
      cleanMb = Math.round(cleanMb);
    }
    return {
      targetBytes,
      targetValue: cleanMb,
      targetUnit: 'MB',
      formattedLabel: `${cleanMb} MB`
    };
  }

  // KB unit with sensible rounding (e.g. 10KB->7KB, 20KB->14KB, 32KB->22.4KB, 50KB->35KB, 100KB->70KB, 250KB->175KB, 500KB->350KB)
  const rawKb = (originalBytes * 0.70) / 1024;
  let cleanKb = Math.round(rawKb * 10) / 10;
  if (cleanKb % 1 === 0) {
    cleanKb = Math.round(cleanKb);
  }

  return {
    targetBytes,
    targetValue: cleanKb,
    targetUnit: 'KB',
    formattedLabel: `${cleanKb} KB`
  };
}

export interface TargetSuggestion {
  bytes: number;
  value: number;
  unit: 'B' | 'KB' | 'MB';
  label: string;
  percentage: number;
}

/**
 * Format raw bytes into human readable KB or MB string.
 */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  if (bytes < k) {
    return `${Math.round(bytes)} B`;
  }
  const kb = bytes / k;
  if (kb < k) {
    const cleanKb = kb >= 10 ? Math.round(kb) : Math.round(kb * 10) / 10;
    return `${cleanKb} KB`;
  }
  const mb = kb / k;
  const cleanMb = mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10;
  return `${cleanMb} MB`;
}

/**
 * Generates quick target file size suggestions from an image's reference byte size
 * (current output size if already compressed, or original size if not).
 *
 * Rules:
 * - Every suggestion is lower than the reference size.
 * - Shows up to 3 values, each at least 5% smaller than the reference size.
 * - Rounds to clean numbers.
 * - Hides any chip that would not be strictly smaller.
 * - A chip never equals or exceeds the reference size.
 */
export function suggestTargets(referenceBytes: number): TargetSuggestion[] {
  if (!referenceBytes || referenceBytes <= 0) {
    return [];
  }

  // Minimum 5% reduction required: target <= referenceBytes * 0.95
  const maxAllowedBytes = Math.floor(referenceBytes * 0.95);
  if (maxAllowedBytes <= 0) {
    return [];
  }

  // For files under 2 KB, the slider uses bytes, not KB. Quick chips are 80%, 60%, and 40% of the file's current size, rounded to whole bytes.
  if (referenceBytes < 2048) {
    const percentages = [80, 60, 40];
    const suggestions: TargetSuggestion[] = [];
    for (const pct of percentages) {
      const b = Math.min(maxAllowedBytes, Math.round(referenceBytes * (pct / 100)));
      if (b > 0 && b < referenceBytes) {
        suggestions.push({
          bytes: b,
          value: b,
          unit: 'B',
          label: `${b} B`,
          percentage: pct
        });
      }
    }
    return suggestions;
  }

  const isMb = referenceBytes >= 1024 * 1024 * 1.5;
  const percentages = [80, 55, 30];
  const suggestions: TargetSuggestion[] = [];
  const seenLabels = new Set<string>();

  for (const pct of percentages) {
    const rawTargetBytes = Math.floor(referenceBytes * (pct / 100));
    const clampedBytes = Math.min(rawTargetBytes, maxAllowedBytes);

    let unit: 'KB' | 'MB';
    let cleanValue: number;
    let finalBytes: number;

    if (isMb) {
      unit = 'MB';
      const rawMb = clampedBytes / (1024 * 1024);
      cleanValue = rawMb >= 10 ? Math.floor(rawMb) : Math.floor(rawMb * 10) / 10;
      if (cleanValue <= 0) cleanValue = 0.5;
      finalBytes = Math.round(cleanValue * 1024 * 1024);
    } else {
      unit = 'KB';
      const rawKb = clampedBytes / 1024;
      if (rawKb >= 10) {
        cleanValue = Math.floor(rawKb);
      } else if (rawKb >= 1) {
        cleanValue = Math.floor(rawKb);
        if (cleanValue === 0) cleanValue = Math.floor(rawKb * 10) / 10;
      } else {
        cleanValue = Math.floor(rawKb * 10) / 10;
      }
      if (cleanValue <= 0) cleanValue = 1;
      finalBytes = Math.round(cleanValue * 1024);
    }

    // Ensure suggestion is strictly smaller than referenceBytes and at least 5% smaller
    while (finalBytes >= referenceBytes || finalBytes > maxAllowedBytes) {
      if (unit === 'MB') {
        cleanValue = Math.round((cleanValue - 0.1) * 10) / 10;
        finalBytes = Math.round(cleanValue * 1024 * 1024);
        if (cleanValue <= 0) break;
      } else {
        cleanValue = cleanValue - 1;
        if (cleanValue <= 0) {
          finalBytes = Math.floor(referenceBytes * 0.5);
          break;
        }
        finalBytes = Math.round(cleanValue * 1024);
      }
    }

    if (finalBytes < referenceBytes && finalBytes <= maxAllowedBytes && finalBytes > 0) {
      const label = `${cleanValue} ${unit}`;
      if (!seenLabels.has(label)) {
        seenLabels.add(label);
        suggestions.push({
          bytes: finalBytes,
          value: cleanValue,
          unit,
          label,
          percentage: Math.round(((referenceBytes - finalBytes) / referenceBytes) * 100)
        });
      }
    }
  }

  return suggestions.slice(0, 3);
}

/**
 * Returns true if the user's target is below 20% of reference image size.
 */
export function isTargetVeryLow(targetBytes: number, referenceBytes: number): boolean {
  if (!referenceBytes || referenceBytes <= 0 || !targetBytes || targetBytes <= 0) {
    return false;
  }
  return targetBytes < referenceBytes * 0.20;
}

/**
 * Clamps target size within the range [5%, 100%] of reference image size.
 */
export function clampTargetBytes(targetBytes: number, referenceBytes: number): number {
  if (!referenceBytes || referenceBytes <= 0) return Math.max(1, targetBytes);
  const minBytes = Math.max(1, Math.round(referenceBytes * 0.05));
  const maxBytes = referenceBytes;
  return Math.min(maxBytes, Math.max(minBytes, targetBytes));
}

/**
 * Calculates target bytes from a reduction percentage (0% to 90%).
 * target bytes = reference bytes * (1 - reduction / 100)
 */
export function calculateTargetFromReduction(
  referenceBytes: number,
  reductionPercent: number
): { targetBytes: number; formattedTarget: string; formattedOriginal: string } {
  const safeReduction = Math.max(0, Math.min(90, reductionPercent));
  const safeRef = Math.max(0, referenceBytes);
  const targetBytes = Math.round(safeRef * (1 - safeReduction / 100));

  return {
    targetBytes,
    formattedTarget: formatBytes(targetBytes),
    formattedOriginal: formatBytes(safeRef)
  };
}

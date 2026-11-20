// apps/tool-image-compressor/src/services/result-status.util.ts

export interface ResultStatus {
  outputBytes: number;
  reduced: boolean;
  savedPercent: number;
  targetBytes: number | null;
  targetMet: boolean;
}

export interface ResultStatusCandidateFile {
  originalSize?: number;
  originalUploadedSize?: number;
  originalBytes?: number;
  outputBytes?: number;
  file?: { size?: number };
  targetBytes?: number | null;
  result?: {
    compressedSize?: number;
    outputBlob?: { size?: number };
    targetBytesRequested?: number;
    closestAchievableSize?: number;
    targetAchieved?: boolean;
    targetUnreachable?: boolean;
  };
  individualSettings?: {
    targetFileSize?: {
      enabled?: boolean;
      targetBytes?: number;
      userDefined?: boolean;
      isDynamicDefault?: boolean;
    };
  };
  effectiveSettings?: {
    targetFileSize?: {
      enabled?: boolean;
      targetBytes?: number;
      userDefined?: boolean;
      isDynamicDefault?: boolean;
    };
  };
}

/**
 * Canonical unified status model for compressed files.
 * Ensures the card, output headline, console, and download always agree.
 */
export function resultStatus(file: ResultStatusCandidateFile | null | undefined): ResultStatus {
  if (!file) {
    return {
      outputBytes: 0,
      reduced: false,
      savedPercent: 0,
      targetBytes: null,
      targetMet: true
    };
  }

  // 1. Determine original byte size
  const originalBytes = file.originalUploadedSize ?? file.originalSize ?? file.originalBytes ?? file.file?.size ?? 0;

  // 2. Determine output byte size
  let outputBytes = originalBytes;
  if (file.result?.outputBlob?.size !== undefined && file.result.outputBlob.size > 0) {
    outputBytes = file.result.outputBlob.size;
  } else if (file.result?.compressedSize !== undefined && file.result.compressedSize > 0) {
    outputBytes = file.result.compressedSize;
  } else if (file.outputBytes !== undefined) {
    outputBytes = file.outputBytes;
  } else if ((file as any).compressedSize !== undefined && (file as any).compressedSize > 0) {
    outputBytes = (file as any).compressedSize;
  }

  // 3. Reduced: outputBytes strictly less than originalBytes
  const reduced = originalBytes > 0 && outputBytes < originalBytes;

  // 4. SavedPercent: round down, only when reduced
  const savedPercent = reduced && originalBytes > 0
    ? Math.floor(((originalBytes - outputBytes) / originalBytes) * 100)
    : 0;

  // 5. TargetBytes: resolved target byte budget or null
  let targetBytes: number | null = null;
  if (file.targetBytes !== undefined) {
    targetBytes = file.targetBytes;
  } else if (file.result?.targetBytesRequested !== undefined && file.result.targetBytesRequested > 0) {
    targetBytes = file.result.targetBytesRequested;
  } else if ((file as any).targetBytesRequested !== undefined && (file as any).targetBytesRequested > 0) {
    targetBytes = (file as any).targetBytesRequested;
  } else if (
    file.individualSettings?.targetFileSize?.enabled &&
    (file.individualSettings.targetFileSize.targetBytes || 0) > 0 &&
    (file.individualSettings.targetFileSize.userDefined === true || !file.individualSettings.targetFileSize.isDynamicDefault)
  ) {
    targetBytes = file.individualSettings.targetFileSize.targetBytes!;
  } else if (
    file.effectiveSettings?.targetFileSize?.enabled &&
    (file.effectiveSettings.targetFileSize.targetBytes || 0) > 0 &&
    (file.effectiveSettings.targetFileSize.userDefined === true || !file.effectiveSettings.targetFileSize.isDynamicDefault)
  ) {
    targetBytes = file.effectiveSettings.targetFileSize.targetBytes!;
  }

  // 6. TargetMet: targetBytes is null, or outputBytes <= targetBytes
  const targetMet = targetBytes === null || outputBytes <= targetBytes;

  return {
    outputBytes,
    reduced,
    savedPercent,
    targetBytes,
    targetMet
  };
}

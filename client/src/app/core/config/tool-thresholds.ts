/**
 * Acklet Standard Tool Performance & Input Thresholds Configuration
 * Defines explicit byte/node thresholds and standard degradation policies per tool.
 */

export interface ToolThresholdConfig {
  toolId: string;
  primaryThresholdBytes: number;
  maxRecommendedBytes: number;
  maxInputNodes?: number;
  degradationDescription: string;
  optInLabel: string;
}

export const ACKLET_TOOL_THRESHOLDS: Record<string, ToolThresholdConfig> = {
  airvault: {
    toolId: 'airvault',
    primaryThresholdBytes: 100 * 1024, // 100 KB
    maxRecommendedBytes: 1024 * 1024 * 1024, // 1 GB (Max single file)
    degradationDescription: 'Live regex and AST detection paused to prevent main-thread lag. Payload is ready to beam immediately.',
    optInLabel: 'Enable Deep Scanning Anyway'
  },
  'data-lens': {
    toolId: 'data-lens',
    primaryThresholdBytes: 2 * 1024 * 1024, // 2 MB
    maxRecommendedBytes: 50 * 1024 * 1024, // 50 MB
    maxInputNodes: 15000,
    degradationDescription: 'Live auto-formatting & deep syntax highlighting paused. Switched to high-speed plain view.',
    optInLabel: 'Format & Parse via Worker'
  }
};

export interface ThresholdEvaluation {
  isLarge: boolean;
  isOverLimit: boolean;
  byteSize: number;
  formattedSize: string;
  config: ToolThresholdConfig;
}

/**
 * Universal threshold evaluator used across all tools before starting expensive work.
 */
export function checkInputThreshold(toolId: string, input: string | Blob | number): ThresholdEvaluation {
  const config = ACKLET_TOOL_THRESHOLDS[toolId] || {
    toolId,
    primaryThresholdBytes: 500 * 1024,
    maxRecommendedBytes: 20 * 1024 * 1024,
    degradationDescription: 'Large payload detected. Heavy features paused for 60fps responsiveness.',
    optInLabel: 'Process Full Payload'
  };

  let byteSize = 0;
  if (typeof input === 'number') {
    byteSize = input;
  } else if (typeof input === 'string') {
    byteSize = input.length;
  } else if (input instanceof Blob) {
    byteSize = input.size;
  }

  const isLarge = byteSize > config.primaryThresholdBytes;
  const isOverLimit = byteSize > config.maxRecommendedBytes;

  return {
    isLarge,
    isOverLimit,
    byteSize,
    formattedSize: formatByteSize(byteSize),
    config
  };
}

export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

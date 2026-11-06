// apps/tool-file-converter/src/tool.config.ts

/**
 * Image Converter Tool Configuration
 * All limits, timeouts, and operational defaults per Acklet Tool Standard.
 */
export interface ToolFileConverterConfig {
  /** Maximum number of files processed per batch */
  maxBatchFiles: number;
  /** Maximum size per uploaded file in bytes (50 MB) */
  maxFileSizeBytes: number;
  /** Default output format for batches */
  defaultTargetFormat: 'webp' | 'jpg' | 'png';
  /** Default lossy compression quality level (0.0 to 1.0) */
  defaultQuality: number;
  /** Timeout in milliseconds for canvas decoding/encoding operations */
  processingTimeoutMs: number;
  /** Number of parallel asynchronous conversions executed concurrently */
  concurrentWorkers: number;
  /** Supported input image MIME types / extensions */
  acceptedInputTypes: string;
}

export const TOOL_CONFIG: ToolFileConverterConfig = {
  maxBatchFiles: 50,
  maxFileSizeBytes: 50 * 1024 * 1024, // 50 MB
  defaultTargetFormat: 'webp',
  defaultQuality: 0.85,
  processingTimeoutMs: 30000,
  concurrentWorkers: 3,
  acceptedInputTypes: 'image/*,.png,.jpg,.jpeg,.webp,.avif,.svg,.gif,.bmp,.ico'
};


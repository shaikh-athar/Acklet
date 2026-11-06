// apps/tool-file-converter/src/models/converter.models.ts

export type FileCategory =
  | 'image'
  | 'modern-image'
  | 'graphics'
  | 'subtitle'
  | 'contact'
  | 'document'
  | 'audio'
  | 'video'
  | 'archive';

export type ExecutionMode = 'browser' | 'server';

export interface FormatDescriptor {
  format: string;
  label: string;
  mimeType: string;
  extension: string;
  category: FileCategory;
  executionMode: ExecutionMode;
  description?: string;
  lossless?: boolean;
}

export interface DetectedFormat {
  format: string;
  mimeType: string;
  extension: string;
  category: FileCategory;
  signatureVerified: boolean;
  signatureName?: string;
  confidence: number; // 0.0 to 1.0
  spoofWarning?: string;
}

export interface ConversionOptions {
  quality?: number; // 0.1 to 1.0 (default 0.92 for lossy)
  maxWidth?: number;
  maxHeight?: number;
  csvDelimiter?: ',' | ';';
  preserveTransparency?: boolean;
}

export type ConversionStatus =
  | 'idle'
  | 'scanning'
  | 'ready'
  | 'converting'
  | 'completed'
  | 'error'
  | 'cancelled';

export interface ConversionJob {
  id: string;
  file: File;
  detectedFormat: DetectedFormat;
  targetFormat: FormatDescriptor;
  availableOutputs: FormatDescriptor[];
  options: ConversionOptions;
  status: ConversionStatus;
  progress: number; // 0 to 100
  progressStage?: string;
  resultBlob?: Blob;
  resultUrl?: string;
  resultFileName?: string;
  resultSize?: number;
  errorMessage?: string;
  startTime?: number;
  durationMs?: number;
  previewUrl?: string;
  abortController?: AbortController;
}

export interface ConversionResult {
  success: boolean;
  blob?: Blob;
  outputFormat: string;
  outputExtension: string;
  outputFileName: string;
  outputSize?: number;
  error?: string;
  durationMs?: number;
}


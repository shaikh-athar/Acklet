// apps/tool-file-converter/src/converter.models.ts

export type ConversionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'TIMED_OUT';

export type ConverterScreenState = 'IDLE' | 'CONFIGURING' | 'CONVERTING' | 'COMPLETED' | 'ERROR';

export interface ConversionResult {
  jobId: string;
  originalFileName: string;
  sanitizedFileName: string;
  sourceFormat: string;
  targetFormat: string;
  status: ConversionStatus;
  downloadUrl?: string;
  sourceSizeBytes?: number;
  convertedSizeBytes?: number;
  durationMs?: number;
  errorMessage?: string;
  createdAt?: string;
  completedAt?: string;
}

export interface SupportedFormatItem {
  extension: string;
  name: string;
  mimeType: string;
  family: string;
  supportedTargets: string[];
}

export interface FormatGroup {
  label: string;
  formats: { ext: string; label: string }[];
}


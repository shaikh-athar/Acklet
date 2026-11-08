// apps/tool-file-converter/src/converter.models.ts

export type ConversionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'TIMED_OUT';

export type FileItemStatus = 'queued' | 'uploading' | 'converting' | 'ready' | 'failed';

export interface StructureChip {
  type: 'headings' | 'tables' | 'columns' | 'images' | string;
  label: string;
  count: number;
  lowConfidence: boolean;
  confidenceLabel: string;
}

export interface StructureReviewItem {
  page: number;
  blockType: string;
  reason: string;
  snippet?: string;
  confidence: number;
}

export interface StructureReport {
  headingsCount: number;
  tablesCount: number;
  columnsCount: number;
  imagesCount: number;
  hasLowConfidence: boolean;
  chips: StructureChip[];
  summary: string;
  fidelityLevel?: 'high' | 'medium' | 'low';
  fidelityReasons?: string[];
  recommendedTarget?: string;
  hasScannedPages?: boolean;
  reviewItems?: StructureReviewItem[];
}

export interface FileJobItem {
  fileId: string;
  originalFileName: string;
  sanitizedFileName: string;
  sourceFormat: string;
  targetFormat: string;
  sizeBytes: number;
  convertedSizeBytes?: number;
  status: FileItemStatus;
  progress: number;
  errorCode?: string;
  errorMessage?: string;
  downloadUrl?: string;
  structureReport?: StructureReport;
  nativeFile?: File;
  isExpanded?: boolean;
  runtime?: 'server' | 'browser';
  tier?: 'stable' | 'beta';
  queue?: string;
  queueMessage?: string;
}

export interface ConversionOptions {
  targetFormat: string;
  fidelity: 'editable' | 'balanced' | 'exact';
  ocr: boolean;
  keepImages: boolean;
  pageRange: string;
  dpi?: number;
  deliveryMode: 'individual' | 'zip';
}

export interface RemoteFileJobItem {
  fileId: string;
  originalFileName: string;
  sanitizedFileName: string;
  sourceFormat: string;
  targetFormat: string;
  sizeBytes: number;
  convertedSizeBytes?: number;
  status: ConversionStatus;
  progress: number;
  errorMessage?: string;
  downloadUrl?: string;
  structureReport?: StructureReport;
  runtime?: 'server' | 'browser';
  tier?: 'stable' | 'beta';
  queue?: string;
  queueMessage?: string;
}

export interface BatchJob {
  jobId: string;
  status: ConversionStatus;
  progress: number;
  files: RemoteFileJobItem[];
  options: ConversionOptions;
  zipDownloadUrl?: string;
  createdAt?: string;
  completedAt?: string;
}

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

export interface ConversionCapabilityFlags {
  ocr: boolean;
  pageRange: boolean;
  structureCheck: boolean;
  quality: boolean;
  layoutFidelity: boolean;
  resize: boolean;
  keepImages?: boolean;
  dpi?: boolean;
  tableFocus?: boolean;
}

export interface ConversionCapability {
  inputType: string;
  outputType: string;
  engine: string;
  phase: number;
  status: string;
  runtime?: 'server' | 'browser';
  tier?: 'stable' | 'beta';
  queue?: string | null;
  timeoutSec?: number;
  maxSizeMb: number;
  recommendationScore: number;
  flags: ConversionCapabilityFlags;
}

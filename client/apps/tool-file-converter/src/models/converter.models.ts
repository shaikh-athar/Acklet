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

export interface ImageResizeOptions {
  mode?: 'original' | 'custom' | 'percentage' | 'preset';
  width?: number;
  height?: number;
  maintainAspectRatio: boolean;
  fitMode?: 'contain' | 'cover' | 'stretch';
  percentage?: number; // 25, 50, 75, 100, 150, 200
  preventUpscale?: boolean;
}

export interface ImageCropOptions {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  aspectRatio?: 'free' | '1:1' | '4:3' | '16:9' | '3:2' | 'custom';
}

export interface ImageTransformOptions {
  rotation?: 0 | 90 | 180 | 270;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  crop?: ImageCropOptions;
}

export interface ImageBackgroundOptions {
  mode: 'transparent' | 'solid';
  color?: string; // hex string e.g. '#FFFFFF', '#000000', '#F3F4F6'
}

export interface ImageMetadataOptions {
  mode: 'preserve' | 'strip-all' | 'strip-gps';
  preserveIcc?: boolean;
  preserveCopyright?: boolean;
}

export interface ImageNamingOptions {
  patternMode?: 'original' | 'prefix' | 'suffix' | 'custom' | 'numbered';
  prefix?: string;
  suffix?: string;
  customName?: string;
}

export interface ImageAnimationOptions {
  mode?: 'preserve' | 'first-frame' | 'extract-all';
  loopMode?: 'auto' | 'infinite' | 'once';
  preserveFrames?: boolean;
  frameRate?: number;
  selectedFrames?: number[];
}

export interface MultiResolutionVariant {
  suffix: string;
  maxWidth: number;
  format?: string;
  quality?: number;
}

export interface MultiResolutionConfig {
  enabled: boolean;
  variants: MultiResolutionVariant[];
}

export type ConversionPresetName = 'web' | 'quality' | 'print' | 'small' | 'transparent';

export interface ExifMetadataSummary {
  make?: string;
  model?: string;
  dateTime?: string;
  orientation?: number;
  hasGps?: boolean;
  latitude?: number;
  longitude?: number;
  colorProfile?: string;
  dpi?: number;
}

export interface TargetFileSizeConfig {
  enabled: boolean;
  value: number; // e.g. 200
  unit: 'KB' | 'MB';
  targetBytes: number;
}

export interface ImageSmartAnalysis {
  hasAlpha: boolean;
  isPhoto: boolean;
  suggestedFormat?: string;
  reason?: string;
}

export interface ConversionOptions {
  quality?: number; // 0.1 to 1.0 (default 0.92 for lossy)
  targetFileSize?: TargetFileSizeConfig;
  maxWidth?: number;
  maxHeight?: number;
  csvDelimiter?: ',' | ';';
  preserveTransparency?: boolean;

  // Advanced Image Processing Capabilities
  resize?: ImageResizeOptions;
  transform?: ImageTransformOptions;
  background?: ImageBackgroundOptions;
  metadata?: ImageMetadataOptions;
  dpi?: number;
  colorProfile?: 'srgb' | 'display-p3' | 'preserve';
  naming?: ImageNamingOptions;
  animation?: ImageAnimationOptions;
  multiRes?: MultiResolutionConfig;
  compressionLevel?: number; // PNG 1-9
  progressive?: boolean; // JPEG progressive
  lossless?: boolean; // WebP lossless
  colorCount?: number; // GIF palette color count (32, 64, 128, 256)
}

export type ConversionStatus =
  | 'idle'
  | 'scanning'
  | 'ready'
  | 'converting'
  | 'completed'
  | 'error'
  | 'cancelled';

export interface ConversionLossWarning {
  type: string;
  title: string;
  message: string;
}

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
  warnings?: ConversionLossWarning[];
  resultBlob?: Blob;
  resultUrl?: string;
  resultPreviewUrl?: string;
  resultFileName?: string;
  resultSize?: number;
  errorMessage?: string;
  startTime?: number;
  durationMs?: number;
  previewUrl?: string;
  originalDimensions?: { width: number; height: number };
  resultDimensions?: { width: number; height: number };
  exifMetadata?: ExifMetadataSummary;
  appliedTransformsSummary?: string;
  fittedQuality?: number;
  targetSizeWarning?: string;
  smartAnalysis?: ImageSmartAnalysis;
  abortController?: AbortController;
}

export interface ConversionResult {
  success: boolean;
  blob?: Blob;
  previewBlob?: Blob;
  outputFormat: string;
  outputExtension: string;
  outputFileName: string;
  outputSize?: number;
  fittedQuality?: number;
  targetSizeWarning?: string;
  resultDimensions?: { width: number; height: number };
  appliedTransformsSummary?: string;
  error?: string;
  durationMs?: number;
}


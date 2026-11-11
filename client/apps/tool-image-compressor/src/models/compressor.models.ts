// apps/tool-image-compressor/src/models/compressor.models.ts

export type SupportedImageFormat =
  | 'jpg'
  | 'jpeg'
  | 'png'
  | 'webp'
  | 'gif'
  | 'bmp'
  | 'avif'
  | 'svg'
  | 'heic'
  | 'heif';

export type OutputFormatOption = 'original' | 'jpeg' | 'png' | 'webp' | 'avif';

export type CompressionMode = 'smart' | 'custom';

export type ResizeMode = 'dimensions' | 'percentage';

export type MetadataPolicy = 'preserve' | 'remove';

export type ImageItemStatus = 'ready' | 'invalid' | 'corrupted' | 'unsupported';

export interface FormatCapabilities {
  fileAccepted: boolean;
  previewSupported: boolean;
  compressionSupported: boolean;
  description: string;
}

export interface ResizeSettings {
  enabled: boolean;
  mode: ResizeMode;
  width?: number;
  height?: number;
  maintainAspectRatio: boolean;
  percentage: number; // e.g. 25, 50, 75, 100
}

export interface CompressionSettings {
  mode: CompressionMode;
  quality: number; // 1-100 (default: 80)
  outputFormat: OutputFormatOption; // default: 'original'
  resize: ResizeSettings;
  metadataPolicy: MetadataPolicy; // default: 'preserve'
}

export interface IndividualCompressionOverrides {
  hasCustomSettings: boolean;
  quality?: number;
  outputFormat?: OutputFormatOption;
  resize?: ResizeSettings;
  metadataPolicy?: MetadataPolicy;
}

export interface ImageItem {
  id: string;
  file: File;
  originalName: string;
  nameWithoutExt: string;
  originalExtension: string;
  detectedFormat: string;
  mimeType: string;
  originalSize: number;
  width: number;
  height: number;
  aspectRatio: number;
  previewUrl: string;
  selected: boolean;
  status: ImageItemStatus;
  capabilities: FormatCapabilities;
  individualSettings: IndividualCompressionOverrides;
  effectiveSettings: CompressionSettings;
  error?: string;
  addedAt: number;
}

export interface BatchValidationResult {
  accepted: ImageItem[];
  rejectedCount: number;
  errors: string[];
}

export interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  isLeaving?: boolean;
}


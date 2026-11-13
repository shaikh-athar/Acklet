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
  | 'heif'
  | 'tiff'
  | 'jxl';

export type OutputFormatOption = 'original' | 'jpeg' | 'png' | 'webp' | 'avif';

export type CompressionMode = 'smart' | 'custom';

export type SmartPreset = 'best-quality' | 'balanced' | 'smallest-size';

export type ResizeMode = 'dimensions' | 'percentage';

export type MetadataPolicy = 'preserve' | 'strip-gps' | 'remove';

export type DeveloperPresetKey =
  | 'website'
  | 'blog'
  | 'ecommerce'
  | 'social'
  | 'thumbnails'
  | 'retina';

export type ImageCategory =
  | 'photo'
  | 'graphic'
  | 'screenshot'
  | 'logo-icon'
  | 'optimized';

export interface CategoryCounts {
  all: number;
  photo: number;
  graphic: number;
  screenshot: number;
  'logo-icon': number;
  optimized: number;
}

export interface DeveloperPresetConfig {
  key: DeveloperPresetKey;
  label: string;
  category: string;
  description: string;
  targetFormat: OutputFormatOption;
  quality: number;
  resize: ResizeSettings;
  metadataPolicy: MetadataPolicy;
  badge: string;
}

export interface ImageVariantConfig {
  id: string; // 'thumb' | 'mobile' | 'desktop' | 'large' | 'custom'
  name: string;
  suffix: string;
  width: number;
  height?: number;
  quality?: number; // Optional quality override
  format?: OutputFormatOption; // Optional format override
  enabled: boolean;
  maintainAspectRatio: boolean;
}

export interface MultiVariantSettings {
  enabled: boolean;
  variants: ImageVariantConfig[];
}

export interface ImageVariantResult {
  variantId: string;
  name: string;
  suffix: string;
  width: number;
  height: number;
  format: string;
  quality: number;
  outputBlob: Blob;
  outputUrl: string;
  outputFilename: string;
  compressedSize: number;
  savedBytes: number;
  savedPercentage: number;
  status: 'completed' | 'failed';
  error?: string;
}

export interface ExifMetadataReport {
  hasExif: boolean;
  hasGps: boolean;
  make?: string;
  model?: string;
  dateTime?: string;
  orientation?: number;
  dpi?: number;
  colorProfile?: string;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  fieldsDetected: string[];
  fieldsRemoved: string[];
  fieldsRetained: string[];
}

export interface AdvancedOptimizationSettings {
  progressiveJpeg?: boolean;
  losslessWebp?: boolean;
  cleanTransparency?: boolean;
  optimizePalette?: boolean;
  compressionEffort?: number; // 1 (fastest) to 6 (maximum effort)
  chromaSubsampling?: 'auto' | '4:2:0' | '4:4:4'; // 4:4:4 preserves text clarity without color bleeding
}

export interface OptimizationProfile {
  id: string;
  name: string;
  description: string;
  isCustom: boolean;
  createdAt?: number;
  settings: CompressionSettings;
}

export interface OptimizationReportItem {
  id: string;
  originalName: string;
  detectedFormat: string;
  outputFormat: string;
  originalWidth: number;
  originalHeight: number;
  outputWidth: number;
  outputHeight: number;
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  savedPercentage: number;
  status: string;
  processingTimeMs: number;
  ssim?: number;
  psnr?: number;
  qualityRating?: string;
  targetAchieved?: boolean;
  variantsCount: number;
  metadataRetained: string[];
  metadataRemoved: string[];
}

export interface OptimizationReport {
  generatedAt: string;
  totalImages: number;
  completedCount: number;
  failedCount: number;
  skippedCount: number;
  totalOriginalBytes: number;
  totalCompressedBytes: number;
  totalSavedBytes: number;
  overallSavingsPercentage: number;
  totalVariantsGenerated: number;
  totalProcessingTimeMs: number;
  averageSsim: number | null;
  items: OptimizationReportItem[];
}

export type ImageItemStatus =
  | 'ready'
  | 'pending'
  | 'decoding'
  | 'processing'
  | 'optimizing'
  | 'encoding'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'invalid'
  | 'corrupted'
  | 'unsupported';

export interface FormatCapabilities {
  fileAccepted: boolean;
  previewSupported: boolean;
  compressionSupported: boolean;
  description: string;
}

export interface ImageCapability {
  format: string;
  label: string;
  extensions: string[];
  mimeType: string;
  canDecode: boolean;
  canEncode: boolean;
  supportsLossy: boolean;
  supportsLossless: boolean;
  supportsTransparency: boolean;
  supportsAnimation: boolean;
  description: string;
  notes?: string;
}

export interface ResizeSettings {
  enabled: boolean;
  mode: ResizeMode;
  width?: number;
  height?: number;
  maintainAspectRatio: boolean;
  percentage: number; // e.g. 25, 50, 75, 100
  preventUpscale?: boolean;
}

export interface TargetFileSizeSettings {
  enabled: boolean;
  targetBytes: number; // Raw bytes, e.g. 204800 (200 KB)
  targetValue: number; // User entered value, e.g. 200
  targetUnit: 'KB' | 'MB'; // 'KB' | 'MB'
  minQuality: number; // Minimum acceptable quality threshold, default: 25
}

export interface CompressionSettings {
  mode: CompressionMode;
  preset: SmartPreset; // default: 'balanced'
  developerPreset?: DeveloperPresetKey;
  quality: number; // 1-100 (default: 80)
  outputFormat: OutputFormatOption; // default: 'original'
  targetFileSize?: TargetFileSizeSettings;
  resize: ResizeSettings;
  multiVariant?: MultiVariantSettings;
  metadataPolicy: MetadataPolicy; // default: 'remove'
  advancedOptimization?: AdvancedOptimizationSettings;
}

export interface IndividualCompressionOverrides {
  hasCustomSettings: boolean;
  mode?: CompressionMode;
  preset?: SmartPreset;
  developerPreset?: DeveloperPresetKey;
  quality?: number;
  outputFormat?: OutputFormatOption;
  targetFileSize?: TargetFileSizeSettings;
  resize?: ResizeSettings;
  multiVariant?: MultiVariantSettings;
  metadataPolicy?: MetadataPolicy;
  advancedOptimization?: AdvancedOptimizationSettings;
}

export interface VisualQualityMetrics {
  ssim: number; // 0.0 to 1.0 (Structural Similarity Index)
  psnr: number; // Peak Signal-to-Noise Ratio in dB
  qualityRating: 'excellent' | 'good' | 'fair' | 'poor';
  warning?: string; // Alert if aggressive compression introduces visual artifacts
  diffMapUrl?: string; // Volatile Object URL for amplified visual difference canvas
  artifactScore?: number; // 0 to 100 estimated blockiness / compression artifact level
}

export interface ImageCharacteristics {
  hasAlpha: boolean;
  isPhoto: boolean;
  uniqueColorCount: number;
  megapixel: number;
  isHighRes: boolean;
  // Phase 7 Image Intelligence additions:
  imageCategory?: ImageCategory;
  edgeDensity?: number; // 0.0 to 1.0 (high frequency transition ratio)
  bitsPerPixel?: number; // raw bpp = (fileSize * 8) / (width * height)
  isAlreadyOptimized?: boolean;
  optimizationOpportunity?: 'high' | 'medium' | 'low' | 'none';
}

export interface SmartRecommendation {
  preset: SmartPreset;
  suggestedFormat: OutputFormatOption;
  suggestedQuality: number;
  estimatedSavingsPercent: number; // clearly labeled as an estimate (e.g. 50%)
  tradeOffDescription: string;
  reason: string;
  applied?: boolean;
}

export interface CompressionResult {
  imageId: string;
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  savedPercentage: number;
  originalWidth: number;
  originalHeight: number;
  outputWidth: number;
  outputHeight: number;
  originalFormat: string;
  outputFormat: string;
  outputMimeType: string;
  outputBlob: Blob;
  outputUrl: string; // Volatile Object URL for preview/download
  outputFilename: string;
  processingTimeMs: number;
  status: 'completed' | 'failed' | 'cancelled';
  error?: string;
  isLargerThanOriginal?: boolean;
  isLossless?: boolean;
  // Phase 3 additions:
  targetAchieved?: boolean;
  targetUnreachable?: boolean;
  targetBytesRequested?: number;
  iterationsCount?: number;
  visualQuality?: VisualQualityMetrics;
  recommendation?: SmartRecommendation;
  // Phase 4 additions:
  variants?: ImageVariantResult[];
  metadataReport?: ExifMetadataReport;
  alreadyOptimized?: boolean;
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
  progress?: number; // 0 to 100
  progressStage?: string;
  capabilities: FormatCapabilities;
  characteristics?: ImageCharacteristics;
  recommendation?: SmartRecommendation;
  individualSettings: IndividualCompressionOverrides;
  effectiveSettings: CompressionSettings;
  result?: CompressionResult;
  error?: string;
  addedAt: number;
  abortController?: AbortController;
  // Phase 4 additions:
  metadataReport?: ExifMetadataReport;
  isDuplicate?: boolean;
  duplicateOfName?: string;
  // Phase 8+ Task 2 additions:
  transforms?: TransformOp[];
  transformedPreviewUrl?: string;
}

export type RotateAngle = 90 | -90 | 180;
export type FlipDirection = 'horizontal' | 'vertical';
export type AspectPreset = 'free' | '1:1' | '4:3' | '16:9';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type TransformOp =
  | { type: 'rotate'; angle: RotateAngle }
  | { type: 'flip'; direction: FlipDirection }
  | { type: 'crop'; rect: CropRect; aspectPreset?: AspectPreset };

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

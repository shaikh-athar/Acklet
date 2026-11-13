// apps/tool-watermark-remover/src/models/watermark.models.ts

export type SelectionTool = 'brush' | 'rectangle' | 'eraser' | 'protect' | 'pan';

export type WorkspaceViewMode = 'edit' | 'compare-slider' | 'compare-side-by-side' | 'original-peek' | 'heatmap';

export type ComparisonMode = 'slider' | 'side-by-side' | 'heatmap';

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export type WatermarkType =
  | 'text'
  | 'logo'
  | 'semi-transparent'
  | 'diagonal'
  | 'tiled'
  | 'corner'
  | 'general';

export type DetectionSensitivity = 'low' | 'medium' | 'high';

export type RestorationMode = 'standard' | 'high-quality' | 'detail-preservation' | 'large-image';

export type InpaintingMode =
  | RestorationMode
  | 'balanced'
  | 'ultra'
  | 'fast';

export interface ImageMetadata {
  name: string;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
  aspectRatio: number;
  dataUrl: string;
  rawBuffer?: ArrayBuffer;
  hasAlpha?: boolean;
  exifDetected?: boolean;
}

export interface InpaintingProgress {
  progress: number; // 0 to 100
  phase: 'idle' | 'analyzing' | 'inpainting' | 'blending' | 'quality-check' | 'complete' | 'failed';
  message: string;
  error?: string;
  currentTile?: number;
  totalTiles?: number;
}

export interface InpaintingQualityMetrics {
  overallScore: number;             // 0 to 100
  boundaryContinuity: number;       // 0 to 100%
  colorInconsistencyDelta: number;  // ΔE or RGB distance
  residualEdgeRatio: number;        // residual high-frequency ratio
  rating: 'excellent' | 'good' | 'fair' | 'poor';
  processingTimeMs: number;
  hasTransparency?: boolean;
  unmaskedDrift?: number;           // must be 0
  diffImageData?: ImageData;        // visual heatmap
  resolutionPreserved?: boolean;
}

export type ExportFormat = 'png' | 'jpg' | 'webp';

export interface ExportOptions {
  format: ExportFormat;
  quality: number; // 0.1 to 1.0 (for jpg/webp)
  filename: string;
  preserveMetadata?: boolean;
  preserveColorProfile?: boolean;
  estimatedSizeBytes?: number;
  hasAlpha?: boolean;
}

export interface ProtectedRegion {
  id: string;
  name: string;
  bounds: RectSelection;
  type: 'face' | 'subject' | 'manual';
  createdAt: number;
}

export interface ImageIntegrityReport {
  isValid: boolean;
  format: string;
  width: number;
  height: number;
  hasAlpha: boolean;
  exifDetected: boolean;
  cameraModel?: string;
  dateTime?: string;
  orientation?: number;
  colorSpace?: string;
  fileSizeBytes: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface RectSelection {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WatermarkRegion {
  id: string;
  name: string;
  type: 'rectangle' | 'brush' | 'auto-detected';
  watermarkType?: WatermarkType;
  confidence?: number; // 0 to 100
  bounds: RectSelection;
  active: boolean;
  processed: boolean;
  createdAt: number;
}

export interface DetectedWatermarkRegion {
  id: string;
  name: string;
  type: WatermarkType;
  confidence: number; // 0 to 100
  bounds: RectSelection;
  coveragePercent: number;
}

export interface DetectionOptions {
  sensitivity: DetectionSensitivity;
  filterType?: WatermarkType | 'all';
}

export interface NavigationState {
  zoom: number;      // 0.25 (25%) to 5.0 (500%)
  panX: number;      // Viewport offset X in px
  panY: number;      // Viewport offset Y in px
  fitZoom: number;   // Computed fit-to-screen zoom factor
}

export interface HistorySnapshot {
  maskData: ImageData;
  regions: WatermarkRegion[];
  activeRegionId: string | null;
  description: string;
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  danger?: boolean;
}

export interface SampleWatermarkImage {
  id: string;
  name: string;
  description: string;
  watermarkType: string;
  width: number;
  height: number;
  dataUrl: string;
}

// --- Batch Processing Models ---

export type BatchItemStatus =
  | 'pending'
  | 'detecting'
  | 'detected'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'skipped';

export interface BatchItem {
  id: string;
  file?: File;
  name: string;
  sizeBytes: number;
  mimeType: string;
  width: number;
  height: number;
  thumbnailUrl: string;
  originalDataUrl: string;
  status: BatchItemStatus;
  progress: number; // 0 to 100
  errorMessage?: string;
  regions: WatermarkRegion[];
  detectedRegionsCount?: number;
  detectionConfidence?: number;
  customMask?: ImageData;
  processedDataUrl?: string;
  processedImageData?: ImageData;
  qualityMetrics?: InpaintingQualityMetrics;
  processingTimeMs?: number;
  selectedForExport: boolean;
}

export type BatchViewMode = 'grid' | 'list';

export interface BatchProcessingConfig {
  autoDetect: boolean;
  sensitivity: DetectionSensitivity;
  inpaintingMode: InpaintingMode;
  exportFormat: ExportFormat;
  exportQuality: number; // 0.1 to 1.0
  preserveResolution: boolean;
}

export interface BatchOverallProgress {
  total: number;
  completed: number;
  failed: number;
  processing: number;
  pending: number;
  percent: number; // 0 to 100
  isProcessing: boolean;
  isPaused: boolean;
  elapsedMs: number;
}


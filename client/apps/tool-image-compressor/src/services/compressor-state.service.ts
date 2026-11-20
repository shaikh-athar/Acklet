// apps/tool-image-compressor/src/services/compressor-state.service.ts
import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';
import {
  ImageItem,
  CompressionSettings,
  IndividualCompressionOverrides,
  ToastMessage,
  BatchValidationResult,
  CompressionResult,
  SmartPreset,
  TargetFileSizeSettings,
  DeveloperPresetKey,
  MultiVariantSettings,
  CategoryCounts,
  ImageCategory,
  TransformOp,
  WorkingImageSource
} from '../models/compressor.models';
import {
  CompressorValidationService,
  MAX_SESSION_FILES
} from './compressor-validation.service';
import { ImageCompressionService } from './image-compression.service';
import { SmartAnalysisService } from './smart-analysis.service';
import { ImageMetadataService } from './image-metadata.service';
import { OptimizationReportService } from './optimization-report.service';
import { DEFAULT_VARIANTS, getDeveloperPreset } from './developer-presets.constant';
import { downloadBlob, downloadZip, createZipBlob } from './download-helper.util';
import { CompressorTelemetryService } from './compressor-telemetry.service';
import { ProfileManagerService } from './profile-manager.service';
import { TransformService } from './transform.service';
import { ImageDecoderService } from './image-decoder.service';
import { ImageCapabilityService } from './image-capability.service';
import { getFormatCapability, normalizeFormatKey } from '../config/format-registry.config';
import { COMPRESSOR_CONFIG } from '../config/compressor.config';
import { calculateDynamicDefaultTarget } from './target-suggestion.util';
import { estimateCompressedSize } from './size-estimator.util';

export const DEFAULT_COMPRESSION_SETTINGS: CompressionSettings = {
  mode: 'smart',
  preset: 'balanced',
  quality: COMPRESSOR_CONFIG.presets.smart['balanced'].quality,
  outputFormat: 'original',
  targetFileSize: {
    enabled: true,
    targetBytes: 0,
    targetValue: 0,
    targetUnit: 'KB',
    minQuality: COMPRESSOR_CONFIG.targetSize.qualityFloor,
    isDynamicDefault: true,
    userDefined: false
  },
  resize: {
    enabled: false,
    mode: 'dimensions',
    maintainAspectRatio: true,
    percentage: 100,
    preventUpscale: false
  },
  multiVariant: {
    enabled: false,
    variants: [...COMPRESSOR_CONFIG.variants.defaultConfigs]
  },
  metadataPolicy: 'remove',
  advancedOptimization: {
    progressiveJpeg: false,
    losslessWebp: false,
    cleanTransparency: true,
    optimizePalette: true
  }
};

/**
 * Resolves effective compression settings for an ImageItem adhering strictly to:
 * - Priority 1: The file's own customized settings (target size, format, quality choice, transforms, resize switch).
 * - Priority 2: The panel's global settings (if the file has no customization).
 * - Priority 3: The default estimate. For a file with no target and no customization,
 *   the engine targets the estimate shown on the Working card.
 *
 * The estimate and the compression use the same settings object.
 */
export function resolveEffectiveSettings(
  item: ImageItem,
  globalSettings: CompressionSettings
): CompressionSettings {
  const hasCustom = Boolean(item.individualSettings?.hasCustomSettings);

  // Start with global settings as baseline
  const effective: CompressionSettings = {
    ...globalSettings,
    resize: { ...(globalSettings.resize || DEFAULT_COMPRESSION_SETTINGS.resize) },
    advancedOptimization: globalSettings.advancedOptimization ? { ...globalSettings.advancedOptimization } : undefined
  };

  // Priority 1: Apply file's customized overrides if set
  if (hasCustom) {
    const custom = item.individualSettings;
    if (custom.mode !== undefined) effective.mode = custom.mode;
    if (custom.preset !== undefined) effective.preset = custom.preset;
    if (custom.developerPreset !== undefined) effective.developerPreset = custom.developerPreset;
    if (custom.quality !== undefined) effective.quality = custom.quality;
    if (custom.outputFormat !== undefined) effective.outputFormat = custom.outputFormat;
    if (custom.targetFileSize !== undefined) {
      effective.targetFileSize = { ...custom.targetFileSize };
    }
    if (custom.resize !== undefined) {
      effective.resize = { ...custom.resize };
    }
    if (custom.metadataPolicy !== undefined) effective.metadataPolicy = custom.metadataPolicy;
    if (custom.advancedOptimization !== undefined) {
      effective.advancedOptimization = { ...custom.advancedOptimization };
    }
  }

  // Include transforms if any
  if (item.transforms && item.transforms.length > 0) {
    effective.transforms = [...item.transforms];
  }

  // Check if user set an explicit target size (Priority 1 custom target or Priority 2 global target)
  const isCustomUserTarget = Boolean(
    hasCustom &&
    item.individualSettings?.targetFileSize?.enabled &&
    item.individualSettings?.targetFileSize?.userDefined &&
    (item.individualSettings?.targetFileSize?.targetBytes || 0) > 0
  );

  const isGlobalUserTarget = Boolean(
    !hasCustom &&
    globalSettings.targetFileSize?.enabled &&
    globalSettings.targetFileSize?.userDefined &&
    (globalSettings.targetFileSize?.targetBytes || 0) > 0
  );

  if (isCustomUserTarget) {
    effective.targetFileSize = {
      ...item.individualSettings.targetFileSize!,
      enabled: true,
      userDefined: true
    };
  } else if (isGlobalUserTarget) {
    effective.targetFileSize = {
      ...globalSettings.targetFileSize!,
      enabled: true,
      userDefined: true
    };
  } else {
    // Priority 3: Default estimate shown on the Working card
    const est = estimateCompressedSize({
      originalSize: item.originalSize,
      detectedFormat: item.detectedFormat,
      settings: effective,
      width: item.width,
      height: item.height
    });

    if (est !== null && est > 0 && est < item.originalSize) {
      const targetVal = est < 1048576
        ? (est >= 10240 ? Math.round(est / 1024) : Math.round((est / 1024) * 10) / 10)
        : Math.round((est / 1048576) * 10) / 10;
      effective.targetFileSize = {
        enabled: true,
        targetBytes: est,
        targetValue: targetVal,
        targetUnit: est >= 1048576 ? 'MB' : (est >= 1024 ? 'KB' : 'B'),
        userDefined: false,
        isDynamicDefault: true,
        minQuality: COMPRESSOR_CONFIG.targetSize.qualityFloor
      };
    } else {
      effective.targetFileSize = {
        enabled: false,
        targetBytes: 0,
        targetValue: 0,
        targetUnit: 'KB',
        userDefined: false,
        isDynamicDefault: false,
        minQuality: COMPRESSOR_CONFIG.targetSize.qualityFloor
      };
    }
  }

  return effective;
}

const MAX_CONCURRENT_COMPRESSIONS = COMPRESSOR_CONFIG.limits.workerConcurrency;

@Injectable({
  providedIn: 'root'
})
export class CompressorStateService implements OnDestroy {
  readonly config = COMPRESSOR_CONFIG;
  private readonly validator: CompressorValidationService;
  private readonly compressionEngine: ImageCompressionService;
  private readonly smartAnalysis: SmartAnalysisService;
  private readonly metadataService: ImageMetadataService;
  private readonly reportService: OptimizationReportService;
  private readonly telemetry: CompressorTelemetryService;
  readonly profileManager: ProfileManagerService;
  private readonly decoder: ImageDecoderService;
  private readonly transformService: TransformService;
  private readonly capabilityService: ImageCapabilityService;

  constructor() {
    try {
      this.capabilityService = inject(ImageCapabilityService);
    } catch {
      this.capabilityService = new ImageCapabilityService();
    }
    try {
      this.validator = inject(CompressorValidationService);
    } catch {
      this.validator = new CompressorValidationService();
    }
    try {
      this.compressionEngine = inject(ImageCompressionService);
    } catch {
      this.compressionEngine = new ImageCompressionService();
    }
    try {
      this.smartAnalysis = inject(SmartAnalysisService);
    } catch {
      this.smartAnalysis = new SmartAnalysisService();
    }
    try {
      this.metadataService = inject(ImageMetadataService);
    } catch {
      this.metadataService = new ImageMetadataService();
    }
    try {
      this.reportService = inject(OptimizationReportService);
    } catch {
      this.reportService = new OptimizationReportService();
    }
    try {
      this.telemetry = inject(CompressorTelemetryService);
    } catch {
      this.telemetry = new CompressorTelemetryService();
    }
    try {
      this.profileManager = inject(ProfileManagerService);
    } catch {
      this.profileManager = new ProfileManagerService();
    }
    try {
      this.decoder = inject(ImageDecoderService);
    } catch {
      this.decoder = new ImageDecoderService();
    }
    try {
      this.transformService = inject(TransformService);
    } catch {
      this.transformService = new TransformService();
    }
  }

  // Core Reactive Signals
  readonly images = signal<ImageItem[]>([]);
  readonly selectedIds = signal<Set<string>>(new Set());
  readonly globalSettings = signal<CompressionSettings>({ ...DEFAULT_COMPRESSION_SETTINGS });
  readonly previewModalIndex = signal<number | null>(null);
  readonly activeSettingsDrawerItemId = signal<string | null>(null);
  readonly isDragging = signal<boolean>(false);
  readonly toast = signal<ToastMessage | null>(null);
  readonly metadataModalItem = signal<ImageItem | null>(null);
  readonly reportModalOpen = signal<boolean>(false);
  readonly isPackagingZip = signal<boolean>(false);
  readonly confirmModalData = signal<{ action: 'clear-all' | 'new-session'; title: string; message: string; isDanger: boolean } | null>(null);
  readonly feedbackModalOpen = signal<boolean>(false);
  readonly activeCategoryFilter = signal<string>('all');
  readonly profileModalOpen = signal<boolean>(false);

  // Concurrency Queue Tracking
  private activeCompressionSlots = 0;
  private pendingQueue: string[] = [];
  private batchCompletionResolvers: Array<() => void> = [];
  private itemCompletionResolvers = new Map<string, () => void>();

  private toastTimer: any = null;
  private toastDismissTimer: any = null;
  private toastCounter = 0;

  // Computed Properties
  readonly totalCount = computed(() => this.images().length);
  readonly hasImages = computed(() => this.images().length > 0);
  readonly totalOriginalSize = computed(() =>
    this.images().reduce((acc, img) => acc + img.originalSize, 0)
  );

  readonly selectedCount = computed(() => this.selectedIds().size);
  readonly allSelected = computed(() => {
    const list = this.images();
    return list.length > 0 && this.selectedCount() === list.length;
  });

  readonly categoryCounts = computed<CategoryCounts>(() => {
    const list = this.images();
    const counts: CategoryCounts = {
      all: list.length,
      photo: 0,
      graphic: 0,
      screenshot: 0,
      'logo-icon': 0,
      optimized: 0
    };
    for (const img of list) {
      const cat = img.characteristics?.imageCategory;
      if (cat && counts[cat] !== undefined) {
        counts[cat]++;
      }
    }
    return counts;
  });

  readonly pendingImages = computed(() =>
    this.images().filter(img => img.status !== 'completed')
  );

  readonly completedImages = computed(() =>
    this.images().filter(img => (img.status === 'completed' || (img.status === 'processing' && !!img.result)) && !!img.result)
  );

  readonly pendingCount = computed(() => this.pendingImages().length);

  readonly filteredPendingImages = computed(() => {
    const filter = this.activeCategoryFilter();
    const list = this.pendingImages();
    if (filter === 'all') return list;
    return list.filter(img => img.characteristics?.imageCategory === filter);
  });

  readonly filteredImages = computed(() => {
    const filter = this.activeCategoryFilter();
    const list = this.images();
    if (filter === 'all') return list;
    return list.filter(img => img.characteristics?.imageCategory === filter);
  });

  readonly previewImage = computed(() => {
    const idx = this.previewModalIndex();
    const list = this.completedImages().length > 0 ? this.completedImages() : this.images();
    if (idx !== null && idx >= 0 && idx < list.length) {
      return list[idx];
    }
    return null;
  });

  readonly activeSettingsItem = computed(() => {
    const id = this.activeSettingsDrawerItemId();
    if (!id) return null;
    return this.images().find(img => img.id === id) || null;
  });

  // Compression Execution Computeds
  readonly completedCount = computed(() =>
    this.images().filter(img => img.status === 'completed' && img.result).length
  );

  readonly failedCount = computed(() =>
    this.images().filter(img => img.status === 'failed').length
  );

  readonly isCompressingAny = computed(() =>
    this.images().some(img =>
      ['pending', 'decoding', 'processing', 'encoding'].includes(img.status)
    )
  );

  readonly hasCompletedImages = computed(() => this.completedCount() > 0);

  readonly totalOriginalSizeOfCompleted = computed(() =>
    this.images()
      .filter(img => img.status === 'completed' && img.result)
      .reduce((acc, img) => acc + img.originalSize, 0)
  );

  readonly totalCompressedSizeOfCompleted = computed(() =>
    this.images()
      .filter(img => img.status === 'completed' && img.result)
      .reduce((acc, img) => acc + img.result!.compressedSize, 0)
  );

  readonly totalCompressedSize = computed(() => {
    return this.images().reduce((acc, img) => {
      if (img.status === 'completed' && img.result) {
        return acc + img.result.compressedSize;
      }
      return acc + img.originalSize;
    }, 0);
  });

  readonly totalSavedBytes = computed(() => {
    const orig = this.totalOriginalSizeOfCompleted();
    const comp = this.totalCompressedSizeOfCompleted();
    return Math.max(0, orig - comp);
  });

  readonly totalSavedPercentage = computed(() => {
    const orig = this.totalOriginalSizeOfCompleted();
    const comp = this.totalCompressedSizeOfCompleted();
    if (orig <= 0) return 0;
    const pct = ((orig - comp) / orig) * 100;
    return Math.round(pct * 10) / 10;
  });

  readonly targetsMetCount = computed(() =>
    this.images().filter(img => img.status === 'completed' && img.result?.targetAchieved === true).length
  );

  readonly targetsUnreachableCount = computed(() =>
    this.images().filter(img => img.status === 'completed' && img.result?.targetUnreachable === true).length
  );

  readonly averageSsim = computed(() => {
    const scored = this.images().filter(img => img.status === 'completed' && img.result?.visualQuality?.ssim !== undefined);
    if (scored.length === 0) return null;
    const sum = scored.reduce((acc, img) => acc + img.result!.visualQuality!.ssim, 0);
    return Math.round((sum / scored.length) * 1000) / 1000;
  });

  readonly hasPendingRecommendations = computed(() =>
    this.images().some(img => img.recommendation && !img.recommendation.applied && !img.individualSettings.hasCustomSettings)
  );

  readonly totalVariantsCount = computed(() =>
    this.images().reduce((acc, img) => acc + (img.result?.variants?.length || 0), 0)
  );

  readonly hasFailedTasks = computed(() => this.failedCount() > 0);

  readonly activeDeveloperPreset = computed(() => {
    const k = this.globalSettings().developerPreset;
    return k ? getDeveloperPreset(k) : null;
  });

  ngOnDestroy(): void {
    this.cancelAll();
    this.cleanupAllObjectUrls();
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (this.toastDismissTimer) clearTimeout(this.toastDismissTimer);
  }

  /**
   * Adds multiple files to the session, applying limits, duplicate rejection, and signature validation.
   */
  async addFiles(files: FileList | File[]): Promise<BatchValidationResult> {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) {
      return { accepted: [], rejectedCount: 0, errors: [] };
    }

    const currentImages = this.images();
    const remainingSlots = MAX_SESSION_FILES - currentImages.length;

    if (remainingSlots <= 0) {
      this.showToast('warning', `Maximum ${MAX_SESSION_FILES} images reached. Remove some to add more.`);
      return {
        accepted: [],
        rejectedCount: fileArray.length,
        errors: [`Maximum ${MAX_SESSION_FILES} images limit reached.`]
      };
    }

    const accepted: ImageItem[] = [];
    const errors: string[] = [];
    let rejectedCount = 0;

    const filesToProcess = fileArray.slice(0, remainingSlots);
    if (fileArray.length > remainingSlots) {
      const omitted = fileArray.length - remainingSlots;
      rejectedCount += omitted;
      errors.push(`Omitted ${omitted} file(s) because the 50-image session limit was reached.`);
    }

    const currentSettings = this.globalSettings();

    for (const file of filesToProcess) {
      if (this.validator.isDuplicate(file, [...currentImages, ...accepted])) {
        rejectedCount++;
        errors.push(`"${file.name}" was skipped because it is already in the batch.`);
        continue;
      }

      try {
        const item = await this.validator.processFile(file, currentSettings);
        const megapixel = Math.round((item.width * item.height / 1_000_000) * 10) / 10;
        const normFormat = item.detectedFormat.toLowerCase();
        const isPhoto = ['jpg', 'jpeg'].includes(normFormat) || (normFormat === 'png' && item.originalSize > 500 * 1024);
        const hasAlpha = ['png', 'webp', 'svg', 'gif'].includes(normFormat);

        const bitsPerPixel = item.width > 0 && item.height > 0
          ? Math.round(((item.originalSize * 8) / (item.width * item.height)) * 100) / 100
          : 1.0;
        const isAlreadyOptimized = (['jpg', 'jpeg'].includes(normFormat) && bitsPerPixel < 0.6) ||
          (normFormat === 'webp' && bitsPerPixel < 0.45);
        const imageCategory: ImageCategory = isAlreadyOptimized
          ? 'optimized'
          : (isPhoto ? 'photo' : (hasAlpha ? 'graphic' : 'graphic'));

        const characteristics = {
          hasAlpha,
          isPhoto,
          uniqueColorCount: isPhoto ? 500 : 150,
          megapixel,
          isHighRes: megapixel >= 8.0 || item.width > 3840,
          imageCategory,
          edgeDensity: isPhoto ? 0.08 : 0.18,
          bitsPerPixel,
          isAlreadyOptimized,
          optimizationOpportunity: isAlreadyOptimized ? 'none' as const : (isPhoto ? 'high' as const : 'medium' as const)
        };

        const recommendation = this.smartAnalysis.generateRecommendation(
          characteristics,
          item.detectedFormat,
          item.originalSize
        );

        item.characteristics = characteristics;
        item.recommendation = recommendation;

        // Phase 4: Inspect EXIF & GPS Metadata
        const metadataReport = await this.metadataService.inspectFileMetadata(file);
        item.metadataReport = metadataReport;

        // Phase 4: Duplicate image detection by byte size and dimensions
        const duplicateMatch = [...currentImages, ...accepted].find(
          existing => existing.originalSize === file.size &&
            ((existing.width > 0 && existing.width === item.width && existing.height === item.height) || existing.originalName === file.name)
        );
        if (duplicateMatch) {
          item.isDuplicate = true;
          item.duplicateOfName = duplicateMatch.originalName;
        }

        // Priority 1/2/3: Resolve effective settings using Priority hierarchy
        item.originalUploadedWidth = item.width;
        item.originalUploadedHeight = item.height;
        item.effectiveSettings = resolveEffectiveSettings(item, currentSettings);

        accepted.push(item);
      } catch (err: any) {
        rejectedCount++;
        errors.push(err.message || `Failed to process "${file.name}".`);
      }
    }

    if (accepted.length > 0) {
      this.images.update(list => [...list, ...accepted]);

      // Update global settings target file size dynamically if user hasn't explicitly set a custom target
      if (!this.globalSettings().targetFileSize?.userDefined) {
        const allList = [...currentImages, ...accepted];
        if (allList.length === 1) {
          const dyn = calculateDynamicDefaultTarget(allList[0].originalSize);
          this.globalSettings.update(curr => ({
            ...curr,
            targetFileSize: {
              ...(curr.targetFileSize || DEFAULT_COMPRESSION_SETTINGS.targetFileSize!),
              enabled: true,
              targetBytes: dyn.targetBytes,
              targetValue: dyn.targetValue,
              targetUnit: dyn.targetUnit,
              isDynamicDefault: true,
              userDefined: false,
              minQuality: COMPRESSOR_CONFIG.targetSize.qualityFloor
            }
          }));
        } else if (allList.length >= 2) {
          const avg = Math.round(allList.reduce((acc, img) => acc + img.originalSize, 0) / allList.length);
          const dyn = calculateDynamicDefaultTarget(avg);
          this.globalSettings.update(curr => ({
            ...curr,
            targetFileSize: {
              ...(curr.targetFileSize || DEFAULT_COMPRESSION_SETTINGS.targetFileSize!),
              enabled: true,
              targetBytes: dyn.targetBytes,
              targetValue: dyn.targetValue,
              targetUnit: dyn.targetUnit,
              isDynamicDefault: true,
              userDefined: false,
              minQuality: COMPRESSOR_CONFIG.targetSize.qualityFloor
            }
          }));
        }
      }

      const totalBytes = accepted.reduce((sum, item) => sum + item.originalSize, 0);
      this.telemetry.trackUploadCompleted(accepted.length, totalBytes);

      if (rejectedCount === 0) {
        this.showToast(
          'success',
          accepted.length === 1
            ? `Added "${accepted[0].originalName}"`
            : `Added ${accepted.length} images`
        );
      } else {
        this.showToast(
          'info',
          `Added ${accepted.length} image(s). ${rejectedCount} rejected.`,
          4000
        );
      }
    } else if (rejectedCount > 0) {
      this.showToast(
        'error',
        errors[0] || `Failed to add ${rejectedCount} file(s).`,
        4500
      );
    }

    return { accepted, rejectedCount, errors };
  }

  /**
   * Revokes all generated output and variant object URLs for a result object.
   */
  private revokeResultUrls(result?: CompressionResult): void {
    if (!result) return;
    if (result.outputUrl) {
      URL.revokeObjectURL(result.outputUrl);
    }
    if (result.variants) {
      for (const v of result.variants) {
        if (v.outputUrl) {
          URL.revokeObjectURL(v.outputUrl);
        }
      }
    }
  }

  /**
   * Revokes all object URLs associated with an image item (preview, output, variants).
   */
  private revokeItemUrls(img: ImageItem): void {
    if (img.previewUrl) {
      URL.revokeObjectURL(img.previewUrl);
    }
    if (img.transformedPreviewUrl) {
      URL.revokeObjectURL(img.transformedPreviewUrl);
    }
    this.revokeResultUrls(img.result);
  }

  /**
   * Removes a single image and revokes its memory URLs.
   */
  removeImage(id: string): void {
    const list = this.images();
    const item = list.find(img => img.id === id);

    if (item) {
      if (item.abortController) {
        item.abortController.abort();
      }
      this.revokeItemUrls(item);
    }

    // Remove from pending queue if queued
    this.pendingQueue = this.pendingQueue.filter(queueId => queueId !== id);

    this.images.update(items => items.filter(img => img.id !== id));
    this.selectedIds.update(set => {
      const next = new Set(set);
      next.delete(id);
      return next;
    });

    if (this.activeSettingsDrawerItemId() === id) {
      this.activeSettingsDrawerItemId.set(null);
    }

    const currentPreviewIdx = this.previewModalIndex();
    if (currentPreviewIdx !== null) {
      const updatedList = this.images();
      if (updatedList.length === 0) {
        this.previewModalIndex.set(null);
      } else if (currentPreviewIdx >= updatedList.length) {
        this.previewModalIndex.set(updatedList.length - 1);
      }
    }

    if (item) {
      this.showToast('info', `Removed "${item.originalName}"`, 2000);
    }

    const remaining = this.images();
    if (!this.globalSettings().targetFileSize?.userDefined) {
      if (remaining.length === 1) {
        const dyn = calculateDynamicDefaultTarget(remaining[0].originalSize);
        this.globalSettings.update(curr => ({
          ...curr,
          targetFileSize: {
            ...(curr.targetFileSize || DEFAULT_COMPRESSION_SETTINGS.targetFileSize!),
            enabled: true,
            targetBytes: dyn.targetBytes,
            targetValue: dyn.targetValue,
            targetUnit: dyn.targetUnit,
            isDynamicDefault: true,
            userDefined: false,
            minQuality: COMPRESSOR_CONFIG.targetSize.qualityFloor
          }
        }));
      } else if (remaining.length >= 2) {
        const avg = Math.round(remaining.reduce((acc, img) => acc + img.originalSize, 0) / remaining.length);
        const dyn = calculateDynamicDefaultTarget(avg);
        this.globalSettings.update(curr => ({
          ...curr,
          targetFileSize: {
            ...(curr.targetFileSize || DEFAULT_COMPRESSION_SETTINGS.targetFileSize!),
            enabled: true,
            targetBytes: dyn.targetBytes,
            targetValue: dyn.targetValue,
            targetUnit: dyn.targetUnit,
            isDynamicDefault: true,
            userDefined: false,
            minQuality: COMPRESSOR_CONFIG.targetSize.qualityFloor
          }
        }));
      }
    }
  }

  /**
   * Removes all images from workspace and revokes all object URLs.
   */
  removeAll(): void {
    const count = this.images().length;
    this.cancelAll();
    this.cleanupAllObjectUrls();
    this.images.set([]);
    this.selectedIds.set(new Set());
    this.previewModalIndex.set(null);
    this.activeSettingsDrawerItemId.set(null);
    if (count > 0) {
      this.showToast('info', `Removed all ${count} images`, 2000);
    }
  }

  /**
   * Prompts user with a confirmation modal before clearing all images.
   */
  requestRemoveAll(): void {
    const count = this.images().length;
    if (count === 0) return;
    this.confirmModalData.set({
      action: 'clear-all',
      title: `Remove ${count} ${count === 1 ? 'image' : 'images'}?`,
      message: "This can't be undone.",
      isDanger: true
    });
  }

  /**
   * Prompts user with a confirmation modal before resetting to a fresh session.
   */
  requestNewSession(): void {
    const count = this.images().length;
    if (count === 0) {
      this.resetToNewSession();
      return;
    }
    this.confirmModalData.set({
      action: 'new-session',
      title: 'Start New Session?',
      message: 'This will reset all compression settings, clear your current images, and return you to the upload screen.',
      isDanger: false
    });
  }

  /**
   * Confirms and executes the requested destructive action.
   */
  confirmModalAction(): void {
    const data = this.confirmModalData();
    this.confirmModalData.set(null);
    if (!data) return;

    if (data.action === 'clear-all') {
      this.removeAll();
    } else if (data.action === 'new-session') {
      this.resetToNewSession();
    }
  }

  /**
   * Cancels the active confirmation modal.
   */
  cancelConfirmModal(): void {
    this.confirmModalData.set(null);
  }

  /**
   * Resets workspace and settings completely to initial state.
   */
  resetToNewSession(): void {
    this.cancelAll();
    this.cleanupAllObjectUrls();
    this.images.set([]);
    this.selectedIds.set(new Set());
    this.previewModalIndex.set(null);
    this.activeSettingsDrawerItemId.set(null);
    this.globalSettings.set({ ...DEFAULT_COMPRESSION_SETTINGS });
    this.showToast('info', 'Started a fresh compression session.', 2000);
  }

  // --- Feedback Modal Methods ---

  openFeedbackModal(): void {
    this.feedbackModalOpen.set(true);
  }

  closeFeedbackModal(): void {
    this.feedbackModalOpen.set(false);
  }

  submitFeedback(submission: { rating: 'positive' | 'negative'; category: string; comment: string }): void {
    this.telemetry.trackFeedbackSubmitted(submission.rating, submission.category, submission.comment.length);
    this.feedbackModalOpen.set(false);
    this.showToast('success', 'Thank you for your feedback! Your input helps improve Image Compressor.', 3000);
  }

  /**
   * Toggles selection state for an image.
   */
  toggleSelect(id: string): void {
    this.selectedIds.update(set => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

    this.images.update(list =>
      list.map(img => img.id === id ? { ...img, selected: !img.selected } : img)
    );
  }

  /**
   * Selects all images.
   */
  selectAll(): void {
    const list = this.images();
    const allIds = new Set(list.map(img => img.id));
    this.selectedIds.set(allIds);
    this.images.update(items => items.map(img => ({ ...img, selected: true })));
  }

  /**
   * Deselects all images.
   */
  deselectAll(): void {
    this.selectedIds.set(new Set());
    this.images.update(items => items.map(img => ({ ...img, selected: false })));
  }

  /**
   * Removes selected images and cleans up all allocated memory.
   */
  removeSelected(): void {
    const selected = this.selectedIds();
    if (selected.size === 0) return;

    const count = selected.size;
    const list = this.images();

    list.forEach(img => {
      if (selected.has(img.id)) {
        if (img.abortController) img.abortController.abort();
        this.revokeItemUrls(img);
      }
    });

    this.pendingQueue = this.pendingQueue.filter(id => !selected.has(id));

    this.images.update(items => items.filter(img => !selected.has(img.id)));
    this.selectedIds.set(new Set());

    if (this.previewModalIndex() !== null) {
      const remaining = this.images();
      if (remaining.length === 0) {
        this.previewModalIndex.set(null);
      } else {
        this.previewModalIndex.set(Math.min(this.previewModalIndex()!, remaining.length - 1));
      }
    }

    this.showToast('info', `Removed ${count} selected image(s)`, 2000);

    const remaining = this.images();
    if (!this.globalSettings().targetFileSize?.userDefined) {
      if (remaining.length === 1) {
        const dyn = calculateDynamicDefaultTarget(remaining[0].originalSize);
        this.globalSettings.update(curr => ({
          ...curr,
          targetFileSize: {
            ...(curr.targetFileSize || DEFAULT_COMPRESSION_SETTINGS.targetFileSize!),
            enabled: true,
            targetBytes: dyn.targetBytes,
            targetValue: dyn.targetValue,
            targetUnit: dyn.targetUnit,
            isDynamicDefault: true,
            userDefined: false,
            minQuality: COMPRESSOR_CONFIG.targetSize.qualityFloor
          }
        }));
      } else if (remaining.length >= 2) {
        const avg = Math.round(remaining.reduce((acc, img) => acc + img.originalSize, 0) / remaining.length);
        const dyn = calculateDynamicDefaultTarget(avg);
        this.globalSettings.update(curr => ({
          ...curr,
          targetFileSize: {
            ...(curr.targetFileSize || DEFAULT_COMPRESSION_SETTINGS.targetFileSize!),
            enabled: true,
            targetBytes: dyn.targetBytes,
            targetValue: dyn.targetValue,
            targetUnit: dyn.targetUnit,
            isDynamicDefault: true,
            userDefined: false,
            minQuality: COMPRESSOR_CONFIG.targetSize.qualityFloor
          }
        }));
      }
    }
  }

  /**
   * Updates global compression settings and propagates to images without individual overrides.
   */
  updateGlobalSettings(partial: Partial<CompressionSettings>): void {
    this.globalSettings.update(curr => {
      let nextTarget = curr.targetFileSize;
      if (partial.targetFileSize) {
        const isUserEdit = partial.targetFileSize.userDefined !== undefined
          ? partial.targetFileSize.userDefined
          : true;
        nextTarget = {
          ...(curr.targetFileSize || DEFAULT_COMPRESSION_SETTINGS.targetFileSize!),
          ...partial.targetFileSize,
          userDefined: isUserEdit,
          isDynamicDefault: !isUserEdit
        };

        // Recalculate targetBytes if targetValue or targetUnit changed
        if (nextTarget && nextTarget.enabled) {
          const mult = nextTarget.targetUnit === 'MB' ? 1024 * 1024 : 1024;
          nextTarget.targetBytes = Math.round((nextTarget.targetValue || 200) * mult);
        }
      }

      const next: CompressionSettings = {
        ...curr,
        ...partial,
        preset: partial.preset ?? curr.preset,
        developerPreset: partial.developerPreset !== undefined ? partial.developerPreset : curr.developerPreset,
        targetFileSize: nextTarget,
        resize: partial.resize ? { ...curr.resize, ...partial.resize } : curr.resize,
        multiVariant: partial.multiVariant ? { ...curr.multiVariant, ...partial.multiVariant } : curr.multiVariant,
        metadataPolicy: partial.metadataPolicy ?? curr.metadataPolicy,
        advancedOptimization: partial.advancedOptimization
          ? { ...curr.advancedOptimization, ...partial.advancedOptimization }
          : curr.advancedOptimization
      };
      return next;
    });

    if (partial.preset) {
      this.telemetry.trackPresetSelected(partial.preset);
    }
    if (partial.outputFormat) {
      this.telemetry.trackFormatSelected(partial.outputFormat);
    }

    const currentGlobal = this.globalSettings();

    // Propagate only to items without individual overrides using Priority 2 & 3
    this.images.update(list =>
      list.map(item => {
        if (item.individualSettings.hasCustomSettings) {
          return item;
        }
        return {
          ...item,
          effectiveSettings: resolveEffectiveSettings(item, currentGlobal)
        };
      })
    );
  }

  /**
   * Updates individual settings overrides for a specific image.
   */
  updateIndividualSettings(id: string, overrides: Partial<IndividualCompressionOverrides>): void {
    const global = this.globalSettings();

    this.images.update(list =>
      list.map(item => {
        if (item.id !== id) return item;

        const nextOverrides: IndividualCompressionOverrides = {
          ...item.individualSettings,
          ...overrides,
          hasCustomSettings: true
        };

        const targetBase = nextOverrides.targetFileSize || global.targetFileSize;
        const nextTarget = targetBase ? {
          ...targetBase,
          userDefined: nextOverrides.targetFileSize ? true : targetBase.userDefined,
          isDynamicDefault: nextOverrides.targetFileSize ? false : targetBase.isDynamicDefault
        } : undefined;
        if (nextTarget && nextTarget.enabled && nextTarget.targetValue) {
          const mult = nextTarget.targetUnit === 'MB' ? 1024 * 1024 : 1024;
          nextTarget.targetBytes = Math.round((nextTarget.targetValue || 200) * mult);
        }
        if (nextTarget) {
          nextOverrides.targetFileSize = nextTarget;
        }

        const tempItem: ImageItem = {
          ...item,
          individualSettings: nextOverrides
        };
        const effective = resolveEffectiveSettings(tempItem, global);

        return {
          ...item,
          individualSettings: nextOverrides,
          effectiveSettings: effective
        };
      })
    );
  }

  /**
   * Applies the Smart Recommendation to a specific image.
   */
  applyRecommendation(id: string): void {
    const item = this.images().find(img => img.id === id);
    if (!item || !item.recommendation) return;
    const rec = item.recommendation;

    this.updateIndividualSettings(id, {
      outputFormat: rec.suggestedFormat,
      quality: rec.suggestedQuality,
      preset: rec.preset
    });

    this.images.update(list =>
      list.map(img => img.id === id ? {
        ...img,
        recommendation: { ...rec, applied: true }
      } : img)
    );

    this.showToast('success', `Applied recommendation: ${rec.suggestedFormat.toUpperCase()} at Q${rec.suggestedQuality}%`);
  }

  /**
   * Applies smart recommendations to all uncustomized images.
   */
  applyRecommendationToAll(): void {
    const list = this.images();
    let appliedCount = 0;

    for (const item of list) {
      if (item.recommendation && !item.individualSettings.hasCustomSettings) {
        this.applyRecommendation(item.id);
        appliedCount++;
      }
    }

    if (appliedCount > 0) {
      this.showToast('success', `Applied smart recommendations to ${appliedCount} image(s)`);
    } else {
      this.showToast('info', 'No uncustomized images have pending recommendations');
    }
  }

  /**
   * Resets an image back to inheriting global settings.
   */
  resetIndividualSettings(id: string): void {
    const global = this.globalSettings();

    this.images.update(list =>
      list.map(item => {
        if (item.id !== id) return item;
        return {
          ...item,
          individualSettings: { hasCustomSettings: false },
          effectiveSettings: { ...global }
        };
      })
    );

    this.showToast('info', 'Restored global settings for image', 1500);
  }

  /**
   * Applies the closest achievable compressed result when the strict target was unreachable.
   */
  applyClosestResult(id: string): void {
    const item = this.images().find(img => img.id === id);
    if (!item || !item.result) return;
    const res = item.result;
    const closestBlob = res.closestAchievableBlob;
    const closestSize = res.closestAchievableSize;
    if (!closestBlob || typeof closestSize !== 'number') return;

    const savedBytes = Math.max(0, item.originalSize - closestSize);
    const savedPercentage = item.originalSize > 0 && item.originalSize > closestSize
      ? Math.round(((item.originalSize - closestSize) / item.originalSize) * 1000) / 10
      : 0;

    const updatedResult: CompressionResult = {
      ...res,
      compressedSize: closestSize,
      outputBlob: closestBlob,
      outputUrl: res.closestAchievableUrl || URL.createObjectURL(closestBlob),
      savedBytes,
      savedPercentage,
      targetAchieved: false,
      targetUnreachable: false,
      reductionResult: savedBytes > 0 ? 'reduced' : 'not reduced',
      reductionReason: 'Applied closest achievable result'
    };

    this.updateItemState(id, {
      result: updatedResult
    });
    this.showToast('success', `Applied closest result (${this.formatBytes(closestSize)})`, 2500);
  }

  /**
   * Applies global settings to all currently selected images.
   */
  applyGlobalSettingsToSelected(): void {
    const selected = this.selectedIds();
    if (selected.size === 0) return;

    const global = this.globalSettings();

    this.images.update(list =>
      list.map(item => {
        if (!selected.has(item.id)) return item;
        return {
          ...item,
          individualSettings: { hasCustomSettings: false },
          effectiveSettings: { ...global }
        };
      })
    );

    this.showToast('success', `Applied global settings to ${selected.size} image(s)`, 2000);
  }

  // --- Non-destructive Transform Operations (Rotate, Flip, Crop) ---

  /**
   * Adds a non-destructive transform operation to an individual image.
   */
  async addTransform(id: string, op: TransformOp): Promise<void> {
    const item = this.images().find(img => img.id === id);
    if (!item) return;

    const currentOps = item.transforms || [];
    const nextOps = [...currentOps, op];
    this.updateItemState(id, { transforms: nextOps });

    await this.refreshTransformedPreview(id);
    this.telemetry.trackTransformApplied(op.type, op.type === 'crop' ? op.aspectPreset : undefined);

    let desc = 'Transform applied';
    if (op.type === 'rotate') desc = `Rotated ${op.angle > 0 ? (op.angle === 180 ? '180°' : '90° right') : '90° left'}`;
    else if (op.type === 'flip') desc = `Flipped ${op.direction}`;
    else if (op.type === 'crop') desc = `Cropped image (${op.aspectPreset || 'custom'})`;
    this.showToast('info', desc, 1500);
  }

  /**
   * Undoes the last transform operation applied to an image.
   */
  async undoTransform(id: string): Promise<void> {
    const item = this.images().find(img => img.id === id);
    if (!item || !item.transforms || item.transforms.length === 0) return;

    const nextOps = item.transforms.slice(0, -1);
    this.updateItemState(id, { transforms: nextOps });
    await this.refreshTransformedPreview(id);
    this.showToast('info', 'Undid last transform', 1500);
  }

  /**
   * Resets all transform operations on an image back to its original state.
   */
  resetTransforms(id: string): void {
    const item = this.images().find(img => img.id === id);
    if (!item) return;

    if (item.transformedPreviewUrl) {
      URL.revokeObjectURL(item.transformedPreviewUrl);
    }
    this.updateItemState(id, {
      transforms: [],
      transformedPreviewUrl: undefined,
      width: item.originalUploadedWidth || item.width,
      height: item.originalUploadedHeight || item.height
    });
    this.showToast('info', 'Reset all transforms', 1500);
  }

  /**
   * Applies a transform operation to all images in the session.
   */
  async addTransformToAll(op: TransformOp): Promise<void> {
    const list = this.images();
    for (const img of list) {
      await this.addTransform(img.id, op);
    }
  }

  /**
   * Re-renders the transformed canvas and updates the preview URL for live before/after view.
   */
  private async refreshTransformedPreview(id: string): Promise<void> {
    const item = this.images().find(img => img.id === id);
    if (!item) return;

    if (item.transformedPreviewUrl) {
      URL.revokeObjectURL(item.transformedPreviewUrl);
    }

    if (!item.transforms || item.transforms.length === 0) {
      this.updateItemState(id, {
        transformedPreviewUrl: undefined,
        width: item.originalUploadedWidth || item.width,
        height: item.originalUploadedHeight || item.height
      });
      return;
    }

    try {
      const decoded = await this.decoder.decodeFile(item.file, item.detectedFormat);
      const transformed = this.transformService.applyTransforms(decoded.canvas, item.transforms);
      const blob = await this.transformService.exportCanvasToBlob(transformed.canvas);
      const url = URL.createObjectURL(blob);
      this.updateItemState(id, {
        transformedPreviewUrl: url,
        width: transformed.width,
        height: transformed.height
      });
    } catch {
      // Safe fallback
    }
  }

  // --- Compression Pipeline & Queue Execution ---

  /**
   * Compresses a single image item.
   */
  compressItem(id: string): Promise<void> {
    const item = this.images().find(img => img.id === id);
    if (!item || item.status === 'corrupted' || item.status === 'invalid') return Promise.resolve();

    const effective = resolveEffectiveSettings(item, this.globalSettings());
    this.updateItemState(id, { effectiveSettings: effective });

    return new Promise<void>(resolve => {
      this.itemCompletionResolvers.set(id, resolve);
      if (!this.pendingQueue.includes(id)) {
        this.pendingQueue.push(id);
        this.updateItemState(id, { status: 'pending', progress: 0, progressStage: 'In queue...', error: undefined });
        this.drainQueue();
      }
    });
  }

  /**
   * Compresses all images currently in the workspace using global settings,
   * while preserving individual customizations on customized images.
   * Builds one job list from all files and executes all of them in one click.
   */
  compressAll(): Promise<void> {
    let allItems = this.images().filter(
      img => img.status !== 'completed' && img.status !== 'corrupted' && img.status !== 'invalid'
    );
    if (allItems.length === 0 && this.images().length > 0) {
      allItems = this.images().filter(
        img => img.status !== 'corrupted' && img.status !== 'invalid'
      );
    }

    if (allItems.length === 0) {
      return Promise.resolve();
    }

    const global = this.globalSettings();
    this.images.update(list =>
      list.map(item => ({
        ...item,
        effectiveSettings: resolveEffectiveSettings(item, global)
      }))
    );

    // Step 1: Log the job list at the start: one line per file with name, original size, and settings
    for (const item of allItems) {
      const settingsSummary = this.describeSettingsSummary(item.effectiveSettings);
      console.log(`[job] ${item.originalName} | ${this.formatBytes(item.originalSize)} | ${settingsSummary}`);
    }

    const promise = new Promise<void>(resolve => {
      this.batchCompletionResolvers.push(resolve);
    });

    for (const item of allItems) {
      if (!this.pendingQueue.includes(item.id)) {
        this.pendingQueue.push(item.id);
        this.updateItemState(item.id, {
          status: 'pending',
          progress: 0,
          progressStage: 'In queue...',
          error: undefined
        });
      }
    }

    if (allItems.length > 1) {
      this.showToast('info', `Compressing ${allItems.length} images...`, 3000);
    }
    this.drainQueue();
    return promise;
  }

  /**
   * Compresses only the currently selected images.
   */
  compressSelected(): void {
    const selected = this.selectedIds();
    if (selected.size === 0) return;

    const targetItems = this.images().filter(
      img => selected.has(img.id) &&
             img.status !== 'corrupted' &&
             img.status !== 'invalid' &&
             !['pending', 'decoding', 'processing', 'encoding'].includes(img.status)
    );

    for (const item of targetItems) {
      if (!this.pendingQueue.includes(item.id)) {
        this.pendingQueue.push(item.id);
        this.updateItemState(item.id, {
          status: 'pending',
          progress: 0,
          progressStage: 'In queue...'
        });
      }
    }

    this.drainQueue();
  }

  /**
   * Cancels compression for a single item.
   */
  cancelItem(id: string): void {
    // Remove from pending queue if not yet started
    this.pendingQueue = this.pendingQueue.filter(qid => qid !== id);

    const item = this.images().find(img => img.id === id);
    if (item?.abortController) {
      item.abortController.abort();
    }

    this.updateItemState(id, {
      status: 'cancelled',
      progress: 0,
      progressStage: 'Cancelled',
      abortController: undefined
    });

    this.showToast('info', `Cancelled compression for "${item?.originalName || 'image'}"`, 1500);
  }

  /**
   * Cancels all pending and in-flight compression tasks.
   */
  cancelAll(): void {
    this.pendingQueue = [];
    const resolvers = [...this.batchCompletionResolvers];
    this.batchCompletionResolvers = [];
    resolvers.forEach(r => r());
    this.itemCompletionResolvers.forEach(r => r());
    this.itemCompletionResolvers.clear();
    const list = this.images();

    for (const item of list) {
      if (item.abortController) {
        item.abortController.abort();
      }
      if (['pending', 'decoding', 'processing', 'encoding'].includes(item.status)) {
        this.updateItemState(item.id, {
          status: 'cancelled',
          progress: 0,
          progressStage: 'Cancelled',
          abortController: undefined
        });
      }
    }

    this.activeCompressionSlots = 0;
  }

  /**
   * Prepares an image for customization.
   * If the image has already undergone successful compression (iteration > 0),
   * sets the active working source to the latest compressed output so the customization
   * modal, achievable size discovery, and subsequent compression pass operate directly
   * on the latest compressed image.
   * The original uploaded file is permanently preserved in originalUploaded* fields.
   */
  prepareForCustomization(id: string): void {
    const item = this.images().find(img => img.id === id);
    if (!item) return;

    const originalUploadedFile = item.originalUploadedFile || item.file;
    const originalUploadedSize = item.originalUploadedSize || item.originalSize;
    const originalUploadedWidth = item.originalUploadedWidth || item.width;
    const originalUploadedHeight = item.originalUploadedHeight || item.height;
    const originalUploadedFormat = item.originalUploadedFormat || item.detectedFormat;
    const originalUploadedExtension = item.originalUploadedExtension || item.originalExtension;
    const originalUploadedMimeType = item.originalUploadedMimeType || item.mimeType;
    const originalUploadedPreviewUrl = item.originalUploadedPreviewUrl || item.previewUrl;

    let src = item.currentWorkingSource;
    if ((!src || src.iteration === 0) && item.result && item.result.status === 'completed') {
      const workingBlob = item.result.outputBlob || (item.file as Blob);
      const workingFile = item.result.outputBlob
        ? new File([item.result.outputBlob], item.result.outputFilename || item.file.name, {
            type: item.result.outputMimeType,
            lastModified: Date.now()
          })
        : item.file;
      src = {
        file: workingFile,
        blob: workingBlob,
        size: item.result.compressedSize,
        width: item.result.outputWidth || item.width,
        height: item.result.outputHeight || item.height,
        format: item.result.outputFormat || item.detectedFormat,
        extension: item.result.outputFilename ? (item.result.outputFilename.split('.').pop() || item.result.outputFormat) : (item.result.outputFormat || item.originalExtension),
        mimeType: item.result.outputMimeType || item.mimeType,
        previewUrl: item.result.outputUrl || item.previewUrl,
        iteration: 1
      };
    }

    if (src && (src.iteration > 0 || (item.result && item.result.status === 'completed'))) {
      const caps = this.resolveCapabilities(src.format);

      this.updateItemState(id, {
        originalUploadedFile,
        originalUploadedSize,
        originalUploadedWidth,
        originalUploadedHeight,
        originalUploadedFormat,
        originalUploadedExtension,
        originalUploadedMimeType,
        originalUploadedPreviewUrl,
        file: src.file,
        originalSize: src.size,
        width: src.width,
        height: src.height,
        aspectRatio: src.width > 0 && src.height > 0 ? src.width / src.height : 1,
        detectedFormat: src.format,
        originalExtension: src.extension,
        mimeType: src.mimeType,
        previewUrl: src.previewUrl,
        originalName: src.file.name,
        nameWithoutExt: src.file.name.replace(/\.[^/.]+$/, ''),
        capabilities: caps,
        characteristics: undefined
      });
    } else {
      this.updateItemState(id, {
        originalUploadedFile,
        originalUploadedSize,
        originalUploadedWidth,
        originalUploadedHeight,
        originalUploadedFormat,
        originalUploadedExtension,
        originalUploadedMimeType,
        originalUploadedPreviewUrl
      });
    }
  }

  /**
   * Explicitly reverts a customized/compressed image back to its original uploaded file state.
   */
  resetToOriginal(id: string): void {
    const item = this.images().find(img => img.id === id);
    if (!item) return;

    if (item.result) {
      this.revokeResultUrls(item.result);
    }

    const origFile = item.originalUploadedFile || item.file;
    const origSize = item.originalUploadedSize || item.originalSize;
    const origWidth = item.originalUploadedWidth || item.width;
    const origHeight = item.originalUploadedHeight || item.height;
    const origFormat = item.originalUploadedFormat || item.detectedFormat;
    const origExt = item.originalUploadedExtension || item.originalExtension;
    const origMime = item.originalUploadedMimeType || item.mimeType;
    const origUrl = item.originalUploadedPreviewUrl || item.previewUrl;

    const resetSource: WorkingImageSource = {
      file: origFile,
      blob: origFile,
      size: origSize,
      width: origWidth,
      height: origHeight,
      format: origFormat,
      mimeType: origMime,
      extension: origExt,
      previewUrl: origUrl,
      iteration: 0
    };

    this.updateItemState(id, {
      file: origFile,
      originalSize: origSize,
      width: origWidth,
      height: origHeight,
      aspectRatio: origWidth > 0 && origHeight > 0 ? origWidth / origHeight : 1,
      detectedFormat: origFormat,
      originalExtension: origExt,
      mimeType: origMime,
      previewUrl: origUrl,
      originalName: origFile.name,
      nameWithoutExt: origFile.name.replace(/\.[^/.]+$/, ''),
      status: 'ready',
      result: undefined,
      progress: 0,
      progressStage: undefined,
      currentWorkingSource: resetSource,
      capabilities: this.resolveCapabilities(origFormat)
    });

    this.showToast('info', `Restored original "${origFile.name}"`, 2000);
  }

  /**
   * Resolves format capabilities from central registry for a given format.
   */
  private resolveCapabilities(format: string) {
    const norm = normalizeFormatKey(format);
    const entry = getFormatCapability(norm);
    return {
      fileAccepted: entry ? entry.fileAccepted : true,
      previewSupported: entry ? entry.previewSupported : true,
      compressionSupported: entry ? entry.compressionSupported : true,
      description: entry ? entry.description : ''
    };
  }

  /**
   * User chooses to keep the original file if compressed is larger or preference dictates.
   */
  keepOriginal(id: string): void {
    this.resetToOriginal(id);
  }

  /**
   * Updates an item's result object in state, ensuring the card, modal, and download share the same object.
   */
  updateItemResult(id: string, result: CompressionResult): void {
    const item = this.images().find(img => img.id === id);
    if (!item) return;

    if (item.result && item.result !== result) {
      this.revokeResultUrls(item.result);
    }

    this.updateItemState(id, {
      status: 'completed',
      progress: 100,
      progressStage: 'Completed',
      result,
      error: undefined
    });
  }

  /**
   * Feature 4: User allows resize when target size could not be reached at full resolution.
   */
  allowResize(id: string): void {
    const item = this.images().find(img => img.id === id);
    if (!item) return;
    (item as any).allowAdaptiveResize = true;
    this.updateIndividualSettings(id, {
      resize: {
        enabled: true,
        mode: 'percentage',
        percentage: 85,
        maintainAspectRatio: true,
        preventUpscale: true
      }
    });
    this.compressItem(id);
    this.showToast('info', 'Re-compressing with adaptive resizing allowed...');
  }

  /**
   * Feature 4: User chooses to keep best quality when target size could not be reached.
   */
  keepBestQuality(id: string): void {
    const item = this.images().find(img => img.id === id);
    if (!item || !item.result) return;
    this.updateItemResult(id, {
      ...item.result,
      targetUnreachable: false
    });
    this.showToast('info', 'Kept best full-resolution quality.');
  }

  /**
   * Initiates browser download for a single compressed image.
   */
  downloadItemResult(id: string): void {
    const item = this.images().find(img => img.id === id);
    if (!item || !item.result || !item.result.outputBlob || item.result.outputBlob.size === 0) {
      this.telemetry.recordDiagnosticError('DOWNLOAD_EMPTY_BLOB', 'No valid compressed file available to download.', { itemId: id });
      this.showToast('error', 'No valid compressed output file available to download.');
      return;
    }

    downloadBlob(item.result.outputBlob, item.result.outputFilename);
    this.telemetry.trackDownloadCompleted('single', item.result.outputFormat);
    const savedPct = item.result.savedPercentage || 0;
    this.showToast('success', `Done. Saved 1 image, ${savedPct}% smaller.`, 2500);
  }

  /**
   * Renames an image's base name (without extension).
   * Validates non-empty and max 100 characters.
   * Preserves the extension and updates result outputFilename so downloads and ZIPs use it.
   */
  renameImage(id: string, newBaseName: string): boolean {
    const trimmed = (newBaseName || '').trim();
    if (!trimmed) {
      return false;
    }
    const cleanBaseName = trimmed.slice(0, 100);
    this.images.update(list =>
      list.map(img => {
        if (img.id !== id) return img;
        const newOriginalName = `${cleanBaseName}.${img.originalExtension}`;
        const outExt = img.result?.outputFilename?.includes('.')
          ? img.result.outputFilename.split('.').pop()
          : (img.result?.outputFormat || img.originalExtension);
        const updatedResult = img.result
          ? {
              ...img.result,
              outputFilename: `${cleanBaseName}.${outExt}`,
              originalName: newOriginalName
            }
          : undefined;
        return {
          ...img,
          nameWithoutExt: cleanBaseName,
          originalName: newOriginalName,
          result: updatedResult
        };
      })
    );
    return true;
  }

  /**
   * Applies a Developer Preset globally.
   */
  applyDeveloperPreset(key: DeveloperPresetKey): void {
    const presetConfig = getDeveloperPreset(key);
    if (!presetConfig) return;

    this.updateGlobalSettings({
      developerPreset: key,
      outputFormat: presetConfig.targetFormat,
      quality: presetConfig.quality,
      resize: { ...presetConfig.resize },
      metadataPolicy: presetConfig.metadataPolicy
    });

    this.showToast('success', `Applied preset: ${presetConfig.label} (${presetConfig.badge})`);
  }

  /**
   * Applies a Developer Preset to selected images.
   */
  applyDeveloperPresetToSelected(key: DeveloperPresetKey): void {
    const presetConfig = getDeveloperPreset(key);
    if (!presetConfig) return;

    const selected = this.selectedIds();
    if (selected.size === 0) {
      this.applyDeveloperPreset(key);
      return;
    }

    selected.forEach(id => {
      this.updateIndividualSettings(id, {
        developerPreset: key,
        outputFormat: presetConfig.targetFormat,
        quality: presetConfig.quality,
        resize: { ...presetConfig.resize },
        metadataPolicy: presetConfig.metadataPolicy
      });
    });

    this.showToast('success', `Applied ${presetConfig.label} to ${selected.size} image(s)`);
  }

  /**
   * Retries all failed compression tasks.
   */
  retryFailed(): void {
    const failed = this.images().filter(img => img.status === 'failed');
    if (failed.length === 0) {
      this.showToast('info', 'No failed tasks to retry.');
      return;
    }

    for (const item of failed) {
      if (!this.pendingQueue.includes(item.id)) {
        this.pendingQueue.push(item.id);
        this.updateItemState(item.id, {
          status: 'pending',
          progress: 0,
          progressStage: 'In queue...',
          error: undefined
        });
      }
    }
    this.showToast('info', `Retrying ${failed.length} failed task(s)...`, 2000);
    this.drainQueue();
  }

  /**
   * Retries an individual failed compression task.
   */
  retryItem(id: string): void {
    const item = this.images().find(img => img.id === id);
    if (!item) return;

    if (!this.pendingQueue.includes(id)) {
      this.pendingQueue.push(id);
      this.updateItemState(id, {
        status: 'pending',
        progress: 0,
        progressStage: 'In queue...',
        error: undefined
      });
      this.drainQueue();
    }
  }

  /**
   * Clears all completed images from the workspace.
   */
  clearCompleted(): void {
    const completed = this.images().filter(img => img.status === 'completed');
    if (completed.length === 0) {
      this.showToast('info', 'No completed images to clear.');
      return;
    }

    completed.forEach(img => {
      this.revokeItemUrls(img);
    });

    this.images.update(list => list.filter(img => img.status !== 'completed'));
    this.selectedIds.update(set => {
      const next = new Set(set);
      completed.forEach(c => next.delete(c.id));
      return next;
    });

    this.showToast('info', `Cleared ${completed.length} completed image(s)`, 2000);
  }

  /**
   * Downloads a specific generated variant.
   */
  downloadVariant(imageId: string, variantId: string): void {
    const item = this.images().find(img => img.id === imageId);
    const variant = item?.result?.variants?.find(v => v.variantId === variantId);
    if (!variant || !variant.outputBlob) {
      this.showToast('error', 'Variant output not found.');
      return;
    }

    downloadBlob(variant.outputBlob, variant.outputFilename);
    this.telemetry.trackDownloadCompleted('variant', variant.format);
    this.showToast('success', `Downloading "${variant.outputFilename}"...`, 2000);
  }

  // --- Modal Triggers ---

  openMetadataModal(id: string): void {
    const item = this.images().find(img => img.id === id);
    if (item) {
      this.metadataModalItem.set(item);
    }
  }

  closeMetadataModal(): void {
    this.metadataModalItem.set(null);
  }

  openReportModal(): void {
    this.reportModalOpen.set(true);
  }

  closeReportModal(): void {
    this.reportModalOpen.set(false);
  }

  getOptimizationReport() {
    return this.reportService.generateReport(this.images());
  }

  exportReportCsv(): void {
    const report = this.getOptimizationReport();
    this.reportService.exportToCsv(report);
    this.showToast('success', 'Exported optimization report to CSV', 2000);
  }

  exportReportJson(): void {
    const report = this.getOptimizationReport();
    this.reportService.exportToJson(report);
    this.showToast('success', 'Exported optimization report to JSON', 2000);
  }

  /**
   * Generates an in-memory ZIP Blob of all completed compressed results.
   */
  async generateZipBlobOfCompleted(): Promise<Blob | null> {
    const completed = this.images().filter(
      img => img.status === 'completed' && img.result && img.result.outputBlob
    );
    if (completed.length === 0) return null;

    const zipItems: { filename: string; blob: Blob; folder?: string }[] = [];
    for (const img of completed) {
      if (img.result?.outputBlob && img.result.outputBlob.size > 0) {
        zipItems.push({
          filename: img.result.outputFilename,
          blob: img.result.outputBlob
        });
      }

      if (img.result?.variants) {
        for (const v of img.result.variants) {
          if (v.outputBlob && v.outputBlob.size > 0) {
            zipItems.push({
              filename: v.outputFilename,
              blob: v.outputBlob,
              folder: 'variants'
            });
          }
        }
      }
    }

    return await createZipBlob(zipItems);
  }

  /**
   * Packages all completed compressed results into a ZIP archive and triggers download,
   * including generated responsive multi-variants.
   */
  async downloadAllCompletedZip(): Promise<void> {
    if (this.isPackagingZip()) return;

    const completed = this.images().filter(
      img => img.status === 'completed' && img.result && img.result.outputBlob
    );

    if (completed.length === 0) {
      this.showToast('warning', 'No compressed images to download yet.');
      return;
    }

    this.isPackagingZip.set(true);
    this.showToast('info', `Building ZIP archive of ${completed.length} images...`, 2500);

    const zipItems: { filename: string; blob: Blob; folder?: string }[] = [];
    for (const img of completed) {
      if (img.result?.outputBlob && img.result.outputBlob.size > 0) {
        zipItems.push({
          filename: img.result.outputFilename,
          blob: img.result.outputBlob
        });
      }

      if (img.result?.variants) {
        for (const v of img.result.variants) {
          if (v.outputBlob && v.outputBlob.size > 0) {
            zipItems.push({
              filename: v.outputFilename,
              blob: v.outputBlob,
              folder: 'variants'
            });
          }
        }
      }
    }

    try {
      this.telemetry.trackDownloadCompleted('zip');
      await downloadZip(zipItems, 'acklet-compressed-images.zip');
      const savedPct = this.totalSavedPercentage();
      this.showToast('success', `Done. Saved ${completed.length} images, ${savedPct}% smaller.`, 3500);
    } catch (err: any) {
      this.telemetry.trackZipFailure(err.message || 'Failed to create ZIP download.');
      this.showToast('error', err.message || 'Failed to create ZIP download.');
    } finally {
      this.isPackagingZip.set(false);
    }
  }

  // --- Internal Concurrency Queue Engine ---

  /**
   * Calculates dynamic concurrency based on hardware and current queued task weights.
   */
  getMaxConcurrentSlots(peekItem?: ImageItem): number {
    if (typeof navigator === 'undefined') return 2;

    const deviceMemory = (navigator as any).deviceMemory; // in GB
    const cores = navigator.hardwareConcurrency || 4;

    // Safety for memory-constrained devices (<= 2GB RAM or <= 2 CPU cores)
    if ((deviceMemory && deviceMemory <= 2) || cores <= 2) {
      return 1;
    }

    // Heavy images (> 16 MP or > 10 MB) take substantial canvas memory; throttle to 1 slot
    if (peekItem && (peekItem.originalSize > 10 * 1024 * 1024 || (peekItem.width * peekItem.height > 16_000_000))) {
      return 1;
    }

    return 2;
  }

  private drainQueue(): void {
    if (this.pendingQueue.length === 0) {
      if (this.activeCompressionSlots === 0) {
        const resolvers = [...this.batchCompletionResolvers];
        this.batchCompletionResolvers = [];
        if (resolvers.length > 0) {
          const completed = this.completedImages();
          if (completed.length > 0) {
            const savedPct = Math.floor(this.totalSavedPercentage());
            if (completed.length === 1) {
              this.showToast('success', `Done. Saved 1 image${savedPct >= 1 ? `, ${savedPct}% smaller` : ''}.`, 2500);
            } else {
              this.showToast('success', `Done. Compressed ${completed.length} images${savedPct >= 1 ? `, ${savedPct}% smaller` : ''}.`, 3000);
            }
          }
        }
        resolvers.forEach(r => r());
      }
      return;
    }

    const peekId = this.pendingQueue[0];
    const peekItem = this.images().find(img => img.id === peekId);
    const maxSlots = this.getMaxConcurrentSlots(peekItem);

    while (
      this.activeCompressionSlots < maxSlots &&
      this.pendingQueue.length > 0
    ) {
      const nextId = this.pendingQueue.shift();
      if (!nextId) break;

      const item = this.images().find(img => img.id === nextId);
      if (!item || item.status === 'corrupted' || item.status === 'invalid') {
        const res = this.itemCompletionResolvers.get(nextId);
        if (res) {
          this.itemCompletionResolvers.delete(nextId);
          res();
        }
        continue;
      }

      this.activeCompressionSlots++;
      this.executeCompression(item).finally(() => {
        this.activeCompressionSlots--;
        this.drainQueue();
      });
    }
  }

  private async executeCompression(item: ImageItem): Promise<void> {
    try {
      await this.runCompressionTask(item);
    } finally {
      const itemResolver = this.itemCompletionResolvers.get(item.id);
      if (itemResolver) {
        this.itemCompletionResolvers.delete(item.id);
        itemResolver();
      }
    }
  }

  private async runCompressionTask(item: ImageItem): Promise<void> {
    // If previously compressed, revoke existing output and variant URLs
    this.revokeResultUrls(item.result);

    const abortController = new AbortController();

    this.updateItemState(item.id, {
      status: 'decoding',
      progress: 10,
      progressStage: 'Reading image...',
      abortController,
      error: undefined
    });

    try {
      const result = await this.compressionEngine.compressImage(
        item,
        update => {
          this.updateItemState(item.id, {
            status: update.stage as any,
            progress: update.progress,
            progressStage: update.statusText
          });
        },
        abortController.signal
      );

      if (result.status === 'failed') {
        this.updateItemState(item.id, {
          status: 'failed',
          progress: 0,
          progressStage: 'Failed',
          result,
          abortController: undefined,
          error: result.error || 'Compression failed. Please try again.'
        });
        this.showToast('error', 'Compression failed. Please try again.', 4000);
        return;
      }

      this.telemetry.trackProcessingSuccess(
        result.processingTimeMs,
        item.originalSize,
        result.compressedSize,
        result.outputFormat
      );

      let nextWorkingSource = item.currentWorkingSource;
      if (result.outputBlob) {
        const workingFile = new File([result.outputBlob], result.outputFilename, {
          type: result.outputMimeType,
          lastModified: Date.now()
        });
        const nextIteration = (item.currentWorkingSource?.iteration ?? 0) + 1;
        nextWorkingSource = {
          file: workingFile,
          blob: result.outputBlob,
          size: result.compressedSize,
          width: result.outputWidth,
          height: result.outputHeight,
          format: result.outputFormat,
          mimeType: result.outputMimeType,
          extension: result.outputFilename.split('.').pop() || result.outputFormat,
          previewUrl: result.outputUrl,
          iteration: nextIteration
        };
      }

      this.updateItemState(item.id, {
        status: 'completed',
        progress: 100,
        progressStage: 'Completed',
        result,
        currentWorkingSource: nextWorkingSource,
        abortController: undefined,
        error: undefined
      });
    } catch (err: any) {
      if (abortController.signal.aborted) {
        this.updateItemState(item.id, {
          status: 'cancelled',
          progress: 0,
          progressStage: 'Cancelled',
          abortController: undefined
        });
      } else {
        const isMemErr = err.name === 'QuotaExceededError' || err.message?.includes('memory') || err.message?.includes('allocation');
        const code = isMemErr ? 'OUT_OF_MEMORY' : 'ENCODING_ERROR';
        const diag = this.telemetry.recordDiagnosticError(code, err.message || 'Compression failed', { itemId: item.id });
        const errorMsg = diag.actionableAdvice;

        this.updateItemState(item.id, {
          status: 'failed',
          progress: 0,
          progressStage: 'Failed',
          error: errorMsg,
          abortController: undefined
        });
        this.showToast('error', 'Compression failed. Please try again.', 4000);
      }
    }
  }

  private updateItemState(id: string, partial: Partial<ImageItem>): void {
    this.images.update(list =>
      list.map(img => (img.id === id ? { ...img, ...partial } : img))
    );
  }

  // --- Preview Modal Navigation ---

  openPreview(indexOrId: number | string): void {
    const list = this.completedImages().length > 0 ? this.completedImages() : this.images();
    if (typeof indexOrId === 'number') {
      this.previewModalIndex.set(indexOrId);
    } else {
      const idx = list.findIndex(img => img.id === indexOrId);
      if (idx !== -1) {
        this.previewModalIndex.set(idx);
      }
    }
  }

  closePreview(): void {
    this.previewModalIndex.set(null);
  }

  nextPreview(): void {
    const curr = this.previewModalIndex();
    const list = this.completedImages().length > 0 ? this.completedImages() : this.images();
    const total = list.length;
    if (curr !== null && total > 0) {
      this.previewModalIndex.set((curr + 1) % total);
    }
  }

  prevPreview(): void {
    const curr = this.previewModalIndex();
    const list = this.completedImages().length > 0 ? this.completedImages() : this.images();
    const total = list.length;
    if (curr !== null && total > 0) {
      this.previewModalIndex.set((curr - 1 + total) % total);
    }
  }

  // --- Individual Settings Drawer / Popover ---

  openItemSettings(id: string): void {
    this.activeSettingsDrawerItemId.set(id);
  }

  closeItemSettings(): void {
    this.activeSettingsDrawerItemId.set(null);
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
  }

  // --- Toast Notification System ---

  showToast(type: ToastMessage['type'], message: string, customDuration?: number): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
    if (this.toastDismissTimer) {
      clearTimeout(this.toastDismissTimer);
      this.toastDismissTimer = null;
    }

    const duration = customDuration ?? (type === 'error' ? 3500 : (type === 'warning' ? 3000 : 2500));
    const id = ++this.toastCounter;
    this.toast.set({ id, type, message, isLeaving: false });

    this.toastTimer = setTimeout(() => {
      if (this.toast()?.id === id) {
        this.toast.update(curr => curr ? { ...curr, isLeaving: true } : null);
        this.toastDismissTimer = setTimeout(() => {
          if (this.toast()?.id === id) {
            this.toast.set(null);
          }
        }, 200);
      }
    }, duration);
  }

  // --- Phase 7: Category Filtering & Adaptive Batch Optimization ---

  setCategoryFilter(category: string): void {
    this.activeCategoryFilter.set(category);
  }

  applyAdaptiveRecommendationsToAll(): void {
    const list = this.images();
    let appliedCount = 0;
    for (const img of list) {
      if (img.recommendation) {
        this.updateIndividualSettings(img.id, {
          mode: 'smart',
          preset: img.recommendation.preset,
          outputFormat: img.recommendation.suggestedFormat,
          quality: img.recommendation.suggestedQuality
        });
        appliedCount++;
      }
    }
    this.showToast('info', `Applied adaptive recommendations to ${appliedCount} images.`);
  }

  applyAdaptiveRecommendationToCategory(category: string): void {
    const list = this.images();
    let appliedCount = 0;
    for (const img of list) {
      if (img.characteristics?.imageCategory === category && img.recommendation) {
        this.updateIndividualSettings(img.id, {
          mode: 'smart',
          preset: img.recommendation.preset,
          outputFormat: img.recommendation.suggestedFormat,
          quality: img.recommendation.suggestedQuality
        });
        appliedCount++;
      }
    }
    this.showToast('info', `Applied adaptive tuning to ${appliedCount} ${category} images.`);
  }

  // --- Phase 7: Profile Management Modal & Application ---

  openProfileModal(): void {
    this.profileModalOpen.set(true);
  }

  closeProfileModal(): void {
    this.profileModalOpen.set(false);
  }

  applyProfileToAll(profileId: string): void {
    const profile = this.profileManager.getProfileById(profileId);
    if (!profile) return;

    this.updateGlobalSettings({ ...profile.settings });
    this.images.update(list =>
      list.map(img => ({
        ...img,
        individualSettings: { hasCustomSettings: false },
        effectiveSettings: { ...profile.settings }
      }))
    );
    this.showToast('info', `Applied "${profile.name}" profile to all images.`);
  }

  applyProfileToSelected(profileId: string): void {
    const profile = this.profileManager.getProfileById(profileId);
    const selected = this.selectedIds();
    if (!profile || selected.size === 0) return;

    const s = profile.settings;
    selected.forEach(id => {
      this.updateIndividualSettings(id, {
        mode: s.mode,
        preset: s.preset,
        developerPreset: s.developerPreset,
        quality: s.quality,
        outputFormat: s.outputFormat,
        targetFileSize: s.targetFileSize ? { ...s.targetFileSize } : undefined,
        resize: s.resize ? { ...s.resize } : undefined,
        multiVariant: s.multiVariant ? { ...s.multiVariant } : undefined,
        metadataPolicy: s.metadataPolicy,
        advancedOptimization: s.advancedOptimization ? { ...s.advancedOptimization } : undefined
      });
    });
    this.showToast('info', `Applied "${profile.name}" profile to ${selected.size} selected images.`);
  }

  getOperationalMetrics() {
    return this.telemetry.getOperationalMetrics();
  }

  getRecentDiagnostics() {
    return this.telemetry.getRecentDiagnostics();
  }

  describeSettingsSummary(settings: CompressionSettings): string {
    const parts: string[] = [];
    parts.push(`format: ${settings.outputFormat || 'original'}`);
    if (settings.targetFileSize?.enabled && (settings.targetFileSize.targetBytes || 0) > 0) {
      parts.push(`target: ${this.formatBytes(settings.targetFileSize.targetBytes)}`);
    } else {
      parts.push(`quality: ${settings.quality || 80}`);
    }
    if (settings.resize?.enabled) {
      if (settings.resize.mode === 'percentage') {
        parts.push(`resize: ${settings.resize.percentage}%`);
      } else if (settings.resize.width && settings.resize.height) {
        parts.push(`resize: ${settings.resize.width}x${settings.resize.height}`);
      }
    }
    return parts.join(', ');
  }

  private cleanupAllObjectUrls(): void {
    this.images().forEach(img => {
      this.revokeItemUrls(img);
    });
  }
}

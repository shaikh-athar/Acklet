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
  TransformOp
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
import { downloadBlob, downloadZip } from './download-helper.util';
import { CompressorTelemetryService } from './compressor-telemetry.service';
import { ProfileManagerService } from './profile-manager.service';
import { TransformService } from './transform.service';
import { ImageDecoderService } from './image-decoder.service';
import { COMPRESSOR_CONFIG } from '../config/compressor.config';

export const DEFAULT_COMPRESSION_SETTINGS: CompressionSettings = {
  mode: 'smart',
  preset: 'balanced',
  quality: COMPRESSOR_CONFIG.presets.smart['balanced'].quality,
  outputFormat: 'original',
  targetFileSize: {
    enabled: false,
    targetBytes: 200 * 1024,
    targetValue: 200,
    targetUnit: 'KB',
    minQuality: COMPRESSOR_CONFIG.targetSize.qualityFloor
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

  constructor() {
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

  readonly filteredImages = computed(() => {
    const filter = this.activeCategoryFilter();
    const list = this.images();
    if (filter === 'all') return list;
    return list.filter(img => img.characteristics?.imageCategory === filter);
  });

  readonly previewImage = computed(() => {
    const idx = this.previewModalIndex();
    const list = this.images();
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

        accepted.push(item);
      } catch (err: any) {
        rejectedCount++;
        errors.push(err.message || `Failed to process "${file.name}".`);
      }
    }

    if (accepted.length > 0) {
      this.images.update(list => [...list, ...accepted]);
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
  }

  /**
   * Updates global compression settings and propagates to images without individual overrides.
   */
  updateGlobalSettings(partial: Partial<CompressionSettings>): void {
    this.globalSettings.update(curr => {
      const nextTarget = partial.targetFileSize
        ? { ...(curr.targetFileSize || DEFAULT_COMPRESSION_SETTINGS.targetFileSize!), ...partial.targetFileSize }
        : curr.targetFileSize;

      // Recalculate targetBytes if targetValue or targetUnit changed
      if (nextTarget && nextTarget.enabled) {
        const mult = nextTarget.targetUnit === 'MB' ? 1024 * 1024 : 1024;
        nextTarget.targetBytes = Math.round((nextTarget.targetValue || 200) * mult);
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

    // Propagate only to items without individual overrides
    this.images.update(list =>
      list.map(item => {
        if (item.individualSettings.hasCustomSettings) {
          return item;
        }
        return {
          ...item,
          effectiveSettings: { ...currentGlobal }
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
        const nextTarget = targetBase ? { ...targetBase } : undefined;
        if (nextTarget && nextTarget.enabled) {
          const mult = nextTarget.targetUnit === 'MB' ? 1024 * 1024 : 1024;
          nextTarget.targetBytes = Math.round((nextTarget.targetValue || 200) * mult);
        }

        const effective: CompressionSettings = {
          mode: nextOverrides.mode ?? global.mode,
          preset: nextOverrides.preset ?? global.preset,
          developerPreset: nextOverrides.developerPreset ?? global.developerPreset,
          quality: nextOverrides.quality ?? global.quality,
          outputFormat: nextOverrides.outputFormat ?? global.outputFormat,
          targetFileSize: nextTarget,
          resize: nextOverrides.resize
            ? { ...global.resize, ...nextOverrides.resize }
            : { ...global.resize },
          multiVariant: nextOverrides.multiVariant ?? global.multiVariant,
          metadataPolicy: nextOverrides.metadataPolicy ?? global.metadataPolicy,
          advancedOptimization: nextOverrides.advancedOptimization ?? global.advancedOptimization
        };

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
      transformedPreviewUrl: undefined
    });
    this.showToast('info', 'Reset all transforms', 1500);
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
      this.updateItemState(id, { transformedPreviewUrl: undefined });
      return;
    }

    try {
      const decoded = await this.decoder.decodeFile(item.file, item.detectedFormat);
      const transformed = this.transformService.applyTransforms(decoded.canvas, item.transforms);
      const blob = await this.transformService.exportCanvasToBlob(transformed.canvas);
      const url = URL.createObjectURL(blob);
      this.updateItemState(id, {
        transformedPreviewUrl: url
      });
    } catch {
      // Safe fallback
    }
  }

  // --- Compression Pipeline & Queue Execution ---

  /**
   * Compresses a single image item.
   */
  compressItem(id: string): void {
    const item = this.images().find(img => img.id === id);
    if (!item || item.status === 'corrupted' || item.status === 'invalid') return;

    // Prevent duplicate active compression
    if (['pending', 'decoding', 'processing', 'encoding'].includes(item.status)) return;

    if (!this.pendingQueue.includes(id)) {
      this.pendingQueue.push(id);
      this.updateItemState(id, { status: 'pending', progress: 0, progressStage: 'In queue...' });
      this.drainQueue();
    }
  }

  /**
   * Compresses all images currently in the workspace.
   */
  compressAll(): void {
    const valid = this.images().filter(
      img => img.status !== 'corrupted' &&
             img.status !== 'invalid' &&
             !['pending', 'decoding', 'processing', 'encoding'].includes(img.status)
    );

    if (valid.length === 0) {
      if (this.images().some(img => ['pending', 'decoding', 'processing', 'encoding'].includes(img.status))) {
        this.showToast('info', 'Compression is already actively running.');
        return;
      }
      this.showToast('warning', 'No valid images available to compress.');
      return;
    }

    for (const item of valid) {
      if (!this.pendingQueue.includes(item.id)) {
        this.pendingQueue.push(item.id);
        this.updateItemState(item.id, {
          status: 'pending',
          progress: 0,
          progressStage: 'In queue...'
        });
      }
    }

    this.showToast('info', `Queued ${valid.length} image(s) for compression...`, 2000);
    this.drainQueue();
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
   * User chooses to keep the original file if compressed is larger or preference dictates.
   */
  keepOriginal(id: string): void {
    const item = this.images().find(img => img.id === id);
    if (!item || !item.result) return;

    this.revokeResultUrls(item.result);

    this.updateItemState(id, {
      status: 'ready',
      result: undefined,
      progress: 0,
      progressStage: undefined
    });

    this.showToast('info', `Restored original "${item.originalName}"`, 2000);
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
    if (this.pendingQueue.length === 0) return;

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

      this.telemetry.trackProcessingSuccess(
        result.processingTimeMs,
        item.originalSize,
        result.compressedSize,
        result.outputFormat
      );

      this.updateItemState(item.id, {
        status: 'completed',
        progress: 100,
        progressStage: 'Completed',
        result,
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
    if (typeof indexOrId === 'number') {
      this.previewModalIndex.set(indexOrId);
    } else {
      const idx = this.images().findIndex(img => img.id === indexOrId);
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
    const total = this.images().length;
    if (curr !== null && total > 0) {
      this.previewModalIndex.set((curr + 1) % total);
    }
  }

  prevPreview(): void {
    const curr = this.previewModalIndex();
    const total = this.images().length;
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

  private cleanupAllObjectUrls(): void {
    this.images().forEach(img => {
      this.revokeItemUrls(img);
    });
  }
}

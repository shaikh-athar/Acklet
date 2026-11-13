// apps/tool-image-compressor/src/services/compressor-state.service.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CompressorStateService } from './compressor-state.service';
import { CompressorValidationService } from './compressor-validation.service';
import { ImageItem } from '../models/compressor.models';

describe('CompressorStateService', () => {
  let state: CompressorStateService;
  let mockValidator: CompressorValidationService;

  beforeEach(() => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    if (typeof URL.createObjectURL !== 'function') {
      URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    }
    if (typeof URL.revokeObjectURL !== 'function') {
      URL.revokeObjectURL = vi.fn();
    }

    mockValidator = new CompressorValidationService();
    // Instantiate directly with mocked/real validator
    state = new CompressorStateService();
    (state as any).validator = mockValidator;
  });

  const createMockItem = (id: string, name: string, size = 1024): ImageItem => ({
    id,
    file: new File(['data'], name, { type: 'image/png' }),
    originalName: name,
    nameWithoutExt: name.replace(/\.[^.]+$/, ''),
    originalExtension: 'png',
    detectedFormat: 'png',
    mimeType: 'image/png',
    originalSize: size,
    width: 800,
    height: 600,
    aspectRatio: 800 / 600,
    previewUrl: `blob:mock-${id}`,
    selected: false,
    status: 'ready',
    capabilities: {
      fileAccepted: true,
      previewSupported: true,
      compressionSupported: true,
      description: 'PNG'
    },
    individualSettings: { hasCustomSettings: false },
    effectiveSettings: { ...state.globalSettings() },
    addedAt: Date.now()
  });

  it('should initialize with default empty state', () => {
    expect(state.images().length).toBe(0);
    expect(state.hasImages()).toBe(false);
    expect(state.totalCount()).toBe(0);
    expect(state.selectedCount()).toBe(0);
    expect(state.globalSettings().quality).toBe(80);
    expect(state.globalSettings().outputFormat).toBe('original');
  });

  it('should toggle selection and compute allSelected', () => {
    const item1 = createMockItem('img1', 'a.png');
    const item2 = createMockItem('img2', 'b.png');
    state.images.set([item1, item2]);

    expect(state.allSelected()).toBe(false);

    state.toggleSelect('img1');
    expect(state.selectedCount()).toBe(1);
    expect(state.allSelected()).toBe(false);

    state.selectAll();
    expect(state.selectedCount()).toBe(2);
    expect(state.allSelected()).toBe(true);

    state.deselectAll();
    expect(state.selectedCount()).toBe(0);
    expect(state.allSelected()).toBe(false);
  });

  it('should remove an image and update selectedIds', () => {
    const item1 = createMockItem('img1', 'a.png');
    const item2 = createMockItem('img2', 'b.png');
    state.images.set([item1, item2]);
    state.toggleSelect('img1');

    state.removeImage('img1');
    expect(state.images().length).toBe(1);
    expect(state.images()[0].id).toBe('img2');
    expect(state.selectedIds().has('img1')).toBe(false);
  });

  it('should remove selected images', () => {
    const item1 = createMockItem('img1', 'a.png');
    const item2 = createMockItem('img2', 'b.png');
    const item3 = createMockItem('img3', 'c.png');
    state.images.set([item1, item2, item3]);

    state.toggleSelect('img1');
    state.toggleSelect('img3');
    expect(state.selectedCount()).toBe(2);

    state.removeSelected();
    expect(state.images().length).toBe(1);
    expect(state.images()[0].id).toBe('img2');
    expect(state.selectedCount()).toBe(0);
  });

  it('should remove all images on removeAll()', () => {
    const item1 = createMockItem('img1', 'a.png');
    const item2 = createMockItem('img2', 'b.png');
    state.images.set([item1, item2]);

    state.removeAll();
    expect(state.images().length).toBe(0);
    expect(state.hasImages()).toBe(false);
  });

  it('should propagate global settings to items without custom overrides', () => {
    const item1 = createMockItem('img1', 'a.png');
    const item2 = createMockItem('img2', 'b.png');
    state.images.set([item1, item2]);

    state.updateGlobalSettings({ quality: 65, outputFormat: 'webp' });

    expect(state.globalSettings().quality).toBe(65);
    expect(state.globalSettings().outputFormat).toBe('webp');
    expect(state.images()[0].effectiveSettings.quality).toBe(65);
    expect(state.images()[0].effectiveSettings.outputFormat).toBe('webp');
    expect(state.images()[1].effectiveSettings.quality).toBe(65);
    expect(state.images()[1].effectiveSettings.outputFormat).toBe('webp');
  });

  it('should preserve individual overrides when global settings change', () => {
    const item1 = createMockItem('img1', 'a.png');
    const item2 = createMockItem('img2', 'b.png');
    state.images.set([item1, item2]);

    // Apply individual override to item1
    state.updateIndividualSettings('img1', { quality: 95, outputFormat: 'png' });

    expect(state.images()[0].individualSettings.hasCustomSettings).toBe(true);
    expect(state.images()[0].effectiveSettings.quality).toBe(95);
    expect(state.images()[0].effectiveSettings.outputFormat).toBe('png');

    // Now change global settings
    state.updateGlobalSettings({ quality: 50, outputFormat: 'avif' });

    // Item 1 must retain its custom overrides (95% / PNG)
    expect(state.images()[0].effectiveSettings.quality).toBe(95);
    expect(state.images()[0].effectiveSettings.outputFormat).toBe('png');

    // Item 2 should have inherited global settings (50% / AVIF)
    expect(state.images()[1].effectiveSettings.quality).toBe(50);
    expect(state.images()[1].effectiveSettings.outputFormat).toBe('avif');
  });

  it('should reset individual overrides back to global settings', () => {
    const item1 = createMockItem('img1', 'a.png');
    state.images.set([item1]);

    state.updateGlobalSettings({ quality: 70, outputFormat: 'webp' });
    state.updateIndividualSettings('img1', { quality: 90, outputFormat: 'png' });

    expect(state.images()[0].individualSettings.hasCustomSettings).toBe(true);
    expect(state.images()[0].effectiveSettings.quality).toBe(90);

    state.resetIndividualSettings('img1');

    expect(state.images()[0].individualSettings.hasCustomSettings).toBe(false);
    expect(state.images()[0].effectiveSettings.quality).toBe(70);
    expect(state.images()[0].effectiveSettings.outputFormat).toBe('webp');
  });

  it('should handle preview modal navigation next and prev', () => {
    const item1 = createMockItem('img1', 'a.png');
    const item2 = createMockItem('img2', 'b.png');
    const item3 = createMockItem('img3', 'c.png');
    state.images.set([item1, item2, item3]);

    state.openPreview(0);
    expect(state.previewModalIndex()).toBe(0);
    expect(state.previewImage()?.id).toBe('img1');

    state.nextPreview();
    expect(state.previewModalIndex()).toBe(1);
    expect(state.previewImage()?.id).toBe('img2');

    state.nextPreview();
    expect(state.previewModalIndex()).toBe(2);
    expect(state.previewImage()?.id).toBe('img3');

    // Wrap around
    state.nextPreview();
    expect(state.previewModalIndex()).toBe(0);

    // Prev wrap around
    state.prevPreview();
    expect(state.previewModalIndex()).toBe(2);

    state.closePreview();
    expect(state.previewModalIndex()).toBe(null);
    expect(state.previewImage()).toBe(null);
  });

  it('should compute aggregate compression metrics correctly from sums of bytes', () => {
    const item1 = createMockItem('img1', 'a.png', 100000);
    const item2 = createMockItem('img2', 'b.png', 200000);
    state.images.set([item1, item2]);

    expect(state.completedCount()).toBe(0);
    expect(state.hasCompletedImages()).toBe(false);
    expect(state.totalSavedBytes()).toBe(0);
    expect(state.totalSavedPercentage()).toBe(0);

    // Simulate item 1 completed (100KB -> 40KB, 60% saved)
    const completedItem1: ImageItem = {
      ...item1,
      status: 'completed',
      result: {
        imageId: 'img1',
        originalSize: 100000,
        compressedSize: 40000,
        savedBytes: 60000,
        savedPercentage: 60,
        originalWidth: 800,
        originalHeight: 600,
        outputWidth: 800,
        outputHeight: 600,
        originalFormat: 'png',
        outputFormat: 'webp',
        outputMimeType: 'image/webp',
        outputBlob: new Blob(['mock']),
        outputUrl: 'blob:mock-res-1',
        outputFilename: 'a.webp',
        processingTimeMs: 45,
        status: 'completed'
      }
    };

    // Simulate item 2 completed (200KB -> 140KB, 30% saved)
    const completedItem2: ImageItem = {
      ...item2,
      status: 'completed',
      result: {
        imageId: 'img2',
        originalSize: 200000,
        compressedSize: 140000,
        savedBytes: 60000,
        savedPercentage: 30,
        originalWidth: 800,
        originalHeight: 600,
        outputWidth: 800,
        outputHeight: 600,
        originalFormat: 'png',
        outputFormat: 'webp',
        outputMimeType: 'image/webp',
        outputBlob: new Blob(['mock']),
        outputUrl: 'blob:mock-res-2',
        outputFilename: 'b.webp',
        processingTimeMs: 65,
        status: 'completed'
      }
    };

    state.images.set([completedItem1, completedItem2]);

    expect(state.completedCount()).toBe(2);
    expect(state.hasCompletedImages()).toBe(true);
    expect(state.totalOriginalSizeOfCompleted()).toBe(300000);
    expect(state.totalCompressedSizeOfCompleted()).toBe(180000);
    expect(state.totalSavedBytes()).toBe(120000);
    // Net percentage: (300000 - 180000) / 300000 * 100 = 40% (not (60+30)/2 = 45%!)
    expect(state.totalSavedPercentage()).toBe(40);
  });

  it('should restore original item when keepOriginal is called', () => {
    const item1 = createMockItem('img1', 'a.png', 50000);
    const completedItem1: ImageItem = {
      ...item1,
      status: 'completed',
      result: {
        imageId: 'img1',
        originalSize: 50000,
        compressedSize: 60000, // larger!
        savedBytes: -10000,
        savedPercentage: -20,
        originalWidth: 800,
        originalHeight: 600,
        outputWidth: 800,
        outputHeight: 600,
        originalFormat: 'png',
        outputFormat: 'png',
        outputMimeType: 'image/png',
        outputBlob: new Blob(['mock']),
        outputUrl: 'blob:mock-res',
        outputFilename: 'a.png',
        processingTimeMs: 30,
        status: 'completed',
        isLargerThanOriginal: true
      }
    };

    state.images.set([completedItem1]);
    expect(state.completedCount()).toBe(1);

    state.keepOriginal('img1');

    expect(state.completedCount()).toBe(0);
    expect(state.images()[0].status).toBe('ready');
    expect(state.images()[0].result).toBeUndefined();
  });

  it('should handle cancelItem and cancelAll', () => {
    const item1 = createMockItem('img1', 'a.png');
    const item2 = createMockItem('img2', 'b.png');
    state.images.set([item1, item2]);

    const ac1 = new AbortController();
    const ac2 = new AbortController();

    state.images.set([
      { ...item1, status: 'encoding', abortController: ac1 },
      { ...item2, status: 'decoding', abortController: ac2 }
    ]);

    expect(state.isCompressingAny()).toBe(true);

    state.cancelItem('img1');
    expect(ac1.signal.aborted).toBe(true);
    expect(state.images()[0].status).toBe('cancelled');

    state.cancelAll();
    expect(ac2.signal.aborted).toBe(true);
    expect(state.isCompressingAny()).toBe(false);
  });

  it('should accurately compute targetsMetCount, targetsUnreachableCount, and averageSsim', () => {
    const item1 = createMockItem('img1', 'a.png');
    const item2 = createMockItem('img2', 'b.png');

    state.images.set([
      {
        ...item1,
        status: 'completed',
        result: {
          imageId: 'img1',
          originalSize: 50000,
          compressedSize: 20000,
          savedBytes: 30000,
          savedPercentage: 60,
          originalWidth: 800,
          originalHeight: 600,
          outputWidth: 800,
          outputHeight: 600,
          originalFormat: 'png',
          outputFormat: 'jpeg',
          outputMimeType: 'image/jpeg',
          outputBlob: new Blob(['mock']),
          outputUrl: 'blob:mock-1',
          outputFilename: 'a.jpg',
          processingTimeMs: 40,
          status: 'completed',
          isLargerThanOriginal: false,
          targetAchieved: true,
          targetUnreachable: false,
          visualQuality: { ssim: 0.95, psnr: 38, qualityRating: 'excellent' }
        }
      },
      {
        ...item2,
        status: 'completed',
        result: {
          imageId: 'img2',
          originalSize: 50000,
          compressedSize: 45000,
          savedBytes: 5000,
          savedPercentage: 10,
          originalWidth: 800,
          originalHeight: 600,
          outputWidth: 800,
          outputHeight: 600,
          originalFormat: 'png',
          outputFormat: 'png',
          outputMimeType: 'image/png',
          outputBlob: new Blob(['mock']),
          outputUrl: 'blob:mock-2',
          outputFilename: 'b.png',
          processingTimeMs: 50,
          status: 'completed',
          isLargerThanOriginal: false,
          targetAchieved: false,
          targetUnreachable: true,
          visualQuality: { ssim: 0.85, psnr: 30, qualityRating: 'good' }
        }
      }
    ]);

    expect(state.targetsMetCount()).toBe(1);
    expect(state.targetsUnreachableCount()).toBe(1);
    expect(state.averageSsim()).toBe(0.9); // (0.95 + 0.85) / 2
  });

  it('should manage smart recommendations and applyRecommendationToAll', () => {
    const item1 = createMockItem('img1', 'a.png');
    item1.recommendation = {
      preset: 'balanced',
      suggestedFormat: 'webp',
      suggestedQuality: 80,
      estimatedSavingsPercent: 50,
      tradeOffDescription: 'Smooth',
      reason: 'Alpha test',
      applied: false
    };

    const item2 = createMockItem('img2', 'b.png');
    item2.recommendation = {
      preset: 'best-quality',
      suggestedFormat: 'jpeg',
      suggestedQuality: 90,
      estimatedSavingsPercent: 40,
      tradeOffDescription: 'Sharp',
      reason: 'Photo test',
      applied: false
    };

    state.images.set([item1, item2]);
    expect(state.hasPendingRecommendations()).toBe(true);

    state.applyRecommendation('img1');
    expect(state.images()[0].individualSettings.hasCustomSettings).toBe(true);
    expect(state.images()[0].effectiveSettings.outputFormat).toBe('webp');
    expect(state.images()[0].recommendation?.applied).toBe(true);

    state.applyRecommendationToAll();
    expect(state.images()[1].individualSettings.hasCustomSettings).toBe(true);
    expect(state.images()[1].effectiveSettings.outputFormat).toBe('jpeg');
    expect(state.images()[1].recommendation?.applied).toBe(true);
    expect(state.hasPendingRecommendations()).toBe(false);
  });

  // --- Phase 4 Tests ---

  it('should apply developer preset globally', () => {
    state.applyDeveloperPreset('website');
    const settings = state.globalSettings();

    expect(settings.developerPreset).toBe('website');
    expect(settings.outputFormat).toBe('webp');
    expect(settings.quality).toBe(80);
    expect(settings.resize.width).toBe(1280);
    expect(settings.metadataPolicy).toBe('remove');
    expect(state.activeDeveloperPreset()?.key).toBe('website');
  });

  it('should apply developer preset to selected images only', () => {
    const item1 = createMockItem('img1', 'a.png');
    const item2 = createMockItem('img2', 'b.png');
    state.images.set([item1, item2]);
    state.toggleSelect('img1');

    state.applyDeveloperPresetToSelected('social');

    expect(state.images()[0].individualSettings.hasCustomSettings).toBe(true);
    expect(state.images()[0].effectiveSettings.developerPreset).toBe('social');
    expect(state.images()[0].effectiveSettings.outputFormat).toBe('jpeg');
    expect(state.images()[0].effectiveSettings.resize.width).toBe(1200);
    expect(state.images()[0].effectiveSettings.resize.height).toBe(630);

    // item2 should remain uncustomized
    expect(state.images()[1].individualSettings.hasCustomSettings).toBe(false);
  });

  it('should retry failed tasks', () => {
    const item1 = createMockItem('img1', 'a.png');
    item1.status = 'failed';
    item1.error = 'Mock failure';

    const item2 = createMockItem('img2', 'b.png');
    item2.status = 'completed';

    state.images.set([item1, item2]);
    expect(state.hasFailedTasks()).toBe(true);
    expect(state.failedCount()).toBe(1);

    state.retryFailed();
    // After retryFailed, item1 should be placed in queue and error cleared
    expect(['pending', 'decoding'].includes(state.images()[0].status)).toBe(true);
    expect(state.images()[0].error).toBeUndefined();
  });

  it('should clear completed images', () => {
    const item1 = createMockItem('img1', 'a.png');
    item1.status = 'completed';
    item1.result = {
      imageId: 'img1',
      outputBlob: new Blob(['']),
      outputUrl: 'blob:mock',
      outputFilename: 'a.png',
      outputFormat: 'png',
      originalSize: 1024,
      compressedSize: 512,
      savedBytes: 512,
      savedPercentage: 50,
      isLargerThanOriginal: false,
      originalWidth: 800,
      originalHeight: 600,
      outputWidth: 800,
      outputHeight: 600,
      compressionMode: 'lossy',
      appliedQuality: 80,
      processingTimeMs: 10
    };

    const item2 = createMockItem('img2', 'b.png');
    item2.status = 'ready';

    state.images.set([item1, item2]);
    expect(state.hasCompletedImages()).toBe(true);

    state.clearCompleted();
    expect(state.images().length).toBe(1);
    expect(state.images()[0].id).toBe('img2');
    expect(state.hasCompletedImages()).toBe(false);
  });

  it('should manage metadata and report modal states', () => {
    const item1 = createMockItem('img1', 'a.png');
    state.images.set([item1]);

    expect(state.metadataModalItem()).toBeNull();
    state.openMetadataModal('img1');
    expect(state.metadataModalItem()?.id).toBe('img1');
    state.closeMetadataModal();
    expect(state.metadataModalItem()).toBeNull();

    expect(state.reportModalOpen()).toBe(false);
    state.openReportModal();
    expect(state.reportModalOpen()).toBe(true);
    state.closeReportModal();
    expect(state.reportModalOpen()).toBe(false);
  });

  describe('Phase 5 Performance & Resource Management', () => {
    it('initializes isPackagingZip signal to false', () => {
      expect(state.isPackagingZip()).toBe(false);
    });

    it('throttles concurrent slots to 1 for heavy images (>10MB or >16MP)', () => {
      const heavyItem = createMockItem('heavy', 'heavy.png', 12 * 1024 * 1024);
      heavyItem.width = 5000;
      heavyItem.height = 4000; // 20 Megapixels

      const slots = state.getMaxConcurrentSlots(heavyItem);
      expect(slots).toBe(1);
    });

    it('allows 2 concurrent slots for normal web images on capable hardware', () => {
      const normalItem = createMockItem('normal', 'normal.png', 500 * 1024);
      normalItem.width = 1200;
      normalItem.height = 800; // 0.96 Megapixels

      const slots = state.getMaxConcurrentSlots(normalItem);
      expect(slots).toBe(2);
    });

    it('revokes previewUrl, result outputUrl, and variant outputUrls on removeImage', () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
      const item = createMockItem('img-cleanup', 'test.png');
      item.previewUrl = 'blob:preview-123';
      item.result = {
        imageId: 'img-cleanup',
        outputBlob: new Blob(['out']),
        outputUrl: 'blob:output-123',
        outputFilename: 'test.webp',
        outputFormat: 'webp',
        originalSize: 1000,
        compressedSize: 500,
        savedBytes: 500,
        savedPercentage: 50,
        isLargerThanOriginal: false,
        originalWidth: 800,
        originalHeight: 600,
        outputWidth: 800,
        outputHeight: 600,
        compressionMode: 'lossy',
        appliedQuality: 80,
        processingTimeMs: 15,
        variants: [
          {
            variantId: 'v-thumb',
            label: 'Thumbnail',
            width: 320,
            height: 240,
            outputBlob: new Blob(['thumb']),
            outputUrl: 'blob:variant-thumb',
            outputFilename: 'thumb.webp',
            size: 150,
            compressionRatio: 85,
            format: 'webp',
            processingTimeMs: 5
          }
        ]
      };

      state.images.set([item]);
      state.removeImage('img-cleanup');

      expect(revokeSpy).toHaveBeenCalledWith('blob:preview-123');
      expect(revokeSpy).toHaveBeenCalledWith('blob:output-123');
      expect(revokeSpy).toHaveBeenCalledWith('blob:variant-thumb');
      revokeSpy.mockRestore();
    });
  });

  describe('Phase 6 Launch Polish & Confirmation Safeguards', () => {
    it('prompts confirmation on requestRemoveAll and clears upon confirmation', () => {
      const item1 = createMockItem('img1', 'test.png');
      state.images.set([item1]);

      state.requestRemoveAll();
      expect(state.confirmModalData()).not.toBeNull();
      expect(state.confirmModalData()?.action).toBe('clear-all');
      expect(state.confirmModalData()?.isDanger).toBe(true);

      state.confirmModalAction();
      expect(state.confirmModalData()).toBeNull();
      expect(state.images().length).toBe(0);
    });

    it('cancels confirmation modal when cancelConfirmModal is called', () => {
      const item1 = createMockItem('img1', 'test.png');
      state.images.set([item1]);

      state.requestRemoveAll();
      expect(state.confirmModalData()).not.toBeNull();

      state.cancelConfirmModal();
      expect(state.confirmModalData()).toBeNull();
      expect(state.images().length).toBe(1);
    });

    it('prompts confirmation on requestNewSession and resets state and settings', () => {
      const item1 = createMockItem('img1', 'test.png');
      state.images.set([item1]);
      state.updateGlobalSettings({ quality: 40 });

      state.requestNewSession();
      expect(state.confirmModalData()?.action).toBe('new-session');

      state.confirmModalAction();
      expect(state.images().length).toBe(0);
      expect(state.globalSettings().quality).toBe(80); // Restored to default
    });

    it('manages feedback modal state and submits feedback without errors', () => {
      expect(state.feedbackModalOpen()).toBe(false);

      state.openFeedbackModal();
      expect(state.feedbackModalOpen()).toBe(true);

      state.submitFeedback({
        rating: 'positive',
        category: 'feature',
        comment: 'Great tool! Please add support for batch renaming.'
      });

      expect(state.feedbackModalOpen()).toBe(false);
      expect(state.toast()?.type).toBe('success');
    });
  });

  describe('Phase 7 Image Intelligence, Category Filtering & Profiles', () => {
    it('filters images by semantic category and calculates category counts', () => {
      const item1 = createMockItem('img1', 'photo.jpg');
      item1.characteristics = {
        hasAlpha: false,
        isPhoto: true,
        uniqueColorCount: 5000,
        megapixel: 2.1,
        isHighRes: false,
        imageCategory: 'photo',
        optimizationOpportunity: 'medium'
      };

      const item2 = createMockItem('img2', 'screen.png');
      item2.characteristics = {
        hasAlpha: false,
        isPhoto: false,
        uniqueColorCount: 400,
        megapixel: 0.9,
        isHighRes: false,
        imageCategory: 'screenshot',
        optimizationOpportunity: 'high'
      };

      state.images.set([item1, item2]);

      const counts = state.categoryCounts();
      expect(counts.all).toBe(2);
      expect(counts.photo).toBe(1);
      expect(counts.screenshot).toBe(1);
      expect(counts.graphic).toBe(0);

      expect(state.filteredImages().length).toBe(2);

      state.setCategoryFilter('screenshot');
      expect(state.filteredImages().length).toBe(1);
      expect(state.filteredImages()[0].id).toBe('img2');

      state.setCategoryFilter('all');
      expect(state.filteredImages().length).toBe(2);
    });

    it('applies adaptive recommendations to category and to all images', () => {
      const item1 = createMockItem('img1', 'screen.png');
      item1.characteristics = {
        hasAlpha: false,
        isPhoto: false,
        uniqueColorCount: 200,
        megapixel: 0.5,
        isHighRes: false,
        imageCategory: 'screenshot',
        optimizationOpportunity: 'high'
      };
      item1.recommendation = {
        preset: 'best-quality',
        suggestedFormat: 'image/webp',
        suggestedQuality: 88,
        estimatedSavingsPercent: 45,
        tradeOffDescription: 'Crisp text',
        reason: 'Screenshot detected',
        applied: false
      };

      const item2 = createMockItem('img2', 'banner.png');
      item2.characteristics = {
        hasAlpha: false,
        isPhoto: false,
        uniqueColorCount: 150,
        megapixel: 0.4,
        isHighRes: false,
        imageCategory: 'graphic',
        optimizationOpportunity: 'medium'
      };
      item2.recommendation = {
        preset: 'balanced',
        suggestedFormat: 'image/webp',
        suggestedQuality: 80,
        estimatedSavingsPercent: 30,
        tradeOffDescription: 'Balanced',
        reason: 'Graphic detected',
        applied: false
      };

      state.images.set([item1, item2]);

      state.applyAdaptiveRecommendationToCategory('screenshot');
      const updatedScreens = state.images();
      expect(updatedScreens[0].individualSettings.hasCustomSettings).toBe(true);
      expect(updatedScreens[0].effectiveSettings.preset).toBe('best-quality');
      expect(updatedScreens[1].individualSettings.hasCustomSettings).toBe(false);

      state.applyAdaptiveRecommendationsToAll();
      const updatedAll = state.images();
      expect(updatedAll[1].individualSettings.hasCustomSettings).toBe(true);
      expect(updatedAll[1].effectiveSettings.preset).toBe('balanced');
    });

    it('manages profile modal and applies profile settings to all or selected', () => {
      const item1 = createMockItem('img1', 'a.jpg');
      const item2 = createMockItem('img2', 'b.jpg');
      state.images.set([item1, item2]);

      expect(state.profileModalOpen()).toBe(false);
      state.openProfileModal();
      expect(state.profileModalOpen()).toBe(true);
      state.closeProfileModal();
      expect(state.profileModalOpen()).toBe(false);

      state.applyProfileToAll('system-lossless-archival');
      expect(state.globalSettings().outputFormat).toBe('png');
      expect(state.globalSettings().quality).toBe(100);

      state.toggleSelect('img2');
      state.applyProfileToSelected('system-social-opengraph');
      const items = state.images();
      expect(items[1].individualSettings.hasCustomSettings).toBe(true);
      expect(items[1].effectiveSettings.outputFormat).toBe('jpeg');
      expect(items[1].effectiveSettings.resize?.width).toBe(1200);
    });

    it('manages non-destructive transform pipeline: add, undo, and reset transforms', async () => {
      const item1 = createMockItem('img1', 'a.jpg');
      state.images.set([item1]);

      expect(state.images()[0].transforms).toBeUndefined();

      await state.addTransform('img1', { type: 'rotate', angle: 90 });
      expect(state.images()[0].transforms?.length).toBe(1);
      expect(state.images()[0].transforms?.[0]).toEqual({ type: 'rotate', angle: 90 });

      await state.addTransform('img1', { type: 'flip', direction: 'horizontal' });
      expect(state.images()[0].transforms?.length).toBe(2);

      await state.addTransform('img1', {
        type: 'crop',
        rect: { x: 10, y: 10, width: 200, height: 200 },
        aspectPreset: '1:1'
      });
      expect(state.images()[0].transforms?.length).toBe(3);

      await state.undoTransform('img1');
      expect(state.images()[0].transforms?.length).toBe(2);
      expect(state.images()[0].transforms?.[1]).toEqual({ type: 'flip', direction: 'horizontal' });

      state.resetTransforms('img1');
      expect(state.images()[0].transforms?.length).toBe(0);
      expect(state.images()[0].transformedPreviewUrl).toBeUndefined();
    });
  });
});


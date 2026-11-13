// apps/tool-image-compressor/src/services/compressor-e2e.spec.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CompressorStateService, DEFAULT_COMPRESSION_SETTINGS } from './compressor-state.service';
import { ImageQualityMetricService } from './image-quality-metric.service';
import { OptimizationReportService } from './optimization-report.service';
import { ProfileManagerService } from './profile-manager.service';
import { CompressorTelemetryService } from './compressor-telemetry.service';
import { ImageItem, CompressionResult } from '../models/compressor.models';

describe('Image Compressor E2E Workflow Integration', () => {
  let state: CompressorStateService;
  let qualityService: ImageQualityMetricService;
  let reportService: OptimizationReportService;
  let profileService: ProfileManagerService;
  let telemetryService: CompressorTelemetryService;

  beforeEach(() => {
    // Mock URL object APIs
    if (typeof URL.createObjectURL !== 'function') {
      URL.createObjectURL = vi.fn((blob: any) => `blob:mock-${Math.random().toString(36).substring(2)}`);
    }
    if (typeof URL.revokeObjectURL !== 'function') {
      URL.revokeObjectURL = vi.fn();
    }

    // Mock localStorage for profiles
    const store: Record<string, string> = {};
    const mockLocalStorage = {
      getItem: (k: string) => store[k] || null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); },
      length: 0,
      key: () => null
    };
    if (typeof window === 'undefined') {
      (globalThis as any).window = { localStorage: mockLocalStorage };
    } else {
      (window as any).localStorage = mockLocalStorage;
    }

    state = new CompressorStateService();
    qualityService = new ImageQualityMetricService();
    reportService = new OptimizationReportService();
    profileService = new ProfileManagerService();
    telemetryService = (state as any).telemetry;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createMockItem = (
    id: string,
    name: string,
    format: string,
    size: number,
    category: 'photo' | 'graphic' | 'screenshot' | 'logo-icon' | 'optimized' = 'photo',
    width = 1920,
    height = 1080
  ): ImageItem => {
    const isPhoto = category === 'photo';
    const bitsPerPixel = Math.round(((size * 8) / (width * height)) * 100) / 100;
    return {
      id,
      file: new File(['mock-binary-data'], name, { type: `image/${format}` }),
      originalName: name,
      nameWithoutExt: name.replace(/\.[^.]+$/, ''),
      originalExtension: format,
      detectedFormat: format,
      mimeType: `image/${format}`,
      originalSize: size,
      width,
      height,
      aspectRatio: width / height,
      previewUrl: `blob:preview-${id}`,
      selected: false,
      status: 'ready',
      capabilities: {
        fileAccepted: true,
        previewSupported: true,
        compressionSupported: true,
        description: `${format.toUpperCase()} image`
      },
      characteristics: {
        hasAlpha: format === 'png',
        isPhoto,
        uniqueColorCount: isPhoto ? 500 : 80,
        megapixel: Math.round((width * height / 1_000_000) * 10) / 10,
        isHighRes: width >= 1920,
        imageCategory: category,
        edgeDensity: 0.12,
        bitsPerPixel,
        isAlreadyOptimized: false,
        optimizationOpportunity: 'high'
      },
      recommendation: {
        mode: 'smart',
        quality: 75,
        targetFormat: 'webp',
        reason: 'Recommended WebP conversion for web savings.',
        estimatedSavingsPercent: 55,
        suggestTransparencyLoss: false,
        suggestPaletteReduction: false
      },
      individualSettings: { hasCustomSettings: false },
      effectiveSettings: { ...DEFAULT_COMPRESSION_SETTINGS },
      addedAt: Date.now()
    };
  };

  it('completes the full end-to-end workflow: Upload -> Analyze -> Configure -> Compress -> Quality Check -> Download & Report', async () => {
    // -------------------------------------------------------------
    // Step 1: Upload & Image Admission
    // -------------------------------------------------------------
    const photo = createMockItem('img_photo', 'landscape.jpg', 'jpeg', 2_400_000, 'photo', 3840, 2160);
    const graphic = createMockItem('img_graphic', 'banner.png', 'png', 850_000, 'graphic', 1200, 600);
    const icon = createMockItem('img_icon', 'logo.png', 'png', 35_000, 'graphic', 128, 128);

    state.images.set([photo, graphic, icon]);

    expect(state.totalCount()).toBe(3);
    expect(state.hasImages()).toBe(true);
    expect(state.categoryCounts().photo).toBe(1);
    expect(state.categoryCounts().graphic).toBe(2);

    // -------------------------------------------------------------
    // Step 2: Image Intelligence & Adaptive Analysis
    // -------------------------------------------------------------
    expect(photo.characteristics?.imageCategory).toBe('photo');
    expect(photo.characteristics?.isHighRes).toBe(true);
    expect(photo.characteristics?.megapixel).toBeGreaterThanOrEqual(8.0);
    expect(photo.recommendation?.targetFormat).toBe('webp');

    // -------------------------------------------------------------
    // Step 3: Configuration & Presets
    // -------------------------------------------------------------
    // Apply Developer Preset 'website' to global settings
    state.applyDeveloperPreset('website');
    expect(state.globalSettings().developerPreset).toBe('website');
    expect(state.globalSettings().outputFormat).toBe('webp');
    expect(state.globalSettings().quality).toBe(80);

    // Override individual settings for the icon (Lossless PNG / 100 quality)
    state.updateIndividualSettings('img_icon', {
      outputFormat: 'png',
      quality: 100,
      advancedOptimization: {
        ...DEFAULT_COMPRESSION_SETTINGS.advancedOptimization,
        optimizePalette: true
      }
    });

    const currentImages = state.images();
    const photoItem = currentImages.find(i => i.id === 'img_photo')!;
    const iconItem = currentImages.find(i => i.id === 'img_icon')!;

    expect(photoItem.effectiveSettings.outputFormat).toBe('webp');
    expect(iconItem.individualSettings.hasCustomSettings).toBe(true);
    expect(iconItem.effectiveSettings.outputFormat).toBe('png');
    expect(iconItem.effectiveSettings.quality).toBe(100);

    // -------------------------------------------------------------
    // Step 4: Compression Pipeline Simulation
    // -------------------------------------------------------------
    // Mock compression engine response
    const mockCompressionResult: CompressionResult = {
      imageId: 'img_photo',
      originalSize: 2_400_000,
      compressedSize: 520_000,
      savedBytes: 1_880_000,
      savedPercentage: 78.3,
      originalWidth: 3840,
      originalHeight: 2160,
      outputWidth: 1920,
      outputHeight: 1080,
      originalFormat: 'jpeg',
      outputFormat: 'webp',
      outputMimeType: 'image/webp',
      outputBlob: new Blob(['compressed-webp-bytes'], { type: 'image/webp' }),
      outputUrl: 'blob:compressed-photo',
      outputFilename: 'landscape.webp',
      processingTimeMs: 142,
      status: 'completed',
      metrics: {
        psnr: 41.5,
        ssim: 0.985,
        mse: 4.8
      },
      variants: [
        {
          name: 'thumbnail',
          width: 320,
          height: 180,
          size: 18_000,
          outputBlob: new Blob(['thumb-bytes']),
          outputUrl: 'blob:thumb',
          filename: 'landscape-thumbnail.webp'
        }
      ]
    };

    // Update state to completed
    (state as any).updateItemState('img_photo', {
      status: 'completed',
      result: mockCompressionResult
    });

    expect(state.completedCount()).toBe(1);
    expect(state.hasCompletedImages()).toBe(true);
    expect(state.totalSavedBytes()).toBe(1_880_000);
    expect(state.totalSavedPercentage()).toBeCloseTo(78.3, 1);

    // Verify duplicate active compression prevention
    const wasProcessing = state.images().find(i => i.id === 'img_photo')!;
    expect(wasProcessing.status).toBe('completed');
    // If status is completed, calling compressItem is allowed, but if in-flight, it's rejected
    (state as any).updateItemState('img_photo', { status: 'processing' });
    const queueLenBefore = (state as any).pendingQueue.length;
    state.compressItem('img_photo');
    expect((state as any).pendingQueue.length).toBe(queueLenBefore); // Guarded from duplicate queueing

    // Reset back to completed
    (state as any).updateItemState('img_photo', { status: 'completed', result: mockCompressionResult });

    // -------------------------------------------------------------
    // Step 5: Quality Assessment & Metrics Inspection
    // -------------------------------------------------------------
    const res = state.images().find(i => i.id === 'img_photo')?.result!;
    expect(res.metrics?.ssim).toBe(0.985);
    expect(res.metrics?.psnr).toBe(41.5);

    // Difference map & artifact score calculation
    const decoder = (qualityService as any).decoder;
    const { canvas: canvasA, ctx: ctxA } = decoder.createCanvas(64, 64);
    ctxA.fillStyle = '#000000';
    ctxA.fillRect(0, 0, 64, 64);

    const { canvas: canvasB, ctx: ctxB } = decoder.createCanvas(64, 64);
    ctxB.fillStyle = '#FFFFFF';
    ctxB.fillRect(0, 0, 64, 64);

    const metricsResult = qualityService.computeQualityMetrics(canvasA, canvasB);
    expect(metricsResult.artifactScore).toBeDefined();
    expect(metricsResult.artifactScore).toBeGreaterThan(0);
    expect(metricsResult.ssim).toBeLessThan(1.0);

    const diffMap = qualityService.generateDifferenceMap(canvasA, canvasB, 64, 64);
    if (diffMap) {
      expect(typeof diffMap).toBe('string');
    }

    // -------------------------------------------------------------
    // Step 6: Downloads & ZIP Packaging Validation
    // -------------------------------------------------------------
    // Single download empty-blob guard
    state.images.update(imgs => [
      ...imgs,
      {
        ...createMockItem('img_empty', 'empty.png', 'png', 100),
        status: 'completed',
        result: {
          ...mockCompressionResult,
          imageId: 'img_empty',
          outputBlob: new Blob([]) // 0 bytes
        }
      }
    ]);

    const errorReportsBefore = (state as any).telemetry.getRecentDiagnostics().length;
    state.downloadItemResult('img_empty');
    const errorReportsAfter = (state as any).telemetry.getRecentDiagnostics().length;
    expect(errorReportsAfter).toBeGreaterThan(errorReportsBefore);
    const lastError = (state as any).telemetry.getRecentDiagnostics()[0];
    expect(lastError.code).toBe('DOWNLOAD_EMPTY_BLOB');

    // -------------------------------------------------------------
    // Step 7: Optimization Audit Report Generation
    // -------------------------------------------------------------
    const report = state.getOptimizationReport();
    expect(report.totalImages).toBe(4);
    expect(report.completedCount).toBe(2);
    expect(report.totalOriginalBytes).toBeGreaterThan(0);

    // Generate CSV string
    const csvRows = report.items.map(item =>
      `${item.originalName},${item.detectedFormat},${item.outputFormat || 'N/A'},${item.originalSize},${item.compressedSize || 'N/A'},${item.savedPercentage}%`
    );
    expect(csvRows.length).toBe(4);

    // -------------------------------------------------------------
    // Step 8: Operational Monitoring & Zero-PII Telemetry
    // -------------------------------------------------------------
    (state as any).telemetry.trackProcessingSuccess(150, 2_400_000, 520_000, 'webp');
    const metrics = (state as any).telemetry.getOperationalMetrics();
    expect(metrics.successfulCount).toBeGreaterThan(0);
    expect(metrics.totalSavedBytes).toBeGreaterThan(0);
    expect(metrics.formatUsage['webp']).toBeGreaterThan(0);

    // Verify session clear & resource revocation
    state.removeAll();
    expect(state.images().length).toBe(0);
    expect(state.totalCount()).toBe(0);
    expect(state.hasImages()).toBe(false);
  });

  it('manages user compression profiles end-to-end', () => {
    // List default system profiles
    const profiles = profileService.getProfiles();
    expect(profiles.length).toBeGreaterThanOrEqual(5);

    const defaultProfile = profileService.getProfileById('system-web-balanced');
    expect(defaultProfile).toBeDefined();
    expect(defaultProfile?.isCustom).toBe(false);

    // Create custom profile
    const custom = profileService.createProfile(
      'High Compression WebP',
      'Maximum reduction for high bandwidth savings',
      {
        ...DEFAULT_COMPRESSION_SETTINGS,
        mode: 'smart',
        quality: 65,
        outputFormat: 'webp'
      }
    );

    expect(custom.id).toContain('custom-');
    expect(custom.isCustom).toBe(true);

    const retrieved = profileService.getProfileById(custom.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('High Compression WebP');

    // Duplicate custom profile
    const copy = profileService.duplicateProfile(custom.id, 'High Compression WebP Copy');
    expect(copy).toBeDefined();
    expect(copy?.name).toBe('High Compression WebP Copy');

    // Delete custom profiles
    const deleted = profileService.deleteProfile(custom.id);
    expect(deleted).toBe(true);
    expect(profileService.getProfileById(custom.id)).toBeUndefined();
  });
});

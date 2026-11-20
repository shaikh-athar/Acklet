// apps/tool-image-compressor/src/services/network-isolation.spec.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ImageCompressionService } from './image-compression.service';
import { ImageItem } from '../models/compressor.models';
import { DEFAULT_COMPRESSION_SETTINGS } from './compressor-state.service';

describe('Feature 6: Network Isolation Verification (Local-Only Processing)', () => {
  let fetchSpy: any;
  let xhrOpenSpy: any;
  let xhrSendSpy: any;
  let sendBeaconSpy: any;

  beforeEach(() => {
    // Intercept all network egress channels
    fetchSpy = vi.fn().mockResolvedValue(new Response('{}'));
    (globalThis as any).fetch = fetchSpy;

    xhrOpenSpy = vi.fn();
    xhrSendSpy = vi.fn();
    if (typeof XMLHttpRequest !== 'undefined') {
      XMLHttpRequest.prototype.open = xhrOpenSpy;
      XMLHttpRequest.prototype.send = xhrSendSpy;
    }

    sendBeaconSpy = vi.fn().mockReturnValue(true);
    if (typeof navigator !== 'undefined') {
      (navigator as any).sendBeacon = sendBeaconSpy;
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('guarantees zero network calls and zero image data egress during local compression', async () => {
    // Construct mock mock image item
    const mockFile = new File(['mock-image-binary-bytes-data-png'], 'test-photo.png', {
      type: 'image/png'
    });

    const mockItem: ImageItem = {
      id: 'local-test-item',
      file: mockFile,
      originalName: 'test-photo.png',
      originalSize: 10240,
      originalFormat: 'png',
      detectedFormat: 'png',
      originalExtension: 'png',
      width: 400,
      height: 300,
      previewUrl: 'blob:test-preview',
      status: 'ready',
      capabilities: {
        previewSupported: true,
        directEncodeSupported: true,
        transcodeRequired: false,
        losslessSupported: true,
        animationSupported: false,
        alphaSupported: true
      },
      settings: {
        outputFormat: 'original',
        quality: { mode: 'manual', manualQuality: 80 },
        targetSize: { enabled: false, targetBytes: 5000 },
        resize: { enabled: false, mode: 'percentage', percentage: 100 },
        transforms: { rotate: 0, flipH: false, flipV: false },
        stripMetadata: true
      },
      effectiveSettings: {
        ...DEFAULT_COMPRESSION_SETTINGS,
        outputFormat: 'original'
      },
      individualSettings: {
        hasCustomSettings: false
      }
    };

    // Instantiate mock service dependencies
    const mockDecoder: any = {
      decodeFile: vi.fn().mockResolvedValue({
        canvas: {} as HTMLCanvasElement,
        ctx: {} as CanvasRenderingContext2D,
        width: 400,
        height: 300,
        megapixels: 0.12,
        hasAlpha: false,
        isAnimation: false,
        isVector: false,
        colorSpace: 'srgb',
        objectUrlToRevoke: null
      })
    };

    const mockEncoder: any = {
      encode: vi.fn().mockResolvedValue({
        blob: new Blob(['compressed-output-bytes'], { type: 'image/png' })
      }),
      encodeCanvasToBlob: vi.fn().mockResolvedValue({
        blob: new Blob(['compressed-output-bytes'], { type: 'image/png' }),
        format: 'png',
        qualityUsed: 80,
        durationMs: 15
      })
    };

    const mockCapability: any = {
      getCapabilities: vi.fn().mockReturnValue({
        previewSupported: true,
        directEncodeSupported: true,
        transcodeRequired: false,
        losslessSupported: true,
        animationSupported: false,
        alphaSupported: true
      }),
      canEncodeDirectly: vi.fn().mockReturnValue(true),
      resolveOutputTarget: vi.fn().mockReturnValue({
        mimeType: 'image/png',
        extension: 'png',
        resolvedFormat: 'png',
        isLossless: true,
        transparencyWarning: false
      })
    };

    const mockSmartAnalysis: any = {
      applySmartPreset: vi.fn().mockImplementation((_preset, settings) => settings),
      analyzeImage: vi.fn().mockReturnValue({
        visualCategory: 'graphic',
        recommendedPreset: 'lossless-clean',
        recommendedFormat: 'png',
        reason: 'Local graphic',
        confidenceScore: 0.9,
        entropy: 3.5,
        contrast: 0.8,
        dynamicRange: 200,
        alphaPresent: false,
        dominantColors: []
      })
    };

    const mockTargetOptimizer: any = {
      optimizeForTargetSize: vi.fn()
    };

    const mockQualityMetric: any = {
      calculateMetrics: vi.fn().mockResolvedValue({
        ssim: 0.98,
        psnr: 41.2
      })
    };

    const mockMetadata: any = {
      inspectFileMetadata: vi.fn().mockResolvedValue({
        hasMetadata: false,
        entries: [],
        rawSegmentsCount: 0
      }),
      processOutputMetadata: vi.fn().mockImplementation((blob) => Promise.resolve({
        blob,
        strippedCount: 0,
        preservedCount: 0
      })),
      processOutputMetadataPolicy: vi.fn().mockImplementation((blob) => Promise.resolve({
        blob,
        strippedCount: 0,
        preservedCount: 0
      })),
      extractExifMetadata: vi.fn().mockResolvedValue({
        hasMetadata: false,
        entries: [],
        rawSegmentsCount: 0
      })
    };

    const mockTransform: any = {
      applyTransforms: vi.fn().mockImplementation((canvas) => canvas)
    };

    const mockResize: any = {
      calculateDimensions: vi.fn().mockReturnValue({
        targetWidth: 400,
        targetHeight: 300,
        ratio: 1,
        requiresResize: false
      }),
      resizeCanvas: vi.fn().mockImplementation((canvas) => canvas)
    };

    const service = new ImageCompressionService(
      mockDecoder,
      mockResize,
      mockEncoder,
      mockCapability,
      mockSmartAnalysis,
      mockTargetOptimizer,
      mockQualityMetric,
      mockMetadata,
      mockTransform
    );

    // Run local image compression
    const result = await service.compressImage(mockItem);

    // Verify result was produced locally
    expect(result).toBeDefined();
    expect(result.outputBlob).toBeDefined();
    expect(result.compressedSize).toBeGreaterThan(0);

    // Assert strictly zero network calls were attempted
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrOpenSpy).not.toHaveBeenCalled();
    expect(xhrSendSpy).not.toHaveBeenCalled();
    expect(sendBeaconSpy).not.toHaveBeenCalled();
  });
});

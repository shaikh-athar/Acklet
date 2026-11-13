// apps/tool-watermark-remover/src/services/batch-processor.service.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { BatchProcessorService } from './batch-processor.service';
import { ImageValidationService } from './image-validation.service';
import { WatermarkDetectorService } from './watermark-detector.service';
import { InpaintingEngineService } from './inpainting-engine.service';
import { QualityEvaluatorService } from './quality-evaluator.service';
import { BatchItem, WatermarkRegion } from '../models/watermark.models';

describe('BatchProcessorService', () => {
  const envInjector = createEnvironmentInjector([
    ImageValidationService,
    WatermarkDetectorService,
    InpaintingEngineService,
    QualityEvaluatorService,
    BatchProcessorService
  ]);

  let service: BatchProcessorService;
  let mockValidator: any;
  let mockDetector: any;
  let mockInpainter: any;
  let mockEvaluator: any;

  beforeEach(() => {
    mockValidator = {
      validateFile: vi.fn((file: File) => {
        if (file.name.endsWith('.pdf')) {
          return { valid: false, error: 'Unsupported format' };
        }
        return { valid: true };
      })
    };

    mockDetector = {
      detectWatermarks: vi.fn(() => ({
        regions: [
          {
            id: 'wm-1',
            name: 'Detected Watermark',
            type: 'text',
            confidence: 88,
            bounds: { x: 10, y: 10, width: 80, height: 40 },
            coveragePercent: 5
          }
        ],
        maskData: { data: new Uint8ClampedArray(800 * 600 * 4), width: 800, height: 600 }
      }))
    };

    mockInpainter = {
      inpaint: vi.fn(async (_img: any, _mask: any, opts?: any) => {
        if (opts?.onProgress) {
          opts.onProgress({ progress: 100, phase: 'blending', message: 'Done' });
        }
        return {
          outputImageData: { data: new Uint8ClampedArray(800 * 600 * 4), width: 800, height: 600 },
          metrics: {
            overallScore: 92,
            boundaryContinuity: 95,
            colorInconsistencyDelta: 1.8,
            residualEdgeRatio: 0.04,
            rating: 'excellent',
            processingTimeMs: 120
          },
          processingTimeMs: 120
        };
      })
    };

    mockEvaluator = {
      evaluateQuality: vi.fn(() => ({
        overallScore: 92,
        boundaryContinuity: 95,
        colorInconsistencyDelta: 1.8,
        residualEdgeRatio: 0.04,
        rating: 'excellent',
        processingTimeMs: 120
      }))
    };

    service = runInInjectionContext(envInjector, () => new BatchProcessorService());
    (service as any).validator = mockValidator;
    (service as any).detector = mockDetector;
    (service as any).inpainter = mockInpainter;
    (service as any).evaluator = mockEvaluator;
  });

  afterEach(() => {
    service.clearQueue();
  });

  it('should initialize with default empty queue and config', () => {
    expect(service.items().length).toBe(0);
    expect(service.totalCount()).toBe(0);
    expect(service.config().autoDetect).toBe(true);
    expect(service.config().inpaintingMode).toBe('balanced');
  });

  it('should add valid items and compute total count and sizes', () => {
    const item1: BatchItem = {
      id: 'item-1',
      name: 'photo1.png',
      sizeBytes: 1024 * 500,
      mimeType: 'image/png',
      width: 800,
      height: 600,
      thumbnailUrl: 'data:image/png;base64,thumb1',
      originalDataUrl: 'data:image/png;base64,orig1',
      status: 'pending',
      progress: 0,
      regions: [],
      selectedForExport: true
    };

    const item2: BatchItem = {
      id: 'item-2',
      name: 'photo2.jpg',
      sizeBytes: 1024 * 700,
      mimeType: 'image/jpeg',
      width: 1200,
      height: 800,
      thumbnailUrl: 'data:image/jpeg;base64,thumb2',
      originalDataUrl: 'data:image/jpeg;base64,orig2',
      status: 'pending',
      progress: 0,
      regions: [],
      selectedForExport: true
    };

    service.addItem(item1);
    service.addItem(item2);

    expect(service.totalCount()).toBe(2);
    expect(service.totalSizeBytes()).toBe(1024 * 1200);
    expect(service.pendingCount()).toBe(2);
    expect(service.completedCount()).toBe(0);
  });

  it('should remove items from queue and update computed statistics', () => {
    const item1: BatchItem = {
      id: 'item-1',
      name: 'photo1.png',
      sizeBytes: 500,
      mimeType: 'image/png',
      width: 800,
      height: 600,
      thumbnailUrl: '',
      originalDataUrl: '',
      status: 'pending',
      progress: 0,
      regions: [],
      selectedForExport: true
    };
    service.addItem(item1);
    expect(service.totalCount()).toBe(1);

    service.removeItem('item-1');
    expect(service.totalCount()).toBe(0);
  });

  it('should update item regions after manual editing in canvas workspace', () => {
    const item: BatchItem = {
      id: 'item-1',
      name: 'photo.png',
      sizeBytes: 500,
      mimeType: 'image/png',
      width: 800,
      height: 600,
      thumbnailUrl: '',
      originalDataUrl: '',
      status: 'pending',
      progress: 0,
      regions: [],
      selectedForExport: true
    };
    service.addItem(item);

    const newRegions: WatermarkRegion[] = [
      {
        id: 'r1',
        name: 'Manual Box',
        type: 'rectangle',
        bounds: { x: 20, y: 20, width: 100, height: 50 },
        active: true,
        processed: false,
        createdAt: Date.now()
      }
    ];

    service.updateItemRegions('item-1', newRegions);

    const updated = service.items().find(it => it.id === 'item-1')!;
    expect(updated.regions.length).toBe(1);
    expect(updated.regions[0].name).toBe('Manual Box');
    expect(updated.status).toBe('detected');
  });

  it('should process batch items in queue and mark them completed', async () => {
    const item: BatchItem = {
      id: 'item-1',
      name: 'photo.png',
      sizeBytes: 500,
      mimeType: 'image/png',
      width: 800,
      height: 600,
      thumbnailUrl: 'data:image/png;base64,thumb',
      originalDataUrl: 'data:image/png;base64,orig',
      status: 'pending',
      progress: 0,
      regions: [],
      selectedForExport: true
    };
    service.addItem(item);

    await service.startBatch();

    const processed = service.items().find(it => it.id === 'item-1')!;
    expect(processed.status).toBe('completed');
    expect(processed.progress).toBe(100);
    expect(mockDetector.detectWatermarks).toHaveBeenCalled();
    expect(mockInpainter.inpaint).toHaveBeenCalled();
    expect(processed.qualityMetrics?.overallScore).toBe(92);
  });

  it('should handle partial failure gracefully without halting other queue items', async () => {
    mockInpainter.inpaint = vi.fn(async (_img: any, mask: any) => {
      if (mask?.isCorrupt) {
        throw new Error('Out of memory');
      }
      return {
        outputImageData: { data: new Uint8ClampedArray(800 * 600 * 4), width: 800, height: 600 },
        metrics: {
          overallScore: 90,
          boundaryContinuity: 92,
          colorInconsistencyDelta: 1.5,
          residualEdgeRatio: 0.05,
          rating: 'excellent',
          processingTimeMs: 100
        },
        processingTimeMs: 100
      };
    });

    const item1: BatchItem = {
      id: 'fail-item',
      name: 'corrupt.png',
      sizeBytes: 500,
      mimeType: 'image/png',
      width: 800,
      height: 600,
      thumbnailUrl: '',
      originalDataUrl: 'data:image/png;base64,orig1',
      status: 'pending',
      progress: 0,
      regions: [{ id: 'r1', name: 'R1', type: 'brush', bounds: { x: 0, y: 0, width: 10, height: 10 }, active: true, processed: false, createdAt: 1 }],
      customMask: { isCorrupt: true, width: 800, height: 600, data: new Uint8ClampedArray(10) } as any,
      selectedForExport: true
    };

    const item2: BatchItem = {
      id: 'success-item',
      name: 'good.png',
      sizeBytes: 500,
      mimeType: 'image/png',
      width: 800,
      height: 600,
      thumbnailUrl: '',
      originalDataUrl: 'data:image/png;base64,orig2',
      status: 'pending',
      progress: 0,
      regions: [],
      selectedForExport: true
    };

    service.addItem(item1);
    service.addItem(item2);

    await service.startBatch();

    const failed = service.items().find(it => it.id === 'fail-item')!;
    const succeeded = service.items().find(it => it.id === 'success-item')!;

    expect(failed.status).toBe('failed');
    expect(failed.errorMessage).toBe('Out of memory');

    expect(succeeded.status).toBe('completed');
    expect(succeeded.progress).toBe(100);

    expect(service.failedCount()).toBe(1);
    expect(service.completedCount()).toBe(1);
  });

  it('should pause and cancel queue processing correctly', async () => {
    service.addItem({
      id: 'it-1',
      name: 'test.png',
      sizeBytes: 100,
      mimeType: 'image/png',
      width: 800,
      height: 600,
      thumbnailUrl: '',
      originalDataUrl: '',
      status: 'pending',
      progress: 0,
      regions: [],
      selectedForExport: true
    });

    service.pauseBatch();
    expect(service.isPaused()).toBe(false); // not processing yet, so no pause state

    service.cancelBatch();
    expect(service.isProcessing()).toBe(false);
  });

  it('should toggle selection and select all completed items', () => {
    service.addItem({
      id: 'c1',
      name: 'c1.png',
      sizeBytes: 100,
      mimeType: 'image/png',
      width: 800,
      height: 600,
      thumbnailUrl: '',
      originalDataUrl: '',
      status: 'completed',
      progress: 100,
      regions: [],
      selectedForExport: false
    });

    service.addItem({
      id: 'c2',
      name: 'c2.png',
      sizeBytes: 100,
      mimeType: 'image/png',
      width: 800,
      height: 600,
      thumbnailUrl: '',
      originalDataUrl: '',
      status: 'completed',
      progress: 100,
      regions: [],
      selectedForExport: true
    });

    expect(service.allCompletedSelected()).toBe(false);

    service.selectAllCompleted(true);
    expect(service.allCompletedSelected()).toBe(true);

    service.toggleItemSelection('c1');
    expect(service.items().find(it => it.id === 'c1')?.selectedForExport).toBe(false);
  });
});

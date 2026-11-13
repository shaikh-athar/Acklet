// apps/tool-watermark-remover/src/components/batch-dashboard/batch-dashboard.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { BatchDashboardComponent } from './batch-dashboard.component';
import { BatchProcessorService } from '../../services/batch-processor.service';
import { ZipExportService } from '../../services/zip-export.service';
import { ExportService } from '../../services/export.service';
import { ImageValidationService } from '../../services/image-validation.service';
import { WatermarkDetectorService } from '../../services/watermark-detector.service';
import { InpaintingEngineService } from '../../services/inpainting-engine.service';
import { QualityEvaluatorService } from '../../services/quality-evaluator.service';
import { MetadataPreservationService } from '../../services/metadata-preservation.service';
import { BatchItem } from '../../models/watermark.models';

describe('BatchDashboardComponent', () => {
  const envInjector = createEnvironmentInjector([
    ImageValidationService,
    WatermarkDetectorService,
    InpaintingEngineService,
    QualityEvaluatorService,
    MetadataPreservationService,
    BatchProcessorService,
    ExportService,
    ZipExportService
  ]);

  let component: BatchDashboardComponent;
  let batchService: BatchProcessorService;
  let mockZipExporter: any;
  let mockExporter: any;

  beforeEach(() => {
    mockZipExporter = {
      downloadZip: vi.fn().mockResolvedValue(undefined)
    };
    mockExporter = {
      downloadImage: vi.fn().mockResolvedValue(undefined)
    };

    component = runInInjectionContext(envInjector, () => new BatchDashboardComponent());
    batchService = component.batchService;
    (component as any).zipExporter = mockZipExporter;
    (component as any).exporter = mockExporter;
  });

  it('should initialize and format total size correctly', () => {
    expect(component.formatSize(0)).toBe('0 B');
    expect(component.formatSize(1024)).toBe('1.0 KB');
    expect(component.formatSize(1048576 * 2.5)).toBe('2.5 MB');
  });

  it('should emit editItemRequested when onEditItem is invoked', () => {
    const emittedItems: BatchItem[] = [];
    component.editItemRequested.subscribe((it) => emittedItems.push(it));

    const sampleItem: BatchItem = {
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
    };

    component.onEditItem(sampleItem);

    expect(emittedItems.length).toBe(1);
    expect(emittedItems[0].id).toBe('it-1');
  });

  it('should emit toast and clear queue when onClearQueue is invoked', () => {
    const toastSpy = vi.fn();
    component.toastRequested.subscribe(toastSpy);

    const clearSpy = vi.spyOn(batchService, 'clearQueue');
    component.onClearQueue();

    expect(clearSpy).toHaveBeenCalled();
    expect(toastSpy).toHaveBeenCalledWith('Queue cleared.');
  });

  it('should call downloadZip when completed items are available', async () => {
    const completedItem: BatchItem = {
      id: 'c-1',
      name: 'cleaned.png',
      sizeBytes: 200,
      mimeType: 'image/png',
      width: 800,
      height: 600,
      thumbnailUrl: '',
      originalDataUrl: '',
      status: 'completed',
      progress: 100,
      regions: [],
      selectedForExport: true
    };
    batchService.addItem(completedItem);

    const toastSpy = vi.fn();
    component.toastRequested.subscribe(toastSpy);

    await component.onDownloadZip();

    expect(mockZipExporter.downloadZip).toHaveBeenCalled();
    expect(toastSpy).toHaveBeenCalledWith('Exported 1 images into ZIP!');
  });
});

// apps/tool-watermark-remover/src/watermark-remover.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { WatermarkRemoverComponent } from './watermark-remover.component';
import { ImageValidationService } from './services/image-validation.service';
import { WatermarkDetectorService } from './services/watermark-detector.service';
import { InpaintingEngineService } from './services/inpainting-engine.service';
import { QualityEvaluatorService } from './services/quality-evaluator.service';
import { ExportService } from './services/export.service';
import { SAMPLE_WATERMARK_IMAGES } from './models/sample-images.data';

import { BatchProcessorService } from './services/batch-processor.service';
import { ZipExportService } from './services/zip-export.service';
import { MetadataPreservationService } from './services/metadata-preservation.service';
import { SubjectProtectionService } from './services/subject-protection.service';
import { TiledInpaintingService } from './services/tiled-inpainting.service';

describe('WatermarkRemoverComponent', () => {
  const envInjector = createEnvironmentInjector([
    QualityEvaluatorService,
    ImageValidationService,
    WatermarkDetectorService,
    TiledInpaintingService,
    InpaintingEngineService,
    MetadataPreservationService,
    SubjectProtectionService,
    ExportService,
    BatchProcessorService,
    ZipExportService
  ]);

  let comp: WatermarkRemoverComponent;

  beforeEach(() => {
    runInInjectionContext(envInjector, () => {
      comp = new WatermarkRemoverComponent();
    });
    comp.batchProcessor.clearQueue();
  });

  it('initializes in upload stage with default brush tool at 25px', () => {
    expect(comp.stage()).toBe('upload');
    expect(comp.activeTool()).toBe('brush');
    expect(comp.brushSize()).toBe(25);
    expect(comp.hasMask()).toBe(false);
    expect(comp.isProcessing()).toBe(false);
  });

  it('updates active tool on tool selection including pan', () => {
    comp.onToolChange('rectangle');
    expect(comp.activeTool()).toBe('rectangle');

    comp.onToolChange('eraser');
    expect(comp.activeTool()).toBe('eraser');

    comp.onToolChange('pan');
    expect(comp.activeTool()).toBe('pan');

    comp.onToolChange('protect');
    expect(comp.activeTool()).toBe('protect');

    comp.onToolChange('brush');
    expect(comp.activeTool()).toBe('brush');
  });

  it('updates brush size correctly', () => {
    comp.onBrushSizeChange(45);
    expect(comp.brushSize()).toBe(45);
  });

  it('rejects invalid file formats on drop', () => {
    const invalidFile = new File(['text content'], 'test.pdf', { type: 'application/pdf' });
    comp.onFileDropped(invalidFile);
    expect(comp.errorMessage()).toContain('Unsupported format');
    expect(comp.stage()).toBe('upload');
  });

  it('resets to upload stage on onReplaceImage when no mask exists', () => {
    comp.stage.set('edit');
    comp.hasMask.set(false);
    comp.onReplaceImage();
    expect(comp.stage()).toBe('upload');
    expect(comp.currentImage()).toBeNull();
  });

  it('prompts confirmation when replacing image with unsaved masks or edits', () => {
    comp.stage.set('edit');
    comp.hasMask.set(true);

    comp.onPromptReplaceImage();

    expect(comp.confirmDialog()).not.toBeNull();
    expect(comp.confirmDialog()?.title).toBe('Replace Image?');
    expect(comp.stage()).toBe('edit'); // Still in edit until confirmed

    // Test cancel
    comp.onCancelDialogAction();
    expect(comp.confirmDialog()).toBeNull();
    expect(comp.stage()).toBe('edit');

    // Test confirm
    comp.onPromptReplaceImage();
    comp.onConfirmDialogAction();
    expect(comp.confirmDialog()).toBeNull();
    expect(comp.stage()).toBe('upload');
  });

  it('handles keyboard shortcuts for tool switching and brush sizing', () => {
    const dummyTarget = {} as EventTarget;
    comp.handleGlobalShortcuts({ key: 'r', target: dummyTarget } as unknown as KeyboardEvent);
    expect(comp.activeTool()).toBe('rectangle');

    comp.handleGlobalShortcuts({ key: 'e', target: dummyTarget } as unknown as KeyboardEvent);
    expect(comp.activeTool()).toBe('eraser');

    comp.handleGlobalShortcuts({ key: 'p', target: dummyTarget } as unknown as KeyboardEvent);
    expect(comp.activeTool()).toBe('protect');

    comp.handleGlobalShortcuts({ key: 'h', target: dummyTarget } as unknown as KeyboardEvent);
    expect(comp.activeTool()).toBe('pan');

    comp.handleGlobalShortcuts({ key: 'b', target: dummyTarget } as unknown as KeyboardEvent);
    expect(comp.activeTool()).toBe('brush');

    const initialSize = comp.brushSize();
    comp.handleGlobalShortcuts({ key: ']', target: dummyTarget } as unknown as KeyboardEvent);
    expect(comp.brushSize()).toBe(initialSize + 5);

    comp.handleGlobalShortcuts({ key: '[', target: dummyTarget } as unknown as KeyboardEvent);
    expect(comp.brushSize()).toBe(initialSize);
  });

  it('handles sample selection and loads image', () => {
    const sample = SAMPLE_WATERMARK_IMAGES[0];
    comp.onSampleSelected(sample);
    expect(comp.errorMessage()).toBeNull();
  });

  it('cancels processing gracefully', () => {
    comp.isProcessing.set(true);
    comp.onCancelProcessing();
    expect(comp.isProcessing()).toBe(false);
  });

  it('switches back from comparison to edit on onReEditMask', () => {
    comp.stage.set('comparing');
    comp.onReEditMask();
    expect(comp.stage()).toBe('edit');
  });

  it('supports Phase 3 sensitivity and inpainting mode switching with retry', () => {
    comp.detectionSensitivity.set('high');
    expect(comp.detectionSensitivity()).toBe('high');

    comp.inpaintingMode.set('fast');
    expect(comp.inpaintingMode()).toBe('fast');

    comp.stage.set('comparing');
    comp.onRetryWithUltra();
    expect(comp.inpaintingMode()).toBe('ultra');
    expect(comp.stage()).toBe('edit');
  });

  it('transitions to batch mode when multiple files are dropped', async () => {
    const file1 = new File(['content1'], 'img1.png', { type: 'image/png' });
    const file2 = new File(['content2'], 'img2.jpg', { type: 'image/jpeg' });

    await comp.onFilesDropped([file1, file2]);

    expect(comp.stage()).toBe('batch');
    expect(comp.batchProcessor.totalCount()).toBe(2);
  });

  it('allows editing a batch item in the canvas workspace and returning to batch', () => {
    comp.batchProcessor.addItem({
      id: 'batch-test-1',
      name: 'batch-img.png',
      sizeBytes: 1000,
      mimeType: 'image/png',
      width: 800,
      height: 600,
      thumbnailUrl: 'data:image/png;base64,thumb',
      originalDataUrl: 'data:image/png;base64,orig',
      status: 'pending',
      progress: 0,
      regions: [],
      selectedForExport: true
    });

    const item = comp.batchProcessor.items()[0];
    comp.onEditBatchItem(item);

    expect(comp.editingBatchItemId()).toBe('batch-test-1');
    expect(comp.stage()).toBe('edit');

    comp.onSaveBatchItemEdit();
    expect(comp.editingBatchItemId()).toBeNull();
    expect(comp.stage()).toBe('batch');
  });

  it('switches to batch mode manually from single-image workspace', () => {
    comp.currentImage.set({
      name: 'manual.png',
      width: 800,
      height: 600,
      sizeBytes: 1200,
      mimeType: 'image/png',
      aspectRatio: 800 / 600,
      dataUrl: 'data:image/png;base64,data'
    });

    comp.onSwitchToBatchMode();

    expect(comp.stage()).toBe('batch');
    expect(comp.batchProcessor.totalCount()).toBe(1);
    expect(comp.batchProcessor.items()[0].name).toBe('manual.png');
  });
});

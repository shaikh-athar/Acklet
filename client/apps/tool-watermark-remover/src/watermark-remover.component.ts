// apps/tool-watermark-remover/src/watermark-remover.component.ts
import {
  Component,
  OnInit,
  OnDestroy,
  viewChild,
  signal,
  computed,
  ChangeDetectionStrategy,
  inject,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';

import { ImageValidationService } from './services/image-validation.service';
import { WatermarkDetectorService } from './services/watermark-detector.service';
import { InpaintingEngineService } from './services/inpainting-engine.service';
import { ExportService } from './services/export.service';
import { BatchProcessorService } from './services/batch-processor.service';
import { SubjectProtectionService } from './services/subject-protection.service';
import { MetadataPreservationService } from './services/metadata-preservation.service';

import {
  SelectionTool,
  ImageMetadata,
  InpaintingProgress,
  ExportOptions,
  SampleWatermarkImage,
  ConfirmDialogOptions,
  DetectionSensitivity,
  InpaintingMode,
  InpaintingQualityMetrics,
  BatchItem
} from './models/watermark.models';

import { UploadZoneComponent } from './components/upload-zone/upload-zone.component';
import { WatermarkToolbarComponent } from './components/toolbar/watermark-toolbar.component';
import { CanvasWorkspaceComponent } from './components/canvas-workspace/canvas-workspace.component';
import { ComparisonSliderComponent } from './components/comparison-slider/comparison-slider.component';
import { ProcessingIndicatorComponent } from './components/processing-indicator/processing-indicator.component';
import { ExportModalComponent } from './components/export-modal/export-modal.component';
import { ConfirmModalComponent } from './components/confirm-modal/confirm-modal.component';
import { BatchDashboardComponent } from './components/batch-dashboard/batch-dashboard.component';

export type ToolViewStage = 'upload' | 'edit' | 'comparing' | 'batch';

@Component({
  selector: 'app-watermark-remover',
  standalone: true,
  imports: [
    CommonModule,
    TsIconComponent,
    UploadZoneComponent,
    WatermarkToolbarComponent,
    CanvasWorkspaceComponent,
    ComparisonSliderComponent,
    ProcessingIndicatorComponent,
    ExportModalComponent,
    ConfirmModalComponent,
    BatchDashboardComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './watermark-remover.component.html',
  styleUrls: ['./watermark-remover.component.css']
})
export class WatermarkRemoverComponent implements OnInit, OnDestroy {
  private readonly validator = inject(ImageValidationService);
  private readonly detector = inject(WatermarkDetectorService);
  private readonly inpainter = inject(InpaintingEngineService);
  private readonly exporter = inject(ExportService);
  private readonly subjectProtector = inject(SubjectProtectionService);
  private readonly metadataPreserver = inject(MetadataPreservationService);
  readonly batchProcessor = inject(BatchProcessorService);

  readonly canvasWorkspace = viewChild<CanvasWorkspaceComponent>('canvasWorkspace');

  // Stage & Image state
  readonly stage = signal<ToolViewStage>('upload');
  readonly currentImage = signal<ImageMetadata | null>(null);
  readonly imageElement = signal<HTMLImageElement | null>(null);
  readonly pristineImageData = signal<ImageData | null>(null);
  readonly editingBatchItemId = signal<string | null>(null);

  // Tools, Brush, Mask & Navigation
  readonly activeTool = signal<SelectionTool>('brush');
  readonly brushSize = signal<number>(25);
  readonly maskOpacity = signal<number>(0.65);
  readonly currentZoom = signal<number>(1.0);
  readonly hasMask = signal<boolean>(false);
  readonly regionCount = signal<number>(0);
  readonly selectedRegionId = signal<string | null>(null);
  readonly canUndo = signal<boolean>(false);
  readonly canRedo = signal<boolean>(false);
  readonly detectionSensitivity = signal<DetectionSensitivity>('medium');
  readonly inpaintingMode = signal<InpaintingMode>('balanced');

  // Inpainting & Cumulative Processing State
  readonly isProcessing = signal<boolean>(false);
  readonly inpaintingProgress = signal<InpaintingProgress>({
    progress: 0,
    phase: 'idle',
    message: ''
  });
  readonly processedDataUrl = signal<string | null>(null);
  readonly cumulativeProcessedImageData = signal<ImageData | null>(null);
  readonly qualityMetrics = signal<InpaintingQualityMetrics | null>(null);

  // Modals & Overlays
  readonly showExportModal = signal<boolean>(false);
  readonly confirmDialog = signal<ConfirmDialogOptions | null>(null);
  private pendingConfirmAction: (() => void) | null = null;

  readonly errorMessage = signal<string | null>(null);
  readonly toastMessage = signal<string | null>(null);
  readonly isWindowDragging = signal<boolean>(false);

  private pasteListener = (e: ClipboardEvent) => this.handlePasteEvent(e);

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('paste', this.pasteListener);
    }
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('paste', this.pasteListener);
    }
  }

  // --- Keyboard Shortcuts ---
  @HostListener('window:keydown', ['$event'])
  handleGlobalShortcuts(e: KeyboardEvent): void {
    const targetTag = (e.target as HTMLElement)?.tagName?.toUpperCase();
    if (targetTag === 'INPUT' || targetTag === 'TEXTAREA') {
      return;
    }

    const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

    // Undo: Cmd+Z (without shift)
    if (cmdOrCtrl && !e.shiftKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      this.onUndo();
      return;
    }

    // Redo: Cmd+Shift+Z or Ctrl+Y
    if ((cmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'z') || (!isMac && cmdOrCtrl && e.key.toLowerCase() === 'y')) {
      e.preventDefault();
      this.onRedo();
      return;
    }

    // Tool switching: B (brush), R (rect), E (eraser), H (pan)
    if (!cmdOrCtrl && !e.altKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          this.activeTool.set('brush');
          break;
        case 'r':
          this.activeTool.set('rectangle');
          break;
        case 'e':
          this.activeTool.set('eraser');
          break;
        case 'p':
          this.activeTool.set('protect');
          break;
        case 'h':
          this.activeTool.set('pan');
          break;
        case '[':
          this.brushSize.update(s => Math.max(4, s - 5));
          break;
        case ']':
          this.brushSize.update(s => Math.min(100, s + 5));
          break;
        case '0':
          if (cmdOrCtrl) {
            e.preventDefault();
            this.canvasWorkspace()?.fitToScreen();
          }
          break;
        case '1':
          if (cmdOrCtrl) {
            e.preventDefault();
            this.canvasWorkspace()?.resetZoom();
          }
          break;
      }
    }
  }

  // --- Image Upload & Loading ---
  onFileDropped(file: File): void {
    this.errorMessage.set(null);
    const validation = this.validator.validateFile(file);
    if (!validation.valid) {
      this.errorMessage.set(validation.error ?? 'Invalid file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      let rawBuffer: ArrayBuffer | undefined;
      try {
        if (typeof file.arrayBuffer === 'function') {
          rawBuffer = await file.arrayBuffer();
        }
      } catch {
        // fallback
      }
      this.loadImageFromDataUrl(dataUrl, file.name, file.size, file.type, undefined, rawBuffer);
    };
    reader.onerror = () => {
      this.errorMessage.set('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  }

  async onFilesDropped(files: File[]): Promise<void> {
    if (!files || files.length === 0) return;

    if (files.length === 1 && this.batchProcessor.items().length === 0 && this.stage() === 'upload') {
      this.onFileDropped(files[0]);
      return;
    }

    const result = await this.batchProcessor.addFiles(files);
    if (result.added.length > 0) {
      this.stage.set('batch');
      this.showToast(`Added ${result.added.length} image(s) to batch queue.`);
    }
    if (result.rejected.length > 0) {
      this.errorMessage.set(`Skipped ${result.rejected.length} invalid file(s): ${result.rejected[0].error}`);
    }
  }

  onEditBatchItem(item: BatchItem): void {
    this.editingBatchItemId.set(item.id);
    this.loadImageFromDataUrl(item.originalDataUrl, item.name, item.sizeBytes, item.mimeType, () => {
      if (item.regions && item.regions.length > 0) {
        this.canvasWorkspace()?.loadRegionsAndMask(item.regions, item.customMask);
      }
    });
  }

  onSaveBatchItemEdit(): void {
    const itemId = this.editingBatchItemId();
    if (!itemId) return;

    const regions = this.canvasWorkspace()?.getRegions() ?? [];
    const mask = this.canvasWorkspace()?.getMaskImageData();
    this.batchProcessor.updateItemRegions(itemId, regions, mask);
    this.editingBatchItemId.set(null);
    this.stage.set('batch');
    this.showToast('Saved custom watermark selections to batch item.');
  }

  onCancelBatchItemEdit(): void {
    this.editingBatchItemId.set(null);
    this.stage.set('batch');
  }

  onSwitchToBatchMode(): void {
    const cur = this.currentImage();
    if (cur && this.batchProcessor.items().length === 0) {
      const regions = this.canvasWorkspace()?.getRegions() ?? [];
      const customMask = this.canvasWorkspace()?.getMaskImageData();
      this.batchProcessor.addItem({
        id: `batch-${Date.now()}`,
        name: cur.name,
        sizeBytes: cur.sizeBytes,
        mimeType: cur.mimeType,
        width: cur.width,
        height: cur.height,
        thumbnailUrl: cur.dataUrl,
        originalDataUrl: cur.dataUrl,
        status: regions.length > 0 ? 'detected' : 'pending',
        progress: 0,
        regions,
        customMask,
        selectedForExport: true
      });
    }
    this.stage.set('batch');
  }

  onSampleSelected(sample: SampleWatermarkImage): void {
    this.errorMessage.set(null);
    const approxSize = sample.dataUrl.length;
    this.loadImageFromDataUrl(sample.dataUrl, `${sample.name}.png`, approxSize, 'image/png');
  }

  private handlePasteEvent(e: ClipboardEvent): void {
    if (!e.clipboardData) return;
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          this.onFileDropped(file);
          this.showToast('Image pasted from clipboard!');
          break;
        }
      }
    }
  }

  private loadImageFromDataUrl(
    dataUrl: string,
    name: string,
    sizeBytes: number,
    mimeType: string,
    onLoaded?: () => void,
    rawBuffer?: ArrayBuffer
  ): void {
    if (typeof Image === 'undefined') {
      const meta: ImageMetadata = {
        name,
        width: 800,
        height: 520,
        sizeBytes,
        mimeType: mimeType || 'image/png',
        aspectRatio: 800 / 520,
        dataUrl,
        rawBuffer,
        hasAlpha: false,
        exifDetected: false
      };
      this.currentImage.set(meta);
      this.stage.set('edit');
      if (onLoaded) setTimeout(onLoaded, 10);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const dimValidation = this.validator.validateDimensions(img.naturalWidth, img.naturalHeight);
      if (!dimValidation.valid) {
        this.errorMessage.set(dimValidation.error ?? 'Invalid image dimensions.');
        return;
      }

      // Extract initial pristine ImageData
      const offscreen = document.createElement('canvas');
      offscreen.width = img.naturalWidth;
      offscreen.height = img.naturalHeight;
      const ctx = offscreen.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const initialImageData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);

      let exifDetected = false;
      if (rawBuffer) {
        const integrity = this.metadataPreserver.inspectIntegrity(rawBuffer, name);
        exifDetected = integrity.exifDetected;
      }
      const hasAlpha = this.metadataPreserver.hasTransparency(initialImageData);

      const meta: ImageMetadata = {
        name,
        width: img.naturalWidth,
        height: img.naturalHeight,
        sizeBytes,
        mimeType: mimeType || 'image/png',
        aspectRatio: img.naturalWidth / img.naturalHeight,
        dataUrl,
        rawBuffer,
        hasAlpha,
        exifDetected
      };

      this.currentImage.set(meta);
      this.imageElement.set(img);
      this.pristineImageData.set(initialImageData);
      this.cumulativeProcessedImageData.set(initialImageData);
      this.processedDataUrl.set(null);
      this.stage.set('edit');
      this.showToast(`Loaded ${meta.name} (${meta.width}×${meta.height})`);
      if (onLoaded) {
        setTimeout(onLoaded, 30);
      }
    };
    img.onerror = () => {
      this.errorMessage.set('Failed to load image format.');
    };
    img.src = dataUrl;
  }

  // --- Toolbar & Selection Handlers ---
  onToolChange(tool: SelectionTool): void {
    this.activeTool.set(tool);
  }

  onBrushSizeChange(size: number): void {
    this.brushSize.set(size);
  }

  onMaskOpacityChange(opacity: number): void {
    this.maskOpacity.set(opacity);
  }

  onMaskStateChange(state: {
    hasMask: boolean;
    canUndo: boolean;
    canRedo: boolean;
    regionCount: number;
    selectedRegionId: string | null;
  }): void {
    this.hasMask.set(state.hasMask);
    this.canUndo.set(state.canUndo);
    this.canRedo.set(state.canRedo);
    this.regionCount.set(state.regionCount);
    this.selectedRegionId.set(state.selectedRegionId);
  }

  onClearMask(): void {
    this.canvasWorkspace()?.clearMask();
  }

  onUndo(): void {
    this.canvasWorkspace()?.undo();
  }

  onRedo(): void {
    this.canvasWorkspace()?.redo();
  }

  // --- Zoom Forwarding ---
  onZoomIn(): void {
    this.canvasWorkspace()?.zoomIn();
  }

  onZoomOut(): void {
    this.canvasWorkspace()?.zoomOut();
  }

  onResetZoom(): void {
    this.canvasWorkspace()?.resetZoom();
  }

  onFitScreen(): void {
    this.canvasWorkspace()?.fitToScreen();
  }

  onZoomLevelChanged(zoom: number): void {
    this.currentZoom.set(zoom);
  }

  // --- AI Watermark Detection & Protection ---
  onAutoDetect(): void {
    const ws = this.canvasWorkspace();
    const sourceData = this.cumulativeProcessedImageData() || this.pristineImageData();
    if (!ws || !sourceData) return;

    const result = this.detector.detectWatermarks(sourceData, {
      sensitivity: this.detectionSensitivity()
    });
    if (result.detected) {
      ws.applyMaskData(result.maskData, result.regions);
      this.showToast(result.message);
    } else {
      this.showToast(result.message);
    }
  }

  onAutoProtectSubjects(): void {
    const ws = this.canvasWorkspace();
    const sourceData = this.cumulativeProcessedImageData() || this.pristineImageData();
    if (!ws || !sourceData) return;

    const watermarkBounds = ws.getRegions().map(r => r.bounds);
    const regions = this.subjectProtector.detectSubjectProtectionRegions(sourceData, watermarkBounds);
    if (regions.length > 0) {
      ws.loadProtectedRegions(regions);
      this.showToast(`Auto-protected ${regions.length} subject area(s) from inpainting.`);
    } else {
      this.showToast('No prominent faces or subjects detected near watermarks.');
    }
  }

  // --- AI Watermark Removal ---
  async onRemoveWatermark(): Promise<void> {
    if (this.isProcessing()) return;

    const ws = this.canvasWorkspace();
    const baseImageData = this.cumulativeProcessedImageData() || this.pristineImageData();
    if (!ws || !baseImageData) return;

    const maskImageData = ws.getMaskImageData();
    const protectedMask = ws.getProtectedMaskArray() ?? undefined;

    this.isProcessing.set(true);
    this.inpaintingProgress.set({
      progress: 0,
      phase: 'analyzing',
      message: `Analyzing watermark regions (${this.inpaintingMode()} mode)...`
    });

    try {
      const result = await this.inpainter.inpaint(
        baseImageData,
        maskImageData,
        {
          mode: this.inpaintingMode(),
          protectedMask,
          onProgress: (p) => this.inpaintingProgress.set(p)
        }
      );

      const outputImageData = result.outputImageData;

      // Create data URL for preview and comparison
      const outCanvas = document.createElement('canvas');
      outCanvas.width = outputImageData.width;
      outCanvas.height = outputImageData.height;
      const outCtx = outCanvas.getContext('2d')!;
      outCtx.putImageData(outputImageData, 0, 0);
      const cleanedDataUrl = outCanvas.toDataURL('image/png');

      // Update non-destructive cumulative state and record quality metrics
      this.cumulativeProcessedImageData.set(outputImageData);
      this.processedDataUrl.set(cleanedDataUrl);
      this.qualityMetrics.set(result.metrics);
      ws.updateBaseImage(outputImageData);
      ws.clearMask();

      this.stage.set('comparing');
      this.showToast(`Watermark removed! Reconstruction quality: ${result.metrics.overallScore}% (${result.metrics.rating}).`);
    } catch (err: any) {
      this.errorMessage.set(err?.message || 'Processing failed.');
    } finally {
      this.isProcessing.set(false);
    }
  }

  async onRemoveSingleRegion(regionId: string): Promise<void> {
    if (this.isProcessing()) return;

    const ws = this.canvasWorkspace();
    const baseImageData = this.cumulativeProcessedImageData() || this.pristineImageData();
    if (!ws || !baseImageData) return;

    const regionMask = ws.getMaskForRegion(regionId);
    const protectedMask = ws.getProtectedMaskArray() ?? undefined;

    this.isProcessing.set(true);
    this.inpaintingProgress.set({
      progress: 0,
      phase: 'analyzing',
      message: `Processing selected region (${this.inpaintingMode()} mode)...`
    });

    try {
      const result = await this.inpainter.inpaint(
        baseImageData,
        regionMask,
        {
          mode: this.inpaintingMode(),
          protectedMask,
          onProgress: (p) => this.inpaintingProgress.set(p)
        }
      );

      const outputImageData = result.outputImageData;
      const outCanvas = document.createElement('canvas');
      outCanvas.width = outputImageData.width;
      outCanvas.height = outputImageData.height;
      const outCtx = outCanvas.getContext('2d')!;
      outCtx.putImageData(outputImageData, 0, 0);
      const cleanedDataUrl = outCanvas.toDataURL('image/png');

      this.cumulativeProcessedImageData.set(outputImageData);
      this.processedDataUrl.set(cleanedDataUrl);
      this.qualityMetrics.set(result.metrics);
      ws.updateBaseImage(outputImageData);
      ws.markRegionProcessed(regionId, true);

      this.showToast(`Region inpainted! Quality score: ${result.metrics.overallScore}%.`);
    } catch (err: any) {
      this.errorMessage.set(err?.message || 'Failed to process region.');
    } finally {
      this.isProcessing.set(false);
    }
  }

  onRetryWithUltra(): void {
    this.inpaintingMode.set('ultra');
    this.stage.set('edit');
    this.showToast('Switched to Ultra-Quality mode with multi-scale pyramid. Click Remove to reprocess.');
  }

  onCancelProcessing(): void {
    this.inpainter.cancel();
    this.isProcessing.set(false);
    this.showToast('Processing cancelled.');
  }

  // --- Comparison & Workflow Confirmation ---
  onReEditMask(): void {
    this.stage.set('edit');
  }

  onReplaceImage(): void {
    this.onPromptReplaceImage();
  }

  onPromptReplaceImage(): void {
    if (this.hasMask() || this.processedDataUrl()) {
      this.requestConfirmation(
        {
          title: 'Replace Image?',
          message: 'All current watermark selections and inpainting edits will be lost.',
          confirmText: 'Replace Image',
          danger: true
        },
        () => this.executeReplaceImage()
      );
    } else {
      this.executeReplaceImage();
    }
  }

  onPromptResetOriginal(): void {
    this.requestConfirmation(
      {
        title: 'Reset to Original?',
        message: 'Revert all inpainting changes and restore the pristine uploaded image.',
        confirmText: 'Reset to Original',
        danger: true
      },
      () => this.executeResetOriginal()
    );
  }

  private executeReplaceImage(): void {
    this.stage.set('upload');
    this.currentImage.set(null);
    this.imageElement.set(null);
    this.pristineImageData.set(null);
    this.cumulativeProcessedImageData.set(null);
    this.processedDataUrl.set(null);
  }

  private executeResetOriginal(): void {
    const pristine = this.pristineImageData();
    if (pristine) {
      this.cumulativeProcessedImageData.set(pristine);
      this.canvasWorkspace()?.updateBaseImage(pristine);
    }
    this.processedDataUrl.set(null);
    this.stage.set('edit');
    this.canvasWorkspace()?.clearMask();
    this.showToast('Restored pristine original image.');
  }

  private requestConfirmation(options: ConfirmDialogOptions, onConfirm: () => void): void {
    this.confirmDialog.set(options);
    this.pendingConfirmAction = onConfirm;
  }

  onConfirmDialogAction(): void {
    const action = this.pendingConfirmAction;
    this.confirmDialog.set(null);
    this.pendingConfirmAction = null;
    if (action) action();
  }

  onCancelDialogAction(): void {
    this.confirmDialog.set(null);
    this.pendingConfirmAction = null;
  }

  // --- Export Modal ---
  onOpenExport(): void {
    this.showExportModal.set(true);
  }

  async onExecuteDownload(options: ExportOptions): Promise<void> {
    const data = this.cumulativeProcessedImageData();
    const meta = this.currentImage();
    if (!data || !meta) return;

    try {
      await this.exporter.downloadImage(data, meta.name, options, meta.rawBuffer);
      this.showExportModal.set(false);
      this.showToast(`Cleaned image downloaded as ${options.filename}!`);
    } catch (err: any) {
      this.errorMessage.set('Failed to download image.');
    }
  }

  // --- Drag & Drop Overlays ---
  onWindowDragEnter(e: DragEvent): void {
    e.preventDefault();
    this.isWindowDragging.set(true);
  }

  onWindowDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isWindowDragging.set(true);
  }

  onWindowDragLeave(e: DragEvent): void {
    e.preventDefault();
    this.isWindowDragging.set(false);
  }

  onWindowDrop(e: DragEvent): void {
    e.preventDefault();
    this.isWindowDragging.set(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const fileList = Array.from(e.dataTransfer.files);
      this.onFilesDropped(fileList);
    }
  }

  showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      if (this.toastMessage() === msg) {
        this.toastMessage.set(null);
      }
    }, 4000);
  }

  formatBytes(bytes: number): string {
    return this.validator.formatBytes(bytes);
  }
}

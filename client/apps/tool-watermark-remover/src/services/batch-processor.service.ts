// apps/tool-watermark-remover/src/services/batch-processor.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { ImageValidationService } from './image-validation.service';
import { WatermarkDetectorService } from './watermark-detector.service';
import { InpaintingEngineService } from './inpainting-engine.service';
import { QualityEvaluatorService } from './quality-evaluator.service';
import {
  BatchItem,
  BatchItemStatus,
  BatchProcessingConfig,
  BatchOverallProgress,
  BatchViewMode,
  WatermarkRegion,
  InpaintingQualityMetrics
} from '../models/watermark.models';

export const MAX_CONCURRENT_BATCH_JOBS = 2;

@Injectable({
  providedIn: 'root'
})
export class BatchProcessorService {
  private readonly validator = inject(ImageValidationService);
  private readonly detector = inject(WatermarkDetectorService);
  private readonly inpainter = inject(InpaintingEngineService);
  private readonly evaluator = inject(QualityEvaluatorService);

  // State signals
  readonly items = signal<BatchItem[]>([]);
  readonly config = signal<BatchProcessingConfig>({
    autoDetect: true,
    sensitivity: 'medium',
    inpaintingMode: 'balanced',
    exportFormat: 'png',
    exportQuality: 0.92,
    preserveResolution: true
  });

  readonly isProcessing = signal<boolean>(false);
  readonly isPaused = signal<boolean>(false);
  readonly viewMode = signal<BatchViewMode>('grid');

  private isCancelled = false;
  private activeJobsCount = 0;
  private startTime = 0;
  private readonly elapsedMsSignal = signal<number>(0);
  private timerInterval: any = null;

  // Computed signals
  readonly totalCount = computed(() => this.items().length);
  readonly totalSizeBytes = computed(() =>
    this.items().reduce((sum, item) => sum + item.sizeBytes, 0)
  );

  readonly completedCount = computed(() =>
    this.items().filter(item => item.status === 'completed').length
  );

  readonly failedCount = computed(() =>
    this.items().filter(item => item.status === 'failed').length
  );

  readonly processingCount = computed(() =>
    this.items().filter(item => item.status === 'processing' || item.status === 'detecting').length
  );

  readonly pendingCount = computed(() =>
    this.items().filter(item => item.status === 'pending' || item.status === 'detected').length
  );

  readonly overallProgress = computed<BatchOverallProgress>(() => {
    const total = this.totalCount();
    const completed = this.completedCount();
    const failed = this.failedCount();
    const processing = this.processingCount();
    const pending = this.pendingCount();
    const percent = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0;

    return {
      total,
      completed,
      failed,
      processing,
      pending,
      percent,
      isProcessing: this.isProcessing(),
      isPaused: this.isPaused(),
      elapsedMs: this.elapsedMsSignal()
    };
  });

  readonly allCompletedSelected = computed(() => {
    const completed = this.items().filter(it => it.status === 'completed');
    if (completed.length === 0) return false;
    return completed.every(it => it.selectedForExport);
  });

  readonly completedItems = computed(() =>
    this.items().filter(it => it.status === 'completed')
  );

  readonly selectedCompletedItems = computed(() =>
    this.items().filter(it => it.status === 'completed' && it.selectedForExport)
  );

  /**
   * Adds uploaded files to the queue, validating format and size.
   */
  async addFiles(
    files: File[]
  ): Promise<{ added: BatchItem[]; rejected: { file: File; error: string }[] }> {
    const added: BatchItem[] = [];
    const rejected: { file: File; error: string }[] = [];

    for (const file of files) {
      const validation = this.validator.validateFile(file);
      if (!validation.valid) {
        rejected.push({ file, error: validation.error ?? 'Invalid file' });
        continue;
      }

      try {
        const item = await this.createBatchItemFromFile(file);
        added.push(item);
      } catch (err: any) {
        rejected.push({ file, error: err.message || 'Failed to read image' });
      }
    }

    if (added.length > 0) {
      this.items.update(list => [...list, ...added]);
    }

    return { added, rejected };
  }

  /**
   * Adds a pre-constructed BatchItem (used in tests or sample images).
   */
  addItem(item: BatchItem): void {
    this.items.update(list => [...list, item]);
  }

  /**
   * Removes an item from the queue and releases resources.
   */
  removeItem(id: string): void {
    const target = this.items().find(it => it.id === id);
    if (target) {
      this.releaseItemUrls(target);
    }
    this.items.update(list => list.filter(it => it.id !== id));
  }

  /**
   * Clears the entire queue and releases all memory references.
   */
  clearQueue(): void {
    this.cancelBatch();
    this.items().forEach(item => this.releaseItemUrls(item));
    this.items.set([]);
    this.elapsedMsSignal.set(0);
  }

  /**
   * Updates batch settings.
   */
  updateConfig(partial: Partial<BatchProcessingConfig>): void {
    this.config.update(cfg => ({ ...cfg, ...partial }));
  }

  /**
   * Updates an item's custom watermark regions (e.g. after manual editing).
   */
  updateItemRegions(id: string, regions: WatermarkRegion[], customMask?: ImageData): void {
    this.items.update(list =>
      list.map(it => {
        if (it.id === id) {
          return {
            ...it,
            regions: [...regions],
            customMask: customMask ?? it.customMask,
            status: 'detected',
            progress: 0,
            errorMessage: undefined
          };
        }
        return it;
      })
    );
  }

  /**
   * Toggles an item's selection for bulk download.
   */
  toggleItemSelection(id: string): void {
    this.items.update(list =>
      list.map(it => (it.id === id ? { ...it, selectedForExport: !it.selectedForExport } : it))
    );
  }

  /**
   * Selects or deselects all completed items.
   */
  selectAllCompleted(selected: boolean): void {
    this.items.update(list =>
      list.map(it => (it.status === 'completed' ? { ...it, selectedForExport: selected } : it))
    );
  }

  /**
   * Sets the view layout mode (grid or list).
   */
  setViewMode(mode: BatchViewMode): void {
    this.viewMode.set(mode);
  }

  /**
   * Starts processing the batch queue with concurrency limit.
   */
  async startBatch(options?: { onlySelected?: boolean; itemIds?: string[] }): Promise<void> {
    if (this.isProcessing() && !this.isPaused()) {
      return; // Already actively processing
    }

    if (this.isPaused()) {
      this.isPaused.set(false);
      this.startTimer();
      this.pumpQueue(options);
      return;
    }

    this.isCancelled = false;
    this.isProcessing.set(true);
    this.isPaused.set(false);
    this.startTime = Date.now() - this.elapsedMsSignal();
    this.startTimer();

    await this.pumpQueue(options);
  }

  /**
   * Pauses the batch queue. Currently running tasks finish, while pending ones wait.
   */
  pauseBatch(): void {
    if (!this.isProcessing()) return;
    this.isPaused.set(true);
    this.stopTimer();
  }

  /**
   * Cancels processing. Remaining pending jobs will not run.
   */
  cancelBatch(): void {
    this.isCancelled = true;
    this.isProcessing.set(false);
    this.isPaused.set(false);
    this.stopTimer();

    // Reset currently processing items to pending
    this.items.update(list =>
      list.map(it => {
        if (it.status === 'processing' || it.status === 'detecting') {
          return { ...it, status: 'pending', progress: 0 };
        }
        return it;
      })
    );
  }

  /**
   * Retries all failed items.
   */
  async retryFailed(): Promise<void> {
    this.items.update(list =>
      list.map(it => {
        if (it.status === 'failed') {
          return {
            ...it,
            status: 'pending',
            progress: 0,
            errorMessage: undefined
          };
        }
        return it;
      })
    );
    await this.startBatch();
  }

  /**
   * Retries a single item.
   */
  async retryItem(id: string): Promise<void> {
    this.items.update(list =>
      list.map(it => {
        if (it.id === id) {
          return {
            ...it,
            status: 'pending',
            progress: 0,
            errorMessage: undefined
          };
        }
        return it;
      })
    );
    await this.startBatch({ itemIds: [id] });
  }

  /**
   * Managed concurrency queue runner.
   */
  private async pumpQueue(options?: { onlySelected?: boolean; itemIds?: string[] }): Promise<void> {
    while (!this.isCancelled && !this.isPaused()) {
      if (this.activeJobsCount >= MAX_CONCURRENT_BATCH_JOBS) {
        // Wait briefly for a slot to free up
        await this.delay(50);
        continue;
      }

      // Find next eligible item
      const nextItem = this.findNextEligibleItem(options);
      if (!nextItem) {
        if (this.activeJobsCount === 0) {
          // All done!
          this.isProcessing.set(false);
          this.stopTimer();
          break;
        } else {
          // Waiting for remaining active workers to finish
          await this.delay(50);
          continue;
        }
      }

      this.activeJobsCount++;
      // Launch worker without blocking next slot check
      this.runItemJob(nextItem).finally(() => {
        this.activeJobsCount--;
      });
    }

    if (this.isCancelled || this.isPaused()) {
      if (this.activeJobsCount === 0 && this.isCancelled) {
        this.isProcessing.set(false);
        this.stopTimer();
      }
    }
  }

  private findNextEligibleItem(options?: { onlySelected?: boolean; itemIds?: string[] }): BatchItem | null {
    const list = this.items();
    for (const item of list) {
      if (item.status !== 'pending' && item.status !== 'detected') {
        continue;
      }
      if (options?.itemIds && !options.itemIds.includes(item.id)) {
        continue;
      }
      if (options?.onlySelected && !item.selectedForExport) {
        continue;
      }
      return item;
    }
    return null;
  }

  /**
   * Executes detection, inpainting and quality evaluation on a single item.
   */
  private async runItemJob(item: BatchItem): Promise<void> {
    const startItemTime = Date.now();
    try {
      // 1. Load image element and ImageData
      const { img, imageData } = await this.loadImageData(item.originalDataUrl);

      // 2. Watermark Detection (if autoDetect is enabled and no custom regions exist)
      let regions = item.regions;
      let maskData = item.customMask;

      if ((!regions || regions.length === 0) && this.config().autoDetect) {
        this.updateItemStatus(item.id, 'detecting', 15);
        const detectionResult = this.detector.detectWatermarks(imageData, {
          sensitivity: this.config().sensitivity
        });

        if (detectionResult.regions && detectionResult.regions.length > 0) {
          regions = detectionResult.regions.map(dr => ({
            id: dr.id,
            name: dr.name,
            type: 'auto-detected',
            watermarkType: dr.type,
            confidence: dr.confidence,
            bounds: dr.bounds,
            active: true,
            processed: false,
            createdAt: Date.now()
          }));
          maskData = detectionResult.maskData;
        }
      }

      // If no regions detected and no manual selection, complete without modification
      if ((!regions || regions.length === 0) && !maskData) {
        this.finishItem(item.id, {
          status: 'completed',
          progress: 100,
          processedDataUrl: item.originalDataUrl,
          processedImageData: imageData,
          processingTimeMs: Date.now() - startItemTime,
          detectedRegionsCount: 0,
          detectionConfidence: 0
        });
        return;
      }

      // 3. Inpainting
      this.updateItemStatus(item.id, 'processing', 30);

      // Synthesize mask if needed
      if (!maskData && regions.length > 0) {
        maskData = this.synthesizeMaskFromRegions(imageData.width, imageData.height, regions);
      }

      const inpaintResult = await this.inpainter.inpaint(imageData, maskData!, {
        mode: this.config().inpaintingMode,
        onProgress: (p) => {
          // Scale inpainting progress from 30% to 85%
          const scaled = Math.round(30 + p.progress * 0.55);
          this.updateItemProgress(item.id, scaled);
        }
      });

      // 4. Quality Evaluation
      this.updateItemProgress(item.id, 90);
      const metrics = inpaintResult.metrics || this.evaluator.evaluateQuality(
        imageData,
        inpaintResult.outputImageData,
        maskData!,
        Date.now() - startItemTime
      );

      // 5. Generate processed Data URL
      const processedDataUrl = this.imageDataToDataUrl(inpaintResult.outputImageData);
      const elapsedMs = Date.now() - startItemTime;

      // Finish item successfully
      this.finishItem(item.id, {
        status: 'completed',
        progress: 100,
        regions,
        customMask: maskData,
        processedDataUrl,
        processedImageData: inpaintResult.outputImageData,
        qualityMetrics: metrics,
        processingTimeMs: elapsedMs,
        detectedRegionsCount: regions.length,
        detectionConfidence: Math.round(
          regions.reduce((acc, r) => acc + (r.confidence ?? 80), 0) / (regions.length || 1)
        )
      });
    } catch (err: any) {
      this.finishItem(item.id, {
        status: 'failed',
        progress: 0,
        errorMessage: err.message || 'Processing failed'
      });
    }
  }

  private updateItemStatus(id: string, status: BatchItemStatus, progress: number): void {
    this.items.update(list =>
      list.map(it => (it.id === id ? { ...it, status, progress } : it))
    );
  }

  private updateItemProgress(id: string, progress: number): void {
    this.items.update(list =>
      list.map(it => (it.id === id ? { ...it, progress } : it))
    );
  }

  private finishItem(id: string, updates: Partial<BatchItem>): void {
    this.items.update(list =>
      list.map(it => (it.id === id ? { ...it, ...updates } : it))
    );
  }

  /**
   * Helper to create a BatchItem from an uploaded File.
   */
  private async createBatchItemFromFile(file: File): Promise<BatchItem> {
    let dataUrl = '';
    if (typeof FileReader !== 'undefined') {
      try {
        dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as string) || '');
          reader.onerror = () => reject(new Error('Failed to read file'));
          try {
            reader.readAsDataURL(file);
          } catch (err) {
            reject(err);
          }
        });
      } catch {
        dataUrl = 'data:image/png;base64,mock';
      }
    } else {
      dataUrl = 'data:image/png;base64,mock';
    }

    const dims = await this.getImageDimensions(dataUrl);
    const thumbnailUrl = await this.createThumbnail(dataUrl, 180);
    const id = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    return {
      id,
      file,
      name: file.name,
      sizeBytes: file.size,
      mimeType: file.type || 'image/png',
      width: dims.width,
      height: dims.height,
      thumbnailUrl,
      originalDataUrl: dataUrl,
      status: 'pending',
      progress: 0,
      regions: [],
      selectedForExport: true
    };
  }

  private getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
    if (typeof Image === 'undefined') {
      return Promise.resolve({ width: 800, height: 600 });
    }
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('Could not parse image dimensions'));
      img.src = dataUrl;
    });
  }

  private createThumbnail(dataUrl: string, maxDim = 180): Promise<string> {
    if (typeof Image === 'undefined' || typeof document === 'undefined') {
      return Promise.resolve(dataUrl);
    }
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  private loadImageData(dataUrl: string): Promise<{ img: HTMLImageElement | null; imageData: ImageData }> {
    if (typeof document === 'undefined') {
      // Mock for test environment
      const mockData = new Uint8ClampedArray(800 * 600 * 4);
      return Promise.resolve({
        img: null,
        imageData: { data: mockData, width: 800, height: 600, colorSpace: 'srgb' } as any
      });
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resolve({ img, imageData });
      };
      img.onerror = () => reject(new Error('Failed to load image into canvas'));
      img.src = dataUrl;
    });
  }

  private synthesizeMaskFromRegions(width: number, height: number, regions: WatermarkRegion[]): ImageData {
    if (typeof document === 'undefined') {
      return { data: new Uint8ClampedArray(width * height * 4), width, height, colorSpace: 'srgb' } as any;
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#FFFFFF';
    for (const r of regions) {
      if (r.active) {
        ctx.fillRect(r.bounds.x, r.bounds.y, r.bounds.width, r.bounds.height);
      }
    }
    return ctx.getImageData(0, 0, width, height);
  }

  private imageDataToDataUrl(imageData: ImageData): string {
    if (typeof document === 'undefined') {
      return 'data:image/png;base64,mock';
    }
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  }

  private releaseItemUrls(item: BatchItem): void {
    if (typeof URL !== 'undefined' && URL.revokeObjectURL) {
      if (item.thumbnailUrl && item.thumbnailUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.thumbnailUrl);
      }
      if (item.originalDataUrl && item.originalDataUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.originalDataUrl);
      }
    }
  }

  private startTimer(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (!this.isPaused() && this.isProcessing()) {
        this.elapsedMsSignal.set(Date.now() - this.startTime);
      }
    }, 200);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// apps/tool-file-converter/src/services/conversion-engine.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import JSZip from 'jszip';
import { ConversionJob, ConversionOptions, FormatDescriptor } from '../models/converter.models';
import { FileSignatureService } from './file-signature.service';
import { AdapterRegistryService } from './adapter-registry.service';
import { TOOL_CONFIG } from '../tool.config';

export const MAX_FILES_PER_BATCH = TOOL_CONFIG.maxBatchFiles;
export const MAX_FILE_SIZE_BYTES = TOOL_CONFIG.maxFileSizeBytes;

function safeInject<T>(token: any): T | null {
  try {
    return inject(token, { optional: true });
  } catch (_) {
    return null;
  }
}

@Injectable({
  providedIn: 'root'
})
export class ConversionEngineService {
  private readonly signatureService: FileSignatureService;
  private readonly adapterRegistry: AdapterRegistryService;

  readonly jobs = signal<ConversionJob[]>([]);

  // Batch options & limits
  readonly batchNotification = signal<string | null>(null);
  readonly batchTargetFormat = signal<string>('webp');
  readonly batchQuality = signal<number>(0.88);
  readonly batchMaxWidth = signal<number | undefined>(undefined);

  readonly hasJobs = computed(() => this.jobs().length > 0);
  readonly readyJobsCount = computed(() => this.jobs().filter(j => j.status === 'ready').length);
  readonly convertingCount = computed(() => this.jobs().filter(j => j.status === 'converting').length);
  readonly completedCount = computed(() => this.jobs().filter(j => j.status === 'completed').length);
  readonly errorCount = computed(() => this.jobs().filter(j => j.status === 'error').length);
  readonly isConvertingAny = computed(() => this.convertingCount() > 0);

  // Overall savings analytics for celebratory state
  readonly totalOriginalBytes = computed(() => {
    return this.jobs()
      .filter(j => j.status === 'completed')
      .reduce((sum, j) => sum + j.file.size, 0);
  });

  readonly totalResultBytes = computed(() => {
    return this.jobs()
      .filter(j => j.status === 'completed')
      .reduce((sum, j) => sum + (j.resultSize || 0), 0);
  });

  readonly totalSavingsBytes = computed(() => {
    const orig = this.totalOriginalBytes();
    const res = this.totalResultBytes();
    return orig > res ? orig - res : 0;
  });

  readonly totalSavingsPercent = computed(() => {
    const orig = this.totalOriginalBytes();
    const saved = this.totalSavingsBytes();
    if (orig === 0) return 0;
    return Math.round((saved / orig) * 100);
  });

  constructor(
    signatureService?: FileSignatureService,
    adapterRegistry?: AdapterRegistryService
  ) {
    this.signatureService = signatureService || safeInject(FileSignatureService) || new FileSignatureService();
    this.adapterRegistry = adapterRegistry || safeInject(AdapterRegistryService) || new AdapterRegistryService();
  }

  /**
   * Enqueues user uploaded files up to 50 max, enforcing 50MB per file and image validation.
   */
  async addFiles(files: FileList | File[]): Promise<void> {
    const rawFiles = Array.from(files);
    if (rawFiles.length === 0) return;

    this.batchNotification.set(null);

    const currentCount = this.jobs().length;
    const remainingSlots = Math.max(0, MAX_FILES_PER_BATCH - currentCount);

    if (remainingSlots === 0) {
      this.batchNotification.set(`Maximum batch limit reached (${MAX_FILES_PER_BATCH} images at one time). Please clear or download completed images before adding more.`);
      return;
    }

    let filesToAdd = rawFiles;
    if (rawFiles.length > remainingSlots) {
      filesToAdd = rawFiles.slice(0, remainingSlots);
      this.batchNotification.set(`Added ${filesToAdd.length} images. Remaining files omitted to respect the ${MAX_FILES_PER_BATCH} images per batch limit.`);
    }

    for (const file of filesToAdd) {
      const jobId = this.generateId();

      // Enforce 50 MB per image limit
      if (file.size > MAX_FILE_SIZE_BYTES) {
        const errorJob: ConversionJob = {
          id: jobId,
          file,
          detectedFormat: {
            format: 'unknown',
            mimeType: file.type || 'application/octet-stream',
            extension: '',
            category: 'image',
            signatureVerified: false,
            confidence: 0
          },
          targetFormat: {
            format: '',
            label: '',
            mimeType: '',
            extension: '',
            category: 'image',
            executionMode: 'browser'
          },
          availableOutputs: [],
          options: { quality: this.batchQuality(), maxWidth: this.batchMaxWidth() },
          status: 'error',
          progress: 0,
          errorMessage: `File exceeds 50 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum 50 MB per image supported.`
        };
        this.jobs.update(current => [...current, errorJob]);
        continue;
      }

      // Preliminary placeholder job while inspecting
      const initialJob: ConversionJob = {
        id: jobId,
        file,
        detectedFormat: {
          format: 'unknown',
          mimeType: file.type || 'application/octet-stream',
          extension: '',
          category: 'image',
          signatureVerified: false,
          confidence: 0
        },
        targetFormat: {
          format: '',
          label: '',
          mimeType: '',
          extension: '',
          category: 'image',
          executionMode: 'browser'
        },
        availableOutputs: [],
        options: { quality: this.batchQuality(), maxWidth: this.batchMaxWidth() },
        status: 'scanning',
        progress: 0,
        progressStage: 'Inspecting image bytes...'
      };

      this.jobs.update(current => [...current, initialJob]);

      try {
        const detected = await this.signatureService.detectFormat(file);

        // Security check: reject executable files masquerading as images
        if (detected.spoofWarning && detected.format === 'exe') {
          this.updateJob(jobId, {
            detectedFormat: detected,
            status: 'error',
            errorMessage: detected.spoofWarning
          });
          continue;
        }

        const availableOutputs = this.adapterRegistry.getAvailableOutputs(detected.format);
        if (availableOutputs.length === 0) {
          let msg = `No active converter available for ${detected.format.toUpperCase()} files in this browser.`;
          if (detected.category === 'document' || ['epub', 'odt', 'docx', 'pdf'].includes(detected.format)) {
            msg = `${detected.format.toUpperCase()} document conversion is planned for Phase 3. Currently, Images (PNG, JPG, WebP, AVIF, SVG, GIF, BMP), Subtitles (SRT, VTT), and Contacts (VCF, CSV) are active.`;
          } else if (detected.category === 'audio' || ['m4a', 'wav', 'mp3', 'flac'].includes(detected.format)) {
            msg = `${detected.format.toUpperCase()} audio conversion is planned for Phase 6. Currently, Images, Subtitles, and Contacts are active.`;
          } else if (detected.category === 'video' || ['mov', 'mp4'].includes(detected.format)) {
            msg = `${detected.format.toUpperCase()} video conversion is planned for Phase 7. Currently, Images, Subtitles, and Contacts are active.`;
          }

          this.updateJob(jobId, {
            detectedFormat: detected,
            status: 'error',
            errorMessage: msg
          });
          continue;
        }

        // Pick preferred batch target if supported by this image, else use first
        const preferred = availableOutputs.find(o => o.format === this.batchTargetFormat()) || availableOutputs[0];

        let previewUrl: string | undefined = undefined;
        try {
          previewUrl = URL.createObjectURL(file);
        } catch (_) {}

        this.updateJob(jobId, {
          detectedFormat: detected,
          availableOutputs,
          targetFormat: preferred,
          status: 'ready',
          progress: 0,
          previewUrl
        });
      } catch (err: any) {
        this.updateJob(jobId, {
          status: 'error',
          errorMessage: err.message || 'Failed to inspect image file.'
        });
      }
    }
  }

  /**
   * Sets target format for all queued 'ready' jobs simultaneously.
   */
  setBatchTargetFormat(format: string): void {
    this.batchTargetFormat.set(format);
    const jobs = this.jobs();
    for (const job of jobs) {
      if (job.status === 'ready' || job.status === 'completed' || job.status === 'cancelled') {
        const target = job.availableOutputs.find(o => o.format === format);
        if (target) {
          this.setTargetFormat(job.id, target);
        }
      }
    }
  }

  /**
   * Updates quality option for all jobs in batch.
   */
  setBatchQuality(quality: number): void {
    this.batchQuality.set(quality);
    const jobs = this.jobs();
    for (const job of jobs) {
      if (job.status === 'ready' || job.status === 'cancelled') {
        this.setOptions(job.id, { quality });
      }
    }
  }

  /**
   * Updates max width / resize option for all jobs in batch.
   */
  setBatchResize(maxWidth?: number): void {
    this.batchMaxWidth.set(maxWidth);
    const jobs = this.jobs();
    for (const job of jobs) {
      if (job.status === 'ready' || job.status === 'cancelled') {
        this.setOptions(job.id, { maxWidth });
      }
    }
  }

  /**
   * Changes the selected target format for a specific queued job.
   */
  setTargetFormat(jobId: string, format: FormatDescriptor): void {
    this.updateJob(jobId, {
      targetFormat: format,
      status: 'ready',
      progress: 0,
      errorMessage: undefined,
      resultBlob: undefined,
      resultUrl: undefined
    });
  }

  /**
   * Updates conversion options for a job.
   */
  setOptions(jobId: string, options: Partial<ConversionOptions>): void {
    const job = this.jobs().find(j => j.id === jobId);
    if (!job) return;
    this.updateJob(jobId, {
      options: { ...job.options, ...options }
    });
  }

  /**
   * Executes conversion for a single job asynchronously.
   */
  async convertJob(jobId: string): Promise<void> {
    const job = this.jobs().find(j => j.id === jobId);
    if (!job || job.status === 'converting') return;

    const adapter = this.adapterRegistry.getAdapter(
      job.detectedFormat.format,
      job.targetFormat.format
    );

    if (!adapter) {
      this.updateJob(jobId, {
        status: 'error',
        errorMessage: `No converter adapter found for ${job.detectedFormat.format} to ${job.targetFormat.format}.`
      });
      return;
    }

    const abortController = new AbortController();

    this.updateJob(jobId, {
      status: 'converting',
      progress: 0,
      progressStage: 'Starting conversion...',
      errorMessage: undefined,
      abortController,
      startTime: performance.now()
    });

    try {
      const result = await adapter.convert(
        job.file,
        job.detectedFormat.format,
        job.targetFormat.format,
        job.options,
        (progress, stage) => {
          this.updateJob(jobId, {
            progress,
            progressStage: stage
          });
        },
        abortController.signal
      );

      if (result.success && result.blob) {
        const resultUrl = URL.createObjectURL(result.blob);
        this.updateJob(jobId, {
          status: 'completed',
          progress: 100,
          progressStage: 'Finished',
          resultBlob: result.blob,
          resultUrl,
          resultFileName: result.outputFileName,
          resultSize: result.outputSize,
          durationMs: result.durationMs,
          abortController: undefined
        });
      } else {
        throw new Error(result.error || 'Conversion produced no output file.');
      }
    } catch (err: any) {
      if (abortController.signal.aborted) {
        this.updateJob(jobId, {
          status: 'cancelled',
          progress: 0,
          progressStage: 'Cancelled',
          abortController: undefined
        });
      } else {
        this.updateJob(jobId, {
          status: 'error',
          errorMessage: err.message || 'Conversion failed. Please verify the image file is valid.',
          abortController: undefined
        });
      }
    }
  }

  /**
   * Cancels an ongoing conversion job.
   */
  cancelJob(jobId: string): void {
    const job = this.jobs().find(j => j.id === jobId);
    if (job && job.status === 'converting' && job.abortController) {
      job.abortController.abort();
    }
  }

  /**
   * Converts all queued jobs asynchronously and concurrently in parallel pools (3 workers)
   * while yielding to the browser event loop so animations remain silky smooth at 60 FPS.
   */
  async convertAll(): Promise<void> {
    const readyJobs = this.jobs().filter(j => j.status === 'ready');
    if (readyJobs.length === 0) return;

    const CONCURRENCY_LIMIT = 3;
    const pool = [...readyJobs];

    const worker = async () => {
      while (pool.length > 0) {
        const nextJob = pool.shift();
        if (nextJob) {
          await this.convertJob(nextJob.id);
          // Yield to main thread for smooth DOM rendering and micro-animations
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
    };

    const workers = Array.from(
      { length: Math.min(CONCURRENCY_LIMIT, readyJobs.length) },
      () => worker()
    );
    await Promise.all(workers);
  }

  /**
   * Bundles all completed jobs into a single ZIP archive and triggers browser download.
   */
  async downloadAllAsZip(): Promise<void> {
    const completedJobs = this.jobs().filter(j => j.status === 'completed' && j.resultBlob && j.resultFileName);
    if (completedJobs.length === 0) return;

    const zip = new JSZip();

    // Prevent filename collisions inside the archive
    const nameCount: Record<string, number> = {};

    for (const job of completedJobs) {
      let fileName = job.resultFileName!;
      if (nameCount[fileName]) {
        nameCount[fileName]++;
        const lastDot = fileName.lastIndexOf('.');
        const base = lastDot !== -1 ? fileName.substring(0, lastDot) : fileName;
        const ext = lastDot !== -1 ? fileName.substring(lastDot) : '';
        fileName = `${base}_${nameCount[fileName]}${ext}`;
      } else {
        nameCount[fileName] = 1;
      }

      zip.file(fileName, job.resultBlob!);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const downloadUrl = URL.createObjectURL(zipBlob);

    this.triggerDownload(downloadUrl, `acklet-converted-images-${Date.now()}.zip`);
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 60000);
  }

  /**
   * Downloads an individual job's converted file.
   */
  downloadJobResult(jobId: string): void {
    const job = this.jobs().find(j => j.id === jobId);
    if (job && job.resultUrl && job.resultFileName) {
      this.triggerDownload(job.resultUrl, job.resultFileName);
    }
  }

  /**
   * Removes a job from the queue and releases volatile object URLs.
   */
  removeJob(jobId: string): void {
    const job = this.jobs().find(j => j.id === jobId);
    if (job) {
      if (job.status === 'converting' && job.abortController) {
        job.abortController.abort();
      }
      if (job.previewUrl) {
        URL.revokeObjectURL(job.previewUrl);
      }
      if (job.resultUrl) {
        URL.revokeObjectURL(job.resultUrl);
      }
    }
    this.jobs.update(current => current.filter(j => j.id !== jobId));
  }

  /**
   * Clears the entire queue and frees resources.
   */
  clearAll(): void {
    this.batchNotification.set(null);
    for (const job of this.jobs()) {
      if (job.status === 'converting' && job.abortController) {
        job.abortController.abort();
      }
      if (job.previewUrl) {
        URL.revokeObjectURL(job.previewUrl);
      }
      if (job.resultUrl) {
        URL.revokeObjectURL(job.resultUrl);
      }
    }
    this.jobs.set([]);
  }

  private updateJob(jobId: string, patch: Partial<ConversionJob>): void {
    this.jobs.update(list =>
      list.map(job => (job.id === jobId ? { ...job, ...patch } : job))
    );
  }

  private triggerDownload(url: string, filename: string): void {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  private generateId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

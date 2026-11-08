// apps/tool-file-converter/src/converter.component.ts
import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { TsIconComponent } from '@acklet/tool-shell';
import { FileJobItem, FileItemStatus, ConversionOptions, BatchJob, ConversionCapability } from './converter.models';
import { ConverterApiService } from './converter.service';
import { BrowserConverterService } from './services/browser-converter.service';
import { DOCUMENT_CONVERTER_CONFIG, computeCommonTestedTargets } from './converter.config';
import { FileDropZoneComponent } from './components/document-converter/file-drop-zone.component';
import { FileListComponent } from './components/document-converter/file-list.component';
import { ConversionSettingsComponent } from './components/document-converter/conversion-settings.component';

@Component({
  selector: 'app-file-converter',
  standalone: true,
  imports: [
    CommonModule,
    TsIconComponent,
    FileDropZoneComponent,
    FileListComponent,
    ConversionSettingsComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './converter.component.html',
  styleUrls: ['./converter.component.css']
})
export class FileConverterComponent implements OnInit, OnDestroy {
  readonly api = inject(ConverterApiService);
  readonly browserConverter = inject(BrowserConverterService);
  readonly config = DOCUMENT_CONVERTER_CONFIG;

  readonly files = signal<FileJobItem[]>([]);
  readonly capabilities = signal<ConversionCapability[]>([]);
  readonly options = signal<ConversionOptions>({
    targetFormat: this.config.defaultTargetFormat,
    fidelity: this.config.defaultFidelity,
    ocr: false,
    keepImages: true,
    pageRange: '',
    deliveryMode: 'individual'
  });

  readonly isConverting = signal<boolean>(false);
  readonly notification = signal<string | null>(null);
  readonly currentBatchJobId = signal<string | null>(null);
  readonly zipDownloadUrl = signal<string | null>(null);
  readonly screenReaderStatus = signal<string>('');
  readonly isPageDragOver = signal<boolean>(false);

  private pollSub?: Subscription;

  constructor() {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('demo') === 'beta') {
        this.files.set([
          {
            fileId: 'f1',
            originalFileName: 'Quarterly_Financial_Report_2026.docx',
            sanitizedFileName: 'Quarterly_Financial_Report_2026',
            sourceFormat: 'docx',
            targetFormat: 'md',
            sizeBytes: 2450000,
            status: 'ready',
            progress: 100,
            runtime: 'browser',
            tier: 'beta',
            downloadUrl: '/api/file-converter/jobs/demo/files/f1',
            structureReport: {
              headingsCount: 14,
              tablesCount: 6,
              columnsCount: 2,
              imagesCount: 8,
              hasLowConfidence: false,
              chips: [
                { type: 'headings', label: '14 Headings', count: 14, lowConfidence: false, confidenceLabel: 'Verified' },
                { type: 'tables', label: '6 Tables', count: 6, lowConfidence: false, confidenceLabel: 'Verified' },
                { type: 'columns', label: '2 Columns', count: 2, lowConfidence: false, confidenceLabel: 'Verified' },
                { type: 'images', label: '8 Images', count: 8, lowConfidence: false, confidenceLabel: 'Verified' }
              ],
              summary: 'Structure analyzed.'
            }
          }
        ]);
        this.options.update(o => ({ ...o, targetFormat: 'md' }));
      } else if (params.get('demo') === '1' || params.get('demo') === 'status') {
        this.files.set([
          {
            fileId: 'f1',
            originalFileName: 'Quarterly_Financial_Report_2026.docx',
            sanitizedFileName: 'Quarterly_Financial_Report_2026',
            sourceFormat: 'docx',
            targetFormat: 'md',
            sizeBytes: 2450000,
            status: 'ready',
            progress: 100,
            runtime: 'browser',
            tier: 'beta',
            downloadUrl: '/api/file-converter/jobs/demo/files/f1',
            structureReport: {
              headingsCount: 14,
              tablesCount: 6,
              columnsCount: 2,
              imagesCount: 8,
              hasLowConfidence: false,
              chips: [
                { type: 'headings', label: '14 Headings', count: 14, lowConfidence: false, confidenceLabel: 'Verified' },
                { type: 'tables', label: '6 Tables', count: 6, lowConfidence: false, confidenceLabel: 'Verified' },
                { type: 'columns', label: '2 Columns', count: 2, lowConfidence: false, confidenceLabel: 'Verified' },
                { type: 'images', label: '8 Images', count: 8, lowConfidence: false, confidenceLabel: 'Verified' }
              ],
              summary: 'Structure analyzed.'
            }
          },
          {
            fileId: 'f2',
            originalFileName: 'Global_Supply_Chain_Matrix.xlsx',
            sanitizedFileName: 'Global_Supply_Chain_Matrix',
            sourceFormat: 'xlsx',
            targetFormat: 'pdf',
            sizeBytes: 5120000,
            status: 'queued',
            progress: 0,
            runtime: 'server',
            queue: 'fc.convert.office',
            queueMessage: 'Waiting for a free converter.'
          },
          {
            fileId: 'f3',
            originalFileName: 'Corrupted_Archive_Scan.pdf',
            sanitizedFileName: 'Corrupted_Archive_Scan',
            sourceFormat: 'pdf',
            targetFormat: 'docx',
            sizeBytes: 1240000,
            status: 'failed',
            progress: 0,
            errorCode: 'UNSUPPORTED_PAIR',
            errorMessage: 'Conversion from this format to the chosen target is not supported.'
          },
          {
            fileId: 'f4',
            originalFileName: 'Enterprise_Architecture_Overview.pptx',
            sanitizedFileName: 'Enterprise_Architecture_Overview',
            sourceFormat: 'pptx',
            targetFormat: 'txt',
            sizeBytes: 3820000,
            status: 'failed',
            progress: 0,
            errorCode: 'TIMEOUT',
            errorMessage: 'Conversion took longer than the time limit. Retrying...'
          }
        ]);
        if (params.get('demo') === 'beta') {
          this.options.update(o => ({ ...o, targetFormat: 'md' }));
        }
      }
    }
  }

  ngOnInit(): void {
    this.api.getCapabilities().subscribe({
      next: caps => {
        if (caps && caps.length > 0) {
          this.capabilities.set(caps);
          this.ensureValidTargetFormat();
        }
      },
      error: () => {}
    });
  }

  readonly pageRangeError = computed<string | null>(() => {
    const range = this.options().pageRange;
    if (!range || !range.trim()) return null;
    const res = this.api.validatePageRange(range);
    return res.valid ? null : (res.error ?? 'Invalid page range');
  });

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  onPageDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.types.includes('Files')) {
      if (!this.isPageDragOver()) {
        this.isPageDragOver.set(true);
      }
    }
  }

  onPageDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target || (e.clientX <= 0 || e.clientY <= 0)) {
      this.isPageDragOver.set(false);
    }
  }

  onPageDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isPageDragOver.set(false);

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      this.onFilesDropped(droppedFiles);
    }
  }

  onFilesDropped(incomingFiles: File[]): void {
    this.notification.set(null);
    const current = this.files();
    const remainingSlots = this.config.maxBatchFiles - current.length;

    if (remainingSlots <= 0) {
      this.notification.set(`Batch limit reached. Up to ${this.config.maxBatchFiles} documents permitted per batch.`);
      return;
    }

    const accepted: FileJobItem[] = [];
    const rejectedErrors: string[] = [];

    for (const file of incomingFiles) {
      if (accepted.length >= remainingSlots) {
        rejectedErrors.push(`Limit of ${this.config.maxBatchFiles} files reached.`);
        break;
      }

      if (file.size > this.config.maxFileSizeBytes) {
        rejectedErrors.push(`"${file.name}" exceeds the 50 MB limit (${this.api.formatBytes(file.size)}).`);
        continue;
      }

      const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.') + 1).toLowerCase() : '';
      if (!this.config.supportedInputExtensions.includes(ext)) {
        rejectedErrors.push(`"${file.name}" is not a supported document format.`);
        continue;
      }

      const fileId = Math.random().toString(36).substring(2, 10);
      const item: FileJobItem = {
        fileId,
        originalFileName: file.name,
        sanitizedFileName: file.name,
        sourceFormat: ext,
        targetFormat: this.options().targetFormat,
        sizeBytes: file.size,
        status: 'queued',
        progress: 0,
        nativeFile: file,
        isExpanded: true
      };

      accepted.push(item);

      // Perform background structure analysis
      this.api.analyzeDocument(file).subscribe({
        next: report => {
          this.files.update(list => list.map(f => f.fileId === fileId ? { ...f, structureReport: report } : f));
          if (report?.recommendedTarget) {
            this.options.update(o => ({
              ...o,
              targetFormat: report.recommendedTarget!.toLowerCase()
            }));
          }
        }
      });
    }

    if (rejectedErrors.length > 0) {
      this.notification.set(rejectedErrors[0]);
    }

    if (accepted.length > 0) {
      this.files.update(list => [...list, ...accepted]);
      this.screenReaderStatus.set(`${accepted.length} files added. Total: ${this.files().length} files.`);
      this.ensureValidTargetFormat();
    }
  }

  removeFile(fileId: string): void {
    this.files.update(list => list.filter(f => f.fileId !== fileId));
    this.screenReaderStatus.set('File removed.');
    this.ensureValidTargetFormat();
  }

  clearAll(): void {
    this.pollSub?.unsubscribe();
    this.files.set([]);
    this.notification.set(null);
    this.isConverting.set(false);
    this.currentBatchJobId.set(null);
    this.zipDownloadUrl.set(null);
    this.screenReaderStatus.set('All files cleared.');
  }

  retryFile(fileId: string): void {
    this.files.update(list => list.map(f => f.fileId === fileId ? { ...f, status: 'queued', progress: 0, errorCode: undefined, errorMessage: undefined } : f));
    this.startBatchConversion();
  }

  onChangeFormat(fileId?: string): void {
    if (typeof document !== 'undefined') {
      const fieldset = document.getElementById('setting-group-target-format');
      if (fieldset) {
        fieldset.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const firstRadio = fieldset.querySelector('input[type="radio"]') as HTMLElement | null;
        firstRadio?.focus();
      }
    }
  }

  private ensureValidTargetFormat(): void {
    const list = this.files();
    if (list.length === 0) return;
    const exts = list.map(f => f.sourceFormat.toLowerCase());
    const commonTargets = computeCommonTestedTargets(exts, this.capabilities());
    if (commonTargets.length === 0) return;

    const currentTarget = this.options().targetFormat?.toLowerCase();
    if (!commonTargets.includes(currentTarget)) {
      // Pick first valid target, preferring 'txt' if available for documents, or first common target
      const nextTarget = commonTargets.includes('txt') ? 'txt' : commonTargets[0];
      this.options.update(opt => ({ ...opt, targetFormat: nextTarget }));
    }
  }

  onOptionsChange(newOptions: ConversionOptions): void {
    const oldTarget = this.options().targetFormat;
    this.options.set(newOptions);
    if (newOptions.targetFormat !== oldTarget) {
      // Clear failure state for files that previously failed due to unsupported pair
      this.files.update(list => list.map(f => {
        if (f.status === 'failed' && f.errorCode === 'UNSUPPORTED_PAIR') {
          return {
            ...f,
            status: 'queued',
            progress: 0,
            errorCode: undefined,
            errorMessage: undefined
          };
        }
        return f;
      }));
    }
  }

  startBatchConversion(): void {
    if (this.isConverting()) return;
    if (this.files().length === 0) return;

    this.pollSub?.unsubscribe();
    this.notification.set(null);
    this.isConverting.set(true);

    const targetFormat = this.options().targetFormat.toLowerCase();
    const pending = this.files().filter(f => f.status === 'queued' || f.status === 'failed');

    const browserItems: FileJobItem[] = [];
    const serverItems: FileJobItem[] = [];

    for (const item of pending) {
      if (item.nativeFile && this.browserConverter.isBrowserPair(item.sourceFormat, targetFormat)) {
        browserItems.push(item);
      } else {
        serverItems.push(item);
      }
    }

    if (browserItems.length === 0 && serverItems.length === 0) {
      this.files.update(list => list.map(f => ({ ...f, status: 'ready', progress: 100 })));
      this.isConverting.set(false);
      return;
    }

    this.screenReaderStatus.set('Conversion started.');

    // 1. Process browser-runtime items
    for (const bItem of browserItems) {
      if (!bItem.nativeFile) continue;
      this.files.update(list => list.map(f => f.fileId === bItem.fileId ? { ...f, status: 'converting', progress: 15 } : f));
      this.browserConverter.convertInBrowser(bItem.nativeFile, targetFormat, this.options()).subscribe({
        next: prog => {
          this.files.update(list => list.map(f => {
            if (f.fileId === bItem.fileId) {
              if (prog.status === 'ready' && prog.result) {
                return {
                  ...f,
                  status: 'ready',
                  progress: 100,
                  downloadUrl: prog.result.downloadUrl,
                  convertedSizeBytes: prog.result.sizeBytes,
                  runtime: 'browser',
                  tier: prog.result.tier
                };
              }
              if (prog.status === 'failed') {
                return {
                  ...f,
                  status: 'failed',
                  progress: 0,
                  errorCode: prog.errorCode,
                  errorMessage: prog.errorMessage
                };
              }
              return {
                ...f,
                status: prog.status,
                progress: prog.progress
              };
            }
            return f;
          }));

          if (serverItems.length === 0 && this.files().every(f => f.status === 'ready' || f.status === 'failed')) {
            this.isConverting.set(false);
            this.screenReaderStatus.set('Conversion completed.');
          }
        }
      });
    }

    // 2. Process server-runtime items
    if (serverItems.length > 0) {
      const uploadFiles = serverItems.map(f => f.nativeFile).filter((f): f is File => Boolean(f));
      if (uploadFiles.length === 0) {
        if (browserItems.length === 0) {
          this.isConverting.set(false);
        }
        return;
      }

      this.files.update(list => list.map(f => serverItems.some(s => s.fileId === f.fileId) ? { ...f, status: 'converting', progress: 15 } : f));

      this.api.createBatchJob(uploadFiles, this.options()).subscribe({
        next: (job: BatchJob) => {
          this.currentBatchJobId.set(job.jobId);
          this.subscribeBatchProgress(job.jobId);
        },
        error: err => {
          this.isConverting.set(false);
          const errCode = err?.error?.code || (err?.status === 422 ? 'UNSUPPORTED_PAIR' : 'CONVERSION_ERROR');
          const errMsg = err?.error?.message || err?.message || 'Failed to start conversion. Please try again.';
          this.notification.set(errMsg);
          this.files.update(list => list.map(f => {
            if (serverItems.some(s => s.fileId === f.fileId) && f.status === 'converting') {
              return {
                ...f,
                status: 'failed',
                errorCode: errCode,
                errorMessage: errMsg
              };
            }
            return f;
          }));
          this.screenReaderStatus.set(`Conversion failed: ${errMsg}`);
        }
      });
    }
  }

  private subscribeBatchProgress(jobId: string): void {
    this.pollSub = this.api.subscribeJobProgress(jobId).subscribe({
      next: (job: BatchJob) => {
        this.files.update(localList => {
          return localList.map(local => {
            const remote = job.files.find(rf => rf.originalFileName === local.originalFileName);
            if (remote) {
              const fileStatus: FileItemStatus =
                remote.status === 'COMPLETED' ? 'ready'
                : remote.status === 'FAILED' ? 'failed'
                : remote.status === 'PROCESSING' ? 'converting' : 'queued';

              return {
                ...local,
                fileId: remote.fileId,
                status: fileStatus,
                progress: remote.progress,
                convertedSizeBytes: remote.convertedSizeBytes,
                downloadUrl: remote.downloadUrl ? `/api/file-converter/jobs/${jobId}/files/${remote.fileId}` : undefined,
                errorMessage: remote.errorMessage,
                structureReport: remote.structureReport ?? local.structureReport,
                runtime: 'server',
                tier: remote.tier,
                queue: remote.queue,
                queueMessage: remote.queueMessage
              };
            }
            return local;
          });
        });

        if (job.status === 'COMPLETED' || job.status === 'FAILED') {
          this.isConverting.set(false);
          if (this.options().deliveryMode === 'zip' || job.zipDownloadUrl) {
            this.zipDownloadUrl.set(`/api/file-converter/jobs/${jobId}/zip`);
          }
          this.screenReaderStatus.set('Conversion completed.');
        }
      },
      error: () => {
        this.isConverting.set(false);
        this.files.update(list => list.map(f => f.status === 'converting' ? { ...f, status: 'failed', errorMessage: 'Conversion error' } : f));
        this.screenReaderStatus.set('Conversion stopped due to an error.');
      }
    });
  }
}

export const FileConverterPageComponent = FileConverterComponent;

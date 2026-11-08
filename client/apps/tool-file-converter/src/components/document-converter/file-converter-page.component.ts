// apps/tool-file-converter/src/components/document-converter/file-converter-page.component.ts
import { Component, ChangeDetectionStrategy, signal, computed, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { TsIconComponent } from '@acklet/tool-shell';
import { FileJobItem, FileItemStatus, ConversionOptions, BatchJob } from '../../converter.models';
import { ConverterApiService } from '../../converter.service';
import { DOCUMENT_CONVERTER_CONFIG } from '../../converter.config';
import { FileDropZoneComponent } from './file-drop-zone.component';
import { FileListComponent } from './file-list.component';
import { ConversionSettingsComponent } from './conversion-settings.component';

@Component({
  selector: 'app-file-converter-page',
  standalone: true,
  imports: [
    CommonModule,
    TsIconComponent,
    FileDropZoneComponent,
    FileListComponent,
    ConversionSettingsComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="converter-page-wrapper"
      role="region"
      aria-label="File Converter workspace"
      (dragover)="onPageDragOver($event)"
      (dragleave)="onPageDragLeave($event)"
      (drop)="onPageDrop($event)"
    >
      <!-- Full-Page Drag Overlay (shown only during page dragover) -->
      @if (isPageDragOver()) {
        <div class="fullpage-drag-overlay" aria-hidden="true">
          <ts-icon name="upload-cloud" [size]="32" class="alert-icon" />
          <span class="drag-overlay-text">Drop to add files</span>
        </div>
      }

      <!-- Calm Alert Notification (Validation / Error messages) -->
      @if (notification(); as note) {
        <div class="calm-alert" role="alert" aria-live="polite">
          <ts-icon name="info" [size]="16" class="alert-icon" />
          <span class="alert-text">{{ note }}</span>
          <button
            type="button"
            class="alert-dismiss"
            (click)="notification.set(null)"
            aria-label="Dismiss notification"
          >
            <ts-icon name="x" [size]="16" />
          </button>
        </div>
      }

      <!-- Screen State Switching -->
      @if (files().length === 0) {
        <!-- IDLE STATE -->
        <app-file-drop-zone (filesDropped)="onFilesDropped($event)" />
      } @else {
        <!-- ACTIVE STATE: 2-Column Workspace -->
        <div class="active-workspace">
          <div class="workspace-left">
            <app-file-list
              [files]="files()"
              (addFiles)="onFilesDropped($event)"
              (remove)="removeFile($event)"
              (retry)="retryFile($event)"
              (clear)="clearAll()"
            />
          </div>

          <div class="workspace-right">
            <app-conversion-settings
              [files]="files()"
              [options]="options()"
              [isConverting]="isConverting()"
              [pageRangeError]="pageRangeError()"
              [zipDownloadUrl]="zipDownloadUrl()"
              (optionsChange)="onOptionsChange($event)"
              (convert)="startBatchConversion()"
            />
          </div>
        </div>
      }

      <!-- Screen reader status announcements -->
      <div class="sr-only" aria-live="polite" aria-atomic="true">
        {{ screenReaderStatus() }}
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      --tool-accent: #5B7A1E;
      --tool-accent-soft: #F3F7E8;
      --tool-accent-contrast: #FFFFFF;
      --tool-accent-border: rgba(91, 122, 30, 0.22);
    }

    :host-context([data-theme="dark"]),
    :host-context(.dark),
    [data-theme="dark"] :host {
      --tool-accent: #A3C75A;
      --tool-accent-soft: #1F2A10;
      --tool-accent-contrast: #0F1608;
      --tool-accent-border: rgba(163, 199, 90, 0.28);
    }

    .converter-page-wrapper {
      max-width: 1120px;
      margin: 0 auto;
      padding: 32px 16px 48px;
      display: flex;
      flex-direction: column;
      gap: 32px;
      background: transparent;
      min-height: calc(100vh - 120px);
      position: relative;
    }

    /* Full-Page Drag Overlay */
    .fullpage-drag-overlay {
      position: fixed;
      inset: 16px;
      z-index: 9999;
      background: var(--bg-canvas);
      border: 1px solid var(--tool-accent);
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      pointer-events: none;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }

    .drag-overlay-text {
      font-size: 18px;
      font-weight: 600;
      color: var(--tool-accent);
    }

    /* Calm Alert */
    .calm-alert {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border: 1px solid var(--border-default);
      border-radius: 8px;
      background: var(--bg-surface);
      color: var(--text-primary);
      font-size: 14px;
    }

    .alert-icon {
      color: var(--tool-accent);
      flex-shrink: 0;
    }

    .alert-text {
      flex: 1;
      line-height: 1.4;
    }

    .alert-dismiss {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: 4px;
      outline: none;
    }

    .alert-dismiss:hover {
      color: var(--text-primary);
      background: var(--bg-muted);
    }

    .alert-dismiss:focus-visible {
      outline: 2px solid var(--tool-accent);
      outline-offset: 2px;
    }

    /* 2-Column Responsive Workspace */
    .active-workspace {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 360px;
      gap: 32px;
      align-items: start;
    }

    .workspace-left {
      min-width: 0;
    }

    .workspace-right {
      min-width: 0;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    /* Responsive: under 900px, right panel moves below the file list */
    @media (max-width: 900px) {
      .active-workspace {
        grid-template-columns: 1fr;
        gap: 32px;
      }
    }
  `]
})
export class FileConverterPageComponent implements OnDestroy {
  readonly api = inject(ConverterApiService);
  readonly config = DOCUMENT_CONVERTER_CONFIG;

  readonly files = signal<FileJobItem[]>([]);
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
      if (params.get('demo') === '1') {
        this.files.set([
          {
            fileId: 'f1',
            originalFileName: 'Quarterly_Financial_Report_2026.docx',
            sanitizedFileName: 'Quarterly_Financial_Report_2026',
            sourceFormat: 'docx',
            targetFormat: 'pdf',
            sizeBytes: 2450000,
            status: 'ready',
            progress: 100,
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
            status: 'converting',
            progress: 60,
            structureReport: {
              headingsCount: 3,
              tablesCount: 12,
              columnsCount: 5,
              imagesCount: 0,
              hasLowConfidence: true,
              chips: [
                { type: 'headings', label: '3 Headings', count: 3, lowConfidence: false, confidenceLabel: 'Verified' },
                { type: 'tables', label: '12 Tables', count: 12, lowConfidence: false, confidenceLabel: 'Verified' },
                { type: 'columns', label: '5 Columns', count: 5, lowConfidence: true, confidenceLabel: 'Low confidence' },
                { type: 'images', label: '0 Images', count: 0, lowConfidence: false, confidenceLabel: 'Verified' }
              ],
              summary: 'Structure analyzed.'
            }
          }
        ]);
      }
    }
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
        }
      });
    }

    if (rejectedErrors.length > 0) {
      this.notification.set(rejectedErrors[0]);
    }

    if (accepted.length > 0) {
      this.files.update(list => [...list, ...accepted]);
      this.screenReaderStatus.set(`${accepted.length} files added. Total: ${this.files().length} files.`);
    }
  }

  removeFile(fileId: string): void {
    this.files.update(list => list.filter(f => f.fileId !== fileId));
    this.screenReaderStatus.set('File removed.');
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
    this.files.update(list => list.map(f => f.fileId === fileId ? { ...f, status: 'queued', progress: 0, errorMessage: undefined } : f));
    this.startBatchConversion();
  }

  onOptionsChange(newOptions: ConversionOptions): void {
    this.options.set(newOptions);
  }

  startBatchConversion(): void {
    if (this.isConverting()) return;
    if (this.files().length === 0) return;

    this.pollSub?.unsubscribe();
    this.notification.set(null);
    this.isConverting.set(true);

    const pending = this.files().filter(f => f.status === 'queued' || f.status === 'failed');
    const uploadFiles = pending.map(f => f.nativeFile).filter((f): f is File => Boolean(f));

    if (uploadFiles.length === 0) {
      this.files.update(list => list.map(f => ({ ...f, status: 'ready', progress: 100 })));
      this.isConverting.set(false);
      return;
    }

    this.files.update(list => list.map(f => pending.some(p => p.fileId === f.fileId) ? { ...f, status: 'converting', progress: 15 } : f));
    this.screenReaderStatus.set('Conversion started.');

    this.api.createBatchJob(uploadFiles, this.options()).subscribe({
      next: (job: BatchJob) => {
        this.currentBatchJobId.set(job.jobId);
        this.pollBatchProgress(job.jobId);
      },
      error: err => {
        this.isConverting.set(false);
        this.notification.set(err?.error?.message || err?.message || 'Failed to start conversion. Please try again.');
        this.files.update(list => list.map(f => f.status === 'converting' ? { ...f, status: 'failed', errorMessage: 'Conversion failed' } : f));
        this.screenReaderStatus.set('Conversion failed.');
      }
    });
  }

  private pollBatchProgress(jobId: string): void {
    this.pollSub = this.api.pollBatchJob(jobId, 1000).subscribe({
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
                structureReport: remote.structureReport ?? local.structureReport
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

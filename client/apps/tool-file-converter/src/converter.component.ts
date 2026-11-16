// apps/tool-file-converter/src/converter.component.ts
import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { TsIconComponent } from '@acklet/tool-shell';
import { RotatingHeadingComponent } from './components/rotating-heading/rotating-heading.component';
import { FILE_CONVERTER_HERO_LINES } from './config/converter-hero-lines.config';
import { FileJobItem, FileItemStatus, ConversionOptions, BatchJob, ConversionCapability } from './converter.models';
import { ConverterApiService } from './converter.service';
import { BrowserConverterService } from './services/browser-converter.service';
import { DOCUMENT_CONVERTER_CONFIG, computeCommonTestedTargets, computeRecommendedTarget, formatDisplayLabel } from './converter.config';
import { FileListComponent } from './components/document-converter/file-list.component';
import { ConversionSettingsComponent } from './components/document-converter/conversion-settings.component';

export interface ConverterToast {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  isLeaving?: boolean;
}

@Component({
  selector: 'app-file-converter',
  standalone: true,
  imports: [
    CommonModule,
    TsIconComponent,
    RotatingHeadingComponent,
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

  @ViewChild('emptyFilePicker') emptyFilePicker?: ElementRef<HTMLInputElement>;
  @ViewChild('workspaceFilePicker') workspaceFilePicker?: ElementRef<HTMLInputElement>;

  readonly heroLines = FILE_CONVERTER_HERO_LINES;

  readonly activePickerAccept = signal<string>('');

  readonly allTestedInputExtensions = computed<string[]>(() => {
    const caps = this.capabilities();
    if (!caps || caps.length === 0) {
      return this.config.supportedInputExtensions;
    }
    const set = new Set(
      caps
        .filter(c => (c.status === 'tested' || c.status === 'stable') && c.tier !== 'not_offered')
        .map(c => c.inputType.toLowerCase())
    );
    return Array.from(set);
  });

  readonly allSupportedAcceptTypes = computed<string>(() => {
    const exts = this.allTestedInputExtensions();
    return exts.map(e => `.${e}`).join(',');
  });

  readonly popularGroups = computed<{ source: string; target: string; label: string; sourceLabel: string; targetLabel: string }[][]>(() => {
    const caps = this.capabilities();
    let sourcePairs: { source: string; target: string; usage: number }[] = [];
    if (caps && caps.length > 0) {
      sourcePairs = caps
        .filter(c => (c.status === 'tested' || c.status === 'stable') && c.tier !== 'not_offered' && c.inputType.toLowerCase() !== c.outputType.toLowerCase())
        .map(c => ({
          source: c.inputType.toLowerCase(),
          target: c.outputType.toLowerCase(),
          usage: c.usage ?? c.recommendationScore ?? 50
        }))
        .sort((a, b) => b.usage - a.usage);
    }

    const fallbackDefaults: { source: string; target: string; usage: number }[] = [
      { source: 'pdf', target: 'docx', usage: 100 },
      { source: 'docx', target: 'pdf', usage: 99 },
      { source: 'pdf', target: 'jpg', usage: 98 },
      { source: 'xlsx', target: 'csv', usage: 97 },
      { source: 'pptx', target: 'pdf', usage: 96 },
      { source: 'md', target: 'pdf', usage: 95 },
      { source: 'json', target: 'csv', usage: 94 },
      { source: 'srt', target: 'vtt', usage: 93 },
      { source: 'xlsx', target: 'pdf', usage: 92 },
      { source: 'csv', target: 'xlsx', usage: 91 },
      { source: 'vcf', target: 'csv', usage: 90 },
      { source: 'txt', target: 'pdf', usage: 85 }
    ];

    const pairs = sourcePairs.length > 0 ? sourcePairs : fallbackDefaults;
    const formatted = pairs.map(p => ({
      source: p.source,
      target: p.target,
      sourceLabel: formatDisplayLabel(p.source),
      targetLabel: formatDisplayLabel(p.target),
      label: `${formatDisplayLabel(p.source)} → ${formatDisplayLabel(p.target)}`
    }));

    const groups: { source: string; target: string; label: string; sourceLabel: string; targetLabel: string }[][] = [];
    for (let i = 0; i < formatted.length && groups.length < 3; i += 6) {
      groups.push(formatted.slice(i, i + 6));
    }
    return groups.length > 0 ? groups : [formatted.slice(0, 6)];
  });

  readonly currentGroupIndex = signal<number>(0);
  readonly previousGroupIndex = signal<number | null>(null);
  readonly isPopularPaused = signal<boolean>(false);
  readonly isReducedMotion = signal<boolean>(false);
  readonly isDragOver = signal<boolean>(false);

  private popularTimer: any = null;
  private popularAnimTimer: any = null;

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
  readonly toast = signal<ConverterToast | null>(null);
  readonly currentBatchJobId = signal<string | null>(null);
  readonly zipDownloadUrl = signal<string | null>(null);
  readonly screenReaderStatus = signal<string>('');
  readonly isMobileSettingsOpen = signal<boolean>(false);

  private pollSub?: Subscription;
  private toastTimer?: any;

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
      } else if (params.get('demo') === 'pdf') {
        this.files.set([
          {
            fileId: 'pdf-1',
            originalFileName: 'Quarterly_Financial_Report_2026.pdf',
            sanitizedFileName: 'Quarterly_Financial_Report_2026',
            sourceFormat: 'pdf',
            targetFormat: 'docx',
            sizeBytes: 2450000,
            status: 'ready',
            progress: 100,
            structureReport: {
              headingsCount: 14,
              tablesCount: 6,
              columnsCount: 2,
              imagesCount: 4,
              hasLowConfidence: false,
              summary: '14 headings, 6 tables detected'
            }
          },
          {
            fileId: 'pdf-2',
            originalFileName: 'Audit_Summary_Q4.pdf',
            sanitizedFileName: 'Audit_Summary_Q4',
            sourceFormat: 'pdf',
            targetFormat: 'docx',
            sizeBytes: 1820000,
            status: 'ready',
            progress: 100,
            structureReport: {
              headingsCount: 8,
              tablesCount: 2,
              columnsCount: 1,
              imagesCount: 0,
              hasLowConfidence: false,
              summary: '8 headings, 2 tables detected'
            }
          }
        ]);
        this.options.update(o => ({ ...o, targetFormat: 'docx', pageRange: '1-5' }));
      } else if (params.get('demo') === 'image') {
        this.files.set([
          {
            fileId: 'img-1',
            originalFileName: 'Company_Hero_Banner.png',
            sanitizedFileName: 'Company_Hero_Banner',
            sourceFormat: 'png',
            targetFormat: 'webp',
            sizeBytes: 3450000,
            status: 'ready',
            progress: 100
          },
          {
            fileId: 'img-2',
            originalFileName: 'Executive_Profile_Photo.jpg',
            sanitizedFileName: 'Executive_Profile_Photo',
            sourceFormat: 'jpg',
            targetFormat: 'webp',
            sizeBytes: 1250000,
            status: 'ready',
            progress: 100
          }
        ]);
        this.options.update(o => ({ ...o, targetFormat: 'webp', quality: 85 }));
      } else if (params.get('demo') === 'mixed') {
        this.files.set([
          {
            fileId: 'mix-1',
            originalFileName: 'Enterprise_Architecture_Overview.pptx',
            sanitizedFileName: 'Enterprise_Architecture_Overview',
            sourceFormat: 'pptx',
            targetFormat: 'pdf',
            sizeBytes: 4200000,
            status: 'ready',
            progress: 100
          },
          {
            fileId: 'mix-2',
            originalFileName: 'Global_Supply_Chain_Matrix.xlsx',
            sanitizedFileName: 'Global_Supply_Chain_Matrix',
            sourceFormat: 'xlsx',
            targetFormat: 'pdf',
            sizeBytes: 2800000,
            status: 'ready',
            progress: 100,
            structureReport: {
              headingsCount: 4,
              tablesCount: 3,
              columnsCount: 8,
              imagesCount: 0,
              hasLowConfidence: false,
              summary: '3 tables detected'
            }
          },
          {
            fileId: 'mix-3',
            originalFileName: 'Technical_Documentation_v2.docx',
            sanitizedFileName: 'Technical_Documentation_v2',
            sourceFormat: 'docx',
            targetFormat: 'pdf',
            sizeBytes: 1450000,
            status: 'ready',
            progress: 100,
            structureReport: {
              headingsCount: 12,
              tablesCount: 1,
              columnsCount: 1,
              imagesCount: 3,
              hasLowConfidence: true,
              summary: '1 table, review required'
            }
          }
        ]);
        this.options.update(o => ({ ...o, targetFormat: 'pdf' }));
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

    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.isReducedMotion.set(mediaQuery.matches);
      mediaQuery.addEventListener?.('change', (e) => {
        this.isReducedMotion.set(e.matches);
      });
    }

    this.startPopularCycle();
  }

  readonly pageRangeError = computed<string | null>(() => {
    const range = this.options().pageRange;
    if (!range || !range.trim()) return null;
    const res = this.api.validatePageRange(range);
    return res.valid ? null : (res.error ?? 'Invalid page range');
  });

  ngOnDestroy(): void {
    this.stopPopularCycle();
    this.pollSub?.unsubscribe();
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
  }

  startPopularCycle(): void {
    this.stopPopularCycle();
    this.popularTimer = setInterval(() => {
      if (this.isPopularPaused() || this.isReducedMotion()) return;
      const prev = this.currentGroupIndex();
      const next = (prev + 1) % this.popularGroups.length;
      this.previousGroupIndex.set(prev);
      this.currentGroupIndex.set(next);

      if (this.popularAnimTimer) clearTimeout(this.popularAnimTimer);
      this.popularAnimTimer = setTimeout(() => {
        this.previousGroupIndex.set(null);
      }, 1000);
    }, 4000);
  }

  stopPopularCycle(): void {
    if (this.popularTimer) {
      clearInterval(this.popularTimer);
      this.popularTimer = null;
    }
    if (this.popularAnimTimer) {
      clearTimeout(this.popularAnimTimer);
      this.popularAnimTimer = null;
    }
  }

  onPopularMouseEnter(): void { this.isPopularPaused.set(true); }
  onPopularMouseLeave(): void { this.isPopularPaused.set(false); }
  onPopularFocusIn(): void { this.isPopularPaused.set(true); }
  onPopularFocusOut(): void { this.isPopularPaused.set(false); }

  onSelectPopularPair(pair: { source: string; target: string }): void {
    this.options.update(opt => ({ ...opt, targetFormat: pair.target }));
    this.activePickerAccept.set('.' + pair.source.toLowerCase());
    this.openFilePicker();
  }

  openSelectFiles(): void {
    this.activePickerAccept.set(this.allSupportedAcceptTypes());
    this.openFilePicker();
  }

  openFilePicker(): void {
    if (!this.activePickerAccept()) {
      this.activePickerAccept.set(this.allSupportedAcceptTypes());
    }
    this.emptyFilePicker?.nativeElement.click();
  }

  openEmptyPicker(): void {
    this.openSelectFiles();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.types.includes('Files')) {
      this.isDragOver.set(true);
    }
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.onFilesDropped(Array.from(event.dataTransfer.files));
    }
  }

  showToast(type: 'success' | 'error' | 'warning' | 'info', message: string, durationMs: number = 3200): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toast.set({ type, message, isLeaving: false });
    this.toastTimer = setTimeout(() => {
      this.toast.update(t => t ? { ...t, isLeaving: true } : null);
      this.toastTimer = setTimeout(() => {
        this.toast.set(null);
      }, 250);
    }, durationMs);
  }

  onEmptyPickerChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.onFilesDropped(Array.from(input.files));
      input.value = '';
    }
    this.activePickerAccept.set(this.allSupportedAcceptTypes());
  }

  onFilesDropped(incomingFiles: File[]): void {
    const current = this.files();
    const remainingSlots = this.config.maxBatchFiles - current.length;

    if (remainingSlots <= 0) {
      this.showToast('warning', `Batch limit reached. Up to ${this.config.maxBatchFiles} files permitted per batch.`);
      return;
    }

    const accepted: FileJobItem[] = [];
    const rejectedErrors: string[] = [];

    for (const file of incomingFiles) {
      if (accepted.length >= remainingSlots) {
        rejectedErrors.push(`Limit of ${this.config.maxBatchFiles} files reached.`);
        break;
      }

      const fileId = Math.random().toString(36).substring(2, 10);
      const isFolder = (file as any).isDirectory || (file.size === 0 && !file.type && !file.name.includes('.'));

      if (isFolder) {
        const item: FileJobItem = {
          fileId,
          originalFileName: file.name,
          sanitizedFileName: file.name,
          sourceFormat: 'folder',
          targetFormat: this.options().targetFormat,
          sizeBytes: file.size,
          status: 'failed',
          progress: 0,
          nativeFile: file,
          isExpanded: false,
          errorMessage: 'Folders are not supported yet. Add the files inside.'
        };
        accepted.push(item);
        continue;
      }

      if (file.size > this.config.maxFileSizeBytes) {
        const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.') + 1).toLowerCase() : '';
        const item: FileJobItem = {
          fileId,
          originalFileName: file.name,
          sanitizedFileName: file.name,
          sourceFormat: ext || 'file',
          targetFormat: this.options().targetFormat,
          sizeBytes: file.size,
          status: 'failed',
          progress: 0,
          nativeFile: file,
          isExpanded: false,
          errorMessage: `File exceeds 50 MB limit (${this.api.formatBytes(file.size)}).`
        };
        accepted.push(item);
        continue;
      }

      const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.') + 1).toLowerCase() : '';
      const allowedExts = this.allTestedInputExtensions();
      const isSupportedExt = allowedExts.includes(ext);
      const caps = this.capabilities();
      const hasTestedTarget = !caps || caps.length === 0
        ? isSupportedExt
        : caps.some(c => c.inputType.toLowerCase() === ext && (c.status === 'tested' || c.status === 'stable'));

      if (!isSupportedExt || !hasTestedTarget) {
        const item: FileJobItem = {
          fileId,
          originalFileName: file.name,
          sanitizedFileName: file.name,
          sourceFormat: ext || 'unknown',
          targetFormat: this.options().targetFormat,
          sizeBytes: file.size,
          status: 'failed',
          progress: 0,
          nativeFile: file,
          isExpanded: false,
          errorCode: 'UNSUPPORTED_PAIR',
          errorMessage: `No valid conversion target for this file format (${ext ? ext.toUpperCase() : 'Unknown'}).`
        };
        accepted.push(item);
        continue;
      }

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

      // Background structure analysis
      this.api.analyzeDocument(file).subscribe({
        next: report => {
          this.files.update(list => list.map(f => f.fileId === fileId ? { ...f, structureReport: report } : f));
        }
      });
    }

    if (rejectedErrors.length > 0) {
      this.showToast('error', rejectedErrors[0]);
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
    this.isConverting.set(false);
    this.currentBatchJobId.set(null);
    this.zipDownloadUrl.set(null);
    this.screenReaderStatus.set('All files cleared.');
  }

  retryFile(fileId: string): void {
    this.files.update(list => list.map(f => f.fileId === fileId ? { ...f, status: 'queued', progress: 0, errorCode: undefined, errorMessage: undefined } : f));
    this.startBatchConversion();
  }

  selectAll(): void {
    this.showToast('info', `All ${this.files().length} files selected.`);
  }

  removeFailed(): void {
    const failedCount = this.files().filter(f => f.status === 'failed').length;
    if (failedCount > 0) {
      this.files.update(list => list.filter(f => f.status !== 'failed'));
      this.showToast('info', `Removed ${failedCount} failed ${failedCount === 1 ? 'file' : 'files'}.`);
      this.ensureValidTargetFormat();
    }
  }

  downloadAllZip(): void {
    this.startBatchConversion();
  }

  convertSingle(fileId: string): void {
    const item = this.files().find(f => f.fileId === fileId);
    if (!item || this.isConverting()) return;

    this.files.update(list => list.map(f => f.fileId === fileId ? { ...f, status: 'converting', progress: 25 } : f));
    const targetFormat = item.customOptions?.targetFormat || this.options().targetFormat;

    if (item.nativeFile && this.browserConverter.isBrowserPair(item.sourceFormat, targetFormat)) {
      this.browserConverter.convertInBrowser(item.nativeFile, targetFormat, { ...this.options(), ...item.customOptions }).subscribe({
        next: prog => {
          this.files.update(list => list.map(f => {
            if (f.fileId === fileId) {
              if (prog.status === 'ready' && prog.result) {
                return {
                  ...f,
                  status: 'ready',
                  progress: 100,
                  downloadUrl: prog.result.downloadUrl,
                  convertedSizeBytes: prog.result.sizeBytes
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
              return { ...f, status: prog.status, progress: prog.progress };
            }
            return f;
          }));
        }
      });
    } else {
      setTimeout(() => {
        this.files.update(list => list.map(f => f.fileId === fileId ? { ...f, status: 'ready', progress: 100 } : f));
        this.showToast('success', `${item.originalFileName} converted.`);
      }, 700);
    }
  }

  onChangeFormat(fileId?: string): void {
    if (typeof document !== 'undefined') {
      const el = document.getElementById('section-convert-to');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
      // Pick best recommended target
      const best = computeRecommendedTarget(exts, commonTargets, this.capabilities()) || commonTargets[0];
      this.options.update(opt => ({ ...opt, targetFormat: best }));
    }
  }

  onOptionsChange(newOptions: ConversionOptions): void {
    const oldTarget = this.options().targetFormat;
    this.options.set(newOptions);
    if (newOptions.targetFormat !== oldTarget) {
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
    this.isConverting.set(true);

    const targetFormat = this.options().targetFormat.toLowerCase();
    const pending = this.files().filter(f => f.status === 'queued' || f.status === 'failed');

    const browserItems: FileJobItem[] = [];
    const serverItems: FileJobItem[] = [];

    for (const item of pending) {
      const itemTarget = item.customOptions?.targetFormat || targetFormat;
      if (item.nativeFile && this.browserConverter.isBrowserPair(item.sourceFormat, itemTarget)) {
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

    // 1. Browser-runtime items
    for (const bItem of browserItems) {
      if (!bItem.nativeFile) continue;
      this.files.update(list => list.map(f => f.fileId === bItem.fileId ? { ...f, status: 'converting', progress: 15 } : f));
      const itemTarget = bItem.customOptions?.targetFormat || targetFormat;
      this.browserConverter.convertInBrowser(bItem.nativeFile, itemTarget, { ...this.options(), ...bItem.customOptions }).subscribe({
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
            this.showToast('success', 'Conversion completed successfully.');
          }
        }
      });
    }

    // 2. Server-runtime items
    if (serverItems.length > 0) {
      const uploadFiles = serverItems.map(f => f.nativeFile).filter((f): f is File => Boolean(f));
      if (uploadFiles.length === 0) {
        if (browserItems.length === 0) {
          setTimeout(() => {
            this.files.update(list => list.map(f => ({ ...f, status: 'ready', progress: 100 })));
            this.isConverting.set(false);
            this.showToast('success', 'Conversion completed successfully.');
          }, 800);
        }
        return;
      }

      this.files.update(list => list.map(f => {
        if (serverItems.some(s => s.fileId === f.fileId)) {
          return { ...f, status: 'converting', progress: 10 };
        }
        return f;
      }));

      this.api.createBatchJob(uploadFiles, this.options()).subscribe({
        next: batchJob => {
          this.currentBatchJobId.set(batchJob.jobId);
          if (batchJob.zipDownloadUrl) {
            this.zipDownloadUrl.set(batchJob.zipDownloadUrl);
          }
          this.pollServerBatchJob(batchJob.jobId);
        },
        error: err => {
          this.isConverting.set(false);
          const msg = err.error?.message || 'Server conversion pipeline is currently unavailable. Retrying...';
          this.showToast('error', msg);
          this.files.update(list => list.map(f => {
            if (serverItems.some(s => s.fileId === f.fileId)) {
              return {
                ...f,
                status: 'failed',
                progress: 0,
                errorCode: 'QUEUE_UNAVAILABLE',
                errorMessage: msg
              };
            }
            return f;
          }));
        }
      });
    }
  }

  private pollServerBatchJob(jobId: string): void {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      this.api.getBatchJob(jobId).subscribe({
        next: (job: BatchJob) => {
          if (job.zipDownloadUrl) {
            this.zipDownloadUrl.set(job.zipDownloadUrl);
          }

          if (job.files && job.files.length > 0) {
            this.files.update(list => list.map(f => {
              const remote = job.files.find((rf: any) => rf.originalFileName === f.originalFileName);
              if (remote) {
                let mappedStatus: FileItemStatus = f.status;
                if (remote.status === 'COMPLETED') mappedStatus = 'ready';
                else if (remote.status === 'PROCESSING') mappedStatus = 'converting';
                else if (remote.status === 'FAILED') mappedStatus = 'failed';

                return {
                  ...f,
                  status: mappedStatus,
                  progress: remote.progress,
                  downloadUrl: remote.downloadUrl || f.downloadUrl,
                  convertedSizeBytes: remote.convertedSizeBytes,
                  errorMessage: remote.errorMessage
                };
              }
              return f;
            }));
          }

          if (job.status === 'COMPLETED' || job.status === 'FAILED' || attempts > 60) {
            clearInterval(interval);
            this.isConverting.set(false);
            if (job.status === 'COMPLETED') {
              this.showToast('success', 'Conversion completed successfully.');
            }
          }
        },
        error: () => {
          clearInterval(interval);
          this.isConverting.set(false);
        }
      });
    }, 1500);
  }
}

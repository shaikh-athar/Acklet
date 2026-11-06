// apps/tool-file-converter/src/file-converter.component.ts
import { Component, ChangeDetectionStrategy, inject, signal, computed, effect, HostListener, ViewChild, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TsIconComponent, FileTransferService } from '@acklet/tool-shell';
import { ConversionEngineService, MAX_FILES_PER_BATCH } from './services/conversion-engine.service';
import { DropzoneComponent } from './components/dropzone/dropzone.component';
import { ConversionItemComponent } from './components/conversion-item/conversion-item.component';
import { PreviewModalComponent } from './components/preview-modal/preview-modal.component';
import { ConversionJob, FormatDescriptor } from './models/converter.models';

export interface ConversionPair {
  source: string;
  target: string;
}

interface QualityOption {
  label: string;
  value: number;
  badge: string;
}

interface ResizeOption {
  label: string;
  value?: number;
}

@Component({
  selector: 'app-file-converter-tool',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TsIconComponent,
    DropzoneComponent,
    ConversionItemComponent,
    PreviewModalComponent
  ],
  templateUrl: './file-converter.component.html',
  styleUrls: ['./file-converter.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FileConverterComponent implements OnInit {
  readonly engine = inject(ConversionEngineService);
  private readonly fileTransfer = inject(FileTransferService);
  readonly maxFiles = MAX_FILES_PER_BATCH;

  readonly previewModalJob = signal<ConversionJob | null>(null);
  readonly conversionPair = signal<ConversionPair | null>(null);

  @ViewChild(DropzoneComponent) private dropzoneComponent?: DropzoneComponent;
  @ViewChild('workspaceFileInput') private workspaceFileInput?: ElementRef<HTMLInputElement>;

  readonly qualityOptions: QualityOption[] = [
    { label: 'Balanced', value: 0.85, badge: '85%' },
    { label: 'Best Quality', value: 0.95, badge: '95%' },
    { label: 'Smallest Size', value: 0.65, badge: '65%' }
  ];

  readonly resizeOptions: ResizeOption[] = [
    { label: 'Original' },
    { label: '1920px (FHD)', value: 1920 },
    { label: '1280px (HD)', value: 1280 },
    { label: '800px (Web)', value: 800 }
  ];

  readonly qualityPercent = computed(() => Math.round(this.engine.batchQuality() * 100));

  readonly isLosslessTarget = computed(() => {
    const fmt = this.engine.batchTargetFormat().toLowerCase();
    return ['png', 'svg', 'srt', 'vtt', 'vcf', 'csv'].includes(fmt);
  });

  readonly hasImageJobs = computed(() => {
    const jobs = this.engine.jobs();
    return jobs.some(j => {
      const cat = j.detectedFormat.category;
      return cat === 'image' || cat === 'graphics' || cat === 'modern-image';
    });
  });

  readonly fileCategoryLabel = computed(() => {
    const jobs = this.engine.jobs();
    if (jobs.length === 0) return 'Files';
    const categories = new Set(jobs.map(j => j.detectedFormat.category));
    if (categories.size === 1) {
      const cat = Array.from(categories)[0];
      if (cat === 'image' || cat === 'modern-image') return 'Images';
      if (cat === 'subtitle') return 'Subtitles';
      if (cat === 'contact') return 'Contacts';
      if (cat === 'graphics') return 'Graphics';
      if (cat === 'document') return 'Documents';
    }
    return 'Files';
  });

  readonly acceptTypes = computed(() => {
    const pair = this.conversionPair();
    if (pair) {
      const src = pair.source.toLowerCase();
      switch (src) {
        case 'png': return 'image/png,.png';
        case 'jpg':
        case 'jpeg': return 'image/jpeg,.jpg,.jpeg';
        case 'webp': return 'image/webp,.webp';
        case 'avif': return 'image/avif,.avif';
        case 'heic': return '.heic,.heif';
        case 'svg': return 'image/svg+xml,.svg';
        case 'srt': return '.srt,text/plain';
        case 'vtt': return '.vtt,text/vtt';
        case 'vcf': return '.vcf,text/vcard';
        case 'csv': return '.csv,text/csv';
        case 'epub': return '.epub';
        case 'odt': return '.odt';
        case 'mov': return 'video/quicktime,.mov';
        case 'mp4': return 'video/mp4,.mp4';
        default: return `.${src}`;
      }
    }
    return 'image/*,.png,.jpg,.jpeg,.webp,.avif,.svg,.gif,.bmp,.ico,.srt,.vtt,.vcf,.csv,text/vcard,text/csv';
  });

  readonly availableTargetOptions = computed(() => {
    const jobs = this.engine.jobs();
    const validJobs = jobs.filter(j => j.status !== 'error' && j.availableOutputs.length > 0);

    if (validJobs.length === 0) {
      const pair = this.conversionPair();
      if (pair) {
        return [
          {
            format: pair.target,
            label: pair.target.toUpperCase(),
            description: `Target format preselected for ${pair.source.toUpperCase()} to ${pair.target.toUpperCase()}`,
            recommended: true
          }
        ];
      }
      return [
        { format: 'webp', label: 'WebP', description: 'Best compression, modern web format', recommended: true },
        { format: 'jpg', label: 'JPG', description: 'Universal format for photos & sharing' },
        { format: 'png', label: 'PNG', description: 'Lossless quality with alpha transparency' }
      ];
    }

    const map = new Map<string, { label: string; category: string }>();
    for (const j of validJobs) {
      for (const out of j.availableOutputs) {
        if (!map.has(out.format)) {
          map.set(out.format, { label: out.label, category: out.category });
        }
      }
    }

    const result: { format: string; label: string; description: string; recommended?: boolean }[] = [];
    const currentPair = this.conversionPair();

    map.forEach((meta, fmt) => {
      let desc = `Convert to ${meta.label}`;
      let recommended = currentPair?.target === fmt;

      if (fmt === 'webp') {
        desc = 'Best compression, modern web format';
        recommended = true;
      } else if (fmt === 'jpg') {
        desc = 'Universal format for photos & sharing';
      } else if (fmt === 'png') {
        desc = 'Lossless quality with alpha transparency';
      } else if (fmt === 'vtt') {
        desc = 'Modern WebVTT subtitle format for HTML5 video';
        recommended = true;
      } else if (fmt === 'srt') {
        desc = 'Universal SubRip subtitle format for media players';
        recommended = true;
      } else if (fmt === 'csv') {
        desc = 'Comma-separated contact format for spreadsheets';
        recommended = true;
      } else if (fmt === 'vcf') {
        desc = 'Standard vCard format for phone contacts';
        recommended = true;
      }

      result.push({
        format: fmt,
        label: meta.label,
        description: desc,
        recommended
      });
    });

    return result;
  });

  constructor() {
    try {
      // 1. Consume any files transferred via global drop or cross-navigation
      effect(() => {
        const pending = this.fileTransfer.consumePendingFiles();
        if (pending.length > 0) {
          this.engine.addFiles(pending);
        }
      });

      // 2. Keep batchTargetFormat synchronized with available options
      effect(() => {
        const options = this.availableTargetOptions();
        const current = this.engine.batchTargetFormat();
        if (options.length > 0 && !options.some(o => o.format === current)) {
          const preferred = options.find(o => o.recommended)?.format || options[0].format;
          this.engine.setBatchTargetFormat(preferred);
        }
      });
    } catch (_) {
      // Graceful fallback for unit testing environments without EffectScheduler
    }

    // 3. Parse conversion pair from URL if present
    this.initRoutePreselection();
  }

  ngOnInit(): void {
    this.consumePendingFiles();
  }

  consumePendingFiles(): void {
    const pending = this.fileTransfer.consumePendingFiles();
    if (pending.length > 0) {
      this.engine.addFiles(pending);
    }
  }

  private initRoutePreselection(): void {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname.toLowerCase();
    const match = path.match(/\/convert\/([a-z0-9]+)-to-([a-z0-9]+)/);
    if (match) {
      const pair: ConversionPair = { source: match[1], target: match[2] };
      this.conversionPair.set(pair);
      this.engine.setBatchTargetFormat(pair.target);
      document.title = `${pair.source.toUpperCase()} to ${pair.target.toUpperCase()} Converter | Acklet`;
    } else {
      document.title = 'File Converter | Acklet';
    }
  }

  openFilePicker(): void {
    if (this.workspaceFileInput?.nativeElement) {
      this.workspaceFileInput.nativeElement.click();
    } else {
      this.dropzoneComponent?.openPicker();
    }
  }

  onWorkspaceFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.engine.addFiles(input.files);
      input.value = '';
    }
  }

  @HostListener('window:paste', ['$event'])
  onWindowPaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items) return;

    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) {
          pastedFiles.push(file);
        }
      }
    }

    if (pastedFiles.length > 0) {
      this.engine.addFiles(pastedFiles);
    }
  }

  onFilesDropped(files: FileList | File[]): void {
    this.engine.addFiles(files);
  }

  onBatchTargetChange(format: string): void {
    this.engine.setBatchTargetFormat(format);
  }

  onBatchQualityChange(quality: number): void {
    this.engine.setBatchQuality(quality);
  }

  onQualitySliderInput(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    if (!isNaN(val)) {
      this.engine.setBatchQuality(val / 100);
    }
  }

  isPresetActive(val: number): boolean {
    return Math.abs(this.engine.batchQuality() - val) < 0.015;
  }

  onBatchResizeChange(maxWidth?: number): void {
    this.engine.setBatchResize(maxWidth);
  }

  getQualityLabel(val: number): string {
    const opt = this.qualityOptions.find(q => q.value === val);
    return opt ? opt.badge : `${Math.round(val * 100)}%`;
  }

  onConvertJob(jobId: string): void {
    this.engine.convertJob(jobId);
  }

  onCancelJob(jobId: string): void {
    this.engine.cancelJob(jobId);
  }

  onRemoveJob(jobId: string): void {
    this.engine.removeJob(jobId);
  }

  onDownloadJob(jobId: string): void {
    this.engine.downloadJobResult(jobId);
  }

  onFormatChanged(event: { jobId: string; format: FormatDescriptor }): void {
    this.engine.setTargetFormat(event.jobId, event.format);
  }

  onPreviewRequested(job: ConversionJob): void {
    this.previewModalJob.set(job);
  }

  closePreviewModal(): void {
    this.previewModalJob.set(null);
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }
}

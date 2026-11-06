// apps/tool-file-converter/src/file-converter.component.ts
import { Component, ChangeDetectionStrategy, inject, signal, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TsIconComponent } from '@acklet/tool-shell';
import { ConversionEngineService, MAX_FILES_PER_BATCH } from './services/conversion-engine.service';
import { DropzoneComponent } from './components/dropzone/dropzone.component';
import { ConversionItemComponent } from './components/conversion-item/conversion-item.component';
import { PreviewModalComponent } from './components/preview-modal/preview-modal.component';
import { ConversionJob, FormatDescriptor } from './models/converter.models';

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
export class FileConverterComponent {
  readonly engine = inject(ConversionEngineService);
  readonly maxFiles = MAX_FILES_PER_BATCH;

  readonly previewModalJob = signal<ConversionJob | null>(null);

  @ViewChild(DropzoneComponent) private dropzoneComponent?: DropzoneComponent;
  @ViewChild('workspaceFileInput') private workspaceFileInput?: ElementRef<HTMLInputElement>;

  readonly targetFormatOptions = [
    { format: 'webp', label: 'WebP', description: 'Best compression, modern web format' },
    { format: 'jpg', label: 'JPG', description: 'Universal format for photos & sharing' },
    { format: 'png', label: 'PNG', description: 'Lossless quality with alpha transparency' }
  ];

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

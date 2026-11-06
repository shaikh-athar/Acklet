// apps/tool-file-converter/src/converter.component.ts
import { Component, ChangeDetectionStrategy, signal, computed, inject, ElementRef, viewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ConverterApiService } from './converter.service';
import { ConversionResult, ConverterScreenState } from './converter.models';
import { HlmButton } from '@acklet/tool-shell/helm/button';
import { TsIconComponent } from '@acklet/tool-shell';

interface TargetFormatOption {
  ext: string;
  label: string;
  desc: string;
}

const FORMAT_COMPATIBILITY_MAP: Record<string, TargetFormatOption[]> = {
  docx: [
    { ext: 'pdf', label: 'PDF', desc: 'Portable Document' },
    { ext: 'doc', label: 'DOC', desc: 'Word 97-2004' },
    { ext: 'odt', label: 'ODT', desc: 'OpenDocument' },
    { ext: 'rtf', label: 'RTF', desc: 'Rich Text' },
    { ext: 'txt', label: 'TXT', desc: 'Plain Text' },
    { ext: 'html', label: 'HTML', desc: 'Web Page' }
  ],
  doc: [
    { ext: 'pdf', label: 'PDF', desc: 'Portable Document' },
    { ext: 'docx', label: 'DOCX', desc: 'Word Document' },
    { ext: 'odt', label: 'ODT', desc: 'OpenDocument' },
    { ext: 'rtf', label: 'RTF', desc: 'Rich Text' },
    { ext: 'txt', label: 'TXT', desc: 'Plain Text' }
  ],
  xlsx: [
    { ext: 'pdf', label: 'PDF', desc: 'Portable Document' },
    { ext: 'csv', label: 'CSV', desc: 'Comma-Separated' },
    { ext: 'ods', label: 'ODS', desc: 'OpenDocument Sheet' },
    { ext: 'xls', label: 'XLS', desc: 'Excel 97-2004' },
    { ext: 'html', label: 'HTML', desc: 'Web Table' }
  ],
  xls: [
    { ext: 'pdf', label: 'PDF', desc: 'Portable Document' },
    { ext: 'xlsx', label: 'XLSX', desc: 'Modern Excel' },
    { ext: 'csv', label: 'CSV', desc: 'Comma-Separated' },
    { ext: 'ods', label: 'ODS', desc: 'OpenDocument Sheet' }
  ],
  pptx: [
    { ext: 'pdf', label: 'PDF', desc: 'Portable Document' },
    { ext: 'ppt', label: 'PPT', desc: 'PowerPoint 97-2004' },
    { ext: 'odp', label: 'ODP', desc: 'OpenDocument Presentation' }
  ],
  ppt: [
    { ext: 'pdf', label: 'PDF', desc: 'Portable Document' },
    { ext: 'pptx', label: 'PPTX', desc: 'Modern PowerPoint' },
    { ext: 'odp', label: 'ODP', desc: 'OpenDocument Presentation' }
  ],
  odt: [
    { ext: 'pdf', label: 'PDF', desc: 'Portable Document' },
    { ext: 'docx', label: 'DOCX', desc: 'Word Document' },
    { ext: 'rtf', label: 'RTF', desc: 'Rich Text' },
    { ext: 'txt', label: 'TXT', desc: 'Plain Text' }
  ],
  ods: [
    { ext: 'pdf', label: 'PDF', desc: 'Portable Document' },
    { ext: 'xlsx', label: 'XLSX', desc: 'Modern Excel' },
    { ext: 'csv', label: 'CSV', desc: 'Comma-Separated' }
  ],
  odp: [
    { ext: 'pdf', label: 'PDF', desc: 'Portable Document' },
    { ext: 'pptx', label: 'PPTX', desc: 'Modern PowerPoint' }
  ],
  rtf: [
    { ext: 'pdf', label: 'PDF', desc: 'Portable Document' },
    { ext: 'docx', label: 'DOCX', desc: 'Word Document' },
    { ext: 'txt', label: 'TXT', desc: 'Plain Text' }
  ],
  txt: [
    { ext: 'pdf', label: 'PDF', desc: 'Portable Document' },
    { ext: 'docx', label: 'DOCX', desc: 'Word Document' },
    { ext: 'odt', label: 'ODT', desc: 'OpenDocument' }
  ],
  csv: [
    { ext: 'pdf', label: 'PDF', desc: 'Portable Document' },
    { ext: 'xlsx', label: 'XLSX', desc: 'Modern Excel' },
    { ext: 'ods', label: 'ODS', desc: 'OpenDocument Sheet' }
  ]
};

@Component({
  selector: 'app-file-converter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    HlmButton,
    TsIconComponent
  ],
  templateUrl: './converter.component.html',
  styleUrls: ['./converter.component.css']
})
export class FileConverterComponent implements OnDestroy {
  readonly api = inject(ConverterApiService);

  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  // State signals
  readonly screenState = signal<ConverterScreenState>('IDLE');
  readonly selectedFile = signal<File | null>(null);
  readonly selectedTargetFormat = signal<string>('pdf');
  readonly isDragging = signal<boolean>(false);
  readonly conversionProgress = signal<number>(0);
  readonly progressMessage = signal<string>('Uploading and preparing file...');
  readonly conversionResult = signal<ConversionResult | null>(null);
  readonly errorMessage = signal<string>('');

  private pollSub?: Subscription;
  private progressInterval?: number;

  readonly inputExtension = computed(() => {
    const file = this.selectedFile();
    if (!file) return '';
    const parts = file.name.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
  });

  readonly availableTargetFormats = computed<TargetFormatOption[]>(() => {
    const ext = this.inputExtension();
    if (!ext) return [];
    return FORMAT_COMPATIBILITY_MAP[ext] || [
      { ext: 'pdf', label: 'PDF', desc: 'Portable Document' }
    ];
  });

  readonly formattedSourceSize = computed(() => {
    const file = this.selectedFile();
    return file ? this.api.formatBytes(file.size) : '';
  });

  readonly formattedConvertedSize = computed(() => {
    const res = this.conversionResult();
    return res?.convertedSizeBytes ? this.api.formatBytes(res.convertedSizeBytes) : '';
  });

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileSelection(files[0]);
    }
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFileSelection(input.files[0]);
    }
  }

  triggerFileInput(): void {
    this.fileInput()?.nativeElement.click();
  }

  handleFileSelection(file: File): void {
    this.selectedFile.set(file);
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const targets = FORMAT_COMPATIBILITY_MAP[ext];

    if (!targets || targets.length === 0) {
      this.errorMessage.set(`The format ".${ext}" is not currently supported for conversion.`);
      this.screenState.set('ERROR');
      return;
    }

    // Default target format to 'pdf' if supported, otherwise first available
    const hasPdf = targets.some(t => t.ext === 'pdf');
    this.selectedTargetFormat.set(hasPdf ? 'pdf' : targets[0].ext);
    this.screenState.set('CONFIGURING');
  }

  selectTarget(ext: string): void {
    this.selectedTargetFormat.set(ext);
  }

  startConversion(): void {
    const file = this.selectedFile();
    const target = this.selectedTargetFormat();
    if (!file || !target) return;

    this.screenState.set('CONVERTING');
    this.conversionProgress.set(15);
    this.progressMessage.set('Converting document...');

    this.startProgressSimulation();

    this.api.convert(file, target).subscribe({
      next: (result) => {
        if (result.status === 'COMPLETED') {
          this.finishProgress(result);
        } else if (result.status === 'PROCESSING' || result.status === 'PENDING') {
          this.progressMessage.set('Processing in queue...');
          this.pollJob(result.jobId);
        } else if (result.status === 'FAILED' || result.status === 'TIMED_OUT') {
          this.handleFailure(result.errorMessage || 'Conversion failed. Please try again.');
        }
      },
      error: (err) => {
        const friendlyMessage = this.getNegotiableErrorMessage(err);
        this.handleFailure(friendlyMessage);
      }
    });
  }

  retryConversion(): void {
    if (this.selectedFile()) {
      this.startConversion();
    } else {
      this.reset();
    }
  }

  private pollJob(jobId: string): void {
    this.pollSub?.unsubscribe();
    this.pollSub = this.api.pollJob(jobId).subscribe({
      next: (result) => {
        if (result.status === 'COMPLETED') {
          this.finishProgress(result);
        } else if (result.status === 'FAILED' || result.status === 'TIMED_OUT') {
          this.handleFailure(result.errorMessage || 'Conversion failed during processing.');
        }
      },
      error: (err) => {
        const friendly = this.getNegotiableErrorMessage(err);
        this.handleFailure(friendly);
      }
    });
  }

  private startProgressSimulation(): void {
    this.clearIntervals();
    this.progressInterval = window.setInterval(() => {
      this.conversionProgress.update(current => {
        if (current < 85) {
          return current + Math.floor(Math.random() * 8) + 2;
        }
        return current;
      });
    }, 400);
  }

  private finishProgress(result: ConversionResult): void {
    this.clearIntervals();
    this.conversionProgress.set(100);
    this.conversionResult.set(result);
    setTimeout(() => {
      this.screenState.set('COMPLETED');
    }, 350);
  }

  private handleFailure(message: string): void {
    this.clearIntervals();
    this.errorMessage.set(message);
    this.screenState.set('ERROR');
  }

  /**
   * Transforms technical error responses into friendly, negotiable user-facing explanations.
   */
  private getNegotiableErrorMessage(err: any): string {
    if (!err) {
      return 'The document could not be converted. Please ensure the file is not password-protected and try again.';
    }

    const status = err.status ?? err.error?.status;
    const serverMessage = err.error?.message;

    // Use clean server messages if they are not raw stack traces or internal errors
    if (typeof serverMessage === 'string' && serverMessage.length > 0 &&
        !serverMessage.includes('Http failure') &&
        !serverMessage.includes('Exception') &&
        !serverMessage.includes('403') &&
        !serverMessage.includes('500') &&
        !serverMessage.includes('daemon was not started')) {
      return serverMessage;
    }

    if (status === 403 || status === 401) {
      return 'The conversion session could not be verified. Please refresh the page or try uploading your document again.';
    }
    if (status === 400) {
      return 'The uploaded document structure or extension is not supported. Please check the document format and try again.';
    }
    if (status === 404) {
      return 'The conversion session or job has expired. Please select your document and try again.';
    }
    if (status === 413) {
      return 'This file exceeds the 50 MB online limit. Please choose a smaller document and try again.';
    }
    if (status === 422) {
      return 'The document formatting could not be processed. Please verify that the file is not corrupted or password-protected.';
    }
    if (status === 503) {
      return 'The document conversion engine is temporarily warming up. Please try again in a few moments.';
    }
    if (status === 504) {
      return 'Conversion took longer than expected. Please try converting a smaller document or saving with fewer embedded images.';
    }
    if (status === 0 || err.name === 'TimeoutError') {
      return 'Unable to reach the conversion server. Please check your network connection and try again.';
    }

    return 'The file could not be converted. Please verify the document is not password-protected and try again.';
  }

  downloadConvertedFile(): void {
    const res = this.conversionResult();
    if (!res || !res.jobId) return;

    const downloadUrl = this.api.getDownloadUrl(res.jobId);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', res.sanitizedFileName || 'converted-document');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  reset(): void {
    this.clearIntervals();
    this.screenState.set('IDLE');
    this.selectedFile.set(null);
    this.conversionResult.set(null);
    this.errorMessage.set('');
    this.conversionProgress.set(0);
    if (this.fileInput()?.nativeElement) {
      this.fileInput()!.nativeElement.value = '';
    }
  }

  private clearIntervals(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = undefined;
    }
    if (this.pollSub) {
      this.pollSub.unsubscribe();
      this.pollSub = undefined;
    }
  }

  ngOnDestroy(): void {
    this.clearIntervals();
  }
}

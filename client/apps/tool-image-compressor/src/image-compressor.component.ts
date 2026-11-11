// apps/tool-image-compressor/src/image-compressor.component.ts
import { Component, ChangeDetectionStrategy, inject, signal, HostListener, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';
import { CompressorStateService } from './services/compressor-state.service';
import { UploadLandingComponent } from './components/upload-landing/upload-landing.component';
import { ImageCardComponent } from './components/image-card/image-card.component';
import { SettingsPanelComponent } from './components/settings-panel/settings-panel.component';
import { PreviewModalComponent } from './components/preview-modal/preview-modal.component';
import { ProcessingSummaryComponent } from './components/processing-summary/processing-summary.component';
import { CompressionSettings } from './models/compressor.models';

@Component({
  selector: 'app-image-compressor-tool',
  standalone: true,
  imports: [
    CommonModule,
    TsIconComponent,
    UploadLandingComponent,
    ImageCardComponent,
    SettingsPanelComponent,
    PreviewModalComponent,
    ProcessingSummaryComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './image-compressor.component.html',
  styleUrls: ['./image-compressor.component.css']
})
export class ImageCompressorComponent {
  readonly state = inject(CompressorStateService);

  readonly workspaceFileInput = viewChild<ElementRef<HTMLInputElement>>('workspaceFileInput');
  readonly isPageDragOver = signal<boolean>(false);

  // Global Drag and Drop Handlers
  @HostListener('dragenter', ['$event'])
  onPageDragEnter(event: DragEvent): void {
    if (event.dataTransfer?.types.includes('Files')) {
      event.preventDefault();
      this.isPageDragOver.set(true);
    }
  }

  @HostListener('dragover', ['$event'])
  onPageDragOver(event: DragEvent): void {
    if (event.dataTransfer?.types.includes('Files')) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      this.isPageDragOver.set(true);
    }
  }

  @HostListener('dragleave', ['$event'])
  onPageDragLeave(event: DragEvent): void {
    // Only reset if moving completely out of the browser window
    if (!event.relatedTarget || (event.relatedTarget as HTMLElement).nodeName === 'HTML') {
      this.isPageDragOver.set(false);
    }
  }

  @HostListener('drop', ['$event'])
  onPageDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isPageDragOver.set(false);
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.onFilesSelected(event.dataTransfer.files);
    }
  }

  openWorkspaceFilePicker(): void {
    const input = this.workspaceFileInput()?.nativeElement;
    if (input) {
      input.value = '';
      input.click();
    }
  }

  async onFilesSelected(files: FileList | File[]): Promise<void> {
    await this.state.addFiles(files);
  }

  onGlobalSettingsChanged(settings: Partial<CompressionSettings>): void {
    this.state.updateGlobalSettings(settings);
    this.state.showToast('info', 'Updated global compression settings', 1500);
  }

  onIndividualSettingsChanged(event: { id: string; settings: Partial<CompressionSettings> }): void {
    this.state.updateIndividualSettings(event.id, event.settings);
    this.state.showToast('info', 'Updated settings for image', 1500);
  }

  onResetIndividualSettings(id: string): void {
    this.state.resetIndividualSettings(id);
  }

  onCloseIndividualSettings(): void {
    this.state.closeItemSettings();
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
  }
}


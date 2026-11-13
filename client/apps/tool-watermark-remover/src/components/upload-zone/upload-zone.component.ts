// apps/tool-watermark-remover/src/components/upload-zone/upload-zone.component.ts
import { Component, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';
import { SAMPLE_WATERMARK_IMAGES } from '../../models/sample-images.data';
import { SampleWatermarkImage } from '../../models/watermark.models';

@Component({
  selector: 'app-upload-zone',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div 
      class="upload-zone-wrapper"
      (dragenter)="onDragEnter($event)"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
    >
      <div class="upload-drop-card" [class.is-drag-over]="isDragging">
        <!-- Main Upload Icon & Heading -->
        <div class="upload-icon-circle">
          <ts-icon name="wand-2" [size]="32" class="upload-main-icon" />
        </div>

        <h2 class="upload-title">Drop images here to remove watermarks</h2>
        <p class="upload-subtitle">
          Supports single or bulk image uploads (JPG, PNG, and WebP up to 50 MB each). Zero server uploads — 100% private in-browser AI.
        </p>

        <!-- Browse Files Button -->
        <div class="upload-action-row">
          <label class="ts-browse-btn" for="wm-file-input" tabindex="0" (keydown.enter)="fileInput.click()">
            <ts-icon name="upload" [size]="18" />
            <span>Browse Images (Single or Batch)</span>
            <input 
              #fileInput
              id="wm-file-input" 
              type="file" 
              multiple
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" 
              class="sr-only" 
              (change)="onFileSelected($event)" 
            />
          </label>
        </div>

        <!-- Clipboard Paste & Quick Specs -->
        <div class="upload-paste-hint">
          <ts-icon name="clipboard" [size]="14" />
          <span>Or press <kbd class="upload-kbd">⌘V</kbd> / <kbd class="upload-kbd">Ctrl+V</kbd> anywhere to paste</span>
        </div>

        <!-- Sample Images Section -->
        <div class="sample-images-section">
          <div class="sample-header">
            <span class="sample-label">Or try with an example watermarked image:</span>
          </div>
          <div class="sample-pills-row">
            @for (sample of sampleImages; track sample.id) {
              <button 
                type="button" 
                class="sample-pill-btn" 
                (click)="onSelectSample(sample)"
                [title]="sample.description"
              >
                <ts-icon name="image" [size]="14" class="sample-pill-icon" />
                <span class="sample-pill-name">{{ sample.name }}</span>
                <span class="sample-badge">{{ sample.watermarkType }}</span>
              </button>
            }
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .upload-zone-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      min-height: 480px;
      padding: var(--ts-space-16, 16px);
      box-sizing: border-box;
    }

    .upload-drop-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      max-width: 640px;
      width: 100%;
      padding: var(--ts-space-32, 32px) var(--ts-space-24, 24px);
      border-radius: var(--ts-radius-card, 20px);
      border: 2px dashed var(--ts-surface-raised-border, var(--border));
      background: var(--ts-surface-raised, var(--surface));
      transition: border-color var(--ts-dur-base, 200ms) var(--ts-ease),
                  background-color var(--ts-dur-base, 200ms) var(--ts-ease),
                  box-shadow var(--ts-dur-base, 200ms) var(--ts-ease);
      box-shadow: var(--ts-surface-raised-shadow, 0 10px 25px -5px rgba(0,0,0,0.2));
    }

    .upload-drop-card.is-drag-over {
      border-color: var(--accent, #3B82F6);
      background: var(--accent-soft, rgba(59, 130, 246, 0.08));
      box-shadow: 0 0 0 4px var(--accent-soft, rgba(59, 130, 246, 0.2));
    }

    .upload-icon-circle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      border-radius: var(--ts-radius-full, 9999px);
      background: var(--accent-soft, rgba(59, 130, 246, 0.12));
      color: var(--accent, #3B82F6);
      margin-bottom: var(--ts-space-16, 16px);
    }

    .upload-title {
      font-size: var(--ts-type-section-title-size, 20px);
      font-weight: 700;
      color: var(--text, #F3F4F6);
      margin: 0 0 var(--ts-space-8, 8px) 0;
      letter-spacing: -0.01em;
    }

    .upload-subtitle {
      font-size: var(--ts-type-body-size, 14px);
      color: var(--text-2, var(--text-secondary, #94A3B8));
      line-height: 1.5;
      margin: 0 0 var(--ts-space-24, 24px) 0;
      max-width: 480px;
    }

    .upload-action-row {
      display: flex;
      align-items: center;
      gap: var(--ts-space-12, 12px);
      margin-bottom: var(--ts-space-16, 16px);
    }

    .ts-browse-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--ts-space-8, 8px);
      height: var(--ts-control-height, 42px);
      padding: 0 var(--ts-space-24, 24px);
      background: var(--accent, #3B82F6);
      color: var(--accent-ink, #FFFFFF);
      font-size: var(--ts-type-body-size, 14px);
      font-weight: 600;
      border-radius: var(--ts-radius-control, 12px);
      cursor: pointer;
      user-select: none;
      transition: filter var(--ts-dur-fast, 150ms) var(--ts-ease),
                  transform var(--ts-dur-fast, 150ms) var(--ts-ease);
      box-shadow: 0 2px 8px var(--accent-glow, rgba(59, 130, 246, 0.35));
    }

    .ts-browse-btn:hover {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }

    .ts-browse-btn:active {
      transform: translateY(0);
    }

    .upload-paste-hint {
      display: flex;
      align-items: center;
      gap: var(--ts-space-8, 8px);
      font-size: var(--ts-type-caption-size, 12px);
      color: var(--text-3, #64748B);
      margin-bottom: var(--ts-space-24, 24px);
    }

    .upload-kbd {
      padding: 2px 6px;
      font-family: var(--ts-font-mono, monospace);
      font-size: 11px;
      font-weight: 600;
      border-radius: 4px;
      background: var(--ts-surface-inset, rgba(255, 255, 255, 0.08));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
      color: var(--text, #F3F4F6);
    }

    .sample-images-section {
      width: 100%;
      border-top: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      padding-top: var(--ts-space-20, 20px);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--ts-space-12, 12px);
    }

    .sample-header {
      font-size: var(--ts-type-caption-size, 12px);
      font-weight: 600;
      color: var(--text-3, #64748B);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .sample-pills-row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ts-space-8, 8px);
      justify-content: center;
    }

    .sample-pill-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--ts-space-8, 8px);
      padding: 8px 14px;
      border-radius: var(--ts-radius-control, 10px);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      background: var(--ts-surface-inset, rgba(255, 255, 255, 0.04));
      color: var(--text, #F3F4F6);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: background var(--ts-dur-fast, 150ms) var(--ts-ease),
                  border-color var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .sample-pill-btn:hover {
      background: var(--surface-hover, rgba(255, 255, 255, 0.08));
      border-color: var(--accent, #3B82F6);
    }

    .sample-pill-icon {
      color: var(--accent, #3B82F6);
    }

    .sample-badge {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--accent-soft, rgba(59, 130, 246, 0.12));
      color: var(--accent, #3B82F6);
      text-transform: uppercase;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      border: 0;
    }
  `]
})
export class UploadZoneComponent {
  readonly fileDropped = output<File>();
  readonly filesDropped = output<File[]>();
  readonly sampleSelected = output<SampleWatermarkImage>();

  readonly sampleImages = SAMPLE_WATERMARK_IMAGES;
  isDragging = false;

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const fileList = Array.from(input.files);
      this.fileDropped.emit(fileList[0]);
      this.filesDropped.emit(fileList);
      input.value = '';
    }
  }

  onSelectSample(sample: SampleWatermarkImage): void {
    this.sampleSelected.emit(sample);
  }

  onDragEnter(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const fileList = Array.from(event.dataTransfer.files);
      this.fileDropped.emit(fileList[0]);
      this.filesDropped.emit(fileList);
    }
  }
}


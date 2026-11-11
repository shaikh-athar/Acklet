// apps/tool-image-compressor/src/components/upload-landing/upload-landing.component.ts
import { Component, ChangeDetectionStrategy, output, signal, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';

@Component({
  selector: 'app-upload-landing',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="landing-container">
      <!-- Hidden File Input -->
      <input
        #fileInput
        type="file"
        multiple
        accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif,.svg,.heic,.heif"
        class="hidden-file-input"
        (change)="onFileSelected($event)"
        aria-hidden="true"
        tabindex="-1"
      />

      <!-- Hero Header -->
      <div class="landing-header">
        <div class="badge-pill">
          <ts-icon name="shield-check" [size]="14" class="badge-icon" />
          <span>100% Client-Side • In-Browser Processing</span>
        </div>
        <h1 class="landing-title">Compress Images Online</h1>
        <p class="landing-description">
          Reduce image file sizes while maintaining excellent visual quality. Process multiple images directly in your browser.
        </p>
      </div>

      <!-- Main Upload Dropzone -->
      <div
        class="dropzone-card"
        [class.is-dragover]="isDragOver()"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
        (click)="openFilePicker()"
        (keydown.enter)="openFilePicker()"
        (keydown.space)="openFilePicker(); $event.preventDefault()"
        tabindex="0"
        role="button"
        aria-label="Upload Images. Drag and drop images here or press enter to browse."
      >
        <div class="dropzone-glow-ring" aria-hidden="true"></div>

        <div class="dropzone-content">
          <div class="dropzone-icon-bubble">
            <ts-icon [name]="isDragOver() ? 'upload' : 'upload-cloud'" [size]="32" class="bubble-icon" />
          </div>

          <div class="action-row">
            <button
              type="button"
              class="primary-upload-btn"
              (click)="openFilePicker(); $event.stopPropagation()"
              aria-label="Select images from device"
            >
              <ts-icon name="plus" [size]="16" class="btn-icon" />
              <span>Upload Images</span>
            </button>
            <span class="drop-text">or drop files here</span>
          </div>

          <div class="formats-pill">
            <span class="formats-label">Supported:</span>
            <span class="formats-list">JPG, PNG, WebP, GIF, AVIF, SVG, BMP, HEIC</span>
          </div>

          <div class="limits-row">
            <span class="limit-item">
              <ts-icon name="layers" [size]="12" />
              Up to 50 images at once
            </span>
            <span class="limit-dot">•</span>
            <span class="limit-item">
              <ts-icon name="hard-drive" [size]="12" />
              Max 50 MB per file
            </span>
            <span class="limit-dot">•</span>
            <span class="limit-item">
              <ts-icon name="lock" [size]="12" />
              Zero server uploads
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: 100%;
      padding: var(--ts-space-24, 24px) var(--ts-space-16, 16px);
      box-sizing: border-box;
    }

    .landing-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      max-width: 680px;
      width: 100%;
      text-align: center;
      animation: fadeIn 300ms var(--ts-ease-out, ease-out);
    }

    .hidden-file-input {
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

    .landing-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: var(--ts-space-24, 24px);
    }

    .badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: var(--ts-radius-full, 9999px);
      background: var(--ts-surface-subtle, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      color: var(--accent, #3B82F6);
      font-size: var(--ts-type-caption-size, 12px);
      font-weight: 600;
      letter-spacing: 0.02em;
      margin-bottom: var(--ts-space-12, 12px);
    }

    .badge-icon {
      color: var(--accent, #3B82F6);
    }

    .landing-title {
      font-size: clamp(26px, 4vw, 36px);
      font-weight: 700;
      line-height: 1.2;
      color: var(--text, #F9FAFB);
      letter-spacing: -0.02em;
      margin: 0 0 var(--ts-space-8, 8px) 0;
      font-family: var(--ts-font-heading, inherit);
    }

    .landing-description {
      font-size: var(--ts-type-description-size, 15px);
      line-height: var(--ts-type-description-lh, 24px);
      color: var(--text-2, #9CA3AF);
      max-width: 540px;
      margin: 0;
    }

    .dropzone-card {
      position: relative;
      width: 100%;
      border-radius: var(--ts-radius-card, 20px);
      background: var(--ts-surface-card, #1E2028);
      border: 2px dashed var(--border-default, #2E3342);
      padding: 48px 24px;
      cursor: pointer;
      box-sizing: border-box;
      transition: all var(--ts-dur-base, 220ms) var(--ts-ease-out, ease-out);
      outline: none;
    }

    .dropzone-card:hover,
    .dropzone-card:focus-visible {
      border-color: var(--accent, #3B82F6);
      background: var(--ts-surface-hover, rgba(59, 130, 246, 0.04));
      transform: translateY(-2px);
      box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.3);
    }

    .dropzone-card:focus-visible {
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
    }

    .dropzone-card.is-dragover {
      border-color: var(--accent, #3B82F6);
      border-style: solid;
      background: rgba(59, 130, 246, 0.08);
      transform: scale(1.01);
      box-shadow: 0 16px 40px -8px rgba(59, 130, 246, 0.25);
    }

    .dropzone-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .dropzone-icon-bubble {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(59, 130, 246, 0.1);
      color: var(--accent, #3B82F6);
      border: 1px solid rgba(59, 130, 246, 0.2);
      transition: transform var(--ts-dur-base, 200ms) var(--ts-ease);
    }

    .dropzone-card:hover .dropzone-icon-bubble {
      transform: scale(1.08);
      background: rgba(59, 130, 246, 0.16);
    }

    .action-row {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    @media (min-width: 480px) {
      .action-row {
        flex-direction: row;
        gap: 12px;
      }
    }

    .primary-upload-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: var(--ts-control-height-lg, 48px);
      padding: 0 28px;
      border-radius: var(--ts-radius-control, 12px);
      background: var(--accent, #2563EB);
      color: #FFFFFF;
      font-size: 15px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
      transition: all var(--ts-dur-fast, 150ms) var(--ts-ease-out, ease-out);
    }

    .primary-upload-btn:hover {
      background: var(--accent-hover, #1D4ED8);
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.45);
    }

    .primary-upload-btn:active {
      transform: translateY(0);
    }

    .drop-text {
      font-size: var(--ts-type-body-size, 14px);
      color: var(--text-2, #9CA3AF);
    }

    .formats-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      background: var(--ts-surface-subtle, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      border-radius: var(--ts-radius-md, 12px);
      font-size: 13px;
    }

    .formats-label {
      font-weight: 600;
      color: var(--text, #F9FAFB);
    }

    .formats-list {
      color: var(--text-2, #9CA3AF);
      font-family: var(--ts-font-mono, monospace);
      font-size: 12px;
    }

    .limits-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 12px;
      color: var(--text-3, #6B7280);
      margin-top: 4px;
    }

    .limit-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .limit-dot {
      opacity: 0.5;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class UploadLandingComponent {
  readonly filesSelected = output<FileList | File[]>();
  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly isDragOver = signal<boolean>(false);

  openFilePicker(): void {
    const input = this.fileInput()?.nativeElement;
    if (input) {
      input.value = '';
      input.click();
    }
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.filesSelected.emit(target.files);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.types.includes('Files')) {
      this.isDragOver.set(true);
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy';
      }
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
      this.filesSelected.emit(event.dataTransfer.files);
    }
  }
}


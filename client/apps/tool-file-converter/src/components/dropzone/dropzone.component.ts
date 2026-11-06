// apps/tool-file-converter/src/components/dropzone/dropzone.component.ts
import { Component, ChangeDetectionStrategy, output, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';

@Component({
  selector: 'app-dropzone',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="hero-dropzone-container"
      [class.is-dragover]="isDragOver()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
      (click)="fileInput.click()"
      (keydown.enter)="fileInput.click()"
      (keydown.space)="fileInput.click()"
      tabindex="0"
      role="button"
      aria-label="Upload images for conversion"
    >
      <input
        #fileInput
        type="file"
        multiple
        accept="image/*,.png,.jpg,.jpeg,.webp,.avif,.svg,.gif,.bmp,.ico"
        class="hidden-file-input"
        (change)="onFileInputChange($event)"
        aria-hidden="true"
        tabindex="-1"
      />

      <div class="hero-dropzone-content">
        <h1 class="hero-main-title">Image Converter</h1>
        <p class="hero-main-subtitle">
          Convert JPG, PNG, WebP, AVIF, SVG, and GIF in seconds. Easily adjust quality and dimensions.
        </p>

        <div class="hero-cta-wrapper">
          <button
            type="button"
            class="hero-select-btn"
            (click)="$event.stopPropagation(); fileInput.click()"
            aria-label="Select images from computer"
          >
            <ts-icon name="images" [size]="22" />
            <span>Select Images</span>
          </button>
        </div>

        <p class="hero-drop-hint">or drop images here</p>

        <div class="format-chips-cluster" aria-label="Supported formats">
          <span class="format-chip">PNG</span>
          <span class="format-chip">JPG</span>
          <span class="format-chip">WebP</span>
          <span class="format-chip">AVIF</span>
          <span class="format-chip">SVG</span>
          <span class="format-chip">GIF</span>
          <span class="format-chip">BMP</span>
        </div>

        <div class="security-meta-badge">
          <ts-icon name="shield-check" [size]="14" class="security-icon" />
          <span>Up to 50 images · Max 50 MB each · 100% In-Browser</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .hero-dropzone-container {
      position: relative;
      border: 2px dashed var(--border-subtle, rgba(255, 255, 255, 0.14));
      border-radius: var(--ts-radius-card, 24px);
      background: var(--ts-surface-raised, #18181B);
      padding: 64px 28px 56px;
      text-align: center;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      outline: none;
      user-select: none;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.18);
    }

    :host-context([data-theme="light"]) .hero-dropzone-container,
    [data-theme="light"] .hero-dropzone-container {
      background: #FFFFFF;
      border-color: #CBD5E1;
      box-shadow: 0 4px 24px rgba(15, 23, 42, 0.05);
    }

    .hero-dropzone-container:hover,
    .hero-dropzone-container:focus-visible {
      border-color: var(--accent, #6366F1);
      background: var(--accent-soft, rgba(99, 102, 241, 0.05));
      transform: translateY(-2px);
      box-shadow: 0 8px 32px var(--accent-glow, rgba(99, 102, 241, 0.2));
    }

    :host-context([data-theme="light"]) .hero-dropzone-container:hover,
    [data-theme="light"] .hero-dropzone-container:hover {
      border-color: #4F46E5;
      background: rgba(79, 70, 229, 0.03);
      box-shadow: 0 8px 32px rgba(79, 70, 229, 0.12);
    }

    .hero-dropzone-container.is-dragover {
      border-color: var(--accent, #6366F1) !important;
      border-style: solid !important;
      background: var(--accent-soft, rgba(99, 102, 241, 0.14)) !important;
      transform: scale(1.01);
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.25);
    }

    :host-context([data-theme="light"]) .hero-dropzone-container.is-dragover,
    [data-theme="light"] .hero-dropzone-container.is-dragover {
      border-color: #4F46E5 !important;
      background: rgba(79, 70, 229, 0.08) !important;
      box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.2);
    }

    .hidden-file-input {
      position: absolute;
      width: 0;
      height: 0;
      opacity: 0;
      pointer-events: none;
    }

    .hero-dropzone-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      max-width: 680px;
      margin: 0 auto;
    }

    .hero-main-title {
      font-size: 38px;
      font-weight: 800;
      color: var(--text, #FFFFFF);
      margin: 0 0 10px;
      letter-spacing: -0.03em;
      line-height: 1.15;
    }

    :host-context([data-theme="light"]) .hero-main-title,
    [data-theme="light"] .hero-main-title {
      color: #0F172A;
    }

    @media (max-width: 640px) {
      .hero-main-title {
        font-size: 28px;
      }
    }

    .hero-main-subtitle {
      font-size: 16px;
      color: var(--text-muted, #94A3B8);
      margin: 0 0 32px;
      line-height: 1.5;
      max-width: 560px;
    }

    :host-context([data-theme="light"]) .hero-main-subtitle,
    [data-theme="light"] .hero-main-subtitle {
      color: #475569;
    }

    .hero-cta-wrapper {
      margin-bottom: 12px;
    }

    .hero-select-btn {
      height: 54px;
      padding: 0 38px;
      border-radius: 9999px;
      background: var(--accent, #6366F1);
      border: 1px solid var(--accent, #6366F1);
      color: #FFFFFF;
      font-size: 16.5px;
      font-weight: 700;
      letter-spacing: 0.01em;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 6px 22px rgba(99, 102, 241, 0.38);
    }

    :host-context([data-theme="light"]) .hero-select-btn,
    [data-theme="light"] .hero-select-btn {
      background: #4F46E5;
      border-color: #4F46E5;
      color: #FFFFFF;
      box-shadow: 0 6px 22px rgba(79, 70, 229, 0.28);
    }

    .hero-select-btn:hover {
      transform: translateY(-2px) scale(1.02);
      box-shadow: 0 10px 28px rgba(99, 102, 241, 0.48);
    }

    :host-context([data-theme="light"]) .hero-select-btn:hover,
    [data-theme="light"] .hero-select-btn:hover {
      background: #4338CA;
      border-color: #4338CA;
      box-shadow: 0 10px 28px rgba(79, 70, 229, 0.36);
    }

    .hero-select-btn:active {
      transform: translateY(0) scale(0.99);
    }

    .hero-drop-hint {
      font-size: 14px;
      color: var(--text-muted, #94A3B8);
      margin: 0 0 24px;
      font-weight: 500;
    }

    :host-context([data-theme="light"]) .hero-drop-hint,
    [data-theme="light"] .hero-drop-hint {
      color: #64748B;
    }

    .format-chips-cluster {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      flex-wrap: wrap;
      margin-bottom: 20px;
    }

    .format-chip {
      display: inline-flex;
      align-items: center;
      padding: 4px 11px;
      border-radius: 7px;
      background: var(--ts-surface-inset, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      color: var(--text-muted, #CBD5E1);
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: 0.03em;
    }

    :host-context([data-theme="light"]) .format-chip,
    [data-theme="light"] .format-chip {
      background: #F1F5F9;
      border-color: #E2E8F0;
      color: #334155;
    }

    .security-meta-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 9999px;
      background: var(--accent-soft, rgba(99, 102, 241, 0.1));
      border: 1px solid var(--accent-border, rgba(99, 102, 241, 0.25));
      color: var(--accent, #818CF8);
      font-size: 12px;
      font-weight: 600;
    }

    :host-context([data-theme="light"]) .security-meta-badge,
    [data-theme="light"] .security-meta-badge {
      background: rgba(79, 70, 229, 0.06);
      border-color: rgba(79, 70, 229, 0.2);
      color: #4338CA;
    }

    .security-icon {
      color: currentColor;
    }
  `]
})
export class DropzoneComponent {
  readonly filesDropped = output<FileList | File[]>();
  readonly isDragOver = signal<boolean>(false);

  @ViewChild('fileInput') private fileInputRef?: ElementRef<HTMLInputElement>;

  openPicker(): void {
    this.fileInputRef?.nativeElement.click();
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver.set(false);

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      this.filesDropped.emit(e.dataTransfer.files);
    }
  }

  onFileInputChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.filesDropped.emit(input.files);
      input.value = ''; // Reset for repeated selection of same files
    }
  }
}

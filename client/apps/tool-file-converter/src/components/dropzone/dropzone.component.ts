// apps/tool-file-converter/src/components/dropzone/dropzone.component.ts
import { Component, ChangeDetectionStrategy, input, output, signal, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent, FileTransferService } from '@acklet/tool-shell';

@Component({
  selector: 'app-dropzone',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="hero-clean-section"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
    >
      <input
        #fileInput
        type="file"
        multiple
        [accept]="acceptTypes()"
        class="hidden-file-input"
        (change)="onFileInputChange($event)"
        aria-hidden="true"
        tabindex="-1"
      />

      <!-- Main Clean Content (Centered, Minimal, iLoveIMG/iLovePDF Inspiration) -->
      <div class="hero-center-content">
        @if (conversionPair(); as pair) {
          <div class="pair-pill">
            <span class="pair-dot"></span>
            <span>Preselected: <strong>{{ pair.source | uppercase }}</strong> to <strong>{{ pair.target | uppercase }}</strong></span>
          </div>
          <h1 class="hero-title">{{ pair.source | uppercase }} to {{ pair.target | uppercase }}</h1>
          <p class="hero-desc">
            Convert {{ pair.source | uppercase }} files to {{ pair.target | uppercase }} quickly and securely.
          </p>
        } @else {
          <h1 class="hero-title">File Converter</h1>
          <p class="hero-desc">
            Convert files between popular formats quickly and securely.
          </p>
        }

        <!-- Primary CTA Area -->
        <div class="hero-action-group">
          <button
            type="button"
            class="primary-select-btn"
            (click)="fileInput.click()"
            aria-label="Select files from device"
          >
            <ts-icon name="arrow-left-right" [size]="19" class="btn-icon" />
            <span class="btn-label">Select Files</span>
          </button>
          <span class="drag-drop-text">or drop files here</span>
        </div>

        <!-- Subtle Supported Formats Note (Compact, clean presentation) -->
        <div class="supported-formats-subtle" aria-label="Supported file categories">
          <span class="formats-prefix">Supported:</span>
          <span class="formats-text">Images (PNG, JPG, WebP, AVIF, SVG) · Subtitles (SRT, VTT) · Contacts (VCF, CSV)</span>
        </div>
      </div>

      <!-- Full-Screen Drop Overlay (Visible ONLY during active dragging) -->
      @if (isDragOver()) {
        <div class="drag-active-overlay animate-fade-in" aria-live="polite">
          <div class="drag-card">
            <div class="drag-icon-box">
              <ts-icon name="download" [size]="32" />
            </div>
            <h3 class="drag-title">Drop your files here</h3>
            <p class="drag-subtitle">Release to begin conversion</p>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .hero-clean-section {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 72px 24px 64px;
      text-align: center;
      max-width: 820px;
      margin: 0 auto;
    }

    .hidden-file-input {
      position: absolute;
      width: 0;
      height: 0;
      opacity: 0;
      pointer-events: none;
    }

    .hero-center-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
    }

    .pair-pill {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 4px 14px;
      border-radius: 9999px;
      background: var(--accent-soft, rgba(99, 102, 241, 0.12));
      border: 1px solid var(--accent-border, rgba(99, 102, 241, 0.25));
      color: var(--accent, #818CF8);
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 20px;
    }

    :host-context([data-theme="light"]) .pair-pill,
    [data-theme="light"] .pair-pill {
      background: rgba(79, 70, 229, 0.08);
      border-color: rgba(79, 70, 229, 0.2);
      color: #4338CA;
    }

    .pair-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .hero-title {
      font-size: 44px;
      font-weight: 800;
      color: var(--text, #F8FAFC);
      margin: 0 0 12px;
      letter-spacing: -0.03em;
      line-height: 1.15;
    }

    :host-context([data-theme="light"]) .hero-title,
    [data-theme="light"] .hero-title {
      color: #0F172A;
    }

    @media (max-width: 640px) {
      .hero-title {
        font-size: 32px;
      }
    }

    .hero-desc {
      font-size: 17px;
      color: var(--text-muted, #94A3B8);
      margin: 0 0 40px;
      line-height: 1.5;
      max-width: 540px;
    }

    :host-context([data-theme="light"]) .hero-desc,
    [data-theme="light"] .hero-desc {
      color: #64748B;
    }

    /* ── Action Area & Button ── */
    .hero-action-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      margin-bottom: 48px;
    }

    /* ── High-Contrast Primary CTA Button (Hover Bug Explicitly Fixed) ── */
    .primary-select-btn {
      height: 54px;
      padding: 0 42px;
      border-radius: 12px;
      background: var(--accent, #6366F1) !important;
      border: 1px solid var(--accent, #6366F1) !important;
      color: #FFFFFF !important;
      font-size: 16.5px;
      font-weight: 700;
      letter-spacing: 0.01em;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      cursor: pointer;
      user-select: none;
      outline: none;
      transition: background-color 0.18s cubic-bezier(0.16, 1, 0.3, 1),
                  transform 0.15s cubic-bezier(0.16, 1, 0.3, 1),
                  border-color 0.18s ease;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
    }

    .primary-select-btn * {
      color: #FFFFFF !important;
      fill: currentColor !important;
    }

    /* Dark Mode Hover / Active / Focus */
    .primary-select-btn:hover {
      background: #4F46E5 !important;
      border-color: #4338CA !important;
      color: #FFFFFF !important;
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.28);
    }

    .primary-select-btn:hover * {
      color: #FFFFFF !important;
      fill: currentColor !important;
    }

    .primary-select-btn:active {
      background: #4338CA !important;
      border-color: #3730A3 !important;
      color: #FFFFFF !important;
      transform: translateY(0);
    }

    .primary-select-btn:focus-visible {
      outline: 2px solid var(--accent, #6366F1);
      outline-offset: 3px;
      color: #FFFFFF !important;
    }

    .primary-select-btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      transform: none;
    }

    /* Light Mode Overrides */
    :host-context([data-theme="light"]) .primary-select-btn,
    [data-theme="light"] .primary-select-btn {
      background: #4F46E5 !important;
      border-color: #4F46E5 !important;
      color: #FFFFFF !important;
      box-shadow: 0 4px 14px rgba(79, 70, 229, 0.25);
    }

    :host-context([data-theme="light"]) .primary-select-btn:hover,
    [data-theme="light"] .primary-select-btn:hover {
      background: #3730A3 !important;
      border-color: #312E81 !important;
      color: #FFFFFF !important;
      box-shadow: 0 6px 20px rgba(79, 70, 229, 0.35);
    }

    :host-context([data-theme="light"]) .primary-select-btn:active,
    [data-theme="light"] .primary-select-btn:active {
      background: #312E81 !important;
      border-color: #1E1B4B !important;
      color: #FFFFFF !important;
    }

    .btn-icon {
      flex-shrink: 0;
      color: #FFFFFF !important;
    }

    .btn-label {
      color: #FFFFFF !important;
    }

    .drag-drop-text {
      font-size: 14px;
      color: var(--text-muted, #94A3B8);
      font-weight: 500;
    }

    :host-context([data-theme="light"]) .drag-drop-text,
    [data-theme="light"] .drag-drop-text {
      color: #64748B;
    }

    /* ── Subtle Formats Presentation ── */
    .supported-formats-subtle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      color: var(--text-muted, #94A3B8);
      padding: 6px 14px;
      border-radius: 9999px;
      background: var(--ts-surface-inset, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .supported-formats-subtle,
    [data-theme="light"] .supported-formats-subtle {
      background: #F1F5F9;
      border-color: #E2E8F0;
      color: #64748B;
    }

    .formats-prefix {
      font-weight: 600;
      color: var(--text, #E2E8F0);
    }

    :host-context([data-theme="light"]) .formats-prefix,
    [data-theme="light"] .formats-prefix {
      color: #334155;
    }

    .formats-text {
      letter-spacing: 0.01em;
    }

    /* ── Full Drag-and-Drop Overlay (Active ONLY on Drag Over) ── */
    .drag-active-overlay {
      position: absolute;
      inset: -12px;
      border-radius: 24px;
      background: rgba(15, 23, 42, 0.82);
      border: 1px solid var(--accent-border, rgba(99, 102, 241, 0.35));
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 50;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
    }

    :host-context([data-theme="light"]) .drag-active-overlay,
    [data-theme="light"] .drag-active-overlay {
      background: rgba(248, 250, 252, 0.88);
      border-color: rgba(79, 70, 229, 0.25);
    }

    .drag-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      pointer-events: none;
    }

    .drag-icon-box {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      background: var(--accent-soft, rgba(99, 102, 241, 0.15));
      color: var(--accent, #818CF8);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    :host-context([data-theme="light"]) .drag-icon-box,
    [data-theme="light"] .drag-icon-box {
      background: rgba(79, 70, 229, 0.1);
      color: #4F46E5;
    }

    .drag-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--text, #FFFFFF);
      margin: 0;
    }

    :host-context([data-theme="light"]) .drag-title,
    [data-theme="light"] .drag-title {
      color: #0F172A;
    }

    .drag-subtitle {
      font-size: 13px;
      color: var(--text-muted, #94A3B8);
      margin: 0;
    }

    :host-context([data-theme="light"]) .drag-subtitle,
    [data-theme="light"] .drag-subtitle {
      color: #64748B;
    }
  `]
})
export class DropzoneComponent {
  private readonly fileTransfer = inject(FileTransferService, { optional: true });

  readonly conversionPair = input<{ source: string; target: string } | null>(null);
  readonly acceptTypes = input<string>('*/*');
  readonly filesDropped = output<FileList | File[]>();
  readonly isDragOver = signal<boolean>(false);

  @ViewChild('fileInput') private fileInputRef?: ElementRef<HTMLInputElement>;

  openPicker(): void {
    this.fileInputRef?.nativeElement.click();
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(e: DragEvent): void {
    e.preventDefault();
    this.isDragOver.set(false);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragOver.set(false);
    this.fileTransfer?.isGlobalDragging.set(false);

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      this.filesDropped.emit(e.dataTransfer.files);
    }
  }

  onFileInputChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.filesDropped.emit(input.files);
      input.value = '';
    }
  }
}

// apps/tool-file-converter/src/components/document-converter/file-drop-zone.component.ts
import { Component, ChangeDetectionStrategy, output, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';
import { DOCUMENT_CONVERTER_CONFIG } from '../../converter.config';

@Component({
  selector: 'app-file-drop-zone',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="idle-container">
      <div class="idle-header">
        <h1 class="idle-title">Convert documents</h1>
        <p class="idle-subtext">Word, Excel, PowerPoint, PDF and more.</p>
      </div>

      <!-- One Drop Card -->
      <div
        class="drop-card"
        [class.is-drag-over]="isDragging()"
        tabindex="0"
        role="button"
        aria-label="Drop files here or press Enter or Space to browse files"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
        (click)="openPicker()"
        (keydown.enter)="openPicker()"
        (keydown.space)="$event.preventDefault(); openPicker()"
      >
        <!-- Top: 20px line icon, muted color -->
        <div class="drop-top-icon" aria-hidden="true">
          <ts-icon name="upload-cloud" [size]="20" class="upload-icon" />
        </div>

        <!-- Row: "Drop files here, or" + Primary Button -->
        <div class="drop-row">
          <span class="drop-prompt">Drop files here, or</span>
          <button
            type="button"
            class="browse-btn"
            (click)="$event.stopPropagation(); openPicker()"
            aria-label="Browse files from your device"
          >
            <span>Browse files</span>
          </button>
        </div>

        <!-- Below: Up to 20 files, 50 MB each -->
        <p class="drop-limits">Up to 20 files, 50 MB each</p>

        <input
          #fileInput
          type="file"
          [accept]="acceptedMimes"
          multiple
          class="hidden-file-input"
          (change)="onFileInputChange($event)"
        />
      </div>

      <!-- Below card: trust line -->
      <p class="idle-trust-line">Files are deleted automatically after 1 hour.</p>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: calc(100vh - 240px);
      margin: auto;
    }

    .idle-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      max-width: 560px;
      width: 100%;
      margin: 0 auto;
      gap: 24px;
    }

    .idle-header {
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .idle-title {
      font-size: 28px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
      line-height: 1.25;
      letter-spacing: -0.02em;
    }

    .idle-subtext {
      font-size: 14px;
      font-weight: 400;
      color: var(--text-muted);
      margin: 0;
      line-height: 1.5;
    }

    .drop-card {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      background: var(--bg-surface);
      padding: 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      cursor: pointer;
      outline: none;
      transition: border-color 150ms ease, background-color 150ms ease;
    }

    .drop-card:hover {
      border-color: var(--border-default);
    }

    .drop-card:focus-visible {
      outline: 2px solid var(--tool-accent);
      outline-offset: 2px;
    }

    .drop-card.is-drag-over {
      border-color: var(--tool-accent);
      background: var(--tool-accent-soft);
    }

    .drop-top-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
    }

    .drop-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .drop-prompt {
      font-size: 14px;
      font-weight: 400;
      color: var(--text-secondary);
    }

    .browse-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 40px;
      padding: 0 20px;
      background: var(--tool-accent);
      color: var(--tool-accent-contrast);
      font-size: 14px;
      font-weight: 600;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      outline: none;
      transition: opacity 150ms ease, transform 150ms ease;
    }

    .browse-btn:hover {
      opacity: 0.92;
    }

    .browse-btn:active {
      transform: scale(0.98);
    }

    .browse-btn:focus-visible {
      outline: 2px solid var(--tool-accent);
      outline-offset: 2px;
    }

    .drop-limits {
      font-size: 13px;
      font-weight: 400;
      color: var(--text-muted);
      margin: 0;
      text-align: center;
    }

    .hidden-file-input {
      display: none !important;
      position: absolute !important;
      width: 0 !important;
      height: 0 !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }

    .idle-trust-line {
      font-size: 13px;
      font-weight: 400;
      color: var(--text-muted);
      margin: 0;
      text-align: center;
    }

    @media (prefers-reduced-motion: reduce) {
      .drop-card,
      .browse-btn {
        transition: none !important;
      }
    }
  `]
})
export class FileDropZoneComponent {
  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

  readonly filesDropped = output<File[]>();
  readonly isDragging = signal<boolean>(false);
  readonly acceptedMimes = DOCUMENT_CONVERTER_CONFIG.acceptedInputMimeTypes;

  openPicker(): void {
    if (this.fileInputRef?.nativeElement) {
      this.fileInputRef.nativeElement.value = '';
      this.fileInputRef.nativeElement.click();
    }
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    if (!this.isDragging()) {
      this.isDragging.set(true);
    }
  }

  onDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging.set(false);

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      this.filesDropped.emit(droppedFiles);
    }
  }

  onFileInputChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    if (target?.files && target.files.length > 0) {
      const selected = Array.from(target.files);
      this.filesDropped.emit(selected);
      target.value = '';
    }
  }
}

// apps/tool-file-converter/src/components/document-converter/file-list.component.ts
import { Component, ChangeDetectionStrategy, input, output, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';
import { FileJobItem } from '../../converter.models';
import { DOCUMENT_CONVERTER_CONFIG } from '../../converter.config';
import { FileRowComponent } from './file-row.component';

@Component({
  selector: 'app-file-list',
  standalone: true,
  imports: [CommonModule, TsIconComponent, FileRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="files-panel" aria-label="Selected files to convert">
      <!-- Section Header -->
      <div class="panel-header">
        <div class="header-left">
          <h2 class="panel-title">Files</h2>
          <span class="file-counter">{{ files().length }} of {{ maxFiles }}</span>
        </div>
        <div class="header-actions">
          <button
            type="button"
            class="text-btn"
            (click)="openPicker()"
            [disabled]="files().length >= maxFiles"
            aria-label="Add more files to convert"
          >
            Add files
          </button>
          <span class="action-divider" aria-hidden="true">|</span>
          <button
            type="button"
            class="text-btn text-btn-muted"
            (click)="clear.emit()"
            aria-label="Clear all files"
          >
            Clear
          </button>
        </div>
      </div>

      <!-- File Rows Container -->
      <div class="rows-container">
        @for (file of files(); track file.fileId) {
          <app-file-row
            [file]="file"
            (remove)="remove.emit($event)"
            (retry)="retry.emit($event)"
            (changeFormat)="changeFormat.emit($event)"
          />
        }

        <!-- Dashed "Add more" row at bottom, same width as rows -->
        @if (files().length < maxFiles) {
          <button
            type="button"
            class="dashed-add-more-row"
            (click)="openPicker()"
            aria-label="Add more documents"
          >
            <ts-icon name="plus" [size]="16" class="add-icon" />
            <span>Add more files</span>
          </button>
        }
      </div>

      <!-- Hidden Input for Adding Files -->
      <input
        #filePicker
        type="file"
        [accept]="acceptedMimes"
        multiple
        class="hidden-file-input"
        (change)="onFilesPicked($event)"
      />
    </section>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .files-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .header-left {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }

    .panel-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .file-counter {
      font-size: 13px;
      font-weight: 400;
      color: var(--text-muted);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .text-btn {
      background: none;
      border: none;
      padding: 4px 6px;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      cursor: pointer;
      border-radius: 6px;
      outline: none;
      transition: color 150ms ease, background-color 150ms ease;
    }

    .text-btn:hover:not(:disabled) {
      color: var(--tool-accent);
      background: var(--bg-muted);
    }

    .text-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .text-btn:focus-visible {
      outline: 2px solid var(--tool-accent);
      outline-offset: 2px;
    }

    .text-btn-muted {
      font-weight: 400;
      color: var(--text-muted);
    }

    .action-divider {
      color: var(--border-subtle);
      user-select: none;
    }

    .rows-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    /* Dashed "Add more" row at bottom, same width as rows */
    .dashed-add-more-row {
      width: 100%;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 16px;
      border: 1px dashed var(--border-default);
      border-radius: 12px;
      background: transparent;
      color: var(--text-muted);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      outline: none;
      transition: border-color 150ms ease, color 150ms ease, background-color 150ms ease;
    }

    .dashed-add-more-row:hover {
      border-color: var(--tool-accent);
      color: var(--tool-accent);
      background: var(--tool-accent-soft);
    }

    .dashed-add-more-row:focus-visible {
      outline: 2px solid var(--tool-accent);
      outline-offset: 2px;
    }

    .add-icon {
      color: currentColor;
    }

    .hidden-file-input {
      display: none !important;
      position: absolute !important;
      width: 0 !important;
      height: 0 !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }

    @media (prefers-reduced-motion: reduce) {
      .text-btn,
      .dashed-add-more-row {
        transition: none !important;
      }
    }
  `]
})
export class FileListComponent {
  @ViewChild('filePicker') filePickerRef?: ElementRef<HTMLInputElement>;

  readonly files = input.required<FileJobItem[]>();
  readonly maxFiles = DOCUMENT_CONVERTER_CONFIG.maxBatchFiles;
  readonly acceptedMimes = DOCUMENT_CONVERTER_CONFIG.acceptedInputMimeTypes;

  readonly addFiles = output<File[]>();
  readonly remove = output<string>();
  readonly retry = output<string>();
  readonly changeFormat = output<string>();
  readonly clear = output<void>();

  openPicker(): void {
    if (this.filePickerRef?.nativeElement) {
      this.filePickerRef.nativeElement.value = '';
      this.filePickerRef.nativeElement.click();
    }
  }

  onFilesPicked(e: Event): void {
    const target = e.target as HTMLInputElement;
    if (target?.files && target.files.length > 0) {
      const selected = Array.from(target.files);
      this.addFiles.emit(selected);
      target.value = '';
    }
  }
}

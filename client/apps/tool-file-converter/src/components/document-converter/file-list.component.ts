// apps/tool-file-converter/src/components/document-converter/file-list.component.ts
import { Component, ChangeDetectionStrategy, input, output, computed, signal, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';
import { FileJobItem } from '../../converter.models';
import { DOCUMENT_CONVERTER_CONFIG } from '../../converter.config';
import { FileCardComponent } from './file-card.component';

@Component({
  selector: 'app-file-list',
  standalone: true,
  imports: [CommonModule, TsIconComponent, FileCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="workspace-stage" aria-label="Selected files to convert">
      <!-- Stage Header Bar (Matches Image Compressor / Converter Reference) -->
      @if (files().length > 0) {
        <div class="stage-header-bar">
          <div class="stage-title-group">
            <h2 class="stage-title" id="file-converter-stage-heading">{{ headingTitle() }}</h2>
            <span class="stage-count-badge font-mono">{{ files().length }} / {{ maxFiles }}</span>
          </div>

          <!-- Right-aligned actions in strict order: Add Files, More dropdown, Clear -->
          <div class="stage-actions-group">
            <!-- 1. Add Files (Neutral, outlined, with plus icon - NO accent fill) -->
            <button
              type="button"
              class="add-more-header-btn"
              (click)="openPicker()"
              [disabled]="files().length >= maxFiles || isConverting()"
              title="Add more files to this batch"
              aria-label="Add Files"
            >
              <ts-icon name="plus" [size]="14" />
              <span class="btn-text">
                <span class="text-desktop">Add Files</span>
                <span class="text-mobile">Add</span>
              </span>
            </button>

            <!-- 2. More Dropdown Menu -->
            <div class="more-menu-wrapper">
              <button
                type="button"
                class="more-header-btn"
                (click)="toggleMoreMenu($event)"
                [attr.aria-expanded]="isMoreMenuOpen()"
                title="More options"
                aria-label="More options"
              >
                <span>More</span>
                <ts-icon [name]="isMoreMenuOpen() ? 'chevron-up' : 'chevron-down'" [size]="12" />
              </button>

              @if (isMoreMenuOpen()) {
                <div class="more-dropdown-panel animate-scale-up" (click)="$event.stopPropagation()">
                  <button
                    type="button"
                    class="more-menu-item"
                    (click)="onSelectAllClick()"
                  >
                    <ts-icon name="check-square" [size]="14" />
                    <span>Select all</span>
                  </button>

                  <button
                    type="button"
                    class="more-menu-item"
                    (click)="onRemoveFailedClick()"
                    [disabled]="!hasFailedFiles()"
                  >
                    <ts-icon name="trash" [size]="14" />
                    <span>Remove failed</span>
                  </button>

                  <button
                    type="button"
                    class="more-menu-item"
                    (click)="onDownloadAllZipClick()"
                    [disabled]="!hasCompletedFiles()"
                  >
                    <ts-icon name="download" [size]="14" />
                    <span>Download all ZIP</span>
                  </button>
                </div>
              }
            </div>

            <!-- 3. Clear (Ghost button, trash icon) -->
            <button
              type="button"
              class="clear-all-header-btn"
              (click)="clear.emit()"
              [disabled]="isConverting()"
              title="Remove all files"
              aria-label="Clear all files"
            >
              <ts-icon name="trash-2" [size]="13" />
              <span class="btn-text">Clear</span>
            </button>
          </div>
        </div>

        <p class="stage-instruction-text">Choose a format on the right, then convert. Your files are deleted after 1 hour.</p>
      }

      <!-- Gallery Grid of File Cards -->
      <div class="image-gallery-grid" role="list">
        @for (file of files(); track file.fileId) {
          <app-file-card
            [file]="file"
            (remove)="remove.emit($event)"
            (retry)="retry.emit($event)"
            (changeFormat)="changeFormat.emit($event)"
            (convert)="convertSingle.emit($event)"
          />
        }

        <!-- Dashed Add More Card in Grid with (n slots available) -->
        @if (files().length < maxFiles && !isConverting()) {
          <button
            type="button"
            class="add-tile-card"
            (click)="openPicker()"
            title="Add more files"
            aria-label="Add more files"
          >
            <div class="add-circle-icon">
              <ts-icon name="plus" [size]="24" />
            </div>
            <span class="add-tile-text">
              <span class="add-text-full">Add More</span>
              <span class="add-text-short">Add</span>
            </span>
            <span class="add-tile-subtext">({{ availableSlots() }} slots available)</span>
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
        aria-hidden="true"
        tabindex="-1"
      />
    </section>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .workspace-stage {
      display: flex;
      flex-direction: column;
      gap: 0;
      min-width: 0;
    }

    /* ─── Stage Header Bar ─── */
    .stage-header-bar {
      position: sticky;
      top: 0;
      z-index: 40;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 4px 0 16px 0;
      margin: 0;
      background: transparent;
    }

    .stage-title-group {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .stage-title {
      font-size: 18px;
      font-weight: 700;
      color: #0F172A;
      letter-spacing: -0.015em;
      margin: 0;
      line-height: 1.25;
    }

    :host-context([data-theme="dark"]) .stage-title,
    [data-theme="dark"] .stage-title {
      color: #F8FAFC;
    }

    .stage-instruction-text {
      font-size: 14px;
      color: #64748B;
      margin: -6px 0 16px 0;
      line-height: 1.4;
    }

    :host-context([data-theme="dark"]) .stage-instruction-text,
    [data-theme="dark"] .stage-instruction-text {
      color: #94A3B8;
    }

    .stage-count-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 7px;
      font-size: 11px;
      font-weight: 700;
      border-radius: 6px;
      background: #F1F5F9;
      color: #64748B;
      border: 1px solid #E2E8F0;
      letter-spacing: 0.02em;
    }

    :host-context([data-theme="dark"]) .stage-count-badge,
    [data-theme="dark"] .stage-count-badge {
      background: #18181B;
      color: #94A3B8;
      border-color: rgba(255, 255, 255, 0.1);
    }

    .stage-actions-group {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    /* 1. Add Files Button (Neutral, outlined, plus icon - NO accent fill) */
    .add-more-header-btn {
      height: 34px;
      padding: 0 14px;
      border-radius: 8px;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      color: #0F172A;
      font-size: 12.5px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
      box-sizing: border-box;
    }

    :host-context([data-theme="dark"]) .add-more-header-btn,
    [data-theme="dark"] .add-more-header-btn {
      background: #18181B;
      border-color: rgba(255, 255, 255, 0.12);
      color: #FFFFFF;
    }

    .add-more-header-btn:hover:not(:disabled) {
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
      transform: translateY(-1px);
    }

    :host-context([data-theme="dark"]) .add-more-header-btn:hover:not(:disabled),
    [data-theme="dark"] .add-more-header-btn:hover:not(:disabled) {
      border-color: var(--tool-accent, #3B82F6);
      color: var(--tool-accent, #3B82F6);
    }

    .add-more-header-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* 2. More Menu Dropdown */
    .more-menu-wrapper {
      position: relative;
    }

    .more-header-btn {
      height: 34px;
      padding: 0 12px;
      border-radius: 8px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      color: #475569;
      font-size: 12.5px;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      cursor: pointer;
      transition: all 0.15s;
    }

    :host-context([data-theme="dark"]) .more-header-btn,
    [data-theme="dark"] .more-header-btn {
      background: #18181B;
      border-color: rgba(255, 255, 255, 0.12);
      color: #CBD5E1;
    }

    .more-header-btn:hover {
      border-color: #CBD5E1;
      color: #0F172A;
    }

    :host-context([data-theme="dark"]) .more-header-btn:hover,
    [data-theme="dark"] .more-header-btn:hover {
      border-color: rgba(255, 255, 255, 0.25);
      color: #FFFFFF;
    }

    .more-dropdown-panel {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      width: 190px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.15);
      padding: 4px;
      z-index: 100;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    :host-context([data-theme="dark"]) .more-dropdown-panel,
    [data-theme="dark"] .more-dropdown-panel {
      background: #18181B;
      border-color: rgba(255, 255, 255, 0.12);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    }

    .more-menu-item {
      height: 32px;
      padding: 0 10px;
      border-radius: 7px;
      background: transparent;
      border: none;
      color: #334155;
      font-size: 12px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      text-align: left;
      transition: all 0.12s ease;
      width: 100%;
    }

    :host-context([data-theme="dark"]) .more-menu-item,
    [data-theme="dark"] .more-menu-item {
      color: #CBD5E1;
    }

    .more-menu-item:hover:not(:disabled) {
      background: #F1F5F9;
      color: #0F172A;
    }

    :host-context([data-theme="dark"]) .more-menu-item:hover:not(:disabled),
    [data-theme="dark"] .more-menu-item:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.06);
      color: #FFFFFF;
    }

    .more-menu-item:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    /* 3. Clear Button (Ghost) */
    .clear-all-header-btn {
      height: 34px;
      padding: 0 10px;
      border-radius: 8px;
      background: transparent;
      border: 1px solid transparent;
      color: #64748B;
      font-size: 12.5px;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      cursor: pointer;
      transition: all 0.15s;
    }

    :host-context([data-theme="dark"]) .clear-all-header-btn,
    [data-theme="dark"] .clear-all-header-btn {
      color: #94A3B8;
    }

    .clear-all-header-btn:hover:not(:disabled) {
      color: #EF4444;
      background: rgba(239, 68, 68, 0.08);
      border-color: rgba(239, 68, 68, 0.2);
    }

    .clear-all-header-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .text-mobile {
      display: none;
    }

    .text-desktop {
      display: inline;
    }

    /* ─── Gallery Grid ─── */
    .image-gallery-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 20px;
    }

    @media (max-width: 1279px) and (min-width: 900px) {
      .image-gallery-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px;
      }
    }

    @media (max-width: 899px) and (min-width: 600px) {
      .image-gallery-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }
    }

    @media (max-width: 599px) {
      .stage-header-bar {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .stage-title-group {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .image-gallery-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .text-desktop {
        display: none;
      }

      .text-mobile {
        display: inline;
      }

      .stage-title {
        font-size: 16px;
        line-height: 1.25;
        word-break: break-word;
      }

      .stage-actions-group {
        width: 100%;
        justify-content: flex-end;
      }
    }

    @media (max-width: 350px) {
      .image-gallery-grid {
        grid-template-columns: 1fr;
      }
    }

    /* ─── Add Tile Card ─── */
    .add-tile-card {
      position: relative;
      height: 100%;
      min-height: 180px;
      background: transparent;
      border: 2px dashed #E2E8F0;
      border-radius: var(--ts-radius-card, 16px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      color: #64748B;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      padding: 16px;
      box-sizing: border-box;
    }

    :host-context([data-theme="dark"]) .add-tile-card,
    [data-theme="dark"] .add-tile-card {
      border-color: rgba(255, 255, 255, 0.16);
      color: #94A3B8;
    }

    .add-tile-card:hover {
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
      transform: translateY(-2px);
    }

    :host-context([data-theme="dark"]) .add-tile-card:hover,
    [data-theme="dark"] .add-tile-card:hover {
      border-color: var(--tool-accent, #3B82F6);
      color: var(--tool-accent, #3B82F6);
    }

    .add-circle-icon {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #F1F5F9;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      color: inherit;
    }

    :host-context([data-theme="dark"]) .add-circle-icon,
    [data-theme="dark"] .add-circle-icon {
      background: rgba(255, 255, 255, 0.08);
    }

    .add-tile-text {
      font-size: 13.5px;
      font-weight: 700;
    }

    .add-text-short {
      display: none;
    }

    .add-tile-subtext {
      font-size: 11px;
      opacity: 0.75;
      color: #64748B;
    }

    :host-context([data-theme="dark"]) .add-tile-subtext,
    [data-theme="dark"] .add-tile-subtext {
      color: #94A3B8;
    }

    .hidden-file-input {
      position: absolute;
      width: 0;
      height: 0;
      opacity: 0;
      pointer-events: none;
    }
  `]
})
export class FileListComponent {
  readonly files = input.required<FileJobItem[]>();
  readonly isConverting = input<boolean>(false);

  readonly addFiles = output<File[]>();
  readonly remove = output<string>();
  readonly retry = output<string>();
  readonly changeFormat = output<string>();
  readonly convertSingle = output<string>();
  readonly selectAll = output<void>();
  readonly removeFailed = output<void>();
  readonly downloadAllZip = output<void>();
  readonly clear = output<void>();

  @ViewChild('filePicker') filePicker?: ElementRef<HTMLInputElement>;

  readonly maxFiles = DOCUMENT_CONVERTER_CONFIG.maxBatchFiles;
  readonly acceptedMimes = DOCUMENT_CONVERTER_CONFIG.acceptedInputMimeTypes;

  readonly isMoreMenuOpen = signal<boolean>(false);

  readonly availableSlots = computed<number>(() => {
    return Math.max(0, this.maxFiles - this.files().length);
  });

  readonly hasFailedFiles = computed<boolean>(() => {
    return this.files().some(f => f.status === 'failed');
  });

  readonly hasCompletedFiles = computed<boolean>(() => {
    return this.files().some(f => f.downloadUrl || f.convertedSizeBytes);
  });

  readonly headingTitle = computed<string>(() => {
    const list = this.files();
    if (list.length === 0) return '';

    const exts = list.map(f => f.sourceFormat?.toLowerCase() || '');

    const isAllPdf = exts.every(e => e === 'pdf');
    if (isAllPdf) return 'PDFs to Convert';

    const isAllDocuments = exts.every(e => ['docx', 'doc', 'odt', 'rtf', 'txt', 'html'].includes(e));
    if (isAllDocuments) return 'Documents to Convert';

    const isAllSpreadsheets = exts.every(e => ['xlsx', 'xls', 'ods', 'csv', 'tsv'].includes(e));
    if (isAllSpreadsheets) return 'Spreadsheets to Convert';

    const isAllPresentations = exts.every(e => ['pptx', 'ppt', 'odp'].includes(e));
    if (isAllPresentations) return 'Presentations to Convert';

    const isAllImages = exts.every(e => ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'tiff', 'svg', 'avif'].includes(e));
    if (isAllImages) return 'Images to Convert';

    return 'Files to Convert';
  });

  openPicker(): void {
    this.filePicker?.nativeElement.click();
  }

  onFilesPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.addFiles.emit(Array.from(input.files));
      input.value = '';
    }
  }

  toggleMoreMenu(event: Event): void {
    event.stopPropagation();
    this.isMoreMenuOpen.update(v => !v);
  }

  closeMoreMenu(): void {
    this.isMoreMenuOpen.set(false);
  }

  onSelectAllClick(): void {
    this.selectAll.emit();
    this.closeMoreMenu();
  }

  onRemoveFailedClick(): void {
    this.removeFailed.emit();
    this.closeMoreMenu();
  }

  onDownloadAllZipClick(): void {
    this.downloadAllZip.emit();
    this.closeMoreMenu();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.isMoreMenuOpen()) {
      this.closeMoreMenu();
    }
  }
}

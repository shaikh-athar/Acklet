// apps/tool-file-converter/src/components/document-converter/file-card.component.ts
import { Component, ChangeDetectionStrategy, input, output, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';
import { FileJobItem, StructureReport } from '../../converter.models';

const PERMANENT_ERROR_CODES = new Set([
  'CORRUPT_FILE',
  'EMPTY_FILE',
  'PASSWORD_PROTECTED',
  'INVALID_SIGNATURE',
  'UNSUPPORTED_FILE',
  'UNSUPPORTED_PAIR'
]);

@Component({
  selector: 'app-file-card',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="studio-image-card"
      [class.is-ready]="file().status === 'ready'"
      [class.is-converting]="file().status === 'converting'"
      [class.is-completed]="file().status === 'uploading' && file().convertedSizeBytes"
      [class.has-error]="file().status === 'failed'"
      role="region"
      [attr.aria-label]="file().originalFileName"
    >
      <!-- Top Thumbnail Frame (Aspect ratio 4 / 3, matching Image Compressor) -->
      <div
        class="card-thumb-frame"
        role="img"
        [title]="file().originalFileName"
        aria-label="Preview of file"
      >
        <!-- Top-Left Format Badge -->
        <div class="format-badge-wrap" (click)="$event.stopPropagation()">
          <span class="fmt-badge font-mono">{{ (file().sourceFormat || 'FILE') | uppercase }}</span>
        </div>

        <!-- Top-Right Close/Remove Button -->
        <button
          type="button"
          class="card-remove-btn"
          (click)="$event.stopPropagation(); remove.emit(file().fileId)"
          [disabled]="file().status === 'converting'"
          [attr.aria-label]="'Remove ' + file().originalFileName"
          title="Remove file"
        >
          <ts-icon name="x" [size]="13" />
        </button>

        <!-- Preview Rendering Strategy -->
        @if (isImageFormat() && imagePreviewUrl()) {
          <img
            [src]="imagePreviewUrl()!"
            [alt]="file().originalFileName"
            class="card-preview-img"
            loading="lazy"
          />
        } @else if (isPdfFormat()) {
          <div class="thumb-doc-frame is-pdf">
            <div class="doc-icon-circle is-pdf">
              <ts-icon name="file-text" [size]="30" />
            </div>
            <span class="doc-badge-tag is-pdf font-mono">PDF</span>
          </div>
        } @else if (isOfficeFormat()) {
          <div class="thumb-doc-frame is-office">
            <div class="doc-icon-circle is-office">
              <ts-icon [name]="getOfficeIconName()" [size]="28" />
            </div>
            <span class="doc-badge-tag is-office font-mono">{{ (file().sourceFormat || 'DOC') | uppercase }}</span>
          </div>
        } @else {
          <!-- Neutral File Icon with Extension in Center -->
          <div class="thumb-doc-frame is-neutral">
            <div class="doc-icon-circle is-neutral">
              <ts-icon name="file" [size]="26" />
            </div>
            <span class="doc-badge-tag is-neutral font-mono">{{ (file().sourceFormat || 'FILE') | uppercase }}</span>
          </div>
        }

        <!-- Converting Progress Overlay -->
        @if (file().status === 'converting') {
          <div class="processing-overlay" aria-hidden="true">
            <span class="spinner-circle-sm"></span>
            <span class="progress-pct font-mono">{{ file().progress }}%</span>
          </div>
        }
      </div>

      <!-- Bottom Card Body / Details -->
      <div class="card-body">
        <!-- Filename Row (Single line, truncated) -->
        <div class="filename-row">
          <span
            class="card-filename"
            [title]="file().originalFileName"
          >
            <span class="name-base">{{ nameWithoutExt() }}</span><span class="name-ext font-mono">.{{ fileExtension() }}</span>
          </span>
        </div>

        <!-- Meta Info Row: Size · Dimensions or Pages, Status Dot -->
        <div class="card-meta-row font-mono">
          <div class="meta-info-left">
            <span class="size-text">{{ formattedSize() }}</span>
            @if (metaDetails()) {
              <span class="meta-sep">&middot;</span>
              <span class="extra-text">{{ metaDetails() }}</span>
            }
          </div>

          <div class="meta-status-right">
            @if (file().status === 'failed') {
              <span class="error-dot" aria-hidden="true"></span>
              <span class="status-error-text" [title]="userErrorMessage()">
                {{ userErrorMessage() }}
              </span>
            } @else if (file().status === 'converting') {
              <span class="converting-dot" aria-hidden="true"></span>
              <span class="converting-text font-mono">{{ file().progress }}%</span>
            } @else {
              <span class="ready-dot" aria-hidden="true" title="Ready to convert"></span>
              <span class="ready-text">Ready</span>
            }
          </div>
        </div>

        <!-- Document-only structure line (NEVER shown for images) -->
        @if (hasStructureData(); as struct) {
          <div class="structure-line font-mono" aria-label="Detected document structure">
            <span class="structure-summary">{{ struct.summaryText }}</span>
            @if (struct.needsReview) {
              <span class="review-pill" title="Review suggested before final export">Review</span>
            }
          </div>
        }

        <!-- Per-card actions row at bottom matching Image Compressor -->
        <div class="card-action-bar">
          @if (file().status === 'failed') {
            @if (file().errorCode === 'UNSUPPORTED_PAIR') {
              <button
                type="button"
                class="card-btn-action btn-change-format"
                (click)="$event.stopPropagation(); changeFormat.emit(file().fileId)"
                title="Change format for this file"
              >
                <ts-icon name="refresh-cw" [size]="11" />
                <span>Change format</span>
              </button>
            } @else if (isRetryable()) {
              <button
                type="button"
                class="card-btn-action btn-retry"
                (click)="$event.stopPropagation(); retry.emit(file().fileId)"
                title="Retry conversion"
              >
                <ts-icon name="rotate-ccw" [size]="11" />
                <span>Retry</span>
              </button>
            }
          } @else if (file().status === 'converting') {
            <button type="button" class="card-btn-action btn-primary is-converting" disabled>
              <span class="spinner-circle-xs"></span>
              <span>Converting...</span>
            </button>
          } @else {
            <button
              type="button"
              class="card-btn-action btn-primary"
              (click)="$event.stopPropagation(); convert.emit(file().fileId)"
              title="Convert this file"
            >
              <span>Convert</span>
            </button>
          }
        </div>
      </div>
    </article>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .studio-image-card {
      width: 100%;
      min-width: 180px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: var(--ts-radius-card, 16px);
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
      transition: border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                  box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                  transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
    }

    :host-context([data-theme="dark"]) .studio-image-card,
    [data-theme="dark"] .studio-image-card {
      background: #18181B;
      border-color: rgba(255, 255, 255, 0.1);
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    }

    .studio-image-card:hover {
      border-color: var(--tool-accent, #2563EB);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(37, 99, 235, 0.12);
    }

    :host-context([data-theme="dark"]) .studio-image-card:hover,
    [data-theme="dark"] .studio-image-card:hover {
      border-color: var(--tool-accent, #3B82F6);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    }

    .studio-image-card.has-error {
      border-color: #FECACA;
    }

    :host-context([data-theme="dark"]) .studio-image-card.has-error,
    [data-theme="dark"] .studio-image-card.has-error {
      border-color: rgba(239, 68, 68, 0.35);
    }

    /* ── Top Thumbnail Frame (Aspect ratio 4/3) ── */
    .card-thumb-frame {
      position: relative;
      width: 100%;
      aspect-ratio: 4 / 3;
      background: #F8FAFC;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      cursor: pointer;
      user-select: none;
    }

    :host-context([data-theme="dark"]) .card-thumb-frame,
    [data-theme="dark"] .card-thumb-frame {
      background: #111318;
    }

    .card-preview-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .studio-image-card:hover .card-preview-img {
      transform: scale(1.03);
    }

    /* Format Badge Top-Left */
    .format-badge-wrap {
      position: absolute;
      top: 8px;
      left: 8px;
      display: flex;
      align-items: center;
      gap: 4px;
      z-index: 10;
    }

    .fmt-badge {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.04em;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(15, 23, 42, 0.72);
      backdrop-filter: blur(4px);
      color: #FFFFFF;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }

    /* Top-Right Close Button */
    .card-remove-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0.75;
      transition: all 0.15s ease;
      z-index: 10;
    }

    .card-remove-btn:hover:not(:disabled) {
      opacity: 1;
      background: #EF4444;
      border-color: #EF4444;
      transform: scale(1.08);
    }

    /* Document Frames (PDF, Office, Neutral) */
    .thumb-doc-frame {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      height: 100%;
    }

    .doc-icon-circle {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .studio-image-card:hover .doc-icon-circle {
      transform: scale(1.06);
    }

    .doc-icon-circle.is-pdf {
      background: rgba(239, 68, 68, 0.12);
      color: #EF4444;
      border: 1px solid rgba(239, 68, 68, 0.22);
    }

    .doc-icon-circle.is-office {
      background: rgba(59, 130, 246, 0.12);
      color: #3B82F6;
      border: 1px solid rgba(59, 130, 246, 0.22);
    }

    .doc-icon-circle.is-neutral {
      background: rgba(148, 163, 184, 0.14);
      color: #64748B;
      border: 1px solid rgba(148, 163, 184, 0.22);
    }

    .doc-badge-tag {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      padding: 2px 7px;
      border-radius: 4px;
    }

    .doc-badge-tag.is-pdf {
      background: rgba(239, 68, 68, 0.12);
      color: #EF4444;
    }

    .doc-badge-tag.is-office {
      background: rgba(59, 130, 246, 0.12);
      color: #2563EB;
    }

    :host-context([data-theme="dark"]) .doc-badge-tag.is-office {
      color: #60A5FA;
    }

    .doc-badge-tag.is-neutral {
      background: rgba(148, 163, 184, 0.12);
      color: #64748B;
    }

    /* Processing Overlay */
    .processing-overlay {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(3px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      z-index: 20;
    }

    .spinner-circle-sm {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-top-color: var(--tool-accent, #2563EB);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .progress-pct {
      font-size: 11px;
      font-weight: 700;
      color: #FFFFFF;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ── Bottom Card Body ── */
    .card-body {
      padding: 10px 12px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .filename-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }

    .card-filename {
      font-size: 12.5px;
      font-weight: 600;
      color: #0F172A;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: pointer;
      flex: 1;
      min-width: 0;
    }

    :host-context([data-theme="dark"]) .card-filename,
    [data-theme="dark"] .card-filename {
      color: #F8FAFC;
    }

    .card-filename:hover {
      color: var(--tool-accent, #2563EB);
    }

    :host-context([data-theme="dark"]) .card-filename:hover,
    [data-theme="dark"] .card-filename:hover {
      color: var(--tool-accent, #3B82F6);
    }

    .name-ext {
      opacity: 0.65;
      font-weight: 400;
      font-size: 11px;
    }

    /* ── Meta Info Row ── */
    .card-meta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      font-size: 11px;
      color: #64748B;
    }

    :host-context([data-theme="dark"]) .card-meta-row,
    [data-theme="dark"] .card-meta-row {
      color: #94A3B8;
    }

    .meta-info-left {
      display: flex;
      align-items: center;
      gap: 4px;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .meta-sep {
      opacity: 0.6;
    }

    .meta-status-right {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .ready-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10B981;
      display: inline-block;
    }

    .ready-text {
      font-size: 11px;
      color: #10B981;
      font-weight: 600;
    }

    .converting-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--tool-accent, #2563EB);
      display: inline-block;
    }

    .converting-text {
      font-size: 11px;
      color: var(--tool-accent, #2563EB);
      font-weight: 600;
    }

    :host-context([data-theme="dark"]) .converting-dot,
    [data-theme="dark"] .converting-dot {
      background: var(--tool-accent, #3B82F6);
    }

    :host-context([data-theme="dark"]) .converting-text,
    [data-theme="dark"] .converting-text {
      color: var(--tool-accent, #3B82F6);
    }

    .error-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #EF4444;
      display: inline-block;
    }

    .status-error-text {
      font-size: 11px;
      font-weight: 600;
      color: #EF4444;
      max-width: 90px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ── Document Structure Line (NEVER for images) ── */
    .structure-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      font-size: 10.5px;
      color: #64748B;
      padding-top: 4px;
      margin-top: 2px;
      border-top: 1px solid #F1F5F9;
    }

    :host-context([data-theme="dark"]) .structure-line,
    [data-theme="dark"] .structure-line {
      color: #94A3B8;
      border-top-color: rgba(255, 255, 255, 0.06);
    }

    .structure-summary {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }

    .review-pill {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      padding: 1px 5px;
      border-radius: 4px;
      background: rgba(245, 158, 11, 0.12);
      color: #D97706;
      border: 1px solid rgba(245, 158, 11, 0.25);
      flex-shrink: 0;
    }

    :host-context([data-theme="dark"]) .review-pill,
    [data-theme="dark"] .review-pill {
      color: #F59E0B;
    }

    /* ── Bottom Actions Row ── */
    .card-action-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding-top: 4px;
    }

    .card-btn-action {
      height: 26px;
      padding: 0 10px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      border: none;
      cursor: pointer;
      transition: all 0.15s ease;
      box-sizing: border-box;
      flex: 1;
    }

    .btn-primary {
      background: var(--tool-accent, #2563EB);
      color: var(--tool-accent-contrast, #FFFFFF);
    }

    :host-context([data-theme="dark"]) .btn-primary,
    [data-theme="dark"] .btn-primary {
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
    }

    .btn-primary:hover:not(:disabled) {
      filter: brightness(1.08);
    }

    .btn-change-format,
    .btn-retry {
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      color: #0F172A;
      width: 100%;
    }

    :host-context([data-theme="dark"]) .btn-change-format,
    :host-context([data-theme="dark"]) .btn-retry,
    [data-theme="dark"] .btn-change-format,
    [data-theme="dark"] .btn-retry {
      background: #18181B;
      border-color: rgba(255, 255, 255, 0.12);
      color: #F8FAFC;
    }

    .btn-change-format:hover,
    .btn-retry:hover {
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
    }

    .spinner-circle-xs {
      width: 12px;
      height: 12px;
      border: 2px solid rgba(255, 255, 255, 0.25);
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
  `]
})
export class FileCardComponent implements OnInit, OnDestroy {
  readonly file = input.required<FileJobItem>();

  readonly remove = output<string>();
  readonly retry = output<string>();
  readonly changeFormat = output<string>();
  readonly convert = output<string>();

  readonly imagePreviewUrl = signal<string | null>(null);
  readonly imageDimensions = signal<{ width: number; height: number } | null>(null);

  ngOnInit(): void {
    const f = this.file();
    if (f.nativeFile && this.isImageFormat()) {
      try {
        const url = URL.createObjectURL(f.nativeFile);
        this.imagePreviewUrl.set(url);

        const img = new Image();
        img.onload = () => {
          this.imageDimensions.set({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.src = url;
      } catch {
        // Fallback
      }
    }
  }

  ngOnDestroy(): void {
    const url = this.imagePreviewUrl();
    if (url && url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Safe disposal
      }
    }
  }

  readonly isImageFormat = computed<boolean>(() => {
    const ext = this.file().sourceFormat?.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'tiff', 'svg', 'avif'].includes(ext);
  });

  readonly isPdfFormat = computed<boolean>(() => {
    return this.file().sourceFormat?.toLowerCase() === 'pdf';
  });

  readonly isOfficeFormat = computed<boolean>(() => {
    const ext = this.file().sourceFormat?.toLowerCase();
    return ['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt', 'odt', 'ods', 'odp', 'csv', 'tsv', 'rtf'].includes(ext);
  });

  nameWithoutExt(): string {
    const name = this.file().originalFileName || '';
    const lastDot = name.lastIndexOf('.');
    return lastDot > 0 ? name.substring(0, lastDot) : name;
  }

  fileExtension(): string {
    const name = this.file().originalFileName || '';
    const lastDot = name.lastIndexOf('.');
    return lastDot > 0 ? name.substring(lastDot + 1) : (this.file().sourceFormat || 'file');
  }

  getOfficeIconName(): string {
    const ext = this.file().sourceFormat?.toLowerCase();
    if (['xlsx', 'xls', 'ods', 'csv', 'tsv'].includes(ext)) return 'table';
    if (['pptx', 'ppt', 'odp'].includes(ext)) return 'presentation';
    return 'file-text';
  }

  formattedSize(): string {
    const bytes = this.file().sizeBytes;
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  readonly metaDetails = computed<string | null>(() => {
    if (this.isImageFormat()) {
      const dims = this.imageDimensions() || this.file().dimensions;
      if (dims) {
        return `${dims.width} × ${dims.height}`;
      }
      return null;
    }
    if (this.isPdfFormat() || this.isOfficeFormat()) {
      const pages = this.file().pageCount;
      if (pages) {
        return `${pages} ${pages === 1 ? 'page' : 'pages'}`;
      }
    }
    return null;
  });

  userErrorMessage(): string {
    const f = this.file();
    if (f.errorCode === 'UNSUPPORTED_PAIR') {
      return 'Format pair unsupported';
    }
    return f.errorMessage || 'Conversion failed';
  }

  isRetryable(): boolean {
    const code = this.file().errorCode;
    if (!code) return true;
    return !PERMANENT_ERROR_CODES.has(code);
  }

  // Document input: show a structure line only here, with a Review pill only when flagged items exist.
  // NEVER show structure data for image inputs!
  readonly hasStructureData = computed<{ summaryText: string; needsReview: boolean } | null>(() => {
    if (this.isImageFormat()) return null;
    const rep = this.file().structureReport;
    if (!rep) return null;

    const parts: string[] = [];
    if (rep.tablesCount > 0) {
      parts.push(`${rep.tablesCount} ${rep.tablesCount === 1 ? 'table' : 'tables'}`);
    }
    if (rep.headingsCount > 0) {
      parts.push(`${rep.headingsCount} ${rep.headingsCount === 1 ? 'heading' : 'headings'}`);
    }
    if (rep.columnsCount > 1) {
      parts.push(`${rep.columnsCount} columns`);
    }
    if (rep.imagesCount > 0 && parts.length < 2) {
      parts.push(`${rep.imagesCount} ${rep.imagesCount === 1 ? 'image' : 'images'}`);
    }

    if (parts.length === 0) return null;

    const summaryText = parts.join(' · ');
    const needsReview = Boolean(
      rep.hasLowConfidence ||
      rep.chips?.some(c => c.lowConfidence) ||
      (rep.reviewItems && rep.reviewItems.length > 0)
    );

    return { summaryText, needsReview };
  });
}

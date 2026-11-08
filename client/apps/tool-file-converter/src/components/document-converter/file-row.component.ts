// apps/tool-file-converter/src/components/document-converter/file-row.component.ts
import { Component, ChangeDetectionStrategy, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';
import { FileJobItem } from '../../converter.models';
import { ConverterApiService } from '../../converter.service';
import { StructureCheckComponent } from './structure-check.component';

@Component({
  selector: 'app-file-row',
  standalone: true,
  imports: [CommonModule, TsIconComponent, StructureCheckComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="file-row"
      [class.is-ready]="file().status === 'ready'"
      [class.is-failed]="file().status === 'failed'"
      [class.is-converting]="file().status === 'converting'"
    >
      <div class="row-main">
        <!-- Document Type Icon (neutral muted, 20px, stroke 1.5) -->
        <div class="file-icon-box" aria-hidden="true">
          <ts-icon [name]="getDocIconName()" [size]="20" class="file-icon" />
        </div>

        <!-- Format Badge: soft accent bg with accent text -->
        <span class="format-badge">{{ getFormatBadgeText() }}</span>

        <!-- Name & Meta -->
        <div class="file-details">
          <div class="file-name-line">
            <span class="file-name" [title]="file().originalFileName">
              {{ file().originalFileName }}
            </span>
          </div>
          <div class="file-meta">
            <span class="meta-size-box">
              <span class="file-size">{{ api.formatBytes(file().sizeBytes) }}</span>
              <span class="meta-dot" aria-hidden="true">•</span>
            </span>
            @if (file().status === 'queued') {
              <span class="badge-queued">Queued</span>
              @if (file().queueMessage) {
                <span class="queue-msg">{{ file().queueMessage }}</span>
              }
            } @else {
              <span class="status-text" [class.status-error]="file().status === 'failed'">
                {{ getStatusText() }}
              </span>
            }
            @if (file().status === 'failed') {
              @if (file().errorCode === 'UNSUPPORTED_PAIR') {
                <button
                  type="button"
                  class="change-format-btn"
                  (click)="changeFormat.emit(file().fileId)"
                  aria-label="Change target format"
                >
                  Change format
                </button>
              } @else if (isRetryable(file().errorCode)) {
                <button
                  type="button"
                  class="retry-btn"
                  (click)="retry.emit(file().fileId)"
                  aria-label="Retry converting this file"
                >
                  Retry
                </button>
              }
            }
          </div>
        </div>

        <!-- Action / Remove Button -->
        <div class="row-actions">
          @if (file().status === 'ready' && file().runtime === 'browser') {
            <span class="privacy-note" title="Processed entirely in your browser without leaving your device">
              <ts-icon name="shield-check" [size]="14" />
              <span>Processed on your device</span>
            </span>
          }

          @if (file().status === 'ready' && file().downloadUrl) {
            <a
              [href]="file().downloadUrl"
              [download]="file().sanitizedFileName + '.' + file().targetFormat"
              class="download-icon-btn"
              title="Download file"
              aria-label="Download converted file"
            >
              <ts-icon name="download" [size]="16" />
            </a>
          }

          <button
            type="button"
            class="remove-btn"
            (click)="remove.emit(file().fileId)"
            title="Remove file"
            aria-label="Remove file"
          >
            <ts-icon name="x" [size]="16" />
          </button>
        </div>
      </div>

      <!-- Thin Progress Bar in accent color -->
      @if (file().status === 'converting' || (file().status === 'queued' && file().progress > 0)) {
        <div class="progress-track" role="progressbar" [attr.aria-valuenow]="file().progress" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-fill" [style.width.%]="file().progress || 15"></div>
        </div>
      }

      <!-- Structure Check list under the file -->
      @if (file().structureReport) {
        <div class="row-structure">
          <app-structure-check [report]="file().structureReport" />
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .file-row {
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      background: var(--bg-surface);
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: border-color 150ms ease;
    }

    .file-row:hover {
      border-color: var(--border-default);
    }

    .row-main {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .file-icon-box {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      flex-shrink: 0;
    }

    /* Format Badge: soft accent background with accent text */
    .format-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--tool-accent-soft);
      color: var(--tool-accent);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      flex-shrink: 0;
    }

    .file-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      flex: 1;
    }

    .file-name-line {
      display: flex;
      align-items: center;
      min-width: 0;
    }

    .file-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .file-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--text-muted);
      flex-wrap: wrap;
    }

    .meta-size-box {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .meta-dot {
      color: var(--border-default);
      user-select: none;
    }

    .status-text {
      color: var(--text-muted);
      font-weight: 400;
    }

    .status-text.status-error {
      color: var(--color-error, #dc2626);
      font-weight: 600;
    }

    .badge-queued {
      display: inline-flex;
      align-items: center;
      padding: 1px 6px;
      border-radius: 4px;
      background: var(--bg-muted);
      color: var(--text-secondary);
      font-size: 11px;
      font-weight: 500;
    }

    .queue-msg {
      font-size: 12px;
      color: var(--text-muted);
    }

    .privacy-note {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 500;
      color: var(--text-muted);
      background: var(--bg-muted);
      padding: 3px 8px;
      border-radius: 6px;
      white-space: nowrap;
      margin-right: 4px;
    }

    .retry-btn,
    .change-format-btn {
      background: none;
      border: none;
      padding: 0 4px;
      font-size: 13px;
      font-weight: 600;
      color: var(--tool-accent);
      cursor: pointer;
      text-decoration: underline;
      outline: none;
    }

    .retry-btn:hover,
    .change-format-btn:hover {
      opacity: 0.85;
    }

    .retry-btn:focus-visible,
    .change-format-btn:focus-visible {
      outline: 2px solid var(--tool-accent);
      outline-offset: 2px;
    }

    .row-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .download-icon-btn,
    .remove-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      outline: none;
      transition: background-color 150ms ease, color 150ms ease;
    }

    .download-icon-btn:hover,
    .remove-btn:hover {
      background: var(--bg-muted);
      color: var(--text-primary);
    }

    .download-icon-btn:focus-visible,
    .remove-btn:focus-visible {
      outline: 2px solid var(--tool-accent);
      outline-offset: 2px;
    }

    .progress-track {
      width: 100%;
      height: 2px;
      background: var(--border-subtle);
      border-radius: 1px;
      overflow: hidden;
      margin-top: 2px;
    }

    .progress-fill {
      height: 100%;
      background: var(--tool-accent);
      transition: width 150ms ease;
    }

    .row-structure {
      border-top: 1px solid var(--border-subtle);
      margin-top: 4px;
      padding-top: 4px;
    }

    @media (prefers-reduced-motion: reduce) {
      .file-row,
      .download-icon-btn,
      .remove-btn,
      .progress-fill {
        transition: none !important;
      }
    }
  `]
})
export class FileRowComponent {
  readonly api = inject(ConverterApiService);
  readonly file = input.required<FileJobItem>();

  readonly remove = output<string>();
  readonly retry = output<string>();
  readonly changeFormat = output<string>();

  getDocIconName(): string {
    const ext = this.file().sourceFormat?.toLowerCase() || '';
    if (['docx', 'doc', 'odt', 'rtf', 'txt'].includes(ext)) {
      return 'file-text';
    }
    if (['xlsx', 'xls', 'ods', 'csv', 'tsv'].includes(ext)) {
      return 'file-spreadsheet';
    }
    if (['pptx', 'ppt', 'odp'].includes(ext)) {
      return 'presentation';
    }
    if (ext === 'pdf') {
      return 'file-type';
    }
    return 'file';
  }

  getFormatBadgeText(): string {
    const ext = this.file().sourceFormat || 'FILE';
    return ext.toUpperCase();
  }

  getStatusText(): string {
    const item = this.file();
    switch (item.status) {
      case 'ready':
        return 'Ready';
      case 'converting':
        return item.progress > 0 ? `Converting ${item.progress}%` : 'Converting...';
      case 'uploading':
        return 'Uploading...';
      case 'failed':
        return item.errorMessage || 'Failed. Retry';
      case 'queued':
        return item.queueMessage || 'Queued';
      default:
        return 'Ready';
    }
  }

  isRetryable(code?: string): boolean {
    if (!code) return true;
    const nonRetryable = ['CORRUPTED_FILE', 'ENCRYPTED', 'ENCRYPTED_FILE', 'TOO_LARGE', 'OCR_FAILED', 'UNSUPPORTED_PAIR'];
    return !nonRetryable.includes(code.toUpperCase());
  }
}

// client/apps/tool-qr-generator/src/components/batch-generator/batch-generator.component.ts
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  Output,
  EventEmitter,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TsIconComponent } from '@acklet/tool-shell';
import { QRGeneratorService } from '../../services/qr-generator.service';
import { BatchQrItem, QROptions } from '../../models/qr-generator.models';

const SAMPLE_CSV = `Item,Target_URL
Product Alpha,https://acklet.com/products/alpha
Product Beta,https://acklet.com/products/beta
Table 1 Menu,https://acklet.com/menu?table=1
Table 2 Menu,https://acklet.com/menu?table=2
Guest WiFi,WIFI:S:Guest-Net;T:WPA;P:guest2026;;
Support Center,mailto:support@acklet.com?subject=Help`;

@Component({
  selector: 'app-qr-batch-generator',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="batch-overlay" (click)="onBackdropClick($event)" role="presentation">
      <div
        class="batch-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-modal-title"
        aria-describedby="batch-modal-desc"
        tabindex="-1"
      >
        <!-- Header -->
        <header class="batch-header">
          <div class="header-left">
            <ts-icon name="layers" class="header-icon" />
            <div>
              <h2 id="batch-modal-title" class="header-title">Batch QR Code Generator</h2>
              <p id="batch-modal-desc" class="header-sub">
                Upload a CSV or paste multiple URLs/payloads to generate and download a complete ZIP archive.
              </p>
            </div>
          </div>
          <button
            type="button"
            class="close-btn"
            (click)="close.emit()"
            aria-label="Close batch modal"
          >
            <ts-icon name="x" [size]="18" />
          </button>
        </header>

        <!-- Body -->
        <div class="batch-body custom-scrollbar">
          <!-- Step 1: Input Section -->
          <section class="batch-input-section">
            <div class="section-top-row">
              <label class="section-label">
                <span>Data Source (CSV or List)</span>
                <span class="count-badge">{{ items().length }} items detected</span>
              </label>
              <button
                type="button"
                class="sample-btn"
                (click)="loadSampleCsv()"
                title="Populate with sample data"
              >
                <ts-icon name="file-text" class="btn-icon-xs" />
                <span>Load Sample CSV</span>
              </button>
            </div>

            <!-- Upload Dropzone -->
            <div
              class="csv-dropzone"
              [class.drag-over]="isDragging()"
              (dragover)="onDragOver($event)"
              (dragleave)="isDragging.set(false)"
              (drop)="onFileDrop($event)"
              (click)="fileInput.click()"
            >
              <input
                #fileInput
                type="file"
                accept=".csv,.txt"
                class="hidden-file-input"
                (change)="onFileSelected($event)"
              />
              <ts-icon name="upload-cloud" class="dropzone-icon" />
              <div class="dropzone-text">
                <span class="dropzone-primary">
                  {{ uploadedFileName() || 'Upload CSV or TXT file' }}
                </span>
                <span class="dropzone-hint">Format: "Title,URL" or one URL per line</span>
              </div>
            </div>

            <!-- Raw Text Area -->
            <div class="textarea-wrapper">
              <textarea
                class="batch-textarea"
                rows="5"
                placeholder="Paste URLs or CSV lines here (e.g. Table 1,https://example.com/1)..."
                [value]="rawText()"
                (input)="onTextInput($event)"
              ></textarea>
            </div>

            @if (parseError()) {
              <p class="parse-error-msg">
                <ts-icon name="alert-circle" />
                <span>{{ parseError() }}</span>
              </p>
            }
          </section>

          <!-- Step 2: Progress Bar (if generating) -->
          @if (isGenerating()) {
            <div class="progress-bar-wrapper">
              <div
                class="progress-bar-fill"
                [style.width.%]="progressPercent()"
              ></div>
            </div>
          }

          <!-- Step 3: Preview Cards Grid -->
          @if (items().length > 0) {
            <section class="batch-preview-grid" role="list">
              @for (item of items(); track item.id; let idx = $index) {
                <article class="batch-item-card" [class.ready]="item.status === 'done'">
                  <div class="item-card-preview">
                    @if (item.dataUrl) {
                      <img [src]="item.dataUrl" [alt]="item.title" class="item-qr-img" />
                    } @else if (item.status === 'generating') {
                      <div class="item-loading-spinner">
                        <ts-icon name="loader-2" class="animate-spin" />
                      </div>
                    } @else {
                      <div class="item-pending-placeholder">
                        <ts-icon name="qr-code" />
                      </div>
                    }
                  </div>

                  <div class="item-card-body">
                    <div class="item-card-header-row">
                      <span class="item-index-badge">#{{ idx + 1 }}</span>
                      <span
                        class="item-status-pill"
                        [class.done]="item.status === 'done'"
                        [class.pending]="item.status === 'pending'"
                      >
                        {{ item.status }}
                      </span>
                    </div>

                    <h4 class="item-card-title" [title]="item.title">{{ item.title }}</h4>
                    <code class="item-card-payload" [title]="item.content">{{ item.content }}</code>

                    @if (item.dataUrl) {
                      <div class="item-card-actions">
                        <button
                          type="button"
                          class="item-btn-download"
                          (click)="downloadSingle(item)"
                          title="Download PNG"
                        >
                          <ts-icon name="download" />
                          <span>PNG</span>
                        </button>
                        <button
                          type="button"
                          class="item-btn-copy"
                          (click)="copySingle(item)"
                          title="Copy payload"
                        >
                          <ts-icon name="copy" />
                        </button>
                      </div>
                    }
                  </div>
                </article>
              }
            </section>
          }
        </div>

        <!-- Footer Action Bar (Always Visible) -->
        <footer class="batch-footer">
          <div class="footer-info">
            @if (isGenerating()) {
              <span class="generating-status">
                <ts-icon name="loader-2" class="animate-spin" />
                Generating {{ progress().current }} of {{ progress().total }}...
              </span>
            } @else if (isZipping()) {
              <span class="generating-status">
                <ts-icon name="loader-2" class="animate-spin" />
                Packaging ZIP archive...
              </span>
            } @else if (items().length > 0) {
              <span class="ready-status">
                {{ items().length }} items ready for generation
              </span>
            } @else {
              <span class="hint-status">
                Paste lines or load a sample CSV above to begin
              </span>
            }
          </div>

          <div class="footer-actions">
            @if (items().length > 0) {
              <button
                type="button"
                class="btn-clear-all"
                (click)="clearAll()"
                title="Reset batch list"
              >
                <ts-icon name="trash-2" />
                <span>Clear</span>
              </button>
            }

            <button
              type="button"
              class="btn-primary-action"
              [disabled]="items().length === 0 || isGenerating() || isZipping()"
              (click)="generateAndDownloadZip()"
            >
              <ts-icon
                [name]="(isGenerating() || isZipping()) ? 'loader-2' : 'archive'"
                [class.animate-spin]="isGenerating() || isZipping()"
              />
              <span>
                @if (isGenerating()) {
                  Generating ({{ progress().current }}/{{ progress().total }})...
                } @else if (isZipping()) {
                  Packaging ZIP...
                } @else if (hasGeneratedItems()) {
                  Download ZIP ({{ items().length }})
                } @else {
                  Generate and download ZIP ({{ items().length }})
                }
              </span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .batch-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(6px);
      z-index: 1050;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      animation: fadeIn 0.2s ease-in-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .batch-modal {
      background: var(--surface-1, #111A2E);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
      border-radius: 14px;
      width: 100%;
      max-width: 860px;
      max-height: 88vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.5);
      overflow: hidden;
      outline: none;
      color: var(--text-primary);
      animation: zoomIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    :host-context([data-theme="light"]) .batch-modal,
    [data-theme="light"] .batch-modal {
      background: #FFFFFF;
      border: 1px solid var(--border-subtle, #E2E8F0);
      box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.15);
      color: var(--text-primary, #09090B);
    }

    @keyframes zoomIn {
      from { transform: scale(0.97); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .batch-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.125rem 1.5rem;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .batch-header,
    [data-theme="light"] .batch-header {
      border-bottom: 1px solid var(--border-subtle, #E2E8F0);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.875rem;
    }

    .header-icon {
      font-size: 1.5rem;
      color: var(--tool-accent, var(--accent, #3b82f6));
    }

    .header-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0;
      color: var(--text-primary, #FFFFFF);
    }

    :host-context([data-theme="light"]) .header-title,
    [data-theme="light"] .header-title {
      color: var(--text-primary, #09090B);
    }

    .header-sub {
      font-size: 0.75rem;
      color: var(--text-secondary, #94A3B8);
      margin: 0.125rem 0 0 0;
    }

    :host-context([data-theme="light"]) .header-sub,
    [data-theme="light"] .header-sub {
      color: var(--text-secondary, #52525B);
    }

    .close-btn {
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-secondary, #94A3B8);
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .close-btn:hover {
      background: var(--surface-3, rgba(255, 255, 255, 0.08));
      color: var(--text-primary, #fff);
      border-color: var(--border-subtle);
    }

    .close-btn:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }

    .batch-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .batch-input-section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .section-top-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .section-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-primary, #fff);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    :host-context([data-theme="light"]) .section-label,
    [data-theme="light"] .section-label {
      color: var(--text-primary, #09090B);
    }

    .count-badge {
      font-size: 0.6875rem;
      color: var(--tool-accent, var(--accent, #3b82f6));
      font-weight: 500;
    }

    .sample-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.3rem 0.6rem;
      border-radius: 6px;
      font-size: 0.75rem;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.15));
      background: var(--surface-2, rgba(255, 255, 255, 0.04));
      color: var(--text-secondary, #94A3B8);
      cursor: pointer;
      transition: all 0.15s;
    }

    :host-context([data-theme="light"]) .sample-btn,
    [data-theme="light"] .sample-btn {
      background: #FFFFFF;
      border-color: #E2E8F0;
      color: #52525B;
    }

    .sample-btn:hover {
      background: var(--accent-soft, rgba(59, 130, 246, 0.12));
      color: var(--accent-strong, #3b82f6);
      border-color: var(--accent-border, rgba(59, 130, 246, 0.3));
    }

    .btn-icon-xs {
      width: 0.75rem;
      height: 0.75rem;
    }

    .csv-dropzone {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      padding: 0.75rem 1rem;
      background: var(--surface-2, #16233D);
      border: 1px dashed var(--border-subtle, rgba(255, 255, 255, 0.15));
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    :host-context([data-theme="light"]) .csv-dropzone,
    [data-theme="light"] .csv-dropzone {
      background: #FFFFFF;
      border-color: #CBD5E1;
    }

    .csv-dropzone:hover,
    .csv-dropzone.drag-over {
      border-color: var(--tool-accent, var(--accent, #3b82f6));
      background: var(--accent-soft, rgba(59, 130, 246, 0.08));
    }

    .dropzone-icon {
      font-size: 1.5rem;
      color: var(--text-secondary, #94A3B8);
    }

    .dropzone-text {
      display: flex;
      flex-direction: column;
    }

    .dropzone-primary {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text-primary, #fff);
    }

    :host-context([data-theme="light"]) .dropzone-primary,
    [data-theme="light"] .dropzone-primary {
      color: var(--text-primary, #09090B);
    }

    .dropzone-hint {
      font-size: 0.6875rem;
      color: var(--text-muted, #64748B);
    }

    :host-context([data-theme="light"]) .dropzone-hint,
    [data-theme="light"] .dropzone-hint {
      color: var(--text-muted, #71717A);
    }

    .hidden-file-input {
      display: none;
    }

    .textarea-wrapper {
      width: 100%;
    }

    .batch-textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 0.75rem;
      font-size: 0.8125rem;
      font-family: var(--font-mono, monospace);
      border-radius: 8px;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.15));
      background: var(--surface-2, #16233D);
      color: var(--text-primary, #fff);
      resize: vertical;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    :host-context([data-theme="light"]) .batch-textarea,
    [data-theme="light"] .batch-textarea {
      background: #FFFFFF !important;
      border: 1px solid #CBD5E1;
      color: var(--text-primary, #09090B);
    }

    .batch-textarea:focus {
      outline: none;
      border-color: var(--tool-accent, var(--accent, #3b82f6));
      box-shadow: 0 0 0 3px var(--accent-soft, rgba(59, 130, 246, 0.2));
    }

    .parse-error-msg {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.375rem;
      color: #ef4444;
      font-size: 0.75rem;
    }

    .progress-bar-wrapper {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 999px;
      overflow: hidden;
    }

    :host-context([data-theme="light"]) .progress-bar-wrapper,
    [data-theme="light"] .progress-bar-wrapper {
      background: #E2E8F0;
    }

    .progress-bar-fill {
      height: 100%;
      background: var(--tool-accent, var(--accent, #3b82f6));
      transition: width 0.15s ease;
    }

    .batch-preview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 0.75rem;
    }

    .batch-item-card {
      background: var(--surface-2, #16233D);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      border-radius: 8px;
      padding: 0.75rem;
      display: flex;
      gap: 0.75rem;
      transition: border-color 0.15s;
    }

    :host-context([data-theme="light"]) .batch-item-card,
    [data-theme="light"] .batch-item-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    .batch-item-card.ready {
      border-color: var(--accent-border, rgba(59, 130, 246, 0.3));
    }

    .item-card-preview {
      width: 68px;
      height: 68px;
      background: #ffffff;
      border: 1px solid var(--border-subtle, #E2E8F0);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
    }

    .item-qr-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .item-pending-placeholder,
    .item-loading-spinner {
      color: var(--text-muted, #94A3B8);
      font-size: 1.5rem;
    }

    .item-card-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      gap: 0.25rem;
    }

    .item-card-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .item-index-badge {
      font-size: 0.65rem;
      font-family: var(--font-mono, monospace);
      color: var(--text-muted, #94A3B8);
    }

    .item-status-pill {
      font-size: 0.6rem;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
      text-transform: uppercase;
      font-weight: 600;
    }

    .item-status-pill.pending {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-muted, #94A3B8);
    }

    :host-context([data-theme="light"]) .item-status-pill.pending,
    [data-theme="light"] .item-status-pill.pending {
      background: #F1F5F9;
      color: #64748B;
    }

    .item-status-pill.done {
      background: rgba(16, 185, 129, 0.15);
      color: #10B981;
    }

    .item-card-title {
      font-size: 0.8125rem;
      font-weight: 600;
      margin: 0;
      color: var(--text-primary, #fff);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host-context([data-theme="light"]) .item-card-title,
    [data-theme="light"] .item-card-title {
      color: var(--text-primary, #09090B);
    }

    .item-card-payload {
      font-size: 0.6875rem;
      color: var(--text-secondary, #94A3B8);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host-context([data-theme="light"]) .item-card-payload,
    [data-theme="light"] .item-card-payload {
      color: var(--text-secondary, #52525B);
    }

    .item-card-actions {
      display: flex;
      gap: 0.375rem;
      margin-top: 0.25rem;
    }

    .item-btn-download,
    .item-btn-copy {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.2rem 0.45rem;
      border-radius: 4px;
      font-size: 0.6875rem;
      background: var(--surface-3, rgba(255, 255, 255, 0.08));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.15));
      color: var(--text-primary, #fff);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="light"]) .item-btn-download,
    :host-context([data-theme="light"]) .item-btn-copy,
    [data-theme="light"] .item-btn-download,
    [data-theme="light"] .item-btn-copy {
      background: #F1F5F9;
      border-color: #E2E8F0;
      color: #09090B;
    }

    .item-btn-download:hover,
    .item-btn-copy:hover {
      background: var(--accent-soft);
      border-color: var(--accent-border);
      color: var(--accent-strong);
    }

    /* Modal Footer */
    .batch-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      background: var(--surface-1, #111A2E);
    }

    :host-context([data-theme="light"]) .batch-footer,
    [data-theme="light"] .batch-footer {
      background: #F8FAFC;
      border-top: 1px solid #E2E8F0;
    }

    .footer-info {
      font-size: 0.8125rem;
    }

    .generating-status {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--tool-accent, #3b82f6);
      font-weight: 500;
    }

    .ready-status {
      color: var(--text-primary, #fff);
      font-weight: 500;
    }

    :host-context([data-theme="light"]) .ready-status,
    [data-theme="light"] .ready-status {
      color: var(--text-primary, #09090B);
    }

    .hint-status {
      color: var(--text-muted, #64748B);
    }

    .footer-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .btn-clear-all {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-secondary, #94A3B8);
      font-size: 0.8125rem;
      cursor: pointer;
      padding: 0.45rem 0.75rem;
      border-radius: 6px;
      transition: all 0.15s ease;
    }

    .btn-clear-all:hover {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }

    .btn-primary-action {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.55rem 1.25rem;
      background: var(--tool-accent, var(--accent, #2563EB));
      color: #FFFFFF;
      border: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    .btn-primary-action:hover:not(:disabled) {
      background: var(--accent-strong, #1D4ED8);
      box-shadow: 0 4px 12px var(--accent-glow, rgba(37, 99, 235, 0.3));
    }

    .btn-primary-action:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }

    .btn-primary-action:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class QrBatchGeneratorComponent {
  private readonly qrService: QRGeneratorService;

  constructor(qrService?: QRGeneratorService) {
    this.qrService = qrService ?? inject(QRGeneratorService);
  }

  @Output() readonly close = new EventEmitter<void>();

  readonly rawText = signal<string>('');
  readonly uploadedFileName = signal<string | null>(null);
  readonly items = signal<BatchQrItem[]>([]);
  readonly isGenerating = signal<boolean>(false);
  readonly isZipping = signal<boolean>(false);
  readonly isDragging = signal<boolean>(false);
  readonly parseError = signal<string | null>(null);
  readonly progress = signal<{ current: number; total: number }>({ current: 0, total: 0 });

  readonly progressPercent = computed(() => {
    const { current, total } = this.progress();
    if (total === 0) return 0;
    return Math.round((current / total) * 100);
  });

  readonly hasGeneratedItems = computed(() => {
    return this.items().some(item => item.status === 'done');
  });

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('batch-overlay')) {
      this.close.emit();
    }
  }

  loadSampleCsv(): void {
    this.rawText.set(SAMPLE_CSV);
    this.uploadedFileName.set('sample_qr_codes.csv');
    this.parseContent(SAMPLE_CSV);
  }

  onTextInput(event: Event): void {
    const val = (event.target as HTMLTextAreaElement).value;
    this.rawText.set(val);
    this.parseContent(val);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.processFile(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFile(input.files[0]);
    }
  }

  private processFile(file: File): void {
    this.uploadedFileName.set(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      this.rawText.set(text);
      this.parseContent(text);
    };
    reader.readAsText(file);
  }

  private parseContent(raw: string): void {
    this.parseError.set(null);
    const lines = raw
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) {
      this.items.set([]);
      return;
    }

    const parsed: BatchQrItem[] = [];
    const startIndex = (lines[0].toLowerCase().startsWith('item,') || lines[0].toLowerCase().startsWith('title,'))
      ? 1
      : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      let title = `Item ${i + 1}`;
      let content = line;

      // Handle simple CSV comma separation
      if (line.includes(',')) {
        const parts = line.split(',');
        title = parts[0].replace(/^["']|["']$/g, '').trim();
        content = parts.slice(1).join(',').replace(/^["']|["']$/g, '').trim();
      }

      parsed.push({
        id: `batch-${i}-${Date.now()}`,
        title,
        content,
        formattedPayload: content,
        status: 'pending'
      });
    }

    this.items.set(parsed);
  }

  async generateAll(): Promise<void> {
    const current = this.items();
    if (current.length === 0) return;

    this.isGenerating.set(true);
    this.progress.set({ current: 0, total: current.length });

    const updated = [...current];

    for (let i = 0; i < updated.length; i++) {
      updated[i] = { ...updated[i], status: 'generating' };
      this.items.set([...updated]);

      try {
        const dataUrl = await this.qrService.generate(updated[i].content, {
          type: 'text',
          size: 300
        });
        updated[i] = {
          ...updated[i],
          dataUrl,
          status: 'done'
        };
      } catch (err: unknown) {
        updated[i] = {
          ...updated[i],
          status: 'error',
          error: err instanceof Error ? err.message : 'Generation failed'
        };
      }

      this.progress.set({ current: i + 1, total: updated.length });
      this.items.set([...updated]);
    }

    this.isGenerating.set(false);
  }

  async downloadZip(): Promise<void> {
    const readyItems = this.items().filter(item => item.status === 'done');
    if (readyItems.length === 0) return;

    this.isZipping.set(true);
    try {
      const zipBlob = await this.qrService.generateBatchZip(
        readyItems.map(item => ({
          id: item.id,
          title: item.title,
          content: item.content
        })),
        { type: 'text', size: 500 }
      );

      const filename = `acklet-qr-batch-${Date.now()}.zip`;
      this.qrService.downloadBlob(zipBlob, filename);
    } catch (err: unknown) {
      console.error('Failed to create batch zip', err);
    } finally {
      this.isZipping.set(false);
    }
  }

  async generateAndDownloadZip(): Promise<void> {
    if (!this.hasGeneratedItems()) {
      await this.generateAll();
    }
    await this.downloadZip();
  }

  downloadSingle(item: BatchQrItem): void {
    if (item.dataUrl) {
      this.qrService.downloadPng(item.dataUrl, `${item.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`);
    }
  }

  copySingle(item: BatchQrItem): void {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(item.content);
    }
  }

  clearAll(): void {
    this.rawText.set('');
    this.uploadedFileName.set(null);
    this.items.set([]);
    this.progress.set({ current: 0, total: 0 });
  }
}

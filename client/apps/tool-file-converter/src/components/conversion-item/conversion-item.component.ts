// apps/tool-file-converter/src/components/conversion-item/conversion-item.component.ts
import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TsIconComponent } from '@acklet/tool-shell';
import { ConversionJob, FormatDescriptor } from '../../models/converter.models';

@Component({
  selector: 'app-conversion-item',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="studio-image-card"
      [class.is-completed]="job().status === 'completed'"
      [class.is-converting]="job().status === 'converting'"
      [class.is-error]="job().status === 'error'"
    >
      <!-- Top Thumbnail Frame -->
      <div
        class="card-thumb-frame"
        (click)="onPreviewClick()"
        [title]="canPreviewResult() ? 'Click to preview image' : ''"
        [class.is-clickable]="canPreviewResult()"
      >
        @if (job().previewUrl) {
          <img [src]="job().previewUrl" [alt]="job().file.name" class="card-preview-img" loading="lazy" />
        } @else {
          <div class="card-fallback-icon" [attr.data-category]="job().detectedFormat.category">
            <ts-icon [name]="getCategoryIcon(job().detectedFormat.category)" [size]="28" />
          </div>
        }

        <!-- Top-Left Format Pill -->
        <span class="format-pill-tag">
          {{ (job().detectedFormat.format || 'IMG') | uppercase }}
        </span>

        <!-- Top-Right Hover Delete Button -->
        <button
          type="button"
          class="card-remove-btn"
          (click)="$event.stopPropagation(); remove.emit(job().id)"
          [disabled]="job().status === 'converting'"
          title="Remove image from batch"
          aria-label="Remove image"
        >
          <ts-icon name="x" [size]="13" />
        </button>

        <!-- Converting Progress Overlay -->
        @if (job().status === 'converting') {
          <div class="converting-overlay">
            <span class="spinner-circle-sm"></span>
            <span class="converting-pct font-mono">{{ job().progress }}%</span>
            <span class="converting-stage">{{ job().progressStage || 'Converting' }}</span>
          </div>
        }

        <!-- Converted Success Badge on Thumbnail -->
        @if (job().status === 'completed') {
          <div class="completed-check-tag">
            <ts-icon name="check" [size]="11" />
            <span>Ready</span>
          </div>
        }
      </div>

      <!-- Bottom Card Body / Details -->
      <div class="card-body">
        <div class="filename-row">
          <span class="card-filename" [title]="job().file.name">{{ job().file.name }}</span>
        </div>

        <div class="card-meta-row font-mono">
          @if (job().status === 'completed') {
            <span class="result-size-text font-bold">{{ formatFileSize(job().resultSize || 0) }}</span>
            @if (sizeReductionPct(); as savings) {
              <span class="savings-badge" [class.is-reduced]="savings > 0" [class.is-increased]="savings < 0">
                {{ savings > 0 ? ('-' + savings + '%') : ('+' + Math.abs(savings) + '%') }}
              </span>
            }
          } @else {
            <span class="original-size-text">{{ formatFileSize(job().file.size) }}</span>
            @if (job().detectedFormat.signatureVerified) {
              <span class="verified-dot" title="Verified format signature"></span>
            }
          }
        </div>

        <!-- Completed Actions (Preview & Download) -->
        @if (job().status === 'completed') {
          <div class="card-footer-actions">
            @if (canPreviewResult()) {
              <button
                type="button"
                class="card-view-btn"
                (click)="previewRequested.emit(job())"
                title="Preview full image"
              >
                <ts-icon name="eye" [size]="12" />
                <span>View</span>
              </button>
            }
            <button
              type="button"
              class="card-download-btn"
              (click)="download.emit(job().id)"
              title="Download converted file"
            >
              <ts-icon name="download" [size]="12" />
              <span>Save</span>
            </button>
          </div>
        } @else if (job().status === 'error') {
          <div class="card-error-box">
            <span class="card-error-label" [title]="job().errorMessage || 'Conversion failed'">Failed</span>
            <button
              type="button"
              class="card-retry-btn"
              (click)="convert.emit(job().id)"
              title="Retry conversion"
            >
              <ts-icon name="refresh-cw" [size]="11" />
              <span>Retry</span>
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .studio-image-card {
      background: var(--ts-surface-raised, #18181B);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      border-radius: var(--ts-radius-card, 16px);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.14);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }

    :host-context([data-theme="light"]) .studio-image-card,
    [data-theme="light"] .studio-image-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
    }

    .studio-image-card:hover {
      border-color: var(--accent, #3B82F6);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
    }

    :host-context([data-theme="light"]) .studio-image-card:hover,
    [data-theme="light"] .studio-image-card:hover {
      border-color: #2563EB;
      box-shadow: 0 8px 24px rgba(79, 70, 229, 0.1);
    }

    .studio-image-card.is-completed {
      border-color: rgba(16, 185, 129, 0.35);
    }

    :host-context([data-theme="light"]) .studio-image-card.is-completed,
    [data-theme="light"] .studio-image-card.is-completed {
      border-color: #A7F3D0;
    }

    .studio-image-card.is-error {
      border-color: rgba(239, 68, 68, 0.35);
    }

    :host-context([data-theme="light"]) .studio-image-card.is-error,
    [data-theme="light"] .studio-image-card.is-error {
      border-color: #FECACA;
    }

    /* ─── Top Thumbnail Frame ─── */
    .card-thumb-frame {
      position: relative;
      height: 154px;
      width: 100%;
      background: var(--ts-surface-inset, rgba(255, 255, 255, 0.03));
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      user-select: none;
    }

    :host-context([data-theme="light"]) .card-thumb-frame,
    [data-theme="light"] .card-thumb-frame {
      background: #F8FAFC;
    }

    .card-thumb-frame.is-clickable {
      cursor: pointer;
    }

    .card-preview-img {
      max-width: 90%;
      max-height: 90%;
      object-fit: contain;
      border-radius: 6px;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .card-thumb-frame:hover .card-preview-img {
      transform: scale(1.03);
    }

    .card-fallback-icon {
      color: var(--text-muted, #94A3B8);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Format Tag on Top Left of Thumbnail */
    .format-pill-tag {
      position: absolute;
      top: 8px;
      left: 8px;
      padding: 2px 7px;
      border-radius: 6px;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(6px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #FFFFFF;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.04em;
      pointer-events: none;
    }

    /* Hover Remove Button on Top Right */
    .card-remove-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(6px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0.7;
      transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 2;
    }

    .studio-image-card:hover .card-remove-btn {
      opacity: 1;
    }

    .card-remove-btn:hover {
      background: #EF4444;
      border-color: #DC2626;
      transform: scale(1.12);
    }

    /* Converting Progress Overlay */
    .converting-overlay {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.82);
      backdrop-filter: blur(4px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      z-index: 3;
      color: #FFFFFF;
    }

    .converting-pct {
      font-size: 15px;
      font-weight: 700;
      color: var(--accent, #60A5FA);
    }

    .converting-stage {
      font-size: 11px;
      color: #CBD5E1;
      max-width: 80%;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Converted Success Tag */
    .completed-check-tag {
      position: absolute;
      bottom: 8px;
      left: 8px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 7px;
      border-radius: 6px;
      background: #10B981;
      color: #FFFFFF;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.02em;
      box-shadow: 0 2px 6px rgba(16, 185, 129, 0.4);
      pointer-events: none;
    }

    /* ─── Bottom Card Body ─── */
    .card-body {
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      background: transparent;
    }

    .filename-row {
      display: flex;
      align-items: center;
    }

    .card-filename {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text, #FFFFFF);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      width: 100%;
    }

    :host-context([data-theme="light"]) .card-filename,
    [data-theme="light"] .card-filename {
      color: #0F172A;
    }

    .card-meta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      font-size: 11.5px;
      color: var(--text-muted, #94A3B8);
    }

    :host-context([data-theme="light"]) .card-meta-row,
    [data-theme="light"] .card-meta-row {
      color: #64748B;
    }

    .result-size-text {
      color: var(--text, #FFFFFF);
    }

    :host-context([data-theme="light"]) .result-size-text,
    [data-theme="light"] .result-size-text {
      color: #0F172A;
    }

    .savings-badge {
      display: inline-flex;
      align-items: center;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 10.5px;
      font-weight: 700;
    }

    .savings-badge.is-reduced {
      background: rgba(16, 185, 129, 0.15);
      color: #34D399;
    }

    :host-context([data-theme="light"]) .savings-badge.is-reduced,
    [data-theme="light"] .savings-badge.is-reduced {
      background: #ECFDF5;
      color: #059669;
    }

    .savings-badge.is-increased {
      background: rgba(245, 158, 11, 0.15);
      color: #FBBF24;
    }

    .verified-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10B981;
      display: inline-block;
    }

    /* Completed Action Buttons */
    .card-footer-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 2px;
      padding-top: 6px;
      border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .card-footer-actions,
    [data-theme="light"] .card-footer-actions {
      border-top-color: #F1F5F9;
    }

    .card-view-btn,
    .card-download-btn {
      flex: 1;
      height: 28px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .card-view-btn {
      background: var(--ts-surface-inset, rgba(255, 255, 255, 0.06));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      color: var(--text-muted, #CBD5E1);
    }

    :host-context([data-theme="light"]) .card-view-btn,
    [data-theme="light"] .card-view-btn {
      background: #F1F5F9;
      border-color: #E2E8F0;
      color: #475569;
    }

    .card-view-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #FFFFFF;
    }

    :host-context([data-theme="light"]) .card-view-btn:hover,
    [data-theme="light"] .card-view-btn:hover {
      background: #E2E8F0;
      color: #0F172A;
    }

    .card-download-btn {
      background: var(--accent, #3B82F6);
      border: 1px solid var(--accent, #3B82F6);
      color: #FFFFFF;
    }

    :host-context([data-theme="light"]) .card-download-btn,
    [data-theme="light"] .card-download-btn {
      background: #2563EB;
      border-color: #2563EB;
      color: #FFFFFF;
    }

    .card-download-btn:hover {
      background: #2563EB;
      transform: translateY(-1px);
    }

    :host-context([data-theme="light"]) .card-download-btn:hover,
    [data-theme="light"] .card-download-btn:hover {
      background: #1D4ED8;
    }

    /* Error Box */
    .card-error-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      margin-top: 2px;
      padding-top: 6px;
      border-top: 1px solid rgba(239, 68, 68, 0.2);
    }

    .card-error-label {
      font-size: 11px;
      font-weight: 700;
      color: #EF4444;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .card-retry-btn {
      height: 24px;
      padding: 0 8px;
      border-radius: 5px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #F87171;
      font-size: 11px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .card-retry-btn,
    [data-theme="light"] .card-retry-btn {
      background: #FEE2E2;
      border-color: #FECACA;
      color: #DC2626;
    }

    /* Spinner */
    .spinner-circle-sm {
      width: 18px;
      height: 18px;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      display: inline-block;
      animation: spin 0.75s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class ConversionItemComponent {
  readonly job = input.required<ConversionJob>();

  readonly convert = output<string>();
  readonly cancel = output<string>();
  readonly remove = output<string>();
  readonly download = output<string>();
  readonly formatChanged = output<{ jobId: string; format: FormatDescriptor }>();
  readonly previewRequested = output<ConversionJob>();

  readonly Math = Math;

  readonly sizeReductionPct = computed(() => {
    const j = this.job();
    if (j.status !== 'completed' || !j.resultSize || !j.file.size) return null;
    const diff = j.file.size - j.resultSize;
    return Math.round((diff / j.file.size) * 100);
  });

  onFormatSelect(formatStr: string): void {
    const found = this.job().availableOutputs.find(o => o.format === formatStr);
    if (found) {
      this.formatChanged.emit({ jobId: this.job().id, format: found });
    }
  }

  onPreviewClick(): void {
    if (this.canPreviewResult()) {
      this.previewRequested.emit(this.job());
    }
  }

  canPreviewResult(): boolean {
    const j = this.job();
    const cat = j.detectedFormat.category;
    return cat === 'image' || cat === 'graphics' || cat === 'modern-image';
  }

  getCategoryIcon(cat: string): string {
    switch (cat) {
      case 'image':
      case 'modern-image':
        return 'image';
      case 'graphics':
        return 'frame';
      case 'subtitle':
        return 'file-text';
      case 'contact':
        return 'user';
      case 'document':
        return 'file';
      case 'audio':
        return 'volume-2';
      case 'video':
        return 'play';
      default:
        return 'image';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}

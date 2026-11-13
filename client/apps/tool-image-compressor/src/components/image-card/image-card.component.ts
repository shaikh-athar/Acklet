// apps/tool-image-compressor/src/components/image-card/image-card.component.ts
import { Component, ChangeDetectionStrategy, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';
import { ImageItem } from '../../models/compressor.models';

@Component({
  selector: 'app-image-card',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="studio-image-card"
      [class.is-completed]="item().status === 'completed'"
      [class.is-processing]="isProcessing()"
      [class.has-error]="hasError()"
      role="region"
      [attr.aria-label]="item().originalName"
    >
      <!-- Top Thumbnail Frame -->
      <div
        class="card-thumb-frame"
        (click)="previewRequested.emit(item().id)"
        role="button"
        tabindex="0"
        (keydown.enter)="previewRequested.emit(item().id)"
        (keydown.space)="previewRequested.emit(item().id); $event.preventDefault()"
        [title]="'Preview and compare ' + item().originalName"
        aria-label="Preview image"
      >
        @if (item().status === 'corrupted' || !item().capabilities.previewSupported) {
          <div class="thumb-fallback">
            <ts-icon [name]="item().status === 'corrupted' ? 'alert-triangle' : 'image'" [size]="28" />
          </div>
        } @else {
          <img
            [src]="item().result?.outputUrl || item().transformedPreviewUrl || item().previewUrl"
            [alt]="item().originalName"
            class="card-preview-img"
            loading="lazy"
          />
        }

        <!-- Top-Left Format & Savings Badge -->
        <div class="format-badge-wrap" (click)="$event.stopPropagation()">
          <span class="fmt-badge font-mono">{{ (item().result?.outputFormat || item().originalExtension) | uppercase }}</span>
          @if (item().status === 'completed' && item().result) {
            @if (item().result!.savedPercentage > 0) {
              <span class="savings-tag font-mono">-{{ item().result!.savedPercentage }}%</span>
            } @else if (item().result!.isLargerThanOriginal) {
              <span class="savings-tag larger-tag font-mono">+{{ Math.abs(item().result!.savedPercentage) }}%</span>
            }
          }
        </div>

        <!-- Top-Right Close/Remove Button -->
        <button
          type="button"
          class="card-remove-btn"
          (click)="$event.stopPropagation(); removeRequested.emit(item().id)"
          [disabled]="isProcessing()"
          title="Remove image from queue"
          aria-label="Remove image"
        >
          <ts-icon name="x" [size]="13" />
        </button>

        <!-- Processing Overlay with Progress -->
        @if (isProcessing()) {
          <div class="processing-overlay">
            <span class="spinner-circle-sm"></span>
            <span class="progress-pct font-mono">{{ item().progress || 10 }}%</span>
          </div>
        }
      </div>

      <!-- Bottom Card Body / Details -->
      <div class="card-body">
        <div class="filename-row">
          <span class="card-filename" [title]="item().originalName" (click)="settingsRequested.emit(item().id)">
            <span class="name-base">{{ item().nameWithoutExt }}</span><span class="name-ext font-mono">.{{ item().originalExtension }}</span>
          </span>
          <button
            type="button"
            class="settings-icon-btn"
            (click)="$event.stopPropagation(); settingsRequested.emit(item().id)"
            title="Configure settings for this image"
            aria-label="Configure image settings"
          >
            <ts-icon name="sliders" [size]="12" />
          </button>
        </div>

        <!-- Meta Info & Action Row -->
        <div class="card-meta-row">
          @if (hasError()) {
            <span class="error-text font-mono" [title]="friendlyErrorMessage()">Failed</span>
            <button
              type="button"
              class="card-action-btn retry-btn"
              (click)="$event.stopPropagation(); retryRequested.emit(item().id)"
              title="Retry compression"
            >
              <ts-icon name="rotate-ccw" [size]="11" />
              <span>Retry</span>
            </button>
          } @else if (item().status === 'completed' && item().result) {
            <div class="size-change-group font-mono">
              <span class="size-orig">{{ formattedOriginalSize() }}</span>
              <span class="size-arrow">&rarr;</span>
              <span class="size-new" [class.size-larger]="item().result!.isLargerThanOriginal">{{ formattedCompressedSize() }}</span>
            </div>
            <button
              type="button"
              class="card-action-btn save-btn"
              (click)="$event.stopPropagation(); downloadRequested.emit(item().id)"
              title="Download image"
            >
              <ts-icon name="download" [size]="11" />
              <span>Save</span>
            </button>
          } @else {
            <div class="size-change-group font-mono">
              <span class="size-orig">{{ formattedOriginalSize() }}</span>
              <span class="ready-dot" title="Ready to compress"></span>
            </div>
            <button
              type="button"
              class="card-action-btn compress-btn"
              (click)="$event.stopPropagation(); compressRequested.emit(item().id)"
              [disabled]="isProcessing()"
              title="Compress image"
            >
              <ts-icon name="minimize-2" [size]="11" />
              <span>Compress</span>
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
      background: var(--ts-surface-card, #FFFFFF);
      border: 1px solid var(--border-subtle, #E2E8F0);
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

    :host-context([data-theme="light"]) .studio-image-card,
    [data-theme="light"] .studio-image-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
    }

    :host-context([data-theme="dark"]) .studio-image-card,
    [data-theme="dark"] .studio-image-card {
      background: #18181B;
      border-color: rgba(255, 255, 255, 0.1);
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    }

    .studio-image-card:hover {
      border-color: var(--accent, #2563EB);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(37, 99, 235, 0.12);
    }

    :host-context([data-theme="dark"]) .studio-image-card:hover,
    [data-theme="dark"] .studio-image-card:hover {
      border-color: var(--accent, #3B82F6);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    }

    .studio-image-card.is-completed {
      border-color: #A7F3D0;
    }

    :host-context([data-theme="dark"]) .studio-image-card.is-completed,
    [data-theme="dark"] .studio-image-card.is-completed {
      border-color: rgba(16, 185, 129, 0.35);
    }

    .studio-image-card.has-error {
      border-color: #FECACA;
    }

    :host-context([data-theme="dark"]) .studio-image-card.has-error,
    [data-theme="dark"] .studio-image-card.has-error {
      border-color: rgba(239, 68, 68, 0.35);
    }

    /* ── Top Thumbnail Frame ── */
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

    .thumb-fallback {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94A3B8;
    }

    /* Format & Savings Badge Top-Left */
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

    .savings-tag {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      background: #10B981;
      color: #FFFFFF;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    .savings-tag.larger-tag {
      background: #F59E0B;
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
      border-top-color: #3B82F6;
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
      gap: 8px;
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
      color: #2563EB;
    }

    :host-context([data-theme="dark"]) .card-filename:hover,
    [data-theme="dark"] .card-filename:hover {
      color: #60A5FA;
    }

    .name-ext {
      opacity: 0.65;
      font-weight: 400;
      font-size: 11px;
    }

    .settings-icon-btn {
      width: 22px;
      height: 22px;
      border-radius: 4px;
      border: none;
      background: transparent;
      color: #94A3B8;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s;
      flex-shrink: 0;
    }

    .settings-icon-btn:hover {
      background: rgba(37, 99, 235, 0.1);
      color: #2563EB;
    }

    :host-context([data-theme="dark"]) .settings-icon-btn:hover,
    [data-theme="dark"] .settings-icon-btn:hover {
      color: #60A5FA;
    }

    /* ── Meta Info & Action Row ── */
    .card-meta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }

    .size-change-group {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #64748B;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    :host-context([data-theme="dark"]) .size-change-group,
    [data-theme="dark"] .size-change-group {
      color: #94A3B8;
    }

    .size-arrow {
      font-size: 10px;
      opacity: 0.7;
    }

    .size-new {
      font-weight: 700;
      color: #059669;
    }

    :host-context([data-theme="dark"]) .size-new,
    [data-theme="dark"] .size-new {
      color: #10B981;
    }

    .size-new.size-larger {
      color: #D97706;
    }

    .ready-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10B981;
      display: inline-block;
      margin-left: 2px;
    }

    .error-text {
      font-size: 11px;
      font-weight: 600;
      color: #EF4444;
    }

    .card-action-btn {
      height: 24px;
      padding: 0 8px;
      border-radius: 5px;
      font-size: 11px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      border: none;
      cursor: pointer;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }

    .save-btn {
      background: var(--accent, #2563EB);
      color: #FFFFFF;
    }

    .save-btn:hover {
      background: var(--accent-hover, #1D4ED8);
    }

    .compress-btn {
      background: rgba(37, 99, 235, 0.1);
      color: #2563EB;
      border: 1px solid rgba(37, 99, 235, 0.2);
    }

    :host-context([data-theme="dark"]) .compress-btn,
    [data-theme="dark"] .compress-btn {
      background: rgba(59, 130, 246, 0.15);
      color: #60A5FA;
      border-color: rgba(59, 130, 246, 0.3);
    }

    .compress-btn:hover:not(:disabled) {
      background: #2563EB;
      color: #FFFFFF;
    }

    :host-context([data-theme="dark"]) .compress-btn:hover:not(:disabled),
    [data-theme="dark"] .compress-btn:hover:not(:disabled) {
      background: #3B82F6;
      color: #FFFFFF;
    }

    .retry-btn {
      background: rgba(239, 68, 68, 0.1);
      color: #EF4444;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .retry-btn:hover {
      background: #EF4444;
      color: #FFFFFF;
    }
  `]
})
export class ImageCardComponent {
  readonly item = input.required<ImageItem>();

  readonly selectToggled = output<string>();
  readonly previewRequested = output<string>();
  readonly settingsRequested = output<string>();
  readonly removeRequested = output<string>();
  readonly compressRequested = output<string>();
  readonly cancelRequested = output<string>();
  readonly downloadRequested = output<string>();
  readonly keepOriginalRequested = output<string>();
  readonly applyRecommendationRequested = output<string>();
  readonly inspectMetadataRequested = output<string>();
  readonly downloadVariantRequested = output<{ imageId: string; variantId: string }>();
  readonly retryRequested = output<string>();

  readonly Math = Math;

  readonly isProcessing = computed(() => {
    const s = this.item().status;
    return ['pending', 'decoding', 'processing', 'optimizing', 'encoding'].includes(s);
  });

  readonly hasError = computed(() => {
    const s = this.item().status;
    return s === 'corrupted' || s === 'invalid' || s === 'failed' || s === 'unsupported';
  });

  readonly friendlyErrorMessage = computed(() => {
    const err = this.item().error;
    if (err) {
      if (err.includes('50 MB')) return 'This file is too large (max 50 MB). Try a smaller file.';
      if (err.includes('100 MP')) return 'Image dimensions are too large. Try a smaller image.';
      if (err.includes('corrupted') || err.includes('decode')) return 'Could not read this image. The file may be damaged.';
      if (err.includes('unsupported') || err.includes('format')) return 'This format is not supported. Try PNG, JPG, or WebP.';
      return err;
    }
    return 'Could not process this file. Try another image.';
  });

  readonly formattedOriginalSize = computed(() => {
    return this.formatBytes(this.item().originalSize);
  });

  readonly formattedCompressedSize = computed(() => {
    const result = this.item().result;
    return result ? this.formatBytes(result.compressedSize) : '—';
  });

  readonly formattedDimensions = computed(() => {
    const w = this.item().width;
    const h = this.item().height;
    if (w > 0 && h > 0) return `${w} × ${h} px`;
    return 'Vector / Dynamic';
  });

  readonly formattedOutputDimensions = computed(() => {
    const result = this.item().result;
    if (result && result.outputWidth > 0 && result.outputHeight > 0) {
      return `${result.outputWidth} × ${result.outputHeight} px`;
    }
    return this.formattedDimensions();
  });

  readonly qualityScore = computed<number>(() => {
    const ssim = this.item().result?.visualQuality?.ssim;
    if (typeof ssim === 'number') {
      return Math.min(100, Math.max(0, Math.round(ssim * 100)));
    }
    return 100;
  });

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
  }
}

// apps/tool-image-compressor/src/components/processing-summary/processing-summary.component.ts
import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';
import { SmartPreset } from '../../models/compressor.models';

@Component({
  selector: 'app-processing-summary',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="summary-card" [class.is-completed]="hasCompletedImages()">
      <!-- Stats Area -->
      <div class="summary-info">
        @if (hasCompletedImages()) {
          <div class="stats-headline">
            <span class="total-saved-pill font-mono">
              @if (totalSavedPercentage() > 0) {
                {{ totalSavedPercentage() }}% smaller
              } @else {
                Done
              }
            </span>
            <span class="size-comparison font-mono">
              {{ formattedOriginalSize() }} → {{ formattedCompressedSize() }}
              @if (totalSavedBytes() > 0) {
                (saved {{ formattedSavedBytes() }})
              }
            </span>
          </div>
        } @else {
          <div class="stats-headline">
            <span class="image-count-tag font-mono">
              {{ totalCount() }} {{ totalCount() === 1 ? 'image' : 'images' }}
            </span>
            <span class="size-comparison font-mono">
              Total size: {{ formattedOriginalSize() }}
            </span>
          </div>
        }
      </div>

      <!-- Action Area: Exactly ONE filled primary button -->
      <div class="summary-actions">
        @if (isCompressing()) {
          <button
            type="button"
            class="secondary-action-btn cancel-btn"
            (click)="cancelAllRequested.emit()"
          >
            <ts-icon name="x" [size]="16" />
            <span>Cancel</span>
          </button>
        } @else if (hasCompletedImages()) {
          <!-- Single filled primary action -->
          <button
            type="button"
            class="primary-action-btn download-all-btn"
            (click)="downloadAllRequested.emit()"
            [disabled]="isPackagingZip()"
          >
            <ts-icon [name]="isPackagingZip() ? 'refresh-cw' : 'download'" [size]="16" [class.spin-icon]="isPackagingZip()" />
            <span>{{ isPackagingZip() ? 'Packaging...' : (totalCount() > 1 ? 'Download all (ZIP)' : 'Download image') }}</span>
          </button>

          <!-- Secondary recompress outline action -->
          <button
            type="button"
            class="secondary-action-btn recompress-btn"
            (click)="compressAllRequested.emit()"
            title="Recompress with current settings"
          >
            <ts-icon name="rotate-ccw" [size]="14" />
            <span>Recompress</span>
          </button>
        } @else {
          <!-- Single filled primary action -->
          <button
            type="button"
            class="primary-action-btn compress-all-btn"
            (click)="compressAllRequested.emit()"
            [disabled]="totalCount() === 0"
          >
            <ts-icon name="minimize-2" [size]="16" />
            <span>Compress all</span>
          </button>
        }
      </div>

      <!-- Privacy Helper Line -->
      <p class="privacy-helper-line">Your images stay on your device.</p>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .summary-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      background: var(--ts-surface-card, #FFFFFF);
      border: 1px solid var(--border-subtle, rgba(15, 23, 42, 0.08));
      border-radius: 12px;
      box-shadow: var(--shadow-sm, 0 1px 3px rgba(15, 23, 42, 0.05));
    }

    :host-context([data-theme="light"]) .summary-card,
    [data-theme="light"] .summary-card {
      background: #FFFFFF;
      border-color: rgba(15, 23, 42, 0.08);
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05), 0 1px 2px rgba(15, 23, 42, 0.03);
    }

    :host-context([data-theme="dark"]) .summary-card,
    [data-theme="dark"] .summary-card {
      background: #1C2029;
      border-color: #303744;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    }

    .summary-card.is-completed {
      border-color: rgba(16, 185, 129, 0.35);
    }

    .summary-info {
      text-align: center;
    }

    .stats-headline {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .total-saved-pill {
      font-size: 13px;
      font-weight: 600;
      color: var(--success, #10B981);
      background: rgba(16, 185, 129, 0.12);
      padding: 3px 10px;
      border-radius: 9999px;
    }

    .image-count-tag {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary, #09090B);
      background: var(--bg-subtle, #F1F5F9);
      padding: 3px 10px;
      border-radius: 9999px;
    }

    :host-context([data-theme="light"]) .image-count-tag,
    [data-theme="light"] .image-count-tag {
      background: #F1F5F9;
      color: #09090B;
    }

    :host-context([data-theme="dark"]) .image-count-tag,
    [data-theme="dark"] .image-count-tag {
      background: rgba(255, 255, 255, 0.06);
      color: #F3F4F6;
    }

    .size-comparison {
      font-size: 13px;
      color: var(--text-secondary, #52525B);
    }

    :host-context([data-theme="light"]) .size-comparison,
    [data-theme="light"] .size-comparison {
      color: #52525B;
    }

    :host-context([data-theme="dark"]) .size-comparison,
    [data-theme="dark"] .size-comparison {
      color: #A1A8B5;
    }

    .summary-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      justify-content: center;
    }

    .primary-action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: var(--accent, #2563EB);
      color: #FFFFFF;
      font-size: 14px;
      font-weight: 600;
      border: none;
      border-radius: 10px;
      padding: 10px 24px;
      cursor: pointer;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
      transition: background-color 0.15s ease, transform 0.15s ease;
    }

    .primary-action-btn:hover:not(:disabled) {
      background: var(--accent-hover, #1D4ED8);
      transform: translateY(-1px);
    }

    .primary-action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .primary-action-btn:focus-visible {
      outline: 2px solid var(--accent, #3B82F6);
      outline-offset: 2px;
    }

    .secondary-action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: transparent;
      border: 1px solid var(--border-subtle, rgba(15, 23, 42, 0.15));
      color: var(--text-secondary, #52525B);
      font-size: 13px;
      font-weight: 500;
      border-radius: 10px;
      padding: 9px 16px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="light"]) .secondary-action-btn,
    [data-theme="light"] .secondary-action-btn {
      border-color: rgba(15, 23, 42, 0.15);
      color: #52525B;
    }

    :host-context([data-theme="light"]) .secondary-action-btn:hover,
    [data-theme="light"] .secondary-action-btn:hover {
      border-color: rgba(15, 23, 42, 0.28);
      color: #09090B;
      background: rgba(15, 23, 42, 0.04);
    }

    :host-context([data-theme="dark"]) .secondary-action-btn,
    [data-theme="dark"] .secondary-action-btn {
      border-color: #303744;
      color: #A1A8B5;
    }

    :host-context([data-theme="dark"]) .secondary-action-btn:hover,
    [data-theme="dark"] .secondary-action-btn:hover {
      border-color: #3F4756;
      color: #FFFFFF;
      background: rgba(255, 255, 255, 0.06);
    }

    .secondary-action-btn:focus-visible {
      outline: 2px solid var(--accent, #3B82F6);
      outline-offset: 2px;
    }

    .privacy-helper-line {
      font-size: 12px;
      color: var(--text-muted, #6B7280);
      margin: 0;
    }

    :host-context([data-theme="light"]) .privacy-helper-line,
    [data-theme="light"] .privacy-helper-line {
      color: #6B7280;
    }

    :host-context([data-theme="dark"]) .privacy-helper-line,
    [data-theme="dark"] .privacy-helper-line {
      color: #7D8796;
    }

    .spin-icon {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .summary-card {
        padding: 14px 16px;
        position: sticky;
        bottom: 0;
        z-index: 100;
        background: var(--ts-surface-card, #FFFFFF);
        border-top: 1px solid var(--border-subtle, rgba(15, 23, 42, 0.12));
        border-radius: 16px 16px 0 0;
        box-shadow: 0 -4px 16px rgba(15, 23, 42, 0.08);
      }

      :host-context([data-theme="light"]) .summary-card,
      [data-theme="light"] .summary-card {
        background: #FFFFFF;
        border-top-color: rgba(15, 23, 42, 0.1);
        box-shadow: 0 -4px 16px rgba(15, 23, 42, 0.08);
      }

      :host-context([data-theme="dark"]) .summary-card,
      [data-theme="dark"] .summary-card {
        background: #1C2029;
        border-top-color: #303744;
        box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.4);
      }

      .summary-actions {
        flex-direction: column;
        width: 100%;
      }

      .primary-action-btn {
        width: 100%;
      }

      .secondary-action-btn {
        width: 100%;
      }
    }
  `]
})
export class ProcessingSummaryComponent {
  readonly totalOriginalSize = input.required<number>();
  readonly totalCompressedSize = input.required<number>();
  readonly totalSavedBytes = input.required<number>();
  readonly totalSavedPercentage = input.required<number>();
  readonly completedCount = input.required<number>();
  readonly totalCount = input.required<number>();
  readonly isCompressing = input.required<boolean>();
  readonly hasCompletedImages = input.required<boolean>();
  readonly preset = input<SmartPreset>();
  readonly targetsMetCount = input<number>(0);
  readonly targetsUnreachableCount = input<number>(0);
  readonly averageSsim = input<number | null>(null);
  readonly totalVariantsCount = input<number>(0);
  readonly hasFailedTasks = input<boolean>(false);
  readonly isPackagingZip = input<boolean>(false);

  readonly compressAllRequested = output<void>();
  readonly cancelAllRequested = output<void>();
  readonly downloadAllRequested = output<void>();
  readonly openReportRequested = output<void>();

  readonly Math = Math;

  readonly formattedOriginalSize = computed(() => this.formatBytes(this.totalOriginalSize()));
  readonly formattedCompressedSize = computed(() => this.formatBytes(this.totalCompressedSize()));
  readonly formattedSavedBytes = computed(() => this.formatBytes(this.totalSavedBytes()));

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
  }
}

// apps/tool-image-compressor/src/components/quality-controller/quality-controller.component.ts
import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';

@Component({
  selector: 'app-quality-controller',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="quality-controller-card animate-fade-slide-up"
      [class.is-disabled]="isCompressing()"
      role="region"
      aria-label="Quality and compression controller"
    >
      <!-- Top Row: Title, Scope Indicator, and Prominent Percentage Badge -->
      <div class="controller-header-row">
        <div class="controller-title-group">
          <ts-icon name="sliders" [size]="14" class="controller-icon" />
          <span class="controller-title">Quality & Compression</span>

          <span class="scope-pill global-scope" title="Applying to all images">
            <span>All Images</span>
          </span>
        </div>

        <!-- Prominent Percentage Badge -->
        <div class="quality-display-badge font-mono" [attr.aria-label]="'Selected quality: ' + currentQuality() + ' percent'">
          <span class="quality-number">{{ currentQuality() }}</span>
          <span class="quality-percent">%</span>
        </div>
      </div>

      <!-- Center Row: Interactive Slider with Dynamic Progress Track -->
      <div class="slider-track-wrap">
        <input
          #sliderInput
          type="range"
          min="1"
          max="100"
          step="1"
          class="quality-range-slider"
          [value]="currentQuality()"
          [disabled]="isCompressing()"
          (input)="onSliderInput($event)"
          [style.--slider-progress.%]="currentQuality()"
          aria-label="Global image compression quality percentage"
          [attr.aria-valuenow]="currentQuality()"
          aria-valuemin="1"
          aria-valuemax="100"
        />
      </div>

      <!-- Bottom Row: Dynamic Context Guide -->
      <div class="controller-footer-row font-mono" aria-hidden="true">
        <span class="hint-label start-hint">Smaller file</span>
        <span class="quality-tier-tag">{{ qualityTierLabel() }}</span>
        <span class="hint-label end-hint">Sharper image</span>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      max-width: 520px;
    }

    .quality-controller-card {
      width: 100%;
      padding: 13px 18px 11px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--border-subtle, rgba(226, 232, 240, 0.95));
      box-shadow:
        0 14px 34px -4px rgba(15, 23, 42, 0.12),
        0 4px 12px -2px rgba(15, 23, 42, 0.05),
        0 0 0 1px rgba(255, 255, 255, 0.8) inset;
      display: flex;
      flex-direction: column;
      gap: 10px;
      user-select: none;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      box-sizing: border-box;
    }

    :host-context([data-theme="dark"]) .quality-controller-card,
    [data-theme="dark"] .quality-controller-card {
      background: rgba(15, 23, 42, 0.92);
      border-color: rgba(51, 65, 85, 0.85);
      box-shadow:
        0 16px 36px -4px rgba(0, 0, 0, 0.5),
        0 4px 16px -2px rgba(0, 0, 0, 0.4),
        0 0 0 1px rgba(255, 255, 255, 0.06) inset;
    }

    .quality-controller-card:hover {
      border-color: var(--accent-primary, #3b82f6);
      box-shadow:
        0 16px 38px -4px rgba(15, 23, 42, 0.15),
        0 6px 16px -2px rgba(59, 130, 246, 0.12),
        0 0 0 1px rgba(59, 130, 246, 0.3) inset;
    }

    :host-context([data-theme="dark"]) .quality-controller-card:hover,
    [data-theme="dark"] .quality-controller-card:hover {
      border-color: rgba(96, 165, 250, 0.8);
      box-shadow:
        0 18px 40px -4px rgba(0, 0, 0, 0.6),
        0 6px 20px -2px rgba(59, 130, 246, 0.2),
        0 0 0 1px rgba(96, 165, 250, 0.3) inset;
    }

    .quality-controller-card.is-disabled {
      opacity: 0.6;
      pointer-events: none;
    }

    /* Header Row */
    .controller-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .controller-title-group {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex-wrap: wrap;
    }

    .controller-icon {
      color: var(--accent-primary, #3b82f6);
      flex-shrink: 0;
    }

    .controller-title {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text-primary, #0f172a);
      letter-spacing: -0.01em;
      white-space: nowrap;
    }

    :host-context([data-theme="dark"]) .controller-title,
    [data-theme="dark"] .controller-title {
      color: #f8fafc;
    }

    /* Scope Pill */
    .scope-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 0.68rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      background: var(--bg-hover, rgba(241, 245, 249, 0.9));
      color: var(--text-muted, #64748b);
      border: 1px solid var(--border-subtle, rgba(226, 232, 240, 0.8));
    }

    :host-context([data-theme="dark"]) .scope-pill,
    [data-theme="dark"] .scope-pill {
      background: rgba(30, 41, 59, 0.8);
      color: #94a3b8;
      border-color: rgba(51, 65, 85, 0.7);
    }

    /* Percentage Badge */
    .quality-display-badge {
      display: inline-flex;
      align-items: baseline;
      padding: 3px 10px 2px;
      border-radius: 8px;
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.25);
      color: var(--accent-primary, #2563eb);
      line-height: 1;
      flex-shrink: 0;
    }

    :host-context([data-theme="dark"]) .quality-display-badge,
    [data-theme="dark"] .quality-display-badge {
      background: rgba(59, 130, 246, 0.15);
      border-color: rgba(96, 165, 250, 0.35);
      color: #60a5fa;
    }

    .quality-number {
      font-size: 0.95rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .quality-percent {
      font-size: 0.65rem;
      font-weight: 700;
      margin-left: 1px;
      opacity: 0.85;
    }

    /* Slider Track & Range Input */
    .slider-track-wrap {
      width: 100%;
      display: flex;
      align-items: center;
      padding: 2px 0;
    }

    .quality-range-slider {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 6px;
      border-radius: 9999px;
      outline: none;
      background: linear-gradient(
        to right,
        var(--accent-primary, #3b82f6) 0%,
        var(--accent-primary, #3b82f6) var(--slider-progress, 80%),
        var(--border-subtle, rgba(226, 232, 240, 0.9)) var(--slider-progress, 80%),
        var(--border-subtle, rgba(226, 232, 240, 0.9)) 100%
      );
      cursor: pointer;
      transition: background 0.05s ease;
    }

    :host-context([data-theme="dark"]) .quality-range-slider,
    [data-theme="dark"] .quality-range-slider {
      background: linear-gradient(
        to right,
        #3b82f6 0%,
        #60a5fa var(--slider-progress, 80%),
        rgba(51, 65, 85, 0.9) var(--slider-progress, 80%),
        rgba(51, 65, 85, 0.9) 100%
      );
    }

    /* Slider Thumb */
    .quality-range-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #FFFFFF;
      border: 2.5px solid var(--accent-primary, #3b82f6);
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.2);
      cursor: grab;
      transition: transform 0.12s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.12s ease;
    }

    .quality-range-slider::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #FFFFFF;
      border: 2.5px solid var(--accent-primary, #3b82f6);
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.2);
      cursor: grab;
      transition: transform 0.12s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.12s ease;
      box-sizing: border-box;
    }

    .quality-range-slider::-webkit-slider-thumb:hover {
      transform: scale(1.18);
      box-shadow: 0 3px 10px rgba(59, 130, 246, 0.4);
    }

    .quality-range-slider::-webkit-slider-thumb:active {
      cursor: grabbing;
      transform: scale(1.08);
      box-shadow: 0 1px 4px rgba(59, 130, 246, 0.5);
    }

    .quality-range-slider:focus-visible {
      outline: 2px solid var(--accent-primary, #3b82f6);
      outline-offset: 3px;
    }

    /* Footer Row */
    .controller-footer-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.67rem;
      color: var(--text-muted, #64748b);
      padding: 0 2px;
      letter-spacing: -0.01em;
    }

    :host-context([data-theme="dark"]) .controller-footer-row,
    [data-theme="dark"] .controller-footer-row {
      color: #94a3b8;
    }

    .quality-tier-tag {
      font-weight: 600;
      color: var(--text-primary, #1e293b);
      text-transform: capitalize;
    }

    :host-context([data-theme="dark"]) .quality-tier-tag,
    [data-theme="dark"] .quality-tier-tag {
      color: #e2e8f0;
    }

    @media (max-width: 640px) {
      .quality-controller-card {
        padding: 11px 14px 9px;
        border-radius: 14px;
        gap: 8px;
      }
      .controller-title {
        font-size: 0.78rem;
      }
      .scope-pill {
        font-size: 0.62rem;
        padding: 1px 6px;
      }
    }
  `]
})
export class QualityControllerComponent {
  readonly quality = input<number>(80);
  readonly isCompressing = input<boolean>(false);

  readonly qualityChange = output<number>();

  readonly currentQuality = computed(() => {
    const q = this.quality();
    return typeof q === 'number' && !isNaN(q) ? Math.min(100, Math.max(1, q)) : 80;
  });

  readonly qualityTierLabel = computed(() => {
    const q = this.currentQuality();
    if (q >= 92) return 'Maximum Quality (Lossless / Crisp)';
    if (q >= 82) return 'Balanced (Recommended)';
    if (q >= 68) return 'Compact (Web Optimized)';
    if (q >= 45) return 'Aggressive Shrink';
    return 'Ultra Small (High Compression)';
  });

  onSliderInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (!target) return;
    const val = parseInt(target.value, 10);
    if (!isNaN(val)) {
      this.qualityChange.emit(val);
    }
  }
}


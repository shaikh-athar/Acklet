// client/apps/tool-qr-generator/src/components/color-customizer/color-customizer.component.ts
import {
  Component,
  input,
  output,
  computed,
  inject,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ColorValidatorService } from '../../services/color-validator.service';
import { TsIconComponent, HlmBadge } from '@acklet/tool-shell';

interface ColorPresetPair {
  name: string;
  fg: string;
  bg: string;
}

@Component({
  selector: 'app-color-customizer',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent, HlmBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="color-customizer-root">
      <div class="customizer-header">
        <label class="customizer-label">
          <ts-icon name="palette" class="section-icon" />
          <span>Colors & Contrast</span>
        </label>
        <button
          type="button"
          class="swap-btn"
          title="Swap foreground and background colors"
          (click)="swapColors()"
        >
          <ts-icon name="arrow-left-right" class="swap-icon" />
          <span>Swap</span>
        </button>
      </div>

      <!-- Pickers Grid -->
      <div class="pickers-grid">
        <!-- Foreground Color (Dark Modules) -->
        <div class="picker-group">
          <span class="picker-label">Foreground (Modules)</span>
          <div class="picker-input-row">
            <input
              type="color"
              class="native-color-picker"
              [value]="foregroundColor()"
              (change)="onFgPickerChange($event)"
              aria-label="Foreground color picker"
            />
            <input
              type="text"
              class="hex-text-input"
              [ngModel]="foregroundColor()"
              (ngModelChange)="onFgTextChange($event)"
              placeholder="#000000"
              maxlength="7"
              aria-label="Foreground hex code"
            />
          </div>
        </div>

        <!-- Background Color (Light Modules) -->
        <div class="picker-group">
          <span class="picker-label">Background</span>
          <div class="picker-input-row">
            <input
              type="color"
              class="native-color-picker"
              [value]="backgroundColor()"
              (change)="onBgPickerChange($event)"
              aria-label="Background color picker"
            />
            <input
              type="text"
              class="hex-text-input"
              [ngModel]="backgroundColor()"
              (ngModelChange)="onBgTextChange($event)"
              placeholder="#FFFFFF"
              maxlength="7"
              aria-label="Background hex code"
            />
          </div>
        </div>
      </div>

      <!-- Color Presets -->
      <div class="color-presets-row">
        <span class="presets-caption">Presets:</span>
        @for (preset of presets; track preset.name) {
          <button
            type="button"
            class="preset-pair-btn"
            [class.active]="foregroundColor() === preset.fg && backgroundColor() === preset.bg"
            (click)="applyPreset(preset)"
          >
            <span class="preset-swatch">
              <span class="swatch-half" [style.backgroundColor]="preset.fg"></span>
              <span class="swatch-half" [style.backgroundColor]="preset.bg"></span>
            </span>
            <span class="preset-title">{{ preset.name }}</span>
          </button>
        }
      </div>

      <!-- Contrast Feedback Card -->
      <div
        class="contrast-feedback-box"
        [class.contrast-warning]="contrast().hasLowContrast"
        [class.contrast-good]="!contrast().hasLowContrast"
      >
        <div class="contrast-info-row">
          <div class="ratio-badge-group">
            <span class="ratio-value">{{ contrast().ratio }}:1</span>
            <span hlmBadge variant="outline" class="wcag-badge" [class.badge-pass]="!contrast().hasLowContrast">
              WCAG {{ contrast().level }}
            </span>
          </div>

          <!-- Color sample preview chip -->
          <div
            class="sample-preview-chip"
            [style.backgroundColor]="backgroundColor()"
            [style.color]="foregroundColor()"
            [style.borderColor]="foregroundColor()"
          >
            Sample Text
          </div>
        </div>

        @if (contrast().hasLowContrast) {
          <div class="warning-alert-row" role="alert">
            <ts-icon name="alert-triangle" class="alert-icon" />
            <span class="warning-text">
              Low contrast (&lt; 2.5:1). Camera scanners may fail to scan this code reliably.
            </span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .color-customizer-root {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .customizer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .customizer-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9375rem;
      font-weight: 650;
      color: var(--text, #fcfcfc);
    }

    .section-icon {
      width: 1.125rem;
      height: 1.125rem;
      color: var(--accent, #3b82f6);
    }

    .swap-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      background: transparent;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text-2, rgba(255, 255, 255, 0.7));
      padding: 0.25rem 0.625rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .swap-btn:hover {
      border-color: var(--accent, #3b82f6);
      color: var(--accent-strong, #60a5fa);
      background: var(--accent-soft, rgba(59, 130, 246, 0.08));
    }

    .swap-icon {
      width: 0.875rem;
      height: 0.875rem;
    }

    /* Pickers grid */
    .pickers-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.875rem;
    }

    .picker-group {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .picker-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text-3, rgba(255, 255, 255, 0.55));
    }

    .picker-input-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--surface-3, rgba(0, 0, 0, 0.25));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      border-radius: 8px;
      padding: 0.25rem 0.5rem 0.25rem 0.25rem;
    }

    .native-color-picker {
      width: 32px;
      height: 32px;
      padding: 0;
      border: none;
      border-radius: 6px;
      background: transparent;
      cursor: pointer;
      flex-shrink: 0;
    }

    .native-color-picker::-webkit-color-swatch-wrapper {
      padding: 0;
    }

    .native-color-picker::-webkit-color-swatch {
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 4px;
    }

    .hex-text-input {
      width: 100%;
      background: transparent;
      border: none;
      color: var(--text, #fcfcfc);
      font-family: var(--ts-font-mono, monospace);
      font-size: 0.8125rem;
      outline: none;
      text-transform: uppercase;
    }

    /* Color Presets */
    .color-presets-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.375rem;
      font-size: 0.75rem;
    }

    .presets-caption {
      color: var(--text-3, rgba(255, 255, 255, 0.45));
      margin-right: 0.25rem;
    }

    .preset-pair-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      background: var(--surface-2, rgba(255, 255, 255, 0.04));
      color: var(--text-2, rgba(255, 255, 255, 0.75));
      cursor: pointer;
      font-size: 0.75rem;
      transition: all 0.15s ease;
    }

    .preset-pair-btn:hover {
      background: var(--surface-3, rgba(255, 255, 255, 0.08));
      border-color: var(--accent-border, rgba(59, 130, 246, 0.4));
      color: var(--text, #fcfcfc);
    }

    .preset-pair-btn.active {
      border-color: var(--accent-border, rgba(59, 130, 246, 0.5));
      background: var(--accent-soft, rgba(59, 130, 246, 0.12));
      color: var(--accent-strong, #60a5fa);
      font-weight: 600;
    }

    .preset-pair-btn:focus-visible {
      outline: 2px solid var(--tool-accent, var(--accent, #3b82f6));
      outline-offset: 1px;
    }

    .preset-pair-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .preset-swatch {
      width: 14px;
      height: 14px;
      border-radius: 3px;
      display: inline-flex;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .swatch-half {
      width: 50%;
      height: 100%;
    }

    /* Contrast Feedback Box */
    .contrast-feedback-box {
      border-radius: 8px;
      padding: 0.75rem 0.875rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      background: var(--surface-2, rgba(0, 0, 0, 0.15));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      transition: all 0.2s ease;
    }

    .contrast-feedback-box.contrast-warning {
      border-color: rgba(239, 68, 68, 0.4);
      background: rgba(239, 68, 68, 0.06);
    }

    .contrast-info-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .ratio-badge-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .ratio-value {
      font-size: 0.9375rem;
      font-weight: 700;
      font-family: var(--ts-font-mono, monospace);
      color: var(--text, #fcfcfc);
    }

    .wcag-badge {
      font-size: 0.7rem;
      border-color: var(--border, rgba(255, 255, 255, 0.15));
      color: var(--text-2, rgba(255, 255, 255, 0.75));
    }

    .wcag-badge.badge-pass {
      border-color: var(--tool-accent-border, var(--accent-border, rgba(59, 130, 246, 0.35)));
      color: var(--accent-strong, #60a5fa);
      background: var(--tool-accent-soft, var(--accent-soft, rgba(59, 130, 246, 0.1)));
    }

    .sample-preview-chip {
      padding: 0.15rem 0.625rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      border: 1px solid;
    }

    .warning-alert-row {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: #ef4444;
      font-weight: 500;
    }

    .alert-icon {
      width: 0.875rem;
      height: 0.875rem;
      flex-shrink: 0;
    }

    @media (max-width: 520px) {
      .pickers-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ColorCustomizerComponent {
  private readonly colorValidator = inject(ColorValidatorService);

  readonly foregroundColor = input<string>('#000000');
  readonly backgroundColor = input<string>('#FFFFFF');

  readonly foregroundColorChange = output<string>();
  readonly backgroundColorChange = output<string>();

  readonly presets: ColorPresetPair[] = [
    { name: 'Classic', fg: '#000000', bg: '#FFFFFF' },
    { name: 'Modern Minimal', fg: '#1E3A8A', bg: '#E0F2FE' },
    { name: 'Navy', fg: '#0F172A', bg: '#F8FAFC' },
    { name: 'Dark Mode', fg: '#F8FAFC', bg: '#0F172A' }
  ];

  readonly contrast = computed(() => {
    return this.colorValidator.checkContrast(this.foregroundColor(), this.backgroundColor());
  });

  onFgPickerChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.foregroundColorChange.emit(val);
  }

  onFgTextChange(val: string): void {
    if (this.colorValidator.isValidHex(val)) {
      this.foregroundColorChange.emit(this.colorValidator.normalizeHex(val));
    } else {
      this.foregroundColorChange.emit(val);
    }
  }

  onBgPickerChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.backgroundColorChange.emit(val);
  }

  onBgTextChange(val: string): void {
    if (this.colorValidator.isValidHex(val)) {
      this.backgroundColorChange.emit(this.colorValidator.normalizeHex(val));
    } else {
      this.backgroundColorChange.emit(val);
    }
  }

  swapColors(): void {
    const curFg = this.foregroundColor();
    const curBg = this.backgroundColor();
    this.foregroundColorChange.emit(curBg);
    this.backgroundColorChange.emit(curFg);
  }

  applyPreset(preset: ColorPresetPair): void {
    this.foregroundColorChange.emit(preset.fg);
    this.backgroundColorChange.emit(preset.bg);
  }
}

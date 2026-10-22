// client/apps/tool-qr-generator/src/components/size-slider/size-slider.component.ts
import {
  Component,
  input,
  output,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SIZE_PRESETS, SizePreset } from '../../models/qr-generator.models';
import { TsIconComponent } from '@acklet/tool-shell';

@Component({
  selector: 'app-size-slider',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="size-slider-root">
      <div class="slider-header-row">
        <label for="qr-size-number" class="slider-title-label">
          <ts-icon name="maximize-2" class="section-icon" />
          <span>Export Resolution</span>
        </label>
        <div class="numeric-input-wrapper">
          <input
            id="qr-size-number"
            type="number"
            class="qr-number-input"
            min="128"
            max="4096"
            step="16"
            [value]="size()"
            (input)="onNumberInput($event)"
            (blur)="onNumberBlur($event)"
            aria-label="Export resolution in pixels"
          />
          <span class="input-unit">px</span>
        </div>
      </div>

      <!-- Compact Segmented Presets (Small 256, Medium 512, Large 1024, Print 2048) -->
      <div class="size-segmented-track" role="radiogroup" aria-label="Resolution Presets">
        @for (preset of presets; track preset.id) {
          <button
            type="button"
            role="radio"
            class="size-segment-btn"
            [class.active]="size() === preset.size"
            [attr.aria-checked]="size() === preset.size"
            (click)="selectPreset(preset)"
            [title]="preset.description"
            [attr.aria-label]="preset.label + ' ' + preset.size + ' pixels: ' + preset.description"
          >
            <span class="chip-name">{{ preset.label }}</span>
            <span class="chip-dim">{{ preset.size }}px</span>
          </button>
        }
      </div>

      <!-- Fine-tune Range Slider (128px to 4096px) -->
      <div class="slider-track-row">
        <input
          id="qr-size-range"
          type="range"
          class="qr-range-slider"
          min="128"
          max="4096"
          step="32"
          [value]="size()"
          (input)="onSliderInput($event)"
          aria-label="QR Code export resolution in pixels"
        />
        <div class="range-scale-labels">
          <span>128px</span>
          <span>1,024px</span>
          <span>2,048px</span>
          <span>4,096px</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .size-slider-root {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .slider-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .slider-title-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
      cursor: pointer;
    }

    .section-icon {
      width: 15px;
      height: 15px;
      color: var(--tool-accent, var(--accent, #3b82f6));
    }

    .numeric-input-wrapper {
      display: inline-flex;
      align-items: center;
      background: #ffffff;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
      border-radius: 6px;
      padding: 2px 6px;
      gap: 2px;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    :host-context([data-theme="dark"]) .numeric-input-wrapper,
    [data-theme="dark"] .numeric-input-wrapper {
      background: var(--surface-2, rgba(255, 255, 255, 0.05));
    }

    .numeric-input-wrapper:focus-within {
      border-color: var(--tool-accent, #3b82f6);
      box-shadow: 0 0 0 2px var(--tool-accent-soft, rgba(59, 130, 246, 0.25));
    }

    .qr-number-input {
      width: 48px;
      border: none;
      background: transparent;
      font-family: var(--ts-font-mono, monospace);
      font-size: 12px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
      text-align: right;
      outline: none;
      padding: 0;
      -moz-appearance: textfield;
    }

    :host-context([data-theme="light"]) .qr-number-input,
    [data-theme="light"] .qr-number-input {
      color: #0f172a;
    }

    .qr-number-input::-webkit-outer-spin-button,
    .qr-number-input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }

    .input-unit {
      font-size: 10px;
      font-family: var(--ts-font-mono, monospace);
      color: var(--text-muted, var(--text-3, rgba(255, 255, 255, 0.5)));
      font-weight: 500;
    }

    /* Segmented Track */
    .size-segmented-track {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 4px;
      padding: 3px;
      background: var(--surface-2, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: var(--ts-radius-control, 10px);
    }

    .size-segment-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      height: 32px;
      padding: 0 4px;
      border-radius: 7px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-muted, var(--text-2, rgba(255, 255, 255, 0.7)));
      cursor: pointer;
      transition: all 150ms ease;
    }

    .size-segment-btn:hover:not(.active) {
      background: var(--surface-3, rgba(255, 255, 255, 0.08));
      color: var(--text, #fcfcfc);
    }

    .size-segment-btn.active {
      background: var(--surface-1, #111A2E);
      border-color: var(--tool-accent-border, var(--border-strong, rgba(59, 130, 246, 0.4)));
      color: var(--tool-accent, var(--accent, #3b82f6));
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    .chip-name {
      font-size: 11px;
      font-weight: 600;
    }

    .chip-dim {
      font-size: 9.5px;
      font-family: var(--ts-font-mono, monospace);
      opacity: 0.8;
    }

    .slider-track-row {
      display: flex;
      flex-direction: column;
      gap: 3px;
      margin-top: 2px;
    }

    .qr-range-slider {
      width: 100%;
      height: 4px;
      border-radius: 999px;
      background: var(--surface-3, rgba(255, 255, 255, 0.12));
      outline: none;
      -webkit-appearance: none;
      appearance: none;
      cursor: pointer;
    }

    .qr-range-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--tool-accent, var(--accent, #3b82f6));
      cursor: pointer;
      border: 2px solid var(--surface-1, #ffffff);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
      transition: transform 0.1s ease;
    }

    .qr-range-slider::-webkit-slider-thumb:hover {
      transform: scale(1.2);
    }

    .qr-range-slider::-moz-range-thumb {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--tool-accent, var(--accent, #3b82f6));
      cursor: pointer;
      border: 2px solid var(--surface-1, #ffffff);
    }

    .range-scale-labels {
      display: flex;
      justify-content: space-between;
      font-size: 9.5px;
      color: var(--text-muted, var(--text-3, rgba(255, 255, 255, 0.4)));
      font-family: var(--ts-font-mono, monospace);
    }
  `]
})
export class SizeSliderComponent {
  readonly size = input<number>(512);
  readonly sizeChange = output<number>();

  readonly presets: SizePreset[] = SIZE_PRESETS;

  onSliderInput(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    const clamped = Math.max(128, Math.min(4096, val));
    this.sizeChange.emit(clamped);
  }

  onNumberInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    if (!raw) return;
    const num = parseInt(raw, 10);
    if (!isNaN(num)) {
      const clamped = Math.max(128, Math.min(4096, num));
      this.sizeChange.emit(clamped);
    }
  }

  onNumberBlur(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const raw = inputEl.value;
    const num = parseInt(raw, 10);
    const clamped = isNaN(num) ? 512 : Math.max(128, Math.min(4096, num));
    inputEl.value = String(clamped);
    this.sizeChange.emit(clamped);
  }

  selectPreset(preset: SizePreset): void {
    this.sizeChange.emit(preset.size);
  }
}

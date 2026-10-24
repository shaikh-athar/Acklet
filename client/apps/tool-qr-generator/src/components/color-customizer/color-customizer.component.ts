// client/apps/tool-qr-generator/src/components/color-customizer/color-customizer.component.ts
import {
  Component,
  input,
  output,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ColorValidatorService } from '../../services/color-validator.service';
import { QrGradientOptions, DEFAULT_GRADIENT_OPTIONS } from '../../models/qr-generator.models';
import { TsIconComponent, HlmBadge } from '@acklet/tool-shell';

interface ColorPresetPair {
  name: string;
  fg: string;
  bg: string;
}

interface GradientPreset {
  name: string;
  type: 'linear' | 'radial';
  rotation: number;
  color1: string;
  color2: string;
}

@Component({
  selector: 'app-color-customizer',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
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

      <!-- Segmented Mode Selectors for Foreground & Background -->
      <div class="color-targets-grid">
        <!-- Target 1: Foreground Modules -->
        <div class="color-target-card">
          <div class="target-card-header">
            <span class="target-title">Foreground Modules</span>
            <div class="mode-segmented-pill">
              <button
                type="button"
                class="seg-pill-btn"
                [class.active]="!foregroundGradient().enabled"
                (click)="toggleFgGradient(false)"
              >
                Solid
              </button>
              <button
                type="button"
                class="seg-pill-btn"
                [class.active]="foregroundGradient().enabled"
                (click)="toggleFgGradient(true)"
              >
                Gradient
              </button>
            </div>
          </div>

          @if (!foregroundGradient().enabled) {
            <!-- Solid FG Picker -->
            <div class="picker-input-row slide-fade-up">
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
          } @else {
            <!-- Gradient FG Controls -->
            <div class="gradient-controls-box slide-fade-up">
              <div class="gradient-dual-pickers">
                <div class="grad-picker-col">
                  <span class="grad-label">Start Color</span>
                  <div class="picker-input-row">
                    <input
                      type="color"
                      class="native-color-picker"
                      [value]="foregroundGradient().color1"
                      (input)="onFgGradColor1($any($event.target).value)"
                    />
                    <input
                      type="text"
                      class="hex-text-input"
                      [value]="foregroundGradient().color1"
                      (change)="onFgGradColor1($any($event.target).value)"
                      maxlength="7"
                    />
                  </div>
                </div>

                <div class="grad-picker-col">
                  <span class="grad-label">End Color</span>
                  <div class="picker-input-row">
                    <input
                      type="color"
                      class="native-color-picker"
                      [value]="foregroundGradient().color2"
                      (input)="onFgGradColor2($any($event.target).value)"
                    />
                    <input
                      type="text"
                      class="hex-text-input"
                      [value]="foregroundGradient().color2"
                      (change)="onFgGradColor2($any($event.target).value)"
                      maxlength="7"
                    />
                  </div>
                </div>
              </div>

              <!-- Gradient Type & Angle Controls -->
              <div class="grad-params-row">
                <div class="grad-type-toggle">
                  <button
                    type="button"
                    class="grad-type-btn"
                    [class.active]="foregroundGradient().type === 'linear'"
                    (click)="setFgGradType('linear')"
                  >
                    Linear
                  </button>
                  <button
                    type="button"
                    class="grad-type-btn"
                    [class.active]="foregroundGradient().type === 'radial'"
                    (click)="setFgGradType('radial')"
                  >
                    Radial
                  </button>
                </div>

                @if (foregroundGradient().type === 'linear') {
                  <div class="grad-angle-control">
                    <span class="angle-label">{{ foregroundGradient().rotation }}°</span>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="5"
                      class="angle-slider"
                      [value]="foregroundGradient().rotation"
                      (input)="onFgGradAngle($any($event.target).value)"
                      aria-label="Foreground gradient angle"
                    />
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <!-- Target 2: Background Canvas -->
        <div class="color-target-card">
          <div class="target-card-header">
            <span class="target-title">Background Canvas</span>
            <div class="mode-segmented-pill">
              <button
                type="button"
                class="seg-pill-btn"
                [class.active]="!backgroundGradient().enabled"
                (click)="toggleBgGradient(false)"
              >
                Solid
              </button>
              <button
                type="button"
                class="seg-pill-btn"
                [class.active]="backgroundGradient().enabled"
                (click)="toggleBgGradient(true)"
              >
                Gradient
              </button>
            </div>
          </div>

          @if (!backgroundGradient().enabled) {
            <!-- Solid BG Picker -->
            <div class="picker-input-row slide-fade-up">
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
          } @else {
            <!-- Gradient BG Controls -->
            <div class="gradient-controls-box slide-fade-up">
              <div class="gradient-dual-pickers">
                <div class="grad-picker-col">
                  <span class="grad-label">Start Color</span>
                  <div class="picker-input-row">
                    <input
                      type="color"
                      class="native-color-picker"
                      [value]="backgroundGradient().color1"
                      (input)="onBgGradColor1($any($event.target).value)"
                    />
                    <input
                      type="text"
                      class="hex-text-input"
                      [value]="backgroundGradient().color1"
                      (change)="onBgGradColor1($any($event.target).value)"
                      maxlength="7"
                    />
                  </div>
                </div>

                <div class="grad-picker-col">
                  <span class="grad-label">End Color</span>
                  <div class="picker-input-row">
                    <input
                      type="color"
                      class="native-color-picker"
                      [value]="backgroundGradient().color2"
                      (input)="onBgGradColor2($any($event.target).value)"
                    />
                    <input
                      type="text"
                      class="hex-text-input"
                      [value]="backgroundGradient().color2"
                      (change)="onBgGradColor2($any($event.target).value)"
                      maxlength="7"
                    />
                  </div>
                </div>
              </div>

              <!-- Gradient Type & Angle Controls -->
              <div class="grad-params-row">
                <div class="grad-type-toggle">
                  <button
                    type="button"
                    class="grad-type-btn"
                    [class.active]="backgroundGradient().type === 'linear'"
                    (click)="setBgGradType('linear')"
                  >
                    Linear
                  </button>
                  <button
                    type="button"
                    class="grad-type-btn"
                    [class.active]="backgroundGradient().type === 'radial'"
                    (click)="setBgGradType('radial')"
                  >
                    Radial
                  </button>
                </div>

                @if (backgroundGradient().type === 'linear') {
                  <div class="grad-angle-control">
                    <span class="angle-label">{{ backgroundGradient().rotation }}°</span>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="5"
                      class="angle-slider"
                      [value]="backgroundGradient().rotation"
                      (input)="onBgGradAngle($any($event.target).value)"
                      aria-label="Background gradient angle"
                    />
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Quick Color Palette Presets -->
      <div class="color-presets-row">
        <span class="presets-caption">Presets:</span>
        @for (preset of presets; track preset.name) {
          <button
            type="button"
            class="preset-pair-btn"
            [class.active]="!foregroundGradient().enabled && !backgroundGradient().enabled && foregroundColor() === preset.fg && backgroundColor() === preset.bg"
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

      <!-- Quick Gradient Presets -->
      <div class="color-presets-row">
        <span class="presets-caption">Gradient Themes:</span>
        @for (gPreset of gradientPresets; track gPreset.name) {
          <button
            type="button"
            class="preset-pair-btn"
            (click)="applyGradientTheme(gPreset)"
            [title]="gPreset.name + ' gradient preset'"
          >
            <span
              class="preset-swatch gradient-swatch"
              [style.background]="'linear-gradient(' + gPreset.rotation + 'deg, ' + gPreset.color1 + ', ' + gPreset.color2 + ')'"
            ></span>
            <span class="preset-title">{{ gPreset.name }}</span>
          </button>
        }
      </div>

      <!-- Clean Scanner Reliability Indicator (No confusing raw ratios or sample text) -->
      @if (contrast().hasLowContrast) {
        <div class="warning-alert-row slide-fade-up" role="alert">
          <ts-icon name="alert-triangle" class="alert-icon" />
          <span class="warning-text">
            Low scanner contrast: Ensure modules are clearly distinct from the background for faster camera scanning.
          </span>
        </div>
      } @else {
        <div class="contrast-ok-row slide-fade-up">
          <ts-icon name="check-circle" class="check-icon" />
          <span class="ok-text">Optimal Contrast: High scan reliability across all mobile cameras</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .color-customizer-root {
      display: flex;
      flex-direction: column;
      gap: 14px;
      width: 100%;
      box-sizing: border-box;
    }

    .customizer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .customizer-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13.5px;
      font-weight: 650;
      color: var(--text, #fcfcfc);
    }

    .section-icon {
      width: 16px;
      height: 16px;
      color: var(--tool-accent, var(--accent, #3b82f6));
    }

    .swap-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--surface-2, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text-2, rgba(255, 255, 255, 0.75));
      padding: 4px 10px;
      border-radius: 7px;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .swap-btn:hover {
      border-color: var(--tool-accent, #3b82f6);
      color: var(--tool-accent, #60a5fa);
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.1));
    }

    .swap-icon {
      width: 13px;
      height: 13px;
    }

    /* Target Cards Grid (Foreground & Background) */
    .color-targets-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .color-target-card {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 10px;
      border-radius: 10px;
      background: var(--surface-2, rgba(255, 255, 255, 0.03));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      overflow: hidden;
      min-width: 0;
    }

    .target-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .target-title {
      font-size: 11.5px;
      font-weight: 650;
      color: var(--text, #fcfcfc);
      letter-spacing: -0.01em;
    }

    /* Segmented Mode Pill (Solid | Gradient) */
    .mode-segmented-pill {
      display: inline-flex;
      background: var(--surface-3, rgba(0, 0, 0, 0.3));
      padding: 2px;
      border-radius: 6px;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    .seg-pill-btn {
      padding: 2px 7px;
      border-radius: 4px;
      border: none;
      background: transparent;
      color: var(--text-3, rgba(255, 255, 255, 0.6));
      font-size: 10.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .seg-pill-btn.active {
      background: var(--tool-accent, #3b82f6);
      color: #ffffff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    .picker-input-row {
      display: flex;
      align-items: center;
      gap: 6px;
      background: var(--surface-3, rgba(0, 0, 0, 0.25));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      border-radius: 8px;
      padding: 3px 6px 3px 3px;
    }

    .native-color-picker {
      width: 28px;
      height: 28px;
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
      font-size: 11.5px;
      outline: none;
      text-transform: uppercase;
    }

    /* Gradient Controls Box */
    .gradient-controls-box {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      min-width: 0;
    }

    .gradient-dual-pickers {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }

    .grad-picker-col {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }

    .grad-label {
      font-size: 10px;
      color: var(--text-3, rgba(255, 255, 255, 0.5));
      font-weight: 500;
    }

    .grad-params-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding-top: 2px;
      width: 100%;
      box-sizing: border-box;
      min-width: 0;
    }

    .grad-type-toggle {
      display: inline-flex;
      background: var(--surface-3, rgba(0, 0, 0, 0.25));
      padding: 2px;
      border-radius: 6px;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      flex-shrink: 0;
    }

    .grad-type-btn {
      padding: 2px 7px;
      border-radius: 4px;
      border: none;
      background: transparent;
      color: var(--text-3, rgba(255, 255, 255, 0.6));
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .grad-type-btn.active {
      background: var(--surface-1, rgba(255, 255, 255, 0.14));
      color: var(--text, #ffffff);
    }

    .grad-angle-control {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1 1 auto;
      min-width: 0;
      max-width: 130px;
    }

    .angle-label {
      font-family: var(--ts-font-mono, monospace);
      font-size: 11px;
      font-weight: 600;
      color: var(--tool-accent, #60a5fa);
      min-width: 36px;
      text-align: right;
      white-space: nowrap;
      flex-shrink: 0;
      line-height: 1;
    }

    .angle-slider {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      min-width: 0;
      height: 4px;
      background: var(--surface-active, rgba(125, 125, 125, 0.25));
      border-radius: 9999px;
      outline: none;
      cursor: pointer;
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    .angle-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--tool-accent, #3b82f6);
      border: 2px solid #ffffff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
      cursor: pointer;
      transition: transform 0.1s ease;
    }

    .angle-slider::-webkit-slider-thumb:hover {
      transform: scale(1.15);
    }

    .angle-slider::-moz-range-thumb {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--tool-accent, #3b82f6);
      border: 2px solid #ffffff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
      cursor: pointer;
    }

    /* Color Presets */
    .color-presets-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 5px;
      font-size: 11px;
    }

    .presets-caption {
      color: var(--text-3, rgba(255, 255, 255, 0.5));
      margin-right: 4px;
      font-size: 11px;
      font-weight: 500;
    }

    .preset-pair-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      background: var(--surface-2, rgba(255, 255, 255, 0.04));
      color: var(--text-2, rgba(255, 255, 255, 0.75));
      cursor: pointer;
      font-size: 11px;
      transition: all 0.15s ease;
    }

    .preset-pair-btn:hover {
      background: var(--surface-3, rgba(255, 255, 255, 0.08));
      border-color: var(--accent-border, rgba(59, 130, 246, 0.4));
      color: var(--text, #fcfcfc);
    }

    .preset-pair-btn.active {
      border-color: var(--tool-accent, #3b82f6);
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.12));
      color: var(--tool-accent, #60a5fa);
      font-weight: 600;
    }

    .preset-swatch {
      width: 14px;
      height: 14px;
      border-radius: 3px;
      display: inline-flex;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .gradient-swatch {
      border-radius: 3px;
    }

    .swatch-half {
      width: 50%;
      height: 100%;
    }

    /* Clean Scanner Status Alerts */
    .warning-alert-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 8px;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.25);
      font-size: 11.5px;
      color: #f87171;
      font-weight: 500;
    }

    .contrast-ok-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 12px;
      border-radius: 8px;
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.2);
      font-size: 11.5px;
      color: #34d399;
      font-weight: 500;
    }

    .alert-icon {
      width: 15px;
      height: 15px;
      color: #ef4444;
      flex-shrink: 0;
    }

    .check-icon {
      width: 15px;
      height: 15px;
      color: #10b981;
      flex-shrink: 0;
    }

    @keyframes slideFadeUp {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .slide-fade-up {
      animation: slideFadeUp 150ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @media (max-width: 560px) {
      .color-targets-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ColorCustomizerComponent {
  private readonly colorValidator = inject(ColorValidatorService);

  readonly foregroundColor = input<string>('#000000');
  readonly backgroundColor = input<string>('#FFFFFF');
  readonly foregroundGradient = input<QrGradientOptions>(DEFAULT_GRADIENT_OPTIONS);
  readonly backgroundGradient = input<QrGradientOptions>(DEFAULT_GRADIENT_OPTIONS);

  readonly foregroundColorChange = output<string>();
  readonly backgroundColorChange = output<string>();
  readonly foregroundGradientChange = output<QrGradientOptions>();
  readonly backgroundGradientChange = output<QrGradientOptions>();

  readonly presets: ColorPresetPair[] = [
    { name: 'Classic', fg: '#000000', bg: '#FFFFFF' },
    { name: 'Tool Signature', fg: '#0284C7', bg: '#F0F9FF' },
    { name: 'Deep Midnight', fg: '#0F172A', bg: '#F8FAFC' },
    { name: 'Dark Mode', fg: '#F8FAFC', bg: '#0F172A' }
  ];

  readonly gradientPresets: GradientPreset[] = [
    { name: 'Ocean Blue', type: 'linear', rotation: 45, color1: '#0284C7', color2: '#2563EB' },
    { name: 'Sunset Glow', type: 'linear', rotation: 90, color1: '#F59E0B', color2: '#EF4444' },
    { name: 'Emerald Forest', type: 'linear', rotation: 45, color1: '#059669', color2: '#10B981' },
    { name: 'Purple Dawn', type: 'linear', rotation: 135, color1: '#8B5CF6', color2: '#EC4899' },
    { name: 'Neon Cyber', type: 'linear', rotation: 180, color1: '#06B6D4', color2: '#3B82F6' }
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

  toggleFgGradient(enabled: boolean): void {
    const cur = this.foregroundGradient();
    this.foregroundGradientChange.emit({
      ...cur,
      enabled
    });
  }

  toggleBgGradient(enabled: boolean): void {
    const cur = this.backgroundGradient();
    this.backgroundGradientChange.emit({
      ...cur,
      enabled
    });
  }

  setFgGradType(type: 'linear' | 'radial'): void {
    const cur = this.foregroundGradient();
    this.foregroundGradientChange.emit({ ...cur, type });
  }

  setBgGradType(type: 'linear' | 'radial'): void {
    const cur = this.backgroundGradient();
    this.backgroundGradientChange.emit({ ...cur, type });
  }

  onFgGradColor1(color1: string): void {
    const cur = this.foregroundGradient();
    this.foregroundGradientChange.emit({ ...cur, color1 });
  }

  onFgGradColor2(color2: string): void {
    const cur = this.foregroundGradient();
    this.foregroundGradientChange.emit({ ...cur, color2 });
  }

  onBgGradColor1(color1: string): void {
    const cur = this.backgroundGradient();
    this.backgroundGradientChange.emit({ ...cur, color1 });
  }

  onBgGradColor2(color2: string): void {
    const cur = this.backgroundGradient();
    this.backgroundGradientChange.emit({ ...cur, color2 });
  }

  onFgGradAngle(angle: number | string): void {
    const cur = this.foregroundGradient();
    this.foregroundGradientChange.emit({ ...cur, rotation: Number(angle) });
  }

  onBgGradAngle(angle: number | string): void {
    const cur = this.backgroundGradient();
    this.backgroundGradientChange.emit({ ...cur, rotation: Number(angle) });
  }

  swapColors(): void {
    // If gradient is active, swap gradient colors
    if (this.foregroundGradient().enabled) {
      const cur = this.foregroundGradient();
      this.foregroundGradientChange.emit({
        ...cur,
        color1: cur.color2,
        color2: cur.color1
      });
      return;
    }

    const curFg = this.foregroundColor();
    const curBg = this.backgroundColor();
    this.foregroundColorChange.emit(curBg);
    this.backgroundColorChange.emit(curFg);
  }

  applyPreset(preset: ColorPresetPair): void {
    this.toggleFgGradient(false);
    this.toggleBgGradient(false);
    this.foregroundColorChange.emit(preset.fg);
    this.backgroundColorChange.emit(preset.bg);
  }

  applyGradientTheme(gPreset: GradientPreset): void {
    this.foregroundGradientChange.emit({
      enabled: true,
      type: gPreset.type,
      rotation: gPreset.rotation,
      color1: gPreset.color1,
      color2: gPreset.color2
    });
  }
}

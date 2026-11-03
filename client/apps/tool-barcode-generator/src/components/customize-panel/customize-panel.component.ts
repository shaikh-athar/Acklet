// apps/tool-barcode-generator/src/components/customize-panel/customize-panel.component.ts
import {
  Component,
  model,
  input,
  computed,
  signal,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TsIconComponent } from '@acklet/tool-shell';
import {
  BarcodeDesignOptions,
  BarcodeFormat,
  DEFAULT_DESIGN_OPTIONS
} from '../../models/barcode.models';

@Component({
  selector: 'app-barcode-customize-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="customize-panel-body">
      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- 1. Size & Dimensions Section                                 -->
      <!-- ════════════════════════════════════════════════════════════ -->
      <div class="custom-card-group">
        <div class="group-header">
          <span class="group-title">Size and dimensions</span>
        </div>

        <!-- Presets: Small, Standard, Large -->
        <div class="pill-segmented-control">
          <button
            type="button"
            class="seg-btn"
            [class.active]="options().sizePreset === 'small'"
            (click)="selectPreset('small')"
          >
            Small (80%)
          </button>
          <button
            type="button"
            class="seg-btn"
            [class.active]="options().sizePreset === 'standard'"
            (click)="selectPreset('standard')"
          >
            Standard (100%)
          </button>
          <button
            type="button"
            class="seg-btn"
            [class.active]="options().sizePreset === 'large'"
            (click)="selectPreset('large')"
          >
            Large (150%)
          </button>
        </div>

        <!-- Advanced Size Disclosure (Collapsed by default) -->
        <details class="advanced-disclosure" #sizeDetails>
          <summary class="disclosure-summary">
            <ts-icon name="sliders" [size]="14" class="disclosure-icon" />
            <span>Advanced dimensions and DPI</span>
            <ts-icon name="chevron-down" [size]="14" class="summary-chevron" />
          </summary>

          <div class="disclosure-body">
            <div class="dimensions-grid">
              <div class="sub-field">
                <label class="sub-label">Unit</label>
                <select
                  class="ts-select"
                  [ngModel]="options().unit"
                  (ngModelChange)="updateOption('unit', $event)"
                >
                  <option value="mm">Millimeters (mm)</option>
                  <option value="inch">Inches (in)</option>
                </select>
              </div>

              <div class="sub-field">
                <label class="sub-label">Width ({{ options().unit }})</label>
                <input
                  type="number"
                  class="ts-num-input"
                  [ngModel]="options().widthMm"
                  (ngModelChange)="updateOption('widthMm', $event)"
                  min="15"
                  max="300"
                  step="0.5"
                />
              </div>

              <div class="sub-field">
                <label class="sub-label">Height ({{ options().unit }})</label>
                <input
                  type="number"
                  class="ts-num-input"
                  [ngModel]="options().heightMm"
                  (ngModelChange)="updateOption('heightMm', $event)"
                  min="10"
                  max="200"
                  step="0.5"
                />
              </div>

              <div class="sub-field">
                <label class="sub-label">Print DPI</label>
                <select
                  class="ts-select"
                  [ngModel]="options().dpi"
                  (ngModelChange)="updateOption('dpi', $event)"
                >
                  <option [ngValue]="203">203 DPI (Thermal)</option>
                  <option [ngValue]="300">300 DPI (Standard)</option>
                  <option [ngValue]="600">600 DPI (High Res)</option>
                </select>
              </div>
            </div>

            <!-- Minimum Size Warning -->
            @if (isBelowMinimumSize()) {
              <div class="warning-banner" role="status">
                <ts-icon name="circle-alert" [size]="14" />
                <span>Dimensions are below GS1 minimum specifications (29.8 mm width for 80% magnification).</span>
              </div>
            }
          </div>
        </details>
      </div>

      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- 2. Colors & Contrast Section                                 -->
      <!-- ════════════════════════════════════════════════════════════ -->
      <div class="custom-card-group">
        <div class="group-header">
          <span class="group-title">Colors and contrast</span>
          <span class="contrast-score" [class.is-safe]="contrastRatio() >= 4.5" [class.is-low]="contrastRatio() < 4.5">
            {{ contrastRatio().toFixed(1) }}:1 contrast
          </span>
        </div>

        <div class="colors-row">
          <div class="color-picker-item">
            <label class="sub-label">Bar color</label>
            <div class="color-swatch-wrapper">
              <input
                type="color"
                class="native-color-picker"
                [ngModel]="options().barColor"
                (ngModelChange)="updateOption('barColor', $event)"
              />
              <span class="hex-text">{{ options().barColor }}</span>
            </div>
          </div>

          <div class="color-picker-item">
            <label class="sub-label">Background</label>
            <div class="color-swatch-wrapper" [class.is-disabled]="options().transparentBg">
              <input
                type="color"
                class="native-color-picker"
                [disabled]="options().transparentBg"
                [ngModel]="options().bgColor"
                (ngModelChange)="updateOption('bgColor', $event)"
              />
              <span class="hex-text">{{ options().transparentBg ? 'None' : options().bgColor }}</span>
            </div>
          </div>
        </div>

        <!-- Transparent Background Checkbox -->
        <label class="toggle-control-label">
          <input
            type="checkbox"
            class="ts-checkbox"
            [ngModel]="options().transparentBg"
            (ngModelChange)="updateOption('transparentBg', $event)"
          />
          <span class="toggle-text">Transparent background</span>
        </label>

        <!-- Low Contrast or Inverted Warning -->
        @if (contrastWarning(); as warn) {
          <div class="warning-banner" role="alert">
            <ts-icon name="circle-alert" [size]="14" />
            <span>{{ warn }}</span>
          </div>
        }
      </div>

      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- 3. Human-Readable Text Section                               -->
      <!-- ════════════════════════════════════════════════════════════ -->
      <div class="custom-card-group">
        <div class="group-header">
          <span class="group-title">Human-readable text</span>
          <label class="switch-toggle" aria-label="Toggle human-readable text">
            <input
              type="checkbox"
              [ngModel]="options().showText"
              (ngModelChange)="updateOption('showText', $event)"
            />
            <span class="switch-slider"></span>
          </label>
        </div>

        @if (options().showText && isEanOrUpc()) {
          <div class="text-controls-grid">
            <div class="sub-field">
              <label class="toggle-control-label">
                <input
                  type="checkbox"
                  class="ts-checkbox"
                  [ngModel]="options().eanGrouping"
                  (ngModelChange)="updateOption('eanGrouping', $event)"
                />
                <span class="toggle-text">Standard digit grouping</span>
              </label>
            </div>
          </div>
        }
      </div>

      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- 4. Caption Section                                           -->
      <!-- ════════════════════════════════════════════════════════════ -->
      <div class="custom-card-group">
        <div class="group-header">
          <span class="group-title">Caption</span>
        </div>

        <div class="sub-field">
          <label class="sub-label">Caption text</label>
          <input
            type="text"
            class="ts-text-input"
            placeholder="e.g. Organic Coffee 250g"
            [ngModel]="options().captionText"
            (ngModelChange)="updateOption('captionText', $event)"
            maxlength="60"
          />
        </div>

        <!-- Caption styling controls shown only if caption input added -->
        @if (options().captionText.trim()) {
          <div class="text-controls-grid">
            <div class="sub-field">
              <label class="sub-label">Position</label>
              <select
                class="ts-select"
                [ngModel]="options().captionPosition"
                (ngModelChange)="updateOption('captionPosition', $event)"
              >
                <option value="above">Above barcode</option>
                <option value="below">Below barcode</option>
              </select>
            </div>

            <div class="sub-field">
              <label class="sub-label">Font family</label>
              <select
                class="ts-select"
                [ngModel]="options().fontFamily"
                (ngModelChange)="updateOption('fontFamily', $event)"
              >
                <option value="ocr-b">OCR-B / Optical</option>
                <option value="monospace">Monospace</option>
                <option value="sans-serif">Clean Sans</option>
              </select>
            </div>

            <div class="sub-field">
              <label class="sub-label">Font size</label>
              <select
                class="ts-select"
                [ngModel]="options().fontSize"
                (ngModelChange)="updateOption('fontSize', $event)"
              >
                <option [ngValue]="8">8 pt</option>
                <option [ngValue]="10">10 pt</option>
                <option [ngValue]="12">12 pt</option>
                <option [ngValue]="14">14 pt</option>
              </select>
            </div>

            <div class="sub-field">
              <label class="sub-label">Formatting</label>
              <div class="checkboxes-col">
                <label class="toggle-control-label">
                  <input
                    type="checkbox"
                    class="ts-checkbox"
                    [ngModel]="options().fontBold"
                    (ngModelChange)="updateOption('fontBold', $event)"
                  />
                  <span class="toggle-text">Bold text</span>
                </label>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- 5. Layout and Quiet Zone Section                             -->
      <!-- ════════════════════════════════════════════════════════════ -->
      <div class="custom-card-group">
        <div class="group-header">
          <span class="group-title">Layout and quiet zone</span>
        </div>

        <div class="two-col-grid">
          <!-- Rotation -->
          <div class="sub-field">
            <label class="sub-label">Rotation</label>
            <select
              class="ts-select"
              [ngModel]="options().rotation"
              (ngModelChange)="updateOption('rotation', $event)"
            >
              <option [ngValue]="0">0° (Horizontal)</option>
              <option [ngValue]="90">90° (Vertical CW)</option>
              <option [ngValue]="180">180° (Inverted)</option>
              <option [ngValue]="270">270° (Vertical CCW)</option>
            </select>
          </div>

          <!-- Border Frame -->
          <div class="sub-field">
            <label class="sub-label">Border frame</label>
            <select
              class="ts-select"
              [ngModel]="options().frame"
              (ngModelChange)="updateOption('frame', $event)"
            >
              <option value="none">None</option>
              <option value="thin">Thin border</option>
            </select>
          </div>
        </div>

        <!-- Quiet Zone Margin -->
        <div class="sub-field">
          <div class="form-label-row">
            <label class="sub-label">Quiet zone margin</label>
            <span class="range-val">{{ options().quietZone }} modules</span>
          </div>
          <input
            type="range"
            class="ts-range-slider"
            min="10"
            max="30"
            step="1"
            [ngModel]="options().quietZone"
            (ngModelChange)="updateOption('quietZone', $event)"
          />
        </div>
      </div>

      <!-- Reset Link -->
      <div class="reset-link-container">
        <button type="button" class="reset-defaults-link" (click)="resetDefaults()">
          <ts-icon name="rotate-ccw" [size]="14" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .customize-panel-body {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    @media (max-width: 639px) {
      .customize-panel-body {
        gap: 16px;
      }
    }

    .custom-card-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 14px 16px;
      border-radius: var(--shell-card-radius, 14px);
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .custom-card-group {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.08);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
    }

    .group-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .group-title {
      font-size: 13.5px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
    }

    :host-context([data-theme="light"]) .group-title {
      color: #0F172A;
    }

    .contrast-score {
      font-size: 11px;
      font-family: var(--ts-font-mono, monospace);
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 4px;
    }

    .contrast-score.is-safe {
      color: #10B981;
      background: rgba(16, 185, 129, 0.12);
    }

    .contrast-score.is-low {
      color: #EF4444;
      background: rgba(239, 68, 68, 0.12);
    }

    /* Pill Segmented Control */
    .pill-segmented-control {
      display: flex;
      gap: 4px;
      padding: 3px;
      border-radius: 10px;
      background: var(--bg-elevated, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .pill-segmented-control {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.08);
    }

    .seg-btn {
      flex: 1;
      padding: 6px 10px;
      min-height: 40px;
      border-radius: 7px;
      background: transparent;
      border: none;
      color: var(--text-muted, #94a3b8);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      touch-action: manipulation;
      transition: all var(--ts-dur-fast, 150ms) ease;
    }

    .seg-btn:hover:not(.active) {
      color: var(--text, #fcfcfc);
      background: var(--bg-surface-hover, rgba(255, 255, 255, 0.06));
    }

    :host-context([data-theme="light"]) .seg-btn:hover:not(.active) {
      color: #0F172A;
      background: #F1F5F9;
    }

    .seg-btn.active {
      background: var(--tool-accent, #2563EB) !important;
      color: #FFFFFF !important;
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(37, 99, 235, 0.25);
    }

    :host-context([data-theme="light"]) .seg-btn.active {
      background: #2563EB !important;
      color: #FFFFFF !important;
      box-shadow: 0 1px 3px rgba(37, 99, 235, 0.25);
    }

    .seg-btn:focus-visible {
      outline: 2px solid var(--tool-accent, #2563EB) !important;
      outline-offset: 2px !important;
    }

    /* Details / Summary Disclosure */
    .advanced-disclosure {
      border-top: 1px solid var(--border, rgba(255, 255, 255, 0.06));
      padding-top: 10px;
    }

    :host-context([data-theme="light"]) .advanced-disclosure {
      border-top-color: rgba(0, 0, 0, 0.06);
    }

    .disclosure-summary {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 500;
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
      user-select: none;
      list-style: none;
    }

    .disclosure-summary::-webkit-details-marker {
      display: none;
    }

    .disclosure-icon {
      color: var(--text-muted, #94a3b8);
    }

    .summary-chevron {
      margin-left: auto;
      transition: transform var(--ts-dur-fast, 150ms) ease;
    }

    details[open] .summary-chevron {
      transform: rotate(180deg);
    }

    .disclosure-body {
      padding-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .dimensions-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .sub-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .sub-label {
      font-size: 11.5px;
      font-weight: 500;
      color: var(--text-muted, #94a3b8);
    }

    .ts-select,
    .ts-num-input,
    .ts-text-input {
      width: 100%;
      box-sizing: border-box;
      padding: 8px 10px;
      border-radius: 8px;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      color: var(--text, #fcfcfc);
      font-size: 13px;
      outline: none;
    }

    :host-context([data-theme="light"]) .ts-select,
    :host-context([data-theme="light"]) .ts-num-input,
    :host-context([data-theme="light"]) .ts-text-input {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.12);
      color: #0F172A;
    }

    .ts-select:focus-visible,
    .ts-num-input:focus-visible,
    .ts-text-input:focus-visible {
      outline: 2px solid var(--tool-accent, #2563EB) !important;
      outline-offset: 2px !important;
      border-color: var(--tool-accent, #2563EB) !important;
    }

    .warning-banner {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 10px;
      border-radius: 6px;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.25);
      color: #F59E0B;
      font-size: 11.5px;
      line-height: 1.4;
    }

    .colors-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .color-picker-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .color-swatch-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 8px;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
    }

    :host-context([data-theme="light"]) .color-swatch-wrapper {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.12);
    }

    .color-swatch-wrapper.is-disabled {
      opacity: 0.5;
    }

    .native-color-picker {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      background: transparent;
      padding: 0;
    }

    .native-color-picker::-webkit-color-swatch-wrapper {
      padding: 0;
    }

    .native-color-picker::-webkit-color-swatch {
      border-radius: 4px;
      border: 1px solid rgba(0, 0, 0, 0.1);
    }

    .hex-text {
      font-family: var(--ts-font-mono, monospace);
      font-size: 12px;
      color: var(--text, #fcfcfc);
      text-transform: uppercase;
    }

    :host-context([data-theme="light"]) .hex-text {
      color: #0F172A;
    }

    .toggle-control-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      color: var(--text, #fcfcfc);
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .toggle-control-label {
      color: #0F172A;
    }

    .ts-checkbox {
      accent-color: var(--tool-accent, #3B82F6);
      width: 15px;
      height: 15px;
      cursor: pointer;
    }

    /* Switch toggle */
    .switch-toggle {
      position: relative;
      display: inline-block;
      width: 36px;
      height: 20px;
    }

    .switch-toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .switch-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(--bg-elevated, rgba(255, 255, 255, 0.12));
      transition: .2s;
      border-radius: 20px;
    }

    .switch-slider:before {
      position: absolute;
      content: "";
      height: 14px;
      width: 14px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .2s;
      border-radius: 50%;
    }

    input:checked + .switch-slider {
      background-color: var(--tool-accent, #3B82F6);
    }

    input:checked + .switch-slider:before {
      transform: translateX(16px);
    }

    .text-controls-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .checkboxes-col {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .pill-group {
      display: flex;
      gap: 6px;
    }

    .pill-btn {
      padding: 5px 10px;
      border-radius: 6px;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      color: var(--text-muted, #94a3b8);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) ease;
    }

    :host-context([data-theme="light"]) .pill-btn {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.08);
      color: #64748B;
    }

    .pill-btn.active {
      background: var(--tool-accent, #3B82F6);
      border-color: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
      font-weight: 600;
    }

    .two-col-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .form-label-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .range-val {
      font-size: 11px;
      font-family: var(--ts-font-mono, monospace);
      color: var(--text-muted, #94a3b8);
    }

    .ts-range-slider {
      width: 100%;
      accent-color: var(--tool-accent, #3B82F6);
      cursor: pointer;
    }

    .reset-link-container {
      display: flex;
      justify-content: center;
      padding: 6px;
    }

    .reset-defaults-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border: none;
      background: transparent;
      color: var(--text-muted, #94a3b8);
      font-size: 12px;
      cursor: pointer;
      transition: color var(--ts-dur-fast, 150ms) ease;
    }

    .reset-defaults-link:hover {
      color: var(--tool-accent, #3B82F6);
    }

    @media (max-width: 639px) {
      .dimensions-grid,
      .colors-row,
      .two-col-grid {
        grid-template-columns: 1fr !important;
        gap: 10px !important;
      }
      .seg-btn {
        min-height: 44px;
      }
      .ts-select,
      .ts-num-input,
      .ts-text-input {
        min-height: 44px;
      }
      .form-label-row {
        margin-bottom: 6px;
      }
      .color-swatch-wrapper {
        min-height: 44px;
      }
    }

    @media (max-width: 399px) {
      .customize-flow-body {
        gap: 12px;
      }
      .customize-section-card {
        padding: 12px;
      }
      .ts-select,
      .ts-num-input,
      .ts-text-input {
        font-size: 16px;
        min-height: 44px;
      }
      .pill-btn {
        min-height: 40px;
        font-size: 11.5px;
      }
    }
  `]
})
export class BarcodeCustomizePanelComponent {
  readonly options = model.required<BarcodeDesignOptions>();
  readonly format = input.required<BarcodeFormat>();

  readonly isEanOrUpc = computed(() => {
    const f = this.format();
    return f === 'ean13' || f === 'upca' || f === 'ean8' || f === 'isbn';
  });

  selectPreset(preset: 'small' | 'standard' | 'large'): void {
    const isEan = this.isEanOrUpc();
    let widthMm = 37.3;
    let heightMm = 25.9;

    if (preset === 'small') {
      widthMm = isEan ? 29.8 : 28; // 80% magnification
      heightMm = isEan ? 20.7 : 18;
    } else if (preset === 'standard') {
      widthMm = isEan ? 37.3 : 36; // 100% magnification
      heightMm = isEan ? 25.9 : 24;
    } else if (preset === 'large') {
      widthMm = isEan ? 55.9 : 50; // 150% magnification
      heightMm = isEan ? 38.9 : 32;
    }

    this.options.update(opts => ({
      ...opts,
      sizePreset: preset,
      widthMm,
      heightMm
    }));
  }

  updateOption<K extends keyof BarcodeDesignOptions>(key: K, value: BarcodeDesignOptions[K]): void {
    this.options.update(opts => ({
      ...opts,
      [key]: value
    }));
  }

  resetDefaults(): void {
    this.options.set({ ...DEFAULT_DESIGN_OPTIONS });
  }

  readonly contrastRatio = computed(() => {
    const bar = this.options().barColor || '#000000';
    const bg = this.options().transparentBg ? '#FFFFFF' : (this.options().bgColor || '#FFFFFF');
    return this.calculateContrastRatio(bar, bg);
  });

  readonly contrastWarning = computed<string | null>(() => {
    const bar = this.options().barColor || '#000000';
    const bg = this.options().transparentBg ? '#FFFFFF' : (this.options().bgColor || '#FFFFFF');
    const lumBar = this.getLuminance(bar);
    const lumBg = this.getLuminance(bg);

    if (lumBar > lumBg) {
      return 'Light bars on a dark background cannot be read by optical scanners.';
    }

    if (this.contrastRatio() < 4.5) {
      return 'Contrast ratio is below 4.5:1. Optical scanners require dark bars on a light background.';
    }

    return null;
  });

  readonly isBelowMinimumSize = computed(() => {
    const w = this.options().unit === 'inch' ? this.options().widthMm * 25.4 : this.options().widthMm;
    return this.isEanOrUpc() && w < 29.8;
  });

  private getLuminance(hex: string): number {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;

    const sR = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    const sG = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    const sB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

    return 0.2126 * sR + 0.7152 * sG + 0.0722 * sB;
  }

  private calculateContrastRatio(color1: string, color2: string): number {
    const lum1 = this.getLuminance(color1);
    const lum2 = this.getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  }
}

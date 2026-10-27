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
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ColorValidatorService } from '../../services/color-validator.service';
import { QrGradientOptions, DEFAULT_GRADIENT_OPTIONS } from '../../models/qr-generator.models';
import { TsIconComponent } from '@acklet/tool-shell';

export interface PremiumPalette {
  id: string;
  name: string;
  fg: string;
  bg: string;
  category: 'classic' | 'dark-premium';
  contrastRatio: number;
  hasLowContrast: boolean;
  safeThumbnail?: SafeHtml;
  fgStart?: string;
  fgEnd?: string;
}

export interface ColorPresetPair {
  id: string;
  name: string;
  fg: string;
  bg: string;
  safeThumbnail?: SafeHtml;
}

export interface GradientPreset {
  id: string;
  name: string;
  type: 'linear' | 'radial';
  rotation: number;
  color1: string;
  color2: string;
  bg: string;
  safeThumbnail?: SafeHtml;
}

@Component({
  selector: 'app-color-customizer',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="color-customizer-root">
      <!-- Section Header with Swap Button -->
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

      <!-- Solid Foreground & Background Color Targets -->
      <div class="color-targets-grid">
        <!-- Target 1: Foreground Modules -->
        <div class="color-target-card">
          <div class="target-card-header">
            <span class="target-title">Foreground Modules</span>
          </div>
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

        <!-- Target 2: Background Canvas -->
        <div class="color-target-card">
          <div class="target-card-header">
            <span class="target-title">Background Canvas</span>
          </div>
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

      <!-- Quick Color Palette Presets with Live Dummy QR Previews -->
      <div class="color-section-group">
        <!-- Group 1: Classic and Light -->
        <div class="palette-category-block">
          <div class="section-sub-header">
            <span class="presets-caption">Classic and Light ({{ classicPalettes.length }})</span>
          </div>
          <div class="palettes-grid" role="region" aria-label="Classic and Light color palette presets">
            @for (palette of classicPalettes; track palette.id) {
              <button
                type="button"
                class="palette-card"
                [class.active]="isPaletteActive(palette)"
                [class.disabled]="palette.hasLowContrast"
                [disabled]="palette.hasLowContrast"
                (click)="applyPalette(palette)"
                [title]="palette.name + ' (' + palette.fg + ' on ' + palette.bg + ')'"
                [attr.aria-label]="palette.name + ' palette: ' + palette.fg + ' on ' + palette.bg"
              >
                <div class="palette-preview-wrap" [innerHTML]="palette.safeThumbnail"></div>
                <span class="palette-title">{{ palette.name }}</span>
                @if (isPaletteActive(palette)) {
                  <div class="palette-check-badge" aria-label="Selected">
                    <ts-icon name="check" class="check-pip-icon" />
                  </div>
                }
              </button>
            }
          </div>
        </div>

        <!-- Group 2: Dark premium -->
        <div class="palette-category-block">
          <div class="section-sub-header">
            <div class="category-title-wrap">
              <span class="presets-caption">Dark premium</span>
              <span class="dark-tag-pill">Dark premium</span>
            </div>
          </div>
          <div class="palettes-grid" role="region" aria-label="Dark premium color palette presets">
            @for (palette of darkPremiumPalettes; track palette.id) {
              <button
                type="button"
                class="palette-card"
                [class.active]="isPaletteActive(palette)"
                [class.disabled]="palette.hasLowContrast"
                [disabled]="palette.hasLowContrast"
                (click)="applyPalette(palette)"
                [title]="palette.name + ' (' + palette.fg + ' on ' + palette.bg + ')'"
                [attr.aria-label]="palette.name + ' palette: ' + palette.fg + ' on ' + palette.bg"
              >
                <div class="palette-preview-wrap" [innerHTML]="palette.safeThumbnail"></div>
                <span class="palette-title">{{ palette.name }}</span>
                @if (isPaletteActive(palette)) {
                  <div class="palette-check-badge" aria-label="Selected">
                    <ts-icon name="check" class="check-pip-icon" />
                  </div>
                }
              </button>
            }
          </div>
        </div>
      </div>

      <!-- Inverted Code Info Note for Dark Premium -->
      @if (isDarkPremiumActive()) {
        <div class="inverted-info-row slide-fade-up" role="note">
          <ts-icon name="info" class="info-icon" />
          <span class="info-text">Inverted code: works on most modern phones; test before printing.</span>
        </div>
      }

      <!-- Clean Scanner Reliability Indicator -->
      @if (contrast().hasLowContrast) {
        <div class="warning-alert-row slide-fade-up" role="alert">
          <ts-icon name="alert-triangle" class="alert-icon" />
          <span class="warning-text">
            Low scanner contrast ({{ contrast().ratio.toFixed(1) }}:1): Ensure modules are clearly distinct from the background for faster camera scanning.
          </span>
        </div>
      } @else {
        <div class="contrast-ok-row slide-fade-up">
          <ts-icon name="check-circle" class="check-icon" />
          <span class="ok-text">Optimal Contrast ({{ contrast().ratio.toFixed(1) }}:1): High scan reliability across all mobile cameras</span>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      flex: 1 0 auto;
      min-height: min-content;
      box-sizing: border-box;
    }

    .color-customizer-root {
      display: flex;
      flex-direction: column;
      gap: 14px;
      width: 100%;
      box-sizing: border-box;
      padding-bottom: 8px;
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

    .picker-input-row {
      display: flex;
      align-items: center;
      gap: 6px;
      background: var(--surface-3, rgba(0, 0, 0, 0.25));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      border-radius: 8px;
      padding: 3px 6px 3px 3px;
    }

    :host-context([data-theme="light"]) .picker-input-row,
    [data-theme="light"] .picker-input-row {
      background: #FFFFFF;
      border-color: #CBD5E1;
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

    :host-context([data-theme="light"]) .hex-text-input,
    [data-theme="light"] .hex-text-input {
      color: #0F172A;
    }

    /* Color Palettes Section */
    .color-section-group {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .palette-category-block {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .category-title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .presets-caption {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-2, rgba(255, 255, 255, 0.75));
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    :host-context([data-theme="light"]) .presets-caption,
    [data-theme="light"] .presets-caption {
      color: #475569;
    }

    .dark-tag-pill {
      font-size: 10px;
      font-weight: 600;
      padding: 1px 7px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-2, rgba(255, 255, 255, 0.8));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
      text-transform: none;
      letter-spacing: normal;
    }

    :host-context([data-theme="light"]) .dark-tag-pill,
    [data-theme="light"] .dark-tag-pill {
      background: #E2E8F0;
      color: #1E293B;
      border-color: #CBD5E1;
    }

    .palettes-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 8px;
    }

    @media (max-width: 900px) {
      .palettes-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    @media (max-width: 520px) {
      .palettes-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .palette-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 9px 5px;
      border-radius: 9px;
      background: var(--surface-2, rgba(255, 255, 255, 0.03));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      cursor: pointer;
      transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background-color 0.18s ease;
      position: relative;
      text-align: center;
      min-width: 0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    .palette-card:hover:not(:disabled) {
      background: var(--surface-3, rgba(255, 255, 255, 0.05));
      border-color: var(--border, rgba(255, 255, 255, 0.16));
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
    }

    .palette-card.disabled,
    .palette-card:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      transform: none !important;
      box-shadow: none !important;
    }

    :host-context([data-theme="light"]) .palette-card,
    [data-theme="light"] .palette-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    :host-context([data-theme="light"]) .palette-card:hover:not(:disabled),
    [data-theme="light"] .palette-card:hover:not(:disabled) {
      background: #F8FAFC;
      border-color: #CBD5E1;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.06);
    }

    .palette-card.active {
      background: var(--surface-2, rgba(255, 255, 255, 0.08));
      border-color: var(--tool-accent, #3b82f6);
      box-shadow: 0 0 0 1.5px var(--tool-accent, #3b82f6), 0 2px 6px rgba(0, 0, 0, 0.15);
    }

    :host-context([data-theme="light"]) .palette-card.active,
    [data-theme="light"] .palette-card.active {
      background: #F0F9FF;
      border-color: #0284C7;
      box-shadow: 0 0 0 1.5px #0284C7, 0 2px 6px rgba(2, 132, 199, 0.1);
    }

    .palette-preview-wrap {
      width: 44px;
      height: 44px;
      border-radius: 6px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.1);
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .palette-preview-wrap,
    [data-theme="light"] .palette-preview-wrap {
      border-color: rgba(0, 0, 0, 0.1);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    .palette-title {
      font-size: 11px;
      font-weight: 550;
      color: var(--text-2, rgba(255, 255, 255, 0.85));
      line-height: 1.25;
      text-align: center;
      white-space: normal;
      word-break: normal;
      overflow: visible;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      min-height: 28px;
      max-width: 100%;
    }

    :host-context([data-theme="light"]) .palette-title,
    [data-theme="light"] .palette-title {
      color: #334155;
    }

    .palette-card.active .palette-title {
      color: var(--accent-strong, #60a5fa);
      font-weight: 650;
    }

    :host-context([data-theme="light"]) .palette-card.active .palette-title {
      color: #0284C7;
    }

    .palette-check-badge {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 15px;
      height: 15px;
      border-radius: 50%;
      background: var(--tool-accent, #3b82f6);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
    }

    :host-context([data-theme="light"]) .palette-check-badge,
    [data-theme="light"] .palette-check-badge {
      background: #0284C7;
    }

    .check-pip-icon {
      width: 9px;
      height: 9px;
    }

    /* Inverted Info Row for Dark Premium */
    .inverted-info-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 8px;
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.25);
      font-size: 11.5px;
      color: #60a5fa;
      font-weight: 500;
    }

    :host-context([data-theme="light"]) .inverted-info-row,
    [data-theme="light"] .inverted-info-row {
      background: #EFF6FF;
      border-color: #BFDBFE;
      color: #1D4ED8;
    }

    .info-icon {
      width: 15px;
      height: 15px;
      color: currentColor;
      flex-shrink: 0;
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
  private readonly sanitizer = inject(DomSanitizer);
  private readonly colorValidator = inject(ColorValidatorService);

  readonly foregroundColor = input<string>('#000000');
  readonly backgroundColor = input<string>('#FFFFFF');
  readonly foregroundGradient = input<QrGradientOptions>(DEFAULT_GRADIENT_OPTIONS);
  readonly backgroundGradient = input<QrGradientOptions>(DEFAULT_GRADIENT_OPTIONS);

  readonly foregroundColorChange = output<string>();
  readonly backgroundColorChange = output<string>();
  readonly foregroundGradientChange = output<QrGradientOptions>();
  readonly backgroundGradientChange = output<QrGradientOptions>();

  private generateMiniQrSvg(fg: string, bg: string): SafeHtml {
    const raw = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 25" width="100%" height="100%"><rect width="25" height="25" rx="3.5" fill="${bg}"/><g fill="${fg}"><path fill-rule="evenodd" d="M2,2 h7 v7 h-7 z M3,3 v5 h5 v-5 z M4,4 h3 v3 h-3 z"/><path fill-rule="evenodd" d="M16,2 h7 v7 h-7 z M17,3 v5 h5 v-5 z M18,4 h3 v3 h-3 z"/><path fill-rule="evenodd" d="M2,16 h7 v7 h-7 z M3,17 v5 h5 v-5 z M4,18 h3 v3 h-3 z"/><rect x="10" y="5" width="1" height="1"/><rect x="12" y="5" width="1" height="1"/><rect x="14" y="5" width="1" height="1"/><rect x="5" y="10" width="1" height="1"/><rect x="5" y="12" width="1" height="1"/><rect x="5" y="14" width="1" height="1"/><rect x="10" y="2" width="1.2" height="1.2" rx="0.2"/><rect x="13" y="3" width="1.2" height="1.2" rx="0.2"/><rect x="10" y="8" width="1.2" height="1.2" rx="0.2"/><rect x="12" y="10" width="1.2" height="1.2" rx="0.2"/><rect x="14" y="8" width="1.2" height="1.2" rx="0.2"/><rect x="10" y="13" width="1.2" height="1.2" rx="0.2"/><rect x="14" y="12" width="1.2" height="1.2" rx="0.2"/><rect x="11" y="16" width="1.2" height="1.2" rx="0.2"/><rect x="13" y="18" width="1.2" height="1.2" rx="0.2"/><rect x="15" y="16" width="1.2" height="1.2" rx="0.2"/><rect x="18" y="10" width="1.2" height="1.2" rx="0.2"/><rect x="20" y="13" width="1.2" height="1.2" rx="0.2"/><rect x="17" y="18" width="1.2" height="1.2" rx="0.2"/><rect x="21" y="17" width="1.2" height="1.2" rx="0.2"/><rect x="19" y="21" width="1.2" height="1.2" rx="0.2"/><rect x="10" y="21" width="1.2" height="1.2" rx="0.2"/><rect x="2" y="11" width="1.2" height="1.2" rx="0.2"/></g></svg>`;

    return this.sanitizer.bypassSecurityTrustHtml(raw);
  }

  readonly rawPalettes = [
    { id: 'ivory-ink', name: 'Ivory Ink', fg: '#111827', bg: '#FAF8F5', category: 'classic' as const, fgStart: '#111827', fgEnd: '#1F2937' },
    { id: 'midnight-navy', name: 'Midnight Navy', fg: '#0B1F3A', bg: '#F7F9FC', category: 'classic' as const, fgStart: '#0B1F3A', fgEnd: '#1E3A5F' },
    { id: 'champagne-gold', name: 'Champagne Gold', fg: '#5C4A1E', bg: '#FBF8F1', category: 'classic' as const, fgStart: '#5C4A1E', fgEnd: '#7A5E22' },
    { id: 'forest-emerald', name: 'Forest Emerald', fg: '#064E3B', bg: '#F4F8F6', category: 'classic' as const, fgStart: '#064E3B', fgEnd: '#0F766E' },
    { id: 'burgundy-wine', name: 'Burgundy Wine', fg: '#4A0E1F', bg: '#FBF6F6', category: 'classic' as const, fgStart: '#4A0E1F', fgEnd: '#7F1D3A' },
    { id: 'graphite-slate', name: 'Graphite Slate', fg: '#1F2328', bg: '#F5F6F8', category: 'classic' as const, fgStart: '#1F2328', fgEnd: '#475467' },
    { id: 'deep-indigo', name: 'Deep Indigo', fg: '#1E1B4B', bg: '#F8F8FD', category: 'classic' as const, fgStart: '#1E1B4B', fgEnd: '#3730A3' },
    { id: 'rosewood', name: 'Rosewood', fg: '#5B2A33', bg: '#FAF5F4', category: 'classic' as const, fgStart: '#5B2A33', fgEnd: '#8C4A55' },
    { id: 'ocean-teal', name: 'Ocean Teal', fg: '#0C4A6E', bg: '#F3F9FB', category: 'classic' as const, fgStart: '#0C4A6E', fgEnd: '#0E7490' },
    { id: 'bronze-copper', name: 'Bronze Copper', fg: '#4A2C17', bg: '#FAF6F1', category: 'classic' as const, fgStart: '#4A2C17', fgEnd: '#8A4B22' },
    { id: 'obsidian-gold', name: 'Obsidian Gold', fg: '#E7C873', bg: '#111214', category: 'dark-premium' as const, fgStart: '#E7C873', fgEnd: '#C9A24B' },
    { id: 'charcoal-pearl', name: 'Charcoal Pearl', fg: '#F3F4F6', bg: '#1A1C20', category: 'dark-premium' as const, fgStart: '#F3F4F6', fgEnd: '#D1D5DB' }
  ];

  readonly premiumPalettes: PremiumPalette[] = this.rawPalettes.map(p => {
    const contrastRatio = this.colorValidator.contrastRatio(p.fg, p.bg);
    return {
      ...p,
      contrastRatio,
      hasLowContrast: contrastRatio < 4.5,
      safeThumbnail: this.generateMiniQrSvg(p.fg, p.bg)
    };
  });

  readonly classicPalettes: PremiumPalette[] = this.premiumPalettes.filter(p => p.category === 'classic');
  readonly darkPremiumPalettes: PremiumPalette[] = this.premiumPalettes.filter(p => p.category === 'dark-premium');

  // Backwards compatibility aliases
  readonly solidPalettes: any[] = this.premiumPalettes;
  readonly presets: any[] = this.premiumPalettes;
  readonly gradPalettes: any[] = [];

  readonly contrast = computed(() => {
    return this.colorValidator.checkContrast(this.foregroundColor(), this.backgroundColor());
  });

  readonly isDarkPremiumActive = computed(() => {
    return this.darkPremiumPalettes.some(p => this.isPaletteActive(p));
  });

  isPaletteActive(palette: PremiumPalette): boolean {
    return (
      !this.foregroundGradient().enabled &&
      !this.backgroundGradient().enabled &&
      this.foregroundColor().toLowerCase() === palette.fg.toLowerCase() &&
      this.backgroundColor().toLowerCase() === palette.bg.toLowerCase()
    );
  }

  isSolidPresetActive(preset: any): boolean {
    return this.isPaletteActive(preset);
  }

  isGradientPresetActive(gPreset: any): boolean {
    return false;
  }

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

  applyPalette(palette: PremiumPalette): void {
    if (palette.hasLowContrast) {
      return;
    }

    // Ensure any gradient mode is cleanly turned off
    this.foregroundGradientChange.emit({
      ...DEFAULT_GRADIENT_OPTIONS,
      enabled: false
    });
    this.backgroundGradientChange.emit({
      ...DEFAULT_GRADIENT_OPTIONS,
      enabled: false
    });

    this.foregroundColorChange.emit(palette.fg);
    this.backgroundColorChange.emit(palette.bg);
  }

  applyPreset(preset: any): void {
    if ('fg' in preset) {
      this.applyPalette(preset);
    } else if ('fgStart' in preset) {
      this.applyPalette({
        id: preset.id,
        name: preset.name,
        fg: preset.fgStart,
        bg: preset.bg,
        category: preset.category || 'classic',
        contrastRatio: 21,
        hasLowContrast: false
      });
    }
  }

  applyGradientTheme(gPreset: any): void {
    // No-op for gradient theme since gradients have been removed
  }
}

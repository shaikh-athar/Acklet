// apps/tool-image-compressor/src/components/settings-panel/settings-panel.component.ts
import { Component, ChangeDetectionStrategy, input, output, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TsIconComponent } from '@acklet/tool-shell';
import {
  CompressionSettings,
  ImageItem,
  OutputFormatOption,
  CompressionMode,
  ResizeMode,
  MetadataPolicy
} from '../../models/compressor.models';

@Component({
  selector: 'app-settings-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="settings-panel-container" [class.is-editing-item]="!!editingItem()">
      <!-- Panel Header -->
      <div class="panel-header">
        <div class="header-titles">
          @if (editingItem(); as item) {
            <div class="custom-item-badge">
              <ts-icon name="sliders-horizontal" [size]="12" />
              <span>Individual Image Settings</span>
            </div>
            <h3 class="panel-title" [title]="item.originalName">{{ item.originalName }}</h3>
          } @else {
            <h3 class="panel-title">Compression Settings</h3>
            <span class="panel-subtitle">Applies to all images without overrides</span>
          }
        </div>

        @if (editingItem()) {
          <button
            type="button"
            class="close-btn"
            (click)="closeIndividualSettings.emit()"
            title="Done editing individual settings"
            aria-label="Close individual settings"
          >
            <ts-icon name="x" [size]="16" />
          </button>
        }
      </div>

      <!-- Individual Item Override Banner -->
      @if (editingItem(); as item) {
        <div class="override-banner">
          <div class="banner-text">
            <span>Customizing settings for this image only.</span>
          </div>
          @if (item.individualSettings.hasCustomSettings) {
            <button
              type="button"
              class="reset-btn"
              (click)="resetIndividualSettings.emit(item.id)"
            >
              <ts-icon name="rotate-ccw" [size]="12" />
              <span>Reset to Global</span>
            </button>
          }
        </div>
      }

      <!-- Panel Scrollable Body -->
      <div class="panel-body">

        <!-- 1. Compression Mode -->
        <div class="setting-section">
          <label class="section-label">Compression Mode</label>
          <div class="mode-toggle-group">
            <button
              type="button"
              class="mode-btn"
              [class.is-active]="currentSettings().mode === 'smart'"
              (click)="onModeChange('smart')"
            >
              <ts-icon name="sparkles" [size]="14" />
              <span>Smart</span>
            </button>
            <button
              type="button"
              class="mode-btn"
              [class.is-active]="currentSettings().mode === 'custom'"
              (click)="onModeChange('custom')"
            >
              <ts-icon name="sliders-horizontal" [size]="14" />
              <span>Custom</span>
            </button>
          </div>
          <span class="field-hint">
            {{ currentSettings().mode === 'smart' ? 'Balances file size reduction with visual perceptual quality.' : 'Manually adjust quality, dimensions, and output format.' }}
          </span>
        </div>

        <!-- 2. Quality Slider -->
        <div class="setting-section">
          <div class="label-with-value">
            <label class="section-label" for="quality-range">Quality</label>
            <span class="value-chip font-mono">{{ currentSettings().quality }}%</span>
          </div>

          <div class="slider-wrapper">
            <input
              id="quality-range"
              type="range"
              min="1"
              max="100"
              [value]="currentSettings().quality"
              (input)="onQualitySliderInput($event)"
              class="quality-slider"
              aria-label="Image Quality Slider"
            />
          </div>

          <!-- Quality Quick Presets -->
          <div class="presets-row">
            @for (p of qualityPresets; track p.value) {
              <button
                type="button"
                class="preset-pill"
                [class.is-active]="currentSettings().quality === p.value"
                (click)="onQualityPreset(p.value)"
              >
                {{ p.label }} ({{ p.value }}%)
              </button>
            }
          </div>
        </div>

        <!-- 3. Output Format -->
        <div class="setting-section">
          <label class="section-label" for="output-format-select">Output Format</label>
          <select
            id="output-format-select"
            class="format-select"
            [value]="currentSettings().outputFormat"
            (change)="onOutputFormatChange($event)"
          >
            <option value="original">Original Format (Preserve)</option>
            <option value="jpeg">JPEG (.jpg)</option>
            <option value="png">PNG (.png)</option>
            <option value="webp">WebP (.webp)</option>
            <option value="avif">AVIF (.avif)</option>
          </select>
          <span class="field-hint">
            Preserves original format by default. Output reformatting executes in Phase 2.
          </span>
        </div>

        <!-- 4. Resizing -->
        <div class="setting-section resize-section">
          <div class="toggle-header">
            <label class="section-label" for="resize-toggle">Resize Dimensions</label>
            <label class="switch-control">
              <input
                id="resize-toggle"
                type="checkbox"
                [checked]="currentSettings().resize.enabled"
                (change)="onResizeToggle($event)"
              />
              <span class="switch-slider"></span>
            </label>
          </div>

          @if (currentSettings().resize.enabled) {
            <div class="resize-options-box">
              <!-- Mode Selection: Dimensions vs Percentage -->
              <div class="resize-mode-row">
                <button
                  type="button"
                  class="sub-mode-btn"
                  [class.is-active]="currentSettings().resize.mode === 'dimensions'"
                  (click)="onResizeModeChange('dimensions')"
                >
                  Dimensions (px)
                </button>
                <button
                  type="button"
                  class="sub-mode-btn"
                  [class.is-active]="currentSettings().resize.mode === 'percentage'"
                  (click)="onResizeModeChange('percentage')"
                >
                  Percentage (%)
                </button>
              </div>

              @if (currentSettings().resize.mode === 'dimensions') {
                <div class="dimensions-inputs-row">
                  <div class="dim-field">
                    <label class="dim-label" for="dim-w">Width</label>
                    <input
                      id="dim-w"
                      type="number"
                      min="1"
                      max="16384"
                      class="dim-input font-mono"
                      [value]="currentSettings().resize.width || ''"
                      placeholder="Auto"
                      (input)="onWidthInput($event)"
                    />
                  </div>

                  <!-- Lock Aspect Ratio Button -->
                  <button
                    type="button"
                    class="aspect-lock-btn"
                    [class.is-locked]="currentSettings().resize.maintainAspectRatio"
                    (click)="toggleAspectLock()"
                    [title]="currentSettings().resize.maintainAspectRatio ? 'Aspect ratio locked' : 'Aspect ratio unlocked'"
                    aria-label="Toggle aspect ratio lock"
                  >
                    <ts-icon [name]="currentSettings().resize.maintainAspectRatio ? 'lock' : 'unlock'" [size]="14" />
                  </button>

                  <div class="dim-field">
                    <label class="dim-label" for="dim-h">Height</label>
                    <input
                      id="dim-h"
                      type="number"
                      min="1"
                      max="16384"
                      class="dim-input font-mono"
                      [value]="currentSettings().resize.height || ''"
                      placeholder="Auto"
                      (input)="onHeightInput($event)"
                    />
                  </div>
                </div>
              } @else {
                <!-- Percentage Pills -->
                <div class="percentage-pills-row">
                  @for (pct of percentageOptions; track pct) {
                    <button
                      type="button"
                      class="pct-btn"
                      [class.is-active]="currentSettings().resize.percentage === pct"
                      (click)="onPercentageSelect(pct)"
                    >
                      {{ pct }}%
                    </button>
                  }
                </div>
              }
            </div>
          }
        </div>

        <!-- 5. Metadata Policy -->
        <div class="setting-section">
          <label class="section-label">Metadata Policy</label>
          <div class="metadata-toggle-group">
            <button
              type="button"
              class="meta-btn"
              [class.is-active]="currentSettings().metadataPolicy === 'preserve'"
              (click)="onMetadataPolicyChange('preserve')"
            >
              <ts-icon name="shield-check" [size]="14" />
              <span>Preserve EXIF</span>
            </button>
            <button
              type="button"
              class="meta-btn"
              [class.is-active]="currentSettings().metadataPolicy === 'remove'"
              (click)="onMetadataPolicyChange('remove')"
            >
              <ts-icon name="trash-2" [size]="14" />
              <span>Strip Metadata</span>
            </button>
          </div>
          <span class="field-hint">
            {{ currentSettings().metadataPolicy === 'preserve' ? 'Retains camera EXIF, orientation, and color profiles.' : 'Removes camera data and GPS coordinates for privacy.' }}
          </span>
        </div>

      </div>

      <!-- Panel Footer Actions for Individual Edit Mode -->
      @if (editingItem()) {
        <div class="panel-footer">
          <button
            type="button"
            class="done-editing-btn"
            (click)="closeIndividualSettings.emit()"
          >
            <span>Done</span>
          </button>
        </div>
      }
    </aside>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
    }

    .settings-panel-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--ts-surface-card, #1A1C23);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      border-radius: var(--ts-radius-inner, 16px);
      overflow: hidden;
    }

    .settings-panel-container.is-editing-item {
      border-color: var(--accent, #3B82F6);
      box-shadow: 0 0 0 1px var(--accent, #3B82F6);
    }

    /* Header */
    .panel-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    .header-titles {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .custom-item-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 600;
      color: var(--accent, #60A5FA);
      margin-bottom: 2px;
    }

    .panel-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text, #F9FAFB);
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .panel-subtitle {
      font-size: 11px;
      color: var(--text-3, #9CA3AF);
    }

    .close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: var(--ts-radius-sm, 8px);
      background: transparent;
      border: none;
      color: var(--text-2, #9CA3AF);
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) var(--ts-ease);
      flex-shrink: 0;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #FFFFFF;
    }

    /* Override Banner */
    .override-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 14px;
      background: rgba(59, 130, 246, 0.08);
      border-bottom: 1px solid rgba(59, 130, 246, 0.2);
      font-size: 11px;
      color: var(--text-2, #D1D5DB);
    }

    .reset-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 4px;
      background: var(--ts-surface-base, #111318);
      border: 1px solid var(--border-default, #374151);
      color: var(--accent, #60A5FA);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .reset-btn:hover {
      background: rgba(59, 130, 246, 0.15);
      border-color: var(--accent, #3B82F6);
    }

    /* Body */
    .panel-body {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      overflow-y: auto;
      flex: 1 1 0%;
    }

    .setting-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .section-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-2, #D1D5DB);
      letter-spacing: 0.01em;
    }

    .label-with-value {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .value-chip {
      font-size: 12px;
      font-weight: 700;
      color: var(--accent, #60A5FA);
      background: rgba(59, 130, 246, 0.12);
      padding: 2px 8px;
      border-radius: 6px;
      border: 1px solid rgba(59, 130, 246, 0.2);
    }

    .field-hint {
      font-size: 11px;
      line-height: 1.4;
      color: var(--text-3, #9CA3AF);
    }

    /* Mode Toggle */
    .mode-toggle-group,
    .metadata-toggle-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      background: var(--ts-surface-base, #111318);
      padding: 3px;
      border-radius: var(--ts-radius-md, 12px);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    .mode-btn,
    .meta-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 34px;
      border-radius: var(--ts-radius-sm, 8px);
      border: none;
      background: transparent;
      color: var(--text-2, #9CA3AF);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .mode-btn:hover,
    .meta-btn:hover {
      color: var(--text, #F9FAFB);
    }

    .mode-btn.is-active,
    .meta-btn.is-active {
      background: var(--ts-surface-card, #1E2028);
      color: var(--text, #F9FAFB);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    }

    /* Slider */
    .slider-wrapper {
      padding: 4px 0;
    }

    .quality-slider {
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: var(--ts-surface-base, #111318);
      outline: none;
      cursor: pointer;
      accent-color: var(--accent, #2563EB);
    }

    .presets-row {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .preset-pill {
      font-size: 11px;
      font-weight: 500;
      padding: 3px 8px;
      border-radius: 6px;
      background: var(--ts-surface-base, #111318);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      color: var(--text-2, #9CA3AF);
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .preset-pill:hover {
      color: var(--text, #FFFFFF);
      border-color: var(--border-default, rgba(255, 255, 255, 0.16));
    }

    .preset-pill.is-active {
      background: rgba(59, 130, 246, 0.15);
      border-color: var(--accent, #3B82F6);
      color: var(--accent, #60A5FA);
      font-weight: 600;
    }

    /* Format Select */
    .format-select {
      width: 100%;
      height: 38px;
      border-radius: var(--ts-radius-md, 12px);
      background: var(--ts-surface-base, #111318);
      border: 1px solid var(--border-default, #374151);
      color: var(--text, #F9FAFB);
      padding: 0 12px;
      font-size: 13px;
      outline: none;
      cursor: pointer;
      transition: border-color var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .format-select:focus {
      border-color: var(--accent, #3B82F6);
    }

    /* Resizing & Switch Control */
    .toggle-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .switch-control {
      position: relative;
      display: inline-block;
      width: 38px;
      height: 20px;
    }

    .switch-control input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .switch-slider {
      position: absolute;
      cursor: pointer;
      inset: 0;
      background-color: var(--border-default, #374151);
      transition: 0.2s;
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
      transition: 0.2s;
      border-radius: 50%;
    }

    .switch-control input:checked + .switch-slider {
      background-color: var(--accent, #2563EB);
    }

    .switch-control input:checked + .switch-slider:before {
      transform: translateX(18px);
    }

    .resize-options-box {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 12px;
      border-radius: var(--ts-radius-md, 12px);
      background: var(--ts-surface-base, #111318);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      margin-top: 4px;
    }

    .resize-mode-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
    }

    .sub-mode-btn {
      height: 28px;
      font-size: 11px;
      font-weight: 600;
      border-radius: 6px;
      background: transparent;
      border: none;
      color: var(--text-2, #9CA3AF);
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .sub-mode-btn.is-active {
      background: var(--ts-surface-card, #1E2028);
      color: var(--text, #F9FAFB);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    .dimensions-inputs-row {
      display: flex;
      align-items: flex-end;
      gap: 8px;
    }

    .dim-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }

    .dim-label {
      font-size: 10px;
      font-weight: 600;
      color: var(--text-3, #9CA3AF);
    }

    .dim-input {
      width: 100%;
      height: 32px;
      border-radius: 6px;
      background: var(--ts-surface-card, #1E2028);
      border: 1px solid var(--border-default, #374151);
      color: var(--text, #F9FAFB);
      padding: 0 8px;
      font-size: 12px;
      outline: none;
    }

    .dim-input:focus {
      border-color: var(--accent, #3B82F6);
    }

    .aspect-lock-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      background: var(--ts-surface-card, #1E2028);
      border: 1px solid var(--border-default, #374151);
      color: var(--text-2, #9CA3AF);
      cursor: pointer;
      margin-bottom: 1px;
      transition: all var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .aspect-lock-btn.is-locked {
      color: var(--accent, #60A5FA);
      border-color: var(--accent, #3B82F6);
      background: rgba(59, 130, 246, 0.1);
    }

    .percentage-pills-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 4px;
    }

    .pct-btn {
      height: 30px;
      border-radius: 6px;
      background: var(--ts-surface-card, #1E2028);
      border: 1px solid var(--border-default, #374151);
      color: var(--text-2, #9CA3AF);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .pct-btn:hover {
      color: #FFFFFF;
      border-color: var(--accent, #3B82F6);
    }

    .pct-btn.is-active {
      background: var(--accent, #2563EB);
      color: #FFFFFF;
      border-color: var(--accent, #2563EB);
    }

    /* Panel Footer */
    .panel-footer {
      padding: 12px 16px;
      border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    .done-editing-btn {
      width: 100%;
      height: 38px;
      border-radius: var(--ts-radius-md, 12px);
      background: var(--accent, #2563EB);
      color: #FFFFFF;
      font-size: 13px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: background var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .done-editing-btn:hover {
      background: var(--accent-hover, #1D4ED8);
    }
  `]
})
export class SettingsPanelComponent {
  readonly globalSettings = input.required<CompressionSettings>();
  readonly editingItem = input<ImageItem | null>(null);

  readonly globalSettingsChanged = output<Partial<CompressionSettings>>();
  readonly individualSettingsChanged = output<{ id: string; settings: Partial<CompressionSettings> }>();
  readonly resetIndividualSettings = output<string>();
  readonly closeIndividualSettings = output<void>();

  readonly qualityPresets = [
    { label: 'High', value: 90 },
    { label: 'Balanced', value: 80 },
    { label: 'Medium', value: 70 },
    { label: 'Small', value: 50 }
  ];

  readonly percentageOptions = [25, 50, 75, 100];

  readonly currentSettings = computed<CompressionSettings>(() => {
    const item = this.editingItem();
    if (item) {
      return item.effectiveSettings;
    }
    return this.globalSettings();
  });

  private emitChange(partial: Partial<CompressionSettings>): void {
    const item = this.editingItem();
    if (item) {
      this.individualSettingsChanged.emit({
        id: item.id,
        settings: partial
      });
    } else {
      this.globalSettingsChanged.emit(partial);
    }
  }

  onModeChange(mode: CompressionMode): void {
    this.emitChange({ mode });
  }

  onQualitySliderInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const quality = Math.max(1, Math.min(100, Number(target.value) || 80));
    this.emitChange({ quality });
  }

  onQualityPreset(quality: number): void {
    this.emitChange({ quality });
  }

  onOutputFormatChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const outputFormat = target.value as OutputFormatOption;
    this.emitChange({ outputFormat });
  }

  onResizeToggle(event: Event): void {
    const target = event.target as HTMLInputElement;
    const enabled = target.checked;
    const currResize = this.currentSettings().resize;
    this.emitChange({
      resize: { ...currResize, enabled }
    });
  }

  onResizeModeChange(mode: ResizeMode): void {
    const currResize = this.currentSettings().resize;
    this.emitChange({
      resize: { ...currResize, mode }
    });
  }

  onWidthInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const w = target.value ? Number(target.value) : undefined;
    const currResize = this.currentSettings().resize;

    let nextResize = { ...currResize, width: w };
    const item = this.editingItem();
    if (currResize.maintainAspectRatio && w && item && item.aspectRatio > 0) {
      nextResize.height = Math.round(w / item.aspectRatio);
    }

    this.emitChange({ resize: nextResize });
  }

  onHeightInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const h = target.value ? Number(target.value) : undefined;
    const currResize = this.currentSettings().resize;

    let nextResize = { ...currResize, height: h };
    const item = this.editingItem();
    if (currResize.maintainAspectRatio && h && item && item.aspectRatio > 0) {
      nextResize.width = Math.round(h * item.aspectRatio);
    }

    this.emitChange({ resize: nextResize });
  }

  toggleAspectLock(): void {
    const currResize = this.currentSettings().resize;
    this.emitChange({
      resize: {
        ...currResize,
        maintainAspectRatio: !currResize.maintainAspectRatio
      }
    });
  }

  onPercentageSelect(percentage: number): void {
    const currResize = this.currentSettings().resize;
    this.emitChange({
      resize: { ...currResize, percentage }
    });
  }

  onMetadataPolicyChange(metadataPolicy: MetadataPolicy): void {
    this.emitChange({ metadataPolicy });
  }
}


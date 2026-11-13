// apps/tool-image-compressor/src/components/settings-panel/settings-panel.component.ts
import { Component, ChangeDetectionStrategy, input, output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TsIconComponent } from '@acklet/tool-shell';
import { ImageCapabilityService } from '../../services/image-capability.service';
import {
  CompressionSettings,
  ImageItem,
  OutputFormatOption,
  CompressionMode,
  SmartPreset,
  ResizeMode,
  MetadataPolicy,
  DeveloperPresetKey,
  ImageVariantConfig,
  AdvancedOptimizationSettings,
  RotateAngle,
  FlipDirection,
  AspectPreset
} from '../../models/compressor.models';
import { DEVELOPER_PRESETS, DEFAULT_VARIANTS, getDeveloperPreset } from '../../services/developer-presets.constant';
import { ProfileManagerService } from '../../services/profile-manager.service';
import { COMPRESSOR_CONFIG } from '../../config/compressor.config';
import { CompressorStateService } from '../../services/compressor-state.service';

@Component({
  selector: 'app-settings-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sidebar-inner-card" [class.is-editing-item]="!!editingItem()">
      <!-- Sidebar Header -->
      <div class="sidebar-header">
        @if (editingItem(); as item) {
          <div class="header-custom-row">
            <button
              type="button"
              class="back-to-global-btn"
              (click)="closeIndividualSettings.emit()"
              title="Return to global settings"
            >
              <ts-icon name="arrow-left" [size]="14" />
              <span>All Images</span>
            </button>
            @if (item.individualSettings.hasCustomSettings) {
              <button
                type="button"
                class="reset-custom-btn"
                (click)="resetIndividualSettings.emit(item.id)"
                title="Reset to global settings"
              >
                Reset
              </button>
            }
          </div>
          <h3 class="sidebar-title" [title]="item.originalName">
            {{ item.nameWithoutExt }}
          </h3>
          <span class="sidebar-subtitle">Custom settings for this image</span>
        } @else {
          <h3 class="sidebar-title">Compression Settings</h3>
          <span class="sidebar-subtitle">Applies to all images</span>
        }
      </div>

      <!-- Scrollable Settings Body -->
      <div class="sidebar-scrollable-body">

        <!-- Global vs Custom Segmented Toggle -->
        @if (!editingItem()) {
          <div class="conversion-mode-bar">
            <div class="mode-segmented-control" role="radiogroup" aria-label="Settings scope">
              <button
                type="button"
                class="mode-segment-btn is-active"
                role="radio"
                aria-checked="true"
                title="Apply settings to all images"
              >
                <ts-icon name="layers" [size]="12" />
                <span>All Same (Global)</span>
              </button>
              <button
                type="button"
                class="mode-segment-btn"
                role="radio"
                aria-checked="false"
                (click)="openFirstItemSettings()"
                title="Click any image card to customize individually"
              >
                <ts-icon name="sliders" [size]="12" />
                <span>Per Image (Custom)</span>
              </button>
            </div>
          </div>
        }

        <!-- Recommendation Banner if available -->
        @if (editingItem()?.recommendation; as rec) {
          <div class="recommendation-card" [class.is-applied]="rec.applied">
            <div class="rec-card-header">
              <div class="rec-title-group">
                <ts-icon name="sparkles" [size]="14" />
                <span class="rec-title">Smart Suggestion</span>
              </div>
              @if (rec.estimatedSavingsPercent) {
                <span class="rec-savings-badge font-mono">~{{ rec.estimatedSavingsPercent }}% smaller</span>
              }
            </div>
            <p class="rec-reason">{{ rec.reason }}</p>
            @if (!rec.applied) {
              <button
                type="button"
                class="rec-apply-btn"
                (click)="applyRecommendation.emit(editingItem()!.id)"
              >
                Apply Recommendation
              </button>
            }
          </div>
        }

        <!-- Section 1: Target Format -->
        <div class="sidebar-section">
          <div class="sidebar-section-header">
            <label class="sidebar-section-label">OUTPUT FORMAT</label>
            <span class="format-badge-recommended font-mono">
              {{ (currentSettings().outputFormat || 'original') | uppercase }}
            </span>
          </div>

          <div class="format-chips-grid font-mono" role="radiogroup" aria-label="Output format">
            @for (fmt of availableFormats; track fmt.value) {
              <button
                type="button"
                class="format-chip-btn"
                [class.is-active]="currentSettings().outputFormat === fmt.value"
                (click)="onFormatChipClick(fmt.value)"
                role="radio"
                [attr.aria-checked]="currentSettings().outputFormat === fmt.value"
                [title]="fmt.title"
              >
                <span>{{ fmt.label }}</span>
              </button>
            }
          </div>
        </div>

        <!-- Section 2: Quality & Compression -->
        <div class="sidebar-section">
          <div class="sidebar-section-header">
            <label class="sidebar-section-label" for="qualitySlider">QUALITY & COMPRESSION</label>
            <div class="quality-badge-row">
              <span class="quality-preset-inline font-mono">{{ activePresetLabel() }}</span>
              <span class="selected-quality-badge font-mono">{{ currentSettings().quality }}%</span>
            </div>
          </div>

          <!-- Smooth Quality Slider -->
          <div class="slider-wrapper">
            <input
              id="qualitySlider"
              type="range"
              min="10"
              max="100"
              step="1"
              class="quality-slider"
              [value]="currentSettings().quality"
              (input)="onQualitySliderInput($event)"
              aria-label="Quality percentage"
            />
            <div class="slider-labels font-mono">
              <span>10% (Small)</span>
              <span>80% (Balanced)</span>
              <span>100% (Best)</span>
            </div>
          </div>

          <!-- 3 Smart Presets Pills -->
          <div class="preset-pill-group">
            @for (p of smartPresets; track p.key) {
              <button
                type="button"
                class="preset-pill-btn"
                [class.is-active]="currentSettings().preset === p.key"
                (click)="onPresetChange(p.key)"
                [title]="p.description"
              >
                <span>{{ p.label }} ({{ p.quality }}%)</span>
              </button>
            }
          </div>
        </div>

        <!-- Section 3: Resize & Target Size (Optional) -->
        <div class="sidebar-section">
          <div class="sidebar-section-header">
            <label class="sidebar-section-label" for="resizeModeSelect">RESIZE / TARGET SIZE</label>
          </div>

          <div class="select-wrapper">
            <select
              id="resizeModeSelect"
              class="custom-select font-mono"
              [value]="selectedResizeTargetOption()"
              (change)="onResizeTargetOptionChange($event)"
              aria-label="Resize or target size options"
            >
              <option value="none">Original (No resize)</option>
              <option value="scale-75">Scale to 75%</option>
              <option value="scale-50">Scale to 50%</option>
              <option value="scale-25">Scale to 25%</option>
              <option value="custom-dim">Custom dimensions (W × H)</option>
              <option value="target-size">Target file size (KB / MB)</option>
            </select>
            <ts-icon name="chevron-down" [size]="14" class="select-arrow-icon" />
          </div>

          <!-- Sub-view: Custom Dimensions -->
          @if (selectedResizeTargetOption() === 'custom-dim') {
            <div class="custom-dim-box">
              <div class="dimensions-inputs-row font-mono">
                <div class="dim-field">
                  <label class="dim-label" for="dim-w">Width</label>
                  <input
                    id="dim-w"
                    type="number"
                    min="1"
                    max="16384"
                    class="dim-input"
                    [value]="currentSettings().resize.width || ''"
                    placeholder="Auto"
                    (input)="onWidthInput($event)"
                  />
                </div>
                <button
                  type="button"
                  class="aspect-lock-btn"
                  [class.is-locked]="currentSettings().resize.maintainAspectRatio"
                  (click)="toggleAspectLock()"
                  title="Lock aspect ratio"
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
                    class="dim-input"
                    [value]="currentSettings().resize.height || ''"
                    placeholder="Auto"
                    (input)="onHeightInput($event)"
                  />
                </div>
              </div>
            </div>
          }

          <!-- Sub-view: Target File Size -->
          @if (selectedResizeTargetOption() === 'target-size') {
            <div class="target-size-box font-mono">
              <div class="target-input-row">
                <input
                  type="number"
                  min="1"
                  max="10000"
                  class="target-input"
                  [value]="currentSettings().targetFileSize?.targetValue || 200"
                  (input)="onTargetValueInput($event)"
                  aria-label="Target file size number"
                />
                <div class="target-unit-wrapper">
                  <select
                    class="target-unit-select font-mono"
                    [value]="currentSettings().targetFileSize?.targetUnit || 'KB'"
                    (change)="onTargetUnitChange($event)"
                    aria-label="Target unit"
                  >
                    <option value="KB">KB</option>
                    <option value="MB">MB</option>
                  </select>
                  <ts-icon name="chevron-down" [size]="12" class="select-arrow-icon unit-select-arrow" />
                </div>
              </div>

              <!-- Quick Target Size Pills -->
              <div class="target-presets-row">
                @for (tp of targetPresets; track tp.label) {
                  <button
                    type="button"
                    class="target-pill-btn"
                    [class.is-active]="(currentSettings().targetFileSize?.targetValue === tp.value) && (currentSettings().targetFileSize?.targetUnit === tp.unit)"
                    (click)="onTargetPresetSelect(tp.value, tp.unit)"
                  >
                    {{ tp.label }}
                  </button>
                }
              </div>
            </div>
          }
        </div>

        <!-- Section 4: Transforms (Crop / Rotate) - Only when editing single image -->
        @if (editingItem(); as item) {
          <div class="sidebar-section transforms-section">
            <div class="sidebar-section-header">
              <label class="sidebar-section-label">TRANSFORMS</label>
              @if ((item.transforms || []).length > 0) {
                <span class="transform-count-pill font-mono">{{ item.transforms?.length }} active</span>
              }
            </div>

            <div class="tool-btn-group">
              <button type="button" class="transform-btn" (click)="onRotate(item.id, -90)" title="Rotate 90° Left">
                <ts-icon name="rotate-ccw" [size]="13" />
                <span>90° Left</span>
              </button>
              <button type="button" class="transform-btn" (click)="onRotate(item.id, 90)" title="Rotate 90° Right">
                <ts-icon name="rotate-cw" [size]="13" />
                <span>90° Right</span>
              </button>
              <button type="button" class="transform-btn" (click)="onFlip(item.id, 'horizontal')" title="Flip Horizontal">
                <ts-icon name="flip-horizontal" [size]="13" />
                <span>Flip H</span>
              </button>
            </div>
          </div>
        }

        <!-- Section 5: Advanced Settings Accordion (Collapsible) -->
        <div class="advanced-accordion-wrap">
          <button
            type="button"
            class="advanced-toggle-btn"
            (click)="isAdvancedOpen.update(v => !v)"
            [attr.aria-expanded]="isAdvancedOpen()"
          >
            <div class="toggle-title-wrap">
              <ts-icon name="sliders" [size]="13" />
              <span>Advanced settings</span>
            </div>
            <ts-icon [name]="isAdvancedOpen() ? 'chevron-up' : 'chevron-down'" [size]="13" />
          </button>

          @if (isAdvancedOpen()) {
            <div class="advanced-content-body">
              <!-- Strip Location & Metadata -->
              <div class="setting-sub-section">
                <div class="toggle-header">
                  <div>
                    <label class="sub-section-title" for="privacy-toggle">Strip location & EXIF data</label>
                    <span class="field-hint">Removes camera and GPS metadata for privacy.</span>
                  </div>
                  <label class="switch-control">
                    <input
                      id="privacy-toggle"
                      type="checkbox"
                      [checked]="currentSettings().metadataPolicy !== 'preserve'"
                      (change)="onLocationPrivacyToggle($event)"
                    />
                    <span class="switch-slider"></span>
                  </label>
                </div>
              </div>

              <!-- Color Detail (Chroma Subsampling) -->
              <div class="setting-sub-section">
                <label class="sub-section-title">Color subsampling</label>
                <div class="chroma-toggle-group font-mono">
                  <button
                    type="button"
                    class="chroma-btn"
                    [class.is-active]="(currentAdvanced().chromaSubsampling || 'auto') === 'auto'"
                    (click)="onChromaSubsamplingChange('auto')"
                  >
                    Auto
                  </button>
                  <button
                    type="button"
                    class="chroma-btn"
                    [class.is-active]="currentAdvanced().chromaSubsampling === '4:2:0'"
                    (click)="onChromaSubsamplingChange('4:2:0')"
                  >
                    4:2:0 (Smaller)
                  </button>
                  <button
                    type="button"
                    class="chroma-btn"
                    [class.is-active]="currentAdvanced().chromaSubsampling === '4:4:4'"
                    (click)="onChromaSubsamplingChange('4:4:4')"
                  >
                    4:4:4 (Sharp)
                  </button>
                </div>
              </div>

              <!-- Responsive Variants -->
              <div class="setting-sub-section">
                <div class="toggle-header">
                  <div>
                    <label class="sub-section-title" for="variants-toggle">Responsive variants</label>
                    <span class="field-hint">Generate Thumbnail, Mobile, and Desktop sizes.</span>
                  </div>
                  <label class="switch-control">
                    <input
                      id="variants-toggle"
                      type="checkbox"
                      [checked]="currentSettings().multiVariant?.enabled"
                      (change)="onMultiVariantToggle($event)"
                    />
                    <span class="switch-slider"></span>
                  </label>
                </div>
              </div>

              <!-- Developer Presets Dropdown -->
              <div class="setting-sub-section">
                <label class="sub-section-title" for="devPresetSelect">Developer preset</label>
                <div class="select-wrapper">
                  <select
                    id="devPresetSelect"
                    class="custom-select font-mono"
                    [value]="currentSettings().developerPreset || 'none'"
                    (change)="onDeveloperPresetDropdownChange($event)"
                    aria-label="Developer preset"
                  >
                    <option value="none">None (Standard)</option>
                    @for (dp of developerPresets; track dp.key) {
                      <option [value]="dp.key">{{ dp.label }} ({{ dp.targetFormat | uppercase }}, Q{{ dp.quality }})</option>
                    }
                  </select>
                  <ts-icon name="chevron-down" [size]="14" class="select-arrow-icon" />
                </div>
              </div>

              <!-- Reset to Defaults Button -->
              <div class="reset-defaults-row">
                <button
                  type="button"
                  class="reset-defaults-btn"
                  (click)="onResetToDefaults()"
                >
                  <ts-icon name="rotate-ccw" [size]="12" />
                  <span>Reset to defaults</span>
                </button>
              </div>
            </div>
          }
        </div>

      </div>

      <!-- Fixed Sidebar Action Footer (Always visible) -->
      <div class="sidebar-action-footer">
        @if (completedCount() > 0 && !isCompressing()) {
          <div class="savings-summary-pill font-mono">
            <ts-icon name="check-circle" [size]="13" />
            <span>Saved {{ formatBytes(totalSavedBytes()) }} ({{ totalSavedPercentage() }}% smaller)</span>
          </div>

          @if (completedCount() > 1) {
            <button
              type="button"
              class="sidebar-primary-cta is-download"
              (click)="downloadAllRequested.emit()"
            >
              <ts-icon name="download" [size]="16" />
              <span>Download All (ZIP)</span>
            </button>
          }

          <button
            type="button"
            class="sidebar-secondary-btn"
            (click)="compressMoreRequested.emit()"
          >
            <ts-icon name="plus" [size]="14" />
            <span>Add More Images</span>
          </button>
        } @else if (isCompressing()) {
          <button type="button" class="sidebar-primary-cta is-converting" disabled>
            <span class="spinner-circle-sm"></span>
            <span>Compressing...</span>
          </button>
        } @else if (readyCount() > 0) {
          <button
            type="button"
            class="sidebar-primary-cta"
            (click)="compressAllRequested.emit()"
          >
            <span>Compress {{ readyCount() }} {{ readyCount() === 1 ? 'Image' : 'Images' }}</span>
            <ts-icon name="arrow-right" [size]="16" />
          </button>
        } @else if (editingItem()) {
          <button
            type="button"
            class="sidebar-primary-cta"
            (click)="closeIndividualSettings.emit()"
          >
            <span>Done</span>
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
    }

    .sidebar-inner-card {
      height: 100%;
      max-height: calc(100vh - 110px);
      min-height: 480px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: var(--ts-radius-card, 18px);
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);
      overflow: hidden;
      box-sizing: border-box;
      position: relative;
    }

    :host-context([data-theme="dark"]) .sidebar-inner-card,
    [data-theme="dark"] .sidebar-inner-card {
      background: #18181B;
      border-color: rgba(255, 255, 255, 0.1);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    /* ── Header ── */
    .sidebar-header {
      flex-shrink: 0;
      border-bottom: 1px solid #F1F5F9;
      padding-bottom: 10px;
      margin-bottom: 12px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    :host-context([data-theme="dark"]) .sidebar-header,
    [data-theme="dark"] .sidebar-header {
      border-bottom-color: rgba(255, 255, 255, 0.08);
    }

    .header-custom-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .back-to-global-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: transparent;
      border: none;
      color: #2563EB;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      padding: 0;
    }

    :host-context([data-theme="dark"]) .back-to-global-btn,
    [data-theme="dark"] .back-to-global-btn {
      color: #60A5FA;
    }

    .reset-custom-btn {
      font-size: 11px;
      color: #EF4444;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
    }

    .sidebar-title {
      font-size: 16px;
      font-weight: 700;
      color: #0F172A;
      margin: 0;
      letter-spacing: -0.015em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host-context([data-theme="dark"]) .sidebar-title,
    [data-theme="dark"] .sidebar-title {
      color: #FFFFFF;
    }

    .sidebar-subtitle {
      font-size: 11.5px;
      color: #64748B;
      margin: 0;
    }

    :host-context([data-theme="dark"]) .sidebar-subtitle,
    [data-theme="dark"] .sidebar-subtitle {
      color: #94A3B8;
    }

    /* ── Scrollable Body ── */
    .sidebar-scrollable-body {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding-right: 2px;
      scrollbar-width: none;
      -ms-overflow-style: none;
      overscroll-behavior: contain;
    }

    .sidebar-scrollable-body::-webkit-scrollbar {
      display: none;
      width: 0;
    }

    /* ── Mode Segmented Control ── */
    .conversion-mode-bar {
      width: 100%;
    }

    .mode-segmented-control {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
      background: #F1F5F9;
      border: 1px solid #E2E8F0;
      border-radius: 9px;
      padding: 3px;
    }

    :host-context([data-theme="dark"]) .mode-segmented-control,
    [data-theme="dark"] .mode-segmented-control {
      background: #111318;
      border-color: rgba(255, 255, 255, 0.08);
    }

    .mode-segment-btn {
      height: 30px;
      border-radius: 7px;
      border: none;
      background: transparent;
      color: #64748B;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="dark"]) .mode-segment-btn,
    [data-theme="dark"] .mode-segment-btn {
      color: #94A3B8;
    }

    .mode-segment-btn.is-active {
      background: #FFFFFF;
      color: #0F172A;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
    }

    :host-context([data-theme="dark"]) .mode-segment-btn.is-active,
    [data-theme="dark"] .mode-segment-btn.is-active {
      background: #27272A;
      color: #FFFFFF;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }

    /* ── Sections ── */
    .sidebar-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .sidebar-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .sidebar-section-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748B;
    }

    :host-context([data-theme="dark"]) .sidebar-section-label,
    [data-theme="dark"] .sidebar-section-label {
      color: #94A3B8;
    }

    .format-badge-recommended {
      font-size: 10px;
      font-weight: 700;
      color: #10B981;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.25);
      padding: 1px 6px;
      border-radius: 4px;
    }

    .format-chips-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 4px;
    }

    .format-chip-btn {
      height: 30px;
      border-radius: 6px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      color: #0F172A;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="dark"]) .format-chip-btn,
    [data-theme="dark"] .format-chip-btn {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.08);
      color: #F8FAFC;
    }

    .format-chip-btn:hover {
      border-color: #2563EB;
      color: #2563EB;
    }

    :host-context([data-theme="dark"]) .format-chip-btn:hover,
    [data-theme="dark"] .format-chip-btn:hover {
      border-color: #3B82F6;
      color: #60A5FA;
    }

    .format-chip-btn.is-active {
      background: #EFF6FF;
      border-color: #2563EB;
      color: #2563EB;
      font-weight: 700;
    }

    :host-context([data-theme="dark"]) .format-chip-btn.is-active,
    [data-theme="dark"] .format-chip-btn.is-active {
      background: rgba(59, 130, 246, 0.15);
      border-color: #3B82F6;
      color: #60A5FA;
    }

    /* ── Quality Section ── */
    .quality-badge-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .quality-preset-inline {
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      padding: 1px 6px;
      border-radius: 4px;
      background: #EFF6FF;
      color: #2563EB;
      border: 1px solid #DBEAFE;
    }

    :host-context([data-theme="dark"]) .quality-preset-inline,
    [data-theme="dark"] .quality-preset-inline {
      background: rgba(59, 130, 246, 0.14);
      color: #60A5FA;
      border-color: rgba(59, 130, 246, 0.28);
    }

    .selected-quality-badge {
      font-size: 11.5px;
      font-weight: 700;
      color: #2563EB;
    }

    :host-context([data-theme="dark"]) .selected-quality-badge,
    [data-theme="dark"] .selected-quality-badge {
      color: #60A5FA;
    }

    .slider-wrapper {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .quality-slider {
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: #E2E8F0;
      accent-color: #2563EB;
      cursor: pointer;
    }

    :host-context([data-theme="dark"]) .quality-slider,
    [data-theme="dark"] .quality-slider {
      background: rgba(255, 255, 255, 0.16);
      accent-color: #3B82F6;
    }

    .slider-labels {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #94A3B8;
    }

    .preset-pill-group {
      display: flex;
      gap: 6px;
    }

    .preset-pill-btn {
      flex: 1;
      height: 28px;
      border-radius: 6px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      color: #475569;
      font-size: 10.5px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      padding: 0 4px;
    }

    :host-context([data-theme="dark"]) .preset-pill-btn,
    [data-theme="dark"] .preset-pill-btn {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.08);
      color: #CBD5E1;
    }

    .preset-pill-btn:hover {
      border-color: #CBD5E1;
      color: #0F172A;
    }

    :host-context([data-theme="dark"]) .preset-pill-btn:hover,
    [data-theme="dark"] .preset-pill-btn:hover {
      border-color: rgba(255, 255, 255, 0.2);
      color: #FFFFFF;
    }

    .preset-pill-btn.is-active {
      background: #EFF6FF;
      border-color: #2563EB;
      color: #2563EB;
      font-weight: 700;
    }

    :host-context([data-theme="dark"]) .preset-pill-btn.is-active,
    [data-theme="dark"] .preset-pill-btn.is-active {
      background: rgba(59, 130, 246, 0.12);
      border-color: #3B82F6;
      color: #60A5FA;
    }

    /* ── Select & Resize / Target Size ── */
    .select-wrapper {
      position: relative;
      width: 100%;
    }

    .custom-select {
      width: 100%;
      height: 38px;
      border-radius: 10px;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      color: #0F172A;
      padding: 0 34px 0 12px;
      font-size: 13px;
      font-weight: 500;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      outline: none;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .custom-select:hover {
      border-color: rgba(37, 99, 235, 0.4);
    }

    .custom-select:focus {
      border-color: var(--accent, #2563EB);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18);
    }

    :host-context([data-theme="dark"]) .custom-select,
    [data-theme="dark"] .custom-select {
      background: #111318;
      border-color: rgba(255, 255, 255, 0.12);
      color: #F8FAFC;
    }

    :host-context([data-theme="dark"]) .custom-select:hover,
    [data-theme="dark"] .custom-select:hover {
      border-color: rgba(59, 130, 246, 0.4);
    }

    :host-context([data-theme="dark"]) .custom-select:focus,
    [data-theme="dark"] .custom-select:focus {
      border-color: var(--accent, #3B82F6);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
    }

    .select-arrow-icon {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      color: var(--accent, #2563EB);
      transition: color 0.15s ease;
    }

    :host-context([data-theme="dark"]) .select-arrow-icon,
    [data-theme="dark"] .select-arrow-icon {
      color: var(--accent, #3B82F6);
    }

    .custom-dim-box,
    .target-size-box {
      padding: 10px;
      border-radius: 8px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    :host-context([data-theme="dark"]) .custom-dim-box,
    :host-context([data-theme="dark"]) .target-size-box,
    [data-theme="dark"] .custom-dim-box,
    [data-theme="dark"] .target-size-box {
      background: #111318;
      border-color: rgba(255, 255, 255, 0.08);
    }

    .dimensions-inputs-row {
      display: flex;
      align-items: flex-end;
      gap: 6px;
    }

    .dim-field {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .dim-label {
      font-size: 10px;
      color: #64748B;
      font-weight: 600;
    }

    .dim-input {
      width: 100%;
      height: 30px;
      border-radius: 6px;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      color: #0F172A;
      padding: 0 8px;
      font-size: 11px;
      outline: none;
      box-sizing: border-box;
    }

    :host-context([data-theme="dark"]) .dim-input,
    [data-theme="dark"] .dim-input {
      background: #18181B;
      border-color: rgba(255, 255, 255, 0.12);
      color: #F8FAFC;
    }

    .aspect-lock-btn {
      width: 30px;
      height: 30px;
      border-radius: 6px;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      color: #64748B;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    :host-context([data-theme="dark"]) .aspect-lock-btn,
    [data-theme="dark"] .aspect-lock-btn {
      background: #18181B;
      border-color: rgba(255, 255, 255, 0.12);
      color: #94A3B8;
    }

    .aspect-lock-btn.is-locked {
      background: #EFF6FF;
      border-color: #2563EB;
      color: #2563EB;
    }

    .target-input-row {
      display: grid;
      grid-template-columns: 1fr 70px;
      gap: 6px;
    }

    .target-input {
      height: 30px;
      border-radius: 6px;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      color: #0F172A;
      padding: 0 8px;
      font-size: 11px;
      outline: none;
    }

    :host-context([data-theme="dark"]) .target-input,
    [data-theme="dark"] .target-input {
      background: #18181B;
      border-color: rgba(255, 255, 255, 0.12);
      color: #F8FAFC;
    }

    .target-unit-wrapper {
      position: relative;
      display: inline-flex;
      align-items: center;
    }

    .target-unit-select {
      height: 34px;
      border-radius: 8px;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      color: #0F172A;
      padding: 0 28px 0 10px;
      font-size: 12px;
      font-weight: 600;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      outline: none;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .target-unit-select:hover {
      border-color: rgba(37, 99, 235, 0.4);
    }

    .target-unit-select:focus {
      border-color: var(--accent, #2563EB);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18);
    }

    :host-context([data-theme="dark"]) .target-unit-select,
    [data-theme="dark"] .target-unit-select {
      background: #18181B;
      border-color: rgba(255, 255, 255, 0.12);
      color: #F8FAFC;
    }

    :host-context([data-theme="dark"]) .target-unit-select:focus,
    [data-theme="dark"] .target-unit-select:focus {
      border-color: var(--accent, #3B82F6);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
    }

    .unit-select-arrow {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      color: var(--accent, #2563EB);
    }

    :host-context([data-theme="dark"]) .unit-select-arrow,
    [data-theme="dark"] .unit-select-arrow {
      color: var(--accent, #3B82F6);
    }

    .target-presets-row {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }

    .target-pill-btn {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 4px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      color: #475569;
      cursor: pointer;
    }

    :host-context([data-theme="dark"]) .target-pill-btn,
    [data-theme="dark"] .target-pill-btn {
      background: #18181B;
      border-color: rgba(255, 255, 255, 0.1);
      color: #CBD5E1;
    }

    .target-pill-btn.is-active {
      background: #EFF6FF;
      border-color: #2563EB;
      color: #2563EB;
    }

    /* ── Advanced Settings Accordion ── */
    .advanced-accordion-wrap {
      border-top: 1px solid #F1F5F9;
      padding-top: 10px;
      margin-top: 2px;
    }

    :host-context([data-theme="dark"]) .advanced-accordion-wrap,
    [data-theme="dark"] .advanced-accordion-wrap {
      border-top-color: rgba(255, 255, 255, 0.08);
    }

    .advanced-toggle-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: none;
      border: none;
      padding: 4px 0;
      color: #64748B;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }

    :host-context([data-theme="dark"]) .advanced-toggle-btn,
    [data-theme="dark"] .advanced-toggle-btn {
      color: #94A3B8;
    }

    .advanced-toggle-btn:hover {
      color: #0F172A;
    }

    :host-context([data-theme="dark"]) .advanced-toggle-btn:hover,
    [data-theme="dark"] .advanced-toggle-btn:hover {
      color: #FFFFFF;
    }

    .toggle-title-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .advanced-content-body {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-top: 10px;
    }

    .setting-sub-section {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding-bottom: 10px;
      border-bottom: 1px solid #F1F5F9;
    }

    :host-context([data-theme="dark"]) .setting-sub-section,
    [data-theme="dark"] .setting-sub-section {
      border-bottom-color: rgba(255, 255, 255, 0.05);
    }

    .sub-section-title {
      font-size: 11.5px;
      font-weight: 600;
      color: #0F172A;
    }

    :host-context([data-theme="dark"]) .sub-section-title,
    [data-theme="dark"] .sub-section-title {
      color: #F8FAFC;
    }

    .field-hint {
      font-size: 10.5px;
      color: #64748B;
      display: block;
    }

    .toggle-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .switch-control {
      position: relative;
      display: inline-block;
      width: 36px;
      height: 18px;
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
      background-color: #CBD5E1;
      transition: 0.2s;
      border-radius: 18px;
    }

    .switch-slider:before {
      position: absolute;
      content: "";
      height: 12px;
      width: 12px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.2s;
      border-radius: 50%;
    }

    .switch-control input:checked + .switch-slider {
      background-color: #2563EB;
    }

    .switch-control input:checked + .switch-slider:before {
      transform: translateX(18px);
    }

    .chroma-toggle-group {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4px;
    }

    .chroma-btn {
      padding: 4px;
      font-size: 10.5px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      color: #475569;
      border-radius: 5px;
      cursor: pointer;
      text-align: center;
    }

    :host-context([data-theme="dark"]) .chroma-btn,
    [data-theme="dark"] .chroma-btn {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.08);
      color: #CBD5E1;
    }

    .chroma-btn.is-active {
      background: #2563EB;
      color: #FFFFFF;
      border-color: #2563EB;
    }

    .dev-presets-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }

    .dev-preset-card {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 6px 8px;
      border-radius: 6px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      text-align: left;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="dark"]) .dev-preset-card,
    [data-theme="dark"] .dev-preset-card {
      background: rgba(255, 255, 255, 0.03);
      border-color: rgba(255, 255, 255, 0.08);
    }

    .dev-preset-card.is-active {
      border-color: #2563EB;
      background: #EFF6FF;
    }

    :host-context([data-theme="dark"]) .dev-preset-card.is-active,
    [data-theme="dark"] .dev-preset-card.is-active {
      border-color: #3B82F6;
      background: rgba(59, 130, 246, 0.1);
    }

    .dev-preset-title {
      font-size: 11px;
      font-weight: 700;
      color: #0F172A;
    }

    :host-context([data-theme="dark"]) .dev-preset-title,
    [data-theme="dark"] .dev-preset-title {
      color: #FFFFFF;
    }

    .dev-preset-desc {
      font-size: 9.5px;
      color: #64748B;
      line-height: 1.3;
    }

    .reset-defaults-row {
      display: flex;
      justify-content: center;
      padding-top: 4px;
    }

    .reset-defaults-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: transparent;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      padding: 5px 12px;
      font-size: 11px;
      color: #64748B;
      cursor: pointer;
    }

    /* ── Recommendation Card ── */
    .recommendation-card {
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-radius: 10px;
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    :host-context([data-theme="dark"]) .recommendation-card,
    [data-theme="dark"] .recommendation-card {
      background: rgba(59, 130, 246, 0.1);
      border-color: rgba(59, 130, 246, 0.25);
    }

    .rec-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .rec-title-group {
      display: flex;
      align-items: center;
      gap: 5px;
      color: #2563EB;
      font-size: 11.5px;
      font-weight: 700;
    }

    .rec-savings-badge {
      font-size: 10px;
      font-weight: 700;
      color: #059669;
      background: rgba(16, 185, 129, 0.12);
      padding: 1px 6px;
      border-radius: 4px;
    }

    .rec-reason {
      font-size: 11px;
      line-height: 1.35;
      color: #334155;
      margin: 0;
    }

    :host-context([data-theme="dark"]) .rec-reason,
    [data-theme="dark"] .rec-reason {
      color: #CBD5E1;
    }

    .rec-apply-btn {
      height: 26px;
      border-radius: 5px;
      background: #2563EB;
      color: #FFFFFF;
      border: none;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 2px;
    }

    /* ── Transforms Section ── */
    .tool-btn-group {
      display: flex;
      gap: 6px;
    }

    .transform-btn {
      flex: 1;
      height: 28px;
      border-radius: 6px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      color: #475569;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    :host-context([data-theme="dark"]) .transform-btn,
    [data-theme="dark"] .transform-btn {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.08);
      color: #CBD5E1;
    }

    .transform-count-pill {
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 4px;
      background: rgba(37, 99, 235, 0.1);
      color: #2563EB;
    }

    /* ── Fixed Footer CTA Action Area ── */
    .sidebar-action-footer {
      flex-shrink: 0;
      border-top: 1px solid #F1F5F9;
      padding-top: 12px;
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    :host-context([data-theme="dark"]) .sidebar-action-footer,
    [data-theme="dark"] .sidebar-action-footer {
      border-top-color: rgba(255, 255, 255, 0.08);
    }

    .savings-summary-pill {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 8px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.25);
      color: #059669;
      font-size: 11.5px;
      font-weight: 700;
    }

    :host-context([data-theme="dark"]) .savings-summary-pill,
    [data-theme="dark"] .savings-summary-pill {
      color: #10B981;
    }

    .sidebar-primary-cta {
      width: 100%;
      height: 42px;
      border-radius: 10px;
      background: #2563EB;
      color: #FFFFFF;
      font-size: 13.5px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
    }

    .sidebar-primary-cta:hover:not(:disabled) {
      background: #1D4ED8;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
    }

    .sidebar-primary-cta.is-download {
      background: var(--accent, #2563EB);
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
    }

    .sidebar-primary-cta.is-download:hover {
      background: var(--accent-hover, #1D4ED8);
    }

    .sidebar-primary-cta.is-converting {
      opacity: 0.85;
      cursor: wait;
    }

    .sidebar-secondary-btn {
      width: 100%;
      height: 36px;
      border-radius: 8px;
      background: transparent;
      border: 1px solid #CBD5E1;
      color: #475569;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="dark"]) .sidebar-secondary-btn,
    [data-theme="dark"] .sidebar-secondary-btn {
      border-color: rgba(255, 255, 255, 0.15);
      color: #CBD5E1;
    }

    .sidebar-secondary-btn:hover {
      border-color: #2563EB;
      color: #2563EB;
    }
  `]
})
export class SettingsPanelComponent {
  readonly capabilityService: ImageCapabilityService;
  readonly profileManager: ProfileManagerService;
  readonly state: CompressorStateService | null;

  constructor() {
    try {
      this.capabilityService = inject(ImageCapabilityService);
    } catch {
      this.capabilityService = new ImageCapabilityService();
    }
    try {
      this.profileManager = inject(ProfileManagerService);
    } catch {
      this.profileManager = new ProfileManagerService();
    }
    try {
      this.state = inject(CompressorStateService);
    } catch {
      this.state = null;
    }
  }

  readonly globalSettings = input.required<CompressionSettings>();
  readonly editingItem = input<ImageItem | null>(null);

  // Stats for the sidebar action footer
  readonly totalCount = input<number>(0);
  readonly readyCount = input<number>(0);
  readonly completedCount = input<number>(0);
  readonly isCompressing = input<boolean>(false);
  readonly totalSavedBytes = input<number>(0);
  readonly totalSavedPercentage = input<number>(0);

  readonly globalSettingsChanged = output<Partial<CompressionSettings>>();
  readonly individualSettingsChanged = output<{ id: string; settings: Partial<CompressionSettings> }>();
  readonly resetIndividualSettings = output<string>();
  readonly closeIndividualSettings = output<void>();
  readonly applyRecommendation = output<string>();
  readonly profileSelected = output<string>();
  readonly openProfileManager = output<void>();
  readonly compressAllRequested = output<void>();
  readonly downloadAllRequested = output<void>();
  readonly compressMoreRequested = output<void>();

  readonly advancedCodecOpen = signal<boolean>(false);
  readonly isAdvancedOpen = signal<boolean>(false);

  readonly targetPresets = [
    { label: '100 KB', value: 100, unit: 'KB' as const },
    { label: '250 KB', value: 250, unit: 'KB' as const },
    { label: '500 KB', value: 500, unit: 'KB' as const },
    { label: '1 MB', value: 1, unit: 'MB' as const }
  ];

  readonly developerPresets = DEVELOPER_PRESETS;
  readonly smartPresets = COMPRESSOR_CONFIG.presets.smartList;

  readonly availableFormats: Array<{ value: OutputFormatOption; label: string; title: string }> = [
    { value: 'original', label: 'ORIGINAL', title: 'Keep original format' },
    { value: 'webp', label: 'WEBP', title: 'Modern high-efficiency WebP' },
    { value: 'jpeg', label: 'JPG', title: 'Universal JPEG format' },
    { value: 'png', label: 'PNG', title: 'Lossless PNG with transparency' },
    { value: 'avif', label: 'AVIF', title: 'Next-gen AV1 image format' }
  ];

  readonly currentSettings = computed<CompressionSettings>(() => {
    const item = this.editingItem();
    if (item) {
      return item.effectiveSettings;
    }
    return this.globalSettings();
  });

  readonly currentVariants = computed<ImageVariantConfig[]>(() => {
    return this.currentSettings().multiVariant?.variants || DEFAULT_VARIANTS;
  });

  readonly currentAdvanced = computed<AdvancedOptimizationSettings>(() => {
    return this.currentSettings().advancedOptimization || {};
  });

  readonly activePresetLabel = computed<string>(() => {
    const s = this.currentSettings();
    const p = this.smartPresets.find(item => item.key === s.preset);
    return p ? p.label : 'Custom';
  });

  readonly selectedResizeTargetOption = computed<string>(() => {
    const s = this.currentSettings();
    if (s.targetFileSize?.enabled) return 'target-size';
    if (!s.resize?.enabled) return 'none';
    if (s.resize.mode === 'percentage') {
      if (s.resize.percentage === 75) return 'scale-75';
      if (s.resize.percentage === 50) return 'scale-50';
      if (s.resize.percentage === 25) return 'scale-25';
    }
    return 'custom-dim';
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

  openFirstItemSettings(): void {
    const firstImg = this.state?.images()[0];
    if (firstImg) {
      this.state?.openItemSettings(firstImg.id);
    }
  }

  onFormatChipClick(outputFormat: OutputFormatOption): void {
    this.emitChange({ outputFormat });
  }

  onModeChange(mode: CompressionMode): void {
    this.emitChange({ mode });
  }

  onPresetChange(preset: SmartPreset): void {
    this.emitChange({ preset });
  }

  onQualitySliderInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const quality = Math.max(1, Math.min(100, Number(target.value) || 80));
    this.emitChange({ quality });
  }

  onResizeTargetOptionChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    if (val === 'none') {
      this.emitChange({
        resize: { enabled: false, mode: 'dimensions', percentage: 100, maintainAspectRatio: true, preventUpscale: true },
        targetFileSize: { enabled: false, targetValue: 200, targetUnit: 'KB', targetBytes: 204800, minQuality: 25 }
      });
    } else if (val === 'scale-75') {
      this.emitChange({
        resize: { enabled: true, mode: 'percentage', percentage: 75, maintainAspectRatio: true, preventUpscale: true },
        targetFileSize: { enabled: false, targetValue: 200, targetUnit: 'KB', targetBytes: 204800, minQuality: 25 }
      });
    } else if (val === 'scale-50') {
      this.emitChange({
        resize: { enabled: true, mode: 'percentage', percentage: 50, maintainAspectRatio: true, preventUpscale: true },
        targetFileSize: { enabled: false, targetValue: 200, targetUnit: 'KB', targetBytes: 204800, minQuality: 25 }
      });
    } else if (val === 'scale-25') {
      this.emitChange({
        resize: { enabled: true, mode: 'percentage', percentage: 25, maintainAspectRatio: true, preventUpscale: true },
        targetFileSize: { enabled: false, targetValue: 200, targetUnit: 'KB', targetBytes: 204800, minQuality: 25 }
      });
    } else if (val === 'custom-dim') {
      this.emitChange({
        resize: { enabled: true, mode: 'dimensions', percentage: 100, maintainAspectRatio: true, preventUpscale: true },
        targetFileSize: { enabled: false, targetValue: 200, targetUnit: 'KB', targetBytes: 204800, minQuality: 25 }
      });
    } else if (val === 'target-size') {
      this.emitChange({
        resize: { enabled: false, mode: 'dimensions', percentage: 100, maintainAspectRatio: true, preventUpscale: true },
        targetFileSize: { enabled: true, targetValue: 200, targetUnit: 'KB', targetBytes: 204800, minQuality: 25 }
      });
    }
  }

  onTargetValueInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const targetValue = Math.max(1, Number(target.value) || 200);
    const currTarget = this.currentSettings().targetFileSize || {
      enabled: true,
      targetValue: 200,
      targetUnit: 'KB',
      targetBytes: 204800,
      minQuality: 25
    };
    this.emitChange({
      targetFileSize: { ...currTarget, targetValue }
    });
  }

  onTargetUnitChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const targetUnit = target.value as 'KB' | 'MB';
    const currTarget = this.currentSettings().targetFileSize || {
      enabled: true,
      targetValue: 200,
      targetUnit: 'KB',
      targetBytes: 204800,
      minQuality: 25
    };
    this.emitChange({
      targetFileSize: { ...currTarget, targetUnit }
    });
  }

  onTargetPresetSelect(value: number, unit: 'KB' | 'MB'): void {
    const currTarget = this.currentSettings().targetFileSize || {
      enabled: true,
      targetValue: 200,
      targetUnit: 'KB',
      targetBytes: 204800,
      minQuality: 25
    };
    this.emitChange({
      targetFileSize: {
        ...currTarget,
        enabled: true,
        targetValue: value,
        targetUnit: unit
      }
    });
  }

  onWidthInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const w = target.value ? Number(target.value) : undefined;
    const currResize = this.currentSettings().resize;
    let nextResize = { ...currResize, enabled: true, width: w };
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
    let nextResize = { ...currResize, enabled: true, height: h };
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

  onLocationPrivacyToggle(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const policy: MetadataPolicy = checked ? 'strip-gps' : 'preserve';
    this.emitChange({ metadataPolicy: policy });
  }

  onChromaSubsamplingChange(mode: 'auto' | '4:2:0' | '4:4:4'): void {
    this.updateAdvancedOptimization({ chromaSubsampling: mode });
  }

  onMultiVariantToggle(event: Event): void {
    const target = event.target as HTMLInputElement;
    const enabled = target.checked;
    const curr = this.currentSettings().multiVariant || { enabled: false, variants: [...DEFAULT_VARIANTS] };
    this.emitChange({
      multiVariant: {
        ...curr,
        enabled,
        variants: curr.variants && curr.variants.length > 0 ? curr.variants : [...DEFAULT_VARIANTS]
      }
    });
  }

  onDeveloperPresetDropdownChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    if (val === 'none') {
      this.emitChange({ developerPreset: undefined });
    } else {
      this.onDeveloperPresetSelect(val as DeveloperPresetKey);
    }
  }

  onDeveloperPresetSelect(key: DeveloperPresetKey): void {
    const presetConfig = getDeveloperPreset(key);
    if (!presetConfig) return;
    this.emitChange({
      developerPreset: key,
      outputFormat: presetConfig.targetFormat,
      quality: presetConfig.quality,
      resize: { ...presetConfig.resize },
      metadataPolicy: presetConfig.metadataPolicy
    });
  }

  onResetToDefaults(): void {
    this.globalSettingsChanged.emit({ ...COMPRESSOR_CONFIG.profiles[0].settings });
  }

  updateAdvancedOptimization(partial: Partial<AdvancedOptimizationSettings>): void {
    const curr = this.currentSettings().advancedOptimization || {
      progressiveJpeg: true,
      losslessWebp: false,
      cleanTransparency: true,
      optimizePalette: true,
      compressionEffort: 4,
      chromaSubsampling: 'auto'
    };
    this.emitChange({
      advancedOptimization: {
        ...curr,
        ...partial
      }
    });
  }

  onRotate(id: string, angle: RotateAngle): void {
    this.state?.addTransform(id, { type: 'rotate', angle });
  }

  onFlip(id: string, direction: FlipDirection): void {
    this.state?.addTransform(id, { type: 'flip', direction });
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
  }
}

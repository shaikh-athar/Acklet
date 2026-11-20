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
import { CompressorStateService, DEFAULT_COMPRESSION_SETTINGS } from '../../services/compressor-state.service';
import { CustomSelectComponent, CustomSelectOption } from '../custom-select/custom-select.component';
import {
  calculateDynamicDefaultTarget,
  suggestTargets,
  isTargetVeryLow,
  calculateTargetFromReduction,
  TargetSuggestion
} from '../../services/target-suggestion.util';

@Component({
  selector: 'app-settings-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent, CustomSelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sidebar-inner-card" [class.is-editing-item]="!!editingItem()" [class.is-sheet-mode]="isMobileSheet()">
      <!-- Sidebar Header -->
      @if (!isMobileSheet()) {
        <div class="sidebar-header">
          <h3 class="sidebar-title">Compression Settings</h3>
          <span class="sidebar-subtitle">Applies to all images</span>
        </div>
      }

      <!-- Scrollable Settings Body -->
      <div class="sidebar-scrollable-body">

        <!-- Section 1: Target Format -->
        <div class="sidebar-section">
          <div class="sidebar-section-header">
            <label class="sidebar-section-label">OUTPUT FORMAT</label>
            <span class="format-badge-recommended">
              {{ (currentSettings().outputFormat || 'original') | uppercase }}
            </span>
          </div>

          <div class="format-chips-grid" role="radiogroup" aria-label="Output format">
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

        <!-- Section 2: Target File Size -->
        <div class="sidebar-section">
          <div class="sidebar-section-header">
            <label class="sidebar-section-label">TARGET FILE SIZE</label>
          </div>

          <div class="target-size-box font-mono">
            <!-- Target Input Row: Size Input + Type (Unit) -->
            <div class="target-input-row">
              <input
                type="number"
                min="1"
                max="10000"
                class="target-input"
                [value]="displayTargetValue()"
                (input)="onTargetValueInput($event)"
                aria-label="Target file size number"
              />
              <div class="target-unit-wrapper">
                <app-custom-select
                  [options]="unitOptions"
                  [value]="displayTargetUnit()"
                  (valueChange)="onTargetUnitSelect($event)"
                  size="sm"
                  ariaLabel="Target file size unit"
                />
              </div>
            </div>

            <!-- Quick Badges Row -->
            @if (singleImageSuggestions().length > 0) {
              <div class="target-presets-row">
                <span class="quick-chips-label">Quick:</span>
                @for (tp of singleImageSuggestions(); track tp.label) {
                  <button
                    type="button"
                    class="target-pill-btn"
                    [class.is-active]="(displayTargetValue() === tp.value) && (displayTargetUnit() === tp.unit)"
                    (click)="onTargetPresetSelect(tp.value, tp.unit)"
                  >
                    {{ tp.label }}
                  </button>
                }
              </div>
            }

            @if (isTargetVeryLowWarning()) {
              <div class="target-low-warning">
                <ts-icon name="info" [size]="12" />
                <span>Very small targets may reduce image size.</span>
              </div>
            }
          </div>
        </div>

        <!-- Section 3: Transforms (Default Visible) -->
        <div class="sidebar-section">
          <div class="sidebar-section-header">
            <label class="sidebar-section-label">TRANSFORMS</label>
            <button
              type="button"
              class="reset-defaults-link"
              (click)="onResetToDefaults()"
              title="Reset settings to defaults"
            >
              <ts-icon name="rotate-ccw" [size]="11" />
              <span>Reset to defaults</span>
            </button>
          </div>

          <div class="transforms-btn-row">
            <button
              type="button"
              class="transform-btn"
              (click)="rotateLeft()"
              title="Rotate 90° counter-clockwise"
            >
              <ts-icon name="rotate-ccw" [size]="13" />
              <span>90&deg; Left</span>
            </button>
            <button
              type="button"
              class="transform-btn"
              (click)="rotateRight()"
              title="Rotate 90° clockwise"
            >
              <ts-icon name="rotate-cw" [size]="13" />
              <span>90&deg; Right</span>
            </button>
            <button
              type="button"
              class="transform-btn"
              (click)="flipHorizontal()"
              title="Flip horizontally"
            >
              <ts-icon name="maximize-2" [size]="13" />
              <span>Flip H</span>
            </button>
          </div>
        </div>

        <!-- Section 4: Optimization Profiles Link (Below Transforms) -->
        <div class="profiles-link-row">
          <button
            type="button"
            class="profiles-text-link"
            (click)="openProfileManager.emit()"
            title="Open optimization profiles"
            aria-label="Optimization profiles"
          >
            <ts-icon name="bookmark" [size]="12" />
            <span>Optimization profiles</span>
          </button>
        </div>

      </div>

      <!-- Fixed Sidebar Action Footer (Always visible) -->
      <div class="sidebar-action-footer">
        @if (isCompressing()) {
          <button type="button" class="sidebar-primary-cta is-converting" disabled>
            <span class="spinner-circle-sm"></span>
            <span>Compressing...</span>
          </button>
        } @else if (totalCount() > 0) {
          <button
            type="button"
            class="sidebar-primary-cta btn-primary-action"
            (click)="compressAllRequested.emit()"
          >
            <span>Compress {{ totalCount() }} {{ totalCount() === 1 ? 'image' : 'images' }}</span>
            <ts-icon name="arrow-right" [size]="16" />
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
      max-height: 100%;
      min-height: 520px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: var(--ts-radius-card, 18px);
      padding: 16px 18px;
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
      color: var(--accent, #2563EB);
      font-size: 11.5px;
      font-weight: 700;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      transition: background 0.15s ease;
    }

    .back-to-global-btn:hover {
      background: rgba(37, 99, 235, 0.08);
    }

    .reset-custom-btn {
      background: transparent;
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #EF4444;
      font-size: 10.5px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
      cursor: pointer;
    }

    .sidebar-title {
      font-size: 15px;
      font-weight: 700;
      color: #0F172A;
      margin: 0;
      letter-spacing: -0.01em;
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
      letter-spacing: -0.01em;
    }

    :host-context([data-theme="dark"]) .sidebar-subtitle,
    [data-theme="dark"] .sidebar-subtitle {
      color: #A1A1AA;
    }

    /* ── Scrollable Body ── */
    .sidebar-scrollable-body {
      flex: 1;
      overflow-y: auto;
      padding-right: 4px;
      display: flex;
      flex-direction: column;
      gap: 30px;
    }

    /* ── Mode Segmented Control ── */
    .conversion-mode-bar {
      margin-bottom: 2px;
    }

    .mode-segmented-control {
      display: grid;
      grid-template-columns: 1fr 1fr;
      padding: 3px;
      background: #F1F5F9;
      border-radius: 9px;
      gap: 3px;
    }

    :host-context([data-theme="dark"]) .mode-segmented-control,
    [data-theme="dark"] .mode-segmented-control {
      background: rgba(255, 255, 255, 0.05);
    }

    .mode-segment-btn {
      height: 28px;
      border-radius: 7px;
      border: none;
      background: transparent;
      color: #64748B;
      font-size: 11.5px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      cursor: pointer;
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
      font-weight: 700;
    }

    :host-context([data-theme="dark"]) .mode-segment-btn.is-active,
    [data-theme="dark"] .mode-segment-btn.is-active {
      background: #27272A;
      color: #FFFFFF;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    }

    /* ── Sidebar Sections ── */
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
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: #64748B;
    }

    :host-context([data-theme="dark"]) .sidebar-section-label,
    [data-theme="dark"] .sidebar-section-label {
      color: #94A3B8;
    }

    .format-badge-recommended {
      font-size: 10px;
      font-weight: 700;
      color: #059669;
      background: rgba(16, 185, 129, 0.1);
      padding: 1px 6px;
      border-radius: 4px;
    }

    :host-context([data-theme="dark"]) .format-badge-recommended,
    [data-theme="dark"] .format-badge-recommended {
      color: #10B981;
      background: rgba(16, 185, 129, 0.15);
    }

    .format-chips-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 5px;
    }

    .format-chip-btn {
      height: 32px;
      padding: 0 2px;
      border-radius: 7px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      color: #0F172A;
      font-size: 10px;
      font-weight: 700;
      white-space: nowrap;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="dark"]) .format-chip-btn,
    [data-theme="dark"] .format-chip-btn {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.1);
      color: #F8FAFC;
    }

    .format-chip-btn:hover:not(.is-active) {
      border-color: #2563EB;
      color: #2563EB;
    }

    :host-context([data-theme="dark"]) .format-chip-btn:hover:not(.is-active),
    [data-theme="dark"] .format-chip-btn:hover:not(.is-active) {
      border-color: #3B82F6;
      color: #60A5FA;
    }

    .format-chip-btn.is-active {
      background: var(--accent, #2563EB);
      border-color: var(--accent, #2563EB);
      color: #FFFFFF;
      box-shadow: 0 1px 4px rgba(37, 99, 235, 0.25);
    }

    .format-conversion-notice {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 6px;
      background: rgba(37, 99, 235, 0.06);
      border: 1px solid rgba(37, 99, 235, 0.16);
      color: var(--accent, #2563EB);
      font-size: 10.5px;
      line-height: 1.3;
    }

    :host-context([data-theme="dark"]) .format-conversion-notice,
    [data-theme="dark"] .format-conversion-notice {
      background: rgba(59, 130, 246, 0.1);
      border-color: rgba(59, 130, 246, 0.22);
      color: #93C5FD;
    }

    /* ── Integrated Quality & Compression Section ── */
    .quality-section {
      background: rgba(248, 250, 252, 0.6);
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 11px 12px 10px;
      gap: 9px;
    }

    :host-context([data-theme="dark"]) .quality-section,
    [data-theme="dark"] .quality-section {
      background: rgba(255, 255, 255, 0.02);
      border-color: rgba(255, 255, 255, 0.08);
    }

    .quality-display-badge {
      display: inline-flex;
      align-items: baseline;
      padding: 2px 8px;
      border-radius: 9999px;
      background: rgba(37, 99, 235, 0.08);
      border: 1px solid rgba(37, 99, 235, 0.2);
      color: var(--accent, #2563EB);
      line-height: 1;
    }

    :host-context([data-theme="dark"]) .quality-display-badge,
    [data-theme="dark"] .quality-display-badge {
      background: rgba(59, 130, 246, 0.16);
      border-color: rgba(59, 130, 246, 0.3);
      color: #60A5FA;
    }

    .quality-number {
      font-size: 14px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .quality-percent {
      font-size: 10px;
      font-weight: 700;
      margin-left: 1px;
    }

    .quality-slider-container {
      width: 100%;
      padding: 2px 0;
    }

    .quality-slider {
      --slider-progress: 80%;
      appearance: none;
      -webkit-appearance: none;
      width: 100%;
      height: 6px;
      border-radius: 9999px;
      background: linear-gradient(
        to right,
        var(--accent, #2563EB) 0%,
        var(--accent, #2563EB) var(--slider-progress),
        #E2E8F0 var(--slider-progress),
        #E2E8F0 100%
      );
      outline: none;
      cursor: pointer;
      margin: 0;
      transition: background 0.05s ease;
    }

    :host-context([data-theme="dark"]) .quality-slider,
    [data-theme="dark"] .quality-slider {
      background: linear-gradient(
        to right,
        var(--accent, #3B82F6) 0%,
        var(--accent, #3B82F6) var(--slider-progress),
        rgba(255, 255, 255, 0.16) var(--slider-progress),
        rgba(255, 255, 255, 0.16) 100%
      );
    }

    .quality-slider::-webkit-slider-thumb {
      appearance: none;
      -webkit-appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #FFFFFF;
      border: 2.5px solid var(--accent, #2563EB);
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.18);
      cursor: grab;
      transition: transform 0.15s ease;
    }

    .quality-slider:active::-webkit-slider-thumb {
      cursor: grabbing;
      transform: scale(1.15);
      box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.16);
    }

    :host-context([data-theme="dark"]) .quality-slider::-webkit-slider-thumb,
    [data-theme="dark"] .quality-slider::-webkit-slider-thumb {
      background: #18181B;
      border-color: var(--accent, #3B82F6);
      box-shadow: 0 1px 6px rgba(0, 0, 0, 0.6);
    }

    .quality-slider::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #FFFFFF;
      border: 2.5px solid var(--accent, #2563EB);
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.18);
      cursor: grab;
    }

    .quality-hints-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 10.5px;
      color: #64748B;
    }

    :host-context([data-theme="dark"]) .quality-hints-row,
    [data-theme="dark"] .quality-hints-row {
      color: #94A3B8;
    }

    .hint-tier {
      font-size: 10px;
      font-weight: 700;
      color: #0F172A;
      background: rgba(15, 23, 42, 0.04);
      padding: 1px 6px;
      border-radius: 4px;
    }

    :host-context([data-theme="dark"]) .hint-tier,
    [data-theme="dark"] .hint-tier {
      color: #F8FAFC;
      background: rgba(255, 255, 255, 0.06);
    }

    /* ── Custom Dimensions Box ── */
    .custom-dim-box {
      margin-top: 4px;
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
      font-size: 9.5px;
      color: #64748B;
      font-weight: 600;
      text-transform: uppercase;
    }

    :host-context([data-theme="dark"]) .dim-label,
    [data-theme="dark"] .dim-label {
      color: #94A3B8;
    }

    .dim-input {
      width: 100%;
      height: 34px;
      border-radius: 8px;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      color: #0F172A;
      padding: 0 8px;
      font-size: 12px;
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
      width: 34px;
      height: 34px;
      border-radius: 8px;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      color: #64748B;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
    }

    :host-context([data-theme="dark"]) .aspect-lock-btn,
    [data-theme="dark"] .aspect-lock-btn {
      background: #18181B;
      border-color: rgba(255, 255, 255, 0.12);
      color: #94A3B8;
    }

    .aspect-lock-btn.is-locked {
      background: #EFF6FF;
      border-color: var(--accent, #2563EB);
      color: var(--accent, #2563EB);
    }

    :host-context([data-theme="dark"]) .aspect-lock-btn.is-locked,
    [data-theme="dark"] .aspect-lock-btn.is-locked {
      background: rgba(59, 130, 246, 0.15);
      border-color: var(--accent, #3B82F6);
      color: #60A5FA;
    }

    /* ── Target File Size Box (Unified Container) ── */
    .target-size-box {
      display: flex;
      flex-direction: column;
      gap: 9px;
      padding: 10px 12px;
      border-radius: 10px;
      background: var(--bg-hover, #F8FAFC);
      border: 1px solid var(--border-subtle, #E2E8F0);
      box-sizing: border-box;
      margin-top: 4px;
    }

    :host-context([data-theme="dark"]) .target-size-box,
    [data-theme="dark"] .target-size-box {
      background: rgba(30, 41, 59, 0.45);
      border-color: rgba(51, 65, 85, 0.65);
    }

    .target-input-row {
      display: grid;
      grid-template-columns: 1fr 75px;
      gap: 6px;
      align-items: center;
    }

    .target-input {
      height: 34px;
      border-radius: 8px;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      color: #0F172A;
      padding: 0 10px;
      font-size: 12px;
      font-weight: 600;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .target-input:focus {
      border-color: var(--accent, #2563EB);
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
    }

    :host-context([data-theme="dark"]) .target-input,
    [data-theme="dark"] .target-input {
      background: #18181B;
      border-color: rgba(255, 255, 255, 0.12);
      color: #F8FAFC;
    }

    .target-presets-row {
      display: flex;
      align-items: center;
      gap: 5px;
      flex-wrap: wrap;
      padding-top: 2px;
    }

    .quick-chips-label {
      font-size: 11px;
      font-weight: 600;
      color: #64748B;
      margin-right: 2px;
    }

    :host-context([data-theme="dark"]) .quick-chips-label,
    [data-theme="dark"] .quick-chips-label {
      color: #94A3B8;
    }

    .target-pill-btn {
      padding: 3px 8px;
      border-radius: 6px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      color: #475569;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="dark"]) .target-pill-btn,
    [data-theme="dark"] .target-pill-btn {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.1);
      color: #CBD5E1;
    }

    .target-pill-btn:hover {
      background: #EFF6FF;
      border-color: var(--accent, #2563EB);
      color: var(--accent, #2563EB);
    }

    :host-context([data-theme="dark"]) .target-pill-btn:hover,
    [data-theme="dark"] .target-pill-btn:hover {
      background: rgba(59, 130, 246, 0.15);
      border-color: var(--accent, #3B82F6);
      color: #60A5FA;
    }

    .target-pill-btn.is-active {
      background: var(--accent, #2563EB);
      border-color: var(--accent, #2563EB);
      color: #FFFFFF;
    }

    .target-low-warning {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      color: #D97706;
      margin-top: 2px;
      line-height: 1.3;
    }

    :host-context([data-theme="dark"]) .target-low-warning,
    [data-theme="dark"] .target-low-warning {
      color: #FBBF24;
    }

    /* ── Percentage Box ── */
    .percentage-box {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 8px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
    }

    :host-context([data-theme="dark"]) .percentage-box,
    [data-theme="dark"] .percentage-box {
      background: rgba(255, 255, 255, 0.03);
      border-color: rgba(255, 255, 255, 0.08);
    }

    .group-label-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .scale-val {
      font-size: 11px;
      font-weight: 700;
      color: var(--accent, #2563EB);
    }

    .custom-range-slider {
      width: 100%;
      height: 6px;
      border-radius: 9999px;
      appearance: none;
      -webkit-appearance: none;
      outline: none;
      cursor: pointer;
      --slider-fill-offset: calc(var(--slider-progress-ratio, 0.222) * (100% - 16px) + 8px);
      background: linear-gradient(
        to right,
        var(--accent, #2563EB) 0%,
        var(--accent, #2563EB) var(--slider-fill-offset),
        #E2E8F0 var(--slider-fill-offset),
        #E2E8F0 100%
      );
    }

    :host-context([data-theme="dark"]) .custom-range-slider,
    [data-theme="dark"] .custom-range-slider {
      background: linear-gradient(
        to right,
        var(--accent, #3B82F6) 0%,
        var(--accent, #3B82F6) var(--slider-fill-offset),
        rgba(255, 255, 255, 0.16) var(--slider-fill-offset),
        rgba(255, 255, 255, 0.16) 100%
      );
    }

    .custom-range-slider::-webkit-slider-thumb {
      appearance: none;
      -webkit-appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #FFFFFF;
      border: 2.5px solid var(--accent, #2563EB);
      cursor: grab;
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.2);
      transition: transform 0.12s ease;
    }

    .custom-range-slider::-webkit-slider-thumb:hover {
      transform: scale(1.15);
    }

    .custom-range-slider::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #FFFFFF;
      border: 2.5px solid var(--accent, #2563EB);
      cursor: grab;
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.2);
    }

    .reduction-result-row {
      font-size: 10px;
      color: var(--accent, #2563EB);
      font-weight: 600;
      padding-top: 2px;
    }

    :host-context([data-theme="dark"]) .reduction-result-row,
    [data-theme="dark"] .reduction-result-row {
      color: #60A5FA;
    }

    /* ── Transforms Section ── */
    .transforms-btn-row,
    .tool-btn-group {
      display: flex;
      gap: 6px;
    }

    .transform-btn {
      flex: 1;
      height: 30px;
      border-radius: 7px;
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

    /* ── Optimization Profiles Link ── */
    .profiles-link-row {
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px dashed #E2E8F0;
      display: flex;
      align-items: center;
      justify-content: flex-start;
    }

    :host-context([data-theme="dark"]) .profiles-link-row,
    [data-theme="dark"] .profiles-link-row {
      border-top-color: rgba(255, 255, 255, 0.08);
    }

    .profiles-text-link {
      background: transparent;
      border: none;
      color: var(--accent, #2563EB);
      font-size: 11.5px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 6px;
      border-radius: 5px;
      transition: all 0.15s ease;
      text-decoration: underline;
      text-underline-offset: 2.5px;
    }

    .profiles-text-link:hover {
      background: rgba(37, 99, 235, 0.08);
      color: #1D4ED8;
    }

    :host-context([data-theme="dark"]) .profiles-text-link,
    [data-theme="dark"] .profiles-text-link {
      color: #60A5FA;
    }

    :host-context([data-theme="dark"]) .profiles-text-link:hover,
    [data-theme="dark"] .profiles-text-link:hover {
      background: rgba(96, 165, 250, 0.12);
      color: #93C5FD;
    }

    /* ── Reset Defaults Link ── */
    .reset-defaults-link {
      background: transparent;
      border: none;
      color: #64748B;
      font-size: 10.5px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      border-radius: 4px;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="dark"]) .reset-defaults-link,
    [data-theme="dark"] .reset-defaults-link {
      color: #94A3B8;
    }

    .reset-defaults-link:hover {
      color: var(--accent, #2563EB);
      background: rgba(37, 99, 235, 0.08);
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

    .sidebar-primary-cta {
      width: 100%;
      height: var(--tool-cta-height, 48px);
      border-radius: var(--tool-radius-control, 12px);
      background: var(--tool-accent, #2563EB);
      color: var(--tool-accent-contrast, #FFFFFF);
      font-family: var(--tool-font-family, inherit);
      font-size: 15px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
    }

    .sidebar-primary-cta:hover:not(:disabled) {
      filter: brightness(1.08);
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.45);
    }

    .panel-privacy-guarantee {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: var(--tool-type-caption-size, 13px);
      line-height: var(--tool-type-caption-lh, 18px);
      color: var(--text-muted, #64748B);
      margin: 6px 0 0 0;
      text-align: center;
    }

    :host-context([data-theme="dark"]) .panel-privacy-guarantee,
    [data-theme="dark"] .panel-privacy-guarantee {
      color: #94A3B8;
    }

    .privacy-icon {
      color: #10B981;
      flex-shrink: 0;
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
    .sidebar-inner-card.is-sheet-mode,
    :host-context(.mobile-sheet-body) .sidebar-inner-card {
      border: none !important;
      background: transparent !important;
      box-shadow: none !important;
      padding: 0 !important;
      border-radius: 0 !important;
      min-height: auto !important;
    }

    :host-context(.mobile-sheet-body) .sidebar-header {
      display: none !important;
    }

    @media (max-width: 1023px) {
      .sidebar-inner-card {
        border: none !important;
        background: transparent !important;
        box-shadow: none !important;
        padding: 0 !important;
        border-radius: 0 !important;
        min-height: auto !important;
      }
      .sidebar-header {
        display: none !important;
      }
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
  readonly images = input<ImageItem[] | null>(null);

  readonly imageList = computed<ImageItem[]>(() => this.images() ?? this.state?.images() ?? []);

  // Stats for the sidebar action footer
  readonly totalCount = input<number>(0);
  readonly readyCount = input<number>(0);
  readonly completedCount = input<number>(0);
  readonly isCompressing = input<boolean>(false);
  readonly totalSavedBytes = input<number>(0);
  readonly totalSavedPercentage = input<number>(0);
  readonly isMobileSheet = input<boolean>(false);

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

  readonly resizeOptions: CustomSelectOption[] = [
    { value: 'target-size', label: 'Target file size (KB / MB)', badge: 'Default' }
  ];

  readonly unitOptions: CustomSelectOption[] = [
    { value: 'KB', label: 'KB' },
    { value: 'MB', label: 'MB' }
  ];

  readonly singleTargetImage = computed<ImageItem | null>(() => {
    const editing = this.editingItem();
    if (editing) return editing;
    const list = this.imageList();
    if (list.length >= 1) return list[0];
    return null;
  });

  readonly singleImageSuggestions = computed<TargetSuggestion[]>(() => {
    const img = this.singleTargetImage();
    if (!img) return [];
    const refBytes = img.result?.compressedSize && img.result.compressedSize > 0
      ? img.result.compressedSize
      : img.originalSize;
    return suggestTargets(refBytes);
  });

  readonly displayTargetValue = computed<number>(() => {
    const s = this.currentSettings().targetFileSize;
    if (s && s.userDefined) {
      return s.targetValue || 200;
    }
    const single = this.singleTargetImage();
    if (single) {
      const refBytes = single.result?.compressedSize && single.result.compressedSize > 0
        ? single.result.compressedSize
        : single.originalSize;
      return calculateDynamicDefaultTarget(refBytes).targetValue;
    }
    return s?.targetValue || 200;
  });

  readonly displayTargetUnit = computed<'KB' | 'MB'>(() => {
    const s = this.currentSettings().targetFileSize;
    if (s && s.userDefined) {
      return (s.targetUnit === 'MB' ? 'MB' : 'KB');
    }
    const single = this.singleTargetImage();
    if (single) {
      const refBytes = single.result?.compressedSize && single.result.compressedSize > 0
        ? single.result.compressedSize
        : single.originalSize;
      const u = calculateDynamicDefaultTarget(refBytes).targetUnit;
      return u === 'MB' ? 'MB' : 'KB';
    }
    return (s?.targetUnit === 'MB' ? 'MB' : 'KB');
  });

  readonly currentTargetBytes = computed<number>(() => {
    const val = this.displayTargetValue();
    const unit = this.displayTargetUnit();
    const mult = unit === 'MB' ? 1048576 : 1024;
    return val * mult;
  });

  readonly isTargetVeryLowWarning = computed<boolean>(() => {
    const targetBytes = this.currentTargetBytes();
    const img = this.singleTargetImage();
    if (img) {
      const refBytes = img.result?.compressedSize && img.result.compressedSize > 0
        ? img.result.compressedSize
        : img.originalSize;
      return isTargetVeryLow(targetBytes, refBytes);
    }
    return false;
  });

  // Scale slider ("Reduce file size by" 0-90%, default 20%)
  readonly reductionPercent = computed<number>(() => {
    const s = this.currentSettings();
    const scale = s.resize?.percentage ?? 80;
    return Math.max(0, Math.min(90, 100 - scale));
  });

  readonly baseBytesForReduction = computed<number>(() => {
    const single = this.singleTargetImage();
    if (single) {
      return single.result?.compressedSize && single.result.compressedSize > 0
        ? single.result.compressedSize
        : single.originalSize;
    }
    return 24576;
  });

  readonly reductionResult = computed(() => {
    return calculateTargetFromReduction(this.baseBytesForReduction(), this.reductionPercent());
  });

  readonly developerPresets = DEVELOPER_PRESETS;

  readonly developerPresetOptions = computed<CustomSelectOption[]>(() => [
    { value: 'none', label: 'None (Standard)' },
    ...this.developerPresets.map(dp => ({
      value: dp.key,
      label: `${dp.label} (${dp.targetFormat.toUpperCase()}, Q${dp.quality})`,
      sub: dp.description
    }))
  ]);

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

  readonly currentQuality = computed<number>(() => {
    const q = this.currentSettings().quality;
    return Math.max(1, Math.min(100, Math.round(q ?? 80)));
  });

  readonly qualityTierLabel = computed<string>(() => {
    const q = this.currentQuality();
    if (q >= 92) return 'Maximum Quality';
    if (q >= 78) return 'Balanced (Recommended)';
    if (q >= 50) return 'Standard Compression';
    return 'Smallest File Size';
  });

  readonly currentVariants = computed<ImageVariantConfig[]>(() => {
    return this.currentSettings().multiVariant?.variants || DEFAULT_VARIANTS;
  });

  readonly currentAdvanced = computed<AdvancedOptimizationSettings>(() => {
    return this.currentSettings().advancedOptimization || {};
  });

  readonly selectedResizeTargetOption = computed<string>(() => {
    return 'target-size';
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

  onQualitySliderInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const quality = Math.max(1, Math.min(100, Number(target.value) || 80));
    this.emitChange({ quality });
  }

  onResizeTargetOptionSelect(val: string): void {
    const cur = this.currentSettings().targetFileSize;
    const targetValue = cur?.targetValue || 200;
    const targetUnit = cur?.targetUnit || 'KB';
    const mult = targetUnit === 'MB' ? 1024 * 1024 : 1024;
    this.emitChange({
      targetFileSize: {
        enabled: true,
        targetValue,
        targetUnit,
        targetBytes: Math.round(targetValue * mult),
        minQuality: 25
      },
      resize: { enabled: false, mode: 'dimensions', percentage: 100, maintainAspectRatio: true, preventUpscale: true }
    });
  }

  onReductionSliderInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const reduction = Math.max(0, Math.min(90, Number(target.value) || 0));
    const percentage = 100 - reduction;
    this.emitChange({
      resize: {
        enabled: true,
        mode: 'percentage',
        percentage,
        maintainAspectRatio: true,
        preventUpscale: true
      }
    });
  }

  onReductionSliderKeyDown(event: KeyboardEvent): void {
    let cur = this.reductionPercent();
    if (event.key === 'PageDown') {
      event.preventDefault();
      cur = Math.max(0, cur - 10);
    } else if (event.key === 'PageUp') {
      event.preventDefault();
      cur = Math.min(90, cur + 10);
    } else if (event.key === 'Home') {
      event.preventDefault();
      cur = 0;
    } else if (event.key === 'End') {
      event.preventDefault();
      cur = 90;
    } else {
      return;
    }
    this.emitChange({
      resize: {
        enabled: true,
        mode: 'percentage',
        percentage: 100 - cur,
        maintainAspectRatio: true,
        preventUpscale: true
      }
    });
  }

  onPercentageInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const percentage = Math.max(10, Math.min(100, Number(target.value) || 80));
    this.emitChange({
      resize: {
        enabled: true,
        mode: 'percentage',
        percentage,
        maintainAspectRatio: true,
        preventUpscale: true
      }
    });
  }

  async rotateLeft(): Promise<void> {
    const item = this.editingItem();
    if (item) {
      await this.state?.addTransform(item.id, { type: 'rotate', angle: -90 });
    } else {
      await this.state?.addTransformToAll({ type: 'rotate', angle: -90 });
    }
  }

  async rotateRight(): Promise<void> {
    const item = this.editingItem();
    if (item) {
      await this.state?.addTransform(item.id, { type: 'rotate', angle: 90 });
    } else {
      await this.state?.addTransformToAll({ type: 'rotate', angle: 90 });
    }
  }

  async flipHorizontal(): Promise<void> {
    const item = this.editingItem();
    if (item) {
      await this.state?.addTransform(item.id, { type: 'flip', direction: 'horizontal' });
    } else {
      await this.state?.addTransformToAll({ type: 'flip', direction: 'horizontal' });
    }
  }

  onTargetValueInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    let targetValue = Math.max(1, Number(target.value) || 1);
    const currTarget = this.currentSettings().targetFileSize || {
      enabled: true,
      targetValue: 200,
      targetUnit: 'KB',
      targetBytes: 204800,
      minQuality: 25
    };
    const multiplier = currTarget.targetUnit === 'MB' ? 1048576 : 1024;
    const single = this.singleTargetImage();
    if (single && single.originalSize > 0 && targetValue * multiplier > single.originalSize) {
      targetValue = currTarget.targetUnit === 'MB'
        ? Math.max(0.1, Math.floor((single.originalSize / 1048576) * 10) / 10)
        : Math.max(1, Math.floor(single.originalSize / 1024));
      target.value = String(targetValue);
    }
    this.emitChange({
      targetFileSize: {
        ...currTarget,
        enabled: true,
        targetValue,
        targetBytes: Math.round(targetValue * multiplier),
        userDefined: true,
        isDynamicDefault: false
      }
    });
  }

  onTargetUnitSelect(unit: string): void {
    const targetUnit = unit as 'KB' | 'MB';
    const currTarget = this.currentSettings().targetFileSize || {
      enabled: true,
      targetValue: 200,
      targetUnit: 'KB',
      targetBytes: 204800,
      minQuality: 25
    };
    let targetValue = this.displayTargetValue();
    const multiplier = targetUnit === 'MB' ? 1048576 : 1024;
    const single = this.singleTargetImage();
    if (single && single.originalSize > 0 && targetValue * multiplier > single.originalSize) {
      targetValue = targetUnit === 'MB'
        ? Math.max(0.1, Math.floor((single.originalSize / 1048576) * 10) / 10)
        : Math.max(1, Math.floor(single.originalSize / 1024));
    }
    this.emitChange({
      targetFileSize: {
        ...currTarget,
        enabled: true,
        targetUnit,
        targetValue,
        targetBytes: Math.round(targetValue * multiplier),
        userDefined: true,
        isDynamicDefault: false
      }
    });
  }

  onTargetPresetSelect(value: number, unit: 'B' | 'KB' | 'MB'): void {
    const currTarget = this.currentSettings().targetFileSize || {
      enabled: true,
      targetValue: 200,
      targetUnit: 'KB',
      targetBytes: 204800,
      minQuality: 25
    };
    const multiplier = unit === 'MB' ? 1048576 : (unit === 'KB' ? 1024 : 1);
    this.emitChange({
      targetFileSize: {
        ...currTarget,
        enabled: true,
        targetValue: value,
        targetUnit: unit,
        targetBytes: Math.round(value * multiplier),
        userDefined: true,
        isDynamicDefault: false
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

  onDeveloperPresetOptionSelect(val: string): void {
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
    this.globalSettingsChanged.emit({ ...DEFAULT_COMPRESSION_SETTINGS });
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

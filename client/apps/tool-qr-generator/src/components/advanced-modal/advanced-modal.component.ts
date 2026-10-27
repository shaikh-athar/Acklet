// client/apps/tool-qr-generator/src/components/advanced-modal/advanced-modal.component.ts
import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  OnInit,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TsIconComponent } from '@acklet/tool-shell';
import {
  ErrorCorrectionLevel,
  QRMetadata,
  EC_LEVEL_CONFIGS
} from '../../models/qr-generator.models';

const STORAGE_KEY = 'acklet_qr_advanced_settings';

export interface AdvancedSettingsState {
  isAutoEc: boolean;
  manualEc: ErrorCorrectionLevel;
  size: number;
  margin: number;
}

const DEFAULT_SETTINGS: AdvancedSettingsState = {
  isAutoEc: true,
  manualEc: 'M',
  size: 2048,
  margin: 4
};

@Component({
  selector: 'app-qr-advanced-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div
        class="advanced-modal-overlay"
        (click)="onBackdropClick($event)"
        role="dialog"
        aria-modal="true"
        aria-label="Advanced Technical Settings"
      >
        <div class="advanced-modal-card slide-fade-up" (click)="$event.stopPropagation()">
          <!-- Mobile Drag Handle -->
          <div class="modal-sheet-handle" aria-hidden="true"></div>

          <!-- Modal Header -->
          <header class="modal-header">
            <div class="modal-title-group">
              <span class="header-icon-box">
                <ts-icon name="settings" [size]="18" />
              </span>
              <div>
                <h3 class="modal-title">Advanced Settings</h3>
                <p class="modal-subtitle">Technical QR parameters, quiet zone, and encoding diagnostics</p>
              </div>
            </div>
            <button
              type="button"
              class="modal-close-btn"
              (click)="close.emit()"
              aria-label="Close advanced settings dialog"
            >
              <ts-icon name="x" [size]="18" />
            </button>
          </header>

          <!-- Modal Scrollable Body -->
          <div class="modal-body custom-scrollbar">

            <!-- SECTION 1: Error Correction -->
            <section class="settings-section" aria-labelledby="sectionEcTitle">
              <div class="section-header-row">
                <div class="section-title-box">
                  <ts-icon name="shield" class="section-icon" [size]="16" />
                  <h4 id="sectionEcTitle" class="section-title">Error Correction</h4>
                </div>
                <span class="active-badge">Level {{ activeLevel() }} ({{ activeEcConfig().recovery }})</span>
              </div>

              <!-- Mode Selection (Auto vs Manual) -->
              <div class="ec-mode-toggle" role="radiogroup" aria-label="Error Correction Mode">
                <button
                  type="button"
                  class="mode-toggle-btn auto-mode-btn"
                  [class.selected]="isAutoEc()"
                  (click)="setAutoEc(true)"
                >
                  <ts-icon name="sparkles" [size]="14" />
                  <span class="auto-btn-label">Auto</span>
                  <span class="rec-badge">Recommended</span>
                </button>
                <button
                  type="button"
                  class="mode-toggle-btn"
                  [class.selected]="!isAutoEc()"
                  (click)="setAutoEc(false)"
                >
                  <ts-icon name="sliders" [size]="14" />
                  <span>Manual Override</span>
                </button>
              </div>

              <!-- Level Explanation / Rationale -->
              <div class="ec-reason-card" [class.manual-card]="!isAutoEc()">
                <div class="reason-indicator">
                  <ts-icon [name]="isAutoEc() ? 'sparkles' : 'info'" [size]="14" class="reason-icon" />
                  <span class="reason-label">{{ isAutoEc() ? 'Automatic Reason:' : 'Manual Mode:' }}</span>
                </div>
                <p class="reason-text">
                  {{ isAutoEc() ? (autoEcReason() || 'Optimal balance for current content and design') : 'Manual level selected. Automatic density scaling is bypassed.' }}
                </p>
              </div>

              <!-- Manual Level Selection Buttons -->
              <div class="ec-segmented-grid" role="radiogroup" aria-label="Select Error Correction Level">
                @for (lvl of ecLevels; track lvl) {
                  <button
                    type="button"
                    class="ec-level-btn"
                    [class.active]="activeLevel() === lvl"
                    [class.disabled-btn]="isAutoEc()"
                    [disabled]="isAutoEc()"
                    (click)="setManualLevel(lvl)"
                    [title]="ecConfigs[lvl].description"
                  >
                    <span class="level-name">{{ lvl }}</span>
                    <span class="level-recovery">{{ ecConfigs[lvl].recovery }}</span>
                  </button>
                }
              </div>
            </section>

            <!-- SECTION 2: Export Resolution -->
            <section class="settings-section" aria-labelledby="sectionResTitle">
              <div class="section-header-row">
                <div class="section-title-box">
                  <ts-icon name="maximize-2" class="section-icon" [size]="16" />
                  <h4 id="sectionResTitle" class="section-title">Export Resolution</h4>
                </div>
                <div class="resolution-input-wrap">
                  <input
                    type="number"
                    class="px-number-input"
                    min="128"
                    max="4096"
                    step="32"
                    [ngModel]="size()"
                    (ngModelChange)="onSizeChange($event)"
                    aria-label="Export pixel width"
                  />
                  <span class="px-suffix">px</span>
                </div>
              </div>

              <!-- Resolution Presets -->
              <div class="preset-chips-row" role="group" aria-label="Resolution Presets">
                @for (preset of sizePresets; track preset) {
                  <button
                    type="button"
                    class="preset-chip"
                    [class.active]="size() === preset"
                    (click)="onSizeChange(preset)"
                  >
                    {{ preset }}px
                  </button>
                }
              </div>

              <!-- Range Slider -->
              <div class="slider-row">
                <input
                  type="range"
                  class="size-range-slider"
                  min="256"
                  max="4096"
                  step="32"
                  [ngModel]="size()"
                  (ngModelChange)="onSizeChange($event)"
                  aria-label="Resolution slider"
                />
                <div class="slider-labels">
                  <span>256px (Web)</span>
                  <span>1024px (Print)</span>
                  <span>2048px (Ultra)</span>
                  <span>4096px (Billboard)</span>
                </div>
              </div>
            </section>

            <!-- SECTION 3: Quiet Zone Margin -->
            <section class="settings-section" aria-labelledby="sectionMarginTitle">
              <div class="section-header-row">
                <div class="section-title-box">
                  <ts-icon name="frame" class="section-icon" [size]="16" />
                  <h4 id="sectionMarginTitle" class="section-title">Margin (Quiet Zone)</h4>
                </div>
                <span class="margin-badge" [class.warning-badge]="margin() < 4">
                  {{ margin() }} {{ margin() === 1 ? 'module' : 'modules' }}
                </span>
              </div>

              <!-- Stepper & Slider Control -->
              <div class="margin-control-row">
                <button
                  type="button"
                  class="margin-step-btn"
                  [disabled]="margin() <= 0"
                  (click)="onMarginChange(margin() - 1)"
                  aria-label="Decrease margin"
                >
                  <ts-icon name="minus" [size]="14" />
                </button>

                <input
                  type="range"
                  class="margin-slider"
                  min="0"
                  max="10"
                  step="1"
                  [ngModel]="margin()"
                  (ngModelChange)="onMarginChange($event)"
                  aria-label="Quiet zone margin in modules"
                />

                <button
                  type="button"
                  class="margin-step-btn"
                  [disabled]="margin() >= 10"
                  (click)="onMarginChange(margin() + 1)"
                  aria-label="Increase margin"
                >
                  <ts-icon name="plus" [size]="14" />
                </button>
              </div>

            </section>

            <!-- SECTION 5: Smart Link Overview -->
            <section class="settings-section" aria-labelledby="sectionSmartTitle">
              <div class="section-header-row">
                <div class="section-title-box">
                  <ts-icon name="activity" class="section-icon" [size]="16" />
                  <h4 id="sectionSmartTitle" class="section-title">Smart Link Management</h4>
                </div>
              </div>

              <div class="smart-link-info-box">
                <div class="smart-info-content">
                  <ts-icon [name]="isSmartLink() ? 'zap' : 'globe'" [size]="20" class="smart-icon" />
                  <div>
                    <h5 class="smart-heading">
                      {{ isSmartLink() ? 'Dynamic Smart Link Active' : 'Direct Offline Encoding' }}
                    </h5>
                    <p class="smart-desc">
                      {{ isSmartLink()
                        ? 'This QR code encodes an ultra-short dynamic link. You can change destination URLs or text anytime and track real-time scans.'
                        : 'Content is embedded directly into the matrix. Scannable completely offline without any intermediate servers.' }}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  class="btn-open-dynamic-tab"
                  (click)="onOpenDynamicLinksTab()"
                >
                  <ts-icon name="graph-star" [size]="14" />
                  <span>Open Dynamic Links Tab</span>
                </button>
              </div>
            </section>

          </div>

          <!-- Modal Footer -->
          <footer class="modal-footer">
            <button
              type="button"
              class="footer-btn reset-btn"
              (click)="onResetDefaults()"
              title="Reset all advanced settings to defaults"
            >
              <ts-icon name="refresh-cw" [size]="14" />
              <span class="reset-label-full">Reset to Defaults</span>
              <span class="reset-label-short">Reset</span>
            </button>

            <button
              type="button"
              class="footer-btn done-btn"
              (click)="close.emit()"
            >
              <ts-icon name="check" [size]="14" />
              <span>Done</span>
            </button>
          </footer>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: contents;
    }

    .advanced-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-sheet-handle {
      display: none;
    }

    .advanced-modal-card {
      width: 100%;
      max-width: 560px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      border-radius: 16px;
      background: var(--ts-surface-raised, var(--surface, #141416));
      border: 1px solid var(--ts-surface-raised-border, var(--border, rgba(255, 255, 255, 0.1)));
      box-shadow: var(--ts-shadow-lg, 0 20px 40px rgba(0, 0, 0, 0.35));
      overflow: hidden;
      color: var(--ts-text, var(--text, #fcfcfc));
    }

    /* Header */
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 16px 20px;
      border-bottom: 1px solid var(--ts-border, var(--border-subtle, rgba(255, 255, 255, 0.08)));
      background: var(--ts-surface-raised, var(--surface, #141416));
      flex-shrink: 0;
    }

    .modal-title-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-icon-box {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: var(--accent-soft, color-mix(in srgb, var(--accent, #60a5fa) 12%, transparent));
      color: var(--accent, var(--tool-accent, #60a5fa));
    }

    .modal-title {
      margin: 0;
      font-size: 1.12rem;
      font-weight: 700;
      color: var(--ts-text, var(--text, #fcfcfc));
      letter-spacing: -0.01em;
    }

    .modal-subtitle {
      margin: 2px 0 0;
      font-size: 0.78rem;
      color: var(--ts-text-muted, var(--text-2, #b3b3b8));
    }

    .modal-close-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: var(--ts-text-muted, var(--text-2, #b3b3b8));
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .modal-close-btn:hover {
      background: var(--ts-border, var(--border-subtle, rgba(255, 255, 255, 0.08)));
      color: var(--ts-text, var(--text, #fcfcfc));
    }

    /* Body */
    .modal-body {
      padding: 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 22px;
    }

    .settings-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding-bottom: 18px;
      border-bottom: 1px solid var(--ts-border, var(--border-subtle, rgba(255, 255, 255, 0.08)));
    }

    .settings-section:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .section-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
    }

    .section-title-box {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-icon {
      color: var(--accent, var(--tool-accent, #60a5fa));
    }

    .section-title {
      margin: 0;
      font-size: 0.92rem;
      font-weight: 700;
      color: var(--ts-text, var(--text, #fcfcfc));
      white-space: nowrap;
    }

    .active-badge {
      font-size: 0.76rem;
      font-family: var(--ts-font-mono, monospace);
      font-weight: 700;
      color: var(--accent, var(--tool-accent, #60a5fa));
      background: var(--accent-soft, color-mix(in srgb, var(--accent, #60a5fa) 12%, transparent));
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid var(--accent-border, rgba(255, 255, 255, 0.1));
      white-space: nowrap;
    }

    /* Error Correction Section */
    .ec-mode-toggle {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
      background: var(--bg-muted, var(--surface-2, #1a1b1e));
      padding: 3px;
      border-radius: 8px;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    .mode-toggle-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 6px 6px;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: var(--ts-text-muted, var(--text-2, #b3b3b8));
      font-size: 0.76rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
      min-width: 0;
      overflow: hidden;
    }

    .auto-mode-btn {
      min-width: 0;
    }

    .auto-btn-label {
      white-space: nowrap;
    }

    .rec-badge {
      display: inline-block;
      font-size: 0.6rem;
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 4px;
      background: var(--accent-soft, rgba(96, 165, 250, 0.18));
      color: var(--accent, #3b82f6);
      white-space: nowrap;
      letter-spacing: 0.01em;
      flex-shrink: 0;
    }

    .mode-toggle-btn.selected {
      background: var(--bg-card, var(--surface-1, #141416));
      color: var(--ts-text, var(--text, #fcfcfc));
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    .ec-reason-card {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 10px 12px;
      border-radius: 8px;
      background: var(--accent-soft, color-mix(in srgb, var(--accent, #60a5fa) 10%, transparent));
      border: 1px solid var(--accent-border, color-mix(in srgb, var(--accent, #60a5fa) 24%, transparent));
      font-size: 0.78rem;
    }

    .ec-reason-card.manual-card {
      background: var(--warning-soft, rgba(245, 158, 11, 0.1));
      border-color: var(--warning-border, rgba(245, 158, 11, 0.25));
    }

    .reason-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 700;
      color: var(--accent, var(--tool-accent, #60a5fa));
    }

    .manual-card .reason-indicator {
      color: var(--warning, #d97706);
    }

    .reason-icon {
      flex-shrink: 0;
    }

    .reason-text {
      margin: 0;
      color: var(--ts-text, var(--text, #fcfcfc));
      line-height: 1.4;
    }

    .ec-segmented-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }

    .ec-level-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 8px 4px;
      border-radius: 8px;
      border: 1px solid var(--ts-border, var(--border-subtle, rgba(255, 255, 255, 0.08)));
      background: var(--ts-surface-raised, var(--surface-1, #141416));
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .ec-level-btn:hover:not(:disabled) {
      border-color: var(--accent, #60a5fa);
      background: color-mix(in srgb, var(--accent, #60a5fa) 8%, transparent);
    }

    .ec-level-btn.active {
      border-color: var(--accent, #60a5fa);
      background: var(--accent-soft, color-mix(in srgb, var(--accent, #60a5fa) 14%, transparent));
      box-shadow: 0 0 0 2px var(--accent-border, rgba(96, 165, 250, 0.3));
    }

    .ec-level-btn.disabled-btn {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .level-name {
      font-size: 0.95rem;
      font-weight: 800;
      color: var(--ts-text, var(--text, #fcfcfc));
    }

    .level-recovery {
      font-size: 0.72rem;
      color: var(--ts-text-muted, var(--text-2, #b3b3b8));
      font-weight: 500;
    }

    /* Resolution Section */
    .resolution-input-wrap {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .px-number-input {
      width: 72px;
      padding: 4px 6px;
      border-radius: 6px;
      border: 1px solid var(--ts-border, var(--border-subtle, rgba(255, 255, 255, 0.12)));
      background: var(--ts-surface-inset, var(--surface-2, #1a1b1e));
      color: var(--ts-text, var(--text, #fcfcfc));
      font-size: 0.84rem;
      font-weight: 600;
      text-align: right;
      outline: none;
    }

    :host-context([data-theme="light"]) .px-number-input,
    [data-theme="light"] .px-number-input {
      background: #f8fafc;
      border-color: #cbd5e1;
      color: #0f172a;
    }

    .px-suffix {
      font-size: 0.78rem;
      color: var(--ts-text-muted, var(--text-2, #b3b3b8));
      font-weight: 600;
    }

    :host-context([data-theme="light"]) .px-suffix,
    [data-theme="light"] .px-suffix {
      color: #64748b;
    }

    .preset-chips-row {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 6px;
    }

    .preset-chip {
      min-width: 0;
      padding: 6px 2px;
      border-radius: 6px;
      border: 1px solid var(--border, var(--border-subtle, rgba(255, 255, 255, 0.12)));
      background: var(--bg-muted, var(--surface-2, #1a1b1e));
      color: var(--text, #fcfcfc);
      font-size: 0.76rem;
      font-weight: 600;
      text-align: center;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .preset-chip:hover:not(.active) {
      background: var(--ts-border, var(--border-subtle, rgba(255, 255, 255, 0.08)));
    }

    .preset-chip.active {
      background: #2563eb !important;
      border-color: #1d4ed8 !important;
      color: #ffffff !important;
      font-weight: 700 !important;
      box-shadow: 0 1px 3px rgba(37, 99, 235, 0.35);
    }

    :host-context([data-theme="light"]) .preset-chip,
    [data-theme="light"] .preset-chip {
      background: #f1f5f9;
      border-color: #cbd5e1;
      color: #0f172a;
    }

    :host-context([data-theme="light"]) .preset-chip:hover:not(.active),
    [data-theme="light"] .preset-chip:hover:not(.active) {
      background: #e2e8f0;
      color: #0f172a;
    }

    :host-context([data-theme="light"]) .preset-chip.active,
    [data-theme="light"] .preset-chip.active {
      background: #2563eb !important;
      border-color: #1d4ed8 !important;
      color: #ffffff !important;
    }

    :host-context([data-theme="dark"]) .preset-chip,
    [data-theme="dark"] .preset-chip {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.12);
      color: #fcfcfc;
    }

    :host-context([data-theme="dark"]) .preset-chip.active,
    [data-theme="dark"] .preset-chip.active {
      background: #2563eb !important;
      border-color: #3b82f6 !important;
      color: #ffffff !important;
    }

    .slider-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .size-range-slider, .margin-slider {
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: var(--ts-border, var(--border-subtle, rgba(255, 255, 255, 0.12)));
      outline: none;
      cursor: pointer;
      accent-color: var(--accent);
    }

    .slider-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.68rem;
      color: var(--ts-text-muted, var(--text-2, #b3b3b8));
      gap: 4px;
      overflow: hidden;
    }

    .slider-labels span {
      white-space: nowrap;
    }

    .slider-labels span:last-child {
      text-align: right;
    }

    /* Margin Section */
    .margin-badge {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--ts-text, var(--text, #fcfcfc));
      background: var(--ts-surface-inset, var(--surface-2, #1a1b1e));
      padding: 2px 8px;
      border-radius: 6px;
    }

    .margin-badge.warning-badge {
      background: var(--warning-soft, rgba(245, 158, 11, 0.15));
      color: var(--warning, #f59e0b);
      border: 1px solid var(--warning-border, rgba(245, 158, 11, 0.3));
    }

    .margin-control-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .margin-step-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      border: 1px solid var(--ts-border, var(--border-subtle, rgba(255, 255, 255, 0.12)));
      background: var(--ts-surface-raised, var(--surface-1, #141416));
      color: var(--ts-text, var(--text, #fcfcfc));
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .margin-step-btn:hover:not(:disabled) {
      background: var(--ts-border, var(--border-subtle, rgba(255, 255, 255, 0.08)));
    }

    .margin-step-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .margin-warning-alert {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 8px;
      background: var(--warning-soft, rgba(245, 158, 11, 0.12));
      border: 1px solid var(--warning-border, rgba(245, 158, 11, 0.25));
      color: var(--ts-text, var(--text, #fcfcfc));
      font-size: 0.78rem;
      line-height: 1.35;
    }

    .warning-icon {
      color: var(--warning, #f59e0b);
      flex-shrink: 0;
      margin-top: 1px;
    }

    .section-help-text {
      margin: 0;
      font-size: 0.76rem;
      color: var(--ts-text-muted, var(--text-2, #b3b3b8));
      line-height: 1.35;
    }

    /* Encoding Info Section */
    .mode-tag {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 0.74rem;
      font-weight: 600;
      background: var(--ts-surface-inset, var(--surface-2, #1a1b1e));
      color: var(--ts-text, var(--text, #fcfcfc));
    }

    .mode-tag.dynamic-tag {
      background: var(--info-soft, rgba(56, 189, 248, 0.12));
      color: var(--info, #38bdf8);
      border: 1px solid var(--info-border, rgba(56, 189, 248, 0.25));
    }

    .meta-diagnostics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 8px 10px;
      border-radius: 8px;
      background: var(--ts-surface-inset, var(--surface-2, #1a1b1e));
      border: 1px solid var(--ts-border, var(--border-subtle, rgba(255, 255, 255, 0.08)));
    }

    .meta-label {
      font-size: 0.72rem;
      color: var(--ts-text-muted, var(--text-2, #b3b3b8));
      font-weight: 500;
    }

    .meta-val {
      font-size: 0.78rem;
      color: var(--ts-text, var(--text, #fcfcfc));
      font-weight: 700;
    }

    .capacity-bar-container {
      width: 100%;
    }

    .capacity-bar-track {
      width: 100%;
      height: 8px;
      border-radius: 4px;
      background: var(--ts-border, var(--border-subtle, rgba(255, 255, 255, 0.12)));
      overflow: hidden;
    }

    .capacity-bar-fill {
      height: 100%;
      border-radius: 4px;
      background: var(--accent);
      transition: width 0.3s ease;
    }

    .capacity-bar-fill.high-fill {
      background: var(--warning, #f59e0b);
    }

    .payload-block {
      display: flex;
      flex-direction: column;
      gap: 4px;
      border-radius: 8px;
      background: var(--ts-surface-inset, var(--surface-2, #1a1b1e));
      border: 1px solid var(--ts-border, var(--border-subtle, rgba(255, 255, 255, 0.08)));
      padding: 8px 12px;
    }

    .payload-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .payload-title {
      font-size: 0.74rem;
      font-weight: 600;
      color: var(--ts-text-muted, var(--text-2, #b3b3b8));
    }

    .copy-payload-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid var(--ts-border, var(--border-subtle, rgba(255, 255, 255, 0.12)));
      background: var(--ts-surface-raised, var(--surface-1, #141416));
      color: var(--ts-text-muted, var(--text-2, #b3b3b8));
      font-size: 0.72rem;
      font-weight: 500;
      cursor: pointer;
    }

    .payload-code {
      margin: 0;
      max-height: 80px;
      overflow-y: auto;
      font-size: 0.76rem;
      font-family: var(--ts-font-mono, monospace);
      color: var(--ts-text, var(--text, #fcfcfc));
      word-break: break-all;
      white-space: pre-wrap;
    }

    /* Smart Link Section */
    .smart-link-info-box {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 14px;
      border-radius: 10px;
      background: var(--accent-soft, color-mix(in srgb, var(--accent, #60a5fa) 8%, transparent));
      border: 1px solid var(--accent-border, color-mix(in srgb, var(--accent, #60a5fa) 20%, transparent));
    }

    .smart-info-content {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .smart-icon {
      color: var(--accent, var(--tool-accent, #60a5fa));
      flex-shrink: 0;
      margin-top: 2px;
    }

    .smart-heading {
      margin: 0;
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--ts-text, var(--text, #fcfcfc));
    }

    .smart-desc {
      margin: 4px 0 0;
      font-size: 0.78rem;
      color: var(--ts-text-muted, var(--text-2, #b3b3b8));
      line-height: 1.4;
    }

    .btn-open-dynamic-tab {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 8px;
      border: 1px solid var(--accent-border, color-mix(in srgb, var(--accent, #60a5fa) 35%, transparent));
      background: var(--ts-surface-raised, var(--surface-1, #141416));
      color: var(--accent, var(--tool-accent, #60a5fa));
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-open-dynamic-tab:hover {
      background: color-mix(in srgb, var(--accent, #60a5fa) 12%, transparent);
    }

    /* Footer */
    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 20px;
      border-top: 1px solid var(--ts-border, var(--border-subtle, rgba(255, 255, 255, 0.08)));
      background: var(--ts-surface-raised, var(--surface, #141416));
      flex-shrink: 0;
    }

    .footer-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 16px;
      border-radius: 8px;
      font-size: 0.84rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .reset-btn {
      border: 1px solid var(--ts-border, var(--border, rgba(255, 255, 255, 0.12)));
      background: var(--ts-surface-raised, var(--surface, #141416));
      color: var(--ts-text, var(--text, #fcfcfc));
    }

    .reset-btn:hover {
      background: var(--ts-surface-inset, var(--surface-2, rgba(255, 255, 255, 0.08)));
      color: var(--ts-text, var(--text, #fcfcfc));
    }

    .reset-label-full {
      display: inline;
    }

    .reset-label-short {
      display: none;
    }

    .done-btn {
      border: 1px solid var(--accent, #3b82f6);
      background: var(--accent, #3b82f6);
      color: #ffffff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    .done-btn:hover {
      background: color-mix(in srgb, var(--accent, #3b82f6) 85%, #000);
      border-color: color-mix(in srgb, var(--accent, #3b82f6) 85%, #000);
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
    }

    /* Explicit Dual-Theme: Light Theme High-Contrast Polish */
    :host-context([data-theme="light"]) .advanced-modal-card,
    [data-theme="light"] .advanced-modal-card {
      background: #FFFFFF;
      border-color: rgba(15, 23, 42, 0.12);
      box-shadow: 0 20px 48px -12px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(15, 23, 42, 0.08);
      color: #09090B;
    }

    :host-context([data-theme="light"]) .modal-header,
    [data-theme="light"] .modal-header {
      background: #FFFFFF;
      border-bottom-color: rgba(15, 23, 42, 0.08);
    }

    :host-context([data-theme="light"]) .modal-title,
    [data-theme="light"] .modal-title {
      color: #09090B;
    }

    :host-context([data-theme="light"]) .modal-subtitle,
    [data-theme="light"] .modal-subtitle {
      color: #64748B;
    }

    :host-context([data-theme="light"]) .header-icon-box,
    [data-theme="light"] .header-icon-box {
      background: rgba(37, 99, 235, 0.1);
      color: #2563EB;
    }

    :host-context([data-theme="light"]) .modal-close-btn,
    [data-theme="light"] .modal-close-btn {
      color: #64748B;
    }

    :host-context([data-theme="light"]) .modal-close-btn:hover,
    [data-theme="light"] .modal-close-btn:hover {
      background: #F1F5F9;
      color: #09090B;
    }

    :host-context([data-theme="light"]) .settings-section,
    [data-theme="light"] .settings-section {
      border-bottom-color: rgba(15, 23, 42, 0.06);
    }

    :host-context([data-theme="light"]) .section-title,
    [data-theme="light"] .section-title {
      color: #09090B;
    }

    :host-context([data-theme="light"]) .section-icon,
    [data-theme="light"] .section-icon {
      color: #2563EB;
    }

    :host-context([data-theme="light"]) .active-badge,
    [data-theme="light"] .active-badge {
      background: rgba(37, 99, 235, 0.08);
      color: #2563EB;
      border-color: rgba(37, 99, 235, 0.25);
    }

    :host-context([data-theme="light"]) .ec-mode-toggle,
    [data-theme="light"] .ec-mode-toggle {
      background: #F1F5F9;
      border-color: #E2E8F0;
    }

    :host-context([data-theme="light"]) .mode-toggle-btn,
    [data-theme="light"] .mode-toggle-btn {
      color: #64748B;
    }

    :host-context([data-theme="light"]) .mode-toggle-btn.selected,
    [data-theme="light"] .mode-toggle-btn.selected {
      background: #FFFFFF;
      color: #09090B;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
    }

    :host-context([data-theme="light"]) .rec-badge,
    [data-theme="light"] .rec-badge {
      background: rgba(37, 99, 235, 0.12);
      color: #2563EB;
    }

    :host-context([data-theme="light"]) .ec-reason-card,
    [data-theme="light"] .ec-reason-card {
      background: rgba(37, 99, 235, 0.06);
      border-color: rgba(37, 99, 235, 0.2);
    }

    :host-context([data-theme="light"]) .reason-text,
    [data-theme="light"] .reason-text {
      color: #1E293B;
    }

    :host-context([data-theme="light"]) .ec-reason-card.manual-card,
    [data-theme="light"] .ec-reason-card.manual-card {
      background: #FFFBEB;
      border-color: #FDE68A;
    }

    :host-context([data-theme="light"]) .manual-card .reason-text,
    [data-theme="light"] .manual-card .reason-text {
      color: #92400E;
    }

    :host-context([data-theme="light"]) .manual-card .reason-indicator,
    [data-theme="light"] .manual-card .reason-indicator {
      color: #B45309;
    }

    :host-context([data-theme="light"]) .ec-level-btn,
    [data-theme="light"] .ec-level-btn {
      background: #FFFFFF;
      border-color: #CBD5E1;
    }

    :host-context([data-theme="light"]) .ec-level-btn:hover:not(:disabled),
    [data-theme="light"] .ec-level-btn:hover:not(:disabled) {
      background: #F8FAFC;
      border-color: #93C5FD;
    }

    :host-context([data-theme="light"]) .ec-level-btn.active,
    [data-theme="light"] .ec-level-btn.active {
      background: #EFF6FF;
      border-color: #2563EB;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.25);
    }

    :host-context([data-theme="light"]) .level-name,
    [data-theme="light"] .level-name {
      color: #09090B;
    }

    :host-context([data-theme="light"]) .ec-level-btn.active .level-name,
    [data-theme="light"] .ec-level-btn.active .level-name {
      color: #1D4ED8;
    }

    :host-context([data-theme="light"]) .level-recovery,
    [data-theme="light"] .level-recovery {
      color: #64748B;
    }

    :host-context([data-theme="light"]) .ec-level-btn.active .level-recovery,
    [data-theme="light"] .ec-level-btn.active .level-recovery {
      color: #2563EB;
    }

    :host-context([data-theme="light"]) .size-range-slider,
    :host-context([data-theme="light"]) .margin-slider,
    [data-theme="light"] .size-range-slider,
    [data-theme="light"] .margin-slider {
      background: #E2E8F0;
      accent-color: #2563EB;
    }

    :host-context([data-theme="light"]) .slider-labels,
    [data-theme="light"] .slider-labels {
      color: #64748B;
    }

    :host-context([data-theme="light"]) .margin-badge,
    [data-theme="light"] .margin-badge {
      background: #F1F5F9;
      color: #09090B;
    }

    :host-context([data-theme="light"]) .margin-step-btn,
    [data-theme="light"] .margin-step-btn {
      background: #FFFFFF;
      border-color: #CBD5E1;
      color: #09090B;
    }

    :host-context([data-theme="light"]) .margin-step-btn:hover:not(:disabled),
    [data-theme="light"] .margin-step-btn:hover:not(:disabled) {
      background: #F1F5F9;
    }

    :host-context([data-theme="light"]) .margin-warning-alert,
    [data-theme="light"] .margin-warning-alert {
      background: #FFFBEB;
      border-color: #FDE68A;
      color: #92400E;
    }

    :host-context([data-theme="light"]) .section-help-text,
    [data-theme="light"] .section-help-text {
      color: #64748B;
    }

    :host-context([data-theme="light"]) .mode-tag,
    [data-theme="light"] .mode-tag {
      background: #F1F5F9;
      color: #09090B;
    }

    :host-context([data-theme="light"]) .meta-item,
    [data-theme="light"] .meta-item {
      background: #F8FAFC;
      border-color: #E2E8F0;
    }

    :host-context([data-theme="light"]) .meta-label,
    [data-theme="light"] .meta-label {
      color: #64748B;
    }

    :host-context([data-theme="light"]) .meta-val,
    [data-theme="light"] .meta-val {
      color: #09090B;
    }

    :host-context([data-theme="light"]) .capacity-bar-track,
    [data-theme="light"] .capacity-bar-track {
      background: #E2E8F0;
    }

    :host-context([data-theme="light"]) .payload-block,
    [data-theme="light"] .payload-block {
      background: #F8FAFC;
      border-color: #E2E8F0;
    }

    :host-context([data-theme="light"]) .payload-title,
    [data-theme="light"] .payload-title {
      color: #64748B;
    }

    :host-context([data-theme="light"]) .payload-code,
    [data-theme="light"] .payload-code {
      color: #09090B;
    }

    :host-context([data-theme="light"]) .copy-payload-btn,
    [data-theme="light"] .copy-payload-btn {
      background: #FFFFFF;
      border-color: #E2E8F0;
      color: #64748B;
    }

    :host-context([data-theme="light"]) .smart-link-info-box,
    [data-theme="light"] .smart-link-info-box {
      background: #EFF6FF;
      border-color: #BFDBFE;
    }

    :host-context([data-theme="light"]) .smart-heading,
    [data-theme="light"] .smart-heading {
      color: #1E3A8A;
    }

    :host-context([data-theme="light"]) .smart-desc,
    [data-theme="light"] .smart-desc {
      color: #1E40AF;
    }

    :host-context([data-theme="light"]) .btn-open-dynamic-tab,
    [data-theme="light"] .btn-open-dynamic-tab {
      background: #FFFFFF;
      border-color: #93C5FD;
      color: #1D4ED8;
    }

    :host-context([data-theme="light"]) .modal-footer,
    [data-theme="light"] .modal-footer {
      background: #FFFFFF;
      border-top-color: rgba(15, 23, 42, 0.08);
    }

    :host-context([data-theme="light"]) .reset-btn,
    [data-theme="light"] .reset-btn {
      background: #F8FAFC;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    :host-context([data-theme="light"]) .reset-btn:hover,
    [data-theme="light"] .reset-btn:hover {
      background: #F1F5F9;
      color: #09090B;
    }

    :host-context([data-theme="light"]) .modal-sheet-handle,
    [data-theme="light"] .modal-sheet-handle {
      background: rgba(15, 23, 42, 0.2);
    }

    @media (max-width: 640px) {
      .advanced-modal-overlay {
        padding: 0;
        align-items: flex-end;
      }

      .modal-sheet-handle {
        display: block;
        width: 38px;
        height: 4px;
        border-radius: 2px;
        background: var(--border, rgba(128, 128, 128, 0.35));
        margin: 10px auto 4px auto;
        flex-shrink: 0;
      }

      .advanced-modal-card {
        width: 100%;
        max-width: 100%;
        max-height: min(90dvh, 90vh);
        border-radius: 20px 20px 0 0;
        border-left: none;
        border-right: none;
        border-bottom: none;
        border-top: 1px solid var(--border, rgba(255, 255, 255, 0.1));
        margin: 0;
      }

      .modal-header {
        position: sticky;
        top: 0;
        z-index: 10;
        padding: 12px 16px;
      }

      .modal-body {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        padding: 16px;
        gap: 18px;
      }

      .meta-diagnostics-grid {
        grid-template-columns: 1fr;
      }

      .preset-chips-row {
        gap: 4px;
      }

      .preset-chip {
        padding: 6px 2px;
        font-size: 0.72rem;
      }

      .modal-footer {
        position: sticky;
        bottom: 0;
        z-index: 10;
        padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px)) 16px;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .reset-label-full {
        display: none;
      }

      .reset-label-short {
        display: inline;
      }

      .reset-btn {
        flex: 0 0 auto;
        padding: 8px 12px;
        font-size: 0.8rem;
      }

      .done-btn {
        flex: 1 1 auto;
        justify-content: center;
        padding: 9px 16px;
        font-size: 0.86rem;
        font-weight: 700;
      }
    }
  `]
})
export class AdvancedModalComponent implements OnInit {
  readonly isOpen = input<boolean>(false);
  readonly errorCorrection = input<ErrorCorrectionLevel>('M');
  readonly isAutoEc = input<boolean>(true);
  readonly autoEcReason = input<string | undefined>(undefined);
  readonly size = input<number>(2048);
  readonly margin = input<number>(4);
  readonly isSmartLink = input<boolean>(false);
  readonly metadata = input<QRMetadata | null | undefined>(undefined);
  readonly formattedPayload = input<string | undefined>(undefined);

  readonly close = output<void>();
  readonly errorCorrectionChange = output<ErrorCorrectionLevel>();
  readonly isAutoEcChange = output<boolean>();
  readonly sizeChange = output<number>();
  readonly marginChange = output<number>();
  readonly resetDefaults = output<void>();
  readonly openDynamicLinks = output<void>();

  readonly ecLevels: ErrorCorrectionLevel[] = ['L', 'M', 'Q', 'H'];
  readonly ecConfigs = EC_LEVEL_CONFIGS;
  readonly sizePresets = [256, 512, 1024, 2048, 4096];

  readonly copied = signal<boolean>(false);

  readonly activeLevel = computed(() => this.errorCorrection());
  readonly activeEcConfig = computed(() => this.ecConfigs[this.activeLevel()] || this.ecConfigs['M']);

  getModulesPerSide(version: number): number {
    return 17 + (version || 1) * 4;
  }

  getTotalModules(version: number): number {
    const side = this.getModulesPerSide(version);
    return side * side;
  }

  ngOnInit(): void {
    this.loadSavedSettings();
  }

  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) {
      this.close.emit();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    this.close.emit();
  }

  setAutoEc(val: boolean): void {
    this.isAutoEcChange.emit(val);
    this.persistSettings({ isAutoEc: val });
  }

  setManualLevel(lvl: ErrorCorrectionLevel): void {
    this.isAutoEcChange.emit(false);
    this.errorCorrectionChange.emit(lvl);
    this.persistSettings({ isAutoEc: false, manualEc: lvl });
  }

  onSizeChange(val: number | string): void {
    const num = Math.max(128, Math.min(4096, Number(val) || 1024));
    this.sizeChange.emit(num);
    this.persistSettings({ size: num });
  }

  onMarginChange(val: number | string): void {
    const num = Math.max(0, Math.min(10, Number(val) || 0));
    this.marginChange.emit(num);
    this.persistSettings({ margin: num });
  }

  onResetDefaults(): void {
    this.isAutoEcChange.emit(DEFAULT_SETTINGS.isAutoEc);
    this.errorCorrectionChange.emit(DEFAULT_SETTINGS.manualEc);
    this.sizeChange.emit(DEFAULT_SETTINGS.size);
    this.marginChange.emit(DEFAULT_SETTINGS.margin);
    this.resetDefaults.emit();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }

  onOpenDynamicLinksTab(): void {
    this.close.emit();
    this.openDynamicLinks.emit();
  }

  copyPayload(): void {
    const payload = this.formattedPayload();
    if (!payload) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(payload).then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      });
    }
  }

  private loadSavedSettings(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const state: Partial<AdvancedSettingsState> = JSON.parse(raw);
        if (state.isAutoEc !== undefined) {
          this.isAutoEcChange.emit(state.isAutoEc);
        }
        if (state.manualEc) {
          this.errorCorrectionChange.emit(state.manualEc);
        }
        if (state.size) {
          this.sizeChange.emit(state.size);
        }
        if (state.margin !== undefined) {
          this.marginChange.emit(state.margin);
        }
      }
    } catch {}
  }

  private persistSettings(updates: Partial<AdvancedSettingsState>): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const current: AdvancedSettingsState = raw ? JSON.parse(raw) : { ...DEFAULT_SETTINGS };
      const merged = { ...current, ...updates };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {}
  }
}

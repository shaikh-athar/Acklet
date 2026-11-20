// apps/tool-image-compressor/src/components/customization-modal/customization-modal.component.ts
import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
  signal,
  effect,
  HostListener,
  inject,
  ElementRef,
  OnInit,
  OnDestroy
} from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TsIconComponent } from '@acklet/tool-shell';
import {
  ImageItem,
  CompressionSettings,
  IndividualCompressionOverrides,
  OutputFormatOption,
  ResizeMode
} from '../../models/compressor.models';
import { CustomSelectComponent, CustomSelectOption } from '../custom-select/custom-select.component';
import { CompressorStateService } from '../../services/compressor-state.service';
import { ImageCompressionService } from '../../services/image-compression.service';
import { CompressorTelemetryService } from '../../services/compressor-telemetry.service';
import {
  calculateTargetFromReduction,
  calculateDynamicDefaultTarget,
  clampTargetBytes,
  formatBytes
} from '../../services/target-suggestion.util';
import {
  AchievableSizeDiscoveryService,
  AchievableSizeProfile,
  AchievableCandidate,
  AchievableQualityOption,
  QuickSizeOption
} from '../../services/achievable-size-discovery.service';

@Component({
  selector: 'app-customization-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent, CustomSelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="modal-backdrop"
      [class.is-closing]="isClosing()"
      (click)="requestClose()"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="'Customize ' + item().originalName"
    >
      <div
        class="customization-dialog"
        [class.is-closing]="isClosing()"
        (click)="$event.stopPropagation()"
        tabindex="-1"
      >
        <!-- Modal Header -->
        <header class="modal-header">
          <div class="header-left">
            <div class="header-icon-wrap" aria-hidden="true">
              <ts-icon name="sliders" [size]="16" />
            </div>
            <div class="filename-header-row">
              <div class="modal-header-top-row">
                <h2 class="modal-title modal-header-title-row">Customize Image</h2>
                @if (item().individualSettings.hasCustomSettings) {
                  <span class="customized-indicator-pill">
                    <span class="customized-dot"></span>
                    <span>Customized</span>
                  </span>
                } @else {
                  <span class="global-inheriting-pill font-mono">Using Global Settings</span>
                }
              </div>

              @if (isEditingName()) {
                <div class="name-edit-inline">
                  <input
                    #nameInput
                    type="text"
                    class="name-input-field font-mono"
                    [value]="editNameValue()"
                    (input)="onNameInputChange($event)"
                    (keydown.enter)="saveFileName()"
                    (keydown.escape)="cancelFileNameEdit()"
                    maxlength="100"
                    aria-label="Edit file name"
                  />
                  <span class="name-ext-static font-mono">.{{ headerExtension() }}</span>
                  <button type="button" class="name-action-btn check" (click)="saveFileName()" title="Save name">
                    <ts-icon name="check" [size]="12" />
                  </button>
                  <button type="button" class="name-action-btn cancel" (click)="cancelFileNameEdit()" title="Cancel">
                    <ts-icon name="x" [size]="12" />
                  </button>
                </div>
                @if (nameError()) {
                  <span class="name-error-text font-mono">{{ nameError() }}</span>
                }
              } @else {
                <div class="name-display-inline font-mono">
                  <span class="name-text modal-filename-base" [title]="item().originalName">{{ item().nameWithoutExt }}</span><span class="ext-text modal-filename-ext">.{{ headerExtension() }}</span>
                  <button type="button" class="name-pencil-btn" (click)="startNameEdit()" title="Rename file" aria-label="Rename file">
                    <ts-icon name="edit-2" [size]="12" />
                  </button>
                </div>
              }
            </div>
          </div>

          <button
            type="button"
            class="modal-close-btn"
            (click)="requestClose()"
            title="Close dialog (Escape)"
            aria-label="Close dialog"
          >
            <ts-icon name="x" [size]="15" />
          </button>
        </header>

        <!-- Modal Body (Compact, no scroll) -->
        <div class="modal-body-content">

          <!-- Preview & Capability Card -->
          <div class="preview-mini-card">
            <div class="preview-thumb-box">
              @if (previewError()) {
                <div class="thumb-fallback-box" aria-label="Image preview">
                  <ts-icon name="image" [size]="20" />
                </div>
              } @else {
                <img
                  [src]="previewThumbnailUrl()"
                  [alt]="item().originalName"
                  class="thumb-img"
                  [class.is-re-encoding]="isReEncoding()"
                  (error)="previewError.set(true)"
                />
              }
              @if (isReEncoding()) {
                <div class="processing-overlay" aria-live="polite" role="status">
                  <div class="processing-spinner-wrap">
                    <svg class="processing-spinner" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-dasharray="42 20" stroke-linecap="round"/>
                    </svg>
                  </div>
                </div>
              }
            </div>
            <div class="preview-info-box">
              <div class="preview-title-row">
                <span class="preview-format-pill font-mono">{{ headerExtension() | uppercase }}</span>
                <span class="preview-res font-mono">{{ headerWidth() }} &times; {{ headerHeight() }} px</span>
                <span class="preview-size-tag font-mono">&bull; {{ formatBytes(headerSize()) }}</span>
              </div>
              @if (previewError()) {
                <button type="button" class="btn-preview-retry font-mono" (click)="scheduleReEncode()">
                  <ts-icon name="rotate-ccw" [size]="10" />
                  <span>Retry</span>
                </button>
              }
              @if (item().formatConversionWarning) {
                <p class="conversion-warning font-mono">
                  <ts-icon name="info" [size]="12" />
                  <span>{{ item().formatConversionWarning }}</span>
                </p>
              }
            </div>
          </div>

          <!-- Section 1: Output Format -->
          <section class="settings-group">
            <label class="group-label">Output Format</label>
            <div class="format-chips-grid">
              @for (fmt of formatOptions; track fmt.value) {
                <button
                  type="button"
                  class="fmt-chip-btn"
                  [class.is-active]="draftOutputFormat() === fmt.value"
                  (click)="onFormatSelected(fmt.value)"
                >
                  <span class="fmt-chip-label font-mono">{{ fmt.label }}</span>
                  @if (fmt.badge) {
                    <span class="fmt-chip-badge">{{ fmt.badge }}</span>
                  }
                </button>
              }
            </div>
          </section>

          <!-- Section 2: Target File Size -->
          <section class="settings-group">
            <label class="group-label">Target File Size</label>

            <div class="sub-panel">
              <div class="target-slider-group">
                <div class="group-label-row">
                  <span class="dim-label">Target file size</span>
                  <span class="scale-val font-mono">{{ formatBytes(currentTargetBytes()) }}</span>
                </div>
                <div class="slider-wrapper">
                  <input
                    type="range"
                    min="0"
                    [max]="sliderMaxIndex()"
                    step="1"
                    class="quality-slider"
                    role="slider"
                    aria-label="Target file size slider"
                    [attr.aria-valuenow]="sliderCurrentIndex()"
                    [attr.aria-valuemin]="0"
                    [attr.aria-valuemax]="sliderMaxIndex()"
                    [attr.aria-valuetext]="formatBytes(currentTargetBytes()) + ' target file size'"
                    [value]="sliderCurrentIndex()"
                    (input)="onCandidateSliderInput($event)"
                    [style.--slider-progress-ratio]="sliderProgressRatio()"
                  />
                </div>
              </div>

              <!-- Input of Size and Type (Unit) -->
              <div class="target-size-row">
                <div class="target-input-wrap">
                  <input
                    #targetInput
                    type="text"
                    inputmode="decimal"
                    class="custom-num-input font-mono"
                    [value]="targetInputValue()"
                    (focus)="onTargetInputFocus($event)"
                    (blur)="onTargetInputBlur()"
                    (input)="onTargetInput($event)"
                    (keydown)="onTargetInputKeydown($event)"
                    placeholder="200"
                    aria-label="Target file size value"
                  />
                </div>
                <div class="target-unit-wrap">
                  <app-custom-select
                    [options]="unitSelectOptions()"
                    [value]="draftTargetUnit()"
                    size="sm"
                    (valueChange)="onTargetUnitSelected($event)"
                  />
                </div>
              </div>

              <!-- Quality Quick Choices Row -->
              <div class="quality-pills-row font-mono">
                <span class="quick-label">Quality:</span>
                <div class="quality-choices-group">
                  @for (q of qualityOptions(); track q.id) {
                    <button
                      type="button"
                      class="quick-pill quality-choice-pill"
                      [class.is-active]="activeQualityChoice() === q.id"
                      (click)="selectQualityChoice(q.id)"
                      [title]="q.label + ' (' + q.formattedSize + ')'"
                    >
                      {{ q.label }} <span class="quality-size-sub">({{ q.formattedSize }})</span>
                    </button>
                  }
                </div>
              </div>

              @if (!isTargetAchievable()) {
                <p class="target-unavailable-warning font-mono" role="status">
                  <ts-icon name="info" [size]="12" />
                  <span>{{ targetUnavailableMessage() }}</span>
                </p>
              }
            </div>
          </section>

          <!-- Section 3: Transforms (Default Visible) -->
          <section class="settings-group">
            <label class="group-label">Transforms</label>
            <div class="transforms-grid font-mono">
              <button type="button" class="transform-chip" (click)="rotateLeft()" title="Rotate 90° counter-clockwise">
                <ts-icon name="rotate-ccw" [size]="12" />
                <span>90&deg; Left</span>
              </button>
              <button type="button" class="transform-chip" (click)="rotateRight()" title="Rotate 90° clockwise">
                <ts-icon name="rotate-cw" [size]="12" />
                <span>90&deg; Right</span>
              </button>
              <button type="button" class="transform-chip" (click)="flipHorizontal()" title="Flip horizontally">
                <ts-icon name="maximize-2" [size]="12" />
                <span>Flip H</span>
              </button>
            </div>
          </section>

        </div>

        <!-- Modal Footer Actions -->
        <footer class="modal-footer-bar">
          <div class="footer-left">
            @if (item().individualSettings.hasCustomSettings) {
              <button
                type="button"
                class="btn-reset-global font-mono"
                (click)="onResetToGlobalClick()"
                title="Remove individual customization and inherit global settings"
              >
                <ts-icon name="rotate-ccw" [size]="12" />
                <span>Reset to Global</span>
              </button>
            }
          </div>

          <div class="footer-right">
            <button
              type="button"
              class="btn-cancel font-mono"
              (click)="requestClose()"
            >
              Cancel
            </button>
            @if (isAlreadyCompressed()) {
              <button
                type="button"
                class="btn-apply-primary font-mono btn-compress"
                [disabled]="isReEncoding() || isClosing()"
                (click)="onCompressClick()"
              >
                @if (isReEncoding()) {
                  <span class="btn-spinner"></span>
                  <span>Optimizing...</span>
                } @else {
                  <ts-icon name="zap" [size]="13" />
                  <span>Compress</span>
                }
              </button>
            } @else {
              <button
                type="button"
                class="btn-apply-primary font-mono btn-apply"
                [disabled]="isReEncoding() || isClosing()"
                (click)="onApplyClick()"
              >
                @if (isReEncoding()) {
                  <span class="btn-spinner"></span>
                  <span>Optimizing...</span>
                } @else {
                  <ts-icon name="check" [size]="13" />
                  <span>Apply</span>
                }
              </button>
            }
          </div>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --modal-padding: 24px;
    }

    @media (max-width: 640px) {
      :host {
        --modal-padding: 16px;
      }
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: var(--modal-padding);
      overflow: hidden;
      box-sizing: border-box;
      animation: modalBackdropFadeIn 0.5s ease forwards;
    }

    .modal-backdrop.is-closing {
      animation: modalBackdropFadeOut 0.5s ease forwards;
      pointer-events: none;
    }

    .customization-dialog {
      width: 100%;
      max-width: 540px;
      height: min(720px, 100%);
      max-height: 100%;
      margin: auto;
      display: flex;
      flex-direction: column;
      border-radius: 20px;
      background: #FFFFFF;
      border: 1px solid var(--border-subtle, #E2E8F0);
      box-shadow:
        0 24px 48px -12px rgba(15, 23, 42, 0.25),
        0 8px 24px -4px rgba(15, 23, 42, 0.1);
      overflow: hidden;
      outline: none;
      box-sizing: border-box;
      animation: modalDialogEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .customization-dialog.is-closing {
      animation: modalDialogExit 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes modalBackdropFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes modalBackdropFadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    @keyframes modalDialogEnter {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    @keyframes modalDialogExit {
      from {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
      to {
        opacity: 0;
        transform: scale(0.95) translateY(10px);
      }
    }

    :host-context([data-theme="dark"]) .customization-dialog,
    [data-theme="dark"] .customization-dialog {
      background: #0F172A;
      border-color: rgba(51, 65, 85, 0.9);
      box-shadow:
        0 24px 48px -12px rgba(0, 0, 0, 0.7),
        0 8px 24px -4px rgba(0, 0, 0, 0.5);
    }

    /* Header */
    .modal-header {
      padding: 14px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      border-bottom: 1px solid var(--border-subtle, #E2E8F0);
      flex-shrink: 0;
      min-height: 52px;
      box-sizing: border-box;
    }

    :host-context([data-theme="dark"]) .modal-header,
    [data-theme="dark"] .modal-header {
      border-bottom-color: rgba(51, 65, 85, 0.8);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      flex: 1;
    }

    .header-icon-wrap {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(37, 99, 235, 0.1);
      color: var(--accent-primary, #2563EB);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    :host-context([data-theme="dark"]) .header-icon-wrap,
    [data-theme="dark"] .header-icon-wrap {
      background: rgba(59, 130, 246, 0.18);
      color: #60A5FA;
    }

    .modal-header-title-row {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      flex: 1;
      font-size: 13.5px;
      font-weight: 600;
      color: var(--text-primary, #0F172A);
      overflow: hidden;
    }

    :host-context([data-theme="dark"]) .modal-header-title-row,
    [data-theme="dark"] .modal-header-title-row {
      color: #F8FAFC;
    }

    .modal-filename-base {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }

    .modal-filename-ext {
      flex-shrink: 0;
      white-space: nowrap;
      opacity: 0.85;
      font-weight: 600;
    }

    .modal-header-top-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .modal-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text-primary, #0F172A);
      margin: 0;
      letter-spacing: -0.01em;
      white-space: nowrap !important;
    }

    :host-context([data-theme="dark"]) .modal-title,
    [data-theme="dark"] .modal-title {
      color: #F8FAFC;
    }

    .customized-indicator-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 7px;
      border-radius: 9999px;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      background: rgba(37, 99, 235, 0.1);
      color: var(--accent-primary, #2563EB);
      border: 1px solid rgba(37, 99, 235, 0.25);
    }

    :host-context([data-theme="dark"]) .customized-indicator-pill,
    [data-theme="dark"] .customized-indicator-pill {
      background: rgba(59, 130, 246, 0.18);
      color: #60A5FA;
      border-color: rgba(96, 165, 250, 0.35);
    }

    .customized-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: currentColor;
    }

    .global-inheriting-pill {
      display: inline-flex;
      align-items: center;
      padding: 2px 7px;
      border-radius: 9999px;
      font-size: 0.65rem;
      font-weight: 600;
      background: var(--bg-hover, #F1F5F9);
      color: var(--text-muted, #64748B);
      border: 1px solid var(--border-subtle, #E2E8F0);
    }

    :host-context([data-theme="dark"]) .global-inheriting-pill,
    [data-theme="dark"] .global-inheriting-pill {
      background: rgba(30, 41, 59, 0.8);
      color: #94A3B8;
      border-color: rgba(51, 65, 85, 0.7);
    }

    .filename-header-row {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }

    .name-display-inline {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.72rem;
      color: var(--text-muted, #64748B);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host-context([data-theme="dark"]) .name-display-inline,
    [data-theme="dark"] .name-display-inline {
      color: #94A3B8;
    }

    .name-text {
      font-weight: 600;
      color: var(--text-primary, #0F172A);
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host-context([data-theme="dark"]) .name-text,
    [data-theme="dark"] .name-text {
      color: #F8FAFC;
    }

    .ext-text {
      color: var(--text-muted, #64748B);
    }

    .name-pencil-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      min-height: 0 !important;
      min-width: 0 !important;
      border-radius: 4px;
      border: none;
      background: transparent;
      color: var(--text-muted, #64748B);
      cursor: pointer;
      padding: 0;
      transition: all 0.12s ease;
      flex-shrink: 0;
    }

    .name-pencil-btn:hover {
      background: var(--bg-hover, #F1F5F9);
      color: var(--accent-primary, #2563EB);
    }

    :host-context([data-theme="dark"]) .name-pencil-btn:hover,
    [data-theme="dark"] .name-pencil-btn:hover {
      background: rgba(51, 65, 85, 0.7);
      color: #60A5FA;
    }

    .meta-separator {
      opacity: 0.5;
    }

    .meta-specs {
      color: var(--text-muted, #64748B);
    }

    :host-context([data-theme="dark"]) .meta-specs,
    [data-theme="dark"] .meta-specs {
      color: #94A3B8;
    }

    .name-edit-inline {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .name-input-field {
      height: 24px;
      padding: 0 6px;
      font-size: 0.72rem;
      border-radius: 4px;
      border: 1px solid var(--accent-primary, #2563EB);
      background: var(--bg-card, #FFFFFF);
      color: var(--text-primary, #0F172A);
      outline: none;
      width: 140px;
      max-width: 180px;
      box-sizing: border-box;
    }

    :host-context([data-theme="dark"]) .name-input-field,
    [data-theme="dark"] .name-input-field {
      background: #1E293B;
      color: #F8FAFC;
      border-color: #60A5FA;
    }

    .name-ext-static {
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--text-muted, #64748B);
    }

    .name-action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 4px;
      border: 1px solid var(--border-subtle, #E2E8F0);
      background: var(--bg-card, #FFFFFF);
      cursor: pointer;
      padding: 0;
      transition: all 0.12s ease;
    }

    :host-context([data-theme="dark"]) .name-action-btn,
    [data-theme="dark"] .name-action-btn {
      background: #1E293B;
      border-color: rgba(51, 65, 85, 0.9);
    }

    .name-action-btn.check {
      color: #10B981;
    }

    .name-action-btn.check:hover {
      background: rgba(16, 185, 129, 0.12);
      border-color: #10B981;
    }

    .name-action-btn.cancel {
      color: #EF4444;
    }

    .name-action-btn.cancel:hover {
      background: rgba(239, 68, 68, 0.12);
      border-color: #EF4444;
    }

    .name-error-text {
      font-size: 0.68rem;
      color: #EF4444;
      font-weight: 600;
    }

    .filename-sub {
      font-size: 0.72rem;
      color: var(--text-muted, #64748B);
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host-context([data-theme="dark"]) .filename-sub,
    [data-theme="dark"] .filename-sub {
      color: #94A3B8;
    }

    .modal-close-btn {
      width: 30px;
      height: 30px;
      min-height: 0 !important;
      min-width: 0 !important;
      border-radius: 8px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-muted, #64748B);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }

    .modal-close-btn:hover {
      background: var(--bg-hover, #F1F5F9);
      color: var(--text-primary, #0F172A);
      border-color: var(--border-subtle, #E2E8F0);
    }

    :host-context([data-theme="dark"]) .modal-close-btn:hover,
    [data-theme="dark"] .modal-close-btn:hover {
      background: rgba(30, 41, 59, 0.9);
      color: #F8FAFC;
      border-color: rgba(51, 65, 85, 0.8);
    }

    /* Body Content */
    .modal-body-content {
      padding: 16px 20px;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
      gap: 16px;
      flex: 1;
      min-height: 0;
      box-sizing: border-box;
    }

    /* Mini Preview Card */
    .preview-mini-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 14px;
      border-radius: 12px;
      background: var(--bg-hover, #F8FAFC);
      border: 1px solid var(--border-subtle, #E2E8F0);
      margin: 0;
    }

    :host-context([data-theme="dark"]) .preview-mini-card,
    [data-theme="dark"] .preview-mini-card {
      background: rgba(30, 41, 59, 0.6);
      border-color: rgba(51, 65, 85, 0.7);
    }

    .preview-thumb-box {
      width: 52px;
      height: 52px;
      border-radius: 8px;
      background: #000000;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      position: relative;
    }

    .thumb-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: opacity 0.15s ease, filter 0.15s ease;
    }

    .thumb-img.is-re-encoding {
      opacity: 0.5;
      filter: blur(1px);
    }

    .processing-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      background: rgba(15, 23, 42, 0.78);
      backdrop-filter: blur(2px);
      color: #FFFFFF;
      pointer-events: none;
      z-index: 10;
      padding: 2px;
      box-sizing: border-box;
      border-radius: 8px;
    }

    .processing-spinner-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .processing-spinner {
      width: 18px;
      height: 18px;
      color: #38BDF8;
      animation: spin 0.8s linear infinite;
    }

    .processing-stage-text {
      font-size: 0.54rem;
      font-weight: 500;
      color: #F8FAFC;
      line-height: 1.1;
      text-align: center;
      max-width: 48px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
    }

    .quality-loading {
      color: #38BDF8;
      font-style: italic;
    }

    .btn-preview-retry {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 0.65rem;
      padding: 1px 6px;
      border-radius: 4px;
      background: var(--bg-hover, #F1F5F9);
      color: var(--accent, #0284C7);
      border: 1px solid var(--border-subtle, #CBD5E1);
      cursor: pointer;
      margin-top: 3px;
    }

    .btn-spinner {
      width: 12px;
      height: 12px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #FFFFFF;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }

    .btn-apply-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
      box-shadow: none !important;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .animate-spin {
      animation: spin 1s linear infinite;
    }

    .quality-score-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.72rem;
      margin-top: 2px;
    }

    .quality-label {
      color: var(--text-muted, #64748B);
    }

    :host-context([data-theme="dark"]) .quality-label,
    [data-theme="dark"] .quality-label {
      color: #94A3B8;
    }

    .quality-val {
      font-weight: 700;
      color: var(--accent-primary, #2563EB);
      background: rgba(37, 99, 235, 0.1);
      padding: 1px 6px;
      border-radius: 4px;
    }

    :host-context([data-theme="dark"]) .quality-val,
    [data-theme="dark"] .quality-val {
      color: #60A5FA;
      background: rgba(59, 130, 246, 0.2);
    }

    .quality-size-tag {
      color: var(--text-muted, #64748B);
      font-size: 0.7rem;
    }

    .quality-details-collapsible {
      margin-top: 2px;
      font-size: 0.68rem;
    }

    .details-summary-toggle {
      cursor: pointer;
      user-select: none;
      color: var(--accent-primary, #2563EB);
    }

    :host-context([data-theme="dark"]) .details-summary-toggle,
    [data-theme="dark"] .details-summary-toggle {
      color: #60A5FA;
    }

    .details-stats-row {
      display: flex;
      gap: 6px;
      padding-top: 2px;
      color: var(--text-muted, #64748B);
    }

    .target-slider-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 6px;
    }

    .preview-info-box {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .preview-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .preview-format-pill {
      font-size: 0.68rem;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
      background: var(--accent-primary, #2563EB);
      color: #FFFFFF;
    }

    .preview-res {
      font-size: 0.7rem;
      color: var(--text-muted, #64748B);
    }

    :host-context([data-theme="dark"]) .preview-res,
    [data-theme="dark"] .preview-res {
      color: #94A3B8;
    }

    .preview-size-tag {
      font-size: 0.7rem;
      color: var(--text-muted, #64748B);
    }

    :host-context([data-theme="dark"]) .preview-size-tag,
    [data-theme="dark"] .preview-size-tag {
      color: #94A3B8;
    }

    .preview-desc {
      font-size: 0.74rem;
      color: var(--text-secondary, #475569);
      margin: 0;
      line-height: 1.35;
    }

    :host-context([data-theme="dark"]) .preview-desc,
    [data-theme="dark"] .preview-desc {
      color: #94A3B8;
    }

    .conversion-warning {
      font-size: 0.72rem;
      color: #D97706;
      display: flex;
      align-items: center;
      gap: 5px;
      margin: 0;
    }

    :host-context([data-theme="dark"]) .conversion-warning,
    [data-theme="dark"] .conversion-warning {
      color: #FBBF24;
    }

    /* Settings Groups */
    .settings-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .group-label-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .group-label {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-secondary, #475569);
    }

    :host-context([data-theme="dark"]) .group-label,
    [data-theme="dark"] .group-label {
      color: #94A3B8;
    }

    /* Format Chips */
    .format-chips-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 6px;
    }

    .fmt-chip-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      padding: 7px 4px;
      border-radius: 8px;
      border: 1px solid var(--border-subtle, #E2E8F0);
      background: var(--bg-card, #FFFFFF);
      color: var(--text-secondary, #475569);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="dark"]) .fmt-chip-btn,
    [data-theme="dark"] .fmt-chip-btn {
      background: rgba(30, 41, 59, 0.6);
      border-color: rgba(51, 65, 85, 0.8);
      color: #94A3B8;
    }

    .fmt-chip-btn:hover {
      border-color: var(--accent-primary, #3B82F6);
      color: var(--accent-primary, #2563EB);
    }

    .fmt-chip-btn.is-active {
      background: rgba(37, 99, 235, 0.08);
      border-color: var(--accent-primary, #2563EB);
      color: var(--accent-primary, #2563EB);
      box-shadow: 0 0 0 1px var(--accent-primary, #2563EB);
    }

    :host-context([data-theme="dark"]) .fmt-chip-btn.is-active,
    [data-theme="dark"] .fmt-chip-btn.is-active {
      background: rgba(59, 130, 246, 0.18);
      border-color: #60A5FA;
      color: #60A5FA;
      box-shadow: 0 0 0 1px #60A5FA;
    }

    .fmt-chip-label {
      font-size: 0.74rem;
      font-weight: 700;
    }

    .fmt-chip-badge {
      font-size: 0.58rem;
      font-weight: 600;
      color: #10B981;
    }

    /* Slider Container & Slider */
    .slider-wrapper {
      padding: 6px 0 4px 0;
    }

    .quality-slider {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 6px;
      border-radius: 9999px;
      outline: none;
      --slider-fill-offset: calc(var(--slider-progress-ratio, 0.222) * (100% - 16px) + 8px);
      background: linear-gradient(
        to right,
        var(--accent-primary, #3B82F6) 0%,
        var(--accent-primary, #3B82F6) var(--slider-fill-offset),
        var(--border-subtle, #E2E8F0) var(--slider-fill-offset),
        var(--border-subtle, #E2E8F0) 100%
      );
      cursor: pointer;
    }

    :host-context([data-theme="dark"]) .quality-slider,
    [data-theme="dark"] .quality-slider {
      background: linear-gradient(
        to right,
        #3B82F6 0%,
        #60A5FA var(--slider-fill-offset),
        rgba(51, 65, 85, 0.9) var(--slider-fill-offset),
        rgba(51, 65, 85, 0.9) 100%
      );
    }

    .quality-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #FFFFFF;
      border: 2.5px solid var(--accent-primary, #3B82F6);
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.2);
      cursor: grab;
      transition: transform 0.12s ease;
    }

    .quality-slider::-webkit-slider-thumb:hover {
      transform: scale(1.15);
    }

    .quality-slider::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #FFFFFF;
      border: 2.5px solid var(--accent-primary, #3B82F6);
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.2);
      cursor: grab;
    }

    .scale-val {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--accent-primary, #2563EB);
    }

    :host-context([data-theme="dark"]) .scale-val,
    [data-theme="dark"] .scale-val {
      color: #60A5FA;
    }

    .reduction-result-row {
      font-size: 0.72rem;
      color: var(--accent-primary, #2563EB);
      font-weight: 600;
      padding-top: 2px;
    }

    :host-context([data-theme="dark"]) .reduction-result-row,
    [data-theme="dark"] .reduction-result-row {
      color: #60A5FA;
    }

    .very-low-target-warning {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 0.72rem;
      color: #D97706;
      margin: 4px 0 0 0;
      line-height: 1.3;
      flex-wrap: wrap;
    }

    .quality-size-sub {
      opacity: 0.75;
      font-size: 0.68rem;
      margin-left: 3px;
    }

    .target-unavailable-warning {
      margin: 10px 0 0;
      display: flex;
      align-items: center;
      gap: 6px;
      color: #DC2626;
      font-size: 0.72rem;
      line-height: 1.3;
      flex-wrap: wrap;
    }

    :host-context([data-theme="dark"]) .target-unavailable-warning,
    [data-theme="dark"] .target-unavailable-warning {
      color: #F87171;
    }

    .thumb-fallback-box {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(100, 116, 139, 0.15);
      color: var(--text-muted, #94A3B8);
    }

    .target-closest-note {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      color: var(--accent-primary, #2563EB);
      margin: 4px 0 0;
    }

    :host-context([data-theme="dark"]) .target-closest-note,
    [data-theme="dark"] .target-closest-note {
      color: #60A5FA;
    }

    /* Sub-panels */
    .sub-panel {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 10px;
      background: var(--bg-hover, #F8FAFC);
      border: 1px solid var(--border-subtle, #E2E8F0);
    }

    :host-context([data-theme="dark"]) .sub-panel,
    [data-theme="dark"] .sub-panel {
      background: rgba(30, 41, 59, 0.5);
      border-color: rgba(51, 65, 85, 0.7);
    }

    .target-size-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .target-input-wrap {
      flex: 1;
    }

    .target-unit-wrap {
      width: 90px;
    }

    .custom-num-input {
      width: 100%;
      height: 36px;
      padding: 0 10px;
      border-radius: 8px;
      border: 1px solid var(--border-subtle, #E2E8F0);
      background: var(--bg-card, #FFFFFF);
      color: var(--text-primary, #0F172A);
      font-size: 0.85rem;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.15s ease;
    }

    :host-context([data-theme="dark"]) .custom-num-input,
    [data-theme="dark"] .custom-num-input {
      background: #1E293B;
      border-color: rgba(51, 65, 85, 0.9);
      color: #F8FAFC;
    }

    .custom-num-input:focus {
      border-color: var(--accent-primary, #3B82F6);
    }

    .quality-pills-row,
    .quick-pills-row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .quality-choices-group {
      display: flex;
      align-items: center;
      gap: 5px;
      flex-wrap: wrap;
    }

    .quick-label {
      font-size: 0.68rem;
      color: var(--text-muted, #64748B);
    }

    .quick-pill {
      padding: 2px 7px;
      border-radius: 6px;
      border: 1px solid var(--border-subtle, #E2E8F0);
      background: var(--bg-card, #FFFFFF);
      color: var(--text-secondary, #475569);
      font-size: 0.68rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.12s ease;
    }

    .quality-choice-pill {
      padding: 3px 8px;
    }

    :host-context([data-theme="dark"]) .quick-pill,
    [data-theme="dark"] .quick-pill {
      background: #1E293B;
      border-color: rgba(51, 65, 85, 0.8);
      color: #94A3B8;
    }

    .quick-pill.is-active,
    .quick-pill:hover {
      background: rgba(37, 99, 235, 0.1);
      border-color: var(--accent-primary, #3B82F6);
      color: var(--accent-primary, #2563EB);
    }

    .quality-choice-pill.is-active {
      background: var(--accent-primary, #2563EB);
      border-color: var(--accent-primary, #2563EB);
      color: #FFFFFF;
      box-shadow: 0 1px 3px rgba(37, 99, 235, 0.3);
    }

    :host-context([data-theme="dark"]) .quality-choice-pill.is-active,
    [data-theme="dark"] .quality-choice-pill.is-active {
      background: #2563EB;
      border-color: #3B82F6;
      color: #FFFFFF;
      box-shadow: 0 1px 4px rgba(37, 99, 235, 0.5);
    }

    /* Custom Dimensions */
    .dim-inputs-row {
      display: flex;
      align-items: flex-end;
      gap: 8px;
    }

    .dim-field {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .dim-label {
      font-size: 0.68rem;
      color: var(--text-muted, #64748B);
    }

    .aspect-lock-btn {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      border: 1px solid var(--border-subtle, #E2E8F0);
      background: var(--bg-card, #FFFFFF);
      color: var(--text-muted, #64748B);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }

    :host-context([data-theme="dark"]) .aspect-lock-btn,
    [data-theme="dark"] .aspect-lock-btn {
      background: #1E293B;
      border-color: rgba(51, 65, 85, 0.9);
      color: #94A3B8;
    }

    .aspect-lock-btn.is-locked {
      background: rgba(37, 99, 235, 0.1);
      border-color: var(--accent-primary, #3B82F6);
      color: var(--accent-primary, #2563EB);
    }

    /* Transforms Grid */
    .transforms-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
    }

    .transform-chip {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 7px 4px;
      border-radius: 8px;
      border: 1px solid var(--border-subtle, #E2E8F0);
      background: var(--bg-card, #FFFFFF);
      color: var(--text-secondary, #475569);
      font-size: 0.72rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="dark"]) .transform-chip,
    [data-theme="dark"] .transform-chip {
      background: rgba(30, 41, 59, 0.6);
      border-color: rgba(51, 65, 85, 0.8);
      color: #94A3B8;
    }

    .transform-chip:hover {
      background: rgba(37, 99, 235, 0.08);
      border-color: var(--accent-primary, #3B82F6);
      color: var(--accent-primary, #2563EB);
    }

    /* Footer Bar */
    .modal-footer-bar {
      padding: 14px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border-top: 1px solid var(--border-subtle, #E2E8F0);
      background: var(--bg-hover, #F8FAFC);
      flex-shrink: 0;
    }

    :host-context([data-theme="dark"]) .modal-footer-bar,
    [data-theme="dark"] .modal-footer-bar {
      background: rgba(15, 23, 42, 0.85);
      border-top-color: rgba(51, 65, 85, 0.8);
    }

    .footer-left {
      display: flex;
      align-items: center;
    }

    .footer-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .btn-reset-global {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      border-radius: 8px;
      border: 1px solid var(--border-subtle, #E2E8F0);
      background: var(--bg-card, #FFFFFF);
      color: #EF4444;
      font-size: 0.76rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="dark"]) .btn-reset-global,
    [data-theme="dark"] .btn-reset-global {
      background: #1E293B;
      border-color: rgba(51, 65, 85, 0.9);
      color: #F87171;
    }

    .btn-reset-global:hover {
      background: rgba(239, 68, 68, 0.1);
      border-color: #EF4444;
    }

    .btn-cancel {
      padding: 8px 14px;
      border-radius: 8px;
      border: 1px solid var(--border-subtle, #E2E8F0);
      background: var(--bg-card, #FFFFFF);
      color: var(--text-secondary, #475569);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="dark"]) .btn-cancel,
    [data-theme="dark"] .btn-cancel {
      background: #1E293B;
      border-color: rgba(51, 65, 85, 0.9);
      color: #94A3B8;
    }

    .btn-cancel:hover {
      background: var(--bg-hover, #F1F5F9);
      color: var(--text-primary, #0F172A);
    }

    .btn-apply-primary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 8px;
      border: none;
      background: var(--accent-primary, #2563EB);
      color: #FFFFFF;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(37, 99, 235, 0.3);
      transition: all 0.15s ease;
    }

    .btn-apply-primary:hover {
      background: #1D4ED8;
      transform: translateY(-1px);
      box-shadow: 0 3px 8px rgba(37, 99, 235, 0.4);
    }

    /* Responsive breakpoint adaptations: xs (0-479px), sm (480-767px), md (768-1023px), lg (1024px+) */
    @media (max-width: 767px) {
      .format-chips-grid {
        grid-template-columns: repeat(3, 1fr) !important;
        gap: 6px;
      }
    }

    @media (min-width: 768px) {
      .format-chips-grid {
        grid-template-columns: repeat(6, 1fr) !important;
        gap: 6px;
      }
    }

    @media (max-width: 479px) {
      :host {
        --modal-padding: 8px;
      }
      .modal-backdrop {
        padding: 8px !important;
        align-items: center !important;
        justify-content: center !important;
        overflow: hidden !important;
      }
      .customization-dialog {
        height: 100% !important;
        max-height: 100% !important;
        width: 100% !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
      }
      .modal-header {
        padding: 10px 14px !important;
        flex-shrink: 0 !important;
      }
      .modal-body-content {
        padding: 12px 14px !important;
        gap: 12px !important;
        flex: 1 1 0px !important;
        min-height: 0 !important;
        overflow-y: auto !important;
        -webkit-overflow-scrolling: touch !important;
      }
      .modal-footer-bar {
        display: flex !important;
        flex-direction: row !important;
        justify-content: space-between !important;
        align-items: center !important;
        gap: 8px !important;
        padding: 10px 14px !important;
        flex-shrink: 0 !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      .footer-left {
        flex-shrink: 0;
      }
      .footer-right {
        flex: 1 1 auto !important;
        display: flex !important;
        gap: 8px !important;
        width: auto !important;
      }
      .btn-cancel,
      .btn-apply-primary {
        flex: 1 !important;
        min-height: 44px !important;
        height: 44px !important;
        justify-content: center !important;
        white-space: nowrap !important;
        text-align: center !important;
        font-size: 13.5px !important;
      }
      .btn-reset-global {
        min-height: 44px !important;
        height: 44px !important;
        padding: 0 10px !important;
        font-size: 12px !important;
      }
      .quality-choices-group {
        display: flex;
        flex-wrap: wrap !important;
        gap: 6px !important;
      }
      .quality-choice-pill {
        min-height: 38px;
      }
    }
  `]
})
export class CustomizationModalComponent implements OnInit, OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly state = inject(CompressorStateService, { optional: true });
  private readonly elementRef = inject(ElementRef);

  readonly item = input.required<ImageItem>();
  readonly globalSettings = input.required<CompressionSettings>();

  readonly applyRequested = output<Partial<IndividualCompressionOverrides>>();
  readonly compressRequested = output<Partial<IndividualCompressionOverrides>>();
  readonly resetToGlobal = output<void>();
  readonly close = output<void>();

  // Renaming state
  readonly isEditingName = signal<boolean>(false);
  readonly editNameValue = signal<string>('');
  readonly nameError = signal<string>('');

  // Format options
  readonly formatOptions: { value: OutputFormatOption; label: string; badge?: string }[] = [
    { value: 'original', label: 'ORIGINAL' },
    { value: 'webp', label: 'WEBP', badge: 'Best' },
    { value: 'jpeg', label: 'JPG' },
    { value: 'png', label: 'PNG' },
    { value: 'avif', label: 'AVIF' },
    { value: 'tiff', label: 'TIFF' }
  ];

  readonly resizeSelectOptions: CustomSelectOption[] = [
    { value: 'target-size', label: 'Target file size (KB / MB)', badge: 'Default' }
  ];

  readonly unitSelectOptions = computed<CustomSelectOption[]>(() => {
    const ref = this.referenceBytes();
    if (ref < 2048) {
      return [
        { value: 'B', label: 'B' },
        { value: 'KB', label: 'KB' }
      ];
    }
    return [
      { value: 'KB', label: 'KB' },
      { value: 'MB', label: 'MB' }
    ];
  });

  // Animation & Draft Signals
  readonly isClosing = signal<boolean>(false);
  readonly draftOutputFormat = signal<OutputFormatOption>('original');
  readonly draftQuality = signal<number>(80);
  readonly draftResizeTargetOption = signal<string>('target-size');
  readonly draftTargetValue = signal<number>(200);
  readonly targetInputValue = signal<string>('200');
  readonly isTargetInputFocused = signal<boolean>(false);
  readonly draftTargetUnit = signal<'B' | 'KB' | 'MB'>('KB');
  readonly draftCustomWidth = signal<number>(1200);
  readonly draftCustomHeight = signal<number>(800);
  readonly draftLockAspectRatio = signal<boolean>(true);
  readonly draftReductionPercent = signal<number>(20);
  readonly draftChroma = signal<'auto' | '4:2:0' | '4:4:4'>('auto');
  readonly draftCleanTransparency = signal<boolean>(true);

  // Preview & Re-encode Signals
  readonly isReEncoding = signal<boolean>(false);
  readonly processingStageMessage = signal<string>('Re-optimizing your image...');
  readonly previewError = signal<boolean>(false);
  readonly liveVisualQualityScore = signal<number | null>(null);
  readonly liveCompressedSize = signal<number | null>(null);
  readonly livePreviewBlobUrl = signal<string | null>(null);
  private currentPreviewBlobUrl: string | null = null;
  private stageTimer1: any = null;
  private stageTimer2: any = null;
  private stageTimer3: any = null;
  private lastInitializedItemId: string | null = null;
  private debounceTimer: any = null;
  private activeAbortController: AbortController | null = null;
  private readonly compressionService = inject(ImageCompressionService, { optional: true });
  private readonly telemetry = inject(CompressorTelemetryService, { optional: true });

  readonly isAlreadyCompressed = computed<boolean>(() => {
    const it = this.item();
    return !!it?.result || it?.status === 'completed';
  });

  readonly headerWidth = computed<number>(() => {
    const it = this.item();
    return it?.originalUploadedWidth ?? it?.width ?? 0;
  });

  readonly headerHeight = computed<number>(() => {
    const it = this.item();
    return it?.originalUploadedHeight ?? it?.height ?? 0;
  });

  readonly headerSize = computed<number>(() => {
    const it = this.item();
    return it?.originalUploadedSize ?? it?.originalSize ?? 0;
  });

  readonly headerExtension = computed<string>(() => {
    const it = this.item();
    return it?.originalUploadedExtension ?? it?.originalExtension ?? '';
  });

  readonly referenceBytes = computed<number>(() => {
    return this.headerSize();
  });

  readonly previewThumbnailUrl = computed<string>(() => {
    const it = this.item();
    return it?.transformedPreviewUrl || it?.originalUploadedPreviewUrl || it?.previewUrl || '';
  });

  readonly displayedCompressedSize = computed<number | null>(() => {
    return null;
  });

  private readonly discoveryService = inject(AchievableSizeDiscoveryService);
  readonly achievableProfile = signal<AchievableSizeProfile | null>(null);
  readonly selectedCandidate = signal<AchievableCandidate | null>(null);
  readonly isDiscoveringSizes = signal<boolean>(false);

  readonly qualityOptions = computed<AchievableQualityOption[]>(() => {
    return this.achievableProfile()?.qualityOptions || [];
  });

  readonly minAchievableBytes = computed<number>(() => {
    return this.achievableProfile()?.minAchievableBytes || 1;
  });

  readonly maxAchievableBytes = computed<number>(() => {
    return this.achievableProfile()?.maxAchievableBytes || this.referenceBytes();
  });

  readonly sliderMaxIndex = computed<number>(() => {
    const cands = this.achievableProfile()?.candidates;
    return cands && cands.length > 1 ? cands.length - 1 : 1;
  });

  readonly sliderCurrentIndex = computed<number>(() => {
    const prof = this.achievableProfile();
    if (!prof || prof.candidates.length === 0) return 0;
    const curBytes = this.currentTargetBytes();
    let bestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < prof.candidates.length; i++) {
      const diff = Math.abs(prof.candidates[i].size - curBytes);
      if (diff < minDiff) {
        minDiff = diff;
        bestIdx = i;
      }
    }
    return bestIdx;
  });

  readonly sliderProgressRatio = computed<number>(() => {
    const max = this.sliderMaxIndex();
    if (max <= 0) return 0.5;
    return this.sliderCurrentIndex() / max;
  });

  readonly activeQualityChoice = signal<'better' | 'balanced' | 'smallest' | null>('balanced');

  readonly currentTargetBytes = computed<number>(() => {
    const sel = this.selectedCandidate();
    const val = this.draftTargetValue();
    const unit = this.draftTargetUnit();
    const mult = unit === 'MB' ? 1048576 : (unit === 'B' ? 1 : 1024);
    const nominalBytes = Math.max(1, Math.round(val * mult));

    if (sel) {
      const parsed = this.parseBytesToUnit(sel.size);
      if (parsed.value === val && parsed.unit === unit) {
        return sel.size;
      }
    }

    return nominalBytes;
  });

  readonly targetFeasibility = computed(() => {
    const prof = this.achievableProfile();
    if (!prof) return null;
    return this.discoveryService.validateTargetFeasibility(prof, this.currentTargetBytes());
  });

  readonly isTargetAchievable = computed<boolean>(() => {
    const feas = this.targetFeasibility();
    if (!feas || feas.isAchievable) return true;
    const targetFmt = formatBytes(this.currentTargetBytes());
    const minFmt = formatBytes(feas.minAchievableBytes);
    if (targetFmt === minFmt || this.currentTargetBytes() >= feas.minAchievableBytes) {
      return true;
    }
    return false;
  });

  readonly targetUnavailableMessage = computed<string>(() => {
    const feas = this.targetFeasibility();
    if (!feas || feas.isAchievable) return '';
    const targetFmt = formatBytes(this.currentTargetBytes());
    const minFmt = formatBytes(feas.minAchievableBytes);
    if (targetFmt === minFmt || this.currentTargetBytes() >= feas.minAchievableBytes) {
      return '';
    }
    return feas.message || `Target of ${targetFmt} cannot be achieved (minimum achievable: ${minFmt}).`;
  });

  readonly targetSliderPercent = computed<number>(() => {
    const orig = this.referenceBytes();
    if (orig <= 0) return 70;
    const bytes = this.currentTargetBytes();
    return Math.max(5, Math.min(100, Math.round((bytes / orig) * 100)));
  });

  readonly visualQualityScore = computed<number>(() => {
    if (this.liveVisualQualityScore() !== null) {
      return this.liveVisualQualityScore()!;
    }
    const ssim = this.item()?.result?.visualQuality?.ssim;
    if (typeof ssim === 'number') {
      return Math.min(100, Math.max(0, Math.round(ssim * 100)));
    }
    return 100;
  });

  readonly draftReductionResult = computed(() => {
    return calculateTargetFromReduction(this.referenceBytes(), this.draftReductionPercent());
  });

  ngOnInit(): void {
    if (this.document?.body) {
      this.document.body.style.overflow = 'hidden';
    }
  }

  ngOnDestroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    if (this.activeAbortController) {
      this.activeAbortController.abort();
    }
    if (this.currentPreviewBlobUrl) {
      URL.revokeObjectURL(this.currentPreviewBlobUrl);
      this.currentPreviewBlobUrl = null;
    }
    clearTimeout(this.stageTimer1);
    clearTimeout(this.stageTimer2);
    clearTimeout(this.stageTimer3);
    if (this.document?.body) {
      this.document.body.style.overflow = '';
    }
  }

  constructor() {
    effect(() => {
      const it = this.item();
      const glob = this.globalSettings();
      if (!it) return;

      // Only re-initialize drafts when opening for a new image item
      if (this.lastInitializedItemId === it.id) {
        return;
      }
      this.lastInitializedItemId = it.id;
      this.previewError.set(false);
      this.liveVisualQualityScore.set(null);
      this.liveCompressedSize.set(null);

      const ind = it.individualSettings;
      const eff = it.effectiveSettings || glob;

      this.draftOutputFormat.set((ind.outputFormat || eff.outputFormat || 'original') as OutputFormatOption);
      this.draftQuality.set(ind.quality ?? eff.quality ?? 80);

      const targetSetting = ind.targetFileSize || eff.targetFileSize;
      this.draftResizeTargetOption.set('target-size');
      const orig = this.headerSize();
      const ref = this.headerSize();
      let tu: 'B' | 'KB' | 'MB' = ref < 2048 ? 'B' : ((targetSetting?.targetUnit || 'KB') as any);
      let tv: number;
      if (ref < 2048) {
        tu = 'B';
        tv = Math.round(ref * 0.8);
      } else if (ind.hasCustomSettings && ind.targetFileSize?.targetValue && (ind.targetFileSize.targetBytes || 0) < orig) {
        // If this image already has saved custom target settings that are strictly smaller than the current working size, restore them
        tv = ind.targetFileSize.targetValue;
        tu = (ind.targetFileSize.targetUnit || 'KB') as any;
      } else if (orig > 0) {
        const dyn = calculateDynamicDefaultTarget(orig);
        tv = dyn.targetValue;
        tu = dyn.targetUnit;
      } else {
        const mult = tu === 'MB' ? 1048576 : (tu === 'B' ? 1 : 1024);
        tv = targetSetting?.targetValue || 200;
        if (orig > 0 && tv * mult > orig) {
          tv = tu === 'MB' ? Math.max(0.1, Math.floor((orig / 1048576) * 10) / 10) : Math.max(1, Math.floor(orig / 1024));
        }
      }
      this.draftTargetValue.set(tv);
      this.draftTargetUnit.set(tu);
      this.targetInputValue.set(String(tv));

      this.draftCustomWidth.set(ind.resize?.width || it.width || 1200);
      this.draftCustomHeight.set(ind.resize?.height || it.height || 800);
      this.draftLockAspectRatio.set(ind.resize?.maintainAspectRatio ?? true);

      const existingScale = ind.resize?.percentage ?? eff.resize?.percentage ?? 80;
      this.draftReductionPercent.set(Math.max(0, Math.min(90, 100 - existingScale)));

      this.draftChroma.set(ind.advancedOptimization?.chromaSubsampling || eff.advancedOptimization?.chromaSubsampling || 'auto');
      this.draftCleanTransparency.set(ind.advancedOptimization?.cleanTransparency ?? eff.advancedOptimization?.cleanTransparency ?? true);

      this.syncActiveQualityChoice();
      this.loadAchievableProfile();
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.requestClose();
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Tab') {
      const focusableEls = this.elementRef.nativeElement.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusableEls || focusableEls.length === 0) return;
      const first = focusableEls[0] as HTMLElement;
      const last = focusableEls[focusableEls.length - 1] as HTMLElement;

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
  }

  requestClose(): void {
    if (this.isClosing()) return;
    this.isClosing.set(true);
    setTimeout(() => {
      this.close.emit();
    }, 500);
  }

  onResizeModeSelected(val: string): void {
    this.draftResizeTargetOption.set(val);
  }

  onTargetInputFocus(event: FocusEvent): void {
    this.isTargetInputFocused.set(true);
  }

  onTargetInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      (event.target as HTMLElement)?.blur();
      return;
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const current = parseFloat(this.targetInputValue()) || 0;
      const step = this.draftTargetUnit() === 'MB' ? (event.shiftKey ? 1 : 0.1) : (event.shiftKey ? 10 : 1);
      const delta = event.key === 'ArrowUp' ? step : -step;
      const rawNew = current + delta;
      const ref = this.referenceBytes();
      const mult = this.draftTargetUnit() === 'MB' ? 1048576 : (this.draftTargetUnit() === 'B' ? 1 : 1024);
      const clampedBytes = clampTargetBytes(Math.max(1, rawNew * mult), ref);
      let clampedVal = clampedBytes / mult;
      if (this.draftTargetUnit() === 'MB') {
        clampedVal = Math.round(clampedVal * 10) / 10;
        if (clampedVal <= 0) clampedVal = 0.1;
      } else {
        clampedVal = Math.round(clampedVal);
        if (clampedVal <= 0) clampedVal = 1;
      }
      this.draftTargetValue.set(clampedVal);
      this.targetInputValue.set(String(clampedVal));
      this.syncActiveQualityChoice();
      this.scheduleReEncode();
    }
  }

  onTargetInput(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const rawStr = inputEl.value;
    this.targetInputValue.set(rawStr);

    const parsed = parseFloat(rawStr);
    if (!isNaN(parsed) && parsed > 0) {
      this.selectedCandidate.set(null);
      this.draftTargetValue.set(parsed);
      this.syncActiveQualityChoice();
      this.scheduleReEncode();
    }
  }

  onTargetInputBlur(): void {
    this.isTargetInputFocused.set(false);
    const parsed = parseFloat(this.targetInputValue());
    const ref = this.referenceBytes();
    const unit = this.draftTargetUnit();
    const mult = unit === 'MB' ? 1048576 : (unit === 'B' ? 1 : 1024);

    if (isNaN(parsed) || parsed <= 0) {
      this.selectedCandidate.set(null);
      const fallbackBytes = ref > 0 ? Math.round(ref * 0.7) : 200 * mult;
      let val = fallbackBytes / mult;
      val = unit === 'MB' ? Math.round(val * 10) / 10 : Math.round(val);
      if (val <= 0) val = unit === 'MB' ? 0.1 : 1;
      this.draftTargetValue.set(val);
      this.targetInputValue.set(String(val));
      this.syncActiveQualityChoice();
      this.scheduleReEncode();
      return;
    }

    if (ref > 0) {
      this.selectedCandidate.set(null);
      const rawBytes = parsed * mult;
      const clampedBytes = clampTargetBytes(rawBytes, ref);
      let clampedVal = clampedBytes / mult;
      if (unit === 'MB') {
        clampedVal = Math.round(clampedVal * 10) / 10;
        if (clampedVal <= 0) clampedVal = 0.1;
      } else {
        clampedVal = Math.round(clampedVal);
        if (clampedVal <= 0) clampedVal = 1;
      }
      this.draftTargetValue.set(clampedVal);
      this.targetInputValue.set(String(clampedVal));
      this.syncActiveQualityChoice();
      this.scheduleReEncode();
    }
  }

  onTargetUnitSelected(val: string): void {
    const prevUnit = this.draftTargetUnit();
    const unit = val as 'B' | 'KB' | 'MB';
    if (prevUnit === unit) return;

    this.selectedCandidate.set(null);
    const prevMult = prevUnit === 'MB' ? 1048576 : (prevUnit === 'B' ? 1 : 1024);
    const newMult = unit === 'MB' ? 1048576 : (unit === 'B' ? 1 : 1024);
    const currentBytes = this.draftTargetValue() * prevMult;
    let newVal = currentBytes / newMult;
    if (unit === 'MB') {
      newVal = Math.round(newVal * 10) / 10;
      if (newVal <= 0 && currentBytes > 0) newVal = 0.1;
    } else {
      newVal = Math.round(newVal);
      if (newVal <= 0 && currentBytes > 0) newVal = 1;
    }

    this.draftTargetUnit.set(unit);
    this.draftTargetValue.set(newVal);
    this.targetInputValue.set(String(newVal));
    this.syncActiveQualityChoice();
    this.scheduleReEncode();
  }

  onFormatSelected(fmt: OutputFormatOption): void {
    this.draftOutputFormat.set(fmt);
    this.loadAchievableProfile();
    this.scheduleReEncode();
  }

  async loadAchievableProfile(): Promise<void> {
    const it = this.item();
    if (!it) return;
    this.isDiscoveringSizes.set(true);
    this.isReEncoding.set(true);
    this.processingStageMessage.set('Re-optimizing your image...');
    try {
      const prof = await this.discoveryService.discoverAchievableSizes(
        it,
        this.draftOutputFormat() as OutputFormatOption
      );
      this.achievableProfile.set(prof);
      if (prof.candidates.length > 0) {
        const currentTarget = this.currentTargetBytes();
        const feasibility = this.discoveryService.validateTargetFeasibility(prof, currentTarget);
        if (feasibility.isAchievable && feasibility.closestAchievingCandidate) {
          this.applyCandidate(feasibility.closestAchievingCandidate);
        } else {
          const balanced = prof.qualityOptions.find(o => o.id === 'balanced') || prof.qualityOptions[0];
          if (balanced) {
            this.applyCandidate(balanced.candidate);
          }
        }
        this.syncActiveQualityChoice();
      }
    } catch {
      // Ignore discovery abort
    } finally {
      this.isDiscoveringSizes.set(false);
    }
  }

  applyCandidate(candidate: AchievableCandidate): void {
    this.selectedCandidate.set(candidate);
    const parsed = this.parseBytesToUnit(candidate.size);
    this.draftTargetUnit.set(parsed.unit);
    this.draftTargetValue.set(parsed.value);
    this.targetInputValue.set(String(parsed.value));
    this.draftQuality.set(candidate.quality);
    this.liveVisualQualityScore.set(Math.min(100, Math.max(1, Math.round(candidate.ssim * 100))));
    this.liveCompressedSize.set(candidate.size);
    this.scheduleReEncode();
  }

  onCandidateSliderInput(event: Event): void {
    const idx = parseInt((event.target as HTMLInputElement).value, 10);
    if (isNaN(idx)) return;
    const prof = this.achievableProfile();
    if (!prof || prof.candidates.length === 0) return;
    const clampedIdx = Math.max(0, Math.min(prof.candidates.length - 1, idx));
    const cand = prof.candidates[clampedIdx];
    this.applyCandidate(cand);
    this.syncActiveQualityChoice();
  }

  selectQualityChoice(id: 'better' | 'balanced' | 'smallest'): void {
    const opt = this.qualityOptions().find(o => o.id === id);
    if (!opt) return;
    this.activeQualityChoice.set(id);
    this.applyCandidate(opt.candidate);
  }

  syncActiveQualityChoice(): void {
    const prof = this.achievableProfile();
    if (!prof) {
      this.activeQualityChoice.set(null);
      return;
    }
    const currentBytes = this.currentTargetBytes();
    for (const opt of prof.qualityOptions) {
      if (Math.abs(opt.candidate.size - currentBytes) <= 60) {
        this.activeQualityChoice.set(opt.id);
        return;
      }
    }
    this.activeQualityChoice.set(null);
  }

  private parseBytesToUnit(bytes: number): { value: number; unit: 'B' | 'KB' | 'MB' } {
    if (bytes < 1024) {
      return { value: Math.round(bytes), unit: 'B' };
    }
    if (bytes >= 1048576) {
      const mb = Math.round((bytes / 1048576) * 10) / 10;
      return { value: mb, unit: 'MB' };
    }
    const kb = bytes / 1024;
    const cleanKb = kb >= 10 ? Math.round(kb) : Math.round(kb * 10) / 10;
    return { value: cleanKb, unit: 'KB' };
  }

  onCompressClick(): void {
    if (this.isClosing() || this.isReEncoding()) return;
    const overrides = this.buildOverrides();
    this.isClosing.set(true);
    setTimeout(() => {
      this.compressRequested.emit(overrides);
    }, 500);
  }

  scheduleReEncode(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }

    this.isReEncoding.set(true);
    this.processingStageMessage.set('Preparing image...');
    this.debounceTimer = setTimeout(() => {
      this.triggerReEncode();
    }, 250);
  }

  async triggerReEncode(): Promise<void> {
    if (!this.compressionService) {
      this.isReEncoding.set(false);
      return;
    }

    const controller = new AbortController();
    this.activeAbortController = controller;
    this.telemetry?.trackTargetSliderUsed();

    this.processingStageMessage.set('Preparing image...');
    clearTimeout(this.stageTimer1);
    clearTimeout(this.stageTimer2);
    clearTimeout(this.stageTimer3);

    this.stageTimer1 = setTimeout(() => {
      if (this.isReEncoding()) this.processingStageMessage.set('Optimizing image...');
    }, 150);
    this.stageTimer2 = setTimeout(() => {
      if (this.isReEncoding()) this.processingStageMessage.set('Evaluating quality...');
    }, 350);
    this.stageTimer3 = setTimeout(() => {
      if (this.isReEncoding()) this.processingStageMessage.set('Finalizing output...');
    }, 550);

    const targetBytes = this.currentTargetBytes();
    const currentItem = this.item();

    const tempItem: ImageItem = {
      ...currentItem,
      effectiveSettings: {
        ...currentItem.effectiveSettings,
        outputFormat: this.draftOutputFormat(),
        quality: this.draftQuality(),
        targetFileSize: {
          enabled: true,
          targetBytes,
          targetValue: this.draftTargetValue(),
          targetUnit: this.draftTargetUnit(),
          minQuality: 20,
          userDefined: true,
          isDynamicDefault: false
        },
        resize: {
          enabled: false,
          mode: 'percentage',
          percentage: 100,
          maintainAspectRatio: true
        }
      }
    };

    try {
      const result = await this.compressionService.compressImage(
        tempItem,
        undefined,
        controller.signal
      );
      if (!controller.signal.aborted && result) {
        const ssim = result.visualQuality?.ssim;
        if (typeof ssim === 'number') {
          this.liveVisualQualityScore.set(Math.min(100, Math.max(0, Math.round(ssim * 100))));
        }
        this.liveCompressedSize.set(result.compressedSize);
        if (result.outputBlob) {
          if (this.currentPreviewBlobUrl) {
            URL.revokeObjectURL(this.currentPreviewBlobUrl);
          }
          this.currentPreviewBlobUrl = URL.createObjectURL(result.outputBlob);
          this.livePreviewBlobUrl.set(this.currentPreviewBlobUrl);
        }
        this.previewError.set(false);
      }
    } catch {
      if (!controller.signal.aborted) {
        this.previewError.set(true);
      }
    } finally {
      clearTimeout(this.stageTimer1);
      clearTimeout(this.stageTimer2);
      clearTimeout(this.stageTimer3);
      if (!controller.signal.aborted) {
        this.isReEncoding.set(false);
      }
    }
  }

  onWidthChange(event: Event): void {
    const w = parseInt((event.target as HTMLInputElement).value, 10);
    if (isNaN(w) || w <= 0) return;
    this.draftCustomWidth.set(w);
    const curW = this.headerWidth();
    const curH = this.headerHeight();
    if (this.draftLockAspectRatio() && curW && curH) {
      const ratio = curH / curW;
      this.draftCustomHeight.set(Math.round(w * ratio));
    }
  }

  onHeightChange(event: Event): void {
    const h = parseInt((event.target as HTMLInputElement).value, 10);
    if (isNaN(h) || h <= 0) return;
    this.draftCustomHeight.set(h);
    const curW = this.headerWidth();
    const curH = this.headerHeight();
    if (this.draftLockAspectRatio() && curW && curH) {
      const ratio = curW / curH;
      this.draftCustomWidth.set(Math.round(h * ratio));
    }
  }

  toggleAspectLock(): void {
    this.draftLockAspectRatio.update(v => !v);
  }

  onReductionPercentChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    if (!isNaN(val)) {
      this.draftReductionPercent.set(Math.max(0, Math.min(90, val)));
    }
  }

  onSliderKeyDown(event: KeyboardEvent): void {
    if (event.key === 'PageDown') {
      event.preventDefault();
      this.draftReductionPercent.update(v => Math.max(0, v - 10));
    } else if (event.key === 'PageUp') {
      event.preventDefault();
      this.draftReductionPercent.update(v => Math.min(90, v + 10));
    } else if (event.key === 'Home') {
      event.preventDefault();
      this.draftReductionPercent.set(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      this.draftReductionPercent.set(90);
    }
  }

  async rotateLeft(): Promise<void> {
    this.livePreviewBlobUrl.set(null);
    await this.state?.addTransform(this.item().id, { type: 'rotate', angle: -90 });
    this.scheduleReEncode();
  }

  async rotateRight(): Promise<void> {
    this.livePreviewBlobUrl.set(null);
    await this.state?.addTransform(this.item().id, { type: 'rotate', angle: 90 });
    this.scheduleReEncode();
  }

  async flipHorizontal(): Promise<void> {
    this.livePreviewBlobUrl.set(null);
    await this.state?.addTransform(this.item().id, { type: 'flip', direction: 'horizontal' });
    this.scheduleReEncode();
  }

  formatBytes(bytes: number): string {
    return formatBytes(bytes);
  }

  onResetToGlobalClick(): void {
    if (this.isClosing()) return;
    this.isClosing.set(true);
    setTimeout(() => {
      this.resetToGlobal.emit();
    }, 500);
  }

  startNameEdit(): void {
    this.editNameValue.set(this.item().nameWithoutExt);
    this.nameError.set('');
    this.isEditingName.set(true);
    setTimeout(() => {
      const input = this.elementRef.nativeElement.querySelector('.name-input-field') as HTMLInputElement | null;
      input?.focus();
      input?.select();
    }, 50);
  }

  onNameInputChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.editNameValue.set(val);
    if (val.trim()) {
      this.nameError.set('');
    }
  }

  saveFileName(): void {
    const trimmed = this.editNameValue().trim();
    if (!trimmed) {
      this.nameError.set("Name can't be empty.");
      return;
    }
    const sanitized = trimmed.slice(0, 100);
    this.state?.renameImage(this.item().id, sanitized);
    this.isEditingName.set(false);
    this.nameError.set('');
  }

  cancelFileNameEdit(): void {
    this.isEditingName.set(false);
    this.nameError.set('');
  }

  buildOverrides(): Partial<IndividualCompressionOverrides> {
    const targetFileSize = {
      enabled: true,
      targetValue: this.draftTargetValue(),
      targetUnit: this.draftTargetUnit() as any,
      targetBytes: this.currentTargetBytes(),
      minQuality: 25,
      userDefined: true,
      isDynamicDefault: false
    };

    const resize = {
      enabled: false,
      mode: 'dimensions' as ResizeMode,
      width: undefined,
      height: undefined,
      maintainAspectRatio: true,
      percentage: 100,
      preventUpscale: true
    };

    return {
      outputFormat: this.draftOutputFormat(),
      quality: this.draftQuality(),
      targetFileSize,
      resize,
      metadataPolicy: 'remove',
      advancedOptimization: {
        chromaSubsampling: this.draftChroma(),
        cleanTransparency: this.draftCleanTransparency()
      }
    };
  }

  onApplyClick(): void {
    if (this.isClosing()) return;
    const overrides = this.buildOverrides();
    this.isClosing.set(true);
    setTimeout(() => {
      this.applyRequested.emit(overrides);
    }, 500);
  }
}

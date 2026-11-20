// apps/tool-image-compressor/src/components/image-card/image-card.component.ts
import { Component, ChangeDetectionStrategy, input, output, computed, signal, inject, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';
import { ImageItem } from '../../models/compressor.models';
import { SizeEstimatorService } from '../../services/size-estimator.service';
import { CompressorStateService } from '../../services/compressor-state.service';
import { DropdownManagerService } from '../../services/dropdown-manager.service';
import { COMPRESSOR_CONFIG } from '../../config/compressor.config';
import { SOURCE_ICONS } from '../../config/source-icons.config';
import { copyBlobToClipboard } from '../../services/save-destination.util';
import { resultStatus, ResultStatus } from '../../services/result-status.util';

@Component({
  selector: 'app-image-card',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="studio-image-card"
      [class.is-completed]="item().status === 'completed'"
      [class.is-processing]="isProcessing()"
      [class.has-error]="hasError()"
      role="region"
      [attr.aria-label]="item().originalName"
    >
      <!-- Top Thumbnail Frame -->
      <div
        class="card-thumb-frame"
        [class.is-clickable]="true"
        (click)="isOutputScreen() ? previewRequested.emit(item().id) : onCustomizeClick()"
        role="button"
        tabindex="0"
        (keydown.enter)="isOutputScreen() ? previewRequested.emit(item().id) : onCustomizeClick()"
        (keydown.space)="(isOutputScreen() ? previewRequested.emit(item().id) : onCustomizeClick()); $event.preventDefault()"
        [title]="isOutputScreen() ? ('Preview and compare ' + item().originalName) : ('Customize settings for ' + item().originalName)"
        [attr.aria-label]="isOutputScreen() ? 'Preview image' : 'Customize image'"
      >
        @if (item().status === 'corrupted' || !item().capabilities.previewSupported) {
          <div class="thumb-fallback">
            <ts-icon [name]="item().status === 'corrupted' ? 'alert-triangle' : 'image'" [size]="28" />
          </div>
        } @else {
          <img
            [src]="item().result?.outputUrl || item().transformedPreviewUrl || item().previewUrl"
            [alt]="item().originalName"
            class="card-preview-img"
            loading="lazy"
          />
        }

        <!-- Hover Preview Overlay on Thumbnail (Output screen only) -->
        @if (isOutputScreen()) {
          <div class="thumb-hover-overlay">
            <span class="thumb-preview-pill">
              <ts-icon name="eye" [size]="12" />
              <span>Preview</span>
            </span>
          </div>
        }

        <!-- Top-Left Format & Savings Badge -->
        <div class="format-badge-wrap" (click)="$event.stopPropagation()">
          <span class="fmt-badge">{{ (item().detectedFormat === 'tiff' ? 'TIFF' : (item().result?.outputFormat || item().originalExtension)) | uppercase }}</span>
          @if (item().status === 'completed' && item().result && cardStatus().reduced) {
            <span class="savings-tag font-mono">-{{ cardStatus().savedPercent }}%</span>
          }
        </div>

        <!-- Top-Right Close/Remove Button -->
        <button
          type="button"
          class="card-remove-btn"
          (click)="$event.stopPropagation(); removeRequested.emit(item().id)"
          [disabled]="isProcessing()"
          title="Remove image from queue"
          aria-label="Remove image"
        >
          <ts-icon name="x" [size]="13" />
        </button>

        <!-- Processing Overlay with Progress -->
        @if (isProcessing()) {
          <div class="processing-overlay">
            <span class="spinner-circle-sm"></span>
            <span class="progress-pct font-mono">{{ item().progress || 10 }}%</span>
          </div>
        }
      </div>

      <!-- Bottom Card Body / Details -->
      <div class="card-body">
        <div class="filename-row">
          @if (isEditingName()) {
            <div class="card-name-edit-inline" (click)="$event.stopPropagation()">
              <input
                #cardNameInput
                type="text"
                class="card-name-input"
                [value]="editNameValue()"
                (input)="onNameInputChange($event)"
                (keydown.enter)="saveFileName()"
                (keydown.escape)="cancelFileNameEdit()"
                maxlength="100"
                aria-label="Edit file name"
              />
              <span class="card-name-ext">.{{ item().originalExtension }}</span>
              <button type="button" class="card-name-btn check" (click)="saveFileName()" title="Save name">
                <ts-icon name="check" [size]="11" />
              </button>
              <button type="button" class="card-name-btn cancel" (click)="cancelFileNameEdit()" title="Cancel">
                <ts-icon name="x" [size]="11" />
              </button>
            </div>
            @if (nameError()) {
              <div class="card-name-error">{{ nameError() }}</div>
            }
          } @else {
            <div class="card-name-display-box">
              <span class="card-filename" [title]="item().originalName" (click)="onCustomizeClick()">
                <span class="name-base">{{ item().nameWithoutExt }}</span><span class="name-ext">.{{ item().originalExtension }}</span>
              </span>
              <button
                type="button"
                class="card-name-pencil-btn"
                (click)="$event.stopPropagation(); startNameEdit()"
                title="Rename file"
                aria-label="Rename file"
              >
                <ts-icon name="edit-2" [size]="11" />
              </button>
            </div>
          }

          @if (!isEditingName() && !isOutputScreen() && item().individualSettings.hasCustomSettings) {
            <span class="customized-indicator-pill" title="This image has custom individual settings">
              <span class="customized-dot"></span>
              <span>Customized</span>
            </span>
          }
        </div>

        <!-- Row 2: Complete Metrics & Dimensions Row -->
        <div class="card-metrics-row font-mono">
          @if (hasError()) {
            <div class="metrics-line error-line">
              <span class="error-text" [title]="friendlyErrorMessage()">Failed • {{ formattedOriginalSize() }}</span>
            </div>
          } @else if (item().status === 'completed' && item().result) {
            <div class="metrics-line">
              @if (cardStatus().reduced) {
                <span class="metric-size metric-orig font-medium">{{ formattedOriginalSize() }}</span>
                <span class="metric-arrow">→</span>
                <span class="metric-size metric-new metric-saved font-semibold">{{ formattedCompressedSize() }}</span>
                <span class="metric-pct font-semibold">(-{{ cardStatus().savedPercent }}%)</span>
              } @else {
                <span class="metric-size font-medium">{{ formattedCompressedSize() }}</span>
              }
              @if (isResized()) {
                <span class="metric-divider">•</span>
                <span class="card-resized-dims font-mono">{{ formattedOutputDimensions() }}</span>
              }
              @if (!isOutputScreen() && formatConvertedNote()) {
                <span class="metric-divider">•</span>
                <span class="converted-format-note">{{ formatConvertedNote() }}</span>
              }
              @if (!isOutputScreen() && resizedNoteText()) {
                <span class="metric-divider">•</span>
                <span class="card-resized-note">{{ resizedNoteText() }}</span>
              }
            </div>
          } @else {
            <div class="metrics-line">
              @if (showEstimate()) {
                <span class="metric-size font-medium">{{ formattedOriginalSize() }}</span>
                <span class="metric-arrow">→</span>
                <span class="metric-size metric-est font-semibold">est. {{ formattedEstimatedSize() }}</span>
              } @else if (!isProcessing()) {
                <span class="metric-size font-medium">{{ formattedOriginalSize() }}</span>
              }
              @if (isProcessing()) {
                <span class="processing-tag">Optimizing...</span>
              }
            </div>
          }
        </div>

        <!-- Row 3: Action Bar -->
        @if (isOutputScreen()) {
          <!-- Output screen Action Bar: Exactly Preview and Save ONLY -->
          <div class="card-action-bar">
            <!-- Button 1: Preview -->
            <button
              type="button"
              class="card-btn btn-secondary btn-preview"
              (click)="$event.stopPropagation(); previewRequested.emit(item().id)"
              title="Preview and compare original and compressed"
              aria-label="Preview image"
            >
              <ts-icon name="eye" [size]="12" />
              <span>Preview</span>
            </button>

            <!-- Button 2: Direct Save Button -->
            <button
              type="button"
              class="card-btn btn-primary btn-save"
              (click)="$event.stopPropagation(); downloadRequested.emit(item().id)"
              title="Save compressed image to device"
              aria-label="Save image"
            >
              <ts-icon name="download" [size]="12" />
              <span>Save</span>
            </button>

            <!-- Button 3: Individual Share Icon Button -->
            <button
              type="button"
              class="card-btn-share"
              (click)="$event.stopPropagation(); shareCardItem($event)"
              title="Share compressed image"
              aria-label="Share compressed image"
            >
              <ts-icon [name]="isShareSuccess() ? 'check' : 'share-2'" [size]="13" />
            </button>
          </div>

          <!-- Customize again link -->
          <div class="customize-again-wrap">
            <button
              type="button"
              class="customize-again-link"
              (click)="$event.stopPropagation(); onCustomizeClick()"
              title="Customize settings again for this image"
            >
              Customize again
            </button>
          </div>
        }
        @if (!isOutputScreen()) {
          <!-- Working screen Action Bar: Exactly Customize (NO per-card Compress button) -->
          <div class="card-action-bar">
            <button
              type="button"
              class="card-btn btn-secondary btn-customize"
              (click)="$event.stopPropagation(); onCustomizeClick()"
              [disabled]="isProcessing()"
              title="Customize individual compression settings"
              aria-label="Customize settings"
            >
              <ts-icon name="sliders" [size]="12" />
              <span>Customize</span>
            </button>
          </div>
        }
      </div>
    </article>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      min-width: 0;
      animation: cardEnter 300ms cubic-bezier(0.2, 0.6, 0.2, 1) forwards;
    }

    @keyframes cardEnter {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .studio-image-card {
      width: 100%;
      height: 100%;
      min-width: 0;
      background: var(--ts-surface-card, #FFFFFF);
      border: 1px solid var(--border-subtle, #E2E8F0);
      border-radius: var(--ts-radius-card, 16px);
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
      transition: border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                  box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                  transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
    }

    :host-context([data-theme="light"]) .studio-image-card,
    [data-theme="light"] .studio-image-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
    }

    :host-context([data-theme="dark"]) .studio-image-card,
    [data-theme="dark"] .studio-image-card {
      background: #18181B;
      border-color: rgba(255, 255, 255, 0.1);
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    }

    .studio-image-card:hover {
      border-color: var(--accent, #2563EB);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(37, 99, 235, 0.12);
    }

    :host-context([data-theme="dark"]) .studio-image-card:hover,
    [data-theme="dark"] .studio-image-card:hover {
      border-color: var(--accent, #3B82F6);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    }

    .studio-image-card.is-completed {
      border-color: #A7F3D0;
    }

    :host-context([data-theme="dark"]) .studio-image-card.is-completed,
    [data-theme="dark"] .studio-image-card.is-completed {
      border-color: rgba(16, 185, 129, 0.35);
    }

    .studio-image-card.has-error {
      border-color: #FECACA;
    }

    :host-context([data-theme="dark"]) .studio-image-card.has-error,
    [data-theme="dark"] .studio-image-card.has-error {
      border-color: rgba(239, 68, 68, 0.35);
    }

    /* ── Top Thumbnail Frame ── */
    .card-thumb-frame {
      position: relative;
      width: 100%;
      height: var(--tool-thumb-height, var(--image-tile-height, 180px));
      background-color: #F8FAFC;
      background-image: repeating-conic-gradient(rgba(0, 0, 0, 0.03) 0% 25%, transparent 0% 50%);
      background-size: 16px 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      cursor: pointer;
      user-select: none;
    }

    :host-context([data-theme="dark"]) .card-thumb-frame,
    [data-theme="dark"] .card-thumb-frame {
      background-color: #111318;
      background-image: repeating-conic-gradient(rgba(255, 255, 255, 0.03) 0% 25%, transparent 0% 50%);
      background-size: 16px 16px;
    }

    .card-preview-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      display: block;
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .studio-image-card:hover .card-preview-img {
      transform: scale(1.05);
    }

    .thumb-fallback {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94A3B8;
    }

    /* Thumbnail Hover Preview Overlay */
    .thumb-hover-overlay {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.4);
      backdrop-filter: blur(2px);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
      z-index: 5;
    }

    .card-thumb-frame:hover .thumb-hover-overlay {
      opacity: 1;
    }

    .thumb-preview-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      background: rgba(15, 23, 42, 0.85);
      color: #FFFFFF;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      transform: scale(0.95);
      transition: transform 0.2s ease;
    }

    .card-thumb-frame:hover .thumb-preview-pill {
      transform: scale(1);
    }

    /* Format & Savings Badge Top-Left */
    .format-badge-wrap {
      position: absolute;
      top: 8px;
      left: 8px;
      display: flex;
      align-items: center;
      gap: 4px;
      z-index: 10;
    }

    .fmt-badge {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.04em;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(15, 23, 42, 0.72);
      backdrop-filter: blur(4px);
      color: #FFFFFF;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }

    .savings-tag {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      background: #10B981;
      color: #FFFFFF;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    .savings-tag.larger-tag {
      background: #F59E0B;
    }

    .savings-tag.neutral-tag {
      background: #64748B;
    }

    .card-target-line {
      font-size: 11px;
      color: var(--text-muted, #64748B);
      margin-top: 3px;
      line-height: 1.2;
    }

    .card-resized-dims {
      font-size: 11px;
      color: var(--text-muted, #64748B);
    }

    .metric-size.metric-saved {
      color: #059669;
    }

    :host-context([data-theme="dark"]) .metric-size.metric-saved,
    [data-theme="dark"] .metric-size.metric-saved {
      color: #10B981;
    }

    /* Top-Right Close Button */
    .card-remove-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 28px;
      height: 28px;
      min-width: 28px;
      min-height: 28px;
      border-radius: 50%;
      aspect-ratio: 1;
      padding: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0.85;
      transition: all 0.15s ease;
      z-index: 10;
      box-sizing: border-box;
    }

    .card-remove-btn:hover:not(:disabled) {
      opacity: 1;
      background: #FFFFFF;
      color: #EF4444;
      transform: scale(1.08);
    }

    /* Processing Overlay */
    .processing-overlay {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(3px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      z-index: 20;
    }

    .spinner-circle-sm {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-top-color: #3B82F6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .progress-pct {
      font-size: 11px;
      font-weight: 700;
      color: #FFFFFF;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ── Bottom Card Body ── */
    .card-body {
      padding: 10px 12px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .filename-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      min-width: 0;
    }

    .card-name-display-box {
      display: flex;
      align-items: center;
      gap: 4px;
      flex: 1;
      min-width: 0;
    }

    .card-name-pencil-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 4px;
      border: none;
      background: transparent;
      color: var(--text-muted, #94A3B8);
      cursor: pointer;
      padding: 0;
      opacity: 0.6;
      transition: all 0.12s ease;
      flex-shrink: 0;
    }

    .card-name-display-box:hover .card-name-pencil-btn {
      opacity: 1;
    }

    .card-name-pencil-btn:hover {
      background: var(--bg-hover, #F1F5F9);
      color: var(--accent-primary, #2563EB);
    }

    :host-context([data-theme="dark"]) .card-name-pencil-btn:hover,
    [data-theme="dark"] .card-name-pencil-btn:hover {
      background: rgba(51, 65, 85, 0.7);
      color: #60A5FA;
    }

    .card-name-edit-box,
    .card-name-edit-inline {
      display: flex;
      align-items: center;
      gap: 4px;
      flex: 1;
      width: 100%;
      min-width: 0;
    }

    .card-name-input {
      height: 22px;
      padding: 0 4px;
      font-size: 11px;
      border-radius: 4px;
      border: 1px solid var(--accent-primary, #2563EB);
      background: var(--bg-card, #FFFFFF);
      color: var(--text-primary, #0F172A);
      outline: none;
      flex: 1;
      min-width: 0;
      width: 100%;
      box-sizing: border-box;
    }

    :host-context([data-theme="dark"]) .card-name-input,
    [data-theme="dark"] .card-name-input {
      background: #1E293B;
      color: #F8FAFC;
      border-color: #60A5FA;
    }

    .card-name-ext {
      font-size: 11px;
      color: var(--text-muted, #64748B);
      white-space: nowrap;
      flex-shrink: 0;
    }

    .card-name-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 3px;
      border: 1px solid var(--border-subtle, #E2E8F0);
      background: var(--bg-card, #FFFFFF);
      cursor: pointer;
      padding: 0;
      flex-shrink: 0;
    }

    :host-context([data-theme="dark"]) .card-name-btn,
    [data-theme="dark"] .card-name-btn {
      background: #1E293B;
      border-color: rgba(51, 65, 85, 0.9);
    }

    .card-name-btn.check {
      color: #10B981;
    }

    .card-name-btn.cancel {
      color: #EF4444;
    }

    .card-name-error {
      font-size: 10px;
      color: #EF4444;
      font-weight: 600;
      white-space: nowrap;
    }

    .card-filename {
      font-size: 12.5px;
      font-weight: 600;
      color: #0F172A;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: pointer;
      flex: 1;
      min-width: 0;
    }

    :host-context([data-theme="dark"]) .card-filename,
    [data-theme="dark"] .card-filename {
      color: #F8FAFC;
    }

    .card-filename:hover {
      color: #2563EB;
    }

    :host-context([data-theme="dark"]) .card-filename:hover,
    [data-theme="dark"] .card-filename:hover {
      color: #60A5FA;
    }

    .name-ext {
      opacity: 0.65;
      font-weight: 400;
      font-size: 11px;
    }

    .customized-indicator-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 1.5px 6px;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.02em;
      background: rgba(37, 99, 235, 0.1);
      color: var(--accent-primary, #2563EB);
      border: 1px solid rgba(37, 99, 235, 0.25);
      flex-shrink: 0;
      user-select: none;
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

    /* ── Metrics & Dimensions Row ── */
    .card-metrics-row {
      display: flex !important;
      flex-direction: column !important;
      align-items: flex-start !important;
      gap: 2px;
      width: 100%;
      min-height: 18px;
    }

    .metrics-line {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11.5px;
      color: #64748B;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      width: 100%;
    }

    :host-context([data-theme="dark"]) .metrics-line,
    [data-theme="dark"] .metrics-line {
      color: #94A3B8;
    }

    .metric-size {
      color: #0F172A;
    }

    .not-reduced-reason {
      color: #64748B;
      font-size: 10.5px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .target-status-msg {
      font-size: 10.5px;
      color: #64748B;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .target-status-msg.is-achieved {
      color: #059669;
      font-weight: 600;
    }

    .target-unreachable-msg,
    .target-not-reached-note {
      font-size: 10.5px;
      color: #D97706;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    :host-context([data-theme="dark"]) .target-unreachable-msg,
    [data-theme="dark"] .target-unreachable-msg,
    :host-context([data-theme="dark"]) .target-not-reached-note,
    [data-theme="dark"] .target-not-reached-note {
      color: #FBBF24;
    }

    .closest-size-badge {
      font-size: 10.5px;
      color: var(--accent-primary, #2563EB);
      font-weight: 600;
    }

    :host-context([data-theme="dark"]) .closest-size-badge,
    [data-theme="dark"] .closest-size-badge {
      color: #60A5FA;
    }

    .target-unreachable-pill {
      background: rgba(239, 68, 68, 0.12) !important;
      color: #DC2626 !important;
      border-color: rgba(239, 68, 68, 0.25) !important;
    }

    :host-context([data-theme="dark"]) .target-unreachable-pill,
    [data-theme="dark"] .target-unreachable-pill {
      background: rgba(239, 68, 68, 0.2) !important;
      color: #FCA5A5 !important;
      border-color: rgba(239, 68, 68, 0.4) !important;
    }

    .btn-use-closest {
      color: var(--accent-primary, #2563EB);
      border-color: rgba(37, 99, 235, 0.3);
    }

    .btn-use-closest:hover {
      background: rgba(37, 99, 235, 0.08);
      border-color: var(--accent-primary, #2563EB);
    }

    :host-context([data-theme="dark"]) .not-reduced-reason,
    [data-theme="dark"] .not-reduced-reason {
      color: #94A3B8;
    }

    :host-context([data-theme="dark"]) .target-status-msg,
    [data-theme="dark"] .target-status-msg {
      color: #94A3B8;
    }

    :host-context([data-theme="dark"]) .target-status-msg.is-achieved,
    [data-theme="dark"] .target-status-msg.is-achieved {
      color: #34D399;
    }

    :host-context([data-theme="dark"]) .metric-size,
    [data-theme="dark"] .metric-size {
      color: #F1F5F9;
    }

    .metric-orig {
      color: #64748B;
    }

    :host-context([data-theme="dark"]) .metric-orig,
    [data-theme="dark"] .metric-orig {
      color: #94A3B8;
    }

    .metric-arrow {
      font-size: 10px;
      opacity: 0.6;
    }

    .metric-new {
      color: #059669;
    }

    .metric-est {
      color: var(--color-primary-600, #2563EB);
    }

    :host-context([data-theme="dark"]) .metric-est,
    [data-theme="dark"] .metric-est {
      color: #60A5FA;
    }

    :host-context([data-theme="dark"]) .metric-new,
    [data-theme="dark"] .metric-new {
      color: #10B981;
    }

    .metric-new.is-larger {
      color: #D97706;
    }

    :host-context([data-theme="dark"]) .metric-new.is-larger,
    [data-theme="dark"] .metric-new.is-larger {
      color: #F59E0B;
    }

    .metric-divider {
      opacity: 0.35;
      font-size: 8px;
    }

    .metric-dims {
      font-size: 10.5px;
      opacity: 0.75;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .metric-status {
      font-size: 11px;
      color: #64748B;
    }

    :host-context([data-theme="dark"]) .metric-status,
    [data-theme="dark"] .metric-status {
      color: #94A3B8;
    }

    .error-text {
      font-size: 11px;
      font-weight: 600;
      color: #EF4444;
    }

    .processing-tag {
      font-size: 10px;
      color: var(--accent, #2563EB);
      margin-left: auto;
    }

    /* ── Action Bar Grid / Flex ── */
    .card-action-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
      width: 100%;
    }

    .card-btn {
      flex: 1;
      height: 28px;
      padding: 0 8px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      border: 1px solid transparent;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
      user-select: none;
      box-sizing: border-box;
      min-width: 0;
    }

    .card-btn span {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Button Variants */
    .btn-secondary {
      background: #F1F5F9;
      border-color: #E2E8F0;
      color: #334155;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #E2E8F0;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    :host-context([data-theme="dark"]) .btn-secondary,
    [data-theme="dark"] .btn-secondary {
      background: #27272A;
      border-color: rgba(255, 255, 255, 0.1);
      color: #E4E4E7;
    }

    :host-context([data-theme="dark"]) .btn-secondary:hover:not(:disabled),
    [data-theme="dark"] .btn-secondary:hover:not(:disabled) {
      background: #3F3F46;
      border-color: rgba(255, 255, 255, 0.2);
      color: #FFFFFF;
    }

    .btn-retry {
      background: #FEF3C7;
      border-color: #FDE68A;
      color: #92400E;
    }

    .btn-retry:hover:not(:disabled) {
      background: #FDE68A;
      border-color: #FCD34D;
      color: #78350F;
    }

    :host-context([data-theme="dark"]) .btn-retry,
    [data-theme="dark"] .btn-retry {
      background: rgba(245, 158, 11, 0.2);
      border-color: rgba(245, 158, 11, 0.4);
      color: #FCD34D;
    }

    :host-context([data-theme="dark"]) .btn-retry:hover:not(:disabled),
    [data-theme="dark"] .btn-retry:hover:not(:disabled) {
      background: rgba(245, 158, 11, 0.3);
      border-color: rgba(245, 158, 11, 0.6);
      color: #FDE68A;
    }

    .btn-save {
      background: var(--accent, #2563EB);
      border-color: var(--accent, #2563EB);
      color: #FFFFFF;
      box-shadow: 0 1px 3px rgba(37, 99, 235, 0.3);
    }

    .btn-save:hover {
      background: var(--accent-hover, #1D4ED8);
      border-color: var(--accent-hover, #1D4ED8);
      transform: translateY(-0.5px);
      box-shadow: 0 2px 6px rgba(37, 99, 235, 0.4);
    }

    .card-btn-share {
      width: 28px;
      min-width: 28px;
      height: 28px;
      border-radius: 6px;
      background: #F1F5F9;
      border: 1px solid #E2E8F0;
      color: var(--text-secondary, #475569);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 150ms ease;
      flex-shrink: 0;
      padding: 0;
    }

    .card-btn-share:hover {
      background: #E2E8F0;
      color: var(--accent, #2563EB);
      border-color: #CBD5E1;
      transform: translateY(-0.5px);
    }

    :host-context([data-theme="dark"]) .card-btn-share,
    [data-theme="dark"] .card-btn-share {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.12);
      color: #94A3B8;
    }

    :host-context([data-theme="dark"]) .card-btn-share:hover,
    [data-theme="dark"] .card-btn-share:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.2);
      color: #60A5FA;
    }

    .card-save-dropdown-menu {
      position: absolute;
      top: calc(100% + 4px);
      right: 0;
      min-width: 220px;
      background: var(--bg-surface, #FFFFFF);
      border: 1px solid var(--border-subtle, #E2E8F0);
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      padding: 6px;
      z-index: 100;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    :host-context([data-theme="dark"]) .card-save-dropdown-menu,
    [data-theme="dark"] .card-save-dropdown-menu {
      background: var(--bg-surface-dark, #1E293B);
      border-color: var(--border-subtle-dark, #334155);
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.5);
    }

    .save-dropdown-item {
      min-height: 44px;
      height: 44px;
      width: 100%;
      display: flex;
      align-items: center;
      padding: 0 12px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: var(--text-primary, #0F172A);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      gap: 12px;
      text-align: left;
      transition: background 0.15s ease, color 0.15s ease;
      box-sizing: border-box;
    }

    :host-context([data-theme="dark"]) .save-dropdown-item,
    [data-theme="dark"] .save-dropdown-item {
      color: #F8FAFC;
    }

    .save-dropdown-item:hover:not([disabled]):not(.is-disabled) {
      background: var(--bg-canvas, #F1F5F9);
    }

    :host-context([data-theme="dark"]) .save-dropdown-item:hover:not([disabled]):not(.is-disabled),
    [data-theme="dark"] .save-dropdown-item:hover:not([disabled]):not(.is-disabled) {
      background: rgba(255, 255, 255, 0.08);
    }

    .save-dropdown-item.is-disabled,
    .save-dropdown-item:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .save-dropdown-item .item-icon-circle {
      width: 32px;
      height: 32px;
      min-width: 32px;
      min-height: 32px;
      border-radius: 9999px;
      background: var(--bg-canvas, #F8FAFC);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-primary-600, #2563EB);
      flex-shrink: 0;
      transition: transform 0.15s ease;
    }

    :host-context([data-theme="dark"]) .save-dropdown-item .item-icon-circle,
    [data-theme="dark"] .save-dropdown-item .item-icon-circle {
      background: #0F172A;
      color: #60A5FA;
    }

    .save-dropdown-item:hover:not(.is-disabled) .item-icon-circle {
      transform: scale(1.08);
    }

    .save-dropdown-item .item-brand-logo {
      width: 18px;
      height: 18px;
      object-fit: contain;
      display: block;
    }

    .save-dropdown-item .item-label {
      font-size: 13px;
      font-weight: 500;
      flex: 1;
    }

    .not-set-up-tag {
      font-size: 10.5px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(148, 163, 184, 0.2);
      color: #64748B;
      white-space: nowrap;
      margin-left: auto;
    }

    :host-context([data-theme="dark"]) .not-set-up-tag,
    [data-theme="dark"] .not-set-up-tag {
      background: rgba(148, 163, 184, 0.15);
      color: #94A3B8;
    }

    .card-clipboard-alert {
      position: absolute;
      bottom: calc(100% + 4px);
      left: 0;
      right: 0;
      background: #0F172A;
      color: #FFFFFF;
      font-size: 11px;
      padding: 6px 10px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 101;
      text-align: center;
    }

    .btn-retry {
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.25);
      color: #EF4444;
    }

    .btn-retry:hover {
      background: #EF4444;
      border-color: #EF4444;
      color: #FFFFFF;
    }

    :host-context([data-theme="dark"]) .btn-retry,
    [data-theme="dark"] .btn-retry {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.3);
      color: #F87171;
    }

    :host-context([data-theme="dark"]) .btn-retry:hover,
    [data-theme="dark"] .btn-retry:hover {
      background: #EF4444;
      border-color: #EF4444;
      color: #FFFFFF;
    }

    .card-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @media (max-width: 479px) {
      .card-metrics-row {
        display: flex !important;
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 2px !important;
        width: 100% !important;
      }
      .metrics-line {
        font-size: 11.5px !important;
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        flex-wrap: nowrap !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        width: 100% !important;
      }
      .metric-arrow,
      .metric-est {
        white-space: nowrap !important;
      }
      .card-target-line {
        font-size: 10.5px !important;
        line-height: 1.25 !important;
        white-space: normal !important;
        word-break: break-word !important;
        width: 100% !important;
        display: block !important;
      }
      .card-action-bar {
        width: 100%;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 8px;
      }
      .card-btn.btn-customize {
        width: 100%;
        min-height: 44px;
        height: 44px;
        font-size: 13.5px;
        justify-content: center;
      }
      .card-btn.btn-preview,
      .card-btn.btn-save {
        flex: 1;
        min-width: 0;
        min-height: 44px;
        height: 44px;
        font-size: 13.5px;
        justify-content: center;
      }
      .card-btn-share {
        width: 44px;
        min-width: 44px;
        height: 44px;
        min-height: 44px;
      }
      .customize-again-link {
        min-height: 44px;
        padding: 10px 16px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
      }
    }

    .honest-explanation-sub {
      font-size: 10.5px;
      line-height: 1.3;
      color: #64748B;
      margin-top: 2px;
      white-space: normal;
    }

    :host-context([data-theme="dark"]) .honest-explanation-sub,
    [data-theme="dark"] .honest-explanation-sub {
      color: #94A3B8;
    }

    .card-resized-note {
      font-size: 10.5px;
      line-height: 1.3;
      color: #0284C7;
      margin-top: 2px;
    }

    :host-context([data-theme="dark"]) .card-resized-note,
    [data-theme="dark"] .card-resized-note {
      color: #38BDF8;
    }

    .converted-format-note {
      font-size: 11px;
      font-weight: 600;
      color: var(--accent, #2563EB);
      background: rgba(37, 99, 235, 0.08);
      padding: 1px 6px;
      border-radius: 4px;
    }

    :host-context([data-theme="dark"]) .converted-format-note,
    [data-theme="dark"] .converted-format-note {
      color: #60A5FA;
      background: rgba(96, 165, 250, 0.12);
    }

    .customize-again-wrap {
      display: flex;
      justify-content: center;
      margin-top: 8px;
    }

    .customize-again-link {
      background: none;
      border: none;
      padding: 2px 6px;
      font-size: 11px;
      font-weight: 500;
      color: var(--accent, #2563EB);
      cursor: pointer;
      text-decoration: underline;
      text-underline-offset: 3px;
      transition: opacity 150ms ease;
    }

    .customize-again-link:hover {
      opacity: 0.8;
    }

    :host-context([data-theme="dark"]) .customize-again-link,
    [data-theme="dark"] .customize-again-link {
      color: var(--accent, #3B82F6);
    }
  `]
})
export class ImageCardComponent implements OnDestroy {
  private readonly estimator = inject(SizeEstimatorService);
  private readonly state = inject(CompressorStateService, { optional: true });
  private estimateDebounceTimer: any = null;

  readonly isShareSuccess = signal<boolean>(false);
  private shareResetTimer: any = null;

  async shareCardItem(event?: Event): Promise<void> {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    const it = this.item();
    const blob = it.result?.outputBlob;
    const targetExt = it.result?.outputFormat || (it.effectiveSettings?.outputFormat === 'original' ? it.originalExtension : it.effectiveSettings?.outputFormat) || it.originalExtension;
    const filename = `${it.nameWithoutExt}.${targetExt}`;

    if (!blob) {
      this.state?.showToast('warning', 'No compressed output to share', 2500);
      return;
    }

    // Try Web Share API if supported
    if (typeof navigator !== 'undefined' && navigator.canShare && typeof File !== 'undefined') {
      try {
        const file = new File([blob], filename, { type: blob.type || 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: filename,
            text: `Compressed with Acklet (${this.formattedCompressedSize()})`
          });
          this.triggerShareSuccess();
          return;
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return;
        }
      }
    }

    // Fallback: copy to clipboard
    const res = await copyBlobToClipboard(blob);
    if (res.success) {
      this.triggerShareSuccess();
      this.state?.showToast('success', 'Image copied to clipboard for sharing', 3000);
    } else {
      this.state?.showToast('info', 'Your browser cannot share this file directly. Use Save to download.', 3500);
    }
  }

  private triggerShareSuccess(): void {
    this.isShareSuccess.set(true);
    if (this.shareResetTimer) clearTimeout(this.shareResetTimer);
    this.shareResetTimer = setTimeout(() => this.isShareSuccess.set(false), 2000);
  }

  readonly item = input.required<ImageItem>();
  readonly isOutputScreen = input<boolean>(false);

  readonly estimatedSize = signal<number | null>(null);

  readonly showEstimate = computed(() => {
    if (this.isOutputScreen()) return false;
    const est = this.estimatedSize();
    const orig = this.item().originalSize;
    return est !== null && est > 0 && est < orig;
  });

  readonly formattedEstimatedSize = computed(() => {
    const est = this.estimatedSize();
    return est ? this.formatBytes(est) : '';
  });

  readonly selectToggled = output<string>();
  readonly previewRequested = output<string>();
  readonly settingsRequested = output<string>();
  readonly customizeRequested = output<string>();
  readonly removeRequested = output<string>();
  readonly compressRequested = output<string>();
  readonly cancelRequested = output<string>();
  readonly downloadRequested = output<string>();
  readonly keepOriginalRequested = output<string>();
  readonly applyRecommendationRequested = output<string>();
  readonly inspectMetadataRequested = output<string>();
  readonly downloadVariantRequested = output<{ imageId: string; variantId: string }>();
  readonly retryRequested = output<string>();
  readonly renameRequested = output<{ id: string; newBaseName: string }>();

  readonly Math = Math;

  readonly isEditingName = signal<boolean>(false);
  readonly editNameValue = signal<string>('');
  readonly nameError = signal<string>('');

  constructor() {
    effect(() => {
      const it = this.item();
      const settings = it.effectiveSettings;
      const detectedFormat = it.detectedFormat;
      const originalSize = it.originalSize;
      const width = it.width;
      const height = it.height;

      // Initial immediate evaluation if not set yet
      if (this.estimatedSize() === null) {
        const initialEst = this.estimator.estimateSize({
          originalSize,
          detectedFormat,
          settings,
          width,
          height
        });
        this.estimatedSize.set(initialEst);
      }

      // Debounce updates by 300 ms on subsequent settings changes
      if (this.estimateDebounceTimer) {
        clearTimeout(this.estimateDebounceTimer);
      }
      this.estimateDebounceTimer = setTimeout(() => {
        const est = this.estimator.estimateSize({
          originalSize,
          detectedFormat,
          settings,
          width,
          height
        });
        this.estimatedSize.set(est);
      }, 300);
    });
  }

  ngOnDestroy(): void {
    if (this.estimateDebounceTimer) {
      clearTimeout(this.estimateDebounceTimer);
      this.estimateDebounceTimer = null;
    }
    if (this.shareResetTimer) {
      clearTimeout(this.shareResetTimer);
      this.shareResetTimer = null;
    }
  }

  startNameEdit(): void {
    this.editNameValue.set(this.item().nameWithoutExt);
    this.nameError.set('');
    this.isEditingName.set(true);
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
    this.renameRequested.emit({ id: this.item().id, newBaseName: sanitized });
    this.isEditingName.set(false);
    this.nameError.set('');
  }

  cancelFileNameEdit(): void {
    this.isEditingName.set(false);
    this.nameError.set('');
  }

  readonly isProcessing = computed(() => {
    const s = this.item().status;
    return ['pending', 'decoding', 'processing', 'optimizing', 'encoding'].includes(s);
  });

  readonly hasError = computed(() => {
    const s = this.item().status;
    return s === 'corrupted' || s === 'invalid' || s === 'failed' || s === 'unsupported';
  });

  readonly friendlyErrorMessage = computed(() => {
    const err = this.item().error;
    if (err) {
      if (err.includes('50 MB')) return 'This file is too large (max 50 MB). Try a smaller file.';
      if (err.includes('100 MP')) return 'Image dimensions are too large. Try a smaller image.';
      if (err.includes('corrupted') || err.includes('decode')) return 'Could not read this image. The file may be damaged.';
      if (err.includes('unsupported') || err.includes('format')) return 'This format is not supported. Try PNG, JPG, or WebP.';
      return err;
    }
    return 'Could not process this file. Try another image.';
  });

  readonly formattedOriginalSize = computed(() => {
    const orig = this.item().originalUploadedSize || this.item().originalSize;
    return this.formatBytes(orig);
  });

  readonly cardStatus = computed(() => resultStatus(this.item()));

  readonly formattedCompressedSize = computed(() => {
    const status = this.cardStatus();
    if (this.item().status === 'completed' && status.outputBytes > 0) {
      return this.formatBytes(status.outputBytes);
    }
    if (this.item().result?.compressedSize) {
      return this.formatBytes(this.item().result!.compressedSize);
    }
    if (this.item().currentWorkingSource?.size) {
      return this.formatBytes(this.item().currentWorkingSource!.size);
    }
    return this.item().status === 'completed' ? this.formatBytes(status.outputBytes) : '—';
  });

  readonly isTargetUnreachable = computed<boolean>(() => {
    const status = this.cardStatus();
    return status.targetBytes !== null && !status.targetMet;
  });

  readonly targetStatusMessage = computed<string | null>(() => {
    const res = this.item().result;
    if (!res) return null;
    if (this.isTargetUnreachable()) {
      return res.reductionReason || "Your target size couldn't be reached without significant quality loss. Try a larger target.";
    }
    const settings = this.item().effectiveSettings;
    const targetBytes = res?.targetBytesRequested ||
      (settings?.targetFileSize?.enabled ? settings.targetFileSize.targetBytes : undefined);
    if (!targetBytes) return null;
    return getTargetStatusMessage(targetBytes, res.compressedSize);
  });

  readonly isTargetAchieved = computed<boolean>(() => {
    const res = this.item().result;
    if (!res) return false;
    if (res.targetAchieved !== undefined) return res.targetAchieved;
    const settings = this.item().effectiveSettings;
    const targetBytes = res?.targetBytesRequested ||
      (settings?.targetFileSize?.enabled ? settings.targetFileSize.targetBytes : undefined);
    if (!targetBytes) return false;
    return res.compressedSize <= targetBytes;
  });

  readonly closestAchievableSizeFormatted = computed<string | null>(() => {
    const res = this.item().result;
    if (res?.closestAchievableSize && res.closestAchievableSize > 0) {
      return this.formatBytes(res.closestAchievableSize);
    }
    return null;
  });

  onApplyClosestResult(): void {
    if (this.state) {
      this.state.applyClosestResult(this.item().id);
    }
  }

  readonly isNotReduced = computed(() => {
    return !this.cardStatus().reduced;
  });

  readonly notReducedReason = computed(() => {
    const res = this.item().result;
    return res?.reductionReason || 'Already optimal. Try a target or a format.';
  });

  readonly formattedDimensions = computed(() => {
    const w = this.item().width;
    const h = this.item().height;
    if (w > 0 && h > 0) return `${w} × ${h} px`;
    return 'Vector / Dynamic';
  });

  readonly formattedOutputDimensions = computed(() => {
    const result = this.item().result;
    if (result && result.outputWidth > 0 && result.outputHeight > 0) {
      return `${result.outputWidth} × ${result.outputHeight} px`;
    }
    return this.formattedDimensions();
  });

  readonly isResized = computed<boolean>(() => {
    const r = this.item().result;
    if (!r) return false;
    const origW = this.item().width || r.originalWidth;
    const origH = this.item().height || r.originalHeight;
    return (r.outputWidth > 0 && r.outputHeight > 0 && (r.outputWidth !== origW || r.outputHeight !== origH));
  });

  readonly targetLine = computed<string | null>(() => null);

  readonly resizedNote = computed<string>(() => {
    const r = this.item().result;
    if (!r) return '';
    if (r.resizedNote) return r.resizedNote;
    if (r.resizedToPercent) return `Resized to ${r.resizedToPercent}%`;
    const origW = this.item().width || r.originalWidth;
    const origH = this.item().height || r.originalHeight;
    return `Resized: ${origW} × ${origH} to ${r.outputWidth} × ${r.outputHeight}`;
  });

  readonly resizedNoteText = computed<string>(() => {
    const r = this.item().result;
    if (!r) return '';
    if (r.resizedNote) return r.resizedNote;
    if (r.resizedToPercent) return `Resized to ${r.resizedToPercent}%`;
    return '';
  });

  readonly formatConvertedNote = computed<string>(() => {
    const r = this.item().result;
    if (!r) return '';

    // Only indicate a format conversion when:
    // 1. The user explicitly selected a different output format, and
    // 2. The resulting file was successfully encoded in that format.
    const userSelectedFormat = this.item().effectiveSettings?.outputFormat;
    const isExplicitUserConversion =
      userSelectedFormat &&
      userSelectedFormat !== 'original' &&
      userSelectedFormat.toLowerCase() !== (this.item().detectedFormat || '').toLowerCase();

    if (!isExplicitUserConversion) {
      return '';
    }

    if (r.outputFormat && r.outputFormat.toLowerCase() === userSelectedFormat.toLowerCase()) {
      const ext = r.outputFormat === 'jpeg' ? 'JPG' : r.outputFormat.toUpperCase();
      return `Converted to ${ext}`;
    }

    return '';
  });

  readonly qualityScore = computed<number>(() => {
    const ssim = this.item().result?.visualQuality?.ssim;
    if (typeof ssim === 'number') {
      return Math.min(100, Math.max(0, Math.round(ssim * 100)));
    }
    return 100;
  });

  onCustomizeClick(): void {
    this.customizeRequested.emit(this.item().id);
    this.settingsRequested.emit(this.item().id);
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const val = bytes / Math.pow(k, i);
    const formatted = val >= 100 ? val.toFixed(0) : val.toFixed(1);
    return `${formatted} ${sizes[i]}`;
  }
}

/**
 * Calculates target status message accurately:
 * - "Target size achieved" ONLY when compressedSize <= targetBytes
 * - "Closest size: X" when compressedSize > targetBytes
 */
export function getTargetStatusMessage(targetBytes: number | undefined, compressedBytes: number): string | null {
  if (!targetBytes || targetBytes <= 0) return null;
  if (compressedBytes <= targetBytes) {
    return 'Target size achieved';
  }
  const kb = compressedBytes / 1024;
  let formattedSize: string;
  if (compressedBytes < 1024) {
    formattedSize = `${compressedBytes} B`;
  } else if (kb < 1024) {
    const rounded = Math.round(kb * 10) / 10;
    formattedSize = `${rounded % 1 === 0 && rounded >= 10 ? rounded : rounded.toFixed(1)} KB`;
  } else {
    const mb = Math.round((compressedBytes / (1024 * 1024)) * 10) / 10;
    formattedSize = `${mb % 1 === 0 && mb >= 10 ? mb : mb.toFixed(1)} MB`;
  }
  return `Closest size: ${formattedSize}`;
}

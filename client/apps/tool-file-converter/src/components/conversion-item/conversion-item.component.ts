// apps/tool-file-converter/src/components/conversion-item/conversion-item.component.ts
import { Component, ChangeDetectionStrategy, input, output, computed, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TsIconComponent } from '@acklet/tool-shell';
import { ConversionJob, FormatDescriptor } from '../../models/converter.models';

@Component({
  selector: 'app-conversion-item',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="studio-image-card"
      [class.is-completed]="job().status === 'completed'"
      [class.is-converting]="job().status === 'converting'"
      [class.is-error]="job().status === 'error'"
      [class.is-removing]="isRemoving()"
      [class.is-dropdown-active]="isDropdownOpen()"
    >
      <!-- Top Thumbnail Frame -->
      <div
        class="card-thumb-frame"
        (click)="onPreviewClick()"
        [title]="canPreviewResult() ? 'Click to preview image' : ''"
        [class.is-clickable]="canPreviewResult()"
      >
        @if (isPdfTarget()) {
          <div class="card-pdf-frame">
            <div class="card-pdf-icon-circle">
              <ts-icon name="file-text" [size]="32" />
            </div>
          </div>
        } @else if (cardPreviewUrl(); as src) {
          @if (!hasImageError()) {
            <img
              [src]="src"
              [alt]="job().file.name"
              class="card-preview-img"
              loading="lazy"
              (error)="onCardImageError()"
            />
          } @else {
            <div class="card-fallback-icon" [attr.data-category]="job().detectedFormat.category">
              <ts-icon [name]="getCategoryIcon(job().detectedFormat.category)" [size]="28" />
            </div>
          }
        } @else {
          <div class="card-fallback-icon" [attr.data-category]="job().detectedFormat.category">
            <ts-icon [name]="getCategoryIcon(job().detectedFormat.category)" [size]="28" />
          </div>
        }

        <!-- Top-Left Format Conversion Selector Pill -->
        <div class="format-conversion-badge" [class.is-open]="isDropdownOpen()" (click)="$event.stopPropagation()">
          <span class="fmt-source-label">{{ (job().detectedFormat.format || 'IMG') | uppercase }}</span>
          <ts-icon name="arrow-right" [size]="8" class="fmt-arrow-icon" />

          <div class="card-dropdown-wrap">
            <button
              type="button"
              class="card-dropdown-trigger font-mono"
              (click)="toggleDropdown($event)"
              [disabled]="job().status === 'converting'"
              [attr.aria-expanded]="isDropdownOpen()"
              aria-label="Change target format"
              title="Change output format for this image"
            >
              <span class="selected-target-text">{{ (job().targetFormat.format || '...') | uppercase }}</span>
              <ts-icon name="chevron-down" [size]="8" class="card-dropdown-chevron" [class.rotated]="isDropdownOpen()" />
            </button>

            @if (isDropdownOpen()) {
              <div class="card-dropdown-menu font-mono" role="listbox">
                @for (out of deduplicatedOutputs(); track out.format) {
                  <button
                    type="button"
                    class="card-dropdown-opt"
                    [class.is-selected]="isFormatSelected(out.format)"
                    (click)="selectFormat(out.format, $event)"
                    role="option"
                    [attr.aria-selected]="isFormatSelected(out.format)"
                  >
                    <span>{{ out.label || (out.format | uppercase) }}</span>
                    @if (isFormatSelected(out.format)) {
                      <ts-icon name="check" [size]="11" class="check-icon" />
                    }
                  </button>
                }
              </div>
            }
          </div>
        </div>

        <!-- Top-Right Delete Button -->
        <button
          type="button"
          class="card-remove-btn"
          (click)="$event.stopPropagation(); onRemoveClick()"
          [disabled]="job().status === 'converting' || isRemoving()"
          title="Remove image from batch"
          aria-label="Remove image"
        >
          <ts-icon name="x" [size]="13" />
        </button>

        <!-- Converting Progress Overlay -->
        @if (job().status === 'converting') {
          <div class="converting-overlay">
            <span class="spinner-circle-sm"></span>
            <span class="converting-pct font-mono">{{ job().progress }}%</span>
            <span class="converting-stage">{{ job().progressStage || 'Converting' }}</span>
          </div>
        }
      </div>

      <!-- Bottom Card Body / Details (Clean 2-row layout) -->
      <div class="card-body">
        <div class="filename-row">
          @if (!isEditing()) {
            <div class="filename-display-wrap">
              <span class="card-filename" [title]="displayName()" (click)="startEditing($event)">
                <span class="name-base">{{ nameParts().base }}</span><span class="name-ext font-mono">{{ nameParts().ext }}</span>
              </span>
              <button
                type="button"
                class="filename-edit-btn"
                (click)="startEditing($event)"
                title="Rename file (extension remains {{ nameParts().ext }})"
                aria-label="Rename file"
              >
                <ts-icon name="pencil" [size]="11" />
              </button>
            </div>
          } @else {
            <div class="filename-inline-edit" (click)="$event.stopPropagation()">
              <div class="inline-edit-input-pill font-mono">
                <input
                  [id]="'filename-input-' + job().id"
                  type="text"
                  class="inline-name-field"
                  [value]="editingName()"
                  (input)="onNameInput($event)"
                  (keydown.enter)="commitEdit()"
                  (keydown.escape)="cancelEdit()"
                  (blur)="onInputBlur()"
                  placeholder="File name"
                  aria-label="File name (without extension)"
                />
                <span class="inline-fixed-ext" title="Extension cannot be modified">{{ nameParts().ext }}</span>
              </div>
              <div class="inline-edit-actions">
                <button
                  type="button"
                  class="inline-action-btn btn-save"
                  (mousedown)="commitEdit()"
                  title="Save (Enter)"
                  aria-label="Save file name"
                >
                  <ts-icon name="check" [size]="11" />
                </button>
                <button
                  type="button"
                  class="inline-action-btn btn-cancel"
                  (mousedown)="cancelEdit()"
                  title="Cancel (Esc)"
                  aria-label="Cancel editing"
                >
                  <ts-icon name="x" [size]="11" />
                </button>
              </div>
            </div>
          }
        </div>

        <div class="card-meta-row font-mono">
          <span class="original-size-text whitespace-nowrap">{{ formatFileSize((job().status === 'completed' && job().resultSize) ? job().resultSize! : job().file.size) }}</span>
          <span class="verified-dot" title="Status"></span>
        </div>

        <!-- Completed Actions (View & Save) -->
        @if (job().status === 'completed') {
          <div class="card-footer-actions">
            @if (canPreviewResult()) {
              <button
                type="button"
                class="card-view-btn"
                (click)="previewRequested.emit(job())"
                title="Preview full image"
              >
                <ts-icon name="eye" [size]="12" />
                <span class="action-btn-text">View</span>
              </button>
            }
            <button
              type="button"
              class="card-download-btn"
              (click)="download.emit(job().id)"
              title="Download converted file"
            >
              <ts-icon name="download" [size]="12" />
              <span class="action-btn-text">Save</span>
            </button>
          </div>
        } @else if (job().status === 'error') {
          <div class="card-error-box">
            <span class="card-error-label" [title]="job().errorMessage || 'Conversion failed'">Failed</span>
            <button
              type="button"
              class="card-retry-btn"
              (click)="convert.emit(job().id)"
              title="Retry conversion"
            >
              <ts-icon name="refresh-cw" [size]="11" />
              <span>Retry</span>
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .studio-image-card {
      min-width: 200px;
      background: var(--ts-surface-raised, #18181B);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      border-radius: var(--ts-radius-card, 16px);
      overflow: visible;
      display: flex;
      flex-direction: column;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.14);
      transition: border-color 0.25s, box-shadow 0.25s, transform 0.25s;
      position: relative;
      animation: cardEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .studio-image-card.is-dropdown-active {
      z-index: 100 !important;
    }

    .studio-image-card.is-dropdown-active .card-thumb-frame {
      overflow: visible !important;
    }

    .studio-image-card.is-removing {
      animation: cardExit 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
      pointer-events: none;
    }

    @keyframes cardEnter {
      from {
        opacity: 0;
        transform: translateY(14px) scale(0.94);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes cardExit {
      from {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      to {
        opacity: 0;
        transform: translateY(-10px) scale(0.9);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .studio-image-card,
      .studio-image-card.is-removing {
        animation-duration: 0.01ms !important;
      }
    }

    :host-context([data-theme="light"]) .studio-image-card,
    [data-theme="light"] .studio-image-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
    }

    .studio-image-card:hover {
      border-color: var(--accent, #3B82F6);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
    }

    :host-context([data-theme="light"]) .studio-image-card:hover,
    [data-theme="light"] .studio-image-card:hover {
      border-color: #2563EB;
      box-shadow: 0 8px 24px rgba(37, 99, 235, 0.12);
    }

    .studio-image-card.is-completed {
      border-color: rgba(16, 185, 129, 0.35);
    }

    :host-context([data-theme="light"]) .studio-image-card.is-completed,
    [data-theme="light"] .studio-image-card.is-completed {
      border-color: #A7F3D0;
    }

    .studio-image-card.is-error {
      border-color: rgba(239, 68, 68, 0.35);
    }

    :host-context([data-theme="light"]) .studio-image-card.is-error,
    [data-theme="light"] .studio-image-card.is-error {
      border-color: #FECACA;
    }

    /* ─── Top Thumbnail Frame ─── */
    .card-thumb-frame {
      position: relative;
      width: 100%;
      aspect-ratio: 4 / 3;
      background: var(--ts-surface-inset, rgba(255, 255, 255, 0.03));
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      user-select: none;
      border-top-left-radius: var(--ts-radius-card, 16px);
      border-top-right-radius: var(--ts-radius-card, 16px);
    }

    :host-context([data-theme="light"]) .card-thumb-frame,
    [data-theme="light"] .card-thumb-frame {
      background: #F8FAFC;
    }

    /* ─── PDF Document Card View ─── */
    .card-pdf-frame {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: var(--ts-surface-inset, rgba(239, 68, 68, 0.05));
      user-select: none;
    }

    :host-context([data-theme="light"]) .card-pdf-frame,
    [data-theme="light"] .card-pdf-frame {
      background: rgba(239, 68, 68, 0.04);
    }

    .card-pdf-icon-circle {
      width: 52px;
      height: 52px;
      color: #eb5959ff;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .studio-image-card:hover .card-pdf-icon-circle {
      transform: scale(1.08);
    }

    .card-pdf-tag {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.05em;
      padding: 3px 8px;
      border-radius: 5px;
      background: rgba(239, 68, 68, 0.12);
      color: #EF4444;
      border: 1px solid rgba(239, 68, 68, 0.22);
    }

    .card-thumb-frame.is-clickable {
      cursor: pointer;
    }

    .card-preview-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      padding: 0;
      box-sizing: border-box;
      border-top-left-radius: var(--ts-radius-card, 16px);
      border-top-right-radius: var(--ts-radius-card, 16px);
      display: block;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .card-thumb-frame:hover .card-preview-img {
      transform: scale(1.02);
    }

    .card-fallback-icon {
      color: var(--text-muted, #94A3B8);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .format-conversion-badge {
      position: absolute;
      top: 8px;
      left: 8px;
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 2px 6px;
      height: 22px;
      box-sizing: border-box;
      border-radius: 6px;
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.18);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      color: var(--text, #FFFFFF);
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.02em;
      line-height: 1;
      transition: border-color 0.15s, background-color 0.15s;
      flex-shrink: 0;
      z-index: 10;
    }

    :host-context([data-theme="light"]) .format-conversion-badge,
    [data-theme="light"] .format-conversion-badge {
      background: rgba(255, 255, 255, 0.92);
      border-color: rgba(203, 213, 225, 0.9);
      color: #0F172A;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
    }

    :host-context([data-theme="light"]) .format-conversion-badge.is-open,
    [data-theme="light"] .format-conversion-badge.is-open {
      border-color: #2563EB;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
    }

    .fmt-source-label {
      color: inherit;
    }

    .fmt-arrow-icon {
      color: var(--tool-accent, var(--accent, #3B82F6));
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .fmt-arrow-icon,
    [data-theme="light"] .fmt-arrow-icon {
      color: #2563EB;
    }

    .card-dropdown-wrap {
      position: relative;
      display: inline-flex;
      align-items: center;
    }

    .card-dropdown-trigger {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      background: transparent;
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
      padding: 1px 2px;
      color: var(--tool-accent, var(--accent, #60A5FA));
      font-size: 9.5px;
      font-weight: 800;
      cursor: pointer;
      border-radius: 4px;
      transition: color 0.15s;
    }

    .card-dropdown-trigger:focus,
    .card-dropdown-trigger:focus-visible {
      outline: none !important;
      box-shadow: none !important;
      border: none !important;
    }

    .card-dropdown-trigger:hover:not(:disabled) {
      color: #93C5FD;
    }

    :host-context([data-theme="light"]) .card-dropdown-trigger,
    [data-theme="light"] .card-dropdown-trigger {
      color: #2563EB;
    }

    :host-context([data-theme="light"]) .card-dropdown-trigger:hover:not(:disabled),
    [data-theme="light"] .card-dropdown-trigger:hover:not(:disabled) {
      color: #1D4ED8;
    }

    .card-dropdown-chevron {
      color: inherit;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .card-dropdown-chevron.rotated {
      transform: rotate(180deg);
    }

    .card-dropdown-menu {
      position: absolute;
      top: calc(100% + 5px);
      left: 0;
      right: auto;
      bottom: auto;
      min-width: 130px;
      max-height: 200px;
      overflow-y: auto;
      scrollbar-width: thin;
      background: var(--ts-surface-raised, #18181B);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.14));
      border-radius: 8px;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45), 0 2px 8px rgba(0, 0, 0, 0.2);
      z-index: 100;
      padding: 4px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      outline: none !important;
    }

    :host-context([data-theme="light"]) .card-dropdown-menu,
    [data-theme="light"] .card-dropdown-menu {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.1);
    }

    .card-dropdown-opt {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 5px 8px;
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
      background: transparent;
      border-radius: 5px;
      font-size: 11px;
      font-weight: 600;
      color: var(--ts-text-secondary, #A1A1AA);
      cursor: pointer;
      transition: background-color 0.15s, color 0.15s;
      text-align: left;
    }

    .card-dropdown-opt:focus,
    .card-dropdown-opt:focus-visible {
      outline: none !important;
      box-shadow: none !important;
      border: none !important;
    }

    .card-dropdown-opt:hover {
      background: var(--ts-surface-hover, rgba(255, 255, 255, 0.08));
      color: #FFFFFF;
    }

    :host-context([data-theme="light"]) .card-dropdown-opt,
    [data-theme="light"] .card-dropdown-opt {
      color: #475569;
    }

    :host-context([data-theme="light"]) .card-dropdown-opt:hover,
    [data-theme="light"] .card-dropdown-opt:hover {
      background: #F1F5F9;
      color: #0F172A;
    }

    .card-dropdown-opt.is-selected {
      background: rgba(59, 130, 246, 0.14);
      color: var(--ts-accent, #60A5FA);
      font-weight: 700;
    }

    :host-context([data-theme="light"]) .card-dropdown-opt.is-selected,
    [data-theme="light"] .card-dropdown-opt.is-selected {
      background: #EFF6FF;
      color: #2563EB;
    }

    .card-dropdown-opt .check-icon {
      color: var(--ts-accent, #3B82F6);
      flex-shrink: 0;
    }

    /* Remove Button on Top Right (26px prominent circular button) */
    .card-remove-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 26px;
      height: 26px;
      min-width: 26px;
      min-height: 26px;
      border-radius: 50% !important;
      background: rgba(24, 24, 27, 0.88);
      border: 1px solid rgba(255, 255, 255, 0.22);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      color: #E2E8F0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0.92;
      transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 20;
      padding: 0;
      box-sizing: border-box;
    }

    .card-remove-btn::after {
      content: '';
      position: absolute;
      inset: -6px;
      border-radius: 50%;
    }

    :host-context([data-theme="light"]) .card-remove-btn,
    [data-theme="light"] .card-remove-btn {
      background: #FFFFFF;
      border-color: #CBD5E1;
      color: #475569;
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.12);
    }

    .card-remove-btn:hover {
      opacity: 1;
      transform: scale(1.08);
      color: #EF4444 !important;
    }

    :host-context([data-theme="light"]) .card-remove-btn:hover,
    [data-theme="light"] .card-remove-btn:hover {
      color: #DC2626 !important;
    }

    .card-quality-tag {
      font-size: 11px;
      color: var(--text-secondary, #94A3B8);
      font-weight: 500;
    }

    :host-context([data-theme="light"]) .card-quality-tag,
    [data-theme="light"] .card-quality-tag {
      color: #64748B;
    }

    .card-warning-pill {
      font-size: 10px;
      font-weight: 600;
      color: #F59E0B;
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.25);
      border-radius: 4px;
      padding: 1px 5px;
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }

    /* Converting Progress Overlay */
    .converting-overlay {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.82);
      backdrop-filter: blur(4px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      z-index: 3;
      color: #FFFFFF;
    }

    .converting-pct {
      font-size: 15px;
      font-weight: 700;
      color: var(--accent, #60A5FA);
    }

    .converting-stage {
      font-size: 11px;
      color: #CBD5E1;
      max-width: 80%;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }


    /* ─── Bottom Card Body (Target height ~56px, 2 rows) ─── */
    .card-body {
      padding: 10px 12px;
      min-height: 56px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 4px;
      background: transparent;
    }

    .filename-row {
      display: flex;
      align-items: center;
      min-height: 24px;
      width: 100%;
    }

    .filename-display-wrap {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      gap: 4px;
      min-width: 0;
    }

    .card-filename {
      font-size: 12px;
      font-weight: 600;
      color: var(--text, #FFFFFF);
      white-space: nowrap;
      flex: 1;
      min-width: 0;
      display: inline-flex;
      align-items: baseline;
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .card-filename,
    [data-theme="light"] .card-filename {
      color: #0F172A;
    }

    .name-base {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
      flex-shrink: 1;
    }

    .name-ext {
      flex-shrink: 0;
      white-space: nowrap;
      font-size: 11.5px;
      font-weight: 600;
      color: var(--tool-accent, #60A5FA);
    }

    :host-context([data-theme="light"]) .name-ext,
    [data-theme="light"] .name-ext {
      color: var(--tool-accent, #2563EB);
    }

    .filename-edit-btn {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 5px;
      background: transparent;
      border: none;
      color: var(--text-muted, #94A3B8);
      cursor: pointer;
      padding: 0;
      opacity: 0.6;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="light"]) .filename-edit-btn,
    [data-theme="light"] .filename-edit-btn {
      color: #64748B;
    }

    .studio-image-card:hover .filename-edit-btn {
      opacity: 1;
    }

    .filename-edit-btn:hover {
      opacity: 1;
      background: rgba(37, 99, 235, 0.12);
      color: var(--tool-accent, #2563EB);
    }

    :host-context([data-theme="dark"]) .filename-edit-btn:hover,
    [data-theme="dark"] .filename-edit-btn:hover {
      background: rgba(96, 165, 250, 0.16);
      color: #93C5FD;
    }

    /* Inline Editing State */
    .filename-inline-edit {
      display: flex;
      align-items: center;
      gap: 4px;
      width: 100%;
    }

    .inline-edit-input-pill {
      flex: 1;
      min-width: 0;
      height: 26px;
      display: flex;
      align-items: center;
      background: var(--ts-surface-inset, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--tool-accent, #2563EB);
      border-radius: 6px;
      padding: 0 6px;
      gap: 3px;
      box-sizing: border-box;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.18);
    }

    :host-context([data-theme="light"]) .inline-edit-input-pill,
    [data-theme="light"] .inline-edit-input-pill {
      background: #FFFFFF;
      border-color: #2563EB;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
    }

    .inline-name-field {
      flex: 1;
      min-width: 0;
      border: none;
      outline: none;
      background: transparent;
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text, #FFFFFF);
      padding: 0;
    }

    :host-context([data-theme="light"]) .inline-name-field,
    [data-theme="light"] .inline-name-field {
      color: #0F172A;
    }

    .inline-fixed-ext {
      flex-shrink: 0;
      font-size: 11px;
      font-weight: 700;
      color: var(--tool-accent, #60A5FA);
      user-select: none;
      background: rgba(37, 99, 235, 0.12);
      padding: 1px 4px;
      border-radius: 4px;
    }

    :host-context([data-theme="light"]) .inline-fixed-ext,
    [data-theme="light"] .inline-fixed-ext {
      color: #2563EB;
      background: #EFF6FF;
    }

    .inline-edit-actions {
      display: flex;
      align-items: center;
      gap: 2px;
      flex-shrink: 0;
    }

    .inline-action-btn {
      width: 22px;
      height: 22px;
      border-radius: 5px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: none;
      cursor: pointer;
      padding: 0;
      transition: all 0.12s ease;
    }

    .inline-action-btn.btn-save {
      background: #10B981;
      color: #FFFFFF;
    }

    .inline-action-btn.btn-save:hover {
      background: #059669;
    }

    .inline-action-btn.btn-cancel {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-muted, #94A3B8);
    }

    :host-context([data-theme="light"]) .inline-action-btn.btn-cancel,
    [data-theme="light"] .inline-action-btn.btn-cancel {
      background: #E2E8F0;
      color: #64748B;
    }

    .inline-action-btn.btn-cancel:hover {
      background: rgba(239, 68, 68, 0.15);
      color: #EF4444;
    }

    .card-meta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      font-size: 11.5px;
      color: var(--text-muted, #94A3B8);
    }

    .meta-left {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }

    .card-dim-badge {
      font-size: 10px;
      font-weight: 500;
      color: var(--text-muted, #94A3B8);
      background: var(--ts-surface-inset, rgba(255, 255, 255, 0.06));
      padding: 0 4px;
      border-radius: 3px;
    }

    :host-context([data-theme="light"]) .card-dim-badge,
    [data-theme="light"] .card-dim-badge {
      background: #F1F5F9;
      color: #64748B;
    }

    :host-context([data-theme="light"]) .card-meta-row,
    [data-theme="light"] .card-meta-row {
      color: #64748B;
    }

    .result-size-text {
      color: var(--text, #FFFFFF);
    }

    :host-context([data-theme="light"]) .result-size-text,
    [data-theme="light"] .result-size-text {
      color: #0F172A;
    }

    .savings-badge {
      display: inline-flex;
      align-items: center;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 10.5px;
      font-weight: 700;
    }

    .savings-badge.is-reduced {
      background: rgba(16, 185, 129, 0.15);
      color: #34D399;
    }

    :host-context([data-theme="light"]) .savings-badge.is-reduced,
    [data-theme="light"] .savings-badge.is-reduced {
      background: #ECFDF5;
      color: #059669;
    }

    .savings-badge.is-increased {
      background: rgba(245, 158, 11, 0.15);
      color: #FBBF24;
    }

    .verified-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10B981;
      display: inline-block;
    }

    /* Completed Action Buttons */
    .card-footer-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 2px;
      padding-top: 6px;
      border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .card-footer-actions,
    [data-theme="light"] .card-footer-actions {
      border-top-color: #F1F5F9;
    }

    .card-view-btn,
    .card-compare-btn,
    .card-download-btn {
      flex: 1;
      height: 28px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 600;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .card-view-btn span,
    .card-compare-btn span,
    .card-download-btn span {
      white-space: nowrap;
    }

    .card-view-btn {
      background: var(--ts-surface-inset, rgba(255, 255, 255, 0.06));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      color: var(--text-muted, #CBD5E1);
    }

    :host-context([data-theme="light"]) .card-view-btn,
    [data-theme="light"] .card-view-btn {
      background: #F1F5F9;
      border-color: #E2E8F0;
      color: #475569;
    }

    .card-view-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #FFFFFF;
    }

    :host-context([data-theme="light"]) .card-view-btn:hover,
    [data-theme="light"] .card-view-btn:hover {
      background: #E2E8F0;
      color: #0F172A;
    }

    .card-compare-btn {
      background: var(--ts-surface-inset, rgba(255, 255, 255, 0.06));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      color: var(--text-muted, #CBD5E1);
    }

    :host-context([data-theme="light"]) .card-compare-btn,
    [data-theme="light"] .card-compare-btn {
      background: #F1F5F9;
      border-color: #E2E8F0;
      color: #475569;
    }

    .card-compare-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #FFFFFF;
    }

    :host-context([data-theme="light"]) .card-compare-btn:hover,
    [data-theme="light"] .card-compare-btn:hover {
      background: #E2E8F0;
      color: #0F172A;
    }

    .card-download-btn {
      background: var(--accent, #3B82F6);
      border: 1px solid var(--accent, #3B82F6);
      color: #FFFFFF;
    }

    :host-context([data-theme="light"]) .card-download-btn,
    [data-theme="light"] .card-download-btn {
      background: #2563EB;
      border-color: #2563EB;
      color: #FFFFFF;
    }

    .card-download-btn:hover {
      background: #2563EB;
      transform: translateY(-1px);
    }

    :host-context([data-theme="light"]) .card-download-btn:hover,
    [data-theme="light"] .card-download-btn:hover {
      background: #1D4ED8;
    }

    /* Error Box */
    .card-error-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      margin-top: 2px;
      padding-top: 6px;
      border-top: 1px solid rgba(239, 68, 68, 0.2);
    }

    .card-error-label {
      font-size: 11px;
      font-weight: 700;
      color: #EF4444;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .card-retry-btn {
      height: 24px;
      padding: 0 8px;
      border-radius: 5px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #F87171;
      font-size: 11px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .card-retry-btn,
    [data-theme="light"] .card-retry-btn {
      background: #FEE2E2;
      border-color: #FECACA;
      color: #DC2626;
    }

    /* Spinner */
    .spinner-circle-sm {
      width: 18px;
      height: 18px;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      display: inline-block;
      animation: spin 0.75s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 639px) {
      .studio-image-card {
        min-width: 0;
        width: 100%;
        border-radius: 14px;
        height: auto;
      }
      .card-thumb-frame {
        aspect-ratio: 4 / 3;
        height: auto;
        border-top-left-radius: 14px;
        border-top-right-radius: 14px;
      }
      .card-preview-img {
        padding: 0;
      }
      .card-body {
        padding: 8px 10px;
        min-height: 52px;
      }
      .format-conversion-badge {
        padding: 1.5px 5px;
        height: 20px;
        font-size: 9px;
      }
      .card-remove-btn {
        top: 6px;
        right: 6px;
        width: 24px;
        height: 24px;
        min-width: 24px;
        min-height: 24px;
        border-radius: 50% !important;
      }
    }
  `]
})
export class ConversionItemComponent {
  readonly job = input.required<ConversionJob>();

  readonly convert = output<string>();
  readonly cancel = output<string>();
  readonly remove = output<string>();
  readonly download = output<string>();
  readonly formatChanged = output<{ jobId: string; format: FormatDescriptor }>();
  readonly previewRequested = output<ConversionJob>();
  readonly rename = output<{ jobId: string; newBaseName: string }>();
  readonly compareRequested = output<string>();

  readonly Math = Math;

  isLosslessOutput(): boolean {
    const fmt = (this.job().targetFormat?.format || '').toLowerCase();
    return ['png', 'bmp', 'tiff', 'tif', 'gif', 'svg'].includes(fmt);
  }

  formatQualityPct(q: number): number {
    return Math.round(q * 100);
  }

  readonly isRemoving = signal(false);
  readonly cardImageFallback = signal<string | null>(null);
  readonly hasImageError = signal(false);
  readonly isDropdownOpen = signal(false);
  readonly isEditing = signal(false);
  readonly editingName = signal('');

  readonly nameParts = computed(() => {
    const j = this.job();
    const custom = j.options.naming?.customName?.trim();
    const originalFullName = j.file.name;
    const lastDotOrig = originalFullName.lastIndexOf('.');
    const originalBase = lastDotOrig !== -1 ? originalFullName.substring(0, lastDotOrig) : originalFullName;
    const originalExt = lastDotOrig !== -1 ? originalFullName.substring(lastDotOrig) : '';

    if (j.status === 'completed' && j.resultFileName) {
      const resName = j.resultFileName;
      const lastDotRes = resName.lastIndexOf('.');
      const ext = lastDotRes !== -1 ? resName.substring(lastDotRes) : originalExt;
      const base = custom || (lastDotRes !== -1 ? resName.substring(0, lastDotRes) : resName);
      return { base, ext };
    }

    return {
      base: custom || originalBase,
      ext: originalExt
    };
  });

  readonly displayName = computed(() => {
    const p = this.nameParts();
    return `${p.base}${p.ext}`;
  });

  startEditing(event?: Event): void {
    event?.stopPropagation();
    this.editingName.set(this.nameParts().base);
    this.isEditing.set(true);
    setTimeout(() => {
      const el = document.getElementById(`filename-input-${this.job().id}`) as HTMLInputElement;
      if (el) {
        el.focus();
        el.select();
      }
    }, 20);
  }

  commitEdit(): void {
    if (!this.isEditing()) return;
    let trimmed = this.editingName().trim();
    // Safety: strip extension if inadvertently entered
    const currentExt = this.nameParts().ext.toLowerCase();
    if (currentExt && trimmed.toLowerCase().endsWith(currentExt)) {
      trimmed = trimmed.slice(0, -currentExt.length).trim();
    }
    this.isEditing.set(false);
    if (trimmed && trimmed !== this.nameParts().base) {
      this.rename.emit({ jobId: this.job().id, newBaseName: trimmed });
    }
  }

  cancelEdit(): void {
    this.isEditing.set(false);
  }

  onNameInput(event: Event): void {
    this.editingName.set((event.target as HTMLInputElement).value);
  }

  onInputBlur(): void {
    // Do NOT commit on blur / remove focus. Only commit on Enter or checkmark click.
    this.cancelEdit();
  }

  readonly deduplicatedOutputs = computed(() => {
    const raw = this.job().availableOutputs;
    const seen = new Set<string>();
    const result: FormatDescriptor[] = [];
    for (const out of raw) {
      const canonical = out.format === 'jpeg' ? 'jpg' : (out.format === 'tif' ? 'tiff' : (out.format === 'pnm' ? 'ppm' : out.format));
      if (seen.has(canonical)) continue;
      seen.add(canonical);
      let label = canonical.toUpperCase();
      result.push({
        ...out,
        format: canonical,
        label
      });
    }
    return result;
  });

  isFormatSelected(fmt: string): boolean {
    const current = (this.job().targetFormat.format || '').toLowerCase();
    const targetCanonical = current === 'jpeg' ? 'jpg' : (current === 'tif' ? 'tiff' : (current === 'pnm' ? 'ppm' : current));
    return targetCanonical === fmt.toLowerCase();
  }

  readonly isPdfTarget = computed(() => {
    const j = this.job();
    if (j.status === 'completed' && (j.targetFormat?.format === 'pdf' || j.resultFileName?.toLowerCase().endsWith('.pdf'))) {
      return true;
    }
    return j.detectedFormat.format === 'pdf';
  });

  readonly cardPreviewUrl = computed(() => {
    if (this.cardImageFallback()) return this.cardImageFallback();
    const j = this.job();
    const targetFmt = (j.targetFormat?.format || '').toLowerCase();
    const nativeRenderable = ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'bmp', 'svg', 'ico'];

    // 1. If completed and we have an explicit raster preview URL
    if (j.status === 'completed' && j.resultPreviewUrl) {
      return j.resultPreviewUrl;
    }
    // 2. If completed and the output format is natively renderable
    if (j.status === 'completed' && j.resultUrl && nativeRenderable.includes(targetFmt)) {
      return j.resultUrl;
    }
    // 3. Fallback to original file preview
    return j.previewUrl || null;
  });

  onCardImageError(): void {
    const j = this.job();
    // Graceful fallback to original image preview if converted result is not renderable by browser
    if (j.previewUrl && this.cardPreviewUrl() !== j.previewUrl) {
      this.cardImageFallback.set(j.previewUrl);
    } else {
      this.hasImageError.set(true);
    }
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.isDropdownOpen.update(v => !v);
  }

  selectFormat(formatStr: string, event: Event): void {
    event.stopPropagation();
    this.isDropdownOpen.set(false);
    this.onFormatSelect(formatStr);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.isDropdownOpen()) {
      this.isDropdownOpen.set(false);
    }
  }

  readonly sizeReductionPct = computed(() => {
    const j = this.job();
    if (j.status !== 'completed' || !j.resultSize || !j.file.size) return null;
    const diff = j.file.size - j.resultSize;
    return Math.round((diff / j.file.size) * 100);
  });

  onFormatSelect(formatStr: string): void {
    const found = this.job().availableOutputs.find(o => o.format === formatStr);
    if (found) {
      this.formatChanged.emit({ jobId: this.job().id, format: found });
    }
  }

  onRemoveClick(): void {
    if (this.isRemoving() || this.job().status === 'converting') return;
    this.isRemoving.set(true);
    setTimeout(() => {
      this.remove.emit(this.job().id);
    }, 480);
  }

  onPreviewClick(): void {
    if (this.canPreviewResult()) {
      this.previewRequested.emit(this.job());
    }
  }

  canPreviewResult(): boolean {
    const j = this.job();
    const cat = j.detectedFormat.category;
    return cat === 'image' || cat === 'graphics' || cat === 'modern-image' || j.targetFormat.format === 'pdf' || j.detectedFormat.format === 'pdf';
  }

  getCategoryIcon(cat: string): string {
    switch (cat) {
      case 'image':
      case 'modern-image':
        return 'image';
      case 'graphics':
        return 'frame';
      case 'subtitle':
        return 'file-text';
      case 'contact':
        return 'user';
      case 'document':
        return 'file';
      case 'audio':
        return 'volume-2';
      case 'video':
        return 'play';
      default:
        return 'image';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}

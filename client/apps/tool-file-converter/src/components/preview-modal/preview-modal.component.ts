// apps/tool-file-converter/src/components/preview-modal/preview-modal.component.ts
import { Component, ChangeDetectionStrategy, input, output, signal, computed, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';
import { ConversionJob } from '../../models/converter.models';

@Component({
  selector: 'app-preview-modal',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="preview-backdrop"
      [class.is-closing]="isClosing()"
      (click)="requestClose()"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="'Preview ' + displayFileName()"
    >
      <div
        class="preview-dialog"
        [class.is-closing]="isClosing()"
        (click)="$event.stopPropagation()"
        (touchstart)="onTouchStart($event)"
        (touchend)="onTouchEnd($event)"
      >
        <!-- Header: Filename with blue highlighted extension & inline rename, Actions -->
        <div class="dialog-header">
          <div class="dialog-title-cluster">
            @if (!isEditingName()) {
              <div class="preview-title-row">
                <h3 class="dialog-title" [title]="displayFileName()" (click)="startEditingName($event)">
                  <span class="filename-base">{{ fileNameParts().base }}</span><span class="filename-ext font-mono">{{ fileNameParts().ext }}</span>
                </h3>
                <button
                  type="button"
                  class="preview-edit-name-btn"
                  (click)="startEditingName($event)"
                  title="Rename file (extension remains {{ fileNameParts().ext }})"
                  aria-label="Rename file"
                >
                  <ts-icon name="pencil" [size]="13" />
                </button>
              </div>
            } @else {
              <div class="preview-inline-rename-box font-mono" (click)="$event.stopPropagation()">
                <div class="preview-rename-pill">
                  <input
                    id="preview-filename-input"
                    type="text"
                    class="preview-name-input"
                    [value]="editingNameValue()"
                    (input)="onPreviewNameInput($event)"
                    (keydown.enter)="savePreviewName()"
                    (keydown.escape)="cancelPreviewName()"
                    (blur)="onPreviewNameBlur()"
                    placeholder="File name"
                    aria-label="File name (without extension)"
                  />
                  <span class="preview-fixed-ext" title="Extension cannot be modified">{{ fileNameParts().ext }}</span>
                </div>
                <div class="preview-rename-actions">
                  <button
                    type="button"
                    class="preview-action-btn btn-save"
                    (mousedown)="savePreviewName()"
                    title="Save (Enter)"
                    aria-label="Save"
                  >
                    <ts-icon name="check" [size]="12" />
                  </button>
                  <button
                    type="button"
                    class="preview-action-btn btn-cancel"
                    (mousedown)="cancelPreviewName()"
                    title="Cancel (Esc)"
                    aria-label="Cancel"
                  >
                    <ts-icon name="x" [size]="12" />
                  </button>
                </div>
              </div>
            }
          </div>

          <!-- View Mode Toggle (Single vs Compare Before/After) -->
          @if (canCompare() && !isEditingName()) {
            <div class="view-mode-toggle" role="tablist" aria-label="Preview display mode">
              <button
                type="button"
                class="view-mode-btn"
                [class.is-active]="viewMode() === 'single'"
                (click)="viewMode.set('single')"
                role="tab"
                [attr.aria-selected]="viewMode() === 'single'"
              >
                Single
              </button>
              <button
                type="button"
                class="view-mode-btn"
                [class.is-active]="viewMode() === 'compare'"
                (click)="viewMode.set('compare')"
                role="tab"
                [attr.aria-selected]="viewMode() === 'compare'"
              >
                <ts-icon name="arrow-left-right" [size]="12" />
                <span>Compare</span>
              </button>
            </div>
          }

          <div class="header-actions">
            @if (job().status === 'completed') {
              <button
                type="button"
                class="download-pill-btn"
                (click)="download.emit(job().id)"
                aria-label="Download converted file"
              >
                <ts-icon name="download" [size]="14" />
                <span>Download</span>
              </button>
            }
            <button
              type="button"
              class="close-btn"
              (click)="requestClose()"
              title="Close preview (Esc)"
              aria-label="Close"
            >
              <ts-icon name="x" [size]="16" />
            </button>
          </div>
        </div>

        <!-- Body: Viewport with zoom or comparison slider -->
        <div class="dialog-body">
          @if (isPdf()) {
            <div class="pdf-preview-box">
              <div class="pdf-icon-circle">
                <ts-icon name="file-text" [size]="38" />
              </div>
              <h4 class="pdf-preview-title">
                <span class="filename-base">{{ fileNameParts().base }}</span><span class="filename-ext font-mono">{{ fileNameParts().ext }}</span>
              </h4>
              <p class="pdf-preview-sub">Standard PDF document formatted and ready for print or sharing.</p>
              @if (previewPdfUrl(); as pdfUrl) {
                <a [href]="pdfUrl" target="_blank" rel="noopener noreferrer" class="pdf-view-external-btn">
                  <ts-icon name="external-link" [size]="14" />
                  <span>Open PDF in new tab</span>
                </a>
              }
            </div>
          } @else if (isImage()) {
            @if (viewMode() === 'compare' && canCompare()) {
              <!-- Before / After Interactive Draggable Split View -->
              <div class="comparison-stage">
                <div class="comparison-container" [class.has-checkerboard]="hasTransparency()">
                  <!-- Original Image (Bottom Layer) -->
                  <img
                    [src]="originalImageSrc()"
                    [alt]="job().file.name"
                    class="comparison-img original-layer"
                  />
                  <div class="comparison-tag tag-left font-mono">
                    <span>Original</span>
                    <span class="tag-sub">{{ formatBytes(job().file.size) }}</span>
                  </div>

                  <!-- Converted Image (Top Layer clipped by slider percentage) -->
                  <div
                    class="comparison-clip"
                    [style.clip-path]="'inset(0 0 0 ' + sliderPosition() + '%)'"
                  >
                    <img
                      [src]="convertedImageSrc()"
                      [alt]="'Converted ' + displayFormat()"
                      class="comparison-img converted-layer"
                    />
                    <div class="comparison-tag tag-right font-mono">
                      <span>{{ displayFormat() }}</span>
                      <span class="tag-sub">{{ formatBytes(job().resultSize || 0) }}</span>
                    </div>
                  </div>

                  <!-- Divider Line & Center Handle Grip -->
                  <div class="comparison-divider" [style.left]="sliderPosition() + '%'">
                    <div class="divider-line"></div>
                    <div class="divider-handle">
                      <ts-icon name="arrow-left-right" [size]="11" />
                    </div>
                  </div>

                  <!-- Native Range Input Overlay for Dragging with Mouse & Touch -->
                  <input
                    type="range"
                    min="0"
                    max="100"
                    [value]="sliderPosition()"
                    (input)="onSliderInput($event)"
                    class="comparison-range-slider"
                    aria-label="Drag before and after comparison slider"
                  />
                </div>
              </div>
            } @else {
              <!-- Single Image View with Pan / Zoom -->
              <div class="preview-stage">
                <!-- Canvas Box (Dark/Light Studio Backdrop) -->
                <div
                  class="checkerboard-box"
                  (click)="toggleZoom()"
                  [title]="zoomLevel() > 1 ? 'Click to reset zoom' : 'Click to zoom in'"
                >
                  <!-- Image Frame: checkerboard pattern is confined strictly to the image frame for alpha formats -->
                  <div class="preview-img-frame" [class.has-checkerboard]="hasTransparency()">
                    <img
                      [src]="previewImageSrc()"
                      [alt]="job().file.name"
                      class="preview-img"
                      [style.transform]="'scale(' + zoomLevel() + ')'"
                      (error)="onImageError()"
                    />
                  </div>
                </div>

                <!-- Compact Zoom Controls Floating Bar -->
                <div class="zoom-toolbar" (click)="$event.stopPropagation()">
                  <button
                    type="button"
                    class="zoom-btn"
                    (click)="zoomOut()"
                    [disabled]="zoomLevel() <= 1"
                    title="Zoom Out"
                    aria-label="Zoom Out"
                  >
                    <ts-icon name="minus" [size]="13" />
                  </button>
                  <span class="zoom-level-label font-mono">{{ Math.round(zoomLevel() * 100) }}%</span>
                  <button
                    type="button"
                    class="zoom-btn"
                    (click)="zoomIn()"
                    [disabled]="zoomLevel() >= 3"
                    title="Zoom In"
                    aria-label="Zoom In"
                  >
                    <ts-icon name="plus" [size]="13" />
                  </button>
                  @if (zoomLevel() !== 1) {
                    <button
                      type="button"
                      class="zoom-reset-btn"
                      (click)="resetZoom()"
                      title="Reset to 100%"
                    >
                      Reset
                    </button>
                  }
                </div>
              </div>
            }
          } @else if (textContent()) {
            <div class="text-preview-container font-mono">
              <pre>{{ textContent() }}</pre>
            </div>
          } @else {
            <div class="empty-preview">
              <ts-icon name="file" [size]="28" />
              <span>Preview not available for this format.</span>
            </div>
          }
        </div>

        <!-- Footer: Size on Left, Centered Converted Dimensions, Hint on Right -->
        <div class="dialog-footer">
          <div class="footer-left font-mono">
            <span class="meta-label">Size:</span>
            <strong class="meta-value">{{ formatBytes(currentSize()) }}</strong>
            @if (currentDimensions(); as dims) {
              <span class="footer-dim-badge footer-dim-mobile">{{ dims.width }} × {{ dims.height }} px</span>
            }
          </div>

          @if (currentDimensions(); as dims) {
            <div class="footer-center font-mono footer-dim-desktop">
              <span class="footer-dim-badge">{{ dims.width }} × {{ dims.height }} px</span>
            </div>
          }

          <!-- Mobile footer zoom controls -->
          @if (previewImageSrc()) {
            <div class="footer-mobile-zoom font-mono" role="toolbar" aria-label="Zoom controls">
              <button
                type="button"
                class="zoom-btn"
                (click)="zoomOut()"
                [disabled]="zoomLevel() <= 0.5"
                title="Zoom Out"
                aria-label="Zoom Out"
              >
                <ts-icon name="minus" [size]="13" />
              </button>
              <span class="zoom-level-label">{{ Math.round(zoomLevel() * 100) }}%</span>
              <button
                type="button"
                class="zoom-btn"
                (click)="zoomIn()"
                [disabled]="zoomLevel() >= 3"
                title="Zoom In"
                aria-label="Zoom In"
              >
                <ts-icon name="plus" [size]="13" />
              </button>
            </div>
          }

          <div class="footer-right">
            <span class="footer-hint">Press Esc to close</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .preview-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      z-index: 1200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: backdropFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .preview-backdrop.is-closing {
      animation: backdropFadeOut 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
    }

    @keyframes backdropFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes backdropFadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    .preview-dialog {
      width: 100%;
      max-width: 520px;
      max-height: 85vh;
      background: var(--ts-surface-raised, #18181B);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
      border-radius: 18px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.06);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: dialogPopIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .preview-dialog.is-closing {
      animation: dialogPopOut 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
    }

    @keyframes dialogPopIn {
      from {
        opacity: 0;
        transform: translateY(18px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes dialogPopOut {
      from {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      to {
        opacity: 0;
        transform: translateY(18px) scale(0.95);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .preview-backdrop,
      .preview-backdrop.is-closing,
      .preview-dialog,
      .preview-dialog.is-closing {
        animation-duration: 0.01ms !important;
      }
    }

    :host-context([data-theme="light"]) .preview-dialog,
    [data-theme="light"] .preview-dialog {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 20px 50px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(15, 23, 42, 0.05);
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      gap: 12px;
    }

    :host-context([data-theme="light"]) .dialog-header,
    [data-theme="light"] .dialog-header {
      border-bottom-color: #F1F5F9;
    }

    .dialog-title-cluster {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1;
    }

    /* View Mode Toggle (Single vs Compare) */
    .view-mode-toggle {
      display: inline-flex;
      align-items: center;
      background: var(--ts-surface-inset, rgba(255, 255, 255, 0.06));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
      border-radius: 999px;
      padding: 2px;
      gap: 2px;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .view-mode-toggle,
    [data-theme="light"] .view-mode-toggle {
      background: #F1F5F9;
      border-color: #E2E8F0;
    }

    .view-mode-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 24px;
      padding: 0 9px;
      border-radius: 999px;
      border: none;
      background: transparent;
      color: var(--text-muted, #94A3B8);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .view-mode-btn.is-active {
      background: var(--ts-surface-raised, #27272A);
      color: var(--ts-text-primary, #FFFFFF);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    :host-context([data-theme="light"]) .view-mode-btn.is-active,
    [data-theme="light"] .view-mode-btn.is-active {
      background: #FFFFFF;
      color: #0F172A;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12);
    }

    /* Comparison Stage & Draggable Split View */
    .comparison-stage {
      width: 100%;
      height: 380px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      background: #000000;
      user-select: none;
      -webkit-user-select: none;
    }

    :host-context([data-theme="light"]) .comparison-stage,
    [data-theme="light"] .comparison-stage {
      background: #F8FAFC;
    }

    .comparison-container {
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .comparison-container.has-checkerboard {
      background-image:
        linear-gradient(45deg, #222 25%, transparent 25%),
        linear-gradient(-45deg, #222 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #222 75%),
        linear-gradient(-45deg, transparent 75%, #222 75%);
      background-size: 16px 16px;
      background-position: 0 0, 0 8px, 8px -8px, -8px 0;
    }

    :host-context([data-theme="light"]) .comparison-container.has-checkerboard,
    [data-theme="light"] .comparison-container.has-checkerboard {
      background-image:
        linear-gradient(45deg, #E2E8F0 25%, transparent 25%),
        linear-gradient(-45deg, #E2E8F0 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #E2E8F0 75%),
        linear-gradient(-45deg, transparent 75%, #E2E8F0 75%);
    }

    .comparison-img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      pointer-events: none;
      display: block;
      margin: auto;
    }

    .comparison-clip {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .comparison-divider {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      transform: translateX(-50%);
      pointer-events: none;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .divider-line {
      position: absolute;
      inset: 0;
      background: #FFFFFF;
      box-shadow: 0 0 6px rgba(0, 0, 0, 0.6);
    }

    .divider-handle {
      position: relative;
      width: 26px;
      height: 26px;
      border-radius: 999px;
      background: #FFFFFF;
      color: #0F172A;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(0, 0, 0, 0.15);
    }

    .comparison-range-slider {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: ew-resize;
      z-index: 20;
      margin: 0;
      padding: 0;
    }

    .comparison-tag {
      position: absolute;
      bottom: 12px;
      display: inline-flex;
      flex-direction: column;
      padding: 4px 8px;
      border-radius: 6px;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      color: #FFFFFF;
      font-size: 10px;
      font-weight: 700;
      pointer-events: none;
      z-index: 5;
    }

    .tag-left {
      left: 12px;
    }

    .tag-right {
      right: 12px;
    }

    .tag-sub {
      font-size: 9px;
      opacity: 0.8;
      font-weight: 500;
    }


    .preview-title-row {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      max-width: 100%;
      flex-shrink: 1;
    }

    .dialog-title {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text, #F8FAFC);
      margin: 0;
      display: inline-flex;
      align-items: baseline;
      min-width: 0;
      max-width: 100%;
      cursor: pointer;
      white-space: nowrap;
    }

    :host-context([data-theme="light"]) .dialog-title,
    [data-theme="light"] .dialog-title {
      color: #0F172A;
    }

    .filename-base {
      color: var(--ts-text-primary, #F8FAFC);
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
      flex-shrink: 1;
    }

    :host-context([data-theme="light"]) .filename-base,
    [data-theme="light"] .filename-base {
      color: #0F172A;
    }

    .filename-ext {
      color: var(--ts-accent, #3B82F6);
      font-weight: 700;
      font-size: 13px;
      flex-shrink: 0;
      white-space: nowrap;
      margin-left: 1px;
    }

    .preview-edit-name-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 6px;
      background: transparent;
      border: none;
      color: var(--text-muted, #94A3B8);
      cursor: pointer;
      padding: 0;
      opacity: 0.7;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .preview-edit-name-btn,
    [data-theme="light"] .preview-edit-name-btn {
      color: #64748B;
    }

    .preview-edit-name-btn:hover {
      opacity: 1;
      background: rgba(37, 99, 235, 0.12);
      color: var(--tool-accent, #2563EB);
    }

    /* Preview Inline Rename Box */
    .preview-inline-rename-box {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      max-width: 100%;
      flex: 1;
    }

    .preview-rename-pill {
      display: flex;
      align-items: center;
      height: 28px;
      background: var(--ts-surface-inset, rgba(255, 255, 255, 0.06));
      border: 1px solid var(--tool-accent, #2563EB);
      border-radius: 7px;
      padding: 0 8px;
      gap: 4px;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.18);
      min-width: 0;
      flex: 1;
    }

    :host-context([data-theme="light"]) .preview-rename-pill,
    [data-theme="light"] .preview-rename-pill {
      background: #FFFFFF;
      border-color: #2563EB;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.14);
    }

    .preview-name-input {
      border: none;
      outline: none;
      background: transparent;
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text, #F8FAFC);
      padding: 0;
      min-width: 60px;
      flex: 1;
      width: 100%;
    }

    :host-context([data-theme="light"]) .preview-name-input,
    [data-theme="light"] .preview-name-input {
      color: #0F172A;
    }

    .preview-fixed-ext {
      font-size: 11.5px;
      font-weight: 700;
      color: var(--tool-accent, #60A5FA);
      user-select: none;
      background: rgba(37, 99, 235, 0.12);
      padding: 1px 5px;
      border-radius: 4px;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .preview-fixed-ext,
    [data-theme="light"] .preview-fixed-ext {
      color: #2563EB;
      background: #EFF6FF;
    }

    .preview-rename-actions {
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }

    .preview-action-btn {
      width: 24px;
      height: 24px;
      border-radius: 5px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: none;
      cursor: pointer;
      padding: 0;
      transition: all 0.12s ease;
    }

    .preview-action-btn.btn-save {
      background: #10B981;
      color: #FFFFFF;
    }

    .preview-action-btn.btn-save:hover {
      background: #059669;
    }

    .preview-action-btn.btn-cancel {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-muted, #94A3B8);
    }

    :host-context([data-theme="light"]) .preview-action-btn.btn-cancel,
    [data-theme="light"] .preview-action-btn.btn-cancel {
      background: #E2E8F0;
      color: #64748B;
    }

    .preview-action-btn.btn-cancel:hover {
      background: rgba(239, 68, 68, 0.15);
      color: #EF4444;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .download-pill-btn {
      height: 30px;
      padding: 0 12px;
      border-radius: 7px;
      background: #f6f9fbff;
      border: 1px solid #f6f9fbff;
      color: #000000ff !important;
      font-size: 12px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .download-pill-btn:hover {
      transform: translateY(-1px);
    }

    .close-btn {
      width: 28px;
      height: 28px;
      border-radius: 7px;
      border: none;
      background: transparent;
      color: var(--text-2, #94A3B8);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text, #FFFFFF);
    }

    :host-context([data-theme="light"]) .close-btn:hover,
    [data-theme="light"] .close-btn:hover {
      background: #F1F5F9;
      color: #0F172A;
    }

    .dialog-body {
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      min-height: 260px;
      background: var(--ts-surface-inset, rgba(0, 0, 0, 0.25));
    }

    :host-context([data-theme="light"]) .dialog-body,
    [data-theme="light"] .dialog-body {
      background: #F8FAFC;
    }

    .preview-stage {
      position: relative;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    /* Container box for image viewport */
    .checkerboard-box {
      width: 100%;
      height: 320px;
      max-height: 48vh;
      border-radius: 12px;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      cursor: zoom-in;
      background-color: #121316;
    }

    :host-context([data-theme="light"]) .checkerboard-box,
    [data-theme="light"] .checkerboard-box {
      background-color: #FFFFFF;
      border-color: #E2E8F0;
    }

    /* Inner Image Frame: holds checkerboard ONLY for transparent image formats */
    .preview-img-frame {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      max-width: 100%;
      max-height: 100%;
      border-radius: 8px;
      overflow: hidden;
    }

    .preview-img-frame.has-checkerboard {
      background-image:
        linear-gradient(45deg, rgba(255, 255, 255, 0.08) 25%, transparent 25%),
        linear-gradient(-45deg, rgba(255, 255, 255, 0.08) 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.08) 75%),
        linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.08) 75%);
      background-size: 16px 16px;
      background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
    }

    :host-context([data-theme="light"]) .preview-img-frame.has-checkerboard,
    [data-theme="light"] .preview-img-frame.has-checkerboard {
      background-image:
        linear-gradient(45deg, rgba(15, 23, 42, 0.06) 25%, transparent 25%),
        linear-gradient(-45deg, rgba(15, 23, 42, 0.06) 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, rgba(15, 23, 42, 0.06) 75%),
        linear-gradient(-45deg, transparent 75%, rgba(15, 23, 42, 0.06) 75%);
    }

    .preview-img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      user-select: none;
    }

    /* Floating Zoom Controls Bar */
    .zoom-toolbar {
      margin-top: 10px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 9999px;
      background: var(--ts-surface-raised, rgba(24, 24, 27, 0.85));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    }

    :host-context([data-theme="light"]) .zoom-toolbar,
    [data-theme="light"] .zoom-toolbar {
      background: rgba(255, 255, 255, 0.92);
      border-color: #CBD5E1;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
    }

    .zoom-btn {
      width: 22px;
      height: 22px;
      border-radius: 4px;
      border: none;
      background: transparent;
      color: var(--text, #FFFFFF);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background-color 0.15s;
    }

    :host-context([data-theme="light"]) .zoom-btn,
    [data-theme="light"] .zoom-btn {
      color: #0F172A;
    }

    .zoom-btn:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.12);
    }

    :host-context([data-theme="light"]) .zoom-btn:hover:not(:disabled),
    [data-theme="light"] .zoom-btn:hover:not(:disabled) {
      background: #E2E8F0;
    }

    .zoom-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .zoom-level-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-2, #94A3B8);
      min-width: 36px;
      text-align: center;
    }

    :host-context([data-theme="light"]) .zoom-level-label,
    [data-theme="light"] .zoom-level-label {
      color: #64748B;
    }

    .zoom-reset-btn {
      font-size: 10px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.16));
      background: transparent;
      color: var(--tool-accent, var(--accent, #60A5FA));
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .zoom-reset-btn,
    [data-theme="light"] .zoom-reset-btn {
      color: #2563EB;
      border-color: #CBD5E1;
    }

    /* PDF Document Preview Card */
    .pdf-preview-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 32px 20px;
      gap: 12px;
      width: 100%;
    }

    .pdf-icon-circle {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.25);
      color: #EF4444;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .pdf-preview-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--text, #F8FAFC);
      margin: 0;
      max-width: 90%;
      word-break: break-all;
    }

    :host-context([data-theme="light"]) .pdf-preview-title,
    [data-theme="light"] .pdf-preview-title {
      color: #0F172A;
    }

    .pdf-preview-sub {
      font-size: 12px;
      color: var(--text-2, #94A3B8);
      margin: 0;
      max-width: 320px;
      line-height: 1.4;
    }

    .pdf-view-external-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      background: var(--tool-accent, var(--accent, #3B82F6));
      color: #FFFFFF !important;
      text-decoration: none;
      transition: all 0.15s;
      margin-top: 4px;
    }

    .pdf-view-external-btn:hover {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }

    .text-preview-container {
      width: 100%;
      max-height: 40vh;
      overflow-y: auto;
      background: var(--ts-surface-inset, #0D0E11);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      border-radius: 8px;
      padding: 12px;
      font-size: 11.5px;
      color: #E2E8F0;
      line-height: 1.5;
    }

    :host-context([data-theme="light"]) .text-preview-container,
    [data-theme="light"] .text-preview-container {
      background: #FFFFFF;
      border-color: #E2E8F0;
      color: #1E293B;
    }

    .text-preview-container pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .empty-preview {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 32px;
      color: var(--text-2, #64748B);
      font-size: 12.5px;
    }

    .dialog-footer {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 44px;
      padding: 8px 18px;
      border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      font-size: 11.5px;
      color: var(--text-2, #94A3B8);
    }

    :host-context([data-theme="light"]) .dialog-footer,
    [data-theme="light"] .dialog-footer {
      border-top-color: #E2E8F0;
      color: #64748B;
    }

    .footer-left {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    .footer-left .meta-label {
      color: var(--text-2, #94A3B8);
    }

    :host-context([data-theme="light"]) .footer-left .meta-label,
    [data-theme="light"] .footer-left .meta-label {
      color: #64748B;
    }

    .footer-left strong,
    .footer-left .meta-value {
      color: var(--text, #FFFFFF);
      font-weight: 700;
    }

    :host-context([data-theme="light"]) .footer-left strong,
    :host-context([data-theme="light"]) .footer-left .meta-value,
    [data-theme="light"] .footer-left strong,
    [data-theme="light"] .footer-left .meta-value {
      color: #0F172A;
    }

    .footer-center {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      display: inline-flex;
      align-items: center;
      pointer-events: none;
    }

    .footer-dim-badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text, #FFFFFF);
      background: var(--ts-surface-inset, rgba(255, 255, 255, 0.06));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
      letter-spacing: 0.02em;
    }

    :host-context([data-theme="light"]) .footer-dim-badge,
    [data-theme="light"] .footer-dim-badge {
      background: #F1F5F9;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    .footer-right {
      display: inline-flex;
      align-items: center;
    }

    .footer-hint {
      font-size: 11px;
      opacity: 0.7;
    }

    .footer-dim-mobile {
      display: none;
    }

    .footer-mobile-zoom {
      display: none;
    }

    @media (hover: none) or (pointer: coarse) {
      .footer-hint {
        display: none !important;
      }
    }

    @media (max-width: 639px) {
      .preview-backdrop {
        padding: 0 !important;
        background: var(--ts-surface-raised, #141416) !important;
        align-items: stretch !important;
      }
      .preview-dialog {
        width: 100vw !important;
        max-width: 100vw !important;
        height: 100dvh !important;
        max-height: 100dvh !important;
        border-radius: 0 !important;
        border: none !important;
        box-shadow: none !important;
      }
      .dialog-header {
        padding: max(12px, env(safe-area-inset-top, 12px)) 14px 12px 14px !important;
        border-top-left-radius: 0 !important;
        border-top-right-radius: 0 !important;
      }
      .dialog-close-btn {
        width: 44px !important;
        height: 44px !important;
        min-width: 44px !important;
        min-height: 44px !important;
      }
      .dialog-body {
        flex: 1 1 auto !important;
        min-height: 0 !important;
        padding: 8px 12px !important;
      }
      .preview-stage {
        height: 100% !important;
        flex: 1 1 auto !important;
        justify-content: center !important;
      }
      .checkerboard-box {
        height: 100% !important;
        max-height: none !important;
        flex: 1 1 auto !important;
        border-radius: 10px !important;
      }
      .comparison-stage {
        height: 100% !important;
        flex: 1 1 auto !important;
        border-radius: 10px !important;
      }
      .preview-stage .zoom-toolbar {
        display: none !important;
      }
      .dialog-footer {
        padding: 10px 14px max(12px, env(safe-area-inset-bottom, 12px)) 14px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        flex-wrap: nowrap !important;
        gap: 8px !important;
      }
      .footer-dim-desktop {
        display: none !important;
      }
      .footer-dim-mobile {
        display: inline-flex !important;
        margin-left: 6px !important;
      }
      .footer-mobile-zoom {
        display: inline-flex !important;
        align-items: center !important;
        gap: 4px !important;
        padding: 3px 8px !important;
        border-radius: 9999px !important;
        background: var(--ts-surface-inset, rgba(255, 255, 255, 0.08)) !important;
        border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12)) !important;
      }
      :host-context([data-theme="light"]) .footer-mobile-zoom,
      [data-theme="light"] .footer-mobile-zoom {
        background: #F1F5F9 !important;
        border-color: #CBD5E1 !important;
      }
      .footer-hint {
        display: none !important;
      }
    }
  `]
})
export class PreviewModalComponent implements OnInit, OnDestroy {
  readonly job = input.required<ConversionJob>();
  readonly close = output<void>();
  readonly download = output<string>();
  readonly renameRequested = output<{ jobId: string; newBaseName: string }>();

  readonly isEditingName = signal<boolean>(false);
  readonly editingNameValue = signal<string>('');

  readonly textContent = signal<string>('');
  readonly zoomLevel = signal<number>(1);
  readonly previewImageSrc = signal<string>('');
  readonly previewPdfUrl = signal<string | null>(null);
  readonly isClosing = signal<boolean>(false);
  readonly viewMode = signal<'single' | 'compare'>('single');
  readonly sliderPosition = signal<number>(50);
  readonly Math = Math;

  readonly canCompare = computed(() => {
    const j = this.job();
    return j.status === 'completed' && !!(j.resultPreviewUrl || j.resultUrl) && !!j.previewUrl && this.isImage();
  });

  readonly originalImageSrc = computed(() => this.job().previewUrl || '');
  readonly convertedImageSrc = computed(() => this.job().resultPreviewUrl || this.job().resultUrl || this.previewImageSrc());

  readonly currentSize = computed(() => {
    const j = this.job();
    if (j.status === 'completed' && j.resultSize) {
      return j.resultSize;
    }
    return j.file?.size || 0;
  });

  readonly currentDimensions = computed(() => {
    const j = this.job();
    if (j.status === 'completed' && j.resultDimensions) {
      return j.resultDimensions;
    }
    return j.originalDimensions || null;
  });

  onSliderInput(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    if (!isNaN(val)) {
      this.sliderPosition.set(val);
    }
  }

  private activePreviewUrl: string | null = null;

  async ngOnInit(): Promise<void> {
    const j = this.job();
    const cat = j.detectedFormat.category;

    if (this.isPdf()) {
      if (j.resultBlob) {
        this.activePreviewUrl = URL.createObjectURL(j.resultBlob);
        this.previewPdfUrl.set(this.activePreviewUrl);
      } else if (j.resultUrl) {
        this.previewPdfUrl.set(j.resultUrl);
      }
    } else if (this.isImage()) {
      if (j.resultPreviewUrl) {
        this.previewImageSrc.set(j.resultPreviewUrl);
      } else if (j.resultBlob) {
        this.activePreviewUrl = URL.createObjectURL(j.resultBlob);
        this.previewImageSrc.set(this.activePreviewUrl);
      } else if (j.resultUrl) {
        this.previewImageSrc.set(j.resultUrl);
      } else if (j.previewUrl) {
        this.previewImageSrc.set(j.previewUrl);
      } else if (j.file) {
        this.activePreviewUrl = URL.createObjectURL(j.file);
        this.previewImageSrc.set(this.activePreviewUrl);
      }
    } else if (cat === 'subtitle' || cat === 'contact') {
      const targetBlob = j.resultBlob || j.file;
      try {
        const text = await targetBlob.text();
        this.textContent.set(text);
      } catch (_) {}
    }
  }

  ngOnDestroy(): void {
    if (this.activePreviewUrl) {
      URL.revokeObjectURL(this.activePreviewUrl);
      this.activePreviewUrl = null;
    }
  }

  private touchStartY = 0;

  onTouchStart(event: TouchEvent): void {
    if (event.touches.length > 0) {
      this.touchStartY = event.touches[0].clientY;
    }
  }

  onTouchEnd(event: TouchEvent): void {
    if (event.changedTouches.length > 0) {
      const deltaY = event.changedTouches[0].clientY - this.touchStartY;
      if (deltaY > 80) {
        this.requestClose();
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

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.requestClose();
  }

  displayFileName(): string {
    const j = this.job();
    const custom = j.options.naming?.customName?.trim();
    if (j.status === 'completed' && j.resultFileName) {
      return j.resultFileName;
    }
    if (custom) {
      const orig = j.file.name;
      const lastDot = orig.lastIndexOf('.');
      const ext = lastDot !== -1 ? orig.substring(lastDot) : '';
      return `${custom}${ext}`;
    }
    return j.resultFileName || j.file.name;
  }

  readonly rawBaseName = computed(() => {
    const j = this.job();
    const custom = j.options.naming?.customName?.trim();
    if (custom) return custom;
    const fullName = j.resultFileName || j.file.name;
    const lastDot = fullName.lastIndexOf('.');
    return lastDot !== -1 ? fullName.substring(0, lastDot) : fullName;
  });

  readonly fileNameParts = computed(() => {
    const fullName = this.displayFileName();
    const lastDot = fullName.lastIndexOf('.');
    if (lastDot === -1) {
      return { base: fullName, ext: '' };
    }
    const base = fullName.substring(0, lastDot);
    const ext = fullName.substring(lastDot);
    return { base, ext };
  });

  startEditingName(event?: Event): void {
    event?.stopPropagation();
    this.editingNameValue.set(this.rawBaseName());
    this.isEditingName.set(true);
    setTimeout(() => {
      const el = document.getElementById('preview-filename-input') as HTMLInputElement;
      if (el) {
        el.focus();
        el.select();
      }
    }, 20);
  }

  savePreviewName(): void {
    if (!this.isEditingName()) return;
    let trimmed = this.editingNameValue().trim();
    const ext = this.fileNameParts().ext.toLowerCase();
    if (ext && trimmed.toLowerCase().endsWith(ext)) {
      trimmed = trimmed.slice(0, -ext.length).trim();
    }
    this.isEditingName.set(false);
    if (trimmed && trimmed !== this.rawBaseName()) {
      this.renameRequested.emit({ jobId: this.job().id, newBaseName: trimmed });
    }
  }

  cancelPreviewName(): void {
    this.isEditingName.set(false);
  }

  onPreviewNameInput(event: Event): void {
    this.editingNameValue.set((event.target as HTMLInputElement).value);
  }

  onPreviewNameBlur(): void {
    // Do NOT commit on blur / remove focus. Only commit on Enter or checkmark click.
    this.cancelPreviewName();
  }

  displayFormat(): string {
    const j = this.job();
    if (j.status === 'completed' && j.targetFormat) {
      return j.targetFormat.format.toUpperCase();
    }
    const name = this.displayFileName();
    return name.split('.').pop()?.toUpperCase() || 'FILE';
  }

  readonly hasTransparency = computed(() => {
    const ext = this.displayFormat().toLowerCase();
    const job = this.job();
    const srcFmt = (job?.detectedFormat.format || '').toLowerCase();
    // JPEG and BMP are strictly opaque raster formats - never show checkerboard
    if (['jpg', 'jpeg', 'bmp'].includes(ext)) {
      return false;
    }
    // If the original input was an opaque photo format (JPG, JPEG, BMP), output has no alpha transparency
    if (['jpg', 'jpeg', 'bmp'].includes(srcFmt) && ['gif', 'jpg', 'jpeg', 'bmp'].includes(ext)) {
      return false;
    }
    return ['png', 'webp', 'avif', 'gif', 'ico', 'svg'].includes(ext);
  });

  isPdf(): boolean {
    const name = this.displayFileName().toLowerCase();
    const j = this.job();
    return name.endsWith('.pdf') || j.targetFormat?.format === 'pdf';
  }

  isImage(): boolean {
    if (this.isPdf()) return false;
    const j = this.job();
    const cat = j.detectedFormat.category;
    const tgtFmt = j.targetFormat?.format?.toLowerCase();
    const allImages = ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'bmp', 'svg', 'svgz', 'ico', 'icns', 'tiff', 'tif', 'tga', 'psd', 'psb', 'pcx', 'dds', 'ppm', 'pgm', 'pbm', 'pnm', 'hdr', 'fits', 'fit', 'xbm', 'xpm', 'raw', 'dng', 'cr2', 'cr3', 'nef', 'arw', 'raf', 'orf', 'rw2', 'pef'];
    if (allImages.includes(tgtFmt) || allImages.includes(j.detectedFormat.format?.toLowerCase())) {
      return true;
    }
    const fileName = this.displayFileName().toLowerCase();
    const ext = fileName.split('.').pop() || '';
    if (allImages.includes(ext)) {
      return true;
    }
    return cat === 'image' || cat === 'graphics' || cat === 'modern-image';
  }

  onImageError(): void {
    const j = this.job();
    if (j.previewUrl && this.previewImageSrc() !== j.previewUrl) {
      this.previewImageSrc.set(j.previewUrl);
    }
  }

  zoomIn(): void {
    this.zoomLevel.update(z => Math.min(3, Math.round((z + 0.5) * 10) / 10));
  }

  zoomOut(): void {
    this.zoomLevel.update(z => Math.max(1, Math.round((z - 0.5) * 10) / 10));
  }

  resetZoom(): void {
    this.zoomLevel.set(1);
  }

  toggleZoom(): void {
    this.zoomLevel.update(z => (z === 1 ? 2 : 1));
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }
}

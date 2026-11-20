// apps/tool-image-compressor/src/components/preview-modal/preview-modal.component.ts
import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  HostListener,
  computed,
  signal,
  ElementRef,
  viewChild,
  inject,
  OnInit,
  OnDestroy
} from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';
import { ImageItem } from '../../models/compressor.models';
import { CompressorTelemetryService } from '../../services/compressor-telemetry.service';
import { computeIsPixelMode, computeZoomIn, computeZoomOut } from './preview-scale.util';

export type CompareViewMode = 'split' | 'side-by-side' | 'toggle' | 'diff';

@Component({
  selector: 'app-preview-modal',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (item(); as image) {
      <div
        class="modal-backdrop"
        [class.is-closing]="isClosing()"
        (click)="requestClose()"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="'Preview ' + image.originalName"
      >
        <div
          class="modal-dialog"
          [class.is-closing]="isClosing()"
          (click)="$event.stopPropagation()"
        >

          <!-- 1. MODAL HEADER: 3-COLUMN TOOLBAR (LEFT, CENTER, RIGHT) -->
          <div class="modal-header">
            <div class="header-left">
              @if (image.result) {
                <div class="view-mode-toggle" role="group" aria-label="Comparison View Mode">
                  <button
                    type="button"
                    class="mode-toggle-btn"
                    [class.is-active]="viewMode() === 'split'"
                    (click)="viewMode.set('split')"
                    title="Split Slider Comparison"
                  >
                    <ts-icon name="columns" [size]="13" />
                    <span class="mode-text">Split</span>
                  </button>

                  <button
                    type="button"
                    class="mode-toggle-btn"
                    [class.is-active]="viewMode() === 'side-by-side'"
                    (click)="viewMode.set('side-by-side')"
                    title="Side by Side Comparison"
                  >
                    <ts-icon name="layout-grid" [size]="13" />
                    <span class="mode-text">Side by Side</span>
                  </button>
                </div>
              }
            </div>

            <!-- Centered Zoom & Fit Controls -->
            <div class="header-center">
              <div class="zoom-controls">
                <button
                  type="button"
                  class="zoom-btn"
                  (click)="zoomOut()"
                  [disabled]="isFitMode() || zoomLevel() <= 0.5"
                  title="Zoom Out"
                  aria-label="Zoom out"
                >
                  <ts-icon name="minus" [size]="12" />
                </button>
                <button
                  type="button"
                  class="zoom-opt-btn"
                  [class.is-active]="isFitMode()"
                  (click)="toggleFitMode()"
                  title="Fit image to viewport stage"
                >
                  Fit
                </button>
                <button
                  type="button"
                  class="zoom-opt-btn font-mono"
                  [class.is-active]="!isFitMode() && zoomLevel() === 1"
                  (click)="setZoom100()"
                  title="100% natural pixel size"
                >
                  100%
                </button>
                <button
                  type="button"
                  class="zoom-btn"
                  (click)="zoomIn()"
                  [disabled]="isFitMode() || zoomLevel() >= 8"
                  title="Zoom In"
                  aria-label="Zoom in"
                >
                  <ts-icon name="plus" [size]="12" />
                </button>
              </div>
            </div>

            <!-- Right Close Button -->
            <div class="header-right">
              <button
                type="button"
                class="icon-close-btn"
                (click)="requestClose()"
                aria-label="Close image preview"
              >
                <ts-icon name="x" [size]="18" />
              </button>
            </div>
          </div>

          <!-- SUBHEADER FILE BAR: File name on its own line under controls -->
          <div class="modal-file-bar">
            <div class="file-bar-left">
              <span class="format-pill font-mono">{{ image.originalExtension | uppercase }}</span>
              <span class="file-name-text" [title]="image.originalName">{{ image.originalName }}</span>
            </div>
            @if (totalImages() > 1) {
              <span class="index-indicator font-mono">
                {{ currentIndex() + 1 }} / {{ totalImages() }}
              </span>
            }
          </div>

          <!-- 2. IMAGE COMPARISON DISPLAY STAGE -->
          <div class="stage-container">
            <!-- Prev Button -->
            @if (totalImages() > 1) {
              <button
                type="button"
                class="nav-arrow-btn prev-btn"
                (click)="prev.emit()"
                aria-label="Previous image"
                title="Previous image (Left arrow)"
              >
                <ts-icon name="chevron-left" [size]="20" />
              </button>
            }

            <div
              #viewportRef
              class="image-viewport"
              [class.is-pixel-mode]="isPixelMode()"
              [class.is-panning]="isPanning()"
              (pointerdown)="onViewportPointerDown($event)"
              (pointermove)="onViewportPointerMove($event)"
              (pointerup)="onViewportPointerUp($event)"
              (pointercancel)="onViewportPointerUp($event)"
            >
              @if (image.status === 'corrupted' || !image.capabilities.previewSupported) {
                <div class="preview-error-state">
                  <ts-icon name="alert-triangle" [size]="48" class="error-icon" />
                  <h4>Preview Unavailable</h4>
                  <p>{{ image.error || 'This format cannot be previewed directly in the browser.' }}</p>
                </div>
              } @else if (image.result) {
                <!-- COMPRESSED STATE: RENDER COMPARISON ACCORDING TO VIEW MODE -->

                <!-- MODE A: DRAGGABLE SPLIT SLIDER -->
                @if (viewMode() === 'split') {
                  <div
                    #sliderBoxRef
                    class="split-slider-container"
                    [class.fit-mode]="isFitMode()"
                    [style.transform]="!isFitMode() ? ('translate(' + panX() + 'px, ' + panY() + 'px) scale(' + zoomLevel() + ')') : 'none'"
                    [style.aspect-ratio]="(image.width && image.height) ? (image.width + '/' + image.height) : 'auto'"
                    (pointerdown)="onSliderPointerDown($event)"
                    (pointermove)="onSliderPointerMove($event)"
                    (pointerup)="onSliderPointerUp($event)"
                    (pointercancel)="onSliderPointerUp($event)"
                  >
                    <!-- Background: Original Image -->
                    <img
                      [src]="image.transformedPreviewUrl || image.previewUrl"
                      [alt]="image.originalName + ' (Original)'"
                      class="compare-img original-layer"
                      draggable="false"
                    />

                    <!-- Foreground: Compressed Image overlaid with clipPath for 100% pixel alignment -->
                    <img
                      [src]="image.result.outputUrl"
                      [alt]="image.originalName + ' (Compressed)'"
                      class="compare-img compressed-layer"
                      [style.clipPath]="'inset(0 ' + (100 - splitPosition()) + '% 0 0)'"
                      draggable="false"
                    />

                    <!-- Divider Handle Bar -->
                    <div
                      class="split-divider-line"
                      [style.left.%]="splitPosition()"
                    >
                      <div class="split-handle-grip" title="Drag to compare before & after">
                        <ts-icon name="columns" [size]="14" />
                      </div>
                    </div>
                  </div>
                }

                <!-- MODE B: UNIFIED PREVIEW CARD (SIDE BY SIDE - LINKED PAN & SAME SCALE) -->
                @if (viewMode() === 'side-by-side') {
                  <div
                    class="unified-preview-card"
                    [class.fit-mode]="isFitMode()"
                  >
                    <div class="unified-card-panes">
                      <div class="pane-half">
                        <div
                          class="pane-img-transform-wrap"
                          [style.transform]="!isFitMode() ? ('translate(' + panX() + 'px, ' + panY() + 'px) scale(' + zoomLevel() + ')') : 'none'"
                        >
                          <img
                            [src]="image.transformedPreviewUrl || image.previewUrl"
                            [alt]="image.originalName + ' Original'"
                            class="pane-img"
                            draggable="false"
                          />
                        </div>
                        <div class="pane-footer-bar font-mono">
                          <span>{{ image.width }} × {{ image.height }} px</span>
                          <span class="pane-footer-dot">•</span>
                          <span>{{ formattedOriginalSize() }}</span>
                        </div>
                      </div>
                      <div class="pane-separator" role="separator" aria-orientation="vertical"></div>
                      <div class="pane-half">
                        <div
                          class="pane-img-transform-wrap"
                          [style.transform]="!isFitMode() ? ('translate(' + (syncPan() ? panX() : pane2PanX()) + 'px, ' + (syncPan() ? panY() : pane2PanY()) + 'px) scale(' + zoomLevel() + ')') : 'none'"
                        >
                          <img
                            [src]="image.result.outputUrl"
                            [alt]="image.originalName + ' Output'"
                            class="pane-img"
                            draggable="false"
                          />
                        </div>
                        <div class="pane-footer-bar font-mono">
                          <span>{{ (image.result.outputWidth || image.width) }} × {{ (image.result.outputHeight || image.height) }} px</span>
                          <span class="pane-footer-dot">•</span>
                          <span>{{ formattedCompressedSize() }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                }

                <!-- MODE C: FLIP / TOGGLE -->
                @if (viewMode() === 'toggle') {
                  <div
                    class="toggle-view-container"
                    [class.fit-mode]="isFitMode()"
                    [style.transform]="!isFitMode() ? ('translate(' + panX() + 'px, ' + panY() + 'px) scale(' + zoomLevel() + ')') : 'none'"
                  >
                    <img
                      [src]="showOriginalOnToggle() ? (image.transformedPreviewUrl || image.previewUrl) : image.result.outputUrl"
                      [alt]="image.originalName"
                      class="toggle-img"
                      (click)="toggleFlipImage()"
                      title="Click or press Spacebar to toggle between original & compressed"
                    />
                    <div class="toggle-float-badge">
                      <span>Showing: <strong>{{ showOriginalOnToggle() ? 'Original' : 'Compressed' }}</strong></span>
                      <button
                        type="button"
                        class="toggle-action-pill"
                        (pointerdown)="showOriginalOnToggle.set(true)"
                        (pointerup)="showOriginalOnToggle.set(false)"
                        (pointerleave)="showOriginalOnToggle.set(false)"
                      >
                        Hold for Original (or Space)
                      </button>
                    </div>
                  </div>
                }

                <!-- MODE D: AMPLIFIED DIFFERENCE MAP -->
                @if (viewMode() === 'diff') {
                  <div
                    class="diff-view-container"
                    [class.fit-mode]="isFitMode()"
                    [style.transform]="!isFitMode() ? ('translate(' + panX() + 'px, ' + panY() + 'px) scale(' + zoomLevel() + ')') : 'none'"
                  >
                    @if (image.result.visualQuality?.diffMapUrl; as diffUrl) {
                      <img
                        [src]="diffUrl"
                        [alt]="image.originalName + ' Visual Difference Heatmap'"
                        class="diff-img"
                      />
                      <div class="diff-legend-float">
                        <div class="legend-scale">
                          <span class="legend-color dark-blue"></span>
                          <span class="legend-color cyan"></span>
                          <span class="legend-color amber"></span>
                          <span class="legend-color red"></span>
                        </div>
                        <div class="legend-labels font-mono">
                          <span>0% Identical</span>
                          <span>Amplified Quantization Difference</span>
                          <span>High Loss</span>
                        </div>
                        @if (image.result.visualQuality?.artifactScore !== undefined) {
                          <div class="diff-artifact-badge">
                            Artifact Score: <strong>{{ image.result.visualQuality?.artifactScore }}/100</strong>
                          </div>
                        }
                      </div>
                    } @else {
                      <div class="diff-fallback">
                        <ts-icon name="info" [size]="24" />
                        <p>Visual difference map unavailable for this asset.</p>
                      </div>
                    }
                  </div>
                }

              } @else {
                <!-- UNCOMPRESSED / READY PREVIEW FALLBACK -->
                <div
                  class="uncompressed-preview-wrap"
                  [class.fit-mode]="isFitMode()"
                  [style.transform]="!isFitMode() ? ('translate(' + panX() + 'px, ' + panY() + 'px) scale(' + zoomLevel() + ')') : 'none'"
                >
                  <img
                    [src]="image.transformedPreviewUrl || image.previewUrl"
                    [alt]="image.originalName"
                    class="preview-image"
                  />
                </div>
              }
            </div>

            <!-- Next Button -->
            @if (totalImages() > 1) {
              <button
                type="button"
                class="nav-arrow-btn next-btn"
                (click)="next.emit()"
                aria-label="Next image"
                title="Next image (Right arrow)"
              >
                <ts-icon name="chevron-right" [size]="20" />
              </button>
            }
          </div>

          <!-- 3. MODAL FOOTER & COMPARISON METRICS (ONE ROW) -->
          <div class="modal-footer">
            <div class="metrics-left">
              <div class="metric-cluster font-mono">
                <span class="meta-value font-mono">{{ formattedOriginalSize() }}</span>
                @if (image.result) {
                  <span class="metric-arrow">→</span>
                  <span class="meta-value font-mono compressed-value">{{ formattedCompressedSize() }}</span>

                  @if (image.result.savedPercentage > 0) {
                    <span class="savings-chip chip-success font-mono">
                      -{{ image.result.savedPercentage }}%
                    </span>
                  }
                }
              </div>
            </div>

            <!-- Footer Right Actions -->
            <div class="metrics-right-actions">
              @if (image.result) {
                <button
                  type="button"
                  class="footer-btn download-btn"
                  (click)="downloadRequested.emit(image.id)"
                  title="Save compressed image"
                  aria-label="Save compressed image"
                >
                  <ts-icon name="download" [size]="14" />
                  <span>Save</span>
                </button>
              }
            </div>
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      --modal-padding: 24px;
      --control-spacing: 12px;
    }

    @media (max-width: 640px) {
      :host {
        --modal-padding: 16px;
        --control-spacing: 10px;
      }
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(0, 0, 0, 0.88);
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--modal-padding);
      box-sizing: border-box;
      animation: modalBackdropFadeIn 0.5s ease-out forwards;
    }

    .modal-backdrop.is-closing {
      animation: modalBackdropFadeOut 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      pointer-events: none;
    }

    .modal-dialog {
      display: flex;
      flex-direction: column;
      max-width: 760px;
      width: min(760px, 92vw);
      height: 95%;
      max-height: 95%;
      background: var(--ts-surface-card, #1A1C23);
      border: 1px solid var(--border-default, #2E3342);
      border-radius: var(--ts-radius-card, 16px);
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.7);
      overflow: hidden;
      margin: auto;
      box-sizing: border-box;
      animation: modalDialogEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @media (max-width: 768px) {
      .modal-dialog {
        width: calc(100vw - 32px);
        max-width: calc(100vw - 32px);
        height: 95%;
        max-height: 95%;
        margin: auto;
      }
    }

    .modal-dialog.is-closing {
      animation: modalDialogExit 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    /* Header - 3 Column Layout for Centered Zoom Controls */
    .modal-header {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      padding: var(--control-spacing) 16px;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      flex-shrink: 0;
      gap: 12px;
      box-sizing: border-box;
      width: 100%;
    }

    .header-left {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      min-width: 0;
    }

    .header-center {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .header-right {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      flex-shrink: 0;
    }

    .modal-file-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 14px;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      background: var(--ts-surface-subtle, rgba(255, 255, 255, 0.02));
      flex-shrink: 0;
      gap: 10px;
    }

    .file-bar-left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1;
    }

    .file-name-text {
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #F9FAFB);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .format-pill {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      background: var(--ts-surface-subtle, rgba(255, 255, 255, 0.08));
      color: var(--text-2, #D1D5DB);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      flex-shrink: 0;
    }

    .view-mode-toggle {
      display: inline-flex;
      align-items: center;
      padding: 2px;
      background: var(--ts-surface-base, #111318);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      border-radius: var(--ts-radius-sm, 8px);
      gap: 2px;
      height: 32px;
      box-sizing: border-box;
      flex-shrink: 0;
    }

    .mode-toggle-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      padding: 0 9px;
      height: 26px;
      min-height: 0 !important;
      min-width: 0 !important;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: var(--text-2, #9CA3AF);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) var(--ts-ease);
      box-sizing: border-box;
      line-height: 1;
      flex-shrink: 0;
    }

    .mode-toggle-btn:hover {
      color: var(--text, #F9FAFB);
    }

    .mode-toggle-btn.is-active {
      background: var(--accent, #2563EB);
      color: #FFFFFF;
      box-shadow: 0 1px 4px rgba(37, 99, 235, 0.35);
      height: 26px;
      box-sizing: border-box;
    }

    .zoom-controls {
      display: inline-flex;
      align-items: center;
      background: var(--ts-surface-base, #111318);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      border-radius: var(--ts-radius-sm, 8px);
      padding: 2px;
      gap: 2px;
      height: 32px;
      box-sizing: border-box;
      flex-shrink: 0;
    }

    .zoom-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      min-height: 0 !important;
      min-width: 0 !important;
      border: none;
      background: transparent;
      color: var(--text-2, #9CA3AF);
      cursor: pointer;
      border-radius: 5px;
      padding: 0;
      box-sizing: border-box;
      line-height: 1;
      flex-shrink: 0;
    }

    .zoom-btn:hover:not(:disabled) {
      color: var(--text, #FFFFFF);
      background: var(--ts-surface-card, #c9cbd1);
    }

    .zoom-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .zoom-opt-btn {
      border: none;
      background: transparent;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-2, #9CA3AF);
      padding: 0 8px;
      height: 26px;
      min-height: 0 !important;
      min-width: 0 !important;
      border-radius: 5px;
      cursor: pointer;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      box-sizing: border-box;
      flex-shrink: 0;
    }

    .zoom-opt-btn:hover {
      color: var(--text, #FFFFFF);
    }

    .zoom-opt-btn.is-active {
      background: var(--accent, #2563EB);
      color: #FFFFFF;
      height: 26px;
      box-sizing: border-box;
    }

    .zoom-value-tag {
      font-size: 10px;
      font-weight: 600;
      color: var(--accent, #60A5FA);
      padding: 0 4px;
    }

    .sync-pan-toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 500;
      color: var(--text-2, #9CA3AF);
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 4px;
      padding: 2px 7px;
      cursor: pointer;
      transition: all 0.15s ease;
      margin-left: 4px;
    }

    .sync-pan-toggle-btn:hover {
      color: var(--text, #FFFFFF);
      border-color: rgba(255, 255, 255, 0.25);
    }

    .sync-pan-toggle-btn.is-active {
      background: rgba(37, 99, 235, 0.25);
      border-color: var(--accent, #2563EB);
      color: #93C5FD;
    }

    :host-context([data-theme="light"]) .sync-pan-toggle-btn,
    [data-theme="light"] .sync-pan-toggle-btn {
      border-color: rgba(15, 23, 42, 0.15);
      color: #64748B;
    }

    :host-context([data-theme="light"]) .sync-pan-toggle-btn.is-active,
    [data-theme="light"] .sync-pan-toggle-btn.is-active {
      background: rgba(37, 99, 235, 0.1);
      border-color: var(--accent, #2563EB);
      color: var(--accent, #2563EB);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .index-indicator {
      font-size: 12px;
      color: var(--text-3, #9CA3AF);
    }

    .icon-close-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      min-height: 0 !important;
      min-width: 0 !important;
      border-radius: 8px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-2, #9CA3AF);
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) var(--ts-ease);
      box-sizing: border-box;
      flex-shrink: 0;
    }

    .icon-close-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text, #FFFFFF);
    }

    /* Stage */
    .stage-container {
      position: relative;
      flex: 1;
      min-height: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #090B10;
      overflow: hidden;
      user-select: none;
      padding: 16px;
      box-sizing: border-box;
    }

    .nav-arrow-btn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      z-index: 20;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      backdrop-filter: blur(4px);
      transition: all var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .nav-arrow-btn:hover {
      background: var(--accent, #2563EB);
      border-color: var(--accent, #2563EB);
      transform: translateY(-50%) scale(1.05);
    }

    .prev-btn { left: 16px; }
    .next-btn { right: 16px; }

    .image-viewport {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      touch-action: none;
      padding: 8px;
    }

    /* Floating Stage Corner Badges - Outside image box to avoid overlapping small images */
    .stage-tag {
      position: absolute;
      top: 14px;
      z-index: 25;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 6px;
      pointer-events: none;
      backdrop-filter: blur(8px);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(17, 24, 39, 0.88);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #F9FAFB;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    }

    .stage-tag-left {
      left: 18px;
    }

    .stage-tag-right {
      right: 18px;
    }

    .stage-tag-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent, #3B82F6);
    }

    /* Split Slider Container */
    .split-slider-container {
      position: relative;
      max-width: 96%;
      max-height: 96%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 150ms ease-out;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      border-radius: 8px;
      overflow: hidden;
      cursor: ew-resize;
      touch-action: none;
    }

    .split-slider-container.fit-mode {
      max-width: min(92vw, 960px);
      max-height: 100%;
      width: auto;
      height: auto;
    }

    .compare-img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      display: block;
      pointer-events: none;
      image-rendering: auto;
    }

    .original-layer {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }

    .compressed-layer {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      pointer-events: none;
    }

    .split-divider-line {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      background: var(--accent, #2563EB);
      transform: translateX(-50%);
      pointer-events: none;
      z-index: 10;
      box-shadow: 0 0 8px rgba(37, 99, 235, 0.6);
    }

    .split-handle-grip {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: #FFFFFF;
      color: var(--accent, #2563EB);
      border: 2px solid var(--accent, #2563EB);
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: ew-resize;
      pointer-events: auto;
      transition: transform 0.12s ease;
    }

    .split-handle-grip:hover {
      transform: translate(-50%, -50%) scale(1.1);
    }

    /* Unified Preview Card (Side by Side) - Single card spanning full available width */
    .unified-preview-card {
      position: relative;
      width: 100%;
      max-width: 96%;
      height: 85%;
      display: flex;
      flex-direction: column;
      background: #111318;
      border-radius: 12px;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      transition: transform 150ms ease-out;
    }

    .unified-preview-card.fit-mode {
      width: min(92vw, 980px);
      height: min(72vh, 640px);
    }

    .preview-overlay-tag {
      position: absolute;
      top: 12px;
      z-index: 25;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 6px;
      pointer-events: none;
      backdrop-filter: blur(8px);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(17, 24, 39, 0.88);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #F9FAFB;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    }

    .preview-overlay-tag.overlay-left {
      left: 14px;
    }

    .preview-overlay-tag.overlay-right {
      right: 14px;
    }

    .preview-tag-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--text-muted, #9CA3AF);
    }

    .preview-tag-dot.is-accent {
      background: var(--accent, #3B82F6);
    }

    .unified-card-panes {
      flex: 1;
      display: flex;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #0D0F14;
    }

    .pane-half {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      overflow: hidden;
      position: relative;
    }

    .pane-separator {
      width: 1px;
      height: 100%;
      background: var(--border-subtle, rgba(255, 255, 255, 0.1));
      flex-shrink: 0;
    }

    .pane-img-transform-wrap {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 75ms ease-out;
      transform-origin: center center;
    }

    .pane-img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      display: block;
      user-select: none;
    }

    .pane-footer-bar {
      position: absolute;
      bottom: 8px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 500;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.72);
      color: #F8FAFC;
      pointer-events: none;
      z-index: 20;
      white-space: nowrap;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }

    :host-context([data-theme="light"]) .pane-footer-bar,
    [data-theme="light"] .pane-footer-bar {
      background: rgba(255, 255, 255, 0.94);
      color: #0F172A;
      border: 1px solid rgba(15, 23, 42, 0.12);
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.06);
    }

    .pane-footer-dot {
      opacity: 0.5;
    }

    .is-pixel-mode img,
    .is-pixel-mode .compare-img,
    .is-pixel-mode .pane-img,
    .is-pixel-mode .toggle-img,
    .is-pixel-mode .diff-img,
    .is-pixel-mode .preview-image {
      image-rendering: pixelated !important;
      image-rendering: crisp-edges !important;
    }

    .image-viewport.is-panning {
      cursor: grabbing !important;
    }

    /* Flip / Toggle Mode */
    .toggle-view-container {
      position: relative;
      max-width: 90%;
      max-height: 85%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 150ms ease-out;
    }

    .toggle-view-container.fit-mode {
      width: min(84vw, 780px);
      height: min(64vh, 520px);
    }

    .toggle-img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 8px;
      cursor: pointer;
    }

    .toggle-float-badge {
      position: absolute;
      bottom: 14px;
      background: rgba(0, 0, 0, 0.78);
      border: 1px solid rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(8px);
      padding: 6px 14px;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      gap: 12px;
      color: #FFFFFF;
      font-size: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    }

    .toggle-action-pill {
      background: var(--accent, #2563EB);
      border: none;
      color: #FFFFFF;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      user-select: none;
      transition: background 0.15s ease;
    }

    .toggle-action-pill:hover {
      background: var(--accent-hover, #1D4ED8);
    }

    /* Diff Map Mode */
    .diff-view-container {
      position: relative;
      max-width: 90%;
      max-height: 85%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 150ms ease-out;
    }

    .diff-view-container.fit-mode {
      width: min(84vw, 780px);
      height: min(64vh, 520px);
    }

    .diff-img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: #090D16;
    }

    .diff-legend-float {
      position: absolute;
      bottom: 14px;
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      padding: 8px 16px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      color: #FFFFFF;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    }

    .legend-scale {
      display: flex;
      width: 180px;
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
    }

    .legend-color.dark-blue {
      flex: 1;
      background: #0F172A;
    }

    .legend-color.cyan {
      flex: 1;
      background: #06B6D4;
    }

    .legend-color.amber {
      flex: 1;
      background: #F59E0B;
    }

    .legend-color.red {
      flex: 1;
      background: #EF4444;
    }

    .legend-labels {
      display: flex;
      justify-content: space-between;
      width: 100%;
      font-size: 10px;
      color: rgba(255, 255, 255, 0.7);
    }

    .diff-artifact-badge {
      font-size: 11px;
      color: #38BDF8;
      font-weight: 500;
    }

    .diff-fallback {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      color: var(--text-muted);
    }

    /* Uncompressed fallback */
    .uncompressed-preview-wrap {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      max-width: 96%;
      max-height: 96%;
      transition: transform 150ms ease-out;
    }

    .uncompressed-preview-wrap.fit-mode {
      max-width: min(92vw, 960px);
      max-height: 100%;
      width: auto;
      height: auto;
    }

    .preview-image {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 8px;
    }

    /* Footer */
    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--control-spacing) 16px;
      background: var(--ts-surface-base, #111318);
      border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      flex-shrink: 0;
      gap: 12px;
      flex-wrap: nowrap;
      white-space: nowrap;
    }

    .metrics-left {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      flex-wrap: nowrap;
      overflow-x: auto;
      scrollbar-width: none;
    }

    .metrics-left::-webkit-scrollbar {
      display: none;
    }

    .metric-cluster {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .meta-label {
      color: var(--text-3, #9CA3AF);
    }

    .meta-value {
      color: var(--text, #F9FAFB);
      font-weight: 600;
    }

    .meta-dim {
      color: var(--text-3, #6B7280);
      font-size: 11px;
    }

    .metric-arrow {
      color: var(--text-3, #9CA3AF);
    }

    .compressed-value {
      color: var(--accent, #60A5FA);
      font-weight: 700;
    }

    .compressed-value.larger-value {
      color: var(--warning, #F59E0B);
    }

    .savings-chip {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 9999px;
    }

    .chip-success {
      background: rgba(37, 99, 235, 0.15);
      color: var(--accent, #60A5FA);
      border: 1px solid rgba(37, 99, 235, 0.35);
    }

    .chip-warning {
      background: rgba(245, 158, 11, 0.15);
      color: var(--warning, #F59E0B);
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .chip-neutral {
      background: var(--ts-surface-subtle, rgba(255, 255, 255, 0.08));
      color: var(--text-2, #D1D5DB);
    }

    .quality-score-simple {
      display: inline-flex;
      align-items: center;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 4px;
      background: rgba(16, 185, 129, 0.12);
      color: #10B981;
      border: 1px solid rgba(16, 185, 129, 0.25);
    }

    .metrics-right-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: auto;
    }

    .footer-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 36px;
      padding: 0 16px;
      border-radius: var(--ts-radius-sm, 8px);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .customize-btn {
      background: var(--ts-surface-base, #111318);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
      color: var(--text-2, #D1D5DB);
    }

    .customize-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text, #FFFFFF);
      border-color: rgba(255, 255, 255, 0.22);
    }

    :host-context([data-theme="light"]) .customize-btn,
    [data-theme="light"] .customize-btn {
      background: #FFFFFF;
      border-color: #CBD5E1;
      color: #334155;
    }

    :host-context([data-theme="light"]) .customize-btn:hover,
    [data-theme="light"] .customize-btn:hover {
      background: #F1F5F9;
      color: #0F172A;
      border-color: #94A3B8;
    }

    /* Acklet Blue Accent Download Button */
    .download-btn {
      background: var(--accent, #2563EB);
      color: #FFFFFF;
      border-color: var(--accent, #2563EB);
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
    }

    .download-btn:hover {
      background: var(--accent-hover, #1D4ED8);
      border-color: var(--accent-hover, #1D4ED8);
    }

    .compress-btn {
      background: var(--accent, #2563EB);
      color: #FFFFFF;
    }

    .compress-btn:hover {
      background: var(--accent-hover, #1D4ED8);
    }

    .revert-btn {
      background: rgba(245, 158, 11, 0.12);
      border-color: rgba(245, 158, 11, 0.3);
      color: var(--warning, #F59E0B);
    }

    .revert-btn:hover {
      background: var(--warning, #F59E0B);
      color: #000000;
    }

    .preview-error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 32px;
      color: var(--text-3, #9CA3AF);
    }

    .preview-error-state h4 {
      margin: 12px 0 6px 0;
      color: var(--text, #F9FAFB);
    }

    /* ── Light Mode Dual-Theme Overrides ── */
    :host-context([data-theme="light"]) .modal-backdrop,
    [data-theme="light"] .modal-backdrop {
      background: rgba(15, 23, 42, 0.55);
    }

    :host-context([data-theme="light"]) .modal-dialog,
    [data-theme="light"] .modal-dialog {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 25px 60px -15px rgba(15, 23, 42, 0.25);
      height: 95%;
    }

    :host-context([data-theme="light"]) .modal-header,
    [data-theme="light"] .modal-header {
      background: #FFFFFF;
      border-bottom-color: #E2E8F0;
    }

    :host-context([data-theme="light"]) .modal-title,
    [data-theme="light"] .modal-title {
      color: #0F172A;
    }

    :host-context([data-theme="light"]) .format-pill,
    [data-theme="light"] .format-pill {
      background: #E2E8F0;
      color: #334155;
      border-color: #CBD5E1;
    }

    :host-context([data-theme="light"]) .view-mode-toggle,
    [data-theme="light"] .view-mode-toggle,
    :host-context([data-theme="light"]) .zoom-controls,
    [data-theme="light"] .zoom-controls {
      background: #F1F5F9;
      border-color: #CBD5E1;
    }

    :host-context([data-theme="light"]) .mode-toggle-btn,
    [data-theme="light"] .mode-toggle-btn {
      color: #475569;
    }

    :host-context([data-theme="light"]) .mode-toggle-btn.is-active,
    [data-theme="light"] .mode-toggle-btn.is-active {
      background: var(--accent, #2563EB);
      color: #FFFFFF;
      height: 26px;
      box-sizing: border-box;
      box-shadow: 0 1px 4px rgba(37, 99, 235, 0.25);
    }

    :host-context([data-theme="light"]) .zoom-btn,
    [data-theme="light"] .zoom-btn,
    :host-context([data-theme="light"]) .zoom-opt-btn,
    [data-theme="light"] .zoom-opt-btn {
      color: #475569;
    }

    :host-context([data-theme="light"]) .zoom-opt-btn.is-active,
    [data-theme="light"] .zoom-opt-btn.is-active {
      background: var(--accent, #2563EB);
      color: #FFFFFF;
      height: 20px;
      box-sizing: border-box;
    }

    :host-context([data-theme="light"]) .zoom-value-tag,
    [data-theme="light"] .zoom-value-tag {
      color: var(--accent, #2563EB);
    }

    :host-context([data-theme="light"]) .stage-container,
    [data-theme="light"] .stage-container {
      background: #F8FAFC;
    }

    :host-context([data-theme="light"]) .stage-tag,
    [data-theme="light"] .stage-tag {
      background: rgba(255, 255, 255, 0.92);
      border-color: rgba(15, 23, 42, 0.12);
      color: #0F172A;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
    }

    :host-context([data-theme="light"]) .stage-tag-dot,
    [data-theme="light"] .stage-tag-dot {
      background: var(--accent, #2563EB);
    }

    :host-context([data-theme="light"]) .unified-preview-card,
    [data-theme="light"] .unified-preview-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
    }

    :host-context([data-theme="light"]) .unified-card-panes,
    [data-theme="light"] .unified-card-panes {
      background: #F8FAFC;
    }

    :host-context([data-theme="light"]) .preview-overlay-tag,
    [data-theme="light"] .preview-overlay-tag {
      background: rgba(255, 255, 255, 0.94);
      border-color: rgba(15, 23, 42, 0.12);
      color: #0F172A;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
    }

    :host-context([data-theme="light"]) .preview-tag-dot.is-accent,
    [data-theme="light"] .preview-tag-dot.is-accent {
      background: var(--accent, #2563EB);
    }

    :host-context([data-theme="light"]) .pane-separator,
    [data-theme="light"] .pane-separator {
      background: #E2E8F0;
    }

    :host-context([data-theme="light"]) .toggle-float-badge,
    [data-theme="light"] .toggle-float-badge {
      background: rgba(255, 255, 255, 0.92);
      border-color: rgba(15, 23, 42, 0.15);
      color: #0F172A;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.12);
    }

    :host-context([data-theme="light"]) .modal-footer,
    [data-theme="light"] .modal-footer {
      background: #FFFFFF;
      border-top-color: #E2E8F0;
    }

    :host-context([data-theme="light"]) .meta-label,
    [data-theme="light"] .meta-label {
      color: #64748B;
    }

    :host-context([data-theme="light"]) .meta-value,
    [data-theme="light"] .meta-value {
      color: #0F172A;
    }

    :host-context([data-theme="light"]) .compressed-value,
    [data-theme="light"] .compressed-value {
      color: var(--accent, #2563EB);
    }

    :host-context([data-theme="light"]) .chip-success,
    [data-theme="light"] .chip-success {
      background: #EFF6FF;
      color: var(--accent, #2563EB);
      border-color: rgba(37, 99, 235, 0.25);
    }

    :host-context([data-theme="light"]) .modal-file-bar,
    [data-theme="light"] .modal-file-bar {
      background: #FFFFFF;
      border-bottom-color: #E2E8F0;
    }

    :host-context([data-theme="light"]) .file-name-text,
    [data-theme="light"] .file-name-text {
      color: #0F172A;
    }

    :host-context([data-theme="light"]) .icon-close-btn,
    [data-theme="light"] .icon-close-btn {
      color: #64748B;
    }

    :host-context([data-theme="light"]) .icon-close-btn:hover,
    [data-theme="light"] .icon-close-btn:hover {
      background: #F1F5F9;
      color: #0F172A;
    }

    :host-context([data-theme="light"]) .quality-score-simple,
    [data-theme="light"] .quality-score-simple {
      background: #ECFDF5;
      border-color: rgba(16, 185, 129, 0.25);
      color: #059669;
    }

    @media (max-width: 820px) {
      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 8px 12px;
      }
      .header-left,
      .header-center,
      .header-right {
        display: flex;
        align-items: center;
        flex-shrink: 0;
      }
      .view-mode-toggle {
        flex-shrink: 0;
      }
      .zoom-controls {
        flex-shrink: 0;
      }
    }

    @media (max-width: 640px) {
      .mode-text {
        display: none;
      }
      .metrics-left {
        width: 100%;
      }
      .metrics-right-actions {
        width: 100%;
        justify-content: flex-end;
      }
    }

    @media (max-width: 479px) {
      .modal-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 8px 10px !important;
        gap: 6px !important;
        box-sizing: border-box !important;
      }
      .header-left,
      .header-center,
      .header-right {
        display: flex !important;
        align-items: center !important;
        flex-shrink: 0 !important;
      }
      .view-mode-toggle {
        height: 32px !important;
        padding: 2px !important;
        gap: 2px !important;
        box-sizing: border-box !important;
      }
      .mode-toggle-btn {
        height: 26px !important;
        min-height: 0 !important;
        min-width: 0 !important;
        padding: 0 8px !important;
        box-sizing: border-box !important;
      }
      .mode-toggle-btn.is-active {
        height: 26px !important;
        box-sizing: border-box !important;
      }
      .zoom-controls {
        height: 32px !important;
        padding: 2px !important;
        gap: 2px !important;
        box-sizing: border-box !important;
      }
      .zoom-btn {
        width: 26px !important;
        height: 26px !important;
        min-height: 0 !important;
        min-width: 0 !important;
        padding: 0 !important;
        box-sizing: border-box !important;
        flex-shrink: 0 !important;
      }
      .zoom-btn:disabled {
        opacity: 0.45 !important;
      }
      .zoom-opt-btn {
        height: 26px !important;
        min-height: 0 !important;
        min-width: 0 !important;
        padding: 0 7px !important;
        font-size: 11px !important;
        box-sizing: border-box !important;
        flex-shrink: 0 !important;
      }
      .zoom-opt-btn.is-active {
        height: 26px !important;
        box-sizing: border-box !important;
      }
      .icon-close-btn {
        width: 32px !important;
        height: 32px !important;
        min-height: 0 !important;
        min-width: 0 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        box-sizing: border-box !important;
        flex-shrink: 0 !important;
      }
      .modal-footer {
        padding: 8px 12px !important;
        gap: 8px !important;
      }
      .metric-cluster {
        font-size: 12px !important;
        gap: 4px !important;
      }
      .download-btn {
        min-height: 36px !important;
        padding: 0 14px !important;
      }
    }

    @keyframes modalBackdropFadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes modalBackdropFadeOut {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }

    @keyframes modalDialogEnter {
      from {
        opacity: 0;
        transform: scale(0.96) translateY(12px);
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
        transform: scale(0.96) translateY(12px);
      }
    }
  `]
})
export class PreviewModalComponent implements OnInit, OnDestroy {
  private readonly document = inject(DOCUMENT);

  readonly item = input.required<ImageItem | null>();
  readonly currentIndex = input<number>(0);
  readonly totalImages = input<number>(1);

  readonly close = output<void>();
  readonly next = output<void>();
  readonly prev = output<void>();
  readonly compressRequested = output<string>();
  readonly customizeRequested = output<string>();
  readonly downloadRequested = output<string>();
  readonly keepOriginalRequested = output<string>();

  readonly viewportRef = viewChild<ElementRef<HTMLElement>>('viewportRef');
  readonly sliderBoxRef = viewChild<ElementRef<HTMLElement>>('sliderBoxRef');

  readonly Math = Math;

  ngOnInit(): void {
    if (this.document?.body) {
      this.document.body.style.overflow = 'hidden';
    }
  }

  ngOnDestroy(): void {
    if (this.document?.body) {
      this.document.body.style.overflow = '';
    }
  }

  private readonly telemetry = inject(CompressorTelemetryService, { optional: true });

  readonly isClosing = signal<boolean>(false);
  readonly isFitMode = signal<boolean>(true);
  readonly viewMode = signal<CompareViewMode>('split');
  readonly splitPosition = signal<number>(50); // percentage 0 to 100
  readonly zoomLevel = signal<number>(1);
  readonly showOriginalOnToggle = signal<boolean>(false);
  readonly isDraggingSplit = signal<boolean>(false);

  readonly syncPan = signal<boolean>(true);
  readonly panX = signal<number>(0);
  readonly panY = signal<number>(0);
  readonly pane2PanX = signal<number>(0);
  readonly pane2PanY = signal<number>(0);
  readonly isPanning = signal<boolean>(false);
  private panStartPointerX = 0;
  private panStartPointerY = 0;
  private panStartX = 0;
  private panStartY = 0;

  readonly isPixelMode = computed<boolean>(() => {
    return computeIsPixelMode(this.zoomLevel(), this.isFitMode());
  });

  requestClose(): void {
    if (this.isClosing()) return;
    this.isClosing.set(true);
    setTimeout(() => {
      this.close.emit();
    }, 500);
  }

  toggleFitMode(): void {
    this.isFitMode.set(true);
    this.zoomLevel.set(1);
    this.panX.set(0);
    this.panY.set(0);
  }

  setZoom100(): void {
    this.isFitMode.set(false);
    this.zoomLevel.set(1);
    this.panX.set(0);
    this.panY.set(0);
  }

  setPixelZoom(): void {
    this.isFitMode.set(false);
    this.zoomLevel.set(8);
    this.panX.set(0);
    this.panY.set(0);
    this.telemetry?.trackPixelZoomUsed();
  }

  toggleSyncPan(): void {
    this.syncPan.update(v => !v);
  }

  zoomIn(): void {
    this.isFitMode.set(false);
    this.zoomLevel.update(z => {
      const next = computeZoomIn(z);
      if (next >= 4) {
        this.telemetry?.trackPixelZoomUsed();
      }
      return next;
    });
  }

  zoomOut(): void {
    this.isFitMode.set(false);
    this.zoomLevel.update(z => computeZoomOut(z));
  }

  resetZoom(): void {
    this.zoomLevel.set(1);
    this.panX.set(0);
    this.panY.set(0);
  }

  onViewportPointerDown(event: PointerEvent): void {
    if (this.isFitMode() || this.viewMode() === 'split') return;
    this.isPanning.set(true);
    this.panStartPointerX = event.clientX;
    this.panStartPointerY = event.clientY;
    this.panStartX = this.panX();
    this.panStartY = this.panY();
    const target = event.currentTarget as HTMLElement | null;
    target?.setPointerCapture?.(event.pointerId);
  }

  onViewportPointerMove(event: PointerEvent): void {
    if (!this.isPanning()) return;
    const dx = event.clientX - this.panStartPointerX;
    const dy = event.clientY - this.panStartPointerY;
    this.panX.set(this.panStartX + dx);
    this.panY.set(this.panStartY + dy);
  }

  onViewportPointerUp(event?: PointerEvent): void {
    if (!this.isPanning()) return;
    this.isPanning.set(false);
    if (event) {
      const target = event.currentTarget as HTMLElement | null;
      try {
        target?.releasePointerCapture?.(event.pointerId);
      } catch {}
    }
  }

  toggleFlipImage(): void {
    this.showOriginalOnToggle.update(v => !v);
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.item()) return;
    if (event.key === 'Escape') {
      this.requestClose();
    } else if (event.key === 'ArrowRight') {
      this.next.emit();
    } else if (event.key === 'ArrowLeft') {
      this.prev.emit();
    } else if (event.code === 'Space' && this.viewMode() === 'toggle') {
      event.preventDefault();
      this.showOriginalOnToggle.set(true);
    }
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent): void {
    if (event.code === 'Space' && this.viewMode() === 'toggle') {
      this.showOriginalOnToggle.set(false);
    }
  }

  onSliderPointerDown(event: PointerEvent): void {
    if (this.viewMode() !== 'split') return;
    this.isDraggingSplit.set(true);
    const target = event.currentTarget as HTMLElement | null;
    target?.setPointerCapture?.(event.pointerId);
    this.updateSplitFromPointer(event);
  }

  onSliderPointerMove(event: PointerEvent): void {
    if (!this.isDraggingSplit() || this.viewMode() !== 'split') return;
    this.updateSplitFromPointer(event);
  }

  onSliderPointerUp(event?: PointerEvent): void {
    this.isDraggingSplit.set(false);
    if (event) {
      const target = event.currentTarget as HTMLElement | null;
      try {
        target?.releasePointerCapture?.(event.pointerId);
      } catch {}
    }
  }

  private updateSplitFromPointer(event: PointerEvent): void {
    const el = this.sliderBoxRef()?.nativeElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const x = event.clientX - rect.left;
    const pct = Math.max(0, Math.min(100, Math.round((x / rect.width) * 100)));
    this.splitPosition.set(pct);
  }

  readonly formattedOriginalSize = computed(() => {
    const item = this.item();
    return item ? this.formatBytes(item.originalSize) : '0 B';
  });

  readonly formattedCompressedSize = computed(() => {
    const item = this.item();
    return item?.result ? this.formatBytes(item.result.compressedSize) : '—';
  });

  readonly formattedOriginalDimensions = computed(() => {
    const item = this.item();
    if (!item) return '-';
    if (item.width > 0 && item.height > 0) {
      return `${item.width} × ${item.height} px`;
    }
    return 'Vector / Dynamic';
  });

  readonly formattedOutputDimensions = computed(() => {
    const item = this.item();
    if (item?.result && item.result.outputWidth > 0 && item.result.outputHeight > 0) {
      return `${item.result.outputWidth} × ${item.result.outputHeight} px`;
    }
    return this.formattedOriginalDimensions();
  });

  readonly qualityScore = computed<number>(() => {
    const ssim = this.item()?.result?.visualQuality?.ssim;
    if (typeof ssim === 'number') {
      return Math.min(100, Math.max(0, Math.round(ssim * 100)));
    }
    return 100;
  });

  formatTargetBytes(bytes: number): string {
    return this.formatBytes(bytes);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
  }
}

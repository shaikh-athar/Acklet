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
  viewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';
import { ImageItem } from '../../models/compressor.models';

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
        (click)="close.emit()"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="'Preview ' + image.originalName"
      >
        <div class="modal-dialog" (click)="$event.stopPropagation()">

          <!-- 1. MODAL HEADER -->
          <div class="modal-header">
            <div class="header-info">
              <span class="format-pill font-mono">{{ image.originalExtension | uppercase }}</span>
              <h3 class="modal-title" [title]="image.originalName">{{ image.originalName }}</h3>
            </div>

            <!-- View Mode Controls (if compressed) & Zoom -->
            <div class="header-center-controls">
              @if (image.result) {
                <div class="view-mode-toggle" role="group" aria-label="Comparison View Mode">
                  <button
                    type="button"
                    class="mode-toggle-btn"
                    [class.is-active]="viewMode() === 'split'"
                    (click)="viewMode.set('split')"
                    title="Split Slider Comparison"
                  >
                    <ts-icon name="columns" [size]="14" />
                    <span class="mode-text">Split</span>
                  </button>

                  <button
                    type="button"
                    class="mode-toggle-btn"
                    [class.is-active]="viewMode() === 'side-by-side'"
                    (click)="viewMode.set('side-by-side')"
                    title="Side by Side Comparison"
                  >
                    <ts-icon name="layout-grid" [size]="14" />
                    <span class="mode-text">Side by Side</span>
                  </button>

                  <button
                    type="button"
                    class="mode-toggle-btn"
                    [class.is-active]="viewMode() === 'toggle'"
                    (click)="viewMode.set('toggle')"
                    title="Toggle / Flip View"
                  >
                    <ts-icon name="eye" [size]="14" />
                    <span class="mode-text">Flip</span>
                  </button>

                  <button
                    type="button"
                    class="mode-toggle-btn"
                    [class.is-active]="viewMode() === 'diff'"
                    (click)="viewMode.set('diff')"
                    title="Amplified Visual Difference Heatmap"
                  >
                    <ts-icon name="activity" [size]="14" />
                    <span class="mode-text">Diff Map</span>
                  </button>
                </div>
              }

              <!-- Zoom & Fit Controls -->
              <div class="zoom-controls">
                <button
                  type="button"
                  class="zoom-btn"
                  (click)="zoomOut()"
                  [disabled]="isFitMode() || zoomLevel() <= 0.5"
                  title="Zoom Out"
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
                @if (!isFitMode() && zoomLevel() !== 1) {
                  <span class="zoom-value-tag font-mono">{{ Math.round(zoomLevel() * 100) }}%</span>
                }
                <button
                  type="button"
                  class="zoom-btn"
                  (click)="zoomIn()"
                  [disabled]="isFitMode() || zoomLevel() >= 3"
                  title="Zoom In"
                >
                  <ts-icon name="plus" [size]="12" />
                </button>
              </div>
            </div>

            <div class="header-actions">
              <span class="index-indicator font-mono">
                {{ currentIndex() + 1 }} / {{ totalImages() }}
              </span>
              <button
                type="button"
                class="icon-close-btn"
                (click)="close.emit()"
                aria-label="Close image preview"
              >
                <ts-icon name="x" [size]="18" />
              </button>
            </div>
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
                  <!-- Floating comparison stage labels - outside the image box to prevent overlapping -->
                  <div class="stage-tag stage-tag-left">
                    <span class="stage-tag-dot"></span>
                    <span>Compressed ({{ splitPosition() }}%)</span>
                  </div>
                  <div class="stage-tag stage-tag-right">
                    <span>Original</span>
                  </div>

                  <div
                    #sliderBoxRef
                    class="split-slider-container"
                    [class.fit-mode]="isFitMode()"
                    [style.transform]="!isFitMode() ? ('scale(' + zoomLevel() + ')') : 'none'"
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

                <!-- MODE B: SIDE BY SIDE -->
                @if (viewMode() === 'side-by-side') {
                  <div
                    class="side-by-side-container"
                    [class.fit-mode]="isFitMode()"
                    [style.transform]="!isFitMode() ? ('scale(' + zoomLevel() + ')') : 'none'"
                  >
                    <div class="side-panel">
                      <div class="side-panel-header">
                        <span class="side-label">Original</span>
                        <span class="side-meta font-mono">{{ formattedOriginalSize() }}</span>
                      </div>
                      <div class="side-img-wrap">
                        <img
                          [src]="image.transformedPreviewUrl || image.previewUrl"
                          [alt]="image.originalName + ' Original'"
                          class="side-img"
                        />
                      </div>
                    </div>

                    <div class="side-panel">
                      <div class="side-panel-header">
                        <span class="side-label">Compressed</span>
                        <span class="side-meta font-mono">{{ formattedCompressedSize() }}</span>
                      </div>
                      <div class="side-img-wrap">
                        <img
                          [src]="image.result.outputUrl"
                          [alt]="image.originalName + ' Compressed'"
                          class="side-img"
                        />
                      </div>
                    </div>
                  </div>
                }

                <!-- MODE C: FLIP / TOGGLE -->
                @if (viewMode() === 'toggle') {
                  <div
                    class="toggle-view-container"
                    [class.fit-mode]="isFitMode()"
                    [style.transform]="!isFitMode() ? ('scale(' + zoomLevel() + ')') : 'none'"
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
                    [style.transform]="!isFitMode() ? ('scale(' + zoomLevel() + ')') : 'none'"
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
                  [style.transform]="!isFitMode() ? ('scale(' + zoomLevel() + ')') : 'none'"
                >
                  <img
                    [src]="image.transformedPreviewUrl || image.previewUrl"
                    [alt]="image.originalName"
                    class="preview-image"
                  />
                  <div class="uncompressed-banner">
                    <ts-icon name="sparkles" [size]="14" />
                    <span>This image is not compressed yet.</span>
                    <button
                      type="button"
                      class="inline-compress-btn"
                      (click)="compressRequested.emit(image.id)"
                    >
                      <ts-icon name="minimize-2" [size]="13" />
                      <span>Compress Now</span>
                    </button>
                  </div>
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

          <!-- 3. MODAL FOOTER & COMPARISON METRICS -->
          <div class="modal-footer">
            <div class="metrics-left">
              <div class="metric-cluster">
                <span class="meta-label">Original:</span>
                <span class="meta-value font-mono">{{ formattedOriginalSize() }}</span>
                <span class="meta-dim font-mono">({{ formattedOriginalDimensions() }})</span>
              </div>

              @if (image.result) {
                <ts-icon name="arrow-right" [size]="12" class="metric-arrow" />
                <div class="metric-cluster">
                  <span class="meta-label">Compressed:</span>
                  <span class="meta-value font-mono compressed-value" [class.larger-value]="image.result.isLargerThanOriginal">
                    {{ formattedCompressedSize() }}
                  </span>
                  <span class="meta-dim font-mono">({{ formattedOutputDimensions() }})</span>

                  @if (image.result.isLargerThanOriginal) {
                    <span class="savings-chip chip-warning">
                      +{{ Math.abs(image.result.savedPercentage) }}% Larger
                    </span>
                  } @else if (image.result.savedPercentage > 0) {
                    <span class="savings-chip chip-success">
                      -{{ image.result.savedPercentage }}% Saved
                    </span>
                  } @else {
                    <span class="savings-chip chip-neutral">0% (Same)</span>
                  }
                </div>

                <!-- Quality score with tooltip -->
                @if (image.result.visualQuality; as vq) {
                  <div
                    class="quality-score-chip"
                    [title]="'Quality score: ' + qualityScore() + '/100. Measures visual fidelity compared to the original image.'"
                  >
                    <ts-icon name="shield-check" [size]="12" />
                    <span class="font-mono">Quality: {{ qualityScore() }}/100</span>
                  </div>
                }

                <!-- Phase 3: Target File Size Status -->
                @if (image.result.targetBytesRequested) {
                  <div
                    class="target-status-chip font-mono"
                    [class.is-met]="image.result.targetAchieved"
                    [class.is-unreached]="image.result.targetUnreachable"
                  >
                    <ts-icon [name]="image.result.targetAchieved ? 'check' : 'alert-circle'" [size]="12" />
                    <span>Target ≤ {{ formatTargetBytes(image.result.targetBytesRequested) }}</span>
                    <span class="target-badge-status">
                      {{ image.result.targetAchieved ? '(Met • ' + image.result.iterationsCount + ' iter)' : '(Unreachable)' }}
                    </span>
                  </div>
                }
              }
            </div>

            <!-- Footer Right Actions -->
            <div class="metrics-right-actions">
              @if (image.result) {
                @if (image.result.isLargerThanOriginal) {
                  <button
                    type="button"
                    class="footer-btn revert-btn"
                    (click)="keepOriginalRequested.emit(image.id)"
                    title="Keep original file"
                  >
                    <ts-icon name="rotate-ccw" [size]="14" />
                    <span>Keep Original</span>
                  </button>
                }

                <button
                  type="button"
                  class="footer-btn download-btn"
                  (click)="downloadRequested.emit(image.id)"
                  title="Download compressed image"
                >
                  <ts-icon name="download" [size]="14" />
                  <span>Download ({{ formattedCompressedSize() }})</span>
                </button>
              } @else {
                <button
                  type="button"
                  class="footer-btn compress-btn"
                  (click)="compressRequested.emit(image.id)"
                >
                  <ts-icon name="minimize-2" [size]="14" />
                  <span>Compress Image</span>
                </button>
              }
            </div>
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(0, 0, 0, 0.88);
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: fadeIn 180ms ease-out;
    }

    .modal-dialog {
      display: flex;
      flex-direction: column;
      max-width: 1080px;
      width: 100%;
      height: 90vh;
      max-height: 850px;
      background: var(--ts-surface-card, #1A1C23);
      border: 1px solid var(--border-default, #2E3342);
      border-radius: var(--ts-radius-card, 20px);
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.7);
      overflow: hidden;
    }

    /* Header */
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 18px;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      flex-shrink: 0;
      gap: 12px;
    }

    .header-info {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .format-pill {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      background: var(--ts-surface-subtle, rgba(255, 255, 255, 0.08));
      color: var(--text-2, #D1D5DB);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
    }

    .modal-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text, #F9FAFB);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 260px;
      margin: 0;
    }

    /* Center Controls (View Mode & Zoom) */
    .header-center-controls {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .view-mode-toggle {
      display: inline-flex;
      align-items: center;
      padding: 2px;
      background: var(--ts-surface-base, #111318);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      border-radius: var(--ts-radius-sm, 8px);
      gap: 2px;
    }

    .mode-toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 9px;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: var(--text-2, #9CA3AF);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .mode-toggle-btn:hover {
      color: var(--text, #F9FAFB);
    }

    .mode-toggle-btn.is-active {
      background: var(--accent, #2563EB);
      color: #FFFFFF;
      box-shadow: 0 1px 4px rgba(37, 99, 235, 0.35);
    }

    .zoom-controls {
      display: inline-flex;
      align-items: center;
      background: var(--ts-surface-base, #111318);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      border-radius: var(--ts-radius-sm, 8px);
      padding: 2px;
      gap: 2px;
    }

    .zoom-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border: none;
      background: transparent;
      color: var(--text-2, #9CA3AF);
      cursor: pointer;
      border-radius: 4px;
    }

    .zoom-btn:hover:not(:disabled) {
      color: var(--text, #FFFFFF);
      background: var(--ts-surface-card, #1E2028);
    }

    .zoom-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .zoom-opt-btn {
      border: none;
      background: transparent;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-2, #9CA3AF);
      padding: 3px 7px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .zoom-opt-btn:hover {
      color: var(--text, #FFFFFF);
    }

    .zoom-opt-btn.is-active {
      background: var(--accent, #2563EB);
      color: #FFFFFF;
    }

    .zoom-value-tag {
      font-size: 10px;
      font-weight: 600;
      color: var(--accent, #60A5FA);
      padding: 0 4px;
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
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-2, #9CA3AF);
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .icon-close-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text, #FFFFFF);
    }

    /* Stage */
    .stage-container {
      position: relative;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: repeating-conic-gradient(#181B22 0% 25%, #111318 0% 50%) 50% / 16px 16px;
      overflow: hidden;
      user-select: none;
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
      padding: 24px;
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
      max-width: 90%;
      max-height: 85%;
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
      width: min(84vw, 780px);
      height: min(64vh, 520px);
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

    /* Side by Side Mode */
    .side-by-side-container {
      display: flex;
      gap: 16px;
      width: 90%;
      height: 85%;
      align-items: center;
      justify-content: center;
      transition: transform 150ms ease-out;
    }

    .side-by-side-container.fit-mode {
      width: min(88vw, 840px);
      height: min(65vh, 520px);
    }

    .side-panel {
      flex: 1;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: #111318;
      border-radius: 12px;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      overflow: hidden;
    }

    .side-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: #181B22;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    .side-label {
      font-size: 12px;
      font-weight: 700;
      color: var(--text, #FFFFFF);
    }

    .side-meta {
      font-size: 11px;
      color: var(--text-2, #9CA3AF);
    }

    .side-img-wrap {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px;
      overflow: hidden;
      background: repeating-conic-gradient(#181B22 0% 25%, #111318 0% 50%) 50% / 12px 12px;
    }

    .side-img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
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
      max-width: 85%;
      max-height: 85%;
      transition: transform 150ms ease-out;
    }

    .uncompressed-preview-wrap.fit-mode {
      width: min(84vw, 780px);
      height: min(64vh, 520px);
    }

    .preview-image {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 8px;
    }

    .uncompressed-banner {
      margin-top: 12px;
      background: rgba(0, 0, 0, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(8px);
      padding: 6px 14px;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12px;
      color: var(--text-2, #D1D5DB);
    }

    .inline-compress-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: var(--accent, #2563EB);
      color: #FFFFFF;
      border: none;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }

    /* Footer */
    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 18px;
      background: var(--ts-surface-base, #111318);
      border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      flex-shrink: 0;
      gap: 12px;
      flex-wrap: wrap;
    }

    .metrics-left {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12px;
      flex-wrap: wrap;
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

    .quality-score-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 500;
      padding: 3px 8px;
      border-radius: 6px;
      background: var(--bg-subtle, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      color: var(--text-secondary, #D1D5DB);
    }

    .target-status-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      color: var(--text-2, #D1D5DB);
    }

    .target-status-chip.is-met {
      background: rgba(37, 99, 235, 0.15);
      border-color: rgba(37, 99, 235, 0.35);
      color: var(--accent, #60A5FA);
    }

    .target-status-chip.is-unreached {
      background: rgba(239, 68, 68, 0.12);
      border-color: rgba(239, 68, 68, 0.3);
      color: var(--danger, #F87171);
    }

    .target-badge-status {
      font-weight: 500;
      opacity: 0.9;
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
    }

    :host-context([data-theme="light"]) .modal-header,
    [data-theme="light"] .modal-header {
      background: #F8FAFC;
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
    }

    :host-context([data-theme="light"]) .zoom-value-tag,
    [data-theme="light"] .zoom-value-tag {
      color: var(--accent, #2563EB);
    }

    :host-context([data-theme="light"]) .stage-container,
    [data-theme="light"] .stage-container {
      background: repeating-conic-gradient(#E2E8F0 0% 25%, #FFFFFF 0% 50%) 50% / 16px 16px;
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

    :host-context([data-theme="light"]) .side-panel,
    [data-theme="light"] .side-panel {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
    }

    :host-context([data-theme="light"]) .side-panel-header,
    [data-theme="light"] .side-panel-header {
      background: #F8FAFC;
      border-bottom-color: #E2E8F0;
    }

    :host-context([data-theme="light"]) .side-label,
    [data-theme="light"] .side-label {
      color: #0F172A;
    }

    :host-context([data-theme="light"]) .side-meta,
    [data-theme="light"] .side-meta {
      color: #64748B;
    }

    :host-context([data-theme="light"]) .side-img-wrap,
    [data-theme="light"] .side-img-wrap {
      background: repeating-conic-gradient(#F1F5F9 0% 25%, #FFFFFF 0% 50%) 50% / 12px 12px;
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
      background: #F8FAFC;
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

    :host-context([data-theme="light"]) .quality-score-chip,
    [data-theme="light"] .quality-score-chip {
      background: #F1F5F9;
      border-color: #E2E8F0;
      color: #334155;
    }

    :host-context([data-theme="light"]) .target-status-chip,
    [data-theme="light"] .target-status-chip {
      background: #F1F5F9;
      border-color: #E2E8F0;
      color: #334155;
    }

    :host-context([data-theme="light"]) .target-status-chip.is-met,
    [data-theme="light"] .target-status-chip.is-met {
      background: #EFF6FF;
      border-color: rgba(37, 99, 235, 0.25);
      color: var(--accent, #2563EB);
    }

    @media (max-width: 640px) {
      .modal-dialog {
        height: 95vh;
      }
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
      .stage-tag {
        font-size: 10px;
        padding: 2px 6px;
      }
    }
  `]
})
export class PreviewModalComponent {
  readonly item = input.required<ImageItem | null>();
  readonly currentIndex = input<number>(0);
  readonly totalImages = input<number>(1);

  readonly close = output<void>();
  readonly next = output<void>();
  readonly prev = output<void>();
  readonly compressRequested = output<string>();
  readonly downloadRequested = output<string>();
  readonly keepOriginalRequested = output<string>();

  readonly viewportRef = viewChild<ElementRef<HTMLElement>>('viewportRef');
  readonly sliderBoxRef = viewChild<ElementRef<HTMLElement>>('sliderBoxRef');

  readonly Math = Math;

  readonly isFitMode = signal<boolean>(true);
  readonly viewMode = signal<CompareViewMode>('split');
  readonly splitPosition = signal<number>(50); // percentage 0 to 100
  readonly zoomLevel = signal<number>(1);
  readonly showOriginalOnToggle = signal<boolean>(false);
  readonly isDraggingSplit = signal<boolean>(false);

  toggleFitMode(): void {
    this.isFitMode.set(true);
    this.zoomLevel.set(1);
  }

  setZoom100(): void {
    this.isFitMode.set(false);
    this.zoomLevel.set(1);
  }

  zoomIn(): void {
    this.isFitMode.set(false);
    this.zoomLevel.update(z => Math.min(3, Math.round((z + 0.25) * 100) / 100));
  }

  zoomOut(): void {
    this.isFitMode.set(false);
    this.zoomLevel.update(z => Math.max(0.5, Math.round((z - 0.25) * 100) / 100));
  }

  resetZoom(): void {
    this.zoomLevel.set(1);
  }

  toggleFlipImage(): void {
    this.showOriginalOnToggle.update(v => !v);
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.item()) return;
    if (event.key === 'Escape') {
      this.close.emit();
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

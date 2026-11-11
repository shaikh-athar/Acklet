// apps/tool-color-studio/src/components/simulator/simulator-module.component.ts
import {
  Component,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  HostListener,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ColorStudioStateService } from '../../services/color-studio-state.service';
import { ColorEngineService } from '../../services/color-engine.service';
import { ColorBlindnessService, CVD_PROFILES } from '../../services/color-blindness.service';
import { ExportService } from '../../services/export.service';
import {
  ColorBlindnessType,
  ColorBlindnessInfo,
  SimulatorViewMode,
  PaletteSimulationResult,
  PaletteConfusionPair
} from '../../models/color.models';
import { TsIconComponent } from '@acklet/tool-shell';

@Component({
  selector: 'app-simulator-module',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="simulator-layout">

      <!-- Compact Header: Title, Category Pill, and Subtitle -->
      <header class="workspace-header">
        <div class="header-titles">
          <div class="title-row">
            <h2 class="workspace-title">Vision Simulator</h2>
            <span class="category-pill hide-on-mobile" [class.anomalous]="activeProfile().category === 'anomalous'">
              {{ activeProfile().title }} • {{ activeProfile().subtitle }}
            </span>
          </div>
          <p class="workspace-subtitle">
            Simulate color vision deficiencies across images and evaluate accessibility in real-world scenarios.
          </p>
        </div>

        <div class="header-actions">
          <!-- View Toggle: Image vs Palette simulation -->
          <div class="tab-toggle-group">
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'image'"
              (click)="activeTab.set('image')"
            >
              <ts-icon name="image" [size]="13" />
              <span>Image Simulator</span>
            </button>
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'palette'"
              (click)="activeTab.set('palette')"
            >
              <ts-icon name="sliders-horizontal" [size]="13" />
              <span>Palette Audit</span>
              @if (simulationResult().riskCount > 0) {
                <span class="risk-badge">{{ simulationResult().riskCount }}</span>
              }
            </button>
          </div>
        </div>
      </header>

      <!-- 5-Second Error Notification Banner -->
      @if (errorMessage()) {
        <div class="error-alert-banner">
          <ts-icon name="alert-circle" [size]="16" />
          <span class="error-msg">{{ errorMessage() }}</span>
          <button type="button" class="dismiss-alert-btn" (click)="setErrorMessage(null)" title="Dismiss">
            <ts-icon name="x" [size]="14" />
          </button>
        </div>
      }

      <!-- ══════════════════════════════════════════════════════════════════════
           TAB 1: IMAGE VISION SIMULATOR
           ══════════════════════════════════════════════════════════════════════ -->
      @if (activeTab() === 'image') {

        <!-- Deficiency Selector (Visible when image is loaded or in stage) -->
        <div class="deficiency-selector-card" [class.compact-mode]="!currentImageName()">
          <!-- Desktop & Tablet Chips Row -->
          <div class="deficiency-chips-row hide-on-mobile">
            <span class="chips-label">Deficiency:</span>

            <!-- Main 5 Conditions -->
            @for (profile of primaryProfiles(); track profile.type) {
              <button
                type="button"
                class="deficiency-chip"
                [class.active]="selectedType() === profile.type"
                (click)="onTypeSelect(profile.type)"
                [title]="profile.title + ': ' + profile.description"
              >
                <span class="chip-title">{{ profile.title }}</span>
                <span class="chip-sub">{{ profile.subtitle }}</span>
              </button>
            }

            <!-- Expandable +4 Anomalous Toggle Button -->
            <button
              type="button"
              class="anomalous-toggle-chip"
              [class.active]="showAnomalous()"
              (click)="showAnomalous.update(v => !v)"
              title="Toggle anomalous trichromacy conditions"
            >
              <span>{{ showAnomalous() ? 'Hide Anomalous (-4)' : '+4 Anomalous Shifts' }}</span>
              <ts-icon [name]="showAnomalous() ? 'chevron-up' : 'chevron-down'" [size]="12" />
            </button>
          </div>

          <!-- Anomalous Conditions Row (Collapsible on Desktop) -->
          @if (showAnomalous()) {
            <div class="anomalous-chips-row hide-on-mobile">
              @for (profile of anomalousProfiles(); track profile.type) {
                <button
                  type="button"
                  class="deficiency-chip anomalous-chip"
                  [class.active]="selectedType() === profile.type"
                  (click)="onTypeSelect(profile.type)"
                  [title]="profile.title + ': ' + profile.description"
                >
                  <span class="chip-title">{{ profile.title }}</span>
                  <span class="chip-sub">{{ profile.subtitle }}</span>
                </button>
              }
            </div>
          }

          <!-- Mobile Deficiency Selector Trigger & Bottom Sheet (max-width: 639px) -->
          <div class="mobile-deficiency-wrap show-on-mobile">
            <button
              type="button"
              class="mobile-deficiency-trigger"
              (click)="showMobileDeficiencySheet.set(!showMobileDeficiencySheet())"
              aria-label="Select vision deficiency"
            >
              <div class="trigger-meta">
                <span class="trigger-label">Vision Condition</span>
                <span class="trigger-title">{{ activeProfile().title }} • {{ activeProfile().subtitle }}</span>
              </div>
              <ts-icon [name]="showMobileDeficiencySheet() ? 'chevron-up' : 'chevron-down'" [size]="16" class="trigger-chevron" />
            </button>

            @if (showMobileDeficiencySheet()) {
              <div class="mobile-sheet-backdrop" (click)="showMobileDeficiencySheet.set(false)" aria-hidden="true"></div>
              <div class="mobile-deficiency-sheet slide-fade-up" role="dialog" aria-label="Select Color Vision Condition">
                <div class="sheet-head">
                  <span class="sheet-heading">Select Vision Condition</span>
                  <button type="button" class="sheet-close-btn" (click)="showMobileDeficiencySheet.set(false)" aria-label="Close">
                    <ts-icon name="x" [size]="16" />
                  </button>
                </div>

                <div class="sheet-scroll-content">
                  <!-- Group 1: Common / Standard -->
                  <div class="sheet-group-label">Standard & Dichromacy (Common)</div>
                  <div class="sheet-options-grid">
                    @for (profile of primaryProfiles(); track profile.type) {
                      <button
                        type="button"
                        class="sheet-option-row"
                        [class.active]="selectedType() === profile.type"
                        (click)="onTypeSelect(profile.type); showMobileDeficiencySheet.set(false)"
                      >
                        <div class="option-text-col">
                          <span class="opt-title">{{ profile.title }}</span>
                          <span class="opt-sub">{{ profile.subtitle }}</span>
                        </div>
                        @if (selectedType() === profile.type) {
                          <ts-icon name="check" [size]="16" class="opt-check" />
                        }
                      </button>
                    }
                  </div>

                  <!-- Group 2: Anomalous Trichromacy -->
                  <div class="sheet-group-label">Anomalous Trichromacy (Shifted Cones)</div>
                  <div class="sheet-options-grid">
                    @for (profile of anomalousProfiles(); track profile.type) {
                      <button
                        type="button"
                        class="sheet-option-row anomalous"
                        [class.active]="selectedType() === profile.type"
                        (click)="onTypeSelect(profile.type); showMobileDeficiencySheet.set(false)"
                      >
                        <div class="option-text-col">
                          <span class="opt-title">{{ profile.title }}</span>
                          <span class="opt-sub">{{ profile.subtitle }}</span>
                        </div>
                        @if (selectedType() === profile.type) {
                          <ts-icon name="check" [size]="16" class="opt-check" />
                        }
                      </button>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- ══════════════════════════════════════════════════════════════════════
             STAGE AREA: Clean Empty Upload State vs Active Image Workspace
             ══════════════════════════════════════════════════════════════════════ -->
        <div class="simulator-stage-card">

          <!-- Hidden File Input for Image Selection / Replacement -->
          <input
            #fileInput
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            class="hidden-file-input"
            (click)="fileInput.value = ''"
            (change)="onFileSelected($event)"
          />

          <!-- ── STATE A: Clean Empty Upload State (Visible when no image loaded) ── -->
          @if (!currentImageName()) {
            <div
              class="empty-upload-card"
              [class.dragover]="isDraggingOver()"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onDrop($event)"
              (click)="fileInput.click()"
              role="button"
              tabindex="0"
              (keydown.enter)="fileInput.click()"
              (keydown.space)="fileInput.click()"
            >
              <div class="dropzone-content">
                <div class="upload-icon-circle">
                  <ts-icon name="upload-cloud" [size]="36" />
                </div>
                <h3 class="upload-main-title">Upload an image to get started</h3>
                <p class="upload-instruction">
                  Choose an image to see how its colors appear under different types of color vision.
                </p>

                <button
                  type="button"
                  class="upload-primary-btn"
                  (click)="$event.stopPropagation(); fileInput.click()"
                >
                  <ts-icon name="upload-cloud" [size]="15" />
                  <span>Upload Image</span>
                </button>

                <div class="upload-specs-pill">
                  <span>PNG, JPG, JPEG, and WebP • Up to 25 MB</span>
                </div>
              </div>
            </div>
          }

          <!-- ── STATE B: Active Image Simulation Workspace ── -->
          <div class="active-workspace-wrapper" [class.hidden-state]="!currentImageName()">

            <!-- Single Compact Toolbar -->
            <div class="compact-toolbar">
              <!-- Left: Replace Image & File Meta -->
              <div class="tb-group-left">
                <button
                  type="button"
                  class="tb-btn tb-replace-btn"
                  (click)="fileInput.click()"
                  title="Replace current image"
                >
                  <ts-icon name="upload-cloud" [size]="13" />
                  <span>Replace Image</span>
                </button>

                @if (currentImageName()) {
                  <div class="file-meta-pill" [title]="currentImageName()!">
                    <span class="file-name">{{ currentImageName() }}</span>
                    @if (imageDimensions()) {
                      <span class="meta-sep">•</span>
                      <span class="file-dims">{{ imageDimensions()?.width }}×{{ imageDimensions()?.height }}</span>
                    }
                    @if (imageFileSize()) {
                      <span class="meta-sep">•</span>
                      <span class="file-size">{{ imageFileSize() }}</span>
                    }
                  </div>
                }
              </div>

              <!-- Center: Mode Switcher & Zoom Controls -->
              <div class="tb-group-center">
                <!-- Comparison Mode Switcher -->
                <div class="segmented-modes" role="group" aria-label="Comparison mode" data-no-swipe>
                  <button
                    type="button"
                    class="segment-mode-btn"
                    [class.active]="viewMode() === 'split-slider'"
                    (click)="setViewMode('split-slider')"
                    title="Interactive Split Slider (Original vs Simulation)"
                  >
                    <ts-icon name="sliders-horizontal" [size]="13" />
                    <span>Split View</span>
                  </button>

                  <button
                    type="button"
                    class="segment-mode-btn"
                    [class.active]="viewMode() === 'side-by-side'"
                    (click)="setViewMode('side-by-side')"
                    title="Side-by-Side Synchronized View"
                  >
                    <ts-icon name="git-compare" [size]="13" />
                    <span>Side-by-Side</span>
                  </button>

                  <button
                    type="button"
                    class="segment-mode-btn"
                    [class.active]="viewMode() === 'simulated-only'"
                    (click)="setViewMode('simulated-only')"
                    title="Full Simulation View"
                  >
                    <ts-icon name="scan-eye" [size]="13" />
                    <span>Simulated Only</span>
                  </button>
                </div>

                <div class="tb-divider"></div>

                <!-- Zoom Controls -->
                <div class="zoom-controls" role="group" aria-label="Zoom controls">
                  <button
                    type="button"
                    class="zoom-action-btn"
                    (click)="zoomOut()"
                    title="Zoom Out (-25%)"
                    [disabled]="zoomLevel() <= 0.25"
                  >
                    <ts-icon name="zoom-out" [size]="13" />
                  </button>

                  <span class="zoom-percent-pill font-mono">{{ zoomPercent() }}%</span>

                  <button
                    type="button"
                    class="zoom-action-btn"
                    (click)="zoomIn()"
                    title="Zoom In (+25%)"
                    [disabled]="zoomLevel() >= 5"
                  >
                    <ts-icon name="zoom-in" [size]="13" />
                  </button>

                  <button
                    type="button"
                    class="zoom-action-btn"
                    (click)="fitToScreen()"
                    title="Fit to Screen"
                  >
                    <ts-icon name="maximize-2" [size]="12" />
                  </button>

                  <button
                    type="button"
                    class="zoom-action-btn"
                    (click)="resetZoom()"
                    title="Reset Zoom (100%)"
                  >
                    <ts-icon name="rotate-ccw" [size]="12" />
                  </button>
                </div>
              </div>

              <!-- Right: Inspector, Export Dropdown, Clear -->
              <div class="tb-group-right">
                <!-- Inspector Toggle -->
                <button
                  type="button"
                  class="tb-btn tb-inspector-btn"
                  [class.active]="isInspectorActive()"
                  (click)="toggleInspector()"
                  title="Toggle Color Inspector (Inspect pixels for original vs simulated HEX/RGB and Delta-E)"
                >
                  <ts-icon name="search-code" [size]="13" />
                  <span>Inspector</span>
                </button>

                <!-- Export Menu Trigger -->
                <div class="export-menu-wrapper">
                  <button
                    type="button"
                    class="tb-btn tb-export-btn"
                    [class.active]="showExportMenu()"
                    (click)="toggleExportMenu($event)"
                    title="Export simulation visuals"
                  >
                    <ts-icon name="download-cloud" [size]="13" />
                    <span>Export</span>
                    <ts-icon name="chevron-down" [size]="11" />
                  </button>

                  @if (showExportMenu()) {
                    <div class="export-backdrop" (click)="showExportMenu.set(false)"></div>
                    <div class="export-popover-menu" (click)="$event.stopPropagation()">
                      <div class="popover-heading">Export ({{ activeProfile().title }})</div>
                      <button type="button" class="popover-item" (click)="downloadSimulatedImage('image/png')">
                        <ts-icon name="download-cloud" [size]="13" />
                        <span>Simulated PNG</span>
                      </button>
                      <button type="button" class="popover-item" (click)="downloadSimulatedImage('image/jpeg')">
                        <ts-icon name="download-cloud" [size]="13" />
                        <span>Simulated JPEG</span>
                      </button>
                      <button type="button" class="popover-item" (click)="downloadSplitSnapshot()">
                        <ts-icon name="sliders-horizontal" [size]="13" />
                        <span>Split Comparison Snapshot</span>
                      </button>
                      <button type="button" class="popover-item" (click)="downloadComparisonSnapshot()">
                        <ts-icon name="git-compare" [size]="13" />
                        <span>Side-by-Side Comparison</span>
                      </button>
                      <div class="popover-sep"></div>
                      <button type="button" class="popover-item" (click)="downloadOriginalImage()">
                        <ts-icon name="file-code" [size]="13" />
                        <span>Original Image (PNG)</span>
                      </button>
                    </div>
                  }
                </div>

                <!-- Remove Image -->
                <button
                  type="button"
                  class="tb-btn tb-danger-btn"
                  (click)="clearImage()"
                  title="Remove image and return to upload"
                >
                  <ts-icon name="trash-2" [size]="13" />
                </button>
              </div>
            </div>

            <!-- Canvas Viewport with Drag, Pan & Wheel Zoom -->
            <div
              #viewportRef
              class="viewport-canvas-container"
              [class.panning]="zoomLevel() > 1"
              [class.inspecting]="isInspectorActive()"
              (wheel)="onWheel($event)"
              (mousedown)="onViewportMouseDown($event)"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onDrop($event)"
            >
              <!-- Drag overlay when hovering files -->
              @if (isDraggingOver()) {
                <div class="drag-hover-overlay">
                  <ts-icon name="upload-cloud" [size]="48" />
                  <span class="overlay-title">Drop new image to replace</span>
                  <span class="overlay-sub">PNG, JPG, JPEG, WebP</span>
                </div>
              }

              <!-- Scaled & Panned Transform Layer -->
              <div
                class="canvas-transform-layer"
                [style.transform]="'translate(' + panX() + 'px, ' + panY() + 'px) scale(' + zoomLevel() + ')'"
              >
                <!-- Checkerboard Transparency Background -->
                <div class="transparency-backdrop"></div>

                <!-- 1. Split View Mode -->
                @if (viewMode() === 'split-slider') {
                  <div
                    class="split-canvas-wrapper"
                    (mousedown)="startSliderDrag($event)"
                    (touchstart)="startSliderDrag($event)"
                  >
                    <canvas
                      #displayCanvas
                      class="rendered-canvas"
                      (mousemove)="onCanvasMouseMove($event, displayCanvas)"
                      (mouseleave)="onCanvasMouseLeave()"
                    ></canvas>

                    <!-- Split Interactive HUD Handle -->
                    <div class="split-hud-bar" (mousedown)="$event.stopPropagation()">
                      <span class="hud-label">Normal {{ Math.round(splitRatio() * 100) }}%</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        [value]="Math.round(splitRatio() * 100)"
                        (input)="onSplitSliderInput($event)"
                        class="hud-slider-input"
                        aria-label="Split comparison ratio"
                      />
                      <span class="hud-label">{{ activeProfile().title }} {{ 100 - Math.round(splitRatio() * 100) }}%</span>
                    </div>
                  </div>
                }

                <!-- 2. Side-by-Side Mode -->
                @if (viewMode() === 'side-by-side') {
                  <div class="side-by-side-canvas-row">
                    <div class="side-col">
                      <div class="side-col-header">Original Vision (Trichromacy)</div>
                      <canvas
                        #sideOriginalCanvas
                        class="rendered-canvas"
                        (mousemove)="onCanvasMouseMove($event, sideOriginalCanvas)"
                        (mouseleave)="onCanvasMouseLeave()"
                      ></canvas>
                    </div>

                    <div class="side-col">
                      <div class="side-col-header header-simulated">{{ activeProfile().title }} Simulation</div>
                      <canvas
                        #sideSimulatedCanvas
                        class="rendered-canvas"
                        (mousemove)="onCanvasMouseMove($event, sideSimulatedCanvas)"
                        (mouseleave)="onCanvasMouseLeave()"
                      ></canvas>
                    </div>
                  </div>
                }

                <!-- 3. Simulated Only Mode -->
                @if (viewMode() === 'simulated-only') {
                  <div class="single-simulated-wrapper">
                    <canvas
                      #displayCanvas
                      class="rendered-canvas"
                      (mousemove)="onCanvasMouseMove($event, displayCanvas)"
                      (mouseleave)="onCanvasMouseLeave()"
                    ></canvas>

                    <!-- Hold to View Original Button -->
                    <div class="peek-original-hud" (mousedown)="$event.stopPropagation()" (touchstart)="$event.stopPropagation()">
                      <button
                        type="button"
                        class="peek-btn"
                        [class.active]="isPeekingOriginal()"
                        (mousedown)="startPeekingOriginal()"
                        (mouseup)="stopPeekingOriginal()"
                        (mouseleave)="stopPeekingOriginal()"
                        (touchstart)="startPeekingOriginal()"
                        (touchend)="stopPeekingOriginal()"
                        (touchcancel)="stopPeekingOriginal()"
                        style="color: #FFFFFF !important;"
                      >
                        <ts-icon name="scan-eye" [size]="14" style="color: #FFFFFF !important;" />
                        <span style="color: #FFFFFF !important;">{{ isPeekingOriginal() ? 'Showing Original' : 'Hold to View Original' }}</span>
                      </button>
                    </div>
                  </div>
                }

              </div>

              <!-- Pixel Inspector Floating Loupe (Desktop) / Docked Sheet (Mobile) -->
              @if (isInspectorActive() && hoverPixelData(); as p) {
                <div
                  class="inspector-loupe-tooltip"
                  [style.left.px]="p.screenX + 16"
                  [style.top.px]="p.screenY - 80"
                >
                  <div class="inspector-card-header show-on-mobile">
                    <span class="inspector-mobile-title">Sampled Pixel Details</span>
                    <button type="button" class="inspector-close-btn" (click)="hoverPixelData.set(null)" aria-label="Dismiss inspector card">
                      <ts-icon name="x" [size]="14" />
                    </button>
                  </div>

                  <div class="loupe-colors-row">
                    <div class="color-preview-block">
                      <span class="preview-swatch" [style.background-color]="p.origHex"></span>
                      <div class="preview-meta">
                        <span class="tag">Original</span>
                        <span class="hex font-mono">{{ p.origHex }}</span>
                        <span class="rgb font-mono">{{ p.origRgb }}</span>
                      </div>
                    </div>

                    <div class="color-arrow">
                      <ts-icon name="arrow-right" [size]="12" />
                    </div>

                    <div class="color-preview-block">
                      <span class="preview-swatch" [style.background-color]="p.simHex"></span>
                      <div class="preview-meta">
                        <span class="tag simulated">{{ activeProfile().title }}</span>
                        <span class="hex font-mono">{{ p.simHex }}</span>
                        <span class="rgb font-mono">{{ p.simRgb }}</span>
                      </div>
                    </div>
                  </div>

                  <div class="loupe-delta-row">
                    <span class="delta-label">Color Shift (CIE76 ΔE):</span>
                    <span class="delta-val font-mono" [class.high-shift]="p.deltaE > 15">{{ p.deltaE }}</span>
                  </div>
                </div>
              }
            </div>

            <!-- Compact Accessibility Analysis Callout Bar -->
            @if (imageInsights(); as insights) {
              <div class="accessibility-insights-bar">
                <div class="insights-summary">
                  @if (insights.riskCount > 0) {
                    <ts-icon name="alert-triangle" [size]="15" class="icon-warning" />
                    <span class="insights-text">
                      <strong>{{ insights.riskCount }} Similar Color {{ insights.riskCount === 1 ? 'Pair' : 'Pairs' }} Detected under {{ activeProfile().title }}.</strong>
                      People with this condition may struggle to tell these elements apart. Suggestion: Add icons, secondary text, or patterns.
                    </span>
                  } @else {
                    <ts-icon name="check-circle" [size]="15" class="icon-success" />
                    <span class="insights-text">
                      <strong>Good Contrast:</strong> Sampled image colors maintain distinct separation under {{ activeProfile().title }}.
                    </span>
                  }
                </div>

                @if (insights.confusionPairs.length > 0) {
                  <div class="confusable-swatches-row">
                    @for (pair of insights.confusionPairs.slice(0, 3); track pair.color1 + pair.color2) {
                      <div class="confusable-mini-pair" [title]="'Simulated difference: ΔE ' + pair.simulatedDeltaE">
                        <span class="swatch-mini" [style.background-color]="pair.color1"></span>
                        <span class="swatch-mini" [style.background-color]="pair.color2"></span>
                        <span class="pair-hex font-mono">{{ pair.color1 }}↔{{ pair.color2 }}</span>
                      </div>
                    }
                  </div>
                }
              </div>
            }

          </div>
        </div>
      }

      <!-- ══════════════════════════════════════════════════════════════════════
           TAB 2: PALETTE SIMULATION & PERCEPTUAL CONFUSION AUDIT
           ══════════════════════════════════════════════════════════════════════ -->
      @if (activeTab() === 'palette') {
        <div class="palette-studio-card">

          <!-- Palette Action Header -->
          <div class="palette-header-row">
            <div class="palette-intro">
              <h3 class="card-title">Color Palette Accessibility Audit</h3>
              <p class="card-subtitle">
                Evaluate how each swatch in your palette transforms and detect colors that become difficult to distinguish under {{ activeProfile().title }}.
              </p>
            </div>

            <div class="palette-actions">
              <button
                type="button"
                class="palette-btn"
                (click)="importFromActiveColor()"
                title="Add current active color to palette"
              >
                <ts-icon name="plus" [size]="13" />
                <span>Add Active ({{ state.activeColor() }})</span>
              </button>

              <button
                type="button"
                class="palette-btn"
                (click)="importSharedPalette()"
                title="Reload studio shared palette"
              >
                <ts-icon name="refresh-cw" [size]="13" />
                <span>Reset to Shared Palette</span>
              </button>

              <button
                type="button"
                class="palette-btn palette-btn-accent"
                (click)="exportPaletteJson()"
              >
                <ts-icon name="download-cloud" [size]="13" />
                <span>Export JSON</span>
              </button>

              <button
                type="button"
                class="palette-btn"
                (click)="exportReportMarkdown()"
              >
                <ts-icon name="file-text" [size]="13" />
                <span>Export Report (.md)</span>
              </button>
            </div>
          </div>

          <!-- Indistinguishable Colors Conflict Alert Banner -->
          @if (simulationResult().riskCount > 0) {
            <div class="conflict-alert-card">
              <div class="conflict-icon">
                <ts-icon name="alert-triangle" [size]="20" />
              </div>
              <div class="conflict-content">
                <h4 class="conflict-title">
                  {{ simulationResult().riskCount }} Similar Color {{ simulationResult().riskCount === 1 ? 'Pair' : 'Pairs' }} Detected under {{ activeProfile().title }}
                </h4>
                <p class="conflict-desc">
                  People with {{ activeProfile().title }} may struggle to tell these color pairs apart.
                </p>

                <div class="confusion-pairs-list">
                  @for (pair of simulationResult().confusionPairs; track pair.color1 + pair.color2) {
                    <div class="confusion-pair-pill" [class.pair-severe]="pair.severity === 'severe'">
                      <div class="pair-swatches">
                        <span class="swatch-mini" [style.background-color]="pair.color1"></span>
                        <span class="swatch-mini" [style.background-color]="pair.color2"></span>
                      </div>
                      <span class="pair-hexes font-mono">{{ pair.color1 }} ↔ {{ pair.color2 }}</span>
                      <span class="pair-delta">Difference: {{ pair.simulatedDeltaE }}</span>
                      <span class="pair-severity-tag">{{ pair.severity === 'severe' ? 'Hard to distinguish' : 'Low separation' }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>
          } @else {
            <div class="healthy-audit-card">
              <ts-icon name="check-circle" [size]="18" />
              <span>All {{ simulationResult().items.length }} palette colors maintain clear distinction under {{ activeProfile().title }}.</span>
            </div>
          }

          <!-- Palette Swatches Comparison Grid -->
          <div class="swatches-audit-grid">
            @for (item of simulationResult().items; track item.id) {
              <div class="swatch-audit-card" [class.has-conflict]="item.hasConflict">
                <div class="split-color-bar">
                  <div
                    class="bar-half original-half"
                    [style.background-color]="item.originalHex"
                    [title]="'Original: ' + item.originalHex"
                  >
                    <span class="bar-label" [style.color]="isDarkColor(item.originalHex) ? '#FFFFFF' : '#0F172A'">Original</span>
                  </div>

                  <div
                    class="bar-half simulated-half"
                    [style.background-color]="item.simulatedHex"
                    [title]="'Simulated: ' + item.simulatedHex"
                  >
                    <span class="bar-label" [style.color]="isDarkColor(item.simulatedHex) ? '#FFFFFF' : '#0F172A'">Simulated</span>
                  </div>
                </div>

                <div class="swatch-details">
                  <div class="hex-row">
                    <span class="hex-badge font-mono">{{ item.originalHex }}</span>
                    <ts-icon name="arrow-right" [size]="12" class="arrow-icon" />
                    <span class="hex-badge simulated font-mono">{{ item.simulatedHex }}</span>
                  </div>

                  @if (item.hasConflict) {
                    <div class="conflict-warning-tag">
                      <ts-icon name="alert-triangle" [size]="12" />
                      <span>Confusable with {{ item.conflictsWith?.join(', ') }}</span>
                    </div>
                  }

                  <div class="swatch-card-actions">
                    <button
                      type="button"
                      class="mini-action-btn"
                      (click)="copySimulatedHex(item.simulatedHex)"
                      title="Copy Simulated HEX"
                    >
                      <ts-icon name="copy" [size]="12" />
                      <span>Copy</span>
                    </button>
                    <button
                      type="button"
                      class="mini-action-btn"
                      (click)="setAsActiveColor(item.simulatedHex)"
                      title="Use in Studio"
                    >
                      <ts-icon name="crosshair" [size]="12" />
                      <span>Select</span>
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Bottom Palette Transfer Actions -->
          <div class="palette-bottom-actions">
            <button
              type="button"
              class="palette-dispatch-btn"
              (click)="sendSimulatedPaletteToSharedBar()"
            >
              <ts-icon name="arrow-right" [size]="14" />
              <span>Send Simulated Palette to Shared Bar</span>
            </button>
            <button
              type="button"
              class="palette-dispatch-btn"
              (click)="sendSimulatedPaletteToGenerator()"
            >
              <ts-icon name="sliders-horizontal" [size]="14" />
              <span>Send Simulated Palette to Theme Generator</span>
            </button>
          </div>

        </div>
      }

    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .simulator-layout {
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 1rem 1rem;
      gap: 0.625rem;
      box-sizing: border-box;
    }

    @media (min-width: 1024px) {
      .simulator-layout {
        height: calc(100vh - 85px);
        max-height: calc(100vh - 85px);
        overflow: hidden;
      }
    }

    /* ── Workspace Header ─────────────────────────────────────────────────── */
    .workspace-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.25rem 0;
      flex-shrink: 0;
    }

    .header-titles {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .title-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .workspace-title {
      font-size: 1.375rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--text, #F4F4F5);
      margin: 0;
      line-height: 1.2;
    }

    :host-context([data-theme="light"]) .workspace-title {
      color: #0F172A;
    }

    .category-pill {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      background: rgba(37, 99, 235, 0.15);
      color: #60A5FA;
      border: 1px solid rgba(37, 99, 235, 0.3);
    }

    :host-context([data-theme="light"]) .category-pill {
      background: rgba(37, 99, 235, 0.1);
      color: #2563EB;
      border-color: rgba(37, 99, 235, 0.25);
    }

    .category-pill.anomalous {
      background: rgba(245, 158, 11, 0.15);
      color: #FBBF24;
      border-color: rgba(245, 158, 11, 0.3);
    }

    :host-context([data-theme="light"]) .category-pill.anomalous {
      background: rgba(245, 158, 11, 0.1);
      color: #D97706;
      border-color: rgba(245, 158, 11, 0.25);
    }

    .workspace-subtitle {
      font-size: 0.8125rem;
      color: var(--text-2, #A1A1AA);
      margin: 0;
      line-height: 1.3;
    }

    :host-context([data-theme="light"]) .workspace-subtitle {
      color: #64748B;
    }

    .tab-toggle-group {
      display: inline-flex;
      align-items: center;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 0.5rem;
      padding: 0.2rem;
      gap: 0.25rem;
    }

    :host-context([data-theme="light"]) .tab-toggle-group {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.08);
    }

    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.7rem;
      font-size: 0.775rem;
      font-weight: 500;
      color: var(--text-2, #A1A1AA);
      border: none;
      background: transparent;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="light"]) .tab-btn {
      color: #64748B;
    }

    .tab-btn:hover {
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .tab-btn:hover {
      color: #0F172A;
    }

    .tab-btn.active {
      background: var(--bg-1, #18181B);
      color: var(--text, #F4F4F5);
      font-weight: 600;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }

    :host-context([data-theme="light"]) .tab-btn.active {
      background: #FFFFFF;
      color: #0F172A;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .risk-badge {
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 0.1rem 0.4rem;
      border-radius: 9999px;
      background: #EF4444;
      color: #FFFFFF;
      line-height: 1;
    }

    /* ── Error Banner ──────────────────────────────────────────────────────── */
    .error-alert-banner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border-radius: 0.5rem;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.25);
      color: #F87171;
      font-size: 0.8125rem;
      font-weight: 500;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .error-alert-banner {
      background: #FEF2F2;
      border-color: #FECACA;
      color: #DC2626;
    }

    .dismiss-alert-btn {
      margin-left: auto;
      border: none;
      background: transparent;
      color: inherit;
      cursor: pointer;
      display: flex;
      padding: 0.2rem;
      border-radius: 0.25rem;
    }

    /* ── Deficiency Selector Card ─────────────────────────────────────────── */
    .deficiency-selector-card {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      padding: 0.45rem 0.75rem;
      background: var(--bg-1, #18181B);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 0.75rem;
      flex-shrink: 0;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }

    :host-context([data-theme="light"]) .deficiency-selector-card {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.08);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    }

    .deficiency-chips-row,
    .anomalous-chips-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .chips-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-2, #A1A1AA);
      margin-right: 0.25rem;
    }

    :host-context([data-theme="light"]) .chips-label {
      color: #64748B;
    }

    .deficiency-chip {
      display: inline-flex;
      flex-direction: column;
      align-items: flex-start;
      padding: 0.3rem 0.65rem;
      border-radius: 0.5rem;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text, #F4F4F5);
      cursor: pointer;
      transition: all 180ms cubic-bezier(0.16, 1, 0.3, 1);
      text-align: left;
    }

    :host-context([data-theme="light"]) .deficiency-chip {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.08);
      color: #0F172A;
    }

    .deficiency-chip:hover {
      border-color: var(--tool-accent, #2563EB);
      background: var(--bg-1, #18181B);
      transform: translateY(-1px);
    }

    .deficiency-chip:active {
      transform: translateY(0) scale(0.97);
    }

    :host-context([data-theme="light"]) .deficiency-chip:hover {
      background: #FFFFFF;
    }

    .deficiency-chip.active {
      background: var(--tool-accent, #2563EB) !important;
      border-color: var(--tool-accent, #2563EB) !important;
      color: #FFFFFF !important;
      box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
      transform: scale(1.02);
    }

    .chip-title {
      font-size: 0.775rem;
      font-weight: 600;
      line-height: 1.1;
    }

    .chip-sub {
      font-size: 0.65rem;
      opacity: 0.75;
      line-height: 1.1;
      margin-top: 0.1rem;
    }

    .anomalous-toggle-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.4rem 0.65rem;
      border-radius: 0.5rem;
      background: transparent;
      border: 1px dashed var(--border, rgba(255, 255, 255, 0.2));
      color: var(--text-2, #A1A1AA);
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 180ms cubic-bezier(0.16, 1, 0.3, 1);
      margin-left: auto;
    }

    :host-context([data-theme="light"]) .anomalous-toggle-chip {
      border-color: rgba(0, 0, 0, 0.2);
      color: #64748B;
    }

    .anomalous-toggle-chip:hover {
      color: #60A5FA;
      border-color: #2563EB;
      transform: translateY(-1px);
      background: rgba(37, 99, 235, 0.1);
    }

    .anomalous-toggle-chip:active {
      transform: translateY(0) scale(0.97);
    }

    :host-context([data-theme="light"]) .anomalous-toggle-chip:hover {
      color: #2563EB;
      background: rgba(37, 99, 235, 0.05);
    }

    .anomalous-toggle-chip.active {
      color: #60A5FA;
      border-color: #2563EB;
      background: rgba(37, 99, 235, 0.15);
    }

    :host-context([data-theme="light"]) .anomalous-toggle-chip.active {
      color: #2563EB;
      background: rgba(37, 99, 235, 0.1);
    }

    .anomalous-chip {
      background: rgba(245, 158, 11, 0.08);
      border-color: rgba(245, 158, 11, 0.25);
    }

    .anomalous-chip:hover {
      border-color: #D97706;
      background: rgba(245, 158, 11, 0.15);
    }

    .anomalous-chip.active {
      background: #D97706 !important;
      border-color: #D97706 !important;
      color: #FFFFFF !important;
    }

    /* ── Stage Card & Layout ──────────────────────────────────────────────── */
    .simulator-stage-card {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      background: var(--bg-1, #18181B);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 0.75rem;
      overflow: hidden;
      position: relative;
    }

    :host-context([data-theme="light"]) .simulator-stage-card {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.08);
    }

    .hidden-file-input {
      display: none;
    }

    /* ── Empty Upload State ───────────────────────────────────────────────── */
    .empty-upload-card {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      min-height: 380px;
      padding: 2.5rem 1.5rem;
      background: #090D16;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    :host-context([data-theme="light"]) .empty-upload-card {
      background: #F8FAFC;
    }

    .empty-upload-card.dragover {
      background: rgba(37, 99, 235, 0.1);
      outline: 2px dashed #2563EB;
      outline-offset: -8px;
    }

    .dropzone-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      max-width: 440px;
      padding: 2.5rem 2rem;
      border: 2px dashed var(--border, rgba(255, 255, 255, 0.15));
      border-radius: 1rem;
      background: var(--bg-1, #18181B);
      transition: border-color 0.2s ease, transform 0.2s ease;
    }

    :host-context([data-theme="light"]) .dropzone-content {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.12);
    }

    .dropzone-content:hover {
      border-color: #2563EB;
      transform: translateY(-1px);
    }

    .upload-icon-circle {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(37, 99, 235, 0.15);
      color: #60A5FA;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.25rem;
    }

    :host-context([data-theme="light"]) .upload-icon-circle {
      background: rgba(37, 99, 235, 0.1);
      color: #2563EB;
    }

    .upload-main-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 0 0 0.5rem;
      line-height: 1.3;
    }

    :host-context([data-theme="light"]) .upload-main-title {
      color: #0F172A;
    }

    .upload-instruction {
      font-size: 0.835rem;
      color: var(--text-2, #A1A1AA);
      margin: 0 0 1.25rem;
      line-height: 1.45;
    }

    :host-context([data-theme="light"]) .upload-instruction {
      color: #64748B;
    }

    .upload-primary-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 1.4rem;
      border-radius: 0.5rem;
      background: #2563EB;
      color: #FFFFFF;
      font-size: 0.875rem;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: background 0.15s ease, transform 0.1s ease;
      box-shadow: 0 2px 4px rgba(37, 99, 235, 0.25);
    }

    .upload-primary-btn:hover {
      background: #1D4ED8;
      transform: translateY(-1px);
    }

    .upload-specs-pill {
      margin-top: 1rem;
      font-size: 0.75rem;
      color: var(--text-2, #A1A1AA);
      font-weight: 500;
    }

    :host-context([data-theme="light"]) .upload-specs-pill {
      color: #94A3B8;
    }

    /* ── Active Workspace ─────────────────────────────────────────────────── */
    .active-workspace-wrapper {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      position: relative;
    }

    .hidden-state {
      display: none !important;
    }

    /* ── Compact Toolbar ──────────────────────────────────────────────────── */
    .compact-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.35rem 0.75rem;
      background: var(--bg-1, #18181B);
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      flex-shrink: 0;
      min-height: 40px;
      position: relative;
      z-index: 50;
      overflow: visible;
    }

    :host-context([data-theme="light"]) .compact-toolbar {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.08);
    }

    .tb-group-left,
    .tb-group-center,
    .tb-group-right {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex-shrink: 0;
    }

    .tb-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.3rem 0.6rem;
      border-radius: 0.4rem;
      font-size: 0.775rem;
      font-weight: 500;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text, #F4F4F5);
      cursor: pointer;
      transition: all 0.15s ease;
      line-height: 1.2;
      white-space: nowrap;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .tb-btn {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.08);
      color: #0F172A;
    }

    .tb-btn:hover {
      background: var(--bg-1, #18181B);
      border-color: #2563EB;
      color: #60A5FA;
    }

    :host-context([data-theme="light"]) .tb-btn:hover {
      background: #FFFFFF;
      color: #2563EB;
    }

    .tb-btn.active {
      background: rgba(37, 99, 235, 0.2);
      border-color: #2563EB;
      color: #60A5FA;
      font-weight: 600;
    }

    :host-context([data-theme="light"]) .tb-btn.active {
      background: rgba(37, 99, 235, 0.1);
      color: #2563EB;
    }

    .tb-replace-btn {
      font-weight: 600;
      color: #60A5FA;
      background: rgba(37, 99, 235, 0.12);
      border-color: rgba(37, 99, 235, 0.25);
      white-space: nowrap;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .tb-replace-btn {
      color: #2563EB;
      background: rgba(37, 99, 235, 0.08);
      border-color: rgba(37, 99, 235, 0.2);
    }

    .tb-replace-btn:hover {
      background: rgba(37, 99, 235, 0.2);
    }

    .file-meta-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.375rem;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      font-size: 0.725rem;
      color: var(--text-2, #A1A1AA);
      white-space: nowrap;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .file-meta-pill {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.08);
      color: #64748B;
    }

    .file-name {
      font-weight: 600;
      color: var(--text, #F4F4F5);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 140px;
    }

    :host-context([data-theme="light"]) .file-name {
      color: #0F172A;
    }

    .file-dims,
    .file-size {
      white-space: nowrap;
    }

    .meta-sep {
      opacity: 0.4;
    }

    .segmented-modes {
      display: inline-flex;
      align-items: center;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 0.4rem;
      padding: 0.15rem;
      gap: 0.15rem;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .segmented-modes {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.08);
    }

    .segment-mode-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.25rem 0.55rem;
      border-radius: 0.3rem;
      font-size: 0.75rem;
      font-weight: 500;
      border: none;
      background: transparent;
      color: var(--text-2, #A1A1AA);
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .segment-mode-btn {
      color: #64748B;
    }

    .segment-mode-btn:hover {
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .segment-mode-btn:hover {
      color: #0F172A;
    }

    .segment-mode-btn.active {
      background: var(--bg-1, #18181B);
      color: var(--text, #F4F4F5);
      font-weight: 600;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }

    :host-context([data-theme="light"]) .segment-mode-btn.active {
      background: #FFFFFF;
      color: #0F172A;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .tb-divider {
      width: 1px;
      height: 18px;
      background: var(--border, rgba(255, 255, 255, 0.1));
      margin: 0 0.1rem;
    }

    :host-context([data-theme="light"]) .tb-divider {
      background: rgba(0, 0, 0, 0.08);
    }

    .zoom-controls {
      display: inline-flex;
      align-items: center;
      gap: 0.15rem;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 0.4rem;
      padding: 0.15rem;
    }

    :host-context([data-theme="light"]) .zoom-controls {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.08);
    }

    .zoom-action-btn {
      width: 24px;
      height: 24px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: transparent;
      color: var(--text-2, #A1A1AA);
      border-radius: 0.3rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="light"]) .zoom-action-btn {
      color: #64748B;
    }

    .zoom-action-btn:hover:not(:disabled) {
      background: var(--bg-1, #18181B);
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .zoom-action-btn:hover:not(:disabled) {
      background: #FFFFFF;
      color: #0F172A;
    }

    .zoom-action-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .zoom-percent-pill {
      font-size: 0.7rem;
      font-weight: 600;
      padding: 0 0.4rem;
      color: var(--text, #F4F4F5);
      min-width: 38px;
      text-align: center;
    }

    :host-context([data-theme="light"]) .zoom-percent-pill {
      color: #0F172A;
    }

    .export-menu-wrapper {
      position: relative;
    }

    .export-backdrop {
      position: fixed;
      inset: 0;
      z-index: 999;
      background: transparent;
      cursor: default;
    }

    .export-popover-menu {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      background: var(--bg-1, #18181B);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      border-radius: 0.6rem;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3);
      min-width: 230px;
      z-index: 1000;
      padding: 0.35rem;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      animation: popover-slide-in 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes popover-slide-in {
      from {
        opacity: 0;
        transform: translateY(-4px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    :host-context([data-theme="light"]) .export-popover-menu {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.1);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .popover-heading {
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-2, #A1A1AA);
      padding: 0.35rem 0.5rem;
    }

    :host-context([data-theme="light"]) .popover-heading {
      color: #94A3B8;
    }

    .popover-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.6rem;
      border-radius: 0.375rem;
      border: none;
      background: transparent;
      color: var(--text, #F4F4F5);
      font-size: 0.775rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s ease;
      text-align: left;
    }

    :host-context([data-theme="light"]) .popover-item {
      color: #0F172A;
    }

    .popover-item:hover {
      background: var(--bg-2, #27272A);
      color: #60A5FA;
    }

    :host-context([data-theme="light"]) .popover-item:hover {
      background: #F1F5F9;
      color: #2563EB;
    }

    .popover-sep {
      height: 1px;
      background: var(--border, rgba(255, 255, 255, 0.08));
      margin: 0.2rem 0;
    }

    :host-context([data-theme="light"]) .popover-sep {
      background: rgba(0, 0, 0, 0.08);
    }

    .tb-danger-btn:hover {
      color: #F87171;
      border-color: rgba(239, 68, 68, 0.3);
      background: rgba(239, 68, 68, 0.12);
    }

    /* ── Viewport Canvas Container ────────────────────────────────────────── */
    .viewport-canvas-container {
      flex: 1;
      min-height: 0;
      position: relative;
      background: #090D16;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      cursor: default;
    }

    :host-context([data-theme="light"]) .viewport-canvas-container {
      background: #F1F5F9;
    }

    .viewport-canvas-container.panning {
      cursor: grab;
    }

    .viewport-canvas-container.panning:active {
      cursor: grabbing;
    }

    .viewport-canvas-container.inspecting {
      cursor: crosshair;
    }

    .drag-hover-overlay {
      position: absolute;
      inset: 0;
      background: rgba(37, 99, 235, 0.15);
      backdrop-filter: blur(2px);
      border: 3px dashed #2563EB;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 50;
      color: #60A5FA;
    }

    :host-context([data-theme="light"]) .drag-hover-overlay {
      color: #2563EB;
    }

    .overlay-title {
      font-size: 1.125rem;
      font-weight: 700;
      margin-top: 0.5rem;
    }

    .overlay-sub {
      font-size: 0.8125rem;
      opacity: 0.8;
    }

    .canvas-transform-layer {
      position: relative;
      display: inline-flex;
      transform-origin: center center;
      transition: transform 0.05s linear;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
      border-radius: 4px;
      overflow: hidden;
    }

    .transparency-backdrop {
      position: absolute;
      inset: 0;
      background-image: 
        linear-gradient(45deg, rgba(255, 255, 255, 0.05) 25%, transparent 25%),
        linear-gradient(-45deg, rgba(255, 255, 255, 0.05) 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.05) 75%),
        linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.05) 75%);
      background-size: 16px 16px;
      background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
      z-index: 0;
    }

    :host-context([data-theme="light"]) .transparency-backdrop {
      background-image: 
        linear-gradient(45deg, rgba(0, 0, 0, 0.05) 25%, transparent 25%),
        linear-gradient(-45deg, rgba(0, 0, 0, 0.05) 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, rgba(0, 0, 0, 0.05) 75%),
        linear-gradient(-45deg, transparent 75%, rgba(0, 0, 0, 0.05) 75%);
    }

    .rendered-canvas {
      position: relative;
      z-index: 1;
      display: block;
      max-width: 100%;
      height: auto;
      object-fit: contain;
    }

    /* Split Slider Controls */
    .split-canvas-wrapper {
      position: relative;
      display: inline-block;
    }

    .split-hud-bar {
      position: absolute;
      bottom: 12px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.88);
      backdrop-filter: blur(6px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 9999px;
      padding: 0.35rem 0.85rem;
      display: flex;
      align-items: center;
      gap: 0.65rem;
      z-index: 10;
      color: #FFFFFF;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    }

    .hud-label {
      font-size: 0.725rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .hud-slider-input {
      width: 110px;
      height: 4px;
      accent-color: #3B82F6;
      cursor: pointer;
    }

    /* Side-by-Side Canvas Row */
    .side-by-side-canvas-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 10px;
      background: var(--bg-1, #18181B);
    }

    :host-context([data-theme="light"]) .side-by-side-canvas-row {
      background: #FFFFFF;
    }

    .side-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }

    .side-col-header {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-2, #A1A1AA);
      padding: 0.2rem 0.5rem;
      border-radius: 0.25rem;
      background: var(--bg-2, #27272A);
    }

    :host-context([data-theme="light"]) .side-col-header {
      color: #64748B;
      background: #F1F5F9;
    }

    .side-col-header.header-simulated {
      color: #60A5FA;
      background: rgba(37, 99, 235, 0.15);
    }

    :host-context([data-theme="light"]) .side-col-header.header-simulated {
      color: #2563EB;
      background: rgba(37, 99, 235, 0.1);
    }

    /* Simulated Only Mode */
    .single-simulated-wrapper {
      position: relative;
      display: inline-block;
    }

    .peek-original-hud {
      position: absolute;
      bottom: 12px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 20;
      pointer-events: auto;
    }

    .peek-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.45rem 1rem;
      border-radius: 9999px;
      background: #0F172A !important;
      backdrop-filter: blur(8px) !important;
      -webkit-backdrop-filter: blur(8px) !important;
      border: 1.5px solid rgba(255, 255, 255, 0.35) !important;
      color: #FFFFFF !important;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      user-select: none;
      transition: all 0.15s ease;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.2) !important;
    }

    .peek-btn:hover {
      background: #1E293B !important;
      border-color: #93C5FD !important;
      color: #FFFFFF !important;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6), 0 0 0 2px rgba(59, 130, 246, 0.5) !important;
    }

    .peek-btn.active,
    .peek-btn:active {
      background: #2563EB !important;
      border-color: #93C5FD !important;
      color: #FFFFFF !important;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.45), 0 4px 16px rgba(0, 0, 0, 0.4) !important;
    }

    :host-context([data-theme="light"]) .peek-btn,
    [data-theme="light"] .peek-btn {
      background: #0F172A !important;
      color: #FFFFFF !important;
      border: 1.5px solid rgba(255, 255, 255, 0.4) !important;
    }

    :host-context([data-theme="light"]) .peek-btn:hover,
    [data-theme="light"] .peek-btn:hover {
      background: #1E293B !important;
      color: #FFFFFF !important;
      border-color: #60A5FA !important;
    }

    :host-context([data-theme="light"]) .peek-btn.active,
    :host-context([data-theme="light"]) .peek-btn:active,
    [data-theme="light"] .peek-btn.active,
    [data-theme="light"] .peek-btn:active {
      background: #2563EB !important;
      color: #FFFFFF !important;
      border-color: #93C5FD !important;
    }

    .peek-btn ts-icon,
    .peek-btn span {
      color: #FFFFFF !important;
      fill: currentColor !important;
    }

    /* ── Color Inspector Floating Loupe ──────────────────────────────────── */
    .inspector-loupe-tooltip {
      position: fixed;
      z-index: 200;
      pointer-events: none;
      background: var(--bg-1, #18181B);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
      border-radius: 0.5rem;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
      padding: 0.5rem 0.65rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      min-width: 220px;
    }

    :host-context([data-theme="light"]) .inspector-loupe-tooltip {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.1);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
    }

    .loupe-colors-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .color-preview-block {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .preview-swatch {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .preview-swatch {
      border-color: rgba(0, 0, 0, 0.15);
    }

    .preview-meta {
      display: flex;
      flex-direction: column;
    }

    .preview-meta .tag {
      font-size: 0.625rem;
      font-weight: 700;
      color: var(--text-2, #A1A1AA);
      text-transform: uppercase;
    }

    :host-context([data-theme="light"]) .preview-meta .tag {
      color: #94A3B8;
    }

    .preview-meta .tag.simulated {
      color: #60A5FA;
    }

    :host-context([data-theme="light"]) .preview-meta .tag.simulated {
      color: #2563EB;
    }

    .preview-meta .hex {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      line-height: 1.1;
    }

    :host-context([data-theme="light"]) .preview-meta .hex {
      color: #0F172A;
    }

    .preview-meta .rgb {
      font-size: 0.625rem;
      color: var(--text-2, #A1A1AA);
      line-height: 1.1;
    }

    :host-context([data-theme="light"]) .preview-meta .rgb {
      color: #64748B;
    }

    .color-arrow {
      color: var(--text-2, #A1A1AA);
    }

    .loupe-delta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      padding-top: 0.3rem;
      font-size: 0.6875rem;
    }

    :host-context([data-theme="light"]) .loupe-delta-row {
      border-color: rgba(0, 0, 0, 0.08);
    }

    .delta-label {
      color: var(--text-2, #A1A1AA);
    }

    :host-context([data-theme="light"]) .delta-label {
      color: #64748B;
    }

    .delta-val {
      font-weight: 700;
      color: #10B981;
    }

    .delta-val.high-shift {
      color: #F59E0B;
    }

    /* ── Accessibility Insights Bar ───────────────────────────────────────── */
    .accessibility-insights-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.35rem 0.75rem;
      background: var(--bg-1, #18181B);
      border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      flex-shrink: 0;
      min-height: 36px;
    }

    :host-context([data-theme="light"]) .accessibility-insights-bar {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.08);
    }

    .insights-summary {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.775rem;
      color: var(--text, #F4F4F5);
      line-height: 1.3;
    }

    :host-context([data-theme="light"]) .insights-summary {
      color: #0F172A;
    }

    .icon-warning {
      color: #F59E0B;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .icon-warning {
      color: #D97706;
    }

    .icon-success {
      color: #10B981;
      flex-shrink: 0;
    }

    .confusable-swatches-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .confusable-mini-pair {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.2rem 0.4rem;
      border-radius: 0.35rem;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      font-size: 0.6875rem;
    }

    :host-context([data-theme="light"]) .confusable-mini-pair {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.08);
    }

    .swatch-mini {
      width: 12px;
      height: 12px;
      border-radius: 2px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      display: inline-block;
    }

    :host-context([data-theme="light"]) .swatch-mini {
      border-color: rgba(0, 0, 0, 0.15);
    }

    .pair-hex {
      color: var(--text-2, #A1A1AA);
    }

    :host-context([data-theme="light"]) .pair-hex {
      color: #64748B;
    }

    /* ── TAB 2: Palette Audit Styles ──────────────────────────────────────── */
    .palette-studio-card {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1.25rem;
      background: var(--bg-1, #18181B);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 0.75rem;
      overflow-y: auto;
    }

    :host-context([data-theme="light"]) .palette-studio-card {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.08);
    }

    .palette-header-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .card-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 0 0 0.25rem;
    }

    :host-context([data-theme="light"]) .card-title {
      color: #0F172A;
    }

    .card-subtitle {
      font-size: 0.8125rem;
      color: var(--text-2, #A1A1AA);
      margin: 0;
      max-width: 600px;
    }

    :host-context([data-theme="light"]) .card-subtitle {
      color: #64748B;
    }

    .palette-actions {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex-wrap: wrap;
    }

    .palette-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.65rem;
      border-radius: 0.4rem;
      font-size: 0.775rem;
      font-weight: 500;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text, #F4F4F5);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="light"]) .palette-btn {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.08);
      color: #0F172A;
    }

    .palette-btn:hover {
      background: var(--bg-1, #18181B);
      border-color: #2563EB;
      color: #60A5FA;
    }

    :host-context([data-theme="light"]) .palette-btn:hover {
      background: #FFFFFF;
      color: #2563EB;
    }

    .palette-btn-accent {
      background: rgba(37, 99, 235, 0.15);
      border-color: rgba(37, 99, 235, 0.3);
      color: #60A5FA;
      font-weight: 600;
    }

    :host-context([data-theme="light"]) .palette-btn-accent {
      background: rgba(37, 99, 235, 0.1);
      border-color: rgba(37, 99, 235, 0.25);
      color: #2563EB;
    }

    .conflict-alert-card {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
      border-radius: 0.5rem;
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #FCD34D;
    }

    :host-context([data-theme="light"]) .conflict-alert-card {
      color: #92400E;
      background: rgba(245, 158, 11, 0.08);
      border-color: rgba(245, 158, 11, 0.25);
    }

    .conflict-title {
      font-size: 0.875rem;
      font-weight: 700;
      margin: 0 0 0.25rem;
    }

    .conflict-desc {
      font-size: 0.8rem;
      margin: 0 0 0.5rem;
      opacity: 0.9;
    }

    .confusion-pairs-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .confusion-pair-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.375rem;
      background: var(--bg-1, #18181B);
      border: 1px solid rgba(245, 158, 11, 0.3);
      font-size: 0.725rem;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .confusion-pair-pill {
      background: #FFFFFF;
      color: #0F172A;
    }

    .pair-swatches {
      display: inline-flex;
      gap: 2px;
    }

    .healthy-audit-card {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.25);
      color: #6EE7B7;
      font-size: 0.8125rem;
      font-weight: 600;
    }

    :host-context([data-theme="light"]) .healthy-audit-card {
      color: #065F46;
      background: rgba(16, 185, 129, 0.08);
      border-color: rgba(16, 185, 129, 0.2);
    }

    .swatches-audit-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 0.75rem;
    }

    .swatch-audit-card {
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 0.5rem;
      overflow: hidden;
      background: var(--bg-1, #18181B);
      transition: all 0.15s ease;
    }

    :host-context([data-theme="light"]) .swatch-audit-card {
      border-color: rgba(0, 0, 0, 0.08);
      background: #FFFFFF;
    }

    .swatch-audit-card.has-conflict {
      border-color: #F59E0B;
    }

    .split-color-bar {
      display: flex;
      height: 48px;
      width: 100%;
    }

    .bar-half {
      flex: 1;
      display: flex;
      align-items: flex-end;
      padding: 0.25rem 0.4rem;
    }

    .bar-label {
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      opacity: 0.85;
    }

    .swatch-details {
      padding: 0.6rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .hex-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.25rem;
    }

    .hex-badge {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.15rem 0.4rem;
      border-radius: 0.25rem;
      background: var(--bg-2, #27272A);
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .hex-badge {
      background: #F1F5F9;
      color: #0F172A;
    }

    .hex-badge.simulated {
      background: rgba(37, 99, 235, 0.2);
      color: #60A5FA;
    }

    :host-context([data-theme="light"]) .hex-badge.simulated {
      background: rgba(37, 99, 235, 0.1);
      color: #2563EB;
    }

    .conflict-warning-tag {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.6875rem;
      color: #FBBF24;
      font-weight: 500;
    }

    :host-context([data-theme="light"]) .conflict-warning-tag {
      color: #D97706;
    }

    .swatch-card-actions {
      display: flex;
      gap: 0.3rem;
      margin-top: 0.2rem;
    }

    .mini-action-btn {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
      padding: 0.25rem 0.4rem;
      border-radius: 0.25rem;
      font-size: 0.6875rem;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      background: var(--bg-2, #27272A);
      color: var(--text, #F4F4F5);
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .mini-action-btn {
      border-color: rgba(0, 0, 0, 0.08);
      background: #F8FAFC;
      color: #0F172A;
    }

    .mini-action-btn:hover {
      background: var(--bg-1, #18181B);
      border-color: #2563EB;
      color: #60A5FA;
    }

    :host-context([data-theme="light"]) .mini-action-btn:hover {
      background: #FFFFFF;
      color: #2563EB;
    }

    .palette-bottom-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin-top: 0.5rem;
    }

    .palette-dispatch-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem 0.85rem;
      border-radius: 0.5rem;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      background: var(--bg-2, #27272A);
      color: var(--text, #F4F4F5);
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="light"]) .palette-dispatch-btn {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.08);
      color: #0F172A;
    }

    .palette-dispatch-btn:hover {
      background: var(--bg-1, #18181B);
      border-color: #2563EB;
      color: #60A5FA;
    }

    :host-context([data-theme="light"]) .palette-dispatch-btn:hover {
      background: #FFFFFF;
      color: #2563EB;
    }

    /* Mobile Visibility Helpers */
    .show-on-mobile {
      display: none !important;
    }
    .hide-on-mobile {
      display: flex !important;
    }
    .mobile-deficiency-wrap {
      display: none;
    }

    /* ── Responsive Behavior ──────────────────────────────────────────────── */
    @media (max-width: 1180px) and (min-width: 640px) {
      .compact-toolbar {
        flex-wrap: wrap;
        gap: 0.5rem 0.75rem;
        padding: 0.5rem 0.75rem;
      }

      .tb-group-left {
        order: 1;
        flex: 1 1 auto;
        min-width: 0;
      }

      .file-meta-pill {
        max-width: 220px;
      }

      .tb-group-right {
        order: 2;
        flex: 0 0 auto;
        margin-left: auto;
      }

      .tb-group-center {
        order: 3;
        width: 100%;
        justify-content: center;
        flex-wrap: wrap;
        padding-top: 0.35rem;
        border-top: 1px solid var(--border, rgba(255, 255, 255, 0.06));
        gap: 0.5rem;
      }

      .tb-btn {
        min-height: 38px;
        padding: 0.35rem 0.65rem;
      }

      .upload-primary-btn {
        min-height: 44px;
      }

      .palette-dispatch-btn {
        min-height: 44px;
      }
    }

    @media (max-width: 639px) {
      .show-on-mobile {
        display: block !important;
      }
      .hide-on-mobile {
        display: none !important;
      }
      .mobile-deficiency-wrap {
        display: block;
        width: 100%;
      }

      .simulator-layout {
        padding: 0 16px 24px;
        gap: 12px;
        box-sizing: border-box;
      }

      .workspace-header {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
      }

      .workspace-title {
        font-size: 1.25rem;
      }

      .workspace-subtitle {
        font-size: 0.8125rem;
        line-height: 1.4;
      }

      .tab-toggle-group {
        width: 100%;
        display: flex;
        gap: 4px;
      }

      .tab-btn {
        flex: 1;
        justify-content: center;
        min-height: 44px;
        white-space: nowrap;
      }

      /* Mobile Deficiency Selector Trigger & Bottom Sheet */
      .mobile-deficiency-trigger {
        width: 100%;
        min-height: 48px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        border-radius: 10px;
        background: var(--bg-2, #27272A);
        border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
        color: var(--text, #F4F4F5);
        cursor: pointer;
        text-align: left;
        box-sizing: border-box;
      }

      :host-context([data-theme="light"]) .mobile-deficiency-trigger {
        background: #FFFFFF;
        border-color: rgba(0, 0, 0, 0.08);
        color: #0F172A;
      }

      .trigger-meta {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .trigger-label {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--text-2, #A1A1AA);
      }

      :host-context([data-theme="light"]) .trigger-label {
        color: #64748B;
      }

      .trigger-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--text, #F4F4F5);
      }

      :host-context([data-theme="light"]) .trigger-title {
        color: #0F172A;
      }

      .trigger-chevron {
        color: var(--text-2, #A1A1AA);
        flex-shrink: 0;
      }

      .mobile-sheet-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.55);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        z-index: 1000;
      }

      .mobile-deficiency-sheet {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        max-height: 82vh;
        border-radius: 18px 18px 0 0;
        background: var(--bg-1, #18181B);
        border-top: 1px solid var(--border, rgba(255, 255, 255, 0.12));
        box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.55);
        z-index: 1001;
        display: flex;
        flex-direction: column;
        padding: 16px 16px max(16px, env(safe-area-inset-bottom, 16px));
        box-sizing: border-box;
      }

      :host-context([data-theme="light"]) .mobile-deficiency-sheet {
        background: #FFFFFF;
        border-top-color: rgba(0, 0, 0, 0.1);
        box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.15);
      }

      .sheet-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      }

      :host-context([data-theme="light"]) .sheet-head {
        border-bottom-color: rgba(0, 0, 0, 0.08);
      }

      .sheet-heading {
        font-size: 14px;
        font-weight: 700;
        color: var(--text, #F4F4F5);
      }

      :host-context([data-theme="light"]) .sheet-heading {
        color: #0F172A;
      }

      .sheet-close-btn {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        background: transparent;
        border: none;
        color: var(--text-2, #A1A1AA);
        cursor: pointer;
      }

      .sheet-scroll-content {
        overflow-y: auto;
        max-height: calc(82vh - 65px);
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding-top: 12px;
      }

      .sheet-group-label {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--text-2, #A1A1AA);
      }

      :host-context([data-theme="light"]) .sheet-group-label {
        color: #64748B;
      }

      .sheet-options-grid {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .sheet-option-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        min-height: 48px;
        border-radius: 10px;
        background: var(--bg-2, #27272A);
        border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
        color: var(--text, #F4F4F5);
        cursor: pointer;
        text-align: left;
        box-sizing: border-box;
      }

      :host-context([data-theme="light"]) .sheet-option-row {
        background: #F8FAFC;
        border-color: rgba(0, 0, 0, 0.06);
        color: #0F172A;
      }

      .sheet-option-row.active {
        border-color: #2563EB;
        background: rgba(37, 99, 235, 0.15);
      }

      :host-context([data-theme="light"]) .sheet-option-row.active {
        background: rgba(37, 99, 235, 0.08);
      }

      .option-text-col {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .opt-title {
        font-size: 13px;
        font-weight: 600;
      }

      .opt-sub {
        font-size: 11px;
        color: var(--text-2, #A1A1AA);
      }

      :host-context([data-theme="light"]) .opt-sub {
        color: #64748B;
      }

      .opt-check {
        color: #2563EB;
        flex-shrink: 0;
      }

      /* Compact Empty Upload State */
      .empty-upload-card {
        min-height: 240px;
        padding: 1.5rem 1rem;
      }

      .dropzone-content {
        padding: 1rem;
      }

      .upload-main-title {
        font-size: 1.1rem;
      }

      .upload-primary-btn {
        width: 100%;
        max-width: 240px;
        min-height: 44px;
        justify-content: center;
      }

      /* 4-Row Reorganized Toolbar */
      .compact-toolbar {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 10px;
        width: 100%;
        box-sizing: border-box;
      }

      .tb-group-left {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
      }

      .tb-replace-btn {
        flex-shrink: 0;
        min-height: 44px;
        padding: 0 12px;
      }

      .file-meta-pill {
        flex: 1;
        min-width: 0;
        min-height: 44px;
        display: flex;
        align-items: center;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .file-meta-pill .file-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .tb-group-center {
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 100%;
        min-width: 0;
        overflow-x: visible !important;
        overflow-y: visible !important;
      }

      .segmented-modes {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
        overflow-x: auto !important;
        overflow-y: hidden !important;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        gap: 6px;
        padding: 3px;
        flex-wrap: nowrap;
        border-radius: 8px;
        scroll-snap-type: x proximity;
      }

      .segmented-modes::-webkit-scrollbar {
        display: none;
      }

      .segment-mode-btn {
        flex: 1 0 auto;
        min-width: max-content;
        min-height: 44px;
        height: 44px;
        padding: 0 12px;
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-size: 13px;
        border-radius: 6px;
        box-sizing: border-box;
        scroll-snap-align: start;
      }

      .segment-mode-btn span {
        white-space: nowrap;
      }

      .tb-divider {
        display: none !important;
      }

      .zoom-controls {
        display: flex;
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
        justify-content: space-between;
        align-items: center;
        gap: 4px;
        overflow-x: visible;
      }

      .zoom-action-btn {
        flex: 1;
        min-width: 44px;
        min-height: 44px;
        justify-content: center;
      }

      .zoom-percent-pill {
        flex: 1.2;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .tb-group-right {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
      }

      .tb-inspector-btn {
        flex: 1;
        min-height: 44px;
        justify-content: center;
        white-space: nowrap;
      }

      .export-menu-wrapper {
        flex: 1;
      }

      .tb-export-btn {
        width: 100%;
        min-height: 44px;
        justify-content: center;
        white-space: nowrap;
      }

      .tb-danger-btn {
        width: 44px;
        min-width: 44px;
        height: 44px;
        min-height: 44px;
        flex-shrink: 0;
        justify-content: center;
      }

      .export-popover-menu {
        max-width: calc(100vw - 24px);
        right: 0;
      }

      /* Inspector Loupe as Docked Card / Bottom Sheet on Mobile */
      .inspector-loupe-tooltip {
        position: fixed !important;
        left: 12px !important;
        right: 12px !important;
        bottom: 12px !important;
        top: auto !important;
        transform: none !important;
        width: auto !important;
        max-width: calc(100vw - 24px) !important;
        box-sizing: border-box !important;
        z-index: 1000 !important;
        pointer-events: auto !important;
        box-shadow: 0 10px 25px -4px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1) !important;
        border-radius: 12px !important;
        padding: 12px 14px !important;
      }

      :host-context([data-theme="light"]) .inspector-loupe-tooltip {
        box-shadow: 0 10px 25px -4px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.1) !important;
      }

      .inspector-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 8px;
        margin-bottom: 8px;
        border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      }

      :host-context([data-theme="light"]) .inspector-card-header {
        border-bottom-color: rgba(0, 0, 0, 0.08);
      }

      .inspector-mobile-title {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--text-2, #A1A1AA);
      }

      :host-context([data-theme="light"]) .inspector-mobile-title {
        color: #64748B;
      }

      .inspector-close-btn {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        color: var(--text-2, #A1A1AA);
        cursor: pointer;
        padding: 0;
      }

      /* Fix Vertical Text Bug in Accessibility Insights & Callouts */
      .accessibility-insights-bar {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
        padding: 8px 10px;
        width: 100%;
        box-sizing: border-box;
      }

      .insights-summary {
        width: 100%;
        min-width: 0;
        align-items: flex-start;
      }

      .insights-text {
        width: 100%;
        min-width: 0;
        word-break: normal;
        overflow-wrap: break-word;
        white-space: normal;
      }

      .confusable-swatches-row {
        width: 100%;
        flex-wrap: wrap;
        gap: 6px;
      }

      .conflict-alert-card {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
        width: 100%;
        box-sizing: border-box;
      }

      .conflict-content {
        flex: 1;
        width: 100%;
        min-width: 0;
      }

      .conflict-title {
        word-break: normal;
        overflow-wrap: break-word;
        white-space: normal;
      }

      .conflict-desc {
        word-break: normal;
        overflow-wrap: break-word;
        white-space: normal;
      }

      .confusion-pairs-list {
        width: 100%;
      }

      .confusion-pair-pill {
        max-width: 100%;
        flex-wrap: wrap;
      }

      .healthy-audit-card {
        width: 100%;
        box-sizing: border-box;
        word-break: normal;
        overflow-wrap: break-word;
      }

      /* Palette Audit Full-Width Cards and Structured Actions on Mobile */
      .palette-studio-card {
        padding: 14px 12px 3.5rem;
        gap: 12px;
        box-sizing: border-box;
      }

      .palette-header-row {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
        width: 100%;
      }

      .palette-intro {
        width: 100%;
        min-width: 0;
      }

      .palette-actions {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        width: 100%;
        box-sizing: border-box;
      }

      .palette-btn {
        width: 100%;
        min-width: 0;
        min-height: 44px;
        justify-content: center;
        padding: 0.5rem 0.75rem;
        box-sizing: border-box;
        overflow: hidden;
      }

      .palette-btn:nth-child(1),
      .palette-btn:nth-child(2) {
        grid-column: 1 / -1;
      }

      .palette-btn span {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        min-width: 0;
      }

      .palette-btn ts-icon {
        flex-shrink: 0;
      }

      .swatches-audit-grid {
        grid-template-columns: 1fr;
        gap: 12px;
        width: 100%;
      }

      .swatch-audit-card {
        width: 100%;
        box-sizing: border-box;
      }

      .swatch-card-actions {
        display: flex;
        width: 100%;
        gap: 8px;
      }

      .swatch-card-actions .mini-action-btn {
        flex: 1;
        min-height: 44px;
        justify-content: center;
        white-space: nowrap;
      }

      .palette-bottom-actions {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
        width: 100%;
        margin-top: 0.75rem;
      }

      .palette-dispatch-btn {
        width: 100%;
        min-width: 0;
        min-height: 48px;
        justify-content: center;
        padding: 0.625rem 0.85rem;
        box-sizing: border-box;
        white-space: normal;
        text-align: center;
        line-height: 1.35;
      }

      .palette-dispatch-btn ts-icon {
        flex-shrink: 0;
      }

      .peek-btn {
        min-height: 44px !important;
        padding: 0.5rem 1.25rem !important;
        font-size: 0.875rem !important;
        background: #0F172A !important;
        color: #FFFFFF !important;
      }

      .peek-btn:hover {
        background: #1E293B !important;
        color: #FFFFFF !important;
      }

      .peek-btn.active,
      .peek-btn:active {
        background: #2563EB !important;
        color: #FFFFFF !important;
      }
    }
  `]
})
export class SimulatorModuleComponent implements AfterViewInit, OnDestroy {
  public state = inject(ColorStudioStateService);
  private engine = inject(ColorEngineService);
  public cvdService = inject(ColorBlindnessService);
  private exportService = inject(ExportService);
  private cdr = inject(ChangeDetectorRef, { optional: true });

  // ── Element References ────────────────────────────────────────────────────
  @ViewChild('displayCanvas') public displayCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('sideOriginalCanvas') public sideOrigRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('sideSimulatedCanvas') public sideSimRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput') public fileInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('viewportRef') public viewportRef?: ElementRef<HTMLDivElement>;

  // Offscreen Buffers
  private sourceCanvas: HTMLCanvasElement = document.createElement('canvas');
  private simCanvas: HTMLCanvasElement = document.createElement('canvas');

  // ── Reactive State Signals ────────────────────────────────────────────────
  public activeTab = signal<'image' | 'palette'>('image');
  public selectedType = signal<ColorBlindnessType>('protanopia');
  public viewMode = signal<SimulatorViewMode>('split-slider');
  public splitRatio = signal<number>(0.5); // 0.0 to 1.0
  public showAnomalous = signal<boolean>(false);
  public showMobileDeficiencySheet = signal<boolean>(false);
  public showExportMenu = signal<boolean>(false);

  // Continuous Zoom & Pan
  public zoomLevel = signal<number>(1);
  public panX = signal<number>(0);
  public panY = signal<number>(0);
  public isPanning = signal<boolean>(false);
  private panStartX = 0;
  private panStartY = 0;
  private initialPanX = 0;
  private initialPanY = 0;

  // Image Upload State (INITIALLY NULL for upload-first empty state)
  public currentImageName = signal<string | null>(null);
  public imageDimensions = signal<{ width: number; height: number } | null>(null);
  public imageFileSize = signal<string | null>(null);
  public isDraggingOver = signal<boolean>(false);
  public isLoading = signal<boolean>(false);

  // Peek original in simulated mode
  public isPeekingOriginal = signal<boolean>(false);

  // Color Inspector (Enabled by default)
  public isInspectorActive = signal<boolean>(true);
  public hoverPixelData = signal<{
    screenX: number;
    screenY: number;
    imgX: number;
    imgY: number;
    origHex: string;
    origRgb: string;
    simHex: string;
    simRgb: string;
    deltaE: number;
  } | null>(null);

  // Image Accessibility Insights
  public imageInsights = signal<{
    riskCount: number;
    confusionPairs: PaletteConfusionPair[];
  } | null>(null);

  // 5-Second Error Notification Banner
  public errorMessage = signal<string | null>(null);
  private errorTimer: any = null;

  public setErrorMessage(msg: string | null): void {
    if (this.errorTimer) {
      clearTimeout(this.errorTimer);
      this.errorTimer = null;
    }
    this.errorMessage.set(msg);
    if (msg) {
      this.errorTimer = setTimeout(() => {
        this.errorMessage.set(null);
        this.errorTimer = null;
        this.cdr?.markForCheck();
      }, 5000);
    }
    this.cdr?.markForCheck();
  }

  // Palette State
  public paletteColors = signal<string[]>([]);

  // Built-in Sample Images (preserved for testing compatibility)
  public sampleImages: Array<{ name: string; category: string; dataUri: string }> = [];

  // Track created object URL for cleanup
  private activeObjectUrl: string | null = null;
  private isDraggingSlider = false;

  // Make Math available in template
  public Math = Math;

  // Profiles
  public primaryProfiles = computed(() => {
    return this.cvdService.profiles.filter(
      p => p.type === 'normal' || p.category === 'dichromacy' || p.category === 'monochromacy'
    );
  });

  public anomalousProfiles = computed(() => {
    return this.cvdService.profiles.filter(p => p.category === 'anomalous');
  });

  public activeProfile = computed<ColorBlindnessInfo>(() => {
    const target = this.selectedType();
    return this.cvdService.profiles.find(p => p.type === target) || this.cvdService.profiles[0];
  });

  public zoomPercent = computed(() => Math.round(this.zoomLevel() * 100));

  // Palette Simulation Result
  public simulationResult = computed<PaletteSimulationResult>(() => {
    const colors = this.paletteColors();
    const type = this.selectedType();
    return this.cvdService.simulatePalette(colors, type);
  });

  constructor() {
    const shared = this.state.sharedWorkingPalette();
    if (shared && shared.length >= 3) {
      this.paletteColors.set(shared);
    } else {
      this.paletteColors.set(['#E11D48', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6']);
    }
  }

  public ngAfterViewInit(): void {
    // Empty upload state by default - no automatic sample image loaded!
  }

  public ngOnDestroy(): void {
    this.cleanupMemory();
    if (this.errorTimer) {
      clearTimeout(this.errorTimer);
      this.errorTimer = null;
    }
  }

  // ── Memory Cleanup ────────────────────────────────────────────────────────
  private cleanupMemory(): void {
    if (this.activeObjectUrl && typeof URL !== 'undefined') {
      try {
        URL.revokeObjectURL(this.activeObjectUrl);
      } catch {}
      this.activeObjectUrl = null;
    }
  }

  // ── Mode & View Selection ─────────────────────────────────────────────────
  public onTypeSelect(type: ColorBlindnessType): void {
    this.selectedType.set(type);
    this.reprocessSimulation();
    this.analyzeImageAccessibility();
  }

  public setViewMode(mode: SimulatorViewMode): void {
    this.viewMode.set(mode);
    setTimeout(() => this.redrawCanvasView(), 0);
  }

  // ── Zoom & Pan Controls ───────────────────────────────────────────────────
  public zoomIn(): void {
    this.zoomLevel.update(z => Math.min(5, Math.round((z + 0.25) * 100) / 100));
  }

  public zoomOut(): void {
    this.zoomLevel.update(z => Math.max(0.25, Math.round((z - 0.25) * 100) / 100));
  }

  public fitToScreen(): void {
    this.zoomLevel.set(1);
    this.panX.set(0);
    this.panY.set(0);
  }

  public resetZoom(): void {
    this.zoomLevel.set(1);
    this.panX.set(0);
    this.panY.set(0);
  }

  public setZoom(zoom: 'fit' | number): void {
    if (zoom === 'fit') {
      this.fitToScreen();
    } else {
      this.zoomLevel.set(zoom);
    }
  }

  public onWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY < 0 ? 0.1 : -0.1;
    const newZoom = Math.min(5, Math.max(0.25, Math.round((this.zoomLevel() + delta) * 100) / 100));
    this.zoomLevel.set(newZoom);
  }

  public onViewportMouseDown(event: MouseEvent): void {
    if ((event.target as HTMLElement).closest('.split-hud-bar, .peek-original-hud, .tb-btn, input, button')) return;
    if (this.zoomLevel() > 1 || this.panX() !== 0 || this.panY() !== 0) {
      this.isPanning.set(true);
      this.panStartX = event.clientX;
      this.panStartY = event.clientY;
      this.initialPanX = this.panX();
      this.initialPanY = this.panY();
    }
  }

  @HostListener('window:mousemove', ['$event'])
  public onWindowMouseMove(event: MouseEvent): void {
    if (this.isDraggingSlider) {
      this.updateSplitFromEvent(event);
    } else if (this.isPanning()) {
      const dx = event.clientX - this.panStartX;
      const dy = event.clientY - this.panStartY;
      this.panX.set(this.initialPanX + dx);
      this.panY.set(this.initialPanY + dy);
    }
  }

  @HostListener('window:mouseup')
  public onWindowMouseUp(): void {
    this.isDraggingSlider = false;
    this.isPanning.set(false);
  }

  @HostListener('window:touchmove', ['$event'])
  public onWindowTouchMove(event: TouchEvent): void {
    if (this.isDraggingSlider) {
      if (event.cancelable) {
        event.preventDefault();
      }
      this.updateSplitFromEvent(event);
    }
  }

  @HostListener('window:touchend')
  public onWindowTouchEnd(): void {
    this.isDraggingSlider = false;
  }

  // ── Image Processing & Rendering ──────────────────────────────────────────

  public loadSample(dataUri: string, name: string): void {
    this.cleanupMemory();
    this.currentImageName.set(name);
    this.imageFileSize.set('Built-in Sample');
    this.renderImageSource(dataUri);
  }

  public onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.processFile(input.files[0]);
    }
  }

  public onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDraggingOver.set(true);
  }

  public onDragLeave(e: DragEvent): void {
    e.preventDefault();
    this.isDraggingOver.set(false);
  }

  public onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDraggingOver.set(false);
    if (e.dataTransfer && e.dataTransfer.files[0]) {
      this.processFile(e.dataTransfer.files[0]);
    }
  }

  public processFile(file: File): void {
    this.setErrorMessage(null);

    // Format Validation: PNG, JPG, JPEG, WebP
    const validMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const hasValidExt = /\.(png|jpe?g|webp)$/i.test(file.name);
    if (!validMimes.includes(file.type.toLowerCase()) && !hasValidExt) {
      this.setErrorMessage('Unsupported file format. Please upload PNG, JPG, JPEG, or WebP.');
      return;
    }

    // Size limit: 25 MB
    const maxBytes = 25 * 1024 * 1024;
    if (file.size > maxBytes) {
      this.setErrorMessage('File exceeds the 25 MB size limit.');
      return;
    }

    this.cleanupMemory();
    this.isLoading.set(true);
    this.currentImageName.set(file.name);

    // Format file size
    const kb = Math.round(file.size / 1024);
    this.imageFileSize.set(kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`);

    try {
      this.activeObjectUrl = URL.createObjectURL(file);
      this.renderImageSource(this.activeObjectUrl);
    } catch {
      this.setErrorMessage('Failed to read image file.');
      this.isLoading.set(false);
    }
  }

  private renderImageSource(src: string): void {
    if (typeof Image === 'undefined') return;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      this.imageDimensions.set({ width: img.naturalWidth, height: img.naturalHeight });

      // Keep aspect ratio within 1600px max bounds for smooth browser canvas handling
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      const maxDim = 1600;
      if (w > maxDim || h > maxDim) {
        if (w >= h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      this.sourceCanvas.width = w;
      this.sourceCanvas.height = h;
      const ctx = this.sourceCanvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
      }

      this.reprocessSimulation();
      this.analyzeImageAccessibility();
      this.isLoading.set(false);
      this.resetZoom();
      this.cdr?.markForCheck();
    };

    img.onerror = () => {
      this.setErrorMessage('Failed to decode image data.');
      this.isLoading.set(false);
      this.cdr?.markForCheck();
    };

    img.src = src;
  }

  public reprocessSimulation(): void {
    if (this.sourceCanvas.width === 0 || this.sourceCanvas.height === 0) return;

    // Apply CVD Matrix to offscreen simulation canvas
    this.cvdService.simulateCanvas(this.sourceCanvas, this.simCanvas, this.selectedType());
    this.redrawCanvasView();
  }

  public redrawCanvasView(): void {
    const mode = this.viewMode();
    const profile = this.activeProfile();

    if (mode === 'side-by-side') {
      const origCanvas = this.sideOrigRef?.nativeElement;
      const simCanvasEl = this.sideSimRef?.nativeElement;
      if (origCanvas && simCanvasEl) {
        origCanvas.width = this.sourceCanvas.width;
        origCanvas.height = this.sourceCanvas.height;
        const oCtx = origCanvas.getContext('2d');
        oCtx?.drawImage(this.sourceCanvas, 0, 0);

        simCanvasEl.width = this.simCanvas.width;
        simCanvasEl.height = this.simCanvas.height;
        const sCtx = simCanvasEl.getContext('2d');
        sCtx?.drawImage(this.simCanvas, 0, 0);
      }
      return;
    }

    const canvas = this.displayCanvasRef?.nativeElement;
    if (!canvas) return;

    if (mode === 'simulated-only') {
      canvas.width = this.simCanvas.width;
      canvas.height = this.simCanvas.height;
      const ctx = canvas.getContext('2d');
      if (this.isPeekingOriginal()) {
        ctx?.drawImage(this.sourceCanvas, 0, 0);
      } else {
        ctx?.drawImage(this.simCanvas, 0, 0);
      }
    } else {
      // Split Slider Mode
      this.cvdService.renderSplitComparison(
        this.sourceCanvas,
        this.simCanvas,
        this.splitRatio(),
        canvas,
        {
          drawBadges: true,
          labelOriginal: 'Normal Vision',
          labelSimulated: profile.title
        }
      );
    }
  }

  public clearImage(): void {
    this.cleanupMemory();
    this.currentImageName.set(null);
    this.imageDimensions.set(null);
    this.imageFileSize.set(null);
    this.sourceCanvas.width = 0;
    this.sourceCanvas.height = 0;
    this.simCanvas.width = 0;
    this.simCanvas.height = 0;
    this.hoverPixelData.set(null);
    this.imageInsights.set(null);
    this.resetZoom();
    this.redrawCanvasView();
    this.state.showToast('Image cleared');
  }

  // ── Split Slider Drag Interactions ────────────────────────────────────────
  public onSplitSliderInput(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    this.splitRatio.set(val / 100);
    this.redrawCanvasView();
  }

  public startSliderDrag(event: MouseEvent | TouchEvent): void {
    this.isDraggingSlider = true;
    this.updateSplitFromEvent(event);
  }

  private updateSplitFromEvent(event: MouseEvent | TouchEvent): void {
    const canvas = this.displayCanvasRef?.nativeElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const x = clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    this.splitRatio.set(ratio);
    this.redrawCanvasView();
  }

  // ── Peek Original In Simulated View ───────────────────────────────────────
  public startPeekingOriginal(): void {
    this.isPeekingOriginal.set(true);
    this.redrawCanvasView();
  }

  public stopPeekingOriginal(): void {
    this.isPeekingOriginal.set(false);
    this.redrawCanvasView();
  }

  // ── Color Inspector ───────────────────────────────────────────────────────
  public toggleInspector(): void {
    this.isInspectorActive.update(v => !v);
    if (!this.isInspectorActive()) {
      this.hoverPixelData.set(null);
    }
  }

  public onCanvasMouseMove(event: MouseEvent, targetCanvas: HTMLCanvasElement): void {
    if (!this.isInspectorActive() || this.sourceCanvas.width === 0) return;

    const rect = targetCanvas.getBoundingClientRect();
    const scaleX = this.sourceCanvas.width / rect.width;
    const scaleY = this.sourceCanvas.height / rect.height;

    const clientX = event.clientX;
    const clientY = event.clientY;

    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;

    const imgX = Math.floor(canvasX * scaleX);
    const imgY = Math.floor(canvasY * scaleY);

    if (imgX < 0 || imgX >= this.sourceCanvas.width || imgY < 0 || imgY >= this.sourceCanvas.height) {
      this.hoverPixelData.set(null);
      return;
    }

    const sCtx = this.sourceCanvas.getContext('2d', { willReadFrequently: true });
    const dCtx = this.simCanvas.getContext('2d', { willReadFrequently: true });
    if (!sCtx || !dCtx) return;

    const origP = sCtx.getImageData(imgX, imgY, 1, 1).data;
    const simP = dCtx.getImageData(imgX, imgY, 1, 1).data;

    const origRgb = { r: origP[0], g: origP[1], b: origP[2] };
    const simRgb = { r: simP[0], g: simP[1], b: simP[2] };

    const origHex = this.engine.rgbToHex(origRgb);
    const simHex = this.engine.rgbToHex(simRgb);

    const deltaE = Number(this.cvdService.calculateDeltaE(origRgb, simRgb).toFixed(1));

    this.hoverPixelData.set({
      screenX: clientX,
      screenY: clientY,
      imgX,
      imgY,
      origHex,
      origRgb: `rgb(${origRgb.r}, ${origRgb.g}, ${origRgb.b})`,
      simHex,
      simRgb: `rgb(${simRgb.r}, ${simRgb.g}, ${simRgb.b})`,
      deltaE
    });
  }

  public onCanvasMouseLeave(): void {
    this.hoverPixelData.set(null);
  }

  // ── Image Accessibility Sampling Analysis ─────────────────────────────────
  private analyzeImageAccessibility(): void {
    const w = this.sourceCanvas.width;
    const h = this.sourceCanvas.height;
    if (w === 0 || h === 0) {
      this.imageInsights.set(null);
      return;
    }

    const ctx = this.sourceCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const samples: string[] = [];
    const cols = 4;
    const rows = 3;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = Math.floor((w * (c + 0.5)) / cols);
        const y = Math.floor((h * (r + 0.5)) / rows);
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        if (pixel[3] > 64) {
          const hex = this.engine.rgbToHex({ r: pixel[0], g: pixel[1], b: pixel[2] });
          if (!samples.includes(hex)) {
            samples.push(hex);
          }
        }
      }
    }

    if (samples.length >= 2) {
      const res = this.cvdService.simulatePalette(samples, this.selectedType());
      this.imageInsights.set({
        riskCount: res.riskCount,
        confusionPairs: res.confusionPairs
      });
    } else {
      this.imageInsights.set(null);
    }
  }

  // ── Palette Simulation & Conflict Detection ───────────────────────────────
  public importFromActiveColor(): void {
    const active = this.state.activeColor();
    const current = this.paletteColors();
    if (!current.includes(active)) {
      this.paletteColors.set([...current, active]);
      this.state.showToast(`Added ${active} to simulation palette`);
    }
  }

  public importSharedPalette(): void {
    const shared = this.state.sharedWorkingPalette();
    if (shared && shared.length > 0) {
      this.paletteColors.set([...shared]);
      this.state.showToast(`Imported ${shared.length} colors from Shared Palette`);
    }
  }

  public isDarkColor(hex: string): boolean {
    return this.engine.isDark(hex);
  }

  public copySimulatedHex(hex: string): void {
    this.state.copyToClipboard(hex.toUpperCase(), `${this.activeProfile().title} HEX`);
  }

  public setAsActiveColor(hex: string): void {
    this.state.setActiveColor(hex);
    this.state.showToast(`Set ${hex} as active studio color`);
  }

  // ── Cross-Module Dispatches ───────────────────────────────────────────────
  public sendSimulatedToPicker(hex: string): void {
    this.state.sendToPicker(hex);
  }

  public sendSimulatedPaletteToGenerator(): void {
    const simColors = this.simulationResult().items.map(i => i.simulatedHex);
    this.state.populateGradientFromPalette(simColors);
    this.state.sendPaletteToSimulator(simColors);
    this.state.setActiveModule('palette');
    this.state.showToast(`Loaded ${simColors.length} simulated colors into Palette Generator`);
  }

  public sendSimulatedPaletteToSharedBar(): void {
    const simColors = this.simulationResult().items.map(i => i.simulatedHex);
    this.state.setSharedPalette(simColors);
    this.state.showToast(`Saved ${simColors.length} simulated colors to Shared Bar`);
  }

  // ── Exports Suite ─────────────────────────────────────────────────────────
  public toggleExportMenu(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.showExportMenu.update(v => !v);
  }

  public downloadSimulatedImage(mimeType: 'image/png' | 'image/jpeg' | 'image/webp'): void {
    this.showExportMenu.set(false);
    if (this.simCanvas.width === 0) return;

    const ext = mimeType === 'image/jpeg' ? 'jpg' : (mimeType === 'image/webp' ? 'webp' : 'png');
    const filename = `simulated-${this.selectedType()}.${ext}`;
    this.cvdService.downloadCanvas(this.simCanvas, filename, mimeType);
    this.state.showToast(`Downloaded ${filename}`);
  }

  public downloadOriginalImage(): void {
    this.showExportMenu.set(false);
    if (this.sourceCanvas.width === 0) return;

    const filename = `original-image.png`;
    this.cvdService.downloadCanvas(this.sourceCanvas, filename, 'image/png');
    this.state.showToast(`Downloaded ${filename}`);
  }

  public downloadSplitSnapshot(): void {
    this.showExportMenu.set(false);
    if (this.sourceCanvas.width === 0) return;

    const splitCanvas = document.createElement('canvas');
    this.cvdService.renderSplitComparison(
      this.sourceCanvas,
      this.simCanvas,
      this.splitRatio(),
      splitCanvas,
      {
        drawBadges: true,
        labelOriginal: 'Normal Vision',
        labelSimulated: this.activeProfile().title
      }
    );

    const filename = `split-snapshot-${this.selectedType()}.png`;
    this.cvdService.downloadCanvas(splitCanvas, filename, 'image/png');
    this.state.showToast(`Downloaded ${filename}`);
  }

  public downloadComparisonSnapshot(): void {
    this.showExportMenu.set(false);
    if (this.sourceCanvas.width === 0) return;

    const compCanvas = document.createElement('canvas');
    this.cvdService.renderSideBySideComparison(
      this.sourceCanvas,
      this.simCanvas,
      compCanvas,
      'Normal Vision (Trichromacy)',
      `${this.activeProfile().title} (${this.activeProfile().subtitle})`
    );

    const filename = `comparison-${this.selectedType()}.png`;
    this.cvdService.downloadCanvas(compCanvas, filename, 'image/png');
    this.state.showToast(`Downloaded ${filename}`);
  }

  public exportPaletteJson(): void {
    const json = this.cvdService.generatePaletteSimulationJson(
      this.simulationResult(),
      'Color Studio CVD Audit'
    );
    this.exportService.downloadFile(json, `palette-audit-${this.selectedType()}.json`, 'application/json');
    this.state.showToast(`Downloaded palette-audit-${this.selectedType()}.json`);
  }

  public exportReportMarkdown(): void {
    const md = this.cvdService.generateReportMarkdown(
      this.simulationResult(),
      'Color Studio Palette'
    );
    this.exportService.downloadFile(md, `accessibility-report-${this.selectedType()}.md`, 'text/markdown');
    this.state.showToast(`Downloaded accessibility-report-${this.selectedType()}.md`);
  }
}

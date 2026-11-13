// apps/tool-color-studio/src/components/extractor/image-extractor-module.component.ts
import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ColorStudioStateService } from '../../services/color-studio-state.service';
import { ColorEngineService } from '../../services/color-engine.service';
import { ExtractedColor, SavedPalette, RgbColor } from '../../models/color.models';
import { TsIconComponent } from '@acklet/tool-shell';
import {
  SavedPalettesPopoverComponent,
  WorkingPalettePopoverComponent
} from '../popovers';

export interface ImageMetadata {
  name: string;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
}

export interface SelectedPixelInfo {
  hex: string;
  rgb: RgbColor;
  rgbString: string;
  x: number;
  y: number;
  xPercent: number;
  yPercent: number;
}

// Built-in sample images preserved for testing contracts
export const SAMPLE_IMAGES = [
  {
    name: 'Sunset Coast',
    dataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260"><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="%231E1B4B"/><stop offset="35%" stop-color="%23E11D48"/><stop offset="70%" stop-color="%23F59E0B"/><stop offset="100%" stop-color="%23FDE68A"/></linearGradient><linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="%23F59E0B"/><stop offset="20%" stop-color="%230F766E"/><stop offset="100%" stop-color="%23042F2E"/></linearGradient></defs><rect width="400" height="170" fill="url(%23sky)"/><circle cx="200" cy="170" r="50" fill="%23FFFBEB"/><rect y="170" width="400" height="90" fill="url(%23sea)"/><polygon points="0,170 80,120 180,170" fill="%231E1B4B" opacity="0.6"/><polygon points="260,170 340,135 400,170" fill="%231E1B4B" opacity="0.7"/></svg>`
  },
  {
    name: 'Cyber Neon',
    dataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260"><rect width="400" height="260" fill="%230B0F19"/><circle cx="100" cy="130" r="80" fill="%23EC4899" opacity="0.7"/><circle cx="280" cy="110" r="90" fill="%2306B6D4" opacity="0.7"/><polygon points="200,40 320,220 80,220" fill="%238B5CF6" opacity="0.5"/><rect x="140" y="80" width="120" height="120" rx="20" fill="%23F43F5E" opacity="0.8"/></svg>`
  },
  {
    name: 'Nordic Forest',
    dataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260"><rect width="400" height="260" fill="%23F1F5F9"/><polygon points="80,260 140,110 200,260" fill="%231E3A8A"/><polygon points="170,260 230,80 290,260" fill="%230F766E"/><polygon points="240,260 300,130 360,260" fill="%2310B981"/><circle cx="340" cy="60" r="30" fill="%23F59E0B"/></svg>`
  }
];

@Component({
  selector: 'app-image-extractor-module',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TsIconComponent,
    SavedPalettesPopoverComponent,
    WorkingPalettePopoverComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div 
      class="extractor-container"
      (dragenter)="onWorkspaceDragEnter($event)"
      (dragover)="onWorkspaceDragOver($event)"
      (dragleave)="onWorkspaceDragLeave($event)"
      (drop)="onWorkspaceDrop($event)"
    >
      
      <!-- Full-Workspace Drag & Drop Overlay -->
      @if (isWorkspaceDragging()) {
        <div class="workspace-drag-overlay animate-fade-in">
          <div class="drag-overlay-card">
            <ts-icon name="upload" [size]="40" class="drag-overlay-icon" />
            <h3 class="drag-overlay-title">Drop image anywhere</h3>
            <p class="drag-overlay-sub">Release to extract dominant colors</p>
          </div>
        </div>
      }

      <!-- Consolidated Workspace Module Header -->
      <div class="workspace-module-header">
        <div class="header-titles">
          <h2 class="workspace-title">Image Color Extractor</h2>
          <p class="workspace-subtitle">Extract dominant colors and inspect pixels directly from any image.</p>
        </div>

        <div class="workspace-actions" role="toolbar" aria-label="Image Extractor Tools">
          <!-- When image is loaded: Replace and Clear buttons -->
          @if (imageMetadata()) {
            <label class="toolbar-action-btn primary" title="Replace current image">
              <ts-icon name="refresh-cw" [size]="13" />
              <span>Replace Image</span>
              <input 
                #fileInput
                type="file" 
                accept="image/png,image/jpeg,image/jpg,image/webp" 
                (click)="fileInput.value = ''"
                (change)="onFileSelected($event)" 
                style="display: none;" 
              />
            </label>

            <button 
              type="button" 
              class="toolbar-action-btn" 
              (click)="clearImage()"
              title="Remove image and reset stage"
              aria-label="Remove image"
            >
              <ts-icon name="trash-2" [size]="13" />
              <span>Clear</span>
            </button>

            <div class="toolbar-divider" aria-hidden="true"></div>
          }

          <!-- Saved Palettes Popover Anchor -->
          <div class="popover-anchor">
            <button 
              type="button" 
              class="toolbar-action-btn"
              [class.active]="activePopover() === 'palettes'"
              (click)="togglePopover('palettes')"
              title="Saved Palettes"
              aria-label="Saved Palettes"
              [attr.aria-expanded]="activePopover() === 'palettes'"
            >
              <ts-icon name="palette" [size]="14" />
              <span>Saved Palettes</span>
              @if (state.savedPalettes().length > 0) {
                <span class="btn-count-pill">{{ state.savedPalettes().length }}</span>
              }
            </button>
            @if (activePopover() === 'palettes') {
              <app-saved-palettes-popover (close)="closePopover()" />
            }
          </div>

          <!-- Working Palette Popover Anchor -->
          <div class="popover-anchor">
            <button 
              type="button" 
              class="toolbar-action-btn"
              [class.active]="activePopover() === 'palette'"
              (click)="togglePopover('palette')"
              title="Shared Working Palette"
              aria-label="Working palette"
              [attr.aria-expanded]="activePopover() === 'palette'"
            >
              <ts-icon name="layers" [size]="14" />
              <span>Working Palette</span>
              @if (state.sharedColorPalettes().length > 0) {
                <span class="btn-count-pill">{{ state.sharedColorPalettes().length }}</span>
              }
            </button>
            @if (activePopover() === 'palette') {
              <app-working-palette-popover (close)="closePopover()" />
            }
          </div>

          <!-- Contextual Cross-Module Transfers when colors are present -->
          @if (imageMetadata() && colors().length > 0) {
            <div class="toolbar-divider" aria-hidden="true"></div>
            
            <button 
              type="button" 
              class="toolbar-action-btn" 
              (click)="applyAsPalette()" 
              title="Transfer colors to Palette Generator"
            >
              <ts-icon name="sparkles" [size]="13" />
              <span>To Palette</span>
            </button>

            <button 
              type="button" 
              class="toolbar-action-btn" 
              (click)="applyAsGradient()" 
              title="Transfer colors to Gradient Builder"
              [disabled]="colors().length < 2"
            >
              <ts-icon name="layers" [size]="13" />
              <span>To Gradient</span>
            </button>
          }

        </div>
      </div>

      <!-- Upload Error Notification -->
      @if (errorMessage()) {
        <div class="error-alert">
          <ts-icon name="alert-circle" [size]="16" />
          <span class="error-text">{{ errorMessage() }}</span>
          <button type="button" class="dismiss-btn" (click)="setErrorMessage(null)" title="Dismiss">
            <ts-icon name="x" [size]="13" />
          </button>
        </div>
      }

      <!-- ══════════════════════════════════════════════════════════════════════ -->
      <!-- INITIAL EMPTY STATE (Visible only when no image is loaded)            -->
      <!-- ══════════════════════════════════════════════════════════════════════ -->
      <div class="empty-upload-card" [class.hidden-state]="imageMetadata()">
        <div 
          class="upload-dropzone"
          (click)="emptyFileInput.click()"
          role="button"
          tabindex="0"
          (keydown.enter)="emptyFileInput.click()"
          (keydown.space)="emptyFileInput.click()"
          aria-label="Upload an image to extract colors"
        >
          <div class="upload-icon-wrapper">
            <ts-icon name="upload" [size]="36" class="upload-icon" />
          </div>

          <h3 class="upload-title">Extract Colors from an Image</h3>
          <p class="upload-instruction">Upload or drag an image here to extract its colors.</p>

          <button 
            type="button" 
            class="upload-primary-btn" 
            (click)="$event.stopPropagation(); emptyFileInput.click()"
          >
            <ts-icon name="upload" [size]="14" />
            <span>Upload Image</span>
          </button>

          <span class="upload-formats-hint">Supports PNG, JPG, JPEG, and WebP up to 25 MB</span>

          <input 
            #emptyFileInput
            type="file" 
            accept="image/png,image/jpeg,image/jpg,image/webp" 
            (click)="emptyFileInput.value = ''"
            (change)="onFileSelected($event)" 
            style="display: none;" 
          />
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════════════════ -->
      <!-- UPLOADED WORKSPACE (Always in DOM for stable canvas lifecycle)        -->
      <!-- ══════════════════════════════════════════════════════════════════════ -->
      <div class="extractor-stage-grid" [class.hidden-state]="!imageMetadata()">
          
          <!-- LEFT COLUMN: Canvas Preview, Zoom Controls & Pixel Sampling -->
          <div class="canvas-stage-column">
            
            <div 
              class="canvas-stage-card" 
              [class.dragover]="isDraggingOver()"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onDrop($event)"
            >
              
              <!-- Image Metadata Bar with Zoom Controls -->
              <div class="image-meta-bar">
                <div class="meta-left">
                  <span class="meta-filename" [title]="imageMetadata()?.name">{{ imageMetadata()?.name }}</span>
                  <span class="meta-pill">{{ imageMetadata()?.width }} × {{ imageMetadata()?.height }} px</span>
                  <span class="meta-pill">{{ formatBytes(imageMetadata()?.sizeBytes || 0) }}</span>
                  <span class="meta-pill format">{{ imageMetadata()?.mimeType?.replace('image/', '')?.toUpperCase() }}</span>
                </div>

                <!-- Zoom Controls -->
                <div class="zoom-controls-group" role="toolbar" aria-label="Image zoom controls">
                  <button 
                    type="button" 
                    class="zoom-btn" 
                    (click)="zoomOut()" 
                    title="Zoom Out (-25%)"
                    [disabled]="zoomLevel() <= 0.25"
                  >
                    <ts-icon name="zoom-out" [size]="13" />
                  </button>

                  <span class="zoom-level-pill font-mono">{{ zoomPercent() }}%</span>

                  <button 
                    type="button" 
                    class="zoom-btn" 
                    (click)="zoomIn()" 
                    title="Zoom In (+25%)"
                    [disabled]="zoomLevel() >= 5"
                  >
                    <ts-icon name="zoom-in" [size]="13" />
                  </button>

                  <button 
                    type="button" 
                    class="zoom-btn" 
                    (click)="fitToScreen()" 
                    title="Fit to Screen"
                  >
                    <ts-icon name="maximize-2" [size]="12" />
                  </button>

                  <button 
                    type="button" 
                    class="zoom-btn" 
                    (click)="resetZoom()" 
                    title="Reset Zoom (100%)"
                  >
                    <ts-icon name="rotate-ccw" [size]="12" />
                  </button>
                </div>
              </div>

              <!-- Canvas Viewport with Pan & Zoom support -->
              <div 
                #viewportRef
                class="canvas-viewport"
                [class.panning]="zoomLevel() > 1"
                (wheel)="onWheel($event)"
                (mousedown)="onViewportMouseDown($event)"
                (touchstart)="onViewportTouchStart($event)"
                (touchmove)="onViewportTouchMove($event)"
                (touchend)="onViewportTouchEnd()"
              >
                <div 
                  class="canvas-transform-layer"
                  [style.transform]="'translate(' + panX() + 'px, ' + panY() + 'px) scale(' + zoomLevel() + ')'"
                >
                  <div class="checkerboard-backdrop"></div>
                  
                  <canvas 
                    #imageCanvas 
                    class="interactive-canvas"
                    (mousemove)="onCanvasMouseMove($event)"
                    (mouseleave)="onCanvasMouseLeave()"
                    (click)="onCanvasClick($event)"
                  ></canvas>

                  <!-- Hover Pixel Magnifier Loupe -->
                  @if (hoverPixel() && !isLoading()) {
                    <div 
                      class="pixel-loupe" 
                      [style.left.px]="loupeX()" 
                      [style.top.px]="loupeY()"
                    >
                      <div class="loupe-swatch" [style.background-color]="hoverPixel()!"></div>
                      <div class="loupe-info">
                        <span class="loupe-hex font-mono">{{ hoverPixel() }}</span>
                        <span class="loupe-coords">{{ hoverPixelX() }}, {{ hoverPixelY() }}</span>
                      </div>
                    </div>
                  }

                  <!-- Clicked Pixel Sampling Pin Marker -->
                  @if (selectedPixel(); as pin) {
                    <div 
                      class="pixel-pin-marker" 
                      [style.left.%]="pin.xPercent" 
                      [style.top.%]="pin.yPercent"
                      [title]="'Sampled ' + pin.hex"
                    >
                      <div class="pin-dot" [style.background-color]="pin.hex"></div>
                      <div class="pin-ring"></div>
                    </div>
                  }
                </div>

                <!-- Loading Overlay -->
                @if (isLoading()) {
                  <div class="canvas-loading-overlay">
                    <div class="spinner"></div>
                    <span>Analyzing image colors...</span>
                  </div>
                }
              </div>

              <div class="canvas-hint">
                <ts-icon name="info" [size]="13" />
                <span>Click any pixel to sample. Mouse wheel zooms. Drag to pan when zoomed.</span>
              </div>
            </div>

          </div>

          <!-- RIGHT COLUMN: Extracted Palette Grid, Size Selector & Export -->
          <div class="extractor-sidebar-column">

            <!-- Pixel Sampling Result Card (Positioned ABOVE Extracted Palette) -->
            @if (selectedPixel(); as pixel) {
              <div class="sampled-pixel-card animate-fade-in">
                <div class="pixel-card-header">
                  <span class="pixel-card-title">Sampled Pixel Color</span>
                  <div class="pixel-header-right">
                    <span class="pixel-coords font-mono">At {{ pixel.x }}, {{ pixel.y }} px</span>
                    <button 
                      type="button" 
                      class="icon-tiny-btn dismiss-pixel-btn" 
                      (click)="selectedPixel.set(null)" 
                      title="Clear sampled pixel"
                    >
                      <ts-icon name="x" [size]="12" />
                    </button>
                  </div>
                </div>

                <div class="pixel-card-body">
                  <div class="pixel-swatch-large" [style.background-color]="pixel.hex"></div>

                  <div class="pixel-details">
                    <div class="pixel-val-row">
                      <span class="val-label">HEX</span>
                      <span class="val-code font-mono">{{ pixel.hex }}</span>
                      <button 
                        type="button" 
                        class="icon-tiny-btn" 
                        (click)="state.copyToClipboard(pixel.hex, 'HEX')" 
                        title="Copy HEX"
                      >
                        <ts-icon name="copy" [size]="12" />
                      </button>
                    </div>

                    <div class="pixel-val-row">
                      <span class="val-label">RGB</span>
                      <span class="val-code font-mono">{{ pixel.rgbString }}</span>
                      <button 
                        type="button" 
                        class="icon-tiny-btn" 
                        (click)="state.copyToClipboard(pixel.rgbString, 'RGB')" 
                        title="Copy RGB"
                      >
                        <ts-icon name="copy" [size]="12" />
                      </button>
                    </div>
                  </div>

                  <div class="pixel-actions">
                    <button 
                      type="button" 
                      class="pixel-action-btn primary" 
                      (click)="state.setSelectedColor(pixel.hex)"
                    >
                      <ts-icon name="pipette" [size]="13" />
                      <span>Select Color</span>
                    </button>

                    <button 
                      type="button" 
                      class="pixel-action-btn" 
                      [class.saved]="state.isColorSaved(pixel.hex)"
                      (click)="state.toggleSavedColor(pixel.hex, 'Pixel ' + pixel.hex)"
                    >
                      <ts-icon name="bookmark" [size]="13" />
                      <span>{{ state.isColorSaved(pixel.hex) ? 'Saved' : 'Bookmark' }}</span>
                    </button>
                  </div>
                </div>
              </div>
            }
            
            <div class="results-card">
              
              <!-- Header: Title + Palette Size Selector -->
              <div class="results-header">
                <div>
                  <h3 class="results-title">Extracted Palette</h3>
                  <p class="results-subtitle">{{ colors().length }} dominant colors extracted</p>
                </div>

                <!-- Palette Size Selector with Clear Highlighting -->
                <div class="palette-size-selector">
                  <span class="size-label">Size:</span>
                  <div class="size-pill-group" role="radiogroup" aria-label="Palette size selector">
                    @for (size of availableSizes; track size) {
                      <button 
                        type="button" 
                        role="radio"
                        class="size-pill" 
                        [class.active]="selectedSize() === size"
                        [attr.aria-checked]="selectedSize() === size"
                        (click)="changePaletteSize(size)"
                        [title]="size + ' colors'"
                      >
                        {{ size }}
                      </button>
                    }
                  </div>
                </div>
              </div>

              <!-- Toolbar: Consolidated Copy Dropdown & Save Palette Action -->
              <div class="palette-tools-bar">
                
                <!-- Copy Action Dropdown -->
                <div class="popover-anchor">
                  <button 
                    type="button" 
                    class="palette-tool-btn" 
                    (click)="copyMenuOpen.update(v => !v)"
                    [class.active]="copyMenuOpen()"
                    title="Copy all extracted colors"
                    aria-label="Copy palette"
                  >
                    <ts-icon name="copy" [size]="13" />
                    <span>Copy</span>
                    <ts-icon name="chevron-down" [size]="11" />
                  </button>

                  @if (copyMenuOpen()) {
                    <div class="copy-dropdown animate-scale-in">
                      <button type="button" class="dropdown-item" (click)="copyAllHex(); copyMenuOpen.set(false)">
                        <span class="dropdown-item-title">HEX Values</span>
                        <span class="dropdown-item-desc font-mono">#E11D48, #3B82F6...</span>
                      </button>
                      <button type="button" class="dropdown-item" (click)="copyAllRgb(); copyMenuOpen.set(false)">
                        <span class="dropdown-item-title">RGB Values</span>
                        <span class="dropdown-item-desc font-mono">rgb(225, 29, 72)...</span>
                      </button>
                    </div>
                  }
                </div>

                <!-- Re-extract button -->
                <button 
                  type="button" 
                  class="palette-tool-btn" 
                  (click)="reExtract()" 
                  title="Re-extract colors from image"
                  [disabled]="isLoading() || !loadedImage"
                >
                  <ts-icon name="refresh-cw" [size]="12" />
                  <span>Re-extract</span>
                </button>

                <div class="tool-spacer"></div>

                <!-- Save Palette Input & Button -->
                <div class="inline-save-palette">
                  <input 
                    type="text" 
                    class="save-palette-input" 
                    [(ngModel)]="newPaletteName" 
                    placeholder="Palette Name..." 
                    maxlength="30"
                    (keydown.enter)="saveCurrentPalette()"
                  />
                  <button 
                    type="button" 
                    class="save-palette-btn" 
                    (click)="saveCurrentPalette()"
                    [disabled]="colors().length === 0"
                    title="Save current extracted palette"
                  >
                    <ts-icon name="plus" [size]="13" />
                    <span>Save</span>
                  </button>
                </div>

              </div>

              <!-- Responsive Grid of Color Cards -->
              <div class="palette-cards-grid">
                @if (colors().length === 0) {
                  <div class="empty-notice">
                    <span>No colors extracted. Upload an image to analyze its palette.</span>
                  </div>
                } @else {
                  @for (c of colors(); track c.hex; let idx = $index) {
                    <div 
                      class="color-grid-card"
                      [class.selected]="c.hex.toUpperCase() === state.activeColor().toUpperCase()"
                      (click)="state.setSelectedColor(c.hex)"
                      role="button"
                      tabindex="0"
                      [title]="'Click to set as active color: ' + c.hex"
                    >
                      <!-- Swatch Area with Active Badge & Bookmark Save Button -->
                      <div class="card-swatch-box" [style.background-color]="c.hex">
                        @if (c.hex.toUpperCase() === state.activeColor().toUpperCase()) {
                          <span class="active-badge">Active</span>
                        }

                        <button 
                          type="button" 
                          class="card-bookmark-btn" 
                          [class.saved]="state.isColorSaved(c.hex)"
                          (click)="toggleSaveColor(c, $event)"
                          [title]="state.isColorSaved(c.hex) ? 'Remove bookmark' : 'Save to bookmarks'"
                          aria-label="Bookmark color"
                        >
                          <ts-icon name="bookmark" [size]="12" />
                        </button>
                      </div>

                      <!-- Card Details -->
                      <div class="card-details">
                        <div class="card-meta-line">
                          <span class="card-hex font-mono">{{ c.hex }}</span>
                          <span class="card-percent">{{ c.percentage }}%</span>
                        </div>

                        <!-- Mini Prominence Progress Line -->
                        <div class="prominence-track">
                          <div class="prominence-bar" [style.width.%]="c.percentage"></div>
                        </div>

                        <div class="card-rgb-line">
                          <span class="card-rgb font-mono">rgb({{ c.rgb.r }}, {{ c.rgb.g }}, {{ c.rgb.b }})</span>
                          <button 
                            type="button" 
                            class="card-copy-btn" 
                            (click)="copySingleColor(c, $event)"
                            title="Copy HEX"
                            aria-label="Copy HEX"
                          >
                            <ts-icon name="copy" [size]="11" />
                          </button>
                        </div>
                      </div>

                    </div>
                  }
                }
              </div>

              <!-- Export Actions Toolbar -->
              <div class="export-actions-bar">
                <span class="export-bar-title">Export:</span>
                <button type="button" class="export-btn" (click)="exportAsJson()" [disabled]="colors().length === 0">
                  <ts-icon name="file-code" [size]="12" />
                  <span>JSON</span>
                </button>
                <button type="button" class="export-btn" (click)="exportAsCss()" [disabled]="colors().length === 0">
                  <ts-icon name="file-text" [size]="12" />
                  <span>CSS</span>
                </button>
                <button type="button" class="export-btn" (click)="downloadAsPng()" [disabled]="colors().length === 0">
                  <ts-icon name="image" [size]="12" />
                  <span>PNG</span>
                </button>
                <button type="button" class="export-btn" (click)="sendAllToSharedPalette()" [disabled]="colors().length === 0">
                  <ts-icon name="layers" [size]="12" />
                  <span>To Working Palette</span>
                </button>
              </div>

            </div>

          </div>

        </div>

      </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .extractor-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      width: 100%;
      position: relative;
    }

    /* Full-Workspace Drag & Drop Overlay */
    .workspace-drag-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(4px);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }

    .drag-overlay-card {
      background: var(--bg-1, #18181B);
      border: 2px dashed var(--tool-accent, #2563EB);
      border-radius: 16px;
      padding: 36px 48px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    }

    :host-context([data-theme="light"]) .drag-overlay-card {
      background: #FFFFFF;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    }

    .drag-overlay-icon {
      color: var(--tool-accent, #2563EB);
      margin-bottom: 4px;
    }

    .drag-overlay-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 0;
    }

    :host-context([data-theme="light"]) .drag-overlay-title {
      color: #0F172A;
    }

    .drag-overlay-sub {
      font-size: 13px;
      color: var(--text-2, #A1A1AA);
      margin: 0;
    }

    /* Workspace Module Header */
    .workspace-module-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 24px;
    }

    .header-titles {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .workspace-title {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--text, #F4F4F5);
      margin: 0;
    }

    :host-context([data-theme="light"]) .workspace-title {
      color: #0F172A;
    }

    .workspace-subtitle {
      font-size: 13px;
      color: var(--text-muted, #A1A1AA);
      margin: 0;
      line-height: 1.4;
    }

    :host-context([data-theme="light"]) .workspace-subtitle {
      color: #64748B;
    }

    .workspace-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    @media (max-width: 639px) {
      .workspace-title {
        font-size: 20px;
      }
      .workspace-actions {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        width: 100%;
        overflow-x: visible;
      }
      .toolbar-divider {
        display: none !important;
      }
      .popover-anchor {
        width: 100%;
        min-width: 0;
      }
      .popover-anchor .toolbar-action-btn {
        width: 100%;
      }
      .toolbar-file-upload,
      .toolbar-action-btn {
        width: 100%;
        min-width: 0;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-height: 42px;
        height: auto;
        padding: 6px 8px;
        box-sizing: border-box;
        position: relative;
      }
      .toolbar-action-btn span:not(.btn-count-pill) {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 10px;
        max-width: 100%;
        text-align: center;
      }
      .btn-count-pill {
        position: absolute;
        top: 4px;
        right: 4px;
      }
    }

    .toolbar-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 32px;
      padding: 0 12px;
      border-radius: 8px;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text, #F4F4F5);
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      cursor: pointer;
      transition: all 140ms ease;
    }

    :host-context([data-theme="light"]) .toolbar-action-btn {
      background: var(--bg-2, #F1F5F9);
      border-color: var(--border, rgba(0, 0, 0, 0.08));
      color: var(--text, #0F172A);
    }

    .toolbar-action-btn:hover:not(:disabled) {
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
    }

    .toolbar-action-btn.active {
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
      background: rgba(37, 99, 235, 0.08);
    }

    .toolbar-action-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .toolbar-action-btn.primary {
      background: var(--tool-accent, #2563EB);
      color: #FFFFFF;
      border-color: var(--tool-accent, #2563EB);
    }

    .toolbar-action-btn.primary:hover {
      filter: brightness(1.1);
    }

    .toolbar-divider {
      width: 1px;
      height: 20px;
      background: var(--border, rgba(255, 255, 255, 0.12));
      margin: 0 4px;
    }

    :host-context([data-theme="light"]) .toolbar-divider {
      background: rgba(0, 0, 0, 0.1);
    }

    .popover-anchor {
      position: relative;
    }

    .btn-count-pill {
      font-size: 10px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 10px;
      background: var(--tool-accent, #2563EB);
      color: #FFFFFF;
      line-height: 1.2;
    }

    /* Error Notification Alert */
    .error-alert {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 8px;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.25);
      color: #F87171;
      font-size: 12px;
    }

    .error-text {
      flex: 1;
      font-weight: 500;
    }

    .dismiss-btn {
      background: transparent;
      border: none;
      color: #F87171;
      cursor: pointer;
      padding: 2px;
      display: flex;
      align-items: center;
    }

    /* ══════════════════════════════════════════════════════════════════════════ */
    /* INITIAL EMPTY STATE UPLOAD CARD                                          */
    /* ══════════════════════════════════════════════════════════════════════════ */
    .empty-upload-card {
      width: 100%;
      background: var(--bg-1, #18181B);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 16px;
      padding: 48px 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 480px;
    }

    :host-context([data-theme="light"]) .empty-upload-card {
      background: var(--bg-1, #FFFFFF);
      border-color: var(--border, rgba(0, 0, 0, 0.08));
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .upload-dropzone {
      width: 100%;
      max-width: 620px;
      border: 2px dashed var(--border, rgba(255, 255, 255, 0.15));
      border-radius: 14px;
      padding: 48px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 14px;
      cursor: pointer;
      background: var(--bg-2, rgba(39, 39, 42, 0.4));
      transition: all 180ms ease;
    }

    :host-context([data-theme="light"]) .upload-dropzone {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.12);
    }

    .upload-dropzone:hover {
      border-color: var(--tool-accent, #2563EB);
      background: rgba(37, 99, 235, 0.04);
    }

    .upload-icon-wrapper {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      background: rgba(37, 99, 235, 0.12);
      color: var(--tool-accent, #2563EB);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 4px;
    }

    .upload-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 0;
    }

    :host-context([data-theme="light"]) .upload-title {
      color: #0F172A;
    }

    .upload-instruction {
      font-size: 14px;
      color: var(--text-2, #A1A1AA);
      margin: 0;
      max-width: 420px;
      line-height: 1.5;
    }

    :host-context([data-theme="light"]) .upload-instruction {
      color: #64748B;
    }

    .upload-primary-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 38px;
      padding: 0 20px;
      border-radius: 8px;
      background: var(--tool-accent, #2563EB);
      color: #FFFFFF;
      font-size: 13px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      margin-top: 6px;
      transition: filter 120ms ease;
    }

    .upload-primary-btn:hover {
      filter: brightness(1.1);
    }

    .upload-formats-hint {
      font-size: 12px;
      color: var(--text-3, #71717A);
    }

    /* ══════════════════════════════════════════════════════════════════════════ */
    /* UPLOADED TWO-COLUMN WORKSPACE                                             */
    /* ══════════════════════════════════════════════════════════════════════════ */
    .extractor-stage-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.25fr) minmax(360px, 1fr);
      gap: 20px;
      align-items: start;
    }

    @media (max-width: 1023px) {
      .extractor-stage-grid {
        grid-template-columns: 1fr;
      }
    }

    .canvas-stage-column,
    .extractor-sidebar-column {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .canvas-stage-card,
    .results-card,
    .sampled-pixel-card {
      background: var(--bg-1, #18181B);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 14px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    :host-context([data-theme="light"]) .canvas-stage-card,
    :host-context([data-theme="light"]) .results-card,
    :host-context([data-theme="light"]) .sampled-pixel-card {
      background: var(--bg-1, #FFFFFF);
      border-color: var(--border, rgba(0, 0, 0, 0.08));
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    /* Image Metadata Bar & Zoom Group */
    .image-meta-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
    }

    .meta-left {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .meta-filename {
      font-size: 13px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      max-width: 220px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host-context([data-theme="light"]) .meta-filename {
      color: #0F172A;
    }

    .meta-pill {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 6px;
      background: var(--bg-2, #27272A);
      color: var(--text-2, #A1A1AA);
    }

    :host-context([data-theme="light"]) .meta-pill {
      background: #F1F5F9;
      color: #475569;
    }

    .meta-pill.format {
      color: var(--tool-accent, #2563EB);
      background: rgba(37, 99, 235, 0.12);
      font-weight: 700;
    }

    .zoom-controls-group {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 7px;
      padding: 2px;
    }

    :host-context([data-theme="light"]) .zoom-controls-group {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.08);
    }

    .zoom-btn {
      width: 26px;
      height: 24px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      border-radius: 4px;
      color: var(--text-2, #A1A1AA);
      cursor: pointer;
      transition: all 120ms ease;
    }

    .zoom-btn:hover:not(:disabled) {
      color: var(--text, #F4F4F5);
      background: rgba(255, 255, 255, 0.08);
    }

    :host-context([data-theme="light"]) .zoom-btn:hover:not(:disabled) {
      color: #0F172A;
      background: rgba(0, 0, 0, 0.06);
    }

    .zoom-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .zoom-level-pill {
      font-size: 11px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      padding: 0 6px;
      min-width: 42px;
      text-align: center;
    }

    :host-context([data-theme="light"]) .zoom-level-pill {
      color: #0F172A;
    }

    /* Canvas Viewport */
    .canvas-viewport {
      position: relative;
      width: 100%;
      height: 440px;
      border-radius: 10px;
      overflow: hidden;
      background: var(--bg-2, #18181B);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: crosshair;
      user-select: none;
    }

    @media (max-width: 639px) {
      .canvas-viewport {
        height: clamp(220px, 55vh, 60vh);
        max-height: 60vh;
      }
    }

    :host-context([data-theme="light"]) .canvas-viewport {
      background: #F8FAFC !important;
      border: 1px solid rgba(0, 0, 0, 0.08) !important;
    }

    .canvas-viewport.panning {
      cursor: grab;
    }

    .canvas-viewport.panning:active {
      cursor: grabbing;
    }

    .hidden-state {
      display: none !important;
    }

    .canvas-transform-layer {
      position: relative;
      display: inline-block;
      transform-origin: center center;
      transition: transform 60ms linear;
    }

    .interactive-canvas {
      position: relative;
      z-index: 1;
      display: block;
      max-width: 100%;
      max-height: 440px;
      object-fit: contain;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
      border-radius: 4px;
    }

    .checkerboard-backdrop {
      position: absolute;
      inset: 0;
      z-index: 0;
      background-color: #18181B;
      background-image: 
        linear-gradient(45deg, #27272A 25%, transparent 25%), 
        linear-gradient(-45deg, #27272A 25%, transparent 25%), 
        linear-gradient(45deg, transparent 75%, #27272A 75%), 
        linear-gradient(-45deg, transparent 75%, #27272A 75%);
      background-size: 12px 12px;
      background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
      pointer-events: none;
    }

    :host-context([data-theme="light"]) .checkerboard-backdrop {
      background-color: #FFFFFF !important;
      background-image: 
        linear-gradient(45deg, #E2E8F0 25%, transparent 25%), 
        linear-gradient(-45deg, #E2E8F0 25%, transparent 25%), 
        linear-gradient(45deg, transparent 75%, #E2E8F0 75%), 
        linear-gradient(-45deg, transparent 75%, #E2E8F0 75%) !important;
    }

    .canvas-loading-overlay {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.85);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: #FFFFFF;
      font-size: 13px;
      font-weight: 600;
      z-index: 20;
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid rgba(255, 255, 255, 0.2);
      border-top-color: var(--tool-accent, #2563EB);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Magnifier Loupe */
    .pixel-loupe {
      position: absolute;
      pointer-events: none;
      transform: translate(12px, -45px);
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(4px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
      z-index: 30;
    }

    .loupe-swatch {
      width: 14px;
      height: 14px;
      border-radius: 3px;
      border: 1px solid #FFFFFF;
    }

    .loupe-info {
      display: flex;
      flex-direction: column;
    }

    .loupe-hex {
      font-size: 10px;
      font-weight: 700;
      color: #FFFFFF;
    }

    .loupe-coords {
      font-size: 9px;
      color: #94A3B8;
    }

    /* Sampling Pin Marker */
    .pixel-pin-marker {
      position: absolute;
      width: 16px;
      height: 16px;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 25;
    }

    .pin-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      border: 1.5px solid #FFFFFF;
      position: absolute;
      top: 4px;
      left: 4px;
    }

    .pin-ring {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 1.5px solid #FFFFFF;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5);
      position: absolute;
      inset: 0;
      animation: pinPulse 1.5s infinite;
    }

    @keyframes pinPulse {
      0% { transform: scale(0.9); opacity: 1; }
      50% { transform: scale(1.3); opacity: 0.4; }
      100% { transform: scale(0.9); opacity: 1; }
    }

    .canvas-hint {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: var(--text-3, #71717A);
    }

    /* Sampled Pixel Card */
    .sampled-pixel-card {
      gap: 12px;
    }

    .pixel-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .pixel-card-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-2, #A1A1AA);
    }

    :host-context([data-theme="light"]) .pixel-card-title {
      color: #64748B;
    }

    .pixel-coords {
      font-size: 11px;
      color: var(--text-3, #71717A);
    }

    .pixel-header-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .dismiss-pixel-btn {
      color: var(--text-3, #71717A);
      cursor: pointer;
    }

    .dismiss-pixel-btn:hover {
      color: var(--text-1, #F4F4F5);
    }

    :host-context([data-theme="light"]) .dismiss-pixel-btn:hover {
      color: #0F172A;
    }

    .pixel-card-body {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
    }

    .pixel-swatch-large {
      width: 44px;
      height: 44px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      flex-shrink: 0;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    }

    :host-context([data-theme="light"]) .pixel-swatch-large {
      border-color: rgba(0, 0, 0, 0.15);
    }

    .pixel-details {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
      min-width: 140px;
    }

    .pixel-val-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .val-label {
      width: 28px;
      font-size: 10px;
      font-weight: 700;
      color: var(--text-3, #71717A);
    }

    .val-code {
      font-size: 12px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .val-code {
      color: #0F172A;
    }

    .icon-tiny-btn {
      width: 20px;
      height: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      border-radius: 4px;
      color: var(--text-3, #71717A);
      cursor: pointer;
      transition: all 120ms ease;
    }

    .icon-tiny-btn:hover {
      color: var(--tool-accent, #2563EB);
      background: rgba(37, 99, 235, 0.08);
    }

    .pixel-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .pixel-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      height: 30px;
      padding: 0 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text, #F4F4F5);
      cursor: pointer;
      transition: all 120ms ease;
    }

    :host-context([data-theme="light"]) .pixel-action-btn {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.08);
      color: #0F172A;
    }

    .pixel-action-btn.primary {
      background: var(--tool-accent, #2563EB);
      color: #FFFFFF;
      border-color: var(--tool-accent, #2563EB);
    }

    .pixel-action-btn.primary:hover {
      filter: brightness(1.1);
    }

    .pixel-action-btn.saved {
      color: var(--tool-accent, #2563EB);
      border-color: var(--tool-accent, #2563EB);
    }

    /* ══════════════════════════════════════════════════════════════════════════ */
    /* RIGHT COLUMN: EXTRACTED PALETTE & CONTROLS                                */
    /* ══════════════════════════════════════════════════════════════════════════ */
    .results-card {
      gap: 16px;
    }

    .results-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }

    .results-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 0;
    }

    :host-context([data-theme="light"]) .results-title {
      color: #0F172A;
    }

    .results-subtitle {
      font-size: 12px;
      color: var(--text-2, #A1A1AA);
      margin: 2px 0 0 0;
    }

    :host-context([data-theme="light"]) .results-subtitle {
      color: #64748B;
    }

    /* Palette Size Selector */
    .palette-size-selector {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .size-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-2, #A1A1AA);
    }

    :host-context([data-theme="light"]) .size-label {
      color: #334155;
    }

    .size-pill-group {
      display: flex;
      align-items: center;
      gap: 3px;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 8px;
      padding: 3px;
    }

    :host-context([data-theme="light"]) .size-pill-group {
      background: #E2E8F0;
      border-color: #CBD5E1;
    }

    .size-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 32px;
      height: 26px;
      padding: 0 8px;
      border-radius: 6px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-2, #A1A1AA);
      font-size: 12px;
      font-weight: 700;
      line-height: 1;
      cursor: pointer;
      user-select: none;
      transition: all 120ms ease;
    }

    :host-context([data-theme="light"]) .size-pill {
      color: #334155;
    }

    .size-pill:hover:not(.active) {
      color: var(--text, #F4F4F5);
      background: rgba(255, 255, 255, 0.08);
    }

    :host-context([data-theme="light"]) .size-pill:hover:not(.active) {
      color: #0F172A;
      background: #FFFFFF;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
    }

    .size-pill.active {
      background: var(--tool-accent, #2563EB) !important;
      color: #FFFFFF !important;
      font-weight: 700 !important;
      box-shadow: 0 1px 3px rgba(37, 99, 235, 0.35);
    }

    :host-context([data-theme="light"]) .size-pill.active {
      background: #2563EB !important;
      color: #FFFFFF !important;
      font-weight: 700 !important;
    }

    @media (max-width: 639px) {
      .results-header {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
      }
      .palette-size-selector {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .size-pill-group {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        flex: 1;
        padding: 2px;
        gap: 2px;
      }
      .size-pill {
        min-width: 0;
        width: 100%;
        height: 38px;
        padding: 0 4px;
        font-size: 11px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }

    /* Palette Tools Bar */
    .palette-tools-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      padding-bottom: 4px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    @media (max-width: 639px) {
      .palette-tools-bar {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .palette-tools-bar > .popover-anchor,
      .palette-tools-bar > .palette-tool-btn {
        flex: 1;
      }
      .palette-tool-btn {
        width: 100%;
        min-height: 44px;
        justify-content: center;
      }
      .tool-spacer {
        display: none;
      }
      .inline-save-palette {
        width: 100%;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 8px;
      }
      .save-palette-input {
        flex: 1;
        min-width: 0;
        height: 40px;
        box-sizing: border-box;
      }
      .save-palette-btn {
        flex-shrink: 0;
        min-height: 40px;
        padding: 0 14px;
        white-space: nowrap;
        justify-content: center;
      }
    }

    :host-context([data-theme="light"]) .palette-tools-bar {
      border-bottom-color: rgba(0, 0, 0, 0.06);
    }

    .palette-tool-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      height: 30px;
      padding: 0 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text, #F4F4F5);
      cursor: pointer;
      transition: all 120ms ease;
    }

    :host-context([data-theme="light"]) .palette-tool-btn {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.08);
      color: #0F172A;
    }

    .palette-tool-btn:hover {
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
    }

    .palette-tool-btn.active {
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
      background: rgba(37, 99, 235, 0.08);
    }

    .copy-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 6px;
      width: 200px;
      background: var(--bg-1, #18181B);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      border-radius: 8px;
      padding: 4px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
      z-index: 50;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    :host-context([data-theme="light"]) .copy-dropdown {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.1);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
    }

    .dropdown-item {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
      padding: 8px 10px;
      border-radius: 5px;
      background: transparent;
      border: none;
      cursor: pointer;
      width: 100%;
      text-align: left;
      transition: background 120ms ease;
    }

    .dropdown-item:hover {
      background: var(--bg-2, #27272A);
    }

    :host-context([data-theme="light"]) .dropdown-item:hover {
      background: #F1F5F9;
    }

    .dropdown-item-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .dropdown-item-title {
      color: #0F172A;
    }

    .dropdown-item-desc {
      font-size: 10px;
      color: var(--text-3, #71717A);
    }

    .tool-spacer {
      flex: 1;
    }

    .inline-save-palette {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .save-palette-input {
      height: 30px;
      width: 140px;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 6px;
      padding: 0 8px;
      font-size: 11px;
      color: var(--text, #F4F4F5);
      outline: none;
      transition: border-color 120ms ease;
    }

    :host-context([data-theme="light"]) .save-palette-input {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.08);
      color: #0F172A;
    }

    .save-palette-input:focus {
      border-color: var(--tool-accent, #2563EB);
    }

    .save-palette-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      height: 30px;
      padding: 0 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      background: var(--tool-accent, #2563EB);
      color: #FFFFFF !important;
      border: 1px solid var(--tool-accent, #2563EB);
      cursor: pointer;
      transition: all 120ms ease;
      white-space: nowrap;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
    }

    .save-palette-btn:hover:not(:disabled) {
      background: #1D4ED8 !important;
      border-color: #1D4ED8 !important;
      color: #FFFFFF !important;
      box-shadow: 0 2px 6px rgba(37, 99, 235, 0.35);
    }

    .save-palette-btn:active:not(:disabled) {
      background: #1E40AF !important;
      border-color: #1E40AF !important;
    }

    .save-palette-btn:disabled {
      background: #27272A !important;
      border: 1px solid rgba(255, 255, 255, 0.12) !important;
      color: #71717A !important;
      cursor: not-allowed;
      opacity: 1 !important;
      box-shadow: none;
    }

    :host-context([data-theme="light"]) .save-palette-btn {
      background: #2563EB;
      border-color: #2563EB;
      color: #FFFFFF !important;
    }

    :host-context([data-theme="light"]) .save-palette-btn:hover:not(:disabled) {
      background: #1D4ED8 !important;
      border-color: #1D4ED8 !important;
      color: #FFFFFF !important;
      box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
    }

    :host-context([data-theme="light"]) .save-palette-btn:disabled {
      background: #F1F5F9 !important;
      border: 1px solid #CBD5E1 !important;
      color: #64748B !important;
      cursor: not-allowed;
      opacity: 1 !important;
    }

    :host-context([data-theme="light"]) .save-palette-btn:disabled:hover {
      background: #F1F5F9 !important;
      border-color: #CBD5E1 !important;
      color: #64748B !important;
    }

    /* ══════════════════════════════════════════════════════════════════════════ */
    /* RESPONSIVE GRID OF EXTRACTED COLOR CARDS                                  */
    /* ══════════════════════════════════════════════════════════════════════════ */
    .palette-cards-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      width: 100%;
    }

    @media (min-width: 640px) and (max-width: 1023px) {
      .palette-cards-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    @media (max-width: 639px) {
      .palette-cards-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .color-grid-card {
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 10px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      cursor: pointer;
      transition: transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
      outline: none;
    }

    :host-context([data-theme="light"]) .color-grid-card {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.08);
    }

    .color-grid-card:hover {
      transform: translateY(-2px);
      border-color: var(--tool-accent, #2563EB);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .color-grid-card:active {
      transform: translateY(0) scale(0.985);
    }

    .color-grid-card.selected {
      border-color: var(--tool-accent, #2563EB);
      box-shadow: 0 0 0 2px var(--tool-accent, #2563EB);
    }

    .card-swatch-box {
      width: 100%;
      height: 72px;
      position: relative;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    }

    .active-badge {
      position: absolute;
      top: 6px;
      left: 6px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      color: #FFFFFF;
    }

    .card-bookmark-btn {
      position: absolute;
      top: 6px;
      right: 6px;
      width: 24px;
      height: 24px;
      border-radius: 5px;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 120ms ease;
      z-index: 5;
    }

    @media (max-width: 1023px) {
      .card-bookmark-btn {
        width: 36px;
        height: 36px;
      }
      .card-bookmark-btn::after {
        content: '';
        position: absolute;
        inset: -6px;
      }
    }

    .card-bookmark-btn:hover {
      transform: scale(1.1);
    }

    @keyframes bookmark-pop {
      0% { transform: scale(0.8); }
      50% { transform: scale(1.3); }
      100% { transform: scale(1); }
    }

    .card-bookmark-btn.saved {
      background: var(--tool-accent, #2563EB);
      border-color: var(--tool-accent, #2563EB);
      color: #FFFFFF;
      animation: bookmark-pop 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .card-details {
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .card-meta-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .card-hex {
      font-size: 12px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .card-hex {
      color: #0F172A;
    }

    .card-percent {
      font-size: 11px;
      font-weight: 600;
      color: var(--tool-accent, #2563EB);
    }

    .prominence-track {
      width: 100%;
      height: 3px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.1);
      overflow: hidden;
    }

    :host-context([data-theme="light"]) .prominence-track {
      background: rgba(0, 0, 0, 0.08);
    }

    .prominence-bar {
      height: 100%;
      background: var(--tool-accent, #2563EB);
      border-radius: 2px;
    }

    .card-rgb-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
    }

    .card-rgb {
      font-size: 10px;
      color: var(--text-3, #71717A);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .card-copy-btn {
      width: 18px;
      height: 18px;
      border-radius: 4px;
      background: transparent;
      border: none;
      color: var(--text-3, #71717A);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 120ms ease;
    }

    .card-copy-btn:hover {
      color: var(--tool-accent, #2563EB);
      background: rgba(37, 99, 235, 0.1);
    }

    /* Export Actions Bar */
    .export-actions-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      padding-top: 6px;
      border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .export-actions-bar {
      border-top-color: rgba(0, 0, 0, 0.06);
    }

    .export-bar-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-3, #71717A);
      margin-right: 2px;
    }

    .export-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 26px;
      padding: 0 8px;
      border-radius: 5px;
      font-size: 11px;
      font-weight: 600;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text-2, #A1A1AA);
      cursor: pointer;
      transition: all 120ms ease;
    }

    :host-context([data-theme="light"]) .export-btn {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.08);
      color: #475569;
    }

    .export-btn:hover:not(:disabled) {
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
    }

    .export-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .empty-notice {
      padding: 24px 16px;
      text-align: center;
      font-size: 12px;
      color: var(--text-3, #71717A);
      grid-column: 1 / -1;
    }

    .font-mono {
      font-family: var(--ts-font-mono, monospace);
    }

    .animate-scale-in {
      animation: scaleIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }

    .animate-fade-in {
      animation: fadeIn 0.18s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `]
})
export class ImageExtractorModuleComponent implements AfterViewInit, OnDestroy {
  private _canvasRef: ElementRef<HTMLCanvasElement> | null = null;

  @ViewChild('imageCanvas')
  public set canvasRef(ref: ElementRef<HTMLCanvasElement> | null | undefined) {
    this._canvasRef = ref || null;
    if (ref && this.loadedImage) {
      this.renderAndExtract(this.loadedImage);
      this.fitToScreen();
      this.cdr?.detectChanges();
    }
  }

  public get canvasRef(): ElementRef<HTMLCanvasElement> | null {
    return this._canvasRef;
  }

  @ViewChild('viewportRef') public viewportRef!: ElementRef<HTMLDivElement>;

  public state = inject(ColorStudioStateService);
  private engine = inject(ColorEngineService);
  private cdr = inject(ChangeDetectorRef, { optional: true });

  // ── Testing Contract Preserved ───────────────────────────────────────────
  public sampleImages = SAMPLE_IMAGES;
  public colors = signal<ExtractedColor[]>([]);
  public isDraggingOver = signal<boolean>(false);
  public isLoading = signal<boolean>(false);
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

  // ── Palette Size Options (5, 8, 10, 12, 16) ──────────────────────────────
  public readonly availableSizes = [5, 8, 10, 12, 16];
  public selectedSize = signal<number>(8);

  // ── Image Metadata ────────────────────────────────────────────────────────
  public imageMetadata = signal<ImageMetadata | null>(null);

  // ── Zoom & Panning ────────────────────────────────────────────────────────
  public zoomLevel = signal<number>(1);
  public zoomPercent = computed<number>(() => Math.round(this.zoomLevel() * 100));
  public panX = signal<number>(0);
  public panY = signal<number>(0);

  // ── Pixel Magnifier & Selection ───────────────────────────────────────────
  public hoverPixel = signal<string | null>(null);
  public hoverPixelX = signal<number>(0);
  public hoverPixelY = signal<number>(0);
  public loupeX = signal<number>(0);
  public loupeY = signal<number>(0);
  public selectedPixel = signal<SelectedPixelInfo | null>(null);

  // ── Palette Saving & Renaming ─────────────────────────────────────────────
  public newPaletteName = '';
  public editingPaletteId = signal<string | null>(null);
  public editingPaletteName = '';

  // ── Contextual Popovers ───────────────────────────────────────────────────
  public activePopover = signal<'palettes' | 'palette' | null>(null);
  public copyMenuOpen = signal<boolean>(false);

  // ── Full-Workspace Drag & Drop ────────────────────────────────────────────
  public isWorkspaceDragging = signal<boolean>(false);
  private dragCounter = 0;

  // ── Panning State ─────────────────────────────────────────────────────────
  private isPanning = false;
  private panStartX = 0;
  private panStartY = 0;
  private hasPanned = false;

  public loadedImage: HTMLImageElement | null = null;
  private currentObjectUrl: string | null = null;

  public ngAfterViewInit(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', this.onGlobalMouseMove);
      window.addEventListener('mouseup', this.onGlobalMouseUp);
    }
  }

  public ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', this.onGlobalMouseMove);
      window.removeEventListener('mouseup', this.onGlobalMouseUp);
    }
    this.cleanupMemory();
  }

  // ── Popover Controls ──────────────────────────────────────────────────────
  public togglePopover(name: 'palettes' | 'palette'): void {
    this.activePopover.update(curr => (curr === name ? null : name));
  }

  public closePopover(): void {
    this.activePopover.set(null);
  }

  // ── Sample Image Loader (Preserved for tests/compatibility) ───────────────
  public loadSample(dataUri: string, sampleName = 'Sample Image'): void {
    this.cleanupMemory();
    this.isLoading.set(true);
    this.setErrorMessage(null);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.loadedImage = img;
      this.imageMetadata.set({
        name: sampleName,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        sizeBytes: Math.round(dataUri.length * 0.75),
        mimeType: 'image/svg+xml'
      });
      this.cdr?.detectChanges();
      this.renderAndExtract(img);
      this.fitToScreen();
      this.isLoading.set(false);
      this.cdr?.detectChanges();
    };
    img.onerror = () => {
      this.isLoading.set(false);
      this.setErrorMessage('Failed to load sample image.');
      this.cdr?.markForCheck();
    };
    img.src = dataUri;
  }

  // ── Workspace-Wide Drag and Drop ──────────────────────────────────────────
  public onWorkspaceDragEnter(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.dragCounter++;
    if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
      this.isWorkspaceDragging.set(true);
    }
  }

  public onWorkspaceDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    this.isWorkspaceDragging.set(true);
  }

  public onWorkspaceDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.dragCounter--;
    if (this.dragCounter <= 0) {
      this.dragCounter = 0;
      this.isWorkspaceDragging.set(false);
    }
  }

  public onWorkspaceDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.dragCounter = 0;
    this.isWorkspaceDragging.set(false);
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      this.processFile(e.dataTransfer.files[0]);
    }
  }

  // ── Canvas-Specific Drag and Drop (Preserved for backward compatibility) ──
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

  // ── File Selection & Image Processing ─────────────────────────────────────
  public onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.processFile(input.files[0]);
    }
  }

  public processFile(file: File): void {
    this.setErrorMessage(null);

    // Supported formats: PNG, JPG, JPEG, WebP
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
    this.resetZoom();

    let objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(file);
      this.currentObjectUrl = objectUrl;
    } catch {}

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = async () => {
      try {
        await img.decode();
      } catch {}

      this.loadedImage = img;
      this.imageMetadata.set({
        name: file.name,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        sizeBytes: file.size,
        mimeType: file.type || 'image/png'
      });

      this.renderAndExtract(img);
      this.fitToScreen();
      this.isLoading.set(false);
      this.state.showToast(`Loaded image ${file.name}`);
      this.cdr?.detectChanges();
    };

    img.onerror = () => {
      // Fallback to FileReader if object URL fails or in environments like JSDOM
      const reader = new FileReader();
      reader.onerror = () => {
        this.isLoading.set(false);
        this.setErrorMessage('Failed to read image file.');
        this.cdr?.detectChanges();
      };
      reader.onload = () => {
        const fallbackImg = new Image();
        fallbackImg.crossOrigin = 'anonymous';
        fallbackImg.onload = async () => {
          try { await fallbackImg.decode(); } catch {}
          this.loadedImage = fallbackImg;
          this.imageMetadata.set({
            name: file.name,
            width: fallbackImg.naturalWidth || fallbackImg.width,
            height: fallbackImg.naturalHeight || fallbackImg.height,
            sizeBytes: file.size,
            mimeType: file.type || 'image/png'
          });
          this.renderAndExtract(fallbackImg);
          this.fitToScreen();
          this.isLoading.set(false);
          this.state.showToast(`Loaded image ${file.name}`);
          this.cdr?.detectChanges();
        };
        fallbackImg.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    };

    if (objectUrl) {
      img.src = objectUrl;
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  public clearImage(): void {
    this.cleanupMemory();
    this.loadedImage = null;
    this.imageMetadata.set(null);
    this.colors.set([]);
    this.selectedPixel.set(null);
    this.hoverPixel.set(null);
    this.resetZoom();

    if (this.canvasRef) {
      const canvas = this.canvasRef.nativeElement;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    this.state.showToast('Image cleared');
    this.cdr?.detectChanges();
  }

  // ── Canvas Rendering & Color Extraction ───────────────────────────────────
  public renderAndExtract(img: HTMLImageElement): void {
    if (!this.canvasRef) {
      setTimeout(() => {
        if (this.canvasRef && this.loadedImage) {
          this.renderAndExtract(this.loadedImage);
          this.fitToScreen();
          this.cdr?.detectChanges();
        }
      }, 50);
      return;
    }
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Downsample large images to max 1200x1200 for high performance without precision loss
    const maxDim = 1200;
    let width = img.naturalWidth || img.width || 400;
    let height = img.naturalHeight || img.height || 260;

    if (width > maxDim || height > maxDim) {
      const ratio = Math.min(maxDim / width, maxDim / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    // Extract dominant colors with currently selected size
    this.extractColors(this.selectedSize());
    this.fitToScreen();
    this.cdr?.detectChanges();
  }

  public extractColors(count: number): void {
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const extracted = this.engine.extractColorsFromImageData(imageData, count);

    this.colors.set(extracted);
    this.state.extractedColors.set(extracted);
    this.cdr?.detectChanges();
  }

  public changePaletteSize(size: number): void {
    this.selectedSize.set(size);
    if (this.loadedImage && this.canvasRef) {
      this.extractColors(size);
      this.state.showToast(`Extracted ${size} colors`);
      this.cdr?.detectChanges();
    }
  }

  public reExtract(): void {
    if (this.loadedImage && this.canvasRef) {
      this.extractColors(this.selectedSize());
      this.state.showToast('Re-extracted dominant colors');
      this.cdr?.detectChanges();
    }
  }

  // ── Zoom & Pan Functionality ──────────────────────────────────────────────
  public zoomIn(): void {
    this.zoomLevel.update(z => Math.min(5.0, Number((z + 0.25).toFixed(2))));
  }

  public zoomOut(): void {
    this.zoomLevel.update(z => Math.max(0.25, Number((z - 0.25).toFixed(2))));
  }

  public resetZoom(): void {
    this.zoomLevel.set(1);
    this.panX.set(0);
    this.panY.set(0);
  }

  public fitToScreen(): void {
    if (!this.canvasRef || !this.loadedImage) return;
    const canvas = this.canvasRef.nativeElement;
    const viewport = this.viewportRef?.nativeElement;
    if (!viewport) return;

    const availW = Math.max(100, viewport.clientWidth - 40);
    const availH = Math.max(100, viewport.clientHeight - 40);
    if (canvas.width <= 0 || canvas.height <= 0) return;

    const scaleW = availW / canvas.width;
    const scaleH = availH / canvas.height;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const fitScale = isMobile ? scaleW : Math.min(scaleW, scaleH);

    // If image fits within viewport at 100%, keep 1.0; otherwise scale down to fit
    const targetScale = fitScale < 1.0 ? fitScale : 1.0;
    this.zoomLevel.set(Number(Math.max(0.1, Math.min(2.0, targetScale)).toFixed(2)));
    this.panX.set(0);
    this.panY.set(0);
  }

  private initialTouchDistance = 0;
  private initialZoomOnPinch = 1;

  public onViewportTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1 && this.zoomLevel() > 1) {
      this.isPanning = true;
      this.hasPanned = false;
      this.panStartX = e.touches[0].clientX - this.panX();
      this.panStartY = e.touches[0].clientY - this.panY();
    } else if (e.touches.length === 2) {
      this.isPanning = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      this.initialTouchDistance = Math.hypot(dx, dy);
      this.initialZoomOnPinch = this.zoomLevel();
    }
  }

  public onViewportTouchMove(e: TouchEvent): void {
    if (e.touches.length === 1 && this.isPanning) {
      e.preventDefault();
      const newX = e.touches[0].clientX - this.panStartX;
      const newY = e.touches[0].clientY - this.panStartY;
      this.panX.set(newX);
      this.panY.set(newY);
    } else if (e.touches.length === 2 && this.initialTouchDistance > 0) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const factor = currentDist / this.initialTouchDistance;
      const targetZoom = Math.min(5.0, Math.max(0.25, Number((this.initialZoomOnPinch * factor).toFixed(2))));
      this.zoomLevel.set(targetZoom);
    }
  }

  public onViewportTouchEnd(): void {
    this.isPanning = false;
    this.initialTouchDistance = 0;
  }

  public onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    this.zoomLevel.update(z => Math.min(5.0, Math.max(0.25, Number((z + delta).toFixed(2)))));
  }

  public onViewportMouseDown(e: MouseEvent): void {
    if (e.button === 0 && (this.zoomLevel() > 1 || e.shiftKey)) {
      this.isPanning = true;
      this.hasPanned = false;
      this.panStartX = e.clientX - this.panX();
      this.panStartY = e.clientY - this.panY();
    }
  }

  private onGlobalMouseMove = (e: MouseEvent) => {
    if (this.isPanning) {
      const newX = e.clientX - this.panStartX;
      const newY = e.clientY - this.panStartY;
      if (Math.abs(newX - this.panX()) > 3 || Math.abs(newY - this.panY()) > 3) {
        this.hasPanned = true;
      }
      this.panX.set(newX);
      this.panY.set(newY);
    }
  };

  private onGlobalMouseUp = () => {
    this.isPanning = false;
  };

  // ── Pixel Eyedropper Sampling (Accurate at every Zoom level) ──────────────
  public onCanvasMouseMove(e: MouseEvent): void {
    if (!this.canvasRef || !this.loadedImage || this.isPanning) return;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;

    if (xRatio >= 0 && xRatio <= 1 && yRatio >= 0 && yRatio <= 1) {
      const pixelX = Math.floor(xRatio * canvas.width);
      const pixelY = Math.floor(yRatio * canvas.height);
      const clampedX = Math.max(0, Math.min(canvas.width - 1, pixelX));
      const clampedY = Math.max(0, Math.min(canvas.height - 1, pixelY));

      const pixel = ctx.getImageData(clampedX, clampedY, 1, 1).data;
      const hex = this.engine.rgbToHex({ r: pixel[0], g: pixel[1], b: pixel[2] });

      this.hoverPixel.set(hex);
      this.hoverPixelX.set(clampedX);
      this.hoverPixelY.set(clampedY);
      this.loupeX.set(e.offsetX);
      this.loupeY.set(e.offsetY);
    }
  }

  public onCanvasMouseLeave(): void {
    this.hoverPixel.set(null);
  }

  public onCanvasClick(e: MouseEvent): void {
    if (!this.canvasRef || !this.loadedImage) return;
    if (this.hasPanned) {
      this.hasPanned = false;
      return;
    }

    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;

    if (xRatio >= 0 && xRatio <= 1 && yRatio >= 0 && yRatio <= 1) {
      const pixelX = Math.floor(xRatio * canvas.width);
      const pixelY = Math.floor(yRatio * canvas.height);
      const clampedX = Math.max(0, Math.min(canvas.width - 1, pixelX));
      const clampedY = Math.max(0, Math.min(canvas.height - 1, pixelY));

      const pixel = ctx.getImageData(clampedX, clampedY, 1, 1).data;
      const rgb: RgbColor = { r: pixel[0], g: pixel[1], b: pixel[2] };
      const hex = this.engine.rgbToHex(rgb);

      const pixelInfo: SelectedPixelInfo = {
        hex,
        rgb,
        rgbString: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
        x: clampedX,
        y: clampedY,
        xPercent: Math.round(xRatio * 100),
        yPercent: Math.round(yRatio * 100)
      };

      this.selectedPixel.set(pixelInfo);
      this.state.setSelectedColor(hex);
      this.state.showToast(`Sampled pixel ${hex}`);
    }
  }

  // ── Palette & Color Card Actions ──────────────────────────────────────────
  public toggleSaveColor(c: ExtractedColor, event?: Event): void {
    event?.stopPropagation();
    this.state.toggleSavedColor(c.hex, c.label || `Extracted ${c.hex}`);
  }

  public copySingleColor(c: ExtractedColor, event?: Event): void {
    event?.stopPropagation();
    this.state.copyToClipboard(c.hex, 'HEX');
  }

  public saveCurrentPalette(): void {
    const list = this.colors();
    if (list.length === 0) return;

    const defaultName = this.imageMetadata()?.name ? `Palette: ${this.imageMetadata()!.name}` : 'Extracted Palette';
    const name = this.newPaletteName.trim() || defaultName;

    this.state.saveExtractedPalette(name, list.map(c => c.hex));
    this.newPaletteName = '';
  }

  public startPaletteEdit(pal: SavedPalette): void {
    this.editingPaletteId.set(pal.id);
    this.editingPaletteName = pal.name;
  }

  public commitPaletteEdit(id: string): void {
    this.state.updateSavedPaletteName(id, this.editingPaletteName);
    this.editingPaletteId.set(null);
  }

  public cancelPaletteEdit(): void {
    this.editingPaletteId.set(null);
    this.editingPaletteName = '';
  }

  public loadSavedPaletteIntoShared(pal: SavedPalette): void {
    this.state.setSharedPalette(pal.colors);
    this.state.showToast(`Loaded "${pal.name}" into Shared Palette`);
  }

  // ── Export Functionality ──────────────────────────────────────────────────
  public exportAsJson(): void {
    const data = {
      paletteName: this.imageMetadata()?.name || 'Extracted Palette',
      extractedAt: new Date().toISOString(),
      colors: this.colors().map(c => ({
        hex: c.hex,
        rgb: c.rgb,
        percentage: c.percentage,
        label: c.label
      }))
    };
    this.downloadFile(JSON.stringify(data, null, 2), 'palette.json', 'application/json');
    this.state.showToast('Exported palette as JSON');
  }

  public exportAsCss(): void {
    const lines = [
      '/* Extracted Palette CSS Variables */',
      ':root {'
    ];
    this.colors().forEach((c, idx) => {
      lines.push(`  --color-${idx + 1}: ${c.hex}; /* ${c.percentage}% prominence */`);
    });
    lines.push('}');
    const cssContent = lines.join('\n');
    this.downloadFile(cssContent, 'palette.css', 'text/css');
    this.state.showToast('Exported palette as CSS');
  }

  public downloadAsPng(): void {
    const list = this.colors();
    if (list.length === 0 || typeof document === 'undefined') return;

    const canvas = document.createElement('canvas');
    const width = 800;
    const height = 240;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, width, height);

    // Header title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('Acklet Color Studio — Extracted Palette', 24, 34);

    const blockWidth = (width - 48) / list.length;
    const blockHeight = 120;
    const blockY = 54;

    list.forEach((c, i) => {
      const x = 24 + i * blockWidth;
      ctx.fillStyle = c.hex;
      ctx.fillRect(x, blockY, blockWidth - 4, blockHeight);

      // Monospace hex label
      ctx.fillStyle = '#E2E8F0';
      ctx.font = '600 12px monospace';
      ctx.fillText(c.hex, x, blockY + blockHeight + 22);

      // Prominence label
      ctx.fillStyle = '#94A3B8';
      ctx.font = '500 11px sans-serif';
      ctx.fillText(`${c.percentage}%`, x, blockY + blockHeight + 38);
    });

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'extracted-palette.png';
      a.click();
      URL.revokeObjectURL(url);
      this.state.showToast('Downloaded palette as PNG');
    });
  }

  public copyAllHex(): void {
    const hexList = this.colors().map(c => c.hex).join(', ');
    this.state.copyToClipboard(hexList, 'All HEX codes');
  }

  public copyAllRgb(): void {
    const rgbList = this.colors().map(c => `rgb(${c.rgb.r}, ${c.rgb.g}, ${c.rgb.b})`).join('\n');
    this.state.copyToClipboard(rgbList, 'All RGB codes');
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    if (typeof document === 'undefined') return;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Cross-Module Transfers ────────────────────────────────────────────────
  public applyAsPalette(): void {
    const extracted = this.colors();
    if (extracted.length === 0) return;

    const items = extracted.slice(0, 5).map((c, i) => ({
      id: `extracted-${i}-${Date.now()}`,
      hex: c.hex,
      locked: false,
      name: `Color ${i + 1}`
    }));

    this.state.paletteItems.set(items);
    this.state.setActiveModule('palette');
    this.state.showToast('Transferred colors to Palette Generator');
  }

  public sendAllToSharedPalette(): void {
    const extracted = this.colors().map(c => c.hex);
    if (extracted.length === 0) return;
    this.state.setSharedPalette(extracted.slice(0, 10));
    this.state.showToast('Transferred colors to Shared Working Palette');
  }

  public applyAsGradient(): void {
    const extracted = this.colors();
    if (extracted.length < 2) return;

    const stops = [
      { id: `stop-0-${Date.now()}`, color: extracted[0].hex, position: 0 },
      { id: `stop-1-${Date.now()}`, color: extracted[1].hex, position: 50 },
      { id: `stop-2-${Date.now()}`, color: extracted[Math.min(2, extracted.length - 1)].hex, position: 100 }
    ];

    this.state.gradientConfig.set({
      type: 'linear',
      angle: 135,
      stops
    });
    this.state.setActiveModule('gradient');
    this.state.showToast('Transferred colors to Gradient Builder');
  }

  public formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private cleanupMemory(): void {
    if (this.currentObjectUrl) {
      try {
        URL.revokeObjectURL(this.currentObjectUrl);
      } catch {}
      this.currentObjectUrl = null;
    }
  }
}

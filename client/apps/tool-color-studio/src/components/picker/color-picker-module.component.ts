// apps/tool-color-studio/src/components/picker/color-picker-module.component.ts
import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ColorStudioStateService } from '../../services/color-studio-state.service';
import { ColorEngineService } from '../../services/color-engine.service';
import { FormatCopyRowComponent } from '../shared/format-copy-row.component';
import { TsIconComponent } from '@acklet/tool-shell';
import { ColorFormat, SavedColorItem, WcagCompliance } from '../../models/color.models';
import {
  ColorHistoryPopoverComponent,
  SavedColorsPopoverComponent,
  WorkingPalettePopoverComponent,
  HarmonyPopoverComponent
} from '../popovers';

@Component({
  selector: 'app-color-picker-module',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FormatCopyRowComponent,
    TsIconComponent,
    ColorHistoryPopoverComponent,
    SavedColorsPopoverComponent,
    WorkingPalettePopoverComponent,
    HarmonyPopoverComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="picker-module-container">
      
      <!-- Consolidated Workspace Module Header -->
      <div class="workspace-module-header">
        <div class="header-titles">
          <h2 class="workspace-title">Color Picker</h2>
          <p class="workspace-subtitle">Choose and convert colors across HEX, RGB, HSL, HSV and CMYK.</p>
        </div>

        <div class="workspace-actions" role="toolbar" aria-label="Color Picker Tools">
          <!-- Sample (if Eyedropper supported) -->
          @if (hasEyedropper) {
            <button 
              type="button" 
              class="toolbar-action-btn" 
              (click)="openEyeDropper()"
              title="Sample pixel from screen (Eyedropper API)"
              aria-label="Sample pixel"
            >
              <ts-icon name="pipette" [size]="14" />
              <span>Sample</span>
            </button>
          }

          <!-- Random Vibrant Color -->
          <button 
            type="button" 
            class="toolbar-action-btn" 
            (click)="state.randomizeActiveColor()"
            title="Generate random vibrant color"
            aria-label="Random color"
          >
            <ts-icon name="sparkles" [size]="14" />
            <span>Random</span>
          </button>

          <!-- Undo Color Change -->
          <button 
            type="button" 
            class="toolbar-action-btn" 
            [disabled]="!state.canUndo()"
            (click)="state.undo()"
            title="Undo color change"
            aria-label="Undo"
          >
            <ts-icon name="rotate-ccw" [size]="14" />
            <span>Undo</span>
          </button>

          <!-- Redo Color Change -->
          <button 
            type="button" 
            class="toolbar-action-btn" 
            [disabled]="!state.canRedo()"
            (click)="state.redo()"
            title="Redo color change"
            aria-label="Redo"
          >
            <ts-icon name="rotate-cw" [size]="14" />
            <span>Redo</span>
          </button>

          <div class="toolbar-divider" aria-hidden="true"></div>

          <!-- History Popover Anchor -->
          <div class="popover-anchor">
            <button 
              type="button" 
              class="toolbar-action-btn"
              [class.active]="activePopover() === 'history'"
              (click)="togglePopover('history')"
              title="Recent color history"
              aria-label="Color history"
              [attr.aria-expanded]="activePopover() === 'history'"
            >
              <ts-icon name="clock" [size]="14" />
              <span>History</span>
              @if (state.recentlyUsedColors().length > 0) {
                <span class="btn-dot-indicator"></span>
              }
            </button>

            @if (activePopover() === 'history') {
              <app-color-history-popover (close)="closePopover()" />
            }
          </div>

          <!-- Saved Colors Popover Anchor -->
          <div class="popover-anchor">
            <button 
              type="button" 
              class="toolbar-action-btn"
              [class.active]="activePopover() === 'saved'"
              (click)="togglePopover('saved')"
              title="Saved colors and bookmarks"
              aria-label="Saved colors"
              [attr.aria-expanded]="activePopover() === 'saved'"
            >
              <ts-icon name="bookmark" [size]="14" />
              <span class="label-text">Saved<span class="mobile-break"><br></span><span class="mobile-break-space"> </span>Colors</span>
              @if (state.savedColorItems().length > 0) {
                <span class="btn-count-pill">{{ state.savedColorItems().length }}</span>
              }
            </button>

            @if (activePopover() === 'saved') {
              <app-saved-colors-popover (close)="closePopover()" />
            }
          </div>

          <!-- Working Palette Popover Anchor -->
          <div class="popover-anchor">
            <button 
              type="button" 
              class="toolbar-action-btn"
              [class.active]="activePopover() === 'palette'"
              (click)="togglePopover('palette')"
              title="Shared working palette"
              aria-label="Working palette"
              [attr.aria-expanded]="activePopover() === 'palette'"
            >
              <ts-icon name="layers" [size]="14" />
              <span class="label-text">Working<span class="mobile-break"><br></span><span class="mobile-break-space"> </span>Palette</span>
            </button>

            @if (activePopover() === 'palette') {
              <app-working-palette-popover (close)="closePopover()" />
            }
          </div>

          <!-- Harmonies Popover Anchor -->
          <div class="popover-anchor">
            <button 
              type="button" 
              class="toolbar-action-btn"
              [class.active]="activePopover() === 'harmony'"
              (click)="togglePopover('harmony')"
              title="Color harmonies"
              aria-label="Color harmonies"
              [attr.aria-expanded]="activePopover() === 'harmony'"
            >
              <ts-icon name="sparkles" [size]="14" />
              <span>Harmonies</span>
            </button>

            @if (activePopover() === 'harmony') {
              <app-harmony-popover (close)="closePopover()" />
            }
          </div>

        </div>
      </div>

      <!-- Main Workspace Grid -->
      <div class="picker-workspace-grid">
        
        <!-- Left Column: Visual 2D Canvas, Sliders, Format Controls & Combinations -->
        <div class="picker-main-column">
          
          <!-- 1. Visual 2D Saturation-Brightness Canvas & Sliders Card -->
          <div class="picker-panel-card picker-visual-card">
            
            <!-- 2D Saturation-Value Spectrum Area -->
            <div 
              #spectrumBox 
              class="spectrum-area" 
              [style.background-color]="huePureHex()"
              (mousedown)="onSpectrumStart($event)"
              (touchstart)="onSpectrumTouchStart($event)"
              aria-label="2D color saturation and brightness picker"
              role="slider"
              [attr.aria-valuenow]="satPercent() + ',' + valPercent()"
              tabindex="0"
              (keydown)="onSpectrumKeyDown($event)"
            >
              <div class="spectrum-white-gradient"></div>
              <div class="spectrum-black-gradient"></div>
              <div 
                class="spectrum-handle" 
                [style.left.%]="satPercent()" 
                [style.top.%]="100 - valPercent()"
                [style.background-color]="solidHex()"
              ></div>
            </div>

            <!-- Sliders Container -->
            <div class="sliders-container">
              
              <!-- Hue Slider Row -->
              <div class="slider-row">
                <span class="slider-label">Hue</span>
                <input 
                  type="range" 
                  class="hue-range" 
                  min="0" 
                  max="360" 
                  step="1"
                  [ngModel]="currentHue()" 
                  (ngModelChange)="onHueSliderChange($event)"
                  aria-label="Hue spectrum slider (0-360 degrees)"
                />
                <div class="slider-num-input">
                  <input 
                    type="number" 
                    min="0" 
                    max="360" 
                    [ngModel]="currentHue()" 
                    (ngModelChange)="onHueNumChange($event)"
                    (blur)="onHueBlur()"
                    aria-label="Hue numeric input"
                  />
                  <span class="unit-symbol">°</span>
                </div>
              </div>

              <!-- Alpha / Opacity Slider Row -->
              <div class="slider-row">
                <span class="slider-label">Alpha</span>
                <div class="alpha-track-wrapper">
                  <input 
                    type="range" 
                    class="alpha-range" 
                    min="0" 
                    max="100" 
                    step="1"
                    [style.--alpha-solid-color]="solidHex()"
                    [ngModel]="currentAlphaPercent()" 
                    (ngModelChange)="onAlphaSliderChange($event)"
                    aria-label="Alpha opacity slider (0-100%)"
                  />
                </div>
                <div class="slider-num-input">
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    [ngModel]="currentAlphaPercent()" 
                    (ngModelChange)="onAlphaNumChange($event)"
                    (blur)="onAlphaBlur()"
                    aria-label="Alpha numeric input"
                  />
                  <span class="unit-symbol">%</span>
                </div>
              </div>

            </div>

            <!-- Compact Before / After Comparison Bar -->
            <div class="compact-comparison-bar">
              <div class="compact-swatch-box" (click)="state.setSelectedColor(initialColor())" title="Click to restore initial color">
                <span class="compact-badge">Initial</span>
                <div class="compact-swatch">
                  <div class="checkerboard-bg"></div>
                  <div class="swatch-fill" [style.background-color]="initialColor()"></div>
                </div>
                <span class="compact-hex font-mono">{{ initialColor().toUpperCase() }}</span>
              </div>

              <div class="compact-arrow">
                <ts-icon name="arrow-right" [size]="14" />
              </div>

              <div class="compact-swatch-box current" (click)="copyActiveHex()" title="Current active color (Click to copy HEX)">
                <span class="compact-badge active">Current</span>
                <div class="compact-swatch">
                  <div class="checkerboard-bg"></div>
                  <div class="swatch-fill" [style.background-color]="state.activeColor()"></div>
                </div>
                <span class="compact-hex font-mono">{{ state.activeColor().toUpperCase() }}</span>
                @if (currentAlphaPercent() < 100) {
                  <span class="compact-alpha-pill">{{ currentAlphaPercent() }}%</span>
                }
              </div>

              <div class="compact-spacer"></div>

              <button 
                type="button" 
                class="compact-revert-btn" 
                (click)="revertToInitial()"
                title="Revert back to initial color"
                aria-label="Revert to initial color"
              >
                <ts-icon name="rotate-ccw" [size]="12" />
                <span>Revert</span>
              </button>
            </div>

          </div>

          <!-- 2. Readability & Color Combinations Preview Card -->
          <div class="picker-panel-card combinations-card">
            <div class="card-section-header">
              <div>
                <h3 class="section-heading">Color Readability & Combinations</h3>
                <p class="section-subtext">Live accessibility preview of foreground and background pairings</p>
              </div>
            </div>

            <div class="combinations-grid">
              
              <!-- 1. Dark Text on Color Surface -->
              <div 
                class="combo-card" 
                [style.background-color]="state.activeColor()"
                style="color: #0F172A;"
              >
                <div class="combo-top">
                  <span class="combo-title">Dark on Color</span>
                  <span class="ratio-badge" [class.pass]="darkOnColorCompliance().aaNormal">
                    {{ darkOnColorCompliance().ratioString }} {{ darkOnColorCompliance().grade }}
                  </span>
                </div>
                <div class="combo-text-sample">Aa Heading 18px</div>
                <div class="combo-subtext">The quick brown fox jumps over the lazy dog.</div>
              </div>

              <!-- 2. Light Text on Color Surface -->
              <div 
                class="combo-card" 
                [style.background-color]="state.activeColor()"
                style="color: #FFFFFF;"
              >
                <div class="combo-top">
                  <span class="combo-title">Light on Color</span>
                  <span class="ratio-badge" [class.pass]="lightOnColorCompliance().aaNormal">
                    {{ lightOnColorCompliance().ratioString }} {{ lightOnColorCompliance().grade }}
                  </span>
                </div>
                <div class="combo-text-sample">Aa Heading 18px</div>
                <div class="combo-subtext">The quick brown fox jumps over the lazy dog.</div>
              </div>

              <!-- 3. Color Text on Dark Surface -->
              <div 
                class="combo-card dark-surface" 
                [style.color]="solidHex()"
              >
                <div class="combo-top">
                  <span class="combo-title">Accent on Dark</span>
                  <span class="ratio-badge" [class.pass]="colorOnDarkCompliance().aaNormal">
                    {{ colorOnDarkCompliance().ratioString }} {{ colorOnDarkCompliance().grade }}
                  </span>
                </div>
                <div class="combo-text-sample">Aa Heading 18px</div>
                <div class="combo-subtext">Interactive UI elements and high-contrast labels.</div>
              </div>

              <!-- 4. Color Text on Light Surface -->
              <div 
                class="combo-card light-surface" 
                [style.color]="solidHex()"
              >
                <div class="combo-top">
                  <span class="combo-title">Accent on Light</span>
                  <span class="ratio-badge" [class.pass]="colorOnLightCompliance().aaNormal">
                    {{ colorOnLightCompliance().ratioString }} {{ colorOnLightCompliance().grade }}
                  </span>
                </div>
                <div class="combo-text-sample">Aa Heading 18px</div>
                <div class="combo-subtext">Interactive UI elements and high-contrast labels.</div>
              </div>

            </div>
          </div>

        </div>

        <!-- Right Column: All Formats Card (Single Source of Truth for Format Editing & Copy) -->
        <div class="picker-side-column">
          
          <div class="side-panel-card formats-master-card">
            <div class="panel-header">
              <h3 class="panel-title">All Formats</h3>
              <button 
                type="button" 
                class="panel-action-btn primary" 
                (click)="state.copyAllFormats()"
                title="Copy all color formats to clipboard"
                aria-label="Copy all formats"
              >
                <ts-icon name="copy" [size]="13" />
                <span>Copy All</span>
              </button>
            </div>

            <!-- Format Editing Section -->
            <div class="format-edit-section">
              <div class="format-tabs-header">
                <span class="format-edit-label">Format Channel Editor</span>
                <!-- Format Mode Tabs -->
                <div class="format-tabs" role="tablist" aria-label="Color format channel selector">
                  @for (fmt of formatModes; track fmt) {
                    <button 
                      type="button" 
                      role="tab"
                      class="format-tab-btn" 
                      [class.active]="activeFormat() === fmt"
                      (click)="setActiveFormat(fmt)"
                      [attr.aria-selected]="activeFormat() === fmt"
                    >
                      {{ fmt | uppercase }}
                    </button>
                  }
                </div>
              </div>

              <!-- Active Channel Input Fields Grid -->
              <div class="channels-grid">
                
                <!-- HEX Channel Input -->
                @if (activeFormat() === 'hex') {
                  <div class="channel-group full-width">
                    <label class="channel-label" for="hex-channel-input">HEX (3, 6 or 8 digits with alpha)</label>
                    <div class="hex-input-wrap">
                      <span class="hex-prefix">#</span>
                      <input 
                        id="hex-channel-input"
                        type="text" 
                        class="channel-input font-mono" 
                        [ngModel]="hexInputString()" 
                        (ngModelChange)="onHexInputChange($event)"
                        (blur)="onHexInputBlur()"
                        maxlength="9" 
                        placeholder="E11D48 or E11D48FF"
                      />
                    </div>
                  </div>
                }

                <!-- RGB Channel Inputs (R, G, B, A) -->
                @if (activeFormat() === 'rgb') {
                  <div class="channel-group">
                    <label class="channel-label">R (0-255)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="255" 
                      class="channel-input font-mono"
                      [ngModel]="rgbR()" 
                      (ngModelChange)="onRgbChange('r', $event)"
                      (blur)="onRgbBlur()"
                    />
                  </div>
                  <div class="channel-group">
                    <label class="channel-label">G (0-255)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="255" 
                      class="channel-input font-mono"
                      [ngModel]="rgbG()" 
                      (ngModelChange)="onRgbChange('g', $event)"
                      (blur)="onRgbBlur()"
                    />
                  </div>
                  <div class="channel-group">
                    <label class="channel-label">B (0-255)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="255" 
                      class="channel-input font-mono"
                      [ngModel]="rgbB()" 
                      (ngModelChange)="onRgbChange('b', $event)"
                      (blur)="onRgbBlur()"
                    />
                  </div>
                  <div class="channel-group">
                    <label class="channel-label">Alpha (%)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      class="channel-input font-mono"
                      [ngModel]="rgbA()" 
                      (ngModelChange)="onRgbChange('a', $event)"
                      (blur)="onRgbBlur()"
                    />
                  </div>
                }

                <!-- HSL Channel Inputs (H, S, L, A) -->
                @if (activeFormat() === 'hsl') {
                  <div class="channel-group">
                    <label class="channel-label">H (0-360°)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="360" 
                      class="channel-input font-mono"
                      [ngModel]="hslH()" 
                      (ngModelChange)="onHslChange('h', $event)"
                      (blur)="onHslBlur()"
                    />
                  </div>
                  <div class="channel-group">
                    <label class="channel-label">S (0-100%)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      class="channel-input font-mono"
                      [ngModel]="hslS()" 
                      (ngModelChange)="onHslChange('s', $event)"
                      (blur)="onHslBlur()"
                    />
                  </div>
                  <div class="channel-group">
                    <label class="channel-label">L (0-100%)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      class="channel-input font-mono"
                      [ngModel]="hslL()" 
                      (ngModelChange)="onHslChange('l', $event)"
                      (blur)="onHslBlur()"
                    />
                  </div>
                  <div class="channel-group">
                    <label class="channel-label">Alpha (%)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      class="channel-input font-mono"
                      [ngModel]="hslA()" 
                      (ngModelChange)="onHslChange('a', $event)"
                      (blur)="onHslBlur()"
                    />
                  </div>
                }

                <!-- HSV Channel Inputs (H, S, V, A) -->
                @if (activeFormat() === 'hsv') {
                  <div class="channel-group">
                    <label class="channel-label">H (0-360°)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="360" 
                      class="channel-input font-mono"
                      [ngModel]="hsvH()" 
                      (ngModelChange)="onHsvChange('h', $event)"
                      (blur)="onHsvBlur()"
                    />
                  </div>
                  <div class="channel-group">
                    <label class="channel-label">S (0-100%)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      class="channel-input font-mono"
                      [ngModel]="hsvS()" 
                      (ngModelChange)="onHsvChange('s', $event)"
                      (blur)="onHsvBlur()"
                    />
                  </div>
                  <div class="channel-group">
                    <label class="channel-label">V (0-100%)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      class="channel-input font-mono"
                      [ngModel]="hsvV()" 
                      (ngModelChange)="onHsvChange('v', $event)"
                      (blur)="onHsvBlur()"
                    />
                  </div>
                  <div class="channel-group">
                    <label class="channel-label">Alpha (%)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      class="channel-input font-mono"
                      [ngModel]="hsvA()" 
                      (ngModelChange)="onHsvChange('a', $event)"
                      (blur)="onHsvBlur()"
                    />
                  </div>
                }

                <!-- CMYK Channel Inputs (C, M, Y, K) -->
                @if (activeFormat() === 'cmyk') {
                  <div class="channel-group">
                    <label class="channel-label">C (0-100%)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      class="channel-input font-mono"
                      [ngModel]="cmykC()" 
                      (ngModelChange)="onCmykChange('c', $event)"
                      (blur)="onCmykBlur()"
                    />
                  </div>
                  <div class="channel-group">
                    <label class="channel-label">M (0-100%)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      class="channel-input font-mono"
                      [ngModel]="cmykM()" 
                      (ngModelChange)="onCmykChange('m', $event)"
                      (blur)="onCmykBlur()"
                    />
                  </div>
                  <div class="channel-group">
                    <label class="channel-label">Y (0-100%)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      class="channel-input font-mono"
                      [ngModel]="cmykY()" 
                      (ngModelChange)="onCmykChange('y', $event)"
                      (blur)="onCmykBlur()"
                    />
                  </div>
                  <div class="channel-group">
                    <label class="channel-label">K (0-100%)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      class="channel-input font-mono"
                      [ngModel]="cmykK()" 
                      (ngModelChange)="onCmykChange('k', $event)"
                      (blur)="onCmykBlur()"
                    />
                  </div>
                }

              </div>
            </div>

            <div class="format-divider" aria-hidden="true"></div>

            <!-- All Formats Quick-Copy Rows -->
            <div class="formats-list-wrap">
              <span class="format-list-heading">Quick Copy Formats</span>
              <app-format-copy-row label="HEX" [value]="color().hex" />
              <app-format-copy-row label="RGB" [value]="color().rgbString" />
              <app-format-copy-row label="HSL" [value]="color().hslString" />
              <app-format-copy-row label="HSV" [value]="color().hsvString" />
              <app-format-copy-row label="CMYK" [value]="color().cmykString" />
            </div>

          </div>

          <!-- Tints & Shades Card (Right Column) -->
          <div class="side-panel-card tints-shades-card">
            <div class="card-section-header">
              <div>
                <h3 class="section-heading">Tints & Shades</h3>
                <p class="section-subtext">Stepped lightness and darkness variations</p>
              </div>
            </div>
            <div class="shades-strip-wrap">
              <div class="shades-strip">
                @for (tint of tintsAndShades().tints; track tint) {
                  <div 
                    class="strip-swatch" 
                    [style.background-color]="tint" 
                    [title]="'Tint: ' + tint"
                    (click)="state.setActiveColor(tint)"
                  ></div>
                }
                <div class="strip-swatch base" [style.background-color]="solidHex()" title="Active Base Color"></div>
                @for (shade of tintsAndShades().shades; track shade) {
                  <div 
                    class="strip-swatch" 
                    [style.background-color]="shade" 
                    [title]="'Shade: ' + shade"
                    (click)="state.setActiveColor(shade)"
                  ></div>
                }
              </div>
              <div class="shades-legend">
                <span>100% Light</span>
                <span>Base</span>
                <span>100% Dark</span>
              </div>
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

    .picker-module-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      width: 100%;
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

    .mobile-break {
      display: none;
    }

    .mobile-break-space {
      display: inline;
    }

    @media (max-width: 639px) {
      .workspace-title {
        font-size: 20px;
      }
      .workspace-actions {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 6px;
        width: 100%;
        overflow-x: visible;
        flex-wrap: wrap;
      }
      .toolbar-divider {
        display: none !important;
      }
      .popover-anchor {
        width: 100%;
      }
      .toolbar-action-btn {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        min-height: 52px;
        height: auto;
        padding: 6px 4px;
        position: relative;
      }
      .mobile-break {
        display: inline;
      }
      .mobile-break-space {
        display: none;
      }
      .toolbar-action-btn .label-text {
        white-space: normal !important;
        line-height: 1.15;
        font-size: 10px;
        text-align: center;
        max-width: 100%;
        overflow: visible !important;
        text-overflow: clip !important;
      }
      .toolbar-action-btn span:not(.btn-count-pill):not(.btn-dot-indicator):not(.mobile-break):not(.mobile-break-space) {
        font-size: 10px;
        max-width: 100%;
        text-align: center;
      }
      .btn-count-pill,
      .btn-dot-indicator {
        position: absolute;
        top: 4px;
        right: 4px;
      }
    }

    .bar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
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

    .btn-dot-indicator {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--tool-accent, #2563EB);
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

    /* Main Workspace Grid */
    .picker-workspace-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.25fr) minmax(360px, 1fr);
      gap: 20px;
      align-items: start;
    }

    .picker-main-column,
    .picker-side-column {
      display: flex;
      flex-direction: column;
      gap: 20px;
      min-width: 0;
    }

    @media (max-width: 767px) {
      .picker-workspace-grid {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .picker-main-column,
      .picker-side-column {
        display: contents !important;
      }
      .picker-visual-card {
        order: 1 !important;
      }
      .formats-master-card {
        order: 2 !important;
      }
      .tints-shades-card {
        order: 3 !important;
      }
      .combinations-card {
        order: 4 !important;
      }
    }

    /* Generic Panel Card */
    .picker-panel-card,
    .side-panel-card {
      background: var(--bg-1, #18181B);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 14px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
      box-sizing: border-box;
    }

    :host-context([data-theme="light"]) .picker-panel-card,
    :host-context([data-theme="light"]) .side-panel-card {
      background: #FFFFFF;
      border-color: var(--border, rgba(0, 0, 0, 0.08));
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    /* 2D Spectrum Area */
    .spectrum-area {
      width: 100%;
      height: 280px;
      border-radius: 10px;
      position: relative;
      cursor: crosshair;
      overflow: hidden;
      touch-action: none;
      outline: none;
    }

    @media (max-width: 1023px) {
      .spectrum-area {
        height: auto;
        aspect-ratio: 4 / 3;
        min-height: 200px;
        max-height: 360px;
      }
    }

    .spectrum-area:focus-visible {
      box-shadow: 0 0 0 2px var(--tool-accent, #2563EB);
    }

    .spectrum-white-gradient {
      position: absolute;
      inset: 0;
      background: linear-gradient(to right, #FFFFFF, rgba(255, 255, 255, 0));
    }

    .spectrum-black-gradient {
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, #000000, rgba(0, 0, 0, 0));
    }

    .spectrum-handle {
      position: absolute;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid #FFFFFF;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.4);
      transform: translate(-50%, -50%);
      pointer-events: none;
      transition: transform 60ms ease;
    }

    /* Sliders */
    .sliders-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .slider-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    @media (max-width: 1023px) {
      .slider-row {
        min-height: 44px;
      }
      .hue-range::-webkit-slider-thumb,
      .alpha-range::-webkit-slider-thumb {
        width: 28px;
        height: 28px;
      }
      .hue-range,
      .alpha-range {
        height: 20px;
      }
      .slider-num-input {
        min-height: 36px;
      }
    }

    @media (max-width: 639px) {
      .slider-row {
        display: grid;
        grid-template-columns: 44px 1fr 68px;
        gap: 8px;
        min-height: 44px;
        align-items: center;
      }
      .slider-label {
        width: auto;
      }
      .slider-num-input {
        width: 100%;
        min-height: 36px;
      }
    }

    .slider-label {
      width: 44px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-2, #A1A1AA);
    }

    :host-context([data-theme="light"]) .slider-label {
      color: var(--text-2, #64748B);
    }

    .hue-range {
      flex: 1;
      height: 14px;
      border-radius: 7px;
      appearance: none;
      outline: none;
      cursor: pointer;
      background: linear-gradient(to right, 
        #FF0000 0%, #FFFF00 17%, #00FF00 33%, 
        #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%
      );
    }

    .hue-range::-webkit-slider-thumb {
      appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #FFFFFF;
      border: 2px solid rgba(0, 0, 0, 0.3);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
      cursor: pointer;
    }

    .alpha-track-wrapper {
      flex: 1;
      height: 14px;
      border-radius: 7px;
      position: relative;
      background-image: 
        linear-gradient(45deg, #3F3F46 25%, transparent 25%), 
        linear-gradient(-45deg, #3F3F46 25%, transparent 25%), 
        linear-gradient(45deg, transparent 75%, #3F3F46 75%), 
        linear-gradient(-45deg, transparent 75%, #3F3F46 75%);
      background-size: 8px 8px;
      background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
      display: flex;
      align-items: center;
    }

    :host-context([data-theme="light"]) .alpha-track-wrapper {
      background-image: 
        linear-gradient(45deg, #CBD5E1 25%, transparent 25%), 
        linear-gradient(-45deg, #CBD5E1 25%, transparent 25%), 
        linear-gradient(45deg, transparent 75%, #CBD5E1 75%), 
        linear-gradient(-45deg, transparent 75%, #CBD5E1 75%);
    }

    .alpha-range {
      width: 100%;
      height: 14px;
      border-radius: 7px;
      appearance: none;
      outline: none;
      cursor: pointer;
      background: linear-gradient(to right, transparent, var(--alpha-solid-color, #2563EB));
    }

    .alpha-range::-webkit-slider-thumb {
      appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #FFFFFF;
      border: 2px solid rgba(0, 0, 0, 0.3);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
      cursor: pointer;
    }

    .slider-num-input {
      display: flex;
      align-items: center;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 6px;
      padding: 0 6px;
      height: 28px;
      width: 64px;
    }

    :host-context([data-theme="light"]) .slider-num-input {
      background: var(--bg-2, #F8FAFC);
      border-color: var(--border, rgba(0, 0, 0, 0.08));
    }

    .slider-num-input input {
      width: 100%;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text, #F4F4F5);
      font-family: var(--ts-font-mono, monospace);
      font-size: 12px;
      font-weight: 600;
      text-align: right;
    }

    :host-context([data-theme="light"]) .slider-num-input input {
      color: var(--text, #0F172A);
    }

    .unit-symbol {
      font-size: 11px;
      color: var(--text-3, #71717A);
      padding-left: 2px;
    }

    /* Compact Before / After Comparison Bar */
    .compact-comparison-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 9px;
      margin-top: 10px;
    }

    @media (max-width: 639px) {
      .compact-comparison-bar {
        flex-wrap: wrap;
        gap: 8px;
      }
      .compact-revert-btn {
        margin-left: auto;
        min-height: 36px;
      }
    }

    :host-context([data-theme="light"]) .compact-comparison-bar {
      background: var(--bg-2, #F8FAFC);
      border-color: var(--border, rgba(0, 0, 0, 0.08));
    }

    .compact-swatch-box {
      display: flex;
      align-items: center;
      gap: 7px;
      cursor: pointer;
      transition: transform 140ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    .compact-swatch-box:hover {
      transform: translateY(-1px);
    }

    .compact-swatch-box:active {
      transform: translateY(0) scale(0.97);
    }

    .compact-badge {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--text-3, #71717A);
      letter-spacing: 0.04em;
    }

    .compact-badge.active {
      color: var(--tool-accent, #2563EB);
    }

    .compact-swatch {
      width: 22px;
      height: 22px;
      border-radius: 5px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      position: relative;
      overflow: hidden;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .compact-swatch {
      border-color: rgba(0, 0, 0, 0.15);
    }

    .compact-hex {
      font-size: 11px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .compact-hex {
      color: #0F172A;
    }

    .compact-alpha-pill {
      font-size: 10px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 8px;
      background: rgba(37, 99, 235, 0.15);
      color: var(--tool-accent, #2563EB);
    }

    .compact-arrow {
      color: var(--text-3, #71717A);
    }

    .compact-spacer {
      flex: 1;
    }

    .compact-revert-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 24px;
      padding: 0 8px;
      border-radius: 5px;
      font-size: 11px;
      font-weight: 600;
      background: transparent;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text-2, #A1A1AA);
      cursor: pointer;
      transition: all 120ms ease;
    }

    :host-context([data-theme="light"]) .compact-revert-btn {
      border-color: rgba(0, 0, 0, 0.12);
      color: #64748B;
    }

    .compact-revert-btn:hover {
      color: var(--text, #F4F4F5);
      border-color: var(--tool-accent, #2563EB);
      background: rgba(37, 99, 235, 0.08);
    }

    :host-context([data-theme="light"]) .compact-revert-btn:hover {
      color: #0F172A;
    }

    .swatch-fill {
      position: absolute;
      inset: 0;
      transition: background-color 80ms ease;
    }

    /* Checkerboard Pattern for Alpha visualization */
    .checkerboard-bg {
      position: absolute;
      inset: 0;
      background-image: 
        linear-gradient(45deg, #3F3F46 25%, transparent 25%), 
        linear-gradient(-45deg, #3F3F46 25%, transparent 25%), 
        linear-gradient(45deg, transparent 75%, #3F3F46 75%), 
        linear-gradient(-45deg, transparent 75%, #3F3F46 75%);
      background-size: 10px 10px;
      background-position: 0 0, 0 5px, 5px -5px, -5px 0px;
    }

    :host-context([data-theme="light"]) .checkerboard-bg {
      background-image: 
        linear-gradient(45deg, #E2E8F0 25%, transparent 25%), 
        linear-gradient(-45deg, #E2E8F0 25%, transparent 25%), 
        linear-gradient(45deg, transparent 75%, #E2E8F0 75%), 
        linear-gradient(-45deg, transparent 75%, #E2E8F0 75%);
    }

    /* Section Headers */
    .card-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
    }

    .tabs-header-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .section-label {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--text-2, #A1A1AA);
    }

    :host-context([data-theme="light"]) .section-label {
      color: #64748B;
    }

    .section-heading {
      font-size: 14px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 0;
    }

    :host-context([data-theme="light"]) .section-heading {
      color: #0F172A;
    }

    .section-subtext {
      font-size: 12px;
      color: var(--text-2, #A1A1AA);
      margin: 2px 0 0 0;
    }

    :host-context([data-theme="light"]) .section-subtext {
      color: #64748B;
    }

    /* Format Tabs */
    .format-tabs {
      display: flex;
      align-items: center;
      background: var(--bg-2, #27272A);
      border-radius: 8px;
      padding: 2px;
      gap: 2px;
    }

    :host-context([data-theme="light"]) .format-tabs {
      background: var(--bg-2, #F1F5F9);
    }

    .format-tab-btn {
      padding: 4px 10px;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: var(--text-2, #A1A1AA);
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: all 120ms ease;
    }

    :host-context([data-theme="light"]) .format-tab-btn {
      color: var(--text-2, #64748B);
    }

    .format-tab-btn.active {
      background: var(--bg-1, #18181B);
      color: var(--tool-accent, #2563EB);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    :host-context([data-theme="light"]) .format-tab-btn.active {
      background: #FFFFFF;
      color: var(--tool-accent, #2563EB);
    }

    .copy-format-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 6px;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text-2, #A1A1AA);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 120ms ease;
    }

    :host-context([data-theme="light"]) .copy-format-action-btn {
      background: var(--bg-2, #F1F5F9);
      border-color: var(--border, rgba(0, 0, 0, 0.08));
      color: var(--text-2, #475569);
    }

    .copy-format-action-btn:hover {
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
    }

    /* Channel Inputs Grid */
    .channels-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
      gap: 12px;
    }

    .channel-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .channel-group.full-width {
      grid-column: 1 / -1;
    }

    .channel-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-2, #A1A1AA);
    }

    :host-context([data-theme="light"]) .channel-label {
      color: var(--text-2, #64748B);
    }

    .channel-input {
      height: 38px;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 8px;
      padding: 0 10px;
      color: var(--text, #F4F4F5);
      font-size: 13px;
      font-weight: 600;
      outline: none;
      transition: border-color 140ms ease;
    }

    :host-context([data-theme="light"]) .channel-input {
      background: var(--bg-2, #F8FAFC);
      border-color: var(--border, rgba(0, 0, 0, 0.08));
      color: var(--text, #0F172A);
    }

    .channel-input:focus {
      border-color: var(--tool-accent, #2563EB);
    }

    .font-mono {
      font-family: var(--ts-font-mono, monospace);
    }

    .hex-input-wrap {
      display: flex;
      align-items: center;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 8px;
      padding: 0 10px;
      height: 38px;
      transition: border-color 140ms ease;
    }

    :host-context([data-theme="light"]) .hex-input-wrap {
      background: var(--bg-2, #F8FAFC);
      border-color: var(--border, rgba(0, 0, 0, 0.08));
    }

    .hex-input-wrap:focus-within {
      border-color: var(--tool-accent, #2563EB);
    }

    .hex-prefix {
      font-family: var(--ts-font-mono, monospace);
      font-size: 14px;
      font-weight: 700;
      color: var(--text-3, #71717A);
    }

    .hex-input-wrap input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text, #F4F4F5);
      font-family: var(--ts-font-mono, monospace);
      font-size: 14px;
      font-weight: 700;
      padding-left: 6px;
      text-transform: uppercase;
    }

    :host-context([data-theme="light"]) .hex-input-wrap input {
      color: var(--text, #0F172A);
    }

    /* Combinations Grid */
    .combinations-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    @media (max-width: 640px) {
      .combinations-grid {
        grid-template-columns: 1fr;
      }
    }

    .combo-card {
      border-radius: 10px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
      min-height: 100px;
      transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 180ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    .combo-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
    }

    .combo-card:active {
      transform: translateY(0) scale(0.985);
    }

    .combo-card.dark-surface {
      background-color: #18181B;
      border-color: rgba(255, 255, 255, 0.1);
    }

    .combo-card.light-surface {
      background-color: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.1);
    }

    .combo-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .combo-title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      opacity: 0.85;
    }

    .ratio-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.35);
      color: #F87171;
    }

    .ratio-badge.pass {
      color: #34D399;
    }

    .combo-text-sample {
      font-size: 16px;
      font-weight: 700;
      line-height: 1.2;
    }

    .combo-subtext {
      font-size: 11px;
      opacity: 0.8;
      line-height: 1.3;
    }

    /* Side Panel Headers */
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .panel-title {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: var(--text-2, #A1A1AA);
      margin: 0;
    }

    :host-context([data-theme="light"]) .panel-title {
      color: #64748B;
    }

    .panel-title-with-badge {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .count-pill {
      font-size: 10px;
      font-weight: 700;
      background: var(--bg-2, #27272A);
      color: var(--text-2, #A1A1AA);
      padding: 1px 6px;
      border-radius: 10px;
    }

    :host-context([data-theme="light"]) .count-pill {
      background: #E2E8F0;
      color: #475569;
    }

    .panel-action-link {
      background: transparent;
      border: none;
      font-size: 11px;
      font-weight: 600;
      color: var(--tool-accent, #2563EB);
      cursor: pointer;
      padding: 0;
    }

    .panel-action-link.danger {
      color: #EF4444;
    }

    .panel-action-link:hover {
      text-decoration: underline;
    }

    .formats-list-wrap {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    /* Formats Master Card & Section Controls */
    .formats-master-card {
      gap: 16px;
    }

    .panel-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 28px;
      padding: 0 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      background: var(--bg-2, #27272A);
      color: var(--text, #F4F4F5);
      transition: all 120ms ease;
    }

    :host-context([data-theme="light"]) .panel-action-btn {
      background: var(--bg-2, #F1F5F9);
      border-color: var(--border, rgba(0, 0, 0, 0.08));
      color: var(--text, #0F172A);
    }

    .panel-action-btn.primary {
      background: var(--tool-accent, #2563EB);
      color: #FFFFFF;
      border-color: var(--tool-accent, #2563EB);
    }

    .panel-action-btn.primary:hover {
      filter: brightness(1.1);
    }

    .format-edit-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .format-tabs-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
    }

    @media (max-width: 639px) {
      .format-tabs-header {
        flex-direction: column;
        align-items: stretch;
      }
      .format-tabs {
        width: 100%;
        display: flex;
      }
      .format-tab-btn {
        flex: 1;
        min-height: 44px;
        text-align: center;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .channels-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }
      .channel-group.full-width {
        grid-column: 1 / -1;
      }
      .channel-input,
      .hex-input-wrap {
        min-height: 44px;
      }
    }

    .format-edit-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--text-2, #A1A1AA);
    }

    :host-context([data-theme="light"]) .format-edit-label {
      color: var(--text-2, #64748B);
    }

    .format-divider {
      width: 100%;
      height: 1px;
      background: var(--border, rgba(255, 255, 255, 0.08));
      margin: 4px 0;
    }

    :host-context([data-theme="light"]) .format-divider {
      background: var(--border, rgba(0, 0, 0, 0.08));
    }

    .format-list-heading {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--text-2, #A1A1AA);
      margin-bottom: 2px;
    }

    :host-context([data-theme="light"]) .format-list-heading {
      color: var(--text-2, #64748B);
    }

    /* Saved Colors Section */
    .save-color-form {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .save-name-input {
      flex: 1;
      height: 34px;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 7px;
      padding: 0 10px;
      color: var(--text, #F4F4F5);
      font-size: 12px;
      outline: none;
    }

    :host-context([data-theme="light"]) .save-name-input {
      background: var(--bg-2, #F8FAFC);
      border-color: var(--border, rgba(0, 0, 0, 0.08));
      color: var(--text, #0F172A);
    }

    .save-name-input:focus {
      border-color: var(--tool-accent, #2563EB);
    }

    .save-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 34px;
      padding: 0 12px;
      border-radius: 7px;
      background: var(--tool-accent, #2563EB);
      color: #FFFFFF;
      border: none;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: filter 120ms ease;
    }

    .save-btn:hover {
      filter: brightness(1.1);
    }

    .saved-items-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 280px;
      overflow-y: auto;
    }

    .saved-item-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 8px;
      transition: border-color 120ms ease;
    }

    :host-context([data-theme="light"]) .saved-item-row {
      background: var(--bg-2, #F8FAFC);
      border-color: var(--border, rgba(0, 0, 0, 0.08));
    }

    .saved-item-row.selected {
      border-color: var(--tool-accent, #2563EB);
    }

    .saved-item-swatch {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      cursor: pointer;
      flex-shrink: 0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
    }

    .saved-item-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .saved-name-line {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .saved-name {
      font-size: 12px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .saved-name {
      color: var(--text, #0F172A);
    }

    .saved-hex {
      font-family: var(--ts-font-mono, monospace);
      font-size: 11px;
      color: var(--text-3, #71717A);
      cursor: pointer;
    }

    .saved-item-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .icon-tiny-btn {
      width: 24px;
      height: 24px;
      border-radius: 5px;
      background: transparent;
      border: none;
      color: var(--text-2, #A1A1AA);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 120ms ease;
    }

    .icon-tiny-btn:hover {
      background: var(--bg-1, #18181B);
      color: var(--text, #F4F4F5);
    }

    .icon-tiny-btn.danger:hover {
      background: rgba(239, 68, 68, 0.15);
      color: #EF4444;
    }

    .icon-tiny-btn.success:hover {
      background: rgba(16, 185, 129, 0.15);
      color: #10B981;
    }

    .inline-edit-wrap {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .inline-edit-input {
      flex: 1;
      height: 24px;
      background: var(--bg-1, #18181B);
      border: 1px solid var(--tool-accent, #2563EB);
      border-radius: 4px;
      padding: 0 6px;
      color: var(--text, #F4F4F5);
      font-size: 12px;
      outline: none;
    }

    :host-context([data-theme="light"]) .inline-edit-input {
      background: #FFFFFF;
      color: var(--text, #0F172A);
    }

    .empty-state-notice {
      padding: 14px;
      text-align: center;
      font-size: 12px;
      color: var(--text-3, #71717A);
      background: var(--bg-2, #27272A);
      border-radius: 8px;
    }

    :host-context([data-theme="light"]) .empty-state-notice {
      background: var(--bg-2, #F8FAFC);
    }

    /* Color History Grid */
    .history-swatches-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
      gap: 6px;
      max-height: 220px;
      overflow-y: auto;
    }

    .history-swatch-chip {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 6px;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 6px;
      cursor: pointer;
      position: relative;
      transition: border-color 120ms ease;
    }

    :host-context([data-theme="light"]) .history-swatch-chip {
      background: var(--bg-2, #F8FAFC);
      border-color: var(--border, rgba(0, 0, 0, 0.08));
    }

    .history-swatch-chip.active {
      border-color: var(--tool-accent, #2563EB);
    }

    .history-swatch-fill {
      width: 16px;
      height: 16px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      flex-shrink: 0;
    }

    .history-hex-label {
      flex: 1;
      font-family: var(--ts-font-mono, monospace);
      font-size: 11px;
      color: var(--text, #F4F4F5);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host-context([data-theme="light"]) .history-hex-label {
      color: var(--text, #0F172A);
    }

    .history-remove-btn {
      width: 14px;
      height: 14px;
      border-radius: 3px;
      background: transparent;
      border: none;
      color: var(--text-3, #71717A);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0.6;
      transition: all 120ms ease;
    }

    .history-remove-btn:hover {
      opacity: 1;
      color: #EF4444;
    }

    /* Tints and Shades */
    .shades-strip-wrap {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .shades-strip {
      display: flex;
      height: 32px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
    }

    .strip-swatch {
      flex: 1;
      height: 100%;
      cursor: pointer;
      transition: transform 140ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    .strip-swatch:hover {
      transform: scaleY(1.18);
      z-index: 10;
    }

    .strip-swatch:active {
      transform: scaleY(1.04) scaleX(0.96);
    }

    .strip-swatch.base {
      outline: 2px solid #FFFFFF;
      z-index: 5;
    }

    .shades-legend {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      font-weight: 600;
      color: var(--text-3, #71717A);
      padding: 0 2px;
    }

    @media (max-width: 480px) {
      .shades-legend span:nth-child(2) {
        display: none;
      }
    }

    /* Cross-Module Dispatch Grid */
    .dispatch-actions-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 6px;
    }

    .dispatch-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 8px;
      color: var(--text-2, #A1A1AA);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      text-align: left;
      transition: all 140ms ease;
    }

    :host-context([data-theme="light"]) .dispatch-btn {
      background: var(--bg-2, #F8FAFC);
      border-color: var(--border, rgba(0, 0, 0, 0.08));
      color: var(--text-2, #475569);
    }

    .dispatch-btn:hover {
      background: var(--tool-accent-soft, rgba(244, 63, 94, 0.1));
      color: var(--tool-accent, #2563EB);
      border-color: var(--tool-accent, #2563EB);
    }
  `]
})
export class ColorPickerModuleComponent implements AfterViewInit, OnDestroy {
  @ViewChild('spectrumBox') public spectrumBoxRef!: ElementRef<HTMLDivElement>;

  public state = inject(ColorStudioStateService);
  private engine = inject(ColorEngineService);

  // ── Initial Color for Before / After Comparison ──────────────────────────
  public initialColor = signal<string>(this.state.selectedColor());

  // ── Action Toolbar Popovers ───────────────────────────────────────────────
  public activePopover = signal<'history' | 'saved' | 'palette' | 'harmony' | null>(null);

  public togglePopover(name: 'history' | 'saved' | 'palette' | 'harmony'): void {
    this.activePopover.update(curr => (curr === name ? null : name));
  }

  public closePopover(): void {
    this.activePopover.set(null);
  }

  // ── Format Selector ──────────────────────────────────────────────────────
  public readonly formatModes: ColorFormat[] = ['hex', 'rgb', 'hsl', 'hsv', 'cmyk'];
  public activeFormat = signal<ColorFormat>('hex');

  // ── Eyedropper API Detection ─────────────────────────────────────────────
  public hasEyedropper = typeof window !== 'undefined' && 'EyeDropper' in window;

  // ── Manual Hex Temporary Input State (null when not typing) ───────────────
  public manualHex = signal<string | null>(null);

  // ── Color Representation from State ───────────────────────────────────────
  public color = this.state.activeColorObj;

  // ── Spectrum & Slider Coordinates (Fully Computed & Synchronized) ─────────
  public currentHue = computed<number>(() => this.color().hsv.h);
  public satPercent = computed<number>(() => this.color().hsv.s);
  public valPercent = computed<number>(() => this.color().hsv.v);
  public currentAlphaPercent = computed<number>(() => {
    return this.color().rgb.a !== undefined ? Math.round(this.color().rgb.a! * 100) : 100;
  });

  // ── Channel Numeric Models (Fully Computed & Synchronized) ────────────────
  public hexInputString = computed<string>(() => {
    return this.manualHex() ?? this.color().hex.replace(/^#/, '');
  });

  public rgbR = computed<number>(() => this.color().rgb.r);
  public rgbG = computed<number>(() => this.color().rgb.g);
  public rgbB = computed<number>(() => this.color().rgb.b);
  public rgbA = computed<number>(() => this.currentAlphaPercent());

  public hslH = computed<number>(() => this.color().hsl.h);
  public hslS = computed<number>(() => this.color().hsl.s);
  public hslL = computed<number>(() => this.color().hsl.l);
  public hslA = computed<number>(() => this.currentAlphaPercent());

  public hsvH = computed<number>(() => this.color().hsv.h);
  public hsvS = computed<number>(() => this.color().hsv.s);
  public hsvV = computed<number>(() => this.color().hsv.v);
  public hsvA = computed<number>(() => this.currentAlphaPercent());

  public cmykC = computed<number>(() => this.color().cmyk.c);
  public cmykM = computed<number>(() => this.color().cmyk.m);
  public cmykY = computed<number>(() => this.color().cmyk.y);
  public cmykK = computed<number>(() => this.color().cmyk.k);

  // ── Saved Color Item Form & Inline Rename ─────────────────────────────────
  public newSavedName = '';
  public editingItemId = signal<string | null>(null);
  public editingItemName = '';

  // ── Computed Representations ─────────────────────────────────────────────
  public solidHex = computed<string>(() => {
    // 6-character hex without alpha for solid preview
    const rgb = this.color().rgb;
    return this.engine.rgbToHex({ r: rgb.r, g: rgb.g, b: rgb.b });
  });

  public huePureHex = computed<string>(() => {
    return this.engine.rgbToHex(this.engine.hsvToRgb({ h: this.currentHue(), s: 100, v: 100 }));
  });

  public tintsAndShades = computed(() => {
    return this.engine.generateShadesAndTints(this.solidHex(), 5);
  });

  // ── Live WCAG Compliance Combinations ────────────────────────────────────
  public darkOnColorCompliance = computed<WcagCompliance>(() => {
    return this.engine.getContrastCompliance('#0F172A', this.solidHex());
  });

  public lightOnColorCompliance = computed<WcagCompliance>(() => {
    return this.engine.getContrastCompliance('#FFFFFF', this.solidHex());
  });

  public colorOnDarkCompliance = computed<WcagCompliance>(() => {
    return this.engine.getContrastCompliance(this.solidHex(), '#18181B');
  });

  public colorOnLightCompliance = computed<WcagCompliance>(() => {
    return this.engine.getContrastCompliance(this.solidHex(), '#FFFFFF');
  });

  private isDragging = false;

  public ngAfterViewInit(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', this.onGlobalMouseMove);
      window.addEventListener('mouseup', this.onGlobalMouseUp);
      window.addEventListener('touchmove', this.onGlobalTouchMove);
      window.addEventListener('touchend', this.onGlobalTouchEnd);
    }
  }

  public ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', this.onGlobalMouseMove);
      window.removeEventListener('mouseup', this.onGlobalMouseUp);
      window.removeEventListener('touchmove', this.onGlobalTouchMove);
      window.removeEventListener('touchend', this.onGlobalTouchEnd);
    }
  }

  // ── Format Tab Selection ──────────────────────────────────────────────────
  public setActiveFormat(fmt: ColorFormat): void {
    this.activeFormat.set(fmt);
  }

  // ── Spectrum Slider Interaction ───────────────────────────────────────────
  public onSpectrumStart(e: MouseEvent): void {
    this.isDragging = true;
    this.handleSpectrumPoint(e.clientX, e.clientY);
  }

  public onSpectrumTouchStart(e: TouchEvent): void {
    if (e.touches.length > 0) {
      this.isDragging = true;
      this.handleSpectrumPoint(e.touches[0].clientX, e.touches[0].clientY);
    }
  }

  public onSpectrumKeyDown(e: KeyboardEvent): void {
    let s = this.satPercent();
    let v = this.valPercent();
    const step = e.shiftKey ? 10 : 2;

    switch (e.key) {
      case 'ArrowRight':
        s = Math.min(100, s + step);
        break;
      case 'ArrowLeft':
        s = Math.max(0, s - step);
        break;
      case 'ArrowUp':
        v = Math.min(100, v + step);
        break;
      case 'ArrowDown':
        v = Math.max(0, v - step);
        break;
      default:
        return;
    }

    e.preventDefault();
    this.updateFromHsv(undefined, s, v);
  }

  private onGlobalMouseMove = (e: MouseEvent) => {
    if (!this.isDragging) return;
    this.handleSpectrumPoint(e.clientX, e.clientY);
  };

  private onGlobalMouseUp = () => {
    this.isDragging = false;
  };

  private onGlobalTouchMove = (e: TouchEvent) => {
    if (!this.isDragging || e.touches.length === 0) return;
    this.handleSpectrumPoint(e.touches[0].clientX, e.touches[0].clientY);
  };

  private onGlobalTouchEnd = () => {
    this.isDragging = false;
  };

  private handleSpectrumPoint(clientX: number, clientY: number): void {
    if (!this.spectrumBoxRef) return;
    const rect = this.spectrumBoxRef.nativeElement.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top));

    const s = Math.round((x / rect.width) * 100);
    const v = Math.round((1 - y / rect.height) * 100);

    this.updateFromHsv(undefined, s, v);
  }

  // ── Hue & Alpha Sliders ───────────────────────────────────────────────────
  public onHueSliderChange(hue: number): void {
    this.updateFromHsv(Number(hue));
  }

  public onHueNumChange(val: any): void {
    const num = Number(val);
    if (!isNaN(num) && num >= 0 && num <= 360) {
      this.updateFromHsv(num);
    }
  }

  public onHueBlur(): void {
    // Computed automatically restores valid hue
  }

  public onAlphaSliderChange(alpha: number): void {
    const a = Math.min(100, Math.max(0, Number(alpha))) / 100;
    this.updateFromHsv(undefined, undefined, undefined, a);
  }

  public onAlphaNumChange(val: any): void {
    const num = Number(val);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      this.updateFromHsv(undefined, undefined, undefined, num / 100);
    }
  }

  public onAlphaBlur(): void {
    // Computed automatically restores valid alpha
  }

  private updateFromHsv(
    h = this.currentHue(),
    s = this.satPercent(),
    v = this.valPercent(),
    a = this.currentAlphaPercent() / 100
  ): void {
    const rgb = this.engine.hsvToRgb({ h, s, v, a });
    const hex = this.engine.rgbToHex(rgb);
    this.state.setSelectedColor(hex);
  }

  // ── Revert to Initial Color ───────────────────────────────────────────────
  public revertToInitial(): void {
    this.state.setSelectedColor(this.initialColor());
    this.state.showToast('Reverted to initial color', this.initialColor());
  }

  // ── Format Editing Handlers with Auto-Reset on Invalid ────────────────────
  public onHexInputChange(val: string): void {
    this.manualHex.set(val);
    const clean = val.replace(/[^0-9a-fA-F]/g, '');
    if (clean.length === 3 || clean.length === 6 || clean.length === 8) {
      this.state.setSelectedColor('#' + clean);
    }
  }

  public onHexInputBlur(): void {
    this.manualHex.set(null);
  }

  public onRgbChange(channel: 'r' | 'g' | 'b' | 'a', value: any): void {
    const num = Number(value);
    if (isNaN(num)) return;

    const current = this.color().rgb;
    const r = channel === 'r' ? Math.min(255, Math.max(0, num)) : current.r;
    const g = channel === 'g' ? Math.min(255, Math.max(0, num)) : current.g;
    const b = channel === 'b' ? Math.min(255, Math.max(0, num)) : current.b;
    const a = channel === 'a' ? Math.min(100, Math.max(0, num)) / 100 : (current.a ?? 1);

    const hex = this.engine.rgbToHex({ r, g, b, a });
    this.state.setSelectedColor(hex);
  }

  public onRgbBlur(): void {
    // Computed automatically restores valid RGB
  }

  public onHslChange(channel: 'h' | 's' | 'l' | 'a', value: any): void {
    const num = Number(value);
    if (isNaN(num)) return;

    const current = this.color().hsl;
    const h = channel === 'h' ? Math.min(360, Math.max(0, num)) : current.h;
    const s = channel === 's' ? Math.min(100, Math.max(0, num)) : current.s;
    const l = channel === 'l' ? Math.min(100, Math.max(0, num)) : current.l;
    const a = channel === 'a' ? Math.min(100, Math.max(0, num)) / 100 : (current.a ?? 1);

    const hex = this.engine.hslToHex({ h, s, l, a });
    this.state.setSelectedColor(hex);
  }

  public onHslBlur(): void {
    // Computed automatically restores valid HSL
  }

  public onHsvChange(channel: 'h' | 's' | 'v' | 'a', value: any): void {
    const num = Number(value);
    if (isNaN(num)) return;

    const current = this.color().hsv;
    const h = channel === 'h' ? Math.min(360, Math.max(0, num)) : current.h;
    const s = channel === 's' ? Math.min(100, Math.max(0, num)) : current.s;
    const v = channel === 'v' ? Math.min(100, Math.max(0, num)) : current.v;
    const a = channel === 'a' ? Math.min(100, Math.max(0, num)) / 100 : (current.a ?? 1);

    const rgb = this.engine.hsvToRgb({ h, s, v, a });
    const hex = this.engine.rgbToHex(rgb);
    this.state.setSelectedColor(hex);
  }

  public onHsvBlur(): void {
    // Computed automatically restores valid HSV
  }

  public onCmykChange(channel: 'c' | 'm' | 'y' | 'k', value: any): void {
    const num = Number(value);
    if (isNaN(num)) return;

    const current = this.color().cmyk;
    const c = channel === 'c' ? Math.min(100, Math.max(0, num)) : current.c;
    const m = channel === 'm' ? Math.min(100, Math.max(0, num)) : current.m;
    const y = channel === 'y' ? Math.min(100, Math.max(0, num)) : current.y;
    const k = channel === 'k' ? Math.min(100, Math.max(0, num)) : current.k;

    const rgb = this.engine.cmykToRgb({ c, m, y, k });
    const hex = this.engine.rgbToHex(rgb);
    this.state.setSelectedColor(hex);
  }

  public onCmykBlur(): void {
    // Computed automatically restores valid CMYK
  }

  // ── Clipboard Copying Actions ─────────────────────────────────────────────
  public copyActiveHex(): void {
    this.state.copyToClipboard(this.state.activeColor(), 'HEX');
  }

  public copyActiveFormat(): void {
    const fmt = this.activeFormat();
    this.state.copyFormat(this.state.activeColor(), fmt as any);
  }

  // ── Eyedropper API ────────────────────────────────────────────────────────
  public async openEyeDropper(): Promise<void> {
    if (!this.hasEyedropper) return;
    try {
      // @ts-ignore
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      if (result && result.sRGBHex) {
        this.state.setSelectedColor(result.sRGBHex);
        this.state.showToast(`Sampled ${result.sRGBHex}`);
      }
    } catch {}
  }

  // ── Saved Colors Actions ──────────────────────────────────────────────────
  public saveCurrentColor(): void {
    const name = this.newSavedName.trim() || undefined;
    const success = this.state.saveColor(this.state.activeColor(), name);
    if (success) {
      this.newSavedName = '';
    }
  }

  public startEdit(item: SavedColorItem): void {
    this.editingItemId.set(item.id);
    this.editingItemName = item.name;
  }

  public commitEdit(id: string): void {
    this.state.updateSavedColorName(id, this.editingItemName);
    this.editingItemId.set(null);
  }

  public cancelEdit(): void {
    this.editingItemId.set(null);
    this.editingItemName = '';
  }
}

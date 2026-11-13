// apps/tool-color-studio/src/components/gradient/gradient-module.component.ts
import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ColorStudioStateService } from '../../services/color-studio-state.service';
import { GradientService, DIRECTION_PRESETS, RADIAL_POSITIONS } from '../../services/gradient.service';
import {
  GradientConfig,
  GradientStop,
  GradientType,
  RadialShape,
  RadialExtent,
  GradientPreset,
  SavedGradient
} from '../../models/color.models';
import { TsIconComponent } from '@acklet/tool-shell';
import { GradientRepairComponent } from './gradient-repair.component';

@Component({
  selector: 'app-gradient-module',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent, GradientRepairComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="gradient-stage-container">

      <!-- Single Workspace Module Header -->
      <div class="workspace-module-header">
        <div class="header-titles">
          <h2 class="workspace-title">Gradient Generator</h2>
          <p class="workspace-subtitle">Design linear, radial, and conic CSS gradients with multiple color stops.</p>
        </div>
        <div class="workspace-actions">
          <!-- Intelligent Repair Action -->
          <button 
            type="button" 
            class="toolbar-action-btn repair-btn" 
            (click)="openRepairModal()"
            title="Intelligent Gradient Repair & Auto Improve"
            aria-label="Repair Gradient"
          >
            <ts-icon name="wand-2" [size]="14" />
            <span>Repair Gradient</span>
          </button>

          <!-- Undo Gradient Change -->
          <button 
            type="button" 
            class="toolbar-action-btn" 
            [disabled]="!state.canUndoGradient()"
            (click)="state.undoGradient()"
            title="Undo gradient change"
            aria-label="Undo"
          >
            <ts-icon name="rotate-ccw" [size]="14" />
            <span>Undo</span>
          </button>

          <!-- Redo Gradient Change -->
          <button 
            type="button" 
            class="toolbar-action-btn" 
            [disabled]="!state.canRedoGradient()"
            (click)="state.redoGradient()"
            title="Redo gradient change"
            aria-label="Redo"
          >
            <ts-icon name="rotate-cw" [size]="14" />
            <span>Redo</span>
          </button>

          <button 
            type="button" 
            class="toolbar-action-btn" 
            (click)="reverseStops()"
            title="Reverse color stops order"
          >
            <ts-icon name="refresh-cw" [size]="14" />
            <span>Reverse</span>
          </button>
          <button 
            type="button" 
            class="toolbar-action-btn" 
            (click)="distributeStops()"
            title="Distribute unlocked stops evenly"
          >
            <ts-icon name="sliders" [size]="14" />
            <span>Distribute</span>
          </button>
          <button 
            type="button" 
            class="toolbar-action-btn" 
            (click)="randomizeGradient()"
            title="Generate random gradient"
          >
            <ts-icon name="sparkles" [size]="14" />
            <span>Random</span>
          </button>
          <button 
            type="button" 
            class="toolbar-action-btn" 
            (click)="resetToDefaults()"
            title="Reset to default gradient"
          >
            <ts-icon name="rotate-ccw" [size]="14" />
            <span>Reset</span>
          </button>
          <button 
            type="button" 
            class="toolbar-action-btn" 
            (click)="saveCurrentGradient()"
            title="Save gradient to bookmarks"
          >
            <ts-icon name="bookmark" [size]="14" />
            <span>Save</span>
          </button>
          <button 
            type="button" 
            class="toolbar-action-btn primary" 
            (click)="copyCss()"
            title="Copy CSS to clipboard"
          >
            <ts-icon name="copy" [size]="14" />
            <span>Copy CSS</span>
          </button>
        </div>
      </div>

      <!-- Main Two-Column Studio Layout -->
      <div class="gradient-stage-grid">
        
        <!-- Left Column: Visual Viewport, Stops Rail, and Color Stops List -->
        <div class="gradient-viewport-column">
          
          <!-- Live Preview Card -->
          <div class="viewport-card">
            <div class="viewport-card-header">
              <div class="viewport-meta-badge">
                <span class="type-pill">{{ currentType() | uppercase }}</span>
                <span class="details-pill">{{ getGradientSummary() }}</span>
              </div>

              <!-- Viewport Backdrop Selector -->
              <div class="backdrop-toggle-group">
                <button 
                  type="button" 
                  class="backdrop-pill" 
                  [class.active]="previewBackdrop() === 'checkerboard'"
                  (click)="setBackdrop('checkerboard')"
                  data-tooltip="Checkerboard transparency"
                  title="Checkerboard (Transparency)"
                  aria-label="Checkerboard transparency backdrop"
                >
                  <span class="checkerboard-icon-tile"></span>
                </button>
                <button 
                  type="button" 
                  class="backdrop-pill" 
                  [class.active]="previewBackdrop() === 'dark'"
                  (click)="setBackdrop('dark')"
                  data-tooltip="Dark background"
                  title="Dark Background"
                  aria-label="Dark background backdrop"
                >
                  <span class="color-dot dot-dark"></span>
                </button>
                <button 
                  type="button" 
                  class="backdrop-pill" 
                  [class.active]="previewBackdrop() === 'light'"
                  (click)="setBackdrop('light')"
                  data-tooltip="Light background"
                  title="Light Background"
                  aria-label="Light background backdrop"
                >
                  <span class="color-dot dot-light"></span>
                </button>
              </div>
            </div>

            <!-- Viewport Canvas Container -->
            <div 
              class="viewport-canvas-container"
              [class.backdrop-checker]="previewBackdrop() === 'checkerboard'"
              [class.backdrop-dark]="previewBackdrop() === 'dark'"
              [class.backdrop-light]="previewBackdrop() === 'light'"
            >
              <div 
                class="viewport-gradient-layer"
                [style.background]="state.gradientCss()"
              ></div>
            </div>

            <!-- Interactive Gradient Rail Track -->
            <div class="rail-container">
              <div class="rail-header">
                <span class="rail-title">Interactive Gradient Rail</span>
                <span class="rail-hint">Click rail to add a stop</span>
              </div>
              <div 
                #railElement
                class="gradient-track-rail"
                [style.background]="state.gradientCss()"
                (click)="onRailClick($event)"
              >
                @for (stop of sortedStops(); track stop.id; let idx = $index) {
                  <div 
                    class="rail-stop-marker"
                    [class.active]="selectedStopId() === stop.id"
                    [style.left.%]="stop.position"
                    [style.background-color]="stop.color"
                    (mousedown)="startStopDrag($event, stop.id, idx)"
                    (touchstart)="startStopDrag($event, stop.id, idx)"
                    (click)="$event.stopPropagation(); selectStop(stop.id)"
                    [attr.title]="stop.color + ' at ' + stop.position + '% (drag to adjust)'"
                    [attr.aria-label]="'Gradient stop ' + (idx + 1) + ': ' + stop.color + ' at ' + stop.position + '%'"
                  ></div>
                }
              </div>
            </div>

            <!-- Color Stops Management Section (Unified inside viewport card) -->
            <div class="stops-management-section">
              <div class="stops-section-header">
                <div class="stops-title-wrap">
                  <h3 class="card-section-title">Color Stops ({{ stops().length }})</h3>
                  <span class="stops-subtext">Drag or edit stop positions (0–100%)</span>
                </div>
                <div class="stops-section-actions">
                  <button 
                    type="button" 
                    class="action-btn-sm" 
                    (click)="addStop()"
                    title="Add new color stop"
                    aria-label="Add new color stop"
                  >
                    <ts-icon name="plus" [size]="13" />
                    <span>Add Stop</span>
                  </button>
                  <button 
                    type="button" 
                    class="action-btn-sm" 
                    (click)="populateFromSharedPalette()"
                    title="Replace stops with shared palette"
                    aria-label="Import palette from shared colors"
                  >
                    <ts-icon name="layers" [size]="13" />
                    <span>Import Palette</span>
                  </button>
                </div>
              </div>

              <!-- Color Stops List -->
              <div class="stops-items-list">
                @for (stop of sortedStops(); track stop.id; let idx = $index) {
                  <div 
                    class="stop-row-card"
                    [class.selected-row]="selectedStopId() === stop.id"
                    (click)="selectStop(stop.id)"
                  >
                    <!-- Stop Number Badge -->
                    <div class="stop-badge">{{ idx + 1 }}</div>

                    <!-- Color Swatch & Native Color Picker -->
                    <div class="stop-color-input-wrapper">
                      <input 
                        type="color" 
                        #stopColorPicker
                        class="native-color-picker" 
                        [ngModel]="stop.color" 
                        (ngModelChange)="updateStopColor(stop.id, $event)"
                        title="Select stop color"
                        aria-label="Select stop color"
                      />
                      <input 
                        type="text" 
                        class="stop-hex-input"
                        [value]="stop.color.toUpperCase()"
                        (change)="onHexInputBlur(stop.id, $event)"
                        maxlength="7"
                        spellcheck="false"
                        title="Edit stop HEX color"
                        aria-label="Stop HEX color value"
                      />
                    </div>

                    <!-- Position Slider and Number Input with Adjacent Bounds -->
                    <div class="stop-position-control">
                      <input 
                        type="range" 
                        [min]="getStopMinBound(idx)" 
                        [max]="getStopMaxBound(idx)" 
                        class="stop-range-slider"
                        [ngModel]="stop.position" 
                        (ngModelChange)="onPositionSliderChange(stop.id, $event, idx)"
                        [attr.title]="'Stop position: ' + stop.position + '%'"
                        aria-label="Stop position percentage slider"
                      />
                      <div class="position-input-box" [class.has-error]="isStopPositionInvalid(stop.id)">
                        <input 
                          type="number" 
                          [min]="getStopMinBound(idx)" 
                          [max]="getStopMaxBound(idx)" 
                          class="position-number-input"
                          [ngModel]="stop.position"
                          (ngModelChange)="onPositionNumberChange(stop.id, $event, idx)"
                          (blur)="onPositionNumberBlur(stop.id, $event, idx)"
                          [attr.title]="'Stop position: ' + stop.position + '% (valid range: ' + getStopMinBound(idx) + '% – ' + getStopMaxBound(idx) + '%)'"
                          aria-label="Stop position percentage number"
                        />
                        <span class="percent-sym">%</span>
                      </div>
                    </div>

                    <!-- Stop Action Buttons -->
                    <div class="stop-row-actions">
                      <button 
                        type="button" 
                        class="row-action-icon"
                        [class.locked]="stop.locked"
                        (click)="$event.stopPropagation(); toggleLock(stop.id)"
                        [attr.data-tooltip]="stop.locked ? 'Unlock color stop' : 'Lock color stop'"
                        data-tooltip-pos="left"
                        [title]="stop.locked ? 'Unlock color stop' : 'Lock color stop'"
                        [attr.aria-label]="stop.locked ? 'Unlock color stop' : 'Lock color stop'"
                      >
                        <ts-icon [name]="stop.locked ? 'lock' : 'unlock'" [size]="13" />
                      </button>

                      <button 
                        type="button" 
                        class="row-action-icon" 
                        (click)="$event.stopPropagation(); triggerNativePicker(stopColorPicker)"
                        data-tooltip="Edit color stop"
                        data-tooltip-pos="left"
                        title="Edit color stop"
                        aria-label="Edit color stop"
                      >
                        <ts-icon name="palette" [size]="13" />
                      </button>

                      <button 
                        type="button" 
                        class="row-action-icon" 
                        (click)="$event.stopPropagation(); saveStopColor(stop.color)"
                        data-tooltip="Save color stop"
                        data-tooltip-pos="left"
                        title="Save color stop"
                        aria-label="Save color stop"
                      >
                        <ts-icon name="bookmark" [size]="13" />
                      </button>

                      @if (stops().length > 2) {
                        <button 
                          type="button" 
                          class="row-action-icon delete-icon" 
                          (click)="$event.stopPropagation(); removeStop(stop.id)" 
                          data-tooltip="Remove color stop"
                          data-tooltip-pos="left"
                          title="Remove color stop"
                          aria-label="Remove color stop"
                        >
                          <ts-icon name="trash-2" [size]="13" />
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>

              <!-- Bottom Cross-Module CTA -->
              <div class="stops-footer-bar">
                <button 
                  type="button" 
                  class="secondary-outline-btn"
                  (click)="sendStopsToSharedPalette()"
                  title="Send all stop colors to shared workspace palette"
                  aria-label="Send all stop colors to shared workspace palette"
                >
                  <ts-icon name="send" [size]="13" />
                  <span>Send All Stops to Shared Palette</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        <!-- Right Column: Settings, Code Generator, Presets & Saved -->
        <div class="gradient-settings-column">

          <!-- Type Selector & Orientation Controls -->
          <div class="control-card">
            <h3 class="card-section-title">Gradient Parameters</h3>

            <!-- 3 Gradient Types: Linear, Radial, Conic -->
            <div class="type-segmented-control">
              <button 
                type="button" 
                class="seg-btn" 
                [class.active]="currentType() === 'linear'"
                (click)="setType('linear')"
              >
                <ts-icon name="sliders-horizontal" [size]="14" />
                <span>Linear</span>
              </button>
              <button 
                type="button" 
                class="seg-btn" 
                [class.active]="currentType() === 'radial'"
                (click)="setType('radial')"
              >
                <ts-icon name="compass" [size]="14" />
                <span>Radial</span>
              </button>
              <button 
                type="button" 
                class="seg-btn" 
                [class.active]="currentType() === 'conic'"
                (click)="setType('conic')"
              >
                <ts-icon name="refresh-cw" [size]="14" />
                <span>Conic</span>
              </button>
            </div>

            <!-- LINEAR CONTROLS -->
            @if (currentType() === 'linear') {
              <div class="parameter-group">
                <div class="param-header">
                  <label class="param-label" for="angle-slider">Angle</label>
                  <div class="param-value-wrap">
                    <input 
                      type="number" 
                      min="0" 
                      max="360" 
                      class="param-num-input"
                      [ngModel]="currentAngle()" 
                      (ngModelChange)="onAngleChange($event)"
                      id="angle-slider"
                      aria-label="Linear gradient angle"
                    />
                    <span class="unit-deg">°</span>
                  </div>
                </div>

                <input 
                  type="range" 
                  min="0" 
                  max="360" 
                  class="styled-range-slider"
                  [ngModel]="currentAngle()" 
                  (ngModelChange)="onAngleChange($event)"
                  aria-label="Angle range slider"
                />

                <!-- Direction Presets Grid -->
                <div class="direction-presets-grid">
                  @for (preset of directionPresets; track preset.angle) {
                    <button 
                      type="button" 
                      class="dir-preset-btn"
                      [class.active]="currentAngle() === preset.angle"
                      (click)="onAngleChange(preset.angle)"
                      [title]="preset.label + ' (' + preset.angle + '°)'"
                    >
                      {{ preset.angle }}°
                    </button>
                  }
                </div>
              </div>
            }

            <!-- RADIAL CONTROLS -->
            @if (currentType() === 'radial') {
              <div class="parameter-group">
                <div class="subparam-row">
                  <span class="subparam-label">Shape</span>
                  <div class="toggle-pill-group">
                    <button 
                      type="button" 
                      class="pill-btn" 
                      [class.active]="currentShape() === 'circle'"
                      (click)="setShape('circle')"
                    >
                      Circle
                    </button>
                    <button 
                      type="button" 
                      class="pill-btn" 
                      [class.active]="currentShape() === 'ellipse'"
                      (click)="setShape('ellipse')"
                    >
                      Ellipse
                    </button>
                  </div>
                </div>

                <div class="subparam-row">
                  <span class="subparam-label">Extent</span>
                  <select 
                    class="styled-select"
                    [ngModel]="currentExtent()"
                    (ngModelChange)="setExtent($event)"
                    aria-label="Radial gradient extent"
                  >
                    <option value="farthest-corner">farthest-corner</option>
                    <option value="closest-side">closest-side</option>
                    <option value="closest-corner">closest-corner</option>
                    <option value="farthest-side">farthest-side</option>
                  </select>
                </div>

                <!-- Center Position Presets -->
                <div class="subparam-block">
                  <div class="param-header">
                    <span class="subparam-label">Center Position</span>
                    <span class="coord-label">{{ currentPosX() }}% , {{ currentPosY() }}%</span>
                  </div>

                  <div class="position-presets-grid">
                    @for (pos of radialPositions; track pos.label) {
                      <button 
                        type="button" 
                        class="pos-grid-btn"
                        [class.active]="currentPosX() === pos.x && currentPosY() === pos.y"
                        (click)="setPosition(pos.x, pos.y)"
                        [title]="pos.label"
                      >
                        {{ pos.label }}
                      </button>
                    }
                  </div>

                  <!-- Custom Position X / Y Sliders -->
                  <div class="xy-sliders-wrap">
                    <div class="xy-slider-row">
                      <span class="axis-badge">X</span>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        class="styled-range-slider"
                        [ngModel]="currentPosX()" 
                        (ngModelChange)="onPosXChange($event)"
                        aria-label="Position X percent"
                      />
                      <span class="axis-val">{{ currentPosX() }}%</span>
                    </div>

                    <div class="xy-slider-row">
                      <span class="axis-badge">Y</span>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        class="styled-range-slider"
                        [ngModel]="currentPosY()" 
                        (ngModelChange)="onPosYChange($event)"
                        aria-label="Position Y percent"
                      />
                      <span class="axis-val">{{ currentPosY() }}%</span>
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- CONIC CONTROLS -->
            @if (currentType() === 'conic') {
              <div class="parameter-group">
                <div class="param-header">
                  <label class="param-label" for="conic-angle-slider">Starting Angle</label>
                  <div class="param-value-wrap">
                    <input 
                      type="number" 
                      min="0" 
                      max="360" 
                      class="param-num-input"
                      [ngModel]="currentAngle()" 
                      (ngModelChange)="onAngleChange($event)"
                      id="conic-angle-slider"
                      aria-label="Conic starting angle"
                    />
                    <span class="unit-deg">°</span>
                  </div>
                </div>

                <input 
                  type="range" 
                  min="0" 
                  max="360" 
                  class="styled-range-slider"
                  [ngModel]="currentAngle()" 
                  (ngModelChange)="onAngleChange($event)"
                  aria-label="Conic starting angle slider"
                />

                <!-- Conic Center Position -->
                <div class="subparam-block">
                  <div class="param-header">
                    <span class="subparam-label">Center Point</span>
                    <span class="coord-label">{{ currentPosX() }}% , {{ currentPosY() }}%</span>
                  </div>

                  <div class="position-presets-grid">
                    @for (pos of radialPositions; track pos.label) {
                      <button 
                        type="button" 
                        class="pos-grid-btn"
                        [class.active]="currentPosX() === pos.x && currentPosY() === pos.y"
                        (click)="setPosition(pos.x, pos.y)"
                        [title]="pos.label"
                      >
                        {{ pos.label }}
                      </button>
                    }
                  </div>

                  <!-- X and Y Sliders -->
                  <div class="xy-sliders-wrap">
                    <div class="xy-slider-row">
                      <span class="axis-badge">X</span>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        class="styled-range-slider"
                        [ngModel]="currentPosX()" 
                        (ngModelChange)="onPosXChange($event)"
                        aria-label="Conic center X percent"
                      />
                      <span class="axis-val">{{ currentPosX() }}%</span>
                    </div>

                    <div class="xy-slider-row">
                      <span class="axis-badge">Y</span>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        class="styled-range-slider"
                        [ngModel]="currentPosY()" 
                        (ngModelChange)="onPosYChange($event)"
                        aria-label="Conic center Y percent"
                      />
                      <span class="axis-val">{{ currentPosY() }}%</span>
                    </div>
                  </div>
                </div>
              </div>
            }

          </div>

          <!-- Generated CSS Output & Export Suite -->
          <div class="control-card">
            <div class="card-header-with-action">
              <h3 class="card-section-title">CSS Code & Export</h3>
              <div class="rule-mode-toggles">
                <button 
                  type="button" 
                  class="text-mode-btn"
                  [class.active]="!fullRuleMode()"
                  (click)="fullRuleMode.set(false)"
                >
                  Property
                </button>
                <button 
                  type="button" 
                  class="text-mode-btn"
                  [class.active]="fullRuleMode()"
                  (click)="fullRuleMode.set(true)"
                >
                  Full Rule
                </button>
              </div>
            </div>

            <!-- Formatted Code Preview Box -->
            <div class="code-box-wrapper">
              <pre class="css-code-pre"><code>{{ formattedCssOutput() }}</code></pre>
            </div>

            <!-- Export Buttons Suite -->
            <div class="export-actions-grid">
              <button 
                type="button" 
                class="export-btn export-btn-accent" 
                (click)="copyCss()"
                title="Copy CSS to clipboard"
              >
                <ts-icon name="copy" [size]="14" />
                <span>Copy CSS</span>
              </button>

              <button 
                type="button" 
                class="export-btn" 
                (click)="downloadCssFile()"
                title="Download standalone CSS stylesheet"
              >
                <ts-icon name="file-text" [size]="14" />
                <span>.CSS</span>
              </button>

              <button 
                type="button" 
                class="export-btn" 
                (click)="exportJsonFile()"
                title="Export JSON configuration"
              >
                <ts-icon name="download" [size]="14" />
                <span>JSON</span>
              </button>

              <button 
                type="button" 
                class="export-btn" 
                (click)="downloadPng()"
                title="Download high-resolution 1200x800 PNG image"
              >
                <ts-icon name="image" [size]="14" />
                <span>PNG</span>
              </button>
            </div>
          </div>

          <!-- Saved Custom Gradients -->
          <div class="control-card">
            <div class="card-header-with-action">
              <h3 class="card-section-title">Saved Gradients ({{ state.savedGradients().length }})</h3>
              <button 
                type="button" 
                class="save-inline-btn"
                (click)="saveCurrentGradient()"
              >
                <ts-icon name="plus" [size]="13" />
                <span>Save</span>
              </button>
            </div>

            @if (state.savedGradients().length === 0) {
              <div class="empty-saved-msg">
                No saved gradients yet. Click "Save Gradient" to store your favorite gradients in LocalStorage.
              </div>
            } @else {
              <div class="saved-gradients-list">
                @for (item of state.savedGradients(); track item.id) {
                  <div 
                    class="saved-item-row"
                    [class.just-saved]="justSavedId() === item.id"
                    (click)="applySavedGradient(item)"
                    role="button"
                    tabindex="0"
                    (keydown.enter)="applySavedGradient(item)"
                    (keydown.space)="applySavedGradient(item); $event.preventDefault()"
                    [title]="'Apply ' + item.name"
                  >
                    <div 
                      class="saved-item-thumb" 
                      [style.background]="item.css"
                    ></div>
                    
                    <div class="saved-item-info">
                      @if (renamingId() === item.id) {
                        <input 
                          type="text" 
                          class="rename-input" 
                          [value]="item.name"
                          (click)="$event.stopPropagation()"
                          (blur)="saveRename(item.id, $event)"
                          (keydown.enter)="saveRename(item.id, $event)"
                          autofocus
                        />
                      } @else {
                        <span 
                          class="saved-item-name" 
                        >
                          {{ item.name }}
                        </span>
                      }
                      <span class="saved-item-meta">{{ item.config.type | uppercase }} • {{ item.config.stops.length }} stops</span>
                    </div>

                    <div class="saved-item-actions">
                      <button 
                        type="button" 
                        class="icon-ghost-btn" 
                        (click)="startRenaming(item.id, $event)"
                        title="Rename gradient"
                        aria-label="Rename gradient"
                      >
                        <ts-icon name="edit" [size]="13" />
                      </button>
                      <button 
                        type="button" 
                        class="icon-ghost-btn delete-ghost" 
                        (click)="deleteSaved(item.id, $event)"
                        title="Delete saved gradient"
                        aria-label="Delete saved gradient"
                      >
                        <ts-icon name="trash-2" [size]="13" />
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

        </div>

      </div>

      <!-- Built-in Inspiration Presets Landscape Gallery -->
      <div class="control-card inspiration-landscape-card">
        <div class="inspiration-header-bar">
          <div class="inspiration-title-wrap">
            <div class="inspiration-icon-badge">
              <ts-icon name="sparkles" [size]="16" />
            </div>
            <div class="inspiration-titles">
              <div class="inspiration-heading-row">
                <h3 class="card-section-title">Inspiration Presets</h3>
                <span class="inspiration-count-badge">{{ filteredPresets().length }} presets</span>
              </div>
              <p class="inspiration-subtitle">Curated linear, radial, and conic gradients ready for modern UI design.</p>
            </div>
          </div>

          <div class="preset-filter-pills">
            @for (cat of inspirationCategories; track cat.id) {
              <button 
                type="button" 
                class="filter-pill"
                [class.active]="presetFilter() === cat.id"
                (click)="presetFilter.set(cat.id)"
              >
                {{ cat.label }}
              </button>
            }
          </div>
        </div>

        <div class="landscape-presets-grid">
          @for (preset of filteredPresets(); track preset.id) {
            <div 
              class="landscape-preset-card" 
              (click)="applyPreset(preset)"
              [title]="'Apply preset: ' + preset.name"
              role="button"
              tabindex="0"
              (keydown.enter)="applyPreset(preset)"
              (keydown.space)="applyPreset(preset)"
            >
              <div 
                class="landscape-preset-swatch" 
                [style.background]="gradientService.generateCss(preset.config)"
              >
                <div class="swatch-hover-overlay">
                  <span class="apply-pill">
                    <ts-icon name="check" [size]="12" />
                    <span>Apply Gradient</span>
                  </span>
                </div>
              </div>
              <div class="landscape-preset-footer">
                <div class="preset-info-row">
                  <span class="preset-name">{{ preset.name }}</span>
                  <span class="preset-type-tag" [attr.data-type]="preset.config.type">{{ preset.config.type }}</span>
                </div>
                <div class="preset-meta-row">
                  <div class="preset-stops-preview">
                    @for (s of preset.config.stops; track s.id) {
                      <span class="preset-stop-dot" [style.background]="s.color" [title]="s.color"></span>
                    }
                  </div>
                  <span class="preset-stops-count">{{ preset.config.stops.length }} stops</span>
                </div>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Intelligent Gradient Repair & Auto Improve Modal Dialog -->
      <app-gradient-repair 
        [isOpen]="isRepairModalOpen()" 
        [originalConfig]="state.gradientConfig()" 
        (close)="closeRepairModal()" 
        (applied)="onRepairApplied($event)" 
      />

    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .gradient-stage-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      width: 100%;
    }

    /* ── Single Workspace Module Header ── */
    .workspace-module-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 8px;
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
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 6px;
        width: 100%;
        overflow-x: visible;
        flex-wrap: wrap;
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
      .toolbar-action-btn span {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 10px;
        max-width: 100%;
        text-align: center;
      }
      .toolbar-action-btn.primary {
        grid-column: 1 / -1;
        min-height: 44px;
        flex-direction: row;
        font-size: 13px;
      }
      .toolbar-action-btn.primary span {
        font-size: 12px;
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

    .toolbar-action-btn.repair-btn {
      background: rgba(139, 92, 246, 0.12);
      border-color: rgba(139, 92, 246, 0.35);
      color: #A78BFA;
    }

    :host-context([data-theme="light"]) .toolbar-action-btn.repair-btn {
      background: rgba(124, 58, 237, 0.08);
      border-color: rgba(124, 58, 237, 0.3);
      color: #7C3AED;
    }

    .toolbar-action-btn.repair-btn:hover:not(:disabled) {
      background: rgba(139, 92, 246, 0.22);
      border-color: #8B5CF6;
      color: #C4B5FD;
    }

    :host-context([data-theme="light"]) .toolbar-action-btn.repair-btn:hover:not(:disabled) {
      background: rgba(124, 58, 237, 0.14);
      border-color: #7C3AED;
      color: #6D28D9;
    }

    /* ── Main Layout Grid ── */
    .gradient-stage-grid {
      display: grid;
      grid-template-columns: 1fr 420px;
      gap: 20px;
      align-items: start;
    }

    @media (max-width: 1040px) {
      .gradient-stage-grid {
        grid-template-columns: 1fr;
      }
    }

    /* ── Common Card Styling ── */
    .viewport-card,
    .control-card {
      background: var(--bg-1, #18181B);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 14px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    :host-context([data-theme="light"]) .viewport-card,
    :host-context([data-theme="light"]) .control-card {
      background: #FFFFFF;
      border-color: var(--border, rgba(0, 0, 0, 0.08));
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .card-section-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 0;
      letter-spacing: -0.01em;
    }

    :host-context([data-theme="light"]) .card-section-title {
      color: #0F172A !important;
    }

    .card-header-with-action {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
    }

    /* ── Viewport Section ── */
    .viewport-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
    }

    .viewport-meta-badge {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .type-pill {
      padding: 3px 8px;
      border-radius: 6px;
      background: var(--tool-accent, #2563EB);
      color: #FFFFFF;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
    }

    .details-pill {
      padding: 3px 8px;
      border-radius: 6px;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text-2, #A1A1AA);
      font-size: 11px;
      font-weight: 600;
    }

    :host-context([data-theme="light"]) .details-pill {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.08);
      color: #475569;
    }

    .backdrop-toggle-group {
      display: flex;
      align-items: center;
      gap: 4px;
      background: var(--bg-2, #27272A);
      padding: 3px;
      border-radius: 8px;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
    }

    :host-context([data-theme="light"]) .backdrop-toggle-group {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.08);
    }

    .backdrop-pill {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 6px;
      border: none;
      background: transparent;
      cursor: pointer;
      padding: 0;
      transition: all 120ms ease;
    }

    .backdrop-pill.active {
      background: var(--bg-1, #18181B);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    :host-context([data-theme="light"]) .backdrop-pill.active {
      background: #FFFFFF;
    }

    .checkerboard-icon-tile {
      width: 14px;
      height: 14px;
      border-radius: 3px;
      background-image: linear-gradient(45deg, #888 25%, transparent 25%),
                        linear-gradient(-45deg, #888 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #888 75%),
                        linear-gradient(-45deg, transparent 75%, #888 75%);
      background-size: 6px 6px;
      background-position: 0 0, 0 3px, 3px -3px, -3px 0px;
    }

    .color-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .dot-dark {
      background: #09090B;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .dot-light {
      background: #FFFFFF;
      border: 1px solid rgba(0, 0, 0, 0.2);
    }

    .viewport-canvas-container {
      width: 100%;
      height: 280px;
      border-radius: 12px;
      overflow: hidden;
      position: relative;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
    }

    @media (max-width: 639px) {
      .viewport-canvas-container {
        height: clamp(180px, 35vh, 260px);
        min-height: 180px;
      }
    }

    .backdrop-checker {
      background-image: linear-gradient(45deg, rgba(120, 120, 120, 0.15) 25%, transparent 25%),
                        linear-gradient(-45deg, rgba(120, 120, 120, 0.15) 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, rgba(120, 120, 120, 0.15) 75%),
                        linear-gradient(-45deg, transparent 75%, rgba(120, 120, 120, 0.15) 75%);
      background-size: 16px 16px;
      background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
      background-color: var(--bg-1, #18181B);
    }

    .backdrop-dark {
      background-color: #09090B;
    }

    .backdrop-light {
      background-color: #FFFFFF;
    }

    .viewport-gradient-layer {
      width: 100%;
      height: 100%;
      transition: background 100ms ease;
    }

    /* ── Interactive Stops Rail ── */
    .rail-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .rail-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .rail-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-2, #A1A1AA);
    }

    :host-context([data-theme="light"]) .rail-title {
      color: #334155 !important;
    }

    .rail-hint {
      font-size: 11px;
      color: var(--text-muted, #71717A);
    }

    :host-context([data-theme="light"]) .rail-hint {
      color: #64748B !important;
    }

    .gradient-track-rail {
      margin: 0 12px;
      width: calc(100% - 24px);
      height: 28px;
      border-radius: 8px;
      position: relative;
      cursor: crosshair;
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    .rail-stop-marker {
      position: absolute;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 18px;
      height: 34px;
      border-radius: 5px;
      border: 2px solid #FFFFFF;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
      cursor: ew-resize;
      user-select: none;
      touch-action: none;
      transition: border-color 120ms ease, box-shadow 120ms ease;
      z-index: 2;
    }

    @media (max-width: 1023px) {
      .rail-stop-marker {
        width: 24px;
        height: 40px;
      }
    }

    .rail-stop-marker:hover,
    .rail-stop-marker.active {
      transform: translate(-50%, -50%) scale(1.15);
      border-color: var(--tool-accent, #2563EB);
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.4), 0 3px 8px rgba(0, 0, 0, 0.4);
      z-index: 3;
    }

    /* ── Color Stops Management Section (Unified inside viewport card) ── */
    .stops-management-section {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding-top: 16px;
      border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .stops-management-section {
      border-top-color: rgba(0, 0, 0, 0.08);
    }

    .stops-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
    }

    .stops-subtext {
      font-size: 12px;
      color: var(--text-2, #A1A1AA);
    }

    :host-context([data-theme="light"]) .stops-subtext {
      color: #475569 !important;
    }

    .stops-section-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .action-btn-sm {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 10px;
      border-radius: 6px;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text, #F4F4F5);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 120ms ease;
    }

    :host-context([data-theme="light"]) .action-btn-sm {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.08);
      color: #0F172A;
    }

    .action-btn-sm:hover {
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
    }

    .stops-items-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .stop-row-card {
      display: grid;
      grid-template-columns: 24px 130px 1fr auto;
      gap: 12px;
      align-items: center;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
      border-radius: 8px;
      padding: 8px 12px;
      transition: all 120ms ease;
    }

    @media (max-width: 639px) {
      .stops-section-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }
      .stops-section-actions {
        width: 100%;
        display: flex;
        gap: 8px;
      }
      .stops-section-actions .action-btn-sm {
        flex: 1;
        justify-content: center;
        min-height: 44px;
      }
      .stop-row-card {
        display: grid;
        grid-template-columns: 24px 1fr auto;
        grid-template-areas:
          "badge color actions"
          "pos pos pos";
        gap: 10px 10px;
        padding: 10px 12px;
      }
      .stop-badge {
        grid-area: badge;
        align-self: center;
      }
      .stop-color-input-wrapper {
        grid-area: color;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .stop-hex-input {
        width: 100% !important;
        max-width: 110px;
        min-height: 38px;
      }
      .stop-row-actions {
        grid-area: actions;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .row-action-icon {
        width: 34px;
        height: 34px;
      }
      .stop-position-control {
        grid-area: pos;
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
      }
      .stop-range-slider {
        flex: 1;
        min-width: 0;
      }
      .position-input-box {
        flex-shrink: 0;
        width: 58px;
      }
      .stops-footer-bar .secondary-outline-btn {
        width: 100%;
        justify-content: center;
        min-height: 44px;
      }
    }

    :host-context([data-theme="light"]) .stop-row-card {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.06);
    }

    .stop-row-card:hover,
    .stop-row-card.selected-row {
      border-color: var(--tool-accent, #2563EB);
    }

    .stop-badge {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-2, #A1A1AA);
      text-align: center;
    }

    :host-context([data-theme="light"]) .stop-badge {
      color: #334155 !important;
    }

    .stop-color-input-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .native-color-picker {
      width: 28px;
      height: 28px;
      padding: 0;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 6px;
      cursor: pointer;
      background: transparent;
    }

    .stop-hex-input {
      width: 80px;
      padding: 5px 8px;
      font-family: var(--ts-font-mono, monospace);
      font-size: 11px;
      font-weight: 600;
      background: var(--bg-1, #18181B);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      border-radius: 6px;
      color: var(--text, #F4F4F5);
      text-transform: uppercase;
    }

    :host-context([data-theme="light"]) .stop-hex-input {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.1);
      color: #0F172A;
    }

    .stop-position-control {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .stop-range-slider {
      flex: 1;
      height: 5px;
      -webkit-appearance: none;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 3px;
      outline: none;
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .stop-range-slider {
      background: rgba(0, 0, 0, 0.12);
    }

    .stop-range-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--tool-accent, #2563EB);
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }

    .position-input-box {
      display: flex;
      align-items: center;
      gap: 2px;
      background: var(--bg-1, #18181B);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      border-radius: 6px;
      padding: 3px 6px;
      width: 60px;
      transition: border-color 140ms ease, box-shadow 140ms ease;
    }

    :host-context([data-theme="light"]) .position-input-box {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.1);
    }

    .position-input-box.has-error {
      border-color: #EF4444 !important;
      box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.25) !important;
    }

    .position-number-input {
      width: 32px;
      background: transparent;
      border: none;
      font-size: 11px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
      text-align: right;
      outline: none;
    }

    :host-context([data-theme="light"]) .position-number-input {
      color: #0F172A;
    }

    .percent-sym {
      font-size: 11px;
      color: var(--text-2, #A1A1AA);
    }

    .stop-row-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .row-action-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: var(--text-2, #A1A1AA);
      cursor: pointer;
      transition: all 120ms ease;
    }

    .row-action-icon:hover {
      background: var(--bg-1, #18181B);
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .row-action-icon:hover {
      background: #E2E8F0;
      color: #0F172A;
    }

    .row-action-icon.locked {
      color: #F59E0B;
    }

    .delete-icon:hover {
      color: #EF4444;
      background: rgba(239, 68, 68, 0.12);
    }

    .stops-footer-bar {
      display: flex;
      justify-content: flex-start;
      padding-top: 4px;
    }

    .secondary-outline-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 6px;
      background: transparent;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      color: var(--text-2, #A1A1AA);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 120ms ease;
    }

    :host-context([data-theme="light"]) .secondary-outline-btn {
      border-color: rgba(0, 0, 0, 0.12);
      color: #475569;
    }

    .secondary-outline-btn:hover {
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
    }

    /* ── Right Column: Configuration & Controls ── */
    .gradient-settings-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .type-segmented-control {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4px;
      background: var(--bg-2, #27272A);
      padding: 4px;
      border-radius: 10px;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
    }

    :host-context([data-theme="light"]) .type-segmented-control {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.06);
    }

    .seg-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 7px 10px;
      border-radius: 7px;
      border: none;
      background: transparent;
      color: var(--text-2, #A1A1AA);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 120ms ease;
    }

    .seg-btn.active {
      background: var(--bg-1, #18181B);
      color: var(--tool-accent, #2563EB);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
    }

    :host-context([data-theme="light"]) .seg-btn.active {
      background: #FFFFFF;
      color: var(--tool-accent, #2563EB);
    }

    .parameter-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-top: 4px;
    }

    .param-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .param-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-2, #A1A1AA);
    }

    .param-value-wrap {
      display: flex;
      align-items: center;
      gap: 2px;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 6px;
      padding: 3px 6px;
    }

    :host-context([data-theme="light"]) .param-value-wrap {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.08);
    }

    .param-num-input {
      width: 38px;
      background: transparent;
      border: none;
      font-size: 11px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
      text-align: right;
      outline: none;
    }

    :host-context([data-theme="light"]) .param-num-input {
      color: #0F172A;
    }

    .unit-deg {
      font-size: 11px;
      color: var(--text-2, #A1A1AA);
    }

    .styled-range-slider {
      width: 100%;
      height: 5px;
      -webkit-appearance: none;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 3px;
      outline: none;
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .styled-range-slider {
      background: rgba(0, 0, 0, 0.12);
    }

    .styled-range-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--tool-accent, #2563EB);
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }

    .direction-presets-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
    }

    .dir-preset-btn {
      padding: 5px 6px;
      border-radius: 6px;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
      color: var(--text-2, #A1A1AA);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
      transition: all 120ms ease;
    }

    :host-context([data-theme="light"]) .dir-preset-btn {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.06);
      color: #475569;
    }

    .dir-preset-btn:hover,
    .dir-preset-btn.active {
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
    }

    .subparam-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .subparam-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-2, #A1A1AA);
    }

    .coord-label {
      font-size: 11px;
      font-family: var(--ts-font-mono, monospace);
      color: var(--tool-accent, #2563EB);
    }

    .toggle-pill-group {
      display: flex;
      background: var(--bg-2, #27272A);
      padding: 2px;
      border-radius: 7px;
    }

    :host-context([data-theme="light"]) .toggle-pill-group {
      background: #F1F5F9;
    }

    .pill-btn {
      padding: 4px 10px;
      border-radius: 5px;
      border: none;
      background: transparent;
      color: var(--text-2, #A1A1AA);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }

    .pill-btn.active {
      background: var(--bg-1, #18181B);
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .pill-btn.active {
      background: #FFFFFF;
      color: #0F172A;
    }

    .styled-select {
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 6px;
      padding: 4px 8px;
      color: var(--text, #F4F4F5);
      font-size: 11px;
      font-weight: 600;
      outline: none;
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .styled-select {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.08);
      color: #0F172A;
    }

    .subparam-block {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-top: 4px;
    }

    .position-presets-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 5px;
    }

    .pos-grid-btn {
      padding: 4px 6px;
      border-radius: 6px;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
      color: var(--text-2, #A1A1AA);
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
    }

    :host-context([data-theme="light"]) .pos-grid-btn {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.06);
    }

    .pos-grid-btn:hover,
    .pos-grid-btn.active {
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
    }

    .xy-sliders-wrap {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding-top: 4px;
    }

    .xy-slider-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .axis-badge {
      font-size: 10px;
      font-weight: 700;
      color: var(--text-2, #A1A1AA);
      width: 12px;
    }

    .axis-val {
      font-size: 11px;
      font-family: var(--ts-font-mono, monospace);
      color: var(--text-2, #A1A1AA);
      width: 32px;
      text-align: right;
    }

    /* ── Code Output & Export ── */
    .rule-mode-toggles {
      display: flex;
      background: var(--bg-2, #27272A);
      border-radius: 6px;
      padding: 2px;
    }

    :host-context([data-theme="light"]) .rule-mode-toggles {
      background: #F1F5F9;
    }

    .text-mode-btn {
      padding: 3px 8px;
      border-radius: 4px;
      border: none;
      background: transparent;
      color: var(--text-2, #A1A1AA);
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
    }

    .text-mode-btn.active {
      background: var(--bg-1, #18181B);
      color: var(--tool-accent, #2563EB);
    }

    :host-context([data-theme="light"]) .text-mode-btn.active {
      background: #FFFFFF;
    }

    .code-box-wrapper {
      position: relative;
      overflow-x: auto;
      max-width: 100%;
    }

    .css-code-pre {
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 8px;
      padding: 12px;
      font-family: var(--ts-font-mono, monospace);
      font-size: 11px;
      color: var(--text, #F4F4F5);
      white-space: pre;
      overflow-x: auto;
      margin: 0;
      line-height: 1.5;
    }

    :host-context([data-theme="light"]) .css-code-pre {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.08);
      color: #0F172A;
    }

    .export-actions-grid {
      display: grid;
      grid-template-columns: 1.4fr 1fr 1fr 1fr;
      gap: 6px;
    }

    @media (max-width: 639px) {
      .css-code-pre {
        white-space: pre-wrap !important;
        word-break: break-all;
      }
      .export-actions-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        gap: 8px;
      }
      .export-actions-grid .export-btn:first-child {
        grid-column: 1 / -1;
      }
      .export-btn {
        min-height: 44px;
        width: 100%;
      }
    }

    .export-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      padding: 8px 10px;
      border-radius: 7px;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text, #F4F4F5);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 120ms ease;
    }

    :host-context([data-theme="light"]) .export-btn {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.08);
      color: #0F172A;
    }

    .export-btn:hover {
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
    }

    .export-btn-accent {
      background: var(--tool-accent, #2563EB);
      border-color: var(--tool-accent, #2563EB);
      color: #FFFFFF;
    }

    :host-context([data-theme="light"]) .export-btn-accent {
      background: var(--tool-accent, #2563EB);
      border-color: var(--tool-accent, #2563EB);
      color: #FFFFFF;
    }

    .export-btn-accent:hover {
      filter: brightness(1.1);
      color: #FFFFFF;
    }

    /* ── Saved Custom Gradients ── */
    .save-inline-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 6px;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text-2, #A1A1AA);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }

    .save-inline-btn:hover {
      color: var(--tool-accent, #2563EB);
      border-color: var(--tool-accent, #2563EB);
    }

    .empty-saved-msg {
      font-size: 12px;
      color: var(--text-muted, #71717A);
      line-height: 1.5;
    }

    .saved-gradients-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 190px;
      overflow-y: auto;
    }

    @media (max-width: 639px) {
      .saved-gradients-list {
        max-height: none;
        overflow-y: visible;
      }
    }

    @keyframes saved-item-pulse {
      0% {
        transform: scale(0.97);
        box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.5);
      }
      40% {
        transform: scale(1.02);
        box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.35);
        border-color: var(--tool-accent, #2563EB);
      }
      100% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(37, 99, 235, 0);
      }
    }

    .saved-item-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 10px;
      border-radius: 8px;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.05));
      cursor: pointer;
      transition: all 180ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    .saved-item-row:hover {
      transform: translateY(-1.5px);
      border-color: var(--tool-accent, #2563EB);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    }

    .saved-item-row:active {
      transform: translateY(0) scale(0.985);
    }

    .saved-item-row:focus-visible {
      outline: 2px solid var(--tool-accent, #2563EB);
      outline-offset: 2px;
    }

    .saved-item-row.just-saved {
      animation: saved-item-pulse 0.6s cubic-bezier(0.16, 1, 0.3, 1);
      border-color: var(--tool-accent, #2563EB);
    }

    :host-context([data-theme="light"]) .saved-item-row {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.05);
    }

    :host-context([data-theme="light"]) .saved-item-row:hover {
      border-color: var(--tool-accent, #2563EB);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.12);
    }

    .saved-item-thumb {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.15);
      flex-shrink: 0;
    }

    .saved-item-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .saved-item-name {
      font-size: 12px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
      cursor: pointer;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host-context([data-theme="light"]) .saved-item-name {
      color: #0F172A;
    }

    .saved-item-name:hover {
      color: var(--tool-accent, #2563EB);
    }

    .rename-input {
      font-size: 11px;
      font-weight: 600;
      background: var(--bg-1, #18181B);
      border: 1px solid var(--tool-accent, #2563EB);
      border-radius: 4px;
      padding: 2px 4px;
      color: var(--text, #F4F4F5);
      outline: none;
    }

    .saved-item-meta {
      font-size: 10px;
      color: var(--text-2, #A1A1AA);
    }

    .saved-item-actions {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .icon-ghost-btn {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: transparent;
      color: var(--text-2, #A1A1AA);
      border-radius: 4px;
      cursor: pointer;
    }

    .icon-ghost-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text, #F4F4F5);
    }

    .delete-ghost:hover {
      color: #EF4444;
      background: rgba(239, 68, 68, 0.12);
    }

    /* ── Built-in Inspiration Presets Landscape Gallery ── */
    .inspiration-landscape-card {
      width: 100%;
      padding: 20px 22px;
      gap: 18px;
    }

    .inspiration-header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
    }

    .inspiration-title-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .inspiration-icon-badge {
      width: 36px;
      height: 36px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(37, 99, 235, 0.15);
      color: #60A5FA;
      border: 1px solid rgba(59, 130, 246, 0.25);
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .inspiration-icon-badge {
      background: #EFF6FF;
      color: #2563EB;
      border-color: #BFDBFE;
    }

    .inspiration-titles {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .inspiration-heading-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .inspiration-count-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-2, #A1A1AA);
    }

    :host-context([data-theme="light"]) .inspiration-count-badge {
      background: #F1F5F9;
      color: #64748B;
    }

    .inspiration-subtitle {
      font-size: 12px;
      color: var(--text-muted, #71717A);
      margin: 0;
      line-height: 1.4;
    }

    :host-context([data-theme="light"]) .inspiration-subtitle {
      color: #64748B;
    }

    .preset-filter-pills {
      display: flex;
      align-items: center;
      gap: 4px;
      background: var(--bg-2, #27272A);
      padding: 4px;
      border-radius: 8px;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
      overflow-x: auto;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
      max-width: 100%;
    }

    .preset-filter-pills::-webkit-scrollbar {
      display: none;
    }

    :host-context([data-theme="light"]) .preset-filter-pills {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.06);
    }

    .filter-pill {
      padding: 4px 10px;
      border-radius: 6px;
      border: none;
      background: transparent;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-2, #A1A1AA);
      cursor: pointer;
      transition: all 140ms ease;
      flex-shrink: 0;
      min-height: 32px;
    }

    :host-context([data-theme="light"]) .filter-pill {
      color: #64748B;
    }

    .filter-pill:hover {
      color: var(--text, #F4F4F5);
      background: rgba(255, 255, 255, 0.06);
    }

    :host-context([data-theme="light"]) .filter-pill:hover {
      color: #0F172A;
      background: rgba(0, 0, 0, 0.04);
    }

    .filter-pill.active {
      background: var(--bg-1, #18181B);
      color: var(--tool-accent, #60A5FA);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }

    :host-context([data-theme="light"]) .filter-pill.active {
      background: #FFFFFF;
      color: #2563EB;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    .landscape-presets-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(215px, 1fr));
      gap: 14px;
      max-height: 520px;
      overflow-y: auto;
      padding-right: 4px;
    }

    @media (min-width: 640px) and (max-width: 1023px) {
      .landscape-presets-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 639px) {
      .landscape-presets-grid {
        display: flex;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        gap: 12px;
        max-height: none;
        overflow-y: visible;
        padding-bottom: 8px;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
      }
      .landscape-presets-grid::-webkit-scrollbar {
        display: none;
      }
      .landscape-preset-card {
        flex: 0 0 78%;
        min-width: 0;
        scroll-snap-align: start;
      }
    }

    .landscape-presets-grid::-webkit-scrollbar {
      width: 6px;
    }

    .landscape-presets-grid::-webkit-scrollbar-thumb {
      background: var(--border, rgba(255, 255, 255, 0.12));
      border-radius: 999px;
    }

    :host-context([data-theme="light"]) .landscape-presets-grid::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.15);
    }

    .landscape-preset-card {
      display: flex;
      flex-direction: column;
      border-radius: 10px;
      overflow: hidden;
      cursor: pointer;
      background: var(--bg-2, #202023);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.07));
      transition: all 180ms cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }

    :host-context([data-theme="light"]) .landscape-preset-card {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.08);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .landscape-preset-card:hover {
      border-color: rgba(96, 165, 250, 0.5);
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
    }

    :host-context([data-theme="light"]) .landscape-preset-card:hover {
      border-color: #2563EB;
      box-shadow: 0 8px 20px rgba(37, 99, 235, 0.12);
    }

    .landscape-preset-card:active {
      transform: scale(0.99);
    }

    .landscape-preset-card:focus-visible {
      outline: 2px solid var(--tool-accent, #2563EB);
      outline-offset: 2px;
    }

    .landscape-preset-swatch {
      height: 84px;
      width: 100%;
      position: relative;
      overflow: hidden;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }

    .swatch-hover-overlay {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 160ms ease;
      backdrop-filter: blur(2px);
    }

    .landscape-preset-card:hover .swatch-hover-overlay {
      opacity: 1;
    }

    .apply-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #FFFFFF;
      color: #0F172A;
      font-size: 11px;
      font-weight: 700;
      padding: 5px 12px;
      border-radius: 999px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      transform: translateY(4px);
      transition: transform 160ms ease;
    }

    .landscape-preset-card:hover .apply-pill {
      transform: translateY(0);
    }

    .landscape-preset-footer {
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 7px;
    }

    .preset-info-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .preset-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host-context([data-theme="light"]) .preset-name {
      color: #0F172A;
    }

    .preset-type-tag {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .preset-type-tag[data-type="linear"] {
      background: rgba(59, 130, 246, 0.15);
      color: #60A5FA;
    }

    .preset-type-tag[data-type="radial"] {
      background: rgba(20, 184, 166, 0.15);
      color: #2DD4BF;
    }

    .preset-type-tag[data-type="conic"] {
      background: rgba(245, 158, 11, 0.15);
      color: #FBBF24;
    }

    :host-context([data-theme="light"]) .preset-type-tag[data-type="linear"] {
      background: #EFF6FF;
      color: #1D4ED8;
    }

    :host-context([data-theme="light"]) .preset-type-tag[data-type="radial"] {
      background: #CCFBF1;
      color: #0F766E;
    }

    :host-context([data-theme="light"]) .preset-type-tag[data-type="conic"] {
      background: #FEF3C7;
      color: #B45309;
    }

    .preset-meta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .preset-stops-preview {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .preset-stop-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 1px solid rgba(0, 0, 0, 0.2);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      flex-shrink: 0;
    }

    .preset-stops-count {
      font-size: 11px;
      font-weight: 500;
      color: var(--text-2, #A1A1AA);
    }

    :host-context([data-theme="light"]) .preset-stops-count {
      color: #64748B;
    }

    /* ── Icon Tooltip Infrastructure (Hover & Keyboard Focus-Visible) ── */
    [data-tooltip] {
      position: relative;
    }

    [data-tooltip]::after {
      content: attr(data-tooltip);
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%) translateY(4px);
      background: #09090B;
      color: #F4F4F5;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 5px;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 500;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      visibility: hidden;
      transition: opacity 140ms ease 120ms, transform 140ms ease 120ms, visibility 140ms;
      z-index: 50;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
    }

    [data-tooltip]:hover::after,
    [data-tooltip]:focus-visible::after {
      opacity: 1;
      visibility: visible;
      transform: translateX(-50%) translateY(0);
    }

    [data-tooltip-pos="left"]::after {
      bottom: auto;
      top: 50%;
      left: auto;
      right: calc(100% + 6px);
      transform: translateY(-50%) translateX(4px);
    }

    [data-tooltip-pos="left"]:hover::after,
    [data-tooltip-pos="left"]:focus-visible::after {
      transform: translateY(-50%) translateX(0);
    }

    :host-context([data-theme="light"]) [data-tooltip]::after {
      background: #0F172A;
      color: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.12);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  `]
})
export class GradientModuleComponent implements OnDestroy {
  public state = inject(ColorStudioStateService);
  public gradientService = inject(GradientService);

  @ViewChild('railElement') public railElement?: ElementRef<HTMLDivElement>;

  // ── Local Component Signals ───────────────────────────────────────────────
  public previewBackdrop = signal<'checkerboard' | 'dark' | 'light'>('checkerboard');
  public selectedStopId = signal<string | null>(null);
  public fullRuleMode = signal<boolean>(false);
  public presetFilter = signal<string>('all');
  public renamingId = signal<string | null>(null);
  public justSavedId = signal<string | null>(null);

  // ── Dragging State ──
  private isDragging = false;
  private draggingStopId: string | null = null;
  private draggingStopIdx = 0;
  private boundMouseMove = (e: MouseEvent) => this.onDragMove(e);
  private boundTouchMove = (e: TouchEvent) => this.onDragMove(e);
  private boundMouseUp = () => this.stopStopDrag();
  private boundTouchEnd = () => this.stopStopDrag();

  // ── Presets Catalog References ──
  public directionPresets = DIRECTION_PRESETS;
  public radialPositions = RADIAL_POSITIONS;
  public inspirationCategories = [
    { id: 'all', label: 'All' },
    { id: 'popular', label: 'Popular' },
    { id: 'nature', label: 'Nature' },
    { id: 'modern', label: 'Modern' },
    { id: 'warm', label: 'Warm' },
    { id: 'cool', label: 'Cool' },
    { id: 'dark', label: 'Dark' },
    { id: 'radial', label: 'Radial' },
    { id: 'conic', label: 'Conic' }
  ];

  // ── Computed Values ──
  public currentType = computed(() => this.state.gradientConfig().type);
  public currentAngle = computed(() => this.state.gradientConfig().angle);
  public currentShape = computed(() => this.state.gradientConfig().shape || 'circle');
  public currentExtent = computed(() => this.state.gradientConfig().radialExtent || 'farthest-corner');
  public currentPosX = computed(() => this.state.gradientConfig().positionX ?? 50);
  public currentPosY = computed(() => this.state.gradientConfig().positionY ?? 50);
  public stops = computed(() => this.state.gradientConfig().stops);

  public sortedStops = computed(() => {
    return this.gradientService.sortStops(this.stops());
  });

  public formattedCssOutput = computed(() => {
    const config = this.state.gradientConfig();
    if (this.fullRuleMode()) {
      return this.gradientService.generateFullCssRule(config);
    } else {
      return `background: ${this.gradientService.generateCss(config)};`;
    }
  });

  public filteredPresets = computed(() => {
    const filter = this.presetFilter();
    const all = this.gradientService.getPresets();
    if (filter === 'all') return all;
    return all.filter(p => p.category === filter || p.config.type === filter);
  });

  public combinedQuickColors = computed(() => {
    const saved = this.state.savedColors();
    const shared = this.state.sharedColorPalettes();
    const set = new Set<string>();
    [...saved, ...shared].forEach(c => set.add(c.toUpperCase()));
    return Array.from(set).slice(0, 10);
  });

  // ── Type and Parameter Modifiers ──────────────────────────────────────────
  public setType(type: GradientType): void {
    this.state.gradientConfig.update(c => ({
      ...c,
      type
    }));
  }

  public onAngleChange(angle: number): void {
    const valid = this.gradientService.normalizeAngle(Number(angle));
    this.state.gradientConfig.update(c => ({
      ...c,
      angle: valid
    }));
  }

  public setShape(shape: RadialShape): void {
    this.state.gradientConfig.update(c => ({
      ...c,
      shape
    }));
  }

  public setExtent(extent: RadialExtent): void {
    this.state.gradientConfig.update(c => ({
      ...c,
      radialExtent: extent
    }));
  }

  public setPosition(x: number, y: number): void {
    this.state.gradientConfig.update(c => ({
      ...c,
      positionX: Number(x),
      positionY: Number(y)
    }));
  }

  public onPosXChange(x: number): void {
    this.state.gradientConfig.update(c => ({
      ...c,
      positionX: this.gradientService.clampPosition(Number(x))
    }));
  }

  public onPosYChange(y: number): void {
    this.state.gradientConfig.update(c => ({
      ...c,
      positionY: this.gradientService.clampPosition(Number(y))
    }));
  }

  // ── Stop Management ───────────────────────────────────────────────────────
  public selectStop(id: string): void {
    this.selectedStopId.set(id);
  }

  public addStop(): void {
    const updated = this.gradientService.addStop(this.state.gradientConfig());
    this.state.gradientConfig.set(updated);
    const last = updated.stops[updated.stops.length - 1];
    if (last) this.selectedStopId.set(last.id);
  }

  public removeStop(id: string): void {
    if (this.stops().length <= 2) {
      this.state.showToast('Gradients must contain at least 2 stops');
      return;
    }
    const updated = this.gradientService.removeStop(this.state.gradientConfig(), id);
    this.state.gradientConfig.set(updated);
    if (this.selectedStopId() === id) {
      this.selectedStopId.set(null);
    }
  }

  public updateStopColor(id: string, color: string): void {
    const updated = this.gradientService.updateStop(this.state.gradientConfig(), id, { color });
    this.state.gradientConfig.set(updated);
  }

  public updateStopPosition(id: string, position: number): void {
    const updated = this.gradientService.updateStop(this.state.gradientConfig(), id, { position: Number(position) });
    this.state.gradientConfig.set(updated);
  }

  // ── Stop Bounds and Position Management ──────────────────────────────────
  public getStopMinBound(idx: number): number {
    const sorted = this.sortedStops();
    if (idx <= 0 || sorted.length === 0) return 0;
    return sorted[idx - 1]?.position ?? 0;
  }

  public getStopMaxBound(idx: number): number {
    const sorted = this.sortedStops();
    if (idx >= sorted.length - 1) return 100;
    return sorted[idx + 1]?.position ?? 100;
  }

  public onPositionSliderChange(id: string, value: number, idx: number): void {
    const min = this.getStopMinBound(idx);
    const max = this.getStopMaxBound(idx);
    const num = Number(value);
    if (isNaN(num)) return;
    const clamped = Math.max(min, Math.min(max, num));
    this.updateStopPosition(id, clamped);
  }

  public invalidStopIds = signal<Set<string>>(new Set<string>());

  public isStopPositionInvalid(id: string): boolean {
    return this.invalidStopIds().has(id);
  }

  public onPositionNumberChange(id: string, value: any, idx: number): void {
    const min = this.getStopMinBound(idx);
    const max = this.getStopMaxBound(idx);
    const num = Number(value);

    if (isNaN(num) || num < min || num > max) {
      this.invalidStopIds.update(set => {
        const next = new Set(set);
        next.add(id);
        return next;
      });
      return;
    }

    this.invalidStopIds.update(set => {
      const next = new Set(set);
      next.delete(id);
      return next;
    });
    this.updateStopPosition(id, num);
  }

  public onPositionNumberBlur(id: string, event: Event, idx: number): void {
    const input = event.target as HTMLInputElement;
    const min = this.getStopMinBound(idx);
    const max = this.getStopMaxBound(idx);
    let num = Number(input.value);

    if (isNaN(num) || num < min || num > max) {
      const clamped = isNaN(num) ? min : Math.max(min, Math.min(max, num));
      this.updateStopPosition(id, clamped);
      input.value = String(clamped);
      this.invalidStopIds.update(set => {
        const next = new Set(set);
        next.delete(id);
        return next;
      });
      this.state.showToast(`Stop ${idx + 1} position adjusted to ${clamped}% (valid: ${min}%–${max}%)`);
    }
  }

  // ── Interactive Stop Dragging ─────────────────────────────────────────────
  public startStopDrag(event: MouseEvent | TouchEvent, stopId: string, idx: number): void {
    event.stopPropagation();
    this.isDragging = true;
    this.draggingStopId = stopId;
    this.draggingStopIdx = idx;
    this.selectedStopId.set(stopId);

    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', this.boundMouseMove, { passive: false });
      window.addEventListener('touchmove', this.boundTouchMove, { passive: false });
      window.addEventListener('mouseup', this.boundMouseUp);
      window.addEventListener('touchend', this.boundTouchEnd);
    }
  }

  private onDragMove(event: MouseEvent | TouchEvent): void {
    if (!this.isDragging || !this.draggingStopId || !this.railElement) return;

    if (event.cancelable) {
      event.preventDefault();
    }

    const rect = this.railElement.nativeElement.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const percentage = Math.round(((clientX - rect.left) / rect.width) * 100);

    const min = this.getStopMinBound(this.draggingStopIdx);
    const max = this.getStopMaxBound(this.draggingStopIdx);
    const clamped = Math.max(min, Math.min(max, percentage));

    this.updateStopPosition(this.draggingStopId, clamped);
  }

  private stopStopDrag(): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.draggingStopId = null;

    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', this.boundMouseMove);
      window.removeEventListener('touchmove', this.boundTouchMove);
      window.removeEventListener('mouseup', this.boundMouseUp);
      window.removeEventListener('touchend', this.boundTouchEnd);
    }
  }

  public ngOnDestroy(): void {
    this.stopStopDrag();
  }

  public toggleLock(id: string): void {
    const updated = this.gradientService.toggleStopLock(this.state.gradientConfig(), id);
    this.state.gradientConfig.set(updated);
  }

  public onHexInputBlur(id: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    if (value && /^#?[0-9A-Fa-f]{3,8}$/.test(value)) {
      this.updateStopColor(id, value);
    } else {
      // Revert input to current stop color
      const stop = this.stops().find(s => s.id === id);
      if (stop) input.value = stop.color.toUpperCase();
    }
  }

  public onRailClick(event: MouseEvent): void {
    if (!this.railElement) return;
    const rect = this.railElement.nativeElement.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = Math.round((clickX / rect.width) * 100);
    const clamped = this.gradientService.clampPosition(percentage);

    const updated = this.gradientService.addStop(this.state.gradientConfig(), undefined, clamped);
    this.state.gradientConfig.set(updated);
    const addedStop = updated.stops.find(s => s.position === clamped);
    if (addedStop) {
      this.selectedStopId.set(addedStop.id);
    }
  }

  public addQuickStop(color: string): void {
    const updated = this.gradientService.addStop(this.state.gradientConfig(), color);
    this.state.gradientConfig.set(updated);
    this.state.showToast(`Added ${color} stop`);
  }

  // ── Intelligent Gradient Repair Modal ──────────────────────────────────────
  public isRepairModalOpen = signal<boolean>(false);

  public openRepairModal(): void {
    this.isRepairModalOpen.set(true);
  }

  public closeRepairModal(): void {
    this.isRepairModalOpen.set(false);
  }

  public onRepairApplied(repaired: GradientConfig): void {
    this.state.pushGradientUndo();
    this.state.gradientConfig.set(repaired);
    this.closeRepairModal();
    this.state.showToast('Applied intelligent gradient repair');
  }

  // ── Global Actions ────────────────────────────────────────────────────────
  public reverseStops(): void {
    this.state.reverseGradientStops();
  }

  public randomizeGradient(): void {
    const presets = this.gradientService.getPresets();
    if (presets && presets.length > 0) {
      const randomPreset = presets[Math.floor(Math.random() * presets.length)];
      this.applyPreset(randomPreset);
    }
  }

  public distributeStops(): void {
    this.state.distributeGradientStops();
  }

  public resetToDefaults(): void {
    this.state.pushGradientUndo();
    this.state.gradientConfig.set({
      type: 'linear',
      angle: 135,
      shape: 'circle',
      radialExtent: 'farthest-corner',
      positionX: 50,
      positionY: 50,
      stops: [
        { id: 'stop-1', color: '#E11D48', position: 0, locked: false },
        { id: 'stop-2', color: '#8B5CF6', position: 50, locked: false },
        { id: 'stop-3', color: '#3B82F6', position: 100, locked: false }
      ]
    });
    this.state.showToast('Reset gradient to defaults');
  }

  public setBackdrop(mode: 'checkerboard' | 'dark' | 'light'): void {
    this.previewBackdrop.set(mode);
  }

  public getGradientSummary(): string {
    const cfg = this.state.gradientConfig();
    if (cfg.type === 'linear') {
      return `${cfg.angle}°`;
    } else if (cfg.type === 'radial') {
      return `${cfg.shape || 'circle'} at ${cfg.positionX ?? 50}% ${cfg.positionY ?? 50}%`;
    } else {
      return `from ${cfg.angle}° at ${cfg.positionX ?? 50}% ${cfg.positionY ?? 50}%`;
    }
  }

  // ── Native Picker Trigger ─────────────────────────────────────────────────
  public triggerNativePicker(picker: HTMLInputElement): void {
    if (!picker) return;
    if (typeof picker.showPicker === 'function') {
      try {
        picker.showPicker();
        return;
      } catch {
        // Fallback to click if showPicker throws
      }
    }
    picker.click();
  }

  // ── Cross-Module Helpers ──────────────────────────────────────────────────
  public sendStopToPicker(hex: string): void {
    this.state.sendToPicker(hex);
  }

  public saveStopColor(hex: string): void {
    this.state.saveColor(hex);
  }

  public sendStopsToSharedPalette(): void {
    const sorted = this.sortedStops();
    const colors = sorted.map(s => s.color);
    this.state.setSharedPalette(colors);
  }

  public populateFromSharedPalette(): void {
    this.state.populateGradientFromPalette();
  }

  // ── Presets & Saved Gradients ─────────────────────────────────────────────
  public applyPreset(preset: GradientPreset): void {
    this.state.applyGradient(preset.config, preset.name);
  }

  public applySavedGradient(saved: SavedGradient): void {
    this.state.applyGradient(saved.config, saved.name);
  }

  public saveCurrentGradient(): void {
    const count = this.state.savedGradients().length + 1;
    const saved = this.state.saveCurrentGradient(`Custom Gradient ${count}`);
    this.state.triggerSavedPing();
    if (saved && saved.id) {
      this.justSavedId.set(saved.id);
      setTimeout(() => this.justSavedId.set(null), 1000);
    }
  }

  public startRenaming(id: string, event?: Event): void {
    if (event) event.stopPropagation();
    this.renamingId.set(id);
  }

  public saveRename(id: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.trim();
    if (value) {
      this.state.updateSavedGradientName(id, value);
    }
    this.renamingId.set(null);
  }

  public deleteSaved(id: string, event?: Event): void {
    if (event) event.stopPropagation();
    this.state.deleteSavedGradient(id);
  }

  // ── Export Suite ──────────────────────────────────────────────────────────
  public copyCss(): void {
    const text = this.formattedCssOutput();
    this.state.copyToClipboard(text, 'CSS Gradient');
  }

  public downloadCssFile(): void {
    const config = this.state.gradientConfig();
    const content = this.gradientService.generateCssFile(config);
    this.triggerDownload(content, 'gradient.css', 'text/css');
    this.state.showToast('Downloaded gradient.css');
  }

  public exportJsonFile(): void {
    const config = this.state.gradientConfig();
    const json = this.gradientService.generateJsonExport(config);
    this.triggerDownload(json, 'gradient.json', 'application/json');
    this.state.showToast('Exported gradient.json');
  }

  public downloadPng(): void {
    const config = this.state.gradientConfig();
    const canvas = this.gradientService.renderToCanvas(config, 1200, 800);
    if (!canvas) {
      this.state.showToast('Canvas rendering unavailable');
      return;
    }

    canvas.toBlob(blob => {
      if (!blob) {
        this.state.showToast('Failed to generate PNG blob');
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gradient.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.state.showToast('Downloaded gradient.png (1200x800)');
    }, 'image/png');
  }

  private triggerDownload(content: string, filename: string, mimeType: string): void {
    if (typeof document === 'undefined') return;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

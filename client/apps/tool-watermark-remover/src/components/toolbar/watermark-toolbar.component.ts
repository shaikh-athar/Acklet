// apps/tool-watermark-remover/src/components/toolbar/watermark-toolbar.component.ts
import { Component, input, output, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TsIconComponent } from '@acklet/tool-shell';
import {
  SelectionTool,
  DetectionSensitivity,
  InpaintingMode,
  WatermarkRegion
} from '../../models/watermark.models';

@Component({
  selector: 'app-watermark-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wm-toolbar" role="toolbar" aria-label="Watermark Remover Tools">
      
      <!-- Group 1: Detection & Sensitivity -->
      <div class="toolbar-section">
        <div class="toolbar-tool-group" role="group" aria-label="Detection Tools">
          <!-- AI Auto Detect Button -->
          <button 
            type="button" 
            class="toolbar-btn auto-detect-btn" 
            (click)="autoDetect.emit()"
            [disabled]="isProcessing()"
            title="Automatically detect visible watermark regions"
          >
            <ts-icon name="wand-2" [size]="15" class="auto-detect-icon" />
            <span class="btn-label">AI Auto-Detect</span>
          </button>

          <!-- Auto Protect Subjects Button (Phase 5) -->
          <button 
            type="button" 
            class="toolbar-btn auto-protect-btn hide-compact" 
            (click)="autoProtect.emit()"
            [disabled]="isProcessing()"
            title="Auto-detect and protect faces/subjects near watermarks"
          >
            <ts-icon name="shield" [size]="14" />
            <span class="btn-label">Protect Subject</span>
          </button>

          <!-- Sensitivity Toggle Pills -->
          <div class="sensitivity-group hide-compact" role="group" aria-label="Detection Sensitivity">
            <span class="ctrl-sublabel">Sensitivity:</span>
            <button 
              type="button" 
              class="mini-pill" 
              [class.active]="sensitivity() === 'low'"
              (click)="sensitivityChange.emit('low')"
              [disabled]="isProcessing()"
              title="Low sensitivity (stricter detection, avoids false alarms)"
            >
              Low
            </button>
            <button 
              type="button" 
              class="mini-pill" 
              [class.active]="sensitivity() === 'medium'"
              (click)="sensitivityChange.emit('medium')"
              [disabled]="isProcessing()"
              title="Medium sensitivity (balanced detection)"
            >
              Med
            </button>
            <button 
              type="button" 
              class="mini-pill" 
              [class.active]="sensitivity() === 'high'"
              (click)="sensitivityChange.emit('high')"
              [disabled]="isProcessing()"
              title="High sensitivity (catches faint and transparent watermarks)"
            >
              High
            </button>
          </div>

          <div class="toolbar-divider" aria-hidden="true"></div>

          <!-- Brush Tool -->
          <button 
            type="button" 
            class="toolbar-btn" 
            [class.active]="activeTool() === 'brush'"
            (click)="selectTool('brush')"
            [disabled]="isProcessing()"
            title="Brush selection (B)"
            aria-label="Brush tool"
          >
            <ts-icon name="brush" [size]="15" />
            <span class="btn-label hide-mobile">Brush</span>
            <kbd class="shortcut-key hide-compact">B</kbd>
          </button>

          <!-- Rectangle Tool -->
          <button 
            type="button" 
            class="toolbar-btn" 
            [class.active]="activeTool() === 'rectangle'"
            (click)="selectTool('rectangle')"
            [disabled]="isProcessing()"
            title="Rectangle selection tool with resize & move (R)"
            aria-label="Rectangle selection tool"
          >
            <ts-icon name="square" [size]="15" />
            <span class="btn-label hide-mobile">Rectangle</span>
            <kbd class="shortcut-key hide-compact">R</kbd>
          </button>

          <!-- Eraser Tool -->
          <button 
            type="button" 
            class="toolbar-btn" 
            [class.active]="activeTool() === 'eraser'"
            (click)="selectTool('eraser')"
            [disabled]="isProcessing()"
            title="Eraser to remove selection marks (E)"
            aria-label="Eraser tool"
          >
            <ts-icon name="eraser" [size]="15" />
            <span class="btn-label hide-mobile">Eraser</span>
            <kbd class="shortcut-key hide-compact">E</kbd>
          </button>

          <!-- Protect Area Tool (Phase 5) -->
          <button 
            type="button" 
            class="toolbar-btn protect-tool-btn" 
            [class.active]="activeTool() === 'protect'"
            (click)="selectTool('protect')"
            [disabled]="isProcessing()"
            title="Protect subject/face area from modification (P)"
            aria-label="Protect tool"
          >
            <ts-icon name="shield" [size]="15" />
            <span class="btn-label hide-mobile">Protect</span>
            <kbd class="shortcut-key hide-compact">P</kbd>
          </button>

          <!-- Hand / Pan Tool -->
          <button 
            type="button" 
            class="toolbar-btn" 
            [class.active]="activeTool() === 'pan'"
            (click)="selectTool('pan')"
            [disabled]="isProcessing()"
            title="Hand tool: Click and drag to pan image (H or Spacebar)"
            aria-label="Pan tool"
          >
            <ts-icon name="hand" [size]="15" />
            <span class="btn-label hide-mobile">Pan</span>
            <kbd class="shortcut-key hide-compact">H</kbd>
          </button>
        </div>
      </div>

      <!-- Group 2: Contextual Tool Controls (Brush Size & Mask Opacity) -->
      <div class="toolbar-section">
        @if (activeTool() === 'brush' || activeTool() === 'eraser' || activeTool() === 'protect') {
          <div class="toolbar-brush-controls animate-fade-in">
            <label class="control-label" for="brush-slider">
              <span>Brush</span>
              <span class="val-mono">{{ brushSize() }}px</span>
            </label>
            <input 
              id="brush-slider"
              type="range" 
              min="4" 
              max="100" 
              [value]="brushSize()" 
              (input)="onBrushSizeInput($event)"
              class="range-slider"
              [disabled]="isProcessing()"
              aria-label="Brush size"
            />
            <div class="presets-row hide-compact">
              <button type="button" class="preset-pill" [class.active]="brushSize() === 10" (click)="setBrushSize(10)">10</button>
              <button type="button" class="preset-pill" [class.active]="brushSize() === 25" (click)="setBrushSize(25)">25</button>
              <button type="button" class="preset-pill" [class.active]="brushSize() === 50" (click)="setBrushSize(50)">50</button>
            </div>
          </div>
        }

        <!-- Mask Opacity Slider -->
        <div class="toolbar-opacity-controls hide-compact">
          <label class="control-label" for="opacity-slider" title="Adjust watermark mask overlay opacity">
            <ts-icon name="sliders" [size]="13" />
            <span class="val-mono">{{ Math.round(maskOpacity() * 100) }}%</span>
          </label>
          <input 
            id="opacity-slider"
            type="range" 
            min="20" 
            max="100" 
            step="5"
            [value]="Math.round(maskOpacity() * 100)" 
            (input)="onOpacityInput($event)"
            class="range-slider opacity-slider"
            [disabled]="isProcessing()"
            aria-label="Mask overlay opacity"
          />
        </div>
      </div>

      <!-- Group 3: Zoom & Inpainting Quality Mode -->
      <div class="toolbar-section">
        <!-- Inpainting Quality & Restoration Mode Selector -->
        <div class="mode-select-group hide-compact" role="group" aria-label="AI Inpainting Quality Mode">
          <span class="ctrl-sublabel">Mode:</span>
          <button 
            type="button" 
            class="mini-pill" 
            [class.active]="inpaintingMode() === 'standard' || inpaintingMode() === 'balanced' || inpaintingMode() === 'fast'"
            (click)="inpaintingModeChange.emit('standard')"
            [disabled]="isProcessing()"
            title="Standard mode (balanced speed and texture synthesis)"
          >
            Standard
          </button>
          <button 
            type="button" 
            class="mini-pill" 
            [class.active]="inpaintingMode() === 'high-quality' || inpaintingMode() === 'ultra'"
            (click)="inpaintingModeChange.emit('high-quality')"
            [disabled]="isProcessing()"
            title="High Quality (multi-scale pyramid with 3-pass smoothing)"
          >
            High Quality
          </button>
          <button 
            type="button" 
            class="mini-pill" 
            [class.active]="inpaintingMode() === 'detail-preservation'"
            (click)="inpaintingModeChange.emit('detail-preservation')"
            [disabled]="isProcessing()"
            title="Detail Preservation (micro-grain matching & strict contour preservation)"
          >
            Detail
          </button>
          <button 
            type="button" 
            class="mini-pill" 
            [class.active]="inpaintingMode() === 'large-image'"
            (click)="inpaintingModeChange.emit('large-image')"
            [disabled]="isProcessing()"
            title="Large Image (Hann-window tiled inpainting for up to 8K resolution)"
          >
            Tiled 8K
          </button>
        </div>

        <div class="toolbar-divider hide-compact" aria-hidden="true"></div>

        <!-- Zoom Controls -->
        <div class="zoom-controls-group">
          <button 
            type="button" 
            class="toolbar-btn icon-only-btn" 
            (click)="zoomOut.emit()"
            [disabled]="zoom() <= 0.25 || isProcessing()"
            title="Zoom Out (-)"
            aria-label="Zoom out"
          >
            <ts-icon name="zoom-out" [size]="14" />
          </button>

          <button 
            type="button" 
            class="zoom-level-pill" 
            (click)="resetZoom.emit()"
            title="Click to reset to 100% zoom (⌘1)"
          >
            {{ Math.round(zoom() * 100) }}%
          </button>

          <button 
            type="button" 
            class="toolbar-btn icon-only-btn" 
            (click)="zoomIn.emit()"
            [disabled]="zoom() >= 5.0 || isProcessing()"
            title="Zoom In (+)"
            aria-label="Zoom in"
          >
            <ts-icon name="zoom-in" [size]="14" />
          </button>

          <button 
            type="button" 
            class="toolbar-btn fit-btn" 
            (click)="fitScreen.emit()"
            [disabled]="isProcessing()"
            title="Fit image to screen (⌘0)"
          >
            <ts-icon name="maximize-2" [size]="13" />
            <span class="btn-label hide-mobile">Fit</span>
          </button>
        </div>
      </div>

      <!-- Group 4: History & Processing Actions -->
      <div class="toolbar-section">
        <div class="toolbar-actions-group">
          <!-- Undo -->
          <button 
            type="button" 
            class="toolbar-btn icon-only-btn" 
            (click)="undo.emit()" 
            [disabled]="!canUndo() || isProcessing()" 
            title="Undo last change (⌘Z)"
            aria-label="Undo"
          >
            <ts-icon name="undo" [size]="15" />
          </button>

          <!-- Redo -->
          <button 
            type="button" 
            class="toolbar-btn icon-only-btn" 
            (click)="redo.emit()" 
            [disabled]="!canRedo() || isProcessing()" 
            title="Redo (⇧⌘Z)"
            aria-label="Redo"
          >
            <ts-icon name="redo" [size]="15" />
          </button>

          <!-- Clear Selections -->
          <button 
            type="button" 
            class="toolbar-btn text-destructive" 
            (click)="clearMask.emit()" 
            [disabled]="!hasMask() || isProcessing()" 
            title="Clear all selections and masks"
            aria-label="Clear selections"
          >
            <ts-icon name="trash-2" [size]="14" />
            <span class="btn-label hide-mobile">Clear</span>
          </button>

          <div class="toolbar-divider" aria-hidden="true"></div>

          <!-- Replace Image -->
          <button 
            type="button" 
            class="toolbar-btn" 
            (click)="replaceImage.emit()" 
            [disabled]="isProcessing()"
            title="Upload a different image"
          >
            <ts-icon name="refresh-cw" [size]="14" />
            <span class="btn-label hide-mobile">Replace</span>
          </button>

          <!-- Single Region Process Button -->
          @if (activeRegionCount() > 1 && selectedRegionId()) {
            <button 
              type="button" 
              class="toolbar-btn single-region-btn" 
              (click)="removeSingleRegion.emit(selectedRegionId()!)"
              [disabled]="isProcessing()"
              title="Remove only the active selected watermark region"
            >
              <ts-icon name="wand-2" [size]="14" />
              <span class="btn-label">Process Active</span>
            </button>
          }

          <!-- Process All Primary CTA -->
          <button 
            type="button" 
            class="toolbar-btn primary-cta-btn" 
            [disabled]="!hasMask() || isProcessing()" 
            (click)="removeWatermark.emit()"
            title="Remove watermark using AI inpainting"
          >
            <ts-icon name="wand-2" [size]="15" />
            <span class="btn-label">
              {{ activeRegionCount() > 1 ? 'Process All (' + activeRegionCount() + ')' : 'Remove Watermark' }}
            </span>
          </button>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .wm-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--ts-space-8, 8px);
      padding: 6px 12px;
      border-radius: var(--ts-radius-inner, 16px);
      background: var(--ts-surface-raised, var(--surface));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      width: 100%;
      box-sizing: border-box;
    }

    .toolbar-section {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .toolbar-tool-group,
    .toolbar-actions-group,
    .zoom-controls-group,
    .sensitivity-group,
    .mode-select-group {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .ctrl-sublabel {
      font-size: 11px;
      font-weight: 500;
      color: var(--text-2, #94A3B8);
      white-space: nowrap;
    }

    .mini-pill {
      font-size: 11px;
      font-weight: 500;
      padding: 2px 7px;
      border-radius: 4px;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      background: var(--ts-surface-inset, rgba(255, 255, 255, 0.04));
      color: var(--text-2, #94A3B8);
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) ease;
    }

    .mini-pill:hover:not(:disabled) {
      background: var(--surface-hover, rgba(255, 255, 255, 0.08));
      color: var(--text, #F3F4F6);
    }

    .mini-pill.active {
      background: var(--accent-soft, rgba(59, 130, 246, 0.2));
      border-color: var(--accent, #3B82F6);
      color: var(--accent, #60A5FA);
      font-weight: 600;
    }

    .toolbar-divider {
      width: 1px;
      height: 20px;
      background: var(--border, rgba(255, 255, 255, 0.15));
      margin: 0 3px;
    }

    .toolbar-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 34px;
      padding: 0 10px;
      border-radius: var(--ts-radius-control, 8px);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      background: var(--ts-surface-inset, rgba(255, 255, 255, 0.04));
      color: var(--text, #F3F4F6);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      user-select: none;
      transition: background var(--ts-dur-fast, 150ms) var(--ts-ease),
                  border-color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  color var(--ts-dur-fast, 150ms) var(--ts-ease);
      white-space: nowrap;
    }

    .toolbar-btn:hover:not(:disabled) {
      background: var(--surface-hover, rgba(255, 255, 255, 0.08));
      border-color: var(--border-accent, #3B82F6);
    }

    .toolbar-btn.active {
      background: var(--accent-soft, rgba(59, 130, 246, 0.18));
      border-color: var(--accent, #3B82F6);
      color: var(--accent, #3B82F6);
      font-weight: 600;
    }

    .toolbar-btn:disabled {
      opacity: 0.38;
      cursor: not-allowed;
      pointer-events: none;
    }

    .toolbar-btn.icon-only-btn {
      padding: 0;
      width: 34px;
    }

    .shortcut-key {
      display: inline-block;
      font-size: 10px;
      font-family: var(--ts-font-mono, monospace);
      padding: 1px 4px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      color: var(--text-2, #94A3B8);
      line-height: 1;
      margin-left: 2px;
    }

    .auto-detect-btn {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15));
      border-color: rgba(59, 130, 246, 0.35);
      color: var(--accent, #3B82F6);
      font-weight: 600;
    }

    .auto-detect-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(139, 92, 246, 0.25));
      border-color: var(--accent, #3B82F6);
    }

    .auto-protect-btn {
      background: rgba(16, 185, 129, 0.12);
      border-color: rgba(16, 185, 129, 0.35);
      color: #10B981;
      font-weight: 500;
    }

    .auto-protect-btn:hover:not(:disabled) {
      background: rgba(16, 185, 129, 0.22);
      border-color: #10B981;
    }

    .protect-tool-btn.active {
      background: rgba(16, 185, 129, 0.18) !important;
      border-color: #10B981 !important;
      color: #10B981 !important;
    }

    .single-region-btn {
      background: var(--ts-surface-inset, rgba(59, 130, 246, 0.1));
      border-color: rgba(59, 130, 246, 0.4);
      color: var(--accent, #3B82F6);
      font-weight: 500;
    }

    .single-region-btn:hover:not(:disabled) {
      background: rgba(59, 130, 246, 0.2);
    }

    .primary-cta-btn {
      background: var(--accent, #3B82F6);
      color: var(--accent-ink, #FFFFFF);
      border-color: var(--accent, #3B82F6);
      font-weight: 600;
      box-shadow: 0 2px 8px var(--accent-glow, rgba(59, 130, 246, 0.35));
    }

    .primary-cta-btn:hover:not(:disabled) {
      filter: brightness(1.1);
      border-color: var(--accent, #3B82F6);
    }

    .toolbar-brush-controls,
    .toolbar-opacity-controls {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0 6px;
    }

    .control-label {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: var(--text-2, #94A3B8);
      font-weight: 500;
      white-space: nowrap;
    }

    .val-mono {
      font-family: var(--ts-font-mono, monospace);
      font-weight: 600;
      color: var(--text, #F3F4F6);
      min-width: 28px;
    }

    .range-slider {
      width: 75px;
      height: 5px;
      border-radius: 3px;
      background: var(--border, rgba(255, 255, 255, 0.2));
      outline: none;
      cursor: pointer;
      accent-color: var(--accent, #3B82F6);
    }

    .opacity-slider {
      width: 60px;
    }

    .presets-row {
      display: flex;
      align-items: center;
      gap: 3px;
    }

    .preset-pill {
      font-size: 10px;
      padding: 1px 5px;
      border-radius: 3px;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      background: transparent;
      color: var(--text-2, #94A3B8);
      cursor: pointer;
      font-family: var(--ts-font-mono, monospace);
    }

    .preset-pill:hover,
    .preset-pill.active {
      background: var(--accent-soft, rgba(59, 130, 246, 0.15));
      border-color: var(--accent, #3B82F6);
      color: var(--accent, #3B82F6);
    }

    .zoom-level-pill {
      font-family: var(--ts-font-mono, monospace);
      font-size: 12px;
      font-weight: 600;
      padding: 0 8px;
      height: 34px;
      border-radius: var(--ts-radius-control, 8px);
      background: var(--ts-surface-inset, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text, #F3F4F6);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 48px;
    }

    .zoom-level-pill:hover {
      background: var(--surface-hover, rgba(255, 255, 255, 0.08));
      border-color: var(--border-accent, #3B82F6);
    }

    .fit-btn {
      padding: 0 8px;
      font-size: 12px;
    }

    .text-destructive {
      color: #EF4444;
    }

    .text-destructive:hover:not(:disabled) {
      background: rgba(239, 68, 68, 0.12);
      border-color: #EF4444;
    }

    @media (max-width: 1024px) {
      .hide-compact {
        display: none !important;
      }
    }

    @media (max-width: 640px) {
      .hide-mobile {
        display: none !important;
      }
      .range-slider {
        width: 50px;
      }
    }
  `]
})
export class WatermarkToolbarComponent {
  readonly activeTool = input<SelectionTool>('brush');
  readonly brushSize = input<number>(25);
  readonly maskOpacity = input<number>(0.65);
  readonly zoom = input<number>(1.0);
  readonly hasMask = input<boolean>(false);
  readonly activeRegionCount = input<number>(0);
  readonly selectedRegionId = input<string | null>(null);
  readonly canUndo = input<boolean>(false);
  readonly canRedo = input<boolean>(false);
  readonly isProcessing = input<boolean>(false);
  readonly sensitivity = input<DetectionSensitivity>('medium');
  readonly inpaintingMode = input<InpaintingMode>('balanced');

  readonly toolChange = output<SelectionTool>();
  readonly brushSizeChange = output<number>();
  readonly maskOpacityChange = output<number>();
  readonly sensitivityChange = output<DetectionSensitivity>();
  readonly inpaintingModeChange = output<InpaintingMode>();
  readonly autoDetect = output<void>();
  readonly autoProtect = output<void>();
  readonly clearMask = output<void>();
  readonly undo = output<void>();
  readonly redo = output<void>();
  readonly zoomIn = output<void>();
  readonly zoomOut = output<void>();
  readonly resetZoom = output<void>();
  readonly fitScreen = output<void>();
  readonly removeWatermark = output<void>();
  readonly removeSingleRegion = output<string>();
  readonly replaceImage = output<void>();

  readonly Math = Math;

  selectTool(tool: SelectionTool): void {
    this.toolChange.emit(tool);
  }

  onBrushSizeInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const size = parseInt(target.value, 10);
    this.brushSizeChange.emit(size);
  }

  setBrushSize(size: number): void {
    this.brushSizeChange.emit(size);
  }

  onOpacityInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const pct = parseInt(target.value, 10);
    this.maskOpacityChange.emit(pct / 100);
  }
}

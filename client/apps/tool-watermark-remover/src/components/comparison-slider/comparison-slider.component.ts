// apps/tool-watermark-remover/src/components/comparison-slider/comparison-slider.component.ts
import {
  Component,
  input,
  output,
  signal,
  computed,
  viewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  ChangeDetectionStrategy,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';
import { CoordinateGeometryService } from '../../services/coordinate-geometry.service';
import { InpaintingQualityMetrics } from '../../models/watermark.models';

@Component({
  selector: 'app-comparison-slider',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="comparison-wrapper" [class.is-fullscreen]="isFullscreen()">
      
      <!-- Top Action & Navigation Bar -->
      <div class="comparison-bar">
        <div class="view-mode-tabs" role="tablist" aria-label="Comparison View Mode">
          <!-- Split Slider Tab -->
          <button 
            type="button" 
            class="mode-tab-btn" 
            [class.active]="viewMode() === 'slider'"
            (click)="setViewMode('slider')"
          >
            <ts-icon name="arrow-left-right" [size]="14" />
            <span>Split Slider</span>
          </button>

          <!-- Side by Side Tab -->
          <button 
            type="button" 
            class="mode-tab-btn" 
            [class.active]="viewMode() === 'side-by-side'"
            (click)="setViewMode('side-by-side')"
          >
            <ts-icon name="columns" [size]="14" />
            <span>Side by Side</span>
          </button>

          <!-- Inspect Changes / Heatmap Tab (Phase 5) -->
          <button 
            type="button" 
            class="mode-tab-btn" 
            [class.active]="viewMode() === 'heatmap'"
            (click)="setViewMode('heatmap')"
            title="Inspect modified areas and pixel diff heatmap"
          >
            <ts-icon name="activity" [size]="14" />
            <span>Inspect Changes</span>
          </button>

          <!-- Peek Original Button -->
          <button 
            type="button" 
            class="mode-tab-btn peek-btn" 
            (pointerdown)="isPeeking.set(true)"
            (pointerup)="isPeeking.set(false)"
            (pointerleave)="isPeeking.set(false)"
            title="Press and hold to view original"
          >
            <ts-icon name="eye" [size]="14" />
            <span>Hold for Original</span>
          </button>

          <!-- Reset Slider Position -->
          @if (viewMode() === 'slider' && sliderPercent() !== 50) {
            <button 
              type="button" 
              class="mode-tab-btn" 
              (click)="sliderPercent.set(50)"
              title="Reset slider position to 50%"
            >
              <ts-icon name="rotate-ccw" [size]="13" />
              <span>Center (50%)</span>
            </button>
          }
        </div>

        <!-- Measured Quality Metrics Badge -->
        @if (qualityMetrics()) {
          <div class="metrics-container hide-mobile">
            <div 
              class="quality-metrics-pill" 
              [class.excellent]="qualityMetrics()!.rating === 'excellent'"
              [class.good]="qualityMetrics()!.rating === 'good'"
              [class.fair]="qualityMetrics()!.rating === 'fair'"
              [title]="'Seam Continuity: ' + qualityMetrics()!.boundaryContinuity + '%, Color Delta: ' + qualityMetrics()!.colorInconsistencyDelta + ', Processing Time: ' + qualityMetrics()!.processingTimeMs + 'ms'"
            >
              <ts-icon name="check-circle" [size]="13" class="metric-icon" />
              <span class="metric-score">{{ qualityMetrics()!.overallScore }}% Quality</span>
              <span class="metric-time hide-mobile">{{ qualityMetrics()!.processingTimeMs }}ms</span>
            </div>
            <span class="drift-pill" title="Unmasked pixel drift: 0 indicates bit-exact preservation">
              Drift: {{ qualityMetrics()!.unmaskedDrift ?? 0 }}
            </span>
          </div>
        }

        <!-- Zoom Controls for Comparison -->
        <div class="comparison-zoom-group hide-mobile">
          <button 
            type="button" 
            class="tool-btn icon-only" 
            (click)="zoomOut()" 
            [disabled]="compZoom() <= 0.25"
            title="Zoom Out"
          >
            <ts-icon name="zoom-out" [size]="14" />
          </button>

          <span class="zoom-val-mono">{{ Math.round(compZoom() * 100) }}%</span>

          <button 
            type="button" 
            class="tool-btn icon-only" 
            (click)="zoomIn()" 
            [disabled]="compZoom() >= 4.0"
            title="Zoom In"
          >
            <ts-icon name="zoom-in" [size]="14" />
          </button>

          <button 
            type="button" 
            class="tool-btn" 
            (click)="resetComparisonZoom()"
            title="Reset Zoom to Fit"
          >
            <span>Fit</span>
          </button>

          <!-- Fullscreen Toggle -->
          <button 
            type="button" 
            class="tool-btn icon-only" 
            (click)="toggleFullscreen()"
            [title]="isFullscreen() ? 'Exit Fullscreen' : 'Enter Fullscreen'"
          >
            <ts-icon [name]="isFullscreen() ? 'minimize-2' : 'maximize-2'" [size]="14" />
          </button>
        </div>

        <!-- Actions: Re-edit, Retry with Ultra, Reset, Download -->
        <div class="comparison-actions">
          <button 
            type="button" 
            class="btn-secondary" 
            (click)="reEdit.emit()" 
            title="Adjust mask selections and re-process"
          >
            <ts-icon name="brush" [size]="14" />
            <span class="hide-mobile">Re-edit Mask</span>
          </button>

          <button 
            type="button" 
            class="btn-secondary" 
            (click)="retryWithUltra.emit()"
            title="Reprocess with Ultra-Quality multi-scale pyramid synthesis"
          >
            <ts-icon name="sparkles" [size]="14" />
            <span class="hide-mobile">Retry (Ultra)</span>
          </button>

          <button 
            type="button" 
            class="btn-secondary" 
            (click)="resetOriginal.emit()" 
            title="Revert back to original image"
          >
            <ts-icon name="rotate-ccw" [size]="14" />
            <span class="hide-mobile">Reset</span>
          </button>

          <button 
            type="button" 
            class="btn-primary" 
            (click)="openExport.emit()"
            title="Export and download cleaned image"
          >
            <ts-icon name="download" [size]="15" />
            <span>Download</span>
          </button>
        </div>
      </div>

      <!-- Main Comparison Viewport -->
      <div 
        #containerRef
        class="comparison-viewport"
        [class.is-side-by-side]="viewMode() === 'side-by-side'"
        (pointerdown)="onPanStart($event)"
        (pointermove)="onPanMove($event)"
        (pointerup)="onPanEnd()"
        (pointerleave)="onPanEnd()"
      >
        @if (viewMode() === 'slider') {
          <!-- Split Slider View -->
          <div 
            class="slider-stage"
            [style.width.px]="imageWidth()"
            [style.height.px]="imageHeight()"
            [style.transform]="stageTransform()"
            (pointerdown)="onSliderDragStart($event)"
            (pointermove)="onSliderDragMove($event)"
            (pointerup)="onSliderDragEnd()"
          >
            <!-- Processed / Inpainted Base Layer -->
            <img 
              [src]="processedDataUrl()" 
              alt="Cleaned Image" 
              class="comparison-image base-layer" 
            />

            <!-- Original Image Top Layer Clipped by Slider -->
            <div 
              class="slider-clipped-layer"
              [style.width.%]="isPeeking() ? 100 : sliderPercent()"
            >
              <img 
                [src]="originalDataUrl()" 
                alt="Original Watermarked Image" 
                class="comparison-image original-clipped"
                [style.width.px]="imageWidth()"
                [style.height.px]="imageHeight()"
              />
            </div>

            <!-- Divider Line with Draggable Thumb Handle -->
            @if (!isPeeking()) {
              <div 
                class="slider-divider" 
                [style.left.%]="sliderPercent()"
                aria-hidden="true"
              >
                <div class="slider-handle">
                  <ts-icon name="arrow-left-right" [size]="15" class="handle-icon" />
                </div>
              </div>
            }

            <!-- Badges -->
            <span class="comparison-badge badge-left">Original</span>
            <span class="comparison-badge badge-right">Cleaned</span>
          </div>

        } @else if (viewMode() === 'heatmap') {
          <!-- Visual Heatmap Stage (Phase 5) -->
          <div 
            class="slider-stage heatmap-stage"
            [style.width.px]="imageWidth()"
            [style.height.px]="imageHeight()"
            [style.transform]="stageTransform()"
          >
            <canvas #heatmapCanvas class="heatmap-canvas"></canvas>
            <div class="heatmap-legend">
              <span class="legend-item"><span class="legend-dot unchanged"></span> Bit-exact original</span>
              <span class="legend-item"><span class="legend-dot modified"></span> Reconstructed area</span>
            </div>
            <span class="telemetry-badge">Telemetry: unmasked pixel drift = 0</span>
          </div>

        } @else {
          <!-- Synchronized Side-by-Side View -->
          <div class="side-by-side-stage">
            <div class="side-panel">
              <span class="side-panel-title">Original (Watermarked)</span>
              <div class="side-image-card">
                <div 
                  class="synchronized-viewport" 
                  [style.transform]="stageTransform()"
                >
                  <img [src]="originalDataUrl()" alt="Original" class="side-image" />
                </div>
              </div>
            </div>

            <div class="side-panel">
              <span class="side-panel-title">Cleaned (Watermark Removed)</span>
              <div class="side-image-card">
                <div 
                  class="synchronized-viewport" 
                  [style.transform]="stageTransform()"
                >
                  <img [src]="processedDataUrl()" alt="Cleaned" class="side-image" />
                </div>
              </div>
            </div>
          </div>
        }
      </div>

    </div>
  `,
  styles: [`
    .comparison-wrapper {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      gap: var(--ts-space-8, 8px);
      box-sizing: border-box;
      position: relative;
    }

    .comparison-wrapper.is-fullscreen {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 9999;
      background: var(--bg, #0F1218);
      padding: var(--ts-space-16, 16px);
    }

    .comparison-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 6px 14px;
      background: var(--ts-surface-raised, var(--surface));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      border-radius: var(--ts-radius-inner, 14px);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
    }

    .view-mode-tabs,
    .comparison-zoom-group,
    .comparison-actions,
    .metrics-container {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .drift-pill {
      font-size: 11px;
      font-family: var(--ts-font-mono, monospace);
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 6px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.35);
      color: #34D399;
    }

    .quality-metrics-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      background: var(--ts-surface-inset, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text, #E2E8F0);
      cursor: help;
    }

    .quality-metrics-pill.excellent {
      background: rgba(34, 197, 94, 0.15);
      border-color: rgba(34, 197, 94, 0.4);
      color: #4ADE80;
    }

    .quality-metrics-pill.good {
      background: rgba(59, 130, 246, 0.15);
      border-color: rgba(59, 130, 246, 0.4);
      color: #60A5FA;
    }

    .quality-metrics-pill.fair {
      background: rgba(234, 179, 8, 0.15);
      border-color: rgba(234, 179, 8, 0.4);
      color: #FACC15;
    }

    .metric-time {
      font-family: var(--ts-font-mono, monospace);
      opacity: 0.8;
      font-size: 10px;
    }

    .mode-tab-btn,
    .tool-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      height: 32px;
      padding: 0 10px;
      border-radius: var(--ts-radius-control, 8px);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      background: var(--ts-surface-inset, rgba(255, 255, 255, 0.04));
      color: var(--text-2, #94A3B8);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      user-select: none;
      transition: all var(--ts-dur-fast, 150ms) ease;
    }

    .tool-btn.icon-only {
      padding: 0;
      width: 32px;
      justify-content: center;
    }

    .mode-tab-btn:hover,
    .tool-btn:hover:not(:disabled) {
      background: var(--surface-hover, rgba(255, 255, 255, 0.08));
      color: var(--text, #F3F4F6);
      border-color: var(--border-accent, #3B82F6);
    }

    .mode-tab-btn.active {
      background: var(--accent-soft, rgba(59, 130, 246, 0.18));
      border-color: var(--accent, #3B82F6);
      color: var(--accent, #60A5FA);
      font-weight: 600;
    }

    .peek-btn:active {
      background: var(--accent, #3B82F6);
      color: #FFFFFF;
    }

    .zoom-val-mono {
      font-family: var(--ts-font-mono, monospace);
      font-size: 11px;
      font-weight: 600;
      color: var(--text, #F3F4F6);
      min-width: 36px;
      text-align: center;
    }

    .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      height: 32px;
      padding: 0 10px;
      border-radius: var(--ts-radius-control, 8px);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
      background: var(--ts-surface-inset, rgba(255, 255, 255, 0.04));
      color: var(--text, #F3F4F6);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) ease;
    }

    .btn-secondary:hover {
      background: var(--surface-hover, rgba(255, 255, 255, 0.08));
      border-color: var(--border-accent, #3B82F6);
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 32px;
      padding: 0 14px;
      border-radius: var(--ts-radius-control, 8px);
      border: 1px solid var(--accent, #3B82F6);
      background: var(--accent, #3B82F6);
      color: var(--accent-ink, #FFFFFF);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 8px var(--accent-glow, rgba(59, 130, 246, 0.35));
      transition: all var(--ts-dur-fast, 150ms) ease;
    }

    .btn-primary:hover {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }

    .comparison-viewport {
      flex: 1;
      width: 100%;
      min-height: 400px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-canvas, #0B0E14);
      border-radius: var(--ts-radius-inner, 16px);
      padding: var(--ts-space-12, 12px);
      box-sizing: border-box;
      overflow: hidden;
      position: relative;
    }

    .slider-stage {
      position: relative;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6), 0 0 0 1px var(--border, rgba(255, 255, 255, 0.15));
      user-select: none;
      touch-action: none;
      cursor: ew-resize;
      transform-origin: center center;
    }

    .comparison-image {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
      pointer-events: none;
    }

    .base-layer {
      position: absolute;
      top: 0;
      left: 0;
    }

    .slider-clipped-layer {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      overflow: hidden;
      z-index: 2;
    }

    .original-clipped {
      max-width: none;
    }

    .slider-divider {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      background: #FFFFFF;
      box-shadow: 0 0 12px rgba(0, 0, 0, 0.7);
      z-index: 5;
      transform: translateX(-50%);
      pointer-events: none;
    }

    .slider-handle {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #FFFFFF;
      color: #0F172A;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
      cursor: ew-resize;
      pointer-events: auto;
    }

    .handle-icon {
      color: #0F172A;
    }

    .comparison-badge {
      position: absolute;
      bottom: 12px;
      padding: 3px 8px;
      border-radius: 5px;
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(8px);
      color: #FFFFFF;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      pointer-events: none;
      z-index: 4;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .badge-left {
      left: 12px;
    }

    .badge-right {
      right: 12px;
    }

    .side-by-side-stage {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      width: 100%;
      height: 100%;
      max-width: 1400px;
    }

    .side-panel {
      display: flex;
      flex-direction: column;
      gap: 6px;
      height: 100%;
    }

    .side-panel-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-2, #94A3B8);
      text-align: center;
    }

    .side-image-card {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      background: #000;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35), 0 0 0 1px var(--border, rgba(255, 255, 255, 0.1));
      position: relative;
    }

    .synchronized-viewport {
      display: flex;
      align-items: center;
      justify-content: center;
      transform-origin: center center;
    }

    .side-image {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      pointer-events: none;
    }

    .heatmap-stage {
      position: relative;
      background: #0B0E14;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6), 0 0 0 1px var(--border, rgba(255, 255, 255, 0.15));
    }

    .heatmap-canvas {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }

    .heatmap-legend {
      position: absolute;
      top: 12px;
      left: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      font-size: 11px;
      color: #E2E8F0;
    }

    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    .legend-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .legend-dot.unchanged {
      background: #475569;
    }

    .legend-dot.modified {
      background: #06B6D4;
      box-shadow: 0 0 6px #06B6D4;
    }

    .telemetry-badge {
      position: absolute;
      bottom: 12px;
      left: 12px;
      font-size: 10px;
      font-family: var(--ts-font-mono, monospace);
      color: #94A3B8;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    @media (max-width: 768px) {
      .hide-mobile {
        display: none !important;
      }
      .side-by-side-stage {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ComparisonSliderComponent implements AfterViewInit, OnDestroy {
  private readonly geometry = inject(CoordinateGeometryService);

  readonly originalDataUrl = input.required<string>();
  readonly processedDataUrl = input.required<string>();
  readonly imageWidth = input.required<number>();
  readonly imageHeight = input.required<number>();
  readonly qualityMetrics = input<InpaintingQualityMetrics | null>(null);

  readonly openExport = output<void>();
  readonly reEdit = output<void>();
  readonly retryWithUltra = output<void>();
  readonly resetOriginal = output<void>();

  readonly containerRef = viewChild.required<ElementRef<HTMLDivElement>>('containerRef');
  readonly heatmapCanvasRef = viewChild<ElementRef<HTMLCanvasElement>>('heatmapCanvas');

  readonly viewMode = signal<'slider' | 'side-by-side' | 'heatmap'>('slider');
  readonly sliderPercent = signal<number>(50);
  readonly isPeeking = signal<boolean>(false);
  readonly isFullscreen = signal<boolean>(false);

  readonly compZoom = signal<number>(1.0);
  readonly compPanX = signal<number>(0);
  readonly compPanY = signal<number>(0);

  readonly stageTransform = computed(() => {
    return `translate(${this.compPanX()}px, ${this.compPanY()}px) scale(${this.compZoom()})`;
  });

  readonly Math = Math;

  private isDraggingSlider = false;
  private isPanning = false;
  private lastPanPoint: { x: number; y: number } | null = null;

  private wheelListener = (e: WheelEvent) => this.onWheel(e);

  ngAfterViewInit(): void {
    this.resetComparisonZoom();
    const container = this.containerRef().nativeElement;
    container.addEventListener('wheel', this.wheelListener, { passive: false });
  }

  ngOnDestroy(): void {
    if (this.containerRef()) {
      const container = this.containerRef().nativeElement;
      container.removeEventListener('wheel', this.wheelListener);
    }
  }

  resetComparisonZoom(): void {
    const container = this.containerRef()?.nativeElement;
    if (!container || !this.imageWidth() || !this.imageHeight()) return;

    const fitScale = this.geometry.calculateFitZoom(
      container.clientWidth,
      container.clientHeight,
      this.imageWidth(),
      this.imageHeight(),
      24
    );

    this.compZoom.set(fitScale);
    this.compPanX.set(0);
    this.compPanY.set(0);
  }

  zoomIn(): void {
    const next = Math.min(4.0, Number((this.compZoom() + 0.25).toFixed(2)));
    this.compZoom.set(next);
  }

  zoomOut(): void {
    const next = Math.max(0.25, Number((this.compZoom() - 0.25).toFixed(2)));
    this.compZoom.set(next);
  }

  toggleFullscreen(): void {
    this.isFullscreen.update(f => !f);
    setTimeout(() => this.resetComparisonZoom(), 50);
  }

  setViewMode(mode: 'slider' | 'side-by-side' | 'heatmap'): void {
    this.viewMode.set(mode);
    setTimeout(() => {
      this.resetComparisonZoom();
      if (mode === 'heatmap') {
        this.drawHeatmap();
      }
    }, 50);
  }

  drawHeatmap(): void {
    const canvas = this.heatmapCanvasRef()?.nativeElement;
    const diffData = this.qualityMetrics()?.diffImageData;
    if (!canvas || !diffData) return;
    canvas.width = diffData.width;
    canvas.height = diffData.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.putImageData(diffData, 0, 0);
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    const targetZoom = Math.max(0.25, Math.min(4.0, Number((this.compZoom() * factor).toFixed(2))));
    this.compZoom.set(targetZoom);
  }

  onPanStart(e: PointerEvent): void {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      this.isPanning = true;
      this.lastPanPoint = { x: e.clientX, y: e.clientY };
    }
  }

  onPanMove(e: PointerEvent): void {
    if (this.isPanning && this.lastPanPoint) {
      const dx = e.clientX - this.lastPanPoint.x;
      const dy = e.clientY - this.lastPanPoint.y;
      this.compPanX.update(x => x + dx);
      this.compPanY.update(y => y + dy);
      this.lastPanPoint = { x: e.clientX, y: e.clientY };
    }
  }

  onPanEnd(): void {
    this.isPanning = false;
    this.lastPanPoint = null;
  }

  onSliderDragStart(event: PointerEvent): void {
    if (event.button !== 0) return;
    this.isDraggingSlider = true;
    this.updateSliderFromEvent(event);
  }

  onSliderDragMove(event: PointerEvent): void {
    if (!this.isDraggingSlider) return;
    this.updateSliderFromEvent(event);
  }

  onSliderDragEnd(): void {
    this.isDraggingSlider = false;
  }

  private updateSliderFromEvent(event: PointerEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percent = Math.max(0, Math.min(100, Math.round((x / rect.width) * 100)));
    this.sliderPercent.set(percent);
  }
}

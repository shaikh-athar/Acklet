// apps/tool-watermark-remover/src/components/canvas-workspace/canvas-workspace.component.ts
import {
  Component,
  input,
  output,
  viewChild,
  ElementRef,
  AfterViewInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  SelectionTool,
  Point,
  RectSelection,
  ResizeHandle,
  WatermarkRegion,
  DetectedWatermarkRegion,
  ProtectedRegion,
  HistorySnapshot
} from '../../models/watermark.models';
import { CoordinateGeometryService, ViewportTransform } from '../../services/coordinate-geometry.service';

@Component({
  selector: 'app-canvas-workspace',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div 
      #containerRef 
      class="canvas-container"
      [class.cursor-brush]="activeTool() === 'brush' && !isPanningMode()"
      [class.cursor-eraser]="activeTool() === 'eraser' && !isPanningMode()"
      [class.cursor-protect]="activeTool() === 'protect' && !isPanningMode()"
      [class.cursor-grab]="isPanningMode() && !isPanDragging"
      [class.cursor-grabbing]="isPanDragging"
      [style.cursor]="customCursor()"
      (pointerdown)="onPointerDown($event)"
      (pointermove)="onPointerMove($event)"
      (pointerup)="onPointerUp($event)"
      (pointerleave)="onPointerLeave($event)"
    >
      <!-- Movable & Zoomable Viewport Wrapper -->
      <div 
        #stageRef
        class="canvas-stage-wrapper"
        [style.width.px]="imageWidth()"
        [style.height.px]="imageHeight()"
        [style.transform]="stageTransform()"
      >
        <!-- Layer 1: Source Image Canvas -->
        <canvas #imageCanvas class="canvas-layer image-layer"></canvas>

        <!-- Layer 2: Mask Canvas (Red watermark overlay) -->
        <canvas #maskCanvas class="canvas-layer mask-layer" [style.opacity]="maskOpacity()"></canvas>

        <!-- Layer 2.5: Protected Canvas (Emerald green subject protection overlay) -->
        <canvas #protectedCanvas class="canvas-layer protected-layer"></canvas>

        <!-- Layer 3: Interactive Handle & Cursor Overlay Canvas -->
        <canvas #overlayCanvas class="canvas-layer overlay-layer"></canvas>
      </div>

      <!-- Floating Canvas Info Badge -->
      <div class="canvas-info-badge">
        <span>{{ imageWidth() }} × {{ imageHeight() }}px</span>
        <span class="zoom-pill">{{ Math.round(zoom() * 100) }}%</span>
        @if (regions().length > 0) {
          <span class="regions-pill">{{ regions().length }} {{ regions().length === 1 ? 'region' : 'regions' }}</span>
        }
        @if (protectedRegions().length > 0) {
          <span class="protect-pill">{{ protectedRegions().length }} protected</span>
        }
      </div>

      <!-- Multiple Watermark Regions Quick Strip -->
      @if (regions().length > 0) {
        <div class="regions-floating-strip animate-fade-in" role="list" aria-label="Selected Watermark Regions">
          <div class="strip-header">
            <span class="strip-title">Regions ({{ regions().length }})</span>
            <button type="button" class="strip-clear-all" (click)="clearAllRegions()" title="Clear all regions">
              Clear All
            </button>
          </div>
          <div class="regions-chips-row">
            @for (reg of regions(); track reg.id) {
              <div 
                class="region-chip" 
                [class.active]="reg.id === selectedRegionId()"
                [class.processed]="reg.processed"
                (click)="selectRegion(reg.id)"
                role="listitem"
              >
                <span class="region-name">{{ reg.name }}</span>
                @if (reg.processed) {
                  <span class="processed-tag" title="Inpainted">✓</span>
                }
                <button 
                  type="button" 
                  class="region-del-btn" 
                  (click)="deleteRegion(reg.id, $event)"
                  title="Remove this selection"
                  aria-label="Remove region"
                >
                  ×
                </button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .canvas-container {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 400px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: var(--bg-canvas, #0B0E14);
      user-select: none;
      touch-action: none;
      box-sizing: border-box;
      border-radius: var(--ts-radius-inner, 16px);
      box-shadow: inset 0 2px 12px rgba(0, 0, 0, 0.4);
    }

    .canvas-container.cursor-brush {
      cursor: crosshair;
    }

    .canvas-container.cursor-eraser {
      cursor: cell;
    }

    .canvas-container.cursor-protect {
      cursor: crosshair;
    }

    .canvas-container.cursor-grab {
      cursor: grab !important;
    }

    .canvas-container.cursor-grabbing {
      cursor: grabbing !important;
    }

    .canvas-stage-wrapper {
      position: absolute;
      transform-origin: center center;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px var(--border, rgba(255, 255, 255, 0.12));
      border-radius: 6px;
      background: #000;
      transition: box-shadow var(--ts-dur-fast, 150ms) ease;
    }

    .canvas-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: block;
    }

    .image-layer {
      z-index: 1;
    }

    .mask-layer {
      z-index: 2;
      pointer-events: none;
      transition: opacity var(--ts-dur-fast, 150ms) ease;
    }

    .protected-layer {
      z-index: 2;
      pointer-events: none;
      opacity: 0.65;
      transition: opacity var(--ts-dur-fast, 150ms) ease;
    }

    .overlay-layer {
      z-index: 3;
      pointer-events: none;
    }

    .canvas-info-badge {
      position: absolute;
      bottom: var(--ts-space-12, 12px);
      right: var(--ts-space-12, 12px);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 6px;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      font-size: 11px;
      font-family: var(--ts-font-mono, monospace);
      color: #E2E8F0;
      pointer-events: none;
      z-index: 10;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .zoom-pill {
      background: var(--accent-soft, rgba(59, 130, 246, 0.2));
      color: var(--accent, #60A5FA);
      padding: 1px 5px;
      border-radius: 3px;
      font-weight: 600;
    }

    .regions-pill {
      background: rgba(239, 68, 68, 0.2);
      color: #F87171;
      padding: 1px 5px;
      border-radius: 3px;
      font-weight: 600;
    }

    .protect-pill {
      background: rgba(16, 185, 129, 0.2);
      color: #34D399;
      padding: 1px 5px;
      border-radius: 3px;
      font-weight: 600;
    }

    /* Floating Regions Strip */
    .regions-floating-strip {
      position: absolute;
      top: var(--ts-space-12, 12px);
      left: var(--ts-space-12, 12px);
      max-width: calc(100% - 24px);
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 10px;
      padding: 6px 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      z-index: 10;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    }

    .strip-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .strip-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-2, #94A3B8);
    }

    .strip-clear-all {
      background: transparent;
      border: none;
      font-size: 11px;
      color: #EF4444;
      cursor: pointer;
      padding: 0;
      font-weight: 500;
    }

    .strip-clear-all:hover {
      text-decoration: underline;
    }

    .regions-chips-row {
      display: flex;
      align-items: center;
      gap: 6px;
      overflow-x: auto;
      max-width: 480px;
      scrollbar-width: thin;
    }

    .region-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 500;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: var(--text, #E2E8F0);
      cursor: pointer;
      white-space: nowrap;
      transition: all var(--ts-dur-fast, 150ms) ease;
    }

    .region-chip:hover {
      background: rgba(255, 255, 255, 0.12);
    }

    .region-chip.active {
      background: var(--accent-soft, rgba(59, 130, 246, 0.25));
      border-color: var(--accent, #3B82F6);
      color: var(--accent, #60A5FA);
      font-weight: 600;
    }

    .region-chip.processed {
      border-color: rgba(34, 197, 94, 0.4);
    }

    .processed-tag {
      font-size: 10px;
      color: #22C55E;
      font-weight: 700;
    }

    .region-del-btn {
      background: transparent;
      border: none;
      color: var(--text-2, #94A3B8);
      font-size: 13px;
      line-height: 1;
      padding: 0 2px;
      cursor: pointer;
      border-radius: 3px;
    }

    .region-del-btn:hover {
      color: #EF4444;
      background: rgba(239, 68, 68, 0.15);
    }
  `]
})
export class CanvasWorkspaceComponent implements AfterViewInit, OnChanges, OnDestroy {
  private readonly geometry = inject(CoordinateGeometryService);

  readonly imageSource = input.required<HTMLImageElement>();
  readonly activeTool = input<SelectionTool>('brush');
  readonly brushSize = input<number>(25);
  readonly maskOpacity = input<number>(0.65);

  readonly maskStateChange = output<{
    hasMask: boolean;
    canUndo: boolean;
    canRedo: boolean;
    regionCount: number;
    selectedRegionId: string | null;
  }>();

  readonly zoomChange = output<number>();

  readonly containerRef = viewChild.required<ElementRef<HTMLDivElement>>('containerRef');
  readonly stageRef = viewChild.required<ElementRef<HTMLDivElement>>('stageRef');
  readonly imageCanvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('imageCanvas');
  readonly maskCanvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('maskCanvas');
  readonly protectedCanvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('protectedCanvas');
  readonly overlayCanvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('overlayCanvas');

  readonly Math = Math;

  // Viewport navigation state
  readonly imageWidth = signal<number>(0);
  readonly imageHeight = signal<number>(0);
  readonly zoom = signal<number>(1.0);
  readonly panX = signal<number>(0);
  readonly panY = signal<number>(0);
  readonly fitZoomFactor = signal<number>(1.0);

  // Discrete multi-regions state
  readonly regions = signal<WatermarkRegion[]>([]);
  readonly selectedRegionId = signal<string | null>(null);

  // Phase 5: Protected Regions (Faces / Subjects / Details)
  readonly protectedRegions = signal<ProtectedRegion[]>([]);

  // Interactive modes & cursor
  readonly customCursor = signal<string>('default');
  readonly isSpacePressed = signal<boolean>(false);
  readonly isPanningMode = computed(() => this.activeTool() === 'pan' || this.isSpacePressed());

  readonly stageTransform = computed(() => {
    return `translate(${this.panX()}px, ${this.panY()}px) scale(${this.zoom()})`;
  });

  // History snapshots
  private undoStack: HistorySnapshot[] = [];
  private redoStack: HistorySnapshot[] = [];
  private maxHistory = 20;

  // Interaction tracking
  private isDrawing = false;
  isPanDragging = false;
  private lastScreenPt: Point | null = null;
  private lastImagePt: Point | null = null;
  private rectStartImagePt: Point | null = null;

  // Rectangle resize & move states
  private activeResizeHandle: ResizeHandle | null = null;
  private isMovingRect = false;
  private rectMoveOrigin: RectSelection | null = null;
  private rectDragStartPt: Point | null = null;

  // Wheel listener reference
  private wheelListener = (e: WheelEvent) => this.onWheel(e);
  private keydownListener = (e: KeyboardEvent) => this.onKeyDown(e);
  private keyupListener = (e: KeyboardEvent) => this.onKeyUp(e);

  ngAfterViewInit(): void {
    this.setupWorkspace();
    const container = this.containerRef().nativeElement;
    container.addEventListener('wheel', this.wheelListener, { passive: false });

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.keydownListener);
      window.addEventListener('keyup', this.keyupListener);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['imageSource'] && !changes['imageSource'].firstChange) {
      this.setupWorkspace();
    }
  }

  ngOnDestroy(): void {
    if (this.containerRef()) {
      const container = this.containerRef().nativeElement;
      container.removeEventListener('wheel', this.wheelListener);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.keydownListener);
      window.removeEventListener('keyup', this.keyupListener);
    }
  }

  setupWorkspace(): void {
    const img = this.imageSource();
    if (!img || !img.width || !img.height) return;

    this.imageWidth.set(img.width);
    this.imageHeight.set(img.height);

    const container = this.containerRef().nativeElement;
    const fitScale = this.geometry.calculateFitZoom(
      container.clientWidth,
      container.clientHeight,
      img.width,
      img.height,
      32
    );

    this.fitZoomFactor.set(fitScale);
    this.zoom.set(fitScale);
    this.panX.set(0);
    this.panY.set(0);
    this.zoomChange.emit(fitScale);

    // Initialize canvases to native image resolution
    const imgCanvas = this.imageCanvasRef().nativeElement;
    const maskCanvas = this.maskCanvasRef().nativeElement;
    const protectedCanvas = this.protectedCanvasRef().nativeElement;
    const overlayCanvas = this.overlayCanvasRef().nativeElement;

    imgCanvas.width = img.width;
    imgCanvas.height = img.height;
    maskCanvas.width = img.width;
    maskCanvas.height = img.height;
    protectedCanvas.width = img.width;
    protectedCanvas.height = img.height;
    overlayCanvas.width = img.width;
    overlayCanvas.height = img.height;

    // Draw source image onto image canvas
    const imgCtx = imgCanvas.getContext('2d')!;
    imgCtx.drawImage(img, 0, 0);

    // Clear mask, protected canvas and overlay
    const maskCtx = maskCanvas.getContext('2d')!;
    maskCtx.clearRect(0, 0, img.width, img.height);

    const protectedCtx = protectedCanvas.getContext('2d')!;
    protectedCtx.clearRect(0, 0, img.width, img.height);

    const overlayCtx = overlayCanvas.getContext('2d')!;
    overlayCtx.clearRect(0, 0, img.width, img.height);

    // Reset history and regions
    this.regions.set([]);
    this.protectedRegions.set([]);
    this.selectedRegionId.set(null);
    this.undoStack = [];
    this.redoStack = [];
    this.saveHistorySnapshot('Initial state');
    this.emitState();
  }

  /**
   * Updates base canvas image (used in non-destructive cumulative inpainting).
   */
  updateBaseImage(imageData: ImageData): void {
    const imgCanvas = this.imageCanvasRef().nativeElement;
    const ctx = imgCanvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Applies external mask data (e.g. from AI Auto-Detect) and registers detected regions.
   */
  applyMaskData(maskData: ImageData, detectedRegions?: DetectedWatermarkRegion[]): void {
    const maskCanvas = this.maskCanvasRef().nativeElement;
    const ctx = maskCanvas.getContext('2d')!;
    ctx.putImageData(maskData, 0, 0);

    if (detectedRegions && detectedRegions.length > 0) {
      const converted: WatermarkRegion[] = detectedRegions.map((dr, index) => ({
        id: dr.id,
        name: dr.name,
        type: 'auto-detected',
        watermarkType: dr.type,
        confidence: dr.confidence,
        bounds: dr.bounds,
        active: index === 0,
        processed: false,
        createdAt: Date.now()
      }));
      this.regions.set(converted);
      this.selectedRegionId.set(converted[0].id);
    } else {
      const newReg: WatermarkRegion = {
        id: `wm-reg-${Date.now()}`,
        name: `Detected Region 1`,
        type: 'auto-detected',
        bounds: { x: 0, y: 0, width: maskData.width, height: maskData.height },
        active: true,
        processed: false,
        createdAt: Date.now()
      };
      this.regions.set([newReg]);
      this.selectedRegionId.set(newReg.id);
    }

    this.saveHistorySnapshot('AI Auto-Detect mask');
    this.renderOverlay();
    this.emitState();
  }

  /**
   * Returns current binary ImageData of the entire mask canvas.
   */
  getMaskImageData(): ImageData {
    const maskCanvas = this.maskCanvasRef().nativeElement;
    const ctx = maskCanvas.getContext('2d')!;
    return ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
  }

  /**
   * Returns a mask containing ONLY the specified region.
   */
  getMaskForRegion(regionId: string): ImageData {
    const reg = this.regions().find(r => r.id === regionId);
    if (!reg) return this.getMaskImageData();

    const maskCanvas = this.maskCanvasRef().nativeElement;
    const offscreen = document.createElement('canvas');
    offscreen.width = maskCanvas.width;
    offscreen.height = maskCanvas.height;
    const offCtx = offscreen.getContext('2d')!;

    // If region has bounding box, clip mask to that box
    offCtx.fillStyle = '#EF4444';
    offCtx.fillRect(reg.bounds.x, reg.bounds.y, reg.bounds.width, reg.bounds.height);
    return offCtx.getImageData(0, 0, offscreen.width, offscreen.height);
  }

  /**
   * Loads detected or configured subject protection regions (Phase 5).
   */
  loadProtectedRegions(regions: ProtectedRegion[]): void {
    this.protectedRegions.set([...regions]);
    const pCanvas = this.protectedCanvasRef().nativeElement;
    const ctx = pCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, pCanvas.width, pCanvas.height);

    ctx.fillStyle = 'rgba(16, 185, 129, 0.7)';
    for (const r of regions) {
      ctx.fillRect(r.bounds.x, r.bounds.y, r.bounds.width, r.bounds.height);
    }
    this.renderOverlay();
  }

  /**
   * Clears all protected regions.
   */
  clearProtectedRegions(): void {
    this.protectedRegions.set([]);
    const pCanvas = this.protectedCanvasRef().nativeElement;
    const ctx = pCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, pCanvas.width, pCanvas.height);
    this.renderOverlay();
  }

  /**
   * Returns current binary ImageData of the protected canvas (or null if empty).
   */
  getProtectedMaskImageData(): ImageData | null {
    const pCanvas = this.protectedCanvasRef().nativeElement;
    const ctx = pCanvas.getContext('2d')!;
    const imgData = ctx.getImageData(0, 0, pCanvas.width, pCanvas.height);
    const d = imgData.data;
    for (let i = 3; i < d.length; i += 4) {
      if (d[i] > 20) return imgData;
    }
    return null;
  }

  /**
   * Returns a 1D binary Uint8Array mask where 1 indicates a protected pixel.
   */
  getProtectedMaskArray(): Uint8Array | null {
    const imgData = this.getProtectedMaskImageData();
    if (!imgData) return null;
    const arr = new Uint8Array(imgData.width * imgData.height);
    const d = imgData.data;
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      if (d[i + 3] > 20 || d[i + 1] > 20) {
        arr[p] = 1;
      }
    }
    return arr;
  }

  clearMask(): void {
    this.clearAllRegions();
  }

  clearAllRegions(): void {
    const maskCanvas = this.maskCanvasRef().nativeElement;
    const ctx = maskCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

    this.regions.set([]);
    this.selectedRegionId.set(null);
    this.saveHistorySnapshot('Clear all selections');
    this.renderOverlay();
    this.emitState();
  }

  loadRegionsAndMask(regions: WatermarkRegion[], maskData?: ImageData): void {
    this.regions.set([...regions]);
    if (maskData) {
      const maskCanvas = this.maskCanvasRef().nativeElement;
      const ctx = maskCanvas.getContext('2d')!;
      ctx.putImageData(maskData, 0, 0);
    } else if (regions.length > 0) {
      const maskCanvas = this.maskCanvasRef().nativeElement;
      const ctx = maskCanvas.getContext('2d')!;
      ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      ctx.fillStyle = '#EF4444';
      for (const r of regions) {
        if (r.active) {
          ctx.fillRect(r.bounds.x, r.bounds.y, r.bounds.width, r.bounds.height);
        }
      }
    }
    this.saveHistorySnapshot('Load custom mask');
    this.renderOverlay();
    this.emitState();
  }

  getRegions(): WatermarkRegion[] {
    return this.regions();
  }

  selectRegion(id: string | null): void {
    this.selectedRegionId.set(id);
    this.regions.update(regs => regs.map(r => ({ ...r, active: r.id === id })));
    this.renderOverlay();
    this.emitState();
  }

  deleteRegion(id: string, event?: Event): void {
    if (event) event.stopPropagation();
    const updated = this.regions().filter(r => r.id !== id);
    this.regions.set(updated);
    if (this.selectedRegionId() === id) {
      this.selectedRegionId.set(updated.length > 0 ? updated[0].id : null);
    }
    this.rebuildMaskCanvas();
    this.saveHistorySnapshot('Delete region');
    this.renderOverlay();
    this.emitState();
  }

  markRegionProcessed(regionId: string, processed = true): void {
    this.regions.update(regs =>
      regs.map(r => (r.id === regionId ? { ...r, processed } : r))
    );
    this.renderOverlay();
    this.emitState();
  }

  // --- Zoom & Pan Actions ---
  zoomIn(): void {
    const next = Math.min(5.0, Number((this.zoom() + 0.25).toFixed(2)));
    this.zoom.set(next);
    this.zoomChange.emit(next);
    this.renderOverlay();
  }

  zoomOut(): void {
    const next = Math.max(0.25, Number((this.zoom() - 0.25).toFixed(2)));
    this.zoom.set(next);
    this.zoomChange.emit(next);
    this.renderOverlay();
  }

  resetZoom(): void {
    this.zoom.set(1.0);
    this.panX.set(0);
    this.panY.set(0);
    this.zoomChange.emit(1.0);
    this.renderOverlay();
  }

  fitToScreen(): void {
    const container = this.containerRef().nativeElement;
    const fitScale = this.geometry.calculateFitZoom(
      container.clientWidth,
      container.clientHeight,
      this.imageWidth(),
      this.imageHeight(),
      32
    );
    this.zoom.set(fitScale);
    this.panX.set(0);
    this.panY.set(0);
    this.zoomChange.emit(fitScale);
    this.renderOverlay();
  }

  // --- Wheel Zoom Listener ---
  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const containerRect = this.containerRef().nativeElement.getBoundingClientRect();
    const currentZoom = this.zoom();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const targetZoom = currentZoom * zoomFactor;

    const newNav = this.geometry.calculateCursorZoom(
      currentZoom,
      targetZoom,
      e.clientX,
      e.clientY,
      {
        containerRect,
        panX: this.panX(),
        panY: this.panY(),
        imgWidth: this.imageWidth(),
        imgHeight: this.imageHeight()
      }
    );

    this.zoom.set(newNav.zoom);
    this.panX.set(newNav.panX);
    this.panY.set(newNav.panY);
    this.zoomChange.emit(newNav.zoom);
    this.renderOverlay();
  }

  // --- Keyboard Shortcuts (Space for Pan, Delete for Region) ---
  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Space' && !this.isSpacePressed() && !(e.target instanceof HTMLInputElement)) {
      e.preventDefault();
      this.isSpacePressed.set(true);
    }
    if ((e.code === 'Delete' || e.code === 'Backspace') && !(e.target instanceof HTMLInputElement)) {
      const activeId = this.selectedRegionId();
      if (activeId) {
        e.preventDefault();
        this.deleteRegion(activeId);
      }
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      this.isSpacePressed.set(false);
    }
  }

  // --- Pointer Event Handlers ---
  onPointerDown(event: PointerEvent): void {
    const isMiddleClick = event.button === 1;
    const isPanMode = this.isPanningMode() || isMiddleClick;

    if (isPanMode) {
      this.isPanDragging = true;
      this.lastScreenPt = { x: event.clientX, y: event.clientY };
      return;
    }

    if (event.button !== 0) return; // Only primary button for drawing/editing

    const pt = this.getNativePoint(event);
    if (!pt) return;

    this.isDrawing = true;
    this.lastImagePt = pt;

    const activeReg = this.getActiveRegion();

    if (this.activeTool() === 'rectangle') {
      // Check if clicking on resize handle of active rectangle
      if (activeReg && activeReg.type === 'rectangle') {
        const handle = this.geometry.detectHandle(pt, activeReg.bounds, 12 / this.zoom());
        if (handle) {
          this.activeResizeHandle = handle;
          return;
        }

        // Check if clicking inside active rectangle to move it
        if (this.geometry.isPointInRect(pt, activeReg.bounds)) {
          this.isMovingRect = true;
          this.rectMoveOrigin = { ...activeReg.bounds };
          this.rectDragStartPt = pt;
          return;
        }
      }

      // Check if clicking on another existing rectangle to activate it
      const clickedOther = this.regions().find(
        r => r.type === 'rectangle' && this.geometry.isPointInRect(pt, r.bounds)
      );
      if (clickedOther) {
        this.selectRegion(clickedOther.id);
        return;
      }

      // Start drawing a new rectangle region
      this.rectStartImagePt = pt;
    } else if (this.activeTool() === 'protect') {
      this.drawProtectStroke(pt, pt);
    } else {
      // Brush or Eraser stroke
      this.drawStroke(pt, pt);
    }
  }

  onPointerMove(event: PointerEvent): void {
    if (this.isPanDragging && this.lastScreenPt) {
      const dx = event.clientX - this.lastScreenPt.x;
      const dy = event.clientY - this.lastScreenPt.y;
      this.panX.update(px => px + dx);
      this.panY.update(py => py + dy);
      this.lastScreenPt = { x: event.clientX, y: event.clientY };
      return;
    }

    const pt = this.getNativePoint(event);
    this.updateCursor(pt);

    if (!pt) return;

    if (this.isDrawing) {
      const activeReg = this.getActiveRegion();

      if (this.activeTool() === 'rectangle') {
        if (this.activeResizeHandle && activeReg) {
          // Live resize of active rectangle
          const resized = this.geometry.resizeRect(
            activeReg.bounds,
            this.activeResizeHandle,
            pt,
            this.imageWidth(),
            this.imageHeight()
          );
          this.updateActiveRegionBounds(resized);
        } else if (this.isMovingRect && activeReg && this.rectMoveOrigin && this.rectDragStartPt) {
          // Live move of active rectangle
          const dx = pt.x - this.rectDragStartPt.x;
          const dy = pt.y - this.rectDragStartPt.y;
          const moved = this.geometry.moveRect(
            this.rectMoveOrigin,
            dx,
            dy,
            this.imageWidth(),
            this.imageHeight()
          );
          this.updateActiveRegionBounds(moved);
        } else if (this.rectStartImagePt) {
          // Live rubberband preview for new rectangle
          this.renderRubberband(this.rectStartImagePt, pt);
          return;
        }
      } else if (this.activeTool() === 'protect') {
        if (this.lastImagePt) {
          this.drawProtectStroke(this.lastImagePt, pt);
          this.lastImagePt = pt;
        }
      } else if (this.lastImagePt) {
        // Continuous brush / eraser stroke
        this.drawStroke(this.lastImagePt, pt);
        this.lastImagePt = pt;
      }
    }

    this.renderOverlay(pt);
  }

  onPointerUp(event: PointerEvent): void {
    if (this.isPanDragging) {
      this.isPanDragging = false;
      this.lastScreenPt = null;
      return;
    }

    if (!this.isDrawing) return;
    this.isDrawing = false;

    if (this.activeTool() === 'rectangle') {
      if (this.rectStartImagePt) {
        const pt = this.getNativePoint(event) || this.lastImagePt;
        if (pt) {
          const rx = Math.min(this.rectStartImagePt.x, pt.x);
          const ry = Math.min(this.rectStartImagePt.y, pt.y);
          const rw = Math.abs(pt.x - this.rectStartImagePt.x);
          const rh = Math.abs(pt.y - this.rectStartImagePt.y);

          if (rw > 6 && rh > 6) {
            const newRegId = `wm-reg-${Date.now()}`;
            const newReg: WatermarkRegion = {
              id: newRegId,
              name: `Region ${this.regions().length + 1}`,
              type: 'rectangle',
              bounds: { x: rx, y: ry, width: rw, height: rh },
              active: true,
              processed: false,
              createdAt: Date.now()
            };

            this.regions.update(regs => [
              ...regs.map(r => ({ ...r, active: false })),
              newReg
            ]);
            this.selectedRegionId.set(newRegId);
            this.rebuildMaskCanvas();
            this.saveHistorySnapshot('Add rectangle region');
          }
        }
        this.rectStartImagePt = null;
      } else if (this.activeResizeHandle || this.isMovingRect) {
        this.activeResizeHandle = null;
        this.isMovingRect = false;
        this.rectMoveOrigin = null;
        this.rectDragStartPt = null;
        this.rebuildMaskCanvas();
        this.saveHistorySnapshot('Adjust rectangle');
      }
    } else if (this.activeTool() === 'protect') {
      const newProtId = `prot-${Date.now()}`;
      const newProt: ProtectedRegion = {
        id: newProtId,
        name: `Protected Area ${this.protectedRegions().length + 1}`,
        type: 'manual',
        bounds: { x: 0, y: 0, width: this.imageWidth(), height: this.imageHeight() },
        createdAt: Date.now()
      };
      this.protectedRegions.update(regs => [...regs, newProt]);
      this.renderOverlay();
      this.emitState();
    } else {
      // Brush/Eraser stroke completed: ensure brush region exists
      if (!this.getActiveRegion()) {
        const newRegId = `wm-reg-${Date.now()}`;
        const newReg: WatermarkRegion = {
          id: newRegId,
          name: `Region ${this.regions().length + 1}`,
          type: 'brush',
          bounds: { x: 0, y: 0, width: this.imageWidth(), height: this.imageHeight() },
          active: true,
          processed: false,
          createdAt: Date.now()
        };
        this.regions.update(regs => [...regs, newReg]);
        this.selectedRegionId.set(newRegId);
      }
      this.saveHistorySnapshot('Brush stroke');
    }

    this.lastImagePt = null;
    this.renderOverlay();
    this.emitState();
  }

  onPointerLeave(event: PointerEvent): void {
    if (this.isPanDragging) {
      this.isPanDragging = false;
      this.lastScreenPt = null;
    }
    if (this.isDrawing) {
      this.onPointerUp(event);
    }
    this.clearOverlay();
  }

  // --- Rendering Overlay & Handles ---
  private renderOverlay(cursorPt?: Point | null): void {
    const overlayCanvas = this.overlayCanvasRef().nativeElement;
    const ctx = overlayCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // 1. Draw all rectangle region bounding boxes
    const zoomVal = this.zoom();
    const handleSize = Math.max(8, Math.round(10 / zoomVal));

    for (const reg of this.regions()) {
      if (reg.type !== 'rectangle') continue;

      const { x, y, width, height } = reg.bounds;
      const isActive = reg.id === this.selectedRegionId();

      ctx.save();
      if (isActive) {
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = Math.max(2, 2.5 / zoomVal);
        ctx.setLineDash([]);
        ctx.strokeRect(x, y, width, height);

        // Draw 8 white square handles with accent border
        const handles = this.geometry.getHandlePositions(reg.bounds);
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = Math.max(1.5, 2 / zoomVal);

        for (const h of Object.values(handles)) {
          ctx.fillRect(
            h.x - handleSize / 2,
            h.y - handleSize / 2,
            handleSize,
            handleSize
          );
          ctx.strokeRect(
            h.x - handleSize / 2,
            h.y - handleSize / 2,
            handleSize,
            handleSize
          );
        }
      } else {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.lineWidth = Math.max(1.5, 1.5 / zoomVal);
        ctx.setLineDash([6 / zoomVal, 4 / zoomVal]);
        ctx.strokeRect(x, y, width, height);
      }
      ctx.restore();
    }

    // 1.5 Draw protected region bounding boxes (Phase 5)
    for (const pReg of this.protectedRegions()) {
      if (pReg.bounds && pReg.bounds.width < this.imageWidth() && pReg.bounds.height < this.imageHeight()) {
        const { x, y, width, height } = pReg.bounds;
        ctx.save();
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = Math.max(1.5, 2 / zoomVal);
        ctx.setLineDash([4 / zoomVal, 4 / zoomVal]);
        ctx.strokeRect(x, y, width, height);
        ctx.restore();
      }
    }

    // 2. Draw circular brush/eraser/protect cursor ring
    if (cursorPt && (this.activeTool() === 'brush' || this.activeTool() === 'eraser' || this.activeTool() === 'protect')) {
      const radius = this.brushSize() / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cursorPt.x, cursorPt.y, radius, 0, Math.PI * 2);
      if (this.activeTool() === 'protect') {
        ctx.strokeStyle = '#10B981';
        ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
      } else if (this.activeTool() === 'eraser') {
        ctx.strokeStyle = '#FFFFFF';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      } else {
        ctx.strokeStyle = '#EF4444';
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      }
      ctx.lineWidth = Math.max(1.5, 2 / zoomVal);
      ctx.stroke();
      ctx.fill();
      ctx.restore();
    }
  }

  private drawProtectStroke(from: Point, to: Point): void {
    const pCanvas = this.protectedCanvasRef().nativeElement;
    const ctx = pCanvas.getContext('2d')!;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#10B981';
    ctx.fillStyle = '#10B981';
    ctx.lineWidth = this.brushSize();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(to.x, to.y, this.brushSize() / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private renderRubberband(start: Point, current: Point): void {
    const overlayCanvas = this.overlayCanvasRef().nativeElement;
    const ctx = overlayCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    const rx = Math.min(start.x, current.x);
    const ry = Math.min(start.y, current.y);
    const rw = Math.abs(current.x - start.x);
    const rh = Math.abs(current.y - start.y);

    ctx.save();
    ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = Math.max(2, 2 / this.zoom());
    ctx.setLineDash([6 / this.zoom(), 4 / this.zoom()]);
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.restore();
  }

  private clearOverlay(): void {
    const overlayCanvas = this.overlayCanvasRef().nativeElement;
    const ctx = overlayCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  }

  private updateCursor(pt: Point | null): void {
    if (this.isPanningMode()) {
      this.customCursor.set(this.isPanDragging ? 'grabbing' : 'grab');
      return;
    }

    if (!pt || this.activeTool() !== 'rectangle') {
      this.customCursor.set('default');
      return;
    }

    const activeReg = this.getActiveRegion();
    if (activeReg && activeReg.type === 'rectangle') {
      const handle = this.geometry.detectHandle(pt, activeReg.bounds, 12 / this.zoom());
      if (handle) {
        const cursorMap: Record<ResizeHandle, string> = {
          nw: 'nwse-resize',
          se: 'nwse-resize',
          ne: 'nesw-resize',
          sw: 'nesw-resize',
          n: 'ns-resize',
          s: 'ns-resize',
          e: 'ew-resize',
          w: 'ew-resize'
        };
        this.customCursor.set(cursorMap[handle]);
        return;
      }

      if (this.geometry.isPointInRect(pt, activeReg.bounds)) {
        this.customCursor.set('move');
        return;
      }
    }

    this.customCursor.set('crosshair');
  }

  // --- Mask Canvas Painting & Rebuilding ---
  private drawStroke(from: Point, to: Point): void {
    const maskCanvas = this.maskCanvasRef().nativeElement;
    const ctx = maskCanvas.getContext('2d')!;

    ctx.save();
    if (this.activeTool() === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.fillStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#EF4444';
      ctx.fillStyle = '#EF4444';
    }

    ctx.lineWidth = this.brushSize();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(to.x, to.y, this.brushSize() / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private rebuildMaskCanvas(): void {
    const maskCanvas = this.maskCanvasRef().nativeElement;
    const ctx = maskCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

    ctx.fillStyle = 'rgba(239, 68, 68, 1.0)';
    for (const reg of this.regions()) {
      if (reg.type === 'rectangle') {
        ctx.fillRect(reg.bounds.x, reg.bounds.y, reg.bounds.width, reg.bounds.height);
      }
    }
  }

  private updateActiveRegionBounds(newBounds: RectSelection): void {
    const activeId = this.selectedRegionId();
    if (!activeId) return;

    this.regions.update(regs =>
      regs.map(r => (r.id === activeId ? { ...r, bounds: newBounds } : r))
    );
    this.rebuildMaskCanvas();
    this.renderOverlay();
  }

  // --- History (Undo / Redo) ---
  undo(): void {
    if (this.undoStack.length <= 1) return;
    const current = this.undoStack.pop()!;
    this.redoStack.push(current);

    const prev = this.undoStack[this.undoStack.length - 1];
    this.restoreSnapshot(prev);
  }

  redo(): void {
    if (this.redoStack.length === 0) return;
    const next = this.redoStack.pop()!;
    this.undoStack.push(next);
    this.restoreSnapshot(next);
  }

  private saveHistorySnapshot(description: string): void {
    const maskCanvas = this.maskCanvasRef().nativeElement;
    const ctx = maskCanvas.getContext('2d')!;
    const maskData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

    const snapshot: HistorySnapshot = {
      maskData,
      regions: JSON.parse(JSON.stringify(this.regions())),
      activeRegionId: this.selectedRegionId(),
      description
    };

    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  private restoreSnapshot(snap: HistorySnapshot): void {
    const maskCanvas = this.maskCanvasRef().nativeElement;
    const ctx = maskCanvas.getContext('2d')!;
    ctx.putImageData(snap.maskData, 0, 0);

    this.regions.set(JSON.parse(JSON.stringify(snap.regions)));
    this.selectedRegionId.set(snap.activeRegionId);
    this.renderOverlay();
    this.emitState();
  }

  // --- Helpers ---
  private getActiveRegion(): WatermarkRegion | null {
    const id = this.selectedRegionId();
    if (!id) return null;
    return this.regions().find(r => r.id === id) || null;
  }

  private checkHasMask(): boolean {
    if (this.regions().length > 0) return true;
    const maskCanvas = this.maskCanvasRef().nativeElement;
    const ctx = maskCanvas.getContext('2d')!;
    const data = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 20) return true;
    }
    return false;
  }

  private emitState(): void {
    this.maskStateChange.emit({
      hasMask: this.checkHasMask(),
      canUndo: this.undoStack.length > 1,
      canRedo: this.redoStack.length > 0,
      regionCount: this.regions().length,
      selectedRegionId: this.selectedRegionId()
    });
  }

  private getNativePoint(event: PointerEvent): Point | null {
    const container = this.containerRef().nativeElement;
    const containerRect = container.getBoundingClientRect();

    const pt = this.geometry.screenToImage(event.clientX, event.clientY, {
      containerRect,
      zoom: this.zoom(),
      panX: this.panX(),
      panY: this.panY(),
      imgWidth: this.imageWidth(),
      imgHeight: this.imageHeight()
    });

    if (
      pt.x < 0 ||
      pt.x > this.imageWidth() ||
      pt.y < 0 ||
      pt.y > this.imageHeight()
    ) {
      return null;
    }
    return pt;
  }
}

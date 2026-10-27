import {
  Component,
  input,
  signal,
  viewChild,
  ElementRef,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  ChangeDetectionStrategy,
  PLATFORM_ID,
  inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

/**
 * TUNABLE ANIMATION SPEC CONSTANTS
 * Adjust feel, speed, and grid density here.
 */
export const STAGGER_MS = 520;       // Cell stagger delay window (0-520ms)
export const CELL_FADE_MS = 260;      // Individual cell uncover fade duration (260ms)
export const REVEAL_MS = 780;         // Total mosaic reveal window (STAGGER_MS + CELL_FADE_MS)
export const GLOW_START_MS = 200;     // Glow pulse delay (starts 200ms into reveal)
export const GLOW_IN_MS = 350;        // Glow fade-in duration (~350ms)
export const GLOW_HOLD_MS = 250;      // Glow hold duration (~250ms)
export const GLOW_OUT_MS = 500;       // Glow fade-out duration (~500ms)
export const TOTAL_MS = 1300;         // Total sequence duration (~1.2-1.4s, roughly +40%)
export const ASSEMBLE_GRID_SIZE = 16; // 16x16 grid of square cells
export const ASSEMBLE_DEBOUNCE_MS = 180; // Debounce 150-200ms for rapid typing
export const ASSEMBLE_REDUCED_MOTION_MS = 200; // Reduced motion simple fade (200ms)

// Aliases for compatibility
export const ASSEMBLE_TOTAL_DURATION_MS = TOTAL_MS;
export const ASSEMBLE_PHASE_A_DURATION_MS = 200;
export const ASSEMBLE_PHASE_B_DURATION_MS = REVEAL_MS;
export const ASSEMBLE_MAX_STAGGER_MS = STAGGER_MS;
export const ASSEMBLE_CELL_FADE_MS = CELL_FADE_MS;
export const ASSEMBLE_PHASE_C_START_MS = GLOW_START_MS;
export const ASSEMBLE_PHASE_C_HOLD_MS = GLOW_HOLD_MS;
export const ASSEMBLE_GLOW_COLOR = 'var(--glow)';
export const ASSEMBLE_GLOW_COLOR_LIGHT = 'var(--glow)';
export const ASSEMBLE_GLOW_COLOR_DARK = 'var(--glow)';

interface MosaicCell {
  row: number;
  col: number;
  delayMs: number;
  opacity: number;
}

/**
 * Accurate Cubic Bezier evaluator for cubic-bezier(0.25, 0.8, 0.25, 1)
 */
function evaluateCubicBezier(t: number, p1x = 0.25, p1y = 0.8, p2x = 0.25, p2y = 1.0): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;

  let u = t;
  for (let i = 0; i < 5; i++) {
    const currentX = 3 * (1 - u) * (1 - u) * u * p1x + 3 * (1 - u) * u * u * p2x + u * u * u;
    const currentSlope = 3 * (1 - u) * (1 - u) * p1x + 6 * (1 - u) * u * (p2x - p1x) + 3 * u * u * (1 - p2x);
    if (Math.abs(currentSlope) < 1e-5) break;
    u -= (currentX - t) / currentSlope;
    u = Math.max(0, Math.min(1, u));
  }
  return 3 * (1 - u) * (1 - u) * u * p1y + 3 * (1 - u) * u * u * p2y + u * u * u;
}

@Component({
  selector: 'app-qr-assemble-effect',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qr-assemble-wrapper" [class.is-animating]="isAnimating()">
      <!-- Phase A: Background dim overlay (~6-7% black, 0-200ms) -->
      <div class="qr-dim-overlay" aria-hidden="true"></div>

      <!-- Phase A & Focus / Content slot with atomic crossfade -->
      <div class="qr-content-slot" [class.is-dimmed]="isSlowRender()">
        @if (outgoingUrl() && isCrossfading()) {
          <img
            [src]="outgoingUrl()"
            alt=""
            [class]="imageClass()"
            class="qr-crossfade-outgoing"
            aria-hidden="true"
          />
        }
        @if (displayedUrl()) {
          <img
            [src]="displayedUrl()"
            [alt]="altText()"
            [class]="imageClass()"
            [class.qr-crossfade-incoming]="isCrossfading()"
          />
        } @else {
          <ng-content></ng-content>
        }
      </div>

      <!-- Phase B: Canvas Mosaic Overlay (16x16 staggered grid, 0-780ms) -->
      <canvas
        #mosaicCanvas
        class="qr-assemble-canvas"
        [class.active]="isAnimating()"
        aria-hidden="true"
      ></canvas>

      <!-- Optional Gentle Diagonal Light Sweep Across Card -->
      <div class="qr-sweep-track" aria-hidden="true">
        <div class="qr-sweep-beam"></div>
      </div>

      <!-- Soft Diffused Theme-Matched Glow -->
      <div class="qr-glow-pulse" aria-hidden="true"></div>

      <!-- Spinner badge if rendering takes > 300ms -->
      @if (isSlowRender()) {
        <div class="qr-spinner-badge" role="status" aria-label="Updating QR Code">
          <div class="qr-spinner-ring"></div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: contents;
      /* Theme-matched indigo-blue glow; desaturated in light mode */
      --qr-glow: color-mix(in srgb, var(--tool-accent, var(--accent, #3b82f6)) 85%, #64748b);
      --glow: var(--qr-glow);
      --glow-peak-opacity: 0.65;
    }

    :host-context([data-theme="dark"]),
    :host-context(.dark),
    :host-context(.dark-theme),
    [data-theme="dark"] .qr-glow-pulse,
    .dark .qr-glow-pulse {
      /* +15% lightness tint of primary in dark mode to illuminate dark surfaces */
      --qr-glow: color-mix(in srgb, var(--tool-accent, var(--accent, #60a5fa)) 80%, #bfdbfe);
      --glow: var(--qr-glow);
      --glow-peak-opacity: 0.76;
    }

    .qr-assemble-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      border-radius: inherit;
    }

    /* Phase A: Preview card background dims slightly (overlay at ~6-7% black) */
    .qr-dim-overlay {
      position: absolute;
      inset: -8px;
      border-radius: 12px;
      background-color: rgba(0, 0, 0, 0.07);
      pointer-events: none;
      opacity: 0;
      z-index: 1;
    }

    .is-animating .qr-dim-overlay {
      animation: qrDimOverlay 1300ms cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
      will-change: opacity;
    }

    @keyframes qrDimOverlay {
      0% {
        opacity: 0;
      }
      15.4% { /* 200ms: dims slightly */
        opacity: 1;
      }
      65% {   /* ~850ms: fades back to transparent */
        opacity: 0;
      }
      100% {
        opacity: 0;
      }
    }

    /* Phase A: QR Content Slot (fades to ~0.6 opacity and blur(1.5px), uncovers sharp) */
    .qr-content-slot {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      border-radius: inherit;
      z-index: 2;
    }

    .is-animating .qr-content-slot {
      animation: qrPhaseAFade 1300ms cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
      will-change: opacity, filter;
    }

    .qr-tile-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      image-rendering: pixelated;
      will-change: transform, opacity;
    }

    .mobile-qr-img {
      display: block;
      width: min(240px, 60vw);
      height: min(240px, 60vw);
      object-fit: contain;
      image-rendering: pixelated;
    }

    .qr-crossfade-outgoing {
      position: absolute;
      inset: 0;
      margin: auto;
      animation: qrCrossfadeOut 150ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
      will-change: opacity;
    }

    .qr-crossfade-incoming {
      animation: qrCrossfadeIn 150ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
      will-change: opacity;
    }

    @keyframes qrCrossfadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    @keyframes qrCrossfadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .qr-content-slot.is-dimmed {
      opacity: 0.65;
      transition: opacity 150ms ease;
    }

    .qr-spinner-badge {
      position: absolute;
      inset: 0;
      margin: auto;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: color-mix(in srgb, var(--bg-card, #1e293b) 85%, transparent);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.16);
      z-index: 10;
      pointer-events: none;
      animation: qrBadgeFadeIn 150ms ease forwards;
    }

    .qr-spinner-ring {
      width: 20px;
      height: 20px;
      border: 2.5px solid color-mix(in srgb, var(--tool-accent, #3b82f6) 30%, transparent);
      border-top-color: var(--tool-accent, #3b82f6);
      border-radius: 50%;
      animation: qrSpinnerRotate 700ms linear infinite;
    }

    @keyframes qrBadgeFadeIn {
      from { opacity: 0; transform: scale(0.85); }
      to { opacity: 1; transform: scale(1); }
    }

    @keyframes qrSpinnerRotate {
      to { transform: rotate(360deg); }
    }

    @keyframes qrPhaseAFade {
      0% {
        opacity: 0;
        filter: blur(2px);
      }
      15.4% { /* 200ms: soft focus transition */
        opacity: 0.3;
        filter: blur(1.5px);
      }
      65% {   /* uncovers sharp underneath */
        opacity: 1;
        filter: blur(0px);
      }
      100% {
        opacity: 1;
        filter: blur(0px);
      }
    }

    /* Phase B: Mosaic Canvas */
    .qr-assemble-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      border-radius: inherit;
      opacity: 0;
      transition: opacity 120ms ease;
      z-index: 3;
    }

    .qr-assemble-canvas.active {
      opacity: 1;
      will-change: opacity;
    }

    /* Optional Gentle Light Sweep across the card */
    .qr-sweep-track {
      position: absolute;
      inset: 0;
      border-radius: inherit;
      overflow: hidden;
      pointer-events: none;
      z-index: 4;
    }

    .qr-sweep-beam {
      position: absolute;
      inset: -20% -40%;
      width: 180%;
      height: 140%;
      background: linear-gradient(
        115deg,
        transparent 0%,
        transparent 40%,
        color-mix(in srgb, var(--glow) 10%, rgba(255, 255, 255, 0.12)) 50%,
        transparent 60%,
        transparent 100%
      );
      transform: translateX(-100%);
      opacity: 0;
    }

    .is-animating .qr-sweep-beam {
      animation: qrSweepPass 1300ms cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
      will-change: transform, opacity;
    }

    @keyframes qrSweepPass {
      0% {
        transform: translateX(-100%);
        opacity: 0;
      }
      15% {
        opacity: 1;
      }
      80% {
        opacity: 1;
      }
      100% {
        transform: translateX(100%);
        opacity: 0;
      }
    }

    /* Change 2: Soft Diffused Theme-Matched Glow (Layered box-shadows, No hard border) */
    .qr-glow-pulse {
      position: absolute;
      inset: -6px;
      border-radius: 12px;
      pointer-events: none;
      opacity: 0;
      box-shadow:
        0 0 0 1px color-mix(in srgb, var(--glow) 25%, transparent),
        0 0 24px 2px color-mix(in srgb, var(--glow) 30%, transparent),
        0 0 56px 10px color-mix(in srgb, var(--glow) 18%, transparent),
        inset 0 0 28px color-mix(in srgb, var(--glow) 14%, transparent);
      z-index: 5;
    }

    .is-animating .qr-glow-pulse {
      animation: qrGlowPulse 1300ms cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
      will-change: opacity;
    }

    @keyframes qrGlowPulse {
      0% {
        opacity: 0;
      }
      15.4% { /* 200ms: glow starts rising */
        opacity: 0;
      }
      42.3% { /* 550ms (350ms rise): reaches peak opacity */
        opacity: var(--glow-peak-opacity);
      }
      61.5% { /* 800ms (250ms hold): holds peak */
        opacity: var(--glow-peak-opacity);
      }
      100% {  /* 1300ms (500ms fade-out): fades smoothly to 0 */
        opacity: 0;
      }
    }

    /* prefers-reduced-motion: reduce to simple 200ms fade, no mosaic, no glow pulse, no sweep */
    @media (prefers-reduced-motion: reduce) {
      .qr-dim-overlay,
      .qr-assemble-canvas,
      .qr-glow-pulse,
      .qr-sweep-track {
        display: none !important;
      }

      .qr-crossfade-outgoing,
      .qr-crossfade-incoming {
        animation: none !important;
        transition: none !important;
      }

      .is-animating .qr-content-slot {
        animation: qrReducedMotionFade 200ms cubic-bezier(0.25, 0.8, 0.25, 1) forwards !important;
        filter: none !important;
      }

      .qr-spinner-ring {
        animation: none !important;
        border-top-color: var(--tool-accent, #3b82f6);
      }

      @keyframes qrReducedMotionFade {
        0% {
          opacity: 0.3;
        }
        100% {
          opacity: 1;
        }
      }
    }
  `]
})
export class QrAssembleEffectComponent implements OnChanges, OnDestroy {
  readonly qrDataUrl = input<string | null>(null);
  readonly isGenerating = input<boolean>(false);
  readonly shouldAnimate = input<boolean | null>(null);
  readonly imageClass = input<string>('qr-tile-img');
  readonly altText = input<string>('Generated QR Code Preview');

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('mosaicCanvas');
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly isAnimating = signal<boolean>(false);
  readonly isPending = signal<boolean>(false);
  readonly displayedUrl = signal<string | null>(null);
  readonly outgoingUrl = signal<string | null>(null);
  readonly isCrossfading = signal<boolean>(false);
  readonly isSlowRender = signal<boolean>(false);

  // Alias for backward-compatibility with tests / callers
  get isMosaicActive() {
    return this.isAnimating;
  }

  private cells: MosaicCell[] = [];
  private rafId: number | null = null;
  private animTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private debounceTimerId: ReturnType<typeof setTimeout> | null = null;
  private slowRenderTimerId: ReturnType<typeof setTimeout> | null = null;
  private crossfadeTimerId: ReturnType<typeof setTimeout> | null = null;
  private animStartTime: number = 0;
  private previousDataUrl: string | null = null;
  private isFirstCheck = true;

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.isBrowser) return;

    if (changes['isGenerating']) {
      const generating = this.isGenerating();
      this.clearSlowRenderTimer();
      if (generating) {
        this.slowRenderTimerId = setTimeout(() => {
          if (this.isGenerating()) {
            this.isSlowRender.set(true);
          }
        }, 300);
      } else {
        this.isSlowRender.set(false);
      }
    }

    if (changes['qrDataUrl'] || changes['shouldAnimate']) {
      const currentUrl = this.qrDataUrl();
      const shouldAnim = this.shouldAnimate();

      if (this.isFirstCheck) {
        this.isFirstCheck = false;
        this.previousDataUrl = currentUrl;
        if (currentUrl) {
          this.displayedUrl.set(currentUrl);
          if (shouldAnim === true) {
            this.startAssembleAnimation();
          }
        }
        return;
      }

      // If QR cleared to empty/null, cancel everything
      if (!currentUrl) {
        this.previousDataUrl = null;
        this.displayedUrl.set(null);
        this.outgoingUrl.set(null);
        this.cancelCrossfade();
        this.clearDebounceTimer();
        this.cancelAnimation();
        return;
      }

      if (currentUrl !== this.displayedUrl()) {
        const previous = this.displayedUrl();
        this.previousDataUrl = currentUrl;

        // If shouldAnimate is explicitly true, or if undefined/null and first generation from empty
        const shouldRunFull = shouldAnim === true || (shouldAnim === null && !previous);

        if (shouldRunFull) {
          this.cancelCrossfade();
          this.displayedUrl.set(currentUrl);
          this.outgoingUrl.set(null);
          this.startAssembleAnimation();
        } else {
          // Later edits: Atomic crossfade (120-180ms), NO blank flash, NO pixel reveal
          this.cancelAnimation();
          if (previous) {
            this.outgoingUrl.set(previous);
            this.displayedUrl.set(currentUrl);
            this.isCrossfading.set(true);
            this.clearCrossfadeTimer();
            if (this.checkPrefersReducedMotion()) {
              this.isCrossfading.set(false);
              this.outgoingUrl.set(null);
            } else {
              this.crossfadeTimerId = setTimeout(() => {
                this.isCrossfading.set(false);
                this.outgoingUrl.set(null);
              }, 150);
            }
          } else {
            this.displayedUrl.set(currentUrl);
          }
        }
      } else if (shouldAnim === true && !this.isAnimating()) {
        this.startAssembleAnimation();
      }
    }
  }

  ngOnDestroy(): void {
    this.clearDebounceTimer();
    this.clearSlowRenderTimer();
    this.cancelCrossfade();
    this.cancelAnimation();
  }

  private clearSlowRenderTimer(): void {
    if (this.slowRenderTimerId !== null) {
      clearTimeout(this.slowRenderTimerId);
      this.slowRenderTimerId = null;
    }
  }

  private clearCrossfadeTimer(): void {
    if (this.crossfadeTimerId !== null) {
      clearTimeout(this.crossfadeTimerId);
      this.crossfadeTimerId = null;
    }
  }

  cancelCrossfade(): void {
    this.clearCrossfadeTimer();
    this.isCrossfading.set(false);
    this.outgoingUrl.set(null);
  }

  private clearDebounceTimer(): void {
    if (this.debounceTimerId !== null) {
      clearTimeout(this.debounceTimerId);
      this.debounceTimerId = null;
    }
  }

  private checkPrefersReducedMotion(): boolean {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Alias for backward-compatibility with tests
   */
  startMosaicReveal(): void {
    this.startAssembleAnimation();
  }

  /**
   * Starts the complete QR assemble animation (Phases A, B, and C).
   */
  startAssembleAnimation(): void {
    if (!this.isBrowser) return;

    this.clearDebounceTimer();
    this.isPending.set(false);

    // Respect prefers-reduced-motion: simple 200ms fade, no mosaic, no glow pulse, no sweep
    if (this.checkPrefersReducedMotion()) {
      this.cancelAnimation();
      this.isAnimating.set(true);
      this.animTimeoutId = setTimeout(() => {
        this.isAnimating.set(false);
      }, ASSEMBLE_REDUCED_MOTION_MS);
      return;
    }

    const wasAnimating = this.isAnimating();
    this.cancelAnimation();

    if (wasAnimating) {
      // Re-trigger animation cleanly on next frame if interrupted mid-animation (no stacking)
      requestAnimationFrame(() => {
        this.runAnimationSequence();
      });
    } else {
      this.runAnimationSequence();
    }
  }

  private runAnimationSequence(): void {
    // Build the 16x16 cell grid with organic staggered delays for Phase B (stagger window 520ms)
    const newCells: MosaicCell[] = [];
    for (let r = 0; r < ASSEMBLE_GRID_SIZE; r++) {
      for (let c = 0; c < ASSEMBLE_GRID_SIZE; c++) {
        const normDistFromCenter = Math.hypot(r - ASSEMBLE_GRID_SIZE / 2, c - ASSEMBLE_GRID_SIZE / 2) / (ASSEMBLE_GRID_SIZE * 0.707);
        const randomJitter = Math.random() * 0.7 + 0.3;
        const delayMs = Math.min(STAGGER_MS, normDistFromCenter * STAGGER_MS * 0.6 + randomJitter * STAGGER_MS * 0.4);

        newCells.push({
          row: r,
          col: c,
          delayMs,
          opacity: 1.0
        });
      }
    }

    this.cells = newCells;
    this.isAnimating.set(true);
    this.animStartTime = performance.now();

    // Start Phase B canvas render loop
    this.rafId = requestAnimationFrame(this.renderLoop.bind(this));

    // Schedule cleanup at end of timeline (TOTAL_MS = 1300ms)
    this.animTimeoutId = setTimeout(() => {
      this.cancelAnimation();
    }, TOTAL_MS);
  }

  private renderLoop(now: number): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    // Adapt resolution to container size & devicePixelRatio
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const elapsed = now - this.animStartTime;
    let allCellsFinished = true;

    // Detect theme for mosaic cell cover color (white in light mode, dark surface in dark mode)
    const isDarkMode = typeof document !== 'undefined' &&
      (document.documentElement.getAttribute('data-theme') === 'dark' ||
       document.documentElement.classList.contains('dark') ||
       document.body.classList.contains('dark-theme') ||
       document.body.classList.contains('dark'));
    const cellColor = isDarkMode ? '#111A2E' : '#FFFFFF';

    const cellW = width / ASSEMBLE_GRID_SIZE;
    const cellH = height / ASSEMBLE_GRID_SIZE;

    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i];
      const cellElapsed = elapsed - cell.delayMs;

      if (cellElapsed <= 0) {
        cell.opacity = 1.0;
        allCellsFinished = false;
      } else if (cellElapsed >= CELL_FADE_MS) {
        cell.opacity = 0.0;
      } else {
        const progress = cellElapsed / CELL_FADE_MS;
        const eased = evaluateCubicBezier(progress);
        cell.opacity = Math.max(0, 1.0 - eased);
        allCellsFinished = false;
      }

      if (cell.opacity > 0.01) {
        ctx.globalAlpha = cell.opacity;
        ctx.fillStyle = cellColor;
        ctx.fillRect(
          Math.floor(cell.col * cellW),
          Math.floor(cell.row * cellH),
          Math.ceil(cellW) + 0.5,
          Math.ceil(cellH) + 0.5
        );
      }
    }

    ctx.restore();

    if (allCellsFinished) {
      // Phase B uncovered completely; clear canvas and stop rAF to conserve CPU/GPU
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.rafId = null;
    } else {
      this.rafId = requestAnimationFrame(this.renderLoop.bind(this));
    }
  }

  cancelAnimation(): void {
    this.isPending.set(false);
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.animTimeoutId !== null) {
      clearTimeout(this.animTimeoutId);
      this.animTimeoutId = null;
    }
    this.isAnimating.set(false);

    const canvas = this.canvasRef()?.nativeElement;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }
}

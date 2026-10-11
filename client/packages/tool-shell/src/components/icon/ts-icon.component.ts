// packages/tool-shell/src/components/icon/ts-icon.component.ts
import {
  Component,
  input,
  computed,
  signal,
  ElementRef,
  inject,
  OnInit,
  OnDestroy,
  NgZone,
  PLATFORM_ID,
  CUSTOM_ELEMENTS_SCHEMA,
  ViewChild
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { LucideDynamicIcon, LucideFile } from '@lucide/angular';
import { TS_ICON_MAP, IconDefinition, LUCIDE_MOTION_MAP } from './ts-icon-map';

let lordiconInitialized = false;

/**
 * Lazy loads and defines the <lord-icon> custom element with lottie-web.
 * Bundle isolation guarantee: Only executed in browser if Lordicon JSON is actually used.
 */
async function initLordiconCustomElement(): Promise<void> {
  if (lordiconInitialized || typeof window === 'undefined') return;
  try {
    const [{ defineElement }, lottie] = await Promise.all([
      import('@lordicon/element'),
      import('lottie-web')
    ]);
    defineElement();
    lordiconInitialized = true;
  } catch (err) {
    console.error('[ts-icon] Failed to initialize Lordicon player:', err);
  }
}

// Dev-only tracked fallbacks
const loggedFallbacks = new Set<string>();

@Component({
  selector: 'ts-icon',
  standalone: true,
  imports: [CommonModule, LucideDynamicIcon],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <span
      #wrapper
      class="ts-icon-wrapper"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [attr.aria-hidden]="true"
      [class.tone-muted]="tone() === 'muted'"
      [class.tone-accent]="tone() === 'accent'"
      [class.tone-inherit]="tone() === 'inherit'"
      (pointerenter)="onPointerEnter()"
      (pointerleave)="onPointerLeave()"
      (pointerdown)="onPointerDown()"
    >
      @if (activeMode() === 'lordicon' && resolvedLordiconData()) {
        <lord-icon
          #lordIconRef
          [icon]="resolvedLordiconData()"
          [attr.trigger]="isReducedMotion() ? 'none' : (animateOn() === 'none' ? 'none' : animateOn())"
          [attr.target]="targetSelector()"
          [attr.colors]="lordiconColors()"
          [attr.stroke]="iconStroke()"
          [style.width.px]="size()"
          [style.height.px]="size()"
          class="ts-lord-icon"
        ></lord-icon>
      } @else if (activeMode() === 'animated' && animatedComponent()) {
        <ng-container *ngComponentOutlet="animatedComponent(); inputs: animatedInputs()" />
      } @else if (lucideComponent()) {
        <svg
          [lucideIcon]="lucideComponent()"
          [style.width.px]="size()"
          [style.height.px]="size()"
          [attr.stroke-width]="1.75"
          class="ts-icon-svg"
          [ngClass]="lucideMotionClass()"
        ></svg>
      }
    </span>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      line-height: 0;
      vertical-align: middle;
    }

    .ts-icon-wrapper {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      position: relative;
      box-sizing: border-box;
    }

    .tone-muted {
      color: var(--icon-muted, #71717A);
    }

    .tone-accent {
      color: var(--accent);
    }

    .tone-inherit {
      color: inherit;
    }

    .ts-icon-svg {
      display: block;
      color: currentColor;
      transition: transform 220ms var(--ts-ease, cubic-bezier(0.22, 1, 0.36, 1)),
                  color var(--ts-dur-fast, 150ms) var(--ts-ease, ease);
    }

    /* Lucide Fallback CSS Motions (transform only, 220ms once, pointer devices only) */
    @media (hover: hover) and (pointer: fine) {
      :host(:hover) .ts-icon-svg.motion-translate-up-right,
      :host-context(a:hover) .ts-icon-svg.motion-translate-up-right,
      :host-context(button:hover) .ts-icon-svg.motion-translate-up-right {
        transform: translate(2px, -2px);
      }

      :host(:hover) .ts-icon-svg.motion-translate-down,
      :host-context(a:hover) .ts-icon-svg.motion-translate-down,
      :host-context(button:hover) .ts-icon-svg.motion-translate-down {
        transform: translateY(2px);
      }

      :host(:hover) .ts-icon-svg.motion-rotate-neg20,
      :host-context(a:hover) .ts-icon-svg.motion-rotate-neg20,
      :host-context(button:hover) .ts-icon-svg.motion-rotate-neg20 {
        transform: rotate(-20deg);
      }

      :host(:hover) .ts-icon-svg.motion-rotate-45,
      :host-context(a:hover) .ts-icon-svg.motion-rotate-45,
      :host-context(button:hover) .ts-icon-svg.motion-rotate-45 {
        transform: rotate(45deg);
      }

      :host(:hover) .ts-icon-svg.motion-scale-up,
      :host-context(a:hover) .ts-icon-svg.motion-scale-up,
      :host-context(button:hover) .ts-icon-svg.motion-scale-up {
        transform: scale(1.06);
      }

      :host(:hover) .ts-icon-svg.motion-star-pop,
      :host-context(a:hover) .ts-icon-svg.motion-star-pop,
      :host-context(button:hover) .ts-icon-svg.motion-star-pop {
        transform: scale(1.12) rotate(8deg);
      }

      :host(:hover) .ts-icon-svg.motion-translate-right,
      :host-context(a:hover) .ts-icon-svg.motion-translate-right,
      :host-context(button:hover) .ts-icon-svg.motion-translate-right {
        transform: translateX(2px);
      }

      :host(:hover) .ts-icon-svg.motion-rotate-15,
      :host-context(a:hover) .ts-icon-svg.motion-rotate-15,
      :host-context(button:hover) .ts-icon-svg.motion-rotate-15 {
        transform: rotate(15deg);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .ts-icon-svg {
        transform: none !important;
        transition: none !important;
      }
    }

    .ts-lord-icon {
      display: block;
      width: 100%;
      height: 100%;
    }

    /* Fixed bounding box to avoid CLS */
    ::ng-deep .ts-icon-wrapper > * {
      width: 100% !important;
      height: 100% !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
  `]
})
export class TsIconComponent implements OnInit, OnDestroy {
  readonly name = input.required<string>();
  readonly size = input<number>(16);
  readonly tone = input<'muted' | 'accent' | 'inherit'>('inherit');
  readonly animateOn = input<'hover' | 'click' | 'none'>('hover');

  @ViewChild('wrapper', { static: true }) wrapperRef!: ElementRef<HTMLElement>;
  @ViewChild('lordIconRef') lordIconRef?: ElementRef<HTMLElement>;

  private readonly el = inject(ElementRef);
  private readonly ngZone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);

  private rootObserver?: MutationObserver;
  private isIntersecting = signal<boolean>(false);
  private intersectionObserver?: IntersectionObserver;

  readonly isHovered = signal<boolean>(false);

  // Resolved dynamic theme colors for Lordicon:
  // Rest: primary = --icon-muted, secondary = --icon-muted lighter / soft
  // Hover / Active: primary = --accent-strong, secondary = --accent
  private restPrimaryHex = signal<string>('#A1A1AA');
  private restSecondaryHex = signal<string>('#71717A');
  private activePrimaryHex = signal<string>('#2DD4BF');
  private activeSecondaryHex = signal<string>('#0F766E');

  readonly iconStroke = signal<string>('45');
  readonly isReducedMotion = signal<boolean>(false);
  readonly isAnimating = signal<boolean>(false);

  // Target query to play icon when parent button/link/tab/row is hovered
  readonly targetSelector = computed(() => {
    return 'a, button, [role=tab], .ts-row, .ts-tool-item, .pill-btn, .top-action-btn, .hub-tool-row-link';
  });

  readonly def = computed<IconDefinition>(() => {
    const raw = (this.name() || '').toLowerCase().trim();
    const entry = TS_ICON_MAP[raw];
    if (!entry) {
      if (typeof ngDevMode === 'undefined' || ngDevMode) {
        if (!loggedFallbacks.has(raw)) {
          console.warn(`[ts-icon] Semantic key "${raw}" not found in TS_ICON_MAP. Falling back to LucideFile.`);
          loggedFallbacks.add(raw);
        }
      }
      return { lucide: LucideFile };
    }
    return entry;
  });

  /**
   * Determine icon presentation mode based on priority:
   * 1. Lordicon (only if size >= 20px, lordicon json exists, and not reduced-motion)
   * 2. ng-animated-icons (if component exists)
   * 3. Lucide static fallback
   */
  readonly activeMode = computed<'lordicon' | 'animated' | 'lucide'>(() => {
    const d = this.def();
    const s = this.size();
    const raw = (this.name() || '').toLowerCase().trim();

    // 16px slots (inside buttons, chips, badges) strictly use static Lucide fallback with hover color change
    if (s < 20) {
      return 'lucide';
    }

    if (d.lordicon) {
      return 'lordicon';
    }

    if (d.animated) {
      return 'animated';
    }

    if (typeof ngDevMode === 'undefined' || ngDevMode) {
      if (!loggedFallbacks.has(raw)) {
        console.warn(`[ts-icon] Semantic key "${raw}" fell back to Lucide.`);
        loggedFallbacks.add(raw);
      }
    }

    return 'lucide';
  });

  readonly resolvedLordiconData = computed(() => {
    return this.def().lordicon || null;
  });

  readonly resolvedLordiconSrc = computed(() => {
    return this.def().lordicon || null;
  });

  readonly animatedComponent = computed(() => {
    return this.def().animated || null;
  });

  readonly animatedInputs = computed(() => {
    const strokeWidth = 1.75;
    return {
      size: this.size(),
      strokeWidth,
      animate: this.isReducedMotion() ? false : (this.isHovered() || this.isAnimating())
    };
  });

  readonly lucideMotionClass = computed(() => {
    const raw = (this.name() || '').toLowerCase().trim();
    return LUCIDE_MOTION_MAP[raw] || '';
  });

  readonly lucideComponent = computed(() => {
    return this.def().lucide || LucideFile;
  });

  readonly lordiconColors = computed(() => {
    if (this.isHovered() || this.isAnimating()) {
      return `primary:${this.activePrimaryHex()},secondary:${this.activeSecondaryHex()}`;
    }
    return `primary:${this.restPrimaryHex()},secondary:${this.restSecondaryHex()}`;
  });

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Check prefers-reduced-motion
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.isReducedMotion.set(mql.matches);
    mql.addEventListener('change', (e) => this.isReducedMotion.set(e.matches));

    // IntersectionObserver to lazy-initialize players only when visible
    this.ngZone.runOutsideAngular(() => {
      this.intersectionObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.isIntersecting.set(true);
            if (this.activeMode() === 'lordicon') {
              initLordiconCustomElement();
            }
            this.intersectionObserver?.disconnect();
            break;
          }
        }
      }, { threshold: 0.05 });

      this.intersectionObserver.observe(this.el.nativeElement);

      // Resolve theme colors
      this.resolveThemeColors();
      this.observeRootThemeChanges();

      // Listen to parent button/link/tab hover to drive ng-animated-icons
      this.attachParentHoverListeners();
    });
  }

  private parentTargetEl: HTMLElement | null = null;
  private parentEnterFn = () => this.ngZone.run(() => this.onPointerEnter());
  private parentLeaveFn = () => this.ngZone.run(() => this.onPointerLeave());

  private attachParentHoverListeners(): void {
    const parent = this.el.nativeElement.closest('a, button, [role=tab], .ts-row, .ts-tool-item, .pill-btn, .top-action-btn, .hub-tool-row-link') as HTMLElement;
    if (parent && parent !== this.el.nativeElement) {
      this.parentTargetEl = parent;
      parent.addEventListener('mouseenter', this.parentEnterFn);
      parent.addEventListener('mouseleave', this.parentLeaveFn);
    }
  }

  ngOnDestroy(): void {
    if (this.parentTargetEl) {
      this.parentTargetEl.removeEventListener('mouseenter', this.parentEnterFn);
      this.parentTargetEl.removeEventListener('mouseleave', this.parentLeaveFn);
      this.parentTargetEl = null;
    }
    this.intersectionObserver?.disconnect();
    this.rootObserver?.disconnect();
  }

  onPointerEnter(): void {
    this.isHovered.set(true);
    if (this.animateOn() === 'hover' && !this.isReducedMotion()) {
      this.triggerAnimationOnce();
    }
  }

  onPointerLeave(): void {
    this.isHovered.set(false);
    // Stops cleanly when pointer leaves
    if (this.lordIconRef?.nativeElement) {
      try {
        const lordEl = this.lordIconRef.nativeElement as any;
        if (typeof lordEl.stop === 'function') {
          lordEl.stop();
        }
      } catch {}
    }
    this.isAnimating.set(false);
  }

  onPointerDown(): void {
    if (this.animateOn() === 'click' || (typeof window !== 'undefined' && 'ontouchstart' in window)) {
      if (!this.isReducedMotion()) {
        this.triggerAnimationOnce();
      }
    }
  }

  private triggerAnimationOnce(): void {
    if (this.isAnimating()) return;
    this.isAnimating.set(true);
    setTimeout(() => {
      this.isAnimating.set(false);
    }, 600);
  }

  /**
   * Reads the nearest root styles to resolve hex codes for Lordicon.
   */
  private resolveThemeColors(): void {
    try {
      const rootEl = this.el.nativeElement.closest('.ts-root, [data-accent], [data-theme], html') || document.documentElement;
      const computed = window.getComputedStyle(rootEl);

      const muted = computed.getPropertyValue('--icon-muted').trim() || '#A1A1AA';
      const accent = computed.getPropertyValue('--accent').trim() || '#2DD4BF';
      const accentStrong = computed.getPropertyValue('--accent-strong').trim() || '#5EEAD4';
      const stroke = computed.getPropertyValue('--ts-icon-stroke').trim() || '45';

      this.restPrimaryHex.set(this.normalizeColorToHex(muted, '#A1A1AA'));
      this.restSecondaryHex.set(this.normalizeColorToHex(muted, '#71717A'));
      this.activePrimaryHex.set(this.normalizeColorToHex(accentStrong, '#5EEAD4'));
      this.activeSecondaryHex.set(this.normalizeColorToHex(accent, '#2DD4BF'));
      this.iconStroke.set(stroke);
    } catch {
      // Fallback defaults
    }
  }

  private observeRootThemeChanges(): void {
    const rootEl = this.el.nativeElement.closest('.ts-root, [data-accent], [data-theme], html') || document.documentElement;
    this.rootObserver = new MutationObserver(() => {
      this.ngZone.run(() => this.resolveThemeColors());
    });
    this.rootObserver.observe(rootEl, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-accent', 'class']
    });
  }

  private normalizeColorToHex(val: string, fallback: string): string {
    if (!val) return fallback;
    if (val.startsWith('#')) return val;
    // Canvas helper to convert rgb/hsl to hex
    try {
      const ctx = document.createElement('canvas').getContext('2d');
      if (!ctx) return fallback;
      ctx.fillStyle = val;
      return ctx.fillStyle;
    } catch {
      return fallback;
    }
  }
}

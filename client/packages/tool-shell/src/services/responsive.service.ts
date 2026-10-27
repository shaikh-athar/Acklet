// packages/tool-shell/src/services/responsive.service.ts
import { Injectable, signal, computed, OnDestroy } from '@angular/core';
import {
  DeviceClass,
  InputMode,
  DeviceOrientation,
  SafeAreaInsets
} from '../models/tool-responsive.models';

@Injectable({
  providedIn: 'root'
})
export class ResponsiveService implements OnDestroy {
  // Core reactive signals
  readonly deviceClass = signal<DeviceClass>('desktop');
  readonly inputMode = signal<InputMode>('mouse');
  readonly orientation = signal<DeviceOrientation>('portrait');
  readonly keyboardOpen = signal<boolean>(false);
  readonly viewportHeight = signal<number>(800);
  readonly viewportWidth = signal<number>(1280);
  readonly safeAreaInsets = signal<SafeAreaInsets>({ top: 0, right: 0, bottom: 0, left: 0 });
  readonly prefersReducedMotion = signal<boolean>(false);

  // Convenience computed signals
  readonly isPhone = computed(() => this.deviceClass() === 'phone');
  readonly isTablet = computed(() =>
    this.deviceClass() === 'tablet-portrait' || this.deviceClass() === 'tablet-landscape'
  );
  readonly isTabletPortrait = computed(() => this.deviceClass() === 'tablet-portrait');
  readonly isTabletLandscape = computed(() => this.deviceClass() === 'tablet-landscape');
  readonly isDesktop = computed(() => this.deviceClass() === 'desktop');
  readonly isTouch = computed(() => this.inputMode() === 'touch' || this.inputMode() === 'hybrid');
  readonly isMouse = computed(() => this.inputMode() === 'mouse' || this.inputMode() === 'hybrid');
  readonly isHybrid = computed(() => this.inputMode() === 'hybrid');

  /** True if phone is rotated landscape with limited vertical height */
  readonly isShortViewport = computed(() => {
    return this.viewportHeight() <= 500 && (this.isPhone() || this.viewportWidth() <= 960);
  });

  /** True if on mobile phone or reduced motion requested, suggesting reducing expensive blur/particle effects */
  readonly shouldReduceEffects = computed(() => this.isPhone() || this.prefersReducedMotion());

  private cleanupFns: Array<() => void> = [];

  constructor() {
    this.initialize();
  }

  ngOnDestroy(): void {
    for (const cleanup of this.cleanupFns) {
      cleanup();
    }
    this.cleanupFns = [];
  }

  private initialize(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // 1. Initial evaluation
    this.evaluateDimensions();
    this.evaluateInputMode();
    this.evaluateOrientation();
    this.evaluateReducedMotion();
    this.evaluateSafeAreaInsets();
    this.evaluateVisualViewport();

    // 2. Window Resize listener
    const onResize = () => {
      this.evaluateDimensions();
      this.evaluateOrientation();
      this.evaluateSafeAreaInsets();
    };
    window.addEventListener('resize', onResize, { passive: true });
    this.cleanupFns.push(() => window.removeEventListener('resize', onResize));

    // 3. Visual Viewport Listener (Keyboard detection)
    if (window.visualViewport) {
      const onVisualViewportChange = () => {
        this.evaluateVisualViewport();
      };
      window.visualViewport.addEventListener('resize', onVisualViewportChange, { passive: true });
      window.visualViewport.addEventListener('scroll', onVisualViewportChange, { passive: true });
      this.cleanupFns.push(() => {
        window.visualViewport?.removeEventListener('resize', onVisualViewportChange);
        window.visualViewport?.removeEventListener('scroll', onVisualViewportChange);
      });
    }

    // 4. Capability Media Queries (Hover & Pointer)
    this.watchMediaQuery('(hover: hover) and (pointer: fine)', () => this.evaluateInputMode());
    this.watchMediaQuery('(hover: none) and (pointer: coarse)', () => this.evaluateInputMode());
    this.watchMediaQuery('(any-pointer: coarse)', () => this.evaluateInputMode());
    this.watchMediaQuery('(any-pointer: fine)', () => this.evaluateInputMode());

    // 5. Orientation Media Query
    this.watchMediaQuery('(orientation: portrait)', () => this.evaluateOrientation());

    // 6. Reduced Motion Media Query
    this.watchMediaQuery('(prefers-reduced-motion: reduce)', (matches) => {
      this.prefersReducedMotion.set(matches);
    });
  }

  private evaluateDimensions(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.viewportWidth.set(width);
    this.viewportHeight.set(height);

    if (width <= 640) {
      this.deviceClass.set('phone');
    } else if (width <= 1023) {
      this.deviceClass.set('tablet-portrait');
    } else if (width <= 1279) {
      this.deviceClass.set('tablet-landscape');
    } else {
      this.deviceClass.set('desktop');
    }
  }

  private evaluateInputMode(): void {
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const hasAnyCoarse = window.matchMedia('(any-pointer: coarse)').matches;
    const hasAnyFine = window.matchMedia('(any-pointer: fine)').matches;
    const canHover = window.matchMedia('(hover: hover)').matches;

    // Hybrid device: has both fine and coarse pointers (e.g. iPad Pro with Magic Keyboard / touch laptop)
    if ((hasAnyFine && hasAnyCoarse) || (canHover && hasCoarsePointer) || (hasFinePointer && hasAnyCoarse)) {
      this.inputMode.set('hybrid');
    } else if (hasCoarsePointer || !canHover) {
      this.inputMode.set('touch');
    } else {
      this.inputMode.set('mouse');
    }
  }

  private evaluateOrientation(): void {
    const isPortrait = window.matchMedia('(orientation: portrait)').matches;
    this.orientation.set(isPortrait ? 'portrait' : 'landscape');
  }

  private evaluateVisualViewport(): void {
    if (!window.visualViewport) return;

    const vvHeight = window.visualViewport.height;
    const winHeight = window.innerHeight;
    this.viewportHeight.set(vvHeight);

    // If visual viewport height is substantially smaller than window height (> 22% reduction), virtual keyboard is open
    const isKeyboard = this.isTouch() && vvHeight < winHeight * 0.78;
    this.keyboardOpen.set(isKeyboard);
  }

  private evaluateReducedMotion(): void {
    this.prefersReducedMotion.set(
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  private evaluateSafeAreaInsets(): void {
    if (typeof document === 'undefined') return;

    // Safe area probe element to read real CSS environment variables
    const probe = document.createElement('div');
    probe.style.cssText =
      'position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;' +
      'padding-top:env(safe-area-inset-top, 0px);' +
      'padding-right:env(safe-area-inset-right, 0px);' +
      'padding-bottom:env(safe-area-inset-bottom, 0px);' +
      'padding-left:env(safe-area-inset-left, 0px);';

    document.body.appendChild(probe);
    const computedStyle = window.getComputedStyle(probe);
    const top = parseFloat(computedStyle.paddingTop) || 0;
    const right = parseFloat(computedStyle.paddingRight) || 0;
    const bottom = parseFloat(computedStyle.paddingBottom) || 0;
    const left = parseFloat(computedStyle.paddingLeft) || 0;
    document.body.removeChild(probe);

    this.safeAreaInsets.set({ top, right, bottom, left });
  }

  private watchMediaQuery(query: string, callback: (matches: boolean) => void): void {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent | MediaQueryList) => callback(e.matches);

    if (mql.addEventListener) {
      mql.addEventListener('change', handler);
      this.cleanupFns.push(() => mql.removeEventListener('change', handler));
    } else if ((mql as any).addListener) {
      (mql as any).addListener(handler);
      this.cleanupFns.push(() => (mql as any).removeListener(handler));
    }
  }
}

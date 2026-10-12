// packages/tool-shell/src/directives/ts-reveal.directive.ts
import {
  Directive,
  ElementRef,
  inject,
  input,
  AfterViewInit,
  OnDestroy,
  numberAttribute,
  PLATFORM_ID,
  ChangeDetectorRef,
  NgZone
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * TsRevealDirective (Smooth slide-fade-up on scroll)
 *
 * Usage: <div tsReveal [revealIndex]="0">
 *
 * - Elements initially visible above the fold appear immediately without flash.
 * - Elements below the fold are armed with `ts-reveal-hidden` (opacity 0, translateY 24px).
 * - When scrolled into view within the tool's scroll container, triggers smooth CSS transition
 *   with progressive stagger delay.
 * - Fully accessible: honours prefers-reduced-motion and print media.
 */
@Directive({
  selector: '[tsReveal], [appReveal]',
  standalone: true,
  host: {
    '[class.ts-reveal-item]': 'true',
    '[class.is-revealed]': 'isRevealed',
    '[class.ts-reveal-hidden]': '!isRevealed && containerReady'
  }
})
export class TsRevealDirective implements AfterViewInit, OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);

  private observer: IntersectionObserver | null = null;
  private pageshowHandler: ((e: Event) => void) | null = null;

  isRevealed = false;
  containerReady = false;

  readonly revealIndex = input<number, unknown>(0, { transform: numberAttribute });
  readonly revealThreshold = input<number, unknown>(0.05, { transform: numberAttribute });

  get staggerDelay(): string {
    const idx = Math.min(Math.max(0, this.revealIndex()), 5);
    return `${idx * 65}ms`;
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.reveal();
      return;
    }

    // Reduced motion check: show immediately
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      this.reveal();
      return;
    }

    const scrollRoot = this.findScrollRoot();
    const el = this.el.nativeElement;

    // Check if element is currently visible within the scroll container viewport
    const rect = el.getBoundingClientRect();
    const rootBottom = scrollRoot ? scrollRoot.getBoundingClientRect().bottom : window.innerHeight;
    const isInitiallyVisible = rect.top < rootBottom && rect.bottom > 0;

    if (isInitiallyVisible) {
      this.reveal();
      return;
    }

    // Element is below the fold: arm for scroll reveal
    this.containerReady = true;
    el.classList.add('ts-reveal-hidden');
    el.style.transitionDelay = this.staggerDelay;
    this.cdr.markForCheck();

    this.observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.zone.run(() => {
              this.reveal();
            });
            break;
          }
        }
      },
      {
        root: scrollRoot,
        threshold: this.revealThreshold(),
        rootMargin: '0px 0px -30px 0px'
      }
    );

    this.observer.observe(el);

    // Bfcache restoration
    this.pageshowHandler = (ev: Event) => {
      if ((ev as PageTransitionEvent).persisted) {
        this.zone.run(() => this.reveal());
      }
    };
    window.addEventListener('pageshow', this.pageshowHandler as EventListener);
  }

  private reveal(): void {
    const el = this.el.nativeElement;
    el.classList.add('is-revealed');
    el.classList.remove('ts-reveal-hidden');
    this.isRevealed = true;
    this.containerReady = false;
    this.observer?.disconnect();
    this.observer = null;
    this.cdr.markForCheck();
  }

  private findScrollRoot(): HTMLElement | null {
    let node = this.el.nativeElement.parentElement;
    while (node) {
      if (node.classList.contains('ts-main-scroll-container')) return node;
      node = node.parentElement;
    }
    return null;
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
    if (this.pageshowHandler) {
      window.removeEventListener('pageshow', this.pageshowHandler as EventListener);
      this.pageshowHandler = null;
    }
  }
}

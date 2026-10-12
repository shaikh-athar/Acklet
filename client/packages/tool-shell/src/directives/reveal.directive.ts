// packages/tool-shell/src/directives/reveal.directive.ts
import {
  Directive,
  ElementRef,
  inject,
  input,
  computed,
  OnInit,
  OnDestroy,
  numberAttribute,
  PLATFORM_ID,
  NgZone
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

let sharedObserver: IntersectionObserver | null = null;
const observerTargets = new Map<Element, RevealDirective>();

function getSharedObserver(zone: NgZone): IntersectionObserver | null {
  if (sharedObserver || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return sharedObserver;
  }

  zone.runOutsideAngular(() => {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const dir = observerTargets.get(entry.target);
            if (dir) {
              dir.reveal();
            }
          }
        }
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -4% 0px'
      }
    );
  });

  return sharedObserver;
}

/**
 * RevealDirective (Hardware-accelerated CSS scroll reveal with component-tailored variants)
 *
 * Supported Variants:
 * - 'up' (default): subtle vertical fade-up
 * - 'left' / 'slide-left': distinct horizontal glide from left (ideal for step cards)
 * - 'scale' / 'depth': depth and soft scale entrance (ideal for FAQ accordion boxes)
 * - 'pop' / 'chip': tactile micro-pop entrance (ideal for feature chips / badges)
 */
@Directive({
  selector: '[appReveal], [tsReveal]',
  standalone: true,
  host: {
    'class': 'reveal',
    '[class.reveal-up]': "activeVariant() === 'up'",
    '[class.reveal-left]': "activeVariant() === 'left' || activeVariant() === 'slide-left'",
    '[class.reveal-scale]': "activeVariant() === 'scale' || activeVariant() === 'depth'",
    '[class.reveal-pop]': "activeVariant() === 'pop' || activeVariant() === 'chip'",
    '[class.is-visible]': 'isRevealed'
  }
})
export class RevealDirective implements OnInit, OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly zone = inject(NgZone);

  isRevealed = false;

  readonly variant = input<'up' | 'left' | 'slide-left' | 'scale' | 'depth' | 'pop' | 'chip' | string>('up');
  readonly revealVariant = input<'up' | 'left' | 'slide-left' | 'scale' | 'depth' | 'pop' | 'chip' | string>('');
  readonly revealDelay = input<number, unknown>(0, { transform: numberAttribute });
  readonly revealIndex = input<number, unknown>(0, { transform: numberAttribute });

  readonly activeVariant = computed<string>(() => {
    const explicit = this.revealVariant();
    if (explicit) return explicit;
    const v = this.variant();
    // Ignore Spartan UI / Helm itemVariants or badgeVariants values that might clash
    if (['outline', 'ghost', 'default', 'secondary', 'destructive'].includes(v)) {
      return 'up';
    }
    return v || 'up';
  });

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.reveal();
      return;
    }

    // Prefers-reduced-motion check: show immediately without animation
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      this.reveal();
      return;
    }

    const host = this.el.nativeElement;
    const computedDelay = Number(this.revealDelay()) || (Number(this.revealIndex()) * 70) || 0;
    if (computedDelay > 0) {
      host.style.setProperty('--reveal-delay', `${computedDelay}ms`);
    }

    this.zone.runOutsideAngular(() => {
      const observer = getSharedObserver(this.zone);
      if (observer) {
        observerTargets.set(host, this);
        observer.observe(host);
      } else {
        this.reveal();
      }
    });
  }

  reveal(): void {
    if (this.isRevealed) return;
    this.isRevealed = true;
    const host = this.el.nativeElement;
    host.classList.add('is-visible');

    if (sharedObserver) {
      sharedObserver.unobserve(host);
    }
    observerTargets.delete(host);
  }

  ngOnDestroy(): void {
    const host = this.el.nativeElement;
    if (sharedObserver) {
      sharedObserver.unobserve(host);
    }
    observerTargets.delete(host);
  }
}

export { RevealDirective as TsRevealDirective };

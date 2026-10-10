// packages/tool-shell/src/directives/ts-reveal.directive.ts
import { Directive, ElementRef, inject, input, OnInit, OnDestroy, numberAttribute } from '@angular/core';

@Directive({
  selector: '[tsReveal], [appReveal]',
  standalone: true,
  host: {
    '[class.ts-reveal-item]': 'true',
    '[class.is-revealed]': 'isRevealed',
    '[style.animation-delay]': 'staggerDelay'
  }
})
export class TsRevealDirective implements OnInit, OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private observer: IntersectionObserver | null = null;
  isRevealed = false;

  readonly revealIndex = input<number, unknown>(0, { transform: numberAttribute });
  readonly revealThreshold = input<number, unknown>(0.15, { transform: numberAttribute });

  get staggerDelay(): string {
    const idx = Math.max(0, this.revealIndex());
    return `${idx * 80}ms`;
  }

  ngOnInit(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      this.isRevealed = true;
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.isRevealed = true;
      return;
    }

    this.observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.isRevealed = true;
            this.observer?.unobserve(this.el.nativeElement);
            this.observer?.disconnect();
            this.observer = null;
            break;
          }
        }
      },
      {
        threshold: this.revealThreshold()
      }
    );

    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

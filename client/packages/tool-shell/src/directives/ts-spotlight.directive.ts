// packages/tool-shell/src/directives/ts-spotlight.directive.ts
import { Directive, ElementRef, inject, input, NgZone, OnInit, OnDestroy, booleanAttribute, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[tsSpotlight], [appSpotlight]',
  standalone: true,
  host: {
    '[class.ts-spotlight-host]': 'true',
    '[class.is-disabled-spotlight]': 'disabled()'
  }
})
export class TsSpotlightDirective implements OnInit, OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly ngZone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);
  private rafId: number | null = null;
  private pendingX: number | null = null;
  private pendingY: number | null = null;
  private cleanupFns: Array<() => void> = [];

  readonly disabled = input<boolean, unknown>(false, { transform: booleanAttribute });

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.ngZone.runOutsideAngular(() => {
      const target = this.el.nativeElement;
      const onMove = (event: PointerEvent): void => {
        if (this.disabled()) return;
        if (typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches) return;

        const rect = target.getBoundingClientRect();
        this.pendingX = event.clientX - rect.left;
        this.pendingY = event.clientY - rect.top;

        if (this.rafId === null) {
          this.rafId = requestAnimationFrame(() => this.applySpotlight());
        }
      };

      const onLeave = (): void => {
        if (this.rafId !== null) {
          cancelAnimationFrame(this.rafId);
          this.rafId = null;
        }
        target.style.removeProperty('--mx');
        target.style.removeProperty('--my');
        target.style.removeProperty('--spotlight-active');
      };

      target.addEventListener('pointermove', onMove, { passive: true });
      target.addEventListener('pointerleave', onLeave, { passive: true });

      this.cleanupFns.push(
        () => target.removeEventListener('pointermove', onMove),
        () => target.removeEventListener('pointerleave', onLeave)
      );
    });
  }

  private applySpotlight(): void {
    this.rafId = null;
    if (this.pendingX !== null && this.pendingY !== null) {
      const target = this.el.nativeElement;
      target.style.setProperty('--mx', `${this.pendingX}px`);
      target.style.setProperty('--my', `${this.pendingY}px`);
      target.style.setProperty('--spotlight-active', '1');
    }
  }

  ngOnDestroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    for (const fn of this.cleanupFns) {
      fn();
    }
    this.cleanupFns = [];
  }
}

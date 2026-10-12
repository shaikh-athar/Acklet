// packages/tool-shell/src/components/primitive/ts-spotlight.directive.ts
import { Directive, ElementRef, inject, NgZone, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[tsSpotlight]',
  standalone: true
})
export class TsSpotlightDirective implements OnInit, OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly ngZone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);
  private rafId: number | null = null;
  private latestEvent: MouseEvent | null = null;
  private cleanupFns: Array<() => void> = [];

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.ngZone.runOutsideAngular(() => {
      const target = this.el.nativeElement;
      const onMouseMove = (event: MouseEvent): void => {
        this.latestEvent = event;
        if (this.rafId === null) {
          this.rafId = requestAnimationFrame(() => this.updateSpotlight());
        }
      };

      const onMouseLeave = (): void => {
        if (this.rafId !== null) {
          cancelAnimationFrame(this.rafId);
          this.rafId = null;
        }
        this.latestEvent = null;
        target.style.removeProperty('--mx');
        target.style.removeProperty('--my');
      };

      target.addEventListener('mousemove', onMouseMove, { passive: true });
      target.addEventListener('mouseleave', onMouseLeave, { passive: true });

      this.cleanupFns.push(
        () => target.removeEventListener('mousemove', onMouseMove),
        () => target.removeEventListener('mouseleave', onMouseLeave)
      );
    });
  }

  private updateSpotlight(): void {
    this.rafId = null;
    if (!this.latestEvent) return;

    const rect = this.el.nativeElement.getBoundingClientRect();
    const x = this.latestEvent.clientX - rect.left;
    const y = this.latestEvent.clientY - rect.top;

    this.el.nativeElement.style.setProperty('--mx', `${Math.round(x)}px`);
    this.el.nativeElement.style.setProperty('--my', `${Math.round(y)}px`);
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

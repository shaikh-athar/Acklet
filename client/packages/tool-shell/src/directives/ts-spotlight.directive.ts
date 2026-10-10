// packages/tool-shell/src/directives/ts-spotlight.directive.ts
import { Directive, ElementRef, HostListener, inject, input, NgZone, OnDestroy, booleanAttribute } from '@angular/core';

@Directive({
  selector: '[tsSpotlight], [appSpotlight]',
  standalone: true,
  host: {
    '[class.ts-spotlight-host]': 'true',
    '[class.is-disabled-spotlight]': 'disabled()'
  }
})
export class TsSpotlightDirective implements OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly ngZone = inject(NgZone);
  private rafId: number | null = null;
  private pendingX: number | null = null;
  private pendingY: number | null = null;

  readonly disabled = input<boolean, unknown>(false, { transform: booleanAttribute });

  @HostListener('pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    if (this.disabled()) return;
    if (typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches) return;

    const rect = this.el.nativeElement.getBoundingClientRect();
    this.pendingX = event.clientX - rect.left;
    this.pendingY = event.clientY - rect.top;

    if (this.rafId === null) {
      this.ngZone.runOutsideAngular(() => {
        this.rafId = requestAnimationFrame(() => this.applySpotlight());
      });
    }
  }

  @HostListener('pointerleave')
  onPointerLeave(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    const target = this.el.nativeElement;
    target.style.removeProperty('--mx');
    target.style.removeProperty('--my');
    target.style.removeProperty('--spotlight-active');
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
  }
}

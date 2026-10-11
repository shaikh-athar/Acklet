// packages/tool-shell/src/components/primitive/ts-spotlight.directive.ts
import { Directive, ElementRef, HostListener, inject, OnDestroy } from '@angular/core';

@Directive({
  selector: '[tsSpotlight]',
  standalone: true
})
export class TsSpotlightDirective implements OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private rafId: number | null = null;
  private latestEvent: MouseEvent | null = null;

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    this.latestEvent = event;
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => this.updateSpotlight());
    }
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.latestEvent = null;
    const native = this.el.nativeElement;
    native.style.removeProperty('--mx');
    native.style.removeProperty('--my');
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
  }
}

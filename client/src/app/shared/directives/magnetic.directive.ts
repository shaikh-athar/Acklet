// client/src/app/shared/directives/magnetic.directive.ts
import { Directive, ElementRef, HostListener, Input } from '@angular/core';
import { gsap } from 'gsap';

@Directive({
  selector: '[appMagnetic]',
  standalone: true,
})
export class MagneticDirective {
  @Input() appMagnetic: number | string = 0.35; // Strength multiplier

  constructor(private el: ElementRef<HTMLElement>) {}

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    const rect = this.el.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;

    const strength = typeof this.appMagnetic === 'string' ? parseFloat(this.appMagnetic) : this.appMagnetic;

    gsap.to(this.el.nativeElement, {
      x: x * strength,
      y: y * strength,
      duration: 0.3,
      ease: 'power2.out',
    });
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    gsap.to(this.el.nativeElement, {
      x: 0,
      y: 0,
      duration: 0.5,
      ease: 'elastic.out(1, 0.3)',
    });
  }
}

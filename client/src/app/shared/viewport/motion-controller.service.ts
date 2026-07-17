import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MotionControllerService {
  private prefersReducedMotion = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  }

  createSpotlight(
    element: HTMLElement,
    callback: (x: number, y: number) => void
  ) {
    if (this.prefersReducedMotion || typeof window === 'undefined') {
      return { attach: () => {}, detach: () => {} };
    }

    const onMouseMove = (event: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      callback(x, y);
    };

    return {
      attach: () => element.addEventListener('mousemove', onMouseMove, { passive: true }),
      detach: () => element.removeEventListener('mousemove', onMouseMove)
    };
  }

  createMagnet(
    element: HTMLElement,
    strength: number = 0.35
  ) {
    if (this.prefersReducedMotion || typeof window === 'undefined') {
      return { attach: () => {}, detach: () => {} };
    }

    const onMouseMove = (event: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const deltaX = event.clientX - centerX;
      const deltaY = event.clientY - centerY;
      
      const distance = Math.hypot(deltaX, deltaY);
      
      if (distance < 100) {
        element.style.transform = `translate3d(${deltaX * strength}px, ${deltaY * strength}px, 0)`;
      } else {
        element.style.transform = 'translate3d(0, 0, 0)';
      }
    };

    const onMouseLeave = () => {
      element.style.transform = 'translate3d(0, 0, 0)';
    };

    return {
      attach: () => {
        element.addEventListener('mousemove', onMouseMove, { passive: true });
        element.addEventListener('mouseleave', onMouseLeave, { passive: true });
      },
      detach: () => {
        element.removeEventListener('mousemove', onMouseMove);
        element.removeEventListener('mouseleave', onMouseLeave);
        element.style.transform = 'translate3d(0, 0, 0)';
      }
    };
  }
}

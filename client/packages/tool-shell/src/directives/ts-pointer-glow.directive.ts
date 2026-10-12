// packages/tool-shell/src/directives/ts-pointer-glow.directive.ts
import {
  Directive,
  ElementRef,
  inject,
  NgZone,
  OnInit,
  OnDestroy,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * TsPointerGlowDirective
 *
 * Applies on .ts-bg (the backdrop element).
 * Finds the first .ts-bg-spot-glow and .ts-bg-spot-grid inside the host
 * and moves them with a smooth trail following the mouse.
 *
 * Requirements:
 *  - Only runs on hover+fine-pointer devices.
 *  - prefers-reduced-motion: reduce → both elements stay hidden.
 *  - Uses NgZone.runOutsideAngular to never trigger CD.
 *  - will-change: transform is set on the two spot elements only.
 *  - Fades in on first move, fades out on mouseleave / window blur / visibilitychange hidden.
 *  - SSR safe.
 */
@Directive({
  selector: '[tsPointerGlow]',
  standalone: true
})
export class TsPointerGlowDirective implements OnInit, OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);

  private spotGlow: HTMLElement | null = null;
  private spotGrid: HTMLElement | null = null;

  private rafId: number | null = null;
  private targetX = 0;
  private targetY = 0;
  private currentX = 0;
  private currentY = 0;
  private running = false;
  private cellSize = 32;
  private spotSize = 320;

  // Cleanup registry
  private cleanupFns: Array<() => void> = [];

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Guard: hover+fine-pointer only
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    // Guard: reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    this.zone.runOutsideAngular(() => {
      const host = this.el.nativeElement;
      this.spotGlow = host.querySelector<HTMLElement>('.ts-bg-spot-glow');
      this.spotGrid = host.querySelector<HTMLElement>('.ts-bg-spot-grid');

      if (!this.spotGlow || !this.spotGrid) return;

      const measured = this.spotGrid.offsetWidth || this.spotGlow.offsetWidth;
      if (measured > 0) {
        this.spotSize = measured;
      }

      const onMove = (e: PointerEvent) => this.onPointerMove(e);
      const onLeave = () => this.fadeOut();
      const onBlur = () => this.fadeOut();
      const onVis = () => { if (document.hidden) this.fadeOut(); };

      document.addEventListener('pointermove', onMove, { passive: true });
      document.addEventListener('mouseleave', onLeave);
      window.addEventListener('blur', onBlur);
      document.addEventListener('visibilitychange', onVis);

      this.cleanupFns = [
        () => document.removeEventListener('pointermove', onMove),
        () => document.removeEventListener('mouseleave', onLeave),
        () => window.removeEventListener('blur', onBlur),
        () => document.removeEventListener('visibilitychange', onVis)
      ];
    });
  }

  private onPointerMove(e: PointerEvent): void {
    this.targetX = e.clientX;
    this.targetY = e.clientY;

    // Fade in on first move
    if (this.spotGlow && this.spotGlow.style.opacity !== '1') {
      this.spotGlow.style.opacity = '1';
    }
    if (this.spotGrid && this.spotGrid.style.opacity !== '1') {
      this.spotGrid.style.opacity = '1';
    }

    if (!this.running) {
      this.running = true;
      this.tick();
    }
  }

  private tick(): void {
    const dx = this.targetX - this.currentX;
    const dy = this.targetY - this.currentY;

    // Stop when close enough
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
      this.running = false;
      this.rafId = null;
      return;
    }

    // Smooth trail: current += (target - current) * 0.2
    this.currentX += dx * 0.2;
    this.currentY += dy * 0.2;

    const half = this.spotSize / 2;
    const tx = this.currentX - half;
    const ty = this.currentY - half;

    if (this.spotGlow) {
      this.spotGlow.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
    }
    if (this.spotGrid) {
      // Align grid lines to page grid: offset by element position mod cell size
      const gx = ((this.currentX % this.cellSize) + this.cellSize) % this.cellSize;
      const gy = ((this.currentY % this.cellSize) + this.cellSize) % this.cellSize;
      this.spotGrid.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      this.spotGrid.style.backgroundPosition = `${-gx}px ${-gy}px`;
    }

    this.rafId = requestAnimationFrame(() => this.tick());
  }

  private fadeOut(): void {
    if (this.spotGlow) this.spotGlow.style.opacity = '0';
    if (this.spotGrid) this.spotGrid.style.opacity = '0';
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  ngOnDestroy(): void {
    this.fadeOut();
    for (const fn of this.cleanupFns) fn();
    this.cleanupFns = [];
  }
}

// client/packages/tool-shell/src/directives/ts-double-tap.directive.ts
import {
  Directive,
  ElementRef,
  inject,
  input,
  output,
  OnInit,
  OnDestroy,
  NgZone,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HapticService } from '../services/haptic.service';

export interface DoubleTapCoords {
  x: number;
  y: number;
}

@Directive({
  selector: '[tsDoubleTap]',
  standalone: true
})
export class TsDoubleTapDirective implements OnInit, OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly ngZone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly haptics = inject(HapticService);

  readonly tapDelay = input<number>(300); // max ms between taps
  readonly moveThreshold = input<number>(20); // max px movement between taps
  readonly enableHaptic = input<boolean>(true);
  readonly disabled = input<boolean>(false);

  readonly doubleTap = output<DoubleTapCoords>();

  private lastTapTime = 0;
  private lastTapX = 0;
  private lastTapY = 0;
  private cleanupFns: Array<() => void> = [];

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.ngZone.runOutsideAngular(() => {
      const target = this.el.nativeElement;

      const getCoords = (e: any): { x: number; y: number } | null => {
        if (e.changedTouches && e.changedTouches.length > 0) {
          return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        }
        if (e.touches && e.touches.length > 0) {
          return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        if (typeof e.clientX === 'number' && !Number.isNaN(e.clientX)) {
          return { x: e.clientX, y: e.clientY };
        }
        return null;
      };

      const onEnd = (e: any): void => {
        if (this.disabled()) return;
        if (typeof e.button === 'number' && e.button !== 0) return;

        const coords = getCoords(e);
        if (!coords) return;

        const now = Date.now();
        const currentX = coords.x;
        const currentY = coords.y;
        const timeDiff = now - this.lastTapTime;
        const dist = Math.hypot(currentX - this.lastTapX, currentY - this.lastTapY);

        if (this.lastTapTime > 0 && timeDiff > 0 && timeDiff <= this.tapDelay() && dist <= this.moveThreshold()) {
          // Double tap detected!
          this.lastTapTime = 0;
          if (this.enableHaptic()) {
            this.haptics.trigger('light');
          }
          this.ngZone.run(() => {
            this.doubleTap.emit({ x: currentX, y: currentY });
          });
        } else {
          this.lastTapTime = now;
          this.lastTapX = currentX;
          this.lastTapY = currentY;
        }
      };

      target.addEventListener('touchend', onEnd, { passive: true });
      target.addEventListener('pointerup', onEnd, { passive: true });

      this.cleanupFns.push(
        () => target.removeEventListener('touchend', onEnd),
        () => target.removeEventListener('pointerup', onEnd)
      );
    });
  }

  ngOnDestroy(): void {
    this.cleanupFns.forEach(fn => fn());
    this.cleanupFns = [];
  }
}

// client/packages/tool-shell/src/directives/ts-long-press.directive.ts
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

export interface LongPressCoords {
  x: number;
  y: number;
}

@Directive({
  selector: '[tsLongPress]',
  standalone: true
})
export class TsLongPressDirective implements OnInit, OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly ngZone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly haptics = inject(HapticService);

  readonly duration = input<number>(500); // ms hold
  readonly moveThreshold = input<number>(12); // px maximum drift
  readonly enableHaptic = input<boolean>(true);
  readonly disabled = input<boolean>(false);

  readonly longPress = output<LongPressCoords>();

  private timer: any = null;
  private startX = 0;
  private startY = 0;
  private cleanupFns: Array<() => void> = [];

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.ngZone.runOutsideAngular(() => {
      const target = this.el.nativeElement;

      const getCoords = (e: any): { x: number; y: number } | null => {
        if (e.touches && e.touches.length > 0) {
          return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        if (typeof e.clientX === 'number' && !Number.isNaN(e.clientX)) {
          return { x: e.clientX, y: e.clientY };
        }
        return null;
      };

      const onStart = (e: any): void => {
        if (this.disabled()) return;
        // Ignore non-primary pointer/mouse clicks (only allow button 0 or touch where button is undefined)
        if (typeof e.button === 'number' && e.button !== 0) return;

        const coords = getCoords(e);
        if (!coords) return;

        this.startX = coords.x;
        this.startY = coords.y;
        this.startTimer(coords.x, coords.y);
      };

      const onMove = (e: any): void => {
        if (!this.timer) return;
        const coords = getCoords(e);
        if (!coords) return;

        const dist = Math.hypot(coords.x - this.startX, coords.y - this.startY);
        if (dist > this.moveThreshold()) {
          this.cancelTimer();
        }
      };

      const onEnd = (): void => {
        this.cancelTimer();
      };

      target.addEventListener('touchstart', onStart, { passive: true });
      target.addEventListener('touchmove', onMove, { passive: true });
      target.addEventListener('touchend', onEnd, { passive: true });
      target.addEventListener('touchcancel', onEnd, { passive: true });
      target.addEventListener('pointerdown', onStart, { passive: true });
      target.addEventListener('pointermove', onMove, { passive: true });
      target.addEventListener('pointerup', onEnd, { passive: true });
      target.addEventListener('pointercancel', onEnd, { passive: true });

      this.cleanupFns.push(
        () => target.removeEventListener('touchstart', onStart),
        () => target.removeEventListener('touchmove', onMove),
        () => target.removeEventListener('touchend', onEnd),
        () => target.removeEventListener('touchcancel', onEnd),
        () => target.removeEventListener('pointerdown', onStart),
        () => target.removeEventListener('pointermove', onMove),
        () => target.removeEventListener('pointerup', onEnd),
        () => target.removeEventListener('pointercancel', onEnd)
      );
    });
  }

  ngOnDestroy(): void {
    this.cancelTimer();
    this.cleanupFns.forEach(fn => fn());
    this.cleanupFns = [];
  }

  private startTimer(clientX: number, clientY: number): void {
    this.cancelTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.enableHaptic()) {
        this.haptics.trigger('medium');
      }
      this.ngZone.run(() => {
        this.longPress.emit({ x: clientX, y: clientY });
      });
    }, this.duration());
  }

  private cancelTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

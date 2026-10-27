// client/packages/tool-shell/src/services/drawer-gesture.service.ts
import { Injectable, signal } from '@angular/core';

export interface GesturePointerState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startTime: number;
  currentTime: number;
  isEdgeStart: boolean;
  isEligible: boolean;
}

export const DRAWER_WIDTH = 320;
export const EDGE_ZONE_MIN = 16; // Avoids iOS Safari system back swipe (0-15px)
export const EDGE_ZONE_MAX = 48; // Responsive 32px hit-target for edge drawer reveal
export const SNAP_OPEN_DISTANCE = 80; // Distance in px to trigger snap open
export const SNAP_CLOSE_DISTANCE = -45; // Distance in px to trigger snap close
export const SNAP_VELOCITY_THRESHOLD = 0.25; // px/ms

@Injectable({
  providedIn: 'root'
})
export class DrawerGestureService {
  readonly isDragging = signal<boolean>(false);
  readonly dragTranslateX = signal<number | null>(null);

  private state: GesturePointerState | null = null;
  private prefersReducedMotion = false;

  constructor() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      try {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.prefersReducedMotion = mq.matches;
        mq.addEventListener?.('change', (e) => {
          this.prefersReducedMotion = e.matches;
        });
      } catch (_) {}
    }
  }

  setPrefersReducedMotion(reduced: boolean): void {
    this.prefersReducedMotion = reduced;
  }

  isTargetExcluded(target: HTMLElement | null): boolean {
    if (!target) return false;
    const excluded = target.closest(
      'input, textarea, select, button, a, [role="button"], [role="slider"], [role="tab"], .slider, .custom-scrollbar, .horizontal-scroll, [data-no-swipe], .ts-nav-links-track'
    );
    return !!excluded;
  }

  isTargetExcludedForDismiss(target: HTMLElement | null): boolean {
    if (!target) return false;
    const excluded = target.closest(
      'input:not([type="button"]):not([type="submit"]):not([type="reset"]), textarea, select, [role="slider"], [type="range"], .slider, [data-no-swipe]'
    );
    return !!excluded;
  }

  isWithinEdgeZone(clientX: number): boolean {
    return clientX >= EDGE_ZONE_MIN && clientX <= EDGE_ZONE_MAX;
  }

  startSwipeRight(clientX: number, clientY: number, target: HTMLElement | null): boolean {
    if (this.isTargetExcluded(target)) return false;
    if (!this.isWithinEdgeZone(clientX)) return false;

    this.state = {
      startX: clientX,
      startY: clientY,
      currentX: clientX,
      currentY: clientY,
      startTime: Date.now(),
      currentTime: Date.now(),
      isEdgeStart: true,
      isEligible: true
    };
    this.isDragging.set(true);
    if (!this.prefersReducedMotion) {
      this.dragTranslateX.set(-DRAWER_WIDTH);
    }
    return true;
  }

  startSwipeLeft(clientX: number, clientY: number, target: HTMLElement | null): boolean {
    if (this.isTargetExcludedForDismiss(target)) return false;

    this.state = {
      startX: clientX,
      startY: clientY,
      currentX: clientX,
      currentY: clientY,
      startTime: Date.now(),
      currentTime: Date.now(),
      isEdgeStart: false,
      isEligible: true
    };
    this.isDragging.set(true);
    this.dragTranslateX.set(0);
    return true;
  }

  moveSwipe(clientX: number, clientY: number, isDrawerCurrentlyOpen: boolean): number | null {
    if (!this.state || !this.state.isEligible) return null;

    this.state.currentX = clientX;
    this.state.currentY = clientY;
    this.state.currentTime = Date.now();

    const deltaX = clientX - this.state.startX;
    const deltaY = clientY - this.state.startY;

    // Check if vertical scroll dominates
    if (Math.abs(deltaY) > Math.abs(deltaX) * 1.3 && Math.abs(deltaY) > 10) {
      this.cancelSwipe();
      return null;
    }

    if (!isDrawerCurrentlyOpen) {
      // Swiping right from edge to open
      if (deltaX > 0) {
        const offset = Math.min(0, -DRAWER_WIDTH + deltaX);
        if (!this.prefersReducedMotion) {
          this.dragTranslateX.set(offset);
        }
        return offset;
      }
    } else {
      // Swiping left to close
      if (deltaX < 0) {
        const offset = Math.max(-DRAWER_WIDTH, deltaX);
        if (!this.prefersReducedMotion) {
          this.dragTranslateX.set(offset);
        }
        return offset;
      }
    }

    return null;
  }

  endSwipe(isDrawerCurrentlyOpen: boolean): 'open' | 'close' | 'reset' {
    if (!this.state || !this.state.isEligible) {
      this.cancelSwipe();
      return 'reset';
    }

    const deltaX = this.state.currentX - this.state.startX;
    const duration = Math.max(1, this.state.currentTime - this.state.startTime);
    const velocityX = deltaX / duration;

    this.isDragging.set(false);
    this.dragTranslateX.set(null);
    this.state = null;

    if (!isDrawerCurrentlyOpen) {
      // Trying to open
      const crossedDistance = deltaX >= SNAP_OPEN_DISTANCE;
      const crossedVelocity = velocityX >= SNAP_VELOCITY_THRESHOLD && deltaX >= 30;
      if (crossedDistance || crossedVelocity) {
        return 'open';
      }
      return 'reset';
    } else {
      // Trying to close
      const crossedDistance = deltaX <= SNAP_CLOSE_DISTANCE;
      const crossedVelocity = velocityX <= -SNAP_VELOCITY_THRESHOLD && deltaX <= -25;
      if (crossedDistance || crossedVelocity) {
        return 'close';
      }
      return 'reset';
    }
  }

  cancelSwipe(): void {
    this.state = null;
    this.isDragging.set(false);
    this.dragTranslateX.set(null);
  }
}

// @vitest-environment jsdom
// client/packages/tool-shell/src/directives/ts-long-press.directive.spec.ts
import '@angular/compiler';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext, ElementRef, NgZone, PLATFORM_ID } from '@angular/core';
import { TsLongPressDirective } from './ts-long-press.directive';
import { HapticService } from '../services/haptic.service';

function createTouchEvent(type: string, touches: Array<{ clientX: number; clientY: number }>) {
  const event = new Event(type, { bubbles: true });
  Object.defineProperty(event, 'touches', { value: touches, configurable: true });
  Object.defineProperty(event, 'changedTouches', { value: touches, configurable: true });
  return event;
}

describe('TsLongPressDirective', () => {
  let element: HTMLElement;
  let directive: TsLongPressDirective;
  let mockHaptics: { trigger: any };

  beforeEach(() => {
    vi.useFakeTimers();
    element = document.createElement('div');
    document.body.appendChild(element);

    mockHaptics = {
      trigger: vi.fn()
    };

    const mockNgZone = {
      run: (fn: Function) => fn(),
      runOutsideAngular: (fn: Function) => fn()
    };

    const rootInjector = {
      get: (token: any, notFound?: any) => {
        if (token === ElementRef) return new ElementRef(element);
        if (token === NgZone) return mockNgZone;
        if (token === HapticService) return mockHaptics;
        if (token === PLATFORM_ID) return 'browser';
        return notFound;
      }
    } as any;

    const envInjector = createEnvironmentInjector([], rootInjector);

    runInInjectionContext(envInjector, () => {
      directive = new TsLongPressDirective();
    });

    directive.ngOnInit();
  });

  afterEach(() => {
    directive.ngOnDestroy();
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
    vi.useRealTimers();
  });

  it('emits longPress event and haptic feedback when held for duration', () => {
    let emitted = false;
    let coords: any = null;
    directive.longPress.subscribe(c => {
      emitted = true;
      coords = c;
    });

    element.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 150 }]));

    expect(emitted).toBe(false);

    // Fast forward 500ms
    vi.advanceTimersByTime(500);

    expect(emitted).toBe(true);
    expect(coords).toEqual({ x: 100, y: 150 });
    expect(mockHaptics.trigger).toHaveBeenCalledWith('medium');
  });

  it('cancels timer if finger moves beyond threshold', () => {
    let emitted = false;
    directive.longPress.subscribe(() => {
      emitted = true;
    });

    element.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));

    // Move by 35px (> 12px threshold)
    element.dispatchEvent(createTouchEvent('touchmove', [{ clientX: 100, clientY: 135 }]));

    vi.advanceTimersByTime(500);
    expect(emitted).toBe(false);
  });

  it('cancels timer if touch ends before duration', () => {
    let emitted = false;
    directive.longPress.subscribe(() => {
      emitted = true;
    });

    element.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));

    vi.advanceTimersByTime(200);

    element.dispatchEvent(createTouchEvent('touchend', []));

    vi.advanceTimersByTime(300);
    expect(emitted).toBe(false);
  });
});

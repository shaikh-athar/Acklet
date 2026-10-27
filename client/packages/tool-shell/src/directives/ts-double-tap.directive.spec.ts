// @vitest-environment jsdom
// client/packages/tool-shell/src/directives/ts-double-tap.directive.spec.ts
import '@angular/compiler';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext, ElementRef, NgZone, PLATFORM_ID } from '@angular/core';
import { TsDoubleTapDirective } from './ts-double-tap.directive';
import { HapticService } from '../services/haptic.service';

function createTouchEvent(type: string, touches: Array<{ clientX: number; clientY: number }>) {
  const event = new Event(type, { bubbles: true });
  Object.defineProperty(event, 'touches', { value: touches, configurable: true });
  Object.defineProperty(event, 'changedTouches', { value: touches, configurable: true });
  return event;
}

describe('TsDoubleTapDirective', () => {
  let element: HTMLElement;
  let directive: TsDoubleTapDirective;
  let mockHaptics: { trigger: any };

  beforeEach(() => {
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
      directive = new TsDoubleTapDirective();
    });

    directive.ngOnInit();
  });

  afterEach(() => {
    directive.ngOnDestroy();
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
    vi.restoreAllMocks();
  });

  it('detects two rapid taps as a double tap', () => {
    let doubleTapped = false;
    let coords: any = null;
    directive.doubleTap.subscribe(c => {
      doubleTapped = true;
      coords = c;
    });

    let fakeTime = 1000;
    vi.spyOn(Date, 'now').mockImplementation(() => fakeTime);

    // 1st tap
    element.dispatchEvent(createTouchEvent('touchend', [{ clientX: 50, clientY: 50 }]));
    expect(doubleTapped).toBe(false);

    // 2nd tap 120ms later
    fakeTime += 120;
    element.dispatchEvent(createTouchEvent('touchend', [{ clientX: 52, clientY: 52 }]));

    expect(doubleTapped).toBe(true);
    expect(coords).toEqual({ x: 52, y: 52 });
    expect(mockHaptics.trigger).toHaveBeenCalledWith('light');
  });

  it('ignores taps separated by more than tapDelay', () => {
    let doubleTapped = false;
    directive.doubleTap.subscribe(() => {
      doubleTapped = true;
    });

    let fakeTime = 1000;
    vi.spyOn(Date, 'now').mockImplementation(() => fakeTime);

    // 1st tap
    element.dispatchEvent(createTouchEvent('touchend', [{ clientX: 50, clientY: 50 }]));

    // 2nd tap after 450ms (> 300ms)
    fakeTime += 450;
    element.dispatchEvent(createTouchEvent('touchend', [{ clientX: 50, clientY: 50 }]));

    expect(doubleTapped).toBe(false);
  });
});

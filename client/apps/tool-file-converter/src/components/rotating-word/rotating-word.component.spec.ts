// @vitest-environment jsdom
// apps/tool-file-converter/src/components/rotating-word/rotating-word.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext, PLATFORM_ID } from '@angular/core';
import { RotatingWordComponent } from './rotating-word.component';

describe('RotatingWordComponent Unit Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function createComponent(): RotatingWordComponent {
    const providerMap = new Map<any, any>([
      [PLATFORM_ID, 'browser']
    ]);
    const rootInjector = {
      get: (token: any, notFound?: any) => providerMap.get(token) ?? notFound
    } as any;
    const envInjector = createEnvironmentInjector([], rootInjector);
    return runInInjectionContext(envInjector, () => new RotatingWordComponent());
  }

  it('should create and initialize with first word', () => {
    const component = createComponent();
    expect(component).toBeTruthy();
    expect(component.currentIndex()).toBe(0);
    expect(component.wordsList()).toEqual(['JPG', 'WEBP', 'PNG', 'AVIF', 'HEIC']);
    expect(component.widestWord()).toBe('WEBP');
    expect(component.previousIndex()).toBeNull();
  });

  it('should rotate word index after interval and reset previous after 1000ms animation', () => {
    const component = createComponent();
    component.ngOnInit();

    expect(component.currentIndex()).toBe(0);

    // Fast-forward interval (3000ms)
    vi.advanceTimersByTime(3000);
    expect(component.currentIndex()).toBe(1);
    expect(component.previousIndex()).toBe(0);

    // Fast-forward 1000ms soft transition completion
    vi.advanceTimersByTime(1000);
    expect(component.previousIndex()).toBeNull();

    // Fast-forward next interval
    vi.advanceTimersByTime(3000);
    expect(component.currentIndex()).toBe(2);

    component.ngOnDestroy();
  });

  it('should pause rotation on hover / focus and resume on leave', () => {
    const component = createComponent();
    component.ngOnInit();

    expect(component.currentIndex()).toBe(0);

    // Hover over component
    component.onMouseEnter();
    expect(component.isHostHovered()).toBe(true);

    // Advance timer while hovered - should NOT rotate
    vi.advanceTimersByTime(4400);
    expect(component.currentIndex()).toBe(0);

    // Leave component
    component.onMouseLeave();
    expect(component.isHostHovered()).toBe(false);

    // Advance timer - should rotate normally
    vi.advanceTimersByTime(2200);
    expect(component.currentIndex()).toBe(1);

    component.ngOnDestroy();
  });
});

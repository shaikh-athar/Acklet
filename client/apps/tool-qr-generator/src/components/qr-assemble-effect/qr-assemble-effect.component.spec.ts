// @vitest-environment jsdom
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext, signal, PLATFORM_ID, SimpleChange } from '@angular/core';
import {
  QrAssembleEffectComponent,
  STAGGER_MS,
  CELL_FADE_MS,
  REVEAL_MS,
  GLOW_START_MS,
  GLOW_IN_MS,
  GLOW_HOLD_MS,
  GLOW_OUT_MS,
  TOTAL_MS,
  ASSEMBLE_GRID_SIZE,
  ASSEMBLE_TOTAL_DURATION_MS,
  ASSEMBLE_DEBOUNCE_MS,
  ASSEMBLE_REDUCED_MOTION_MS
} from './qr-assemble-effect.component';

describe('QrAssembleEffectComponent (Complete Lifecycle & Tuned Specs)', () => {
  let component: QrAssembleEffectComponent;
  let qrDataUrlSignal = signal<string | null>(null);
  let isGeneratingSignal = signal<boolean>(false);

  let shouldAnimateSignal = signal<boolean | null>(null);

  beforeEach(() => {
    qrDataUrlSignal = signal<string | null>(null);
    isGeneratingSignal = signal<boolean>(false);
    shouldAnimateSignal = signal<boolean | null>(null);

    const rootInjector = {
      get: (token: any, notFound?: any) => {
        if (token === PLATFORM_ID) return 'browser';
        return notFound;
      }
    } as any;
    const envInjector = createEnvironmentInjector([], rootInjector);

    runInInjectionContext(envInjector, () => {
      component = new QrAssembleEffectComponent();
      (component as any).qrDataUrl = qrDataUrlSignal;
      (component as any).isGenerating = isGeneratingSignal;
      (component as any).shouldAnimate = shouldAnimateSignal;
    });
  });

  afterEach(() => {
    component?.ngOnDestroy();
    vi.restoreAllMocks();
    vi.useRealTimers();
    delete (window as any).matchMedia;
  });

  it('exposes tunable animation constants including slow and diffused parameters at the top', () => {
    expect(TOTAL_MS).toBe(1300);
    expect(ASSEMBLE_TOTAL_DURATION_MS).toBe(1300);
    expect(STAGGER_MS).toBe(520);
    expect(CELL_FADE_MS).toBe(260);
    expect(REVEAL_MS).toBe(780);
    expect(GLOW_START_MS).toBe(200);
    expect(GLOW_IN_MS).toBe(350);
    expect(GLOW_HOLD_MS).toBe(250);
    expect(GLOW_OUT_MS).toBe(500);
    expect(ASSEMBLE_GRID_SIZE).toBe(16);
    expect(ASSEMBLE_DEBOUNCE_MS).toBe(180);
    expect(ASSEMBLE_REDUCED_MOTION_MS).toBe(200);
  });

  it('does NOT trigger animation on initial load when qrDataUrl is null', () => {
    expect(component.isAnimating()).toBe(false);
  });

  it('triggers full animation cycle when shouldAnimate is true or on initial generation from null', () => {
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame');

    qrDataUrlSignal.set('data:image/png;base64,initial');
    shouldAnimateSignal.set(true);

    component.ngOnChanges({
      qrDataUrl: new SimpleChange(null, 'data:image/png;base64,initial', true),
      shouldAnimate: new SimpleChange(null, true, true)
    });

    expect(component.isAnimating()).toBe(true);
    expect(rafSpy).toHaveBeenCalled();
  });

  it('does NOT trigger full pixel reveal animation on subsequent updates when shouldAnimate is false', () => {
    vi.useFakeTimers();

    // 1. Initial generation
    qrDataUrlSignal.set('data:image/png;base64,initial');
    shouldAnimateSignal.set(true);
    component.ngOnChanges({
      qrDataUrl: new SimpleChange(null, 'data:image/png;base64,initial', true),
      shouldAnimate: new SimpleChange(null, true, true)
    });
    expect(component.displayedUrl()).toBe('data:image/png;base64,initial');

    // Finish initial animation
    component.cancelAnimation();
    expect(component.isAnimating()).toBe(false);

    // 2. Subsequent edit with shouldAnimate = false
    qrDataUrlSignal.set('data:image/png;base64,edited');
    shouldAnimateSignal.set(false);
    component.ngOnChanges({
      qrDataUrl: new SimpleChange('data:image/png;base64,initial', 'data:image/png;base64,edited', false),
      shouldAnimate: new SimpleChange(true, false, false)
    });

    // Verify: NO pixel reveal animation triggered
    expect(component.isAnimating()).toBe(false);

    // Verify: Atomic crossfade is active with previous QR in outgoingUrl and new QR in displayedUrl
    expect(component.displayedUrl()).toBe('data:image/png;base64,edited');
    expect(component.outgoingUrl()).toBe('data:image/png;base64,initial');
    expect(component.isCrossfading()).toBe(true);

    // After 150ms crossfade completes
    vi.advanceTimersByTime(150);
    expect(component.isCrossfading()).toBe(false);
    expect(component.outgoingUrl()).toBeNull();
  });

  it('dims current QR and shows spinner badge if rendering takes longer than 300ms, clearing once ready', () => {
    vi.useFakeTimers();

    // Set an existing QR
    qrDataUrlSignal.set('data:image/png;base64,existing');
    component.ngOnChanges({
      qrDataUrl: new SimpleChange(null, 'data:image/png;base64,existing', true)
    });
    expect(component.isSlowRender()).toBe(false);

    // Generation starts
    isGeneratingSignal.set(true);
    component.ngOnChanges({
      isGenerating: new SimpleChange(false, true, false)
    });

    // Advance 150ms (< 300ms threshold): not yet slow
    vi.advanceTimersByTime(150);
    expect(component.isSlowRender()).toBe(false);

    // Advance another 160ms (total 310ms > 300ms threshold): slow render active
    vi.advanceTimersByTime(160);
    expect(component.isSlowRender()).toBe(true);

    // Generation finishes
    isGeneratingSignal.set(false);
    component.ngOnChanges({
      isGenerating: new SimpleChange(true, false, false)
    });
    expect(component.isSlowRender()).toBe(false);
  });

  it('respects prefers-reduced-motion by bypassing mosaic canvas loop and using 200ms simple fade', () => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn().mockImplementation((query: string) => {
      return {
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      } as any;
    });

    const rafSpy = vi.spyOn(window, 'requestAnimationFrame');

    component.startAssembleAnimation();

    // In reduced motion, requestAnimationFrame for canvas mosaic is NOT called
    expect(rafSpy).not.toHaveBeenCalled();
    expect(component.isAnimating()).toBe(true);

    // After 200ms, animation resets
    vi.advanceTimersByTime(200);
    expect(component.isAnimating()).toBe(false);
  });

  it('restarts smoothly from current state if new change arrives mid-animation with no stacking', () => {
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame');

    component.startAssembleAnimation();
    expect(component.isAnimating()).toBe(true);

    // Second call mid-animation cancels previous loop and restarts cleanly
    component.startAssembleAnimation();
    expect(cancelSpy).toHaveBeenCalled();
    expect(rafSpy).toHaveBeenCalled();
  });

  it('cleans up debounce timer, animation loop, timeout, and resets active flag on destroy', () => {
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    component.startAssembleAnimation();

    component.ngOnDestroy();

    expect(component.isAnimating()).toBe(false);
    expect(cancelSpy).toHaveBeenCalled();
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('maintains backward-compatible isMosaicActive and startMosaicReveal calls', () => {
    component.startMosaicReveal();
    expect(component.isMosaicActive()).toBe(true);
  });
});


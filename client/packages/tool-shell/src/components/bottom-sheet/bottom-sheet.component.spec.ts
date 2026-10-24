// @vitest-environment jsdom
// client/packages/tool-shell/src/components/bottom-sheet/bottom-sheet.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { BottomSheetComponent } from './bottom-sheet.component';

describe('BottomSheetComponent', () => {
  function createComponent(): BottomSheetComponent {
    const rootInjector = {
      get: (_token: any, notFound?: any) => notFound
    } as any;
    const envInjector = createEnvironmentInjector([], rootInjector);
    return runInInjectionContext(envInjector, () => new BottomSheetComponent());
  }

  it('instantiates properly and defaults to closed', () => {
    const sheet = createComponent();
    expect(sheet.isOpen()).toBe(false);
    expect(sheet.isDragging()).toBe(false);
    expect(sheet.dragOffset()).toBe(0);
  });

  it('emits close on escape key when open', () => {
    const sheet = createComponent();
    (sheet as any).isOpen = () => true;

    let closed = false;
    sheet.close.subscribe(() => {
      closed = true;
    });

    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    sheet.onEscapeKey(event);
    expect(closed).toBe(true);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('does not emit close on escape key when already closed', () => {
    const sheet = createComponent();
    (sheet as any).isOpen = () => false;

    let closed = false;
    sheet.close.subscribe(() => {
      closed = true;
    });

    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    sheet.onEscapeKey(event);
    expect(closed).toBe(false);
  });

  it('closes on backdrop click if dismissOnBackdrop is true', () => {
    const sheet = createComponent();
    let closed = false;
    sheet.close.subscribe(() => {
      closed = true;
    });

    sheet.onBackdropClick();
    expect(closed).toBe(true);
  });

  it('tracks touch drag and triggers dismissal when dragged down past threshold', () => {
    const sheet = createComponent();
    let closed = false;
    sheet.close.subscribe(() => {
      closed = true;
    });

    // Touch start at Y=100
    sheet.onTouchStart({
      touches: [{ clientY: 100 }]
    } as any);
    expect(sheet.isDragging()).toBe(true);

    // Touch move down to Y=200 (delta = 100 > 75)
    sheet.onTouchMove({
      touches: [{ clientY: 200 }]
    } as any);
    expect(sheet.dragOffset()).toBe(100);
    expect(sheet.sheetTransform()).toBe('translateY(100px)');

    // Touch end
    sheet.onTouchEnd();
    expect(sheet.isDragging()).toBe(false);
    expect(closed).toBe(true);
  });

  it('snaps back when drag distance is below threshold', () => {
    const sheet = createComponent();
    let closed = false;
    sheet.close.subscribe(() => {
      closed = true;
    });

    // Touch start at Y=100
    sheet.onTouchStart({
      touches: [{ clientY: 100 }]
    } as any);

    // Touch move down by 30px (< 75 threshold)
    sheet.onTouchMove({
      touches: [{ clientY: 130 }]
    } as any);
    expect(sheet.dragOffset()).toBe(30);

    // Touch end
    sheet.onTouchEnd();
    expect(sheet.isDragging()).toBe(false);
    expect(sheet.dragOffset()).toBe(0);
    expect(closed).toBe(false);
  });
});

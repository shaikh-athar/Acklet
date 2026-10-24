// @vitest-environment jsdom
// client/apps/tool-qr-generator/src/qr-generator-responsive.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext, signal, WritableSignal } from '@angular/core';
import { QRGeneratorComponent } from './qr-generator.component';
import { QRGeneratorService } from './services/qr-generator.service';
import { QRHistoryService } from './services/qr-history.service';
import { QrDynamicService } from './services/qr-dynamic.service';
import { ResponsiveService, DeviceClass, HapticService } from '@acklet/tool-shell';

describe('QRGeneratorComponent Responsive & Mobile Flow', () => {
  let component: QRGeneratorComponent;
  let deviceClassSignal: WritableSignal<DeviceClass>;
  let mockResponsive: Partial<ResponsiveService>;
  let isTouchSignal: WritableSignal<boolean>;

  beforeEach(() => {
    window.localStorage.clear();
    deviceClassSignal = signal<DeviceClass>('phone');
    isTouchSignal = signal<boolean>(true);

    mockResponsive = {
      deviceClass: deviceClassSignal.asReadonly(),
      isPhone: () => deviceClassSignal() === 'phone',
      isTabletPortrait: () => deviceClassSignal() === 'tablet-portrait',
      isTabletLandscape: () => deviceClassSignal() === 'tablet-landscape',
      isDesktop: () => deviceClassSignal() === 'desktop',
      isTouch: isTouchSignal.asReadonly(),
      keyboardOpen: signal(false).asReadonly(),
      orientation: signal<'portrait' | 'landscape'>('portrait').asReadonly(),
      safeAreaInsets: signal({ top: 0, right: 0, bottom: 0, left: 0 }).asReadonly(),
      shouldReduceEffects: () => deviceClassSignal() === 'phone',
    };

    const rootInjector = {
      get: (token: any, notFound?: any) => {
        if (token === QRGeneratorService) return new QRGeneratorService();
        if (token === QRHistoryService) return new QRHistoryService();
        if (token === QrDynamicService) return new QrDynamicService();
        if (token === ResponsiveService) return mockResponsive;
        if (token === HapticService) return new HapticService();
        return notFound;
      }
    } as any;

    const envInjector = createEnvironmentInjector([], rootInjector);

    runInInjectionContext(envInjector, () => {
      component = new QRGeneratorComponent();
    });
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('determines isMobileFlow correctly based on deviceClass', () => {
    // Phone -> mobile flow
    deviceClassSignal.set('phone');
    expect(component.isMobileFlow()).toBe(true);

    // Tablet portrait -> mobile flow
    deviceClassSignal.set('tablet-portrait');
    expect(component.isMobileFlow()).toBe(true);

    // Tablet landscape -> desktop flow
    deviceClassSignal.set('tablet-landscape');
    expect(component.isMobileFlow()).toBe(false);

    // Desktop -> desktop flow
    deviceClassSignal.set('desktop');
    expect(component.isMobileFlow()).toBe(false);
  });

  it('starts in State A (input) by default', () => {
    expect(component.phoneState()).toBe('input');
    expect(component.isFullScreenModalOpen()).toBe(false);
  });

  it('transitions from State A (input) to State B (result) with history state push', () => {
    const pushStateSpy = vi.spyOn(window.history, 'pushState');
    component.content.set('https://acklet.com');
    component.validationError.set(null);
    component.goToResultState();

    expect(component.phoneState()).toBe('result');
    expect(pushStateSpy).toHaveBeenCalledWith({ qrScreenState: 'result' }, '');
  });

  it('transitions from State B (result) to State C (design) with history state push', () => {
    const pushStateSpy = vi.spyOn(window.history, 'pushState');
    component.content.set('https://acklet.com');
    component.validationError.set(null);
    component.goToResultState();
    component.goToDesignState();

    expect(component.phoneState()).toBe('design');
    expect(pushStateSpy).toHaveBeenCalledWith({ qrScreenState: 'design' }, '');
  });

  it('handles popstate (device Back button) navigation correctly', () => {
    component.ngOnInit();

    // Move to design state
    component.phoneState.set('design');

    // Simulate browser Back button event to result
    window.dispatchEvent(new PopStateEvent('popstate', { state: { qrScreenState: 'result' } }));
    expect(component.phoneState()).toBe('result');

    // Simulate browser Back button event back to input
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    expect(component.phoneState()).toBe('input');
  });

  it('opens and closes full screen QR modal', () => {
    expect(component.isFullScreenModalOpen()).toBe(false);
    component.openFullScreen();
    expect(component.isFullScreenModalOpen()).toBe(true);
    component.closeFullScreen();
    expect(component.isFullScreenModalOpen()).toBe(false);
  });

  it('computes contentSummary properly with ellipsis for long text', () => {
    component.selectedType.set('url');
    component.content.set('https://acklet.com/super-long-url-path-that-exceeds-36-chars');

    const summary = component.contentSummary();
    expect(summary.startsWith('Website URL:')).toBe(true);
    expect(summary.endsWith('...')).toBe(true);
  });

  it('opens and closes QR context menu (action sheet)', () => {
    expect(component.isQrContextMenuOpen()).toBe(false);
    component.openQrContextMenu();
    expect(component.isQrContextMenuOpen()).toBe(true);
    component.isQrContextMenuOpen.set(false);
    expect(component.isQrContextMenuOpen()).toBe(false);
  });

  it('handles user share cancellation (AbortError) silently without fallback download', async () => {
    const downloadSpy = vi.spyOn(component, 'onDownload');
    (component as any).qrDataUrl = signal('data:image/png;base64,123');

    const abortError = new Error('User cancelled share');
    abortError.name = 'AbortError';

    Object.defineProperty(navigator, 'share', {
      value: vi.fn().mockRejectedValue(abortError),
      configurable: true,
      writable: true
    });

    await component.onMobileShare();
    expect(downloadSpy).not.toHaveBeenCalled();
  });

  it('adapts input debounce timing between mobile touch (350ms) and desktop (200ms)', () => {
    vi.useFakeTimers();
    const executeSpy = vi.spyOn(component as any, 'executeGeneration');
    component.ngOnInit();
    executeSpy.mockClear();

    // Mobile / touch mode (deviceClass is phone, isTouch is true)
    component.onContentChange('https://acklet.com/mobile-test');
    vi.advanceTimersByTime(250);
    expect(executeSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(110);
    expect(executeSpy).toHaveBeenCalledWith('https://acklet.com/mobile-test', component.selectedType());

    // Switch to desktop mode with fine pointer
    deviceClassSignal.set('desktop');
    isTouchSignal.set(false);
    executeSpy.mockClear();

    component.onContentChange('https://acklet.com/desktop-test');
    vi.advanceTimersByTime(100);
    expect(executeSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(110);
    expect(executeSpy).toHaveBeenCalledWith('https://acklet.com/desktop-test', component.selectedType());

    vi.useRealTimers();
  });

  it('switches between Content and Design tabs and cycles through all subtabs', () => {
    // Initial state
    expect(component.activeTab()).toBe('content');
    expect(component.designSubTab()).toBe('frame');

    // Switch to Design tab
    component.activeTab.set('design');
    expect(component.activeTab()).toBe('design');
    expect(component.designSubTab()).toBe('frame');

    // Cycle through all design subtabs
    const subtabs: Array<'frame' | 'shapes' | 'logo' | 'colors' | 'brand'> = [
      'shapes',
      'logo',
      'colors',
      'brand',
      'frame'
    ];
    for (const subtab of subtabs) {
      component.designSubTab.set(subtab);
      expect(component.designSubTab()).toBe(subtab);
    }

    // Switch back to Content tab
    component.activeTab.set('content');
    expect(component.activeTab()).toBe('content');
  });

  it('toggles More types menu state reliably', () => {
    expect(component.isMoreMenuOpen()).toBe(false);

    // Simulate clicking more menu trigger
    const mockEvent = {
      stopPropagation: vi.fn(),
      currentTarget: {
        getBoundingClientRect: () => ({ bottom: 100, left: 200, width: 80, height: 36 })
      }
    } as any;

    component.toggleMoreMenu(mockEvent);
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(component.isMoreMenuOpen()).toBe(true);

    // Close on outside click
    component.closeMoreMenu();
    expect(component.isMoreMenuOpen()).toBe(false);
  });
});


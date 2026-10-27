// @vitest-environment jsdom
// client/apps/tool-qr-generator/src/qr-generator-responsive.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext, signal, WritableSignal } from '@angular/core';
import { QRGeneratorComponent } from './qr-generator.component';
import { QRGeneratorService } from './services/qr-generator.service';
import { QRHistoryService } from './services/qr-history.service';
import { QrDynamicService } from './services/qr-dynamic.service';
import { SmartLinkService } from './services/smart-link.service';
import { QrNotesService } from './services/qr-notes.service';
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
        if (token === SmartLinkService) return new SmartLinkService({ post: () => ({ pipe: () => ({}) }), put: () => ({ pipe: () => ({}) }) } as any);
        if (token === QrNotesService) return new QrNotesService({ get: () => ({ pipe: () => ({}) }), post: () => ({ pipe: () => ({}) }) } as any);
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

  it('fires animation only on first generation, and no animation on subsequent updates', async () => {
    vi.useFakeTimers();
    deviceClassSignal.set('desktop');
    isTouchSignal.set(false);

    const consoleLogSpy = vi.spyOn(console, 'log');
    component.ngOnInit();
    // Flush initial ngOnInit execution
    await vi.advanceTimersByTimeAsync(300);
    consoleLogSpy.mockClear();

    // Change 1: First successful generation
    component.onContentChange('https://acklet.com/first-qr');
    await vi.advanceTimersByTimeAsync(210);

    // Verify Animation START and State updated ran for first generation
    const firstStartLogs = consoleLogSpy.mock.calls.filter(args => args[0] === 'Animation START');
    const firstStateUpdatedLogs = consoleLogSpy.mock.calls.filter(args => args[0] === 'State updated');
    expect(firstStartLogs.length).toBe(1);
    expect(firstStateUpdatedLogs.length).toBe(1);
    expect(component.shouldAnimateQR()).toBe(true);

    // Advance animation completion (500ms)
    await vi.advanceTimersByTimeAsync(500);
    const firstEndLogs = consoleLogSpy.mock.calls.filter(args => args[0] === 'Animation END');
    expect(firstEndLogs.length).toBe(1);
    expect(component.shouldAnimateQR()).toBe(false);

    // Changes 2 to 5: Subsequent updates (no animation)
    for (let i = 2; i <= 5; i++) {
      consoleLogSpy.mockClear();
      component.onContentChange(`https://acklet.com/test-url-${i}`);

      // Advance debounce window (200ms)
      await vi.advanceTimersByTimeAsync(210);

      // Verify NO Animation START, but State updated ran exactly once
      const startLogs = consoleLogSpy.mock.calls.filter(args => args[0] === 'Animation START');
      const stateUpdatedLogs = consoleLogSpy.mock.calls.filter(args => args[0] === 'State updated');
      expect(startLogs.length).toBe(0);
      expect(stateUpdatedLogs.length).toBe(1);
      expect(component.shouldAnimateQR()).toBe(false);
    }

    vi.useRealTimers();
  });

  it('re-triggers full reveal animation when user switches content type or loads sample', async () => {
    vi.useFakeTimers();
    deviceClassSignal.set('desktop');
    isTouchSignal.set(false);

    const consoleLogSpy = vi.spyOn(console, 'log');
    component.ngOnInit();
    await vi.advanceTimersByTimeAsync(300);

    // First generation
    component.onContentChange('https://acklet.com/init');
    await vi.advanceTimersByTimeAsync(750);
    consoleLogSpy.mockClear();

    // Switch content type to 'email'
    component.onTypeChange('email');
    component.onContentChange('hello@acklet.com');
    await vi.advanceTimersByTimeAsync(210);

    const typeChangeStartLogs = consoleLogSpy.mock.calls.filter(args => args[0] === 'Animation START');
    expect(typeChangeStartLogs.length).toBe(1);
    expect(component.shouldAnimateQR()).toBe(true);

    await vi.advanceTimersByTimeAsync(500);
    consoleLogSpy.mockClear();

    // Load sample
    component.loadSample();
    await vi.advanceTimersByTimeAsync(210);
    const sampleStartLogs = consoleLogSpy.mock.calls.filter(args => args[0] === 'Animation START');
    expect(sampleStartLogs.length).toBe(1);

    vi.useRealTimers();
  });

  it('performs exactly one render per burst of rapid edits with debounce and token cancellation', async () => {
    vi.useFakeTimers();
    deviceClassSignal.set('desktop');
    isTouchSignal.set(false);

    const consoleLogSpy = vi.spyOn(console, 'log');
    component.ngOnInit();
    await vi.advanceTimersByTimeAsync(300);
    consoleLogSpy.mockClear();

    // Rapid burst of edits (e.g. typing "acklet")
    component.onContentChange('a');
    await vi.advanceTimersByTimeAsync(50);
    component.onContentChange('ac');
    await vi.advanceTimersByTimeAsync(50);
    component.onContentChange('ack');
    await vi.advanceTimersByTimeAsync(50);
    component.onContentChange('acklet');

    // Still within debounce window
    expect(consoleLogSpy.mock.calls.filter(args => args[0] === 'State updated').length).toBe(0);

    // Advance past desktop debounce window (200ms)
    await vi.advanceTimersByTimeAsync(220);

    // Exactly one render executed
    const stateUpdatedLogs = consoleLogSpy.mock.calls.filter(args => args[0] === 'State updated');
    expect(stateUpdatedLogs.length).toBe(1);

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
    const subtabs: Array<'frame' | 'shapes' | 'logo' | 'colors'> = [
      'shapes',
      'logo',
      'colors',
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

  it('routes onSwitchTab calls directly to corresponding design subtab', () => {
    component.onSwitchTab('colors');
    expect(component.designSubTab()).toBe('colors');

    component.onSwitchTab('shapes');
    expect(component.designSubTab()).toBe('shapes');

    component.onSwitchTab('logo');
    expect(component.designSubTab()).toBe('logo');

    component.onSwitchTab('frame');
    expect(component.designSubTab()).toBe('frame');

    component.onSwitchTab('content');
    expect(component.activeTab()).toBe('content');
  });

  it('correctly tracks hasCustomDesign flag when customizations are applied', () => {
    expect(component.hasCustomDesign()).toBe(false);

    // Change dot shape
    component.dotType.set('dots');
    expect(component.hasCustomDesign()).toBe(true);

    // Reset dot shape
    component.dotType.set('square');
    expect(component.hasCustomDesign()).toBe(false);

    // Change color
    component.foregroundColor.set('#ff0000');
    expect(component.hasCustomDesign()).toBe(true);
  });

  it('provides a page shell layout with left and right ad gutters and centered tool container', () => {
    // Component template structure verification
    const annotations = (QRGeneratorComponent as any)['\u0275cmp'];
    expect(annotations).toBeDefined();
    const constsStr = JSON.stringify(annotations.consts);
    expect(constsStr.includes('qr-page-shell')).toBe(true);
    expect(constsStr.includes('ad-gutter-left')).toBe(true);
    expect(constsStr.includes('ad-gutter-right')).toBe(true);
    expect(constsStr.includes('qr-tool-container')).toBe(true);
    expect(constsStr.includes('ad-slot-placeholder')).toBe(true);
  });

  it('structures desktop flow into Screen 1 (Input + Preview) and Screen 2 (Design Studio)', () => {
    const annotations = (QRGeneratorComponent as any)['\u0275cmp'];
    expect(annotations).toBeDefined();
    const constsStr = JSON.stringify(annotations.consts);

    // Screen 1: Primary Viewport
    expect(constsStr.includes('screen1Hero')).toBe(true);
    expect(constsStr.includes('qr-screen-primary')).toBe(true);
    expect(constsStr.includes('qr-col-input')).toBe(true);
    expect(constsStr.includes('qr-col-preview')).toBe(true);

    // Screen 2: Customization Studio
    expect(constsStr.includes('screen2Design')).toBe(true);
    expect(constsStr.includes('qr-screen-design')).toBe(true);

    // Navigation and smooth-scrolling mocks
    const scrollMock = vi.fn();
    const mockDesignEl = { scrollIntoView: scrollMock };
    const mockPreviewEl = { scrollIntoView: scrollMock };
    vi.spyOn(document, 'getElementById').mockImplementation((id: string) => {
      if (id === 'screen2Design') return mockDesignEl as any;
      return null;
    });
    vi.spyOn(document, 'querySelector').mockImplementation((sel: string) => {
      if (sel === '.qr-col-preview') return mockPreviewEl as any;
      return null;
    });

    component.onSwitchTab('design');
    expect(component.activeTab()).toBe('design');
    expect(scrollMock).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth', block: 'start' }));

    scrollMock.mockClear();
    component.onSwitchTab('download');
    expect(scrollMock).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth', block: 'center' }));
  });

  it('provides a centered Content Type dropdown with instant search and icon options', () => {
    const annotations = (QRGeneratorComponent as any)['\u0275cmp'];
    expect(annotations).toBeDefined();
    const constsStr = JSON.stringify(annotations.consts);

    expect(constsStr.includes('contentTypeTrigger')).toBe(true);
    expect(constsStr.includes('content-type-dropdown-trigger')).toBe(true);
    expect(constsStr.includes('content-type-menu')).toBe(true);

    // Initial state: closed, all 12 types present
    expect(component.isTypeMenuOpen()).toBe(false);
    expect(component.filteredContentTypes().length).toBe(12);

    // Open dropdown
    const mockEvent = {
      stopPropagation: vi.fn(),
      currentTarget: {
        closest: () => ({ getBoundingClientRect: () => ({ bottom: 120, left: 100, width: 400 }) }),
        getBoundingClientRect: () => ({ bottom: 120, left: 100, width: 400 })
      }
    } as any;
    component.toggleTypeDropdown(mockEvent);
    expect(component.isTypeMenuOpen()).toBe(true);
    expect(component.typeMenuPosition()?.width).toBe(400);

    // Instant search filter (e.g. 'wifi')
    component.typeMenuSearch.set('wifi');
    expect(component.filteredContentTypes().length).toBe(1);
    expect(component.filteredContentTypes()[0].type).toBe('wifi');

    // Select type
    component.selectType('wifi');
    expect(component.selectedType()).toBe('wifi');
    expect(component.isTypeMenuOpen()).toBe(false);

    // Reopen and search with no results
    component.toggleTypeDropdown(mockEvent);
    component.typeMenuSearch.set('nonexistent_type_xyz');
    expect(component.filteredContentTypes().length).toBe(0);

    // Close dropdown
    component.closeTypeDropdown();
    expect(component.isTypeMenuOpen()).toBe(false);
  });

  it('provides a full-width Screen 2 design studio without duplicate QR preview (single QR preview layout)', () => {
    const annotations = (QRGeneratorComponent as any)['\u0275cmp'];
    expect(annotations).toBeDefined();
    const constsStr = JSON.stringify(annotations.consts);

    expect(constsStr.includes('design-workspace-layout')).toBe(true);
    expect(constsStr.includes('customize-panel-card')).toBe(true);
    expect(constsStr.includes('design-subnav')).toBe(true);
    // Verified: No duplicate QR preview in Screen 2
    expect(constsStr.includes('design-sticky-preview')).toBe(false);
  });

  it('validates responsive behavior and ad QA across all target breakpoints (1920, 1440, 1280, 1024, 768, 390px)', () => {
    const annotations = (QRGeneratorComponent as any)['\u0275cmp'];
    const styles = annotations.styles?.join(' ') || '';

    // Breakpoint: 1920px & 1600px+ (Ultra-wide desktop)
    expect(styles.includes('min-width: 1600px')).toBe(true);
    expect(styles.includes('skyscraper-left') || styles.includes('ad-slot-placeholder')).toBe(true);

    // Breakpoint: 1440px & 1280px+ (Standard wide desktop)
    expect(styles.includes('min-width: 1280px')).toBe(true);

    // Breakpoint: < 1280px (Gutters hidden, no layout shifts)
    expect(styles.includes('max-width: 1279px')).toBe(true);
    expect(styles.includes('display: none !important')).toBe(true);

    // Breakpoint: 1024px and below (Tablet stack)
    expect(styles.includes('max-width: 1023px')).toBe(true);

    // Breakpoint: 1024px / Tablet landscape (Desktop flow)
    deviceClassSignal.set('tablet-landscape');
    expect(component.isMobileFlow()).toBe(false);

    // Breakpoint: 768px / Tablet portrait (Touch mobile flow)
    deviceClassSignal.set('tablet-portrait');
    expect(component.isMobileFlow()).toBe(true);

    // Breakpoint: 390px (Mobile phone)
    deviceClassSignal.set('phone');
    expect(component.isMobileFlow()).toBe(true);

    // Breakpoint: 1280px+ (Desktop flow)
    deviceClassSignal.set('desktop');
    expect(component.isMobileFlow()).toBe(false);

    // Theme QA: Validates dual theme high-contrast support
    expect(styles.includes('data-theme="light"') || styles.includes(':host-context([data-theme="light"])')).toBe(true);
    expect(styles.includes('--surface-1') || styles.includes('--surface-base')).toBe(true);
  });
});

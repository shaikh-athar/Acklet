// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ResponsiveService } from './responsive.service';

describe('ResponsiveService', () => {
  let mediaQueries: Record<string, boolean> = {};

  beforeEach(() => {
    mediaQueries = {
      '(hover: hover) and (pointer: fine)': true,
      '(hover: none) and (pointer: coarse)': false,
      '(pointer: fine)': true,
      '(pointer: coarse)': false,
      '(any-pointer: fine)': true,
      '(any-pointer: coarse)': false,
      '(hover: hover)': true,
      '(orientation: portrait)': true,
      '(prefers-reduced-motion: reduce)': false
    };

    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1440
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 900
    });
    Object.defineProperty(window, 'visualViewport', {
      writable: true,
      configurable: true,
      value: undefined
    });

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: mediaQueries[query] ?? false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Device Class Breakpoint Classification', () => {
    it('classifies viewport <= 640px as phone', () => {
      Object.defineProperty(window, 'innerWidth', { value: 390 });
      const service = new ResponsiveService();

      expect(service.deviceClass()).toBe('phone');
      expect(service.isPhone()).toBe(true);
      expect(service.isTablet()).toBe(false);
      expect(service.isDesktop()).toBe(false);
      service.ngOnDestroy();
    });

    it('classifies viewport 641px - 1023px as tablet-portrait', () => {
      Object.defineProperty(window, 'innerWidth', { value: 768 });
      const service = new ResponsiveService();

      expect(service.deviceClass()).toBe('tablet-portrait');
      expect(service.isPhone()).toBe(false);
      expect(service.isTablet()).toBe(true);
      expect(service.isTabletPortrait()).toBe(true);
      expect(service.isTabletLandscape()).toBe(false);
      expect(service.isDesktop()).toBe(false);
      service.ngOnDestroy();
    });

    it('classifies viewport 1024px - 1279px as tablet-landscape', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024 });
      const service = new ResponsiveService();

      expect(service.deviceClass()).toBe('tablet-landscape');
      expect(service.isTablet()).toBe(true);
      expect(service.isTabletLandscape()).toBe(true);
      expect(service.isTabletPortrait()).toBe(false);
      expect(service.isDesktop()).toBe(false);
      service.ngOnDestroy();
    });

    it('classifies viewport >= 1280px as desktop', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1440 });
      const service = new ResponsiveService();

      expect(service.deviceClass()).toBe('desktop');
      expect(service.isDesktop()).toBe(true);
      expect(service.isPhone()).toBe(false);
      expect(service.isTablet()).toBe(false);
      service.ngOnDestroy();
    });
  });

  describe('Capability-Based Input Mode Detection', () => {
    it('detects mouse mode when fine pointer and hover are available', () => {
      mediaQueries['(pointer: fine)'] = true;
      mediaQueries['(pointer: coarse)'] = false;
      mediaQueries['(any-pointer: coarse)'] = false;
      mediaQueries['(hover: hover)'] = true;

      const service = new ResponsiveService();
      expect(service.inputMode()).toBe('mouse');
      expect(service.isMouse()).toBe(true);
      expect(service.isTouch()).toBe(false);
      service.ngOnDestroy();
    });

    it('detects touch mode when coarse pointer and no hover', () => {
      mediaQueries['(pointer: fine)'] = false;
      mediaQueries['(pointer: coarse)'] = true;
      mediaQueries['(any-pointer: fine)'] = false;
      mediaQueries['(any-pointer: coarse)'] = true;
      mediaQueries['(hover: hover)'] = false;

      const service = new ResponsiveService();
      expect(service.inputMode()).toBe('touch');
      expect(service.isTouch()).toBe(true);
      expect(service.isMouse()).toBe(false);
      service.ngOnDestroy();
    });

    it('detects hybrid mode when both fine and coarse pointers exist (iPad with Magic Keyboard / touch laptop)', () => {
      mediaQueries['(pointer: fine)'] = true;
      mediaQueries['(pointer: coarse)'] = false;
      mediaQueries['(any-pointer: fine)'] = true;
      mediaQueries['(any-pointer: coarse)'] = true;
      mediaQueries['(hover: hover)'] = true;

      const service = new ResponsiveService();
      expect(service.inputMode()).toBe('hybrid');
      expect(service.isHybrid()).toBe(true);
      expect(service.isTouch()).toBe(true);
      expect(service.isMouse()).toBe(true);
      service.ngOnDestroy();
    });
  });

  describe('Orientation and Visual Viewport Detection', () => {
    it('detects portrait vs landscape orientation', () => {
      mediaQueries['(orientation: portrait)'] = true;
      const portraitService = new ResponsiveService();
      expect(portraitService.orientation()).toBe('portrait');
      portraitService.ngOnDestroy();

      mediaQueries['(orientation: portrait)'] = false;
      const landscapeService = new ResponsiveService();
      expect(landscapeService.orientation()).toBe('landscape');
      landscapeService.ngOnDestroy();
    });

    it('detects virtual keyboard open when visualViewport height is substantially reduced on touch devices', () => {
      mediaQueries['(pointer: fine)'] = false;
      mediaQueries['(pointer: coarse)'] = true;
      mediaQueries['(hover: hover)'] = false;

      Object.defineProperty(window, 'innerHeight', { value: 800 });

      // Mock visualViewport
      const visualViewportListeners: Record<string, () => void> = {};
      const mockVisualViewport = {
        height: 420, // 420 < 800 * 0.78 => keyboard open!
        width: 390,
        addEventListener: vi.fn((event: string, cb: () => void) => {
          visualViewportListeners[event] = cb;
        }),
        removeEventListener: vi.fn()
      };
      Object.defineProperty(window, 'visualViewport', {
        value: mockVisualViewport,
        configurable: true
      });

      const service = new ResponsiveService();
      expect(service.keyboardOpen()).toBe(true);
      expect(service.viewportHeight()).toBe(420);

      // Keyboard closes (visualViewport returns to 800)
      mockVisualViewport.height = 800;
      visualViewportListeners['resize']?.();
      expect(service.keyboardOpen()).toBe(false);
      expect(service.viewportHeight()).toBe(800);

      service.ngOnDestroy();
    });

    it('detects short viewport on landscape phone', () => {
      Object.defineProperty(window, 'innerWidth', { value: 844 });
      Object.defineProperty(window, 'innerHeight', { value: 390 });

      const service = new ResponsiveService();
      expect(service.isShortViewport()).toBe(true);
      service.ngOnDestroy();
    });
  });

  describe('Accessibility & Safe Insets', () => {
    it('detects prefersReducedMotion', () => {
      mediaQueries['(prefers-reduced-motion: reduce)'] = true;
      const service = new ResponsiveService();
      expect(service.prefersReducedMotion()).toBe(true);
      service.ngOnDestroy();
    });

    it('evaluates shouldReduceEffects correctly on phone or reduced motion', () => {
      // Desktop + normal motion -> false
      Object.defineProperty(window, 'innerWidth', { value: 1440 });
      mediaQueries['(prefers-reduced-motion: reduce)'] = false;
      const s1 = new ResponsiveService();
      expect(s1.shouldReduceEffects()).toBe(false);
      s1.ngOnDestroy();

      // Phone + normal motion -> true
      Object.defineProperty(window, 'innerWidth', { value: 390 });
      const s2 = new ResponsiveService();
      expect(s2.shouldReduceEffects()).toBe(true);
      s2.ngOnDestroy();

      // Desktop + reduced motion -> true
      Object.defineProperty(window, 'innerWidth', { value: 1440 });
      mediaQueries['(prefers-reduced-motion: reduce)'] = true;
      const s3 = new ResponsiveService();
      expect(s3.shouldReduceEffects()).toBe(true);
      s3.ngOnDestroy();
    });
  });

  describe('Multi-Viewport Verification Matrix', () => {
    it('verifies Phone Portrait (390 x 844) viewport and touch capabilities', () => {
      Object.defineProperty(window, 'innerWidth', { value: 390 });
      Object.defineProperty(window, 'innerHeight', { value: 844 });
      mediaQueries['(pointer: coarse)'] = true;
      mediaQueries['(pointer: fine)'] = false;
      mediaQueries['(hover: hover)'] = false;
      mediaQueries['(orientation: portrait)'] = true;

      const service = new ResponsiveService();
      expect(service.deviceClass()).toBe('phone');
      expect(service.isPhone()).toBe(true);
      expect(service.isTouch()).toBe(true);
      expect(service.isShortViewport()).toBe(false);
      expect(service.orientation()).toBe('portrait');
      service.ngOnDestroy();
    });

    it('verifies Phone Landscape (844 x 390) viewport and short viewport detection', () => {
      Object.defineProperty(window, 'innerWidth', { value: 844 });
      Object.defineProperty(window, 'innerHeight', { value: 390 });
      mediaQueries['(pointer: coarse)'] = true;
      mediaQueries['(pointer: fine)'] = false;
      mediaQueries['(hover: hover)'] = false;
      mediaQueries['(orientation: portrait)'] = false;

      const service = new ResponsiveService();
      expect(service.isTouch()).toBe(true);
      expect(service.isShortViewport()).toBe(true);
      expect(service.orientation()).toBe('landscape');
      service.ngOnDestroy();
    });

    it('verifies Tablet Portrait (768 x 1024) viewport and touch capabilities', () => {
      Object.defineProperty(window, 'innerWidth', { value: 768 });
      Object.defineProperty(window, 'innerHeight', { value: 1024 });
      mediaQueries['(pointer: coarse)'] = true;
      mediaQueries['(pointer: fine)'] = false;
      mediaQueries['(hover: hover)'] = false;
      mediaQueries['(orientation: portrait)'] = true;

      const service = new ResponsiveService();
      expect(service.deviceClass()).toBe('tablet-portrait');
      expect(service.isTablet()).toBe(true);
      expect(service.isTabletPortrait()).toBe(true);
      expect(service.isPhone()).toBe(false);
      expect(service.isDesktop()).toBe(false);
      expect(service.isShortViewport()).toBe(false);
      service.ngOnDestroy();
    });

    it('verifies Tablet Landscape (1024 x 768) viewport and hybrid input', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024 });
      Object.defineProperty(window, 'innerHeight', { value: 768 });
      mediaQueries['(pointer: fine)'] = true;
      mediaQueries['(any-pointer: coarse)'] = true;
      mediaQueries['(hover: hover)'] = true;
      mediaQueries['(orientation: portrait)'] = false;

      const service = new ResponsiveService();
      expect(service.deviceClass()).toBe('tablet-landscape');
      expect(service.isTablet()).toBe(true);
      expect(service.isTabletLandscape()).toBe(true);
      expect(service.isDesktop()).toBe(false);
      expect(service.inputMode()).toBe('hybrid');
      expect(service.isHybrid()).toBe(true);
      expect(service.isTouch()).toBe(true);
      expect(service.isMouse()).toBe(true);
      service.ngOnDestroy();
    });

    it('verifies Desktop (1440 x 900) viewport with fine mouse pointer', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1440 });
      Object.defineProperty(window, 'innerHeight', { value: 900 });
      mediaQueries['(pointer: fine)'] = true;
      mediaQueries['(pointer: coarse)'] = false;
      mediaQueries['(any-pointer: coarse)'] = false;
      mediaQueries['(hover: hover)'] = true;
      mediaQueries['(orientation: portrait)'] = false;

      const service = new ResponsiveService();
      expect(service.deviceClass()).toBe('desktop');
      expect(service.isDesktop()).toBe(true);
      expect(service.isPhone()).toBe(false);
      expect(service.isTablet()).toBe(false);
      expect(service.inputMode()).toBe('mouse');
      expect(service.isMouse()).toBe(true);
      expect(service.isTouch()).toBe(false);
      expect(service.shouldReduceEffects()).toBe(false);
      service.ngOnDestroy();
    });
  });
});

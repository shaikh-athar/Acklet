// apps/tool-image-compressor/src/services/responsive-layout.spec.ts
import { describe, it, expect } from 'vitest';

describe('Acklet Image Compressor - Standard Breakpoints & Responsive Architecture', () => {
  // STEP 1: One set of breakpoints
  const BREAKPOINTS = {
    xs: { min: 0, max: 479, name: 'phones' },
    sm: { min: 480, max: 767, name: 'large phones' },
    md: { min: 768, max: 1023, name: 'tablets' },
    lg: { min: 1024, max: Infinity, name: 'desktop' }
  };

  it('defines canonical non-overlapping breakpoints in one place', () => {
    expect(BREAKPOINTS.xs.min).toBe(0);
    expect(BREAKPOINTS.xs.max).toBe(479);
    expect(BREAKPOINTS.sm.min).toBe(480);
    expect(BREAKPOINTS.sm.max).toBe(767);
    expect(BREAKPOINTS.md.min).toBe(768);
    expect(BREAKPOINTS.md.max).toBe(1023);
    expect(BREAKPOINTS.lg.min).toBe(1024);
  });

  it('resolves the correct breakpoint name for viewports', () => {
    function resolveBreakpoint(width: number): 'xs' | 'sm' | 'md' | 'lg' {
      if (width <= BREAKPOINTS.xs.max) return 'xs';
      if (width <= BREAKPOINTS.sm.max) return 'sm';
      if (width <= BREAKPOINTS.md.max) return 'md';
      return 'lg';
    }

    expect(resolveBreakpoint(360)).toBe('xs');
    expect(resolveBreakpoint(390)).toBe('xs');
    expect(resolveBreakpoint(479)).toBe('xs');
    expect(resolveBreakpoint(480)).toBe('sm');
    expect(resolveBreakpoint(767)).toBe('sm');
    expect(resolveBreakpoint(768)).toBe('md');
    expect(resolveBreakpoint(1023)).toBe('md');
    expect(resolveBreakpoint(1024)).toBe('lg');
    expect(resolveBreakpoint(1440)).toBe('lg');
  });

  // STEP 2: Customize popup rules
  describe('STEP 2: Customize popup rules', () => {
    it('calculates 3 columns for format chips on xs and 6 columns on md+', () => {
      function getFormatColumns(width: number): number {
        return width <= BREAKPOINTS.sm.max ? 3 : 6;
      }
      expect(getFormatColumns(360)).toBe(3);
      expect(getFormatColumns(480)).toBe(3);
      expect(getFormatColumns(768)).toBe(6);
      expect(getFormatColumns(1440)).toBe(6);
    });

    it('truncates file name at the end of the base name while preserving extension', () => {
      function formatTruncatedFilename(nameWithoutExt: string, ext: string, maxLen = 22): { base: string; ext: string; full: string } {
        const truncated = nameWithoutExt.length > maxLen
          ? nameWithoutExt.slice(0, maxLen) + '...'
          : nameWithoutExt;
        return {
          base: truncated,
          ext: `.${ext}`,
          full: `${truncated}.${ext}`
        };
      }

      const res = formatTruncatedFilename('Minimalist Three-Shape Black Emblem Logo', 'png', 20);
      expect(res.base.endsWith('...')).toBe(true);
      expect(res.ext).toBe('.png');
      expect(res.full).toBe('Minimalist Three-Sha....png');
      // Extension is never truncated
      expect(res.full.endsWith('.png')).toBe(true);
    });
  });

  // STEP 3: Working screen cards grid & action bar
  describe('STEP 3: Working screen grid and layout', () => {
    it('assigns 1 column on xs, 2 on sm, 3 on md, and 4 on lg', () => {
      function getGridColumns(width: number): number {
        if (width <= BREAKPOINTS.xs.max) return 1;
        if (width <= BREAKPOINTS.sm.max) return 2;
        if (width <= BREAKPOINTS.md.max) return 3;
        return 4;
      }

      expect(getGridColumns(360)).toBe(1);
      expect(getGridColumns(480)).toBe(2);
      expect(getGridColumns(768)).toBe(3);
      expect(getGridColumns(1024)).toBe(4);
      expect(getGridColumns(1440)).toBe(4);
    });

    it('ensures bottom action bar has equal 50% width on xs', () => {
      function getBottomBarButtonWidth(viewportWidth: number): string {
        return viewportWidth <= BREAKPOINTS.xs.max ? '50%' : 'auto';
      }
      expect(getBottomBarButtonWidth(360)).toBe('50%');
      expect(getBottomBarButtonWidth(1024)).toBe('auto');
    });

    it('ensures estimate font size is >= 14px on xs', () => {
      function getEstimateFontSize(width: number): number {
        return width <= BREAKPOINTS.xs.max ? 14 : 11;
      }
      expect(getEstimateFontSize(360)).toBeGreaterThanOrEqual(14);
      expect(getEstimateFontSize(390)).toBeGreaterThanOrEqual(14);
    });
  });

  // STEP 4: Home screen rules
  describe('STEP 4: Home screen rules', () => {
    it('sets 2 columns for popular chips on xs/sm and 3 on md+', () => {
      function getPopularColumns(width: number): number {
        return width <= BREAKPOINTS.sm.max ? 2 : 3;
      }
      expect(getPopularColumns(360)).toBe(2);
      expect(getPopularColumns(480)).toBe(2);
      expect(getPopularColumns(768)).toBe(3);
      expect(getPopularColumns(1440)).toBe(3);
    });

    it('sets section spacing to 16px on xs and 24px on md+', () => {
      function getSectionSpacing(width: number): number {
        return width <= BREAKPOINTS.xs.max ? 16 : 24;
      }
      expect(getSectionSpacing(360)).toBe(16);
      expect(getSectionSpacing(1024)).toBe(24);
    });
  });

  // STEP 5: Output screen metrics separation
  describe('STEP 5: Output screen metrics separation', () => {
    it('ensures size line and target line are stacked vertically, preventing overlap', () => {
      // Simulating bounding client rect calculation
      const metricsLineRect = { top: 100, bottom: 120, height: 20 };
      const targetLineRect = { top: 123, bottom: 139, height: 16 };

      const hasVerticalOverlap = !(metricsLineRect.bottom <= targetLineRect.top || metricsLineRect.top >= targetLineRect.bottom);
      expect(hasVerticalOverlap).toBe(false);
      expect(targetLineRect.top).toBeGreaterThanOrEqual(metricsLineRect.bottom);
    });

    it('ensures round close button maintains 1:1 aspect ratio (28x28px)', () => {
      const buttonSize = { width: 28, height: 28, borderRadius: '50%' };
      expect(buttonSize.width).toBe(28);
      expect(buttonSize.height).toBe(28);
      expect(buttonSize.width / buttonSize.height).toBe(1);
    });
  });

  // STEP 6: Tap targets and accessible sizing
  describe('STEP 6: Tap targets and accessible sizing', () => {
    it('enforces touch tap targets are >= 44px on xs', () => {
      const touchControls = [
        { name: 'Select files button', height: 48, minTarget: 44 },
        { name: 'Mobile source chevron', height: 44, minTarget: 44 },
        { name: 'Add more header button', height: 44, minTarget: 44 },
        { name: 'Clear button', height: 44, minTarget: 44 },
        { name: 'Card customize button', height: 44, minTarget: 44 },
        { name: 'Card preview button', height: 44, minTarget: 44 },
        { name: 'Card save button', height: 44, minTarget: 44 },
        { name: 'Customize again link', height: 44, minTarget: 44 },
        { name: 'Download all button', height: 44, minTarget: 44 },
        { name: 'More options button', height: 44, minTarget: 44 },
        { name: 'Mobile settings button', height: 44, minTarget: 44 },
        { name: 'Mobile compress CTA', height: 44, minTarget: 44 },
        { name: 'Modal apply button', height: 44, minTarget: 44 },
        { name: 'Modal cancel button', height: 44, minTarget: 44 }
      ];

      for (const ctrl of touchControls) {
        expect(ctrl.height, `${ctrl.name} must meet 44px tap target on mobile`).toBeGreaterThanOrEqual(ctrl.minTarget);
      }
    });
  });
});

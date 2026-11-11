// @vitest-environment jsdom
// apps/tool-color-studio/src/services/contrast.service.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ContrastService } from './contrast.service';
import { ColorEngineService } from './color-engine.service';

describe('ContrastService (Phase 7 - Color Contrast Checker Engine)', () => {
  let service: ContrastService;

  beforeEach(() => {
    service = new ContrastService();
  });

  describe('1. Relative Luminance Calculation (WCAG 2.2)', () => {
    it('should calculate relative luminance of pure black as 0.0', () => {
      const lum = service.calculateLuminance('#000000');
      expect(lum).toBeCloseTo(0.0, 4);
    });

    it('should calculate relative luminance of pure white as 1.0', () => {
      const lum = service.calculateLuminance('#FFFFFF');
      expect(lum).toBeCloseTo(1.0, 4);
    });

    it('should calculate standard sRGB relative luminance for primary colors', () => {
      // Red: 0.2126
      expect(service.calculateLuminance('#FF0000')).toBeCloseTo(0.2126, 3);
      // Green: 0.7152
      expect(service.calculateLuminance('#00FF00')).toBeCloseTo(0.7152, 3);
      // Blue: 0.0722
      expect(service.calculateLuminance('#0000FF')).toBeCloseTo(0.0722, 3);
    });
  });

  describe('2. Contrast Ratio Calculation & WCAG Reference Examples', () => {
    it('should compute exact 21.00:1 ratio for black text on white background', () => {
      const ratio = service.calculateContrastRatio('#000000', '#FFFFFF');
      expect(ratio).toBe(21.0);
    });

    it('should compute exact 21.00:1 ratio for white text on black background', () => {
      const ratio = service.calculateContrastRatio('#FFFFFF', '#000000');
      expect(ratio).toBe(21.0);
    });

    it('should compute exact 1.00:1 ratio for identical colors', () => {
      expect(service.calculateContrastRatio('#FFFFFF', '#FFFFFF')).toBe(1.0);
      expect(service.calculateContrastRatio('#3B82F6', '#3B82F6')).toBe(1.0);
    });

    it('should accurately verify known WCAG boundary references', () => {
      // #595959 on #FFFFFF is ~7.00:1 (AAA threshold)
      const ratio59 = service.calculateContrastRatio('#595959', '#FFFFFF');
      expect(ratio59).toBeGreaterThanOrEqual(6.98);
      expect(ratio59).toBeLessThanOrEqual(7.05);

      // #767676 on #FFFFFF is ~4.54:1 (AA threshold)
      const ratio76 = service.calculateContrastRatio('#767676', '#FFFFFF');
      expect(ratio76).toBeGreaterThanOrEqual(4.5);
      expect(ratio76).toBeLessThanOrEqual(4.6);

      // #777777 on #FFFFFF is ~4.48:1 (fails normal AA, passes large AA)
      const ratio77 = service.calculateContrastRatio('#777777', '#FFFFFF');
      expect(ratio77).toBeLessThan(4.5);
      expect(ratio77).toBeGreaterThan(4.4);
    });
  });

  describe('3. Alpha Transparency Compositing', () => {
    it('should composite semi-transparent black over white before calculating contrast', () => {
      // 50% black over white should yield gray (#808080 equivalent)
      const ratio = service.calculateContrastRatio(
        { r: 0, g: 0, b: 0, a: 0.5 },
        '#FFFFFF'
      );
      // #808080 on #FFFFFF has ratio ~3.98:1
      expect(ratio).toBeGreaterThan(3.8);
      expect(ratio).toBeLessThan(4.2);
    });

    it('should handle fully transparent foreground', () => {
      const ratio = service.calculateContrastRatio(
        { r: 0, g: 0, b: 0, a: 0 },
        '#FFFFFF'
      );
      // Compositing 0% black over white gives pure white, ratio 1.0:1
      expect(ratio).toBe(1.0);
    });

    it('should composite semi-transparent background over white', () => {
      const composited = service.compositeColor(
        { r: 255, g: 255, b: 255, a: 1 },
        { r: 0, g: 0, b: 0, a: 0.5 }
      );
      expect(composited.a).toBe(1);
      expect(composited.r).toBe(255);
    });
  });

  describe('4. WCAG 2.2 Conformance Evaluation', () => {
    it('should evaluate Level AAA compliance for high-contrast pairs', () => {
      const evalResult = service.evaluateWcag('#0F172A', '#FFFFFF');
      expect(evalResult.grade).toBe('AAA');
      expect(evalResult.rating).toBe('excellent');
      expect(evalResult.aaNormal).toBe(true);
      expect(evalResult.aaLarge).toBe(true);
      expect(evalResult.aaaNormal).toBe(true);
      expect(evalResult.aaaLarge).toBe(true);
      expect(evalResult.uiComponent).toBe(true);
    });

    it('should evaluate Level AA compliance for mid-contrast pairs (4.5 to 6.99:1)', () => {
      const evalResult = service.evaluateWcag('#767676', '#FFFFFF');
      expect(evalResult.grade).toBe('AA');
      expect(evalResult.rating).toBe('good');
      expect(evalResult.aaNormal).toBe(true);
      expect(evalResult.aaLarge).toBe(true);
      expect(evalResult.aaaNormal).toBe(false); // Fails normal AAA!
      expect(evalResult.aaaLarge).toBe(true);
      expect(evalResult.uiComponent).toBe(true);
    });

    it('should separate normal text from large text and UI components', () => {
      // #777777 on #FFFFFF ratio is ~4.48:1
      const evalResult = service.evaluateWcag('#777777', '#FFFFFF');
      expect(evalResult.aaNormal).toBe(false); // Fails normal text AA
      expect(evalResult.aaLarge).toBe(true);  // Passes large text AA
      expect(evalResult.uiComponent).toBe(true); // Passes non-text UI components
      expect(evalResult.grade).toBe('Fail'); // Overall normal grade is Fail
      expect(evalResult.rating).toBe('needs-improvement');
    });

    it('should evaluate Fail for low-contrast pairs below 3.0:1', () => {
      const evalResult = service.evaluateWcag('#CCCCCC', '#FFFFFF');
      expect(evalResult.grade).toBe('Fail');
      expect(evalResult.rating).toBe('insufficient');
      expect(evalResult.aaNormal).toBe(false);
      expect(evalResult.aaLarge).toBe(false);
      expect(evalResult.uiComponent).toBe(false);
    });
  });

  describe('5. Accessible Color Suggestions Engine', () => {
    it('should generate verified accessible suggestions for failing color pairs', () => {
      // #888888 on #FFFFFF fails normal AA (ratio ~3.5:1)
      const suggestions = service.generateSuggestions('#888888', '#FFFFFF', 'AA');
      expect(suggestions.length).toBeGreaterThan(0);

      // Verify each suggestion actually meets target AA threshold (>= 4.5:1)
      for (const sugg of suggestions) {
        const testRatio = service.calculateContrastRatio(
          sugg.targetRole === 'fg' ? sugg.hex : '#888888',
          sugg.targetRole === 'bg' ? sugg.hex : '#FFFFFF'
        );
        expect(testRatio).toBeGreaterThanOrEqual(4.5);
      }
    });

    it('should generate AAA suggestions meeting 7.0:1 threshold', () => {
      const suggestions = service.generateSuggestions('#767676', '#FFFFFF', 'AAA');
      expect(suggestions.length).toBeGreaterThan(0);

      for (const sugg of suggestions) {
        const testRatio = service.calculateContrastRatio(
          sugg.targetRole === 'fg' ? sugg.hex : '#767676',
          sugg.targetRole === 'bg' ? sugg.hex : '#FFFFFF'
        );
        expect(testRatio).toBeGreaterThanOrEqual(7.0);
      }
    });
  });

  describe('6. Studio Gradient Multi-Point Contrast Analysis', () => {
    it('should analyze text contrast across all gradient stops and warn if contrast fails on any stop', () => {
      const stops = [
        { color: '#FFFFFF', position: 0 },
        { color: '#8B5CF6', position: 50 },
        { color: '#0F172A', position: 100 }
      ];

      // Text is white #FFFFFF -> contrast on stop 1 (#FFFFFF) is 1.0:1 (FAIL)
      const report = service.evaluateGradientContrast('#FFFFFF', stops);
      expect(report.allStopsPassAA).toBe(false);
      expect(report.minRatio).toBe(1.0);
      expect(report.warning).toBeTruthy();
      expect(report.warning).toContain('Warning: A single solid-color contrast result cannot guarantee');
    });

    it('should confirm compliance when text passes on all gradient stops', () => {
      const stops = [
        { color: '#FFFFFF', position: 0 },
        { color: '#E2E8F0', position: 50 },
        { color: '#F8FAFC', position: 100 }
      ];

      // Dark text #0F172A on light stops
      const report = service.evaluateGradientContrast('#0F172A', stops);
      expect(report.allStopsPassAA).toBe(true);
      expect(report.minRatio).toBeGreaterThanOrEqual(4.5);
      expect(report.warning).toBeNull();
    });
  });
});


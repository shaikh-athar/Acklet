// @vitest-environment jsdom
// apps/tool-color-studio/src/services/color-studio-integration.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ColorStudioStateService } from './color-studio-state.service';
import { ColorEngineService } from './color-engine.service';
import { PaletteService } from './palette.service';
import { GradientService } from './gradient.service';
import { ContrastService } from './contrast.service';
import { ColorBlindnessService } from './color-blindness.service';
import { ExportService } from './export.service';
import {
  STORAGE_KEY_SELECTED,
  STORAGE_KEY_HISTORY,
  STORAGE_KEY_SAVED,
  STORAGE_KEY_PALETTE,
  STORAGE_KEY_SAVED_PALETTES,
  STORAGE_KEY_SAVED_GRADIENTS
} from './color-state.service';

describe('Acklet Color Studio — Complete System Integration & End-to-End Workflows (Phase 10)', () => {
  let state: ColorStudioStateService;
  let engine: ColorEngineService;
  let paletteService: PaletteService;
  let gradientService: GradientService;
  let contrastService: ContrastService;
  let cvdService: ColorBlindnessService;
  let exportService: ExportService;

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    // Polyfill ImageData in JSDOM if missing
    if (typeof globalThis.ImageData === 'undefined') {
      (globalThis as any).ImageData = class ImageData {
        width: number;
        height: number;
        data: Uint8ClampedArray;
        constructor(w: number, h: number) {
          this.width = w;
          this.height = h;
          this.data = new Uint8ClampedArray(w * h * 4);
        }
      };
    }

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });

    // Mock HTMLCanvasElement.prototype.getContext
    const mockContext = {
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      roundRect: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      drawImage: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn().mockImplementation((x, y, w, h) => {
        const data = new Uint8ClampedArray(w * h * 4);
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 225;
          data[i + 1] = 29;
          data[i + 2] = 72;
          data[i + 3] = 255;
        }
        return { data, width: w, height: h };
      }),
      putImageData: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 70 }),
      createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
      createRadialGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
      createConicGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: '',
      textBaseline: ''
    };
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockContext as any);

    state = new ColorStudioStateService();
    engine = new ColorEngineService();
    paletteService = new PaletteService();
    gradientService = new GradientService();
    contrastService = new ContrastService();
    cvdService = new ColorBlindnessService();
    exportService = new ExportService();
  });

  // ── 1. Shared Color State & Persistence Architecture ──────────────────────
  describe('1. Shared Color State & Persistence Architecture', () => {
    it('should synchronize selected color across services and persist to LocalStorage', () => {
      const testHex = '#3B82F6';
      state.setSelectedColor(testHex);

      expect(state.selectedColor()).toBe(testHex);
      expect(state.activeColor()).toBe(testHex);

      // Verify localStorage persistence
      const stored = localStorage.getItem(STORAGE_KEY_SELECTED);
      expect(stored).toBe(testHex);

      // Verify history tracking
      expect(state.colorHistory()).toContain(testHex);
      const storedHistory = JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY) || '[]');
      expect(storedHistory).toContain(testHex);
    });

    it('should manage saved bookmarked colors with persistence', () => {
      state.clearSavedColors();
      state.saveColor('#10B981', 'Emerald');
      state.saveColor('#F59E0B', 'Amber');

      expect(state.savedColors()).toHaveLength(2);
      expect(state.savedColors()).toContain('#10B981');
      expect(state.savedColors()).toContain('#F59E0B');

      // Verify LocalStorage serialization
      const raw = localStorage.getItem(STORAGE_KEY_SAVED);
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed).toHaveLength(2);
      expect(parsed.some((p: any) => p.hex === '#10B981' && p.name === 'Emerald')).toBe(true);
      expect(parsed.some((p: any) => p.hex === '#F59E0B' && p.name === 'Amber')).toBe(true);

      // Toggle / Remove
      state.toggleSavedColor('#10B981');
      expect(state.savedColors()).toHaveLength(1);
      expect(state.savedColors()).not.toContain('#10B981');
    });

    it('should preserve all module states during navigation transitions', () => {
      // Set distinct states across different modules
      state.setSelectedColor('#E11D48');
      state.setContrastFg('#0F172A');
      state.setContrastBg('#F8FAFC');
      state.setSharedPalette(['#E11D48', '#3B82F6', '#10B981', '#F59E0B']);

      // Navigate through all modules
      const modules: Array<'picker' | 'extractor' | 'gradient' | 'contrast' | 'palette' | 'simulator'> = [
        'picker', 'extractor', 'gradient', 'contrast', 'palette', 'simulator', 'picker'
      ];

      modules.forEach(m => {
        state.setActiveModule(m);
        expect(state.activeModule()).toBe(m);
        // Verify state is completely preserved and not reset
        expect(state.selectedColor()).toBe('#E11D48');
        expect(state.contrastFg()).toBe('#0F172A');
        expect(state.contrastBg()).toBe('#F8FAFC');
        expect(state.sharedColorPalettes()).toEqual(['#E11D48', '#3B82F6', '#10B981', '#F59E0B']);
      });
    });

    it('should handle corrupted or malformed LocalStorage gracefully without crashing', () => {
      localStorage.setItem(STORAGE_KEY_SELECTED, 'not-a-valid-json-or-hex');
      localStorage.setItem(STORAGE_KEY_SAVED, '{ invalid json');
      localStorage.setItem(STORAGE_KEY_HISTORY, '[1, 2, 3]');

      // Creating a fresh state service should not throw and fall back to safe defaults
      expect(() => new ColorStudioStateService()).not.toThrow();
      const freshState = new ColorStudioStateService();
      expect(freshState.selectedColor()).toBe('#E11D48');
      expect(freshState.savedColors()).toBeDefined();
    });
  });

  // ── 2. Cross-Module Workflows ─────────────────────────────────────────────
  describe('2. Cross-Module Workflows', () => {

    it('Workflow A: Color Picker → Palette Generator → Gradient Generator → Contrast Checker', () => {
      // 1. User picks brand color in Color Picker
      const brandColor = '#3B82F6';
      state.setSelectedColor(brandColor);

      // 2. Dispatch to Palette Generator and generate Analogous scheme
      const analogousColors = paletteService.generatePalette(brandColor, 'analogous', 5);
      expect(analogousColors).toHaveLength(5);
      expect(analogousColors.some(c => c.toUpperCase() === brandColor.toUpperCase())).toBe(true);

      // 3. Dispatch palette to Gradient Builder
      state.populateGradientFromPalette(analogousColors);
      expect(state.activeModule()).toBe('gradient');
      const stops = state.gradientConfig().stops;
      expect(stops).toHaveLength(5);
      expect(stops[0].position).toBe(0);
      expect(stops[4].position).toBe(100);

      // Generate CSS Gradient
      const cssGradient = gradientService.generateCss(state.gradientConfig());
      expect(cssGradient).toContain('linear-gradient(');
      expect(cssGradient).toContain('#3B82F6');

      // 4. Dispatch first two swatches into Contrast Checker to verify accessibility
      state.setContrastFg(stops[0].color);
      state.setContrastBg(stops[4].color);
      state.setActiveModule('contrast');

      const evaluation = contrastService.evaluateWcag(state.contrastFg(), state.contrastBg());
      expect(evaluation.ratio).toBeGreaterThanOrEqual(1);
      expect(evaluation.grade).toMatch(/AAA|AA|FAIL/i);
    });

    it('Workflow B: Image Extractor → Palette Generator → Color Blindness Simulator', () => {
      // 1. Simulate extracting dominant colors from uploaded photo
      const mockImageData = new ImageData(100, 100);
      // Fill alternating red and green pixels
      for (let i = 0; i < mockImageData.data.length; i += 8) {
        mockImageData.data[i] = 225; mockImageData.data[i + 1] = 29; mockImageData.data[i + 2] = 72; mockImageData.data[i + 3] = 255;
        mockImageData.data[i + 4] = 16; mockImageData.data[i + 5] = 185; mockImageData.data[i + 6] = 129; mockImageData.data[i + 7] = 255;
      }

      const extracted = engine.extractColorsFromImageData(mockImageData, 5);
      expect(extracted.length).toBeGreaterThanOrEqual(1);
      const extractedHexes = extracted.map(e => e.hex);

      // 2. Load extracted colors into Shared Palette
      state.setSharedPalette(extractedHexes);
      expect(state.sharedColorPalettes()).toEqual(extractedHexes);

      // 3. Dispatch extracted palette to Color Blindness Simulator
      state.sendPaletteToSimulator(extractedHexes);
      expect(state.activeModule()).toBe('simulator');

      // 4. Audit palette under Protanopia and Deuteranopia
      const protanAudit = cvdService.simulatePalette(extractedHexes, 'protanopia');
      expect(protanAudit.items).toHaveLength(extractedHexes.length);
      expect(protanAudit.items[0].simulatedHex).toBeTruthy();

      const deuterAudit = cvdService.simulatePalette(extractedHexes, 'deuteranopia');
      expect(deuterAudit.items).toHaveLength(extractedHexes.length);
    });

    it('Workflow C: Contrast Checker Auto-Fix → Color Picker → Shared Working Palette', () => {
      // Low-contrast pair: Red on Orange
      const poorFg = '#EF4444';
      const poorBg = '#F97316';
      state.setContrastFg(poorFg);
      state.setContrastBg(poorBg);

      const poorEvaluation = contrastService.evaluateWcag(poorFg, poorBg);
      expect(poorEvaluation.ratio).toBeLessThan(3.0);
      expect(poorEvaluation.aaNormal).toBe(false);

      // Auto-fix to satisfy Level AA (>= 4.5:1)
      const fixedFg = contrastService.autoFixContrast(poorFg, poorBg, 'AA');
      const fixedEvaluation = contrastService.evaluateWcag(fixedFg, poorBg);
      expect(fixedEvaluation.ratio).toBeGreaterThanOrEqual(4.5);
      expect(fixedEvaluation.aaNormal).toBe(true);

      // Send optimized color to Color Picker
      state.sendToPicker(fixedFg);
      expect(state.activeModule()).toBe('picker');
      expect(state.selectedColor()).toBe(fixedFg);

      // Append to Shared Color Bar
      state.setSharedPalette([fixedFg, poorBg]);
      expect(state.sharedColorPalettes()).toContain(fixedFg);
    });

    it('Workflow D: Simulator → Color Picker → Gradient Builder Stops', () => {
      // 1. In Simulator, inspect a transformed color
      const original = '#E11D48';
      const simProtan = cvdService.simulateHex(original, 'protanopia');
      expect(engine.isValidHex(simProtan)).toBe(true);

      // 2. Send simulated color to Color Picker
      state.sendToPicker(simProtan);
      expect(state.selectedColor()).toBe(simProtan);
      expect(state.activeModule()).toBe('picker');

      // 3. Insert simulated color into active Gradient
      state.gradientConfig.update(c => ({
        ...c,
        stops: [
          { id: 'stop-1', color: simProtan, position: 0 },
          { id: 'stop-2', color: '#000000', position: 100 }
        ]
      }));
      state.setActiveModule('gradient');

      expect(state.gradientConfig().stops[0].color).toBe(simProtan);
      const css = gradientService.generateCss(state.gradientConfig());
      expect(css).toContain(simProtan);
    });
  });

  // ── 3. Format Compatibility & Multi-Engine Exporter Matrix ────────────────
  describe('3. Multi-Format Export Architecture Matrix', () => {
    const sampleItems = [
      { id: '1', hex: '#E11D48', locked: false, name: 'Rose Red' },
      { id: '2', hex: '#3B82F6', locked: false, name: 'Sky Azure' },
      { id: '3', hex: '#10B981', locked: false, name: 'Emerald' }
    ];

    it('Format 1: CSS Variables Exporter (Palette & Contrast)', () => {
      const paletteCss = paletteService.generateCss(sampleItems);
      expect(paletteCss).toContain(':root {');
      expect(paletteCss).toContain('--color-1: #E11D48;');
      expect(paletteCss).toContain('--color-2: #3B82F6;');

      const contrastCss = exportService.generateContrastCss('#0F172A', '#FFFFFF', 15.8, 'AAA');
      expect(contrastCss).toContain('--color-text: #0F172A;');
      expect(contrastCss).toContain('--color-bg: #FFFFFF;');
      expect(contrastCss).toContain('--wcag-grade: "AAA";');
    });

    it('Format 2: Tailwind CSS Configuration Snippet', () => {
      const tw = paletteService.generateTailwind(sampleItems);
      expect(tw).toContain('module.exports = {');
      expect(tw).toContain("'color-1': '#E11D48'");
      expect(tw).toContain("'color-2': '#3B82F6'");
      expect(tw).toContain("'color-3': '#10B981'");
    });

    it('Format 3: JSON Data Structures (Palette, Gradient, Contrast, Simulation)', () => {
      // Palette JSON
      const palJson = JSON.parse(paletteService.generateJson(sampleItems, 'Brand Palette'));
      expect(palJson.name).toBe('Brand Palette');
      expect(palJson.colors).toHaveLength(3);

      // Gradient JSON
      const gradConfig = {
        type: 'linear' as const,
        angle: 90,
        stops: [{ id: '1', color: '#E11D48', position: 0 }, { id: '2', color: '#3B82F6', position: 100 }]
      };
      const gradJson = JSON.parse(gradientService.generateJson(gradConfig));
      expect(gradJson.type).toBe('linear');
      expect(gradJson.stops).toHaveLength(2);

      // Contrast JSON
      const evalResult = contrastService.evaluateWcag('#0F172A', '#FFFFFF');
      const contrastJson = JSON.parse(exportService.generateContrastJson(evalResult));
      expect(contrastJson.standard).toBe('WCAG 2.2');
      expect(contrastJson.evaluation.overallGrade).toBe('AAA');

      // Simulation JSON
      const simResult = cvdService.simulatePalette(['#E11D48', '#3B82F6'], 'protanopia');
      const simJson = JSON.parse(cvdService.generatePaletteSimulationJson(simResult, 'Audit Palette'));
      expect(simJson.simulationMode).toBe('protanopia');
      expect(simJson.swatches).toHaveLength(2);
    });

    it('Format 4: GIMP & Inkscape GPL Palette File Format', () => {
      const gpl = paletteService.generateGpl(sampleItems, 'App Theme');
      expect(gpl).toContain('GIMP Palette');
      expect(gpl).toContain('Name: App Theme');
      expect(gpl).toContain('Columns: 3');
      expect(gpl).toMatch(/225\s+29\s+72\s+Rose Red/);
    });

    it('Format 5: Adobe Swatch Exchange (ASE) Binary 1.0 Specification', () => {
      const aseBytes = paletteService.generateAse(sampleItems, 'Adobe Suite Palette');
      expect(aseBytes).toBeInstanceOf(Uint8Array);
      // Magic signature: 'ASEF' (0x41, 0x53, 0x45, 0x46)
      expect(aseBytes[0]).toBe(0x41);
      expect(aseBytes[1]).toBe(0x53);
      expect(aseBytes[2]).toBe(0x45);
      expect(aseBytes[3]).toBe(0x46);
      // Version: 1.0 (major=1, minor=0)
      expect(aseBytes[4]).toBe(0);
      expect(aseBytes[5]).toBe(1);
    });

    it('Format 6: Offscreen Canvas Renderers (PNG High-Resolution Generation)', () => {
      // Palette Canvas
      const palCanvas = paletteService.renderToCanvas(sampleItems, 1200, 420);
      expect(palCanvas).toBeDefined();
      expect(palCanvas?.width).toBe(1200);
      expect(palCanvas?.height).toBe(420);

      // Gradient Canvas
      const gradCanvas = gradientService.renderGradientToCanvas({
        type: 'linear',
        angle: 45,
        stops: [{ id: '1', color: '#E11D48', position: 0 }, { id: '2', color: '#3B82F6', position: 100 }]
      }, 800, 400);
      expect(gradCanvas).toBeDefined();
      expect(gradCanvas?.width).toBe(800);
      expect(gradCanvas?.height).toBe(400);
    });

    it('Format 7: Printable PDF & Markdown Documentation Reports', () => {
      const evalResult = contrastService.evaluateWcag('#0F172A', '#FFFFFF');
      const mdReport = exportService.generateContrastReport(evalResult);
      expect(mdReport).toContain('# WCAG 2.2 Accessibility Evaluation Report');
      expect(mdReport).toContain('Normal Text (Level AA)');
      expect(mdReport).toContain('Normal Text (Level AAA)');

      const simResult = cvdService.simulatePalette(['#E11D48', '#3B82F6'], 'protanopia');
      const cvdReport = cvdService.generateReportMarkdown(simResult, 'Corporate Brand');
      expect(cvdReport).toContain('# Color Vision Deficiency Simulation Report');
      expect(cvdReport).toContain('Protanopia');
    });
  });

  // ── 4. Edge Cases & Robustness ────────────────────────────────────────────
  describe('4. Edge Cases & Robustness', () => {
    it('should sanitize invalid color inputs and fall back to valid colors', () => {
      const clean = engine.normalizeHex('invalid');
      expect(clean).toBe('#000000'); // default fallback

      const parsed = engine.parseColor('gibberish');
      expect(parsed.hex).toBe('#E11D48');
    });

    it('should clamp out-of-bounds RGB, HSL, HSV, and CMYK channels', () => {
      const clampedRgb = engine.fromRgb({ r: 999, g: -50, b: 300 });
      expect(clampedRgb.rgb.r).toBe(255);
      expect(clampedRgb.rgb.g).toBe(0);
      expect(clampedRgb.rgb.b).toBe(255);

      const clampedHsl = engine.fromHsl({ h: 750, s: 150, l: -20 });
      expect(clampedHsl.hsl.h).toBe(30); // 750 % 360
      expect(clampedHsl.hsl.s).toBe(100);
      expect(clampedHsl.hsl.l).toBe(0);
    });

    it('should handle zero-luminance and identical-luminance colors without division by zero', () => {
      const ratio = contrastService.calculateContrastRatio('#000000', '#000000');
      expect(ratio).toBe(1.0);

      const ratioWhite = contrastService.calculateContrastRatio('#FFFFFF', '#FFFFFF');
      expect(ratioWhite).toBe(1.0);
    });

    it('should handle transparent alpha compositing correctly', () => {
      // 50% black over pure white should equal neutral gray (128, 128, 128)
      const composite = contrastService.compositeOver({ r: 0, g: 0, b: 0, a: 0.5 }, { r: 255, g: 255, b: 255 });
      expect(Math.abs(composite.r - 128)).toBeLessThanOrEqual(1);
      expect(Math.abs(composite.g - 128)).toBeLessThanOrEqual(1);
      expect(Math.abs(composite.b - 128)).toBeLessThanOrEqual(1);
    });

    it('should prevent invalid gradient stop removal below the minimum of 2 stops', () => {
      const twoStops = [
        { id: '1', color: '#E11D48', position: 0 },
        { id: '2', color: '#3B82F6', position: 100 }
      ];
      const result = gradientService.removeStop(twoStops, '1');
      expect(result).toHaveLength(2); // must not remove
    });

    it('should prevent palette removal below the minimum of 3 swatches', () => {
      const threeItems = paletteService.createPaletteItems(['#E11D48', '#3B82F6', '#10B981']);
      const result = paletteService.removeColor(threeItems, threeItems[0].id);
      expect(result).toHaveLength(3); // must not drop below 3
    });
  });
});

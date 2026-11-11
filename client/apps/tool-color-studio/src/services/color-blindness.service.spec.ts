// @vitest-environment jsdom
// apps/tool-color-studio/src/services/color-blindness.service.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ColorBlindnessService, CVD_MATRICES, CVD_PROFILES } from './color-blindness.service';
import { ColorEngineService } from './color-engine.service';
import { ExportService } from './export.service';

describe('ColorBlindnessService (Phase 9 - CVD Simulation Engine)', () => {
  let service: ColorBlindnessService;
  let engine: ColorEngineService;
  let exportService: ExportService;

  beforeEach(() => {
    engine = new ColorEngineService();
    exportService = new ExportService();
    service = new ColorBlindnessService();

    // Polyfill ImageData in JSDOM environment if missing
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

    // Mock HTMLCanvasElement.prototype.getContext for JSDOM canvas tests
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
      getImageData: vi.fn().mockImplementation((x, y, w, h) => {
        const data = new Uint8ClampedArray(w * h * 4);
        // Fill sample opaque red pixels
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 255;
          data[i + 1] = 0;
          data[i + 2] = 0;
          data[i + 3] = 255;
        }
        return { data, width: w, height: h };
      }),
      putImageData: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 70 }),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: '',
      textBaseline: '',
      shadowColor: '',
      shadowBlur: 0
    };
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockContext as any);
  });

  // ── 1. Color Vision Deficiency Transformations ────────────────────────────
  describe('1. Color Vision Deficiency Transformations', () => {
    it('should provide comprehensive profile metadata for all 8 deficiencies plus normal vision', () => {
      expect(service.profiles).toHaveLength(9);
      const types = service.profiles.map(p => p.type);
      expect(types).toContain('normal');
      expect(types).toContain('protanopia');
      expect(types).toContain('deuteranopia');
      expect(types).toContain('tritanopia');
      expect(types).toContain('achromatopsia');
      expect(types).toContain('protanomaly');
      expect(types).toContain('deuteranomaly');
      expect(types).toContain('tritanomaly');
      expect(types).toContain('achromatomaly');
    });

    it('should transform pure red (#FF0000) under Protanopia into a brownish/olive hue', () => {
      const sim = service.simulateHex('#FF0000', 'protanopia');
      expect(engine.isValidHex(sim)).toBe(true);
      const rgb = engine.hexToRgb(sim);
      // Under protanopia, R and G values become closely matched
      expect(Math.abs(rgb.r - rgb.g)).toBeLessThanOrEqual(5);
      expect(rgb.b).toBeLessThan(10);
    });

    it('should transform pure green (#00FF00) under Deuteranopia into yellowish/khaki hue', () => {
      const sim = service.simulateHex('#00FF00', 'deuteranopia');
      expect(engine.isValidHex(sim)).toBe(true);
      const rgb = engine.hexToRgb(sim);
      // Under deuteranopia, green shifts towards yellow where red signal increases
      expect(rgb.r).toBeGreaterThan(100);
      expect(rgb.g).toBeGreaterThan(100);
    });

    it('should transform pure blue (#0000FF) under Tritanopia towards cyan/teal', () => {
      const sim = service.simulateHex('#0000FF', 'tritanopia');
      expect(engine.isValidHex(sim)).toBe(true);
      const rgb = engine.hexToRgb(sim);
      // Under tritanopia, green signal increases significantly for blue
      expect(rgb.g).toBeGreaterThan(80);
      expect(rgb.b).toBeGreaterThan(100);
    });

    it('should convert any color under Achromatopsia to pure grayscale where R=G=B', () => {
      const colors = ['#E11D48', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
      colors.forEach(hex => {
        const sim = service.simulateHex(hex, 'achromatopsia');
        const rgb = engine.hexToRgb(sim);
        // All channels must be identical in grayscale
        expect(rgb.r).toBe(rgb.g);
        expect(rgb.g).toBe(rgb.b);
      });
    });

    it('should preserve neutral grays across all deficiency models', () => {
      const gray = '#808080';
      service.profiles.forEach(p => {
        const sim = service.simulateHex(gray, p.type);
        const rgb = engine.hexToRgb(sim);
        // Neutral gray has equal R, G, B channels and should remain within 3 units of each other
        expect(Math.abs(rgb.r - rgb.g)).toBeLessThanOrEqual(3);
        expect(Math.abs(rgb.g - rgb.b)).toBeLessThanOrEqual(3);
      });
    });
  });

  // ── 2. Image Canvas Pixel Processing & Transparency ───────────────────────
  describe('2. Canvas Pixel Processing & Transparency', () => {
    it('should preserve dimensions and alpha transparency in simulateImageData', () => {
      const width = 4;
      const height = 4;
      const source = new ImageData(width, height);

      // Pixel 0: Opaque red
      source.data[0] = 255;
      source.data[1] = 0;
      source.data[2] = 0;
      source.data[3] = 255;

      // Pixel 1: Completely transparent red
      source.data[4] = 255;
      source.data[5] = 0;
      source.data[6] = 0;
      source.data[7] = 0;

      // Pixel 2: Semi-transparent blue
      source.data[8] = 0;
      source.data[9] = 0;
      source.data[10] = 255;
      source.data[11] = 128;

      const target = service.simulateImageData(source, 'protanopia');

      expect(target.width).toBe(width);
      expect(target.height).toBe(height);

      // Pixel 0: Opaque alpha preserved
      expect(target.data[3]).toBe(255);

      // Pixel 1: Full transparency preserved
      expect(target.data[7]).toBe(0);

      // Pixel 2: Semi-transparency preserved exactly
      expect(target.data[11]).toBe(128);
    });

    it('should simulate canvas contents and write to target canvas', () => {
      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = 100;
      srcCanvas.height = 80;

      const dstCanvas = document.createElement('canvas');

      const success = service.simulateCanvas(srcCanvas, dstCanvas, 'deuteranopia');
      expect(success).toBe(true);
      expect(dstCanvas.width).toBe(100);
      expect(dstCanvas.height).toBe(80);
    });

    it('should handle zero dimension canvas gracefully', () => {
      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = 0;
      srcCanvas.height = 0;
      const dstCanvas = document.createElement('canvas');

      const success = service.simulateCanvas(srcCanvas, dstCanvas, 'protanopia');
      expect(success).toBe(false);
    });
  });

  // ── 3. Split-Screen & Side-by-Side Comparison Renderers ───────────────────
  describe('3. Comparison Workspace Renderers', () => {
    it('should render split comparison with specified ratio and divider line', () => {
      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = 400;
      srcCanvas.height = 300;

      const simCanvas = document.createElement('canvas');
      simCanvas.width = 400;
      simCanvas.height = 300;

      const targetCanvas = document.createElement('canvas');

      service.renderSplitComparison(srcCanvas, simCanvas, 0.45, targetCanvas, {
        drawBadges: true,
        labelOriginal: 'Normal',
        labelSimulated: 'Protanopia'
      });

      expect(targetCanvas.width).toBe(400);
      expect(targetCanvas.height).toBe(300);
    });

    it('should render side-by-side comparison composite canvas', () => {
      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = 300;
      srcCanvas.height = 200;

      const simCanvas = document.createElement('canvas');
      simCanvas.width = 300;
      simCanvas.height = 200;

      const targetCanvas = document.createElement('canvas');

      service.renderSideBySideComparison(srcCanvas, simCanvas, targetCanvas, 'Original Vision', 'Simulated Vision');

      // Total width: 300 * 2 + gap(20) + padding(40) = 660
      expect(targetCanvas.width).toBe(660);
      // Total height: 200 + header(44) + padding(30) = 274
      expect(targetCanvas.height).toBe(274);
    });
  });

  // ── 4. Perceptual Color Science & CIELAB Delta E ──────────────────────────
  describe('4. Perceptual Color Science & CIELAB Delta E', () => {
    it('should accurately convert RGB to CIELAB coordinates', () => {
      const whiteLab = service.rgbToLab({ r: 255, g: 255, b: 255 });
      // Pure white has L* close to 100 and near-zero a*, b*
      expect(whiteLab.l).toBeGreaterThan(99);
      expect(Math.abs(whiteLab.a)).toBeLessThan(1);
      expect(Math.abs(whiteLab.b)).toBeLessThan(1);

      const blackLab = service.rgbToLab({ r: 0, g: 0, b: 0 });
      // Pure black has L* close to 0
      expect(blackLab.l).toBeLessThan(1);
    });

    it('should return Delta E = 0 for identical colors', () => {
      const delta = service.calculateDeltaE('#E11D48', '#E11D48');
      expect(delta).toBe(0);
    });

    it('should return a high perceptual difference for opposing colors (e.g. black vs white)', () => {
      const delta = service.calculateDeltaE('#000000', '#FFFFFF');
      expect(delta).toBeGreaterThan(95);
    });
  });

  // ── 5. Color Palette Simulation & Confusion Detection ─────────────────────
  describe('5. Palette Simulation & Confusion Detection', () => {
    it('should simulate an entire palette and flag indistinguishable color conflicts', () => {
      // Under achromatopsia (monochromacy), distinct colors with matching luminance collapse to near-identical grayscale (simulated Delta E < 11)
      const testPalette = ['#C026D3', '#0284C7', '#FFFFFF'];
      const result = service.simulatePalette(testPalette, 'achromatopsia');

      expect(result.type).toBe('achromatopsia');
      expect(result.items).toHaveLength(3);
      expect(result.items[0].simulatedHex).toBeTruthy();
      expect(result.items[1].simulatedHex).toBeTruthy();

      // Confusable pair detected between purple and blue
      expect(result.riskCount).toBeGreaterThanOrEqual(1);
      expect(result.confusionPairs.length).toBeGreaterThanOrEqual(1);
      expect(result.items[0].hasConflict).toBe(true);
    });

    it('should detect zero confusion when colors remain widely separated under simulation', () => {
      const safePalette = ['#000000', '#FFFFFF', '#0000FF'];
      const result = service.simulatePalette(safePalette, 'protanopia');
      expect(result.riskCount).toBe(0);
    });
  });

  // ── 6. Export Functionality ───────────────────────────────────────────────
  describe('6. Export Functionality', () => {
    it('should generate structured JSON audit reports', () => {
      const palette = ['#E11D48', '#3B82F6', '#10B981'];
      const result = service.simulatePalette(palette, 'deuteranopia');
      const jsonStr = service.generatePaletteSimulationJson(result, 'Test Brand Palette');

      const parsed = JSON.parse(jsonStr);
      expect(parsed.paletteName).toBe('Test Brand Palette');
      expect(parsed.simulationMode).toBe('deuteranopia');
      expect(parsed.swatches).toHaveLength(3);
    });

    it('should generate formatted Markdown accessibility reports', () => {
      const palette = ['#E11D48', '#3B82F6'];
      const result = service.simulatePalette(palette, 'tritanopia');
      const md = service.generateReportMarkdown(result, 'Web App Palette');

      expect(md).toContain('# Color Vision Deficiency Simulation Report');
      expect(md).toContain('Tritanopia');
      expect(md).toContain('`#E11D48`');
      expect(md).toContain('`#3B82F6`');
    });

    it('should trigger canvas download through toBlob', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;

      let blobCallback: ((b: Blob | null) => void) | null = null;
      canvas.toBlob = vi.fn().mockImplementation(cb => {
        blobCallback = cb;
      });

      service.downloadCanvas(canvas, 'test-sim.png', 'image/png');
      expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png', 0.95);

      // Invoke callback
      if (blobCallback) {
        (blobCallback as any)(new Blob(['fake-bytes'], { type: 'image/png' }));
      }
    });
  });
});

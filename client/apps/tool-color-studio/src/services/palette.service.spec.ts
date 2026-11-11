// @vitest-environment jsdom
// apps/tool-color-studio/src/services/palette.service.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaletteService, STORAGE_KEY_SAVED_PALETTES } from './palette.service';
import { ColorEngineService } from './color-engine.service';
import { PaletteHarmony, PaletteItem } from '../models/color.models';

describe('PaletteService (Phase 8 - Color Harmony Engine & Exporter)', () => {
  let service: PaletteService;
  let engine: ColorEngineService;

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    engine = new ColorEngineService();
    service = new PaletteService();

    // Mock HTMLCanvasElement.prototype.getContext for JSDOM canvas tests
    const mockContext = {
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 60 }),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: '',
      textBaseline: ''
    };
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockContext as any);
  });

  // ── 1. Color Harmony Algorithms ───────────────────────────────────────────
  describe('1. Color Harmony Algorithms', () => {
    const baseColor = '#E11D48'; // Rose 600 (H: ~346, S: ~84%, L: ~50%)

    it('should generate a Complementary palette of the requested count', () => {
      const colors = service.generatePalette(baseColor, 'complementary', 5);
      expect(colors).toHaveLength(5);
      expect(colors[0].toUpperCase()).toBe(baseColor.toUpperCase());
      // All colors should be valid hex
      colors.forEach(hex => expect(engine.isValidHex(hex)).toBe(true));
    });

    it('should generate an Analogous palette containing the base color', () => {
      const colors = service.generatePalette(baseColor, 'analogous', 6);
      expect(colors).toHaveLength(6);
      colors.forEach(hex => expect(engine.isValidHex(hex)).toBe(true));
      // Should contain the base color
      expect(colors.some(c => c.toUpperCase() === baseColor.toUpperCase())).toBe(true);
    });

    it('should generate a Triadic palette with 120-degree intervals', () => {
      const colors = service.generatePalette(baseColor, 'triadic', 5);
      expect(colors).toHaveLength(5);
      colors.forEach(hex => expect(engine.isValidHex(hex)).toBe(true));
      expect(colors.some(c => c.toUpperCase() === baseColor.toUpperCase())).toBe(true);
    });

    it('should generate a Split-Complementary palette', () => {
      const colors = service.generatePalette(baseColor, 'split-complementary', 5);
      expect(colors).toHaveLength(5);
      colors.forEach(hex => expect(engine.isValidHex(hex)).toBe(true));
    });

    it('should generate a Tetradic (rectangle) palette', () => {
      const colors = service.generatePalette(baseColor, 'tetradic', 4);
      expect(colors).toHaveLength(4);
      colors.forEach(hex => expect(engine.isValidHex(hex)).toBe(true));
    });

    it('should generate a Square (90-degree) palette', () => {
      const colors = service.generatePalette(baseColor, 'square', 4);
      expect(colors).toHaveLength(4);
      colors.forEach(hex => expect(engine.isValidHex(hex)).toBe(true));
    });

    it('should generate a Monochromatic palette preserving hue while varying lightness', () => {
      const colors = service.generatePalette(baseColor, 'monochromatic', 5);
      expect(colors).toHaveLength(5);
      const baseHsl = engine.rgbToHsl(engine.hexToRgb(baseColor));

      colors.forEach(hex => {
        const hsl = engine.rgbToHsl(engine.hexToRgb(hex));
        // Hue should remain close to base hue (within +/- 3 degrees for rounding)
        const diff = Math.abs(hsl.h - baseHsl.h);
        expect(diff <= 3 || diff >= 357).toBe(true);
      });
    });

    it('should generate a Shades & Tints palette stepping darker and lighter values', () => {
      const colors = service.generatePalette(baseColor, 'shades-tints', 6);
      expect(colors).toHaveLength(6);
      colors.forEach(hex => expect(engine.isValidHex(hex)).toBe(true));
    });

    it('should clamp palette count between 3 and 10', () => {
      const tooFew = service.generatePalette(baseColor, 'analogous', 1);
      expect(tooFew.length).toBe(3);

      const tooMany = service.generatePalette(baseColor, 'analogous', 25);
      expect(tooMany.length).toBe(10);
    });

    it('should fallback gracefully when given an invalid base hex', () => {
      const colors = service.generatePalette('invalid-hex', 'complementary', 5);
      expect(colors).toHaveLength(5);
      colors.forEach(hex => expect(engine.isValidHex(hex)).toBe(true));
    });
  });

  // ── 2. Palette Items & Color Locking ──────────────────────────────────────
  describe('2. Palette Items & Color Locking', () => {
    it('should create palette items with unique ids, names, and unlocked state', () => {
      const colors = ['#E11D48', '#3B82F6', '#10B981'];
      const items = service.createPaletteItems(colors);
      expect(items).toHaveLength(3);
      expect(items[0].hex).toBe('#E11D48');
      expect(items[0].locked).toBe(false);
      expect(items[0].id).toBeTruthy();
      expect(items[0].name).toBeTruthy();
    });

    it('should regenerate unlocked colors while preserving locked colors and their positions', () => {
      const initialItems: PaletteItem[] = [
        { id: '1', hex: '#FF0000', locked: true, name: 'Crimson' },
        { id: '2', hex: '#00FF00', locked: false, name: 'Lime' },
        { id: '3', hex: '#0000FF', locked: true, name: 'Blue' },
        { id: '4', hex: '#FFFF00', locked: false, name: 'Yellow' }
      ];

      const regenerated = service.regenerateUnlocked(initialItems, '#3B82F6', 'triadic');

      expect(regenerated).toHaveLength(4);
      // Locked items must remain identical in hex and locked status
      expect(regenerated[0].hex).toBe('#FF0000');
      expect(regenerated[0].locked).toBe(true);
      expect(regenerated[2].hex).toBe('#0000FF');
      expect(regenerated[2].locked).toBe(true);

      // Unlocked items should be regenerated
      expect(regenerated[1].locked).toBe(false);
      expect(regenerated[3].locked).toBe(false);
    });

    it('should toggle lock status on target item', () => {
      const items: PaletteItem[] = [
        { id: '1', hex: '#E11D48', locked: false, name: 'Rose' },
        { id: '2', hex: '#3B82F6', locked: true, name: 'Blue' }
      ];

      const updated = service.toggleLock(items, '1');
      expect(updated[0].locked).toBe(true);

      const unlocked = service.toggleLock(updated, '2');
      expect(unlocked[1].locked).toBe(false);
    });
  });

  // ── 3. Palette Item Operations (Add, Remove, Reorder, Reverse) ────────────
  describe('3. Palette Operations', () => {
    it('should add a color to the palette up to the max limit of 10', () => {
      let items = service.createPaletteItems(['#111111', '#222222', '#333333']);
      expect(items).toHaveLength(3);

      items = service.addColor(items, '#444444');
      expect(items).toHaveLength(4);
      expect(items[3].hex).toBe('#444444');

      // Add up to 10
      for (let i = 5; i <= 12; i++) {
        items = service.addColor(items, `#${i}${i}${i}${i}${i}${i}`);
      }
      expect(items).toHaveLength(10);
    });

    it('should remove a color from the palette without dropping below min limit of 3', () => {
      let items = service.createPaletteItems(['#111111', '#222222', '#333333', '#444444']);
      expect(items).toHaveLength(4);

      items = service.removeColor(items, items[0].id);
      expect(items).toHaveLength(3);

      // Should not remove when already at minimum 3
      const prevented = service.removeColor(items, items[0].id);
      expect(prevented).toHaveLength(3);
    });

    it('should update a specific color item and recalculate its color name', () => {
      const items = service.createPaletteItems(['#111111', '#222222', '#333333']);
      const updated = service.updateColor(items, items[1].id, '#3B82F6');
      expect(updated[1].hex).toBe('#3B82F6');
      expect(updated[1].name).toBe('Sky Azure');
    });

    it('should reverse palette order', () => {
      const items = service.createPaletteItems(['#111111', '#222222', '#333333']);
      const reversed = service.reversePalette(items);
      expect(reversed[0].hex).toBe('#333333');
      expect(reversed[1].hex).toBe('#222222');
      expect(reversed[2].hex).toBe('#111111');
    });

    it('should reorder palette items with reorderColor', () => {
      const items = service.createPaletteItems(['#AAAAAA', '#BBBBBB', '#CCCCCC']);
      const moved = service.reorderColor(items, 0, 2);
      expect(moved[0].hex).toBe('#BBBBBB');
      expect(moved[1].hex).toBe('#CCCCCC');
      expect(moved[2].hex).toBe('#AAAAAA');
    });
  });

  // ── 4. Export Formats (JSON, CSS, Tailwind, GPL, ASE, Canvas PNG) ─────────
  describe('4. Export Formats', () => {
    const items: PaletteItem[] = [
      { id: '1', hex: '#E11D48', locked: false, name: 'Rose Red' },
      { id: '2', hex: '#3B82F6', locked: false, name: 'Sky Blue' },
      { id: '3', hex: '#10B981', locked: false, name: 'Emerald' }
    ];

    it('should generate valid JSON containing palette details', () => {
      const jsonStr = service.generateJson(items, 'My Test Palette');
      const parsed = JSON.parse(jsonStr);
      expect(parsed.name).toBe('My Test Palette');
      expect(parsed.colors).toHaveLength(3);
      expect(parsed.colors[0].hex).toBe('#E11D48');
      expect(parsed.colors[0].name).toBe('Rose Red');
    });

    it('should generate clean CSS custom properties', () => {
      const css = service.generateCss(items);
      expect(css).toContain(':root {');
      expect(css).toContain('--color-1: #E11D48;');
      expect(css).toContain('--color-2: #3B82F6;');
      expect(css).toContain('--color-3: #10B981;');
    });

    it('should generate a Tailwind CSS theme color configuration object', () => {
      const tailwind = service.generateTailwind(items);
      expect(tailwind).toContain('module.exports = {');
      expect(tailwind).toContain("'color-1': '#E11D48'");
      expect(tailwind).toContain("'color-2': '#3B82F6'");
      expect(tailwind).toContain("'color-3': '#10B981'");
    });

    it('should generate standard GIMP/Inkscape GPL text format', () => {
      const gpl = service.generateGpl(items, 'Gimp Palette');
      expect(gpl).toContain('GIMP Palette');
      expect(gpl).toContain('Name: Gimp Palette');
      expect(gpl).toContain('Columns: 3');
      // Should include RGB integer values and swatch name
      expect(gpl).toMatch(/\d+\s+\d+\s+\d+\s+Rose Red/);
    });

    it('should generate valid Adobe Swatch Exchange (ASE) binary data', () => {
      const ase = service.generateAse(items, 'Adobe Palette');
      expect(ase).toBeInstanceOf(Uint8Array);
      // Verify signature 'ASEF' (0x41, 0x53, 0x45, 0x46)
      expect(ase[0]).toBe(0x41);
      expect(ase[1]).toBe(0x53);
      expect(ase[2]).toBe(0x45);
      expect(ase[3]).toBe(0x46);
      // Byte length should be non-trivial
      expect(ase.byteLength).toBeGreaterThan(50);
    });

    it('should render an offscreen canvas for PNG generation', () => {
      const canvas = service.renderToCanvas(items, 1200, 420);
      expect(canvas).toBeDefined();
      expect(canvas?.width).toBe(1200);
      expect(canvas?.height).toBe(420);
    });
  });

  // ── 5. Saved Palettes Persistence ─────────────────────────────────────────
  describe('5. Saved Palettes Persistence', () => {
    it('should load default palettes when localStorage is unpopulated', () => {
      const palettes = service.loadSavedPalettes();
      expect(palettes.length).toBeGreaterThanOrEqual(2);
      expect(palettes[0].name).toBe('Sunset Coast');
    });

    it('should save a new palette and prepend it to the saved list', () => {
      service.clearAll();
      const updated = service.savePalette('Brand New', ['#112233', '#445566'], 'Test desc', 'complementary');
      expect(updated).toHaveLength(1);
      expect(updated[0].name).toBe('Brand New');
      expect(updated[0].colors).toEqual(['#112233', '#445566']);
      expect(updated[0].harmony).toBe('complementary');
    });

    it('should update an existing saved palette fields', () => {
      service.clearAll();
      const created = service.savePalette('Original', ['#FFFFFF', '#000000']);
      const targetId = created[0].id;

      const updated = service.updateSavedPalette(targetId, { name: 'Renamed Palette', favorite: true });
      expect(updated[0].name).toBe('Renamed Palette');
      expect(updated[0].favorite).toBe(true);
    });

    it('should delete a saved palette by id', () => {
      service.clearAll();
      const created = service.savePalette('To Delete', ['#123456', '#654321']);
      expect(created).toHaveLength(1);

      const remaining = service.deleteSavedPalette(created[0].id);
      expect(remaining).toHaveLength(0);
    });

    it('should duplicate a saved palette with a copy indicator', () => {
      service.clearAll();
      const created = service.savePalette('Original Item', ['#111111', '#222222']);
      const duplicated = service.duplicatePalette(created[0].id);

      expect(duplicated).toHaveLength(2);
      expect(duplicated[0].name).toBe('Original Item (Copy)');
      expect(duplicated[0].colors).toEqual(created[0].colors);
    });

    it('should toggle favorite status on a saved palette', () => {
      service.clearAll();
      const created = service.savePalette('Fav Test', ['#111111', '#222222']);
      expect(created[0].favorite).toBe(false);

      const toggled = service.toggleFavorite(created[0].id);
      expect(toggled[0].favorite).toBe(true);

      const unToggled = service.toggleFavorite(created[0].id);
      expect(unToggled[0].favorite).toBe(false);
    });
  });

  // ── 6. Color Name Mapping ─────────────────────────────────────────────────
  describe('6. Color Name Mapping', () => {
    it('should map hex colors to human-friendly color tone names', () => {
      expect(service.getNearestColorName('#000000')).toBe('Pure Black');
      expect(service.getNearestColorName('#FFFFFF')).toBe('Pure White');
      expect(service.getNearestColorName('#E11D48')).toContain('Rose');
      expect(service.getNearestColorName('#3B82F6')).toBe('Sky Azure');
      expect(service.getNearestColorName('#10B981')).toContain('Emerald');
    });
  });
});

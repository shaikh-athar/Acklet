// @vitest-environment jsdom
// apps/tool-color-studio/src/components/palette/palette-module.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { PaletteModuleComponent } from './palette-module.component';
import { ColorStudioStateService } from '../../services/color-studio-state.service';
import { ColorEngineService } from '../../services/color-engine.service';
import { PaletteService } from '../../services/palette.service';
import { ExportService } from '../../services/export.service';
import { ThemeGenerationService } from '../../services/theme-generation.service';
import { ThemeExportService } from '../../services/theme-export.service';
import { PaletteHarmony, SavedPalette } from '../../models/color.models';

describe('PaletteModuleComponent (Phase 8 - Color Palette Generator)', () => {
  let component: PaletteModuleComponent;
  let state: ColorStudioStateService;
  let engine: ColorEngineService;
  let paletteService: PaletteService;
  let exportService: ExportService;
  let themeGenService: ThemeGenerationService;
  let themeExportService: ThemeExportService;

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    state = new ColorStudioStateService();
    engine = new ColorEngineService();
    paletteService = new PaletteService();
    exportService = new ExportService();
    themeGenService = new ThemeGenerationService();

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });

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

    const rootInjector = {
      get: (token: any, notFound?: any) => {
        if (token === ColorStudioStateService) return state;
        if (token === ColorEngineService) return engine;
        if (token === PaletteService) return paletteService;
        if (token === ExportService) return exportService;
        if (token === ThemeGenerationService) return themeGenService;
        if (token === ThemeExportService) return themeExportService;
        return notFound;
      }
    } as any;

    const envInjector = createEnvironmentInjector([], rootInjector);

    runInInjectionContext(envInjector, () => {
      themeExportService = new ThemeExportService();
      component = new PaletteModuleComponent();
    });

    state.setSelectedColor('#E11D48');
  });

  // ── 1. Component Initialization & Default State ───────────────────────────
  describe('1. Component Initialization & Default State', () => {
    it('should create the Palette Module component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with analogous harmony and strip view mode', () => {
      expect(component.selectedHarmony()).toBe('analogous');
      expect(component.viewMode()).toBe('strip');
      expect(component.showExport()).toBe(false);
      expect(component.exportTab()).toBe('css');
    });

    it('should compute quick colors deduplicating saved, shared, and extracted colors', () => {
      state.saveColor('#E11D48', 'Rose');
      state.setSharedPalette(['#3B82F6', '#10B981']);
      const quick = component.quickColors();
      expect(quick.length).toBeGreaterThanOrEqual(3);
      expect(quick).toContain('#E11D48');
      expect(quick).toContain('#3B82F6');
      expect(quick).toContain('#10B981');
    });
  });

  // ── 2. Base Color Selection & Inputs ──────────────────────────────────────
  describe('2. Base Color Selection & Inputs', () => {
    it('should update base color and regenerate palette on onBaseColorChange', () => {
      component.onBaseColorChange('#3B82F6');
      expect(state.selectedColor()).toBe('#3B82F6');
      const items = component.items();
      expect(items.length).toBeGreaterThanOrEqual(3);
    });

    it('should accept valid 3 or 6 character manual hex input', () => {
      const mockEvent = {
        target: { value: '0F766E' }
      } as any;

      component.onManualBaseHexChange(mockEvent);
      expect(state.selectedColor().toUpperCase()).toBe('#0F766E');
    });

    it('should reset input value when invalid manual hex is entered', () => {
      state.setSelectedColor('#E11D48');
      const mockTarget = { value: 'ZZZZ' };
      const mockEvent = { target: mockTarget } as any;

      component.onManualBaseHexChange(mockEvent);
      expect(mockTarget.value).toBe('#E11D48');
    });

    it('should set an existing swatch color as the base color', () => {
      component.setAsBase('#10B981');
      expect(state.selectedColor()).toBe('#10B981');
    });

    it('should randomize base color and refresh palette', () => {
      const before = state.selectedColor();
      component.randomizeBaseColor();
      expect(component.items().length).toBeGreaterThanOrEqual(3);
    });
  });

  // ── 3. Harmony Selection & Generation Controls ────────────────────────────
  describe('3. Harmony Selection & Generation Controls', () => {
    it('should switch between all 8 color harmony modes and regenerate palette', () => {
      const harmonies: PaletteHarmony[] = [
        'complementary',
        'analogous',
        'triadic',
        'split-complementary',
        'tetradic',
        'square',
        'monochromatic',
        'shades-tints'
      ];

      harmonies.forEach(h => {
        component.onHarmonyChange(h);
        expect(component.selectedHarmony()).toBe(h);
        expect(component.items().length).toBeGreaterThanOrEqual(3);
      });
    });

    it('should expand palette size when requested', () => {
      component.setPaletteSize(7);
      expect(component.items()).toHaveLength(7);
    });

    it('should shrink palette size when requested down to limit', () => {
      component.setPaletteSize(7);
      expect(component.items()).toHaveLength(7);

      component.setPaletteSize(4);
      expect(component.items()).toHaveLength(4);
    });

    it('should trigger regeneration on Spacebar keypress outside input fields', () => {
      const spy = vi.spyOn(component, 'generateNewPalette');
      const event = new KeyboardEvent('keydown', { code: 'Space' });
      Object.defineProperty(event, 'target', { value: document.createElement('div') });

      component.handleKeyboardEvent(event);
      expect(spy).toHaveBeenCalled();
    });

    it('should NOT trigger regeneration on Spacebar when typing inside an input field', () => {
      const spy = vi.spyOn(component, 'generateNewPalette');
      const event = new KeyboardEvent('keydown', { code: 'Space' });
      Object.defineProperty(event, 'target', { value: document.createElement('input') });

      component.handleKeyboardEvent(event);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  // ── 4. Item Interactions (Lock, Edit, Add, Remove, Reorder) ───────────────
  describe('4. Item Interactions', () => {
    it('should toggle lock status on target color item', () => {
      const items = component.items();
      const firstId = items[0].id;
      expect(items[0].locked).toBe(false);

      component.toggleLock(firstId);
      expect(component.items()[0].locked).toBe(true);

      component.toggleLock(firstId);
      expect(component.items()[0].locked).toBe(false);
    });

    it('should tweak an individual color in the palette and update its color name', () => {
      const firstId = component.items()[0].id;
      component.onColorTweak(firstId, '#38BDF8');

      const updated = component.items()[0];
      expect(updated.hex).toBe('#38BDF8');
      expect(updated.name).toBe('Sky Azure');
    });

    it('should add a color to the palette up to 10', () => {
      component.setPaletteSize(5);
      component.addColor();
      expect(component.items()).toHaveLength(6);
    });

    it('should remove a color from the palette but prevent dropping below 3', () => {
      component.setPaletteSize(4);
      const toRemove = component.items()[0].id;
      component.removeColor(toRemove);
      expect(component.items()).toHaveLength(3);

      // Attempt to remove below 3
      const lastId = component.items()[0].id;
      component.removeColor(lastId);
      expect(component.items()).toHaveLength(3);
    });

    it('should reverse palette order', () => {
      component.setPaletteSize(3);
      const originalColors = component.items().map(i => i.hex);
      component.reversePalette();
      const reversedColors = component.items().map(i => i.hex);
      expect(reversedColors).toEqual(originalColors.reverse());
    });

    it('should copy hex code to clipboard', () => {
      component.copyColor('#E11D48');
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('#E11D48');
    });
  });

  // ── 5. View Modes & Contrast Utilities ────────────────────────────────────
  describe('5. View Modes & Contrast Utilities', () => {
    it('should toggle between strip and cards view mode', () => {
      component.viewMode.set('cards');
      expect(component.viewMode()).toBe('cards');

      component.viewMode.set('strip');
      expect(component.viewMode()).toBe('strip');
    });

    it('should accurately determine dark vs light colors for high-contrast labels', () => {
      expect(component.isDarkColor('#000000')).toBe(true);
      expect(component.isDarkColor('#0F172A')).toBe(true);
      expect(component.isDarkColor('#FFFFFF')).toBe(false);
      expect(component.isDarkColor('#FEF08A')).toBe(false);
    });

    it('should return human readable rgb and hsl strings for items', () => {
      const rgb = component.getRgbString('#E11D48');
      expect(rgb).toBe('225, 29, 72');

      const hsl = component.getHslString('#E11D48');
      expect(hsl).toContain('°');
      expect(hsl).toContain('%');
    });
  });

  // ── 6. Export Suite & Modal ───────────────────────────────────────────────
  describe('6. Export Suite', () => {
    it('should toggle export dialog visibility', () => {
      expect(component.showExport()).toBe(false);
      component.toggleExportDialog();
      expect(component.showExport()).toBe(true);
      component.toggleExportDialog();
      expect(component.showExport()).toBe(false);
    });

    it('should generate correct export code according to selected export tab', () => {
      component.exportTab.set('css');
      expect(component.getExportCode()).toContain('--color-1:');

      component.exportTab.set('tailwind');
      expect(component.getExportCode()).toContain('module.exports = {');

      component.exportTab.set('json');
      expect(component.getExportCode()).toContain('"colors":');

      component.exportTab.set('gpl');
      expect(component.getExportCode()).toContain('GIMP Palette');

      component.exportTab.set('hex');
      expect(component.getExportCode()).toContain('#');
    });

    it('should copy export code to clipboard', () => {
      component.copyExportCode();
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    it('should dispatch appropriate file download for css, tailwind, json, gpl, and ase', () => {
      const fileSpy = vi.spyOn(exportService, 'downloadFile').mockImplementation(() => {});
      const binarySpy = vi.spyOn(exportService, 'downloadBinaryFile').mockImplementation(() => {});

      component.exportTab.set('css');
      component.downloadExportFile();
      expect(fileSpy).toHaveBeenCalledWith(expect.any(String), 'palette.css', 'text/css');

      component.exportTab.set('tailwind');
      component.downloadExportFile();
      expect(fileSpy).toHaveBeenCalledWith(expect.any(String), 'tailwind-palette.js', 'application/javascript');

      component.exportTab.set('json');
      component.downloadExportFile();
      expect(fileSpy).toHaveBeenCalledWith(expect.any(String), 'palette.json', 'application/json');

      component.exportTab.set('gpl');
      component.downloadExportFile();
      expect(fileSpy).toHaveBeenCalledWith(expect.any(String), 'palette.gpl', 'text/plain');

      component.exportTab.set('ase');
      component.downloadExportFile();
      expect(binarySpy).toHaveBeenCalledWith(expect.any(Uint8Array), 'palette.ase', 'application/octet-stream');
    });

    it('should render offscreen canvas and trigger PNG download', () => {
      let blobCallback: ((b: Blob | null) => void) | null = null;
      HTMLCanvasElement.prototype.toBlob = vi.fn().mockImplementation((cb) => {
        blobCallback = cb;
      });
      const toastSpy = vi.spyOn(state, 'showToast');

      component.downloadPngGraphic();
      expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalled();

      // Trigger callback with mock blob
      if (blobCallback) {
        (blobCallback as any)(new Blob(['fake-png'], { type: 'image/png' }));
        expect(toastSpy).toHaveBeenCalledWith('Downloaded palette.png graphic');
      }
    });
  });

  // ── 7. Saved Palettes Management ──────────────────────────────────────────
  describe('7. Saved Palettes Management', () => {
    it('should save current palette into state', () => {
      state.clearSavedPalettes();
      component.saveCurrentPalette();
      expect(state.savedPalettes()).toHaveLength(1);
    });

    it('should load a saved palette and apply its colors and harmony', () => {
      const saved: SavedPalette = {
        id: 'pal-custom',
        name: 'Ocean Breeze',
        colors: ['#0284C7', '#0EA5E9', '#38BDF8'],
        harmony: 'triadic',
        timestamp: Date.now()
      };

      component.loadSavedPalette(saved);
      expect(component.selectedHarmony()).toBe('triadic');
      expect(component.items().map(i => i.hex)).toEqual(['#0284C7', '#0EA5E9', '#38BDF8']);
    });

    it('should toggle favorite status on saved palette', () => {
      state.clearSavedPalettes();
      const saved = state.saveExtractedPalette('Fav Test', ['#111111', '#222222']);
      expect(state.savedPalettes()[0].favorite).toBeFalsy();

      component.toggleFavorite(saved.id);
      expect(state.savedPalettes()[0].favorite).toBe(true);
    });

    it('should duplicate a saved palette', () => {
      state.clearSavedPalettes();
      const saved = state.saveExtractedPalette('Original', ['#111111', '#222222']);
      component.duplicatePalette(saved.id);
      expect(state.savedPalettes()).toHaveLength(2);
      expect(state.savedPalettes()[0].name).toBe('Original (Copy)');
    });

    it('should start and commit inline renaming of a saved palette', () => {
      state.clearSavedPalettes();
      const saved = state.saveExtractedPalette('Old Name', ['#111111', '#222222']);

      component.startRenaming(saved.id);
      expect(component.renamingId()).toBe(saved.id);

      const mockEvent = {
        target: { value: 'Renamed Palette' }
      } as any;
      component.saveRename(saved.id, mockEvent);

      expect(state.savedPalettes()[0].name).toBe('Renamed Palette');
      expect(component.renamingId()).toBeNull();
    });

    it('should delete a saved palette', () => {
      state.clearSavedPalettes();
      const saved = state.saveExtractedPalette('To Delete', ['#111111', '#222222']);
      expect(state.savedPalettes()).toHaveLength(1);

      component.deleteSavedPalette(saved.id);
      expect(state.savedPalettes()).toHaveLength(0);
    });
  });

  // ── 8. Cross-Module Integration ───────────────────────────────────────────
  describe('8. Cross-Module Dispatches', () => {
    it('should transfer colors to Shared Working Palette', () => {
      component.pushToSharedPalette();
      expect(state.sharedColorPalettes().length).toBeGreaterThanOrEqual(3);
    });

    it('should send palette colors to Gradient Generator', () => {
      component.sendToGradient();
      expect(state.activeModule()).toBe('gradient');
      expect(state.gradientConfig().stops.length).toBe(component.items().length);
    });

    it('should load first two palette colors into Contrast Checker and switch module', () => {
      component.sendToContrast();
      expect(state.activeModule()).toBe('contrast');
      expect(state.contrastFg()).toBe(component.items()[0].hex);
      expect(state.contrastBg()).toBe(component.items()[1].hex);
    });

    it('should send color to Color Picker and switch active module', () => {
      component.sendToPicker('#10B981');
      expect(state.selectedColor()).toBe('#10B981');
      expect(state.activeModule()).toBe('picker');
    });
  });

  // ── 9. Application Theme Generator & Export Suite ──────────────────────────
  describe('9. Application Theme Generator & Export Suite', () => {
    it('should initialize with at least 20 curated seed themes across categories', () => {
      component.ngOnInit();
      expect(component.themeList().length).toBeGreaterThanOrEqual(20);
      expect(component.selectedTheme()).not.toBeNull();
    });

    it('should generate requested variations count (2, 4, 6, 8) without duplicates', () => {
      component.selectedBaseColor.set('#2563EB');
      component.selectedVariationsCount.set(6);
      component.selectedMode.set('both');
      component.generateCurrentTheme();

      expect(component.themeList().length).toBe(6);

      // Verify 0 duplicate IDs or fingerprints
      const idSet = new Set(component.themeList().map(t => t.id));
      expect(idSet.size).toBe(6);

      const fpSet = new Set(component.themeList().map(t => themeGenService.getThemeFingerprint(t)));
      expect(fpSet.size).toBe(6);
    });

    it('should generate themes influenced by base color', () => {
      component.selectedBaseColor.set('#10B981'); // Emerald green
      component.selectedVariationsCount.set(4);
      component.generateCurrentTheme();

      const themes = component.themeList();
      expect(themes.length).toBe(4);
      expect(themes[0].baseColor).toBe('#10B981');
      themes.forEach(t => {
        expect(t.baseColor).toBeDefined();
        const primary = t.tokens.find(k => k.key === '--color-primary');
        expect(primary).toBeDefined();
      });
    });

    it('should explore curated themes and reset category & search', () => {
      component.selectedCategory.set('FinTech');
      component.searchQuery.set('ledger');
      component.exploreThemes();

      expect(component.selectedCategory()).toBe('All');
      expect(component.searchQuery()).toBe('');
      expect(component.themeList().length).toBeGreaterThanOrEqual(20);
    });

    it('should open individual theme export modal and support all 6 export formats', () => {
      component.ngOnInit();
      const targetTheme = component.themeList()[0];
      expect(targetTheme).toBeDefined();
      expect(component.showThemeExport()).toBe(false);

      component.openThemeExportModal(targetTheme);
      expect(component.showThemeExport()).toBe(true);
      expect(component.exportingTheme()).toBe(targetTheme);

      // CSS Variables
      component.themeExportFormat.set('css');
      expect(component.getThemeExportCode()).toContain('--color-primary:');

      // SCSS Variables
      component.themeExportFormat.set('scss');
      expect(component.getThemeExportCode()).toContain('$color-primary:');

      // Tailwind Config
      component.themeExportFormat.set('tailwind');
      expect(component.getThemeExportCode()).toContain('module.exports = {');

      // JSON Tokens
      component.themeExportFormat.set('json');
      expect(component.getThemeExportCode()).toContain('"tokens":');

      // Design Tokens JSON
      component.themeExportFormat.set('design-tokens');
      expect(component.getThemeExportCode()).toContain('"color":');

      // Copy code
      component.copyThemeExportCode();
      expect(navigator.clipboard.writeText).toHaveBeenCalled();

      // Download file
      const downloadSpy = vi.spyOn(themeExportService, 'download').mockImplementation(() => {});
      component.downloadThemeExport();
      expect(downloadSpy).toHaveBeenCalledWith(targetTheme, 'design-tokens');

      // Close modal
      component.closeThemeExportModal();
      expect(component.showThemeExport()).toBe(false);
    });

    it('should filter themes by category and search query correctly', () => {
      component.exploreThemes();
      const allCount = component.filteredThemes().length;

      component.selectedCategory.set('FinTech');
      const finTechThemes = component.filteredThemes();
      expect(finTechThemes.length).toBeGreaterThan(0);
      expect(finTechThemes.length).toBeLessThan(allCount);
      finTechThemes.forEach(t => expect(t.category).toBe('FinTech'));

      // Search query filter
      component.selectedCategory.set('All');
      component.searchQuery.set('Dark');
      const searchMatches = component.filteredThemes();
      expect(searchMatches.length).toBeGreaterThan(0);
      searchMatches.forEach(t => {
        const matches = t.name.toLowerCase().includes('dark') ||
          t.category.toLowerCase().includes('dark') ||
          t.style.toLowerCase().includes('dark') ||
          t.mode === 'dark';
        expect(matches).toBe(true);
      });
    });

    it('should continuously load more unique themes in preferences mode when loadMoreThemes is called', () => {
      component.selectedBaseColor.set('#2563EB');
      component.selectedVariationsCount.set(4);
      component.generateCurrentTheme();

      expect(component.themeList().length).toBe(4);
      const initialFps = new Set(component.themeList().map(t => themeGenService.getThemeFingerprint(t)));

      // Load more once (loads 8 more themes)
      component.loadMoreThemes();
      expect(component.themeList().length).toBe(12);

      // Verify no duplicates
      const afterFirstFps = new Set(component.themeList().map(t => themeGenService.getThemeFingerprint(t)));
      expect(afterFirstFps.size).toBe(12);

      // Load more again (loads 8 more themes)
      component.loadMoreThemes();
      expect(component.themeList().length).toBe(20);

      const afterSecondFps = new Set(component.themeList().map(t => themeGenService.getThemeFingerprint(t)));
      expect(afterSecondFps.size).toBe(20);
    });

    it('should load more themes matching the active category filter', () => {
      component.onCategorySelect('FinTech');
      const initialCount = component.filteredThemes().length;

      component.loadMoreThemes();
      const afterCount = component.filteredThemes().length;

      expect(afterCount).toBe(initialCount + 8);
      component.filteredThemes().forEach(t => {
        expect(t.category).toBe('FinTech');
      });
    });

    it('should trigger loadMoreThemes and append themes to themeList', () => {
      component.ngOnInit();
      const initialCount = component.themeList().length;

      component.loadMoreThemes();
      expect(component.themeList().length).toBe(initialCount + 8);
    });

    it('should correctly track saved themes in savedThemeIds and toggle saving', () => {
      component.ngOnInit();
      const firstTheme = component.themeList()[0];
      expect(firstTheme).toBeDefined();

      expect(component.savedThemeIds().has(firstTheme.id)).toBe(false);

      // Save theme
      component.saveThemeToLibrary(firstTheme);
      expect(component.savedThemeIds().has(firstTheme.id)).toBe(true);
      expect(component.savedThemes().some(t => t.id === firstTheme.id)).toBe(true);

      // Toggle save (removes from saved)
      component.saveThemeToLibrary(firstTheme);
      expect(component.savedThemeIds().has(firstTheme.id)).toBe(false);
      expect(component.savedThemes().some(t => t.id === firstTheme.id)).toBe(false);
    });
  });
});

// @vitest-environment jsdom
// apps/tool-color-studio/src/components/picker/color-picker-module.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { ColorPickerModuleComponent } from './color-picker-module.component';
import { ColorStudioStateService } from '../../services/color-studio-state.service';
import { ColorEngineService } from '../../services/color-engine.service';

describe('ColorPickerModuleComponent (Phase 4 - Advanced Color Picker)', () => {
  let component: ColorPickerModuleComponent;
  let state: ColorStudioStateService;
  let engine: ColorEngineService;

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    state = new ColorStudioStateService();
    engine = new ColorEngineService();

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });

    const rootInjector = {
      get: (token: any, notFound?: any) => {
        if (token === ColorStudioStateService) return state;
        if (token === ColorEngineService) return engine;
        return notFound;
      }
    } as any;

    const envInjector = createEnvironmentInjector([], rootInjector);

    runInInjectionContext(envInjector, () => {
      component = new ColorPickerModuleComponent();
    });

    state.setSelectedColor('#E11D48', false);
  });

  describe('1. Component Initialization & Default State', () => {
    it('should create the Advanced Color Picker component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with active color #E11D48 and matching signals', () => {
      expect(component.initialColor()).toBe('#E11D48');
      expect(state.selectedColor()).toBe('#E11D48');
      expect(component.solidHex()).toBe('#E11D48');
      expect(component.currentAlphaPercent()).toBe(100);
      expect(component.activeFormat()).toBe('hex');
    });

    it('should compute pure hue hex accurately for spectrum rendering', () => {
      const pureHue = component.huePureHex();
      expect(pureHue).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });

  describe('2. Visual Sliders & Spectrum Keyboard Navigation', () => {
    it('should update active color when hue slider changes', () => {
      component.onHueSliderChange(200);
      expect(component.currentHue()).toBe(200);
      expect(state.selectedColor()).not.toBe('#E11D48');
    });

    it('should update active color with alpha channel when alpha slider changes', () => {
      component.onAlphaSliderChange(50);
      expect(component.currentAlphaPercent()).toBe(50);
      expect(state.selectedColor()).toMatch(/^#[0-9A-F]{8}$/i);
    });

    it('should validate and clamp numeric hue inputs, auto-resetting on blur', () => {
      component.onHueNumChange(120);
      expect(component.currentHue()).toBe(120);

      // Invalid input should be ignored
      component.onHueNumChange(999);
      expect(component.currentHue()).toBe(120);

      // On blur, reset to valid state
      component.onHueBlur();
      expect(component.currentHue()).toBe(component.color().hsv.h);
    });

    it('should validate and clamp numeric alpha inputs, auto-resetting on blur', () => {
      component.onAlphaNumChange(75);
      expect(component.currentAlphaPercent()).toBe(75);

      // Invalid input ignored
      component.onAlphaNumChange(-50);
      expect(component.currentAlphaPercent()).toBe(75);

      component.onAlphaBlur();
      expect(component.currentAlphaPercent()).toBe(75);
    });

    it('should support accessible keyboard navigation on 2D spectrum canvas', () => {
      const initialSat = component.satPercent();
      const initialVal = component.valPercent();

      // Right arrow increases saturation
      component.onSpectrumKeyDown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      expect(component.satPercent()).toBeGreaterThanOrEqual(initialSat);

      // Down arrow decreases brightness/value
      component.onSpectrumKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      expect(component.valPercent()).toBeLessThanOrEqual(initialVal);
    });
  });

  describe('3. Before / After Comparison & 1-Click Revert', () => {
    it('should track initial color and allow 1-click revert after changes', () => {
      const original = component.initialColor();
      expect(original).toBe('#E11D48');

      // Change color
      state.setSelectedColor('#3B82F6');
      expect(state.selectedColor()).toBe('#3B82F6');

      // Revert back
      component.revertToInitial();
      expect(state.selectedColor()).toBe('#E11D48');
    });
  });

  describe('4. Multi-Format Tab Switching & Channel Input Synchronization', () => {
    it('should switch between HEX, RGB, HSL, HSV and CMYK format modes', () => {
      expect(component.activeFormat()).toBe('hex');

      component.setActiveFormat('rgb');
      expect(component.activeFormat()).toBe('rgb');

      component.setActiveFormat('hsl');
      expect(component.activeFormat()).toBe('hsl');

      component.setActiveFormat('hsv');
      expect(component.activeFormat()).toBe('hsv');

      component.setActiveFormat('cmyk');
      expect(component.activeFormat()).toBe('cmyk');
    });

    it('should synchronize valid manual HEX inputs and auto-reset on blur if invalid', () => {
      component.onHexInputChange('10B981');
      expect(state.selectedColor()).toBe('#10B981');

      // Incomplete/invalid input during typing
      component.onHexInputChange('XYZ');
      expect(component.hexInputString()).toBe('XYZ');

      // On blur, auto-reset to valid state
      component.onHexInputBlur();
      expect(component.hexInputString()).toBe('10B981');
    });

    it('should synchronize RGB channel changes and auto-reset on blur', () => {
      component.onRgbChange('r', 100);
      component.onRgbChange('g', 150);
      component.onRgbChange('b', 200);

      const rgb = component.color().rgb;
      expect(rgb.r).toBe(100);
      expect(rgb.g).toBe(150);
      expect(rgb.b).toBe(200);

      component.onRgbBlur();
      expect(component.rgbR()).toBe(100);
    });

    it('should synchronize HSL channel changes and auto-reset on blur', () => {
      component.onHslChange('h', 180);
      component.onHslChange('s', 90);
      component.onHslChange('l', 45);

      const hsl = component.color().hsl;
      expect(hsl.h).toBe(180);
      expect(hsl.s).toBe(90);
      expect(hsl.l).toBe(45);

      component.onHslBlur();
      expect(component.hslH()).toBe(180);
    });

    it('should synchronize HSV channel changes and auto-reset on blur', () => {
      component.onHsvChange('h', 240);
      component.onHsvChange('s', 80);
      component.onHsvChange('v', 90);

      const hsv = component.color().hsv;
      expect(hsv.h).toBe(240);
      expect(hsv.s).toBe(80);
      expect(hsv.v).toBe(90);

      component.onHsvBlur();
      expect(component.hsvH()).toBe(240);
    });

    it('should synchronize CMYK channel changes and auto-reset on blur', () => {
      component.onCmykChange('c', 50);
      component.onCmykChange('m', 20);
      component.onCmykChange('y', 80);
      component.onCmykChange('k', 10);

      expect(state.selectedColor()).toMatch(/^#[0-9A-F]{6}$/i);

      component.onCmykBlur();
      expect(component.cmykC()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('5. Readability & Color Combinations Preview', () => {
    it('should compute WCAG compliance for dark on color, light on color, and accent on surfaces', () => {
      const darkOnColor = component.darkOnColorCompliance();
      const lightOnColor = component.lightOnColorCompliance();
      const colorOnDark = component.colorOnDarkCompliance();
      const colorOnLight = component.colorOnLightCompliance();

      expect(darkOnColor).toBeDefined();
      expect(darkOnColor.ratio).toBeGreaterThan(0);
      expect(darkOnColor.ratioString).toContain(':1');

      expect(lightOnColor).toBeDefined();
      expect(lightOnColor.ratio).toBeGreaterThan(0);

      expect(colorOnDark).toBeDefined();
      expect(colorOnLight).toBeDefined();
    });
  });

  describe('6. Saved Colors Management', () => {
    it('should allow saving the active color with custom name and prevent duplicates', () => {
      state.clearSavedColors();
      component.newSavedName = 'Brand Rose Red';
      component.saveCurrentColor();

      expect(state.savedColorItems()).toHaveLength(1);
      expect(state.savedColorItems()[0].name).toBe('Brand Rose Red');
      expect(state.savedColorItems()[0].hex).toBe('#E11D48');
      expect(component.newSavedName).toBe('');

      // Attempt duplicate save
      component.saveCurrentColor();
      expect(state.savedColorItems()).toHaveLength(1);
    });

    it('should allow inline renaming of saved colors', () => {
      state.clearSavedColors();
      state.saveColor('#3B82F6', 'Original Blue');
      const item = state.savedColorItems()[0];

      component.startEdit(item);
      expect(component.editingItemId()).toBe(item.id);
      expect(component.editingItemName).toBe('Original Blue');

      component.editingItemName = 'Updated Sky Azure';
      component.commitEdit(item.id);

      expect(component.editingItemId()).toBeNull();
      expect(state.savedColorItems()[0].name).toBe('Updated Sky Azure');

      // Cancel edit flow
      component.startEdit(state.savedColorItems()[0]);
      component.cancelEdit();
      expect(component.editingItemId()).toBeNull();
    });
  });

  describe('7. Color History Management', () => {
    it('should update color history when colors change and allow individual removal and clear', () => {
      state.clearHistory();
      state.setSelectedColor('#111111');
      state.setSelectedColor('#222222');
      state.setSelectedColor('#333333');

      expect(state.recentlyUsedColors()).toHaveLength(3);

      // Remove individual entry
      state.removeHistoryColor(0);
      expect(state.recentlyUsedColors()).not.toContain('#333333');

      // Clear all history
      state.clearHistory();
      expect(state.recentlyUsedColors()).toHaveLength(0);
    });
  });

  describe('8. Clipboard Copy Actions', () => {
    it('should copy active HEX code to clipboard', () => {
      component.copyActiveHex();
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('#E11D48');
    });

    it('should copy active format (RGB) when activeFormat is rgb', () => {
      component.setActiveFormat('rgb');
      component.copyActiveFormat();
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('rgb('));
    });

    it('should copy all color formats', () => {
      state.copyAllFormats();
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('HEX:'));
    });
  });
});

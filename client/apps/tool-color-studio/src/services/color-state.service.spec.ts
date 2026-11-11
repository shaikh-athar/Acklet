// apps/tool-color-studio/src/services/color-state.service.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ColorStateService, STORAGE_KEY_HISTORY, STORAGE_KEY_SAVED, STORAGE_KEY_PALETTE } from './color-state.service';

describe('ColorStateService (Phase 3)', () => {
  let service: ColorStateService;

  beforeEach(() => {
    // Clear localStorage mock if present
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    service = new ColorStateService();
  });

  describe('1. Active & Selected Color Management', () => {
    it('should initialize with default Rose Accent (#E11D48)', () => {
      expect(service.selectedColor()).toBe('#E11D48');
      expect(service.activeColor()).toBe('#E11D48');
    });

    it('should update selected color and record history', () => {
      service.setSelectedColor('#3B82F6');
      expect(service.selectedColor()).toBe('#3B82F6');
      expect(service.recentlyUsedColors()).toContain('#3B82F6');
    });

    it('should support linear undo and redo operations', () => {
      service.setSelectedColor('#3B82F6'); // 1
      service.setSelectedColor('#10B981'); // 2

      expect(service.canUndo()).toBe(true);
      service.undo();
      expect(service.selectedColor()).toBe('#3B82F6');

      expect(service.canRedo()).toBe(true);
      service.redo();
      expect(service.selectedColor()).toBe('#10B981');
    });

    it('should generate a vibrant random color on randomizeActiveColor()', () => {
      service.randomizeActiveColor();
      expect(service.selectedColor()).toMatch(/^#[0-9A-F]{6}$/i);
      expect(service.canUndo()).toBe(true);
    });
  });

  describe('2. Saved / Bookmarked Colors Management', () => {
    it('should allow saving, checking, and removing bookmarked colors', () => {
      service.saveColor('#8B5CF6');
      expect(service.isColorSaved('#8B5CF6')).toBe(true);
      expect(service.savedColors()).toContain('#8B5CF6');

      // Toggle saved color (removes it if already saved)
      service.toggleSavedColor('#8B5CF6');
      expect(service.isColorSaved('#8B5CF6')).toBe(false);

      // Toggle saved color again (adds it)
      service.toggleSavedColor('#8B5CF6');
      expect(service.isColorSaved('#8B5CF6')).toBe(true);

      // Remove directly
      service.removeSavedColor('#8B5CF6');
      expect(service.isColorSaved('#8B5CF6')).toBe(false);
    });

    it('should avoid adding duplicate saved colors', () => {
      service.clearSavedColors();
      service.saveColor('#FF0000', 'Bright Red');
      const secondTry = service.saveColor('#FF0000', 'Duplicate Red');
      expect(secondTry).toBe(false);
      expect(service.savedColors()).toHaveLength(1);
      expect(service.savedColorItems()[0].name).toBe('Bright Red');
    });

    it('should allow renaming and removing saved color items by ID', () => {
      service.clearSavedColors();
      service.saveColor('#0EA5E9', 'Original Sky');
      const item = service.savedColorItems()[0];
      expect(item.name).toBe('Original Sky');

      service.updateSavedColorName(item.id, 'Renamed Sky Cyan');
      expect(service.savedColorItems()[0].name).toBe('Renamed Sky Cyan');

      service.removeSavedColor(item.id);
      expect(service.savedColorItems()).toHaveLength(0);
    });

    it('should allow removing individual history entries by index and hex', () => {
      service.clearHistory();
      service.setSelectedColor('#111111');
      service.setSelectedColor('#222222');
      service.setSelectedColor('#333333');
      expect(service.recentlyUsedColors()).toHaveLength(3);

      // Remove by index
      service.removeHistoryColor(0); // removes #333333
      expect(service.recentlyUsedColors()).not.toContain('#333333');

      // Remove by hex
      service.removeHistoryColor('#111111');
      expect(service.recentlyUsedColors()).not.toContain('#111111');
      expect(service.recentlyUsedColors()).toContain('#222222');
    });
  });

  describe('3. Shared Working Palette Management', () => {
    it('should add new swatches up to 10 items without duplicates', () => {
      const initialCount = service.sharedColorPalettes().length;
      service.addToSharedPalette('#123456');
      expect(service.sharedColorPalettes()).toContain('#123456');
      expect(service.sharedColorPalettes().length).toBe(initialCount + 1);

      // Duplicate should not increase length
      service.addToSharedPalette('#123456');
      expect(service.sharedColorPalettes().length).toBe(initialCount + 1);
    });

    it('should remove swatches from shared palette while enforcing minimum of 2', () => {
      service.setSharedPalette(['#111111', '#222222', '#333333']);
      expect(service.sharedColorPalettes()).toHaveLength(3);

      service.removeFromSharedPalette(0);
      expect(service.sharedColorPalettes()).toHaveLength(2);
      expect(service.sharedColorPalettes()).not.toContain('#111111');

      // Attempting to remove below 2 should be rejected
      service.removeFromSharedPalette(0);
      expect(service.sharedColorPalettes()).toHaveLength(2);
    });
  });

  describe('4. Reusable Clipboard Copying across Formats', () => {
    beforeEach(() => {
      // Mock navigator.clipboard
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined)
        }
      });
    });

    it('should copy HEX format', async () => {
      const success = await service.copyFormat('#E11D48', 'hex');
      expect(success).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('#E11D48');
    });

    it('should copy RGB format', async () => {
      const success = await service.copyFormat('#E11D48', 'rgb');
      expect(success).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('rgb(225, 29, 72)');
    });

    it('should copy HSL format', async () => {
      const success = await service.copyFormat('#E11D48', 'hsl');
      expect(success).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('hsl('));
    });

    it('should copy HSV format', async () => {
      const success = await service.copyFormat('#E11D48', 'hsv');
      expect(success).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('hsv('));
    });

    it('should copy CMYK format', async () => {
      const success = await service.copyFormat('#E11D48', 'cmyk');
      expect(success).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('cmyk('));
    });

    it('should copy CSS background-color format', async () => {
      const success = await service.copyFormat('#E11D48', 'css');
      expect(success).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('background-color: #E11D48;');
    });
  });

  describe('5. Cross-Module State Integration Scenarios', () => {
    it('should transfer color to Color Picker module', () => {
      service.sendToPicker('#10B981');
      expect(service.selectedColor()).toBe('#10B981');
      expect(service.activeModule()).toBe('picker');
    });

    it('should transfer color to Contrast Checker (Text FG and Background BG)', () => {
      service.sendToContrast('#FFFFFF', 'fg');
      expect(service.contrastFg()).toBe('#FFFFFF');
      expect(service.activeModule()).toBe('contrast');

      service.sendToContrast('#000000', 'bg');
      expect(service.contrastBg()).toBe('#000000');
    });

    it('should transfer color as stop in CSS Gradient Builder', () => {
      service.sendToGradient('#F43F5E');
      expect(service.activeModule()).toBe('gradient');
      expect(service.gradientConfig().stops.some(s => s.color === '#F43F5E')).toBe(true);
    });

    it('should transfer color to Palette Generator', () => {
      service.sendToPalette('#6366F1');
      expect(service.activeModule()).toBe('palette');
      expect(service.paletteItems().some(p => p.hex === '#6366F1')).toBe(true);
    });

    it('should transfer color to Vision Simulator', () => {
      service.sendToSimulator('#EC4899');
      expect(service.selectedColor()).toBe('#EC4899');
      expect(service.activeModule()).toBe('simulator');
    });
  });
});


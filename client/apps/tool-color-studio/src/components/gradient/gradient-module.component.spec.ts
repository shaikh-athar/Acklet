// @vitest-environment jsdom
// apps/tool-color-studio/src/components/gradient/gradient-module.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { GradientModuleComponent } from './gradient-module.component';
import { ColorStudioStateService } from '../../services/color-studio-state.service';
import { GradientService } from '../../services/gradient.service';
import { ColorEngineService } from '../../services/color-engine.service';

describe('GradientModuleComponent (Phase 6 - CSS Gradient Generator)', () => {
  let component: GradientModuleComponent;
  let state: ColorStudioStateService;
  let gradientService: GradientService;
  let engine: ColorEngineService;

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    state = new ColorStudioStateService();
    gradientService = new GradientService();
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
        if (token === GradientService) return gradientService;
        if (token === ColorEngineService) return engine;
        return notFound;
      }
    } as any;

    const envInjector = createEnvironmentInjector([], rootInjector);

    runInInjectionContext(envInjector, () => {
      component = new GradientModuleComponent();
    });

    // Reset default gradient
    component.resetToDefaults();
  });

  describe('1. Component Initialization & Default State', () => {
    it('should create the Gradient Module component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with linear gradient at 135deg and 3 stops', () => {
      expect(component.currentType()).toBe('linear');
      expect(component.currentAngle()).toBe(135);
      expect(component.stops().length).toBe(3);
      expect(component.previewBackdrop()).toBe('checkerboard');
      expect(component.fullRuleMode()).toBe(false);
    });

    it('should compute sorted stops in ascending order', () => {
      const sorted = component.sortedStops();
      expect(sorted[0].position).toBe(0);
      expect(sorted[1].position).toBe(50);
      expect(sorted[2].position).toBe(100);
    });

    it('should compute valid CSS output', () => {
      const css = component.formattedCssOutput();
      expect(css).toContain('background: linear-gradient(135deg,');
      expect(css).toContain('#E11D48 0%');
      expect(css).toContain('#3B82F6 100%');
    });

    it('should compute full CSS rule when fullRuleMode is enabled', () => {
      component.fullRuleMode.set(true);
      const rule = component.formattedCssOutput();
      expect(rule).toContain('.custom-gradient {');
      expect(rule).toContain('background-color:');
      expect(rule).toContain('background-image:');
    });
  });

  describe('2. Gradient Type Switching & Parameter Controls', () => {
    it('should switch between linear, radial, and conic without losing existing stops', () => {
      const initialStopsCount = component.stops().length;

      component.setType('radial');
      expect(component.currentType()).toBe('radial');
      expect(component.stops().length).toBe(initialStopsCount);

      component.setType('conic');
      expect(component.currentType()).toBe('conic');
      expect(component.stops().length).toBe(initialStopsCount);

      component.setType('linear');
      expect(component.currentType()).toBe('linear');
      expect(component.stops().length).toBe(initialStopsCount);
    });

    it('should update linear angle and normalize values', () => {
      component.onAngleChange(45);
      expect(component.currentAngle()).toBe(45);

      component.onAngleChange(405); // 405 % 360 = 45
      expect(component.currentAngle()).toBe(45);
    });

    it('should update radial shape and extent', () => {
      component.setType('radial');
      component.setShape('ellipse');
      expect(component.currentShape()).toBe('ellipse');

      component.setExtent('closest-side');
      expect(component.currentExtent()).toBe('closest-side');
    });

    it('should update radial and conic center position coordinates', () => {
      component.setPosition(25, 75);
      expect(component.currentPosX()).toBe(25);
      expect(component.currentPosY()).toBe(75);

      component.onPosXChange(80);
      expect(component.currentPosX()).toBe(80);

      component.onPosYChange(20);
      expect(component.currentPosY()).toBe(20);
    });

    it('should generate gradient summary text correctly', () => {
      component.setType('linear');
      component.onAngleChange(180);
      expect(component.getGradientSummary()).toBe('180°');

      component.setType('radial');
      component.setPosition(50, 50);
      expect(component.getGradientSummary()).toContain('circle at 50% 50%');

      component.setType('conic');
      component.onAngleChange(90);
      expect(component.getGradientSummary()).toContain('from 90° at 50% 50%');
    });
  });

  describe('3. Dynamic Color Stops Operations', () => {
    it('should add a new stop and select it', () => {
      const initialCount = component.stops().length;
      component.addStop();
      expect(component.stops().length).toBe(initialCount + 1);
      expect(component.selectedStopId()).toBeTruthy();
    });

    it('should allow removing a stop when stops > 2', () => {
      component.addStop(); // 4 stops now
      const stopToRemove = component.stops()[0].id;
      component.removeStop(stopToRemove);
      expect(component.stops().find(s => s.id === stopToRemove)).toBeUndefined();
    });

    it('should prevent removing a stop when only 2 stops remain', () => {
      // Remove stop 3 so only 2 stops remain
      const thirdStop = component.stops()[2].id;
      component.removeStop(thirdStop);
      expect(component.stops().length).toBe(2);

      // Attempt to remove another stop
      const secondStop = component.stops()[1].id;
      component.removeStop(secondStop);
      expect(component.stops().length).toBe(2); // Still 2 stops
    });

    it('should update stop color with valid normalization', () => {
      const stopId = component.stops()[0].id;
      component.updateStopColor(stopId, '#10b981');
      expect(component.stops().find(s => s.id === stopId)?.color).toBe('#10B981');
    });

    it('should update stop position with percentage clamping', () => {
      const stopId = component.stops()[1].id;
      component.updateStopPosition(stopId, 65);
      expect(component.stops().find(s => s.id === stopId)?.position).toBe(65);

      component.updateStopPosition(stopId, 150);
      expect(component.stops().find(s => s.id === stopId)?.position).toBe(100);
    });

    it('should toggle stop lock status', () => {
      const stopId = component.stops()[0].id;
      expect(component.stops().find(s => s.id === stopId)?.locked).toBeFalsy();

      component.toggleLock(stopId);
      expect(component.stops().find(s => s.id === stopId)?.locked).toBe(true);

      component.toggleLock(stopId);
      expect(component.stops().find(s => s.id === stopId)?.locked).toBe(false);
    });

    it('should compute adjacent stop min and max bounds to prevent crossing', () => {
      // Default stops: 0%, 50%, 100%
      expect(component.getStopMinBound(0)).toBe(0);
      expect(component.getStopMaxBound(0)).toBe(50);

      expect(component.getStopMinBound(1)).toBe(0);
      expect(component.getStopMaxBound(1)).toBe(100);

      expect(component.getStopMinBound(2)).toBe(50);
      expect(component.getStopMaxBound(2)).toBe(100);
    });

    it('should clamp position changes within adjacent stop bounds on slider change', () => {
      const middleStop = component.sortedStops()[1];
      component.onPositionSliderChange(middleStop.id, 75, 1);
      expect(component.stops().find(s => s.id === middleStop.id)?.position).toBe(75);

      // Attempt to exceed next stop (100)
      component.onPositionSliderChange(middleStop.id, 120, 1);
      expect(component.stops().find(s => s.id === middleStop.id)?.position).toBe(100);

      // Attempt to go below previous stop (0)
      component.onPositionSliderChange(middleStop.id, -20, 1);
      expect(component.stops().find(s => s.id === middleStop.id)?.position).toBe(0);
    });

    it('should validate manual number input and clamp out-of-range values on blur', () => {
      const middleStop = component.sortedStops()[1];

      // Enter valid number (60%) between 0% and 100%
      component.onPositionNumberChange(middleStop.id, 60, 1);
      expect(component.isStopPositionInvalid(middleStop.id)).toBe(false);
      expect(component.stops().find(s => s.id === middleStop.id)?.position).toBe(60);

      // Enter out-of-bounds number (130%)
      component.onPositionNumberChange(middleStop.id, 130, 1);
      expect(component.isStopPositionInvalid(middleStop.id)).toBe(true);

      // On blur, clamps to maximum valid bound (100) and clears error
      const mockEvent = { target: { value: '130' } } as unknown as Event;
      component.onPositionNumberBlur(middleStop.id, mockEvent, 1);
      expect(component.isStopPositionInvalid(middleStop.id)).toBe(false);
      expect(component.stops().find(s => s.id === middleStop.id)?.position).toBe(100);
    });

    it('should add quick stop from palette swatch', () => {
      const initialCount = component.stops().length;
      component.addQuickStop('#F59E0B');
      expect(component.stops().length).toBe(initialCount + 1);
      expect(component.stops().some(s => s.color === '#F59E0B')).toBe(true);
    });
  });

  describe('4. Global Actions: Reverse, Distribute, Reset, Backdrop', () => {
    it('should reverse stops colors and positions', () => {
      const initialFirst = component.stops()[0].color;
      const initialLast = component.stops()[2].color;

      component.reverseStops();
      const updated = component.sortedStops();
      expect(updated[0].color).toBe(initialLast);
      expect(updated[2].color).toBe(initialFirst);
    });

    it('should distribute unlocked stops equally', () => {
      const s0 = component.stops()[0].id;
      const s1 = component.stops()[1].id;
      const s2 = component.stops()[2].id;

      component.updateStopPosition(s0, 10);
      component.updateStopPosition(s1, 20);
      component.updateStopPosition(s2, 90);

      component.distributeStops();
      const distributed = component.sortedStops();
      expect(distributed[0].position).toBe(0);
      expect(distributed[1].position).toBe(50);
      expect(distributed[2].position).toBe(100);
    });

    it('should reset gradient to defaults', () => {
      component.setType('radial');
      component.onAngleChange(270);
      component.addStop();

      component.resetToDefaults();
      expect(component.currentType()).toBe('linear');
      expect(component.currentAngle()).toBe(135);
      expect(component.stops().length).toBe(3);
    });

    it('should toggle preview backdrop between checkerboard, dark, and light', () => {
      component.setBackdrop('dark');
      expect(component.previewBackdrop()).toBe('dark');

      component.setBackdrop('light');
      expect(component.previewBackdrop()).toBe('light');

      component.setBackdrop('checkerboard');
      expect(component.previewBackdrop()).toBe('checkerboard');
    });
  });

  describe('5. Presets & Saved Custom Gradients', () => {
    it('should apply an inspiration preset', () => {
      const preset = gradientService.getPresets().find(p => p.name === 'Deep Ocean');
      expect(preset).toBeTruthy();
      if (preset) {
        component.applyPreset(preset);
        expect(component.currentAngle()).toBe(preset.config.angle);
        expect(component.stops().length).toBe(preset.config.stops.length);
      }
    });

    it('should filter presets by category', () => {
      component.presetFilter.set('radial');
      const radialOnly = component.filteredPresets();
      expect(radialOnly.every(p => p.config.type === 'radial')).toBe(true);

      component.presetFilter.set('conic');
      const conicOnly = component.filteredPresets();
      expect(conicOnly.every(p => p.config.type === 'conic')).toBe(true);

      component.presetFilter.set('popular');
      const popularOnly = component.filteredPresets();
      expect(popularOnly.length).toBeGreaterThan(0);
      expect(popularOnly.every(p => p.category === 'popular')).toBe(true);

      component.presetFilter.set('nature');
      const natureOnly = component.filteredPresets();
      expect(natureOnly.length).toBeGreaterThan(0);
      expect(natureOnly.every(p => p.category === 'nature')).toBe(true);

      component.presetFilter.set('all');
      expect(component.filteredPresets().length).toBe(gradientService.getPresets().length);
    });

    it('should save current gradient and allow applying it', () => {
      const initialSavedCount = state.savedGradients().length;
      component.saveCurrentGradient();
      expect(state.savedGradients().length).toBe(initialSavedCount + 1);

      const newlySaved = state.savedGradients()[0];
      component.applySavedGradient(newlySaved);
      expect(component.currentAngle()).toBe(newlySaved.config.angle);
    });

    it('should rename and delete saved gradients', () => {
      component.saveCurrentGradient();
      const target = state.savedGradients()[0];

      component.startRenaming(target.id);
      expect(component.renamingId()).toBe(target.id);

      const fakeEvent = { target: { value: 'Renamed Sunset' } } as unknown as Event;
      component.saveRename(target.id, fakeEvent);
      expect(component.renamingId()).toBeNull();
      expect(state.savedGradients().find(g => g.id === target.id)?.name).toBe('Renamed Sunset');

      component.deleteSaved(target.id);
      expect(state.savedGradients().find(g => g.id === target.id)).toBeUndefined();
    });
  });

  describe('6. Export Suite: CSS, File Downloads, PNG', () => {
    it('should copy CSS to clipboard and display toast', () => {
      component.copyCss();
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      expect(state.toast()).toBeTruthy();
    });

    it('should trigger CSS file download', () => {
      const spy = vi.spyOn<any, any>(component, 'triggerDownload').mockImplementation(() => {});
      component.downloadCssFile();
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('linear-gradient'), 'gradient.css', 'text/css');
      spy.mockRestore();
    });

    it('should trigger JSON export file download', () => {
      const spy = vi.spyOn<any, any>(component, 'triggerDownload').mockImplementation(() => {});
      component.exportJsonFile();
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Acklet Color Studio'), 'gradient.json', 'application/json');
      spy.mockRestore();
    });

    it('should handle PNG download safely', () => {
      // In JSDOM canvas.toBlob might be stubbed
      HTMLCanvasElement.prototype.toBlob = vi.fn((callback: any) => {
        callback(new Blob(['fake-image'], { type: 'image/png' }));
      });
      const spy = vi.spyOn<any, any>(component, 'triggerDownload').mockImplementation(() => {});
      component.downloadPng();
      expect(state.toast()).toBeTruthy();
      spy.mockRestore();
    });
  });

  describe('7. Cross-Module Synchronizations', () => {
    it('should send a stop color to Color Picker', () => {
      const color = '#E11D48';
      component.sendStopToPicker(color);
      expect(state.selectedColor()).toBe(color);
      expect(state.activeModule()).toBe('picker');
    });

    it('should save a stop color to bookmarks', () => {
      component.saveStopColor('#0EA5E9');
      expect(state.isColorSaved('#0EA5E9')).toBe(true);
    });

    it('should send all gradient stops to the shared palette', () => {
      component.sendStopsToSharedPalette();
      expect(state.sharedColorPalettes().length).toBe(3);
    });

    it('should populate gradient stops from shared palette', () => {
      state.setSharedPalette(['#10B981', '#06B6D4', '#3B82F6', '#6366F1']);
      component.populateFromSharedPalette();
      expect(component.stops().length).toBe(4);
      expect(component.stops()[0].color).toBe('#10B981');
      expect(component.stops()[3].color).toBe('#6366F1');
    });

    it('should trigger native color picker safely with showPicker or click fallback', () => {
      const mockInput = {
        showPicker: vi.fn(),
        click: vi.fn()
      } as unknown as HTMLInputElement;

      component.triggerNativePicker(mockInput);
      expect(mockInput.showPicker).toHaveBeenCalled();

      // Test fallback if showPicker throws
      const mockFailingInput = {
        showPicker: vi.fn().mockImplementation(() => { throw new Error('Not supported'); }),
        click: vi.fn()
      } as unknown as HTMLInputElement;

      component.triggerNativePicker(mockFailingInput);
      expect(mockFailingInput.click).toHaveBeenCalled();
    });
  });

  describe('8. Intelligent Gradient Repair & Undo/Redo', () => {
    it('should open and close repair modal', () => {
      expect(component.isRepairModalOpen()).toBe(false);
      component.openRepairModal();
      expect(component.isRepairModalOpen()).toBe(true);
      component.closeRepairModal();
      expect(component.isRepairModalOpen()).toBe(false);
    });

    it('should apply repaired gradient, push undo state, and support undo/redo', () => {
      const originalStops = component.stops();
      const repairedConfig = {
        ...state.gradientConfig(),
        stops: [
          { id: 'rep-1', color: '#10B981', position: 0 },
          { id: 'rep-2', color: '#3B82F6', position: 50 },
          { id: 'rep-3', color: '#8B5CF6', position: 100 }
        ]
      };

      component.openRepairModal();
      component.onRepairApplied(repairedConfig);

      expect(component.isRepairModalOpen()).toBe(false);
      expect(component.stops()[0].color).toBe('#10B981');
      expect(state.canUndoGradient()).toBe(true);

      // Test Undo
      state.undoGradient();
      expect(component.stops()[0].color).toBe(originalStops[0].color);
      expect(state.canRedoGradient()).toBe(true);

      // Test Redo
      state.redoGradient();
      expect(component.stops()[0].color).toBe('#10B981');
    });
  });
});


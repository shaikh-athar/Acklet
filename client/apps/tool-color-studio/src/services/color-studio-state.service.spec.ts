// apps/tool-color-studio/src/services/color-studio-state.service.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import { ColorStudioStateService } from './color-studio-state.service';
import { ColorEngineService } from './color-engine.service';

describe('ColorStudioStateService', () => {
  let service: ColorStudioStateService;

  beforeEach(() => {
    service = new ColorStudioStateService();
  });

  it('should initialize with default active color (#E11D48) and picker tab', () => {
    expect(service.activeColor().toUpperCase()).toBe('#E11D48');
    expect(service.activeTab()).toBe('picker');
  });

  it('should support color changes with undo and redo history', () => {
    service.setActiveColor('#3B82F6');
    expect(service.activeColor()).toBe('#3B82F6');
    expect(service.canUndo()).toBe(true);

    service.setActiveColor('#10B981');
    expect(service.activeColor()).toBe('#10B981');

    // Undo to #3B82F6
    service.undo();
    expect(service.activeColor()).toBe('#3B82F6');
    expect(service.canRedo()).toBe(true);

    // Redo back to #10B981
    service.redo();
    expect(service.activeColor()).toBe('#10B981');
  });

  it('should generate a random vibrant color on randomizeActiveColor()', () => {
    const prior = service.activeColor();
    service.randomizeActiveColor();
    expect(service.activeColor()).toMatch(/^#[0-9A-F]{6}$/i);
    expect(service.canUndo()).toBe(true);
  });

  it('should manage the shared working palette (add, remove, cap at 10)', () => {
    const initialCount = service.sharedWorkingPalette().length;
    service.addToSharedPalette('#9333EA');
    expect(service.sharedWorkingPalette()).toContain('#9333EA');
    expect(service.sharedWorkingPalette().length).toBe(initialCount + 1);

    // Do not add duplicates
    service.addToSharedPalette('#9333EA');
    expect(service.sharedWorkingPalette().length).toBe(initialCount + 1);

    // Remove swatch
    service.removeFromSharedPalette(service.sharedWorkingPalette().indexOf('#9333EA'));
    expect(service.sharedWorkingPalette()).not.toContain('#9333EA');
  });

  it('should correctly route cross-module transfers to contrast checker', () => {
    service.sendToContrast('#000000', 'fg');
    expect(service.contrastFg()).toBe('#000000');
    expect(service.activeTab()).toBe('contrast');

    service.sendToContrast('#FFFFFF', 'bg');
    expect(service.contrastBg()).toBe('#FFFFFF');
  });

  it('should correctly route cross-module transfers to gradient builder', () => {
    service.sendToGradient('#F43F5E');
    expect(service.activeTab()).toBe('gradient');
    const stops = service.gradientConfig().stops;
    expect(stops.some(s => s.color === '#F43F5E')).toBe(true);
  });

  it('should toggle and close the mobile sidebar drawer', () => {
    expect(service.sidebarOpen()).toBe(false);
    service.toggleSidebar();
    expect(service.sidebarOpen()).toBe(true);
    service.closeSidebar();
    expect(service.sidebarOpen()).toBe(false);
  });

  it('should compute activeHarmonies reactively when active color changes', () => {
    service.setActiveColor('#FF0000');
    const harmonies = service.activeHarmonies();
    expect(harmonies.complementary).toBeDefined();
    expect(harmonies.complementary.length).toBeGreaterThan(0);
    expect(harmonies.triadic).toBeDefined();
    expect(harmonies.triadic.length).toBe(5);
  });
});

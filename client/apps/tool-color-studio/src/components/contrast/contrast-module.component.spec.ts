// @vitest-environment jsdom
// apps/tool-color-studio/src/components/contrast/contrast-module.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { ContrastModuleComponent } from './contrast-module.component';
import { ColorStudioStateService } from '../../services/color-studio-state.service';
import { ColorEngineService } from '../../services/color-engine.service';
import { ContrastService } from '../../services/contrast.service';
import { ExportService } from '../../services/export.service';

describe('ContrastModuleComponent (Phase 7 - Color Contrast Checker)', () => {
  let component: ContrastModuleComponent;
  let state: ColorStudioStateService;
  let engine: ColorEngineService;
  let contrastService: ContrastService;
  let exportService: ExportService;

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    state = new ColorStudioStateService();
    engine = new ColorEngineService();
    contrastService = new ContrastService();
    exportService = new ExportService();

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
        if (token === ContrastService) return contrastService;
        if (token === ExportService) return exportService;
        return notFound;
      }
    } as any;

    const envInjector = createEnvironmentInjector([], rootInjector);

    runInInjectionContext(envInjector, () => {
      component = new ContrastModuleComponent();
    });

    // Reset default contrast pair: Dark slate on Pure white
    state.setContrastFg('#0F172A');
    state.setContrastBg('#FFFFFF');
  });

  describe('1. Component Initialization & Default State', () => {
    it('should create the Contrast Module component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with #0F172A text on #FFFFFF background (Level AAA)', () => {
      expect(state.contrastFg()).toBe('#0F172A');
      expect(state.contrastBg()).toBe('#FFFFFF');
      expect(component.fgWithoutHash()).toBe('0F172A');
      expect(component.bgWithoutHash()).toBe('FFFFFF');
      expect(component.result().grade).toBe('AAA');
      expect(component.result().aaNormal).toBe(true);
      expect(component.result().ratio).toBeGreaterThan(10);
    });

    it('should initialize with default UI signals', () => {
      expect(component.activeFormat()).toBe('hex');
      expect(component.previewContext()).toBe('dark');
      expect(component.selectedCriterion()).toBe('all');
      expect(component.suggestionTarget()).toBe('AA');
    });

    it('should compute valid relative luminance for both colors', () => {
      expect(Number(component.fgLuminance())).toBeLessThan(0.1);
      expect(Number(component.bgLuminance())).toBeCloseTo(1.0, 2);
    });
  });

  describe('2. Color Inputs & Real-Time Synchronization', () => {
    it('should update foreground color and recalculate contrast immediately', () => {
      component.onFgChange('#E11D48');
      expect(state.contrastFg()).toBe('#E11D48');
      expect(component.result().fgHex).toBe('#E11D48');
    });

    it('should update background color and recalculate contrast immediately', () => {
      component.onBgChange('#000000');
      expect(state.contrastBg()).toBe('#000000');
      expect(component.result().bgHex).toBe('#000000');
    });

    it('should handle manual hex inputs with clean validation', () => {
      const mockEvent = { target: { value: '3b82f6' } } as unknown as Event;
      component.onManualFgChange(mockEvent);
      expect(state.contrastFg()).toBe('#3B82F6');
    });

    it('should revert manual hex input if invalid length is provided', () => {
      const mockInput = { value: 'xyz12' } as HTMLInputElement;
      const mockEvent = { target: mockInput } as unknown as Event;
      component.onManualFgChange(mockEvent);
      expect(mockInput.value).toBe(component.fgWithoutHash());
    });

    it('should swap foreground and background colors', () => {
      state.setContrastFg('#112233');
      state.setContrastBg('#FFEEDD');

      component.swapColors();
      expect(state.contrastFg()).toBe('#FFEEDD');
      expect(state.contrastBg()).toBe('#112233');
    });

    it('should update foreground via RGB channel edits', () => {
      state.setContrastFg('#000000');
      const mockEvent = { target: { value: '255' } } as unknown as Event;
      component.onFgRgbChange('r', mockEvent);
      expect(state.contrastFg()).toBe('#FF0000');
    });

    it('should update foreground via HSL channel edits', () => {
      state.setContrastFg('#FF0000');
      const mockEvent = { target: { value: '120' } } as unknown as Event; // Green hue
      component.onFgHslChange('h', mockEvent);
      expect(component.fgHsl().h).toBe(120);
    });
  });

  describe('3. WCAG Testing Modes & Conformance Filtering', () => {
    it('should filter criteria correctly by selected testing mode', () => {
      component.selectedCriterion.set('all');
      expect(component.shouldShowCriterion('normal-aa')).toBe(true);
      expect(component.shouldShowCriterion('large-aa')).toBe(true);
      expect(component.shouldShowCriterion('ui-component')).toBe(true);

      component.selectedCriterion.set('normal');
      expect(component.shouldShowCriterion('normal-aa')).toBe(true);
      expect(component.shouldShowCriterion('normal-aaa')).toBe(true);
      expect(component.shouldShowCriterion('large-aa')).toBe(false);

      component.selectedCriterion.set('large');
      expect(component.shouldShowCriterion('large-aa')).toBe(true);
      expect(component.shouldShowCriterion('normal-aa')).toBe(false);

      component.selectedCriterion.set('ui');
      expect(component.shouldShowCriterion('ui-component')).toBe(true);
      expect(component.shouldShowCriterion('normal-aa')).toBe(false);
    });
  });

  describe('4. Accessible Color Suggestions Engine', () => {
    it('should provide suggestions when contrast fails target threshold', () => {
      // Set low contrast: light gray on white
      state.setContrastFg('#999999');
      state.setContrastBg('#FFFFFF');

      component.setSuggestionTarget('AA');
      const suggestions = component.activeSuggestions();
      expect(suggestions.length).toBeGreaterThan(0);

      // Apply the first suggestion
      component.applySuggestion(suggestions[0]);
      expect(component.result().ratio).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('5. Gradient Multi-Point Contrast Warning', () => {
    it('should calculate contrast against gradient stops and warn when text fails', () => {
      // Set studio gradient to dark colors
      state.gradientConfig.set({
        type: 'linear',
        angle: 90,
        stops: [
          { id: '1', color: '#09090B', position: 0 },
          { id: '2', color: '#18181B', position: 100 }
        ]
      });

      // Text is dark #0F172A on dark gradient stops -> should trigger warning
      state.setContrastFg('#0F172A');
      const report = component.gradientReport();
      expect(report).toBeTruthy();
      expect(report?.allStopsPassAA).toBe(false);
      expect(report?.warning).toContain('Warning: A single solid-color contrast result cannot guarantee');
    });
  });

  describe('6. Export & Sharing Actions', () => {
    it('should copy contrast ratio to clipboard and show toast', async () => {
      await component.copyRatio();
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(component.result().ratioString);
      expect(state.toast()).toBeTruthy();
    });

    it('should copy foreground and background HEX to clipboard', async () => {
      await component.copyFgHex();
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(state.contrastFg());

      await component.copyBgHex();
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(state.contrastBg());
    });

    it('should export contrast report JSON file', () => {
      const spy = vi.spyOn(exportService, 'downloadFile').mockImplementation(() => {});
      component.exportJson();
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('WCAG 2.2'), 'contrast-report.json', 'application/json');
      spy.mockRestore();
    });

    it('should export CSS custom properties file', () => {
      const spy = vi.spyOn(exportService, 'downloadFile').mockImplementation(() => {});
      component.exportCss();
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('--color-text:'), 'contrast-tokens.css', 'text/css');
      spy.mockRestore();
    });

    it('should export Markdown report file', () => {
      const spy = vi.spyOn(exportService, 'downloadFile').mockImplementation(() => {});
      component.exportMarkdownReport();
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('# WCAG 2.2 Accessibility Evaluation Report'), 'contrast-accessibility-report.md', 'text/markdown');
      spy.mockRestore();
    });

    it('should trigger PDF print report', () => {
      const spy = vi.spyOn(exportService, 'generatePdfReport').mockImplementation(() => {});
      component.exportReportPdf();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('7. Cross-Module Synchronizations', () => {
    it('should send foreground color to Color Picker', () => {
      state.setContrastFg('#E11D48');
      component.sendFgToPicker();
      expect(state.selectedColor()).toBe('#E11D48');
      expect(state.activeModule()).toBe('picker');
    });

    it('should send background color to Color Picker', () => {
      state.setContrastBg('#6366F1');
      component.sendBgToPicker();
      expect(state.selectedColor()).toBe('#6366F1');
      expect(state.activeModule()).toBe('picker');
    });

    it('should add both colors to the shared working palette', () => {
      state.setContrastFg('#10B981');
      state.setContrastBg('#F59E0B');
      component.addBothToSharedPalette();
      expect(state.sharedColorPalettes()).toContain('#10B981');
      expect(state.sharedColorPalettes()).toContain('#F59E0B');
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
});


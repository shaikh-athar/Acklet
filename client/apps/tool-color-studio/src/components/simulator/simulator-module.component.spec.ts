// @vitest-environment jsdom
// apps/tool-color-studio/src/components/simulator/simulator-module.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { SimulatorModuleComponent } from './simulator-module.component';
import { ColorStudioStateService } from '../../services/color-studio-state.service';
import { ColorEngineService } from '../../services/color-engine.service';
import { ColorBlindnessService } from '../../services/color-blindness.service';
import { ExportService } from '../../services/export.service';
import { ColorBlindnessType } from '../../models/color.models';

describe('SimulatorModuleComponent (Vision Simulator Redesign)', () => {
  let component: SimulatorModuleComponent;
  let state: ColorStudioStateService;
  let engine: ColorEngineService;
  let cvdService: ColorBlindnessService;
  let exportService: ExportService;

  beforeEach(() => {
    vi.useFakeTimers();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    state = new ColorStudioStateService();
    engine = new ColorEngineService();
    cvdService = new ColorBlindnessService();
    exportService = new ExportService();

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
      measureText: vi.fn().mockReturnValue({ width: 60 }),
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

    const rootInjector = {
      get: (token: any, notFound?: any) => {
        if (token === ColorStudioStateService) return state;
        if (token === ColorEngineService) return engine;
        if (token === ColorBlindnessService) return cvdService;
        if (token === ExportService) return exportService;
        return notFound;
      }
    } as any;

    const envInjector = createEnvironmentInjector([], rootInjector);

    runInInjectionContext(envInjector, () => {
      component = new SimulatorModuleComponent();
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── 1. Component Initialization & Empty State ─────────────────────────────
  describe('1. Component Initialization & Clean Empty State', () => {
    it('should create the Simulator Module component', () => {
      expect(component).toBeTruthy();
    });

    it('should initially open in an empty upload state without preloaded images', () => {
      // Must not display sample images automatically
      expect(component.currentImageName()).toBeNull();
      expect(component.imageDimensions()).toBeNull();
      expect(component.imageFileSize()).toBeNull();
      expect(component.isLoading()).toBe(false);
    });

    it('should initialize with protanopia deficiency, split-slider mode, and 100% zoom', () => {
      expect(component.selectedType()).toBe('protanopia');
      expect(component.viewMode()).toBe('split-slider');
      expect(component.activeTab()).toBe('image');
      expect(component.zoomLevel()).toBe(1);
      expect(component.zoomPercent()).toBe(100);
      expect(component.splitRatio()).toBe(0.5);
      expect(component.showAnomalous()).toBe(false);
      expect(component.showExportMenu()).toBe(false);
      expect(component.isInspectorActive()).toBe(true);
    });

    it('should provide 5 main conditions and 4 anomalous conditions', () => {
      const primary = component.primaryProfiles();
      expect(primary).toHaveLength(5);
      const primaryTypes = primary.map(p => p.type);
      expect(primaryTypes).toContain('normal');
      expect(primaryTypes).toContain('protanopia');
      expect(primaryTypes).toContain('deuteranopia');
      expect(primaryTypes).toContain('tritanopia');
      expect(primaryTypes).toContain('achromatopsia');

      const anomalous = component.anomalousProfiles();
      expect(anomalous).toHaveLength(4);
      const anomalousTypes = anomalous.map(p => p.type);
      expect(anomalousTypes).toContain('protanomaly');
      expect(anomalousTypes).toContain('deuteranomaly');
      expect(anomalousTypes).toContain('tritanomaly');
      expect(anomalousTypes).toContain('achromatomaly');
    });

    it('should accurately resolve active profile details', () => {
      const profile = component.activeProfile();
      expect(profile.title).toBe('Protanopia');
      expect(profile.category).toBe('dichromacy');
      expect(profile.prevalence).toContain('1.0%');
    });
  });

  // ── 2. Deficiency Selection & Mode Switching ──────────────────────────────
  describe('2. Deficiency Selection & Mode Switching', () => {
    it('should switch between all primary and anomalous conditions', () => {
      const allTypes: ColorBlindnessType[] = [
        'normal',
        'protanopia',
        'deuteranopia',
        'tritanopia',
        'achromatopsia',
        'protanomaly',
        'deuteranomaly',
        'tritanomaly',
        'achromatomaly'
      ];
      allTypes.forEach(t => {
        component.onTypeSelect(t);
        expect(component.selectedType()).toBe(t);
        expect(component.activeProfile().type).toBe(t);
      });
    });

    it('should toggle anomalous trichromacy modes visibility', () => {
      expect(component.showAnomalous()).toBe(false);
      component.showAnomalous.update(v => !v);
      expect(component.showAnomalous()).toBe(true);
      expect(component.anomalousProfiles()).toHaveLength(4);
    });

    it('should switch comparison modes (split-slider, side-by-side, simulated-only)', () => {
      component.setViewMode('side-by-side');
      expect(component.viewMode()).toBe('side-by-side');

      component.setViewMode('simulated-only');
      expect(component.viewMode()).toBe('simulated-only');

      component.setViewMode('split-slider');
      expect(component.viewMode()).toBe('split-slider');
    });

    it('should support continuous zoom controls and clamping', () => {
      expect(component.zoomLevel()).toBe(1);

      component.zoomIn();
      expect(component.zoomLevel()).toBe(1.25);
      expect(component.zoomPercent()).toBe(125);

      component.zoomOut();
      expect(component.zoomLevel()).toBe(1);

      component.setZoom(2);
      expect(component.zoomLevel()).toBe(2);

      component.fitToScreen();
      expect(component.zoomLevel()).toBe(1);
      expect(component.panX()).toBe(0);
      expect(component.panY()).toBe(0);

      component.resetZoom();
      expect(component.zoomLevel()).toBe(1);
    });
  });

  // ── 3. Image Upload & File Handling ─────────────────────────────────────
  describe('3. Image Upload & File Handling', () => {
    it('should reject unsupported file formats and auto-dismiss after 5s', () => {
      const mockFile = new File(['text-data'], 'document.pdf', { type: 'application/pdf' });
      component.processFile(mockFile);

      expect(component.errorMessage()).toContain('Unsupported file format');

      // 5-second timer test
      vi.advanceTimersByTime(5000);
      expect(component.errorMessage()).toBeNull();
    });

    it('should reject files exceeding the 25 MB limit and auto-dismiss after 5s', () => {
      const largeFile = new File([''], 'huge.png', { type: 'image/png' });
      Object.defineProperty(largeFile, 'size', { value: 30 * 1024 * 1024 });

      component.processFile(largeFile);
      expect(component.errorMessage()).toContain('25 MB');

      vi.advanceTimersByTime(5000);
      expect(component.errorMessage()).toBeNull();
    });

    it('should accept valid PNG images and format file size', () => {
      const validFile = new File(['fake-png-bytes'], 'design-mockup.png', { type: 'image/png' });
      Object.defineProperty(validFile, 'size', { value: 2048 * 1024 }); // 2 MB

      component.processFile(validFile);
      expect(component.currentImageName()).toBe('design-mockup.png');
      expect(component.imageFileSize()).toBe('2.0 MB');
      expect(component.errorMessage()).toBeNull();
    });

    it('should clear image and reset state on clearImage', () => {
      component.currentImageName.set('test.png');
      component.imageDimensions.set({ width: 800, height: 600 });
      component.imageFileSize.set('150 KB');

      component.clearImage();
      expect(component.currentImageName()).toBeNull();
      expect(component.imageDimensions()).toBeNull();
      expect(component.imageFileSize()).toBeNull();
      expect(component.hoverPixelData()).toBeNull();
      expect(component.imageInsights()).toBeNull();
    });

    it('should handle drag and drop events across the workspace', () => {
      const dragOverEvent = { preventDefault: vi.fn() } as any;
      component.onDragOver(dragOverEvent);
      expect(component.isDraggingOver()).toBe(true);

      const dragLeaveEvent = { preventDefault: vi.fn() } as any;
      component.onDragLeave(dragLeaveEvent);
      expect(component.isDraggingOver()).toBe(false);

      const mockDropFile = new File(['test'], 'drop-image.jpg', { type: 'image/jpeg' });
      const dropEvent = {
        preventDefault: vi.fn(),
        dataTransfer: { files: [mockDropFile] }
      } as any;

      component.onDrop(dropEvent);
      expect(component.isDraggingOver()).toBe(false);
      expect(component.currentImageName()).toBe('drop-image.jpg');
    });
  });

  // ── 4. Split Slider & Drag Interactions ───────────────────────────────────
  describe('4. Interactive Split Slider', () => {
    it('should update split ratio when range slider input changes', () => {
      const mockEvent = {
        target: { value: '75' }
      } as any;

      component.onSplitSliderInput(mockEvent);
      expect(component.splitRatio()).toBe(0.75);
    });

    it('should clamp split ratio between 0 and 1', () => {
      const mockEvent = {
        target: { value: '100' }
      } as any;

      component.onSplitSliderInput(mockEvent);
      expect(component.splitRatio()).toBe(1);
    });

    it('should handle mouse down to start slider drag', () => {
      const mockMouseDown = { clientX: 200 } as any;
      component.startSliderDrag(mockMouseDown);
      component.onWindowMouseUp();
    });
  });

  // ── 5. Color Inspector & Peek Original ────────────────────────────────────
  describe('5. Color Inspector & Interactive Tools', () => {
    it('should toggle color inspector mode', () => {
      expect(component.isInspectorActive()).toBe(true);
      component.toggleInspector();
      expect(component.isInspectorActive()).toBe(false);
      expect(component.hoverPixelData()).toBeNull();
      component.toggleInspector();
      expect(component.isInspectorActive()).toBe(true);
    });

    it('should toggle peek original in simulated mode', () => {
      expect(component.isPeekingOriginal()).toBe(false);
      component.startPeekingOriginal();
      expect(component.isPeekingOriginal()).toBe(true);
      component.stopPeekingOriginal();
      expect(component.isPeekingOriginal()).toBe(false);
    });
  });

  // ── 6. Palette Simulation & Conflict Detection ────────────────────────────
  describe('6. Palette Simulation & Conflict Detection', () => {
    it('should import active studio color into palette', () => {
      state.setActiveColor('#10B981');
      component.importFromActiveColor();
      expect(component.paletteColors()).toContain('#10B981');
    });

    it('should reset palette from shared studio palette', () => {
      state.setSharedPalette(['#E11D48', '#3B82F6', '#10B981']);
      component.importSharedPalette();
      expect(component.paletteColors()).toEqual(['#E11D48', '#3B82F6', '#10B981']);
    });

    it('should compute simulation result and flag confusable color pairs under achromatopsia', () => {
      component.paletteColors.set(['#C026D3', '#0284C7', '#FFFFFF']);
      component.onTypeSelect('achromatopsia');

      const result = component.simulationResult();
      expect(result.type).toBe('achromatopsia');
      expect(result.items).toHaveLength(3);
      expect(result.riskCount).toBeGreaterThanOrEqual(1);
      expect(result.items[0].hasConflict).toBe(true);
    });

    it('should copy simulated hex code to clipboard', () => {
      component.copySimulatedHex('#8E8A00');
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('#8E8A00');
    });

    it('should set swatch as active studio color', () => {
      component.setAsActiveColor('#3B82F6');
      expect(state.activeColor()).toBe('#3B82F6');
    });
  });

  // ── 7. Export Functionality ───────────────────────────────────────────────
  describe('7. Export Functionality', () => {
    it('should toggle export popover visibility', () => {
      expect(component.showExportMenu()).toBe(false);
      component.toggleExportMenu();
      expect(component.showExportMenu()).toBe(true);
      component.toggleExportMenu();
      expect(component.showExportMenu()).toBe(false);
    });

    it('should download simulated image through ColorBlindnessService', () => {
      const spy = vi.spyOn(cvdService, 'downloadCanvas').mockImplementation(() => {});
      component.downloadSimulatedImage('image/png');
      expect(component.showExportMenu()).toBe(false);
    });

    it('should download original image through ColorBlindnessService', () => {
      const spy = vi.spyOn(cvdService, 'downloadCanvas').mockImplementation(() => {});
      component.downloadOriginalImage();
      expect(component.showExportMenu()).toBe(false);
    });

    it('should download split comparison snapshot', () => {
      const spy = vi.spyOn(cvdService, 'downloadCanvas').mockImplementation(() => {});
      component.downloadSplitSnapshot();
      expect(component.showExportMenu()).toBe(false);
    });

    it('should download side-by-side comparison snapshot', () => {
      const spy = vi.spyOn(cvdService, 'downloadCanvas').mockImplementation(() => {});
      component.downloadComparisonSnapshot();
      expect(component.showExportMenu()).toBe(false);
    });

    it('should export palette simulation JSON report', () => {
      const spy = vi.spyOn(exportService, 'downloadFile').mockImplementation(() => {});
      component.exportPaletteJson();
      expect(spy).toHaveBeenCalledWith(expect.any(String), 'palette-audit-protanopia.json', 'application/json');
    });

    it('should export accessibility report markdown file', () => {
      const spy = vi.spyOn(exportService, 'downloadFile').mockImplementation(() => {});
      component.exportReportMarkdown();
      expect(spy).toHaveBeenCalledWith(expect.any(String), 'accessibility-report-protanopia.md', 'text/markdown');
    });
  });

  // ── 8. Cross-Module State Integration ─────────────────────────────────────
  describe('8. Cross-Module Dispatches', () => {
    it('should send simulated color to Color Picker', () => {
      component.sendSimulatedToPicker('#10B981');
      expect(state.selectedColor()).toBe('#10B981');
      expect(state.activeModule()).toBe('picker');
    });

    it('should send simulated palette to Palette Generator and Gradient Builder', () => {
      component.sendSimulatedPaletteToGenerator();
      expect(state.activeModule()).toBe('palette');
      expect(state.sharedColorPalettes().length).toBe(component.simulationResult().items.length);
    });

    it('should save simulated colors to Shared Working Palette', () => {
      component.sendSimulatedPaletteToSharedBar();
      expect(state.sharedColorPalettes().length).toBe(component.simulationResult().items.length);
    });
  });
});

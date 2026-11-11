// @vitest-environment jsdom
// apps/tool-color-studio/src/components/extractor/image-extractor-module.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ChangeDetectorRef, createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { ImageExtractorModuleComponent } from './image-extractor-module.component';
import { ColorStudioStateService } from '../../services/color-studio-state.service';
import { ColorEngineService } from '../../services/color-engine.service';
import { RgbColor } from '../../models/color.models';

describe('ImageExtractorModuleComponent (Phase 5 - Image Color Extractor)', () => {
  let component: ImageExtractorModuleComponent;
  let state: ColorStudioStateService;
  let engine: ColorEngineService;
  let mockCtx: any;

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

    // Mock URL object methods
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    globalThis.URL.revokeObjectURL = vi.fn();

    // Mock 2D canvas context
    mockCtx = {
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn((x: number, y: number, w: number, h: number) => {
        // Return dummy pixel data: 100x100 RGB pixels (Red, Blue, Green blocks)
        const length = w * h * 4;
        const data = new Uint8ClampedArray(length);
        for (let i = 0; i < length; i += 4) {
          if (i < length / 3) {
            data[i] = 225; data[i + 1] = 29; data[i + 2] = 72; data[i + 3] = 255; // #E11D48
          } else if (i < (2 * length) / 3) {
            data[i] = 59; data[i + 1] = 130; data[i + 2] = 246; data[i + 3] = 255; // #3B82F6
          } else {
            data[i] = 16; data[i + 1] = 185; data[i + 2] = 129; data[i + 3] = 255; // #10B981
          }
        }
        return { data, width: w, height: h };
      })
    };

    HTMLCanvasElement.prototype.getContext = vi.fn((type: string) => {
      if (type === '2d') return mockCtx;
      return null;
    }) as any;

    HTMLCanvasElement.prototype.toBlob = vi.fn((callback: (blob: Blob | null) => void) => {
      callback(new Blob(['fake-png-data'], { type: 'image/png' }));
    });

    const rootInjector = {
      get: (token: any, notFound?: any) => {
        if (token === ColorStudioStateService) return state;
        if (token === ColorEngineService) return engine;
        if (token === ChangeDetectorRef) {
          return {
            markForCheck: vi.fn(),
            detectChanges: vi.fn()
          };
        }
        return notFound;
      }
    } as any;

    const envInjector = createEnvironmentInjector([], rootInjector);

    runInInjectionContext(envInjector, () => {
      component = new ImageExtractorModuleComponent();
    });

    // Provide mock canvas element ref
    const mockCanvas = document.createElement('canvas');
    mockCanvas.width = 400;
    mockCanvas.height = 260;
    component.canvasRef = { nativeElement: mockCanvas };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Component Initialization & Default State', () => {
    it('should create the Image Color Extractor component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default palette size of 8 and built-in sample images', () => {
      expect(component.selectedSize()).toBe(8);
      expect(component.availableSizes).toEqual([5, 8, 10, 12, 16]);
      expect(component.sampleImages.length).toBe(3);
      expect(component.sampleImages[0].name).toBe('Sunset Coast');
    });
  });

  describe('2. Image Upload & File Validation', () => {
    it('should accept valid PNG, JPG, JPEG, and WebP images', () => {
      const validFile = new File(['fake-png-content'], 'test-image.png', { type: 'image/png' });
      component.processFile(validFile);

      expect(component.errorMessage()).toBeNull();
      expect(globalThis.URL.createObjectURL).toHaveBeenCalledWith(validFile);
    });

    it('should reject unsupported file formats (e.g., GIF, SVG, PDF)', () => {
      const invalidFile = new File(['dummy-content'], 'document.pdf', { type: 'application/pdf' });
      component.processFile(invalidFile);

      expect(component.errorMessage()).toContain('Unsupported file format');
      expect(component.loadedImage).toBeNull();
    });

    it('should reject files exceeding the 25 MB size limit', () => {
      const oversizedFile = new File(['huge'], 'huge.jpg', { type: 'image/jpeg' });
      Object.defineProperty(oversizedFile, 'size', { value: 26 * 1024 * 1024 });

      component.processFile(oversizedFile);
      expect(component.errorMessage()).toContain('exceeds the 25 MB size limit');
    });

    it('should clear image, revoke object URLs, and reset state on clearImage()', () => {
      const validFile = new File(['content'], 'sample.webp', { type: 'image/webp' });
      component.processFile(validFile);

      component.clearImage();
      expect(component.loadedImage).toBeNull();
      expect(component.imageMetadata()).toBeNull();
      expect(component.colors()).toHaveLength(0);
      expect(component.selectedPixel()).toBeNull();
      expect(globalThis.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should auto-dismiss error message after 5 seconds', () => {
      vi.useFakeTimers();
      const invalidFile = new File(['dummy'], 'doc.pdf', { type: 'application/pdf' });
      component.processFile(invalidFile);
      expect(component.errorMessage()).toContain('Unsupported file format');

      // Advance 5 seconds
      vi.advanceTimersByTime(5000);
      expect(component.errorMessage()).toBeNull();
      vi.useRealTimers();
    });
  });

  describe('3. Dominant Color Extraction & Configurable Palette Sizes', () => {
    beforeEach(() => {
      const dummyImg = new Image(400, 260);
      component.loadedImage = dummyImg;
      component.renderAndExtract(dummyImg);
    });

    it('should extract dominant colors from image data and update state', () => {
      expect(component.colors().length).toBeGreaterThan(0);
      expect(state.extractedColors().length).toBeGreaterThan(0);
      expect(component.colors()[0].hex).toMatch(/^#[0-9A-F]{6}$/i);
      expect(component.colors()[0].percentage).toBeGreaterThan(0);
    });

    it('should dynamically update extracted colors when changing palette size to 5, 10, 12, 16', () => {
      component.changePaletteSize(5);
      expect(component.selectedSize()).toBe(5);
      expect(component.colors().length).toBeLessThanOrEqual(5);

      component.changePaletteSize(12);
      expect(component.selectedSize()).toBe(12);

      component.changePaletteSize(16);
      expect(component.selectedSize()).toBe(16);
    });

    it('should handle completely transparent images gracefully without error', () => {
      mockCtx.getImageData = vi.fn().mockReturnValue({
        data: new Uint8ClampedArray(400 * 260 * 4), // All alpha = 0
        width: 400,
        height: 260
      });

      component.extractColors(8);
      expect(component.colors()).toEqual([]);
    });
  });

  describe('4. Pixel Color Picker & Responsive Coordinate Mapping', () => {
    beforeEach(() => {
      const dummyImg = new Image(400, 200);
      component.loadedImage = dummyImg;
      component.renderAndExtract(dummyImg);
    });

    it('should sample exact pixel color on click and update selected color', () => {
      const canvasEl = component.canvasRef.nativeElement;
      // Mock getBoundingClientRect
      canvasEl.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 0,
        top: 0,
        width: 400,
        height: 200
      });

      // Click at x=100, y=50
      const clickEvent = new MouseEvent('click', { clientX: 100, clientY: 50 });
      component.onCanvasClick(clickEvent);

      expect(component.selectedPixel()).toBeDefined();
      expect(component.selectedPixel()!.x).toBe(100);
      expect(component.selectedPixel()!.y).toBe(50);
      expect(component.selectedPixel()!.xPercent).toBe(25);
      expect(component.selectedPixel()!.yPercent).toBe(25);
      expect(state.selectedColor()).toBe(component.selectedPixel()!.hex);
    });

    it('should accurately handle scaled responsive canvas dimensions during pixel sampling', () => {
      const canvasEl = component.canvasRef.nativeElement;
      canvasEl.width = 800; // Intrinsic canvas width
      canvasEl.height = 400; // Intrinsic canvas height

      // Rendered at half size in responsive CSS viewport: 400x200
      canvasEl.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 50,
        top: 50,
        width: 400,
        height: 200
      });

      // User clicks at center of rendered canvas: clientX = 250, clientY = 150
      const clickEvent = new MouseEvent('click', { clientX: 250, clientY: 150 });
      component.onCanvasClick(clickEvent);

      // Coordinate mapping should scale 2x to intrinsic canvas center (400, 200)
      expect(component.selectedPixel()!.x).toBe(400);
      expect(component.selectedPixel()!.y).toBe(200);
      expect(component.selectedPixel()!.xPercent).toBe(50);
      expect(component.selectedPixel()!.yPercent).toBe(50);
    });

    it('should update hover pixel and loupe coordinates on canvas mouse move', () => {
      const canvasEl = component.canvasRef.nativeElement;
      canvasEl.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 0,
        top: 0,
        width: 400,
        height: 200
      });

      const moveEvent = new MouseEvent('mousemove', { clientX: 50, clientY: 60 });
      Object.defineProperty(moveEvent, 'offsetX', { value: 50 });
      Object.defineProperty(moveEvent, 'offsetY', { value: 60 });

      component.onCanvasMouseMove(moveEvent);
      expect(component.hoverPixel()).toBeTruthy();
      expect(component.loupeX()).toBe(50);
      expect(component.loupeY()).toBe(60);

      component.onCanvasMouseLeave();
      expect(component.hoverPixel()).toBeNull();
    });
  });

  describe('5. Palette Management (Saving, Renaming, Deleting)', () => {
    beforeEach(() => {
      component.colors.set([
        { hex: '#1E1B4B', rgb: { r: 30, g: 27, b: 75 }, percentage: 40, isLight: false },
        { hex: '#E11D48', rgb: { r: 225, g: 29, b: 72 }, percentage: 35, isLight: false },
        { hex: '#F59E0B', rgb: { r: 245, g: 158, b: 11 }, percentage: 25, isLight: true }
      ]);
    });

    it('should save extracted palette to ColorStateService and localStorage', () => {
      state.clearSavedPalettes();
      component.newPaletteName = 'Summer Twilight';
      component.saveCurrentPalette();

      expect(state.savedPalettes()).toHaveLength(1);
      expect(state.savedPalettes()[0].name).toBe('Summer Twilight');
      expect(state.savedPalettes()[0].colors).toEqual(['#1E1B4B', '#E11D48', '#F59E0B']);
    });

    it('should support inline renaming and deletion of saved palettes', () => {
      state.clearSavedPalettes();
      const saved = state.saveExtractedPalette('Original Name', ['#111111', '#222222']);

      component.startPaletteEdit(saved);
      expect(component.editingPaletteId()).toBe(saved.id);
      expect(component.editingPaletteName).toBe('Original Name');

      component.editingPaletteName = 'New Renamed Palette';
      component.commitPaletteEdit(saved.id);

      expect(state.savedPalettes()[0].name).toBe('New Renamed Palette');
      expect(component.editingPaletteId()).toBeNull();

      // Delete palette
      state.deleteSavedPalette(saved.id);
      expect(state.savedPalettes()).toHaveLength(0);
    });

    it('should load saved palette into Shared Palette', () => {
      const palette = {
        id: 'pal-test',
        name: 'Cool Blues',
        colors: ['#0284C7', '#0369A1', '#075985'],
        timestamp: Date.now()
      };
      component.loadSavedPaletteIntoShared(palette);
      expect(state.sharedColorPalettes()).toEqual(['#0284C7', '#0369A1', '#075985']);
    });
  });

  describe('6. Export Functionality', () => {
    beforeEach(() => {
      component.colors.set([
        { hex: '#E11D48', rgb: { r: 225, g: 29, b: 72 }, percentage: 60, isLight: false },
        { hex: '#3B82F6', rgb: { r: 59, g: 130, b: 246 }, percentage: 40, isLight: true }
      ]);
    });

    it('should copy all HEX codes as a comma-separated list', () => {
      component.copyAllHex();
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('#E11D48, #3B82F6');
    });

    it('should copy all RGB codes as a line-separated list', () => {
      component.copyAllRgb();
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('rgb(225, 29, 72)\nrgb(59, 130, 246)');
    });

    it('should export palette as JSON and trigger download', () => {
      component.exportAsJson();
      expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
    });

    it('should export palette as CSS variables and trigger download', () => {
      component.exportAsCss();
      expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
    });

    it('should render offscreen canvas and trigger PNG palette download', () => {
      component.downloadAsPng();
      expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalled();
    });
  });

  describe('7. Cross-Module State Integration', () => {
    beforeEach(() => {
      component.colors.set([
        { hex: '#8B5CF6', rgb: { r: 139, g: 92, b: 246 }, percentage: 50, isLight: false },
        { hex: '#EC4899', rgb: { r: 236, g: 72, b: 153 }, percentage: 30, isLight: true },
        { hex: '#06B6D4', rgb: { r: 6, g: 182, b: 212 }, percentage: 20, isLight: true }
      ]);
    });

    it('should transfer extracted colors to Palette Generator and activate palette tab', () => {
      component.applyAsPalette();
      expect(state.paletteItems().length).toBe(3);
      expect(state.paletteItems()[0].hex).toBe('#8B5CF6');
      expect(state.activeModule()).toBe('palette');
    });

    it('should transfer extracted colors as stops to Gradient Builder and activate gradient tab', () => {
      component.applyAsGradient();
      expect(state.gradientConfig().stops.length).toBe(3);
      expect(state.gradientConfig().stops[0].color).toBe('#8B5CF6');
      expect(state.activeModule()).toBe('gradient');
    });

    it('should populate Shared Working Palette with all extracted colors', () => {
      component.sendAllToSharedPalette();
      expect(state.sharedColorPalettes()).toContain('#8B5CF6');
      expect(state.sharedColorPalettes()).toContain('#EC4899');
      expect(state.sharedColorPalettes()).toContain('#06B6D4');
    });
  });
});


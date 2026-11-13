// apps/tool-watermark-remover/src/services/coordinate-geometry.service.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { CoordinateGeometryService, ViewportTransform } from './coordinate-geometry.service';
import { RectSelection } from '../models/watermark.models';

describe('CoordinateGeometryService', () => {
  let service: CoordinateGeometryService;

  beforeEach(() => {
    service = new CoordinateGeometryService();
  });

  describe('calculateFitZoom', () => {
    it('should calculate fit scale accurately with container padding', () => {
      // 800x600 image in 1000x800 container with 32px padding (avail: 968x768)
      const scale = service.calculateFitZoom(1000, 800, 800, 600, 32);
      expect(scale).toBeLessThanOrEqual(1.0);
      expect(scale).toBeGreaterThan(0.9);
    });

    it('should clamp scale to max 1.0 when image is smaller than container', () => {
      const scale = service.calculateFitZoom(1200, 800, 400, 300);
      expect(scale).toBe(1.0);
    });

    it('should scale down large images', () => {
      const scale = service.calculateFitZoom(800, 600, 3200, 2400, 0);
      expect(scale).toBe(0.25);
    });
  });

  describe('screenToImage and imageToScreen', () => {
    const transform: ViewportTransform = {
      containerRect: { left: 100, top: 50, width: 800, height: 600 },
      zoom: 1.5,
      panX: 20,
      panY: -10,
      imgWidth: 600,
      imgHeight: 400
    };

    it('should perform accurate round-trip conversion', () => {
      const testImagePt = { x: 120, y: 250 };
      const screenPt = service.imageToScreen(testImagePt.x, testImagePt.y, transform);
      const convertedBack = service.screenToImage(screenPt.x, screenPt.y, transform);

      expect(convertedBack.x).toBe(testImagePt.x);
      expect(convertedBack.y).toBe(testImagePt.y);
    });

    it('should map the center of the image correctly', () => {
      const imgCenter = { x: 300, y: 200 };
      const screenCenter = service.imageToScreen(imgCenter.x, imgCenter.y, transform);

      // Expected screen point: container center + pan offset
      const expectedScreenX = 100 + 400 + 20; // 520
      const expectedScreenY = 50 + 300 - 10;  // 340

      expect(screenCenter.x).toBe(expectedScreenX);
      expect(screenCenter.y).toBe(expectedScreenY);
    });
  });

  describe('calculateCursorZoom', () => {
    it('keeps the image coordinate under the cursor stationary after zoom', () => {
      const initialTransform: ViewportTransform = {
        containerRect: { left: 0, top: 0, width: 800, height: 600 },
        zoom: 1.0,
        panX: 0,
        panY: 0,
        imgWidth: 800,
        imgHeight: 600
      };

      const cursorScreenX = 300;
      const cursorScreenY = 200;

      // Image coordinate before zoom
      const imgPtBefore = service.screenToImage(cursorScreenX, cursorScreenY, initialTransform);

      // Zoom in to 2.0
      const newNav = service.calculateCursorZoom(
        initialTransform.zoom,
        2.0,
        cursorScreenX,
        cursorScreenY,
        initialTransform
      );

      const updatedTransform: ViewportTransform = {
        ...initialTransform,
        zoom: newNav.zoom,
        panX: newNav.panX,
        panY: newNav.panY
      };

      // Image coordinate after zoom under same screen cursor
      const imgPtAfter = service.screenToImage(cursorScreenX, cursorScreenY, updatedTransform);

      expect(imgPtAfter.x).toBe(imgPtBefore.x);
      expect(imgPtAfter.y).toBe(imgPtBefore.y);
    });
  });

  describe('bounding box handles and manipulation', () => {
    const rect: RectSelection = { x: 100, y: 100, width: 200, height: 150 };

    it('should compute 8 handle positions accurately', () => {
      const handles = service.getHandlePositions(rect);
      expect(handles.nw).toEqual({ x: 100, y: 100 });
      expect(handles.se).toEqual({ x: 300, y: 250 });
      expect(handles.n).toEqual({ x: 200, y: 100 });
      expect(handles.e).toEqual({ x: 300, y: 175 });
    });

    it('should detect handle hit when within tolerance', () => {
      const handleHit = service.detectHandle({ x: 102, y: 99 }, rect, 6);
      expect(handleHit).toBe('nw');

      const noHit = service.detectHandle({ x: 150, y: 150 }, rect, 6);
      expect(noHit).toBeNull();
    });

    it('should resize rectangle when dragging SE handle', () => {
      const resized = service.resizeRect(rect, 'se', { x: 350, y: 300 }, 1000, 1000);
      expect(resized.x).toBe(100);
      expect(resized.y).toBe(100);
      expect(resized.width).toBe(250);
      expect(resized.height).toBe(200);
    });

    it('should move rectangle while preserving dimensions and clamping to bounds', () => {
      const moved = service.moveRect(rect, 50, 30, 500, 500);
      expect(moved.x).toBe(150);
      expect(moved.y).toBe(130);
      expect(moved.width).toBe(200);
      expect(moved.height).toBe(150);

      // Clamp at right edge
      const clamped = service.moveRect(rect, 400, 0, 450, 500);
      expect(clamped.x).toBe(250); // 450 - 200
    });

    it('should correctly check if point is inside rectangle', () => {
      expect(service.isPointInRect({ x: 150, y: 150 }, rect)).toBe(true);
      expect(service.isPointInRect({ x: 50, y: 150 }, rect)).toBe(false);
    });
  });
});


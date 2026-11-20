// apps/tool-image-compressor/src/components/preview-modal/preview-modal.component.spec.ts
import { describe, it, expect } from 'vitest';
import {
  computeIsPixelMode,
  computeZoomIn,
  computeZoomOut,
  formatBytes,
  formatImageDimensions,
  computePaneTransform
} from './preview-scale.util';

describe('Feature 2: Side by Side at Same Scale, Linked Pan & Pixel Zoom', () => {
  describe('Linked Zoom Scaling and Range (up to 800%)', () => {
    it('should zoom in step-wise and clamp at 8x (800%)', () => {
      let zoom = 1;
      zoom = computeZoomIn(zoom); // 1.5
      expect(zoom).toBe(1.5);
      zoom = computeZoomIn(zoom); // 2.0
      expect(zoom).toBe(2.0);
      zoom = computeZoomIn(zoom); // 2.5
      expect(zoom).toBe(2.5);
      zoom = computeZoomIn(zoom); // 3.0
      expect(zoom).toBe(3.0);
      zoom = computeZoomIn(zoom); // 5.0
      expect(zoom).toBe(5.0);
      zoom = computeZoomIn(zoom); // 7.0
      expect(zoom).toBe(7.0);
      zoom = computeZoomIn(zoom); // 8.0 max
      expect(zoom).toBe(8.0);
      // Attempting to zoom in further clamps at 8.0
      zoom = computeZoomIn(zoom);
      expect(zoom).toBe(8.0);
    });

    it('should zoom out step-wise and clamp at 0.5x (50%)', () => {
      let zoom = 8.0;
      zoom = computeZoomOut(zoom); // 6.0
      expect(zoom).toBe(6.0);
      zoom = computeZoomOut(zoom); // 4.0
      expect(zoom).toBe(4.0);
      zoom = computeZoomOut(zoom); // 3.0
      expect(zoom).toBe(3.0);
      zoom = computeZoomOut(zoom); // 2.5
      expect(zoom).toBe(2.5);
      zoom = computeZoomOut(zoom); // 2.0
      expect(zoom).toBe(2.0);
      zoom = computeZoomOut(zoom); // 1.5
      expect(zoom).toBe(1.5);
      zoom = computeZoomOut(zoom); // 1.0
      expect(zoom).toBe(1.0);
      zoom = computeZoomOut(zoom); // 0.75
      expect(zoom).toBe(0.75);
      zoom = computeZoomOut(zoom); // 0.5
      expect(zoom).toBe(0.5);
      zoom = computeZoomOut(zoom); // clamps at 0.5
      expect(zoom).toBe(0.5);
    });
  });

  describe('Pixel-Level Zoom Mode (Nearest-Neighbor Rendering)', () => {
    it('activates nearest-neighbor pixel mode at 400% and 800% zoom when not in fit mode', () => {
      expect(computeIsPixelMode(1, false)).toBe(false);
      expect(computeIsPixelMode(2, false)).toBe(false);
      expect(computeIsPixelMode(3, false)).toBe(false);
      expect(computeIsPixelMode(4, false)).toBe(true);
      expect(computeIsPixelMode(8, false)).toBe(true);
    });

    it('disables pixel mode when in fit mode regardless of zoom', () => {
      expect(computeIsPixelMode(8, true)).toBe(false);
    });
  });

  describe('Linked Transform and Sync Pan', () => {
    it('produces identical synchronized transform string for both original and output panes', () => {
      const panX = 140;
      const panY = -85;
      const zoomLevel = 2.5;

      const originalTransform = computePaneTransform(false, panX, panY, zoomLevel);
      const outputTransform = computePaneTransform(false, panX, panY, zoomLevel);

      expect(originalTransform).toBe('translate(140px, -85px) scale(2.5)');
      expect(outputTransform).toBe(originalTransform);
    });

    it('returns "none" transform when fit mode is active', () => {
      expect(computePaneTransform(true, 140, -85, 2.5)).toBe('none');
    });
  });

  describe('Image Metadata Labels Under Each Image', () => {
    it('formats pixel dimensions correctly', () => {
      expect(formatImageDimensions(1920, 1080)).toBe('1920 × 1080 px');
      expect(formatImageDimensions(940, 940)).toBe('940 × 940 px');
      expect(formatImageDimensions(0, 0)).toBe('Vector / Dynamic');
    });

    it('formats file sizes in KB and MB cleanly', () => {
      expect(formatBytes(102400)).toBe('100.0 KB');
      expect(formatBytes(51200)).toBe('50.0 KB');
      expect(formatBytes(2097152)).toBe('2.0 MB');
    });
  });
});

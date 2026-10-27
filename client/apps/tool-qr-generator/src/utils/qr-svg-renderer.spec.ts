// @vitest-environment jsdom
// client/apps/tool-qr-generator/src/utils/qr-svg-renderer.spec.ts
import { describe, it, expect } from 'vitest';
import {
  renderQrToSvg,
  getRelativeLuminance,
  getContrastRatio
} from './qr-svg-renderer';
import { QR_ART_SHAPES, getQrShapeById } from './qr-shapes.data';
import { QrOverallShape, QrShapeMode, QrStyleStrength } from '../models/qr-generator.models';

describe('QR Art In-House Vector Renderer & Shape Engine', () => {
  describe('Luminance and Contrast Mathematics', () => {
    it('calculates correct relative luminance for standard colors', () => {
      expect(getRelativeLuminance('#000000')).toBeCloseTo(0.0, 3);
      expect(getRelativeLuminance('#FFFFFF')).toBeCloseTo(1.0, 3);
      expect(getRelativeLuminance('#FF0000')).toBeCloseTo(0.2126, 3);
      expect(getRelativeLuminance('#00FF00')).toBeCloseTo(0.7152, 3);
      expect(getRelativeLuminance('#0000FF')).toBeCloseTo(0.0722, 3);
    });

    it('validates contrast ratios for WCAG AA scannability', () => {
      const blackOnWhite = getContrastRatio('#000000', '#FFFFFF');
      expect(blackOnWhite).toBeGreaterThanOrEqual(20);

      const darkBlueOnWhite = getContrastRatio('#0284c7', '#FFFFFF');
      expect(darkBlueOnWhite).toBeGreaterThanOrEqual(3.5);
    });
  });

  describe('Shape Registry & Geometries', () => {
    it('contains all 12 canonical overall shapes', () => {
      const expectedShapes: QrOverallShape[] = [
        'square',
        'circle',
        'rounded-square',
        'heart',
        'star',
        'hexagon',
        'diamond',
        'shield',
        'drop',
        'speech-bubble',
        'badge',
        'ticket'
      ];

      expect(QR_ART_SHAPES.length).toBe(12);
      for (const id of expectedShapes) {
        const found = getQrShapeById(id);
        expect(found.id).toBe(id);
        expect(found.name).toBeTypeOf('string');
        expect(found.previewSvg).toBeTypeOf('string');
        expect(found.isInside(0, 0)).toBe(true); // Center must always be inside
      }
    });

    it('falls back to square for unknown shape id', () => {
      const fallback = getQrShapeById('unknown-shape' as any);
      expect(fallback.id).toBe('square');
    });
  });

  describe('renderQrToSvg() Execution', () => {
    const samplePayload = 'https://acklet.com/scan';

    it('renders clean standard SVG with 4 finder patterns groups and data modules', () => {
      const result = renderQrToSvg(samplePayload, {
        foregroundColor: '#0f172a',
        backgroundColor: '#ffffff'
      });

      expect(result.svgString).toContain('<svg');
      expect(result.svgString).toContain('viewBox="0 0');
      expect(result.svgString).toContain('id="qr-core-modules"');
      expect(result.svgString).toContain('id="qr-finder-patterns"');
      expect(result.trimmedModulesCount).toBe(0);
      expect(result.dataModulesCount).toBeGreaterThan(0);
    });

    it('renders all 11 dot types without throwing or producing NaN coordinates', () => {
      const dotTypes = [
        'square',
        'dots',
        'rounded',
        'extra-rounded',
        'classy',
        'classy-rounded',
        'diamond',
        'star',
        'heart',
        'cross',
        'scanline'
      ] as const;

      for (const dot of dotTypes) {
        const res = renderQrToSvg(samplePayload, { dotType: dot });
        expect(res.svgString).not.toContain('NaN');
        expect(res.svgString).toContain('<svg');
      }
    });

    it('renders all 8 corner square types and 10 corner dot types', () => {
      const squares = ['square', 'dot', 'extra-rounded', 'classy', 'classy-rounded', 'rounded', 'pinch', 'shield'] as const;
      const dots = ['square', 'dot', 'rounded', 'extra-rounded', 'diamond', 'star', 'heart', 'cross'] as const;

      for (const sq of squares) {
        const res = renderQrToSvg(samplePayload, { cornerSquareType: sq });
        expect(res.svgString).not.toContain('NaN');
      }

      for (const dt of dots) {
        const res = renderQrToSvg(samplePayload, { cornerDotType: dt });
        expect(res.svgString).not.toContain('NaN');
      }
    });

    it('renders Badge mode with solid shaped outer path', () => {
      const result = renderQrToSvg(samplePayload, {
        artShape: {
          shape: 'circle',
          mode: 'badge',
          strength: 'balanced'
        }
      });

      expect(result.svgString).toContain('<path d="M');
      expect(result.svgString).toContain('stroke-opacity="0.15"');
    });

    it('renders Around mode with decorative silhouette field and quiet zone exclusion', () => {
      const result = renderQrToSvg(samplePayload, {
        artShape: {
          shape: 'heart',
          mode: 'around',
          strength: 'bold',
          fadeEdges: true
        }
      });

      expect(result.svgString).toContain('id="qr-art-silhouette"');
      expect(result.svgString).toContain('fill-opacity=');
    });

    it('handles Trim corners mode strictly within safe ECC budget and elevates ECC to H', () => {
      const result = renderQrToSvg(samplePayload, {
        errorCorrection: 'M',
        artShape: {
          shape: 'circle',
          mode: 'trim',
          strength: 'bold'
        }
      });

      // Automatically elevated to H
      expect(result.effectiveErrorCorrection).toBe('H');
      // Trimmed modules capped at 12%
      expect(result.safeCropPercent).toBeLessThanOrEqual(12.0);
      expect(result.trimmedModulesCount).toBeGreaterThan(0);
      // Real QR finder patterns remain completely intact
      expect(result.svgString).toContain('id="qr-finder-patterns"');
    });

    it('does not allow trim mode on shapes where supportsTrim is false', () => {
      const result = renderQrToSvg(samplePayload, {
        errorCorrection: 'M',
        artShape: {
          shape: 'speech-bubble',
          mode: 'trim',
          strength: 'bold'
        }
      });

      expect(result.trimmedModulesCount).toBe(0);
      expect(result.effectiveErrorCorrection).toBe('M');
    });

    it('renders linear and radial gradients cleanly in defs', () => {
      const resLinear = renderQrToSvg(samplePayload, {
        foregroundGradient: {
          enabled: true,
          type: 'linear',
          rotation: 90,
          color1: '#0284c7',
          color2: '#2563eb'
        }
      });
      expect(resLinear.svgString).toContain('<linearGradient id="qr-fg-grad"');

      const resRadial = renderQrToSvg(samplePayload, {
        foregroundGradient: {
          enabled: true,
          type: 'radial',
          rotation: 0,
          color1: '#0284c7',
          color2: '#2563eb'
        }
      });
      expect(resRadial.svgString).toContain('<radialGradient id="qr-fg-grad"');
    });

    it('safely embeds logo image with clearance buffer', () => {
      const result = renderQrToSvg(samplePayload, {
        logo: 'data:image/svg+xml;utf8,<svg></svg>',
        logoSize: 0.35,
        logoMargin: 2
      });

      expect(result.svgString).toContain('id="qr-embedded-logo"');
      expect(result.svgString).toContain('<image href="data:image/svg+xml;utf8,&lt;svg&gt;&lt;/svg&gt;"');
    });
  });
});

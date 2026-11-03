// apps/tool-barcode-generator/src/services/render.service.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { RenderService } from './render.service';
import { EncoderAdapter } from './encoder-adapter.service';
import { FormatRegistryService } from './format-registry.service';
import { DEFAULT_DESIGN_OPTIONS } from '../models/barcode.models';

describe('RenderService', () => {
  let renderService: RenderService;
  let registry: FormatRegistryService;

  beforeEach(() => {
    const encoder = new EncoderAdapter();
    renderService = new RenderService(encoder);
    registry = new FormatRegistryService();
  });

  describe('Barcode Rendering & Dimensions', () => {
    it('renders Code 128 (ACKLET-PKG-9821) with bar elements and positive dimensions', async () => {
      const item = registry.getFormat('code128')!;
      expect(item).toBeDefined();

      const result = await renderService.render(
        item,
        'ACKLET-PKG-9821',
        'ACKLET-PKG-9821',
        DEFAULT_DESIGN_OPTIONS
      );

      expect(result).toBeDefined();
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.svg).toContain('<svg');
      expect(result.svg).toContain('viewBox=');
      expect(result.svg).toMatch(/width="[1-9]\d*(\.\d+)?"/);
      expect(result.svg).toMatch(/height="[1-9]\d*(\.\d+)?"/);

      // Must contain bar elements (rect or path)
      const hasBarElements = result.svg.includes('<rect') || result.svg.includes('<path');
      expect(hasBarElements).toBe(true);
    });

    it('renders EAN-13 (400638133393) with bar elements and positive dimensions', async () => {
      const item = registry.getFormat('ean13')!;
      expect(item).toBeDefined();

      // Clean value with calculated check digit: 4006381333931
      const result = await renderService.render(
        item,
        '4006381333931',
        '4006381 333931',
        DEFAULT_DESIGN_OPTIONS
      );

      expect(result).toBeDefined();
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.svg).toContain('<svg');
      expect(result.svg).toMatch(/viewBox="0 0 \d+/);
      const hasBarElements = result.svg.includes('<rect') || result.svg.includes('<path');
      expect(hasBarElements).toBe(true);
    });

    it('renders Code 39 (ACKLET-1) with bar elements and positive dimensions', async () => {
      const item = registry.getFormat('code39')!;
      expect(item).toBeDefined();

      const result = await renderService.render(
        item,
        'ACKLET-1',
        'ACKLET-1',
        DEFAULT_DESIGN_OPTIONS
      );

      expect(result).toBeDefined();
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.svg).toContain('<svg');
      const hasBarElements = result.svg.includes('<rect') || result.svg.includes('<path');
      expect(hasBarElements).toBe(true);
    });

    it('renders ITF-14 (10012345678902) with bar elements and positive dimensions', async () => {
      const item = registry.getFormat('itf14')!;
      expect(item).toBeDefined();

      const result = await renderService.render(
        item,
        '10012345678902',
        '10012345678902',
        DEFAULT_DESIGN_OPTIONS
      );

      expect(result).toBeDefined();
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.svg).toContain('<svg');
      const hasBarElements = result.svg.includes('<rect') || result.svg.includes('<path');
      expect(hasBarElements).toBe(true);
    });

    it('guarantees explicit SVG root attributes (xmlns, viewBox, width, height, shape-rendering)', async () => {
      const item = registry.getFormat('code128')!;
      const result = await renderService.render(
        item,
        'TEST-BARCODE',
        'TEST-BARCODE',
        DEFAULT_DESIGN_OPTIONS
      );

      const rootSvgTagMatch = result.svg.match(/<svg[^>]*>/);
      expect(rootSvgTagMatch).not.toBeNull();
      const rootTag = rootSvgTagMatch![0];

      expect(rootTag).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(rootTag).toContain(`viewBox="0 0 ${result.width} ${result.height}"`);
      expect(rootTag).toContain(`width="${result.width}"`);
      expect(rootTag).toContain(`height="${result.height}"`);
      expect(rootTag).toContain('shape-rendering="crispEdges"');
    });

    it('passes concrete hex colors and avoids empty/transparent CSS variables in SVG engine output', async () => {
      const item = registry.getFormat('code128')!;
      const customDesign = {
        ...DEFAULT_DESIGN_OPTIONS,
        barColor: '#1E293B',
        bgColor: '#F8FAFC'
      };

      const result = await renderService.render(
        item,
        'COLOR-TEST',
        'COLOR-TEST',
        customDesign
      );

      expect(result.svg).not.toContain('var(--');
      expect(result.svg).toContain('fill=');
    });
  });
});

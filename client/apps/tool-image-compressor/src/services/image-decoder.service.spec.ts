// apps/tool-image-compressor/src/services/image-decoder.service.spec.ts
import { describe, it, expect } from 'vitest';
import { ImageDecoderService, MAX_CANVAS_DIMENSION } from './image-decoder.service';

describe('ImageDecoderService', () => {
  const service = new ImageDecoderService();

  it('creates a canvas within dimension limits', () => {
    const { canvas, ctx } = service.createCanvas(400, 300);
    expect(canvas).toBeDefined();
    expect(canvas.width).toBe(400);
    expect(canvas.height).toBe(300);
    expect(ctx).toBeDefined();
  });

  it('clamps canvas dimensions to MAX_CANVAS_DIMENSION', () => {
    const { canvas } = service.createCanvas(20000, 100);
    expect(canvas.width).toBe(MAX_CANVAS_DIMENSION);
  });

  describe('sanitizeSvg', () => {
    it('strips <script> tags from SVG strings', () => {
      const malicious = '<svg><script>alert("xss")</script><rect width="10" height="10"/></svg>';
      const sanitized = service.sanitizeSvg(malicious);
      expect(sanitized).not.toContain('<script');
      expect(sanitized).not.toContain('alert("xss")');
      expect(sanitized).toContain('<rect width="10" height="10"/>');
    });

    it('strips inline event handlers (onload, onerror, onclick)', () => {
      const malicious = '<svg onload="fetch(\'/steal\')" onclick="doHarm()"><circle r="5" onerror="bad()"/></svg>';
      const sanitized = service.sanitizeSvg(malicious);
      expect(sanitized).not.toContain('onload=');
      expect(sanitized).not.toContain('onclick=');
      expect(sanitized).not.toContain('onerror=');
      expect(sanitized).toContain('<circle r="5"');
    });

    it('neutralizes javascript: URIs in href attributes', () => {
      const malicious = '<svg><a href="javascript:alert(1)"><text>Click</text></a></svg>';
      const sanitized = service.sanitizeSvg(malicious);
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).toContain('href=""');
    });

    it('strips <foreignObject> elements', () => {
      const malicious = '<svg><foreignObject><div>HTML payload</div></foreignObject></svg>';
      const sanitized = service.sanitizeSvg(malicious);
      expect(sanitized).not.toContain('foreignObject');
      expect(sanitized).not.toContain('HTML payload');
    });
  });
});


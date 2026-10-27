// @vitest-environment jsdom
// client/apps/tool-qr-generator/src/models/qr-frames.data.spec.ts
import { describe, it, expect } from 'vitest';
import { QR_FRAME_TEMPLATES, getFrameById, renderVectorFrame } from './qr-frames.data';

describe('QR_FRAME_TEMPLATES and Frame Layout', () => {
  it('contains 18 unique frame definitions', () => {
    expect(QR_FRAME_TEMPLATES.length).toBe(18);
    const ids = new Set(QR_FRAME_TEMPLATES.map(f => f.id));
    expect(ids.size).toBe(18);
  });

  it('guarantees all qrBox boundaries fit strictly within frame dimensions', () => {
    for (const frame of QR_FRAME_TEMPLATES) {
      expect(frame.qrBox.x).toBeGreaterThanOrEqual(0);
      expect(frame.qrBox.y).toBeGreaterThanOrEqual(0);
      expect(frame.qrBox.size).toBeGreaterThan(0);
      expect(frame.qrBox.x + frame.qrBox.size).toBeLessThanOrEqual(frame.width);
      expect(frame.qrBox.y + frame.qrBox.size).toBeLessThanOrEqual(frame.height);
    }
  });

  it('provides safe inscribed qrBox for tricky geometric frames', () => {
    // 1. Award badge: circle radius 130 at center (160, 185)
    const badge = getFrameById('badge');
    const badgeCenter = { x: 160, y: 185 };
    const maxRadius = 130;
    // Check all 4 corners of qrBox are within circle radius
    const corners = [
      { x: badge.qrBox.x, y: badge.qrBox.y },
      { x: badge.qrBox.x + badge.qrBox.size, y: badge.qrBox.y },
      { x: badge.qrBox.x, y: badge.qrBox.y + badge.qrBox.size },
      { x: badge.qrBox.x + badge.qrBox.size, y: badge.qrBox.y + badge.qrBox.size }
    ];
    for (const corner of corners) {
      const dist = Math.hypot(corner.x - badgeCenter.x, corner.y - badgeCenter.y);
      expect(dist).toBeLessThan(maxRadius);
    }

    // 2. Coffee cup: tapered body does not clip QR
    const cup = getFrameById('coffee-cup');
    expect(cup.qrBox.size).toBeLessThanOrEqual(180);
    expect(cup.qrBox.x).toBeGreaterThanOrEqual(60);

    // 3. Gift box: QR fits inside box body under lid
    const gift = getFrameById('gift-box');
    expect(gift.qrBox.size).toBeLessThanOrEqual(200);
    expect(gift.qrBox.x).toBeGreaterThanOrEqual(55);
  });

  it('renders vector frame correctly with renderVectorFrame', () => {
    const frame = getFrameById('coffee-cup');
    const innerContent = '<rect width="100" height="100" fill="#000" />';
    const rendered = renderVectorFrame(frame, innerContent, 100, '#3b82f6', '#ffffff', 'SCAN');
    expect(rendered).toContain('<svg');
    expect(rendered).toContain(`x="${frame.qrBox.x}"`);
    expect(rendered).toContain(`y="${frame.qrBox.y}"`);
    expect(rendered).toContain(`width="${frame.qrBox.size}"`);
    expect(rendered).toContain(`height="${frame.qrBox.size}"`);
    expect(rendered).toContain('SCAN');
  });

  it('produces valid XML when rendering polaroid frame with embedded logo', async () => {
    const { renderQrToSvg } = await import('../utils/qr-svg-renderer');
    const qrResult = renderQrToSvg('https://acklet.com', {
      logo: 'data:image/svg+xml;utf8,<svg viewBox="0 0 24 24"><rect width="24" height="24" fill="#0A66C2"/></svg>',
      errorCorrection: 'H'
    });
    const frame = getFrameById('polaroid');
    const cleanInner = qrResult.svgString.replace(/<\?xml[^>]*\?>/i, '').trim();
    const viewBoxMatch = cleanInner.match(/viewBox=["']([^"']+)["']/i);
    const innerViewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 300 300';
    const innerContent = cleanInner.replace(/^<svg[^>]*>/i, '').replace(/<\/svg>$/i, '');
    const rendered = renderVectorFrame(frame, innerContent, 300, '#18181b', '#18181b', 'Polaroid', innerViewBox, '#ffffff');

    const parser = new (globalThis as any).DOMParser();
    const doc = parser.parseFromString(rendered, 'image/svg+xml');
    const errorNode = doc.querySelector('parsererror');
    expect(errorNode).toBeNull();
  });
});

// apps/tool-barcode-generator/src/services/temp-code-roundtrip.spec.ts
import { describe, it, expect } from 'vitest';
import { EncoderAdapter } from './encoder-adapter.service';
import { environment } from '../environments/environment';

describe('Temporary Barcode 5-Format Roundtrip & Payload Integrity', () => {
  const encoder = new EncoderAdapter();
  const token = 'c7e4g8m9k2p5x1w0';
  const verifyBaseUrl = environment.verifyBaseUrl;

  const linkPayload = `${verifyBaseUrl}/v/${token}`;
  const codePayload = token;

  const formats = [
    { id: 'qrcode', engineId: 'qrcode', name: 'QR Code' },
    { id: 'datamatrix', engineId: 'datamatrix', name: 'Data Matrix' },
    { id: 'aztec', engineId: 'azteccode', name: 'Aztec' },
    { id: 'pdf417', engineId: 'pdf417', name: 'PDF417' },
    { id: 'code128', engineId: 'code128', name: 'Code 128' }
  ];

  it('correctly constructs payloads in Link mode and Code mode', () => {
    expect(linkPayload).toBe(`${verifyBaseUrl}/v/${token}`);
    expect(linkPayload).toContain('/v/' + token);
    expect(codePayload).toBe(token);
    expect(codePayload.length).toBe(16);
  });

  for (const fmt of formats) {
    it(`renders valid vector SVG for ${fmt.name} (${fmt.id}) with link payload`, async () => {
      const svg = await encoder.encodeToSvg({
        item: {
          id: fmt.id,
          engineId: fmt.engineId,
          label: fmt.name,
          is2D: fmt.id !== 'code128'
        } as any,
        value: linkPayload,
        design: {
          scale: 3,
          barColor: '#000000',
          backgroundColor: '#ffffff',
          quietZone: 10
        } as any,
        options: {}
      });

      expect(svg).toBeDefined();
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg.length).toBeGreaterThan(100);
    });

    it(`renders valid vector SVG for ${fmt.name} (${fmt.id}) with code-only payload`, async () => {
      const svg = await encoder.encodeToSvg({
        item: {
          id: fmt.id,
          engineId: fmt.engineId,
          label: fmt.name,
          is2D: fmt.id !== 'code128'
        } as any,
        value: codePayload,
        design: {
          scale: 3,
          barColor: '#000000',
          backgroundColor: '#ffffff',
          quietZone: 10
        } as any,
        options: {}
      });

      expect(svg).toBeDefined();
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg.length).toBeGreaterThan(100);
    });
  }
});


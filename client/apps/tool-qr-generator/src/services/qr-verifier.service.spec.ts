// @vitest-environment jsdom
// client/apps/tool-qr-generator/src/services/qr-verifier.service.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QRVerifierService } from './qr-verifier.service';
import jsQR from 'jsqr';

vi.mock('jsqr', () => ({
  default: vi.fn()
}));

describe('QRVerifierService', () => {
  let service: QRVerifierService;

  beforeEach(() => {
    service = new QRVerifierService();
    vi.clearAllMocks();

    // Mock HTMLImageElement in JSDOM
    if (typeof globalThis.Image !== 'undefined') {
      Object.defineProperty(globalThis.Image.prototype, 'src', {
        set(val: string) {
          (this as any)._src = val;
          (this as any).width = 100;
          (this as any).height = 100;
          setTimeout(() => {
            if (this.onload) {
              (this.onload as any)();
            }
          }, 0);
        },
        get() {
          return (this as any)._src;
        },
        configurable: true
      });
    }

    // Mock CanvasRenderingContext2D.getImageData in JSDOM
    if (typeof HTMLCanvasElement !== 'undefined') {
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
        fillStyle: '',
        fillRect: vi.fn(),
        drawImage: vi.fn(),
        getImageData: vi.fn().mockReturnValue({
          data: new Uint8ClampedArray(400),
          width: 100,
          height: 100
        })
      }) as any;
    }
  });

  it('fails gracefully when dataUrl is empty', async () => {
    const res = await service.verifyScannability('', 'https://acklet.com');
    expect(res.isScannable).toBe(false);
    expect(res.match).toBe(false);
  });

  it('returns verified when jsQR decodes matching payload', async () => {
    (jsQR as any).mockReturnValue({
      data: 'https://acklet.com'
    });

    const res = await service.verifyScannability('data:image/png;base64,mock', 'https://acklet.com');
    expect(res.isScannable).toBe(true);
    expect(res.match).toBe(true);
    expect(res.message).toContain('Scannability Verified');
  });

  it('detects mismatch when decoded content differs from expected', async () => {
    (jsQR as any).mockReturnValue({
      data: 'https://other-site.com'
    });

    const res = await service.verifyScannability('data:image/png;base64,mock', 'https://acklet.com');
    expect(res.isScannable).toBe(true);
    expect(res.match).toBe(false);
    expect(res.message).toContain('differs');
  });

  it('reports unscannable when jsQR fails to find locator patterns', async () => {
    (jsQR as any).mockReturnValue(null);

    const res = await service.verifyScannability('data:image/png;base64,mock', 'https://acklet.com');
    expect(res.isScannable).toBe(false);
    expect(res.match).toBe(false);
    expect(res.message).toContain('Unscannable');
  });
});

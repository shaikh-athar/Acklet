// @vitest-environment jsdom
// client/apps/tool-qr-generator/src/services/qr-generator.service.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QRGeneratorService } from './qr-generator.service';

describe('QRGeneratorService', () => {
  let service: QRGeneratorService;

  beforeEach(() => {
    service = new QRGeneratorService();

    // In JSDOM, Image elements don't load data URLs automatically. Mock src setter to simulate image load.
    if (typeof globalThis.Image !== 'undefined') {
      Object.defineProperty(globalThis.Image.prototype, 'src', {
        set(val: string) {
          (this as any)._src = val;
          (this as any).width = 64;
          (this as any).height = 64;
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
  });

  describe('formatPayload()', () => {
    it('formats plain text by trimming whitespace', () => {
      expect(service.formatPayload('  Hello QR  ', 'text')).toBe('Hello QR');
    });

    it('prepends https:// to URLs if protocol is omitted', () => {
      expect(service.formatPayload('acklet.com', 'url')).toBe('https://acklet.com');
      expect(service.formatPayload('http://custom.local', 'url')).toBe('http://custom.local');
      expect(service.formatPayload('https://acklet.com/tools', 'url')).toBe('https://acklet.com/tools');
    });

    it('formats email with mailto: prefix correctly', () => {
      expect(service.formatPayload('test@example.com', 'email')).toBe('mailto:test@example.com');
      expect(service.formatPayload('mailto:already@example.com', 'email')).toBe('mailto:already@example.com');
    });

    it('formats phone numbers with tel: prefix and strips punctuation', () => {
      expect(service.formatPayload('+1 (415) 555-2671', 'phone')).toBe('tel:+14155552671');
      expect(service.formatPayload('415-555-0199', 'phone')).toBe('tel:4155550199');
      expect(service.formatPayload('tel:+442071234567', 'phone')).toBe('tel:+442071234567');
    });

    it('formats SMS with SMSTO: prefix', () => {
      expect(service.formatPayload('+14155552671', 'sms')).toBe('SMSTO:+14155552671:');
      expect(service.formatPayload('smsto:+14155552671:hello', 'sms')).toBe('SMSTO:+14155552671:hello');
    });

    it('formats WiFi with WIFI: prefix if raw', () => {
      expect(service.formatPayload('OfficeNet', 'wifi')).toBe('WIFI:S:OfficeNet;T:nopass;;');
    });

    it('formats Geo with geo: prefix if raw', () => {
      expect(service.formatPayload('37.7749,-122.4194', 'geo')).toBe('geo:37.7749,-122.4194');
    });
  });

  describe('Structured Payload Builders', () => {
    it('builds Wi-Fi payload with WPA encryption and escapes special characters', () => {
      const payload = service.buildWifiPayload({
        ssid: 'My;Special:Network',
        password: 'Pass;word:123',
        encryption: 'WPA',
        hidden: false
      });
      expect(payload).toBe('WIFI:S:My\\;Special\\:Network;T:WPA;P:Pass\\;word\\:123;;');
    });

    it('builds Wi-Fi payload for open / nopass network and hidden SSID', () => {
      const payload = service.buildWifiPayload({
        ssid: 'GuestWiFi',
        encryption: 'nopass',
        hidden: true
      });
      expect(payload).toBe('WIFI:S:GuestWiFi;T:nopass;H:true;;');
    });

    it('builds RFC vCard 3.0 contact payload correctly', () => {
      const vcard = service.buildVCardPayload({
        firstName: 'Alex',
        lastName: 'Mercer',
        phone: '+14155552671',
        email: 'alex@acklet.com',
        company: 'Acklet Inc.',
        title: 'Lead Architect',
        website: 'acklet.com',
        address: 'San Francisco, CA'
      });

      expect(vcard).toContain('BEGIN:VCARD');
      expect(vcard).toContain('VERSION:3.0');
      expect(vcard).toContain('N:Mercer;Alex;;;');
      expect(vcard).toContain('FN:Alex Mercer');
      expect(vcard).toContain('TEL;TYPE=CELL:+14155552671');
      expect(vcard).toContain('EMAIL:alex@acklet.com');
      expect(vcard).toContain('ORG:Acklet Inc.');
      expect(vcard).toContain('TITLE:Lead Architect');
      expect(vcard).toContain('URL:https://acklet.com');
      expect(vcard).toContain('ADR:;;San Francisco, CA;;;;');
      expect(vcard).toContain('END:VCARD');
    });

    it('builds minimal vCard when optional fields are omitted', () => {
      const vcard = service.buildVCardPayload({ firstName: 'SoloName' });
      expect(vcard).toContain('FN:SoloName');
      expect(vcard).not.toContain('ORG:');
      expect(vcard).toContain('END:VCARD');
    });

    it('builds SMS payload correctly', () => {
      const sms = service.buildSmsPayload({
        phone: '+1 (415) 555-2671',
        message: 'Hello Acklet!'
      });
      expect(sms).toBe('SMSTO:+14155552671:Hello Acklet!');
    });

    it('builds Geo URI payload with coordinates and optional query', () => {
      const geoWithoutQuery = service.buildGeoPayload({
        latitude: 37.7749,
        longitude: -122.4194
      });
      expect(geoWithoutQuery).toBe('geo:37.7749,-122.4194');

      const geoWithQuery = service.buildGeoPayload({
        latitude: 48.8584,
        longitude: 2.2945,
        query: 'Eiffel Tower'
      });
      expect(geoWithQuery).toBe('geo:48.8584,2.2945?q=Eiffel%20Tower');
    });
  });

  describe('validateContent()', () => {
    it('fails when content is blank', () => {
      const res = service.validateContent('   ', 'text');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('empty');
    });

    it('fails when content exceeds maximum character capacity of 2,953', () => {
      const longText = 'A'.repeat(2954);
      const res = service.validateContent(longText, 'text');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('2953 characters');
    });

    it('validates URLs correctly', () => {
      expect(service.validateContent('https://acklet.com', 'url').isValid).toBe(true);
      expect(service.validateContent('acklet.com', 'url').isValid).toBe(true);
      expect(service.validateContent('not a valid url', 'url').isValid).toBe(false);
    });

    it('validates emails correctly', () => {
      expect(service.validateContent('valid.user@example.com', 'email').isValid).toBe(true);
      expect(service.validateContent('invalid-email-at-domain', 'email').isValid).toBe(false);
    });

    it('validates phone numbers correctly', () => {
      expect(service.validateContent('+14155552671', 'phone').isValid).toBe(true);
      expect(service.validateContent('12', 'phone').isValid).toBe(false);
    });

    it('validates Wi-Fi SSID requirements', () => {
      expect(service.validateContent('WIFI:S:HomeNet;T:WPA;P:12345678;;', 'wifi').isValid).toBe(true);
      expect(service.validateContent('WIFI:S:;T:WPA;P:12345678;;', 'wifi').isValid).toBe(false);
    });

    it('validates SMS phone requirements', () => {
      expect(service.validateContent('SMSTO:+14155552671:Hi', 'sms').isValid).toBe(true);
      expect(service.validateContent('SMSTO:12:Hi', 'sms').isValid).toBe(false);
    });

    it('validates Geo coordinates range', () => {
      expect(service.validateContent('geo:37.7749,-122.4194', 'geo').isValid).toBe(true);
      expect(service.validateContent('geo:95.0000,10.0000', 'geo').isValid).toBe(false);
      expect(service.validateContent('geo:10.0000,195.0000', 'geo').isValid).toBe(false);
      expect(service.validateContent('geo:invalid,coords', 'geo').isValid).toBe(false);
    });

    it('validates vCard contains at least a contact name', () => {
      expect(service.validateContent('BEGIN:VCARD\nVERSION:3.0\nFN:Alex Mercer\nEND:VCARD', 'vcard').isValid).toBe(true);
      expect(service.validateContent('BEGIN:VCARD\nVERSION:3.0\nEND:VCARD', 'vcard').isValid).toBe(false);
    });
  });

  describe('generate()', () => {
    it('generates a valid base64 PNG data URL', async () => {
      const dataUrl = await service.generate('https://acklet.com', {
        type: 'url',
        size: 250,
        errorCorrection: 'M'
      });

      expect(dataUrl).toBeTypeOf('string');
      expect(dataUrl.startsWith('data:image/')).toBe(true);
    });

    it('throws error when generating with empty content', async () => {
      await expect(service.generate('', { type: 'text' })).rejects.toThrow(
        'Cannot generate QR code: Payload is empty.'
      );
    });
  });

  describe('downloadPng()', () => {
    it('throws error when attempting to download an empty data URL', () => {
      expect(() => service.downloadPng('')).toThrow('Download failed: No QR image available.');
    });

    it('creates an anchor tag and triggers download in browser environment', () => {
      const mockClick = vi.fn();
      const mockAppendChild = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
      const mockRemoveChild = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
      const mockCreateElement = vi.spyOn(document, 'createElement').mockReturnValue({
        set href(val: string) {},
        set download(val: string) {},
        click: mockClick
      } as unknown as HTMLAnchorElement);

      service.downloadPng('data:image/png;base64,mockPngData', 'test-qr.png');

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockClick).toHaveBeenCalled();
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();

      mockAppendChild.mockRestore();
      mockRemoveChild.mockRestore();
      mockCreateElement.mockRestore();
    });
  });

  describe('download() multi-format exports', () => {
    it('triggers download for png, svg, and jpeg formats', async () => {
      // Generate a QR code first
      await service.generate('https://acklet.com/qr', { type: 'url' });

      const mockDownload = vi.fn().mockResolvedValue(undefined);
      (service as any).currentQRCode = {
        download: mockDownload
      };

      await service.download('png', 'custom-qr');
      expect(mockDownload).toHaveBeenCalledWith({
        name: 'custom-qr',
        extension: 'png'
      });

      await service.download('svg', 'vector-qr.svg');
      expect(mockDownload).toHaveBeenCalledWith({
        name: 'vector-qr',
        extension: 'svg'
      });

      await service.download('jpeg', 'compressed-qr.jpg');
      expect(mockDownload).toHaveBeenCalledWith({
        name: 'compressed-qr',
        extension: 'jpeg'
      });
    });

    it('downloadSvg() and downloadJpeg() call download() with respective formats', async () => {
      const downloadSpy = vi.spyOn(service, 'download').mockResolvedValue(undefined);

      await service.downloadSvg('my-qr.svg');
      expect(downloadSpy).toHaveBeenCalledWith('svg', 'my-qr.svg');

      await service.downloadJpeg('my-qr.jpg');
      expect(downloadSpy).toHaveBeenCalledWith('jpeg', 'my-qr.jpg');

      downloadSpy.mockRestore();
    });

    it('throws error if download is called before any QR is generated', async () => {
      (service as any).currentQRCode = null;
      (service as any).lastDataUrl = null;

      await expect(service.download('png')).rejects.toThrow('Download failed: No QR image available.');
    });
  });

  describe('Shape & Styling Options', () => {
    it('supports custom dotType and cornerSquareType options', async () => {
      const dataUrl = await service.generate('https://acklet.com', {
        type: 'url',
        dotType: 'dots',
        cornerSquareType: 'extra-rounded',
        cornerDotType: 'dot',
        foregroundColor: '#1e3a8a',
        backgroundColor: '#f0f9ff'
      });

      expect(dataUrl).toBeTypeOf('string');
      expect(dataUrl.startsWith('data:image/')).toBe(true);
    });

    it('supports classy and classy-rounded dot styles', async () => {
      const dataUrl = await service.generate('https://acklet.com', {
        type: 'url',
        dotType: 'classy',
        cornerSquareType: 'dot',
        cornerDotType: 'dot'
      });

      expect(dataUrl).toBeTypeOf('string');
      expect(dataUrl.startsWith('data:image/')).toBe(true);
    });

    it('supports rich custom shapes (diamond, star, heart, cross, scanline, pinch, shield)', async () => {
      const shapes: Array<{ dot: any; square: any; dotCorner: any }> = [
        { dot: 'diamond', square: 'pinch', dotCorner: 'diamond' },
        { dot: 'star', square: 'shield', dotCorner: 'star' },
        { dot: 'heart', square: 'rounded', dotCorner: 'heart' },
        { dot: 'cross', square: 'classy', dotCorner: 'cross' },
        { dot: 'scanline', square: 'extra-rounded', dotCorner: 'rounded' }
      ];

      for (const s of shapes) {
        const dataUrl = await service.generate('https://acklet.com/shapes', {
          type: 'url',
          dotType: s.dot,
          cornerSquareType: s.square,
          cornerDotType: s.dotCorner
        });
        expect(dataUrl).toBeTypeOf('string');
        expect(dataUrl.startsWith('data:image/svg+xml')).toBe(true);
      }
    });

    it('supports independent custom corner square and corner dot colors', async () => {
      const dataUrl = await service.generate('https://acklet.com', {
        type: 'url',
        foregroundColor: '#0f172a',
        backgroundColor: '#ffffff',
        cornerSquareColor: '#2563eb',
        cornerDotColor: '#10b981'
      });

      expect(dataUrl).toBeTypeOf('string');
      expect(dataUrl.startsWith('data:image/')).toBe(true);
    });

    it('supports embedded logo options without throwing', async () => {
      const dataUrl = await service.generate('https://acklet.com', {
        type: 'url',
        logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        logoSize: 0.3,
        logoMargin: 2
      });

      expect(dataUrl).toBeTypeOf('string');
      expect(dataUrl.startsWith('data:image/')).toBe(true);
    });
  });

  describe('getMetadata()', () => {
    it('estimates Version 1 and calculates correct capacity for short content', () => {
      const meta = service.getMetadata('hello', 'M');
      expect(meta.version).toBe(1);
      expect(meta.capacity).toBe(14);
      expect(meta.used).toBe(5);
      expect(meta.usagePercent).toBe(35.7);
    });

    it('scales version dynamically as content length grows', () => {
      const text50 = 'a'.repeat(50);
      const meta = service.getMetadata(text50, 'M');
      expect(meta.version).toBe(4);
      expect(meta.capacity).toBe(62);
      expect(meta.used).toBe(50);
      expect(meta.usagePercent).toBe(80.6);
    });

    it('adjusts version based on error correction level', () => {
      const text20 = 'a'.repeat(20);
      const metaL = service.getMetadata(text20, 'L');
      const metaH = service.getMetadata(text20, 'H');

      // Higher error correction requires a larger version to fit the same text
      expect(metaL.version).toBeLessThanOrEqual(metaH.version);
    });
  });

  describe('wrapSvgWithFrame()', () => {
    const sampleSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="#fff"/></svg>';

    it('returns original SVG when frame style is none', () => {
      const result = service.wrapSvgWithFrame(sampleSvg, { style: 'none', text: 'SCAN ME', color: '#3b82f6', textColor: '#ffffff' }, 300, '#ffffff');
      expect(result).toBe(sampleSvg);
    });

    it('wraps with bottom-banner frame including CTA text and frame color', () => {
      const result = service.wrapSvgWithFrame(sampleSvg, { style: 'bottom-banner', text: 'VISIT WEBSITE', color: '#10b981', textColor: '#ffffff' }, 300, '#ffffff');
      expect(result).toContain('VISIT WEBSITE');
      expect(result).toContain('fill="#10b981"');
      expect(result).toContain('<text');
    });

    it('wraps with top-header frame', () => {
      const result = service.wrapSvgWithFrame(sampleSvg, { style: 'top-header', text: 'CONNECT WI-FI', color: '#3b82f6', textColor: '#ffffff' }, 300, '#ffffff');
      expect(result).toContain('CONNECT WI-FI');
      expect(result).toContain('fill="#3b82f6"');
    });

    it('wraps with polaroid frame', () => {
      const result = service.wrapSvgWithFrame(sampleSvg, { style: 'polaroid', text: 'Artisan Bistro', color: '#18181b', textColor: '#18181b' }, 300, '#ffffff');
      expect(result).toContain('ARTISAN BISTRO');
      expect(result).toContain('fill="#ffffff"');
    });

    it('wraps with badge-pill frame', () => {
      const result = service.wrapSvgWithFrame(sampleSvg, { style: 'badge-pill', text: 'EXCLUSIVE OFFER', color: '#ef4444', textColor: '#ffffff' }, 300, '#ffffff');
      expect(result).toContain('EXCLUSIVE OFFER');
      expect(result).toContain('fill="#ef4444"');
    });

    it('wraps with chat-bubble frame', () => {
      const result = service.wrapSvgWithFrame(sampleSvg, { style: 'chat-bubble', text: 'SAY HELLO', color: '#8b5cf6', textColor: '#ffffff' }, 300, '#ffffff');
      expect(result).toContain('SAY HELLO');
      expect(result).toContain('<polygon');
    });
  });

  describe('generateBatchZip()', () => {
    it('packages multiple items into a valid ZIP blob', async () => {
      const items = [
        { id: '1', title: 'Product Alpha', content: 'https://acklet.com/p1' },
        { id: '2', title: 'Product Beta', content: 'https://acklet.com/p2' }
      ];

      const blob = await service.generateBatchZip(items, { type: 'text', size: 150 });
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });
  });
});

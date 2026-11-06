// apps/tool-file-converter/src/services/file-signature.service.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { FileSignatureService } from './file-signature.service';

function createMockFile(bytes: number[], name: string, type: string = ''): File {
  const u8 = new Uint8Array(bytes);
  return new File([u8], name, { type });
}

function createTextFile(text: string, name: string, type: string = ''): File {
  return new File([text], name, { type });
}

describe('FileSignatureService', () => {
  let service: FileSignatureService;

  beforeEach(() => {
    service = new FileSignatureService();
  });

  describe('Binary Signature Detection', () => {
    it('should detect PNG files by 89 50 4E 47 magic bytes', async () => {
      const pngBytes = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D];
      const file = createMockFile(pngBytes, 'photo.png', 'image/png');

      const result = await service.detectFormat(file);

      expect(result.format).toBe('png');
      expect(result.category).toBe('image');
      expect(result.signatureVerified).toBe(true);
      expect(result.signatureName).toContain('PNG Magic Number');
      expect(result.confidence).toBe(1.0);
    });

    it('should detect JPEG files by FF D8 FF SOI marker', async () => {
      const jpegBytes = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46];
      const file = createMockFile(jpegBytes, 'image.jpg', 'image/jpeg');

      const result = await service.detectFormat(file);

      expect(result.format).toBe('jpg');
      expect(result.category).toBe('image');
      expect(result.signatureVerified).toBe(true);
      expect(result.signatureName).toContain('JPEG SOI');
    });

    it('should detect WebP files by RIFF ... WEBP header', async () => {
      const webpBytes = [
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x20, 0x00, 0x00, 0x00, // Size
        0x57, 0x45, 0x42, 0x50, // WEBP
        0x56, 0x50, 0x38, 0x20  // VP8
      ];
      const file = createMockFile(webpBytes, 'graphic.webp');

      const result = await service.detectFormat(file);

      expect(result.format).toBe('webp');
      expect(result.category).toBe('image');
      expect(result.signatureVerified).toBe(true);
    });

    it('should detect AVIF files by ftypavif brand', async () => {
      const avifBytes = [
        0x00, 0x00, 0x00, 0x1C, // box size
        0x66, 0x74, 0x79, 0x70, // ftyp
        0x61, 0x76, 0x69, 0x66, // avif
        0x00, 0x00, 0x00, 0x00
      ];
      const file = createMockFile(avifBytes, 'sample.avif');

      const result = await service.detectFormat(file);

      expect(result.format).toBe('avif');
      expect(result.category).toBe('modern-image');
      expect(result.signatureVerified).toBe(true);
    });
  });

  describe('Security & Disguise Detection', () => {
    it('should reject Windows PE/DOS executable (.exe) masquerading as .png', async () => {
      // 0x4D, 0x5A is 'MZ'
      const exeBytes = [0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00];
      const file = createMockFile(exeBytes, 'cute-cat.png', 'image/png');

      const result = await service.detectFormat(file);

      expect(result.format).toBe('exe');
      expect(result.signatureVerified).toBe(false);
      expect(result.spoofWarning).toBeDefined();
      expect(result.spoofWarning).toContain('Dangerous binary/executable');
    });

    it('should detect format mismatch when a JPEG is renamed to .png', async () => {
      const jpegBytes = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10];
      const file = createMockFile(jpegBytes, 'misnamed.png', 'image/png');

      const result = await service.detectFormat(file);

      expect(result.format).toBe('jpg');
      expect(result.signatureVerified).toBe(true);
      expect(result.spoofWarning).toContain('actual binary signature is JPEG');
    });
  });

  describe('Text & Document Signature Detection', () => {
    it('should detect SubRip (.srt) subtitles by cue pattern', async () => {
      const srtText = `1\n00:00:01,000 --> 00:00:03,500\nHello, world!\n\n2\n00:00:04,000 --> 00:00:06,000\nSecond cue line.`;
      const file = createTextFile(srtText, 'movie.srt');

      const result = await service.detectFormat(file);

      expect(result.format).toBe('srt');
      expect(result.category).toBe('subtitle');
      expect(result.signatureVerified).toBe(true);
    });

    it('should detect WebVTT (.vtt) subtitles by WEBVTT header', async () => {
      const vttText = `WEBVTT\n\n00:01.000 --> 00:04.000\nCaption line here.`;
      const file = createTextFile(vttText, 'captions.vtt');

      const result = await service.detectFormat(file);

      expect(result.format).toBe('vtt');
      expect(result.category).toBe('subtitle');
      expect(result.signatureVerified).toBe(true);
    });

    it('should detect vCard (.vcf) contacts by BEGIN:VCARD header', async () => {
      const vcfText = `BEGIN:VCARD\nVERSION:3.0\nFN:Alice Smith\nTEL;TYPE=CELL:555-0199\nEND:VCARD`;
      const file = createTextFile(vcfText, 'contacts.vcf');

      const result = await service.detectFormat(file);

      expect(result.format).toBe('vcf');
      expect(result.category).toBe('contact');
      expect(result.signatureVerified).toBe(true);
    });

    it('should detect SVG vector graphics by XML and <svg tag', async () => {
      const svgText = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="red"/></svg>`;
      const file = createTextFile(svgText, 'icon.svg');

      const result = await service.detectFormat(file);

      expect(result.format).toBe('svg');
      expect(result.category).toBe('graphics');
      expect(result.signatureVerified).toBe(true);
    });
  });
});


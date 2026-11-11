// apps/tool-image-compressor/src/services/compressor-validation.service.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { CompressorValidationService, MAX_FILE_SIZE, MAX_DIMENSION, MAX_PIXELS } from './compressor-validation.service';

describe('CompressorValidationService', () => {
  let service: CompressorValidationService;

  beforeEach(() => {
    service = new CompressorValidationService();
  });

  it('should identify file fingerprints correctly for deduplication', () => {
    const file1 = new File(['abc'], 'test.png', { type: 'image/png', lastModified: 1000 });
    const file2 = new File(['abc'], 'test.png', { type: 'image/png', lastModified: 1000 });
    const file3 = new File(['def'], 'test.png', { type: 'image/png', lastModified: 2000 });

    expect(service.getFileFingerprint(file1)).toBe(service.getFileFingerprint(file2));
    expect(service.getFileFingerprint(file1)).not.toBe(service.getFileFingerprint(file3));
  });

  it('should detect duplicates against existing item collection', () => {
    const file1 = new File(['hello'], 'photo.jpg', { type: 'image/jpeg', lastModified: 5000 });
    const existing = [
      {
        id: '1',
        file: file1
      } as any
    ];

    const duplicateCandidate = new File(['hello'], 'photo.jpg', { type: 'image/jpeg', lastModified: 5000 });
    const uniqueCandidate = new File(['hello world'], 'other.jpg', { type: 'image/jpeg', lastModified: 6000 });

    expect(service.isDuplicate(duplicateCandidate, existing)).toBe(true);
    expect(service.isDuplicate(uniqueCandidate, existing)).toBe(false);
  });

  it('should reject zero-byte files', () => {
    const emptyFile = new File([], 'empty.png', { type: 'image/png' });
    expect(() => service.validateFile(emptyFile)).toThrow('empty file');
  });

  it('should reject files exceeding 50 MB', () => {
    const largeBlob = { size: MAX_FILE_SIZE + 100, name: 'huge.jpg' } as File;
    expect(() => service.validateFile(largeBlob)).toThrow('exceeds maximum file size limit');
  });

  it('should validate dimensions within safe boundaries', () => {
    expect(() => service.validateDimensions(1920, 1080)).not.toThrow();
    expect(() => service.validateDimensions(0, 500)).toThrow('Invalid image dimensions');
    expect(() => service.validateDimensions(20000, 1000)).toThrow('exceed maximum allowed edge limit');
  });

  it('should reject decompression bomb dimensions exceeding 100 MP', () => {
    // 12000 * 12000 = 144,000,000 pixels (> 100 MP)
    expect(() => service.validateDimensions(12000, 12000)).toThrow('decompression safety limit');
  });

  it('should detect PNG binary signature', async () => {
    const pngHeader = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00]);
    const file = new File([pngHeader], 'graphic.png', { type: 'image/png' });
    const result = await service.detectFormat(file);

    expect(result.format).toBe('png');
    expect(result.isExecutable).toBe(false);
  });

  it('should detect JPEG binary signature', async () => {
    const jpegHeader = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    const file = new File([jpegHeader], 'photo.jpg', { type: 'image/jpeg' });
    const result = await service.detectFormat(file);

    expect(result.format).toBe('jpg');
    expect(result.isExecutable).toBe(false);
  });

  it('should detect WebP binary signature', async () => {
    const webpHeader = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, // 'RIFF'
      0x24, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50  // 'WEBP'
    ]);
    const file = new File([webpHeader], 'image.webp', { type: 'image/webp' });
    const result = await service.detectFormat(file);

    expect(result.format).toBe('webp');
    expect(result.isExecutable).toBe(false);
  });

  it('should detect GIF binary signature', async () => {
    const gifHeader = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]); // 'GIF89a'
    const file = new File([gifHeader], 'anim.gif', { type: 'image/gif' });
    const result = await service.detectFormat(file);

    expect(result.format).toBe('gif');
    expect(result.isExecutable).toBe(false);
  });

  it('should detect and reject executable files masquerading as media', async () => {
    const exeHeader = new Uint8Array([0x4D, 0x5A, 0x90, 0x00]); // 'MZ'
    const file = new File([exeHeader], 'virus.png', { type: 'image/png' });
    const result = await service.detectFormat(file);

    expect(result.isExecutable).toBe(true);
    expect(result.format).toBe('exe');
  });

  it('should detect SVG text content', async () => {
    const svgText = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>';
    const file = new File([svgText], 'icon.svg', { type: 'image/svg+xml' });
    const result = await service.detectFormat(file);

    expect(result.format).toBe('svg');
    expect(result.mimeType).toBe('image/svg+xml');
  });
});


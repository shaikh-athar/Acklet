// apps/tool-watermark-remover/src/services/image-validation.service.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ImageValidationService, MAX_FILE_SIZE_BYTES, MAX_EDGE_DIMENSION } from './image-validation.service';

describe('ImageValidationService', () => {
  let service: ImageValidationService;

  beforeEach(() => {
    service = new ImageValidationService();
  });

  it('accepts valid JPEG, PNG, and WebP files within size limits', () => {
    const pngFile = new File(['dummy content'], 'photo.png', { type: 'image/png' });
    const jpgFile = new File(['dummy content'], 'photo.jpg', { type: 'image/jpeg' });
    const webpFile = new File(['dummy content'], 'photo.webp', { type: 'image/webp' });

    expect(service.validateFile(pngFile).valid).toBe(true);
    expect(service.validateFile(jpgFile).valid).toBe(true);
    expect(service.validateFile(webpFile).valid).toBe(true);
  });

  it('rejects unsupported file formats', () => {
    const pdfFile = new File(['dummy content'], 'doc.pdf', { type: 'application/pdf' });
    const exeFile = new File(['dummy content'], 'app.exe', { type: 'application/octet-stream' });
    const txtFile = new File(['dummy content'], 'notes.txt', { type: 'text/plain' });

    expect(service.validateFile(pdfFile).valid).toBe(false);
    expect(service.validateFile(exeFile).valid).toBe(false);
    expect(service.validateFile(txtFile).valid).toBe(false);
  });

  it('rejects files exceeding 50 MB', () => {
    // Mock a large file
    const largeFile = {
      name: 'large.png',
      type: 'image/png',
      size: MAX_FILE_SIZE_BYTES + 1024
    } as unknown as File;

    const res = service.validateFile(largeFile);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('exceeds maximum allowed limit');
  });

  it('validates image dimensions within bounds', () => {
    expect(service.validateDimensions(1920, 1080).valid).toBe(true);
    expect(service.validateDimensions(800, 600).valid).toBe(true);
    expect(service.validateDimensions(4000, 3000).valid).toBe(true);
  });

  it('rejects image dimensions with 0 or negative values', () => {
    expect(service.validateDimensions(0, 100).valid).toBe(false);
    expect(service.validateDimensions(100, -5).valid).toBe(false);
  });

  it('rejects dimensions exceeding 8192px', () => {
    expect(service.validateDimensions(MAX_EDGE_DIMENSION + 1, 100).valid).toBe(false);
    expect(service.validateDimensions(100, MAX_EDGE_DIMENSION + 1).valid).toBe(false);
  });

  it('formats byte sizes into readable units', () => {
    expect(service.formatBytes(0)).toBe('0 B');
    expect(service.formatBytes(1024)).toBe('1 KB');
    expect(service.formatBytes(1024 * 1024 * 2.5)).toBe('2.5 MB');
  });
});


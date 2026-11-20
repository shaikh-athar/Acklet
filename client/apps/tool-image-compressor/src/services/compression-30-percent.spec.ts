// apps/tool-image-compressor/src/services/compression-30-percent.spec.ts
import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ImageCompressionService } from './image-compression.service';
import { ImageDecoderService } from './image-decoder.service';
import { ImageItem } from '../models/compressor.models';
import { DEFAULT_COMPRESSION_SETTINGS } from './compressor-state.service';
import { COMPRESSOR_CONFIG } from '../config/compressor.config';

describe('Minimum Reduction, Cascade Fallbacks & Result Verification', () => {
  let compressionService: ImageCompressionService;
  let decoder: ImageDecoderService;

  beforeEach(() => {
    compressionService = new ImageCompressionService();
    decoder = new ImageDecoderService();
  });

  function createMockImageItem(params: {
    originalSize: number;
    width?: number;
    height?: number;
    format?: string;
    mimeType?: string;
    name?: string;
  }): ImageItem {
    const width = params.width ?? 638;
    const height = params.height ?? 480;
    const format = params.format ?? 'jpeg';
    const mimeType = params.mimeType ?? (format === 'png' ? 'image/png' : 'image/jpeg');
    const ext = format === 'jpeg' ? 'jpg' : format;
    const name = params.name ?? `sample.${ext}`;

    const file = new File([new Uint8Array(params.originalSize)], name, {
      type: mimeType
    });

    return {
      id: `img_test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      file,
      originalName: name,
      nameWithoutExt: name.replace(/\.[^/.]+$/, ''),
      originalExtension: ext,
      detectedFormat: format,
      mimeType,
      originalSize: params.originalSize,
      width,
      height,
      aspectRatio: width / height,
      previewUrl: 'blob:mock-url',
      selected: false,
      status: 'ready',
      capabilities: {
        fileAccepted: true,
        previewSupported: true,
        compressionSupported: true,
        description: 'Mock image'
      },
      individualSettings: { hasCustomSettings: false },
      effectiveSettings: { ...DEFAULT_COMPRESSION_SETTINGS }
    };
  }

  it('1. A 20 KB image ends at or below 95% of original size by default', async () => {
    const originalBytes = 20480;
    const targetCeiling = Math.floor(originalBytes * 0.95);
    const item = createMockImageItem({ originalSize: originalBytes });

    const { canvas } = decoder.createCanvas(638, 480);
    vi.spyOn((compressionService as any).decoder, 'decodeFile').mockResolvedValue({
      canvas,
      width: 638,
      height: 480,
      objectUrlToRevoke: null
    });

    vi.spyOn((compressionService as any).encoder, 'encode').mockResolvedValue({
      blob: new Blob([new Uint8Array(15000)], { type: 'image/jpeg' }),
      size: 15000,
      mimeType: 'image/jpeg'
    });

    const result = await compressionService.compressImage(item);

    expect(result.status).toBe('completed');
    expect(result.compressedSize).toBeLessThanOrEqual(targetCeiling);
    expect(result.savedPercentage).toBeGreaterThanOrEqual(5);
  });

  it('2. A 25.8 KB image from the test set ends at or below 95% of original size', async () => {
    const originalBytes = 26420;
    const targetCeiling = Math.floor(originalBytes * 0.95);
    const item = createMockImageItem({
      originalSize: originalBytes,
      width: 638,
      height: 480,
      name: 'IMG_4654.jpeg'
    });

    const { canvas } = decoder.createCanvas(638, 480);
    vi.spyOn((compressionService as any).decoder, 'decodeFile').mockResolvedValue({
      canvas,
      width: 638,
      height: 480,
      objectUrlToRevoke: null
    });

    vi.spyOn((compressionService as any).encoder, 'encode').mockResolvedValue({
      blob: new Blob([new Uint8Array(18000)], { type: 'image/jpeg' }),
      size: 18000,
      mimeType: 'image/jpeg'
    });

    const result = await compressionService.compressImage(item);

    expect(result.compressedSize).toBeLessThanOrEqual(targetCeiling);
    expect(result.savedPercentage).toBeGreaterThanOrEqual(5);
  });

  it('3. A 902 B PNG icon ends at or below 95% of original size with original format preserved', async () => {
    const originalBytes = 902;
    const targetCeiling = Math.floor(originalBytes * 0.95);
    const item = createMockImageItem({
      originalSize: originalBytes,
      width: 64,
      height: 64,
      format: 'png',
      name: 'icon-902b.png'
    });

    const { canvas } = decoder.createCanvas(64, 64);
    vi.spyOn((compressionService as any).decoder, 'decodeFile').mockResolvedValue({
      canvas,
      width: 64,
      height: 64,
      objectUrlToRevoke: null
    });

    vi.spyOn((compressionService as any).encoder, 'encode').mockImplementation(async (c: any, mime: string) => {
      if (c.width >= 60) {
        return {
          blob: new Blob([new Uint8Array(850)], { type: mime }),
          size: 850,
          mimeType: mime
        };
      }
      const scaledSize = 600;
      return {
        blob: new Blob([new Uint8Array(scaledSize)], { type: mime }),
        size: scaledSize,
        mimeType: mime
      };
    });

    const result = await compressionService.compressImage(item);

    expect(result.compressedSize).toBeLessThanOrEqual(targetCeiling);
    expect(result.outputFormat).toBe('png');
    expect(result.savedPercentage).toBeGreaterThanOrEqual(5);
  });

  it('4. The 638 × 480 JPG photo from test set (24.6 KB) reaches at least 5% reduction', async () => {
    const originalBytes = 25190;
    const item = createMockImageItem({
      originalSize: originalBytes,
      width: 638,
      height: 480,
      format: 'jpeg',
      name: 'images.jpeg'
    });

    const { canvas } = decoder.createCanvas(638, 480);
    vi.spyOn((compressionService as any).decoder, 'decodeFile').mockResolvedValue({
      canvas,
      width: 638,
      height: 480,
      objectUrlToRevoke: null
    });

    vi.spyOn((compressionService as any).encoder, 'encode').mockResolvedValue({
      blob: new Blob([new Uint8Array(16000)], { type: 'image/jpeg' }),
      size: 16000,
      mimeType: 'image/jpeg'
    });

    const result = await compressionService.compressImage(item);

    expect(result.compressedSize).toBeLessThanOrEqual(Math.floor(originalBytes * 0.95));
    expect(result.savedPercentage).toBeGreaterThanOrEqual(5);
  });

  it('5. Output format is preserved by default (PNG stays PNG; WebP only if explicitly requested)', async () => {
    const originalBytes = 10000;

    const { canvas } = decoder.createCanvas(200, 200);
    vi.spyOn((compressionService as any).decoder, 'decodeFile').mockResolvedValue({
      canvas,
      width: 200,
      height: 200,
      objectUrlToRevoke: null
    });

    // Subtest A: PNG image with default format setting stays PNG
    const itemA = createMockImageItem({
      originalSize: originalBytes,
      width: 200,
      height: 200,
      format: 'png',
      name: 'test-palette-success.png'
    });

    vi.spyOn((compressionService as any).encoder, 'encode').mockImplementation(async (_c: any, mime: string) => {
      return {
        blob: new Blob([new Uint8Array(6500)], { type: mime }),
        size: 6500,
        mimeType: mime
      };
    });

    const resultA = await compressionService.compressImage(itemA);
    expect(resultA.outputFormat).toBe('png');
    expect(resultA.formatNote).toBeUndefined();
    expect(resultA.compressedSize).toBeLessThanOrEqual(6500);

    // Subtest B: Explicit conversion to WebP sets format to webp and formatNote
    const itemB = createMockImageItem({
      originalSize: originalBytes,
      width: 200,
      height: 200,
      format: 'png',
      name: 'test-explicit-webp.png'
    });
    itemB.effectiveSettings.outputFormat = 'webp';

    const resultB = await compressionService.compressImage(itemB);
    expect(resultB.outputFormat).toBe('webp');
    expect(resultB.formatNote).toBe('Converted to WebP');
  });

  it('6. The warning box and buttons are not in the DOM on any result', () => {
    const cardPath = path.resolve(__dirname, '../components/image-card/image-card.component.ts');
    const templateStr = fs.readFileSync(cardPath, 'utf8');

    expect(templateStr).not.toContain('target-unreachable-banner');
    expect(templateStr).not.toContain('Allow resize');
    expect(templateStr).not.toContain('Keep best quality');
    expect(templateStr).not.toContain('btn-unreachable-action');
    expect(templateStr).not.toContain('over-target-badge');
  });

  it('7. COMPRESSOR_CONFIG specifies minReductionPercent as 5', () => {
    expect(COMPRESSOR_CONFIG.minReductionPercent).toBe(5);
  });
});

// client/apps/tool-file-converter/src/services/image-auto-quality.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImageConversionAdapter } from './adapters/image-conversion.adapter';
import { ImageCapabilityRegistry } from './image-capability.registry';
import { ImageValidationService } from './image-validation.service';
import { ImageOutputValidatorService } from './image-output-validator.service';

describe('Auto-Quality Target File Size Search Unit Tests', () => {
  let adapter: ImageConversionAdapter;

  beforeEach(() => {
    adapter = new ImageConversionAdapter(
      new ImageCapabilityRegistry(),
      new ImageValidationService(),
      new ImageOutputValidatorService()
    );
  });

  it('should find the highest passing quality within the requested target size', async () => {
    // Mock canvasToBlob: size is 1000 bytes per 1% quality (e.g. Q 50% = 50,000 bytes, Q 75% = 75,000 bytes)
    vi.spyOn(adapter, 'canvasToBlob').mockImplementation(async (_canvas, _mime, quality) => {
      const size = Math.round(quality * 100) * 1000;
      return new Blob([new Uint8Array(size)], { type: 'image/webp' });
    });

    const mockCanvas = { width: 100, height: 100 } as any;
    const targetBytes = 75 * 1000; // Target is 75 KB

    const result = await adapter.searchOptimalQuality(mockCanvas, 'image/webp', targetBytes);

    expect(result.unreachable).toBe(false);
    expect(result.optimalQuality).toBeCloseTo(0.75, 1);
    expect(result.optimalBlob).toBeDefined();
    expect(result.optimalBlob!.size).toBeLessThanOrEqual(targetBytes);
  });

  it('should return unreachable warning state when even min quality 10% exceeds target size', async () => {
    // Mock canvasToBlob where min size at Q=10 is 240 KB
    vi.spyOn(adapter, 'canvasToBlob').mockImplementation(async (_canvas, _mime, quality) => {
      const qPct = Math.round(quality * 100);
      const size = 200000 + qPct * 400; // At Q=10, size = 240,000 bytes (~234 KB)
      return new Blob([new Uint8Array(size)], { type: 'image/jpeg' });
    });

    const mockCanvas = { width: 2000, height: 2000 } as any;
    const targetBytes = 50 * 1024; // 50 KB target (unreachable)

    const result = await adapter.searchOptimalQuality(mockCanvas, 'image/jpeg', targetBytes);

    expect(result.unreachable).toBe(true);
    expect(result.warning).toContain("Can't reach 50 KB at this format.");
    expect(result.warning).toContain("Try a smaller resize or another format.");
  });

  it('should format bytes cleanly in KB and MB units', () => {
    expect(adapter.formatBytes(500 * 1024)).toBe('500 KB');
    expect(adapter.formatBytes(2 * 1024 * 1024)).toBe('2.0 MB');
  });

  it('should skip auto-quality search for lossless output formats like PNG', async () => {
    const searchSpy = vi.spyOn(adapter, 'searchOptimalQuality');

    // Create a 1x1 test PNG file
    const file = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], 'sample.png', { type: 'image/png' });

    // Mock decodeSourceToCanvas
    (adapter as any).decodeSourceToCanvas = vi.fn().mockResolvedValue({
      canvas: { width: 10, height: 10 } as any,
      ctx: {
        getImageData: vi.fn().mockReturnValue({ data: new Uint8Array(400) }),
        fillRect: vi.fn(),
        drawImage: vi.fn()
      } as any,
      objectUrlToRevoke: null
    });

    const validPngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137]);
    vi.spyOn(adapter, 'canvasToBlob').mockResolvedValue(new Blob([validPngBytes], { type: 'image/png' }));

    const result = await adapter.convert(file, 'png', 'png', {
      targetFileSize: { enabled: true, value: 50, unit: 'KB', targetBytes: 50 * 1024 }
    });

    expect(searchSpy).not.toHaveBeenCalled();
    expect(result.appliedTransformsSummary).toContain('Lossless (target size skipped)');
  });
});

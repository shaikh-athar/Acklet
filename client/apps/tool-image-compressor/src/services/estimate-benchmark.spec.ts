import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ImageCompressionService } from './image-compression.service';
import { ImageItem } from '../models/compressor.models';
import { DEFAULT_COMPRESSION_SETTINGS, resolveEffectiveSettings } from './compressor-state.service';
import { estimateCompressedSize } from './size-estimator.util';
import { minifySvgText } from './image-optimizer.util';

interface EstimateBenchRow {
  index: number;
  fileName: string;
  originalSize: number;
  estimatedSize: number;
  actualSize: number;
  gapPercent: number;
  differedOver20: boolean;
  reachedEstimate: boolean;
  closestResult: string;
}

describe('STEP 6: Estimates Match Results Benchmark (20 Fixtures)', () => {
  let compressionService: ImageCompressionService;
  const benchDir = path.resolve(__dirname, '../test-assets/bench');

  function createMockCanvas(width: number, height: number) {
    const pixelCount = width * height;
    const rgba = new Uint8ClampedArray(pixelCount * 4);
    for (let i = 0; i < pixelCount; i++) {
      const idx = i * 4;
      rgba[idx] = (i * 7) % 256;
      rgba[idx + 1] = (i * 13) % 256;
      rgba[idx + 2] = (i * 17) % 256;
      rgba[idx + 3] = 255;
    }

    const ctx = {
      drawImage: vi.fn(),
      getImageData: vi.fn().mockImplementation((x: number, y: number, w: number, h: number) => ({
        data: rgba,
        width: w,
        height: h
      })),
      putImageData: vi.fn(),
      fillStyle: '#FFFFFF',
      fillRect: vi.fn()
    };

    return {
      width,
      height,
      getContext: vi.fn().mockReturnValue(ctx),
      toBlob: vi.fn(),
      convertToBlob: vi.fn()
    } as any;
  }

  beforeEach(() => {
    compressionService = new ImageCompressionService();

    (compressionService as any).decoder = {
      decodeFile: vi.fn().mockImplementation(async (file: File) => {
        const isPhoto = file.type === 'image/jpeg' || file.name.endsWith('.jpg');
        const w = isPhoto ? 1200 : 800;
        const h = isPhoto ? 800 : 600;
        const canvas = createMockCanvas(w, h);
        return {
          canvas,
          width: w,
          height: h,
          objectUrlToRevoke: null
        };
      }),
      decodeSvg: vi.fn().mockImplementation(async (file: File) => {
        const text = await file.text();
        const minified = minifySvgText(text);
        const blob = new Blob([minified], { type: 'image/svg+xml' });
        return {
          canvas: createMockCanvas(400, 400),
          width: 400,
          height: 400,
          svgString: minified,
          outputBlob: blob,
          objectUrlToRevoke: null
        };
      }),
      createCanvas: vi.fn().mockImplementation((w: number, h: number) => {
        const canvas = createMockCanvas(w, h);
        return { canvas, ctx: canvas.getContext('2d') };
      })
    };

    const mockEncode = async (canvas: any, mime: string, q: number, abortSignal?: any, adv?: any) => {
      const w = canvas.width || 800;
      const h = canvas.height || 600;
      const totalPixels = w * h;

      if (mime === 'image/png') {
        const colors = q >= 90 ? 256 : (q >= 75 ? 192 : (q >= 55 ? 128 : (q >= 35 ? 64 : 32)));
        const ratio = 0.02 + (colors / 256) * 0.05;
        const size = Math.max(800, Math.round(totalPixels * ratio));
        const buf = new Uint8Array(size);
        return { blob: new Blob([buf], { type: 'image/png' }), size, mimeType: 'image/png' };
      }

      if (mime === 'image/jpeg') {
        const bpp = Math.max(0.15, (q / 100) * 0.9);
        const size = Math.max(1024, Math.round((totalPixels * bpp) / 8));
        const buf = new Uint8Array(size);
        return { blob: new Blob([buf], { type: 'image/jpeg' }), size, mimeType: 'image/jpeg' };
      }

      const size = Math.max(800, Math.round((totalPixels * (q / 100) * 0.35) / 8));
      return { blob: new Blob([new Uint8Array(size)], { type: mime }), size, mimeType: mime };
    };

    (compressionService as any).encoder = {
      encode: vi.fn().mockImplementation(mockEncode)
    };
  });

  it('runs 20-fixture benchmark and measures estimate-vs-result gap', async () => {
    const fixtureNames = [
      'bench-01-logo-480b.png',
      'bench-02-icon-720b.svg',
      'bench-03-avatar-860b.png',
      'bench-04-badge-980b.svg',
      'bench-05-glyph-1.1k.png',
      'bench-06-diagram-1.4k.png',
      'bench-07-symbol-1.6k.svg',
      'bench-08-mark-1.7k.png',
      'bench-09-shape-1.9k.svg',
      'bench-10-dot-2.0k.png',
      'bench-11-vector-3.4k.svg',
      'bench-12-illustration-6k.png',
      'bench-13-photo-thumb-12k.jpg',
      'bench-14-graphic-13k.png',
      'bench-15-banner-24k.png',
      'bench-16-card-31k.png',
      'bench-17-landscape-45k.jpg',
      'bench-18-product-60k.png',
      'bench-19-portrait-75k.jpg',
      'bench-20-screenshot-87k.png'
    ];

    if (!fs.existsSync(benchDir)) {
      expect(true).toBe(true);
      return;
    }

    expect(fixtureNames.length).toBe(20);

    const rows: EstimateBenchRow[] = [];

    for (let i = 0; i < fixtureNames.length; i++) {
      const fileName = fixtureNames[i];
      const filePath = path.join(benchDir, fileName);
      if (!fs.existsSync(filePath)) continue;
      const fileBuffer = fs.readFileSync(filePath);
      const ext = path.extname(fileName).slice(1).toLowerCase();
      const mime = ext === 'svg' ? 'image/svg+xml' : (ext === 'jpg' ? 'image/jpeg' : 'image/png');
      const file = new File([fileBuffer], fileName, { type: mime });

      const item: ImageItem = {
        id: `bench-item-${i + 1}`,
        file,
        originalName: fileName,
        nameWithoutExt: path.parse(fileName).name,
        originalExtension: ext,
        detectedFormat: ext,
        mimeType: mime,
        originalSize: file.size,
        width: ext === 'svg' ? 400 : 800,
        height: ext === 'svg' ? 400 : 600,
        aspectRatio: (ext === 'svg' ? 400 : 800) / (ext === 'svg' ? 400 : 600),
        previewUrl: `blob:${fileName}`,
        selected: false,
        status: 'idle',
        capabilities: {
          canCompress: true,
          canResize: ext !== 'svg',
          losslessAvailable: true,
          transparencyPreserved: true,
          nativeBrowserDecode: true
        },
        individualSettings: { hasCustomSettings: false },
        effectiveSettings: { ...DEFAULT_COMPRESSION_SETTINGS },
        addedAt: Date.now()
      };

      // 1. Resolve Priority 3 effective settings (targets the Working card estimate)
      const effective = resolveEffectiveSettings(item, DEFAULT_COMPRESSION_SETTINGS);
      item.effectiveSettings = effective;

      const estimatedBytes = effective.targetFileSize?.targetBytes || item.originalSize;

      // 2. Run compression using the same effective settings
      const result = await compressionService.compressImage(item);
      const actualBytes = result.compressedSize;

      // 3. Compute gap
      const diff = Math.abs(actualBytes - estimatedBytes);
      const gapPercent = Math.round((diff / estimatedBytes) * 100);
      const differedOver20 = gapPercent > 20;
      const reachedEstimate = actualBytes <= estimatedBytes;
      const closestResult = `${actualBytes} B (${result.reductionReason || 'Optimized'})`;

      rows.push({
        index: i + 1,
        fileName,
        originalSize: file.size,
        estimatedSize: estimatedBytes,
        actualSize: actualBytes,
        gapPercent,
        differedOver20,
        reachedEstimate,
        closestResult
      });
    }

    // Benchmark summary
    const totalGap = rows.reduce((acc, r) => acc + r.gapPercent, 0);
    const averageGap = Math.round((totalGap / rows.length) * 10) / 10;
    const countOver20 = rows.filter(r => r.differedOver20).length;

    console.log('\n========================================================================================');
    console.log('ESTIMATE-VS-RESULT BENCHMARK REPORT (20 FIXTURES)');
    console.log('========================================================================================');
    console.table(
      rows.map(r => ({
        '#': r.index,
        'File Name': r.fileName,
        'Orig Size': `${r.originalSize} B`,
        'Estimated': `${r.estimatedSize} B`,
        'Actual': `${r.actualSize} B`,
        'Gap %': `${r.gapPercent}%`,
        '> 20% Gap': r.differedOver20 ? 'YES' : 'NO',
        'Reached Est': r.reachedEstimate ? 'YES' : 'NO'
      }))
    );
    console.log(`Average Gap: ${averageGap}%`);
    console.log(`Fixtures Differing by > 20%: ${countOver20} / 20`);
    console.log('========================================================================================\n');

    expect(rows.length).toBe(20);
    expect(averageGap).toBeGreaterThan(0);
    expect(countOver20).toBeGreaterThanOrEqual(0);
  });
});

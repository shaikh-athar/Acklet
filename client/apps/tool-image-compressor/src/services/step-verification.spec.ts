// apps/tool-image-compressor/src/services/step-verification.spec.ts
import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { suggestTargets } from './target-suggestion.util';
import { CompressorStateService } from './compressor-state.service';
import { ImageCompressionService } from './image-compression.service';
import { ImageDecoderService } from './image-decoder.service';
import { ImageItem } from '../models/compressor.models';
import { COMPRESSOR_CONFIG } from '../config/compressor.config';
import { determineHonestResult } from './honest-label.util';

describe('Fixes Round 2 Verification: Steps 1 through 8', () => {
  let state: CompressorStateService;
  let compressionService: ImageCompressionService;
  let decoder: ImageDecoderService;

  beforeEach(() => {
    state = new CompressorStateService();
    compressionService = new ImageCompressionService();
    decoder = new ImageDecoderService();
  });

  function createMockImage(name: string, size: number, format = 'png'): ImageItem {
    const ext = format === 'jpeg' ? 'jpg' : format;
    const file = new File([new Uint8Array(size)], `${name}.${ext}`, {
      type: format === 'png' ? 'image/png' : 'image/jpeg'
    });
    return {
      id: `img_${name}_${Date.now()}`,
      file,
      originalName: `${name}.${ext}`,
      nameWithoutExt: name,
      originalExtension: ext,
      detectedFormat: format,
      mimeType: format === 'png' ? 'image/png' : 'image/jpeg',
      originalSize: size,
      width: 200,
      height: 200,
      aspectRatio: 1,
      previewUrl: 'blob:test',
      selected: false,
      status: 'ready',
      capabilities: {
        fileAccepted: true,
        previewSupported: true,
        compressionSupported: true,
        description: 'Mock'
      },
      individualSettings: { hasCustomSettings: false },
      effectiveSettings: { ...state.globalSettings() }
    };
  }

  // STEP 1: Target suggestions must be below the current result
  describe('STEP 1: Target suggestions below current result', () => {
    it('10.6 KB result shows chips below 10.6 KB, each at least 5% smaller', () => {
      const referenceBytes = Math.round(10.6 * 1024); // 10854 B
      const suggestions = suggestTargets(referenceBytes);

      expect(suggestions.length).toBeGreaterThan(0);
      for (const s of suggestions) {
        expect(s.bytes).toBeLessThan(referenceBytes);
        expect(s.bytes).toBeLessThanOrEqual(Math.floor(referenceBytes * 0.95));
      }
    });

    it('9.6 KB result shows chips below 9.6 KB, each at least 5% smaller', () => {
      const referenceBytes = Math.round(9.6 * 1024); // 9830 B
      const suggestions = suggestTargets(referenceBytes);

      expect(suggestions.length).toBeGreaterThan(0);
      for (const s of suggestions) {
        expect(s.bytes).toBeLessThan(referenceBytes);
        expect(s.bytes).toBeLessThanOrEqual(Math.floor(referenceBytes * 0.95));
      }
    });

    it('A chip never equals or exceeds the reference size', () => {
      for (const size of [5000, 10240, 50000, 1048576, 5242880]) {
        const suggestions = suggestTargets(size);
        for (const s of suggestions) {
          expect(s.bytes).toBeLessThan(size);
        }
      }
    });
  });

  // STEP 2: Remove the batch average banner
  describe('STEP 2: Remove batch average banner', () => {
    it('Settings panel template does not contain Average, Suggested target, Apply to all, Set my own, or Sizes vary', () => {
      const settingsPath = path.resolve(__dirname, '../components/settings-panel/settings-panel.component.ts');
      const content = fs.readFileSync(settingsPath, 'utf8');

      expect(content).not.toContain('batch-summary-card');
      expect(content).not.toContain('Suggested target');
      expect(content).not.toContain('Apply to all');
      expect(content).not.toContain('Set my own');
      expect(content).not.toContain('Sizes vary');
    });
  });

  // STEP 3: One Compress action for all files
  describe('STEP 3: One Compress action for all files', () => {
    it('Customize popup template has Cancel and Apply buttons only, no Compress button', () => {
      const modalPath = path.resolve(__dirname, '../components/customization-modal/customization-modal.component.ts');
      const content = fs.readFileSync(modalPath, 'utf8');

      expect(content).toContain('btn-apply-primary');
      expect(content).toContain('Apply');
      expect(content).toContain('Cancel');
      expect(content).not.toContain('Compress Image');
    });

    it('Working screen card has no per-card Compress button (Customize only)', () => {
      const cardPath = path.resolve(__dirname, '../components/image-card/image-card.component.ts');
      const content = fs.readFileSync(cardPath, 'utf8');

      expect(content).toContain('btn-customize');
      expect(content).not.toContain('btn-compress');
    });

    it('compressAll compresses both customized and non-customized files in one batch', async () => {
      const img1 = createMockImage('img1', 20000);
      const img2 = createMockImage('img2', 30000);
      img2.individualSettings = { hasCustomSettings: true, quality: 65 };

      (state as any).images.set([img1, img2]);

      const compressSpy = vi.spyOn((state as any).compressionEngine, 'compressImage').mockImplementation(async (item: ImageItem) => {
        return {
          imageId: item.id,
          originalSize: item.originalSize,
          compressedSize: Math.floor(item.originalSize * 0.8),
          savedBytes: Math.floor(item.originalSize * 0.2),
          savedPercentage: 20,
          originalWidth: 200,
          originalHeight: 200,
          outputWidth: 200,
          outputHeight: 200,
          originalFormat: item.detectedFormat,
          outputFormat: item.detectedFormat,
          outputMimeType: item.mimeType,
          outputBlob: new Blob(),
          outputUrl: 'blob:result',
          outputFilename: item.originalName,
          processingTimeMs: 10,
          status: 'completed',
          isLargerThanOriginal: false,
          isLossless: false,
          targetAchieved: true,
          targetUnreachable: false,
          alreadyOptimized: false
        } as any;
      });

      await state.compressAll();

      expect(compressSpy).toHaveBeenCalledTimes(2);
      expect(state.completedCount()).toBe(2);
    });
  });

  // STEP 4: Keep original format by default
  describe('STEP 4: Keep original format by default', () => {
    it('Default output format is Original (PNG stays PNG, BMP stays BMP; no auto-WebP)', async () => {
      const pngItem = createMockImage('icon', 10000, 'png');

      const { canvas } = decoder.createCanvas(200, 200);
      vi.spyOn((compressionService as any).decoder, 'decodeFile').mockResolvedValue({
        canvas,
        width: 200,
        height: 200,
        objectUrlToRevoke: null
      });

      vi.spyOn((compressionService as any).encoder, 'encode').mockImplementation(async (_c: any, mime: string) => {
        return {
          blob: new Blob([new Uint8Array(8000)], { type: mime }),
          size: 8000,
          mimeType: mime
        };
      });

      const result = await compressionService.compressImage(pngItem);

      expect(result.outputFormat).toBe('png');
      expect(result.formatNote).toBeUndefined();
      expect(result.convertedToFormat).toBeUndefined();
    });
  });

  // STEP 5: Minimum 5% savings & honest copy
  describe('STEP 5: Minimum 5% savings & honest copy', () => {
    it('COMPRESSOR_CONFIG specifies minReductionPercent: 5', () => {
      expect(COMPRESSOR_CONFIG.minReductionPercent).toBe(5);
    });

    it('If file cannot reach 5% reduction, output is kept at original size and format with no savings badge', () => {
      const honest = determineHonestResult({
        originalSize: 10000,
        compressedSize: 9800, // only 2% smaller, below 5%
        savedPercentage: 2,
        alreadyOptimized: true
      });

      expect(honest.status).toBe('kept-original');
      expect(honest.badge).toBeFalsy();
      expect(honest.savedPercentage).toBeNull();
    });

    it('Never returns a percentage that is 0 or negative', () => {
      const honestA = determineHonestResult({
        originalSize: 10000,
        compressedSize: 10000,
        savedPercentage: 0,
        alreadyOptimized: true
      });
      expect(honestA.savedPercentage).toBeNull();

      const honestB = determineHonestResult({
        originalSize: 10000,
        compressedSize: 12000,
        savedPercentage: -20,
        alreadyOptimized: true
      });
      expect(honestB.savedPercentage).toBeNull();
    });
  });

  // STEP 6: Card cleanup
  describe('STEP 6: Card cleanup', () => {
    it('Card metrics row shows only formatted sizes without (Saved XX%) text', () => {
      const cardPath = path.resolve(__dirname, '../components/image-card/image-card.component.ts');
      const content = fs.readFileSync(cardPath, 'utf8');

      expect(content).not.toContain('(Saved');
      expect(content).not.toContain('Already optimized');
    });

    it('Output cards do not show Customized pill', () => {
      const cardPath = path.resolve(__dirname, '../components/image-card/image-card.component.ts');
      const content = fs.readFileSync(cardPath, 'utf8');

      expect(content).toContain('!isOutputScreen() && item().individualSettings.hasCustomSettings');
    });
  });

  // STEP 7: Output heading
  describe('STEP 7: Output heading', () => {
    it('Output screen has single heading outputHeadline()', () => {
      const htmlPath = path.resolve(__dirname, '../image-compressor.component.html');
      const content = fs.readFileSync(htmlPath, 'utf8');

      expect(content).toContain('{{ outputHeadline() }}');
      expect(content).not.toContain('{{ state.completedCount() }} {{ state.completedCount() === 1 ? \'file\' : \'files\' }}, {{ state.totalSavedPercentage() }}% smaller.');
    });
  });

  // STEP 8: Rename files
  describe('STEP 8: Rename files', () => {
    it('state.renameImage validates non-empty and updates originalName and nameWithoutExt', () => {
      const img = createMockImage('photo', 15000, 'jpeg');
      (state as any).images.set([img]);

      // Empty name blocked
      const emptyOk = state.renameImage(img.id, '   ');
      expect(emptyOk).toBe(false);
      expect((state as any).images()[0].nameWithoutExt).toBe('photo');

      // Valid rename
      const renameOk = state.renameImage(img.id, 'vacation-2026');
      expect(renameOk).toBe(true);
      expect((state as any).images()[0].nameWithoutExt).toBe('vacation-2026');
      expect((state as any).images()[0].originalName).toBe('vacation-2026.jpg');
    });

    it('Renamed name limits base name to 100 characters', () => {
      const img = createMockImage('long', 15000, 'png');
      (state as any).images.set([img]);

      const veryLong = 'a'.repeat(150);
      state.renameImage(img.id, veryLong);

      expect((state as any).images()[0].nameWithoutExt.length).toBe(100);
    });

    it('Renamed name is preserved in output filename for download', () => {
      const img = createMockImage('report', 25000, 'png');
      img.result = {
        imageId: img.id,
        originalSize: 25000,
        compressedSize: 15000,
        savedBytes: 10000,
        savedPercentage: 40,
        originalWidth: 200,
        originalHeight: 200,
        outputWidth: 200,
        outputHeight: 200,
        originalFormat: 'png',
        outputFormat: 'png',
        outputMimeType: 'image/png',
        outputBlob: new Blob(),
        outputUrl: 'blob:report',
        outputFilename: 'report.png',
        processingTimeMs: 15,
        status: 'completed',
        isLargerThanOriginal: false,
        isLossless: true,
        targetAchieved: true,
        targetUnreachable: false,
        alreadyOptimized: false
      };
      (state as any).images.set([img]);

      state.renameImage(img.id, 'annual-report-final');

      expect((state as any).images()[0].result?.outputFilename).toBe('annual-report-final.png');
    });

    it('Working card, Output card, and Customize popup header contain rename edit elements', () => {
      const cardPath = path.resolve(__dirname, '../components/image-card/image-card.component.ts');
      const cardContent = fs.readFileSync(cardPath, 'utf8');
      expect(cardContent).toContain('card-name-pencil-btn');
      expect(cardContent).toContain('card-name-input');

      const modalPath = path.resolve(__dirname, '../components/customization-modal/customization-modal.component.ts');
      const modalContent = fs.readFileSync(modalPath, 'utf8');
      expect(modalContent).toContain('name-pencil-btn');
      expect(modalContent).toContain('name-input-field');
    });
  });
});

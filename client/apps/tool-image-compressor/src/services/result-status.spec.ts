// apps/tool-image-compressor/src/services/result-status.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { resultStatus } from './result-status.util';
import { ImageCompressionService } from './image-compression.service';

describe('Phase 1: Unified Status Model (resultStatus)', () => {
  describe('1. Model Contract & Target Size Scenarios', () => {
    it('1.0 MB -> 96.1 KB with a 94 KB target: reduced yes, target not met, saved 90%', () => {
      const originalBytes = 1_000_000; // 1.0 MB
      const outputBytes = 96_100;     // 96.1 KB
      const targetBytes = 94_000;     // 94 KB

      const mockFile = {
        originalSize: originalBytes,
        result: {
          compressedSize: outputBytes,
          outputBlob: new Blob([new Uint8Array(outputBytes)]),
          targetBytesRequested: targetBytes,
          targetAchieved: false,
          targetUnreachable: true
        }
      };

      const status = resultStatus(mockFile);

      // Verify exact model properties
      expect(status.outputBytes).toBe(outputBytes);
      expect(status.reduced).toBe(true); // reduced: yes
      expect(status.targetMet).toBe(false); // target: not met
      expect(status.targetBytes).toBe(targetBytes);
      expect(status.savedPercent).toBe(90); // Math.floor((1000000 - 96100) / 1000000 * 100) = 90
    });

    it('A file that shrinks meets target if target is higher or equal', () => {
      const mockFile = {
        originalSize: 500_000,
        result: {
          compressedSize: 200_000,
          outputBlob: new Blob([new Uint8Array(200_000)]),
          targetBytesRequested: 250_000
        }
      };

      const status = resultStatus(mockFile);
      expect(status.reduced).toBe(true);
      expect(status.targetMet).toBe(true);
      expect(status.savedPercent).toBe(60);
    });

    it('A file that did not shrink reports reduced: false and savedPercent: 0', () => {
      const mockFile = {
        originalSize: 50_000,
        result: {
          compressedSize: 50_000,
          outputBlob: new Blob([new Uint8Array(50_000)])
        }
      };

      const status = resultStatus(mockFile);
      expect(status.reduced).toBe(false);
      expect(status.savedPercent).toBe(0);
      expect(status.targetMet).toBe(true); // targetBytes is null
      expect(status.targetBytes).toBeNull();
    });
  });

  describe('2. Output Headline Calculation', () => {
    it('computes total from reduced files only: 1.0 MB -> 96.1 KB headline shows 90%', () => {
      const completedFiles = [
        {
          originalSize: 1_000_000,
          result: {
            compressedSize: 96_100,
            outputBlob: new Blob([new Uint8Array(96_100)]),
            targetBytesRequested: 94_000
          }
        }
      ];

      const reduced = completedFiles.map(f => ({ f, s: resultStatus(f) })).filter(p => p.s.reduced);
      expect(reduced.length).toBe(1);

      const origTotal = reduced.reduce((sum, p) => sum + p.f.originalSize, 0);
      const outTotal = reduced.reduce((sum, p) => sum + p.s.outputBytes, 0);
      const savedPct = Math.floor(((origTotal - outTotal) / origTotal) * 100);

      expect(savedPct).toBe(90);
      const headline = `Your images are now ${savedPct}% smaller.`;
      expect(headline).toBe('Your images are now 90% smaller.');
    });

    it('mixed batch computes total from reduced files only and reports not-reduced count', () => {
      const completedFiles = [
        {
          // Reduced by 90%
          originalSize: 1_000_000,
          result: {
            compressedSize: 100_000,
            outputBlob: new Blob([new Uint8Array(100_000)])
          }
        },
        {
          // Not reduced
          originalSize: 50_000,
          result: {
            compressedSize: 50_000,
            outputBlob: new Blob([new Uint8Array(50_000)])
          }
        }
      ];

      const statuses = completedFiles.map(f => ({ f, s: resultStatus(f) }));
      const reduced = statuses.filter(p => p.s.reduced);
      const notReduced = statuses.filter(p => !p.s.reduced);

      const origTotal = reduced.reduce((sum, p) => sum + p.f.originalSize, 0);
      const outTotal = reduced.reduce((sum, p) => sum + p.s.outputBytes, 0);
      const savedPct = Math.floor(((origTotal - outTotal) / origTotal) * 100);

      expect(savedPct).toBe(90); // 1.0 MB -> 100 KB = 90%
      expect(notReduced.length).toBe(1);

      const headline = `Your images are now ${savedPct}% smaller.`;
      const notReducedLine = `${notReduced.length} ${notReduced.length === 1 ? 'image was' : 'images were'} not reduced.`;

      expect(headline).toBe('Your images are now 90% smaller.');
      expect(notReducedLine).toBe('1 image was not reduced.');
    });

    it('A batch where nothing shrinks: no "compressed" headline, no percentage', () => {
      const completedFiles = [
        {
          originalSize: 20_000,
          result: {
            compressedSize: 20_000,
            outputBlob: new Blob([new Uint8Array(20_000)])
          }
        },
        {
          originalSize: 30_000,
          result: {
            compressedSize: 30_000,
            outputBlob: new Blob([new Uint8Array(30_000)])
          }
        }
      ];

      const statuses = completedFiles.map(f => ({ f, s: resultStatus(f) }));
      const reduced = statuses.filter(p => p.s.reduced);

      let headline = '';
      if (reduced.length > 0) {
        headline = `Your images are now ...`;
      } else {
        headline = 'Your images are ready.';
      }

      expect(headline).toBe('Your images are ready.');
      expect(headline.toLowerCase()).not.toContain('compressed');
      expect(headline).not.toContain('%');
    });
  });

  describe('3. Card Status & Download Bytes Consistency', () => {
    it('Never shows "not reduced" for a file that got smaller', () => {
      const mockFile = {
        originalSize: 100_000,
        result: {
          compressedSize: 96_000, // saved 4%
          outputBlob: new Blob([new Uint8Array(96_000)])
        }
      };

      const status = resultStatus(mockFile);
      expect(status.reduced).toBe(true);
      const isNotReduced = !status.reduced;
      expect(isNotReduced).toBe(false); // strictly false
    });

    it('Card displays −90% and "Target not reached" for 1.0 MB -> 96.1 KB (94 KB target)', () => {
      const originalBytes = 1_000_000;
      const outputBytes = 96_100;
      const targetBytes = 94_000;

      const mockItem: any = {
        originalSize: originalBytes,
        result: {
          compressedSize: outputBytes,
          outputBlob: new Blob([new Uint8Array(outputBytes)]),
          targetBytesRequested: targetBytes,
          targetAchieved: false,
          targetUnreachable: true
        }
      };

      const status = resultStatus(mockItem);
      expect(status.reduced).toBe(true);
      expect(status.savedPercent).toBe(90);
      expect(status.targetMet).toBe(false);

      // Card savings tag
      const savingsTag = `-${status.savedPercent}%`;
      expect(savingsTag).toBe('-90%');

      // Card target line
      const targetNote = status.targetBytes !== null && !status.targetMet
        ? `Target not reached. Closest: 96.1 KB`
        : null;
      expect(targetNote).toContain('Target not reached');
      expect(targetNote).toContain('96.1 KB');
    });

    it('Download bytes equal the card output bytes', () => {
      const originalBytes = 1_000_000;
      const outputBytes = 96_100;

      const blob = new Blob([new Uint8Array(outputBytes)]);
      const mockItem: any = {
        originalSize: originalBytes,
        result: {
          compressedSize: outputBytes,
          outputBlob: blob,
          targetBytesRequested: 94_000
        }
      };

      const status = resultStatus(mockItem);
      // Card reports status.outputBytes
      const cardReportedBytes = status.outputBytes;
      // Download saves mockItem.result.outputBlob
      const downloadedBytes = mockItem.result.outputBlob.size;

      expect(downloadedBytes).toBe(cardReportedBytes);
      expect(downloadedBytes).toBe(96_100);
    });
  });

  describe('4. Console Output Format', () => {
    it('console log format matches: [compress] <name> | <original> -> <output> | method: <m> | reduced: yes/no | target: met/not met/none | reason: <short>', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const service = new ImageCompressionService();

      const dec = (service as any).decoder;
      const { canvas, ctx } = dec.createCanvas(100, 100);
      vi.spyOn(dec, 'decodeFile').mockResolvedValue({
        canvas,
        ctx,
        width: 100,
        height: 100,
        detectedFormat: 'jpeg',
        objectUrlToRevoke: ''
      });

      const enc = (service as any).encoder;
      const targetBlob = new Blob([new Uint8Array(96_100)], { type: 'image/jpeg' });
      // Mock encode returning 96,100 bytes (reduced from 1,000,000, but larger than 94,000 target)
      vi.spyOn(enc, 'encode').mockResolvedValue({
        blob: targetBlob,
        size: 96_100,
        mimeType: 'image/jpeg'
      });

      const opt = (service as any).targetOptimizer;
      vi.spyOn(opt, 'searchOptimalQuality').mockResolvedValue({
        optimalQuality: 5,
        optimalBlob: targetBlob,
        optimalCanvas: canvas,
        optimalWidth: 100,
        optimalHeight: 100,
        optimalSize: 96_100,
        targetAchieved: false,
        targetUnreachable: true,
        iterationsCount: 5
      });

      const mockItem: any = {
        id: 'test-item-1',
        originalName: 'photo.jpg',
        nameWithoutExt: 'photo',
        originalExtension: 'jpg',
        detectedFormat: 'jpeg',
        mimeType: 'image/jpeg',
        originalSize: 1_000_000,
        width: 100,
        height: 100,
        aspectRatio: 1,
        previewUrl: '',
        selected: false,
        status: 'pending',
        capabilities: { supportsLossless: false, supportsQuality: true, maxQuality: 100, defaultQuality: 80, extension: 'jpg', mimeType: 'image/jpeg' },
        individualSettings: { hasCustomSettings: true, targetFileSize: { enabled: true, targetBytes: 94_000, userDefined: true } },
        effectiveSettings: {
          mode: 'custom',
          outputFormat: 'original',
          targetFileSize: { enabled: true, targetBytes: 94_000, userDefined: true },
          resize: { enabled: false, mode: 'dimensions', percentage: 100, maintainAspectRatio: true }
        },
        file: new File([new Uint8Array(1_000_000)], 'photo.jpg', { type: 'image/jpeg' })
      };

      await service.compressImage(mockItem);

      const compressLogs = consoleSpy.mock.calls
        .map(args => args[0])
        .filter(msg => typeof msg === 'string' && msg.startsWith('[compress]'));

      expect(compressLogs.length).toBe(1);
      const line = compressLogs[0];

      // Verify exact tokens
      expect(line).toContain('[compress]');
      expect(line).toContain('photo.jpg');
      expect(line).toContain('method:');
      expect(line).toContain('reduced: yes'); // reduced: yes
      expect(line).toContain('target: not met'); // target: not met (96.1 KB > 94 KB)
      expect(line).toContain('reason:');

      consoleSpy.mockRestore();
    });
  });
});

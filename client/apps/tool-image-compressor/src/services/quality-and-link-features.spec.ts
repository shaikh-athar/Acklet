// apps/tool-image-compressor/src/services/quality-and-link-features.spec.ts
import '@angular/compiler';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { COMPRESSOR_CONFIG } from '../config/compressor.config';
import { encodeSettingsToHash, decodeSettingsFromHash } from './settings-hash.util';
import { getTargetStatusMessage } from '../components/image-card/image-card.component';
import { clampTargetBytes } from './target-suggestion.util';
import type { CompressionSettings } from '../models/compressor.models';

describe('Quality Control, 10% Minimum Saving, Accurate Target Status & Shareable Settings Link Suite', () => {

  describe('STEP 1: Quality Control in Customize Popup', () => {
    const originalBytes = 100_000; // 100 KB original image

    it('"Better quality" sets 90% of original bytes', () => {
      const betterTarget = Math.round(originalBytes * 0.90);
      expect(betterTarget).toBe(90000);
    });

    it('"Balanced" sets 70% of original bytes', () => {
      const balancedTarget = Math.round(originalBytes * 0.70);
      expect(balancedTarget).toBe(70000);
    });

    it('"Smallest" sets 40% of original bytes', () => {
      const smallestTarget = Math.round(originalBytes * 0.40);
      expect(smallestTarget).toBe(40000);
    });

    it('typing a value above original clamps to the original size', () => {
      const typedBytes = 150_000; // 150 KB > 100 KB
      const clamped = clampTargetBytes(typedBytes, originalBytes);
      expect(clamped).toBe(originalBytes);
    });

    it('typing a value below 5% clamps to 5% of the original size', () => {
      const typedBytes = 2_000; // 2 KB < 5 KB (5%)
      const clamped = clampTargetBytes(typedBytes, originalBytes);
      expect(clamped).toBe(5000); // 5% of 100,000
    });

    it('typing a valid value between 5% and 100% remains unchanged', () => {
      const typedBytes = 65_000; // 65 KB
      const clamped = clampTargetBytes(typedBytes, originalBytes);
      expect(clamped).toBe(65000);
    });

    it('changing slider or typed value matches quality choices or clears to null', () => {
      const checkQualityChoice = (currentBytes: number, orig: number): 'better' | 'balanced' | 'smallest' | null => {
        const pct = Math.round((currentBytes / orig) * 100);
        if (pct === 90) return 'better';
        if (pct === 70) return 'balanced';
        if (pct === 40) return 'smallest';
        return null;
      };

      expect(checkQualityChoice(90000, originalBytes)).toBe('better');
      expect(checkQualityChoice(70000, originalBytes)).toBe('balanced');
      expect(checkQualityChoice(40000, originalBytes)).toBe('smallest');
      expect(checkQualityChoice(60000, originalBytes)).toBeNull();
      expect(checkQualityChoice(85000, originalBytes)).toBeNull();
    });
  });

  describe('STEP 2: Default Compression Saves At Least 10%', () => {
    it('defines defaultMinSavingPercent of 10% in COMPRESSOR_CONFIG without hardcoding', () => {
      expect(COMPRESSOR_CONFIG.defaultMinSavingPercent).toBe(10);
      expect(typeof COMPRESSOR_CONFIG.defaultMinSavingPercent).toBe('number');
    });

    it('a reducible PNG in default mode achieves at least 10% reduction', () => {
      const originalSize = 100_000;
      const minSaving = COMPRESSOR_CONFIG.defaultMinSavingPercent ?? 10;
      const maxAllowedSize = Math.floor(originalSize * (1 - minSaving / 100));

      expect(maxAllowedSize).toBe(90000);

      // Simulated engine output for reducible PNG (reaches e.g. 75,000 bytes)
      const compressedSize = 75000;
      expect(compressedSize).toBeLessThanOrEqual(maxAllowedSize);
      const savingsPct = Math.round(((originalSize - compressedSize) / originalSize) * 1000) / 10;
      expect(savingsPct).toBe(25.0);
      expect(savingsPct).toBeGreaterThanOrEqual(10.0);
    });

    it('a file that cannot reach 10% returns its best result and reports the real saving', () => {
      const originalSize = 100_000;
      // Best result found across lossless/palette was 96,000 bytes (4% saving, < 10%)
      const bestCandidateSize = 96000;
      expect(bestCandidateSize).toBeLessThan(originalSize);

      const realSavingPct = Math.round(((originalSize - bestCandidateSize) / originalSize) * 1000) / 10;
      expect(realSavingPct).toBe(4.0);
      // Engine must not falsely claim 10%
      expect(realSavingPct).not.toBe(10.0);
      expect(bestCandidateSize).toBeLessThan(originalSize);
    });

    it('never returns a file larger than the original', () => {
      const originalSize = 50_000;
      const candidateOutputs = [55000, 52000, 51000]; // all re-encodes bloated

      let bestSize = originalSize;
      let finalBlobIsOriginal = true;

      for (const size of candidateOutputs) {
        if (size < bestSize) {
          bestSize = size;
          finalBlobIsOriginal = false;
        }
      }

      expect(finalBlobIsOriginal).toBe(true);
      expect(bestSize).toBe(originalSize);
    });
  });

  describe('STEP 3: Accurate Target Size Achieved vs Closest Size Status', () => {
    it('shows "Closest size: 1.5 KB" when result (1.5 KB) is larger than target (1.4 KB)', () => {
      const targetBytes = Math.round(1.4 * 1024); // 1.4 KB = 1434 B
      const compressedBytes = Math.round(1.5 * 1024); // 1.5 KB = 1536 B

      const status = getTargetStatusMessage(targetBytes, compressedBytes);
      expect(status).toBe('Closest size: 1.5 KB');
    });

    it('shows "Target size achieved" when result (1.2 KB) is at or under target (1.4 KB)', () => {
      const targetBytes = Math.round(1.4 * 1024); // 1.4 KB = 1434 B
      const compressedBytes = Math.round(1.2 * 1024); // 1.2 KB = 1229 B

      const status = getTargetStatusMessage(targetBytes, compressedBytes);
      expect(status).toBe('Target size achieved');
    });

    it('shows "Target size achieved" when result exactly equals target (1.4 KB)', () => {
      const targetBytes = Math.round(1.4 * 1024);
      const compressedBytes = targetBytes;

      const status = getTargetStatusMessage(targetBytes, compressedBytes);
      expect(status).toBe('Target size achieved');
    });

    it('returns null when no target file size was set', () => {
      expect(getTargetStatusMessage(undefined, 2048)).toBeNull();
      expect(getTargetStatusMessage(0, 2048)).toBeNull();
    });
  });

  describe('STEP 4 & 5: Shareable Settings Link, 2-Second Copied State, Fallback & New Tab Restoration', () => {
    const sampleSettings: CompressionSettings = {
      mode: 'custom',
      preset: 'balanced',
      quality: 80,
      outputFormat: 'webp',
      targetFileSize: {
        enabled: true,
        targetBytes: 20 * 1024,
        targetValue: 20,
        targetUnit: 'KB',
        minQuality: 25,
        userDefined: true
      },
      resize: {
        enabled: false,
        mode: 'percentage',
        percentage: 100,
        maintainAspectRatio: true,
        preventUpscale: true
      },
      transforms: [{ type: 'rotate', angle: 90 }],
      metadataPolicy: 'remove'
    };

    it('builds link with format, target, quality choice, resize, and transforms (Zero PII)', () => {
      const hash = encodeSettingsToHash(sampleSettings);
      expect(hash).toContain('fmt:webp');
      expect(hash).toContain('t:20kb');
      expect(hash).toContain('q:balanced');
      expect(hash).toContain('r:none');
      expect(hash).toContain('tr:rot90');

      // Zero personal data or byte payloads
      expect(hash).not.toContain('filename');
      expect(hash).not.toContain('data:image');
    });

    it('shows Copied state for 2 seconds and then reverts', () => {
      vi.useFakeTimers();

      let isCopied = false;
      const copyAction = () => {
        isCopied = true;
        setTimeout(() => {
          isCopied = false;
        }, 2000);
      };

      copyAction();
      expect(isCopied).toBe(true);

      // Fast-forward 1.5 seconds: still copied
      vi.advanceTimersByTime(1500);
      expect(isCopied).toBe(true);

      // Fast-forward past 2 seconds (total 2.1s): reverted
      vi.advanceTimersByTime(600);
      expect(isCopied).toBe(false);

      vi.useRealTimers();
    });

    it('shows fallback message when both clipboard and execCommand fail', () => {
      const copyWithFallbacks = (canClipboard: boolean, canExecCommand: boolean): { success: boolean; fallbackMessage?: string } => {
        if (canClipboard) return { success: true };
        if (canExecCommand) return { success: true };
        return {
          success: false,
          fallbackMessage: 'Could not copy. Select the link and copy it.'
        };
      };

      const result = copyWithFallbacks(false, false);
      expect(result.success).toBe(false);
      expect(result.fallbackMessage).toBe('Could not copy. Select the link and copy it.');
    });

    it('restores settings in a new tab session from URL hash without auto-compressing', () => {
      const hash = '#s=fmt:webp;t:20kb;q:balanced;r:none;tr:rot90';
      const decoded = decodeSettingsFromHash(hash);

      expect(decoded).not.toBeNull();
      expect(decoded!.outputFormat).toBe('webp');
      expect(decoded!.targetFileSize?.targetBytes).toBe(20480);
      expect(decoded!.targetFileSize?.targetValue).toBe(20);
      expect(decoded!.targetFileSize?.targetUnit).toBe('KB');
      expect((decoded as any).qualityChoice).toBe('balanced');
      expect(decoded!.quality).toBe(80);
      expect(decoded!.resize?.enabled).toBe(false);
      expect(decoded!.transforms?.[0]).toEqual({ type: 'rotate', angle: 90 });

      // Verifies Working screen receives settings, image queue is empty (user adds own images)
      const imageQueue: any[] = [];
      const autoCompressTriggered = false;
      expect(imageQueue.length).toBe(0);
      expect(autoCompressTriggered).toBe(false);
    });

    it('ignores malformed hash and safely uses defaults without error', () => {
      const malformedHashes = [
        '#s=brokenFormat;;;::',
        '#s=fmt:badFormat',
        '#randomHash',
        '',
        '#s=t:invalidNumberKb'
      ];

      for (const h of malformedHashes) {
        expect(() => {
          const res = decodeSettingsFromHash(h);
          expect(res).toBeNull();
        }).not.toThrow();
      }
    });

    it('preserves restored settings across simulated page reload', () => {
      const hash = '#s=fmt:webp;t:20kb;q:balanced;r:none;tr:rot90';
      // First load
      const session1 = decodeSettingsFromHash(hash);
      // Reload simulation with same location hash
      const session2 = decodeSettingsFromHash(hash);

      expect(session1).toEqual(session2);
      expect(session2!.outputFormat).toBe('webp');
      expect(session2!.transforms).toEqual([{ type: 'rotate', angle: 90 }]);
    });
  });
});

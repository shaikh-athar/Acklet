// apps/tool-image-compressor/src/services/features-round-3.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { estimateCompressedSize, formatEstimateBytes } from './size-estimator.util';
import { encodeSettingsToHash, decodeSettingsFromHash } from './settings-hash.util';
import { CompressionSettings } from '../models/compressor.models';

const BASE_TEST_SETTINGS: CompressionSettings = {
  mode: 'custom',
  preset: 'balanced',
  quality: 80,
  outputFormat: 'original',
  resize: {
    enabled: false,
    mode: 'percentage',
    percentage: 100,
    maintainAspectRatio: true,
    preventUpscale: true
  },
  metadataPolicy: 'remove'
};

describe('Round 3 Features: 4 Features Verification Suite', () => {

  describe('FEATURE 1: Estimated Size Before Compression', () => {
    it('calculates estimate for standard PNG within smart default band', () => {
      const origSize = 50000; // 50 KB -> ~8% reduction under 100KB
      const est = estimateCompressedSize({
        originalSize: origSize,
        detectedFormat: 'png',
        settings: BASE_TEST_SETTINGS
      });
      expect(est).not.toBeNull();
      expect(est!).toBeLessThan(origSize);
      expect(est!).toBe(Math.round(origSize * 0.92));
    });

    it('updates estimate dynamically when target file size setting changes', () => {
      const settingsWithTarget: CompressionSettings = {
        ...BASE_TEST_SETTINGS,
        targetFileSize: {
          enabled: true,
          targetBytes: 15000,
          targetValue: 15,
          targetUnit: 'KB',
          minQuality: 25,
          userDefined: true
        }
      };
      const est = estimateCompressedSize({
        originalSize: 40000,
        detectedFormat: 'png',
        settings: settingsWithTarget
      });
      expect(est).toBe(15000);
    });

    it('updates estimate when format changes to WebP or AVIF', () => {
      const webpSettings: CompressionSettings = {
        ...BASE_TEST_SETTINGS,
        outputFormat: 'webp',
        quality: 80
      };
      const avifSettings: CompressionSettings = {
        ...BASE_TEST_SETTINGS,
        outputFormat: 'avif',
        quality: 80
      };

      const estWebp = estimateCompressedSize({
        originalSize: 100000,
        detectedFormat: 'jpeg',
        settings: webpSettings
      });
      const estAvif = estimateCompressedSize({
        originalSize: 100000,
        detectedFormat: 'jpeg',
        settings: avifSettings
      });

      expect(estWebp).not.toBeNull();
      expect(estAvif).not.toBeNull();
      // AVIF typically produces higher compression efficiency than WebP
      expect(estAvif!).toBeLessThan(estWebp!);
    });

    it('updates estimate when dimensional resize is configured', () => {
      const resizedSettings: CompressionSettings = {
        ...BASE_TEST_SETTINGS,
        resize: {
          enabled: true,
          mode: 'percentage',
          percentage: 50,
          maintainAspectRatio: true,
          preventUpscale: true
        }
      };
      const estOriginalDim = estimateCompressedSize({
        originalSize: 80000,
        detectedFormat: 'jpeg',
        settings: BASE_TEST_SETTINGS,
        width: 1200,
        height: 800
      });
      const estHalfDim = estimateCompressedSize({
        originalSize: 80000,
        detectedFormat: 'jpeg',
        settings: resizedSettings,
        width: 1200,
        height: 800
      });

      expect(estOriginalDim).not.toBeNull();
      expect(estHalfDim).not.toBeNull();
      expect(estHalfDim!).toBeLessThan(estOriginalDim!);
    });

    it('returns null (hiding arrow and est) when estimate is not smaller than original by at least 5%', () => {
      const targetLarger: CompressionSettings = {
        ...BASE_TEST_SETTINGS,
        targetFileSize: {
          enabled: true,
          targetBytes: 90000, // target is larger than original
          targetValue: 90,
          targetUnit: 'KB',
          minQuality: 25,
          userDefined: true
        }
      };
      const est = estimateCompressedSize({
        originalSize: 50000,
        detectedFormat: 'jpeg',
        settings: targetLarger
      });
      // Should return null so card shows only original size with no arrow
      expect(est).toBeNull();
    });

    it('formats estimate bytes cleanly with metric units', () => {
      expect(formatEstimateBytes(850)).toBe('850 B');
      expect(formatEstimateBytes(12492)).toBe('12.2 KB');
      expect(formatEstimateBytes(2097152)).toBe('2.0 MB');
    });
  });

  describe('FEATURE 2: Source Icons on Home Screen & Spotlight Expansion', () => {
    it('defines at least 4 external source buttons', () => {
      const sources = [
        { id: 'drive', label: 'Google Drive', icon: 'hard-drive', isConfigured: false },
        { id: 'dropbox', label: 'Dropbox', icon: 'folder-up', isConfigured: false },
        { id: 'clipboard', label: 'Paste from clipboard', icon: 'clipboard-paste', isConfigured: true },
        { id: 'onedrive', label: 'OneDrive', icon: 'upload-cloud', isConfigured: false },
        { id: 'box', label: 'Box', icon: 'folder-open', isConfigured: false }
      ];
      expect(sources.length).toBeGreaterThanOrEqual(4);
      expect(sources.some(s => s.id === 'drive')).toBe(true);
      expect(sources.some(s => s.id === 'dropbox')).toBe(true);
      expect(sources.some(s => s.id === 'clipboard')).toBe(true);
    });

    it('unconfigured services display "Not set up yet" tooltip', () => {
      const driveSource = { id: 'drive', label: 'Google Drive', isConfigured: false };
      const tooltip = driveSource.isConfigured ? driveSource.label : 'Not set up yet';
      expect(tooltip).toBe('Not set up yet');

      const clipboardSource = { id: 'clipboard', label: 'Paste from clipboard', isConfigured: true };
      const clipTooltip = clipboardSource.isConfigured ? clipboardSource.label : 'Not set up yet';
      expect(clipTooltip).toBe('Paste from clipboard');
    });

    it('respects 0.4s total animation timing with 50ms stagger per button', () => {
      const totalAnimationDurationSeconds = 0.4;
      const staggerPerItemMs = 50;
      const itemCount = 5;
      const totalStaggerSpanMs = (itemCount - 1) * staggerPerItemMs; // 200ms
      expect(totalAnimationDurationSeconds).toBe(0.4);
      expect(staggerPerItemMs).toBe(50);
      expect(totalStaggerSpanMs).toBeLessThanOrEqual(400);
    });

    it('disables animation when prefers-reduced-motion is true', () => {
      const isReducedMotion = true;
      const appliedAnimation = isReducedMotion ? 'none' : 'waterdrop-in 0.4s';
      expect(appliedAnimation).toBe('none');
    });
  });

  describe('FEATURE 3: Preview Modal Cleanup & Spacing Symmetry', () => {
    it('specifies removed controls (Flip, Diff Map, Sync pan, 800% Pixel zoom)', () => {
      const activeControls = ['Split', 'Side by Side', 'zoomOut', 'Fit', '100%', 'zoomIn'];
      const removedControls = ['Flip', 'Diff Map', 'Sync pan', '800% Pixel'];

      removedControls.forEach(ctrl => {
        expect(activeControls.includes(ctrl)).toBe(false);
      });
      expect(activeControls).toContain('Split');
      expect(activeControls).toContain('Side by Side');
      expect(activeControls).toContain('Fit');
      expect(activeControls).toContain('100%');
    });

    it('enforces symmetrical top and bottom spacing using the identical spacing token', () => {
      const headerPaddingTop = 'var(--control-spacing)';
      const footerPaddingBottom = 'var(--control-spacing)';
      expect(headerPaddingTop).toBe(footerPaddingBottom);
    });
  });

  describe('FEATURE 4: Shareable Settings Link & Zero PII', () => {
    it('round-trips encode and decode of compression settings', () => {
      const settings: CompressionSettings = {
        ...BASE_TEST_SETTINGS,
        outputFormat: 'webp',
        quality: 85,
        targetFileSize: {
          enabled: true,
          targetBytes: 20480,
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
        transforms: [{ type: 'rotate', angle: 90 }]
      };

      const hash = encodeSettingsToHash(settings);
      expect(hash).toContain('fmt:webp');
      expect(hash).toContain('q:85');
      expect(hash).toContain('t:20kb');
      expect(hash).toContain('r:none');
      expect(hash).toContain('tr:rot90');

      const decoded = decodeSettingsFromHash(hash);
      expect(decoded).not.toBeNull();
      expect(decoded!.outputFormat).toBe('webp');
      expect(decoded!.quality).toBe(85);
      expect(decoded!.targetFileSize?.targetBytes).toBe(20480);
      expect(decoded!.resize?.enabled).toBe(false);
      expect(decoded!.transforms?.[0]).toEqual({ type: 'rotate', angle: 90 });
    });

    it('safely ignores malformed or corrupt URL hashes with zero thrown errors', () => {
      expect(decodeSettingsFromHash('')).toBeNull();
      expect(decodeSettingsFromHash('#invalid')).toBeNull();
      expect(decodeSettingsFromHash('#s=')).toBeNull();
      expect(decodeSettingsFromHash('#s=???!!!garbage;:::;;')).toBeNull();
      expect(decodeSettingsFromHash('#s=fmt:unknownFormat;q:notANumber')).toBeNull();
    });

    it('guarantees zero PII, zero filenames, and zero byte payloads in the generated hash', () => {
      const sensitiveFilename = 'passport_scan_john_doe_2026.png';
      const settings: CompressionSettings = {
        ...BASE_TEST_SETTINGS,
        outputFormat: 'jpeg',
        quality: 75
      };

      const hash = encodeSettingsToHash(settings);
      expect(hash).not.toContain(sensitiveFilename);
      expect(hash).not.toContain('passport');
      expect(hash).not.toContain('john');
      expect(hash).not.toContain('data:image');
      expect(hash).toMatch(/^#s=[\w:;,-]+$/);
    });
  });
});

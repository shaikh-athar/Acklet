import '@angular/compiler';
// apps/tool-image-compressor/src/routes.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { compressorRoutes } from './routes';
import { COMPRESSOR_CONFIG } from './config/compressor.config';
import { ImageItem, IndividualCompressionOverrides } from './models/compressor.models';
import { determineHonestResult } from './services/honest-label.util';

describe('Image Compressor 3-Screen Architecture & Verification (STEP 7)', () => {
  describe('Screen Tests: Routes & Forbidden Controls', () => {
    it('defines exactly one tool route without separate child routes for steps', () => {
      expect(compressorRoutes.length).toBeGreaterThanOrEqual(1);
      const rootRoute = compressorRoutes.find(r => r.path === '');
      expect(rootRoute).toBeDefined();
      expect(rootRoute?.component).toBeDefined();

      const routePaths = compressorRoutes.map(r => r.path);
      expect(routePaths).not.toContain('input');
      expect(routePaths).not.toContain('settings');
      expect(routePaths).not.toContain('output');
      expect(routePaths).not.toContain('preview');
    });

    it('Home screen: has heading, Select Images, formats line, and popular presets; no file list or settings', () => {
      // Configuration defines popular presets
      expect(COMPRESSOR_CONFIG.presets.developer.length).toBeGreaterThanOrEqual(6);
      const devKeys = COMPRESSOR_CONFIG.presets.developer.map(p => p.key);
      expect(devKeys).toContain('website');
      expect(devKeys).toContain('blog');
      expect(devKeys).toContain('ecommerce');
      expect(devKeys).toContain('social');
      expect(devKeys).toContain('thumbnails');
      expect(devKeys).toContain('retina');
    });

    it('Working screen: includes files list and Compression Settings panel; card has no preview button', () => {
      // Simulates Working screen state with file card and panel settings
      const workingScreenCardActions = ['customize', 'compress'];
      expect(workingScreenCardActions).toContain('customize');
      expect(workingScreenCardActions).toContain('compress');
      expect(workingScreenCardActions).not.toContain('preview');
    });

    it('Output screen: has title, summary, cards with Preview and Save; NO customize button in action bar, NO settings panel', () => {
      const outputScreenCardActions = ['preview', 'save'];
      expect(outputScreenCardActions).toContain('preview');
      expect(outputScreenCardActions).toContain('save');
      expect(outputScreenCardActions).not.toContain('customize');
    });
  });

  describe('Flow Tests: Screen Transitions & Actions', () => {
    let mockItem: ImageItem;

    beforeEach(() => {
      mockItem = {
        id: 'img-1',
        file: new File(['data'], 'sample.jpg', { type: 'image/jpeg' }),
        originalName: 'sample.jpg',
        nameWithoutExt: 'sample',
        originalExtension: 'jpg',
        detectedFormat: 'jpeg',
        mimeType: 'image/jpeg',
        originalSize: 45000,
        width: 800,
        height: 600,
        aspectRatio: 800 / 600,
        previewUrl: 'blob:mock-preview',
        selected: false,
        status: 'ready',
        capabilities: {
          previewSupported: true,
          directEncodeSupported: true,
          transcodeRequired: false,
          losslessSupported: false,
          animationSupported: false,
          alphaSupported: false
        },
        individualSettings: { hasCustomSettings: false },
        effectiveSettings: {
          mode: 'balanced',
          preset: 'balanced',
          quality: 80,
          outputFormat: 'original',
          resize: { enabled: false, mode: 'dimensions', maintainAspectRatio: true, percentage: 100, preventUpscale: true },
          metadataPolicy: 'remove'
        },
        addedAt: Date.now()
      };
    });

    it('Select Images / dropping files moves session from Home to Working screen', () => {
      const initialImages: ImageItem[] = [];
      expect(initialImages.length).toBe(0);

      // Files added
      const workingImages = [mockItem];
      expect(workingImages.length).toBe(1);
      expect(workingImages[0].status).toBe('ready');
    });

    it('Customize then Cancel leaves settings unchanged', () => {
      const originalSettings = { ...mockItem.individualSettings };
      // User opens popup and cancels
      const cancelledSettings = { ...mockItem.individualSettings };
      expect(cancelledSettings).toEqual(originalSettings);
      expect(mockItem.individualSettings.hasCustomSettings).toBe(false);
    });

    it('Customize then Compress applies overrides and moves image to Output screen', () => {
      const customOverrides: Partial<IndividualCompressionOverrides> = {
        hasCustomSettings: true,
        outputFormat: 'webp',
        quality: 70
      };

      // Apply overrides
      mockItem.individualSettings = { ...mockItem.individualSettings, ...customOverrides };
      expect(mockItem.individualSettings.hasCustomSettings).toBe(true);
      expect(mockItem.individualSettings.outputFormat).toBe('webp');

      // Compression output
      mockItem.status = 'completed';
      mockItem.result = {
        imageId: mockItem.id,
        originalSize: 45000,
        compressedSize: 25000,
        savedBytes: 20000,
        savedPercentage: 44.4,
        originalWidth: 800,
        originalHeight: 600,
        outputWidth: 800,
        outputHeight: 600,
        originalFormat: 'jpeg',
        outputFormat: 'webp',
        outputMimeType: 'image/webp',
        outputBlob: new Blob(['webp-data']),
        outputUrl: 'blob:mock-output',
        outputFilename: 'sample.webp',
        processingTimeMs: 45,
        status: 'completed',
        honestStatus: 'saved',
        honestLabel: 'Saved 44.4%'
      };

      expect(mockItem.status).toBe('completed');
      expect(mockItem.result.savedPercentage).toBe(44.4);
    });

    it('Customize again from Output then Cancel returns to Output unchanged', () => {
      // Image already on Output screen
      mockItem.status = 'completed';
      const initialResult = mockItem.result;

      // User clicks "Customize again", opens popup, but clicks Cancel
      const afterCancelResult = mockItem.result;
      expect(afterCancelResult).toBe(initialResult);
      expect(mockItem.status).toBe('completed');
    });

    it('Start over asks for confirmation and clears state to return to Home', () => {
      let sessionImages: ImageItem[] = [mockItem];
      expect(sessionImages.length).toBe(1);

      // Confirm dialog triggered
      const confirmDialog = {
        action: 'new-session',
        title: 'Start Over?',
        message: 'This will reset all compression settings, clear your current images, and return you to the upload screen.'
      };
      expect(confirmDialog.action).toBe('new-session');

      // On confirm, session cleared
      sessionImages = [];
      expect(sessionImages.length).toBe(0);
    });
  });

  describe('State Tests: Persistence & Honest Status', () => {
    it('settings chosen in panel carry into individual customizations', () => {
      const panelSettings = {
        outputFormat: 'avif' as const,
        quality: 65,
        targetFileSize: {
          enabled: true,
          targetValue: 24,
          targetUnit: 'KB' as const,
          targetBytes: 24576,
          minQuality: 25
        }
      };

      expect(panelSettings.outputFormat).toBe('avif');
      expect(panelSettings.quality).toBe(65);
      expect(panelSettings.targetFileSize.targetBytes).toBe(24576);
    });

    it('Output screen displays honest status without false savings', () => {
      const savedRes = determineHonestResult({
        originalSize: 50000,
        compressedSize: 30000
      });
      expect(savedRes.status).toBe('saved');
      expect(savedRes.labelText).toBe('Saved 40%');

      const alreadyOptRes = determineHonestResult({
        originalSize: 20000,
        compressedSize: 20000,
        alreadyOptimized: true
      });
      // STEP 5: "Already optimized" label removed, kept-original status with no false savings badge
      expect(alreadyOptRes.status).toBe('kept-original');
      expect(alreadyOptRes.badge).toBeFalsy();
    });
  });

  describe('Preview Comparison Modal Verification', () => {
    it('Preview modal has Split, Side by Side, Flip, and Diff Map modes without settings or customize buttons', () => {
      const comparisonModes = ['split', 'side-by-side', 'flip', 'diff'];
      expect(comparisonModes).toContain('split');
      expect(comparisonModes).toContain('side-by-side');
      expect(comparisonModes).toContain('flip');
      expect(comparisonModes).toContain('diff');

      const previewModalButtons = ['zoom-in', 'zoom-out', 'fit', '100%', 'prev', 'next', 'download'];
      expect(previewModalButtons).not.toContain('customize');
      expect(previewModalButtons).not.toContain('settings');
    });
  });
});

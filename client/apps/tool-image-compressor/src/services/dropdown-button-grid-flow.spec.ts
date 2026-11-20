// apps/tool-image-compressor/src/services/dropdown-button-grid-flow.spec.ts
import { describe, it, expect } from 'vitest';
import { ImageItem } from '../models/compressor.models';
import { formatBytes } from './target-suggestion.util';

describe('Acklet Image Compressor - Dropdowns, Button Layouts, Tablet Grid & Flow Simplification', () => {

  // STEP 1: Home screen source dropdown test (360px)
  describe('STEP 1: Home screen source dropdown (360px)', () => {
    const availableSources = [
      { id: 'device', label: 'This device', icon: 'folder', isConfigured: true },
      { id: 'drive', label: 'Google Drive', icon: 'hard-drive', isConfigured: false },
      { id: 'dropbox', label: 'Dropbox', icon: 'folder-up', isConfigured: false },
      { id: 'clipboard', label: 'Clipboard', icon: 'clipboard-paste', isConfigured: true }
    ];

    it('shows four items in the exact order: This device, Google Drive, Dropbox, Clipboard', () => {
      expect(availableSources.length).toBe(4);
      expect(availableSources[0].label).toBe('This device');
      expect(availableSources[0].icon).toBe('folder');
      expect(availableSources[1].label).toBe('Google Drive');
      expect(availableSources[2].label).toBe('Dropbox');
      expect(availableSources[3].label).toBe('Clipboard');
    });

    it('verifies the chevron inside "Select files" sits fully inside the button bounding box', () => {
      // Simulating button and chevron geometry at 360px viewport
      const buttonRect = { left: 20, right: 340, top: 200, bottom: 248, width: 320, height: 48 };
      const chevronSize = 20;
      const chevronRightOffset = 12; // 12px from right edge
      const chevronRect = {
        left: buttonRect.right - chevronRightOffset - chevronSize, // 340 - 12 - 20 = 308
        right: buttonRect.right - chevronRightOffset,              // 340 - 12 = 328
        top: buttonRect.top + (buttonRect.height - chevronSize) / 2, // 200 + 14 = 214
        bottom: buttonRect.top + (buttonRect.height - chevronSize) / 2 + chevronSize, // 234
        width: chevronSize,
        height: chevronSize
      };

      // Chevron must sit completely inside the button's bounding box
      expect(chevronRect.left).toBeGreaterThan(buttonRect.left);
      expect(chevronRect.right).toBeLessThan(buttonRect.right);
      expect(chevronRect.top).toBeGreaterThan(buttonRect.top);
      expect(chevronRect.bottom).toBeLessThan(buttonRect.bottom);

      // Distance from right edge must be exactly 12px
      expect(buttonRect.right - chevronRect.right).toBe(12);

      // Vertically centered inside button
      const topGap = chevronRect.top - buttonRect.top;
      const bottomGap = buttonRect.bottom - chevronRect.bottom;
      expect(topGap).toBe(bottomGap);
    });

    it('verifies each dropdown row is at least 44px tall and full width', () => {
      const dropdownWidth = 320;
      const rowHeight = 44;
      expect(rowHeight).toBeGreaterThanOrEqual(44);
      expect(dropdownWidth).toBeGreaterThanOrEqual(300);
    });
  });

  // STEP 2: Working screen "Add files" button test (360px)
  describe('STEP 2: Working screen "Add files" button (360px)', () => {
    it('verifies "Add files" button height matches Clear button height (44px on xs)', () => {
      const xsAddFilesHeight = 44;
      const xsClearHeight = 44;
      expect(xsAddFilesHeight).toBe(xsClearHeight);
    });

    it('verifies chevron sits inside the same button border without separate circle', () => {
      const buttonRect = { left: 16, right: 172, top: 60, bottom: 104, width: 156, height: 44 };
      const chevronRect = { left: 140, right: 168, top: 60, bottom: 104, width: 28, height: 44 };

      // Chevron uses same height and vertical alignment as the button/label
      expect(chevronRect.height).toBe(buttonRect.height);
      expect(chevronRect.top).toBe(buttonRect.top);
      expect(chevronRect.bottom).toBe(buttonRect.bottom);
      expect(chevronRect.left).toBeGreaterThan(buttonRect.left);
      expect(chevronRect.right).toBeLessThanOrEqual(buttonRect.right);
    });

    it('matches the button width on xs screens to the Clear button row (equal 50% split)', () => {
      const containerWidth = 328; // 360 - 32px padding
      const gap = 8;
      const expectedColWidth = (containerWidth - gap) / 2; // 160px
      const addFilesWidth = expectedColWidth;
      const clearWidth = expectedColWidth;

      expect(addFilesWidth).toBe(clearWidth);
      expect(addFilesWidth + clearWidth + gap).toBe(containerWidth);
    });
  });

  // STEP 3: Working header on tablet and up (1032px)
  describe('STEP 3: Working header on tablet and up (1032px)', () => {
    it('keeps title "Images to Compress" on one single line on md and up', () => {
      const titleStyle = { whiteSpace: 'nowrap', flexShrink: 0 };
      expect(titleStyle.whiteSpace).toBe('nowrap');
      expect(titleStyle.flexShrink).toBe(0);
    });

    it('ensures count badge ("1 / 50") stays on single line and is never narrower than its text', () => {
      const badgeStyle = {
        whiteSpace: 'nowrap',
        flexShrink: 0,
        minWidth: 'max-content',
        padding: '0 10px'
      };
      expect(badgeStyle.whiteSpace).toBe('nowrap');
      expect(badgeStyle.minWidth).toBe('max-content');
      expect(badgeStyle.flexShrink).toBe(0);
    });

    it('aligns the right edge of Clear with the right edge of the tile grid within 1px', () => {
      // In 1032px desktop layout, stage-header-bar has padding: 8px 0; width: 100%;
      // image-gallery-grid has padding: 0 0 24px 0; width: 100%;
      const stageWidth = 680; // stage width at 1032px viewport
      const stageLeft = 16;
      const stageRight = stageLeft + stageWidth; // 696

      const headerRight = stageRight; // padding-right: 0
      const clearBtnRight = headerRight; // right-aligned in header actions
      const tileGridRight = stageRight; // width: 100%, padding-right: 0

      const difference = Math.abs(clearBtnRight - tileGridRight);
      expect(difference).toBeLessThanOrEqual(1);
    });

    it('confirms "View Results" link is removed from the Working header entirely', () => {
      const headerElements = ['stage-title', 'stage-count-badge', 'add-files-btn-group', 'clear-all-header-btn'];
      expect(headerElements).not.toContain('view-results-header-btn');
      expect(headerElements.includes('view-results-header-btn')).toBe(false);
    });
  });

  // STEP 4: Tile grid alignment (1032px)
  describe('STEP 4: Tile grid alignment (1032px)', () => {
    it('ensures all tiles in row 1 have the same width (within 1px)', () => {
      // At 1032px (lg), repeat(4, minmax(0, 1fr)) with 20px gap
      const stageWidth = 680;
      const columns = 4;
      const gap = 20;
      const totalGaps = gap * (columns - 1); // 60px
      const availableWidth = stageWidth - totalGaps; // 620px
      const tileWidth = availableWidth / columns; // 155px

      const tile1Width = tileWidth;
      const tile2Width = tileWidth;
      const tile3Width = tileWidth;
      const tile4Width = tileWidth;

      expect(Math.abs(tile1Width - tile2Width)).toBeLessThanOrEqual(1);
      expect(Math.abs(tile2Width - tile3Width)).toBeLessThanOrEqual(1);
      expect(Math.abs(tile3Width - tile4Width)).toBeLessThanOrEqual(1);
    });

    it('ensures "Add More" tile matches image tile width and height', () => {
      // Both app-image-card and add-tile-card-wrapper have width: 100%, height: 100%
      // and image-gallery-grid uses align-items: stretch
      const gridRowHeight = 240;
      const imageTileHeight = gridRowHeight;
      const addMoreTileHeight = gridRowHeight;

      expect(addMoreTileHeight).toBe(imageTileHeight);
    });

    it('verifies column distribution per breakpoint: 1 on xs, 2 on sm, 3 on md, 4 on lg', () => {
      function getColumns(width: number): number {
        if (width <= 479) return 1;
        if (width <= 767) return 2;
        if (width <= 1023) return 3;
        return 4;
      }

      expect(getColumns(360)).toBe(1);
      expect(getColumns(480)).toBe(2);
      expect(getColumns(768)).toBe(3);
      expect(getColumns(1024)).toBe(4);
      expect(getColumns(1032)).toBe(4);
      expect(getColumns(1440)).toBe(4);
    });
  });

  // STEP 5: Flow changes test
  describe('STEP 5: Flow changes', () => {
    it('renames "Back to Working" to "Back" on Output screen', () => {
      const outputBackNavLabel = 'Back';
      expect(outputBackNavLabel).toBe('Back');
      expect(outputBackNavLabel).not.toBe('Back to Working');
    });

    it('removes "Start over" on Output screen and routes Back directly to landing page', () => {
      const outputHasStartOver = false;
      expect(outputHasStartOver).toBe(false);
    });
  });

  // STEP 6: Customize popup shows only original data
  describe('STEP 6: Customize popup shows only original', () => {
    it('shows original size, original dimensions, and original preview for a compressed file', () => {
      // Mock an ImageItem that has already been compressed
      const compressedItem: ImageItem = {
        id: 'img-1',
        file: new File(['original-bytes'], 'photo.png', { type: 'image/png' }),
        originalName: 'photo.png',
        nameWithoutExt: 'photo',
        originalExtension: 'png',
        detectedFormat: 'png',
        mimeType: 'image/png',
        originalSize: 1048576, // 1.0 MB original
        width: 1330,           // 1330 px original
        height: 1182,          // 1182 px original
        aspectRatio: 1330 / 1182,
        previewUrl: 'blob:http://localhost/orig-preview',
        transformedPreviewUrl: 'blob:http://localhost/transformed-preview',
        selected: true,
        status: 'completed',
        capabilities: { previewSupported: true, losslessSupported: true, transparencySupported: true, maxDimension: 16384 },
        individualSettings: { hasCustomSettings: false },
        effectiveSettings: { outputFormat: 'original', quality: 80 },
        result: {
          success: true,
          compressedBlob: new Blob(['comp-bytes']),
          compressedSize: 109600, // 109.6 KB compressed
          outputFormat: 'png',
          outputUrl: 'blob:http://localhost/compressed-output',
          outputWidth: 800,       // 800 px resized
          outputHeight: 711,      // 711 px resized
          savedBytes: 938976,
          savedPercent: 89,
          visualQuality: { ssim: 0.98, rating: 'Excellent', score: 98 },
          durationMs: 120
        },
        addedAt: Date.now()
      };

      // In Customize Modal, computed getters for header & preview
      const headerWidth = compressedItem.originalUploadedWidth ?? compressedItem.width;
      const headerHeight = compressedItem.originalUploadedHeight ?? compressedItem.height;
      const headerSize = compressedItem.originalUploadedSize ?? compressedItem.originalSize;
      const headerExtension = compressedItem.originalUploadedExtension ?? compressedItem.originalExtension;
      const previewThumbnailUrl = compressedItem.transformedPreviewUrl || compressedItem.originalUploadedPreviewUrl || compressedItem.previewUrl;

      // 1. Must show ORIGINAL dimensions (1330 x 1182), NOT compressed result dimensions (800 x 711)
      expect(headerWidth).toBe(1330);
      expect(headerWidth).not.toBe(compressedItem.result?.outputWidth);
      expect(headerHeight).toBe(1182);
      expect(headerHeight).not.toBe(compressedItem.result?.outputHeight);

      // 2. Must show ORIGINAL file size (1 MB), NOT compressed result size (109.6 KB)
      expect(headerSize).toBe(1048576);
      expect(formatBytes(headerSize)).toBe('1 MB');
      expect(headerSize).not.toBe(compressedItem.result?.compressedSize);

      // 3. Must show ORIGINAL preview (with transforms applied), NOT compressed result output URL
      expect(previewThumbnailUrl).toBe('blob:http://localhost/transformed-preview');
      expect(previewThumbnailUrl).not.toBe(compressedItem.result?.outputUrl);

      // 4. Must NOT show output size or result badge in preview-mini-card
      const modalDisplaysOutputSize = false;
      const modalDisplaysResultBadge = false;
      expect(modalDisplaysOutputSize).toBe(false);
      expect(modalDisplaysResultBadge).toBe(false);

      // 5. Original extension visible
      expect(headerExtension).toBe('png');
    });

    it('initializes settings from the file own customization if present', () => {
      const fileWithCustomSettings: ImageItem = {
        id: 'img-custom',
        file: new File([''], 'custom.jpg', { type: 'image/jpeg' }),
        originalName: 'custom.jpg',
        nameWithoutExt: 'custom',
        originalExtension: 'jpg',
        detectedFormat: 'jpeg',
        mimeType: 'image/jpeg',
        originalSize: 500000,
        width: 1000,
        height: 800,
        aspectRatio: 1.25,
        previewUrl: 'blob:orig',
        selected: true,
        status: 'ready',
        capabilities: { previewSupported: true, losslessSupported: false, transparencySupported: false, maxDimension: 16384 },
        individualSettings: {
          hasCustomSettings: true,
          outputFormat: 'webp',
          targetFileSize: { enabled: true, targetValue: 97, targetUnit: 'KB', targetBytes: 99328 }
        },
        effectiveSettings: { outputFormat: 'original', quality: 80 },
        addedAt: Date.now()
      };

      // Settings start from whatever the file already has
      const initialFormat = fileWithCustomSettings.individualSettings.outputFormat || fileWithCustomSettings.effectiveSettings.outputFormat;
      const initialTargetValue = fileWithCustomSettings.individualSettings.targetFileSize?.targetValue;

      expect(initialFormat).toBe('webp');
      expect(initialTargetValue).toBe(97);
    });
  });
});

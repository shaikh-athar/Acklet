import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompressorStateService } from './compressor-state.service';
import { ImageCompressionService } from './image-compression.service';
import { CompressorValidationService } from './compressor-validation.service';
import { DropdownManagerService } from './dropdown-manager.service';
import { resultStatus } from './result-status.util';
import { ImageItem, CompressionResult } from '../models/compressor.models';

describe('Acklet Image Compressor — Workspace Actions, Output Actions & Repeated Customization', () => {
  let state: CompressorStateService;
  let validationService: CompressorValidationService;
  let dropdownManager: DropdownManagerService;

  beforeEach(() => {
    dropdownManager = new DropdownManagerService();
    validationService = new CompressorValidationService();
    state = new CompressorStateService();
  });

  describe('1 & 2. Workspace Actions & Optimization Profiles Placement', () => {
    it('provides openProfileModal on state without needing workspace more dropdown', () => {
      expect(state.profileModalOpen()).toBe(false);
      state.openProfileModal();
      expect(state.profileModalOpen()).toBe(true);
      state.closeProfileModal();
      expect(state.profileModalOpen()).toBe(false);
    });

    it('manages output-more dropdown with dropdownManager and auto-closes on outside click', () => {
      expect(dropdownManager.isOpen('output-more')).toBe(false);
      dropdownManager.open('output-more');
      expect(dropdownManager.isOpen('output-more')).toBe(true);

      // Outside click / closeAll closes it
      dropdownManager.closeAll();
      expect(dropdownManager.isOpen('output-more')).toBe(false);
    });
  });

  describe('3. Output Screen More Dropdown & Audit Report Consistency', () => {
    it('opens audit report for the current compression session', () => {
      expect(state.reportModalOpen()).toBe(false);
      state.openReportModal();
      expect(state.reportModalOpen()).toBe(true);
      state.closeReportModal();
      expect(state.reportModalOpen()).toBe(false);
    });
  });

  describe('5. Repeated Customization — Latest Compressed Image as the New Source', () => {
    function createMockImage(id: string, name: string, size: number, width: number, height: number, format: string): ImageItem {
      const file = new File([new Uint8Array(size)], name, { type: format === 'png' ? 'image/png' : 'image/jpeg' });
      return {
        id,
        file,
        originalName: name,
        nameWithoutExt: name.replace(/\.[^/.]+$/, ''),
        originalExtension: format,
        detectedFormat: format,
        mimeType: format === 'png' ? 'image/png' : 'image/jpeg',
        originalSize: size,
        width,
        height,
        aspectRatio: width / height,
        previewUrl: `blob:${name}`,
        selected: false,
        status: 'ready',
        capabilities: { fileAccepted: true, previewSupported: true, compressionSupported: true, description: 'Format' },
        individualSettings: { hasCustomSettings: false },
        effectiveSettings: {
          outputFormat: 'original',
          quality: 80,
          resize: { enabled: false, mode: 'percentage', percentage: 100, maintainAspectRatio: true }
        },
        addedAt: Date.now(),
        // Original source tracking:
        originalUploadedFile: file,
        originalUploadedSize: size,
        originalUploadedWidth: width,
        originalUploadedHeight: height,
        originalUploadedFormat: format,
        originalUploadedExtension: format,
        originalUploadedMimeType: format === 'png' ? 'image/png' : 'image/jpeg',
        originalUploadedPreviewUrl: `blob:${name}`,
        currentWorkingSource: {
          file,
          blob: file,
          size,
          width,
          height,
          format,
          mimeType: format === 'png' ? 'image/png' : 'image/jpeg',
          extension: format,
          previewUrl: `blob:${name}`,
          iteration: 0
        }
      };
    }

    it('preserves the original uploaded file while adopting the 300 KB compressed output as the new working source', async () => {
      // Step 1: Upload a 1.0 MB PNG (1,048,576 B)
      const originalBytes = 1048576;
      const initialItem = createMockImage('img-1', 'photo.png', originalBytes, 1330, 1182, 'png');

      (state as any).images.set([initialItem]);
      expect(state.images()[0].originalSize).toBe(originalBytes);
      expect(state.images()[0].originalUploadedSize).toBe(originalBytes);

      // Step 2: First compression produces 300 KB (307,200 B)
      const compressedBytes1 = 307200;
      const blob1 = new Blob([new Uint8Array(compressedBytes1)], { type: 'image/png' });
      const result1: CompressionResult = {
        imageId: 'img-1',
        originalSize: originalBytes,
        compressedSize: compressedBytes1,
        savedBytes: originalBytes - compressedBytes1,
        savedPercentage: 70,
        originalWidth: 1330,
        originalHeight: 1182,
        outputWidth: 1330,
        outputHeight: 1182,
        originalFormat: 'png',
        outputFormat: 'png',
        outputMimeType: 'image/png',
        outputBlob: blob1,
        outputUrl: 'blob:compressed-300k',
        outputFilename: 'photo.png',
        processingTimeMs: 120,
        status: 'completed',
        targetAchieved: true
      };

      // Mock compression completion in state
      (state as any).updateItemState('img-1', {
        status: 'completed',
        progress: 100,
        result: result1,
        currentWorkingSource: {
          file: new File([blob1], 'photo.png', { type: 'image/png' }),
          blob: blob1,
          size: compressedBytes1,
          width: 1330,
          height: 1182,
          format: 'png',
          mimeType: 'image/png',
          extension: 'png',
          previewUrl: 'blob:compressed-300k',
          iteration: 1
        }
      });

      // Step 3: User clicks Customize again -> prepareForCustomization is called
      state.prepareForCustomization('img-1');

      const workingItem1 = state.images()[0];
      // The working image now has source size 300 KB!
      expect(workingItem1.originalSize).toBe(compressedBytes1);
      expect(workingItem1.file.size).toBe(compressedBytes1);
      expect(workingItem1.previewUrl).toBe('blob:compressed-300k');

      // The pristine original uploaded file is permanently preserved!
      expect(workingItem1.originalUploadedSize).toBe(originalBytes);
      expect(workingItem1.originalUploadedFile.size).toBe(originalBytes);

      // Step 4: Second compression from 300 KB produces 180 KB (184,320 B)
      const compressedBytes2 = 184320;
      const blob2 = new Blob([new Uint8Array(compressedBytes2)], { type: 'image/png' });
      const result2: CompressionResult = {
        imageId: 'img-1',
        originalSize: compressedBytes1,
        compressedSize: compressedBytes2,
        savedBytes: compressedBytes1 - compressedBytes2,
        savedPercentage: 40,
        originalWidth: 1330,
        originalHeight: 1182,
        outputWidth: 1330,
        outputHeight: 1182,
        originalFormat: 'png',
        outputFormat: 'png',
        outputMimeType: 'image/png',
        outputBlob: blob2,
        outputUrl: 'blob:compressed-180k',
        outputFilename: 'photo.png',
        processingTimeMs: 95,
        status: 'completed',
        targetAchieved: true
      };

      (state as any).updateItemState('img-1', {
        status: 'completed',
        progress: 100,
        result: result2,
        currentWorkingSource: {
          file: new File([blob2], 'photo.png', { type: 'image/png' }),
          blob: blob2,
          size: compressedBytes2,
          width: 1330,
          height: 1182,
          format: 'png',
          mimeType: 'image/png',
          extension: 'png',
          previewUrl: 'blob:compressed-180k',
          iteration: 2
        }
      });

      // Step 5: User clicks Customize again for third time
      state.prepareForCustomization('img-1');
      const workingItem2 = state.images()[0];

      // Now source size is 180 KB!
      expect(workingItem2.originalSize).toBe(compressedBytes2);
      expect(workingItem2.file.size).toBe(compressedBytes2);
      expect(workingItem2.previewUrl).toBe('blob:compressed-180k');

      // Original uploaded file remains completely untouched!
      expect(workingItem2.originalUploadedSize).toBe(originalBytes);
    });

    it('allows resetting back to the pristine original uploaded file via resetToOriginal()', () => {
      const originalBytes = 1048576;
      const initialItem = createMockImage('img-reset', 'design.png', originalBytes, 1920, 1080, 'png');

      (state as any).images.set([initialItem]);

      // Simulate compressed to 250 KB
      const compressedBytes = 256000;
      const blob = new Blob([new Uint8Array(compressedBytes)], { type: 'image/webp' });
      (state as any).updateItemState('img-reset', {
        status: 'completed',
        currentWorkingSource: {
          file: new File([blob], 'design.webp', { type: 'image/webp' }),
          blob,
          size: compressedBytes,
          width: 1200,
          height: 675,
          format: 'webp',
          mimeType: 'image/webp',
          extension: 'webp',
          previewUrl: 'blob:design-webp',
          iteration: 1
        }
      });

      // Prepare customization (adopts 250 KB)
      state.prepareForCustomization('img-reset');
      expect(state.images()[0].originalSize).toBe(compressedBytes);
      expect(state.images()[0].detectedFormat).toBe('webp');

      // Explicitly Reset to Original
      state.resetToOriginal('img-reset');

      const restoredItem = state.images()[0];
      expect(restoredItem.originalSize).toBe(originalBytes);
      expect(restoredItem.detectedFormat).toBe('png');
      expect(restoredItem.width).toBe(1920);
      expect(restoredItem.height).toBe(1080);
      expect(restoredItem.status).toBe('ready');
      expect(restoredItem.result).toBeUndefined();
      expect(restoredItem.currentWorkingSource?.iteration).toBe(0);
    });

    it('isolates repeated customization independently across multiple images in a batch', () => {
      const imgA = createMockImage('img-a', 'alpha.png', 1000000, 1000, 1000, 'png');
      const imgB = createMockImage('img-b', 'beta.jpg', 2000000, 2000, 2000, 'jpeg');

      (state as any).images.set([imgA, imgB]);

      // Only compress imgA to 400 KB
      const blobA = new Blob([new Uint8Array(400000)], { type: 'image/png' });
      (state as any).updateItemState('img-a', {
        status: 'completed',
        currentWorkingSource: {
          file: new File([blobA], 'alpha.png', { type: 'image/png' }),
          blob: blobA,
          size: 400000,
          width: 1000,
          height: 1000,
          format: 'png',
          mimeType: 'image/png',
          extension: 'png',
          previewUrl: 'blob:alpha-400k',
          iteration: 1
        }
      });

      state.prepareForCustomization('img-a');
      state.prepareForCustomization('img-b');

      const items = state.images();
      // img-a was updated to 400 KB working source
      expect(items[0].originalSize).toBe(400000);
      expect(items[0].originalUploadedSize).toBe(1000000);

      // img-b remained at its original 2.0 MB size without cross-talk
      expect(items[1].originalSize).toBe(2000000);
      expect(items[1].originalUploadedSize).toBe(2000000);
      expect(items[1].currentWorkingSource?.iteration).toBe(0);
    });
  });

  describe('6. Tile Metrics & Customize Modal Header Metrics After Compression', () => {
    it('shows compressed size in tile when image is completed even with No reduction (reduced: false)', () => {
      // Recreating Screenshot 2 scenario: icons8-discord-96.png, 857 B
      const file = new File([new Uint8Array(857)], 'icons8-discord-96.png', { type: 'image/png' });
      const item: ImageItem = {
        id: 'discord-icon',
        file,
        originalName: 'icons8-discord-96.png',
        nameWithoutExt: 'icons8-discord-96',
        originalExtension: 'png',
        detectedFormat: 'png',
        mimeType: 'image/png',
        originalSize: 857,
        width: 96,
        height: 96,
        aspectRatio: 1,
        previewUrl: 'blob:discord',
        selected: false,
        status: 'completed',
        capabilities: { fileAccepted: true, previewSupported: true, compressionSupported: true, description: 'PNG' },
        individualSettings: { hasCustomSettings: false },
        effectiveSettings: { outputFormat: 'original', quality: 100 },
        addedAt: Date.now(),
        result: {
          id: 'res-discord',
          status: 'completed',
          originalSize: 857,
          compressedSize: 857,
          compressionRatio: 0,
          originalWidth: 96,
          originalHeight: 96,
          outputWidth: 96,
          outputHeight: 96,
          originalFormat: 'png',
          outputFormat: 'png',
          outputMimeType: 'image/png',
          outputFilename: 'icons8-discord-96.png',
          outputExtension: 'png',
          reductionReason: 'Already optimal. Try a target or a format.',
          processingTimeMs: 12
        }
      };

      // Verify card model via canonical resultStatus
      const status = resultStatus(item);

      expect(status.reduced).toBe(false);
      expect(status.outputBytes).toBe(857);

      // In image-card, if status.reduced is false, it renders formattedCompressedSize() (857 B)
      const formatBytes = (bytes: number) => bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
      const displayedTileMetric = status.reduced
        ? `${formatBytes(item.originalSize)} → ${formatBytes(status.outputBytes)}`
        : formatBytes(status.outputBytes);

      expect(displayedTileMetric).toBe('857 B');
    });

    it('updates size, resolution, and extension after compression in customize modal header', () => {
      // Recreating Screenshot 1 scenario: 1.0 MB PNG (1330x1182) compressed to 109.6 KB (800x711 WEBP)
      const origSize = 1048576; // 1.0 MB
      const compSize = 112230;  // 109.6 KB
      const file = new File([new Uint8Array(origSize)], 'Minimalist Three-Shape Black Emblem.png', { type: 'image/png' });
      const compBlob = new Blob([new Uint8Array(compSize)], { type: 'image/webp' });

      const item: ImageItem = {
        id: 'emblem-1',
        file,
        originalName: 'Minimalist Three-Shape Black Emblem.png',
        nameWithoutExt: 'Minimalist Three-Shape Black Emblem',
        originalExtension: 'png',
        detectedFormat: 'png',
        mimeType: 'image/png',
        originalSize: origSize,
        width: 1330,
        height: 1182,
        aspectRatio: 1330 / 1182,
        previewUrl: 'blob:emblem',
        selected: false,
        status: 'completed',
        capabilities: { fileAccepted: true, previewSupported: true, compressionSupported: true, description: 'PNG' },
        individualSettings: { hasCustomSettings: true },
        effectiveSettings: { outputFormat: 'webp', quality: 80 },
        addedAt: Date.now(),
        result: {
          id: 'res-emblem',
          status: 'completed',
          originalSize: origSize,
          compressedSize: compSize,
          compressionRatio: 89.3,
          originalWidth: 1330,
          originalHeight: 1182,
          outputWidth: 800,
          outputHeight: 711,
          originalFormat: 'png',
          outputFormat: 'webp',
          outputMimeType: 'image/webp',
          outputFilename: 'Minimalist Three-Shape Black Emblem.webp',
          outputExtension: 'webp',
          outputBlob: compBlob,
          processingTimeMs: 45
        }
      };

      (state as any).images.set([item]);

      // When prepareForCustomization is called before opening Customize modal:
      state.prepareForCustomization('emblem-1');

      const updated = state.images()[0];
      // Size and dimensions adopt the compressed output
      expect(updated.originalSize).toBe(compSize);
      expect(updated.width).toBe(800);
      expect(updated.height).toBe(711);
      expect(updated.detectedFormat).toBe('webp');
      expect(updated.originalExtension).toBe('webp');

      // Pristine original upload values are permanently preserved
      expect(updated.originalUploadedSize).toBe(origSize);
      expect(updated.originalUploadedWidth).toBe(1330);
      expect(updated.originalUploadedHeight).toBe(1182);
    });
  });
});

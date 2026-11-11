// apps/tool-image-compressor/src/services/compressor-state.service.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CompressorStateService } from './compressor-state.service';
import { CompressorValidationService } from './compressor-validation.service';
import { ImageItem } from '../models/compressor.models';

describe('CompressorStateService', () => {
  let state: CompressorStateService;
  let mockValidator: CompressorValidationService;

  beforeEach(() => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    if (typeof URL.createObjectURL !== 'function') {
      URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    }
    if (typeof URL.revokeObjectURL !== 'function') {
      URL.revokeObjectURL = vi.fn();
    }

    mockValidator = new CompressorValidationService();
    // Instantiate directly with mocked/real validator
    state = new CompressorStateService();
    (state as any).validator = mockValidator;
  });

  const createMockItem = (id: string, name: string, size = 1024): ImageItem => ({
    id,
    file: new File(['data'], name, { type: 'image/png' }),
    originalName: name,
    nameWithoutExt: name.replace(/\.[^.]+$/, ''),
    originalExtension: 'png',
    detectedFormat: 'png',
    mimeType: 'image/png',
    originalSize: size,
    width: 800,
    height: 600,
    aspectRatio: 800 / 600,
    previewUrl: `blob:mock-${id}`,
    selected: false,
    status: 'ready',
    capabilities: {
      fileAccepted: true,
      previewSupported: true,
      compressionSupported: true,
      description: 'PNG'
    },
    individualSettings: { hasCustomSettings: false },
    effectiveSettings: { ...state.globalSettings() },
    addedAt: Date.now()
  });

  it('should initialize with default empty state', () => {
    expect(state.images().length).toBe(0);
    expect(state.hasImages()).toBe(false);
    expect(state.totalCount()).toBe(0);
    expect(state.selectedCount()).toBe(0);
    expect(state.globalSettings().quality).toBe(80);
    expect(state.globalSettings().outputFormat).toBe('original');
  });

  it('should toggle selection and compute allSelected', () => {
    const item1 = createMockItem('img1', 'a.png');
    const item2 = createMockItem('img2', 'b.png');
    state.images.set([item1, item2]);

    expect(state.allSelected()).toBe(false);

    state.toggleSelect('img1');
    expect(state.selectedCount()).toBe(1);
    expect(state.allSelected()).toBe(false);

    state.selectAll();
    expect(state.selectedCount()).toBe(2);
    expect(state.allSelected()).toBe(true);

    state.deselectAll();
    expect(state.selectedCount()).toBe(0);
    expect(state.allSelected()).toBe(false);
  });

  it('should remove an image and update selectedIds', () => {
    const item1 = createMockItem('img1', 'a.png');
    const item2 = createMockItem('img2', 'b.png');
    state.images.set([item1, item2]);
    state.toggleSelect('img1');

    state.removeImage('img1');
    expect(state.images().length).toBe(1);
    expect(state.images()[0].id).toBe('img2');
    expect(state.selectedIds().has('img1')).toBe(false);
  });

  it('should remove selected images', () => {
    const item1 = createMockItem('img1', 'a.png');
    const item2 = createMockItem('img2', 'b.png');
    const item3 = createMockItem('img3', 'c.png');
    state.images.set([item1, item2, item3]);

    state.toggleSelect('img1');
    state.toggleSelect('img3');
    expect(state.selectedCount()).toBe(2);

    state.removeSelected();
    expect(state.images().length).toBe(1);
    expect(state.images()[0].id).toBe('img2');
    expect(state.selectedCount()).toBe(0);
  });

  it('should remove all images on removeAll()', () => {
    const item1 = createMockItem('img1', 'a.png');
    const item2 = createMockItem('img2', 'b.png');
    state.images.set([item1, item2]);

    state.removeAll();
    expect(state.images().length).toBe(0);
    expect(state.hasImages()).toBe(false);
  });

  it('should propagate global settings to items without custom overrides', () => {
    const item1 = createMockItem('img1', 'a.png');
    const item2 = createMockItem('img2', 'b.png');
    state.images.set([item1, item2]);

    state.updateGlobalSettings({ quality: 65, outputFormat: 'webp' });

    expect(state.globalSettings().quality).toBe(65);
    expect(state.globalSettings().outputFormat).toBe('webp');
    expect(state.images()[0].effectiveSettings.quality).toBe(65);
    expect(state.images()[0].effectiveSettings.outputFormat).toBe('webp');
    expect(state.images()[1].effectiveSettings.quality).toBe(65);
    expect(state.images()[1].effectiveSettings.outputFormat).toBe('webp');
  });

  it('should preserve individual overrides when global settings change', () => {
    const item1 = createMockItem('img1', 'a.png');
    const item2 = createMockItem('img2', 'b.png');
    state.images.set([item1, item2]);

    // Apply individual override to item1
    state.updateIndividualSettings('img1', { quality: 95, outputFormat: 'png' });

    expect(state.images()[0].individualSettings.hasCustomSettings).toBe(true);
    expect(state.images()[0].effectiveSettings.quality).toBe(95);
    expect(state.images()[0].effectiveSettings.outputFormat).toBe('png');

    // Now change global settings
    state.updateGlobalSettings({ quality: 50, outputFormat: 'avif' });

    // Item 1 must retain its custom overrides (95% / PNG)
    expect(state.images()[0].effectiveSettings.quality).toBe(95);
    expect(state.images()[0].effectiveSettings.outputFormat).toBe('png');

    // Item 2 should have inherited global settings (50% / AVIF)
    expect(state.images()[1].effectiveSettings.quality).toBe(50);
    expect(state.images()[1].effectiveSettings.outputFormat).toBe('avif');
  });

  it('should reset individual overrides back to global settings', () => {
    const item1 = createMockItem('img1', 'a.png');
    state.images.set([item1]);

    state.updateGlobalSettings({ quality: 70, outputFormat: 'webp' });
    state.updateIndividualSettings('img1', { quality: 90, outputFormat: 'png' });

    expect(state.images()[0].individualSettings.hasCustomSettings).toBe(true);
    expect(state.images()[0].effectiveSettings.quality).toBe(90);

    state.resetIndividualSettings('img1');

    expect(state.images()[0].individualSettings.hasCustomSettings).toBe(false);
    expect(state.images()[0].effectiveSettings.quality).toBe(70);
    expect(state.images()[0].effectiveSettings.outputFormat).toBe('webp');
  });

  it('should handle preview modal navigation next and prev', () => {
    const item1 = createMockItem('img1', 'a.png');
    const item2 = createMockItem('img2', 'b.png');
    const item3 = createMockItem('img3', 'c.png');
    state.images.set([item1, item2, item3]);

    state.openPreview(0);
    expect(state.previewModalIndex()).toBe(0);
    expect(state.previewImage()?.id).toBe('img1');

    state.nextPreview();
    expect(state.previewModalIndex()).toBe(1);
    expect(state.previewImage()?.id).toBe('img2');

    state.nextPreview();
    expect(state.previewModalIndex()).toBe(2);
    expect(state.previewImage()?.id).toBe('img3');

    // Wrap around
    state.nextPreview();
    expect(state.previewModalIndex()).toBe(0);

    // Prev wrap around
    state.prevPreview();
    expect(state.previewModalIndex()).toBe(2);

    state.closePreview();
    expect(state.previewModalIndex()).toBe(null);
    expect(state.previewImage()).toBe(null);
  });
});


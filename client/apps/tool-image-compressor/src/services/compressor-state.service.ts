// apps/tool-image-compressor/src/services/compressor-state.service.ts
import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';
import {
  ImageItem,
  CompressionSettings,
  IndividualCompressionOverrides,
  ToastMessage,
  BatchValidationResult
} from '../models/compressor.models';
import {
  CompressorValidationService,
  MAX_SESSION_FILES
} from './compressor-validation.service';

export const DEFAULT_COMPRESSION_SETTINGS: CompressionSettings = {
  mode: 'smart',
  quality: 80,
  outputFormat: 'original',
  resize: {
    enabled: false,
    mode: 'dimensions',
    maintainAspectRatio: true,
    percentage: 100
  },
  metadataPolicy: 'preserve'
};

@Injectable({
  providedIn: 'root'
})
export class CompressorStateService implements OnDestroy {
  private readonly validator: CompressorValidationService;

  constructor() {
    try {
      this.validator = inject(CompressorValidationService);
    } catch {
      this.validator = new CompressorValidationService();
    }
  }

  // Core Reactive Signals
  readonly images = signal<ImageItem[]>([]);
  readonly selectedIds = signal<Set<string>>(new Set());
  readonly globalSettings = signal<CompressionSettings>({ ...DEFAULT_COMPRESSION_SETTINGS });
  readonly previewModalIndex = signal<number | null>(null);
  readonly activeSettingsDrawerItemId = signal<string | null>(null);
  readonly isDragging = signal<boolean>(false);
  readonly toast = signal<ToastMessage | null>(null);

  private toastTimer: any = null;
  private toastDismissTimer: any = null;
  private toastCounter = 0;

  // Computed Properties
  readonly totalCount = computed(() => this.images().length);
  readonly hasImages = computed(() => this.images().length > 0);
  readonly totalOriginalSize = computed(() =>
    this.images().reduce((acc, img) => acc + img.originalSize, 0)
  );

  readonly selectedCount = computed(() => this.selectedIds().size);
  readonly allSelected = computed(() => {
    const list = this.images();
    return list.length > 0 && this.selectedCount() === list.length;
  });

  readonly previewImage = computed(() => {
    const idx = this.previewModalIndex();
    const list = this.images();
    if (idx !== null && idx >= 0 && idx < list.length) {
      return list[idx];
    }
    return null;
  });

  readonly activeSettingsItem = computed(() => {
    const id = this.activeSettingsDrawerItemId();
    if (!id) return null;
    return this.images().find(img => img.id === id) || null;
  });

  ngOnDestroy(): void {
    this.cleanupAllObjectUrls();
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (this.toastDismissTimer) clearTimeout(this.toastDismissTimer);
  }

  /**
   * Adds multiple files to the session, applying limits, duplicate rejection, and signature validation.
   */
  async addFiles(files: FileList | File[]): Promise<BatchValidationResult> {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) {
      return { accepted: [], rejectedCount: 0, errors: [] };
    }

    const currentImages = this.images();
    const remainingSlots = MAX_SESSION_FILES - currentImages.length;

    if (remainingSlots <= 0) {
      this.showToast('warning', `Maximum ${MAX_SESSION_FILES} images reached. Remove some to add more.`);
      return {
        accepted: [],
        rejectedCount: fileArray.length,
        errors: [`Maximum ${MAX_SESSION_FILES} images limit reached.`]
      };
    }

    const accepted: ImageItem[] = [];
    const errors: string[] = [];
    let rejectedCount = 0;

    const filesToProcess = fileArray.slice(0, remainingSlots);
    if (fileArray.length > remainingSlots) {
      const omitted = fileArray.length - remainingSlots;
      rejectedCount += omitted;
      errors.push(`Omitted ${omitted} file(s) because the 50-image session limit was reached.`);
    }

    const currentSettings = this.globalSettings();

    for (const file of filesToProcess) {
      // Check duplicate against both existing images and newly accepted in this batch
      if (this.validator.isDuplicate(file, [...currentImages, ...accepted])) {
        rejectedCount++;
        errors.push(`"${file.name}" was skipped because it is already in the batch.`);
        continue;
      }

      try {
        const item = await this.validator.processFile(file, currentSettings);
        accepted.push(item);
      } catch (err: any) {
        rejectedCount++;
        errors.push(err.message || `Failed to process "${file.name}".`);
      }
    }

    if (accepted.length > 0) {
      this.images.update(list => [...list, ...accepted]);

      if (rejectedCount === 0) {
        this.showToast(
          'success',
          accepted.length === 1
            ? `Added "${accepted[0].originalName}"`
            : `Added ${accepted.length} images`
        );
      } else {
        this.showToast(
          'info',
          `Added ${accepted.length} image(s). ${rejectedCount} rejected (see details below).`,
          4000
        );
      }
    } else if (rejectedCount > 0) {
      this.showToast(
        'error',
        errors[0] || `Failed to add ${rejectedCount} file(s).`,
        4500
      );
    }

    return { accepted, rejectedCount, errors };
  }

  /**
   * Removes a single image and revokes its memory URL.
   */
  removeImage(id: string): void {
    const list = this.images();
    const item = list.find(img => img.id === id);
    if (item?.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }

    this.images.update(items => items.filter(img => img.id !== id));
    this.selectedIds.update(set => {
      const next = new Set(set);
      next.delete(id);
      return next;
    });

    if (this.activeSettingsDrawerItemId() === id) {
      this.activeSettingsDrawerItemId.set(null);
    }

    const currentPreviewIdx = this.previewModalIndex();
    if (currentPreviewIdx !== null) {
      const updatedList = this.images();
      if (updatedList.length === 0) {
        this.previewModalIndex.set(null);
      } else if (currentPreviewIdx >= updatedList.length) {
        this.previewModalIndex.set(updatedList.length - 1);
      }
    }

    if (item) {
      this.showToast('info', `Removed "${item.originalName}"`, 2000);
    }
  }

  /**
   * Removes all images from workspace and revokes all object URLs.
   */
  removeAll(): void {
    const count = this.images().length;
    this.cleanupAllObjectUrls();
    this.images.set([]);
    this.selectedIds.set(new Set());
    this.previewModalIndex.set(null);
    this.activeSettingsDrawerItemId.set(null);
    if (count > 0) {
      this.showToast('info', `Removed all ${count} images`, 2000);
    }
  }

  /**
   * Toggles selection state for an image.
   */
  toggleSelect(id: string): void {
    this.selectedIds.update(set => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

    this.images.update(list =>
      list.map(img => img.id === id ? { ...img, selected: !img.selected } : img)
    );
  }

  /**
   * Selects all images.
   */
  selectAll(): void {
    const list = this.images();
    const allIds = new Set(list.map(img => img.id));
    this.selectedIds.set(allIds);
    this.images.update(items => items.map(img => ({ ...img, selected: true })));
  }

  /**
   * Deselects all images.
   */
  deselectAll(): void {
    this.selectedIds.set(new Set());
    this.images.update(items => items.map(img => ({ ...img, selected: false })));
  }

  /**
   * Removes selected images.
   */
  removeSelected(): void {
    const selected = this.selectedIds();
    if (selected.size === 0) return;

    const count = selected.size;
    const list = this.images();

    list.forEach(img => {
      if (selected.has(img.id) && img.previewUrl) {
        URL.revokeObjectURL(img.previewUrl);
      }
    });

    this.images.update(items => items.filter(img => !selected.has(img.id)));
    this.selectedIds.set(new Set());

    if (this.previewModalIndex() !== null) {
      const remaining = this.images();
      if (remaining.length === 0) {
        this.previewModalIndex.set(null);
      } else {
        this.previewModalIndex.set(Math.min(this.previewModalIndex()!, remaining.length - 1));
      }
    }

    this.showToast('info', `Removed ${count} selected image(s)`, 2000);
  }

  /**
   * Updates global compression settings and propagates to images without individual overrides.
   */
  updateGlobalSettings(partial: Partial<CompressionSettings>): void {
    this.globalSettings.update(curr => {
      const next: CompressionSettings = {
        ...curr,
        ...partial,
        resize: partial.resize ? { ...curr.resize, ...partial.resize } : curr.resize
      };
      return next;
    });

    const currentGlobal = this.globalSettings();

    // Propagate only to items without individual overrides
    this.images.update(list =>
      list.map(item => {
        if (item.individualSettings.hasCustomSettings) {
          return item; // Do NOT overwrite custom overrides!
        }
        return {
          ...item,
          effectiveSettings: { ...currentGlobal }
        };
      })
    );
  }

  /**
   * Updates individual settings overrides for a specific image.
   */
  updateIndividualSettings(id: string, overrides: Partial<IndividualCompressionOverrides>): void {
    const global = this.globalSettings();

    this.images.update(list =>
      list.map(item => {
        if (item.id !== id) return item;

        const nextOverrides: IndividualCompressionOverrides = {
          ...item.individualSettings,
          ...overrides,
          hasCustomSettings: true
        };

        const effective: CompressionSettings = {
          mode: global.mode,
          quality: nextOverrides.quality ?? global.quality,
          outputFormat: nextOverrides.outputFormat ?? global.outputFormat,
          resize: nextOverrides.resize
            ? { ...global.resize, ...nextOverrides.resize }
            : { ...global.resize },
          metadataPolicy: nextOverrides.metadataPolicy ?? global.metadataPolicy
        };

        return {
          ...item,
          individualSettings: nextOverrides,
          effectiveSettings: effective
        };
      })
    );
  }

  /**
   * Resets an image back to inheriting global settings.
   */
  resetIndividualSettings(id: string): void {
    const global = this.globalSettings();

    this.images.update(list =>
      list.map(item => {
        if (item.id !== id) return item;
        return {
          ...item,
          individualSettings: { hasCustomSettings: false },
          effectiveSettings: { ...global }
        };
      })
    );

    this.showToast('info', 'Restored global settings for image', 1500);
  }

  /**
   * Applies global settings to all currently selected images.
   */
  applyGlobalSettingsToSelected(): void {
    const selected = this.selectedIds();
    if (selected.size === 0) return;

    const global = this.globalSettings();

    this.images.update(list =>
      list.map(item => {
        if (!selected.has(item.id)) return item;
        return {
          ...item,
          individualSettings: { hasCustomSettings: false },
          effectiveSettings: { ...global }
        };
      })
    );

    this.showToast('success', `Applied global settings to ${selected.size} image(s)`, 2000);
  }

  // Preview Modal Navigation
  openPreview(indexOrId: number | string): void {
    if (typeof indexOrId === 'number') {
      this.previewModalIndex.set(indexOrId);
    } else {
      const idx = this.images().findIndex(img => img.id === indexOrId);
      if (idx !== -1) {
        this.previewModalIndex.set(idx);
      }
    }
  }

  closePreview(): void {
    this.previewModalIndex.set(null);
  }

  nextPreview(): void {
    const curr = this.previewModalIndex();
    const total = this.images().length;
    if (curr !== null && total > 0) {
      this.previewModalIndex.set((curr + 1) % total);
    }
  }

  prevPreview(): void {
    const curr = this.previewModalIndex();
    const total = this.images().length;
    if (curr !== null && total > 0) {
      this.previewModalIndex.set((curr - 1 + total) % total);
    }
  }

  // Individual Settings Drawer / Popover
  openItemSettings(id: string): void {
    this.activeSettingsDrawerItemId.set(id);
  }

  closeItemSettings(): void {
    this.activeSettingsDrawerItemId.set(null);
  }

  // Toast Notification System
  showToast(type: ToastMessage['type'], message: string, customDuration?: number): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
    if (this.toastDismissTimer) {
      clearTimeout(this.toastDismissTimer);
      this.toastDismissTimer = null;
    }

    const duration = customDuration ?? (type === 'error' ? 3500 : (type === 'warning' ? 3000 : 2500));
    const id = ++this.toastCounter;
    this.toast.set({ id, type, message, isLeaving: false });

    this.toastTimer = setTimeout(() => {
      if (this.toast()?.id === id) {
        this.toast.update(curr => curr ? { ...curr, isLeaving: true } : null);
        this.toastDismissTimer = setTimeout(() => {
          if (this.toast()?.id === id) {
            this.toast.set(null);
          }
        }, 200);
      }
    }, duration);
  }

  private cleanupAllObjectUrls(): void {
    this.images().forEach(img => {
      if (img.previewUrl) {
        URL.revokeObjectURL(img.previewUrl);
      }
    });
  }
}

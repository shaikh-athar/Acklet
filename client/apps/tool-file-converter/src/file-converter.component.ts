// apps/tool-file-converter/src/file-converter.component.ts
import { Component, ChangeDetectionStrategy, inject, signal, computed, effect, HostListener, ViewChild, ElementRef, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TsIconComponent, FileTransferService } from '@acklet/tool-shell';
import { ConversionEngineService, MAX_FILES_PER_BATCH } from './services/conversion-engine.service';
import { ConversionItemComponent } from './components/conversion-item/conversion-item.component';
import { PreviewModalComponent } from './components/preview-modal/preview-modal.component';
import { RotatingWordComponent } from './components/rotating-word/rotating-word.component';
import { ConversionJob, FormatDescriptor, ConversionPresetName } from './models/converter.models';
import { ImageCapabilityRegistry, DeduplicatedTargetFormat } from './services/image-capability.registry';
import { FormatComparisonService, FormatTileResult } from './services/format-comparison.service';
import { ImageConversionAdapter } from './services/adapters/image-conversion.adapter';

export interface ConversionPair {
  source: string;
  target: string;
}

export interface ConverterToast {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  isLeaving?: boolean;
}

interface QualityOption {
  label: string;
  value: number;
  badge: string;
}

interface ResizeOption {
  label: string;
  value?: number;
  desc?: string;
}

@Component({
  selector: 'app-file-converter-tool',
  standalone: true,
  host: {
    '[class.has-jobs]': 'engine.hasJobs()'
  },
  imports: [
    CommonModule,
    FormsModule,
    TsIconComponent,
    ConversionItemComponent,
    PreviewModalComponent,
    RotatingWordComponent
  ],
  templateUrl: './file-converter.component.html',
  styleUrls: ['./file-converter.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FileConverterComponent implements OnInit, OnDestroy {
  readonly engine = inject(ConversionEngineService);
  private readonly fileTransfer = inject(FileTransferService);
  private readonly capabilityRegistry = inject(ImageCapabilityRegistry);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly maxFiles = MAX_FILES_PER_BATCH;
  readonly formatSearchQuery = signal<string>('');

  readonly previewModalJobId = signal<string | null>(null);
  readonly previewModalJob = computed(() => {
    const id = this.previewModalJobId();
    if (!id) return null;
    return this.engine.jobs().find(j => j.id === id) || null;
  });
  readonly conversionPair = signal<ConversionPair | null>(null);

  // Bottom-center toast notification system with deduplication and smooth exit
  readonly toast = signal<ConverterToast | null>(null);
  private toastTimer: any = null;
  private toastDismissTimer: any = null;
  private toastCounter = 0;
  private lastSuccessMessage = '';
  private lastSuccessTime = 0;

  showToast(type: 'success' | 'error' | 'warning' | 'info', message: string, customDuration?: number): void {
    if (type === 'success') {
      const now = Date.now();
      if (this.lastSuccessMessage === message && now - this.lastSuccessTime < 2000) {
        return;
      }
      this.lastSuccessMessage = message;
      this.lastSuccessTime = now;
    }

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

  @ViewChild('workspaceFileInput') private workspaceFileInput?: ElementRef<HTMLInputElement>;

  readonly qualityOptions: QualityOption[] = [
    { label: 'Balanced', value: 0.85, badge: '85%' },
    { label: 'Best Quality', value: 0.95, badge: '95%' },
    { label: 'Smallest Size', value: 0.65, badge: '65%' }
  ];

  readonly resizeOptions: ResizeOption[] = [
    { label: 'Original (No resize)', value: undefined },
    { label: '1920px (Full HD)', value: 1920 },
    { label: '1280px (HD 720p)', value: 1280 },
    { label: '800px (Web Optimized)', value: 800 }
  ];

  readonly isResizeDropdownOpen = signal<boolean>(false);

  toggleResizeDropdown(): void {
    this.isResizeDropdownOpen.update(v => !v);
    if (this.isResizeDropdownOpen()) {
      this.isFormatDropdownOpen.set(false);
    }
  }

  selectResizeOption(val?: number): void {
    this.onBatchResizeChange(val);
    this.isResizeDropdownOpen.set(false);
  }

  readonly currentResizeLabel = computed(() => {
    const w = this.engine.batchMaxWidth();
    if (!w) return 'Original (No resize)';
    const found = this.resizeOptions.find(o => o.value === w);
    return found ? found.label : `${w}px`;
  });

  isResizeSelected(val?: number): boolean {
    return this.engine.batchMaxWidth() === val;
  }

  readonly qualityPercent = computed(() => Math.round(this.engine.batchQuality() * 100));

  /** Short preset label shown next to the quality % — empty string when no named preset matches */
  readonly qualityPresetLabel = computed((): string => {
    const q = this.qualityPercent();
    if (q <= 20)  return 'SMALL';
    if (q === 85) return 'BALANCED';
    if (q >= 95)  return 'BEST';
    return '';
  });

  readonly qualityRatio = computed(() => {
    const min = 10;
    const max = 100;
    const val = this.qualityPercent();
    return Math.max(0, Math.min(1, (val - min) / (max - min)));
  });

  readonly qualityTrackBackground = computed(() => {
    const r = this.qualityRatio();
    const pct = (r * 100).toFixed(2);
    const pxOffset = 9 - 18 * r;
    const offsetStr = pxOffset >= 0 ? `+ ${pxOffset.toFixed(1)}px` : `- ${Math.abs(pxOffset).toFixed(1)}px`;
    const stop = `calc(${pct}% ${offsetStr})`;
    return `linear-gradient(to right, var(--tool-accent, #2563EB) 0%, var(--tool-accent, #2563EB) ${stop}, var(--slider-track-bg, #E2E8F0) ${stop}, var(--slider-track-bg, #E2E8F0) 100%)`;
  });

  formatRatio(w?: number, h?: number): string {
    if (!w || !h || w <= 0 || h <= 0) return '';
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(Math.round(w), Math.round(h));
    const rw = Math.round(w) / divisor;
    const rh = Math.round(h) / divisor;
    if (rw <= 32 && rh <= 32) {
      return `${rw}:${rh}`;
    }
    return `${(w / h).toFixed(2)}:1`;
  }

  setQualityPercent(pct: number): void {
    const clamped = Math.max(10, Math.min(100, Math.round(pct)));
    const q = clamped / 100;
    this.engine.batchQuality.set(q);
    if (this.qualityDebounceTimer) {
      clearTimeout(this.qualityDebounceTimer);
      this.qualityDebounceTimer = null;
    }
    this.engine.setBatchQuality(q);
    const label = clamped === 85 ? 'Balanced' : clamped >= 95 ? 'Best' : clamped <= 20 ? 'Small' : `${clamped}%`;
    this.showToast('info', `Quality set to ${clamped}% (${label})`, 1500);
  }

  // Advanced Image Processing Accordion States
  readonly isAdvancedSettingsOpen = signal<boolean>(false);
  readonly isTransformOpen = signal<boolean>(false);
  readonly isBackgroundOpen = signal<boolean>(false);
  readonly isMetadataOpen = signal<boolean>(false);
  readonly isDpiOpen = signal<boolean>(false);
  readonly isAnimationOpen = signal<boolean>(false);
  readonly targetSupportsAnimation = computed(() => ['webp', 'gif'].includes(this.engine.batchTargetFormat().toLowerCase()));
  readonly isNamingOpen = signal<boolean>(false);

  readonly singleJob = computed(() => {
    const jobs = this.engine.jobs();
    return jobs.length === 1 ? jobs[0] : null;
  });

  readonly singleJobBaseName = computed(() => {
    const job = this.singleJob();
    if (!job) return '';
    const fullName = job.file.name;
    const lastDot = fullName.lastIndexOf('.');
    return lastDot > 0 ? fullName.substring(0, lastDot) : fullName;
  });

  onSingleJobNameChange(newName: string): void {
    const job = this.singleJob();
    if (!job) return;
    const trimmed = newName.trim();
    if (trimmed && trimmed !== this.singleJobBaseName()) {
      this.onRenameJob(job.id, trimmed);
    }
  }

  readonly lockAspectRatio = signal<boolean>(true);
  readonly customHeight = signal<number | undefined>(undefined);

  readonly bgSwatches = ['#FFFFFF', '#000000', '#F8FAFC', '#2563EB', '#10B981'];
  readonly dpiOptions = [72, 96, 150, 300];

  toggleAspectLock(): void {
    this.lockAspectRatio.update(v => !v);
  }

  resetDimensions(): void {
    this.customHeight.set(undefined);
    this.engine.setBatchResize(undefined);
    this.engine.updateGlobalOptions({
      resize: { mode: 'original', maintainAspectRatio: true }
    });
  }

  private resizeDebounceTimer: any = null;

  onCustomWidthInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    const num = val ? Number(val) : undefined;
    if (this.lockAspectRatio() && num) {
      const first = this.engine.jobs().find(j => j.originalDimensions);
      if (first?.originalDimensions) {
        const h = Math.round(num * (first.originalDimensions.height / first.originalDimensions.width));
        this.customHeight.set(h);
      }
    }
    clearTimeout(this.resizeDebounceTimer);
    this.resizeDebounceTimer = setTimeout(() => {
      this.engine.setBatchResize(num);
    }, 250);
  }

  onCustomHeightInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    const num = val ? Number(val) : undefined;
    this.customHeight.set(num);
    if (this.lockAspectRatio() && num) {
      const first = this.engine.jobs().find(j => j.originalDimensions);
      if (first?.originalDimensions) {
        const w = Math.round(num * (first.originalDimensions.width / first.originalDimensions.height));
        clearTimeout(this.resizeDebounceTimer);
        this.resizeDebounceTimer = setTimeout(() => {
          this.engine.setBatchResize(w);
        }, 250);
      }
    }
  }

  readonly colorProfileOptions = ['srgb', 'display-p3', 'preserve'] as const;

  setColorProfile(colorProfile: 'srgb' | 'display-p3' | 'preserve' | string): void {
    const profile = (colorProfile === 'display-p3' || colorProfile === 'preserve') ? colorProfile : 'srgb';
    this.engine.updateGlobalOptions({ colorProfile: profile });
  }

  setAnimationMode(mode: 'preserve' | 'first-frame'): void {
    const current = this.engine.batchAnimationOptions();
    this.engine.updateGlobalOptions({
      animation: { ...current, mode, preserveFrames: mode === 'preserve' }
    });
    this.showToast('info', mode === 'preserve' ? 'Preserving all animation frames' : 'Exporting first frame as static image', 2000);
  }

  setAnimationLoopMode(loopMode: 'auto' | 'infinite' | 'once'): void {
    const current = this.engine.batchAnimationOptions();
    this.engine.updateGlobalOptions({
      animation: { ...current, loopMode }
    });
    const label = loopMode === 'auto'
      ? 'Same as source animation'
      : (loopMode === 'infinite' ? 'Loop continuously all the time' : 'Play initial animation once');
    this.showToast('info', label, 2000);
  }

  readonly outputPreviewInfo = computed(() => {
    const jobs = this.engine.jobs();
    const first = jobs[0];
    const targetFmt = this.getShortSelectedTargetLabel();
    const quality = this.qualityPercent();
    const firstDims = first?.originalDimensions;
    let outWidth = firstDims?.width;
    let outHeight = firstDims?.height;
    const maxW = this.engine.batchMaxWidth();
    if (firstDims && maxW && firstDims.width > maxW) {
      outWidth = maxW;
      outHeight = Math.round(firstDims.height * (maxW / firstDims.width));
    }
    const dimsStr = outWidth && outHeight ? `${outWidth} × ${outHeight} px` : (maxW ? `Max ${maxW} px` : 'Original resolution');
    return {
      format: targetFmt,
      quality: this.isLosslessTarget() ? 'Lossless (100%)' : `${quality}%`,
      dimensions: dimsStr,
      dpi: `${this.engine.batchDpi()} DPI`,
      colorProfile: this.engine.batchColorProfile().toUpperCase(),
      privacy: this.engine.batchMetadataOptions().mode === 'preserve' ? 'Metadata preserved' : (this.engine.batchMetadataOptions().mode === 'strip-gps' ? 'GPS removed' : 'Metadata stripped')
    };
  });

  readonly filenamePreview = computed(() => {
    const jobs = this.engine.jobs();
    const first = jobs[0];
    const originalBase = first ? first.file.name.substring(0, first.file.name.lastIndexOf('.')) || first.file.name : 'image';
    const custom = this.engine.batchNamingOptions().customName?.trim();
    const base = custom || originalBase;
    const ext = this.getShortSelectedTargetLabel().toLowerCase();
    return `${base}.${ext}`;
  });

  readonly customFilenameValue = computed(() => {
    return this.engine.batchNamingOptions().customName ?? '';
  });

  setCustomFilename(name: string): void {
    const trimmed = name.trim();
    const naming = this.engine.batchNamingOptions();
    this.engine.updateGlobalOptions({
      naming: {
        ...naming,
        patternMode: trimmed ? 'custom' : 'original',
        customName: trimmed || undefined
      }
    });
  }

  isCustomColorSelected(): boolean {
    const current = this.engine.batchBackgroundOptions().color?.toUpperCase();
    return !!current && !this.bgSwatches.map(s => s.toUpperCase()).includes(current);
  }

  onApplyPreset(name: ConversionPresetName): void {
    this.engine.applyPreset(name);
    const labelMap: Record<ConversionPresetName, string> = {
      web: 'Web Optimized preset applied (WebP, 82%, 1920px max, GPS stripped)',
      quality: 'High Quality preset applied (PNG, 100% fidelity, metadata preserved)',
      print: 'Print Ready preset applied (TIFF, 300 DPI, solid white background)',
      small: 'Small File Size preset applied (WebP, 65%, 1280px max)',
      transparent: 'Transparent Graphic preset applied (PNG, transparent background)'
    };
    this.showToast('info', labelMap[name] || `Applied ${name} preset`, 2500);
  }

  rotate(deg: 90 | 180 | 270): void {
    const current = this.engine.batchTransformOptions().rotation || 0;
    const next = ((current + deg) % 360) as 0 | 90 | 180 | 270;
    this.engine.updateGlobalOptions({
      transform: {
        ...this.engine.batchTransformOptions(),
        rotation: next === 0 ? undefined : next
      }
    });
    this.showToast('info', `Rotation set to ${next}°`, 2000);
  }

  flip(dir: 'horizontal' | 'vertical'): void {
    const t = this.engine.batchTransformOptions();
    if (dir === 'horizontal') {
      this.engine.updateGlobalOptions({
        transform: { ...t, flipHorizontal: !t.flipHorizontal }
      });
    } else {
      this.engine.updateGlobalOptions({
        transform: { ...t, flipVertical: !t.flipVertical }
      });
    }
  }

  setCropAspect(ratio?: string): void {
    const t = this.engine.batchTransformOptions();
    if (!ratio || ratio === 'free') {
      this.engine.updateGlobalOptions({
        transform: { ...t, crop: undefined }
      });
    } else {
      this.engine.updateGlobalOptions({
        transform: { ...t, crop: { aspectRatio: ratio as any } }
      });
      this.showToast('info', `Crop ratio set to ${ratio}`, 2000);
    }
  }

  resetTransforms(): void {
    this.engine.updateGlobalOptions({
      transform: {}
    });
    this.showToast('info', 'All transformations reset', 2000);
  }

  readonly hasActiveTransforms = computed(() => {
    const t = this.engine.batchTransformOptions();
    return !!(t.rotation || t.flipHorizontal || t.flipVertical || t.crop);
  });

  setBackgroundMode(mode: 'transparent' | 'solid'): void {
    const bg = this.engine.batchBackgroundOptions();
    this.engine.updateGlobalOptions({
      background: { ...bg, mode }
    });
  }

  setBackgroundColor(color: string): void {
    this.engine.updateGlobalOptions({
      background: { mode: 'solid', color }
    });
  }

  setMetadataMode(mode: 'preserve' | 'strip-gps' | 'strip-all'): void {
    const meta = this.engine.batchMetadataOptions();
    this.engine.updateGlobalOptions({
      metadata: { ...meta, mode }
    });
    const msgs = {
      preserve: 'All metadata will be preserved in output',
      'strip-gps': 'GPS location removed for privacy protection',
      'strip-all': 'All metadata stripped for minimal file size'
    };
    this.showToast('info', msgs[mode], 2000);
  }

  setDpi(dpi: number): void {
    this.engine.updateGlobalOptions({ dpi });
  }

  readonly printDimensionsSummary = computed(() => {
    const dpi = this.engine.batchDpi();
    const jobs = this.engine.jobs();
    const firstWithDims = jobs.find(j => j.originalDimensions);
    if (!firstWithDims || !firstWithDims.originalDimensions) {
      return null;
    }
    const w = firstWithDims.originalDimensions.width;
    const h = firstWithDims.originalDimensions.height;
    const wInches = (w / dpi).toFixed(1);
    const hInches = (h / dpi).toFixed(1);
    const wCm = ((w / dpi) * 2.54).toFixed(1);
    const hCm = ((h / dpi) * 2.54).toFixed(1);
    return {
      inches: `${wInches}″ × ${hInches}″`,
      cm: `${wCm} × ${hCm} cm`,
      dpi
    };
  });

  readonly isLosslessTarget = computed(() => {
    const fmt = this.engine.batchTargetFormat().toLowerCase();
    return ['png', 'svg', 'bmp', 'tiff', 'tif', 'gif', 'srt', 'vtt', 'vcf', 'csv'].includes(fmt);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // FEATURE 4: Visible Privacy Proof
  // ══════════════════════════════════════════════════════════════════════════
  readonly privacyAudit = this.engine.privacyAudit;

  // ══════════════════════════════════════════════════════════════════════════
  // FEATURE 1: Target File Size (Auto-Quality)
  // ══════════════════════════════════════════════════════════════════════════
  readonly targetSizeEnabled = signal<boolean>(false);
  readonly targetSizeValue = signal<number>(200);
  readonly targetSizeUnit = signal<'KB' | 'MB'>('KB');

  readonly isTargetSizeActive = computed(() => {
    return this.targetSizeEnabled() && !this.isLosslessTarget() && this.targetSizeValue() > 0;
  });

  toggleTargetSize(): void {
    const next = !this.targetSizeEnabled();
    this.targetSizeEnabled.set(next);
    this.syncTargetFileSize();
    if (next) {
      this.showToast('info', `Target file size enabled (${this.targetSizeValue()} ${this.targetSizeUnit()})`, 2000);
    } else {
      this.showToast('info', 'Target file size disabled. Manual quality restored.', 1500);
    }
  }

  onTargetSizeValueInput(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    if (!isNaN(val) && val > 0) {
      this.targetSizeValue.set(val);
      this.syncTargetFileSize();
    }
  }

  setTargetSizeUnit(unit: 'KB' | 'MB'): void {
    if (this.targetSizeUnit() === unit) return;
    this.targetSizeUnit.set(unit);
    this.syncTargetFileSize();
  }

  private syncTargetFileSize(): void {
    const enabled = this.targetSizeEnabled();
    const val = this.targetSizeValue();
    const unit = this.targetSizeUnit();
    const bytes = unit === 'MB' ? val * 1024 * 1024 : val * 1024;
    this.engine.updateGlobalOptions({
      targetFileSize: {
        enabled,
        value: val,
        unit,
        targetBytes: bytes
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FEATURE 3: Smart Format Suggestion
  // ══════════════════════════════════════════════════════════════════════════
  readonly dismissedSuggestionSession = signal<boolean>(false);

  readonly activeSuggestion = computed(() => {
    if (this.dismissedSuggestionSession()) return null;
    const jobs = this.engine.jobs();
    if (jobs.length === 0) return null;

    const currentBatchTarget = this.engine.batchTargetFormat().toLowerCase();

    // 1. Single file queued:
    if (jobs.length === 1) {
      const job = jobs[0];
      const analysis = job.smartAnalysis;
      if (analysis?.suggestedFormat && analysis.suggestedFormat !== currentBatchTarget) {
        return {
          format: analysis.suggestedFormat,
          reason: analysis.reason || `Recommended format for ${job.detectedFormat.format.toUpperCase()} images.`,
          isBatch: false,
          count: 1
        };
      }
      return null;
    }

    // 2. Batch queued (multiple files):
    const photosCount = jobs.filter(j => j.smartAnalysis?.isPhoto && !j.smartAnalysis?.hasAlpha).length;
    const alphaCount = jobs.filter(j => j.smartAnalysis?.hasAlpha).length;

    if (photosCount >= 2 && currentBatchTarget !== 'webp' && currentBatchTarget !== 'avif') {
      return {
        format: 'webp',
        reason: `${photosCount} photos with no transparency: WebP is about 60% smaller than PNG.`,
        isBatch: true,
        count: photosCount
      };
    }

    if (alphaCount >= 2 && currentBatchTarget !== 'webp') {
      return {
        format: 'webp',
        reason: `${alphaCount} images have transparency: WebP keeps transparency at a fraction of PNG size.`,
        isBatch: true,
        count: alphaCount
      };
    }

    // Single item fallback within batch if first job has a clear suggestion
    const first = jobs.find(j => j.smartAnalysis?.suggestedFormat && j.smartAnalysis.suggestedFormat !== currentBatchTarget);
    if (first?.smartAnalysis?.suggestedFormat) {
      return {
        format: first.smartAnalysis.suggestedFormat,
        reason: first.smartAnalysis.reason || `Recommended format for ${first.detectedFormat.format.toUpperCase()}.`,
        isBatch: false,
        count: 1
      };
    }

    return null;
  });

  applySmartSuggestion(): void {
    const sug = this.activeSuggestion();
    if (!sug) return;
    this.selectTargetFormat(sug.format);
    this.showToast('success', `Applied ${sug.format.toUpperCase()} recommendation!`);
  }

  dismissSmartSuggestion(): void {
    this.dismissedSuggestionSession.set(true);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FEATURE 2: Multi-Format Comparison Before Converting
  // ══════════════════════════════════════════════════════════════════════════
  readonly comparisonService = inject(FormatComparisonService);
  readonly comparisonModalJobId = signal<string | null>(null);
  readonly comparisonTiles = signal<FormatTileResult[]>([]);
  readonly isComparisonLoading = signal<boolean>(false);

  readonly comparisonJob = computed(() => {
    const id = this.comparisonModalJobId();
    if (!id) return null;
    return this.engine.jobs().find(j => j.id === id) || null;
  });

  async openComparisonModal(jobId: string): Promise<void> {
    const job = this.engine.jobs().find(j => j.id === jobId);
    if (!job) return;

    this.comparisonModalJobId.set(jobId);
    this.isComparisonLoading.set(true);

    const formats: Array<'webp' | 'avif' | 'png' | 'jpg'> = ['webp', 'avif', 'png', 'jpg'];
    const quality = this.engine.batchQuality();
    const maxWidth = this.engine.batchMaxWidth();
    const resizeKey = maxWidth ? `${maxWidth}px` : 'orig';
    const targetBytes = this.targetSizeEnabled() ? (this.targetSizeUnit() === 'MB' ? this.targetSizeValue() * 1024 * 1024 : this.targetSizeValue() * 1024) : undefined;

    const isAvifOk = await this.comparisonService.isAvifEncodingSupported();

    // Initialize 4 placeholder tiles
    const initialTiles: FormatTileResult[] = formats.map(fmt => {
      const isAvif = fmt === 'avif';
      const isUnsupported = isAvif && !isAvifOk;
      return {
        format: fmt,
        label: fmt.toUpperCase(),
        loading: !isUnsupported,
        sizeBytes: 0,
        sizeFormatted: '-',
        deltaPercent: 0,
        isSmallest: false,
        fitsTarget: false,
        unsupported: isUnsupported,
        unsupportedReason: isUnsupported ? 'Not supported in this browser' : undefined
      };
    });

    this.comparisonTiles.set(this.comparisonService.computeTileBadges(initialTiles, targetBytes));

    const imageAdapter = this.engine['adapterRegistry'].getAdapter(job.detectedFormat.format, 'webp') as ImageConversionAdapter;

    // Encode variants asynchronously
    for (const fmt of formats) {
      if (fmt === 'avif' && !isAvifOk) continue;

      const cacheKey = this.comparisonService.getCacheKey(job.id, fmt, quality, resizeKey);
      const cached = this.comparisonService.getCachedTile(cacheKey);

      if (cached) {
        this.comparisonTiles.update(list => {
          const updated = list.map(t => t.format === fmt ? cached : t);
          return this.comparisonService.computeTileBadges(updated, targetBytes);
        });
        continue;
      }

      try {
        if (imageAdapter && typeof imageAdapter.encodeVariantForComparison === 'function') {
          const encoded = await imageAdapter.encodeVariantForComparison(job.file, fmt, quality, maxWidth);
          const previewUrl = URL.createObjectURL(encoded.blob);
          const origSize = job.file.size;
          const delta = origSize > 0 ? Math.round(((encoded.size - origSize) / origSize) * 100) : 0;
          const sizeFormatted = this.comparisonService.formatBytes(encoded.size);

          const tileResult: FormatTileResult = {
            format: fmt,
            label: fmt.toUpperCase(),
            loading: false,
            blob: encoded.blob,
            previewUrl,
            sizeBytes: encoded.size,
            sizeFormatted,
            deltaPercent: delta,
            isSmallest: false,
            fitsTarget: false
          };

          this.comparisonService.setCachedTile(cacheKey, tileResult);

          this.comparisonTiles.update(list => {
            const updated = list.map(t => t.format === fmt ? tileResult : t);
            return this.comparisonService.computeTileBadges(updated, targetBytes);
          });
        }
      } catch (_) {
        this.comparisonTiles.update(list => {
          return list.map(t => t.format === fmt ? {
            ...t,
            loading: false,
            unsupported: true,
            unsupportedReason: 'Encoding failed for this format'
          } : t);
        });
      }
    }

    this.isComparisonLoading.set(false);
  }

  closeComparisonModal(): void {
    this.comparisonModalJobId.set(null);
  }

  selectComparisonFormat(format: string): void {
    this.selectTargetFormat(format);
    this.closeComparisonModal();
    this.showToast('success', `Selected ${format.toUpperCase()} as conversion target.`);
  }

  readonly isImageConverterMode = computed(() => {
    if (typeof window === 'undefined') return true;
    const host = window.location.hostname.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    return host.includes('image-converter') || host.includes('img-converter') ||
           path.includes('image-converter') || path.includes('img-converter');
  });

  readonly landingTitle = computed(() => {
    return this.isImageConverterMode() ? 'Image Converter' : 'File Converter';
  });

  readonly landingSubtitle = computed(() => {
    return this.isImageConverterMode()
      ? 'Convert your images to the format you need.'
      : 'Convert your files to the format you need.';
  });

  readonly rotatingWords = ['JPG', 'WEBP', 'PNG', 'AVIF', 'HEIC'];

  readonly popularGroups: { source: string; target: string }[][] = [
    // Group 1: 3 x 2 grid of pill buttons (Explicitly requested)
    [
      { source: 'png', target: 'jpg' },
      { source: 'jpg', target: 'webp' },
      { source: 'png', target: 'webp' },
      { source: 'heic', target: 'jpg' },
      { source: 'avif', target: 'png' },
      { source: 'webp', target: 'png' }
    ],
    // Group 2: Modern & High-Efficiency Image Formats
    [
      { source: 'svg', target: 'png' },
      { source: 'dng', target: 'jpg' },
      { source: 'tiff', target: 'jpg' },
      { source: 'jxl', target: 'webp' },
      { source: 'gif', target: 'webp' },
      { source: 'bmp', target: 'png' }
    ],
    // Group 3: Creative & Professional Design Formats
    [
      { source: 'psd', target: 'png' },
      { source: 'ai', target: 'svg' },
      { source: 'eps', target: 'svg' },
      { source: 'cdr', target: 'svg' },
      { source: 'apng', target: 'webp' },
      { source: 'raw', target: 'jpg' }
    ]
  ];

  readonly currentGroupIndex = signal<number>(0);
  readonly previousGroupIndex = signal<number | null>(null);
  private popularTimer: any = null;
  private popularAnimTimer: any = null;
  private isPopularPaused = false;
  readonly isHeadlineHovered = signal<boolean>(false);
  readonly isReducedMotion = signal<boolean>(false);

  // Global & Page Drag-and-Drop state
  private dragCounter = 0;
  readonly isPageDragOver = signal<boolean>(false);
  readonly isHeaderScrolled = signal<boolean>(false);
  private scrollCleanups: (() => void)[] = [];

  readonly quickFormats = ['webp', 'jpg', 'png', 'avif', 'gif', 'pdf'];

  readonly popularPairs = computed<{ source: string; target: string }[]>(() => {
    return this.popularGroups[0];
  });

  readonly isLandingDragOver = signal<boolean>(false);
  readonly isMobileSettingsSheetOpen = signal<boolean>(false);
  private sheetTouchStartY = 0;

  openMobileSettingsSheet(): void {
    this.isMobileSettingsSheetOpen.set(true);
  }

  closeMobileSettingsSheet(): void {
    this.isMobileSettingsSheetOpen.set(false);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024 && this.isMobileSettingsSheetOpen()) {
      this.isMobileSettingsSheetOpen.set(false);
    }
  }

  onSheetTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      this.sheetTouchStartY = event.touches[0].clientY;
    }
  }

  onSheetTouchEnd(event: TouchEvent): void {
    if (event.changedTouches.length === 1) {
      const deltaY = event.changedTouches[0].clientY - this.sheetTouchStartY;
      if (deltaY > 75) {
        this.closeMobileSettingsSheet();
      }
    }
  }
  readonly isFormatDropdownOpen = signal<boolean>(false);

  readonly hasImageJobs = computed(() => {
    const jobs = this.engine.jobs();
    return jobs.some(j => {
      const cat = j.detectedFormat.category;
      return cat === 'image' || cat === 'graphics' || cat === 'modern-image';
    });
  });

  readonly fileCategoryLabel = computed(() => {
    return this.hasImageJobs() ? 'Images' : 'Files';
  });

  readonly acceptTypes = computed(() => {
    const pair = this.conversionPair();
    if (pair) {
      const src = pair.source.toLowerCase();
      switch (src) {
        case 'png': return 'image/png,.png';
        case 'jpg':
        case 'jpeg': return 'image/jpeg,.jpg,.jpeg';
        case 'webp': return 'image/webp,.webp';
        case 'avif': return 'image/avif,.avif';
        case 'heic': return '.heic,.heif';
        case 'svg': return 'image/svg+xml,.svg';
        case 'srt': return '.srt,text/plain';
        case 'vtt': return '.vtt,text/vtt';
        case 'vcf': return '.vcf,text/vcard';
        case 'csv': return '.csv,text/csv';
        case 'epub': return '.epub';
        case 'odt': return '.odt';
        case 'mov': return 'video/quicktime,.mov';
        case 'mp4': return 'video/mp4,.mp4';
        default: return `.${src}`;
      }
    }
    return 'image/*,.png,.jpg,.jpeg,.webp,.avif,.heic,.heif,.jxl,.tiff,.tif,.psd,.psb,.svg,.eps,.ai,.cdr,.cmx,.kra,.idml,.dxf,.dwg,.wmf,.emf,.cgm,.ico,.icns,.raw,.dng,.cr2,.cr3,.nef,.arw,.raf,.orf,.rw2,.pef,.jp2,.j2k,.tga,.dds,.pcx,.pnm,.pbm,.pgm,.ppm,.hdr,.fits,.fit,.bmp,.gif,.srt,.vtt,.vcf,.csv';
  });

  readonly activeWarnings = computed(() => {
    const jobs = this.engine.jobs();
    const map = new Map<string, { type: string; title: string; message: string }>();
    for (const j of jobs) {
      if (j.warnings && j.warnings.length > 0) {
        for (const w of j.warnings) {
          if (!map.has(w.type)) {
            map.set(w.type, w);
          }
        }
      }
    }
    return Array.from(map.values());
  });

  readonly availableTargetOptions = computed<DeduplicatedTargetFormat[]>(() => {
    const jobs = this.engine.jobs();
    const validJobs = jobs.filter(j => j.status !== 'error' && j.availableOutputs.length > 0);
    const allDeduplicated = this.capabilityRegistry.getDeduplicatedTargetFormats();

    if (validJobs.length === 0) {
      return allDeduplicated;
    }

    const allCompatibleFormats = new Set<string>();
    for (const j of validJobs) {
      for (const out of j.availableOutputs) {
        allCompatibleFormats.add(this.capabilityRegistry.resolveCanonicalFormat(out.format));
      }
    }

    return allDeduplicated.filter(item => allCompatibleFormats.has(item.format));
  });

  readonly popularQuickPicks = computed(() => {
    return ['webp', 'jpg', 'png', 'svg', 'gif', 'avif', 'tiff', 'ico', 'pdf', 'bmp'];
  });

  readonly displayedQuickPills = computed(() => {
    const popular = this.popularQuickPicks();

    const labelMap: Record<string, string> = {
      webp: 'WebP',
      jpg: 'JPG',
      png: 'PNG',
      svg: 'SVG',
      gif: 'GIF',
      avif: 'AVIF',
      tiff: 'TIFF',
      ico: 'ICO',
      pdf: 'PDF',
      bmp: 'BMP'
    };

    return popular.map(p => ({
      format: p,
      label: labelMap[p] || p.toUpperCase()
    }));
  });

  readonly selectedDropdownCategory = signal<string>('raster-web');

  readonly dropdownCategories = computed<{ id: string; name: string; description: string }[]>(() => {
    return this.capabilityRegistry.getPurposeCategories();
  });

  readonly displayedGridFormats = computed<DeduplicatedTargetFormat[]>(() => {
    const query = this.formatSearchQuery().trim().toLowerCase();
    const allOptions = this.availableTargetOptions();

    if (query) {
      // Cross-category instant format search
      return allOptions.filter(opt => {
        const fmt = opt.format.toLowerCase();
        const label = opt.label.toLowerCase();
        const ext = opt.extensions.toLowerCase();
        const desc = opt.description.toLowerCase();
        return fmt.includes(query) || label.includes(query) || ext.includes(query) || desc.includes(query);
      });
    }

    const cat = this.selectedDropdownCategory();
    return allOptions.filter(opt => opt.category === cat);
  });

  getCategoryFormatCount(categoryId: string): number {
    return this.availableTargetOptions().filter(opt => opt.category === categoryId).length;
  }

  getSelectedCategoryName(): string {
    const cat = this.dropdownCategories().find(c => c.id === this.selectedDropdownCategory());
    return cat ? cat.name : 'Formats';
  }

  getFormatPillLabel(opt: DeduplicatedTargetFormat): string {
    if (opt.format === 'jpg') return 'JPG';
    if (opt.format === 'tiff') return 'TIFF';
    if (opt.format === 'ppm') return 'PPM';
    return opt.format.toUpperCase();
  }

  getShortSelectedTargetLabel(): string {
    if (this.engine.conversionMode() === 'CUSTOM') return 'CUSTOM';
    const opt = this.currentSelectedTargetOption();
    if (!opt) return 'WebP';
    if (opt.format === 'webp') return 'WebP';
    if (opt.format === 'jpg') return 'JPG';
    if (opt.format === 'tiff') return 'TIFF / TIF';
    return opt.format.toUpperCase();
  }

  readonly categorizedFormats = computed<{ id: string; name: string; formats: DeduplicatedTargetFormat[] }[]>(() => {
    const cats = this.dropdownCategories();
    const all = this.availableTargetOptions();
    return cats.map(c => ({
      id: c.id,
      name: c.name,
      formats: all.filter(f => f.category === c.id)
    })).filter(g => g.formats.length > 0);
  });

  isFormatSelected(formatStr: string): boolean {
    if (this.engine.conversionMode() === 'CUSTOM') return false;
    const current = this.engine.batchTargetFormat().toLowerCase();
    const canonical = this.capabilityRegistry.resolveCanonicalFormat(current);
    return formatStr.toLowerCase() === current || formatStr.toLowerCase() === canonical;
  }

  setConversionMode(mode: 'GLOBAL' | 'CUSTOM'): void {
    if (mode === 'CUSTOM') {
      this.engine.setBatchTargetFormat('custom');
      this.showToast('info', 'Custom Mode active: individual format per image', 2500);
    } else {
      const current = this.engine.batchTargetFormat().toLowerCase();
      const preferred = (current !== 'custom' && current) ? current : (this.availableTargetOptions()[0]?.format || 'webp');
      this.engine.setBatchTargetFormat(preferred);
      this.showToast('info', `Global Mode active: all set to ${preferred.toUpperCase()}`, 2500);
    }
  }

  readonly currentSelectedTargetOption = computed(() => {
    if (this.engine.conversionMode() === 'CUSTOM') {
      return {
        format: 'custom',
        label: 'Custom',
        extensions: 'Per image',
        category: 'custom',
        description: 'Individual format selected per image'
      };
    }
    const target = this.capabilityRegistry.resolveCanonicalFormat(this.engine.batchTargetFormat().toLowerCase());
    const opts = this.availableTargetOptions();
    return opts.find(o => o.format === target) || opts[0];
  });

  constructor() {
    try {
      // 1. Consume any files transferred via global drop or cross-navigation
      effect(() => {
        const pending = this.fileTransfer.consumePendingFiles();
        if (pending.length > 0) {
          this.engine.addFiles(pending);
        }
      }, { allowSignalWrites: true });

      // 2. Keep batchTargetFormat synchronized with available options
      effect(() => {
        const options = this.availableTargetOptions();
        const current = this.engine.batchTargetFormat();
        if (options.length > 0 && !options.some(o => o.format === current)) {
          const preferred = options[0]?.format || 'webp';
          this.engine.setBatchTargetFormat(preferred);
        }
      }, { allowSignalWrites: true });

      // 3. Automatically show batch limit warnings as non-intrusive 3-second toasts
      effect(() => {
        const note = this.engine.batchNotification();
        if (note) {
          this.showToast('info', note, 3000);
          this.engine.batchNotification.set(null);
        }
      }, { allowSignalWrites: true });
    } catch (_) {
      // Graceful fallback for unit testing environments without EffectScheduler
    }

    // 4. Parse conversion pair from URL if present
    this.initRoutePreselection();
  }

  ngOnInit(): void {
    this.consumePendingFiles();

    if (typeof window !== 'undefined') {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.isReducedMotion.set(media.matches);
      if (!media.matches) {
        this.startPopularCycle();
      }

      // Track scroll to apply blur background to sticky header only when scrolled
      const onScroll = () => {
        const sc = document.querySelector('.ts-main-scroll-container');
        const st = sc ? sc.scrollTop : (window.scrollY || document.documentElement.scrollTop || 0);
        const scrolled = st > 6;
        if (this.isHeaderScrolled() !== scrolled) {
          this.isHeaderScrolled.set(scrolled);
          this.cdr.markForCheck();
        }
      };

      // Check on animation frames or when DOM container becomes available
      setTimeout(() => {
        const sc = document.querySelector('.ts-main-scroll-container');
        if (sc) {
          sc.addEventListener('scroll', onScroll, { passive: true });
          this.scrollCleanups.push(() => sc.removeEventListener('scroll', onScroll));
          onScroll();
        }
      }, 50);

      window.addEventListener('scroll', onScroll, { capture: true, passive: true });
      this.scrollCleanups.push(() => window.removeEventListener('scroll', onScroll, { capture: true }));
    }
  }

  private startPopularCycle(): void {
    this.stopPopularCycle();
    this.popularTimer = setInterval(() => {
      if (this.isPopularPaused) return;

      const prev = this.currentGroupIndex();
      const next = (prev + 1) % this.popularGroups.length;

      this.previousGroupIndex.set(prev);
      this.currentGroupIndex.set(next);

      if (this.popularAnimTimer) clearTimeout(this.popularAnimTimer);
      this.popularAnimTimer = setTimeout(() => {
        this.previousGroupIndex.set(null);
      }, 1000); // 1000ms duration matching ease-in-out crossfade
    }, 3000); // 3-second interval matching hero rotating word
  }

  private stopPopularCycle(): void {
    if (this.popularTimer) {
      clearInterval(this.popularTimer);
      this.popularTimer = null;
    }
    if (this.popularAnimTimer) {
      clearTimeout(this.popularAnimTimer);
      this.popularAnimTimer = null;
    }
  }

  ngOnDestroy(): void {
    this.stopPopularCycle();
    this.scrollCleanups.forEach(fn => fn());
    this.scrollCleanups = [];
  }

  onPopularMouseEnter(): void { this.isPopularPaused = true; }
  onPopularMouseLeave(): void { this.isPopularPaused = false; }
  onPopularFocusIn(): void { this.isPopularPaused = true; }
  onPopularFocusOut(): void { this.isPopularPaused = false; }

  consumePendingFiles(): void {
    const pending = this.fileTransfer.consumePendingFiles();
    if (pending.length > 0) {
      this.engine.addFiles(pending);
    }
  }

  private initRoutePreselection(): void {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname.toLowerCase();
    const match = path.match(/\/convert\/([a-z0-9]+)-to-([a-z0-9]+)/);
    if (match) {
      const pair: ConversionPair = { source: match[1], target: match[2] };
      this.conversionPair.set(pair);
      this.engine.setBatchTargetFormat(pair.target);
      document.title = `${pair.source.toUpperCase()} to ${pair.target.toUpperCase()} Converter | Acklet`;
    } else {
      document.title = 'File Converter | Acklet';
    }
  }

  openFilePicker(): void {
    if (this.workspaceFileInput?.nativeElement) {
      this.workspaceFileInput.nativeElement.click();
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = this.acceptTypes();
      input.onchange = () => {
        if (input.files && input.files.length > 0) {
          this.onFilesDropped(Array.from(input.files));
        }
      };
      input.click();
    }
  }

  async onWorkspaceFileChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      await this.engine.addFiles(input.files);
      input.value = '';
      this.checkAndNotifyFileErrors();
    }
  }

  @HostListener('window:paste', ['$event'])
  async onWindowPaste(event: ClipboardEvent): Promise<void> {
    const items = event.clipboardData?.items;
    if (!items) return;

    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) {
          pastedFiles.push(file);
        }
      }
    }

    if (pastedFiles.length > 0) {
      await this.engine.addFiles(pastedFiles);
      this.checkAndNotifyFileErrors();
    }
  }

  private lastDropTimestamp = 0;

  async onFilesDropped(files: FileList | File[]): Promise<void> {
    const now = Date.now();
    if (now - this.lastDropTimestamp < 350) {
      return; // Deduplicate concurrent drop emissions from nested drop zones or global shell
    }
    this.lastDropTimestamp = now;

    // Immediately consume any pending files from fileTransfer service so effect doesn't duplicate
    this.fileTransfer.consumePendingFiles();

    await this.engine.addFiles(files);
    this.checkAndNotifyFileErrors();
  }

  private checkAndNotifyFileErrors(): void {
    const jobs = this.engine.jobs();
    const errorJob = jobs.find(j => j.status === 'error');
    if (errorJob) {
      const isUnsupported = errorJob.errorMessage?.toLowerCase().includes('unsupported') ||
                            errorJob.detectedFormat.format === 'unknown';
      this.showToast('error', isUnsupported ? 'Unsupported image format.' : (errorJob.errorMessage || 'Failed to inspect image file.'));
    }
  }

  @HostListener('dragenter', ['$event'])
  onPageDragEnter(event: DragEvent): void {
    if (event.dataTransfer?.types?.includes('Files')) {
      this.dragCounter++;
      this.isPageDragOver.set(true);
    }
  }

  @HostListener('dragover', ['$event'])
  onPageDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
    this.isPageDragOver.set(true);
  }

  @HostListener('dragleave', ['$event'])
  onPageDragLeave(event: DragEvent): void {
    this.dragCounter--;
    if (this.dragCounter <= 0) {
      this.dragCounter = 0;
      this.isPageDragOver.set(false);
      this.isLandingDragOver.set(false);
    }
  }

  @HostListener('drop', ['$event'])
  onPageDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragCounter = 0;
    this.isPageDragOver.set(false);
    this.isLandingDragOver.set(false);
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.onFilesDropped(event.dataTransfer.files);
    }
  }

  onLandingDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
    this.isLandingDragOver.set(true);
  }

  onLandingDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isLandingDragOver.set(false);
  }

  onLandingDrop(event: DragEvent): void {
    event.preventDefault();
    this.isLandingDragOver.set(false);
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.onFilesDropped(event.dataTransfer.files);
    }
  }

  onSelectPopularPair(pair: { source: string; target: string }): void {
    this.conversionPair.set(pair);
    this.engine.setBatchTargetFormat(pair.target);
    this.openFilePicker();
  }

  onBatchTargetChange(format: string): void {
    this.engine.setBatchTargetFormat(format);
  }

  toggleFormatDropdown(): void {
    this.isFormatDropdownOpen.update(v => !v);
    if (this.isFormatDropdownOpen()) {
      this.formatSearchQuery.set('');
      this.isResizeDropdownOpen.set(false);
      this.formatSearchQuery.set('');
      const current = this.capabilityRegistry.resolveCanonicalFormat(this.engine.batchTargetFormat().toLowerCase());
      const match = this.capabilityRegistry.getDeduplicatedTargetFormats().find(o => o.format === current);
      if (match) {
        this.selectedDropdownCategory.set(match.category);
      } else {
        this.selectedDropdownCategory.set('raster-web');
      }
    } else {
      this.formatSearchQuery.set('');
    }
  }

  selectDropdownCategory(categoryId: string): void {
    this.selectedDropdownCategory.set(categoryId);
    this.formatSearchQuery.set('');
  }

  selectTargetFormat(format: string): void {
    this.onBatchTargetChange(format);
    this.isFormatDropdownOpen.set(false);
    this.formatSearchQuery.set('');
    if (format.toLowerCase() === 'custom') {
      this.showToast('info', 'Custom Mode enabled: customize format per image', 2500);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.isFormatDropdownOpen() && !target.closest('.target-format-control-card')) {
      this.isFormatDropdownOpen.set(false);
      this.formatSearchQuery.set('');
    }
    if (this.isResizeDropdownOpen() && !target.closest('.resize-dropdown-wrapper')) {
      this.isResizeDropdownOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.isFormatDropdownOpen.set(false);
    this.isResizeDropdownOpen.set(false);
    this.formatSearchQuery.set('');
  }

  private qualityDebounceTimer: any = null;

  onBatchQualityChange(quality: number): void {
    if (this.qualityDebounceTimer) {
      clearTimeout(this.qualityDebounceTimer);
      this.qualityDebounceTimer = null;
    }
    this.engine.setBatchQuality(quality);
  }

  onQualitySliderInput(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    if (!isNaN(val)) {
      const clamped = Math.max(10, Math.min(100, Math.round(val)));
      const q = clamped / 100;
      this.engine.batchQuality.set(q); // Instantly update visual slider readout, fill line, and preview
      if (this.qualityDebounceTimer) {
        clearTimeout(this.qualityDebounceTimer);
      }
      this.qualityDebounceTimer = setTimeout(() => {
        this.engine.setBatchQuality(q);
      }, 300);
    }
  }

  isPresetActive(val: number): boolean {
    return Math.abs(this.engine.batchQuality() - val) < 0.015;
  }

  onBatchResizeChange(maxWidth?: number): void {
    this.engine.setBatchResize(maxWidth);
    if (!maxWidth) {
      this.customHeight.set(undefined);
    } else if (this.lockAspectRatio()) {
      const first = this.engine.jobs().find(j => j.originalDimensions);
      if (first?.originalDimensions) {
        const h = Math.round(maxWidth * (first.originalDimensions.height / first.originalDimensions.width));
        this.customHeight.set(h);
      }
    }
  }

  getQualityLabel(val: number): string {
    const opt = this.qualityOptions.find(q => q.value === val);
    return opt ? opt.badge : `${Math.round(val * 100)}%`;
  }

  async onConvertJob(jobId: string): Promise<void> {
    await this.engine.convertJob(jobId);
    const job = this.engine.jobs().find(j => j.id === jobId);
    if (job?.status === 'completed') {
      this.showToast('success', 'Image converted successfully.');
    } else if (job?.status === 'error') {
      this.showToast('error', job.errorMessage || 'Conversion failed. Please try again.');
    }
  }

  async onConvertAll(): Promise<void> {
    this.closeMobileSettingsSheet();
    const readyCount = this.engine.readyJobsCount();
    if (readyCount === 0) return;
    await this.engine.convertAll();
    const completed = this.engine.completedCount();
    const errors = this.engine.errorCount();

    if (errors === 0 && completed > 0) {
      this.showToast('success', readyCount > 1 ? `All ${completed} files converted successfully.` : 'File converted successfully.');
    } else if (errors > 0 && completed === 0) {
      this.showToast('error', 'Conversion failed. Please try again.');
    } else if (errors > 0 && completed > 0) {
      this.showToast('info', `Converted ${completed} files. ${errors} failed.`);
    }
  }

  onCancelJob(jobId: string): void {
    this.engine.cancelJob(jobId);
  }

  onRemoveJob(jobId: string): void {
    this.engine.removeJob(jobId);
  }

  onDownloadJob(jobId: string): void {
    this.engine.downloadJobResult(jobId);
  }

  onFormatChanged(event: { jobId: string; format: FormatDescriptor }): void {
    const wasGlobal = this.engine.conversionMode() === 'GLOBAL';
    this.engine.setTargetFormat(event.jobId, event.format);
    if (wasGlobal) {
      this.showToast('info', 'Switched to Custom Mode (file format updated)', 2500);
    }
  }

  onPreviewRequested(job: ConversionJob): void {
    this.previewModalJobId.set(job.id);
  }

  closePreviewModal(): void {
    this.previewModalJobId.set(null);
  }

  onRenameJob(jobId: string, newBaseName: string): void {
    this.engine.renameJob(jobId, newBaseName);
    this.showToast('info', `Renamed file to "${newBaseName}"`, 2000);
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }

  formatFileSize(bytes: number): string {
    return this.formatBytes(bytes);
  }
}

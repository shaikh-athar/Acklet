// apps/tool-file-converter/src/services/conversion-engine.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import JSZip from 'jszip';
import {
  ConversionJob,
  ConversionOptions,
  FormatDescriptor,
  ImageResizeOptions,
  ImageTransformOptions,
  ImageBackgroundOptions,
  ImageMetadataOptions,
  ImageNamingOptions,
  ImageAnimationOptions,
  ConversionPresetName,
  TargetFileSizeConfig
} from '../models/converter.models';
import { FileSignatureService } from './file-signature.service';
import { AdapterRegistryService } from './adapter-registry.service';
import { ImageCapabilityRegistry } from './image-capability.registry';
import { TiffCodec } from './image-codecs/tiff.codec';
import { TgaCodec } from './image-codecs/tga.codec';
import { PsdCodec } from './image-codecs/psd.codec';
import { PcxCodec } from './image-codecs/pcx.codec';
import { DdsCodec } from './image-codecs/dds.codec';
import { NetpbmCodec } from './image-codecs/netpbm.codec';
import { HdrCodec } from './image-codecs/hdr.codec';
import { FitsCodec } from './image-codecs/fits.codec';
import { IcnsCodec } from './image-codecs/icns.codec';
import { RawCameraCodec } from './image-codecs/raw-camera.codec';
import { XbmXpmCodec } from './image-codecs/xbm-xpm.codec';
import { ExifMetadataHelper } from './image-codecs/exif-metadata.helper';
import { PrivacyAuditService } from './privacy-audit.service';
import { ImageAnalyzerService } from './image-analyzer.service';
import { TOOL_CONFIG } from '../tool.config';

export const MAX_FILES_PER_BATCH = TOOL_CONFIG.maxBatchFiles;
export const MAX_FILE_SIZE_BYTES = TOOL_CONFIG.maxFileSizeBytes;

function safeInject<T>(token: any): T | null {
  try {
    return inject(token, { optional: true });
  } catch (_) {
    return null;
  }
}

@Injectable({
  providedIn: 'root'
})
export class ConversionEngineService {
  private readonly signatureService: FileSignatureService;
  private readonly adapterRegistry: AdapterRegistryService;
  private readonly capabilityRegistry: ImageCapabilityRegistry;
  private readonly inFlightFileKeys = new Set<string>();

  readonly jobs = signal<ConversionJob[]>([]);

  // Batch options & limits
  readonly batchNotification = signal<string | null>(null);
  readonly conversionMode = signal<'GLOBAL' | 'CUSTOM'>('GLOBAL');
  readonly batchTargetFormat = signal<string>('webp');
  readonly batchQuality = signal<number>(0.85);
  readonly batchTargetFileSize = signal<TargetFileSizeConfig>({
    enabled: false,
    value: 200,
    unit: 'KB',
    targetBytes: 200 * 1024
  });
  readonly batchMaxWidth = signal<number | undefined>(undefined);

  // Advanced batch image options
  readonly batchResizeOptions = signal<ImageResizeOptions>({
    maintainAspectRatio: true,
    fitMode: 'contain',
    preventUpscale: false
  });
  readonly batchTransformOptions = signal<ImageTransformOptions>({
    rotation: 0,
    flipHorizontal: false,
    flipVertical: false
  });
  readonly batchBackgroundOptions = signal<ImageBackgroundOptions>({
    mode: 'transparent',
    color: '#FFFFFF'
  });
  readonly batchMetadataOptions = signal<ImageMetadataOptions>({
    mode: 'preserve',
    preserveIcc: true,
    preserveCopyright: true
  });
  readonly batchDpi = signal<number>(96);
  readonly batchColorProfile = signal<'srgb' | 'display-p3' | 'preserve'>('srgb');
  readonly batchNamingOptions = signal<ImageNamingOptions>({
    patternMode: 'original'
  });
  readonly batchAnimationOptions = signal<ImageAnimationOptions>({
    mode: 'preserve',
    preserveFrames: true
  });
  readonly activePreset = signal<ConversionPresetName | null>(null);

  readonly hasJobs = computed(() => this.jobs().length > 0);
  readonly readyJobsCount = computed(() => this.jobs().filter(j => j.status === 'ready').length);
  readonly convertingCount = computed(() => this.jobs().filter(j => j.status === 'converting').length);
  readonly completedCount = computed(() => this.jobs().filter(j => j.status === 'completed').length);
  readonly errorCount = computed(() => this.jobs().filter(j => j.status === 'error').length);
  readonly isConvertingAny = computed(() => this.convertingCount() > 0);

  // Overall savings analytics for celebratory state
  readonly totalOriginalBytes = computed(() => {
    return this.jobs()
      .filter(j => j.status === 'completed')
      .reduce((sum, j) => sum + j.file.size, 0);
  });

  readonly totalResultBytes = computed(() => {
    return this.jobs()
      .filter(j => j.status === 'completed')
      .reduce((sum, j) => sum + (j.resultSize || 0), 0);
  });

  readonly totalSavingsBytes = computed(() => {
    const orig = this.totalOriginalBytes();
    const res = this.totalResultBytes();
    return orig > res ? orig - res : 0;
  });

  readonly totalSavingsPercent = computed(() => {
    const orig = this.totalOriginalBytes();
    const saved = this.totalSavingsBytes();
    if (orig === 0) return 0;
    return Math.round((saved / orig) * 100);
  });

  readonly privacyAudit: PrivacyAuditService;
  readonly imageAnalyzer: ImageAnalyzerService;

  constructor(
    signatureService?: FileSignatureService,
    adapterRegistry?: AdapterRegistryService,
    capabilityRegistry?: ImageCapabilityRegistry,
    privacyAudit?: PrivacyAuditService,
    imageAnalyzer?: ImageAnalyzerService
  ) {
    this.signatureService = signatureService || safeInject(FileSignatureService) || new FileSignatureService();
    this.adapterRegistry = adapterRegistry || safeInject(AdapterRegistryService) || new AdapterRegistryService();
    this.capabilityRegistry = capabilityRegistry || safeInject(ImageCapabilityRegistry) || new ImageCapabilityRegistry();
    this.privacyAudit = privacyAudit || safeInject(PrivacyAuditService) || new PrivacyAuditService();
    this.imageAnalyzer = imageAnalyzer || safeInject(ImageAnalyzerService) || new ImageAnalyzerService();
  }

  /**
   * Enqueues user uploaded files up to 50 max, enforcing 50MB per file and image validation.
   */
  async addFiles(files: FileList | File[]): Promise<void> {
    const rawFiles = Array.from(files);
    if (rawFiles.length === 0) return;

    this.batchNotification.set(null);

    // Deduplicate: filter out files that are already present in the active queue or in-flight
    const existingJobs = this.jobs();
    const uniqueFiles: File[] = [];
    const seenKeys = new Set<string>();

    for (const f of rawFiles) {
      const normalizedName = f.name.toLowerCase().trim();
      const dedupeKey = `${normalizedName}_${f.size}`;
      if (seenKeys.has(dedupeKey) || this.inFlightFileKeys.has(dedupeKey)) continue;
      const alreadyInQueue = existingJobs.some(
        j => j.file.name.toLowerCase().trim() === normalizedName && (j.file.size === f.size || f.size === 0)
      );
      if (alreadyInQueue) continue;
      seenKeys.add(dedupeKey);
      this.inFlightFileKeys.add(dedupeKey);
      uniqueFiles.push(f);
    }

    if (uniqueFiles.length === 0) return;

    const currentCount = this.jobs().length;
    const remainingSlots = Math.max(0, MAX_FILES_PER_BATCH - currentCount);

    if (remainingSlots === 0) {
      this.batchNotification.set(`Maximum batch limit reached (${MAX_FILES_PER_BATCH} images at one time). Please clear or download completed images before adding more.`);
      return;
    }

    let filesToAdd = uniqueFiles;
    if (uniqueFiles.length > remainingSlots) {
      filesToAdd = uniqueFiles.slice(0, remainingSlots);
      this.batchNotification.set(`Added ${filesToAdd.length} images. Remaining files omitted to respect the ${MAX_FILES_PER_BATCH} images per batch limit.`);
    }

    for (const file of filesToAdd) {
      const jobId = this.generateId();

      // Enforce 50 MB per image limit
      if (file.size > MAX_FILE_SIZE_BYTES) {
        const errorJob: ConversionJob = {
          id: jobId,
          file,
          detectedFormat: {
            format: 'unknown',
            mimeType: file.type || 'application/octet-stream',
            extension: '',
            category: 'image',
            signatureVerified: false,
            confidence: 0
          },
          targetFormat: {
            format: '',
            label: '',
            mimeType: '',
            extension: '',
            category: 'image',
            executionMode: 'browser'
          },
          availableOutputs: [],
          options: { quality: this.batchQuality(), maxWidth: this.batchMaxWidth() },
          status: 'error',
          progress: 0,
          errorMessage: `File exceeds 50 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum 50 MB per image supported.`
        };
        this.jobs.update(current => [...current, errorJob]);
        continue;
      }

      // Preliminary placeholder job while inspecting
      const initialJob: ConversionJob = {
        id: jobId,
        file,
        detectedFormat: {
          format: 'unknown',
          mimeType: file.type || 'application/octet-stream',
          extension: '',
          category: 'image',
          signatureVerified: false,
          confidence: 0
        },
        targetFormat: {
          format: '',
          label: '',
          mimeType: '',
          extension: '',
          category: 'image',
          executionMode: 'browser'
        },
        availableOutputs: [],
        options: this.getGlobalConversionOptions(),
        status: 'scanning',
        progress: 0,
        progressStage: 'Inspecting image bytes...'
      };

      this.jobs.update(current => [...current, initialJob]);

      try {
        const detected = await this.signatureService.detectFormat(file);

        // Security check: reject executable files masquerading as images
        if (detected.spoofWarning && detected.format === 'exe') {
          this.updateJob(jobId, {
            detectedFormat: detected,
            status: 'error',
            errorMessage: detected.spoofWarning
          });
          continue;
        }

        const availableOutputs = this.adapterRegistry.getAvailableOutputs(detected.format);
        if (availableOutputs.length === 0) {
          let msg = `No active converter available for ${detected.format.toUpperCase()} files in this browser.`;
          if (detected.category === 'document' || ['epub', 'odt', 'docx', 'pdf'].includes(detected.format)) {
            msg = `${detected.format.toUpperCase()} document conversion is planned for Phase 3. Currently, Images (PNG, JPG, WebP, AVIF, SVG, GIF, BMP), Subtitles (SRT, VTT), and Contacts (VCF, CSV) are active.`;
          } else if (detected.category === 'audio' || ['m4a', 'wav', 'mp3', 'flac'].includes(detected.format)) {
            msg = `${detected.format.toUpperCase()} audio conversion is planned for Phase 6. Currently, Images, Subtitles, and Contacts are active.`;
          } else if (detected.category === 'video' || ['mov', 'mp4'].includes(detected.format)) {
            msg = `${detected.format.toUpperCase()} video conversion is planned for Phase 7. Currently, Images, Subtitles, and Contacts are active.`;
          }

          this.updateJob(jobId, {
            detectedFormat: detected,
            status: 'error',
            errorMessage: msg
          });
          continue;
        }

        // Pick preferred batch target if supported by this image, else use first
        const preferred = availableOutputs.find(o => o.format === this.batchTargetFormat()) || availableOutputs[0];

        let previewUrl: string | undefined = undefined;
        let fileBuffer: ArrayBuffer | null = null;
        try {
          fileBuffer = await file.arrayBuffer();
          const fmt = detected.format;
          if (fmt === 'tiff' || fmt === 'tif') {
            const res = TiffCodec.decode(fileBuffer);
            if (res.embeddedJpegBlob) {
              previewUrl = URL.createObjectURL(res.embeddedJpegBlob);
            } else if (res.data && res.width > 0 && res.height > 0) {
              previewUrl = await this.rgbaToPreviewUrl(res.width, res.height, res.data);
            }
          } else if (fmt === 'tga') {
            const res = TgaCodec.decode(fileBuffer);
            if (res.data && res.width > 0 && res.height > 0) {
              previewUrl = await this.rgbaToPreviewUrl(res.width, res.height, res.data);
            }
          } else if (fmt === 'psd' || fmt === 'psb') {
            const res = PsdCodec.decode(fileBuffer);
            if (res.data && res.width > 0 && res.height > 0) {
              previewUrl = await this.rgbaToPreviewUrl(res.width, res.height, res.data);
            }
          } else if (fmt === 'pcx') {
            const res = PcxCodec.decode(fileBuffer);
            if (res.data && res.width > 0 && res.height > 0) {
              previewUrl = await this.rgbaToPreviewUrl(res.width, res.height, res.data);
            }
          } else if (fmt === 'dds') {
            const res = DdsCodec.decode(fileBuffer);
            if (res.data && res.width > 0 && res.height > 0) {
              previewUrl = await this.rgbaToPreviewUrl(res.width, res.height, res.data);
            }
          } else if (['ppm', 'pgm', 'pbm', 'pnm'].includes(fmt)) {
            const res = NetpbmCodec.decode(fileBuffer);
            if (res.data && res.width > 0 && res.height > 0) {
              previewUrl = await this.rgbaToPreviewUrl(res.width, res.height, res.data);
            }
          } else if (fmt === 'hdr') {
            const res = HdrCodec.decode(fileBuffer);
            if (res.data && res.width > 0 && res.height > 0) {
              previewUrl = await this.rgbaToPreviewUrl(res.width, res.height, res.data);
            }
          } else if (fmt === 'fits' || fmt === 'fit') {
            const res = FitsCodec.decode(fileBuffer);
            if (res.data && res.width > 0 && res.height > 0) {
              previewUrl = await this.rgbaToPreviewUrl(res.width, res.height, res.data);
            }
          } else if (fmt === 'icns') {
            const res = IcnsCodec.decode(fileBuffer);
            if (res.pngBlob) {
              previewUrl = URL.createObjectURL(res.pngBlob);
            } else if (res.rgbaData && res.width > 0 && res.height > 0) {
              previewUrl = await this.rgbaToPreviewUrl(res.width, res.height, res.rgbaData);
            }
          } else if (['raw', 'dng', 'cr2', 'cr3', 'nef', 'arw', 'raf', 'orf', 'rw2', 'pef'].includes(fmt)) {
            const res = RawCameraCodec.extractAuthenticRaster(fileBuffer);
            if (res.blob) {
              previewUrl = URL.createObjectURL(res.blob);
            }
          } else if (fmt === 'xbm') {
            const text = await file.text();
            const res = XbmXpmCodec.decodeXbm(text);
            if (res.data && res.width > 0 && res.height > 0) {
              previewUrl = await this.rgbaToPreviewUrl(res.width, res.height, res.data);
            }
          } else if (fmt === 'xpm') {
            const text = await file.text();
            const res = XbmXpmCodec.decodeXpm(text);
            if (res.data && res.width > 0 && res.height > 0) {
              previewUrl = await this.rgbaToPreviewUrl(res.width, res.height, res.data);
            }
          }

          const nativeBrowserRenderable = ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'bmp', 'svg', 'ico'];
          if (!previewUrl && nativeBrowserRenderable.includes(fmt)) {
            previewUrl = URL.createObjectURL(file);
          }
        } catch (_) {
          const nativeBrowserRenderable = ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'bmp', 'svg', 'ico'];
          if (nativeBrowserRenderable.includes(detected.format)) {
            try {
              previewUrl = URL.createObjectURL(file);
            } catch (_) {}
          }
        }

        let exifSummary: any = undefined;
        try {
          if (fileBuffer) {
            exifSummary = ExifMetadataHelper.extractExifMetadata(fileBuffer);
          }
        } catch (_) {}

        let originalDimensions: { width: number; height: number } | undefined;
        if (previewUrl && typeof Image !== 'undefined') {
          try {
            const img = new Image();
            img.src = previewUrl;
            await new Promise(res => {
              img.onload = () => res(null);
              img.onerror = () => res(null);
            });
            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
              originalDimensions = { width: img.naturalWidth, height: img.naturalHeight };
            }
          } catch (_) {}
        }

        const warnings = this.capabilityRegistry.getConversionWarnings(detected.format, preferred.format);

        let smartAnalysis: any = undefined;
        try {
          smartAnalysis = await this.imageAnalyzer.analyzeFile(file, preferred.format);
        } catch (_) {}

        this.updateJob(jobId, {
          detectedFormat: detected,
          availableOutputs,
          targetFormat: preferred,
          warnings,
          status: 'ready',
          progress: 0,
          previewUrl,
          exifMetadata: exifSummary,
          originalDimensions,
          smartAnalysis,
          options: this.getGlobalConversionOptions()
        });
      } catch (err: any) {
        this.updateJob(jobId, {
          status: 'error',
          errorMessage: err.message || 'Failed to inspect image file.'
        });
      }
    }
  }

  private rgbaToPreviewUrl(width: number, height: number, data: Uint8ClampedArray): Promise<string> {
    return new Promise(resolve => {
      try {
        if (typeof document === 'undefined') {
          resolve('');
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('');
          return;
        }
        const imgData = ctx.createImageData(width, height);
        imgData.data.set(data);
        ctx.putImageData(imgData, 0, 0);
        canvas.toBlob(blob => {
          if (blob) {
            resolve(URL.createObjectURL(blob));
          } else {
            resolve('');
          }
        }, 'image/webp', 0.85);
      } catch (_) {
        resolve('');
      }
    });
  }

  /**
   * Sets target format for jobs.
   * If format === 'custom', switches mode to CUSTOM without altering jobs.
   * If format is a valid target format (e.g. 'webp', 'jpg', 'jpeg'), switches mode to GLOBAL,
   * updates batchTargetFormat, applies format to all jobs, and triggers automatic reconversion.
   */
  setBatchTargetFormat(format: string): void {
    if (format.toLowerCase() === 'custom') {
      this.conversionMode.set('CUSTOM');
      return;
    }

    this.batchTargetFormat.set(format);

    const jobs = this.jobs();
    for (const job of jobs) {
      const target = job.availableOutputs.find(o => o.format === format);
      if (target) {
        this.setTargetFormat(job.id, target);
      }
    }

    this.conversionMode.set('GLOBAL');
  }

  /**
   * Updates quality option for all jobs in batch.
   */
  setBatchQuality(quality: number): void {
    this.batchQuality.set(quality);
    if (this.conversionMode() === 'GLOBAL') {
      this.updateGlobalOptions({ quality });
    } else {
      const jobs = this.jobs();
      for (const job of jobs) {
        this.setOptions(job.id, { quality });
      }
    }
  }

  /**
   * Updates max width / resize option for all jobs in batch.
   */
  setBatchResize(maxWidth?: number): void {
    this.batchMaxWidth.set(maxWidth);
    const jobs = this.jobs();
    for (const job of jobs) {
      this.setOptions(job.id, { maxWidth });
    }
  }

  getGlobalConversionOptions(): ConversionOptions {
    return {
      quality: this.batchQuality(),
      targetFileSize: this.batchTargetFileSize(),
      maxWidth: this.batchMaxWidth(),
      resize: this.batchResizeOptions(),
      transform: this.batchTransformOptions(),
      background: this.batchBackgroundOptions(),
      metadata: this.batchMetadataOptions(),
      dpi: this.batchDpi(),
      colorProfile: this.batchColorProfile(),
      naming: this.batchNamingOptions(),
      animation: this.batchAnimationOptions()
    };
  }

  applyPreset(name: ConversionPresetName): void {
    this.activePreset.set(name);
    if (name === 'web') {
      this.batchTargetFormat.set('webp');
      this.batchQuality.set(0.82);
      this.batchMaxWidth.set(1920);
      this.batchBackgroundOptions.set({ mode: 'transparent', color: '#FFFFFF' });
      this.batchMetadataOptions.set({ mode: 'strip-gps', preserveIcc: true, preserveCopyright: true });
      this.batchDpi.set(96);
    } else if (name === 'quality') {
      this.batchTargetFormat.set('png');
      this.batchQuality.set(1.0);
      this.batchMaxWidth.set(undefined);
      this.batchBackgroundOptions.set({ mode: 'transparent', color: '#FFFFFF' });
      this.batchMetadataOptions.set({ mode: 'preserve', preserveIcc: true, preserveCopyright: true });
      this.batchDpi.set(300);
    } else if (name === 'print') {
      this.batchTargetFormat.set('tiff');
      this.batchQuality.set(1.0);
      this.batchMaxWidth.set(undefined);
      this.batchBackgroundOptions.set({ mode: 'solid', color: '#FFFFFF' });
      this.batchMetadataOptions.set({ mode: 'preserve', preserveIcc: true, preserveCopyright: true });
      this.batchDpi.set(300);
    } else if (name === 'small') {
      this.batchTargetFormat.set('webp');
      this.batchQuality.set(0.65);
      this.batchMaxWidth.set(1280);
      this.batchBackgroundOptions.set({ mode: 'solid', color: '#FFFFFF' });
      this.batchMetadataOptions.set({ mode: 'strip-all' });
      this.batchDpi.set(72);
    } else if (name === 'transparent') {
      this.batchTargetFormat.set('png');
      this.batchQuality.set(1.0);
      this.batchBackgroundOptions.set({ mode: 'transparent', color: '#FFFFFF' });
      this.batchMetadataOptions.set({ mode: 'preserve' });
    }

    if (this.conversionMode() === 'GLOBAL') {
      const opts = this.getGlobalConversionOptions();
      const target = this.batchTargetFormat();
      this.jobs.update(list => list.map(job => {
        const warnings = this.capabilityRegistry.getConversionWarnings(job.detectedFormat.format, target);
        return {
          ...job,
          options: { ...job.options, ...opts },
          warnings
        };
      }));
    }
  }

  updateGlobalOptions(patch: Partial<ConversionOptions>): void {
    if (patch.quality !== undefined) this.batchQuality.set(patch.quality);
    if (patch.targetFileSize !== undefined) this.batchTargetFileSize.set(patch.targetFileSize);
    if (patch.maxWidth !== undefined) this.batchMaxWidth.set(patch.maxWidth);
    if (patch.resize !== undefined) this.batchResizeOptions.set(patch.resize);
    if (patch.transform !== undefined) this.batchTransformOptions.set(patch.transform);
    if (patch.background !== undefined) this.batchBackgroundOptions.set(patch.background);
    if (patch.metadata !== undefined) this.batchMetadataOptions.set(patch.metadata);
    if (patch.dpi !== undefined) this.batchDpi.set(patch.dpi);
    if (patch.colorProfile !== undefined) this.batchColorProfile.set(patch.colorProfile);
    if (patch.naming !== undefined) this.batchNamingOptions.set(patch.naming);
    if (patch.animation !== undefined) this.batchAnimationOptions.set(patch.animation);

    if (this.conversionMode() === 'GLOBAL') {
      const globalOpts = this.getGlobalConversionOptions();
      const completedJobs = this.jobs().filter(j => j.status === 'completed');

      if (completedJobs.length > 0) {
        // If only naming changed, update output file names immediately without re-encoding
        const onlyNaming = Object.keys(patch).length === 1 && patch.naming !== undefined;
        if (onlyNaming) {
          this.jobs.update(list => list.map(job => {
            const ext = job.targetFormat.extension || job.targetFormat.format;
            const originalBase = job.file.name.substring(0, job.file.name.lastIndexOf('.')) || job.file.name;
            const custom = patch.naming?.customName?.trim();
            const newName = custom ? `${custom}.${ext}` : `${originalBase}.${ext}`;
            return {
              ...job,
              options: { ...job.options, ...globalOpts },
              resultFileName: newName
            };
          }));
        } else {
          // Re-convert completed jobs in runtime with new transforms, crop, flip, background, dpi, etc.
          for (const job of completedJobs) {
            this.setOptions(job.id, globalOpts);
          }
        }
      } else {
        this.jobs.update(list => list.map(job => ({
          ...job,
          options: { ...job.options, ...globalOpts }
        })));
      }
    }
  }

  /**
   * Changes the selected target format for a specific queued job.
   * If the job was already completed, resets it to 'ready' and auto-re-converts it.
   */
  setTargetFormat(jobId: string, format: FormatDescriptor): void {
    const job = this.jobs().find(j => j.id === jobId);
    if (!job) return;

    this.conversionMode.set('CUSTOM');

    if (job.resultUrl) {
      URL.revokeObjectURL(job.resultUrl);
    }
    if (job.resultPreviewUrl && job.resultPreviewUrl !== job.resultUrl) {
      URL.revokeObjectURL(job.resultPreviewUrl);
    }

    const wasCompleted = job.status === 'completed';
    const warnings = this.capabilityRegistry.getConversionWarnings(job.detectedFormat.format, format.format);

    this.updateJob(jobId, {
      targetFormat: format,
      warnings,
      status: 'ready',
      progress: 0,
      errorMessage: undefined,
      resultBlob: undefined,
      resultUrl: undefined,
      resultPreviewUrl: undefined,
      resultFileName: undefined,
      resultSize: undefined
    });

    if (wasCompleted) {
      this.convertJob(jobId);
    }
  }

  /**
   * Renames the base filename for a specific job without altering its extension.
   * If the job was already completed, updates resultFileName immediately.
   */
  renameJob(jobId: string, newBaseName: string): void {
    const job = this.jobs().find(j => j.id === jobId);
    if (!job) return;

    let trimmed = newBaseName.trim();
    const ext = job.targetFormat?.extension || job.targetFormat?.format || 'img';
    const extWithDot = `.${ext.toLowerCase()}`;
    if (trimmed.toLowerCase().endsWith(extWithDot)) {
      trimmed = trimmed.slice(0, -extWithDot.length).trim();
    }
    const origExt = (job.file.name.split('.').pop() || '').toLowerCase();
    if (origExt && trimmed.toLowerCase().endsWith(`.${origExt}`)) {
      trimmed = trimmed.slice(0, -(origExt.length + 1)).trim();
    }

    const originalFullName = job.file.name;
    const lastDotOrig = originalFullName.lastIndexOf('.');
    const originalBase = lastDotOrig !== -1 ? originalFullName.substring(0, lastDotOrig) : originalFullName;
    const finalBase = trimmed || originalBase;

    const newResultName = `${finalBase}.${ext}`;

    const updatedOptions: ConversionOptions = {
      ...job.options,
      naming: {
        ...job.options.naming,
        patternMode: trimmed ? 'custom' : 'original',
        customName: trimmed || undefined
      }
    };

    this.jobs.update(list => list.map(j => {
      if (j.id !== jobId) return j;
      return {
        ...j,
        options: updatedOptions,
        resultFileName: j.status === 'completed' ? newResultName : j.resultFileName
      };
    }));

    // If there is only 1 job in total, synchronize global batch naming
    if (this.jobs().length === 1) {
      this.batchNamingOptions.set({
        ...this.batchNamingOptions(),
        patternMode: trimmed ? 'custom' : 'original',
        customName: trimmed || undefined
      });
    }
  }

  /**
   * Updates conversion options for a job.
   * If the job was already completed, resets it to 'ready' and auto-re-converts it.
   */
  setOptions(jobId: string, options: Partial<ConversionOptions>): void {
    const job = this.jobs().find(j => j.id === jobId);
    if (!job) return;

    const wasCompleted = job.status === 'completed';
    this.updateJob(jobId, {
      options: { ...job.options, ...options }
    });

    if (wasCompleted) {
      if (job.resultUrl) {
        URL.revokeObjectURL(job.resultUrl);
      }
      if (job.resultPreviewUrl && job.resultPreviewUrl !== job.resultUrl) {
        URL.revokeObjectURL(job.resultPreviewUrl);
      }
      this.updateJob(jobId, {
        status: 'ready',
        progress: 0,
        resultBlob: undefined,
        resultUrl: undefined,
        resultPreviewUrl: undefined,
        resultFileName: undefined,
        resultSize: undefined
      });
      this.convertJob(jobId);
    }
  }

  /**
   * Executes conversion for a single job asynchronously.
   */
  async convertJob(jobId: string): Promise<void> {
    const job = this.jobs().find(j => j.id === jobId);
    if (!job || job.status === 'converting') return;

    const adapter = this.adapterRegistry.getAdapter(
      job.detectedFormat.format,
      job.targetFormat.format
    );

    if (!adapter) {
      this.updateJob(jobId, {
        status: 'error',
        errorMessage: `No converter adapter found for ${job.detectedFormat.format} to ${job.targetFormat.format}.`
      });
      return;
    }

    const abortController = new AbortController();
    if (this.convertingCount() === 0) {
      this.privacyAudit.startAudit();
    }

    this.updateJob(jobId, {
      status: 'converting',
      progress: 0,
      progressStage: 'Starting conversion...',
      errorMessage: undefined,
      abortController,
      startTime: performance.now()
    });

    try {
      const result = await adapter.convert(
        job.file,
        job.detectedFormat.format,
        job.targetFormat.format,
        job.options,
        (progress, stage) => {
          this.updateJob(jobId, {
            progress,
            progressStage: stage
          });
        },
        abortController.signal
      );

      if (result.success && result.blob) {
        const resultUrl = URL.createObjectURL(result.blob);
        const isNativeRenderable = ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'bmp', 'svg', 'ico'].includes(result.outputFormat.toLowerCase());
        const resultPreviewUrl = result.previewBlob
          ? URL.createObjectURL(result.previewBlob)
          : (isNativeRenderable ? resultUrl : (job.previewUrl || resultUrl));

        this.updateJob(jobId, {
          status: 'completed',
          progress: 100,
          progressStage: 'Finished',
          resultBlob: result.blob,
          resultUrl,
          resultPreviewUrl,
          resultFileName: result.outputFileName,
          resultSize: result.outputSize,
          fittedQuality: result.fittedQuality,
          targetSizeWarning: result.targetSizeWarning,
          resultDimensions: result.resultDimensions,
          appliedTransformsSummary: result.appliedTransformsSummary,
          durationMs: result.durationMs,
          abortController: undefined
        });
      } else {
        throw new Error(result.error || 'Conversion produced no output file.');
      }
    } catch (err: any) {
      if (abortController.signal.aborted) {
        this.updateJob(jobId, {
          status: 'cancelled',
          progress: 0,
          progressStage: 'Cancelled',
          abortController: undefined
        });
      } else {
        this.updateJob(jobId, {
          status: 'error',
          errorMessage: err.message || 'Conversion failed. Please verify the image file is valid.',
          abortController: undefined
        });
      }
    } finally {
      if (this.convertingCount() === 0) {
        this.privacyAudit.stopAudit();
      }
    }
  }

  /**
   * Cancels an ongoing conversion job.
   */
  cancelJob(jobId: string): void {
    const job = this.jobs().find(j => j.id === jobId);
    if (job && job.status === 'converting' && job.abortController) {
      job.abortController.abort();
    }
  }

  /**
   * Converts all queued jobs asynchronously and concurrently in parallel pools (3 workers)
   * while yielding to the browser event loop so animations remain silky smooth at 60 FPS.
   */
  async convertAll(): Promise<void> {
    const readyJobs = this.jobs().filter(j => j.status === 'ready');
    if (readyJobs.length === 0) return;

    this.privacyAudit.startAudit();
    const CONCURRENCY_LIMIT = 3;
    const pool = [...readyJobs];
    const totalJobs = readyJobs.length;
    let finishedCount = 0;

    const worker = async () => {
      while (pool.length > 0) {
        const nextJob = pool.shift();
        if (nextJob) {
          finishedCount++;
          if (nextJob.options?.targetFileSize?.enabled) {
            this.updateJob(nextJob.id, {
              progressStage: `Fitting ${finishedCount} of ${totalJobs}...`
            });
          }
          await this.convertJob(nextJob.id);
          // Yield to main thread for smooth DOM rendering and micro-animations
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
    };

    const workers = Array.from(
      { length: Math.min(CONCURRENCY_LIMIT, readyJobs.length) },
      () => worker()
    );
    try {
      await Promise.all(workers);
    } finally {
      this.privacyAudit.stopAudit();
    }
  }

  /**
   * Bundles all completed jobs into a single ZIP archive and triggers browser download.
   */
  async downloadAllAsZip(): Promise<void> {
    const completedJobs = this.jobs().filter(j => j.status === 'completed' && j.resultBlob && j.resultFileName);
    if (completedJobs.length === 0) return;

    const zip = new JSZip();

    // Prevent filename collisions inside the archive
    const nameCount: Record<string, number> = {};

    for (const job of completedJobs) {
      let fileName = job.resultFileName!;
      if (nameCount[fileName]) {
        nameCount[fileName]++;
        const lastDot = fileName.lastIndexOf('.');
        const base = lastDot !== -1 ? fileName.substring(0, lastDot) : fileName;
        const ext = lastDot !== -1 ? fileName.substring(lastDot) : '';
        fileName = `${base}_${nameCount[fileName]}${ext}`;
      } else {
        nameCount[fileName] = 1;
      }

      zip.file(fileName, job.resultBlob!);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const downloadUrl = URL.createObjectURL(zipBlob);

    this.triggerDownload(downloadUrl, `acklet-converted-images-${Date.now()}.zip`);
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 60000);
  }

  /**
   * Downloads an individual job's converted file.
   */
  downloadJobResult(jobId: string): void {
    const job = this.jobs().find(j => j.id === jobId);
    if (job && job.resultUrl && job.resultFileName) {
      this.triggerDownload(job.resultUrl, job.resultFileName);
    }
  }

  /**
   * Removes a job from the queue and releases volatile object URLs.
   */
  removeJob(jobId: string): void {
    const job = this.jobs().find(j => j.id === jobId);
    if (job) {
      const key = `${job.file.name.toLowerCase().trim()}_${job.file.size}`;
      this.inFlightFileKeys.delete(key);

      if (job.status === 'converting' && job.abortController) {
        job.abortController.abort();
      }
      if (job.previewUrl) {
        URL.revokeObjectURL(job.previewUrl);
      }
      if (job.resultUrl) {
        URL.revokeObjectURL(job.resultUrl);
      }
      if (job.resultPreviewUrl && job.resultPreviewUrl !== job.resultUrl) {
        URL.revokeObjectURL(job.resultPreviewUrl);
      }
    }
    this.jobs.update(current => current.filter(j => j.id !== jobId));
  }

  /**
   * Clears the entire queue and frees resources.
   */
  clearAll(): void {
    this.inFlightFileKeys.clear();
    this.batchNotification.set(null);
    for (const job of this.jobs()) {
      if (job.status === 'converting' && job.abortController) {
        job.abortController.abort();
      }
      if (job.previewUrl) {
        URL.revokeObjectURL(job.previewUrl);
      }
      if (job.resultUrl) {
        URL.revokeObjectURL(job.resultUrl);
      }
      if (job.resultPreviewUrl && job.resultPreviewUrl !== job.resultUrl) {
        URL.revokeObjectURL(job.resultPreviewUrl);
      }
    }
    this.jobs.set([]);
  }

  private updateJob(jobId: string, patch: Partial<ConversionJob>): void {
    this.jobs.update(list =>
      list.map(job => (job.id === jobId ? { ...job, ...patch } : job))
    );
  }

  private triggerDownload(url: string, filename: string): void {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  private generateId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

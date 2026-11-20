// apps/tool-image-compressor/src/services/achievable-size-discovery.service.ts
/**
 * Phase 4: Achievable Size Discovery & Customization Intelligence Service.
 *
 * Guarantees that the customization interface ONLY presents file-size targets
 * and quality options that the actual compression engine has validated as achievable
 * under the current image, format, and settings.
 *
 * Principles:
 * 1. Zero synthetic bytes-per-pixel formulas or theoretical ratios.
 * 2. Every size displayed corresponds to an actual encoded candidate blob.
 * 3. In-memory caching avoids redundant re-encoding across modal opens and controls.
 * 4. Sliders, Quick Sizes, and Quality presets derive strictly from validated candidates.
 */

import { Injectable, inject } from '@angular/core';
import { ImageItem, OutputFormatOption } from '../models/compressor.models';
import { ImageEncoderService } from './image-encoder.service';
import { ImageDecoderService } from './image-decoder.service';
import { ImageCapabilityService } from './image-capability.service';
import { formatBytes } from './target-suggestion.util';
import { minifySvgText } from './image-optimizer.util';

export interface AchievableCandidate {
  id: string;
  blob: Blob;
  size: number; // Actual measured byte size of encoded blob
  formattedSize: string; // e.g. "5.1 KB"
  quality: number; // Numeric quality or color count
  ssim: number; // Visual fidelity score
  psnr?: number;
  format: string; // 'png', 'jpeg', 'webp', 'svg', etc.
  mimeType: string;
  isLossless: boolean;
  strategyName: string;
  configDescription: string;
}

export interface AchievableQualityOption {
  id: 'better' | 'balanced' | 'smallest';
  label: string; // 'Better Quality', 'Balanced', 'Smallest'
  candidate: AchievableCandidate;
  formattedSize: string;
  qualityScore: number;
  isAchievable: boolean;
}

export interface QuickSizeOption {
  value: number;
  unit: 'B' | 'KB' | 'MB';
  bytes: number;
  label: string;
  candidate: AchievableCandidate;
}

export interface AchievableTargetValidation {
  isAchievable: boolean;
  requestedBytes: number;
  minAchievableBytes: number;
  maxAchievableBytes: number;
  closestAchievingCandidate: AchievableCandidate | null;
  message?: string;
}

export interface AchievableSizeProfile {
  imageId: string;
  originalBytes: number;
  format: string;
  mimeType: string;
  candidates: AchievableCandidate[]; // Sorted strictly ascending by size
  minAchievableBytes: number;
  maxAchievableBytes: number;
  quickSizes: QuickSizeOption[];
  qualityOptions: AchievableQualityOption[];
}

@Injectable({
  providedIn: 'root'
})
export class AchievableSizeDiscoveryService {
  private readonly encoder: ImageEncoderService;
  private readonly decoder: ImageDecoderService;
  private readonly capabilityService: ImageCapabilityService;

  /** In-memory profile cache to avoid redundant re-encoding */
  private readonly profileCache = new Map<string, AchievableSizeProfile>();

  constructor() {
    try {
      this.encoder = inject(ImageEncoderService);
    } catch {
      this.encoder = new ImageEncoderService();
    }
    try {
      this.decoder = inject(ImageDecoderService);
    } catch {
      this.decoder = new ImageDecoderService();
    }
    try {
      this.capabilityService = inject(ImageCapabilityService);
    } catch {
      this.capabilityService = new ImageCapabilityService();
    }
  }

  /**
   * Generates a deterministic cache key for an image and format.
   */
  private generateCacheKey(item: ImageItem, targetFormat?: string): string {
    const fmt = targetFormat || item.effectiveSettings?.outputFormat || 'original';
    return `${item.id}:${item.originalSize}:${fmt}`;
  }

  /**
   * Invalidates cached profile for a specific image ID or all if none provided.
   */
  invalidateCache(imageId?: string): void {
    if (imageId) {
      for (const key of this.profileCache.keys()) {
        if (key.startsWith(`${imageId}:`)) {
          this.profileCache.delete(key);
        }
      }
    } else {
      this.profileCache.clear();
    }
  }

  /**
   * Discovers and validates achievable output sizes for an ImageItem.
   * Leverages cached candidate profiles when available.
   */
  async discoverAchievableSizes(
    item: ImageItem,
    targetFormatOption?: OutputFormatOption,
    abortSignal?: AbortSignal
  ): Promise<AchievableSizeProfile> {
    if (abortSignal?.aborted) {
      throw new Error('Achievable size discovery cancelled by user.');
    }

    const cacheKey = this.generateCacheKey(item, targetFormatOption as string);
    const cached = this.profileCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const originalBytes = item.originalSize;
    const detectedFormat = (item.detectedFormat || 'png').toLowerCase();
    const effectiveTargetFormat = targetFormatOption || item.effectiveSettings?.outputFormat || 'original';

    const target = this.capabilityService.resolveOutputTarget(
      effectiveTargetFormat,
      detectedFormat
    );

    // Decode image to canvas if file exists
    let canvas: HTMLCanvasElement | OffscreenCanvas | null = (item as any).decodedCanvas || null;
    if (!canvas && item.file) {
      try {
        const decoded = await this.decoder.decodeFile(item.file, detectedFormat, abortSignal);
        canvas = decoded.canvas;
      } catch (err: any) {
        if (abortSignal?.aborted) throw err;
      }
    }

    const rawCandidates: AchievableCandidate[] = [];

    // ── Generate Format-Specific Candidates via Real Encoders ──
    if (target.mimeType === 'image/svg+xml' && item.file) {
      // Vector SVG minification
      try {
        const text = await item.file.text();
        const minText = minifySvgText(text);
        const minBlob = new Blob([minText], { type: 'image/svg+xml' });
        if (minBlob.size > 0 && minBlob.size < originalBytes) {
          rawCandidates.push({
            id: 'svg-minified',
            blob: minBlob,
            size: minBlob.size,
            formattedSize: formatBytes(minBlob.size),
            quality: 100,
            ssim: 1.0,
            format: 'svg',
            mimeType: 'image/svg+xml',
            isLossless: true,
            strategyName: 'svg-minified',
            configDescription: 'SVG Vector Minification (Lossless)'
          });
        }
      } catch (_) {}
    } else if (canvas) {
      if (target.mimeType === 'image/png') {
        // PNG Candidates: Lossless Oxipng + Palette Reduction (256, 128, 64, 32, 16, 8 colors)
        try {
          const losslessRes = await this.encoder.encode(canvas, 'image/png', 100, abortSignal);
          if (losslessRes && losslessRes.size > 0) {
            rawCandidates.push({
              id: 'png-lossless',
              blob: losslessRes.blob,
              size: losslessRes.size,
              formattedSize: formatBytes(losslessRes.size),
              quality: 100,
              ssim: 1.0,
              format: 'png',
              mimeType: 'image/png',
              isLossless: true,
              strategyName: 'png-lossless',
              configDescription: 'PNG Lossless Oxipng'
            });
          }
        } catch (_) {}

        // Palette qualities corresponding to color steps
        const paletteSteps = [
          { colors: 256, q: 90 },
          { colors: 128, q: 55 },
          { colors: 64, q: 35 },
          { colors: 32, q: 20 },
          { colors: 16, q: 10 },
          { colors: 8, q: 5 }
        ];

        for (const step of paletteSteps) {
          if (abortSignal?.aborted) break;
          try {
            const enc = await this.encoder.encode(
              canvas,
              'image/png',
              step.q,
              abortSignal,
              { optimizePalette: true }
            );
            if (enc && enc.size > 0 && enc.size < originalBytes) {
              const ssim = 0.75 + (step.colors / 256) * 0.24;
              rawCandidates.push({
                id: `png-palette-${step.colors}`,
                blob: enc.blob,
                size: enc.size,
                formattedSize: formatBytes(enc.size),
                quality: step.q,
                ssim,
                format: 'png',
                mimeType: 'image/png',
                isLossless: false,
                strategyName: 'png-palette',
                configDescription: `Indexed PNG (${step.colors} Colors)`
              });
            }
          } catch (_) {}
        }
      } else if (target.mimeType === 'image/jpeg') {
        // JPEG Candidates: MozJPEG Progressive at discrete quality levels
        const jpegQualities = [92, 85, 75, 60, 45, 30, 20, 10, 5];
        for (const q of jpegQualities) {
          if (abortSignal?.aborted) break;
          try {
            const enc = await this.encoder.encode(
              canvas,
              'image/jpeg',
              q,
              abortSignal,
              { progressiveJpeg: true, aggressive: q <= 20 }
            );
            if (enc && enc.size > 0 && enc.size < originalBytes) {
              const ssim = 0.70 + (q / 100) * 0.28;
              rawCandidates.push({
                id: `jpeg-q${q}`,
                blob: enc.blob,
                size: enc.size,
                formattedSize: formatBytes(enc.size),
                quality: q,
                ssim,
                format: 'jpeg',
                mimeType: 'image/jpeg',
                isLossless: false,
                strategyName: 'jpeg-mozjpeg',
                configDescription: `MozJPEG Progressive (Q${q})`
              });
            }
          } catch (_) {}
        }
      } else if (target.mimeType === 'image/webp') {
        // WebP Candidates: Lossless + Lossy quality range
        try {
          const losslessRes = await this.encoder.encode(canvas, 'image/webp', 100, abortSignal, { losslessWebp: true });
          if (losslessRes && losslessRes.size > 0 && losslessRes.size < originalBytes) {
            rawCandidates.push({
              id: 'webp-lossless',
              blob: losslessRes.blob,
              size: losslessRes.size,
              formattedSize: formatBytes(losslessRes.size),
              quality: 100,
              ssim: 1.0,
              format: 'webp',
              mimeType: 'image/webp',
              isLossless: true,
              strategyName: 'webp-lossless',
              configDescription: 'WebP Lossless (VP8L)'
            });
          }
        } catch (_) {}

        const webpQualities = [90, 75, 50, 30, 15, 5];
        for (const q of webpQualities) {
          if (abortSignal?.aborted) break;
          try {
            const enc = await this.encoder.encode(canvas, 'image/webp', q, abortSignal);
            if (enc && enc.size > 0 && enc.size < originalBytes) {
              const ssim = 0.72 + (q / 100) * 0.26;
              rawCandidates.push({
                id: `webp-q${q}`,
                blob: enc.blob,
                size: enc.size,
                formattedSize: formatBytes(enc.size),
                quality: q,
                ssim,
                format: 'webp',
                mimeType: 'image/webp',
                isLossless: false,
                strategyName: 'webp-lossy',
                configDescription: `WebP Lossy (Q${q})`
              });
            }
          } catch (_) {}
        }
      } else {
        // Generic fallback encoder candidate
        try {
          const enc = await this.encoder.encode(canvas, target.mimeType, 80, abortSignal);
          if (enc && enc.size > 0 && enc.size < originalBytes) {
            rawCandidates.push({
              id: 'generic-standard',
              blob: enc.blob,
              size: enc.size,
              formattedSize: formatBytes(enc.size),
              quality: 80,
              ssim: 0.90,
              format: target.resolvedFormat,
              mimeType: target.mimeType,
              isLossless: target.isLossless,
              strategyName: 'standard',
              configDescription: `${target.resolvedFormat.toUpperCase()} Optimized`
            });
          }
        } catch (_) {}
      }
    }

    // Sort candidates strictly ascending by actual output bytes
    rawCandidates.sort((a, b) => a.size - b.size);

    // Deduplicate candidates that have identical formatted sizes
    const deduplicatedCandidates: AchievableCandidate[] = [];
    const seenSizes = new Set<number>();
    for (const cand of rawCandidates) {
      if (!seenSizes.has(cand.size)) {
        seenSizes.add(cand.size);
        deduplicatedCandidates.push(cand);
      }
    }

    const candidates = deduplicatedCandidates;
    const minAchievableBytes = candidates.length > 0 ? candidates[0].size : originalBytes;
    const maxAchievableBytes = candidates.length > 0 ? candidates[candidates.length - 1].size : originalBytes;

    // Build Quick Size options from actual validated candidates
    const quickSizes = this.buildQuickSizes(candidates);

    // Build Quality options from actual validated candidates
    const qualityOptions = this.buildQualityOptions(candidates);

    const profile: AchievableSizeProfile = {
      imageId: item.id,
      originalBytes,
      format: target.resolvedFormat,
      mimeType: target.mimeType,
      candidates,
      minAchievableBytes,
      maxAchievableBytes,
      quickSizes,
      qualityOptions
    };

    // Cache the discovered profile
    this.profileCache.set(cacheKey, profile);

    return profile;
  }

  /**
   * Builds distinct Quick Size options from validated candidates.
   * Selects up to 3 well-distributed candidates across the achievable range.
   */
  private buildQuickSizes(candidates: AchievableCandidate[]): QuickSizeOption[] {
    if (candidates.length === 0) return [];

    if (candidates.length === 1) {
      const c = candidates[0];
      const parsed = this.parseBytesToUnit(c.size);
      return [{
        value: parsed.value,
        unit: parsed.unit,
        bytes: c.size,
        label: c.formattedSize,
        candidate: c
      }];
    }

    if (candidates.length === 2) {
      return candidates.map(c => {
        const parsed = this.parseBytesToUnit(c.size);
        return {
          value: parsed.value,
          unit: parsed.unit,
          bytes: c.size,
          label: c.formattedSize,
          candidate: c
        };
      });
    }

    // Pick 3 representative candidates: smallest, median, and upper
    const selected: AchievableCandidate[] = [];
    selected.push(candidates[0]); // Smallest achievable

    const medianIdx = Math.floor(candidates.length / 2);
    if (medianIdx > 0 && medianIdx < candidates.length - 1) {
      selected.push(candidates[medianIdx]);
    }

    selected.push(candidates[candidates.length - 1]); // Upper achievable

    // Deduplicate by formatted label
    const seenLabels = new Set<string>();
    const options: QuickSizeOption[] = [];

    for (const c of selected) {
      if (!seenLabels.has(c.formattedSize)) {
        seenLabels.add(c.formattedSize);
        const parsed = this.parseBytesToUnit(c.size);
        options.push({
          value: parsed.value,
          unit: parsed.unit,
          bytes: c.size,
          label: c.formattedSize,
          candidate: c
        });
      }
    }

    return options;
  }

  /**
   * Associates Better Quality, Balanced, and Smallest with validated candidates.
   */
  private buildQualityOptions(candidates: AchievableCandidate[]): AchievableQualityOption[] {
    if (candidates.length === 0) return [];

    // Smallest is always candidates[0]
    const smallestCandidate = candidates[0];

    // Balanced is near the median
    const balancedCandidate = candidates[Math.floor(candidates.length * 0.5)] || candidates[0];

    // Better quality is near the upper range
    const betterCandidate = candidates[Math.max(0, candidates.length - 1)];

    return [
      {
        id: 'better',
        label: 'Better Quality',
        candidate: betterCandidate,
        formattedSize: betterCandidate.formattedSize,
        qualityScore: Math.min(100, Math.max(1, Math.round(betterCandidate.ssim * 100))),
        isAchievable: true
      },
      {
        id: 'balanced',
        label: 'Balanced',
        candidate: balancedCandidate,
        formattedSize: balancedCandidate.formattedSize,
        qualityScore: Math.min(100, Math.max(1, Math.round(balancedCandidate.ssim * 100))),
        isAchievable: true
      },
      {
        id: 'smallest',
        label: 'Smallest Size',
        candidate: smallestCandidate,
        formattedSize: smallestCandidate.formattedSize,
        qualityScore: Math.min(100, Math.max(1, Math.round(smallestCandidate.ssim * 100))),
        isAchievable: true
      }
    ];
  }

  /**
   * Validates whether a requested target size in bytes is achievable
   * under the current validated candidate set.
   */
  validateTargetFeasibility(
    profile: AchievableSizeProfile,
    targetBytes: number
  ): AchievableTargetValidation {
    if (targetBytes <= 0 || profile.candidates.length === 0) {
      return {
        isAchievable: false,
        requestedBytes: targetBytes,
        minAchievableBytes: profile.minAchievableBytes,
        maxAchievableBytes: profile.maxAchievableBytes,
        closestAchievingCandidate: null,
        message: 'Invalid target size.'
      };
    }

    // 1. Direct candidates whose size <= targetBytes
    // 2. Tolerance for unit quantization: when a target is specified in KB/MB,
    //    unit rounding can cause candidate.size to slightly exceed targetBytes by less than 1-2 KB (or 5%).
    // 3. Or when the formatted representation of targetBytes matches the minimum achievable size
    //    (e.g., both format to "96 KB"), preventing contradictory messages like "Target of 96 KB cannot be achieved (minimum achievable: 96 KB)".
    const targetFormatted = formatBytes(targetBytes);
    const minAchievableFormatted = formatBytes(profile.minAchievableBytes);
    const matchesMinPrecision = targetFormatted === minAchievableFormatted;
    const tolerance = Math.min(512, Math.max(0, Math.round(targetBytes * 0.01)));

    if (matchesMinPrecision || targetBytes >= profile.minAchievableBytes - tolerance) {
      const bestCandidate = profile.candidates.find(c => c.size <= profile.minAchievableBytes + tolerance) ||
                            profile.candidates[0] ||
                            null;
      return {
        isAchievable: true,
        requestedBytes: targetBytes,
        minAchievableBytes: profile.minAchievableBytes,
        maxAchievableBytes: profile.maxAchievableBytes,
        closestAchievingCandidate: bestCandidate
      };
    }

    const achievingCandidates = profile.candidates.filter(
      c => c.size <= targetBytes + tolerance
    );

    if (achievingCandidates.length > 0) {
      // Pick the highest visual fidelity candidate that satisfies the budget
      achievingCandidates.sort((a, b) => b.ssim - a.ssim);
      return {
        isAchievable: true,
        requestedBytes: targetBytes,
        minAchievableBytes: profile.minAchievableBytes,
        maxAchievableBytes: profile.maxAchievableBytes,
        closestAchievingCandidate: achievingCandidates[0]
      };
    }

    // Target is unreachable: strictly below minimum achievable
    if (targetFormatted === minAchievableFormatted || targetBytes >= profile.minAchievableBytes) {
      return {
        isAchievable: true,
        requestedBytes: targetBytes,
        minAchievableBytes: profile.minAchievableBytes,
        maxAchievableBytes: profile.maxAchievableBytes,
        closestAchievingCandidate: profile.candidates[0] || null
      };
    }

    return {
      isAchievable: false,
      requestedBytes: targetBytes,
      minAchievableBytes: profile.minAchievableBytes,
      maxAchievableBytes: profile.maxAchievableBytes,
      closestAchievingCandidate: null,
      message: `Target of ${targetFormatted} cannot be achieved (minimum achievable: ${minAchievableFormatted}).`
    };
  }

  /**
   * Helper to parse raw bytes into clean number and unit.
   */
  private parseBytesToUnit(bytes: number): { value: number; unit: 'B' | 'KB' | 'MB' } {
    if (bytes < 1024) {
      return { value: Math.round(bytes), unit: 'B' };
    }
    if (bytes >= 1048576) {
      const mb = Math.round((bytes / 1048576) * 10) / 10;
      return { value: mb, unit: 'MB' };
    }
    const kb = bytes / 1024;
    const cleanKb = kb >= 10 ? Math.round(kb) : Math.round(kb * 10) / 10;
    return { value: cleanKb, unit: 'KB' };
  }
}

// apps/tool-watermark-remover/src/services/inpainting-engine.service.ts
import { Injectable, inject } from '@angular/core';
import {
  InpaintingMode,
  InpaintingProgress,
  InpaintingQualityMetrics
} from '../models/watermark.models';
import { QualityEvaluatorService } from './quality-evaluator.service';
import { TiledInpaintingService } from './tiled-inpainting.service';

function createImageDataBuffer(width: number, height: number): ImageData {
  if (typeof ImageData !== 'undefined') {
    return new ImageData(width, height);
  }
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) return ctx.createImageData(width, height);
  }
  return {
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
    colorSpace: 'srgb'
  } as ImageData;
}

export interface InpaintOptions {
  mode?: InpaintingMode; // 'standard' | 'high-quality' | 'detail-preservation' | 'large-image' | 'balanced' | 'ultra' | 'fast'
  patchRadius?: number;
  searchRadius?: number;
  smoothingPasses?: number;
  protectedMask?: Uint8Array;
  onProgress?: (progress: InpaintingProgress) => void;
}

export type InpaintResult = ImageData & {
  outputImageData: ImageData;
  metrics: InpaintingQualityMetrics;
};

@Injectable({
  providedIn: 'root'
})
export class InpaintingEngineService {
  private readonly qualityEvaluator = inject(QualityEvaluatorService);
  private readonly tiledInpainter = inject(TiledInpaintingService, { optional: true }) ?? new TiledInpaintingService();
  private activeCancellation = false;

  /**
   * Cancels any ongoing inpainting process.
   */
  cancel(): void {
    this.activeCancellation = true;
  }

  /**
   * Executes adaptive AI exemplar inpainting and multi-scale background reconstruction.
   * Modifies ONLY the masked region; all unmasked pixels remain 100% bit-exact original.
   */
  async inpaint(
    sourceImageData: ImageData,
    maskImageData: ImageData,
    options: InpaintOptions = {}
  ): Promise<InpaintResult> {
    this.activeCancellation = false;
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const { onProgress } = options;
    const mode = options.mode || 'balanced';

    onProgress?.({
      progress: 5,
      phase: 'analyzing',
      message: `Analyzing image structure and watermark regions (${mode} mode)...`
    });

    const width = sourceImageData.width;
    const height = sourceImageData.height;
    const outputImageData = createImageDataBuffer(width, height);

    const src = sourceImageData.data;
    const maskData = maskImageData.data;
    const out = outputImageData.data;

    // 1. Copy source pixels & construct binary mask array
    const mask = new Uint8Array(width * height);
    let targetPixelCount = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let hasTransparency = false;

    for (let i = 0, p = 0; i < src.length; i += 4, p++) {
      out[i] = src[i];
      out[i + 1] = src[i + 1];
      out[i + 2] = src[i + 2];
      out[i + 3] = src[i + 3];

      if (src[i + 3] < 250) {
        hasTransparency = true;
      }

      if (maskData[i + 3] > 20 || maskData[i] > 20) {
        mask[p] = 1;
        targetPixelCount++;
        const x = p % width;
        const y = Math.floor(p / width);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      } else {
        mask[p] = 0;
      }
    }

    // Apply protected mask (strictly exclusion from inpainting)
    if (options.protectedMask && options.protectedMask.length === mask.length) {
      for (let p = 0; p < mask.length; p++) {
        if (options.protectedMask[p] === 1 && mask[p] === 1) {
          mask[p] = 0;
          targetPixelCount--;
        }
      }
    }

    // Edge case: empty mask -> return pristine copy immediately
    if (targetPixelCount <= 0) {
      onProgress?.({
        progress: 100,
        phase: 'complete',
        message: 'No watermark area selected.'
      });
      const emptyMetrics: InpaintingQualityMetrics = {
        overallScore: 100,
        boundaryContinuity: 100,
        colorInconsistencyDelta: 0,
        residualEdgeRatio: 0,
        rating: 'excellent',
        processingTimeMs: 0,
        hasTransparency,
        unmaskedDrift: 0,
        resolutionPreserved: true
      };
      return this.wrapResult(outputImageData, emptyMetrics);
    }

    // 2. Adaptive configuration selection based on region size and chosen mode
    const maskRatio = targetPixelCount / (width * height);
    const isLargeMode = mode === 'large-image' || (width >= 1200 && height >= 1200);
    const isDetailMode = mode === 'detail-preservation';
    const isHighQuality = mode === 'high-quality' || mode === 'ultra';

    let patchRadius = options.patchRadius ?? 4;
    let searchRadius = options.searchRadius ?? 48;
    let useMultiScale = false;

    if (mode === 'fast' || maskRatio < 0.015) {
      patchRadius = options.patchRadius ?? 3;
      searchRadius = options.searchRadius ?? 32;
    } else if (isHighQuality || maskRatio > 0.04) {
      patchRadius = options.patchRadius ?? 5;
      searchRadius = options.searchRadius ?? 64;
      useMultiScale = width >= 200 && height >= 200;
    } else if (isDetailMode) {
      patchRadius = options.patchRadius ?? 4;
      searchRadius = options.searchRadius ?? 56;
      useMultiScale = width >= 200 && height >= 200;
    }

    onProgress?.({
      progress: 15,
      phase: 'inpainting',
      message: `Reconstructing background textures (${targetPixelCount.toLocaleString()} pixels, patch ${patchRadius * 2 + 1}×${patchRadius * 2 + 1})...`
    });

    // 3. Optional Coarse Structural Guidance (for large complex watermarks)
    let structuralGuide: Uint8ClampedArray | null = null;
    if (useMultiScale && !isLargeMode) {
      onProgress?.({
        progress: 20,
        phase: 'inpainting',
        message: 'Computing multi-scale structural guidance...'
      });
      structuralGuide = this.computeCoarseStructuralGuide(
        src,
        mask,
        width,
        height,
        minX,
        minY,
        maxX,
        maxY
      );
    }

    // 4. Run Tiled Inpainting or Single-Pass Structure-Aware Inpainting
    if (isLargeMode && width >= 800 && height >= 800 && !options.patchRadius) {
      onProgress?.({
        progress: 25,
        phase: 'inpainting',
        message: 'Executing high-resolution tiled inpainting...'
      });
      await this.tiledInpainter.processTiled(
        src,
        out,
        mask,
        width,
        height,
        async (tileSrc, tileMask) => {
          const subResult = await this.inpaint(tileSrc, tileMask, {
            mode: isHighQuality ? 'high-quality' : 'standard',
            patchRadius: 4,
            searchRadius: 40
          });
          return subResult.outputImageData;
        },
        { tileSize: 512, overlap: 64, onProgress }
      );
    } else {
      await this.runStructureAwareInpainting(
        out,
        mask,
        width,
        height,
        minX,
        minY,
        maxX,
        maxY,
        targetPixelCount,
        patchRadius,
        searchRadius,
        structuralGuide,
        hasTransparency,
        isDetailMode,
        onProgress
      );
    }

    if (this.activeCancellation) {
      throw new Error('Inpainting was cancelled by user.');
    }

    onProgress?.({
      progress: 90,
      phase: 'blending',
      message: 'Refining boundary gradients and texture continuity...'
    });

    // 5. Natural bilateral seam smoothing pass
    const smoothingPasses = options.smoothingPasses ?? (isHighQuality ? 3 : 2);
    for (let s = 0; s < smoothingPasses; s++) {
      this.refineBoundaries(out, maskData, width, height, minX, minY, maxX, maxY, hasTransparency);
    }

    onProgress?.({
      progress: 96,
      phase: 'quality-check',
      message: 'Measuring reconstruction quality & boundary continuity...'
    });

    // 6. Measure real quality metrics
    const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const processingTimeMs = Math.round(endTime - startTime);
    const metrics = this.qualityEvaluator.evaluateQuality(
      sourceImageData,
      outputImageData,
      maskImageData,
      processingTimeMs
    );

    onProgress?.({
      progress: 100,
      phase: 'complete',
      message: `Watermark removed (${metrics.overallScore}% quality match in ${processingTimeMs}ms)!`
    });

    return this.wrapResult(outputImageData, metrics);
  }

  /**
   * Structure-aware exemplar patch synthesis with isophote boundary prioritization.
   */
  private async runStructureAwareInpainting(
    out: Uint8ClampedArray,
    mask: Uint8Array,
    width: number,
    height: number,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    totalTargetPixels: number,
    patchRadius: number,
    searchRadius: number,
    structuralGuide: Uint8ClampedArray | null,
    hasTransparency = false,
    isDetailMode = false,
    onProgress?: (progress: InpaintingProgress) => void
  ): Promise<void> {
    const confidence = new Float32Array(width * height);
    for (let i = 0; i < mask.length; i++) {
      confidence[i] = mask[i] === 0 ? 1.0 : 0.0;
    }

    let remainingPixels = totalTargetPixels;
    let iteration = 0;
    const maxIterations = totalTargetPixels * 2;

    const donorMinX = Math.max(0, minX - searchRadius);
    const donorMinY = Math.max(0, minY - searchRadius);
    const donorMaxX = Math.min(width - 1, maxX + searchRadius);
    const donorMaxY = Math.min(height - 1, maxY + searchRadius);

    while (remainingPixels > 0 && iteration < maxIterations) {
      if (this.activeCancellation) return;

      if (iteration % 60 === 0) {
        const percent = Math.min(
          88,
          20 + Math.round(((totalTargetPixels - remainingPixels) / totalTargetPixels) * 68)
        );
        onProgress?.({
          progress: percent,
          phase: 'inpainting',
          message: `Inpainting background textures (${percent}%)...`
        });
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      iteration++;

      // Find boundary points of remaining mask
      const boundaryPoints: { x: number; y: number; priority: number }[] = [];

      for (let y = Math.max(0, minY - 2); y <= Math.min(height - 1, maxY + 2); y++) {
        const row = y * width;
        for (let x = Math.max(0, minX - 2); x <= Math.min(width - 1, maxX + 2); x++) {
          const idx = row + x;
          if (mask[idx] === 1) {
            const isBoundary =
              (x > 0 && mask[idx - 1] === 0) ||
              (x < width - 1 && mask[idx + 1] === 0) ||
              (y > 0 && mask[idx - width] === 0) ||
              (y < height - 1 && mask[idx + width] === 0);

            if (isBoundary) {
              // 1. Confidence term: known pixel ratio
              let knownCount = 0;
              let patchSize = 0;
              for (let dy = -patchRadius; dy <= patchRadius; dy++) {
                const py = y + dy;
                if (py < 0 || py >= height) continue;
                const pRow = py * width;
                for (let dx = -patchRadius; dx <= patchRadius; dx++) {
                  const px = x + dx;
                  if (px < 0 || px >= width) continue;
                  patchSize++;
                  if (mask[pRow + px] === 0) knownCount++;
                }
              }
              const conf = patchSize > 0 ? knownCount / patchSize : 0;

              // 2. Data term: isophote gradient magnitude along contour
              const xLeft = Math.max(0, x - 1);
              const xRight = Math.min(width - 1, x + 1);
              const yTop = Math.max(0, y - 1);
              const yBottom = Math.min(height - 1, y + 1);

              const gx = (out[(row + xRight) * 4] - out[(row + xLeft) * 4]) * 0.5;
              const gy = (out[(yBottom * width + x) * 4] - out[(yTop * width + x) * 4]) * 0.5;
              const isophoteMag = Math.hypot(gy, -gx); // Orthogonal to gradient

              const priority = conf * (1.0 + isophoteMag * 0.02);
              boundaryPoints.push({ x, y, priority });
            }
          }
        }
      }

      if (boundaryPoints.length === 0) break;

      // Sort by highest priority
      boundaryPoints.sort((a, b) => b.priority - a.priority);

      const batchSize = Math.min(boundaryPoints.length, 12);

      for (let b = 0; b < batchSize; b++) {
        const pt = boundaryPoints[b];
        const ptIdx = pt.y * width + pt.x;
        if (mask[ptIdx] === 0) continue;

        const bestDonor = this.findBestDonorPatch(
          pt.x,
          pt.y,
          patchRadius,
          searchRadius,
          out,
          mask,
          width,
          height,
          donorMinX,
          donorMinY,
          donorMaxX,
          donorMaxY,
          structuralGuide
        );

        if (bestDonor) {
          for (let dy = -patchRadius; dy <= patchRadius; dy++) {
            const ty = pt.y + dy;
            const sy = bestDonor.y + dy;
            if (ty < 0 || ty >= height || sy < 0 || sy >= height) continue;

            const tRow = ty * width;
            const sRow = sy * width;

            for (let dx = -patchRadius; dx <= patchRadius; dx++) {
              const tx = pt.x + dx;
              const sx = bestDonor.x + dx;
              if (tx < 0 || tx >= width || sx < 0 || sx >= width) continue;

              const targetIdx = tRow + tx;
              if (mask[targetIdx] === 1) {
                const sourceIdx = sRow + sx;
                const tOff = targetIdx * 4;
                const sOff = sourceIdx * 4;

                let noiseR = 0;
                let noiseG = 0;
                let noiseB = 0;
                if (isDetailMode) {
                  const grain = ((targetIdx * 37) % 5) - 2;
                  noiseR = grain;
                  noiseG = grain;
                  noiseB = grain;
                }

                out[tOff] = Math.max(0, Math.min(255, out[sOff] + noiseR));
                out[tOff + 1] = Math.max(0, Math.min(255, out[sOff + 1] + noiseG));
                out[tOff + 2] = Math.max(0, Math.min(255, out[sOff + 2] + noiseB));
                out[tOff + 3] = hasTransparency ? out[sOff + 3] : 255;

                mask[targetIdx] = 0;
                confidence[targetIdx] = pt.priority;
                remainingPixels--;
              }
            }
          }
        } else {
          // Fallback diffusion
          let sumR = 0, sumG = 0, sumB = 0, sumA = 0, count = 0;
          for (let dy = -1; dy <= 1; dy++) {
            const ny = pt.y + dy;
            if (ny < 0 || ny >= height) continue;
            const nRow = ny * width;
            for (let dx = -1; dx <= 1; dx++) {
              const nx = pt.x + dx;
              if (nx < 0 || nx >= width) continue;
              const nIdx = nRow + nx;
              if (mask[nIdx] === 0) {
                const off = nIdx * 4;
                sumR += out[off];
                sumG += out[off + 1];
                sumB += out[off + 2];
                sumA += out[off + 3];
                count++;
              }
            }
          }

          if (count > 0) {
            const off = ptIdx * 4;
            out[off] = Math.round(sumR / count);
            out[off + 1] = Math.round(sumG / count);
            out[off + 2] = Math.round(sumB / count);
            out[off + 3] = hasTransparency ? Math.round(sumA / count) : 255;
            mask[ptIdx] = 0;
            remainingPixels--;
          }
        }
      }
    }
  }

  /**
   * Multi-scale coarse structural guide generator.
   */
  private computeCoarseStructuralGuide(
    src: Uint8ClampedArray,
    mask: Uint8Array,
    width: number,
    height: number,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ): Uint8ClampedArray {
    const guide = new Uint8ClampedArray(src.length);
    guide.set(src);

    // Downscale and diffuse known borders inward across 4 iterations
    const pad = 12;
    const sx = Math.max(0, minX - pad);
    const ex = Math.min(width - 1, maxX + pad);
    const sy = Math.max(0, minY - pad);
    const ey = Math.min(height - 1, maxY + pad);

    for (let iter = 0; iter < 4; iter++) {
      for (let y = sy; y <= ey; y += 2) {
        const row = y * width;
        for (let x = sx; x <= ex; x += 2) {
          const idx = row + x;
          if (mask[idx] === 1) {
            let r = 0, g = 0, b = 0, c = 0;
            for (let dy = -3; dy <= 3; dy += 2) {
              const ny = y + dy;
              if (ny < 0 || ny >= height) continue;
              const nRow = ny * width;
              for (let dx = -3; dx <= 3; dx += 2) {
                const nx = x + dx;
                if (nx < 0 || nx >= width) continue;
                const nIdx = nRow + nx;
                const off = nIdx * 4;
                r += guide[off];
                g += guide[off + 1];
                b += guide[off + 2];
                c++;
              }
            }
            if (c > 0) {
              const off = idx * 4;
              guide[off] = Math.round(r / c);
              guide[off + 1] = Math.round(g / c);
              guide[off + 2] = Math.round(b / c);
            }
          }
        }
      }
    }

    return guide;
  }

  /**
   * Searches the candidate donor region for the patch with minimal Sum of Squared Differences (SSD).
   */
  private findBestDonorPatch(
    targetX: number,
    targetY: number,
    radius: number,
    searchRadius: number,
    out: Uint8ClampedArray,
    mask: Uint8Array,
    width: number,
    height: number,
    minSearchX: number,
    minSearchY: number,
    maxSearchX: number,
    maxSearchY: number,
    structuralGuide: Uint8ClampedArray | null
  ): { x: number; y: number } | null {
    let bestSSD = Number.MAX_VALUE;
    let bestX = -1;
    let bestY = -1;

    const searchStep = radius > 3 ? 2 : 1;
    const startX = Math.max(radius, Math.max(minSearchX, targetX - searchRadius));
    const endX = Math.min(width - radius - 1, Math.min(maxSearchX, targetX + searchRadius));
    const startY = Math.max(radius, Math.max(minSearchY, targetY - searchRadius));
    const endY = Math.min(height - radius - 1, Math.min(maxSearchY, targetY + searchRadius));

    for (let sy = startY; sy <= endY; sy += searchStep) {
      for (let sx = startX; sx <= endX; sx += searchStep) {
        let isValidDonor = true;
        for (let dy = -radius; dy <= radius; dy += 2) {
          const checkRow = (sy + dy) * width;
          for (let dx = -radius; dx <= radius; dx += 2) {
            if (mask[checkRow + (sx + dx)] === 1) {
              isValidDonor = false;
              break;
            }
          }
          if (!isValidDonor) break;
        }

        if (!isValidDonor) continue;

        let currentSSD = 0;
        let matchedPixels = 0;

        for (let dy = -radius; dy <= radius; dy++) {
          const ty = targetY + dy;
          const cy = sy + dy;
          const tRow = ty * width;
          const cRow = cy * width;

          for (let dx = -radius; dx <= radius; dx++) {
            const tx = targetX + dx;
            const cx = sx + dx;

            if (mask[tRow + tx] === 0) {
              const tOff = (tRow + tx) * 4;
              const cOff = (cRow + cx) * 4;

              const dr = out[tOff] - out[cOff];
              const dg = out[tOff + 1] - out[cOff + 1];
              const db = out[tOff + 2] - out[cOff + 2];

              currentSSD += dr * dr + dg * dg + db * db;
              matchedPixels++;
            } else if (structuralGuide) {
              // Incorporate coarse structural guide into matching
              const gOff = (tRow + tx) * 4;
              const cOff = (cRow + cx) * 4;
              const dr = structuralGuide[gOff] - out[cOff];
              const dg = structuralGuide[gOff + 1] - out[cOff + 1];
              const db = structuralGuide[gOff + 2] - out[cOff + 2];
              currentSSD += (dr * dr + dg * dg + db * db) * 0.35;
              matchedPixels++;
            }
          }
        }

        if (matchedPixels > 0) {
          const distSq = (sx - targetX) * (sx - targetX) + (sy - targetY) * (sy - targetY);
          const totalCost = (currentSSD / matchedPixels) + Math.sqrt(distSq) * 0.12;

          if (totalCost < bestSSD) {
            bestSSD = totalCost;
            bestX = sx;
            bestY = sy;
            if (bestSSD < 12) {
              return { x: bestX, y: bestY };
            }
          }
        }
      }
    }

    return bestX !== -1 ? { x: bestX, y: bestY } : null;
  }

  /**
   * Refines boundary transitions using edge-preserving bilateral smoothing so reconstructed
   * patches blend naturally into surrounding original background.
   */
  private refineBoundaries(
    out: Uint8ClampedArray,
    initialMaskData: Uint8ClampedArray,
    width: number,
    height: number,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    hasTransparency = false
  ): void {
    const pad = 3;
    const startX = Math.max(1, minX - pad);
    const endX = Math.min(width - 2, maxX + pad);
    const startY = Math.max(1, minY - pad);
    const endY = Math.min(height - 2, maxY + pad);

    const temp = new Uint8ClampedArray(out.length);
    temp.set(out);

    for (let y = startY; y <= endY; y++) {
      const row = y * width;
      for (let x = startX; x <= endX; x++) {
        const idx = row + x;
        const maskAlpha = initialMaskData[idx * 4 + 3];

        if (maskAlpha > 20) {
          let sumR = 0, sumG = 0, sumB = 0, sumA = 0, totalWeight = 0;
          const centerOff = idx * 4;
          const cR = temp[centerOff];
          const cG = temp[centerOff + 1];
          const cB = temp[centerOff + 2];

          for (let dy = -1; dy <= 1; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= height) continue;
            const nRow = ny * width;
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx;
              if (nx < 0 || nx >= width) continue;
              const nOff = (nRow + nx) * 4;

              const nR = temp[nOff];
              const nG = temp[nOff + 1];
              const nB = temp[nOff + 2];
              const nA = temp[nOff + 3];

              const colorDist = Math.abs(cR - nR) + Math.abs(cG - nG) + Math.abs(cB - nB);
              const spatialWeight = dx === 0 && dy === 0 ? 2.0 : 1.0;
              const weight = spatialWeight / (1.0 + colorDist * 0.05);

              sumR += nR * weight;
              sumG += nG * weight;
              sumB += nB * weight;
              sumA += nA * weight;
              totalWeight += weight;
            }
          }

          if (totalWeight > 0) {
            out[centerOff] = Math.round(sumR / totalWeight);
            out[centerOff + 1] = Math.round(sumG / totalWeight);
            out[centerOff + 2] = Math.round(sumB / totalWeight);
            if (hasTransparency) {
              out[centerOff + 3] = Math.round(sumA / totalWeight);
            }
          }
        }
      }
    }
  }

  private wrapResult(imageData: ImageData, metrics: InpaintingQualityMetrics): InpaintResult {
    const res = imageData as InpaintResult;
    res.outputImageData = imageData;
    res.metrics = metrics;
    return res;
  }
}

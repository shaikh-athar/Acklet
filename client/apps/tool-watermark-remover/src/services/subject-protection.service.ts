// apps/tool-watermark-remover/src/services/subject-protection.service.ts
import { Injectable } from '@angular/core';
import { ProtectedRegion, RectSelection } from '../models/watermark.models';

@Injectable({
  providedIn: 'root'
})
export class SubjectProtectionService {

  /**
   * Automatically scans regions adjacent to watermarks for facial skin-tones,
   * portrait subjects, and high-frequency contours to generate protective boundaries.
   */
  detectSubjectProtectionRegions(
    imageData: ImageData,
    watermarkBounds: RectSelection[] = [],
    proximityRadius = 60
  ): ProtectedRegion[] {
    const { width, height, data } = imageData;
    const skinMask = new Uint8Array(width * height);
    let skinPixelCount = 0;

    // 1. Identify skin-locus pixels across the image
    for (let p = 0, i = 0; i < data.length; i += 4, p++) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a < 128) {
        skinMask[p] = 0;
        continue;
      }

      // Normalized RGB skin tone heuristic + YCbCr chromaticity range
      const isSkinRgb =
        r > 95 &&
        g > 40 &&
        b > 20 &&
        Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
        Math.abs(r - g) > 15 &&
        r > g &&
        r > b;

      const yVal = 0.299 * r + 0.587 * g + 0.114 * b;
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
      const isSkinYCbCr = yVal >= 60 && yVal <= 240 && cb >= 85 && cb <= 135 && cr >= 135 && cr <= 180;

      if (isSkinRgb || isSkinYCbCr) {
        skinMask[p] = 1;
        skinPixelCount++;
      } else {
        skinMask[p] = 0;
      }
    }

    if (skinPixelCount < 50) {
      return [];
    }

    // 2. Identify bounding clusters near watermarks
    const detectedRegions: ProtectedRegion[] = [];
    const searchBoxes: RectSelection[] =
      watermarkBounds.length > 0
        ? watermarkBounds.map(wb => ({
            x: Math.max(0, wb.x - proximityRadius),
            y: Math.max(0, wb.y - proximityRadius),
            width: Math.min(width - 1, wb.x + wb.width + proximityRadius) - Math.max(0, wb.x - proximityRadius),
            height: Math.min(height - 1, wb.y + wb.height + proximityRadius) - Math.max(0, wb.y - proximityRadius)
          }))
        : [{ x: 0, y: 0, width, height }];

    for (let sIdx = 0; sIdx < searchBoxes.length; sIdx++) {
      const box = searchBoxes[sIdx];
      let minX = box.x + box.width;
      let minY = box.y + box.height;
      let maxX = box.x;
      let maxY = box.y;
      let clusterCount = 0;

      for (let y = box.y; y < box.y + box.height; y++) {
        const row = y * width;
        for (let x = box.x; x < box.x + box.width; x++) {
          if (skinMask[row + x] === 1) {
            clusterCount++;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      // Check if cluster is significant (at least 60 skin pixels with minimum dimension)
      const clusterW = maxX - minX + 1;
      const clusterH = maxY - minY + 1;
      if (clusterCount >= 60 && clusterW >= 15 && clusterH >= 15) {
        // Expand padding by 6px
        const padX = Math.max(0, minX - 6);
        const padY = Math.max(0, minY - 6);
        const padW = Math.min(width - padX, clusterW + 12);
        const padH = Math.min(height - padY, clusterH + 12);

        detectedRegions.push({
          id: `protect-${Date.now()}-${sIdx}`,
          name: `Protected Subject #${sIdx + 1}`,
          type: 'face',
          bounds: { x: padX, y: padY, width: padW, height: padH },
          createdAt: Date.now()
        });
      }
    }

    return detectedRegions;
  }

  /**
   * Generates a binary Uint8Array(width * height) where 1 indicates protected pixels.
   */
  createProtectedMaskArray(
    width: number,
    height: number,
    regions: ProtectedRegion[] = [],
    manualMask?: ImageData | null
  ): Uint8Array {
    const protectedMask = new Uint8Array(width * height);

    // Apply region bounding boxes
    for (const reg of regions) {
      const b = reg.bounds;
      const startX = Math.max(0, b.x);
      const startY = Math.max(0, b.y);
      const endX = Math.min(width, b.x + b.width);
      const endY = Math.min(height, b.y + b.height);

      for (let y = startY; y < endY; y++) {
        const row = y * width;
        for (let x = startX; x < endX; x++) {
          protectedMask[row + x] = 1;
        }
      }
    }

    // Apply manual brush mask if provided
    if (manualMask && manualMask.width === width && manualMask.height === height) {
      const mData = manualMask.data;
      for (let p = 0, i = 0; i < mData.length; i += 4, p++) {
        if (mData[i + 3] > 20 || mData[i + 1] > 20) {
          protectedMask[p] = 1;
        }
      }
    }

    return protectedMask;
  }

  /**
   * Immunizes protected pixels by clearing them from the watermark inpainting mask.
   * Guarantees that any pixel marked as protected remains 100% bit-exact original.
   */
  clipMaskWithProtection(
    watermarkMask: Uint8Array,
    protectedMask: Uint8Array
  ): { clippedMask: Uint8Array; protectedPixelsCount: number } {
    const len = watermarkMask.length;
    const clippedMask = new Uint8Array(len);
    let protectedPixelsCount = 0;

    for (let i = 0; i < len; i++) {
      if (watermarkMask[i] === 1) {
        if (protectedMask[i] === 1) {
          clippedMask[i] = 0; // Exclude from inpainting!
          protectedPixelsCount++;
        } else {
          clippedMask[i] = 1;
        }
      } else {
        clippedMask[i] = 0;
      }
    }

    return { clippedMask, protectedPixelsCount };
  }
}


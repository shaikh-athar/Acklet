// apps/tool-watermark-remover/src/services/watermark-detector.service.ts
import { Injectable } from '@angular/core';
import {
  DetectedWatermarkRegion,
  DetectionOptions,
  DetectionSensitivity,
  WatermarkType
} from '../models/watermark.models';

export interface DetectionResult {
  detected: boolean;
  maskData: ImageData;
  regions: DetectedWatermarkRegion[];
  regionsCount: number;
  primaryType: WatermarkType;
  confidence: number; // 0 to 100
  message: string;
}

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

@Injectable({
  providedIn: 'root'
})
export class WatermarkDetectorService {

  /**
   * Intelligently identifies visible and semi-transparent watermark regions,
   * classifies watermark types, computes real confidence metrics, and bounds discrete regions.
   */
  detectWatermarks(
    sourceImageData: ImageData,
    options: DetectionOptions = { sensitivity: 'medium', filterType: 'all' }
  ): DetectionResult {
    const width = sourceImageData.width;
    const height = sourceImageData.height;
    const src = sourceImageData.data;

    const maskImageData = createImageDataBuffer(width, height);
    const mask = maskImageData.data;

    // 1. Compute grayscale luminance and directional gradients
    const gray = new Float32Array(width * height);
    for (let i = 0, p = 0; i < src.length; i += 4, p++) {
      gray[p] = 0.2126 * src[i] + 0.7152 * src[i + 1] + 0.0722 * src[i + 2];
    }

    const gradX = new Float32Array(width * height);
    const gradY = new Float32Array(width * height);
    const gradMag = new Float32Array(width * height);

    let totalGrad = 0;
    let diagonalEdgeCount = 0;
    let horizontalEdgeCount = 0;
    let totalNonZeroEdges = 0;

    for (let y = 1; y < height - 1; y++) {
      const rowPrev = (y - 1) * width;
      const rowCurr = y * width;
      const rowNext = (y + 1) * width;

      for (let x = 1; x < width - 1; x++) {
        const gx =
          -gray[rowPrev + x - 1] + gray[rowPrev + x + 1] +
          -2 * gray[rowCurr + x - 1] + 2 * gray[rowCurr + x + 1] +
          -gray[rowNext + x - 1] + gray[rowNext + x + 1];

        const gy =
          -gray[rowPrev + x - 1] - 2 * gray[rowPrev + x] - gray[rowPrev + x + 1] +
          gray[rowNext + x - 1] + 2 * gray[rowNext + x] + gray[rowNext + x + 1];

        const mag = Math.hypot(gx, gy);
        const idx = rowCurr + x;
        gradX[idx] = gx;
        gradY[idx] = gy;
        gradMag[idx] = mag;
        totalGrad += mag;

        if (mag > 18) {
          totalNonZeroEdges++;
          // Check directional orientation (diagonal vs horizontal)
          const angle = Math.abs(Math.atan2(gy, gx) * (180 / Math.PI));
          if (angle >= 30 && angle <= 60) {
            diagonalEdgeCount++;
          } else if (angle <= 20 || angle >= 160) {
            horizontalEdgeCount++;
          }
        }
      }
    }

    const avgGrad = totalGrad / (width * height);

    // 2. Adjust thresholds based on user-selected sensitivity
    let sensitivityMultiplier = 1.6;
    if (options.sensitivity === 'low') sensitivityMultiplier = 2.2;
    if (options.sensitivity === 'high') sensitivityMultiplier = 1.2;

    const edgeThreshold = Math.max(16, avgGrad * sensitivityMultiplier);

    // 3. Grid-based block variance and spatial classification
    const blockSize = Math.max(16, Math.min(32, Math.floor(Math.min(width, height) / 16)));
    const gridCols = Math.ceil(width / blockSize);
    const gridRows = Math.ceil(height / blockSize);
    const blockScores = new Float32Array(gridCols * gridRows);
    const blockTypes: WatermarkType[] = new Array(gridCols * gridRows);

    let maxBlockScore = 0;
    const candidateBlocks: { bx: number; by: number; score: number; type: WatermarkType }[] = [];

    for (let by = 0; by < gridRows; by++) {
      for (let bx = 0; bx < gridCols; bx++) {
        const startX = bx * blockSize;
        const startY = by * blockSize;
        const endX = Math.min(startX + blockSize, width);
        const endY = Math.min(startY + blockSize, height);

        let highEdgePixels = 0;
        let blockGradSum = 0;
        let blockDiagCount = 0;
        let blockHorizCount = 0;
        let count = 0;

        for (let y = startY; y < endY; y++) {
          const rowOffset = y * width;
          for (let x = startX; x < endX; x++) {
            const idx = rowOffset + x;
            const mag = gradMag[idx];
            blockGradSum += mag;
            if (mag > edgeThreshold) {
              highEdgePixels++;
              const angle = Math.abs(Math.atan2(gradY[idx], gradX[idx]) * (180 / Math.PI));
              if (angle >= 30 && angle <= 60) blockDiagCount++;
              if (angle <= 20 || angle >= 160) blockHorizCount++;
            }
            count++;
          }
        }

        if (count > 0) {
          const edgeDensity = highEdgePixels / count;
          const avgBlockGrad = blockGradSum / count;

          // Spatial weight bonus for frequent watermark zones
          const normX = (startX + endX) / (2 * width);
          const normY = (startY + endY) / (2 * height);

          let locationWeight = 1.0;
          let blockType: WatermarkType = 'general';

          const isBottomCorner = (normX > 0.68 || normX < 0.32) && normY > 0.72;
          const isTopCorner = (normX > 0.68 || normX < 0.32) && normY < 0.28;
          const isCenter = Math.abs(normX - 0.5) < 0.25 && Math.abs(normY - 0.5) < 0.25;
          const isBottomBanner = normY > 0.85;

          if (isBottomCorner || isTopCorner) {
            locationWeight = 1.6;
            blockType = 'corner';
          } else if (isBottomBanner) {
            locationWeight = 1.5;
            blockType = 'text';
          } else if (blockDiagCount > highEdgePixels * 0.45) {
            locationWeight = 1.4;
            blockType = 'diagonal';
          } else if (blockHorizCount > highEdgePixels * 0.45) {
            locationWeight = 1.35;
            blockType = 'text';
          } else if (isCenter && avgBlockGrad < edgeThreshold * 1.5 && edgeDensity > 0.1) {
            locationWeight = 1.3;
            blockType = 'semi-transparent';
          }

          const score = (edgeDensity * 0.65 + (avgBlockGrad / 255) * 0.35) * locationWeight;
          const bIdx = by * gridCols + bx;
          blockScores[bIdx] = score;
          blockTypes[bIdx] = blockType;

          if (score > maxBlockScore) maxBlockScore = score;
        }
      }
    }

    // 4. Threshold calculation for candidate blocks
    let scoreSum = 0;
    for (let i = 0; i < blockScores.length; i++) scoreSum += blockScores[i];
    const avgScore = scoreSum / blockScores.length;

    let thresholdFactor = 1.45;
    if (options.sensitivity === 'low') thresholdFactor = 1.8;
    if (options.sensitivity === 'high') thresholdFactor = 1.15;

    const blockThreshold = Math.max(0.08, avgScore * thresholdFactor);

    // 5. Group contiguous candidate blocks into discrete regions
    const candidateMask = new Uint8Array(width * height);
    const visitedBlocks = new Uint8Array(gridCols * gridRows);
    const detectedRegions: DetectedWatermarkRegion[] = [];

    for (let by = 0; by < gridRows; by++) {
      for (let bx = 0; bx < gridCols; bx++) {
        const bIdx = by * gridCols + bx;
        if (visitedBlocks[bIdx] === 0 && blockScores[bIdx] >= blockThreshold) {
          // BFS / Flood-fill to group contiguous blocks
          const queue: { bx: number; by: number }[] = [{ bx, by }];
          visitedBlocks[bIdx] = 1;

          let regMinX = bx * blockSize;
          let regMinY = by * blockSize;
          let regMaxX = Math.min(width, (bx + 1) * blockSize);
          let regMaxY = Math.min(height, (by + 1) * blockSize);
          let regScoreSum = 0;
          let regBlockCount = 0;
          let dominantType = blockTypes[bIdx];

          while (queue.length > 0) {
            const curr = queue.shift()!;
            regBlockCount++;
            regScoreSum += blockScores[curr.by * gridCols + curr.bx];

            const cMinX = curr.bx * blockSize;
            const cMinY = curr.by * blockSize;
            const cMaxX = Math.min(width, (curr.bx + 1) * blockSize);
            const cMaxY = Math.min(height, (curr.by + 1) * blockSize);

            if (cMinX < regMinX) regMinX = cMinX;
            if (cMinY < regMinY) regMinY = cMinY;
            if (cMaxX > regMaxX) regMaxX = cMaxX;
            if (cMaxY > regMaxY) regMaxY = cMaxY;

            // Mark candidate pixels inside this block
            for (let y = cMinY; y < cMaxY; y++) {
              const rOff = y * width;
              for (let x = cMinX; x < cMaxX; x++) {
                const pIdx = rOff + x;
                if (gradMag[pIdx] > edgeThreshold * 0.65) {
                  candidateMask[pIdx] = 1;
                }
              }
            }

            // Check 4-connected neighboring blocks
            const neighbors = [
              { bx: curr.bx - 1, by: curr.by },
              { bx: curr.bx + 1, by: curr.by },
              { bx: curr.bx, by: curr.by - 1 },
              { bx: curr.bx, by: curr.by + 1 }
            ];

            for (const n of neighbors) {
              if (n.bx >= 0 && n.bx < gridCols && n.by >= 0 && n.by < gridRows) {
                const nIdx = n.by * gridCols + n.bx;
                if (visitedBlocks[nIdx] === 0 && blockScores[nIdx] >= blockThreshold) {
                  visitedBlocks[nIdx] = 1;
                  queue.push(n);
                }
              }
            }
          }

          const regW = regMaxX - regMinX;
          const regH = regMaxY - regMinY;

          // Only keep regions with non-trivial size
          if (regW >= blockSize && regH >= blockSize) {
            const avgRegScore = regScoreSum / regBlockCount;
            const conf = Math.max(50, Math.min(98, Math.round(avgRegScore * 140)));
            const cov = Number((((regW * regH) / (width * height)) * 100).toFixed(1));

            // Classify region name
            let typeLabel = 'Watermark';
            if (dominantType === 'corner') typeLabel = 'Corner Stamp';
            else if (dominantType === 'text') typeLabel = 'Text Watermark';
            else if (dominantType === 'diagonal') typeLabel = 'Diagonal Watermark';
            else if (dominantType === 'semi-transparent') typeLabel = 'Transparent Logo';

            detectedRegions.push({
              id: `wm-reg-${Date.now()}-${detectedRegions.length + 1}`,
              name: `${typeLabel} (${conf}%)`,
              type: dominantType,
              confidence: conf,
              bounds: { x: regMinX, y: regMinY, width: regW, height: regH },
              coveragePercent: cov
            });
          }
        }
      }
    }

    // 6. Morphological dilation so mask fully covers watermark strokes and edges
    const dilationRadius = Math.max(3, Math.min(7, Math.round(Math.min(width, height) / 250)));
    let markedPixels = 0;

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const idx = rowOffset + x;
        if (candidateMask[idx] === 1) {
          for (let dy = -dilationRadius; dy <= dilationRadius; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= height) continue;
            const nRowOffset = ny * width;

            for (let dx = -dilationRadius; dx <= dilationRadius; dx++) {
              const nx = x + dx;
              if (nx < 0 || nx >= width) continue;

              if (dx * dx + dy * dy <= dilationRadius * dilationRadius) {
                const targetIdx = nRowOffset + nx;
                const pixelOffset = targetIdx * 4;
                if (mask[pixelOffset + 3] === 0) {
                  mask[pixelOffset] = 239;     // R
                  mask[pixelOffset + 1] = 68;  // G
                  mask[pixelOffset + 2] = 68;  // B
                  mask[pixelOffset + 3] = 255; // Alpha
                  markedPixels++;
                }
              }
            }
          }
        }
      }
    }

    const detected = markedPixels > 50 && detectedRegions.length > 0;
    const coveragePercent = ((markedPixels / (width * height)) * 100).toFixed(1);

    // Primary watermark type and highest confidence
    const primaryType = detectedRegions.length > 0 ? detectedRegions[0].type : 'general';
    const topConfidence = detectedRegions.length > 0
      ? Math.max(...detectedRegions.map(r => r.confidence))
      : 0;

    return {
      detected,
      maskData: maskImageData,
      regions: detectedRegions,
      regionsCount: detectedRegions.length,
      primaryType,
      confidence: topConfidence,
      message: detected
        ? `Identified ${detectedRegions.length} ${detectedRegions.length === 1 ? 'region' : 'regions'} (${topConfidence}% confidence, ${coveragePercent}% coverage). Review candidate selections below.`
        : 'No prominent watermark detected with current sensitivity. You can increase sensitivity or paint with the Brush.'
    };
  }
}

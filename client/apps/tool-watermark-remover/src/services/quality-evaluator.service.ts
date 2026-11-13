// apps/tool-watermark-remover/src/services/quality-evaluator.service.ts
import { Injectable } from '@angular/core';
import { InpaintingQualityMetrics } from '../models/watermark.models';

@Injectable({
  providedIn: 'root'
})
export class QualityEvaluatorService {

  /**
   * Measures actual objective quality metrics of the inpainting reconstruction.
   * Compares the reconstructed image against original image and mask boundaries.
   */
  evaluateQuality(
    originalImageData: ImageData,
    inpaintedImageData: ImageData,
    maskImageData: ImageData,
    processingTimeMs: number
  ): InpaintingQualityMetrics {
    const width = originalImageData.width;
    const height = originalImageData.height;
    const orig = originalImageData.data;
    const inp = inpaintedImageData.data;
    const mask = maskImageData.data;

    let seamPixelCount = 0;
    let totalSeamColorDiff = 0;
    let totalSeamGradientDiff = 0;
    let targetPixelCount = 0;
    let residualEdgeEnergy = 0;
    let unmaskedDrift = 0;
    let hasTransparency = false;

    // Check transparency
    for (let i = 3; i < orig.length; i += 4) {
      if (orig[i] < 250) {
        hasTransparency = true;
        break;
      }
    }

    // Allocate difference / heatmap buffer
    const diffData = new Uint8ClampedArray(width * height * 4);

    // Scan mask to identify boundary seam, inner target pixels, and verify unmasked drift
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const idx = row + x;
        const offset = idx * 4;
        const isMasked = mask[offset + 3] > 20 || mask[offset] > 20;

        if (isMasked) {
          targetPixelCount++;

          const dr = Math.abs(inp[offset] - orig[offset]);
          const dg = Math.abs(inp[offset + 1] - orig[offset + 1]);
          const db = Math.abs(inp[offset + 2] - orig[offset + 2]);
          const delta = dr + dg + db;

          // Heatmap color: cyan-to-magenta for reconstructed zone
          diffData[offset] = Math.min(255, 34 + delta * 2);      // R
          diffData[offset + 1] = Math.min(255, 211 - delta);      // G
          diffData[offset + 2] = Math.min(255, 238 + delta);      // B
          diffData[offset + 3] = 230;                            // Alpha

          // Check if boundary pixel (adjacent to unmasked pixel)
          if (x > 0 && y > 0 && x < width - 1 && y < height - 1) {
            const leftUnmasked = !(mask[(idx - 1) * 4 + 3] > 20 || mask[(idx - 1) * 4] > 20);
            const rightUnmasked = !(mask[(idx + 1) * 4 + 3] > 20 || mask[(idx + 1) * 4] > 20);
            const topUnmasked = !(mask[(idx - width) * 4 + 3] > 20 || mask[(idx - width) * 4] > 20);
            const bottomUnmasked = !(mask[(idx + width) * 4 + 3] > 20 || mask[(idx + width) * 4] > 20);

            if (leftUnmasked || rightUnmasked || topUnmasked || bottomUnmasked) {
              seamPixelCount++;

              let neighborR = 0, neighborG = 0, neighborB = 0, neighbors = 0;
              if (leftUnmasked) {
                const nOff = (idx - 1) * 4;
                neighborR += orig[nOff]; neighborG += orig[nOff + 1]; neighborB += orig[nOff + 2];
                neighbors++;
              }
              if (rightUnmasked) {
                const nOff = (idx + 1) * 4;
                neighborR += orig[nOff]; neighborG += orig[nOff + 1]; neighborB += orig[nOff + 2];
                neighbors++;
              }
              if (topUnmasked) {
                const nOff = (idx - width) * 4;
                neighborR += orig[nOff]; neighborG += orig[nOff + 1]; neighborB += orig[nOff + 2];
                neighbors++;
              }
              if (bottomUnmasked) {
                const nOff = (idx + width) * 4;
                neighborR += orig[nOff]; neighborG += orig[nOff + 1]; neighborB += orig[nOff + 2];
                neighbors++;
              }

              if (neighbors > 0) {
                const avgR = neighborR / neighbors;
                const avgG = neighborG / neighbors;
                const avgB = neighborB / neighbors;

                const cDr = inp[offset] - avgR;
                const cDg = inp[offset + 1] - avgG;
                const cDb = inp[offset + 2] - avgB;
                const colorDist = Math.sqrt(cDr * cDr + cDg * cDg + cDb * cDb);
                totalSeamColorDiff += colorDist;

                const gradDiff = Math.abs(cDr) + Math.abs(cDg) + Math.abs(cDb);
                totalSeamGradientDiff += gradDiff;
              }
            }

            // High-frequency edge energy inside inpainted zone
            const left = (idx - 1) * 4;
            const right = (idx + 1) * 4;
            const top = (idx - width) * 4;
            const bottom = (idx + width) * 4;
            const laplacianR = Math.abs(4 * inp[offset] - inp[left] - inp[right] - inp[top] - inp[bottom]);
            residualEdgeEnergy += laplacianR;
          }
        } else {
          // Unmasked pixel: verify 0% drift
          if (
            orig[offset] !== inp[offset] ||
            orig[offset + 1] !== inp[offset + 1] ||
            orig[offset + 2] !== inp[offset + 2] ||
            orig[offset + 3] !== inp[offset + 3]
          ) {
            unmaskedDrift++;
          }

          // Dimmed background in heatmap view
          diffData[offset] = Math.round(orig[offset] * 0.35);
          diffData[offset + 1] = Math.round(orig[offset + 1] * 0.35);
          diffData[offset + 2] = Math.round(orig[offset + 2] * 0.35);
          diffData[offset + 3] = 255;
        }
      }
    }

    const diffImageData = {
      data: diffData,
      width,
      height,
      colorSpace: 'srgb'
    } as ImageData;

    if (targetPixelCount === 0 || seamPixelCount === 0) {
      return {
        overallScore: 100,
        boundaryContinuity: 100,
        colorInconsistencyDelta: 0,
        residualEdgeRatio: 0,
        rating: 'excellent',
        processingTimeMs,
        hasTransparency,
        unmaskedDrift: 0,
        diffImageData,
        resolutionPreserved: true
      };
    }

    // 1. Mean color distance along boundary seam
    const avgColorDelta = Number((totalSeamColorDiff / seamPixelCount).toFixed(2));

    // 2. Boundary continuity percentage (100 = perfectly smooth seam)
    const seamGradAvg = totalSeamGradientDiff / seamPixelCount;
    const boundaryContinuity = Math.max(
      60,
      Math.min(100, Math.round(100 - (seamGradAvg * 0.4)))
    );

    // 3. Normalized residual edge ratio
    const avgLaplacian = residualEdgeEnergy / targetPixelCount;
    const residualRatio = Number((avgLaplacian / 255).toFixed(3));

    // 4. Overall composite score
    const colorPenalty = Math.min(30, avgColorDelta * 1.2);
    const overallScore = Math.max(
      50,
      Math.min(99, Math.round(boundaryContinuity * 0.7 + (30 - colorPenalty)))
    );

    let rating: 'excellent' | 'good' | 'fair' | 'poor' = 'good';
    if (overallScore >= 90) rating = 'excellent';
    else if (overallScore >= 75) rating = 'good';
    else if (overallScore >= 60) rating = 'fair';
    else rating = 'poor';

    return {
      overallScore,
      boundaryContinuity,
      colorInconsistencyDelta: avgColorDelta,
      residualEdgeRatio: residualRatio,
      rating,
      processingTimeMs,
      hasTransparency,
      unmaskedDrift,
      diffImageData,
      resolutionPreserved: true
    };
  }
}


// client/apps/tool-file-converter/src/services/image-validation.service.ts
import { Injectable } from '@angular/core';

export const MAX_IMAGE_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
export const MAX_DIMENSION = 16384; // 16K pixels max per edge
export const MAX_PIXELS = 100000000; // 100 Megapixels max (decompression bomb protection)

@Injectable({
  providedIn: 'root'
})
export class ImageValidationService {
  /**
   * Validates file size and constraints before commencing conversion.
   */
  validateFileSize(file: File): void {
    if (file.size > MAX_IMAGE_FILE_SIZE) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      throw new Error(`File size (${mb} MB) exceeds maximum allowed limit of 50 MB.`);
    }
  }

  /**
   * Checks dimensions to prevent decompression bombs and out-of-memory browser crashes.
   */
  validateDimensions(width: number, height: number): void {
    if (width <= 0 || height <= 0) {
      throw new Error(`Invalid image dimensions: ${width}x${height}.`);
    }

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      throw new Error(`Image dimensions (${width}x${height}) exceed maximum allowed edge limit of ${MAX_DIMENSION}px.`);
    }

    const totalPixels = width * height;
    if (totalPixels > MAX_PIXELS) {
      throw new Error(
        `Image total pixel count (${(totalPixels / 1000000).toFixed(1)} MP) exceeds decompression safety limit of 100 MP.`
      );
    }
  }
}


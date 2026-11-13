// apps/tool-watermark-remover/src/services/image-validation.service.ts
import { Injectable } from '@angular/core';

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_EDGE_DIMENSION = 8192; // 8K max edge
export const MAX_TOTAL_PIXELS = 64_000_000; // 64 MP decompression safeguard
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ImageValidationService {

  validateFile(file: File): ValidationResult {
    // 1. Check file existence
    if (!file) {
      return { valid: false, error: 'No file provided.' };
    }

    // 2. Check format extension & MIME type
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const isExtensionAllowed = ALLOWED_EXTENSIONS.includes(ext);
    const isMimeAllowed = !file.type || ALLOWED_MIME_TYPES.includes(file.type.toLowerCase());

    if (!isExtensionAllowed && !isMimeAllowed) {
      return {
        valid: false,
        error: `Unsupported format ".${ext}". Please upload a JPG, PNG, or WebP image.`
      };
    }

    // 3. Check file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      return {
        valid: false,
        error: `Image size (${sizeMb} MB) exceeds maximum allowed limit of 50 MB.`
      };
    }

    if (file.size === 0) {
      return {
        valid: false,
        error: 'The uploaded file is empty (0 bytes).'
      };
    }

    return { valid: true };
  }

  validateDimensions(width: number, height: number): ValidationResult {
    if (width <= 0 || height <= 0) {
      return {
        valid: false,
        error: `Invalid image dimensions (${width}x${height}).`
      };
    }

    if (width > MAX_EDGE_DIMENSION || height > MAX_EDGE_DIMENSION) {
      return {
        valid: false,
        error: `Image resolution (${width}x${height}) exceeds maximum limit of ${MAX_EDGE_DIMENSION}px per edge.`
      };
    }

    const totalPixels = width * height;
    if (totalPixels > MAX_TOTAL_PIXELS) {
      const mp = (totalPixels / 1_000_000).toFixed(1);
      return {
        valid: false,
        error: `Image resolution (${mp} Megapixels) exceeds decompression safety limit of 64 MP.`
      };
    }

    return { valid: true };
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}


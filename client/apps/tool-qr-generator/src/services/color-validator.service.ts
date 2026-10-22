// client/apps/tool-qr-generator/src/services/color-validator.service.ts
import { Injectable } from '@angular/core';
import { ContrastCheckResult } from '../models/qr-generator.models';

const CONTRAST_WARNING_THRESHOLD = 2.5;

@Injectable({
  providedIn: 'root'
})
export class ColorValidatorService {
  /**
   * Validates whether a given string is a valid 3-character or 6-character hex color.
   */
  isValidHex(color: string): boolean {
    if (!color) return false;
    const clean = color.trim().replace(/^#/, '');
    return /^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(clean);
  }

  /**
   * Normalizes any valid hex string to uppercase 6-digit #RRGGBB format.
   */
  normalizeHex(color: string): string {
    const clean = color.trim().replace(/^#/, '');
    if (clean.length === 3) {
      const full = clean
        .split('')
        .map((char) => char + char)
        .join('');
      return `#${full.toUpperCase()}`;
    }
    return `#${clean.toUpperCase()}`;
  }

  /**
   * Converts a hex color string into RGB channel values (0-255).
   */
  hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    if (!this.isValidHex(hex)) return null;

    const normalized = this.normalizeHex(hex).replace(/^#/, '');
    const num = parseInt(normalized, 16);

    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  /**
   * Calculates WCAG relative luminance for an sRGB channel triplet.
   */
  relativeLuminance(r: number, g: number, b: number): number {
    const transform = (val: number): number => {
      const s = val / 255;
      return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };

    const rLum = transform(r);
    const gLum = transform(g);
    const bLum = transform(b);

    return 0.2126 * rLum + 0.7152 * gLum + 0.0722 * bLum;
  }

  /**
   * Calculates the WCAG contrast ratio between two hex colors (range 1:1 to 21:1).
   */
  contrastRatio(fg: string, bg: string): number {
    const rgb1 = this.hexToRgb(fg);
    const rgb2 = this.hexToRgb(bg);

    if (!rgb1 || !rgb2) return 1.0;

    const lum1 = this.relativeLuminance(rgb1.r, rgb1.g, rgb1.b);
    const lum2 = this.relativeLuminance(rgb2.r, rgb2.g, rgb2.b);

    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);

    const ratio = (lighter + 0.05) / (darker + 0.05);
    return Math.round(ratio * 100) / 100;
  }

  /**
   * Returns true if the contrast ratio between foreground and background is below the threshold (< 2.5:1).
   */
  hasLowContrast(fg: string, bg: string, threshold = CONTRAST_WARNING_THRESHOLD): boolean {
    return this.contrastRatio(fg, bg) < threshold;
  }

  /**
   * Full contrast audit returning ratio, compliance tier, and warning text.
   */
  checkContrast(fg: string, bg: string): ContrastCheckResult {
    const ratio = this.contrastRatio(fg, bg);
    const isLow = ratio < CONTRAST_WARNING_THRESHOLD;

    let level: 'AAA' | 'AA' | 'FAIL' = 'FAIL';
    if (ratio >= 7.0) {
      level = 'AAA';
    } else if (ratio >= 4.5) {
      level = 'AA';
    }

    return {
      ratio,
      hasLowContrast: isLow,
      level,
      warningMessage: isLow
        ? 'Low contrast (< 2.5:1). Cameras and barcode scanners may fail to scan this code reliably.'
        : undefined
    };
  }
}

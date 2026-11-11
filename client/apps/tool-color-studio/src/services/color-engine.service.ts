// apps/tool-color-studio/src/services/color-engine.service.ts
import { Injectable } from '@angular/core';
import {
  RgbColor,
  HslColor,
  HsvColor,
  CmykColor,
  ColorObject,
  WcagCompliance,
  PaletteHarmony,
  ColorBlindnessType,
  ColorBlindnessInfo,
  ExtractedColor
} from '../models/color.models';

export const COLOR_BLINDNESS_PROFILES: ColorBlindnessInfo[] = [
  {
    type: 'protanopia',
    title: 'Protanopia',
    subtitle: 'Red-blind (L-cone absent)',
    prevalence: '~1.3% of males',
    description: 'Reds appear dark brown, golden, or gray. Red and green are confused.'
  },
  {
    type: 'protanomaly',
    title: 'Protanomaly',
    subtitle: 'Red-weak (L-cone shifted)',
    prevalence: '~1.3% of males',
    description: 'Reduced sensitivity to red light; colors look more yellow or dull.'
  },
  {
    type: 'deuteranopia',
    title: 'Deuteranopia',
    subtitle: 'Green-blind (M-cone absent)',
    prevalence: '~1.2% of males',
    description: 'Greens appear beige or brownish. The most common complete red-green blindness.'
  },
  {
    type: 'deuteranomaly',
    title: 'Deuteranomaly',
    subtitle: 'Green-weak (M-cone shifted)',
    prevalence: '~5.0% of males',
    description: 'Most common overall color vision deficiency. Greens shift towards yellow/gray.'
  },
  {
    type: 'tritanopia',
    title: 'Tritanopia',
    subtitle: 'Blue-blind (S-cone absent)',
    prevalence: '~0.001% of population',
    description: 'Blues appear greenish; yellows look violet or light gray.'
  },
  {
    type: 'tritanomaly',
    title: 'Tritanomaly',
    subtitle: 'Blue-weak (S-cone shifted)',
    prevalence: '~0.01% of population',
    description: 'Reduced discrimination between blue and green shades.'
  },
  {
    type: 'achromatopsia',
    title: 'Achromatopsia',
    subtitle: 'Total color blindness (monochromacy)',
    prevalence: '~0.003% of population',
    description: 'Complete absence of color perception. Vision is exclusively in grayscale.'
  },
  {
    type: 'achromatomaly',
    title: 'Achromatomaly',
    subtitle: 'Partial color blindness',
    prevalence: '~0.001% of population',
    description: 'Extreme desaturation across all color spectrums.'
  }
];

@Injectable({
  providedIn: 'root'
})
export class ColorEngineService {

  // ── 1. Color Parsing & Normalization ──────────────────────────────────────

  public parseColor(input: string, fallback = '#E11D48'): ColorObject {
    if (!input || typeof input !== 'string') {
      return this.fromHex(fallback);
    }
    const clean = input.trim();

    // 1. Hex: #rgb, #rgba, #rrggbb, #rrggbbaa
    if (clean.startsWith('#')) {
      if (this.isValidHex(clean)) {
        return this.fromRgb(this.hexToRgb(clean));
      }
      return this.fromHex(fallback);
    }

    // 2. rgb(...) / rgba(...)
    if (clean.toLowerCase().startsWith('rgb')) {
      const match = clean.match(/rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i);
      if (match) {
        return this.fromRgb({
          r: this.clamp(parseFloat(match[1]), 0, 255),
          g: this.clamp(parseFloat(match[2]), 0, 255),
          b: this.clamp(parseFloat(match[3]), 0, 255),
          a: match[4] !== undefined ? this.clamp(parseFloat(match[4]), 0, 1) : 1
        });
      }
    }

    // 3. hsl(...) / hsla(...)
    if (clean.toLowerCase().startsWith('hsl')) {
      const match = clean.match(/hsla?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?(?:\s*,\s*([\d.]+))?\s*\)/i);
      if (match) {
        const rgb = this.hslToRgb({
          h: parseFloat(match[1]),
          s: parseFloat(match[2]),
          l: parseFloat(match[3]),
          a: match[4] !== undefined ? this.clamp(parseFloat(match[4]), 0, 1) : 1
        });
        return this.fromRgb(rgb);
      }
    }

    // 4. Raw Hex without '#'
    if (this.isValidHex('#' + clean)) {
      return this.fromRgb(this.hexToRgb('#' + clean));
    }

    return this.fromHex(fallback);
  }

  public fromHex(hex: string): ColorObject {
    const rgb = this.hexToRgb(hex);
    return this.fromRgb(rgb);
  }

  public fromRgb(rgb: RgbColor): ColorObject {
    const r = Math.round(this.clamp(rgb.r ?? 0, 0, 255));
    const g = Math.round(this.clamp(rgb.g ?? 0, 0, 255));
    const b = Math.round(this.clamp(rgb.b ?? 0, 0, 255));
    const a = rgb.a !== undefined ? this.clamp(rgb.a, 0, 1) : 1;

    const normalizedRgb: RgbColor = { r, g, b, a };
    const hex = this.rgbToHex(normalizedRgb, a < 1);
    const hsl = this.rgbToHsl(normalizedRgb);
    const hsv = this.rgbToHsv(normalizedRgb);
    const cmyk = this.rgbToCmyk(normalizedRgb);
    const luminance = this.getRelativeLuminance(normalizedRgb);
    const isDark = luminance < 0.45;

    const rgbString = a < 1 ? `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})` : `rgb(${r}, ${g}, ${b})`;
    const hslString = a < 1 ? `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${a.toFixed(2)})` : `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    const hsvString = `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`;
    const cmykString = `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`;

    return {
      hex,
      rgb: normalizedRgb,
      hsl,
      hsv,
      cmyk,
      luminance,
      isDark,
      rgbString,
      hslString,
      hsvString,
      cmykString
    };
  }

  public fromHsl(hsl: HslColor): ColorObject {
    const h = (((hsl.h ?? 0) % 360) + 360) % 360;
    const s = Math.round(this.clamp(hsl.s ?? 0, 0, 100));
    const l = Math.round(this.clamp(hsl.l ?? 0, 0, 100));
    const a = hsl.a !== undefined ? this.clamp(hsl.a, 0, 1) : 1;
    const rgb = this.hslToRgb({ h, s, l, a });
    const obj = this.fromRgb(rgb);
    return {
      ...obj,
      hsl: { h, s, l, a }
    };
  }

  public fromHsv(hsv: HsvColor): ColorObject {
    const h = (((hsv.h ?? 0) % 360) + 360) % 360;
    const s = Math.round(this.clamp(hsv.s ?? 0, 0, 100));
    const v = Math.round(this.clamp(hsv.v ?? 0, 0, 100));
    const a = hsv.a !== undefined ? this.clamp(hsv.a, 0, 1) : 1;
    const rgb = this.hsvToRgb({ h, s, v, a });
    const obj = this.fromRgb(rgb);
    return {
      ...obj,
      hsv: { h, s, v, a }
    };
  }

  public fromCmyk(cmyk: CmykColor): ColorObject {
    const c = Math.round(this.clamp(cmyk.c ?? 0, 0, 100));
    const m = Math.round(this.clamp(cmyk.m ?? 0, 0, 100));
    const y = Math.round(this.clamp(cmyk.y ?? 0, 0, 100));
    const k = Math.round(this.clamp(cmyk.k ?? 0, 0, 100));
    const rgb = this.cmykToRgb({ c, m, y, k });
    const obj = this.fromRgb(rgb);
    return {
      ...obj,
      cmyk: { c, m, y, k }
    };
  }

  // ── 2. Color Conversion Primitives ────────────────────────────────────────

  /**
   * Converts a HEX string to RGB object.
   * Supports shorthand (#RGB, #RGBA), standard (#RRGGBB), and with alpha (#RRGGBBAA).
   */
  public hexToRgb(hex: string): RgbColor {
    if (!hex || typeof hex !== 'string') {
      return { r: 0, g: 0, b: 0, a: 1 };
    }
    let clean = hex.replace(/^#/, '').trim();
    if (!/^[0-9a-fA-F]+$/.test(clean)) {
      return { r: 0, g: 0, b: 0, a: 1 };
    }

    // Shorthand #RGB -> RRGGBB
    if (clean.length === 3) {
      clean = clean.split('').map(c => c + c).join('');
    }
    // Shorthand #RGBA -> RRGGBBAA
    else if (clean.length === 4) {
      clean = clean.split('').map(c => c + c).join('');
    }

    if (clean.length === 8) {
      const r = parseInt(clean.slice(0, 2), 16);
      const g = parseInt(clean.slice(2, 4), 16);
      const b = parseInt(clean.slice(4, 6), 16);
      const a = Math.round((parseInt(clean.slice(6, 8), 16) / 255) * 1000) / 1000;
      return { r, g, b, a };
    }

    if (clean.length === 6) {
      const r = parseInt(clean.slice(0, 2), 16);
      const g = parseInt(clean.slice(2, 4), 16);
      const b = parseInt(clean.slice(4, 6), 16);
      return { r, g, b, a: 1 };
    }

    return { r: 0, g: 0, b: 0, a: 1 };
  }

  /**
   * Converts an RGB color to standard HEX (#RRGGBB) or 8-digit HEX (#RRGGBBAA).
   */
  public rgbToHex(rgb: RgbColor, includeAlpha = false): string {
    if (!rgb) return '#000000';
    const r = Math.round(this.clamp(rgb.r ?? 0, 0, 255)).toString(16).padStart(2, '0');
    const g = Math.round(this.clamp(rgb.g ?? 0, 0, 255)).toString(16).padStart(2, '0');
    const b = Math.round(this.clamp(rgb.b ?? 0, 0, 255)).toString(16).padStart(2, '0');

    if (includeAlpha || (rgb.a !== undefined && rgb.a < 1)) {
      const aVal = Math.round(this.clamp(rgb.a ?? 1, 0, 1) * 255).toString(16).padStart(2, '0');
      return `#${r}${g}${b}${aVal}`.toUpperCase();
    }
    return `#${r}${g}${b}`.toUpperCase();
  }

  /**
   * Converts RGB to HSL.
   */
  public rgbToHsl(rgb: RgbColor): HslColor {
    const r = this.clamp(rgb.r ?? 0, 0, 255) / 255;
    const g = this.clamp(rgb.g ?? 0, 0, 255) / 255;
    const b = this.clamp(rgb.b ?? 0, 0, 255) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (delta !== 0) {
      s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
      if (max === r) {
        h = ((g - b) / delta) + (g < b ? 6 : 0);
      } else if (max === g) {
        h = ((b - r) / delta) + 2;
      } else {
        h = ((r - g) / delta) + 4;
      }
      h = Math.round(h * 60);
    }

    return {
      h: (h + 360) % 360,
      s: Math.round(s * 100),
      l: Math.round(l * 100),
      a: rgb.a ?? 1
    };
  }

  /**
   * Converts HSL to RGB.
   */
  public hslToRgb(hsl: HslColor): RgbColor {
    const h = (((hsl.h ?? 0) % 360) + 360) % 360 / 360;
    const s = this.clamp(hsl.s ?? 0, 0, 100) / 100;
    const l = this.clamp(hsl.l ?? 0, 0, 100) / 100;

    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l; // Achromatic
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = this.hueToRgb(p, q, h + 1 / 3);
      g = this.hueToRgb(p, q, h);
      b = this.hueToRgb(p, q, h - 1 / 3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
      a: hsl.a ?? 1
    };
  }

  public hslToHex(hsl: HslColor, includeAlpha = false): string {
    return this.rgbToHex(this.hslToRgb(hsl), includeAlpha);
  }

  public hexToHsl(hex: string): HslColor {
    return this.rgbToHsl(this.hexToRgb(hex));
  }

  private hueToRgb(p: number, q: number, t: number): number {
    let normalizedT = t;
    if (normalizedT < 0) normalizedT += 1;
    if (normalizedT > 1) normalizedT -= 1;
    if (normalizedT < 1 / 6) return p + (q - p) * 6 * normalizedT;
    if (normalizedT < 1 / 2) return q;
    if (normalizedT < 2 / 3) return p + (q - p) * (2 / 3 - normalizedT) * 6;
    return p;
  }

  /**
   * Converts RGB to HSV.
   */
  public rgbToHsv(rgb: RgbColor): HsvColor {
    const r = this.clamp(rgb.r ?? 0, 0, 255) / 255;
    const g = this.clamp(rgb.g ?? 0, 0, 255) / 255;
    const b = this.clamp(rgb.b ?? 0, 0, 255) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    const s = max === 0 ? 0 : delta / max;
    const v = max;

    if (delta !== 0) {
      if (max === r) {
        h = ((g - b) / delta) + (g < b ? 6 : 0);
      } else if (max === g) {
        h = ((b - r) / delta) + 2;
      } else {
        h = ((r - g) / delta) + 4;
      }
      h = Math.round(h * 60);
    }

    return {
      h: (h + 360) % 360,
      s: Math.round(s * 100),
      v: Math.round(v * 100),
      a: rgb.a ?? 1
    };
  }

  /**
   * Converts HSV to RGB.
   */
  public hsvToRgb(hsv: HsvColor): RgbColor {
    const h = (((hsv.h ?? 0) % 360) + 360) % 360 / 60;
    const s = this.clamp(hsv.s ?? 0, 0, 100) / 100;
    const v = this.clamp(hsv.v ?? 0, 0, 100) / 100;

    const c = v * s;
    const x = c * (1 - Math.abs((h % 2) - 1));
    const m = v - c;

    let r = 0, g = 0, b = 0;
    if (h >= 0 && h < 1) { r = c; g = x; b = 0; }
    else if (h >= 1 && h < 2) { r = x; g = c; b = 0; }
    else if (h >= 2 && h < 3) { r = 0; g = c; b = x; }
    else if (h >= 3 && h < 4) { r = 0; g = x; b = c; }
    else if (h >= 4 && h < 5) { r = x; g = 0; b = c; }
    else if (h >= 5 && h < 6) { r = c; g = 0; b = x; }

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
      a: hsv.a ?? 1
    };
  }

  public hexToHsv(hex: string): HsvColor {
    return this.rgbToHsv(this.hexToRgb(hex));
  }

  public hsvToHex(hsv: HsvColor, includeAlpha = false): string {
    return this.rgbToHex(this.hsvToRgb(hsv), includeAlpha);
  }

  /**
   * Direct mathematical conversion between HSL and HSV.
   */
  public hslToHsv(hsl: HslColor): HsvColor {
    const h = hsl.h;
    const sL = this.clamp(hsl.s, 0, 100) / 100;
    const l = this.clamp(hsl.l, 0, 100) / 100;

    const v = l + sL * Math.min(l, 1 - l);
    const sV = v === 0 ? 0 : 2 * (1 - l / v);

    return {
      h,
      s: Math.round(sV * 100),
      v: Math.round(v * 100),
      a: hsl.a ?? 1
    };
  }

  public hsvToHsl(hsv: HsvColor): HslColor {
    const h = hsv.h;
    const sV = this.clamp(hsv.s, 0, 100) / 100;
    const v = this.clamp(hsv.v, 0, 100) / 100;

    const l = v * (1 - sV / 2);
    const sL = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l);

    return {
      h,
      s: Math.round(sL * 100),
      l: Math.round(l * 100),
      a: hsv.a ?? 1
    };
  }

  /**
   * Converts RGB to CMYK.
   */
  public rgbToCmyk(rgb: RgbColor): CmykColor {
    const r = this.clamp(rgb.r ?? 0, 0, 255) / 255;
    const g = this.clamp(rgb.g ?? 0, 0, 255) / 255;
    const b = this.clamp(rgb.b ?? 0, 0, 255) / 255;

    const k = 1 - Math.max(r, g, b);
    if (k === 1) {
      return { c: 0, m: 0, y: 0, k: 100 };
    }

    const c = (1 - r - k) / (1 - k);
    const m = (1 - g - k) / (1 - k);
    const y = (1 - b - k) / (1 - k);

    return {
      c: Math.round(c * 100),
      m: Math.round(m * 100),
      y: Math.round(y * 100),
      k: Math.round(k * 100)
    };
  }

  /**
   * Converts CMYK to RGB.
   */
  public cmykToRgb(cmyk: CmykColor): RgbColor {
    const c = this.clamp(cmyk.c ?? 0, 0, 100) / 100;
    const m = this.clamp(cmyk.m ?? 0, 0, 100) / 100;
    const y = this.clamp(cmyk.y ?? 0, 0, 100) / 100;
    const k = this.clamp(cmyk.k ?? 0, 0, 100) / 100;

    const r = Math.round(255 * (1 - c) * (1 - k));
    const g = Math.round(255 * (1 - m) * (1 - k));
    const b = Math.round(255 * (1 - y) * (1 - k));

    return { r, g, b, a: 1 };
  }

  public hexToCmyk(hex: string): CmykColor {
    return this.rgbToCmyk(this.hexToRgb(hex));
  }

  public cmykToHex(cmyk: CmykColor): string {
    return this.rgbToHex(this.cmykToRgb(cmyk));
  }

  // ── 3. Color Validation & Normalization ────────────────────────────────────

  public isValidHex(hex: string): boolean {
    if (!hex || typeof hex !== 'string') return false;
    const clean = hex.startsWith('#') ? hex.slice(1) : hex;
    return /^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{4}$|^[0-9a-fA-F]{6}$|^[0-9a-fA-F]{8}$/.test(clean);
  }

  public isValidRgb(rgb: any): boolean {
    if (!rgb || typeof rgb !== 'object') return false;
    return (
      typeof rgb.r === 'number' && rgb.r >= 0 && rgb.r <= 255 &&
      typeof rgb.g === 'number' && rgb.g >= 0 && rgb.g <= 255 &&
      typeof rgb.b === 'number' && rgb.b >= 0 && rgb.b <= 255 &&
      (rgb.a === undefined || (typeof rgb.a === 'number' && rgb.a >= 0 && rgb.a <= 1))
    );
  }

  public isValidHsl(hsl: any): boolean {
    if (!hsl || typeof hsl !== 'object') return false;
    return (
      typeof hsl.h === 'number' && hsl.h >= 0 && hsl.h <= 360 &&
      typeof hsl.s === 'number' && hsl.s >= 0 && hsl.s <= 100 &&
      typeof hsl.l === 'number' && hsl.l >= 0 && hsl.l <= 100
    );
  }

  public isValidHsv(hsv: any): boolean {
    if (!hsv || typeof hsv !== 'object') return false;
    return (
      typeof hsv.h === 'number' && hsv.h >= 0 && hsv.h <= 360 &&
      typeof hsv.s === 'number' && hsv.s >= 0 && hsv.s <= 100 &&
      typeof hsv.v === 'number' && hsv.v >= 0 && hsv.v <= 100
    );
  }

  public isValidCmyk(cmyk: any): boolean {
    if (!cmyk || typeof cmyk !== 'object') return false;
    return (
      typeof cmyk.c === 'number' && cmyk.c >= 0 && cmyk.c <= 100 &&
      typeof cmyk.m === 'number' && cmyk.m >= 0 && cmyk.m <= 100 &&
      typeof cmyk.y === 'number' && cmyk.y >= 0 && cmyk.y <= 100 &&
      typeof cmyk.k === 'number' && cmyk.k >= 0 && cmyk.k <= 100
    );
  }

  public isValidColor(input: string): boolean {
    if (!input || typeof input !== 'string') return false;
    const clean = input.trim();
    if (this.isValidHex(clean)) return true;
    if (clean.toLowerCase().startsWith('rgb')) {
      return /^rgba?\s*\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+(?:\s*,\s*[\d.]+)?\s*\)$/i.test(clean);
    }
    if (clean.toLowerCase().startsWith('hsl')) {
      return /^hsla?\s*\(\s*[\d.]+\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?(?:\s*,\s*[\d.]+)?\s*\)$/i.test(clean);
    }
    return false;
  }

  public normalizeHex(hex: string): string {
    if (!hex || typeof hex !== 'string') return '#000000';
    let clean = hex.replace(/^#/, '').trim();
    if (!/^[0-9a-fA-F]+$/.test(clean)) return '#000000';
    if (clean.length === 3 || clean.length === 4) {
      clean = clean.split('').map(c => c + c).join('');
    }
    if (clean.length !== 6 && clean.length !== 8) {
      clean = clean.padEnd(6, '0').slice(0, 6);
    }
    return `#${clean}`.toUpperCase();
  }

  // ── 4. Shared Color Utilities ─────────────────────────────────────────────

  /**
   * Lightens a color by increasing its HSL lightness by a percentage (0-100).
   */
  public lighten(color: string | RgbColor, amountPercent: number): string {
    const rgb = typeof color === 'string' ? this.hexToRgb(color) : color;
    const hsl = this.rgbToHsl(rgb);
    const newL = this.clamp(hsl.l + amountPercent, 0, 100);
    return this.hslToHex({ ...hsl, l: newL });
  }

  /**
   * Darkens a color by decreasing its HSL lightness by a percentage (0-100).
   */
  public darken(color: string | RgbColor, amountPercent: number): string {
    const rgb = typeof color === 'string' ? this.hexToRgb(color) : color;
    const hsl = this.rgbToHsl(rgb);
    const newL = this.clamp(hsl.l - amountPercent, 0, 100);
    return this.hslToHex({ ...hsl, l: newL });
  }

  /**
   * Generates the complementary color (180 degree hue shift).
   */
  public getComplementary(color: string | RgbColor): string {
    const rgb = typeof color === 'string' ? this.hexToRgb(color) : color;
    const hsl = this.rgbToHsl(rgb);
    const newH = (hsl.h + 180) % 360;
    return this.hslToHex({ ...hsl, h: newH });
  }

  /**
   * Calculates relative luminance of an sRGB color per WCAG 2.1 specifications.
   */
  public getRelativeLuminance(rgb: RgbColor): number {
    const srgbTransform = (val: number) => {
      const c = this.clamp(val, 0, 255) / 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };

    const r = srgbTransform(rgb.r ?? 0);
    const g = srgbTransform(rgb.g ?? 0);
    const b = srgbTransform(rgb.b ?? 0);

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Alias for getRelativeLuminance that accepts hex string or RgbColor.
   */
  public calculateLuminance(color: string | RgbColor): number {
    const rgb = typeof color === 'string' ? this.hexToRgb(color) : color;
    return this.getRelativeLuminance(rgb);
  }

  /**
   * Returns true if relative luminance is below 0.45 (dark background requiring light text).
   */
  public isDark(color: string | RgbColor): boolean {
    return this.calculateLuminance(color) < 0.45;
  }

  /**
   * Calculates Euclidean distance in RGB color space (0 - 441.67).
   */
  public calculateRgbDistance(color1: string | RgbColor, color2: string | RgbColor): number {
    const rgb1 = typeof color1 === 'string' ? this.hexToRgb(color1) : color1;
    const rgb2 = typeof color2 === 'string' ? this.hexToRgb(color2) : color2;

    const dR = (rgb1.r ?? 0) - (rgb2.r ?? 0);
    const dG = (rgb1.g ?? 0) - (rgb2.g ?? 0);
    const dB = (rgb1.b ?? 0) - (rgb2.b ?? 0);

    return Math.sqrt(dR * dR + dG * dG + dB * dB);
  }

  /**
   * Generates stepped harmonious color variations around the base color.
   */
  public generateColorVariations(color: string | RgbColor, count = 5): string[] {
    const rgb = typeof color === 'string' ? this.hexToRgb(color) : color;
    const hsl = this.rgbToHsl(rgb);
    const results: string[] = [];
    const step = 40 / Math.max(1, count - 1);

    for (let i = 0; i < count; i++) {
      const offset = (i - Math.floor(count / 2)) * step;
      const l = this.clamp(hsl.l + offset, 10, 95);
      results.push(this.hslToHex({ ...hsl, l: Math.round(l) }));
    }
    return results;
  }

  // ── 5. WCAG 2.1 Contrast Calculations ─────────────────────────────────────

  public getContrastCompliance(fg: string | RgbColor, bg: string | RgbColor): WcagCompliance {
    const fgRgb = typeof fg === 'string' ? this.hexToRgb(fg) : fg;
    const bgRgb = typeof bg === 'string' ? this.hexToRgb(bg) : bg;

    const l1 = this.getRelativeLuminance(fgRgb);
    const l2 = this.getRelativeLuminance(bgRgb);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    const ratio = (lighter + 0.05) / (darker + 0.05);
    const roundedRatio = Math.round(ratio * 100) / 100;

    const aaNormal = ratio >= 4.5;
    const aaLarge = ratio >= 3.0;
    const aaaNormal = ratio >= 7.0;
    const aaaLarge = ratio >= 4.5;
    const uiComponent = ratio >= 3.0;

    let grade: 'AAA' | 'AA' | 'Fail' = 'Fail';
    if (aaaNormal) {
      grade = 'AAA';
    } else if (aaNormal) {
      grade = 'AA';
    }

    return {
      ratio: roundedRatio,
      ratioString: `${roundedRatio.toFixed(2)}:1`,
      aaNormal,
      aaLarge,
      aaaNormal,
      aaaLarge,
      uiComponent,
      grade
    };
  }

  public autoFixContrast(fgHex: string, bgHex: string, targetGrade: 'AA' | 'AAA' = 'AA'): { fg: string; bg: string; ratio: number } {
    const targetRatio = targetGrade === 'AAA' ? 7.0 : 4.5;
    const current = this.getContrastCompliance(fgHex, bgHex);
    if (current.ratio >= targetRatio) {
      return { fg: fgHex, bg: bgHex, ratio: current.ratio };
    }

    const bgRgb = this.hexToRgb(bgHex);
    const bgLum = this.getRelativeLuminance(bgRgb);
    const fgHsl = this.rgbToHsl(this.hexToRgb(fgHex));
    const adjustedFg = { ...fgHsl };

    if (bgLum > 0.5) {
      for (let l = fgHsl.l; l >= 0; l -= 2) {
        adjustedFg.l = l;
        const testHex = this.hslToHex(adjustedFg);
        const testRatio = this.getContrastCompliance(testHex, bgHex).ratio;
        if (testRatio >= targetRatio) {
          return { fg: testHex, bg: bgHex, ratio: testRatio };
        }
      }
      return { fg: '#000000', bg: bgHex, ratio: this.getContrastCompliance('#000000', bgHex).ratio };
    } else {
      for (let l = fgHsl.l; l <= 100; l += 2) {
        adjustedFg.l = l;
        const testHex = this.hslToHex(adjustedFg);
        const testRatio = this.getContrastCompliance(testHex, bgHex).ratio;
        if (testRatio >= targetRatio) {
          return { fg: testHex, bg: bgHex, ratio: testRatio };
        }
      }
      return { fg: '#FFFFFF', bg: bgHex, ratio: this.getContrastCompliance('#FFFFFF', bgHex).ratio };
    }
  }

  // ── 6. Harmonies & Shades / Tints ─────────────────────────────────────────

  public generateHarmonies(baseHex: string, harmony: PaletteHarmony): string[] {
    const hsl = this.rgbToHsl(this.hexToRgb(baseHex));
    const h = hsl.h;
    const s = hsl.s;
    const l = hsl.l;

    const makeHex = (newH: number, newS = s, newL = l) => {
      const normalizedH = ((newH % 360) + 360) % 360;
      return this.hslToHex({ h: normalizedH, s: newS, l: newL });
    };

    switch (harmony) {
      case 'complementary':
        return [
          baseHex,
          makeHex(h + 180),
          makeHex(h, s, Math.min(92, l + 20)),
          makeHex(h + 180, s, Math.min(92, l + 20)),
          makeHex(h, s, Math.max(12, l - 20))
        ];

      case 'analogous':
        return [
          makeHex(h - 30),
          makeHex(h - 15),
          baseHex,
          makeHex(h + 15),
          makeHex(h + 30)
        ];

      case 'triadic':
        return [
          baseHex,
          makeHex(h + 120),
          makeHex(h + 240),
          makeHex(h + 120, s, Math.min(90, l + 20)),
          makeHex(h + 240, s, Math.max(15, l - 20))
        ];

      case 'tetradic':
        return [
          baseHex,
          makeHex(h + 60),
          makeHex(h + 180),
          makeHex(h + 240),
          makeHex(h, s, Math.max(15, l - 15))
        ];

      case 'split-complementary':
        return [
          baseHex,
          makeHex(h + 150),
          makeHex(h + 210),
          makeHex(h + 150, s, Math.min(90, l + 15)),
          makeHex(h + 210, s, Math.max(15, l - 15))
        ];

      case 'square':
        return [
          baseHex,
          makeHex(h + 90),
          makeHex(h + 180),
          makeHex(h + 270),
          makeHex(h, s, Math.max(15, l - 15))
        ];

      case 'shades-tints':
        return [
          makeHex(h, s, Math.max(8, l - 35)),
          makeHex(h, s, Math.max(15, l - 18)),
          baseHex,
          makeHex(h, s, Math.min(88, l + 18)),
          makeHex(h, s, Math.min(96, l + 35))
        ];

      case 'monochromatic':
        return [
          makeHex(h, s, Math.max(15, l - 30)),
          makeHex(h, s, Math.max(20, l - 15)),
          baseHex,
          makeHex(h, Math.max(10, s - 20), Math.min(85, l + 15)),
          makeHex(h, Math.max(10, s - 30), Math.min(95, l + 30))
        ];

      default:
        return [baseHex];
    }
  }

  public getAllHarmonies(baseHex: string): Record<PaletteHarmony, string[]> {
    return {
      complementary: this.generateHarmonies(baseHex, 'complementary'),
      analogous: this.generateHarmonies(baseHex, 'analogous'),
      triadic: this.generateHarmonies(baseHex, 'triadic'),
      tetradic: this.generateHarmonies(baseHex, 'tetradic'),
      'split-complementary': this.generateHarmonies(baseHex, 'split-complementary'),
      square: this.generateHarmonies(baseHex, 'square'),
      monochromatic: this.generateHarmonies(baseHex, 'monochromatic'),
      'shades-tints': this.generateHarmonies(baseHex, 'shades-tints')
    };
  }

  public generateShadesAndTints(baseHex: string, count = 6): { tints: string[]; shades: string[] } {
    const hsl = this.rgbToHsl(this.hexToRgb(baseHex));
    const tints: string[] = [];
    const shades: string[] = [];

    // Tints (towards white)
    for (let i = 1; i <= count; i++) {
      const stepL = hsl.l + ((100 - hsl.l) * (i / (count + 1)));
      tints.push(this.hslToHex({ h: hsl.h, s: hsl.s, l: Math.round(stepL) }));
    }

    // Shades (towards black)
    for (let i = 1; i <= count; i++) {
      const stepL = hsl.l - (hsl.l * (i / (count + 1)));
      shades.push(this.hslToHex({ h: hsl.h, s: hsl.s, l: Math.round(stepL) }));
    }

    return { tints, shades };
  }

  // ── 7. Color Blindness Transformation Matrices ─────────────────────────────

  public simulateColorBlindness(hex: string, type: ColorBlindnessType): string {
    const rgb = this.hexToRgb(hex);

    // Linearize sRGB to linear RGB (0..1)
    const toLinear = (c: number) => {
      const v = c / 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };

    const linR = toLinear(rgb.r);
    const linG = toLinear(rgb.g);
    const linB = toLinear(rgb.b);

    let simR = linR, simG = linG, simB = linB;

    switch (type) {
      case 'protanopia':
        simR = 0.56667 * linR + 0.43333 * linG;
        simG = 0.55833 * linR + 0.44167 * linG;
        simB = 0.24167 * linG + 0.75833 * linB;
        break;
      case 'protanomaly':
        simR = 0.81667 * linR + 0.18333 * linG;
        simG = 0.33333 * linR + 0.66667 * linG;
        simB = 0.12500 * linG + 0.87500 * linB;
        break;
      case 'deuteranopia':
        simR = 0.625 * linR + 0.375 * linG;
        simG = 0.700 * linR + 0.300 * linG;
        simB = 0.300 * linG + 0.700 * linB;
        break;
      case 'deuteranomaly':
        simR = 0.80 * linR + 0.20 * linG;
        simG = 0.25833 * linR + 0.74167 * linG;
        simB = 0.14167 * linG + 0.85833 * linB;
        break;
      case 'tritanopia':
        simR = 0.95 * linR + 0.05 * linG;
        simG = 0.43333 * linG + 0.56667 * linB;
        simB = 0.475 * linG + 0.525 * linB;
        break;
      case 'tritanomaly':
        simR = 0.96667 * linR + 0.03333 * linG;
        simG = 0.73333 * linG + 0.26667 * linB;
        simB = 0.18333 * linG + 0.81667 * linB;
        break;
      case 'achromatopsia': {
        const gray = 0.299 * linR + 0.587 * linG + 0.114 * linB;
        simR = simG = simB = gray;
        break;
      }
      case 'achromatomaly': {
        const mono = 0.299 * linR + 0.587 * linG + 0.114 * linB;
        simR = 0.618 * linR + 0.382 * mono;
        simG = 0.618 * linG + 0.382 * mono;
        simB = 0.618 * linB + 0.382 * mono;
        break;
      }
    }

    // Convert back from linear RGB to non-linear sRGB (0..255)
    const toSrgb = (v: number) => {
      const clamped = this.clamp(v, 0, 1);
      const s = clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
      return Math.round(this.clamp(s * 255, 0, 255));
    };

    return this.rgbToHex({
      r: toSrgb(simR),
      g: toSrgb(simG),
      b: toSrgb(simB),
      a: rgb.a
    });
  }

  // ── 8. In-Browser Image Quantization ──────────────────────────────────────

  public extractColorsFromImageData(imageData: ImageData, maxColors = 8): ExtractedColor[] {
    const { data, width, height } = imageData;
    const colorBuckets = new Map<string, { r: number; g: number; b: number; count: number }>();
    const step = Math.max(1, Math.floor((width * height) / 8000));
    let totalSamples = 0;

    for (let i = 0; i < data.length; i += 4 * step) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a < 128) continue; // Skip transparent pixels

      const qR = Math.round(r / 8) * 8;
      const qG = Math.round(g / 8) * 8;
      const qB = Math.round(b / 8) * 8;
      const key = `${qR},${qG},${qB}`;

      const existing = colorBuckets.get(key);
      if (existing) {
        existing.r += r;
        existing.g += g;
        existing.b += b;
        existing.count++;
      } else {
        colorBuckets.set(key, { r, g, b, count: 1 });
      }
      totalSamples++;
    }

    if (totalSamples === 0 || colorBuckets.size === 0) {
      return [];
    }

    const sortedBuckets = Array.from(colorBuckets.values())
      .map(bucket => ({
        rgb: {
          r: Math.round(bucket.r / bucket.count),
          g: Math.round(bucket.g / bucket.count),
          b: Math.round(bucket.b / bucket.count)
        },
        count: bucket.count
      }))
      .sort((a, b) => b.count - a.count);

    const distinctColors: Array<{ rgb: RgbColor; count: number }> = [];
    const minDistance = maxColors >= 16 ? 14 : maxColors >= 12 ? 18 : maxColors >= 10 ? 20 : 24;

    for (const item of sortedBuckets) {
      const isTooClose = distinctColors.some(existing => {
        const dR = existing.rgb.r - item.rgb.r;
        const dG = existing.rgb.g - item.rgb.g;
        const dB = existing.rgb.b - item.rgb.b;
        return Math.sqrt(dR * dR + dG * dG + dB * dB) < minDistance;
      });

      if (!isTooClose) {
        distinctColors.push(item);
        if (distinctColors.length >= maxColors) break;
      }
    }

    // Secondary pass with relaxed distance threshold if we haven't reached maxColors yet
    if (distinctColors.length < maxColors && sortedBuckets.length > distinctColors.length) {
      const relaxedDistance = Math.max(8, Math.round(minDistance / 2));
      for (const item of sortedBuckets) {
        if (distinctColors.some(d => d === item)) continue;
        const isTooClose = distinctColors.some(existing => {
          const dR = existing.rgb.r - item.rgb.r;
          const dG = existing.rgb.g - item.rgb.g;
          const dB = existing.rgb.b - item.rgb.b;
          return Math.sqrt(dR * dR + dG * dG + dB * dB) < relaxedDistance;
        });

        if (!isTooClose) {
          distinctColors.push(item);
          if (distinctColors.length >= maxColors) break;
        }
      }
    }

    const safeTotal = totalSamples > 0 ? totalSamples : 1;
    return distinctColors.map((c, index) => {
      const hex = this.rgbToHex(c.rgb);
      const luminance = this.getRelativeLuminance(c.rgb);
      const percentage = Math.min(100, Math.max(1, Math.round((c.count / safeTotal) * 100)));
      return {
        hex,
        rgb: c.rgb,
        percentage,
        isLight: luminance > 0.45,
        label: index === 0 ? 'Dominant' : `Accent ${index}`
      };
    });
  }

  // ── Helper ────────────────────────────────────────────────────────────────

  private clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val));
  }
}

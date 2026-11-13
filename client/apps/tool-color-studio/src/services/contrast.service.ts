// apps/tool-color-studio/src/services/contrast.service.ts
import { Injectable, inject } from '@angular/core';
import { ColorEngineService } from './color-engine.service';
import {
  RgbColor,
  WcagCompliance,
  WcagRating,
  DetailedContrastResult,
  ContrastSuggestion
} from '../models/color.models';

export interface GradientContrastReport {
  minRatio: number;
  maxRatio: number;
  avgRatio: number;
  allStopsPassAA: boolean;
  allStopsPassAAA: boolean;
  stopResults: {
    stopId?: string;
    color: string;
    position: number;
    ratio: number;
    passAA: boolean;
    passAAA: boolean;
  }[];
  warning: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ContrastService {
  private engine: ColorEngineService = (() => {
    try {
      return inject(ColorEngineService);
    } catch {
      return new ColorEngineService();
    }
  })();

  /**
   * Calculates the relative luminance of an sRGB color per WCAG 2.2 specifications.
   */
  public calculateLuminance(color: string | RgbColor): number {
    const rgb = typeof color === 'string' ? this.engine.hexToRgb(color) : color;
    return this.engine.getRelativeLuminance(rgb);
  }

  /**
   * Composites a foreground color with potential alpha transparency over a background color.
   * If the background is also semi-transparent, composites background over white (#FFFFFF) first.
   */
  public compositeColor(
    fg: string | RgbColor,
    bg: string | RgbColor
  ): RgbColor {
    const fgRgb = typeof fg === 'string' ? this.engine.hexToRgb(fg) : { ...fg };
    const bgRgb = typeof bg === 'string' ? this.engine.hexToRgb(bg) : { ...bg };

    const aFg = fgRgb.a !== undefined ? Math.max(0, Math.min(1, fgRgb.a)) : 1;
    const aBg = bgRgb.a !== undefined ? Math.max(0, Math.min(1, bgRgb.a)) : 1;

    // If FG is fully opaque, no compositing needed
    if (aFg === 1 && aBg === 1) {
      return { r: fgRgb.r, g: fgRgb.g, b: fgRgb.b, a: 1 };
    }

    // Composite BG over opaque white first if BG has alpha
    const bgCompR = bgRgb.r * aBg + 255 * (1 - aBg);
    const bgCompG = bgRgb.g * aBg + 255 * (1 - aBg);
    const bgCompB = bgRgb.b * aBg + 255 * (1 - aBg);

    // Composite FG over the effective background
    const r = Math.round(fgRgb.r * aFg + bgCompR * (1 - aFg));
    const g = Math.round(fgRgb.g * aFg + bgCompG * (1 - aFg));
    const b = Math.round(fgRgb.b * aFg + bgCompB * (1 - aFg));

    return {
      r: Math.max(0, Math.min(255, r)),
      g: Math.max(0, Math.min(255, g)),
      b: Math.max(0, Math.min(255, b)),
      a: 1
    };
  }

  /**
   * Alias for compositeColor.
   */
  public compositeOver(
    fg: string | RgbColor,
    bg: string | RgbColor
  ): RgbColor {
    return this.compositeColor(fg, bg);
  }

  /**
   * Calculates the exact WCAG contrast ratio between foreground and background.
   * Accurately handles alpha transparency by compositing FG over BG.
   * Supports values from 1.00:1 to 21.00:1.
   */
  public calculateContrastRatio(
    fg: string | RgbColor,
    bg: string | RgbColor
  ): number {
    try {
      const compositedFg = this.compositeColor(fg, bg);
      const bgRgb = typeof bg === 'string' ? this.engine.hexToRgb(bg) : bg;

      // Ensure BG is opaque for luminance calculation (composited over white if transparent)
      const effectiveBg = (bgRgb.a !== undefined && bgRgb.a < 1)
        ? this.compositeColor(bgRgb, { r: 255, g: 255, b: 255, a: 1 })
        : bgRgb;

      const l1 = this.calculateLuminance(compositedFg);
      const l2 = this.calculateLuminance(effectiveBg);

      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);

      const ratio = (lighter + 0.05) / (darker + 0.05);
      const clamped = Math.max(1, Math.min(21, ratio));
      return Math.round(clamped * 100) / 100;
    } catch {
      return 1.0;
    }
  }

  /**
   * Evaluates comprehensive WCAG 2.2 accessibility metrics for a color pair.
   */
  public evaluateWcag(
    fgInput: string,
    bgInput: string
  ): DetailedContrastResult {
    const fgClean = this.engine.normalizeHex(fgInput);
    const bgClean = this.engine.normalizeHex(bgInput);

    const fgRgb = this.engine.hexToRgb(fgClean);
    const bgRgb = this.engine.hexToRgb(bgClean);

    const fgLum = this.calculateLuminance(fgRgb);
    const bgLum = this.calculateLuminance(bgRgb);

    const ratio = this.calculateContrastRatio(fgRgb, bgRgb);
    const ratioString = `${ratio.toFixed(2)}:1`;

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

    let rating: WcagRating = 'insufficient';
    let ratingLabel = 'Insufficient contrast';

    if (ratio >= 7.0) {
      rating = 'excellent';
      ratingLabel = 'Excellent contrast';
    } else if (ratio >= 4.5) {
      rating = 'good';
      ratingLabel = 'Good contrast';
    } else if (ratio >= 3.0) {
      rating = 'needs-improvement';
      ratingLabel = 'Needs improvement';
    }

    const suggestions = this.generateSuggestions(fgClean, bgClean);

    return {
      ratio,
      ratioString,
      aaNormal,
      aaLarge,
      aaaNormal,
      aaaLarge,
      uiComponent,
      grade,
      fgHex: fgClean,
      bgHex: bgClean,
      fgLuminance: fgLum,
      bgLuminance: bgLum,
      rating,
      ratingLabel,
      suggestions
    };
  }

  /**
   * Generates mathematically verified accessible color alternatives meeting WCAG standards.
   */
  public generateSuggestions(
    fgHex: string,
    bgHex: string,
    targetGrade: 'AA' | 'AAA' = 'AA'
  ): ContrastSuggestion[] {
    const targetRatio = targetGrade === 'AAA' ? 7.0 : 4.5;
    const currentRatio = this.calculateContrastRatio(fgHex, bgHex);

    // If already meets target threshold, generate suggestions for the higher tier or return empty
    const suggestions: ContrastSuggestion[] = [];

    const fgHsl = this.engine.rgbToHsl(this.engine.hexToRgb(fgHex));
    const bgHsl = this.engine.rgbToHsl(this.engine.hexToRgb(bgHex));
    const bgLum = this.calculateLuminance(bgHex);

    // 1. Darker Foreground Alternative
    for (let l = fgHsl.l - 2; l >= 0; l -= 2) {
      const candidateHex = this.engine.hslToHex({ ...fgHsl, l });
      const testRatio = this.calculateContrastRatio(candidateHex, bgHex);
      if (testRatio >= targetRatio) {
        suggestions.push({
          id: `darker-fg-${targetGrade}`,
          type: 'darker-fg',
          label: `Darker Foreground (${targetGrade})`,
          targetRole: 'fg',
          hex: candidateHex,
          ratio: testRatio,
          ratioString: `${testRatio.toFixed(2)}:1`,
          grade: testRatio >= 7.0 ? 'AAA' : 'AA'
        });
        break;
      }
    }

    // 2. Lighter Foreground Alternative
    for (let l = fgHsl.l + 2; l <= 100; l += 2) {
      const candidateHex = this.engine.hslToHex({ ...fgHsl, l });
      const testRatio = this.calculateContrastRatio(candidateHex, bgHex);
      if (testRatio >= targetRatio) {
        suggestions.push({
          id: `lighter-fg-${targetGrade}`,
          type: 'lighter-fg',
          label: `Lighter Foreground (${targetGrade})`,
          targetRole: 'fg',
          hex: candidateHex,
          ratio: testRatio,
          ratioString: `${testRatio.toFixed(2)}:1`,
          grade: testRatio >= 7.0 ? 'AAA' : 'AA'
        });
        break;
      }
    }

    // 3. Background Alternatives
    if (bgLum > 0.5) {
      // Background is light -> suggest a lighter background or darker background
      for (let l = Math.min(100, bgHsl.l + 3); l <= 100; l += 2) {
        const candidateBg = this.engine.hslToHex({ ...bgHsl, l });
        const testRatio = this.calculateContrastRatio(fgHex, candidateBg);
        if (testRatio >= targetRatio && testRatio > currentRatio) {
          suggestions.push({
            id: `lighter-bg-${targetGrade}`,
            type: 'lighter-bg',
            label: `Lighter Background (${targetGrade})`,
            targetRole: 'bg',
            hex: candidateBg,
            ratio: testRatio,
            ratioString: `${testRatio.toFixed(2)}:1`,
            grade: testRatio >= 7.0 ? 'AAA' : 'AA'
          });
          break;
        }
      }
    } else {
      // Background is dark -> suggest a darker background
      for (let l = Math.max(0, bgHsl.l - 3); l >= 0; l -= 2) {
        const candidateBg = this.engine.hslToHex({ ...bgHsl, l });
        const testRatio = this.calculateContrastRatio(fgHex, candidateBg);
        if (testRatio >= targetRatio && testRatio > currentRatio) {
          suggestions.push({
            id: `darker-bg-${targetGrade}`,
            type: 'darker-bg',
            label: `Darker Background (${targetGrade})`,
            targetRole: 'bg',
            hex: candidateBg,
            ratio: testRatio,
            ratioString: `${testRatio.toFixed(2)}:1`,
            grade: testRatio >= 7.0 ? 'AAA' : 'AA'
          });
          break;
        }
      }
    }

    return suggestions;
  }

  /**
   * Automatically resolves an accessible foreground color that satisfies the target WCAG contrast grade.
   */
  public autoFixContrast(
    fgHex: string,
    bgHex: string,
    targetGrade: 'AA' | 'AAA' = 'AA'
  ): string {
    const suggestions = this.generateSuggestions(fgHex, bgHex, targetGrade);
    const fgSuggestion = suggestions.find(s => s.targetRole === 'fg');
    if (fgSuggestion) {
      return fgSuggestion.hex;
    }
    const bgLum = this.calculateLuminance(bgHex);
    return bgLum > 0.5 ? '#000000' : '#FFFFFF';
  }

  /**
   * Evaluates text contrast against every stop of a CSS gradient background.
   * Warns when text legibility fails across any region of the gradient.
   */
  public evaluateGradientContrast(
    fgHex: string,
    stops: { color: string; position: number; id?: string }[]
  ): GradientContrastReport {
    if (!stops || stops.length === 0) {
      const single = this.calculateContrastRatio(fgHex, '#FFFFFF');
      return {
        minRatio: single,
        maxRatio: single,
        avgRatio: single,
        allStopsPassAA: single >= 4.5,
        allStopsPassAAA: single >= 7.0,
        stopResults: [],
        warning: null
      };
    }

    const stopResults = stops.map(stop => {
      const ratio = this.calculateContrastRatio(fgHex, stop.color);
      return {
        stopId: stop.id,
        color: stop.color,
        position: stop.position,
        ratio,
        passAA: ratio >= 4.5,
        passAAA: ratio >= 7.0
      };
    });

    const ratios = stopResults.map(s => s.ratio);
    const minRatio = Math.min(...ratios);
    const maxRatio = Math.max(...ratios);
    const avgRatio = Math.round((ratios.reduce((a, b) => a + b, 0) / ratios.length) * 100) / 100;

    const allStopsPassAA = minRatio >= 4.5;
    const allStopsPassAAA = minRatio >= 7.0;

    let warning: string | null = null;
    if (!allStopsPassAA) {
      warning = `Warning: A single solid-color contrast result cannot guarantee sufficient contrast across the entire gradient. Text contrast drops to ${minRatio.toFixed(2)}:1 (below WCAG AA 4.5:1 requirement) on some gradient stops.`;
    }

    return {
      minRatio,
      maxRatio,
      avgRatio,
      allStopsPassAA,
      allStopsPassAAA,
      stopResults,
      warning
    };
  }
}


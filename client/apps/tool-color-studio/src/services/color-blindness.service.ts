// apps/tool-color-studio/src/services/color-blindness.service.ts
import { Injectable, inject } from '@angular/core';
import { ColorEngineService } from './color-engine.service';
import { ExportService } from './export.service';
import {
  ColorBlindnessType,
  ColorBlindnessInfo,
  RgbColor,
  SimulatedPaletteItem,
  PaletteConfusionPair,
  PaletteSimulationResult
} from '../models/color.models';

export const CVD_PROFILES: ColorBlindnessInfo[] = [
  {
    type: 'normal',
    title: 'Normal Vision',
    subtitle: 'Standard Trichromacy',
    prevalence: 'Typical vision (92%+)',
    description: 'Standard three-channel cone photopigments with typical spectral sensitivity across long, medium, and short wavelengths.',
    category: 'trichromacy'
  },
  {
    type: 'protanopia',
    title: 'Protanopia',
    subtitle: 'Red-blind (L-cone absent)',
    prevalence: '~1.0% of males, 0.02% of females',
    description: 'Complete absence of long-wavelength (red) sensitive retinal cones. Deep reds appear black, brownish olive, or dark gray.',
    category: 'dichromacy'
  },
  {
    type: 'deuteranopia',
    title: 'Deuteranopia',
    subtitle: 'Green-blind (M-cone absent)',
    prevalence: '~1.1% of males, 0.01% of females',
    description: 'Complete absence of medium-wavelength (green) sensitive retinal cones. Greens appear beige, taupe, or brownish-yellow.',
    category: 'dichromacy'
  },
  {
    type: 'tritanopia',
    title: 'Tritanopia',
    subtitle: 'Blue-blind (S-cone absent)',
    prevalence: '~0.003% of population',
    description: 'Complete absence of short-wavelength (blue) sensitive retinal cones. Blues appear greenish-cyan; yellows look pinkish or light violet.',
    category: 'dichromacy'
  },
  {
    type: 'achromatopsia',
    title: 'Achromatopsia',
    subtitle: 'Total color blindness (Monochromacy)',
    prevalence: '~0.003% of population',
    description: 'Complete absence of functional retinal cone photoreceptors. Visual perception is exclusively mediated by rods in pure grayscale luminance.',
    category: 'monochromacy'
  },
  {
    type: 'protanomaly',
    title: 'Protanomaly',
    subtitle: 'Red-weak (L-cone shifted)',
    prevalence: '~1.0% of males',
    description: 'Anomalous trichromacy with shifted L-cone spectral sensitivity. Reduced discrimination between red, orange, and brown.',
    category: 'anomalous'
  },
  {
    type: 'deuteranomaly',
    title: 'Deuteranomaly',
    subtitle: 'Green-weak (M-cone shifted)',
    prevalence: '~4.9% of males',
    description: 'Most common color vision deficiency. Shifted M-cone sensitivity reducing discrimination between greens, yellows, and oranges.',
    category: 'anomalous'
  },
  {
    type: 'tritanomaly',
    title: 'Tritanomaly',
    subtitle: 'Blue-weak (S-cone shifted)',
    prevalence: '~0.01% of population',
    description: 'Anomalous trichromacy with shifted S-cone sensitivity. Reduced discrimination between blue, green, violet, and yellow.',
    category: 'anomalous'
  },
  {
    type: 'achromatomaly',
    title: 'Achromatomaly',
    subtitle: 'Partial color blindness',
    prevalence: '~0.001% of population',
    description: 'Extreme desaturation across all color spectrums with minimal residual hue perception.',
    category: 'anomalous'
  }
];

/**
 * 3x3 Linear Color Transformation Matrices for Color Vision Deficiency Simulation.
 * Based on the established Brettel, Viénot & Mollon (1997) and Machado et al. (2009) models.
 * Applied exclusively in linearized sRGB color space.
 */
export const CVD_MATRICES: Record<ColorBlindnessType, [number, number, number, number, number, number, number, number, number]> = {
  normal: [
    1.00000, 0.00000, 0.00000,
    0.00000, 1.00000, 0.00000,
    0.00000, 0.00000, 1.00000
  ],
  protanopia: [
    0.56667, 0.43333, 0.00000,
    0.55833, 0.44167, 0.00000,
    0.00000, 0.24167, 0.75833
  ],
  protanomaly: [
    0.81667, 0.18333, 0.00000,
    0.33333, 0.66667, 0.00000,
    0.00000, 0.12500, 0.87500
  ],
  deuteranopia: [
    0.62500, 0.37500, 0.00000,
    0.70000, 0.30000, 0.00000,
    0.00000, 0.30000, 0.70000
  ],
  deuteranomaly: [
    0.80000, 0.20000, 0.00000,
    0.25833, 0.74167, 0.00000,
    0.00000, 0.14167, 0.85833
  ],
  tritanopia: [
    0.95000, 0.05000, 0.00000,
    0.00000, 0.43333, 0.56667,
    0.00000, 0.47500, 0.52500
  ],
  tritanomaly: [
    0.96667, 0.03333, 0.00000,
    0.00000, 0.73333, 0.26667,
    0.00000, 0.18333, 0.81667
  ],
  achromatopsia: [
    0.21260, 0.71520, 0.07220,
    0.21260, 0.71520, 0.07220,
    0.21260, 0.71520, 0.07220
  ],
  achromatomaly: [
    0.61800 + 0.38200 * 0.21260, 0.38200 * 0.71520, 0.38200 * 0.07220,
    0.38200 * 0.21260, 0.61800 + 0.38200 * 0.71520, 0.38200 * 0.07220,
    0.38200 * 0.21260, 0.38200 * 0.71520, 0.61800 + 0.38200 * 0.07220
  ]
};

@Injectable({
  providedIn: 'root'
})
export class ColorBlindnessService {
  private engine = (() => {
    try {
      return inject(ColorEngineService);
    } catch {
      return new ColorEngineService();
    }
  })();

  private exportService = (() => {
    try {
      return inject(ExportService);
    } catch {
      return new ExportService();
    }
  })();

  public readonly profiles: ColorBlindnessInfo[] = CVD_PROFILES;

  // Precomputed 256-entry lookup table for fast sRGB -> Linear conversion
  private readonly sRgbToLinearLUT: Float32Array = new Float32Array(256);

  constructor() {
    this.initLut();
  }

  private initLut(): void {
    for (let i = 0; i < 256; i++) {
      const v = i / 255;
      this.sRgbToLinearLUT[i] = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }
  }

  // ── 1. Color Simulation Helpers ───────────────────────────────────────────

  /**
   * Converts a linear RGB component back to 8-bit non-linear sRGB (0-255).
   */
  private linearToSrgb(v: number): number {
    if (v <= 0) return 0;
    if (v >= 1) return 255;
    const s = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
    return Math.round(Math.max(0, Math.min(255, s * 255)));
  }

  /**
   * Simulates color vision deficiency for a single RgbColor object.
   */
  public simulateRgb(rgb: RgbColor, type: ColorBlindnessType): RgbColor {
    const m = CVD_MATRICES[type];
    const r = Math.max(0, Math.min(255, Math.round(rgb.r)));
    const g = Math.max(0, Math.min(255, Math.round(rgb.g)));
    const b = Math.max(0, Math.min(255, Math.round(rgb.b)));

    const linR = this.sRgbToLinearLUT[r];
    const linG = this.sRgbToLinearLUT[g];
    const linB = this.sRgbToLinearLUT[b];

    const simLinR = m[0] * linR + m[1] * linG + m[2] * linB;
    const simLinG = m[3] * linR + m[4] * linG + m[5] * linB;
    const simLinB = m[6] * linR + m[7] * linG + m[8] * linB;

    return {
      r: this.linearToSrgb(simLinR),
      g: this.linearToSrgb(simLinG),
      b: this.linearToSrgb(simLinB),
      a: rgb.a ?? 1
    };
  }

  /**
   * Simulates color vision deficiency for a HEX color string.
   */
  public simulateHex(hex: string, type: ColorBlindnessType): string {
    const rgb = this.engine.hexToRgb(hex);
    const sim = this.simulateRgb(rgb, type);
    return this.engine.rgbToHex(sim);
  }

  // ── 2. High-Performance Canvas Image Transformation ───────────────────────

  /**
   * Applies color vision deficiency simulation to an ImageData buffer in-place or into targetData.
   * Leverages precomputed Float32Array LUTs for high-speed linear sRGB processing.
   * Completely preserves alpha transparency and image dimensions.
   */
  public simulateImageData(
    sourceData: ImageData,
    type: ColorBlindnessType,
    targetData?: ImageData
  ): ImageData {
    const target = targetData || (typeof ImageData !== 'undefined'
      ? new ImageData(sourceData.width, sourceData.height)
      : { width: sourceData.width, height: sourceData.height, data: new Uint8ClampedArray(sourceData.width * sourceData.height * 4) } as any);
    const src = sourceData.data;
    const dst = target.data;
    const len = src.length;
    const m = CVD_MATRICES[type];
    const lut = this.sRgbToLinearLUT;

    for (let i = 0; i < len; i += 4) {
      const a = src[i + 3];

      // Alpha preservation: skip transparent pixels
      if (a === 0) {
        dst[i] = 0;
        dst[i + 1] = 0;
        dst[i + 2] = 0;
        dst[i + 3] = 0;
        continue;
      }

      const r = src[i];
      const g = src[i + 1];
      const b = src[i + 2];

      const linR = lut[r];
      const linG = lut[g];
      const linB = lut[b];

      const simLinR = m[0] * linR + m[1] * linG + m[2] * linB;
      const simLinG = m[3] * linR + m[4] * linG + m[5] * linB;
      const simLinB = m[6] * linR + m[7] * linG + m[8] * linB;

      dst[i] = this.linearToSrgb(simLinR);
      dst[i + 1] = this.linearToSrgb(simLinG);
      dst[i + 2] = this.linearToSrgb(simLinB);
      dst[i + 3] = a;
    }

    return target;
  }

  /**
   * Reads from sourceCanvas, applies color blindness simulation, and writes onto targetCanvas.
   */
  public simulateCanvas(
    sourceCanvas: HTMLCanvasElement,
    targetCanvas: HTMLCanvasElement,
    type: ColorBlindnessType
  ): boolean {
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    if (width === 0 || height === 0) return false;

    targetCanvas.width = width;
    targetCanvas.height = height;

    const srcCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    const dstCtx = targetCanvas.getContext('2d');
    if (!srcCtx || !dstCtx) return false;

    const srcImgData = srcCtx.getImageData(0, 0, width, height);
    const simImgData = this.simulateImageData(srcImgData, type);
    dstCtx.putImageData(simImgData, 0, 0);
    return true;
  }

  // ── 3. Image Comparison Workspace Renderers ───────────────────────────────

  /**
   * Renders an interactive split-view comparison onto targetCanvas.
   * Left side: Original Image. Right side: Simulated Image.
   * Features a clean vertical separator divider and customizable badges.
   */
  public renderSplitComparison(
    sourceCanvas: HTMLCanvasElement,
    simCanvas: HTMLCanvasElement,
    splitRatio: number,
    targetCanvas: HTMLCanvasElement,
    options: {
      drawBadges?: boolean;
      labelOriginal?: string;
      labelSimulated?: string;
    } = {}
  ): void {
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    if (width === 0 || height === 0) return;

    targetCanvas.width = width;
    targetCanvas.height = height;

    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return;

    const clampedRatio = Math.max(0, Math.min(1, splitRatio));
    const splitX = Math.round(width * clampedRatio);

    // 1. Draw Simulated Image across entire canvas
    ctx.drawImage(simCanvas, 0, 0);

    // 2. Clip and Draw Original Image on the left side
    if (splitX > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, splitX, height);
      ctx.clip();
      ctx.drawImage(sourceCanvas, 0, 0);
      ctx.restore();
    }

    // 3. Draw Divider Line
    ctx.save();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(splitX, 0);
    ctx.lineTo(splitX, height);
    ctx.stroke();

    // 4. Draw Center Handle Circle (>= 44x44px touch target)
    const handleY = height / 2;
    const handleRadius = Math.max(22, Math.min(26, Math.round(Math.min(width, height) * 0.05)));
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(splitX, handleY, handleRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Small arrows inside handle
    ctx.fillStyle = '#0F172A';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('◀ ▶', splitX, handleY);
    ctx.restore();

    // 5. Draw Optional Labels / Badges
    if (options.drawBadges !== false) {
      this.drawBadge(ctx, options.labelOriginal || 'Original', 16, 16);
      this.drawBadge(ctx, options.labelSimulated || 'Simulated', width - 16, 16, 'right');
    }
  }

  /**
   * Renders side-by-side comparison of original and simulated image onto targetCanvas.
   * Useful for exports, reports, and high-resolution comparisons.
   */
  public renderSideBySideComparison(
    sourceCanvas: HTMLCanvasElement,
    simCanvas: HTMLCanvasElement,
    targetCanvas: HTMLCanvasElement,
    labelOriginal = 'Original Vision',
    labelSimulated = 'Simulated Vision'
  ): void {
    const imgW = sourceCanvas.width;
    const imgH = sourceCanvas.height;
    if (imgW === 0 || imgH === 0) return;

    const gap = 20;
    const headerH = 44;
    const totalW = imgW * 2 + gap + 40;
    const totalH = imgH + headerH + 30;

    targetCanvas.width = totalW;
    targetCanvas.height = totalH;

    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#090D16';
    ctx.fillRect(0, 0, totalW, totalH);

    // Left Title
    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(labelOriginal, 20, 28);

    // Right Title
    ctx.fillText(labelSimulated, 20 + imgW + gap, 28);

    // Draw images
    ctx.drawImage(sourceCanvas, 20, headerH, imgW, imgH);
    ctx.drawImage(simCanvas, 20 + imgW + gap, headerH, imgW, imgH);

    // Outline borders
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(20, headerH, imgW, imgH);
    ctx.strokeRect(20 + imgW + gap, headerH, imgW, imgH);
  }

  private drawBadge(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    align: 'left' | 'right' = 'left'
  ): void {
    ctx.save();
    ctx.font = 'bold 11px sans-serif';
    const textMetrics = ctx.measureText(text);
    const paddingX = 10;
    const paddingY = 6;
    const badgeW = textMetrics.width + paddingX * 2;
    const badgeH = 24;

    const boxX = align === 'right' ? x - badgeW : x;
    const boxY = y;

    // Rounded Pill
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, badgeW, badgeH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, boxX + paddingX, boxY + badgeH / 2);
    ctx.restore();
  }

  // ── 4. Perceptual Color Science & CIELAB Delta E ──────────────────────────

  /**
   * Converts an sRGB color (0-255) to CIE XYZ (D65 standard illuminant).
   */
  public rgbToXyz(rgb: RgbColor): { x: number; y: number; z: number } {
    const r = this.sRgbToLinearLUT[Math.max(0, Math.min(255, Math.round(rgb.r)))];
    const g = this.sRgbToLinearLUT[Math.max(0, Math.min(255, Math.round(rgb.g)))];
    const b = this.sRgbToLinearLUT[Math.max(0, Math.min(255, Math.round(rgb.b)))];

    return {
      x: (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) * 100,
      y: (r * 0.2126729 + g * 0.7151522 + b * 0.0721750) * 100,
      z: (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) * 100
    };
  }

  /**
   * Converts CIE XYZ to CIE L*a*b* under standard D65 illuminant (Xn=95.047, Yn=100.0, Zn=108.883).
   */
  public xyzToLab(xyz: { x: number; y: number; z: number }): { l: number; a: number; b: number } {
    const xn = 95.047;
    const yn = 100.000;
    const zn = 108.883;

    const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);

    const fx = f(xyz.x / xn);
    const fy = f(xyz.y / yn);
    const fz = f(xyz.z / zn);

    return {
      l: Math.max(0, 116 * fy - 16),
      a: 500 * (fx - fy),
      b: 200 * (fy - fz)
    };
  }

  /**
   * Converts an RGB color to CIELAB (L*a*b*).
   */
  public rgbToLab(rgb: RgbColor): { l: number; a: number; b: number } {
    return this.xyzToLab(this.rgbToXyz(rgb));
  }

  /**
   * Calculates perceptual color difference (CIE76 Delta E) in CIELAB color space.
   * Delta E < 1: imperceptible; 1-3: barely noticeable; 3-6: noticeable; >=12: distinct.
   */
  public calculateDeltaE(color1: string | RgbColor, color2: string | RgbColor): number {
    const rgb1 = typeof color1 === 'string' ? this.engine.hexToRgb(color1) : color1;
    const rgb2 = typeof color2 === 'string' ? this.engine.hexToRgb(color2) : color2;

    const lab1 = this.rgbToLab(rgb1);
    const lab2 = this.rgbToLab(rgb2);

    const dL = lab1.l - lab2.l;
    const da = lab1.a - lab2.a;
    const db = lab1.b - lab2.b;

    return Math.sqrt(dL * dL + da * da + db * db);
  }

  // ── 5. Color Palette Simulation & Confusion Detection ─────────────────────

  /**
   * Simulates an entire palette of colors under a specific deficiency.
   * Evaluates perceptual color difference (Delta E) across all pairwise combinations to
   * detect colors that become indistinguishable or hazardous to confuse.
   */
  public simulatePalette(
    colors: string[],
    type: ColorBlindnessType
  ): PaletteSimulationResult {
    const items: SimulatedPaletteItem[] = colors.map((hex, index) => {
      const clean = this.engine.normalizeHex(hex);
      const originalRgb = this.engine.hexToRgb(clean);
      const simulatedRgb = this.simulateRgb(originalRgb, type);
      const simulatedHex = this.engine.rgbToHex(simulatedRgb);

      return {
        id: `sim-${index}-${clean.replace('#', '')}`,
        originalHex: clean,
        simulatedHex,
        originalRgb,
        simulatedRgb,
        name: `Color ${index + 1}`
      };
    });

    const confusionPairs: PaletteConfusionPair[] = [];
    const conflictMap = new Map<string, Set<string>>();

    // Pairwise comparison
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const itemA = items[i];
        const itemB = items[j];

        const origDelta = this.calculateDeltaE(itemA.originalRgb, itemB.originalRgb);
        const simDelta = this.calculateDeltaE(itemA.simulatedRgb, itemB.simulatedRgb);

        // A conflict occurs when two colors are distinct in normal vision (origDelta >= 12)
        // but collapse to confusingly close tones under simulation (simDelta < 10)
        if (simDelta < 11 && origDelta >= 12) {
          const severity: 'severe' | 'moderate' | 'low' = simDelta < 6 ? 'severe' : 'moderate';

          confusionPairs.push({
            color1: itemA.originalHex,
            color2: itemB.originalHex,
            simColor1: itemA.simulatedHex,
            simColor2: itemB.simulatedHex,
            originalDeltaE: Math.round(origDelta * 10) / 10,
            simulatedDeltaE: Math.round(simDelta * 10) / 10,
            severity
          });

          if (!conflictMap.has(itemA.id)) conflictMap.set(itemA.id, new Set());
          if (!conflictMap.has(itemB.id)) conflictMap.set(itemB.id, new Set());
          conflictMap.get(itemA.id)!.add(itemB.originalHex);
          conflictMap.get(itemB.id)!.add(itemA.originalHex);
        }
      }
    }

    // Annotate items
    items.forEach(item => {
      const conflicts = conflictMap.get(item.id);
      if (conflicts && conflicts.size > 0) {
        item.hasConflict = true;
        item.conflictsWith = Array.from(conflicts);
      }
    });

    return {
      type,
      items,
      confusionPairs,
      riskCount: confusionPairs.length
    };
  }

  // ── 6. Export Functions ───────────────────────────────────────────────────

  /**
   * Generates formatted JSON export for a simulated palette audit.
   */
  public generatePaletteSimulationJson(
    result: PaletteSimulationResult,
    paletteName = 'Color Studio Palette'
  ): string {
    const profile = this.profiles.find(p => p.type === result.type);
    return JSON.stringify(
      {
        paletteName,
        simulationMode: result.type,
        deficiencyTitle: profile?.title || result.type,
        deficiencySubtitle: profile?.subtitle || '',
        prevalence: profile?.prevalence || '',
        auditDate: new Date().toISOString(),
        totalSwatches: result.items.length,
        confusionRiskPairs: result.riskCount,
        swatches: result.items.map(item => ({
          originalHex: item.originalHex,
          simulatedHex: item.simulatedHex,
          originalRgb: `${item.originalRgb.r}, ${item.originalRgb.g}, ${item.originalRgb.b}`,
          simulatedRgb: `${item.simulatedRgb.r}, ${item.simulatedRgb.g}, ${item.simulatedRgb.b}`,
          hasConflict: !!item.hasConflict,
          conflictsWith: item.conflictsWith || []
        })),
        conflicts: result.confusionPairs.map(pair => ({
          pair: `${pair.color1} ↔ ${pair.color2}`,
          simulatedPair: `${pair.simColor1} ↔ ${pair.simColor2}`,
          originalDeltaE: pair.originalDeltaE,
          simulatedDeltaE: pair.simulatedDeltaE,
          severity: pair.severity
        }))
      },
      null,
      2
    );
  }

  /**
   * Generates a printable Markdown accessibility report.
   */
  public generateReportMarkdown(
    result: PaletteSimulationResult,
    paletteName = 'Acklet Palette'
  ): string {
    const profile = this.profiles.find(p => p.type === result.type);
    const lines = [
      `# Color Vision Deficiency Simulation Report`,
      ``,
      `- **Palette**: ${paletteName}`,
      `- **Simulation Mode**: ${profile?.title || result.type} (${profile?.subtitle || ''})`,
      `- **Population Prevalence**: ${profile?.prevalence || 'N/A'}`,
      `- **Generated**: ${new Date().toLocaleDateString()}`,
      `- **Confusion Risks Detected**: ${result.riskCount}`,
      ``,
      `## Swatch Breakdown`,
      `| Original HEX | Simulated HEX | Status |`,
      `|---|---|---|`
    ];

    result.items.forEach(item => {
      const status = item.hasConflict ? `⚠️ Confusable with ${item.conflictsWith?.join(', ')}` : '✅ Distinct';
      lines.push(`| \`${item.originalHex}\` | \`${item.simulatedHex}\` | ${status} |`);
    });

    if (result.confusionPairs.length > 0) {
      lines.push(``, `## Indistinguishable Color Pairs (CIE76 ΔE < 11)`);
      lines.push(`| Pair | Normal ΔE | Simulated ΔE | Severity |`);
      lines.push(`|---|---|---|---|`);
      result.confusionPairs.forEach(p => {
        lines.push(`| \`${p.color1}\` & \`${p.color2}\` | ${p.originalDeltaE} | ${p.simulatedDeltaE} | ${p.severity.toUpperCase()} |`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Downloads a canvas image as PNG, JPEG, or WebP.
   */
  public downloadCanvas(
    canvas: HTMLCanvasElement,
    filename: string,
    mimeType: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/png',
    quality = 0.95
  ): void {
    if (typeof document === 'undefined') return;
    try {
      canvas.toBlob(
        blob => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        },
        mimeType,
        quality
      );
    } catch (e) {
      console.error('Canvas export failed', e);
    }
  }
}

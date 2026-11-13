// apps/tool-color-studio/src/services/gradient-repair.service.ts
import { Injectable, inject } from '@angular/core';
import { ColorEngineService } from './color-engine.service';
import { ColorBlindnessService } from './color-blindness.service';
import { GradientService } from './gradient.service';
import { GradientAnalysisService } from './gradient-analysis.service';
import { GradientConfig, GradientStop } from '../models/color.models';
import {
  RepairStrategy,
  CustomRepairOptions,
  GradientRepairResult
} from '../models/gradient-repair.models';

export const DEFAULT_CUSTOM_REPAIR_OPTIONS: CustomRepairOptions = {
  stopPositions: true,
  colorTransitions: true,
  colorHarmony: false,
  balanceBrightnessSaturation: true,
  gradientAngle: false,
  cssConfig: true
};

@Injectable({
  providedIn: 'root'
})
export class GradientRepairService {
  private engine = inject(ColorEngineService);
  private blindness = inject(ColorBlindnessService);
  private gradientService = inject(GradientService);
  private analysisService = inject(GradientAnalysisService);

  /**
   * Deterministically repairs a gradient configuration according to the chosen strategy.
   */
  public repair(
    config: GradientConfig,
    strategy: RepairStrategy = 'balanced',
    customOptions: CustomRepairOptions = DEFAULT_CUSTOM_REPAIR_OPTIONS
  ): GradientRepairResult {
    const originalConfig: GradientConfig = JSON.parse(JSON.stringify(config));
    let repairedConfig: GradientConfig = JSON.parse(JSON.stringify(config));
    const changesMade: string[] = [];

    switch (strategy) {
      case 'balanced':
        repairedConfig = this.applyBalancedRepair(repairedConfig, changesMade);
        break;

      case 'smooth':
        repairedConfig = this.applySmoothRepair(repairedConfig, changesMade);
        break;

      case 'harmony':
        repairedConfig = this.applyHarmonyRepair(repairedConfig, changesMade);
        break;

      case 'contrast':
        repairedConfig = this.applyContrastRepair(repairedConfig, changesMade);
        break;

      case 'custom':
        repairedConfig = this.applyCustomRepair(repairedConfig, customOptions, changesMade);
        break;
    }

    // Run final analysis on the repaired configuration
    const analysis = this.analysisService.analyze(repairedConfig);

    return {
      strategy,
      originalConfig,
      repairedConfig,
      analysis,
      changesMade: changesMade.length > 0 ? changesMade : ['Gradient configuration is already optimal.'],
      customOptions
    };
  }

  // ── 1. Balanced Strategy ──────────────────────────────────────────────────
  private applyBalancedRepair(config: GradientConfig, changes: string[]): GradientConfig {
    const stops: GradientStop[] = config.stops.map(s => ({ ...s }));
    if (stops.length === 0) return config;

    // 1. Color normalization
    let colorFixed = false;
    stops.forEach(s => {
      if (!this.engine.isValidColor(s.color)) {
        s.color = '#2563EB';
        colorFixed = true;
      } else {
        s.color = this.engine.normalizeHex(s.color);
      }
    });
    if (colorFixed) {
      changes.push('Corrected invalid color values to standard HEX format.');
    }

    // 2. Position bounds & coverage
    const first = stops[0];
    const last = stops[stops.length - 1];

    if (!first.locked && first.position !== 0) {
      first.position = 0;
      changes.push('Set first stop to 0% for complete leading edge coverage.');
    }

    if (!last.locked && last.position !== 100) {
      last.position = 100;
      changes.push('Set last stop to 100% for full gradient span coverage.');
    }

    // 3. Balanced distribution for intermediate unlocked stops
    if (stops.length > 2) {
      let intermediateAdjusted = false;
      const step = 100 / (stops.length - 1);

      // Pre-identify hard cut stops so neither stop in a pair is shifted
      const isHardCut = stops.map((s, idx) =>
        (idx > 0 && s.position === stops[idx - 1].position) ||
        (idx < stops.length - 1 && s.position === stops[idx + 1].position)
      );

      let hardCutPreserved = false;
      for (let i = 1; i < stops.length - 1; i++) {
        const curr = stops[i];

        if (curr.locked) continue;

        if (isHardCut[i]) {
          if (!hardCutPreserved) {
            changes.push(`Preserved intentional hard color cut at ${curr.position}%.`);
            hardCutPreserved = true;
          }
          continue;
        }

        const idealPos = Math.round(i * step);
        if (Math.abs(curr.position - idealPos) > 4) {
          curr.position = idealPos;
          intermediateAdjusted = true;
        }
      }

      if (intermediateAdjusted) {
        changes.push('Evenly distributed intermediate stops to eliminate crowded pinch points.');
      }
    }

    // Ensure strict ascending ordering without changing color sequence
    this.enforceAscendingBounds(stops);

    // Angle normalization
    if (config.type === 'linear' && (config.angle < 0 || config.angle > 360)) {
      config.angle = this.gradientService.normalizeAngle(config.angle);
      changes.push(`Normalized linear angle to ${config.angle}°.`);
    }

    return {
      ...config,
      stops
    };
  }

  // ── 2. Smooth Strategy ────────────────────────────────────────────────────
  private applySmoothRepair(config: GradientConfig, changes: string[]): GradientConfig {
    const stops: GradientStop[] = config.stops.map(s => ({ ...s }));
    if (stops.length < 2) return config;

    // Normalizing boundary positions
    if (!stops[0].locked) stops[0].position = 0;
    if (!stops[stops.length - 1].locked) stops[stops.length - 1].position = 100;

    // Calculate perceptual Delta E differences between all consecutive stops
    const deltas: number[] = [];
    for (let i = 0; i < stops.length - 1; i++) {
      const c1 = this.engine.normalizeHex(stops[i].color);
      const c2 = this.engine.normalizeHex(stops[i + 1].color);
      const d = Math.max(10, this.blindness.calculateDeltaE(c1, c2));
      deltas.push(d);
    }

    const totalDelta = deltas.reduce((a, b) => a + b, 0);

    // Reposition intermediate stops proportional to perceptual distance
    let accumulated = 0;
    for (let i = 0; i < deltas.length - 1; i++) {
      accumulated += deltas[i];
      const targetStop = stops[i + 1];

      if (!targetStop.locked) {
        // Only adjust if not a hard transition
        const prev = stops[i];
        if (targetStop.position !== prev.position) {
          const weightedPos = Math.round((accumulated / totalDelta) * 100);
          targetStop.position = Math.max(5, Math.min(95, weightedPos));
        }
      }
    }

    changes.push('Weighted stop spacing proportionally to perceptual color difference (ΔE) for seamless color blending.');

    // Gentle lightness smoothing on unlocked intermediate stops
    if (stops.length >= 3) {
      let lightnessSmoothed = false;
      for (let i = 1; i < stops.length - 1; i++) {
        const s = stops[i];
        if (s.locked) continue;

        const prevHsl = this.engine.rgbToHsl(this.engine.hexToRgb(stops[i - 1].color));
        const currHsl = this.engine.rgbToHsl(this.engine.hexToRgb(s.color));
        const nextHsl = this.engine.rgbToHsl(this.engine.hexToRgb(stops[i + 1].color));

        const expectedL = Math.round((prevHsl.l + nextHsl.l) / 2);
        // If current lightness has a massive jump (> 35% difference from neighbors)
        if (Math.abs(currHsl.l - expectedL) > 35) {
          const smoothedL = Math.round(currHsl.l * 0.6 + expectedL * 0.4);
          s.color = this.engine.hslToHex({ ...currHsl, l: smoothedL });
          lightnessSmoothed = true;
        }
      }

      if (lightnessSmoothed) {
        changes.push('Smoothed abrupt brightness spikes across intermediate stops.');
      }
    }

    this.enforceAscendingBounds(stops);

    return {
      ...config,
      stops
    };
  }

  // ── 3. Color Harmony Strategy ─────────────────────────────────────────────
  private applyHarmonyRepair(config: GradientConfig, changes: string[]): GradientConfig {
    const stops: GradientStop[] = config.stops.map(s => ({ ...s }));
    if (stops.length < 2) return config;

    // Anchor on first stop (or first locked stop)
    const anchorIndex = stops.findIndex(s => s.locked);
    const anchorStop = anchorIndex !== -1 ? stops[anchorIndex] : stops[0];
    const anchorHsl = this.engine.rgbToHsl(this.engine.hexToRgb(anchorStop.color));

    changes.push(`Anchored harmonic palette on ${anchorStop.color.toUpperCase()} (Stop ${anchorIndex !== -1 ? anchorIndex + 1 : 1}).`);

    // Generate harmonic hue distribution across stops
    const count = stops.length;
    // Determine harmony angle offset: Analogous progression (approx 30deg per step)
    const hueStep = Math.min(45, Math.round(90 / (count - 1)));

    stops.forEach((s, idx) => {
      if (s.locked) return;
      if (idx === 0 && anchorIndex === -1) return; // Keep anchor untouched

      const currentHsl = this.engine.rgbToHsl(this.engine.hexToRgb(s.color));
      const targetHue = (anchorHsl.h + (idx * hueStep)) % 360;

      // Bring saturation into aesthetic studio range (50% - 85%)
      const balancedSat = Math.max(50, Math.min(85, currentHsl.s));
      // Progressive lightness progression
      const balancedLit = Math.max(30, Math.min(80, currentHsl.l));

      s.color = this.engine.hslToHex({
        h: targetHue,
        s: balancedSat,
        l: balancedLit
      });
    });

    changes.push('Harmonized stop hues into an analogous aesthetic progression with balanced saturation.');

    // Also balance stop positions
    if (!stops[0].locked) stops[0].position = 0;
    if (!stops[stops.length - 1].locked) stops[stops.length - 1].position = 100;
    const step = 100 / (stops.length - 1);
    for (let i = 1; i < stops.length - 1; i++) {
      if (!stops[i].locked) {
        stops[i].position = Math.round(i * step);
      }
    }

    this.enforceAscendingBounds(stops);

    return {
      ...config,
      stops
    };
  }

  // ── 4. Contrast Optimized Strategy ────────────────────────────────────────
  private applyContrastRepair(config: GradientConfig, changes: string[]): GradientConfig {
    const stops: GradientStop[] = config.stops.map(s => ({ ...s }));
    if (stops.length < 2) return config;

    // Ensure distinct lightness separation across stops (dL >= 15 between consecutive stops)
    const stepLightness = 70 / (stops.length - 1);
    const startLightness = 20;

    stops.forEach((s, idx) => {
      if (s.locked) return;
      const hsl = this.engine.rgbToHsl(this.engine.hexToRgb(s.color));
      const targetL = Math.round(startLightness + (idx * stepLightness));
      s.color = this.engine.hslToHex({ ...hsl, l: targetL });
    });

    changes.push('Optimized luminance progression across stops for strong contrast separation and readability.');

    // Boundary coverage
    if (!stops[0].locked) stops[0].position = 0;
    if (!stops[stops.length - 1].locked) stops[stops.length - 1].position = 100;
    const step = 100 / (stops.length - 1);
    for (let i = 1; i < stops.length - 1; i++) {
      if (!stops[i].locked) {
        stops[i].position = Math.round(i * step);
      }
    }

    this.enforceAscendingBounds(stops);

    return {
      ...config,
      stops
    };
  }

  // ── 5. Custom Repair Strategy ─────────────────────────────────────────────
  private applyCustomRepair(
    config: GradientConfig,
    options: CustomRepairOptions,
    changes: string[]
  ): GradientConfig {
    const stops: GradientStop[] = config.stops.map(s => ({ ...s }));

    // Stop positions repair
    if (options.stopPositions && stops.length >= 2) {
      if (!stops[0].locked) stops[0].position = 0;
      if (!stops[stops.length - 1].locked) stops[stops.length - 1].position = 100;

      const step = 100 / (stops.length - 1);
      for (let i = 1; i < stops.length - 1; i++) {
        if (!stops[i].locked && stops[i].position !== stops[i - 1].position) {
          stops[i].position = Math.round(i * step);
        }
      }
      this.enforceAscendingBounds(stops);
      changes.push('Normalized stop positions and boundary coverage.');
    }

    // Color harmony
    if (options.colorHarmony && stops.length >= 2) {
      const anchorHsl = this.engine.rgbToHsl(this.engine.hexToRgb(stops[0].color));
      const hueStep = Math.min(45, Math.round(90 / (stops.length - 1)));
      for (let i = 1; i < stops.length; i++) {
        if (!stops[i].locked) {
          const hsl = this.engine.rgbToHsl(this.engine.hexToRgb(stops[i].color));
          stops[i].color = this.engine.hslToHex({
            ...hsl,
            h: (anchorHsl.h + i * hueStep) % 360
          });
        }
      }
      changes.push('Aligned stop hues into a harmonious relationship.');
    }

    // Balance Brightness & Saturation
    if (options.balanceBrightnessSaturation) {
      stops.forEach(s => {
        if (s.locked) return;
        const hsl = this.engine.rgbToHsl(this.engine.hexToRgb(s.color));
        const clampedS = Math.max(30, Math.min(90, hsl.s));
        const clampedL = Math.max(20, Math.min(85, hsl.l));
        s.color = this.engine.hslToHex({ h: hsl.h, s: clampedS, l: clampedL });
      });
      changes.push('Balanced saturation and lightness within aesthetic studio bounds.');
    }

    // Gradient Angle
    if (options.gradientAngle && config.type === 'linear') {
      const normalized = this.gradientService.normalizeAngle(config.angle);
      // Snap to nearest 45deg aesthetic direction
      const snapped = Math.round(normalized / 45) * 45 % 360;
      config.angle = snapped;
      changes.push(`Snapped angle to nearest 45° increment (${snapped}°).`);
    }

    // CSS Config
    if (options.cssConfig) {
      if (config.type === 'radial') {
        config.positionX = Math.max(0, Math.min(100, config.positionX ?? 50));
        config.positionY = Math.max(0, Math.min(100, config.positionY ?? 50));
        changes.push('Validated radial center coordinates.');
      }
    }

    return {
      ...config,
      stops
    };
  }

  /**
   * Defensive enforcement that stops never violate ascending order $Stop_{i-1} <= Stop_i$.
   */
  private enforceAscendingBounds(stops: GradientStop[]): void {
    for (let i = 1; i < stops.length; i++) {
      if (stops[i].position < stops[i - 1].position) {
        stops[i].position = stops[i - 1].position;
      }
    }
  }
}

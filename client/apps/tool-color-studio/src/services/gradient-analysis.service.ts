// apps/tool-color-studio/src/services/gradient-analysis.service.ts
import { Injectable, inject } from '@angular/core';
import { ColorEngineService } from './color-engine.service';
import { ColorBlindnessService } from './color-blindness.service';
import { GradientService } from './gradient.service';
import { GradientConfig, GradientStop } from '../models/color.models';
import {
  GradientAnalysisResult,
  GradientFinding,
  GradientAnalysisSummary,
  HealthStatus
} from '../models/gradient-repair.models';

@Injectable({
  providedIn: 'root'
})
export class GradientAnalysisService {
  private engine = inject(ColorEngineService);
  private blindness = inject(ColorBlindnessService);
  private gradientService = inject(GradientService);

  /**
   * Comprehensive deterministic browser-side analysis of a gradient configuration.
   */
  public analyze(config: GradientConfig): GradientAnalysisResult {
    const findings: GradientFinding[] = [];
    const stops = config.stops || [];

    // ── 1. Stop Position Validation ─────────────────────────────────────────
    let isAscending = true;
    let hasCrowdedStops = false;
    let hasHardTransition = false;
    let positionIssueCount = 0;

    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];

      // Check bounds [0, 100]
      if (stop.position < 0 || stop.position > 100) {
        positionIssueCount++;
        findings.push({
          id: `pos-bounds-${stop.id}`,
          category: 'position',
          severity: 'error',
          title: `Stop ${i + 1} Out of Bounds`,
          message: `Position ${stop.position}% is outside the valid 0%–100% range.`,
          originalValue: `${stop.position}%`,
          suggestedValue: `${Math.max(0, Math.min(100, stop.position))}%`,
          stopIndex: i,
          stopId: stop.id,
          autoFixable: true
        });
      }

      // Check ascending order
      if (i > 0) {
        const prev = stops[i - 1];
        if (stop.position < prev.position) {
          isAscending = false;
          positionIssueCount++;
          findings.push({
            id: `pos-order-${stop.id}`,
            category: 'position',
            severity: 'error',
            title: 'Unordered Stop Positions',
            message: `Stop ${i + 1} (${stop.position}%) occurs before stop ${i} (${prev.position}%), creating an inverted gradient sequence.`,
            originalValue: `${stop.position}%`,
            suggestedValue: `${prev.position}%`,
            stopIndex: i,
            stopId: stop.id,
            autoFixable: true
          });
        } else if (stop.position === prev.position) {
          hasHardTransition = true;
          findings.push({
            id: `pos-hard-cut-${i}`,
            category: 'position',
            severity: 'info',
            title: `Intentional Hard Transition at ${stop.position}%`,
            message: `Stops ${i} and ${i + 1} share identical position ${stop.position}%, producing a crisp demarcation line.`,
            stopIndex: i,
            stopId: stop.id,
            autoFixable: false
          });
        } else if (stop.position - prev.position < 3 && stop.color.toUpperCase() !== prev.color.toUpperCase()) {
          hasCrowdedStops = true;
          positionIssueCount++;
          findings.push({
            id: `pos-crowded-${i}`,
            category: 'position',
            severity: 'warning',
            title: `Crowded Color Interval`,
            message: `Stops ${i} and ${i + 1} are only ${stop.position - prev.position}% apart, creating a sharp color pinch.`,
            originalValue: `${stop.position - prev.position}% gap`,
            suggestedValue: `≥ 5% gap`,
            stopIndex: i,
            stopId: stop.id,
            autoFixable: true
          });
        }
      }
    }

    // Boundary coverage checks
    if (stops.length > 0) {
      const first = stops[0];
      if (first.position > 0 && !first.locked) {
        positionIssueCount++;
        findings.push({
          id: 'pos-start-gap',
          category: 'position',
          severity: 'suggestion',
          title: 'Incomplete Start Coverage',
          message: `Gradient starts at ${first.position}% rather than 0%, leaving a solid unblended leading region.`,
          originalValue: `${first.position}%`,
          suggestedValue: '0%',
          stopIndex: 0,
          stopId: first.id,
          autoFixable: true
        });
      }

      const last = stops[stops.length - 1];
      if (last.position < 100 && !last.locked) {
        positionIssueCount++;
        findings.push({
          id: 'pos-end-gap',
          category: 'position',
          severity: 'suggestion',
          title: 'Incomplete End Coverage',
          message: `Gradient ends at ${last.position}% rather than 100%, leaving a solid unblended trailing region.`,
          originalValue: `${last.position}%`,
          suggestedValue: '100%',
          stopIndex: stops.length - 1,
          stopId: last.id,
          autoFixable: true
        });
      }
    }

    // ── 2. Color Validation & Redundancy ────────────────────────────────────
    let colorIssueCount = 0;
    const cleanColors: string[] = [];

    stops.forEach((s, idx) => {
      const raw = s.color;
      if (!this.engine.isValidColor(raw)) {
        colorIssueCount++;
        findings.push({
          id: `color-invalid-${s.id}`,
          category: 'color',
          severity: 'error',
          title: `Stop ${idx + 1} Invalid Color`,
          message: `Color "${raw}" is not a recognized hex or css color value.`,
          originalValue: raw,
          suggestedValue: '#2563EB',
          stopIndex: idx,
          stopId: s.id,
          autoFixable: true
        });
        cleanColors.push('#2563EB');
      } else {
        const normalized = this.engine.normalizeHex(raw);
        cleanColors.push(normalized);
      }
    });

    // Check adjacent duplicate / nearly identical colors
    for (let i = 1; i < cleanColors.length; i++) {
      const c1 = cleanColors[i - 1];
      const c2 = cleanColors[i];
      const s1 = stops[i - 1];
      const s2 = stops[i];

      if (c1.toUpperCase() === c2.toUpperCase() && s1.position !== s2.position) {
        colorIssueCount++;
        findings.push({
          id: `color-duplicate-${i}`,
          category: 'color',
          severity: 'warning',
          title: 'Redundant Duplicate Colors',
          message: `Stops ${i} and ${i + 1} share the exact same color (${c1}), creating a dead color stretch.`,
          stopIndex: i,
          stopId: s2.id,
          autoFixable: true
        });
      } else {
        const delta = this.blindness.calculateDeltaE(c1, c2);
        if (delta < 2.5 && s1.position !== s2.position) {
          findings.push({
            id: `color-near-duplicate-${i}`,
            category: 'color',
            severity: 'suggestion',
            title: 'Nearly Imperceptible Color Shift',
            message: `Stops ${i} and ${i + 1} have barely perceptible difference (ΔE = ${delta.toFixed(1)}).`,
            stopIndex: i,
            stopId: s2.id,
            autoFixable: true
          });
        }
      }
    }

    // ── 3. Transition Smoothness & Perceptual Shift (CIELAB) ────────────────
    let transitionIssueCount = 0;
    const deltaEValues: number[] = [];

    for (let i = 1; i < cleanColors.length; i++) {
      const delta = this.blindness.calculateDeltaE(cleanColors[i - 1], cleanColors[i]);
      deltaEValues.push(delta);

      const posGap = Math.abs(stops[i].position - stops[i - 1].position);
      // If deltaE is very high (> 45) across a tight non-zero gap (< 15%)
      if (delta > 45 && posGap > 0 && posGap < 18) {
        transitionIssueCount++;
        findings.push({
          id: `transition-harsh-${i}`,
          category: 'transition',
          severity: 'warning',
          title: `Harsh Color Transition between Stops ${i} & ${i + 1}`,
          message: `A large perceptual color difference (ΔE = ${delta.toFixed(1)}) is compressed into a ${posGap}% span.`,
          originalValue: `${posGap}% span`,
          suggestedValue: `≥ ${Math.min(40, Math.round(delta * 0.45))}% span`,
          stopIndex: i,
          stopId: stops[i].id,
          autoFixable: true
        });
      }
    }

    const averageDeltaE = deltaEValues.length > 0
      ? Math.round((deltaEValues.reduce((a, b) => a + b, 0) / deltaEValues.length) * 10) / 10
      : 0;
    const maxDeltaE = deltaEValues.length > 0
      ? Math.round(Math.max(...deltaEValues) * 10) / 10
      : 0;

    // ── 4. Color Harmony & Palette Relationships ────────────────────────────
    const hslList = cleanColors.map(c => this.engine.rgbToHsl(this.engine.hexToRgb(c)));
    const detectedHarmony = this.detectHarmonyPattern(hslList);

    // Saturation & Lightness Balance Checks
    const saturations = hslList.map(h => h.s);
    const lightnesses = hslList.map(h => h.l);
    const maxSat = Math.max(...saturations);
    const minSat = Math.min(...saturations);
    const maxLit = Math.max(...lightnesses);
    const minLit = Math.min(...lightnesses);

    if (maxSat - minSat > 65) {
      findings.push({
        id: 'harmony-sat-clash',
        category: 'harmony',
        severity: 'suggestion',
        title: 'High Saturation Contrast',
        message: `Gradient mixes high vibrance (${maxSat}%) with muted tones (${minSat}%).`,
        autoFixable: true
      });
    }

    if (maxLit - minLit > 80 && stops.length === 2) {
      findings.push({
        id: 'harmony-light-extreme',
        category: 'harmony',
        severity: 'info',
        title: 'High Dynamic Luminance Range',
        message: 'Extreme dark-to-light gradient provides high contrast.',
        autoFixable: false
      });
    }

    // ── 5. Gradient Configuration Validation ────────────────────────────────
    let configIssueCount = 0;
    if (config.type === 'linear') {
      if (config.angle < 0 || config.angle > 360) {
        configIssueCount++;
        findings.push({
          id: 'config-angle-unnormalized',
          category: 'config',
          severity: 'suggestion',
          title: 'Angle Normalization',
          message: `Linear angle of ${config.angle}° can be normalized to 0°–360°.`,
          originalValue: `${config.angle}°`,
          suggestedValue: `${this.gradientService.normalizeAngle(config.angle)}°`,
          autoFixable: true
        });
      }
    } else if (config.type === 'radial') {
      const posX = config.positionX ?? 50;
      const posY = config.positionY ?? 50;
      if (posX < 0 || posX > 100 || posY < 0 || posY > 100) {
        configIssueCount++;
        findings.push({
          id: 'config-radial-center',
          category: 'config',
          severity: 'warning',
          title: 'Radial Center Off-Canvas',
          message: `Center position (${posX}%, ${posY}%) is located outside the viewport.`,
          autoFixable: true
        });
      }
    }

    // ── 6. Aggregate Summary ────────────────────────────────────────────────
    const stopPositionsStatus: HealthStatus = positionIssueCount === 0
      ? 'good'
      : findings.some(f => f.category === 'position' && f.severity === 'error')
        ? 'needs-attention'
        : 'improved';

    const transitionsStatus: HealthStatus = transitionIssueCount === 0
      ? 'good'
      : 'needs-attention';

    const colorHarmonyStatus: HealthStatus = detectedHarmony === 'Clashing'
      ? 'needs-attention'
      : 'good';

    const cssValidityStatus: HealthStatus = configIssueCount === 0 && colorIssueCount === 0
      ? 'valid'
      : 'needs-attention';

    const hasActionableIssues = findings.some(f => f.severity === 'error' || f.severity === 'warning' || f.severity === 'suggestion');

    const overallStatus: HealthStatus = (stopPositionsStatus === 'needs-attention' || transitionsStatus === 'needs-attention' || colorIssueCount > 0)
      ? 'needs-attention'
      : hasActionableIssues
        ? 'improved'
        : 'good';

    const summary: GradientAnalysisSummary = {
      stopPositionsStatus,
      stopPositionsCount: positionIssueCount,
      transitionsStatus,
      transitionsCount: transitionIssueCount,
      colorHarmonyStatus,
      colorHarmonyLabel: detectedHarmony,
      cssValidityStatus,
      overallStatus,
      hasActionableIssues
    };

    return {
      isValid: colorIssueCount === 0 && isAscending,
      findings,
      summary,
      analyzedAt: Date.now(),
      detectedHarmony,
      averageDeltaE,
      maxDeltaE,
      isHardTransitionPresent: hasHardTransition
    };
  }

  /**
   * Identifies the primary harmonic pattern across stop hues.
   */
  private detectHarmonyPattern(hslList: { h: number; s: number; l: number }[]): string {
    if (hslList.length < 2) return 'Monochromatic';

    const hues = hslList.map(c => c.h);
    const sortedHues = [...hues].sort((a, b) => a - b);

    // Circular hue span calculation (handles wrap-around across 0/360)
    let maxGap = 0;
    for (let i = 0; i < sortedHues.length; i++) {
      const nextHue = i === sortedHues.length - 1 ? sortedHues[0] + 360 : sortedHues[i + 1];
      const gap = nextHue - sortedHues[i];
      if (gap > maxGap) maxGap = gap;
    }
    const circularSpan = 360 - maxGap;

    // Monochromatic check (low hue variance)
    if (circularSpan <= 15) return 'Monochromatic';

    // Analogous check (hues within ~55deg)
    if (circularSpan <= 55) return 'Analogous';

    // 2-color complementary check
    if (hslList.length === 2) {
      const diff = Math.abs(hues[0] - hues[1]);
      const angleDiff = Math.min(diff, 360 - diff);
      if (Math.abs(angleDiff - 180) <= 30) return 'Complementary';
      if (angleDiff <= 45) return 'Analogous';
      return 'Duo-tone';
    }

    // 3-color Triadic check
    if (hslList.length === 3) {
      const d1 = Math.abs(sortedHues[1] - sortedHues[0]);
      const d2 = Math.abs(sortedHues[2] - sortedHues[1]);
      if (Math.abs(d1 - 120) <= 35 && Math.abs(d2 - 120) <= 35) return 'Triadic';
    }

    return 'Custom Palette';
  }
}

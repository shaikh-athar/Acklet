// @vitest-environment jsdom
// apps/tool-color-studio/src/services/gradient-repair.service.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { GradientRepairService } from './gradient-repair.service';
import { GradientAnalysisService } from './gradient-analysis.service';
import { ColorEngineService } from './color-engine.service';
import { ColorBlindnessService } from './color-blindness.service';
import { GradientService } from './gradient.service';
import { GradientConfig } from '../models/color.models';
import { CustomRepairOptions } from '../models/gradient-repair.models';

describe('GradientRepairService', () => {
  let service: GradientRepairService;
  let analysisService: GradientAnalysisService;
  let engine: ColorEngineService;
  let blindness: ColorBlindnessService;
  let gradientService: GradientService;

  beforeEach(() => {
    engine = new ColorEngineService();
    blindness = new ColorBlindnessService();
    gradientService = new GradientService();

    const rootInjector = {
      get: (token: any, notFound?: any) => {
        if (token === ColorEngineService) return engine;
        if (token === ColorBlindnessService) return blindness;
        if (token === GradientService) return gradientService;
        if (token === GradientAnalysisService) return analysisService;
        return notFound;
      }
    } as any;

    const envInjector = createEnvironmentInjector([], rootInjector);
    runInInjectionContext(envInjector, () => {
      analysisService = new GradientAnalysisService();
      service = new GradientRepairService();
    });
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Balanced Strategy (Default)', () => {
    it('should sort out-of-order stops ascending', () => {
      const config: GradientConfig = {
        type: 'linear',
        angle: 90,
        stops: [
          { id: '1', color: '#E11D48', position: 100 },
          { id: '2', color: '#8B5CF6', position: 37 },
          { id: '3', color: '#3B82F6', position: 10 }
        ]
      };

      const result = service.repair(config, 'balanced');
      const positions = result.repairedConfig.stops.map(s => s.position);
      for (let i = 1; i < positions.length; i++) {
        expect(positions[i]).toBeGreaterThanOrEqual(positions[i - 1]);
      }
      expect(result.changesMade.length).toBeGreaterThan(0);
    });

    it('should anchor first stop at 0% and last stop at 100%', () => {
      const config: GradientConfig = {
        type: 'linear',
        angle: 90,
        stops: [
          { id: '1', color: '#E11D48', position: 20 },
          { id: '2', color: '#8B5CF6', position: 50 },
          { id: '3', color: '#3B82F6', position: 85 }
        ]
      };

      const result = service.repair(config, 'balanced');
      expect(result.repairedConfig.stops[0].position).toBe(0);
      expect(result.repairedConfig.stops[result.repairedConfig.stops.length - 1].position).toBe(100);
    });

    it('should respect locked stops during redistribution', () => {
      const config: GradientConfig = {
        type: 'linear',
        angle: 90,
        stops: [
          { id: '1', color: '#E11D48', position: 0 },
          { id: '2', color: '#8B5CF6', position: 40, locked: true },
          { id: '3', color: '#10B981', position: 45 },
          { id: '4', color: '#3B82F6', position: 100 }
        ]
      };

      const result = service.repair(config, 'balanced');
      const lockedStop = result.repairedConfig.stops.find(s => s.id === '2');
      expect(lockedStop?.position).toBe(40);
    });

    it('should preserve intentional hard transitions (pos_A === pos_B)', () => {
      const config: GradientConfig = {
        type: 'linear',
        angle: 90,
        stops: [
          { id: '1', color: '#E11D48', position: 0 },
          { id: '2', color: '#E11D48', position: 50 },
          { id: '3', color: '#3B82F6', position: 50 },
          { id: '4', color: '#3B82F6', position: 100 }
        ]
      };

      const result = service.repair(config, 'balanced');
      expect(result.repairedConfig.stops[1].position).toBe(50);
      expect(result.repairedConfig.stops[2].position).toBe(50);
    });

    it('should normalize invalid color strings', () => {
      const config: GradientConfig = {
        type: 'linear',
        angle: 90,
        stops: [
          { id: '1', color: 'corrupted-hex', position: 0 },
          { id: '2', color: '#3B82F6', position: 100 }
        ]
      };

      const result = service.repair(config, 'balanced');
      expect(engine.isValidColor(result.repairedConfig.stops[0].color)).toBe(true);
    });
  });

  describe('Smooth Strategy', () => {
    it('should distribute stops proportionally based on perceptual color delta E', () => {
      // 3 stops where stop 1 & 2 are very similar, stop 2 & 3 are very distant
      const config: GradientConfig = {
        type: 'linear',
        angle: 90,
        stops: [
          { id: '1', color: '#1E3A8A', position: 0 }, // Deep blue
          { id: '2', color: '#1D4ED8', position: 50 }, // Blue
          { id: '3', color: '#FACC15', position: 100 } // Bright yellow (huge Delta E)
        ]
      };

      const result = service.repair(config, 'smooth');
      const middlePos = result.repairedConfig.stops[1].position;
      // Because delta(1,2) is much smaller than delta(2,3), stop 2 moves closer to stop 1
      expect(middlePos).toBeLessThan(50);
      expect(result.strategy).toBe('smooth');
    });
  });

  describe('Color Harmony Strategy', () => {
    it('should tune discordant colors into an analogous harmonic relationship', () => {
      const config: GradientConfig = {
        type: 'linear',
        angle: 90,
        stops: [
          { id: '1', color: '#2563EB', position: 0 }, // Blue anchor (~220deg)
          { id: '2', color: '#22C55E', position: 50 }, // Green
          { id: '3', color: '#EF4444', position: 100 } // Clashing Red
        ]
      };

      const result = service.repair(config, 'harmony');
      expect(result.repairedConfig.stops.length).toBe(3);
      expect(result.changesMade.some(c => c.toLowerCase().includes('harmon'))).toBe(true);
    });
  });

  describe('Contrast Optimized Strategy', () => {
    it('should optimize luminance progression across stops', () => {
      // 2 stops with identical luminance
      const config: GradientConfig = {
        type: 'linear',
        angle: 90,
        stops: [
          { id: '1', color: '#3B82F6', position: 0 },
          { id: '2', color: '#EF4444', position: 100 }
        ]
      };

      const result = service.repair(config, 'contrast');
      expect(result.repairedConfig.stops[0].position).toBe(0);
      expect(result.repairedConfig.stops[1].position).toBe(100);
      expect(result.strategy).toBe('contrast');
    });
  });

  describe('Custom Repair Strategy', () => {
    it('should apply only selected custom options', () => {
      const config: GradientConfig = {
        type: 'linear',
        angle: 450, // Needs normalization
        stops: [
          { id: '1', color: '#E11D48', position: 100 },
          { id: '2', color: '#3B82F6', position: 0 }
        ]
      };

      const customOptions: CustomRepairOptions = {
        stopPositions: true,
        colorTransitions: false,
        colorHarmony: false,
        balanceBrightnessSaturation: false,
        gradientAngle: true,
        cssConfig: true
      };

      const result = service.repair(config, 'custom', customOptions);
      // Stops ordered
      expect(result.repairedConfig.stops[0].position).toBe(0);
      expect(result.repairedConfig.stops[1].position).toBe(100);
      // Angle normalized (450 % 360 = 90)
      expect(result.repairedConfig.angle).toBe(90);
    });
  });
});

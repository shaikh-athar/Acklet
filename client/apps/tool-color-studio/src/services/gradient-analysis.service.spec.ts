// @vitest-environment jsdom
// apps/tool-color-studio/src/services/gradient-analysis.service.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { GradientAnalysisService } from './gradient-analysis.service';
import { ColorEngineService } from './color-engine.service';
import { ColorBlindnessService } from './color-blindness.service';
import { GradientService } from './gradient.service';
import { GradientConfig } from '../models/color.models';

describe('GradientAnalysisService', () => {
  let service: GradientAnalysisService;
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
        return notFound;
      }
    } as any;

    const envInjector = createEnvironmentInjector([], rootInjector);
    runInInjectionContext(envInjector, () => {
      service = new GradientAnalysisService();
    });
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Stop Position Validation', () => {
    it('should detect out-of-order stop positions', () => {
      const config: GradientConfig = {
        type: 'linear',
        angle: 90,
        stops: [
          { id: '1', color: '#FF0000', position: 100 },
          { id: '2', color: '#00FF00', position: 37 },
          { id: '3', color: '#0000FF', position: 40 }
        ]
      };

      const result = service.analyze(config);
      expect(result.summary.stopPositionsCount).toBeGreaterThan(0);
      expect(result.summary.stopPositionsStatus).toBe('needs-attention');
      const orderFinding = result.findings.find(f => f.id.startsWith('pos-order-'));
      expect(orderFinding).toBeDefined();
    });

    it('should detect stops outside 0-100% range', () => {
      const config: GradientConfig = {
        type: 'linear',
        angle: 90,
        stops: [
          { id: '1', color: '#FF0000', position: -10 },
          { id: '2', color: '#0000FF', position: 120 }
        ]
      };

      const result = service.analyze(config);
      const outOfBounds = result.findings.filter(f => f.id.startsWith('pos-bounds-'));
      expect(outOfBounds.length).toBe(2);
    });

    it('should recognize intentional hard cuts when stops share equal position', () => {
      const config: GradientConfig = {
        type: 'linear',
        angle: 90,
        stops: [
          { id: '1', color: '#FF0000', position: 0 },
          { id: '2', color: '#FF0000', position: 50 },
          { id: '3', color: '#0000FF', position: 50 },
          { id: '4', color: '#0000FF', position: 100 }
        ]
      };

      const result = service.analyze(config);
      const hardCut = result.findings.find(f => f.id.startsWith('pos-hard-cut-'));
      expect(hardCut).toBeDefined();
      expect(hardCut?.severity).toBe('info');
    });

    it('should flag crowded stops that cause color pinching', () => {
      const config: GradientConfig = {
        type: 'linear',
        angle: 90,
        stops: [
          { id: '1', color: '#FF0000', position: 0 },
          { id: '2', color: '#FFFF00', position: 49 },
          { id: '3', color: '#0000FF', position: 50 },
          { id: '4', color: '#00FF00', position: 100 }
        ]
      };

      const result = service.analyze(config);
      const crowded = result.findings.find(f => f.id.startsWith('pos-crowded-'));
      expect(crowded).toBeDefined();
    });
  });

  describe('Color Validation & Delta E Smoothness', () => {
    it('should detect invalid color values', () => {
      const config: GradientConfig = {
        type: 'linear',
        angle: 90,
        stops: [
          { id: '1', color: 'not-a-color', position: 0 },
          { id: '2', color: '#3B82F6', position: 100 }
        ]
      };

      const result = service.analyze(config);
      const invalidColor = result.findings.find(f => f.id.startsWith('color-invalid-'));
      expect(invalidColor).toBeDefined();
    });

    it('should detect identical adjacent colors', () => {
      const config: GradientConfig = {
        type: 'linear',
        angle: 90,
        stops: [
          { id: '1', color: '#E11D48', position: 0 },
          { id: '2', color: '#E11D48', position: 50 },
          { id: '3', color: '#3B82F6', position: 100 }
        ]
      };

      const result = service.analyze(config);
      const dup = result.findings.find(f => f.id.startsWith('color-duplicate-'));
      expect(dup).toBeDefined();
    });

    it('should calculate maxDeltaE and flag harsh transitions', () => {
      // Black to pure white in a short span
      const config: GradientConfig = {
        type: 'linear',
        angle: 90,
        stops: [
          { id: '1', color: '#000000', position: 0 },
          { id: '2', color: '#FFFFFF', position: 100 }
        ]
      };

      const result = service.analyze(config);
      expect(result.maxDeltaE).toBeGreaterThan(50);
    });
  });

  describe('Harmony and Configuration Checks', () => {
    it('should detect analogous palette', () => {
      const config: GradientConfig = {
        type: 'linear',
        angle: 90,
        stops: [
          { id: '1', color: '#F97316', position: 0 }, // Orange ~25deg
          { id: '2', color: '#EF4444', position: 50 }, // Red ~0deg
          { id: '3', color: '#EC4899', position: 100 } // Pink ~330deg
        ]
      };

      const result = service.analyze(config);
      expect(result.detectedHarmony).toBe('Analogous');
      expect(result.summary.colorHarmonyStatus).toBe('good');
    });

    it('should detect angle normalization needed when angle is outside [0, 360)', () => {
      const config: GradientConfig = {
        type: 'linear',
        angle: 720,
        stops: [
          { id: '1', color: '#3B82F6', position: 0 },
          { id: '2', color: '#10B981', position: 100 }
        ]
      };

      const result = service.analyze(config);
      const angleFinding = result.findings.find(f => f.id === 'config-angle-unnormalized');
      expect(angleFinding).toBeDefined();
    });
  });
});

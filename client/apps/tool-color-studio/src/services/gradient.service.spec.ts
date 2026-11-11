// @vitest-environment jsdom
// apps/tool-color-studio/src/services/gradient.service.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { GradientService, STORAGE_KEY_SAVED_GRADIENTS } from './gradient.service';
import { GradientConfig, GradientStop } from '../models/color.models';

describe('GradientService (Phase 6 - CSS Gradient Engine)', () => {
  let service: GradientService;

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    service = new GradientService();
  });

  describe('1. Stop Sorting & Formatting', () => {
    it('should sort stops in ascending order by position', () => {
      const stops: GradientStop[] = [
        { id: '1', color: '#3B82F6', position: 100 },
        { id: '2', color: '#E11D48', position: 0 },
        { id: '3', color: '#8B5CF6', position: 50 }
      ];
      const sorted = service.sortStops(stops);
      expect(sorted[0].position).toBe(0);
      expect(sorted[1].position).toBe(50);
      expect(sorted[2].position).toBe(100);
      expect(sorted[0].color).toBe('#E11D48');
    });

    it('should format stops into a valid CSS stops string', () => {
      const stops: GradientStop[] = [
        { id: '1', color: '#E11D48', position: 0 },
        { id: '2', color: '#3B82F6', position: 100 }
      ];
      const formatted = service.formatStopsString(stops);
      expect(formatted).toBe('#E11D48 0%, #3B82F6 100%');
    });
  });

  describe('2. CSS Gradient Generation', () => {
    it('should generate standard linear-gradient CSS', () => {
      const config: GradientConfig = {
        type: 'linear',
        angle: 135,
        stops: [
          { id: '1', color: '#E11D48', position: 0 },
          { id: '2', color: '#3B82F6', position: 100 }
        ]
      };
      const css = service.generateCss(config);
      expect(css).toBe('linear-gradient(135deg, #E11D48 0%, #3B82F6 100%)');
    });

    it('should generate standard radial-gradient CSS with shape, extent, and center coordinates', () => {
      const config: GradientConfig = {
        type: 'radial',
        angle: 0,
        shape: 'circle',
        radialExtent: 'farthest-corner',
        positionX: 50,
        positionY: 50,
        stops: [
          { id: '1', color: '#E11D48', position: 0 },
          { id: '2', color: '#3B82F6', position: 100 }
        ]
      };
      const css = service.generateCss(config);
      expect(css).toBe('radial-gradient(circle farthest-corner at 50% 50%, #E11D48 0%, #3B82F6 100%)');
    });

    it('should generate standard conic-gradient CSS with starting angle and center position', () => {
      const config: GradientConfig = {
        type: 'conic',
        angle: 90,
        positionX: 40,
        positionY: 60,
        stops: [
          { id: '1', color: '#E11D48', position: 0 },
          { id: '2', color: '#F59E0B', position: 50 },
          { id: '3', color: '#3B82F6', position: 100 }
        ]
      };
      const css = service.generateCss(config);
      expect(css).toBe('conic-gradient(from 90deg at 40% 60%, #E11D48 0%, #F59E0B 50%, #3B82F6 100%)');
    });

    it('should normalize angles outside [0, 360) range', () => {
      expect(service.normalizeAngle(400)).toBe(40);
      expect(service.normalizeAngle(-45)).toBe(315);
      expect(service.normalizeAngle(360)).toBe(0);
      expect(service.normalizeAngle(720)).toBe(0);
    });

    it('should clamp position values between 0 and 100', () => {
      expect(service.clampPosition(-10)).toBe(0);
      expect(service.clampPosition(120)).toBe(100);
      expect(service.clampPosition(45.6)).toBe(46);
    });
  });

  describe('3. Rule & File Generation', () => {
    const config: GradientConfig = {
      type: 'linear',
      angle: 90,
      stops: [
        { id: '1', color: '#10B981', position: 0 },
        { id: '2', color: '#06B6D4', position: 100 }
      ]
    };

    it('should generate complete CSS rule with solid background fallback', () => {
      const rule = service.generateFullCssRule(config, '.hero-banner');
      expect(rule).toContain('.hero-banner {');
      expect(rule).toContain('background-color: #10B981;');
      expect(rule).toContain('background-image: linear-gradient(90deg, #10B981 0%, #06B6D4 100%);');
    });

    it('should generate standalone CSS stylesheet file string', () => {
      const fileContent = service.generateCssFile(config, 'aurora-theme');
      expect(fileContent).toContain('Acklet Color Studio — CSS Gradient Export');
      expect(fileContent).toContain('Name: aurora-theme');
      expect(fileContent).toContain('.gradient-background');
      expect(fileContent).toContain('.gradient-fill');
    });

    it('should generate structured JSON export with metadata and stops', () => {
      const jsonStr = service.generateJsonExport(config, 'Emerald Flow');
      const parsed = JSON.parse(jsonStr);
      expect(parsed.name).toBe('Emerald Flow');
      expect(parsed.generator).toBe('Acklet Color Studio');
      expect(parsed.config.type).toBe('linear');
      expect(parsed.config.stops.length).toBe(2);
      expect(parsed.css).toBe('linear-gradient(90deg, #10B981 0%, #06B6D4 100%)');
    });
  });

  describe('4. Stop Operations: Add, Remove, Lock, Reverse, Distribute', () => {
    let baseConfig: GradientConfig;

    beforeEach(() => {
      baseConfig = {
        type: 'linear',
        angle: 90,
        stops: [
          { id: 's1', color: '#E11D48', position: 0, locked: false },
          { id: 's2', color: '#3B82F6', position: 100, locked: false }
        ]
      };
    });

    it('should add a stop between existing stops', () => {
      const updated = service.addStop(baseConfig, '#10B981');
      expect(updated.stops.length).toBe(3);
      expect(updated.stops[1].color).toBe('#10B981');
      expect(updated.stops[1].position).toBe(50);
    });

    it('should enforce minimum 2 stops when attempting to remove', () => {
      const attempted = service.removeStop(baseConfig, 's1');
      expect(attempted.stops.length).toBe(2); // Kept 2 stops
    });

    it('should allow removing a stop when 3 or more stops exist', () => {
      const threeStops: GradientConfig = {
        ...baseConfig,
        stops: [
          ...baseConfig.stops,
          { id: 's3', color: '#10B981', position: 50 }
        ]
      };
      const updated = service.removeStop(threeStops, 's3');
      expect(updated.stops.length).toBe(2);
      expect(updated.stops.find(s => s.id === 's3')).toBeUndefined();
    });

    it('should update stop color and position with validation', () => {
      const updated = service.updateStop(baseConfig, 's1', { color: '00ff00', position: 25 });
      const stop = updated.stops.find(s => s.id === 's1');
      expect(stop?.color).toBe('#00FF00');
      expect(stop?.position).toBe(25);
    });

    it('should toggle stop lock', () => {
      const updated = service.toggleStopLock(baseConfig, 's1');
      expect(updated.stops.find(s => s.id === 's1')?.locked).toBe(true);
      const unlocked = service.toggleStopLock(updated, 's1');
      expect(unlocked.stops.find(s => s.id === 's1')?.locked).toBe(false);
    });

    it('should reverse gradient stops colors and positions', () => {
      const threeStops: GradientConfig = {
        ...baseConfig,
        stops: [
          { id: 's1', color: '#FF0000', position: 0 },
          { id: 's2', color: '#00FF00', position: 40 },
          { id: 's3', color: '#0000FF', position: 100 }
        ]
      };
      const reversed = service.reverseStops(threeStops);
      expect(reversed.stops[0].color).toBe('#0000FF');
      expect(reversed.stops[0].position).toBe(0);
      expect(reversed.stops[1].color).toBe('#00FF00');
      expect(reversed.stops[1].position).toBe(60);
      expect(reversed.stops[2].color).toBe('#FF0000');
      expect(reversed.stops[2].position).toBe(100);
    });

    it('should distribute unlocked stops equally', () => {
      const fourStops: GradientConfig = {
        ...baseConfig,
        stops: [
          { id: 's1', color: '#A', position: 10, locked: false },
          { id: 's2', color: '#B', position: 20, locked: false },
          { id: 's3', color: '#C', position: 80, locked: false },
          { id: 's4', color: '#D', position: 95, locked: false }
        ]
      };
      const distributed = service.distributeStopsEqually(fourStops);
      expect(distributed.stops[0].position).toBe(0);
      expect(distributed.stops[1].position).toBe(33);
      expect(distributed.stops[2].position).toBe(67);
      expect(distributed.stops[3].position).toBe(100);
    });

    it('should preserve locked stops positions when distributing', () => {
      const stops: GradientConfig = {
        ...baseConfig,
        stops: [
          { id: 's1', color: '#A', position: 0, locked: false },
          { id: 's2', color: '#B', position: 42, locked: true }, // Locked at 42%
          { id: 's3', color: '#C', position: 100, locked: false }
        ]
      };
      const distributed = service.distributeStopsEqually(stops);
      expect(distributed.stops.find(s => s.id === 's2')?.position).toBe(42);
    });
  });

  describe('5. Built-in Presets Catalog', () => {
    it('should return rich preset catalog with linear, radial, and conic varieties', () => {
      const presets = service.getPresets();
      expect(presets.length).toBeGreaterThanOrEqual(8);
      expect(presets.some(p => p.config.type === 'linear')).toBe(true);
      expect(presets.some(p => p.config.type === 'radial')).toBe(true);
      expect(presets.some(p => p.config.type === 'conic')).toBe(true);
      expect(presets.some(p => p.name === 'Sunset Glow')).toBe(true);
      expect(presets.some(p => p.name === 'Conic Spectrum')).toBe(true);
    });
  });

  describe('6. Saved Gradients & LocalStorage Persistence', () => {
    it('should load default saved gradients if localStorage is empty', () => {
      const saved = service.loadSavedGradients();
      expect(saved.length).toBeGreaterThan(0);
      expect(saved[0].name).toBe('Aurora Borealis');
    });

    it('should save a new custom gradient and persist to localStorage', () => {
      const config: GradientConfig = {
        type: 'linear',
        angle: 45,
        stops: [
          { id: '1', color: '#111111', position: 0 },
          { id: '2', color: '#999999', position: 100 }
        ]
      };
      const updated = service.saveGradient('Monochrome Fade', config);
      expect(updated[0].name).toBe('Monochrome Fade');
      expect(updated[0].css).toContain('linear-gradient');

      const reloaded = service.loadSavedGradients();
      expect(reloaded[0].name).toBe('Monochrome Fade');
    });

    it('should update saved gradient name', () => {
      const initial = service.saveGradient('Old Name', {
        type: 'linear',
        angle: 90,
        stops: [{ id: '1', color: '#FFF', position: 0 }, { id: '2', color: '#000', position: 100 }]
      });
      const id = initial[0].id;
      const updated = service.updateSavedGradientName(id, 'New Name');
      expect(updated.find(item => item.id === id)?.name).toBe('New Name');
    });

    it('should delete a saved gradient', () => {
      const initial = service.saveGradient('To Delete', {
        type: 'linear',
        angle: 90,
        stops: [{ id: '1', color: '#FFF', position: 0 }, { id: '2', color: '#000', position: 100 }]
      });
      const id = initial[0].id;
      const updated = service.deleteSavedGradient(id);
      expect(updated.find(item => item.id === id)).toBeUndefined();
    });
  });

  describe('7. HTML Canvas Rendering', () => {
    beforeEach(() => {
      const mockGradient = {
        addColorStop: () => {}
      };
      const mockCtx = {
        createLinearGradient: () => mockGradient,
        createRadialGradient: () => mockGradient,
        createConicGradient: () => mockGradient,
        fillRect: () => {},
        fillStyle: ''
      };
      HTMLCanvasElement.prototype.getContext = ((type: string) => {
        if (type === '2d') return mockCtx as any;
        return null;
      }) as any;
    });

    it('should render linear gradient onto HTML Canvas', () => {
      const config: GradientConfig = {
        type: 'linear',
        angle: 135,
        stops: [
          { id: '1', color: '#E11D48', position: 0 },
          { id: '2', color: '#3B82F6', position: 100 }
        ]
      };
      const canvas = service.renderToCanvas(config, 600, 400);
      expect(canvas).toBeTruthy();
      expect(canvas?.width).toBe(600);
      expect(canvas?.height).toBe(400);
    });

    it('should render radial gradient onto HTML Canvas', () => {
      const config: GradientConfig = {
        type: 'radial',
        angle: 0,
        shape: 'circle',
        positionX: 50,
        positionY: 50,
        stops: [
          { id: '1', color: '#10B981', position: 0 },
          { id: '2', color: '#0F172A', position: 100 }
        ]
      };
      const canvas = service.renderToCanvas(config, 800, 600);
      expect(canvas).toBeTruthy();
    });

    it('should render conic gradient onto HTML Canvas', () => {
      const config: GradientConfig = {
        type: 'conic',
        angle: 0,
        positionX: 50,
        positionY: 50,
        stops: [
          { id: '1', color: '#EF4444', position: 0 },
          { id: '2', color: '#3B82F6', position: 100 }
        ]
      };
      const canvas = service.renderToCanvas(config, 400, 400);
      expect(canvas).toBeTruthy();
    });
  });
});

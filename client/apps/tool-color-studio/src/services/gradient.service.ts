// apps/tool-color-studio/src/services/gradient.service.ts
import { Injectable, inject } from '@angular/core';
import { ColorEngineService } from './color-engine.service';
import {
  GradientConfig,
  GradientStop,
  GradientType,
  RadialShape,
  RadialExtent,
  GradientPreset,
  SavedGradient
} from '../models/color.models';

export const STORAGE_KEY_SAVED_GRADIENTS = 'acklet.colorstudio.saved_gradients';

export const INSPIRATION_CATEGORIES: { id: string; label: string }[] = [
  { id: 'popular', label: 'Popular' },
  { id: 'nature', label: 'Nature' },
  { id: 'modern', label: 'Modern' },
  { id: 'warm', label: 'Warm' },
  { id: 'cool', label: 'Cool' },
  { id: 'dark', label: 'Dark' },
  { id: 'all', label: 'All' }
];

export const BUILT_IN_GRADIENT_PRESETS: GradientPreset[] = [
  // ── Popular ──────────────────────────────────────────────────────────────
  {
    id: 'preset-sunset',
    name: 'Sunset',
    category: 'popular',
    config: {
      type: 'linear',
      angle: 135,
      stops: [
        { id: 'ps-1', color: '#FF512F', position: 0 },
        { id: 'ps-2', color: '#DD2476', position: 100 }
      ]
    }
  },
  {
    id: 'preset-ocean-blue',
    name: 'Ocean Blue',
    category: 'popular',
    config: {
      type: 'linear',
      angle: 90,
      stops: [
        { id: 'pob-1', color: '#2E3192', position: 0 },
        { id: 'pob-2', color: '#1BFFFF', position: 100 }
      ]
    }
  },
  {
    id: 'preset-purple-dream',
    name: 'Purple Dream',
    category: 'popular',
    config: {
      type: 'linear',
      angle: 135,
      stops: [
        { id: 'ppd-1', color: '#662D8F', position: 0 },
        { id: 'ppd-2', color: '#ED1E79', position: 100 }
      ]
    }
  },
  {
    id: 'preset-peach-glow',
    name: 'Peach Glow',
    category: 'popular',
    config: {
      type: 'linear',
      angle: 90,
      stops: [
        { id: 'ppg-1', color: '#ED4264', position: 0 },
        { id: 'ppg-2', color: '#FFEDBC', position: 100 }
      ]
    }
  },
  {
    id: 'preset-midnight',
    name: 'Midnight',
    category: 'popular',
    config: {
      type: 'linear',
      angle: 180,
      stops: [
        { id: 'pm-1', color: '#09203F', position: 0 },
        { id: 'pm-2', color: '#537895', position: 100 }
      ]
    }
  },
  {
    id: 'preset-rose-gold',
    name: 'Rose Gold',
    category: 'popular',
    config: {
      type: 'linear',
      angle: 45,
      stops: [
        { id: 'prg-1', color: '#B76E79', position: 0 },
        { id: 'prg-2', color: '#E0A96D', position: 50 },
        { id: 'prg-3', color: '#FAD0C4', position: 100 }
      ]
    }
  },

  // ── Nature ───────────────────────────────────────────────────────────────
  {
    id: 'preset-aurora',
    name: 'Aurora',
    category: 'nature',
    config: {
      type: 'linear',
      angle: 90,
      stops: [
        { id: 'na-1', color: '#00C9FF', position: 0 },
        { id: 'na-2', color: '#92FE9D', position: 100 }
      ]
    }
  },
  {
    id: 'preset-forest',
    name: 'Forest',
    category: 'nature',
    config: {
      type: 'linear',
      angle: 135,
      stops: [
        { id: 'nf-1', color: '#134E5E', position: 0 },
        { id: 'nf-2', color: '#71B280', position: 100 }
      ]
    }
  },
  {
    id: 'preset-nature-ocean',
    name: 'Ocean',
    category: 'nature',
    config: {
      type: 'linear',
      angle: 180,
      stops: [
        { id: 'no-1', color: '#1CB5E0', position: 0 },
        { id: 'no-2', color: '#000046', position: 100 }
      ]
    }
  },
  {
    id: 'preset-tropical',
    name: 'Tropical',
    category: 'nature',
    config: {
      type: 'linear',
      angle: 45,
      stops: [
        { id: 'nt-1', color: '#FA709A', position: 0 },
        { id: 'nt-2', color: '#FEE140', position: 100 }
      ]
    }
  },
  {
    id: 'preset-desert',
    name: 'Desert',
    category: 'nature',
    config: {
      type: 'linear',
      angle: 90,
      stops: [
        { id: 'nd-1', color: '#F3904F', position: 0 },
        { id: 'nd-2', color: '#3B4371', position: 100 }
      ]
    }
  },
  {
    id: 'preset-northern-lights',
    name: 'Northern Lights',
    category: 'nature',
    config: {
      type: 'linear',
      angle: 135,
      stops: [
        { id: 'nnl-1', color: '#43E97B', position: 0 },
        { id: 'nnl-2', color: '#38F9D7', position: 100 }
      ]
    }
  },

  // ── Modern ───────────────────────────────────────────────────────────────
  {
    id: 'preset-electric-purple',
    name: 'Electric Purple',
    category: 'modern',
    config: {
      type: 'linear',
      angle: 135,
      stops: [
        { id: 'mep-1', color: '#667EEA', position: 0 },
        { id: 'mep-2', color: '#764BA2', position: 100 }
      ]
    }
  },
  {
    id: 'preset-cyber-blue',
    name: 'Cyber Blue',
    category: 'modern',
    config: {
      type: 'linear',
      angle: 90,
      stops: [
        { id: 'mcb-1', color: '#00F2FE', position: 0 },
        { id: 'mcb-2', color: '#4FACFE', position: 100 }
      ]
    }
  },
  {
    id: 'preset-neon-pink',
    name: 'Neon Pink',
    category: 'modern',
    config: {
      type: 'linear',
      angle: 45,
      stops: [
        { id: 'mnp-1', color: '#F857A6', position: 0 },
        { id: 'mnp-2', color: '#FF5858', position: 100 }
      ]
    }
  },
  {
    id: 'preset-glass-gradient',
    name: 'Glass Gradient',
    category: 'modern',
    config: {
      type: 'linear',
      angle: 135,
      stops: [
        { id: 'mgg-1', color: '#E0C3FC', position: 0 },
        { id: 'mgg-2', color: '#8EC5FC', position: 100 }
      ]
    }
  },
  {
    id: 'preset-soft-pastel',
    name: 'Soft Pastel',
    category: 'modern',
    config: {
      type: 'linear',
      angle: 90,
      stops: [
        { id: 'msp-1', color: '#D4FC79', position: 0 },
        { id: 'msp-2', color: '#96E6A1', position: 100 }
      ]
    }
  },
  {
    id: 'preset-minimal-gray',
    name: 'Minimal Gray',
    category: 'modern',
    config: {
      type: 'linear',
      angle: 180,
      stops: [
        { id: 'mmg-1', color: '#BDC3C7', position: 0 },
        { id: 'mmg-2', color: '#2C3E50', position: 100 }
      ]
    }
  },

  // ── Warm ─────────────────────────────────────────────────────────────────
  {
    id: 'preset-sunset-orange',
    name: 'Sunset Orange',
    category: 'warm',
    config: {
      type: 'linear',
      angle: 90,
      stops: [
        { id: 'wso-1', color: '#FF5E62', position: 0 },
        { id: 'wso-2', color: '#FF9966', position: 100 }
      ]
    }
  },
  {
    id: 'preset-coral-pink',
    name: 'Coral Pink',
    category: 'warm',
    config: {
      type: 'linear',
      angle: 135,
      stops: [
        { id: 'wcp-1', color: '#FF9A8B', position: 0 },
        { id: 'wcp-2', color: '#FF6A88', position: 100 }
      ]
    }
  },
  {
    id: 'preset-golden-hour',
    name: 'Golden Hour',
    category: 'warm',
    config: {
      type: 'linear',
      angle: 45,
      stops: [
        { id: 'wgh-1', color: '#FAD961', position: 0 },
        { id: 'wgh-2', color: '#F76B1C', position: 100 }
      ]
    }
  },
  {
    id: 'preset-peach-sunset',
    name: 'Peach Sunset',
    category: 'warm',
    config: {
      type: 'linear',
      angle: 90,
      stops: [
        { id: 'wps-1', color: '#FF8177', position: 0 },
        { id: 'wps-2', color: '#B12A5B', position: 100 }
      ]
    }
  },

  // ── Cool ─────────────────────────────────────────────────────────────────
  {
    id: 'preset-arctic-blue',
    name: 'Arctic Blue',
    category: 'cool',
    config: {
      type: 'linear',
      angle: 135,
      stops: [
        { id: 'cab-1', color: '#74EBD5', position: 0 },
        { id: 'cab-2', color: '#9FACE6', position: 100 }
      ]
    }
  },
  {
    id: 'preset-mint-fresh',
    name: 'Mint Fresh',
    category: 'cool',
    config: {
      type: 'linear',
      angle: 90,
      stops: [
        { id: 'cmf-1', color: '#00CDAC', position: 0 },
        { id: 'cmf-2', color: '#8DDAD5', position: 100 }
      ]
    }
  },
  {
    id: 'preset-deep-ocean-cool',
    name: 'Deep Ocean',
    category: 'cool',
    config: {
      type: 'linear',
      angle: 180,
      stops: [
        { id: 'cdo-1', color: '#085078', position: 0 },
        { id: 'cdo-2', color: '#85D8CE', position: 100 }
      ]
    }
  },
  {
    id: 'preset-lavender-mist',
    name: 'Lavender Mist',
    category: 'cool',
    config: {
      type: 'linear',
      angle: 45,
      stops: [
        { id: 'clm-1', color: '#C471ED', position: 0 },
        { id: 'clm-2', color: '#12C2E9', position: 100 }
      ]
    }
  },

  // ── Dark ─────────────────────────────────────────────────────────────────
  {
    id: 'preset-midnight-blue',
    name: 'Midnight Blue',
    category: 'dark',
    config: {
      type: 'linear',
      angle: 180,
      stops: [
        { id: 'dmb-1', color: '#021B79', position: 0 },
        { id: 'dmb-2', color: '#0575E6', position: 100 }
      ]
    }
  },
  {
    id: 'preset-dark-purple',
    name: 'Dark Purple',
    category: 'dark',
    config: {
      type: 'linear',
      angle: 135,
      stops: [
        { id: 'ddp-1', color: '#23074D', position: 0 },
        { id: 'ddp-2', color: '#CC5333', position: 100 }
      ]
    }
  },
  {
    id: 'preset-charcoal',
    name: 'Charcoal',
    category: 'dark',
    config: {
      type: 'linear',
      angle: 90,
      stops: [
        { id: 'dch-1', color: '#0F2027', position: 0 },
        { id: 'dch-2', color: '#203A43', position: 50 },
        { id: 'dch-3', color: '#2C5364', position: 100 }
      ]
    }
  },
  {
    id: 'preset-black-cherry',
    name: 'Black Cherry',
    category: 'dark',
    config: {
      type: 'linear',
      angle: 135,
      stops: [
        { id: 'dbc-1', color: '#1E0505', position: 0 },
        { id: 'dbc-2', color: '#5B0E2D', position: 100 }
      ]
    }
  },

  // ── Preserved Classics & Radial / Conic ──────────────────────────────────
  {
    id: 'preset-sunset-glow',
    name: 'Sunset Glow',
    category: 'popular',
    config: {
      type: 'linear',
      angle: 135,
      stops: [
        { id: 'sg-1', color: '#E11D48', position: 0 },
        { id: 'sg-2', color: '#F97316', position: 52 },
        { id: 'sg-3', color: '#FBBF24', position: 100 }
      ]
    }
  },
  {
    id: 'preset-neon-cyber',
    name: 'Neon Cyber',
    category: 'modern',
    config: {
      type: 'linear',
      angle: 90,
      stops: [
        { id: 'nc-1', color: '#6366F1', position: 0 },
        { id: 'nc-2', color: '#A855F7', position: 48 },
        { id: 'nc-3', color: '#EC4899', position: 100 }
      ]
    }
  },
  {
    id: 'preset-deep-ocean',
    name: 'Deep Ocean',
    category: 'nature',
    config: {
      type: 'linear',
      angle: 180,
      stops: [
        { id: 'do-1', color: '#0EA5E9', position: 0 },
        { id: 'do-2', color: '#0284C7', position: 45 },
        { id: 'do-3', color: '#0F172A', position: 100 }
      ]
    }
  },
  {
    id: 'preset-emerald-aurora',
    name: 'Emerald Aurora',
    category: 'nature',
    config: {
      type: 'linear',
      angle: 45,
      stops: [
        { id: 'ea-1', color: '#10B981', position: 0 },
        { id: 'ea-2', color: '#06B6D4', position: 50 },
        { id: 'ea-3', color: '#3B82F6', position: 100 }
      ]
    }
  },
  {
    id: 'preset-midnight-purple',
    name: 'Midnight Purple',
    category: 'dark',
    config: {
      type: 'linear',
      angle: 135,
      stops: [
        { id: 'mp-1', color: '#1E1B4B', position: 0 },
        { id: 'mp-2', color: '#4C1D95', position: 50 },
        { id: 'mp-3', color: '#7C3AED', position: 100 }
      ]
    }
  },
  {
    id: 'preset-warm-spectrum',
    name: 'Warm Spectrum',
    category: 'warm',
    config: {
      type: 'linear',
      angle: 90,
      stops: [
        { id: 'ws-1', color: '#EF4444', position: 0 },
        { id: 'ws-2', color: '#F59E0B', position: 35 },
        { id: 'ws-3', color: '#10B981', position: 70 },
        { id: 'ws-4', color: '#06B6D4', position: 100 }
      ]
    }
  },
  {
    id: 'preset-cosmic-radial',
    name: 'Cosmic Radial',
    category: 'radial',
    config: {
      type: 'radial',
      angle: 0,
      shape: 'circle',
      radialExtent: 'farthest-corner',
      positionX: 50,
      positionY: 50,
      stops: [
        { id: 'cr-1', color: '#38BDF8', position: 0 },
        { id: 'cr-2', color: '#6366F1', position: 40 },
        { id: 'cr-3', color: '#0F172A', position: 100 }
      ]
    }
  },
  {
    id: 'preset-soft-glow-radial',
    name: 'Soft Glow',
    category: 'radial',
    config: {
      type: 'radial',
      angle: 0,
      shape: 'ellipse',
      radialExtent: 'closest-side',
      positionX: 50,
      positionY: 40,
      stops: [
        { id: 'sg-r1', color: '#FDE047', position: 0 },
        { id: 'sg-r2', color: '#FB7185', position: 55 },
        { id: 'sg-r3', color: '#4C1D95', position: 100 }
      ]
    }
  },
  {
    id: 'preset-conic-spectrum',
    name: 'Conic Spectrum',
    category: 'conic',
    config: {
      type: 'conic',
      angle: 0,
      positionX: 50,
      positionY: 50,
      stops: [
        { id: 'cs-1', color: '#EF4444', position: 0 },
        { id: 'cs-2', color: '#F59E0B', position: 17 },
        { id: 'cs-3', color: '#10B981', position: 33 },
        { id: 'cs-4', color: '#06B6D4', position: 50 },
        { id: 'cs-5', color: '#3B82F6', position: 67 },
        { id: 'cs-6', color: '#8B5CF6', position: 83 },
        { id: 'cs-7', color: '#EF4444', position: 100 }
      ]
    }
  },
  {
    id: 'preset-pastel-conic',
    name: 'Pastel Conic',
    category: 'conic',
    config: {
      type: 'conic',
      angle: 45,
      positionX: 50,
      positionY: 50,
      stops: [
        { id: 'pc-1', color: '#F472B6', position: 0 },
        { id: 'pc-2', color: '#A78BFA', position: 35 },
        { id: 'pc-3', color: '#38BDF8', position: 70 },
        { id: 'pc-4', color: '#F472B6', position: 100 }
      ]
    }
  },
  {
    id: 'preset-cyberpunk-matrix',
    name: 'Cyberpunk Ray',
    category: 'conic',
    config: {
      type: 'conic',
      angle: 180,
      positionX: 50,
      positionY: 50,
      stops: [
        { id: 'cpr-1', color: '#10B981', position: 0 },
        { id: 'cpr-2', color: '#064E3B', position: 40 },
        { id: 'cpr-3', color: '#022C22', position: 75 },
        { id: 'cpr-4', color: '#10B981', position: 100 }
      ]
    }
  }
];

export const DIRECTION_PRESETS: { label: string; angle: number; icon?: string }[] = [
  { label: 'To Top', angle: 0 },
  { label: 'To Top Right', angle: 45 },
  { label: 'To Right', angle: 90 },
  { label: 'To Bottom Right', angle: 135 },
  { label: 'To Bottom', angle: 180 },
  { label: 'To Bottom Left', angle: 225 },
  { label: 'To Left', angle: 270 },
  { label: 'To Top Left', angle: 315 }
];

export const RADIAL_POSITIONS: { label: string; x: number; y: number }[] = [
  { label: 'Center', x: 50, y: 50 },
  { label: 'Top', x: 50, y: 0 },
  { label: 'Top Right', x: 100, y: 0 },
  { label: 'Right', x: 100, y: 50 },
  { label: 'Bottom Right', x: 100, y: 100 },
  { label: 'Bottom', x: 50, y: 100 },
  { label: 'Bottom Left', x: 0, y: 100 },
  { label: 'Left', x: 0, y: 50 },
  { label: 'Top Left', x: 0, y: 0 }
];

@Injectable({
  providedIn: 'root'
})
export class GradientService {
  private engine = (() => {
    try {
      return inject(ColorEngineService);
    } catch {
      return new ColorEngineService();
    }
  })();

  /**
   * Sorts gradient stops in ascending order by position.
   */
  public sortStops(stops: GradientStop[]): GradientStop[] {
    return [...stops].sort((a, b) => a.position - b.position);
  }

  /**
   * Formats color stops into standard CSS color stop syntax string.
   */
  public formatStopsString(stops: GradientStop[]): string {
    const sorted = this.sortStops(stops);
    return sorted.map(s => `${s.color} ${s.position}%`).join(', ');
  }

  /**
   * Generates standard, mathematically valid CSS gradient value.
   */
  public generateCss(config: GradientConfig): string {
    const stopsStr = this.formatStopsString(config.stops);

    switch (config.type) {
      case 'linear': {
        const angle = this.normalizeAngle(config.angle);
        return `linear-gradient(${angle}deg, ${stopsStr})`;
      }

      case 'radial': {
        const shape = config.shape || 'circle';
        const extent = config.radialExtent || 'farthest-corner';
        const posX = config.positionX ?? 50;
        const posY = config.positionY ?? 50;
        return `radial-gradient(${shape} ${extent} at ${posX}% ${posY}%, ${stopsStr})`;
      }

      case 'conic': {
        const angle = this.normalizeAngle(config.angle);
        const posX = config.positionX ?? 50;
        const posY = config.positionY ?? 50;
        return `conic-gradient(from ${angle}deg at ${posX}% ${posY}%, ${stopsStr})`;
      }

      default:
        return `linear-gradient(135deg, ${stopsStr})`;
    }
  }

  /**
   * Generates a complete, ready-to-paste CSS rule block with fallbacks.
   */
  public generateFullCssRule(config: GradientConfig, selector = '.custom-gradient'): string {
    const sorted = this.sortStops(config.stops);
    const fallbackColor = sorted.length > 0 ? sorted[0].color : '#E11D48';
    const cssGradient = this.generateCss(config);

    return [
      `${selector} {`,
      `  /* Fallback solid background */`,
      `  background-color: ${fallbackColor};`,
      `  /* Gradient background */`,
      `  background-image: ${cssGradient};`,
      `}`
    ].join('\n');
  }

  /**
   * Generates standalone downloadable CSS file content.
   */
  public generateCssFile(config: GradientConfig, name = 'acklet-gradient'): string {
    const timestamp = new Date().toISOString();
    return [
      `/*`,
      ` * Acklet Color Studio — CSS Gradient Export`,
      ` * Name: ${name}`,
      ` * Type: ${config.type.toUpperCase()}`,
      ` * Generated: ${timestamp}`,
      ` */`,
      ``,
      this.generateFullCssRule(config, `.gradient-background`),
      ``,
      `/* Utility class for direct inline usage */`,
      `.gradient-fill {`,
      `  background: ${this.generateCss(config)};`,
      `}`
    ].join('\n');
  }

  /**
   * Generates structured JSON export string.
   */
  public generateJsonExport(config: GradientConfig, name = 'Acklet Gradient'): string {
    const payload = {
      name,
      exportedAt: new Date().toISOString(),
      generator: 'Acklet Color Studio',
      css: this.generateCss(config),
      cssRule: this.generateFullCssRule(config),
      config: {
        type: config.type,
        angle: config.angle,
        shape: config.shape || null,
        radialExtent: config.radialExtent || null,
        positionX: config.positionX ?? 50,
        positionY: config.positionY ?? 50,
        stops: this.sortStops(config.stops).map(s => ({
          color: s.color,
          position: s.position,
          locked: !!s.locked
        }))
      }
    };
    return JSON.stringify(payload, null, 2);
  }

  /**
   * Reverses gradient color sequence without altering configured angles or centers.
   */
  public reverseStops(config: GradientConfig): GradientConfig {
    const sorted = this.sortStops(config.stops);
    const reversed = sorted.map((stop, idx) => ({
      ...stop,
      position: 100 - sorted[sorted.length - 1 - idx].position,
      color: sorted[sorted.length - 1 - idx].color
    }));
    return {
      ...config,
      stops: reversed
    };
  }

  /**
   * Distributes all unlocked stops evenly across 0% to 100%.
   */
  public distributeStopsEqually(config: GradientConfig): GradientConfig {
    const stops = [...config.stops];
    if (stops.length < 2) return config;

    const sorted = this.sortStops(stops);
    const step = 100 / (sorted.length - 1);

    const updated = sorted.map((s, idx) => {
      if (s.locked) return s;
      return {
        ...s,
        position: Math.round(idx * step)
      };
    });

    return {
      ...config,
      stops: updated
    };
  }

  /**
   * Adds a new stop interpolated near existing stops in ascending position order.
   */
  public addStop(config: GradientConfig, defaultColor?: string, targetPosition?: number): GradientConfig {
    const stops = this.sortStops(config.stops);
    if (stops.length === 0) {
      return {
        ...config,
        stops: [{ id: `stop-${Date.now()}`, color: defaultColor || '#2563EB', position: 0, locked: false }]
      };
    }
    if (stops.length === 1) {
      return {
        ...config,
        stops: [
          stops[0],
          { id: `stop-${Date.now()}`, color: defaultColor || '#3B82F6', position: 100, locked: false }
        ]
      };
    }

    let insertIndex = stops.length;
    let newPosition = 50;

    if (targetPosition !== undefined) {
      newPosition = this.clampPosition(targetPosition);
      insertIndex = stops.findIndex(s => s.position > newPosition);
      if (insertIndex === -1) {
        insertIndex = stops.length;
      }
    } else {
      // Find largest gap between consecutive stops
      let maxGap = -1;
      let gapIndex = 0;
      for (let i = 0; i < stops.length - 1; i++) {
        const gap = stops[i + 1].position - stops[i].position;
        if (gap > maxGap) {
          maxGap = gap;
          gapIndex = i;
        }
      }

      if (maxGap > 0) {
        newPosition = Math.round(stops[gapIndex].position + maxGap / 2);
        insertIndex = gapIndex + 1;
      } else {
        newPosition = Math.min(100, stops[stops.length - 1].position);
        insertIndex = stops.length;
      }
    }

    let chosenColor = defaultColor;
    if (!chosenColor) {
      const prevColor = stops[Math.max(0, insertIndex - 1)]?.color || '#3B82F6';
      const nextColor = stops[Math.min(stops.length - 1, insertIndex)]?.color || '#2563EB';
      chosenColor = this.interpolateHex(prevColor, nextColor, 0.5);
    }

    const newStop: GradientStop = {
      id: `stop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      color: this.engine.normalizeHex(chosenColor),
      position: this.clampPosition(newPosition),
      locked: false
    };

    const newStops = [...stops];
    newStops.splice(insertIndex, 0, newStop);

    return {
      ...config,
      stops: newStops
    };
  }

  /**
   * Linearly interpolates RGB channels between two hex colors.
   */
  public interpolateHex(hex1: string, hex2: string, factor = 0.5): string {
    const c1 = this.engine.hexToRgb(hex1);
    const c2 = this.engine.hexToRgb(hex2);
    if (!c1 || !c2) return hex1;

    const r = Math.round(c1.r + (c2.r - c1.r) * factor);
    const g = Math.round(c1.g + (c2.g - c1.g) * factor);
    const b = Math.round(c1.b + (c2.b - c1.b) * factor);

    return this.engine.rgbToHex({ r, g, b });
  }

  /**
   * Removes a stop by id, enforcing minimum 2 stops.
   * Supports passing either the full GradientConfig or a GradientStop[] array.
   */
  public removeStop(config: GradientConfig, stopId: string): GradientConfig;
  public removeStop(stops: GradientStop[], stopId: string): GradientStop[];
  public removeStop(configOrStops: GradientConfig | GradientStop[], stopId: string): any {
    if (Array.isArray(configOrStops)) {
      if (configOrStops.length <= 2) {
        return configOrStops;
      }
      return configOrStops.filter(s => s.id !== stopId);
    }
    if (configOrStops.stops.length <= 2) {
      return configOrStops;
    }
    return {
      ...configOrStops,
      stops: configOrStops.stops.filter(s => s.id !== stopId)
    };
  }

  /**
   * Updates an individual stop's color or position with neighboring bounds validation.
   */
  public updateStop(
    config: GradientConfig,
    stopId: string,
    patch: Partial<GradientStop>
  ): GradientConfig {
    const stops = config.stops;
    const idx = stops.findIndex(s => s.id === stopId);
    if (idx === -1) return config;

    const s = stops[idx];
    const color = patch.color ? this.engine.normalizeHex(patch.color) : s.color;

    // Bounds check to enforce Stop 1 <= Stop 2 <= ... <= Stop n
    let position = s.position;
    if (patch.position !== undefined) {
      const minBound = idx > 0 ? stops[idx - 1].position : 0;
      const maxBound = idx < stops.length - 1 ? stops[idx + 1].position : 100;
      position = Math.max(minBound, Math.min(maxBound, this.clampPosition(patch.position)));
    }
    const locked = patch.locked !== undefined ? patch.locked : s.locked;

    const updatedStops = [...stops];
    updatedStops[idx] = { ...s, color, position, locked };

    return {
      ...config,
      stops: updatedStops
    };
  }

  /**
   * Toggles lock state for a specific stop.
   */
  public toggleStopLock(config: GradientConfig, stopId: string): GradientConfig {
    return {
      ...config,
      stops: config.stops.map(s => {
        if (s.id === stopId) {
          return { ...s, locked: !s.locked };
        }
        return s;
      })
    };
  }

  /**
   * Returns list of built-in gradient inspiration presets.
   */
  public getPresets(): GradientPreset[] {
    return BUILT_IN_GRADIENT_PRESETS;
  }

  /**
   * Normalizes angle into [0, 360) range.
   */
  public normalizeAngle(angle: number): number {
    let a = Math.round(angle) % 360;
    if (a < 0) a += 360;
    return a;
  }

  /**
   * Clamps numeric position between 0 and 100.
   */
  public clampPosition(pos: number): number {
    return Math.max(0, Math.min(100, Math.round(pos)));
  }

  /**
   * Renders the current gradient onto an HTML5 Canvas for high-res PNG export.
   */
  public renderToCanvas(
    config: GradientConfig,
    width = 1200,
    height = 800
  ): HTMLCanvasElement | null {
    if (typeof document === 'undefined') return null;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const sorted = this.sortStops(config.stops);

    if (config.type === 'linear') {
      const rad = ((this.normalizeAngle(config.angle) - 90) * Math.PI) / 180;
      const cx = width / 2;
      const cy = height / 2;
      const len = Math.sqrt(width * width + height * height) / 2;
      const x0 = cx - Math.cos(rad) * len;
      const y0 = cy - Math.sin(rad) * len;
      const x1 = cx + Math.cos(rad) * len;
      const y1 = cy + Math.sin(rad) * len;

      const grad = ctx.createLinearGradient(x0, y0, x1, y1);
      sorted.forEach(s => grad.addColorStop(s.position / 100, s.color));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else if (config.type === 'radial') {
      const cx = (width * (config.positionX ?? 50)) / 100;
      const cy = (height * (config.positionY ?? 50)) / 100;
      const maxRadius = Math.max(width, height) * 0.75;

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);
      sorted.forEach(s => grad.addColorStop(s.position / 100, s.color));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else if (config.type === 'conic') {
      const cx = (width * (config.positionX ?? 50)) / 100;
      const cy = (height * (config.positionY ?? 50)) / 100;
      const startAngle = (this.normalizeAngle(config.angle) * Math.PI) / 180;

      // Modern canvas context conic gradient
      if (typeof (ctx as any).createConicGradient === 'function') {
        const grad = (ctx as any).createConicGradient(startAngle, cx, cy);
        sorted.forEach(s => grad.addColorStop(s.position / 100, s.color));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else {
        // Fallback for canvas environments without native createConicGradient
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) / 2);
        sorted.forEach(s => grad.addColorStop(s.position / 100, s.color));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }
    }

    return canvas;
  }

  /**
   * Generates a formatted JSON string for a GradientConfig.
   */
  public generateJson(config: GradientConfig): string {
    return JSON.stringify({
      type: config.type,
      angle: config.angle,
      shape: config.shape,
      stops: config.stops,
      css: this.generateCss(config)
    }, null, 2);
  }

  /**
   * Alias for renderToCanvas.
   */
  public renderGradientToCanvas(
    config: GradientConfig,
    width = 1200,
    height = 800
  ): HTMLCanvasElement | null {
    return this.renderToCanvas(config, width, height);
  }

  // ── LocalStorage Saved Gradients Management ─────────────────────────────────

  public loadSavedGradients(): SavedGradient[] {
    const defaults: SavedGradient[] = [
      {
        id: 'saved-default-aurora',
        name: 'Aurora Borealis',
        config: {
          type: 'linear',
          angle: 135,
          stops: [
            { id: 's1', color: '#0EA5E9', position: 0 },
            { id: 's2', color: '#10B981', position: 50 },
            { id: 's3', color: '#6366F1', position: 100 }
          ]
        },
        css: 'linear-gradient(135deg, #0EA5E9 0%, #10B981 50%, #6366F1 100%)',
        timestamp: 1700000000000
      }
    ];

    if (typeof localStorage === 'undefined') return defaults;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SAVED_GRADIENTS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return defaults;
  }

  public saveGradient(name: string, config: GradientConfig): SavedGradient[] {
    const list = this.loadSavedGradients();
    const cleanName = name.trim() || `Gradient ${list.length + 1}`;
    const newGradient: SavedGradient = {
      id: `grad-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: cleanName,
      config: JSON.parse(JSON.stringify(config)),
      css: this.generateCss(config),
      timestamp: Date.now()
    };
    const updated = [newGradient, ...list].slice(0, 32);
    this.persist(updated);
    return updated;
  }

  public updateSavedGradientName(id: string, newName: string): SavedGradient[] {
    const list = this.loadSavedGradients();
    const updated = list.map(item => {
      if (item.id === id) {
        return { ...item, name: newName.trim() || item.name };
      }
      return item;
    });
    this.persist(updated);
    return updated;
  }

  public deleteSavedGradient(id: string): SavedGradient[] {
    const list = this.loadSavedGradients();
    const updated = list.filter(item => item.id !== id);
    this.persist(updated);
    return updated;
  }

  private persist(list: SavedGradient[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_SAVED_GRADIENTS, JSON.stringify(list));
    } catch {}
  }
}


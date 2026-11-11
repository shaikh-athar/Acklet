// apps/tool-color-studio/src/services/palette.service.ts
import { Injectable, inject } from '@angular/core';
import { ColorEngineService } from './color-engine.service';
import {
  PaletteHarmony,
  PaletteItem,
  PaletteOptions,
  SavedPalette,
  HslColor
} from '../models/color.models';

export const STORAGE_KEY_SAVED_PALETTES = 'acklet.colorstudio.saved_palettes';

export interface NamedColorReference {
  name: string;
  hex: string;
}

const COLOR_NAMES_DICT: NamedColorReference[] = [
  { name: 'Pure Black', hex: '#000000' },
  { name: 'Pure White', hex: '#FFFFFF' },
  { name: 'Slate Dark', hex: '#0F172A' },
  { name: 'Charcoal', hex: '#1E293B' },
  { name: 'Cool Gray', hex: '#64748B' },
  { name: 'Silver Mist', hex: '#CBD5E1' },
  { name: 'Crimson Red', hex: '#DC2626' },
  { name: 'Vibrant Rose', hex: '#E11D48' },
  { name: 'Hot Pink', hex: '#EC4899' },
  { name: 'Blush Pink', hex: '#F472B6' },
  { name: 'Deep Purple', hex: '#581C87' },
  { name: 'Royal Violet', hex: '#7C3AED' },
  { name: 'Indigo Dream', hex: '#6366F1' },
  { name: 'Sky Azure', hex: '#3B82F6' },
  { name: 'Cyan Glow', hex: '#06B6D4' },
  { name: 'Teal Mirage', hex: '#0D9488' },
  { name: 'Emerald Green', hex: '#10B981' },
  { name: 'Forest Moss', hex: '#15803D' },
  { name: 'Lime Zest', hex: '#84CC16' },
  { name: 'Golden Amber', hex: '#F59E0B' },
  { name: 'Warm Orange', hex: '#EA580C' },
  { name: 'Coral Sunrise', hex: '#FB923C' },
  { name: 'Soft Peach', hex: '#FED7AA' },
  { name: 'Cream Vanilla', hex: '#FEF3C7' }
];

@Injectable({
  providedIn: 'root'
})
export class PaletteService {
  private engine: ColorEngineService = (() => {
    try {
      return inject(ColorEngineService);
    } catch {
      return new ColorEngineService();
    }
  })();

  /**
   * Generates a harmonious palette based on one of the 8 canonical color harmony algorithms.
   */
  public generatePalette(
    baseHex: string,
    harmony: PaletteHarmony,
    count = 5,
    options?: PaletteOptions
  ): string[] {
    const cleanBase = this.engine.normalizeHex(baseHex);
    const hsl = this.engine.rgbToHsl(this.engine.hexToRgb(cleanBase));
    const targetCount = Math.max(3, Math.min(10, count));
    const step = options?.hueStep || 30;
    const sVar = options?.saturationVariance || 0;
    const lVar = options?.lightnessVariance || 0;

    const makeColor = (h: number, sOffset = 0, lOffset = 0): string => {
      const normalizedH = ((h % 360) + 360) % 360;
      const s = Math.max(10, Math.min(100, hsl.s + sOffset));
      const l = Math.max(8, Math.min(94, hsl.l + lOffset));
      return this.engine.hslToHex({ h: Math.round(normalizedH), s: Math.round(s), l: Math.round(l) });
    };

    let colors: string[] = [];

    switch (harmony) {
      case 'complementary': {
        // Base and opposite color (180 deg) with balanced variations
        const complementH = hsl.h + 180;
        colors = [cleanBase, makeColor(complementH)];
        for (let i = 2; i < targetCount; i++) {
          const isBaseSide = i % 2 === 0;
          const targetH = isBaseSide ? hsl.h : complementH;
          const shiftL = ((Math.floor(i / 2)) * 14) * (i % 4 < 2 ? 1 : -1);
          colors.push(makeColor(targetH, 0, shiftL + lVar));
        }
        break;
      }

      case 'analogous': {
        // Adjacent neighboring colors at step intervals
        const half = Math.floor(targetCount / 2);
        for (let i = -half; i <= half; i++) {
          if (colors.length >= targetCount) break;
          if (i === 0) {
            colors.push(cleanBase);
          } else {
            const angle = hsl.h + (i * step);
            colors.push(makeColor(angle, (i % 2 === 0 ? sVar : -sVar), (i * 2)));
          }
        }
        break;
      }

      case 'triadic': {
        // 3 colors spaced 120 degrees apart
        const angles = [hsl.h + 120, hsl.h + 240];
        colors = [cleanBase, ...angles.map(a => makeColor(a))];
        for (let i = 3; i < targetCount; i++) {
          const baseA = [hsl.h, hsl.h + 120, hsl.h + 240][i % 3];
          const offsetL = (Math.floor(i / 3) * 16) * (i % 2 === 0 ? 1 : -1);
          colors.push(makeColor(baseA, 0, offsetL));
        }
        break;
      }

      case 'split-complementary': {
        // Base + two colors adjacent to its complement (150 and 210 degrees)
        const angles = [hsl.h + 150, hsl.h + 210];
        colors = [cleanBase, ...angles.map(a => makeColor(a))];
        for (let i = 3; i < targetCount; i++) {
          const baseA = [hsl.h, hsl.h + 150, hsl.h + 210][i % 3];
          const offsetL = (Math.floor(i / 3) * 16) * (i % 2 === 0 ? 1 : -1);
          colors.push(makeColor(baseA, 0, offsetL));
        }
        break;
      }

      case 'tetradic': {
        // Dual complementary pairs: 0, 60, 180, 240 degrees (rectangle scheme)
        const angles = [hsl.h + 60, hsl.h + 180, hsl.h + 240];
        colors = [cleanBase, ...angles.map(a => makeColor(a))];
        for (let i = 4; i < targetCount; i++) {
          const baseA = [hsl.h, hsl.h + 60, hsl.h + 180, hsl.h + 240][i % 4];
          const offsetL = (Math.floor(i / 4) * 16) * (i % 2 === 0 ? 1 : -1);
          colors.push(makeColor(baseA, 0, offsetL));
        }
        break;
      }

      case 'square': {
        // 4 colors spaced evenly at 90 degrees intervals
        const angles = [hsl.h + 90, hsl.h + 180, hsl.h + 270];
        colors = [cleanBase, ...angles.map(a => makeColor(a))];
        for (let i = 4; i < targetCount; i++) {
          const baseA = [hsl.h, hsl.h + 90, hsl.h + 180, hsl.h + 270][i % 4];
          const offsetL = (Math.floor(i / 4) * 16) * (i % 2 === 0 ? 1 : -1);
          colors.push(makeColor(baseA, 0, offsetL));
        }
        break;
      }

      case 'monochromatic': {
        // Same hue with stepped lightness and saturation
        const lStep = 70 / Math.max(1, targetCount - 1);
        for (let i = 0; i < targetCount; i++) {
          const l = 15 + (i * lStep);
          const s = Math.max(20, Math.min(100, hsl.s + (i % 2 === 0 ? sVar : -sVar)));
          colors.push(makeColor(hsl.h, s - hsl.s, l - hsl.l));
        }
        break;
      }

      case 'shades-tints': {
        // Stepped shades (darker) and tints (lighter) centered on base color
        const half = Math.floor(targetCount / 2);
        for (let i = -half; i <= half; i++) {
          if (colors.length >= targetCount) break;
          if (i === 0) {
            colors.push(cleanBase);
          } else {
            const lShift = i * (50 / Math.max(1, half));
            colors.push(makeColor(hsl.h, 0, lShift));
          }
        }
        break;
      }

      default:
        colors = [cleanBase];
    }

    // Ensure we meet exact requested length
    while (colors.length < targetCount) {
      const idx = colors.length;
      colors.push(makeColor(hsl.h + (idx * 37), 0, (idx % 2 === 0 ? 15 : -15)));
    }

    return colors.slice(0, targetCount);
  }

  /**
   * Regenerates only unlocked palette items while keeping locked colors intact.
   */
  public regenerateUnlocked(
    items: PaletteItem[],
    baseHex: string,
    harmony: PaletteHarmony,
    options?: PaletteOptions
  ): PaletteItem[] {
    const count = items.length;
    const generatedHexes = this.generatePalette(baseHex, harmony, count, options);

    return items.map((item, index) => {
      if (item.locked) {
        return item; // Keep locked color intact
      }
      const newHex = generatedHexes[index] || generatedHexes[index % generatedHexes.length];
      return {
        ...item,
        hex: newHex,
        name: this.getNearestColorName(newHex)
      };
    });
  }

  /**
   * Converts a simple list of HEX strings into full PaletteItem models.
   */
  public createPaletteItems(colors: string[]): PaletteItem[] {
    return colors.map((hex, index) => ({
      id: `p-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
      hex: this.engine.normalizeHex(hex),
      locked: false,
      name: this.getNearestColorName(hex)
    }));
  }

  /**
   * Finds the closest human-readable name for a given color using Euclidean distance.
   */
  public getNearestColorName(hex: string): string {
    const clean = this.engine.normalizeHex(hex);
    let minDistance = Infinity;
    let closestName = 'Custom Tone';

    for (const ref of COLOR_NAMES_DICT) {
      const dist = this.engine.calculateRgbDistance(clean, ref.hex);
      if (dist < minDistance) {
        minDistance = dist;
        closestName = ref.name;
      }
    }

    return closestName;
  }

  /**
   * Adds an individual color to the palette (clamped to max 10).
   */
  public addColor(items: PaletteItem[], hex?: string): PaletteItem[] {
    if (items.length >= 10) return items;
    const chosen = hex || '#FB7185';
    const clean = this.engine.normalizeHex(chosen);
    const newItem: PaletteItem = {
      id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      hex: clean,
      locked: false,
      name: this.getNearestColorName(clean)
    };
    return [...items, newItem];
  }

  /**
   * Removes an individual color from the palette (clamped to min 3).
   */
  public removeColor(items: PaletteItem[], id: string): PaletteItem[] {
    if (items.length <= 3) return items;
    return items.filter(item => item.id !== id);
  }

  /**
   * Reorders items moving an item from sourceIndex to targetIndex.
   */
  public reorderColor(items: PaletteItem[], fromIdx: number, toIdx: number): PaletteItem[] {
    if (fromIdx < 0 || fromIdx >= items.length || toIdx < 0 || toIdx >= items.length) {
      return items;
    }
    const updated = [...items];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    return updated;
  }

  /**
   * Toggles the lock status of an item.
   */
  public toggleLock(items: PaletteItem[], id: string): PaletteItem[] {
    return items.map(item => item.id === id ? { ...item, locked: !item.locked } : item);
  }

  /**
   * Updates an item's color and recalculates its name.
   */
  public updateColor(items: PaletteItem[], id: string, newHex: string): PaletteItem[] {
    const clean = this.engine.normalizeHex(newHex);
    return items.map(item => item.id === id ? { ...item, hex: clean, name: this.getNearestColorName(clean) } : item);
  }

  /**
   * Inverts the order of colors in the palette.
   */
  public reversePalette(items: PaletteItem[]): PaletteItem[] {
    return [...items].reverse();
  }

  // ── Multi-Format Palette Exporters ────────────────────────────────────────

  /**
   * Generates JSON export string with full channel breakdowns and metadata.
   */
  public generateJson(items: PaletteItem[], name = 'Acklet Palette'): string {
    const payload = {
      name,
      exportedAt: new Date().toISOString(),
      generator: 'Acklet Color Studio',
      count: items.length,
      colors: items.map((item, idx) => {
        const obj = this.engine.parseColor(item.hex);
        return {
          index: idx + 1,
          name: item.name || `Color ${idx + 1}`,
          hex: item.hex.toUpperCase(),
          rgb: obj.rgb,
          hsl: obj.hsl,
          hsv: obj.hsv,
          cmyk: obj.cmyk,
          isDark: obj.isDark
        };
      })
    };
    return JSON.stringify(payload, null, 2);
  }

  /**
   * Generates CSS variables stylesheet snippet.
   */
  public generateCss(items: PaletteItem[], selector = ':root'): string {
    const lines = items.map((item, idx) => `  --color-${idx + 1}: ${item.hex.toUpperCase()}; /* ${item.name || ''} */`);
    return [
      `/* Acklet Color Studio — Generated Palette */`,
      `${selector} {`,
      ...lines,
      `}`
    ].join('\n');
  }

  /**
   * Generates Tailwind CSS config colors extension snippet.
   */
  public generateTailwind(items: PaletteItem[]): string {
    const lines = items.map((item, idx) => `        'color-${idx + 1}': '${item.hex.toUpperCase()}',`);
    return [
      `// tailwind.config.js`,
      `module.exports = {`,
      `  theme: {`,
      `    extend: {`,
      `      colors: {`,
      ...lines,
      `      }`,
      `    }`,
      `  }`,
      `};`
    ].join('\n');
  }

  /**
   * Generates GIMP / Inkscape Palette (.gpl) standard text format.
   */
  public generateGpl(items: PaletteItem[], name = 'Acklet Palette'): string {
    const header = [
      `GIMP Palette`,
      `Name: ${name}`,
      `Columns: ${items.length}`,
      `# Generated by Acklet Color Studio`
    ];

    const rows = items.map(item => {
      const rgb = this.engine.hexToRgb(item.hex);
      const r = rgb.r.toString().padStart(3, ' ');
      const g = rgb.g.toString().padStart(3, ' ');
      const b = rgb.b.toString().padStart(3, ' ');
      const label = item.name || item.hex.toUpperCase();
      return `${r} ${g} ${b}  ${label}`;
    });

    return [...header, ...rows].join('\n');
  }

  /**
   * Generates Adobe Swatch Exchange (.ase) binary byte buffer.
   */
  public generateAse(items: PaletteItem[]): Uint8Array {
    // ASE Format:
    // Signature: 'ASEF' (4 bytes)
    // Version: 1.0 (4 bytes: major uint16 1, minor uint16 0)
    // Block count: uint32 (number of color entries)
    // For each color entry:
    //   Block type: uint16 = 0x0001 (Color entry)
    //   Block length: uint32
    //   Name length: uint16 (chars + 1 null terminator)
    //   Name: UTF-16BE chars + null terminator
    //   Color space: 4 bytes 'RGB '
    //   Float32 values: R, G, B (0.0 to 1.0)
    //   Color type: uint16 (0 = Global, 2 = Normal)

    const buffer: number[] = [];

    const writeUint16 = (val: number) => {
      buffer.push((val >> 8) & 0xff, val & 0xff);
    };

    const writeUint32 = (val: number) => {
      buffer.push((val >> 24) & 0xff, (val >> 16) & 0xff, (val >> 8) & 0xff, val & 0xff);
    };

    const writeFloat32 = (val: number) => {
      const fArr = new Float32Array([val]);
      const bArr = new Uint8Array(fArr.buffer);
      // Ensure Big Endian
      const isLittle = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
      if (isLittle) {
        for (let i = 3; i >= 0; i--) buffer.push(bArr[i]);
      } else {
        for (let i = 0; i < 4; i++) buffer.push(bArr[i]);
      }
    };

    // 1. Signature 'ASEF'
    buffer.push(0x41, 0x53, 0x45, 0x46);
    // 2. Version 1.0
    writeUint16(1);
    writeUint16(0);
    // 3. Block Count
    writeUint32(items.length);

    // 4. Color Blocks
    for (const item of items) {
      writeUint16(0x0001); // Color entry
      const name = (item.name || item.hex).trim();
      const nameLen = name.length + 1; // including 0x0000 terminator
      const blockLength = 2 + (nameLen * 2) + 4 + 12 + 2;
      writeUint32(blockLength);

      // Name
      writeUint16(nameLen);
      for (let i = 0; i < name.length; i++) {
        writeUint16(name.charCodeAt(i));
      }
      writeUint16(0); // null terminator

      // Color Model 'RGB '
      buffer.push(0x52, 0x47, 0x42, 0x20);

      const rgb = this.engine.hexToRgb(item.hex);
      writeFloat32(rgb.r / 255);
      writeFloat32(rgb.g / 255);
      writeFloat32(rgb.b / 255);

      // Color Type 0 = Global
      writeUint16(0);
    }

    return new Uint8Array(buffer);
  }

  /**
   * Renders a clean, high-resolution visual swatch graphic to an offscreen Canvas for PNG export.
   */
  public renderToCanvas(
    items: PaletteItem[],
    width = 1200,
    height = 420
  ): HTMLCanvasElement | null {
    if (typeof document === 'undefined') return null;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Draw background
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, width, height);

    const count = items.length;
    const colWidth = width / count;

    items.forEach((item, idx) => {
      const x = idx * colWidth;

      // Color block
      ctx.fillStyle = item.hex;
      ctx.fillRect(x, 0, colWidth, height - 90);

      // Bottom info card
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(x, height - 90, colWidth, 90);

      // Border between columns
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, 0, colWidth, height);

      // Hex Text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(item.hex.toUpperCase(), x + colWidth / 2, height - 52);

      // Color Name
      ctx.fillStyle = '#94A3B8';
      ctx.font = '12px sans-serif';
      ctx.fillText(item.name || `Color ${idx + 1}`, x + colWidth / 2, height - 26);
    });

    return canvas;
  }

  // ── Saved Palettes Persistence ──────────────────────────────────────────────

  public loadSavedPalettes(): SavedPalette[] {
    const defaults: SavedPalette[] = [
      {
        id: 'palette-default-sunset',
        name: 'Sunset Coast',
        description: 'Warm glowing gradient of twilight oranges and deep navy.',
        colors: ['#1E1B4B', '#E11D48', '#F59E0B', '#0F766E', '#FFFBEB'],
        favorite: true,
        harmony: 'analogous',
        timestamp: 1700000000000
      },
      {
        id: 'palette-default-aurora',
        name: 'Nordic Aurora',
        description: 'Vibrant neon greens and deep icy blues.',
        colors: ['#042F2E', '#0D9488', '#10B981', '#38BDF8', '#6366F1'],
        favorite: false,
        harmony: 'analogous',
        timestamp: 1700000001000
      }
    ];

    if (typeof localStorage === 'undefined') return defaults;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SAVED_PALETTES);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return defaults;
  }

  public clearAll(): void {
    this.persist([]);
  }

  public savePalette(
    name: string,
    colors: string[],
    description?: string,
    harmony: PaletteHarmony = 'analogous'
  ): SavedPalette[] {
    const list = this.loadSavedPalettes();
    const cleanColors = colors.map(c => this.engine.normalizeHex(c));
    const newPalette: SavedPalette = {
      id: `palette-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim() || `Palette ${list.length + 1}`,
      description: description?.trim() || undefined,
      colors: cleanColors,
      favorite: false,
      harmony,
      timestamp: Date.now()
    };
    const updated = [newPalette, ...list].slice(0, 40);
    this.persist(updated);
    return updated;
  }

  public updateSavedPalette(id: string, patch: Partial<SavedPalette>): SavedPalette[] {
    const list = this.loadSavedPalettes();
    const updated = list.map(item => {
      if (item.id === id) {
        return { ...item, ...patch };
      }
      return item;
    });
    this.persist(updated);
    return updated;
  }

  public deleteSavedPalette(id: string): SavedPalette[] {
    const list = this.loadSavedPalettes();
    const updated = list.filter(item => item.id !== id);
    this.persist(updated);
    return updated;
  }

  public duplicatePalette(id: string): SavedPalette[] {
    const list = this.loadSavedPalettes();
    const target = list.find(item => item.id === id);
    if (!target) return list;

    const copy: SavedPalette = {
      ...target,
      id: `palette-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: `${target.name} (Copy)`,
      timestamp: Date.now()
    };
    const updated = [copy, ...list].slice(0, 40);
    this.persist(updated);
    return updated;
  }

  public toggleFavorite(id: string): SavedPalette[] {
    const list = this.loadSavedPalettes();
    const updated = list.map(item => {
      if (item.id === id) {
        return { ...item, favorite: !item.favorite };
      }
      return item;
    });
    this.persist(updated);
    return updated;
  }

  private persist(list: SavedPalette[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_SAVED_PALETTES, JSON.stringify(list));
    } catch {}
  }
}

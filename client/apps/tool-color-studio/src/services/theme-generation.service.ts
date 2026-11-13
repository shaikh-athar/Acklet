// apps/tool-color-studio/src/services/theme-generation.service.ts
import { Injectable } from '@angular/core';
import {
  UiTheme,
  SemanticToken,
  ThemeStyle,
  ColorMood,
  ApplicationType,
  ThemeCategory,
  ThemeMode,
  ThemeVariationOptions
} from '../models/theme.models';

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const TOKEN_KEY_SURFACE_ELEVATED = '--color-' + 'surface-elevated';
const TOKEN_KEY_SURFACE_MUTED = '--color-' + 'surface-muted';

@Injectable({
  providedIn: 'root'
})
export class ThemeGenerationService {
  /**
   * Deterministically generates a complete 23-token UI Theme from base parameters.
   */
  public generateTheme(options: {
    baseColor: string;
    style?: ThemeStyle;
    mood?: ColorMood;
    appType?: ApplicationType;
    mode?: 'light' | 'dark';
    name?: string;
    category?: ThemeCategory;
    lockedTokens?: Record<string, string>; // key -> hex
  }): UiTheme {
    const style = options.style || 'modern';
    const mood = options.mood || 'calm';
    const appType = options.appType || 'saas-dashboard';
    const mode = options.mode || 'light';
    const baseColor = this.normalizeHex(options.baseColor || '#2563EB');
    const category = options.category || this.inferCategory(style, appType, mode);
    const name = options.name || this.generateThemeName(baseColor, style, mood, appType, mode);

    const baseHsl = this.hexToHsl(baseColor);
    const tunedBaseHsl = this.tuneBaseHslByMoodAndStyle(baseHsl, mood, style);

    const tokens: SemanticToken[] = [];
    const locked = options.lockedTokens || {};

    if (mode === 'light') {
      this.buildLightTokens(tokens, tunedBaseHsl, style, mood, locked);
    } else {
      this.buildDarkTokens(tokens, tunedBaseHsl, style, mood, locked);
    }

    return {
      id: 'theme-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36),
      name,
      category,
      style,
      mood,
      appType,
      mode,
      baseColor,
      tokens,
      favorite: false,
      isCustom: false,
      createdAt: Date.now()
    };
  }

  /**
   * Generates both Light and Dark variants of a theme.
   */
  public generateThemePair(options: {
    baseColor: string;
    style?: ThemeStyle;
    mood?: ColorMood;
    appType?: ApplicationType;
    name?: string;
    category?: ThemeCategory;
  }): { light: UiTheme; dark: UiTheme } {
    const baseName = options.name || this.generateThemeName(
      options.baseColor,
      options.style || 'modern',
      options.mood || 'calm',
      options.appType || 'saas-dashboard',
      'light'
    ).replace(' Light', '').replace(' Dark', '');

    const light = this.generateTheme({
      ...options,
      mode: 'light',
      name: `${baseName} Light`
    });

    const dark = this.generateTheme({
      ...options,
      mode: 'dark',
      name: `${baseName} Dark`
    });

    return { light, dark };
  }

  /**
   * Generates a normalized fingerprint for duplicate detection.
   */
  public getThemeFingerprint(theme: UiTheme): string {
    const primary = theme.tokens.find(t => t.key === '--color-primary')?.hex || theme.baseColor;
    const accent = theme.tokens.find(t => t.key === '--color-accent')?.hex || '';
    const bg = theme.tokens.find(t => t.key === '--color-background')?.hex || '';
    return `${theme.mode}:${primary}:${accent}:${bg}`;
  }

  /**
   * Generates a batch of distinct, unique UI themes matching user preferences.
   * If mode is 'both', generates pairs of matching light/dark themes.
   * Ensures every theme in the batch has a unique fingerprint and name.
   */
  public generateThemeBatch(options: {
    baseColor: string;
    style?: ThemeStyle;
    mood?: ColorMood;
    appType?: ApplicationType;
    mode?: ThemeMode;
    count?: number;
    offset?: number;
    existingFingerprints?: Set<string>;
    category?: ThemeCategory;
  }): UiTheme[] {
    const count = Math.max(1, Math.min(20, options.count || 4));
    const mode = options.mode || 'both';
    const style = options.style || 'modern';
    const mood = options.mood || 'calm';
    const appType = options.appType || 'saas-dashboard';
    const baseColor = this.normalizeHex(options.baseColor || '#2563EB');
    const baseHsl = this.hexToHsl(baseColor);
    const offset = Math.max(0, options.offset || 0);

    const results: UiTheme[] = [];
    const usedFingerprints = new Set<string>(options.existingFingerprints || []);

    const variationProfiles = [
      { nameModifier: '', hueShift: 0, satMultiplier: 1.0, lightDelta: 0 },
      { nameModifier: 'Analog', hueShift: 18, satMultiplier: 1.08, lightDelta: -2 },
      { nameModifier: 'Vibrant', hueShift: -14, satMultiplier: 1.25, lightDelta: -4 },
      { nameModifier: 'Muted', hueShift: 10, satMultiplier: 0.72, lightDelta: 3 },
      { nameModifier: 'High Contrast', hueShift: 26, satMultiplier: 1.15, lightDelta: -6 },
      { nameModifier: 'Ambient', hueShift: -26, satMultiplier: 0.85, lightDelta: 4 },
      { nameModifier: 'Editorial', hueShift: 36, satMultiplier: 0.88, lightDelta: -1 },
      { nameModifier: 'Deep Tonal', hueShift: -38, satMultiplier: 1.12, lightDelta: -5 },
      { nameModifier: 'Luminous', hueShift: 48, satMultiplier: 1.22, lightDelta: 2 },
      { nameModifier: 'Executive', hueShift: -48, satMultiplier: 0.95, lightDelta: -3 },
      { nameModifier: 'Prism', hueShift: 60, satMultiplier: 1.15, lightDelta: -2 },
      { nameModifier: 'Velvet', hueShift: -60, satMultiplier: 0.8, lightDelta: 2 },
      { nameModifier: 'Radiance', hueShift: 75, satMultiplier: 1.25, lightDelta: -4 },
      { nameModifier: 'Nordic', hueShift: -75, satMultiplier: 0.85, lightDelta: 3 },
      { nameModifier: 'Chromatic', hueShift: 90, satMultiplier: 1.1, lightDelta: -3 },
      { nameModifier: 'Aura', hueShift: -90, satMultiplier: 0.9, lightDelta: 1 },
      { nameModifier: 'Solar', hueShift: 120, satMultiplier: 1.2, lightDelta: -2 },
      { nameModifier: 'Lunar', hueShift: -120, satMultiplier: 0.75, lightDelta: 4 },
      { nameModifier: 'Nova', hueShift: 140, satMultiplier: 1.28, lightDelta: -5 },
      { nameModifier: 'Zenith', hueShift: -140, satMultiplier: 0.82, lightDelta: 3 },
      { nameModifier: 'Apex', hueShift: 160, satMultiplier: 1.15, lightDelta: -2 },
      { nameModifier: 'Echo', hueShift: -160, satMultiplier: 0.9, lightDelta: 2 },
      { nameModifier: 'Spectrum', hueShift: 180, satMultiplier: 1.1, lightDelta: -3 },
      { nameModifier: 'Horizon', hueShift: 200, satMultiplier: 1.05, lightDelta: 1 }
    ];

    const maxAttempts = 100;
    let attempt = 0;

    if (mode === 'both') {
      while (results.length < count && attempt < maxAttempts) {
        const index = offset + attempt;
        const profIdx = index % variationProfiles.length;
        const cycle = Math.floor(index / variationProfiles.length);
        const prof = variationProfiles[profIdx];

        const extraHueShift = cycle * 31;
        const shiftedH = (baseHsl.h + prof.hueShift + extraHueShift + 3600) % 360;
        const shiftedS = Math.min(100, Math.max(15, Math.round(baseHsl.s * prof.satMultiplier)));
        const shiftedL = Math.min(88, Math.max(12, Math.round(baseHsl.l + prof.lightDelta)));
        const variantBaseHex = (prof.hueShift === 0 && cycle === 0 && prof.satMultiplier === 1.0 && prof.lightDelta === 0)
          ? baseColor
          : this.hslToHex({ h: shiftedH, s: shiftedS, l: shiftedL });

        const modifier = cycle > 0 ? `${prof.nameModifier || 'Tonal'} ${cycle + 1}`.trim() : prof.nameModifier;

        const baseThemeName = this.generateThemeName(
          variantBaseHex,
          style,
          mood,
          appType,
          'light',
          modifier
        ).replace(' Light', '').replace(' Dark', '');

        const pair = this.generateThemePair({
          baseColor: variantBaseHex,
          style,
          mood,
          appType,
          name: baseThemeName,
          category: options.category
        });

        if (options.category) {
          pair.light.category = options.category;
          pair.dark.category = options.category;
        }

        const lightFp = this.getThemeFingerprint(pair.light);
        const darkFp = this.getThemeFingerprint(pair.dark);

        if (!usedFingerprints.has(lightFp) && results.length < count) {
          usedFingerprints.add(lightFp);
          results.push(pair.light);
        }
        if (!usedFingerprints.has(darkFp) && results.length < count) {
          usedFingerprints.add(darkFp);
          results.push(pair.dark);
        }

        attempt++;
      }
    } else {
      while (results.length < count && attempt < maxAttempts) {
        const index = offset + attempt;
        const profIdx = index % variationProfiles.length;
        const cycle = Math.floor(index / variationProfiles.length);
        const prof = variationProfiles[profIdx];

        const extraHueShift = cycle * 31;
        const shiftedH = (baseHsl.h + prof.hueShift + extraHueShift + 3600) % 360;
        const shiftedS = Math.min(100, Math.max(15, Math.round(baseHsl.s * prof.satMultiplier)));
        const shiftedL = Math.min(88, Math.max(12, Math.round(baseHsl.l + prof.lightDelta)));
        const variantBaseHex = (prof.hueShift === 0 && cycle === 0 && prof.satMultiplier === 1.0 && prof.lightDelta === 0)
          ? baseColor
          : this.hslToHex({ h: shiftedH, s: shiftedS, l: shiftedL });

        const modifier = cycle > 0 ? `${prof.nameModifier || 'Tonal'} ${cycle + 1}`.trim() : prof.nameModifier;

        const name = this.generateThemeName(
          variantBaseHex,
          style,
          mood,
          appType,
          mode,
          modifier
        );

        const theme = this.generateTheme({
          baseColor: variantBaseHex,
          style,
          mood,
          appType,
          mode,
          name,
          category: options.category
        });

        if (options.category) {
          theme.category = options.category;
        }

        const fp = this.getThemeFingerprint(theme);
        if (!usedFingerprints.has(fp)) {
          usedFingerprints.add(fp);
          results.push(theme);
        }

        attempt++;
      }
    }

    return results;
  }

  /**
   * Generates a batch of distinct UI themes tailored for a specific category.
   */
  public generateCategoryThemes(
    category: ThemeCategory,
    count: number = 4,
    existingFingerprints?: Set<string>,
    offset: number = 0
  ): UiTheme[] {
    const categoryConfigs: Record<ThemeCategory, Array<{
      baseColor: string;
      style: ThemeStyle;
      mood: ColorMood;
      appType: ApplicationType;
      mode: 'light' | 'dark';
    }>> = {
      'FinTech': [
        { baseColor: '#059669', style: 'corporate', mood: 'calm', appType: 'fintech', mode: 'light' },
        { baseColor: '#0D9488', style: 'corporate', mood: 'bold', appType: 'fintech', mode: 'dark' },
        { baseColor: '#2563EB', style: 'modern', mood: 'cool', appType: 'fintech', mode: 'light' },
        { baseColor: '#D97706', style: 'luxury', mood: 'warm', appType: 'fintech', mode: 'dark' },
        { baseColor: '#047857', style: 'corporate', mood: 'neutral', appType: 'fintech', mode: 'light' },
        { baseColor: '#1E3A8A', style: 'minimal', mood: 'bold', appType: 'fintech', mode: 'dark' },
        { baseColor: '#0891B2', style: 'modern', mood: 'calm', appType: 'fintech', mode: 'light' },
        { baseColor: '#B45309', style: 'corporate', mood: 'warm', appType: 'fintech', mode: 'dark' }
      ],
      'Dark & Cinematic': [
        { baseColor: '#8B5CF6', style: 'dark-cinematic', mood: 'bold', appType: 'developer-tool', mode: 'dark' },
        { baseColor: '#EC4899', style: 'dark-cinematic', mood: 'vibrant', appType: 'mobile-app', mode: 'dark' },
        { baseColor: '#06B6D4', style: 'dark-cinematic', mood: 'cool', appType: 'saas-dashboard', mode: 'dark' },
        { baseColor: '#10B981', style: 'dark-cinematic', mood: 'calm', appType: 'developer-tool', mode: 'dark' },
        { baseColor: '#6366F1', style: 'dark-cinematic', mood: 'bold', appType: 'admin-panel', mode: 'dark' },
        { baseColor: '#F43F5E', style: 'dark-cinematic', mood: 'vibrant', appType: 'landing-page', mode: 'dark' },
        { baseColor: '#A855F7', style: 'dark-cinematic', mood: 'cool', appType: 'ecommerce', mode: 'dark' },
        { baseColor: '#3B82F6', style: 'dark-cinematic', mood: 'neutral', appType: 'developer-tool', mode: 'dark' }
      ],
      'Minimal & Clean': [
        { baseColor: '#0F172A', style: 'minimal', mood: 'neutral', appType: 'developer-tool', mode: 'light' },
        { baseColor: '#64748B', style: 'minimal', mood: 'calm', appType: 'productivity', mode: 'light' },
        { baseColor: '#334155', style: 'editorial', mood: 'muted', appType: 'portfolio', mode: 'dark' },
        { baseColor: '#52525B', style: 'minimal', mood: 'neutral', appType: 'admin-panel', mode: 'light' },
        { baseColor: '#475569', style: 'editorial', mood: 'calm', appType: 'landing-page', mode: 'light' },
        { baseColor: '#18181B', style: 'minimal', mood: 'bold', appType: 'developer-tool', mode: 'dark' }
      ],
      'Modern SaaS': [
        { baseColor: '#4F46E5', style: 'modern', mood: 'calm', appType: 'saas-dashboard', mode: 'light' },
        { baseColor: '#0284C7', style: 'modern', mood: 'cool', appType: 'saas-dashboard', mode: 'light' },
        { baseColor: '#2563EB', style: 'modern', mood: 'bold', appType: 'admin-panel', mode: 'dark' },
        { baseColor: '#7C3AED', style: 'modern', mood: 'vibrant', appType: 'saas-dashboard', mode: 'light' },
        { baseColor: '#0EA5E9', style: 'modern', mood: 'cool', appType: 'developer-tool', mode: 'dark' },
        { baseColor: '#3B82F6', style: 'modern', mood: 'calm', appType: 'saas-dashboard', mode: 'light' }
      ],
      'Natural & Organic': [
        { baseColor: '#65A30D', style: 'natural', mood: 'calm', appType: 'portfolio', mode: 'light' },
        { baseColor: '#84CC16', style: 'natural', mood: 'warm', appType: 'ecommerce', mode: 'light' },
        { baseColor: '#16A34A', style: 'natural', mood: 'calm', appType: 'landing-page', mode: 'dark' },
        { baseColor: '#B45309', style: 'natural', mood: 'warm', appType: 'portfolio', mode: 'light' },
        { baseColor: '#059669', style: 'natural', mood: 'muted', appType: 'productivity', mode: 'light' },
        { baseColor: '#78350F', style: 'natural', mood: 'warm', appType: 'ecommerce', mode: 'dark' }
      ],
      'Creative & Colorful': [
        { baseColor: '#D946EF', style: 'creative', mood: 'vibrant', appType: 'portfolio', mode: 'light' },
        { baseColor: '#F97316', style: 'vibrant', mood: 'bold', appType: 'landing-page', mode: 'light' },
        { baseColor: '#E11D48', style: 'creative', mood: 'vibrant', appType: 'mobile-app', mode: 'dark' },
        { baseColor: '#8B5CF6', style: 'vibrant', mood: 'cool', appType: 'ecommerce', mode: 'light' },
        { baseColor: '#06B6D4', style: 'creative', mood: 'pastel', appType: 'portfolio', mode: 'light' },
        { baseColor: '#10B981', style: 'vibrant', mood: 'vibrant', appType: 'mobile-app', mode: 'dark' }
      ],
      'Luxury & Elegant': [
        { baseColor: '#D4AF37', style: 'luxury', mood: 'warm', appType: 'ecommerce', mode: 'light' },
        { baseColor: '#701A75', style: 'luxury', mood: 'bold', appType: 'portfolio', mode: 'dark' },
        { baseColor: '#9A3412', style: 'elegant', mood: 'warm', appType: 'landing-page', mode: 'light' },
        { baseColor: '#831843', style: 'luxury', mood: 'muted', appType: 'ecommerce', mode: 'dark' },
        { baseColor: '#854D0E', style: 'elegant', mood: 'warm', appType: 'portfolio', mode: 'light' },
        { baseColor: '#1E1B4B', style: 'luxury', mood: 'calm', appType: 'landing-page', mode: 'dark' }
      ],
      'High Contrast': [
        { baseColor: '#000000', style: 'brutalist', mood: 'bold', appType: 'developer-tool', mode: 'dark' },
        { baseColor: '#1E293B', style: 'brutalist', mood: 'bold', appType: 'admin-panel', mode: 'light' },
        { baseColor: '#2563EB', style: 'brutalist', mood: 'vibrant', appType: 'developer-tool', mode: 'dark' },
        { baseColor: '#DC2626', style: 'brutalist', mood: 'bold', appType: 'saas-dashboard', mode: 'light' },
        { baseColor: '#059669', style: 'brutalist', mood: 'bold', appType: 'developer-tool', mode: 'dark' }
      ],
      'Warm & Neutral': [
        { baseColor: '#B45309', style: 'editorial', mood: 'warm', appType: 'portfolio', mode: 'light' },
        { baseColor: '#A16207', style: 'editorial', mood: 'neutral', appType: 'productivity', mode: 'light' },
        { baseColor: '#92400E', style: 'minimal', mood: 'muted', appType: 'ecommerce', mode: 'dark' },
        { baseColor: '#78350F', style: 'editorial', mood: 'warm', appType: 'landing-page', mode: 'light' },
        { baseColor: '#D97706', style: 'editorial', mood: 'warm', appType: 'portfolio', mode: 'dark' }
      ],
      'Professional': [
        { baseColor: '#1E40AF', style: 'corporate', mood: 'calm', appType: 'saas-dashboard', mode: 'light' },
        { baseColor: '#334155', style: 'corporate', mood: 'neutral', appType: 'admin-panel', mode: 'light' },
        { baseColor: '#0F766E', style: 'corporate', mood: 'cool', appType: 'fintech', mode: 'dark' },
        { baseColor: '#374151', style: 'modern', mood: 'neutral', appType: 'developer-tool', mode: 'light' },
        { baseColor: '#1E3A8A', style: 'corporate', mood: 'bold', appType: 'admin-panel', mode: 'dark' }
      ]
    };

    const configs = categoryConfigs[category] || categoryConfigs['Professional'];
    const results: UiTheme[] = [];
    const used = new Set<string>(existingFingerprints || []);
    let attempt = 0;
    const maxAttempts = 60;

    while (results.length < count && attempt < maxAttempts) {
      const idx = (offset + attempt) % configs.length;
      const cycle = Math.floor((offset + attempt) / configs.length);
      const conf = configs[idx];

      let baseColor = conf.baseColor;
      if (cycle > 0) {
        const hsl = this.hexToHsl(baseColor);
        const shiftedH = (hsl.h + cycle * 23) % 360;
        baseColor = this.hslToHex({ h: shiftedH, s: hsl.s, l: hsl.l });
      }

      const theme = this.generateTheme({
        baseColor,
        style: conf.style,
        mood: conf.mood,
        appType: conf.appType,
        mode: conf.mode,
        category
      });

      theme.category = category;

      const fp = this.getThemeFingerprint(theme);
      if (!used.has(fp)) {
        used.add(fp);
        results.push(theme);
      }

      attempt++;
    }

    return results;
  }

  /**
   * Generates a diverse batch of curated themes spanning categories.
   */
  public generateCuratedBatch(
    count: number = 4,
    existingFingerprints?: Set<string>,
    offset: number = 0
  ): UiTheme[] {
    const categories: ThemeCategory[] = [
      'Modern SaaS',
      'FinTech',
      'Dark & Cinematic',
      'Minimal & Clean',
      'Natural & Organic',
      'Creative & Colorful',
      'Luxury & Elegant',
      'High Contrast',
      'Warm & Neutral',
      'Professional'
    ];

    const results: UiTheme[] = [];
    const used = new Set<string>(existingFingerprints || []);
    let attempt = 0;
    const maxAttempts = 50;

    while (results.length < count && attempt < maxAttempts) {
      const catIdx = (offset + attempt) % categories.length;
      const cat = categories[catIdx];
      const batch = this.generateCategoryThemes(cat, 1, used, Math.floor((offset + attempt) / categories.length));
      if (batch.length > 0) {
        const t = batch[0];
        const fp = this.getThemeFingerprint(t);
        if (!used.has(fp)) {
          used.add(fp);
          results.push(t);
        }
      }
      attempt++;
    }

    return results;
  }

  /**
   * Generates variations of an existing theme exploring hue shifts, saturation, and contrast.
   */
  public generateVariations(theme: UiTheme, count: number = 4): UiTheme[] {
    const baseHsl = this.hexToHsl(theme.baseColor);
    const variations: UiTheme[] = [];
    const lockedMap: Record<string, string> = {};

    theme.tokens.forEach(t => {
      if (t.locked) {
        lockedMap[t.key] = t.hex;
      }
    });

    const profiles = [
      { name: 'Analogous Flow', hueShift: 18, satMultiplier: 1.05, lightDelta: 0 },
      { name: 'Punchy Vibrant', hueShift: 0, satMultiplier: 1.25, lightDelta: -3 },
      { name: 'Muted Editorial', hueShift: -15, satMultiplier: 0.75, lightDelta: 2 },
      { name: 'High Contrast', hueShift: 28, satMultiplier: 1.1, lightDelta: -5 },
      { name: 'Calm Tint', hueShift: -25, satMultiplier: 0.85, lightDelta: 4 },
      { name: 'Complement Shift', hueShift: 40, satMultiplier: 1.15, lightDelta: -2 }
    ];

    for (let i = 0; i < Math.min(count, profiles.length); i++) {
      const p = profiles[i];
      const newH = (baseHsl.h + p.hueShift + 360) % 360;
      const newS = Math.min(100, Math.max(10, Math.round(baseHsl.s * p.satMultiplier)));
      const newL = Math.min(90, Math.max(10, Math.round(baseHsl.l + p.lightDelta)));
      const newHex = this.hslToHex({ h: newH, s: newS, l: newL });

      const variant = this.generateTheme({
        baseColor: newHex,
        style: theme.style,
        mood: theme.mood,
        appType: theme.appType,
        mode: theme.mode,
        category: theme.category,
        name: `${theme.name} (${p.name})`,
        lockedTokens: lockedMap
      });

      variations.push(variant);
    }

    return variations;
  }

  /**
   * Updates a single token in a theme, recomputing dependent states and contrast.
   */
  public updateToken(theme: UiTheme, tokenKey: string, newHex: string): UiTheme {
    const normHex = this.normalizeHex(newHex);
    const tokens = theme.tokens.map(t => {
      if (t.key === tokenKey) {
        return {
          ...t,
          hex: normHex,
          rgb: this.hexToRgbString(normHex)
        };
      }
      return t;
    });

    // If primary color changed, automatically tune primary-hover, primary-active, and focus-ring if not locked
    if (tokenKey === '--color-primary') {
      const pHsl = this.hexToHsl(normHex);
      const isLight = theme.mode === 'light';

      const hoverHex = isLight
        ? this.hslToHex({ h: pHsl.h, s: pHsl.s, l: Math.max(10, pHsl.l - 7) })
        : this.hslToHex({ h: pHsl.h, s: pHsl.s, l: Math.min(95, pHsl.l + 7) });

      const activeHex = isLight
        ? this.hslToHex({ h: pHsl.h, s: pHsl.s, l: Math.max(5, pHsl.l - 14) })
        : this.hslToHex({ h: pHsl.h, s: pHsl.s, l: Math.min(100, pHsl.l + 14) });

      const focusRingHex = this.hslToHex({
        h: pHsl.h,
        s: Math.min(100, pHsl.s + 10),
        l: isLight ? 60 : 65
      });

      tokens.forEach(t => {
        if (!t.locked) {
          if (t.key === '--color-primary-hover') {
            t.hex = hoverHex;
            t.rgb = this.hexToRgbString(hoverHex);
          } else if (t.key === '--color-primary-active') {
            t.hex = activeHex;
            t.rgb = this.hexToRgbString(activeHex);
          } else if (t.key === '--color-focus-ring') {
            t.hex = focusRingHex;
            t.rgb = this.hexToRgbString(focusRingHex);
          }
        }
      });
    }

    // Recompute contrast for all tokens against the background token
    const bgToken = tokens.find(t => t.key === '--color-background') || tokens[6];
    const bgHex = bgToken ? bgToken.hex : (theme.mode === 'light' ? '#FFFFFF' : '#0B0F19');

    tokens.forEach(t => {
      const ratio = this.calculateContrastRatio(t.hex, bgHex);
      t.contrastWithBg = ratio;
      t.wcagGrade = ratio >= 7.0 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3.0 ? 'AA' : 'Fail';
    });

    return {
      ...theme,
      tokens
    };
  }

  // ── Curated Seed Themes ──────────────────────────────────────────────────

  public getCuratedSeedThemes(): UiTheme[] {
    const seeds: Array<{
      name: string;
      category: ThemeCategory;
      baseColor: string;
      style: ThemeStyle;
      mood: ColorMood;
      appType: ApplicationType;
      mode: 'light' | 'dark';
    }> = [
      // 1. Minimal & Clean
      {
        name: 'Linear Titanium',
        category: 'Minimal & Clean',
        baseColor: '#0F172A',
        style: 'minimal',
        mood: 'neutral',
        appType: 'developer-tool',
        mode: 'light'
      },
      {
        name: 'Alabaster Studio',
        category: 'Minimal & Clean',
        baseColor: '#64748B',
        style: 'minimal',
        mood: 'calm',
        appType: 'productivity',
        mode: 'light'
      },

      // 2. Modern SaaS
      {
        name: 'Stripe Indigo Flow',
        category: 'Modern SaaS',
        baseColor: '#4F46E5',
        style: 'modern',
        mood: 'calm',
        appType: 'saas-dashboard',
        mode: 'light'
      },
      {
        name: 'Pulse Health Cloud',
        category: 'Modern SaaS',
        baseColor: '#0284C7',
        style: 'modern',
        mood: 'cool',
        appType: 'saas-dashboard',
        mode: 'light'
      },

      // 3. Dark & Cinematic
      {
        name: 'Obsidian Cyberpunk',
        category: 'Dark & Cinematic',
        baseColor: '#8B5CF6',
        style: 'dark-cinematic',
        mood: 'bold',
        appType: 'developer-tool',
        mode: 'dark'
      },
      {
        name: 'Nebula Dark Space',
        category: 'Dark & Cinematic',
        baseColor: '#EC4899',
        style: 'dark-cinematic',
        mood: 'vibrant',
        appType: 'mobile-app',
        mode: 'dark'
      },

      // 4. FinTech
      {
        name: 'Apex FinTech Emerald',
        category: 'FinTech',
        baseColor: '#059669',
        style: 'corporate',
        mood: 'calm',
        appType: 'fintech',
        mode: 'light'
      },
      {
        name: 'Sterling Capital Vault',
        category: 'FinTech',
        baseColor: '#0D9488',
        style: 'corporate',
        mood: 'bold',
        appType: 'fintech',
        mode: 'dark'
      },

      // 5. Natural & Organic
      {
        name: 'Nordic Sage Mist',
        category: 'Natural & Organic',
        baseColor: '#15803D',
        style: 'natural',
        mood: 'calm',
        appType: 'portfolio',
        mode: 'light'
      },
      {
        name: 'Terra Olive Harvest',
        category: 'Natural & Organic',
        baseColor: '#65A30D',
        style: 'natural',
        mood: 'warm',
        appType: 'ecommerce',
        mode: 'dark'
      },

      // 6. Professional
      {
        name: 'Vercel Monochrome',
        category: 'Professional',
        baseColor: '#18181B',
        style: 'modern',
        mood: 'neutral',
        appType: 'developer-tool',
        mode: 'dark'
      },
      {
        name: 'Enterprise Cobalt Navy',
        category: 'Professional',
        baseColor: '#1E40AF',
        style: 'corporate',
        mood: 'calm',
        appType: 'admin-panel',
        mode: 'light'
      },

      // 7. Creative & Colorful
      {
        name: 'Sunset Prism Creative',
        category: 'Creative & Colorful',
        baseColor: '#E11D48',
        style: 'creative',
        mood: 'vibrant',
        appType: 'portfolio',
        mode: 'light'
      },
      {
        name: 'Neon Atelier Chroma',
        category: 'Creative & Colorful',
        baseColor: '#7C3AED',
        style: 'creative',
        mood: 'bold',
        appType: 'mobile-app',
        mode: 'dark'
      },

      // 8. Luxury & Elegant
      {
        name: 'Noir Velvet Gold',
        category: 'Luxury & Elegant',
        baseColor: '#D97706',
        style: 'luxury',
        mood: 'warm',
        appType: 'ecommerce',
        mode: 'dark'
      },
      {
        name: 'Champagne Silk Atelier',
        category: 'Luxury & Elegant',
        baseColor: '#CA8A04',
        style: 'elegant',
        mood: 'warm',
        appType: 'landing-page',
        mode: 'light'
      },

      // 9. High Contrast
      {
        name: 'High Contrast OLED',
        category: 'High Contrast',
        baseColor: '#2563EB',
        style: 'brutalist',
        mood: 'bold',
        appType: 'admin-panel',
        mode: 'dark'
      },
      {
        name: 'Stark Monolith White',
        category: 'High Contrast',
        baseColor: '#1E293B',
        style: 'brutalist',
        mood: 'neutral',
        appType: 'developer-tool',
        mode: 'light'
      },

      // 10. Warm & Neutral
      {
        name: 'Desert Cashmere',
        category: 'Warm & Neutral',
        baseColor: '#B45309',
        style: 'editorial',
        mood: 'warm',
        appType: 'productivity',
        mode: 'light'
      },
      {
        name: 'Amber Hearth Terracotta',
        category: 'Warm & Neutral',
        baseColor: '#EA580C',
        style: 'editorial',
        mood: 'warm',
        appType: 'landing-page',
        mode: 'dark'
      }
    ];

    return seeds.map(s => this.generateTheme(s));
  }

  // ── Token Builders ───────────────────────────────────────────────────────

  private buildLightTokens(
    tokens: SemanticToken[],
    baseHsl: Hsl,
    style: ThemeStyle,
    mood: ColorMood,
    locked: Record<string, string>
  ): void {
    const h = baseHsl.h;
    const s = baseHsl.s;

    // Calibrate primary for light mode (contrast >= 4.5:1 on white background)
    // Darken yellow/light hues if necessary
    let primaryL = baseHsl.l;
    if (h >= 45 && h <= 180) {
      primaryL = Math.min(38, primaryL);
    } else {
      primaryL = Math.min(48, Math.max(30, primaryL));
    }

    const primaryHex = locked['--color-primary'] || this.hslToHex({ h, s, l: primaryL });
    const primaryHoverHex = locked['--color-primary-hover'] || this.hslToHex({ h, s, l: Math.max(10, primaryL - 7) });
    const primaryActiveHex = locked['--color-primary-active'] || this.hslToHex({ h, s, l: Math.max(5, primaryL - 14) });

    // Secondary: sophisticated slate/neutral tint
    const secH = (h + 15) % 360;
    const secS = Math.min(30, Math.round(s * 0.35));
    const secondaryHex = locked['--color-secondary'] || this.hslToHex({ h: secH, s: secS, l: 45 });
    const secondaryHoverHex = locked['--color-secondary-hover'] || this.hslToHex({ h: secH, s: secS, l: 38 });

    // Accent: complement or harmonic analog based on mood
    const accentH = mood === 'warm' ? (h + 35) % 360 : (h + 180) % 360;
    const accentS = Math.min(95, Math.max(55, Math.round(s * 1.1)));
    let accentL = 46;
    if (accentH >= 45 && accentH <= 180) accentL = 36;
    const accentHex = locked['--color-accent'] || this.hslToHex({ h: accentH, s: accentS, l: accentL });

    // Background & Surfaces
    const bgH = mood === 'warm' ? 35 : mood === 'cool' ? 215 : h;
    const bgS = Math.min(18, Math.round(s * 0.12));
    const backgroundHex = locked['--color-background'] || this.hslToHex({ h: bgH, s: bgS, l: 98 });
    const bgSecHex = locked['--color-background-secondary'] || this.hslToHex({ h: bgH, s: bgS, l: 94 });
    const surfaceHex = locked['--color-surface'] || '#FFFFFF';
    const surfaceElevatedHex = locked[TOKEN_KEY_SURFACE_ELEVATED] || '#FFFFFF';
    const surfaceMutedHex = locked[TOKEN_KEY_SURFACE_MUTED] || this.hslToHex({ h: bgH, s: bgS, l: 93 });

    // Typography
    const textPrimaryHex = locked['--color-text-primary'] || this.hslToHex({ h: bgH, s: Math.min(25, bgS * 1.5), l: 9 });
    const textSecondaryHex = locked['--color-text-secondary'] || this.hslToHex({ h: bgH, s: bgS, l: 38 });
    const textMutedHex = locked['--color-text-muted'] || this.hslToHex({ h: bgH, s: bgS, l: 54 });
    const textInverseHex = locked['--color-text-inverse'] || '#FFFFFF';

    // Borders
    const borderHex = locked['--color-border'] || this.hslToHex({ h: bgH, s: bgS, l: 88 });
    const borderSubtleHex = locked['--color-border-subtle'] || this.hslToHex({ h: bgH, s: bgS, l: 93 });
    const borderStrongHex = locked['--color-border-strong'] || this.hslToHex({ h: bgH, s: bgS, l: 76 });
    const focusRingHex = locked['--color-focus-ring'] || this.hslToHex({ h, s: Math.min(100, s + 10), l: 58 });

    // Status
    const successHex = locked['--color-success'] || '#16A34A';
    const warningHex = locked['--color-warning'] || '#D97706';
    const errorHex = locked['--color-error'] || '#DC2626';
    const infoHex = locked['--color-information'] || '#0284C7';

    this.pushTokens(tokens, [
      { key: '--color-primary', name: 'Primary', hex: primaryHex, category: 'brand', semanticPurpose: 'Primary brand action, buttons, key interactive elements' },
      { key: '--color-primary-hover', name: 'Primary Hover', hex: primaryHoverHex, category: 'brand', semanticPurpose: 'Hover state for primary buttons and interactive links' },
      { key: '--color-primary-active', name: 'Primary Active', hex: primaryActiveHex, category: 'brand', semanticPurpose: 'Active / pressed state for primary elements' },
      { key: '--color-secondary', name: 'Secondary', hex: secondaryHex, category: 'brand', semanticPurpose: 'Secondary actions, subtle tags, supporting indicators' },
      { key: '--color-secondary-hover', name: 'Secondary Hover', hex: secondaryHoverHex, category: 'brand', semanticPurpose: 'Hover state for secondary interactive elements' },
      { key: '--color-accent', name: 'Accent', hex: accentHex, category: 'brand', semanticPurpose: 'Highlights, badges, special callouts and metrics' },

      { key: '--color-background', name: 'Background', hex: backgroundHex, category: 'background', semanticPurpose: 'Main application canvas background' },
      { key: '--color-background-secondary', name: 'Background Secondary', hex: bgSecHex, category: 'background', semanticPurpose: 'Page gutters, sidebar backing, recessed areas' },
      { key: '--color-surface', name: 'Surface', hex: surfaceHex, category: 'surface', semanticPurpose: 'Cards, panels, content boxes and tables' },
      { key: TOKEN_KEY_SURFACE_ELEVATED, name: 'Surface Elevated', hex: surfaceElevatedHex, category: 'surface', semanticPurpose: 'Modals, popovers, dropdown menus and tooltips' },
      { key: TOKEN_KEY_SURFACE_MUTED, name: 'Surface Muted', hex: surfaceMutedHex, category: 'surface', semanticPurpose: 'Subtle card headers, table headers, code blocks' },

      { key: '--color-text-primary', name: 'Text Primary', hex: textPrimaryHex, category: 'typography', semanticPurpose: 'Headings, primary body copy, titles' },
      { key: '--color-text-secondary', name: 'Text Secondary', hex: textSecondaryHex, category: 'typography', semanticPurpose: 'Labels, captions, subheadings, metadata' },
      { key: '--color-text-muted', name: 'Text Muted', hex: textMutedHex, category: 'typography', semanticPurpose: 'Placeholder text, disabled copy, helper hints' },
      { key: '--color-text-inverse', name: 'Text Inverse', hex: textInverseHex, category: 'typography', semanticPurpose: 'Text placed on dark or primary filled backgrounds' },

      { key: '--color-border', name: 'Border', hex: borderHex, category: 'border', semanticPurpose: 'Standard card dividers, input borders, structural lines' },
      { key: '--color-border-subtle', name: 'Border Subtle', hex: borderSubtleHex, category: 'border', semanticPurpose: 'Table cell dividers, soft section separators' },
      { key: '--color-border-strong', name: 'Border Strong', hex: borderStrongHex, category: 'border', semanticPurpose: 'Prominent outer boundaries, selected container frames' },
      { key: '--color-focus-ring', name: 'Focus Ring', hex: focusRingHex, category: 'border', semanticPurpose: 'Accessible keyboard focus indicators and active glow' },

      { key: '--color-success', name: 'Success', hex: successHex, category: 'status', semanticPurpose: 'Successful operations, positive metrics, active status' },
      { key: '--color-warning', name: 'Warning', hex: warningHex, category: 'status', semanticPurpose: 'Warnings, pending states, cautionary alerts' },
      { key: '--color-error', name: 'Error', hex: errorHex, category: 'status', semanticPurpose: 'Errors, destructive operations, critical alerts' },
      { key: '--color-information', name: 'Information', hex: infoHex, category: 'status', semanticPurpose: 'Informational notices, tips, help badges' }
    ], backgroundHex);
  }

  private buildDarkTokens(
    tokens: SemanticToken[],
    baseHsl: Hsl,
    style: ThemeStyle,
    mood: ColorMood,
    locked: Record<string, string>
  ): void {
    const h = baseHsl.h;
    const s = baseHsl.s;

    // Calibrate primary for dark mode (contrast >= 4.5:1 on dark backgrounds)
    const primaryL = Math.min(68, Math.max(50, baseHsl.l + 10));
    const primaryHex = locked['--color-primary'] || this.hslToHex({ h, s: Math.min(100, s + 5), l: primaryL });
    const primaryHoverHex = locked['--color-primary-hover'] || this.hslToHex({ h, s, l: Math.min(85, primaryL + 8) });
    const primaryActiveHex = locked['--color-primary-active'] || this.hslToHex({ h, s, l: Math.min(95, primaryL + 15) });

    // Secondary: luminous slate/neutral
    const secH = (h + 15) % 360;
    const secS = Math.min(35, Math.round(s * 0.4));
    const secondaryHex = locked['--color-secondary'] || this.hslToHex({ h: secH, s: secS, l: 65 });
    const secondaryHoverHex = locked['--color-secondary-hover'] || this.hslToHex({ h: secH, s: secS, l: 75 });

    // Accent
    const accentH = mood === 'warm' ? (h + 35) % 360 : (h + 180) % 360;
    const accentS = Math.min(95, Math.max(65, s));
    const accentHex = locked['--color-accent'] || this.hslToHex({ h: accentH, s: accentS, l: 62 });

    // Background & Surfaces (rich deep tones)
    const bgH = mood === 'warm' ? 35 : mood === 'cool' ? 220 : h;
    const bgS = Math.min(22, Math.round(s * 0.18));
    const backgroundHex = locked['--color-background'] || this.hslToHex({ h: bgH, s: bgS, l: 6 });
    const bgSecHex = locked['--color-background-secondary'] || this.hslToHex({ h: bgH, s: bgS, l: 9 });
    const surfaceHex = locked['--color-surface'] || this.hslToHex({ h: bgH, s: bgS, l: 13 });
    const surfaceElevatedHex = locked[TOKEN_KEY_SURFACE_ELEVATED] || this.hslToHex({ h: bgH, s: bgS, l: 18 });
    const surfaceMutedHex = locked[TOKEN_KEY_SURFACE_MUTED] || this.hslToHex({ h: bgH, s: bgS, l: 10 });

    // Typography
    const textPrimaryHex = locked['--color-text-primary'] || this.hslToHex({ h: bgH, s: 10, l: 96 });
    const textSecondaryHex = locked['--color-text-secondary'] || this.hslToHex({ h: bgH, s: bgS, l: 72 });
    const textMutedHex = locked['--color-text-muted'] || this.hslToHex({ h: bgH, s: bgS, l: 48 });
    const textInverseHex = locked['--color-text-inverse'] || '#090D16';

    // Borders
    const borderHex = locked['--color-border'] || this.hslToHex({ h: bgH, s: bgS, l: 20 });
    const borderSubtleHex = locked['--color-border-subtle'] || this.hslToHex({ h: bgH, s: bgS, l: 15 });
    const borderStrongHex = locked['--color-border-strong'] || this.hslToHex({ h: bgH, s: bgS, l: 28 });
    const focusRingHex = locked['--color-focus-ring'] || this.hslToHex({ h, s: Math.min(100, s + 10), l: 65 });

    // Status (Luminous for dark mode readability)
    const successHex = locked['--color-success'] || '#22C55E';
    const warningHex = locked['--color-warning'] || '#F59E0B';
    const errorHex = locked['--color-error'] || '#EF4444';
    const infoHex = locked['--color-information'] || '#38BDF8';

    this.pushTokens(tokens, [
      { key: '--color-primary', name: 'Primary', hex: primaryHex, category: 'brand', semanticPurpose: 'Primary brand action, buttons, key interactive elements' },
      { key: '--color-primary-hover', name: 'Primary Hover', hex: primaryHoverHex, category: 'brand', semanticPurpose: 'Hover state for primary buttons and interactive links' },
      { key: '--color-primary-active', name: 'Primary Active', hex: primaryActiveHex, category: 'brand', semanticPurpose: 'Active / pressed state for primary elements' },
      { key: '--color-secondary', name: 'Secondary', hex: secondaryHex, category: 'brand', semanticPurpose: 'Secondary actions, subtle tags, supporting indicators' },
      { key: '--color-secondary-hover', name: 'Secondary Hover', hex: secondaryHoverHex, category: 'brand', semanticPurpose: 'Hover state for secondary interactive elements' },
      { key: '--color-accent', name: 'Accent', hex: accentHex, category: 'brand', semanticPurpose: 'Highlights, badges, special callouts and metrics' },

      { key: '--color-background', name: 'Background', hex: backgroundHex, category: 'background', semanticPurpose: 'Main application canvas background' },
      { key: '--color-background-secondary', name: 'Background Secondary', hex: bgSecHex, category: 'background', semanticPurpose: 'Page gutters, sidebar backing, recessed areas' },
      { key: '--color-surface', name: 'Surface', hex: surfaceHex, category: 'surface', semanticPurpose: 'Cards, panels, content boxes and tables' },
      { key: TOKEN_KEY_SURFACE_ELEVATED, name: 'Surface Elevated', hex: surfaceElevatedHex, category: 'surface', semanticPurpose: 'Modals, popovers, dropdown menus and tooltips' },
      { key: TOKEN_KEY_SURFACE_MUTED, name: 'Surface Muted', hex: surfaceMutedHex, category: 'surface', semanticPurpose: 'Subtle card headers, table headers, code blocks' },

      { key: '--color-text-primary', name: 'Text Primary', hex: textPrimaryHex, category: 'typography', semanticPurpose: 'Headings, primary body copy, titles' },
      { key: '--color-text-secondary', name: 'Text Secondary', hex: textSecondaryHex, category: 'typography', semanticPurpose: 'Labels, captions, subheadings, metadata' },
      { key: '--color-text-muted', name: 'Text Muted', hex: textMutedHex, category: 'typography', semanticPurpose: 'Placeholder text, disabled copy, helper hints' },
      { key: '--color-text-inverse', name: 'Text Inverse', hex: textInverseHex, category: 'typography', semanticPurpose: 'Text placed on dark or primary filled backgrounds' },

      { key: '--color-border', name: 'Border', hex: borderHex, category: 'border', semanticPurpose: 'Standard card dividers, input borders, structural lines' },
      { key: '--color-border-subtle', name: 'Border Subtle', hex: borderSubtleHex, category: 'border', semanticPurpose: 'Table cell dividers, soft section separators' },
      { key: '--color-border-strong', name: 'Border Strong', hex: borderStrongHex, category: 'border', semanticPurpose: 'Prominent outer boundaries, selected container frames' },
      { key: '--color-focus-ring', name: 'Focus Ring', hex: focusRingHex, category: 'border', semanticPurpose: 'Accessible keyboard focus indicators and active glow' },

      { key: '--color-success', name: 'Success', hex: successHex, category: 'status', semanticPurpose: 'Successful operations, positive metrics, active status' },
      { key: '--color-warning', name: 'Warning', hex: warningHex, category: 'status', semanticPurpose: 'Warnings, pending states, cautionary alerts' },
      { key: '--color-error', name: 'Error', hex: errorHex, category: 'status', semanticPurpose: 'Errors, destructive operations, critical alerts' },
      { key: '--color-information', name: 'Information', hex: infoHex, category: 'status', semanticPurpose: 'Informational notices, tips, help badges' }
    ], backgroundHex);
  }

  private pushTokens(
    tokens: SemanticToken[],
    rawList: Array<{
      key: string;
      name: string;
      hex: string;
      category: any;
      semanticPurpose: string;
    }>,
    bgHex: string
  ): void {
    rawList.forEach(item => {
      const ratio = this.calculateContrastRatio(item.hex, bgHex);
      const grade: 'AAA' | 'AA' | 'Fail' =
        ratio >= 7.0 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3.0 ? 'AA' : 'Fail';

      tokens.push({
        key: item.key,
        name: item.name,
        hex: item.hex,
        rgb: this.hexToRgbString(item.hex),
        category: item.category,
        semanticPurpose: item.semanticPurpose,
        contrastWithBg: ratio,
        wcagGrade: grade,
        locked: false
      });
    });
  }

  // ── Tuning Helpers ───────────────────────────────────────────────────────

  private tuneBaseHslByMoodAndStyle(hsl: Hsl, mood: ColorMood, style: ThemeStyle): Hsl {
    let { h, s, l } = hsl;

    switch (mood) {
      case 'calm':
        s = Math.min(65, Math.max(35, s));
        break;
      case 'bold':
        s = Math.min(100, Math.max(80, s));
        break;
      case 'muted':
        s = Math.min(45, Math.max(20, Math.round(s * 0.6)));
        break;
      case 'pastel':
        s = Math.min(65, Math.max(40, s));
        l = Math.min(85, Math.max(65, l));
        break;
      case 'vibrant':
        s = Math.min(100, Math.max(85, s));
        break;
      case 'warm':
        // Nudge hue towards warm 15°–45° if not already warm
        if (h > 60 && h < 320) {
          h = (h * 0.7 + 35 * 0.3) % 360;
        }
        break;
      case 'cool':
        // Nudge hue towards cyan/indigo 190°–230°
        if (h < 180 || h > 260) {
          h = (h * 0.7 + 215 * 0.3) % 360;
        }
        break;
      case 'neutral':
        s = Math.min(25, Math.round(s * 0.3));
        break;
    }

    if (style === 'minimal') {
      s = Math.min(50, s);
    } else if (style === 'luxury') {
      // Golden or rich jewel tones
      if (s > 20) s = Math.min(80, Math.max(50, s));
    } else if (style === 'natural') {
      // Earthy olive or foliage
      h = (h * 0.5 + 135 * 0.5) % 360;
      s = Math.min(60, s);
    }

    return { h: Math.round(h), s: Math.round(s), l: Math.round(l) };
  }

  private inferCategory(style: ThemeStyle, appType: ApplicationType, mode: 'light' | 'dark'): ThemeCategory {
    if (mode === 'dark' && style === 'dark-cinematic') return 'Dark & Cinematic';
    if (appType === 'fintech') return 'FinTech';
    if (appType === 'saas-dashboard') return 'Modern SaaS';
    if (style === 'natural') return 'Natural & Organic';
    if (style === 'luxury' || style === 'elegant') return 'Luxury & Elegant';
    if (style === 'brutalist') return 'High Contrast';
    if (style === 'creative') return 'Creative & Colorful';
    if (style === 'minimal') return 'Minimal & Clean';
    return 'Professional';
  }

  public getColorDescriptor(hex: string): string {
    const { h, s, l } = this.hexToHsl(hex);
    if (s < 15) {
      if (l > 75) return 'Alabaster';
      if (l < 25) return 'Obsidian';
      return 'Titanium';
    }
    if (h >= 345 || h < 15) return 'Crimson';
    if (h >= 15 && h < 45) return 'Coral';
    if (h >= 45 && h < 70) return 'Amber';
    if (h >= 70 && h < 165) return 'Emerald';
    if (h >= 165 && h < 200) return 'Teal';
    if (h >= 200 && h < 240) return 'Cobalt';
    if (h >= 240 && h < 275) return 'Indigo';
    return 'Amethyst';
  }

  public generateThemeName(
    hex: string,
    style: ThemeStyle,
    mood: ColorMood,
    appType: ApplicationType,
    mode: 'light' | 'dark',
    modifier: string = ''
  ): string {
    const colorDesc = this.getColorDescriptor(hex);
    const stylePrefixes: Record<ThemeStyle, string> = {
      minimal: 'Clean',
      modern: 'Modern',
      corporate: 'Apex',
      elegant: 'Serene',
      creative: 'Vivid',
      vibrant: 'Radiant',
      brutalist: 'Stark',
      glass: 'Luminous',
      editorial: 'Artisan',
      luxury: 'Grand',
      'dark-cinematic': 'Nocturne',
      natural: 'Verdant'
    };

    const typeSuffixes: Record<ApplicationType, string> = {
      'saas-dashboard': 'Cloud',
      fintech: 'Ledger',
      'developer-tool': 'Core',
      ecommerce: 'Storefront',
      portfolio: 'Canvas',
      productivity: 'Flow',
      'admin-panel': 'Console',
      'landing-page': 'Vanguard',
      'mobile-app': 'Pocket'
    };

    const prefix = stylePrefixes[style] || 'Acklet';
    const suffix = typeSuffixes[appType] || 'Studio';
    const modeLabel = mode === 'dark' ? 'Dark' : 'Light';
    const modStr = modifier ? ` ${modifier}` : '';

    return `${prefix} ${colorDesc}${modStr} ${suffix} ${modeLabel}`;
  }

  // ── Color Space & WCAG Math ──────────────────────────────────────────────

  public normalizeHex(hex: string): string {
    let clean = hex.trim().replace(/^#/, '');
    if (clean.length === 3) {
      clean = clean.split('').map(c => c + c).join('');
    }
    if (!/^[0-9A-Fa-f]{6}$/.test(clean)) {
      return '#2563EB';
    }
    return '#' + clean.toUpperCase();
  }

  public hexToRgb(hex: string): Rgb {
    const clean = this.normalizeHex(hex).substring(1);
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return { r, g, b };
  }

  public hexToRgbString(hex: string): string {
    const { r, g, b } = this.hexToRgb(hex);
    return `rgb(${r}, ${g}, ${b})`;
  }

  public hexToHsl(hex: string): Hsl {
    const { r, g, b } = this.hexToRgb(hex);
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;

    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    const delta = max - min;

    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (delta !== 0) {
      s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
      switch (max) {
        case rNorm:
          h = ((gNorm - bNorm) / delta + (gNorm < bNorm ? 6 : 0)) * 60;
          break;
        case gNorm:
          h = ((bNorm - rNorm) / delta + 2) * 60;
          break;
        case bNorm:
          h = ((rNorm - gNorm) / delta + 4) * 60;
          break;
      }
    }

    return {
      h: Math.round(h),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  public hslToHex(hsl: Hsl): string {
    const h = ((hsl.h % 360) + 360) % 360;
    const s = Math.max(0, Math.min(100, hsl.s)) / 100;
    const l = Math.max(0, Math.min(100, hsl.l)) / 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;

    let rPrime = 0;
    let gPrime = 0;
    let bPrime = 0;

    if (h >= 0 && h < 60) {
      rPrime = c; gPrime = x; bPrime = 0;
    } else if (h >= 60 && h < 120) {
      rPrime = x; gPrime = c; bPrime = 0;
    } else if (h >= 120 && h < 180) {
      rPrime = 0; gPrime = c; bPrime = x;
    } else if (h >= 180 && h < 240) {
      rPrime = 0; gPrime = x; bPrime = c;
    } else if (h >= 240 && h < 300) {
      rPrime = x; gPrime = 0; bPrime = c;
    } else {
      rPrime = c; gPrime = 0; bPrime = x;
    }

    const r = Math.round((rPrime + m) * 255);
    const g = Math.round((gPrime + m) * 255);
    const b = Math.round((bPrime + m) * 255);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
  }

  public calculateLuminance(hex: string): number {
    const { r, g, b } = this.hexToRgb(hex);
    const a = [r, g, b].map(v => {
      const val = v / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return +(0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]).toFixed(4);
  }

  public calculateContrastRatio(hex1: string, hex2: string): number {
    const lum1 = this.calculateLuminance(hex1);
    const lum2 = this.calculateLuminance(hex2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return +((brightest + 0.05) / (darkest + 0.05)).toFixed(2);
  }
}

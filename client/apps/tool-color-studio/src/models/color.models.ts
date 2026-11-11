// apps/tool-color-studio/src/models/color.models.ts

export type ColorStudioTab =
  | 'landing'
  | 'picker'
  | 'extractor'
  | 'gradient'
  | 'contrast'
  | 'palette'
  | 'simulator';

export interface RgbColor {
  r: number; // 0 - 255
  g: number; // 0 - 255
  b: number; // 0 - 255
  a?: number; // 0 - 1
}

export interface HslColor {
  h: number; // 0 - 360
  s: number; // 0 - 100
  l: number; // 0 - 100
  a?: number; // 0 - 1
}

export interface HsvColor {
  h: number; // 0 - 360
  s: number; // 0 - 100
  v: number; // 0 - 100
  a?: number; // 0 - 1
}

export interface CmykColor {
  c: number; // 0 - 100
  m: number; // 0 - 100
  y: number; // 0 - 100
  k: number; // 0 - 100
}

export type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'hsv' | 'cmyk';

export interface ColorObject {
  hex: string;
  rgb: RgbColor;
  hsl: HslColor;
  hsv: HsvColor;
  cmyk: CmykColor;
  luminance: number; // 0 - 1
  isDark: boolean;
  rgbString: string;
  hslString: string;
  hsvString: string;
  cmykString: string;
}

export interface WcagCompliance {
  ratio: number;
  ratioString: string;
  aaNormal: boolean; // >= 4.5
  aaLarge: boolean; // >= 3.0
  aaaNormal: boolean; // >= 7.0
  aaaLarge: boolean; // >= 4.5
  uiComponent: boolean; // >= 3.0
  grade: 'AAA' | 'AA' | 'Fail';
}

export type WcagRating = 'excellent' | 'good' | 'needs-improvement' | 'insufficient';

export type WcagCriterion = 'all' | 'aa' | 'aaa' | 'normal' | 'large' | 'ui';

export interface ContrastSuggestion {
  id: string;
  type: 'darker-fg' | 'lighter-fg' | 'darker-bg' | 'lighter-bg';
  label: string;
  targetRole: 'fg' | 'bg';
  hex: string;
  ratio: number;
  ratioString: string;
  grade: 'AAA' | 'AA' | 'Fail';
}

export interface DetailedContrastResult extends WcagCompliance {
  fgHex: string;
  bgHex: string;
  fgLuminance: number;
  bgLuminance: number;
  rating: WcagRating;
  ratingLabel: string;
  suggestions: ContrastSuggestion[];
}

export type PaletteHarmony =
  | 'complementary'
  | 'analogous'
  | 'triadic'
  | 'split-complementary'
  | 'tetradic'
  | 'square'
  | 'monochromatic'
  | 'shades-tints';

export interface PaletteItem {
  id: string;
  hex: string;
  locked: boolean;
  name?: string;
}

export interface PaletteOptions {
  count?: number;
  hueStep?: number;
  saturationVariance?: number;
  lightnessVariance?: number;
}

export type ColorBlindnessType =
  | 'normal'
  | 'protanopia'
  | 'protanomaly'
  | 'deuteranopia'
  | 'deuteranomaly'
  | 'tritanopia'
  | 'tritanomaly'
  | 'achromatopsia'
  | 'achromatomaly';

export interface ColorBlindnessInfo {
  type: ColorBlindnessType;
  title: string;
  subtitle: string;
  prevalence: string;
  description: string;
  category?: 'dichromacy' | 'anomalous' | 'monochromacy' | 'trichromacy';
}

export type SimulatorViewMode = 'split-slider' | 'side-by-side' | 'simulated-only' | 'original-only';

export interface SimulatedPaletteItem {
  id: string;
  originalHex: string;
  simulatedHex: string;
  originalRgb: RgbColor;
  simulatedRgb: RgbColor;
  name: string;
  hasConflict?: boolean;
  conflictsWith?: string[];
}

export interface PaletteConfusionPair {
  color1: string;
  color2: string;
  simColor1: string;
  simColor2: string;
  originalDeltaE: number;
  simulatedDeltaE: number;
  severity: 'severe' | 'moderate' | 'low';
}

export interface PaletteSimulationResult {
  type: ColorBlindnessType;
  items: SimulatedPaletteItem[];
  confusionPairs: PaletteConfusionPair[];
  riskCount: number;
}

export type GradientType = 'linear' | 'radial' | 'conic';
export type RadialShape = 'circle' | 'ellipse';
export type RadialExtent = 'farthest-corner' | 'closest-side' | 'closest-corner' | 'farthest-side';

export interface GradientStop {
  id: string;
  color: string; // hex
  position: number; // 0 - 100 %
  locked?: boolean;
  name?: string;
}

export interface GradientConfig {
  type: GradientType;
  angle: number; // 0 - 360 (for linear direction or conic starting angle)
  shape?: RadialShape; // default 'circle'
  radialExtent?: RadialExtent; // default 'farthest-corner'
  positionX?: number; // 0 - 100 % center X (default 50)
  positionY?: number; // 0 - 100 % center Y (default 50)
  stops: GradientStop[];
}

export interface SavedGradient {
  id: string;
  name: string;
  config: GradientConfig;
  css: string;
  timestamp: number;
}

export interface GradientPreset {
  id: string;
  name: string;
  category?: 'popular' | 'nature' | 'modern' | 'warm' | 'cool' | 'dark' | 'linear' | 'radial' | 'conic' | 'vibrant' | 'subtle' | string;
  config: GradientConfig;
}

export interface ExtractedColor {
  hex: string;
  rgb: RgbColor;
  percentage: number;
  label?: string;
  isLight: boolean;
}

export interface SavedColorItem {
  id: string;
  hex: string;
  name: string;
  timestamp: number;
}

export interface SavedPalette {
  id: string;
  name: string;
  colors: string[];
  timestamp: number;
  description?: string;
  favorite?: boolean;
  harmony?: PaletteHarmony;
}


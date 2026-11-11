// apps/tool-color-studio/src/models/theme.models.ts

export type ThemeStyle =
  | 'minimal'
  | 'modern'
  | 'corporate'
  | 'elegant'
  | 'creative'
  | 'vibrant'
  | 'brutalist'
  | 'glass'
  | 'editorial'
  | 'luxury'
  | 'dark-cinematic'
  | 'natural';

export type ColorMood =
  | 'calm'
  | 'warm'
  | 'cool'
  | 'bold'
  | 'muted'
  | 'pastel'
  | 'vibrant'
  | 'neutral';

export type ApplicationType =
  | 'saas-dashboard'
  | 'fintech'
  | 'developer-tool'
  | 'ecommerce'
  | 'portfolio'
  | 'productivity'
  | 'admin-panel'
  | 'landing-page'
  | 'mobile-app';

export type ThemeMode = 'light' | 'dark' | 'both';

export type ThemeCategory =
  | 'Minimal & Clean'
  | 'Professional'
  | 'Dark & Cinematic'
  | 'Natural & Organic'
  | 'Modern SaaS'
  | 'FinTech'
  | 'Creative & Colorful'
  | 'Luxury & Elegant'
  | 'High Contrast'
  | 'Warm & Neutral';

export type SemanticCategory =
  | 'brand'
  | 'background'
  | 'surface'
  | 'typography'
  | 'border'
  | 'status';

export interface SemanticToken {
  name: string;             // e.g. "Primary", "Background Secondary"
  key: string;              // e.g. "--color-primary"
  hex: string;              // e.g. "#2563EB"
  rgb: string;              // e.g. "rgb(37, 99, 235)"
  category: SemanticCategory;
  semanticPurpose: string;  // e.g. "Main interactive elements, primary buttons, active states"
  contrastWithBg: number;   // Calculated contrast ratio against background
  wcagGrade: 'AAA' | 'AA' | 'Fail';
  locked?: boolean;
}

export interface UiTheme {
  id: string;
  name: string;
  category: ThemeCategory;
  style: ThemeStyle;
  mood: ColorMood;
  appType: ApplicationType;
  mode: 'light' | 'dark';
  baseColor: string;
  tokens: SemanticToken[];
  favorite?: boolean;
  isCustom?: boolean;
  createdAt: number;
}

export interface ThemeVariationOptions {
  count?: number;
  hueShift?: number;
  saturationDelta?: number;
  contrastProfile?: 'subtle' | 'balanced' | 'punchy';
}

export type ThemeExportFormat =
  | 'css'
  | 'json'
  | 'scss'
  | 'tailwind'
  | 'design-tokens'
  | 'png';


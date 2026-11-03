// packages/tool-registry/src/models.ts

export type ToolStatus = 'live' | 'beta' | 'coming-soon' | 'maintenance' | 'hidden';
export type ToolBadgeType = 'new' | 'beta' | 'updated';
export type ToolLayoutMode = 'standard' | 'fullBleed';

export interface ToolFaq {
  id: string;
  question: string;
  answer: string;
}

export interface ToolHighlight {
  label: string;
  value: string;
  tooltip?: string;
}

export interface ToolSeo {
  title: string;
  description: string;
  keywords?: string[];
}

export interface ToolManifestTab {
  id: string;
  label: string;
  icon?: string;
  badge?: string | number;
  keepAlive?: boolean;
}

export interface ToolSubItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
}

export interface ToolRegistryItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  categorySlug?: string;
  shortDescription: string;
  description: string;
  icon: string;
  version?: string;
  status: ToolStatus;
  badge?: ToolBadgeType;
  subdomain?: string;
  subItems?: ToolSubItem[];
  addedAt?: string; // ISO Date YYYY-MM-DD
  updatedAt?: string; // ISO Date YYYY-MM-DD
  featured?: boolean;
  order?: number;
  layout?: ToolLayoutMode;
  accent?: string; // named accent palette, e.g. 'teal', default 'neutral'
  accentHue?: number; // 0-360
  supports?: string[]; // icon names e.g. ['shield', 'zap', 'lock']
  facts?: Array<{ label: string; value: string }>;
  highlights?: ToolHighlight[];
  related?: string[]; // slug references
  requires?: Array<'clipboard' | 'camera' | 'microphone' | 'notifications' | 'backend'>;
  tabs?: ToolManifestTab[];
  about?: string;
  features?: string[];
  howTo?: string[];
  howItWorks?: string[];
  faqs?: ToolFaq[];
  suggestedTools?: string[];
  executionMode?: 'browser' | 'offline' | 'cloud';
  navLinks?: { id: string; label: string }[];
  seo?: ToolSeo;
  theme?: ToolManifestTheme;
}

export interface ToolThemeColorVariants {
  base: string;           // Primary accent color, e.g. '#2563EB'
  ink: string;            // High-contrast foreground text on base accent
  strong: string;         // Emphasized accent (e.g. for focus/hover rings)
  soft: string;           // Low-opacity translucent tint for pill/row backgrounds
  border: string;         // Subtle accent border tint
  glow: string;           // Ambient atmospheric glow tint
}

export interface ToolAccentConfig {
  name: string;           // Palette identifier, e.g. 'blue', 'teal'
  hue?: number;           // Hue in degrees (0-360) for dynamic canvas glows
  dark: ToolThemeColorVariants;
  light: ToolThemeColorVariants;
}

export interface ToolFontConfig {
  family: string;         // Human font family name, e.g. 'Figtree'
  fontFamily: string;     // Complete CSS font-family rule
  weights?: number[];     // Font weights supported, e.g. [400, 500, 600, 700]
  fallback?: string;      // Metric-adjusted or system fallback font list
  source?: 'self-hosted' | 'google' | 'system';
}

export type ToolDensity = 'default' | 'compact';
export type ToolSurfaceStyle = 'glass' | 'solid';

export interface ToolManifestTheme {
  accent?: ToolAccentConfig;
  font?: ToolFontConfig;
  radius?: string;        // Specific tool radius override, or inherited default
  density?: ToolDensity;
  surfaceStyle?: ToolSurfaceStyle;
}

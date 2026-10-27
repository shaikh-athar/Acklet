// packages/tool-registry/src/accent-presets.ts
import type { ToolAccentConfig, ToolRegistryItem, ToolThemeColorVariants } from './models';

export const BLUE_ACCENT: ToolAccentConfig = {
  name: 'blue',
  hue: 217,
  dark: {
    base: '#3B82F6',
    ink: '#FFFFFF',
    strong: '#60A5FA',
    soft: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.25)',
    glow: 'rgba(59, 130, 246, 0.20)'
  },
  light: {
    base: '#2563EB',
    ink: '#FFFFFF',
    strong: '#1D4ED8',
    soft: 'rgba(37, 99, 235, 0.08)',
    border: 'rgba(37, 99, 235, 0.20)',
    glow: 'rgba(37, 99, 235, 0.15)'
  }
};

export const TEAL_ACCENT: ToolAccentConfig = {
  name: 'teal',
  hue: 195,
  dark: {
    base: '#2DD4BF',
    ink: '#042F2B',
    strong: '#5EEAD4',
    soft: '#10302D',
    border: '#1F4A45',
    glow: 'rgba(45, 212, 191, 0.20)'
  },
  light: {
    base: '#0F766E',
    ink: '#FFFFFF',
    strong: '#115E59',
    soft: 'rgba(15, 118, 110, 0.10)',
    border: 'rgba(15, 118, 110, 0.25)',
    glow: 'rgba(15, 118, 110, 0.15)'
  }
};

export const AMBER_ACCENT: ToolAccentConfig = {
  name: 'amber',
  hue: 28,
  dark: {
    base: '#F59E0B',
    ink: '#78350F',
    strong: '#FBBF24',
    soft: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.25)',
    glow: 'rgba(245, 158, 11, 0.20)'
  },
  light: {
    base: '#D97706',
    ink: '#FFFFFF',
    strong: '#B45309',
    soft: 'rgba(217, 119, 6, 0.08)',
    border: 'rgba(217, 119, 6, 0.20)',
    glow: 'rgba(217, 119, 6, 0.15)'
  }
};

export const VIOLET_ACCENT: ToolAccentConfig = {
  name: 'violet',
  hue: 245,
  dark: {
    base: '#8B5CF6',
    ink: '#FFFFFF',
    strong: '#A78BFA',
    soft: 'rgba(139, 92, 246, 0.12)',
    border: 'rgba(139, 92, 246, 0.25)',
    glow: 'rgba(139, 92, 246, 0.20)'
  },
  light: {
    base: '#7C3AED',
    ink: '#FFFFFF',
    strong: '#6D28D9',
    soft: 'rgba(124, 58, 237, 0.08)',
    border: 'rgba(124, 58, 237, 0.20)',
    glow: 'rgba(124, 58, 237, 0.15)'
  }
};

export const ROSE_ACCENT: ToolAccentConfig = {
  name: 'rose',
  hue: 330,
  dark: {
    base: '#F43F5E',
    ink: '#FFFFFF',
    strong: '#FB7185',
    soft: 'rgba(244, 63, 94, 0.12)',
    border: 'rgba(244, 63, 94, 0.25)',
    glow: 'rgba(244, 63, 94, 0.20)'
  },
  light: {
    base: '#E11D48',
    ink: '#FFFFFF',
    strong: '#BE123C',
    soft: 'rgba(225, 29, 72, 0.08)',
    border: 'rgba(225, 29, 72, 0.20)',
    glow: 'rgba(225, 29, 72, 0.15)'
  }
};

export const DEFAULT_TOOL_ACCENT = BLUE_ACCENT;

const ACCENT_MAP: Record<string, ToolAccentConfig> = {
  blue: BLUE_ACCENT,
  teal: TEAL_ACCENT,
  amber: AMBER_ACCENT,
  orange: AMBER_ACCENT,
  violet: VIOLET_ACCENT,
  purple: VIOLET_ACCENT,
  rose: ROSE_ACCENT,
  pink: ROSE_ACCENT
};

/**
 * Resolves the color variants for a tool based on its manifest and theme mode.
 * Falls back safely to known palettes, hue-based values, or DEFAULT_TOOL_ACCENT.
 */
export function resolveToolAccent(
  tool: ToolRegistryItem | null | undefined,
  mode: 'dark' | 'light' = 'dark'
): ToolThemeColorVariants {
  if (tool?.theme?.accent) {
    return mode === 'light' ? tool.theme.accent.light : tool.theme.accent.dark;
  }

  const namedAccent = tool?.accent?.toLowerCase();
  if (namedAccent && ACCENT_MAP[namedAccent]) {
    return mode === 'light' ? ACCENT_MAP[namedAccent].light : ACCENT_MAP[namedAccent].dark;
  }

  // Check hue-based matching if available
  if (typeof tool?.accentHue === 'number') {
    const h = tool.accentHue;
    if (h >= 170 && h <= 205) {
      return mode === 'light' ? TEAL_ACCENT.light : TEAL_ACCENT.dark;
    }
    if (h >= 15 && h <= 50) {
      return mode === 'light' ? AMBER_ACCENT.light : AMBER_ACCENT.dark;
    }
    if (h >= 235 && h <= 280) {
      return mode === 'light' ? VIOLET_ACCENT.light : VIOLET_ACCENT.dark;
    }
    if (h >= 315 && h <= 360) {
      return mode === 'light' ? ROSE_ACCENT.light : ROSE_ACCENT.dark;
    }
  }

  return mode === 'light' ? DEFAULT_TOOL_ACCENT.light : DEFAULT_TOOL_ACCENT.dark;
}

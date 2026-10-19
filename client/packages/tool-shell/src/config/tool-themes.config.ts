// packages/tool-shell/src/config/tool-themes.config.ts

export type ToolCategory = 'Utilities' | 'Developer' | 'Security' | 'AI' | 'Converters' | 'Design' | string;

export interface CategoryThemeConfig {
  themeName: string;
  palette: string[]; // 3-4 swatch colors for category card preview
  description: string;
}

/**
 * Category-to-Theme Mapping Config.
 * All categories currently point to 'goth' palette per specification.
 * TODO: When new palettes are provided, map them here:
 * - Utilities: goth (or custom palette tokens: --bg, --surface, --accent, --accent-soft, --border...)
 * - Developer: goth (TODO: Developer palette tokens)
 * - Security: goth (TODO: Security palette tokens)
 * - AI: goth (TODO: AI palette tokens)
 */
export const CATEGORY_THEME_MAP: Record<string, CategoryThemeConfig> = {
  Utilities: {
    themeName: 'goth',
    palette: ['#000000', '#27272A', '#FCFCFC', '#FFFFFF'],
    description: 'Everyday productivity & file utilities'
  },
  Developer: {
    themeName: 'goth',
    palette: ['#000000', '#27272A', '#FCFCFC', '#EDEDED'],
    description: 'Encoding, parsing, tokens & API tooling'
  },
  Security: {
    themeName: 'goth',
    palette: ['#000000', '#27272A', '#A1A1AA', '#FFFFFF'],
    description: 'Cryptography, hashes, checksums & auth tools'
  },
  AI: {
    themeName: 'goth',
    palette: ['#000000', '#27272A', '#FCFCFC', '#F6F6F6'],
    description: 'Machine learning & intelligent assistants'
  },
  Converters: {
    themeName: 'goth',
    palette: ['#000000', '#27272A', '#EDEDED', '#FFFFFF'],
    description: 'Format, unit & data transform tools'
  }
};

export function getThemeForCategory(category?: string): CategoryThemeConfig {
  if (!category) return CATEGORY_THEME_MAP['Utilities'];
  return CATEGORY_THEME_MAP[category] || {
    themeName: 'goth',
    palette: ['#000000', '#27272A', '#FCFCFC', '#FFFFFF'],
    description: `${category} tools & utilities`
  };
}

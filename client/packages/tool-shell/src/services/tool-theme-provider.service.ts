// packages/tool-shell/src/services/tool-theme-provider.service.ts
import { Injectable } from '@angular/core';
import { ToolRegistryItem, resolveToolAccent, ToolThemeColorVariants } from '@acklet/tool-registry';

export const SHARED_DEFAULT_FONT = "'Scoutie Sans', sans-serif";

export interface ToolThemeStyles {
  '--tool-accent': string;
  '--tool-accent-soft': string;
  '--tool-accent-border': string;
  '--tool-accent-glow': string;
  '--tool-accent-ink': string;
  '--accent': string;
  '--accent-strong': string;
  '--accent-soft': string;
  '--accent-border': string;
  '--accent-glow': string;
  '--accent-ink': string;
  '--font-display': string;
  '--font-sans': string;
  '--font-body': string;
  '--ts-font-sans': string;
  '--ts-font-heading': string;
  '--tool-font-family': string;
  '--shell-card-radius'?: string;
  '--tool-radius'?: string;
  '--tool-density'?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToolThemeProviderService {
  /**
   * Computes the CSS custom properties dictionary for a tool in the specified theme mode.
   * Everything is strictly scoped to the tool host container ([data-tool="..."]) and never
   * pollutes :root or sibling tools.
   */
  resolveThemeTokens(
    tool: ToolRegistryItem | null | undefined,
    mode: 'dark' | 'light' = 'dark'
  ): Record<string, string> {
    const colors: ToolThemeColorVariants = resolveToolAccent(tool, mode);
    const fontStr = tool?.theme?.font?.fontFamily || SHARED_DEFAULT_FONT;

    const styles: Record<string, string> = {
      '--tool-accent': colors.base,
      '--tool-accent-soft': colors.soft,
      '--tool-accent-border': colors.border,
      '--tool-accent-glow': colors.glow,
      '--tool-accent-ink': colors.ink,
      '--accent': colors.base,
      '--accent-strong': colors.strong,
      '--accent-soft': colors.soft,
      '--accent-border': colors.border,
      '--accent-glow': colors.glow,
      '--accent-ink': colors.ink,
      '--font-display': fontStr,
      '--font-sans': fontStr,
      '--font-body': fontStr,
      '--ts-font-sans': fontStr,
      '--ts-font-heading': fontStr,
      '--tool-font-family': fontStr
    };

    if (tool?.theme?.radius) {
      styles['--shell-card-radius'] = tool.theme.radius;
      styles['--tool-radius'] = tool.theme.radius;
    }

    if (tool?.theme?.density) {
      styles['--tool-density'] = tool.theme.density;
    }

    return styles;
  }

  /**
   * Formats token dictionary into a CSS style string for [style] template binding.
   */
  toStyleString(styles: Record<string, string>): string {
    return Object.entries(styles)
      .map(([k, v]) => `${k}:${v}`)
      .join(';');
  }
}

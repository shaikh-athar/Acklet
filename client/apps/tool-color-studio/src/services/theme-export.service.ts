// apps/tool-color-studio/src/services/theme-export.service.ts
import { Injectable, inject } from '@angular/core';
import { UiTheme, ThemeExportFormat } from '../models/theme.models';
import { ExportService } from './export.service';

@Injectable({
  providedIn: 'root'
})
export class ThemeExportService {
  private baseExport = inject(ExportService);

  public generateCode(theme: UiTheme, format: ThemeExportFormat): string {
    switch (format) {
      case 'css':
        return this.toCssVariables(theme);
      case 'json':
        return this.toJson(theme);
      case 'scss':
        return this.toScss(theme);
      case 'tailwind':
        return this.toTailwind(theme);
      case 'design-tokens':
        return this.toDesignTokens(theme);
      case 'png':
        return `PNG Palette Graphic for ${theme.name} (${theme.tokens.length} semantic tokens)`;
      default:
        return this.toCssVariables(theme);
    }
  }

  public download(theme: UiTheme, format: ThemeExportFormat): void {
    const slug = theme.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (format === 'png') {
      this.downloadPng(theme);
      return;
    }

    const code = this.generateCode(theme, format);

    switch (format) {
      case 'css':
        this.baseExport.downloadFile(code, `${slug}-theme.css`, 'text/css');
        break;
      case 'json':
        this.baseExport.downloadFile(code, `${slug}-theme.json`, 'application/json');
        break;
      case 'scss':
        this.baseExport.downloadFile(code, `_${slug}-theme.scss`, 'text/x-scss');
        break;
      case 'tailwind':
        this.baseExport.downloadFile(code, `tailwind-${slug}.js`, 'application/javascript');
        break;
      case 'design-tokens':
        this.baseExport.downloadFile(code, `${slug}-tokens.json`, 'application/json');
        break;
    }
  }

  public renderToCanvas(theme: UiTheme, width = 1200, height = 630): HTMLCanvasElement | null {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const bgToken = theme.tokens.find(t => t.key === '--color-background') || theme.tokens[6];
    const textToken = theme.tokens.find(t => t.key === '--color-text-primary') || theme.tokens[11];
    const borderToken = theme.tokens.find(t => t.key === '--color-border') || theme.tokens[15];

    // Background
    ctx.fillStyle = bgToken ? bgToken.hex : (theme.mode === 'dark' ? '#0F172A' : '#FFFFFF');
    ctx.fillRect(0, 0, width, height);

    // Header Title
    ctx.fillStyle = textToken ? textToken.hex : (theme.mode === 'dark' ? '#FFFFFF' : '#0F172A');
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
    ctx.fillText(theme.name, 60, 80);

    ctx.font = '18px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = theme.mode === 'dark' ? '#94A3B8' : '#64748B';
    ctx.fillText(`${theme.category} • ${theme.style} • ${theme.appType} • ${theme.mode.toUpperCase()}`, 60, 115);

    // Swatches Grid
    const startX = 60;
    const startY = 160;
    const swatchW = 100;
    const swatchH = 80;
    const gapX = 18;
    const gapY = 24;
    const cols = 9;

    theme.tokens.forEach((t, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (swatchW + gapX);
      const y = startY + row * (swatchH + gapY);

      // Swatch rect
      ctx.fillStyle = t.hex;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, swatchW, swatchH - 24, 8);
      } else {
        ctx.rect(x, y, swatchW, swatchH - 24);
      }
      ctx.fill();

      // Border outline
      ctx.strokeStyle = borderToken ? borderToken.hex : 'rgba(128, 128, 128, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Name & Hex
      ctx.fillStyle = textToken ? textToken.hex : (theme.mode === 'dark' ? '#FFFFFF' : '#0F172A');
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText(t.name.slice(0, 14), x, y + swatchH - 10);
      ctx.font = '10px monospace';
      ctx.fillStyle = theme.mode === 'dark' ? '#94A3B8' : '#64748B';
      ctx.fillText(t.hex.toUpperCase(), x, y + swatchH);
    });

    return canvas;
  }

  public downloadPng(theme: UiTheme): void {
    const canvas = this.renderToCanvas(theme);
    if (!canvas || typeof document === 'undefined') return;
    const slug = theme.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}-palette.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  private toCssVariables(theme: UiTheme): string {
    const selector = theme.mode === 'dark' ? `[data-theme="dark"], .theme-dark` : `:root`;
    const lines = theme.tokens.map(t => `  ${t.key}: ${t.hex}; /* ${t.name} - ${t.semanticPurpose} */`);

    return `/* Acklet Color Studio — ${theme.name} (${theme.category}) */\n${selector} {\n${lines.join('\n')}\n}\n`;
  }

  private toJson(theme: UiTheme): string {
    const tokenMap: Record<string, any> = {};
    theme.tokens.forEach(t => {
      const cleanKey = t.key.replace(/^--color-/, '');
      tokenMap[cleanKey] = {
        name: t.name,
        hex: t.hex,
        rgb: t.rgb,
        category: t.category,
        purpose: t.semanticPurpose,
        contrast: t.contrastWithBg,
        wcag: t.wcagGrade
      };
    });

    const output = {
      name: theme.name,
      category: theme.category,
      style: theme.style,
      mood: theme.mood,
      appType: theme.appType,
      mode: theme.mode,
      baseColor: theme.baseColor,
      tokens: tokenMap
    };

    return JSON.stringify(output, null, 2);
  }

  private toScss(theme: UiTheme): string {
    const lines = theme.tokens.map(t => {
      const scssVar = t.key.replace(/^--/, '$');
      return `${scssVar}: ${t.hex}; // ${t.name}`;
    });

    return `// Acklet Color Studio — ${theme.name}\n// Mode: ${theme.mode} | Style: ${theme.style} | Mood: ${theme.mood}\n\n${lines.join('\n')}\n`;
  }

  private toTailwind(theme: UiTheme): string {
    const colorsObj: Record<string, string> = {};
    theme.tokens.forEach(t => {
      const key = t.key.replace(/^--color-/, '').replace(/-([a-z])/g, (_, g) => g.toUpperCase());
      colorsObj[key] = t.hex;
    });

    return `/** @type {import('tailwindcss').Config} */
// Acklet Color Studio — ${theme.name}
module.exports = {
  theme: {
    extend: {
      colors: {
        app: ${JSON.stringify(colorsObj, null, 8).replace(/^ {8}/gm, '        ')}
      }
    }
  }
};
`;
  }

  private toDesignTokens(theme: UiTheme): string {
    const colorTokens: Record<string, any> = {};

    theme.tokens.forEach(t => {
      const tokenName = t.key.replace(/^--color-/, '');
      colorTokens[tokenName] = {
        $value: t.hex,
        $type: 'color',
        $description: t.semanticPurpose,
        extensions: {
          'acklet:role': t.name,
          'acklet:category': t.category,
          'acklet:wcag': t.wcagGrade,
          'acklet:contrastRatio': t.contrastWithBg
        }
      };
    });

    const doc = {
      $schema: 'https://design-tokens.github.io/community-group/format/',
      $name: theme.name,
      color: colorTokens
    };

    return JSON.stringify(doc, null, 2);
  }
}


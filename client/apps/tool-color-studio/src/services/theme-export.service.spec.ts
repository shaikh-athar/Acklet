// @vitest-environment jsdom
// apps/tool-color-studio/src/services/theme-export.service.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { ThemeExportService } from './theme-export.service';
import { ThemeGenerationService } from './theme-generation.service';
import { ExportService } from './export.service';
import { UiTheme } from '../models/theme.models';

describe('ThemeExportService', () => {
  let exportService: ThemeExportService;
  let themeGen: ThemeGenerationService;
  let baseExportMock: ExportService;
  let sampleTheme: UiTheme;

  beforeEach(() => {
    themeGen = new ThemeGenerationService();
    baseExportMock = new ExportService();

    sampleTheme = themeGen.generateTheme({
      baseColor: '#2563EB',
      style: 'modern',
      mood: 'calm',
      appType: 'saas-dashboard',
      mode: 'light',
      name: 'Stripe Indigo Flow'
    });

    const rootInjector = {
      get: (token: any, notFound?: any) => {
        if (token === ExportService) return baseExportMock;
        return notFound;
      }
    } as any;

    const envInjector = createEnvironmentInjector([], rootInjector);
    runInInjectionContext(envInjector, () => {
      exportService = new ThemeExportService();
    });
  });

  it('should export valid CSS custom properties with token annotations', () => {
    const css = exportService.generateCode(sampleTheme, 'css');
    expect(css).toContain(':root {');
    expect(css).toContain('--color-primary: #');
    expect(css).toContain('--color-background: #');
    expect(css).toContain('/* Primary -');
  });

  it('should export dark mode CSS with [data-theme="dark"] selector', () => {
    const darkTheme = themeGen.generateTheme({
      baseColor: '#8B5CF6',
      mode: 'dark',
      name: 'Obsidian Flow'
    });
    const css = exportService.generateCode(darkTheme, 'css');
    expect(css).toContain('[data-theme="dark"]');
  });

  it('should export valid JSON representation of all tokens', () => {
    const jsonStr = exportService.generateCode(sampleTheme, 'json');
    const parsed = JSON.parse(jsonStr);
    expect(parsed.name).toBe('Stripe Indigo Flow');
    expect(parsed.tokens.primary).toBeDefined();
    expect(parsed.tokens.primary.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('should export SCSS variables', () => {
    const scss = exportService.generateCode(sampleTheme, 'scss');
    expect(scss).toContain('$color-primary: #');
    expect(scss).toContain('$color-surface: #');
  });

  it('should export Tailwind config theme extension', () => {
    const tw = exportService.generateCode(sampleTheme, 'tailwind');
    expect(tw).toContain('module.exports = {');
    expect(tw).toContain('colors: {');
    expect(tw).toContain('"primary": "#');
  });

  it('should export W3C Design Tokens JSON format', () => {
    const dt = exportService.generateCode(sampleTheme, 'design-tokens');
    const parsed = JSON.parse(dt);
    expect(parsed.$schema).toContain('design-tokens.github.io');
    expect(parsed.color.primary.$value).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(parsed.color.primary.$type).toBe('color');
  });

  it('should trigger downloadFile for selected export format', () => {
    const downloadSpy = vi.spyOn(baseExportMock, 'downloadFile').mockImplementation(() => {});
    exportService.download(sampleTheme, 'css');
    expect(downloadSpy).toHaveBeenCalledWith(
      expect.stringContaining('--color-primary'),
      'stripe-indigo-flow-theme.css',
      'text/css'
    );
  });
});

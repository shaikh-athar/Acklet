// packages/tool-shell/src/services/tool-isolation.spec.ts
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  QR_MANIFEST,
  CLIPBOARD_MANIFEST,
  resolveToolAccent,
  DEFAULT_TOOL_ACCENT,
  ToolRegistryItem
} from '@acklet/tool-registry';
import {
  ToolThemeProviderService,
  SHARED_DEFAULT_FONT
} from './tool-theme-provider.service';

describe('Tool Theming & Isolation Suite', () => {
  const themeProvider = new ToolThemeProviderService();

  describe('1. Global Token Isolation (Root Integrity)', () => {
    it('ensures global tokens.css does not contain hardcoded tool-specific tokens at root', () => {
      const tokensCssPath = path.resolve(__dirname, '../styles/tokens.css');
      const content = fs.readFileSync(tokensCssPath, 'utf-8');

      // Check that tool-specific slug tokens are not declared globally in tokens.css
      expect(content).not.toMatch(/--qr-[a-z-]+:/i);
      expect(content).not.toMatch(/--clipboard-[a-z-]+:/i);
      expect(content).not.toMatch(/--tool-qr/i);
    });

    it('ensures base.css does not contain tool-specific styles or font overrides', () => {
      const baseCssPath = path.resolve(__dirname, '../styles/base.css');
      if (fs.existsSync(baseCssPath)) {
        const content = fs.readFileSync(baseCssPath, 'utf-8');
        expect(content).not.toMatch(/\[data-tool="qr"\]/);
        expect(content).not.toMatch(/\[data-tool="clipboard"\]/);
      }
    });
  });

  describe('2. ToolThemeProvider Token Generation & Isolation', () => {
    it('generates distinct, isolated theme tokens for QR Generator', () => {
      const darkTokens = themeProvider.resolveThemeTokens(QR_MANIFEST, 'dark');
      const lightTokens = themeProvider.resolveThemeTokens(QR_MANIFEST, 'light');

      expect(darkTokens['--tool-accent']).toBe('#3B82F6');
      expect(darkTokens['--accent']).toBe('#3B82F6');
      expect(darkTokens['--font-sans']).toContain('Figtree');

      expect(lightTokens['--tool-accent']).toBe('#2563EB');
      expect(lightTokens['--accent']).toBe('#2563EB');
      expect(lightTokens['--font-sans']).toContain('Figtree');
    });

    it('generates distinct, isolated theme tokens for Online Clipboard', () => {
      const darkTokens = themeProvider.resolveThemeTokens(CLIPBOARD_MANIFEST, 'dark');
      const lightTokens = themeProvider.resolveThemeTokens(CLIPBOARD_MANIFEST, 'light');

      expect(darkTokens['--tool-accent']).toBe('#2DD4BF');
      expect(darkTokens['--accent']).toBe('#2DD4BF');
      expect(darkTokens['--font-sans']).toContain('Nunito');

      expect(lightTokens['--tool-accent']).toBe('#0F766E');
      expect(lightTokens['--accent']).toBe('#0F766E');
      expect(lightTokens['--font-sans']).toContain('Nunito');
    });

    it('ensures styles applied to Tool A do not contaminate Tool B (side-by-side / sequential purity)', () => {
      const qrTokens = themeProvider.resolveThemeTokens(QR_MANIFEST, 'dark');
      const clipTokens = themeProvider.resolveThemeTokens(CLIPBOARD_MANIFEST, 'dark');

      // Distinct accents
      expect(qrTokens['--tool-accent']).not.toBe(clipTokens['--tool-accent']);
      expect(qrTokens['--accent']).not.toBe(clipTokens['--accent']);

      // Distinct fonts
      expect(qrTokens['--font-sans']).not.toBe(clipTokens['--font-sans']);
      expect(qrTokens['--font-sans']).toContain('Figtree');
      expect(clipTokens['--font-sans']).toContain('Nunito');

      // Verify idempotency and immutability
      const qrTokensSecondCall = themeProvider.resolveThemeTokens(QR_MANIFEST, 'dark');
      expect(qrTokensSecondCall).toEqual(qrTokens);
    });

    it('falls back safely to shared defaults when tool has no manifest theme entries', () => {
      const emptyTool: ToolRegistryItem = {
        id: 'generic-test-tool',
        name: 'Generic Tool',
        slug: 'generic-tool',
        category: 'Utilities',
        shortDescription: 'Testing fallback behavior',
        description: 'Testing fallback behavior',
        icon: 'tool',
        status: 'live'
      };

      const darkFallback = themeProvider.resolveThemeTokens(emptyTool, 'dark');
      const lightFallback = themeProvider.resolveThemeTokens(emptyTool, 'light');

      expect(darkFallback['--tool-accent']).toBe(DEFAULT_TOOL_ACCENT.dark.base);
      expect(darkFallback['--font-sans']).toBe(SHARED_DEFAULT_FONT);

      expect(lightFallback['--tool-accent']).toBe(DEFAULT_TOOL_ACCENT.light.base);
      expect(lightFallback['--font-sans']).toBe(SHARED_DEFAULT_FONT);

      const nullFallback = themeProvider.resolveThemeTokens(null, 'dark');
      expect(nullFallback['--tool-accent']).toBe(DEFAULT_TOOL_ACCENT.dark.base);
      expect(nullFallback['--font-sans']).toBe(SHARED_DEFAULT_FONT);
    });
  });

  describe('3. Sidebar Tool Row Accent Independence', () => {
    it('resolves individual tool row accents without cross-tool inheritance', () => {
      const qrDark = resolveToolAccent(QR_MANIFEST, 'dark');
      const clipDark = resolveToolAccent(CLIPBOARD_MANIFEST, 'dark');

      expect(qrDark.base).toBe('#3B82F6');
      expect(clipDark.base).toBe('#2DD4BF');
      expect(qrDark.base).not.toBe(clipDark.base);

      const qrLight = resolveToolAccent(QR_MANIFEST, 'light');
      const clipLight = resolveToolAccent(CLIPBOARD_MANIFEST, 'light');

      expect(qrLight.base).toBe('#2563EB');
      expect(clipLight.base).toBe('#0F766E');
      expect(qrLight.base).not.toBe(clipLight.base);
    });
  });
});

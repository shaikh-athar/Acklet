// @vitest-environment jsdom
// apps/tool-color-studio/src/services/theme-generation.service.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ThemeGenerationService } from './theme-generation.service';

describe('ThemeGenerationService', () => {
  let service: ThemeGenerationService;

  beforeEach(() => {
    service = new ThemeGenerationService();
  });

  it('should generate a complete 23-token UI Theme with required semantic tokens', () => {
    const theme = service.generateTheme({
      baseColor: '#2563EB',
      style: 'modern',
      mood: 'calm',
      appType: 'saas-dashboard',
      mode: 'light'
    });

    expect(theme).toBeDefined();
    expect(theme.tokens).toHaveLength(23);

    const keys = theme.tokens.map(t => t.key);
    expect(keys).toContain('--color-primary');
    expect(keys).toContain('--color-primary-hover');
    expect(keys).toContain('--color-primary-active');
    expect(keys).toContain('--color-secondary');
    expect(keys).toContain('--color-secondary-hover');
    expect(keys).toContain('--color-accent');
    expect(keys).toContain('--color-background');
    expect(keys).toContain('--color-background-secondary');
    expect(keys).toContain('--color-surface');
    expect(keys).toContain('--color-' + 'surface-elevated');
    expect(keys).toContain('--color-' + 'surface-muted');
    expect(keys).toContain('--color-text-primary');
    expect(keys).toContain('--color-text-secondary');
    expect(keys).toContain('--color-text-muted');
    expect(keys).toContain('--color-text-inverse');
    expect(keys).toContain('--color-border');
    expect(keys).toContain('--color-border-subtle');
    expect(keys).toContain('--color-border-strong');
    expect(keys).toContain('--color-focus-ring');
    expect(keys).toContain('--color-success');
    expect(keys).toContain('--color-warning');
    expect(keys).toContain('--color-error');
    expect(keys).toContain('--color-information');
  });

  it('should enforce WCAG AA contrast (>= 4.5:1) for primary text in light mode', () => {
    const theme = service.generateTheme({
      baseColor: '#4F46E5',
      style: 'modern',
      mood: 'calm',
      appType: 'saas-dashboard',
      mode: 'light'
    });

    const textPrimary = theme.tokens.find(t => t.key === '--color-text-primary')!;
    expect(textPrimary.contrastWithBg).toBeGreaterThanOrEqual(4.5);
    expect(textPrimary.wcagGrade).toMatch(/AA|AAA/);
  });

  it('should generate dark mode themes with deep background and luminous primary', () => {
    const theme = service.generateTheme({
      baseColor: '#8B5CF6',
      style: 'dark-cinematic',
      mood: 'bold',
      appType: 'developer-tool',
      mode: 'dark'
    });

    expect(theme.mode).toBe('dark');
    const bgToken = theme.tokens.find(t => t.key === '--color-background')!;
    const textToken = theme.tokens.find(t => t.key === '--color-text-primary')!;
    expect(service.calculateLuminance(bgToken.hex)).toBeLessThan(0.1);
    expect(service.calculateLuminance(textToken.hex)).toBeGreaterThan(0.7);
  });

  it('should generate theme pairs with both light and dark variants', () => {
    const pair = service.generateThemePair({
      baseColor: '#059669',
      style: 'corporate',
      mood: 'calm',
      appType: 'fintech'
    });

    expect(pair.light.mode).toBe('light');
    expect(pair.dark.mode).toBe('dark');
    expect(pair.light.tokens.length).toBe(23);
    expect(pair.dark.tokens.length).toBe(23);
  });

  it('should generate variations preserving theme identity and locked tokens', () => {
    const baseTheme = service.generateTheme({
      baseColor: '#2563EB',
      mode: 'light'
    });

    // Lock primary token
    baseTheme.tokens[0].locked = true;

    const variations = service.generateVariations(baseTheme, 4);
    expect(variations).toHaveLength(4);
    variations.forEach(v => {
      expect(v.tokens).toHaveLength(23);
      // Locked primary token should match
      const p = v.tokens.find(t => t.key === '--color-primary')!;
      expect(p.hex).toBe(baseTheme.tokens[0].hex);
    });
  });

  it('should update a token and recompute dependent states and contrast ratios', () => {
    const theme = service.generateTheme({
      baseColor: '#2563EB',
      mode: 'light'
    });

    const updated = service.updateToken(theme, '--color-primary', '#DC2626');
    const primary = updated.tokens.find(t => t.key === '--color-primary')!;
    const hover = updated.tokens.find(t => t.key === '--color-primary-hover')!;

    expect(primary.hex).toBe('#DC2626');
    expect(hover.hex).not.toBe('#DC2626'); // Hover should be automatically updated
  });

  it('should provide curated seed themes covering all categories', () => {
    const seeds = service.getCuratedSeedThemes();
    expect(seeds.length).toBeGreaterThanOrEqual(10);
    const categories = seeds.map(s => s.category);
    expect(categories).toContain('Minimal & Clean');
    expect(categories).toContain('Modern SaaS');
    expect(categories).toContain('Dark & Cinematic');
    expect(categories).toContain('FinTech');
  });

  it('should generate theme batches with offset and deduplicate against existing fingerprints', () => {
    const batch1 = service.generateThemeBatch({
      baseColor: '#2563EB',
      style: 'modern',
      count: 4,
      offset: 0
    });
    expect(batch1).toHaveLength(4);

    const fps1 = new Set(batch1.map(t => service.getThemeFingerprint(t)));

    const batch2 = service.generateThemeBatch({
      baseColor: '#2563EB',
      style: 'modern',
      count: 4,
      offset: 4,
      existingFingerprints: fps1
    });
    expect(batch2).toHaveLength(4);

    // Verify batch2 themes are completely distinct from batch1
    batch2.forEach(t => {
      expect(fps1.has(service.getThemeFingerprint(t))).toBe(false);
    });
  });

  it('should generate themes tailored for specific categories', () => {
    const fintechThemes = service.generateCategoryThemes('FinTech', 4);
    expect(fintechThemes).toHaveLength(4);
    fintechThemes.forEach(t => {
      expect(t.category).toBe('FinTech');
      expect(t.tokens).toHaveLength(23);
    });

    const darkThemes = service.generateCategoryThemes('Dark & Cinematic', 4);
    expect(darkThemes).toHaveLength(4);
    darkThemes.forEach(t => {
      expect(t.category).toBe('Dark & Cinematic');
      expect(t.mode).toBe('dark');
    });
  });

  it('should generate curated batches spanning multiple diverse categories', () => {
    const batch = service.generateCuratedBatch(4);
    expect(batch).toHaveLength(4);
    batch.forEach(t => {
      expect(t.tokens).toHaveLength(23);
    });
    // Distinct themes
    const fingerprints = new Set(batch.map(t => service.getThemeFingerprint(t)));
    expect(fingerprints.size).toBe(4);
  });
});

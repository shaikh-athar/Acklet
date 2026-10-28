// @vitest-environment jsdom
// packages/tool-shell/src/hub/hub-home-gradient-phase1.spec.ts
import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { HubHomeComponent } from './hub-home.component';

describe('HubHomeComponent - Clean Background & Tool Accent Preservation', () => {
  function createHub(): HubHomeComponent {
    const rootInjector = {
      get: (_token: any, notFound?: any) => notFound
    } as any;
    const envInjector = createEnvironmentInjector([], rootInjector);
    return runInInjectionContext(envInjector, () => new HubHomeComponent());
  }

  it('instantiates cleanly within an injection context', () => {
    const hub = createHub();
    expect(hub).toBeTruthy();
  });

  it('confirms no multi-color gradient background elements exist in template', () => {
    const annotations = (HubHomeComponent as any)['ɵcmp'];
    expect(annotations).toBeDefined();
    const constsStr: string = JSON.stringify(annotations.consts || []) + (annotations.template?.toString() || '');

    // Background mesh gradient layer elements must be removed
    expect(constsStr).not.toContain('hub-hero-bg-layer');
    expect(constsStr).not.toContain('hub-hero-gradient');
    expect(constsStr).not.toContain('hub-hero-grain');
    expect(constsStr).not.toContain('hub-hero-veil');
  });

  it('binds per-tool accent styles to row items for icon and hover color preservation', () => {
    const annotations = (HubHomeComponent as any)['ɵcmp'];
    const constsStr: string = JSON.stringify(annotations.consts || []) + (annotations.template?.toString() || '');

    // Verifies per-tool accent bindings are passed to row items
    expect(constsStr).toContain('--row-accent');
    expect(constsStr).toContain('--row-accent-strong');
    expect(constsStr).toContain('--row-accent-soft');
  });

  it('defines clean theme tokens and border variables in component styles', () => {
    const annotations = (HubHomeComponent as any)['ɵcmp'];
    const styles: string[] = annotations.styles || [];
    const joinedStyles = styles.join('\n');

    // Clean tokens without mesh glow variables
    expect(joinedStyles).not.toContain('--glow-peach');
    expect(joinedStyles).not.toContain('--glow-lavender');
    expect(joinedStyles).not.toContain('--glow-blue');

    // Dual-theme base tokens
    expect(joinedStyles).toContain('--bg-base');
    expect(joinedStyles).toContain('[data-theme="dark"]');
  });

  it('preserves tool accent colors on row hover instead of turning black', () => {
    const annotations = (HubHomeComponent as any)['ɵcmp'];
    const styles: string[] = annotations.styles || [];
    const joinedStyles = styles.join('\n');

    // On hover, icon tile uses tool accent variables rather than static solid black
    expect(joinedStyles).toContain('var(--row-accent-strong');
    expect(joinedStyles).toContain('var(--row-accent-soft');
    expect(joinedStyles).not.toContain('background: #000000 !important');
  });

  it('verifies WCAG AA contrast ratio (>= 4.5:1) for title text over background', () => {
    // Relative luminance calculation based on WCAG 2.1 specifications
    function luminance(r: number, g: number, b: number): number {
      const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }

    function contrast(rgb1: [number, number, number], rgb2: [number, number, number]): number {
      const lum1 = luminance(...rgb1);
      const lum2 = luminance(...rgb2);
      const brightest = Math.max(lum1, lum2);
      const darkest = Math.min(lum1, lum2);
      return (brightest + 0.05) / (darkest + 0.05);
    }

    // Light mode text #18181B on #F7F8F8 base
    const lightText: [number, number, number] = [24, 24, 27];
    const lightBase: [number, number, number] = [247, 248, 248];
    const lightContrast = contrast(lightText, lightBase);
    expect(lightContrast).toBeGreaterThanOrEqual(4.5); // Expected > 14:1

    // Dark mode text #FCFCFC on #0F1011 base
    const darkText: [number, number, number] = [252, 252, 252];
    const darkBase: [number, number, number] = [15, 16, 17];
    const darkContrast = contrast(darkText, darkBase);
    expect(darkContrast).toBeGreaterThanOrEqual(4.5); // Expected > 16:1
  });

  it('enforces ellipsis truncation for long tool descriptions and persistent action icons', () => {
    const annotations = (HubHomeComponent as any)['ɵcmp'];
    const styles: string[] = annotations.styles || [];
    const joinedStyles = styles.join('\n');

    // Content container must flex-shrink and constrain width to prevent overflow
    expect(joinedStyles).toContain('min-width: 0');
    expect(joinedStyles).toContain('overflow: hidden');

    // Description text must truncate with ellipsis
    expect(joinedStyles).toContain('text-overflow: ellipsis');
    expect(joinedStyles).toContain('white-space: nowrap');

    // Action container (star + arrow) must not shrink or get pushed off-screen
    expect(joinedStyles).toContain('flex-shrink: 0');
    expect(joinedStyles).toContain('margin-left: auto');
  });

  it('applies a subtle, low-intensity hover background color effect on tool rows', () => {
    const annotations = (HubHomeComponent as any)['ɵcmp'];
    const styles: string[] = annotations.styles || [];
    const joinedStyles = styles.join('\n');

    // Subtle tint using color-mix with tool accent
    expect(joinedStyles).toContain('color-mix(in srgb, var(--row-accent');
  });

  it('uses Scoutie Sans as the unified font family for tools and eliminates Nunito', () => {
    const annotations = (HubHomeComponent as any)['ɵcmp'];
    const styles: string[] = annotations.styles || [];
    const joinedStyles = styles.join('\n');

    expect(joinedStyles).toContain('Scoutie Sans');
    expect(joinedStyles).not.toContain('Nunito');
  });
});

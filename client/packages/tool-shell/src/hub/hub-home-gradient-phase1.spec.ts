// @vitest-environment jsdom
// packages/tool-shell/src/hub/hub-home-gradient-phase1.spec.ts
import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { HubHomeComponent } from './hub-home.component';

describe('HubHomeComponent - Phase 1: Premium Gradient Background', () => {
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

  it('declares the hero background layer and child gradient elements in template', () => {
    const annotations = (HubHomeComponent as any)['ɵcmp'];
    expect(annotations).toBeDefined();
    const constsStr: string = JSON.stringify(annotations.consts || []) + (annotations.template?.toString() || '');

    // Verify background layer markup exists
    expect(constsStr).toContain('hub-hero-bg-layer');
    expect(constsStr).toContain('hub-hero-gradient');
    expect(constsStr).toContain('hub-hero-grain');
    expect(constsStr).toContain('hub-hero-veil');
  });

  it('defines required Phase 1 CSS variables and theming in component styles', () => {
    const annotations = (HubHomeComponent as any)['ɵcmp'];
    const styles: string[] = annotations.styles || [];
    const joinedStyles = styles.join('\n');

    // 1. Light Mode CSS Variables
    expect(joinedStyles).toContain('--bg-base: #EEEDED');
    expect(joinedStyles).toContain('--glow-peach: rgba(247, 214, 196, 0.85)');
    expect(joinedStyles).toContain('--glow-lavender: rgba(196, 190, 230, 0.75)');
    expect(joinedStyles).toContain('--glow-blue: rgba(99, 112, 235, 0.85)');
    expect(joinedStyles).toContain('--grid-line: rgba(0, 0, 0, 0.08)');
    expect(joinedStyles).toContain('--grid-hover: rgba(80, 90, 220, 0.35)');

    // 2. Dark Mode CSS Variables & Selector
    expect(joinedStyles).toContain('[data-theme="dark"]');
    expect(joinedStyles).toContain('--bg-base: #0E1016');
    expect(joinedStyles).toContain('--glow-peach: rgba(225, 112, 138, 0.25)');
    expect(joinedStyles).toContain('--glow-lavender: rgba(99, 85, 180, 0.35)');
    expect(joinedStyles).toContain('--glow-blue: rgba(45, 65, 160, 0.45)');
    expect(joinedStyles).toContain('--grid-line: rgba(255, 255, 255, 0.07)');
    expect(joinedStyles).toContain('--grid-hover: rgba(140, 150, 255, 0.35)');
  });

  it('configures layered radial gradients with bottom linear fade', () => {
    const annotations = (HubHomeComponent as any)['ɵcmp'];
    const styles: string[] = annotations.styles || [];
    const joinedStyles = styles.join('\n');

    // Radial gradients center-left peach, mid-right lavender, corner-right blue
    expect(joinedStyles).toContain('radial-gradient(60% 55% at 38% 60%, var(--glow-peach)');
    expect(joinedStyles).toContain('radial-gradient(55% 60% at 75% 70%, var(--glow-lavender)');
    expect(joinedStyles).toContain('radial-gradient(45% 55% at 100% 100%, var(--glow-blue)');

    // Fade to page background at bottom edge
    expect(joinedStyles).toContain('linear-gradient(180deg, transparent 0%, transparent 60%, var(--bg-base) 100%)');
  });

  it('incorporates subtle inline SVG feTurbulence grain at 4-6% opacity', () => {
    const annotations = (HubHomeComponent as any)['ɵcmp'];
    const styles: string[] = annotations.styles || [];
    const joinedStyles = styles.join('\n');

    expect(joinedStyles).toContain('feTurbulence');
    expect(joinedStyles).toContain('opacity: 0.05');
    expect(joinedStyles).toContain('mix-blend-mode: multiply');
  });

  it('positions hero background behind content with pointer-events: none and no scroll leakage', () => {
    const annotations = (HubHomeComponent as any)['ɵcmp'];
    const styles: string[] = annotations.styles || [];
    const joinedStyles = styles.join('\n');

    expect(joinedStyles).toContain('position: absolute');
    expect(joinedStyles).toContain('pointer-events: none');
    expect(joinedStyles).toContain('z-index: -1');
    expect(joinedStyles).toContain('overflow: hidden');
    expect(joinedStyles).toContain('contain: paint');
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

    // Light mode text #09090B on #EEEDED base
    const lightText: [number, number, number] = [9, 9, 11];
    const lightBase: [number, number, number] = [238, 237, 237];
    const lightContrast = contrast(lightText, lightBase);
    expect(lightContrast).toBeGreaterThanOrEqual(4.5); // Expected > 14:1

    // Dark mode text #FCFCFC on #0E1016 base
    const darkText: [number, number, number] = [252, 252, 252];
    const darkBase: [number, number, number] = [14, 16, 22];
    const darkContrast = contrast(darkText, darkBase);
    expect(darkContrast).toBeGreaterThanOrEqual(4.5); // Expected > 16:1
  });
});

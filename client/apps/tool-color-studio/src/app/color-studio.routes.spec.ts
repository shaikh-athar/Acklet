// apps/tool-color-studio/src/app/color-studio.routes.spec.ts
import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { colorStudioRoutes, COLOR_STUDIO_MODULE_ROUTES } from './color-studio.routes';
import { Route } from '@angular/router';

describe('Color Studio Routes', () => {
  it('should define all 6 required modules in COLOR_STUDIO_MODULE_ROUTES', () => {
    const paths = COLOR_STUDIO_MODULE_ROUTES.map(r => r.path);
    expect(paths).toContain('color-picker');
    expect(paths).toContain('image-extractor');
    expect(paths).toContain('gradient-generator');
    expect(paths).toContain('contrast-checker');
    expect(paths).toContain('palette-generator');
    expect(paths).toContain('vision-simulator');
  });

  it('should define shorthand aliases for all 6 modules', () => {
    const shorthandAliases = [
      { path: 'picker', redirectTo: 'color-picker' },
      { path: 'extractor', redirectTo: 'image-extractor' },
      { path: 'gradient', redirectTo: 'gradient-generator' },
      { path: 'contrast', redirectTo: 'contrast-checker' },
      { path: 'palette', redirectTo: 'palette-generator' },
      { path: 'simulator', redirectTo: 'vision-simulator' }
    ];

    for (const alias of shorthandAliases) {
      const match = COLOR_STUDIO_MODULE_ROUTES.find(r => r.path === alias.path);
      expect(match).toBeDefined();
      expect(match?.redirectTo).toBe(alias.redirectTo);
      expect(match?.pathMatch).toBe('full');
    }
  });

  it('should configure lazy loading and titles for all 6 modules', () => {
    const expectedModules = [
      { path: 'color-picker', title: 'Color Picker — Acklet Color Studio' },
      { path: 'image-extractor', title: 'Image Extractor — Acklet Color Studio' },
      { path: 'gradient-generator', title: 'Gradient Generator — Acklet Color Studio' },
      { path: 'contrast-checker', title: 'Contrast Checker — Acklet Color Studio' },
      { path: 'palette-generator', title: 'Palette Generator — Acklet Color Studio' },
      { path: 'vision-simulator', title: 'Vision Simulator — Acklet Color Studio' }
    ];

    for (const expected of expectedModules) {
      const route = COLOR_STUDIO_MODULE_ROUTES.find(r => r.path === expected.path);
      expect(route).toBeDefined();
      expect(typeof route?.loadComponent).toBe('function');
      expect(route?.title).toBe(expected.title);
    }
  });

  it('should include root route loading ColorStudioLandingComponent', () => {
    const rootRoute = colorStudioRoutes.find(r => r.path === '');
    expect(rootRoute).toBeDefined();
    expect(typeof rootRoute?.loadComponent).toBe('function');
    expect(rootRoute?.title).toBe('Acklet Color Studio — Professional Color Tools');
  });

  it('should support /colorstudio prefixed routes with child module routes', () => {
    const colorstudioPrefix = colorStudioRoutes.find(r => r.path === 'colorstudio');
    expect(colorstudioPrefix).toBeDefined();
    expect(colorstudioPrefix?.children).toBeDefined();

    const childPaths = colorstudioPrefix?.children?.map((c: Route) => c.path);
    expect(childPaths).toContain('color-picker');
    expect(childPaths).toContain('image-extractor');
    expect(childPaths).toContain('gradient-generator');
    expect(childPaths).toContain('contrast-checker');
    expect(childPaths).toContain('palette-generator');
    expect(childPaths).toContain('vision-simulator');
  });

  it('should redirect /color-studio and /tools/ variants to /colorstudio', () => {
    const hyphenRoute = colorStudioRoutes.find(r => r.path === 'color-studio');
    expect(hyphenRoute?.redirectTo).toBe('colorstudio');

    const toolsRoute = colorStudioRoutes.find(r => r.path === 'tools/colorstudio');
    expect(toolsRoute?.redirectTo).toBe('colorstudio');

    const toolsHyphenRoute = colorStudioRoutes.find(r => r.path === 'tools/color-studio');
    expect(toolsHyphenRoute?.redirectTo).toBe('colorstudio');
  });

  it('should include wildcard fallback redirecting to root landing', () => {
    const wildcard = colorStudioRoutes.find(r => r.path === '**');
    expect(wildcard).toBeDefined();
    expect(wildcard?.redirectTo).toBe('');
  });
});

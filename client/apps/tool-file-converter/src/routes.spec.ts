import '@angular/compiler';
// apps/tool-file-converter/src/routes.spec.ts
import { describe, it, expect } from 'vitest';
import { converterRoutes } from './routes';

describe('File Converter Routes & Screen Verification', () => {
  it('defines the root route for File Converter', () => {
    expect(converterRoutes.length).toBeGreaterThanOrEqual(1);
    const rootRoute = converterRoutes.find(r => r.path === '');
    expect(rootRoute).toBeDefined();
    expect(rootRoute?.component).toBeDefined();
  });

  it('does not define fragmented child routes for converter steps', () => {
    const routePaths = converterRoutes.map(r => r.path);
    expect(routePaths).not.toContain('input');
    expect(routePaths).not.toContain('settings');
    expect(routePaths).not.toContain('output');
  });
});

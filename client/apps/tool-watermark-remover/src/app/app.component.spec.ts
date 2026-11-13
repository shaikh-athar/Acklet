// apps/tool-watermark-remover/src/app/app.component.spec.ts
import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { AppComponent } from './app.component';
import { WATERMARK_REMOVER_MANIFEST } from '@acklet/tool-registry';

describe('AppComponent (Watermark Remover)', () => {
  const envInjector = createEnvironmentInjector([]);

  it('initializes with the watermark remover manifest and fullBleed layout', () => {
    runInInjectionContext(envInjector, () => {
      const comp = new AppComponent();
      expect(comp.manifest).toBeDefined();
      expect(comp.manifest.slug).toBe('watermark-remover');
      expect(comp.manifest.category).toBe('Images');
      expect(comp.shellConfig.layout).toBe('fullBleed');
    });
  });

  it('updates activeTab on tab change', () => {
    runInInjectionContext(envInjector, () => {
      const comp = new AppComponent();
      expect(comp.activeTab()).toBe('editor');
      comp.onTabChange('settings');
      expect(comp.activeTab()).toBe('settings');
    });
  });
});

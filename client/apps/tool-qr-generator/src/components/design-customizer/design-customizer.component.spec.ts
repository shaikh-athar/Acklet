// @vitest-environment jsdom
import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { DesignCustomizerComponent } from './design-customizer.component';

describe('DesignCustomizerComponent', () => {
  it('instantiates properly in injection context', () => {
    const rootInjector = {
      get: (token: any, notFound?: any) => {
        if (token === DomSanitizer) {
          return {
            bypassSecurityTrustHtml: (html: string) => html,
            bypassSecurityTrustResourceUrl: (url: string) => url
          };
        }
        return notFound;
      }
    } as any;

    const envInjector = createEnvironmentInjector([], rootInjector);

    let comp!: DesignCustomizerComponent;
    expect(() => {
      runInInjectionContext(envInjector, () => {
        comp = new DesignCustomizerComponent();
      });
    }).not.toThrow();

    expect(comp).toBeDefined();
    expect(comp.shapeList).toBeDefined();
    expect(comp.shapeList.length).toBeGreaterThan(0);
    expect(comp.frameList).toBeDefined();
    expect(comp.frameList.length).toBe(18);

    // Verify glyph options for Body Dots, Corner Outer Frame, and Corner Inner Dot
    expect(comp.dotOptions.length).toBe(11);
    expect(comp.cornerSquareOptions.length).toBe(8);
    expect(comp.cornerDotOptions.length).toBe(10);
  });
});

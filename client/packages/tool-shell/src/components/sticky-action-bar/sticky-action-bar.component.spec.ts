// @vitest-environment jsdom
// client/packages/tool-shell/src/components/sticky-action-bar/sticky-action-bar.component.spec.ts
import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext, signal } from '@angular/core';
import { StickyActionBarComponent } from './sticky-action-bar.component';
import { ResponsiveService } from '../../services/responsive.service';

describe('StickyActionBarComponent', () => {
  it('correctly reacts to keyboardOpen signal', () => {
    const keyboardOpenSignal = signal(false);
    const mockResponsive = {
      keyboardOpen: keyboardOpenSignal.asReadonly()
    };

    const rootInjector = {
      get: (token: any, notFound?: any) => {
        if (token === ResponsiveService) return mockResponsive;
        return notFound;
      }
    } as any;

    const envInjector = createEnvironmentInjector([], rootInjector);

    runInInjectionContext(envInjector, () => {
      const bar = new StickyActionBarComponent();
      expect(bar.shouldHideOnKeyboard()).toBe(false);

      keyboardOpenSignal.set(true);
      expect(bar.shouldHideOnKeyboard()).toBe(true);

      keyboardOpenSignal.set(false);
      expect(bar.shouldHideOnKeyboard()).toBe(false);
    });
  });
});

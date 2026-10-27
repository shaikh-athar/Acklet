// @vitest-environment jsdom
// client/packages/tool-shell/src/components/adaptive-dropdown/adaptive-dropdown.component.spec.ts
import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext, signal } from '@angular/core';
import { AdaptiveDropdownComponent } from './adaptive-dropdown.component';
import { ResponsiveService } from '../../services/responsive.service';

describe('AdaptiveDropdownComponent', () => {
  it('toggles open and close state properly', () => {
    const isPhoneSignal = signal(true);
    const mockResponsive = {
      isPhone: isPhoneSignal.asReadonly()
    };

    const rootInjector = {
      get: (token: any, notFound?: any) => {
        if (token === ResponsiveService) return mockResponsive;
        return notFound;
      }
    } as any;

    const envInjector = createEnvironmentInjector([], rootInjector);

    runInInjectionContext(envInjector, () => {
      const dropdown = new AdaptiveDropdownComponent();
      expect(dropdown.isOpen()).toBe(false);

      dropdown.open();
      expect(dropdown.isOpen()).toBe(true);

      dropdown.close();
      expect(dropdown.isOpen()).toBe(false);

      dropdown.toggleOpen();
      expect(dropdown.isOpen()).toBe(true);
    });
  });

  it('closes on escape key', () => {
    const isPhoneSignal = signal(false);
    const mockResponsive = {
      isPhone: isPhoneSignal.asReadonly()
    };

    const rootInjector = {
      get: (token: any, notFound?: any) => {
        if (token === ResponsiveService) return mockResponsive;
        return notFound;
      }
    } as any;

    const envInjector = createEnvironmentInjector([], rootInjector);

    runInInjectionContext(envInjector, () => {
      const dropdown = new AdaptiveDropdownComponent();
      dropdown.open();
      expect(dropdown.isOpen()).toBe(true);

      dropdown.onEscape();
      expect(dropdown.isOpen()).toBe(false);
    });
  });
});

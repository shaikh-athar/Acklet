// @vitest-environment jsdom
// packages/tool-shell/src/components/topbar/ts-topbar.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@angular/core', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    effect: vi.fn((fn: any) => {
      // Mock effect execution or noop in unit test
    }),
  };
});

import { createEnvironmentInjector, runInInjectionContext, signal, ElementRef, NgZone } from '@angular/core';
import { TsTopbarComponent } from './ts-topbar.component';
import { ToolSidebarService } from '../../services/tool-sidebar.service';
import { SidebarStateService } from '../../services/sidebar-state.service';
import { ToolSettingsService } from '../../services/tool-settings.service';

describe('TsTopbarComponent - Responsive Navigation & Drawer Roles', () => {
  let component: TsTopbarComponent;
  let mockSidebarService: { toggleMobileDrawer: ReturnType<typeof vi.fn>; isMobileDrawerOpen: any };
  let mockSidebarState: any;
  let mockSettingsService: any;
  let nativeElement: HTMLElement;

  beforeEach(() => {
    nativeElement = document.createElement('div');
    mockSidebarService = {
      toggleMobileDrawer: vi.fn(),
      isMobileDrawerOpen: signal(false)
    };
    mockSidebarState = {
      isPinned: signal(true),
      isPeek: signal(false),
      togglePin: vi.fn()
    };
    mockSettingsService = {
      openSettings: vi.fn(),
      isSettingsOpen: signal(false)
    };

    const rootInjector = {
      get: (token: any, notFound?: any) => {
        if (token === ToolSidebarService) return mockSidebarService;
        if (token === SidebarStateService) return mockSidebarState;
        if (token === ToolSettingsService) return mockSettingsService;
        if (token === ElementRef) return new ElementRef(nativeElement);
        if (token === NgZone) return { runOutsideAngular: (fn: any) => fn(), run: (fn: any) => fn() };
        return notFound;
      }
    } as any;

    const envInjector = createEnvironmentInjector([], rootInjector);
    runInInjectionContext(envInjector, () => {
      component = new TsTopbarComponent();
    });
  });

  describe('Menu & Drawer Role Assignments', () => {
    it('initializes with navigation menu closed', () => {
      expect(component.isNavMenuOpen()).toBe(false);
    });

    it('toggles navigation menu when toggleNavMenu is called', () => {
      component.toggleNavMenu();
      expect(component.isNavMenuOpen()).toBe(true);

      component.toggleNavMenu();
      expect(component.isNavMenuOpen()).toBe(false);
    });

    it('stops event propagation on toggleNavMenu', () => {
      const stopPropSpy = vi.fn();
      component.toggleNavMenu({ stopPropagation: stopPropSpy } as any);
      expect(stopPropSpy).toHaveBeenCalled();
      expect(component.isNavMenuOpen()).toBe(true);
    });

    it('closes navigation menu via closeNavMenu', () => {
      component.isNavMenuOpen.set(true);
      component.closeNavMenu();
      expect(component.isNavMenuOpen()).toBe(false);
    });

    it('delegates grid button to sidebarService.toggleMobileDrawer()', () => {
      const stopPropSpy = vi.fn();
      component.toggleToolsDrawer({ stopPropagation: stopPropSpy } as any);
      expect(stopPropSpy).toHaveBeenCalled();
      expect(mockSidebarService.toggleMobileDrawer).toHaveBeenCalledTimes(1);
    });
  });

  describe('Navigation Menu Interaction & Dismissal', () => {
    it('closes navigation menu on menu item click', () => {
      component.isNavMenuOpen.set(true);
      const event = { preventDefault: vi.fn() } as any;
      component.onNavMenuItemClick(event, 'about');
      expect(component.isNavMenuOpen()).toBe(false);
    });

    it('closes navigation menu on share click', () => {
      component.isNavMenuOpen.set(true);
      const shareSpy = vi.spyOn(component, 'shareTool').mockImplementation(() => {});
      component.onNavShareClick();
      expect(component.isNavMenuOpen()).toBe(false);
      expect(shareSpy).toHaveBeenCalled();
    });

    it('closes navigation menu on escape key', () => {
      component.isNavMenuOpen.set(true);
      component.onEscape();
      expect(component.isNavMenuOpen()).toBe(false);
    });

    it('dismisses on outside document click', () => {
      component.isNavMenuOpen.set(true);
      const outsideDiv = document.createElement('div');
      document.body.appendChild(outsideDiv);
      component.onDocumentClick({ target: outsideDiv } as any);
      expect(component.isNavMenuOpen()).toBe(false);
      document.body.removeChild(outsideDiv);
    });
  });

  describe('Component Template & Styles Definition', () => {
    it('defines 4-circles button wired to toggleNavMenu without hamburger button in topbar', () => {
      const cmp = (TsTopbarComponent as any)['\u0275cmp'];
      expect(cmp).toBeDefined();
      const constsStr = JSON.stringify(cmp.consts);
      expect(constsStr).not.toContain('ts-mobile-menu-btn');
      expect(constsStr).toContain('ts-tools-grid-btn');
      expect(constsStr).toContain('ts-nav-panel');
      expect(constsStr).toContain('ts-nav-backdrop');
      expect(constsStr).toContain('ts-nav-theme-row');
    });

    it('computes section links without Dynamic Links in topbar nav and provides Share/Save in panel', () => {
      (component as any).tool = signal({
        name: 'QR Code Generator',
        slug: 'qr',
        about: 'About QR',
        howTo: ['Step 1'],
        faqs: [{ q: 'Q1', a: 'A1' }],
        related: ['bar-code']
      });
      const links = component.sectionLinks();
      expect(links.map(l => l.id)).toEqual(['tool', 'about', 'how-to-use', 'faq', 'related']);

      const cmp = (TsTopbarComponent as any)['\u0275cmp'];
      expect(cmp).toBeDefined();
      const constsStr = JSON.stringify(cmp.consts);
      expect(constsStr).toContain('ts-nav-panel-actions');
      expect(constsStr).toContain('ts-nav-action-row');
      expect(constsStr).toContain('ts-nav-item-text');
    });

    it('includes responsive styles for popover on desktop/tablet and bottom sheet on mobile with 44px tap targets', () => {
      const cmp = (TsTopbarComponent as any)['\u0275cmp'];
      expect(cmp).toBeDefined();
      const styles = cmp.styles?.join(' ') || '';
      expect(styles).toContain('.ts-nav-panel');
      expect(styles).toContain('@media (max-width: 767px)');
      expect(styles).toContain('min-height: 44px');
      expect(styles).toContain('border-radius: 20px 20px 0 0');
    });
  });
});

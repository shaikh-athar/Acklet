// @vitest-environment jsdom
// client/apps/tool-qr-generator/src/components/social-link-input/social-link-input.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { SocialLinkInputComponent, SocialLinkInputValue } from './social-link-input.component';
import { detectPlatformFromUrl } from '../../utils/social-platforms.data';

describe('SocialLinkInputComponent & PlatformDetector', () => {
  let component: SocialLinkInputComponent;

  beforeEach(() => {
    const rootInjector = {
      get: (_token: any, notFound?: any) => notFound
    } as any;
    const envInjector = createEnvironmentInjector([], rootInjector);
    runInInjectionContext(envInjector, () => {
      component = new SocialLinkInputComponent();
    });
    component.ngOnInit();
  });

  describe('detectPlatformFromUrl', () => {
    it('detects LinkedIn URLs accurately', () => {
      const detected = detectPlatformFromUrl('https://www.linkedin.com/in/athar-shaikh-b9035931b/');
      expect(detected).toBeDefined();
      expect(detected?.id).toBe('linkedin');
    });

    it('detects GitHub, X/Twitter, YouTube, and Discord URLs accurately', () => {
      expect(detectPlatformFromUrl('https://github.com/shaikh-athar')?.id).toBe('github');
      expect(detectPlatformFromUrl('https://x.com/jack')?.id).toBe('x');
      expect(detectPlatformFromUrl('https://twitter.com/jack')?.id).toBe('x');
      expect(detectPlatformFromUrl('https://youtube.com/@mkbhd')?.id).toBe('youtube');
      expect(detectPlatformFromUrl('https://discord.gg/invite123')?.id).toBe('discord');
      expect(detectPlatformFromUrl('https://open.spotify.com/track/123')?.id).toBe('spotify');
    });
  });

  describe('Component auto-switch & UX', () => {
    it('initializes with default Instagram platform', () => {
      expect(component.selectedPlatform().id).toBe('instagram');
      expect(component.validation().isValid).toBe(false);
    });

    it('auto-switches to LinkedIn when LinkedIn URL is pasted into Instagram field', () => {
      let lastEmitted: SocialLinkInputValue | null = null;
      component.valueChange.subscribe(val => {
        lastEmitted = val;
      });

      const fakeClipboard = {
        getData: (type: string) =>
          type === 'text' ? 'https://www.linkedin.com/in/athar-shaikh-b9035931b/' : ''
      };
      const fakeEvent = {
        clipboardData: fakeClipboard,
        preventDefault: vi.fn()
      } as unknown as ClipboardEvent;

      component.onPaste(fakeEvent);

      expect(component.selectedPlatform().id).toBe('linkedin');
      expect(component.handleOrUrl()).toBe('https://www.linkedin.com/in/athar-shaikh-b9035931b/');
      expect(component.validation().isValid).toBe(true);
      expect(component.canonicalUrl()).toBe('https://www.linkedin.com/in/athar-shaikh-b9035931b/');
      expect(component.undoSwitchState()).toBeDefined();
      expect(component.undoSwitchState()?.previousPlatform.id).toBe('instagram');
      expect(lastEmitted?.platform).toBe('linkedin');
    });

    it('allows reverting auto-switch via undoPlatformSwitch', () => {
      const fakeClipboard = {
        getData: () => 'https://www.linkedin.com/in/athar-shaikh-b9035931b/'
      };
      const fakeEvent = {
        clipboardData: fakeClipboard,
        preventDefault: vi.fn()
      } as unknown as ClipboardEvent;

      component.onPaste(fakeEvent);
      expect(component.selectedPlatform().id).toBe('linkedin');

      component.undoPlatformSwitch();
      expect(component.selectedPlatform().id).toBe('instagram');
      expect(component.undoSwitchState()).toBeNull();
    });

    it('displays center logo prompt and emits addCenterIcon event', () => {
      let emittedIcon: any = null;
      component.addCenterIcon.subscribe(val => {
        emittedIcon = val;
      });

      component.onPlatformSelect('linkedin');
      component.onInputChange('athar-shaikh');

      expect(component.showCenterIconPrompt()).toBe(true);

      component.triggerAddCenterIcon();
      expect(emittedIcon).toEqual({
        iconId: 'linkedin',
        platformName: 'LinkedIn'
      });
      // Prompt should now be dismissed
      expect(component.showCenterIconPrompt()).toBe(false);
    });

    it('supports custom platform fallback gracefully without errors', () => {
      component.onPlatformSelect('custom');
      component.onInputChange('https://myportfolio.dev');

      expect(component.selectedPlatform().id).toBe('custom');
      expect(component.canonicalUrl()).toBe('https://myportfolio.dev');
      expect(component.validation().isValid).toBe(true);
    });
  });
});

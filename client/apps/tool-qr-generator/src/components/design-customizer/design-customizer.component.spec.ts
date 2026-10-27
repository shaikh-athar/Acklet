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

    // Verify Stage 3 Logo Presets & Safe Thumbnails
    expect(comp.logoPresets).toBeDefined();
    expect(comp.logoPresets.length).toBe(16);
    for (const preset of comp.logoPresets) {
      expect(preset.id).toBeDefined();
      expect(preset.name).toBeDefined();
      expect(preset.safeThumbnail).toBeDefined();
      if (preset.innerSvg) {
        expect(preset.innerSvg).not.toContain('%23');
      }
    }

    // Verify initial "none" active state
    const nonePreset = comp.logoPresets.find(p => p.id === 'none')!;
    expect(comp.isLogoPresetActive(nonePreset)).toBe(true);

    // Verify selection of a preset (e.g., wifi)
    const wifiPreset = comp.logoPresets.find(p => p.id === 'wifi')!;
    let emittedLogo: string | null | undefined;
    comp.logoChange.subscribe(val => {
      emittedLogo = val;
    });

    comp.applyLogoPreset(wifiPreset.dataUrl);
    expect(emittedLogo).toBe(wifiPreset.dataUrl);

    // Verify removeLogo resets logo to null
    comp.removeLogo();
    expect(emittedLogo).toBeNull();

    // Verify frame selection emits frameChange
    let emittedFrame: any;
    comp.frameChange.subscribe(val => {
      emittedFrame = val;
    });
    comp.onFrameStyleSelect('coffee-cup');
    expect(emittedFrame).toBeDefined();
    expect(emittedFrame.style).toBe('coffee-cup');

    // Verify CTA text color change
    comp.onFrameTextColorChange('#10b981');
    expect(emittedFrame.textColor).toBe('#10b981');
  });

  it('resolves theme-aware CTA text color correctly (black in light, white in dark)', async () => {
    const { getDefaultCtaTextColor, DEFAULT_FRAME_OPTIONS } = await import('../../models/qr-generator.models');

    // Default frame text color is black in light theme
    expect(DEFAULT_FRAME_OPTIONS.textColor).toBe('#000000');

    // Light theme explicit or DOM attribute
    expect(getDefaultCtaTextColor('light')).toBe('#000000');

    // Dark theme explicit or DOM attribute
    expect(getDefaultCtaTextColor('dark')).toBe('#ffffff');
  });
});

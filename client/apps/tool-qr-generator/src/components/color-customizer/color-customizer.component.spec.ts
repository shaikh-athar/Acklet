// @vitest-environment jsdom
// client/apps/tool-qr-generator/src/components/color-customizer/color-customizer.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext, signal, WritableSignal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ColorCustomizerComponent } from './color-customizer.component';
import { ColorValidatorService } from '../../services/color-validator.service';
import { DEFAULT_GRADIENT_OPTIONS, QrGradientOptions } from '../../models/qr-generator.models';

describe('ColorCustomizerComponent (Stage 2: Mini QR Palettes & Gradient Themes)', () => {
  let component: ColorCustomizerComponent;
  let fgSignal: WritableSignal<string>;
  let bgSignal: WritableSignal<string>;
  let fgGradSignal: WritableSignal<QrGradientOptions>;
  let bgGradSignal: WritableSignal<QrGradientOptions>;

  beforeEach(() => {
    fgSignal = signal<string>('#000000');
    bgSignal = signal<string>('#FFFFFF');
    fgGradSignal = signal<QrGradientOptions>({ ...DEFAULT_GRADIENT_OPTIONS });
    bgGradSignal = signal<QrGradientOptions>({ ...DEFAULT_GRADIENT_OPTIONS });

    const mockSanitizer = {
      bypassSecurityTrustHtml: (html: string) => html
    };

    const colorValidatorService = new ColorValidatorService();

    const rootInjector = {
      get: (token: any, notFound?: any) => {
        if (token === DomSanitizer) return mockSanitizer;
        if (token === ColorValidatorService) return colorValidatorService;
        return notFound;
      }
    } as any;

    const envInjector = createEnvironmentInjector([], rootInjector);

    runInInjectionContext(envInjector, () => {
      component = new ColorCustomizerComponent();
      (component as any).foregroundColor = fgSignal;
      (component as any).backgroundColor = bgSignal;
      (component as any).foregroundGradient = fgGradSignal;
      (component as any).backgroundGradient = bgGradSignal;
    });
  });

  it('initializes with 12 premium palettes (10 classic and 2 dark premium)', () => {
    expect(component.premiumPalettes.length).toBe(12);
    expect(component.classicPalettes.length).toBe(10);
    expect(component.darkPremiumPalettes.length).toBe(2);

    expect(component.classicPalettes[0].name).toBe('Ivory Ink');
    expect(component.classicPalettes[0].fg).toBe('#111827');
    expect(component.classicPalettes[0].bg).toBe('#FAF8F5');
    expect(component.classicPalettes[0].safeThumbnail).toBeDefined();

    expect(component.darkPremiumPalettes[0].name).toBe('Obsidian Gold');
    expect(component.darkPremiumPalettes[0].fg).toBe('#E7C873');
    expect(component.darkPremiumPalettes[0].bg).toBe('#111214');
  });

  it('correctly tracks isPaletteActive state for solid colors', () => {
    const ivory = component.premiumPalettes.find((p) => p.id === 'ivory-ink')!;
    expect(component.isPaletteActive(ivory)).toBe(false);

    fgSignal.set(ivory.fg);
    bgSignal.set(ivory.bg);

    expect(component.isPaletteActive(ivory)).toBe(true);

    const navy = component.premiumPalettes.find((p) => p.id === 'midnight-navy')!;
    expect(component.isPaletteActive(navy)).toBe(false);
  });

  it('applies premium palette cleanly as solid foreground and solid background', () => {
    const emittedFg: string[] = [];
    const emittedBg: string[] = [];
    const emittedFgGrad: QrGradientOptions[] = [];

    component.foregroundColorChange.subscribe((c) => emittedFg.push(c));
    component.backgroundColorChange.subscribe((c) => emittedBg.push(c));
    component.foregroundGradientChange.subscribe((g) => emittedFgGrad.push(g));

    const forest = component.premiumPalettes.find((p) => p.id === 'forest-emerald')!;
    component.applyPalette(forest);

    expect(emittedFg).toContain(forest.fg);
    expect(emittedBg).toContain(forest.bg);
    expect(emittedFgGrad.length).toBeGreaterThan(0);
    const grad = emittedFgGrad[emittedFgGrad.length - 1];
    expect(grad.enabled).toBe(false);
  });

  it('swaps foreground and background colors correctly', () => {
    fgSignal.set('#123456');
    bgSignal.set('#abcdef');

    let emittedFg = '';
    let emittedBg = '';
    component.foregroundColorChange.subscribe((c) => (emittedFg = c));
    component.backgroundColorChange.subscribe((c) => (emittedBg = c));

    component.swapColors();
    expect(emittedFg).toBe('#abcdef');
    expect(emittedBg).toBe('#123456');
  });
});

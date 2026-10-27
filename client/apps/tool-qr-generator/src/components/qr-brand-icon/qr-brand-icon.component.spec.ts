// @vitest-environment jsdom
// client/apps/tool-qr-generator/src/components/qr-brand-icon/qr-brand-icon.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext, signal, WritableSignal } from '@angular/core';
import { QrBrandIconComponent } from './qr-brand-icon.component';

describe('QrBrandIconComponent', () => {
  let component: QrBrandIconComponent;
  let nameSignal: WritableSignal<string>;

  beforeEach(() => {
    nameSignal = signal('instagram');

    const rootInjector = {
      get: (token: any, notFound?: any) => notFound
    } as any;
    const envInjector = createEnvironmentInjector([], rootInjector);

    runInInjectionContext(envInjector, () => {
      component = new QrBrandIconComponent();
      (component as any).name = nameSignal;
    });
  });

  it('normalizes social platform names', () => {
    nameSignal.set('instagram');
    expect(component.normalizedName()).toBe('instagram');

    nameSignal.set('brand-x');
    expect(component.normalizedName()).toBe('x');

    nameSignal.set('twitter');
    expect(component.normalizedName()).toBe('x');

    nameSignal.set('LinkedIn');
    expect(component.normalizedName()).toBe('linkedin');
  });

  it('normalizes crypto coin abbreviations to canonical brand names', () => {
    nameSignal.set('btc');
    expect(component.normalizedName()).toBe('bitcoin');

    nameSignal.set('eth');
    expect(component.normalizedName()).toBe('ethereum');

    nameSignal.set('sol');
    expect(component.normalizedName()).toBe('solana');

    nameSignal.set('ltc');
    expect(component.normalizedName()).toBe('litecoin');

    nameSignal.set('bch');
    expect(component.normalizedName()).toBe('bitcoincash');
  });

  it('correctly matches isBrandIcon static predicate', () => {
    expect(QrBrandIconComponent.isBrandIcon('instagram')).toBe(true);
    expect(QrBrandIconComponent.isBrandIcon('x')).toBe(true);
    expect(QrBrandIconComponent.isBrandIcon('youtube')).toBe(true);
    expect(QrBrandIconComponent.isBrandIcon('facebook')).toBe(true);
    expect(QrBrandIconComponent.isBrandIcon('tiktok')).toBe(true);
    expect(QrBrandIconComponent.isBrandIcon('whatsapp')).toBe(true);
    expect(QrBrandIconComponent.isBrandIcon('telegram')).toBe(true);
    expect(QrBrandIconComponent.isBrandIcon('bitcoin')).toBe(true);
    expect(QrBrandIconComponent.isBrandIcon('ethereum')).toBe(true);
    expect(QrBrandIconComponent.isBrandIcon('solana')).toBe(true);
    expect(QrBrandIconComponent.isBrandIcon('litecoin')).toBe(true);
    expect(QrBrandIconComponent.isBrandIcon('bitcoincash')).toBe(true);

    expect(QrBrandIconComponent.isBrandIcon('unknown-icon')).toBe(false);
    expect(QrBrandIconComponent.isBrandIcon('')).toBe(false);
    expect(QrBrandIconComponent.isBrandIcon(undefined)).toBe(false);
  });
});

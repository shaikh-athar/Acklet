// @vitest-environment jsdom
// client/apps/tool-qr-generator/src/components/phone-input/phone-input.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext, ElementRef } from '@angular/core';
import { PhoneInputComponent, PhoneInputValue } from './phone-input.component';

describe('PhoneInputComponent', () => {
  let component: PhoneInputComponent;

  beforeEach(() => {
    const rootInjector = {
      get: (token: any, notFound?: any) => {
        if (token === ElementRef) {
          return new ElementRef(document.createElement('div'));
        }
        return notFound;
      }
    } as any;
    const envInjector = createEnvironmentInjector([], rootInjector);
    runInInjectionContext(envInjector, () => {
      component = new PhoneInputComponent();
    });
  });

  it('initializes with a detected or fallback country', () => {
    expect(component.selectedCountry()).toBeDefined();
    expect(component.selectedCountry().dialCode).toMatch(/^\+\d+/);
  });

  it('formats as-you-type correctly for India (+91)', () => {
    component.selectCountry('IN');
    component.onNumberChange('9876543210');
    expect(component.displayNumber()).toBe('98765 43210');
    expect(component.validation().isValid).toBe(true);
    expect(component.validation().e164).toBe('+919876543210');
    expect(component.validation().digitsOnly).toBe('919876543210');
  });

  it('formats as-you-type correctly for US (+1)', () => {
    component.selectCountry('US');
    component.onNumberChange('4155552671');
    expect(component.displayNumber()).toBe('(415) 555-2671');
    expect(component.validation().isValid).toBe(true);
    expect(component.validation().e164).toBe('+14155552671');
  });

  it('validates numbers across multiple international regions (UK, UAE, PK, DE, BR)', () => {
    // UK
    component.selectCountry('GB');
    component.onNumberChange('7911123456');
    expect(component.validation().isValid).toBe(true);
    expect(component.validation().e164).toBe('+447911123456');

    // UAE
    component.selectCountry('AE');
    component.onNumberChange('501234567');
    expect(component.validation().isValid).toBe(true);
    expect(component.validation().e164).toBe('+971501234567');

    // Pakistan
    component.selectCountry('PK');
    component.onNumberChange('3012345678');
    expect(component.validation().isValid).toBe(true);
    expect(component.validation().e164).toBe('+923012345678');

    // Germany
    component.selectCountry('DE');
    component.onNumberChange('15112345678');
    expect(component.validation().isValid).toBe(true);
    expect(component.validation().e164).toBe('+4915112345678');

    // Brazil
    component.selectCountry('BR');
    component.onNumberChange('11987654321');
    expect(component.validation().isValid).toBe(true);
    expect(component.validation().e164).toBe('+5511987654321');
  });

  it('flags invalid or incomplete numbers with a friendly error message', () => {
    component.selectCountry('IN');
    component.onNumberChange('123'); // Too short
    component.onBlur();

    expect(component.validation().isValid).toBe(false);
    expect(component.errorMessage()).toContain("doesn't look like a valid number for India");
    expect(component.hasError()).toBe(true);
  });

  it('auto-switches country when an international number is pasted', () => {
    component.selectCountry('US');

    const fakeClipboard = {
      getData: (type: string) => (type === 'text' ? '+91 98765 43210' : '')
    };
    const fakeEvent = {
      clipboardData: fakeClipboard,
      preventDefault: vi.fn()
    } as unknown as ClipboardEvent;

    component.onPaste(fakeEvent);

    expect(component.selectedCountry().code).toBe('IN');
    expect(component.selectedCountry().dialCode).toBe('+91');
    expect(component.validation().isValid).toBe(true);
    expect(component.validation().e164).toBe('+919876543210');
  });

  it('emits valueChange with e164, digitsOnly, and country details', () => {
    let emitted: PhoneInputValue | undefined;
    component.valueChange.subscribe((val: PhoneInputValue) => {
      emitted = val;
    });

    component.selectCountry('IN');
    component.onNumberChange('9876543210');

    expect(emitted).toBeDefined();
    expect(emitted?.country).toBe('IN');
    expect(emitted?.e164).toBe('+919876543210');
    expect(emitted?.digitsOnly).toBe('919876543210');
    expect(emitted?.isValid).toBe(true);
  });

  it('filters countries dynamically during search by name or dial code', () => {
    component.searchQuery.set('india');
    expect(component.filteredCountries().length).toBe(1);
    expect(component.filteredCountries()[0].code).toBe('IN');

    component.searchQuery.set('+44');
    expect(component.filteredCountries().length).toBe(1);
    expect(component.filteredCountries()[0].code).toBe('GB');
  });
});

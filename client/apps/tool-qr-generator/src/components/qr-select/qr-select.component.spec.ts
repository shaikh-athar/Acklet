// @vitest-environment jsdom
// client/apps/tool-qr-generator/src/components/qr-select/qr-select.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext, signal, WritableSignal } from '@angular/core';
import { QrSelectComponent, QrSelectOption } from './qr-select.component';

describe('QrSelectComponent', () => {
  let component: QrSelectComponent;
  let optionsSignal: WritableSignal<QrSelectOption<string>[]>;
  let valueSignal: WritableSignal<string>;
  let disabledSignal: WritableSignal<boolean>;

  const mockOptions: QrSelectOption<string>[] = [
    { value: 'opt1', label: 'Option 1' },
    { value: 'opt2', label: 'Option 2' },
    { value: 'opt3', label: 'Option 3' }
  ];

  beforeEach(() => {
    optionsSignal = signal(mockOptions);
    valueSignal = signal('opt1');
    disabledSignal = signal(false);

    const rootInjector = {
      get: (token: any, notFound?: any) => notFound
    } as any;
    const envInjector = createEnvironmentInjector([], rootInjector);

    runInInjectionContext(envInjector, () => {
      component = new QrSelectComponent();
      (component as any).options = optionsSignal;
      (component as any).value = valueSignal;
      (component as any).disabled = disabledSignal;
      (component as any).selectedOption = () => {
        const currentVal = valueSignal();
        return optionsSignal().find(opt => opt.value === currentVal) ?? null;
      };
    });
  });

  it('computes the active selected option matching current value', () => {
    expect(component.selectedOption()?.value).toBe('opt1');
    expect(component.selectedOption()?.label).toBe('Option 1');

    valueSignal.set('opt2');
    expect(component.selectedOption()?.value).toBe('opt2');
    expect(component.selectedOption()?.label).toBe('Option 2');
  });

  it('toggles open state and highlights active option on open', () => {
    expect(component.isOpen()).toBe(false);

    component.toggleOpen();
    expect(component.isOpen()).toBe(true);
    expect(component.highlightedIndex()).toBe(0);

    component.toggleOpen();
    expect(component.isOpen()).toBe(false);
  });

  it('emits valueChange and closes on selecting an option', () => {
    let emittedVal = '';
    component.valueChange.subscribe(val => {
      emittedVal = val;
    });

    component.open();
    component.selectOption('opt3');

    expect(emittedVal).toBe('opt3');
    expect(component.isOpen()).toBe(false);
  });

  it('navigates options via keyboard arrows and selects on Enter', () => {
    let emittedVal = '';
    component.valueChange.subscribe(val => {
      emittedVal = val;
    });

    // Arrow down opens menu
    component.onKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(component.isOpen()).toBe(true);
    expect(component.highlightedIndex()).toBe(0);

    // Arrow down advances highlighted index
    component.onKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(component.highlightedIndex()).toBe(1);

    // Enter selects highlighted option
    component.onKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(emittedVal).toBe('opt2');
    expect(component.isOpen()).toBe(false);
  });

  it('closes dropdown on Escape key', () => {
    component.open();
    expect(component.isOpen()).toBe(true);

    component.onKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(component.isOpen()).toBe(false);
  });

  it('does not open when disabled', () => {
    disabledSignal.set(true);
    component.toggleOpen();
    expect(component.isOpen()).toBe(false);
  });

  it('correctly identifies brand icons', () => {
    expect(component.isBrandIcon('instagram')).toBe(true);
    expect(component.isBrandIcon('x')).toBe(true);
    expect(component.isBrandIcon('bitcoin')).toBe(true);
    expect(component.isBrandIcon('ethereum')).toBe(true);
    expect(component.isBrandIcon('chevron-down')).toBe(false);
    expect(component.isBrandIcon(undefined)).toBe(false);
  });
});


// @vitest-environment jsdom
// client/apps/tool-qr-generator/src/components/size-slider/size-slider.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext, signal, WritableSignal } from '@angular/core';
import { SizeSliderComponent } from './size-slider.component';

describe('SizeSliderComponent (Stage 5: Unified Size & Resolution)', () => {
  let component: SizeSliderComponent;
  let sizeSignal: WritableSignal<number>;

  beforeEach(() => {
    sizeSignal = signal<number>(512);

    const rootInjector = {
      get: (token: any, notFound?: any) => notFound
    } as any;
    const envInjector = createEnvironmentInjector([], rootInjector);

    runInInjectionContext(envInjector, () => {
      component = new SizeSliderComponent();
      (component as any).size = sizeSignal;
    });
  });

  describe('Presets Configuration', () => {
    it('provides the 4 standard resolution presets', () => {
      const presets = component.presets;
      expect(presets.length).toBe(4);
      expect(presets[0].size).toBe(256);
      expect(presets[1].size).toBe(512);
      expect(presets[2].size).toBe(1024);
      expect(presets[3].size).toBe(2048);
    });

    it('emits size when preset is selected', () => {
      let emittedSize = 0;
      component.sizeChange.subscribe((s) => {
        emittedSize = s;
      });

      component.selectPreset(component.presets[2]); // Large 1024
      expect(emittedSize).toBe(1024);

      component.selectPreset(component.presets[3]); // Print 2048
      expect(emittedSize).toBe(2048);
    });
  });

  describe('Two-Way Synchronization & Clamping', () => {
    it('clamps slider inputs between 128 and 4096', () => {
      let emittedSize = 0;
      component.sizeChange.subscribe((s) => {
        emittedSize = s;
      });

      const mockEventLow = {
        target: { value: '50' }
      } as unknown as Event;
      component.onSliderInput(mockEventLow);
      expect(emittedSize).toBe(128);

      const mockEventHigh = {
        target: { value: '6000' }
      } as unknown as Event;
      component.onSliderInput(mockEventHigh);
      expect(emittedSize).toBe(4096);

      const mockEventValid = {
        target: { value: '1500' }
      } as unknown as Event;
      component.onSliderInput(mockEventValid);
      expect(emittedSize).toBe(1500);
    });

    it('clamps numeric input on typing and emits valid sizes', () => {
      let emittedSize = 0;
      component.sizeChange.subscribe((s) => {
        emittedSize = s;
      });

      const mockInputLow = {
        target: { value: '64' }
      } as unknown as Event;
      component.onNumberInput(mockInputLow);
      expect(emittedSize).toBe(128);

      const mockInputHigh = {
        target: { value: '5000' }
      } as unknown as Event;
      component.onNumberInput(mockInputHigh);
      expect(emittedSize).toBe(4096);

      const mockInputExact = {
        target: { value: '1024' }
      } as unknown as Event;
      component.onNumberInput(mockInputExact);
      expect(emittedSize).toBe(1024);
    });

    it('resets invalid input on blur to default and clamps', () => {
      let emittedSize = 0;
      component.sizeChange.subscribe((s) => {
        emittedSize = s;
      });

      const inputElement = { value: 'abc' } as HTMLInputElement;
      const mockBlurEvent = { target: inputElement } as unknown as Event;

      component.onNumberBlur(mockBlurEvent);
      expect(inputElement.value).toBe('512');
      expect(emittedSize).toBe(512);
    });
  });
});

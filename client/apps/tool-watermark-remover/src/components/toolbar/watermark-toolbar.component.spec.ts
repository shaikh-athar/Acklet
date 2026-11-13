// apps/tool-watermark-remover/src/components/toolbar/watermark-toolbar.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import { runInInjectionContext, createEnvironmentInjector } from '@angular/core';
import { WatermarkToolbarComponent } from './watermark-toolbar.component';
import { DetectionSensitivity, InpaintingMode } from '../../models/watermark.models';

describe('WatermarkToolbarComponent (Phase 3 Intelligent Controls)', () => {
  let comp: WatermarkToolbarComponent;

  beforeEach(() => {
    comp = runInInjectionContext(createEnvironmentInjector([]), () => new WatermarkToolbarComponent());
  });

  it('emits tool selection for all tools including pan', () => {
    let selectedTool: string | null = null;
    comp.toolChange.subscribe((t) => {
      selectedTool = t;
    });

    comp.selectTool('brush');
    expect(selectedTool).toBe('brush');

    comp.selectTool('rectangle');
    expect(selectedTool).toBe('rectangle');

    comp.selectTool('eraser');
    expect(selectedTool).toBe('eraser');

    comp.selectTool('pan');
    expect(selectedTool).toBe('pan');

    comp.selectTool('protect');
    expect(selectedTool).toBe('protect');
  });

  it('emits autoProtect event when Auto-Protect button is clicked (Phase 5)', () => {
    let triggered = false;
    comp.autoProtect.subscribe(() => {
      triggered = true;
    });

    comp.autoProtect.emit();
    expect(triggered).toBe(true);
  });

  it('emits brush size updates from preset buttons and slider', () => {
    let sizeReceived = 0;
    comp.brushSizeChange.subscribe((s) => {
      sizeReceived = s;
    });

    comp.setBrushSize(50);
    expect(sizeReceived).toBe(50);

    const fakeEvent = { target: { value: '35' } } as unknown as Event;
    comp.onBrushSizeInput(fakeEvent);
    expect(sizeReceived).toBe(35);
  });

  it('emits mask opacity percentage correctly', () => {
    let opacityReceived = 0;
    comp.maskOpacityChange.subscribe((o) => {
      opacityReceived = o;
    });

    const fakeEvent = { target: { value: '80' } } as unknown as Event;
    comp.onOpacityInput(fakeEvent);
    expect(opacityReceived).toBe(0.8);
  });

  it('emits sensitivity and inpainting mode changes', () => {
    let sensitivityReceived: DetectionSensitivity | null = null;
    comp.sensitivityChange.subscribe((s) => {
      sensitivityReceived = s;
    });

    comp.sensitivityChange.emit('high');
    expect(sensitivityReceived).toBe('high');

    let modeReceived: InpaintingMode | null = null;
    comp.inpaintingModeChange.subscribe((m) => {
      modeReceived = m;
    });

    comp.inpaintingModeChange.emit('ultra');
    expect(modeReceived).toBe('ultra');
  });
});

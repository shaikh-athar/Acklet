// apps/tool-watermark-remover/src/components/comparison-slider/comparison-slider.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import { runInInjectionContext, createEnvironmentInjector } from '@angular/core';
import { ComparisonSliderComponent } from './comparison-slider.component';
import { CoordinateGeometryService } from '../../services/coordinate-geometry.service';

describe('ComparisonSliderComponent (Phase 5 Heatmap & Inspection)', () => {
  let comp: ComparisonSliderComponent;

  beforeEach(() => {
    const injector = createEnvironmentInjector([CoordinateGeometryService, ComparisonSliderComponent]);
    comp = runInInjectionContext(injector, () => new ComparisonSliderComponent());
  });

  it('initializes in slider mode at 50% split position', () => {
    expect(comp.viewMode()).toBe('slider');
    expect(comp.sliderPercent()).toBe(50);
    expect(comp.isFullscreen()).toBe(false);
  });

  it('switches between slider, side-by-side, and heatmap modes', () => {
    comp.setViewMode('side-by-side');
    expect(comp.viewMode()).toBe('side-by-side');

    comp.setViewMode('heatmap');
    expect(comp.viewMode()).toBe('heatmap');

    comp.setViewMode('slider');
    expect(comp.viewMode()).toBe('slider');
  });

  it('adjusts zoom level properly', () => {
    comp.compZoom.set(1.0);
    comp.zoomIn();
    expect(comp.compZoom()).toBe(1.25);

    comp.zoomOut();
    expect(comp.compZoom()).toBe(1.0);
  });
});


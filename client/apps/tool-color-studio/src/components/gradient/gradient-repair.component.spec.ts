// @vitest-environment jsdom
// apps/tool-color-studio/src/components/gradient/gradient-repair.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { GradientRepairComponent } from './gradient-repair.component';
import { GradientAnalysisService } from '../../services/gradient-analysis.service';
import { GradientRepairService } from '../../services/gradient-repair.service';
import { GradientService } from '../../services/gradient.service';
import { ColorEngineService } from '../../services/color-engine.service';
import { ColorBlindnessService } from '../../services/color-blindness.service';
import { GradientConfig } from '../../models/color.models';

describe('GradientRepairComponent', () => {
  let component: GradientRepairComponent;
  let analysisService: GradientAnalysisService;
  let repairService: GradientRepairService;
  let gradientService: GradientService;
  let engine: ColorEngineService;
  let blindness: ColorBlindnessService;

  const mockConfig: GradientConfig = {
    type: 'linear',
    angle: 135,
    stops: [
      { id: '1', color: '#E11D48', position: 100 },
      { id: '2', color: '#8B5CF6', position: 30 },
      { id: '3', color: '#3B82F6', position: 10 }
    ]
  };

  beforeEach(() => {
    engine = new ColorEngineService();
    blindness = new ColorBlindnessService();
    gradientService = new GradientService();

    const rootInjector = {
      get: (token: any, notFound?: any) => {
        if (token === ColorEngineService) return engine;
        if (token === ColorBlindnessService) return blindness;
        if (token === GradientService) return gradientService;
        if (token === GradientAnalysisService) return analysisService;
        if (token === GradientRepairService) return repairService;
        return notFound;
      }
    } as any;

    const envInjector = createEnvironmentInjector([], rootInjector);
    runInInjectionContext(envInjector, () => {
      analysisService = new GradientAnalysisService();
      repairService = new GradientRepairService();
      component = new GradientRepairComponent();
    });

    component.isOpen = true;
    component.originalConfig = mockConfig;
    component.ngOnChanges({
      originalConfig: {
        currentValue: mockConfig,
        previousValue: undefined,
        firstChange: true,
        isFirstChange: () => true
      }
    });
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with balanced strategy and run analysis/repair', () => {
    expect(component.selectedStrategy()).toBe('balanced');
    const repairRes = component.repairResult();
    expect(repairRes).toBeDefined();
    expect(repairRes?.repairedConfig.stops.length).toBe(3);
    // Ascending positions enforced
    expect(repairRes?.repairedConfig.stops[0].position).toBe(0);
    expect(repairRes?.repairedConfig.stops[2].position).toBe(100);
  });

  it('should switch repair strategy and recalculate', () => {
    component.setStrategy('smooth');
    expect(component.selectedStrategy()).toBe('smooth');
    expect(component.repairResult()?.strategy).toBe('smooth');

    component.setStrategy('contrast');
    expect(component.selectedStrategy()).toBe('contrast');
    expect(component.repairResult()?.strategy).toBe('contrast');
  });

  it('should support custom repair options toggle', () => {
    component.setStrategy('custom');
    expect(component.customOptions.gradientAngle).toBe(false);
    component.toggleCustomOption('gradientAngle');
    expect(component.customOptions.gradientAngle).toBe(true);
  });

  it('should toggle changes accordion expansion', () => {
    expect(component.isAccordionOpen()).toBe(false);
    component.toggleAccordion();
    expect(component.isAccordionOpen()).toBe(true);
  });

  it('should emit applied event with repaired gradient config when applyRepair is called', () => {
    vi.useFakeTimers();
    const appliedSpy = vi.fn();
    component.applied.subscribe(appliedSpy);

    component.applyRepair();
    vi.advanceTimersByTime(200);
    expect(appliedSpy).toHaveBeenCalledTimes(1);
    const emittedConfig = appliedSpy.mock.calls[0][0];
    expect(emittedConfig.stops[0].position).toBe(0);
    vi.useRealTimers();
  });

  it('should emit close event when cancel/close is called', () => {
    vi.useFakeTimers();
    const closeSpy = vi.fn();
    component.close.subscribe(closeSpy);

    component.closeModal();
    vi.advanceTimersByTime(200);
    expect(closeSpy).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('should reset repair back to original config', () => {
    component.setStrategy('harmony');
    component.resetRepair();
    expect(component.selectedStrategy()).toBe('balanced');
  });
});

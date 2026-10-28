// apps/tool-datalens/src/app/app.component.spec.ts
import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { AppComponent } from './app.component';
import { TOOL_REGISTRY } from '@acklet/tool-registry';

describe('ToolDataLens AppComponent', () => {
  it('loads the datalens manifest from registry', () => {
    const comp = new AppComponent();
    expect(comp.manifest).toBeDefined();
    expect(comp.manifest.id).toBe('datalens');
    expect(comp.manifest.slug).toBe('datalens');
    expect(comp.manifest.name).toBe('DataLens');
  });

  it('uses fullBleed layout configuration', () => {
    const comp = new AppComponent();
    expect(comp.shellConfig.layout).toBe('fullBleed');
    expect(comp.shellConfig.showDescriptionCard).toBe(false);
  });

  it('initializes with format active tab', () => {
    const comp = new AppComponent();
    expect(comp.activeTab()).toBe('format');
  });

  it('updates tab when onTabChange is triggered', () => {
    const comp = new AppComponent();
    comp.onTabChange('diff');
    expect(comp.activeTab()).toBe('diff');
  });
});

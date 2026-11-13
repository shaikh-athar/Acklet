// apps/tool-color-studio/src/app/app.component.spec.ts
import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { AppComponent } from './app.component';

describe('AppComponent (Color Studio)', () => {
  it('should instantiate and load the Color Studio manifest', () => {
    const comp = new AppComponent();
    expect(comp).toBeTruthy();
    expect(comp.manifest).toBeDefined();
    expect(comp.manifest.id).toBe('colorstudio');
    expect(comp.manifest.name).toBe('Color Studio');
    expect(comp.manifest.accent).toBe('blue');
  });

  it('should initialize with default active tab as "picker"', () => {
    const comp = new AppComponent();
    expect(comp.activeTab()).toBe('picker');
  });

  it('should update activeTab when onTabChange is triggered', () => {
    const comp = new AppComponent();
    comp.onTabChange('contrast');
    expect(comp.activeTab()).toBe('contrast');
  });
});

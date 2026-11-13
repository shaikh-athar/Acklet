// apps/tool-device-studio/src/app/app.component.spec.ts
import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { AppComponent } from './app.component';

describe('AppComponent (Device Studio)', () => {
  it('should instantiate and load the Device Studio manifest', () => {
    const comp = new AppComponent();
    expect(comp).toBeTruthy();
    expect(comp.manifest).toBeDefined();
    expect(comp.manifest.id).toBe('devicestudio');
    expect(comp.manifest.name).toBe('Device Studio');
    expect(comp.manifest.accent).toBe('blue');
    expect(comp.manifest.accentHue).toBe(217);
  });

  it('should initialize with default active tab as "landing"', () => {
    const comp = new AppComponent();
    expect(comp.activeTab()).toBe('landing');
  });

  it('should update activeTab when onTabChange is triggered', () => {
    const comp = new AppComponent();
    comp.onTabChange('webcam');
    expect(comp.activeTab()).toBe('webcam');
    expect(comp.currentSubTool()).toBe('Webcam Test');

    comp.onTabChange('microphone');
    expect(comp.activeTab()).toBe('microphone');
    expect(comp.currentSubTool()).toBe('Microphone Test');

    comp.onTabChange('speaker');
    expect(comp.activeTab()).toBe('speaker');
    expect(comp.currentSubTool()).toBe('Speaker & Audio');

    comp.onTabChange('speed');
    expect(comp.activeTab()).toBe('speed');
    expect(comp.currentSubTool()).toBe('Internet Speed');

    comp.onTabChange('ip');
    expect(comp.activeTab()).toBe('ip');
    expect(comp.currentSubTool()).toBe('Public IP Lookup');

    comp.onTabChange('screen');
    expect(comp.activeTab()).toBe('screen');
    expect(comp.currentSubTool()).toBe('Screen Sharing');
  });
});


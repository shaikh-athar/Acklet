// apps/tool-device-studio/src/services/device-studio-state.service.spec.ts
import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { DeviceStudioStateService, routeToModule, moduleToRoute } from './device-studio-state.service';

describe('DeviceStudioStateService', () => {
  it('should resolve URLs to correct modules with routeToModule', () => {
    expect(routeToModule('/devicestudio')).toBe('landing');
    expect(routeToModule('/device-studio')).toBe('landing');
    expect(routeToModule('/devicestudio/webcam')).toBe('webcam');
    expect(routeToModule('/devicestudio/camera')).toBe('webcam');
    expect(routeToModule('/devicestudio/microphone')).toBe('microphone');
    expect(routeToModule('/devicestudio/mic-test')).toBe('microphone');
    expect(routeToModule('/devicestudio/speaker')).toBe('speaker');
    expect(routeToModule('/devicestudio/audio-test')).toBe('speaker');
    expect(routeToModule('/devicestudio/speed')).toBe('speed');
    expect(routeToModule('/devicestudio/speed-test')).toBe('speed');
    expect(routeToModule('/devicestudio/ip')).toBe('ip');
    expect(routeToModule('/devicestudio/ip-lookup')).toBe('ip');
    expect(routeToModule('/devicestudio/screen')).toBe('screen');
    expect(routeToModule('/devicestudio/screenshare-test')).toBe('screen');
  });

  it('should map modules to route paths with moduleToRoute', () => {
    expect(moduleToRoute('landing')).toBe('');
    expect(moduleToRoute('webcam')).toBe('webcam');
    expect(moduleToRoute('microphone')).toBe('microphone');
    expect(moduleToRoute('speaker')).toBe('speaker');
    expect(moduleToRoute('speed')).toBe('speed');
    expect(moduleToRoute('ip')).toBe('ip');
    expect(moduleToRoute('screen')).toBe('screen');
  });

  it('should calculate dynamic Device Health Score as modules are marked tested', () => {
    const service = new DeviceStudioStateService();
    expect(service.deviceHealthScore()).toBe(20); // base score

    service.markModuleTested('webcam');
    expect(service.deviceHealthScore()).toBe(35);

    service.markModuleTested('microphone');
    expect(service.deviceHealthScore()).toBe(50);

    service.markModuleTested('speaker');
    expect(service.deviceHealthScore()).toBe(65);

    service.markModuleTested('speed');
    expect(service.deviceHealthScore()).toBe(80);

    service.markModuleTested('ip');
    expect(service.deviceHealthScore()).toBe(90);

    service.markModuleTested('screen');
    expect(service.deviceHealthScore()).toBe(100);
  });

  it('should manage toast notifications and auto-dismiss', () => {
    const service = new DeviceStudioStateService();
    expect(service.toastMessage()).toBeNull();

    service.showToast('Test notification');
    expect(service.toastMessage()).toBe('Test notification');
  });
});


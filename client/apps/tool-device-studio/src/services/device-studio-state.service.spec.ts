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

  it('should calculate dynamic Device Health Score from component states', () => {
    const service = new DeviceStudioStateService();
    expect(service.deviceHealthScore()).toBe(100);
    expect(service.overallStatus()).toBe('All clear');

    // 1 pass
    service.meetingReadiness.set({
      ...service.meetingReadiness(),
      camera: 'pass'
    });
    expect(service.deviceHealthScore()).toBe(100);
    expect(service.overallStatus()).toBe('All clear');

    // 1 pass, 1 warn -> 75
    service.meetingReadiness.set({
      ...service.meetingReadiness(),
      camera: 'pass',
      mic: 'warn'
    });
    expect(service.deviceHealthScore()).toBe(75);
    expect(service.overallStatus()).toBe('Some issues');

    // 1 fail -> 'Needs attention'
    service.meetingReadiness.set({
      ...service.meetingReadiness(),
      camera: 'pass',
      mic: 'warn',
      network: 'fail'
    });
    expect(service.deviceHealthScore()).toBe(50);
    expect(service.overallStatus()).toBe('Needs attention');

    // 4 pass and 1 warn -> 90, never 100 when warn or fail exists
    service.meetingReadiness.set({
      ...service.meetingReadiness(),
      camera: 'pass',
      mic: 'pass',
      speaker: 'pass',
      network: 'pass',
      screenShare: 'warn'
    });
    expect(service.deviceHealthScore()).toBe(90);
    expect(service.deviceHealthScore()).toBeLessThan(100);
    expect(service.overallStatus()).toBe('Some issues');
  });

  it('should manage toast notifications and auto-dismiss', () => {
    const service = new DeviceStudioStateService();
    expect(service.toastMessage()).toBeNull();

    service.showToast('Test notification');
    expect(service.toastMessage()).toBe('Test notification');
  });
});


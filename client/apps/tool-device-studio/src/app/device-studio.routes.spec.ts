// apps/tool-device-studio/src/app/device-studio.routes.spec.ts
import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { deviceStudioRoutes, DEVICE_STUDIO_MODULE_ROUTES } from './device-studio.routes';

describe('Device Studio Routes', () => {
  it('should define all 6 required modules in DEVICE_STUDIO_MODULE_ROUTES', () => {
    const paths = DEVICE_STUDIO_MODULE_ROUTES.map(r => r.path);
    expect(paths).toContain('webcam');
    expect(paths).toContain('microphone');
    expect(paths).toContain('speaker');
    expect(paths).toContain('speed');
    expect(paths).toContain('ip');
    expect(paths).toContain('screen');
  });

  it('should define shorthand aliases for modules', () => {
    const shorthandAliases = [
      { path: 'webcam-test', redirectTo: 'webcam' },
      { path: 'camera', redirectTo: 'webcam' },
      { path: 'mic-test', redirectTo: 'microphone' },
      { path: 'microphone-test', redirectTo: 'microphone' },
      { path: 'speaker-test', redirectTo: 'speaker' },
      { path: 'audio-test', redirectTo: 'speaker' },
      { path: 'speed-test', redirectTo: 'speed' },
      { path: 'ip-checker', redirectTo: 'ip' },
      { path: 'ip-lookup', redirectTo: 'ip' },
      { path: 'screen-test', redirectTo: 'screen' },
      { path: 'screenshare-test', redirectTo: 'screen' }
    ];

    for (const alias of shorthandAliases) {
      const match = DEVICE_STUDIO_MODULE_ROUTES.find(r => r.path === alias.path);
      expect(match).toBeDefined();
      expect(match?.redirectTo).toBe(alias.redirectTo);
      expect(match?.pathMatch).toBe('full');
    }
  });

  it('should configure lazy loading and titles for all 6 modules', () => {
    const expectedModules = [
      { path: 'webcam', title: 'Webcam Test — Acklet Device Studio' },
      { path: 'microphone', title: 'Microphone Test — Acklet Device Studio' },
      { path: 'speaker', title: 'Speaker & Headphone Test — Acklet Device Studio' },
      { path: 'speed', title: 'Internet Speed Test — Acklet Device Studio' },
      { path: 'ip', title: 'Public IP Checker — Acklet Device Studio' },
      { path: 'screen', title: 'Screen Sharing Test — Acklet Device Studio' }
    ];

    for (const expected of expectedModules) {
      const route = DEVICE_STUDIO_MODULE_ROUTES.find(r => r.path === expected.path);
      expect(route).toBeDefined();
      expect(typeof route?.loadComponent).toBe('function');
      expect(route?.title).toBe(expected.title);
    }
  });

  it('should include root route loading DeviceStudioLandingComponent', () => {
    const rootRoute = deviceStudioRoutes.find(r => r.path === '');
    expect(rootRoute).toBeDefined();
    expect(typeof rootRoute?.loadComponent).toBe('function');
    expect(rootRoute?.title).toBe('Acklet Device Studio — Hardware & Network Diagnostics');
  });
});


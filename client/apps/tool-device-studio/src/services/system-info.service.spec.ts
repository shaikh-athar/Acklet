// apps/tool-device-studio/src/services/system-info.service.spec.ts
import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { SystemInfoService } from './system-info.service';

describe('SystemInfoService', () => {
  it('should detect browser and OS capabilities gracefully', () => {
    const service = new SystemInfoService();
    const caps = service.getCapabilities();

    expect(caps).toBeDefined();
    expect(caps.browserName).toBeDefined();
    expect(caps.osName).toBeDefined();
    expect(caps.screenResolution).toBeDefined();
    expect(typeof caps.isOnline).toBe('boolean');
  });
});


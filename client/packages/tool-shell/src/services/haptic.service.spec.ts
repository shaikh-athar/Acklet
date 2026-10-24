// @vitest-environment jsdom
// client/packages/tool-shell/src/services/haptic.service.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HapticService } from './haptic.service';

describe('HapticService', () => {
  let service: HapticService;

  beforeEach(() => {
    service = new HapticService();
  });

  it('triggers vibration when navigator.vibrate is supported', () => {
    const vibrateSpy = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateSpy,
      configurable: true,
      writable: true
    });

    const result = service.trigger('light');
    expect(result).toBe(true);
    expect(vibrateSpy).toHaveBeenCalledWith(12);

    service.trigger('medium');
    expect(vibrateSpy).toHaveBeenCalledWith(25);

    service.trigger('success');
    expect(vibrateSpy).toHaveBeenCalledWith([15, 40, 20]);
  });

  it('safely handles missing navigator.vibrate without throwing', () => {
    Object.defineProperty(navigator, 'vibrate', {
      value: undefined,
      configurable: true,
      writable: true
    });

    expect(() => service.trigger('light')).not.toThrow();
    expect(service.trigger('light')).toBe(false);
  });
});

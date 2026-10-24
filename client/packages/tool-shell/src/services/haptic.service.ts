// client/packages/tool-shell/src/services/haptic.service.ts
import { Injectable } from '@angular/core';

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

@Injectable({
  providedIn: 'root'
})
export class HapticService {
  /**
   * Safely triggers device vibration/haptic feedback if supported by browser/hardware.
   */
  trigger(pattern: HapticPattern = 'light'): boolean {
    if (typeof navigator === 'undefined' || !('vibrate' in navigator)) {
      return false;
    }

    try {
      switch (pattern) {
        case 'selection':
        case 'light':
          return navigator.vibrate(12);
        case 'medium':
          return navigator.vibrate(25);
        case 'heavy':
          return navigator.vibrate(45);
        case 'success':
          return navigator.vibrate([15, 40, 20]);
        case 'warning':
          return navigator.vibrate([30, 50, 30]);
        case 'error':
          return navigator.vibrate([40, 60, 40, 60, 40]);
        default:
          return navigator.vibrate(15);
      }
    } catch {
      return false;
    }
  }
}

import { Injectable, inject, effect } from '@angular/core';
import { PreferenceService } from './preference.service';

export type Theme = 'dark' | 'light';

/**
 * Thin adapter over PreferenceService for backward compatibility.
 * All existing call sites (toggle(), setTheme(), isDark) continue to work.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly prefsSvc = inject(PreferenceService);

  readonly theme = this.prefsSvc.theme;

  toggle(): void {
    this.prefsSvc.toggleTheme();
  }

  setTheme(t: Theme): void {
    this.prefsSvc.setTheme(t);
  }

  get isDark(): boolean {
    return this.prefsSvc.theme() === 'dark';
  }
}

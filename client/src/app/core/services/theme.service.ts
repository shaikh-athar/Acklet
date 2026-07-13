// src/app/core/services/theme.service.ts

import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>('light');

  constructor() {
    document.documentElement.setAttribute('data-theme', 'light');
  }

  toggle(): void {
    // Disabled for light mode only
  }

  setTheme(t: Theme): void {
    // Disabled for light mode only
  }

  get isDark(): boolean {
    return false;
  }
}

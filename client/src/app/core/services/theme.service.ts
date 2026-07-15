import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>('dark');

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('acklet-theme') as Theme;
      if (stored === 'light' || stored === 'dark') {
        this.theme.set(stored);
      }
    }

    effect(() => {
      const activeTheme = this.theme();
      if (typeof window !== 'undefined') {
        document.documentElement.setAttribute('data-theme', activeTheme);
      }
    });
  }

  toggle(): void {
    const next = this.theme() === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  setTheme(t: Theme): void {
    this.theme.set(t);
    if (typeof window !== 'undefined') {
      localStorage.setItem('acklet-theme', t);
    }
  }

  get isDark(): boolean {
    return this.theme() === 'dark';
  }
}

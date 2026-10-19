// packages/tool-shell/src/services/tool-theme.service.ts
import { Injectable, signal, effect } from '@angular/core';

export type ThemeMode = 'dark' | 'light' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ToolThemeService {
  private readonly THEME_KEY = 'acklet_ts_theme';
  readonly currentTheme = signal<ThemeMode>('dark');
  readonly effectiveTheme = signal<'dark' | 'light'>('dark');

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = (localStorage.getItem(this.THEME_KEY) as ThemeMode) || 'dark';
      this.currentTheme.set(saved);
      this.resolveEffectiveTheme();

      // Listen for system preference changes
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (this.currentTheme() === 'system') {
          this.resolveEffectiveTheme();
        }
      });
    }

    effect(() => {
      const eff = this.effectiveTheme();
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', eff);
      }
    });
  }

  setTheme(theme: ThemeMode): void {
    this.currentTheme.set(theme);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.THEME_KEY, theme);
      } catch (_) {}
    }
    this.resolveEffectiveTheme();
  }

  toggleTheme(): void {
    const next: ThemeMode = this.effectiveTheme() === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  private resolveEffectiveTheme(): void {
    const mode = this.currentTheme();
    if (mode === 'system') {
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
        this.effectiveTheme.set('light');
      } else {
        this.effectiveTheme.set('dark');
      }
    } else {
      this.effectiveTheme.set(mode);
    }
  }
}

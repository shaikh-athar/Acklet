// packages/tool-shell/src/services/tool-theme.service.ts
import { Injectable, signal, effect } from '@angular/core';

export type ThemeMode = 'dark' | 'light' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ToolThemeService {
  private readonly THEME_KEY = 'acklet_ts_theme';
  private readonly TRANSPARENCY_KEY = 'acklet_reduce_transparency';
  private readonly MOTION_KEY = 'acklet_reduce_motion';

  readonly currentTheme = signal<ThemeMode>('dark');
  readonly effectiveTheme = signal<'dark' | 'light'>('dark');
  readonly reduceTransparency = signal<boolean>(false);
  readonly reduceMotion = signal<boolean>(false);

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = (localStorage.getItem(this.THEME_KEY) as ThemeMode) || 'dark';
      this.currentTheme.set(saved);
      this.resolveEffectiveTheme();

      const savedTransparency = localStorage.getItem(this.TRANSPARENCY_KEY) === 'true';
      this.reduceTransparency.set(savedTransparency);

      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const savedMotion = localStorage.getItem(this.MOTION_KEY);
      this.reduceMotion.set(savedMotion !== null ? savedMotion === 'true' : prefersReducedMotion);

      // Listen for system preference changes
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (this.currentTheme() === 'system') {
          this.resolveEffectiveTheme();
        }
      });

      window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
        if (localStorage.getItem(this.MOTION_KEY) === null) {
          this.reduceMotion.set(e.matches);
        }
      });
    }

    effect(() => {
      const eff = this.effectiveTheme();
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', eff);
      }
    });

    effect(() => {
      const redTrans = this.reduceTransparency();
      if (typeof document !== 'undefined') {
        if (redTrans) {
          document.documentElement.setAttribute('data-reduce-transparency', 'true');
        } else {
          document.documentElement.removeAttribute('data-reduce-transparency');
        }
      }
    });

    effect(() => {
      const redMotion = this.reduceMotion();
      if (typeof document !== 'undefined') {
        if (redMotion) {
          document.documentElement.setAttribute('data-reduce-motion', 'true');
        } else {
          document.documentElement.removeAttribute('data-reduce-motion');
        }
      }
    });
  }

  setTheme(theme: ThemeMode): void {
    this.currentTheme.set(theme);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.THEME_KEY, theme);
      } catch (_) { }
    }
    this.resolveEffectiveTheme();
  }

  toggleTheme(): void {
    const next: ThemeMode = this.effectiveTheme() === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  setReduceTransparency(val: boolean): void {
    this.reduceTransparency.set(val);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.TRANSPARENCY_KEY, String(val));
      } catch (_) {}
    }
  }

  toggleReduceTransparency(): void {
    this.setReduceTransparency(!this.reduceTransparency());
  }

  setReduceMotion(val: boolean): void {
    this.reduceMotion.set(val);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.MOTION_KEY, String(val));
      } catch (_) {}
    }
  }

  toggleReduceMotion(): void {
    this.setReduceMotion(!this.reduceMotion());
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

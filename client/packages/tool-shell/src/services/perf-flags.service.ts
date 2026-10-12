// packages/tool-shell/src/services/perf-flags.service.ts
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * PerfFlagsService
 *
 * Reads `?perf=noblur,nobg,noshadow,noanim,noicons` query parameter from the URL
 * and toggles corresponding helper classes on document.body for instant runtime A/B testing
 * of GPU/CPU rendering bottlenecks without requiring code changes or rebuilds.
 */
@Injectable({
  providedIn: 'root'
})
export class PerfFlagsService {
  private readonly platformId = inject(PLATFORM_ID);

  constructor() {
    this.init();
  }

  init(): void {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    this.applyFlags();

    window.addEventListener('popstate', () => this.applyFlags());
  }

  applyFlags(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const perfQuery = params.get('perf');

    const knownFlags = ['noblur', 'nobg', 'noshadow', 'noanim', 'noicons'];

    // Reset previous flags
    knownFlags.forEach(flag => {
      document.body.classList.remove(`perf-${flag}`);
    });

    if (!perfQuery) return;

    const flags = perfQuery.split(',').map(s => s.trim().toLowerCase());
    flags.forEach(flag => {
      if (knownFlags.includes(flag)) {
        document.body.classList.add(`perf-${flag}`);
      }
    });
  }
}

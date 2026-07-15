import { InjectionToken } from '@angular/core';

export interface ViewportConfig {
  thresholds: number[];
  rootMargin: string;
}

export const DEFAULT_VIEWPORT_CONFIG: ViewportConfig = {
  thresholds: [0, 0.15, 0.3, 0.6],
  rootMargin: '0px'
};

export const VIEWPORT_CONFIG = new InjectionToken<ViewportConfig>('ViewportConfig', {
  providedIn: 'root',
  factory: () => DEFAULT_VIEWPORT_CONFIG
});

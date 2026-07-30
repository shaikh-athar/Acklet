import { Injectable, signal } from '@angular/core';
import { FeatureFlags, DEFAULT_FEATURE_FLAGS } from '../config/features.config';

@Injectable({ providedIn: 'root' })
export class FeatureService {
  private readonly _features = signal<FeatureFlags>(DEFAULT_FEATURE_FLAGS);
  readonly features = this._features.asReadonly();

  isEnabled(feature: keyof FeatureFlags): boolean {
    return !!this._features()[feature];
  }

  setFeature(feature: keyof FeatureFlags, enabled: boolean): void {
    this._features.update(flags => ({ ...flags, [feature]: enabled }));
  }

  updateFlags(override: Partial<FeatureFlags>): void {
    this._features.update(flags => ({ ...flags, ...override }));
  }
}

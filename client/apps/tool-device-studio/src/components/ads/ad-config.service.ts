// apps/tool-device-studio/src/components/ads/ad-config.service.ts
import { Injectable, signal, computed } from '@angular/core';

export type AdSlotPlacement = 'top-banner' | 'bottom-banner' | 'side-rail-left' | 'side-rail-right';

export interface AdSlotConfig {
  placement: AdSlotPlacement;
  enabled: boolean;
  minWidthDesktop: number;
  minHeightDesktop: number;
  minWidthMobile: number;
  minHeightMobile: number;
  label: string;
}

export interface AdStudioConfig {
  /** Master switch for ads across Device Studio */
  enabled: boolean;
  /** Whether to show a subtle placeholder container during layout testing */
  showPlaceholders: boolean;
  slots: Record<AdSlotPlacement, AdSlotConfig>;
}

const DEFAULT_AD_CONFIG: AdStudioConfig = {
  enabled: false, // Default disabled until ads are configured
  showPlaceholders: false, // Set to true only when auditing ad layout reserves
  slots: {
    'top-banner': {
      placement: 'top-banner',
      enabled: true,
      minWidthDesktop: 970,
      minHeightDesktop: 90,
      minWidthMobile: 320,
      minHeightMobile: 100,
      label: 'Top Leaderboard (970×90 Desktop / 320×100 Mobile)'
    },
    'bottom-banner': {
      placement: 'bottom-banner',
      enabled: true,
      minWidthDesktop: 728,
      minHeightDesktop: 90,
      minWidthMobile: 320,
      minHeightMobile: 50,
      label: 'Bottom Banner (728×90 Desktop / 320×50 Mobile)'
    },
    'side-rail-left': {
      placement: 'side-rail-left',
      enabled: false,
      minWidthDesktop: 160,
      minHeightDesktop: 600,
      minWidthMobile: 0,
      minHeightMobile: 0,
      label: 'Left Gutter Skyscraper (160×600)'
    },
    'side-rail-right': {
      placement: 'side-rail-right',
      enabled: false,
      minWidthDesktop: 160,
      minHeightDesktop: 600,
      minWidthMobile: 0,
      minHeightMobile: 0,
      label: 'Right Gutter Skyscraper (160×600)'
    }
  }
};

@Injectable({
  providedIn: 'root'
})
export class AdConfigService {
  private readonly configSignal = signal<AdStudioConfig>(DEFAULT_AD_CONFIG);

  public readonly config = this.configSignal.asReadonly();
  public readonly isMasterEnabled = computed(() => this.configSignal().enabled);
  public readonly showPlaceholders = computed(() => this.configSignal().showPlaceholders);
  public readonly enableAds = computed(() => this.configSignal().enabled || this.configSignal().showPlaceholders);

  public isSlotActive(placement: AdSlotPlacement): boolean {
    const cfg = this.configSignal();
    return (cfg.enabled || cfg.showPlaceholders) && cfg.slots[placement]?.enabled === true;
  }

  public getSlotConfig(placement: AdSlotPlacement): AdSlotConfig | undefined {
    return this.configSignal().slots[placement];
  }

  public setMasterEnabled(enabled: boolean): void {
    this.configSignal.update(c => ({ ...c, enabled }));
  }

  public setShowPlaceholders(showPlaceholders: boolean): void {
    this.configSignal.update(c => ({ ...c, showPlaceholders }));
  }
}


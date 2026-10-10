// packages/tool-shell/src/services/tool-ad.service.ts
import { Injectable, signal } from '@angular/core';

export interface AdConfig {
  enabled: boolean;
  provider: 'adsense' | 'custom' | 'none';
  client?: string;
  slots: Record<string, string>; // e.g. { 'sidebar-left': '123456789', 'bottom': '987654321', 'in-content': '1122334455' }
}

@Injectable({
  providedIn: 'root'
})
export class ToolAdService {
  readonly config = signal<AdConfig>({
    enabled: false,
    provider: 'none',
    slots: {}
  });

  setConfig(newConfig: Partial<AdConfig>): void {
    this.config.update(current => ({ ...current, ...newConfig }));
  }

  isAdEnabled(): boolean {
    return this.config().enabled && this.config().provider !== 'none';
  }

  getSlotId(placement: string): string | undefined {
    return this.config().slots[placement];
  }
}

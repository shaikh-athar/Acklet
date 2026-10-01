import { Injectable, signal } from '@angular/core';

export const BURN_AFTER_READ_TTL = -1; // Sentinel value representing Burn After Read (instant purge on first view)

export interface AirVaultPreferences {
  autoCaptureOnFocus: boolean;
  instantBeamOnPaste: boolean;
  defaultSyncTarget: string; // 'broadcast' or deviceId
  autoMaskSensitive: boolean;
  toastNotifications: boolean;
  soundFx: boolean;
  retentionTtlMs: number;
  collapseDelayMs: number;

  // Auto-Copy & Notification Preferences
  autoCopyIncoming: boolean; // Opt-in per device (default false)
  pushNotificationsEnabled: boolean; // Web push / OS notifications
  notificationSoundEnabled: boolean; // Notification chime

  // Cross-device text synchronization
  syncTextDeletions: boolean; // When enabled (default true), deletions by text authors propagate to all connected devices
}

const DEFAULT_PREFS: AirVaultPreferences = {
  autoCaptureOnFocus: false,
  instantBeamOnPaste: false,
  defaultSyncTarget: 'broadcast',
  autoMaskSensitive: true,
  toastNotifications: true,
  soundFx: false,
  retentionTtlMs: 7 * 24 * 60 * 60 * 1000,
  collapseDelayMs: 1000,

  autoCopyIncoming: false, // Default opt-in
  pushNotificationsEnabled: false,
  notificationSoundEnabled: true,
  syncTextDeletions: true
};

const STORAGE_KEY = 'acklet_airvault_preferences';

@Injectable({
  providedIn: 'root'
})
export class AirVaultPreferencesService {
  prefs = signal<AirVaultPreferences>(this.loadPreferences());

  updatePref<K extends keyof AirVaultPreferences>(key: K, value: AirVaultPreferences[K]) {
    this.prefs.update(curr => {
      const updated = { ...curr, [key]: value };
      this.savePreferences(updated);
      return updated;
    });
  }

  private loadPreferences(): AirVaultPreferences {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
    } catch {}
    return { ...DEFAULT_PREFS };
  }

  private savePreferences(prefs: AirVaultPreferences) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {}
  }
}

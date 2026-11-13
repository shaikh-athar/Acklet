// apps/tool-image-compressor/src/services/profile-manager.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { OptimizationProfile, CompressionSettings } from '../models/compressor.models';
import { COMPRESSOR_CONFIG } from '../config/compressor.config';

export const STORAGE_KEY_PROFILES = 'acklet:compressor:profiles';

export const SYSTEM_PROFILES: OptimizationProfile[] = COMPRESSOR_CONFIG.profiles;

@Injectable({
  providedIn: 'root'
})
export class ProfileManagerService {
  private readonly _customProfiles = signal<OptimizationProfile[]>(this.loadStoredProfiles());

  readonly profiles = computed<OptimizationProfile[]>(() => [
    ...SYSTEM_PROFILES,
    ...this._customProfiles()
  ]);

  readonly customProfiles = computed<OptimizationProfile[]>(() => this._customProfiles());

  getProfiles(): OptimizationProfile[] {
    return this.profiles();
  }

  getProfileById(id: string): OptimizationProfile | undefined {
    return this.profiles().find(p => p.id === id);
  }

  createProfile(
    name: string,
    description: string,
    settings: CompressionSettings
  ): OptimizationProfile {
    const newProfile: OptimizationProfile = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim() || 'Custom Profile',
      description: description.trim() || 'Custom user-defined compression profile.',
      isCustom: true,
      createdAt: Date.now(),
      settings: JSON.parse(JSON.stringify(settings))
    };

    const updated = [...this._customProfiles(), newProfile];
    this._customProfiles.set(updated);
    this.persistProfiles(updated);
    return newProfile;
  }

  updateProfile(
    id: string,
    updates: Partial<Omit<OptimizationProfile, 'id' | 'isCustom' | 'createdAt'>>
  ): boolean {
    const list = this._customProfiles();
    const index = list.findIndex(p => p.id === id);
    if (index === -1) return false;

    const existing = list[index];
    const updatedProfile: OptimizationProfile = {
      ...existing,
      name: updates.name !== undefined ? updates.name.trim() : existing.name,
      description: updates.description !== undefined ? updates.description.trim() : existing.description,
      settings: updates.settings !== undefined ? JSON.parse(JSON.stringify(updates.settings)) : existing.settings
    };

    const updatedList = [...list];
    updatedList[index] = updatedProfile;
    this._customProfiles.set(updatedList);
    this.persistProfiles(updatedList);
    return true;
  }

  duplicateProfile(id: string, newName?: string): OptimizationProfile | undefined {
    const source = this.getProfileById(id);
    if (!source) return undefined;

    const name = newName || `${source.name} (Copy)`;
    return this.createProfile(name, source.description, source.settings);
  }

  deleteProfile(id: string): boolean {
    const list = this._customProfiles();
    const filtered = list.filter(p => p.id !== id);
    if (filtered.length === list.length) return false;

    this._customProfiles.set(filtered);
    this.persistProfiles(filtered);
    return true;
  }

  private loadStoredProfiles(): OptimizationProfile[] {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY_PROFILES);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.filter(item => item && item.id && item.settings && item.isCustom);
      }
      return [];
    } catch {
      return [];
    }
  }

  private persistProfiles(profiles: OptimizationProfile[]): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
    } catch {
      // Storage quota or restriction fallback
    }
  }
}

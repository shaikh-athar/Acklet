// apps/tool-image-compressor/src/services/profile-manager.service.spec.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProfileManagerService, STORAGE_KEY_PROFILES, SYSTEM_PROFILES } from './profile-manager.service';
import { CompressionSettings } from '../models/compressor.models';

describe('ProfileManagerService', () => {
  let service: ProfileManagerService;
  let mockStore: Record<string, string> = {};

  const mockSettings: CompressionSettings = {
    mode: 'custom',
    preset: 'balanced',
    quality: 75,
    outputFormat: 'webp',
    resize: { enabled: false, mode: 'dimensions', percentage: 100, maintainAspectRatio: true },
    metadataPolicy: 'remove'
  };

  beforeEach(() => {
    mockStore = {};
    const mockLocalStorage = {
      getItem: (key: string) => mockStore[key] || null,
      setItem: (key: string, val: string) => { mockStore[key] = val; },
      removeItem: (key: string) => { delete mockStore[key]; },
      clear: () => { mockStore = {}; },
      length: 0,
      key: () => null
    };

    if (typeof window === 'undefined') {
      (globalThis as any).window = { localStorage: mockLocalStorage };
    } else {
      (window as any).localStorage = mockLocalStorage;
    }

    service = new ProfileManagerService();
  });

  it('should list all 5 default system profiles', () => {
    const profiles = service.getProfiles();
    expect(profiles.length).toBeGreaterThanOrEqual(5);
    expect(profiles.some(p => p.id === 'system-web-balanced')).toBe(true);
    expect(profiles.some(p => p.id === 'system-lossless-archival')).toBe(true);
    expect(profiles.some(p => p.id === 'system-social-opengraph')).toBe(true);
  });

  it('should create and persist a custom profile', () => {
    const created = service.createProfile('Client Banner', 'Custom banner settings', mockSettings);
    expect(created.id).toContain('custom-');
    expect(created.name).toBe('Client Banner');
    expect(created.isCustom).toBe(true);

    const retrieved = service.getProfileById(created.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.settings.quality).toBe(75);

    // Verify localStorage persistence
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY_PROFILES) || '[]');
    expect(stored.length).toBe(1);
    expect(stored[0].name).toBe('Client Banner');
  });

  it('should update an existing custom profile', () => {
    const created = service.createProfile('Draft Profile', 'Initial', mockSettings);
    const updated = service.updateProfile(created.id, {
      name: 'Updated Profile',
      settings: { ...mockSettings, quality: 90 }
    });
    expect(updated).toBe(true);

    const profile = service.getProfileById(created.id);
    expect(profile?.name).toBe('Updated Profile');
    expect(profile?.settings.quality).toBe(90);
  });

  it('should duplicate an existing profile', () => {
    const duplicated = service.duplicateProfile('system-web-balanced', 'My Web Preset');
    expect(duplicated).toBeDefined();
    expect(duplicated?.name).toBe('My Web Preset');
    expect(duplicated?.isCustom).toBe(true);
    expect(duplicated?.settings.outputFormat).toBe('webp');
  });

  it('should delete a custom profile and retain system profiles', () => {
    const created = service.createProfile('To Be Deleted', 'Temporary', mockSettings);
    expect(service.customProfiles().length).toBe(1);

    const deleted = service.deleteProfile(created.id);
    expect(deleted).toBe(true);
    expect(service.customProfiles().length).toBe(0);
    expect(service.getProfiles().length).toBe(SYSTEM_PROFILES.length);
  });
});

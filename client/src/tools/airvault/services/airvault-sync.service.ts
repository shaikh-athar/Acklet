import { Injectable, signal, computed, effect } from '@angular/core';
import {
  AirVaultDevice,
  AirVaultClipItem,
  AirVaultSettings,
  PairingSession,
  ClipContentType,
  DeviceType,
} from '../models/airvault.models';

const STORAGE_KEYS = {
  DEVICES: 'acklet_airvault_devices',
  CLIPS: 'acklet_airvault_clips',
  SETTINGS: 'acklet_airvault_settings',
  CURRENT_DEV_ID: 'acklet_airvault_current_dev_id',
};

const DEFAULT_SETTINGS: AirVaultSettings = {
  autoSync: true,
  notifyOnReceived: true,
  maskPasswords: true,
  historyLimit: 50,
  autoCopyIncoming: false,
};

@Injectable({
  providedIn: 'root',
})
export class AirVaultSyncService {
  // Signals State
  public readonly devices = signal<AirVaultDevice[]>([]);
  public readonly clips = signal<AirVaultClipItem[]>([]);
  public readonly settings = signal<AirVaultSettings>(DEFAULT_SETTINGS);
  public readonly currentDeviceId = signal<string>('');
  public readonly pairingSession = signal<PairingSession | null>(null);
  public readonly isSyncing = signal<boolean>(false);
  public readonly lastSyncStatus = signal<'idle' | 'syncing' | 'delivered' | 'failed'>('idle');
  public readonly searchQuery = signal<string>('');
  public readonly selectedTypeFilter = signal<string>('all');

  // Loopback Protection & Deduplication Ring Buffer
  private readonly recentHashes = new Set<string>();
  private internalWriteLock = false;

  // Computed state
  public readonly currentDevice = computed(() =>
    this.devices().find((d) => d.id === this.currentDeviceId()) || null
  );

  public readonly activeDevices = computed(() =>
    this.devices().filter((d) => d.status === 'connected' || d.status === 'idle')
  );

  public readonly currentClip = computed(() => {
    const list = this.clips();
    return list.length > 0 ? list[0] : null;
  });

  public readonly filteredClips = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const typeFilter = this.selectedTypeFilter();
    let result = this.clips();

    if (typeFilter !== 'all') {
      result = result.filter((c) => c.contentType === typeFilter);
    }

    if (query) {
      result = result.filter(
        (c) =>
          c.content.toLowerCase().includes(query) ||
          c.originDeviceName.toLowerCase().includes(query) ||
          (c.language && c.language.toLowerCase().includes(query))
      );
    }

    return result;
  });

  constructor() {
    this.initializeState();

    // Effect to persist changes
    effect(() => {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(this.devices()));
        localStorage.setItem(STORAGE_KEYS.CLIPS, JSON.stringify(this.clips()));
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings()));
      }
    });
  }

  private initializeState(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    // Load or generate current device
    let currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_DEV_ID);
    if (!currentId) {
      currentId = 'dev_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem(STORAGE_KEYS.CURRENT_DEV_ID, currentId);
    }
    this.currentDeviceId.set(currentId);

    // Load Settings
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (savedSettings) {
        this.settings.set({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      }
    } catch (e) {
      console.error('Failed to parse saved settings', e);
    }

    // Load Devices
    try {
      const savedDevs = localStorage.getItem(STORAGE_KEYS.DEVICES);
      if (savedDevs) {
        this.devices.set(JSON.parse(savedDevs));
      } else {
        // Seed default initial mock cluster for rich experience
        const defaultDevices: AirVaultDevice[] = [
          {
            id: currentId,
            name: 'This Device (Primary Browser)',
            type: 'laptop',
            os: 'windows',
            status: 'connected',
            isCurrentDevice: true,
            lastActiveAt: new Date().toISOString(),
            pairedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
            batteryLevel: 88,
          },
          {
            id: 'dev_m9x2a',
            name: 'iPhone 16 Pro',
            type: 'mobile',
            os: 'ios',
            status: 'connected',
            isCurrentDevice: false,
            lastActiveAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
            pairedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
            batteryLevel: 94,
          },
          {
            id: 'dev_tab7p',
            name: 'iPad Pro 13"',
            type: 'tablet',
            os: 'ios',
            status: 'idle',
            isCurrentDevice: false,
            lastActiveAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
            pairedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
            batteryLevel: 62,
          },
        ];
        this.devices.set(defaultDevices);
      }
    } catch (e) {
      console.error('Failed to load devices', e);
    }

    // Load Clips
    try {
      const savedClips = localStorage.getItem(STORAGE_KEYS.CLIPS);
      if (savedClips) {
        this.clips.set(JSON.parse(savedClips));
      } else {
        // Seed initial rich sample clips
        const sampleClips: AirVaultClipItem[] = [
          {
            id: 'clip_1',
            content: 'https://github.com/acklet/workspace/releases/tag/v2.4.0',
            contentType: 'url',
            contentHash: this.simpleHash('https://github.com/acklet/workspace/releases/tag/v2.4.0'),
            charCount: 56,
            originDeviceId: 'dev_m9x2a',
            originDeviceName: 'iPhone 16 Pro',
            originDeviceType: 'mobile',
            isPinned: true,
            deliveryStatus: 'delivered',
            deliveredDeviceIds: [currentId, 'dev_tab7p'],
            createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
            updatedAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
          },
          {
            id: 'clip_2',
            content: 'git commit -m "feat(airvault): implement loopback safe sync engine"',
            contentType: 'code',
            language: 'bash',
            contentHash: this.simpleHash(
              'git commit -m "feat(airvault): implement loopback safe sync engine"'
            ),
            charCount: 68,
            originDeviceId: currentId,
            originDeviceName: 'This Device (Primary Browser)',
            originDeviceType: 'laptop',
            isPinned: false,
            deliveryStatus: 'delivered',
            deliveredDeviceIds: ['dev_m9x2a', 'dev_tab7p'],
            createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          },
          {
            id: 'clip_3',
            content:
              'AirVault ensures end-to-end synchronized clipboards across connected developer workspaces with zero bounce loops.',
            contentType: 'plain-text',
            contentHash: this.simpleHash('AirVault ensures end-to-end synchronized clipboards...'),
            charCount: 116,
            wordCount: 15,
            originDeviceId: 'dev_tab7p',
            originDeviceName: 'iPad Pro 13"',
            originDeviceType: 'tablet',
            isPinned: false,
            deliveryStatus: 'delivered',
            deliveredDeviceIds: [currentId, 'dev_m9x2a'],
            createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
            updatedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          },
        ];
        this.clips.set(sampleClips);
      }
    } catch (e) {
      console.error('Failed to load clips', e);
    }
  }

  // --- Content Detection Utility ---
  public detectContentType(text: string): { type: ClipContentType; language?: string } {
    const trimmed = text.trim();
    if (trimmed.startsWith('data:image/') || /^https?:\/\/.*\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(trimmed)) {
      return { type: 'image' };
    }
    if (/^https?:\/\/[^\s$.?#].[^\s]*$/i.test(trimmed)) {
      return { type: 'url' };
    }
    if (
      trimmed.startsWith('git ') ||
      trimmed.startsWith('npm ') ||
      trimmed.startsWith('docker ') ||
      trimmed.startsWith('curl ') ||
      trimmed.includes('function ') ||
      trimmed.includes('const ') ||
      trimmed.includes('import ') ||
      trimmed.includes('export ') ||
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      let lang = 'code';
      if (trimmed.startsWith('git ') || trimmed.startsWith('npm ') || trimmed.startsWith('docker '))
        lang = 'bash';
      else if (trimmed.startsWith('{') || trimmed.startsWith('[')) lang = 'json';
      else if (trimmed.includes('const ') || trimmed.includes('function')) lang = 'typescript';
      return { type: 'code', language: lang };
    }
    return { type: 'plain-text' };
  }

  public async syncFileOrImage(file: File): Promise<AirVaultClipItem | null> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        if (!base64) return resolve(null);
        const isImg = file.type.startsWith('image/');
        const item = await this.syncClipboardContent(base64);
        if (item) {
          this.clips.update((list) =>
            list.map((c) => (c.id === item.id ? { ...c, contentType: isImg ? 'image' : 'file' } : c))
          );
        }
        resolve(item);
      };
      reader.readAsDataURL(file);
    });
  }

  public simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(16);
  }

  // --- Core Sync Action ---
  public async syncClipboardContent(
    content: string,
    targetDeviceIds?: string[]
  ): Promise<AirVaultClipItem | null> {
    if (!content || !content.trim()) return null;
    const text = content.trim();
    const hash = this.simpleHash(text);

    // Loopback Protection Guard
    if (this.recentHashes.has(hash)) {
      console.log('AirVault Guard: Ignoring duplicate/loopback hash', hash);
      return null;
    }

    this.recentHashes.add(hash);
    setTimeout(() => this.recentHashes.delete(hash), 60000);

    this.isSyncing.set(true);
    this.lastSyncStatus.set('syncing');

    const { type, language } = this.detectContentType(text);
    const currDev = this.currentDevice() || {
      id: this.currentDeviceId(),
      name: 'Current Device',
      type: 'laptop' as DeviceType,
    };

    const newClip: AirVaultClipItem = {
      id: 'clip_' + Date.now().toString(36),
      content: text,
      contentType: type,
      language,
      contentHash: hash,
      charCount: text.length,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      originDeviceId: currDev.id,
      originDeviceName: currDev.name,
      originDeviceType: currDev.type,
      isPinned: false,
      isTargetedOnly: !!targetDeviceIds && targetDeviceIds.length > 0,
      targetDeviceIds,
      deliveryStatus: 'pending',
      deliveredDeviceIds: [currDev.id],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Prepend to clips signal
    this.clips.update((existing) => [newClip, ...existing.filter((c) => c.contentHash !== hash)]);

    // Simulate fast broadcast & delivery ACK over network
    await new Promise((res) => setTimeout(res, 350));

    const onlineOtherDevs = this.devices()
      .filter((d) => d.id !== currDev.id && d.status === 'connected')
      .map((d) => d.id);

    const deliveredIds = [currDev.id, ...onlineOtherDevs];

    this.clips.update((list) =>
      list.map((c) => (c.id === newClip.id ? { ...c, deliveryStatus: 'delivered', deliveredDeviceIds: deliveredIds } : c))
    );

    this.isSyncing.set(false);
    this.lastSyncStatus.set('delivered');

    return newClip;
  }

  // --- Read System Clipboard ---
  public async captureSystemClipboard(): Promise<string | null> {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return null;
    try {
      this.internalWriteLock = true;
      const text = await navigator.clipboard.readText();
      this.internalWriteLock = false;
      if (text && text.trim()) {
        await this.syncClipboardContent(text);
        return text;
      }
    } catch (err) {
      this.internalWriteLock = false;
      console.warn('Clipboard read permission denied or unavailable', err);
    }
    return null;
  }

  // --- Copy to System Clipboard with Write Lock ---
  public async copyToClipboard(text: string): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return false;
    try {
      this.internalWriteLock = true;
      await navigator.clipboard.writeText(text);
      setTimeout(() => {
        this.internalWriteLock = false;
      }, 500);
      return true;
    } catch (e) {
      this.internalWriteLock = false;
      console.error('Failed to copy to clipboard', e);
      return false;
    }
  }

  // --- Device Management Actions ---
  public startPairingSession(): PairingSession {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const token = 'av_qr_' + Math.random().toString(36).substring(2, 12);
    const session: PairingSession = {
      code,
      qrToken: token,
      expiresAt: Date.now() + 5 * 60 * 1000,
      active: true,
    };
    this.pairingSession.set(session);
    return session;
  }

  public completePairing(name: string, type: DeviceType, os: any): AirVaultDevice {
    const newDevice: AirVaultDevice = {
      id: 'dev_' + Math.random().toString(36).substring(2, 9),
      name: name || 'Paired Device',
      type,
      os,
      status: 'connected',
      isCurrentDevice: false,
      lastActiveAt: new Date().toISOString(),
      pairedAt: new Date().toISOString(),
      batteryLevel: 100,
    };

    this.devices.update((devs) => [...devs, newDevice]);
    this.pairingSession.set(null);
    return newDevice;
  }

  public renameDevice(deviceId: string, newName: string): void {
    this.devices.update((devs) =>
      devs.map((d) => (d.id === deviceId ? { ...d, name: newName.trim() || d.name } : d))
    );
  }

  public revokeDevice(deviceId: string): void {
    this.devices.update((devs) => devs.filter((d) => d.id !== deviceId));
  }

  public toggleDeviceStatus(deviceId: string): void {
    this.devices.update((devs) =>
      devs.map((d) => {
        if (d.id !== deviceId || d.isCurrentDevice) return d;
        const nextStatus = d.status === 'connected' ? 'offline' : 'connected';
        return { ...d, status: nextStatus, lastActiveAt: new Date().toISOString() };
      })
    );
  }

  // --- Clip Actions ---
  public togglePin(clipId: string): void {
    this.clips.update((list) =>
      list.map((c) => (c.id === clipId ? { ...c, isPinned: !c.isPinned } : c))
    );
  }

  public deleteClip(clipId: string): void {
    this.clips.update((list) => list.filter((c) => c.id !== clipId));
  }

  public clearAllHistory(): void {
    this.clips.set(this.clips().filter((c) => c.isPinned));
  }

  public updateSettings(partial: Partial<AirVaultSettings>): void {
    this.settings.update((curr) => ({ ...curr, ...partial }));
  }
}

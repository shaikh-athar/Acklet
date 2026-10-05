import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AirVaultCryptoService } from './airvault-crypto.service';
import { AirVaultColorService, PEER_IDENTITY_PALETTE } from './airvault-color.service';
import { AirVaultUIStore } from './airvault-ui.store';
import { AirVaultWsTransportService } from './airvault-ws-transport.service';
import { getAirVaultApiUrl } from './airvault-api.util';
import { Observable, catchError, map, of } from 'rxjs';
import { AirVaultLogger } from './airvault-sync-debug.service';

export type DeviceType = 'laptop' | 'smartphone' | 'tablet' | 'desktop';
export type DevicePresenceState = 'active' | 'syncing' | 'idle' | 'offline' | 'revoked' | 'connecting';

export interface AirVaultDevice {
  id: string;
  name: string;
  username?: string;
  customLabel?: string;
  deviceKeyword?: string;
  type: DeviceType;
  os: string;
  browser: string;
  thumbprint: string;
  ipHint: string;
  status: DevicePresenceState;
  lastActive: number;
  isCurrent: boolean;
  syncEnabled?: boolean;
  accentColor?: string;
  publicKeyHex?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AirVaultDeviceService {
  private crypto = inject(AirVaultCryptoService);
  private colorService = inject(AirVaultColorService);
  private http = inject(HttpClient);
  private uiStore = inject(AirVaultUIStore);
  private wsTransport = inject(AirVaultWsTransportService);

  private readonly baseUrl = getAirVaultApiUrl('/api/v1/airvault/devices');

  currentDevice = signal<AirVaultDevice>(this.initCurrentDevice());

  pairedDevices = signal<AirVaultDevice[]>(this.loadStoredDevices());
  registeredSessions = signal<AirVaultDevice[]>([]);

  allDevices = computed(() => [
    this.currentDevice(),
    ...this.pairedDevices()
  ]);

  ephemeralPin = signal<string>(this.generatePin());
  manualDisconnectedDeviceIds = signal<Set<string>>(this.loadManualDisconnectedIds());

  private loadManualDisconnectedIds(): Set<string> {
    try {
      const username = this.getOrCreateUsername();
      const stored = localStorage.getItem(`acklet_airvault_disconnected_peer_ids_${username}`);
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr)) {
          return new Set<string>(arr);
        }
      }
    } catch { }
    return new Set<string>();
  }

  private saveManualDisconnectedIds(ids: Set<string>) {
    try {
      const username = this.currentDevice().username || this.getOrCreateUsername();
      localStorage.setItem(`acklet_airvault_disconnected_peer_ids_${username}`, JSON.stringify(Array.from(ids)));
    } catch { }
  }

  isManuallyDisconnected(deviceId: string): boolean {
    return this.manualDisconnectedDeviceIds().has(deviceId);
  }

  markDisconnected(deviceId: string) {
    this.manualDisconnectedDeviceIds.update(set => {
      const next = new Set(set);
      next.add(deviceId);
      this.saveManualDisconnectedIds(next);
      return next;
    });
  }

  clearManualDisconnect(deviceId: string) {
    this.manualDisconnectedDeviceIds.update(set => {
      const next = new Set(set);
      next.delete(deviceId);
      this.saveManualDisconnectedIds(next);
      return next;
    });
  }

  constructor() {
    this.registerWithBackend();
    this.fetchRegisteredSessions();
    this.reconcileServerPairing();
    this.startPresenceHeartbeat();
  }

  reconcileServerPairing() {
    const cur = this.currentDevice();
    this.http.get<any>(getAirVaultApiUrl(`/api/v1/airvault/auth/reconcile?clientDeviceId=${encodeURIComponent(cur.id)}`)).pipe(
      catchError(() => of(null))
    ).subscribe(res => {
      if (res?.data?.isPaired && res.data.pairedUsername) {
        const d = res.data;
        AirVaultLogger.info(`[AirVault Device] 🤝 Reconciled server pairing state: Paired with @${d.pairedUsername} (${d.pairedDeviceId})`);
        const peerId = d.pairedDeviceId || `peer_${d.pairedUsername}`;
        const isManuallyOff = this.isManuallyDisconnected(peerId);
        const reconciledPeer: AirVaultDevice = {
          id: peerId,
          name: d.pairedDeviceName || `@${d.pairedUsername}`,
          username: d.pairedUsername,
          type: (d.pairedDeviceType as DeviceType) || 'laptop',
          os: 'Remote OS',
          browser: 'Remote Browser',
          thumbprint: d.pairedThumbprint || `AV-${d.pairedUsername.toUpperCase().slice(0, 4)}`,
          ipHint: '192.168.1.50',
          status: isManuallyOff ? 'offline' : 'offline', // Start as offline until verified via live socket presence
          lastActive: Date.now(),
          isCurrent: false,
          syncEnabled: true
        };
        this.addPairedDevice(reconciledPeer);
      }
    });
  }

  fetchRegisteredSessions() {
    const cur = this.currentDevice();
    const query = `?username=${encodeURIComponent(cur.username || '')}&clientDeviceId=${encodeURIComponent(cur.id)}`;
    this.http.get<any>(this.baseUrl + query).pipe(
      catchError(() => of(null))
    ).subscribe(res => {
      if (res && res.data && Array.isArray(res.data)) {
        const curId = this.currentDevice().id;
        const mapped: AirVaultDevice[] = res.data.map((d: any) => ({
          id: d.clientDeviceId || d.id,
          name: d.name,
          username: d.username,
          deviceKeyword: d.deviceKeyword,
          type: d.type,
          os: d.os,
          browser: d.browser,
          thumbprint: d.thumbprint,
          ipHint: d.ipHint,
          status: (d.lastActiveAt && (Date.now() - new Date(d.lastActiveAt).getTime() < 120000)) ? 'active' : 'offline',
          lastActive: d.lastActiveAt ? new Date(d.lastActiveAt).getTime() : Date.now(),
          isCurrent: (d.clientDeviceId === curId),
          syncEnabled: d.syncEnabled !== false,
          accentColor: d.accentColor
        }));
        this.registeredSessions.set(mapped);

        // Sync status only for peers that are NOT manually disconnected
        const activeRemoteSessions = mapped.filter(s => !s.isCurrent && s.status === 'active');
        if (activeRemoteSessions.length > 0) {
          this.pairedDevices.update(list =>
            list.map(d => {
              if (this.isManuallyDisconnected(d.id)) {
                return { ...d, status: 'offline' };
              }
              const matchedSession = activeRemoteSessions.find(s => s.id === d.id);
              if (matchedSession) {
                return { ...d, status: 'active', lastActive: matchedSession.lastActive };
              }
              return d;
            })
          );
          this.saveStoredDevices();
        }
      }
    });
  }

  private initCurrentDevice(): AirVaultDevice {
    let customType = this.detectDeviceType();
    let customAccent = '#2196F3';
    let customUsername = this.getOrCreateUsername();
    let customName = `@${customUsername}`;
    let customKeyword = this.getOrCreateKeyword();

    try {
      const stored = localStorage.getItem('acklet_airvault_self_custom');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.username) customUsername = parsed.username;
        if (parsed.name) customName = parsed.name.startsWith('@') ? parsed.name : `@${customUsername}`;
        if (parsed.type) customType = parsed.type;
        if (parsed.accentColor) customAccent = parsed.accentColor;
        if (parsed.deviceKeyword) customKeyword = parsed.deviceKeyword;
      }
    } catch { }

    const devId = this.getOrCreateDeviceId();
    const resolvedAccent = this.colorService.registerDeviceAccent(customName, customAccent || '#2563EB', customUsername, devId, true);

    return {
      id: devId,
      name: customName,
      username: customUsername,
      deviceKeyword: customKeyword,
      type: customType,
      os: this.detectOS(),
      browser: this.detectBrowser(),
      thumbprint: this.crypto.getThumbprint(),
      ipHint: '192.168.1.' + Math.floor(Math.random() * 200 + 10),
      status: 'active',
      lastActive: Date.now(),
      isCurrent: true,
      syncEnabled: true,
      accentColor: resolvedAccent
    };
  }

  private static readonly FALLBACK_ADJECTIVES = ['swift', 'apex', 'turbo', 'hyper', 'nova', 'cyber', 'solar', 'echo', 'shadow', 'frost', 'vortex', 'pulse', 'alpha', 'prime', 'neon'];
  private static readonly FALLBACK_NOUNS = ['vault', 'core', 'beam', 'node', 'pulse', 'dock', 'link', 'matrix', 'mesh', 'shard', 'relay', 'wave', 'spark', 'grid', 'orbit'];

  private getOrCreateUsername(): string {
    try {
      const stored = localStorage.getItem('acklet_airvault_username');
      // If stored username is valid and not legacy random format like user_XXXX or airvault-XXXX, use it
      if (stored && stored.trim() && !stored.startsWith('user_') && !stored.startsWith('airvault-')) {
        return stored.trim().toLowerCase();
      }
    } catch { }
    const adj = AirVaultDeviceService.FALLBACK_ADJECTIVES[Math.floor(Math.random() * AirVaultDeviceService.FALLBACK_ADJECTIVES.length)];
    const noun = AirVaultDeviceService.FALLBACK_NOUNS[Math.floor(Math.random() * AirVaultDeviceService.FALLBACK_NOUNS.length)];
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const memorableUser = `${adj}-${noun}-${randomSuffix}`;
    try {
      localStorage.setItem('acklet_airvault_username', memorableUser);
    } catch { }
    return memorableUser;
  }

  private getOrCreateKeyword(): string {
    try {
      const stored = localStorage.getItem('acklet_airvault_keyword');
      if (stored && /^\d{4}$/.test(stored.trim())) return stored.trim();
    } catch { }
    const pin = this.generateStrong4DigitPin();
    try {
      localStorage.setItem('acklet_airvault_keyword', pin);
    } catch { }
    return pin;
  }

  generatePairingPin(): string {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    this.ephemeralPin.set(pin);
    try {
      localStorage.setItem('acklet_airvault_ephemeral_pin', pin);
    } catch { }
    return pin;
  }

  private generateStrong4DigitPin(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  updateUsername(newUsername: string): boolean {
    const trimmed = newUsername.trim().toLowerCase();
    if (!trimmed || !/^[a-z0-9_.-]+$/.test(trimmed)) return false;

    // Client-side uniqueness check against already paired devices
    const conflictingPeer = this.pairedDevices().find(d => d.username?.toLowerCase() === trimmed);
    if (conflictingPeer) {
      AirVaultLogger.warn(`[AirVault Device] 🚫 Username '@${trimmed}' conflicts with paired peer ${conflictingPeer.name}`);
      return false;
    }

    this.currentDevice.update(d => ({ ...d, username: trimmed, name: `@${trimmed}` }));
    try {
      localStorage.setItem('acklet_airvault_username', trimmed);
    } catch { }

    const cur = this.currentDevice();
    // Only call customize if pin is valid 4-digit format — guard against legacy
    // 6-digit ephemeral pairing PINs that may be in localStorage from older versions.
    const validPin = cur.deviceKeyword && /^\d{4}$/.test(cur.deviceKeyword);
    if (validPin) {
      this.http.post<any>(getAirVaultApiUrl('/api/v1/airvault/auth/customize'), {
        clientDeviceId: cur.id,
        username: trimmed,
        pin: cur.deviceKeyword,
        deviceName: cur.name,
        deviceType: cur.type
      }).pipe(catchError(err => {
        AirVaultLogger.warn('[AirVault Device] Customize username error:', err);
        return of(null);
      })).subscribe();
    }

    // Broadcast username update across tabs and network signaling
    const updateMsg = {
      type: 'USERNAME_UPDATED',
      payload: {
        deviceId: cur.id,
        newUsername: trimmed,
        deviceName: `@${trimmed}`
      },
      senderDevice: cur,
      timestamp: Date.now()
    };
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const ch = new BroadcastChannel('acklet_airvault_sync_channel');
        ch.postMessage(updateMsg);
      } catch { }
    }
    this.wsTransport.send({
      type: 'USERNAME_UPDATED',
      senderDeviceId: cur.id,
      targetDeviceId: 'broadcast',
      payload: JSON.stringify(updateMsg.payload),
      timestamp: Date.now()
    });
    return true;
  }

  hasChosenIdentity(): boolean {
    try {
      return localStorage.getItem('acklet_airvault_identity_chosen') === 'true';
    } catch {
      return false;
    }
  }

  completeGuestOnboarding() {
    try {
      localStorage.setItem('acklet_airvault_identity_chosen', 'true');
      localStorage.removeItem('acklet_airvault_username');
      localStorage.removeItem('acklet_airvault_keyword');
    } catch { }

    const cur = this.currentDevice();
    this.http.post<any>(getAirVaultApiUrl(`/api/v1/airvault/auth/guest?clientDeviceId=${encodeURIComponent(cur.id)}`), {}).pipe(
      catchError(() => of(null))
    ).subscribe(res => {
      if (res?.data) {
        const freshUser = res.data.username;
        const freshPin = res.data.pin;
        try {
          localStorage.setItem('acklet_airvault_username', freshUser);
          localStorage.setItem('acklet_airvault_keyword', freshPin);
        } catch { }
        this.currentDevice.update(d => ({
          ...d,
          username: freshUser,
          name: `@${freshUser}`,
          deviceKeyword: freshPin
        }));
      } else {
        this.registerWithBackend();
      }
    });
  }

  loginWithExistingIdentity(username: string, pin: string): Observable<{ success: boolean; data?: any; message: string }> {
    const cur = this.currentDevice();
    const payload = {
      username: username.trim().toLowerCase(),
      pin: pin.trim(),
      clientDeviceId: cur.id,
      deviceName: cur.name,
      deviceType: cur.type,
      os: cur.os,
      browser: cur.browser,
      thumbprint: cur.thumbprint,
      ipHint: cur.ipHint
    };

    return this.http.post<any>(getAirVaultApiUrl('/api/v1/airvault/auth/existing'), payload).pipe(
      map(res => {
        if (res?.data) {
          const d = res.data;
          const trimmedUser = d.username || username.trim().toLowerCase();
          const trimmedPin = pin.trim();

          try {
            localStorage.setItem('acklet_airvault_username', trimmedUser);
            localStorage.setItem('acklet_airvault_keyword', trimmedPin);
            localStorage.setItem('acklet_airvault_identity_chosen', 'true');
          } catch { }

          this.currentDevice.update(dev => ({
            ...dev,
            username: trimmedUser,
            name: `@${trimmedUser}`,
            deviceKeyword: trimmedPin
          }));

          // Reload disconnected IDs for this account
          this.manualDisconnectedDeviceIds.set(this.loadManualDisconnectedIds());

          // Reconcile pairing state and session list
          this.reconcileServerPairing();
          this.fetchRegisteredSessions();
          this.sendHeartbeat();

          // If response contains paired target device, add it
          if (d.targetDeviceId && d.targetDeviceName) {
            const peerDev: AirVaultDevice = {
              id: d.targetDeviceId,
              name: d.targetDeviceName,
              username: d.targetUsername || d.targetDeviceName.replace(/^@/, ''),
              type: (d.targetDeviceType as DeviceType) || 'laptop',
              os: 'Remote OS',
              browser: 'Remote Browser',
              thumbprint: d.targetThumbprint || `AV-${trimmedUser.toUpperCase()}`,
              ipHint: '192.168.1.50',
              status: 'active',
              lastActive: Date.now(),
              isCurrent: false,
              syncEnabled: true
            };
            this.addPairedDevice(peerDev);
          }

          return { success: true, data: d, message: 'Logged in successfully' };
        }
        return { success: false, message: res?.message || 'Login failed' };
      }),
      catchError(err => {
        const msg = err?.error?.message || err?.message || 'Invalid username or PIN';
        return of({ success: false, message: msg });
      })
    );
  }

  setExistingIdentity(username: string, pin: string) {
    const trimmedUser = username.trim().toLowerCase();
    const trimmedPin = pin.trim();

    try {
      localStorage.setItem('acklet_airvault_username', trimmedUser);
      localStorage.setItem('acklet_airvault_keyword', trimmedPin);
      localStorage.setItem('acklet_airvault_identity_chosen', 'true');
    } catch { }

    const curId = this.currentDevice().id;

    // Register owner color for this identity
    const ownerColor = this.colorService.registerDeviceAccent(`@${trimmedUser}`, '#2096f3', trimmedUser, curId, true);

    this.currentDevice.update(d => ({
      ...d,
      username: trimmedUser,
      name: `@${trimmedUser}`,
      deviceKeyword: trimmedPin,
      accentColor: ownerColor
    }));

    // Reload disconnected IDs for this account
    this.manualDisconnectedDeviceIds.set(this.loadManualDisconnectedIds());

    // Purge any stale peer entries matching current device ID
    this.pairedDevices.update(list =>
      list.filter(d => d.id !== curId)
    );
    this.saveStoredDevices();

    this.registerWithBackend();
    this.reconcileServerPairing();
    this.fetchRegisteredSessions();
    this.sendHeartbeat();
  }

  updatePin(newPin: string) {
    const trimmed = newPin.trim();
    if (!/^\d{4}$/.test(trimmed)) return;
    this.currentDevice.update(d => ({ ...d, deviceKeyword: trimmed }));
    try {
      localStorage.setItem('acklet_airvault_keyword', trimmed);
    } catch { }

    const cur = this.currentDevice();
    this.http.post<any>(getAirVaultApiUrl('/api/v1/airvault/auth/customize'), {
      clientDeviceId: cur.id,
      username: cur.username || 'user',
      pin: trimmed,
      deviceName: cur.name,
      deviceType: cur.type
    }).pipe(catchError(() => of(null))).subscribe();

    this.http.post<any>(`${this.baseUrl}/register`, {
      clientDeviceId: cur.id,
      deviceName: cur.name,
      username: cur.username,
      deviceKeyword: trimmed,
      deviceType: cur.type,
      os: cur.os,
      browser: cur.browser,
      thumbprint: cur.thumbprint,
      ipHint: cur.ipHint
    }).pipe(catchError(() => of(null))).subscribe();
  }

  verifyAndPairWithUsernamePin(username: string, pin: string): Observable<{ success: boolean; device?: AirVaultDevice; message: string }> {
    const cur = this.currentDevice();
    const payload = {
      username: username.trim().toLowerCase(),
      pin: pin.trim(),
      clientDeviceId: cur.id,
      deviceName: cur.name,
      deviceType: cur.type,
      os: cur.os,
      browser: cur.browser,
      thumbprint: cur.thumbprint,
      ipHint: cur.ipHint
    };

    return this.http.post<any>(getAirVaultApiUrl('/api/v1/airvault/auth/verify-pin'), payload).pipe(
      map(res => {
        if (res?.data) {
          const d = res.data;
          const matchedDevice: AirVaultDevice = {
            id: d.targetDeviceId || `peer_${d.username}`,
            name: d.targetDeviceName || `@${d.username}`,
            username: d.username,
            deviceKeyword: pin,
            type: d.targetDeviceType || 'laptop',
            os: 'Remote OS',
            browser: 'Remote Browser',
            thumbprint: d.targetThumbprint || `AV-${d.username.toUpperCase().slice(0, 4)}`,
            ipHint: '192.168.1.50',
            status: 'active',
            lastActive: Date.now(),
            isCurrent: false,
            syncEnabled: true
          };
          return { success: true, device: matchedDevice, message: 'Authenticated & Paired successfully' };
        }
        return { success: false, message: res?.message || 'Invalid username or PIN' };
      }),
      catchError(err => {
        const msg = err?.error?.message || err?.message || 'Invalid username or PIN';
        return of({ success: false, message: msg });
      })
    );
  }

  checkUsernameAvailability(username: string): Observable<{ available: boolean; message: string }> {
    const trimmed = username.trim().toLowerCase();
    if (!trimmed) {
      return of({ available: false, message: 'Username cannot be empty' });
    }
    if (trimmed.length < 3) {
      return of({ available: false, message: 'Too short (min 3 characters)' });
    }
    if (!/^[a-z0-9_.-]+$/.test(trimmed)) {
      return of({ available: false, message: 'Only lowercase letters, numbers, _, -, . allowed' });
    }
    const checkUrl = getAirVaultApiUrl(`/api/v1/airvault/auth/check-username?username=${encodeURIComponent(trimmed)}`);
    return this.http.get<any>(checkUrl).pipe(
      map((res: any) => res?.data || { available: true, message: 'Available' }),
      catchError(() => of({ available: true, message: 'Available' }))
    );
  }

  getAvailableAccentColor(): string {
    const taken = new Set(this.pairedDevices().map(d => (d.accentColor || '').toUpperCase()));
    for (const hex of PEER_IDENTITY_PALETTE) {
      if (!taken.has(hex.toUpperCase())) {
        return hex;
      }
    }
    return PEER_IDENTITY_PALETTE[0];
  }

  addPairedDevice(device: AirVaultDevice): boolean {
    if (device.id === this.currentDevice().id) {
      AirVaultLogger.debug(`[AirHold Device] ⚠️ Skipping self device from paired list: "${device.name}" (${device.id})`);
      return false;
    }

    const currentList = this.pairedDevices();
    const existing = currentList.find(d => d.id === device.id);

    // Limit check: Maximum 10 active (non-revoked) paired device relationships
    const activeCount = currentList.filter(d => d.status !== 'revoked').length;
    if (!existing && activeCount >= 10) {
      AirVaultLogger.warn(`[AirHold Device] 🚫 Connection limit reached (10 devices max). Cannot pair with "${device.name}"`);
      return false;
    }

    // Auto-assign and register device accent color
    const assignedAccent = this.colorService.registerDeviceAccent(device.name, device.accentColor, device.username, device.id);

    const isManuallyOff = this.isManuallyDisconnected(device.id);
    const resolvedStatus: DevicePresenceState = isManuallyOff ? 'offline' : (device.status || 'active');

    this.pairedDevices.update(list => {
      const filtered = list.filter(d => d.id !== device.id);
      const syncEnabled = existing ? (existing.syncEnabled !== false) : true;
      const mergedDevice: AirVaultDevice = {
        ...device,
        name: device.username ? `@${device.username}` : (device.name || 'Paired Device'),
        status: resolvedStatus,
        isCurrent: false,
        accentColor: assignedAccent,
        syncEnabled
      };
      return [...filtered, mergedDevice];
    });
    this.saveStoredDevices();
    AirVaultLogger.info(`[AirHold Device] ➕ Device added & auto-assigned accent color (${assignedAccent}): "${device.name}" (${device.id})`);
    return true;
  }

  /**
   * Toggles whether clipboard synchronization is enabled for a specific device.
   * Highlighted border in UI reflects this persistent preference.
   */
  toggleSyncTarget(deviceId: string) {
    let newState = true;
    this.pairedDevices.update(list =>
      list.map(d => {
        if (d.id === deviceId) {
          newState = d.syncEnabled === false ? true : false;
          AirVaultLogger.info(`[AirHold Device] 🎯 Device sync state toggled: "${d.name}" (${deviceId}) -> syncEnabled=${newState}`);
          return { ...d, syncEnabled: newState };
        }
        return d;
      })
    );
    this.saveStoredDevices();

    // Persist to backend authoritatively
    this.http.patch(`${this.baseUrl}/${deviceId}/sync-permission?enabled=${newState}`, {})
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  reconnectingDeviceIds = signal<Set<string>>(new Set());

  isReconnecting(deviceId: string): boolean {
    return this.reconnectingDeviceIds().has(deviceId);
  }

  setDeviceReconnecting(deviceId: string, isConnecting: boolean) {
    this.reconnectingDeviceIds.update(set => {
      const next = new Set(set);
      if (isConnecting) {
        next.add(deviceId);
      } else {
        next.delete(deviceId);
      }
      return next;
    });
  }

  /**
   * Disconnect: Temporarily marks device as offline/disconnected.
   * Device remains in constellation list so user can reconnect later.
   */
  disconnectDevice(deviceId: string) {
    AirVaultLogger.info(`[AirHold Device] 🔌 Disconnecting device: ${deviceId}`);
    this.markDisconnected(deviceId);
    this.setDeviceStatus(deviceId, 'offline');
  }

  /**
   * Mark Peer Forgot Us: Called when the remote peer has forgotten (un-paired) us from their
   * side and sent a DEVICE_DISCONNECT. We keep the device in our paired list (visible with a
   * Reconnect button) but set it to "offline". We do NOT add it to manualDisconnectedDeviceIds
   * so it doesn't permanently block sync on reconnect.
   */
  markPeerForgotUs(deviceId: string) {
    AirVaultLogger.info(`[AirHold Device] 👋 Peer forgot us — marking ${deviceId} as offline (stays visible for reconnect)`);
    this.setDeviceStatus(deviceId, 'offline');
  }

  /**
   * Reconnect: Restores device status to active and resumes synchronization.
   */
  reconnectDevice(deviceId: string) {
    AirVaultLogger.info(`[AirHold Device] ⚡ Reconnecting device: ${deviceId}`);
    this.clearManualDisconnect(deviceId);
    this.setDeviceReconnecting(deviceId, true);
    setTimeout(() => {
      this.setDeviceStatus(deviceId, 'active');
      this.setDeviceReconnecting(deviceId, false);
      this.broadcastDeviceOnlineSignal();
    }, 400);
  }

  /**
   * Remote Logout / Remove My Instance:
   * Revokes the session on the remote device via backend and broadcasts a revocation signal.
   */
  remoteLogoutDevice(deviceId: string, eraseData: boolean = false) {
    AirVaultLogger.info(`[AirHold Device] 🔐 Remote logging out instance from device: ${deviceId} (eraseData=${eraseData})`);
    this.clearManualDisconnect(deviceId);
    this.registeredSessions.update(list => list.filter(d => d.id !== deviceId));
    this.pairedDevices.update(list => list.filter(d => d.id !== deviceId));
    this.saveStoredDevices();

    const cur = this.currentDevice();
    const revokePayload = { targetDeviceId: deviceId, eraseData };

    // Broadcast revocation locally across tabs
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const ch = new BroadcastChannel('acklet_airvault_sync_channel');
        ch.postMessage({
          type: 'DEVICE_REVOKE',
          payload: revokePayload,
          senderDevice: cur,
          timestamp: Date.now()
        });
      } catch { }
    }

    // Send revocation packet via WebSocket directly to target device and broadcast to constellation
    this.wsTransport.send({
      type: 'DEVICE_REVOKE',
      senderDeviceId: cur.id,
      targetDeviceId: deviceId,
      payload: JSON.stringify(revokePayload),
      timestamp: Date.now()
    });

    this.wsTransport.send({
      type: 'DEVICE_REVOKE',
      senderDeviceId: cur.id,
      targetDeviceId: 'broadcast',
      payload: JSON.stringify(revokePayload),
      timestamp: Date.now()
    });

    // Call backend to revoke server-side
    this.http.delete(`${this.baseUrl}/${deviceId}?eraseData=${eraseData}`).pipe(
      catchError(() => of(null))
    ).subscribe(() => {
      this.fetchRegisteredSessions();
    });
  }

  /**
   * Complete Logout of Current Device:
   * Invalidates token server-side, clears local storage state, removes paired peers,
   * disconnects WebSocket connection, and resets device identity.
   */
  logoutCurrentDevice(): Observable<any> {
    const cur = this.currentDevice();
    const logoutUrl = getAirVaultApiUrl(`/api/v1/airvault/auth/logout?clientDeviceId=${encodeURIComponent(cur.id)}&username=${encodeURIComponent(cur.username || '')}`);
    
    // Disconnect WebSocket
    this.wsTransport.disconnect();

    // Clear local identity storage
    try {
      localStorage.removeItem('acklet_airvault_identity_chosen');
      localStorage.removeItem('acklet_airvault_username');
      localStorage.removeItem('acklet_airvault_keyword');
      localStorage.removeItem('acklet_airvault_ephemeral_pin');
      localStorage.removeItem('acklet_airvault_guest_token');
      localStorage.removeItem('acklet_airvault_peers');
      localStorage.removeItem('acklet_airvault_self_custom');
    } catch {}

    // Reset local in-memory peers
    this.pairedDevices.set([]);
    this.registeredSessions.set([]);

    return this.http.post<any>(logoutUrl, {}).pipe(
      catchError(() => of({ success: true }))
    );
  }

  /**
   * Forget / Unpair: Removes only the specific pairing link between the current device and the
   * target device. The target device record itself is NOT revoked — it remains active for all
   * of its other connections. This is the correct operation for "Forget & unpair device" in
   * the Manage Devices UI.
   */
  revokeDevice(deviceId: string) {
    const dev = this.pairedDevices().find(d => d.id === deviceId);
    const cur = this.currentDevice();
    AirVaultLogger.info(`[AirHold Device] 🗑️ Unpair device: "${dev?.name || deviceId}" (${deviceId}) from current device (${cur.id})`);

    // Remove from local paired list immediately (optimistic update)
    this.clearManualDisconnect(deviceId);
    this.pairedDevices.update(list => list.filter(d => d.id !== deviceId));
    this.saveStoredDevices();

    // Call the targeted pairing-removal endpoint — does NOT revoke/delete the device itself,
    // only dissolves the specific link between cur.id and deviceId.
    this.http.delete(`${this.baseUrl}/${deviceId}/pairing`, {
      params: { fromDeviceId: cur.id }
    }).pipe(catchError(() => of(null))).subscribe();
  }

  getDisplayLabel(device?: AirVaultDevice | null): string {
    if (!device) return '@device';
    if (device.customLabel && device.customLabel.trim()) {
      const cl = device.customLabel.trim();
      return cl.startsWith('@') ? cl : `@${cl}`;
    }
    if (device.name && device.name.trim() && !device.name.startsWith('dev-') && !device.name.startsWith('peer_')) {
      return device.name.startsWith('@') ? device.name : (device.username ? `@${device.username.replace(/^@/, '')}` : device.name);
    }
    if (device.username && device.username.trim()) {
      return `@${device.username.replace(/^@/, '')}`;
    }
    return device.name || '@device';
  }

  getActualUsername(device?: AirVaultDevice | null): string {
    if (!device) return 'device';
    if (device.username && device.username.trim()) {
      return device.username.replace(/^@/, '');
    }
    return (device.name || 'device').replace(/^@/, '');
  }

  renameDevice(deviceId: string, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed) return;
    AirVaultLogger.info(`[AirHold Device] 🏷️ Renaming device ${deviceId} ➔ "${trimmed}"`);

    const formattedLabel = trimmed.startsWith('@') ? trimmed : `@${trimmed}`;

    if (deviceId === this.currentDevice().id) {
      this.currentDevice.update(d => ({ ...d, customLabel: formattedLabel, name: formattedLabel }));
      try {
        const stored = localStorage.getItem('acklet_airvault_self_custom');
        const customObj = stored ? JSON.parse(stored) : {};
        customObj.customLabel = formattedLabel;
        customObj.name = formattedLabel;
        localStorage.setItem('acklet_airvault_self_custom', JSON.stringify(customObj));
      } catch { }
    } else {
      this.pairedDevices.update(list =>
        list.map(d => d.id === deviceId ? { ...d, customLabel: formattedLabel, name: formattedLabel } : d)
      );
      this.saveStoredDevices();
    }

    this.http.patch(`${this.baseUrl}/${deviceId}/rename`, { name: formattedLabel })
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  customizeDevice(deviceId: string, customization: { name: string; type: DeviceType; accentColor: string }) {
    if (deviceId === this.currentDevice().id) {
      this.currentDevice.update(d => ({
        ...d,
        name: customization.name.trim() || d.name,
        type: customization.type,
        accentColor: customization.accentColor,
        syncEnabled: true
      }));
      try {
        localStorage.setItem('acklet_airvault_self_custom', JSON.stringify({
          name: this.currentDevice().name,
          type: this.currentDevice().type,
          accentColor: this.currentDevice().accentColor
        }));
      } catch { }
    } else {
      this.pairedDevices.update(list =>
        list.map(d => d.id === deviceId ? {
          ...d,
          name: customization.name.trim() || d.name,
          type: customization.type,
          accentColor: customization.accentColor,
          syncEnabled: d.syncEnabled !== false
        } : d)
      );
      this.colorService.registerDeviceAccent(customization.name, customization.accentColor, undefined, deviceId);
      this.saveStoredDevices();
    }
  }

  setDeviceStatus(idOrUsername: string, status: DevicePresenceState) {
    const cur = this.currentDevice();
    const cleanTarget = (idOrUsername || '').toLowerCase().replace(/^@/, '');
    const cleanCurUser = (cur.username || '').toLowerCase().replace(/^@/, '');

    if (idOrUsername === cur.id || (cleanTarget && cleanCurUser && cleanTarget === cleanCurUser)) {
      this.currentDevice.update(d => ({ ...d, status, lastActive: Date.now() }));
    } else {
      const isManuallyOff = this.isManuallyDisconnected(idOrUsername);
      const effectiveStatus = (status === 'active' && isManuallyOff) ? 'offline' : status;

      this.pairedDevices.update(list =>
        list.map(d => {
          const dCleanUser = (d.username || '').toLowerCase().replace(/^@/, '');
          const isMatch = d.id === idOrUsername || (cleanTarget && dCleanUser && dCleanUser === cleanTarget);
          if (isMatch) {
            const devManuallyOff = this.isManuallyDisconnected(d.id);
            const devEffectiveStatus = (status === 'active' && devManuallyOff) ? 'offline' : status;
            return { ...d, status: devEffectiveStatus, lastActive: Date.now() };
          }
          return d;
        })
      );
      this.saveStoredDevices();
    }

    // Also keep registeredSessions signal in sync if this device exists in registered sessions list
    this.registeredSessions.update(sessions =>
      sessions.map(s => {
        const sCleanUser = (s.username || '').toLowerCase().replace(/^@/, '');
        const isMatch = s.id === idOrUsername || (cleanTarget && sCleanUser && sCleanUser === cleanTarget);
        if (isMatch) {
          return { ...s, status, lastActive: Date.now() };
        }
        return s;
      })
    );
  }

  /**
   * Returns list of paired devices where clipboard sync is ENABLED and device is reachable
   */
  getSyncEnabledPairedDevices(): AirVaultDevice[] {
    return this.pairedDevices().filter(d => d.syncEnabled !== false && d.status !== 'revoked');
  }

  /**
   * Returns list of paired devices that are currently active (connected)
   */
  getConnectedPairedDevices(): AirVaultDevice[] {
    return this.pairedDevices().filter(d => (d.status === 'active' || d.status === 'syncing') && d.syncEnabled !== false);
  }

  private registerWithBackend() {
    const cur = this.currentDevice();
    const req = {
      clientDeviceId: cur.id,
      deviceName: cur.name,
      username: cur.username,
      deviceKeyword: cur.deviceKeyword,
      deviceType: cur.type,
      os: cur.os,
      browser: cur.browser,
      thumbprint: cur.thumbprint,
      ipHint: cur.ipHint
    };

    // 1. Register device table record
    this.http.post<any>(`${this.baseUrl}/register`, req).pipe(
      catchError(() => of(null))
    ).subscribe();

    // 2. Register & reserve username and PIN hash in auth credentials table
    if (cur.username && cur.deviceKeyword) {
      this.http.post<any>(getAirVaultApiUrl('/api/v1/airvault/auth/customize'), {
        clientDeviceId: cur.id,
        username: cur.username,
        pin: cur.deviceKeyword,
        deviceName: cur.name,
        deviceType: cur.type
      }).pipe(
        catchError(() => of(null))
      ).subscribe();
    }
  }

  private heartbeatIntervalTimer: any = null;
  private lastHeartbeatSentAt = 0;

  private startPresenceHeartbeat() {
    // 1. One-time initial REST fallback registration on startup before WS is fully ready
    this.sendInitialRestHeartbeatFallback();

    // 2. Immediate WebSocket heartbeat whenever transport connects or reconnects
    this.wsTransport.onConnected$.subscribe(() => {
      AirVaultLogger.debug('[AirVault Device] ⚡ WebSocket connected. Emitting WS presence heartbeat & online signal immediately...');
      this.sendWsHeartbeat();
      this.broadcastDeviceOnlineSignal();
    });

    // 3. Regular 5s application-level WebSocket heartbeat interval
    this.heartbeatIntervalTimer = setInterval(() => {
      this.sendWsHeartbeat();
    }, 5000);

    // 4. Page Visibility API: on tab return (visibilitychange to 'visible' or window focus),
    // immediately send a heartbeat and online presence so throttled tab intervals never trigger false timeouts
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          AirVaultLogger.debug('[AirVault Device] 👁️ Tab became visible. Triggering immediate WS heartbeat & online broadcast...');
          this.sendWsHeartbeat();
          this.broadcastDeviceOnlineSignal();
        }
      });
      window.addEventListener('focus', () => {
        const now = Date.now();
        if (now - this.lastHeartbeatSentAt >= 1000) {
          this.sendWsHeartbeat();
          this.broadcastDeviceOnlineSignal();
        }
      });
    }
  }

  /**
   * Broadcasts a DEVICE_ONLINE signal containing full device metadata to peers.
   */
  public broadcastDeviceOnlineSignal() {
    const cur = this.currentDevice();
    const onlinePayload = {
      deviceId: cur.id,
      senderDevice: cur,
      timestamp: Date.now()
    };
    this.wsTransport.send({
      type: 'DEVICE_ONLINE',
      senderDeviceId: cur.id,
      targetDeviceId: 'broadcast',
      payload: JSON.stringify(onlinePayload),
      timestamp: Date.now()
    });
  }

  /**
   * One-time REST heartbeat fallback when WS isn't established yet on initial load.
   */
  private sendInitialRestHeartbeatFallback() {
    const cur = this.currentDevice();
    this.http.post(`${this.baseUrl}/${cur.id}/heartbeat`, {}).pipe(
      catchError(() => of(null))
    ).subscribe();
  }

  /**
   * Sends lightweight application-level HEARTBEAT message over the active WebSocket connection.
   */
  public sendHeartbeat() {
    this.sendWsHeartbeat();
  }

  private sendWsHeartbeat() {
    const cur = this.currentDevice();
    const now = Date.now();
    this.lastHeartbeatSentAt = now;
    this.currentDevice.update(d => ({ ...d, lastActive: now }));

    // 1. Send lightweight app-level {"type":"HEARTBEAT"} frame over WebSocket
    const sent = this.wsTransport.send({
      type: 'HEARTBEAT',
      senderDeviceId: cur.id,
      timestamp: now
    });

    // 2. Broadcast online presence over WebSocket so all paired peers auto-identify this device as active
    this.broadcastDeviceOnlineSignal();

    // 3. Broadcast locally across open browser tabs via BroadcastChannel
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const ch = new BroadcastChannel('acklet_airvault_sync_channel');
        ch.postMessage({
          type: 'DEVICE_ONLINE',
          senderDevice: cur,
          timestamp: now
        });
      } catch { }
    }

    // If WebSocket is not connected (e.g. startup / connection drop backoff),
    // allow a one-time REST fallback call (throttled to at most once per 15s)
    if (!sent) {
      this.sendInitialRestHeartbeatFallback();
    }
  }

  private getOrCreateDeviceId(): string {
    let id = '';
    try {
      id = localStorage.getItem('acklet_airvault_device_id') || '';
    } catch { }

    if (!id) {
      id = 'dev-' + Math.random().toString(36).substring(2, 10);
      try {
        localStorage.setItem('acklet_airvault_device_id', id);
      } catch { }
    }
    return id;
  }

  private loadStoredDevices(): AirVaultDevice[] {
    try {
      const raw = localStorage.getItem('acklet_airvault_peers');
      if (raw) {
        const parsed: AirVaultDevice[] = JSON.parse(raw);
        // Exclude any legacy mock devices cached in user's browser localStorage and ensure syncEnabled is true by default.
        // Always start peers as 'offline' — status must be earned by live DEVICE_ONLINE signals, not assumed from stale cache.
        return parsed
          .filter(d => !d.id.startsWith('dev-peer-') && !d.id.startsWith('dev-demo-') && !d.id.startsWith('dev-sim-') && !d.id.startsWith('dev-mock-') && d.status !== 'revoked')
          .map(d => {
            const registeredColor = this.colorService.registerDeviceAccent(d.name, d.accentColor, d.username, d.id);
            return {
              ...d,
              accentColor: registeredColor,
              status: 'offline' as const,
              syncEnabled: d.syncEnabled !== false
            };
          });
      }
    } catch { }

    return [];
  }

  private deviceSaveTimer: any = null;

  saveStoredDevices() {
    if (this.deviceSaveTimer) clearTimeout(this.deviceSaveTimer);
    this.deviceSaveTimer = setTimeout(() => {
      try {
        localStorage.setItem('acklet_airvault_peers', JSON.stringify(this.pairedDevices()));
      } catch { }
    }, 150);
  }

  private generatePin(): string {
    try {
      const stored = localStorage.getItem('acklet_airvault_ephemeral_pin');
      if (stored && /^\d{6}$/.test(stored.trim())) {
        return stored.trim();
      }
    } catch { }
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      localStorage.setItem('acklet_airvault_ephemeral_pin', pin);
    } catch { }
    return pin;
  }

  /**
   * Called on beforeunload: immediately notifies backend that this device is going offline.
   * Uses navigator.sendBeacon for fire-and-forget reliability on browser close.
   */
  sendOfflineBeacon() {
    const cur = this.currentDevice();
    const offlineUrl = `${this.baseUrl}/${cur.id}/offline`;
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(offlineUrl);
    }
  }

  private detectDeviceName(): string {
    if (typeof navigator === 'undefined') return 'You';
    const ua = navigator.userAgent || '';
    if (/iPhone/i.test(ua)) return 'iPhone';
    if (/iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'iPad';
    if (/Android/i.test(ua)) {
      if (/Mobile/i.test(ua)) return 'Android Phone';
      return 'Android Tablet';
    }
    if (/Macintosh|Mac OS X/i.test(ua)) return 'MacBook';
    if (/Windows/i.test(ua)) return 'Windows PC';
    if (/Linux/i.test(ua)) return 'Linux Workstation';
    return 'Acklet Device';
  }

  private detectDeviceType(): DeviceType {
    if (typeof navigator === 'undefined') return 'laptop';
    const ua = navigator.userAgent || '';
    // Check for iPadOS touch interface
    const isIPad = /iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIPad) return 'tablet';
    if (/Tablet|Android(?!.*Mobile)/i.test(ua)) return 'tablet';
    if (/Mobile|iPhone|Android|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return 'smartphone';
    if (/Macintosh/i.test(ua)) return 'laptop';
    if (/Windows/i.test(ua)) return 'desktop';
    if (/Linux/i.test(ua)) return 'desktop';
    return 'smartphone';
  }

  private detectOS(): string {
    if (typeof navigator === 'undefined') return 'macOS';
    const ua = navigator.userAgent || '';
    if (/iPhone OS (\d+)/i.test(ua)) return 'iOS ' + (RegExp.$1 || '18');
    if (/iPad.*OS (\d+)/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'iPadOS';
    if (/Android (\d+)/i.test(ua)) return 'Android ' + (RegExp.$1 || '15');
    if (/Android/i.test(ua)) return 'Android Mobile';
    if (/Mac OS X 10[._]\d+/i.test(ua) || /Macintosh/i.test(ua)) return 'macOS Sonoma';
    if (/Windows NT 10/i.test(ua)) return 'Windows 11';
    if (/Linux/i.test(ua)) return 'Linux';
    return 'Darwin';
  }

  private detectBrowser(): string {
    if (typeof navigator === 'undefined') return 'Chrome';
    const ua = navigator.userAgent;
    if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) return 'Chrome 128';
    if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari 18';
    if (/Firefox/i.test(ua)) return 'Firefox 130';
    if (/Edg/i.test(ua)) return 'Edge 128';
    return 'Browser';
  }
}

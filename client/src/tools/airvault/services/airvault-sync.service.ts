import { Injectable, inject, EventEmitter, NgZone, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AirVaultCryptoService, EncryptedPacket } from './airvault-crypto.service';
import { AirVaultDeviceService, AirVaultDevice, DevicePresenceState } from './airvault-device.service';
import { AirVaultStorageService, AirVaultItem, DeliveryStatus } from './airvault-storage.service';
import { AirVaultClipboardService, ClassifiedContent, LineBlameEntry } from './airvault-clipboard.service';
import { AirVaultUIStore } from './airvault-ui.store';
import { AirVaultNotificationService } from './airvault-notification.service';
import { AirVaultPreferencesService } from './airvault-preferences.service';
import { AirVaultColorService } from './airvault-color.service';
import { AirVaultBlameService } from './airvault-blame.service';
import { AirVaultDocSyncService, DocOperation } from './airvault-doc-sync.service';
import { getAirVaultApiUrl } from './airvault-api.util';
import { AirVaultSyncDebugLogger, AirVaultLogger } from './airvault-sync-debug.service';
import { AirVaultWsTransportService, AirVaultWsMessage } from './airvault-ws-transport.service';
import { catchError, of } from 'rxjs';

export const AUTO_COPY_SIZE_THRESHOLD_BYTES = 20 * 1024 * 1024; // 20 MB

export interface DraftActivityPayload {
  deviceId: string;
  username: string;
  deviceType?: string;
  deviceAccent?: string;
  contentPreview: string;
  lastKeystrokeAt: number;
}

export interface SyncMessage {
  type: 'CLIPBOARD_BEAM' | 'SYNC_ACK' | 'DEVICE_PING' | 'DEVICE_PONG' | 'DEVICE_REVOKE' | 'INITIAL_SYNC_REQUEST' | 'INITIAL_SYNC_BATCH' | 'INITIAL_SYNC_TOMBSTONES' | 'INITIAL_SYNC_ACK' | 'ITEM_DELETE' | 'LIVE_CLIPBOARD_SYNC' | 'DEVICE_ONLINE' | 'DEVICE_OFFLINE' | 'DOC_OPERATION' | 'DRAFT_ACTIVITY' | 'DRAFT_FINALIZED' | 'DRAFT_REQUEST' | 'DRAFT_RESPONSE';
  packet?: EncryptedPacket;
  packetId?: string;
  itemId?: string;
  tombstones?: string[];
  liveText?: string;
  lineBlameMap?: LineBlameEntry[];
  payload?: any;
  draftActivity?: DraftActivityPayload;
  items?: EncryptedPacket[];
  batchIndex?: number;
  totalBatches?: number;
  totalItems?: number;
  burnAfterRead?: boolean;
  senderDevice: AirVaultDevice;
  targetDeviceId?: string;
  timestamp: number;
}

interface OutboxEntry {
  packet: EncryptedPacket;
  targetDeviceId?: string;
  retries: number;
}

export interface SyncTelemetryLog {
  syncSessionId: string;
  sourceDeviceId: string;
  targetDeviceId: string;
  itemCount: number;
  status: 'pending' | 'success' | 'failed' | 'skipped_disabled';
  timestamp: number;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AirVaultSyncService {
  private crypto = inject(AirVaultCryptoService);
  private deviceService = inject(AirVaultDeviceService);
  private storageService = inject(AirVaultStorageService);
  private clipboardService = inject(AirVaultClipboardService);
  private notificationService = inject(AirVaultNotificationService);
  private prefService = inject(AirVaultPreferencesService);
  private colorService = inject(AirVaultColorService);
  private blameService = inject(AirVaultBlameService);
  public docSyncService = inject(AirVaultDocSyncService);
  private uiStore = inject(AirVaultUIStore);
  private http = inject(HttpClient);
  private ngZone = inject(NgZone);
  private wsTransport = inject(AirVaultWsTransportService);

  private readonly signalingUrl = getAirVaultApiUrl('/api/v1/airvault/sync');
  private channel: BroadcastChannel | null = null;
  private outboxQueue: OutboxEntry[] = [];

  private lastAutoCopyTime = 0;
  private readonly AUTO_COPY_DEBOUNCE_MS = 1000;

  public onIncomingItem = new EventEmitter<AirVaultItem>();
  public onDeliveryConfirmed = new EventEmitter<{ packetId: string; targetDeviceId?: string }>();
  public onPeerPaired = new EventEmitter<AirVaultDevice>();
  public onLiveTextReceived = new EventEmitter<{ text: string; senderDevice: AirVaultDevice; lineBlameMap?: LineBlameEntry[] }>();
  public onDraftActivity = new EventEmitter<{ draft: DraftActivityPayload; senderDevice: AirVaultDevice }>();
  public onDraftFinalized = new EventEmitter<{ deviceId: string }>();
  public onDraftRequest = new EventEmitter<{ senderDevice: AirVaultDevice; requestId: string }>();
  public onDraftResponse = new EventEmitter<{ senderDevice: AirVaultDevice; requestId: string; fullContent: string; lineBlameMap?: LineBlameEntry[] }>();
  public onItemBurned = new EventEmitter<{ itemId: string }>();
  public onClipboardIdReceived = new EventEmitter<string>();
  public lastPairedDevice = signal<AirVaultDevice | null>(null);

  // Viewed item debounce set to prevent repeated network calls for the same item from one client
  private viewedItemsDebounce = new Set<string>();

  /**
   * Registers a view for an item with Burn-After-Read policy.
   * Debounced per client session so opening/focusing once fires exactly one network call.
   */
  public emitItemViewed(itemId: string, category?: string) {
    if (!itemId || this.viewedItemsDebounce.has(itemId)) return;
    this.viewedItemsDebounce.add(itemId);

    const cur = this.deviceService.currentDevice();
    const localItem = this.storageService.allItems().find(i => i.id === itemId || (i.packetId && i.packetId === itemId));
    const filename = localItem?.content?.filename || localItem?.content?.raw?.slice(0, 40) || 'Item';

    // REQUIREMENT: Burn-after-read applies strictly to destination/connected devices.
    // The author/source/owner device NEVER burns its own copy when viewing.
    const isSourceDevice = localItem && (
      !localItem.originDeviceId ||
      localItem.originDeviceId === cur.id ||
      localItem.senderDeviceId === cur.id ||
      localItem.originOwnerId === cur.id ||
      (localItem.originOwnerId && (localItem.originOwnerId === cur.username || localItem.originOwnerId === `@${cur.username}`)) ||
      localItem.senderDeviceName === cur.name ||
      localItem.senderDeviceName === 'MacBook'
    );

    if (isSourceDevice) {
      AirVaultLogger.info(`[AirVault Burn] 🛡️ Owner device viewed its own item "${filename}" (${itemId}). Owner copy is protected from burning.`);
      return;
    }

    const payload = {
      itemId,
      viewerDeviceId: cur.id,
      viewerName: cur.username ? `@${cur.username}` : cur.name,
      category: category || localItem?.content?.category || 'file',
      contentType: category || localItem?.content?.category || 'file'
    };

    AirVaultLogger.info(`[AirVault Burn] 👁️ TRIGGER CAS VIEW | Destination Device "${cur.name}" (${cur.id}) triggered atomic view registration for Burn-After-Read file/item "${filename}" (${itemId})`);
    console.log(`%c[AirVault Burn: Trigger CAS View]%c Destination Device: "${cur.name}" (${cur.id}) | File/Item: "${filename}" | ID: ${itemId} | Target CAS Endpoint: /api/v1/airvault/sync/viewed`, 'background: #F59E0B; color: #000; font-weight: bold; padding: 2px 6px; border-radius: 4px;', 'color: #D97706; font-weight: normal; margin-left: 6px;');

    const triggerLocalBurn = () => {
      AirVaultLogger.info(`[AirVault Burn] 💥 ATOMIC BURN CONFIRMED | Emitting onItemBurned for Burn-After-Read item "${filename}" (${itemId}). Deletion is destination-only.`);
      console.log(`%c[AirVault Burn: Atomic CAS Confirmed]%c File/Item: "${filename}" | ID: ${itemId} | Viewer: "${cur.name}" (${cur.id}) -> Triggering card burn dissolve animation`, 'background: #DC2626; color: #fff; font-weight: bold; padding: 2px 6px; border-radius: 4px;', 'color: #DC2626; font-weight: bold; margin-left: 6px;');
      this.onItemBurned.emit({ itemId });
      // Fallback safety cleanup if card component was not mounted in the DOM to run animateBurnDissolve
      setTimeout(() => {
        if (this.storageService.allItems().some(i => i.id === itemId || (i.packetId && i.packetId === itemId))) {
          this.storageService.deleteItemLocally(itemId);
        }
      }, 1500);
    };

    // 1. Post to backend atomic CAS endpoint
    this.http.post<any>(getAirVaultApiUrl('/api/v1/airvault/sync/viewed'), payload).subscribe({
      next: (res) => {
        triggerLocalBurn();
      },
      error: (err) => {
        AirVaultLogger.warn(`[AirVault Burn] ⚠️ Backend view registration error (fallback local burn):`, err);
        triggerLocalBurn();
      }
    });
  }

  // Sync Telemetry Log store for observability
  public syncTelemetryLogs = signal<SyncTelemetryLog[]>([]);

  // Deduplication set for processed packet IDs (prevents echo loops: A -> B -> C -> A)
  private processedPacketIds = new Set<string>();

  /** 
   * Broadcasts owner global deletion across connected devices.
   * Registers tombstone globally so no device can resurrect it.
   */
  broadcastGlobalDelete(itemId: string, isBurnAfterRead: boolean = false) {
    const cur = this.deviceService.currentDevice();
    const syncEnabledDevices = this.deviceService.pairedDevices().filter(d => d.syncEnabled !== false && d.status === 'active');
    const localItem = this.storageService.allItems().find(i => i.id === itemId || (i.packetId && i.packetId === itemId));
    const filename = localItem?.content?.filename || 'Item';
    const isBurn = isBurnAfterRead || localItem?.burnAfterRead === true || localItem?.retentionTtlMs === -1;

    if (isBurn) {
      AirVaultLogger.info(`[AirVault Burn] 📡 BROADCAST GLOBAL BURN DELETE | Initiator Device: "${cur.name}" (${cur.id}) -> Broadcasting deletion of Burn-After-Read item "${filename}" (${itemId}) to ${syncEnabledDevices.length} peer(s): [${syncEnabledDevices.map(d => `"${d.name}" (${d.id})`).join(', ')}]`);
      console.log(`%c[AirVault Burn: Broadcast Delete]%c Initiator: "${cur.name}" (${cur.id}) | File: "${filename}" (${itemId}) | Peers: ${syncEnabledDevices.length} -> [${syncEnabledDevices.map(d => `"${d.name}" (${d.id})`).join(', ')}]`, 'background: #991B1B; color: #fff; font-weight: bold; padding: 2px 6px; border-radius: 4px;', 'color: #991B1B; font-weight: normal; margin-left: 6px;');
    } else {
      AirVaultLogger.info(`[AirVault Sync] 🗑️ Broadcasting RESOURCE_GLOBAL_DELETE for item ${itemId} to ${syncEnabledDevices.length} peers`);
    }

    const msg: SyncMessage = {
      type: 'ITEM_DELETE',
      itemId,
      burnAfterRead: isBurn,
      senderDevice: cur,
      timestamp: Date.now()
    };

    if (this.channel) {
      this.channel.postMessage(msg);
    }
    // Broadcast signal
    this.sendSignalMessage('ITEM_DELETE', JSON.stringify(msg), 'broadcast');

    // Also send directly to each paired peer to guarantee delivery across queues
    const paired = this.deviceService.pairedDevices().filter(d => d.syncEnabled !== false && d.status !== 'revoked');
    for (const dev of paired) {
      this.sendSignalMessage('ITEM_DELETE', JSON.stringify(msg), dev.id);
    }
  }

  /**
   * Serializes batch sub-files while restoring binary data-URLs from IndexedDB/cache
   * so receiver devices have the full payload.
   */
  private async serializeBatchFilesWithPayloads(batchFiles: AirVaultItem[]): Promise<any[]> {
    return Promise.all(batchFiles.map(async (bf) => {
      let rawPayload = bf.content?.raw;
      let previewPayload = bf.content?.previewUrl;

      if (!rawPayload || rawPayload.length === 0 || rawPayload.startsWith('blob:') || rawPayload.startsWith('[Encrypted')) {
        const cached = this.storageService.resourceCache.get(bf.id);
        let blobToUse = cached?.blob || null;
        if (!blobToUse) {
          const fetched = await this.storageService.fetchResourcePayload(bf);
          blobToUse = fetched.blob;
        }
        if (blobToUse && blobToUse.size > 0) {
          try {
            rawPayload = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blobToUse!);
            });
            if (!previewPayload && bf.content?.category === 'image') {
              previewPayload = rawPayload;
            }
          } catch { }
        }
      }

      return {
        id: bf.id,
        content: {
          ...bf.content,
          raw: rawPayload || bf.content?.raw || '',
          previewUrl: previewPayload || bf.content?.previewUrl
        },
        timestamp: bf.timestamp
      };
    }));
  }

  /** 
   * Broadcasts an existing or restored resource to all connected active devices.
   */
  async broadcastItem(item: AirVaultItem): Promise<AirVaultItem | null> {
    if (item.isBatchParent && item.batchFiles && item.batchFiles.length > 0) {
      const serializedFiles = await this.serializeBatchFilesWithPayloads(item.batchFiles);
      const batchPayload = JSON.stringify({
        isBatchParent: true,
        batchId: item.batchId || item.id,
        batchTotalCount: item.batchTotalCount || item.batchFiles.length,
        batchTotalBytes: item.batchTotalBytes || 0,
        batchFiles: serializedFiles
      });
      return this.beamContent(batchPayload, item.targetDeviceId, `${item.batchTotalCount || item.batchFiles.length} Files Batch`, item.id);
    }

    let payloadRaw = item.content.raw;
    let previewUrl = item.content.previewUrl;

    // If raw content was stripped by metadata-first tiering, fetch from cache/IndexedDB
    if (!payloadRaw || payloadRaw.length === 0 || payloadRaw.startsWith('blob:')) {
      const cached = this.storageService.resourceCache.get(item.id);
      let blobToUse: Blob | null = cached?.blob || null;
      if (!blobToUse) {
        const fetched = await this.storageService.fetchResourcePayload(item);
        blobToUse = fetched.blob;
      }
      if (blobToUse) {
        try {
          payloadRaw = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blobToUse!);
          });
          previewUrl = payloadRaw;
        } catch {
          if (cached?.objectUrl) payloadRaw = cached.objectUrl;
        }
      } else if (previewUrl && previewUrl.startsWith('data:')) {
        payloadRaw = previewUrl;
      }
    }

    // If resending a burn-after-read item, notify backend to reset CAS key for this item
    if (item.burnAfterRead || item.retentionTtlMs === -1) {
      this.http.post(getAirVaultApiUrl('/api/v1/airvault/sync/reset-burn'), { itemId: item.id }).subscribe({
        error: () => {}
      });
    }

    // Direct beam with full payload, filename, existingItemId, and byteSize
    return this.beamContent(
      payloadRaw || '',
      item.targetDeviceId,
      item.content.filename,
      item.id,
      undefined,
      undefined,
      {
        tag: item.tag,
        tagColor: item.tagColor,
        retentionTtlMs: (item.burnAfterRead || item.retentionTtlMs === -1) ? -1 : item.retentionTtlMs,
        byteSize: item.content.byteSize
      }
    );
  }

  /** Legacy alias for backwards compatibility */
  broadcastDeleteItem(itemId: string) {
    this.broadcastGlobalDelete(itemId);
  }

  /**
   * Data Isolation & Security Guard:
   * Verifies whether a sender is directly paired with this device and authorized for synchronization.
   */
  isPairedAndAuthorized(senderDev?: Partial<AirVaultDevice>): boolean {
    if (!senderDev || (!senderDev.id && !senderDev.username)) return false;
    const cur = this.deviceService.currentDevice();
    if (senderDev.id && senderDev.id === cur.id) return false;

    const senderId = (senderDev.id || '').toLowerCase().trim();
    const senderUser = (senderDev.username || '').toLowerCase().trim().replace(/^@/, '');
    const senderName = (senderDev.name || '').toLowerCase().trim().replace(/^@/, '');
    const curUser = (cur.username || '').toLowerCase().trim().replace(/^@/, '');

    // 1. Same user identity across multiple devices (e.g. laptop & phone with same username)
    if (senderUser && curUser && senderUser === curUser) {
      return true;
    }

    // 2. Direct paired devices (matched by ID, username, or name)
    const paired = this.deviceService.pairedDevices();
    const matchedPaired = paired.some(d => {
      if (d.status === 'revoked' || d.syncEnabled === false) return false;
      const dId = (d.id || '').toLowerCase().trim();
      const dUser = (d.username || '').toLowerCase().trim().replace(/^@/, '');
      const dName = (d.name || '').toLowerCase().trim().replace(/^@/, '');
      return (
        (senderId && (dId === senderId || dUser === senderId)) ||
        (senderUser && (dUser === senderUser || dId === senderUser)) ||
        (senderName && (dName === senderName || dUser === senderName))
      );
    });
    if (matchedPaired) return true;

    // 3. Registered backend sessions (if paired via server session)
    const sessions = this.deviceService.registeredSessions() || [];
    return sessions.some(s => {
      if (s.syncEnabled === false || s.status === 'revoked') return false;
      const sId = (s.id || '').toLowerCase().trim();
      const sUser = (s.username || '').toLowerCase().trim().replace(/^@/, '');
      return (senderId && sId === senderId) || (senderUser && sUser === senderUser);
    });
  }

  /** Live clipboard synchronization: broadcasts live typed/pasted clipboard text strictly to paired devices */
  broadcastLiveText(text: string, lineBlameMap?: LineBlameEntry[]) {
    const cur = this.deviceService.currentDevice();
    const syncEnabledDevices = this.deviceService.pairedDevices().filter(d => d.syncEnabled !== false && d.status !== 'revoked');

    // Always broadcast across local tabs/windows via BroadcastChannel
    const generalMsg: SyncMessage = {
      type: 'LIVE_CLIPBOARD_SYNC',
      liveText: text,
      lineBlameMap,
      senderDevice: cur,
      timestamp: Date.now()
    };
    if (this.channel) {
      this.channel.postMessage(generalMsg);
    }

    if (syncEnabledDevices.length === 0) return;

    // Direct P2P routing: Send live clipboard text to paired, sync-enabled devices
    for (const targetDev of syncEnabledDevices) {
      const filteredForTarget = this.blameService.filterAuthorizedLines(
        text,
        lineBlameMap,
        cur,
        [targetDev]
      );
      const targetMsg: SyncMessage = {
        type: 'LIVE_CLIPBOARD_SYNC',
        liveText: filteredForTarget.text || text,
        lineBlameMap: filteredForTarget.blame && filteredForTarget.blame.length > 0 ? filteredForTarget.blame : lineBlameMap,
        senderDevice: cur,
        targetDeviceId: targetDev.id,
        timestamp: Date.now()
      };

      this.sendSignalMessage('LIVE_CLIPBOARD_SYNC', JSON.stringify(targetMsg), targetDev.id);
    }
  }

  constructor() {
    this.initBroadcastChannel();
    this.initWebSocketListener();
    this.initOutboxRetryLoop();
  }

  private initOutboxRetryLoop() {
    this.ngZone.runOutsideAngular(() => {
      // Periodic retry check every 5 seconds for pending/backoff outbox packets
      setInterval(() => {
        if (this.wsTransport.connectionState() === 'CONNECTED') {
          this.flushOutboxForDevice();
        }
      }, 5000);
    });
  }

  private initWebSocketListener() {
    this.ngZone.runOutsideAngular(() => {
      this.wsTransport.onMessage$.subscribe((msg: AirVaultWsMessage) => {
        if (!msg || !msg.type) return;

        const cur = this.deviceService.currentDevice();
        if (msg.senderDeviceId && msg.senderDeviceId === cur.id) return; // Ignore own echoes

        // 1. Instant pairing signals (allow even if not previously paired)
        if (msg.type === 'PAIR_REQUEST' || msg.type === 'PAIR_CONFIRM') {
          try {
            let payload = typeof msg.payload === 'string' ? JSON.parse(msg.payload) : msg.payload;
            // If wrapped in a nested broadcast SyncMessage envelope, extract inner payload
            if (payload && payload.type && payload.payload !== undefined) {
              payload = typeof payload.payload === 'string' ? JSON.parse(payload.payload) : payload.payload;
            }
            const devFromPayload = payload?.device || payload?.senderDevice;
            this.handleMessage({
              type: msg.type,
              payload,
              senderDevice: devFromPayload || { id: msg.senderDeviceId },
              timestamp: msg.timestamp || Date.now()
            });
          } catch (err) {
            AirVaultLogger.debug('[AirVault WS Sync] Error handling pairing message', err);
          }
          return;
        }

        // 1b. Real-time security alert: New device signed into account
        if (msg.type === 'NEW_DEVICE_SIGNED_IN') {
          try {
            let payload = typeof msg.payload === 'string' ? JSON.parse(msg.payload) : msg.payload;
            const newDev = payload?.newDevice;
            const devName = newDev?.name || newDev?.type || 'A new device';
            this.ngZone.run(() => {
              this.uiStore.triggerToast(`🔒 ${devName} signed in to your account. Review in Device Drawer.`);
              this.deviceService.fetchRegisteredSessions();
            });
          } catch (err) {
            AirVaultLogger.debug('[AirVault WS Sync] Error handling NEW_DEVICE_SIGNED_IN message', err);
          }
          return;
        }

        // Resolve sender device
        let senderDev = this.deviceService.pairedDevices().find(d => d.id === msg.senderDeviceId);
        if (!senderDev && msg.senderDeviceId && msg.senderDeviceId.startsWith('peer_')) {
          senderDev = {
            id: msg.senderDeviceId,
            name: 'Remote Device',
            type: 'laptop',
            os: 'Remote OS',
            browser: 'Remote Browser',
            thumbprint: 'AV-PEER',
            ipHint: '192.168.1.1',
            status: 'active',
            lastActive: Date.now(),
            isCurrent: false,
            syncEnabled: true
          };
        }
        if (!senderDev) {
          const activeSessions = this.deviceService.registeredSessions() || [];
          senderDev = activeSessions.find(s => s.id === msg.senderDeviceId);
        }
        if (!senderDev && msg.payload) {
          try {
            const payloadObj = typeof msg.payload === 'string' ? JSON.parse(msg.payload) : msg.payload;
            if (payloadObj?.senderDevice) {
              senderDev = payloadObj.senderDevice;
            } else if (payloadObj?.device) {
              senderDev = payloadObj.device;
            }
          } catch { }
        }
        if (!senderDev && msg.senderDeviceId) {
          senderDev = {
            id: msg.senderDeviceId,
            name: 'Remote Device',
            type: 'laptop',
            os: 'Remote OS',
            browser: 'Remote Browser',
            thumbprint: 'AV-PEER',
            ipHint: '192.168.1.1',
            status: 'active',
            lastActive: Date.now(),
            isCurrent: false,
            syncEnabled: true
          };
        }

        const isPresenceOrLifecycle = msg.type === 'DEVICE_RECONNECT' || msg.type === 'DEVICE_ONLINE' || msg.type === 'PAIR_REQUEST' || msg.type === 'PAIR_CONFIRM' || msg.type === 'DEVICE_PING' || msg.type === 'DEVICE_PONG' || msg.type === 'DEVICE_REVOKE' || msg.type === 'DEVICE_DISCONNECT' || msg.type === 'DEVICE_OFFLINE' || msg.type === 'USERNAME_UPDATED';

        if (!isPresenceOrLifecycle && senderDev && (senderDev.status === 'revoked' || senderDev.syncEnabled === false || this.deviceService.isManuallyDisconnected(senderDev.id))) {
          if (msg.type === 'SYNC_PACKET' && msg.payload) {
            try {
              const packet: EncryptedPacket = typeof msg.payload === 'string' ? JSON.parse(msg.payload) : msg.payload;
              const syncId = packet.syncCorrelationId || packet.packetId?.slice(0, 6) || 'dest';
              AirVaultSyncDebugLogger.logDestinationSkipped(syncId, msg.senderDeviceId || 'unknown', 'unauthorized_or_revoked', packet.packetId);
            } catch { }
          }
          AirVaultLogger.debug(`[AirVault Security] 🛑 Dropped ${msg.type} from unauthorized/disconnected source: ${msg.senderDeviceId}`);
          return;
        }

        if (msg.type === 'SYNC_PACKET' && msg.payload) {
          try {
            const packet: EncryptedPacket = typeof msg.payload === 'string' ? JSON.parse(msg.payload) : msg.payload;
            const syncId = packet.syncCorrelationId || packet.packetId?.slice(0, 6) || 'ws';
            AirVaultSyncDebugLogger.logDestinationReceived(syncId, msg.senderDeviceId || 'unknown', packet.packetId);
            AirVaultLogger.debug(`[AirVault WS Sync] 📥 Received SYNC_PACKET (${packet.packetId}) from ${senderDev?.name || msg.senderDeviceId}`);

            this.handleMessage({
              type: 'CLIPBOARD_BEAM',
              packet,
              senderDevice: senderDev,
              targetDeviceId: msg.targetDeviceId || cur.id,
              timestamp: msg.timestamp || Date.now()
            });
          } catch (err) {
            AirVaultLogger.debug('[AirVault WS Sync] Error handling incoming SYNC_PACKET', err);
          }
        } else if (msg.type === 'SYNC_ACK') {
          try {
            const ackData = typeof msg.payload === 'string' ? JSON.parse(msg.payload) : msg.payload;
            const packetId = ackData?.packetId || (msg as any).packetId;
            if (packetId && msg.senderDeviceId) {
              this.handleMessage({
                type: 'SYNC_ACK',
                packetId,
                senderDevice: senderDev,
                targetDeviceId: msg.targetDeviceId,
                timestamp: msg.timestamp || Date.now()
              });
            }
          } catch (err) {
            AirVaultLogger.debug('[AirVault WS Sync] Error handling incoming SYNC_ACK', err);
          }
        } else if (msg.type === 'DOC_OPERATION') {
          try {
            const op: DocOperation = typeof msg.payload === 'string' ? JSON.parse(msg.payload) : msg.payload;
            this.docSyncService.applySequencedOperation(op);
          } catch (err) {
            AirVaultLogger.debug('[AirVault WS Sync] Error handling incoming DOC_OPERATION', err);
          }
        } else if (msg.type === 'INITIAL_SYNC_REQUEST' || msg.type === 'INITIAL_SYNC_BATCH' || msg.type === 'INITIAL_SYNC_TOMBSTONES' || msg.type === 'LIVE_CLIPBOARD_SYNC' || msg.type === 'DRAFT_ACTIVITY' || msg.type === 'DRAFT_FINALIZED' || msg.type === 'DRAFT_REQUEST' || msg.type === 'DRAFT_RESPONSE') {
          try {
            const parsedMsg: SyncMessage = typeof msg.payload === 'string' ? JSON.parse(msg.payload) : msg.payload;
            this.handleMessage({ ...parsedMsg, senderDevice: senderDev });
          } catch (err) {
            AirVaultLogger.debug(`[AirVault WS Sync] Error handling incoming ${msg.type}`, err);
          }
        } else if (msg.type === 'ITEM_DELETE') {
          try {
            const parsedMsg: SyncMessage = typeof msg.payload === 'string' ? JSON.parse(msg.payload) : msg.payload;
            this.handleMessage({ ...parsedMsg, senderDevice: senderDev });
          } catch (err) {
            AirVaultLogger.debug('[AirVault WS Sync] Error handling incoming ITEM_DELETE', err);
          }
        } else if (msg.type === 'USERNAME_UPDATED' || msg.type === 'DEVICE_DISCONNECT' || msg.type === 'DEVICE_RECONNECT' || msg.type === 'DEVICE_REVOKE' || msg.type === 'DEVICE_ONLINE' || msg.type === 'DEVICE_OFFLINE') {
          try {
            const payload = typeof msg.payload === 'string' ? JSON.parse(msg.payload) : msg.payload;
            this.handleMessage({
              type: msg.type,
              payload,
              senderDevice: senderDev,
              timestamp: msg.timestamp || Date.now()
            });
          } catch (err) {
            AirVaultLogger.debug(`[AirVault WS Sync] Error handling incoming ${msg.type}`, err);
          }
        } else if (msg.type === 'CLIPBOARD_ID_UPDATED') {
          try {
            const payload = typeof msg.payload === 'string' ? JSON.parse(msg.payload) : msg.payload;
            if (payload && payload.newId) {
              this.ngZone.run(() => {
                this.onClipboardIdReceived.emit(payload.newId);
              });
            }
          } catch (err) {
            AirVaultLogger.debug('[AirVault WS Sync] Error handling incoming CLIPBOARD_ID_UPDATED', err);
          }
        }
      }); // end subscribe
    }); // end runOutsideAngular
  }

  /**
   * Broadcasts updated clipboard ID to all connected peers and tabs
   */
  broadcastClipboardId(newId: string) {
    const cur = this.deviceService.currentDevice();
    const payload = { newId, senderDeviceId: cur.id };
    if (this.channel) {
      this.channel.postMessage({
        type: 'CLIPBOARD_ID_UPDATED',
        payload,
        senderDevice: cur,
        timestamp: Date.now()
      });
    }
    this.sendSignalMessage('CLIPBOARD_ID_UPDATED', JSON.stringify(payload), 'broadcast');
    const paired = this.deviceService.pairedDevices().filter(d => d.syncEnabled !== false && d.status !== 'revoked');
    for (const dev of paired) {
      this.sendSignalMessage('CLIPBOARD_ID_UPDATED', JSON.stringify(payload), dev.id);
    }
  }

  private sendSyncPacket(packet: EncryptedPacket, targetDeviceId: string, syncId?: string) {
    const payloadJson = JSON.stringify(packet);
    this.sendSignalMessage('SYNC_PACKET', payloadJson, targetDeviceId, syncId);
    AirVaultLogger.debug(`[AirVault WS Sync] ⚡ Dispatched SYNC_PACKET (${packet.packetId}) via WebSocket to ${targetDeviceId}`);
  }

  private initBroadcastChannel() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel('acklet_airvault_sync_channel');
        this.channel.onmessage = (event) => this.handleMessage(event.data);
      } catch {
        // BroadcastChannel blocked/unsupported
      }
    }
  }

  private logSyncTelemetry(entry: SyncTelemetryLog) {
    AirVaultLogger.debug(`[AirHold Telemetry] 📊 [${entry.status.toUpperCase()}] Source: ${entry.sourceDeviceId} ➔ Target: ${entry.targetDeviceId} | Items: ${entry.itemCount} | Session: ${entry.syncSessionId}`);
    this.syncTelemetryLogs.update(logs => [entry, ...logs].slice(0, 100));
  }

  /**
   * UnuClipboard-style instant pairing handshake:
   * Device A broadcasts its PIN and profile. Device B enters PIN and emits PAIR_CONFIRM.
   * Both devices automatically add each other and trigger Initial History Sync.
   */
  pairWithPin(targetPin: string, localDeviceName?: string) {
    const cur = this.deviceService.currentDevice();
    const payload = {
      pin: targetPin.trim(),
      device: {
        id: cur.id,
        name: cur.username ? `@${cur.username}` : (localDeviceName || cur.name),
        username: cur.username,
        deviceKeyword: cur.deviceKeyword,
        type: cur.type,
        os: cur.os,
        browser: cur.browser,
        thumbprint: cur.thumbprint,
        ipHint: cur.ipHint,
        status: 'active',
        lastActive: Date.now(),
        isCurrent: false,
        syncEnabled: true,
        accentColor: cur.accentColor || '#2196F3'
      }
    };

    AirVaultLogger.info(`[AirHold Pairing] 🚀 Initiating PIN pairing handshake from "${payload.device.name}" (${cur.id})`);

    // 1. Broadcast locally across tabs
    if (this.channel) {
      this.channel.postMessage({
        type: 'PAIR_REQUEST',
        payload,
        senderDevice: cur,
        timestamp: Date.now()
      });
    }

    // 2. Broadcast via network signaling relay
    this.sendSignalMessage('PAIR_REQUEST', JSON.stringify(payload), 'broadcast');
  }

  private serializeItemForSync(it: AirVaultItem, curDevice: AirVaultDevice): string {
    const curHandle = curDevice.username ? `@${curDevice.username}` : (curDevice.name || 'User');
    const localAuthorColor = this.colorService.getColorForIdentity(curDevice.username || curDevice.id, curDevice.accentColor, true);

    if (it.isBatchParent && it.batchFiles && it.batchFiles.length > 0) {
      return JSON.stringify({
        isBatchParent: true,
        batchId: it.batchId || it.id,
        batchTotalCount: it.batchTotalCount || it.batchFiles.length,
        batchTotalBytes: it.batchTotalBytes || 0,
        raw: it.content?.raw,
        batchFiles: it.batchFiles.map(bf => ({
          id: bf.id,
          content: bf.content,
          timestamp: bf.timestamp
        })),
        resendCount: it.resendCount,
        lastResentAt: it.lastResentAt,
        isResend: !!(it.resendCount && it.resendCount > 0),
        tag: it.tag,
        tagColor: it.tagColor,
        retentionTtlMs: it.retentionTtlMs,
        burnAfterRead: it.burnAfterRead || it.retentionTtlMs === -1,
        originDeviceId: it.originDeviceId || it.senderDeviceId || curDevice.id,
        originDeviceName: it.senderDeviceName || curDevice.name,
        originOwnerId: it.originOwnerId || it.senderDeviceName || curHandle,
        senderDeviceId: it.senderDeviceId || it.originDeviceId || curDevice.id,
        senderDeviceName: it.senderDeviceName || curHandle,
        senderUsername: it.originOwnerId?.replace(/^@/, '') || curDevice.username || '',
        senderDeviceAccent: it.senderDeviceAccent || it.authorColor || localAuthorColor,
        authorColor: it.authorColor || it.senderDeviceAccent || localAuthorColor,
        senderDeviceType: it.senderDeviceType || curDevice.type
      });
    }

    return JSON.stringify({
      raw: it.content.raw,
      category: it.content.category,
      filename: it.content.filename,
      language: it.content.language,
      previewUrl: it.content.previewUrl,
      byteSize: it.content.byteSize || 0,
      lineBlameMap: it.content.lineBlameMap,
      resendCount: it.resendCount,
      lastResentAt: it.lastResentAt,
      isResend: !!(it.resendCount && it.resendCount > 0),
      tag: it.tag,
      tagColor: it.tagColor,
      retentionTtlMs: it.retentionTtlMs,
      burnAfterRead: it.burnAfterRead || it.retentionTtlMs === -1,
      originDeviceId: it.originDeviceId || it.senderDeviceId || curDevice.id,
      originDeviceName: it.senderDeviceName || curDevice.name,
      originOwnerId: it.originOwnerId || it.senderDeviceName || curHandle,
      senderDeviceId: it.senderDeviceId || it.originDeviceId || curDevice.id,
      senderDeviceName: it.senderDeviceName || curHandle,
      senderUsername: it.originOwnerId?.replace(/^@/, '') || curDevice.username || '',
      senderDeviceAccent: it.senderDeviceAccent || it.authorColor || localAuthorColor,
      authorColor: it.authorColor || it.senderDeviceAccent || localAuthorColor,
      senderDeviceType: it.senderDeviceType || curDevice.type
    });
  }

  /**
   * Initiates multi-device initial synchronization with a connected/paired peer.
   * Prompts the Sync Progress Modal and exchanges eligible history without overwriting.
   */
  async initiateDeviceSync(targetDevice: AirVaultDevice) {
    const cur = this.deviceService.currentDevice();
    const syncSessionId = 'sync_' + Date.now().toString(36);

    AirVaultLogger.info(`[AirVault Sync] 🔄 Starting Initial Sync with "${targetDevice.name}" (${targetDevice.id}). Session: ${syncSessionId}`);

    if (targetDevice.syncEnabled === false) {
      AirVaultLogger.warn(`[AirVault Sync] 🚫 Device "${targetDevice.name}" has sync disabled. Skipping initial sync.`);
      this.logSyncTelemetry({
        syncSessionId,
        sourceDeviceId: cur.id,
        targetDeviceId: targetDevice.id,
        itemCount: 0,
        status: 'skipped_disabled',
        timestamp: Date.now()
      });
      return;
    }

    // Background Initial Sync: no modal popup, sync quietly in background
    AirVaultLogger.debug(`[AirVault Sync] 🔄 Starting silent background initial sync with ${targetDevice.name}...`);

    // 1. Send tombstone list as a single batched signal so reconnecting device immediately removes deleted items
    const tombstones = Array.from(this.storageService.tombstones());
    if (tombstones.length > 0) {
      const tombBatchMsg: SyncMessage = {
        type: 'INITIAL_SYNC_TOMBSTONES',
        tombstones,
        senderDevice: cur,
        targetDeviceId: targetDevice.id,
        timestamp: Date.now()
      };
      if (this.channel) this.channel.postMessage(tombBatchMsg);
      this.sendSignalMessage('INITIAL_SYNC_TOMBSTONES', JSON.stringify(tombBatchMsg), targetDevice.id);
    }

    // 1. Collect all active vault items to sync (skip tombstoned items)
    const localOriginItems = this.storageService.items().filter(it =>
      !this.storageService.isTombstoned(it.id)
    );
    const totalItems = localOriginItems.length;

    // 2. Set progress modal state
    this.ngZone.run(() => {
      this.uiStore.syncModalProgress.set({
        totalCount: totalItems,
        syncedCount: 0,
        status: 'syncing'
      });
    });

    // 3. Step 1: Handshake request
    const reqMsg: SyncMessage = {
      type: 'INITIAL_SYNC_REQUEST',
      senderDevice: cur,
      targetDeviceId: targetDevice.id,
      timestamp: Date.now()
    };
    if (this.channel) this.channel.postMessage(reqMsg);
    this.sendSignalMessage('INITIAL_SYNC_REQUEST', JSON.stringify(reqMsg), targetDevice.id);

    // 4. Step 3: Beam local history items in chunks
    const chunkSize = 5;
    let sentCount = 0;

    for (let i = 0; i < localOriginItems.length; i += chunkSize) {
      const chunk = localOriginItems.slice(i, i + chunkSize);
      const encryptedPackets: EncryptedPacket[] = [];

      for (const it of chunk) {
        if (this.storageService.isTombstoned(it.id)) continue;
        try {
          const payloadString = this.serializeItemForSync(it, cur);
          const packet = await this.crypto.encryptPayload(payloadString, it.senderDeviceId || cur.id, targetDevice.id);
          packet.packetId = it.id;
          encryptedPackets.push(packet);
        } catch (e) {
          AirVaultLogger.warn('[AirVault Sync] Failed to encrypt item for sync:', e);
        }
      }

      const batchMsg: SyncMessage = {
        type: 'INITIAL_SYNC_BATCH',
        items: encryptedPackets,
        batchIndex: Math.floor(i / chunkSize),
        totalBatches: Math.ceil(localOriginItems.length / chunkSize),
        totalItems,
        senderDevice: cur,
        targetDeviceId: targetDevice.id,
        timestamp: Date.now()
      };

      if (this.channel) this.channel.postMessage(batchMsg);
      this.sendSignalMessage('INITIAL_SYNC_BATCH', JSON.stringify(batchMsg), targetDevice.id);

      sentCount += chunk.length;
      this.ngZone.run(() => {
        this.uiStore.syncModalProgress.update(p => ({
          ...p,
          syncedCount: sentCount,
          totalCount: totalItems
        }));
      });

      // Non-blocking yield to keep UI responsive
      await new Promise(resolve => setTimeout(resolve, 80));
    }

    // 5. Complete sync state
    this.ngZone.run(() => {
      this.uiStore.syncModalProgress.update(p => ({
        ...p,
        status: 'synced',
        syncedCount: totalItems,
        totalCount: totalItems
      }));
    });

    this.logSyncTelemetry({
      syncSessionId,
      sourceDeviceId: cur.id,
      targetDeviceId: targetDevice.id,
      itemCount: totalItems,
      status: 'success',
      timestamp: Date.now()
    });

    AirVaultLogger.info(`[AirVault Sync] ✅ Initial Sync complete with "${targetDevice.name}" (${totalItems} items sent).`);
  }

  async beamContent(
    plaintext: string,
    targetDeviceId?: string,
    filename?: string,
    existingItemId?: string,
    lineBlameMap?: LineBlameEntry[],
    syncCorrelationId?: string,
    options?: { tag?: string; tagColor?: string; customCategory?: string; retentionTtlMs?: number; byteSize?: number }
  ): Promise<AirVaultItem> {
    const syncId = syncCorrelationId || AirVaultSyncDebugLogger.createCorrelationId();
    if (!AirVaultSyncDebugLogger.getElapsedMs(syncId)) {
      AirVaultSyncDebugLogger.startTimer(syncId);
    }

    const curDevice = this.deviceService.currentDevice();
    const curHandle = curDevice.username ? `@${curDevice.username}` : (curDevice.name || 'User');
    const localAuthorColor = this.colorService.getColorForIdentity(curDevice.username || curDevice.id, curDevice.accentColor, true);

    let isBatch = false;
    let batchData: any = null;
    try {
      const parsed = JSON.parse(plaintext);
      if (parsed && (parsed.isBatchParent || Array.isArray(parsed.batchFiles))) {
        isBatch = true;
        batchData = parsed;
      }
    } catch { }

    if (!isBatch && existingItemId) {
      const existingItem = this.storageService.allItems().find(i => i.id === existingItemId);
      if (existingItem?.isBatchParent) {
        isBatch = true;
        const serializedFiles = await this.serializeBatchFilesWithPayloads(existingItem.batchFiles || []);
        batchData = {
          isBatchParent: true,
          batchId: existingItem.id,
          batchTotalCount: existingItem.batchTotalCount || existingItem.batchFiles?.length || 0,
          batchTotalBytes: existingItem.batchTotalBytes || 0,
          batchFiles: serializedFiles
        };
      }
    }

    let payloadString: string;
    let classified: ClassifiedContent;

    if (isBatch) {
      const count = batchData.batchTotalCount || batchData.batchFiles?.length || 0;
      const bytes = batchData.batchTotalBytes || 0;
      const existingParent = existingItemId ? this.storageService.allItems().find(i => i.id === existingItemId) : null;
      const resolvedRaw = (batchData.raw && batchData.raw.trim())
        ? batchData.raw
        : (existingParent?.content?.raw && !/^Batch of \d+ files/i.test(existingParent.content.raw) ? existingParent.content.raw : `Batch of ${count} files (${((bytes || 0) / 1024 / 1024).toFixed(1)} MB)`);

      classified = {
        category: 'archive',
        raw: resolvedRaw,
        filename: `${count} Files Batch`,
        byteSize: bytes,
        isSensitive: false,
        collapseState: 'collapsed'
      };
      const existingItemForResend = existingItemId ? this.storageService.allItems().find(i => i.id === existingItemId) : null;
      payloadString = JSON.stringify({
        isBatchParent: true,
        batchId: batchData.batchId || existingItemId,
        batchTotalCount: count,
        batchTotalBytes: bytes,
        raw: resolvedRaw,
        batchFiles: batchData.batchFiles || [],
        resendCount: existingItemForResend?.resendCount,
        lastResentAt: existingItemForResend?.lastResentAt,
        isResend: !!(existingItemForResend?.resendCount && existingItemForResend.resendCount > 0),
        tag: options?.tag,
        tagColor: options?.tagColor,
        retentionTtlMs: options?.retentionTtlMs,
        burnAfterRead: options?.retentionTtlMs === -1 || existingItemForResend?.burnAfterRead === true,
        originDeviceId: curDevice.id,
        originDeviceName: curDevice.name,
        originOwnerId: curHandle,
        senderDeviceId: curDevice.id,
        senderDeviceName: curHandle,
        senderUsername: curDevice.username || '',
        senderDeviceAccent: localAuthorColor,
        authorColor: localAuthorColor,
        senderDeviceType: curDevice.type
      });
    } else {
      classified = this.clipboardService.classify(plaintext, filename);
      if (options?.customCategory) {
        classified.category = options.customCategory as any;
      }
      if (options?.byteSize) {
        classified.byteSize = options.byteSize;
      }
      const existingItemForPayload = existingItemId ? this.storageService.allItems().find(i => i.id === existingItemId) : null;
      if (existingItemForPayload?.content) {
        if (!classified.previewUrl && existingItemForPayload.content.previewUrl) {
          classified.previewUrl = existingItemForPayload.content.previewUrl;
        }
        if (!classified.filename && existingItemForPayload.content.filename) {
          classified.filename = existingItemForPayload.content.filename;
        }
        if (existingItemForPayload.content.byteSize && !classified.byteSize) {
          classified.byteSize = existingItemForPayload.content.byteSize;
        }
      }
      if (!classified.previewUrl && classified.category === 'image' && classified.raw) {
        classified.previewUrl = classified.raw;
      }
      const isText = ['text', 'code', 'json', 'url', 'markdown'].includes(classified.category);
      if (isText) {
        const curAuthor = curDevice.username ? `@${curDevice.username}` : (curDevice.name || 'User');
        const curColor = this.colorService.getColorForIdentity(curDevice.username || curDevice.id, curDevice.accentColor);
        if (lineBlameMap && lineBlameMap.length > 0) {
          classified.lineBlameMap = lineBlameMap;
        } else {
          classified.lineBlameMap = this.blameService.buildInitialBlame(classified.raw, curDevice.username || curDevice.id, curColor, curAuthor);
        }
      }
      payloadString = JSON.stringify({
        raw: classified.raw,
        category: classified.category,
        filename: classified.filename,
        language: classified.language,
        previewUrl: classified.previewUrl,
        byteSize: classified.byteSize,
        lineBlameMap: classified.lineBlameMap,
        resendCount: existingItemForPayload?.resendCount,
        lastResentAt: existingItemForPayload?.lastResentAt,
        isResend: !!(existingItemForPayload?.resendCount && existingItemForPayload.resendCount > 0),
        tag: options?.tag,
        tagColor: options?.tagColor,
        retentionTtlMs: options?.retentionTtlMs,
        burnAfterRead: options?.retentionTtlMs === -1 || existingItemForPayload?.burnAfterRead === true,
        originDeviceId: curDevice.id,
        originDeviceName: curDevice.name,
        originOwnerId: curHandle,
        senderDeviceId: curDevice.id,
        senderDeviceName: curHandle,
        senderUsername: curDevice.username || '',
        senderDeviceAccent: localAuthorColor,
        authorColor: localAuthorColor,
        senderDeviceType: curDevice.type
      });
    }

    const packet = await this.crypto.encryptPayload(payloadString, curDevice.id, targetDeviceId);
    packet.syncCorrelationId = syncId;
    if (existingItemId) {
      packet.packetId = existingItemId;
    }

    AirVaultSyncDebugLogger.logPacketCreated(syncId, packet.packetId, 'SYNC_PACKET', classified.category);

    // Register local packet ID to prevent self-echo loopback
    this.markPacketProcessed(packet.packetId);

    const allPaired = this.deviceService.pairedDevices();
    const activeSessions = (this.deviceService.registeredSessions() || []).filter(s => s.id !== curDevice.id);

    const peerMap = new Map<string, AirVaultDevice>();
    for (const d of allPaired) {
      if (d.id !== curDevice.id && d.status !== 'revoked' && d.syncEnabled !== false && !this.deviceService.isManuallyDisconnected(d.id)) {
        peerMap.set(d.id, d);
      }
    }
    for (const s of activeSessions) {
      if (s.id !== curDevice.id && s.status !== 'revoked' && s.syncEnabled !== false && !this.deviceService.isManuallyDisconnected(s.id) && !peerMap.has(s.id)) {
        peerMap.set(s.id, s);
      }
    }
    const eligiblePeers = Array.from(peerMap.values());

    AirVaultLogger.info(`[AirVault Sync] 📡 Beaming content "${classified.filename || classified.category}" (${packet.packetId}) to ${eligiblePeers.length} eligible peer(s)`);

    // If specific target selected, verify target is not disabled
    if (targetDeviceId) {
      const targetDev = allPaired.find(d => d.id === targetDeviceId);
      if (targetDev && targetDev.syncEnabled === false) {
        AirVaultLogger.warn(`[AirVault Sync] 🚫 Target device ${targetDeviceId} is disabled from sync. Skipping transmission.`);
      }
    }

    const localItem: AirVaultItem = {
      id: packet.packetId,
      packetId: packet.packetId,
      sequenceNumber: packet.sequenceNumber,
      originDeviceId: curDevice.id,
      originOwnerId: curDevice.username || curDevice.id,
      senderDeviceId: curDevice.id,
      senderDeviceName: curHandle,
      senderDeviceAccent: localAuthorColor,
      authorColor: localAuthorColor,
      author_color: localAuthorColor,
      senderDeviceType: curDevice.type,
      targetDeviceId,
      content: classified,
      timestamp: packet.timestamp,
      isPinned: false,
      tag: options?.tag,
      tagColor: options?.tagColor,
      retentionTtlMs: options?.retentionTtlMs,
      burnAfterRead: options?.retentionTtlMs === -1,
      deliveryStatus: eligiblePeers.length > 0 ? 'pending' : 'delivered',
      isBatchParent: isBatch ? true : undefined,
      batchId: isBatch ? (batchData.batchId || packet.packetId) : undefined,
      batchFiles: isBatch ? (batchData.batchFiles?.map((bf: any) => ({
        id: bf.id,
        originDeviceId: curDevice.id,
        originOwnerId: curDevice.username || curDevice.id,
        senderDeviceId: curDevice.id,
        senderDeviceName: curHandle,
        senderDeviceAccent: localAuthorColor,
        authorColor: localAuthorColor,
        author_color: localAuthorColor,
        senderDeviceType: curDevice.type,
        content: bf.content,
        timestamp: bf.timestamp || packet.timestamp,
        isPinned: false,
        deliveryStatus: eligiblePeers.length > 0 ? 'pending' : 'delivered',
        processingState: 'done'
      }))) : undefined,
      batchTotalCount: isBatch ? (batchData.batchTotalCount || batchData.batchFiles?.length || 0) : undefined,
      batchTotalBytes: isBatch ? batchData.batchTotalBytes : undefined,
      batchCompletedCount: isBatch ? (batchData.batchFiles?.length || 0) : undefined
    };

    // Store locally for persistence only if it doesn't already exist or belong to a batch
    const alreadyExists = existingItemId && (
      this.storageService.items().some(i => i.id === existingItemId) ||
      this.storageService.isItemInBatch(existingItemId)
    );
    if (!alreadyExists) {
      this.storageService.addItem(localItem, { isExplicitRestore: true });
      AirVaultLogger.debug(`[AirVault Sync] Auto-save completed: ${localItem.id}`);
    }

    // Broadcast across local browser tabs
    if (this.channel) {
      const msg: SyncMessage = {
        type: 'CLIPBOARD_BEAM',
        packet,
        senderDevice: curDevice,
        targetDeviceId,
        timestamp: Date.now()
      };
      this.channel.postMessage(msg);
    }

    // Send via network relay mailbox to destination(s)
    const outboxRecord: any = {
      packetId: packet.packetId,
      itemId: localItem.id,
      packet,
      sourceDeviceId: curDevice.id,
      targetDeviceId: targetDeviceId || (eligiblePeers.length > 0 ? eligiblePeers.map(p => p.id).join(',') : 'broadcast'),
      status: 'SENDING',
      retryCount: 0,
      maxRetries: 5,
      nextRetryAt: Date.now() + 5000,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.storageService.saveOutboxRecord(outboxRecord);

    if (localItem.burnAfterRead) {
      const targetSummary = targetDeviceId ? `Target: ${targetDeviceId}` : (eligiblePeers.length > 0 ? `Eligible Peers: [${eligiblePeers.map(p => `"${p.name}" (${p.id})`).join(', ')}]` : 'Broadcast to all');
      AirVaultLogger.info(`[AirVault Burn] 🚀 SENDER BEAMING | Sending Burn-After-Read ${classified.category} "${classified.filename || 'Item'}" (ID: ${localItem.id}, Packet: ${packet.packetId}) from Source Device: "${curDevice.name}" (${curDevice.id}) -> Destination(s): ${targetSummary}`);
      console.log(`%c[AirVault Burn: Sender Beaming]%c File/Item: "${classified.filename || 'Item'}" | Category: ${classified.category} | ID: ${localItem.id} | Sender: "${curDevice.name}" (${curDevice.id}) | Destination: ${targetSummary} | Policy: Burn-After-Read (1 view)`, 'background: #DC2626; color: #fff; font-weight: bold; padding: 2px 6px; border-radius: 4px;', 'color: #DC2626; font-weight: normal; margin-left: 6px;');
    }

    if (targetDeviceId) {
      const targetDev = allPaired.find(d => d.id === targetDeviceId);
      if (targetDev && targetDev.syncEnabled === false) {
        AirVaultSyncDebugLogger.logSendSkipped(syncId, 'target_sync_disabled', targetDeviceId);
      } else if (targetDev && this.deviceService.isManuallyDisconnected(targetDeviceId)) {
        AirVaultSyncDebugLogger.logSendSkipped(syncId, 'target_manually_disconnected', targetDeviceId);
      } else {
        AirVaultSyncDebugLogger.logSending(syncId, targetDeviceId);
        AirVaultLogger.debug(`[AirVault Sync] Sending item ${packet.packetId} to targeted device ${targetDeviceId}`);
        this.sendSyncPacket(packet, targetDeviceId, syncId);
      }
    } else if (eligiblePeers.length > 0) {
      // Send to each eligible peer device
      for (const dev of eligiblePeers) {
        AirVaultSyncDebugLogger.logSending(syncId, dev.id);
        AirVaultLogger.debug(`[AirVault Sync] Sending item ${packet.packetId} to peer device ${dev.id}`);
        this.sendSyncPacket(packet, dev.id, syncId);
      }
    } else {
      AirVaultSyncDebugLogger.logSending(syncId, 'broadcast');
      AirVaultLogger.debug(`[AirVault Sync] 📡 Broadcasting item ${packet.packetId} via WebSocket relay`);
      this.sendSyncPacket(packet, 'broadcast', syncId);
    }

    return localItem;
  }

  /** Flushes any queued offline packets when a peer reconnects */
  async flushOutboxForDevice(deviceId?: string) {
    const pending = await this.storageService.getPendingOutboxRecords(deviceId);
    if (pending.length === 0) return;

    AirVaultLogger.info(`[AirVault Sync] 📤 Flushing ${pending.length} durable outbox record(s) ${deviceId ? `for device ${deviceId}` : ''}`);

    const cur = this.deviceService.currentDevice();
    const now = Date.now();

    for (const record of pending) {
      // If the resource or packet was tombstoned/deleted globally, immediately purge from outbox and skip
      if (this.storageService.isTombstoned(record.itemId) || this.storageService.isTombstoned(record.packetId)) {
        await this.storageService.purgeOutboxRecord(record.packetId);
        continue;
      }

      if (record.retryCount >= record.maxRetries) {
        record.status = 'FAILED';
        record.updatedAt = now;
        await this.storageService.updateOutboxRecord(record);
        continue;
      }

      const syncId = record.packet?.syncCorrelationId || record.packetId?.slice(0, 6) || 'outbox';
      const target = deviceId || record.targetDeviceId || 'broadcast';

      AirVaultSyncDebugLogger.logSending(syncId, target);
      this.sendSyncPacket(record.packet, target, syncId);

      if (this.channel) {
        this.channel.postMessage({
          type: 'CLIPBOARD_BEAM',
          packet: record.packet,
          senderDevice: cur,
          targetDeviceId: target,
          timestamp: now
        });
      }

      record.retryCount++;
      record.status = 'WAITING_ACK';
      record.lastAttemptAt = now;
      // Exponential backoff: 3s, 6s, 12s, 24s...
      record.nextRetryAt = now + (3000 * Math.pow(2, record.retryCount - 1));
      record.updatedAt = now;
      await this.storageService.updateOutboxRecord(record);
      this.storageService.updateDeliveryStatus(record.packetId, 'pending');
    }
  }

  private async handleMessage(msg: any, options?: { isBatch?: boolean }) {
    if (!msg || !msg.type) return;

    const cur = this.deviceService.currentDevice();

    // ── Instant P2P Pairing Handshake (UnuClipboard Model) ──
    if (msg.type === 'PAIR_REQUEST' && msg.payload) {
      const localPin = (this.deviceService.ephemeralPin() || '').trim();
      const remotePin = (msg.payload.pin || '').trim();
      const remoteDevice = msg.payload.device;

      AirVaultLogger.info(`[AirHold Pairing] 📥 [PAIR_REQUEST] Remote: "${remoteDevice?.name}" (${remoteDevice?.id}) | Self ID: "${cur.id}"`);

      // Check if incoming request matches this device's PIN
      const pinMatches = remotePin.length > 0 && remotePin === localPin;
      const isDifferentDevice = remoteDevice && remoteDevice.id !== cur.id;

      if (pinMatches) {
        if (!isDifferentDevice) {
          AirVaultLogger.warn(`[AirHold Pairing] ⚠️ Remote device has identical ID ("${cur.id}"). Generating distinct peer ID for dual-tab/same-origin session.`);
          remoteDevice.id = 'peer_' + Date.now().toString(36);
        }

        AirVaultLogger.info(`[AirHold Pairing] ✅ Handshake Verified! Pairing with "${remoteDevice.name}" (${remoteDevice.id}). Emitting onPeerPaired...`);

        this.ngZone.run(() => {
          this.deviceService.addPairedDevice(remoteDevice);
          this.lastPairedDevice.set(remoteDevice);
          this.onPeerPaired.emit(remoteDevice);
        });

        // Send back PAIR_CONFIRM so initiating scanner also finishes handshake
        const confirmPayload = {
          targetDeviceId: remoteDevice.id,
          device: {
            id: cur.id,
            name: cur.username ? `@${cur.username}` : cur.name,
            username: cur.username,
            deviceKeyword: cur.deviceKeyword,
            type: cur.type,
            os: cur.os,
            browser: cur.browser,
            thumbprint: cur.thumbprint,
            ipHint: cur.ipHint,
            status: 'active',
            lastActive: Date.now(),
            isCurrent: false,
            syncEnabled: true,
            accentColor: cur.accentColor || '#2196F3'
          }
        };

        if (this.channel) {
          this.channel.postMessage({
            type: 'PAIR_CONFIRM',
            payload: confirmPayload,
            senderDevice: cur,
            timestamp: Date.now()
          });
        }
        this.sendSignalMessage('PAIR_CONFIRM', JSON.stringify(confirmPayload), remoteDevice.id);
        AirVaultLogger.info(`[AirHold Pairing] 📤 Sent PAIR_CONFIRM response to ${remoteDevice.id}`);

        // Prompt user with Sync Consent choice ("Sync" vs "Ignore/Skip") on destination device
        this.ngZone.run(() => {
          this.uiStore.openSyncConsent(remoteDevice);
        });
      } else {
        AirVaultLogger.warn(`[AirHold Pairing] ❌ PIN Mismatch. Pairing request ignored.`);
      }
      return;
    } else if (msg.type === 'PAIR_CONFIRM' && msg.payload) {
      const targetUser = msg.payload.targetUsername;
      const isTargetedToMe = !msg.payload.targetDeviceId ||
        msg.payload.targetDeviceId === cur.id ||
        msg.payload.targetDeviceId === 'broadcast' ||
        (targetUser && cur.username && targetUser.toLowerCase() === cur.username.toLowerCase());

      if (isTargetedToMe && msg.payload.device && msg.payload.device.id !== cur.id) {
        const remoteDevice = msg.payload.device;
        AirVaultLogger.info(`[AirHold Pairing] 🎉 Received PAIR_CONFIRM from remote device: "${remoteDevice.name}" (${remoteDevice.id})! Establishing connection.`);
        this.ngZone.run(() => {
          this.deviceService.clearManualDisconnect(remoteDevice.id);
          this.deviceService.addPairedDevice(remoteDevice);
          this.deviceService.setDeviceStatus(remoteDevice.id, 'active');
          this.deviceService.fetchRegisteredSessions();
          this.lastPairedDevice.set(remoteDevice);
          this.onPeerPaired.emit(remoteDevice);
        });

        // Send confirmation back so initiator also marks as online/active
        const ackPayload = {
          targetDeviceId: remoteDevice.id,
          device: {
            id: cur.id,
            name: cur.username ? `@${cur.username}` : cur.name,
            username: cur.username,
            deviceKeyword: cur.deviceKeyword,
            type: cur.type,
            os: cur.os,
            browser: cur.browser,
            thumbprint: cur.thumbprint,
            ipHint: cur.ipHint,
            status: 'active',
            lastActive: Date.now(),
            isCurrent: false,
            syncEnabled: true,
            accentColor: cur.accentColor || '#2196F3'
          }
        };
        this.sendSignalMessage('DEVICE_ONLINE', JSON.stringify({ deviceId: cur.id, senderDevice: ackPayload.device }), remoteDevice.id);

        // Prompt user with Sync Consent choice ("Sync" vs "Ignore/Skip") on destination device
        this.ngZone.run(() => {
          this.uiStore.openSyncConsent(remoteDevice);
        });
      }
      return;
    }

    // ── Instant Presence Signals ──
    if (msg.type === 'DEVICE_ONLINE') {
      const senderDev = msg.senderDevice || msg.payload?.senderDevice;
      if (senderDev && senderDev.id !== cur.id) {
        const cleanSenderUser = (senderDev.username || senderDev.name || '').toLowerCase().replace(/^@/, '');
        const existing = this.deviceService.pairedDevices().find(d => {
          const cleanUser = (d.username || d.name || '').toLowerCase().replace(/^@/, '');
          return d.id === senderDev.id || (cleanUser && cleanSenderUser && cleanUser === cleanSenderUser);
        });

        if (existing) {
          const isManuallyOff = this.deviceService.isManuallyDisconnected(existing.id);
          if (!isManuallyOff) {
            const wasInactive = existing.status !== 'active';
            this.ngZone.run(() => {
              this.deviceService.setDeviceStatus(existing.id, 'active');
            });
            if (wasInactive) {
              AirVaultLogger.info(`[AirVault Sync] ✅ Peer ${existing.id} (@${existing.username || existing.name}) transitioned to ONLINE.`);

              // Symmetrically reply with our DEVICE_ONLINE presence so the remote peer immediately detects us too
              const ackPresencePayload = {
                deviceId: cur.id,
                senderDevice: cur,
                timestamp: Date.now()
              };
              this.sendSignalMessage('DEVICE_ONLINE', JSON.stringify(ackPresencePayload), senderDev.id);

              this.flushOutboxForDevice(existing.id);

              // Auto-sync: beam local history items to the newly online peer so they receive any items created while offline
              if (existing.syncEnabled !== false) {
                AirVaultLogger.info(`[AirVault Sync] ⚡ Auto-synchronizing latest vault items with newly online peer ${existing.name}...`);
                this.initiateDeviceSync(existing);
              }
            }
          }
        } else if (cleanSenderUser && cur.username && cleanSenderUser === cur.username.toLowerCase().replace(/^@/, '')) {
          this.ngZone.run(() => {
            this.deviceService.addPairedDevice(senderDev);
            this.deviceService.setDeviceStatus(senderDev.id, 'active');
          });
          const ackPresencePayload = {
            deviceId: cur.id,
            senderDevice: cur,
            timestamp: Date.now()
          };
          this.sendSignalMessage('DEVICE_ONLINE', JSON.stringify(ackPresencePayload), senderDev.id);

          this.initiateDeviceSync(senderDev);
        } else {
          // If not in pairedDevices list yet, update in registeredSessions if present
          this.ngZone.run(() => {
            this.deviceService.setDeviceStatus(senderDev.id || cleanSenderUser, 'active');
          });
        }
      }
      return;
    } else if (msg.type === 'DEVICE_OFFLINE') {
      const senderDev = msg.senderDevice || msg.payload?.senderDevice;
      if (senderDev && senderDev.id !== cur.id) {
        AirVaultLogger.info(`[AirVault Sync] 📴 Peer ${senderDev.id} (@${senderDev.username || senderDev.name}) went offline.`);
        this.ngZone.run(() => this.deviceService.setDeviceStatus(senderDev.id, 'offline'));
      }
      return;
    }

    // ── Dedicated Revocation Handling (bypasses pairing gate) ──
    if (msg.type === 'DEVICE_REVOKE') {
      const payload = typeof msg.payload === 'string' ? JSON.parse(msg.payload || '{}') : (msg.payload || {});
      const targetId = payload?.targetDeviceId || (msg as any).targetDeviceId || msg.senderDevice?.id;
      const eraseData = payload?.eraseData === true || (msg as any).eraseData === true;
      const senderId = msg.senderDevice?.id;

      AirVaultLogger.warn(`[AirVault Sync] 🚨 Processing DEVICE_REVOKE: targetId=${targetId}, senderId=${senderId}, curId=${cur.id}, eraseData=${eraseData}`);

      if (targetId === cur.id) {
        // 1. THIS device's session was logged out remotely!
        this.ngZone.run(() => {
          this.deviceService.pairedDevices().forEach(p => {
            this.deviceService.disconnectDevice(p.id);
          });
          this.deviceService.pairedDevices.set([]);
          this.deviceService.saveStoredDevices();
          this.deviceService.registeredSessions.set([]);

          if (eraseData) {
            this.storageService.clearAllLocally();
            this.uiStore.triggerToast(`🔒 Session revoked & all local vault data wiped by remote owner.`);
          } else {
            this.uiStore.triggerToast(`🔒 AirVault session logged out remotely.`);
          }

          this.deviceService.completeGuestOnboarding();
          this.deviceService.fetchRegisteredSessions();
        });
      } else {
        // 2. A remote peer or session was logged out / revoked
        const peerId = targetId || senderId;
        if (peerId && peerId !== cur.id) {
          this.ngZone.run(() => {
            this.deviceService.disconnectDevice(peerId);
            this.deviceService.pairedDevices.update(list => list.filter(d => d.id !== peerId));
            this.deviceService.saveStoredDevices();
            this.deviceService.registeredSessions.update(list => list.filter(d => d.id !== peerId));
          });
        }
      }
      return;
    }

    // ── Universal Security & Data Isolation Gate ──
    // Reject any non-pairing sync message from an un-paired or revoked device
    if (!this.isPairedAndAuthorized(msg.senderDevice)) {
      return;
    }

    // Auto-maintain deviceName : accentColor in localStorage for authorized peer devices
    if (msg.senderDevice) {
      this.colorService.registerDeviceAccent(
        msg.senderDevice.name,
        msg.senderDevice.accentColor,
        msg.senderDevice.username,
        msg.senderDevice.id,
        false
      );
    }

    // ── Initial Sync Protocol ──
    if (msg.type === 'INITIAL_SYNC_REQUEST') {
      if (msg.senderDevice.id === cur.id) return;
      AirVaultLogger.info(`[AirVault Sync] 📥 Received INITIAL_SYNC_REQUEST from ${msg.senderDevice.name} (${msg.senderDevice.id}). Responding with local history.`);

      const remoteDevice = this.deviceService.pairedDevices().find(d => d.id === msg.senderDevice.id) || msg.senderDevice;
      if (remoteDevice.syncEnabled !== false) {
        // Send active history in response (skip tombstoned items)
        const localItems = this.storageService.items().filter(it =>
          !this.storageService.isTombstoned(it.id)
        );
        for (const it of localItems) {
          try {
            const payloadString = this.serializeItemForSync(it, cur);
            const packet = await this.crypto.encryptPayload(payloadString, it.senderDeviceId || cur.id, msg.senderDevice.id);
            packet.packetId = it.id;
            const singleMsg: SyncMessage = {
              type: 'CLIPBOARD_BEAM',
              packet,
              senderDevice: cur,
              targetDeviceId: msg.senderDevice.id,
              timestamp: Date.now()
            };
            if (this.channel) this.channel.postMessage(singleMsg);
            this.sendSignalMessage('SYNC_PACKET', JSON.stringify(packet), msg.senderDevice.id);
          } catch (e) { }
        }
      }
    } else if (msg.type === 'INITIAL_SYNC_BATCH' && Array.isArray(msg.items)) {
      if (msg.senderDevice.id === cur.id) return;
      AirVaultLogger.info(`[AirVault Sync] 📥 Received INITIAL_SYNC_BATCH with ${msg.items.length} items from ${msg.senderDevice.name}`);
      for (const packet of msg.items) {
        await this.processIncomingPacket(packet, msg.senderDevice, msg.targetDeviceId, true);
      }
    } else if (msg.type === 'INITIAL_SYNC_TOMBSTONES' && Array.isArray(msg.tombstones)) {
      if (msg.senderDevice && msg.senderDevice.id === cur.id) return;
      const senderDev = msg.senderDevice;
      AirVaultLogger.info(`[AirVault Sync] 🗑️ Received INITIAL_SYNC_TOMBSTONES with ${msg.tombstones.length} tombstone(s) from ${senderDev?.name || senderDev?.id}`);
      for (const tombId of msg.tombstones) {
        if (tombId) {
          const localItem = this.storageService.allItems().find(i => i.id === tombId || (i.packetId && i.packetId === tombId));
          const isSourceDevice = localItem && (
            !localItem.originDeviceId ||
            localItem.originDeviceId === cur.id ||
            localItem.senderDeviceId === cur.id ||
            localItem.originOwnerId === cur.id ||
            (localItem.originOwnerId && (localItem.originOwnerId === cur.username || localItem.originOwnerId === `@${cur.username}`)) ||
            localItem.senderDeviceName === cur.name ||
            localItem.senderDeviceName === 'MacBook'
          );
          if (localItem && (localItem.burnAfterRead || localItem.retentionTtlMs === -1) && isSourceDevice) {
            continue;
          }
          this.storageService.deleteItemGlobally(tombId, senderDev);
        }
      }
    }

    // ── Direct Clipboard Beam ──
    else if (msg.type === 'CLIPBOARD_BEAM' && msg.packet) {
      if (msg.senderDevice.id === cur.id) return;
      await this.processIncomingPacket(msg.packet, msg.senderDevice, msg.targetDeviceId);
    } else if (msg.type === 'SYNC_ACK' && msg.packetId) {
      const ackSenderId = msg.senderDevice?.id || msg.targetDeviceId || 'unknown_peer';
      AirVaultLogger.info(`[AirVault Sync] 📬 Delivery confirmed for packet ${msg.packetId} by device ${ackSenderId}`);
      this.storageService.updateDeliveryStatus(msg.packetId, 'delivered');
      this.storageService.markOutboxSynced(msg.packetId);
      this.ngZone.run(() => this.onDeliveryConfirmed.emit({ packetId: msg.packetId, targetDeviceId: ackSenderId }));
    } else if (msg.type === 'ITEM_DELETE' && msg.itemId) {
      if (msg.senderDevice && msg.senderDevice.id === cur.id) return;
      const senderDev = msg.senderDevice;
      const senderHandle = senderDev?.username ? `@${senderDev.username.replace(/^@/, '')}` : (senderDev?.name || 'Paired Device');
      const isBurn = msg.burnAfterRead === true;

      if (options?.isBatch) {
        AirVaultLogger.debug(`[AirVault Sync] 🗑️ ITEM_DELETE received | source=${senderHandle} | itemId=${msg.itemId}${isBurn ? ' (burn: true)' : ''}`);
      } else {
        AirVaultLogger.info(`[AirVault Sync] 🗑️ ITEM_DELETE received | source=${senderHandle} | itemId=${msg.itemId}${isBurn ? ' (burn: true)' : ''}`);
      }

      const localItem = this.storageService.allItems().find(i =>
        i.id === msg.itemId ||
        (i.packetId && i.packetId === msg.itemId) ||
        (i.batchId && i.batchId === msg.itemId)
      );

      // PART 2 Requirement: Burn-after-read must only ever affect destination's copy, never the source's.
      // If this is a burn deletion event, and this device is the author/source of the item,
      // NEVER delete, hide, or alter the source's copy!
      const isSourceDevice = localItem && (
        !localItem.originDeviceId ||
        localItem.originDeviceId === cur.id ||
        localItem.senderDeviceId === cur.id ||
        localItem.originOwnerId === cur.id ||
        (localItem.originOwnerId && (localItem.originOwnerId === cur.username || localItem.originOwnerId === `@${cur.username}`)) ||
        localItem.senderDeviceName === cur.name ||
        localItem.senderDeviceName === 'MacBook'
      );

      if ((isBurn || localItem?.burnAfterRead || localItem?.retentionTtlMs === -1) && isSourceDevice) {
        AirVaultLogger.info(`[AirVault Burn] 🛡️ Source Device Guard: Burn event for "${localItem.content?.filename || 'Item'}" (${msg.itemId}) occurred on remote peer ${senderHandle}, but source device copy remains fully intact and visible.`);
        return;
      }

      if (isBurn || localItem?.burnAfterRead) {
        this.ngZone.run(() => this.onItemBurned.emit({ itemId: msg.itemId }));
      }

      // Execute global deletion on this device (moves to 30-day Restorable History or permanently purges if burn-after-read)
      const deleterWithBurn = isBurn ? { ...senderDev, burnAfterRead: true } : senderDev;
      this.storageService.deleteItemGlobally(msg.itemId, deleterWithBurn);
      if (localItem && !localItem.isDeletedFromActive) {
        this.ngZone.run(() => {
          if (isBurn || localItem.burnAfterRead) {
            this.uiStore.triggerToast(`🔥 Item viewed & burned by ${senderHandle}`);
          } else {
            this.uiStore.triggerToast(`🗑️ Resource deleted from all devices by ${senderHandle}`);
          }
        });
      }
    } else if (msg.type === 'LIVE_CLIPBOARD_SYNC' && msg.liveText !== undefined) {
      if (msg.senderDevice && msg.senderDevice.id === cur.id) return;
      if (!this.isPairedAndAuthorized(msg.senderDevice)) return;

      // Filter out any lines authored by non-paired 3rd parties (pure computation, outside zone)
      const filtered = this.blameService.filterAuthorizedLines(
        msg.liveText,
        msg.lineBlameMap,
        cur,
        this.deviceService.pairedDevices()
      );
      // Re-enter zone only for the emit that drives template-bound state
      this.ngZone.run(() => this.onLiveTextReceived.emit({ text: filtered.text, senderDevice: msg.senderDevice, lineBlameMap: filtered.blame }));
    } else if (msg.type === 'DRAFT_ACTIVITY' && (msg.draftActivity || msg.payload)) {
      if (msg.senderDevice && msg.senderDevice.id === cur.id) return;
      if (!this.isPairedAndAuthorized(msg.senderDevice)) return;
      const draft: DraftActivityPayload = msg.draftActivity || msg.payload;
      if (draft && draft.deviceId !== cur.id) {
        this.ngZone.run(() => {
          this.onDraftActivity.emit({ draft, senderDevice: msg.senderDevice });
        });
      }
    } else if (msg.type === 'DRAFT_FINALIZED') {
      const devId = msg.payload?.deviceId || msg.senderDevice?.id;
      if (devId && devId !== cur.id) {
        this.ngZone.run(() => {
          this.onDraftFinalized.emit({ deviceId: devId });
        });
      }
    } else if (msg.type === 'DRAFT_REQUEST') {
      const targetId = msg.targetDeviceId || msg.payload?.targetDeviceId;
      if (targetId === cur.id && msg.senderDevice) {
        const reqId = msg.payload?.requestId || (msg as any).packetId || '';
        this.ngZone.run(() => this.onDraftRequest.emit({ senderDevice: msg.senderDevice, requestId: reqId }));
      }
    } else if (msg.type === 'DRAFT_RESPONSE') {
      const targetId = msg.targetDeviceId || msg.payload?.targetDeviceId;
      if (targetId === cur.id && msg.senderDevice) {
        const reqId = msg.payload?.requestId || '';
        const fullContent = msg.payload?.fullContent || '';
        const lineBlameMap = msg.payload?.lineBlameMap;
        this.ngZone.run(() => this.onDraftResponse.emit({ senderDevice: msg.senderDevice, requestId: reqId, fullContent, lineBlameMap }));
      }
    } else if (msg.type === 'USERNAME_UPDATED' && msg.payload) {
      const { deviceId, newUsername } = msg.payload;
      if (deviceId && newUsername) {
        AirVaultLogger.info(`[AirVault Sync] 🏷️ Received USERNAME_UPDATED for device ${deviceId} -> @${newUsername}`);
        this.ngZone.run(() => {
          this.deviceService.pairedDevices.update(list =>
            list.map(d => (d.id === deviceId ? { ...d, username: newUsername, name: `@${newUsername}` } : d))
          );
          this.deviceService.saveStoredDevices();
        });
      }
    } else if (msg.type === 'DEVICE_ONLINE') {
      const senderDev = msg.senderDevice || msg.payload?.senderDevice;
      if (senderDev && senderDev.id !== cur.id) {
        AirVaultLogger.info(`[AirVault Presence] 🟢 Device online presence detected: ${senderDev.name} (${senderDev.id})`);

        // Symmetrically clear any temporary manual disconnect so returning/reloaded device automatically reconnects
        this.deviceService.clearManualDisconnect(senderDev.id);

        const existing = this.deviceService.pairedDevices().find(d =>
          d.id === senderDev.id ||
          (d.username && senderDev.username && d.username.toLowerCase().replace(/^@/, '') === senderDev.username.toLowerCase().replace(/^@/, ''))
        );

        if (existing) {
          this.ngZone.run(() => {
            this.deviceService.pairedDevices.update(list =>
              list.map(d => (d.id === existing.id || d.id === senderDev.id)
                ? { ...d, id: senderDev.id || d.id, name: senderDev.name || d.name, username: senderDev.username || d.username, status: 'active', lastActive: Date.now() }
                : d
              )
            );
            this.deviceService.saveStoredDevices();
          });
        }

        // If this was an initial broadcast from a peer, acknowledge presence symmetrically
        if ((msg as any).targetDeviceId === 'broadcast' || !msg.targetDeviceId) {
          this.deviceService.broadcastDeviceOnlineSignal();
        }
      }
    } else if (msg.type === 'DEVICE_DISCONNECT') {
      const targetId = (msg as any).targetDeviceId || (msg as any).payload?.targetDeviceId;
      if (targetId && targetId !== cur.id) return;

      const senderDev = msg.senderDevice;
      if (senderDev && senderDev.id !== cur.id) {
        AirVaultLogger.info(`[AirVault Sync] 🔌 Received targeted DEVICE_DISCONNECT from ${senderDev.name} (${senderDev.id}) — peer has forgotten us, marking offline but keeping in list`);
        // markPeerForgotUs keeps the device visible in our list (status=offline, Reconnect button shown)
        // without adding it to manualDisconnectedDeviceIds which would block future sync.
        this.deviceService.markPeerForgotUs(senderDev.id);
      }
    } else if (msg.type === 'DEVICE_RECONNECT') {
      const targetId = (msg as any).targetDeviceId || (msg as any).payload?.targetDeviceId;
      if (targetId && targetId !== cur.id && targetId !== 'broadcast') return;

      const senderDev = msg.senderDevice || msg.payload?.senderDevice;
      if (senderDev && senderDev.id !== cur.id) {
        AirVaultLogger.info(`[AirVault Sync] ⚡ Received targeted DEVICE_RECONNECT signal from ${senderDev.name} (${senderDev.id}). Restoring active state symmetrically...`);

        // Symmetrically clear manual disconnect flag so this peer is active immediately
        this.deviceService.clearManualDisconnect(senderDev.id);

        // Check if existing in paired devices list or add
        const exists = this.deviceService.pairedDevices().find(d =>
          d.id === senderDev.id ||
          (d.username && senderDev.username && d.username.toLowerCase().replace(/^@/, '') === senderDev.username.toLowerCase().replace(/^@/, ''))
        );

        if (exists) {
          this.deviceService.reconnectDevice(exists.id);
        } else {
          this.deviceService.addPairedDevice(senderDev);
          this.deviceService.setDeviceStatus(senderDev.id, 'active');
        }

        // Send reciprocal DEVICE_ONLINE signal back so the reconnecting device also sees us as active
        this.deviceService.broadcastDeviceOnlineSignal();

        this.ngZone.run(() => {
          this.uiStore.openSyncConsent(senderDev);
        });
      }
    }
  }

  private async processIncomingPacket(packet: EncryptedPacket, senderDevice: AirVaultDevice, targetDeviceId?: string, isInitialBatch: boolean = false) {
    const cur = this.deviceService.currentDevice();
    const syncId = packet.syncCorrelationId || packet.packetId?.slice(0, 6) || 'dest';

    // Check if this device has disabled synchronization
    if (cur.syncEnabled === false) {
      AirVaultSyncDebugLogger.logDestinationSkipped(syncId, senderDevice.id, 'local_sync_disabled', packet.packetId);
      AirVaultLogger.debug(`[AirVault Sync] 🚫 Dropped incoming sync message from ${senderDevice.id}: Local sync is disabled.`);
      return;
    }

    // Check if sender device is disabled or manually disconnected in paired list
    const pairedSender = this.deviceService.pairedDevices().find(d => d.id === senderDevice.id);
    if (pairedSender && pairedSender.syncEnabled === false) {
      AirVaultSyncDebugLogger.logDestinationSkipped(syncId, senderDevice.id, 'remote_sync_disabled', packet.packetId);
      AirVaultLogger.debug(`[AirVault Sync] 🚫 Dropped incoming sync message from ${senderDevice.id}: Remote device sync is disabled locally.`);
      return;
    }
    if (pairedSender && this.deviceService.isManuallyDisconnected(pairedSender.id)) {
      AirVaultSyncDebugLogger.logDestinationSkipped(syncId, senderDevice.id, 'manually_disconnected', packet.packetId);
      AirVaultLogger.debug(`[AirVault Sync] 🔌 Dropped incoming sync attempt from manually disconnected device: ${senderDevice.name} (${senderDevice.id})`);
      return;
    }

    // Auto-promote sender device to active upon receiving a verified signal
    if (senderDevice?.id && senderDevice.id !== cur.id) {
      this.deviceService.setDeviceStatus(senderDevice.id, 'active');
    }

    // Check if specific target was addressed and doesn't match
    if (targetDeviceId && targetDeviceId !== cur.id && targetDeviceId !== 'broadcast') {
      AirVaultSyncDebugLogger.logDestinationSkipped(syncId, senderDevice.id, 'target_mismatch', packet.packetId);
      return;
    }

    // Check if item has been globally deleted (tombstoned)
    if (this.storageService.isTombstoned(packet.packetId)) {
      AirVaultSyncDebugLogger.logDestinationSkipped(syncId, senderDevice.id, 'globally_tombstoned', packet.packetId);
      AirVaultLogger.debug(`[AirVault Sync] 🪦 Packet ${packet.packetId} is globally tombstoned. Acknowledging and ignoring resurrection.`);
      this.sendAck(packet.packetId, senderDevice.id);
      return;
    }

    // Deduplicate: avoid re-processing identical packet unless part of an initial sync batch or resend/missing from active items
    const isCurrentlyActive = this.storageService.items().some(i => i.id === packet.packetId || (i.packetId && i.packetId === packet.packetId));
    if (this.processedPacketIds.has(packet.packetId) && !isInitialBatch && isCurrentlyActive) {
      AirVaultSyncDebugLogger.logDestinationSkipped(syncId, senderDevice.id, 'already_processed', packet.packetId);
      AirVaultLogger.debug(`[AirVault Sync] 🔁 Packet ${packet.packetId} already processed and active. Acknowledging duplicate.`);
      this.sendAck(packet.packetId, senderDevice.id);
      return;
    }
    this.markPacketProcessed(packet.packetId);

    try {
      const decrypted = await this.crypto.decryptPayload(packet);
      let classified: ClassifiedContent;

      let parsed: any = null;
      try {
        let current = JSON.parse(decrypted);
        // Handle potential double/nested stringification
        while (typeof current === 'string' && (current.trim().startsWith('{') || current.trim().startsWith('['))) {
          try {
            current = JSON.parse(current);
          } catch {
            break;
          }
        }
        parsed = current;
        // If raw contains an inner stringified batch JSON, unwrap it
        if (parsed && typeof parsed.raw === 'string' && parsed.raw.trim().startsWith('{')) {
          try {
            const inner = JSON.parse(parsed.raw);
            if (inner && (inner.isBatchParent || inner.is_batch_parent || Array.isArray(inner.batchFiles) || Array.isArray(inner.batch_files))) {
              parsed = { ...parsed, ...inner };
            }
          } catch { }
        }
      } catch {
        parsed = null;
      }

      let originDevId = parsed?.originDeviceId || senderDevice.id;
      let originDevName = parsed?.originDeviceName || senderDevice.name;

      const resolvedSenderDeviceId = parsed?.senderDeviceId || parsed?.originDeviceId || senderDevice.id;
      const resolvedSenderHandle = parsed?.senderDeviceName || parsed?.originOwnerId || (senderDevice.username ? `@${senderDevice.username}` : (senderDevice.name || 'Peer'));
      const resolvedSenderUsername = parsed?.senderUsername || (senderDevice.username ? senderDevice.username.replace(/^@/, '') : '');
      const resolvedOriginOwnerId = parsed?.originOwnerId || parsed?.senderDeviceName || (senderDevice.username ? `@${senderDevice.username}` : (senderDevice.name || senderDevice.id));
      const resolvedAuthorColor = parsed?.senderDeviceAccent || parsed?.authorColor || this.colorService.getColorForIdentity(resolvedSenderUsername || resolvedSenderDeviceId, senderDevice.accentColor);
      const resolvedSenderDeviceType = parsed?.senderDeviceType || senderDevice.type || 'laptop';

      const senderHandle = resolvedSenderHandle;
      const receivedAuthorColor = resolvedAuthorColor;

      let isBatchParent = false;
      let batchFiles: AirVaultItem[] | undefined = undefined;
      let batchTotalCount: number | undefined = undefined;
      let batchTotalBytes: number | undefined = undefined;
      let batchId: string | undefined = undefined;

      const rawBatchFiles = parsed ? (parsed.batchFiles || parsed.batch_files) : null;
      const isBatchDetected = !!(parsed && (parsed.isBatchParent || parsed.is_batch_parent || (Array.isArray(rawBatchFiles) && rawBatchFiles.length > 0)));

      // Check if item has been locally removed / suppressed on this device
      const isSuppressedLocally = this.storageService.isLocallySuppressed(packet.packetId) ||
        (parsed?.id && this.storageService.isLocallySuppressed(parsed.id)) ||
        (parsed?.batchId && this.storageService.isLocallySuppressed(parsed.batchId));

      const isBurnAfterRead = parsed?.burnAfterRead === true || parsed?.retentionTtlMs === -1;
      const isExplicitOwnerResend = !!(parsed && (parsed.isResend || (parsed.resendCount && parsed.resendCount > 0) || isBurnAfterRead));

      if (isSuppressedLocally) {
        if (!isExplicitOwnerResend) {
          AirVaultSyncDebugLogger.logDestinationSkipped(syncId, senderDevice.id, 'locally_suppressed', packet.packetId);
          AirVaultLogger.debug(`[AirVault Sync] 🛡️ Packet ${packet.packetId} was locally removed by user on this device. Ignoring auto-sync.`);
          this.sendAck(packet.packetId, senderDevice.id);
          return;
        } else {
          AirVaultLogger.info(`[AirVault Sync] 🔄 Item ${packet.packetId} was explicitly resent by owner or is fresh Burn-After-Read. Unsuppressing.`);
          this.storageService.removeLocalSuppression(packet.packetId);
          if (parsed?.id) this.storageService.removeLocalSuppression(parsed.id);
          if (parsed?.batchId) this.storageService.removeLocalSuppression(parsed.batchId);
        }
      }

      if (isBurnAfterRead || isExplicitOwnerResend) {
        // Clear any stale debounce or tombstone state on destination for this item/resend
        this.viewedItemsDebounce.delete(packet.packetId);
        if (parsed?.id) this.viewedItemsDebounce.delete(parsed.id);
        this.storageService.removeTombstone(packet.packetId);
        if (parsed?.id) this.storageService.removeTombstone(parsed.id);
      }

      if (isBatchDetected) {
        if (parsed.originDeviceId) originDevId = parsed.originDeviceId;
        if (parsed.originDeviceName) originDevName = parsed.originDeviceName;
        isBatchParent = true;
        batchId = parsed.batchId || packet.packetId;
        const incomingFileList: any[] = Array.isArray(rawBatchFiles) ? rawBatchFiles : [];
        batchTotalCount = parsed.batchTotalCount || incomingFileList.length || 0;

        let calculatedBytes = 0;
        batchFiles = incomingFileList.map((bf: any, idx: number) => {
          const bfContent: ClassifiedContent = bf.content || {
            category: (bf.filename && /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(bf.filename)) ? 'image' : 'file',
            raw: bf.raw || '',
            filename: bf.filename || `File_${idx + 1}`,
            byteSize: bf.byteSize || 0,
            previewUrl: bf.previewUrl || (bf.content?.previewUrl) || (bf.content?.category === 'image' ? bf.content?.raw : undefined)
          };
          if (!bfContent.previewUrl && bfContent.category === 'image' && bfContent.raw) {
            bfContent.previewUrl = bfContent.raw;
          }
          calculatedBytes += (bfContent.byteSize || 0);
          return {
            id: bf.id || ('bf_' + Math.random().toString(36).slice(2, 9)),
            originDeviceId: originDevId,
            originOwnerId: resolvedOriginOwnerId,
            senderDeviceId: resolvedSenderDeviceId,
            senderDeviceName: resolvedSenderHandle,
            senderDeviceAccent: resolvedAuthorColor,
            authorColor: resolvedAuthorColor,
            author_color: resolvedAuthorColor,
            senderDeviceType: resolvedSenderDeviceType,
            targetDeviceId,
            content: bfContent,
            timestamp: bf.timestamp || packet.timestamp,
            isPinned: false,
            deliveryStatus: 'delivered',
            processingState: 'done'
          };
        });

        batchTotalBytes = parsed.batchTotalBytes || calculatedBytes;
        const firstFile = batchFiles.length > 0 ? batchFiles[0] : null;

        const incomingBatchRaw = (parsed.raw && typeof parsed.raw === 'string' && parsed.raw.trim())
          ? parsed.raw
          : `Batch of ${batchTotalCount} files (${((batchTotalBytes || 0) / 1024 / 1024).toFixed(1)} MB)`;

        classified = {
          category: 'archive',
          raw: incomingBatchRaw,
          previewUrl: firstFile?.content?.previewUrl,
          filename: `${batchTotalCount} Files Batch`,
          byteSize: batchTotalBytes || 0,
          isSensitive: false,
          collapseState: 'collapsed'
        };
      } else if (parsed && typeof parsed.raw === 'string' && parsed.category) {
        if (parsed.originDeviceId) originDevId = parsed.originDeviceId;
        if (parsed.originDeviceName) originDevName = parsed.originDeviceName;
        let incomingBlame: LineBlameEntry[] | undefined = Array.isArray(parsed.lineBlameMap) ? parsed.lineBlameMap : undefined;
        // If an existing local item with the same packetId or ID exists, merge blame maps
        const existingLocal = this.storageService.allItems().find(i => i.id === packet.packetId || (i.packetId && i.packetId === packet.packetId));
        if (existingLocal?.content?.lineBlameMap && incomingBlame) {
          incomingBlame = this.blameService.merge(existingLocal.content.lineBlameMap, incomingBlame);
        }
        classified = {
          category: parsed.category,
          raw: parsed.raw,
          filename: parsed.filename,
          language: parsed.language,
          previewUrl: parsed.previewUrl || (parsed.category === 'image' ? parsed.raw : undefined),
          isSensitive: false,
          byteSize: parsed.byteSize || existingLocal?.content?.byteSize || new Blob([parsed.raw || '']).size,
          lineBlameMap: incomingBlame
        };
      } else {
        classified = this.clipboardService.classify(decrypted);
        if (!classified.previewUrl && classified.category === 'image' && classified.raw) {
          classified.previewUrl = classified.raw;
        }
      }

      AirVaultSyncDebugLogger.logPacketDecrypted(syncId, classified.category);

      const isExplicitPacketRestore = !!(parsed && (parsed.isResend || (parsed.resendCount && parsed.resendCount > 0)));

      const receivedItem: AirVaultItem = {
        id: packet.packetId,
        packetId: packet.packetId,
        sequenceNumber: packet.sequenceNumber,
        originDeviceId: originDevId,
        originOwnerId: resolvedOriginOwnerId,
        senderDeviceId: resolvedSenderDeviceId,
        senderDeviceName: resolvedSenderHandle,
        senderDeviceAccent: resolvedAuthorColor,
        authorColor: resolvedAuthorColor,
        author_color: resolvedAuthorColor,
        senderDeviceType: resolvedSenderDeviceType,
        targetDeviceId,
        content: classified,
        timestamp: packet.timestamp,
        resendCount: parsed?.resendCount,
        lastResentAt: parsed?.lastResentAt,
        tag: parsed?.tag,
        tagColor: parsed?.tagColor,
        retentionTtlMs: isBurnAfterRead ? -1 : parsed?.retentionTtlMs,
        burnAfterRead: isBurnAfterRead,
        isBurned: false,
        isPinned: false,
        deliveryStatus: 'delivered',
        isBatchParent,
        batchId,
        batchFiles,
        batchTotalCount,
        batchTotalBytes,
        batchCompletedCount: isBatchParent ? (batchFiles?.length || 0) : undefined
      };

      if (receivedItem.burnAfterRead) {
        AirVaultLogger.info(`[AirVault Burn] 📥 DESTINATION RECEIVED | Burn-After-Read ${classified.category} "${classified.filename || 'Item'}" (ID: ${receivedItem.id}) from sender: ${senderHandle} (${senderDevice.id}) -> Destination Device: "${cur.name}" (${cur.id})`);
        console.log(`%c[AirVault Burn: Destination Received]%c File/Item: "${classified.filename || 'Item'}" | Category: ${classified.category} | ID: ${receivedItem.id} | Sender: ${senderHandle} (${senderDevice.id}) | Destination: "${cur.name}" (${cur.id}) | Retention: Burn-After-Read (1 view)`, 'background: #EF4444; color: #fff; font-weight: bold; padding: 2px 6px; border-radius: 4px;', 'color: #EF4444; font-weight: normal; margin-left: 6px;');
      }

      if (!isInitialBatch) {
        AirVaultLogger.info(`[AirVault Sync] 📥 Received ${classified.category} "${classified.filename || 'Item'}" from ${senderHandle} (${packet.packetId})`);
      } else {
        AirVaultLogger.debug(`[AirVault Sync] 📥 (Initial Sync Batch) Received ${classified.category} "${classified.filename || 'Item'}" from ${senderHandle} (${packet.packetId})`);
      }
      const addResult = this.storageService.addItem(receivedItem, { isExplicitRestore: isExplicitPacketRestore });
      AirVaultSyncDebugLogger.logItemPersisted(syncId, receivedItem.id);
      AirVaultSyncDebugLogger.logUIUpdated(syncId);

      // If incoming payload contains raw binary / data URL, persist to IndexedDB payload store
      if (classified.raw && (classified.raw.startsWith('data:') || classified.raw.startsWith('blob:'))) {
        this.storageService.savePayloadToIndexedDb(receivedItem.id, classified.raw);
        if (receivedItem.packetId && receivedItem.packetId !== receivedItem.id) {
          this.storageService.savePayloadToIndexedDb(receivedItem.packetId, classified.raw);
        }
      } else if (classified.previewUrl && classified.previewUrl.startsWith('data:')) {
        this.storageService.savePayloadToIndexedDb(receivedItem.id, classified.previewUrl);
        if (receivedItem.packetId && receivedItem.packetId !== receivedItem.id) {
          this.storageService.savePayloadToIndexedDb(receivedItem.packetId, classified.previewUrl);
        }
      }

      // ── PERSIST EVERY BATCH SUB-FILE PAYLOAD INDIVIDUALLY TO INDEXEDDB ────
      if (receivedItem.isBatchParent && Array.isArray(receivedItem.batchFiles)) {
        for (const bf of receivedItem.batchFiles) {
          const bfRaw = bf.content?.raw || (bf as any).raw;
          const bfPreview = bf.content?.previewUrl || (bf as any).previewUrl;
          if (bfRaw && (bfRaw.startsWith('data:') || bfRaw.startsWith('blob:'))) {
            this.storageService.savePayloadToIndexedDb(bf.id, bfRaw);
          } else if (bfPreview && bfPreview.startsWith('data:')) {
            this.storageService.savePayloadToIndexedDb(bf.id, bfPreview);
          }
        }
      }

      // Ensure sender device is recognized as active
      if (senderDevice.id && senderDevice.id !== cur.id) {
        this.deviceService.setDeviceStatus(senderDevice.id, 'active');
      }

      // Register synced text hash so receiving device will not auto-capture and re-beam incoming text
      if (classified.raw) {
        this.clipboardService.registerSyncedText(classified.raw);
      }

      // Emit incoming item event for staging / reactive consumers
      this.onIncomingItem.emit(addResult.item || receivedItem);

      // === TIERING LOGIC & AUTO-COPY EVALUATION ===
      const allowedCategories = ['text', 'url', 'code', 'json', 'image'];
      const byteSize = classified.byteSize || (classified.raw ? new Blob([classified.raw]).size : 0);
      const isSensitive = !!(classified.isSensitive || classified.sensitiveType);

      const isQualifying = !isSensitive &&
        allowedCategories.includes(classified.category) &&
        byteSize <= AUTO_COPY_SIZE_THRESHOLD_BYTES;

      const isAppFocused = typeof document !== 'undefined' && document.hasFocus() && !document.hidden;
      const isAutoCopyEnabled = this.prefService.prefs().autoCopyIncoming;
      let autoCopied = false;

      const now = Date.now();
      const isDebounced = (now - this.lastAutoCopyTime) >= this.AUTO_COPY_DEBOUNCE_MS;

      if (isQualifying && isAppFocused && isAutoCopyEnabled && isDebounced) {
        try {
          const success = await this.clipboardService.copyResource(classified);
          if (success) {
            autoCopied = true;
            this.lastAutoCopyTime = now;
            AirVaultLogger.info(`[AirVault Auto-Copy] ⚡ Auto-copied incoming ${classified.category} from ${senderHandle} to system clipboard.`);
          }
        } catch (copyErr) {
          AirVaultLogger.warn('[AirVault Auto-Copy] System clipboard auto-write failed:', copyErr);
        }
      } else if (!isQualifying) {
        AirVaultLogger.debug(`[AirVault Tiering] ℹ️ Non-qualifying item received (${classified.category}, size: ${byteSize} bytes, sensitive: ${isSensitive}) -> notification only, no clipboard write.`);
      }

      // Dispatch multi-channel notification (foreground toast vs background push, sound, and badge) for live beams
      if (!isInitialBatch) {
        this.notificationService.notifyIncomingItem(receivedItem, isQualifying, autoCopied);
        AirVaultSyncDebugLogger.logNotificationTriggered(syncId, receivedItem.content?.category, autoCopied);
      }

      this.onIncomingItem.emit(receivedItem);

      this.deviceService.setDeviceStatus(senderDevice.id, 'active');

      this.sendAck(packet.packetId, senderDevice.id);
    } catch (err: any) {
      AirVaultSyncDebugLogger.logPacketDecrypted(syncId, 'unknown', true, err?.message || 'decryption_failed');
      AirVaultLogger.error('[AirVault Sync] ❌ Failed to decrypt or process incoming clipboard item:', err);
    }
  }

  private sendAck(packetId: string, senderDeviceId: string) {
    const cur = this.deviceService.currentDevice();
    AirVaultLogger.info(`[AirVault Sync Destination] 📬 Emitting SYNC_ACK for packet ${packetId} to sender ${senderDeviceId}`);
    const ackMsg: SyncMessage = {
      type: 'SYNC_ACK',
      packetId,
      senderDevice: cur,
      targetDeviceId: senderDeviceId,
      timestamp: Date.now()
    };

    if (this.channel) {
      this.channel.postMessage(ackMsg);
    }

    // Send SYNC_ACK over WebSocket if connected
    if (this.wsTransport.connectionState() === 'CONNECTED') {
      this.wsTransport.send({
        type: 'SYNC_ACK',
        senderDeviceId: cur.id,
        targetDeviceId: senderDeviceId,
        payload: JSON.stringify({ packetId }),
        timestamp: Date.now()
      });
    }
  }

  public sendSignalMessageDirect(signalType: string, payload: string, targetDeviceId: string) {
    this.sendSignalMessage(signalType, payload, targetDeviceId);
  }

  private markPacketProcessed(packetId: string) {
    if (this.processedPacketIds.size > 500) {
      const first = this.processedPacketIds.values().next().value;
      if (first) this.processedPacketIds.delete(first);
    }
    this.processedPacketIds.add(packetId);
  }

  private sendSignalMessage(signalType: string, payload: string, targetDeviceId: string, syncCorrelationId?: string) {
    const cur = this.deviceService.currentDevice();
    const wsSent = this.wsTransport.send({
      type: signalType,
      senderDeviceId: cur.id,
      targetDeviceId,
      payload,
      timestamp: Date.now()
    });

    if (wsSent && syncCorrelationId) {
      const elapsed = AirVaultSyncDebugLogger.getElapsedMs(syncCorrelationId);
      AirVaultSyncDebugLogger.logSignalPost(syncCorrelationId, targetDeviceId, 200, elapsed);
    }
  }

  /**
   * Broadcasts a full sync request to all connected sync-enabled devices.
   */
  async syncAllDevices() {
    const cur = this.deviceService.currentDevice();
    const paired = this.deviceService.pairedDevices().filter(d => d.syncEnabled !== false);

    AirVaultLogger.info(`[AirVault Sync] 🔄 Initiating manual sync across ${paired.length} connected devices.`);

    // 1. Send initial sync request to broadcast & all peers
    const reqMsg: SyncMessage = {
      type: 'INITIAL_SYNC_REQUEST',
      senderDevice: cur,
      targetDeviceId: 'broadcast',
      timestamp: Date.now()
    };

    if (this.channel) this.channel.postMessage(reqMsg);
    this.sendSignalMessage('INITIAL_SYNC_REQUEST', JSON.stringify(reqMsg), 'broadcast');

    // 2. Also beam active vault items to all peers (skip tombstoned items)
    const localItems = this.storageService.items().filter(it => !this.storageService.isTombstoned(it.id));
    for (const d of paired) {
      this.sendSignalMessage('INITIAL_SYNC_REQUEST', JSON.stringify({ ...reqMsg, targetDeviceId: d.id }), d.id);
      for (const it of localItems) {
        try {
          const payloadString = this.serializeItemForSync(it, cur);
          const packet = await this.crypto.encryptPayload(payloadString, it.senderDeviceId || cur.id, d.id);
          packet.packetId = it.id;
          this.sendSignalMessage('SYNC_PACKET', JSON.stringify(packet), d.id);
        } catch { }
      }
    }
  }

  /**
   * Broadcasts an arbitrary signal message to all connected peers and server mailbox.
   */
  broadcastSignal(signalType: string, payload: any) {
    const cur = this.deviceService.currentDevice();
    const msg: SyncMessage = {
      type: signalType as any,
      payload,
      senderDevice: cur,
      targetDeviceId: 'broadcast',
      timestamp: Date.now()
    };
    if (this.channel) this.channel.postMessage(msg);
    this.sendSignalMessage(signalType, JSON.stringify(msg), 'broadcast');
  }

  /**
   * Broadcasts ephemeral draft activity (contentPreview masked to ~80 chars) to connected peers.
   */
  broadcastDraftActivity(contentPreview: string, lastKeystrokeAt: number = Date.now()) {
    const cur = this.deviceService.currentDevice();
    const paired = this.deviceService.pairedDevices().filter(d => d.syncEnabled !== false && d.status === 'active');
    if (paired.length === 0) return;

    const draftActivity: DraftActivityPayload = {
      deviceId: cur.id,
      username: cur.username ? `@${cur.username.replace(/^@/, '')}` : (cur.name || 'User'),
      deviceType: cur.type,
      deviceAccent: cur.accentColor || '#2196F3',
      contentPreview,
      lastKeystrokeAt
    };

    const msg: SyncMessage = {
      type: 'DRAFT_ACTIVITY',
      draftActivity,
      senderDevice: cur,
      targetDeviceId: 'broadcast',
      timestamp: Date.now()
    };

    if (this.channel) this.channel.postMessage(msg);
    this.sendSignalMessage('DRAFT_ACTIVITY', JSON.stringify(msg), 'broadcast');
  }

  /**
   * Broadcasts draft finalized / committed event so peers immediately clear the handoff banner.
   */
  broadcastDraftFinalized() {
    const cur = this.deviceService.currentDevice();
    const msg: SyncMessage = {
      type: 'DRAFT_FINALIZED',
      payload: { deviceId: cur.id },
      senderDevice: cur,
      targetDeviceId: 'broadcast',
      timestamp: Date.now()
    };

    if (this.channel) this.channel.postMessage(msg);
    this.sendSignalMessage('DRAFT_FINALIZED', JSON.stringify(msg), 'broadcast');
  }

  /**
   * Requests full draft content from a specific source device for "Continue on" handoff.
   */
  requestDraftFromDevice(targetDeviceId: string, requestId: string = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`) {
    const cur = this.deviceService.currentDevice();
    const msg: SyncMessage = {
      type: 'DRAFT_REQUEST',
      payload: { requestId, targetDeviceId },
      senderDevice: cur,
      targetDeviceId,
      timestamp: Date.now()
    };

    if (this.channel) this.channel.postMessage(msg);
    this.sendSignalMessage('DRAFT_REQUEST', JSON.stringify(msg), targetDeviceId);
  }

  /**
   * Responds to a DRAFT_REQUEST by sending back the full draft content over the secure channel.
   */
  sendDraftResponse(targetDeviceId: string, requestId: string, fullContent: string, lineBlameMap?: LineBlameEntry[]) {
    const cur = this.deviceService.currentDevice();
    const msg: SyncMessage = {
      type: 'DRAFT_RESPONSE',
      payload: { requestId, targetDeviceId, fullContent, lineBlameMap },
      senderDevice: cur,
      targetDeviceId,
      timestamp: Date.now()
    };

    if (this.channel) this.channel.postMessage(msg);
    this.sendSignalMessage('DRAFT_RESPONSE', JSON.stringify(msg), targetDeviceId);
  }
}



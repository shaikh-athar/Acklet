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
    const payload = {
      itemId,
      viewerDeviceId: cur.id,
      viewerName: cur.username ? `@${cur.username}` : cur.name,
      category: category || 'file',
      contentType: category || 'file'
    };

    AirVaultLogger.debug(`[AirVault Burn] 🔥 Emitting ITEM_VIEWED for item ${itemId} to backend...`);

    // 1. Post to backend atomic CAS endpoint
    this.http.post<any>(getAirVaultApiUrl('/api/v1/airvault/sync/viewed'), payload).subscribe({
      next: (res) => {
        if (res?.data?.burned) {
          AirVaultLogger.info(`[AirVault Burn] ✅ Backend confirmed first view of item ${itemId}. Initiating local burn...`);
          this.onItemBurned.emit({ itemId });
          this.storageService.deleteItemGlobally(itemId, cur);
        }
      },
      error: (err) => {
        AirVaultLogger.warn(`[AirVault Burn] ⚠️ Backend view registration error:`, err);
        // Fallback: trigger local burn and broadcast
        this.onItemBurned.emit({ itemId });
        this.storageService.deleteItemGlobally(itemId, cur);
        this.broadcastGlobalDelete(itemId);
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
  broadcastGlobalDelete(itemId: string) {
    const cur = this.deviceService.currentDevice();
    const syncEnabledDevices = this.deviceService.pairedDevices().filter(d => d.syncEnabled !== false && d.status === 'active');

    AirVaultLogger.info(`[AirVault Sync] 🗑️ Broadcasting RESOURCE_GLOBAL_DELETE for item ${itemId} to ${syncEnabledDevices.length} peers`);

    const msg: SyncMessage = {
      type: 'ITEM_DELETE',
      itemId,
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
   * Broadcasts an existing or restored resource to all connected active devices.
   */
  async broadcastItem(item: AirVaultItem): Promise<AirVaultItem | null> {
    if (item.isBatchParent && item.batchFiles && item.batchFiles.length > 0) {
      const batchPayload = JSON.stringify({
        isBatchParent: true,
        batchId: item.batchId || item.id,
        batchTotalCount: item.batchTotalCount || item.batchFiles.length,
        batchTotalBytes: item.batchTotalBytes || 0,
        batchFiles: item.batchFiles.map(bf => ({
          id: bf.id,
          content: bf.content,
          timestamp: bf.timestamp
        }))
      });
      return this.beamContent(batchPayload, item.targetDeviceId, `${item.batchTotalCount || item.batchFiles.length} Files Batch`, item.id);
    }

    let payloadRaw = item.content.raw;
    let previewUrl = item.content.previewUrl;

    // If raw content was stripped by metadata-first tiering, fetch from cache/IndexedDB
    if (!payloadRaw || payloadRaw.length === 0) {
      const cached = this.storageService.resourceCache.get(item.id);
      if (cached && cached.objectUrl) {
        payloadRaw = cached.objectUrl;
        if (!previewUrl) previewUrl = cached.objectUrl;
      } else {
        const fetched = await this.storageService.fetchResourcePayload(item);
        if (fetched.objectUrl) {
          payloadRaw = fetched.objectUrl;
          if (!previewUrl) previewUrl = fetched.objectUrl;
        } else if (previewUrl) {
          payloadRaw = previewUrl;
        }
      }
    }

    // Direct beam with full payload, filename, and existingItemId
    return this.beamContent(payloadRaw || '', item.targetDeviceId, item.content.filename, item.id);
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
          const payload = typeof msg.payload === 'string' ? JSON.parse(msg.payload) : msg.payload;
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
        } catch {}
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

      if (senderDev && (senderDev.status === 'revoked' || senderDev.syncEnabled === false || this.deviceService.isManuallyDisconnected(senderDev.id))) {
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
      }
    }); // end subscribe
    }); // end runOutsideAngular
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
        originDeviceId: it.originDeviceId || it.senderDeviceId || curDevice.id,
        originDeviceName: it.senderDeviceName || curDevice.name
      });
    }

    return JSON.stringify({
      raw: it.content.raw,
      category: it.content.category,
      filename: it.content.filename,
      language: it.content.language,
      previewUrl: it.content.previewUrl,
      lineBlameMap: it.content.lineBlameMap,
      originDeviceId: it.originDeviceId || it.senderDeviceId || curDevice.id,
      originDeviceName: it.senderDeviceName || curDevice.name
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

    // 1. Collect only locally-authored resources
    const localOriginItems = this.storageService.items().filter(it =>
      !it.originDeviceId || it.originDeviceId === cur.id || it.senderDeviceId === cur.id
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
    options?: { tag?: string; customCategory?: string; retentionTtlMs?: number }
  ): Promise<AirVaultItem> {
    const syncId = syncCorrelationId || AirVaultSyncDebugLogger.createCorrelationId();
    if (!AirVaultSyncDebugLogger.getElapsedMs(syncId)) {
      AirVaultSyncDebugLogger.startTimer(syncId);
    }

    const curDevice = this.deviceService.currentDevice();

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
        batchData = {
          isBatchParent: true,
          batchId: existingItem.id,
          batchTotalCount: existingItem.batchTotalCount || existingItem.batchFiles?.length || 0,
          batchTotalBytes: existingItem.batchTotalBytes || 0,
          batchFiles: existingItem.batchFiles?.map(bf => ({
            id: bf.id,
            content: bf.content,
            timestamp: bf.timestamp
          }))
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
      payloadString = JSON.stringify({
        isBatchParent: true,
        batchId: batchData.batchId || existingItemId,
        batchTotalCount: count,
        batchTotalBytes: bytes,
        raw: resolvedRaw,
        batchFiles: batchData.batchFiles || [],
        originDeviceId: curDevice.id,
        originDeviceName: curDevice.name
      });
    } else {
      classified = this.clipboardService.classify(plaintext, filename);
      if (options?.customCategory) {
        classified.category = options.customCategory as any;
      }
      if (existingItemId) {
        const existingItem = this.storageService.allItems().find(i => i.id === existingItemId);
        if (existingItem?.content) {
          if (!classified.previewUrl && existingItem.content.previewUrl) {
            classified.previewUrl = existingItem.content.previewUrl;
          }
          if (!classified.filename && existingItem.content.filename) {
            classified.filename = existingItem.content.filename;
          }
          if (existingItem.content.byteSize && !classified.byteSize) {
            classified.byteSize = existingItem.content.byteSize;
          }
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
        tag: options?.tag,
        retentionTtlMs: options?.retentionTtlMs,
        originDeviceId: curDevice.id,
        originDeviceName: curDevice.name
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

    const curHandle = curDevice.username ? `@${curDevice.username}` : (curDevice.name || 'User');
    const localAuthorColor = this.colorService.getColorForIdentity(curDevice.username || curDevice.id, curDevice.accentColor, true);
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
  flushOutboxForDevice(deviceId: string) {
    const toFlush = this.outboxQueue.filter(entry => entry.targetDeviceId === deviceId);
    this.outboxQueue = this.outboxQueue.filter(entry => entry.targetDeviceId !== deviceId);

    if (toFlush.length === 0) return;
    AirVaultSyncDebugLogger.logOutboxFlush(deviceId, toFlush.length);
    AirVaultLogger.info(`[AirVault Sync] 📤 Flushing ${toFlush.length} queued packet(s) to reconnected device ${deviceId}`);

    const cur = this.deviceService.currentDevice();
    for (const entry of toFlush) {
      const syncId = entry.packet.syncCorrelationId || entry.packet.packetId?.slice(0, 6) || 'outbox';
      AirVaultSyncDebugLogger.logSending(syncId, deviceId);
      // Send via WebSocket / network signal so the returning device actually receives it
      this.sendSyncPacket(entry.packet, deviceId, syncId);
      // Also push via BroadcastChannel for same-origin tab reconnects
      if (this.channel) {
        this.channel.postMessage({
          type: 'CLIPBOARD_BEAM',
          packet: entry.packet,
          senderDevice: cur,
          targetDeviceId: deviceId,
          timestamp: Date.now()
        });
      }
      this.storageService.updateDeliveryStatus(entry.packet.packetId, 'pending');
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

        // Trigger Initial Sync
        this.initiateDeviceSync(remoteDevice);
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
          this.deviceService.addPairedDevice(remoteDevice);
          this.deviceService.setDeviceStatus(remoteDevice.id, 'active');
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

        // Trigger Initial Sync
        this.initiateDeviceSync(remoteDevice);
      }
      return;
    }

    // ── Instant Presence Signals ──
    if (msg.type === 'DEVICE_ONLINE') {
      const senderDev = msg.senderDevice || msg.payload?.senderDevice;
      if (senderDev && senderDev.id !== cur.id) {
        const existing = this.deviceService.pairedDevices().find(d => d.id === senderDev.id);
        if (existing) {
          const isManuallyOff = this.deviceService.isManuallyDisconnected(existing.id);
          if (!isManuallyOff) {
            const wasInactive = existing.status !== 'active';
            this.ngZone.run(() => this.deviceService.setDeviceStatus(existing.id, 'active'));
            if (wasInactive) {
              AirVaultLogger.info(`[AirVault Sync] ✅ Peer ${existing.id} (@${existing.username || existing.name}) transitioned to ONLINE. Syncing.`);
              this.flushOutboxForDevice(existing.id);
              this.initiateDeviceSync(existing);
            }
          }
        } else if (senderDev.username && cur.username && senderDev.username.toLowerCase().replace(/^@/, '') === cur.username.toLowerCase().replace(/^@/, '')) {
          this.ngZone.run(() => {
            this.deviceService.addPairedDevice(senderDev);
            this.deviceService.setDeviceStatus(senderDev.id, 'active');
          });
          this.initiateDeviceSync(senderDev);
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

    // ── Universal Security & Data Isolation Gate ──
    // Reject any non-pairing sync message from an un-paired or revoked device
    if (!this.isPairedAndAuthorized(msg.senderDevice)) {
      if (msg.type === 'DEVICE_REVOKE') {
        const targetId = (msg as any).payload?.targetDeviceId || msg.senderDevice?.id;
        const eraseData = (msg as any).payload?.eraseData === true;
        if (targetId === cur.id) {
          if (eraseData) {
            this.storageService.clearAllLocally();
            this.uiStore.triggerToast(`🔒 Session revoked & all local vault data wiped by remote owner.`);
          } else {
            this.uiStore.triggerToast(`🔒 AirVault session revoked by remote owner.`);
          }
        }
      }
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
        // Send only our local origin history in response (No transitive forwarding and skip tombstoned items)
        const localItems = this.storageService.items().filter(it =>
          !this.storageService.isTombstoned(it.id) &&
          (!it.originDeviceId || it.originDeviceId === cur.id || it.senderDeviceId === cur.id)
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
          this.storageService.deleteItemGlobally(tombId, senderDev);
        }
      }
    }

    // ── Direct Clipboard Beam ──
    else if (msg.type === 'CLIPBOARD_BEAM' && msg.packet) {
      if (msg.senderDevice.id === cur.id) return;
      await this.processIncomingPacket(msg.packet, msg.senderDevice, msg.targetDeviceId);
    } else if (msg.type === 'SYNC_ACK' && msg.packetId) {
      AirVaultLogger.debug(`[AirVault Sync] 📬 Delivery confirmed for packet ${msg.packetId} by device ${msg.senderDevice.id}`);
      this.storageService.updateDeliveryStatus(msg.packetId, 'delivered');
      this.ngZone.run(() => this.onDeliveryConfirmed.emit({ packetId: msg.packetId, targetDeviceId: msg.senderDevice.id }));
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
    } else if (msg.type === 'DEVICE_DISCONNECT') {
      const targetId = (msg as any).targetDeviceId || (msg as any).payload?.targetDeviceId;
      if (targetId && targetId !== cur.id) return;

      const senderDev = msg.senderDevice;
      if (senderDev && senderDev.id !== cur.id) {
        AirVaultLogger.info(`[AirVault Sync] 🔌 Received targeted DEVICE_DISCONNECT signal from ${senderDev.name} (${senderDev.id})`);
        this.deviceService.disconnectDevice(senderDev.id);
      }
    } else if (msg.type === 'DEVICE_RECONNECT') {
      const targetId = (msg as any).targetDeviceId || (msg as any).payload?.targetDeviceId;
      if (targetId && targetId !== cur.id) return;

      const senderDev = msg.senderDevice;
      if (senderDev && senderDev.id !== cur.id) {
        AirVaultLogger.info(`[AirVault Sync] ⚡ Received targeted DEVICE_RECONNECT signal from ${senderDev.name} (${senderDev.id})`);
        const exists = this.deviceService.pairedDevices().find(d => d.id === senderDev.id);
        if (exists) {
          this.deviceService.reconnectDevice(senderDev.id);
        }
      }
    } else if (msg.type === 'DEVICE_REVOKE') {
      const targetId = (msg as any).payload?.targetDeviceId || msg.senderDevice?.id;
      const eraseData = (msg as any).payload?.eraseData === true;
      if (targetId === cur.id) {
        AirVaultLogger.warn(`[AirVault Sync] 🚨 This device received a remote revocation command! EraseData=${eraseData}`);
        if (eraseData) {
          this.storageService.clearAllLocally();
          this.uiStore.triggerToast(`🔒 Session revoked & all local vault data wiped by remote owner.`);
        } else {
          this.uiStore.triggerToast(`🔒 AirVault session revoked by remote owner.`);
        }
      } else if (msg.senderDevice) {
        // Disconnect the peer rather than deleting so that the peer remains in the list and can reconnect/pair again
        this.deviceService.disconnectDevice(msg.senderDevice.id);
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
      AirVaultLogger.debug(`[AirVault Sync] 🪦 Packet ${packet.packetId} is globally tombstoned. Ignoring resurrection.`);
      return;
    }

    // Deduplicate: avoid re-processing identical packet (Loop prevention A -> B -> C -> A)
    if (this.processedPacketIds.has(packet.packetId)) {
      AirVaultSyncDebugLogger.logDestinationSkipped(syncId, senderDevice.id, 'already_processed', packet.packetId);
      AirVaultLogger.debug(`[AirVault Sync] 🔁 Packet ${packet.packetId} already processed. Skipping duplicate.`);
      return;
    }
    this.markPacketProcessed(packet.packetId);

    try {
      const decrypted = await this.crypto.decryptPayload(packet);
      let classified: ClassifiedContent;
      let originDevId = senderDevice.id;
      let originDevName = senderDevice.name;

      const senderHandle = senderDevice.username ? `@${senderDevice.username}` : (senderDevice.name || 'Peer');
      const receivedAuthorColor = this.colorService.getColorForIdentity(senderDevice.username || senderDevice.id, senderDevice.accentColor);

      let isBatchParent = false;
      let batchFiles: AirVaultItem[] | undefined = undefined;
      let batchTotalCount: number | undefined = undefined;
      let batchTotalBytes: number | undefined = undefined;
      let batchId: string | undefined = undefined;

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

      const rawBatchFiles = parsed ? (parsed.batchFiles || parsed.batch_files) : null;
      const isBatchDetected = !!(parsed && (parsed.isBatchParent || parsed.is_batch_parent || (Array.isArray(rawBatchFiles) && rawBatchFiles.length > 0)));

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
            originOwnerId: senderDevice.username || senderDevice.id,
            senderDeviceId: senderDevice.id,
            senderDeviceName: senderHandle,
            senderDeviceAccent: receivedAuthorColor,
            authorColor: receivedAuthorColor,
            author_color: receivedAuthorColor,
            senderDeviceType: senderDevice.type,
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
          byteSize: parsed.byteSize || new Blob([parsed.raw]).size,
          lineBlameMap: incomingBlame
        };
      } else {
        classified = this.clipboardService.classify(decrypted);
        if (!classified.previewUrl && classified.category === 'image' && classified.raw) {
          classified.previewUrl = classified.raw;
        }
      }

      AirVaultSyncDebugLogger.logPacketDecrypted(syncId, classified.category);

      const receivedItem: AirVaultItem = {
        id: packet.packetId,
        packetId: packet.packetId,
        sequenceNumber: packet.sequenceNumber,
        originDeviceId: originDevId,
        originOwnerId: senderDevice.username || senderDevice.id,
        senderDeviceId: senderDevice.id,
        senderDeviceName: senderHandle,
        senderDeviceAccent: receivedAuthorColor,
        authorColor: receivedAuthorColor,
        author_color: receivedAuthorColor,
        senderDeviceType: senderDevice.type,
        targetDeviceId,
        content: classified,
        timestamp: packet.timestamp,
        isPinned: false,
        deliveryStatus: 'delivered',
        isBatchParent,
        batchId,
        batchFiles,
        batchTotalCount,
        batchTotalBytes,
        batchCompletedCount: isBatchParent ? (batchFiles?.length || 0) : undefined
      };

      if (!isInitialBatch) {
        AirVaultLogger.info(`[AirVault Sync] 📥 Received ${classified.category} "${classified.filename || 'Item'}" from ${senderHandle} (${packet.packetId})`);
      } else {
        AirVaultLogger.debug(`[AirVault Sync] 📥 (Initial Sync Batch) Received ${classified.category} "${classified.filename || 'Item'}" from ${senderHandle} (${packet.packetId})`);
      }
      const addResult = this.storageService.addItem(receivedItem);
      AirVaultSyncDebugLogger.logItemPersisted(syncId, receivedItem.id);
      AirVaultSyncDebugLogger.logUIUpdated(syncId);

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

    // 2. Also beam local items to all peers (strictly local origin items, no transitive relay)
    const localItems = this.storageService.items().filter(it => !it.originDeviceId || it.originDeviceId === cur.id || it.senderDeviceId === cur.id);
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



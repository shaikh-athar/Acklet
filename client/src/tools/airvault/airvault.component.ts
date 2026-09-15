import { Component, ChangeDetectionStrategy, ViewChild, HostListener, OnInit, OnDestroy, inject, ElementRef, signal, computed, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { IconComponent } from '../../app/shared/components/icon/icon';
import { FeedbackModalComponent } from '../../app/shared/components/feedback-modal/feedback-modal.component';

// Services & Stores
import { AirVaultClipboardStore } from './services/airvault-clipboard.store';
import { AirVaultDeviceStore } from './services/airvault-device.store';
import { AirVaultUIStore } from './services/airvault-ui.store';
import { AirVaultDeviceService, AirVaultDevice } from './services/airvault-device.service';
import { AirVaultStorageService, AirVaultItem } from './services/airvault-storage.service';
import { AirVaultSyncService } from './services/airvault-sync.service';
import { AirVaultMotionService } from './services/airvault-motion.service';
import { AirVaultIdentityService } from './services/airvault-identity.service';
import { AirVaultClipboardService, LineBlameEntry } from './services/airvault-clipboard.service';
import { AirVaultCollapseService } from './services/airvault-collapse.service';
import { AirVaultColorService } from './services/airvault-color.service';
import { AirVaultSyncDebugLogger, AirVaultLogger } from './services/airvault-sync-debug.service';
import { AirVaultWsTransportService } from './services/airvault-ws-transport.service';

// Subcomponents
import { AirVaultConstellationComponent } from './components/airvault-constellation.component';
import { AirVaultStagingComponent } from './components/airvault-staging.component';
import { AirVaultFooterComponent } from './components/airvault-footer.component';
import { AirVaultPairingModalComponent } from './components/airvault-pairing-modal.component';
import { AirVaultDeviceDrawerComponent } from './components/airvault-device-drawer.component';
import { AirVaultSettingsDrawerComponent } from './components/airvault-settings-drawer.component';
import { AirVaultTipsModalComponent } from './components/airvault-tips-modal.component';
import { AirVaultHistoryModalComponent } from './components/airvault-history-modal.component';
import { AirVaultIdentityOnboardingModalComponent } from './components/airvault-identity-onboarding-modal.component';
import { AirVaultEraseModalComponent } from './components/airvault-erase-modal.component';
import { AirVaultDeleteConfirmModalComponent } from './components/airvault-delete-confirm-modal.component';
import { AirVaultClearConfirmModalComponent } from './components/airvault-clear-confirm-modal.component';
import { ToolShellComponent } from '../../app/shared/components/tool-shell/tool-shell.component';
import { AirVaultToastComponent } from './components/airvault-toast.component';
import { AirVaultPreviewModalComponent } from './components/airvault-preview-modal.component';
import { AirVaultSyncModalComponent } from './components/airvault-sync-modal.component';
import { AirVaultSecurityChapterComponent } from './components/airvault-security-chapter.component';
import { AirVaultTelemetryChapterComponent } from './components/airvault-telemetry-chapter.component';
import { AirVaultProtocolsChapterComponent } from './components/airvault-protocols-chapter.component';

import { AckletToolSDK } from '../../app/core/services/tool-sdk';
import { PreferenceService } from '../../app/core/services/preference.service';

@Component({
  selector: 'app-airvault',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IconComponent,
    FeedbackModalComponent,
    ToolShellComponent,
    AirVaultConstellationComponent,
    AirVaultStagingComponent,
    AirVaultFooterComponent,
    AirVaultPairingModalComponent,
    AirVaultIdentityOnboardingModalComponent,
    AirVaultEraseModalComponent,
    AirVaultDeleteConfirmModalComponent,
    AirVaultClearConfirmModalComponent,
    AirVaultDeviceDrawerComponent,
    AirVaultSettingsDrawerComponent,
    AirVaultTipsModalComponent,
    AirVaultHistoryModalComponent,
    AirVaultToastComponent,
    AirVaultPreviewModalComponent,
    AirVaultSyncModalComponent,
    AirVaultSecurityChapterComponent,
    AirVaultTelemetryChapterComponent,
    AirVaultProtocolsChapterComponent
  ],
  templateUrl: './airvault.component.html',
  styleUrls: ['./airvault.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AirVaultComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  clipboardStore = inject(AirVaultClipboardStore);
  deviceStore = inject(AirVaultDeviceStore);
  uiStore = inject(AirVaultUIStore);

  deviceService = inject(AirVaultDeviceService);
  storageService = inject(AirVaultStorageService);
  syncService = inject(AirVaultSyncService);
  motionService = inject(AirVaultMotionService);
  identityService = inject(AirVaultIdentityService);
  clipboardService = inject(AirVaultClipboardService);
  collapseService = inject(AirVaultCollapseService);
  wsTransport = inject(AirVaultWsTransportService);
  elRef = inject(ElementRef);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  prefService = inject(PreferenceService);

  private sdk = new AckletToolSDK('airvault');

  @ViewChild(AirVaultStagingComponent) stagingComp?: AirVaultStagingComponent;
  @ViewChild(AirVaultConstellationComponent) constellationComp?: AirVaultConstellationComponent;

  // ── Global drag-and-drop state ────────────────────────────────
  /** True while a drag is active anywhere over the tool surface. */
  isDragging = signal<boolean>(false);
  /** Counter tracks nested dragenter/dragleave events so the overlay stays stable. */
  private _dragEnterCount = 0;

  @HostListener('window:focus')
  async onWindowFocus() {
    // Re-verify pairing state and storage on window re-focus
    await this.storageService.refreshFromStorage();
  }

  @HostListener('window:beforeunload')
  onBeforeUnload() {
    // Fire-and-forget beacon so peers immediately see this device as offline
    this.deviceService.sendOfflineBeacon();
  }

  @HostListener('window:dragover', ['$event'])
  onWindowDragOver(e: DragEvent) {
    // Only intercept external file/item drags, not DOM element reordering
    if (!e.dataTransfer?.types?.some(t => t === 'Files' || t === 'application/x-moz-file')) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    this.isDragging.set(true);
  }

  @HostListener('window:dragenter', ['$event'])
  onWindowDragEnter(e: DragEvent) {
    if (!e.dataTransfer?.types?.some(t => t === 'Files' || t === 'application/x-moz-file')) return;
    e.preventDefault();
    this._dragEnterCount++;
    this.isDragging.set(true);
  }

  @HostListener('window:dragleave', ['$event'])
  onWindowDragLeave(e: DragEvent) {
    if (!e.dataTransfer?.types?.some(t => t === 'Files' || t === 'application/x-moz-file')) return;
    this._dragEnterCount = Math.max(0, this._dragEnterCount - 1);
    if (this._dragEnterCount === 0) {
      this.isDragging.set(false);
    }
  }

  @HostListener('window:drop', ['$event'])
  onWindowDrop(e: DragEvent) {
    e.preventDefault();
    this._dragEnterCount = 0;
    this.isDragging.set(false);

    // Delegate all file/folder processing to the staging component's existing handler
    if (this.stagingComp) {
      this.stagingComp.onDrop(e);
    }
  }

  private subs: import('rxjs').Subscription[] = [];

  /** Number of paired devices currently online (used by navbar connection pill) */
  connectedDeviceCount = computed(() =>
    this.deviceStore.pairedDevices().filter(d => d.status === 'active').length
  );

  async ngOnInit() {
    this.storageService.loadAuditLogs();

    // Check if this browser has made an identity choice (Guest vs Existing Identity)
    if (!this.deviceService.hasChosenIdentity()) {
      this.uiStore.showIdentityOnboardingModal.set(true);
    }

    // Listen for incoming synced items
    this.subs.push(
      this.syncService.onIncomingItem.subscribe((item: AirVaultItem) => {
        if (item && item.content) {
          // Schedule auto-collapse for long content on the receiving side
          this.collapseService.scheduleCollapse(item);
        }
      })
    );

    // Listen for live clipboard text typed/pasted on remote devices
    this.subs.push(
      this.syncService.onLiveTextReceived.subscribe(({ text, senderDevice, lineBlameMap }) => {
        if (this.stagingComp) {
          this.stagingComp.updateLiveTextFromRemote(text, senderDevice, lineBlameMap);
        }
      })
    );

    this.subs.push(
      this.syncService.onPeerPaired.subscribe((device: AirVaultDevice) => {
        this.ngZone.run(() => {
          this.deviceStore.addDevice(device);
          this.uiStore.showPairingModal.set(false);
          this.uiStore.triggerToast(`⚡ Connected & Paired with @${device.username || device.name}`);
          this.cdr.detectChanges();
          this.cdr.markForCheck();
        });
      })
    );

    // Check if opened via QR Code containing ?pin=123456
    this.subs.push(
      this.route.queryParams.subscribe(params => {
        const rawPin = params['pin'];
        if (rawPin) {
          const match = String(rawPin).match(/\b\d{6}\b/) || String(rawPin).match(/\d{6}/);
          if (match) {
            const pin = match[0];
            AirVaultLogger.info(`[AirHold QR Auto-Pair] 📱 Opened via QR code with PIN [${pin.slice(0, 2)}****]. Initiating automatic handshake...`);
            this.syncService.pairWithPin(pin, this.deviceService.currentDevice().name);
          }
        }
      })
    );

    // Notify host shell that tool is mounted and ready
    this.sdk.ready({ version: '1.0.0', capabilities: ['e2ee', 'p2p', 'clipboard'] });

    // Initialize persistent WebSocket transport foundation
    this.wsTransport.connect();
  }

  ngOnDestroy() {
    this.wsTransport.disconnect();
    this.subs.forEach(s => s.unsubscribe());
    this.subs = [];
    this.storageService.flushPersistImmediate();
  }

  /**
   * Diagnostic test method: simulate a freeze for verification of host heartbeat detection.
   */
  simulateFreezeTest() {
    this.sdk.simulateFreeze();
  }

  async onBeamPayload(event: {
    text: string;
    targetDeviceId?: string;
    filename?: string;
    existingItemId?: string;
    lineBlameMap?: LineBlameEntry[];
    options?: { tag?: string; customCategory?: string; retentionTtlMs?: number };
  }) {
    // Enforce 1 GB vault storage cap before beaming
    if (this.storageService.capExceeded()) {
      const usedMB = (this.storageService.totalBytes() / 1024 / 1024).toFixed(0);
      this.uiStore.triggerToast(`⛔ Vault storage cap reached (${usedMB} MB / 1.0 GB). Delete items to add more.`);
      return;
    }

    // Check if identical content already exists in the vault (for new direct text inputs)
    let itemIdToUse = event.existingItemId;
    if (!itemIdToUse) {
      const classified = this.clipboardService.classify(event.text, event.filename);
      const existing = this.storageService.findDuplicateItem(classified);
      if (existing) {
        this.storageService.refreshItemExpiry(existing.id);
        itemIdToUse = existing.id;
      }
    }

    const syncId = AirVaultSyncDebugLogger.createCorrelationId();
    AirVaultSyncDebugLogger.startTimer(syncId);
    AirVaultSyncDebugLogger.logBeamContentCalled(syncId, event.filename ? 'file' : 'text');

    this.storageService.isRefreshing.set(true);
    const item = await this.syncService.beamContent(
      event.text,
      event.targetDeviceId,
      event.filename,
      itemIdToUse,
      event.lineBlameMap,
      syncId,
      event.options
    );
    // Schedule auto-collapse for long content
    if (item) this.collapseService.scheduleCollapse(item);
    setTimeout(() => this.storageService.isRefreshing.set(false), 600);
  }

  async onResendItem(item: AirVaultItem) {
    const title = item.content?.filename || item.content?.category || 'item';
    this.uiStore.triggerToast(`⚡ Resending "${title}" to connected devices...`);
    await this.syncService.broadcastItem(item);
  }

  onLiveTextChange(event: { text: string; lineBlameMap?: LineBlameEntry[] } | string) {
    if (typeof event === 'string') {
      this.syncService.broadcastLiveText(event);
    } else {
      this.syncService.broadcastLiveText(event.text, event.lineBlameMap);
    }
  }

  async onRefreshClipboard() {
    await this.storageService.refreshFromStorage();
  }

  onClearActiveClipboard() {
    const count = this.storageService.items().length;
    if (count === 0) {
      this.uiStore.triggerToast('ℹ️ Active clipboard is already empty');
      return;
    }
    this.uiStore.showClearActiveModal.set(true);
  }

  onConfirmClearActiveClipboard() {
    this.uiStore.showClearActiveModal.set(false);
    const count = this.storageService.items().length;
    const cleared = this.storageService.clearActiveClipboardLocally();
    this.uiStore.triggerToast(`✓ Cleared ${cleared} item${cleared > 1 ? 's' : ''} from local clipboard`);
  }

  onDeviceAdded(device: AirVaultDevice) {
    this.deviceStore.addDevice(device);
    this.uiStore.triggerToast(`✓ Paired ${device.name} successfully`);
  }

  onDeviceDisconnect(deviceId: string) {
    const dev = this.deviceService.pairedDevices().find(d => d.id === deviceId);
    const cur = this.deviceService.currentDevice();
    this.deviceService.disconnectDevice(deviceId);
    
    // Targeted disconnection signal so only the peer device marks relationship as disconnected
    this.syncService.sendSignalMessageDirect('DEVICE_DISCONNECT', JSON.stringify({
      targetDeviceId: deviceId,
      senderDevice: cur,
      timestamp: Date.now()
    }), deviceId);

    this.uiStore.triggerToast(`🔌 Disconnected ${dev?.name || 'Device'}`);
  }

  onDeviceReconnect(deviceId: string) {
    const dev = this.deviceService.pairedDevices().find(d => d.id === deviceId);
    const cur = this.deviceService.currentDevice();
    this.deviceService.reconnectDevice(deviceId);

    // Targeted reconnection signal so only the peer device resumes
    this.syncService.sendSignalMessageDirect('DEVICE_RECONNECT', JSON.stringify({
      targetDeviceId: deviceId,
      senderDevice: cur,
      timestamp: Date.now()
    }), deviceId);

    // Run existing sync process with the reconnected device
    if (dev) {
      this.syncService.initiateDeviceSync(dev);
    }

    this.uiStore.triggerToast(`⚡ Reconnected ${dev?.name || 'Device'}`);
  }

  onDeviceRemove(deviceId: string) {
    const dev = this.deviceService.pairedDevices().find(d => d.id === deviceId);
    const cur = this.deviceService.currentDevice();
    
    // Targeted DEVICE_DISCONNECT to peer so their side marks this device as Disconnected with Reconnect button
    this.syncService.sendSignalMessageDirect('DEVICE_DISCONNECT', JSON.stringify({
      targetDeviceId: deviceId,
      senderDevice: cur,
      timestamp: Date.now()
    }), deviceId);

    this.deviceStore.revokeDevice(deviceId);
    this.uiStore.triggerToast(`🗑️ Forgotten ${dev?.name || 'Device'}`);
  }

  onRevokeDevice(deviceId: string) {
    this.onDeviceRemove(deviceId);
  }

  onRemoteLogout(event: { deviceId: string; eraseData: boolean }) {
    const dev = (this.deviceService.registeredSessions() || []).find(d => d.id === event.deviceId) ||
                this.deviceService.pairedDevices().find(d => d.id === event.deviceId);
    this.deviceService.remoteLogoutDevice(event.deviceId, event.eraseData);
    
    // Targeted device revocation / wipe command to the remote peer
    this.syncService.sendSignalMessageDirect('DEVICE_REVOKE', JSON.stringify({
      targetDeviceId: event.deviceId,
      eraseData: event.eraseData,
      timestamp: Date.now()
    }), event.deviceId);

    const msg = event.eraseData 
      ? `🔐 Logged out & erased data on ${dev?.name || 'Remote Device'}`
      : `🔐 Logged out AirVault instance from ${dev?.name || 'Remote Device'}`;
    this.uiStore.triggerToast(msg);
  }

  onDeviceRename(event: { deviceId: string; newName: string }) {
    this.deviceStore.renameDevice(event.deviceId, event.newName);
    this.uiStore.triggerToast(`✓ Renamed device to "${event.newName}"`);
  }

  onRenameDevice(event: { deviceId: string; newName: string }) {
    this.onDeviceRename(event);
  }

  onTogglePin(itemId: string) {
    this.clipboardStore.togglePin(itemId);
  }

  onToggleReveal(itemId: string) {
    this.clipboardStore.toggleReveal(itemId);
  }

  onDeleteItem(itemId: string) {
    const item = this.storageService.allItems().find(i => i.id === itemId);
    if (!item) return;

    const curDev = this.deviceService.currentDevice();
    const isOwner = !item.originDeviceId || item.originDeviceId === curDev.id;
    const activePeers = this.deviceService.pairedDevices().filter(d => d.syncEnabled !== false && d.status !== 'revoked');

    if (isOwner && activePeers.length > 0) {
      // Prompt user with choice between deleting for everyone vs removing locally
      this.uiStore.openDeleteConfirm(item);
    } else {
      // If owner without connected peers or local item, show confirmation directly
      this.uiStore.openDeleteConfirm(item);
    }
  }

  onExecuteGlobalDelete(itemId: string) {
    this.uiStore.closeDeleteConfirm();
    this.storageService.deleteItemGlobally(itemId);
    this.syncService.broadcastGlobalDelete(itemId);
    this.uiStore.triggerToast(`✓ Resource deleted from all connected devices (Available in 30-day Restorable History)`);
  }

  onExecuteLocalDelete(itemId: string) {
    this.uiStore.closeDeleteConfirm();
    this.storageService.deleteItemLocally(itemId);
    this.uiStore.triggerToast(`✓ Resource removed from this device locally (Available in 30-day Restorable History)`);
  }

  onRestoreHistoryItem(itemId: string) {
    const result = this.storageService.restoreItemToActive(itemId);
    this.uiStore.triggerToast(result.message);
    if (result.success && result.item) {
      const curDev = this.deviceService.currentDevice();
      const isOwner = !result.item.originDeviceId || result.item.originDeviceId === curDev.id;
      if (isOwner) {
        // Broadcast restoration / sync to eligible active peers
        this.syncService.broadcastItem(result.item);
      }
    }
  }

  onPurgeHistoryItem(itemId: string) {
    this.storageService.purgeRestorableItemPermanently(itemId);
    this.uiStore.triggerToast(`✓ Resource content permanently deleted`);
  }

  onClearEntireHistory() {
    this.storageService.purgeAllRestorableHistory();
    this.uiStore.triggerToast(`✓ All restorable history permanently cleared`);
  }

  onClearAllItems() {
    this.clipboardStore.clearAll();
    this.uiStore.triggerToast(`✓ Vault history cleared`);
  }

  onTtlChange(ttlMs: number) {
    this.storageService.retentionTtlMs.set(ttlMs);
    this.uiStore.triggerToast(`⚡ Vault retention policy updated`);
  }

  openPairing() {
    this.syncService.lastPairedDevice.set(null);
    this.deviceStore.generatePairingPin();
    this.uiStore.showPairingModal.set(true);
  }

  openHistory() {
    this.uiStore.showHistoryModal.set(true);
  }

  // ── Filter Popover State & Options ──
  showFilterPopover = signal<boolean>(false);

  filterCategories = [
    { id: 'text', label: 'Plain Text', icon: 'align-left' },
    { id: 'code', label: 'Code Snippets', icon: 'code-2' },
    { id: 'json', label: 'JSON Data', icon: 'braces' },
    { id: 'url', label: 'URLs & Links', icon: 'link' },
    { id: 'image', label: 'Images & Photos', icon: 'image' },
    { id: 'video', label: 'Videos & Media', icon: 'film' },
    { id: 'file', label: 'Files & Documents', icon: 'file-text' },
    { id: 'archive', label: 'Archives (.zip)', icon: 'archive' },
  ];

  filterTimeRanges = [
    { id: 'today', label: 'Today (24h)' },
    { id: '7d', label: 'Past 7 Days' },
    { id: '30d', label: 'Past 30 Days' },
  ];

  filterSizeRanges = [
    { id: 'small', label: 'Small (< 10 KB)' },
    { id: 'medium', label: 'Medium (< 1 MB)' },
    { id: 'large', label: 'Large (> 1 MB)' },
  ];

  toggleFilterPopover() {
    this.showFilterPopover.update(v => !v);
  }

  closeFilterPopover() {
    this.showFilterPopover.set(false);
  }

  toggleCategoryFilter(cat: string) {
    this.uiStore.activeCategoryFilters.update(current => {
      if (current.includes(cat)) {
        return current.filter(c => c !== cat);
      } else {
        return [...current, cat];
      }
    });
  }

  toggleTimeFilter(time: string) {
    this.uiStore.activeTimeFilters.update(current => {
      if (current.includes(time)) {
        return current.filter(t => t !== time);
      } else {
        return [...current, time];
      }
    });
  }

  toggleSenderFilter(senderId: string) {
    this.uiStore.activeSenderFilters.update(current => {
      if (current.includes(senderId)) {
        return current.filter(s => s !== senderId);
      } else {
        return [...current, senderId];
      }
    });
  }

  toggleSizeFilter(size: string) {
    this.uiStore.activeSizeFilters.update(current => {
      if (current.includes(size)) {
        return current.filter(s => s !== size);
      } else {
        return [...current, size];
      }
    });
  }

  togglePinnedFilter() {
    this.uiStore.activePinnedOnly.update(v => !v);
  }

  toggleSensitiveFilter() {
    this.uiStore.activeSensitiveOnly.update(v => !v);
  }

  resetFilters() {
    this.uiStore.resetAllFilters();
  }

  // ── In-Place Scoped Navbar Search Engine ──
  private http = inject(HttpClient);
  colorService = inject(AirVaultColorService);
  showNavbarSearch = signal<boolean>(false);
  navbarSearchQuery = signal<string>('');
  isNavbarSearchFocused = signal<boolean>(false);
  isSearchingServer = signal<boolean>(false);
  navbarServerResults = signal<any[]>([]);
  selectedDropdownIndex = signal<number>(0);
  navbarActiveMatchIndex = signal<number>(0);
  private navbarSearchSubject$ = new Subject<string>();
  private navbarSearchSub?: Subscription;
  @ViewChild('navbarSearchInput') navbarSearchInput?: ElementRef<HTMLInputElement>;

  unifiedSearchResults = computed(() => {
    const q = this.navbarSearchQuery().trim();
    if (!q) return [];

    let pattern: RegExp;
    if (q.length <= 2) {
      pattern = new RegExp(`\\b${this.escapeRegex(q)}\\b`, 'i');
    } else {
      pattern = new RegExp(this.escapeRegex(q), 'i');
    }

    const list: any[] = [];
    const seenIds = new Set<string>();

    // Helper: Extract a clean, focused snippet window around an exact match index
    const extractMatchContext = (fullText: string, matchIdx: number, matchLen: number): string => {
      const lines = fullText.split('\n');
      let runningOffset = 0;
      let matchedLine = '';
      for (const line of lines) {
        const lineLen = line.length + 1; // +1 for newline
        if (matchIdx >= runningOffset && matchIdx < runningOffset + lineLen) {
          matchedLine = line;
          break;
        }
        runningOffset += lineLen;
      }

      const targetText = matchedLine || fullText;
      if (targetText.length <= 110) return targetText.trim();

      const innerIdx = targetText.toLowerCase().indexOf(q);
      const start = Math.max(0, innerIdx - 40);
      const end = Math.min(targetText.length, innerIdx + matchLen + 50);
      let snippet = targetText.substring(start, end).trim();
      if (start > 0) snippet = '…' + snippet;
      if (end < targetText.length) snippet = snippet + '…';
      return snippet;
    };

    // 0. Active Staged Editor Content — Extract EACH exact match as its own distinct navigable result
    const staged = (this.clipboardStore.stagedText() || '').trim();
    if (staged) {
      let regexMatch: RegExpExecArray | null;
      let matchCount = 0;
      while ((regexMatch = pattern.exec(staged)) !== null) {
        const matchIndex = regexMatch.index;
        const matchText = regexMatch[0];
        const matchId = `staged-match-${matchIndex}`;
        const snippet = extractMatchContext(staged, matchIndex, matchText.length);

        // Compute 1-indexed line and column for precision
        const before = staged.substring(0, matchIndex);
        const lineNum = before.split('\n').length;
        const colNum = matchIndex - before.lastIndexOf('\n');

        list.push({
          id: matchId,
          type: 'EDITOR',
          title: `Line ${lineNum}, Col ${colNum}`,
          snippet,
          authorUsername: 'Current Editor',
          authorColor: '#2196F3',
          timestamp: Date.now(),
          byteSize: new Blob([staged]).size,
          isStaged: true,
          isLocalActive: true,
          matchIndex,
          matchLength: matchText.length,
          itemRef: {
            id: matchId,
            content: {
              category: 'text',
              filename: `Staged Editor (Line ${lineNum})`,
              raw: staged
            },
            senderDeviceName: 'Current Editor',
            timestamp: Date.now()
          }
        });
        matchCount++;
        if (matchCount >= 20) break; // Cap at 20 editor matches to keep UI responsive
      }
    }

    // 1. Local active clipboard items
    const activeItems = this.clipboardStore.items() || [];
    for (const item of activeItems) {
      const title = item.content?.filename || item.content?.raw?.split('\n')[0] || 'Clipboard Item';
      const snippet = item.content?.raw || '';
      const cat = (item.content?.category || 'text').toUpperCase();
      const author = item.senderDeviceName || 'Local Device';
      const authorCol = this.colorService.getColorForIdentity(author, item.senderDeviceAccent);
      const tag = item.tag || '';

      if (pattern.test(title) || pattern.test(snippet) || pattern.test(author) || (tag && pattern.test(tag))) {
        seenIds.add(item.id);
        const fullSnippet = snippet || title;
        let matchSnippet = title;
        let matchIdx = fullSnippet.toLowerCase().indexOf(q);
        if (matchIdx >= 0) {
          matchSnippet = extractMatchContext(fullSnippet, matchIdx, q.length);
        } else if (tag && tag.toLowerCase().includes(q)) {
          matchSnippet = `#${tag} · ${title}`;
        }

        list.push({
          id: item.id,
          type: cat,
          title: tag ? `[#${tag}] ${title}` : title,
          snippet: matchSnippet,
          authorUsername: author,
          authorColor: authorCol,
          timestamp: item.timestamp,
          byteSize: item.content?.byteSize,
          isLocalActive: true,
          itemRef: item
        });
      }
    }

    // 2. Server vault history search results
    const serverItems = this.navbarServerResults() || [];
    for (const s of serverItems) {
      const sid = s.entryId || s.id;
      if (!seenIds.has(sid)) {
        seenIds.add(sid);
        const author = s.actorUsername || s.deviceName || 'Vault';
        const authorCol = this.colorService.getColorForIdentity(author, s.authorColor);
        const rawContent = s.snippet || s.after_value || s.title || '';
        let matchSnippet = rawContent;
        let matchIdx = rawContent.toLowerCase().indexOf(q);
        if (matchIdx >= 0) {
          matchSnippet = extractMatchContext(rawContent, matchIdx, q.length);
        }

        list.push({
          id: sid,
          type: (s.entryType || s.category || 'FILE').toUpperCase(),
          title: s.title || s.file_name || 'History Entry',
          snippet: matchSnippet,
          authorUsername: author,
          authorColor: authorCol,
          timestamp: s.timestampUtc || s.timestamp,
          byteSize: s.byteSize,
          isLocalActive: false,
          itemRef: s
        });
      }
    }

    return list;
  });

  topDropdownResults = computed(() => {
    return this.unifiedSearchResults().slice(0, 10);
  });

  totalResultCount = computed(() => {
    return this.unifiedSearchResults().length;
  });

  navbarTotalMatches = computed(() => {
    const q = this.navbarSearchQuery().trim().toLowerCase();
    if (!q) return 0;
    return this.unifiedSearchResults().length;
  });

  navbarActiveMatchDisplay = computed(() => {
    const total = this.navbarTotalMatches();
    if (total === 0) return 0;
    return Math.min(this.selectedDropdownIndex() + 1, total);
  });

  openNavbarSearch() {
    this.showNavbarSearch.set(true);
    setTimeout(() => {
      this.navbarSearchInput?.nativeElement?.focus();
    }, 50);
  }

  closeNavbarSearch() {
    this.showNavbarSearch.set(false);
    this.navbarSearchQuery.set('');
    this.clipboardStore.setSearchQuery('');
    this.uiStore.clearSearchHighlightQuery();
    this.navbarServerResults.set([]);
    this.selectedDropdownIndex.set(0);
    this.navbarActiveMatchIndex.set(0);
  }

  onNavbarSearchInput(val: string) {
    this.navbarSearchQuery.set(val);
    this.clipboardStore.setSearchQuery(val);
    this.uiStore.setSearchHighlightQuery(val);
    this.selectedDropdownIndex.set(0);
    this.navbarActiveMatchIndex.set(0);
    this.uiStore.setActiveMatchIndex(0);
    this.navbarSearchSubject$.next(val);
  }

  onNavbarSearchKeydown(e: KeyboardEvent) {
    const results = this.topDropdownResults();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (results.length > 0) {
        const next = (this.selectedDropdownIndex() + 1) % results.length;
        this.selectedDropdownIndex.set(next);
        this.uiStore.setActiveMatchIndex(next);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length > 0) {
        const prev = (this.selectedDropdownIndex() - 1 + results.length) % results.length;
        this.selectedDropdownIndex.set(prev);
        this.uiStore.setActiveMatchIndex(prev);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        this.prevNavbarMatch(e);
      } else {
        if (results.length > 0 && this.selectedDropdownIndex() >= 0 && this.selectedDropdownIndex() < results.length) {
          this.nextNavbarMatch(e);
        } else {
          this.nextNavbarMatch(e);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.closeNavbarSearch();
    }
  }

  nextNavbarMatch(e?: Event) {
    e?.preventDefault();
    e?.stopPropagation();
    const results = this.topDropdownResults();
    if (results.length === 0) return;
    const next = (this.selectedDropdownIndex() + 1) % results.length;
    this.selectedDropdownIndex.set(next);
    this.uiStore.setActiveMatchIndex(next);
    this.scrollToActiveMatch(results[next]);
  }

  prevNavbarMatch(e?: Event) {
    e?.preventDefault();
    e?.stopPropagation();
    const results = this.topDropdownResults();
    if (results.length === 0) return;
    const prev = (this.selectedDropdownIndex() - 1 + results.length) % results.length;
    this.selectedDropdownIndex.set(prev);
    this.uiStore.setActiveMatchIndex(prev);
    this.scrollToActiveMatch(results[prev]);
  }

  private scrollToActiveMatch(result: any) {
    if (!result) return;
    const currentQuery = this.navbarSearchQuery().trim();
    if (result.isStaged || result.id?.startsWith('staged-match-')) {
      const textarea = document.querySelector('.composer-textarea') as HTMLTextAreaElement;
      if (textarea && currentQuery) {
        textarea.focus();
        const start = typeof result.matchIndex === 'number' ? result.matchIndex : (textarea.value || '').toLowerCase().indexOf(currentQuery.toLowerCase());
        const len = typeof result.matchLength === 'number' ? result.matchLength : currentQuery.length;
        if (start >= 0) {
          textarea.setSelectionRange(start, start + len);
          
          // Scroll textarea smoothly to the matched line
          const textBefore = (textarea.value || '').substring(0, start);
          const lineIndex = textBefore.split('\n').length - 1;
          const approxLineHeight = 21.45;
          const targetScroll = Math.max(0, (lineIndex * approxLineHeight) - 80);
          textarea.scrollTo({ top: targetScroll, behavior: 'smooth' });
        }
      }
    } else {
      const targetId = result.id || result.entryId;
      if (targetId) {
        const cardEl = document.querySelector(`[data-card-id="${targetId}"]`) as HTMLElement;
        if (cardEl) {
          cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          cardEl.classList.add('av-pulse-highlight');
          setTimeout(() => cardEl.classList.remove('av-pulse-highlight'), 1800);
        }
      }
    }
  }

  onSelectSearchResult(result: any) {
    if (!result) return;
    const currentQuery = this.navbarSearchQuery().trim();
    if (currentQuery) {
      this.uiStore.setSearchHighlightQuery(currentQuery);
    }
    this.closeNavbarSearch();

    const type = (result.type || result.entryType || result.category || '').toUpperCase();
    const isFileOrMedia = type === 'IMAGE' || type === 'FILE' || type === 'ARCHIVE' || type === 'BATCH' || type === 'PDF' || type === 'VIDEO' || type === 'AUDIO' || type === 'SPREADSHEET' || type === 'FONT';

    const itemToPreview = result.itemRef || {
      id: result.id || result.entryId,
      content: {
        category: (result.category || type).toLowerCase(),
        filename: result.title,
        byteSize: result.byteSize,
        dataUrl: result.previewUrl || result.dataUrl,
        raw: result.snippet,
        mimeType: result.mimeType || 'application/octet-stream'
      },
      senderDeviceName: result.authorUsername || result.deviceName,
      timestamp: result.timestamp
    };

    // 0. If it's the active staged editor content:
    if (result.isStaged || result.id?.startsWith('staged-match-')) {
      const textarea = document.querySelector('.composer-textarea') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
        const start = typeof result.matchIndex === 'number' ? result.matchIndex : (textarea.value || '').toLowerCase().indexOf(currentQuery.toLowerCase());
        const len = typeof result.matchLength === 'number' ? result.matchLength : currentQuery.length;
        if (start >= 0) {
          textarea.setSelectionRange(start, start + len);
          const textBefore = (textarea.value || '').substring(0, start);
          const lineIndex = textBefore.split('\n').length - 1;
          const approxLineHeight = 21.45;
          const targetScroll = Math.max(0, (lineIndex * approxLineHeight) - 80);
          textarea.scrollTo({ top: targetScroll, behavior: 'smooth' });
        }
      }
      return;
    }

    // Ensure category tab in stream is set to 'all' so cards are visible
    this.clipboardStore.activeTab.set('all');

    const targetId = result.id || result.entryId;

    // 1. Scroll feed to target card and apply pulse animation
    setTimeout(() => {
      const cardEl = document.querySelector(`[data-card-id="${targetId}"]`) as HTMLElement;
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        cardEl.classList.add('av-pulse-highlight');
        setTimeout(() => {
          cardEl.classList.remove('av-pulse-highlight');
        }, 2600);
      }
    }, 50);

    // 2. Open in preview mode with highlighted query
    this.uiStore.openPreview(itemToPreview, currentQuery);
  }

  getHighlightSegments(text: string, query: string): { text: string; isMatch: boolean }[] {
    if (!text) return [];
    const q = query ? query.trim() : '';
    if (!q) return [{ text, isMatch: false }];

    let pattern: RegExp;
    if (q.length <= 2) {
      pattern = new RegExp(`\\b${this.escapeRegex(q)}\\b`, 'gi');
    } else {
      pattern = new RegExp(this.escapeRegex(q), 'gi');
    }

    const segments: { text: string; isMatch: boolean }[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ text: text.substring(lastIndex, match.index), isMatch: false });
      }
      segments.push({ text: match[0], isMatch: true });
      lastIndex = pattern.lastIndex;
      if (match.index === pattern.lastIndex) {
        pattern.lastIndex++;
      }
    }

    if (lastIndex < text.length) {
      segments.push({ text: text.substring(lastIndex), isMatch: false });
    }

    return segments;
  }

  formatRelativeTime(ts: number | string | Date): string {
    if (!ts) return '';
    const now = Date.now();
    const time = new Date(ts).getTime();
    const diff = Math.floor((now - time) / 1000);
    if (diff < 5) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 172800) return 'Yesterday';
    return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  formatBytes(bytes?: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  getSearchItemIcon(item: any): string {
    const type = (item.type || item.entryType || item.category || '').toLowerCase();
    if (type.includes('image')) return 'image';
    if (type.includes('file') || type.includes('pdf')) return 'file-text';
    if (type.includes('url') || type.includes('link')) return 'link';
    if (type.includes('code')) return 'code';
    if (type.includes('json')) return 'file-json';
    if (type.includes('archive')) return 'archive';
    return 'file';
  }

  getSearchTypeClass(item: any): string {
    const type = (item.type || item.entryType || item.category || '').toLowerCase();
    if (type.includes('image')) return 'type-amber';
    if (type.includes('file') || type.includes('pdf')) return 'type-blue';
    if (type.includes('url') || type.includes('link')) return 'type-blue';
    if (type.includes('code')) return 'type-indigo';
    if (type.includes('json')) return 'type-emerald';
    if (type.includes('archive')) return 'type-cyan';
    return 'type-muted';
  }

  scrollToInfo() {
    document.getElementById('screen-info')?.scrollIntoView({ behavior: 'smooth' });
  }

  scrollToMain() {
    document.getElementById('sec-composer')?.scrollIntoView({ behavior: 'smooth' });
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (this.showNavbarSearch()) {
        this.closeNavbarSearch();
      } else {
        this.uiStore.closeAllModals();
      }
    }
    if ((e.metaKey || e.ctrlKey) && (e.key === 'f' || e.key === 'k')) {
      e.preventDefault();
      this.openNavbarSearch();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
      e.preventDefault();
      this.uiStore.showHistoryModal.update(v => !v);
    }
  }
}

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
import { AirVaultPreferencesService } from './services/airvault-preferences.service';
import { AirVaultColorService } from './services/airvault-color.service';
import { AirVaultSyncDebugLogger, AirVaultLogger } from './services/airvault-sync-debug.service';
import { AirVaultWsTransportService } from './services/airvault-ws-transport.service';
import { AirVaultShortcutService } from './services/airvault-shortcut.service';
import { checkDuplicateResource } from './services/airvault-action-detector';
import { AirVaultTourService } from './services/airvault-tour.service';
import { AirVaultTourComponent } from './components/airvault-tour.component';

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
import { AirVaultDuplicateModalComponent } from './components/airvault-duplicate-modal.component';
import { ToolShellComponent } from '../../app/shared/components/tool-shell/tool-shell.component';
import { AirVaultToastComponent } from './components/airvault-toast.component';
import { AirVaultPreviewModalComponent } from './components/airvault-preview-modal.component';
import { AirVaultSyncModalComponent } from './components/airvault-sync-modal.component';
import { AirVaultSyncConsentModalComponent } from './components/airvault-sync-consent-modal.component';
import { AirVaultSecurityChapterComponent } from './components/airvault-security-chapter.component';
import { AirVaultTelemetryChapterComponent } from './components/airvault-telemetry-chapter.component';
import { AirVaultProtocolsChapterComponent } from './components/airvault-protocols-chapter.component';

import { AirVaultSharedClipboardService } from './services/airvault-shared-clipboard.service';
import { AirVaultShareLinkModalComponent } from './components/airvault-share-link-modal.component';
import { AirVaultSharedBannerComponent } from './components/airvault-shared-banner.component';

import { AirVaultInvitationService } from './services/airvault-invitation.service';
import { AirVaultInviteModalComponent } from './components/airvault-invite-modal.component';
import { AirVaultNotificationInboxComponent } from './components/airvault-notification-inbox.component';
import { AirVaultLimitsService } from './services/airvault-limits.service';
import { AirVaultCreateClipboardModalComponent } from './components/airvault-create-clipboard-modal.component';

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
    AirVaultDuplicateModalComponent,
    AirVaultSyncConsentModalComponent,
    AirVaultDeviceDrawerComponent,
    AirVaultSettingsDrawerComponent,
    AirVaultTipsModalComponent,
    AirVaultHistoryModalComponent,
    AirVaultToastComponent,
    AirVaultPreviewModalComponent,
    AirVaultSyncModalComponent,
    AirVaultSecurityChapterComponent,
    AirVaultTelemetryChapterComponent,
    AirVaultProtocolsChapterComponent,
    AirVaultTourComponent,
    AirVaultShareLinkModalComponent,
    AirVaultInviteModalComponent,
    AirVaultNotificationInboxComponent,
    AirVaultCreateClipboardModalComponent
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
  sharedClipboardService = inject(AirVaultSharedClipboardService);
  invitationService = inject(AirVaultInvitationService);
  limitsService = inject(AirVaultLimitsService);

  readonly isCreateModalOpen = signal<boolean>(false);

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
  prefService = inject(AirVaultPreferencesService);
  corePrefService = inject(PreferenceService);
  shortcutService = inject(AirVaultShortcutService);
  tourService = inject(AirVaultTourService);

  private sdk = new AckletToolSDK('airvault');

  @ViewChild(AirVaultStagingComponent) stagingComp?: AirVaultStagingComponent;
  @ViewChild(AirVaultConstellationComponent) constellationComp?: AirVaultConstellationComponent;
  @ViewChild('slugEditInput') slugEditInput?: ElementRef<HTMLInputElement>;

  // ── Editable Clipboard Slug State & Collaborator Multi-Clipboard Dropdown ──
  isEditingClipboardId = signal<boolean>(false);
  editingSlugValue = signal<string>('');
  isCheckingSlug = signal<boolean>(false);
  isSavingSlug = signal<boolean>(false);
  isSlugCopied = signal<boolean>(false);
  slugCheckResult = signal<{ available: boolean; message: string } | null>(null);
  private slugDebounceSubject = new Subject<string>();
  readonly activeClipboardSlug = computed(() => this.sharedClipboardService.activeClipboardId());
  
  showClipboardDropdown = signal<boolean>(false);
  activeBoardMenuId = signal<string | null>(null);

  toggleBoardSubMenu(boardId: string, event?: Event) {
    if (event) event.stopPropagation();
    if (this.activeBoardMenuId() === boardId) {
      this.activeBoardMenuId.set(null);
    } else {
      this.activeBoardMenuId.set(boardId);
    }
  }

  closeBoardSubMenu() {
    this.activeBoardMenuId.set(null);
  }

  /**
   * List of all accessible clipboards:
   * 1. Primary personal clipboard (Admin/Owner)
   * 2. Connected/Accepted collaborator boards (paired devices)
   * 3. Invite-granted collaborator boards (accepted via invitation flow)
   * 4. Currently active shared board (if viewing via a link)
   */
  readonly availableClipboards = computed(() => {
    const list: Array<{
      id: string;
      title: string;
      ownerUsername: string;
      isAdmin: boolean;
      accessMode: 'read-only' | 'read-write';
      isCurrent: boolean;
      memberCount?: number;
    }> = [];

    const myId = this.sharedClipboardService.currentClipboardId();
    const myUser = this.deviceService.currentDevice().username || 'You';
    const activeId = this.sharedClipboardService.activeClipboardId();
    const isViewingLink = this.sharedClipboardService.isViewingSharedLink();

    const addedIds = new Set<string>();

    // 1. My Personal Clipboard (Parent Admin)
    list.push({
      id: myId,
      title: `${myUser}'s Vault`,
      ownerUsername: myUser,
      isAdmin: true,
      accessMode: 'read-write',
      isCurrent: !isViewingLink || activeId === myId,
      memberCount: 1 + this.deviceStore.pairedDevices().length
    });
    addedIds.add(myId);

    // 2. User's Created Standalone Clipboards (Admin/Owner)
    for (const board of this.sharedClipboardService.myCreatedClipboards()) {
      if (!addedIds.has(board.id)) {
        addedIds.add(board.id);
        list.push({
          id: board.id,
          title: board.title || `#${board.id}`,
          ownerUsername: board.ownerUsername || myUser,
          isAdmin: true,
          accessMode: board.accessMode,
          isCurrent: isViewingLink && activeId === board.id,
          memberCount: board.itemCount || 1
        });
      }
    }

    // 3. Collaborator Boards from paired devices
    for (const dev of this.deviceStore.pairedDevices()) {
      if (dev.username && dev.username !== myUser) {
        const collabId = dev.username.toLowerCase().replace(/^@/, '');
        if (!addedIds.has(collabId)) {
          addedIds.add(collabId);
          list.push({
            id: collabId,
            title: `@${dev.username.replace(/^@/, '')}'s Board`,
            ownerUsername: dev.username.replace(/^@/, ''),
            isAdmin: false,
            accessMode: 'read-write',
            isCurrent: isViewingLink && activeId === collabId,
            memberCount: 2
          });
        }
      }
    }

    // 4. Invite-granted collaborator boards (accepted via invitation flow)
    for (const board of this.invitationService.grantedCollaboratorBoards()) {
      if (!addedIds.has(board.clipboardId)) {
        addedIds.add(board.clipboardId);
        list.push({
          id: board.clipboardId,
          title: board.clipboardTitle || `@${board.ownerUsername}'s Board`,
          ownerUsername: board.ownerUsername || '',
          isAdmin: false,
          accessMode: board.accessLevel,
          isCurrent: isViewingLink && activeId === board.clipboardId,
          memberCount: 2
        });
      }
    }

    // 5. If currently visiting a shared link not yet in list
    if (isViewingLink && this.sharedClipboardService.sharedClipboard()) {
      const shared = this.sharedClipboardService.sharedClipboard()!;
      if (!addedIds.has(shared.id)) {
        list.push({
          id: shared.id,
          title: shared.title || `#${shared.id}`,
          ownerUsername: shared.ownerUsername || 'VaultOwner',
          isAdmin: shared.isOwner,
          accessMode: shared.accessMode,
          isCurrent: true,
          memberCount: shared.items ? shared.items.length : 1
        });
      }
    }

    return list;
  });

  // ── Global drag-and-drop state ────────────────────────────────
  /** True while a drag is active anywhere over the tool surface. */
  isDragging = signal<boolean>(false);
  /** Counter tracks nested dragenter/dragleave events so the overlay stays stable. */
  private _dragEnterCount = 0;

  private lastFocusRefresh = 0;

  @HostListener('window:focus')
  async onWindowFocus() {
    const now = Date.now();
    // Throttle window focus refreshes to at most once every 3 seconds
    if (now - this.lastFocusRefresh < 3000) return;
    this.lastFocusRefresh = now;
    // Broadcast presence so connected devices immediately establish/refresh online connection
    this.deviceService.broadcastDeviceOnlineSignal();
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
  private pendingDeliveries = new Map<string, { timeoutTimer: any; itemName: string; targetPeerName?: string }>();

  /** Number of paired devices currently online (used by navbar connection pill) */
  connectedDeviceCount = computed(() =>
    this.deviceStore.pairedDevices().filter(d => d.status === 'active').length
  );

  // Initial bootstrap & setup loader state (prevents main-thread freeze during startup)
  isInitializing = signal<boolean>(true);

  async ngOnInit() {
    // Non-blocking setup pipeline: render lightweight workspace shell immediately
    // and defer background store hydration and WebSocket connection to idle/post-paint
    setTimeout(async () => {
      try {
        this.storageService.loadAuditLogs();
        this.sharedClipboardService.fetchMyClipboards();

        // Check if this browser has made an identity choice (Guest vs Existing Identity)
        if (!this.deviceService.hasChosenIdentity()) {
          this.uiStore.showIdentityOnboardingModal.set(true);
        }

        // Initialize persistent WebSocket transport foundation
        this.wsTransport.connect();
      } finally {
        this.isInitializing.set(false);
      }
    }, 150);

    // Listen for incoming synced items
    this.subs.push(
      this.syncService.onIncomingItem.subscribe((item: AirVaultItem) => {
        if (item && item.content) {
          // Schedule auto-collapse for long content on the receiving side
          this.collapseService.scheduleCollapse(item);
        }
      })
    );

    // Listen for delivery ACK confirmations from remote devices
    this.subs.push(
      this.syncService.onDeliveryConfirmed.subscribe(({ packetId, targetDeviceId }) => {
        this.ngZone.run(() => {
          const pending = this.pendingDeliveries.get(packetId);
          if (pending) {
            clearTimeout(pending.timeoutTimer);
            this.pendingDeliveries.delete(packetId);

            const paired = this.deviceStore.pairedDevices();
            const peer = paired.find(d => d.id === targetDeviceId) ||
                         (this.deviceService.registeredSessions() || []).find(s => s.id === targetDeviceId);
            const peerHandle = peer?.username ? `@${peer.username.replace(/^@/, '')}` : (peer?.name || pending.targetPeerName || 'connected device');
            this.uiStore.triggerToast(`⚡ Beamed entry delivered to ${peerHandle}`);
          }
        });
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

    // Check if opened via Standalone Shareable Clipboard link (:clipboardId) or Invitation (:invitationId)
    this.subs.push(
      this.route.paramMap.pipe(
        switchMap(params => {
          const invitationId = params.get('invitationId');
          if (invitationId) {
            // Use the new public preview endpoint first — no auth required.
            // It returns the correct status (VALID / EXPIRED / REVOKED / etc.)
            // and safe metadata so the inbox card renders correctly.
            this.invitationService.previewInvitation(invitationId).subscribe({
              next: (res) => {
                if (!res?.data) return;
                const preview = res.data;

                if (preview.status === 'VALID' && preview.clipboardId) {
                  // Build a minimal InvitationDto from the preview so the inbox
                  // can render the accept/decline card without an authenticated call.
                  const syntheticInvite = {
                    id: invitationId,
                    clipboardId: preview.clipboardId,
                    clipboardTitle: preview.clipboardTitle || 'Shared Clipboard',
                    inviterUserId: preview.inviterUsername || '',
                    inviteType: (preview.inviteType || 'LINK') as 'USERNAME' | 'LINK',
                    targetUsername: preview.targetUsernameMasked,
                    status: 'PENDING' as const,
                    accessLevel: (preview.accessLevel || 'read-only') as 'read-only' | 'read-write',
                    usedCount: 0,
                    createdAt: new Date().toISOString(),
                    expiresAt: preview.expiresAt || new Date(Date.now() + 7 * 86400000).toISOString(),
                    inviteUrl: `/invite/${invitationId}`,
                    isValid: true
                  };

                  this.invitationService.pendingInbox.update(prev => {
                    if (prev.some(inv => inv.id === syntheticInvite.id)) return prev;
                    return [syntheticInvite, ...prev];
                  });

                  // Open the inbox drawer so the user immediately sees the card
                  this.invitationService.toggleInbox(true);
                } else if (preview.status === 'EXPIRED') {
                  this.uiStore.triggerToast('⏰ This invitation link has expired.');
                } else if (preview.status === 'REVOKED') {
                  this.uiStore.triggerToast('🚫 This invitation has been revoked by the sender.');
                } else if (preview.status === 'EXHAUSTED') {
                  this.uiStore.triggerToast('This invitation link has already been used to its maximum.');
                } else if (preview.status === 'NOT_FOUND' || preview.status === 'CLIPBOARD_GONE') {
                  this.uiStore.triggerToast('❓ Invitation not found or the clipboard no longer exists.');
                }
              },
              error: () => {
                this.uiStore.triggerToast('Failed to load invitation details. Please try again.');
              }
            });
          }

          const clipboardId = params.get('clipboardId');
          if (clipboardId) {
            // If it matches own board ID, return to regular view
            if (clipboardId === this.sharedClipboardService.currentClipboardId()) {
              this.sharedClipboardService.exitSharedView();
              return of(null);
            }
            // If paired to this owner, return to regular view
            const isPaired = this.deviceStore.pairedDevices().some(d => d.username === clipboardId || d.id === clipboardId);
            if (isPaired) {
              this.sharedClipboardService.exitSharedView();
              return of(null);
            }
            // Fetch shared clipboard from backend
            return this.sharedClipboardService.fetchSharedClipboard(clipboardId);
          } else {
            this.sharedClipboardService.exitSharedView();
            return of(null);
          }
        })
      ).subscribe(shared => {
        if (shared) {
          this.cdr.markForCheck();
        }
      })
    );

    // Initial sync of local clipboard to backend for shareable link availability
    setTimeout(() => {
      if (!this.sharedClipboardService.isViewingSharedLink()) {
        this.sharedClipboardService.syncMyClipboard(this.storageService.items());
      }
    }, 1500);

    // Live availability check debounce for editable clipboard slug
    this.subs.push(
      this.slugDebounceSubject.pipe(
        debounceTime(350),
        distinctUntilChanged(),
        switchMap(slug => {
          if (!slug || slug.length < 3) {
            return of({ available: false, message: 'Must be 3–32 characters' });
          }
          return this.sharedClipboardService.checkSlugAvailability(slug);
        })
      ).subscribe(res => {
        this.isCheckingSlug.set(false);
        this.slugCheckResult.set(res);
        this.cdr.markForCheck();
      })
    );

    // Notify host shell that tool is mounted and ready
    this.sdk.ready({ version: '1.0.0', capabilities: ['e2ee', 'p2p', 'clipboard'] });
  }

  // ── Clipboard Slug Actions ─────────────────────────────────────

  startEditingSlug(event?: Event) {
    if (event) event.stopPropagation();
    if (this.sharedClipboardService.isViewingSharedLink()) return;
    this.editingSlugValue.set(this.sharedClipboardService.currentClipboardId());
    this.slugCheckResult.set({ available: true, message: 'Current ID' });
    this.isEditingClipboardId.set(true);
    setTimeout(() => {
      if (this.slugEditInput?.nativeElement) {
        this.slugEditInput.nativeElement.focus();
        this.slugEditInput.nativeElement.select();
      }
    }, 50);
  }

  cancelEditingSlug() {
    this.isEditingClipboardId.set(false);
    this.slugCheckResult.set(null);
    this.isCheckingSlug.set(false);
  }

  onSlugInputChanged(value: string) {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-_]/g, '').slice(0, 32);
    this.editingSlugValue.set(sanitized);
    this.slugDebounceSubject.next(sanitized);
  }

  onSlugInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.saveSlugRename();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelEditingSlug();
    }
  }

  async saveSlugRename() {
    const slug = this.editingSlugValue().trim();
    if (!slug || slug.length < 3) {
      this.uiStore.triggerToast('⚠️ Clipboard ID must be at least 3 characters');
      return;
    }
    if (this.slugCheckResult() && !this.slugCheckResult()?.available) {
      this.uiStore.triggerToast('⚠️ This clipboard ID is already taken');
      return;
    }

    this.isSavingSlug.set(true);
    const result = await this.sharedClipboardService.renameClipboard(slug);
    this.isSavingSlug.set(false);

    if (result && result.success) {
      this.isEditingClipboardId.set(false);
      this.uiStore.triggerToast(`✨ Clipboard ID updated to #${slug}`);
    } else {
      this.uiStore.triggerToast(`⚠️ ${result?.error || 'Failed to update clipboard ID'}`);
    }
  }

  // ── Multi-Clipboard Collaborator Dropdown Switcher Actions ───

  toggleClipboardDropdown(event?: Event) {
    if (event) event.stopPropagation();
    const next = !this.showClipboardDropdown();
    this.showClipboardDropdown.set(next);
    if (!next) {
      this.activeBoardMenuId.set(null);
    }
  }

  closeClipboardDropdown() {
    this.showClipboardDropdown.set(false);
    this.activeBoardMenuId.set(null);
  }

  async selectClipboard(board: { id: string; isAdmin: boolean; title: string }) {
    this.closeClipboardDropdown();
    const myId = this.sharedClipboardService.currentClipboardId();

    if (board.id === myId) {
      this.sharedClipboardService.exitSharedView();
      this.uiStore.triggerToast(`🏠 Switched to your primary clipboard (#${myId})`);
    } else {
      this.uiStore.triggerToast(`🔄 Loading @${board.id}'s clipboard...`);
      const res = await this.sharedClipboardService.fetchSharedClipboard(board.id);
      if (res) {
        this.uiStore.triggerToast(`📋 Switched to @${board.id}'s clipboard`);
      } else {
        this.uiStore.triggerToast(`⚠️ Unable to connect to @${board.id}'s clipboard`);
      }
    }
  }

  copySpecificClipboardLink(boardId: string, event?: Event) {
    if (event) event.stopPropagation();
    const url = this.sharedClipboardService.getShareableUrl(boardId);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        this.uiStore.triggerToast(`📋 Link for #${boardId} copied to clipboard!`);
      });
    }
  }

  openShareForClipboard(boardId: string, event?: Event) {
    if (event) event.stopPropagation();
    this.closeClipboardDropdown();
    this.uiStore.showShareLinkModal.set(true);
  }

  startEditingSpecificSlug(boardId: string, isAdmin: boolean, event?: Event) {
    if (event) event.stopPropagation();
    if (!isAdmin) {
      this.uiStore.triggerToast('🔒 Only the clipboard admin/owner can rename this board');
      return;
    }
    this.closeClipboardDropdown();
    this.startEditingSlug();
  }

  copyClipboardSlugUrl(event?: Event) {
    if (event) event.stopPropagation();
    const url = this.sharedClipboardService.getShareableUrl();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        this.isSlugCopied.set(true);
        this.uiStore.triggerToast('📋 Shareable link copied to clipboard!');
        setTimeout(() => {
          this.isSlugCopied.set(false);
          this.cdr.markForCheck();
        }, 2000);
      });
    }
  }

  openShareLinkModal() {
    this.uiStore.showShareLinkModal.set(true);
  }

  openInviteModal() {
    this.invitationService.openInviteModal(this.sharedClipboardService.currentClipboardId());
  }

  openCreateClipboardModal() {
    this.closeClipboardDropdown();
    this.isCreateModalOpen.set(true);
  }

  closeCreateClipboardModal() {
    this.isCreateModalOpen.set(false);
  }

  async onClipboardCreated(board: any) {
    this.isCreateModalOpen.set(false);
    if (board && board.id) {
      await this.selectClipboard({ id: board.id, isAdmin: true, title: board.title || `#${board.id}` });
    }
  }

  async deleteCreatedBoard(boardId: string, event?: Event) {
    if (event) event.stopPropagation();
    this.closeClipboardDropdown();

    const confirmed = confirm(`Are you sure you want to delete clipboard #${boardId}? This will free up 1 of your 5 clipboard slots.`);
    if (!confirmed) return;

    const res = await this.sharedClipboardService.deleteCreatedClipboard(boardId);
    if (res.success) {
      this.uiStore.triggerToast(`🗑️ Clipboard #${boardId} deleted`);
      if (this.sharedClipboardService.activeClipboardId() === boardId) {
        this.sharedClipboardService.exitSharedView();
      }
    } else {
      this.uiStore.triggerToast(`⚠️ ${res.error || 'Failed to delete clipboard'}`);
    }
  }

  ngOnDestroy() {
    this.wsTransport.disconnect();
    this.subs.forEach(s => s.unsubscribe());
    this.subs = [];
    this.pendingDeliveries.forEach(p => clearTimeout(p.timeoutTimer));
    this.pendingDeliveries.clear();
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
    options?: { tag?: string; customCategory?: string; retentionTtlMs?: number; byteSize?: number };
  }) {
    // If viewing a shared link as guest, contribute item to shared clipboard
    if (this.sharedClipboardService.isViewingSharedLink()) {
      const shared = this.sharedClipboardService.sharedClipboard();
      if (!shared || !this.sharedClipboardService.canContribute()) {
        this.uiStore.triggerToast('🔒 Read-only clipboard — cannot add items');
        return;
      }
      const classified = this.clipboardService.classify(event.text, event.filename);
      const curDev = this.deviceService.currentDevice();
      const guestItem: AirVaultItem = {
        id: 'item_' + Math.random().toString(36).substring(2, 11),
        content: classified,
        senderDeviceId: curDev.id,
        senderDeviceName: curDev.username ? `@${curDev.username.replace(/^@/, '')}` : 'Guest Visitor',
        senderDeviceType: 'guest',
        timestamp: Date.now(),
        isPinned: false,
        deliveryStatus: 'delivered',
        tag: event.options?.tag
      };
      const success = await this.sharedClipboardService.addItemToShared(shared.id, guestItem);
      if (success) {
        this.uiStore.triggerToast('⚡ Item added to shared clipboard');
      } else {
        this.uiStore.triggerToast('⚠️ Failed to add item to shared clipboard');
      }
      return;
    }

    let itemIdToUse = event.existingItemId;
    if (!itemIdToUse) {
      const classified = this.clipboardService.classify(event.text, event.filename);
      const curUser = this.deviceService.currentDevice().username?.toLowerCase().replace(/^@/, '');
      const curDevId = this.deviceService.currentDevice().id;
      const pairedResources = this.storageService.allItems().filter(i => {
        const owner = (i.originOwnerId || i.senderDeviceName || i.senderDeviceId || '').toLowerCase().replace(/^@/, '');
        return owner && owner !== curUser && owner !== curDevId;
      });
      const pairedDup = checkDuplicateResource(classified, pairedResources);
      if (pairedDup.isDuplicate && pairedDup.matchedUsername) {
        this.uiStore.openDuplicateModal(pairedDup.matchedUsername, classified);
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

    // Sync own clipboard to backend for shareable link freshness
    this.sharedClipboardService.syncMyClipboard(this.storageService.items());

    // Check connected peers to track delivery confirmation
    const curDev = this.deviceService.currentDevice();
    const paired = this.deviceService.pairedDevices();
    const activeSessions = (this.deviceService.registeredSessions() || []).filter(s => s.id !== curDev.id);
    const eligiblePeers = [
      ...paired.filter(d => d.id !== curDev.id && d.status === 'active' && d.syncEnabled !== false && !this.deviceService.isManuallyDisconnected(d.id)),
      ...activeSessions.filter(s => s.id !== curDev.id && s.status === 'active' && s.syncEnabled !== false && !this.deviceService.isManuallyDisconnected(s.id) && !paired.some(p => p.id === s.id))
    ];

    if (item && item.packetId) {
      const targetDev = event.targetDeviceId ? paired.find(d => d.id === event.targetDeviceId) : null;
      if (eligiblePeers.length > 0) {
        const packetId = item.packetId;
        const itemName = event.filename || item.content?.category || 'entry';
        const targetPeerName = targetDev?.username ? `@${targetDev.username.replace(/^@/, '')}` : targetDev?.name;

        // Start 6-second delivery timeout tracker
        const timeoutTimer = setTimeout(() => {
          this.ngZone.run(() => {
            if (this.pendingDeliveries.has(packetId)) {
              this.pendingDeliveries.delete(packetId);
              AirVaultLogger.warn(`[AirVault Sync] ⚠️ Delivery timeout for packet ${packetId}. No remote ACK received.`);
              this.uiStore.triggerToast('⚠️ Delivery unconfirmed by remote device — item saved locally in vault');
            }
          });
        }, 6000);

        this.pendingDeliveries.set(packetId, {
          timeoutTimer,
          itemName,
          targetPeerName
        });
      } else {
        // No connected peer online -> immediately inform user that it is saved locally
        this.uiStore.triggerToast('✓ Saved to local vault');
      }
    }

    // Schedule auto-collapse for long content
    if (item) this.collapseService.scheduleCollapse(item);
    setTimeout(() => this.storageService.isRefreshing.set(false), 600);
  }

  async onResendItem(item: AirVaultItem) {
    const title = item.content?.filename || item.content?.category || 'item';
    const updated = this.storageService.incrementResendCount(item.id);
    const count = updated?.resendCount || (item.resendCount || 0) + 1;
    const countLabel = count === 1 ? 'once' : `${count} times`;

    // Check connected peers
    const curDev = this.deviceService.currentDevice();
    const paired = this.deviceService.pairedDevices();
    const eligiblePeers = paired.filter(d => d.id !== curDev.id && d.status === 'active' && d.syncEnabled !== false && !this.deviceService.isManuallyDisconnected(d.id));

    if (eligiblePeers.length > 0 && item.packetId) {
      const packetId = item.packetId;
      const timeoutTimer = setTimeout(() => {
        this.ngZone.run(() => {
          if (this.pendingDeliveries.has(packetId)) {
            this.pendingDeliveries.delete(packetId);
            this.uiStore.triggerToast(`⚠️ Resend unconfirmed by remote device for "${title}"`);
          }
        });
      }, 6000);

      this.pendingDeliveries.set(packetId, {
        timeoutTimer,
        itemName: title
      });
    } else {
      this.uiStore.triggerToast(`✓ "${title}" saved in local vault`);
    }

    await this.syncService.broadcastItem(updated || item);
  }



  onLiveTextChange(event: { text: string; lineBlameMap?: LineBlameEntry[] } | string) {
    const text = typeof event === 'string' ? event : event.text;
    if (typeof event === 'string') {
      this.syncService.broadcastLiveText(event);
    } else {
      this.syncService.broadcastLiveText(event.text, event.lineBlameMap);
    }
    // Auto-advance tour step "Send Anything" when the user first enters content
    if (text.length > 0) {
      this.tourService.onComposerHasContent();
    }
  }

  async onRefreshClipboard() {
    this.storageService.isRefreshing.set(true);
    // 1. Re-sync storage items from local storage/IndexedDB
    await this.storageService.refreshFromStorage();

    // 2. Re-fetch session presence and server pairing state
    this.deviceService.fetchRegisteredSessions();
    this.deviceService.reconcileServerPairing();

    // 3. Send lightweight WS heartbeat & online broadcast so all active peers immediately handshake
    this.deviceService.sendHeartbeat();

    // 4. Synchronize items across connected peers
    const paired = this.deviceService.pairedDevices().filter(d => d.status === 'active' && d.syncEnabled !== false && !this.deviceService.isManuallyDisconnected(d.id));
    if (paired.length > 0) {
      this.uiStore.triggerToast(`🔄 Re-syncing clipboard across ${paired.length} connected device${paired.length > 1 ? 's' : ''}...`);
      await this.syncService.syncAllDevices();
    } else {
      this.uiStore.triggerToast(`✓ Clipboard & device state refreshed`);
    }
    setTimeout(() => this.storageService.isRefreshing.set(false), 500);
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
    const gridEl = document.querySelector('.vault-card-grid') as HTMLElement;
    if (gridEl && count > 0) {
      this.motionService.animateAllTilesErase(gridEl, () => {
        const cleared = this.storageService.clearActiveClipboardLocally();
        this.uiStore.triggerToast(`✓ Cleared ${cleared} item${cleared > 1 ? 's' : ''} from local clipboard`);
      });
    } else {
      const cleared = this.storageService.clearActiveClipboardLocally();
      this.uiStore.triggerToast(`✓ Cleared ${cleared} item${cleared > 1 ? 's' : ''} from local clipboard`);
    }
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

  promptSyncConsent(localDevice: AirVaultDevice, remoteDevice: AirVaultDevice) {
    this.uiStore.openSyncConsent(remoteDevice);
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

    // Prompt user for sync consent before pulling history from the reconnected device
    if (dev) {
      this.promptSyncConsent(cur, dev);
    }

    this.uiStore.triggerToast(`⚡ Reconnected ${dev?.name || 'Device'}`);
  }

  onManualDeviceSync(device: AirVaultDevice) {
    if (!device) return;
    const peerHandle = device.username ? `@${device.username.replace(/^@/, '')}` : (device.name || 'connected device');
    this.uiStore.triggerToast(`🔄 Syncing with ${peerHandle}...`);
    this.syncService.initiateDeviceSync(device);
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

  async onSignOutCurrentDevice(event: { purgeLocalData: boolean }) {
    this.uiStore.showDeviceDrawer.set(false);
    const prevUser = this.deviceService.currentDevice().username || 'user';
    
    // 1. Invalidate session server-side & disconnect socket
    this.deviceService.logoutCurrentDevice().subscribe();

    // 2. Clear client-side cache / storage
    await this.storageService.signOut(event.purgeLocalData);

    // 3. Prompt user with Identity Login / Onboarding screen
    this.uiStore.showIdentityOnboardingModal.set(true);
    this.uiStore.triggerToast(event.purgeLocalData 
      ? `🚪 Signed out of @${prevUser} and removed local cached data.`
      : `🚪 Signed out of @${prevUser}. Local cache preserved.`
    );
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

  onExecuteGlobalDelete(targetId?: string) {
    if (!targetId) return;
    this.uiStore.closeDeleteConfirm();

    const item = this.storageService.allItems().find(i => i.id === targetId || (i.packetId && i.packetId === targetId));
    const isBurn = !!(item && (item.burnAfterRead || item.retentionTtlMs === -1));
    const cardEl = document.querySelector(`[data-card-id="${targetId}"]`) as HTMLElement;

    if (cardEl) {
      if (isBurn) {
        this.motionService.animateBurnDissolve(cardEl, () => {
          this.storageService.deleteItemGlobally(targetId);
          this.syncService.broadcastGlobalDelete(targetId, true);
          this.uiStore.triggerToast(`✓ Burn-After-Read resource purged from all connected devices`);
        });
      } else {
        this.motionService.animateCardDelete(cardEl, () => {
          this.storageService.deleteItemGlobally(targetId);
          this.syncService.broadcastGlobalDelete(targetId, false);
          this.uiStore.triggerToast(`✓ Resource deleted from all connected devices (Available in 30-day Restorable History)`);
        });
      }
    } else {
      this.storageService.deleteItemGlobally(targetId);
      this.syncService.broadcastGlobalDelete(targetId, isBurn);
      this.uiStore.triggerToast(isBurn ? `✓ Burn-After-Read resource purged from all connected devices` : `✓ Resource deleted from all connected devices (Available in 30-day Restorable History)`);
    }
  }

  onExecuteLocalDelete(targetId?: string) {
    if (!targetId) return;
    this.uiStore.closeDeleteConfirm();

    const item = this.storageService.allItems().find(i => i.id === targetId || (i.packetId && i.packetId === targetId));
    const isBurn = !!(item && (item.burnAfterRead || item.retentionTtlMs === -1));
    const cardEl = document.querySelector(`[data-card-id="${targetId}"]`) as HTMLElement;

    if (cardEl) {
      if (isBurn) {
        this.motionService.animateBurnDissolve(cardEl, () => {
          this.storageService.deleteItemLocally(targetId);
          this.uiStore.triggerToast(`✓ Resource removed from your device`);
        });
      } else {
        this.motionService.animateCardDelete(cardEl, () => {
          this.storageService.deleteItemLocally(targetId);
          this.uiStore.triggerToast(`✓ Resource removed from your device`);
        });
      }
    } else {
      this.storageService.deleteItemLocally(targetId);
      this.uiStore.triggerToast(`✓ Resource removed from your device`);
    }
  }

  onOverrideDuplicate() {
    const data = this.uiStore.duplicateModalData();
    this.uiStore.closeDuplicateModal();
    if (!data) return;

    const res = data.resourceItem;
    const curDev = this.deviceService.currentDevice();
    const timestampSuffix = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (res && res.id) {
      // Find item in storage
      const existing = this.storageService.allItems().find(i => i.id === res.id);
      if (existing) {
        const oldName = existing.content.filename || 'Resource';
        const dotIdx = oldName.lastIndexOf('.');
        let newName: string;
        if (dotIdx > 0) {
          newName = `${oldName.slice(0, dotIdx)} (Copy ${timestampSuffix})${oldName.slice(dotIdx)}`;
        } else {
          newName = `${oldName} (Copy ${timestampSuffix})`;
        }

        const updatedItem = {
          ...existing,
          content: {
            ...existing.content,
            filename: newName
          },
          originDeviceId: curDev.id,
          senderDeviceId: curDev.id,
          senderDeviceName: curDev.name,
          timestamp: Date.now()
        };

        this.storageService.updateItem(updatedItem);
        this.syncService.broadcastItem(updatedItem);
        this.uiStore.triggerToast(`✓ Resource renamed to "${newName}" and saved as unique`);
        return;
      }
    }

    this.uiStore.triggerToast(`✓ Resource marked as unique`);
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
    const gridEl = document.querySelector('.vault-card-grid') as HTMLElement;
    if (gridEl && this.clipboardStore.items().length > 0) {
      this.motionService.animateAllTilesErase(gridEl, () => {
        this.clipboardStore.clearAll();
        this.uiStore.triggerToast(`✓ Vault history cleared`);
      });
    } else {
      this.clipboardStore.clearAll();
      this.uiStore.triggerToast(`✓ Vault history cleared`);
    }
  }

  onTtlChange(ttlMs: number) {
    this.storageService.setTtl(ttlMs);
    this.prefService.updatePref('retentionTtlMs', ttlMs);
    this.uiStore.triggerToast(`⚡ Vault retention policy updated`);
  }

  openPairing() {
    this.syncService.lastPairedDevice.set(null);
    this.deviceStore.generatePairingPin();
    this.uiStore.showPairingModal.set(true);
  }

  onToggleSyncDevice(deviceId: string) {
    this.deviceStore.toggleSyncTarget(deviceId);
    this.tourService.onDeviceToggled();
  }

  onSyncConsentAccept(device: AirVaultDevice | null) {
    this.uiStore.closeSyncConsent();
    if (device) {
      this.uiStore.triggerToast(`🔄 Pulling clipboard history from @${device.username || device.name}...`);
      this.syncService.initiateDeviceSync(device);
    }
  }

  onSyncConsentSkip(device: AirVaultDevice | null) {
    this.uiStore.closeSyncConsent();
    if (device) {
      this.uiStore.triggerToast(`⚡ Paired with @${device.username || device.name} · Starting with fresh clipboard`);
    }
  }

  openHistory() {
    this.uiStore.showHistoryModal.set(true);
  }

  // ── Filter Popover State & Options ──
  showFilterPopover = signal<boolean>(false);

  filterCategories = [
    { id: 'batch', label: 'Multi-Resource / Mixed', icon: 'layers' },
    { id: 'text', label: 'Plain Text', icon: 'align-left' },
    { id: 'markdown', label: 'Markdown', icon: 'file-text' },
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

  isFilterClosing = signal<boolean>(false);

  toggleFilterPopover(e?: Event) {
    if (e) e.stopPropagation();
    if (this.showFilterPopover() && !this.isFilterClosing()) {
      this.closeFilterPopover();
    } else {
      this.isFilterClosing.set(false);
      this.showFilterPopover.set(true);
    }
  }

  closeFilterPopover(immediate = false) {
    if (!this.showFilterPopover() || this.isFilterClosing()) return;
    if (immediate) {
      this.showFilterPopover.set(false);
      this.isFilterClosing.set(false);
      return;
    }
    this.isFilterClosing.set(true);
    setTimeout(() => {
      this.showFilterPopover.set(false);
      this.isFilterClosing.set(false);
    }, 500);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (this.showFilterPopover() && !this.isFilterClosing()) {
      if (!target.closest('.av-filter-popover') && !target.closest('.filter-popover-anchor') && !target.closest('.filter-trigger-btn')) {
        this.closeFilterPopover();
      }
    }
    if (this.showClipboardDropdown() && !target.closest('.av-clipboard-dropdown-anchor')) {
      this.closeClipboardDropdown();
    }
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

  /** Dynamically derives all unique tags present across stored items */
  availableTags = computed(() => {
    const items = this.storageService.items();
    const tagMap = new Map<string, { tag: string; color: string; count: number }>();
    for (const item of items) {
      if (item.tag && item.tag.trim()) {
        const rawTag = item.tag.trim();
        const lower = rawTag.toLowerCase();
        const existing = tagMap.get(lower);
        if (existing) {
          existing.count++;
        } else {
          tagMap.set(lower, {
            tag: rawTag,
            color: this.colorService.getTagColor(rawTag, item.tagColor),
            count: 1
          });
        }
      }
    }
    return Array.from(tagMap.values());
  });

  toggleTagFilter(tag: string) {
    const lower = tag.toLowerCase();
    this.uiStore.activeTagFilters.update(current => {
      if (current.map(t => t.toLowerCase()).includes(lower)) {
        return current.filter(t => t.toLowerCase() !== lower);
      } else {
        return [...current, tag];
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

  getHighlightSegments(text: string, query: string, activeIndex?: number): { text: string; isMatch: boolean; isCurrent: boolean }[] {
    if (!text) return [];
    const q = query ? query.trim() : '';
    if (!q) return [{ text, isMatch: false, isCurrent: false }];

    let pattern: RegExp;
    if (q.length <= 2) {
      pattern = new RegExp(`\\b${this.escapeRegex(q)}\\b`, 'gi');
    } else {
      pattern = new RegExp(this.escapeRegex(q), 'gi');
    }

    const segments: { text: string; isMatch: boolean; isCurrent: boolean }[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let matchCount = 0;
    const active = typeof activeIndex === 'number' ? activeIndex : -1;

    while ((match = pattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ text: text.substring(lastIndex, match.index), isMatch: false, isCurrent: false });
      }
      const isCurrent = active >= 0 ? matchCount === active : false;
      matchCount++;
      segments.push({ text: match[0], isMatch: true, isCurrent });
      lastIndex = pattern.lastIndex;
      if (match.index === pattern.lastIndex) {
        pattern.lastIndex++;
      }
    }

    if (lastIndex < text.length) {
      segments.push({ text: text.substring(lastIndex), isMatch: false, isCurrent: false });
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
    const isTyping = this.shortcutService.isTypingContext(e.target);
    const isCmdOrCtrl = e.metaKey || e.ctrlKey;

    // ── 1. Global / Top Priority Shortcuts ──
    // Focus search: ⌘/Ctrl + K or ⌘/Ctrl + F
    if (isCmdOrCtrl && (e.key.toLowerCase() === 'k' || e.key.toLowerCase() === 'f')) {
      e.preventDefault();
      this.openNavbarSearch();
      return;
    }

    // History: ⌘/Ctrl + H
    if (isCmdOrCtrl && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      this.uiStore.showHistoryModal.update(v => !v);
      return;
    }

    // ── 2. Escape Dismissal Hierarchy ──
    if (e.key === 'Escape') {
      // If navbar search is active
      if (this.showNavbarSearch()) {
        this.closeNavbarSearch();
        return;
      }
      // Close any active modal or drawer
      this.uiStore.closeAllModals();
      return;
    }

    // ── 3. Non-Typing Context Shortcuts ──
    // If user is typing in input, textarea, or contenteditable, do NOT intercept editor keys
    if (isTyping) {
      return;
    }

    // Open Keyboard Shortcuts reference: ? (Shift + /)
    if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      e.preventDefault();
      this.uiStore.openSettings('shortcuts');
      return;
    }
  }
}

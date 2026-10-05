import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { getAirVaultApiUrl } from './airvault-api.util';
import { AirVaultWsTransportService, AirVaultWsMessage } from './airvault-ws-transport.service';
import { AirVaultDeviceService } from './airvault-device.service';
import { AirVaultNotificationService } from './airvault-notification.service';
import { AirVaultLogger } from './airvault-sync-debug.service';
import { AirVaultSharedClipboardService } from './airvault-shared-clipboard.service';
import { AirVaultUIStore } from './airvault-ui.store';

// ── DTOs ─────────────────────────────────────────────────────────────────────

export interface AirVaultInvitationDto {
  id: string;
  clipboardId: string;
  clipboardTitle?: string;
  inviterUserId: string;
  inviteType: 'USERNAME' | 'LINK';
  targetUsername?: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REVOKED' | 'EXPIRED';
  accessLevel: 'read-only' | 'read-write';
  maxUses?: number;
  usedCount: number;
  createdAt: string;
  expiresAt: string;
  inviteUrl: string;
  isValid: boolean;
  isExpired?: boolean;
  isExhausted?: boolean;
}

export interface AirVaultCollaboratorDto {
  id: number;
  clipboardId: string;
  userId: string;
  accessLevel: 'read-only' | 'read-write';
  joinedAt: string;
  invitedVia: string;
  invitationId?: string;
}

export interface CreateInvitationPayload {
  inviteType: 'USERNAME' | 'LINK';
  targetUsername?: string;
  accessLevel: 'read-only' | 'read-write';
  maxUses?: number | null;
  expiresInDays?: number;
  clientUsername?: string;
}

/**
 * Public-safe preview metadata returned by GET /invitations/{token}/preview.
 * No authentication required; used by the landing page to render the correct state.
 */
export interface AirVaultInvitePreviewDto {
  /** VALID | NOT_FOUND | EXPIRED | REVOKED | EXHAUSTED | DECLINED | CLIPBOARD_GONE */
  status: 'VALID' | 'NOT_FOUND' | 'EXPIRED' | 'REVOKED' | 'EXHAUSTED' | 'DECLINED' | 'CLIPBOARD_GONE' | string;
  clipboardId?: string;
  clipboardTitle?: string;
  inviterUsername?: string;
  accessLevel?: 'read-only' | 'read-write';
  expiresAt?: string;
  /** Masked target for USERNAME invites (e.g. "sa***ri"); null for LINK invites */
  targetUsernameMasked?: string;
  inviteType?: 'USERNAME' | 'LINK';
}

/**
 * Response returned by POST /invitations/{id}/accept.
 * Contains enough clipboard metadata for the client to bootstrap immediately,
 * plus the collaborator row details.
 */
export interface AcceptInvitationResponseDto {
  clipboardId: string;
  clipboardTitle: string;
  ownerUsername: string;
  accessLevel: 'read-only' | 'read-write';
  isOwner: boolean;
  isCollaborator: boolean;
  canEdit: boolean;
  currentSeq?: number;
  items?: any[];
  collaborator: AirVaultCollaboratorDto;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errorCode?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class AirVaultInvitationService {
  private http = inject(HttpClient);
  private wsTransport = inject(AirVaultWsTransportService);
  private deviceService = inject(AirVaultDeviceService);
  private notificationService = inject(AirVaultNotificationService);
  private uiStore = inject(AirVaultUIStore);
  private sharedClipboardService = inject(AirVaultSharedClipboardService);

  // ── Reactive signals ──────────────────────────────────────────────────────

  readonly pendingInbox = signal<AirVaultInvitationDto[]>([]);
  readonly unreadInviteCount = computed(() => this.pendingInbox().length);
  readonly clipboardCollaborators = signal<AirVaultCollaboratorDto[]>([]);
  readonly activeClipboardInvitations = signal<AirVaultInvitationDto[]>([]);

  /**
   * Tracks collaborator boards granted via accepted invitations so that
   * `availableClipboards` in the main component can render them in the sidebar.
   */
  readonly grantedCollaboratorBoards = signal<AcceptInvitationResponseDto[]>([]);

  // UI dialog states
  readonly isInviteModalOpen = signal<boolean>(false);
  readonly isInboxOpen = signal<boolean>(false);
  readonly activeClipboardId = signal<string | null>(null);
  readonly isProcessing = signal<boolean>(false);

  private pollingIntervalTimer: any = null;

  constructor() {
    // 1. Listen to real-time WebSocket messages
    this.wsTransport.onMessage$.subscribe((msg: AirVaultWsMessage) => {
      this._handleWsMessage(msg);
    });

    // 2. Re-fetch inbox whenever WebSocket connects / reconnects
    this.wsTransport.onConnected$.subscribe(() => {
      AirVaultLogger.debug('[AirVault Invite] ⚡ WebSocket connected: Refreshing notifications inbox...');
      this.refreshInbox();
    });

    // 3. Tab Visibility & Window Focus: refresh so background invites are immediately visible
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.refreshInbox();
        }
      });
      window.addEventListener('focus', () => {
        this.refreshInbox();
      });
    }

    // 4. Lightweight 4s background polling fallback
    this.startBackgroundPolling();

    // 5. Cross-tab storage listener for username / invitation updates
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'acklet_airvault_username' || e.key === 'acklet_airvault_self_custom') {
          this.refreshInbox();
        }
      });
    }

    // Initial immediate load
    this.refreshInbox();
  }

  // ── WebSocket message handler ─────────────────────────────────────────────

  private _handleWsMessage(msg: AirVaultWsMessage): void {
    switch (msg.type) {
      case 'INVITATION_RECEIVED':
        this._onInvitationReceived(msg);
        break;

      case 'INVITATION_ACCEPTED':
        this._onInvitationAccepted(msg);
        break;

      /**
       * CLIPBOARD_ACCESS_GRANTED is broadcast to ALL live sessions of the invitee
       * the moment their acceptance is persisted on the server.  This ensures every
       * open tab (including tabs that did NOT trigger the accept HTTP call) picks up
       * the new board without a page reload.
       */
      case 'CLIPBOARD_ACCESS_GRANTED':
        this._onClipboardAccessGranted(msg);
        break;

      case 'COLLABORATOR_JOINED':
        // Inviter's side: refresh collaborator list so the new member appears instantly
        if (msg.metadata?.clipboardId && this.activeClipboardId() === msg.metadata.clipboardId) {
          this.fetchCollaborators(msg.metadata.clipboardId);
        }
        break;
    }
  }

  private _onInvitationReceived(msg: AirVaultWsMessage): void {
    if (!msg.metadata) return;
    AirVaultLogger.info('[AirVault Invite] 🔔 Real-time collaborator invitation received via WebSocket', msg.metadata);

    const newInvite: AirVaultInvitationDto = {
      id: msg.metadata.invitationId,
      clipboardId: msg.metadata.clipboardId,
      clipboardTitle: msg.metadata.clipboardTitle || 'Shared Clipboard',
      inviterUserId: msg.metadata.inviterUsername,
      inviteType: 'USERNAME',
      targetUsername: this.deviceService.currentDevice().username,
      status: 'PENDING',
      accessLevel: msg.metadata.accessLevel || 'read-only',
      usedCount: 0,
      maxUses: 1,
      createdAt: new Date().toISOString(),
      expiresAt: msg.metadata.expiresAt || new Date(Date.now() + 7 * 86400000).toISOString(),
      inviteUrl: `/invite/${msg.metadata.invitationId}`,
      isValid: true
    };

    // Deduplicate then prepend
    this.pendingInbox.update(prev => {
      if (prev.some(inv => inv.id === newInvite.id)) return prev;
      return [newInvite, ...prev];
    });

    this.notificationService.playNotificationChime(false);
    this.uiStore.triggerToast(
      `📩 @${newInvite.inviterUserId} invited you to collaborate on "${newInvite.clipboardTitle}" (${newInvite.accessLevel})`
    );

    // Authoritative server re-fetch to sync full inbox state
    this.refreshInbox();
  }

  private _onInvitationAccepted(msg: AirVaultWsMessage): void {
    if (!msg.metadata) return;
    AirVaultLogger.info('[AirVault Invite] 🤝 An invite was accepted by recipient', msg.metadata);

    this.notificationService.playNotificationChime(false);
    this.uiStore.triggerToast(
      `🎉 @${msg.metadata.acceptedByUsername} accepted your collaboration invitation!`
    );

    // Add collaborator to connected devices list in Constellation dock & Drawer
    if (msg.metadata.acceptedByUsername) {
      const cleanName = msg.metadata.acceptedByUsername.replace(/^@/, '');
      this.deviceService.addPairedDevice({
        id: `collab_${cleanName.toLowerCase()}`,
        name: `@${cleanName}`,
        username: cleanName,
        type: 'laptop',
        os: 'Collaborator',
        browser: 'AirVault',
        thumbprint: 'collab',
        ipHint: 'Remote',
        status: 'active',
        lastActive: Date.now(),
        isCurrent: false,
        syncEnabled: true,
        accentColor: '#10B981'
      });
    }

    // Refresh collaborator list if the owner has that board active
    if (this.activeClipboardId() && this.activeClipboardId() === msg.metadata.clipboardId) {
      this.fetchCollaborators(this.activeClipboardId()!);
    }

    this.refreshInbox();
  }

  /**
   * Called when the server confirms that the current user (invitee) has been granted
   * access to a clipboard, either via the same tab's accept call or any other tab.
   *
   * Steps:
   *  1. Send a WebSocket SUBSCRIBE for the clipboard room → receive live updates.
   *  2. Fetch the clipboard from the backend and store it in SharedClipboardService.
   *  3. Append to `grantedCollaboratorBoards` so the sidebar can render it.
   *  4. Show a toast so the user knows what happened.
   */
  private _onClipboardAccessGranted(msg: AirVaultWsMessage): void {
    if (!msg.metadata?.clipboardId) return;

    const clipboardId: string = msg.metadata.clipboardId;
    const clipboardTitle: string = msg.metadata.clipboardTitle || 'Shared Clipboard';
    const accessLevel: string = msg.metadata.accessLevel || 'read-only';
    const inviterUsername: string = msg.metadata.inviterUsername || '';

    AirVaultLogger.info(
      `[AirVault Invite] 🔓 CLIPBOARD_ACCESS_GRANTED: clipboard='${clipboardId}', access='${accessLevel}'`
    );

    // 1. Subscribe to live clipboard room updates
    this.wsTransport.subscribeClipboard(clipboardId);

    // 2. Fetch and store the clipboard so it can be rendered immediately
    this.sharedClipboardService.fetchSharedClipboard(clipboardId).then(data => {
      if (data) {
        AirVaultLogger.debug(`[AirVault Invite] ✅ Fetched granted clipboard '${clipboardId}' from backend`);
      }
    });

    // 3. Add to grantedCollaboratorBoards so availableClipboards picks it up
    this.grantedCollaboratorBoards.update(prev => {
      if (prev.some(b => b.clipboardId === clipboardId)) return prev;
      return [...prev, {
        clipboardId,
        clipboardTitle,
        ownerUsername: inviterUsername,
        accessLevel: accessLevel as 'read-only' | 'read-write',
        isOwner: false,
        isCollaborator: true,
        canEdit: accessLevel === 'read-write',
        collaborator: {
          id: 0,
          clipboardId,
          userId: this.deviceService.currentDevice().username || '',
          accessLevel: accessLevel as 'read-only' | 'read-write',
          joinedAt: new Date().toISOString(),
          invitedVia: 'USERNAME'
        }
      }];
    });

    // 4. Notify the user
    this.uiStore.triggerToast(
      `🔓 You now have ${accessLevel} access to @${inviterUsername}'s board "${clipboardTitle}"`
    );
  }

  // ── Polling ───────────────────────────────────────────────────────────────

  private startBackgroundPolling(): void {
    if (this.pollingIntervalTimer) {
      clearInterval(this.pollingIntervalTimer);
    }
    this.pollingIntervalTimer = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        this.refreshInbox();
      }
    }, 4000);
  }

  // ── Inbox ─────────────────────────────────────────────────────────────────

  refreshInbox(): void {
    let username = this.deviceService.currentDevice().username;
    if (!username) {
      try {
        username = localStorage.getItem('acklet_airvault_username') || undefined;
        if (!username) {
          const custom = localStorage.getItem('acklet_airvault_self_custom');
          if (custom) {
            const parsed = JSON.parse(custom);
            if (parsed?.username) username = parsed.username;
          }
        }
      } catch {}
    }
    if (username) {
      this.fetchInbox(username);
    }
  }

  fetchInbox(username: string): void {
    const cleanUsername = username.trim().replace('@', '');
    const url = getAirVaultApiUrl(`/api/v1/airvault/inbox?username=${encodeURIComponent(cleanUsername)}`);

    this.http.get<ApiResponse<{ username: string; pendingInvitations: AirVaultInvitationDto[] }>>(url).pipe(
      catchError(err => {
        AirVaultLogger.warn('[AirVault Invite] Failed to fetch pending inbox', err);
        return of(null);
      })
    ).subscribe(res => {
      if (res?.data?.pendingInvitations) {
        this.pendingInbox.set(res.data.pendingInvitations);
      }
    });
  }

  // ── Invitation preview (unauthenticated landing page) ─────────────────────

  /**
   * Fetches public-safe invitation metadata without requiring authentication.
   * Call this from the /invite/:token route to render the correct landing state.
   */
  previewInvitation(token: string): Observable<ApiResponse<AirVaultInvitePreviewDto>> {
    const url = getAirVaultApiUrl(`/api/v1/airvault/invitations/${encodeURIComponent(token)}/preview`);
    return this.http.get<ApiResponse<AirVaultInvitePreviewDto>>(url);
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  createInvitation(clipboardId: string, payload: CreateInvitationPayload): Observable<ApiResponse<AirVaultInvitationDto>> {
    const url = getAirVaultApiUrl(`/api/v1/airvault/clipboards/${encodeURIComponent(clipboardId)}/invitations`);
    const inviter = payload.clientUsername || this.deviceService.currentDevice().username || 'anonymous';
    const body = { ...payload, clientUsername: inviter };

    return this.http.post<ApiResponse<AirVaultInvitationDto>>(url, body).pipe(
      tap(res => {
        if (res?.data) {
          this.activeClipboardInvitations.update(prev => [res.data, ...prev]);
        }
      })
    );
  }

  getInvitation(invitationId: string): Observable<ApiResponse<AirVaultInvitationDto>> {
    const url = getAirVaultApiUrl(`/api/v1/airvault/invitations/${encodeURIComponent(invitationId)}`);
    return this.http.get<ApiResponse<AirVaultInvitationDto>>(url);
  }

  /**
   * Accepts an invitation and returns the clipboard bootstrap data.
   *
   * On success:
   *  - Removes the invite from the pending inbox signal.
   *  - Subscribes to the clipboard's WS room.
   *  - Stores the granted board in `grantedCollaboratorBoards`.
   *  - Fetches and stores the full clipboard in SharedClipboardService.
   */
  acceptInvitation(invitationId: string, rawUsername?: string): Observable<ApiResponse<AcceptInvitationResponseDto>> {
    const username = rawUsername || this.deviceService.currentDevice().username;
    const clean = (username || '').trim().replace('@', '');
    const url = getAirVaultApiUrl(`/api/v1/airvault/invitations/${encodeURIComponent(invitationId)}/accept`);

    this.isProcessing.set(true);

    return this.http.post<ApiResponse<AcceptInvitationResponseDto>>(url, { username: clean }).pipe(
      tap(res => {
        this.isProcessing.set(false);

        if (!res?.data) return;

        const data = res.data;

        // Remove from pending inbox
        this.pendingInbox.update(prev => prev.filter(inv => inv.id !== invitationId));

        // Subscribe to clipboard room immediately
        this.wsTransport.subscribeClipboard(data.clipboardId);

        // Record in granted boards so the sidebar renders it
        this.grantedCollaboratorBoards.update(prev => {
          if (prev.some(b => b.clipboardId === data.clipboardId)) return prev;
          return [...prev, data];
        });

        // Hydrate SharedClipboardService with the returned bootstrap data
        // so the component can switch the view immediately without an extra HTTP round-trip
        if (data.items !== undefined) {
          this.sharedClipboardService.sharedClipboard.set({
            id: data.clipboardId,
            ownerUsername: data.ownerUsername || '',
            ownerDeviceId: '',
            title: data.clipboardTitle || 'Shared Clipboard',
            accessMode: data.accessLevel,
            items: data.items ?? [],
            createdAt: new Date().toISOString(),
            expiresAt: '',
            isExpired: false,
            isOwner: false,
            isCollaborator: true,
            collaboratorAccessLevel: data.accessLevel,
            canEdit: data.canEdit,
            currentSeq: data.currentSeq ?? 0
          });
          this.sharedClipboardService.isViewingSharedLink.set(true);
        } else {
          // Fallback: fetch from backend
          this.sharedClipboardService.fetchSharedClipboard(data.clipboardId);
        }

        this.uiStore.triggerToast(
          `🎉 You now have ${data.accessLevel} access to @${data.ownerUsername || 'their'}'s board "${data.clipboardTitle}".`
        );
      }),
      catchError(err => {
        this.isProcessing.set(false);
        throw err;
      })
    );
  }

  declineInvitation(invitationId: string, rawUsername?: string): Observable<any> {
    const username = rawUsername || this.deviceService.currentDevice().username;
    const clean = (username || '').trim().replace('@', '');
    const url = getAirVaultApiUrl(`/api/v1/airvault/invitations/${encodeURIComponent(invitationId)}/decline`);

    return this.http.post<ApiResponse<any>>(url, { username: clean }).pipe(
      tap(() => {
        this.pendingInbox.update(prev => prev.filter(inv => inv.id !== invitationId));
        this.uiStore.triggerToast('Invitation declined.');
      })
    );
  }

  revokeInvitation(invitationId: string): Observable<any> {
    const username = this.deviceService.currentDevice().username;
    const url = getAirVaultApiUrl(
      `/api/v1/airvault/invitations/${encodeURIComponent(invitationId)}?inviterUsername=${encodeURIComponent(username || '')}`
    );

    return this.http.delete<ApiResponse<any>>(url).pipe(
      tap(() => {
        this.activeClipboardInvitations.update(prev => prev.filter(inv => inv.id !== invitationId));
        this.uiStore.triggerToast('Invitation revoked.');
      })
    );
  }

  fetchCollaborators(clipboardId: string): void {
    const url = getAirVaultApiUrl(`/api/v1/airvault/clipboards/${encodeURIComponent(clipboardId)}/collaborators`);
    this.http.get<ApiResponse<AirVaultCollaboratorDto[]>>(url).pipe(
      catchError(() => of(null))
    ).subscribe(res => {
      if (res?.data) {
        this.clipboardCollaborators.set(res.data);
      }
    });
  }

  // ── UI helpers ────────────────────────────────────────────────────────────

  openInviteModal(clipboardId?: string): void {
    this.activeClipboardId.set(clipboardId || null);
    this.isInviteModalOpen.set(true);
  }

  closeInviteModal(): void {
    this.isInviteModalOpen.set(false);
  }

  toggleInbox(open?: boolean): void {
    if (open !== undefined) {
      this.isInboxOpen.set(open);
    } else {
      this.isInboxOpen.update(v => !v);
    }
    if (this.isInboxOpen()) {
      this.refreshInbox();
    }
  }
}

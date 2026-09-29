import { Component, ChangeDetectionStrategy, inject, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../app/shared/components/icon/icon';
import { AirVaultInvitationService, AirVaultInvitationDto } from '../services/airvault-invitation.service';
import { AirVaultSharedClipboardService } from '../services/airvault-shared-clipboard.service';
import { AirVaultDeviceService } from '../services/airvault-device.service';

@Component({
  selector: 'app-airvault-notification-inbox',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="inbox-modal-backdrop" [class.is-closing]="isClosing()" (click)="onDismiss()" (keydown.escape)="onDismiss()">
      <div class="inbox-popover-card" [class.is-closing]="isClosing()" (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="inbox-card-header">
          <div class="inbox-header-title-group">
            <div class="inbox-icon-badge">
              <app-icon name="bell" class="icon-sm text-amber"></app-icon>
            </div>
            <div>
              <div class="title-with-badge">
                <h3 class="inbox-title">Collaborator Invitations</h3>
                @if (pendingInvites().length > 0) {
                  <span class="count-pill">{{ pendingInvites().length }} new</span>
                }
              </div>
              <p class="inbox-subtitle">Pending invites for @{{ currentUsername() }}</p>
            </div>
          </div>
          <div class="inbox-header-actions">
            <button class="inbox-icon-btn" (click)="refresh()" [attr.data-tooltip]="'Refresh inbox'">
              <app-icon name="refresh-cw" class="icon-xs"></app-icon>
            </button>
            <button class="inbox-icon-btn" (click)="onDismiss()" aria-label="Close">
              <app-icon name="x" class="icon-xs"></app-icon>
            </button>
          </div>
        </div>

        <!-- Body / Items List -->
        <div class="inbox-list-container">
          @if (pendingInvites().length === 0) {
            <div class="inbox-empty-state">
              <div class="empty-icon-circle">
                <app-icon name="inbox" class="icon-md text-muted"></app-icon>
              </div>
              <p class="empty-title">Inbox Zero</p>
              <p class="empty-desc">
                No pending invitations right now. When someone invites you to collaborate on a clipboard, it will appear here in real-time.
              </p>
            </div>
          } @else {
            <div class="invites-list">
              @for (inv of pendingInvites(); track inv.id) {
                <div class="invite-item-card">
                  <div class="invite-card-top">
                    <div class="inviter-profile">
                      <div class="user-avatar">
                        {{ inv.inviterUserId.slice(0, 2).toUpperCase() }}
                      </div>
                      <div class="inviter-meta">
                        <div class="inviter-name">
                          <strong>@{{ inv.inviterUserId }}</strong> invited you
                        </div>
                        <div class="invite-clipboard-title">
                          <app-icon name="clipboard" class="icon-xxs text-indigo"></app-icon>
                          <span>{{ inv.clipboardTitle || 'Shared Clipboard' }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="invite-access-badge" [class.badge-rw]="inv.accessLevel === 'read-write'" [class.badge-ro]="inv.accessLevel === 'read-only'">
                      {{ inv.accessLevel === 'read-write' ? 'Read & Write' : 'Read Only' }}
                    </div>
                  </div>

                  <div class="invite-time-meta">
                    <span>Received {{ inv.createdAt | date:'short' }}</span>
                    <span>·</span>
                    <span class="text-muted">Expires {{ inv.expiresAt | date:'mediumDate' }}</span>
                  </div>

                  <!-- Actions: Accept / Ignore -->
                  <div class="invite-action-buttons">
                    <button
                      type="button"
                      class="btn-ignore"
                      [disabled]="isProcessing()"
                      (click)="declineInvite(inv)">
                      <app-icon name="x-circle" class="icon-xxs"></app-icon>
                      <span>Ignore</span>
                    </button>
                    <button
                      type="button"
                      class="btn-accept"
                      [disabled]="isProcessing()"
                      (click)="acceptInvite(inv)">
                      @if (isProcessing()) {
                        <app-icon name="loader" class="icon-xxs spin"></app-icon>
                        <span>Joining...</span>
                      } @else {
                        <app-icon name="check-circle-2" class="icon-xxs"></app-icon>
                        <span>Accept & Collaborate</span>
                      }
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>

      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 9999;
    }

    .inbox-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(4, 7, 12, 0.75);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: modalFadeIn 0.60s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .inbox-modal-backdrop.is-closing {
      animation: modalFadeOut 0.60s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .inbox-popover-card {
      background: var(--av-surface-primary, #0B0E14);
      border: 1px solid var(--av-border, #1E2633);
      border-radius: 14px;
      width: 100%;
      max-width: 480px;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(245, 158, 11, 0.18);
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 18px;
      box-sizing: border-box;
      animation: modalScaleIn 0.60s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .inbox-popover-card.is-closing {
      animation: modalScaleOut 0.60s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .inbox-card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }
    .inbox-header-title-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .inbox-icon-badge {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.28);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .title-with-badge {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .inbox-title {
      font-size: 14.5px;
      font-weight: 800;
      color: var(--av-text-primary, #F0F3F6);
      margin: 0;
      letter-spacing: -0.01em;
    }
    .count-pill {
      background: rgba(245, 158, 11, 0.2);
      color: #fbbf24;
      font-size: 10px;
      font-weight: 800;
      padding: 1px 6px;
      border-radius: 10px;
      border: 1px solid rgba(245, 158, 11, 0.35);
    }
    .inbox-subtitle {
      font-size: 11.5px;
      color: var(--av-text-muted, #8B949E);
      margin: 2px 0 0;
    }

    .inbox-header-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .inbox-icon-btn {
      background: transparent;
      border: none;
      color: var(--av-text-muted, #8B949E);
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      transition: all 0.15s ease;
    }
    .inbox-icon-btn:hover {
      background: var(--av-surface-secondary, #121822);
      color: var(--av-text-primary, #F0F3F6);
    }

    /* Explainer */
    .inbox-explainer {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-radius: 6px;
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.2);
      font-size: 11px;
      color: var(--av-text-muted, #8B949E);
    }

    /* Items list */
    .inbox-list-container {
      max-height: 320px;
      overflow-y: auto;
      padding-right: 2px;
    }

    .inbox-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 30px 16px;
      gap: 8px;
    }
    .empty-icon-circle {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--av-surface-secondary, #121822);
      border: 1px solid var(--av-border, #1E2633);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .empty-title {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--av-text-primary, #F0F3F6);
      margin: 0;
    }
    .empty-desc {
      font-size: 11.5px;
      color: var(--av-text-muted, #8B949E);
      max-width: 320px;
      line-height: 1.4;
      margin: 0;
    }

    .invites-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .invite-item-card {
      background: var(--av-surface-secondary, #121822);
      border: 1px solid var(--av-border, #1E2633);
      border-radius: 10px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: border-color 0.15s ease;
    }
    .invite-item-card:hover {
      border-color: rgba(99, 102, 241, 0.35);
    }

    .invite-card-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
    }
    .inviter-profile {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #f59e0b;
      color: #000000;
      font-size: 11px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .inviter-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .inviter-name {
      font-size: 12.5px;
      color: var(--av-text-primary, #F0F3F6);
    }
    .invite-clipboard-title {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11.5px;
      color: #818cf8;
      font-weight: 600;
    }
    .invite-access-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      white-space: nowrap;
    }
    .badge-rw {
      background: rgba(16, 185, 129, 0.15);
      color: #10B981;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .badge-ro {
      background: rgba(33, 150, 243, 0.15);
      color: #90caf9;
      border: 1px solid rgba(33, 150, 243, 0.3);
    }

    .invite-time-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 10.5px;
      color: var(--av-text-muted, #8B949E);
    }

    .invite-action-buttons {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 4px;
    }
    .btn-ignore {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 12px;
      background: transparent;
      border: 1px solid var(--av-border, #1E2633);
      border-radius: 6px;
      color: var(--av-text-muted, #8B949E);
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-ignore:hover:not(:disabled) {
      background: rgba(244, 63, 94, 0.1);
      border-color: rgba(244, 63, 94, 0.3);
      color: #f43f5e;
    }
    .btn-accept {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      background: #10B981;
      border: 1px solid transparent;
      border-radius: 6px;
      color: #ffffff;
      font-size: 11.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-accept:hover:not(:disabled) {
      background: #059669;
    }
    .btn-accept:disabled, .btn-ignore:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Footer */
    .inbox-card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 6px;
      border-top: 1px solid var(--av-border-subtle, #161C26);
    }
    .footer-privacy-text {
      font-size: 10px;
      color: var(--av-text-muted, #8B949E);
    }
    .inbox-done-btn {
      padding: 6px 14px;
      background: var(--av-surface-secondary, #121822);
      border: 1px solid var(--av-border, #1E2633);
      border-radius: 6px;
      color: var(--av-text-primary, #F0F3F6);
      font-size: 11.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .inbox-done-btn:hover {
      background: var(--av-surface-elevated, #161F2C);
    }

    .icon-xxs { width: 11px; height: 11px; }
    .icon-xs { width: 13px; height: 13px; }
    .icon-sm { width: 15px; height: 15px; }
    .icon-md { width: 18px; height: 18px; }

    .text-amber { color: #f59e0b; }
    .text-indigo { color: #818cf8; }
    .text-muted { color: #8B949E; }

    .spin {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
    @keyframes modalFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes modalFadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    @keyframes modalScaleIn {
      from { opacity: 0; transform: scale(0.95) translateY(12px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes modalScaleOut {
      from { opacity: 1; transform: scale(1) translateY(0); }
      to { opacity: 0; transform: scale(0.95) translateY(10px); }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AirVaultNotificationInboxComponent {
  invitationService = inject(AirVaultInvitationService);
  sharedService = inject(AirVaultSharedClipboardService);
  deviceService = inject(AirVaultDeviceService);

  close = output<void>();

  isClosing = signal<boolean>(false);
  pendingInvites = computed(() => this.invitationService.pendingInbox());
  currentUsername = computed(() => this.deviceService.currentDevice().username || 'current user');
  isProcessing = computed(() => this.invitationService.isProcessing());

  onDismiss(): void {
    if (this.isClosing()) return;
    this.isClosing.set(true);
    setTimeout(() => {
      this.close.emit();
    }, 260);
  }

  refresh(): void {
    this.invitationService.refreshInbox();
  }

  acceptInvite(inv: AirVaultInvitationDto): void {
    this.invitationService.acceptInvitation(inv.id).subscribe({
      next: () => {
        // Add inviter to connected devices list in Constellation dock & Drawer
        if (inv.inviterUserId) {
          const cleanInviter = inv.inviterUserId.replace(/^@/, '');
          this.deviceService.addPairedDevice({
            id: `owner_${cleanInviter.toLowerCase()}`,
            name: `@${cleanInviter}`,
            username: cleanInviter,
            type: 'laptop',
            os: 'Clipboard Owner',
            browser: 'AirVault',
            thumbprint: 'owner',
            ipHint: 'Remote',
            status: 'active',
            lastActive: Date.now(),
            isCurrent: false,
            syncEnabled: true,
            accentColor: '#38BDF8'
          });
        }

        // Load and open the shared clipboard
        this.sharedService.fetchSharedClipboard(inv.clipboardId);
        this.onDismiss();
      },
      error: () => {}
    });
  }

  declineInvite(inv: AirVaultInvitationDto): void {
    this.invitationService.declineInvitation(inv.id).subscribe();
  }
}

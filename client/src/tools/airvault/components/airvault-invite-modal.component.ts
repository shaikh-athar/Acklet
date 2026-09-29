import { Component, ChangeDetectionStrategy, inject, signal, computed, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../app/shared/components/icon/icon';
import { AirVaultInvitationService, AirVaultInvitationDto, AirVaultCollaboratorDto } from '../services/airvault-invitation.service';
import { AirVaultSharedClipboardService } from '../services/airvault-shared-clipboard.service';
import { AirVaultDeviceService } from '../services/airvault-device.service';

type InviteMode = 'username' | 'link' | 'collaborators';

@Component({
  selector: 'app-airvault-invite-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="invite-modal-backdrop" [class.is-closing]="isClosing()" (click)="onDismiss()" (keydown.escape)="onDismiss()">
      <div class="invite-modal-container" [class.is-closing]="isClosing()" (click)="$event.stopPropagation()">
        
        <!-- Modal Header -->
        <div class="invite-modal-header">
          <div class="invite-header-title-group">
            <div class="invite-icon-badge">
              <app-icon name="user-plus" class="icon-sm text-indigo"></app-icon>
            </div>
            <div>
              <h2 class="invite-modal-title">Invite Collaborator</h2>
              <p class="invite-modal-subtitle">Person-targeted access · Valid across all paired devices</p>
            </div>
          </div>
          <button class="invite-close-btn" (click)="onDismiss()" aria-label="Close">
            <app-icon name="x" class="icon-xs"></app-icon>
          </button>
        </div>

        <!-- 3-Way Mechanism Differentiation Banner -->
        <div class="invite-difference-banner">
          <div class="diff-col">
            <div class="diff-header text-indigo">
              <app-icon name="user-plus" class="icon-xxs"></app-icon>
              <strong>Invite (This)</strong>
            </div>
            <span>Specific user collaborator across all their devices with Accept/Decline.</span>
          </div>
          <div class="diff-divider"></div>
          <div class="diff-col">
            <div class="diff-header text-muted">
              <app-icon name="smartphone" class="icon-xxs"></app-icon>
              <strong>Pair Device</strong>
            </div>
            <span>Your own devices auto-synced via PIN.</span>
          </div>
          <div class="diff-divider"></div>
          <div class="diff-col">
            <div class="diff-header text-muted">
              <app-icon name="share-2" class="icon-xxs"></app-icon>
              <strong>Share Link</strong>
            </div>
            <span>Anonymous web link, no relationship.</span>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="invite-tabs-row" role="tablist">
          <button
            type="button"
            role="tab"
            class="invite-tab-btn"
            [class.active]="activeTab() === 'username'"
            (click)="activeTab.set('username')">
            <app-icon name="user-plus" class="icon-xs"></app-icon>
            <span>Invite @Username</span>
          </button>
          <button
            type="button"
            role="tab"
            class="invite-tab-btn"
            [class.active]="activeTab() === 'link'"
            (click)="activeTab.set('link')">
            <app-icon name="cable" class="icon-xs"></app-icon>
            <span>Create Invite Link</span>
          </button>
          <button
            type="button"
            role="tab"
            class="invite-tab-btn"
            [class.active]="activeTab() === 'collaborators'"
            (click)="loadCollaboratorsTab()">
            <app-icon name="users" class="icon-xs"></app-icon>
            <span>Collaborators ({{ collaborators().length }})</span>
          </button>
        </div>

        <!-- TAB 1: INVITE BY USERNAME -->
        @if (activeTab() === 'username') {
          <div class="tab-content-pane" role="tabpanel">
            <div class="form-group">
              <label class="invite-field-label" for="targetUsernameInput">TARGET USERNAME</label>
              <div class="username-input-wrapper">
                <span class="at-prefix">@</span>
                <input
                  id="targetUsernameInput"
                  type="text"
                  class="username-input"
                  placeholder="e.g. alex, sarah_dev, team_lead"
                  [(ngModel)]="targetUsername"
                  (keydown.enter)="sendUsernameInvite()"
                  autocomplete="off"
                  spellcheck="false" />
              </div>
              <p class="field-hint">The user will receive an instant push notification and pending invite in their AirVault inbox.</p>
            </div>

            <!-- Permission Selection -->
            <div class="form-group">
              <label class="invite-field-label">COLLABORATOR ACCESS LEVEL</label>
              <div class="permission-pill-grid">
                <button
                  type="button"
                  class="access-pill-card"
                  [class.is-selected]="accessLevel() === 'read-write'"
                  (click)="accessLevel.set('read-write')">
                  <div class="pill-radio-dot">
                    <div class="radio-inner-dot"></div>
                  </div>
                  <div class="pill-meta">
                    <span class="pill-title text-green">Read & Write (Full Collaborator)</span>
                    <span class="pill-sub">Can add, edit, and sync clipboard items</span>
                  </div>
                </button>
                <button
                  type="button"
                  class="access-pill-card"
                  [class.is-selected]="accessLevel() === 'read-only'"
                  (click)="accessLevel.set('read-only')">
                  <div class="pill-radio-dot">
                    <div class="radio-inner-dot"></div>
                  </div>
                  <div class="pill-meta">
                    <span class="pill-title text-cyan">Read Only</span>
                    <span class="pill-sub">Can view & copy items without adding content</span>
                  </div>
                </button>
              </div>
            </div>

            <!-- Error Banner if any -->
            @if (errorMessage()) {
              <div class="error-banner">
                <app-icon name="alert-circle" class="icon-xs text-rose"></app-icon>
                <span>{{ errorMessage() }}</span>
              </div>
            }

            <!-- Success Notice if sent -->
            @if (successMessage()) {
              <div class="success-banner">
                <app-icon name="check-circle" class="icon-xs text-green"></app-icon>
                <span>{{ successMessage() }}</span>
              </div>
            }

            <!-- Action Button -->
            <div class="modal-action-row">
              <button
                type="button"
                class="primary-invite-btn"
                [disabled]="!targetUsername().trim() || isSending()"
                (click)="sendUsernameInvite()">
                @if (isSending()) {
                  <app-icon name="loader" class="icon-xs spin"></app-icon>
                  <span>Sending Notification...</span>
                } @else {
                  <app-icon name="send" class="icon-xs"></app-icon>
                  <span>Send Invitation</span>
                }
              </button>
            </div>
          </div>
        }

        <!-- TAB 2: CREATE INVITE LINK -->
        @if (activeTab() === 'link') {
          <div class="tab-content-pane" role="tabpanel">
            <div class="form-group">
              <label class="invite-field-label">INVITE LINK ACCESS LEVEL</label>
              <div class="permission-pill-grid">
                <button
                  type="button"
                  class="access-pill-card"
                  [class.is-selected]="linkAccessLevel() === 'read-write'"
                  (click)="linkAccessLevel.set('read-write')">
                  <div class="pill-radio-dot">
                    <div class="radio-inner-dot"></div>
                  </div>
                  <div class="pill-meta">
                    <span class="pill-title text-green">Read & Write</span>
                    <span class="pill-sub">Invitee can contribute content upon accepting</span>
                  </div>
                </button>
                <button
                  type="button"
                  class="access-pill-card"
                  [class.is-selected]="linkAccessLevel() === 'read-only'"
                  (click)="linkAccessLevel.set('read-only')">
                  <div class="pill-radio-dot">
                    <div class="radio-inner-dot"></div>
                  </div>
                  <div class="pill-meta">
                    <span class="pill-title text-cyan">Read Only</span>
                    <span class="pill-sub">Invitee gets read-only collaborator rights</span>
                  </div>
                </button>
              </div>
            </div>

            <!-- Usage Limit & Expiry Controls -->
            <div class="form-row-2col">
              <div class="form-group flex-1">
                <label class="invite-field-label">LINK USAGE LIMIT</label>
                <select class="invite-select" [(ngModel)]="linkMaxUses">
                  <option [ngValue]="1">Single-Use (1 recipient)</option>
                  <option [ngValue]="null">Unlimited (Reusable)</option>
                </select>
              </div>
              <div class="form-group flex-1">
                <label class="invite-field-label">EXPIRATION</label>
                <select class="invite-select" [(ngModel)]="linkExpiryDays">
                  <option [ngValue]="1">24 Hours</option>
                  <option [ngValue]="7">7 Days (Default)</option>
                  <option [ngValue]="30">30 Days</option>
                </select>
              </div>
            </div>

            <!-- Generate / Display Box -->
            @if (generatedInviteUrl()) {
              <div class="generated-link-box">
                <label class="invite-field-label">SHAREABLE INVITE URL</label>
                <div class="link-display-row">
                  <div class="link-text-box">
                    <app-icon name="link" class="icon-xs text-indigo"></app-icon>
                    <span class="url-text">{{ generatedInviteUrl() }}</span>
                  </div>
                  <button
                    class="copy-btn"
                    [class.copied]="copied()"
                    (click)="copyInviteLink()">
                    @if (copied()) {
                      <app-icon name="check" class="icon-xs text-green"></app-icon>
                      <span>Copied</span>
                    } @else {
                      <app-icon name="copy" class="icon-xs"></app-icon>
                      <span>Copy Link</span>
                    }
                  </button>
                </div>
                <div class="link-meta-info">
                  <span>{{ linkMaxUses === 1 ? '🔒 Single-use' : '🌐 Reusable' }} · Expires in {{ linkExpiryDays }} days</span>
                  <span class="text-indigo font-medium">Recipient must accept to gain access</span>
                </div>
              </div>
            } @else {
              <div class="modal-action-row">
                <button
                  type="button"
                  class="primary-invite-btn"
                  [disabled]="isSending()"
                  (click)="generateInviteLink()">
                  @if (isSending()) {
                    <app-icon name="loader" class="icon-xs spin"></app-icon>
                    <span>Generating Link...</span>
                  } @else {
                    <app-icon name="sparkles" class="icon-xs"></app-icon>
                    <span>Generate Invite Link</span>
                  }
                </button>
              </div>
            }
          </div>
        }

        <!-- TAB 3: EXISTING COLLABORATORS -->
        @if (activeTab() === 'collaborators') {
          <div class="tab-content-pane" role="tabpanel">
            <div class="collaborators-list-wrapper">
              @if (collaborators().length === 0) {
                <div class="empty-collab-state">
                  <div class="empty-icon-box">
                    <app-icon name="users" class="icon-md text-muted"></app-icon>
                  </div>
                  <p class="empty-title">No Collaborators Yet</p>
                  <p class="empty-sub">Invite a colleague via &#64;username or invite link to collaborate on this board.</p>
                </div>
              } @else {
                <div class="collab-cards-list">
                  @for (c of collaborators(); track c.id) {
                    <div class="collab-row-card">
                      <div class="collab-user-info">
                        <div class="collab-avatar">
                          {{ (c.userId ? c.userId.replace('@', '').slice(0, 2) : 'US').toUpperCase() }}
                        </div>
                        <div>
                          <div class="collab-name">&#64;{{ c.userId ? c.userId.replace('@', '') : 'collaborator' }}</div>
                          <div class="collab-joined">Joined {{ c.joinedAt | date:'shortDate' }} via {{ c.invitedVia || 'INVITE' }}</div>
                        </div>
                      </div>
                      <div class="collab-badge" [class.badge-write]="c.accessLevel === 'read-write'" [class.badge-read]="c.accessLevel === 'read-only'">
                        {{ c.accessLevel === 'read-write' ? 'Read & Write' : 'Read Only' }}
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
          
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

    .invite-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(4, 7, 12, 0.76);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: modalFadeIn 0.50s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .invite-modal-backdrop.is-closing {
      animation: modalFadeOut 0.50s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .invite-modal-container {
      background: var(--av-surface-primary, #ffffff);
      border: 1px solid var(--av-border, #e2e8f0);
      border-radius: 16px;
      width: 100%;
      max-width: 540px;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.16), 0 0 0 1px rgba(99, 102, 241, 0.14);
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 22px;
      box-sizing: border-box;
      animation: modalScaleIn 0.60s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      transition: height 0.60s cubic-bezier(0.16, 1, 0.3, 1), min-height 0.36s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .invite-modal-container.is-closing {
      animation: modalScaleOut 0.50s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    :host-context([data-theme="dark"]) .invite-modal-container {
      background: #0d1117;
      border-color: #21262d;
      box-shadow: 0 28px 72px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(99, 102, 241, 0.24);
    }

    .invite-modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .invite-header-title-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .invite-icon-badge {
      width: 40px;
      height: 40px;
      border-radius: 11px;
      background: rgba(99, 102, 241, 0.1);
      border: 1px solid rgba(99, 102, 241, 0.26);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.12);
    }

    .invite-modal-title {
      font-size: 16px;
      font-weight: 800;
      color: var(--av-text-primary, #0f172a);
      margin: 0;
      letter-spacing: -0.01em;
    }

    .invite-modal-subtitle {
      font-size: 12px;
      color: var(--av-text-muted, #64748b);
      margin: 2px 0 0;
    }

    .invite-close-btn {
      background: transparent;
      border: none;
      color: var(--av-text-muted, #64748b);
      cursor: pointer;
      padding: 6px;
      border-radius: 7px;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .invite-close-btn:hover {
      background: var(--av-surface-secondary, #f1f5f9);
      color: var(--av-text-primary, #0f172a);
    }

    /* Differentiation Comparison Banner */
    .icon-xxs { width: 11px; height: 11px; }
    .icon-xs { width: 13px; height: 13px; }
    .icon-sm { width: 15px; height: 15px; }
    .icon-md { width: 18px; height: 18px; }

    .invite-difference-banner {
      display: grid;
      grid-template-columns: 1fr auto 1fr auto 1fr;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 10px;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(99, 102, 241, 0.03) 100%);
      border: 1px solid rgba(99, 102, 241, 0.2);
      font-size: 11px;
      line-height: 1.35;
    }

    .diff-col {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .diff-header {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11.5px;
      font-weight: 700;
      line-height: 1;
    }

    .diff-divider {
      width: 1px;
      height: 32px;
      background: rgba(99, 102, 241, 0.18);
    }

    .diff-col span {
      color: var(--av-text-muted, #64748b);
      font-size: 10.5px;
    }

    /* Tabs Segmented Navigation */
    .invite-tabs-row {
      display: flex;
      gap: 4px;
      background: var(--av-surface-secondary, #f1f5f9);
      padding: 4px;
      border-radius: 10px;
      border: 1px solid var(--av-border, #e2e8f0);
    }

    :host-context([data-theme="dark"]) .invite-tabs-row {
      background: #161b22;
      border-color: #21262d;
    }

    .invite-tab-btn {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      padding: 8px 12px;
      border: none;
      background: transparent;
      border-radius: 7px;
      font-size: 12px;
      font-weight: 700;
      color: var(--av-text-muted, #64748b);
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .invite-tab-btn:hover {
      color: var(--av-text-primary, #0f172a);
    }

    .invite-tab-btn.active {
      background: var(--av-surface-primary, #ffffff);
      color: #4f46e5;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(99, 102, 241, 0.16);
    }

    :host-context([data-theme="dark"]) .invite-tab-btn.active {
      background: #21262d;
      color: #a5b4fc;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(99, 102, 241, 0.3);
    }

    /* Form & Tab Transitions */
    .tab-content-pane {
      display: flex;
      flex-direction: column;
      gap: 15px;
      padding: 4px 0;
      animation: tabFadeSlide 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      will-change: transform, opacity;
    }

    @keyframes tabFadeSlide {
      from {
        opacity: 0;
        transform: translateY(8px) scale(0.99);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-row-2col {
      display: flex;
      gap: 12px;
    }

    .flex-1 { flex: 1; }

    .invite-field-label {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: var(--av-text-muted, #64748b);
      text-transform: uppercase;
    }

    .username-input-wrapper {
      display: flex;
      align-items: center;
      background: var(--av-surface-secondary, #f8fafc);
      border: 1px solid var(--av-border, #cbd5e1);
      border-radius: 9px;
      padding: 0 12px;
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }

    :host-context([data-theme="dark"]) .username-input-wrapper {
      background: #161b22;
      border-color: #30363d;
    }

    .username-input-wrapper:focus-within {
      border-color: #6366f1;
      background: var(--av-surface-primary, #ffffff);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.18);
    }

    :host-context([data-theme="dark"]) .username-input-wrapper:focus-within {
      background: #0d1117;
    }

    .at-prefix {
      color: #6366f1;
      font-weight: 800;
      font-size: 15px;
      margin-right: 4px;
    }

    .username-input {
      flex: 1;
      background: transparent;
      border: none;
      padding: 10px 0;
      color: var(--av-text-primary, #0f172a);
      font-size: 13px;
      font-weight: 600;
      outline: none;
      font-family: inherit;
    }

    .field-hint {
      font-size: 11.5px;
      color: var(--av-text-muted, #64748b);
      margin: 0;
      line-height: 1.4;
    }

    /* Permission Selector Pill Cards */
    .permission-pill-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .access-pill-card {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 11px;
      background: var(--av-surface-secondary, #f8fafc);
      border: 1px solid var(--av-border, #cbd5e1);
      border-radius: 9px;
      cursor: pointer;
      text-align: left;
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }

    :host-context([data-theme="dark"]) .access-pill-card {
      background: #161b22;
      border-color: #30363d;
    }

    .access-pill-card:hover {
      border-color: rgba(99, 102, 241, 0.45);
      background: var(--av-surface-elevated, #ffffff);
      transform: translateY(-1px);
    }

    :host-context([data-theme="dark"]) .access-pill-card:hover {
      background: #21262d;
    }

    .access-pill-card.is-selected {
      border-color: #6366f1;
      background: rgba(99, 102, 241, 0.08);
      box-shadow: 0 0 0 1px #6366f1, 0 4px 12px rgba(99, 102, 241, 0.12);
    }

    .pill-radio-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 1.5px solid var(--av-border, #94a3b8);
      margin-top: 2px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .access-pill-card.is-selected .pill-radio-dot {
      border-color: #6366f1;
    }

    .radio-inner-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: transparent;
      transition: all 0.15s ease;
    }

    .access-pill-card.is-selected .radio-inner-dot {
      background: #6366f1;
    }

    .pill-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .pill-title {
      font-size: 12px;
      font-weight: 700;
    }

    .pill-sub {
      font-size: 10.5px;
      color: var(--av-text-muted, #64748b);
      line-height: 1.35;
    }

    .invite-select {
      background: var(--av-surface-secondary, #f8fafc);
      border: 1px solid var(--av-border, #cbd5e1);
      color: var(--av-text-primary, #0f172a);
      padding: 9px 12px;
      border-radius: 9px;
      font-size: 12.5px;
      font-weight: 600;
      outline: none;
      width: 100%;
      font-family: inherit;
      transition: border-color 0.15s ease;
    }

    :host-context([data-theme="dark"]) .invite-select {
      background: #161b22;
      border-color: #30363d;
      color: #f0f3f6;
    }

    .invite-select:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
    }

    /* Generated Link Box */
    .generated-link-box {
      background: rgba(99, 102, 241, 0.08);
      border: 1px solid rgba(99, 102, 241, 0.25);
      border-radius: 10px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 9px;
      animation: tabFadeSlide 0.22s ease-out;
    }

    .link-display-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .link-text-box {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--av-surface-primary, #ffffff);
      border: 1px solid var(--av-border, #cbd5e1);
      border-radius: 8px;
      padding: 9px 12px;
      overflow: hidden;
    }

    :host-context([data-theme="dark"]) .link-text-box {
      background: #0d1117;
      border-color: #30363d;
    }

    .url-text {
      font-family: var(--av-font-mono, monospace);
      font-size: 12px;
      font-weight: 600;
      color: var(--av-text-primary, #0f172a);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      user-select: all;
    }

    .copy-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 16px;
      background: #6366f1;
      color: #ffffff;
      font-size: 12px;
      font-weight: 700;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      white-space: nowrap;
      box-shadow: 0 2px 6px rgba(99, 102, 241, 0.28);
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .copy-btn:hover {
      background: #4f46e5;
      transform: translateY(-1px);
    }

    .copy-btn.copied {
      background: rgba(16, 185, 129, 0.18);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.4);
      box-shadow: none;
    }

    .link-meta-info {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: var(--av-text-muted, #64748b);
    }

    /* Actions */
    .modal-action-row {
      display: flex;
      justify-content: flex-end;
      padding-top: 4px;
    }

    .primary-invite-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: #6366f1;
      color: #ffffff;
      font-size: 12.5px;
      font-weight: 700;
      border: none;
      border-radius: 9px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .primary-invite-btn:hover:not(:disabled) {
      background: #4f46e5;
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
    }

    .primary-invite-btn:active:not(:disabled) {
      transform: translateY(0);
    }

    .primary-invite-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      box-shadow: none;
    }

    /* Feedback */
    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 12px;
      border-radius: 8px;
      background: rgba(244, 63, 94, 0.12);
      border: 1px solid rgba(244, 63, 94, 0.3);
      color: #e11d48;
      font-size: 12px;
      font-weight: 600;
    }

    :host-context([data-theme="dark"]) .error-banner {
      color: #fb7185;
    }

    .success-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 12px;
      border-radius: 8px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #059669;
      font-size: 12px;
      font-weight: 600;
    }

    :host-context([data-theme="dark"]) .success-banner {
      color: #34d399;
    }

    /* Collaborator List */
    .collaborators-list-wrapper {
      max-height: 240px;
      overflow-y: auto;
      margin-top : 10px;
    }

    .empty-collab-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 28px 16px;
      gap: 8px;
    }

    .empty-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: var(--av-surface-secondary, #f1f5f9);
      border: 1px solid var(--av-border, #e2e8f0);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .empty-title {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--av-text-primary, #0f172a);
      margin: 0;
    }

    .empty-sub {
      font-size: 11.5px;
      color: var(--av-text-muted, #64748b);
      max-width: 320px;
      margin: 0;
      line-height: 1.4;
    }

    .collab-cards-list {
      display: flex;
      flex-direction: column;
      gap: 7px;
      margin-top : 10px
    }

    .collab-row-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: var(--av-surface-secondary, #f8fafc);
      border: 1px solid var(--av-border, #e2e8f0);
      border-radius: 9px;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="dark"]) .collab-row-card {
      background: #161b22;
      border-color: #21262d;
    }

    .collab-row-card:hover {
      border-color: #6366f1;
      transform: translateY(-1px);
    }

    .collab-user-info {
      display: flex;
      align-items: center;
      gap: 11px;
    }

    .collab-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #6366f1;
      color: #ffffff;
      font-size: 11.5px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(99, 102, 241, 0.28);
    }

    .collab-name {
      font-size: 13px;
      font-weight: 700;
      color: var(--av-text-primary, #0f172a);
    }

    .collab-joined {
      font-size: 11px;
      color: var(--av-text-muted, #64748b);
    }

    .collab-badge {
      font-size: 10.5px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 6px;
    }

    .badge-write {
      background: rgba(16, 185, 129, 0.12);
      color: #059669;
      border: 1px solid rgba(16, 185, 129, 0.28);
    }

    :host-context([data-theme="dark"]) .badge-write {
      color: #34d399;
    }

    .badge-read {
      background: rgba(33, 150, 243, 0.12);
      color: #2563eb;
      border: 1px solid rgba(33, 150, 243, 0.28);
    }

    :host-context([data-theme="dark"]) .badge-read {
      color: #60a5fa;
    }

    /* Modal footer */
    .invite-modal-footer {
      display: flex;
      justify-content: flex-end;
      padding-top: 6px;
      border-top: 1px solid var(--av-border, #e2e8f0);
    }

    :host-context([data-theme="dark"]) .invite-modal-footer {
      border-top-color: #21262d;
    }

    .invite-done-btn {
      padding: 8px 22px;
      background: var(--av-surface-secondary, #f1f5f9);
      border: 1px solid var(--av-border, #cbd5e1);
      border-radius: 8px;
      color: var(--av-text-primary, #0f172a);
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }

    :host-context([data-theme="dark"]) .invite-done-btn {
      background: #161b22;
      border-color: #30363d;
      color: #f0f3f6;
    }

    .invite-done-btn:hover {
      background: var(--av-surface-elevated, #ffffff);
      border-color: #6366f1;
      transform: translateY(-1px);
    }

    :host-context([data-theme="dark"]) .invite-done-btn:hover {
      background: #21262d;
    }

    .text-indigo { color: #6366f1; }
    :host-context([data-theme="dark"]) .text-indigo { color: #818cf8; }
    .text-green { color: #059669; }
    :host-context([data-theme="dark"]) .text-green { color: #10B981; }
    .text-cyan { color: #0284c7; }
    :host-context([data-theme="dark"]) .text-cyan { color: #38BDF8; }
    .text-rose { color: #e11d48; }
    :host-context([data-theme="dark"]) .text-rose { color: #F43F5E; }
    .text-muted { color: #64748b; }
    :host-context([data-theme="dark"]) .text-muted { color: #8B949E; }

    .spin {
      animation: spin 0.8s linear infinite;
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
export class AirVaultInviteModalComponent implements OnInit {
  invitationService = inject(AirVaultInvitationService);
  sharedService = inject(AirVaultSharedClipboardService);
  deviceService = inject(AirVaultDeviceService);

  close = output<void>();

  isClosing = signal<boolean>(false);

  onDismiss(): void {
    if (this.isClosing()) return;
    this.isClosing.set(true);
    setTimeout(() => {
      this.close.emit();
    }, 260);
  }

  activeTab = signal<InviteMode>('username');
  targetUsername = signal<string>('');
  accessLevel = signal<'read-only' | 'read-write'>('read-write');
  linkAccessLevel = signal<'read-only' | 'read-write'>('read-write');
  linkMaxUses: number | null = 1; // Default to single-use
  linkExpiryDays: number = 7;

  isSending = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  generatedInviteUrl = signal<string | null>(null);
  copied = signal<boolean>(false);

  collaborators = computed(() => this.invitationService.clipboardCollaborators());

  ngOnInit(): void {
    const clipboardId = this.sharedService.currentClipboardId() || this.invitationService.activeClipboardId();
    if (clipboardId) {
      this.invitationService.fetchCollaborators(clipboardId);
    }
  }

  loadCollaboratorsTab(): void {
    this.activeTab.set('collaborators');
    const clipboardId = this.sharedService.currentClipboardId() || this.invitationService.activeClipboardId();
    if (clipboardId) {
      this.invitationService.fetchCollaborators(clipboardId);
    }
  }

  sendUsernameInvite(): void {
    const rawTarget = this.targetUsername().trim().replace('@', '');
    if (!rawTarget) return;

    const cleanTarget = rawTarget.toLowerCase();
    const curUser = (this.deviceService.currentDevice().username || '').toLowerCase().replace(/^@/, '');

    if (curUser && cleanTarget === curUser) {
      this.errorMessage.set('You cannot invite yourself to your own clipboard.');
      return;
    }

    const isConnectedDevice = this.deviceService.pairedDevices().some(d => {
      const u = (d.username || d.name || '').toLowerCase().replace(/^@/, '');
      return u === cleanTarget;
    });
    if (isConnectedDevice) {
      this.errorMessage.set(`@${rawTarget} is already in your connected devices list for this clipboard.`);
      return;
    }

    const isCollaborator = this.collaborators().some(c => c.userId.toLowerCase().replace(/^@/, '') === cleanTarget);
    if (isCollaborator) {
      this.errorMessage.set(`@${rawTarget} is already an active collaborator on this clipboard.`);
      return;
    }

    const clipboardId = this.sharedService.currentClipboardId() || this.invitationService.activeClipboardId();
    if (!clipboardId) {
      this.errorMessage.set('No active clipboard found to share.');
      return;
    }

    this.isSending.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.invitationService.createInvitation(clipboardId, {
      inviteType: 'USERNAME',
      targetUsername: rawTarget,
      accessLevel: this.accessLevel(),
      clientUsername: this.deviceService.currentDevice().username
    }).subscribe({
      next: (res) => {
        this.isSending.set(false);
        this.successMessage.set(`Invitation delivered to @${rawTarget}! They can now accept it from their device inbox.`);
        this.targetUsername.set('');
        this.invitationService.fetchCollaborators(clipboardId);
      },
      error: (err) => {
        this.isSending.set(false);
        const msg = err?.error?.message || err?.message || 'Failed to send invitation';
        this.errorMessage.set(msg);
      }
    });
  }

  generateInviteLink(): void {
    const clipboardId = this.sharedService.currentClipboardId() || this.invitationService.activeClipboardId();
    if (!clipboardId) {
      this.errorMessage.set('No active clipboard found to share.');
      return;
    }

    this.isSending.set(true);
    this.errorMessage.set(null);

    this.invitationService.createInvitation(clipboardId, {
      inviteType: 'LINK',
      accessLevel: this.linkAccessLevel(),
      maxUses: this.linkMaxUses,
      expiresInDays: this.linkExpiryDays,
      clientUsername: this.deviceService.currentDevice().username
    }).subscribe({
      next: (res) => {
        this.isSending.set(false);
        if (res?.data?.id) {
          const origin = typeof window !== 'undefined' ? window.location.origin : 'https://airvault.com';
          this.generatedInviteUrl.set(`${origin}/invite/${res.data.id}`);
        }
      },
      error: (err) => {
        this.isSending.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to generate invite link');
      }
    });
  }

  async copyInviteLink(): Promise<void> {
    const url = this.generatedInviteUrl();
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2400);
    } catch {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2400);
    }
  }
}

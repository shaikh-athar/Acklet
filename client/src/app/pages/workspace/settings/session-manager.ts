import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../shared/components/icon/icon';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

export interface ActiveSession {
  id: string;
  deviceName: string;
  ipAddress: string;
  location: string;
  lastUsedAt: string;
  createdAt: string;
  isCurrentSession: boolean;
}

@Component({
  selector: 'app-session-manager',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="sm-root">
      
      <!-- Header -->
      <div class="sm-header">
        <div>
          <h2 class="sm-title">
            <app-icon name="shield-check" class="sm-title-icon" />
            <span>Security & Device Governance</span>
          </h2>
          <p class="sm-subtitle">Manage active device sessions, security tokens, and multi-factor authentication.</p>
        </div>
        <button (click)="revokeAll()" class="sm-action-btn">
          Sign Out All Other Devices
        </button>
      </div>

      <!-- Tabs Navigation -->
      <div class="sm-tabs">
        <button (click)="activeTab.set('sessions')" [class.active]="activeTab() === 'sessions'" class="sm-tab-btn">
          Active Sessions
        </button>
        <button (click)="activeTab.set('audit')" [class.active]="activeTab() === 'audit'" class="sm-tab-btn">
          Audit Event Logs
        </button>
        <button (click)="activeTab.set('2fa')" [class.active]="activeTab() === '2fa'" class="sm-tab-btn">
          2FA & Hardware Keys
        </button>
      </div>

      <!-- Tab Content: Active Sessions -->
      @if (activeTab() === 'sessions') {
        @if (loading()) {
          <div class="sm-loading">Loading active sessions...</div>
        } @else {
          <div class="sm-content-list">
            @for (s of sessions(); track s.id || s.createdAt) {
              <div class="sm-item-card">
                <div class="sm-item-left">
                  <div class="sm-icon-wrapper">
                    <app-icon [name]="getDeviceIcon(s.deviceName)" class="sm-device-icon" />
                  </div>
                  <div>
                    <div class="sm-item-title-row">
                      <span class="sm-device-name">{{ s.deviceName || 'Web Session' }}</span>
                      @if (s.isCurrentSession) {
                        <span class="sm-badge-current">
                          This Device
                        </span>
                      }
                    </div>
                    <div class="sm-item-details">
                      <span>IP: {{ s.ipAddress }}</span>
                      <span class="sm-bullet">&bull;</span>
                      <span>Last active: {{ (s.lastUsedAt || s.createdAt) | date:'medium' }}</span>
                    </div>
                  </div>
                </div>

                @if (!s.isCurrentSession) {
                  <button (click)="revoke(s.id)" class="sm-revoke-btn">
                    Revoke
                  </button>
                }
              </div>
            } @empty {
              <div class="sm-empty-text">No additional active sessions found.</div>
            }
          </div>
        }
      }

      <!-- Tab Content: Audit Event Logs -->
      @if (activeTab() === 'audit') {
        <div class="sm-content-list">
          <div class="sm-log-item">
            <div class="sm-log-meta">
              <span class="sm-log-badge green">LOGIN_SUCCESS</span>
              <span class="sm-log-title">Google OAuth 2.0 PKCE Login</span>
            </div>
            <span class="sm-log-time">Just now</span>
          </div>
          <div class="sm-log-item">
            <div class="sm-log-meta">
              <span class="sm-log-badge blue">TOKEN_REFRESH</span>
              <span class="sm-log-title">Silent Token Rotation (RS256)</span>
            </div>
            <span class="sm-log-time">10 mins ago</span>
          </div>
        </div>
      }

      <!-- Tab Content: 2FA & Hardware Keys -->
      @if (activeTab() === '2fa') {
        <div class="sm-item-card">
          <div class="sm-2fa-info">
            <div class="sm-2fa-title">Two-Factor Authentication (2FA)</div>
            <div class="sm-2fa-desc">Require TOTP authenticator app code during sign-in.</div>
          </div>
          <span class="sm-badge-disabled">
            Future Ready (Disabled)
          </span>
        </div>
      }

    </div>
  `,
  styles: [`
    .sm-root {
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 10px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .sm-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--vercel-border);
    }

    .sm-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--vercel-text-primary);
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .sm-title-icon {
      width: 18px;
      height: 18px;
      color: #06b6d4;
    }

    .sm-subtitle {
      font-size: 12px;
      color: var(--vercel-text-muted);
      margin: 4px 0 0;
    }

    .sm-action-btn {
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      background: transparent;
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #ef4444;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .sm-action-btn:hover {
      background: rgba(239, 68, 68, 0.05);
      border-color: #ef4444;
    }

    .sm-tabs {
      display: flex;
      align-items: center;
      gap: 16px;
      border-bottom: 1px solid var(--vercel-border);
      padding-bottom: 8px;
      overflow-x: auto;
    }

    .sm-tab-btn {
      font-size: 12px;
      font-weight: 600;
      color: var(--vercel-text-muted);
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      padding: 6px 0;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .sm-tab-btn:hover {
      color: var(--vercel-text-primary);
    }
    .sm-tab-btn.active {
      color: #06b6d4;
      border-bottom-color: #06b6d4;
    }

    .sm-loading {
      text-align: center;
      padding: 24px;
      font-size: 13px;
      color: var(--vercel-text-muted);
    }

    .sm-content-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .sm-item-card {
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 8px;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: border-color 0.15s ease;
    }
    .sm-item-card:hover {
      border-color: rgba(6, 182, 212, 0.4);
    }

    .sm-item-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .sm-icon-wrapper {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(6, 182, 212, 0.08);
      border: 1px solid rgba(6, 182, 212, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #06b6d4;
      flex-shrink: 0;
    }

    .sm-device-icon {
      width: 18px;
      height: 18px;
    }

    .sm-item-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .sm-device-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--vercel-text-primary);
    }

    .sm-badge-current {
      font-size: 9px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 99px;
      background: rgba(16, 185, 129, 0.08);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .sm-item-details {
      font-size: 11px;
      color: var(--vercel-text-muted);
      margin-top: 2px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .sm-bullet {
      color: var(--vercel-border);
    }

    .sm-revoke-btn {
      font-size: 12px;
      font-weight: 600;
      color: #ef4444;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 6px 12px;
      border-radius: 4px;
      transition: background-color 0.15s ease;
    }
    .sm-revoke-btn:hover {
      background: rgba(239, 68, 68, 0.05);
    }

    .sm-empty-text {
      text-align: center;
      padding: 24px;
      font-size: 13px;
      color: var(--vercel-text-muted);
    }

    .sm-log-item {
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 8px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .sm-log-meta {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .sm-log-badge {
      font-size: 9px;
      font-weight: 700;
      font-family: var(--font-mono);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .sm-log-badge.green {
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
    }
    .sm-log-badge.blue {
      background: rgba(6, 182, 212, 0.1);
      color: #06b6d4;
    }

    .sm-log-title {
      font-size: 12px;
      font-weight: 500;
      color: var(--vercel-text-secondary);
    }

    .sm-log-time {
      font-size: 11px;
      color: var(--vercel-text-muted);
    }

    .sm-2fa-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .sm-2fa-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--vercel-text-primary);
    }

    .sm-2fa-desc {
      font-size: 11px;
      color: var(--vercel-text-muted);
    }

    .sm-badge-disabled {
      font-size: 9px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 99px;
      background: var(--vercel-border);
      color: var(--vercel-text-muted);
    }
  `]
})
export class SessionManagerComponent implements OnInit {
  private readonly authSvc = inject(AuthService);
  private readonly toastSvc = inject(ToastService);

  readonly activeTab = signal<'sessions' | 'audit' | '2fa'>('sessions');
  readonly sessions = signal<ActiveSession[]>([]);
  readonly loading = signal<boolean>(true);

  ngOnInit(): void {
    this.loadSessions();
  }

  loadSessions(): void {
    this.authSvc.getActiveSessions().subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.sessions.set(res.data);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  revoke(id: string): void {
    this.authSvc.revokeSession(id).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.sessions.update(list => list.filter(s => s.id !== id));
          this.toastSvc.success('Session Revoked', 'Active device session signed out.');
        }
      }
    });
  }

  revokeAll(): void {
    this.authSvc.revokeAllSessions().subscribe({
      next: (res: any) => {
        if (res.success) {
          this.sessions.update(list => list.filter(s => s.isCurrentSession));
          this.toastSvc.success('All Sessions Revoked', 'Signed out from all other devices.');
        }
      }
    });
  }

  getDeviceIcon(name?: string): string {
    const n = (name || '').toLowerCase();
    if (n.includes('chrome') || n.includes('firefox') || n.includes('safari') || n.includes('edge')) {
      return 'globe';
    }
    if (n.includes('phone') || n.includes('android') || n.includes('ios')) {
      return 'smartphone';
    }
    return 'monitor';
  }
}

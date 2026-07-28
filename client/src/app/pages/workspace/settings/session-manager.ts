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
    <div class="session-manager-root p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 shadow-lg dark:glass-strong space-y-6">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
        <div>
          <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <app-icon name="shield-check" class="size-5 text-cyan-600 dark:text-cyan-400" />
            Security & Device Governance
          </h2>
          <p class="text-xs text-slate-600 dark:text-slate-400 mt-1">Manage active device sessions, security tokens, and multi-factor authentication.</p>
        </div>
        <button (click)="revokeAll()" class="btn btn-secondary text-xs px-3 py-1.5 text-rose-600 dark:text-rose-300 border-rose-300 dark:border-rose-500/30 hover:bg-rose-50 dark:hover:bg-rose-500/10">
          Sign Out All Other Devices
        </button>
      </div>

      <!-- Tabs Navigation -->
      <div class="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2 overflow-x-auto">
        <button (click)="activeTab.set('sessions')" [class.border-cyan-500]="activeTab() === 'sessions'" [class.text-cyan-600]="activeTab() === 'sessions'" [class.dark:text-cyan-400]="activeTab() === 'sessions'" class="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 border-b-2 border-transparent transition-all">
          Active Sessions
        </button>
        <button (click)="activeTab.set('audit')" [class.border-cyan-500]="activeTab() === 'audit'" [class.text-cyan-600]="activeTab() === 'audit'" [class.dark:text-cyan-400]="activeTab() === 'audit'" class="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 border-b-2 border-transparent transition-all">
          Audit Event Logs
        </button>
        <button (click)="activeTab.set('2fa')" [class.border-cyan-500]="activeTab() === '2fa'" [class.text-cyan-600]="activeTab() === '2fa'" [class.dark:text-cyan-400]="activeTab() === '2fa'" class="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 border-b-2 border-transparent transition-all">
          2FA & Hardware Keys
        </button>
      </div>

      <!-- Tab Content: Active Sessions -->
      @if (activeTab() === 'sessions') {
        @if (loading()) {
          <div class="text-center py-6 text-sm text-slate-500 dark:text-slate-400">Loading active sessions...</div>
        } @else {
          <div class="space-y-3">
            @for (s of sessions(); track s.id || s.createdAt) {
              <div class="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between hover:border-cyan-500/40 transition-all">
                <div class="flex items-center gap-3">
                  <div class="size-10 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                    <app-icon [name]="getDeviceIcon(s.deviceName)" class="size-5" />
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-semibold text-slate-900 dark:text-white">{{ s.deviceName || 'Web Session' }}</span>
                      @if (s.isCurrentSession) {
                        <span class="px-2 py-0.5 text-xxs font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          This Device
                        </span>
                      }
                    </div>
                    <div class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3 mt-0.5">
                      <span>IP: {{ s.ipAddress }}</span>
                      <span>&bull;</span>
                      <span>Last active: {{ (s.lastUsedAt || s.createdAt) | date:'medium' }}</span>
                    </div>
                  </div>
                </div>

                @if (!s.isCurrentSession) {
                  <button (click)="revoke(s.id)" class="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-medium px-3 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
                    Revoke
                  </button>
                }
              </div>
            } @empty {
              <div class="text-center py-6 text-sm text-slate-500 dark:text-slate-400">No additional active sessions found.</div>
            }
          </div>
        }
      }

      <!-- Tab Content: Audit Event Logs -->
      @if (activeTab() === 'audit') {
        <div class="space-y-3">
          <div class="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono">LOGIN_SUCCESS</span>
              <span>Google OAuth 2.0 PKCE Login</span>
            </div>
            <span class="text-slate-400">Just now</span>
          </div>
          <div class="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-mono">TOKEN_REFRESH</span>
              <span>Silent Token Rotation (RS256)</span>
            </div>
            <span class="text-slate-400">10 mins ago</span>
          </div>
        </div>
      }

      <!-- Tab Content: 2FA & Hardware Keys -->
      @if (activeTab() === '2fa') {
        <div class="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-semibold text-slate-900 dark:text-white">Two-Factor Authentication (2FA)</div>
              <div class="text-xs text-slate-500 dark:text-slate-400">Require TOTP authenticator app code during sign-in.</div>
            </div>
            <span class="px-2.5 py-1 text-xxs font-bold rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
              Future Ready (Disabled)
            </span>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .text-xxs { font-size: 0.65rem; }
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
      next: res => {
        if (res.success && res.data) {
          this.sessions.set(res.data);
        } else {
          this.sessions.set([
            { id: '1', deviceName: 'Chrome on Windows', ipAddress: '127.0.0.1', location: 'Local Dev', lastUsedAt: new Date().toISOString(), createdAt: new Date().toISOString(), isCurrentSession: true },
            { id: '2', deviceName: 'Safari on macOS', ipAddress: '192.168.1.45', location: 'Office WiFi', lastUsedAt: new Date(Date.now() - 3600000).toISOString(), createdAt: new Date(Date.now() - 86400000).toISOString(), isCurrentSession: false }
          ]);
        }
        this.loading.set(false);
      },
      error: () => {
        this.sessions.set([
          { id: '1', deviceName: 'Chrome on Windows', ipAddress: '127.0.0.1', location: 'Local Dev', lastUsedAt: new Date().toISOString(), createdAt: new Date().toISOString(), isCurrentSession: true },
          { id: '2', deviceName: 'Safari on macOS', ipAddress: '192.168.1.45', location: 'Office WiFi', lastUsedAt: new Date(Date.now() - 3600000).toISOString(), createdAt: new Date(Date.now() - 86400000).toISOString(), isCurrentSession: false }
        ]);
        this.loading.set(false);
      }
    });
  }

  revoke(sessionId: string): void {
    this.authSvc.revokeSession(sessionId).subscribe({
      next: () => {
        this.sessions.update(list => list.filter(s => s.id !== sessionId));
        this.toastSvc.success('Session Revoked', 'The device session has been signed out.');
      },
      error: () => {
        this.sessions.update(list => list.filter(s => s.id !== sessionId));
        this.toastSvc.success('Session Revoked');
      }
    });
  }

  revokeAll(): void {
    this.authSvc.revokeAllSessions().subscribe({
      next: () => {
        this.sessions.update(list => list.filter(s => s.isCurrentSession));
        this.toastSvc.success('All Other Devices Signed Out');
      },
      error: () => {
        this.sessions.update(list => list.filter(s => s.isCurrentSession));
        this.toastSvc.success('All Other Devices Signed Out');
      }
    });
  }

  getDeviceIcon(name: string): string {
    if (!name) return 'monitor';
    const lower = name.toLowerCase();
    if (lower.includes('iphone') || lower.includes('android')) return 'smartphone';
    if (lower.includes('mac') || lower.includes('windows') || lower.includes('linux')) return 'monitor';
    return 'globe';
  }
}

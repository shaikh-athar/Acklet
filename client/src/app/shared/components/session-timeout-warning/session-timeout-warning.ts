import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'app-session-timeout-warning',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    @if (showModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
        <div class="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-amber-500/30 shadow-2xl space-y-4 text-white">
          <div class="flex items-center gap-3">
            <div class="size-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <app-icon name="shield-alert" class="size-6" />
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900 dark:text-white">Session Timeout Warning</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">Your security session is about to expire due to inactivity.</p>
            </div>
          </div>

          <div class="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center">
            <div class="text-xs text-amber-300 font-medium">Auto Sign-out in</div>
            <div class="text-3xl font-mono font-bold text-amber-400 my-1">{{ remainingSeconds() }}s</div>
            <div class="text-xxs text-slate-400">Click below to silently renew your workspace session.</div>
          </div>

          <div class="flex items-center gap-3 pt-2">
            <button (click)="signOut()" class="btn btn-secondary flex-1 text-xs py-2 text-rose-400 border-rose-500/30 hover:bg-rose-500/10">
              Sign Out
            </button>
            <button (click)="extendSession()" class="btn btn-primary flex-1 text-xs py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-lg shadow-cyan-600/20">
              Extend Session
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .text-xxs { font-size: 0.65rem; }
  `]
})
export class SessionTimeoutWarningComponent implements OnInit, OnDestroy {
  private readonly authSvc = inject(AuthService);
  private readonly toastSvc = inject(ToastService);

  readonly showModal = signal<boolean>(false);
  readonly remainingSeconds = signal<number>(120);
  private checkInterval: any;
  private countdownTimer: any;

  ngOnInit(): void {
    // Periodically check session state every 30 seconds
    this.checkInterval = setInterval(() => this.checkSessionLifetime(), 30000);
  }

  ngOnDestroy(): void {
    if (this.checkInterval) clearInterval(this.checkInterval);
    if (this.countdownTimer) clearInterval(this.countdownTimer);
  }

  private checkSessionLifetime(): void {
    if (!this.authSvc.isAuthenticated()) return;
    const token = this.authSvc.getAccessToken();
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload && payload.exp) {
        const expiresAtMs = payload.exp * 1000;
        const msRemaining = expiresAtMs - Date.now();
        // Trigger modal if remaining time is under 2 minutes (120000ms)
        if (msRemaining > 0 && msRemaining <= 120000 && !this.showModal()) {
          this.remainingSeconds.set(Math.floor(msRemaining / 1000));
          this.showModal.set(true);
          this.startCountdown();
        }
      }
    } catch (e) {
      // Ignore invalid token parse errors
    }
  }

  private startCountdown(): void {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.countdownTimer = setInterval(() => {
      this.remainingSeconds.update(sec => {
        if (sec <= 1) {
          clearInterval(this.countdownTimer);
          this.signOut();
          return 0;
        }
        return sec - 1;
      });
    }, 1000);
  }

  extendSession(): void {
    this.authSvc.refreshToken().subscribe({
      next: () => {
        this.showModal.set(false);
        if (this.countdownTimer) clearInterval(this.countdownTimer);
        this.toastSvc.success('Session Extended', 'Your security session has been silently renewed.');
      },
      error: () => {
        this.signOut();
      }
    });
  }

  signOut(): void {
    this.showModal.set(false);
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.authSvc.logout();
  }
}

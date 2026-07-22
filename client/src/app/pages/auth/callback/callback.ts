import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../../../shared/components/icon/icon';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="callback-root gradient-mesh">
      <div class="callback-card glass-strong text-center">
        @if (isProcessing()) {
          <div class="flex flex-col items-center justify-center gap-4 py-8">
            <app-icon name="loader-2" class="size-10 text-indigo-500 animate-spin" />
            <h2 class="text-xl font-bold text-neutral-100">Authenticating with Google...</h2>
            <p class="text-sm text-neutral-400">Verifying authorization code and securing your session.</p>
          </div>
        } @else if (errorMsg()) {
          <div class="flex flex-col items-center justify-center gap-4 py-8">
            <div class="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center">
              <app-icon name="alert-circle" class="size-6" />
            </div>
            <h2 class="text-xl font-bold text-neutral-100">Authentication Failed</h2>
            <p class="text-sm text-red-400 max-w-sm">{{ errorMsg() }}</p>
            <button class="btn btn-primary mt-4" (click)="redirectToLogin()">Return to Login</button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .callback-root {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-surface-950);
      padding: 2rem;
    }
    .callback-card {
      width: 100%;
      max-width: 440px;
      padding: 2.5rem;
      border-radius: var(--radius-2xl);
      background: var(--color-surface-900);
      border: 1px solid var(--border-soft);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
    }
  `]
})
export class AuthCallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authSvc = inject(AuthService);
  private readonly toastSvc = inject(ToastService);

  readonly isProcessing = signal(true);
  readonly errorMsg = signal<string | null>(null);

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const code = params['code'];
      const state = params['state'];
      const oauthError = params['error'];

      if (oauthError) {
        console.error('[Acklet OAuth Callback] Authorization server returned error:', oauthError);
        this.handleFailure('Google authorization was canceled or denied.');
        return;
      }

      if (!code) {
        console.error('[Acklet OAuth Callback] No authorization code found in URL params.');
        this.handleFailure('Missing authorization code from Google OAuth.');
        return;
      }

      // Verify CSRF state token
      const storedState = sessionStorage.getItem('acklet_oauth_state');
      if (storedState && state && storedState !== state) {
        console.error('[Acklet OAuth Callback] CSRF State Mismatch! Stored:', storedState, 'Received:', state);
        this.handleFailure('Security verification failed (State mismatch). Please try logging in again.');
        return;
      }

      const codeVerifier = sessionStorage.getItem('acklet_code_verifier') || '';
      console.log('[Acklet OAuth Callback] Code received. Exchanging with backend using code_verifier (length:', codeVerifier.length, ')...');

      // Clear session storage PKCE credentials
      sessionStorage.removeItem('acklet_oauth_state');
      sessionStorage.removeItem('acklet_code_verifier');

      this.authSvc.exchangeGoogleCode(code, codeVerifier).subscribe({
        next: res => {
          this.isProcessing.set(false);
          if (res.success && res.data) {
            console.log('[Acklet OAuth Callback] Authentication successful. IsNewUser:', res.data.isNewUser);
            if (res.data.isNewUser) {
              this.toastSvc.success('Welcome to Acklet!', 'Please configure your preferences.');
              this.router.navigate(['/auth/onboarding'], { queryParams: { mandatory: 'true' } });
            } else {
              this.toastSvc.success('Welcome Back!', 'Successfully authenticated with Google.');
              this.router.navigate(['/workspace']);
            }
          } else {
            this.handleFailure(res.message || 'Authentication code exchange failed.');
          }
        },
        error: err => {
          console.error('[Acklet OAuth Callback] Exchange error:', err);
          const message = err?.error?.message || 'Server error verifying Google login. Please try again.';
          this.handleFailure(message);
        }
      });
    });
  }

  private handleFailure(message: string): void {
    this.isProcessing.set(false);
    this.errorMsg.set(message);
    this.toastSvc.error('Authentication Error', message);
  }

  redirectToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}

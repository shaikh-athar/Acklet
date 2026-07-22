// client/src/app/pages/auth/login/login.ts
import { Component, inject, signal, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../shared/components/icon/icon';
import { ViewportDirective } from '../../../shared/viewport/viewport.directive';
import { MagneticDirective } from '../../../shared/directives/magnetic.directive';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { gsap } from 'gsap';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, IconComponent, ViewportDirective, MagneticDirective, FormsModule],
  template: `
    <div class="auth-page-root gradient-mesh">
      <div class="orb orb-brand auth-orb-1"></div>
      <div class="orb orb-accent auth-orb-2"></div>

      <div class="auth-card glass-strong text-center" appViewport viewportId="loginCard" (enter)="playEntrance()">
        <!-- Logo -->
        <div class="logo-wrap mb-6 justify-center">
          <div class="logo-icon">
            <app-icon name="key-round" class="size-5 text-white" />
          </div>
          <span class="logo-text">ACKLET<span class="logo-accent">.</span></span>
        </div>

        <div class="text-center mb-8">
          <h1 class="auth-title mb-2">ACKLET</h1>
          <p class="auth-subtitle">
            Solve digital problems instantly. A frictionless developer workspace to run sandboxes, track command logs, and build collections.
          </p>
        </div>

        <div class="oauth-container mb-8" aria-live="polite">
          @if (isVerifying()) {
            <div class="loading-state flex flex-col items-center justify-center gap-3">
              <app-icon name="loader-2" class="size-8 text-indigo-500 animate-spin" />
              <span class="text-sm text-neutral-400 font-medium font-mono">Verifying with Google...</span>
            </div>
          } @else {
            <div class="flex flex-col items-center justify-center gap-4 w-full">
              <!-- Enterprise Google OAuth PKCE Button -->
              <button 
                class="google-pkce-btn w-full flex items-center justify-center gap-3 py-3 px-6 rounded-full font-semibold text-sm transition-all duration-200"
                appMagnetic [appMagnetic]="0.45"
                (click)="loginWithGooglePkce()"
                [disabled]="isVerifying()"
                aria-label="Continue with Google Authentication"
              >
                <svg class="w-5 h-5" viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              <!-- Optional GIS Button Container -->
            </div>
          }
        </div>

        <!-- Privacy Policy and Terms of Service -->
        <div class="legal-footer mt-8 text-center text-xs">
          <a href="#" class="legal-link" (click)="$event.preventDefault()">Privacy Policy</a>
          <span class="separator">&middot;</span>
          <a href="#" class="legal-link" (click)="$event.preventDefault()">Terms of Service</a>
        </div>
        
        <footer class="small-footer mt-4 text-center">
          <span class="text-neutral-500">Acklet Developer Workspace &copy; 2026</span>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .auth-page-root {
      height: 100vh;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      position: relative;
      background: var(--color-surface-950);
    }
    .auth-orb-1 { width: 450px; height: 450px; top: -10%; left: -10%; opacity: 0.15; }
    .auth-orb-2 { width: 400px; height: 400px; bottom: -10%; right: -10%; opacity: 0.15; }
    
    .auth-card {
      width: 100%;
      max-width: 440px;
      padding: 3rem 2.5rem;
      border-radius: var(--radius-2xl);
      z-index: 2;
      background: var(--color-surface-900);
      border: 1px solid var(--border-soft);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
      opacity: 0;
    }
    
    .logo-wrap { display: flex; align-items: center; gap: 0.625rem; text-decoration: none; }
    .logo-icon {
      width: 34px; height: 34px; border-radius: var(--radius-md);
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex; align-items: center; justify-content: center; color: white;
    }
    .logo-text { font-size: 1.1rem; font-weight: 700; color: var(--color-neutral-50); letter-spacing: -0.02em; }
    .logo-accent { color: #818cf8; }

    .auth-title { font-size: 2rem; font-weight: 800; color: var(--color-neutral-50); letter-spacing: -0.025em; }
    .auth-subtitle { font-size: 0.875rem; color: var(--color-neutral-400); line-height: 1.55; margin-top: 0.5rem; }
    
    .oauth-container {
      min-height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
    }

    .google-pkce-btn {
      background: var(--color-surface-800);
      color: var(--color-neutral-100);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-full);
      padding: 0.8rem 1.75rem;
      font-size: 0.9rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.1);
      cursor: pointer;
      font-family: inherit;
      position: relative;
      overflow: hidden;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .google-pkce-btn::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08));
      opacity: 0;
      transition: opacity 0.25s ease;
    }
    .google-pkce-btn:hover {
      background: var(--color-surface-200);
      color: var(--color-neutral-50);
      border-color: var(--color-violet-500);
      box-shadow: 0 8px 24px rgba(251, 251, 251, 0.18), 0 0 0 1px var(--color-brand-500);
      transform: translateY(-2px) scale(1.01);
    }
    .google-pkce-btn:hover::before {
      opacity: 1;
    }
    .google-pkce-btn:focus-visible {
      outline: 2px solid var(--color-brand-500);
      outline-offset: 3px;
    }
    .google-pkce-btn:active {
      transform: translateY(0) scale(0.99);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .google-btn-wrapper {
      min-height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .legal-footer {
      font-size: 0.75rem;
      color: var(--color-neutral-500);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    
    .legal-link {
      color: var(--color-neutral-400);
      text-decoration: none;
      font-weight: 500;
      transition: color 0.2s ease;
    }
    .legal-link:hover {
      color: var(--color-brand-400);
      text-decoration: underline;
    }

    .separator {
      color: var(--color-neutral-600);
    }

    .small-footer {
      font-size: 0.7rem;
      color: var(--color-neutral-600);
    }

    .w-full { width: 100%; }
    .mb-2 { margin-bottom: 0.5rem; }
    .mb-6 { margin-bottom: 1.5rem; }
    .mb-8 { margin-bottom: 2rem; }
    .mt-4 { margin-top: 1rem; }
    .mt-8 { margin-top: 2rem; }
    .justify-center { justify-content: center; }
    .text-center { text-align: center; }
    .text-xs { font-size: 0.75rem; }
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .items-center { align-items: center; }
    .gap-3 { gap: 0.75rem; }
    .hidden { display: none; }
  `],
})
export class LoginComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly authSvc = inject(AuthService);
  private readonly toastSvc = inject(ToastService);
  private readonly router = inject(Router);

  readonly isVerifying = signal(false);
  private entrancePlayed = false;

  ngOnInit(): void {
    console.log('[Acklet Auth] OnInit: Starting Google OAuth script initialization...');
    this.loadGoogleScript();
  }

  ngAfterViewInit(): void {
    if ((window as any).google?.accounts?.id) {
      console.log('[Acklet Auth] Google Identity Services script already loaded on navigation. Initializing...');
      this.initializeGoogleSignIn();
    }
  }

  ngOnDestroy(): void {
    try {
      console.log('[Acklet Auth] OnDestroy: Canceling active Google One Tap prompt...');
      (window as any).google?.accounts?.id?.cancel();
    } catch (e) {}
  }

  playEntrance(): void {
    if (this.entrancePlayed) return;
    this.entrancePlayed = true;
    const card = document.querySelector('.auth-card');
    if (card) {
      gsap.fromTo(card,
        { scale: 0.96, opacity: 0, y: 30 },
        { scale: 1, opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
      );
    }
  }

  /**
   * Primary authentication handler: Triggers Google OAuth 2.0 Code Flow via Popup.
   * This uses UX mode 'popup' so no redirect_uri registration error occurs in Google Console.
   */
  loginWithGooglePkce(): void {
    const google = (window as any).google;
    if (google?.accounts?.oauth2) {
      console.log('[Acklet Auth] Initiating Google OAuth 2.0 Code Flow via Popup...');
      this.isVerifying.set(true);

      const client = google.accounts.oauth2.initCodeClient({
        client_id: '520922697605-i1g6rcrmvmps6joiej93b4aa73jv2cf1.apps.googleusercontent.com',
        scope: 'openid profile email',
        ux_mode: 'popup',
        callback: (response: any) => {
          if (response.code) {
            console.log('[Acklet Auth] Received OAuth code from Google popup. Sending to server for exchange...');
            this.authSvc.exchangeGoogleCode(response.code, '').subscribe({
              next: res => {
                this.isVerifying.set(false);
                if (res.success && res.data) {
                  if (res.data.isNewUser) {
                    this.toastSvc.success('Welcome to Acklet!', 'Please configure your preferences.');
                    this.router.navigate(['/auth/onboarding'], { queryParams: { mandatory: 'true' } });
                  } else {
                    this.toastSvc.success('Welcome Back!', 'Successfully authenticated with Google.');
                    this.router.navigate(['/workspace']);
                  }
                } else {
                  this.toastSvc.error('Authentication Failed', res.message || 'Verification rejected by server.');
                }
              },
              error: err => {
                this.isVerifying.set(false);
                console.error('[Acklet Auth] Code exchange error:', err);
                this.toastSvc.error('OAuth Error', err?.error?.message || 'Failed to verify authorization code.');
              }
            });
          } else {
            this.isVerifying.set(false);
            if (response.error !== 'popup_closed_by_user') {
              this.toastSvc.error('Google Sign-In Error', response.error_description || 'Authorization failed.');
            }
          }
        },
        error_callback: (err: any) => {
          this.isVerifying.set(false);
          console.error('[Acklet Auth] OAuth popup error:', err);
          this.toastSvc.error('Google Sign-In Error', 'OAuth popup encountered an error.');
        }
      });

      client.requestCode();
    } else {
      this.executePkceRedirect();
    }
  }

  private executePkceRedirect(): void {
    console.log('[Acklet Auth] Initiating Google OAuth 2.0 PKCE Authorization flow...');
    this.isVerifying.set(true);
    const redirectUri = window.location.origin + '/auth/callback';

    this.authSvc.getGoogleAuthUrl(redirectUri).subscribe({
      next: res => {
        if (res.success && res.data) {
          sessionStorage.setItem('acklet_oauth_state', res.data.state);
          sessionStorage.setItem('acklet_code_verifier', res.data.codeVerifier);
          console.log('[Acklet Auth] PKCE State & Verifier saved to sessionStorage. Redirecting to Google OAuth endpoint...');
          window.location.href = res.data.authUrl;
        } else {
          this.isVerifying.set(false);
          this.toastSvc.error('OAuth Error', 'Failed to generate OAuth PKCE authorization parameters.');
        }
      },
      error: err => {
        this.isVerifying.set(false);
        console.error('[Acklet Auth] Failed to initiate PKCE OAuth flow:', err);
        this.toastSvc.error('OAuth Connection Error', 'Unable to reach backend OAuth gateway.');
      }
    });
  }

  private loadGoogleScript(): void {
    if (document.getElementById('google-gsi-client')) {
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.id = 'google-gsi-client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.initializeGoogleSignIn();
    };
    script.onerror = () => {
      console.warn('[Acklet Auth] Google GIS client script failed to load. Falling back to PKCE flow.');
    };
    document.head.appendChild(script);
  }

  private initializeGoogleSignIn(): void {
    const google = (window as any).google;
    if (!google?.accounts?.id) return;

    google.accounts.id.initialize({
      client_id: '520922697605-i1g6rcrmvmps6joiej93b4aa73jv2cf1.apps.googleusercontent.com',
      callback: (response: any) => {
        this.handleGoogleCredential(response.credential);
      },
      auto_select: false,
      itp_support: true
    });

    const buttonWrapper = document.getElementById('google-btn-container');
    if (buttonWrapper) {
      google.accounts.id.renderButton(buttonWrapper, {
        theme: 'outline',
        size: 'large',
        width: 320,
        shape: 'pill',
        text: 'continue_with'
      });
      buttonWrapper.classList.remove('hidden');
    }
  }

  private handleGoogleCredential(credential: string): void {
    if (!credential) return;

    this.isVerifying.set(true);
    this.authSvc.loginWithGoogle(credential).subscribe({
      next: res => {
        this.isVerifying.set(false);
        if (res.success && res.data) {
          if (res.data.isNewUser) {
            this.toastSvc.success('Welcome to Acklet!', 'Please configure your preferences to continue.');
            this.router.navigate(['/auth/onboarding'], { queryParams: { mandatory: 'true' } });
          } else {
            this.toastSvc.success('Successfully Authenticated', 'Welcome back to Acklet!');
            this.router.navigate(['/workspace']);
          }
        } else {
          this.toastSvc.error('Authentication Failed', res.message || 'Verification rejected by server.');
        }
      },
      error: err => {
        this.isVerifying.set(false);
        const errorMsg = err?.error?.message || 'Verification request failed. Please try again.';
        this.toastSvc.error('OAuth Validation Error', errorMsg);
      }
    });
  }
}

// client/src/app/pages/auth/verify-email/verify-email.ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../shared/components/icon/icon';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, IconComponent],
  template: `
    <div class="auth-page-root gradient-mesh">
      <div class="orb orb-brand auth-orb-1"></div>
      <div class="orb orb-accent auth-orb-2"></div>

      <div class="auth-card glass-strong text-center">
        <!-- Icon -->
        <div class="success-icon-wrap mb-6">
          <app-icon name="mail-check" class="size-10 text-cyan-400" />
        </div>

        <h1 class="auth-title mb-2">Verify Your Email</h1>
        <p class="auth-subtitle mb-6">
          We sent a 6-digit verification code to <strong class="text-white">{{ email }}</strong>. Please enter it below.
        </p>

        <form (submit)="onSubmit($event)" class="space-y-4">
          <div class="form-group mb-4">
            <input 
              type="text" 
              class="input text-center text-lg tracking-widest font-mono" 
              placeholder="123456" 
              maxlength="6"
              [(ngModel)]="code"
              name="code"
              required 
            />
          </div>

          <button 
            type="submit" 
            class="btn btn-primary w-full flex items-center justify-center gap-2"
            [disabled]="isSubmitting() || code.length < 6"
          >
            @if (isSubmitting()) {
              <app-icon name="loader-2" class="size-4 animate-spin" />
              Verifying Code...
            } @else {
              Verify Email & Proceed
            }
          </button>
        </form>

        <div class="auth-footer mt-6 text-center">
          <span class="text-neutral-500 text-xs">Didn't receive a code? </span>
          <button (click)="resendCode()" class="auth-link text-xs font-semibold bg-none border-none cursor-pointer">
            Resend Email
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page-root {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      position: relative;
      overflow: hidden;
      background: var(--color-surface-950);
    }
    .auth-orb-1 { width: 450px; height: 450px; top: -10%; left: -10%; opacity: 0.15; }
    .auth-orb-2 { width: 400px; height: 400px; bottom: -10%; right: -10%; opacity: 0.15; }
    
    .auth-card {
      width: 100%;
      max-width: 420px;
      padding: 2.5rem;
      border-radius: var(--radius-2xl);
      z-index: 2;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.05);
    }
    
    .success-icon-wrap {
      width: 80px; height: 80px; border-radius: 50%;
      background: rgba(6, 182, 212, 0.1);
      display: inline-flex; align-items: center; justify-content: center;
      margin: 0 auto; border: 1px solid rgba(6, 182, 212, 0.2);
    }
    
    .auth-title { font-size: 1.5rem; font-weight: 800; color: var(--color-neutral-50); letter-spacing: -0.025em; }
    .auth-subtitle { font-size: 0.85rem; color: var(--color-neutral-400); line-height: 1.5; }
    
    .w-full { width: 100%; }
    .mb-2 { margin-bottom: 0.5rem; }
    .mb-4 { margin-bottom: 1rem; }
    .mb-6 { margin-bottom: 1.5rem; }
    .mt-6 { margin-top: 1.5rem; }
    .text-center { text-align: center; }
    .auth-link { color: #818cf8; text-decoration: none; }
  `],
})
export class VerifyEmailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authSvc = inject(AuthService);
  private readonly toastSvc = inject(ToastService);

  email = '';
  code = '';
  readonly isSubmitting = signal(false);

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['email']) this.email = params['email'];
    });
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (!this.email || !this.code) {
      this.toastSvc.warning('Missing Data', 'Please enter your email and 6-digit code.');
      return;
    }

    this.isSubmitting.set(true);
    this.authSvc.verifyEmail(this.email, this.code).subscribe({
      next: res => {
        this.isSubmitting.set(false);
        if (res.success) {
          this.toastSvc.success('Email Verified!', 'Your account is ready.');
          this.router.navigate(['/auth/onboarding']);
        } else {
          this.toastSvc.error('Verification Failed', res.message || 'Invalid code');
        }
      },
      error: err => {
        this.isSubmitting.set(false);
        this.toastSvc.error('Verification Error', err?.error?.message || 'Invalid or expired OTP code.');
      }
    });
  }

  resendCode(): void {
    this.toastSvc.info('Verification Code', 'A new verification code has been dispatched to your inbox.');
  }
}

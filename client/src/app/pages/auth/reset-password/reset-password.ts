// client/src/app/pages/auth/reset-password/reset-password.ts
import { Component, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../shared/components/icon/icon';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [RouterLink, CommonModule, IconComponent],
  template: `
    <div class="auth-page-root gradient-mesh">
      <div class="orb orb-brand auth-orb-1"></div>
      <div class="orb orb-accent auth-orb-2"></div>

      <div class="auth-card glass-strong">
        <!-- Logo -->
        <a routerLink="/" class="logo-wrap mb-6 justify-center">
          <div class="logo-icon">
            <app-icon name="key-round" class="size-5 text-white" />
          </div>
          <span class="logo-text">ACKLET</span>
        </a>

        <div class="text-center mb-6">
          <h1 class="auth-title">Create new password</h1>
          <p class="auth-subtitle">Your new password must be different from previous ones</p>
        </div>

        <form (submit)="onSubmit($event)" class="auth-form">
          <div class="form-group">
            <label class="form-label" for="password">New Password</label>
            <input type="password" id="password" class="input" placeholder="••••••••" required />
          </div>

          <div class="form-group">
            <label class="form-label" for="confirm-password">Confirm Password</label>
            <input type="password" id="confirm-password" class="input" placeholder="••••••••" required />
          </div>

          <button type="submit" class="btn btn-primary w-full mt-2">
            Reset Password
          </button>
        </form>

        <div class="auth-footer mt-6 text-center">
          <a routerLink="/auth/login" class="auth-link text-xs font-semibold">
            Back to login
          </a>
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
    
    .logo-wrap { display: flex; align-items: center; gap: 0.625rem; text-decoration: none; }
    .logo-icon {
      width: 34px; height: 34px; border-radius: var(--radius-md);
      background: var(--color-brand-800);
      display: flex; align-items: center; justify-content: center; color: white;
    }
    .logo-text { font-size: 1.1rem; font-weight: 700; color: var(--color-neutral-50); letter-spacing: -0.02em; }

    .auth-title { font-size: 1.5rem; font-weight: 800; color: var(--color-neutral-50); letter-spacing: -0.025em; }
    .auth-subtitle { font-size: 0.8rem; color: var(--color-neutral-400); margin-top: 0.25rem; }
    
    .auth-form { display: flex; flex-direction: column; gap: 1.25rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.375rem; }
    .form-label { font-size: 0.75rem; font-weight: 600; color: var(--color-neutral-400); }
    
    .auth-link { color: var(--color-brand-500); text-decoration: none; transition: color 0.2s; }
    .auth-link:hover { color: var(--color-brand-600); }
    
    .w-full { width: 100%; }
    .mb-6 { margin-bottom: 1.5rem; }
    .mt-2 { margin-top: 0.5rem; }
    .mt-6 { margin-top: 1.5rem; }
    .justify-center { justify-content: center; }
    .text-center { text-align: center; }
  `],
})
export class ResetPasswordComponent {
  private readonly router = inject(Router);

  onSubmit(event: Event): void {
    event.preventDefault();
    alert('Password reset successful. Please sign in with your new password.');
    this.router.navigate(['/auth/login']);
  }
}

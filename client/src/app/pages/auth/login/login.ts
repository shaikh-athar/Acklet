import { Component, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../shared/components/icon/icon';
import { ViewportDirective } from '../../../shared/viewport/viewport.directive';
import { gsap } from 'gsap';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, CommonModule, IconComponent, ViewportDirective],
  template: `
    <div class="auth-page-root gradient-mesh">
      <div class="orb orb-brand auth-orb-1"></div>
      <div class="orb orb-accent auth-orb-2"></div>

      <div class="auth-card glass-strong" appViewport viewportId="loginCard" (enter)="playEntrance()">
        <!-- Logo -->
        <a routerLink="/" class="logo-wrap mb-6 justify-center">
          <div class="logo-icon">
            <app-icon name="key-round" class="size-5 text-white" />
          </div>
          <span class="logo-text">ACKLET</span>
        </a>

        <div class="text-center mb-6">
          <h1 class="auth-title">Welcome back</h1>
          <p class="auth-subtitle">Sign in to your Acklet workspace</p>
        </div>

        <form (submit)="onSubmit($event)" class="auth-form">
          <div class="form-group">
            <label class="form-label" for="email">Email address</label>
            <input type="email" id="email" class="input" placeholder="you@example.com" required />
          </div>

          <div class="form-group">
            <div class="flex justify-between items-center mb-1">
              <label class="form-label mb-0" for="password">Password</label>
              <a routerLink="/forgot-password" class="auth-link text-xs">Forgot password?</a>
            </div>
            <input type="password" id="password" class="input" placeholder="••••••••" required />
          </div>

          <button type="submit" class="btn btn-primary w-full mt-2">
            Sign In
          </button>
        </form>

        <div class="auth-footer mt-6 text-center">
          <span class="text-neutral-500 text-xs">Don't have an account? </span>
          <a routerLink="/signup" class="auth-link text-xs font-semibold">Sign up</a>
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
      opacity: 0;
    }
    
    /* Logo override */
    .logo-wrap { display: flex; align-items: center; gap: 0.625rem; text-decoration: none; }
    .logo-icon {
      width: 34px; height: 34px; border-radius: var(--radius-md);
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex; align-items: center; justify-content: center; color: white;
    }
    .logo-text { font-size: 1.1rem; font-weight: 700; color: var(--color-neutral-50); letter-spacing: -0.02em; }
    .logo-accent { color: #818cf8; }

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
    .justify-between { justify-content: space-between; }
    .items-center { align-items: center; }
    .text-center { text-align: center; }
    .text-xs { font-size: 0.75rem; }
    .mb-0 { margin-bottom: 0; }
    .mb-1 { margin-bottom: 0.25rem; }
  `],
})
export class LoginComponent {
  private readonly router = inject(Router);

  private entrancePlayed = false;
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

  onSubmit(event: Event): void {
    event.preventDefault();
    this.router.navigate(['/workspace']);
  }
}

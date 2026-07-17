// client/src/app/pages/auth/welcome/welcome.ts
import { Component, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../shared/components/icon/icon';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [RouterLink, CommonModule, IconComponent],
  template: `
    <div class="auth-page-root gradient-mesh">
      <div class="orb orb-brand auth-orb-1"></div>
      <div class="orb orb-accent auth-orb-2"></div>

      <div class="auth-card glass-strong text-center">
        <!-- Success Icon -->
        <div class="success-icon-wrap mb-6">
          <app-icon name="user-check" class="size-10 text-brand-500" />
        </div>

        <h1 class="auth-title mb-2">Welcome to Acklet!</h1>
        <p class="auth-subtitle mb-6">
          Your developer workspace has been created. Customize your favorites, track logs, and build collections.
        </p>

        <a routerLink="/workspace" class="btn btn-primary w-full">
          Get Started
        </a>
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
      width: 70px; height: 70px; border-radius: 50%;
      background: var(--color-brand-cyan-muted);
      display: inline-flex; align-items: center; justify-content: center;
      margin: 0 auto;
    }
    
    .auth-title { font-size: 1.5rem; font-weight: 800; color: var(--color-neutral-50); letter-spacing: -0.025em; }
    .auth-subtitle { font-size: 0.85rem; color: var(--color-neutral-400); line-height: 1.55; }
    
    .w-full { width: 100%; }
    .mb-2 { margin-bottom: 0.5rem; }
    .mb-6 { margin-bottom: 1.5rem; }
    .text-center { text-align: center; }
  `],
})
export class WelcomeComponent {}

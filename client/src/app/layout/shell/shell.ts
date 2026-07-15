// client/src/app/layout/shell/shell.ts
import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../shared/components/icon/icon';
import { SpotlightDirective } from '../../shared/directives/spotlight.directive';
import { MagneticDirective } from '../../shared/directives/magnetic.directive';
import { ToastComponent } from '../../shared/components/toast/toast';

interface SidebarLink {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-shell-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, IconComponent, SpotlightDirective, MagneticDirective, ToastComponent],
  template: `
    <div class="shell-root">
      <!-- Sidebar Panel -->
      <aside class="shell-sidebar glass-strong">
        <!-- Header / Logo -->
        <div class="sidebar-header">
          <a routerLink="/" class="logo-wrap">
            <div class="logo-icon">
              <app-icon name="key-round" class="size-4.5 text-white" />
            </div>
            <span class="logo-text">ACKLET</span>
          </a>
          <span class="badge badge-accent text-xxs">WORKSPACE</span>
        </div>

        <!-- Sidebar Navigation Menu -->
        <nav class="sidebar-nav">
          @for (link of navLinks; track link.path) {
            <a [routerLink]="link.path" routerLinkActive="active-item" [routerLinkActiveOptions]="{exact: link.path === '/workspace'}" class="nav-item">
              <app-icon [name]="link.icon" class="item-icon size-4.5" />
              <span class="item-label">{{ link.label }}</span>
            </a>
          }
        </nav>

        <!-- Sidebar Footer (Profile / Logout) -->
        <div class="sidebar-footer">
          <a routerLink="/workspace/profile" class="profile-card">
            <div class="profile-avatar">U</div>
            <div class="profile-meta hide-mobile">
              <div class="profile-name">User Account</div>
              <div class="profile-role">Pro Developer</div>
            </div>
          </a>
          <a routerLink="/" class="btn-logout" aria-label="Sign out">
            <app-icon name="log-out" class="size-4.5" />
          </a>
        </div>
      </aside>

      <!-- Main workspace canvas -->
      <main class="shell-main">
        <div class="main-inner">
          <router-outlet />
        </div>
      </main>

      <app-toast />
    </div>
  `,
  styles: [`
    .shell-root {
      display: flex;
      min-height: 100vh;
      background: var(--color-surface-950);
      color: var(--color-neutral-200);
      overflow-x: hidden;
    }

    /* Sidebar styles */
    .shell-sidebar {
      width: 250px;
      height: 100vh;
      position: sticky;
      top: 0;
      left: 0;
      border-right: 1px solid rgba(0, 0, 0, 0.06);
      display: flex;
      flex-direction: column;
      padding: 1.5rem;
      z-index: 10;
      flex-shrink: 0;
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 2.5rem;
    }

    /* Logo wrap */
    .logo-wrap {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      text-decoration: none;
    }
    .logo-icon {
      width: 28px;
      height: 28px;
      border-radius: var(--radius-md);
      background: var(--color-brand-800);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo-text {
      font-family: var(--font-decorative);
      font-size: 1.1rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      color: var(--color-neutral-100);
    }
    .text-xxs {
      font-size: 0.65rem;
      padding: 0.1rem 0.4rem;
    }

    /* Nav Links */
    .sidebar-nav {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      flex: 1;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 0.875rem;
      border-radius: var(--radius-md);
      color: var(--color-neutral-400);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.2s ease;
    }
    .nav-item:hover {
      color: var(--color-neutral-100);
      background: rgba(0, 0, 0, 0.03);
    }
    .active-item {
      color: var(--color-brand-800) !important;
      background: rgba(15, 23, 42, 0.04);
      font-weight: 600;
    }
    .item-icon {
      color: currentColor;
    }

    /* Footer Card */
    .sidebar-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid rgba(0, 0, 0, 0.06);
      padding-top: 1.25rem;
      margin-top: auto;
    }
    .profile-card {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      text-decoration: none;
      color: inherit;
    }
    .profile-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--color-brand-800), var(--color-accent-500));
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      font-weight: 700;
    }
    .profile-name {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--color-neutral-100);
    }
    .profile-role {
      font-size: 0.7rem;
      color: var(--color-neutral-500);
    }

    .btn-logout {
      color: var(--color-neutral-400);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      transition: all 0.2s;
    }
    .btn-logout:hover {
      color: var(--color-feedback-error);
      background: var(--color-feedback-error-muted);
    }

    /* Main canvas styling */
    .shell-main {
      flex: 1;
      height: 100vh;
      overflow-y: auto;
      background: var(--color-surface-950);
    }
    .main-inner {
      padding: 3rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    @media (max-width: 768px) {
      .shell-sidebar {
        width: 72px;
        padding: 1rem 0.5rem;
        align-items: center;
      }
      .logo-text, .item-label, .profile-meta, .text-xxs {
        display: none !important;
      }
      .sidebar-header {
        justify-content: center;
        margin-bottom: 2rem;
      }
      .logo-wrap {
        justify-content: center;
      }
      .nav-item {
        justify-content: center;
        padding: 0.75rem;
      }
      .sidebar-footer {
        flex-direction: column;
        gap: 1rem;
        align-items: center;
        padding-top: 1rem;
      }
      .main-inner {
        padding: 1.5rem;
      }
    }
  `],
})
export class ShellLayoutComponent {
  readonly navLinks: SidebarLink[] = [
    { label: 'Dashboard', path: '/workspace', icon: 'layout' },
    { label: 'Favorites', path: '/workspace/favorites', icon: 'star' },
    { label: 'History', path: '/workspace/history', icon: 'clock' },
    { label: 'Collections', path: '/workspace/collections', icon: 'folder' },
    { label: 'Notifications', path: '/workspace/notifications', icon: 'bell' },
    { label: 'Settings', path: '/workspace/settings', icon: 'settings' },
  ];
}

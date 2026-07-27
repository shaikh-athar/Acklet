// client/src/app/layout/shell/shell.ts
import { Component, signal, inject, computed, HostListener, ElementRef } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../shared/components/icon/icon';
import { MagneticDirective } from '../../shared/directives/magnetic.directive';
import { ToastComponent } from '../../shared/components/toast/toast';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';

interface SidebarLink {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-shell-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, IconComponent, MagneticDirective, ToastComponent],
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
          <span class="badge badge-accent text-xxs hide-mobile">WORKSPACE</span>
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

        <!-- Sidebar Footer (Profile) -->
        <div class="sidebar-footer">
          <a routerLink="/workspace/profile" class="profile-card">
            @if (currentUser()?.avatarUrl) {
              <img [src]="currentUser()!.avatarUrl" [alt]="currentUser()!.displayName" class="profile-avatar-img" referrerpolicy="no-referrer" />
            } @else {
              <div class="profile-avatar">{{ userInitial() }}</div>
            }
            <div class="profile-meta hide-mobile">
              <div class="profile-name">{{ currentUser()?.displayName || 'Account' }}</div>
              <div class="profile-role">{{ currentUser()?.role || 'Member' }}</div>
            </div>
          </a>
          <button class="btn-logout" (click)="logout()" aria-label="Sign out">
            <app-icon name="log-out" class="size-4.5" />
          </button>
        </div>
      </aside>

      <!-- Main workspace canvas -->
      <div class="shell-content">

        <!-- ── Workspace Topbar ── -->
        <header class="workspace-topbar">
          <div class="topbar-left">
            <!-- Page title slot (filled by page title via signal or just empty) -->
            <div class="topbar-breadcrumb">
              <span class="topbar-workspace-label">Workspace</span>
            </div>
          </div>

          <div class="topbar-right">
            <!-- Theme Toggle -->
            <button class="topbar-icon-btn" (click)="themeSvc.toggle()" aria-label="Toggle theme">
              @if (themeSvc.theme() === 'dark') {
                <app-icon name="sun" class="size-4" />
              } @else {
                <app-icon name="moon" class="size-4" />
              }
            </button>

            <!-- Notifications -->
            <a routerLink="/workspace/notifications" class="topbar-icon-btn" aria-label="Notifications">
              <app-icon name="bell" class="size-4" />
            </a>

            <!-- User Profile Pill -->
            <div class="topbar-user-wrap" [class.open]="userDropOpen()" #dropRef>
              <button class="topbar-user-pill" appMagnetic [appMagnetic]="0.65" (click)="toggleDrop()" aria-label="Account menu">
                @if (currentUser()?.avatarUrl) {
                  <img [src]="currentUser()!.avatarUrl" [alt]="currentUser()!.displayName" class="pill-avatar" referrerpolicy="no-referrer" />
                } @else {
                  <div class="pill-avatar pill-avatar-fallback">{{ userInitial() }}</div>
                }
                <span class="pill-name">{{ currentUser()?.displayName || 'Account' }}</span>
                <app-icon name="chevron-down" class="size-3 pill-chevron" />
              </button>

              <!-- Dropdown -->
              <div class="topbar-user-dropdown">
                <!-- Header -->
                <div class="tud-header">
                  @if (currentUser()?.avatarUrl) {
                    <img [src]="currentUser()!.avatarUrl" class="tud-avatar" referrerpolicy="no-referrer" alt="avatar" />
                  } @else {
                    <div class="tud-avatar tud-avatar-fallback">{{ userInitial() }}</div>
                  }
                  <div class="tud-info">
                    <div class="tud-name">{{ currentUser()?.displayName || 'Account' }}</div>
                    <div class="tud-email">{{ currentUser()?.email }}</div>
                  </div>
                </div>

                <div class="tud-divider"></div>

                <a routerLink="/workspace" class="tud-item" (click)="closeDrop()">
                  <app-icon name="layout-dashboard" class="size-4" />
                  <span>Dashboard</span>
                </a>
                <a routerLink="/workspace/profile" class="tud-item" (click)="closeDrop()">
                  <app-icon name="user" class="size-4" />
                  <span>Profile</span>
                </a>
                <a routerLink="/workspace/settings" class="tud-item" (click)="closeDrop()">
                  <app-icon name="settings" class="size-4" />
                  <span>Settings</span>
                </a>

                <div class="tud-divider"></div>

                <!-- Theme Toggle Row -->
                <div class="tud-item tud-theme-row" (click)="themeSvc.toggle()">
                  @if (themeSvc.theme() === 'dark') {
                    <app-icon name="sun" class="size-4" />
                    <span>Switch to Light</span>
                  } @else {
                    <app-icon name="moon" class="size-4" />
                    <span>Switch to Dark</span>
                  }
                  <span class="tud-theme-badge" [class.is-dark]="themeSvc.theme() === 'dark'">
                    {{ themeSvc.theme() === 'dark' ? 'Dark' : 'Light' }}
                  </span>
                </div>

                <div class="tud-divider"></div>

                <button class="tud-item tud-logout" (click)="logout()">
                  <app-icon name="log-out" class="size-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <!-- Page content -->
        <main class="shell-main">
          <div class="main-inner">
            <router-outlet />
          </div>
        </main>
      </div>

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

    /* ── Sidebar ── */
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

    .logo-wrap {
      display: flex; align-items: center; gap: 0.5rem; text-decoration: none;
    }
    .logo-icon {
      width: 28px; height: 28px; border-radius: var(--radius-md);
      background: var(--color-brand-800);
      display: flex; align-items: center; justify-content: center;
    }
    .logo-text {
      font-family: var(--font-decorative);
      font-size: 1.1rem; font-weight: 600; letter-spacing: 0.05em;
      color: var(--color-neutral-100);
    }
    .text-xxs { font-size: 0.65rem; padding: 0.1rem 0.4rem; }

    /* Nav Links */
    .sidebar-nav { display: flex; flex-direction: column; gap: 0.25rem; flex: 1; }
    .nav-item {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.625rem 0.875rem; border-radius: var(--radius-md);
      color: var(--color-neutral-400); text-decoration: none;
      font-size: 0.875rem; font-weight: 500; transition: all 0.2s ease;
    }
    .nav-item:hover { color: var(--color-neutral-100); background: rgba(0,0,0,0.03); }
    .active-item { color: var(--color-brand-800) !important; background: rgba(15,23,42,0.04); font-weight: 600; }
    .item-icon { color: currentColor; }

    /* Sidebar footer */
    .sidebar-footer {
      display: flex; align-items: center; justify-content: space-between;
      border-top: 1px solid rgba(0,0,0,0.06);
      padding-top: 1.25rem; margin-top: auto;
    }
    .profile-card { display: flex; align-items: center; gap: 0.625rem; text-decoration: none; color: inherit; }
    .profile-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: linear-gradient(135deg, var(--color-brand-800), var(--color-accent-500));
      color: white; display: flex; align-items: center; justify-content: center;
      font-size: 0.8rem; font-weight: 700; flex-shrink: 0;
    }
    .profile-avatar-img { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
    .profile-name { font-size: 0.8rem; font-weight: 600; color: var(--color-neutral-100); }
    .profile-role { font-size: 0.7rem; color: var(--color-neutral-500); }
    .btn-logout {
      color: var(--color-neutral-400); display: flex; align-items: center;
      justify-content: center; width: 32px; height: 32px; border-radius: 50%;
      transition: all 0.2s; background: none; border: none; cursor: pointer;
    }
    .btn-logout:hover { color: var(--color-feedback-error); background: var(--color-feedback-error-muted); }

    /* ── Content column (topbar + main) ── */
    .shell-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      overflow: hidden;
    }

    /* ── Workspace Topbar ── */
    .workspace-topbar {
      height: 56px;
      border-bottom: 1px solid var(--border-soft);
      background: color-mix(in srgb, var(--color-surface-950) 80%, transparent);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.75rem;
      position: sticky;
      top: 0;
      z-index: 20;
      flex-shrink: 0;
    }

    .topbar-left { display: flex; align-items: center; gap: 0.75rem; }
    .topbar-workspace-label {
      font-size: 0.8rem; font-weight: 600; color: var(--color-neutral-500);
      text-transform: uppercase; letter-spacing: 0.06em;
    }

    .topbar-right { display: flex; align-items: center; gap: 0.375rem; }

    .topbar-icon-btn {
      width: 34px; height: 34px; border-radius: var(--radius-full);
      display: flex; align-items: center; justify-content: center;
      background: none; border: none; cursor: pointer;
      color: var(--color-neutral-400); transition: all 0.2s ease;
      text-decoration: none;
    }
    .topbar-icon-btn:hover { background: var(--color-surface-800); color: var(--color-neutral-100); }

    /* ── Topbar User Pill ── */
    .topbar-user-wrap { position: relative; }
    .topbar-user-pill {
      display: flex; align-items: center; gap: 0.45rem;
      padding: 0.2rem 0.6rem 0.2rem 0.2rem;
      border-radius: var(--radius-full);
      border: 1px solid var(--border-soft);
      background: var(--color-surface-900);
      cursor: pointer; transition: all 0.2s ease;
      font-family: inherit; outline: none;
      margin-left: 0.25rem;
    }
    .topbar-user-pill:hover,
    .topbar-user-wrap.open .topbar-user-pill {
      background: var(--color-surface-800);
      border-color: var(--border-medium);
    }

    .pill-avatar {
      width: 26px; height: 26px; border-radius: 50%;
      object-fit: cover; flex-shrink: 0;
    }
    .pill-avatar-fallback {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex; align-items: center; justify-content: center;
      font-size: 0.7rem; font-weight: 700; color: white;
    }
    .pill-name {
      font-size: 0.78rem; font-weight: 600;
      color: var(--color-neutral-200);
      max-width: 100px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .pill-chevron {
      color: var(--color-neutral-400);
      transition: transform 0.2s ease;
      flex-shrink: 0;
    }
    .topbar-user-wrap.open .pill-chevron { transform: rotate(180deg); }

    /* ── Topbar Dropdown ── */
    .topbar-user-dropdown {
      position: absolute; top: calc(100% + 0.5rem); right: 0;
      width: 240px; padding: 0.5rem;
      border-radius: var(--radius-xl);
      border: 1px solid var(--border-soft);
      background: color-mix(in srgb, var(--color-surface-900) 97%, transparent);
      backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
      box-shadow: 0 20px 40px rgba(0,0,0,0.18);
      opacity: 0; pointer-events: none;
      transform: translateY(6px);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 200;
    }
    .topbar-user-wrap.open .topbar-user-dropdown {
      opacity: 1; pointer-events: auto; transform: translateY(0);
    }

    .tud-header { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 0.5rem; }
    .tud-avatar {
      width: 38px; height: 38px; border-radius: 50%;
      object-fit: cover; flex-shrink: 0;
    }
    .tud-avatar-fallback {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex; align-items: center; justify-content: center;
      font-size: 1rem; font-weight: 700; color: white;
    }
    .tud-info { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
    .tud-name { font-size: 0.85rem; font-weight: 700; color: var(--color-neutral-50); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tud-email { font-size: 0.7rem; color: var(--color-neutral-500); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .tud-divider { height: 1px; background: var(--border-soft); margin: 0.25rem 0; }

    .tud-item {
      display: flex; align-items: center; gap: 0.625rem;
      padding: 0.55rem 0.625rem; border-radius: var(--radius-lg);
      font-size: 0.825rem; font-weight: 500;
      color: var(--color-neutral-300);
      text-decoration: none; cursor: pointer;
      transition: all 0.15s ease;
      background: none; border: none; font-family: inherit;
      width: 100%; text-align: left;
    }
    .tud-item:hover { background: var(--color-surface-800); color: var(--color-neutral-50); }
    .tud-theme-row { user-select: none; }
    .tud-theme-badge {
      margin-left: auto; font-size: 0.65rem; font-weight: 700;
      padding: 0.15rem 0.5rem; border-radius: 99px;
      background: var(--color-surface-700); color: var(--color-neutral-400);
    }
    .tud-theme-badge.is-dark { background: rgba(99,102,241,0.15); color: #818cf8; }
    .tud-logout { color: #ef4444; }
    .tud-logout:hover { background: rgba(239,68,68,0.08); color: #ef4444; }

    /* ── Main canvas ── */
    .shell-main { flex: 1; overflow-y: auto; background: var(--color-surface-950); }
    .main-inner { padding: 2.5rem 3rem; max-width: 1200px; margin: 0 auto; }

    @media (max-width: 768px) {
      .shell-sidebar { width: 72px; padding: 1rem 0.5rem; align-items: center; }
      .logo-text, .item-label, .profile-meta, .text-xxs, .hide-mobile { display: none !important; }
      .sidebar-header { justify-content: center; margin-bottom: 2rem; }
      .logo-wrap { justify-content: center; }
      .nav-item { justify-content: center; padding: 0.75rem; }
      .sidebar-footer { flex-direction: column; gap: 1rem; align-items: center; padding-top: 1rem; }
      .main-inner { padding: 1.5rem; }
      .pill-name { display: none; }
    }
  `],
})
export class ShellLayoutComponent {
  private readonly authSvc = inject(AuthService);
  readonly themeSvc = inject(ThemeService);
  private readonly elRef = inject(ElementRef);

  readonly currentUser = this.authSvc.currentUser;
  readonly userInitial = computed(() => (this.authSvc.currentUser()?.displayName ?? '').charAt(0).toUpperCase() || '?');
  readonly userDropOpen = signal(false);

  toggleDrop(): void { this.userDropOpen.update(v => !v); }
  closeDrop(): void { this.userDropOpen.set(false); }

  logout(): void {
    console.log('[Acklet Shell] User clicked sign out.');
    this.userDropOpen.set(false);
    this.authSvc.logout();
  }

  @HostListener('document:click', ['$event'])
  onOutsideClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.querySelector('.topbar-user-wrap')?.contains(event.target)) {
      this.userDropOpen.set(false);
    }
  }

  readonly navLinks: SidebarLink[] = [
    { label: 'Dashboard', path: '/workspace', icon: 'layout' },
    { label: 'Favorites', path: '/workspace/favorites', icon: 'star' },
    { label: 'History', path: '/workspace/history', icon: 'clock' },
    { label: 'Collections', path: '/workspace/collections', icon: 'folder' },
    { label: 'Notifications', path: '/workspace/notifications', icon: 'bell' },
    { label: 'Publisher Workspace', path: '/workspace/publisher', icon: 'box' },
    { label: 'Admin Workspace', path: '/workspace/admin', icon: 'shield' },
    { label: 'Settings', path: '/workspace/settings', icon: 'settings' },
  ];
}

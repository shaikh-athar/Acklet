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
    <div class="shell-root bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
      <!-- Sidebar Panel -->
      <aside class="shell-sidebar bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-white/10 shadow-sm">
        <!-- Header / Logo -->
        <div class="sidebar-header">
          <a routerLink="/" class="logo-wrap">
            <div class="logo-icon bg-cyan-600 dark:bg-cyan-500 shadow-md">
              <app-icon name="key-round" class="size-4.5 text-white" />
            </div>
            <span class="logo-text text-slate-900 dark:text-white">ACKLET</span>
          </a>
          <span class="px-2 py-0.5 text-xxs font-bold rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 hide-mobile">WORKSPACE</span>
        </div>

        <!-- Sidebar Navigation Menu -->
        <nav class="sidebar-nav space-y-1">
          @for (link of navLinks; track link.path) {
            <a [routerLink]="link.path" routerLinkActive="active-item" [routerLinkActiveOptions]="{exact: link.path === '/workspace'}" class="nav-item">
              <app-icon [name]="link.icon" class="item-icon size-4.5" />
              <span class="item-label">{{ link.label }}</span>
            </a>
          }
        </nav>

        <!-- Sidebar Footer (Profile) -->
        <div class="sidebar-footer border-t border-slate-200 dark:border-white/10">
          <a routerLink="/workspace/profile" class="profile-card">
            @if (currentUser()?.avatarUrl) {
              <img [src]="currentUser()!.avatarUrl" [alt]="currentUser()!.displayName" class="profile-avatar-img" referrerpolicy="no-referrer" />
            } @else {
              <div class="profile-avatar">{{ userInitial() }}</div>
            }
            <div class="profile-meta hide-mobile">
              <div class="profile-name text-slate-900 dark:text-white">{{ currentUser()?.displayName || 'Account' }}</div>
              <div class="profile-role text-slate-500 dark:text-slate-400">{{ currentUser()?.role || 'Member' }}</div>
            </div>
          </a>
          <button class="btn-logout" (click)="logout()" aria-label="Sign out" title="Sign Out">
            <app-icon name="log-out" class="size-4.5" />
          </button>
        </div>
      </aside>

      <!-- Main workspace canvas -->
      <div class="shell-content">

        <!-- ── Fixed Workspace Topbar ── -->
        <header class="workspace-topbar bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-white/10 shadow-sm backdrop-blur-md">
          <div class="topbar-left">
            <div class="topbar-breadcrumb">
              <span class="topbar-workspace-label text-slate-500 dark:text-slate-400">Workspace</span>
            </div>
          </div>

          <div class="topbar-right">
            <!-- Theme Toggle -->
            <button class="topbar-icon-btn text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10" (click)="themeSvc.toggle()" aria-label="Toggle theme">
              @if (themeSvc.theme() === 'dark') {
                <app-icon name="sun" class="size-4 text-amber-400" />
              } @else {
                <app-icon name="moon" class="size-4 text-slate-700" />
              }
            </button>

            <!-- Notifications -->
            <a routerLink="/workspace/notifications" class="topbar-icon-btn text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Notifications">
              <app-icon name="bell" class="size-4" />
            </a>

            <!-- User Profile Pill -->
            <div class="topbar-user-wrap" [class.open]="userDropOpen()" #dropRef>
              <button class="topbar-user-pill border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white" (click)="toggleDrop()" aria-label="Account menu">
                @if (currentUser()?.avatarUrl) {
                  <img [src]="currentUser()!.avatarUrl" [alt]="currentUser()!.displayName" class="pill-avatar" referrerpolicy="no-referrer" />
                } @else {
                  <div class="pill-avatar pill-avatar-fallback">{{ userInitial() }}</div>
                }
                <span class="pill-name">{{ currentUser()?.displayName || 'Account' }}</span>
                <app-icon name="chevron-down" class="size-3 pill-chevron text-slate-400" />
              </button>

              <!-- Dropdown -->
              <div class="topbar-user-dropdown bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-xl">
                <!-- Header -->
                <div class="tud-header">
                  @if (currentUser()?.avatarUrl) {
                    <img [src]="currentUser()!.avatarUrl" class="tud-avatar" referrerpolicy="no-referrer" alt="avatar" />
                  } @else {
                    <div class="tud-avatar tud-avatar-fallback">{{ userInitial() }}</div>
                  }
                  <div class="tud-info">
                    <div class="tud-name text-slate-900 dark:text-white">{{ currentUser()?.displayName || 'Account' }}</div>
                    <div class="tud-email text-slate-500 dark:text-slate-400">{{ currentUser()?.email }}</div>
                  </div>
                </div>

                <div class="tud-divider bg-slate-200 dark:bg-white/10"></div>

                <a routerLink="/workspace" class="tud-item text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10" (click)="closeDrop()">
                  <app-icon name="layout-dashboard" class="size-4" />
                  <span>Dashboard</span>
                </a>
                <a routerLink="/workspace/profile" class="tud-item text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10" (click)="closeDrop()">
                  <app-icon name="user" class="size-4" />
                  <span>Profile</span>
                </a>
                <a routerLink="/workspace/settings" class="tud-item text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10" (click)="closeDrop()">
                  <app-icon name="settings" class="size-4" />
                  <span>Settings</span>
                </a>

                <div class="tud-divider bg-slate-200 dark:bg-white/10"></div>

                <!-- Theme Toggle Row -->
                <div class="tud-item tud-theme-row text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10" (click)="themeSvc.toggle()">
                  @if (themeSvc.theme() === 'dark') {
                    <app-icon name="sun" class="size-4 text-amber-400" />
                    <span>Switch to Light</span>
                  } @else {
                    <app-icon name="moon" class="size-4 text-slate-700" />
                    <span>Switch to Dark</span>
                  }
                  <span class="tud-theme-badge" [class.is-dark]="themeSvc.theme() === 'dark'">
                    {{ themeSvc.theme() === 'dark' ? 'Dark' : 'Light' }}
                  </span>
                </div>

                <div class="tud-divider bg-slate-200 dark:bg-white/10"></div>

                <button class="tud-item tud-logout text-rose-600 dark:text-rose-400 hover:bg-rose-500/10" (click)="logout()">
                  <app-icon name="log-out" class="size-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <!-- Page content -->
        <main class="shell-main flex-1 overflow-y-auto">
          <div class="main-inner p-6 sm:p-8 max-w-7xl mx-auto">
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
      height: 100vh;
      width: 100vw;
      overflow: hidden;
    }

    /* ── Sidebar ── */
    .shell-sidebar {
      width: 250px;
      height: 100vh;
      position: fixed;
      top: 0;
      left: 0;
      display: flex;
      flex-direction: column;
      padding: 1.25rem 1rem;
      z-index: 40;
      flex-shrink: 0;
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 2rem;
      padding: 0 0.5rem;
    }

    .logo-wrap {
      display: flex; align-items: center; gap: 0.5rem; text-decoration: none;
    }
    .logo-icon {
      width: 32px; height: 32px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
    }
    .logo-text {
      font-size: 1.15rem; font-weight: 800; letter-spacing: 0.05em;
    }
    .text-xxs { font-size: 0.65rem; padding: 0.15rem 0.45rem; }

    /* Nav Links */
    .sidebar-nav { display: flex; flex-direction: column; gap: 0.25rem; flex: 1; }
    .nav-item {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.65rem 0.875rem; border-radius: 12px;
      text-decoration: none;
      font-size: 0.875rem; font-weight: 600; transition: all 0.2s ease;
      color: #64748b;
    }
    :host-context(.dark) .nav-item { color: #94a3b8; }

    .nav-item:hover { color: #0284c7; background: rgba(2, 132, 199, 0.08); }
    :host-context(.dark) .nav-item:hover { color: #38bdf8; background: rgba(56, 189, 248, 0.1); }

    .active-item {
      color: #0284c7 !important;
      background: rgba(2, 132, 199, 0.12) !important;
      font-weight: 700;
    }
    :host-context(.dark) .active-item {
      color: #38bdf8 !important;
      background: rgba(56, 189, 248, 0.15) !important;
    }

    /* Sidebar footer */
    .sidebar-footer {
      display: flex; align-items: center; justify-content: space-between;
      padding-top: 1rem; margin-top: auto;
    }
    .profile-card { display: flex; align-items: center; gap: 0.625rem; text-decoration: none; color: inherit; }
    .profile-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: linear-gradient(135deg, #0284c7, #6366f1);
      color: white; display: flex; align-items: center; justify-content: center;
      font-size: 0.8rem; font-weight: 700; flex-shrink: 0;
    }
    .profile-avatar-img { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
    .profile-name { font-size: 0.8rem; font-weight: 700; }
    .profile-role { font-size: 0.7rem; }
    .btn-logout {
      display: flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; border-radius: 50%;
      transition: all 0.2s; background: none; border: none; cursor: pointer;
      color: #94a3b8;
    }
    .btn-logout:hover { color: #ef4444; background: rgba(239, 68, 68, 0.1); }

    /* ── Content column (fixed topbar + main) ── */
    .shell-content {
      margin-left: 250px;
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: calc(100vw - 250px);
      overflow: hidden;
    }

    /* ── Fixed Workspace Topbar ── */
    .workspace-topbar {
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 2rem;
      position: fixed;
      top: 0;
      right: 0;
      left: 250px;
      z-index: 50;
    }

    .topbar-left { display: flex; align-items: center; gap: 0.75rem; }
    .topbar-workspace-label {
      font-size: 0.75rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.08em;
    }

    .topbar-right { display: flex; align-items: center; gap: 0.5rem; }

    .topbar-icon-btn {
      width: 36px; height: 36px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: none; border: none; cursor: pointer;
      transition: all 0.2s ease; text-decoration: none;
    }

    /* ── Topbar User Pill ── */
    .topbar-user-wrap { position: relative; }
    .topbar-user-pill {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.25rem 0.75rem 0.25rem 0.25rem;
      border-radius: 99px; cursor: pointer; transition: all 0.2s ease;
      font-family: inherit; outline: none;
    }

    .pill-avatar { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
    .pill-avatar-fallback {
      background: linear-gradient(135deg, #0284c7, #6366f1);
      display: flex; align-items: center; justify-content: center;
      font-size: 0.75rem; font-weight: 700; color: white;
    }
    .pill-name { font-size: 0.8rem; font-weight: 700; max-width: 110px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* ── Topbar Dropdown ── */
    .topbar-user-dropdown {
      position: absolute; top: calc(100% + 0.5rem); right: 0;
      width: 240px; padding: 0.5rem; border-radius: 16px;
      opacity: 0; pointer-events: none; transform: translateY(6px);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); z-index: 200;
    }
    .topbar-user-wrap.open .topbar-user-dropdown { opacity: 1; pointer-events: auto; transform: translateY(0); }

    .tud-header { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 0.5rem; }
    .tud-avatar { width: 38px; height: 38px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
    .tud-avatar-fallback {
      background: linear-gradient(135deg, #0284c7, #6366f1);
      display: flex; align-items: center; justify-content: center;
      font-size: 1rem; font-weight: 700; color: white;
    }
    .tud-info { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
    .tud-name { font-size: 0.85rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tud-email { font-size: 0.7rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .tud-divider { height: 1px; margin: 0.25rem 0; }

    .tud-item {
      display: flex; align-items: center; gap: 0.625rem;
      padding: 0.55rem 0.625rem; border-radius: 10px;
      font-size: 0.825rem; font-weight: 600; text-decoration: none; cursor: pointer;
      transition: all 0.15s ease; background: none; border: none; font-family: inherit;
      width: 100%; text-align: left;
    }
    .tud-theme-row { user-select: none; }
    .tud-theme-badge {
      margin-left: auto; font-size: 0.65rem; font-weight: 700;
      padding: 0.15rem 0.5rem; border-radius: 99px;
      background: rgba(148, 163, 184, 0.2); color: #64748b;
    }
    .tud-theme-badge.is-dark { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }

    /* ── Main canvas ── */
    .shell-main {
      margin-top: 60px;
      height: calc(100vh - 60px);
      overflow-y: auto;
      flex: 1;
    }

    @media (max-width: 768px) {
      .shell-sidebar { width: 72px; padding: 1rem 0.5rem; align-items: center; }
      .logo-text, .item-label, .profile-meta, .text-xxs, .hide-mobile { display: none !important; }
      .sidebar-header { justify-content: center; margin-bottom: 2rem; }
      .logo-wrap { justify-content: center; }
      .nav-item { justify-content: center; padding: 0.75rem; }
      .sidebar-footer { flex-direction: column; gap: 1rem; align-items: center; padding-top: 1rem; }
      .shell-content { margin-left: 72px; width: calc(100vw - 72px); }
      .workspace-topbar { left: 72px; padding: 0 1rem; }
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

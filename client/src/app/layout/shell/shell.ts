import { Component, signal, inject, computed, HostListener, ElementRef } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../shared/components/icon/icon';
import { MagneticDirective } from '../../shared/directives/magnetic.directive';
import { ToastComponent } from '../../shared/components/toast/toast';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { FormsModule } from '@angular/forms';
import { WorkspaceStateService } from '../../core/services/workspace-state.service';
import { ToastService } from '../../core/services/toast.service';

interface SidebarLink {
  label: string;
  path: string;
  icon: string;
  badge?: string;
  roleRequired?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-shell-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    CommonModule,
    IconComponent,
    MagneticDirective,
    ToastComponent,
    FormsModule,
  ],
  template: `
    <div class="ws-container">
      <!-- Sidebar Panel -->
      <aside class="ws-sidebar" [class.collapsed]="sidebarCollapsed()">
        <!-- Workspace Switcher Header -->
        <div class="ws-sidebar-header">
          <div class="ws-switcher-wrap">
            <button (click)="toggleWsDrop()" class="ws-switcher-btn">
              <div class="ws-avatar-mini">
                {{ (activeWorkspace() || 'A')[0].toUpperCase() }}
              </div>
              <span class="ws-switcher-name" *ngIf="!sidebarCollapsed()">
                {{ activeWorkspace() }}
              </span>
              <span class="ws-switcher-arrow" *ngIf="!sidebarCollapsed()">↕</span>
            </button>

            <!-- Dropdown -->
            <div *ngIf="wsDropOpen()" class="ws-dropdown-menu">
              <div class="ws-dropdown-label">Workspaces</div>
              <button (click)="selectWorkspace('Personal Workspace')" class="ws-dropdown-item">
                <span class="ws-dropdown-name">Personal Workspace</span>
                <span class="ws-dropdown-badge hobby">Hobby</span>
              </button>
              <button (click)="selectWorkspace('Acklet Engineering')" class="ws-dropdown-item">
                <span class="ws-dropdown-name">Acklet Engineering</span>
                <span class="ws-dropdown-badge pro">Pro</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Navigation Menu -->
        <nav class="ws-nav">
          @for (link of mainNavLinks; track link.path) {
            @if (link.disabled) {
              <div class="ws-nav-link ws-nav-disabled">
                <app-icon [name]="link.icon" class="ws-nav-icon" />
                <span *ngIf="!sidebarCollapsed()" class="ws-nav-label">{{ link.label }}</span>
                <span *ngIf="!sidebarCollapsed()" class="ws-nav-soon">Soon</span>
              </div>
            } @else {
              <a
                [routerLink]="link.path"
                routerLinkActive="active-item"
                [routerLinkActiveOptions]="{ exact: link.path === '/workspace' }"
                class="ws-nav-link"
              >
                <app-icon [name]="link.icon" class="ws-nav-icon" />
                <span *ngIf="!sidebarCollapsed()" class="ws-nav-label">{{ link.label }}</span>
                <span *ngIf="link.badge && !sidebarCollapsed()" class="ws-nav-badge">
                  {{ link.badge }}
                </span>
              </a>
            }
          }

          <div class="ws-nav-divider" *ngIf="!sidebarCollapsed()"></div>
          <div class="ws-nav-section-title" *ngIf="!sidebarCollapsed()">Publisher & Admin</div>

          @for (link of roleNavLinks; track link.path) {
            <a [routerLink]="link.path" routerLinkActive="active-item" class="ws-nav-link">
              <app-icon [name]="link.icon" class="ws-nav-icon" />
              <span *ngIf="!sidebarCollapsed()" class="ws-nav-label">{{ link.label }}</span>
            </a>
          }
        </nav>

        <!-- Sidebar Footer -->
        <div class="ws-sidebar-footer">
          <a routerLink="/workspace/profile" class="ws-user-profile" *ngIf="!sidebarCollapsed()">
            <div class="ws-user-avatar">
              {{ userInitial() }}
            </div>
            <div class="ws-user-info">
              <div class="ws-user-name">{{ currentUser()?.displayName || 'Developer' }}</div>
            </div>
          </a>
          <button (click)="toggleSidebar()" class="ws-collapse-btn">
            <app-icon
              [name]="sidebarCollapsed() ? 'panel-left-open' : 'panel-left-close'"
              class="ws-collapse-icon"
            />
          </button>
        </div>
      </aside>

      <!-- Content Area -->
      <div class="ws-content-area">
        <!-- Top Navigation Bar -->
        <header class="ws-header">
          <div class="ws-breadcrumb">
            <a routerLink="/" class="ws-breadcrumb-link brand">Acklet</a>
            <span class="ws-breadcrumb-separator">/</span>
            <a routerLink="/workspace" class="ws-breadcrumb-link current">Workspace</a>
          </div>

          <!-- Command Palette Input trigger -->
          <div class="ws-search-bar-wrap">
            <button (click)="openCmdPalette()" class="ws-search-trigger">
              <div class="ws-search-left">
                <app-icon name="search" class="ws-search-icon" />
                <span>Search tools, repositories, AI jobs...</span>
              </div>
              <kbd class="ws-search-kbd">⌘K</kbd>
            </button>
          </div>

          <div class="ws-header-actions">
            <a
              routerLink="/workspace/notifications"
              class="ws-header-notification"
              title="Notifications"
            >
              <app-icon name="bell" class="ws-header-notification-icon" />
            </a>

            <!-- Import Dropdown Group -->
            <div class="ws-import-dropdown-container">
              <button (click)="toggleImportDrop()" class="ws-import-btn">
                <app-icon name="plus" class="ws-import-btn-icon" />
                <span>Import</span>
                <app-icon name="chevron-down" class="ws-import-btn-arrow" [strokeWidth]="3" />
              </button>

              <div *ngIf="importDropOpen()" class="ws-import-dropdown-menu">
                <a routerLink="/workspace/tools/import" (click)="importDropOpen.set(false)" class="ws-import-dropdown-item" style="text-decoration: none;">
                  <app-icon name="box" class="ws-import-item-icon blue" />
                  <div class="ws-import-item-text">
                    <span class="ws-import-item-title">Add Tool</span>
                    <span class="ws-import-item-desc">Import Git repository as a tool</span>
                  </div>
                </a>
                <a routerLink="/workspace/tools/import" (click)="importDropOpen.set(false)" class="ws-import-dropdown-item" style="text-decoration: none;">
                  <app-icon name="git-branch" class="ws-import-item-icon purple" />
                  <div class="ws-import-item-text">
                    <span class="ws-import-item-title">Connect Repo</span>
                    <span class="ws-import-item-desc">Link a Git repository</span>
                  </div>
                </a>
                <button (click)="triggerModal('create_collection')" class="ws-import-dropdown-item">
                  <app-icon name="folder" class="ws-import-item-icon green" />
                  <div class="ws-import-item-text">
                    <span class="ws-import-item-title">Create Collection</span>
                    <span class="ws-import-item-desc">Group tools in folder</span>
                  </div>
                </button>
              </div>
            </div>

            <button (click)="themeSvc.toggle()" class="ws-theme-toggle">
              <app-icon
                [name]="themeSvc.theme() === 'dark' ? 'sun' : 'moon'"
                class="ws-theme-toggle-icon"
              />
            </button>
          </div>
        </header>

        <!-- Command Palette Modal -->
        <div *ngIf="cmdPaletteOpen()" class="ws-modal-overlay" (click)="closeCmdPalette()">
          <div class="ws-modal-card" (click)="$event.stopPropagation()">
            <div class="ws-modal-search">
              <app-icon name="search" class="ws-modal-search-icon" />
              <input
                type="text"
                placeholder="Type to search projects, tools, docs..."
                class="ws-modal-input"
                autofocus
              />
              <kbd class="ws-modal-kbd">ESC</kbd>
            </div>
            <div class="ws-modal-results">
              <a
                routerLink="/workspace/projects"
                (click)="closeCmdPalette()"
                class="ws-modal-result-item"
              >
                <div class="ws-modal-item-left">
                  <app-icon name="folder-git-2" class="ws-modal-item-icon blue" />
                  <span class="ws-modal-item-title">Projects</span>
                </div>
                <span class="ws-modal-item-desc">View repositories</span>
              </a>
              <a
                routerLink="/workspace/ai-jobs"
                (click)="closeCmdPalette()"
                class="ws-modal-result-item"
              >
                <div class="ws-modal-item-left">
                  <app-icon name="sparkles" class="ws-modal-item-icon purple" />
                  <span class="ws-modal-item-title">AI Jobs</span>
                </div>
                <span class="ws-modal-item-desc">View background tasks</span>
              </a>
            </div>
          </div>
        </div>



        <!-- Connect Repo Modal -->
        <div
          *ngIf="stateSvc.activeModal() === 'connect_repo'"
          class="ws-modal-overlay"
          (click)="stateSvc.closeModal()"
        >
          <div class="ws-modal-card custom-modal" (click)="$event.stopPropagation()">
            <div class="ws-modal-header">
              <h2 class="ws-modal-title">Connect Repository</h2>
              <button (click)="stateSvc.closeModal()" class="ws-modal-close-btn">&times;</button>
            </div>
            <div class="ws-modal-body">
              <div class="ws-form-group">
                <label>Repository Name (owner/repo) *</label>
                <input type="text" [(ngModel)]="newRepoName" placeholder="e.g. facebook/react" />
              </div>
              <div class="ws-form-row">
                <div class="ws-form-group">
                  <label>Git Provider</label>
                  <select [(ngModel)]="newRepoProvider">
                    <option value="github">GitHub</option>
                    <option value="gitlab">GitLab</option>
                    <option value="bitbucket">BitBucket</option>
                  </select>
                </div>
                <div class="ws-form-group">
                  <label>Default Branch</label>
                  <input type="text" [(ngModel)]="newRepoBranch" placeholder="e.g. main" />
                </div>
              </div>
              <div class="ws-form-row">
                <div class="ws-form-group">
                  <label>Visibility</label>
                  <select [(ngModel)]="newRepoVisibility">
                    <option value="Public">Public</option>
                    <option value="Private">Private</option>
                  </select>
                </div>
                <div class="ws-form-group">
                  <label>Language</label>
                  <input type="text" [(ngModel)]="newRepoLang" placeholder="e.g. TypeScript" />
                </div>
              </div>
            </div>
            <div class="ws-modal-footer">
              <button (click)="stateSvc.closeModal()" class="ws-btn-secondary">Cancel</button>
              <button
                (click)="submitConnectRepo()"
                class="ws-btn-primary"
                [disabled]="!newRepoName.trim()"
              >
                Connect
              </button>
            </div>
          </div>
        </div>

        <!-- Create Collection Modal -->
        <div
          *ngIf="stateSvc.activeModal() === 'create_collection'"
          class="ws-modal-overlay"
          (click)="stateSvc.closeModal()"
        >
          <div class="ws-modal-card custom-modal" (click)="$event.stopPropagation()">
            <div class="ws-modal-header">
              <h2 class="ws-modal-title">New Collection Folder</h2>
              <button (click)="stateSvc.closeModal()" class="ws-modal-close-btn">&times;</button>
            </div>
            <div class="ws-modal-body">
              <div class="ws-form-group">
                <label>Collection Name *</label>
                <input
                  type="text"
                  [(ngModel)]="newCollName"
                  placeholder="e.g. API Security Suite"
                />
              </div>
              <div class="ws-form-group">
                <label>Description</label>
                <textarea
                  [(ngModel)]="newCollDesc"
                  placeholder="Brief summary of tools grouped here"
                ></textarea>
              </div>
              <div class="ws-form-group">
                <label style="margin-bottom: 8px;">Folder Tag Color</label>
                <div style="display: flex; gap: 12px; align-items: center;">
                  @for (c of availableColors; track c) {
                    <button
                      (click)="newCollColor = c"
                      type="button"
                      class="color-picker-dot"
                      [style.background]="c"
                      [class.scale-125]="newCollColor === c"
                      style="width: 24px; height: 24px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: transform 0.15s;"
                    ></button>
                  }
                </div>
              </div>
            </div>
            <div class="ws-modal-footer">
              <button (click)="stateSvc.closeModal()" class="ws-btn-secondary">Cancel</button>
              <button
                (click)="submitCreateCollection()"
                class="ws-btn-primary"
                [disabled]="!newCollName.trim()"
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>

        <!-- Main Page Content -->
        <main class="ws-main">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      .ws-container {
        display: flex;
        width: 100vw;
        height: 100vh;
        overflow: hidden;
        background-color: var(--vercel-bg);
        color: var(--vercel-text-primary);
        font-family: var(--font-sans);
      }

      .ws-sidebar {
        display: flex;
        flex-direction: column;
        width: 240px;
        height: 100vh;
        flex-shrink: 0;
        background-color: var(--vercel-subtle-bg);
        border-right: 1px solid var(--vercel-border);
        transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .ws-sidebar.collapsed {
        width: 56px;
      }

      .ws-sidebar-header {
        height: 56px;
        display: flex;
        align-items: center;
        padding: 0 12px;
        border-bottom: 1px solid var(--vercel-border);
      }

      .ws-switcher-wrap {
        position: relative;
        width: 100%;
      }

      .ws-switcher-btn {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 6px;
        border-radius: 6px;
        background: transparent;
        border: none;
        text-align: left;
        cursor: pointer;
        color: var(--vercel-text-primary);
        transition: background 0.15s ease;
      }

      .ws-switcher-btn:hover {
        background: var(--surface-hover);
      }

      .ws-avatar-mini {
        width: 24px;
        height: 24px;
        border-radius: 4px;
        background: #000;
        color: #fff;
        font-weight: 700;
        font-size: 11px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      html[data-theme='dark'] .ws-avatar-mini {
        background: #fff;
        color: #000;
      }

      .ws-switcher-name {
        font-size: 13px;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex-grow: 1;
      }

      .ws-switcher-arrow {
        color: var(--vercel-text-muted);
        font-size: 12px;
      }

      .ws-dropdown-menu {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        margin-top: 4px;
        background: var(--vercel-card-bg);
        border: 1px solid var(--vercel-border);
        border-radius: 8px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
        padding: 6px;
        z-index: 50;
      }

      .ws-dropdown-label {
        padding: 4px 8px;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--vercel-text-muted);
        letter-spacing: 0.5px;
      }

      .ws-dropdown-item {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 8px;
        border-radius: 4px;
        border: none;
        background: transparent;
        cursor: pointer;
        font-size: 12px;
        color: var(--vercel-text-primary);
        text-align: left;
      }

      .ws-dropdown-item:hover {
        background: var(--surface-hover);
      }

      .ws-dropdown-badge {
        font-size: 9px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 99px;
      }

      .ws-dropdown-badge.hobby {
        background: rgba(100, 116, 139, 0.1);
        color: #64748b;
      }

      .ws-dropdown-badge.pro {
        background: rgba(6, 182, 212, 0.1);
        color: #06b6d4;
      }

      .ws-nav {
        flex: 1;
        padding: 12px 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        overflow-y: auto;
      }

      .ws-nav-link {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 12px;
        border-radius: 6px;
        text-decoration: none;
        color: var(--vercel-text-secondary);
        font-size: 13px;
        font-weight: 500;
        transition: all 0.15s ease;
      }

      .ws-nav-link:hover {
        color: var(--vercel-text-primary);
        background: var(--surface-hover);
      }

      .ws-nav-link.active-item {
        color: var(--vercel-text-primary);
        background: var(--color-surface-800);
        font-weight: 600;
      }

      .ws-nav-icon {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }

      .ws-nav-label {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex-grow: 1;
      }

      .ws-nav-badge {
        font-size: 9px;
        font-weight: 700;
        padding: 1px 6px;
        border-radius: 99px;
        background: rgba(6, 182, 212, 0.15);
        color: #0891b2;
      }

      .ws-nav-divider {
        height: 1px;
        background: var(--vercel-border);
        margin: 8px 0;
      }

      .ws-nav-disabled {
        opacity: 0.4;
        cursor: not-allowed;
        pointer-events: none;
      }

      .ws-nav-soon {
        font-size: 8px;
        font-weight: 700;
        padding: 1px 5px;
        border-radius: 99px;
        background: var(--vercel-border);
        color: var(--vercel-text-muted);
        letter-spacing: 0.04em;
        flex-shrink: 0;
      }

      .ws-nav-section-title {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--vercel-text-muted);
        padding: 4px 12px;
        letter-spacing: 0.5px;
      }

      .ws-sidebar-footer {
        padding: 12px;
        border-top: 1px solid var(--vercel-border);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .ws-user-profile {
        display: flex;
        align-items: center;
        gap: 8px;
        text-decoration: none;
        min-width: 0;
        flex-grow: 1;
      }

      .ws-user-avatar {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: var(--vercel-text-primary);
        color: var(--vercel-bg);
        font-weight: 700;
        font-size: 11px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .ws-user-info {
        min-width: 0;
      }

      .ws-user-name {
        font-size: 12px;
        font-weight: 600;
        color: var(--vercel-text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .ws-collapse-btn {
        background: transparent;
        border: none;
        padding: 6px;
        border-radius: 4px;
        color: var(--vercel-text-muted);
        cursor: pointer;
      }

      .ws-collapse-btn:hover {
        background: var(--surface-hover);
        color: var(--vercel-text-primary);
      }

      .ws-collapse-icon {
        width: 15px;
        height: 15px;
      }

      .ws-content-area {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        min-width: 0;
        height: 100vh;
        overflow-x: hidden;
      }

      .ws-header {
        height: 56px;
        background: var(--vercel-bg);
        border-bottom: 1px solid var(--vercel-border);
        padding: 0 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
      }

      .ws-breadcrumb {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
      }

      .ws-breadcrumb-link {
        text-decoration: none;
        font-size: 13px;
        font-weight: 500;
        color: var(--vercel-text-secondary);
        transition: color 0.15s ease;
      }

      .ws-breadcrumb-link:hover {
        color: var(--vercel-text-primary);
      }

      .ws-breadcrumb-link.brand {
        font-weight: 700;
        color: var(--vercel-text-primary);
      }

      .ws-breadcrumb-separator {
        color: var(--vercel-border);
      }

      .ws-search-bar-wrap {
        flex: 1;
        max-width: 420px;
        margin: 0 24px;
      }

      .ws-search-trigger {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 12px;
        border-radius: 6px;
        background: var(--vercel-subtle-bg);
        border: 1px solid var(--vercel-border);
        font-size: 12px;
        color: var(--vercel-text-muted);
        cursor: pointer;
        transition: border 0.15s ease;
      }

      .ws-search-trigger:hover {
        border-color: var(--vercel-text-muted);
      }

      .ws-search-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .ws-search-icon {
        width: 14px;
        height: 14px;
      }

      .ws-search-kbd {
        padding: 2px 6px;
        border-radius: 4px;
        background: var(--vercel-bg);
        border: 1px solid var(--vercel-border);
        font-size: 9px;
        font-weight: 600;
      }

      .ws-header-actions {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .ws-import-dropdown-container {
        position: relative;
      }

      .ws-import-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 6px;
        background: var(--vercel-text-primary);
        color: var(--vercel-bg);
        text-decoration: none;
        font-size: 12px;
        font-weight: 600;
        transition: opacity 0.15s ease;
        border: none;
        cursor: pointer;
      }

      .ws-import-btn:hover {
        opacity: 0.9;
      }

      .ws-import-btn-icon {
        width: 14px;
        height: 14px;
        font-weight: 800;
      }

      .ws-import-btn-arrow {
        width: 12px;
        height: 12px;
        margin-left: 2px;
        display: inline-flex;
        align-items: center;
      }

      .ws-import-dropdown-menu {
        position: absolute;
        top: 100%;
        right: 0;
        margin-top: 6px;
        width: 220px;
        background: var(--vercel-card-bg);
        border: 1px solid var(--vercel-border);
        border-radius: 8px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
        padding: 6px;
        z-index: 50;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .ws-import-dropdown-item {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px;
        border-radius: 6px;
        border: none;
        background: transparent;
        cursor: pointer;
        text-align: left;
        transition: background 0.15s;
      }

      .ws-import-dropdown-item:hover {
        background: var(--surface-hover);
      }

      .ws-import-item-icon {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }

      .ws-import-item-icon.blue {
        color: #06b6d4;
      }
      .ws-import-item-icon.purple {
        color: #8b5cf6;
      }
      .ws-import-item-icon.green {
        color: #10b981;
      }

      .ws-import-item-text {
        display: flex;
        flex-direction: column;
      }

      .ws-import-item-title {
        font-size: 12px;
        font-weight: 600;
        color: var(--vercel-text-primary);
      }

      .ws-import-item-desc {
        font-size: 10px;
        color: var(--vercel-text-muted);
      }

      /* Modal Form Styles */
      .custom-modal {
        width: 480px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
      }

      .ws-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid var(--vercel-border);
      }

      .ws-modal-title {
        font-size: 16px;
        font-weight: 700;
        color: var(--vercel-text-primary);
        margin: 0;
      }

      .ws-modal-close-btn {
        background: transparent;
        border: none;
        font-size: 20px;
        color: var(--vercel-text-muted);
        cursor: pointer;
      }

      .ws-modal-body {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        overflow-y: auto;
      }

      .ws-form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .ws-form-group label {
        font-size: 12px;
        font-weight: 600;
        color: var(--vercel-text-secondary);
      }

      .ws-form-group input,
      .ws-form-group select,
      .ws-form-group textarea {
        padding: 8px 12px;
        background: var(--vercel-subtle-bg);
        border: 1px solid var(--vercel-border);
        border-radius: 6px;
        color: var(--vercel-text-primary);
        font-size: 13px;
        outline: none;
      }

      .ws-form-group textarea {
        resize: vertical;
        min-height: 80px;
      }

      .ws-form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .ws-modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding: 16px 20px;
        border-top: 1px solid var(--vercel-border);
      }

      .ws-btn-primary {
        padding: 8px 16px;
        background: var(--vercel-text-primary);
        color: var(--vercel-bg);
        border: none;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }

      .ws-btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .ws-btn-secondary {
        padding: 8px 16px;
        background: transparent;
        color: var(--vercel-text-secondary);
        border: 1px solid var(--vercel-border);
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }

      .ws-btn-secondary:hover {
        background: var(--surface-hover);
      }

      .color-picker-dot:hover {
        transform: scale(1.1);
      }

      .ws-theme-toggle {
        background: transparent;
        border: none;
        padding: 6px;
        border-radius: 6px;
        color: var(--vercel-text-secondary);
        cursor: pointer;
      }

      .ws-theme-toggle:hover {
        background: var(--surface-hover);
        color: var(--vercel-text-primary);
      }

      .ws-theme-toggle-icon {
        width: 16px;
        height: 16px;
      }

      .ws-header-notification {
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        padding: 6px;
        border-radius: 6px;
        color: var(--vercel-text-secondary);
        cursor: pointer;
        text-decoration: none;
      }

      .ws-header-notification:hover {
        background: var(--surface-hover);
        color: var(--vercel-text-primary);
      }

      .ws-header-notification-icon {
        width: 16px;
        height: 16px;
      }

      .ws-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(2px);
        z-index: 100;
        display: flex;
        justify-content: center;
        padding-top: 80px;
      }

      .ws-modal-card {
        width: 540px;
        background: var(--vercel-card-bg);
        border: 1px solid var(--vercel-border);
        border-radius: 12px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        max-height: 400px;
      }

      .ws-modal-search {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-bottom: 1px solid var(--vercel-border);
      }

      .ws-modal-search-icon {
        width: 16px;
        height: 16px;
        color: var(--vercel-text-muted);
      }

      .ws-modal-input {
        flex: 1;
        background: transparent;
        border: none;
        font-size: 14px;
        color: var(--vercel-text-primary);
        outline: none;
      }

      .ws-modal-kbd {
        padding: 2px 6px;
        border-radius: 4px;
        background: var(--vercel-subtle-bg);
        border: 1px solid var(--vercel-border);
        font-size: 9px;
        color: var(--vercel-text-muted);
      }

      .ws-modal-results {
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .ws-modal-result-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        border-radius: 6px;
        text-decoration: none;
        color: var(--vercel-text-primary);
        transition: background 0.15s ease;
      }

      .ws-modal-result-item:hover {
        background: var(--surface-hover);
      }

      .ws-modal-item-left {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .ws-modal-item-icon {
        width: 16px;
        height: 16px;
      }

      .ws-modal-item-icon.blue {
        color: var(--vercel-accent-blue);
      }
      .ws-modal-item-icon.purple {
        color: var(--vercel-accent-purple);
      }

      .ws-modal-item-title {
        font-size: 13px;
        font-weight: 600;
      }

      .ws-modal-item-desc {
        font-size: 11px;
        color: var(--vercel-text-muted);
      }

      .ws-main {
        flex: 1;
        overflow-y: auto;
        background-color: var(--vercel-bg);
        padding: 32px;
      }
    `,
  ],
})
export class ShellLayoutComponent {
  private readonly authSvc = inject(AuthService);
  readonly themeSvc = inject(ThemeService);
  readonly stateSvc = inject(WorkspaceStateService);
  private readonly toastSvc = inject(ToastService);

  readonly currentUser = this.authSvc.currentUser;
  readonly userInitial = computed(
    () => (this.authSvc.currentUser()?.displayName ?? '').charAt(0).toUpperCase() || 'A',
  );

  readonly sidebarCollapsed = signal(false);
  readonly wsDropOpen = signal(false);
  readonly activeWorkspace = signal('Acklet Engineering');
  readonly cmdPaletteOpen = signal(false);
  readonly importDropOpen = signal(false);

  // Form states for modals
  newToolName = '';
  newToolDesc = '';
  newToolLang = 'TypeScript';
  newToolStatus: 'Published' | 'Draft' | 'In Review' = 'Published';

  newRepoName = '';
  newRepoProvider: 'github' | 'gitlab' | 'bitbucket' = 'github';
  newRepoBranch = 'main';
  newRepoVisibility: 'Public' | 'Private' = 'Public';
  newRepoLang = 'TypeScript';

  newCollName = '';
  newCollDesc = '';
  newCollColor = '#06b6d4';
  readonly availableColors = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];

  toggleSidebar(): void {
    this.sidebarCollapsed.update((v) => !v);
  }
  toggleWsDrop(): void {
    this.wsDropOpen.update((v) => !v);
  }
  selectWorkspace(ws: string): void {
    this.activeWorkspace.set(ws);
    this.wsDropOpen.set(false);
  }

  openCmdPalette(): void {
    this.cmdPaletteOpen.set(true);
  }
  closeCmdPalette(): void {
    this.cmdPaletteOpen.set(false);
  }

  toggleImportDrop(): void {
    this.importDropOpen.update((v) => !v);
  }

  triggerModal(type: 'add_tool' | 'connect_repo' | 'create_collection'): void {
    this.stateSvc.openModal(type);
    this.importDropOpen.set(false);
  }

  submitAddTool(): void {
    if (!this.newToolName.trim() || !this.newToolDesc.trim()) return;
    this.stateSvc.addTool({
      name: this.newToolName.trim(),
      description: this.newToolDesc.trim(),
      lang: this.newToolLang,
      langColor: this.getLangColor(this.newToolLang),
      status: this.newToolStatus,
    });
    this.toastSvc.success('Tool Added', `Successfully created tool "${this.newToolName}"`);
    this.newToolName = '';
    this.newToolDesc = '';
    this.stateSvc.closeModal();
  }

  submitConnectRepo(): void {
    if (!this.newRepoName.trim()) return;
    this.stateSvc.addRepository({
      name: this.newRepoName.trim(),
      provider: this.newRepoProvider,
      branch: this.newRepoBranch,
      visibility: this.newRepoVisibility,
      framework:
        this.newRepoLang === 'Go'
          ? 'Go Stdlib'
          : this.newRepoLang === 'Python'
            ? 'FastAPI'
            : 'Node.js',
      language: this.newRepoLang,
      toolStatus: 'Not Generated',
    });
    this.toastSvc.success('Repository Connected', `Connected to repository "${this.newRepoName}"`);
    this.newRepoName = '';
    this.stateSvc.closeModal();
  }

  submitCreateCollection(): void {
    if (!this.newCollName.trim()) return;
    this.stateSvc.addCollection(
      this.newCollName.trim(),
      this.newCollDesc.trim(),
      this.newCollColor,
    );
    this.toastSvc.success(
      'Collection Created',
      `Created custom collection folder "${this.newCollName}"`,
    );
    this.newCollName = '';
    this.newCollDesc = '';
    this.stateSvc.closeModal();
  }

  private getLangColor(lang: string): string {
    switch (lang) {
      case 'TypeScript':
        return '#3178c6';
      case 'Python':
        return '#3572A5';
      case 'Go':
        return '#00add8';
      case 'Rust':
        return '#deb887';
      default:
        return '#858585';
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.cmdPaletteOpen.update((v) => !v);
    }
    if (event.key === 'Escape' && this.cmdPaletteOpen()) {
      this.cmdPaletteOpen.set(false);
    }
  }

  readonly mainNavLinks: SidebarLink[] = [
    { label: 'Overview', path: '/workspace', icon: 'layout-dashboard' },
    { label: 'Repositories', path: '/workspace/repositories', icon: 'git-branch' },
    { label: 'Tools', path: '/workspace/tools', icon: 'box' },
    { label: 'Store', path: '/workspace/store', icon: 'store' },
    { label: 'Collections', path: '/workspace/collections', icon: 'folder-heart' },
    { label: 'AI Jobs', path: '/workspace/ai-jobs', icon: 'sparkles', badge: '2 Run' },
    { label: 'Analytics', path: '/workspace/analytics', icon: 'line-chart' },
    { label: 'Community', path: '/community/discussions', icon: 'users', disabled: true },
    { label: 'Settings', path: '/workspace/settings', icon: 'settings' },
  ];

  readonly roleNavLinks: SidebarLink[] = [
    { label: 'Publisher Workspace', path: '/workspace/publisher', icon: 'upload-cloud' },
    { label: 'Admin Panel', path: '/workspace/admin', icon: 'shield-alert' },
  ];
}

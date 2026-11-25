// client/apps/tool-docs/src/app/components/doc-layout/doc-shell.component.ts

import {
  Component,
  inject,
  computed,
  signal,
  HostListener,
  ElementRef,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet, RouterLink, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { DocService } from '../../services/doc.service';
import { DocsAuthService } from '../../services/docs-auth.service';
import { DocsToastService } from '../../services/docs-toast.service';
import { getPortalUrl } from '@acklet/shared';

@Component({
  selector: 'app-doc-shell',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink],
  template: `
    <div class="docs-app">
      <!-- ── Top Navbar (64px desktop / 56px mobile) ────────────────────── -->
      @if (!isInEditor()) {
      <header class="docs-top-header">
        <div class="docs-header-inner">
          <!-- Left: Mobile Hamburger & Brand Wordmark -->
          <div class="docs-header-left">
            <!-- Mobile Sidebar Hamburger Button (< 1024px) -->
            <button
              type="button"
              class="docs-mobile-hamburger"
              (click)="toggleMobileDrawer()"
              aria-label="Toggle navigation drawer"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            <!-- Acklet Docs Wordmark Brand (links to /) -->
            <a
              routerLink="/"
              class="docs-header__brand"
              title="Acklet Docs"
            >
              <span class="docs-header__logo-badge">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                  <path d="M6 6h10" />
                  <path d="M6 10h10" />
                </svg>
              </span>
              <span class="docs-header__title">
                Acklet Docs
              </span>
            </a>
          </div>

          <!-- Center: Search Bar in Navbar (Single field, bordered box, icon inside left) -->
          <div class="docs-header-center">
            <div class="docs-search-input-box docs-topbar__search-box">
              <span class="docs-search-input-box__icon">
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" stroke-width="2" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" stroke-width="2" />
                </svg>
              </span>
              <input
                type="text"
                class="docs-search-input-box__input docs-topbar__search-input"
                [ngModel]="navbarSearchQuery()"
                (ngModelChange)="onNavbarSearchChange($event)"
                placeholder="Search stories & docs..."
                aria-label="Search stories"
              />
              @if (navbarSearchQuery().trim().length > 0) {
                <button
                  type="button"
                  class="docs-search-input-box__clear"
                  (click)="clearNavbarSearch()"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              }
            </div>
          </div>

          <!-- Right: Actions, Notifications, Theme Toggle & Account Menu -->
          <div class="docs-header-right">
            @if (authService.isAuthenticated()) {
              <!-- Single Global Write Action (Hidden inside Editor) -->
              @if (!isInEditor()) {
                <a
                  routerLink="/new"
                  class="docs-button docs-button--primary docs-topbar__action-btn"
                  title="Write a new story or document"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.2"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  <span>Write</span>
                </a>
              }

              <!-- Notifications Bell Icon Button (Single Location, Bug 1) -->
              <a
                routerLink="/notifications"
                class="docs-icon-button docs-topbar__icon-btn"
                title="Notifications"
                aria-label="View notifications"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
                @if (unreadNotificationCount() > 0) {
                  <span class="docs-notification-dot"></span>
                }
              </a>

              <!-- Theme Toggle Button -->
              <button
                type="button"
                class="docs-icon-button docs-topbar__icon-btn"
                (click)="toggleTheme()"
                title="Toggle theme (Light / Dark)"
                aria-label="Toggle theme"
              >
                @if (isDarkTheme()) {
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <circle cx="12" cy="12" r="4" />
                    <path
                      d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
                    />
                  </svg>
                } @else {
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                  </svg>
                }
              </button>

              <!-- User Menu Dropdown -->
              <div class="docs-topbar__account-wrapper">
                <button
                  type="button"
                  class="docs-avatar-btn docs-topbar__avatar-btn"
                  (click)="toggleUserMenu($event)"
                  title="Account"
                  aria-haspopup="true"
                  [attr.aria-expanded]="userMenuOpen()"
                >
                  <div class="docs-avatar docs-avatar--sm">
                    {{ userInitial() }}
                  </div>
                </button>

                @if (userMenuOpen()) {
                  <div
                    class="docs-menu"
                    (click)="$event.stopPropagation()"
                  >
                    <div class="docs-menu__header">
                      <p class="docs-menu__user-name docs-truncate">
                        {{ userDisplayName() }}
                      </p>
                      <p class="docs-menu__user-email docs-truncate">
                        {{ userEmail() }}
                      </p>
                    </div>

                    <div class="docs-menu__section">
                      <a
                        routerLink="/profile"
                        (click)="userMenuOpen.set(false)"
                        class="docs-menu__item"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        <span>Profile</span>
                      </a>
                      <a
                        routerLink="/stories"
                        (click)="userMenuOpen.set(false)"
                        class="docs-menu__item"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect width="18" height="18" x="3" y="3" rx="2" />
                          <path d="M3 9h18M9 21V9" />
                        </svg>
                        <span>My Stories</span>
                      </a>
                      <a
                        routerLink="/settings"
                        (click)="userMenuOpen.set(false)"
                        class="docs-menu__item"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                        <span>Settings</span>
                      </a>
                    </div>

                    <div class="docs-menu-divider"></div>

                    <div class="docs-menu__section">
                      <a
                        [href]="portalUrl"
                        class="docs-menu__item"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                        <span>Back to Acklet</span>
                      </a>
                      <button
                        type="button"
                        (click)="signOut()"
                        class="docs-menu__item docs-menu__item--danger"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                          <polyline points="16 17 21 12 16 7"/>
                          <line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <!-- Logged-out State: Theme Toggle, Sign In, Get Started (Bugs 51, 52) -->
              <button
                type="button"
                class="docs-icon-button docs-icon-button--sm"
                (click)="toggleTheme()"
                title="Toggle theme (Light / Dark)"
                aria-label="Toggle theme"
              >
                @if (isDarkTheme()) {
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <circle cx="12" cy="12" r="4" />
                    <path
                      d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
                    />
                  </svg>
                } @else {
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                  </svg>
                }
              </button>

              <button
                type="button"
                (click)="authService.redirectToLogin()"
                class="docs-header-signin-btn"
              >
                Sign In
              </button>

              <button
                type="button"
                (click)="authService.redirectToSignup()"
                class="docs-header-get-started-btn"
              >
                Get Started
              </button>
            }
          </div>
        </div>
      </header>
      }

      <!-- ── App Body Shell (Sidebar + Main Content) ──────────────────────── -->
      <div class="docs-layout-body" [class.docs-layout-editor]="isInEditor()">
        @if (!isInEditor()) {
        <!-- Desktop Sidebar (240px wide, sticky) -->
        <aside class="docs-desktop-sidebar">
          <div class="docs-sidebar-section">
            <!-- Group 1: READ -->
            <div>
              <p class="docs-nav-group-label">Read</p>
              <nav class="docs-sidebar-nav">
                <a
                  routerLink="/"
                  class="docs-nav-link"
                  [class.active]="activeNav() === 'COMMUNITY'"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  <span>Home</span>
                </a>

                @if (authService.isAuthenticated()) {
                  <a
                    routerLink="/following"
                    class="docs-nav-link"
                    [class.active]="activeNav() === 'FOLLOWING'"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span>Following</span>
                  </a>
                  <a
                    routerLink="/library/bookmarks"
                    class="docs-nav-link"
                    [class.active]="activeNav() === 'BOOKMARKS'"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                    </svg>
                    <span>Bookmarks</span>
                  </a>
                  <a
                    routerLink="/library/history"
                    class="docs-nav-link"
                    [class.active]="activeNav() === 'HISTORY'"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>Reading history</span>
                  </a>
                }
              </nav>
            </div>

            <!-- Group 2: MANAGE (Authenticated) -->
            @if (authService.isAuthenticated()) {
              <div>
                <p class="docs-nav-group-label">Manage</p>
                <nav class="docs-sidebar-nav">
                  <a
                    routerLink="/overview"
                    class="docs-nav-link"
                    [class.active]="activeNav() === 'OVERVIEW'"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect width="7" height="9" x="3" y="3" rx="1" />
                      <rect width="7" height="5" x="14" y="3" rx="1" />
                      <rect width="7" height="9" x="14" y="12" rx="1" />
                      <rect width="7" height="5" x="3" y="16" rx="1" />
                    </svg>
                    <span>Overview</span>
                  </a>
                  <a
                    routerLink="/stories"
                    class="docs-nav-link"
                    [class.active]="activeNav() === 'STORIES'"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                      <path d="M6 6h10" />
                      <path d="M6 10h10" />
                    </svg>
                    <span>Stories</span>
                  </a>
                  <a
                    routerLink="/tools-admin"
                    class="docs-nav-link"
                    [class.active]="activeNav() === 'TOOLS'"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect width="18" height="18" x="3" y="3" rx="2" />
                      <path d="M3 9h18M9 21V9" />
                    </svg>
                    <span>Tools</span>
                  </a>
                  <a
                    routerLink="/collections"
                    class="docs-nav-link"
                    [class.active]="activeNav() === 'COLLECTIONS'"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polygon points="12 2 2 7 12 12 22 7 12 2" />
                      <polyline points="2 17 12 22 22 17" />
                      <polyline points="2 12 12 17 22 12" />
                    </svg>
                    <span>Collections</span>
                  </a>
                </nav>
              </div>
            }
          </div>

          <!-- Sidebar Footer: Back to Acklet link only -->
          <div class="docs-sidebar-footer">
            <a
              [href]="portalUrl"
              class="docs-nav-link"
              title="Return to Acklet Tools Portal"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              <span>Back to Acklet</span>
            </a>
          </div>
        </aside>
        }

        @if (!isInEditor()) {
        <!-- Mobile Drawer Backdrop (Bug 46: tap to close) -->
        @if (mobileDrawerOpen()) {
          <div class="docs-drawer-backdrop" (click)="closeMobileDrawer()" aria-hidden="true"></div>
        }

        <!-- Mobile Drawer (Bug 45: click any link closes drawer) -->
        <aside
          class="docs-mobile-drawer"
          [class.drawer-open]="mobileDrawerOpen()"
          aria-label="Mobile Navigation"
        >
          <div class="docs-drawer-inner">
            <div>
              <div class="docs-drawer-header">
                <div class="docs-drawer-brand">
                  <span class="docs-drawer__logo">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.2"
                    >
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                      <path d="M6 6h10" />
                    </svg>
                  </span>
                  <span class="docs-drawer__title">Acklet Docs</span>
                </div>
                <button type="button" class="docs-drawer-close" (click)="closeMobileDrawer()"
                  aria-label="Close navigation"
                >
                  ✕
                </button>
              </div>

              <!-- Mobile Nav Links -->
              <nav class="docs-drawer-nav">
                <div>
                  <p class="docs-nav-group-label">Read</p>
                  <div class="docs-sidebar-nav">
                    <a
                      routerLink="/"
                      (click)="closeMobileDrawer()"
                      class="docs-nav-link"
                      [class.active]="activeNav() === 'COMMUNITY'"
                    >
                      <span>Home</span>
                    </a>

                    @if (authService.isAuthenticated()) {
                      <a
                        routerLink="/following"
                        (click)="closeMobileDrawer()"
                        class="docs-nav-link"
                        [class.active]="activeNav() === 'FOLLOWING'"
                      >
                        <span>Following</span>
                      </a>
                      <a
                        routerLink="/library/bookmarks"
                        (click)="closeMobileDrawer()"
                        class="docs-nav-link"
                        [class.active]="activeNav() === 'BOOKMARKS'"
                      >
                        <span>Bookmarks</span>
                      </a>
                      <a
                        routerLink="/library/history"
                        (click)="closeMobileDrawer()"
                        class="docs-nav-link"
                        [class.active]="activeNav() === 'HISTORY'"
                      >
                        <span>Reading history</span>
                      </a>
                    }
                  </div>
                </div>

                @if (authService.isAuthenticated()) {
                  <div>
                    <p class="docs-nav-group-label">Manage</p>
                    <div class="docs-sidebar-nav">
                      <a
                        routerLink="/overview"
                        (click)="closeMobileDrawer()"
                        class="docs-nav-link"
                        [class.active]="activeNav() === 'OVERVIEW'"
                      >
                        <span>Overview</span>
                      </a>
                      <a
                        routerLink="/stories"
                        (click)="closeMobileDrawer()"
                        class="docs-nav-link"
                        [class.active]="activeNav() === 'STORIES'"
                      >
                        <span>Stories</span>
                      </a>
                      <a
                        routerLink="/tools-admin"
                        (click)="closeMobileDrawer()"
                        class="docs-nav-link"
                        [class.active]="activeNav() === 'TOOLS'"
                      >
                        <span>Tools</span>
                      </a>
                      <a
                        routerLink="/collections"
                        (click)="closeMobileDrawer()"
                        class="docs-nav-link"
                        [class.active]="activeNav() === 'COLLECTIONS'"
                      >
                        <span>Collections</span>
                      </a>
                    </div>
                  </div>
                } @else {
                  <div class="docs-drawer-footer">
                    <button
                      type="button"
                      (click)="closeMobileDrawer(); authService.redirectToLogin()"
                      class="docs-sidebar__link"
                    >
                      <span>Sign In</span>
                    </button>
                    <button
                      type="button"
                      (click)="closeMobileDrawer(); authService.redirectToSignup()"
                      class="docs-sidebar__link docs-sidebar__link--active"
                    >
                      <span>Get Started</span>
                    </button>
                  </div>
                }
              </nav>
            </div>

            <!-- Mobile Drawer Bottom: Back to Acklet -->
            <div class="docs-drawer-footer">
              <a
                [href]="portalUrl"
                class="docs-sidebar__link"
              >
                <span>Back to Acklet</span>
              </a>
            </div>
          </div>
        </aside>
        }

        <!-- Main Content Area with Outlet -->
        <main class="docs-main-content">
          <router-outlet></router-outlet>
        </main>
      </div>

      <!-- Standard Toast Notification Container (Bug 49) -->
      @if (toastService.toasts().length > 0) {
        <div class="docs-toast-container" role="status" aria-live="polite">
          @for (toast of toastService.toasts(); track toast.id) {
            <div class="docs-toast">
              <span>{{ toast.message }}</span>
              <button
                type="button"
                class="docs-toast__dismiss"
                (click)="toastService.dismiss(toast.id)"
                aria-label="Dismiss notification"
              >
                ✕
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class DocShellComponent implements OnInit, OnDestroy {
  readonly docService = inject(DocService);
  readonly authService = inject(DocsAuthService);
  readonly toastService = inject(DocsToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly elRef = inject(ElementRef);

  readonly portalUrl = getPortalUrl();
  readonly isDarkTheme = signal<boolean>(false);
  readonly userMenuOpen = signal<boolean>(false);
  readonly mobileDrawerOpen = signal<boolean>(false);
  readonly isInEditor = signal<boolean>(false);
  readonly navbarSearchQuery = signal<string>('');
  readonly activeNav = signal<
    | 'COMMUNITY'
    | 'FOLLOWING'
    | 'BOOKMARKS'
    | 'HISTORY'
    | 'OVERVIEW'
    | 'STORIES'
    | 'TOOLS'
    | 'COLLECTIONS'
    | 'DRAFTS'
    | 'PUBLISHED'
    | 'OTHER'
  >('COMMUNITY');
  readonly unreadNotificationCount = signal<number>(0);

  private navSub?: Subscription;
  private querySub?: Subscription;

  readonly userDisplayName = computed(() => {
    return this.authService.currentUser()?.displayName || 'Acklet User';
  });

  readonly userEmail = computed(() => {
    return this.authService.currentUser()?.email || 'user@acklet.com';
  });

  readonly userInitial = computed(() => {
    return (this.userDisplayName()[0] || 'U').toUpperCase();
  });

  ngOnInit(): void {
    this.updateRouteState();

    this.querySub = this.route.queryParamMap.subscribe((params) => {
      const q = params.get('q') || '';
      if (this.navbarSearchQuery() !== q) {
        this.navbarSearchQuery.set(q);
      }
    });

    this.navSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        this.updateRouteState();
        this.mobileDrawerOpen.set(false);
      });

    if (this.authService.isAuthenticated()) {
      this.docService.getUnreadNotificationCount().subscribe({
        next: (count) => this.unreadNotificationCount.set(count),
      });
    }

    if (typeof document !== 'undefined') {
      const isDark =
        document.documentElement.classList.contains('dark') ||
        document.body.classList.contains('dark') ||
        document.documentElement.getAttribute('data-theme') === 'dark';
      this.isDarkTheme.set(isDark);
    }
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
    this.querySub?.unsubscribe();
  }

  onNavbarSearchChange(term: string): void {
    this.navbarSearchQuery.set(term);
    this.router.navigate(['/'], {
      queryParams: { q: term.trim() ? term.trim() : null },
      queryParamsHandling: 'merge',
    });
  }

  clearNavbarSearch(): void {
    this.navbarSearchQuery.set('');
    this.router.navigate(['/'], {
      queryParams: { q: null },
      queryParamsHandling: 'merge',
    });
  }

  private updateRouteState(): void {
    let url = this.router.url.split('?')[0];
    if (url.startsWith('/docs')) {
      url = url.substring('/docs'.length) || '/';
    }

    const isEditor =
      url === '/write' ||
      url.startsWith('/write/') ||
      url === '/new' ||
      url.startsWith('/new/') ||
      url.startsWith('/edit/');
    this.isInEditor.set(isEditor);

    if (url === '/' || url === '') {
      this.activeNav.set('COMMUNITY');
    } else if (url === '/following') {
      this.activeNav.set('FOLLOWING');
    } else if (url === '/library/bookmarks' || url === '/library') {
      this.activeNav.set('BOOKMARKS');
    } else if (url === '/library/history') {
      this.activeNav.set('HISTORY');
    } else if (url === '/overview') {
      this.activeNav.set('OVERVIEW');
    } else if (url === '/stories' || url === '/account/documents' || url === '/dashboard' || url === '/drafts' || url === '/published') {
      this.activeNav.set('STORIES');
    } else if (url.startsWith('/tools-admin')) {
      this.activeNav.set('TOOLS');
    } else if (url.startsWith('/collections')) {
      this.activeNav.set('COLLECTIONS');
    } else {
      this.activeNav.set('OTHER');
    }
  }

  toggleMobileDrawer(): void {
    this.mobileDrawerOpen.update((v) => !v);
  }

  closeMobileDrawer(): void {
    this.mobileDrawerOpen.set(false);
  }

  toggleUserMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.userMenuOpen.update((v) => !v);
  }

  signOut(): void {
    this.userMenuOpen.set(false);
    this.authService.logout();
  }

  toggleTheme(): void {
    const nextDark = !this.isDarkTheme();
    this.isDarkTheme.set(nextDark);
    if (typeof document !== 'undefined') {
      const theme = nextDark ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('docs:theme', theme);
      localStorage.setItem('acklet:theme', theme);
      if (nextDark) {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
      }
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.userMenuOpen.set(false);
    }
  }
}

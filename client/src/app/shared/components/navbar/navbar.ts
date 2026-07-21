import { Component, signal, HostListener, inject, ElementRef } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon';
import { SpotlightDirective } from '../../directives/spotlight.directive';
import { MagneticDirective } from '../../directives/magnetic.directive';
import { ThemeService } from '../../../core/services/theme.service';

interface NavLink {
  label: string;
  path?: string;
  children?: { label: string; path: string; icon?: string; desc?: string }[];
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, IconComponent, SpotlightDirective, MagneticDirective],
  template: `
    <nav class="navbar-root card-spotlight" [class.scrolled]="isScrolled()" appSpotlight>
      <div class="container-main navbar-inner">
        <a routerLink="/" class="logo-wrap">
          <span class="logo-text-shining">ACKLET</span>
        </a>
 
        <!-- Desktop Nav Links -->
        <div class="nav-links hide-mobile">
          @for (link of navLinks; track link.label) {
            @if (link.children) {
              <div class="nav-item-dropdown" [class.open]="activeDropdown() === link.label">
                <button class="nav-dropdown-trigger" (click)="toggleDropdown(link.label, $event)">
                  {{ link.label }}
                  <app-icon name="chevron-down" class="size-3 text-neutral-400" />
                </button>
                <div class="dropdown-pane glass-strong">
                  <div class="dropdown-grid">
                    @for (child of link.children; track child.path) {
                      <a [routerLink]="child.path" class="dropdown-item">
                        @if (child.icon) {
                          <div class="dropdown-icon-box">
                            <app-icon [name]="child.icon" class="size-3 text-brand-500" />
                          </div>
                        }
                        <div class="dropdown-item-info">
                          <div class="dropdown-item-label">{{ child.label }}</div>
                          <div class="dropdown-item-desc">{{ child.desc }}</div>
                        </div>
                      </a>
                    }
                  </div>
                </div>
              </div>
            } @else {
              <a [routerLink]="link.path" routerLinkActive="nav-link-active" [routerLinkActiveOptions]="{exact: link.path === '/'}" class="nav-link">
                {{ link.label }}
              </a>
            }
          }
        </div>
 
        <!-- Actions -->
        <div class="nav-actions">
          <!-- Theme Toggle -->
          <button class="theme-toggle-btn" (click)="themeSvc.toggle()" aria-label="Toggle theme">
            @if (themeSvc.theme() === 'dark') {
              <app-icon name="sun" class="size-4 text-neutral-300" />
            } @else {
              <app-icon name="moon" class="size-4 text-neutral-300" />
            }
          </button>

          <!-- Login CTA -->
          <a routerLink="/auth/login" class="btn btn-ghost btn-sm hide-mobile">
            Sign In
          </a>

          <!-- Start solving CTA -->
          <a routerLink="/tools/explore" class="btn btn-primary btn-sm hide-mobile nav-workspace-btn" appMagnetic [appMagnetic]="0.2">
            Start solving
          </a>

          <!-- Mobile hamburger -->
          <button class="icon-btn mobile-menu-btn" (click)="toggleMobileMenu()" aria-label="Toggle menu">
            @if (!mobileMenuOpen()) {
              <app-icon name="menu" class="size-5 text-neutral-300" />
            } @else {
              <app-icon name="x" class="size-5 text-neutral-300" />
            }
          </button>
        </div>
      </div>

      <!-- Mobile Drawer -->
      <div class="mobile-drawer" [class.open]="mobileMenuOpen()">
        <div class="mobile-drawer-inner">
          @for (link of navLinks; track link.label) {
            @if (link.children) {
              <div class="mobile-section-heading">{{ link.label }}</div>
              @for (child of link.children; track child.path) {
                <a [routerLink]="child.path" routerLinkActive="mobile-link-active" class="mobile-link" (click)="closeMobileMenu()">
                  {{ child.label }}
                </a>
              }
              <div class="mobile-drawer-divider"></div>
            } @else {
              <a [routerLink]="link.path" routerLinkActive="mobile-link-active" [routerLinkActiveOptions]="{exact: link.path === '/'}" class="mobile-link" (click)="closeMobileMenu()">
                {{ link.label }}
              </a>
            }
          }
        </div>
      </div>
      @if (mobileMenuOpen()) {
        <div class="drawer-backdrop" (click)="closeMobileMenu()"></div>
      }
    </nav>
  `,
  styles: [`
    .navbar-root {
      position: fixed; top: 0; left: 50%; transform: translateX(-50%); z-index: 100;
      transition: all 1s cubic-bezier(0.16, 1, 0.3, 1);
      padding: 0 1.5rem;
      background: color-mix(in srgb, var(--color-surface-950) 10%, transparent);
      backdrop-filter: blur(40px);
      -webkit-backdrop-filter: blur(40px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
      width: 100%;
      max-width: 100%;
      border-radius: 0;
    }
    .navbar-root.scrolled {
      top: 1.25rem;
      width: calc(100% - 3rem);
      max-width: 1100px;
      background: var(--panel-soft) !important;
      backdrop-filter: blur(48px);
      -webkit-backdrop-filter: blur(48px);
      border-radius: var(--radius-full);
      box-shadow:
        14px 14px 36px var(--shadow-dark),
        -14px -14px 36px var(--shadow-light);
      padding: 0 0.75rem;
    }
    .navbar-inner {
      display: flex; align-items: center; justify-content: space-between;
      height: 64px; gap: 2rem;
    }
    .logo-wrap { display: flex; align-items: center; text-decoration: none; flex-shrink: 0; }
    .logo-text-shining {
      font-family: var(--font-decorative);
      font-size: 1.8rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      cursor: pointer;
      user-select: none;
      background: linear-gradient(
        120deg,
        var(--color-brand-800) 25%,
        var(--color-accent-500) 50%,
        var(--color-brand-800) 75%
      );
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      transition: background-position 0.6s ease, transform 0.4s ease;
      display: inline-block;
    }
    .logo-wrap:hover .logo-text-shining {
      background-position: right center;
      transform: scale(1.03);
    }
    
    .nav-links { display: flex; align-items: center; gap: 0.25rem; margin-left: 1rem; }
    .nav-link {
      padding: 0.4rem 1rem; border-radius: var(--radius-full);
      font-size: 0.875rem; font-weight: 500; color: var(--color-neutral-400);
      text-decoration: none; transition: all 0.2s ease;
      outline: none;
    }
    .nav-link:focus { outline: none; }
    .nav-link:focus-visible { outline: 2px solid var(--color-brand-500); outline-offset: 2px; }
    .nav-link:hover { color: var(--color-neutral-50); background: var(--color-nav-hover-bg); }
    .nav-link-active { color: var(--color-neutral-50) !important; background: var(--color-nav-active-bg); font-weight: 600; }
    
    /* Click Dropdown Pane styling */
    .nav-item-dropdown { position: relative; display: inline-flex; align-items: center; }
    .nav-dropdown-trigger {
      display: inline-flex; align-items: center; gap: 0.35rem;
      padding: 0.4rem 1.1rem; border-radius: var(--radius-full);
      font-size: 0.875rem; font-weight: 500; color: var(--color-neutral-400);
      background: none; border: none; cursor: pointer; transition: all 0.2s ease;
      font-family: inherit; outline: none;
    }
    .nav-dropdown-trigger:hover,
    .nav-item-dropdown:hover .nav-dropdown-trigger,
    .nav-item-dropdown.open .nav-dropdown-trigger {
      color: var(--color-neutral-50);
      background: var(--color-nav-hover-bg);
    }
    
    .dropdown-pane {
      position: absolute; top: calc(100% + 0.5rem); left: 50%; transform: translateX(-50%) translateY(8px);
      width: 440px; padding: 1rem; border-radius: var(--radius-xl); border: 1px solid rgba(255, 255, 255, 0.05);
      background: color-mix(in srgb, var(--color-surface-900) 96%, transparent);
      backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
      opacity: 0; pointer-events: none; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 150; box-shadow: 0 20px 40px rgba(0,0,0,0.1);
    }
    .dropdown-pane::before {
      content: '';
      position: absolute;
      top: -0.6rem;
      left: 0;
      right: 0;
      height: 0.6rem;
      background: transparent;
    }
    .nav-item-dropdown.open .dropdown-pane,
    .nav-item-dropdown:hover .dropdown-pane {
      opacity: 1; pointer-events: auto; transform: translateX(-50%) translateY(0);
    }
    
    .dropdown-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
    .dropdown-item {
      display: flex; gap: 0.75rem; padding: 0.75rem; border-radius: var(--radius-lg);
      text-decoration: none; color: inherit; transition: background 0.2s;
    }
    .dropdown-item:hover { background: transparent; }
    
    .dropdown-icon-box {
      width: 32px; height: 32px; border-radius: var(--radius-md); background: rgba(99,102,241,0.06);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .dropdown-item-info { display: flex; flex-direction: column; gap: 0.15rem; }
    .dropdown-item-label { font-size: 0.825rem; font-weight: 700; color: var(--color-neutral-100); }
    .dropdown-item-desc { font-size: 0.7rem; color: var(--color-neutral-400); line-height: 1.35; }
    
    .nav-actions { display: flex; align-items: center; gap: 0.5rem; }

    .icon-btn {
      width: 36px; height: 36px; border-radius: var(--radius-full); border: 1px solid rgba(0, 0, 0, 0.04); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      background: rgba(15, 23, 42, 0.02); color: var(--color-neutral-400);
      transition: all 0.2s ease;
      outline: none;
    }
    .icon-btn:focus { outline: none; }
    .icon-btn:hover { background: var(--surface-hover); color: var(--color-neutral-100); border-color: var(--border-medium); }
    [data-theme="light"] .icon-btn:hover { border-color: rgba(0, 0, 0, 0.1); }
    
    .nav-workspace-btn {
      font-size: 0.78rem;
      padding: 0.4rem 1rem;
      border-radius: var(--radius-md);
      font-weight: 600;
      letter-spacing: 0.01em;
      display: inline-flex !important;
    }
    .mobile-menu-btn { display: none; }
    
    /* Mobile Drawer */
    .mobile-drawer {
      position: fixed; top: 64px; left: 0; right: 0; z-index: 99;
      background: rgba(255, 255, 255, 0.98); backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      transform: translateY(-150%);
      opacity: 0;
      pointer-events: none;
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
      max-height: calc(100vh - 64px); overflow-y: auto;
    }
    .mobile-drawer.open { transform: translateY(0); opacity: 1; pointer-events: auto; }
    .mobile-drawer-inner { padding: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .mobile-link {
      padding: 0.75rem 1rem; border-radius: var(--radius-md); font-size: 0.9rem;
      font-weight: 500; color: var(--color-neutral-400); text-decoration: none;
      transition: all 0.2s ease;
    }
    .mobile-link:hover { color: var(--color-neutral-100); background: rgba(0, 0, 0, 0.03); }
    .mobile-link-active { color: var(--color-brand-600) !important; background: rgba(99, 102, 241, 0.08); }
    .mobile-section-heading { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: var(--color-neutral-500); padding: 0.5rem 1rem 0.25rem; letter-spacing: 0.05em; }
    .mobile-drawer-divider { height: 1px; background: rgba(0, 0, 0, 0.06); margin: 0.5rem 0; }
    .drawer-backdrop {
      position: fixed; inset: 0; z-index: 98;
      background: rgba(0,0,0,0.25); top: 64px;
    }
    @media (max-width: 768px) {
      .mobile-menu-btn { display: flex !important; }
      .hide-mobile { display: none !important; }
    }

    .theme-toggle-btn {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-full);
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--color-neutral-400);
      transition: all 0.2s ease;
    }
    .theme-toggle-btn:hover {
      color: var(--color-neutral-50);
      background: var(--color-nav-hover-bg);
    }
  `],
})
export class NavbarComponent {
  readonly themeSvc = inject(ThemeService);
  readonly isScrolled = signal(false);
  readonly mobileMenuOpen = signal(false);
  readonly activeDropdown = signal<string | null>(null);
  readonly #elRef = inject(ElementRef);

  toggleDropdown(label: string, event: MouseEvent): void {
    event.stopPropagation();
    this.activeDropdown.update(cur => cur === label ? null : label);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.#elRef.nativeElement.contains(event.target)) {
      this.activeDropdown.set(null);
    }
  }

  readonly navLinks: NavLink[] = [
    { label: 'Home', path: '/' },
    {
      label: 'Tools',
      children: [
        { label: 'Explore Solutions', path: '/tools/explore', icon: 'wrench', desc: 'Browse the complete catalog of developer tools.' },
        { label: 'Categories', path: '/tools/categories', icon: 'grid', desc: 'Find tools grouped by category.' },
        { label: 'Trending Tools', path: '/tools/trending', icon: 'trending-up', desc: 'Active utilities based on community usage.' },
        { label: 'New Releases', path: '/tools/new', icon: 'sparkles', desc: 'Explore the latest offline-first solutions.' }
      ]
    },
    {
      label: 'Community',
      children: [
        { label: 'Discussions', path: '/community/discussions', icon: 'message-square', desc: 'Help others or discuss offline features.' },
        { label: 'Developer Showcase', path: '/community/showcase', icon: 'award', desc: 'See custom projects built on top of Acklet.' },
        { label: 'Feature Requests', path: '/community/features', icon: 'lightbulb', desc: 'Upvote upcoming tools and ideas.' },
        { label: 'Help & Support', path: '/community/help', icon: 'help-circle', desc: 'Read FAQs or get dev team support.' }
      ]
    },
    { label: 'Blog', path: '/blog' },
    { label: 'About', path: '/about' },
    { label: 'Contact', path: '/contact' }
  ];

  @HostListener('window:scroll')
  onScroll(): void {
    this.isScrolled.set(window.scrollY > 16);
  }

  openSearch(): void { /* Search modal trigger */ }
  toggleMobileMenu(): void { this.mobileMenuOpen.update(v => !v); }
  closeMobileMenu(): void { this.mobileMenuOpen.set(false); }
}

// client/src/app/shared/components/navbar/navbar.ts
import { Component, signal, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon';

interface NavLink { label: string; path: string; }

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, IconComponent],
  template: `
    <nav class="navbar-root" [class.scrolled]="isScrolled()">
      <div class="container-main navbar-inner">
        <a routerLink="/" class="logo-wrap">
          <span class="logo-text-shining">ACKLET</span>
        </a>

        <!-- Desktop Nav Links -->
        <div class="nav-links hide-mobile">
          @for (link of navLinks; track link.path) {
            <a [routerLink]="link.path" routerLinkActive="nav-link-active" [routerLinkActiveOptions]="{exact: link.path === '/'}" class="nav-link">
              {{ link.label }}
            </a>
          }
        </div>

        <!-- Actions -->
        <div class="nav-actions">


          <!-- Start solving CTA -->
          <a routerLink="/tools" class="btn btn-primary btn-sm hide-mobile nav-workspace-btn">
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
          @for (link of navLinks; track link.path) {
            <a [routerLink]="link.path" routerLinkActive="mobile-link-active" [routerLinkActiveOptions]="{exact: link.path === '/'}" class="mobile-link" (click)="closeMobileMenu()">
              {{ link.label }}
            </a>
          }
          <div class="mobile-drawer-divider"></div>
          <a routerLink="/contact" class="mobile-link" (click)="closeMobileMenu()">Contact</a>
        </div>
      </div>
      @if (mobileMenuOpen()) {
        <div class="drawer-backdrop" (click)="closeMobileMenu()"></div>
      }
    </nav>
  `,
  styles: [`
    .navbar-root {
      position: fixed; top: 1.5rem; left: 50%; transform: translateX(-50%); z-index: 100;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      padding: 0 0.5rem;
      border: 1px solid rgba(255, 255, 255, 0.05);
      background: color-mix(in srgb, var(--color-surface-950) 60%, transparent);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: var(--radius-full);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
      width: calc(100% - 3rem);
      max-width: 1100px;
    }
    .navbar-root.scrolled {
      background: var(--color-navbar-bg);
      border-color: var(--color-navbar-border);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      box-shadow: 0 8px 32px rgba(15, 23, 42, 0.05);
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
    .nav-link:hover { color: var(--color-brand-900); background: rgba(15, 23, 42, 0.03); }
    .nav-link-active { color: var(--color-brand-900) !important; background: rgba(15, 23, 42, 0.04); font-weight: 600; }
    .nav-actions { display: flex; align-items: center; gap: 0.5rem; }

    .icon-btn {
      width: 36px; height: 36px; border-radius: var(--radius-full); border: 1px solid rgba(0, 0, 0, 0.04); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      background: rgba(15, 23, 42, 0.02); color: var(--color-neutral-400);
      transition: all 0.2s ease;
      outline: none;
    }
    .icon-btn:focus { outline: none; }
    .icon-btn:hover { background: rgba(15, 23, 42, 0.04); color: var(--color-brand-900); border-color: rgba(0, 0, 0, 0.1); }
    [data-theme="light"] .icon-btn:hover { border-color: rgba(0, 0, 0, 0.1); }
    .avatar-btn {
      width: 36px; height: 36px; border-radius: 50%; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white; font-size: 0.72rem; font-weight: 700;
      text-decoration: none; transition: all 0.2s ease;
    }
    .avatar-btn:hover { box-shadow: 0 0 16px rgba(99, 102, 241, 0.4); transform: scale(1.03); }
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
    .mobile-drawer-divider { height: 1px; background: rgba(0, 0, 0, 0.06); margin: 0.5rem 0; }
    .drawer-backdrop {
      position: fixed; inset: 0; z-index: 98;
      background: rgba(0,0,0,0.25); top: 64px;
    }
    @media (max-width: 768px) {
      .mobile-menu-btn { display: flex !important; }
      .hide-mobile { display: none !important; }
    }
  `],
})
export class NavbarComponent {
  readonly isScrolled = signal(false);
  readonly mobileMenuOpen = signal(false);

  readonly navLinks: NavLink[] = [
    { label: 'Home', path: '/' },
    { label: 'Solutions', path: '/tools' },
    { label: 'Categories', path: '/categories' },
    { label: 'About', path: '/about' },
  ];

  @HostListener('window:scroll')
  onScroll(): void {
    this.isScrolled.set(window.scrollY > 16);
  }

  openSearch(): void { /* Search modal trigger */ }
  toggleMobileMenu(): void { this.mobileMenuOpen.update(v => !v); }
  closeMobileMenu(): void { this.mobileMenuOpen.set(false); }
}

// packages/tool-shell/src/components/topbar/ts-topbar.component.ts
import { Component, input, output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolSidebarService } from '../../services/tool-sidebar.service';
import { getPortalUrl, getToolsHubUrl } from '@acklet/shared';
import { TsIconComponent } from '../icon/ts-icon.component';
import { TsThemeToggleComponent } from '../theme/ts-theme-toggle.component';

export interface CategoryNavLink {
  id: string;
  label: string;
  url: string;
}

@Component({
  selector: 'ts-topbar',
  standalone: true,
  imports: [CommonModule, TsIconComponent, TsThemeToggleComponent],
  template: `
    <header class="ts-topbar-card" role="banner">
      <!-- Left: Mobile Trigger & Clean Brand Mark + Wordmark -->
      <div class="ts-zone-left">
        @if (showSidebar()) {
          <button 
            type="button" 
            class="ts-mobile-menu-btn" 
            (click)="sidebarService.toggleMobileDrawer()"
            aria-label="Toggle navigation menu"
            title="Toggle navigation menu"
          >
            <ts-icon name="menu" [size]="18" />
          </button>
        }

        <a [href]="portalUrl" class="ts-brand-link" title="Acklet Home">
          <ts-icon name="zap" [size]="18" class="ts-brand-mark" />
          <span class="ts-brand-wordmark">Acklet</span>
        </a>
      </div>

      <!-- Center: Category and Global Navigation Links (Utilities, Developer, Security, About) -->
      <nav class="ts-zone-center" aria-label="Main Navigation">
        <div class="ts-nav-links-cluster">
          @for (cat of categoryLinks; track cat.id) {
            <a 
              [href]="cat.url" 
              class="ts-nav-link-item"
              [class.active]="currentCategory()?.toLowerCase() === cat.id.toLowerCase() && activeTabId() !== 'about'"
            >
              {{ cat.label }}
            </a>
          }
          <button 
            type="button" 
            class="ts-nav-link-item ts-nav-btn-link"
            [class.active]="activeTabId() === 'about'"
            (click)="onAboutClick()"
          >
            About
          </button>
        </div>
      </nav>

      <!-- Right: Search (⌘K), Theme Toggle & Primary Action -->
      <div class="ts-zone-right">
        <!-- Command Palette Trigger -->
        <button 
          type="button" 
          class="ts-search-btn" 
          (click)="openCommandPalette.emit()"
          aria-label="Search tools and commands (Ctrl+K)"
          title="Search tools and commands (Ctrl+K)"
        >
          <ts-icon name="search" [size]="15" />
          <span class="ts-search-label hide-mobile">Search...</span>
          <kbd class="ts-kbd-pill hide-mobile">⌘K</kbd>
        </button>

        <!-- Theme Toggle (Single Instance) -->
        <ts-theme-toggle />

        <!-- Primary Action Button: Solid Black/White Pill CTA -->
        <a 
          [href]="portalUrl + '/auth/login'" 
          class="ts-btn-primary-cta"
          title="Sign in or join Acklet"
        >
          <span>Get Started</span>
          <ts-icon name="arrow-right" [size]="13" class="hide-mobile" />
        </a>
      </div>
    </header>
  `,
  styles: [`
    .ts-topbar-card {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      height: var(--header-height, 64px);
      padding: 0 16px;
      background: var(--shell-card);
      border: 1px solid var(--shell-card-border);
      border-radius: var(--shell-radius, 20px);
      box-shadow: var(--shell-card-shadow);
      position: relative;
      z-index: var(--ts-z-chrome, 11);
      user-select: none;
      box-sizing: border-box;
      transition: background-color var(--ts-dur-base, 200ms) var(--ts-ease),
                  border-color var(--ts-dur-base, 200ms) var(--ts-ease);
    }

    /* Left Zone */
    .ts-zone-left {
      display: flex;
      align-items: center;
      gap: 12px;
      justify-self: start;
    }

    .ts-mobile-menu-btn {
      display: none;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text);
      cursor: pointer;
      transition: background-color var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .ts-mobile-menu-btn:hover {
      background: var(--surface-hover);
    }

    /* Clean Mark + Wordmark */
    .ts-brand-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      color: var(--text);
      outline: none;
      transition: opacity var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .ts-brand-link:hover {
      opacity: 0.85;
    }

    .ts-brand-mark {
      color: var(--text);
      display: flex;
      align-items: center;
    }

    .ts-brand-wordmark {
      font-family: var(--font-heading, "Nunito", sans-serif);
      font-size: 19px;
      font-weight: 800;
      color: var(--text);
      letter-spacing: -0.02em;
    }

    /* Center Zone: Consistent Category Nav Links */
    .ts-zone-center {
      display: flex;
      align-items: center;
      justify-content: center;
      justify-self: center;
      height: 100%;
      overflow: hidden;
    }

    .ts-nav-links-cluster {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .ts-nav-link-item {
      display: inline-flex;
      align-items: center;
      padding: 6px 16px;
      font-family: var(--font-body, "Nunito", sans-serif);
      font-size: 14px;
      font-weight: 500;
      color: var(--text-muted);
      text-decoration: none;
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--ts-radius-full, 9999px);
      cursor: pointer;
      transition: background-color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  border-color var(--ts-dur-fast, 150ms) var(--ts-ease);
      white-space: nowrap;
      outline: none;
    }

    .ts-nav-link-item:hover {
      color: var(--text);
      background: var(--surface-hover);
    }

    .ts-nav-link-item:active {
      transform: scale(0.97);
    }

    .ts-nav-link-item.active {
      color: var(--text);
      background: var(--surface-active);
      border-color: transparent;
      font-weight: 700;
    }

    .ts-nav-link-item:focus:not(:focus-visible) {
      outline: none;
    }

    .ts-nav-link-item:focus-visible {
      outline: 2px solid var(--ts-focus-ring);
      outline-offset: 1px;
    }

    .ts-nav-btn-link {
      border: none;
    }

    /* Right Zone */
    .ts-zone-right {
      display: flex;
      align-items: center;
      gap: 10px;
      justify-self: end;
    }

    .ts-search-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 36px;
      padding: 0 12px;
      border-radius: var(--ts-radius-full, 9999px);
      background: var(--accent-soft);
      border: 1px solid var(--border);
      color: var(--text-muted);
      font-family: var(--font-body, "Nunito", sans-serif);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      outline: none;
      user-select: none;
      transition: all var(--ts-dur-fast, 150ms) var(--ts-ease),
                  transform 80ms ease;
    }

    .ts-search-btn:hover {
      background: var(--surface-hover);
      color: var(--text);
      border-color: var(--border);
    }

    .ts-search-btn:active {
      transform: scale(0.97);
    }

    .ts-search-btn:focus:not(:focus-visible) {
      outline: none;
    }

    .ts-search-btn:focus-visible {
      outline: 2px solid var(--ts-focus-ring) !important;
      outline-offset: 2px;
    }

    .ts-search-label {
      font-size: 13px;
    }

    .ts-kbd-pill {
      font-family: var(--ts-font-mono);
      font-size: 11px;
      padding: 1px 5px;
      border-radius: 5px;
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text-muted);
      line-height: 1.2;
    }

    /* Primary CTA Solid Black/White Pill */
    .ts-btn-primary-cta {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 36px;
      padding: 0 16px;
      border-radius: var(--ts-radius-full, 9999px);
      background: var(--text);
      color: var(--bg);
      font-family: var(--font-body, "Nunito", sans-serif);
      font-size: 13.5px;
      font-weight: 600;
      text-decoration: none;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
      transition: transform var(--ts-dur-fast, 150ms) var(--ts-ease),
                  opacity var(--ts-dur-fast, 150ms) var(--ts-ease);
      white-space: nowrap;
    }

    .ts-btn-primary-cta:hover {
      opacity: 0.92;
      transform: translateY(-1px);
    }

    .ts-btn-primary-cta:active {
      transform: translateY(0);
    }

    /* Responsive Breakpoints */
    @media (max-width: 1023px) {
      .ts-mobile-menu-btn {
        display: inline-flex;
      }
    }

    @media (max-width: 767px) {
      .ts-topbar-card {
        height: 56px;
        padding: 0 12px;
        border-radius: 16px;
      }
      .ts-zone-center {
        display: none;
      }
      .hide-mobile {
        display: none !important;
      }
      .ts-search-btn {
        padding: 0 8px;
      }
      .ts-btn-primary-cta {
        padding: 0 12px;
        font-size: 12.5px;
        height: 32px;
      }
    }
  `]
})
export class TsTopbarComponent {
  readonly currentCategory = input<string>('Utilities');
  readonly activeTabId = input<string>('');
  readonly showSidebar = input<boolean>(true);
  
  readonly tabChange = output<string>();
  readonly openCommandPalette = output<void>();
  readonly aboutClick = output<void>();

  readonly sidebarService = inject(ToolSidebarService);
  readonly portalUrl = getPortalUrl();
  readonly hubUrl = getToolsHubUrl();

  readonly categoryLinks: CategoryNavLink[] = [
    { id: 'Utilities', label: 'Utilities', url: getToolsHubUrl() + '?category=Utilities' },
    { id: 'Developer', label: 'Developer', url: getToolsHubUrl() + '?category=Developer' },
    { id: 'Security', label: 'Security', url: getToolsHubUrl() + '?category=Security' },
  ];

  onAboutClick(): void {
    this.aboutClick.emit();
    this.tabChange.emit('about');
  }
}


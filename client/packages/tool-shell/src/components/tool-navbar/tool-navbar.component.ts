import { Component, input, output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolRegistryItem, getToolsByCategory } from '@acklet/tool-registry';
import { getToolUrl, getPortalUrl } from '@acklet/shared';
import { ResponsiveService } from '../../services/responsive.service';
import { ToolThemeService } from '../../services/tool-theme.service';
import { TsIconComponent } from '../icon/ts-icon.component';

@Component({
  selector: 'lib-tool-navbar',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  template: `
    <header class="tool-navbar-root">
      <div class="tool-navbar-inner">
        
        <!-- 1. Left: Back link + Drawer button on phone + Brand glyph + Name -->
        <div class="tool-navbar-brand">
          @if (responsive.isPhone()) {
            <!-- Phone visible drawer toggle button -->
            <button
              type="button"
              class="btn-nav-icon drawer-trigger-btn"
              (click)="exploreClick.emit()"
              aria-label="Open tool navigation drawer"
              title="Explore all tools"
            >
              <ts-icon name="menu" [size]="20" />
            </button>
          } @else {
            <a [href]="portalUrl" class="btn-portal-back" title="Back to Acklet Portal" aria-label="Back to Acklet Portal">
              <span>←</span>
            </a>
          }

          <div class="brand-icon-box">
            <span class="tool-brand-glyph">{{ tool().name.charAt(0) }}</span>
          </div>
          <span class="tool-brand-name">{{ tool().name }}</span>
        </div>

        <!-- 2. Center: Category Peers (Desktop / Tablet Landscape only) -->
        @if (!responsive.isPhone() && !responsive.isTabletPortrait()) {
          <nav class="tool-category-peers" aria-label="Related tools">
            @for (peer of peerTools(); track peer.slug) {
              <a [href]="getToolUrl(peer)" class="peer-tool-link">
                {{ peer.name }}
              </a>
            }
          </nav>
        }

        <!-- 3. Right: Explore button (Desktop) OR Compact Overflow Menu (Phone) -->
        <div class="tool-navbar-actions">
          @if (!responsive.isPhone()) {
            <button 
              type="button" 
              class="btn-explore-drawer" 
              (click)="exploreClick.emit()"
              aria-label="Explore more tools"
            >
              <span class="explore-text">Explore more</span>
              <span class="explore-icon">☰</span>
            </button>
          } @else {
            <!-- Phone Compact Overflow Menu (Share, Save, Theme) -->
            <div class="mobile-overflow-container">
              <button
                type="button"
                class="btn-nav-icon overflow-trigger-btn"
                [class.active]="isOverflowOpen()"
                (click)="toggleOverflow($event)"
                aria-label="Tool options (Share, Theme, Home)"
                [attr.aria-expanded]="isOverflowOpen()"
                aria-haspopup="menu"
              >
                <ts-icon name="more-vertical" [size]="20" />
              </button>

              @if (isOverflowOpen()) {
                <div class="overflow-backdrop" (click)="isOverflowOpen.set(false)"></div>
                <div class="mobile-overflow-menu slide-fade-up" role="menu">
                  <!-- Share Action -->
                  <button type="button" role="menuitem" class="overflow-menu-btn" (click)="onShareTool()">
                    <ts-icon name="share-2" [size]="16" class="menu-btn-icon" />
                    <span>{{ shareButtonText() }}</span>
                  </button>

                  <!-- Theme Toggle Action -->
                  <button type="button" role="menuitem" class="overflow-menu-btn" (click)="onToggleTheme()">
                    <ts-icon [name]="themeService.effectiveTheme() === 'dark' ? 'sun' : 'moon'" [size]="16" class="menu-btn-icon" />
                    <span>Switch to {{ themeService.effectiveTheme() === 'dark' ? 'Light' : 'Dark' }} mode</span>
                  </button>

                  <div class="menu-divider"></div>

                  <!-- Back to Portal Home -->
                  <a [href]="portalUrl" class="overflow-menu-btn link-btn" (click)="isOverflowOpen.set(false)">
                    <ts-icon name="arrow-left" [size]="16" class="menu-btn-icon" />
                    <span>Back to Acklet Portal</span>
                  </a>
                </div>
              }
            </div>
          }
        </div>

      </div>
    </header>
  `,
  styles: [`
    .tool-navbar-root {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: var(--tool-bg-surface, #111726);
      border-bottom: 1px solid var(--tool-border, rgba(255, 255, 255, 0.08));
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow: var(--tool-shadow-sm, 0 1px 3px rgba(0,0,0,0.2));
      min-height: 56px;
      display: flex;
      align-items: center;
      width: 100%;
      padding-top: env(safe-area-inset-top, 0px);
      box-sizing: border-box;
    }

    .tool-navbar-inner {
      max-width: 1560px;
      width: 100%;
      margin: 0 auto;
      padding: 0 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    /* Left Brand */
    .tool-navbar-brand {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      flex-shrink: 0;
    }

    .brand-icon-box {
      width: 32px;
      height: 32px;
      border-radius: var(--tool-radius-md, 8px);
      background: var(--tool-brand-subtle, rgba(16, 185, 129, 0.15));
      border: 1px solid var(--tool-border, rgba(16, 185, 129, 0.25));
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .tool-brand-glyph {
      font-size: 1rem;
      font-weight: 700;
      color: var(--tool-brand-accent, #10b981);
    }

    .tool-brand-name {
      font-size: 1rem;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: var(--tool-text-primary, #f8fafc);
    }

    /* Center Category Peers */
    .tool-category-peers {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      overflow-x: auto;
      scrollbar-width: none;
    }

    .tool-category-peers::-webkit-scrollbar {
      display: none;
    }

    .peer-tool-link {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--tool-text-secondary, #94a3b8);
      padding: 0.35rem 0.75rem;
      border-radius: var(--tool-radius-md, 8px);
      text-decoration: none;
      white-space: nowrap;
      transition: all 0.15s ease;
      background: transparent;
    }

    .peer-tool-link:hover {
      color: var(--tool-text-primary, #f8fafc);
      background: var(--tool-bg-hover, rgba(255, 255, 255, 0.05));
    }

    /* Right Explore button */
    .tool-navbar-actions {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .btn-explore-drawer {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.875rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--tool-text-primary, #f8fafc);
      background: var(--tool-bg-subtle, rgba(255, 255, 255, 0.06));
      border: 1px solid var(--tool-border, rgba(255, 255, 255, 0.12));
      border-radius: var(--tool-radius-md, 8px);
      cursor: pointer;
      transition: all 0.2s ease;
      min-height: 36px;
    }

    .btn-explore-drawer:hover {
      background: var(--tool-bg-hover, rgba(255, 255, 255, 0.1));
      border-color: var(--tool-border-focus, #10b981);
    }

    .btn-portal-back {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: var(--tool-radius-sm, 6px);
      background: var(--tool-bg-subtle, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--tool-border, rgba(255, 255, 255, 0.1));
      color: var(--tool-text-secondary, #94a3b8);
      font-size: 0.95rem;
      text-decoration: none;
      transition: all 0.15s ease;
    }

    /* Touch-optimized Nav Icon Buttons (>= 44x44px target) */
    .btn-nav-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: 8px;
      background: transparent;
      border: none;
      color: var(--tool-text-primary, #f8fafc);
      cursor: pointer;
      touch-action: manipulation;
      transition: background 120ms ease;
    }

    .btn-nav-icon:active,
    .btn-nav-icon.active {
      background: var(--tool-bg-subtle, rgba(255, 255, 255, 0.08));
    }

    /* Mobile Overflow Menu Container */
    .mobile-overflow-container {
      position: relative;
    }

    .overflow-backdrop {
      position: fixed;
      inset: 0;
      z-index: 998;
      background: rgba(0, 0, 0, 0.3);
    }

    .mobile-overflow-menu {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 240px;
      background: var(--tool-bg-surface, #111726);
      border: 1px solid var(--tool-border, rgba(255, 255, 255, 0.12));
      border-radius: 12px;
      box-shadow: var(--tool-shadow-card, 0 12px 32px rgba(0, 0, 0, 0.5));
      padding: 6px;
      z-index: 999;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .overflow-menu-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      min-height: 44px;
      padding: 0 12px;
      background: transparent;
      border: none;
      border-radius: 8px;
      color: var(--tool-text-primary, #f8fafc);
      font-size: 13.5px;
      font-weight: 500;
      text-align: left;
      cursor: pointer;
      touch-action: manipulation;
      text-decoration: none;
      box-sizing: border-box;
      transition: background 120ms ease;
    }

    .overflow-menu-btn:hover,
    .overflow-menu-btn:active {
      background: var(--tool-bg-hover, rgba(255, 255, 255, 0.08));
    }

    .menu-btn-icon {
      color: var(--tool-brand-accent, #10b981);
      flex-shrink: 0;
    }

    .menu-divider {
      height: 1px;
      background: var(--tool-border, rgba(255, 255, 255, 0.08));
      margin: 4px 6px;
    }

    .slide-fade-up {
      animation: navMenuSlideUp 180ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes navMenuSlideUp {
      from {
        opacity: 0;
        transform: translateY(-6px) scale(0.97);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* Mobile Performance: Disable GPU-heavy blur on phone */
    @media (max-width: 640px) {
      .tool-navbar-root {
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        background: var(--tool-bg-surface, #111726) !important;
      }
      .mobile-overflow-menu {
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .slide-fade-up {
        animation: none !important;
      }
      .btn-nav-icon,
      .overflow-menu-btn {
        transition: none !important;
      }
    }
  `]
})
export class ToolNavbarComponent {
  readonly tool = input.required<ToolRegistryItem>();
  readonly exploreClick = output<void>();

  readonly responsive = inject(ResponsiveService);
  readonly themeService = inject(ToolThemeService);

  readonly portalUrl = getPortalUrl();
  readonly isOverflowOpen = signal<boolean>(false);
  readonly shareButtonText = signal<string>('Share this tool');

  readonly peerTools = computed(() => {
    const current = this.tool();
    const categoryPeers = getToolsByCategory(current.category, current.slug);
    return categoryPeers.slice(0, 4);
  });

  toggleOverflow(event: Event): void {
    event.stopPropagation();
    this.isOverflowOpen.update(v => !v);
  }

  async onShareTool(): Promise<void> {
    this.isOverflowOpen.set(false);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: this.tool().name,
          text: this.tool().shortDescription,
          url: window.location.href
        });
      } catch (_) {}
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(window.location.href);
        this.shareButtonText.set('Link copied!');
        setTimeout(() => this.shareButtonText.set('Share this tool'), 2000);
      } catch (_) {}
    }
  }

  onToggleTheme(): void {
    this.themeService.toggleTheme();
    this.isOverflowOpen.set(false);
  }

  getToolUrl(item: ToolRegistryItem): string {
    return getToolUrl(item.subdomain || item.slug);
  }
}

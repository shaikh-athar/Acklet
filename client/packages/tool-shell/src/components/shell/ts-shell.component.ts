// packages/tool-shell/src/components/shell/ts-shell.component.ts
import { Component, input, output, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolRegistryItem, getAllTools } from '@acklet/tool-registry';
import { ToolShellConfig, ToolTab } from '../../models/tool-shell.models';
import { ToolSidebarService } from '../../services/tool-sidebar.service';
import { ToolThemeService } from '../../services/tool-theme.service';
import { TsTopbarComponent } from '../topbar/ts-topbar.component';
import { TsSidebarComponent } from '../sidebar/ts-sidebar.component';
import { TsCommandPaletteComponent } from '../search/ts-command-palette.component';
import { TsAboutCardComponent } from '../primitive/ts-about-card.component';
import { TsAboutPanelComponent } from '../about-modal/ts-about-panel.component';
import { TsBackdropComponent } from '../primitive/ts-backdrop.component';

@Component({
  selector: 'lib-tool-layout',
  standalone: true,
  imports: [
    CommonModule, 
    TsTopbarComponent, 
    TsSidebarComponent, 
    TsCommandPaletteComponent,
    TsAboutCardComponent,
    TsAboutPanelComponent,
    TsBackdropComponent
  ],
  template: `
    <div class="ts-root" [attr.data-theme]="themeService.effectiveTheme()">
      
      <!-- Skip to main content accessibility link -->
      <a href="#main-content" class="ts-skip-to-content">Skip to content</a>

      <!-- Background Ambient Glow (Contained within viewport, non-scrolling) -->
      <ts-backdrop [accentHue]="tool()?.accentHue ?? null" />

      <!-- Three-Card CSS Grid Shell (Fills 100dvh exactly) -->
      <div class="ts-shell-grid" [class.no-sidebar]="!showSidebar()" [class.no-topbar]="!showTopbar()">
        
        <!-- 1. Top Card: NAVBAR (Full width, 64px tall) -->
        @if (showTopbar()) {
          <div class="ts-navbar-card-slot">
            <ts-topbar 
              [currentCategory]="tool()?.category || 'Utilities'"
              [activeTabId]="activeTabId()"
              [showSidebar]="showSidebar()"
              (tabChange)="onTabChange($event)"
              (aboutClick)="showAboutPanel.set(true)"
              (openCommandPalette)="showCommandPalette.set(true)"
            />
          </div>
        }

        <!-- Bottom Row: SIDEBAR Card (272px / 72px) + MAIN CONTENT Card (1fr) -->
        <div 
          class="ts-bottom-row-grid" 
          [class.no-sidebar]="!showSidebar()"
          [style.--sidebar-current-width.px]="sidebarService.isCollapsed() ? 72 : sidebarService.width()"
        >
          <!-- 2. Left Card: SIDEBAR (Scrolls internally) -->
          @if (showSidebar()) {
            <ts-sidebar 
              [tools]="allTools()" 
              [currentSlug]="tool()?.slug || ''"
            />
          }

          <!-- 3. Right/Center Card: MAIN CONTENT (Scrolls inside itself) -->
          <main 
            id="main-content" 
            class="ts-main-content-card" 
            role="main" 
            tabindex="-1"
          >
            <div class="ts-main-scroll-container" [class.full-bleed]="isFullBleed()">
              
              <!-- Primary Tool Workspace Content -->
              <div class="ts-tool-content-surface" [class.full-bleed]="isFullBleed()">
                <ng-content />
              </div>

              <!-- About & Documentation Card Below Tool -->
              @if (showDescriptionCard() && tool()) {
                <section class="ts-tool-description-section" aria-label="About this tool">
                  <ts-about-card 
                    [tool]="tool()!" 
                    (readMore)="showAboutPanel.set(true)"
                  />
                </section>
              }

            </div>
          </main>

        </div>
      </div>

      <!-- Overlays: About Panel Drawer & Command Palette -->
      <ts-about-panel 
        [isOpen]="showAboutPanel()" 
        [tool]="tool()" 
        (close)="showAboutPanel.set(false)"
      />

      <ts-command-palette 
        [isOpen]="showCommandPalette()" 
        [tools]="allTools()" 
        (close)="showCommandPalette.set(false)"
      />

    </div>
  `,
  styles: [`
    /* Root Viewport Lock */
    .ts-root {
      width: 100vw;
      height: 100dvh;
      overflow: hidden;
      position: relative;
      background-color: var(--page-bg);
      color: var(--text);
      font-family: var(--font-body, "Nunito", sans-serif);
      padding: var(--shell-padding, 12px);
      box-sizing: border-box;
      transition: background-color var(--ts-dur-base, 200ms) var(--ts-ease);
    }

    /* Skip to content */
    .ts-skip-to-content {
      position: absolute;
      top: -60px;
      left: 16px;
      background: var(--text);
      color: var(--bg);
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 13px;
      z-index: 9999;
      text-decoration: none;
      transition: top 150ms ease;
    }
    .ts-skip-to-content:focus {
      top: 16px;
      outline: 2px solid var(--ts-focus-ring);
    }

    /* Master 3-Card Grid: Row 1 = Navbar (64px), Row 2 = Sidebar + Main Content */
    .ts-shell-grid {
      display: grid;
      grid-template-rows: var(--header-height, 64px) 1fr;
      gap: var(--shell-gap, 12px);
      width: 100%;
      height: 100%;
      min-height: 0;
      min-width: 0;
      box-sizing: border-box;
      position: relative;
      z-index: var(--ts-z-chrome, 10);
    }

    .ts-shell-grid.no-topbar {
      grid-template-rows: 1fr;
    }

    .ts-navbar-card-slot {
      width: 100%;
      min-width: 0;
      height: var(--header-height, 64px);
    }

    /* Bottom Row Grid: Sidebar (272px / 72px) + Main Content Card (1fr) */
    .ts-bottom-row-grid {
      display: grid;
      grid-template-columns: var(--sidebar-current-width, 272px) 1fr;
      gap: var(--shell-gap, 12px);
      width: 100%;
      height: 100%;
      min-height: 0;
      min-width: 0;
      overflow: hidden;
      transition: grid-template-columns 200ms ease-out;
    }

    .ts-bottom-row-grid.no-sidebar {
      grid-template-columns: 1fr;
    }

    /* Main Content Card: Standalone Floating Card that scrolls inside itself */
    .ts-main-content-card {
      height: 100%;
      min-height: 0;
      min-width: 0;
      overflow-y: auto;
      overflow-x: hidden;
      background: var(--shell-card);
      border: 1px solid var(--shell-card-border);
      border-radius: var(--shell-radius, 20px);
      box-shadow: var(--shell-card-shadow);
      box-sizing: border-box;
      scrollbar-width: thin;
      scrollbar-color: var(--ts-scrollbar-thumb) transparent;
      outline: none;
      transition: background-color var(--ts-dur-base, 200ms) var(--ts-ease),
                  border-color var(--ts-dur-base, 200ms) var(--ts-ease);
    }

    .ts-main-scroll-container {
      width: 100%;
      max-width: 1080px;
      margin: 0 auto;
      padding: 24px 28px 48px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      box-sizing: border-box;
    }

    .ts-main-scroll-container.full-bleed {
      max-width: 100%;
      padding: 0;
      gap: 0;
    }

    .ts-tool-content-surface {
      width: 100%;
      display: flex;
      flex-direction: column;
      contain: layout paint;
      position: relative;
      z-index: var(--ts-z-surface, 20);
    }

    .ts-tool-description-section {
      width: 100%;
      position: relative;
      z-index: var(--ts-z-surface, 20);
    }

    /* Responsive Rules */
    @media (min-width: 1440px) {
      .ts-main-scroll-container {
        padding: 32px 36px 56px;
      }
    }

    @media (min-width: 1920px) {
      .ts-main-scroll-container {
        max-width: 1280px;
      }
    }

    @media (max-width: 1023px) {
      .ts-bottom-row-grid,
      .ts-bottom-row-grid.no-sidebar {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 767px) {
      .ts-root {
        padding: 8px;
      }
      .ts-shell-grid {
        grid-template-rows: 56px 1fr;
        gap: 8px;
      }
      .ts-bottom-row-grid {
        gap: 8px;
      }
      .ts-navbar-card-slot {
        height: 56px;
      }
      .ts-main-content-card {
        border-radius: 16px;
      }
      .ts-main-scroll-container {
        padding: 16px 14px 32px;
        gap: 16px;
      }
    }
  `]
})
export class ToolLayoutComponent implements OnInit {
  readonly tool = input<ToolRegistryItem | null>(null);
  readonly config = input<ToolShellConfig | null>(null);
  readonly tabChange = output<string>();

  readonly allTools = signal<ToolRegistryItem[]>(getAllTools());
  readonly showCommandPalette = signal<boolean>(false);
  readonly showAboutPanel = signal<boolean>(false);
  readonly sidebarService = inject(ToolSidebarService);
  readonly themeService = inject(ToolThemeService);

  readonly internalActiveTab = signal<string>('');

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('panel') === 'about') {
        this.showAboutPanel.set(true);
      }
    }
  }

  readonly showSidebar = computed(() => {
    return this.config()?.showSidebar ?? true;
  });

  readonly showTopbar = computed(() => {
    return this.config()?.showTopbar ?? true;
  });

  readonly isFullBleed = computed(() => {
    return this.config()?.layout === 'fullBleed' || this.tool()?.layout === 'fullBleed';
  });

  readonly showDescriptionCard = computed(() => {
    return this.config()?.showDescriptionCard !== false && this.activeTabId() !== 'about';
  });

  readonly effectiveTabs = computed<ToolTab[]>(() => {
    if (this.config()?.tabs && this.config()!.tabs!.length > 0) {
      return this.config()!.tabs!;
    }
    const t = this.tool();
    if (!t) return [];

    const tabs: ToolTab[] = [];
    if (t.tabs && t.tabs.length > 0) {
      t.tabs.forEach(tab => {
        tabs.push({ id: tab.id, label: tab.label, icon: tab.icon, badge: tab.badge });
      });
    } else {
      tabs.push({ id: 'tool', label: t.name, icon: t.icon });
    }

    tabs.push({ id: 'about', label: 'About', icon: 'info' });
    return tabs;
  });

  readonly activeTabId = computed<string>(() => {
    if (this.internalActiveTab()) {
      return this.internalActiveTab();
    }
    const tabs = this.effectiveTabs();
    return tabs.length > 0 ? tabs[0].id : '';
  });

  onTabChange(tabId: string): void {
    this.internalActiveTab.set(tabId);
    this.tabChange.emit(tabId);

    if (tabId === 'about') {
      this.showAboutPanel.set(true);
    } else {
      this.showAboutPanel.set(false);
    }
  }
}

// packages/tool-shell/src/components/shell/ts-shell.component.ts
import { Component, input, output, signal, computed, inject, OnInit, AfterViewInit, ElementRef, viewChild, isDevMode } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolRegistryItem, getAllTools } from '@acklet/tool-registry';
import { ToolShellConfig, ToolTab } from '../../models/tool-shell.models';
import { ToolSidebarService } from '../../services/tool-sidebar.service';
import { ToolThemeService } from '../../services/tool-theme.service';
import { ToolCapsuleService } from '../../services/tool-capsule.service';
import { TsTopbarComponent } from '../topbar/ts-topbar.component';
import { TsSidebarComponent } from '../sidebar/ts-sidebar.component';
import { TsCommandPaletteComponent } from '../search/ts-command-palette.component';
import { TsAboutCardComponent } from '../primitive/ts-about-card.component';
import { TsAboutPanelComponent } from '../about-modal/ts-about-panel.component';
import { TsBackdropComponent } from '../primitive/ts-backdrop.component';
import { TsToolContentComponent } from '../primitive/ts-tool-content.component';
import { TsToolHeaderComponent } from '../header/ts-tool-header.component';
import { TsToolDetailsComponent } from '../rail/ts-tool-details.component';
import { TsToolRelatedComponent } from '../rail/ts-tool-related.component';

@Component({
  selector: 'ts-shell, lib-tool-layout',
  standalone: true,
  imports: [
    CommonModule,
    TsTopbarComponent,
    TsSidebarComponent,
    TsCommandPaletteComponent,
    TsAboutCardComponent,
    TsAboutPanelComponent,
    TsBackdropComponent,
    TsToolContentComponent,
    TsToolDetailsComponent,
    TsToolRelatedComponent
  ],
  template: `
    <div 
      class="ts-root" 
      [attr.data-theme]="themeService.effectiveTheme()"
      [attr.data-accent]="tool()?.accent || 'neutral'"
      [attr.data-surface]="effectiveSurface()"
    >
      
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
              [tool]="tool()"
              [currentCategory]="tool()?.category || 'Utilities'"
              [activeTabId]="activeTabId()"
              [showSidebar]="showSidebar()"
              [showPrimaryAction]="showPrimaryAction()"
              [showSearch]="showSearch()"
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
              [tool]="tool()"
              [currentSlug]="tool()?.slug || ''"
            />
          }

          <!-- 3. Right/Center Card: MAIN CONTENT (Scrolls inside itself) -->
          <main 
            #mainCard
            id="main-content" 
            class="ts-main-content-card" 
            role="main" 
            tabindex="-1"
          >
            <!-- Visually hidden heading for screen readers and document outline -->
            @if (tool(); as currentTool) {
              <h1 class="sr-only">{{ currentTool.name }}</h1>
            }

            <div class="ts-main-scroll-container" [class.full-bleed]="isFullBleed()">
              <!-- WORKSPACE SECTION (Desktop One-Screen Workspace) -->
              <div id="tool" class="ts-workspace-section" [class.full-bleed]="isFullBleed()">
                <div class="ts-workspace-grid" [class.full-bleed]="isFullBleed()">
                  <!-- Left: the tool as ONE raised card on the base -->
                  <div class="ts-tool-card-surface ts-entry-panel" [class.full-bleed]="isFullBleed()">
                    <ng-content />
                  </div>

                  <!-- Right: sticky info rail -->
                  @if (!isFullBleed()) {
                    <aside class="ts-info-rail ts-entry-rail" aria-label="Tool specifications and related tools">
                      <ts-tool-details [tool]="tool()" />
                      <ts-tool-related [tool]="tool()" />
                    </aside>
                  }
                </div>
              </div>

              <!-- 4. BELOW the grid, full width: About, How to use, FAQ -->
              @if (!isFullBleed()) {
                <div class="ts-content-below-grid ts-entry-content">
                  <ts-tool-content [tool]="tool()" />
                </div>
              }

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
    /* Root Viewport Lock & Comprehensive Theme Variables */
    :host,
    .ts-root,
    .ts-root[data-theme="dark"] {
      --page-bg: #0F1011;
      --bg: #0F1011;
      --ts-main-bg: #0F1011;
      --ts-surface-base: #0F1011;
      --ts-surface-raised: #141416;
      --ts-surface-raised-border: rgba(255, 255, 255, 0.07);
      --ts-surface-raised-shadow: 0 1px 2px rgba(0, 0, 0, 0.4), 0 14px 28px -18px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.04);
      --ts-surface-inset: #1A1B1E;
      --ts-surface-inset-border: rgba(255, 255, 255, 0.06);
      --shell-card: var(--ts-surface-raised);
      --shell-card-border: var(--ts-surface-raised-border);
      --shell-card-shadow: var(--ts-surface-raised-shadow);
      --surface: var(--ts-surface-raised);
      --surface-hover: #1E1F23;
      --surface-active: #27282D;
      --border: var(--ts-surface-raised-border);
      --border-accent: #FCFCFC;
      --text: #FCFCFC;
      --text-2: #B3B3B8;
      --text-3: #8E8E93;
      --text-muted: #B3B3B8;
      --text-subtle: #8E8E93;
      --accent: #FFFFFF;
      --accent-ink: #000000;
      --accent-soft: #1C1C1F;
      --accent-border: #27272A;
      --on-accent: #000000;
      --spotlight: rgba(252, 252, 252, 0.08);
      --ts-focus-ring: #FCFCFC;
      --ts-raised: var(--ts-surface-raised);
      --ts-raised-hover: #1E1F23;
      --ts-scrollbar-thumb: #27272A;
      --ts-scrollbar-thumb-hover: #3F3F46;
      --ts-scrollbar-track: transparent;
      --fx-grid-size: 32px;
      --fx-grid: color-mix(in srgb, var(--accent-strong, var(--accent)) 9%, transparent);
      --fx-glow-1: color-mix(in srgb, var(--accent) 14%, transparent);
      --fx-glow-2: color-mix(in srgb, var(--accent) 6%, transparent);
      --fx-highlight: rgba(255, 255, 255, 0.03);
      --shell-padding: 12px;
      --shell-gap: 12px;
      --header-height: 64px;
      --sidebar-width: 272px;
      --sidebar-collapsed-width: 72px;
      --shell-radius: 20px;
      --ts-radius-card: 20px;
      --ts-radius-inner: 16px;
      --ts-radius-control: 12px;
      --ts-radius-tile: 16px;
      --ts-radius-full: 9999px;
      --font-body: "Nunito", system-ui, -apple-system, sans-serif;
      --font-heading: "Nunito", system-ui, -apple-system, sans-serif;
    }

    .ts-root[data-theme="light"] {
      --page-bg: #F7F8F8;
      --bg: #F7F8F8;
      --ts-main-bg: #F7F8F8;
      --ts-surface-base: #F7F8F8;
      --ts-surface-raised: #FFFFFF;
      --ts-surface-raised-border: rgba(15, 23, 42, 0.06);
      --ts-surface-raised-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 14px 28px -18px rgba(15, 23, 42, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.9);
      --ts-surface-inset: #F6F7F7;
      --ts-surface-inset-border: rgba(15, 23, 42, 0.05);
      --shell-card: var(--ts-surface-raised);
      --shell-card-border: var(--ts-surface-raised-border);
      --shell-card-shadow: var(--ts-surface-raised-shadow);
      --surface: var(--ts-surface-raised);
      --surface-hover: #F6F7F7;
      --surface-active: #EDEEEE;
      --border: var(--ts-surface-raised-border);
      --border-accent: #09090B;
      --text: #09090B;
      --text-2: #52525B;
      --text-3: #6B7280;
      --text-muted: #52525B;
      --text-subtle: #6B7280;
      --accent: #09090B;
      --accent-ink: #FFFFFF;
      --accent-light: color-mix(in srgb, var(--accent) 40%, #FFFFFF);
      --accent-soft: #F4F4F5;
      --accent-border: rgba(0, 0, 0, 0.08);
      --on-accent: #FFFFFF;
      --spotlight: rgba(0, 0, 0, 0.04);
      --ts-focus-ring: #09090B;
      --ts-raised: var(--ts-surface-raised);
      --ts-raised-hover: #F6F7F7;
      --ts-scrollbar-thumb: #D4D4E8;
      --ts-scrollbar-thumb-hover: #A1A1AA;
      --ts-scrollbar-track: transparent;
      --fx-grid-size: 32px;
      --fx-grid: color-mix(in srgb, var(--accent-strong, var(--accent)) 6%, transparent);
      --fx-glow-1: color-mix(in srgb, var(--accent-light) 55%, transparent);
      --fx-glow-2: color-mix(in srgb, var(--accent-light) 22%, transparent);
      --fx-highlight: rgba(255, 255, 255, 0.80);
    }

    .ts-root[data-accent="teal"] {
      --accent: #2DD4BF;
      --accent-ink: #042F2B;
      --accent-soft: #10302D;
      --accent-border: #1F4A45;
    }

    .ts-root[data-theme="light"][data-accent="teal"] {
      --accent: #0F766E;
      --accent-ink: #FFFFFF;
      --accent-soft: #E7F5F3;
      --accent-border: #BFE3DE;
    }

    .ts-root {
      width: 100vw;
      height: 100dvh;
      max-height: 100dvh;
      overflow: hidden;
      position: relative;
      background-color: var(--page-bg);
      color: var(--text);
      font-family: var(--font-body, "Nunito", sans-serif);
      padding: max(var(--shell-padding, 12px), env(safe-area-inset-top, 0px))
               max(var(--shell-padding, 12px), env(safe-area-inset-right, 0px))
               max(var(--shell-padding, 12px), env(safe-area-inset-bottom, 0px))
               max(var(--shell-padding, 12px), env(safe-area-inset-left, 0px));
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

    /* Bottom Row Grid: Sidebar (272px / 72px) + Main Content Card (minmax(0, 1fr)) */
    .ts-bottom-row-grid {
      display: grid;
      grid-template-columns: var(--sidebar-current-width, 72px) minmax(0, 1fr);
      gap: var(--shell-gap, 12px);
      width: 100%;
      height: 100%;
      min-height: 0;
      min-width: 0;
      overflow: hidden;
      transition: grid-template-columns 220ms ease-out;
    }

    .ts-bottom-row-grid.no-sidebar {
      grid-template-columns: minmax(0, 1fr);
    }

    /* Accessibility visually-hidden utility */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    /* Main Content Card: Standalone Floating Card with non-scrolling background */
    /* Main Content Card: Semi-transparent sheet over single page background */
    .ts-main-content-card {
      position: relative;
      height: 100%;
      min-height: 0;
      min-width: 0;
      overflow: hidden;
      contain: layout;
      container-type: inline-size;
      container-name: main-card;
      isolation: isolate;
      background: var(--ts-main-surface, rgba(255, 255, 255, 0.45));
      border: 1px solid var(--ts-main-border, rgba(255, 255, 255, 0.60));
      border-radius: var(--shell-radius, 20px);
      box-shadow: var(--shell-card-shadow);
      box-sizing: border-box;
      outline: none;
      transition: background-color var(--ts-dur-base, 200ms) var(--ts-ease),
                  border-color var(--ts-dur-base, 200ms) var(--ts-ease);
    }

    .ts-main-scroll-container {
      position: relative;
      z-index: 1;
      height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      scrollbar-width: thin;
      scrollbar-color: var(--ts-scrollbar-thumb) transparent;
      width: 100%;
      max-width: 1440px;
      margin: 0 auto;
      padding: var(--ts-main-pad, 24px);
      display: flex;
      flex-direction: column;
      gap: 32px;
      box-sizing: border-box;
      /* Top scroll fade effect */
      -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 24px, #000 100%);
              mask-image: linear-gradient(to bottom, transparent 0, #000 24px, #000 100%);
    }

    .ts-main-scroll-container.full-bleed {
      max-width: 100%;
      padding: 0;
      gap: 0;
      -webkit-mask-image: none;
              mask-image: none;
    }

    /* ══ WORKSPACE SECTION: Desktop One-Screen Workspace ══ */
    .ts-workspace-section {
      width: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
    }

    .ts-workspace-section.full-bleed {
      height: 100%;
    }

    @media (min-width: 1024px) and (min-height: 600px) {
      .ts-workspace-section:not(.full-bleed) {
        --ts-workspace-h: calc(100dvh - 2 * var(--shell-padding, 12px) - var(--header-height, 64px) - var(--shell-gap, 12px) - 2 * var(--ts-main-pad, 24px));
        height: var(--ts-workspace-h);
        min-height: 520px;
        flex-shrink: 0;
      }
      .ts-workspace-grid:not(.full-bleed) {
        height: 100%;
        min-height: 0;
      }
      .ts-tool-card-surface:not(.full-bleed) {
        height: 100%;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }
      .ts-info-rail {
        height: 100%;
        min-height: 0;
        overflow: hidden;
      }
    }

    /* ══ 2. WORKSPACE GRID: Tool (left) + Info Rail (right) ════════ */
    .ts-workspace-grid {
      display: grid;
      grid-template-columns: 100%;
      gap: 24px;
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    .ts-workspace-grid.full-bleed {
      display: block;
      gap: 0;
    }

    /* Container query on the main card */
    /* 1. container >= 960px: tool + info rail side by side */
    @container main-card (min-width: 960px) {
      .ts-workspace-grid:not(.full-bleed) {
        grid-template-columns: minmax(0, 1fr) 320px;
        align-items: stretch;
        gap: 24px;
      }
      .ts-info-rail {
        display: flex;
        flex-direction: column;
        gap: 16px;
        align-self: stretch;
      }
    }

    @container main-card (min-width: 960px) and (max-width: 1099px) {
      .ts-workspace-grid:not(.full-bleed) {
        gap: 16px;
      }
    }

    /* 2. container 600-959px: one column, the info rail goes below the tool as a 2-column grid */
    @container main-card (min-width: 600px) and (max-width: 959px) {
      .ts-workspace-grid:not(.full-bleed) {
        grid-template-columns: 100%;
        gap: 20px;
      }
      .ts-info-rail {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        align-self: stretch;
      }
    }

    /* 3. container < 600px: single column, smaller paddings */
    @container main-card (max-width: 599px) {
      .ts-workspace-grid:not(.full-bleed) {
        grid-template-columns: 100%;
        gap: 16px;
      }
      .ts-info-rail {
        display: flex;
        flex-direction: column;
        gap: 12px;
        align-self: stretch;
      }
      .ts-main-scroll-container {
        padding: 16px;
        gap: 16px;
      }
    }

    /* Tool raised card on the base (always solid raised surface) */
    .ts-tool-card-surface {
      background: var(--ts-surface-raised, #FFFFFF);
      border: 1px solid var(--ts-surface-raised-border, rgba(15, 23, 42, 0.06));
      border-radius: var(--ts-radius-card, 20px);
      padding: 24px;
      box-shadow: var(--ts-surface-raised-shadow);
      box-sizing: border-box;
      min-width: 0;
      width: 100%;
      position: relative;
      z-index: var(--ts-z-surface, 20);
    }

    .ts-tool-card-surface.full-bleed {
      background: transparent;
      border: none;
      border-radius: 0;
      padding: 0;
      box-shadow: none;
    }

    /* Cleanly hide duplicate header & trust chips if present in tool child template */
    ::ng-deep .ts-tool-card-surface .tool-header-block,
    ::ng-deep .ts-tool-card-surface .trust-chips-row {
      display: none !important;
    }

    /* Right: Info Rail base rules */
    .ts-info-rail {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    /* Below grid full-width content */
    .ts-content-below-grid {
      width: 100%;
      min-width: 0;
      margin-top: 8px;
    }

    .ts-tool-description-section {
      width: 100%;
      position: relative;
      z-index: var(--ts-z-surface, 20);
    }

    /* ══ ENTRY ANIMATION: 8px slide/fade with 40ms stagger ═══════ */
    @keyframes tsFadeSlideIn {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .ts-entry-panel {
      animation: tsFadeSlideIn var(--ts-dur-enter, 420ms) var(--ts-ease-out) 40ms forwards;
    }

    .ts-entry-rail {
      animation: tsFadeSlideIn var(--ts-dur-enter, 420ms) var(--ts-ease-out) 80ms forwards;
    }

    .ts-entry-content {
      animation: tsFadeSlideIn var(--ts-dur-enter, 420ms) var(--ts-ease-out) 120ms forwards;
    }

    /* Failsafe: After 1s, force all animated items to full opacity and reset transform */
    .ts-entry-panel.is-forced-visible,
    .ts-entry-rail.is-forced-visible,
    .ts-entry-content.is-forced-visible {
      opacity: 1 !important;
      transform: none !important;
      animation: none !important;
    }

    @media (prefers-reduced-motion: reduce) {
      .ts-entry-panel,
      .ts-entry-rail,
      .ts-entry-content {
        animation: none !important;
        opacity: 1 !important;
        transform: none !important;
      }
    }

    /* Responsive Rules */
    @media (min-width: 1440px) {
      .ts-main-scroll-container {
        padding: 28px 32px 56px;
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
        padding: max(8px, env(safe-area-inset-top, 0px))
                 max(8px, env(safe-area-inset-right, 0px))
                 max(8px, env(safe-area-inset-bottom, 0px))
                 max(8px, env(safe-area-inset-left, 0px));
      }
      .ts-shell-grid {
        grid-template-rows: 56px 1fr;
        gap: 8px;
      }
      .ts-shell-grid.no-topbar {
        grid-template-rows: 1fr;
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
        padding: 16px;
        gap: 16px;
      }
      .ts-tool-card-surface {
        padding: 16px;
        border-radius: 16px;
      }
    }
  `]
})
export class ToolLayoutComponent implements OnInit, AfterViewInit {
  readonly tool = input<ToolRegistryItem | null>(null);
  readonly config = input<ToolShellConfig | null>(null);
  readonly surface = input<'glass' | 'tinted' | 'solid'>('glass');
  readonly tabChange = output<string>();

  readonly mainCard = viewChild<ElementRef<HTMLElement>>('mainCard');

  readonly allTools = signal<ToolRegistryItem[]>(getAllTools());
  readonly showCommandPalette = signal<boolean>(false);
  readonly showAboutPanel = signal<boolean>(false);
  readonly sidebarService = inject(ToolSidebarService);
  readonly themeService = inject(ToolThemeService);
  private readonly capsuleService = inject(ToolCapsuleService);

  readonly internalActiveTab = signal<string>('');
  private readonly devSurfaceOverride = signal<'glass' | 'tinted' | 'solid' | null>(null);

  readonly effectiveSurface = computed<'glass' | 'tinted' | 'solid'>(() => {
    return this.devSurfaceOverride() ?? this.surface() ?? 'glass';
  });

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('panel') === 'about') {
        this.showAboutPanel.set(true);
      }

      if (isDevMode()) {
        const surfParam = params.get('surface');
        if (surfParam === 'glass' || surfParam === 'tinted' || surfParam === 'solid') {
          this.devSurfaceOverride.set(surfParam);
        }
      }

      // Safety failsafe: After 1s, force all entrance elements visible
      setTimeout(() => {
        this.forceAllVisible();
      }, 1000);

      // Back/Forward Cache safety: Reset animation state on pageshow
      window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
          this.forceAllVisible();
        }
      });
    }
  }

  private forceAllVisible(): void {
    const card = this.mainCard()?.nativeElement;
    if (!card) return;
    const items = card.querySelectorAll('.ts-entry-panel, .ts-entry-rail, .ts-entry-content');
    items.forEach(el => el.classList.add('is-forced-visible'));
  }

  ngAfterViewInit(): void {
    const card = this.mainCard()?.nativeElement;
    if (card) {
      const isDark = this.themeService.effectiveTheme() === 'dark';
      this.capsuleService.playToolReveal(card, isDark);
    }
  }

  readonly showSidebar = computed(() => {
    return this.config()?.showSidebar ?? true;
  });

  readonly showTopbar = computed(() => {
    return this.config()?.showTopbar ?? true;
  });

  readonly showPrimaryAction = computed(() => {
    return this.config()?.showPrimaryAction ?? false;
  });

  readonly showSearch = computed(() => {
    return this.config()?.showSearch ?? true;
  });

  readonly isFullBleed = computed(() => {
    return this.config()?.layout === 'fullBleed' || this.tool()?.layout === 'fullBleed';
  });

  readonly showDescriptionCard = computed(() => {
    return this.config()?.showDescriptionCard === true && this.activeTabId() !== 'about';
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

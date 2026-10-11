// packages/tool-shell/src/components/shell/ts-shell.component.ts
import { Component, input, output, signal, computed, inject, OnInit, AfterViewInit, ElementRef, viewChild } from '@angular/core';
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
    TsToolHeaderComponent,
    TsToolDetailsComponent,
    TsToolRelatedComponent
  ],
  template: `
    <div 
      class="ts-root" 
      [attr.data-theme]="themeService.effectiveTheme()"
      [attr.data-accent]="tool()?.accent || 'neutral'"
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
            <!-- Background Layer B: Checkered grid + ambient glow inside main card -->
            <div class="ts-bg ts-bg-card" aria-hidden="true">
              <div class="ts-bg-grid"></div>
            </div>

            <div class="ts-main-scroll-container" [class.full-bleed]="isFullBleed()">
              
              <!-- 1. TOOL HEADER (full width, top) -->
              @if (!isFullBleed()) {
                <ts-tool-header 
                  class="ts-entry-header"
                  [tool]="tool()" 
                  (openAbout)="showAboutPanel.set(true)" 
                />
              }

              <!-- 2. WORKSPACE GRID below the header -->
              <div class="ts-workspace-grid" [class.full-bleed]="isFullBleed()">
                
                <!-- Left: the tool in a tinted panel with white card layer inside -->
                <div id="tool" class="ts-tool-panel-wrapper ts-entry-panel" [class.full-bleed]="isFullBleed()">
                  <div class="ts-tool-card-surface">
                    <ng-content />
                  </div>
                </div>

                <!-- Right: sticky info rail -->
                @if (!isFullBleed()) {
                  <aside class="ts-info-rail ts-entry-rail" aria-label="Tool specifications and related tools">
                    <ts-tool-details [tool]="tool()" />
                    <ts-tool-related [tool]="tool()" />
                  </aside>
                }
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
      --page-bg: #0B0B0B;
      --bg: #0B0B0B;
      --shell-card: #141414;
      --shell-card-border: #27272A;
      --shell-card-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
      --surface: #141414;
      --surface-hover: #1E1E22;
      --surface-active: #27272A;
      --border: #27272A;
      --border-accent: #FCFCFC;
      --text: #FCFCFC;
      --text-muted: #A1A1AA;
      --text-subtle: #71717A;
      --accent: #FFFFFF;
      --accent-ink: #000000;
      --accent-soft: #1C1C1F;
      --accent-border: #27272A;
      --on-accent: #000000;
      --spotlight: rgba(252, 252, 252, 0.08);
      --ts-focus-ring: #FCFCFC;
      --ts-raised: #1C1C1F;
      --ts-raised-hover: #27272A;
      --ts-scrollbar-thumb: #27272A;
      --ts-scrollbar-thumb-hover: #3F3F46;
      --ts-scrollbar-track: transparent;
      --shell-padding: 12px;
      --shell-gap: 12px;
      --header-height: 64px;
      --sidebar-width: 272px;
      --sidebar-collapsed-width: 72px;
      --shell-radius: 20px;
      --ts-radius-full: 9999px;
      --font-body: "Nunito", system-ui, -apple-system, sans-serif;
      --font-heading: "Nunito", system-ui, -apple-system, sans-serif;
    }

    .ts-root[data-theme="light"] {
      --page-bg: #f4f4f4;
      --bg: #f4f4f4;
      --shell-card: #FFFFFF;
      --shell-card-border: rgba(0, 0, 0, 0.06);
      --shell-card-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      --surface: #FFFFFF;
      --surface-hover: #F4F4F5;
      --surface-active: #E4E4E7;
      --border: rgba(0, 0, 0, 0.06);
      --border-accent: #09090B;
      --text: #09090B;
      --text-muted: #52525B;
      --text-subtle: #71717A;
      --accent: #09090B;
      --accent-ink: #FFFFFF;
      --accent-soft: #F4F4F5;
      --accent-border: rgba(0, 0, 0, 0.08);
      --on-accent: #FFFFFF;
      --spotlight: rgba(0, 0, 0, 0.04);
      --ts-focus-ring: #09090B;
      --ts-raised: #F4F4F5;
      --ts-raised-hover: #E4E4E7;
      --ts-scrollbar-thumb: #D4D4D8;
      --ts-scrollbar-thumb-hover: #A1A1AA;
      --ts-scrollbar-track: transparent;
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

    /* Main Content Card: Standalone Floating Card with non-scrolling background */
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
      background: var(--shell-card);
      border: 1px solid var(--shell-card-border);
      border-radius: var(--shell-radius, 20px);
      box-shadow: var(--shell-card-shadow);
      box-sizing: border-box;
      outline: none;
      transition: background-color var(--ts-dur-base, 200ms) var(--ts-ease),
                  border-color var(--ts-dur-base, 200ms) var(--ts-ease);
    }

    /* Background Layer B: inside main card, non-scrolling */
    .ts-bg {
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      overflow: hidden;
      background: radial-gradient(ellipse 70% 40% at 50% 0%, var(--fx-highlight), transparent);
    }

    .ts-bg-grid {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        linear-gradient(to right,  var(--fx-grid) 1px, transparent 1px) 0 0 / var(--fx-grid-size) var(--fx-grid-size),
        linear-gradient(to bottom, var(--fx-grid) 1px, transparent 1px) 0 0 / var(--fx-grid-size) var(--fx-grid-size);
      -webkit-mask-image: radial-gradient(ellipse 90% 75% at 50% 0%, #000 35%, transparent 100%);
      mask-image: radial-gradient(ellipse 90% 75% at 50% 0%, #000 35%, transparent 100%);
    }

    .ts-bg::before,
    .ts-bg::after {
      content: "";
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
    }

    /* glow 1: accent, top left */
    .ts-bg::before {
      width: 60%;
      aspect-ratio: 1;
      left: -8%;
      top: -28%;
      background: radial-gradient(closest-side, var(--fx-glow-1), transparent 100%);
    }

    /* glow 2: second tone, top right */
    .ts-bg::after {
      width: 52%;
      aspect-ratio: 1;
      right: -10%;
      top: -22%;
      background: radial-gradient(closest-side, var(--fx-glow-2), transparent 100%);
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
      max-width: 1280px;
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
        align-items: start;
      }
      .ts-info-rail {
        display: flex;
        flex-direction: column;
        position: sticky;
        top: 0;
        align-self: start;
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
        position: static;
        top: auto;
        align-self: stretch;
      }
    }

    /* 3. container < 600px: single column, smaller paddings */
    @container main-card (max-width: 599px) {
      .ts-workspace-grid:not(.full-bleed) {
        grid-template-columns: 100%;
        gap: 14px;
      }
      .ts-info-rail {
        display: flex;
        flex-direction: column;
        gap: 12px;
        position: static;
        top: auto;
      }
      .ts-main-scroll-container {
        padding: 12px 12px 32px;
        gap: 14px;
      }
    }

    /* Left: Tinted panel (page-gray background, radius 20, padding 16) */
    .ts-tool-panel-wrapper {
      background: var(--page-bg, #f4f4f4);
      border: 1px solid var(--border, rgba(0, 0, 0, 0.06));
      border-radius: var(--ts-radius-card, 20px);
      padding: 16px;
      box-sizing: border-box;
      min-width: 0;
      width: 100%;
      position: relative;
      z-index: var(--ts-z-surface, 20);
    }

    .ts-tool-panel-wrapper.full-bleed {
      background: transparent;
      border: none;
      border-radius: 0;
      padding: 0;
    }

    :host-context([data-theme="dark"]) .ts-tool-panel-wrapper {
      background: #111113;
      border-color: var(--border, #27272A);
    }

    /* Tool's own white card inside the tinted panel */
    .ts-tool-card-surface {
      background: var(--shell-card, #FFFFFF);
      border: 1px solid var(--border, rgba(0, 0, 0, 0.06));
      border-radius: var(--ts-radius-tile, 14px);
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
      box-sizing: border-box;
      min-width: 0;
      width: 100%;
    }

    :host-context([data-theme="dark"]) .ts-tool-card-surface {
      background: #161618;
      border-color: var(--border, #27272A);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    }

    /* Cleanly hide duplicate header & trust chips if present in tool child template */
    ::ng-deep .ts-tool-card-surface .tool-header-block,
    ::ng-deep .ts-tool-card-surface .trust-chips-row {
      display: none !important;
    }

    /* Right: Info Rail base rules (container queries above handle responsive layout) */
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

    /* ══ ENTRY ANIMATION: 8px slide/fade with 40ms stagger (enter duration 420ms) ═══════ */
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

    .ts-entry-header {
      animation: tsFadeSlideIn var(--ts-dur-enter, 420ms) var(--ts-ease-out) 0ms forwards;
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
    .ts-entry-header.is-forced-visible,
    .ts-entry-panel.is-forced-visible,
    .ts-entry-rail.is-forced-visible,
    .ts-entry-content.is-forced-visible {
      opacity: 1 !important;
      transform: none !important;
      animation: none !important;
    }

    @media (prefers-reduced-motion: reduce) {
      .ts-entry-header,
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
      .ts-tool-panel-wrapper {
        padding: 10px;
        border-radius: 16px;
      }
      .ts-tool-card-surface {
        padding: 14px;
        border-radius: 12px;
      }
      .ts-bg-grid {
        background-size: 32px 32px;
      }
      .ts-bg::before {
        width: 45%;
        left: -5%;
        top: -20%;
      }
      .ts-bg::after {
        width: 39%;
        right: -6%;
        top: -16%;
      }
    }

    /* High contrast: remove glows, keep faint grid */
    @media (prefers-contrast: more) {
      .ts-bg::before,
      .ts-bg::after {
        display: none !important;
      }
      .ts-bg {
        background: transparent !important;
      }
    }

    /* Forced colors and print: hide decorative layers entirely */
    @media (forced-colors: active), print {
      .ts-bg,
      .ts-bg-grid {
        display: none !important;
      }
    }
  `]
})
export class ToolLayoutComponent implements OnInit, AfterViewInit {
  readonly tool = input<ToolRegistryItem | null>(null);
  readonly config = input<ToolShellConfig | null>(null);
  readonly tabChange = output<string>();

  readonly mainCard = viewChild<ElementRef<HTMLElement>>('mainCard');

  readonly allTools = signal<ToolRegistryItem[]>(getAllTools());
  readonly showCommandPalette = signal<boolean>(false);
  readonly showAboutPanel = signal<boolean>(false);
  readonly sidebarService = inject(ToolSidebarService);
  readonly themeService = inject(ToolThemeService);
  private readonly capsuleService = inject(ToolCapsuleService);

  readonly internalActiveTab = signal<string>('');

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('panel') === 'about') {
        this.showAboutPanel.set(true);
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
    const items = card.querySelectorAll('.ts-entry-header, .ts-entry-panel, .ts-entry-rail, .ts-entry-content');
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

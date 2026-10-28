import { Component, input, output, signal, computed, inject, HostListener, OnInit, AfterViewInit, OnDestroy, NgZone, ElementRef, viewChild, isDevMode, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolRegistryItem, getAllTools } from '@acklet/tool-registry';
import { ToolShellConfig, ToolTab } from '../../models/tool-shell.models';
import { ToolSidebarService } from '../../services/tool-sidebar.service';
import { SidebarStateService, FIRST_HINT_KEY, readCookie, writeCookie, resolveCookieDomain } from '../../services/sidebar-state.service';
import { ToolThemeService } from '../../services/tool-theme.service';
import { ToolThemeProviderService } from '../../services/tool-theme-provider.service';
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
import { TsIconComponent } from '../icon/ts-icon.component';
import { TsTooltipDirective } from '../primitive/ts-tooltip.directive';
import { RevealDirective, TsRevealDirective } from '../../directives/reveal.directive';
import { PerfFlagsService } from '../../services/perf-flags.service';
import { TsSettingsModalComponent } from '../settings/ts-settings-modal.component';
import { DrawerGestureService } from '../../services/drawer-gesture.service';

@Component({
  selector: 'ts-shell, lib-tool-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TsTopbarComponent,
    TsSidebarComponent,
    TsCommandPaletteComponent,
    TsAboutCardComponent,
    TsAboutPanelComponent,
    TsBackdropComponent,
    TsToolContentComponent,
    TsIconComponent,
    TsTooltipDirective,
    RevealDirective,
    TsSettingsModalComponent
  ],
  template: `
    <div 
      class="ts-root" 
      [class.no-topbar]="!showTopbar()"
      [class.no-sidebar]="!showSidebar()"
      [class.is-full-bleed]="isFullBleed()"
      [attr.data-tool]="tool()?.slug || 'default'"
      [attr.data-theme]="themeService.effectiveTheme()"
      [attr.data-accent]="tool()?.accent || 'neutral'"
      [attr.data-surface]="effectiveSurface()"
      [style]="computedThemeStyles()"
    >
      
      <!-- Skip to main content accessibility link -->
      <a href="#main-content" class="ts-skip-to-content">Skip to content</a>

      <!-- Background Ambient Glow (Contained within viewport, non-scrolling) -->
      <ts-backdrop [accentHue]="tool()?.accentHue ?? null" />

      <!-- Far-left Hot Zone for Peek Reveal (Hidden when pinned or on touch) -->
      @if (showSidebar() && !sidebarState.isPinned() && sidebarState.canHover() && sidebarState.isHoverEnabled()) {
        <div 
          class="ts-sidebar-hotzone"
          [class.is-glowing]="isHotzoneHovered()"
          (mouseenter)="onHotzoneEnter()"
          (mouseleave)="onHotzoneLeave()"
          aria-hidden="true"
        >
          <div class="ts-sidebar-hotzone-indicator"></div>
        </div>
      }

      <!-- First-Visit Left Edge Hint (pulses once, auto-dismisses, cookie-backed) -->
      @if (showFirstHint()) {
        <div class="ts-sidebar-edge-hint" role="status" aria-live="polite">
          <span class="ts-hint-dot" aria-hidden="true"></span>
          <span class="ts-hint-text">Hover edge or press <kbd class="ts-hint-kbd">⌘B</kbd> for tools</span>
          <button type="button" class="ts-hint-close-btn" (click)="dismissFirstHint()" aria-label="Dismiss hint">
            <ts-icon name="x" [size]="12" />
          </button>
        </div>
      }

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

        <!-- Bottom Row: SIDEBAR Card (272px) + MAIN CONTENT Card (1fr) -->
        <div 
          class="ts-bottom-row-grid" 
          [class.no-sidebar]="!showSidebar() || !sidebarState.isPinned()"
          [class.is-pinned]="sidebarState.isPinned()"
          [class.is-peek]="sidebarState.isPeek()"
          [style.--sidebar-current-width.px]="sidebarWidth()"
        >
          <!-- 2. Left Card: SIDEBAR (Scrolls internally) -->
          @if (showSidebar()) {
            <ts-sidebar 
              [tools]="allTools()" 
              [tool]="tool()"
              [currentSlug]="tool()?.slug || ''"
              (mouseenter)="onSidebarPointerEnter()"
              (mouseleave)="onSidebarPointerLeave()"
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

            <div class="ts-main-scroll-container" #scrollContainer [class.full-bleed]="isFullBleed()">
              <!-- WORKSPACE SECTION (Desktop One-Screen Workspace) -->
              <div id="tool" class="ts-workspace-section" [class.full-bleed]="isFullBleed()">
                <div class="ts-workspace-grid" [class.full-bleed]="isFullBleed()">
                  <!-- Left/Center: the tool as ONE raised card on the base, full width -->
                  <div class="ts-tool-card-surface ts-entry-panel" [class.full-bleed]="isFullBleed()">
                    <ng-content />
                  </div>
                </div>
              </div>

              <!-- 4. BELOW the grid, full width: About, How to use, FAQ, Related -->
              @if (!isFullBleed()) {
                <div class="ts-content-below-grid ts-entry-content">
                  <ts-tool-content [tool]="tool()" />
                </div>
              }

              <!-- About & Documentation Card Below Tool -->
              @if (showDescriptionCard() && tool()) {
                <section 
                  appReveal [revealDelay]="70"
                  class="ts-tool-description-section" 
                  aria-label="About this tool"
                >
                  <ts-about-card 
                    [tool]="tool()!" 
                    (readMore)="showAboutPanel.set(true)"
                  />
                </section>
              }

            </div>

            <!-- Floating 'Go to Tool' button (Visible when scrolled down into bottom documentation/FAQ) -->
            <button 
              type="button" 
              class="ts-goto-tool-btn" 
              [class.is-visible]="showBackToTool()" 
              (click)="scrollToTool()" 
              [attr.aria-label]="'Go to ' + (tool()?.name || 'Tool')"
              [attr.tabindex]="showBackToTool() ? 0 : -1"
              [tsTooltip]="'Go to ' + (tool()?.name || 'Tool')"
              tooltipPosition="left"
            >
              <ts-icon name="chevron-up" [size]="20" class="ts-goto-icon" />
            </button>
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

      <!-- Global Shell Settings Modal -->
      <ts-settings-modal />

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
      --font-body: "Scoutie Sans", sans-serif;
      --font-heading: "Scoutie Sans", sans-serif;
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
    /* Dynamic per-tool theme tokens (--accent, --tool-accent, --font-*) are injected at host via ToolThemeProviderService */

    .ts-root {
      width: 100vw;
      height: 100dvh;
      max-height: 100dvh;
      overflow: hidden;
      position: relative;
      /* transparent — page color comes from ts-backdrop (position:fixed) */
      background-color: transparent;
      color: var(--text);
      font-family: var(--font-body, "Scoutie Sans", sans-serif);
      padding: max(var(--shell-padding, 12px), env(safe-area-inset-top, 0px))
               max(var(--shell-padding, 12px), env(safe-area-inset-right, 0px))
               max(var(--shell-padding, 12px), env(safe-area-inset-bottom, 0px))
               max(var(--shell-padding, 12px), env(safe-area-inset-left, 0px));
      box-sizing: border-box;
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

    /* Bottom Row Grid: Sidebar (272px) + Main Content Card (minmax(0, 1fr)) */
    .ts-bottom-row-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: var(--shell-gap, 12px);
      width: 100%;
      height: 100%;
      min-height: 0;
      min-width: 0;
      position: relative;
      overflow: hidden;
      transition: grid-template-columns 240ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    .ts-bottom-row-grid.is-pinned {
      grid-template-columns: var(--sidebar-current-width, 272px) minmax(0, 1fr);
    }

    .ts-bottom-row-grid.no-sidebar {
      grid-template-columns: minmax(0, 1fr);
    }

    /* Far-left Hot Zone for Peek Hover Reveal */
    .ts-sidebar-hotzone {
      position: fixed;
      left: 0;
      top: 0;
      bottom: 0;
      width: 14px;
      z-index: 65;
      pointer-events: auto;
      cursor: e-resize;
      display: flex;
      align-items: center;
      justify-content: flex-start;
    }

    .ts-sidebar-hotzone-indicator {
      position: absolute;
      left: 2px;
      top: 50%;
      transform: translateY(-50%) scaleY(0.7);
      width: 3px;
      height: 48px;
      border-radius: 9999px;
      background: var(--accent);
      opacity: 0;
      transition: opacity 150ms ease, transform 150ms ease;
      pointer-events: none;
    }

    .ts-sidebar-hotzone:hover .ts-sidebar-hotzone-indicator,
    .ts-sidebar-hotzone.is-glowing .ts-sidebar-hotzone-indicator {
      opacity: 0.8;
      transform: translateY(-50%) scaleY(1);
    }

    @media (max-width: 1023px) {
      .ts-sidebar-hotzone {
        display: none !important;
      }
    }

    /* First-Visit Left Edge Hint */
    .ts-sidebar-edge-hint {
      position: fixed;
      left: 16px;
      top: calc(var(--shell-padding, 12px) + var(--header-height, 64px) + 16px);
      z-index: 60;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-radius: 9999px;
      background: var(--surface, #141416);
      color: var(--text, #FCFCFC);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), var(--ts-edge);
      font-size: 12px;
      font-weight: 500;
      line-height: 1;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      animation: tsHintSlideIn 280ms cubic-bezier(0.16, 1, 0.3, 1) both;
      user-select: none;
    }

    .ts-hint-dot {
      width: 6px;
      height: 6px;
      border-radius: 9999px;
      background: var(--accent);
      box-shadow: 0 0 8px var(--accent);
      animation: tsDotPulse 2s ease-in-out infinite;
      flex-shrink: 0;
    }

    .ts-hint-text {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
    }

    .ts-hint-kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 1px 5px;
      border-radius: 4px;
      font-family: inherit;
      font-size: 11px;
      font-weight: 600;
      background: var(--ts-surface-inset, rgba(255, 255, 255, 0.08));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text);
    }

    .ts-hint-close-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      padding: 0;
      margin-left: 2px;
      border: none;
      background: transparent;
      color: var(--text-3, #8E8E93);
      cursor: pointer;
      border-radius: 4px;
      transition: color 150ms ease;
    }

    .ts-hint-close-btn:hover {
      color: var(--text);
    }

    @keyframes tsHintSlideIn {
      from {
        opacity: 0;
        transform: translateX(-12px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
    }

    @keyframes tsDotPulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.4;
        transform: scale(0.85);
      }
    }

    @media (max-width: 1023px) {
      .ts-sidebar-edge-hint {
        display: none !important;
      }
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
    /* Main Content Card: Glass card matching sidebar and navbar */
    .ts-main-content-card {
      position: relative;
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      min-width: 0;
      overflow: hidden;
      contain: layout;
      container-type: inline-size;
      container-name: main-card;
      isolation: isolate;
      background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--ts-glass, #F0F3FF) var(--ts-a1-pct, calc(var(--ts-a1, .52) * 100%)), transparent),
        color-mix(in srgb, var(--ts-glass, #F0F3FF) var(--ts-a2-pct, calc(var(--ts-a2, .34) * 100%)), transparent)
      );
      border-radius: var(--shell-radius, 20px);
      box-shadow: var(--ts-edge), var(--ts-shadow);
      border: none;
      backdrop-filter: var(--ts-blur, blur(5px) saturate(160%));
      -webkit-backdrop-filter: var(--ts-blur, blur(5px) saturate(160%));
      box-sizing: border-box;
      outline: none;
      transform: translateZ(0);
      transition: background var(--ts-dur-base, 200ms) var(--ts-ease),
                  box-shadow var(--ts-dur-base, 200ms) var(--ts-ease);
    }

    /* Full-page coverage when running without chrome (e.g. tools-hub) */
    .ts-root.no-topbar.no-sidebar {
      padding: 0 !important;
    }

    .ts-root.no-topbar.no-sidebar .ts-main-content-card {
      border-radius: 0 !important;
      box-shadow: none !important;
      border: none !important;
      background: var(--page-bg, #F7F8F8) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }

    :host-context([data-theme="dark"]) .ts-root.no-topbar.no-sidebar .ts-main-content-card,
    .ts-root[data-theme="dark"].no-topbar.no-sidebar .ts-main-content-card {
      background: var(--page-bg, #0F1011) !important;
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
      -webkit-overflow-scrolling: touch;
      overscroll-behavior-y: contain;
      scroll-behavior: smooth;
    }

    .ts-main-scroll-container.full-bleed {
      max-width: 100%;
      height: 100%;
      min-height: 0;
      flex: 1 1 0%;
      padding: 0 !important;
      gap: 0 !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      scroll-behavior: smooth !important;
      display: flex;
      flex-direction: column;
      overscroll-behavior-y: contain;
      -webkit-overflow-scrolling: touch;
    }

    /* ══ WORKSPACE SECTION: Desktop One-Screen Workspace ══ */
    .ts-workspace-section {
      width: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }

    .ts-workspace-section.full-bleed {
      min-height: 100%;
      height: 100%;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
    }

    @media (min-width: 1024px) and (min-height: 600px) {
      .ts-workspace-section:not(.full-bleed) {
        --ts-workspace-h: calc(100dvh - 2 * var(--shell-padding, 12px) - var(--header-height, 64px) - var(--shell-gap, 12px) - 2 * var(--ts-main-pad, 24px));
        min-height: min(var(--ts-workspace-h), 680px);
        height: auto;
        flex-shrink: 0;
      }
      .ts-workspace-grid:not(.full-bleed) {
        height: 100%;
        min-height: 0;
      }
      .ts-tool-card-surface:not(.full-bleed) {
        height: auto;
        min-height: min(var(--ts-workspace-h), 680px);
        display: flex;
        flex-direction: column;
      }
      .ts-info-rail {
        height: auto;
        min-height: 0;
        overflow: hidden;
      }
    }

    /* ══ 2. WORKSPACE GRID: Tool Card Surface (Full Available Width) ════════ */
    .ts-workspace-grid {
      display: block;
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    .ts-workspace-grid.full-bleed {
      height: 100%;
      max-height: 100%;
      min-height: 0;
      display: flex;
      flex-direction: column;
      flex: 1 1 0%;
      gap: 0;
    }

    @container main-card (max-width: 599px) {
      .ts-main-scroll-container:not(.full-bleed) {
        padding: 16px;
        gap: 16px;
      }
    }

    /* Tool raised card on the base (always solid raised surface) */
    .ts-tool-card-surface {
      background: var(--ts-surface-raised, #FFFFFF);
      border: none;
      border-radius: var(--ts-radius-card, 20px);
      padding: 24px;
      box-shadow: none;
      box-sizing: border-box;
      min-width: 0;
      width: 100%;
      position: relative;
      z-index: var(--ts-z-surface, 20);
      display: flex;
      flex-direction: column;
      min-height: fit-content;
    }

    /* Floating 'Go to Tool' button when scrolled down */
    .ts-goto-tool-btn {
      position: absolute;
      bottom: 28px;
      right: 32px;
      z-index: 90;
      width: 44px;
      height: 44px;
      border-radius: 9999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--ts-glass, #F0F3FF) var(--ts-a1-pct, calc(var(--ts-a1, .52) * 100%)), transparent),
        color-mix(in srgb, var(--ts-glass, #F0F3FF) var(--ts-a2-pct, calc(var(--ts-a2, .34) * 100%)), transparent)
      );
      -webkit-backdrop-filter: var(--ts-blur, blur(5px) saturate(160%));
      backdrop-filter: var(--ts-blur, blur(5px) saturate(160%));
      box-shadow: var(--ts-edge), var(--ts-shadow), 0 4px 14px rgba(0, 0, 0, 0.12);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.2));
      color: var(--text, #18181B);
      cursor: pointer;
      opacity: 0;
      visibility: hidden;
      transform: translateY(20px) scale(0.85);
      transition: opacity 300ms cubic-bezier(0.34, 1.56, 0.64, 1),
                  transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1),
                  visibility 300ms cubic-bezier(0.34, 1.56, 0.64, 1),
                  background 180ms ease,
                  box-shadow 180ms ease,
                  color 180ms ease,
                  border-color 180ms ease;
      pointer-events: none;
      outline: none;
    }

    :host-context([data-theme="dark"]) .ts-goto-tool-btn {
      color: var(--text, #FCFCFC);
      border-color: rgba(255, 255, 255, 0.12);
    }

    .ts-goto-tool-btn.is-visible {
      opacity: 1;
      visibility: visible;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }

    .ts-goto-tool-btn:hover {
      transform: translateY(-3px) scale(1.1);
      color: var(--accent-strong, var(--accent));
      border-color: var(--accent);
      box-shadow: var(--ts-edge), var(--ts-shadow), 0 8px 24px color-mix(in srgb, var(--accent) 35%, transparent);
    }

    .ts-goto-tool-btn:hover .ts-goto-icon {
      animation: tsFloatUp 700ms ease-in-out infinite alternate;
    }

    .ts-goto-tool-btn:active {
      transform: translateY(0) scale(0.94);
    }

    @keyframes tsFloatUp {
      0% {
        transform: translateY(0);
      }
      100% {
        transform: translateY(-3px);
      }
    }

    .ts-tool-card-surface.full-bleed {
      height: 100%;
      max-height: 100%;
      min-height: 0;
      display: flex;
      flex-direction: column;
      flex: 1 1 0%;
      background: transparent !important;
      border: none !important;
      border-radius: 0 !important;
      padding: 0 !important;
      box-shadow: none !important;
    }

    .ts-tool-card-surface.full-bleed > *,
    ::ng-deep .ts-tool-card-surface.full-bleed > *,
    ::ng-deep .ts-tool-card-surface.full-bleed app-json-lens,
    ::ng-deep .ts-tool-card-surface.full-bleed app-clipboard-tool {
      width: 100% !important;
      height: 100% !important;
      min-height: 0 !important;
      flex: 1 1 0% !important;
      display: flex !important;
      flex-direction: column !important;
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

    .ts-main-scroll-container.full-bleed .ts-content-below-grid {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 24px 80px;
      box-sizing: border-box;
    }

    @media (max-width: 767px) {
      .ts-main-scroll-container.full-bleed .ts-content-below-grid {
        padding: 24px 16px 80px;
      }
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
        transform: none;
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
      .ts-bottom-row-grid,
      .ts-main-content-card,
      .ts-sidebar-hotzone-indicator,
      .ts-entry-panel,
      .ts-entry-rail,
      .ts-entry-content {
        animation: none !important;
        transition: none !important;
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
      ts-sidebar {
        display: contents !important;
      }
      .ts-bottom-row-grid,
      .ts-bottom-row-grid.is-pinned,
      .ts-bottom-row-grid.no-sidebar {
        grid-template-columns: 1fr !important;
      }
      .ts-sidebar-hotzone,
      .ts-sidebar-hotzone-indicator,
      .ts-sidebar-edge-hint {
        display: none !important;
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
      .ts-main-scroll-container:not(.full-bleed) {
        padding: 16px;
        gap: 16px;
      }
      .ts-tool-card-surface:not(.full-bleed) {
        padding: 16px;
        border-radius: 16px;
      }
    }
  `]
})
export class ToolLayoutComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly tool = input<ToolRegistryItem | null>(null);
  readonly config = input<ToolShellConfig | null>(null);
  readonly surface = input<'clear' | 'frost' | 'tinted' | 'solid'>('clear');
  readonly activeTab = input<string | undefined>(undefined);
  readonly tabChange = output<string>();

  readonly mainCard = viewChild<ElementRef<HTMLElement>>('mainCard');
  readonly scrollContainer = viewChild<ElementRef<HTMLElement>>('scrollContainer');

  readonly allTools = signal<ToolRegistryItem[]>(getAllTools());
  readonly showCommandPalette = signal<boolean>(false);
  readonly showAboutPanel = signal<boolean>(false);
  readonly showBackToTool = signal<boolean>(false);
  readonly sidebarService = inject(ToolSidebarService);
  readonly sidebarState = inject(SidebarStateService);
  readonly sidebarWidth = computed(() => this.sidebarService.width());
  readonly themeService = inject(ToolThemeService);
  private readonly themeProvider = inject(ToolThemeProviderService);
  private readonly capsuleService = inject(ToolCapsuleService);
  private readonly perfFlags = inject(PerfFlagsService);
  private readonly ngZone = inject(NgZone);
  private scrollListener: (() => void) | null = null;

  readonly computedThemeStyles = computed(() => {
    return this.themeProvider.resolveThemeTokens(this.tool(), this.themeService.effectiveTheme());
  });

  readonly isHotzoneHovered = signal<boolean>(false);
  private hotzoneIntentTimer: ReturnType<typeof setTimeout> | null = null;
  private peekGraceTimer: ReturnType<typeof setTimeout> | null = null;

  readonly showFirstHint = signal<boolean>(false);
  private hintDismissTimer: ReturnType<typeof setTimeout> | null = null;

  dismissFirstHint(): void {
    if (!this.showFirstHint()) return;
    this.showFirstHint.set(false);
    if (this.hintDismissTimer) {
      clearTimeout(this.hintDismissTimer);
      this.hintDismissTimer = null;
    }
    const domain = resolveCookieDomain(typeof window !== 'undefined' ? window.location.hostname : '');
    writeCookie(FIRST_HINT_KEY, 'true', domain);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(FIRST_HINT_KEY, 'true');
      }
    } catch {}
  }

  onHotzoneEnter(): void {
    if (this.sidebarState.isPinned() || !this.sidebarState.canHover() || !this.sidebarState.isHoverEnabled()) {
      return;
    }
    this.dismissFirstHint();
    this.isHotzoneHovered.set(true);
    this.clearPeekGraceTimer();

    this.hotzoneIntentTimer = setTimeout(() => {
      this.sidebarState.peekOpen();
    }, 100);
  }

  onHotzoneLeave(): void {
    this.isHotzoneHovered.set(false);
    if (this.hotzoneIntentTimer) {
      clearTimeout(this.hotzoneIntentTimer);
      this.hotzoneIntentTimer = null;
    }
    if (this.sidebarState.isPeek()) {
      this.startPeekGraceTimer();
    }
  }

  onSidebarPointerEnter(): void {
    this.clearPeekGraceTimer();
  }

  onSidebarPointerLeave(): void {
    if (this.sidebarState.isPeek()) {
      this.startPeekGraceTimer();
    }
  }

  private startPeekGraceTimer(): void {
    this.clearPeekGraceTimer();
    this.peekGraceTimer = setTimeout(() => {
      this.sidebarState.peekClose();
    }, 250);
  }

  private clearPeekGraceTimer(): void {
    if (this.peekGraceTimer) {
      clearTimeout(this.peekGraceTimer);
      this.peekGraceTimer = null;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.sidebarState.isPeek()) {
      const target = event.target as HTMLElement | null;
      if (target && !target.closest('ts-sidebar') && !target.closest('.ts-sidebar-hotzone')) {
        this.clearPeekGraceTimer();
        this.sidebarState.peekClose();
      }
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.sidebarState.isPeek()) {
      this.clearPeekGraceTimer();
      this.sidebarState.peekClose();
    }
  }

  @HostListener('window:keydown', ['$event'])
  onGlobalKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
      const activeEl = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable
      );
      if (!isInput && this.showSidebar()) {
        event.preventDefault();
        this.dismissFirstHint();
        this.sidebarState.toggle();
      }
    }
  }

  private readonly drawerGesture = inject(DrawerGestureService);

  // Pointer & Touch Swipe Gesture for Mobile / Tablet to reveal sidebar on touch devices
  @HostListener('pointerdown', ['$event'])
  onShellPointerDown(e: PointerEvent): void {
    if (!this.showSidebar() || e.pointerType !== 'touch' || this.sidebarService.isMobileDrawerOpen()) {
      return;
    }
    const started = this.drawerGesture.startSwipeRight(e.clientX, e.clientY, e.target as HTMLElement);
    if (started) {
      this.sidebarService.isMobileDrawerOpen.set(true);
    }
  }

  @HostListener('pointermove', ['$event'])
  onShellPointerMove(e: PointerEvent): void {
    if (e.pointerType === 'touch' && this.drawerGesture.isDragging()) {
      this.drawerGesture.moveSwipe(e.clientX, e.clientY, false);
    }
  }

  @HostListener('pointerup', ['$event'])
  @HostListener('pointercancel', ['$event'])
  onShellPointerUp(e: PointerEvent): void {
    if (e.pointerType === 'touch' && this.drawerGesture.isDragging()) {
      const action = this.drawerGesture.endSwipe(false);
      if (action !== 'open') {
        this.sidebarService.closeMobileDrawer();
      }
    }
  }

  @HostListener('touchstart', ['$event'])
  onShellTouchStart(e: TouchEvent): void {
    if (!this.showSidebar() || e.touches.length !== 1 || this.sidebarService.isMobileDrawerOpen()) {
      return;
    }
    const touch = e.touches[0];
    const started = this.drawerGesture.startSwipeRight(touch.clientX, touch.clientY, e.target as HTMLElement);
    if (started) {
      this.sidebarService.isMobileDrawerOpen.set(true);
    }
  }

  @HostListener('touchmove', ['$event'])
  onShellTouchMove(e: TouchEvent): void {
    if (e.touches.length !== 1 || !this.drawerGesture.isDragging()) return;
    const touch = e.touches[0];
    this.drawerGesture.moveSwipe(touch.clientX, touch.clientY, false);
  }

  @HostListener('touchend', ['$event'])
  @HostListener('touchcancel', ['$event'])
  onShellTouchEnd(e: TouchEvent): void {
    if (this.drawerGesture.isDragging()) {
      const action = this.drawerGesture.endSwipe(false);
      if (action !== 'open') {
        this.sidebarService.closeMobileDrawer();
      }
    }
  }

  readonly internalActiveTab = signal<string>('');
  private readonly devSurfaceOverride = signal<'clear' | 'frost' | 'tinted' | 'solid' | null>(null);

  readonly effectiveSurface = computed<'clear' | 'frost' | 'tinted' | 'solid'>(() => {
    return this.devSurfaceOverride() ?? this.surface() ?? 'clear';
  });

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('panel') === 'about') {
        this.showAboutPanel.set(true);
      }

      if (isDevMode()) {
        const surfParam = params.get('surface');
        if (surfParam === 'clear' || surfParam === 'frost' || surfParam === 'solid' || surfParam === 'tinted') {
          this.devSurfaceOverride.set(surfParam as 'clear' | 'frost' | 'solid' | 'tinted');
        }
      }

      // Check first-visit left edge hint
      const hintSeen = readCookie(FIRST_HINT_KEY) || (window.localStorage ? window.localStorage.getItem(FIRST_HINT_KEY) : null);
      if (!hintSeen && !this.sidebarState.isPinned() && this.sidebarState.canHover()) {
        this.showFirstHint.set(true);
        this.hintDismissTimer = setTimeout(() => {
          this.dismissFirstHint();
        }, 5000);
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
    // Mark scroll container ready so tsReveal hidden states activate
    const sc = this.scrollContainer()?.nativeElement;
    if (sc) {
      sc.classList.add('ts-reveal-ready');
      this.scrollListener = () => {
        const scrolled = sc.scrollTop > 240;
        if (this.showBackToTool() !== scrolled) {
          this.ngZone.run(() => {
            this.showBackToTool.set(scrolled);
          });
        }
      };
      sc.addEventListener('scroll', this.scrollListener, { passive: true });
    }
  }

  ngOnDestroy(): void {
    if (this.hintDismissTimer) {
      clearTimeout(this.hintDismissTimer);
      this.hintDismissTimer = null;
    }
    if (this.hotzoneIntentTimer) {
      clearTimeout(this.hotzoneIntentTimer);
      this.hotzoneIntentTimer = null;
    }
    if (this.peekGraceTimer) {
      clearTimeout(this.peekGraceTimer);
      this.peekGraceTimer = null;
    }
    const sc = this.scrollContainer()?.nativeElement;
    if (sc && this.scrollListener) {
      sc.removeEventListener('scroll', this.scrollListener);
      this.scrollListener = null;
    }
  }

  scrollToTool(): void {
    const sc = this.scrollContainer()?.nativeElement || (typeof document !== 'undefined' ? document.querySelector('.ts-main-scroll-container') : null);
    if (sc) {
      sc.scrollTo({ top: 0, behavior: 'smooth' });
    }
    const toolEl = typeof document !== 'undefined' ? document.getElementById('tool') : null;
    if (toolEl && sc) {
      toolEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
    const ext = this.activeTab();
    if (ext) {
      return ext;
    }
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

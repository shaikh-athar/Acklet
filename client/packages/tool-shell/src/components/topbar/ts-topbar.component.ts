// packages/tool-shell/src/components/topbar/ts-topbar.component.ts
import {
  Component,
  input,
  output,
  inject,
  computed,
  signal,
  OnInit,
  OnDestroy,
  ElementRef,
  viewChild,
  viewChildren,
  AfterViewInit,
  NgZone,
  ChangeDetectionStrategy,
  effect,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolSidebarService } from '../../services/tool-sidebar.service';
import { SidebarStateService } from '../../services/sidebar-state.service';
import { ToolSettingsService } from '../../services/tool-settings.service';
import { ToolThemeService } from '../../services/tool-theme.service';
import { getToolsHubUrl, getPortalUrl } from '@acklet/shared';
import { ToolRegistryItem } from '@acklet/tool-registry';
import { TsIconComponent } from '../icon/ts-icon.component';
import { TsThemeToggleComponent } from '../theme/ts-theme-toggle.component';
import { TsTooltipDirective } from '../primitive/ts-tooltip.directive';
import { HlmKbdImports } from '../../helm/kbd';
import { FAVORITES_KEY } from '../sidebar/ts-tool-list.component';

export interface SectionNavLink {
  id: string;
  label: string;
}

@Component({
  selector: 'ts-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TsIconComponent,
    TsThemeToggleComponent,
    TsTooltipDirective,
    HlmKbdImports
  ],
  template: `
    <header class="ts-topbar-card" role="banner">
      <!-- ══════════════════════════════════════════════════════ -->
      <!-- Left Zone: Logo / Name + Current Tool Chip Breadcrumb   -->
      <!-- ══════════════════════════════════════════════════════ -->
      <div class="ts-zone-left">
        <!-- Acklet Tools Brand Link to Tools Hub -->
        <a [href]="hubUrl" class="ts-brand-link" title="Acklet Tools Hub">
          <ts-icon name="zap" [size]="22" class="ts-brand-mark" />
          <span class="ts-brand-wordmark">Acklet</span>
        </a>

        <!-- Current Tool Chip / Breadcrumb -->
        @if (tool(); as currentTool) {
          <div class="ts-breadcrumb-separator" aria-hidden="true">/</div>
          <div class="ts-tool-chip" [attr.aria-label]="'Current tool: ' + currentTool.name">
            <span class="ts-tool-chip-name">{{ currentTool.name }}</span>
          </div>
        }
      </div>

      <!-- ══════════════════════════════════════════════════════ -->
      <!-- Center Zone: Tool Section Anchor Links + Scroll Spy   -->
      <!-- ══════════════════════════════════════════════════════ -->
      <nav class="ts-zone-center" aria-label="Tool sections">
        @if (sectionLinks().length > 0) {
          <div class="ts-nav-links-track" #navTrack>
            <!-- Sliding Active Pill Indicator -->
            <div 
              class="ts-nav-active-pill" 
              [class.is-ready]="isIndicatorReady()"
              [style.transform]="indicatorTransform()"
              [style.width.px]="indicatorWidth()"
              aria-hidden="true"
            ></div>

            @for (link of sectionLinks(); track link.id; let idx = $index) {
              <a 
                #navLinkBtns
                [href]="'#' + link.id" 
                class="ts-nav-link-btn"
                [class.active]="activeSection() === link.id"
                (click)="scrollToSection($event, link.id)"
              >
                {{ link.label }}
              </a>
            }
          </div>
        }
      </nav>

      <!-- ══════════════════════════════════════════════════════ -->
      <!-- Right Zone: Share, Save, Theme Toggle, Tools Drawer   -->
      <!-- ══════════════════════════════════════════════════════ -->
      <div class="ts-zone-right">
        <!-- Share / Copy Link Button -->
        <button 
          type="button" 
          class="ts-nav-action-btn hide-xs"
          (click)="copyShareLink()"
          [attr.aria-label]="copiedLink() ? 'Link copied to clipboard' : 'Copy link to tool'"
          [tsTooltip]="copiedLink() ? 'Copied!' : 'Copy link'"
        >
          <ts-icon [name]="copiedLink() ? 'check' : 'link'" [size]="20" />
          <span class="ts-action-label hide-below-1100">{{ copiedLink() ? 'Copied' : 'Share' }}</span>
        </button>

        <!-- Save / Favorite Button with Jewel Accent Gradient & Celebration Sparkles -->
        <button 
          type="button" 
          class="ts-nav-action-btn ts-save-btn hide-xs"
          [class.is-favorited]="isFavorited()"
          [class.is-celebrating]="isCelebrating()"
          (click)="toggleFavorite()"
          [attr.aria-label]="isFavorited() ? 'Remove from favorites' : 'Add to favorites'"
          [tsTooltip]="isFavorited() ? 'Saved' : 'Save tool'"
        >
          <div class="ts-star-stage" aria-hidden="true">
            <svg class="ts-nav-star-svg" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon 
                points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                [attr.fill]="isFavorited() ? 'currentColor' : 'transparent'"
                stroke="currentColor"
              />
            </svg>
            <svg class="ts-star-sparkle sp-1" viewBox="0 0 24 24"><path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" fill="currentColor"/></svg>
            <svg class="ts-star-sparkle sp-2" viewBox="0 0 24 24"><path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" fill="currentColor"/></svg>
            <svg class="ts-star-sparkle sp-3" viewBox="0 0 24 24"><path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" fill="currentColor"/></svg>
            <svg class="ts-star-sparkle sp-4" viewBox="0 0 24 24"><path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" fill="currentColor"/></svg>
          </div>
          <span class="ts-action-label hide-below-1100">{{ isFavorited() ? 'Saved' : 'Save' }}</span>
        </button>

        <!-- ONE Single Theme Toggle (Desktop Only; moved to Navigation Sheet on Mobile/Tablet) -->
        <ts-theme-toggle />

        <!-- Navigation Menu Button (4 circles grid) -->
        <button
          type="button"
          class="ts-tools-grid-btn"
          [class.active]="isNavMenuOpen()"
          (click)="toggleNavMenu($event)"
          [attr.aria-expanded]="isNavMenuOpen()"
          aria-label="Navigation menu"
          tsTooltip="Navigation"
        >
          <ts-icon name="layout-grid-circles" [size]="18" />
        </button>

        <!-- Optional Primary Action Button if configured -->
        @if (showPrimaryAction()) {
          <a 
            [href]="portalUrl + '/auth/login'" 
            class="ts-btn-primary-cta"
            title="Sign in or join Acklet"
          >
            <span>Get Started</span>
            <ts-icon name="arrow-right" [size]="13" class="hide-mobile" />
          </a>
        }
      </div>
    </header>

    <!-- Navigation Menu: Tablet Anchored Popover / Mobile Clean Sheet -->
    @if (isNavMenuOpen()) {
      <div 
        class="ts-nav-backdrop" 
        (click)="closeNavMenu()" 
        aria-hidden="true"
      ></div>

      <nav 
        class="ts-nav-panel slide-fade-up" 
        role="dialog" 
        aria-modal="true" 
        aria-label="Navigation menu"
        (click)="$event.stopPropagation()"
      >
        <!-- Mobile Sheet Handle & Header (Visible on phone) -->
        <div class="ts-nav-sheet-header">
          <div class="ts-nav-sheet-handle" aria-hidden="true"></div>
          <div class="ts-nav-sheet-title-row">
            <span class="ts-nav-sheet-title">Navigation</span>
            <button 
              type="button" 
              class="ts-nav-sheet-close-btn" 
              (click)="closeNavMenu()"
              aria-label="Close navigation menu"
            >
              <ts-icon name="x" [size]="18" />
            </button>
          </div>
        </div>

        <!-- Section Navigation Links -->
        <div class="ts-nav-panel-links" role="menu">
          @for (link of sectionLinks(); track link.id) {
            <button 
              type="button" 
              role="menuitem"
              class="ts-nav-panel-item" 
              [class.active]="activeSection() === link.id"
              (click)="onNavMenuItemClick($event, link.id)"
            >
              <span class="ts-nav-item-text">{{ link.label }}</span>
              @if (activeSection() === link.id) {
                <span class="ts-nav-item-active-pill">Active</span>
              }
            </button>
          }
        </div>

        <div class="ts-nav-panel-divider" role="separator"></div>

        <!-- Secondary Actions: Share & Save Tool & Acklet Tools -->
        <div class="ts-nav-panel-actions">
          <button 
            type="button" 
            role="menuitem"
            class="ts-nav-panel-item ts-nav-action-row" 
            (click)="onNavShareClick()"
          >
            <ts-icon [name]="copiedLink() ? 'check' : 'link'" [size]="18" class="ts-nav-action-icon" />
            <span class="ts-nav-item-text">{{ copiedLink() ? 'Link Copied!' : 'Share Tool' }}</span>
          </button>

          <button 
            type="button" 
            role="menuitem"
            class="ts-nav-panel-item ts-nav-action-row" 
            [class.is-favorited]="isFavorited()"
            (click)="onNavSaveClick()"
          >
            <ts-icon name="star" [size]="18" class="ts-nav-action-icon" [class.is-fav]="isFavorited()" />
            <span class="ts-nav-item-text">{{ isFavorited() ? 'Saved to Favorites' : 'Save Tool' }}</span>
          </button>

          @if (showSidebar()) {
            <button 
              type="button" 
              role="menuitem"
              class="ts-nav-panel-item ts-nav-action-row" 
              (click)="openToolsDrawerFromNav()"
            >
              <ts-icon name="grid" [size]="18" class="ts-nav-action-icon" />
              <span class="ts-nav-item-text">Acklet Tools</span>
            </button>
          }
        </div>

        <div class="ts-nav-panel-divider" role="separator"></div>

        <!-- Dark / Light Theme Toggle in Navigation Sheet -->
        <div class="ts-nav-theme-row" (click)="toggleTheme()" role="menuitem">
          <div class="ts-nav-theme-left">
            <ts-icon [name]="isDark() ? 'moon' : 'sun'" [size]="18" class="ts-nav-action-icon" />
            <span class="ts-nav-item-text">{{ isDark() ? 'Dark Mode' : 'Light Mode' }}</span>
          </div>
          <button
            type="button"
            class="ts-nav-theme-toggle-switch"
            [class.is-dark]="isDark()"
            (click)="$event.stopPropagation(); toggleTheme()"
            role="switch"
            [attr.aria-checked]="isDark()"
            aria-label="Toggle dark mode"
          >
            <span class="ts-nav-switch-knob"></span>
          </button>
        </div>
      </nav>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .ts-topbar-card {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      height: var(--header-height, 64px);
      padding: 0 16px;
      /* Glass card: gradient fill, blur, edge ring, shadow */
      background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--ts-glass, #F0F3FF) var(--ts-a1-pct, calc(var(--ts-a1, .52) * 100%)), transparent),
        color-mix(in srgb, var(--ts-glass, #F0F3FF) var(--ts-a2-pct, calc(var(--ts-a2, .34) * 100%)), transparent)
      );
      -webkit-backdrop-filter: var(--ts-blur, blur(5px) saturate(160%));
      backdrop-filter: var(--ts-blur, blur(5px) saturate(160%));
      border-radius: var(--shell-radius, 20px);
      box-shadow: var(--ts-edge), var(--ts-shadow);
      border: none;
      position: relative;
      z-index: var(--ts-z-chrome, 11);
      user-select: none;
      box-sizing: border-box;
      min-width: 0;
      overflow: visible;
      transition: background var(--ts-dur-base, 200ms) var(--ts-ease),
                  box-shadow var(--ts-dur-base, 200ms) var(--ts-ease);
    }

    /* Left Zone */
    .ts-zone-left {
      display: flex;
      align-items: center;
      gap: 10px;
      justify-self: start;
      min-width: 0;
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
      background: var(--ts-row-hover, rgba(15, 23, 42, 0.035));
    }

    .ts-brand-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      color: var(--text, #18181B);
      outline: none;
      flex-shrink: 0;
      transition: opacity var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    :host-context([data-theme="dark"]) .ts-brand-link {
      color: var(--text, #FCFCFC);
    }

    .ts-brand-link:hover {
      opacity: 0.95;
    }

    .ts-brand-mark {
      color: var(--text);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      flex-shrink: 0;
      transition: transform var(--ts-dur-fast, 150ms) var(--ts-ease),
                  color var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .ts-brand-link:hover .ts-brand-mark {
      transform: scale(1.1);
      color: var(--accent);
    }

    .ts-brand-wordmark {
      font-family: var(--font-heading, "Nunito", sans-serif);
      font-size: 18px;
      font-weight: 800;
      color: var(--text);
      letter-spacing: -0.02em;
      line-height: 1;
      display: inline-flex;
      align-items: center;
    }

    .ts-breadcrumb-separator {
      color: var(--text-muted, #71717A);
      font-size: 13px;
      user-select: none;
    }

    /* Current Tool Chip */
    .ts-tool-chip {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: var(--ts-radius-full, 9999px);
      background: var(--surface-hover, #F4F4F5);
      border: 1px solid var(--border, rgba(0, 0, 0, 0.08));
      color: var(--text, #18181B);
      font-size: 12.5px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 180px;
    }

    [data-theme="dark"] .ts-tool-chip {
      background: #1E1E22;
      border-color: rgba(255, 255, 255, 0.08);
      color: var(--text, #FCFCFC);
    }

    /* Center Zone */
    .ts-zone-center {
      display: flex;
      align-items: center;
      justify-content: center;
      justify-self: center;
      height: 100%;
    }

    .ts-nav-links-track {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 3px;
      background: transparent;
      border-radius: var(--ts-radius-full, 9999px);
    }

    .ts-nav-active-pill {
      position: absolute;
      top: 3px;
      left: 0;
      height: calc(100% - 6px);
      border-radius: var(--ts-radius-full, 9999px);
      background: var(--accent-soft);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      z-index: 1;
      pointer-events: none;
      opacity: 0;
      transition: transform 220ms ease-out,
                  width 220ms ease-out,
                  opacity 150ms ease;
    }

    .ts-nav-active-pill.is-ready {
      opacity: 1;
    }

    .ts-nav-link-btn {
      position: relative;
      z-index: 2;
      display: inline-flex;
      align-items: center;
      padding: 5px 14px;
      border-radius: var(--ts-radius-full, 9999px);
      font-family: var(--font-body, "Nunito", sans-serif);
      font-size: 13.5px;
      font-weight: 500;
      color: var(--text-muted, #71717A);
      text-decoration: none;
      background: transparent;
      outline: none;
      cursor: pointer;
      white-space: nowrap;
      transition: color 150ms ease, background-color 150ms ease;
    }

    .ts-nav-link-btn:hover:not(.active) {
      color: var(--text, #18181B);
      background: var(--ts-row-hover, rgba(15, 23, 42, 0.035));
    }

    [data-theme="dark"] .ts-nav-link-btn:hover:not(.active) {
      color: var(--text, #FCFCFC);
      background: var(--ts-row-hover, rgba(255, 255, 255, 0.04));
    }

    .ts-nav-link-btn.active {
      color: var(--accent-strong);
      font-weight: 700;
    }

    .ts-nav-link-btn:focus-visible {
      outline: 2px solid var(--accent-strong) !important;
      outline-offset: 1px;
      z-index: 3;
    }

    /* Right Zone */
    .ts-zone-right {
      display: flex;
      align-items: center;
      gap: 8px;
      justify-self: end;
    }

    .ts-nav-action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 40px;
      min-width: 40px;
      padding: 0 12px;
      border-radius: var(--ts-radius-control, 12px);
      background: transparent;
      border: 1px solid var(--border, rgba(0, 0, 0, 0.08));
      color: var(--text-muted, #71717A);
      font-family: var(--font-body, "Nunito", sans-serif);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      outline: none;
      user-select: none;
      transition: background-color 150ms ease, color 150ms ease, transform 100ms ease;
    }

    :host-context([data-theme="dark"]) .ts-nav-action-btn {
      border-color: var(--border, rgba(255, 255, 255, 0.1));
      color: var(--text-muted, #A1A1AA);
    }

    .ts-nav-action-btn:hover {
      background: var(--ts-row-hover, rgba(15, 23, 42, 0.035));
      color: var(--text, #18181B);
    }

    :host-context([data-theme="dark"]) .ts-nav-action-btn:hover {
      background: var(--ts-row-hover, rgba(255, 255, 255, 0.04));
      color: var(--text, #FCFCFC);
    }

    .ts-nav-action-btn:active {
      transform: scale(0.97);
    }

    .ts-nav-action-btn:focus-visible {
      outline: 2px solid var(--ts-focus-ring) !important;
      outline-offset: 2px;
    }

    /* Tools Drawer Grid Button on Right - Only visible on small screen */
    .ts-tools-grid-btn {
      display: none;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      min-width: 40px;
      min-height: 40px;
      border-radius: var(--ts-radius-control, 12px);
      background: transparent;
      border: 1px solid var(--border, rgba(0, 0, 0, 0.08));
      color: var(--text-muted, #71717a);
      cursor: pointer;
      outline: none;
      transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease, transform 100ms ease;
    }

    :host-context([data-theme="dark"]) .ts-tools-grid-btn {
      border-color: var(--border, rgba(255, 255, 255, 0.1));
      color: var(--text-muted, #a1a1aa);
    }

    .ts-tools-grid-btn:hover,
    .ts-tools-grid-btn.active {
      background: var(--ts-row-hover, rgba(15, 23, 42, 0.04));
      color: var(--accent, #2563eb);
      border-color: var(--border, rgba(0, 0, 0, 0.15));
    }

    :host-context([data-theme="dark"]) .ts-tools-grid-btn:hover,
    :host-context([data-theme="dark"]) .ts-tools-grid-btn.active {
      background: var(--ts-row-hover, rgba(255, 255, 255, 0.06));
      color: var(--accent, #60a5fa);
      border-color: var(--border, rgba(255, 255, 255, 0.18));
    }

    .ts-tools-grid-btn:active {
      transform: scale(0.97);
    }

    .ts-tools-grid-btn:focus-visible {
      outline: 2px solid var(--ts-focus-ring) !important;
      outline-offset: 2px;
    }

    /* Navigation Menu Backdrop & Panel (Tablet Anchored Popover / Mobile Clean Sheet) */
    .ts-nav-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 998;
      animation: tsFadeIn 150ms ease-out;
    }

    .ts-nav-panel {
      position: absolute;
      top: calc(100% + 8px);
      left: 16px;
      width: 250px;
      border-radius: 16px;
      background: var(--bg-card, var(--card, #ffffff));
      color: var(--text, #09090b);
      border: 1px solid var(--border, rgba(0, 0, 0, 0.12));
      box-shadow: 0 16px 36px -6px rgba(0, 0, 0, 0.18), 0 0 0 1px var(--border, rgba(0, 0, 0, 0.06));
      z-index: 999;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      box-sizing: border-box;
    }

    :host-context([data-theme="dark"]) .ts-nav-panel {
      background: var(--bg-card, var(--surface-1, #18181b));
      color: var(--text, #fcfcfc);
      border-color: var(--border, rgba(255, 255, 255, 0.12));
      box-shadow: 0 20px 48px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px var(--border, rgba(255, 255, 255, 0.08));
    }

    .ts-nav-sheet-header {
      display: none;
    }

    .ts-nav-panel-links,
    .ts-nav-panel-actions {
      display: flex;
      flex-direction: column;
      gap: 2px;
      width: 100%;
    }

    .ts-nav-panel-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      min-height: 44px;
      height: 44px;
      padding: 0 14px;
      border-radius: 10px;
      border: none;
      background: transparent;
      color: var(--text, #18181b);
      font-family: var(--font-body, "Nunito", sans-serif);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      text-align: left;
      transition: background-color 150ms ease, color 150ms ease;
      user-select: none;
    }

    :host-context([data-theme="dark"]) .ts-nav-panel-item {
      color: var(--text, #f1f5f9);
    }

    .ts-nav-panel-item:hover {
      background: var(--surface-hover, rgba(15, 23, 42, 0.05));
      color: var(--accent, #2563eb);
    }

    :host-context([data-theme="dark"]) .ts-nav-panel-item:hover {
      background: var(--surface-hover, rgba(255, 255, 255, 0.08));
      color: var(--accent, #3b82f6);
    }

    .ts-nav-panel-item.active {
      background: var(--accent-soft, rgba(37, 99, 235, 0.1));
      color: var(--accent-strong, var(--accent, #1d4ed8));
      font-weight: 700;
    }

    :host-context([data-theme="dark"]) .ts-nav-panel-item.active {
      background: var(--accent-soft, rgba(59, 130, 246, 0.16));
      color: var(--accent-strong, var(--accent, #60a5fa));
    }

    .ts-nav-item-active-pill {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 9999px;
      background: var(--accent, #111111);
      color: var(--accent-ink, #ffffff);
    }

    :host-context([data-theme="dark"]) .ts-nav-item-active-pill {
      background: var(--accent, #60a5fa);
      color: #000000;
    }

    .ts-nav-action-row {
      justify-content: flex-start;
      gap: 12px;
    }

    .ts-nav-action-icon {
      flex-shrink: 0;
      color: var(--text-muted, #71717a);
    }

    .ts-nav-action-icon.is-fav {
      color: #eab308;
      fill: #eab308;
    }

    .ts-nav-panel-divider {
      height: 1px;
      background: var(--border, rgba(0, 0, 0, 0.08));
      margin: 4px 6px;
    }

    :host-context([data-theme="dark"]) .ts-nav-panel-divider {
      background: var(--border, rgba(255, 255, 255, 0.1));
    }

    /* Dark/Light Theme Row in Navigation Sheet */
    .ts-nav-theme-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      min-height: 44px;
      height: 44px;
      padding: 0 14px;
      border-radius: 10px;
      cursor: pointer;
      user-select: none;
      box-sizing: border-box;
      transition: background-color 150ms ease;
    }

    .ts-nav-theme-row:hover {
      background: var(--surface-hover, rgba(15, 23, 42, 0.05));
    }

    :host-context([data-theme="dark"]) .ts-nav-theme-row:hover {
      background: var(--surface-hover, rgba(255, 255, 255, 0.08));
    }

    .ts-nav-theme-left {
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--text, #18181b);
      font-family: var(--font-body, "Nunito", sans-serif);
      font-size: 14px;
      font-weight: 500;
    }

    :host-context([data-theme="dark"]) .ts-nav-theme-left {
      color: var(--text, #f1f5f9);
    }

    .ts-nav-theme-toggle-switch {
      position: relative;
      display: inline-flex;
      align-items: center;
      width: 44px;
      height: 24px;
      min-width: 44px;
      min-height: 24px;
      border-radius: 9999px;
      background: var(--border, rgba(15, 23, 42, 0.18));
      border: none;
      padding: 2px;
      cursor: pointer;
      outline: none;
      box-sizing: border-box;
      transition: background-color 200ms ease;
    }

    :host-context([data-theme="dark"]) .ts-nav-theme-toggle-switch {
      background: var(--border, rgba(255, 255, 255, 0.18));
    }

    .ts-nav-theme-toggle-switch.is-dark {
      background: var(--accent, #3b82f6);
    }

    .ts-nav-switch-knob {
      display: block;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
      transition: transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1);
      transform: translateX(0);
    }

    .ts-nav-theme-toggle-switch.is-dark .ts-nav-switch-knob {
      transform: translateX(20px);
    }

    /* Mobile Sheet Layout for Navigation Menu (<768px) */
    @media (max-width: 767px) {
      .ts-nav-panel {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        top: auto;
        width: 100%;
        max-width: 100%;
        border-radius: 20px 20px 0 0;
        padding: 12px 16px calc(16px + env(safe-area-inset-bottom, 0px)) 16px;
        box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.25);
        animation: tsSlideUp 200ms cubic-bezier(0.16, 1, 0.3, 1);
        max-height: 82vh;
        overflow-y: auto;
      }

      .ts-nav-sheet-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        padding-bottom: 8px;
        margin-bottom: 4px;
        border-bottom: 1px solid var(--border, rgba(0, 0, 0, 0.06));
      }

      :host-context([data-theme="dark"]) .ts-nav-sheet-header {
        border-bottom-color: var(--border, rgba(255, 255, 255, 0.08));
      }

      .ts-nav-sheet-handle {
        width: 36px;
        height: 4px;
        border-radius: 2px;
        background: var(--border, rgba(0, 0, 0, 0.2));
        margin-bottom: 10px;
      }

      :host-context([data-theme="dark"]) .ts-nav-sheet-handle {
        background: var(--border, rgba(255, 255, 255, 0.2));
      }

      .ts-nav-sheet-title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
      }

      .ts-nav-sheet-title {
        font-family: var(--font-heading, "Nunito", sans-serif);
        font-size: 16px;
        font-weight: 700;
        color: var(--text);
      }

      .ts-nav-sheet-close-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        min-width: 44px;
        min-height: 44px;
        border-radius: 10px;
        border: none;
        background: transparent;
        color: var(--text-muted);
        cursor: pointer;
      }
    }

    @keyframes tsSlideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }

    /* Enhanced Light Theme Navbar Focus & Capsule Track */
    :host-context([data-theme="light"]) .ts-nav-links-track,
    :host-context(:not([data-theme="dark"])) .ts-nav-links-track {
      background: rgba(15, 23, 42, 0.05);
      border: 1px solid rgba(15, 23, 42, 0.08);
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.03);
    }

    :host-context([data-theme="light"]) .ts-nav-active-pill,
    :host-context(:not([data-theme="dark"])) .ts-nav-active-pill {
      background: #FFFFFF;
      border: 1px solid var(--accent-border, rgba(37, 99, 235, 0.22));
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.09), 0 0 0 1px var(--accent-border, rgba(37, 99, 235, 0.08));
    }

    :host-context([data-theme="light"]) .ts-nav-link-btn,
    :host-context(:not([data-theme="dark"])) .ts-nav-link-btn {
      color: #64748B;
      font-weight: 500;
    }

    :host-context([data-theme="light"]) .ts-nav-link-btn:hover:not(.active),
    :host-context(:not([data-theme="dark"])) .ts-nav-link-btn:hover:not(.active) {
      color: #0F172A;
      background: rgba(15, 23, 42, 0.04);
    }

    :host-context([data-theme="light"]) .ts-nav-link-btn.active,
    :host-context(:not([data-theme="dark"])) .ts-nav-link-btn.active {
      color: var(--accent-strong, var(--accent, #1D4ED8));
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    /* Enhanced Dark Theme Navbar Calm & High-Legibility Focus Links */
    :host-context([data-theme="dark"]) .ts-nav-links-track {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.25);
    }

    :host-context([data-theme="dark"]) .ts-nav-active-pill {
      background: var(--accent-soft, rgba(59, 130, 246, 0.16));
      border: 1px solid var(--accent-border, rgba(59, 130, 246, 0.35));
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35), 0 0 8px -2px var(--accent-glow, rgba(59, 130, 246, 0.25));
    }

    :host-context([data-theme="dark"]) .ts-nav-link-btn {
      color: #94A3B8;
      font-weight: 500;
    }

    :host-context([data-theme="dark"]) .ts-nav-link-btn:hover:not(.active) {
      color: #F8FAFC;
      background: rgba(255, 255, 255, 0.08);
    }

    :host-context([data-theme="dark"]) .ts-nav-link-btn.active {
      color: var(--accent-strong, var(--accent, #60A5FA));
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    /* Save Button Stage, Gradient & Celebration Animation */
    .ts-star-stage {
      position: relative;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .ts-nav-star-svg {
      width: 18px;
      height: 18px;
      stroke: currentColor;
      fill: transparent;
      transform: translateZ(0);
      transition: fill 250ms ease, stroke 250ms ease, transform 250ms cubic-bezier(.22, 1, .36, 1);
    }

    .ts-save-btn:hover .ts-nav-star-svg {
      color: var(--accent);
      transform: scale(1.08);
    }

    .ts-save-btn.is-favorited {
      background: linear-gradient(135deg, var(--accent, #0284C7) 0%, color-mix(in srgb, var(--accent, #0284C7) 70%, #2563EB) 100%) !important;
      border-color: color-mix(in srgb, var(--accent, #0284C7) 90%, #ffffff) !important;
      color: #ffffff !important;
      box-shadow: 0 3px 12px color-mix(in srgb, var(--accent, #0284C7) 45%, transparent);
    }

    .ts-save-btn.is-favorited:hover {
      background: linear-gradient(135deg, color-mix(in srgb, var(--accent, #0284C7) 90%, #000) 0%, color-mix(in srgb, var(--accent, #0284C7) 75%, #1D4ED8) 100%) !important;
      color: #ffffff !important;
    }

    .ts-save-btn.is-favorited .ts-nav-star-svg {
      color: #ffffff !important;
      fill: #ffffff !important;
      stroke: #ffffff !important;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
    }

    .ts-save-btn.is-favorited .ts-action-label {
      color: #ffffff !important;
      background: none !important;
      -webkit-text-fill-color: initial !important;
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    @keyframes tsStarPop {
      0% { transform: scale(1) rotate(0deg); }
      30% { transform: scale(1.35) rotate(-15deg); }
      60% { transform: scale(0.9) rotate(8deg); }
      80% { transform: scale(1.1) rotate(-3deg); }
      100% { transform: scale(1) rotate(0deg); }
    }

    .ts-save-btn.is-celebrating .ts-nav-star-svg {
      animation: tsStarPop 700ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }

    /* Micro-burst sparkle star particles */
    .ts-star-sparkle {
      position: absolute;
      width: 9px;
      height: 9px;
      opacity: 0;
      pointer-events: none;
      transform-origin: center;
    }

    .ts-save-btn.is-celebrating .ts-star-sparkle.sp-1 {
      animation: tsBurstStar1 650ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .ts-save-btn.is-celebrating .ts-star-sparkle.sp-2 {
      animation: tsBurstStar2 650ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .ts-save-btn.is-celebrating .ts-star-sparkle.sp-3 {
      animation: tsBurstStar3 650ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .ts-save-btn.is-celebrating .ts-star-sparkle.sp-4 {
      animation: tsBurstStar4 650ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes tsBurstStar1 {
      0% { transform: translate(0, 0) scale(0.2) rotate(0deg); opacity: 1; }
      100% { transform: translate(-14px, -14px) scale(1) rotate(-45deg); opacity: 0; }
    }
    @keyframes tsBurstStar2 {
      0% { transform: translate(0, 0) scale(0.2) rotate(0deg); opacity: 1; }
      100% { transform: translate(14px, -14px) scale(1) rotate(45deg); opacity: 0; }
    }
    @keyframes tsBurstStar3 {
      0% { transform: translate(0, 0) scale(0.2) rotate(0deg); opacity: 1; }
      100% { transform: translate(-14px, 14px) scale(1) rotate(-30deg); opacity: 0; }
    }
    @keyframes tsBurstStar4 {
      0% { transform: translate(0, 0) scale(0.2) rotate(0deg); opacity: 1; }
      100% { transform: translate(14px, 14px) scale(1) rotate(30deg); opacity: 0; }
    }

    @media (prefers-reduced-motion: reduce) {
      .ts-save-btn.is-celebrating .ts-nav-star-svg,
      .ts-save-btn.is-celebrating .ts-star-sparkle {
        animation: none !important;
      }
    }

    @media (max-width: 1099px) {
      .hide-below-1100 {
        display: none !important;
      }
      .ts-nav-action-btn {
        padding: 0;
        width: 40px;
      }
    }

    @media (max-width: 479px) {
      .hide-xs {
        display: none !important;
      }
    }

    .ts-btn-primary-cta {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 36px;
      padding: 0 16px;
      border-radius: var(--ts-radius-full, 9999px);
      background: var(--text, #18181B);
      color: var(--bg, #FFFFFF);
      font-family: var(--font-body, "Nunito", sans-serif);
      font-size: 13.5px;
      font-weight: 600;
      text-decoration: none;
      transition: opacity 150ms ease, transform 150ms ease;
      white-space: nowrap;
    }

    .ts-btn-primary-cta:hover {
      opacity: 0.92;
      transform: scale(0.98);
    }

    /* Responsive Breakpoints */
    /* Medium screens (Tablet 768px - 1023px): Keep center navigation & theme toggle visible with tuned compact spacing */
    @media (min-width: 768px) and (max-width: 1023px) {
      .ts-topbar-card {
        padding: 0 12px;
      }
      .ts-zone-left {
        gap: 8px;
      }
      .ts-tool-chip {
        max-width: 140px;
      }
      .ts-nav-link-btn {
        padding: 5px 10px;
        font-size: 13px;
      }
      .ts-zone-right {
        gap: 8px;
      }
      .ts-tools-grid-btn {
        display: none !important;
      }
    }

    /* Small screens (Mobile <768px): Hide center navigation & theme toggle, show 4-circles navigation drawer button */
    @media (max-width: 767px) {
      .ts-tools-grid-btn {
        display: inline-flex !important;
      }
      ts-theme-toggle {
        display: none !important;
      }
      .ts-zone-center {
        display: none !important;
      }
      .ts-topbar-card {
        grid-template-columns: 1fr auto;
        height: 56px;
        padding: 0 8px;
        border-radius: 16px;
      }
      .ts-zone-left {
        gap: 6px;
      }
      .ts-zone-right {
        gap: 8px;
      }
      .ts-tool-chip {
        max-width: 120px;
        overflow: hidden;
      }
      .ts-tool-chip-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .hide-mobile {
        display: none !important;
      }
      .ts-search-btn {
        padding: 0 10px;
        height: 44px;
        min-height: 44px;
        min-width: 44px;
      }
      .ts-btn-primary-cta {
        padding: 0 14px;
        font-size: 13px;
        height: 44px;
        min-height: 44px;
      }
    }

    @media (max-width: 360px) {
      .ts-breadcrumb-separator,
      .ts-tool-chip {
        display: none !important;
      }
    }
  `]
})
export class TsTopbarComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly tool = input<ToolRegistryItem | null>(null);
  readonly currentCategory = input<string>('Utilities');
  readonly activeTabId = input<string>('');
  readonly showSidebar = input<boolean>(true);
  readonly showPrimaryAction = input<boolean>(false);
  readonly showSearch = input<boolean>(true);

  readonly tabChange = output<string>();
  readonly openCommandPalette = output<void>();
  readonly aboutClick = output<void>();
  readonly dynamicLinksClick = output<void>();

  readonly sidebarService = inject(ToolSidebarService);
  readonly sidebarState = inject(SidebarStateService);
  readonly settingsService = inject(ToolSettingsService);
  readonly themeService = inject(ToolThemeService, { optional: true });
  readonly portalUrl = getPortalUrl();
  readonly hubUrl = getToolsHubUrl();
  private readonly zone = inject(NgZone);

  readonly isDark = computed(() => this.themeService?.effectiveTheme() === 'dark');

  readonly navTrack = viewChild<ElementRef<HTMLElement>>('navTrack');
  readonly navLinkBtns = viewChildren<ElementRef<HTMLAnchorElement>>('navLinkBtns');

  readonly activeSection = signal<string>('tool');
  readonly indicatorWidth = signal<number>(0);
  readonly indicatorTransform = signal<string>('translateX(0px)');
  readonly isIndicatorReady = signal<boolean>(false);
  readonly copiedLink = signal<boolean>(false);
  readonly isFavorited = signal<boolean>(false);

  private readonly elementRef = inject(ElementRef);
  readonly isNavMenuOpen = signal<boolean>(false);

  toggleNavMenu(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.isNavMenuOpen.update(v => !v);
  }

  closeNavMenu(): void {
    this.isNavMenuOpen.set(false);
  }

  toggleTheme(): void {
    this.themeService?.toggleTheme();
  }

  openToolsDrawerFromNav(): void {
    this.closeNavMenu();
    this.sidebarService.openMobileDrawer();
  }

  toggleToolsDrawer(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.sidebarService.toggleMobileDrawer();
  }

  onNavMenuItemClick(event: MouseEvent, sectionId: string): void {
    this.closeNavMenu();
    if (sectionId === 'dynamic') {
      this.activeSection.set('dynamic');
      this.dynamicLinksClick.emit();
      this.tabChange.emit('dynamic');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('acklet:switch-tab', { detail: 'dynamic' }));
      }
      return;
    }
    if (sectionId === 'tool') {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('acklet:switch-tab', { detail: 'tool' }));
      }
    }
    this.scrollToSection(event, sectionId);
  }

  onNavShareClick(): void {
    this.closeNavMenu();
    this.shareTool();
  }

  onNavSaveClick(): void {
    this.toggleFavorite();
  }

  shareTool(): void {
    if (typeof window === 'undefined') return;
    const url = window.location.href.split('#')[0];
    const title = this.tool()?.name || 'Acklet Tool';
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title, url }).catch(() => {});
    } else {
      this.copyShareLink();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isNavMenuOpen()) {
      const target = event.target as HTMLElement;
      if (!this.elementRef.nativeElement.querySelector('.ts-nav-panel')?.contains(target) &&
          !this.elementRef.nativeElement.querySelector('.ts-tools-grid-btn')?.contains(target)) {
        this.closeNavMenu();
      }
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isNavMenuOpen()) {
      this.closeNavMenu();
    }
  }

  copyShareLink(): void {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    const url = window.location.href.split('#')[0];
    navigator.clipboard.writeText(url).then(() => {
      this.copiedLink.set(true);
      setTimeout(() => this.copiedLink.set(false), 2000);
    }).catch(() => { });
  }

  readonly isCelebrating = signal<boolean>(false);

  private loadFavoriteState(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const slug = this.tool()?.slug;
        if (!slug) {
          this.isFavorited.set(false);
          return;
        }
        const raw = window.localStorage.getItem(FAVORITES_KEY);
        const list: string[] = raw ? JSON.parse(raw) : [];
        this.isFavorited.set(list.includes(slug));
      }
    } catch {}
  }

  toggleFavorite(): void {
    const next = !this.isFavorited();
    this.isFavorited.set(next);
    if (next) {
      this.isCelebrating.set(true);
      setTimeout(() => this.isCelebrating.set(false), 850);
    }
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const slug = this.tool()?.slug;
        if (slug) {
          const raw = window.localStorage.getItem(FAVORITES_KEY);
          let list: string[] = raw ? JSON.parse(raw) : [];
          if (next) {
            if (!list.includes(slug)) list.push(slug);
          } else {
            list = list.filter(s => s !== slug);
          }
          window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
          window.dispatchEvent(new Event('storage'));
        }
      }
    } catch {}
  }

  private intersectionObserver?: IntersectionObserver;
  private boundScrollListener?: () => void;
  private scrollContainerEl?: HTMLElement | null;

  constructor() {
    effect(() => {
      this.tool();
      this.loadFavoriteState();
    });

    effect(() => {
      const links = this.sectionLinks();
      if (links.length > 0 && typeof window !== 'undefined') {
        setTimeout(() => {
          this.updatePillIndicator();
          this.setupScrollSpy();
        }, 150);
      }
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', () => this.loadFavoriteState());
    }
  }

  // Build section links from tool definition
  readonly sectionLinks = computed<SectionNavLink[]>(() => {
    const t = this.tool();
    if (!t) return [];

    // Custom nav links from registry if provided
    if (t.navLinks && t.navLinks.length > 0) {
      return t.navLinks;
    }

    const links: SectionNavLink[] = [
      { id: 'tool', label: 'Tool' }
    ];

    if (t.about || t.description || t.shortDescription || (t.features && t.features.length > 0)) {
      links.push({ id: 'about', label: 'About' });
    }
    if ((t.howTo && t.howTo.length > 0) || (t.howItWorks && t.howItWorks.length > 0)) {
      links.push({ id: 'how-to-use', label: 'How to use' });
    }
    if (t.faqs && t.faqs.length > 0) {
      links.push({ id: 'faq', label: 'FAQ' });
    }
    if ((t.related && t.related.length > 0) || (t.suggestedTools && t.suggestedTools.length > 0)) {
      links.push({ id: 'related', label: 'Related' });
    }

    return links;
  });

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.setupScrollSpy();
        this.handleInitialHash();
      }, 250);
    }
  }

  private handleInitialHash(): void {
    if (typeof window === 'undefined' || !window.location.hash) return;
    const hash = window.location.hash.replace('#', '');
    const valid = this.sectionLinks().some(l => l.id === hash);
    if (valid) {
      setTimeout(() => {
        this.scrollToSection(new MouseEvent('click'), hash);
      }, 350);
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.updatePillIndicator();
      this.setupScrollSpy();
    }, 250);
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
    if (this.scrollContainerEl && this.boundScrollListener) {
      this.scrollContainerEl.removeEventListener('scroll', this.boundScrollListener);
    }
  }

  scrollToSection(event: MouseEvent, sectionId: string): void {
    event.preventDefault();
    this.activeSection.set(sectionId);
    this.updatePillIndicator();

    if (typeof document === 'undefined') return;

    if (sectionId === 'dynamic') {
      this.dynamicLinksClick.emit();
      this.tabChange.emit('dynamic');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('acklet:switch-tab', { detail: 'dynamic' }));
      }
      return;
    }

    const scrollContainer = (document.querySelector('.ts-main-scroll-container') || document.getElementById('main-content')) as HTMLElement | null;

    if (sectionId === 'tool') {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('acklet:switch-tab', { detail: 'tool' }));
      }
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const toolEl = document.getElementById('tool');
        if (toolEl) {
          toolEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
      return;
    }

    const performScroll = (el: HTMLElement) => {
      if (scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const targetRect = el.getBoundingClientRect();
        const scrollOffset = targetRect.top - containerRect.top + scrollContainer.scrollTop;
        scrollContainer.scrollTo({
          top: Math.max(0, scrollOffset - 24),
          behavior: 'smooth'
        });
      } else {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    const targetEl = document.getElementById(sectionId);
    if (targetEl) {
      performScroll(targetEl);
    } else {
      setTimeout(() => {
        const retryEl = document.getElementById(sectionId);
        if (retryEl) {
          performScroll(retryEl);
        }
      }, 100);
    }
  }

  private setupScrollSpy(): void {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;

    const scrollContainer = (document.querySelector('.ts-main-scroll-container') || document.getElementById('main-content')) as HTMLElement | null;
    if (!scrollContainer) return;

    if (this.scrollContainerEl && this.boundScrollListener) {
      this.scrollContainerEl.removeEventListener('scroll', this.boundScrollListener);
    }
    this.intersectionObserver?.disconnect();

    this.intersectionObserver = new IntersectionObserver((entries) => {
      this.zone.run(() => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            if (id) {
              this.activeSection.set(id);
              this.updatePillIndicator();
            }
          }
        }
      });
    }, {
      root: scrollContainer,
      rootMargin: '-10% 0px -70% 0px',
      threshold: 0
    });

    const sections = ['tool', 'about', 'how-to-use', 'faq', 'related'];
    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        this.intersectionObserver?.observe(el);
      }
    });

    this.boundScrollListener = () => {
      if (scrollContainer.scrollTop < 80 && this.activeSection() !== 'tool') {
        this.zone.run(() => {
          this.activeSection.set('tool');
          this.updatePillIndicator();
        });
      }
    };
    this.scrollContainerEl = scrollContainer;
    scrollContainer.addEventListener('scroll', this.boundScrollListener, { passive: true });
  }

  private updatePillIndicator(): void {
    const track = this.navTrack()?.nativeElement;
    const btns = this.navLinkBtns();
    if (!track || !btns || btns.length === 0) return;

    const currentId = this.activeSection();
    const links = this.sectionLinks();
    const activeIdx = links.findIndex(l => l.id === currentId);

    if (activeIdx === -1 || !btns[activeIdx]) {
      this.isIndicatorReady.set(false);
      return;
    }

    const btnEl = btns[activeIdx].nativeElement;
    const trackRect = track.getBoundingClientRect();
    const btnRect = btnEl.getBoundingClientRect();

    const left = btnRect.left - trackRect.left;
    const width = btnRect.width;

    this.indicatorWidth.set(width);
    this.indicatorTransform.set(`translateX(${left}px)`);
    this.isIndicatorReady.set(true);
  }
}

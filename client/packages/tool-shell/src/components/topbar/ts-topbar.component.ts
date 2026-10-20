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
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolSidebarService } from '../../services/tool-sidebar.service';
import { getToolsHubUrl, getPortalUrl } from '@acklet/shared';
import { ToolRegistryItem } from '@acklet/tool-registry';
import { TsIconComponent } from '../icon/ts-icon.component';
import { TsThemeToggleComponent } from '../theme/ts-theme-toggle.component';
import { TsTooltipDirective } from '../primitive/ts-tooltip.directive';
import { HlmKbdImports } from '../../helm/kbd';

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
        @if (showSidebar()) {
          <button 
            type="button" 
            class="ts-mobile-menu-btn" 
            (click)="sidebarService.toggleMobileDrawer()"
            aria-label="Toggle navigation menu"
            tsTooltip="Toggle menu"
          >
            <ts-icon name="menu" [size]="18" />
          </button>
        }

        <!-- Acklet Tools Brand Link to Tools Hub -->
        <a [href]="hubUrl" class="ts-brand-link" title="Acklet Tools Hub">
          <ts-icon name="zap" [size]="24" class="ts-brand-mark" />
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
      <!-- Right Zone: Share, Save, Theme Toggle (Order: Share, Save, Theme) -->
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
              <defs>
                <linearGradient id="tsStarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#F59E0B" />
                  <stop offset="50%" stop-color="#10B981" />
                  <stop offset="100%" stop-color="#06B6D4" />
                </linearGradient>
              </defs>
              <polygon 
                points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                [attr.fill]="isFavorited() ? 'url(#tsStarGradient)' : 'transparent'"
                [attr.stroke]="isFavorited() ? 'url(#tsStarGradient)' : 'currentColor'"
              />
            </svg>
            <svg class="ts-star-sparkle sp-1" viewBox="0 0 24 24"><path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" fill="#F59E0B"/></svg>
            <svg class="ts-star-sparkle sp-2" viewBox="0 0 24 24"><path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" fill="#10B981"/></svg>
            <svg class="ts-star-sparkle sp-3" viewBox="0 0 24 24"><path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" fill="#06B6D4"/></svg>
            <svg class="ts-star-sparkle sp-4" viewBox="0 0 24 24"><path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" fill="#FBBF24"/></svg>
          </div>
          <span class="ts-action-label hide-below-1100">{{ isFavorited() ? 'Saved' : 'Save' }}</span>
        </button>

        <!-- ONE Single Theme Toggle -->
        <ts-theme-toggle />

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
      overflow: hidden;
      transform: translateZ(0);
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
      opacity: 0.85;
    }

    .ts-brand-mark {
      color: var(--text);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      flex-shrink: 0;
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
      border: 1px solid var(--accent-border, rgba(15, 118, 110, 0.22));
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.09), 0 0 0 1px rgba(15, 118, 110, 0.08);
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
      color: var(--accent, #0F766E);
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
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid var(--accent-border, rgba(45, 212, 191, 0.3));
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35), 0 0 8px -2px var(--accent-glow, rgba(45, 212, 191, 0.2));
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
      color: #2DD4BF;
      font-weight: 600;
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
      color: var(--accent, #0F766E);
    }

    .ts-save-btn.is-favorited .ts-nav-star-svg {
      filter: drop-shadow(0 2px 8px rgba(16, 185, 129, 0.4));
    }

    .ts-save-btn.is-favorited .ts-action-label {
      background: linear-gradient(135deg, #F59E0B 0%, #10B981 50%, #06B6D4 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      font-weight: 700;
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
    @media (max-width: 1023px) {
      .ts-mobile-menu-btn {
        display: inline-flex;
        width: 44px;
        height: 44px;
        min-width: 44px;
        min-height: 44px;
      }
      .ts-zone-center {
        display: none;
      }
      .ts-topbar-card {
        grid-template-columns: 1fr auto;
      }
    }

    @media (max-width: 767px) {
      .ts-topbar-card {
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

  readonly sidebarService = inject(ToolSidebarService);
  readonly portalUrl = getPortalUrl();
  readonly hubUrl = getToolsHubUrl();
  private readonly zone = inject(NgZone);

  readonly navTrack = viewChild<ElementRef<HTMLElement>>('navTrack');
  readonly navLinkBtns = viewChildren<ElementRef<HTMLAnchorElement>>('navLinkBtns');

  readonly activeSection = signal<string>('tool');
  readonly indicatorWidth = signal<number>(0);
  readonly indicatorTransform = signal<string>('translateX(0px)');
  readonly isIndicatorReady = signal<boolean>(false);
  readonly copiedLink = signal<boolean>(false);
  readonly isFavorited = signal<boolean>(false);

  copyShareLink(): void {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    const url = window.location.href.split('#')[0];
    navigator.clipboard.writeText(url).then(() => {
      this.copiedLink.set(true);
      setTimeout(() => this.copiedLink.set(false), 2000);
    }).catch(() => { });
  }

  readonly isCelebrating = signal<boolean>(false);

  toggleFavorite(): void {
    const next = !this.isFavorited();
    this.isFavorited.set(next);
    if (next) {
      this.isCelebrating.set(true);
      setTimeout(() => this.isCelebrating.set(false), 850);
    }
  }

  private intersectionObserver?: IntersectionObserver;
  private boundScrollListener?: () => void;
  private scrollContainerEl?: HTMLElement | null;

  constructor() {
    effect(() => {
      const links = this.sectionLinks();
      if (links.length > 0 && typeof window !== 'undefined') {
        setTimeout(() => {
          this.updatePillIndicator();
          this.setupScrollSpy();
        }, 150);
      }
    });
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

    const scrollContainer = (document.querySelector('.ts-main-scroll-container') || document.getElementById('main-content')) as HTMLElement | null;

    if (sectionId === 'tool') {
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

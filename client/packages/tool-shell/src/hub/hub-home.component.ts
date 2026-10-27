// packages/tool-shell/src/hub/hub-home.component.ts
import {
  Component,
  signal,
  computed,
  OnInit,
  OnDestroy,
  HostListener,
  ElementRef,
  viewChild,
  inject,
  effect,
  NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { getAllTools, ToolRegistryItem } from '@acklet/tool-registry';
import { getToolUrl } from '@acklet/shared';
import { TsIconComponent } from '../components/icon/ts-icon.component';
import { TsPillTabsComponent, PillTabItem } from '../components/primitive/ts-pill-tabs.component';
import { TsEmptyStateComponent } from '../components/primitive/ts-empty-state.component';
import { TsToolTileComponent } from '../components/primitive/ts-tool-tile.component';
import { TsSpotlightDirective } from '../components/primitive/ts-spotlight.directive';
import { TsThemeToggleComponent } from '../components/theme/ts-theme-toggle.component';
import { ToolCapsuleService } from '../services/tool-capsule.service';
import { ToolThemeService } from '../services/tool-theme.service';
import { HlmItemImports } from '../helm/item';
import { HlmBadgeImports } from '../helm/badge';
import { HlmKbdImports } from '../helm/kbd';
import { HlmSkeletonImports } from '../helm/skeleton';
import { HlmInputGroupImports } from '../helm/input-group';

const FAVORITES_KEY = 'acklet.tools.favorites';
const RECENT_KEY = 'acklet.tools.recent';

@Component({
  selector: 'hub-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TsIconComponent,
    TsPillTabsComponent,
    TsEmptyStateComponent,
    TsToolTileComponent,
    TsSpotlightDirective,
    TsThemeToggleComponent,
    HlmItemImports,
    HlmBadgeImports,
    HlmKbdImports,
    HlmSkeletonImports,
    HlmInputGroupImports
  ],
  template: `
    <div class="hub-page-root" [class.is-navigating]="isNavigating()">
      <!-- Screen reader announcement -->
      <div class="sr-only" aria-live="polite" aria-atomic="true">
        {{ ariaLiveAnnouncement() }}
      </div>

      <!-- ══════════════════════════════════════════════════════ -->
      <!-- Visual Background Layer (Hero/Header Area)              -->
      <!-- ══════════════════════════════════════════════════════ -->
      <div class="hub-hero-bg-layer" aria-hidden="true">
        <div class="hub-hero-gradient"></div>
        <div class="hub-hero-grain"></div>
        <div class="hub-hero-veil"></div>
      </div>

      <!-- ══════════════════════════════════════════════════════ -->
      <!-- A) FIXED TOP AREA (Sticky within Main Card)            -->
      <!-- ══════════════════════════════════════════════════════ -->
      <header class="hub-header-sticky">
        <div class="hub-header-inner">
          <!-- 1. Page Title & 2. Subtitle + Quick Theme Toggle -->
          <div class="hub-header-top-row">
            <div class="hub-titles">
              <h1 class="hub-heading">Tools</h1>
              <p class="hub-subheading">
                Simple, private tools for everyday work. No sign-up.
              </p>
            </div>
            <div class="hub-header-actions">
              <ts-theme-toggle />
            </div>
          </div>

          <!-- 3. Search Bar with Kbd Hint -->
          <div class="hub-search-box">
            <div hlmInputGroup class="hub-input-group">
              <!-- Search Icon Start Addon -->
              <div hlmInputGroupAddon align="inline-start" class="hub-search-start-addon">
                <ts-icon name="search" [size]="16" class="hub-search-icon" />
              </div>

              <!-- Input -->
              <input
                #searchInput
                hlmInputGroupInput
                type="text"
                placeholder="Search tools"
                [ngModel]="searchQuery()"
                (ngModelChange)="onSearchInput($event)"
                aria-label="Search tools"
                class="hub-search-input"
              />

              <!-- End Addons: Clear Button or "/" Keyboard Hint -->
              <div hlmInputGroupAddon align="inline-end" class="hub-search-end-addon">
                @if (searchQuery()) {
                  <button
                    type="button"
                    class="hub-clear-btn"
                    (click)="clearSearch()"
                    aria-label="Clear search"
                  >
                    <ts-icon name="x" [size]="14" />
                  </button>
                } @else {
                  <kbd hlmKbd class="hub-kbd-hint hide-mobile">/</kbd>
                }
              </div>
            </div>
          </div>

          <!-- 4. One Tab Row Only (Segmented Pill Tabs) + Small Result Count with Fade Swap -->
          <div class="hub-tabs-row">
            <div class="hub-tabs-track">
              <ts-pill-tabs
                [tabs]="tabsList()"
                [activeTabId]="activeTab()"
                ariaLabel="Filter tools"
                (tabChange)="selectTab($event)"
              />
            </div>
            <div class="hub-result-count" aria-hidden="true">
              <span class="hub-count-num">
                {{ displayedTools().length }}
              </span>
              <span>{{ displayedTools().length === 1 ? 'tool' : 'tools' }}</span>
            </div>
          </div>
        </div>
      </header>

      <!-- ══════════════════════════════════════════════════════ -->
      <!-- B) SCROLLABLE AREA: Flat Container-Queried Grid (Max 2) -->
      <!-- ══════════════════════════════════════════════════════ -->
      <section class="hub-content-scrollable" #gridContainer>
        @if (isLoading()) {
          <!-- Skeleton Loading State (Only on first initial load) -->
          <div class="hub-tools-grid" aria-busy="true">
            @for (sk of [1, 2, 3, 4, 5, 6]; track sk) {
              <div class="hub-skeleton-item">
                <div hlmSkeleton class="hub-skeleton-media"></div>
                <div class="hub-skeleton-content">
                  <div hlmSkeleton class="hub-skeleton-title"></div>
                  <div hlmSkeleton class="hub-skeleton-desc"></div>
                </div>
              </div>
            }
          </div>
        } @else if (displayedTools().length === 0) {
          <!-- Empty States -->
          <div class="hub-empty-state-wrapper">
            @if (activeTab() === 'favorites') {
              <ts-empty-state
                icon="star"
                title="No favorites yet"
                description="Tap the star on any tool to save it here for quick access."
              />
            } @else if (activeTab() === 'recent') {
              <ts-empty-state
                icon="history"
                title="No recent tools"
                description="Tools you open will show here."
              />
            } @else {
              <ts-empty-state
                icon="search"
                title="No tools found"
                [description]="searchQuery().trim() ? 'No tools match &quot;' + searchQuery() + '&quot;. Try another search keyword.' : 'No tools available in this category.'"
                actionLabel="Clear search"
                (action)="clearAllFilters()"
              />
            }
          </div>
        } @else {
          <!-- Flat 1-or-2 Column Grid of Spartan Item Rows with FLIP & Spotlight -->
          <div 
            class="hub-tools-grid"
            role="list"
            [attr.data-tab-token]="activeTab()"
          >
            @for (tool of displayedTools(); track tool.slug; let idx = $index) {
              <a
                hlm-item
                variant="outline"
                tsSpotlight
                [href]="getToolHref(tool.slug)"
                class="hub-tool-row-link group"
                role="listitem"
                [attr.data-slug]="tool.slug"
                [attr.data-index]="idx"
                [class.is-entering]="enteringSlugs().has(tool.slug)"
                [class.is-leaving]="leavingSlugs().has(tool.slug)"
                [style.--stagger-delay.ms]="idx < 8 ? idx * 30 : 240"
                (click)="onToolClick($event, tool)"
                (keydown)="onRowKeyDown($event, idx)"
              >
                <!-- Cursor Spotlight Surface (Pointer devices only) -->
                <div class="hub-spotlight-layer" aria-hidden="true"></div>

                <!-- Icon Tile (turns solid black on hover with white icon) -->
                <hlm-item-media>
                  <ts-tool-tile
                    [icon]="tool.icon"
                    [name]="tool.name"
                    [category]="tool.category"
                    [size]="42"
                    class="hub-row-icon-tile"
                  />
                </hlm-item-media>

                <!-- Tool Name + Description + Badge -->
                <hlm-item-content>
                  <div class="hub-row-title-line">
                    <span hlmItemTitle class="hub-tool-name" [innerHTML]="highlightMatch(tool.name)"></span>
                  </div>
                  <p hlmItemDescription class="hub-tool-desc" [innerHTML]="highlightMatch(tool.shortDescription)"></p>
                </hlm-item-content>

                <!-- Right Side Actions: Favorite Star Button + Open Arrow Icon -->
                <hlm-item-actions>
                  <button
                    type="button"
                    class="hub-star-btn"
                    [class.is-favorite]="isFavorite(tool.slug)"
                    (click)="toggleFavorite($event, tool.slug)"
                    [attr.aria-label]="isFavorite(tool.slug) ? 'Remove ' + tool.name + ' from favorites' : 'Add ' + tool.name + ' to favorites'"
                    title="Toggle favorite"
                  >
                    <ts-icon 
                      name="star" 
                      [size]="16"
                      class="hub-star-icon" 
                    />
                  </button>

                  <div class="hub-open-arrow" aria-hidden="true">
                    <ts-icon name="arrow-up-right" [size]="16" />
                  </div>
                </hlm-item-actions>
              </a>
            }
          </div>
        }
      </section>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-width: 0;
      color: var(--text, #18181B);
      font-family: var(--font-body, "Nunito", sans-serif);
      position: relative;

      /* ══ Phase 1 Theme Tokens ══════════════════════════════════ */
      --bg-base: #EEEDED;
      --glow-peach: rgba(247, 214, 196, 0.85);
      --glow-lavender: rgba(196, 190, 230, 0.75);
      --glow-blue: rgba(99, 112, 235, 0.85);
      --grid-line: rgba(0, 0, 0, 0.08);
      --grid-hover: rgba(80, 90, 220, 0.35);
      --headline-veil: rgba(255, 255, 255, 0.35);
    }

    /* Dark Mode Theming (using existing dark theme selectors) */
    :host-context([data-theme="dark"]),
    [data-theme="dark"] :host,
    :host([data-theme="dark"]) {
      --bg-base: #0E1016;
      --glow-peach: rgba(225, 112, 138, 0.25); /* muted rose at ~25% */
      --glow-lavender: rgba(99, 85, 180, 0.35); /* deep violet at lower opacity */
      --glow-blue: rgba(45, 65, 160, 0.45); /* deep navy/indigo at lower opacity */
      --grid-line: rgba(255, 255, 255, 0.07);
      --grid-hover: rgba(140, 150, 255, 0.35);
      --headline-veil: rgba(14, 16, 22, 0.35);
    }

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

    .hub-page-root {
      width: 100%;
      margin: 0 auto;
      padding: 0 4px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      box-sizing: border-box;
      transition: opacity 200ms ease-out;
      position: relative;
      isolation: isolate;
      overflow-x: hidden;
    }

    .hub-page-root.is-navigating {
      opacity: 0.65;
      pointer-events: none;
    }

    /* ══════════════════════════════════════════════════════════ */
    /* Premium Hero Gradient Background Layer (Phase 1)          */
    /* ══════════════════════════════════════════════════════════ */
    .hub-hero-bg-layer {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      width: 100%;
      height: clamp(520px, 85vh, 760px);
      z-index: -1;
      pointer-events: none;
      overflow: hidden;
      contain: paint;
      background-color: var(--bg-base);
      transition: background-color var(--ts-dur-base, 200ms) var(--ts-ease);
    }

    .hub-hero-gradient {
      position: absolute;
      inset: 0;
      background-image:
        /* peach glow center-left */
        radial-gradient(60% 55% at 38% 60%, var(--glow-peach) 0%, transparent 70%),
        /* lavender mid-right */
        radial-gradient(55% 60% at 75% 70%, var(--glow-lavender) 0%, transparent 70%),
        /* blue corner bottom-right */
        radial-gradient(45% 55% at 100% 100%, var(--glow-blue) 0%, transparent 70%),
        /* fade to page background at bottom edge */
        linear-gradient(180deg, transparent 0%, transparent 60%, var(--bg-base) 100%);
      background-repeat: no-repeat;
    }

    .hub-hero-grain {
      position: absolute;
      inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
      background-repeat: repeat;
      background-size: 180px 180px;
      opacity: 0.05;
      mix-blend-mode: multiply;
      pointer-events: none;
    }

    :host-context([data-theme="dark"]) .hub-hero-grain {
      opacity: 0.04;
      mix-blend-mode: overlay;
    }

    .hub-hero-veil {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 280px;
      background: radial-gradient(ellipse 65% 50% at 25% 35%, var(--headline-veil) 0%, transparent 80%);
      pointer-events: none;
    }

    @media (max-width: 640px) {
      .hub-hero-bg-layer {
        height: clamp(420px, 75vh, 560px);
      }
      .hub-hero-gradient {
        background-image:
          radial-gradient(75% 50% at 30% 50%, var(--glow-peach) 0%, transparent 70%),
          radial-gradient(70% 55% at 75% 65%, var(--glow-lavender) 0%, transparent 70%),
          radial-gradient(60% 60% at 100% 100%, var(--glow-blue) 0%, transparent 70%),
          linear-gradient(180deg, transparent 0%, transparent 55%, var(--bg-base) 100%);
      }
    }

    /* ══════════════════════════════════════════════════════════ */
    /* A) FIXED TOP AREA (Sticky inside the scrolling main card) */
    /* ══════════════════════════════════════════════════════════ */
    .hub-header-sticky {
      position: sticky;
      top: -24px; /* Matches ts-main-scroll-container top padding */
      z-index: 25;
      background: color-mix(in srgb, var(--bg-base) 65%, transparent);
      padding: 12px 0 16px;
      margin-top: -8px;
      border-bottom: 1px solid var(--grid-line, rgba(0, 0, 0, 0.08));
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      transition: background-color var(--ts-dur-base, 200ms) var(--ts-ease),
                  border-color var(--ts-dur-base, 200ms) var(--ts-ease);
    }

    :host-context([data-theme="dark"]) .hub-header-sticky {
      background: color-mix(in srgb, var(--bg-base) 65%, transparent);
      border-bottom-color: var(--grid-line, rgba(255, 255, 255, 0.07));
    }

    .hub-header-inner {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
    }

    .hub-header-top-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      width: 100%;
    }

    .hub-header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      padding-top: 4px;
    }

    .hub-titles {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .hub-heading {
      font-family: var(--font-heading, "Nunito", sans-serif);
      font-size: clamp(24px, 2rem, 30px);
      font-weight: 800;
      color: var(--text, #09090B);
      letter-spacing: -0.025em;
      margin: 0;
      line-height: 1.15;
    }

    :host-context([data-theme="dark"]) .hub-heading {
      color: var(--text, #FCFCFC);
    }

    .hub-subheading {
      font-size: clamp(13px, 14px, 15px);
      color: var(--text-muted, #71717A);
      margin: 0;
      line-height: 1.45;
    }

    /* Search Input Pill */
    .hub-search-box {
      width: 100%;
      position: relative;
    }

    .hub-input-group {
      width: 100%;
      height: 44px;
      background: var(--surface-hover, #F4F4F5);
      border: 1px solid var(--border, rgba(0, 0, 0, 0.08));
      border-radius: var(--ts-radius-full, 9999px);
      box-shadow: none;
      display: flex;
      align-items: center;
      position: relative;
      transition: background-color 150ms ease, border-color 150ms ease;
    }

    :host-context([data-theme="dark"]) .hub-input-group {
      background: var(--surface-hover, #1E1E22);
      border-color: var(--border, rgba(255, 255, 255, 0.08));
    }

    .hub-input-group:focus-within {
      outline: none !important;
      border-color: var(--border-accent, #18181B);
    }

    :host-context([data-theme="dark"]) .hub-input-group:focus-within {
      border-color: var(--border-accent, #71717A);
    }

    .hub-search-input {
      width: 100%;
      height: 100%;
      padding-left: 42px;
      padding-right: 48px;
      font-size: 14.5px;
      font-family: inherit;
      color: var(--text, #18181B);
      background: transparent;
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
    }

    :host-context([data-theme="dark"]) .hub-search-input {
      color: var(--text, #FCFCFC);
    }

    .hub-search-input::placeholder {
      color: var(--text-muted, #71717A);
      opacity: 0.9;
    }

    .hub-search-start-addon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted, #71717A);
    }

    .hub-search-end-addon {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .hub-clear-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: var(--ts-radius-full, 9999px);
      background: transparent;
      border: none;
      color: var(--text-muted, #71717A);
      cursor: pointer;
      transition: all 150ms ease;
    }

    .hub-clear-btn:hover {
      color: var(--text, #18181B);
      background: rgba(0, 0, 0, 0.06);
    }

    :host-context([data-theme="dark"]) .hub-clear-btn:hover {
      color: #FFFFFF;
      background: rgba(255, 255, 255, 0.1);
    }

    .hub-kbd-hint {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-family: var(--ts-font-mono, monospace);
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted, #71717A);
      background: var(--surface, #E4E4E7);
      border: 1px solid var(--border, rgba(0, 0, 0, 0.08));
      border-radius: 4px;
      padding: 1px 6px;
      line-height: 1.3;
    }

    :host-context([data-theme="dark"]) .hub-kbd-hint {
      background: #27272A;
      border-color: rgba(255, 255, 255, 0.1);
      color: var(--text-muted, #A1A1AA);
    }

    /* Tabs Row */
    .hub-tabs-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      width: 100%;
    }

    .hub-tabs-track {
      flex: 1;
      min-width: 0;
      overflow-x: auto;
    }

    .hub-result-count {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-muted, #71717A);
      white-space: nowrap;
      padding-right: 4px;
    }

    .hub-count-num {
      display: inline-block;
      animation: countSwapFade 180ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes countSwapFade {
      0% {
        opacity: 0;
        transform: translateY(-3px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* ══════════════════════════════════════════════════════════ */
    /* B) SCROLLABLE CONTAINER-QUERIED GRID (Min 1, Max 2 tools) */
    /* ══════════════════════════════════════════════════════════ */
    .hub-content-scrollable {
      width: 100%;
      min-height: 360px;
      container-type: inline-size;
      container-name: hub-grid-wrapper;
    }

    .hub-tools-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
      width: 100%;
      position: relative;
    }

    /* Strict Container Query: 1 column below 720px, 2 columns from 720px */
    @container hub-grid-wrapper (min-width: 720px) {
      .hub-tools-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    /* Spartan Item Row Link Overrides & Grayscale Calm Styling */
    .hub-tool-row-link {
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      border-radius: 14px;
      background: var(--surface, #FFFFFF);
      border: 1px solid var(--border, rgba(0, 0, 0, 0.07));
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
      color: var(--text, #18181B);
      cursor: pointer;
      position: relative;
      user-select: none;
      outline: none;
      overflow: hidden;
      transition: background-color 220ms ease-out,
                  transform 150ms ease-out,
                  box-shadow 220ms ease-out;
      will-change: transform, opacity;
    }

    :host-context([data-theme="dark"]) .hub-tool-row-link {
      background: var(--surface, #141414);
      border-color: var(--border, rgba(255, 255, 255, 0.06));
      color: var(--text, #FCFCFC);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }

    /* FLIP Entering & Leaving states */
    .hub-tool-row-link.is-entering {
      animation: rowFadeSlideIn 220ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
      animation-delay: var(--stagger-delay, 0ms);
    }

    .hub-tool-row-link.is-leaving {
      animation: rowFadeScaleOut 160ms cubic-bezier(0.4, 0, 1, 1) forwards;
      pointer-events: none;
    }

    /* Spotlight layer following cursor inside row */
    .hub-spotlight-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0;
      background: radial-gradient(
        260px circle at var(--mx, -999px) var(--my, -999px),
        rgba(0, 0, 0, 0.04),
        transparent 70%
      );
      transition: opacity 180ms ease;
      z-index: 1;
    }

    :host-context([data-theme="dark"]) .hub-spotlight-layer {
      background: radial-gradient(
        260px circle at var(--mx, -999px) var(--my, -999px),
        rgba(255, 255, 255, 0.06),
        transparent 70%
      );
    }

    /* Calm Grayscale Hover: Pointer devices only */
    @media (hover: hover) {
      .hub-tool-row-link:hover {
        background: var(--surface-hover, #F4F4F5);
        border-color: var(--border, rgba(0, 0, 0, 0.07));
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
        transform: translateY(-1px);
      }

      :host-context([data-theme="dark"]) .hub-tool-row-link:hover {
        background: var(--surface-hover, #1E1E22);
        border-color: var(--border, rgba(255, 255, 255, 0.06));
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
        transform: translateY(-1px);
      }

      .hub-tool-row-link:hover .hub-spotlight-layer {
        opacity: 1;
      }

      /* Icon tile turns solid black with white icon on row hover (220ms) */
      .hub-tool-row-link:hover .hub-row-icon-tile :first-child {
        background: #000000 !important;
        border-color: #000000 !important;
        color: #FFFFFF !important;
        transition: all 220ms cubic-bezier(0.16, 1, 0.3, 1) !important;
      }

      :host-context([data-theme="dark"]) .hub-tool-row-link:hover .hub-row-icon-tile :first-child {
        background: #FFFFFF !important;
        border-color: #FFFFFF !important;
        color: #000000 !important;
      }

      /* Arrow icon slides 4px right and fades in */
      .hub-tool-row-link:hover .hub-open-arrow {
        color: var(--text, #18181B);
        opacity: 1;
        transform: translateX(4px);
      }

      :host-context([data-theme="dark"]) .hub-tool-row-link:hover .hub-open-arrow {
        color: #FFFFFF;
        opacity: 1;
        transform: translateX(4px);
      }
    }

    /* Press Effect (Both Touch & Pointer devices) */
    .hub-tool-row-link:active {
      transform: scale(0.98);
      transition: transform 150ms ease-out;
    }

    /* Keyboard focus-visible ring only (No outline on mouse click) */
    .hub-tool-row-link:focus:not(:focus-visible) {
      outline: none;
    }

    .hub-tool-row-link:focus-visible {
      outline: 2px solid var(--ts-focus-ring, #18181B) !important;
      outline-offset: 2px;
      z-index: 2;
    }

    :host-context([data-theme="dark"]) .hub-tool-row-link:focus-visible {
      outline-color: var(--ts-focus-ring, #E4E4E7) !important;
    }

    .hub-row-title-line {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      min-width: 0;
      position: relative;
      z-index: 2;
    }

    .hub-tool-name {
      font-family: var(--font-heading, "Nunito", sans-serif);
      font-size: 15px;
      font-weight: 700;
      color: var(--text, #18181B);
      letter-spacing: -0.015em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.25;
    }

    :host-context([data-theme="dark"]) .hub-tool-name {
      color: var(--text, #FCFCFC);
    }

    .hub-tool-desc {
      font-size: 13px;
      color: var(--text-muted, #71717A);
      line-height: 1.4;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin: 2px 0 0;
      position: relative;
      z-index: 2;
    }

    :host-context([data-theme="dark"]) .hub-tool-desc {
      color: var(--text-muted, #A1A1AA);
    }

    .hub-tool-badge {
      font-size: 10.5px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 9999px;
      background: var(--surface-hover, #F4F4F5);
      border: 1px solid var(--border, rgba(0, 0, 0, 0.06));
      color: var(--text-muted, #71717A);
      line-height: 1.2;
    }

    [data-theme="dark"] .hub-tool-badge {
      background: #27272A;
      border-color: rgba(255, 255, 255, 0.08);
      color: #A1A1AA;
    }

    /* Actions: Star & Arrow */
    .hub-star-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: var(--ts-radius-full, 9999px);
      background: transparent;
      border: none;
      color: var(--text-muted, #A1A1AA);
      cursor: pointer;
      outline: none;
      position: relative;
      z-index: 3;
      transition: color 150ms ease, transform 150ms ease, background-color 150ms ease;
    }

    .hub-star-btn:hover {
      color: var(--text, #18181B);
      background: rgba(0, 0, 0, 0.04);
    }

    :host-context([data-theme="dark"]) .hub-star-btn:hover {
      color: #FFFFFF;
      background: rgba(255, 255, 255, 0.06);
    }

    .hub-star-btn:active {
      transform: scale(0.9);
    }

    .hub-star-btn.is-favorite {
      color: #F59E0B !important; /* Gold favorite star */
      animation: starPop 280ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .hub-open-arrow {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      color: var(--text-muted, #A1A1AA);
      opacity: 0.6;
      position: relative;
      z-index: 2;
      transition: color 220ms ease, transform 220ms ease, opacity 220ms ease;
    }

    /* Soft Search Match Highlight */
    :host ::ng-deep .search-highlight {
      background: rgba(234, 179, 8, 0.25);
      color: inherit;
      border-radius: 2px;
      padding: 0 1px;
      font-weight: inherit;
    }

    :host-context([data-theme="dark"]) :host ::ng-deep .search-highlight {
      background: rgba(234, 179, 8, 0.35);
    }

    /* Skeleton Loading Rows */
    .hub-skeleton-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      border-radius: 14px;
      background: var(--surface, #FFFFFF);
      border: 1px solid var(--border, rgba(0, 0, 0, 0.06));
    }

    :host-context([data-theme="dark"]) .hub-skeleton-item {
      background: var(--surface, #141414);
      border-color: var(--border, rgba(255, 255, 255, 0.06));
    }

    .hub-skeleton-media {
      width: 42px;
      height: 42px;
      border-radius: 10px;
    }

    .hub-skeleton-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .hub-skeleton-title {
      width: 35%;
      height: 16px;
      border-radius: 4px;
    }

    .hub-skeleton-desc {
      width: 75%;
      height: 12px;
      border-radius: 4px;
    }

    .hub-empty-state-wrapper {
      padding: 48px 0;
      width: 100%;
      display: flex;
      justify-content: center;
    }

    /* Keyframe Animations */
    @keyframes rowFadeSlideIn {
      0% {
        opacity: 0;
        transform: translateY(8px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes rowFadeScaleOut {
      0% {
        opacity: 1;
        transform: scale(1);
      }
      100% {
        opacity: 0;
        transform: scale(0.96);
      }
    }

    @keyframes starPop {
      0% {
        transform: scale(0.8);
      }
      50% {
        transform: scale(1.3);
      }
      100% {
        transform: scale(1);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .hub-tool-row-link,
      .hub-star-btn.is-favorite,
      .hub-page-root,
      .hub-open-arrow,
      .hub-count-num {
        animation: none !important;
        transition: opacity 100ms linear !important;
        transform: none !important;
      }
    }

    @media (max-width: 640px) {
      .hide-mobile {
        display: none !important;
      }
      .hub-header-sticky {
        top: -16px;
      }
    }
  `]
})
export class HubHomeComponent implements OnInit, OnDestroy {
  private readonly zone: NgZone;
  private readonly el: ElementRef<HTMLElement>;

  constructor(zone?: NgZone, el?: ElementRef<HTMLElement>) {
    try {
      this.zone = zone ?? inject(NgZone, { optional: true }) ?? ({
        runOutsideAngular: (fn: Function) => fn(),
        run: (fn: Function) => fn()
      } as unknown as NgZone);
    } catch {
      this.zone = {
        runOutsideAngular: (fn: Function) => fn(),
        run: (fn: Function) => fn()
      } as unknown as NgZone;
    }

    try {
      this.el = el ?? inject(ElementRef<HTMLElement>, { optional: true }) ?? new ElementRef(null as unknown as HTMLElement);
    } catch {
      this.el = new ElementRef(null as unknown as HTMLElement);
    }
  }

  // Backward-compatibility properties for test suites & consumers
  readonly liveTools = computed(() => this.allLiveTools());
  readonly filteredTools = computed(() => this.displayedTools());
  readonly selectedCategory = computed(() => this.activeTab() === 'all' ? 'ALL' : this.activeTab());
  readonly categoryGroups = computed(() => {
    const all = this.allLiveTools();
    const map = new Map<string, ToolRegistryItem[]>();
    for (const tool of all) {
      const list = map.get(tool.category) || [];
      list.push(tool);
      map.set(tool.category, list);
    }
    return Array.from(map.entries()).map(([category, tools]) => ({ category, tools }));
  });

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.debouncedQuery.set(query);
  }

  selectCategory(category: string): void {
    this.selectTab(category.toLowerCase());
  }

  readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  readonly gridContainer = viewChild<ElementRef<HTMLElement>>('gridContainer');

  // Query & Tab state
  readonly searchQuery = signal<string>('');
  readonly debouncedQuery = signal<string>('');
  readonly activeTab = signal<string>('all');
  readonly searchVersion = signal<number>(0);
  readonly isLoading = signal<boolean>(false);
  readonly isNavigating = signal<boolean>(false);
  readonly ariaLiveAnnouncement = signal<string>('');

  // FLIP animation sets
  readonly enteringSlugs = signal<Set<string>>(new Set());
  readonly leavingSlugs = signal<Set<string>>(new Set());

  // Storage states
  readonly favoriteSlugs = signal<string[]>([]);
  readonly recentSlugs = signal<string[]>([]);

  private debounceTimer?: any;
  private navigationTimer?: any;
  private failsafeTimer?: any;
  private previousPositions = new Map<string, DOMRect>();

  // All tools from registry (excluding hidden and upcoming)
  readonly allLiveTools = computed<ToolRegistryItem[]>(() => {
    return getAllTools().filter(t => t.status === 'live' || t.status === 'beta');
  });

  // Tab definitions: All | Utilities | Developer | Security | Favorites | Recent
  readonly tabsList = computed<PillTabItem[]>(() => {
    return [
      { id: 'all', label: 'All' },
      { id: 'utilities', label: 'Utilities' },
      { id: 'developer', label: 'Developer' },
      { id: 'security', label: 'Security' },
      { id: 'favorites', label: 'Favorites', count: this.favoriteSlugs().length },
      { id: 'recent', label: 'Recent', count: this.recentSlugs().length },
    ];
  });

  // Filtered Tools computation
  readonly displayedTools = computed<ToolRegistryItem[]>(() => {
    const q = this.debouncedQuery().toLowerCase().trim();
    const tab = this.activeTab().toLowerCase();
    const all = this.allLiveTools();

    let list: ToolRegistryItem[] = [];

    if (tab === 'all') {
      list = all;
    } else if (tab === 'favorites') {
      const favSet = new Set(this.favoriteSlugs());
      list = all.filter(t => favSet.has(t.slug));
    } else if (tab === 'recent') {
      const recentList = this.recentSlugs();
      const toolMap = new Map(all.map(t => [t.slug, t]));
      list = recentList.map(slug => toolMap.get(slug)).filter((t): t is ToolRegistryItem => !!t);
    } else {
      // Category match (utilities, developer, security)
      list = all.filter(t => t.category.toLowerCase() === tab);
    }

    if (!q) {
      return list;
    }

    return list.filter(tool => {
      return (
        tool.name.toLowerCase().includes(q) ||
        tool.shortDescription.toLowerCase().includes(q) ||
        tool.category.toLowerCase().includes(q) ||
        tool.seo?.keywords?.some(k => k.toLowerCase().includes(q))
      );
    });
  });

  ngOnInit(): void {
    this.loadFavoritesFromStorage();
    this.loadRecentsFromStorage();

    if (typeof window !== 'undefined') {
      this.syncStateFromUrl();

      // Listen to popstate (Back/Forward browser buttons)
      window.addEventListener('popstate', this.onPopState);

      // Handle pageshow event (bfcache restoration)
      window.addEventListener('pageshow', this.onPageShow);
    }
  }

  ngOnDestroy(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.navigationTimer) clearTimeout(this.navigationTimer);
    if (this.failsafeTimer) clearTimeout(this.failsafeTimer);

    if (typeof window !== 'undefined') {
      window.removeEventListener('popstate', this.onPopState);
      window.removeEventListener('pageshow', this.onPageShow);
    }
  }

  private onPopState = (): void => {
    this.zone.run(() => {
      this.syncStateFromUrl();
      this.executeFlipTransition();
    });
  };

  private onPageShow = (event: PageTransitionEvent): void => {
    // When restored from bfcache, clear any frozen navigation/animation state
    this.zone.run(() => {
      this.isNavigating.set(false);
      this.enteringSlugs.set(new Set());
      this.leavingSlugs.set(new Set());
      this.resetFailsafe();
    });
  };

  private syncStateFromUrl(): void {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q') || '';
    const tab = params.get('tab') || 'all';

    this.searchQuery.set(q);
    this.debouncedQuery.set(q);
    this.activeTab.set(tab.toLowerCase());
  }

  // Keyboard Navigation: '/' to focus search, 'Escape' to clear
  @HostListener('window:keydown', ['$event'])
  handleGlobalKeyboard(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    const isEditing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

    if (event.key === '/' && !isEditing) {
      event.preventDefault();
      this.searchInput()?.nativeElement.focus();
    } else if (event.key === 'Escape' && isEditing && this.searchQuery()) {
      event.preventDefault();
      this.clearSearch();
    }
  }

  onRowKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextRow = document.querySelector(`[data-index="${index + 1}"]`) as HTMLElement;
      nextRow?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prevRow = document.querySelector(`[data-index="${index - 1}"]`) as HTMLElement;
      prevRow?.focus();
    }
  }

  onSearchInput(val: string): void {
    this.searchQuery.set(val);

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.captureFLIPPositions();
      this.debouncedQuery.set(val);
      this.searchVersion.update(v => v + 1);
      this.updateUrlParams();
      this.announceResults();
      this.executeFlipTransition();
    }, 150);
  }

  clearSearch(): void {
    this.captureFLIPPositions();
    this.searchQuery.set('');
    this.debouncedQuery.set('');
    this.searchVersion.update(v => v + 1);
    this.updateUrlParams();
    this.announceResults();
    this.searchInput()?.nativeElement.focus();
    this.executeFlipTransition();
  }

  selectTab(tabId: string): void {
    if (this.activeTab() === tabId) return;
    this.captureFLIPPositions();
    this.activeTab.set(tabId);
    this.updateUrlParams();
    this.announceResults();
    this.executeFlipTransition();
  }

  clearAllFilters(): void {
    this.captureFLIPPositions();
    this.searchQuery.set('');
    this.debouncedQuery.set('');
    this.activeTab.set('all');
    this.updateUrlParams();
    this.announceResults();
    this.executeFlipTransition();
  }

  private readonly capsuleService = inject(ToolCapsuleService);
  private readonly themeService = inject(ToolThemeService);

  getToolHref(slug: string): string {
    return getToolUrl(slug);
  }

  onToolClick(event: MouseEvent, tool: ToolRegistryItem): void {
    // 1. If middle click, Ctrl/Cmd/Shift click, or opens in new tab: let normal link work
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) {
      this.recordRecent(tool.slug);
      return;
    }

    event.preventDefault();
    // Save tool in Recent before navigating
    this.recordRecent(tool.slug);

    this.isNavigating.set(true);

    const rowEl = (event.currentTarget as HTMLElement) || (event.target as HTMLElement).closest('.hub-tool-row-link') as HTMLElement;
    const isDark = this.themeService.effectiveTheme() === 'dark';

    if (rowEl) {
      this.capsuleService.playHubExpand(rowEl, isDark, (hashParam: string) => {
        const baseUrl = getToolUrl(tool.slug);
        const finalUrl = hashParam ? `${baseUrl}#${hashParam}` : baseUrl;
        window.location.assign(finalUrl);
      });
    } else {
      window.location.assign(getToolUrl(tool.slug));
    }
  }

  isFavorite(slug: string): boolean {
    return this.favoriteSlugs().includes(slug);
  }

  toggleFavorite(event: MouseEvent, slug: string): void {
    event.stopPropagation();
    event.preventDefault();

    const current = this.favoriteSlugs();
    const isFav = current.includes(slug);
    const updated = isFav
      ? current.filter(s => s !== slug)
      : [...current, slug];

    this.favoriteSlugs.set(updated);
    this.saveFavoritesToStorage(updated);
  }

  private recordRecent(slug: string): void {
    const current = this.recentSlugs().filter(s => s !== slug);
    const updated = [slug, ...current].slice(0, 8); // Max 8 recent tools
    this.recentSlugs.set(updated);
    this.saveRecentsToStorage(updated);
  }

  private loadFavoritesFromStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(FAVORITES_KEY);
        if (raw) {
          this.favoriteSlugs.set(JSON.parse(raw));
        }
      }
    } catch (e) {
      // Storage unavailable / quota exceeded
    }
  }

  private saveFavoritesToStorage(favorites: string[]): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      }
    } catch (e) {
      // Storage unavailable
    }
  }

  private loadRecentsFromStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(RECENT_KEY);
        if (raw) {
          this.recentSlugs.set(JSON.parse(raw));
        }
      }
    } catch (e) {
      // Storage unavailable
    }
  }

  private saveRecentsToStorage(recents: string[]): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(recents));
      }
    } catch (e) {
      // Storage unavailable
    }
  }

  highlightMatch(text: string): string {
    const q = this.debouncedQuery().trim();
    if (!q || !text) return this.escapeHtml(text);

    const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQ})`, 'gi');
    return this.escapeHtml(text).replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private announceResults(): void {
    const count = this.displayedTools().length;
    const tabName = this.activeTab();
    const query = this.debouncedQuery().trim();

    if (query) {
      this.ariaLiveAnnouncement.set(`${count} tools found for "${query}" in ${tabName}`);
    } else {
      this.ariaLiveAnnouncement.set(`${count} tools in ${tabName}`);
    }
  }

  private updateUrlParams(): void {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    const q = this.debouncedQuery().trim();
    const tab = this.activeTab();

    if (q) url.searchParams.set('q', q);
    else url.searchParams.delete('q');

    if (tab && tab !== 'all') url.searchParams.set('tab', tab);
    else url.searchParams.delete('tab');

    window.history.pushState({}, '', url.toString());
  }

  // ── FLIP (First, Last, Invert, Play) Animation Pipeline ───────
  private captureFLIPPositions(): void {
    if (typeof window === 'undefined' || !this.el?.nativeElement) return;
    const root = this.el.nativeElement;
    const rows = Array.from(root.querySelectorAll('.hub-tool-row-link[data-slug]')) as HTMLElement[];
    this.previousPositions.clear();

    rows.forEach((row: HTMLElement) => {
      const slug = row.getAttribute('data-slug');
      if (slug) {
        this.previousPositions.set(slug, row.getBoundingClientRect());
      }
    });
  }

  private executeFlipTransition(): void {
    if (typeof window === 'undefined' || !this.el?.nativeElement) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      this.resetFailsafe();
      return;
    }

    this.startFailsafe();

    requestAnimationFrame(() => {
      if (!this.el?.nativeElement) return;
      const root = this.el.nativeElement;
      const rows = Array.from(root.querySelectorAll('.hub-tool-row-link[data-slug]')) as HTMLElement[];
      const currentSlugs = new Set<string>();
      const entering = new Set<string>();

      rows.forEach((row: HTMLElement) => {
        const slug = row.getAttribute('data-slug');
        if (!slug) return;
        currentSlugs.add(slug);

        const first = this.previousPositions.get(slug);
        const last = row.getBoundingClientRect();

        if (first) {
          // Existing element moved: Invert & Play
          const deltaX = first.left - last.left;
          const deltaY = first.top - last.top;

          if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
            row.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            row.style.transition = 'none';

            requestAnimationFrame(() => {
              row.style.transition = 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)';
              row.style.transform = 'translate(0, 0)';

              const onEnd = () => {
                row.style.removeProperty('transform');
                row.style.removeProperty('transition');
                row.removeEventListener('transitionend', onEnd);
              };
              row.addEventListener('transitionend', onEnd, { once: true });
            });
          }
        } else {
          // Newly entering element
          entering.add(slug);
        }
      });

      this.enteringSlugs.set(entering);

      // Clean entering animation tags after animation duration
      setTimeout(() => {
        this.enteringSlugs.set(new Set());
        this.resetFailsafe();
      }, 350);
    });
  }

  // Failsafe timer: forces all animation states to resolved within 1s
  private startFailsafe(): void {
    if (this.failsafeTimer) clearTimeout(this.failsafeTimer);
    this.failsafeTimer = setTimeout(() => {
      this.resetFailsafe();
    }, 1000);
  }

  private resetFailsafe(): void {
    this.enteringSlugs.set(new Set());
    this.leavingSlugs.set(new Set());
    if (this.failsafeTimer) {
      clearTimeout(this.failsafeTimer);
      this.failsafeTimer = null;
    }
  }
}

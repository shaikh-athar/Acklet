// packages/tool-shell/src/hub/hub-home.component.ts
import { Component, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { getAllTools, ToolRegistryItem } from '@acklet/tool-registry';
import { getToolUrl } from '@acklet/shared';
import { ToolStorageService } from '../services/tool-storage.service';
import { TsIconComponent } from '../components/icon/ts-icon.component';
import { TsPillTabsComponent, PillTabItem } from '../components/primitive/ts-pill-tabs.component';
import { TsSpotlightCardComponent } from '../components/primitive/ts-spotlight-card.component';
import { HlmInputGroupImports } from '@acklet/tool-shell/helm/input-group';
import { TsEmptyStateComponent } from '../components/primitive/ts-empty-state.component';
import { TsToolTileComponent } from '../components/primitive/ts-tool-tile.component';

@Component({
  selector: 'hub-home',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    TsIconComponent, 
    TsPillTabsComponent,
    TsEmptyStateComponent, 
    TsSpotlightCardComponent,
    TsToolTileComponent,
    HlmInputGroupImports
  ],
  template: `
    <div class="hub-home-container" [class.is-page-dimmed]="isExpanding()">
      <!-- Visually hidden live region for screen reader feedback -->
      <div class="sr-only" aria-live="polite" aria-atomic="true">
        {{ ariaLiveAnnouncement() }}
      </div>

      <div class="hub-home-content">
        
        <!-- Sticky Page Header with Search & Pill Tabs -->
        <header class="hub-page-header">
          <div class="hub-title-group">
            <h1 class="hub-main-title">Tools</h1>
            <p class="hub-main-subtitle">
              Free browser-based tools. No sign-up needed.
            </p>
          </div>
          
          <!-- Search Bar matching reference pill style -->
          <div class="hub-search-wrapper">
            <div hlmInputGroup class="hub-input-group">
              <input
                hlmInputGroupInput
                type="text"
                placeholder="Search tools and utilities..."
                [ngModel]="searchQuery()"
                (ngModelChange)="onSearchChange($event)"
                aria-label="Search tools catalog"
                class="hub-search-input-field"
              />
              
              <!-- Start icon addon -->
              <div hlmInputGroupAddon align="inline-start" class="hub-search-start-addon">
                <ts-icon name="search" [size]="16" class="hub-search-icon-ts" />
              </div>
              
              <!-- End addon: Clear button (if text present) -->
              @if (searchQuery()) {
                <div hlmInputGroupAddon align="inline-end" class="hub-search-end-addon">
                  <button 
                    type="button" 
                    class="hub-search-clear-btn" 
                    (click)="clearSearch()" 
                    aria-label="Clear search"
                  >
                    <ts-icon name="x" [size]="14" />
                  </button>
                </div>
              }
            </div>
          </div>

          <!-- Sliding Pill Filter Tabs (All, Utilities, Developer, Security...) -->
          @if (!searchQuery().trim()) {
            <div class="hub-pills-filter-row">
              <ts-pill-tabs
                [tabs]="categoryPills()"
                [activeTabId]="activeCategoryTab()"
                ariaLabel="Filter tools by category"
                (tabChange)="selectCategory($event)"
              />
            </div>
          }
        </header>

        <!-- Tools Transition Container (Prevents layout collapse) -->
        <div 
          class="hub-tools-viewport" 
          [class.is-leaving]="transitionState() === 'leaving'"
          [class.is-entering]="transitionState() === 'entering'"
        >
          <!-- 1. Active Search or Category Filter View -->
          @if (searchQuery().trim() || renderedCategory() !== 'ALL') {
            <section class="hub-filtered-section">
              <div class="hub-section-header">
                <h2 class="hub-section-title">
                  {{ searchQuery().trim() ? 'Search Results' : renderedCategory() }}
                </h2>
                <button type="button" class="hub-reset-btn" (click)="clearAllFilters()">
                  Reset Filter
                </button>
              </div>

              @if (filteredTools().length === 0) {
                <div class="hub-empty-anim-wrapper">
                  <ts-empty-state
                    image="/assets/gif/404-lost-in-space.gif"
                    title="No tools found"
                    description="No utilities match your search query. Try adjusting keywords or category."
                    actionLabel="Clear Filters"
                    (action)="clearAllFilters()"
                  />
                </div>
              } @else {
                <!-- 3-column grid of tool spotlight cards with staggered entrance -->
                <div class="hub-items-grid" [attr.data-search-token]="searchAnimKey()">
                  @for (tool of filteredTools(); track tool.slug; let i = $index) {
                    <div 
                      class="ts-card-anim-wrapper search-result-item" 
                      [style.--i]="calculateStaggerIndex(i)"
                    >
                      <ts-spotlight-card 
                        [tool]="tool"
                        [revealIndex]="i"
                        (rowClick)="onToolRowClick($event)" 
                      />
                    </div>
                  }
                </div>
              }
            </section>
          } @else {
            <!-- 2. Categorized Tool Sections (Utilities, Developer, Security...) -->
            <div class="hub-sections-stack">
              @for (catGroup of categoryGroups(); track catGroup.category; let catIdx = $index) {
                <section class="hub-category-tool-section">
                  <div class="hub-section-header">
                    <button 
                      type="button" 
                      class="hub-section-title-btn" 
                      (click)="selectCategory(catGroup.category)"
                    >
                      <span class="hub-section-title">{{ catGroup.category }}</span>
                      <ts-icon name="chevron-right" [size]="15" class="hub-section-chevron" />
                    </button>
                  </div>

                  <!-- 3-Column Grid of tool spotlight cards with staggered entrance -->
                  <div class="hub-items-grid">
                    @for (tool of catGroup.tools; track tool.slug; let i = $index) {
                      <div 
                        class="ts-card-anim-wrapper" 
                        [style.--i]="calculateStaggerIndex(catIdx * 3 + i)"
                      >
                        <ts-spotlight-card 
                          [tool]="tool"
                          [revealIndex]="i"
                          (rowClick)="onToolRowClick($event)" 
                        />
                      </div>
                    }
                  </div>
                </section>
              }
            </div>
          }
        </div>

      </div>
    </div>

    <!-- Container Transform Expanding/Collapsing Card Overlay -->
    @if (expandingTool(); as expTool) {
      <div 
        class="ts-container-transform-overlay"
        [class.is-expanded]="expandState() === 'expanded'"
        [class.is-collapsing]="expandState() === 'collapsing'"
        [style.top.px]="expandState() === 'expanded' ? targetMainRect().top : (expandingRect()?.top || 0)"
        [style.left.px]="expandState() === 'expanded' ? targetMainRect().left : (expandingRect()?.left || 0)"
        [style.width.px]="expandState() === 'expanded' ? targetMainRect().width : (expandingRect()?.width || 0)"
        [style.height.px]="expandState() === 'expanded' ? targetMainRect().height : (expandingRect()?.height || 0)"
        aria-hidden="true"
      >
        <div class="ts-overlay-card-content">
          <div class="ts-overlay-media">
            <ts-tool-tile [icon]="expTool.icon" [name]="expTool.name" [category]="expTool.category" [size]="44" />
          </div>
          <div class="ts-overlay-info">
            <div class="ts-overlay-title-line">
              <span class="ts-overlay-name">{{ expTool.name }}</span>
            </div>
            @if (expTool.shortDescription) {
              <p class="ts-overlay-desc">{{ expTool.shortDescription }}</p>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-width: 0;
      color: var(--text);
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

    .hub-home-container {
      width: 100%;
      padding: 0;
      display: flex;
      justify-content: center;
      background: transparent;
      color: var(--text);
    }
    .hub-home-content {
      max-width: 100%;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 28px;
      min-width: 0;
    }
    .hub-page-header {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
      position: sticky;
      top: 0;
      z-index: 30;
      background: var(--shell-card);
      padding: 0 0 14px;
      margin: 0;
      border-bottom: 1px solid var(--border);
      width: 100%;
    }
    .hub-title-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 100%;
    }
    .hub-main-title {
      font-family: var(--font-heading, "Nunito", sans-serif);
      font-size: clamp(24px, 1.8rem + 1vw, 32px);
      font-weight: 700;
      color: var(--text);
      letter-spacing: var(--ts-tracking-tight);
      margin: 0;
      line-height: 1.2;
    }
    .hub-main-subtitle {
      font-family: var(--font-body, "Nunito", sans-serif);
      font-size: clamp(13.5px, 12px + 0.5vw, 15px);
      color: var(--text-muted);
      line-height: 1.5;
      margin: 0;
    }
    .hub-search-wrapper {
      width: 100%;
      position: relative;
    }
    .hub-input-group {
      width: 100%;
      background: var(--accent-soft);
      border: 1px solid var(--border);
      border-radius: var(--ts-radius-full, 9999px);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
      position: relative;
      display: flex;
      align-items: center;
      outline: none !important;
      transition: background-color var(--ts-dur-fast, 150ms) var(--ts-ease);
    }
    [data-theme="dark"] .hub-input-group {
      background: #141416;
      border-color: #27272A;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
    }
    .hub-input-group:focus-within {
      outline: none !important;
      box-shadow: none !important;
    }
    [data-theme="dark"] .hub-input-group:focus-within {
      outline: none !important;
      box-shadow: none !important;
    }
    .hub-search-input-field {
      width: 100%;
      height: 44px;
      padding-left: 44px;
      padding-right: 44px;
      font-size: 15px;
      font-family: var(--ts-font-sans, "DM Sans", sans-serif);
      color: var(--text, #18181B);
      background: transparent;
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
    }
    .hub-search-input-field:focus,
    .hub-search-input-field:focus-visible {
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
    }
    [data-theme="dark"] .hub-search-input-field {
      color: var(--text, #FCFCFC);
    }
    .hub-search-input-field::placeholder {
      color: var(--text-muted, #71717A);
      opacity: 0.9;
    }
    .hub-search-start-addon {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted, #71717A);
    }
    .hub-search-icon-ts {
      color: var(--text-muted, #71717A);
    }
    .hub-search-end-addon {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: auto !important;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .hub-search-clear-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      min-width: 32px;
      min-height: 32px;
      border-radius: var(--ts-radius-full);
      background: transparent;
      border: none;
      color: var(--text-muted, #71717A);
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) var(--ts-ease);
    }
    .hub-search-clear-btn:hover {
      color: var(--text, #18181B);
      background: var(--surface-hover, #F4F4F5);
    }
    .hub-pills-filter-row {
      margin-top: 2px;
      width: 100%;
      overflow: hidden;
    }

    /* Transition & Motion Rules */
    .hub-tools-viewport {
      min-height: 420px;
      position: relative;
    }

    /* 1. LEAVING State (120ms, ease-in) */
    .hub-tools-viewport.is-leaving {
      pointer-events: none;
    }
    .hub-tools-viewport.is-leaving .ts-card-anim-wrapper,
    .hub-tools-viewport.is-leaving .hub-category-tool-section,
    .hub-tools-viewport.is-leaving .hub-filtered-section {
      animation: hubCardsLeave 120ms ease-in forwards;
    }

    /* 2. ENTERING State (320ms, cubic-bezier(0.22, 1, 0.36, 1) with stagger) */
    .hub-tools-viewport.is-entering .ts-card-anim-wrapper {
      animation: hubCardsEnter 320ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
      animation-delay: calc(var(--i, 0) * 50ms);
    }
    .hub-tools-viewport.is-entering .hub-section-header {
      animation: hubHeadingEnter 280ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
    }
    .hub-empty-anim-wrapper {
      animation: hubCardsEnter 320ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
    }

    /* Live Search Results Animation */
    .search-result-item {
      animation: hubCardsEnter 280ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
      animation-delay: calc(var(--i, 0) * 35ms);
    }

    @keyframes hubCardsLeave {
      0% {
        opacity: 1;
        transform: translateY(0);
      }
      100% {
        opacity: 0;
        transform: translateY(-6px);
      }
    }

    @keyframes hubCardsEnter {
      0% {
        opacity: 0;
        transform: translateY(14px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes hubHeadingEnter {
      0% {
        opacity: 0;
        transform: translateY(8px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Card animation wrapper keeps entrance transform separate from card hover lift */
    .ts-card-anim-wrapper {
      width: 100%;
      display: flex;
      min-width: 0;
      animation-fill-mode: backwards;
    }

    .hub-sections-stack {
      display: flex;
      flex-direction: column;
      gap: 36px;
      width: 100%;
      min-width: 0;
    }
    .hub-category-tool-section,
    .hub-filtered-section {
      display: flex;
      flex-direction: column;
      gap: 14px;
      width: 100%;
      min-width: 0;
    }
    .hub-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
      width: 100%;
    }
    .hub-section-title-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: transparent;
      border: none;
      padding: 4px 0;
      min-height: 36px;
      cursor: pointer;
      color: var(--text, #18181B);
      border-radius: 6px;
      transition: color var(--ts-dur-fast, 150ms) var(--ts-ease);
    }
    .hub-section-title-btn:hover {
      color: var(--text-muted, #71717A);
    }
    .hub-section-title {
      font-family: var(--ts-font-heading, "DM Sans", sans-serif);
      font-size: 18px;
      font-weight: 600;
      color: inherit;
      margin: 0;
    }
    .hub-section-chevron {
      color: var(--text-muted, #71717A);
    }
    .hub-reset-btn {
      font-family: var(--ts-font-sans);
      background: transparent;
      border: none;
      font-size: 13px;
      color: var(--text-muted, #71717A);
      cursor: pointer;
      padding: 6px 12px;
      min-height: 36px;
      border-radius: var(--ts-radius-sm, 8px);
      transition: all var(--ts-dur-fast, 150ms) var(--ts-ease);
    }
    .hub-reset-btn:hover {
      color: var(--text, #18181B);
      background: var(--surface-hover, #F4F4F5);
    }

    /* Responsive Grid: 3 cols >= 1280px, 2 cols >= 640px, 1 col below; 24px gap */
    .hub-items-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 20px;
      width: 100%;
      min-width: 0;
    }
    @media (min-width: 640px) {
      .hub-items-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 24px;
      }
    }
    @media (min-width: 1280px) {
      .hub-items-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 24px;
      }
    }

    /* Dim and subtle scale of page under expanding card */
    .hub-home-container.is-page-dimmed {
      opacity: 0.6;
      transform: scale(0.98);
      transition: opacity 450ms cubic-bezier(0.32, 0.72, 0, 1),
                  transform 450ms cubic-bezier(0.32, 0.72, 0, 1);
      pointer-events: none;
    }

    /* Container Transform Fixed Overlay (Expands into Main Content Card rectangle) */
    .ts-container-transform-overlay {
      position: fixed;
      z-index: 9999;
      border-radius: 16px;
      background: var(--shell-card);
      border: 1px solid var(--border);
      box-shadow: var(--shell-card-shadow);
      overflow: hidden;
      display: flex;
      align-items: center;
      padding: 14px 18px;
      pointer-events: auto;
      transition: top 400ms cubic-bezier(0.32, 0.72, 0, 1),
                  left 400ms cubic-bezier(0.32, 0.72, 0, 1),
                  width 400ms cubic-bezier(0.32, 0.72, 0, 1),
                  height 400ms cubic-bezier(0.32, 0.72, 0, 1),
                  border-radius 400ms cubic-bezier(0.32, 0.72, 0, 1),
                  border-color 400ms cubic-bezier(0.32, 0.72, 0, 1);
      will-change: top, left, width, height, border-radius;
    }

    .ts-container-transform-overlay.is-expanded {
      border-radius: var(--shell-radius, 20px) !important;
      border-color: var(--shell-card-border) !important;
    }

    .ts-container-transform-overlay.is-collapsing {
      transition: top 360ms cubic-bezier(0.32, 0.72, 0, 1),
                  left 360ms cubic-bezier(0.32, 0.72, 0, 1),
                  width 360ms cubic-bezier(0.32, 0.72, 0, 1),
                  height 360ms cubic-bezier(0.32, 0.72, 0, 1),
                  border-radius 360ms cubic-bezier(0.32, 0.72, 0, 1),
                  border-color 360ms cubic-bezier(0.32, 0.72, 0, 1);
    }

    .ts-overlay-card-content {
      display: flex;
      align-items: center;
      gap: 14px;
      width: 100%;
      opacity: 1;
      transition: opacity 150ms cubic-bezier(0.32, 0.72, 0, 1);
    }

    .ts-container-transform-overlay.is-expanded .ts-overlay-card-content {
      opacity: 0;
    }

    .ts-container-transform-overlay.is-collapsing .ts-overlay-card-content {
      opacity: 1;
    }

    .ts-overlay-media {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .ts-overlay-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
      overflow: hidden;
    }

    .ts-overlay-title-line {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .ts-overlay-name {
      font-family: var(--ts-font-heading, "DM Sans", sans-serif);
      font-size: 15.5px;
      font-weight: 600;
      color: var(--text, #18181B);
      letter-spacing: var(--ts-tracking-tight);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.3;
    }

    .ts-overlay-desc {
      font-family: var(--ts-font-sans);
      font-size: 13.5px;
      color: var(--text-muted, #71717A);
      line-height: 1.45;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin: 0;
    }

    @media (max-width: 639px) {
      .hub-items-grid {
        grid-template-columns: 1fr;
        gap: 10px;
      }
      .hub-home-container {
        padding: 16px 20px 36px;
      }
    }

    /* Reduced Motion preference support */
    @media (prefers-reduced-motion: reduce) {
      .hub-tools-viewport.is-leaving .ts-card-anim-wrapper,
      .hub-tools-viewport.is-entering .ts-card-anim-wrapper,
      .hub-tools-viewport.is-entering .hub-section-header,
      .hub-empty-anim-wrapper {
        animation: none !important;
        opacity: 1 !important;
        transform: none !important;
        transition: opacity 100ms linear !important;
      }
      .hub-home-container.is-page-dimmed {
        transform: none !important;
        transition: opacity 100ms linear !important;
      }
      .ts-container-transform-overlay {
        transition: opacity 100ms linear !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        border-radius: 0 !important;
        opacity: 0;
      }
      .ts-container-transform-overlay.is-expanded {
        opacity: 1 !important;
      }
      .ts-overlay-card-content {
        transition: opacity 80ms linear !important;
      }
    }
  `]
})
export class HubHomeComponent implements OnInit, OnDestroy {
  private readonly storage: ToolStorageService;

  readonly searchQuery = signal<string>('');
  
  // Tab and animation sequence signals
  readonly activeCategoryTab = signal<string>('ALL');
  readonly renderedCategory = signal<string>('ALL');
  readonly transitionState = signal<'idle' | 'leaving' | 'entering'>('idle');
  readonly searchAnimKey = signal<number>(0);
  readonly ariaLiveAnnouncement = signal<string>('');
  readonly recentSlugs = signal<string[]>(['clipboard']);

  // Container transform signals
  readonly expandingTool = signal<ToolRegistryItem | null>(null);
  readonly expandingRect = signal<DOMRect | null>(null);
  readonly expandState = signal<'start' | 'expanded' | 'collapsing' | 'idle'>('idle');
  readonly isExpanding = computed(() => this.expandingTool() !== null);

  readonly targetMainRect = computed(() => {
    if (typeof window !== 'undefined') {
      const mainEl = document.getElementById('main-content');
      if (mainEl) {
        return mainEl.getBoundingClientRect();
      }
    }
    return { top: 0, left: 0, width: typeof window !== 'undefined' ? window.innerWidth : 1000, height: typeof window !== 'undefined' ? window.innerHeight : 800 } as DOMRect;
  });

  private transitionTimer?: any;
  private navigationTimer?: any;
  private reverseTimer?: any;

  constructor(storage?: ToolStorageService) {
    this.storage = storage ?? new ToolStorageService();
  }

  readonly liveTools = computed(() => getAllTools().filter(t => t.status === 'live' || t.status === 'beta'));

  readonly categoryGroups = computed(() => {
    const map = new Map<string, ToolRegistryItem[]>();
    for (const tool of this.liveTools()) {
      const cat = tool.category || 'Utilities';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(tool);
    }
    return Array.from(map.entries()).map(([category, tools]) => ({ category, tools }));
  });

  readonly categoryPills = computed<PillTabItem[]>(() => {
    const list: PillTabItem[] = [{ id: 'ALL', label: 'All' }];
    for (const group of this.categoryGroups()) {
      list.push({ id: group.category, label: group.category });
    }
    return list;
  });

  readonly filteredTools = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const cat = this.renderedCategory();

    return this.liveTools().filter(tool => {
      const matchesCategory = cat === 'ALL' || tool.category.toLowerCase() === cat.toLowerCase();
      if (!matchesCategory) return false;

      if (!q) return true;
      return (
        tool.name.toLowerCase().includes(q) ||
        tool.shortDescription.toLowerCase().includes(q) ||
        tool.category.toLowerCase().includes(q) ||
        tool.seo?.keywords?.some(k => k.toLowerCase().includes(q))
      );
    });
  });

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q');
      const cat = params.get('category');
      if (q) this.searchQuery.set(q);
      if (cat) {
        this.activeCategoryTab.set(cat);
        this.renderedCategory.set(cat);
      }

      const savedRecents = this.storage.getItem<string[]>('recent_tools', []);
      if (savedRecents && savedRecents.length > 0) {
        this.recentSlugs.set(savedRecents);
      }

      // Check if arriving back from a tool via back button or link
      this.checkReverseTransition();

      // Listen to pageshow for browser back navigation from bfcache
      window.addEventListener('pageshow', this.onPageShow);
      window.addEventListener('pagehide', this.onPageHide);
    }
  }

  private onPageHide = (): void => {
    // When navigating away, reset any frozen expand state
    this.expandingTool.set(null);
    this.expandingRect.set(null);
    this.expandState.set('idle');
  };

  private onPageShow = (event: PageTransitionEvent): void => {
    // Always reset expand overlay when restoring page from bfcache
    this.expandingTool.set(null);
    this.expandingRect.set(null);
    this.expandState.set('idle');

    // Run reverse animation if returning from a tool
    this.checkReverseTransition();
  };

  private checkReverseTransition(): void {
    try {
      if (typeof window === 'undefined' || !window.sessionStorage) return;
      const stored = sessionStorage.getItem('acklet_tool_back');
      if (!stored) return;

      const parsed = JSON.parse(stored);
      const isRecent = Date.now() - parsed.timestamp < 10000;
      sessionStorage.removeItem('acklet_tool_back');

      if (!isRecent || !parsed.slug) return;

      const targetTool = this.liveTools().find(t => t.slug === parsed.slug);
      if (!targetTool) return;

      // Find the card element on the page
      setTimeout(() => {
        const cardEl = document.querySelector(`[data-tool-slug="${targetTool.slug}"]`) as HTMLElement;
        const rect = cardEl ? cardEl.getBoundingClientRect() : null;

        if (rect && rect.width > 0 && rect.height > 0) {
          this.expandingTool.set(targetTool);
          this.expandingRect.set(rect);
          // Start full screen
          this.expandState.set('expanded');

          // Animate back into card rectangle
          requestAnimationFrame(() => {
            setTimeout(() => {
              this.expandState.set('collapsing');
              this.reverseTimer = setTimeout(() => {
                this.expandingTool.set(null);
                this.expandingRect.set(null);
                this.expandState.set('idle');
              }, 400);
            }, 30);
          });
        }
      }, 50);
    } catch (e) {
      // Ignore
    }
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pageshow', this.onPageShow);
      window.removeEventListener('pagehide', this.onPageHide);
    }
    if (this.transitionTimer) clearTimeout(this.transitionTimer);
    if (this.navigationTimer) clearTimeout(this.navigationTimer);
    if (this.reverseTimer) clearTimeout(this.reverseTimer);
  }

  onSearchChange(val: string): void {
    this.searchQuery.set(val);
    this.searchAnimKey.update(k => k + 1);
    this.updateUrlParams();
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchAnimKey.update(k => k + 1);
    this.updateUrlParams();
  }

  selectCategory(category: string): void {
    if (category === this.activeCategoryTab()) return;

    // 1. Immediately update tab highlight
    this.activeCategoryTab.set(category);
    this.updateUrlParams();

    // 2. Cancel in-flight transition timer if rapid clicks occur
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
    }

    // 3. Trigger LEAVING animation (120ms)
    this.transitionState.set('leaving');

    this.transitionTimer = setTimeout(() => {
      // 4. Swap data and start ENTERING animation (320ms)
      this.renderedCategory.set(category);
      this.transitionState.set('entering');

      // Update accessibility live announcement
      const count = category === 'ALL' ? this.liveTools().length : this.filteredTools().length;
      this.ariaLiveAnnouncement.set(`${count} tools shown in ${category === 'ALL' ? 'all categories' : category}`);

      this.transitionTimer = setTimeout(() => {
        this.transitionState.set('idle');
      }, 350);
    }, 120);
  }

  clearAllFilters(): void {
    this.searchQuery.set('');
    this.selectCategory('ALL');
  }

  calculateStaggerIndex(index: number): number {
    // 50ms per item capped so total stagger never exceeds 350ms (7 items max)
    return Math.min(index, 7);
  }

  recordRecent(slug: string): void {
    const existing = this.recentSlugs().filter(s => s !== slug);
    const updated = [slug, ...existing].slice(0, 8);
    this.recentSlugs.set(updated);
    this.storage.setItem('recent_tools', updated);
  }

  onToolRowClick(event: { tool: ToolRegistryItem; rect: DOMRect; mouseEvent: MouseEvent }): void {
    // Prevent double triggers if animation is in flight
    if (this.isExpanding()) {
      event.mouseEvent.preventDefault();
      return;
    }

    event.mouseEvent.preventDefault();
    this.recordRecent(event.tool.slug);

    const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const expandDuration = prefersReduced ? 80 : 420;

    // 1. Store transition state in sessionStorage for the destination tool page
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem('acklet_tool_transition', JSON.stringify({
          slug: event.tool.slug,
          name: event.tool.name,
          category: event.tool.category,
          timestamp: Date.now()
        }));
      }
    } catch (e) {
      // Ignore private browsing storage restriction
    }

    // 2. Set initial card rect coordinates
    this.expandingTool.set(event.tool);
    this.expandingRect.set(event.rect);
    this.expandState.set('start');

    // 3. Trigger expand transition on next animation tick
    requestAnimationFrame(() => {
      setTimeout(() => {
        this.expandState.set('expanded');
      }, 16);
    });

    // 4. Navigate to destination tool subdomain
    this.navigationTimer = setTimeout(() => {
      const url = getToolUrl(event.tool.slug);
      window.location.assign(url);
    }, expandDuration);
  }

  private updateUrlParams(): void {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const q = this.searchQuery().trim();
    const cat = this.activeCategoryTab();

    if (q) url.searchParams.set('q', q);
    else url.searchParams.delete('q');

    if (cat && cat !== 'ALL') url.searchParams.set('category', cat);
    else url.searchParams.delete('category');

    window.history.replaceState({}, '', url.toString());
  }
}

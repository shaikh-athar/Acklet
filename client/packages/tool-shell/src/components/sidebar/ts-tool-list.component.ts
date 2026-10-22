import { Component, input, computed, signal, inject, OnInit, isDevMode, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolRegistryItem } from '@acklet/tool-registry';
import { getToolUrl, getToolsHubUrl } from '@acklet/shared';
import { ToolSidebarService } from '../../services/tool-sidebar.service';
import { TsIconComponent } from '../icon/ts-icon.component';
import { TsToolTileComponent } from '../primitive/ts-tool-tile.component';
import { TsTooltipDirective } from '../primitive/ts-tooltip.directive';

export const FAVORITES_KEY = 'acklet.tools.favorites';
export const RECENT_KEY = 'acklet.tools.recent';

@Component({
  selector: 'ts-tool-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TsIconComponent, TsToolTileComponent, TsTooltipDirective],
  template: `
    <nav class="ts-tool-list-container" [class.is-rail]="isRail()" aria-label="Tools navigation">
      
      @if (searchQuery().trim()) {
        <!-- Search Results Flat View -->
        <div class="ts-search-results-section">
          <div class="ts-search-results-header">
            <span>{{ filteredTools().length }} tools found</span>
          </div>
          <ul class="ts-tools-group-items" role="list">
            @for (tool of filteredTools(); track tool.slug) {
              <li role="listitem">
                <a 
                  [href]="getToolUrl(tool.slug)" 
                  class="ts-tool-item" 
                  [class.active]="tool.slug === currentSlug()"
                  [attr.aria-current]="tool.slug === currentSlug() ? 'page' : null"
                  [tsTooltip]="isRail() ? (tool.category + ' / ' + tool.name) : ''"
                  tooltipPosition="right"
                  [attr.aria-label]="tool.name"
                  (click)="onToolSelect()"
                >
                  @if (treeMarker() === 'dot' && !isRail()) {
                    <span class="ts-hollow-dot" aria-hidden="true"></span>
                  } @else {
                    <ts-tool-tile [icon]="tool.icon" [name]="tool.name" [size]="20" [flat]="true" />
                  }
                  @if (!isRail()) {
                    <span class="ts-tool-name">{{ tool.name }}</span>
                    @if (tool.slug === currentSlug()) {
                      <span class="ts-active-dot" aria-hidden="true"></span>
                    }
                  }
                </a>
              </li>
            }
          </ul>
        </div>
      } @else {
        <!-- Saved / Favorites Section (if any favorited tools) -->
        @if (!isRail() && favoriteTools().length > 0) {
          <div class="ts-special-section">
            <button 
              type="button" 
              class="ts-group-header-btn ts-special-header-btn"
              (click)="toggleFavoritesOpen()"
              [attr.aria-expanded]="isFavoritesOpen()"
            >
              <div class="ts-group-header-left">
                <ts-icon name="star" [size]="18" class="ts-special-cat-icon ts-star-icon" />
                <span class="ts-group-title">Favorites</span>
                <span class="ts-count-pill">{{ favoriteTools().length }}</span>
              </div>
              <ts-icon 
                name="chevron-right" 
                [size]="14" 
                class="ts-chevron-icon"
                [class.is-expanded]="isFavoritesOpen()"
                [class.is-collapsed]="!isFavoritesOpen()"
              />
            </button>

            @if (isFavoritesOpen()) {
              <ul class="ts-tools-group-items ts-tree-sub-menu" role="list">
                @for (fav of favoriteTools(); track fav.slug) {
                  <li role="listitem">
                    <a 
                      [href]="getToolUrl(fav.slug)" 
                      class="ts-tool-item" 
                      [class.active]="fav.slug === currentSlug()"
                      [attr.aria-current]="fav.slug === currentSlug() ? 'page' : null"
                      [attr.aria-label]="fav.name"
                      (click)="onToolSelect()"
                    >
                      <ts-tool-tile [icon]="fav.icon" [name]="fav.name" [size]="20" [flat]="true" />
                      <span class="ts-tool-name">{{ fav.name }}</span>
                    </a>
                  </li>
                }
              </ul>
            }
          </div>
        }

        <!-- Recent Tools Section (if any recently visited tools) -->
        @if (!isRail() && recentTools().length > 0) {
          <div class="ts-special-section">
            <button 
              type="button" 
              class="ts-group-header-btn ts-special-header-btn"
              (click)="toggleRecentOpen()"
              [attr.aria-expanded]="isRecentOpen()"
            >
              <div class="ts-group-header-left">
                <ts-icon name="clock" [size]="18" class="ts-special-cat-icon ts-clock-icon" />
                <span class="ts-group-title">Recent</span>
                <span class="ts-count-pill">{{ recentTools().length }}</span>
              </div>
              <ts-icon 
                name="chevron-right" 
                [size]="14" 
                class="ts-chevron-icon"
                [class.is-expanded]="isRecentOpen()"
                [class.is-collapsed]="!isRecentOpen()"
              />
            </button>

            @if (isRecentOpen()) {
              <ul class="ts-tools-group-items ts-tree-sub-menu" role="list">
                @for (rec of recentTools(); track rec.slug) {
                  <li role="listitem">
                    <a 
                      [href]="getToolUrl(rec.slug)" 
                      class="ts-tool-item" 
                      [class.active]="rec.slug === currentSlug()"
                      [attr.aria-current]="rec.slug === currentSlug() ? 'page' : null"
                      [attr.aria-label]="rec.name"
                      (click)="onToolSelect()"
                    >
                      <ts-tool-tile [icon]="rec.icon" [name]="rec.name" [size]="20" [flat]="true" />
                      <span class="ts-tool-name">{{ rec.name }}</span>
                    </a>
                  </li>
                }
              </ul>
            }
          </div>
        }

        <!-- Section Label: Categories -->
        @if (!isRail()) {
          <div class="ts-categories-label">Categories</div>
        }

        <!-- Category Tree: nav > ul > li (category) > button + ul (sub menu) > li > a (tool) -->
        <ul class="ts-tree-root-list" role="list">
          @for (group of groupedCategories(); track group.category; let gIdx = $index) {
            <li class="ts-tool-group" role="listitem">
              @if (!isRail()) {
                <button 
                  type="button" 
                  class="ts-group-header-btn"
                  (click)="toggleCategory(group.category)"
                  [attr.aria-expanded]="isCategoryOpen(group.category)"
                  [attr.aria-controls]="'ts-sub-' + group.category"
                >
                  <div class="ts-group-header-left">
                    <ts-icon [name]="categoryIcon(group.category)" [size]="20" class="ts-cat-icon" />
                    <span class="ts-group-title">{{ group.category }}</span>
                  </div>
                  <ts-icon 
                    name="chevron-right" 
                    [size]="14" 
                    class="ts-chevron-icon"
                    [class.is-expanded]="isCategoryOpen(group.category)"
                    [class.is-collapsed]="!isCategoryOpen(group.category)"
                  />
                </button>
              }
              
              @if (isRail()) {
                <ul class="ts-tools-group-items" role="list">
                  @for (tool of group.railTools; track tool.slug) {
                    <li role="listitem">
                      <a 
                        [href]="getToolUrl(tool.slug)" 
                        class="ts-tool-item" 
                        [class.active]="tool.slug === currentSlug()"
                        [attr.aria-current]="tool.slug === currentSlug() ? 'page' : null"
                        [tsTooltip]="group.category + ' / ' + tool.name"
                        tooltipPosition="right"
                        [attr.aria-label]="tool.name"
                        (click)="onToolSelect()"
                      >
                        <ts-tool-tile [icon]="tool.icon" [name]="tool.name" [size]="20" [flat]="true" />
                      </a>
                    </li>
                  }
                </ul>
              } @else {
                <div 
                  class="ts-tree-expandable-wrapper"
                  [id]="'ts-sub-' + group.category"
                  [class.is-open]="isCategoryOpen(group.category)"
                >
                  <div class="ts-tree-expandable-inner">
                    <ul 
                      class="ts-tools-group-items ts-tree-sub-menu" 
                      [class.has-active]="groupHasActive(group.tools)"
                      role="list"
                    >
                      @for (tool of group.tools.slice(0, 5); track tool.slug) {
                        <li role="listitem">
                          <a 
                            [href]="getToolUrl(tool.slug)" 
                            class="ts-tool-item" 
                            [class.active]="tool.slug === currentSlug()"
                            [attr.aria-current]="tool.slug === currentSlug() ? 'page' : null"
                            [attr.aria-label]="tool.name"
                            (click)="onToolSelect()"
                          >
                            @if (treeMarker() === 'dot') {
                              <span class="ts-hollow-dot" aria-hidden="true"></span>
                            } @else {
                              <ts-tool-tile [icon]="tool.icon" [name]="tool.name" [size]="20" [flat]="true" />
                            }
                            <span class="ts-tool-name">{{ tool.name }}</span>
                            @if (tool.slug === currentSlug()) {
                              <span class="ts-active-dot" aria-hidden="true"></span>
                            }
                          </a>
                        </li>
                      }
                      @if (group.tools.length > 5) {
                        <li role="listitem">
                          <a 
                            [href]="hubUrl + '?tab=' + encodeCategory(group.category)" 
                            class="ts-tool-item ts-view-all-item"
                            (click)="onToolSelect()"
                          >
                            <span class="ts-view-all-text">View all</span>
                          </a>
                        </li>
                      }
                    </ul>
                  </div>
                </div>
              }

              @if (isRail() && gIdx < groupedCategories().length - 1) {
                <div class="ts-rail-separator" role="separator"></div>
              }
            </li>
          }
        </ul>
      }
    </nav>
  `,
  styles: [`
    :host {
      display: block;
      background: transparent;
    }

    .ts-tool-list-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 0;
      background: transparent;
    }

    .ts-special-section {
      display: flex;
      flex-direction: column;
      margin-bottom: 6px;
    }

    .ts-special-header-btn {
      margin-bottom: 2px;
    }

    .ts-special-cat-icon {
      flex-shrink: 0;
    }

    .ts-star-icon {
      color: #F59E0B;
    }

    .ts-clock-icon {
      color: #3B82F6;
    }

    .ts-count-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      background: var(--ts-surface-inset, rgba(255, 255, 255, 0.08));
      color: var(--text-3, #71717A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      margin-left: 6px;
    }

    .ts-categories-label {
      font-size: 12.5px;
      font-weight: 500;
      color: var(--text-3, #6B7280);
      padding: 16px 10px 6px;
      text-transform: none;
      letter-spacing: normal;
      user-select: none;
    }

    .ts-tree-root-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
      list-style: none;
      padding: 0;
      margin: 0;
      background: transparent;
    }

    .ts-tool-group {
      display: flex;
      flex-direction: column;
      list-style: none;
      padding: 0;
      margin: 0;
      background: transparent;
    }

    .ts-rail-separator {
      height: 1px;
      background: var(--ts-tree-line, rgba(15, 23, 42, 0.08));
      margin: 8px auto;
      width: 28px;
      flex-shrink: 0;
    }

    :host-context([data-theme="dark"]) .ts-rail-separator {
      background: var(--ts-tree-line, rgba(255, 255, 255, 0.08));
    }

    /* Category header button: 36px, radius 10px, thin stroke muted icon, 14px 500 --text-2 */
    .ts-group-header-btn {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      height: 36px;
      padding: 0 10px;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text-2, #52525B);
      cursor: pointer;
      border-radius: 10px;
      user-select: none;
      transition: background-color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  transform var(--ts-dur-press, 150ms) var(--ts-ease);
    }

    @media (hover: hover) {
      .ts-group-header-btn:hover {
        background: var(--ts-row-hover, rgba(15, 23, 42, 0.05));
        color: var(--text, #09090B);
      }
      .ts-group-header-btn:hover .ts-cat-icon {
        color: var(--accent-strong, #111111);
      }
      .ts-group-header-btn:hover .ts-chevron-icon {
        opacity: 1;
      }
    }

    .ts-group-header-btn:active {
      transform: scale(0.98);
    }

    .ts-group-header-btn:focus-visible {
      outline: 2px solid var(--accent-strong) !important;
      outline-offset: 1px;
    }

    .ts-group-header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .ts-cat-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      color: var(--text-3, #8E8E93);
      transition: color var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .ts-group-title {
      font-family: var(--font-body, "Nunito", sans-serif);
      font-size: 14px;
      font-weight: 500;
      line-height: 20px;
      color: var(--text-2, #52525B);
    }

    :host-context([data-theme="dark"]) .ts-group-title {
      color: var(--text-2, #B3B3B8);
    }

    /* Chevron at right end (14px, rotates 90deg when open) */
    .ts-chevron-icon {
      color: var(--text-3, #8E8E93);
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      opacity: 0;
      transition: transform 200ms var(--ts-ease-out, cubic-bezier(0.22, 1, 0.36, 1)),
                  opacity 150ms var(--ts-ease);
    }

    .ts-chevron-icon.is-expanded {
      transform: rotate(90deg);
      opacity: 0.7;
    }

    .ts-chevron-icon.is-collapsed {
      opacity: 0.7;
    }

    .ts-group-header-btn:focus-visible .ts-chevron-icon {
      opacity: 1;
    }

    /* Group expand/collapse: grid-template-rows 0fr to 1fr in 220ms */
    .ts-tree-expandable-wrapper {
      display: grid;
      grid-template-rows: 0fr;
      transition: grid-template-rows 220ms var(--ts-ease-out);
      overflow: hidden;
    }

    .ts-tree-expandable-wrapper.is-open {
      grid-template-rows: 1fr;
    }

    .ts-tree-expandable-inner {
      min-height: 0;
      overflow: hidden;
    }

    @media (prefers-reduced-motion: reduce) {
      .ts-tree-expandable-wrapper {
        transition: none !important;
      }
      .ts-chevron-icon {
        transition: none !important;
      }
    }

    .ts-tools-group-items {
      display: flex;
      flex-direction: column;
      gap: 2px;
      list-style: none;
      padding: 0;
      margin: 0;
    }

    /* Guide Line: 1px hairline gray centered under category icon (center of 10px pad + 20px icon = 20px).
       8px gap between category row and its first tool.
       Child rows start 10px to the right of the line and indent 24px from category text.
    */
    .ts-tree-sub-menu {
      margin-top: 8px;
      margin-left: 20px;
      padding-left: 10px;
      border-left: 1px solid var(--ts-tree-line, rgba(15, 23, 42, 0.08));
      position: relative;
    }

    .ts-tree-sub-menu.has-active {
      border-left-color: var(--accent-border);
    }

    .ts-tree-sub-menu > li {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    /* Tool item row: 36px, radius 10px, padding 0 10px, icon 20px, gap 12px, text 14.5px/20px 400 --text-2 */
    .ts-tool-item {
      display: flex;
      align-items: center;
      gap: 12px;
      height: 36px;
      padding: 0 10px;
      border-radius: 10px;
      text-decoration: none;
      color: var(--text-2, #52525B);
      background: transparent;
      border: none;
      outline: none;
      position: relative;
      cursor: pointer;
      user-select: none;
      box-sizing: border-box;
      transition: background-color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  transform var(--ts-dur-press, 150ms) var(--ts-ease);
    }

    @media (hover: hover) {
      .ts-tool-item:hover {
        background: var(--ts-row-hover, rgba(15, 23, 42, 0.05));
        color: var(--text, #09090B);
      }
      .ts-tool-item:hover ts-tool-tile {
        color: var(--accent-strong, #111111);
      }
      .ts-tool-item:hover .ts-hollow-dot {
        border-color: var(--accent-strong, #111111);
      }
    }

    .ts-tool-item:active {
      transform: scale(0.98);
    }

    .ts-tool-item.active {
      background: var(--accent-soft, var(--ts-row-active, rgba(15, 23, 42, 0.07)));
      color: var(--text, #09090B);
      font-weight: 500;
    }

    .ts-tool-item.active ts-tool-tile {
      color: var(--accent-strong, #111111);
    }

    .ts-tool-item.active .ts-hollow-dot {
      border-color: var(--accent-strong, #111111);
    }

    :host-context([data-theme="dark"]) .ts-tool-item {
      color: var(--text-2, #B3B3B8);
    }

    :host-context([data-theme="dark"]) .ts-tool-item.active {
      background: var(--accent-soft, rgba(255, 255, 255, 0.08));
      color: var(--text, #FCFCFC);
    }

    .ts-tool-item:focus-visible {
      outline: 2px solid var(--accent-strong) !important;
      outline-offset: 1px;
    }

    /* Long name right fade mask (no ellipsis) */
    .ts-tool-name {
      font-family: var(--font-body, "Nunito", sans-serif);
      font-size: 14.5px;
      line-height: 20px;
      font-weight: 400;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      mask-image: linear-gradient(to right, #000 calc(100% - 20px), transparent);
      -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 20px), transparent);
    }

    .ts-tool-item.active .ts-tool-name {
      font-weight: 500;
    }

    /* 6px accent dot at right end */
    .ts-active-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent);
      flex-shrink: 0;
    }

    /* Marker dot option: 6px hollow circle, 1.5px border, muted */
    .ts-hollow-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      border: 1.5px solid var(--text-3, #8E8E93);
      box-sizing: border-box;
      margin: 0 7px;
      flex-shrink: 0;
      transition: border-color 150ms var(--ts-ease);
    }

    /* View all link */
    .ts-view-all-item {
      color: var(--text-3, #6B7280);
      font-size: 13.5px;
      font-weight: 400;
    }

    .ts-view-all-text {
      font-family: var(--font-body, "Nunito", sans-serif);
      font-size: 13.5px;
      color: var(--text-3, #6B7280);
    }

    /* Collapsed Rail styling */
    .ts-tool-list-container.is-rail .ts-tool-item {
      justify-content: center;
      padding: 0;
      width: 40px;
      height: 40px;
      margin: 0 auto;
      border-radius: 10px;
    }

    .ts-search-results-section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .ts-search-results-header {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text-3, #71717A);
      padding: 4px 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
  `]
})
export class TsToolListComponent implements OnInit {
  private readonly sidebarService = inject(ToolSidebarService, { optional: true });

  readonly tools = input<ToolRegistryItem[]>([]);
  readonly currentSlug = input<string>('');
  readonly isRail = input<boolean>(false);
  readonly searchQuery = input<string>('');

  readonly getToolUrl = getToolUrl;
  readonly hubUrl = getToolsHubUrl();

  onToolSelect(): void {
    this.sidebarService?.closeMobileDrawer();
  }

  readonly treeMarker = signal<'icon' | 'dot'>('icon');

  readonly favoriteSlugs = signal<string[]>([]);
  readonly recentSlugs = signal<string[]>([]);
  readonly isFavoritesOpen = signal<boolean>(true);
  readonly isRecentOpen = signal<boolean>(true);

  toggleFavoritesOpen(): void {
    this.isFavoritesOpen.update(v => !v);
  }

  toggleRecentOpen(): void {
    this.isRecentOpen.update(v => !v);
  }

  readonly favoriteTools = computed<ToolRegistryItem[]>(() => {
    const slugs = new Set(this.favoriteSlugs());
    return this.tools().filter(t => slugs.has(t.slug));
  });

  readonly recentTools = computed<ToolRegistryItem[]>(() => {
    const current = this.currentSlug();
    const map = new Map(this.tools().map(t => [t.slug, t]));
    return this.recentSlugs()
      .filter(s => s !== current)
      .map(s => map.get(s))
      .filter((t): t is ToolRegistryItem => !!t)
      .slice(0, 4);
  });

  private loadFavorites(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(FAVORITES_KEY);
        if (raw) {
          this.favoriteSlugs.set(JSON.parse(raw));
        }
      }
    } catch {}
  }

  private loadAndTrackRecents(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(RECENT_KEY);
        let list: string[] = raw ? JSON.parse(raw) : [];
        const current = this.currentSlug();
        if (current) {
          list = [current, ...list.filter(s => s !== current)].slice(0, 8);
          window.localStorage.setItem(RECENT_KEY, JSON.stringify(list));
        }
        this.recentSlugs.set(list);
      }
    } catch {}
  }

  categoryIcon(category: string): string {
    const norm = (category || '').toLowerCase();
    if (norm === 'utilities') return 'boxes';
    if (norm === 'developer') return 'terminal';
    if (norm === 'formatters') return 'file-code';
    if (norm === 'security') return 'shield';
    if (norm === 'media') return 'image';
    if (norm === 'calculators') return 'sliders';
    if (norm === 'ai') return 'sparkles';
    return 'layers';
  }

  encodeCategory(category: string): string {
    return encodeURIComponent(category.toLowerCase());
  }

  groupHasActive(tools: ToolRegistryItem[]): boolean {
    const slug = this.currentSlug();
    return tools.some(t => t.slug === slug);
  }

  // Collapsed categories state (current category open by default)
  readonly collapsedCategories = signal<Set<string>>(new Set());

  ngOnInit(): void {
    // Check dev-mode marker query: ?tree=icon|dot
    if (isDevMode() && typeof window !== 'undefined' && window.location) {
      try {
        const params = new URLSearchParams(window.location.search);
        const marker = params.get('tree');
        if (marker === 'dot' || marker === 'icon') {
          this.treeMarker.set(marker);
        }
      } catch { }
    }

    const currentTool = this.tools().find(t => t.slug === this.currentSlug());
    const currentCat = currentTool?.category || 'Utilities';

    // Start with all open by default, and ensure active tool's category is explicitly open
    this.collapsedCategories.update(set => {
      const next = new Set(set);
      next.delete(currentCat);
      return next;
    });

    this.loadFavorites();
    this.loadAndTrackRecents();

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === FAVORITES_KEY) {
          this.loadFavorites();
        }
      });
    }
  }

  toggleCategory(category: string): void {
    this.collapsedCategories.update(set => {
      const next = new Set(set);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  isCategoryOpen(category: string): boolean {
    return !this.collapsedCategories().has(category);
  }

  readonly filteredTools = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.tools();
    return this.tools().filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      (t.shortDescription && t.shortDescription.toLowerCase().includes(q))
    );
  });

  readonly groupedCategories = computed(() => {
    const tools = this.filteredTools();
    const order = ['Utilities', 'Developer', 'Formatters', 'Security', 'Media', 'Calculators', 'AI'];

    const map = new Map<string, ToolRegistryItem[]>();
    for (const tool of tools) {
      const cat = tool.category || 'Utilities';
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat)!.push(tool);
    }

    const categories: { category: string; tools: ToolRegistryItem[]; railTools: ToolRegistryItem[] }[] = [];
    for (const cat of order) {
      if (map.has(cat) && map.get(cat)!.length > 0) {
        const items = map.get(cat)!;
        categories.push({ category: cat, tools: items, railTools: items.slice(0, 5) });
        map.delete(cat);
      }
    }

    for (const [cat, items] of map.entries()) {
      if (items.length > 0) {
        categories.push({ category: cat, tools: items, railTools: items.slice(0, 5) });
      }
    }

    return categories;
  });
}


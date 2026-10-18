import { Component, input, inject, signal, computed, HostListener, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolRegistryItem } from '@acklet/tool-registry';
import { getToolsHubUrl, getPortalUrl } from '@acklet/shared';
import { ToolSidebarService } from '../../services/tool-sidebar.service';
import { TsIconComponent } from '../icon/ts-icon.component';
import { TsToolListComponent } from './ts-tool-list.component';
import { TsSearchComponent } from '../search/ts-search.component';
import { TsTooltipDirective } from '../primitive/ts-tooltip.directive';
import { TsToolDetailsComponent } from '../rail/ts-tool-details.component';

@Component({
  selector: 'ts-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TsIconComponent,
    TsToolListComponent,
    TsSearchComponent,
    TsTooltipDirective,
    TsToolDetailsComponent
  ],
  template: `
    <!-- Desktop Left Sidebar (Floating Card) -->
    <aside
      class="ts-sidebar-card hide-mobile"
      [class.is-collapsed]="sidebarService.isCollapsed()"
      [class.is-dragging]="sidebarService.isDragging()"
      [style.width.px]="sidebarService.isCollapsed() ? 72 : sidebarService.width()"
      aria-label="Tool Navigation Directory"
    >
      <div class="ts-sidebar-inner">
        <!-- 1. Top Action Rows (Open) or Rail Top Actions (Collapsed) -->
        <div class="ts-sidebar-top-actions">
          @if (!sidebarService.isCollapsed()) {
            <!-- Row 1: grid icon + All tools -->
            <a [href]="hubUrl" class="ts-action-row" title="Browse all tools" aria-label="Browse all tools">
              <ts-icon name="grid" [size]="20" class="ts-action-row-icon" />
              <span class="ts-action-row-label">All tools</span>
            </a>

            <!-- Row 2: search icon + Search tools OR Inline ts-search -->
            @if (showInlineSearch()) {
              <div class="ts-sidebar-search-container">
                <ts-search 
                  #searchInput
                  [value]="searchQuery()" 
                  (valueChange)="searchQuery.set($event)" 
                  (keydown)="onSearchKeydown($event)"
                />
              </div>
            } @else {
              <button 
                type="button" 
                class="ts-action-row ts-action-search-btn"
                (click)="openSearch()"
                aria-label="Search tools"
              >
                <ts-icon name="search" [size]="20" class="ts-action-row-icon" />
                <span class="ts-action-row-label">Search tools</span>
              </button>
            }
          } @else {
            <!-- Rail Top Buttons -->
            <div class="ts-rail-top-column">
              <a 
                [href]="hubUrl" 
                class="ts-rail-action-btn" 
                tsTooltip="All tools" 
                tooltipPosition="right" 
                aria-label="All tools"
              >
                <ts-icon name="grid" [size]="20" />
              </a>
              <button 
                type="button" 
                class="ts-rail-action-btn"
                (click)="openSearchFromRail()"
                tsTooltip="Search tools"
                tooltipPosition="right"
                aria-label="Search tools"
              >
                <ts-icon name="search" [size]="20" />
              </button>
            </div>
          }
        </div>

        <!-- 2. Nav Area: Scrolls Internally -->
        <div class="ts-sidebar-scroll-body">
          <ts-tool-list 
            [tools]="tools()" 
            [currentSlug]="currentSlug()" 
            [isRail]="sidebarService.isCollapsed()"
            [searchQuery]="searchQuery()"
          />

          <!-- Embedded Tool Details inside Aside Sidebar -->
          @if (!sidebarService.isCollapsed() && tool()) {
            <div class="ts-sidebar-details-container">
              <ts-tool-details [tool]="tool()" />
            </div>
          }
        </div>

        <!-- 3. Pinned Bottom Bar: Help (left) + Collapse/Expand (right) -->
        <div class="ts-sidebar-pinned-footer">
          @if (!sidebarService.isCollapsed()) {
            <a 
              [href]="portalUrl + '/community/help'" 
              class="ts-footer-btn" 
              target="_blank" 
              rel="noopener noreferrer" 
              tsTooltip="Help & Support" 
              aria-label="Help & Support"
            >
              <ts-icon name="help-circle" [size]="20" />
            </a>
            <button 
              type="button" 
              class="ts-footer-btn" 
              (click)="sidebarService.toggleCollapse()" 
              tsTooltip="Collapse sidebar" 
              aria-label="Collapse sidebar"
            >
              <ts-icon name="panel-left-close" [size]="20" />
            </button>
          } @else {
            <div class="ts-rail-footer-column">
              <a 
                [href]="portalUrl + '/community/help'" 
                class="ts-rail-action-btn" 
                target="_blank" 
                rel="noopener noreferrer" 
                tsTooltip="Help" 
                tooltipPosition="right" 
                aria-label="Help"
              >
                <ts-icon name="help-circle" [size]="20" />
              </a>
              <button 
                type="button" 
                class="ts-rail-action-btn"
                (click)="sidebarService.toggleCollapse()"
                tsTooltip="Expand sidebar"
                tooltipPosition="right"
                aria-label="Expand sidebar"
              >
                <ts-icon name="panel-left-open" [size]="20" />
              </button>
            </div>
          }
        </div>
      </div>
    </aside>

    <!-- Mobile Drawer Overlay (Sheet <1024px) -->
    @if (sidebarService.isMobileDrawerOpen()) {
      <div 
        class="ts-mobile-sheet-backdrop" 
        (click)="sidebarService.closeMobileDrawer()" 
        (keydown)="onBackdropKeydown($event)"
        role="dialog" 
        aria-modal="true" 
        aria-label="Navigation Menu"
      >
        <aside 
          class="ts-mobile-sheet-panel" 
          (click)="$event.stopPropagation()"
        >
          <div class="ts-sheet-header">
            <a [href]="hubUrl" class="ts-brand-link">
              <ts-icon name="zap" [size]="18" />
              <span class="ts-brand-wordmark">Acklet Tools</span>
            </a>
            <button 
              type="button" 
              class="ts-sheet-close-btn"
              (click)="sidebarService.closeMobileDrawer()"
              aria-label="Close menu"
            >
              <ts-icon name="x" [size]="18" />
            </button>
          </div>

          <!-- Section Links for this tool (on mobile) -->
          @if (sectionLinks().length > 0) {
            <div class="ts-sheet-sections">
              <div class="ts-sheet-section-title">This Tool</div>
              <div class="ts-sheet-section-pills">
                @for (sec of sectionLinks(); track sec.id) {
                  <a 
                    [href]="'#' + sec.id" 
                    class="ts-sheet-section-pill"
                    (click)="sidebarService.closeMobileDrawer()"
                  >
                    {{ sec.label }}
                  </a>
                }
              </div>
            </div>
          }

          <!-- Mobile Actions (Share & Save under 480px) -->
          <div class="ts-sheet-mobile-actions">
            <button 
              type="button" 
              class="ts-sheet-action-btn"
              (click)="copyShareLink()"
            >
              <ts-icon [name]="copiedLink() ? 'check' : 'link'" [size]="16" />
              <span>{{ copiedLink() ? 'Link copied' : 'Share tool' }}</span>
            </button>
            <button 
              type="button" 
              class="ts-sheet-action-btn"
              [class.is-favorited]="isFavorited()"
              (click)="toggleFavorite()"
            >
              <ts-icon name="star" [size]="16" [class.ts-sheet-star-icon]="isFavorited()" />
              <span>{{ isFavorited() ? 'Saved to favorites' : 'Save to favorites' }}</span>
            </button>
          </div>

          <!-- Mobile Search Row -->
          <div class="ts-sidebar-search-row">
            <ts-search [value]="searchQuery()" (valueChange)="searchQuery.set($event)" />
          </div>

          <!-- Mobile Sheet Scroll Body with same ts-tool-list -->
          <div class="ts-sidebar-scroll-body">
            <ts-tool-list 
              [tools]="tools()" 
              [currentSlug]="currentSlug()" 
              [isRail]="false"
              [searchQuery]="searchQuery()"
            />

            <!-- Embedded Tool Details inside Mobile Drawer -->
            @if (tool()) {
              <div class="ts-sidebar-details-container">
                <ts-tool-details [tool]="tool()" />
              </div>
            }
          </div>

          <div class="ts-sidebar-pinned-footer">
            <a [href]="hubUrl" class="ts-footer-link">
              <ts-icon name="grid" [size]="14" />
              <span>All tools</span>
            </a>
          </div>
        </aside>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      min-height: 0;
    }

    .ts-sidebar-card {
      position: relative;
      height: 100%;
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
      overflow: hidden;
      flex-shrink: 0;
      box-sizing: border-box;
      min-width: 0;
      min-height: 0;
      transition: width 200ms var(--ts-ease-out),
                  background var(--ts-dur-hover, 220ms) var(--ts-ease);
      user-select: none;
      z-index: var(--ts-z-chrome, 10);
      transform: translateZ(0);
    }

    .ts-sidebar-inner {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 12px;
      box-sizing: border-box;
      overflow: hidden;
      background: transparent;
    }

    /* Top Action Rows: 36px, radius 10px, padding 0 10px, icon 20px, gap 12px, text 14.5px/20px weight 400 --text-2 */
    .ts-sidebar-top-actions {
      display: flex;
      flex-direction: column;
      gap: 2px;
      background: transparent;
      flex-shrink: 0;
    }

    .ts-action-row {
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
      cursor: pointer;
      box-sizing: border-box;
      user-select: none;
      transition: background-color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  transform var(--ts-dur-press, 150ms) var(--ts-ease);
    }

    @media (hover: hover) {
      .ts-action-row:hover {
        background: var(--ts-row-hover, rgba(15, 23, 42, 0.05));
        color: var(--text, #09090B);
      }
      .ts-action-row:hover .ts-action-row-icon {
        color: var(--accent-strong, #111111);
      }
    }

    .ts-action-row:active {
      transform: scale(0.98);
    }

    .ts-action-row:focus-visible {
      outline: 2px solid var(--accent-strong) !important;
      outline-offset: 1px;
    }

    :host-context([data-theme="dark"]) .ts-action-row {
      color: var(--text-2, #B3B3B8);
    }

    .ts-action-row-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      color: var(--text-3, #8E8E93);
      transition: color var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .ts-action-row-label {
      font-family: var(--font-body, "Nunito", sans-serif);
      font-size: 14.5px;
      line-height: 20px;
      font-weight: 400;
      color: inherit;
      white-space: nowrap;
      transition: opacity 200ms var(--ts-ease);
    }

    .ts-sidebar-card.is-collapsed .ts-action-row-label {
      opacity: 0;
      pointer-events: none;
    }

    .ts-sidebar-search-container {
      width: 100%;
      height: 36px;
      display: flex;
      align-items: center;
    }

    /* Rail top/footer icon columns */
    .ts-rail-top-column,
    .ts-rail-footer-column {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      width: 100%;
    }

    .ts-rail-action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text-2, #52525B);
      cursor: pointer;
      text-decoration: none;
      transition: background-color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  transform var(--ts-dur-press, 150ms) var(--ts-ease);
    }

    @media (hover: hover) {
      .ts-rail-action-btn:hover {
        background: var(--ts-row-hover, rgba(15, 23, 42, 0.05));
        color: var(--accent-strong, #111111);
      }
    }

    .ts-rail-action-btn:active {
      transform: scale(0.98);
    }

    .ts-rail-action-btn:focus-visible {
      outline: 2px solid var(--accent-strong) !important;
      outline-offset: 1px;
    }

    :host-context([data-theme="dark"]) .ts-rail-action-btn {
      color: var(--text-2, #B3B3B8);
    }

    .ts-sidebar-search-row {
      padding: 8px 10px;
      border-bottom: 1px solid var(--border, rgba(0, 0, 0, 0.06));
      background: transparent;
      flex-shrink: 0;
    }

    .ts-sidebar-scroll-body {
      flex: 1;
      overflow-y: auto;
      padding: 0;
      background: transparent;
      scrollbar-width: thin;
      scrollbar-color: var(--ts-scrollbar-thumb, #E4E4E7) transparent;
      display: flex;
      flex-direction: column;
    }

    .ts-sidebar-details-container {
      margin-top: 16px;
      padding: 0 4px 12px;
      width: 100%;
      box-sizing: border-box;
    }

    .ts-sidebar-details-container ::ng-deep .ts-details-panel {
      padding: 14px 16px;
      border-radius: 14px;
      background: rgba(15, 23, 42, 0.035);
      border: 1px solid var(--border, rgba(15, 23, 42, 0.06));
      box-shadow: none;
    }

    :host-context([data-theme="dark"]) .ts-sidebar-details-container ::ng-deep .ts-details-panel {
      background: rgba(255, 255, 255, 0.03);
      border-color: rgba(255, 255, 255, 0.08);
    }

    .ts-sidebar-pinned-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 4px 0;
      border-top: 1px solid var(--ts-tree-line, rgba(15, 23, 42, 0.08));
      background: transparent;
      flex-shrink: 0;
    }

    :host-context([data-theme="dark"]) .ts-sidebar-pinned-footer {
      border-top-color: var(--ts-tree-line, rgba(255, 255, 255, 0.08));
    }

    .ts-footer-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text-2, #52525B);
      cursor: pointer;
      text-decoration: none;
      transition: background-color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  transform var(--ts-dur-press, 150ms) var(--ts-ease);
    }

    @media (hover: hover) {
      .ts-footer-btn:hover {
        background: var(--ts-row-hover, rgba(15, 23, 42, 0.05));
        color: var(--accent-strong, #111111);
      }
    }

    .ts-footer-btn:active {
      transform: scale(0.98);
    }

    .ts-footer-btn:focus-visible {
      outline: 2px solid var(--accent-strong) !important;
      outline-offset: 1px;
    }

    :host-context([data-theme="dark"]) .ts-footer-btn {
      color: var(--text-2, #B3B3B8);
    }

    .ts-footer-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 8px;
      border-radius: 8px;
      color: var(--text-muted, #71717A);
      font-size: 13px;
      font-family: var(--font-body, "Nunito", sans-serif);
      font-weight: 600;
      text-decoration: none;
      transition: color 150ms ease, background-color 150ms ease;
    }

    .ts-rail-footer-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: var(--ts-radius-control, 12px);
      background: transparent;
      border: none;
      outline: none;
      color: var(--text-muted, #71717A);
      cursor: pointer;
      text-decoration: none;
      transition: background-color 150ms ease, color 150ms ease;
    }

    .ts-rail-footer-btn:hover {
      background: var(--surface-hover, #F4F4F5);
      color: var(--text, #18181B);
    }

    :host-context([data-theme="dark"]) .ts-rail-footer-btn:hover {
      background: var(--surface-hover, #1E1E22);
      color: #FFFFFF;
    }

    .ts-rail-footer-btn:focus-visible {
      outline: 2px solid var(--ts-focus-ring, #18181B) !important;
      outline-offset: 2px;
    }

    /* Mobile Offcanvas Sheet */
    .ts-mobile-sheet-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      z-index: var(--ts-z-overlay, 40);
      display: flex;
      justify-content: flex-start;
      animation: tsFadeIn 150ms ease-out;
    }

    .ts-mobile-sheet-panel {
      width: 85vw;
      max-width: 320px;
      height: 100%;
      background: var(--ts-overlay-bg);
      -webkit-backdrop-filter: var(--ts-overlay-filter);
      backdrop-filter: var(--ts-overlay-filter);
      border-right: 1px solid var(--ts-overlay-border);
      display: flex;
      flex-direction: column;
      box-shadow: var(--ts-overlay-shadow, 0 10px 25px rgba(0, 0, 0, 0.2));
      animation: tsSlideIn 200ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    .ts-sheet-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      height: 56px;
      border-bottom: 1px solid var(--border, rgba(0, 0, 0, 0.08));
    }

    .ts-brand-link {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: var(--text, #18181B);
    }

    :host-context([data-theme="dark"]) .ts-brand-link {
      color: var(--text, #FCFCFC);
    }

    .ts-brand-wordmark {
      font-family: var(--font-heading, "Nunito", sans-serif);
      font-size: 18px;
      font-weight: 800;
      color: var(--text);
    }

    .ts-sheet-close-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      min-width: 44px;
      min-height: 44px;
      border-radius: 10px;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text-muted, #71717A);
      cursor: pointer;
      transition: background-color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  color var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .ts-sheet-close-btn:hover {
      background: var(--surface-hover, #F4F4F5);
      color: var(--text, #18181B);
    }

    :host-context([data-theme="dark"]) .ts-sheet-close-btn:hover {
      background: var(--surface-hover, #1E1E22);
      color: #FCFCFC;
    }

    .ts-sheet-sections {
      padding: 10px 14px;
      border-bottom: 1px solid var(--border, rgba(0, 0, 0, 0.08));
      background: var(--surface-hover, #F4F4F5);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    :host-context([data-theme="dark"]) .ts-sheet-sections {
      background: #18181B;
      border-bottom-color: var(--border, rgba(255, 255, 255, 0.08));
    }

    .ts-sheet-section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted, #71717A);
    }

    :host-context([data-theme="dark"]) .ts-sheet-section-title {
      color: #A1A1AA;
    }

    .ts-sheet-section-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .ts-sheet-section-pill {
      display: inline-flex;
      align-items: center;
      min-height: 36px;
      padding: 4px 14px;
      border-radius: var(--ts-radius-full, 9999px);
      background: var(--surface, #FFFFFF);
      border: 1px solid var(--border, rgba(0, 0, 0, 0.08));
      color: var(--text, #18181B);
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      transition: background-color 150ms ease, color 150ms ease;
    }

    :host-context([data-theme="dark"]) .ts-sheet-section-pill {
      background: #202024;
      border-color: rgba(255, 255, 255, 0.1);
      color: #FCFCFC;
    }

    .ts-sheet-section-pill:hover {
      background: var(--accent-soft, #10302D);
      color: var(--accent-strong, #2DD4BF);
    }

    .ts-sheet-mobile-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 0 16px 12px;
      border-bottom: 1px solid var(--border, rgba(0, 0, 0, 0.06));
    }

    :host-context([data-theme="dark"]) .ts-sheet-mobile-actions {
      border-bottom-color: var(--border, rgba(255, 255, 255, 0.08));
    }

    .ts-sheet-action-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      height: 40px;
      padding: 0 12px;
      border-radius: var(--ts-radius-control, 12px);
      background: var(--surface-hover, #F4F4F5);
      border: 1px solid var(--border, rgba(0, 0, 0, 0.08));
      color: var(--text, #18181B);
      font-family: var(--font-body, "Nunito", sans-serif);
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      outline: none;
      transition: background-color 150ms ease;
    }

    :host-context([data-theme="dark"]) .ts-sheet-action-btn {
      background: #202024;
      border-color: rgba(255, 255, 255, 0.08);
      color: var(--text, #FCFCFC);
    }

    .ts-sheet-action-btn.is-favorited {
      color: #EAB308;
    }

    .ts-sheet-star-icon {
      fill: #EAB308;
      color: #EAB308;
    }

    @keyframes tsFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes tsSlideIn {
      from { transform: translateX(-100%); }
      to { transform: translateX(0); }
    }

    @media (prefers-reduced-motion: reduce) {
      .ts-sidebar-card,
      .ts-mobile-sheet-backdrop,
      .ts-mobile-sheet-panel {
        transition: none !important;
        animation: none !important;
      }
    }

    @media (max-width: 1023px) {
      :host {
        display: contents !important;
      }
      .hide-mobile {
        display: none !important;
      }
    }
  `]
})
export class TsSidebarComponent {
  readonly tools = input.required<ToolRegistryItem[]>();
  readonly tool = input<ToolRegistryItem | null>(null);
  readonly currentSlug = input<string>('');

  readonly sidebarService = inject(ToolSidebarService);
  readonly portalUrl = getPortalUrl();
  readonly hubUrl = getToolsHubUrl();

  readonly showInlineSearch = signal<boolean>(false);
  readonly searchQuery = signal<string>('');
  readonly copiedLink = signal<boolean>(false);
  readonly isFavorited = signal<boolean>(false);

  openSearch(): void {
    this.showInlineSearch.set(true);
    setTimeout(() => {
      if (typeof document !== 'undefined') {
        const input = document.querySelector('.ts-sidebar-search-container input') as HTMLInputElement | null;
        input?.focus();
      }
    }, 50);
  }

  openSearchFromRail(): void {
    this.sidebarService.toggleCollapse();
    this.openSearch();
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.searchQuery.set('');
      this.showInlineSearch.set(false);
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

  toggleFavorite(): void {
    this.isFavorited.update(v => !v);
  }

  readonly sectionLinks = computed<{ id: string; label: string }[]>(() => {
    const t = this.tool();
    if (!t) return [];
    if (t.navLinks && t.navLinks.length > 0) {
      return t.navLinks;
    }
    const links = [{ id: 'tool', label: 'Tool' }];
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


  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.sidebarService.isMobileDrawerOpen()) {
      this.sidebarService.closeMobileDrawer();
    }
    if (!this.sidebarService.isCollapsed()) {
      this.sidebarService.isCollapsed.set(true);
    }
  }

  onBackdropKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.sidebarService.closeMobileDrawer();
    }
  }
}

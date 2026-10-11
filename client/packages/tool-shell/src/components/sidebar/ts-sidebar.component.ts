// packages/tool-shell/src/components/sidebar/ts-sidebar.component.ts
import { Component, input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolRegistryItem } from '@acklet/tool-registry';
import { getToolsHubUrl, getPortalUrl } from '@acklet/shared';
import { ToolSidebarService } from '../../services/tool-sidebar.service';
import { TsIconComponent } from '../icon/ts-icon.component';
import { TsToolListComponent } from './ts-tool-list.component';
import { TsSearchComponent } from '../search/ts-search.component';
import { TsTooltipDirective } from '../primitive/ts-tooltip.directive';

@Component({
  selector: 'ts-sidebar',
  standalone: true,
  imports: [
    CommonModule, 
    TsIconComponent, 
    TsToolListComponent, 
    TsSearchComponent,
    TsTooltipDirective
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
        <!-- 1. Top Header: Title & Filter / Expand Button -->
        <div class="ts-sidebar-top-header">
          @if (!sidebarService.isCollapsed()) {
            <span class="ts-sidebar-title">Tools</span>
            <div class="ts-sidebar-header-actions">
              <button 
                type="button" 
                class="ts-icon-btn"
                (click)="showInlineSearch.update(v => !v)"
                [class.active]="showInlineSearch()"
                aria-label="Filter tools"
                tsTooltip="Filter tools"
              >
                <ts-icon name="search" [size]="15" />
              </button>
            </div>
          } @else {
            <button 
              type="button" 
              class="ts-rail-expand-btn"
              (click)="sidebarService.toggleCollapse()"
              aria-label="Expand sidebar"
              tsTooltip="Expand sidebar"
              tooltipPosition="right"
            >
              <ts-icon name="panel-left-open" [size]="16" />
            </button>
          }
        </div>

        <!-- Search Input (if opened) -->
        @if (showInlineSearch() && !sidebarService.isCollapsed()) {
          <div class="ts-sidebar-search-row">
            <ts-search [value]="searchQuery()" (valueChange)="searchQuery.set($event)" />
          </div>
        }

        <!-- 2. Nav Area: Scrolls Internally -->
        <div class="ts-sidebar-scroll-body">
          <ts-tool-list 
            [tools]="tools()" 
            [currentSlug]="currentSlug()" 
            [isRail]="sidebarService.isCollapsed()"
            [searchQuery]="searchQuery()"
          />
        </div>

        <!-- 3. Pinned Bottom Bar: "All tools" link + Help/Info Button + Collapse Button -->
        <div class="ts-sidebar-pinned-footer">
          @if (!sidebarService.isCollapsed()) {
            <div class="ts-footer-left">
              <a [href]="hubUrl" class="ts-footer-link" title="Browse all tools" aria-label="Browse all tools">
                <ts-icon name="grid" [size]="14" />
                <span>All tools</span>
              </a>
              <a [href]="portalUrl + '/community/help'" class="ts-footer-icon-btn" target="_blank" rel="noopener noreferrer" tsTooltip="Help & Support" aria-label="Help & Support">
                <ts-icon name="help-circle" [size]="14" />
              </a>
            </div>
            <button 
              type="button" 
              class="ts-footer-collapse-btn" 
              (click)="sidebarService.toggleCollapse()" 
              title="Collapse sidebar" 
              aria-label="Collapse sidebar"
            >
              <ts-icon name="panel-left-close" [size]="14" />
              <span>Collapse</span>
            </button>
          } @else {
            <div class="ts-rail-footer-column">
              <a [href]="hubUrl" class="ts-rail-footer-btn" tsTooltip="All tools" tooltipPosition="right" aria-label="All tools">
                <ts-icon name="grid" [size]="16" />
              </a>
              <a [href]="portalUrl + '/community/help'" class="ts-rail-footer-btn" target="_blank" rel="noopener noreferrer" tsTooltip="Help" tooltipPosition="right" aria-label="Help">
                <ts-icon name="help-circle" [size]="16" />
              </a>
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
        role="dialog" 
        aria-modal="true" 
        aria-label="Mobile Navigation"
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
              class="ts-icon-btn"
              (click)="sidebarService.closeMobileDrawer()"
              aria-label="Close menu"
            >
              <ts-icon name="x" [size]="16" />
            </button>
          </div>

          <div class="ts-sidebar-search-row">
            <ts-search [value]="searchQuery()" (valueChange)="searchQuery.set($event)" />
          </div>

          <div class="ts-sidebar-scroll-body">
            <ts-tool-list 
              [tools]="tools()" 
              [currentSlug]="currentSlug()" 
              [isRail]="false"
              [searchQuery]="searchQuery()"
            />
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
    .ts-sidebar-card {
      position: relative;
      height: 100%;
      background: var(--shell-card, #FFFFFF);
      border: 1px solid var(--shell-card-border, rgba(0, 0, 0, 0.06));
      border-radius: var(--shell-radius, 20px);
      box-shadow: var(--shell-card-shadow, 0 1px 2px rgba(0, 0, 0, 0.04));
      overflow: hidden;
      flex-shrink: 0;
      box-sizing: border-box;
      transition: width 200ms ease-out,
                  background-color var(--ts-dur-base, 200ms) var(--ts-ease),
                  border-color var(--ts-dur-base, 200ms) var(--ts-ease);
      user-select: none;
      z-index: var(--ts-z-chrome, 10);
    }

    :host-context([data-theme="dark"]) .ts-sidebar-card {
      background: var(--shell-card, #141414);
      border-color: var(--shell-card-border, #27272A);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    }

    .ts-sidebar-inner {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      background: inherit;
    }

    .ts-sidebar-top-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px;
      height: 48px;
      border-bottom: 1px solid var(--border, rgba(0, 0, 0, 0.06));
      background: inherit;
      flex-shrink: 0;
    }

    :host-context([data-theme="dark"]) .ts-sidebar-top-header {
      border-bottom-color: var(--border, rgba(255, 255, 255, 0.08));
    }

    .ts-sidebar-title {
      font-family: var(--font-body, "Nunito", sans-serif);
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text, #18181B);
    }

    :host-context([data-theme="dark"]) .ts-sidebar-title {
      color: var(--text, #FCFCFC);
    }

    .ts-sidebar-header-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .ts-icon-btn,
    .ts-footer-icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: 8px;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text-muted, #71717A);
      cursor: pointer;
      text-decoration: none;
      transition: background-color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  color var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .ts-icon-btn:hover,
    .ts-icon-btn.active,
    .ts-footer-icon-btn:hover {
      background: var(--surface-hover, #F4F4F5);
      color: var(--text, #18181B);
    }

    :host-context([data-theme="dark"]) .ts-icon-btn:hover,
    :host-context([data-theme="dark"]) .ts-icon-btn.active,
    :host-context([data-theme="dark"]) .ts-footer-icon-btn:hover {
      background: var(--surface-hover, #1E1E22);
      color: #FFFFFF;
    }

    .ts-icon-btn:focus-visible,
    .ts-footer-icon-btn:focus-visible {
      outline: 2px solid var(--ts-focus-ring, #18181B) !important;
      outline-offset: 2px;
    }

    .ts-rail-expand-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      margin: 0 auto;
      border-radius: 10px;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text-muted, #71717A);
      cursor: pointer;
      transition: background-color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  color var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .ts-rail-expand-btn:hover {
      background: var(--surface-hover, #F4F4F5);
      color: var(--text, #18181B);
    }

    :host-context([data-theme="dark"]) .ts-rail-expand-btn:hover {
      background: var(--surface-hover, #1E1E22);
      color: #FFFFFF;
    }

    .ts-rail-expand-btn:focus-visible {
      outline: 2px solid var(--ts-focus-ring, #18181B) !important;
      outline-offset: 2px;
    }

    .ts-sidebar-search-row {
      padding: 8px 10px;
      border-bottom: 1px solid var(--border, rgba(0, 0, 0, 0.06));
      background: inherit;
      flex-shrink: 0;
    }

    .ts-sidebar-scroll-body {
      flex: 1;
      overflow-y: auto;
      padding: 10px 8px;
      background: inherit;
      scrollbar-width: thin;
      scrollbar-color: var(--ts-scrollbar-thumb, #E4E4E7) transparent;
    }

    .ts-sidebar-pinned-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 10px;
      border-top: 1px solid var(--border, rgba(0, 0, 0, 0.06));
      height: 48px;
      background: inherit;
      flex-shrink: 0;
    }

    :host-context([data-theme="dark"]) .ts-sidebar-pinned-footer {
      border-top-color: var(--border, rgba(255, 255, 255, 0.08));
    }

    .ts-footer-left {
      display: flex;
      align-items: center;
      gap: 4px;
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

    .ts-footer-link:hover {
      background: var(--surface-hover, #F4F4F5);
      color: var(--text, #18181B);
    }

    :host-context([data-theme="dark"]) .ts-footer-link:hover {
      background: var(--surface-hover, #1E1E22);
      color: #FFFFFF;
    }

    .ts-footer-link:focus-visible {
      outline: 2px solid var(--ts-focus-ring, #18181B) !important;
      outline-offset: 1px;
    }

    .ts-footer-collapse-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 8px;
      border-radius: 8px;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text-muted, #71717A);
      font-size: 12px;
      font-family: var(--font-body, "Nunito", sans-serif);
      font-weight: 600;
      cursor: pointer;
      transition: background-color 150ms ease, color 150ms ease;
    }

    .ts-footer-collapse-btn:hover {
      background: var(--surface-hover, #F4F4F5);
      color: var(--text, #18181B);
    }

    :host-context([data-theme="dark"]) .ts-footer-collapse-btn:hover {
      background: var(--surface-hover, #1E1E22);
      color: #FFFFFF;
    }

    .ts-footer-collapse-btn:focus-visible {
      outline: 2px solid var(--ts-focus-ring, #18181B) !important;
      outline-offset: 1px;
    }

    .ts-rail-footer-column {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
    }

    .ts-rail-footer-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
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
      background: var(--shell-card, #FFFFFF);
      border-right: 1px solid var(--border, rgba(0, 0, 0, 0.08));
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      animation: tsSlideIn 200ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    :host-context([data-theme="dark"]) .ts-mobile-sheet-panel {
      background: var(--shell-card, #141414);
      border-right-color: var(--border, rgba(255, 255, 255, 0.08));
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
      .hide-mobile {
        display: none !important;
      }
    }
  `]
})
export class TsSidebarComponent {
  readonly tools = input.required<ToolRegistryItem[]>();
  readonly currentSlug = input<string>('');

  readonly sidebarService = inject(ToolSidebarService);
  readonly portalUrl = getPortalUrl();
  readonly hubUrl = getToolsHubUrl();

  readonly showInlineSearch = signal<boolean>(false);
  readonly searchQuery = signal<string>('');
}

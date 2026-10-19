// packages/tool-shell/src/components/sidebar/ts-sidebar.component.ts
import { Component, input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolRegistryItem } from '@acklet/tool-registry';
import { getPortalUrl, getToolsHubUrl } from '@acklet/shared';
import { ToolSidebarService } from '../../services/tool-sidebar.service';
import { TsIconComponent } from '../icon/ts-icon.component';
import { TsToolListComponent } from './ts-tool-list.component';
import { TsSearchComponent } from '../search/ts-search.component';

@Component({
  selector: 'ts-sidebar',
  standalone: true,
  imports: [
    CommonModule, 
    TsIconComponent, 
    TsToolListComponent, 
    TsSearchComponent
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
        <!-- 1. Top Header: Title & Filter -->
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
                title="Search & filter tools"
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
              title="Expand sidebar"
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

        <!-- 3. Pinned Bottom Bar: Help, About & Labeled Collapse Button -->
        <div class="ts-sidebar-pinned-footer">
          @if (!sidebarService.isCollapsed()) {
            <div class="ts-footer-left">
              <a [href]="portalUrl + '/community/help'" class="ts-footer-link" target="_blank" rel="noopener noreferrer" title="Help & Documentation" aria-label="Help & Documentation">
                <ts-icon name="help-circle" [size]="14" />
                <span>Help</span>
              </a>
              <a [href]="portalUrl + '/about'" class="ts-footer-icon-btn" target="_blank" rel="noopener noreferrer" title="About Acklet" aria-label="About Acklet">
                <ts-icon name="info" [size]="14" />
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
            <button 
              type="button" 
              class="ts-rail-footer-btn" 
              (click)="sidebarService.toggleCollapse()" 
              title="Expand sidebar" 
              aria-label="Expand sidebar"
            >
              <ts-icon name="panel-left-open" [size]="16" />
            </button>
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
            <div class="ts-brand-link">
              <ts-icon name="zap" [size]="18" />
              <span class="ts-brand-wordmark">Acklet</span>
            </div>
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
            <a [href]="portalUrl" class="ts-footer-link" target="_blank" rel="noopener noreferrer">
              <ts-icon name="help-circle" [size]="14" />
              <span>Acklet Platform</span>
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
      background: var(--shell-card);
      border: 1px solid var(--shell-card-border);
      border-radius: var(--shell-radius, 20px);
      box-shadow: var(--shell-card-shadow);
      overflow: hidden;
      flex-shrink: 0;
      box-sizing: border-box;
      transition: width 200ms ease-out,
                  background-color var(--ts-dur-base, 200ms) var(--ts-ease),
                  border-color var(--ts-dur-base, 200ms) var(--ts-ease);
      user-select: none;
      z-index: var(--ts-z-chrome, 10);
    }

    .ts-sidebar-inner {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      background: var(--shell-card);
    }

    .ts-sidebar-top-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px;
      height: 48px;
      border-bottom: 1px solid var(--border);
      background: var(--shell-card);
      flex-shrink: 0;
    }

    .ts-sidebar-title {
      font-family: var(--font-body, "Nunito", sans-serif);
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text);
      letter-spacing: normal;
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
      color: var(--text-muted);
      cursor: pointer;
      text-decoration: none;
      transition: background-color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  color var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .ts-icon-btn:hover,
    .ts-icon-btn.active,
    .ts-footer-icon-btn:hover {
      background: var(--surface-hover);
      color: var(--text);
    }

    .ts-icon-btn:focus-visible,
    .ts-footer-icon-btn:focus-visible {
      outline: 2px solid var(--ts-focus-ring) !important;
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
      color: var(--text-muted);
      cursor: pointer;
      transition: background-color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  color var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .ts-rail-expand-btn:hover {
      background: var(--surface-hover);
      color: var(--text);
    }

    .ts-sidebar-search-row {
      padding: 8px 10px;
      border-bottom: 1px solid var(--border);
      background: var(--shell-card);
      flex-shrink: 0;
    }

    .ts-sidebar-scroll-body {
      flex: 1;
      overflow-y: auto;
      padding: 10px 8px;
      background: var(--shell-card);
      scrollbar-width: thin;
      scrollbar-color: var(--ts-scrollbar-thumb) transparent;
    }

    .ts-sidebar-pinned-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 10px;
      border-top: 1px solid var(--border);
      height: 48px;
      background: var(--shell-card);
      flex-shrink: 0;
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
      padding: 4px 6px;
      border-radius: 6px;
      color: var(--text-muted);
      font-size: 12.5px;
      font-family: var(--font-body, "Nunito", sans-serif);
      text-decoration: none;
      transition: color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  background-color var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .ts-footer-link:hover {
      background: var(--surface-hover);
      color: var(--text);
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
      color: var(--text-muted);
      font-size: 12px;
      font-family: var(--font-body, "Nunito", sans-serif);
      font-weight: 600;
      cursor: pointer;
      transition: background-color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  color var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .ts-footer-collapse-btn:hover {
      background: var(--surface-hover);
      color: var(--text);
    }

    .ts-footer-collapse-btn:focus-visible {
      outline: 2px solid var(--ts-focus-ring) !important;
      outline-offset: 1px;
    }

    .ts-rail-footer-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      margin: 0 auto;
      border-radius: 8px;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text-muted);
      cursor: pointer;
      text-decoration: none;
      transition: background-color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  color var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .ts-rail-footer-btn:hover {
      background: var(--surface-hover);
      color: var(--text);
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
      background: var(--shell-card);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      box-shadow: var(--ts-shadow-drawer);
      animation: tsSlideIn 200ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    .ts-sheet-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      height: 56px;
      border-bottom: 1px solid var(--border);
    }

    .ts-brand-link {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: var(--text);
    }

    .ts-brand-icon-box {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: var(--accent-soft);
      border: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text);
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

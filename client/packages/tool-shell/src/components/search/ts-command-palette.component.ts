// packages/tool-shell/src/components/search/ts-command-palette.component.ts
import { Component, input, output, signal, computed, HostListener, AfterViewInit, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolRegistryItem } from '@acklet/tool-registry';
import { getToolUrl, getToolsHubUrl, getPortalUrl } from '@acklet/shared';
import { ToolThemeService } from '../../services/tool-theme.service';
import { ToolSidebarService } from '../../services/tool-sidebar.service';
import { TsIconComponent } from '../icon/ts-icon.component';

export interface CommandAction {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  category: 'Actions' | 'Navigation';
  perform: () => void;
}

@Component({
  selector: 'ts-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  template: `
    @if (isOpen()) {
      <div 
        class="ts-cmd-backdrop" 
        (click)="close.emit()" 
        role="dialog" 
        aria-modal="true" 
        aria-label="Command Palette"
      >
        <div class="ts-cmd-panel" (click)="$event.stopPropagation()">
          <div class="ts-cmd-input-row">
            <ts-icon name="search" [size]="16" class="ts-cmd-search-icon" />
            <input
              #searchInput
              type="text"
              class="ts-cmd-input"
              placeholder="Search tools, utilities and actions..."
              [(ngModel)]="searchQuery"
              (keydown)="onKeydown($event)"
              aria-label="Search tools and actions"
            />
            <kbd class="ts-esc-pill">ESC</kbd>
          </div>

          <div class="ts-cmd-results-list" role="listbox">
            @if (filteredItems().length === 0) {
              <div class="ts-cmd-empty">
                <span>No tools or actions found for "{{ searchQuery }}"</span>
              </div>
            } @else {
              @for (item of filteredItems(); track item.id; let idx = $index) {
                <div 
                  class="ts-cmd-item"
                  role="option"
                  [attr.aria-selected]="idx === selectedIndex()"
                  [class.selected]="idx === selectedIndex()"
                  (mouseenter)="selectedIndex.set(idx)"
                  (click)="executeItem(item)"
                >
                  <div class="ts-cmd-item-icon">
                    <ts-icon [name]="item.icon" [size]="16" />
                  </div>
                  <div class="ts-cmd-item-info">
                    <span class="ts-cmd-item-title">{{ item.title }}</span>
                    <span class="ts-cmd-item-desc">{{ item.subtitle }}</span>
                  </div>
                  <span class="ts-cmd-cat-badge">{{ item.category }}</span>
                </div>
              }
            }
          </div>

          <div class="ts-cmd-footer">
            <div class="ts-cmd-shortcuts">
              <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
              <span><kbd>↵</kbd> Select</span>
              <span><kbd>ESC</kbd> Close</span>
            </div>
            <span class="ts-cmd-results-count">{{ filteredItems().length }} results</span>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .ts-cmd-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 15vh;
      animation: var(--ts-transition-opacity);
    }
    .ts-cmd-panel {
      width: 100%;
      max-width: 580px;
      background: var(--ts-surface);
      border: 1px solid var(--ts-border);
      border-radius: var(--ts-radius-lg, 16px);
      box-shadow: var(--ts-shadow-lg);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: tsFadeInUp var(--ts-dur-base) var(--ts-ease) both;
    }
    .ts-cmd-input-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--ts-border);
    }
    .ts-cmd-search-icon {
      color: var(--ts-text-subtle);
    }
    .ts-cmd-input {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--ts-text);
      font-size: var(--ts-text-md, 16px);
      outline: none;
      font-family: inherit;
    }
    .ts-cmd-input::placeholder {
      color: var(--ts-text-subtle);
    }
    .ts-esc-pill {
      font-family: var(--ts-font-mono);
      font-size: 11px;
      padding: 2px 6px;
      border-radius: var(--ts-radius-sm, 6px);
      background: var(--ts-raised);
      border: 1px solid var(--ts-border);
      color: var(--ts-text-subtle);
    }
    .ts-cmd-results-list {
      max-height: 340px;
      overflow-y: auto;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .ts-cmd-empty {
      padding: 2rem;
      text-align: center;
      color: var(--ts-text-subtle);
      font-size: var(--ts-text-sm, 13px);
    }
    .ts-cmd-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: var(--ts-radius-sm, 8px);
      text-decoration: none;
      color: var(--ts-text-muted);
      cursor: pointer;
      transition: var(--ts-transition-colors);
      user-select: none;
    }
    .ts-cmd-item:hover,
    .ts-cmd-item.selected {
      background: var(--ts-raised);
      color: var(--ts-text);
    }
    .ts-cmd-item-icon {
      width: 28px;
      height: 28px;
      border-radius: var(--ts-radius-sm, 8px);
      background: var(--ts-raised);
      border: 1px solid var(--ts-border);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--ts-text);
    }
    .ts-cmd-item-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .ts-cmd-item-title {
      font-size: var(--ts-text-sm, 13px);
      font-weight: 500;
      color: var(--ts-text);
    }
    .ts-cmd-item-desc {
      font-size: var(--ts-text-xs, 12px);
      color: var(--ts-text-subtle);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ts-cmd-cat-badge {
      font-size: 11px;
      padding: 2px 6px;
      border-radius: var(--ts-radius-sm, 6px);
      background: var(--ts-raised);
      color: var(--ts-text-subtle);
      border: 1px solid var(--ts-border);
    }
    .ts-cmd-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      border-top: 1px solid var(--ts-border);
      font-size: 11px;
      color: var(--ts-text-subtle);
    }
    .ts-cmd-shortcuts {
      display: flex;
      gap: 12px;
    }
    .ts-cmd-shortcuts kbd {
      font-family: var(--ts-font-mono);
      font-size: 10px;
      padding: 1px 4px;
      border-radius: 4px;
      background: var(--ts-raised);
      border: 1px solid var(--ts-border);
    }
  `]
})
export class TsCommandPaletteComponent implements AfterViewInit {
  readonly isOpen = input.required<boolean>();
  readonly tools = input.required<ToolRegistryItem[]>();
  readonly close = output<void>();

  private readonly themeService = inject(ToolThemeService);
  private readonly sidebarService = inject(ToolSidebarService);

  searchQuery = '';
  readonly selectedIndex = signal<number>(0);

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  readonly actions: CommandAction[] = [
    {
      id: 'action-theme-toggle',
      title: 'Toggle Theme',
      subtitle: 'Switch between light and dark mode',
      icon: 'sun',
      category: 'Actions',
      perform: () => this.themeService.toggleTheme()
    },
    {
      id: 'action-sidebar-toggle',
      title: 'Toggle Sidebar',
      subtitle: 'Expand or collapse the tool directory sidebar',
      icon: 'panel-right-open',
      category: 'Actions',
      perform: () => this.sidebarService.toggleCollapse()
    },
    {
      id: 'nav-tools-home',
      title: 'Go to Tools Hub',
      subtitle: 'Browse all available utilities and plugins',
      icon: 'search',
      category: 'Navigation',
      perform: () => { window.location.href = getToolsHubUrl(); }
    },
    {
      id: 'nav-portal-home',
      title: 'Back to Acklet Portal',
      subtitle: 'Open the main Acklet portal in a new tab',
      icon: 'external-link',
      category: 'Navigation',
      perform: () => { window.open(getPortalUrl(), '_blank', 'noopener,noreferrer'); }
    }
  ];

  readonly liveTools = computed(() => this.tools().filter(t => t.status === 'live' || t.status === 'beta'));

  readonly filteredItems = computed(() => {
    const q = this.searchQuery.toLowerCase().trim();
    const toolItems = this.liveTools().map(tool => ({
      id: `tool-${tool.slug}`,
      title: tool.name,
      subtitle: tool.shortDescription,
      icon: tool.icon || 'file',
      category: tool.category,
      perform: () => { window.location.href = getToolUrl(tool.slug); }
    }));

    const all = [...toolItems, ...this.actions];
    if (!q) return all;

    return all.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  ngAfterViewInit(): void {
    if (this.isOpen()) {
      setTimeout(() => this.searchInput?.nativeElement.focus(), 50);
    }
  }

  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) {
      this.close.emit();
    }
  }

  onKeydown(event: KeyboardEvent): void {
    const list = this.filteredItems();
    if (!list.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex.update(i => (i + 1) % list.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex.update(i => (i - 1 + list.length) % list.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const selected = list[this.selectedIndex()];
      if (selected) {
        this.executeItem(selected);
      }
    }
  }

  executeItem(item: { perform: () => void }): void {
    this.close.emit();
    item.perform();
  }
}

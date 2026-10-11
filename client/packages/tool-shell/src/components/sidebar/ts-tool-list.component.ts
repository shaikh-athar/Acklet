// packages/tool-shell/src/components/sidebar/ts-tool-list.component.ts
import { Component, input, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolRegistryItem } from '@acklet/tool-registry';
import { getToolUrl, getToolsHubUrl } from '@acklet/shared';
import { TsIconComponent } from '../icon/ts-icon.component';
import { TsToolTileComponent } from '../primitive/ts-tool-tile.component';
import { TsTooltipDirective } from '../primitive/ts-tooltip.directive';

@Component({
  selector: 'ts-tool-list',
  standalone: true,
  imports: [CommonModule, TsIconComponent, TsToolTileComponent, TsTooltipDirective],
  template: `
    <div class="ts-tool-list-container" [class.is-rail]="isRail()">
      
      @if (searchQuery().trim()) {
        <!-- Search Results Flat View -->
        <div class="ts-search-results-section">
          <div class="ts-search-results-header">
            <span>{{ filteredTools().length }} tools found</span>
          </div>
          <div class="ts-tools-group-items">
            @for (tool of filteredTools(); track tool.slug) {
              <a 
                [href]="getToolUrl(tool.slug)" 
                class="ts-tool-item" 
                [class.active]="tool.slug === currentSlug()"
                [tsTooltip]="isRail() ? tool.name : ''"
                tooltipPosition="right"
                [attr.aria-label]="tool.name"
              >
                <ts-tool-tile [icon]="tool.icon" [name]="tool.name" [size]="24" />
                @if (!isRail()) {
                  <span class="ts-tool-name">{{ tool.name }}</span>
                  @if (tool.slug === currentSlug()) {
                    <span class="ts-active-dot" aria-hidden="true"></span>
                  }
                }
              </a>
            }
          </div>
        </div>
      } @else {
        <!-- Collapsible Category Groups View (Utilities, Developer, Security...) -->
        @for (group of groupedCategories(); track group.category; let gIdx = $index) {
          <div class="ts-tool-group">
            @if (!isRail()) {
              <button 
                type="button" 
                class="ts-group-header-btn"
                (click)="toggleCategory(group.category)"
                [attr.aria-expanded]="isCategoryOpen(group.category)"
              >
                <div class="ts-group-header-left">
                  <ts-icon 
                    [name]="isCategoryOpen(group.category) ? 'chevron-down' : 'chevron-right'" 
                    [size]="14" 
                    class="ts-chevron-icon"
                  />
                  <span class="ts-group-title">{{ group.category }}</span>
                </div>
                <span class="ts-group-count">{{ group.tools.length }}</span>
              </button>
            }
            
            @if (isRail() || isCategoryOpen(group.category)) {
              <div class="ts-tools-group-items">
                @for (tool of group.tools; track tool.slug) {
                  <a 
                    [href]="getToolUrl(tool.slug)" 
                    class="ts-tool-item" 
                    [class.active]="tool.slug === currentSlug()"
                    [tsTooltip]="isRail() ? tool.name : ''"
                    tooltipPosition="right"
                    [attr.aria-label]="tool.name"
                  >
                    <ts-tool-tile [icon]="tool.icon" [name]="tool.name" [size]="24" />
                    @if (!isRail()) {
                      <span class="ts-tool-name">{{ tool.name }}</span>
                      @if (tool.slug === currentSlug()) {
                        <span class="ts-active-dot" aria-hidden="true"></span>
                      }
                    }
                  </a>
                }
              </div>
            }

            @if (isRail() && gIdx < groupedCategories().length - 1) {
              <div class="ts-rail-separator" role="separator"></div>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .ts-tool-list-container {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 0;
    }

    .ts-tool-group {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .ts-rail-separator {
      height: 1px;
      background: var(--border, rgba(0, 0, 0, 0.08));
      margin: 6px auto;
      width: 28px;
    }

    :host-context([data-theme="dark"]) .ts-rail-separator {
      background: var(--border, rgba(255, 255, 255, 0.08));
    }

    .ts-group-header-btn {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      height: 32px;
      padding: 0 10px;
      background: transparent;
      border: 1px solid transparent;
      outline: none;
      color: var(--text-muted, #71717A);
      cursor: pointer;
      border-radius: 10px;
      user-select: none;
      transition: background-color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  color var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .ts-group-header-btn:hover {
      background: var(--surface-hover, #F4F4F5);
      color: var(--text, #18181B);
    }

    :host-context([data-theme="dark"]) .ts-group-header-btn:hover {
      background: var(--surface-hover, #1E1E22);
      color: var(--text, #FCFCFC);
    }

    .ts-group-header-btn:focus-visible {
      outline: 2px solid var(--ts-focus-ring, #18181B) !important;
      outline-offset: 1px;
    }

    .ts-group-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .ts-group-title {
      font-family: var(--font-body, "Nunito", sans-serif);
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #18181B);
    }

    :host-context([data-theme="dark"]) .ts-group-title {
      color: var(--text, #FCFCFC);
    }

    .ts-group-count {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted, #71717A);
      background: var(--surface-hover, #F4F4F5);
      border: 1px solid var(--border, rgba(0, 0, 0, 0.08));
      padding: 1px 7px;
      border-radius: 9999px;
    }

    :host-context([data-theme="dark"]) .ts-group-count {
      background: #1E1E22;
      border-color: rgba(255, 255, 255, 0.08);
      color: #A1A1AA;
    }

    .ts-chevron-icon {
      color: var(--text-muted, #71717A);
      transition: transform var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .ts-tools-group-items {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .ts-tool-item {
      display: flex;
      align-items: center;
      gap: 10px;
      height: 38px;
      padding: 0 10px;
      border-radius: 10px;
      text-decoration: none;
      color: var(--text-muted, #71717A);
      background: transparent;
      border: 1px solid transparent;
      outline: none;
      position: relative;
      transition: background-color 220ms ease-out,
                  color 220ms ease-out,
                  transform 150ms ease-out;
    }

    .ts-tool-item:hover {
      background: var(--surface-hover, #F4F4F5);
      color: var(--text, #18181B);
    }

    :host-context([data-theme="dark"]) .ts-tool-item:hover {
      background: var(--surface-hover, #1E1E22);
      color: var(--text, #FCFCFC);
    }

    .ts-tool-item:active {
      transform: scale(0.98);
    }

    .ts-tool-item.active {
      background: var(--surface-hover, #F4F4F5);
      color: var(--text, #18181B);
      font-weight: 700;
      border-color: transparent;
    }

    :host-context([data-theme="dark"]) .ts-tool-item.active {
      background: var(--surface-hover, #1E1E22);
      color: var(--text, #FCFCFC);
    }

    .ts-tool-item:focus:not(:focus-visible) {
      outline: none;
    }

    .ts-tool-item:focus-visible {
      outline: 2px solid var(--ts-focus-ring, #18181B) !important;
      outline-offset: 2px;
    }

    .ts-tool-name {
      font-family: var(--font-body, "Nunito", sans-serif);
      font-size: 13.5px;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ts-active-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--text, #18181B);
      flex-shrink: 0;
    }

    :host-context([data-theme="dark"]) .ts-active-dot {
      background: #FCFCFC;
    }

    .ts-tool-list-container.is-rail .ts-tool-item {
      justify-content: center;
      padding: 0;
      width: 38px;
      height: 38px;
      margin: 0 auto;
    }

    .ts-search-results-section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .ts-search-results-header {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text-muted, #71717A);
      padding: 4px 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
  `]
})
export class TsToolListComponent implements OnInit {
  readonly tools = input<ToolRegistryItem[]>([]);
  readonly currentSlug = input<string>('');
  readonly isRail = input<boolean>(false);
  readonly searchQuery = input<string>('');

  readonly getToolUrl = getToolUrl;
  readonly hubUrl = getToolsHubUrl();

  // Collapsed categories state (current category open by default)
  readonly collapsedCategories = signal<Set<string>>(new Set());

  ngOnInit(): void {
    // Keep current tool's category open by default, collapse others if desired or keep standard
    const currentTool = this.tools().find(t => t.slug === this.currentSlug());
    const currentCat = currentTool?.category || 'Utilities';

    // Start with all open by default as standard, or ensure current category is definitely open
    this.collapsedCategories.update(set => {
      const next = new Set(set);
      next.delete(currentCat);
      return next;
    });
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
    const order = ['Utilities', 'Developer', 'Security', 'Media', 'Calculators', 'AI'];
    
    const map = new Map<string, ToolRegistryItem[]>();
    for (const tool of tools) {
      const cat = tool.category || 'Utilities';
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat)!.push(tool);
    }

    const categories: { category: string; tools: ToolRegistryItem[] }[] = [];
    for (const cat of order) {
      if (map.has(cat) && map.get(cat)!.length > 0) {
        categories.push({ category: cat, tools: map.get(cat)! });
        map.delete(cat);
      }
    }

    for (const [cat, items] of map.entries()) {
      if (items.length > 0) {
        categories.push({ category: cat, tools: items });
      }
    }

    return categories;
  });
}

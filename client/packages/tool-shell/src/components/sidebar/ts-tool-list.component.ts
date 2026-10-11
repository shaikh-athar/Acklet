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
                    name="chevron-right" 
                    [size]="14" 
                    class="ts-chevron-icon"
                    [class.is-expanded]="isCategoryOpen(group.category)"
                  />
                  <ts-icon [name]="categoryIcon(group.category)" [size]="14" class="ts-cat-icon text-muted" />
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
      margin: 8px auto;
      width: 28px;
      flex-shrink: 0;
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
      transition: transform 200ms var(--ts-ease-out, cubic-bezier(0.22, 1, 0.36, 1));
    }

    .ts-chevron-icon.is-expanded {
      transform: rotate(90deg);
    }

    .ts-tools-group-items {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    /* Staggered entrance for items on first open / render (20ms step) */
    @keyframes tsSidebarItemIn {
      from {
        opacity: 0;
        transform: translateX(-4px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .ts-tools-group-items .ts-tool-item {
      animation: tsSidebarItemIn var(--ts-dur-panel, 280ms) var(--ts-ease-out) forwards;
    }

    .ts-tools-group-items .ts-tool-item:nth-child(1) { animation-delay: 0ms; }
    .ts-tools-group-items .ts-tool-item:nth-child(2) { animation-delay: 20ms; }
    .ts-tools-group-items .ts-tool-item:nth-child(3) { animation-delay: 40ms; }
    .ts-tools-group-items .ts-tool-item:nth-child(4) { animation-delay: 60ms; }
    .ts-tools-group-items .ts-tool-item:nth-child(5) { animation-delay: 80ms; }
    .ts-tools-group-items .ts-tool-item:nth-child(6) { animation-delay: 100ms; }
    .ts-tools-group-items .ts-tool-item:nth-child(7) { animation-delay: 120ms; }
    .ts-tools-group-items .ts-tool-item:nth-child(8) { animation-delay: 140ms; }
    .ts-tools-group-items .ts-tool-item:nth-child(n+9) { animation-delay: 160ms; }

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
      transition: background-color var(--ts-dur-hover, 220ms) var(--ts-ease-out),
                  color var(--ts-dur-hover, 220ms) var(--ts-ease-out),
                  transform var(--ts-dur-press, 150ms) var(--ts-ease);
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
      background: var(--accent-soft);
      color: var(--text);
      font-weight: 700;
      border-color: transparent;
    }

    .ts-tool-item:focus:not(:focus-visible) {
      outline: none;
    }

    .ts-tool-item:focus-visible {
      outline: 2px solid var(--accent-strong) !important;
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
      background: var(--accent);
      flex-shrink: 0;
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
    const order = ['Utilities', 'Developer', 'Formatters', 'Security', 'Media', 'Calculators', 'AI'];
    
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

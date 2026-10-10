import { Component, input, output, computed, signal, HostListener, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolRegistryItem, getAllTools } from '@acklet/tool-registry';
import { getToolUrl, getToolsHubUrl } from '@acklet/shared';

@Component({
  selector: 'lib-explore-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen()) {
      <div 
        class="explore-drawer-backdrop" 
        (click)="onBackdropClick()"
        aria-modal="true" 
        role="dialog" 
        aria-label="Explore All Tools"
      >
        <div class="explore-drawer-panel" (click)="$event.stopPropagation()">
          
          <!-- Header -->
          <div class="explore-drawer-header">
            <div class="header-left">
              <h2 class="drawer-title">Explore All Tools</h2>
              <span class="tool-count-badge">{{ allToolsList().length }}</span>
            </div>
            <button 
              type="button" 
              class="btn-close-drawer" 
              (click)="close.emit()" 
              aria-label="Close explore drawer"
            >
              ✕
            </button>
          </div>

          <!-- Search Box -->
          <div class="explore-search-wrap">
            <input
              #searchInput
              type="text"
              class="explore-search-input"
              placeholder="Search tools by name, category, feature..."
              [(ngModel)]="searchQuery"
              aria-label="Search tools"
            />
          </div>

          <!-- Categorized Tool List -->
          <div class="explore-drawer-body">
            @if (filteredGroupedCategories().length === 0) {
              <div class="no-results-state">
                <p>No matching tools found for "{{ searchQuery }}"</p>
              </div>
            } @else {
              @for (group of filteredGroupedCategories(); track group.category) {
                <div class="category-group-section">
                  <h3 class="category-group-title">{{ group.category }}</h3>
                  <div class="category-tools-grid">
                    @for (tool of group.tools; track tool.slug) {
                      <a 
                        [href]="getToolUrl(tool)" 
                        class="explore-tool-card" 
                        [class.current]="tool.slug === currentSlug()"
                        (click)="close.emit()"
                      >
                        <div class="explore-card-top">
                          <span class="tool-name">{{ tool.name }}</span>
                          @if (tool.slug === currentSlug()) {
                            <span class="current-badge">Current</span>
                          }
                        </div>
                        <p class="tool-desc">{{ tool.shortDescription }}</p>
                      </a>
                    }
                  </div>
                </div>
              }
            }
          </div>

          <!-- Drawer Footer with link to Hub -->
          <div class="explore-drawer-footer">
            <a [href]="toolsHubUrl" class="btn-all-tools-hub">
              <span>View all tools on Hub →</span>
            </a>
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    .explore-drawer-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(4px);
      z-index: 99999;
      display: flex;
      justify-content: flex-end;
      animation: fadeIn 0.2s ease-out;
    }

    .explore-drawer-panel {
      width: 100%;
      max-width: 440px;
      height: 100%;
      background: var(--tool-bg-surface, #111726);
      border-left: 1px solid var(--tool-border, rgba(255, 255, 255, 0.1));
      box-shadow: var(--tool-shadow-drawer, -15px 0 40px rgba(0,0,0,0.5));
      display: flex;
      flex-direction: column;
      animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .explore-drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--tool-border, rgba(255, 255, 255, 0.08));
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .drawer-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--tool-text-primary, #f8fafc);
      margin: 0;
    }

    .tool-count-badge {
      font-size: 0.75rem;
      font-weight: 600;
      background: var(--tool-brand-subtle, rgba(16, 185, 129, 0.15));
      color: var(--tool-brand-accent, #10b981);
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
    }

    .btn-close-drawer {
      background: none;
      border: none;
      color: var(--tool-text-muted, #94a3b8);
      font-size: 1.25rem;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: var(--tool-radius-sm, 6px);
      transition: all 0.15s ease;
    }

    .btn-close-drawer:hover {
      color: var(--tool-text-primary, #f8fafc);
      background: var(--tool-bg-hover, rgba(255, 255, 255, 0.06));
    }

    .explore-search-wrap {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--tool-border, rgba(255, 255, 255, 0.06));
    }

    .explore-search-input {
      width: 100%;
      padding: 0.65rem 1rem;
      font-size: 0.875rem;
      background: var(--tool-bg-subtle, rgba(255, 255, 255, 0.03));
      border: 1px solid var(--tool-border, rgba(255, 255, 255, 0.1));
      border-radius: var(--tool-radius-md, 10px);
      color: var(--tool-text-primary, #f8fafc);
      outline: none;
      transition: border-color 0.2s ease;
    }

    .explore-search-input:focus {
      border-color: var(--tool-border-focus, #10b981);
    }

    .explore-drawer-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .category-group-title {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--tool-text-muted, #64748b);
      margin: 0 0 0.75rem 0;
    }

    .category-tools-grid {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
    }

    .explore-tool-card {
      display: block;
      padding: 0.875rem 1rem;
      background: var(--tool-bg-subtle, rgba(255, 255, 255, 0.03));
      border: 1px solid var(--tool-border, rgba(255, 255, 255, 0.08));
      border-radius: var(--tool-radius-md, 10px);
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .explore-tool-card:hover {
      background: var(--tool-bg-hover, rgba(255, 255, 255, 0.06));
      border-color: var(--tool-border-focus, #10b981);
      transform: translateX(-2px);
    }

    .explore-tool-card.current {
      border-color: var(--tool-brand-accent, #10b981);
      background: var(--tool-brand-subtle, rgba(16, 185, 129, 0.08));
    }

    .explore-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.25rem;
    }

    .tool-name {
      font-size: 0.925rem;
      font-weight: 600;
      color: var(--tool-text-primary, #f8fafc);
    }

    .current-badge {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--tool-brand-accent, #10b981);
      background: var(--tool-brand-subtle, rgba(16, 185, 129, 0.2));
      padding: 0.1rem 0.4rem;
      border-radius: var(--tool-radius-sm, 6px);
    }

    .tool-desc {
      font-size: 0.8125rem;
      color: var(--tool-text-secondary, #94a3b8);
      margin: 0;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .no-results-state {
      padding: 3rem 1rem;
      text-align: center;
      color: var(--tool-text-muted, #64748b);
      font-size: 0.875rem;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .explore-drawer-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--tool-border, rgba(255, 255, 255, 0.08));
      background: var(--tool-bg-surface, #111726);
      display: flex;
      justify-content: center;
    }
    .btn-all-tools-hub {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 0.625rem 1rem;
      border-radius: var(--tool-radius-md, 8px);
      background: var(--tool-brand-subtle, rgba(16, 185, 129, 0.12));
      border: 1px solid var(--tool-border, rgba(16, 185, 129, 0.3));
      color: var(--tool-brand-accent, #10b981);
      font-size: 0.875rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .btn-all-tools-hub:hover {
      background: var(--tool-brand-accent, #10b981);
      color: #ffffff;
    }

    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
  `]
})
export class ExploreDrawerComponent implements AfterViewInit {
  readonly isOpen = input.required<boolean>();
  readonly currentSlug = input.required<string>();
  readonly close = output<void>();
  readonly toolsHubUrl = getToolsHubUrl();

  searchQuery = '';
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  readonly allToolsList = computed(() => getAllTools());

  readonly filteredGroupedCategories = computed(() => {
    const q = this.searchQuery.toLowerCase().trim();
    const tools = this.allToolsList().filter(t => 
      !q || 
      t.name.toLowerCase().includes(q) || 
      t.category.toLowerCase().includes(q) || 
      t.shortDescription.toLowerCase().includes(q)
    );

    const map = new Map<string, ToolRegistryItem[]>();
    for (const tool of tools) {
      const cat = tool.category || 'General';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(tool);
    }

    return Array.from(map.entries()).map(([category, list]) => ({
      category,
      tools: list
    }));
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

  onBackdropClick(): void {
    this.close.emit();
  }

  getToolUrl(tool: ToolRegistryItem): string {
    return getToolUrl(tool.subdomain || tool.slug);
  }
}

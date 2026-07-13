// client/src/app/pages/tools/tools.ts
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolsService } from '../../core/services/tools.service';
import { ToolCardComponent } from '../../shared/components/tool-card/tool-card';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton/loading-skeleton';
import { IconComponent } from '../../shared/components/icon/icon';
import { Tool } from '../../core/models/tool.model';

@Component({
  selector: 'app-tools',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolCardComponent, SectionHeaderComponent, LoadingSkeletonComponent, IconComponent],
  template: `
    <div class="tools-page page-enter">
      <!-- Page header -->
      <div class="tools-hero gradient-mesh">
        <div class="orb orb-brand" style="width:400px;height:400px;top:-200px;left:-100px"></div>
        <div class="container-main tools-hero-inner">
          <app-section-header eyebrow="Catalog" title="All Solutions" subtitle="The complete catalog of Acklet solutions — organized by category, searchable by intent." />
          
          <!-- Search -->
          <div class="tools-search-wrap">
            <app-icon name="search" class="size-4.5 text-neutral-400" />
            <input class="tools-search" type="text" placeholder="Search tools by name, category, or tag..." [(ngModel)]="searchQuery" (ngModelChange)="applyFilters()" />
            @if (searchQuery) { 
              <button class="clear-btn" (click)="clearSearch()">
                <app-icon name="x" class="size-3.5" />
              </button> 
            }
          </div>
        </div>
      </div>

      <div class="container-main tools-body">
        <!-- Sidebar -->
        <aside class="tools-sidebar">
          <div class="sidebar-section">
            <h3 class="sidebar-heading">Categories</h3>
            <div class="cat-filters">
              <button class="cat-filter-btn" [class.active]="!activeCategoryId()" (click)="setCategory(null)">
                <span class="flex items-center gap-2">
                  <app-icon name="wrench" class="size-4" />
                  All Categories
                </span>
                <span class="filter-count">{{ toolsSvc.tools().length }}</span>
              </button>
              @for (cat of toolsSvc.categories(); track cat.id) {
                <button class="cat-filter-btn" [class.active]="activeCategoryId() === cat.id" (click)="setCategory(cat.id)">
                  <span class="flex items-center gap-2">
                    <app-icon [name]="cat.icon" class="size-4" />
                    {{ cat.name }}
                  </span>
                  <span class="filter-count">{{ toolsSvc.getToolsByCategory(cat.id).length }}</span>
                </button>
              }
            </div>
          </div>

          <div class="sidebar-divider"></div>

          <div class="sidebar-section">
            <h3 class="sidebar-heading">Filter by Tag</h3>
            <div class="tag-filters">
              @for (f of quickFilters; track f.key) {
                <button class="tag-filter" [class.active]="activeQuickFilter() === f.key" (click)="setQuickFilter(f.key)">
                  {{ f.label }}
                </button>
              }
            </div>
          </div>
        </aside>

        <!-- Main content -->
        <main class="tools-main">
          <!-- Results bar -->
          <div class="results-bar">
            <span class="results-count">{{ filteredTools().length }} tools matching</span>
            <div class="sort-row">
              <select class="sort-select" [(ngModel)]="sortBy" (ngModelChange)="applyFilters()">
                <option value="popular">Most Popular</option>
                <option value="rating">Highest Rated</option>
                <option value="newest">Newest First</option>
                <option value="name">Alphabetical (A–Z)</option>
              </select>
            </div>
          </div>

          @if (isLoading()) {
            <app-loading-skeleton [count]="6" [cols]="3" />
          } @else if (filteredTools().length === 0) {
            <div class="empty-state glass">
              <div class="empty-icon-wrap">
                <app-icon name="search" class="size-8 text-neutral-500" />
              </div>
              <h3 class="empty-title">No tools found</h3>
              <p class="empty-desc">No utility matches your current selection parameters.</p>
              <button class="btn btn-secondary" (click)="clearAll()">Reset all filters</button>
            </div>
          } @else {
            <div class="tools-grid-main">
              @for (tool of paginatedTools(); track tool.id) {
                <app-tool-card [tool]="tool" />
              }
            </div>
            <!-- Pagination -->
            @if (totalPages() > 1) {
              <div class="pagination">
                <button class="page-btn" [disabled]="currentPage() === 1" (click)="prevPage()">
                  <app-icon name="arrow-left" class="size-3.5" />
                </button>
                @for (p of pageNumbers(); track p) {
                  <button class="page-btn" [class.active]="p === currentPage()" (click)="goToPage(p)">{{ p }}</button>
                }
                <button class="page-btn" [disabled]="currentPage() === totalPages()" (click)="nextPage()">
                  <app-icon name="arrow-right" class="size-3.5" />
                </button>
              </div>
            }
          }
        </main>
      </div>
    </div>
  `,
  styles: [`
    .tools-page { min-height: 100vh; }
    .tools-hero { padding: 11rem 0 3.5rem; position: relative; overflow: hidden; border-bottom: 1px solid rgba(255,255,255,0.04); }
    .tools-hero-inner { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 1.5rem; }
    .tools-search-wrap { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1.125rem; border-radius: var(--radius-xl); background: var(--color-surface-900); border: 1px solid rgba(255,255,255,0.06); max-width: 540px; box-shadow: var(--shadow-card); }
    .tools-search-wrap:focus-within { border-color: rgba(99,102,241,0.4); }
    .tools-search { flex: 1; background: none; border: none; outline: none; font-size: 0.875rem; color: var(--color-neutral-100); font-family: inherit; }
    .tools-search::placeholder { color: var(--color-neutral-600); }
    .clear-btn { background: none; border: none; color: var(--color-neutral-400); cursor: pointer; display: flex; align-items: center; justify-content: center; }

    .tools-body { display: grid; grid-template-columns: 240px 1fr; gap: 2.5rem; padding-top: 3.5rem; padding-bottom: 5rem; align-items: start; }

    /* Sidebar */
    .tools-sidebar { position: sticky; top: 84px; }
    .sidebar-section { display: flex; flex-direction: column; gap: 0.75rem; }
    .sidebar-heading { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-neutral-500); margin-bottom: 0.25rem; }
    .cat-filters { display: flex; flex-direction: column; gap: 0.35rem; }
    .cat-filter-btn { display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 0.5rem; padding: 0.5rem 0.75rem; border-radius: var(--radius-md); border: 1px solid transparent; background: none; color: var(--color-neutral-400); font-size: 0.8rem; font-family: inherit; cursor: pointer; text-align: left; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
    .cat-filter-btn:hover { color: var(--color-neutral-100); background: rgba(255,255,255,0.04); }
    .cat-filter-btn.active { color: #818cf8; background: rgba(99,102,241,0.08); border-color: rgba(99,102,241,0.15); font-weight: 600; }
    .filter-count { background: rgba(255,255,255,0.03); border-radius: 999px; padding: 0.1rem 0.45rem; font-size: 0.65rem; color: var(--color-neutral-500); border: 1px solid rgba(255,255,255,0.05); }
    .sidebar-divider { height: 1px; background: rgba(255,255,255,0.05); margin: 1.25rem 0; }
    .tag-filters { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .tag-filter { padding: 0.25rem 0.75rem; border-radius: 999px; border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); color: var(--color-neutral-400); font-size: 0.72rem; cursor: pointer; font-family: inherit; transition: all 0.2s; }
    .tag-filter:hover { color: var(--color-neutral-100); border-color: rgba(255,255,255,0.15); }
    .tag-filter.active { color: #818cf8; border-color: rgba(99,102,241,0.3); background: rgba(99,102,241,0.08); }

    /* Main */
    .results-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
    .results-count { font-size: 0.8rem; color: var(--color-neutral-400); }
    .sort-select { background: var(--color-surface-900); border: 1px solid rgba(255,255,255,0.06); border-radius: var(--radius-md); color: var(--color-neutral-300); font-size: 0.8rem; padding: 0.4rem 0.75rem; cursor: pointer; font-family: inherit; outline: none; }
    .sort-select:focus { border-color: rgba(99,102,241,0.3); }
    .tools-grid-main { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; }

    /* Empty state */
    .empty-state { text-align: center; padding: 5rem 2rem; display: flex; flex-direction: column; align-items: center; gap: 1rem; border-radius: var(--radius-xl); }
    .empty-icon-wrap { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); }
    .empty-title { font-size: 1.1rem; font-weight: 600; color: var(--color-neutral-100); }
    .empty-desc { color: var(--color-neutral-400); font-size: 0.825rem; max-width: 250px; line-height: 1.5; }

    /* Pagination */
    .pagination { display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 3.5rem; }
    .page-btn { padding: 0.5rem 0.875rem; border-radius: var(--radius-md); border: 1px solid rgba(255,255,255,0.06); background: var(--color-surface-900); color: var(--color-neutral-400); font-size: 0.8rem; cursor: pointer; font-family: inherit; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; }
    .page-btn:hover:not(:disabled) { border-color: rgba(99,102,241,0.3); color: #818cf8; }
    .page-btn.active { background: rgba(99,102,241,0.08); border-color: rgba(99,102,241,0.3); color: #818cf8; font-weight: 600; }
    .page-btn:disabled { opacity: 0.35; cursor: default; }

    @media (max-width: 900px) {
      .tools-body { grid-template-columns: 1fr; }
      .tools-sidebar { position: static; }
      .tools-grid-main { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 540px) { .tools-grid-main { grid-template-columns: 1fr; } }
  `],
})
export class ToolsComponent implements OnInit {
  readonly toolsSvc = inject(ToolsService);
  private readonly route = inject(ActivatedRoute);

  searchQuery = '';
  sortBy = 'popular';
  readonly activeCategoryId = signal<string | null>(null);
  readonly activeQuickFilter = signal<string | null>(null);
  readonly isLoading = signal(true);
  readonly currentPage = signal(1);
  readonly pageSize = 9;

  readonly filteredTools = signal<Tool[]>([]);

  readonly quickFilters = [
    { key: 'featured', label: 'Featured' },
    { key: 'trending', label: 'Trending' },
    { key: 'new', label: 'New' },
    { key: 'popular', label: 'Popular' },
  ];

  readonly totalPages = computed(() => Math.ceil(this.filteredTools().length / this.pageSize));
  readonly paginatedTools = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredTools().slice(start, start + this.pageSize);
  });
  readonly pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  ngOnInit(): void {
    this.isLoading.set(false);
    this.route.queryParams.subscribe(params => {
      if (params['category']) {
        const cat = this.toolsSvc.getCategoryBySlug(params['category']);
        if (cat) this.activeCategoryId.set(cat.id);
      }
      if (params['filter']) this.activeQuickFilter.set(params['filter']);
      this.applyFilters();
    });
    this.applyFilters();
  }

  applyFilters(): void {
    let tools = this.toolsSvc.tools();
    if (this.activeCategoryId()) tools = tools.filter(t => t.categoryId === this.activeCategoryId());
    const qf = this.activeQuickFilter();
    if (qf === 'featured') tools = tools.filter(t => t.isFeatured);
    else if (qf === 'trending') tools = tools.filter(t => t.isTrending);
    else if (qf === 'new') tools = tools.filter(t => t.isNew);
    else if (qf === 'popular') tools = tools.filter(t => t.isPopular);
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      tools = tools.filter(t => t.name.toLowerCase().includes(q) || t.tags.some(tag => tag.toLowerCase().includes(q)) || t.categoryName.toLowerCase().includes(q));
    }
    if (this.sortBy === 'rating') tools = [...tools].sort((a, b) => b.rating - a.rating);
    else if (this.sortBy === 'newest') tools = [...tools].sort((a, b) => new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime());
    else if (this.sortBy === 'name') tools = [...tools].sort((a, b) => a.name.localeCompare(b.name));
    else tools = [...tools].sort((a, b) => b.usageCount - a.usageCount);
    this.filteredTools.set(tools);
    this.currentPage.set(1);
  }

  setCategory(id: string | null): void { this.activeCategoryId.set(id); this.applyFilters(); }
  setQuickFilter(key: string): void {
    this.activeQuickFilter.set(this.activeQuickFilter() === key ? null : key);
    this.applyFilters();
  }
  clearSearch(): void { this.searchQuery = ''; this.applyFilters(); }
  clearAll(): void { this.searchQuery = ''; this.activeCategoryId.set(null); this.activeQuickFilter.set(null); this.applyFilters(); }
  prevPage(): void { if (this.currentPage() > 1) this.currentPage.update(p => p - 1); }
  nextPage(): void { if (this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1); }
  goToPage(p: number): void { this.currentPage.set(p); }
}

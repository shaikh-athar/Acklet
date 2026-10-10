// client/src/app/pages/tools/tools.ts
import { Component, inject, signal, computed, OnInit } from '@angular/core';
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
          <app-section-header eyebrow="Catalog" title="All Solutions" subtitle="The complete catalog of Acklet solutions — fast, client-side, and private." />
          
          <!-- Search Row -->
          <div class="tools-search-row">
            <div class="tools-search-wrap">
              <app-icon name="search" class="size-4.5 text-neutral-400" />
              <input class="tools-search" type="text" placeholder="Search tools by name, description, or category..." [(ngModel)]="searchQuery" (ngModelChange)="onSearchChange()" />
              @if (searchQuery) { 
                <button class="clear-btn" (click)="clearSearch()">
                  <app-icon name="x" class="size-3.5" />
                </button> 
              }
            </div>
          </div>
        </div>
      </div>

      <div class="container-main tools-body">
        <main class="tools-main">
          @if (isLoading()) {
            <app-loading-skeleton [count]="6" [cols]="3" />
          } @else if (tools().length === 0) {
            <!-- Empty state: Tools coming soon -->
            <div class="tools-empty-state">
              <div class="empty-icon-wrap">
                <app-icon name="sparkles" class="size-8 text-brand-400" />
              </div>
              <h2 class="empty-title">Tools coming soon</h2>
              <p class="empty-desc">We're crafting fast, privacy-first developer and productivity tools. Check back shortly!</p>
            </div>
          } @else if (filteredTools().length === 0) {
            <!-- Filtered empty state -->
            <div class="tools-empty-state">
              <div class="empty-icon-wrap">
                <app-icon name="search" class="size-8 text-neutral-400" />
              </div>
              <h2 class="empty-title">No matching tools found</h2>
              <p class="empty-desc">We couldn't find any tools matching "{{ searchQuery }}".</p>
              <button class="btn btn-secondary mt-3" (click)="clearSearch()">Clear Search</button>
            </div>
          } @else {
            <div class="tools-grid-main">
              @for (tool of filteredTools(); track tool.id || tool.slug) {
                <app-tool-card [tool]="tool" />
              }
            </div>
          }
        </main>
      </div>
    </div>
  `,
  styles: [`
    .tools-page { min-height: 100vh; }
    .tools-hero { padding: 9rem 0 3rem; position: relative; overflow: hidden; border-bottom: 1px solid rgba(255,255,255,0.04); }
    .tools-hero-inner { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 1.5rem; }
    .tools-search-row { display: flex; align-items: center; gap: 1rem; width: 100%; max-width: 600px; }
    .tools-search-wrap { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1.125rem; border-radius: var(--radius-xl); background: var(--color-surface-900); border: 1px solid rgba(255,255,255,0.06); flex: 1; box-shadow: var(--shadow-card); }
    .tools-search-wrap:focus-within { border-color: rgba(99,102,241,0.4); }
    .tools-search { flex: 1; background: none; border: none; outline: none; font-size: 0.875rem; color: var(--color-neutral-100); font-family: inherit; }
    .tools-search::placeholder { color: var(--color-neutral-600); }
    .clear-btn { background: none; border: none; color: var(--color-neutral-400); cursor: pointer; display: flex; align-items: center; justify-content: center; }

    .tools-body { padding-top: 3rem; padding-bottom: 5rem; }
    .tools-main { width: 100%; }
    .tools-grid-main { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; }

    .tools-empty-state {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      text-align: center; padding: 5rem 1.5rem; border-radius: var(--radius-2xl);
      background: var(--color-surface-900); border: 1px dashed rgba(255,255,255,0.08);
      max-width: 580px; margin: 0 auto;
    }
    .empty-icon-wrap {
      width: 64px; height: 64px; border-radius: 50%;
      background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2);
      display: flex; align-items: center; justify-content: center; margin-bottom: 1.25rem;
    }
    .empty-title { font-size: 1.35rem; font-weight: 700; color: var(--color-neutral-100); margin-bottom: 0.5rem; }
    .empty-desc { font-size: 0.9rem; color: var(--color-neutral-400); max-width: 400px; line-height: 1.6; }

    @media (max-width: 900px) {
      .tools-grid-main { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 540px) {
      .tools-grid-main { grid-template-columns: 1fr; }
    }
  `],
})
export class ToolsComponent implements OnInit {
  readonly toolsSvc = inject(ToolsService);

  searchQuery = '';
  readonly isLoading = signal(false);

  readonly tools = computed(() => this.toolsSvc.tools());

  readonly filteredTools = computed(() => {
    const list = this.tools();
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.shortDescription && t.shortDescription.toLowerCase().includes(q)) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.categoryName && t.categoryName.toLowerCase().includes(q)) ||
      (t.category && t.category.toLowerCase().includes(q))
    );
  });

  ngOnInit(): void {
    // Loaded via tools service central registry
  }

  onSearchChange(): void {}
  clearSearch(): void { this.searchQuery = ''; }
}

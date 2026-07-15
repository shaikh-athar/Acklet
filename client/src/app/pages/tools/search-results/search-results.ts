// client/src/app/pages/tools/search-results/search-results.ts
import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ToolsService } from '../../../core/services/tools.service';
import { ToolCardComponent } from '../../../shared/components/tool-card/tool-card';
import { IconComponent } from '../../../shared/components/icon/icon';
import { SpotlightDirective } from '../../../shared/directives/spotlight.directive';
import { Tool } from '../../../core/models/tool.model';

@Component({
  selector: 'app-tools-search-results',
  standalone: true,
  imports: [CommonModule, RouterLink, ToolCardComponent, IconComponent, SpotlightDirective],
  template: `
    <div class="search-results-page page-enter">
      <!-- Page Header -->
      <div class="search-hero gradient-mesh">
        <div class="container-main hero-inner">
          <span class="badge badge-brand mb-3">Search Catalog</span>
          <h1 class="hero-title">Search Results</h1>
          <p class="hero-subtitle">
            Showing results for <span class="search-query-highlight">"{{ query() || '' }}"</span>
          </p>
        </div>
      </div>

      <!-- Tools Grid -->
      <section class="section">
        <div class="container-main">
          <div class="tools-grid">
            @for (tool of results(); track tool.id) {
              <app-tool-card [tool]="tool" />
            } @empty {
              <div class="empty-state glass">
                <app-icon name="search" class="size-8 text-neutral-500 mb-2" />
                <h3 class="empty-title">No matches found</h3>
                <p class="empty-desc">Try checking your spelling or searching for a different keyword.</p>
                <a routerLink="/tools/explore" class="btn btn-primary btn-sm mt-4">Browse All Solutions</a>
              </div>
            }
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .search-results-page { min-height: 100vh; }
    .search-hero { padding: 8rem 0 4rem; position: relative; overflow: hidden; }
    .hero-inner { display: flex; flex-direction: column; align-items: center; text-align: center; }
    .hero-title { font-size: 3rem; font-weight: 700; color: var(--color-neutral-100); letter-spacing: -0.02em; }
    .hero-subtitle { font-size: 1.15rem; color: var(--color-neutral-400); margin-top: 0.5rem; }
    .search-query-highlight { color: var(--color-brand-cyan); font-weight: 700; }

    .tools-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; }
    
    .empty-state { text-align: center; padding: 3rem 1.5rem; border-radius: var(--radius-xl); border: 1px solid var(--border-soft); max-width: 400px; margin: 0 auto; }
    .empty-title { font-size: 1.1rem; font-weight: 700; color: var(--color-neutral-100); }
    .empty-desc { font-size: 0.85rem; color: var(--color-neutral-500); }
    .mb-2 { margin-bottom: 0.5rem; }
    .mt-4 { margin-top: 1rem; }

    @media (max-width: 900px) {
      .tools-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 600px) {
      .tools-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class ToolsSearchResultsComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly toolsSvc = inject(ToolsService);
  private sub?: Subscription;

  readonly query = signal<string>('');
  readonly results = signal<Tool[]>([]);

  ngOnInit(): void {
    this.sub = this.route.queryParams.subscribe(params => {
      const q = params['q'] || '';
      this.query.set(q);
      this.results.set(this.toolsSvc.searchTools(q));
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}

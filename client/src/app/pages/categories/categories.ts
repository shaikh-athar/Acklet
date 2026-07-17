// client/src/app/pages/categories/categories.ts
import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToolsService } from '../../core/services/tools.service';
import { IconComponent } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [RouterLink, CommonModule, IconComponent],
  template: `
    <div class="categories-root page-enter">

      <!-- ══ HERO ══════════════════════════════════════════════ -->
      <section class="cats-hero gradient-mesh">
        <div class="orb orb-brand" style="width:600px;height:600px;top:-200px;left:-150px;"></div>
        <div class="orb orb-accent" style="width:400px;height:400px;bottom:-100px;right:-100px;"></div>
        <div class="container-main cats-hero-inner">
          <span class="badge badge-brand cats-badge">
            <app-icon name="layout-grid" class="size-3.5 text-brand-300 mr-1.5" />
            All Categories
          </span>
          <h1 class="cats-hero-title">
            Find solutions by <span class="gradient-text-brand">category</span>
          </h1>
          <p class="cats-hero-sub">
            Each category groups solutions around a real problem domain. Browse what you need to accomplish, and Acklet will help you get it done.
          </p>

          <!-- Search -->
          <div class="cats-search">
            <app-icon name="search" class="size-4 text-neutral-400" />
            <input type="text" placeholder="Filter categories..." class="cats-search-input"
                   (input)="onSearch($event)" />
            @if (searchQuery()) {
              <button class="cats-clear-btn" (click)="clearSearch()">
                <app-icon name="x" class="size-3.5" />
              </button>
            }
          </div>
        </div>
      </section>

      <!-- ══ STATS BAR ══════════════════════════════════════════ -->
      <div class="cats-stats-bar">
        <div class="container-main cats-stats-inner">
          <div class="cats-stat">
            <span class="cats-stat-val">{{ toolsSvc.categories().length }}</span>
            <span class="cats-stat-label">Categories</span>
          </div>
          <div class="cats-divider"></div>
          <div class="cats-stat">
            <span class="cats-stat-val">{{ toolsSvc.tools().length }}</span>
            <span class="cats-stat-label">Total Solutions</span>
          </div>
          <div class="cats-divider"></div>
          <div class="cats-stat">
            <span class="cats-stat-val">100%</span>
            <span class="cats-stat-label">Browser-Based</span>
          </div>
          <div class="cats-divider"></div>
          <div class="cats-stat">
            <span class="cats-stat-val">Free</span>
            <span class="cats-stat-label">Always</span>
          </div>
        </div>
      </div>

      <!-- ══ CATEGORIES GRID ════════════════════════════════════ -->
      <section class="section">
        <div class="container-main">
          @if (filteredCategories().length > 0) {
            <div class="cats-section-header">
              <p class="cats-showing-label">
                Showing <strong>{{ filteredCategories().length }}</strong>
                {{ filteredCategories().length === 1 ? 'category' : 'categories' }}
                @if (searchQuery()) { matching "<em>{{ searchQuery() }}</em>" }
              </p>
            </div>
            <div class="cats-grid">
              @for (cat of filteredCategories(); track cat.id) {
                <div class="cat-item">
                  <a [routerLink]="['/tools']" [queryParams]="{ category: cat.slug }"
                     class="cat-full-card" [style.--cc]="cat.color">
                    <div class="cat-full-icon-box">
                      <app-icon [name]="cat.icon" class="size-7 cat-full-icon" />
                    </div>
                    <h2 class="cat-full-name">{{ cat.name }}</h2>
                    <p class="cat-full-desc">{{ cat.description }}</p>
                    <div class="cat-full-footer">
                      <span class="cat-full-count">
                        {{ cat.toolCount }} solutions
                      </span>
                      <span class="cat-full-explore">
                        Explore
                        <app-icon name="arrow-right" class="size-3.5 ml-1" />
                      </span>
                    </div>
                  </a>
                </div>
              }
            </div>
          } @else {
            <div class="cats-empty">
              <app-icon name="search-x" class="size-12 text-neutral-600 mb-4" />
              <p class="cats-empty-title">No categories found</p>
              <p class="cats-empty-sub">Try a different search term or <button class="cats-empty-clear" (click)="clearSearch()">clear the filter</button>.</p>
            </div>
          }
        </div>
      </section>

      <!-- ══ CTA ════════════════════════════════════════════════ -->
      <section class="cats-cta">
        <div class="container-main cats-cta-inner">
          <h2 class="cats-cta-title">Not sure where to start?</h2>
          <p class="cats-cta-sub">Use the search above to find solutions by name or intent — or browse everything we offer.</p>
          <div class="cats-cta-btns">
            <a routerLink="/tools" class="btn btn-primary">Browse all solutions</a>
            <a routerLink="/" class="btn btn-secondary">Back to home</a>
          </div>
        </div>
      </section>

    </div>
  `,
  styles: [`
    .categories-root { overflow: hidden; }

    /* Hero */
    .cats-hero { position: relative; padding: 11rem 0 5rem; overflow: hidden; }
    .cats-hero-inner { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 1.25rem; max-width: 720px; margin: 0 auto; }
    .cats-badge { animation: var(--animate-fade-up); animation-fill-mode: both; animation-delay: 0.1s; opacity: 0; }
    .cats-hero-title { font-family: var(--font-serif); font-size: clamp(2.5rem, 5vw, 4rem); font-weight: 700; color: var(--color-neutral-50); line-height: 1.1; letter-spacing: -0.02em; animation: var(--animate-fade-up); animation-delay: 0.2s; animation-fill-mode: both; opacity: 0; }
    .cats-hero-sub { font-size: 1.05rem; color: var(--color-neutral-400); line-height: 1.75; max-width: 580px; animation: var(--animate-fade-up); animation-fill-mode: both; animation-delay: 0.3s; opacity: 0; }

    /* Search */
    .cats-search { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1.125rem; border-radius: var(--radius-xl); background: var(--color-surface-900); border: 1px solid rgba(255,255,255,0.06); width: 100%; max-width: 480px; transition: all 0.3s; animation: var(--animate-fade-up); animation-fill-mode: both; animation-delay: 0.4s; opacity: 0; }
    .cats-search:focus-within { border-color: rgba(99,102,241,0.4); box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
    .cats-search-input { flex: 1; background: none; border: none; outline: none; font-size: 0.875rem; color: var(--color-neutral-100); font-family: inherit; }
    .cats-search-input::placeholder { color: var(--color-neutral-600); }
    .cats-clear-btn { background: none; border: none; cursor: pointer; color: var(--color-neutral-500); display: flex; align-items: center; padding: 0; transition: color 0.2s; }
    .cats-clear-btn:hover { color: var(--color-neutral-200); }

    /* Stats bar */
    .cats-stats-bar { border-top: 1px solid var(--border-soft); border-bottom: 1px solid var(--border-soft); background: var(--color-surface-900); padding: 1.25rem 0; }
    .cats-stats-inner { display: flex; align-items: center; justify-content: center; gap: 2rem; flex-wrap: wrap; }
    .cats-stat { display: flex; flex-direction: column; align-items: center; gap: 0.125rem; }
    .cats-stat-val { font-size: 1.375rem; font-weight: 800; color: var(--color-brand-500); letter-spacing: -0.04em; }
    .cats-stat-label { font-size: 0.72rem; color: var(--color-neutral-500); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
    .cats-divider { width: 1px; height: 36px; background: var(--border-soft); }

    /* Grid */
    .cats-section-header { margin-bottom: 1.5rem; }
    .cats-showing-label { font-size: 0.875rem; color: var(--color-neutral-500); }
    .cats-showing-label strong { color: var(--color-neutral-200); font-weight: 700; }
    .cats-showing-label em { color: var(--color-brand-400); font-style: normal; }

    .cats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }

    /* Full category card */
    .cat-full-card {
      display: flex; flex-direction: column; gap: 1rem;
      padding: 2rem; border-radius: var(--radius-xl);
      text-decoration: none;
      background: var(--color-surface-800);
      border: 1px solid var(--border-soft);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative; overflow: hidden; height: 100%;
    }
    .cat-full-card::before {
      content: ''; position: absolute; inset: 0;
      background: radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--cc, #6366f1) 8%, transparent), transparent 70%);
      opacity: 0; transition: opacity 0.3s;
    }
    .cat-full-card:hover { transform: translateY(-5px); box-shadow: var(--shadow-card-hover); border-color: color-mix(in srgb, var(--cc, #6366f1) 25%, transparent); }
    .cat-full-card:hover::before { opacity: 1; }
    .cat-full-card:hover .cat-full-explore { color: var(--cc, #818cf8); transform: translateX(2px); }

    .cat-full-icon-box {
      width: 56px; height: 56px; border-radius: var(--radius-xl);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      background: color-mix(in srgb, var(--cc, #6366f1) 8%, var(--surface-hover));
      border: 1px solid color-mix(in srgb, var(--cc, #6366f1) 14%, var(--border-soft));
      transition: all 0.3s;
    }
    .cat-full-card:hover .cat-full-icon-box {
      background: color-mix(in srgb, var(--cc, #6366f1) 14%, transparent);
      border-color: color-mix(in srgb, var(--cc, #6366f1) 30%, transparent);
      box-shadow: 0 0 20px color-mix(in srgb, var(--cc, #6366f1) 25%, transparent);
    }
    .cat-full-icon { color: var(--cc, #818cf8); transition: all 0.3s; }
    .cat-full-name { font-size: 1.125rem; font-weight: 700; color: var(--color-neutral-100); }
    .cat-full-desc { font-size: 0.825rem; color: var(--color-neutral-400); line-height: 1.6; flex: 1; }
    .cat-full-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 1rem; border-top: 1px solid var(--border-soft); margin-top: auto; }
    .cat-full-count { display: flex; align-items: center; font-size: 0.75rem; font-weight: 600; color: var(--color-neutral-500); }
    .cat-full-explore { display: flex; align-items: center; font-size: 0.75rem; font-weight: 700; color: var(--color-neutral-400); transition: all 0.25s; text-transform: uppercase; letter-spacing: 0.06em; }

    /* Empty state */
    .cats-empty { display: flex; flex-direction: column; align-items: center; padding: 5rem 1rem; color: var(--color-neutral-500); }
    .cats-empty-title { font-size: 1.125rem; font-weight: 600; color: var(--color-neutral-300); margin-bottom: 0.5rem; }
    .cats-empty-sub { font-size: 0.875rem; }
    .cats-empty-clear { background: none; border: none; cursor: pointer; color: var(--color-brand-400); font-size: inherit; padding: 0; text-decoration: underline; }

    /* CTA */
    .cats-cta { padding: 6rem 0; background: var(--color-surface-900); border-top: 1px solid var(--border-soft); }
    .cats-cta-inner { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1.25rem; }
    .cats-cta-title { font-size: clamp(1.75rem, 4vw, 2.75rem); font-weight: 800; color: var(--color-neutral-50); letter-spacing: -0.03em; }
    .cats-cta-sub { font-size: 1rem; color: var(--color-neutral-400); max-width: 480px; line-height: 1.7; }
    .cats-cta-btns { display: flex; gap: 0.875rem; flex-wrap: wrap; justify-content: center; }

    @media (max-width: 1024px) { .cats-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 640px) {
      .cats-grid { grid-template-columns: 1fr; }
      .cats-hero { padding: 6rem 0 3rem; }
      .cats-stats-inner { gap: 1rem; }
      .cats-cta-btns { flex-direction: column; width: 100%; }
    }
  `],
})
export class CategoriesComponent {
  readonly toolsSvc = inject(ToolsService);
  readonly searchQuery = signal('');

  readonly filteredCategories = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.toolsSvc.categories();
    return this.toolsSvc.categories().filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q)
    );
  });

  onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }
}

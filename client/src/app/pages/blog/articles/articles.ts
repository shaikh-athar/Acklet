import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../shared/components/icon/icon';
import { SpotlightDirective } from '../../../shared/directives/spotlight.directive';
import { FallbackStateComponent } from '../../../shared/components/fallback-state/fallback-state';
import { LoadingSkeletonComponent } from '../../../shared/components/loading-skeleton/loading-skeleton';
import { BlogService } from '../../../core/services/blog.service';
import { MOCK_BLOG_ARTICLES } from '../../../core/mock-data/blog.data';

@Component({
  selector: 'app-blog-articles',
  standalone: true,
  imports: [RouterLink, CommonModule, FallbackStateComponent, LoadingSkeletonComponent],
  template: `
    <div class="blog-root page-enter">
      <!-- Hero -->
      <section class="blog-hero gradient-mesh">
        <div class="orb orb-brand" style="width:400px;height:400px;top:-10%;right:5%"></div>
        <div class="container-main hero-inner">
          <span class="badge badge-brand mb-3">ACKLET INSIGHTS</span>
          <h1 class="hero-title">Insights & Engineering</h1>
          <p class="hero-subtitle">Thoughts on local encryption, developer tools efficiency, and web sandboxes.</p>
        </div>
      </section>

      <!-- Articles Grid -->
      <section class="section">
        <div class="container-main">
          @if (loading()) {
            <app-loading-skeleton type="card" [count]="4"></app-loading-skeleton>
          } @else if (articles().length === 0) {
            <app-fallback-state type="EMPTY" title="No Articles Published" message="Check back soon for engineering articles and platform updates."></app-fallback-state>
          } @else {
            <div class="articles-grid">
              @for (art of articles(); track art.slug) {
                <div class="article-card">
                  <div class="card-body">
                    <div class="meta-row mb-2">
                      <span class="badge badge-accent text-xxs">{{ (art.category || 'Engineering') | uppercase }}</span>
                      <span class="read-time">{{ art.readTimeMinutes || 5 }} min read</span>
                    </div>

                    <a [routerLink]="['/blog', art.slug]" class="article-title">
                      {{ art.title }}
                    </a>
                    
                    <p class="article-summary">{{ art.excerpt || art.summary }}</p>

                    <div class="author-row mt-6">
                      <div class="author-avatar">{{ (art.authorName || art.author || 'A')[0] }}</div>
                      <div>
                        <div class="author-name">{{ art.authorName || art.author || 'Acklet Team' }}</div>
                        <div class="author-title">{{ art.authorTitle || 'Engineering' }}</div>
                      </div>
                      <span class="pub-date">{{ art.publishedAt | date:'mediumDate' }}</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </section>
    </div>
  `,
  styles: [`
    .blog-root { min-height: 100vh; background: var(--color-surface-950); }
    .blog-hero { padding: 8rem 0 4rem; position: relative; }
    .hero-inner { display: flex; flex-direction: column; align-items: center; text-align: center; }
    .hero-title { font-size: 3rem; font-weight: 700; color: var(--color-neutral-100); }
    .hero-subtitle { font-size: 1rem; color: var(--color-neutral-400); max-width: 500px; margin-top: 0.5rem; }

    .articles-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 2rem; }
    .article-card { border-radius: var(--radius-xl); border: 1px solid var(--border-soft); display: flex; flex-direction: column; }
    
    .card-body { padding: 2rem; display: flex; flex-direction: column; flex: 1; }
    .meta-row { display: flex; justify-content: space-between; align-items: center; }
    .read-time { font-size: 0.72rem; color: var(--color-neutral-500); }
    .text-xxs { font-size: 0.65rem; padding: 0.1rem 0.4rem; }

    .article-title { font-size: 1.25rem; font-weight: 700; color: var(--color-neutral-100); text-decoration: none; line-height: 1.35; margin-top: 0.5rem; transition: color 0.2s; }
    .article-title:hover { color: var(--color-brand-800); }
    .article-summary { font-size: 0.875rem; color: var(--color-neutral-400); margin-top: 0.5rem; line-height: 1.6; }
    
    .author-row { display: flex; align-items: center; gap: 0.75rem; border-top: 1px solid var(--border-soft); padding-top: 1.25rem; }
    .author-avatar { width: 34px; height: 34px; border-radius: 50%; background: var(--color-brand-200); color: var(--color-brand-900); display: flex; align-items: center; justify-content: center; font-size: 0.95rem; font-weight: 700; }
    .author-name { font-size: 0.8rem; font-weight: 600; color: var(--color-neutral-100); }
    .author-title { font-size: 0.7rem; color: var(--color-neutral-500); }
    .pub-date { font-size: 0.75rem; color: var(--color-neutral-500); margin-left: auto; }

    @media (max-width: 768px) {
      .articles-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class BlogArticlesComponent implements OnInit {
  private readonly blogSvc = inject(BlogService);
  readonly articles = signal<any[]>([]);
  readonly loading = signal<boolean>(true);

  ngOnInit(): void {
    this.blogSvc.getArticles(0, 20).subscribe({
      next: page => {
        if (page && page.content && page.content.length > 0) {
          this.articles.set(page.content);
        } else {
          this.articles.set(MOCK_BLOG_ARTICLES);
        }
        this.loading.set(false);
      },
      error: () => {
        this.articles.set(MOCK_BLOG_ARTICLES);
        this.loading.set(false);
      }
    });
  }
}

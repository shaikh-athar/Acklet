// client/src/app/pages/blog/article-details/article-details.ts
import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../shared/components/icon/icon';
import { SpotlightDirective } from '../../../shared/directives/spotlight.directive';
import { MOCK_BLOG_ARTICLES, BlogArticle } from '../../../core/mock-data/blog.data';

@Component({
  selector: 'app-blog-article-details',
  standalone: true,
  imports: [RouterLink, CommonModule, IconComponent],
  template: `
    <div class="article-root page-enter">
      <div class="container-main pb-16 pt-24">
        <!-- Back Link -->
        <a routerLink="/blog" class="back-link mb-6">
          <app-icon name="arrow-left" class="size-3.5" />
          Back to Blog
        </a>

        @if (article()) {
          <article class="article-body">
            <!-- Header -->
            <header class="article-header mb-8">
              <span class="badge badge-brand text-xxs mb-3">{{ article()!.category | uppercase }}</span>
              <h1 class="article-title">{{ article()!.title }}</h1>
              <p class="article-subtitle">{{ article()!.summary }}</p>

              <div class="author-block mt-6">
                <div class="author-avatar">{{ article()!.author[0] }}</div>
                <div>
                  <div class="author-name">{{ article()!.author }}</div>
                  <div class="author-title">{{ article()!.authorTitle }}</div>
                </div>
                <div class="meta-details ml-auto text-right">
                  <div class="pub-date">{{ article()!.publishedDate }}</div>
                  <div class="read-time">{{ article()!.readTime }}</div>
                </div>
              </div>
            </header>

            <!-- Markdown content block -->
            <div class="article-content p-8">
              <p class="para" *ngFor="let p of paragraphs()">{{ p }}</p>
            </div>
          </article>
        }
      </div>
    </div>
  `,
  styles: [`
    .article-root { min-height: 100vh; background: var(--color-surface-950); }
    .back-link { display: inline-flex; align-items: center; gap: 0.5rem; color: var(--color-brand-500); text-decoration: none; font-size: 0.875rem; font-weight: 500; }
    .back-link:hover { color: var(--color-brand-600); }
    
    .article-body { max-width: 800px; margin: 0 auto; }
    .article-title { font-size: 2.5rem; font-weight: 700; color: var(--color-neutral-100); line-height: 1.15; letter-spacing: -0.02em; }
    .article-subtitle { font-size: 1.1rem; color: var(--color-neutral-400); margin-top: 0.75rem; line-height: 1.6; }
    
    .author-block { display: flex; align-items: center; gap: 0.75rem; border-top: 1px solid var(--border-soft); border-bottom: 1px solid var(--border-soft); padding: 1rem 0; }
    .author-avatar { width: 38px; height: 38px; border-radius: 50%; background: var(--color-brand-200); color: var(--color-brand-900); display: flex; align-items: center; justify-content: center; font-size: 1.1rem; font-weight: 700; }
    .author-name { font-size: 0.85rem; font-weight: 600; color: var(--color-neutral-100); }
    .author-title { font-size: 0.72rem; color: var(--color-neutral-500); }
    .meta-details { font-size: 0.75rem; color: var(--color-neutral-500); }
    .read-time { margin-top: 0.1rem; }

    .article-content { border-radius: var(--radius-xl); border: 1px solid var(--border-soft); }
    .para { font-size: 1rem; color: var(--color-neutral-300); line-height: 1.8; margin-bottom: 1.5rem; }
    .para:last-child { margin-bottom: 0; }
    
    .text-xxs { font-size: 0.65rem; padding: 0.1rem 0.4rem; }
    .mb-3 { margin-bottom: 0.75rem; }
    .mb-6 { margin-bottom: 1.5rem; }
    .mb-8 { margin-bottom: 2rem; }
    .mt-6 { margin-top: 1.5rem; }
    .ml-auto { margin-left: auto; }
    .text-right { text-align: right; }
  `],
})
export class BlogArticleDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly article = signal<BlogArticle | null>(null);

  paragraphs() {
    const art = this.article();
    if (!art) return [];
    return art.content.split('\n\n');
  }

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    const match = MOCK_BLOG_ARTICLES.find(a => a.slug === slug);
    if (match) {
      this.article.set(match);
    }
  }
}

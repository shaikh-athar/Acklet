// client/apps/tool-docs/src/app/pages/public-view/docs-public-view.component.ts

import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { DocService } from '../../services/doc.service';
import { PublicDocument } from '../../models/doc.model';
import { DocBlockRendererComponent } from '../../components/doc-block-renderer/doc-block-renderer.component';

@Component({
  selector: 'app-docs-public-view',
  standalone: true,
  imports: [CommonModule, RouterLink, DocBlockRendererComponent],
  template: `
    <div class="docs-reader">
      <!-- Minimal Editorial Public Header Bar -->
      <header class="docs-reader__header">
        <div class="docs-topbar__inner">
          <a routerLink="/" class="docs-topbar__brand">
            <span class="docs-topbar__logo">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
                <path d="M6 6h10"/>
                <path d="M6 10h10"/>
              </svg>
            </span>
            <span class="docs-topbar__title">Acklet Docs</span>
          </a>

          <div class="docs-topbar__actions">
            @if (document(); as doc) {
              @if (doc.toolName) {
                <span class="docs-badge docs-badge--topic">{{ doc.toolName }}</span>
              }
            }

            <!-- Theme Toggle -->
            <button
              type="button"
              class="docs-icon-button"
              (click)="toggleTheme()"
              title="Toggle theme (Light / Dark)"
              aria-label="Toggle theme"
            >
              @if (isDarkTheme()) {
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="4"/>
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
                </svg>
              } @else {
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
                </svg>
              }
            </button>
          </div>
        </div>
      </header>

      <!-- Main Reading Container -->
      <main class="docs-reader__container">
        @if (loading()) {
          <!-- Skeleton Reader State -->
          <div class="docs-skeleton--card">
            <div class="docs-skeleton__line docs-skeleton__line--sm"></div>
            <div class="docs-skeleton__line docs-skeleton__line--lg"></div>
            <div class="docs-skeleton__line"></div>
          </div>
        } @else if (notFound()) {
          <!-- 404 Not Found in Docs Style -->
          <div class="docs-not-found">
            <span class="docs-badge docs-badge--draft">404</span>
            <h1 class="docs-not-found__code">404</h1>
            <h2 class="docs-not-found__title">Document Not Found</h2>
            <p class="docs-not-found__desc">
              The documentation page you requested does not exist, has been deleted, or is currently unpublished.
            </p>
            <div class="docs-not-found__actions">
              <a routerLink="/" class="docs-button docs-button--primary docs-button--md">
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Acklet Docs</span>
              </a>
            </div>
          </div>
        } @else if (error()) {
          <!-- Error State -->
          <div class="docs-empty-state">
            <h2 class="docs-empty-state__title">Unable to Load Document</h2>
            <p class="docs-empty-state__desc">{{ error() }}</p>
            <div class="docs-empty-state__actions">
              <button type="button" class="docs-button docs-button--primary docs-button--sm" (click)="retry()">Retry</button>
            </div>
          </div>
        } @else if (document(); as doc) {
          <!-- Published Document Reader View -->
          <article class="docs-article">
            <!-- Article Header -->
            <header class="docs-article__header">
              @if (doc.publishedAt) {
                <div class="docs-card__meta">
                  <time [attr.datetime]="doc.publishedAt">
                    Published {{ formatPublishedDate(doc.publishedAt) }}
                  </time>
                </div>
              }

              <h1 class="docs-article__title">
                {{ doc.title }}
              </h1>

              @if (doc.summary) {
                <p class="docs-article__lead">
                  {{ doc.summary }}
                </p>
              }
            </header>

            <!-- Story Content: Blocks (or legacy sections fallback) -->
            <div class="docs-article__body">
              @if (doc.blocks && doc.blocks.length > 0) {
                <app-doc-block-renderer [blocks]="doc.blocks" />
              } @else {
                @for (section of sortedSections(); track section.position; let idx = $index) {
                  <section>
                    @if (section.heading) {
                      <h2 class="docs-article__h2">
                        <span>{{ idx + 1 }}.</span>
                        <span>{{ section.heading }}</span>
                      </h2>
                    }

                    @if (section.body) {
                      @for (paragraph of getParagraphs(section.body); track $index) {
                        <p>
                          {{ paragraph }}
                        </p>
                      }
                    }
                  </section>
                }
              }
            </div>
          </article>
        }
      </main>

      <!-- Clean Editorial Footer -->
      <footer class="docs-article__footer">
        <p>Published on <strong>Acklet Docs</strong></p>
        <a routerLink="/" class="docs-link">
          Documentation Platform
        </a>
      </footer>
    </div>
  `
})
export class DocsPublicViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly docService = inject(DocService);
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);

  readonly loading = signal<boolean>(true);
  readonly notFound = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly document = signal<PublicDocument | null>(null);
  readonly isDarkTheme = signal<boolean>(false);

  private slug = '';

  readonly sortedSections = computed(() => {
    const doc = this.document();
    if (!doc || !doc.sections) return [];
    return [...doc.sections].sort((a, b) => a.position - b.position);
  });

  ngOnInit(): void {
    if (typeof document !== 'undefined') {
      const savedTheme = localStorage.getItem('docs:theme') || localStorage.getItem('acklet:theme') || 'light';
      this.isDarkTheme.set(savedTheme === 'dark');
      this.applyTheme(savedTheme === 'dark');
    }

    this.route.paramMap.subscribe(params => {
      this.slug = params.get('slug') || params.get('docSlug') || '';
      if (this.slug) {
        this.loadPublicDoc(this.slug);
      } else {
        this.notFound.set(true);
        this.loading.set(false);
      }
    });
  }

  toggleTheme(): void {
    const nextDark = !this.isDarkTheme();
    this.isDarkTheme.set(nextDark);
    this.applyTheme(nextDark);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('docs:theme', nextDark ? 'dark' : 'light');
    }
  }

  private applyTheme(dark: boolean): void {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  loadPublicDoc(slug: string): void {
    this.loading.set(true);
    this.notFound.set(false);
    this.error.set(null);

    this.docService.getPublicDocument(slug).subscribe({
      next: doc => {
        this.document.set(doc);
        this.loading.set(false);

        const pageTitle = `${doc.title} — Acklet Docs`;
        this.titleService.setTitle(pageTitle);

        const description = doc.summary || `${doc.title} published on Acklet Docs.`;
        this.metaService.updateTag({ name: 'description', content: description });
        this.metaService.updateTag({ property: 'og:title', content: pageTitle });
        this.metaService.updateTag({ property: 'og:description', content: description });
      },
      error: err => {
        this.loading.set(false);
        if (err.status === 404) {
          this.notFound.set(true);
          this.titleService.setTitle('Document Not Found — Acklet Docs');
        } else {
          this.error.set(err?.error?.message || 'Failed to load document');
        }
      }
    });
  }

  retry(): void {
    if (this.slug) {
      this.loadPublicDoc(this.slug);
    }
  }

  getParagraphs(body: string): string[] {
    if (!body) return [];
    return body.split(/\n\s*\n/);
  }

  formatPublishedDate(dateStr?: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }
}

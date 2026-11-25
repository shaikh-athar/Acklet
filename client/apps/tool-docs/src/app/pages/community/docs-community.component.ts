// client/apps/tool-docs/src/app/pages/community/docs-community.component.ts

import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DocService } from '../../services/doc.service';
import { DocsAuthService } from '../../services/docs-auth.service';
import { DocDocument } from '../../models/doc.model';
import { getPortalUrl } from '@acklet/shared';

@Component({
  selector: 'app-docs-community',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="docs-app docs-page docs-page--discover">
      <div class="docs-discover-layout">
        <!-- ── Main Center Feed ────────────────────────────────────────────── -->
        <main class="docs-feed">
          <!-- Feed Header: Underline Tabs -->
          <div class="docs-tabs__list" role="tablist" aria-label="Community Feed Tabs">
            <button
              type="button"
              role="tab"
              class="docs-tabs__tab"
              [class.docs-tabs__tab--active]="feedTab() === 'for-you'"
              (click)="setFeedTab('for-you')"
              [attr.aria-selected]="feedTab() === 'for-you'"
            >
              For you
            </button>
            <button
              type="button"
              role="tab"
              class="docs-tabs__tab"
              [class.docs-tabs__tab--active]="feedTab() === 'latest'"
              (click)="setFeedTab('latest')"
              [attr.aria-selected]="feedTab() === 'latest'"
            >
              Latest
            </button>
          </div>

          <!-- Feed Content -->
          @if (docService.loading()) {
            <!-- Skeleton Feed -->
            @for (i of [1, 2, 3]; track i) {
              <div class="docs-skeleton docs-skeleton--card">
                <div class="docs-skeleton__line docs-skeleton__line--sm"></div>
                <div class="docs-skeleton__line docs-skeleton__line--lg"></div>
                <div class="docs-skeleton__line"></div>
              </div>
            }
          } @else if (filteredFeed().length === 0) {
            <!-- Standardized Empty State -->
            <div class="docs-empty-state">
              <div class="docs-empty-state__icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
                  <path d="M6 6h10"/>
                  <path d="M6 10h10"/>
                </svg>
              </div>

              @if (searchQuery.trim().length > 0 || selectedTopic() !== 'All') {
                <h2 class="docs-empty-state__title">No results found</h2>
                <p class="docs-empty-state__desc">
                  No published stories match your current search or topic filter.
                </p>
                <div class="docs-empty-state__actions">
                  <button type="button" class="docs-button docs-button--secondary docs-button--sm" (click)="resetFilters()">
                    Reset Filters
                  </button>
                </div>
              } @else {
                <h2 class="docs-empty-state__title">No stories published yet</h2>
                <p class="docs-empty-state__desc">
                  Be the first to publish an article, documentation guide, or developer story on Acklet Docs.
                </p>
                <div class="docs-empty-state__actions">
                  <button
                    type="button"
                    class="docs-button docs-button--primary docs-button--sm"
                    (click)="createFirstDocument()"
                    [disabled]="isCreating()"
                  >
                    @if (isCreating()) {
                      <span>Creating...</span>
                    } @else {
                      <span>Start Writing</span>
                    }
                  </button>
                </div>
              }
            </div>
          } @else {
            <!-- Feed Article Cards -->
            @for (doc of filteredFeed(); track doc.id) {
              <article
                class="docs-feed-card"
                [routerLink]="doc.slug ? ['/p', doc.slug] : null"
              >
                <!-- Author & Date Header -->
                <header class="docs-feed-card__meta">
                  <div class="docs-feed-card__author">
                    <div class="docs-avatar docs-avatar--sm">
                      {{ getAuthorInitial(doc.authorName) }}
                    </div>
                    <span class="docs-feed-card__author-name">
                      {{ doc.authorName || 'user' }}
                    </span>
                    <span>·</span>
                    <time class="docs-feed-card__date" [attr.datetime]="doc.publishedAt">{{ formatDate(doc.publishedAt) }}</time>
                  </div>

                  <!-- Bookmark Icon Button -->
                  <button
                    type="button"
                    class="docs-icon-button docs-icon-button--sm"
                    (click)="onBookmarkClick($event, doc)"
                    title="Bookmark story"
                    aria-label="Bookmark story"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" [attr.fill]="bookmarkedIds().has(doc.id) ? 'currentColor' : 'none'"/>
                    </svg>
                  </button>
                </header>

                <!-- Article Title & Summary -->
                <h3 class="docs-feed-card__title">
                  {{ doc.title }}
                </h3>

                @if (doc.summary) {
                  <p class="docs-feed-card__excerpt">
                    {{ doc.summary }}
                  </p>
                }

                <!-- Footer Row: Topic Pill, Reading Time, and Read story link -->
                <footer class="docs-feed-card__footer">
                  <div class="docs-feed-card__tags">
                    <span class="docs-badge docs-badge--topic">
                      {{ doc.toolName || 'Documentation' }}
                    </span>
                    <span class="docs-feed-card__reading-time">{{ estimateReadingTime(doc.sectionCount) }}</span>
                  </div>

                  <span class="docs-feed-card__action">
                    <span>Read story</span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </span>
                </footer>
              </article>
            }
          }
        </main>

        <!-- ── Right Sidebar (Hidden < 1024px) ─────────────── -->
        <aside class="docs-discover-aside">
          <div class="docs-discover-aside__section">
            <h3 class="docs-discover-aside__title">
              Trending Topics
            </h3>
            <div class="docs-trending-chips">
              @for (tag of trendingTags; track tag) {
                <button
                  type="button"
                  class="docs-chip"
                  [class.docs-chip--active]="selectedTopic() === tag"
                  (click)="selectTopic(tag)"
                >
                  #{{ tag }}
                </button>
              }
            </div>
          </div>
        </aside>
      </div>

      <!-- ── Global Centered Bottom Footer ─────────────────────────────── -->
      <footer class="docs-footer">
        <div class="docs-footer__inner">
          <a [href]="portalUrl">Acklet Tools</a>
          <span>·</span>
          <a routerLink="/">Help</a>
          <span>·</span>
          <a routerLink="/">Status</a>
          <span>·</span>
          <a routerLink="/">About</a>
          <span>·</span>
          <a routerLink="/">Privacy</a>
          <span>·</span>
          <a routerLink="/">Terms</a>
          <span>·</span>
          <span>&copy; 2026 Acklet</span>
        </div>
      </footer>
    </div>
  `
})
export class DocsCommunityComponent implements OnInit, OnDestroy {
  readonly docService = inject(DocService);
  readonly authService = inject(DocsAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly portalUrl = getPortalUrl();
  readonly feedTab = signal<'for-you' | 'latest'>('for-you');
  readonly selectedTopic = signal<string>('All');
  readonly isCreating = signal<boolean>(false);
  readonly bookmarkedIds = signal<Set<string>>(new Set());

  searchQuery = '';
  private readonly search$ = new Subject<string>();
  private querySub?: Subscription;

  readonly topics = ['All', 'Architecture', 'Engineering', 'Guides', 'Tools', 'Product'];
  readonly trendingTags = ['devtools', 'engineering', 'architecture', 'guides', 'api', 'design'];

  readonly filteredFeed = computed(() => {
    let items = this.docService.publicFeed();
    const query = this.searchQuery.trim().toLowerCase();
    const topic = this.selectedTopic();

    if (query) {
      items = items.filter(d =>
        (d.title && d.title.toLowerCase().includes(query)) ||
        (d.summary && d.summary.toLowerCase().includes(query)) ||
        (d.authorName && d.authorName.toLowerCase().includes(query))
      );
    }

    if (topic !== 'All') {
      items = items.filter(d =>
        (d.toolName && d.toolName.toLowerCase().includes(topic.toLowerCase())) ||
        (d.title && d.title.toLowerCase().includes(topic.toLowerCase()))
      );
    }

    return items;
  });

  ngOnInit(): void {
    this.querySub = this.route.queryParamMap.subscribe((params) => {
      const q = params.get('q') || '';
      this.searchQuery = q;
      this.loadFeed();
    });

    // Client-side + server debounce 200ms
    this.search$.pipe(
      debounceTime(200),
      distinctUntilChanged()
    ).subscribe(q => {
      this.docService.fetchPublicFeed({ q, sort: this.feedTab() === 'latest' ? 'last_modified' : 'published_at' }).subscribe();
    });
  }

  ngOnDestroy(): void {
    this.querySub?.unsubscribe();
  }

  loadFeed(): void {
    const sort = this.feedTab() === 'latest' ? 'last_modified' : 'published_at';
    this.docService.fetchPublicFeed({ q: this.searchQuery, sort }).subscribe();
  }

  setFeedTab(tab: 'for-you' | 'latest'): void {
    this.feedTab.set(tab);
    this.loadFeed();
  }

  selectTopic(topic: string): void {
    this.selectedTopic.set(topic);
  }

  onSearchChange(term: string): void {
    this.search$.next(term);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.loadFeed();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedTopic.set('All');
    this.loadFeed();
  }

  createFirstDocument(): void {
    if (this.isCreating()) return;
    this.isCreating.set(true);
    this.docService.createDocument({ title: 'Untitled Document' }).subscribe({
      next: doc => {
        this.isCreating.set(false);
        this.router.navigate(['/write', doc.id]);
      },
      error: () => {
        this.isCreating.set(false);
      }
    });
  }

  onBookmarkClick(event: MouseEvent, doc: DocDocument): void {
    event.stopPropagation();
    event.preventDefault();
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/sign-in']);
      return;
    }
    this.docService.toggleBookmark(doc.id).subscribe({
      next: isBookmarked => {
        this.bookmarkedIds.update(set => {
          const next = new Set(set);
          if (isBookmarked) {
            next.add(doc.id);
          } else {
            next.delete(doc.id);
          }
          return next;
        });
      }
    });
  }

  getAuthorInitial(name?: string): string {
    return name ? name.charAt(0).toUpperCase() : 'A';
  }

  estimateReadingTime(sectionCount: number): string {
    const mins = Math.max(1, Math.ceil((sectionCount || 1) * 1.5));
    return `${mins} min read`;
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }
}

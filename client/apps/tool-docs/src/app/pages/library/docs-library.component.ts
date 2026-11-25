// client/apps/tool-docs/src/app/pages/library/docs-library.component.ts

import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DocService } from '../../services/doc.service';
import { BookmarkItem, ReadingHistoryItem, AuthorProfile } from '../../models/doc.model';

type LibraryTab = 'bookmarks' | 'history' | 'following';

@Component({
  selector: 'app-docs-library',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="docs-app docs-page docs-page--library">
      <div class="docs-library">
        <!-- Header -->
        <div class="docs-library__header">
          <h1 class="docs-library__title">
            Your Library
          </h1>
          <p class="docs-library__subtitle">
            Manage your saved bookmarks, reading history, and followed authors.
          </p>
        </div>

        <!-- Underline Tabs Nav (Bug 17) -->
        <div class="docs-library__tabs-row">
          <div class="docs-tabs__list" role="tablist" aria-label="Library Navigation Tabs">
            <button
              type="button"
              role="tab"
              class="docs-tabs__tab"
              [class.docs-tabs__tab--active]="activeTab() === 'bookmarks'"
              (click)="setTab('bookmarks')"
              [attr.aria-selected]="activeTab() === 'bookmarks'"
            >
              Bookmarks
            </button>
            <button
              type="button"
              role="tab"
              class="docs-tabs__tab"
              [class.docs-tabs__tab--active]="activeTab() === 'history'"
              (click)="setTab('history')"
              [attr.aria-selected]="activeTab() === 'history'"
            >
              Reading history
            </button>
            <button
              type="button"
              role="tab"
              class="docs-tabs__tab"
              [class.docs-tabs__tab--active]="activeTab() === 'following'"
              (click)="setTab('following')"
              [attr.aria-selected]="activeTab() === 'following'"
            >
              Following
            </button>
          </div>

          <!-- Clear History Action (Bug 19) -->
          @if (activeTab() === 'history' && historyItems().length > 0) {
            <button
              type="button"
              class="docs-button docs-button--secondary docs-button--xs docs-button--danger"
              (click)="confirmClearHistory()"
            >
              Clear history
            </button>
          }
        </div>

        <!-- Loading State -->
        @if (loading()) {
          <div class="docs-library__list">
            @for (i of [1, 2, 3]; track i) {
              <div class="docs-skeleton docs-skeleton--card">
                <div class="docs-skeleton__line docs-skeleton__line--lg"></div>
                <div class="docs-skeleton__line"></div>
              </div>
            }
          </div>
        } @else {
          <!-- TAB 1: BOOKMARKS (Bugs 17, 18) -->
          @if (activeTab() === 'bookmarks') {
            @if (bookmarkItems().length === 0) {
              <div class="docs-empty-state">
                <div class="docs-empty-state__icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                  </svg>
                </div>
                <h2 class="docs-empty-state__title">No bookmarks yet</h2>
                <p class="docs-empty-state__desc">
                  Stories you bookmark will appear here. Click the bookmark icon on any story to save it.
                </p>
                <div class="docs-empty-state__actions">
                  <a routerLink="/" class="docs-button docs-button--primary docs-button--sm">
                    Explore stories
                  </a>
                </div>
              </div>
            } @else {
              <div class="docs-library__list">
                @for (b of bookmarkItems(); track b.id) {
                  <article class="docs-library-item">
                    <div class="docs-library-item__info">
                      <div class="docs-library-item__meta">
                        <span>{{ b.authorName || 'user' }}</span>
                        <span>·</span>
                        <time>{{ formatDate(b.bookmarkedAt) }}</time>
                      </div>
                      <h3 class="docs-library-item__title">
                        <a [routerLink]="['/p', b.slug]">{{ b.title }}</a>
                      </h3>
                      @if (b.summary) {
                        <p class="docs-feed-card__excerpt">{{ b.summary }}</p>
                      }
                    </div>
                    <div class="docs-story-card__actions">
                      <a [routerLink]="['/p', b.slug]" class="docs-button docs-button--secondary docs-button--xs">
                        Read
                      </a>
                      <button
                        type="button"
                        class="docs-icon-button docs-icon-button--xs docs-icon-button--danger"
                        (click)="removeBookmark(b.documentId)"
                        title="Remove bookmark"
                        aria-label="Remove bookmark"
                      >
                        ✕
                      </button>
                    </div>
                  </article>
                }
              </div>
            }
          }

          <!-- TAB 2: READING HISTORY (Bugs 17, 19) -->
          @if (activeTab() === 'history') {
            @if (historyItems().length === 0) {
              <div class="docs-empty-state">
                <div class="docs-empty-state__icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <h2 class="docs-empty-state__title">No reading history</h2>
                <p class="docs-empty-state__desc">
                  Stories and technical guides you read while signed in will automatically appear here.
                </p>
                <div class="docs-empty-state__actions">
                  <a routerLink="/" class="docs-button docs-button--primary docs-button--sm">
                    Discover stories
                  </a>
                </div>
              </div>
            } @else {
              <div class="docs-library__list">
                @for (h of historyItems(); track h.id) {
                  <article class="docs-library-item">
                    <div class="docs-library-item__info">
                      <div class="docs-library-item__meta">
                        <span>{{ h.authorName || 'user' }}</span>
                        <span>·</span>
                        <time>Read {{ formatDate(h.lastReadAt) }}</time>
                      </div>
                      <h3 class="docs-library-item__title">
                        <a [routerLink]="['/p', h.slug]">{{ h.title }}</a>
                      </h3>
                      @if (h.summary) {
                        <p class="docs-feed-card__excerpt">{{ h.summary }}</p>
                      }
                    </div>
                    <a [routerLink]="['/p', h.slug]" class="docs-button docs-button--secondary docs-button--xs">
                      Read Again
                    </a>
                  </article>
                }
              </div>
            }
          }

          <!-- TAB 3: FOLLOWING (Bug 54) -->
          @if (activeTab() === 'following') {
            @if (followingAuthors().length === 0) {
              <div class="docs-empty-state">
                <div class="docs-empty-state__icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <h2 class="docs-empty-state__title">You are not following any authors yet</h2>
                <p class="docs-empty-state__desc">
                  Explore stories to find writers you like and follow their work.
                </p>
                <div class="docs-empty-state__actions">
                  <a routerLink="/" class="docs-button docs-button--primary docs-button--sm">
                    Explore
                  </a>
                </div>
              </div>
            } @else {
              <div class="docs-library__following-grid">
                @for (author of followingAuthors(); track author.id) {
                  <article class="docs-library-item">
                    <div class="docs-feed-card__author">
                      <div class="docs-avatar docs-avatar--md">
                        {{ author.displayName.substring(0, 1).toUpperCase() }}
                      </div>
                      <div class="docs-library-item__info">
                        <h4 class="docs-library-item__title">
                          <a [routerLink]="['/profile', author.id]">
                            {{ author.displayName }}
                          </a>
                        </h4>
                        <span class="docs-library-item__meta">
                          {{ author.followerCount }} {{ author.followerCount === 1 ? 'follower' : 'followers' }}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      class="docs-button docs-button--secondary docs-button--xs"
                      (click)="unfollow(author.id)"
                    >
                      Following
                    </button>
                  </article>
                }
              </div>
            }
          }
        }
      </div>

      <!-- Confirmation Modal: Clear History (Bug 19) -->
      @if (showClearModal()) {
        <div class="docs-modal">
          <div class="docs-modal__backdrop" (click)="showClearModal.set(false)"></div>
          <div class="docs-modal__box">
            <header class="docs-modal__header">
              <h3 class="docs-modal__title">Clear Reading History?</h3>
              <button type="button" class="docs-icon-button docs-icon-button--xs" (click)="showClearModal.set(false)">✕</button>
            </header>
            <div class="docs-modal__body">
              <p>
                This will remove all items from your reading history. This action cannot be undone.
              </p>
            </div>
            <footer class="docs-modal__actions">
              <button type="button" class="docs-button docs-button--secondary docs-button--sm" (click)="showClearModal.set(false)">Cancel</button>
              <button type="button" class="docs-button docs-button--primary docs-button--sm docs-button--danger" (click)="doClearHistory()">Clear History</button>
            </footer>
          </div>
        </div>
      }
    </div>
  `
})
export class DocsLibraryComponent implements OnInit {
  private readonly docService = inject(DocService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly activeTab = signal<LibraryTab>('bookmarks');
  readonly loading = signal<boolean>(true);
  readonly showClearModal = signal<boolean>(false);

  readonly bookmarkItems = signal<BookmarkItem[]>([]);
  readonly historyItems = signal<ReadingHistoryItem[]>([]);
  readonly followingAuthors = signal<AuthorProfile[]>([]);

  ngOnInit(): void {
    this.route.url.subscribe(segments => {
      const path = segments[segments.length - 1]?.path;
      if (path === 'history') {
        this.activeTab.set('history');
        this.loadHistory();
      } else if (path === 'following') {
        this.activeTab.set('following');
        this.loadFollowing();
      } else {
        this.activeTab.set('bookmarks');
        this.loadBookmarks();
      }
    });
  }

  setTab(tab: LibraryTab): void {
    this.activeTab.set(tab);
    if (tab === 'bookmarks') {
      this.router.navigate(['/library/bookmarks']);
    } else if (tab === 'history') {
      this.router.navigate(['/library/history']);
    } else {
      this.router.navigate(['/following']);
    }
  }

  loadBookmarks(): void {
    this.loading.set(true);
    this.docService.listBookmarks(0, 30).subscribe({
      next: (page) => {
        this.bookmarkItems.set(page.content || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  removeBookmark(docId: string): void {
    this.docService.toggleBookmark(docId).subscribe({
      next: () => {
        this.bookmarkItems.update(list => list.filter(b => b.documentId !== docId));
      }
    });
  }

  loadHistory(): void {
    this.loading.set(true);
    this.docService.listReadingHistory(0, 30).subscribe({
      next: (page) => {
        this.historyItems.set(page.content || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  confirmClearHistory(): void {
    this.showClearModal.set(true);
  }

  doClearHistory(): void {
    this.showClearModal.set(false);
    this.docService.clearReadingHistory().subscribe({
      next: () => this.historyItems.set([])
    });
  }

  loadFollowing(): void {
    this.loading.set(true);
    this.docService.listFollowing().subscribe({
      next: (authors) => {
        this.followingAuthors.set(authors);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  unfollow(authorId: string): void {
    this.docService.unfollowAuthor(authorId).subscribe({
      next: () => {
        this.followingAuthors.update(list => list.filter(a => a.id !== authorId));
      }
    });
  }

  formatDate(isoString: string): string {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  }
}
